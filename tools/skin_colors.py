# -*- coding: utf-8 -*-
"""v5.5 皮肤生成器 · 色彩引擎（WCAG 对比度硬约束）

纪律：
- 只用 Python 标准库，无第三方依赖（延续 build.py 传统）。
- 任何前景/背景对比度 < 4.5:1 → 构建失败（自动修正仅允许"加深墨色/提亮纸色"，修正后复检）。
- 深浅两套主题同规则校验。
"""
import colorsys


def _clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def hex2rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(rgb):
    return '#%02X%02X%02X' % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def mix(a, b, t):
    """a 向 b 混合 t（0..1）。"""
    ra, ga, ba = hex2rgb(a)
    rb, gb, bb = hex2rgb(b)
    return rgb2hex((ra + (rb - ra) * t, ga + (gb - ga) * t, ba + (bb - ba) * t))


def lum(h):
    """WCAG 相对亮度。"""
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = hex2rgb(h)
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(fg, bg):
    l1, l2 = lum(fg), lum(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hue_of(h):
    r, g, b = hex2rgb(h)
    hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return hh, ss, vv


def tint(h, target_l, hue_keep=1.0):
    """把颜色调整到目标 WCAG 亮度附近（保持色相），用于深色主题的前景自动校正。"""
    lo, hi = 0.0, 1.0
    base_h, base_s, _ = hue_of(h)
    best = h
    for _ in range(24):
        mid = (lo + hi) / 2
        r, g, b = colorsys.hsv_to_rgb(base_h * hue_keep, base_s, mid)
        cand = rgb2hex((r * 255, g * 255, b * 255))
        best = cand
        if lum(cand) < target_l:
            lo = mid
        else:
            hi = mid
    return best


def ensure_contrast(fg, bg, minimum=4.5, mode='auto', max_steps=48):
    """对比度不足时自动修正：前景是暗方→继续加深前景；前景是亮方→继续提亮前景。
    （WCAG：对比度 = (亮方L+.05)/(暗方L+.05)，必须拉大分子/分母之差。）"""
    c = contrast(fg, bg)
    if c >= minimum:
        return fg, c, 0
    darken = lum(fg) < lum(bg)
    cur = fg
    steps = 0
    for i in range(max_steps):
        steps = i + 1
        cur = mix(cur, '#000000' if darken else '#FFFFFF', 0.05)
        c = contrast(cur, bg)
        if c >= minimum:
            return cur, c, steps
    return cur, c, steps


class ContrastError(AssertionError):
    pass


def assert_pair(fg, bg, label, minimum=4.5):
    c = contrast(fg, bg)
    if c < minimum:
        raise ContrastError('%s: %s on %s = %.2f (< %.2f)' % (label, fg, bg, c, minimum))
    return c
