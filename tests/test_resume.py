"""Multi-step resume: crash at step 3 of 5, restart resumes at step 3."""

import pytest

from dura import durable, SimulatedCrash


def test_resumes_from_the_crashed_step(tmp_path):
    log = str(tmp_path / "run.db")
    executed: list[str] = []

    def make(name):
        def run():
            executed.append(name)
            return name
        return run

    @durable
    def pipeline(ctx):
        for s in ["s1", "s2", "s3", "s4", "s5"]:
            ctx.step(s, make(s))

    # Crash right after s3 commits.
    with pytest.raises(SimulatedCrash):
        pipeline(log=log, crash_after="s3")

    assert executed == ["s1", "s2", "s3"]

    # Restart: s1-s3 are skipped, only s4 and s5 execute.
    executed.clear()
    pipeline(log=log)
    assert executed == ["s4", "s5"]


def test_full_completion_is_idempotent(tmp_path):
    log = str(tmp_path / "run.db")
    executed: list[str] = []

    @durable
    def pipeline(ctx):
        ctx.step("only", lambda: executed.append("only"))

    pipeline(log=log)
    pipeline(log=log)   # re-running a finished workflow does nothing
    assert executed == ["only"]
