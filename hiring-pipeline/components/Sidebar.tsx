"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "▦",
  },
  {
    name: "Applications",
    href: "/applications",
    icon: "♙",
  },
  {
    name: "Job openings",
    href: "/jobs",
    icon: "▤",
  },
  {
    name: "Stalled alerts",
    href: "/alerts",
    icon: "◷",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            H
          </div>

          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-950">
              Hiring Pipeline
            </p>
            <p className="text-[11px] text-slate-400">Talent operations</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>

        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-100 text-slate-950"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${
                  active
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-400"
                }`}
              >
                {item.icon}
              </span>

              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700">
            Hiring workspace
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            Manage your team's hiring pipeline.
          </p>
        </div>
      </div>
    </aside>
  );
}