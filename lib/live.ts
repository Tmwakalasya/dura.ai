// Client-side simulation of a run making progress. Pure functions only — the
// React components own the timers. This is what fakes "real-time" until the
// live API is wired; the logic stays identical between the overview and the
// run-detail view because both import these helpers.

import type { Run, TimelineEntry } from "./types";

function cloneEntry(e: TimelineEntry): TimelineEntry {
  if (e.kind === "step") return { kind: "step", step: { ...e.step } };
  if (e.kind === "crash") return { kind: "crash", crash: { ...e.crash } };
  return { kind: "resume", resume: { ...e.resume } };
}

/** True once a run has no running or pending steps left to advance. */
export function isSettled(run: Run): boolean {
  return !run.timeline.some(
    (e) => e.kind === "step" && (e.step.status === "running" || e.step.status === "pending"),
  );
}

/** Advance a run by one stage:
 *  - the currently-running step commits (→ executed), and
 *  - the next pending step starts (→ running).
 *  When no steps remain in flight, the run is marked completed.
 *  Returns a NEW run object (never mutates the input). */
export function advance(run: Run): Run {
  const timeline = run.timeline.map(cloneEntry);

  const runningIdx = timeline.findIndex(
    (e) => e.kind === "step" && e.step.status === "running",
  );

  if (runningIdx >= 0) {
    const entry = timeline[runningIdx];
    if (entry.kind === "step") {
      entry.step.status = "executed";
      entry.step.durationMs = entry.step.durationMs ?? 2_600;
      entry.step.note = "done";
    }
  }

  // Promote the first pending step to running.
  const pendingIdx = timeline.findIndex(
    (e) => e.kind === "step" && e.step.status === "pending",
  );
  if (pendingIdx >= 0) {
    const entry = timeline[pendingIdx];
    if (entry.kind === "step") {
      entry.step.status = "running";
      entry.step.note = "executing…";
    }
  }

  const next: Run = { ...run, timeline };

  if (isSettled(next)) {
    next.status = next.status === "running" ? "completed" : next.status;
    next.durationMs = next.durationMs ?? 12_400;
  }

  return next;
}

/** The id of the run that should animate (first one still running), or null. */
export function liveRunId(runs: Run[]): string | null {
  return runs.find((r) => r.status === "running")?.id ?? null;
}
