"""Saga rollback: when a step fails, completed steps undo in reverse order."""

import pytest

from dura import durable


def test_undo_fires_in_reverse_order_on_failure(tmp_path):
    log = str(tmp_path / "run.db")
    order: list[str] = []

    @durable
    def flow(ctx):
        ctx.step("a", lambda: order.append("do_a"), undo=lambda: order.append("undo_a"))
        ctx.step("b", lambda: order.append("do_b"), undo=lambda: order.append("undo_b"))
        ctx.step("c", lambda: (_ for _ in ()).throw(RuntimeError("boom")))

    with pytest.raises(RuntimeError):
        flow(log=log)

    # a, b ran forward; then the failing c triggers reverse unwind: undo_b, undo_a.
    assert order == ["do_a", "do_b", "undo_b", "undo_a"]


def test_only_completed_steps_are_rolled_back(tmp_path):
    log = str(tmp_path / "run.db")

    @durable
    def flow(ctx):
        ctx.step("charge", lambda: "ch_1", undo=lambda: undos.append("refund"))
        ctx.step("book", lambda: (_ for _ in ()).throw(RuntimeError("no seats")),
                 undo=lambda: undos.append("cancel_booking"))

    undos: list[str] = []
    with pytest.raises(RuntimeError):
        flow(log=log)

    # charge completed -> refunded. book never completed -> its undo must NOT fire.
    assert undos == ["refund"]
    assert flow.last_context.rolled_back == ["charge"]


def test_no_undo_means_no_rollback_action(tmp_path):
    log = str(tmp_path / "run.db")

    @durable
    def flow(ctx):
        ctx.step("a", lambda: "ok")  # no undo registered
        ctx.step("b", lambda: (_ for _ in ()).throw(RuntimeError("boom")))

    with pytest.raises(RuntimeError):
        flow(log=log)

    assert flow.last_context.rolled_back == []  # nothing to compensate


def test_committed_steps_still_unwind_after_resume(tmp_path):
    """A step replayed from the log still registers its undo, so a later
    failure on resume rolls it back correctly."""
    log = str(tmp_path / "run.db")
    undos: list[str] = []

    @durable
    def flow(ctx, fail):
        ctx.step("charge", lambda: "ch_1", undo=lambda: undos.append("refund"))
        if fail:
            ctx.step("book", lambda: (_ for _ in ()).throw(RuntimeError("boom")))

    # First run: commit charge only (no failure).
    flow(False, log=log)
    assert undos == []

    # Resume with a failing second step: charge is replayed from log, then
    # book fails -> charge's undo must still fire.
    with pytest.raises(RuntimeError):
        flow(True, log=log)
    assert undos == ["refund"]
