// The hero product mockup — a floating "durable log" panel echoing the
// nebula/spawnlabs app-window aesthetic, but for agent execution state.

const STEPS = [
  { id: "01", name: "search_flights", status: "done", note: "committed · 240ms" },
  { id: "02", name: "charge_card", status: "done", note: "committed · idem:7f3a · $412.00" },
  { id: "03", name: "reserve_seat", status: "crash", note: "process killed — pod evicted" },
  { id: "04", name: "resume()", status: "resume", note: "replayed from log · charge skipped" },
  { id: "05", name: "update_crm", status: "running", note: "exactly-once · in flight" },
];

const STATUS: Record<string, { dot: string; label: string; text: string }> = {
  done: { dot: "bg-emerald-400", label: "DONE", text: "text-emerald-400/90" },
  crash: { dot: "bg-red-500", label: "CRASH", text: "text-red-400/90" },
  resume: { dot: "bg-accent", label: "RESUME", text: "text-accent" },
  running: { dot: "bg-sky-400 animate-pulse", label: "RUN", text: "text-sky-400/90" },
};

export function DurableLog() {
  return (
    <div className="animate-fade-up rounded-2xl border border-line bg-surface/80 shadow-[0_40px_120px_-30px_rgba(232,84,63,0.25)] backdrop-blur">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-xs text-white/40">
          dura · run a91c · book_trip()
        </span>
        <span className="ml-auto rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
          recovered
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_280px]">
        {/* execution log */}
        <div className="divide-y divide-line p-2">
          {STEPS.map((s) => {
            const st = STATUS[s.status];
            return (
              <div key={s.id} className="flex items-center gap-4 px-4 py-3">
                <span className="font-mono text-xs text-white/30">{s.id}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                <span className="font-mono text-sm text-white/85">{s.name}</span>
                <span className="ml-auto hidden font-mono text-xs text-white/40 sm:block">
                  {s.note}
                </span>
                <span className={`font-mono text-[10px] ${st.text}`}>{st.label}</span>
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
            <Row k="checkpoints" v="5" />
            <Row k="side-effects" v="2 committed" />
            <Row k="replays" v="1 (0 re-run)" />
            <Row k="compensations" v="armed" />
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
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40">{k}</span>
      <span className="font-mono text-white/80">{v}</span>
    </div>
  );
}
