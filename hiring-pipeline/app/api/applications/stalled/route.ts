import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

export async function GET() {
    const { error } = await requireRole(["RECRUITER"]);

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

    try {
        const result = await pool.query(`
            SELECT
                applications.id AS application_id,
                candidates.name AS candidate_name,
                candidates.email AS candidate_email,
                job_openings.id AS job_id,
                job_openings.title AS job_title,
                applications.current_stage AS stage,
                applications.stage_entered_at,
                EXTRACT(
                    DAY FROM (NOW() - applications.stage_entered_at)
                )::int AS days_in_stage
            FROM applications
            JOIN candidates
                ON candidates.id = applications.candidate_id
            JOIN job_openings
                ON job_openings.id = applications.job_opening_id
            WHERE applications.current_stage NOT IN ('HIRED', 'REJECTED')
              AND applications.stage_entered_at < NOW() - INTERVAL '10 days'
              AND NOT EXISTS (
                  SELECT 1
                  FROM stalled_alert_dismissals
                  WHERE stalled_alert_dismissals.application_id = applications.id
                    AND stalled_alert_dismissals.stage = applications.current_stage
                    AND stalled_alert_dismissals.stage_entered_at = applications.stage_entered_at
              )
            ORDER BY applications.stage_entered_at ASC
        `);

        return NextResponse.json({
            alerts: result.rows,
            total: result.rows.length,
        });
    } catch (error) {
        console.error("Failed to fetch stalled alerts:", error);

        return NextResponse.json(
            { error: "Something went wrong while loading stalled alerts" },
            { status: 500 }
        );
    }
}