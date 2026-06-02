"""Generate the dura Instagram carousel — the $412 -> $0 story.

Six 1080x1350 (4:5) slides in the dura aesthetic: near-black background,
the orange accent, a faint grid, Helvetica-like sans for headlines and a
mono face for code/numbers. Run:

    python marketing/make_carousel.py

Outputs marketing/carousel/slide_1.png ... slide_6.png
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

# ── canvas + palette ───────────────────────────────────────────────────────#
W, H = 1080, 1350
INK = (10, 10, 11)          # background
SURFACE = (18, 18, 22)      # cards
WHITE = (250, 250, 250)
GREY = (150, 150, 158)
DIM = (90, 90, 98)
ACCENT = (232, 84, 63)      # dura orange-red
RED = (235, 92, 80)
GREEN = (90, 200, 150)
GRID = (24, 24, 30)

OUT = os.path.join(os.path.dirname(__file__), "carousel")

SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def base() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    # faint grid
    step = 90
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=GRID, width=1)
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=GRID, width=1)
    return img, d


def text_w(d, s, f) -> int:
    return d.textbbox((0, 0), s, font=f)[2]


def centered(d, y, s, f, fill):
    d.text(((W - text_w(d, s, f)) // 2, y), s, font=f, fill=fill)


def wordmark(d, y=90):
    f = font(MONO_BOLD, 40)
    label = "dura"
    w = text_w(d, label, f)
    x = (W - w - 30) // 2
    d.text((x, y), label, font=f, fill=WHITE)
    d.ellipse([x + w + 14, y + 6, x + w + 30, y + 22], fill=ACCENT)


def kicker(d, y, s):
    f = font(SANS_BOLD, 26)
    s = s.upper()
    # letter-spaced
    spaced = "  ".join(list(s)) if len(s) < 24 else s
    centered(d, y, spaced, f, ACCENT)


def multiline(d, y, lines, f, fill, gap=14):
    for ln in lines:
        centered(d, y, ln, f, fill)
        y += d.textbbox((0, 0), ln, font=f)[3] + gap
    return y


# ── slides ─────────────────────────────────────────────────────────────────#
def slide_1():
    img, d = base()
    wordmark(d)
    kicker(d, 470, "the problem")
    h = font(SANS_BOLD, 78)
    multiline(d, 560, ["Your AI agent", "just charged a", "customer $412."], h, WHITE, gap=18)
    centered(d, 1180, "swipe →", font(SANS, 30), DIM)
    return img


def crack(d, cx, cy, scale=1.0):
    """Draw a stylized red lightning crack centered around (cx, cy)."""
    s = scale
    pts = [
        (cx - 40 * s, cy - 90 * s),
        (cx + 10 * s, cy - 20 * s),
        (cx - 15 * s, cy - 10 * s),
        (cx + 45 * s, cy + 90 * s),
        (cx + 5 * s, cy + 5 * s),
        (cx + 30 * s, cy - 5 * s),
    ]
    d.polygon(pts, fill=RED)


def slide_2():
    img, d = base()
    wordmark(d)
    h = font(SANS_BOLD, 74)
    multiline(d, 470, ["Then it crashed", "before booking", "the flight."], h, WHITE, gap=18)
    crack(d, W // 2, 880, scale=1.3)
    centered(d, 1000, "process killed mid-task", font(SANS, 32), GREY)
    return img


def slide_3():
    img, d = base()
    wordmark(d)
    kicker(d, 360, "what usually happens")
    h = font(SANS_BOLD, 70)
    multiline(d, 450, ["On retry, the agent", "charges the card", "AGAIN."], h, WHITE, gap=18)
    centered(d, 760, "$824", font(MONO_BOLD, 130), RED)
    centered(d, 930, "double-charged. furious customer.", font(SANS, 34), GREY)
    return img


def slide_4():
    img, d = base()
    wordmark(d)
    kicker(d, 330, "the fix")
    h = font(SANS_BOLD, 64)
    multiline(d, 420, ["dura makes every", "step exactly-once."], h, WHITE, gap=18)

    # code card
    cx0, cy0, cx1, cy1 = 130, 700, 950, 920
    d.rounded_rectangle([cx0, cy0, cx1, cy1], radius=22, fill=SURFACE)
    cf = font(MONO_BOLD, 44)
    d.text((cx0 + 50, cy0 + 45), "@durable", font=cf, fill=ACCENT)
    cf2 = font(MONO, 38)
    d.text((cx0 + 50, cy0 + 115), "def book_trip(ctx):", font=cf2, fill=WHITE)
    centered(d, 980, "one decorator. that's the whole change.", font(SANS, 32), GREY)
    return img


def slide_5():
    img, d = base()
    wordmark(d)
    kicker(d, 330, "with dura")
    # before / after rows
    f_lab = font(SANS, 36)
    f_num = font(MONO_BOLD, 64)

    y = 480
    d.text((150, y), "charged", font=f_lab, fill=GREY)
    d.text((W - 150 - text_w(d, "$412", f_num), y - 14), "$412", font=f_num, fill=WHITE)
    y += 130
    d.text((150, y), "flight failed", font=f_lab, fill=GREY)
    d.text((W - 150 - text_w(d, "FAILED", f_num), y - 14), "FAILED", font=f_num, fill=RED)
    y += 130
    d.text((150, y), "auto-refunded", font=f_lab, fill=GREY)
    d.text((W - 150 - text_w(d, "+$412", f_num), y - 14), "+$412", font=f_num, fill=ACCENT)

    d.line([(150, y + 130), (W - 150, y + 130)], fill=DIM, width=2)
    y += 180
    d.text((150, y), "customer held", font=font(SANS_BOLD, 40), fill=WHITE)
    d.text((W - 150 - text_w(d, "$0", f_num), y - 12), "$0", font=f_num, fill=GREEN)
    centered(d, y + 150, "clean. exactly-once. crash-proof.", font(SANS, 34), GREEN)
    return img


def slide_6():
    img, d = base()
    # big closing
    f = font(MONO_BOLD, 64)
    label = "dura"
    w = text_w(d, label, f)
    x = (W - w - 40) // 2
    d.text((x, 470), label, font=f, fill=WHITE)
    d.ellipse([x + w + 18, 480, x + w + 42, 504], fill=ACCENT)

    centered(d, 600, "agents crash.", font(SANS, 44), GREY)
    centered(d, 660, "your state shouldn't.", font(SANS, 44), GREY)

    # install pill
    cmd = "$ pip install dura"
    cf = font(MONO_BOLD, 46)
    cw = text_w(d, cmd, cf)
    px0 = (W - cw - 100) // 2
    d.rounded_rectangle([px0, 820, px0 + cw + 100, 910], radius=45, fill=SURFACE)
    d.text((px0 + 50, 838), cmd, font=cf, fill=GREEN)

    centered(d, 1010, "dura.ai", font(SANS_BOLD, 40), ACCENT)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    slides = [slide_1, slide_2, slide_3, slide_4, slide_5, slide_6]
    for i, fn in enumerate(slides, 1):
        path = os.path.join(OUT, f"slide_{i}.png")
        fn().save(path)
        print("wrote", path)


if __name__ == "__main__":
    main()
