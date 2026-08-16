#!/usr/bin/env python3
"""Render the Google Play QR code shown in the FloorisPlan hero.

The code points at the Play listing with a fixed install referrer, so
installs that start from a desktop visitor scanning the code show up in
Firebase as utm_medium=qr instead of being lost as organic.

    python3 -m venv .venv && .venv/bin/pip install segno
    .venv/bin/python tools/make_qr.py

Writes src/images/play-qr.svg. The SVG is committed, so this only needs
to run again when the target URL changes.
"""

from pathlib import Path
from urllib.parse import quote

import segno

PLAY_URL = "https://play.google.com/store/apps/details?id=com.clewbyte.floorisplan"
REFERRER = "utm_source=clewbyte.com&utm_medium=qr&utm_campaign=site_qr"

OUT = Path(__file__).resolve().parent.parent / "src" / "images" / "play-qr.svg"

# Dark UI: the modules are drawn in near-black on the light plate that the
# stylesheet puts behind them, which keeps the contrast scanners need.
DARK = "#0d0d0d"


def main() -> None:
    url = f"{PLAY_URL}&referrer={quote(REFERRER, safe='')}"
    # Error correction M survives the rounded plate and a phone camera at
    # arm's length; H would make the modules too dense to print small.
    qr = segno.make(url, error="m")
    qr.save(
        OUT,
        kind="svg",
        scale=10,
        border=2,
        dark=DARK,
        light=None,  # transparent — the page supplies the light plate
        svgclass=None,
        lineclass=None,
        omitsize=True,
        unit="",
    )
    print(f"{OUT.relative_to(Path.cwd())}  ←  {url}")


if __name__ == "__main__":
    main()
