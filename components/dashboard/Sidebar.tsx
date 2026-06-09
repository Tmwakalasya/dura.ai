"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: GridIcon },
  { label: "Runs", href: "/dashboard/runs", icon: ListIcon },
  { label: "Workers", href: "/dashboard/workers", icon: CpuIcon },
  { label: "Logs", href: "/dashboard/logs", icon: DbIcon },
  { label: "Alerts", href: "/dashboard/alerts", icon: BellIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-ink/40 backdrop-blur md:flex">
      {/* brand */}
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent animate-pulseline" />
        <span className="font-mono text-[15px] font-medium tracking-tight">dura</span>
        <span className="ml-1 rounded-full border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/40">
          cloud
        </span>
      </Link>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-white/55 hover:bg-white/[0.03] hover:text-white/90"
              }`}
            >
              <Icon className={active ? "text-accent" : "text-white/40"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* environment switcher (static for now) */}
      <div className="border-t border-line p-3">
        <button className="flex w-full items-center justify-between rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05]">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            production
          </span>
          <span className="text-white/30">⌄</span>
        </button>
      </div>
    </aside>
  );
}

// ── inline icons (no dependency) ─────────────────────────────────────────────

function GridIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ListIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.3" fill="currentColor" />
    </svg>
  );
}

function CpuIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DbIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 5.5v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 11.5v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
