"""The single most important test in the project.

If this passes, dura delivers its core promise: a side effect that runs
exactly once even when the process crashes and restarts.
"""

import pytest

from dura import durable, SimulatedCrash


def test_charge_runs_exactly_once_across_a_crash(tmp_path):
    log = str(tmp_path / "run.db")
    calls = {"charge": 0, "book": 0}

    @durable
    def book_trip(ctx):
        ctx.step("charge_card", lambda: charge())
        ctx.step("book_flight", lambda: book())

    def charge():
        calls["charge"] += 1
        return {"id": "ch_1"}

    def book():
        calls["book"] += 1
        return {"id": "fl_1"}

    # First run: crash right after the card is charged.
    with pytest.raises(SimulatedCrash):
        book_trip(log=log, crash_after="charge_card")

    assert calls["charge"] == 1   # charged once
    assert calls["book"] == 0     # never got to booking

    # Restart: same inputs -> same run_id -> same log.
    book_trip(log=log)

    # The entire product, in two assertions:
    assert calls["charge"] == 1   # NOT charged again on resume
    assert calls["book"] == 1     # booking completed exactly once


def test_resume_skips_the_completed_step(tmp_path):
    log = str(tmp_path / "run.db")

    @durable
    def book_trip(ctx):
        ctx.step("charge_card", lambda: "ch")
        ctx.step("book_flight", lambda: "fl")

    with pytest.raises(SimulatedCrash):
        book_trip(log=log, crash_after="charge_card")

    book_trip(log=log)
    events = book_trip.last_context.events  # events from the resume run
    assert ("charge_card", "skipped") in events
    assert ("book_flight", "executed") in events
