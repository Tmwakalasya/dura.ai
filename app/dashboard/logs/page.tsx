import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { Topbar } from "@/components/dashboard/Topbar";

export default function LogsPage() {
  return (
    <>
      <Topbar title="Logs" subtitle="Managed write-ahead log storage" />
      <ComingSoon
        title="Hosted log storage"
        blurb="Replace the local SQLite file with a replicated managed log. Browse raw step commits, export, and retain history without babysitting database files on your own servers."
      />
    </>
  );
}
