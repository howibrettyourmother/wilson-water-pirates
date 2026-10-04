# Draws the Home Screen / favicon icons (canoe + pirate flag on a blue river). Run: python3 src/icon.py
from PIL import Image, ImageDraw, ImageFilter
import os, math
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, '..')
S = 1024  # master size, downsampled for crisp edges

def master(pad=0.0):
    im = Image.new('RGB', (S, S), '#29b6f6'); d = ImageDraw.Draw(im)
    # river: vertical gradient bright cyan -> deep blue
    for y in range(S):
        t = y / S; c0 = (95, 215, 245); c1 = (21, 101, 192)
        d.line([(0, y), (S, y)], fill=tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)))
    # wavy white ripples
    for row, (y0, amp) in enumerate([(170, 18), (300, 20), (840, 22), (950, 20)]):
        pts = [(x, y0 + amp * math.sin(x / 70 + row * 1.7)) for x in range(-20, S + 21, 8)]
        d.line(pts, fill=(255, 255, 255), width=22, joint='curve')
    k = 1 - pad  # shrink artwork for maskable safe zone
    def P(x, y): return (S / 2 + (x - S / 2) * k, S / 2 + (y - S / 2) * k)
    def poly(pts, **kw): d.polygon([P(*p) for p in pts], **kw)
    def ell(x0, y0, x1, y1, **kw): d.ellipse([P(x0, y0), P(x1, y1)], **kw)
    def line(pts, **kw): d.line([P(*p) for p in pts], width=int(kw.pop('w') * k), **kw)
    # mast
    line([(512, 700), (512, 150)], fill=(93, 64, 55), w=34)
    # black pirate flag (slight wave)
    flag = [(528, 160)] + [(528 + i * 30, 160 + 22 * math.sin(i * 0.6)) for i in range(1, 12)] + \
           [(528 + i * 30, 470 + 22 * math.sin(i * 0.6)) for i in range(11, 0, -1)] + [(528, 470)]
    poly(flag, fill=(33, 33, 33), outline=(255, 255, 255), width=int(14 * k))
    # skull + crossbones
    cx, cy = 690, 300
    line([(cx - 105, cy + 90), (cx + 105, cy - 30)], fill='white', w=34)
    line([(cx - 105, cy - 30), (cx + 105, cy + 90)], fill='white', w=34)
    for bx, by in [(cx - 108, cy + 92), (cx + 108, cy - 32), (cx - 108, cy - 32), (cx + 108, cy + 92)]:
        ell(bx - 22, by - 22, bx + 22, by + 22, fill='white')
    ell(cx - 80, cy - 105, cx + 80, cy + 45, fill='white')
    d.rounded_rectangle([P(cx - 48, cy + 10), P(cx + 48, cy + 75)], radius=int(18 * k), fill='white')
    ell(cx - 50, cy - 45, cx - 10, cy + 0, fill=(33, 33, 33)); ell(cx + 10, cy - 45, cx + 50, cy + 0, fill=(33, 33, 33))
    # water splash behind canoe
    ell(110, 690, 914, 830, fill=(200, 240, 255))
    # canoe hull (bright orange-red with yellow stripe)
    hull = [(90, 600)] + [(90 + i * (844 / 40), 600 + 170 * math.sin(math.pi * i / 40) ** 0.7) for i in range(1, 40)] + [(934, 600)]
    poly([(60, 560), (130, 640)] + hull[1:-1] + [(894, 640), (964, 560), (870, 640), (154, 640)], fill=(229, 57, 53))
    poly(hull, fill=(229, 57, 53), outline=(140, 30, 30), width=int(16 * k))
    stripe = [(150 + i * (724 / 30), 640 + 95 * math.sin(math.pi * i / 30) ** 0.7) for i in range(31)]
    line(stripe, fill=(255, 210, 63), w=30, joint='curve')
    # gunwale rim
    line([(70, 596), (954, 596)], fill=(140, 30, 30), w=26)
    poly([(30, 500), (130, 600), (66, 610)], fill=(229, 57, 53), outline=(140, 30, 30), width=int(12 * k)); poly([(994, 500), (894, 600), (958, 610)], fill=(229, 57, 53), outline=(140, 30, 30), width=int(12 * k))
    return im

m = master()
m.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
m.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
m.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
m.resize((32, 32), Image.LANCZOS).save(os.path.join(OUT, 'favicon-32.png'), optimize=True)
master(pad=0.2).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
print('icons written')
