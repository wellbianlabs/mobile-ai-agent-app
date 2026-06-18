#!/usr/bin/env python3
"""하늘 배경 이미지 생성기 (Pillow).

시간대·날씨별 차분한 그라데이션 하늘 이미지를 만든다. 가독성을 위해
- 텍스트가 놓이는 상단부는 충분히 진하게(흰 글자 대비 확보)
- 구름 '도형' 없이 부드러운 글로우(해/달) + 은은한 별만 → 글자와 겹치는 잡음 제거
출력: assets/sky/<scene>.png (800x1700)
실행: python scripts/gen_sky.py
"""
import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "assets", "sky"))
os.makedirs(OUT, exist_ok=True)

W, H = 800, 1700
random.seed(7)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vgrad(stops):
    """위→아래 다단 그라데이션(상단부는 진하게 유지)."""
    img = Image.new("RGB", (1, H))
    n = len(stops)
    for y in range(H):
        p = y / (H - 1)
        seg = p * (n - 1)
        i = min(int(seg), n - 2)
        img.putpixel((0, y), lerp(stops[i], stops[i + 1], seg - i))
    return img.resize((W, H))


def add_glow(img, cx, cy, radius, color, strength=1.0):
    """부드러운 원형 글로우(해/달) — screen 합성으로 자연스러운 빛 번짐."""
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    steps = 60
    for s in range(steps, 0, -1):
        r = radius * s / steps
        a = (1 - s / steps) ** 2 * strength
        col = tuple(int(c * a) for c in color)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    glow = glow.filter(ImageFilter.GaussianBlur(radius * 0.18))
    return ImageChops.screen(img, glow)


def add_orb(img, cx, cy, r, color):
    """선명한 해/달 본체(글로우 위에 작은 원)."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (255,))
    overlay = overlay.filter(ImageFilter.GaussianBlur(2))
    img.paste(Image.new("RGB", (W, H), color), (0, 0), overlay)
    return img


def add_stars(img, n=90):
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(n):
        x = random.randint(0, W - 1)
        y = random.randint(0, int(H * 0.6))
        s = random.choice([1, 1, 1, 2])
        a = random.randint(70, 180)
        d.ellipse([x, y, x + s, y + s], fill=(255, 255, 255, a))
    return img


def top_vignette(img, strength=0.18):
    """상단 살짝 어�둑하게(상태바·헤드라인 대비)."""
    ov = Image.new("L", (1, H), 0)
    for y in range(H):
        p = y / (H - 1)
        v = int(255 * strength * max(0, 1 - p / 0.5))  # 상단 50%만
        ov.putpixel((0, y), v)
    mask = ov.resize((W, H))
    dark = Image.new("RGB", (W, H), (8, 16, 34))
    img.paste(dark, (0, 0), mask)
    return img


SCENES = {
    "day-clear": dict(stops=[(20, 96, 200), (54, 150, 225), (118, 188, 240), (175, 214, 244)],
                      orb=(0.80, 0.15, 70, (255, 255, 255)), glow=(255, 250, 235), stars=False, vig=0.16),
    "day-cloudy": dict(stops=[(86, 116, 142), (120, 146, 168), (160, 184, 202), (196, 214, 226)],
                       orb=None, glow=(235, 240, 245), glowpos=(0.7, 0.16, 240), stars=False, vig=0.14),
    "night-clear": dict(stops=[(6, 11, 30), (14, 23, 48), (28, 40, 70), (44, 60, 92)],
                        orb=(0.82, 0.14, 46, (236, 242, 255)), glow=(180, 200, 255), stars=True, vig=0.0),
    "night-cloudy": dict(stops=[(12, 20, 38), (24, 34, 58), (40, 53, 79), (58, 72, 99)],
                         orb=None, glow=(150, 170, 210), glowpos=(0.78, 0.15, 200), stars=True, vig=0.0),
    "rain": dict(stops=[(58, 68, 80), (78, 90, 104), (106, 120, 132), (140, 154, 162)],
                 orb=None, glow=None, stars=False, vig=0.12),
    "rain-night": dict(stops=[(18, 23, 31), (32, 38, 47), (49, 57, 69), (69, 79, 91)],
                       orb=None, glow=None, stars=False, vig=0.0),
    "dawn": dict(stops=[(30, 62, 128), (78, 107, 168), (181, 141, 168), (240, 196, 154)],
                 orb=(0.26, 0.62, 64, (255, 226, 196)), glow=(255, 200, 150), stars=False, vig=0.12),
    "sunset": dict(stops=[(27, 42, 85), (74, 74, 134), (199, 122, 86), (240, 176, 112)],
                   orb=(0.74, 0.5, 84, (255, 224, 160)), glow=(255, 180, 100), stars=False, vig=0.1),
}


def build(name, cfg):
    img = vgrad(cfg["stops"])
    if cfg.get("glow"):
        if cfg.get("orb"):
            gx, gy, gr, _ = cfg["orb"]
            img = add_glow(img, W * gx, H * gy, gr * 3.2, cfg["glow"], 0.9)
        elif cfg.get("glowpos"):
            gx, gy, gr = cfg["glowpos"]
            img = add_glow(img, W * gx, H * gy, gr, cfg["glow"], 0.6)
    if cfg.get("stars"):
        img = add_stars(img)
    if cfg.get("orb"):
        ox, oy, orr, ocol = cfg["orb"]
        img = add_orb(img, W * ox, H * oy, orr, ocol)
    if cfg.get("vig"):
        img = top_vignette(img, cfg["vig"])
    img.save(os.path.join(OUT, f"{name}.png"))


if __name__ == "__main__":
    for n, c in SCENES.items():
        build(n, c)
    print("[done] sky:", ", ".join(sorted(os.listdir(OUT))))
