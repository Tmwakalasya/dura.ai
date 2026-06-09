import { LiveOverview } from "@/components/dashboard/LiveOverview";
import { Topbar } from "@/components/dashboard/Topbar";
import { RUNS } from "@/lib/mock-data";

export default function DashboardOverview() {
  return (
    <>
      <Topbar title="Overview" subtitle="Every durable run, exactly-once — last 24 hours" />

      <div className="mx-auto max-w-6xl px-6 py-6">
        <LiveOverview initialRuns={RUNS} />
      </div>
    </>
  );
}
