import { NextResponse } from "next/server";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { pool } from "@/db/db";

export async function POST(request: Request) {
    const client = await pool.connect();

    try {
        const { user, error } = await requireRole(["RECRUITER"]);

        if (error === "Unauthorized") {
            return NextResponse.json(
                { error },
                { status: 401 }
            );
        }

        if (error === "Forbidden") {
            return NextResponse.json(
                { error },
                { status: 403 }
            );
        }

        const body = await request.json();

        const {
            candidateName,
            candidateEmail,
            jobOpeningId,
            source,
            notes,
        } = body;

        if (
            !candidateName ||
            !candidateEmail ||
            !jobOpeningId ||
            !source
        ) {
            return NextResponse.json(
                {
                    error:
                        "Candidate name, email, job opening, and source are required",
                },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        // 1. Check that the job exists and is open
        const jobResult = await client.query(
            `
            SELECT id
            FROM job_openings
            WHERE id = $1
              AND status = 'OPEN'
            `,
            [jobOpeningId]
        );

        if (jobResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "Job opening not found or is archived",
                },
                { status: 404 }
            );
        }

        // 2. Find candidate by email
        const candidateResult = await client.query(
            `
            SELECT id
            FROM candidates
            WHERE email = $1
            LIMIT 1
            `,
            [candidateEmail]
        );

        let candidateId: string;

        if (candidateResult.rows.length > 0) {
            candidateId = candidateResult.rows[0].id;
        } else {
            // 3. Create candidate
            const newCandidate = await client.query(
                `
                INSERT INTO candidates (name, email)
                VALUES ($1, $2)
                RETURNING id
                `,
                [candidateName, candidateEmail]
            );

            candidateId = newCandidate.rows[0].id;
        }

        // 4. Check for duplicate application
        const existingApplication = await client.query(
            `
            SELECT id
            FROM applications
            WHERE candidate_id = $1
              AND job_opening_id = $2
            `,
            [candidateId, jobOpeningId]
        );

        if (existingApplication.rows.length > 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "Candidate already has an application for this job",
                },
                { status: 409 }
            );
        }

        // 5. Create application
        const applicationResult = await client.query(
            `
            INSERT INTO applications
                (
                    candidate_id,
                    job_opening_id,
                    source,
                    notes
                )
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                id,
                candidate_id,
                job_opening_id,
                source,
                notes,
                current_stage,
                created_at,
                updated_at
            `,
            [
                candidateId,
                jobOpeningId,
                source,
                notes || null,
            ]
        );

        const application = applicationResult.rows[0];

        // 6. Create timeline event
        await client.query(
            `
            INSERT INTO application_events
                (
                    application_id,
                    actor_id,
                    event_type,
                    to_stage
                )
            VALUES
                ($1, $2, 'APPLICATION_CREATED', 'APPLIED')
            `,
            [application.id, user!.id]
        );

        await client.query("COMMIT");

        return NextResponse.json(
            {
                message: "Application created successfully",
                application,
            },
            { status: 201 }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create application failed:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search")?.trim() || "";
        const jobId = searchParams.get("jobId") || "";
        const stage = searchParams.get("stage") || "";
        const source = searchParams.get("source") || "";
        const sort = searchParams.get("sort") || "appliedDate";
        const order = searchParams.get("order") || "desc";

        const sortColumns: Record<string, string> = {
            appliedDate: "applications.created_at",
            stage: "applications.current_stage",
            lastUpdated: "applications.updated_at",
        };

        // Validate sort
        if (!sortColumns[sort]) {
            return NextResponse.json(
                {
                    error:
                        "Invalid sort. Allowed values are appliedDate, stage, lastUpdated",
                },
                { status: 400 }
            );
        }

        // Validate order
        if (order !== "asc" && order !== "desc") {
            return NextResponse.json(
                {
                    error:
                        "Invalid order. Allowed values are asc or desc",
                },
                { status: 400 }
            );
        }

        const pageParam = searchParams.get("page") || "1";
        const limitParam = searchParams.get("limit") || "10";
        const page = Number(pageParam);
        const limit = Number(limitParam);

        if (!Number.isInteger(page) || page < 1) {
            return NextResponse.json(
                {
                    error:
                        "Page must be a positive integer",
                },
                { status: 400 }
            );
        }

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            return NextResponse.json(
                {
                    error:
                        "Limit must be an integer between 1 and 100",
                },
                { status: 400 }
            );
        }

        const offset = (page - 1) * limit;

        let fromQuery = `
            FROM applications

            JOIN candidates
                ON candidates.id = applications.candidate_id

            JOIN job_openings
                ON job_openings.id = applications.job_opening_id
        `;

        const values: string[] = [];
        const conditions: string[] = [];

        // Interviewers only see assigned applications
        if (user.role === "INTERVIEWER") {
            fromQuery += `
                JOIN application_interviewers
                    ON application_interviewers.application_id =
                       applications.id
            `;

            values.push(user.id);

            conditions.push(
                `application_interviewers.interviewer_id = $${values.length}`
            );
        }

        if (search) {
            values.push(`%${search}%`);

            conditions.push(
                `(candidates.name ILIKE $${values.length}
                  OR candidates.email ILIKE $${values.length})`
            );
        }

        if (jobId) {
            values.push(jobId);

            conditions.push(
                `applications.job_opening_id = $${values.length}`
            );
        }

        if (stage) {
            const allowedStages = [
                "APPLIED",
                "SCREENING",
                "INTERVIEW",
                "OFFER",
                "HIRED",
                "REJECTED",
            ];

            if (!allowedStages.includes(stage)) {
                return NextResponse.json(
                    {
                        error:
                            "Invalid stage. Allowed stages are APPLIED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED",
                    },
                    { status: 400 }
                );
            }

            values.push(stage);

            conditions.push(
                `applications.current_stage = $${values.length}`
            );
        }

        if (source) {
            values.push(source);

            conditions.push(
                `applications.source = $${values.length}`
            );
        }


        let whereQuery = "";

        if (conditions.length > 0) {
            whereQuery = `
                WHERE ${conditions.join(" AND ")}
            `;
        }

        const countQuery = `
            SELECT COUNT(*) AS total
            ${fromQuery}
            ${whereQuery}
        `;

        const countResult = await pool.query(
            countQuery,
            values
        );

        const total = Number(
            countResult.rows[0].total
        );

        const applicationsQuery = `
            SELECT
                applications.id,
                applications.source,
                applications.notes,
                applications.current_stage,
                applications.rejected_from_stage,
                applications.stage_entered_at,
                applications.created_at,
                applications.updated_at,

                candidates.id AS candidate_id,
                candidates.name AS candidate_name,
                candidates.email AS candidate_email,

                job_openings.id AS job_id,
                job_openings.title AS job_title,
                job_openings.department AS job_department

            ${fromQuery}

            ${whereQuery}

            ORDER BY
                ${sortColumns[sort]}
                ${order.toUpperCase()}

            LIMIT $${values.length + 1}
            OFFSET $${values.length + 2}
        `;

        const applicationValues = [
            ...values,
            limit,
            offset,
        ];

        const result = await pool.query(
            applicationsQuery,
            applicationValues
        );

        const totalPages =
            total === 0
                ? 0
                : Math.ceil(total / limit);

        return NextResponse.json({
            applications: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error(
            "Get applications failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}