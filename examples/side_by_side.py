"""The demo you record. Same failure, two outcomes.

A trip booking charges the card, then the flight booking FAILS (no seats).

  Without dura:  card stays charged. Orphaned money. Angry customer.
  With dura:     the charge is automatically refunded (saga rollback).
                 Clean state.

Run:
    python examples/side_by_side.py
"""

from dura import durable

# Shared "bank" so we can see the customer's balance move.
ledger = {"charged": 0, "refunded": 0}


def charge_card(amount):
    ledger["charged"] += amount
    print(f"    💳  charge_card  -> charged ${amount}  (balance held: ${held()})")
    return {"id": "ch_1", "amount": amount}


def refund_card(amount):
    ledger["refunded"] += amount
    print(f"    ↩️   refund_card  -> refunded ${amount}  (balance held: ${held()})")


def book_flight(_dest):
    print(f"    ✈️   book_flight  -> FAILED: no seats available")
    raise RuntimeError("no seats available")


def held():
    return ledger["charged"] - ledger["refunded"]


def reset():
    ledger["charged"] = 0
    ledger["refunded"] = 0


# --------------------------------------------------------------------------- #
# 1. The naive agent — no durability, no compensation.
# --------------------------------------------------------------------------- #
def naive_book_trip(dest, amount):
    charge_card(amount)        # money leaves the customer
    book_flight(dest)          # 💥 fails — but the charge already happened


# --------------------------------------------------------------------------- #
# 2. The same workflow under dura — one decorator, one undo per step.
# --------------------------------------------------------------------------- #
@durable
def dura_book_trip(ctx, dest, amount):
    ctx.step(
        "charge_card",
        lambda: charge_card(amount),
        undo=lambda: refund_card(amount),     # <-- the compensating action
    )
    ctx.step("book_flight", lambda: book_flight(dest))


def banner(title):
    print("\n" + "═" * 60)
    print(f"  {title}")
    print("═" * 60)


if __name__ == "__main__":
    banner("WITHOUT dura — naive agent")
    reset()
    try:
        naive_book_trip("Tokyo", 412)
    except RuntimeError as e:
        print(f"    error: {e}")
    print(f"\n    RESULT: customer is out ${held()} with no flight.  ❌ orphaned charge")

    banner("WITH dura — saga rollback")
    reset()
    try:
        dura_book_trip("Tokyo", 412, log="saga_demo.db")
    except RuntimeError as e:
        print(f"    error: {e}")
    print(f"\n    RESULT: customer balance held = ${held()}.  ✅ clean — auto-refunded")
    print(f"    rolled back: {dura_book_trip.last_context.rolled_back}\n")
