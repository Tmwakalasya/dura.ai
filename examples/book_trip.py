"""Day-1 demo: crash a workflow mid-run, restart it, watch it resume.

Run it:
    python examples/book_trip.py          # normal run, completes
    python examples/book_trip.py crash    # crashes after charging the card
    python examples/book_trip.py          # restart -> charge is SKIPPED

Use the same log file across runs to see exactly-once in action.
"""

import sys

from dura import durable, SimulatedCrash

LOG = "trip.db"

# Module-level counters so repeated process runs are obvious in the output.
charges = []


def charge_card(amount):
    charges.append(amount)
    print(f"  💳  charging ${amount} ... charged (call #{len(charges)})")
    return {"id": f"ch_{len(charges)}", "amount": amount}


def book_flight(dest):
    print(f"  ✈️   booking flight to {dest} ... confirmed")
    return {"id": "fl_1", "dest": dest}


def update_crm(flight):
    print(f"  🗂️   recording booking {flight['id']} in CRM ... done")
    return {"ok": True}


@durable
def book_trip(ctx, dest, amount):
    ctx.step("charge_card", lambda: charge_card(amount))
    flight = ctx.step("book_flight", lambda: book_flight(dest))
    ctx.step("update_crm", lambda: update_crm(flight))
    return "trip booked"


if __name__ == "__main__":
    crash_after = "charge_card" if "crash" in sys.argv else None
    print(f"\n▶ running book_trip (crash_after={crash_after})")
    try:
        result = book_trip("Tokyo", 499, log=LOG, crash_after=crash_after)
        print(f"✅ {result}")
    except SimulatedCrash as e:
        print(f"💥 process crashed after step: {e}")

    ctx = book_trip.last_context
    print("\n  step log this run:")
    for name, what in ctx.events:
        mark = "·skip" if what == "skipped" else "▸exec"
        print(f"    {mark}  {name}")
    print(f"  committed steps in durable log: {ctx.wal.steps(ctx.run_id)}\n")
