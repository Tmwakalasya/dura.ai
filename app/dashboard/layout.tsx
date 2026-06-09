import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* faint backdrop, dimmer than the marketing page so data reads clearly */}
      <div className="pointer-events-none fixed inset-0 bg-stars opacity-40" />
      <div
        className="pointer-events-none fixed left-1/2 top-[-20%] h-[460px] w-[760px] aurora opacity-30"
        style={{ transform: "translateX(-50%)" }}
      />

      <div className="relative z-10 flex">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
