import pytest

from dura.log import WAL, MISSING


def test_put_get_roundtrip(tmp_path):
    wal = WAL(str(tmp_path / "t.db"))
    wal.put("run1", "charge", {"id": "ch_1", "amount": 499})
    assert wal.get("run1", "charge") == {"id": "ch_1", "amount": 499}


def test_missing_returns_sentinel(tmp_path):
    wal = WAL(str(tmp_path / "t.db"))
    assert wal.get("run1", "never") is MISSING


def test_none_result_is_distinguishable_from_missing(tmp_path):
    wal = WAL(str(tmp_path / "t.db"))
    wal.put("run1", "noop", None)
    assert wal.get("run1", "noop") is None        # recorded
    assert wal.get("run1", "other") is MISSING     # not recorded


def test_steps_listed_in_commit_order(tmp_path):
    wal = WAL(str(tmp_path / "t.db"))
    for s in ["a", "b", "c"]:
        wal.put("run1", s, s)
    assert wal.steps("run1") == ["a", "b", "c"]


def test_non_serialisable_result_raises_before_commit(tmp_path):
    wal = WAL(str(tmp_path / "t.db"))
    with pytest.raises(TypeError, match="non-JSON-serialisable"):
        wal.put("run1", "bad_step", object())
    # The step must not appear as done — claim should not be stuck.
    assert wal.get("run1", "bad_step") is MISSING


def test_close_is_idempotent(tmp_path):
    wal = WAL(str(tmp_path / "t.db"))
    wal.put("run1", "step", {"ok": True})
    wal.close()
    # Second close should not raise.
    wal.close()
