import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { pool } from "@/db/db";

const nextStage: Record<string, string> = {
    APPLIED: "SCREENING",
    SCREENING: "INTERVIEW",
    INTERVIEW: "OFFER",
    OFFER: "HIRED",
};

export async function POST(request: Request) {
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

    try {
        const body = await request.json();

        const { applicationIds, action } = body;

        if (
            !Array.isArray(applicationIds) ||
            applicationIds.length === 0
        ) {
            return NextResponse.json(
                {
                    error:
                        "applicationIds must be a non-empty array",
                },
                { status: 400 }
            );
        }

        if (action !== "ADVANCE" && action !== "REJECT") {
            return NextResponse.json(
                {
                    error:
                        "Action must be either ADVANCE or REJECT",
                },
                { status: 400 }
            );
        }

        const uniqueApplicationIds = [
            ...new Set(applicationIds),
        ];

        const results = [];

        for (const applicationId of uniqueApplicationIds) {
            const client = await pool.connect();

            try {
                await client.query("BEGIN");

                const applicationResult =
                    await client.query(
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

                    results.push({
                        applicationId,
                        status: "REFUSED",
                        reason: "Application not found",
                    });

                    continue;
                }

                const application =
                    applicationResult.rows[0];

                const currentStage =
                    application.current_stage;

                if (action === "ADVANCE") {
                    if (!nextStage[currentStage]) {
                        await client.query("ROLLBACK");

                        results.push({
                            applicationId,
                            status: "REFUSED",
                            reason:
                                `Application cannot be advanced from ${currentStage}`,
                        });

                        continue;
                    }

                    const newStage =
                        nextStage[currentStage];

                    await client.query(
                        `
                        UPDATE applications
                        SET
                            current_stage = $1,
                            stage_entered_at = NOW(),
                            updated_at = NOW()
                        WHERE id = $2
                        `,
                        [
                            newStage,
                            applicationId,
                        ]
                    );

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
                            newStage,
                        ]
                    );

                    await client.query("COMMIT");

                    results.push({
                        applicationId,
                        status: "SUCCESS",
                        message:
                            `Application advanced from ${currentStage} to ${newStage}`,
                    });

                    continue;
                }

                // REJECT
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
                    [
                        currentStage,
                        applicationId,
                    ]
                );

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

                results.push({
                    applicationId,
                    status: "SUCCESS",
                    message:
                        `Application rejected from ${currentStage}`,
                });
            } catch (error) {
                await client.query("ROLLBACK");

                console.error(
                    `Bulk action failed for ${applicationId}:`,
                    error
                );

                results.push({
                    applicationId,
                    status: "REFUSED",
                    reason:
                        "Something went wrong while processing this application",
                });
            } finally {
                client.release();
            }
        }

        return NextResponse.json({
            action,
            results,
        });
    } catch (error) {
        console.error(
            "Bulk application action failed:",
            error
        );

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}