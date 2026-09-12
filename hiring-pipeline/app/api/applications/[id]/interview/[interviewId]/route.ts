import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

export async function PATCH(
    request: Request,
    {
        params,
    }: {
        params: Promise<{
            id: string;
            interviewId: string;
        }>;
    }
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
        const {
            id: applicationId,
            interviewId,
        } = await params;

        const body = await request.json();

        const {
            scheduledAt,
            durationMinutes,
        } = body;

        if (
            scheduledAt === undefined &&
            durationMinutes === undefined
        ) {
            return NextResponse.json(
                {
                    error:
                        "At least one field must be provided",
                },
                { status: 400 }
            );
        }

        let scheduledDate: Date | undefined;

        if (scheduledAt !== undefined) {
            if (
                typeof scheduledAt !== "string" ||
                scheduledAt.trim() === ""
            ) {
                return NextResponse.json(
                    {
                        error:
                            "scheduledAt must be a valid date and time",
                    },
                    { status: 400 }
                );
            }

            scheduledDate = new Date(scheduledAt);

            if (Number.isNaN(scheduledDate.getTime())) {
                return NextResponse.json(
                    {
                        error:
                            "scheduledAt must be a valid date and time",
                    },
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
        }

        if (
            durationMinutes !== undefined &&
            (
                !Number.isInteger(durationMinutes) ||
                durationMinutes <= 0
            )
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

        const interviewResult = await client.query(
            `
            SELECT
                id,
                application_id,
                scheduled_at,
                duration_minutes
            FROM interviews
            WHERE id = $1
              AND application_id = $2
            `,
            [
                interviewId,
                applicationId,
            ]
        );

        if (interviewResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "Interview not found for this application",
                },
                { status: 404 }
            );
        }

        const existingInterview =
            interviewResult.rows[0];

        const newScheduledAt =
            scheduledDate ??
            existingInterview.scheduled_at;

        const newDuration =
            durationMinutes ??
            existingInterview.duration_minutes;

        await client.query(
            `
            UPDATE interviews
            SET
                scheduled_at = $1,
                duration_minutes = $2
            WHERE id = $3
              AND application_id = $4
            `,
            [
                newScheduledAt,
                newDuration,
                interviewId,
                applicationId,
            ]
        );

        const updatedInterviewResult =
            await client.query(
                `
                SELECT
                    id,
                    application_id,
                    scheduled_at,
                    duration_minutes,
                    created_by,
                    created_at
                FROM interviews
                WHERE id = $1
                `,
                [interviewId]
            );

        const updatedInterview =
            updatedInterviewResult.rows[0];

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
                    'INTERVIEW_RESCHEDULED',
                    $3
                )
            `,
            [
                applicationId,
                user!.id,
                JSON.stringify({
                    action: "RESCHEDULED",
                    interviewId,
                    previousScheduledAt:
                        existingInterview.scheduled_at,
                    newScheduledAt:
                        updatedInterview.scheduled_at,
                    previousDuration:
                        existingInterview.duration_minutes,
                    newDuration:
                        updatedInterview.duration_minutes,
                }),
            ]
        );

        await client.query("COMMIT");

        return NextResponse.json({
            message:
                "Interview updated successfully",
            interview: updatedInterview,
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Update interview failed:",
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