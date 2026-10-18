"""
Builds the radio map's label glyphs from a TTF, so MapLibre draws street names in our own type.

MapLibre can't use web fonts for map labels: it wants signed-distance-field glyphs, cut into
protobuf files of 256 characters each (the Mapbox glyph format). This makes them the same way
fontnik does (24px, 3px buffer, radius 8, cutoff 0.25).

    python3 -m venv .venv && .venv/bin/pip install freetype-py numpy scipy
    .venv/bin/python scripts/map-glyphs.py path/to/GeistMono-Regular.ttf "Geist Mono Regular"

Writes public/map/fonts/<name>/<start>-<end>.pbf for every block the font has characters in.
The TTFs come from the `geist` npm package (dist/fonts/geist-mono), under the SIL Open Font License.
"""

import os
import sys

import freetype
import numpy as np
from scipy.ndimage import distance_transform_edt

SIZE = 24
BUFFER = 3
RADIUS = 8
CUTOFF = 0.25


def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def zigzag(n):
    return (n << 1) ^ (n >> 31)


def field(num, wire, payload):
    key = varint((num << 3) | wire)
    if wire == 0:
        return key + varint(payload)
    return key + varint(len(payload)) + payload


def sdf(coverage):
    """Coverage (0-1, padded) to an 8-bit signed distance field."""
    inside = coverage >= 0.5
    outer = distance_transform_edt(~inside)
    inner = distance_transform_edt(inside)
    d = outer - inner
    # Anti-aliased edge pixels: their coverage says how far across the edge they sit.
    edge = (coverage > 0) & (coverage < 1)
    d[edge] = 0.5 - coverage[edge]
    return np.clip(np.round(255 - 255 * (d / RADIUS + CUTOFF)), 0, 255).astype(np.uint8)


def glyph(face, code):
    face.load_char(code, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_TARGET_NORMAL)
    g = face.glyph
    bm = g.bitmap
    w, h = bm.width, bm.rows
    msg = field(1, 0, code)
    if w and h:
        cov = np.array(bm.buffer, dtype=np.float32).reshape(h, bm.pitch)[:, :w] / 255
        padded = np.zeros((h + 2 * BUFFER, w + 2 * BUFFER), dtype=np.float32)
        padded[BUFFER : BUFFER + h, BUFFER : BUFFER + w] = cov
        msg += field(2, 2, sdf(padded).tobytes())
    ascender = face.size.ascender / 64
    msg += field(3, 0, w)
    msg += field(4, 0, h)
    msg += field(5, 0, zigzag(g.bitmap_left))
    msg += field(6, 0, zigzag(int(round(g.bitmap_top - ascender))))
    msg += field(7, 0, int(round(g.advance.x / 64)))
    return msg


def main(ttf, name):
    face = freetype.Face(ttf)
    face.set_pixel_sizes(0, SIZE)
    codes = sorted({code for code, _ in face.get_chars() if code < 65536})
    out_dir = os.path.join("public", "map", "fonts", name)
    os.makedirs(out_dir, exist_ok=True)
    blocks = sorted({c // 256 for c in codes})
    for b in blocks:
        start, end = b * 256, b * 256 + 255
        rng = f"{start}-{end}"
        stack = field(1, 2, name.encode()) + field(2, 2, rng.encode())
        for code in codes:
            if start <= code <= end:
                stack += field(3, 2, glyph(face, code))
        with open(os.path.join(out_dir, f"{rng}.pbf"), "wb") as f:
            f.write(field(1, 2, stack))
    print(f"{name}: {len(codes)} glyphs in {len(blocks)} ranges -> {out_dir}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
