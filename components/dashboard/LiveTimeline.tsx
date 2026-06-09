"use client";

import { useEffect, useRef, useState } from "react";

import { TimelineView } from "./StepTimeline";
import { advance, isSettled } from "@/lib/live";
import type { Run } from "@/lib/types";

/** Run-detail timeline that advances a running run step-by-step. Seeded from the
 *  server-rendered run so the first paint matches SSR exactly; the animation
 *  only begins after mount. */
export function LiveTimeline({ run: initial }: { run: Run }) {
  const [run, setRun] = useState<Run>(initial);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Nothing to animate if the run is already finished.
    if (isSettled(initial)) return;

    timer.current = setInterval(() => {
      setRun((prev) => {
        if (isSettled(prev)) {
          if (timer.current) clearInterval(timer.current);
          return prev;
        }
        return advance(prev);
      });
    }, 2_600);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [initial]);

  return (
    <div>
      {run.status === "running" && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 font-mono text-[11px] text-sky-300">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          executing live
        </div>
      )}
      <TimelineView entries={run.timeline} />
    </div>
  );
}
