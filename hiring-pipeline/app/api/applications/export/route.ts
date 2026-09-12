import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

function escapeCsv(value: unknown) {
    const stringValue = String(value ?? "");

    return `"${stringValue.replace(/"/g, '""')}"`;
}

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
                candidates.name AS candidate_name,
                candidates.email AS candidate_email,
                job_openings.title AS job_title,
                job_openings.department,
                applications.source,
                applications.current_stage,
                applications.created_at,
                applications.updated_at
            FROM applications
            JOIN candidates
                ON candidates.id = applications.candidate_id
            JOIN job_openings
                ON job_openings.id = applications.job_opening_id
            WHERE job_openings.status = 'OPEN'
            ORDER BY applications.created_at DESC
        `);

        const headers = [
            "Candidate Name",
            "Candidate Email",
            "Job Title",
            "Department",
            "Source",
            "Current Stage",
            "Applied Date",
            "Last Updated",
        ];

        const csvRows = result.rows.map((row) => {
            return [
                escapeCsv(row.candidate_name),
                escapeCsv(row.candidate_email),
                escapeCsv(row.job_title),
                escapeCsv(row.department),
                escapeCsv(row.source),
                escapeCsv(row.current_stage),
                escapeCsv(row.created_at),
                escapeCsv(row.updated_at),
            ].join(",");
        });

        const csv = [
            headers.join(","),
            ...csvRows,
        ].join("\n");

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition":
                    'attachment; filename="applications.csv"',
            },
        });
    } catch (error) {
        console.error("Application CSV export failed:", error);

        return NextResponse.json(
            { error: "Something went wrong while exporting applications" },
            { status: 500 }
        );
    }
}