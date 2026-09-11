import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        const body = await request.json();

        const {title,department,description,status} = body;

        // At least one field must be provided
        if (
            title === undefined &&
            department === undefined &&
            description === undefined &&
            status === undefined
        ) {
            return NextResponse.json(
                {
                    error:
                        "At least one field must be provided",
                },
                { status: 400 }
            );
        }
        if (
            title !== undefined &&
            (typeof title !== "string" ||
                title.trim() === "")
        ) {
            return NextResponse.json(
                {
                    error:
                        "Title must be a non-empty string",
                },
                { status: 400 }
            );
        }

        if (
            department !== undefined &&
            (typeof department !== "string" ||
                department.trim() === "")
        ) {
            return NextResponse.json(
                {
                    error:
                        "Department must be a non-empty string",
                },
                { status: 400 }
            );
        }

        if (
            description !== undefined &&
            typeof description !== "string"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Description must be a string",
                },
                { status: 400 }
            );
        }

        if (
            status !== undefined &&
            status !== "OPEN" &&
            status !== "ARCHIVED"
        ) {
            return NextResponse.json(
                {
                    error:
                        "Status must be either OPEN or ARCHIVED",
                },
                { status: 400 }
            );
        }

        // Build dynamic UPDATE
        const updates: string[] = [];
        const values: (string | null)[] = [];

        if (title !== undefined) {
            values.push(title.trim());
            updates.push(
                `title = $${values.length}`
            );
        }

        if (department !== undefined) {
            values.push(department.trim());
            updates.push(
                `department = $${values.length}`
            );
        }

        if (description !== undefined) {
            values.push(description);
            updates.push(
                `description = $${values.length}`
            );
        }

        if (status !== undefined) {
            values.push(status);
            updates.push(
                `status = $${values.length}`
            );
        }

        // updated_at should change whenever anything is edited
        updates.push("updated_at = NOW()");

        values.push(id);

        const result = await pool.query(
            `
            UPDATE job_openings
            SET
                ${updates.join(", ")}
            WHERE id = $${values.length}
            RETURNING
                id,
                title,
                department,
                description,
                status,
                created_at,
                updated_at
            `,
            values
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "Job opening not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message:
                "Job opening updated successfully",
            job: result.rows[0],
        });
    } catch (error) {
        console.error(
            "Update job failed:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Something went wrong",
            },
            { status: 500 }
        );
    }
}