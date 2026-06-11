"""The durable runtime: the @durable decorator and the step context.

Core guarantees:
  1. A step that has already committed to the log never executes again.
  2. If a step raises, every previously-completed step's undo fires in
     reverse order (saga pattern) — leaving the world in a clean state.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from functools import wraps
from typing import Any, Callable, Optional

from dura.emit import Emitter, bounded_result
from dura.log import WAL, MISSING, ACQUIRED, DONE, HELD


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

    def __init__(
        self,
        wal: WAL,
        run_id: str,
        crash_after: Optional[str] = None,
        *,
        emitter: Optional[Emitter] = None,
        fn_name: str = "",
        log_path: str = "",
    ) -> None:
        self.wal = wal
        self.run_id = run_id
        self.crash_after = crash_after
        # Ordered list of (step_name, undo_fn) for completed steps — saga stack.
        self._completed: list[tuple[str, Optional[Callable[[], Any]]]] = []
        # Observability for the demo: what happened on this invocation.
        self.events: list[tuple[str, str]] = []
        # Steps that were rolled back.
        self.rolled_back: list[str] = []
        # Best-effort event stream to dura Cloud (None = emission disabled).
        self._emitter = emitter
        self._fn_name = fn_name
        self._log_path = log_path
        self._seq = 0  # per-invocation ordering so ingest never trusts clocks

    def _emit(self, type_: str, event: str, **fields: Any) -> None:
        """Queue an event for dura Cloud. No-op unless emission is enabled."""
        if self._emitter is None:
            return
        if "result" in fields:
            fields["result"] = bounded_result(fields["result"])
        self._seq += 1
        self._emitter.emit(
            {
                "type": type_,
                "event": event,
                "run_id": self.run_id,
                "fn": self._fn_name,
                "worker_id": self.wal.worker_id,
                "log": self._log_path,
                "ts": time.time(),
                "seq": self._seq,
                **fields,
            }
        )

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
        # Fast path: already committed — replay without taking a write lock.
        cached = self.wal.get(self.run_id, name)
        if cached is not MISSING:
            # Still register the undo so a later failure can unwind this step.
            self._completed.append((name, undo))
            self.events.append((name, "skipped"))
            self._emit("step", "skipped", step=name)
            return cached

        # Claim the step so a racing worker can't also execute it. If another
        # worker holds the claim, wait until it commits (then read the result)
        # or its lease expires (then we take over).
        while True:
            state = self.wal.claim(self.run_id, name)
            if state == ACQUIRED:
                break
            if state == DONE:
                self._completed.append((name, undo))
                self.events.append((name, "skipped"))
                self._emit("step", "skipped", step=name)
                return self.wal.get(self.run_id, name)
            # state == HELD: another live worker is executing — wait and retry.
            time.sleep(0.05)

        started = time.time()
        try:
            result = fn()
        except Exception as exc:
            # This step failed — unwind everything that came before it.
            self._emit(
                "step",
                "failed",
                step=name,
                error=repr(exc)[:500],
                duration_ms=int((time.time() - started) * 1000),
            )
            self._unwind()
            raise exc

        # Commit BEFORE continuing — crash here can't lose this result.
        self.wal.put(self.run_id, name, result)
        self._completed.append((name, undo))
        self.events.append((name, "executed"))
        self._emit(
            "step",
            "executed",
            step=name,
            result=result,
            duration_ms=int((time.time() - started) * 1000),
        )

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
                    self._emit("step", "rolled_back", step=name)
                except Exception:
                    # Best-effort: log and continue unwinding.
                    self.events.append((name, "undo_failed"))
                    self._emit("step", "undo_failed", step=name)


def durable(
    _fn: Optional[Callable] = None,
    *,
    log: str = "dura.db",
    emit: Optional[str] = None,
) -> Callable:
    """Decorator. The wrapped function receives a Context as its first argument.

    Optional call-time kwargs:
      run_id:       override the derived idempotency key
      crash_after:  raise SimulatedCrash right after this step commits
      log:          path to the SQLite log for this invocation
      emit:         dura Cloud ingest URL — streams step events (best-effort)

    Emission resolves call-time kwarg > decorator kwarg > DURA_EMIT_URL env
    var. If DURA_EMIT_TOKEN is set it is sent as a Bearer token. Emission is
    fire-and-forget: it can never slow down or fail the workflow.
    """

    def decorate(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(
            *args: Any,
            run_id: Optional[str] = None,
            crash_after: Optional[str] = None,
            log: str = log,  # noqa: A002 — intentional per-call override
            emit: Optional[str] = emit,  # noqa: A002 — same pattern as log
            **kwargs: Any,
        ) -> Any:
            emit_url = emit or os.environ.get("DURA_EMIT_URL")
            emitter: Optional[Emitter] = None
            if emit_url:
                try:
                    emitter = Emitter(emit_url)
                except Exception:
                    emitter = None  # visibility must never break the workflow

            wal = WAL(log)
            rid = run_id or _derive_run_id(fn.__name__, args, kwargs)
            ctx = Context(
                wal, rid, crash_after, emitter=emitter, fn_name=fn.__name__, log_path=log
            )
            ctx._emit("run", "started", args=list(args), kwargs=kwargs)
            try:
                result = fn(ctx, *args, **kwargs)
                ctx._emit("run", "completed")
                return result
            except SimulatedCrash:
                ctx._emit("run", "crashed")
                raise
            except Exception as exc:
                ctx._emit("run", "failed", error=repr(exc)[:500])
                raise
            finally:
                wrapper.last_context = ctx  # type: ignore[attr-defined]
                if emitter is not None:
                    emitter.close()
                wal.close()

        return wrapper

    return decorate(_fn) if _fn is not None else decorate
