"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";

type Application = {
    id: string;
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    job_id: string;
    job_title: string;
    source: string;
    notes: string | null;
    current_stage: string;
    created_at: string;
    updated_at: string;
};

type ApplicationsResponse = {
    applications: Application[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

type Job = {
    id: string;
    title: string;
    department: string;
    status: string;
};

type CurrentUser = {
    id: string;
    name: string;
    email: string;
    role: "RECRUITER" | "INTERVIEWER";
};

const stages = [
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "HIRED",
    "REJECTED",
];

const stageLabels: Record<string, string> = {
    APPLIED: "Applied",
    SCREENING: "Screening",
    INTERVIEW: "Interview",
    OFFER: "Offer",
    HIRED: "Hired",
    REJECTED: "Rejected",
};

const stageStyles: Record<string, string> = {
    APPLIED: "bg-slate-100 text-slate-600",
    SCREENING: "bg-blue-50 text-blue-700",
    INTERVIEW: "bg-violet-50 text-violet-700",
    OFFER: "bg-amber-50 text-amber-700",
    HIRED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
};


function ApplicationsPage() {

    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<ApplicationsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [search, setSearch] = useState("");
    const [jobId, setJobId] = useState(
        searchParams.get("jobId") || ""
    );
    const [stage, setStage] = useState("");
    const [source, setSource] = useState("");
    const [sort, setSort] = useState("lastUpdated");
    const [order, setOrder] = useState("desc");
    const [page, setPage] = useState(1);
    const [searchTrigger, setSearchTrigger] = useState(0);
    const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResults, setBulkResults] = useState<
        {
            applicationId: string;
            candidateName: string;
            status: "SUCCESS" | "REFUSED";
            message: string;
        }[]
    >([]);

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [initializing, setInitializing] = useState(true);


    async function loadApplications() {

        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams();

            if (search.trim()) params.set("search", search.trim());
            if (jobId) params.set("jobId", jobId);
            if (stage) params.set("stage", stage);
            if (source.trim()) params.set("source", source.trim());

            params.set("sort", sort);
            params.set("order", order);
            params.set("page", String(page));
            params.set("limit", "10");

            const response = await fetch(
                `/api/applications?${params.toString()}`,
                {
                    cache: "no-store",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to load applications.");
            }

            setData(result);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load applications."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!initializing) {
            loadApplications();
        }
    }, [initializing, jobId, stage, source, sort, order, page,searchTrigger]);

    useEffect(() => {
        const message = searchParams.get("notice");

        if (message) {
            setNotice(message);
        }
    }, [searchParams]);

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
            } catch {
                setError("Unable to initialize applications.");
            } finally {
                setInitializing(false);
            }
        }

        initialize();
    }, [router]);



    function handleSearchSubmit(event: React.FormEvent) {
        event.preventDefault();
        setPage(1);
        setSearchTrigger((current) => current + 1);
    }

    async function handleExportCsv() {
        try {
            const response = await fetch("/api/applications/export");

            if (!response.ok) {
                const result = await response.json();
                throw new Error(
                    result.error || "Failed to export applications."
                );
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "applications.csv";
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to export applications."
            );
        }
    }

    async function handleBulkAction(action: "ADVANCE" | "REJECT") {
        if (selectedApplicationIds.length === 0) {
            return;
        }

        setBulkLoading(true);
        setBulkResults([]);
        setError("");

        try {
            const response = await fetch("/api/applications/bulk", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    applicationIds: selectedApplicationIds,
                    action,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Bulk action failed."
                );
            }

            const results = result.results.map(
                (item: {
                    applicationId: string;
                    status: "SUCCESS" | "REFUSED";
                    message?: string;
                    reason?: string;
                }) => {
                    const application = data?.applications.find(
                        (candidate) => candidate.id === item.applicationId
                    );

                    return {
                        applicationId: item.applicationId,
                        candidateName:
                            application?.candidate_name ?? "Unknown candidate",
                        status: item.status,
                        message:
                            item.status === "SUCCESS"
                                ? item.message ?? "Action completed successfully."
                                : item.reason ?? "Action was refused.",
                    };
                }
            );

            setBulkResults(results);
            setSelectedApplicationIds([]);

            await loadApplications();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to process bulk action."
            );
        } finally {
            setBulkLoading(false);
        }
    }

    function clearFilters() {
        setSearch("");
        setJobId("");
        setStage("");
        setSource("");
        setSort("lastUpdated");
        setOrder("desc");
        setPage(1);
    }

    if (initializing || !user) {
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
            <main className="mx-auto max-w-[1600px] p-5 sm:p-8">
                {/* Header */}
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-indigo-600">
                            Candidate management
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                            Applications
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Manage candidates across your hiring pipeline.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            Export CSV
                        </button>

                        <Link
                            href="/applications/new"
                            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                            + Add application
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_160px_160px_180px_auto]"
                    >
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                ⌕
                            </span>

                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search candidate name or email"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <select
                            value={jobId}
                            onChange={(event) => {
                                setJobId(event.target.value);
                                setPage(1);
                            }}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-500"
                        >
                            <option value="">All positions</option>

                            {jobs.map((job) => (
                                <option key={job.id} value={job.id}>
                                    {job.title}
                                </option>
                            ))}
                        </select>

                        <select
                            value={stage}
                            onChange={(event) => {
                                setStage(event.target.value);
                                setPage(1);
                            }}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-500"
                        >
                            <option value="">All stages</option>

                            {stages.map((item) => (
                                <option key={item} value={item}>
                                    {stageLabels[item]}
                                </option>
                            ))}
                        </select>

                        <input
                            value={source}
                            onChange={(event) => {
                                setSource(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Source"
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                        />

                        <select
                            value={`${sort}:${order}`}
                            onChange={(event) => {
                                const [newSort, newOrder] = event.target.value.split(":");
                                setSort(newSort);
                                setOrder(newOrder);
                                setPage(1);
                            }}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-indigo-500"
                        >
                            <option value="lastUpdated:desc">Recently updated</option>
                            <option value="appliedDate:desc">Newest applications</option>
                            <option value="appliedDate:asc">Oldest applications</option>
                            <option value="stage:asc">Stage A–Z</option>
                        </select>

                        <button
                            type="submit"
                            className="h-11 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                        >
                            Search
                        </button>
                    </form>

                    {(search || jobId || stage || source) && (
                        <div className="mt-3 flex justify-end">
                            <button
                                onClick={clearFilters}
                                className="text-xs font-medium text-slate-400 hover:text-slate-700"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </section>

                {/* Results */}
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-white px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">
                            Select one or more candidates for bulk operation
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Select candidates below to advance or reject them together.
                        </p>
                    </div>

                    {selectedApplicationIds.length > 0 && (
                        <div className="flex flex-col gap-3 border-b border-indigo-100 bg-indigo-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-indigo-700">
                                {selectedApplicationIds.length} application
                                {selectedApplicationIds.length !== 1 ? "s" : ""} selected
                            </p>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleBulkAction("ADVANCE")}
                                    className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={bulkLoading}
                                >
                                    Advance selected
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleBulkAction("REJECT")}
                                    className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={bulkLoading}
                                >
                                    Reject selected
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedApplicationIds([])}
                                    disabled={bulkLoading}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {bulkResults.length > 0 && (
                        <div className="border-b border-slate-100 bg-white px-5 py-4">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-800">
                                    Bulk action results
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setBulkResults([])}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-700"
                                >
                                    Dismiss
                                </button>
                            </div>

                            <div className="space-y-2">
                                {bulkResults.map((item) => (
                                    <div
                                        key={item.applicationId}
                                        className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2.5"
                                    >
                                        <span
                                            className={
                                                item.status === "SUCCESS"
                                                    ? "text-emerald-600"
                                                    : "text-red-600"
                                            }
                                        >
                                            {item.status === "SUCCESS" ? "✓" : "✕"}
                                        </span>

                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700">
                                                {item.candidateName}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                {item.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                Applications
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                                {data ? `${data.pagination.total} total matches` : "Loading..."}
                            </p>
                        </div>
                    </div>

                    {notice && (
                        <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            {notice}
                        </div>
                    )}

                    {error && (
                        <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-212.5 text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-400">
                                    <th className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={
                                                (data?.applications?.length ?? 0) > 0 &&
                                                selectedApplicationIds.length === (data?.applications.length ?? 0)
                                            }
                                            onChange={() => {
                                                const ids = data?.applications.map((application) => application.id) ?? [];

                                                setSelectedApplicationIds((current) =>
                                                    current.length === ids.length ? [] : ids
                                                );
                                            }}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                    </th>
                                    <th className="px-5 py-3 font-medium">Candidate</th>
                                    <th className="px-5 py-3 font-medium">Position</th>
                                    <th className="px-5 py-3 font-medium">Stage</th>
                                    <th className="px-5 py-3 font-medium">Source</th>
                                    <th className="px-5 py-3 font-medium">Applied</th>
                                    <th className="px-5 py-3 font-medium">Updated</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center text-sm text-slate-400"
                                        >
                                            Loading applications...
                                        </td>
                                    </tr>
                                ) : data?.applications.length ? (
                                    data.applications.map((application) => (
                                        <tr
                                            key={application.id}
                                            className="group transition hover:bg-slate-50"
                                        >
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedApplicationIds.includes(application.id)}
                                                    onChange={() => {
                                                        setSelectedApplicationIds((current) =>
                                                            current.includes(application.id)
                                                                ? current.filter((id) => id !== application.id)
                                                                : [...current, application.id]
                                                        );
                                                    }}
                                                    className="h-4 w-4 rounded border-slate-300"
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/applications/${application.id}`}
                                                    className="block"
                                                >
                                                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                                                        {application.candidate_name}
                                                    </p>

                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {application.candidate_email}
                                                    </p>
                                                </Link>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {application.job_title}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageStyles[application.current_stage]
                                                        }`}
                                                >
                                                    {stageLabels[application.current_stage] ??
                                                        application.current_stage}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-500">
                                                {application.source || "—"}
                                            </td>

                                            <td className="px-5 py-4 text-xs text-slate-500">
                                                {new Date(application.created_at).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-xs text-slate-500">
                                                {new Date(application.updated_at).toLocaleDateString(
                                                    "en-IN",
                                                    {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center"
                                        >
                                            <p className="text-sm font-medium text-slate-700">
                                                No applications found
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Try adjusting your search or filters.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data && data.pagination.totalPages > 0 && (
                        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-slate-400">
                                Showing{" "}
                                <span className="font-medium text-slate-600">
                                    {(data.pagination.page - 1) * data.pagination.limit + 1}
                                </span>{" "}
                                to{" "}
                                <span className="font-medium text-slate-600">
                                    {Math.min(
                                        data.pagination.page * data.pagination.limit,
                                        data.pagination.total
                                    )}
                                </span>{" "}
                                of{" "}
                                <span className="font-medium text-slate-600">
                                    {data.pagination.total}
                                </span>
                            </p>

                            <div className="flex items-center gap-1">
                                <button
                                    disabled={data.pagination.page <= 1}
                                    onClick={() => setPage((current) => current - 1)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>

                                <span className="px-3 text-xs text-slate-500">
                                    Page {data.pagination.page} of {data.pagination.totalPages}
                                </span>

                                <button
                                    disabled={data.pagination.page >= data.pagination.totalPages}
                                    onClick={() => setPage((current) => current + 1)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </AppShell>
    );
}

export default function ApplicationsPageWrapper() {
    return (
        <Suspense fallback={<div className="p-6">Loading applications...</div>}>
            <ApplicationsPage />
        </Suspense>
    );
}