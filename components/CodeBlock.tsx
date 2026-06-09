"use client";

import { useEffect, useState } from "react";

const C = {
  dec: "text-accent",
  kw: "text-sky-400",
  fn: "text-violet-300",
  str: "text-emerald-300",
  com: "text-white/30",
  mut: "text-white/55",
};

const STEPS = [
  { name: "charge_card", note: "idem:7f3a · $412.00" },
  { name: "book_flight",  note: "seat 14C · fl_982"   },
  { name: "update_crm",   note: "exactly-once"         },
];

// How long each step stays "committed" before advancing (ms)
const STEP_HOLD = 900;
// Pause after all steps are done before resetting (ms)
const CYCLE_PAUSE = 1800;

export function CodeBlock() {
  // active = index of the currently lit step (-1 = idle / between cycles)
  const [active, setActive] = useState(-1);
  // committed = steps that have ticked green this cycle
  const [committed, setCommitted] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function cycle() {
      while (!cancelled) {
        // idle pause before starting
        await sleep(600);
        if (cancelled) break;

        for (let i = 0; i < STEPS.length; i++) {
          if (cancelled) break;
          setActive(i);
          await sleep(STEP_HOLD);
          if (cancelled) break;
          setCommitted((prev) => [...prev, i]);
        }

        setActive(-1);
        await sleep(CYCLE_PAUSE);
        if (cancelled) break;

        // reset for next cycle
        setCommitted([]);
      }
    }

    cycle();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink/80 backdrop-blur">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-xs text-white/40">book_trip.py</span>
      </div>

      {/* code */}
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7">
        <code>
          <span className={C.kw}>from</span> <span className={C.mut}>dura</span>{" "}
          <span className={C.kw}>import</span> <span className={C.mut}>durable</span>
          {"\n\n"}
          <span className={C.dec}>@durable</span>
          {"\n"}
          <span className={C.kw}>def</span> <span className={C.fn}>book_trip</span>
          <span className={C.mut}>(ctx, dest, amount):</span>
          {"\n"}
          {"    "}
          <span className={C.com}># runs once, ever — even across a crash</span>
          {"\n"}
          {STEPS.map((s, i) => (
            <StepLine key={s.name} step={s} index={i} active={active} committed={committed} />
          ))}
          {"    "}
          <span className={C.kw}>return</span>{" "}
          <span className={C.mut}>booking</span>
          <span className="inline-block w-[2px] h-[1em] bg-white/60 animate-cursor-blink align-[-2px] ml-0.5" />
        </code>
      </pre>

      {/* live execution trail */}
      <div className="border-t border-line px-5 py-3 min-h-[44px]">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {STEPS.map((s, i) => {
            const isDone = committed.includes(i);
            const isRunning = active === i;
            return (
              <span
                key={s.name}
                className={`font-mono text-[11px] transition-all duration-300 ${
                  isDone
                    ? "text-emerald-400"
                    : isRunning
                    ? "text-sky-300 animate-pulse"
                    : "text-white/20"
                }`}
              >
                {isDone ? "✓" : isRunning ? "▸" : "·"} {s.name}
                {isDone && (
                  <span className="ml-1.5 text-white/30 animate-step-in">{s.note}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepLine({
  step,
  index,
  active,
  committed,
}: {
  step: { name: string };
  index: number;
  active: number;
  committed: number[];
}) {
  const isActive = active === index;
  const isDone = committed.includes(index);

  return (
    <span
      className={`block transition-colors duration-200 ${
        isActive ? "bg-white/[0.04] -mx-5 px-5" : ""
      }`}
    >
      {"    "}ctx.
      <span className={C.fn}>step</span>(
      <span className={`transition-colors duration-200 ${isDone ? "text-emerald-300" : C.str}`}>
        &quot;{step.name}&quot;
      </span>
      <span className={C.mut}>, lambda: {step.name}())</span>
      {"\n"}
    </span>
  );
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
