"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type CurrentUser = {
    id: string;
    name: string;
    email: string;
    role: "RECRUITER" | "INTERVIEWER";
};

type Application = {
    id: string;
    source: string;
    notes: string | null;
    current_stage: string;
    rejected_from_stage: string | null;
    stage_entered_at: string;
    created_at: string;
    updated_at: string;

    candidate_id: string;
    candidate_name: string;
    candidate_email: string;

    job_id: string;
    job_title: string;
    job_department: string;
    job_description: string;
    job_status: string;
};

type Interviewer = {
    id: string;
    name: string;
    email: string;
    role?: string;
    assigned_at?: string;
    interviewer_id?: string;
    interviewer_name?: string;
    interviewer_email?: string;
};

type Interview = {
    id: string;
    application_id: string;
    scheduled_at: string;
    duration_minutes: number;
    created_by: string;
    created_at: string;
    created_by_name?: string;
    created_by_email?: string;
};

const pipelineStages = [
    "APPLIED",
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "HIRED",
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
    APPLIED: "bg-slate-100 text-slate-700",
    SCREENING: "bg-blue-50 text-blue-700",
    INTERVIEW: "bg-violet-50 text-violet-700",
    OFFER: "bg-amber-50 text-amber-700",
    HIRED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
};

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();

    const applicationId = params.id as string;

    const [user, setUser] = useState<CurrentUser | null>(null);
    const [application, setApplication] = useState<Application | null>(null);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [availableInterviewers, setAvailableInterviewers] = useState<Interviewer[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
    const [assigningInterviewers, setAssigningInterviewers] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduledAt, setScheduledAt] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [schedulingInterview, setSchedulingInterview] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");
    const [rescheduleDuration, setRescheduleDuration] = useState("60");
    const [reschedulingInterview, setReschedulingInterview] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState("5");
    const [feedbackComment, setFeedbackComment] = useState("");
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editCandidateName, setEditCandidateName] = useState("");
    const [editCandidateEmail, setEditCandidateEmail] = useState("");
    const [editSource, setEditSource] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [editingApplication, setEditingApplication] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");
    const [selectedStage, setSelectedStage] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);

    useEffect(() => {
        async function loadPage() {
            try {
                const [
                    meResponse,
                    applicationResponse,
                    interviewersResponse,
                    interviewsResponse,
                    timelineResponse,
                ] = await Promise.all([
                    fetch("/api/auth/me", {
                        cache: "no-store",
                    }),
                    fetch(`/api/applications/${applicationId}`, {
                        cache: "no-store",
                    }),
                    fetch(`/api/applications/${applicationId}/interviewers`, {
                        cache: "no-store",
                    }),
                    fetch(`/api/applications/${applicationId}/interview`, {
                        cache: "no-store",
                    }),
                    fetch(`/api/applications/${applicationId}/timeline`, {
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

                const applicationData = await applicationResponse.json();

                if (!applicationResponse.ok) {
                    throw new Error(
                        applicationData.error || "Application not found."
                    );
                }

                setApplication(applicationData.application);
                if (timelineResponse.ok) {
                    const timelineData = await timelineResponse.json();

                    setTimeline(
                        timelineData.timeline ?? []
                    );
                }

                if (interviewersResponse.ok) {
                    const interviewersData = await interviewersResponse.json();
                    const interviewsData = await interviewsResponse.json();

                    setInterviews(
                        interviewsData.interviews ?? []
                    );

                    setInterviewers(
                        interviewersData.interviewers ?? []
                    );

                    setAvailableInterviewers(
                        interviewersData.availableInterviewers ?? []
                    );
                }
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load application."
                );
            } finally {
                setLoading(false);
            }
        }

        loadPage();
    }, [applicationId, router]);

    async function updateStage(stage: string) {
        if (!application || actionLoading) return;

        setActionLoading(true);
        setError("");
        setActionError("");
        setActionMessage("");

        try {
            const response = await fetch(
                `/api/applications/${application.id}/stage`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ stage }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to update application stage."
                );
            }

            setApplication((current) => {
                if (!current) return current;

                return {
                    ...current,
                    current_stage: data.application.current_stage,
                    rejected_from_stage:
                        data.application.rejected_from_stage ?? null,
                    stage_entered_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            });

            const timelineResponse = await fetch(
                `/api/applications/${application.id}/timeline`,
                {
                    cache: "no-store",
                }
            );

            if (timelineResponse.ok) {
                const timelineData = await timelineResponse.json();

                setTimeline(
                    timelineData.timeline ?? []
                );
            }

            setActionMessage(
                data.message || "Application updated successfully."
            );
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to update application."
            );
        } finally {
            setActionLoading(false);
        }
    }

    const rescheduleInterview = async () => {
        if (!interviews[0]) return;

        setReschedulingInterview(true);
        setError("");

        try {
            const scheduledAt = new Date(
                `${rescheduleDate}T${rescheduleTime}`
            ).toISOString();

            const response = await fetch(
                `/api/applications/${application!.id}/interview/${interviews[0].id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        scheduledAt,
                        durationMinutes: Number(rescheduleDuration),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to reschedule interview");
            }

            setInterviews((current) =>
                current.map((interview) =>
                    interview.id === data.interview.id
                        ? data.interview
                        : interview
                )
            );

            setShowRescheduleModal(false);
            setActionMessage("Interview rescheduled successfully.");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to reschedule interview"
            );
        } finally {
            setReschedulingInterview(false);
        }
    };
    const submitFeedback = async () => {
        if (!application) return;

        setSubmittingFeedback(true);
        setError("");
        setActionError("");

        try {
            const response = await fetch(
                `/api/applications/${application.id}/feedback`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        rating: Number(feedbackRating),
                        comment: feedbackComment.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to submit feedback");
            }

            setFeedbackComment("");
            setFeedbackRating("5");
            const timelineResponse = await fetch(
                `/api/applications/${application.id}/timeline`,
                {
                    cache: "no-store",
                }
            );

            if (timelineResponse.ok) {
                const timelineData = await timelineResponse.json();

                setTimeline(timelineData.timeline ?? []);
            }
            setActionMessage("Feedback submitted successfully.");
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Failed to submit feedback"
            );
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const saveApplicationChanges = async () => {
        if (!application) return;

        setEditingApplication(true);
        setActionError("");

        try {
            const response = await fetch(
                `/api/applications/${application.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        candidateName: editCandidateName.trim(),
                        candidateEmail: editCandidateEmail.trim(),
                        source: editSource.trim(),
                        notes: editNotes.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to update application."
                );
            }

            setApplication((current) =>
                current
                    ? {
                        ...current,
                        candidate_name:
                            data.application.candidate_name ??
                            editCandidateName.trim(),
                        candidate_email:
                            data.application.candidate_email ??
                            editCandidateEmail.trim(),
                        source:
                            data.application.source ??
                            editSource.trim(),
                        notes:
                            data.application.notes ??
                            editNotes.trim(),
                        updated_at:
                            data.application.updated_at ??
                            current.updated_at,
                    }
                    : current
            );

            setShowEditModal(false);
            setActionMessage("Application updated successfully.");
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to update application."
            );
        } finally {
            setEditingApplication(false);
            setShowEditModal(false);
        }
    };

    async function assignInterviewers() {
        if (selectedInterviewerIds.length === 0) {
            return;
        }

        setAssigningInterviewers(true);
        setError("");
        setActionMessage("");

        try {
            const response = await fetch(
                `/api/applications/${application!.id}/interviewers`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        interviewerIds: selectedInterviewerIds,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to assign interviewers."
                );
            }

            // Reload the panel from the database
            const refreshResponse = await fetch(
                `/api/applications/${application!.id}/interviewers`,
                {
                    cache: "no-store",
                }
            );

            if (refreshResponse.ok) {
                const refreshedData = await refreshResponse.json();

                setInterviewers(
                    refreshedData.interviewers ?? []
                );

                setAvailableInterviewers(
                    refreshedData.availableInterviewers ?? []
                );
            }

            setSelectedInterviewerIds([]);
            setShowAssignModal(false);

            setActionMessage(
                data.message || "Interviewers assigned successfully."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to assign interviewers."
            );
        } finally {
            setAssigningInterviewers(false);
        }
    }

    async function scheduleInterview() {
        if (!scheduledAt) {
            setError("Please select an interview date and time.");
            return;
        }

        setSchedulingInterview(true);
        setActionError("");
        setActionMessage("");

        try {
            const response = await fetch(
                `/api/applications/${application!.id}/interview`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        scheduledAt: new Date(scheduledAt).toISOString(),
                        durationMinutes: Number(durationMinutes),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Unable to schedule interview."
                );
            }

            setInterviews([data.interview]);

            setScheduledAt("");
            setDurationMinutes("60");
            setShowScheduleModal(false);

            setActionMessage(
                data.message || "Interview scheduled successfully."
            );
        } catch (err) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : "Unable to schedule interview."
            );
        } finally {
            setSchedulingInterview(false);
            setShowScheduleModal(false);
        }
    }



    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-sm text-slate-400">
                    Loading application...
                </p>
            </div>
        );
    }

    if (error || !application || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-lg font-semibold text-slate-900">
                        Unable to load application
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        {error || "This application could not be found."}
                    </p>

                    <Link
                        href="/applications"
                        className="mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                        Back to applications
                    </Link>
                </div>
            </div>
        );
    }

    const isRejected = application.current_stage === "REJECTED";

    const currentStageIndex = pipelineStages.indexOf(
        application.current_stage
    );

    const nextStage =
        currentStageIndex >= 0 &&
            currentStageIndex < pipelineStages.length - 1
            ? pipelineStages[currentStageIndex + 1]
            : null;

    return (
        <AppShell userName={user.name} userRole={user.role}>
            <main className="mx-auto max-w-[1600px] p-5 sm:p-8">

                {/* Breadcrumb */}
                <div className="mb-6">
                    <Link
                        href="/applications"
                        className="text-sm font-medium text-slate-400 transition hover:text-slate-700"
                    >
                        ← Applications
                    </Link>
                </div>

                {/* Header */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-700">
                                {application.candidate_name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                                        {application.candidate_name}
                                    </h1>

                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${stageStyles[application.current_stage]
                                            }`}
                                    >
                                        {stageLabels[application.current_stage] ??
                                            application.current_stage}
                                    </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    {application.candidate_email}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                    <span className="font-medium text-slate-700">
                                        {application.job_title}
                                    </span>

                                    <span className="text-slate-300">•</span>

                                    <span>{application.job_department}</span>

                                    <span className="text-slate-300">•</span>

                                    <span>{application.source || "Unknown source"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                            <button
                                onClick={() => {
                                    if (!application) return;

                                    setEditCandidateName(application.candidate_name);
                                    setEditCandidateEmail(application.candidate_email);
                                    setEditSource(application.source || "");
                                    setEditNotes(application.notes || "");
                                    setShowEditModal(true);
                                }}
                                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Edit application
                            </button>

                            {actionError && (
                                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <span className="mt-0.5">⚠️</span>

                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">
                                            Unable to update application
                                        </p>
                                        <p className="mt-1 text-sm text-amber-700">
                                            {actionError === "Forbidden"
                                                ? "You don't have permission to edit this application."
                                                : actionError}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Pipeline */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-950">
                                Hiring pipeline
                            </h2>

                            <p className="mt-1 text-xs text-slate-400">
                                Current position in the hiring process
                            </p>
                        </div>

                        {isRejected && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                                Rejected
                            </span>
                        )}
                    </div>

                    <div className="mt-8 overflow-x-auto">
                        <div className="flex min-w-162.5 items-center">
                            {pipelineStages.map((stage, index) => {
                                const completed =
                                    !isRejected && currentStageIndex >= index;

                                const current =
                                    !isRejected &&
                                    application.current_stage === stage;

                                return (
                                    <div
                                        key={stage}
                                        className="flex flex-1 items-center"
                                    >
                                        <div className="flex min-w-0 flex-col items-center">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold ${current
                                                    ? "border-slate-950 bg-slate-950 text-white"
                                                    : completed
                                                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                        : "border-slate-200 bg-white text-slate-400"
                                                    }`}
                                            >
                                                {index + 1}
                                            </div>

                                            <p
                                                className={`mt-3 text-xs font-medium ${current
                                                    ? "text-slate-950"
                                                    : completed
                                                        ? "text-slate-600"
                                                        : "text-slate-400"
                                                    }`}
                                            >
                                                {stageLabels[stage]}
                                            </p>
                                        </div>

                                        {index < pipelineStages.length - 1 && (
                                            <div
                                                className={`mx-3 h-px flex-1 ${currentStageIndex > index && !isRejected
                                                    ? "bg-indigo-400"
                                                    : "bg-slate-200"
                                                    }`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isRejected && (
                        <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                            <p className="text-sm font-medium text-red-800">
                                This application was rejected from{" "}
                                {stageLabels[application.rejected_from_stage ?? ""] ??
                                    "its previous stage"}.
                            </p>

                            <p className="mt-1 text-xs text-red-600">
                                The application can be reinstated to that exact stage.
                            </p>
                        </div>
                    )}
                </section>

                {/* Hiring actions */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-950">
                                Hiring actions
                            </h2>

                            <p className="mt-1 text-xs text-slate-400">
                                Update this candidate's position in the hiring pipeline.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {!isRejected && (
                                <>
                                    <select
                                        value={selectedStage}
                                        onChange={(event) => setSelectedStage(event.target.value)}
                                        disabled={actionLoading}
                                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Move to stage...</option>

                                        {pipelineStages.map((stage) => (
                                            <option
                                                key={stage}
                                                value={stage}
                                                disabled={stage === application.current_stage}
                                            >
                                                {stageLabels[stage]}
                                                {stage === application.current_stage
                                                    ? " (current)"
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!selectedStage) return;
                                            updateStage(selectedStage);
                                        }}
                                        disabled={actionLoading || !selectedStage}
                                        className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {actionLoading ? "Updating..." : "Move"}
                                    </button>
                                </>
                            )}

                            {!isRejected && application.current_stage !== "HIRED" && (
                                <button
                                    onClick={() => setShowRejectConfirm(true)}
                                    disabled={actionLoading}
                                    className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Reject
                                </button>
                            )}

                            {isRejected && application.rejected_from_stage && (
                                <button
                                    onClick={() =>
                                        updateStage(application.rejected_from_stage!)
                                    }
                                    disabled={actionLoading}
                                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {actionLoading
                                        ? "Reinstating..."
                                        : `Reinstate to ${stageLabels[application.rejected_from_stage]
                                        }`}
                                </button>
                            )}
                        </div>
                    </div>

                    {actionMessage && (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {actionMessage}
                        </div>
                    )}

                    {actionError && (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {actionError}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </section>

                {/* Information grid */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3">

                    {/* Candidate */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-950">
                            Candidate
                        </h2>

                        <div className="mt-5 space-y-4">
                            <InfoRow
                                label="Full name"
                                value={application.candidate_name}
                            />

                            <InfoRow
                                label="Email"
                                value={application.candidate_email}
                            />

                            <InfoRow
                                label="Source"
                                value={application.source || "—"}
                            />

                            <InfoRow
                                label="Applied"
                                value={formatDate(application.created_at)}
                            />
                        </div>
                    </section>

                    {/* Position */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-950">
                            Position
                        </h2>

                        <div className="mt-5 space-y-4">
                            <InfoRow
                                label="Role"
                                value={application.job_title}
                            />

                            <InfoRow
                                label="Department"
                                value={application.job_department}
                            />

                            <InfoRow
                                label="Opening status"
                                value={application.job_status}
                            />

                            <InfoRow
                                label="Current stage"
                                value={stageLabels[application.current_stage] ??
                                    application.current_stage}
                            />
                        </div>
                    </section>

                    {/* Notes */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-slate-950">
                            Notes
                        </h2>

                        <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                            {application.notes || "No notes have been added."}
                        </p>
                    </section>
                </div>

                {/* Placeholder sections */}
                <div className="mt-6 grid gap-6 lg:grid-cols-2">

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-950">
                                    Interview panel
                                </h2>

                                <p className="mt-1 text-xs text-slate-400">
                                    Interviewers assigned to this application.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowAssignModal(true)}
                                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                + Assign interviewer
                            </button>
                        </div>

                        <div className="mt-5">
                            {interviewers.length > 0 ? (
                                <div className="space-y-3">
                                    {interviewers.map((interviewer) => (
                                        <div
                                            key={interviewer.id}
                                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                                                {interviewer.name
                                                    .split(" ")
                                                    .map((part) => part[0])
                                                    .slice(0, 2)
                                                    .join("")
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {interviewer.name}
                                                </p>

                                                <p className="truncate text-xs text-slate-400">
                                                    {interviewer.email}
                                                </p>
                                            </div>

                                            <span className="ml-auto rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                                                Interviewer
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                                    <p className="text-sm font-medium text-slate-600">
                                        No interviewers assigned
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Assign interviewers to this application to build the panel.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-950">
                                    Interview
                                </h2>
                                {actionError && (
                                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                        <span className="text-lg">⚠️</span>

                                        <div>
                                            <p className="text-sm font-semibold text-amber-900">
                                                Only recruiter can schedule
                                            </p>
                                            <p className="mt-1 text-sm text-amber-700">
                                                {actionError}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <p className="mt-1 text-xs text-slate-400">
                                    Schedule and manage the candidate interview.
                                </p>
                            </div>

                            {interviews.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowScheduleModal(true)}
                                    className="cursor-pointer rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                                >
                                    + Schedule interview
                                </button>

                            )}
                        </div>

                        <div className="mt-5">
                            {interviews.length > 0 ? (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {new Date(
                                                    interviews[0].scheduled_at
                                                ).toLocaleString("en-IN", {
                                                    dateStyle: "medium",
                                                    timeStyle: "short",
                                                })}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                {interviews[0].duration_minutes} minutes
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const interview = interviews[0];
                                                const date = new Date(interview.scheduled_at);

                                                setRescheduleDate(
                                                    date.toISOString().split("T")[0]
                                                );
                                                setRescheduleTime(
                                                    date.toTimeString().slice(0, 5)
                                                );
                                                setRescheduleDuration(
                                                    String(interview.duration_minutes)
                                                );
                                                setShowRescheduleModal(true);
                                            }}
                                            className="cursor-pointer mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            Reschedule
                                        </button>

                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                            Scheduled
                                        </span>


                                    </div>

                                    {interviews[0].created_by_name && (
                                        <p className="mt-3 text-xs text-slate-500">
                                            Scheduled by{" "}
                                            <span className="font-medium text-slate-700">
                                                {interviews[0].created_by_name}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                                    <p className="text-sm font-medium text-slate-600">
                                        No interview scheduled
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Schedule an interview once the candidate is ready.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Activity timeline
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            Application history and activity.
                        </p>

                        <div className="mt-6 space-y-5">
                            {timeline.length === 0 ? (
                                <p className="text-sm text-slate-400">
                                    No activity recorded yet.
                                </p>
                            ) : (
                                timeline.map((event, index) => (
                                    <div
                                        key={event.id}
                                        className="relative flex gap-4"
                                    >
                                        {index !== timeline.length - 1 && (
                                            <div className="absolute left-1.75 top-7 h-full w-px bg-slate-200" />
                                        )}

                                        <div className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-white bg-slate-300 ring-1 ring-slate-200" />

                                        <div className="min-w-0 flex-1 pb-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {event.event_type.replaceAll("_", " ")}
                                                </p>

                                                <p className="text-xs text-slate-400">
                                                    {formatDate(event.created_at)}
                                                </p>
                                            </div>

                                            <p className="mt-1 text-xs text-slate-400">
                                                by {event.actor?.name ?? "System"}
                                            </p>

                                            {(event.from_stage || event.to_stage) && (
                                                <p className="mt-2 text-sm text-slate-600">
                                                    {event.from_stage
                                                        ? event.from_stage.replaceAll("_", " ")
                                                        : "Application"}{" "}
                                                    →{" "}
                                                    {event.to_stage
                                                        ? event.to_stage.replaceAll("_", " ")
                                                        : "Rejected"}
                                                </p>
                                            )}

                                            {event.event_type === "FEEDBACK_ADDED" && event.metadata && (
                                                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3">
                                                    <p className="text-sm font-medium text-slate-700">
                                                        Rating: {event.metadata.rating}/5
                                                    </p>

                                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                        {event.metadata.comment}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </main>
            {showRejectConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            !
                        </div>

                        <h2 className="mt-5 text-lg font-semibold text-slate-950">
                            Reject application?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Are you sure you want to reject{" "}
                            <span className="font-medium text-slate-700">
                                {application.candidate_name}
                            </span>
                            ? The application will be moved to the rejected stage.
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setShowRejectConfirm(false)}
                                disabled={actionLoading}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    setShowRejectConfirm(false);
                                    updateStage("REJECTED");
                                }}
                                disabled={actionLoading}
                                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                Reject application
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRescheduleModal && interviews[0] && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Reschedule Interview
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Update the interview date, time, or duration.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Time
                                </label>
                                <input
                                    type="time"
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Duration
                                </label>
                                <select
                                    value={rescheduleDuration}
                                    onChange={(e) => setRescheduleDuration(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                >
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60">60 minutes</option>
                                    <option value="90">90 minutes</option>
                                    <option value="120">120 minutes</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <p className="mt-4 text-sm text-red-600">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowRescheduleModal(false)}
                                disabled={reschedulingInterview}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={rescheduleInterview}
                                disabled={
                                    reschedulingInterview ||
                                    !rescheduleDate ||
                                    !rescheduleTime ||
                                    !rescheduleDuration
                                }
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {reschedulingInterview
                                    ? "Rescheduling..."
                                    : "Reschedule Interview"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {user?.role === "INTERVIEWER" && (
                <div className="mx-auto mt-6 w-full max-w-368.75 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-900">
                            Interview Feedback
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Share your assessment of the candidate after the interview.
                        </p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                Rating
                            </label>

                            <select
                                value={feedbackRating}
                                onChange={(e) => setFeedbackRating(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="5">5 — Excellent</option>
                                <option value="4">4 — Good</option>
                                <option value="3">3 — Average</option>
                                <option value="2">2 — Below Average</option>
                                <option value="1">1 — Poor</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                Comments
                            </label>

                            <textarea
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                rows={4}
                                placeholder="Share your interview feedback..."
                                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="mt-4 text-sm text-red-500">
                            {error}
                        </p>
                    )}

                    {actionError && (
                        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <span className="mt-0.5 text-lg">⚠️</span>

                            <div>
                                <p className="text-sm font-semibold text-amber-900">
                                    Feedback could not be submitted
                                </p>

                                <p className="mt-1 text-sm text-amber-700">
                                    {actionError}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-5 flex justify-end">
                        <button
                            onClick={submitFeedback}
                            disabled={
                                submittingFeedback ||
                                !feedbackComment.trim()
                            }
                            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submittingFeedback
                                ? "Submitting..."
                                : "Submit Feedback"}
                        </button>
                    </div>
                </div>
            )}

            {showEditModal && application && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Edit application
                            </h2>

                            <p className="mt-1 text-sm text-slate-400">
                                Update the candidate information and application details.
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Candidate name
                                </label>

                                <input
                                    type="text"
                                    value={editCandidateName}
                                    onChange={(e) =>
                                        setEditCandidateName(e.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Candidate email
                                </label>

                                <input
                                    type="email"
                                    value={editCandidateEmail}
                                    onChange={(e) =>
                                        setEditCandidateEmail(e.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Source
                                </label>

                                <input
                                    type="text"
                                    value={editSource}
                                    onChange={(e) =>
                                        setEditSource(e.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Notes
                                </label>

                                <textarea
                                    rows={5}
                                    value={editNotes}
                                    onChange={(e) =>
                                        setEditNotes(e.target.value)
                                    }
                                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                disabled={editingApplication}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveApplicationChanges}
                                disabled={editingApplication}
                                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {editingApplication
                                    ? "Saving..."
                                    : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

                        <div className="border-b border-slate-100 px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate-950">
                                Assign interviewers
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Select one or more interviewers for this application.
                            </p>
                        </div>

                        <div className="max-h-80 overflow-y-auto px-6 py-4">
                            {availableInterviewers.length > 0 ? (
                                <div className="space-y-2">
                                    {availableInterviewers.map((interviewer) => {
                                        const selected =
                                            selectedInterviewerIds.includes(
                                                interviewer.id
                                            );

                                        return (
                                            <button
                                                key={interviewer.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedInterviewerIds((current) =>
                                                        selected
                                                            ? current.filter(
                                                                (id) => id !== interviewer.id
                                                            )
                                                            : [...current, interviewer.id]
                                                    );
                                                }}
                                                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected
                                                    ? "border-indigo-200 bg-indigo-50"
                                                    : "border-slate-200 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <div
                                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${selected
                                                        ? "bg-indigo-100 text-indigo-700"
                                                        : "bg-slate-100 text-slate-600"
                                                        }`}
                                                >
                                                    {interviewer.name
                                                        .split(" ")
                                                        .map((part) => part[0])
                                                        .slice(0, 2)
                                                        .join("")
                                                        .toUpperCase()}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-800">
                                                        {interviewer.name}
                                                    </p>

                                                    <p className="truncate text-xs text-slate-400">
                                                        {interviewer.email}
                                                    </p>
                                                </div>

                                                <div
                                                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${selected
                                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                                        : "border-slate-300"
                                                        }`}
                                                >
                                                    {selected ? "✓" : ""}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                                    <p className="text-sm font-medium text-slate-600">
                                        No available interviewers
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        All interviewers are already assigned to this application.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedInterviewerIds([]);
                                    setShowAssignModal(false);
                                }}
                                disabled={assigningInterviewers}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={assignInterviewers}
                                disabled={
                                    assigningInterviewers ||
                                    selectedInterviewerIds.length === 0
                                }
                                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {assigningInterviewers
                                    ? "Assigning..."
                                    : "Assign selected"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

                        <div className="border-b border-slate-100 px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate-950">
                                Schedule interview
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Choose a future date, time and duration.
                            </p>
                        </div>

                        <div className="space-y-5 px-6 py-5">

                            <div>
                                <label className="mb-2 block text-xs font-medium text-slate-600">
                                    Date & time
                                </label>

                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(event) =>
                                        setScheduledAt(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-medium text-slate-600">
                                    Duration
                                </label>

                                <select
                                    value={durationMinutes}
                                    onChange={(event) =>
                                        setDurationMinutes(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60">60 minutes</option>
                                    <option value="90">90 minutes</option>
                                    <option value="120">120 minutes</option>
                                </select>
                            </div>

                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setScheduledAt("");
                                    setShowScheduleModal(false);
                                }}
                                disabled={schedulingInterview}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={scheduleInterview}
                                disabled={schedulingInterview || !scheduledAt}
                                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {schedulingInterview
                                    ? "Scheduling..."
                                    : "Schedule interview"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </AppShell>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
                {value}
            </p>
        </div>
    );
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}