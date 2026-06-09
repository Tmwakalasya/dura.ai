interface Props {
  title: string;
  subtitle?: string;
  /** Optional element rendered on the right (e.g. a back link or action). */
  right?: React.ReactNode;
}

export function Topbar({ title, subtitle, right }: Props) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/70 px-6 py-4 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-white/45">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {right}
        <div className="hidden items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulseline" />
          <span className="font-mono text-[11px] text-white/55">all systems live</span>
        </div>
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent/80 to-accent/40 ring-1 ring-white/10" />
      </div>
    </header>
  );
}
