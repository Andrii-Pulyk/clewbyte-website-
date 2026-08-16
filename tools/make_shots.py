#!/usr/bin/env python3
"""Compose the app screenshots shown on the FloorisPlan page.

Takes raw 1080x2400 device screenshots and puts each one on a dark card
with a headline, a subtitle and a page indicator, producing the
1080x1920 images that live in src/images/screenshots/.

    # capture the raw frames first (device or emulator, any order)
    adb exec-out screencap -p > shots_pl/01.png
    ...
    python3 tools/make_shots.py pl --raw shots_pl

    # check the layout constants still reproduce a published locale
    python3 tools/make_shots.py en --verify

Captions live in tools/shot_captions.json, one list of six entries per
locale. Add a locale there before rendering it.

Every constant below was measured off the published EN/RU images, so
`--verify` reproduces them to within a couple of 8-bit steps. Change the
numbers only if you mean to restyle every locale at once.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("Pillow is required: pip install --user Pillow")

ROOT = Path(__file__).resolve().parent.parent
CAPTIONS = Path(__file__).resolve().parent / "shot_captions.json"
OUT_DIR = ROOT / "src" / "images" / "screenshots"

# ─── Canvas ───────────────────────────────────────────────────────────────────
W, H = 1080, 1920
BG_TOP = (24, 35, 41)
BG_BOTTOM = (26, 26, 32)
BG_FADE_END = 660          # the gradient has reached BG_BOTTOM by this row
BG_FADE_POWER = 1.9        # ease-in, so the top stays lighter for longer

ACCENT = (0, 200, 180)
TITLE_COLOR = (255, 255, 255)
SUBTITLE_COLOR = (150, 154, 164)
DOT_INACTIVE = (58, 60, 68)

# ─── Text ─────────────────────────────────────────────────────────────────────
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
TITLE_FONT = FONT_DIR / "DejaVuSans-Bold.ttf"
SUBTITLE_FONT = FONT_DIR / "DejaVuSans.ttf"

# Lines sit on the ascender line, not on their own ink, so a line of
# nothing but x-height letters keeps the same optical rhythm.
TITLE_SIZE = 66
TITLE_ASCENDER = 56
TITLE_STEP = 78
SUBTITLE_SIZE = 30
SUBTITLE_ASCENDER = 230
SUBTITLE_STEP = 40
MAX_TEXT_WIDTH = 900       # longer lines are scaled down to fit

# ─── Phone ────────────────────────────────────────────────────────────────────
PHONE_X, PHONE_Y = 240, 340
PHONE_W = 600              # a 1080-wide capture scaled by 5/9
PHONE_RADIUS = 26
SHADOW_ALPHA = 110
SHADOW_BLUR = 18
SHADOW_OFFSET = 6

# ─── Page indicator ───────────────────────────────────────────────────────────
DOT_COUNT = 6
DOT_SIZE = 15
DOT_GAP = 22               # centre to centre
DOT_TOP = 1861


def background():
    """Vertical gradient, drawn one row at a time."""
    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = min(y / BG_FADE_END, 1.0) ** BG_FADE_POWER
        row = tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM))
        draw.line([(0, y), (W, y)], fill=row)
    return img


def fitted(font_path, size, line):
    """Largest font at or below `size` that keeps `line` inside the canvas.

    Sized per line rather than per block: one long line should not shrink
    the short one above it.
    """
    while size > 8:
        font = ImageFont.truetype(str(font_path), size)
        if font.getbbox(line)[2] - font.getbbox(line)[0] <= MAX_TEXT_WIDTH:
            return font
        size -= 1
    return ImageFont.truetype(str(font_path), size)


def draw_lines(draw, lines, font_path, size, ascender, step, colors):
    """Centre `lines` horizontally on a fixed ascender-line grid."""
    for i, line in enumerate(lines):
        if not line:
            continue
        draw.text((W // 2, ascender + i * step), line,
                  font=fitted(font_path, size, line), fill=colors[i], anchor="ma")


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (size[0] - 1, size[1] - 1)],
                                           radius=radius, fill=255)
    return mask


def paste_phone(canvas, shot_path):
    shot = Image.open(shot_path).convert("RGB")
    height = round(shot.height * PHONE_W / shot.width)
    shot = shot.resize((PHONE_W, height), Image.LANCZOS)
    mask = rounded_mask(shot.size, PHONE_RADIUS)

    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(PHONE_X, PHONE_Y + SHADOW_OFFSET),
         (PHONE_X + PHONE_W, PHONE_Y + SHADOW_OFFSET + height)],
        radius=PHONE_RADIUS, fill=SHADOW_ALPHA)
    shadow = shadow.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))
    canvas.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), shadow)

    canvas.paste(shot, (PHONE_X, PHONE_Y), mask)


def draw_dots(draw, active):
    span = (DOT_COUNT - 1) * DOT_GAP + DOT_SIZE
    x = int((W - span) / 2 + 0.5)
    for i in range(DOT_COUNT):
        left = x + i * DOT_GAP
        draw.ellipse([(left, DOT_TOP), (left + DOT_SIZE - 1, DOT_TOP + DOT_SIZE - 1)],
                     fill=ACCENT if i == active else DOT_INACTIVE)


def compose(caption, shot_path, index):
    canvas = background()
    if shot_path is not None:
        paste_phone(canvas, shot_path)

    draw = ImageDraw.Draw(canvas)
    title = caption["title"]
    draw_lines(draw, title, TITLE_FONT, TITLE_SIZE,
               TITLE_ASCENDER, TITLE_STEP, [TITLE_COLOR, ACCENT])

    # The subtitle hangs off the last title line, so when that line is
    # scaled down to fit, the gap below it closes by the same amount.
    shrunk = TITLE_SIZE - fitted(TITLE_FONT, TITLE_SIZE, title[-1]).size
    subtitle = caption["subtitle"]
    draw_lines(draw, subtitle, SUBTITLE_FONT, SUBTITLE_SIZE,
               SUBTITLE_ASCENDER - shrunk, SUBTITLE_STEP,
               [SUBTITLE_COLOR] * len(subtitle))
    draw_dots(draw, index)
    return canvas


def load_captions(lang):
    data = json.loads(CAPTIONS.read_text(encoding="utf-8"))
    if lang not in data:
        sys.exit(f"No captions for '{lang}' in {CAPTIONS.name}. "
                 f"Available: {', '.join(k for k in data if not k.startswith('_'))}")
    captions = data[lang]
    if len(captions) != DOT_COUNT:
        sys.exit(f"'{lang}' has {len(captions)} captions, expected {DOT_COUNT}")
    return captions


def render(lang, raw_dir, out_dir):
    captions = load_captions(lang)
    raw = sorted(Path(raw_dir).glob("*.png"))
    if len(raw) != DOT_COUNT:
        sys.exit(f"{raw_dir} holds {len(raw)} PNGs, expected {DOT_COUNT} "
                 f"(name them 01.png … 0{DOT_COUNT}.png)")

    out_dir.mkdir(parents=True, exist_ok=True)
    for i, (caption, shot) in enumerate(zip(captions, raw)):
        out = out_dir / f"screenshot_{i + 1:02d}_{lang}.png"
        compose(caption, shot, i).save(out, optimize=True)
        print(f"  {shot.name} → {out.relative_to(ROOT)}")
    print(f"\n{DOT_COUNT} screenshots written. The page picks them up on the "
          f"next build; without them it falls back to the English set.")


def verify(lang):
    """Re-render the chrome and compare it with the published images.

    Only the areas outside the phone are compared — the raw captures are
    not kept in the repo, so the phone itself cannot be reproduced here.
    """
    captions = load_captions(lang)
    overall = 0
    for i, caption in enumerate(captions):
        path = OUT_DIR / f"screenshot_{i + 1:02d}_{lang}.png"
        if not path.exists():
            sys.exit(f"{path.relative_to(ROOT)} not found — nothing to verify against")
        published = Image.open(path).convert("RGB")
        rendered = compose(caption, None, i)
        # text band, indicator band, and a background column beside the phone
        regions = [(0, 0, W, PHONE_Y - 50), (0, DOT_TOP - 20, W, DOT_TOP + 40),
                   (0, 600, 180, 1400)]
        worst = 0
        for box in regions:
            a, b = published.crop(box), rendered.crop(box)
            worst = max(worst, max(abs(p - q)
                                   for pa, pb in zip(a.getdata(), b.getdata())
                                   for p, q in zip(pa, pb)))
        overall = max(overall, worst)
        print(f"  screenshot_{i + 1:02d}_{lang}: worst channel diff {worst}")
    print(f"\nWorst deviation across all six: {overall}/255")
    if overall > 12:
        sys.exit("Layout constants no longer match the published images.")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("lang", help="locale to render, e.g. pl")
    parser.add_argument("--raw", help="directory with the six raw device screenshots")
    parser.add_argument("--out", default=str(OUT_DIR), help="output directory")
    parser.add_argument("--verify", action="store_true",
                        help="compare the rendered chrome with the published images")
    args = parser.parse_args()

    if args.verify:
        verify(args.lang)
    elif args.raw:
        render(args.lang, args.raw, Path(args.out))
    else:
        parser.error("pass --raw <dir> to render, or --verify to self-check")


if __name__ == "__main__":
    main()
