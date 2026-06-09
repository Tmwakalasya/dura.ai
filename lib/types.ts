// Data model for the dura Cloud dashboard.
//
// These types mirror the semantics of the real dura write-ahead log so that
// swapping mock data for a live API later is a drop-in change: a Run maps to a
// run_id, a Step maps to a row in the `steps` table, and the timeline is the
// ordered event stream a worker produced across one or more process lives.

/** The state of a single step, as recorded (or replayed) in the log. */
export type StepStatus =
  | "executed" // fn ran and the result was committed
  | "skipped" // replayed from the log on resume — fn was NOT called (exactly-once save)
  | "running" // currently executing
  | "failed" // fn raised
  | "rolled_back" // undo fired during a saga unwind
  | "pending"; // declared but not yet reached

/** The overall outcome of a run. */
export type RunStatus =
  | "running" // in progress right now
  | "completed" // finished clean, never crashed
  | "recovered" // crashed at least once, resumed, finished successfully
  | "failed" // a step failed and the run ended unsuccessfully
  | "compensated"; // a step failed; saga rolled completed steps back cleanly

/** One step event in a run's timeline. A step name can appear more than once
 *  (e.g. executed in one process life, then skipped after a resume). */
export interface Step {
  name: string;
  status: StepStatus;
  /** Milliseconds from the run's start to when this event occurred. */
  offsetMs: number;
  /** How long the step took, or null if it was skipped / still running. */
  durationMs: number | null;
  /** Which worker handled it (worker_id in the WAL). */
  worker: string;
  /** 1 on first execution; higher if a lease was stolen and retried. */
  attempt: number;
  /** The idempotency key shown for side-effecting steps. */
  idempotencyKey?: string;
  /** The committed JSON result (what gets returned on replay). */
  result?: unknown;
  /** Short human note shown inline ("replayed · not re-run", "no seats", …). */
  note?: string;
}

/** A point where the process died mid-run. */
export interface CrashMarker {
  /** The step that had committed just before the crash. */
  afterStep: string;
  offsetMs: number;
  /** What killed it: "SIGKILL", "OOM killed", "deploy restart", "pod evicted". */
  cause: string;
}

/** A point where a fresh process picked the run back up. */
export interface ResumeMarker {
  offsetMs: number;
  worker: string;
}

/** An ordered entry in the run's story. Drives the detail timeline. */
export type TimelineEntry =
  | { kind: "step"; step: Step }
  | { kind: "crash"; crash: CrashMarker }
  | { kind: "resume"; resume: ResumeMarker };

export interface Run {
  /** Full run id, e.g. "book_trip-a1b2c3d4e5f6". */
  id: string;
  /** The @durable function name. */
  fn: string;
  status: RunStatus;
  /** Epoch milliseconds when the run started. */
  startedAtMs: number;
  /** Total wall-clock duration across all process lives, or null if running. */
  durationMs: number | null;
  /** The ordered event stream. */
  timeline: TimelineEntry[];
  /** SQLite log path this run was committed to. */
  log: string;
  /** The worker that started the run. */
  worker: string;
  /** The inputs the run was called with (its idempotency basis). */
  args: Record<string, unknown>;
  /** Deployment environment. */
  env: "production" | "staging" | "development";
}
