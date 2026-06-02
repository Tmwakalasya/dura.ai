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
- **Day 3** — single-writer claim: lease-based locking so concurrent workers on
  the same run execute each step exactly once; expired leases are reclaimed so
  a worker that dies mid-step still resumes.

**Testing.** 17 passing:
- Unit: exactly-once resume, multi-step resume, saga reverse-unwind, WAL.
- Integration: a real `SIGKILL` mid-workflow + restart (exactly-once across an
  actual process death), crash-after-every-step, durable return values,
  two workers racing the same step (exactly-once), stale-lease takeover.

**Concurrency.** Before executing a step, a worker `claim`s it by writing a
short-lived lease into the WAL under a SQLite write lock — so two workers
racing the same run can't both run the side effect. If the holder dies, its
lease expires and another worker takes over, preserving crash-and-resume.

Run: `python -m pytest -v`. Next: docs + hosted cloud.
