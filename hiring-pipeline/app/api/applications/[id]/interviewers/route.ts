import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Only recruiters can assign interviewers
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
        const { interviewerIds } = body;

        // Validate input
        if (
            !Array.isArray(interviewerIds) ||
            interviewerIds.length === 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "interviewerIds must be a non-empty array",
                },
                { status: 400 }
            );
        }

        // Remove duplicate IDs from the request
        const uniqueInterviewerIds = [
            ...new Set(interviewerIds),
        ];

        await client.query("BEGIN");

        // 1. Check that the application exists
        const applicationResult = await client.query(
            `
            SELECT id
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

        // 2. Check that all users exist
        const interviewerResult = await client.query(
            `
            SELECT id, name, email, role
            FROM users
            WHERE id = ANY($1::uuid[])
            `,
            [uniqueInterviewerIds]
        );

        // Check if some IDs don't exist
        if (
            interviewerResult.rows.length !==
            uniqueInterviewerIds.length
        ) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "One or more interviewer IDs do not exist",
                },
                { status: 404 }
            );
        }

        // 3. Make sure every selected user is an interviewer
        const invalidUsers = interviewerResult.rows.filter(
            (interviewer) => interviewer.role !== "INTERVIEWER"
        );

        if (invalidUsers.length > 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "Only users with the INTERVIEWER role can be assigned",
                },
                { status: 400 }
            );
        }

        // 4. Assign each interviewer
        const assignments = [];

        for (const interviewer of interviewerResult.rows) {
            const assignmentResult = await client.query(
                `
                INSERT INTO application_interviewers
                    (application_id, interviewer_id)
                VALUES
                    ($1, $2)
                RETURNING
                    application_id,
                    interviewer_id,
                    assigned_at
                `,
                [applicationId, interviewer.id]
            );

            assignments.push({
                ...assignmentResult.rows[0],
                interviewer_name: interviewer.name,
                interviewer_email: interviewer.email,
            });

            // 5. Add timeline event
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
                        'INTERVIEWER_ASSIGNED',
                        $3
                    )
                `,
                [
                    applicationId,
                    user!.id,
                    JSON.stringify({
                        interviewerId: interviewer.id,
                        interviewerName: interviewer.name,
                    }),
                ]
            );
        }

        await client.query("COMMIT");

        return NextResponse.json(
            {
                message:
                    "Interviewers assigned successfully",
                assignments,
            },
            { status: 201 }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        // Duplicate assignment
        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
        ) {
            return NextResponse.json(
                {
                    error:
                        "One or more interviewers are already assigned to this application",
                },
                { status: 409 }
            );
        }

        console.error(
            "Assign interviewers failed:",
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