"""The durable runtime: the @durable decorator and the step context.

Core guarantee (the whole product in one sentence):
  a step that has already committed to the log never executes again.
"""

from __future__ import annotations

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional

from dura.log import WAL, MISSING


class SimulatedCrash(Exception):
    """Raised to model a process dying mid-workflow (for tests/demos)."""


def _derive_run_id(name: str, args: tuple, kwargs: dict) -> str:
    """Stable id from the workflow + its inputs — this is the idempotency key.

    Re-invoking with the same inputs resumes the same run, which is exactly
    what "restart after a crash" means.
    """
    payload = json.dumps([name, args, kwargs], sort_keys=True, default=str)
    digest = hashlib.sha256(payload.encode()).hexdigest()[:12]
    return f"{name}-{digest}"


class Context:
    """Passed to a @durable function. Use ctx.step(...) to run durable steps."""

    def __init__(self, wal: WAL, run_id: str, crash_after: Optional[str] = None) -> None:
        self.wal = wal
        self.run_id = run_id
        self.crash_after = crash_after
        # Observability for the demo: what happened on this invocation.
        self.events: list[tuple[str, str]] = []

    def step(self, name: str, fn: Callable[[], Any]) -> Any:
        """Run `fn` exactly once across all invocations of this run.

        If `name` is already in the log, return its result without executing.
        Otherwise execute, commit the result, then continue.
        """
        cached = self.wal.get(self.run_id, name)
        if cached is not MISSING:
            self.events.append((name, "skipped"))
            return cached

        result = fn()
        # Commit BEFORE we continue — so a crash after this line can't lose it.
        self.wal.put(self.run_id, name, result)
        self.events.append((name, "executed"))

        # Model a crash that happens after the step committed but before the
        # workflow finished. On restart this step will be skipped.
        if self.crash_after == name:
            raise SimulatedCrash(name)

        return result


def durable(_fn: Optional[Callable] = None, *, log: str = "dura.db") -> Callable:
    """Decorator. The wrapped function receives a Context as its first argument.

    Optional call-time kwargs:
      run_id:       override the derived idempotency key
      crash_after:  raise SimulatedCrash right after this step commits
      log:          path to the SQLite log for this invocation
    """

    def decorate(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(
            *args: Any,
            run_id: Optional[str] = None,
            crash_after: Optional[str] = None,
            log: str = log,
            **kwargs: Any,
        ) -> Any:
            wal = WAL(log)
            rid = run_id or _derive_run_id(fn.__name__, args, kwargs)
            ctx = Context(wal, rid, crash_after)
            try:
                return fn(ctx, *args, **kwargs)
            finally:
                # Expose the context on the wrapper for inspection in demos/tests.
                wrapper.last_context = ctx  # type: ignore[attr-defined]

        return wrapper

    return decorate(_fn) if _fn is not None else decorate
