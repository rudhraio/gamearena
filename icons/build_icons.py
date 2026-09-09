#!/usr/bin/env python3
"""Generate square PWA icons from the GA mark."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAPER = (244, 242, 236, 255)
INK = (11, 11, 11, 255)


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    raw = b"".join(b"\x00" + bytes(ch for px in row for ch in px) for row in pixels)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def fill_rect(px, x0, y0, x1, y1, color):
    for y in range(y0, y1):
        row = px[y]
        for x in range(x0, x1):
            row[x] = color


def stamp_ga(px, size: int, pad: int, fill_bg: bool) -> None:
    if fill_bg:
        fill_rect(px, 0, 0, size, size, PAPER)
    else:
        fill_rect(px, 0, 0, size, size, INK)

    border = max(4, size // 32)
    inner = max(8, size // 16)
    if fill_bg:
        fill_rect(px, pad, pad, size - pad, size - pad, INK)
        fill_rect(
            px,
            pad + border,
            pad + border,
            size - pad - border,
            size - pad - border,
            PAPER,
        )
        fill_rect(
            px,
            pad + inner,
            pad + inner,
            size - pad - inner,
            size - pad - inner,
            INK,
        )

    # Blocky GA using rectangles so we don't need fonts.
    unit = size / 32
    ox, oy = size * 0.18, size * 0.28

    def block(x, y, w, h):
        fill_rect(
            px,
            int(ox + x * unit),
            int(oy + y * unit),
            int(ox + (x + w) * unit),
            int(oy + (y + h) * unit),
            PAPER,
        )

    # G
    block(0, 0, 8, 1.6)
    block(0, 0, 1.6, 14)
    block(0, 12.4, 8, 1.6)
    block(6.4, 0, 1.6, 4)
    block(4.4, 6.4, 3.6, 1.6)
    block(6.4, 6.4, 1.6, 7.6)
    # A
    ax = 10.2
    block(ax + 3.1, 0, 1.8, 14)
    block(ax + 0.2, 0, 1.8, 14)
    block(ax + 0.2, 0, 4.7, 1.6)
    block(ax + 0.2, 6.2, 4.7, 1.6)


def make(size: int, maskable: bool = False) -> list[list[tuple[int, int, int, int]]]:
    px = [[PAPER] * size for _ in range(size)]
    pad = int(size * 0.12) if maskable else int(size * 0.05)
    stamp_ga(px, size, pad, fill_bg=True)
    return px


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    write_png(ROOT / "icon-192.png", 192, make(192))
    write_png(ROOT / "icon-512.png", 512, make(512))
    write_png(ROOT / "icon-512-maskable.png", 512, make(512, maskable=True))
    write_png(ROOT / "apple-touch-icon.png", 180, make(180))


if __name__ == "__main__":
    main()
