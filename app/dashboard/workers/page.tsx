import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { Topbar } from "@/components/dashboard/Topbar";

export default function WorkersPage() {
  return (
    <>
      <Topbar title="Workers" subtitle="Live lease holders and claim activity" />
      <ComingSoon
        title="Worker fleet"
        blurb="See every worker holding a lease, which steps they own, and where a stale lease was stolen for crash-resume. Real-time claim activity across your fleet."
      />
    </>
  );
}
