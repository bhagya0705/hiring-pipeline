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
        // 1. Open positions
        const openPositionsResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM job_openings
            WHERE status = 'OPEN'
        `);

        // 2. Active applications
        const activeApplicationsResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM applications
            WHERE current_stage != 'REJECTED'
        `);

        // 3. Interviews scheduled this week
        const interviewsThisWeekResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM interviews
            WHERE scheduled_at >= date_trunc('week', NOW())
              AND scheduled_at < date_trunc('week', NOW()) + INTERVAL '1 week'
        `);

        // 4. Hires this month
        const hiresThisMonthResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM application_events
            WHERE event_type = 'STAGE_CHANGED'
              AND to_stage = 'HIRED'
              AND created_at >= date_trunc('month', NOW())
              AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month'
        `);

        // 5. Breakdown by job and stage
        const byJobAndStageResult = await pool.query(`
            SELECT
                job_openings.id AS job_id,
                job_openings.title AS job_title,
                applications.current_stage AS stage,
                COUNT(*)::int AS count
            FROM applications
            JOIN job_openings
                ON job_openings.id = applications.job_opening_id
            GROUP BY
                job_openings.id,
                job_openings.title,
                applications.current_stage
            ORDER BY
                job_openings.title,
                applications.current_stage
        `);

        // 6. Weekly applications over the last quarter
        const weeklyApplicationsResult = await pool.query(`
            WITH weeks AS (
                SELECT generate_series(
                    date_trunc('week', NOW()) - INTERVAL '11 weeks',
                    date_trunc('week', NOW()),
                    INTERVAL '1 week'
                ) AS week
            )
            SELECT
                weeks.week,
                COUNT(applications.id)::int AS count
            FROM weeks
            LEFT JOIN applications
                ON applications.created_at >= weeks.week
                AND applications.created_at < weeks.week + INTERVAL '1 week'
            GROUP BY weeks.week
            ORDER BY weeks.week
        `);

        return NextResponse.json({
            summary: {
                openPositions: openPositionsResult.rows[0].count,
                activeApplications: activeApplicationsResult.rows[0].count,
                interviewsThisWeek: interviewsThisWeekResult.rows[0].count,
                hiresThisMonth: hiresThisMonthResult.rows[0].count,
            },

            byJobAndStage: byJobAndStageResult.rows,

            weeklyApplications: weeklyApplicationsResult.rows,
        });
    } catch (error) {
        console.error("Dashboard fetch failed:", error);

        return NextResponse.json(
            { error: "Something went wrong while loading dashboard data" },
            { status: 500 }
        );
    }
}