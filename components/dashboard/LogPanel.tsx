import {
  committedSteps,
  crashCount,
  exactlyOnceSaves,
  formatDuration,
  rollbackCount,
} from "@/lib/mock-data";
import type { Run } from "@/lib/types";

/** Right-hand summary for a run: the durable-log facts that make the run
 *  trustworthy at a glance, plus its inputs and storage location. */
export function LogPanel({ run }: { run: Run }) {
  const committed = committedSteps(run).filter(
    (s) => s.status === "executed" || s.status === "skipped",
  ).length;
  const saves = exactlyOnceSaves(run);
  const crashes = crashCount(run);
  const rollbacks = rollbackCount(run);

  return (
    <div className="space-y-4">
      {/* durable log */}
      <div className="rounded-2xl border border-line bg-surface/50 p-5 backdrop-blur">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-white/35">
          durable log
        </div>
        <div className="space-y-3">
          <Row k="checkpoints" v={String(committed)} />
          <Row k="exactly-once saves" v={saves > 0 ? `↺ ${saves}` : "0"} highlight={saves > 0} />
          <Row k="crashes survived" v={String(crashes)} highlight={crashes > 0} />
          <Row k="rollbacks fired" v={String(rollbacks)} amber={rollbacks > 0} />
          <Row k="duration" v={formatDuration(run.durationMs)} />
        </div>
      </div>

      {/* storage */}
      <div className="rounded-2xl border border-line bg-surface/50 p-5 backdrop-blur">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/35">
          storage
        </div>
        <div className="space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/40">log</span>
            <span className="truncate text-white/70">{run.log}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/40">worker</span>
            <span className="text-white/70">{run.worker}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/40">env</span>
            <span className="text-white/70">{run.env}</span>
          </div>
        </div>
      </div>

      {/* inputs */}
      <div className="rounded-2xl border border-line bg-surface/50 p-5 backdrop-blur">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/35">
          inputs · idempotency basis
        </div>
        <pre className="overflow-x-auto rounded-lg border border-line bg-ink/70 p-3 font-mono text-[11px] leading-relaxed text-white/65">
          {JSON.stringify(run.args, null, 2)}
        </pre>
      </div>

      {/* the decorator */}
      <div className="rounded-2xl border border-line bg-surface/50 p-5 backdrop-blur">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-white/35">
          source
        </div>
        <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-white/55">
          <span className="text-accent">@durable</span>
          {"\n"}
          <span className="text-sky-400">def</span>{" "}
          <span className="text-violet-300">{run.fn}</span>(ctx, …):
        </pre>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  highlight,
  amber,
}: {
  k: string;
  v: string;
  highlight?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/45">{k}</span>
      <span
        className={`font-mono ${
          highlight ? "text-accent" : amber ? "text-amber-300" : "text-white/80"
        }`}
      >
        {v}
      </span>
    </div>
  );
}
