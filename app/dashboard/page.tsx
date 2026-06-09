import { StatCard } from "@/components/dashboard/StatCard";
import { RunsTable } from "@/components/dashboard/RunsTable";
import { Topbar } from "@/components/dashboard/Topbar";
import { RUNS, computeStats } from "@/lib/mock-data";

export default function DashboardOverview() {
  const stats = computeStats(RUNS);

  return (
    <>
      <Topbar title="Overview" subtitle="Every durable run, exactly-once — last 24 hours" />

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* stat row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total runs" value={stats.total} hint="last 24h" />
          <StatCard
            label="Active now"
            value={stats.running}
            hint="executing"
            accent="text-sky-300"
            live={stats.running > 0}
          />
          <StatCard
            label="Exactly-once saves"
            value={stats.exactlyOnceSaves}
            hint="side effects prevented from re-running"
            accent="text-accent"
          />
          <StatCard
            label="Success rate"
            value={`${stats.successRate}%`}
            hint={`${stats.recovered} recovered · ${stats.failed} failed`}
            accent="text-emerald-400"
          />
        </div>

        {/* highlight banner */}
        {stats.recovered > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-5 py-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm text-accent">
              ↺
            </span>
            <p className="text-sm text-white/70">
              <span className="font-medium text-white">{stats.recovered} runs</span> crashed and
              resumed cleanly this period — every committed step was replayed from the log instead of
              re-executed. No double-charges, no orphaned state.
            </p>
          </div>
        )}

        {/* runs */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/80">Recent runs</h2>
            <span className="font-mono text-[11px] text-white/35">
              auto-refreshing · live
            </span>
          </div>
          <RunsTable runs={RUNS} />
        </div>
      </div>
    </>
  );
}
