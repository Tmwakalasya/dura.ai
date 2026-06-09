"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { RunsTable } from "./RunsTable";
import { StatCard } from "./StatCard";
import { advance, isSettled, liveRunId } from "@/lib/live";
import { computeStats } from "@/lib/mock-data";
import type { Run } from "@/lib/types";

/** The overview body, made live. Seeded from the server-rendered runs so the
 *  first client paint is identical to SSR; after mount it advances the running
 *  run and re-derives the stat row, so numbers tick and the table moves. */
export function LiveOverview({ initialRuns }: { initialRuns: Run[] }) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  // Seconds since the last simulated event. Starts at 0 → "just now" on both
  // server and first client render (hydration-safe), then ticks via effect.
  const [sinceSync, setSinceSync] = useState(0);

  const liveId = useRef<string | null>(liveRunId(initialRuns));
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Advance the live run every few seconds.
    if (liveId.current) {
      stepTimer.current = setInterval(() => {
        setRuns((prev) => {
          const target = prev.find((r) => r.id === liveId.current);
          if (!target || isSettled(target)) {
            if (stepTimer.current) clearInterval(stepTimer.current);
            return prev;
          }
          const next = advance(target);
          setSinceSync(0); // an event just happened
          return prev.map((r) => (r.id === next.id ? next : r));
        });
      }, 2_600);
    }

    // A 1s clock for the "synced Ns ago" label.
    clockTimer.current = setInterval(() => setSinceSync((s) => s + 1), 1_000);

    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      if (clockTimer.current) clearInterval(clockTimer.current);
    };
  }, []);

  const stats = useMemo(() => computeStats(runs), [runs]);

  return (
    <>
      {/* stat row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total runs" value={stats.total} hint="last 24h" />
        <StatCard
          label="Active now"
          value={stats.running}
          hint={stats.running > 0 ? "executing" : "idle"}
          accent={stats.running > 0 ? "text-sky-300" : "text-white/80"}
          live={stats.running > 0}
        />
        <StatCard
          label="Exactly-once saves"
          value={stats.exactlyOnceSaves}
          hint="side effects prevented from re-running"
          accent="text-accent"
        />
        <StatCard
          label="Success rate"
          value={`${stats.successRate}%`}
          hint={`${stats.recovered} recovered · ${stats.failed} failed`}
          accent="text-emerald-400"
        />
      </div>

      {/* highlight banner */}
      {stats.recovered > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-5 py-3.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm text-accent">
            ↺
          </span>
          <p className="text-sm text-white/70">
            <span className="font-medium text-white">{stats.recovered} runs</span> crashed and
            resumed cleanly this period — every committed step was replayed from the log instead of
            re-executed. No double-charges, no orphaned state.
          </p>
        </div>
      )}

      {/* runs */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/80">Recent runs</h2>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            synced {sinceSync === 0 ? "just now" : `${sinceSync}s ago`}
          </span>
        </div>
        <RunsTable runs={runs} />
      </div>
    </>
  );
}
