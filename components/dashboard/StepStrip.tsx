import { STEP_STATUS } from "@/lib/status";
import { committedSteps, crashCount } from "@/lib/mock-data";
import type { Run } from "@/lib/types";

/** A dense horizontal glyph-strip summarising a run's steps. Each segment is a
 *  committed step coloured by final state; a small bolt marks where it crashed. */
export function StepStrip({ run }: { run: Run }) {
  const steps = committedSteps(run);
  const crashed = crashCount(run) > 0;

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <span
          key={`${s.name}-${i}`}
          title={`${s.name} · ${STEP_STATUS[s.status].label}`}
          className={`h-1.5 w-6 rounded-full ${STEP_STATUS[s.status].dot} ${
            s.status === "running" ? "animate-pulse" : ""
          }`}
        />
      ))}
      {crashed && (
        <span title="crashed & resumed" className="ml-1 font-mono text-[11px] text-accent">
          ↺
        </span>
      )}
    </div>
  );
}
