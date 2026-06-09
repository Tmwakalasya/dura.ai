export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 px-6 py-20 text-center backdrop-blur">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/[0.03] font-mono text-white/40">
          ◷
        </span>
        <h2 className="text-lg font-medium text-white/85">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-white/45">{blurb}</p>
        <span className="mt-5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
          shipping by Off Season II
        </span>
      </div>
    </div>
  );
}
