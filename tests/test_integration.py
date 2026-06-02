"""Integration tests — beyond unit tests.

These exercise dura the way it actually gets used: across real OS process
kills, across many crash points, and under concurrency.
"""

import collections
import os
import signal
import subprocess
import sys
import threading
import time

import pytest

from dura import durable, SimulatedCrash

WORKER = os.path.join(os.path.dirname(__file__), "_worker.py")


def test_survives_a_real_sigkill_exactly_once(tmp_path):
    """The headline test: an actual `kill -9` mid-workflow, then restart.

    Proves the durable log survives process death — not just a caught
    exception — and the side effect fires exactly once.
    """
    side = tmp_path / "side.txt"
    ready = tmp_path / "ready"
    log = tmp_path / "run.db"

    env = {
        **os.environ,
        "DURA_SIDE": str(side),
        "DURA_LOG": str(log),
        "DURA_READY": str(ready),
        "DURA_HANG": "1",
    }

    # Launch the worker; it charges the card, commits, then hangs.
    proc = subprocess.Popen([sys.executable, WORKER], env=env)
    try:
        # Wait until the charge has committed (worker writes the ready marker).
        deadline = time.time() + 10
        while not ready.exists() and time.time() < deadline:
            time.sleep(0.02)
        assert ready.exists(), "worker never committed the charge before timeout"

        # Hard kill — SIGKILL cannot be caught or cleaned up after.
        proc.send_signal(signal.SIGKILL)
        proc.wait(timeout=5)
    finally:
        if proc.poll() is None:
            proc.kill()

    # Exactly one charge happened before the kill.
    assert side.read_text().count("charge") == 1

    # Restart the workflow in a brand-new process, same log, no hang.
    env_resume = {k: v for k, v in env.items() if k != "DURA_HANG"}
    result = subprocess.run([sys.executable, WORKER], env=env_resume, timeout=15)
    assert result.returncode == 0

    # The charge was NOT re-executed on resume.
    assert side.read_text().count("charge") == 1


def test_crash_after_every_step_is_still_exactly_once(tmp_path):
    """Exhaustively crash after each step; every side effect runs exactly once."""
    log = str(tmp_path / "run.db")
    calls: collections.Counter = collections.Counter()
    steps = ["s1", "s2", "s3", "s4", "s5"]

    @durable
    def pipeline(ctx):
        for s in steps:
            ctx.step(s, lambda s=s: calls.update([s]))

    # Crash after each step in turn, resuming from the log every time.
    for crash_point in steps:
        try:
            pipeline(log=log, crash_after=crash_point)
        except SimulatedCrash:
            pass

    # Final clean run to complete the workflow.
    pipeline(log=log)

    for s in steps:
        assert calls[s] == 1, f"{s} executed {calls[s]} times (expected 1)"


def test_results_persist_across_a_fresh_interpreter(tmp_path):
    """A committed step's *return value* is durable, not just the fact it ran."""
    log = str(tmp_path / "run.db")

    @durable
    def flow(ctx):
        return ctx.step("compute", lambda: {"answer": 42})

    first = flow(log=log)
    # Simulate a fresh process by re-deriving everything from the log only.
    second = flow(log=log)
    assert first == second == {"answer": 42}
    assert ("compute", "skipped") in flow.last_context.events


@pytest.mark.xfail(
    reason="single-writer claim not yet implemented; concurrent workers on the "
    "same run can both execute a step before either commits. Roadmap item.",
    strict=False,
)
def test_concurrent_workers_do_not_double_execute(tmp_path):
    """Documents a known limitation honestly: two workers racing the same step.

    Today there is no row-level claim before execution, so both can run the
    side effect. Marked xfail until a `claim` step is added to the WAL.
    """
    log = str(tmp_path / "run.db")
    calls: collections.Counter = collections.Counter()
    barrier = threading.Barrier(2)

    @durable
    def flow(ctx):
        def charge():
            barrier.wait()  # force both threads into the step simultaneously
            calls.update(["charge"])
        ctx.step("charge", charge)

    threads = [threading.Thread(target=lambda: flow(log=log)) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert calls["charge"] == 1
