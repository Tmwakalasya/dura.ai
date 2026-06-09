// Single source of truth for status → colour/label. Every pill, dot, and
// timeline node reads from here so the visual language stays consistent.
//
// NOTE: these class strings are full literals so Tailwind's content scanner
// (which includes ./lib/**) picks them up at build time.

import type { RunStatus, StepStatus } from "./types";

export interface StatusStyle {
  label: string;
  /** Short uppercase tag used in dense rows. */
  short: string;
  /** Background colour of the status dot. */
  dot: string;
  /** Text colour for the label. */
  text: string;
  /** Border colour for pills. */
  border: string;
  /** Subtle fill for pills. */
  bg: string;
}

export const RUN_STATUS: Record<RunStatus, StatusStyle> = {
  completed: {
    label: "completed",
    short: "OK",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    border: "border-emerald-400/30",
    bg: "bg-emerald-400/10",
  },
  recovered: {
    label: "recovered",
    short: "RESUMED",
    dot: "bg-accent",
    text: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/10",
  },
  running: {
    label: "running",
    short: "RUN",
    dot: "bg-sky-400",
    text: "text-sky-300",
    border: "border-sky-400/30",
    bg: "bg-sky-400/10",
  },
  failed: {
    label: "failed",
    short: "FAIL",
    dot: "bg-red-500",
    text: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
  },
  compensated: {
    label: "compensated",
    short: "ROLLED BACK",
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
  },
};

export const STEP_STATUS: Record<StepStatus, StatusStyle> = {
  executed: {
    label: "executed",
    short: "DONE",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    border: "border-emerald-400/30",
    bg: "bg-emerald-400/10",
  },
  skipped: {
    label: "skipped · replayed",
    short: "SKIP",
    dot: "bg-accent",
    text: "text-accent",
    border: "border-accent/30",
    bg: "bg-accent/10",
  },
  running: {
    label: "running",
    short: "RUN",
    dot: "bg-sky-400",
    text: "text-sky-300",
    border: "border-sky-400/30",
    bg: "bg-sky-400/10",
  },
  failed: {
    label: "failed",
    short: "FAIL",
    dot: "bg-red-500",
    text: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/10",
  },
  rolled_back: {
    label: "rolled back",
    short: "UNDO",
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
  },
  pending: {
    label: "pending",
    short: "",
    dot: "bg-white/15",
    text: "text-white/30",
    border: "border-line",
    bg: "bg-white/5",
  },
};
