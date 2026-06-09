import { RUN_STATUS, STEP_STATUS } from "@/lib/status";
import type { RunStatus, StepStatus } from "@/lib/types";

type Props =
  | { kind: "run"; status: RunStatus; pulse?: boolean }
  | { kind: "step"; status: StepStatus; pulse?: boolean };

export function StatusPill(props: Props) {
  const style = props.kind === "run" ? RUN_STATUS[props.status] : STEP_STATUS[props.status];
  const isLive = props.status === "running";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${style.border} ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${isLive ? "animate-pulse" : ""}`} />
      {style.label}
    </span>
  );
}
