import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";

type DashboardData = {
    summary: {
        openPositions: number;
        activeApplications: number;
        interviewsThisWeek: number;
        hiresThisMonth: number;
    };
    byJobAndStage: {
        job_id: string;
        job_title: string;
        stage: string;
        count: number;
    }[];
    weeklyApplications: {
        week: string;
        count: number;
    }[];
};

async function getDashboardData(): Promise<DashboardData> {
    const cookieStore = await cookies();

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"}/api/dashboard`,
        {
            headers: {
                Cookie: cookieStore.toString(),
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Dashboard API error:", errorData);

        throw new Error("Failed to load dashboard data");
    }

    return response.json();
}

const stageLabels: Record<string, string> = {
    APPLIED: "Applied",
    SCREENING: "Screening",
    INTERVIEW: "Interview",
    OFFER: "Offer",
    HIRED: "Hired",
    REJECTED: "Rejected",
};

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (user.role !== "RECRUITER") {
        redirect("/applications?notice=Not%20allowed%20to%20access%20dashboard.");
    }

    const data = await getDashboardData();

    const totalPipelineApplications = data.byJobAndStage
        .filter((item) => item.stage !== "REJECTED")
        .reduce((total, item) => total + item.count, 0);

    const stages = [
        "APPLIED",
        "SCREENING",
        "INTERVIEW",
        "OFFER",
        "HIRED",
    ];

    const pipeline = stages.map((stage) => ({
        stage,
        label: stageLabels[stage],
        count: data.byJobAndStage
            .filter((item) => item.stage === stage)
            .reduce((total, item) => total + item.count, 0),
    }));

    return (
        <AppShell userName={user.name} userRole={user.role}>
            <div className="mx-auto max-w-[1600px] p-5 sm:p-8">
                <div className="mb-8">
                    <p className="text-sm font-medium text-indigo-600">
                        Recruiter dashboard
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        Good to see you, {user.name.split(" ")[0]}.
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Here's an overview of your hiring activity.
                    </p>
                </div>

                {/* KPI cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Open positions"
                        value={data.summary.openPositions}
                        description="Currently accepting applications"
                    />

                    <MetricCard
                        label="Active applications"
                        value={data.summary.activeApplications}
                        description="Candidates still in the pipeline"
                    />

                    <MetricCard
                        label="Interviews this week"
                        value={data.summary.interviewsThisWeek}
                        description="Scheduled interviews"
                    />

                    <MetricCard
                        label="Hires this month"
                        value={data.summary.hiresThisMonth}
                        description="Applications moved to hired"
                    />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
                    {/* Weekly applications */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-950">
                                    Applications over time
                                </h2>
                                <p className="mt-1 text-xs text-slate-400">
                                    Weekly applications over the last quarter
                                </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                                12 weeks
                            </div>
                        </div>

                        <div className="mt-8 flex h-56 items-end gap-2 sm:gap-3">
                            {data.weeklyApplications.map((item) => {
                                const max = Math.max(
                                    ...data.weeklyApplications.map((week) => week.count),
                                    1
                                );

                                const height =
                                    item.count === 0 ? 4 : Math.max((item.count / max) * 100, 8);

                                return (
                                    <div
                                        key={item.week}
                                        className="group flex h-full flex-1 flex-col justify-end"
                                    >
                                        <div className="relative flex flex-1 items-end">
                                            <div
                                                className="w-full rounded-t-lg bg-indigo-500 transition-all group-hover:bg-indigo-600"
                                                style={{ height: `${height}%` }}
                                                title={`${item.count} applications`}
                                            />
                                        </div>

                                        <p className="mt-2 truncate text-center text-[10px] text-slate-400">
                                            {new Date(item.week).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Pipeline */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-950">
                                Hiring pipeline
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Current applications by stage
                            </p>
                        </div>

                        <div className="mt-6 space-y-4">
                            {pipeline.map((item) => {
                                const percentage =
                                    totalPipelineApplications > 0
                                        ? (item.count / totalPipelineApplications) * 100
                                        : 0;

                                return (
                                    <div key={item.stage}>
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-sm text-slate-600">
                                                {item.label}
                                            </span>

                                            <span className="text-sm font-semibold text-slate-950">
                                                {item.count}
                                            </span>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-slate-900 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Job breakdown */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="text-sm font-semibold text-slate-950">
                            Pipeline by position
                        </h2>

                        <p className="mt-1 text-xs text-slate-400">
                            Candidate distribution across your open roles
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs text-slate-400">
                                    <th className="px-6 py-3 font-medium">Position</th>
                                    <th className="px-6 py-3 font-medium">Stage</th>
                                    <th className="px-6 py-3 text-right font-medium">
                                        Candidates
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {data.byJobAndStage.map((item) => (
                                    <tr
                                        key={`${item.job_id}-${item.stage}`}
                                        className="text-sm"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {item.job_title}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                {stageLabels[item.stage] ?? item.stage}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                            {item.count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}

function MetricCard({
    label,
    value,
    description,
}: {
    label: string;
    value: number;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>

            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {value}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        </div>
    );
}