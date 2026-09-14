"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

type Job = {
    id: string;
    title: string;
    department: string;
    description: string;
    status: "OPEN" | "ARCHIVED";
    created_at: string;
    updated_at: string;
};

type CurrentUser = {
    id: string;
    name: string;
    email: string;
    role: "RECRUITER" | "INTERVIEWER";
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [view, setView] = useState<"OPEN" | "ARCHIVED">("OPEN");
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDepartment, setEditDepartment] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    const router = useRouter();
    function handleEditClick(job: Job) {
        setEditingJob(job);
        setEditTitle(job.title);
        setEditDepartment(job.department);
        setEditDescription(job.description);
        setEditError("");
    }
    async function handleJobStatusChange(
        jobId: string,
        status: "OPEN" | "ARCHIVED"
    ) {
        setError("");

        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to update job status."
                );
            }

            const jobsResponse = await fetch(
                `/api/jobs?status=${view}`,
                {
                    cache: "no-store",
                }
            );

            const jobsData = await jobsResponse.json();

            if (!jobsResponse.ok) {
                throw new Error(
                    jobsData.error || "Failed to refresh job openings."
                );
            }

            setJobs(jobsData.jobs ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to update job status."
            );
        }
    }

    async function handleEditSubmit() {
        if (!editingJob) return;

        setEditLoading(true);
        setEditError("");

        try {
            const response = await fetch(`/api/jobs/${editingJob.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: editTitle,
                    department: editDepartment,
                    description: editDescription,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to update job opening.");
            }

            setJobs((currentJobs) =>
                currentJobs.map((job) =>
                    job.id === result.job.id ? result.job : job
                )
            );

            setEditingJob(null);
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : "Unable to update job opening."
            );
        } finally {
            setEditLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function initialize() {
            try {
                const [meResponse, jobsResponse] = await Promise.all([
                    fetch("/api/auth/me", {
                        cache: "no-store",
                    }),
                    fetch(`/api/jobs?status=${view}`, {
                        cache: "no-store",
                    }),
                ]);

                if (cancelled) return;

                if (!meResponse.ok) {
                    router.replace("/login");
                    return;
                }

                const meData = await meResponse.json();

                if (cancelled) return;

                if (!meData.user) {
                    router.replace("/login");
                    return;
                }

                setUser(meData.user);

                const jobsData = await jobsResponse.json();

                if (cancelled) return;

                if (!jobsResponse.ok) {
                    throw new Error(
                        jobsData.error || "Failed to load job openings."
                    );
                }

                setJobs(jobsData.jobs ?? []);
            } catch (err) {
                if (cancelled) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load job openings."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        initialize();

        return () => {
            cancelled = true;
        };
    }, [router, view]);

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
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-indigo-600">
                            Hiring management
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                            Job openings
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Manage your open and archived positions.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setView("OPEN")}
                                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${view === "OPEN"
                                    ? "bg-slate-950 text-white"
                                    : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                Active jobs
                            </button>

                            <button
                                type="button"
                                onClick={() => setView("ARCHIVED")}
                                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${view === "ARCHIVED"
                                    ? "bg-slate-950 text-white"
                                    : "text-slate-500 hover:bg-slate-50"
                                    }`}
                            >
                                Archived
                            </button>
                        </div>

                        {view === "OPEN" && (
                            <Link
                                href="/jobs/new"
                                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                            >
                                + Create job opening
                            </Link>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {jobs.length === 0 ? (
                    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
                        <p className="text-sm font-medium text-slate-700">
                            {view === "OPEN"
                                ? "No active job openings"
                                : "No archived jobs"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            {view === "OPEN"
                                ? "Create a job opening to start building your hiring pipeline."
                                : "Archived positions will appear here."}
                        </p>
                    </section>
                ) : (
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {jobs.map((job) => (
                            <article
                                key={job.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-900">
                                            {job.title}
                                        </h2>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {job.department}
                                        </p>
                                    </div>

                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${job.status === "OPEN"
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-600"
                                            }`}
                                    >
                                        {job.status === "OPEN"
                                            ? "Open"
                                            : "Archived"}
                                    </span>
                                </div>

                                <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                                    {job.description}
                                </p>

                                <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                    <Link
                                        href={`/applications?jobId=${job.id}`}
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                                    >
                                        View applications →
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => handleEditClick(job)}
                                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleJobStatusChange(
                                                job.id,
                                                view === "OPEN" ? "ARCHIVED" : "OPEN"
                                            )
                                        }
                                        className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                        {view === "OPEN" ? "Archive" : "Restore"}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </main>

            {editingJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Edit Job Opening
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Update the job opening details.
                            </p>
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleEditSubmit();
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Job Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(event) => setEditTitle(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Department
                                </label>
                                <input
                                    type="text"
                                    value={editDepartment}
                                    onChange={(event) =>
                                        setEditDepartment(event.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    value={editDescription}
                                    onChange={(event) =>
                                        setEditDescription(event.target.value)
                                    }
                                    rows={5}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                                />
                            </div>

                            {editError && (
                                <p className="text-sm text-red-600">
                                    {editError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingJob(null)}
                                    disabled={editLoading}
                                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}