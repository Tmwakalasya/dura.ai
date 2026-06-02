"""Write-ahead log backed by SQLite.

The log is the single source of truth for what a workflow has already
done. A step's result is committed here *before* the workflow moves on,
so a crash can never lose a completed step — on restart we read the log
and skip anything already recorded.
"""

from __future__ import annotations

import json
import sqlite3
import time
from typing import Any

# Sentinel so we can distinguish "no record" from "recorded a None result".
MISSING = object()


class WAL:
    def __init__(self, path: str = "dura.db") -> None:
        self.path = path
        # check_same_thread=False keeps the demo simple; one connection per WAL.
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS steps (
                run_id      TEXT NOT NULL,
                step_name   TEXT NOT NULL,
                status      TEXT NOT NULL,
                result_json TEXT,
                ts          REAL NOT NULL,
                PRIMARY KEY (run_id, step_name)
            )
            """
        )
        self._conn.commit()

    def get(self, run_id: str, step_name: str) -> Any:
        """Return the committed result for a step, or MISSING if not recorded."""
        row = self._conn.execute(
            "SELECT result_json FROM steps WHERE run_id = ? AND step_name = ? AND status = 'done'",
            (run_id, step_name),
        ).fetchone()
        if row is None:
            return MISSING
        return json.loads(row[0])

    def put(self, run_id: str, step_name: str, result: Any) -> None:
        """Commit a completed step's result. Durable before the caller continues."""
        self._conn.execute(
            "INSERT OR REPLACE INTO steps (run_id, step_name, status, result_json, ts) "
            "VALUES (?, ?, 'done', ?, ?)",
            (run_id, step_name, json.dumps(result), time.time()),
        )
        self._conn.commit()

    def steps(self, run_id: str) -> list[str]:
        """All committed step names for a run, in commit order."""
        rows = self._conn.execute(
            "SELECT step_name FROM steps WHERE run_id = ? AND status = 'done' ORDER BY ts",
            (run_id,),
        ).fetchall()
        return [r[0] for r in rows]

    def close(self) -> None:
        self._conn.close()
