import { RunsTable } from "@/components/dashboard/RunsTable";
import { Topbar } from "@/components/dashboard/Topbar";
import { RUNS } from "@/lib/mock-data";

export default function RunsPage() {
  return (
    <>
      <Topbar title="Runs" subtitle={`${RUNS.length} runs · all environments`} />
      <div className="mx-auto max-w-6xl px-6 py-6">
        <RunsTable runs={RUNS} />
      </div>
    </>
  );
}
