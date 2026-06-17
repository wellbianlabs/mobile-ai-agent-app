#!/usr/bin/env python3
"""앱 아이콘/스플래시 자산 생성기 (Pillow).

sky 테마(브랜드 블루 그라데이션 + 흰 구름/해 + AI 스파클)로
- assets/icon.png          1024x1024  메인 아이콘(풀블리드 그라데이션)
- assets/adaptive-icon.png 1024x1024  Android 어댑티브 전경(투명 배경, 세이프존 중앙)
- assets/splash.png        1242x1242  스플래시 로고(투명 배경, 중앙)
- assets/favicon.png       48x48      웹 파비콘
를 생성한다. 4x 슈퍼샘플 후 LANCZOS 축소로 안티앨리어싱.

placeholder 성격의 깔끔한 자산 — 추후 정식 브랜드 아트로 교체 가능.
실행: python scripts/gen_assets.py
"""
import os

from PIL import Image, ImageDraw

ASSETS = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "assets"))
os.makedirs(ASSETS, exist_ok=True)

BRAND_TOP = (46, 134, 222)   # #2E86DE
BRAND_BOT = (74, 160, 230)   # #4AA0E6
WHITE = (255, 255, 255, 255)
SUN = (255, 241, 209, 255)   # 따뜻한 화이트
GOLD = (201, 169, 106, 255)  # WELLBIAN 골드 포인트
S = 4                        # 슈퍼샘플 배율


def vertical_gradient(w, h, top, bot):
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return grad.resize((w, h))


def rounded_rect(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


def sparkle(draw, cx, cy, r, fill):
    """4꼭짓점 반짝임(오목한 마름모)."""
    k = r * 0.30
    pts = [
        (cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k),
        (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k),
    ]
    draw.polygon(pts, fill=fill)


def draw_glyph(img, box):
    """box=(x0,y0,x1,y1) 영역에 해+구름+스파클 글리프를 그린다."""
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    w = x1 - x0
    h = y1 - y0

    # 해 — 우상단, 구름 뒤로 살짝 가려짐
    sun_r = w * 0.17
    scx, scy = x0 + w * 0.70, y0 + h * 0.34
    d.ellipse([scx - sun_r, scy - sun_r, scx + sun_r, scy + sun_r], fill=SUN)

    # 구름 — 둥근 베이스 + 봉우리 원들(흰색)
    base = [x0 + w * 0.14, y0 + h * 0.52, x0 + w * 0.86, y0 + h * 0.74]
    rounded_rect(d, base, r=h * 0.11, fill=WHITE)
    bumps = [
        (x0 + w * 0.44, y0 + h * 0.46, w * 0.22),  # 큰 가운데 봉우리
        (x0 + w * 0.26, y0 + h * 0.58, w * 0.15),  # 좌측
        (x0 + w * 0.66, y0 + h * 0.54, w * 0.18),  # 우측
    ]
    for bx, by, br in bumps:
        d.ellipse([bx - br, by - br, bx + br, by + br], fill=WHITE)

    # AI 스파클 — 구름 좌상단, 골드
    sparkle(d, x0 + w * 0.22, y0 + h * 0.30, w * 0.085, GOLD)
    sparkle(d, x0 + w * 0.30, y0 + h * 0.18, w * 0.045, (255, 255, 255, 235))


def render_glyph_layer(size, box):
    big = (size * S, size * S)
    layer = Image.new("RGBA", big, (0, 0, 0, 0))
    draw_glyph(layer, tuple(v * S for v in box))
    return layer.resize((size, size), Image.LANCZOS)


def make_icon(size=1024):
    bg = vertical_gradient(size, size, BRAND_TOP, BRAND_BOT).convert("RGBA")
    # 모서리를 약간 둥글게(스토어가 마스킹하지만 시각 일관성)
    glyph = render_glyph_layer(size, (size * 0.10, size * 0.10, size * 0.90, size * 0.90))
    bg.alpha_composite(glyph)
    bg.convert("RGB").save(os.path.join(ASSETS, "icon.png"))


def make_adaptive(size=1024):
    # 전경만(투명). Android가 backgroundColor를 깐다. 세이프존(중앙 ~66%)에 글리프.
    inset = size * 0.20
    glyph = render_glyph_layer(size, (inset, inset, size - inset, size - inset))
    glyph.save(os.path.join(ASSETS, "adaptive-icon.png"))


def make_splash(size=1242):
    glyph = render_glyph_layer(size, (size * 0.18, size * 0.18, size * 0.82, size * 0.82))
    glyph.save(os.path.join(ASSETS, "splash.png"))


def make_favicon(size=48):
    bg = vertical_gradient(size, size, BRAND_TOP, BRAND_BOT).convert("RGBA")
    glyph = render_glyph_layer(size, (size * 0.08, size * 0.08, size * 0.92, size * 0.92))
    bg.alpha_composite(glyph)
    bg.convert("RGB").save(os.path.join(ASSETS, "favicon.png"))


if __name__ == "__main__":
    make_icon()
    make_adaptive()
    make_splash()
    make_favicon()
    print("[done] assets:", ", ".join(sorted(os.listdir(ASSETS))))
