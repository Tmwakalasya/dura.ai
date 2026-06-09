import { STEP_STATUS } from "@/lib/status";
import { formatDuration } from "@/lib/mock-data";
import type { Run, Step } from "@/lib/types";

/** The hero view: the ordered event stream of a run, rendered as a vertical
 *  timeline. Step events, crash markers, and resume markers are interleaved so
 *  the crash → resume → exactly-once-skip story reads top to bottom. */
export function StepTimeline({ run }: { run: Run }) {
  return (
    <div className="relative pl-1">
      {/* the rail */}
      <div className="absolute bottom-2 left-[11px] top-2 w-px bg-line" />

      <ol className="space-y-1">
        {run.timeline.map((entry, i) => {
          if (entry.kind === "crash") {
            return <CrashNode key={i} cause={entry.crash.cause} afterStep={entry.crash.afterStep} />;
          }
          if (entry.kind === "resume") {
            return <ResumeNode key={i} worker={entry.resume.worker} />;
          }
          return <StepNode key={i} step={entry.step} />;
        })}
      </ol>
    </div>
  );
}

function StepNode({ step }: { step: Step }) {
  const style = STEP_STATUS[step.status];
  const isSkip = step.status === "skipped";
  const isRunning = step.status === "running";
  const isFail = step.status === "failed";

  return (
    <li className="relative flex gap-4 pb-5">
      {/* node dot, masking the rail behind it */}
      <span className="relative z-10 mt-1.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-line bg-ink">
        <span className={`h-2 w-2 rounded-full ${style.dot} ${isRunning ? "animate-pulse" : ""}`} />
      </span>

      <div
        className={`min-w-0 flex-1 rounded-xl border px-4 py-3 transition-colors ${
          isSkip
            ? "border-accent/25 bg-accent/[0.04]"
            : isFail
            ? "border-red-500/25 bg-red-500/[0.04]"
            : "border-line bg-surface/40 hover:border-white/12"
        }`}
      >
        {/* header line */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-white/90">{step.name}</span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${style.bg} ${style.text}`}
          >
            {style.short}
          </span>
          {step.note && (
            <span className={`font-mono text-[11px] ${isSkip ? "text-accent" : "text-white/40"}`}>
              {step.note}
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] text-white/35">
            {step.status === "skipped" ? "0ms · cached" : formatDuration(step.durationMs)}
          </span>
        </div>

        {/* meta line */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/35">
          <span>worker {step.worker}</span>
          {step.idempotencyKey && (
            <span className="text-white/45">{step.idempotencyKey}</span>
          )}
          {step.attempt > 1 && <span>attempt {step.attempt}</span>}
        </div>

        {/* result payload */}
        {step.result !== undefined && (
          <details className="group mt-2">
            <summary className="cursor-pointer list-none font-mono text-[10px] text-white/40 transition-colors hover:text-white/70">
              <span className="inline-block transition-transform group-open:rotate-90">▸</span>{" "}
              committed result
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-ink/70 p-3 font-mono text-[11px] leading-relaxed text-emerald-300/80">
              {formatJSON(step.result)}
            </pre>
          </details>
        )}
      </div>
    </li>
  );
}

function CrashNode({ cause, afterStep }: { cause: string; afterStep: string }) {
  return (
    <li className="relative flex gap-4 pb-5">
      <span className="relative z-10 mt-1.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-red-500/40 bg-ink">
        <BoltIcon />
      </span>
      <div className="min-w-0 flex-1 rounded-xl border border-red-500/25 bg-red-500/[0.05] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-red-300">process crashed</span>
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-red-300">
            {cause}
          </span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-white/40">
          died after <span className="text-white/60">{afterStep}</span> committed · in-flight work lost
        </div>
      </div>
    </li>
  );
}

function ResumeNode({ worker }: { worker: string }) {
  return (
    <li className="relative flex gap-4 pb-5">
      <span className="relative z-10 mt-1.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-accent/40 bg-ink">
        <span className="font-mono text-[11px] text-accent">↺</span>
      </span>
      <div className="min-w-0 flex-1 rounded-xl border border-accent/25 bg-accent/[0.05] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-accent">fresh process resumed</span>
          <span className="font-mono text-[10px] text-white/45">worker {worker}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-white/40">
          reads the log · committed steps are replayed, not re-run
        </div>
      </div>
    </li>
  );
}

function BoltIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        fill="#f87171"
        stroke="#f87171"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatJSON(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
