"""The durable runtime: the @durable decorator and the step context.

Core guarantees:
  1. A step that has already committed to the log never executes again.
  2. If a step raises, every previously-completed step's undo fires in
     reverse order (saga pattern) — leaving the world in a clean state.
"""

from __future__ import annotations

import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional

from dura.log import WAL, MISSING


class SimulatedCrash(Exception):
    """Raised to model a process dying mid-workflow (for tests/demos)."""


class StepFailure(Exception):
    """Raised by a step's fn to trigger saga rollback."""


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
        # Ordered list of (step_name, undo_fn) for completed steps — saga stack.
        self._completed: list[tuple[str, Optional[Callable[[], Any]]]] = []
        # Observability for the demo: what happened on this invocation.
        self.events: list[tuple[str, str]] = []
        # Steps that were rolled back.
        self.rolled_back: list[str] = []

    def step(
        self,
        name: str,
        fn: Callable[[], Any],
        undo: Optional[Callable[[], Any]] = None,
    ) -> Any:
        """Run `fn` exactly once across all invocations of this run.

        If `name` is already in the log, return its cached result.
        Otherwise execute, commit, then continue.

        If `fn` raises, the saga unwind fires before the exception propagates:
        every completed step's `undo` is called in reverse-commit order.
        """
        cached = self.wal.get(self.run_id, name)
        if cached is not MISSING:
            # Still register the undo so a later failure can unwind this step.
            self._completed.append((name, undo))
            self.events.append((name, "skipped"))
            return cached

        try:
            result = fn()
        except Exception as exc:
            # This step failed — unwind everything that came before it.
            self._unwind()
            raise exc

        # Commit BEFORE continuing — crash here can't lose this result.
        self.wal.put(self.run_id, name, result)
        self._completed.append((name, undo))
        self.events.append((name, "executed"))

        if self.crash_after == name:
            raise SimulatedCrash(name)

        return result

    def _unwind(self) -> None:
        """Fire compensating actions in reverse-commit order (saga rollback)."""
        for name, undo_fn in reversed(self._completed):
            if undo_fn is not None:
                try:
                    undo_fn()
                    self.rolled_back.append(name)
                    self.events.append((name, "rolled_back"))
                except Exception:
                    # Best-effort: log and continue unwinding.
                    self.events.append((name, "undo_failed"))


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
                wrapper.last_context = ctx  # type: ignore[attr-defined]

        return wrapper

    return decorate(_fn) if _fn is not None else decorate
