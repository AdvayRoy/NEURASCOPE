"""Compose review sheets from render_reviewers.py output (needs Pillow).
python3 compose_sheets.py <render_dir> <reference.png> <out_dir>"""
import sys, os
from PIL import Image, ImageDraw
R, REF, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
BG = (17, 19, 22)
KEYS = ['cold', 'intent', 'visual', 'enthusiast']
def flat(p, size=None):
    im = Image.open(p).convert('RGBA')
    if size: im = im.resize(size, Image.LANCZOS)
    bg = Image.new('RGBA', im.size, BG + (255,)); bg.alpha_composite(im); return bg.convert('RGB')
def row(ims, pad=0):
    w = sum(i.width for i in ims) + pad * (len(ims) - 1); h = max(i.height for i in ims)
    o = Image.new('RGB', (w, h), BG); x = 0
    for i in ims: o.paste(i, (x, 0)); x += i.width + pad
    return o
def col(ims, pad=0):
    w = max(i.width for i in ims); h = sum(i.height for i in ims) + pad * (len(ims) - 1)
    o = Image.new('RGB', (w, h), BG); y = 0
    for i in ims: o.paste(i, (0, y)); y += i.height + pad
    return o
for k in KEYS:
    for v in ('front', '34'):
        flat(os.path.join(R, '%s_%s.png' % (k, v))).save(os.path.join(OUT, '%s_%s.png' % (k, v)))
views = col([row([flat(os.path.join(R, '%s_front.png' % k)) for k in KEYS]), row([flat(os.path.join(R, '%s_34.png' % k)) for k in KEYS])])
views.save(os.path.join(OUT, 'views_all.png'))
rail = col([flat(os.path.join(R, 'rail_%s.png' % k)) for k in KEYS], 8)
rail = Image.new('RGB', (rail.width + 24, rail.height + 24), BG); rail.paste(col([flat(os.path.join(R, 'rail_%s.png' % k)) for k in KEYS], 8), (12, 12))
rail.save(os.path.join(OUT, 'rail_strip.png'))
names = ['rest', 'blink_L', 'blink_R', 'blink', 'wide', 'browDown', 'browUp', 'mouthOpen', 'eyes_left', 'eyes_up']
rows = []
for k in KEYS:
    ims = []
    for n in names:
        im = flat(os.path.join(R, 'rig_%s_%s.png' % (k, n)), (220, 220))
        ImageDraw.Draw(im).text((6, 4), n, fill=(200, 200, 200)); ims.append(im)
    rows.append(row(ims, 4))
col(rows, 4).save(os.path.join(OUT, 'rig_test_sheet.png'))
ref = Image.open(REF).convert('RGB')
H = rail.height
ref = ref.resize((int(ref.width * H / ref.height), H), Image.LANCZOS)
row([ref, rail], 24).save(os.path.join(OUT, 'vs_reference.png'))
