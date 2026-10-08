# Generates an abstract stand-in for a video thumbnail (no real YouTube content).
# 1280x720 JPEG: dusk gradient, soft bokeh, layered hills, film grain.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
W, H = 1280, 720
rng = np.random.default_rng(42)
y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
top, mid, low = np.array([38, 52, 92]), np.array([222, 120, 84]), np.array([248, 196, 120])
t = np.clip(y * 1.25, 0, 1)
sky = np.where(t[..., None] < .55, top + (mid - top) * (t[..., None] / .55), mid + (low - mid) * ((t[..., None] - .55) / .45))
sky = np.broadcast_to(sky, (H, W, 3)).astype(float).copy()
sun = np.exp(-(((x - .68) ** 2) / .012 + ((y - .58) ** 2) / .02))
sky += sun[..., None] * np.array([60, 50, 20])
img = Image.fromarray(np.clip(sky, 0, 255).astype('uint8'))
bokeh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(bokeh)
for _ in range(38):
    cx, cy, r = rng.integers(0, W), rng.integers(40, 420), rng.integers(10, 46)
    c = tuple(int(v) for v in rng.choice([[255, 214, 160], [255, 170, 120], [200, 220, 255]])) + (int(rng.integers(40, 110)),)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
img = Image.alpha_composite(img.convert('RGBA'), bokeh.filter(ImageFilter.GaussianBlur(6)))
d = ImageDraw.Draw(img)
for base, amp, freq, col in [(470, 60, 2.1, (88, 62, 92)), (540, 50, 3.3, (52, 44, 70)), (620, 40, 4.7, (24, 26, 40))]:
    pts = [(i, base - amp * (np.sin(i / W * np.pi * freq + base) * .6 + np.sin(i / W * np.pi * freq * 2.7) * .4)) for i in range(0, W + 8, 8)]
    d.polygon(pts + [(W, H), (0, H)], fill=col + (255,))
img = img.convert('RGB').filter(ImageFilter.GaussianBlur(1.2))
arr = np.asarray(img).astype(float) + rng.normal(0, 7, (H, W, 1))
vig = 1 - .35 * (((x - .5) ** 2) / .25 + ((y - .5) ** 2) / .25)
Image.fromarray(np.clip(arr * np.clip(vig, .55, 1)[..., None], 0, 255).astype('uint8')).save('img/thumb-example.jpg', quality=86)
print('ok')
