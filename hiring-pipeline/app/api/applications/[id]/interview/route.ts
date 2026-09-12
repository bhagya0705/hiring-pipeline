import { NextResponse } from "next/server";
import { requireRole, getCurrentUser } from "@/lib/auth";
import { pool } from "@/db/db";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

    const client = await pool.connect();

    try {
        const { id: applicationId } = await params;

        const body = await request.json();

        const { scheduledAt, durationMinutes } = body;

        if (!scheduledAt) {
            return NextResponse.json(
                { error: "scheduledAt is required" },
                { status: 400 }
            );
        }

        const scheduledDate = new Date(scheduledAt);

        if (Number.isNaN(scheduledDate.getTime())) {
            return NextResponse.json(
                { error: "scheduledAt must be a valid date and time" },
                { status: 400 }
            );
        }

        if (scheduledDate <= new Date()) {
            return NextResponse.json(
                {
                    error:
                        "Interview must be scheduled for a future date and time",
                },
                { status: 400 }
            );
        }

        if (
            !Number.isInteger(durationMinutes) ||
            durationMinutes <= 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "durationMinutes must be a positive integer",
                },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        const applicationResult = await client.query(
            `
            SELECT
                id,
                current_stage
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

        const existingInterviewResult = await client.query(
            `
            SELECT id
            FROM interviews
            WHERE application_id = $1
            `,
            [applicationId]
        );

        if (existingInterviewResult.rows.length > 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "An interview is already scheduled for this application. Edit the existing interview instead.",
                },
                { status: 409 }
            );
        }

        const application = applicationResult.rows[0];

        const interviewResult = await client.query(
            `
            INSERT INTO interviews
                (
                    application_id,
                    scheduled_at,
                    duration_minutes,
                    created_by
                )
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                id,
                application_id,
                scheduled_at,
                duration_minutes,
                created_by,
                created_at
            `,
            [
                applicationId,
                scheduledDate,
                durationMinutes,
                user!.id,
            ]
        );

        const interview = interviewResult.rows[0];

        await client.query(
            `
            INSERT INTO application_events
                (
                    application_id,
                    actor_id,
                    event_type,
                    metadata
                )
            VALUES
                (
                    $1,
                    $2,
                    'INTERVIEW_SCHEDULED',
                    $3
                )
            `,
            [
                applicationId,
                user!.id,
                JSON.stringify({
                    interviewId: interview.id,
                    scheduledAt: interview.scheduled_at,
                    durationMinutes:
                        interview.duration_minutes,
                }),
            ]
        );

        await client.query("COMMIT");

        return NextResponse.json(
            {
                message:
                    "Interview scheduled successfully",
                interview,
            },
            { status: 201 }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Schedule interview failed:",
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

        const applicationResult = await pool.query(
            `
            SELECT id
            FROM applications
            WHERE id = $1
            `,
            [applicationId]
        );

        if (applicationResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

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

        const result = await pool.query(
            `
            SELECT
                interviews.id,
                interviews.application_id,
                interviews.scheduled_at,
                interviews.duration_minutes,
                interviews.created_by,
                interviews.created_at,

                users.name AS created_by_name,
                users.email AS created_by_email

            FROM interviews

            JOIN users
                ON users.id = interviews.created_by

            WHERE interviews.application_id = $1

            ORDER BY interviews.scheduled_at ASC
            `,
            [applicationId]
        );

        return NextResponse.json({
            interviews: result.rows,
        });
    } catch (error) {
        console.error(
            "Get interviews failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}