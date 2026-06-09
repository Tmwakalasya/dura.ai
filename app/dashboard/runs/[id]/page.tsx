import Link from "next/link";
import { notFound } from "next/navigation";

import { LiveTimeline } from "@/components/dashboard/LiveTimeline";
import { LogPanel } from "@/components/dashboard/LogPanel";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { StepTimeline } from "@/components/dashboard/StepTimeline";
import { Topbar } from "@/components/dashboard/Topbar";
import {
  RUNS,
  crashCount,
  exactlyOnceSaves,
  getRun,
  relativeTime,
  shortId,
} from "@/lib/mock-data";

// Pre-render every known run id.
export function generateStaticParams() {
  return RUNS.map((r) => ({ id: r.id }));
}

export default function RunDetail({ params }: { params: { id: string } }) {
  const run = getRun(params.id);
  if (!run) notFound();

  const saves = exactlyOnceSaves(run);
  const crashes = crashCount(run);

  return (
    <>
      <Topbar
        title={run.fn}
        subtitle={run.id}
        right={
          <Link
            href="/dashboard/runs"
            className="rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/90"
          >
            ← all runs
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* summary header */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface/40 px-5 py-4 backdrop-blur">
          <StatusPill kind="run" status={run.status} pulse />
          <Fact label="run" value={shortId(run.id)} mono />
          <Fact label="started" value={relativeTime(run.startedAtMs)} />
          {crashes > 0 && <Fact label="crashes survived" value={String(crashes)} accent="text-accent" />}
          {saves > 0 && <Fact label="exactly-once saves" value={`↺ ${saves}`} accent="text-accent" />}
          <div className="ml-auto font-mono text-[11px] text-white/35">{run.log}</div>
        </div>

        {/* two-column body */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* hero timeline */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-white/80">Execution timeline</h2>
              <span className="font-mono text-[11px] text-white/35">top → bottom · in order</span>
            </div>
            {run.status === "running" ? <LiveTimeline run={run} /> : <StepTimeline run={run} />}
          </div>

          {/* side panel */}
          <LogPanel run={run} />
        </div>
      </div>
    </>
  );
}

function Fact({
  label,
  value,
  accent = "text-white/85",
  mono,
}: {
  label: string;
  value: string;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/35">{label}</div>
      <div className={`mt-0.5 text-sm ${mono ? "font-mono" : ""} ${accent}`}>{value}</div>
    </div>
  );
}
