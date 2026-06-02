import { DurableLog } from "@/components/DurableLog";

const NAV = ["Docs", "Pricing", "Blog"];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-stars" />
      <div className="pointer-events-none absolute inset-0 grid-faint" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60vh] fog" />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent animate-pulseline" />
          <span className="font-mono text-[15px] font-medium tracking-tight">deadcheck</span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a key={item} href="#" className="text-sm text-white/55 transition-colors hover:text-white">
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="#" className="hidden text-sm text-white/70 hover:text-white sm:block">
            Sign in
          </a>
          <a
            href="#"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink transition-transform hover:scale-[1.03]"
          >
            Get started
          </a>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-20 text-center md:pt-28">
        <div className="animate-fade-up">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-3 py-1 font-mono text-xs text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            durable execution for AI agents
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Agents crash.
            <br />
            Your state shouldn&apos;t.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/55 md:text-lg">
            Wrap any agent in one decorator. deadcheck makes every action atomic,
            exactly-once, and rollback-able — so a crash mid-task never means a
            double-charge or corrupted state.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <a
              href="#"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition-transform hover:scale-[1.03]"
            >
              Get started
            </a>
            <a
              href="#how"
              className="rounded-full border border-line bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
          <div className="mt-5 font-mono text-xs text-white/35">$ pip install deadcheck</div>
        </div>
      </section>

      {/* product mockup */}
      <section id="how" className="relative z-10 mx-auto mt-20 max-w-5xl px-6 pb-10 md:mt-28">
        <DurableLog />
      </section>

      {/* the contrast */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <p className="mb-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-white/40">
          the same crash, two outcomes
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface/60 p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
              <span className="h-2 w-2 rounded-full bg-red-500/80" /> Without deadcheck
            </div>
            <ul className="space-y-2.5 font-mono text-sm text-white/50">
              <li>→ charge_card() ✓</li>
              <li className="text-red-400/80">✕ process killed</li>
              <li>→ retry from scratch</li>
              <li className="text-red-400/80">→ charge_card() ✓ again — double charge</li>
              <li>→ booking never recorded — orphaned state</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
              <span className="h-2 w-2 rounded-full bg-accent" /> With deadcheck
            </div>
            <ul className="space-y-2.5 font-mono text-sm text-white/70">
              <li>→ charge_card() ✓ — checkpointed</li>
              <li className="text-white/40">✕ process killed</li>
              <li>→ resume from durable log</li>
              <li className="text-emerald-400/80">→ charge skipped (exactly-once)</li>
              <li className="text-emerald-400/80">→ booking fails → auto-refund (saga)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-ink p-7">
              <div className="mb-3 font-mono text-xs text-accent">{f.tag}</div>
              <h3 className="mb-2 text-lg font-medium tracking-tight">{f.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-28 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Ship agents that survive production.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/55">
          78% of teams have an agent pilot. 14% scale it. The gap is reliability.
          Close it with one import.
        </p>
        <a
          href="#"
          className="mt-8 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition-transform hover:scale-[1.03]"
        >
          Get started free
        </a>
      </section>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-white/35">
          <span className="font-mono">deadcheck</span>
          <span>© {new Date().getFullYear()} — built for agents that don&apos;t die quietly</span>
        </div>
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    tag: "01 / atomic",
    title: "Exactly-once actions",
    body: "Idempotency keys on every tool call. Replays never re-run a completed side-effect — no double-charges, no duplicate emails.",
  },
  {
    tag: "02 / durable",
    title: "Crash-proof resume",
    body: "Each step is checkpointed to an append-only log. Kill the process mid-task; on restart it picks up exactly where it died.",
  },
  {
    tag: "03 / reversible",
    title: "Saga rollback",
    body: "Register compensating actions. When a multi-step task fails halfway, deadcheck unwinds completed steps to leave clean state.",
  },
];
