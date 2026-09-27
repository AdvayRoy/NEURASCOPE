"""Compose review sheets from render.py output.
Run: python3 compose.py <render_dir> <reference_rail.png>"""
import os
import sys
from PIL import Image, ImageDraw

D = sys.argv[1]
REF = sys.argv[2] if len(sys.argv) > 2 else None
IDS = ["cold", "intent", "visual", "enthusiast"]
NAMES = ["Cold Scroller", "Intent Viewer", "Visual-First Viewer", "Category Enthusiast"]
BG = (17, 19, 22, 255)
states = open(os.path.join(D, "rig_states.txt")).read().split("\n")


def on_bg(im):
    b = Image.new("RGBA", im.size, BG)
    b.alpha_composite(im.convert("RGBA"))
    return b


def rail(scale):
    tile = Image.open(os.path.join(D, f"tile{'2x' if scale == 2 else ''}_{IDS[0]}.png"))
    tw, th = tile.size
    card_h = th + 16 * scale
    W, H = tw + 160 * scale, card_h * 4 + 10 * scale * 5
    S = Image.new("RGBA", (W, H), BG)
    dr = ImageDraw.Draw(S)
    for k, cid in enumerate(IDS):
        y = 10 * scale + k * (card_h + 10 * scale)
        dr.rounded_rectangle((8 * scale, y, W - 8 * scale, y + card_h), 8 * scale, fill=(24, 27, 32), outline=(40, 44, 52))
        tile = Image.open(os.path.join(D, f"tile{'2x' if scale == 2 else ''}_{cid}.png")).convert("RGBA")
        S.alpha_composite(tile, (18 * scale, y + 8 * scale))
        dr.text((tw + 30 * scale, y + 20 * scale), NAMES[k], fill=(230, 232, 236))
    return S


r1 = rail(1)
r1.convert("RGB").save(os.path.join(D, "strip_4up_1x.png"))
r2 = rail(2)
r2.convert("RGB").save(os.path.join(D, "strip_4up_2x.png"))

# rig sheet
cell = 150
n = len(states)
S = Image.new("RGBA", (cell * n, (cell + 4) * 4 + 22), BG)
dr = ImageDraw.Draw(S)
for i, s in enumerate(states):
    dr.text((i * cell + 6, 5), s, fill=(220, 222, 228))
for r, cid in enumerate(IDS):
    for i in range(n):
        im = Image.open(os.path.join(D, f"rig_{cid}_{i:02d}.png")).convert("RGBA").resize((cell, cell), Image.LANCZOS)
        S.alpha_composite(im, (i * cell, 22 + r * (cell + 4)))
S.convert("RGB").save(os.path.join(D, "rig_sheet.png"))

# front / 3-4 contact sheet
ims = [on_bg(Image.open(os.path.join(D, f"{c}_{v}.png"))) for v in ("front", "34") for c in IDS]
w, h = ims[0].size
C = Image.new("RGBA", (w * 4, h * 2), BG)
for k, im in enumerate(ims):
    C.alpha_composite(im, ((k % 4) * w, (k // 4) * h))
C.convert("RGB").save(os.path.join(D, "views_sheet.png"))

# side by side vs reference
if REF:
    ref = Image.open(REF).convert("RGBA")
    ours = r2
    hgt = max(ref.height, ours.height)
    ref = ref.resize((int(ref.width * hgt / ref.height), hgt), Image.LANCZOS)
    ours = ours.resize((int(ours.width * hgt / ours.height), hgt), Image.LANCZOS)
    SB = Image.new("RGBA", (ref.width + ours.width + 30, hgt + 30), BG)
    SB.alpha_composite(ref, (0, 30))
    SB.alpha_composite(ours, (ref.width + 30, 30))
    d2 = ImageDraw.Draw(SB)
    d2.text((8, 8), "reference (canonical)", fill=(220, 222, 228))
    d2.text((ref.width + 38, 8), "blender build (rail tiles, 2x)", fill=(220, 222, 228))
    SB.convert("RGB").save(os.path.join(D, "side_by_side.png"))
print("ok")
