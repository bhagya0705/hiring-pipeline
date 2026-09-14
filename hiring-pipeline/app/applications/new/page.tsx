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

type Job = {
    id: string;
    title: string;
    department: string;
    status: string;
};

export default function NewApplicationPage() {
    const router = useRouter();

    const handleCreateApplication = async () => {
        setError("");

        if (!candidateName.trim()) {
            setError("Candidate name is required.");
            return;
        }

        if (!candidateEmail.trim()) {
            setError("Candidate email is required.");
            return;
        }

        if (!selectedJobId) {
            setError("Please select a position.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch("/api/applications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    candidateName: candidateName.trim(),
                    candidateEmail: candidateEmail.trim(),
                    jobOpeningId: selectedJobId,
                    source: source.trim(),
                    notes: notes.trim(),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to create application."
                );
            }

            router.push(`/applications/${result.application.id}`);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create application."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [candidateName, setCandidateName] = useState("");
    const [candidateEmail, setCandidateEmail] = useState("");
    const [selectedJobId, setSelectedJobId] = useState("");
    const [source, setSource] = useState("");
    const [notes, setNotes] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function initialize() {
            try {
                const [meResponse, jobsResponse] = await Promise.all([
                    fetch("/api/auth/me", {
                        cache: "no-store",
                    }),
                    fetch("/api/jobs?status=ALL", {
                        cache: "no-store",
                    }),
                ]);

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

                if (jobsResponse.ok) {
                    const jobsData = await jobsResponse.json();
                    setJobs(jobsData.jobs ?? []);
                }
            } finally {
                setLoading(false);
            }
        }

        initialize();
    }, [router]);

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
            <main className="mx-auto max-w-[1200px] p-5 sm:p-8">
                <div className="mb-7">
                    <p className="text-sm font-medium text-indigo-600">
                        Candidate management
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        Add application
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Create a new candidate application.
                    </p>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    {error && (
                        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span className="font-semibold">Not allowed:</span>{" "}
                            {error}
                        </div>
                    )}
                    <div className="grid gap-5 md:grid-cols-2">

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Candidate name
                            </label>
                            <input
                                type="text"
                                value={candidateName}
                                onChange={(e) => setCandidateName(e.target.value)}
                                placeholder="e.g. Rahul Sharma"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Candidate email
                            </label>
                            <input
                                type="email"
                                value={candidateEmail}
                                onChange={(e) => setCandidateEmail(e.target.value)}
                                placeholder="candidate@example.com"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Position
                            </label>
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            >
                                <option value="" disabled>
                                    Select a position
                                </option>

                                {jobs.map((job) => (
                                    <option key={job.id} value={job.id}>
                                        {job.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Source
                            </label>
                            <input
                                type="text"
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                placeholder="e.g. LinkedIn, Naukri, Referral"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={5}
                                placeholder="Add any relevant notes about the candidate..."
                                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleCreateApplication}
                            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                            {submitting ? "Creating..." : "Create application"}
                        </button>
                    </div>
                </section>
            </main>
        </AppShell>
    );
}