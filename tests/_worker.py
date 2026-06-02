"""Subprocess worker for the real-SIGKILL integration test.

Runs a durable workflow whose `charge_card` step appends to a side-effect
file. With DURA_HANG set, it pauses *after* the charge has committed so the
parent can SIGKILL it at a known point. Re-run without DURA_HANG to resume.

Not a test module (leading underscore) — pytest does not collect it.
"""

import os
import time

from dura import durable

SIDE = os.environ["DURA_SIDE"]    # side-effect ledger file
LOG = os.environ["DURA_LOG"]      # shared durable log
READY = os.environ["DURA_READY"]  # marker: charge committed, safe to kill


def charge_card():
    # The real-world side effect we must never duplicate.
    with open(SIDE, "a") as f:
        f.write("charge\n")
    return {"id": "ch_1", "amount": 412}


@durable
def book_trip(ctx):
    ctx.step("charge_card", charge_card)

    if os.environ.get("DURA_HANG"):
        # Charge has committed to the log. Signal the parent and hang so it
        # can SIGKILL us between steps (a real crash, not an exception).
        with open(READY, "w") as f:
            f.write("1")
        time.sleep(60)

    ctx.step("book_flight", lambda: {"id": "fl_1"})


if __name__ == "__main__":
    book_trip(log=LOG)
