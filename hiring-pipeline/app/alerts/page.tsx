"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

type CurrentUser = {
    id: string;
    name: string;
    email: string;
    role: "RECRUITER" | "INTERVIEWER";
};

type StalledAlert = {
    application_id: string;
    candidate_name: string;
    candidate_email: string;
    job_id: string;
    job_title: string;
    stage: string;
    stage_entered_at: string;
    days_in_stage: number;
};

const stageLabels: Record<string, string> = {
    APPLIED: "Applied",
    SCREENING: "Screening",
    INTERVIEW: "Interview",
    OFFER: "Offer",
};

const stageStyles: Record<string, string> = {
    APPLIED: "bg-slate-100 text-slate-600",
    SCREENING: "bg-blue-50 text-blue-700",
    INTERVIEW: "bg-violet-50 text-violet-700",
    OFFER: "bg-amber-50 text-amber-700",
};

export default function AlertsPage() {
    const router = useRouter();

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [alerts, setAlerts] = useState<StalledAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [dismissingId, setDismissingId] = useState<string | null>(null);

    useEffect(() => {
        async function initialize() {
            try {
                const meResponse = await fetch("/api/auth/me", {
                    cache: "no-store",
                });

                if (!meResponse.ok) {
                    router.replace("/login");
                    return;
                }

                const meData = await meResponse.json();

                if (!meData.user) {
                    router.replace("/login");
                    return;
                }

                setUser(meData.user);

                const alertsResponse = await fetch(
                    "/api/applications/stalled",
                    {
                        cache: "no-store",
                    }
                );

                const alertsData = await alertsResponse.json();

                if (!alertsResponse.ok) {
                    if (alertsResponse.status === 403) {
                        throw new Error(
                            "Not allowed to access stalled alerts. Only recruiters can view and dismiss stalled alerts."
                        );
                    }

                    throw new Error(
                        alertsData.error ||
                            "Failed to load stalled alerts."
                    );
                }

                setAlerts(alertsData.alerts ?? []);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load stalled alerts."
                );
            } finally {
                setLoading(false);
            }
        }

        initialize();
    }, [router]);

    async function handleDismiss(applicationId: string) {
        setDismissingId(applicationId);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/applications/${applicationId}/stalled-dismiss`,
                {
                    method: "POST",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error(
                        "Not allowed to dismiss stalled alerts. Only recruiters can dismiss alerts."
                    );
                }

                throw new Error(
                    result.error || "Failed to dismiss stalled alert."
                );
            }

            setAlerts((currentAlerts) =>
                currentAlerts.filter(
                    (alert) => alert.application_id !== applicationId
                )
            );

            setSuccess("Stalled alert dismissed.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to dismiss stalled alert."
            );
        } finally {
            setDismissingId(null);
        }
    }

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-sm text-slate-400">
                    Loading workspace...
                </div>
            </div>
        );
    }

    return (
        <AppShell userName={user.name} userRole={user.role}>
            <main className="mx-auto max-w-[1400px] p-5 sm:p-8">
                <div className="mb-7">
                    <p className="text-sm font-medium text-indigo-600">
                        Hiring monitoring
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        Stalled alerts
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Applications that have remained in the same stage for
                        more than 10 days.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {success}
                    </div>
                )}

                {!error && (
                    <>
                        <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    Stalled applications
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Applications requiring attention
                                </p>
                            </div>

                            <div className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                                {alerts.length}{" "}
                                {alerts.length === 1 ? "alert" : "alerts"}
                            </div>
                        </div>

                        {alerts.length === 0 ? (
                            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">
                                    ✓
                                </div>

                                <p className="mt-4 text-sm font-semibold text-slate-800">
                                    No stalled applications
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    All active applications are progressing
                                    within the expected timeframe.
                                </p>
                            </section>
                        ) : (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[950px] text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                                                <th className="px-5 py-3 font-medium">
                                                    Candidate
                                                </th>

                                                <th className="px-5 py-3 font-medium">
                                                    Position
                                                </th>

                                                <th className="px-5 py-3 font-medium">
                                                    Stage
                                                </th>

                                                <th className="px-5 py-3 font-medium">
                                                    Days in stage
                                                </th>

                                                <th className="px-5 py-3 font-medium">
                                                    Stage entered
                                                </th>

                                                <th className="px-5 py-3 text-right font-medium">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {alerts.map((alert) => (
                                                <tr
                                                    key={alert.application_id}
                                                    className="transition hover:bg-slate-50"
                                                >
                                                    <td className="px-5 py-4">
                                                        <Link
                                                            href={`/applications/${alert.application_id}`}
                                                            className="block"
                                                        >
                                                            <p className="text-sm font-semibold text-slate-800 hover:text-indigo-600">
                                                                {
                                                                    alert.candidate_name
                                                                }
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-slate-400">
                                                                {
                                                                    alert.candidate_email
                                                                }
                                                            </p>
                                                        </Link>
                                                    </td>

                                                    <td className="px-5 py-4 text-sm text-slate-600">
                                                        {alert.job_title}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                                stageStyles[
                                                                    alert.stage
                                                                ] ??
                                                                "bg-slate-100 text-slate-600"
                                                            }`}
                                                        >
                                                            {stageLabels[
                                                                alert.stage
                                                            ] ?? alert.stage}
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span className="text-sm font-semibold text-red-600">
                                                            {
                                                                alert.days_in_stage
                                                            }{" "}
                                                            days
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-xs text-slate-500">
                                                        {new Date(
                                                            alert.stage_entered_at
                                                        ).toLocaleDateString(
                                                            "en-IN",
                                                            {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric",
                                                            }
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDismiss(
                                                                    alert.application_id
                                                                )
                                                            }
                                                            disabled={
                                                                dismissingId ===
                                                                alert.application_id
                                                            }
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {dismissingId ===
                                                            alert.application_id
                                                                ? "Dismissing..."
                                                                : "Dismiss"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </AppShell>
    );
}
