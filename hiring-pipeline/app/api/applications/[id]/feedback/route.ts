import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/db/db";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    if (user.role !== "INTERVIEWER") {
        return NextResponse.json(
            {
                error:
                    "Only interviewers can submit feedback",
            },
            { status: 403 }
        );
    }

    const client = await pool.connect();

    try {
        const { id: applicationId } = await params;

        const body = await request.json();

        const { rating, comment } = body;

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return NextResponse.json(
                {
                    error:
                        "Rating must be an integer between 1 and 5",
                },
                { status: 400 }
            );
        }

        if (
            typeof comment !== "string" ||
            comment.trim() === ""
        ) {
            return NextResponse.json(
                {
                    error:
                        "Comment must be a non-empty string",
                },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        // Check application exists
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

        // Check interviewer is assigned to this application
        const assignmentResult = await client.query(
            `
            SELECT 1
            FROM application_interviewers
            WHERE application_id = $1
              AND interviewer_id = $2
            `,
            [applicationId, user.id]
        );

        if (assignmentResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        "You are not assigned to this application",
                },
                { status: 403 }
            );
        }

        // Save feedback
        const feedbackResult = await client.query(
            `
            INSERT INTO feedback
                (
                    application_id,
                    interviewer_id,
                    rating,
                    comment
                )
            VALUES
                ($1, $2, $3, $4)
            RETURNING
                id,
                application_id,
                interviewer_id,
                rating,
                comment,
                created_at
            `,
            [
                applicationId,
                user.id,
                rating,
                comment.trim(),
            ]
        );

        const feedback = feedbackResult.rows[0];

        // Add immutable timeline event
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
                    'FEEDBACK_ADDED',
                    $3
                )
            `,
            [
                applicationId,
                user.id,
                JSON.stringify({
                    feedbackId: feedback.id,
                    rating: feedback.rating,
                    comment: feedback.comment,
                }),
            ]
        );

        await client.query("COMMIT");

        return NextResponse.json(
            {
                message:
                    "Feedback submitted successfully",
                feedback,
            },
            { status: 201 }
        );
    } catch (error) {
        await client.query("ROLLBACK");

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
        ) {
            return NextResponse.json(
                {
                    error:
                        "You have already submitted feedback for this application",
                },
                { status: 409 }
            );
        }

        console.error(
            "Submit feedback failed:",
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