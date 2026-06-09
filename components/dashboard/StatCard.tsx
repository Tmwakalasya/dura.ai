interface Props {
  label: string;
  value: string | number;
  /** Small caption under the value. */
  hint?: string;
  /** Tailwind text colour for the value (defaults to white). */
  accent?: string;
  /** Show a live pulsing dot (for "running" style metrics). */
  live?: boolean;
}

export function StatCard({ label, value, hint, accent = "text-white", live }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur transition-colors hover:border-white/15">
      <div className="flex items-center gap-2">
        {live && <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />}
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${accent}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-white/40">{hint}</div>}
    </div>
  );
}
