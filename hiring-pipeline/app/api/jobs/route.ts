import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

export async function POST(request: Request) {
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

        const { title, department, description } = body;

        if (!title || !department || !description) {
            return NextResponse.json(
                {
                    error:
                        "Title, department and description are required",
                },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `
            INSERT INTO job_openings
                (title, department, description)
            VALUES
                ($1, $2, $3)
            RETURNING
                id,
                title,
                department,
                description,
                status,
                created_at,
                updated_at
            `,
            [title, department, description]
        );

        return NextResponse.json(
            {
                message: "Job opening created successfully",
                job: result.rows[0],
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create job failed:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}