// Mock dataset for the dura Cloud dashboard.
//
// Anchored to a fixed NOW so server-rendered relative times ("2m ago") are
// deterministic and don't cause hydration mismatches. When we wire real data,
// this whole module is replaced by a fetch from the dura API — the shapes match
// the WAL, so the components don't change.

import type { Run, Step, TimelineEntry } from "./types";

/** Fixed "current time" the whole dashboard renders against. */
export const NOW = 1_749_470_400_000; // 2026-06-09T12:00:00Z

const MIN = 60_000;
const SEC = 1_000;

// ── small authoring helpers ────────────────────────────────────────────────

function step(
  name: string,
  status: Step["status"],
  offsetMs: number,
  durationMs: number | null,
  extra: Partial<Step> = {},
): TimelineEntry {
  return {
    kind: "step",
    step: { name, status, offsetMs, durationMs, worker: extra.worker ?? "w-7f3a", attempt: 1, ...extra },
  };
}

function crash(afterStep: string, offsetMs: number, cause: string): TimelineEntry {
  return { kind: "crash", crash: { afterStep, offsetMs, cause } };
}

function resume(offsetMs: number, worker: string): TimelineEntry {
  return { kind: "resume", resume: { offsetMs, worker } };
}

// ── the runs ────────────────────────────────────────────────────────────────

export const RUNS: Run[] = [
  // 1 — the hero: crashed after the charge, resumed, charge skipped exactly-once.
  {
    id: "book_trip-9d8c7b6a5e4f",
    fn: "book_trip",
    status: "recovered",
    startedAtMs: NOW - 6 * MIN,
    durationMs: 3_120,
    log: "orders/order_4471.db",
    worker: "w-7f3a",
    env: "production",
    args: { dest: "Tokyo", amount: 412 },
    timeline: [
      step("search_flights", "executed", 0, 240, { note: "3 results" }),
      step("charge_card", "executed", 260, 610, {
        idempotencyKey: "idem:7f3a",
        result: { id: "ch_1", amount: 412, currency: "usd" },
        note: "$412.00 captured",
      }),
      crash("charge_card", 900, "OOM killed"),
      resume(2_400, "w-b2e9"),
      step("charge_card", "skipped", 2_400, null, {
        worker: "w-b2e9",
        idempotencyKey: "idem:7f3a",
        result: { id: "ch_1", amount: 412, currency: "usd" },
        note: "replayed · not re-run",
      }),
      step("reserve_seat", "executed", 2_460, 480, { worker: "w-b2e9", result: { seat: "14C" } }),
      step("update_crm", "executed", 2_960, 160, { worker: "w-b2e9", result: { ok: true } }),
    ],
  },

  // 2 — clean completed booking, no crash.
  {
    id: "book_trip-a1b2c3d4e5f6",
    fn: "book_trip",
    status: "completed",
    startedAtMs: NOW - 2 * MIN,
    durationMs: 1_840,
    log: "orders/order_4472.db",
    worker: "w-7f3a",
    env: "production",
    args: { dest: "Lisbon", amount: 268 },
    timeline: [
      step("search_flights", "executed", 0, 240, { note: "5 results" }),
      step("charge_card", "executed", 250, 610, {
        idempotencyKey: "idem:c4d1",
        result: { id: "ch_2", amount: 268 },
        note: "$268.00 captured",
      }),
      step("reserve_seat", "executed", 870, 480, { result: { seat: "8A" } }),
      step("update_crm", "executed", 1_360, 160, { result: { ok: true } }),
    ],
  },

  // 3 — currently running research agent.
  {
    id: "research_agent-3f2e1d0c9b8a",
    fn: "research_agent",
    status: "running",
    startedAtMs: NOW - 28 * SEC,
    durationMs: null,
    log: "research_durable_execution.db",
    worker: "w-11a4",
    env: "production",
    args: { topic: "durable execution for AI agents", queries: 3 },
    timeline: [
      step("search_1", "executed", 0, 4_200, {
        worker: "w-11a4",
        result: { query: "what is durable execution", summary: "…" },
        note: "web + summarise",
      }),
      step("search_2", "executed", 4_300, 3_900, {
        worker: "w-11a4",
        result: { query: "durable execution use cases", summary: "…" },
        note: "web + summarise",
      }),
      step("search_3", "running", 8_300, null, { worker: "w-11a4", note: "calling LLM…" }),
      step("write_report", "pending", 0, null),
    ],
  },

  // 4 — saga rollback: charge ran, booking failed, charge refunded cleanly.
  {
    id: "book_trip-7c6b5a4d3e2f",
    fn: "book_trip",
    status: "compensated",
    startedAtMs: NOW - 11 * MIN,
    durationMs: 1_290,
    log: "orders/order_4468.db",
    worker: "w-7f3a",
    env: "production",
    args: { dest: "Aspen", amount: 980 },
    timeline: [
      step("charge_card", "executed", 0, 600, {
        idempotencyKey: "idem:9a2b",
        result: { id: "ch_3", amount: 980 },
        note: "$980.00 captured",
      }),
      step("reserve_seat", "failed", 620, 410, { note: "no seats available" }),
      step("charge_card", "rolled_back", 1_040, 250, {
        note: "undo → refunded $980.00",
        result: { refund: "re_3", amount: 980 },
      }),
    ],
  },

  // 5 — completed Stripe checkout.
  {
    id: "checkout-2b3c4d5e6f70",
    fn: "checkout",
    status: "completed",
    startedAtMs: NOW - 19 * MIN,
    durationMs: 2_010,
    log: "orders/order_4459.db",
    worker: "w-7f3a",
    env: "production",
    args: { customer_id: "cus_abc", amount_cents: 41200, order_id: "order_4459" },
    timeline: [
      step("charge", "executed", 0, 720, {
        idempotencyKey: "charge-order_4459",
        result: { id: "pi_88", amount: 41200 },
        note: "$412.00 captured",
      }),
      step("fulfil", "executed", 740, 900, { result: { shipment: "shp_21" } }),
      step("receipt", "executed", 1_660, 350, { result: { email: "sent" } }),
    ],
  },

  // 6 — another recovery: research agent crashed mid-search, resumed.
  {
    id: "research_agent-5a6b7c8d9e0f",
    fn: "research_agent",
    status: "recovered",
    startedAtMs: NOW - 41 * MIN,
    durationMs: 16_400,
    log: "research_vector_databases.db",
    worker: "w-9c3d",
    env: "staging",
    args: { topic: "vector databases", queries: 3 },
    timeline: [
      step("search_1", "executed", 0, 4_100, { worker: "w-9c3d", note: "web + summarise" }),
      crash("search_1", 4_200, "deploy restart"),
      resume(9_000, "w-4f8e"),
      step("search_1", "skipped", 9_000, null, { worker: "w-4f8e", note: "replayed · not re-run" }),
      step("search_2", "executed", 9_100, 3_800, { worker: "w-4f8e", note: "web + summarise" }),
      step("search_3", "executed", 12_950, 2_900, { worker: "w-4f8e", note: "web + summarise" }),
      step("write_report", "executed", 15_900, 460, { worker: "w-4f8e", result: { path: "report.md" } }),
    ],
  },

  // 7 — hard failure: a step raised with no compensating action registered.
  {
    id: "sync_inventory-8e9f0a1b2c3d",
    fn: "sync_inventory",
    status: "failed",
    startedAtMs: NOW - 53 * MIN,
    durationMs: 880,
    log: "jobs/sync.db",
    worker: "w-2d6f",
    env: "production",
    args: { warehouse: "us-east", sku_count: 1240 },
    timeline: [
      step("fetch_catalog", "executed", 0, 420, { worker: "w-2d6f", result: { skus: 1240 } }),
      step("push_updates", "failed", 440, 440, {
        worker: "w-2d6f",
        note: "upstream 503 — no undo registered",
      }),
    ],
  },

  // 8 — long completed run, many steps (shows density).
  {
    id: "onboard_user-1f2e3d4c5b6a",
    fn: "onboard_user",
    status: "completed",
    startedAtMs: NOW - 72 * MIN,
    durationMs: 4_350,
    log: "jobs/onboarding.db",
    worker: "w-7f3a",
    env: "production",
    args: { user_id: "u_5582", plan: "pro" },
    timeline: [
      step("create_account", "executed", 0, 380, { result: { id: "u_5582" } }),
      step("charge_subscription", "executed", 400, 690, {
        idempotencyKey: "idem:5582",
        result: { id: "sub_9", amount: 2000 },
        note: "$20.00 / mo",
      }),
      step("provision_workspace", "executed", 1_110, 1_200, { result: { ws: "ws_71" } }),
      step("seed_demo_data", "executed", 2_330, 820, { result: { rows: 48 } }),
      step("send_welcome", "executed", 3_170, 410, { result: { email: "sent" } }),
      step("notify_slack", "executed", 3_600, 220, { result: { ok: true } }),
    ],
  },
];

// ── accessors & derived metrics ──────────────────────────────────────────────

export function getRun(id: string): Run | undefined {
  return RUNS.find((r) => r.id === id);
}

/** Canonical committed steps for a run: one entry per step name, final state. */
export function committedSteps(run: Run): Step[] {
  const order: string[] = [];
  const byName = new Map<string, Step>();
  for (const e of run.timeline) {
    if (e.kind !== "step") continue;
    if (!byName.has(e.step.name)) order.push(e.step.name);
    // Prefer the most "settled" event as the canonical one. Skipped/executed
    // both mean committed; later events win so a resume-skip shows as skip.
    byName.set(e.step.name, e.step);
  }
  return order.map((n) => byName.get(n)!);
}

/** Number of skipped step-events = side effects prevented from re-running. */
export function exactlyOnceSaves(run: Run): number {
  return run.timeline.filter((e) => e.kind === "step" && e.step.status === "skipped").length;
}

export function crashCount(run: Run): number {
  return run.timeline.filter((e) => e.kind === "crash").length;
}

export function rollbackCount(run: Run): number {
  return run.timeline.filter((e) => e.kind === "step" && e.step.status === "rolled_back").length;
}

/** Steps a run successfully committed (executed or skipped), for "3/4" labels. */
export function stepProgress(run: Run): { done: number; total: number } {
  const steps = committedSteps(run);
  const declared = new Set(steps.map((s) => s.name));
  // also count pending steps that haven't run yet
  for (const e of run.timeline) if (e.kind === "step") declared.add(e.step.name);
  const done = steps.filter((s) => s.status === "executed" || s.status === "skipped").length;
  return { done, total: declared.size };
}

export interface Stats {
  total: number;
  running: number;
  recovered: number;
  failed: number;
  exactlyOnceSaves: number;
  rollbacks: number;
  successRate: number; // 0..100, counts completed + recovered + compensated as "handled"
}

export function computeStats(runs: Run[] = RUNS): Stats {
  const total = runs.length;
  const running = runs.filter((r) => r.status === "running").length;
  const recovered = runs.filter((r) => r.status === "recovered").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const handled = runs.filter(
    (r) => r.status === "completed" || r.status === "recovered" || r.status === "compensated",
  ).length;
  const finished = total - running;
  const exactlyOnce = runs.reduce((n, r) => n + exactlyOnceSaves(r), 0);
  const rollbacks = runs.reduce((n, r) => n + rollbackCount(r), 0);
  return {
    total,
    running,
    recovered,
    failed,
    exactlyOnceSaves: exactlyOnce,
    rollbacks,
    successRate: finished === 0 ? 100 : Math.round((handled / finished) * 100),
  };
}

// ── formatting helpers ───────────────────────────────────────────────────────

export function relativeTime(epochMs: number, now: number = NOW): string {
  const diff = Math.max(0, now - epochMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
}

/** Short form of a run id: drop the function prefix, keep the hash. */
export function shortId(id: string): string {
  const dash = id.lastIndexOf("-");
  return dash === -1 ? id : id.slice(dash + 1);
}
