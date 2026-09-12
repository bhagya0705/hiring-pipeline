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

        // Check that the application exists
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

        // Interviewers can only view timelines
        // for applications they are assigned to.
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
                application_events.id,
                application_events.event_type,
                application_events.from_stage,
                application_events.to_stage,
                application_events.metadata,
                application_events.created_at,

                users.id AS actor_id,
                users.name AS actor_name,
                users.email AS actor_email,
                users.role AS actor_role

            FROM application_events

            JOIN users
                ON users.id = application_events.actor_id

            WHERE application_events.application_id = $1

            ORDER BY application_events.created_at ASC
            `,
            [applicationId]
        );

        return NextResponse.json({
            timeline: result.rows,
        });
    } catch (error) {
        console.error(
            "Get application timeline failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}