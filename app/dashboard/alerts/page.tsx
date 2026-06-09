import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { Topbar } from "@/components/dashboard/Topbar";

export default function AlertsPage() {
  return (
    <>
      <Topbar title="Alerts" subtitle="Failure and latency notifications" />
      <ComingSoon
        title="Alerting"
        blurb="Get paged when a run fails, a step exceeds its expected duration, or a rollback fires. Route to Slack, PagerDuty, or webhook — so an ops team is comfortable putting agents in production."
      />
    </>
  );
}
