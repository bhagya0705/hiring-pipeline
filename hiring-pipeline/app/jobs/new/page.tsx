"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

type CurrentUser = {
    id: string;
    name: string;
    email: string;
    role: "RECRUITER" | "INTERVIEWER";
};

export default function NewJobPage() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [title, setTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const router = useRouter();

    useEffect(() => {
        async function initialize() {
            try {
                const response = await fetch("/api/auth/me", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    router.replace("/login");
                    return;
                }

                const result = await response.json();

                if (!result.user) {
                    router.replace("/login");
                    return;
                }

                setUser(result.user);
            } catch {
                setError("Unable to initialize job creation.");
            } finally {
                setLoading(false);
            }
        }

        initialize();
    }, [router]);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();

        setSubmitting(true);
        setError("");

        try {
            const response = await fetch("/api/jobs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    department,
                    description,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to create job opening."
                );
            }

            router.push("/jobs");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create job opening."
            );
        } finally {
            setSubmitting(false);
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
            <main className="mx-auto max-w-3xl p-5 sm:p-8">
                <div className="mb-7">
                    <p className="text-sm font-medium text-indigo-600">
                        Hiring management
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        Create job opening
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Add a new position to your hiring pipeline.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Job title
                            </label>

                            <input
                                required
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder="e.g. Senior Frontend Engineer"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Department
                            </label>

                            <input
                                required
                                value={department}
                                onChange={(event) =>
                                    setDepartment(event.target.value)
                                }
                                placeholder="e.g. Engineering"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Description
                            </label>

                            <textarea
                                required
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Describe the role, responsibilities, and requirements..."
                                rows={7}
                                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => router.push("/jobs")}
                            disabled={submitting}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? "Creating..." : "Create job opening"}
                        </button>
                    </div>
                </form>
            </main>
        </AppShell>
    );
}