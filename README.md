# dura

**Durable execution for AI agents.** Wrap any function in `@durable` and every
step's result is committed to a write-ahead log before the workflow continues.
If the process crashes, re-running replays the log — completed steps return
their cached result instead of executing again. **Exactly-once, crash-proof.**

```python
from dura import durable

@durable
def book_trip(ctx, dest, amount):
    ctx.step("charge_card", lambda: charge(amount),
             undo=lambda: refund(amount))               # compensating action
    flight = ctx.step("book_flight", lambda: book_flight(dest))
    ctx.step("update_crm", lambda: update_crm(flight))
```

Crash after `charge_card` and restart → the card is **not** charged again.
If a later step fails → completed steps **undo in reverse** (the charge is refunded).

## Why

Agents in production crash mid-task: charge a card, then die before recording
the booking. On retry they charge *again*. dura makes each step atomic and
exactly-once, so a crash never means a double-charge or corrupted state.

## Quickstart

```bash
pip install -e .            # install the package
python -m pytest -q         # run the guarantee tests
python examples/book_trip.py crash   # crash mid-run
python examples/book_trip.py         # restart — charge is skipped
python examples/side_by_side.py      # naive double-charge vs dura auto-refund
```

## Status

- **Day 1** — core runtime: `@durable`, SQLite write-ahead log, exactly-once resume.
- **Day 2** — saga rollback: `undo=` compensating actions, reverse-order unwind on failure.

**Testing.** 15 passing + 1 documented `xfail`:
- Unit: exactly-once resume, multi-step resume, saga reverse-unwind, WAL.
- Integration: a real `SIGKILL` mid-workflow + restart (exactly-once across an
  actual process death), crash-after-every-step, durable return values.

**Known limitation (roadmap).** No single-writer claim yet, so two workers
racing the *same* run can both execute a step before either commits. Tracked as
an `xfail` in `tests/test_integration.py`. Next: a `claim` row in the WAL.

Run: `python -m pytest -v`. Next: docs + hosted cloud.
