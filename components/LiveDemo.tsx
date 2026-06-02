"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "pending" | "running" | "done" | "skipped" | "crash";

type Step = { id: string; name: string; note: string };

const STEPS: Step[] = [
  { id: "01", name: "search_flights", note: "240ms" },
  { id: "02", name: "charge_card", note: "idem:7f3a · $412.00" },
  { id: "03", name: "reserve_seat", note: "seat 14C" },
  { id: "04", name: "update_crm", note: "exactly-once" },
];

const DOT: Record<Status, string> = {
  pending: "bg-white/15",
  running: "bg-sky-400 animate-pulse",
  done: "bg-emerald-400",
  skipped: "bg-accent",
  crash: "bg-red-500",
};
const LABEL: Record<Status, { t: string; c: string }> = {
  pending: { t: "", c: "text-white/30" },
  running: { t: "RUN", c: "text-sky-400/90" },
  done: { t: "DONE", c: "text-emerald-400/90" },
  skipped: { t: "SKIP", c: "text-accent" },
  crash: { t: "CRASH", c: "text-red-400/90" },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "idle" | "running" | "crashed" | "recovered";

export function LiveDemo() {
  const [statuses, setStatuses] = useState<Status[]>(() => STEPS.map(() => "pending"));
  const [phase, setPhase] = useState<Phase>("idle");
  const [charges, setCharges] = useState(0);
  const [replays, setReplays] = useState(0);
  const runId = useRef(0);

  const set = (i: number, s: Status) =>
    setStatuses((prev) => prev.map((p, idx) => (idx === i ? s : p)));

  const reset = useCallback(() => {
    runId.current += 1;
    setStatuses(STEPS.map(() => "pending"));
    setCharges(0);
    setReplays(0);
    setPhase("idle");
  }, []);

  // The crash-and-resume choreography — mirrors what the real engine does.
  const play = useCallback(async () => {
    const myRun = ++runId.current;
    const alive = () => runId.current === myRun;

    setStatuses(STEPS.map(() => "pending"));
    setCharges(0);
    setReplays(0);
    setPhase("running");

    // First attempt: search, charge — then the process dies.
    set(0, "running");
    await sleep(650);
    if (!alive()) return;
    set(0, "done");

    set(1, "running");
    await sleep(650);
    if (!alive()) return;
    set(1, "done");
    setCharges(1); // card charged once, committed to the log

    await sleep(450);
    if (!alive()) return;
    set(1, "crash");
    setPhase("crashed");

    await sleep(1500); // hold on the crash so it lands
    if (!alive()) return;

    // Restart: replay the log. charge_card is already committed -> skipped.
    setReplays(1);
    setPhase("running");
    set(1, "skipped");
    await sleep(700);
    if (!alive()) return;

    set(2, "running");
    await sleep(650);
    if (!alive()) return;
    set(2, "done");

    set(3, "running");
    await sleep(650);
    if (!alive()) return;
    set(3, "done");

    setPhase("recovered");
  }, []);

  // Auto-play once on mount.
  useEffect(() => {
    play();
    return () => {
      runId.current += 1;
    };
  }, [play]);

  const committed = statuses.filter((s) => s === "done" || s === "skipped").length;

  return (
    <div
      className={`animate-fade-up rounded-2xl border bg-surface/80 backdrop-blur transition-all duration-700 ${
        phase === "recovered"
          ? "border-accent/40 shadow-[0_40px_140px_-30px_rgba(232,84,63,0.5)]"
          : "border-line shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]"
      }`}
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-xs text-white/40">dura · run a91c · book_trip()</span>
        <span className="ml-auto">
          <PhasePill phase={phase} />
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_280px]">
        {/* execution log */}
        <div className="divide-y divide-line p-2">
          {STEPS.map((s, i) => {
            const st = statuses[i];
            return (
              <div
                key={s.id}
                className={`flex items-center gap-4 px-4 py-3 transition-colors duration-300 ${
                  st === "running" ? "bg-white/[0.03]" : ""
                }`}
              >
                <span className="font-mono text-xs text-white/30">{s.id}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full transition-colors ${DOT[st]}`} />
                <span
                  className={`font-mono text-sm transition-colors ${
                    st === "pending" ? "text-white/30" : "text-white/85"
                  }`}
                >
                  {s.name}
                </span>
                <span className="ml-auto hidden font-mono text-xs text-white/40 sm:block">
                  {st === "skipped" ? "replayed · not re-run" : st === "pending" ? "" : s.note}
                </span>
                <span className={`w-12 text-right font-mono text-[10px] ${LABEL[st].c}`}>
                  {LABEL[st].t}
                </span>
              </div>
            );
          })}
        </div>

        {/* side panel */}
        <div className="border-t border-line p-5 md:border-l md:border-t-0">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-white/35">
            durable log
          </div>
          <div className="space-y-3 text-sm">
            <Row k="checkpoints" v={`${committed}`} />
            <Row
              k="card charges"
              v={`${charges}`}
              highlight={phase === "recovered" && charges === 1}
            />
            <Row k="replays" v={`${replays} (0 re-run)`} />
          </div>

          <div className="mt-5 rounded-lg border border-line bg-ink/60 p-3 font-mono text-[11px] leading-relaxed text-white/45">
            <span className="text-accent">@durable</span>
            <br />
            def book_trip(ctx):
            <br />
            &nbsp;&nbsp;ctx.step(charge_card)
            <br />
            &nbsp;&nbsp;ctx.step(reserve_seat)
          </div>

          <button
            onClick={() => (phase === "running" ? reset() : play())}
            className="mt-4 w-full rounded-lg border border-line bg-white/5 px-3 py-2 font-mono text-xs text-white/80 transition-colors hover:bg-white/10"
          >
            {phase === "running" ? "↻ reset" : "💥 crash & resume"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhasePill({ phase }: { phase: Phase }) {
  const map: Record<Phase, { t: string; cls: string }> = {
    idle: { t: "ready", cls: "border-white/15 bg-white/5 text-white/50" },
    running: { t: "running", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
    crashed: { t: "crashed", cls: "border-red-500/40 bg-red-500/10 text-red-400 animate-pulse" },
    recovered: { t: "recovered · exactly-once", cls: "border-accent/40 bg-accent/10 text-accent" },
  };
  const m = map[phase];
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${m.cls}`}>{m.t}</span>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{k}</span>
      <span
        className={`font-mono transition-colors ${highlight ? "text-emerald-400" : "text-white/80"}`}
      >
        {v}
      </span>
    </div>
  );
}
