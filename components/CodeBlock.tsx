// Static, hand-tokenized code sample — no runtime highlighter needed.

const C = {
  dec: "text-accent",
  kw: "text-sky-400",
  fn: "text-violet-300",
  str: "text-emerald-300",
  com: "text-white/30",
  mut: "text-white/55",
};

export function CodeBlock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink/80 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="h-3 w-3 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-xs text-white/40">book_trip.py</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7">
        <code>
          <span className={C.kw}>from</span> <span className={C.mut}>dura</span>{" "}
          <span className={C.kw}>import</span> <span className={C.mut}>durable</span>
          {"\n\n"}
          <span className={C.dec}>@durable</span>
          {"\n"}
          <span className={C.kw}>def</span> <span className={C.fn}>book_trip</span>
          <span className={C.mut}>(ctx, dest, amount):</span>
          {"\n"}
          {"    "}
          <span className={C.com}># runs once, ever — even across a crash</span>
          {"\n"}
          {"    "}ctx.<span className={C.fn}>step</span>(<span className={C.str}>"charge_card"</span>
          <span className={C.mut}>, lambda: charge(amount))</span>
          {"\n"}
          {"    "}flight = ctx.<span className={C.fn}>step</span>(
          <span className={C.str}>"book_flight"</span>
          <span className={C.mut}>, lambda: book(dest))</span>
          {"\n"}
          {"    "}ctx.<span className={C.fn}>step</span>(<span className={C.str}>"update_crm"</span>
          <span className={C.mut}>, lambda: crm(flight))</span>
        </code>
      </pre>
    </div>
  );
}
