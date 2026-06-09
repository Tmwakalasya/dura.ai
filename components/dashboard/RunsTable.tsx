"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StatusPill } from "./StatusPill";
import { StepStrip } from "./StepStrip";
import {
  exactlyOnceSaves,
  formatDuration,
  relativeTime,
  shortId,
  stepProgress,
} from "@/lib/mock-data";
import type { Run, RunStatus } from "@/lib/types";

const FILTERS: { label: string; value: RunStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Recovered", value: "recovered" },
  { label: "Completed", value: "completed" },
  { label: "Rolled back", value: "compensated" },
  { label: "Failed", value: "failed" },
];

export function RunsTable({ runs }: { runs: Run[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RunStatus | "all">("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return r.fn.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [runs, query, filter]);

  return (
    <div className="rounded-2xl border border-line bg-surface/40 backdrop-blur">
      {/* controls */}
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition-colors ${
                filter === f.value
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search by function or run id"
            className="w-full rounded-lg border border-line bg-ink/60 py-1.5 pl-9 pr-3 font-mono text-xs text-white/80 outline-none transition-colors placeholder:text-white/30 focus:border-white/20 sm:w-72"
          />
        </div>
      </div>

      {/* column header */}
      <div className="hidden grid-cols-[1.4fr_0.8fr_1.2fr_0.7fr_0.6fr_0.7fr_28px] gap-4 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-white/30 md:grid">
        <span>Function · run</span>
        <span>Status</span>
        <span>Steps</span>
        <span>Saves</span>
        <span>Duration</span>
        <span>Started</span>
        <span />
      </div>

      {/* rows */}
      <div className="divide-y divide-line">
        {visible.length === 0 && (
          <div className="px-5 py-12 text-center font-mono text-sm text-white/35">
            no runs match “{query}”
          </div>
        )}
        {visible.map((run) => {
          const prog = stepProgress(run);
          const saves = exactlyOnceSaves(run);
          return (
            <Link
              key={run.id}
              href={`/dashboard/runs/${run.id}`}
              className="grid grid-cols-2 items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025] md:grid-cols-[1.4fr_0.8fr_1.2fr_0.7fr_0.6fr_0.7fr_28px]"
            >
              {/* function + id */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm text-white/90">{run.fn}</span>
                  {run.env !== "production" && (
                    <span className="rounded border border-line px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/40">
                      {run.env}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-white/35">{shortId(run.id)}</div>
              </div>

              {/* status */}
              <div>
                <StatusPill kind="run" status={run.status} />
              </div>

              {/* steps strip */}
              <div className="hidden items-center gap-3 md:flex">
                <StepStrip run={run} />
                <span className="font-mono text-[11px] text-white/40">
                  {prog.done}/{prog.total}
                </span>
              </div>

              {/* exactly-once saves */}
              <div className="hidden md:block">
                {saves > 0 ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent">
                    ↺ {saves}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-white/25">—</span>
                )}
              </div>

              {/* duration */}
              <div className="hidden font-mono text-[11px] text-white/55 md:block">
                {formatDuration(run.durationMs)}
              </div>

              {/* started */}
              <div className="hidden font-mono text-[11px] text-white/45 md:block">
                {relativeTime(run.startedAtMs)}
              </div>

              {/* chevron */}
              <div className="hidden justify-end text-white/25 md:flex">
                <ChevronIcon />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
