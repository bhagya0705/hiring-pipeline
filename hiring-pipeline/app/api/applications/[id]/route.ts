import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/db/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id: applicationId } = await params;

        const result = await pool.query(
            `
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
                job_openings.department AS job_department,
                job_openings.description AS job_description,
                job_openings.status AS job_status

            FROM applications

            JOIN candidates
                ON candidates.id = applications.candidate_id

            JOIN job_openings
                ON job_openings.id = applications.job_opening_id

            WHERE applications.id = $1
            `,
            [applicationId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        // Interviewers can only view applications
        // they are assigned to.
        if (user.role === "INTERVIEWER") {
            const assignmentResult = await pool.query(
                `
                SELECT 1
                FROM application_interviewers
                WHERE application_id = $1
                  AND interviewer_id = $2
                `,
                [applicationId, user.id]
            );

            if (assignmentResult.rows.length === 0) {
                return NextResponse.json(
                    { error: "Forbidden" },
                    { status: 403 }
                );
            }
        }

        return NextResponse.json({
            application: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Get application failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (user.role !== "RECRUITER") {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
        );
    }

    const client = await pool.connect();

    try {
        const { id: applicationId } = await params;

        const body = await request.json();

        const {
            candidateName,
            candidateEmail,
            source,
            notes,
        } = body;

        if (
            typeof candidateName !== "string" ||
            candidateName.trim() === ""
        ) {
            return NextResponse.json(
                { error: "Candidate name is required" },
                { status: 400 }
            );
        }

        if (
            typeof candidateEmail !== "string" ||
            candidateEmail.trim() === ""
        ) {
            return NextResponse.json(
                { error: "Candidate email is required" },
                { status: 400 }
            );
        }

        if (
            source !== undefined &&
            source !== null &&
            typeof source !== "string"
        ) {
            return NextResponse.json(
                { error: "Source must be a string" },
                { status: 400 }
            );
        }

        if (
            notes !== undefined &&
            notes !== null &&
            typeof notes !== "string"
        ) {
            return NextResponse.json(
                { error: "Notes must be a string" },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        const applicationResult = await client.query(
            `
            SELECT
                candidate_id
            FROM applications
            WHERE id = $1
            `,
            [applicationId]
        );

        if (applicationResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const candidateId =
            applicationResult.rows[0].candidate_id;

        await client.query(
            `
            UPDATE candidates
            SET
                name = $1,
                email = $2,
                updated_at = NOW()
            WHERE id = $3
            `,
            [
                candidateName.trim(),
                candidateEmail.trim(),
                candidateId,
            ]
        );

        const applicationUpdateResult =
            await client.query(
                `
                UPDATE applications
                SET
                    source = $1,
                    notes = $2,
                    updated_at = NOW()
                WHERE id = $3
                RETURNING
                    id,
                    candidate_id,
                    job_opening_id,
                    source,
                    notes,
                    current_stage,
                    rejected_from_stage,
                    stage_entered_at,
                    created_at,
                    updated_at
                `,
                [
                    source?.trim() || null,
                    notes?.trim() || null,
                    applicationId,
                ]
            );

        const application =
            applicationUpdateResult.rows[0];

        const candidateResult = await client.query(
            `
            SELECT
                id,
                name,
                email
            FROM candidates
            WHERE id = $1
            `,
            [candidateId]
        );

        const jobResult = await client.query(
            `
            SELECT
                id,
                title,
                department,
                status
            FROM job_openings
            WHERE id = $1
            `,
            [application.job_opening_id]
        );

        await client.query("COMMIT");

        return NextResponse.json({
            message: "Application updated successfully",
            application: {
                ...application,
                candidate_id: candidateResult.rows[0].id,
                candidate_name: candidateResult.rows[0].name,
                candidate_email: candidateResult.rows[0].email,
                job_id: jobResult.rows[0].id,
                job_title: jobResult.rows[0].title,
                job_department: jobResult.rows[0].department,
                job_status: jobResult.rows[0].status,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Update application failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}