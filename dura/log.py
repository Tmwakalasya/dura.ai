"""Write-ahead log backed by SQLite.

The log is the single source of truth for what a workflow has already
done. A step's result is committed here *before* the workflow moves on,
so a crash can never lose a completed step — on restart we read the log
and skip anything already recorded.

It also arbitrates *who* runs a step. Before executing, a worker must
`claim` the step: it writes a short-lived lease into the log under a
write lock. Only one worker can hold the claim, so two workers racing the
same step can't both execute it. A lease left behind by a dead worker
expires and can be stolen, so crash-and-resume still works.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from typing import Any

# Sentinel so we can distinguish "no record" from "recorded a None result".
MISSING = object()

# Claim outcomes returned by WAL.claim().
ACQUIRED = "acquired"  # this worker owns the step — execute it now
DONE = "done"          # already committed — read the cached result
HELD = "held"          # another live worker owns it — wait and retry


def _retry_on_locked(fn, attempts: int = 50, base: float = 0.01):
    """Run a write under contention, retrying on SQLite's transient BUSY/locked.

    Even with a busy_timeout set, concurrent writers can still see
    'database is locked' — the documented fix is to back off and retry rather
    than fail the operation.
    """
    for i in range(attempts):
        try:
            return fn()
        except sqlite3.OperationalError as exc:
            if "locked" not in str(exc) and "busy" not in str(exc):
                raise
            if i == attempts - 1:
                raise
            time.sleep(min(base * (2 ** i), 0.25))


class WAL:
    # How long a claim stays valid before another worker may steal it.
    LEASE_SECONDS = 30.0

    def __init__(self, path: str = "dura.db", worker_id: str | None = None) -> None:
        self.path = path
        # Identifies this process/worker so we can tell our claims from others'.
        self.worker_id = worker_id or f"{os.getpid()}-{uuid.uuid4().hex[:8]}"
        # check_same_thread=False keeps the demo simple; one connection per WAL.
        self._conn = sqlite3.connect(path, check_same_thread=False)
        # WAL journal mode + a busy timeout make concurrent connections safe:
        # readers don't block the writer, and competing writers wait their turn
        # instead of erroring out. Set busy_timeout FIRST so the journal_mode
        # switch (which briefly needs an exclusive lock) waits rather than
        # failing when another connection is opening at the same time.
        self._conn.execute("PRAGMA busy_timeout=5000")
        _retry_on_locked(lambda: self._conn.execute("PRAGMA journal_mode=WAL"))
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS steps (
                run_id      TEXT NOT NULL,
                step_name   TEXT NOT NULL,
                status      TEXT NOT NULL,
                result_json TEXT,
                worker_id   TEXT,
                lease_until REAL,
                ts          REAL NOT NULL,
                PRIMARY KEY (run_id, step_name)
            )
            """
        )
        self._migrate()
        self._conn.commit()

    def _migrate(self) -> None:
        """Add claim columns to logs created by an earlier schema."""
        cols = {r[1] for r in self._conn.execute("PRAGMA table_info(steps)")}
        if "worker_id" not in cols:
            self._conn.execute("ALTER TABLE steps ADD COLUMN worker_id TEXT")
        if "lease_until" not in cols:
            self._conn.execute("ALTER TABLE steps ADD COLUMN lease_until REAL")

    def get(self, run_id: str, step_name: str) -> Any:
        """Return the committed result for a step, or MISSING if not recorded."""
        row = self._conn.execute(
            "SELECT result_json FROM steps WHERE run_id = ? AND step_name = ? AND status = 'done'",
            (run_id, step_name),
        ).fetchone()
        if row is None:
            return MISSING
        return json.loads(row[0])

    def claim(self, run_id: str, step_name: str, lease: float | None = None) -> str:
        """Try to acquire the exclusive right to execute a step.

        Returns one of:
          ACQUIRED — this worker may run the step now (lease recorded).
          DONE     — already committed; read the cached result instead.
          HELD     — another live worker holds the claim; wait and retry.

        The whole check-and-write happens under an IMMEDIATE write lock, so
        two workers can never both come away with ACQUIRED for the same step.
        """
        lease = self.LEASE_SECONDS if lease is None else lease
        conn = self._conn

        def attempt() -> str:
            now = time.time()
            try:
                conn.execute("BEGIN IMMEDIATE")
                row = conn.execute(
                    "SELECT status, lease_until FROM steps WHERE run_id = ? AND step_name = ?",
                    (run_id, step_name),
                ).fetchone()

                if row is None:
                    conn.execute(
                        "INSERT INTO steps (run_id, step_name, status, worker_id, lease_until, ts) "
                        "VALUES (?, ?, 'running', ?, ?, ?)",
                        (run_id, step_name, self.worker_id, now + lease, now),
                    )
                    conn.execute("COMMIT")
                    return ACQUIRED

                status, lease_until = row
                if status == "done":
                    conn.execute("COMMIT")
                    return DONE

                # status == 'running': another worker is (or was) executing it.
                if lease_until is not None and now < lease_until:
                    conn.execute("COMMIT")
                    return HELD

                # The lease has expired — the holder is presumed dead. Steal it.
                conn.execute(
                    "UPDATE steps SET worker_id = ?, lease_until = ?, ts = ? "
                    "WHERE run_id = ? AND step_name = ?",
                    (self.worker_id, now + lease, now, run_id, step_name),
                )
                conn.execute("COMMIT")
                return ACQUIRED
            except Exception:
                if conn.in_transaction:
                    conn.execute("ROLLBACK")
                raise

        return _retry_on_locked(attempt)

    def put(self, run_id: str, step_name: str, result: Any) -> None:
        """Commit a completed step's result. Durable before the caller continues.

        Marks the step 'done' and clears the lease. Works whether or not a
        claim row already exists.

        Raises TypeError early (before touching the DB) if `result` is not
        JSON-serialisable — so the claim is never left in a stuck 'running'
        state with no result.
        """
        try:
            result_json = json.dumps(result)
        except (TypeError, ValueError) as exc:
            raise TypeError(
                f"dura: step '{step_name}' returned a non-JSON-serialisable value "
                f"({type(result).__name__}). Step results must be dicts, lists, "
                f"strings, numbers, bools, or None."
            ) from exc

        def attempt() -> None:
            self._conn.execute(
                "INSERT INTO steps (run_id, step_name, status, result_json, worker_id, lease_until, ts) "
                "VALUES (?, ?, 'done', ?, ?, NULL, ?) "
                "ON CONFLICT(run_id, step_name) DO UPDATE SET "
                "status = 'done', result_json = excluded.result_json, "
                "worker_id = excluded.worker_id, lease_until = NULL, ts = excluded.ts",
                (run_id, step_name, result_json, self.worker_id, time.time()),
            )
            self._conn.commit()

        _retry_on_locked(attempt)

    def steps(self, run_id: str) -> list[str]:
        """All committed step names for a run, in commit order."""
        rows = self._conn.execute(
            "SELECT step_name FROM steps WHERE run_id = ? AND status = 'done' ORDER BY ts",
            (run_id,),
        ).fetchall()
        return [r[0] for r in rows]

    def close(self) -> None:
        try:
            self._conn.close()
        except Exception:
            pass
