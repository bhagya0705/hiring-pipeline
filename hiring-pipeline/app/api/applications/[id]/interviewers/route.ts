import { NextResponse } from "next/server";
import { requireRole, getCurrentUser } from "@/lib/auth";
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

        // Interviewers can only view their own assignment
        // through this endpoint.
        if (user.role === "INTERVIEWER") {
            const assignmentResult = await pool.query(
                `
                SELECT
                    users.id,
                    users.name,
                    users.email
                FROM application_interviewers
                JOIN users
                    ON users.id = application_interviewers.interviewer_id
                WHERE application_interviewers.application_id = $1
                  AND users.id = $2
                `,
                [applicationId, user.id]
            );

            return NextResponse.json({
                interviewers: assignmentResult.rows,
            });
        }

        // Recruiters can see all assigned interviewers
        // Recruiters can see assigned interviewers
        const result = await pool.query(
            `
    SELECT
        users.id,
        users.name,
        users.email,
        users.role,
        application_interviewers.assigned_at
    FROM application_interviewers
    JOIN users
        ON users.id = application_interviewers.interviewer_id
    WHERE application_interviewers.application_id = $1
    ORDER BY application_interviewers.assigned_at ASC
    `,
            [applicationId]
        );

        // Also fetch interviewer users who are not yet assigned
        const availableResult = await pool.query(
            `
    SELECT
        users.id,
        users.name,
        users.email,
        users.role
    FROM users
    WHERE users.role = 'INTERVIEWER'
      AND users.id NOT IN (
          SELECT interviewer_id
          FROM application_interviewers
          WHERE application_id = $1
      )
    ORDER BY users.name ASC
    `,
            [applicationId]
        );

        return NextResponse.json({
            interviewers: result.rows,
            availableInterviewers: availableResult.rows,
        });
    } catch (error) {
        console.error(
            "Get application interviewers failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

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