import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
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

    const { id } = await params;

    try {
        const applicationResult = await pool.query(
            `
            SELECT
                id,
                current_stage,
                stage_entered_at
            FROM applications
            WHERE id = $1
            `,
            [id]
        );

        if (applicationResult.rows.length === 0) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        const application = applicationResult.rows[0];

        if (
            application.current_stage === "HIRED" ||
            application.current_stage === "REJECTED"
        ) {
            return NextResponse.json(
                {
                    error: "This application cannot have a stalled alert",
                },
                { status: 400 }
            );
        }

        const stalledResult = await pool.query(
            `
            SELECT
                NOW() - $1::timestamptz > INTERVAL '10 days' AS is_stalled
            `,
            [application.stage_entered_at]
        );

        if (!stalledResult.rows[0].is_stalled) {
            return NextResponse.json(
                {
                    error: "This application is not currently stalled",
                },
                { status: 400 }
            );
        }

        const dismissalResult = await pool.query(
            `
            INSERT INTO stalled_alert_dismissals
                (
                    application_id,
                    stage,
                    stage_entered_at,
                    dismissed_by
                )
            SELECT
                id,
                current_stage,
                stage_entered_at,
                $2
            FROM applications
            WHERE id = $1
            ON CONFLICT (
                application_id,
                stage,
                stage_entered_at
            )
            DO NOTHING
            RETURNING id, dismissed_at
            `,
            [
                id,
                user!.id
            ]
        );

        return NextResponse.json({
            message: "Stalled alert dismissed",
            dismissal: dismissalResult.rows[0],
        });
    } catch (error) {
        console.error("Failed to dismiss stalled alert:", error);

        return NextResponse.json(
            { error: "Something went wrong while dismissing stalled alert" },
            { status: 500 }
        );
    }
}