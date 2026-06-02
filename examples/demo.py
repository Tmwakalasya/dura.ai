"""dura — the Instagram demo.

A short, paced, colorized terminal story you can screen-record (vertical or
square framing). It tells the whole pitch in ~25 seconds:

    an agent charges a card, crashes mid-task, restarts —
    and dura makes sure the card is charged exactly once.

Run it big and full-screen:

    python examples/demo.py

Tip for recording: bump your terminal font size way up, dark theme,
then screen-record. Each beat is timed so it reads on a phone.
"""

import os
import shutil
import sys
import time

# ── tiny ANSI toolkit ────────────────────────────────────────────────────── #
RESET = "\033[0m"
DIM = "\033[2m"
BOLD = "\033[1m"
RED = "\033[38;5;203m"
GREEN = "\033[38;5;79m"
ORANGE = "\033[38;5;209m"  # dura accent
GREY = "\033[38;5;245m"
WHITE = "\033[38;5;255m"


def cols() -> int:
    return shutil.get_terminal_size((60, 20)).columns


def center(text: str, width: int | None = None) -> str:
    width = width or cols()
    # length without ANSI codes
    bare = text
    for code in (RESET, DIM, BOLD, RED, GREEN, ORANGE, GREY, WHITE):
        bare = bare.replace(code, "")
    pad = max(0, (width - len(bare)) // 2)
    return " " * pad + text


def line(text: str = "", pause: float = 0.0, nl: bool = True) -> None:
    sys.stdout.write(center(text) + ("\n" if nl else ""))
    sys.stdout.flush()
    if pause:
        time.sleep(pause)


def typed(text: str, pause: float = 0.03, hold: float = 0.0) -> None:
    """Type a centered line character by character (for the command beat)."""
    width = cols()
    bare = text
    for code in (RESET, DIM, BOLD, RED, GREEN, ORANGE, GREY, WHITE):
        bare = bare.replace(code, "")
    pad = max(0, (width - len(bare)) // 2)
    sys.stdout.write(" " * pad)
    for ch in text:
        sys.stdout.write(ch)
        sys.stdout.flush()
        time.sleep(pause)
    sys.stdout.write("\n")
    sys.stdout.flush()
    if hold:
        time.sleep(hold)


def clear() -> None:
    os.system("cls" if os.name == "nt" else "clear")


def beat(t: float = 0.6) -> None:
    time.sleep(t)


# ── the show ─────────────────────────────────────────────────────────────── #
def run() -> None:
    clear()
    print("\n\n\n")
    line(f"{BOLD}{ORANGE}dura{RESET}", pause=0.8)
    line(f"{GREY}durable execution for AI agents{RESET}", pause=1.4)
    clear()

    print("\n\n\n")
    line(f"{WHITE}your agent books a trip.{RESET}", pause=1.2)
    beat(0.3)
    clear()

    # First run — it charges, then crashes.
    print("\n\n")
    line(f"{GREY}$ python agent.py{RESET}", pause=0.8)
    beat(0.4)
    line(f"{WHITE}💳  charge_card    {GREEN}charged $412{RESET}", pause=1.1)
    beat(0.4)
    line(f"{RED}{BOLD}💥  CRASH{RESET}  {GREY}(process killed mid-task){RESET}", pause=1.6)
    clear()

    print("\n\n\n")
    line(f"{RED}the card is charged.{RESET}", pause=1.0)
    line(f"{RED}the trip is not booked.{RESET}", pause=1.4)
    beat(0.3)
    line(f"{GREY}most agents would charge it{RESET}", pause=0.7)
    line(f"{RED}{BOLD}again on retry.{RESET}", pause=1.8)
    clear()

    # Restart — dura skips the committed step.
    print("\n\n")
    line(f"{GREY}$ python agent.py{RESET}  {DIM}# restart{RESET}", pause=1.0)
    beat(0.4)
    line(f"{ORANGE}↺  charge_card    {DIM}skipped — already done{RESET}", pause=1.3)
    beat(0.3)
    line(f"{WHITE}✈️   book_flight    {GREEN}confirmed{RESET}", pause=1.0)
    line(f"{WHITE}🗂️   update_crm     {GREEN}done{RESET}", pause=1.3)
    clear()

    print("\n\n\n")
    line(f"{GREEN}{BOLD}charged once.{RESET}", pause=1.0)
    line(f"{GREEN}{BOLD}not twice.{RESET}", pause=1.8)
    clear()

    # The API.
    print("\n\n\n")
    line(f"{GREY}the entire change:{RESET}", pause=1.0)
    beat(0.3)
    line(f"{ORANGE}@durable{RESET}", pause=0.6)
    line(f"{WHITE}def book_trip(ctx, ...):{RESET}", pause=1.6)
    clear()

    print("\n\n\n")
    typed(f"{GREEN}$ pip install dura{RESET}", pause=0.05, hold=1.4)
    line()
    line(f"{BOLD}{ORANGE}dura{RESET}", pause=0.6)
    line(f"{GREY}agents crash. your state shouldn't.{RESET}", pause=2.0)
    print("\n\n")


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print(RESET)
