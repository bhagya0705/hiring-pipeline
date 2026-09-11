import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

export async function PATCH(
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

    const client = await pool.connect();

    try {
        const { id: applicationId } = await params;

        const body = await request.json();
        const { stage } = body;

        const allowedStages = [
            "APPLIED",
            "SCREENING",
            "INTERVIEW",
            "OFFER",
            "HIRED",
            "REJECTED",
        ];

        if (!allowedStages.includes(stage)) {
            return NextResponse.json(
                {
                    error:
                        "Invalid stage. Allowed stages are APPLIED, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED",
                },
                { status: 400 }
            );
        }

        await client.query("BEGIN");

        // Get the current application state
        const applicationResult = await client.query(
            `
            SELECT
                id,
                current_stage,
                rejected_from_stage
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

        const application = applicationResult.rows[0];

        const currentStage = application.current_stage;
        const rejectedFromStage =
            application.rejected_from_stage;

        // Don't allow changing to the same stage
        if (currentStage === stage) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        `Application is already in ${currentStage} stage`,
                },
                { status: 400 }
            );
        }

        // Reject Application
        if (stage === "REJECTED") {
            await client.query(
                `
                UPDATE applications
                SET
                    current_stage = 'REJECTED',
                    rejected_from_stage = $1,
                    stage_entered_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
                `,
                [currentStage, applicationId]
            );

            // Add rejection event to timeline
            await client.query(
                `
                INSERT INTO application_events
                    (
                        application_id,
                        actor_id,
                        event_type,
                        from_stage,
                        to_stage
                    )
                VALUES
                    (
                        $1,
                        $2,
                        'REJECTED',
                        $3,
                        'REJECTED'
                    )
                `,
                [
                    applicationId,
                    user!.id,
                    currentStage,
                ]
            );

            await client.query("COMMIT");

            return NextResponse.json({
                message:
                    "Application rejected successfully",
                application: {
                    id: applicationId,
                    current_stage: "REJECTED",
                    rejected_from_stage: currentStage,
                },
            });
        }

        // Reinstate Rejected Application
        if (currentStage === "REJECTED") {
            if (!rejectedFromStage) {
                await client.query("ROLLBACK");

                return NextResponse.json(
                    {
                        error:
                            "Rejected application has no previous stage recorded",
                    },
                    { status: 400 }
                );
            }

            if (stage !== rejectedFromStage) {
                await client.query("ROLLBACK");

                return NextResponse.json(
                    {
                        error:
                            `Application must be reinstated to ${rejectedFromStage}, not ${stage}`,
                        rejectedFromStage,
                        requestedStage: stage,
                    },
                    { status: 400 }
                );
            }

            await client.query(
                `
                UPDATE applications
                SET
                    current_stage = $1,
                    rejected_from_stage = NULL,
                    stage_entered_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
                `,
                [stage, applicationId]
            );

            // Add reinstatement event
            await client.query(
                `
                INSERT INTO application_events
                    (
                        application_id,
                        actor_id,
                        event_type,
                        from_stage,
                        to_stage
                    )
                VALUES
                    (
                        $1,
                        $2,
                        'REINSTATED',
                        'REJECTED',
                        $3
                    )
                `,
                [
                    applicationId,
                    user!.id,
                    stage,
                ]
            );

            await client.query("COMMIT");

            return NextResponse.json({
                message:
                    "Application reinstated successfully",
                application: {
                    id: applicationId,
                    current_stage: stage,
                    rejected_from_stage: null,
                },
            });
        }

        // Forward pipeline
        const validTransitions: Record<string, string> = {
            APPLIED: "SCREENING",
            SCREENING: "INTERVIEW",
            INTERVIEW: "OFFER",
            OFFER: "HIRED",
        };

        if (validTransitions[currentStage] !== stage) {
            await client.query("ROLLBACK");

            return NextResponse.json(
                {
                    error:
                        `Invalid stage transition: ${currentStage} → ${stage}`,
                    currentStage,
                    requestedStage: stage,
                },
                { status: 400 }
            );
        }

        await client.query(
            `
            UPDATE applications
            SET
                current_stage = $1,
                stage_entered_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
            `,
            [stage, applicationId]
        );

        // Add stage-change event
        await client.query(
            `
            INSERT INTO application_events
                (
                    application_id,
                    actor_id,
                    event_type,
                    from_stage,
                    to_stage
                )
            VALUES
                (
                    $1,
                    $2,
                    'STAGE_CHANGED',
                    $3,
                    $4
                )
            `,
            [
                applicationId,
                user!.id,
                currentStage,
                stage,
            ]
        );

        await client.query("COMMIT");

        return NextResponse.json({
            message:
                "Application stage updated successfully",
            application: {
                id: applicationId,
                current_stage: stage,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Update application stage failed:",
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