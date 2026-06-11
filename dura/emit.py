"""Best-effort event emission to dura Cloud.

The local WAL remains the single source of truth — emission is a
fire-and-forget replica stream for visibility. A dead network, a slow
endpoint, or a missing token must NEVER slow down or fail a workflow:

  - events are queued to a single daemon thread, never posted inline
  - a full queue drops events instead of applying backpressure
  - every network error is swallowed
  - at the end of a run we wait only briefly for the queue to drain

Auth: if DURA_EMIT_TOKEN is set, it is sent as a Bearer token.
"""

from __future__ import annotations

import json
import os
import queue
import threading
import time
import urllib.request
from typing import Any, Optional

# Results larger than this are replaced by a short preview so a single
# huge step result can't make the event stream heavy.
MAX_RESULT_BYTES = 32_768


def bounded_result(result: Any) -> Any:
    """Cap the size of a result payload destined for the event stream."""
    try:
        s = json.dumps(result, default=str)
    except Exception:
        return {"_unserialisable": True}
    if len(s) > MAX_RESULT_BYTES:
        return {"_truncated": True, "preview": s[:1024]}
    return result


class Emitter:
    """Posts events to an HTTP endpoint from a background thread."""

    QUEUE_MAX = 1000        # beyond this we drop — visibility is best-effort
    REQUEST_TIMEOUT = 3.0   # per-POST timeout (seconds)
    FLUSH_TIMEOUT = 2.0     # max wait for the queue to drain at end of run

    def __init__(self, url: str, token: Optional[str] = None) -> None:
        self.url = url
        self.token = token if token is not None else os.environ.get("DURA_EMIT_TOKEN")
        self._q: queue.Queue = queue.Queue(maxsize=self.QUEUE_MAX)
        self._lock = threading.Lock()
        self._pending = 0
        self._thread = threading.Thread(
            target=self._drain, name="dura-emit", daemon=True
        )
        self._thread.start()

    def emit(self, event: dict) -> None:
        """Queue an event. Never blocks, never raises."""
        with self._lock:
            self._pending += 1
        try:
            self._q.put_nowait(event)
        except queue.Full:
            with self._lock:
                self._pending -= 1

    def _drain(self) -> None:
        while True:
            event = self._q.get()
            if event is None:  # close() sentinel
                return
            try:
                self._post(event)
            except Exception:
                pass  # never let visibility errors surface anywhere
            finally:
                with self._lock:
                    self._pending -= 1

    def _post(self, event: dict) -> None:
        data = json.dumps(event, default=str).encode()
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(self.url, data=data, headers=headers, method="POST")
        urllib.request.urlopen(req, timeout=self.REQUEST_TIMEOUT).close()

    def flush(self, timeout: float = FLUSH_TIMEOUT) -> None:
        """Bounded wait for in-flight events. Returns early once drained."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with self._lock:
                if self._pending == 0:
                    return
            time.sleep(0.02)

    def close(self, timeout: float = FLUSH_TIMEOUT) -> None:
        """Flush (bounded) and stop the background thread."""
        self.flush(timeout)
        try:
            self._q.put_nowait(None)
        except queue.Full:
            pass  # daemon thread — safe to abandon
