# -*- coding: utf-8 -*-
"""v5.5 皮肤生成器主程序：g36–g85（50 套机制型皮肤）

输出：
  assets/skins-v7.css        全局通道 + 5 引擎核心 + 50 套皮肤块
  assets/skins-v7.js         5 台引擎渲染器 + 运行时（sync/audit）
  assets/skins/index.json    追加 50 条扭蛋清单条目（幂等）
构建约束：任何正文字色对 < 4.5:1 → 抛 ContrastError 中止。
运行：python tools/gen_v7.py   （在仓库根目录执行）
"""
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skin_colors import (mix, lum, contrast, tint, ensure_contrast,
                         assert_pair, ContrastError, hex2rgb)
from skin_spec_v7 import SPEC

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ENGINES = ('grow', 'meter', 'plate', 'vessel', 'motion')
ALWAYS_DARK_DASH = []  # 运行时填充：暗色皮肤 id 列表（tabbar 边线规则用）


# ---------------- 色板派生 ----------------
def _rgb_str(h):
    r, g, b = hex2rgb(h)
    return '%d,%d,%d' % (r, g, b)


def derive_light(an):
    """浅色主题 token（锚点 → 20 token），全部过对比度断言。"""
    bg, card, ink, a1, a2 = an['bg'], an['card'], an['ink'], an['a1'], an['a2']
    p = {}
    p['paper'] = bg
    p['paper-deep'] = mix(bg, ink, 0.07)
    p['surface'] = card
    p['surface-2'] = mix(card, bg, 0.42)
    p['field'] = mix(card, bg, 0.26)
    p['ink'], _, _ = ensure_contrast(ink, bg, 6.0)
    p['ink-2'], _, _ = ensure_contrast(mix(p['ink'], bg, 0.22), card, 4.5)
    p['ink-3'], _, _ = ensure_contrast(mix(p['ink'], bg, 0.42), bg, 4.5)
    p['line'] = mix(p['ink'], bg, 0.82)
    p['line-2'] = mix(p['ink'], bg, 0.70)
    g, _, _ = ensure_contrast(a1, bg, 3.2)
    p['green'] = g
    p['green-deep'] = mix(g, p['ink'], 0.32)
    p['green-soft'] = mix(g, bg, 0.84)
    p['green-line'] = mix(g, bg, 0.52)
    am, _, _ = ensure_contrast(a2, bg, 3.0)
    p['amber'] = am
    p['amber-soft'] = mix(am, bg, 0.82)
    red = mix('#A63A2B', bg, 0.10)
    p['red'] = red
    p['red-soft'] = mix(red, bg, 0.84)
    p['seal'] = mix(red, p['ink'], 0.12)
    p['_a1'] = a1
    p['_a2'] = a2
    return p


def derive_dark(an, dk, always):
    """深色主题 token：always=True（本身是暗底皮肤）做加深，否则由浅色锚点派生。"""
    bg, ink, a1, a2 = an['bg'], an['ink'], an['a1'], an['a2']
    if always:
        dbg = dk.get('dbg') or mix(bg, '#000000', 0.34)
        dcard = dk.get('dcard') or mix(mix(bg, '#000000', 0.26), '#FFFFFF', 0.04)
        dink = dk.get('dink') or mix(ink, '#FFFFFF', 0.04)
        base_a1, base_a2 = a1, a2
    else:
        dbg = dk.get('dbg') or mix(mix('#0A0D10', bg, 0.14), bg, 0.10)
        dcard = dk.get('dcard') or mix(dbg, '#FFFFFF', 0.055)
        dink = dk.get('dink') or tint(mix(ink, bg, 0.30), 0.82)
        base_a1, base_a2 = mix(a1, bg, 0.06), mix(a2, bg, 0.06)
    p = {}
    p['paper'] = dbg
    p['paper-deep'] = mix(dbg, '#000000', 0.32)
    p['surface'] = dcard
    p['surface-2'] = mix(dcard, dbg, 0.44)
    p['field'] = mix(dcard, dbg, 0.28)
    p['ink'], _, _ = ensure_contrast(dink, dbg, 4.5)
    p['ink-2'], _, _ = ensure_contrast(mix(p['ink'], dbg, 0.20), dcard, 4.5)
    p['ink-3'], _, _ = ensure_contrast(mix(p['ink'], dbg, 0.36), dbg, 4.5)
    p['line'] = mix(p['ink'], dbg, 0.82)
    p['line-2'] = mix(p['ink'], dbg, 0.66)
    g, _, _ = ensure_contrast(base_a1, dbg, 3.2)
    p['green'] = g
    p['green-deep'] = mix(g, p['ink'], 0.30)
    p['green-soft'] = mix(g, dbg, 0.80)
    p['green-line'] = mix(g, dbg, 0.46)
    am, _, _ = ensure_contrast(base_a2, dbg, 3.0)
    p['amber'] = am
    p['amber-soft'] = mix(am, dbg, 0.80)
    red = mix('#C4574A', dbg, 0.10)
    p['red'] = red
    p['red-soft'] = mix(red, dbg, 0.80)
    p['seal'] = mix(red, p['ink'], 0.12)
    p['_a1'] = g
    p['_a2'] = am
    return p


def verify_palette(p, label):
    """正文契约：ink/ink-2/ink-3 相对各自承载面 ≥4.5。"""
    assert_pair(p['ink'], p['paper'], label + ' ink/paper', 4.5)
    assert_pair(p['ink-2'], p['surface'], label + ' ink2/surface', 4.5)
    assert_pair(p['ink-3'], p['paper'], label + ' ink3/paper', 4.5)


def tokens_line(p):
    keys = ('paper', 'paper-deep', 'surface', 'surface-2', 'field',
            'ink', 'ink-2', 'ink-3', 'line', 'line-2',
            'green', 'green-deep', 'green-soft', 'green-line',
            'amber', 'amber-soft', 'red', 'red-soft', 'seal')
    return ' '.join('--%s:%s;' % (k, p[k]) for k in keys)


# ---------------- CSS 组装 ----------------
GLOBAL_CSS = """/* ============================================================================
   skins-v7.css · v5.5 五十连发（g36–g85）· 五台机制引擎
   ----------------------------------------------------------------------------
   由 tools/gen_v7.py 生成——手改会被覆盖；要改规格请改 tools/skin_spec_v7.py。
   构建契约（gen_v7.py 强制）：
   · 正文对比度 ink/ink2/ink3 × 各承载面 ≥ 4.5:1（亮暗两套分别校验）
   · 零图片零 canvas 零额外请求；组件 = DOM + CSS + 内联变形
   · 390px 无横向溢出；触控目标 ≥ 44px（引擎交互区统一 44px 最小命中）
   · prefers-reduced-motion 下保留静态形状锚点
   引擎：grow 生长聚合 / meter 表计指针 / plate 铭牌文字 / vessel 容器堆积 / motion 动态往复
   ============================================================================ */

/* ============================================================
   §1 全局通道 · 舞台容器与页面骨架（对齐 v5.4 的 v6 通道语义）
   ============================================================ */
html[data-skin-v7="1"] #skinStage {
  display: block;
  position: relative; z-index: 0;
  height: var(--sk-stage-dom, 176px);
  margin: 2px 0 10px;
  border-radius: var(--radius, 16px);
  overflow: hidden;
  contain: layout paint;
  touch-action: pan-y;
}
html[data-skin-v7="1"] .page { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
@media (min-width: 720px) {
  html[data-skin-v7="1"] #skinStage { max-width: 560px; margin-left: auto; margin-right: auto; }
}
/* 桌面增强：舞台收窄为页头光晕，机制组件保留但不与内容争位（对齐 v5.4 桌面策略） */
@media (min-width: 1024px) {
  html[data-skin-v7="1"] .app-main::before { height: 132px; }
  html[data-skin-v7="1"] .mobile-top { display: none; }
  html[data-skin-v7="1"] #skinStage { max-width: 520px; }
}
/* 暗底皮肤的 tabbar 边线提亮（沿用 v5.4 §1 的深色名单机制） */
@supports (background: color-mix(in srgb, red 50%, transparent)) {
  __DARK_TABBAR_IDS__ { border-top-color: color-mix(in srgb, var(--green-line) 55%, transparent); }
}
/* 触屏等价·压按回弹（引擎组件通用；v5.4 涟漪由 skins-v6.js 提供，此处只补压感） */
@media (hover: none) {
  html[data-skin-v7="1"] #skinStage .gu:active,
  html[data-skin-v7="1"] #skinStage .vs-it:active { transform: scale(.94); }
}

/* ============================================================
   §2 引擎核心 · E-A grow（生长聚合）
   ============================================================ */
#skinStage .gv-units { position: absolute; inset: 0; }
#skinStage .gu {
  position: absolute; margin: 0; padding: 0;
  display: flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px;      /* 触控命中 ≥44px；视觉体由 ::before 承担 */
  background: none; border: 0;
  transition: transform .18s ease;
}
#skinStage .gu > i, #skinStage .gu > b { pointer-events: none; }
#skinStage .gu.pop { animation: skv7-pop .38s cubic-bezier(.3,1.6,.4,1); }
@keyframes skv7-pop { 0% { transform: scale(.2) rotate(-14deg); opacity: 0; }
  70% { transform: scale(1.14); opacity: 1; } 100% { transform: none; } }
#skinStage .gv-tip {
  position: absolute; z-index: 3; padding: 4px 9px; border-radius: 9px;
  background: color-mix(in srgb, var(--ink) 88%, transparent); color: var(--paper);
  font-size: 11px; line-height: 1.2; pointer-events: none; white-space: nowrap;
  transform: translate(-50%, -130%);
  animation: skv7-tip .9s ease forwards;
}
@keyframes skv7-tip { from { opacity: 0; } 18% { opacity: 1; } to { opacity: 0; transform: translate(-50%, -175%); } }
#skinStage .gv-read {
  position: absolute; right: 10px; bottom: 8px; z-index: 2;
  font-size: 11px; color: var(--ink-3); letter-spacing: .02em;
}
#skinStage .gv-empty {
  position: absolute; left: 12px; bottom: 8px; z-index: 2;
  font-size: 11px; color: var(--ink-3);
}

/* ============================================================
   §3 引擎核心 · E-B meter（表计指针）
   ============================================================ */
#skinStage .mt-wrap { position: absolute; inset: 0; }
#skinStage .mt-read {
  position: absolute; right: 12px; bottom: 8px; z-index: 2;
  font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums;
}
#skinStage .mt-read b { font-size: 16px; color: var(--ink); }
#skinStage .mt-badge {
  position: absolute; left: 50%; top: 8px; transform: translateX(-50%); z-index: 3;
  padding: 4px 10px; border-radius: 10px; font-size: 12px;
  background: color-mix(in srgb, var(--ink) 88%, transparent); color: var(--paper);
  pointer-events: none; animation: skv7-tip 1.1s ease forwards;
}
#skinStage .mt-marks { position: absolute; display: flex; flex-direction: column; gap: 14px; }
#skinStage .mt-marks i { display: block; height: 1.5px; background: var(--ink-3); opacity: .55; }
/* column 柱体 */
#skinStage .mt-tube { position: absolute; left: 24px; bottom: 34px; width: 18px; height: calc(100% - 70px); border-radius: 10px; }
#skinStage .mt-col { position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--v, 0) * 100%); transition: height .5s cubic-bezier(.3,1.1,.4,1); }
#skinStage .mt-bulb { position: absolute; left: 16px; bottom: 6px; width: 34px; height: 34px; border-radius: 50%; }
/* gauge 表盘 */
#skinStage .mt-dial { position: absolute; left: 50%; top: 10px; width: 190px; height: 108px; margin-left: -95px; overflow: hidden; }
#skinStage .mt-needle { position: absolute; left: 50%; bottom: 0; width: 4px; margin-left: -2px; transform-origin: 50% 100%; transform: rotate(var(--ang, -120deg)); transition: transform .55s cubic-bezier(.3,1.15,.4,1); }
#skinStage .mt-pin { position: absolute; left: 50%; bottom: 2px; margin-left: -6px; }
/* balance 天平 */
#skinStage .mt-beam { position: absolute; left: 50%; top: 38%; width: 190px; margin-left: -95px; transform: rotate(var(--ang, 0deg)); transition: transform .6s cubic-bezier(.3,1.3,.4,1); }
#skinStage .mt-pan { position: absolute; top: 14px; }
#skinStage .mt-pan.l { left: 0; } #skinStage .mt-pan.r { right: 0; }
#skinStage .mt-colm { position: absolute; left: 50%; bottom: 8px; margin-left: -3px; }
/* cells 电量格 */
#skinStage .mt-cells { position: absolute; left: 50%; top: 34px; width: 220px; margin-left: -110px; display: flex; }
#skinStage .mt-cell { position: relative; }
#skinStage .mt-cell.on { }
/* scalex 横向标尺 */
#skinStage .mt-scale { position: absolute; left: 24px; right: 24px; top: 36px; }
#skinStage .mt-needle-x { position: absolute; top: 0; left: calc(var(--v, .5) * 100%); margin-left: -1px; transition: left .5s cubic-bezier(.3,1.1,.4,1); }
/* rings 浑天 */
#skinStage .rg-stage { position: absolute; inset: 0; }
#skinStage .rg-core { position: absolute; left: 50%; top: 46%; margin: -7px 0 0 -7px; }

/* ============================================================
   §4 引擎核心 · E-C plate（铭牌文字）
   ============================================================ */
#skinStage .pl-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 12px 14px; }
#skinStage .pl-mech { display: flex; align-items: center; justify-content: center; gap: 7px; flex-wrap: wrap; max-width: 100%; }
#skinStage .pl-foot { display: flex; align-items: baseline; gap: 8px; font-size: 11px; color: var(--ink-3); }
#skinStage .pl-foot b { color: var(--ink-2); font-size: 12px; }
#skinStage .pl-dots { display: flex; gap: 5px; }
#skinStage .pl-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--line-2); transition: background .2s; }
#skinStage .pl-dots i.on { background: var(--green); }
#skinStage .pl-empty { font-size: 12px; color: var(--ink-3); }

/* ============================================================
   §5 引擎核心 · E-D vessel（容器堆积）
   ============================================================ */
#skinStage .vs-wrap { position: absolute; inset: 0; }
#skinStage .vs-items { position: absolute; left: 12px; right: 12px; top: 8px; display: flex; gap: 8px; align-items: flex-start; justify-content: center; flex-wrap: wrap; }
#skinStage .vs-it {
  min-width: 44px; min-height: 44px; padding: 0; border: 0; background: none;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  transition: transform .2s ease;
}
#skinStage .vs-it > * { pointer-events: none; }
#skinStage .vs-read { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: var(--ink-3); }
#skinStage .vs-empty { position: absolute; left: 12px; bottom: 8px; font-size: 11px; color: var(--ink-3); }

/* ============================================================
   §6 引擎核心 · E-E motion（动态往复）
   ============================================================ */
#skinStage .mo-stage { position: absolute; inset: 0; }
#skinStage .mo-rotor { transform-origin: 50% 50%; }
#skinStage .mo-run .mo-rotor { animation: skv7-spin var(--mo-dur, 8s) linear infinite; }
#skinStage .mo-boost .mo-rotor { animation-duration: calc(var(--mo-dur, 8s) / 4); }
#skinStage .mo-freeze .mo-rotor { animation-play-state: paused; }
@keyframes skv7-spin { to { transform: rotate(360deg); } }
#skinStage .mo-read { position: absolute; right: 12px; bottom: 8px; font-size: 11px; color: var(--ink-3); z-index: 2; }
#skinStage .mo-empty { position: absolute; left: 12px; bottom: 8px; font-size: 11px; color: var(--ink-3); }

/* ============================================================
   §7 reduced-motion · 省电档静态姿态（形状锚点保留）
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  #skinStage .gu.pop, #skinStage .gv-tip, #skinStage .mt-badge,
  #skinStage .mo-run .mo-rotor, #skinStage .mo-boost .mo-rotor { animation: none; }
  #skinStage .mt-needle, #skinStage .mt-needle-x, #skinStage .mt-beam,
  #skinStage .mt-col { transition: none; }
  #skinStage .mo-run .mo-rotor { transform: rotate(24deg); }
}
"""


# ---------------- JS 组装 ----------------


def emit_skin_css(sp, light, dark, always):
    lines = []
    lines.append('')
    lines.append('/* ============ %s %s · E-%s %s · %s ============ */' % (
        sp['id'], sp['name'], sp['eng'][0].upper(), sp['eng'], sp['bind']))
    ink_rgb = _rgb_str(light['ink'])
    shadow = '0 12px 34px rgba(%s,.10)' % ink_rgb
    shadow_sm = '0 3px 12px rgba(%s,.07)' % ink_rgb
    tab = light['surface'] if not always else light['surface']
    lines.append('html[data-skin="%s"] {' % sp['id'])
    lines.append('  ' + tokens_line(light))
    lines.append('  --radius:14px; --shadow:%s; --shadow-sm:%s;' % (shadow, shadow_sm))
    lines.append('  --a1-2:%s; --a2-2:%s;' % (light['_a1'], light['_a2']))
    lines.append('  --sk-tabbar: color-mix(in srgb, %s 92%%, transparent);' % tab)
    lines.append('  --sk-stage: %s;' % sp['stage'])
    lines.append('  --sk-stage-dom: %dpx;' % sp['h'])
    lines.append('}')
    darksel = '[data-theme="dark"][data-skin="%s"]' % sp['id']
    lines.append(darksel + ' {')
    lines.append('  ' + tokens_line(dark))
    d_rgb = _rgb_str(dark['ink'])
    lines.append('  --shadow:0 12px 34px rgba(0,0,0,.32); --shadow-sm:0 3px 12px rgba(0,0,0,.26);')
    lines.append('  --a1-2:%s; --a2-2:%s;' % (dark['_a1'], dark['_a2']))
    lines.append('  --sk-tabbar: color-mix(in srgb, %s 90%%, transparent);' % dark['surface'])
    lines.append('}')
    lines.append(sp['comp'].rstrip())
    return '\n'.join(lines)


# ---------------- JS 组装 ----------------
JS_HEAD = """/* skins-v7.js · v5.5 五十连发运行时（g36–g85）
   五台机制引擎：grow / meter / plate / vessel / motion。
   职责（与 v5.4 的 skins-v6.js 同纪律）：不改业务逻辑；数据只读 fxDataContext 快照；
   reduced-motion 只关动效不关形状；组件失败不影响账本（try/catch 包裹渲染）。 */
(function () {
  'use strict';

  var V7 = __IDS__;
  var CFG = __CFG__;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var state = { id: '', count: -1, streak: -1, view: 0, lastSig: '' };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function active() { return root.getAttribute('data-skin') || ''; }
  function isV7(id) { return V7.indexOf(id) >= 0; }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  /* ---------------- 数据写入（与 v6 同一数据面） ---------------- */
  function writeData(d) {
    d = d || {};
    var count = Number(d.count) || 0;
    var streak = Number(d.streak) || 0;
    var left = (d.left == null || !isFinite(d.left)) ? null : Math.round(d.left);
    var budget = (d.budget == null || !isFinite(d.budget)) ? 0 : Math.max(1, Math.round(d.budget));
    var progress = clamp((budget - (left == null ? 0 : left)) / budget, 0, 1);
    var leftRatio = (left == null) ? .5 : clamp(left / budget, 0, 1);
    root.style.setProperty('--sk-count', String(count));
    root.style.setProperty('--sk-streak', String(streak));
    root.style.setProperty('--sk-progress', progress.toFixed(4));
    root.style.setProperty('--sk-left-ratio', leftRatio.toFixed(4));
    root.setAttribute('data-sk-recorded', count > 0 ? '1' : '0');
    root.setAttribute('data-sk-over', (left != null && left < 0) ? '1' : '0');
    return { count: count, streak: streak, left: left, budget: budget,
             progress: progress, leftRatio: leftRatio,
             kcal: Math.round(Number(d.kcal) || 0),
             meals: d.meals || {}, macros: d.macros || { p: 0, c: 0, f: 0 },
             items: d.items || [], recorded: count > 0,
             over: left != null && left < 0,
             recentMiss: d.recentMiss || [], recentDates: d.recentDates || [],
             dayphase: root.getAttribute('data-dayphase') || 'noon' };
  }

  /* ---------------- 布局坐标（E-A） ---------------- */
  var LAYOUT = {
    pot: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 44 + (i % 2 ? 9 : -3) + Math.floor(i / 2) * 2, y: 62 - Math.floor(i / 2) * 11 }); return a; },
    string: function (n) { var a = []; for (var i = 0; i < n; i++) { var t = n <= 1 ? .5 : i / (n - 1); a.push({ x: 8 + t * 84, y: 20 + Math.sin(t * Math.PI) * 26 }); } return a; },
    hex: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = i < 7 ? 0 : 1, c = i % 7; a.push({ x: 12 + c * 11.5 + (r ? 5.8 : 0), y: 24 + r * 34 }); } return a; },
    stamps: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = i < 7 ? 0 : 1, c = i % 7; a.push({ x: 8 + c * 12.6, y: 18 + r * 42 }); } return a; },
    tray: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = Math.floor(i / 4), c = i % 4; a.push({ x: 14 + c * 18.5, y: 16 + r * 30 }); } return a; },
    bells: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 12 + i * 12.4, y: 26 }); return a; },
    nests: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = i < 4 ? 0 : 1, c = i % 4; a.push({ x: 12 + c * 19 + (r ? 9 : 0), y: 26 + r * 36 }); } return a; },
    keel: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 6 + i * 9.2, y: 74 - i * 6.2 }); return a; },
    bulbs: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 14 + i * 27, y: 22 }); return a; },
    stones: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 42 + (i % 2 ? 4 : 0), y: 70 - i * 7.4 }); return a; }
  };
  var WEEK_CH = ['日', '一', '二', '三', '四', '五', '六'];
  function weekCh(ds) {
    try {
      var p = String(ds || '').split('-');
      var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return WEEK_CH[dt.getDay()] || '';
    } catch (e) { return ''; }
  }
"""

JS_BODY = """
  /* ---------------- E-A grow 渲染器 ---------------- */
  function renderGrow(box, d, cfg, id) {
    var bind = cfg.bind, N = cfg.max || 8, on = [], labels = [], i;
    if (bind === 'streak') { for (i = 0; i < N; i++) on.push(i < Math.min(d.streak, N)); }
    else if (bind === 'count') { for (i = 0; i < N; i++) on.push(i < Math.min(d.count, N)); }
    else if (bind === 'streak30') { var k = Math.min(Math.round(d.streak / 3), N); for (i = 0; i < N; i++) on.push(i < k); }
    else if (bind === 'miss14' || bind === 'miss12') {
      var m = bind === 'miss14' ? 14 : 12;
      var src = d.recentMiss.slice(-m);
      while (src.length < m) src.unshift(0);
      N = m; on = src.map(function (x) { return !!x; });
      labels = d.recentDates.slice(-m).map(function (dt) { return weekCh(dt); });
      while (labels.length < m) labels.unshift('');
    } else if (bind === 'week7') {
      var s7 = d.recentMiss.slice(-7);
      while (s7.length < 7) s7.unshift(0);
      N = 7; on = s7.map(function (x) { return !!x; });
      labels = d.recentDates.slice(-7).map(function (dt) { return weekCh(dt); });
      while (labels.length < 7) labels.unshift('');
    } else if (bind === 'macro') {
      N = 3; var mc = d.macros || {};
      var vals = [Number(mc.p) || 0, Number(mc.c) || 0, Number(mc.f) || 0];
      var caps = [80, 220, 66];
      on = vals.map(function (v, j) { return v > 0; });
      labels = ['蛋白', '碳水', '脂肪'].map(function (nm, j) {
        return nm + ' ' + vals[j] + 'g'; });
      var pos = LAYOUT.bulbs(3);
      var html = '<div class="sk-decor d-' + id + '"></div><div class="gv-units">';
      for (var j = 0; j < 3; j++) {
        var lit = clamp(vals[j] / caps[j], 0, 1);
        html += '<button type="button" class="gu" data-i="' + j + '" data-tip="' + esc(labels[j]) +
          '" style="left:' + pos[j].x + '%;top:' + pos[j].y + '%;--lit:' + lit.toFixed(2) + '"><i></i><b>' + ['蛋白', '碳水', '脂肪'][j] + '</b></button>';
      }
      html += '</div><div class="gv-read">' + (d.recorded ? '宏量 · 今日' : '宏量 · 等待第一笔') + '</div>';
      box.innerHTML = html;
      return;
    }
    var pos = (LAYOUT[cfg.mech] || LAYOUT.stones)(N);
    var units = '';
    for (i = 0; i < N; i++) {
      var tip = '';
      if (bind === 'streak' || bind === 'streak30') tip = '第' + (i + 1) + '天';
      else if (bind === 'count') tip = (i + 1) + ' 笔';
      else tip = (labels[i] || '') + (on[i] ? '·已记' : '·未记');
      units += '<button type="button" class="gu' + (on[i] ? ' on' : ' off') + '" data-i="' + i + '" data-tip="' + esc(tip) + '" style="left:' + pos[i].x + '%;top:' + pos[i].y + '%"><i></i></button>';
    }
    var read = bind === 'streak' || bind === 'streak30' ? '连续 ' + d.streak + ' 天'
      : bind === 'count' ? '今日 ' + d.count + ' 笔'
      : bind === 'week7' ? '本周 ' + on.filter(Boolean).length + '/7 天'
      : '近 ' + N + ' 天 ' + on.filter(Boolean).length + ' 记';
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="gv-units">' + units + '</div>' +
      (on.some(Boolean) ? '<div class="gv-read">' + esc(read) + '</div>' : '<div class="gv-empty">记下第一笔，' + esc((cfg.tip0 || '这里')) + '就开始生长</div>');
  }

  /* ---------------- E-B meter 渲染器 ---------------- */
  function meterVal(d, cfg) {
    if (cfg.bind === 'progress') return { v: d.progress, big: d.left != null ? d.left : d.kcal, sub: d.left != null ? (d.over ? '超支 kcal' : '结余 kcal') : '已记 kcal' };
    if (cfg.bind === 'leftRatio') return { v: d.leftRatio, big: d.left != null ? d.left : d.kcal, sub: d.left != null ? (d.over ? '超支 kcal' : '结余 kcal') : '已记 kcal' };
    if (cfg.bind === 'deficit') return { v: d.leftRatio, big: d.left != null ? d.left : d.kcal, sub: d.left != null ? (d.over ? '右倾 · 超支' : '左倾 · 结余') : '已记 kcal' };
    if (cfg.bind === 'count') return { v: clamp(d.count / 8, 0, 1), big: d.count, sub: '今日笔数' };
    return { v: d.progress, big: d.kcal, sub: '已记 kcal' };
  }
  function renderMeter(box, d, cfg, id) {
    var m = meterVal(d, cfg);
    var mech = cfg.mech, html = '<div class="sk-decor d-' + id + '"></div><div class="mt-wrap">';
    box.style.setProperty('--v', m.v.toFixed(4));
    if (mech === 'column' || mech === 'gaugecol') {
      html += '<div class="mt-tube"><div class="mt-col"></div></div>';
      html += '<div class="mt-marks" style="right:calc(100% - 54px);top:18px;bottom:44px;width:12px">' + '<i></i><i></i><i></i><i></i><i></i>' + '</div>';
      if (mech === 'gaugecol') html += '<div class="mt-drops"><i></i><i></i><i></i></div>';
      else html += '<div class="mt-bulb"></div>';
    } else if (mech === 'gauge' || mech === 'balance' || mech === 'rings' || mech === 'scalex' || mech === 'swing' || mech === 'cells' || mech === 'hourglass' || mech === 'anemo') {
      if (mech === 'gauge') {
        var ang = -120 + m.v * 240;
        box.style.setProperty('--ang', ang.toFixed(1) + 'deg');
        /* v5.5 修复（验证4/5）：针与轴心嵌在表盘容器内，否则支点脱离弧心 */
        html += '<div class="mt-dial"><div class="mt-needle"></div><div class="mt-pin"></div></div>';
      } else if (mech === 'balance') {
        var tilt = clamp((d.left != null ? d.left : 0) / Math.max(1, d.budget) * 10, -11, 11);
        box.style.setProperty('--ang', tilt.toFixed(1) + 'deg');
        html += '<div class="mt-colm"></div><div class="mt-beam"><span class="mt-pan l"></span><span class="mt-pan r"></span></div>';
      } else if (mech === 'cells') {
        var cells = '', onN = Math.round(m.v * 5);
        for (var ci = 0; ci < 5; ci++) cells += '<span class="mt-cell' + (ci < onN ? ' on' : '') + '"></span>';
        html += '<div class="mt-cells">' + cells + '</div>';
        if (d.over) html += '<div class="mt-badge">超支 · 请留意</div>';
      } else if (mech === 'scalex') {
        html += '<div class="mt-scale"></div><div class="mt-needle-x"></div>';
      } else if (mech === 'swing') {
        html += '<div class="mt-case"><div class="mt-face"></div></div><div class="mt-pend"></div>';
      } else if (mech === 'hourglass') {
        html += '<div class="hg-frame"><div class="hg-glass"></div><div class="hg-top"></div><div class="hg-stream"></div></div>';
      } else if (mech === 'anemo') {
        var meals = d.meals || {}, domI = 0, domV = -1, keys = ['breakfast', 'lunch', 'dinner', 'snack', 'exercise'];
        for (var mi = 0; mi < keys.length; mi++) { var vv = Number(meals[keys[mi]]) || 0; if (vv > domV) { domV = vv; domI = mi; } }
        box.style.setProperty('--vane', (domI * 72 - 108) + 'deg');
        html += '<div class="mo-cups"><i></i><i></i><i></i></div><div class="mo-vane" style="transform:rotate(var(--vane))"></div>';
      } else if (mech === 'rings') {
        var phaseAng = { dawn: -60, noon: -20, dusk: 30, night: 80 }[d.dayphase] || 0;
        var stars = '';
        for (var si = 0; si < Math.min(d.count, 12); si++) {
          var aa = (si * 30 + phaseAng) * Math.PI / 180;
          stars += '<span class="rg-star" style="left:calc(50% + ' + (Math.cos(aa) * 62).toFixed(1) + 'px);top:calc(46% + ' + (Math.sin(aa) * 62 * .62).toFixed(1) + 'px)"></span>';
        }
        html += '<div class="rg-stage"><span class="rg-ring r1"></span><span class="rg-ring r2"></span><span class="rg-ring r3"></span>' + stars + '<span class="rg-core"></span></div>';
      }
    }
    html += '<div class="mt-read"><b>' + esc(String(m.big)) + '</b> ' + esc(m.sub) + '</div></div>';
    box.innerHTML = html;
  }

  /* ---------------- E-C plate 渲染器 ---------------- */
  var PL_VIEWS = ['今天', '清单', '三餐'];
  function plateView(d, v) {
    if (v === 1) {
      var its = d.items.slice(-6);
      return { type: 'list', rows: its.map(function (x) { return { name: x.name || '一餐', kcal: Math.round(x.kcal || 0) }; }) };
    }
    if (v === 2) {
      var meals = d.meals || {}, rows = [];
      [['breakfast', '早'], ['lunch', '午'], ['dinner', '晚'], ['snack', '点'], ['exercise', '动']].forEach(function (mm) {
        rows.push({ name: mm[1], kcal: Math.round(Number(meals[mm[0]]) || 0) });
      });
      return { type: 'chips', rows: rows };
    }
    return { type: 'num', big: d.left != null ? (d.over ? '-' + Math.abs(d.left) : String(d.left)) : String(d.kcal),
             sub: d.left != null ? (d.over ? '超支 kcal' : '结余 kcal') : '已记 kcal' };
  }
  function renderPlate(box, d, cfg, id) {
    var mech = cfg.mech, view = clamp(state.view, 0, 2), pv = plateView(d, view);
    var dots = '<div class="pl-dots">' + PL_VIEWS.map(function (nm, j) { return '<i class="' + (j === view ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    var inner = '';
    if (mech === 'flap') {
      var s = String(pv.type === 'num' ? pv.big : (d.count || 0));
      if (s.length > 6) s = s.slice(0, 6);
      inner = s.split('').map(function (ch, j) { return '<span class="fl-cell"><b>' + esc(ch === '-' ? '–' : ch) + '</b></span>'; }).join('');
    } else if (mech === 'type' || mech === 'marquee') {
      if (pv.type === 'list') inner = pv.rows.slice(0, 5).map(function (r) { return '<span class="ty-cell">' + esc(String(r.name).slice(0, 4)) + '</span>'; }).join('');
      else if (pv.type === 'chips') inner = pv.rows.filter(function (r) { return r.kcal > 0; }).map(function (r) { return '<span class="ty-cell ink">' + esc(r.name) + '</span>'; }).join('') || '<span class="pl-empty">三餐未记</span>';
      else inner = '<span class="ty-cell">' + esc(pv.sub.split(' ')[0]) + '</span><span class="ty-cell ink">' + esc(String(pv.big)) + '</span><span class="ty-cell">kcal</span>';
    } else if (mech === 'rods') {
      var num = Math.abs(Number(pv.type === 'num' ? pv.big : d.kcal) || 0);
      var digits = String(num).split('');
      inner = digits.map(function (dg) {
        var n = Number(dg) || 0;
        var vert = Math.min(n, 5), hor = n > 5 ? 1 : 0;
        var g1 = '', j;
        for (j = 0; j < vert; j++) g1 += '<i class="rd-i"></i>';
        for (j = 0; j < hor; j++) g1 += '<i class="rd-i h"></i>';
        if (!g1) g1 = '<i class="rd-i" style="opacity:.15"></i>';
        return '<span class="rd-group">' + g1 + '</span>';
      }).join('');
    } else if (mech === 'led') {
      inner = '<div><div class="led-num">' + esc(String(pv.type === 'num' ? pv.big : d.count)) + '</div><div class="led-sub">' + esc(pv.type === 'num' ? pv.sub : 'PASS · 今日') + '</div></div>';
    } else if (mech === 'floors') {
      var fl = clamp(d.count, 0, 9);
      box.style.setProperty('--fl', String(fl));
      inner = '<div class="fl-rail"></div><div class="fl-cab" style="top:calc(58px - var(--fl,0)*14px)"></div><div class="fl-num">' + fl + '</div>';
    } else if (mech === 'seal') {
      inner = '<span class="se-flap"></span><span class="se-wax"><b>' + (d.recorded ? '记' : '空') + '</b></span>';
    } else if (mech === 'chalk') {
      /* v5.5 修复（验证4/5）：视图感知文案——有记录时不得显示「空空如也」 */
      var ckRows = '';
      if (pv.type === 'list') {
        ckRows = pv.rows.length ? pv.rows.slice(0, 5).map(function (r) { return '<div class="ck-line">' + esc(r.name) + '<em>' + r.kcal + ' kcal</em></div>'; }).join('') : '<div class="ck-line">今日还没有记录</div>';
      } else if (pv.type === 'chips') {
        ckRows = pv.rows.filter(function (r) { return r.kcal > 0; }).map(function (r) { return '<div class="ck-line">' + esc(r.name) + '<em>' + r.kcal + ' kcal</em></div>'; }).join('') || '<div class="ck-line">三餐未记</div>';
      } else {
        ckRows = d.recorded ? '<div class="ck-line">今日 ' + d.count + ' 笔<em>' + d.kcal + ' kcal</em></div>' : '<div class="ck-line">今日菜单空空如也</div>';
      }
      inner = '<div class="ck-board">' + ckRows + '</div>';
    } else if (mech === 'weights') {
      inner = '<div class="wt-row">' + (pv.type === 'chips' ? pv.rows.map(function (r) { return '<span class="wt-chip"><b>' + esc(r.name) + '</b><i>' + r.kcal + '</i></span>'; }).join('') : '<span class="pl-empty">左右滑动看三餐</span>') + '</div>';
    } else if (mech === 'tide') {
      var ticks = '';
      for (var ti = 0; ti < 9; ti++) ticks += '<i></i>';
      inner = '<div class="td-board"><div class="td-num">' + esc(String(pv.type === 'num' ? pv.big : d.kcal)) + '</div><div class="td-ticks">' + ticks + '</div></div>';
    }
    var foot = pv.type === 'num' ? '<b>' + esc(String(pv.big)) + '</b> ' + esc(pv.sub)
      : pv.type === 'list' ? '<b>' + pv.rows.length + '</b> 条今日记录 · 左右滑切换'
      : '<b>三餐</b> 结构 · 左右滑切换';
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="pl-wrap">' +
      (mech === 'chalk' ? '' : dots) + '<div class="pl-mech">' + inner + '</div><div class="pl-foot">' + foot + '</div></div>';
    if (mech === 'flap' && !reduced) box.querySelectorAll('.fl-cell').forEach(function (c, j) { setTimeout(function () { c.classList.add('flip'); }, j * 60); });
  }

  /* ---------------- E-D vessel 渲染器 ---------------- */
  function renderVessel(box, d, cfg, id) {
    var mech = cfg.mech, items = d.items.slice(-6), i;
    var inner = '';
    if (mech === 'rack') {
      inner = items.map(function (x) { return '<button type="button" class="vs-it" data-tip="' + esc(x.name || '一餐') + ' ' + Math.round(x.kcal || 0) + '"><i></i><b>' + esc(String(x.name || '一餐').slice(0, 4)) + '</b></button>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="vs-body">' + (inner || '') + '</div>' +
        (items.length ? '<div class="vs-read">' + items.length + ' 封今日来信</div>' : '<div class="vs-empty">记下第一笔，信匣就有了第一封信</div>');
      return;
    }
    if (mech === 'stack') {
      var n = clamp(d.count, 0, 4), lay = '';
      for (i = 0; i < n; i++) lay += '<div class="st-layer" style="bottom:' + (8 + i * 30) + 'px"></div>';
      lay += '<div class="st-steam"></div>';
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="vs-body">' + lay + '</div>' +
        '<div class="vs-read">' + (n ? '笼叠 ' + n + ' 层 · ' + d.count + ' 笔' : '空笼 · 记一笔开笼') + '</div>';
      return;
    }
    if (mech === 'tube') {
      var sticks = items.map(function (x, j) { return '<span class="st-stick" style="left:calc(50% + ' + ((j - (items.length - 1) / 2) * 9) + 'px);transform:rotate(' + ((j % 2 ? 1 : -1) * (2 + j)) + 'deg)"><b>' + esc(String(x.name || '签').slice(0, 6)) + '</b></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="vs-items">' + sticks + '</div><div class="vs-body"></div>' +
        (items.length ? '<div class="vs-read">' + items.length + ' 支今日签</div>' : '<div class="vs-empty">摇一摇 · 记一笔起签</div>');
      return;
    }
    if (mech === 'puppet') {
      var figs = items.map(function (x, j) { return '<span class="pp-fig" style="left:calc(12% + ' + (j * 13) + '%)"></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="pp-stage">' + figs + '</div>' +
        '<div class="vs-read">' + (items.length ? items.length + ' 位影人登台' : '幕布后空无一人 · 记一笔开演') + '</div>';
      return;
    }
    if (mech === 'wok') {
      var bits = items.map(function (x, j) { return '<span class="wk-bit" style="left:calc(50% + ' + (-24 + j * 9) + 'px);top:calc(100% - ' + (52 + (j % 3) * 7) + 'px)"></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div>' + bits + '<div class="wk-pan"></div>' + (d.recorded ? '<div class="wk-flame"></div>' : '') +
        '<div class="vs-read">' + (items.length ? '锅中 ' + items.length + ' 味 · ' + d.kcal + ' kcal' : '灶膛未点火 · 记一笔开灶') + '</div>';
      return;
    }
    if (mech === 'jarfill') {
      box.style.setProperty('--v', d.progress.toFixed(4));
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="jr-pot"><div class="jr-fill"></div><div class="jr-seal"></div></div>' +
        '<div class="vs-read"><b>' + (d.left != null ? d.left : d.kcal) + '</b> ' + (d.left != null ? (d.over ? '超支' : '结余') : '已记') + ' kcal</div>';
      return;
    }
    if (mech === 'shelf') {
      var books = items.map(function (x, j) {
        var w = clamp(18 + Math.round((x.kcal || 0) / 30), 18, 44);
        return '<span class="sh-book" style="left:calc(14% + ' + j * 11 + '%);width:' + w + 'px;height:' + clamp(46 + (j % 3) * 8, 46, 66) + 'px" data-tip="' + esc(x.name || '') + ' ' + Math.round(x.kcal || 0) + '"></span>';
      }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div>' + books + '<div class="sh-board"></div>' +
        (items.length ? '<div class="vs-read">今日 ' + items.length + ' 册 · 点书脊看热量</div>' : '<div class="vs-empty">书架空着 · 记一笔上架</div>');
      return;
    }
    if (mech === 'well') {
      box.style.setProperty('--v', d.leftRatio.toFixed(4));
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="wl-frame"></div><div class="wl-rope"></div><div class="wl-bucket"></div><div class="wl-pit"><div class="wl-water"></div></div>' +
        '<div class="vs-read">水位 ' + Math.round(d.leftRatio * 100) + '% · ' + (d.left != null ? d.left : '--') + ' kcal</div>';
      return;
    }
    if (mech === 'basket') {
      var fruits = items.map(function (x, j) { return '<span class="bk-fruit c' + (j % 3) + '" style="left:calc(50% + ' + (-30 + (j % 4) * 16) + 'px);bottom:' + (40 + Math.floor(j / 4) * 18) + 'px" data-tip="' + esc(x.name || '') + '"></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div>' + fruits + '<div class="bk-basket"></div>' +
        (items.length ? '<div class="vs-read">今日收获 ' + items.length + ' 味</div>' : '<div class="vs-empty">篮子还空 · 记一笔开始收获</div>');
      return;
    }
    /* icebox */
    box.style.setProperty('--v', d.leftRatio.toFixed(4));
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="ib-box"><div class="ib-ice"></div></div><div class="ib-lid"></div>' +
      '<div class="vs-read">冰层 ' + Math.round(d.leftRatio * 100) + '% · ' + (d.left != null ? d.left : '--') + ' kcal</div>';
  }

  /* ---------------- E-E motion 渲染器 ---------------- */
  function renderMotion(box, d, cfg, id) {
    var mech = cfg.mech;
    var dur = d.recorded ? (16 - 12 * d.progress) : 0;
    box.style.setProperty('--mo-dur', (dur ? Math.max(3.2, dur) : 8).toFixed(2) + 's');
    var run = d.recorded && !reduced ? ' mo-run' : '';
    box.className = box.className.replace(/\\bmo-\\S+/g, '').trim() + run;
    var inner = '';
    if (mech === 'disc') {
      inner = '<div class="mo-rotor"></div><div class="mo-arm"></div>';
    } else if (mech === 'wheel') {
      inner = '<div class="mo-rotor"><i></i><i></i><i></i><i></i></div><div class="mo-flow"></div>';
    } else if (mech === 'pinwheel') {
      inner = '<div class="mo-rotor"><i></i><i></i><i></i><i></i></div>';
    } else if (mech === 'lantern') {
      var its = d.items.slice(-4);
      var nm = its.length ? its[(state.count >= 0 ? its.length - 1 : 0)] : null;
      inner = '<div class="lt-cap"></div><div class="lt-body"><span class="lt-face">' + esc(nm ? String(nm.name).slice(0, 5) : (d.recorded ? '今日' + d.count + '笔' : '等待点灯')) + '</span></div><div class="lt-tassel"></div>';
    } else if (mech === 'loom') {
      var src = d.recentMiss.slice(-14); while (src.length < 14) src.unshift(0);
      var cells = '';
      for (var i = 0; i < 14; i++) cells += '<span class="lw-cell' + (src[i] ? ' on' : '') + '"></span>';
      inner = '<div class="lw-warp">' + cells + '</div><div class="lw-shuttle"></div>';
    } else if (mech === 'top') {
      box.classList.toggle('tilt', !!d.over);
      inner = '<div class="mo-rotor"></div><div class="mo-ring"></div>';
    } else if (mech === 'music') {
      inner = (d.recorded ? '<b class="mu-note">♪</b><b class="mu-note">♫</b>' : '') + '<div class="mu-comb"></div><div class="mu-cyl"></div>';
    } else if (mech === 'odo') {
      var s = String(d.count), pad = '';
      for (var pi = s.length; pi < 6; pi++) pad += '0';
      var rolled = state.count >= 0 && d.count !== state.count ? ' roll' : '';
      inner = '<div class="od-win">' + (pad + s).split('').map(function (dg) { return '<span class="od-digit' + rolled + '">' + dg + '</span>'; }).join('') + '</div>';
    } else if (mech === 'fan') {
      inner = '<div class="fn-guard"></div><div class="mo-rotor"><i></i><i></i><i></i><span class="mo-hub"></span></div>';
    } else { /* sundial */
      var pa = { dawn: -56, noon: -6, dusk: 48, night: 96 }[d.dayphase || 'noon'] || 0;
      box.style.setProperty('--sd', pa + 'deg');
      var meals = d.meals || {};
      var marks = [['早', '12%', Number(meals.breakfast) || 0], ['午', '42%', Number(meals.lunch) || 0], ['晚', '72%', Number(meals.dinner) || 0]].map(function (mm) {
        return '<span class="sd-meal" style="left:' + mm[1] + ';opacity:' + (mm[2] > 0 ? '.95' : '.3') + '">' + mm[0] + '</span>';
      }).join('');
      inner = '<div class="sd-dial"><div class="sd-marks"></div>' + marks + '<div class="sd-shadow" style="transform:rotate(var(--sd,0deg))"></div><div class="sd-gnomon"></div></div>';
    }
    var read = mech === 'sundial' ? ({ dawn: '晨光', noon: '日中', dusk: '暮色', night: '夜晷' }[d.dayphase] || '') + ' · ' + d.count + ' 笔'
      : d.recorded ? '运转中 · ' + Math.round((d.left != null ? d.leftRatio : d.progress) * 100) + '%'
      : '静默 · 记一笔启动';
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="mo-stage">' + inner + '</div><div class="mo-read">' + esc(read) + '</div>' +
      (!d.recorded ? '<div class="mo-empty">' + esc(cfg.tip0 || '记下第一笔，机构开始运转') + '</div>' : '');
  }

  /* ---------------- 交互 ---------------- */
  function bindTap(box) {
    if (box.dataset.tapBound) return;
    box.dataset.tapBound = '1';
    box.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('.gu, .vs-it, .sh-book, .bk-fruit, .ty-cell') : null;
      if (!t) return;
      var tip = t.getAttribute('data-tip') || t.dataset.tip;
      if (t.classList.contains('ty-cell')) { t.classList.add('ink'); return; }
      if (!tip) return;
      if (reduced) return;
      var r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
      var s = el('<span class="gv-tip"></span>');
      s.textContent = tip;
      s.style.left = (r.left - b.left + r.width / 2) + 'px';
      s.style.top = (r.top - b.top) + 'px';
      box.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.remove(); }, 950);
      if (t.classList.contains('gu')) {
        t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      }
    });
  }
  function bindVesselOpen(box) {
    if (box.dataset.vopenBound) return;
    box.dataset.vopenBound = '1';
    box.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.gu, .vs-it, .sh-book, .bk-fruit')) return;
      box.classList.toggle('v-open');
    });
  }
  /* v5.5 修复（验证4/5）：表计引擎的签名交互「点按表盘 → 精确数字徽章」此前漏绑定 */
  function bindMeterTap(box) {
    if (box.dataset.meterTapBound) return;
    box.dataset.meterTapBound = '1';
    box.addEventListener('click', function (ev) {
      if (reduced) return;
      if (ev.target.closest && ev.target.closest('.gu, .vs-it')) return;
      var id = active(), cfg = CFG[id];
      if (!cfg || cfg.eng !== 'meter' || box.querySelector('.mt-badge')) return;
      var m = meterVal(state.lastData || {}, cfg);
      var s = el('<div class="mt-badge"></div>');
      s.textContent = m.big + ' ' + (cfg.unit || 'kcal');
      box.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.remove(); }, 1150);
    });
  }
  function bindSwipe(box) {
    if (box.dataset.swipeBound) return;
    box.dataset.swipeBound = '1';
    var x0 = null;
    box.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    box.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) < 36) return;
      state.view = clamp(state.view + (dx < 0 ? 1 : -1), 0, 2);
      var id = active();
      if (CFG[id] && CFG[id].eng === 'plate') renderStage(id, state.lastData, true);
    });
  }
  function bindFlick(box) {
    if (box.dataset.flickBound) return;
    box.dataset.flickBound = '1';
    var x0 = null, t0 = 0, pressT = 0;
    box.addEventListener('pointerdown', function (e) {
      x0 = e.clientX; t0 = Date.now();
      pressT = setTimeout(function () { box.classList.add('mo-freeze'); }, 430);
    });
    box.addEventListener('pointerup', function (e) {
      clearTimeout(pressT);
      box.classList.remove('mo-freeze');
      if (x0 == null) return;
      var dx = e.clientX - x0, dt = Date.now() - t0; x0 = null;
      if (Math.abs(dx) > 40 && dt < 500 && !reduced) {
        box.classList.add('mo-boost');
        setTimeout(function () { box.classList.remove('mo-boost'); }, 2200);
      }
    });
    box.addEventListener('pointercancel', function () { clearTimeout(pressT); box.classList.remove('mo-freeze'); x0 = null; });
  }

  /* ---------------- 渲染编排 ---------------- */
  var RENDER = { grow: renderGrow, meter: renderMeter, plate: renderPlate, vessel: renderVessel, motion: renderMotion };
  function renderStage(id, d, force) {
    var cfg = CFG[id];
    var box = document.getElementById('skinStage');
    if (!box || !cfg || !RENDER[cfg.eng]) return;
    var sig = [d.count, d.streak, d.left, d.progress.toFixed(3), state.view,
               (d.items || []).map(function (x) { return x.id; }).join(','), d.dayphase].join('|');
    if (!force && sig === state.lastSig) return;
    state.lastSig = sig; state.lastData = d;
    try { RENDER[cfg.eng](box, d, cfg, id); } catch (e) { /* 皮肤组件失败不影响账本 */ }
    if (cfg.eng === 'grow') bindTap(box);
    if (cfg.eng === 'meter') bindMeterTap(box);   /* v5.5：表计签名交互 */
    if (cfg.eng === 'vessel') { bindTap(box); bindVesselOpen(box); }
    if (cfg.eng === 'plate') bindSwipe(box);
    if (cfg.eng === 'motion') bindFlick(box);
  }

  /* ---------------- 动态 manifest（对齐 v6） ---------------- */
  var lastManifestSkin = '';
  function swapManifest(id) {
    if (!isV7(id) || id === lastManifestSkin) return;
    var link = document.querySelector('link[rel="manifest"]');
    if (!link || !URL || !URL.createObjectURL) return;
    var cs = getComputedStyle(root);
    var paper = (cs.getPropertyValue('--paper') || '').trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(paper)) return;
    fetch('manifest.webmanifest', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (!m) return;
        m.theme_color = paper; m.background_color = paper;
        var blob = new Blob([JSON.stringify(m)], { type: 'application/manifest+json' });
        link.setAttribute('href', URL.createObjectURL(blob));
        lastManifestSkin = id;
      })
      .catch(function () { /* 离线保持原 manifest */ });
  }

  function sync(id, data) {
    var cfg = CFG[id];
    if (!isV7(id) || !cfg) {
      root.removeAttribute('data-skin-v7');
      root.removeAttribute('data-skin-v7-eng');
      if (isV7(state.id) && !isV7(id)) { state.id = ''; state.lastSig = ''; state.view = 0; }
      return;
    }
    state.id = id;
    root.setAttribute('data-skin-v7', '1');
    root.setAttribute('data-skin-v7-eng', cfg.eng);
    var d = writeData(data);
    if (document.getElementById('skinStage')) {
      renderStage(id, d, id !== sync.lastId);
      sync.lastId = id;
    } else {
      document.addEventListener('DOMContentLoaded', function () { renderStage(id, writeData(data), true); }, { once: true });
    }
    swapManifest(id);
    state.count = d.count;
    state.streak = d.streak;
  }

  /* ---------------- auditV7 ---------------- */
  function auditV7() {
    var de = document.documentElement;
    var box = document.getElementById('skinStage');
    var id = de.getAttribute('data-skin') || '';
    var cfg = CFG[id] || null;
    var out = {
      skin: id,
      v7: de.getAttribute('data-skin-v7') === '1',
      eng: de.getAttribute('data-skin-v7-eng') || '',
      expect: cfg ? { eng: cfg.eng, mech: cfg.mech, bind: cfg.bind } : null,
      data: {
        count: root.style.getPropertyValue('--sk-count').trim(),
        streak: root.style.getPropertyValue('--sk-streak').trim(),
        progress: root.style.getPropertyValue('--sk-progress').trim(),
        leftRatio: root.style.getPropertyValue('--sk-left-ratio').trim()
      },
      stage: {
        mounted: !!box && box.offsetHeight > 0,
        h: box ? Math.round(box.offsetHeight) : 0,
        children: box ? box.childElementCount : 0
      },
      reduced: reduced,
      manifestSwapped: lastManifestSkin === active() && isV7(active())
    };
    return out;
  }

  window.SkinV7 = {
    ids: V7,
    sync: sync,
    audit: auditV7,
    state: function () { return { id: state.id, view: state.view, count: state.count, streak: state.streak }; },
    detail: function (on) { var box = document.getElementById('skinStage'); if (box) box.style.visibility = on ? '' : 'hidden'; }
  };
})();
"""


def emit_cfg():
    cfg = {}
    for sp in SPEC:
        c = dict(sp.get('cfg') or {})
        c['eng'] = sp['eng']
        c['mech'] = sp['mech']
        c['bind'] = sp['bind']
        c['max'] = sp['max']
        c['h'] = sp['h']
        c['tip0'] = sp['name'].split('·')[0]
        cfg[sp['id']] = c
    return json.dumps(cfg, ensure_ascii=False, separators=(',', ':'))


def emit_ids():
    return '[' + ','.join('"%s"' % sp['id'] for sp in SPEC) + ']'


def emit_dark_tabbar():
    ids = [sp['id'] for sp in SPEC if (sp.get('dark') or {}).get('always')]
    sel = ',\n  '.join('html[data-skin="%s"] .tabbar' % i for i in ids)
    return sel


def build_css():
    global ALWAYS_DARK_DASH
    parts = [GLOBAL_CSS.replace('__DARK_TABBAR_IDS__', emit_dark_tabbar())]
    for sp in SPEC:
        an = sp['anchors']
        dk = sp.get('dark') or {}
        always = bool(dk.get('always'))
        light = derive_light(an)
        dark = derive_dark(an, dk, always)
        verify_palette(light, sp['id'] + ' light')
        verify_palette(dark, sp['id'] + ' dark')
        parts.append(emit_skin_css(sp, light, dark, always))
    return '\n'.join(parts) + '\n'


def build_js():
    js = JS_HEAD.replace('__IDS__', emit_ids()).replace('__CFG__', emit_cfg()) + JS_BODY
    return js


def build_manifest():
    path = os.path.join(ROOT, 'assets', 'skins', 'index.json')
    with io.open(path, encoding='utf-8') as f:
        data = json.load(f)
    items = [x for x in data['items'] if not (str(x.get('id', '')).startswith('g') and
             str(x['id'])[1:].isdigit() and int(str(x['id'])[1:]) >= 36)]
    new_items = []
    for sp in SPEC:
        an = sp['anchors']
        p = derive_light(an)
        new_items.append({
            'id': sp['id'], 'name': sp['name'], 'tier': 'top', 'src': '扭蛋限定',
            'swatch': p['paper'], 'ink': p['ink'], 'tag': sp['tag'],
            'accent': p['green'], 'pending': False
        })
    data['items'] = items + new_items
    data['version'] = 'v5.5'
    data['note'] = 'v5.5：+50 套机制型皮肤 (g36-g85，五台引擎×10)，扭蛋池 50→100；由 tools/gen_v7.py 生成'
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    return len(data['items'])


def main():
    css = build_css()
    js = build_js()
    n = build_manifest()
    with io.open(os.path.join(ROOT, 'assets', 'skins-v7.css'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    with io.open(os.path.join(ROOT, 'assets', 'skins-v7.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    print('skins-v7.css %dB · skins-v7.js %dB · manifest items=%d' % (
        len(css.encode('utf-8')), len(js.encode('utf-8')), n))


if __name__ == '__main__':
    main()
