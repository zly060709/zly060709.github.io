# -*- coding: utf-8 -*-
"""v5.5/v6.0 移动身份层生成器：M 表 40 套存量皮肤（g01–g25 / 5 套立绘 / 10 套 a-*）+ L 表 25 套本地皮肤的
专属舞台场景 + 页头徽记 + 形状语言 + tabbar 指示形状。

输出：assets/skins-m.css（40 套，always-loaded）+ assets/skins-l.css（25 套本地，always-loaded ≤ 30KB）
纪律：全部规则在 html[data-skin="…"] 作用域内，paper 默认态零影响；
场景只写 .app-main::before 背景层，不动盒模型；
立绘 5 套场景从轻（body 已有立绘层，避免抢戏）。
运行：python tools/gen_m.py   （在仓库根目录执行）
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (id, 徽记字, 舞台场景, 卡片圆角, tab指示形状)
# tab 形状: bar=竖杠 diamond=菱形 dot2=双点 moon=半月 wave=波浪杠
M = [
# ---- g01-g25 强化皮肤（CSS 材质背景，场景可以浓） ----
('g01', '汤',
 'radial-gradient(16% 42% at 28% 86%, rgba(255,255,255,.5), transparent 72%),'
 'radial-gradient(14% 36% at 48% 92%, rgba(255,255,255,.42), transparent 72%),'
 'radial-gradient(18% 44% at 68% 84%, rgba(255,255,255,.46), transparent 72%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 78%),'
 'linear-gradient(180deg, transparent 80%, rgba(255,255,255,.38) 80%, transparent 100%)',
 '4px 18px 4px 18px', 'moon'),
('g02', '鲸',
 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 8px, transparent 8px 30px),'
 'radial-gradient(circle 4px at 22% 78%, rgba(255,255,255,.4) 96%, transparent),'
 'radial-gradient(circle 3px at 30% 64%, rgba(255,255,255,.3) 96%, transparent),'
 'radial-gradient(circle 5px at 38% 82%, rgba(255,255,255,.28) 96%, transparent),'
 'radial-gradient(circle 3px at 70% 58%, rgba(255,255,255,.3) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 46%),'
 'linear-gradient(180deg, transparent 55%, rgba(20,50,48,.22) 100%)',
 '18px 18px 4px 18px', 'bar'),
('g03', '云',
 'linear-gradient(180deg, transparent 18%, rgba(255,255,255,.8) 26%, rgba(255,255,255,.4) 34%, transparent 46%),'
 'repeating-linear-gradient(90deg, rgba(60,70,80,.10) 0 16px, transparent 16px 28px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 80%),'
 'linear-gradient(180deg, transparent 82%, rgba(90,100,110,.16) 84%, transparent 96%)',
 '3px', 'bar'),
('g04', '昏',
 'radial-gradient(circle 42px at 78% 34%, rgba(255,176,88,.42), rgba(255,176,88,.10) 62%, transparent 70%),'
 'repeating-linear-gradient(0deg, rgba(120,80,40,.05) 0 2px, transparent 2px 7px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%),'
 'linear-gradient(180deg, transparent 72%, rgba(140,80,30,.16) 100%)',
 '3px 14px 14px 14px', 'diamond'),
('g05', '竹',
 'repeating-linear-gradient(90deg, transparent 0 34px, rgba(96,120,74,.18) 34px 38px, transparent 38px 76px),'
 'repeating-linear-gradient(78deg, rgba(255,255,255,.12) 0 1px, transparent 1px 15px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '2px 16px 2px 16px', 'wave'),
('g06', '读',
 'radial-gradient(52% 62% at 50% -12%, rgba(255,206,138,.30), transparent 72%),'
 'repeating-linear-gradient(0deg, transparent 0 26px, rgba(64,44,34,.15) 26px 28px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '4px', 'bar'),
('g07', '光',
 'linear-gradient(100deg, transparent 8%, rgba(120,220,170,.20) 28%, rgba(140,190,255,.16) 48%, rgba(190,150,255,.12) 64%, transparent 82%),'
 'radial-gradient(circle 2px at 18% 30%, rgba(255,255,255,.8) 96%, transparent),'
 'radial-gradient(circle 2px at 64% 22%, rgba(255,255,255,.7) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '16px 16px 4px 4px', 'diamond'),
('g08', '庭',
 'linear-gradient(180deg, transparent 24%, rgba(166,58,43,.30) 24% 29%, transparent 29%),'
 'radial-gradient(circle 6px at 24% 44%, rgba(214,120,60,.4) 96%, transparent),'
 'radial-gradient(circle 6px at 76% 44%, rgba(214,120,60,.4) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '4px 4px 14px 14px', 'moon'),
('g09', '森',
 'repeating-linear-gradient(0deg, rgba(80,110,190,.07) 0 1px, transparent 1px 22px),'
 'repeating-linear-gradient(90deg, rgba(80,110,190,.07) 0 1px, transparent 1px 22px),'
 'radial-gradient(circle 3px at 30% 40%, rgba(120,220,255,.5) 96%, transparent),'
 'radial-gradient(circle 3px at 62% 28%, rgba(120,220,255,.45) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '4px', 'bar'),
('g10', '漠',
 'radial-gradient(130% 44% at 50% 108%, rgba(150,110,60,.30), transparent 70%),'
 'radial-gradient(circle 2px at 26% 26%, rgba(255,255,240,.9) 96%, transparent),'
 'radial-gradient(circle 2px at 44% 18%, rgba(255,255,240,.8) 96%, transparent),'
 'radial-gradient(circle 2px at 82% 30%, rgba(255,255,240,.85) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '2px 18px 18px 18px', 'diamond'),
('g11', '咖',
 'repeating-linear-gradient(96deg, rgba(120,130,150,.16) 0 1px, transparent 1px 11px),'
 'radial-gradient(46% 52% at 82% 18%, rgba(220,160,90,.28), transparent 72%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '14px 4px 14px 14px', 'moon'),
('g12', '初',
 'linear-gradient(180deg, transparent 26%, rgba(166,58,43,.34) 26% 31%, transparent 31%),'
 'repeating-linear-gradient(90deg, transparent 0 44%, rgba(166,58,43,.26) 44% 47%, transparent 47% 53%, rgba(166,58,43,.26) 53% 56%, transparent 56%),'
 'radial-gradient(circle 2px at 20% 60%, rgba(255,255,255,.9) 96%, transparent),'
 'radial-gradient(circle 2px at 58% 50%, rgba(255,255,255,.85) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '4px 4px 16px 4px', 'bar'),
('g13', '玻',
 'repeating-linear-gradient(90deg, rgba(150,190,170,.14) 0 2px, transparent 2px 44px),'
 'repeating-linear-gradient(0deg, rgba(150,190,170,.10) 0 2px, transparent 2px 36px),'
 'radial-gradient(circle 3px at 30% 74%, rgba(255,255,255,.5) 96%, transparent),'
 'radial-gradient(circle 2px at 66% 82%, rgba(255,255,255,.45) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '12px', 'dot2'),
('g14', '晓',
 'radial-gradient(circle 38px at 50% 58%, rgba(255,170,130,.42), rgba(255,170,130,.08) 64%, transparent 72%),'
 'repeating-conic-gradient(from -80deg at 50% 58%, rgba(255,190,150,.14) 0 3deg, transparent 3deg 14deg),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
 '18px 4px 18px 4px', 'diamond'),
('g15', '灯',
 'conic-gradient(from 200deg at 72% 16%, rgba(255,224,150,.30) 0 14deg, transparent 16deg),'
 'radial-gradient(circle 7px at 72% 16%, rgba(255,232,170,.9) 60%, transparent 72%),'
 'linear-gradient(180deg, transparent 58%, rgba(70,110,150,.18) 58%, transparent 92%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 60%)',
 '4px 18px 18px 18px', 'bar'),
('g16', '茶',
 'linear-gradient(180deg, transparent 34%, rgba(240,236,226,.65) 44%, rgba(240,236,226,.3) 56%, transparent 66%),'
 'repeating-linear-gradient(90deg, rgba(160,120,60,.12) 0 2px, transparent 2px 30px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '2px 14px 2px 14px', 'wave'),
('g17', '枫',
 'radial-gradient(circle 4px at 22% 40%, rgba(196,90,48,.55) 96%, transparent),'
 'radial-gradient(circle 3px at 38% 26%, rgba(196,90,48,.45) 96%, transparent),'
 'radial-gradient(circle 5px at 58% 48%, rgba(214,120,60,.5) 96%, transparent),'
 'radial-gradient(circle 3px at 78% 30%, rgba(196,90,48,.42) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '4px 16px 4px 16px', 'diamond'),
('g18', '工',
 'radial-gradient(circle 26px at 24% 34%, transparent 52%, rgba(120,110,100,.28) 54% 62%, transparent 66%),'
 'radial-gradient(circle 18px at 64% 26%, transparent 52%, rgba(120,110,100,.24) 54% 62%, transparent 66%),'
 'radial-gradient(30% 40% at 44% 84%, rgba(255,255,255,.4), transparent 74%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '3px', 'bar'),
('g19', '瀑',
 'linear-gradient(90deg, transparent 30%, rgba(210,230,226,.5) 34% 42%, rgba(210,230,226,.2) 46%, transparent 54%),'
 'repeating-linear-gradient(0deg, rgba(255,255,255,.16) 0 3px, transparent 3px 12px),'
 'radial-gradient(40% 26% at 38% 92%, rgba(230,240,238,.6), transparent 72%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '16px 16px 4px 16px', 'wave'),
('g20', '霜',
 'linear-gradient(102deg, transparent 12%, rgba(140,220,200,.16) 30%, rgba(170,190,255,.14) 52%, transparent 72%),'
 'repeating-linear-gradient(64deg, transparent 0 40px, rgba(200,230,240,.35) 40px 41px, transparent 41px 90px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '14px 4px 4px 14px', 'diamond'),
('g21', '摆',
 'radial-gradient(circle 40px at 50% 40%, transparent 56%, rgba(120,130,90,.30) 58% 64%, transparent 68%),'
 'repeating-conic-gradient(from -10deg at 50% 40%, rgba(120,130,90,.22) 0 1.5deg, transparent 1.5deg 30deg),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '4px 4px 4px 18px', 'bar'),
('g22', '畔',
 'radial-gradient(circle 7px at 18% 46%, rgba(255,196,110,.85) 58%, transparent 74%),'
 'radial-gradient(circle 7px at 34% 42%, rgba(255,196,110,.8) 58%, transparent 74%),'
 'radial-gradient(circle 7px at 50% 47%, rgba(255,196,110,.85) 58%, transparent 74%),'
 'radial-gradient(circle 7px at 66% 41%, rgba(255,196,110,.8) 58%, transparent 74%),'
 'radial-gradient(circle 7px at 82% 45%, rgba(255,196,110,.85) 58%, transparent 74%),'
 'linear-gradient(180deg, transparent 62%, rgba(40,70,120,.22) 62%, transparent 96%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 64%)',
 '4px', 'dot2'),
('g23', '电',
 'linear-gradient(180deg, transparent 46%, rgba(120,150,170,.22) 46%, transparent 78%),'
 'radial-gradient(circle 4px at 26% 56%, rgba(255,214,130,.85) 96%, transparent),'
 'radial-gradient(circle 4px at 40% 56%, rgba(255,214,130,.75) 96%, transparent),'
 'radial-gradient(circle 4px at 54% 56%, rgba(255,214,130,.8) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 50%),'
 'linear-gradient(180deg, transparent 80%, rgba(110,140,160,.18) 100%)',
 '14px 4px 4px 14px', 'bar'),
('g24', '底',
 'linear-gradient(180deg, rgba(20,60,80,.16) 0%, transparent 40%),'
 'radial-gradient(circle 4px at 24% 44%, rgba(200,240,240,.5) 96%, transparent),'
 'radial-gradient(circle 3px at 44% 34%, rgba(200,240,240,.4) 96%, transparent),'
 'radial-gradient(circle 4px at 68% 48%, rgba(200,240,240,.45) 96%, transparent),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 80%),'
 'linear-gradient(180deg, transparent 84%, rgba(30,70,90,.28) 84%, rgba(30,70,90,.1) 100%)',
 '18px 4px 18px 4px', 'wave'),
('g25', '操',
 'repeating-radial-gradient(circle at 50% 128%, transparent 0 30px, rgba(180,90,60,.14) 30px 33px),'
 'radial-gradient(circle 34px at 74% 22%, rgba(255,180,90,.35), transparent 68%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '3px 3px 16px 16px', 'diamond'),
# ---- 5 套立绘皮肤（body 已有立绘 + 遮罩：场景从轻，只加形状徽记） ----
('a-sakura', '樱',
 'radial-gradient(circle 4px at 22% 66%, rgba(240,170,190,.5) 96%, transparent),'
 'radial-gradient(circle 3px at 56% 40%, rgba(240,170,190,.45) 96%, transparent),'
 'radial-gradient(circle 4px at 78% 70%, rgba(240,170,190,.5) 96%, transparent)',
 '4px 18px 4px 18px', 'moon'),
('a-galaxy', '河',
 'radial-gradient(circle 2px at 24% 40%, rgba(255,255,255,.85) 96%, transparent),'
 'radial-gradient(circle 2px at 52% 58%, rgba(255,255,255,.7) 96%, transparent),'
 'radial-gradient(circle 2px at 74% 34%, rgba(255,255,255,.8) 96%, transparent)',
 '3px', 'bar'),
('a-neon', '虹',
 'repeating-linear-gradient(100deg, rgba(140,240,220,.10) 0 1px, transparent 1px 12px),'
 'linear-gradient(90deg, transparent 30%, rgba(230,80,170,.14) 42% 58%, transparent 70%)',
 '4px', 'bar'),
('a-wuxia', '侠',
 'linear-gradient(180deg, transparent 30%, rgba(40,40,36,.10) 42%, transparent 56%),'
 'radial-gradient(60% 40% at 30% 90%, rgba(40,40,36,.14), transparent 74%)',
 '2px 14px 2px 14px', 'wave'),
('a-fireworks', '祭',
 'radial-gradient(circle 2px at 30% 30%, rgba(255,214,140,.85) 96%, transparent),'
 'radial-gradient(circle 2px at 58% 22%, rgba(255,214,140,.8) 96%, transparent),'
 'radial-gradient(circle 2px at 72% 44%, rgba(255,214,140,.85) 96%, transparent),'
 'radial-gradient(circle 2px at 44% 52%, rgba(255,214,140,.7) 96%, transparent)',
 '16px 16px 4px 16px', 'dot2'),
# ---- 10 套 v5.3 a-* 皮肤 ----
('a-tidal', '潮',
 'repeating-linear-gradient(0deg, transparent 0 14px, rgba(90,150,180,.10) 14px 16px, transparent 16px 30px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '12px', 'wave'),
('a-aurora', '极',
 'linear-gradient(98deg, transparent 10%, rgba(108,229,177,.18) 30%, rgba(120,180,255,.14) 52%, transparent 76%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '14px 4px 14px 14px', 'diamond'),
('a-radio', '台',
 'repeating-linear-gradient(90deg, rgba(110,120,100,.2) 0 1px, transparent 1px 16px),'
 'radial-gradient(circle 5px at 50% 34%, rgba(180,200,150,.35), transparent 70%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '4px', 'bar'),
('a-culture', '菌',
 'radial-gradient(circle 10px at 26% 62%, rgba(150,170,120,.16) 80%, transparent 90%),'
 'radial-gradient(circle 6px at 58% 44%, rgba(150,170,120,.14) 80%, transparent 90%),'
 'radial-gradient(circle 12px at 78% 70%, rgba(150,170,120,.12) 80%, transparent 90%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '18px 18px 4px 4px', 'dot2'),
('a-glass', '皿',
 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,.30) 46%, transparent 52%),'
 'linear-gradient(180deg, transparent 62%, rgba(140,180,190,.14) 62%, transparent 90%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '4px 16px 16px 16px', 'moon'),
('a-polar', '昼',
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 48%),'
 'linear-gradient(180deg, transparent 50%, rgba(255,255,255,.18) 50%, transparent 88%)',
 '3px', 'bar'),
('a-type', '铅',
 'repeating-linear-gradient(90deg, rgba(110,110,100,.10) 0 1px, transparent 1px 26px),'
 'repeating-linear-gradient(0deg, rgba(110,110,100,.10) 0 1px, transparent 1px 26px),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '2px', 'dot2'),
('a-pulse', '搏',
 'linear-gradient(180deg, transparent 52%, rgba(90,200,160,.16) 52% 56%, transparent 60%),'
 'linear-gradient(90deg, transparent 34%, rgba(90,200,160,.30) 40% 44%, transparent 50%, rgba(90,200,160,.3) 56% 60%, transparent 66%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '12px 12px 3px 3px', 'wave'),
('a-chart', '图',
 'radial-gradient(circle 2px at 30% 44%, rgba(140,160,220,.8) 96%, transparent),'
 'radial-gradient(circle 2px at 52% 30%, rgba(140,160,220,.7) 96%, transparent),'
 'radial-gradient(circle 2px at 70% 54%, rgba(140,160,220,.75) 96%, transparent),'
 'linear-gradient(64deg, transparent 20%, rgba(140,160,220,.12) 40% 60%, transparent 80%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '3px 14px 14px 14px', 'diamond'),
('a-chrome', '液',
 'linear-gradient(100deg, transparent 30%, rgba(220,230,240,.22) 44%, rgba(120,140,160,.18) 52%, transparent 66%),'
 'linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '16px 4px 16px 16px', 'bar'),
]

TAB_SHAPES = {
    'bar': 'width:3px;height:12px;border-radius:2px;',
    'diamond': 'width:6px;height:6px;border-radius:1px;transform:translateX(-50%) rotate(45deg);',
    'dot2': 'width:9px;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--green) 0 3.5px,transparent 3.5px 5.5px,var(--green) 5.5px);',
    'moon': 'width:8px;height:8px;border-radius:8px 8px 0 0;transform:translateX(-50%);',
    'wave': 'width:14px;height:4px;border-radius:3px;background:linear-gradient(90deg,var(--green) 0 4px,transparent 4px 10px,var(--green) 10px);',
    # ---- v6.0 形状库扩容 5 → 12 ----
    'triangle': 'width:8px;height:7px;transform:translateX(-50%);background:var(--green);clip-path:polygon(50% 0,100% 100%,0 100%);',
    'ring': 'width:8px;height:8px;border-radius:50%;transform:translateX(-50%);background:none;border:2px solid var(--green);box-sizing:border-box;',
    'bracket': 'width:10px;height:9px;transform:translateX(-50%);background:none;border:1.6px solid var(--green);border-top:none;border-radius:0 0 6px 6px;box-sizing:border-box;',
    'seal': 'width:9px;height:9px;border-radius:2px;transform:translateX(-50%) rotate(45deg);background:var(--seal, var(--red));box-sizing:border-box;',
    'ticket': 'width:12px;height:6px;border-radius:1px;transform:translateX(-50%);background:linear-gradient(90deg,var(--green) 0 5px,transparent 5px 7px,var(--green) 7px);',
    'gear': 'width:10px;height:10px;transform:translateX(-50%);background:var(--green);clip-path:polygon(50% 0,61% 18%,82% 12%,84% 34%,100% 42%,88% 60%,96% 82%,74% 84%,66% 100%,50% 88%,34% 100%,26% 84%,4% 82%,12% 60%,0 42%,16% 34%,18% 12%,39% 18%);',
    'starb': 'width:11px;height:11px;transform:translateX(-50%);background:var(--green);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);',
}

HEAD = """/* ============================================================================
   skins-m.css · v5.5 移动身份层（40 套存量皮肤：g01–g25 / 5 套立绘 / 10 套 a-*）
   ----------------------------------------------------------------------------
   由 tools/gen_m.py 生成。每套皮肤三层身份：
   ① 专属舞台场景（.app-main::before 背景层，零请求零 DOM）
   ② 页头徽记（.page-head::after，世界观签名字）
   ③ 形状语言（卡片圆角 + tabbar 选中指示形状）
   纪律：paper 默认态零影响（全部规则要求 html[data-skin="…"]）；
   立绘 5 套场景从轻（body 已有立绘层）；reduced-motion 天然静态（无动画）。
   v6.0 修正（验证1/5）：本文件历史注释误写「55 套」，实际覆盖 40 套——已按 M 表实数更正。
   ============================================================================ */

/* 徽记基座：内联跟随页标题（v5.5 验证4/5 修复：绝对定位 right:2px 会与
   页头右侧「仅本机·无账号」等既有元素碰撞而被顶掉，实测不可见）。
   默认 display:none——只有 M 表定义了徽记字的皮肤才显式开启，
   避免 v7 皮肤（舞台即身份）渲染出空方框。 */
html[data-skin] .page-head .page-title::after { display: none; }
/* 形状语言基座：卡片圆角交给每套皮肤定义 */
html[data-skin] .card { transition: border-radius .2s ease; }
"""


def build():
    out = [HEAD]
    for sid, ch, scene, radius, tab in M:
        out.append('')
        out.append('/* ---- %s · 徽记「%s」 · 舞台场景 ---- */' % (sid, ch))
        out.append('html[data-skin="%s"] .app-main::before {' % sid)
        out.append('  background: %s;' % scene)
        out.append('}')
        out.append('html[data-skin="%s"][data-skin][data-theme] .page-head .page-title::after { content: "%s"; display: inline-grid; vertical-align: 2px; margin-left: 9px; width: 22px; height: 22px; place-items: center; font-size: 12px; font-weight: 600; font-family: var(--serif, serif); border: 1px solid var(--line-2); border-radius: 6px; color: var(--green); background: var(--green-soft); opacity: .92; pointer-events: none; }' % (sid, ch))
        out.append('html[data-skin="%s"] .card { border-radius: %s; }' % (sid, radius))
        out.append('html[data-skin="%s"] .tabbar button.on::before { %s opacity: .95; }' % (sid, TAB_SHAPES[tab]))
    css = '\n'.join(out) + '\n'
    path = os.path.join(ROOT, 'assets', 'skins-m.css')
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('skins-m.css %dB · %d skins' % (len(css.encode('utf-8')), len(M)))


# ================= v6.0 交付 A1：25 套本地皮肤「材质身份」 =================
# (id, 徽记字, 材质纹理场景, 卡片圆角, tab指示形状)
# 本地皮肤 = paper/kraft/green/pen + 21 套稀有掉落；token 由 skins-v5.css/v43.css 提供。
# 纹理全部落在 .app-main::before 背景层（rgba 叠加，不改盒模型）；徽记沿用 M 表发射器。
L = [
('paper', '素',
 'repeating-linear-gradient(94deg, rgba(120,110,90,.03) 0 1px, transparent 1px 7px), repeating-linear-gradient(3deg, rgba(120,110,90,.022) 0 1px, transparent 1px 11px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '16px', 'bar'),
('kraft', '韧',
 'repeating-linear-gradient(0deg, rgba(122,88,50,.05) 0 3px, transparent 3px 9px), repeating-linear-gradient(90deg, rgba(122,88,50,.03) 0 1px, transparent 1px 26px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '14px 14px 4px 4px', 'ticket'),
('green', '账',
 'repeating-linear-gradient(0deg, rgba(60,110,70,.055) 0 1px, transparent 1px 22px), radial-gradient(56% 40% at 80% 4%, rgba(60,110,70,.08), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '6px 18px 6px 18px', 'wave'),
('pen', '墨',
 'repeating-linear-gradient(45deg, rgba(40,45,60,.03) 0 1px, transparent 1px 12px), radial-gradient(46% 34% at 16% 0%, rgba(40,45,60,.06), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '2px 14px 2px 14px', 'bracket'),
('sakura', '瓣',
 'radial-gradient(circle at 22% 18%, rgba(230,140,160,.10) 0 7px, transparent 8px), radial-gradient(circle at 74% 8%, rgba(230,140,160,.08) 0 5px, transparent 6px), radial-gradient(circle at 52% 30%, rgba(230,140,160,.06) 0 4px, transparent 5px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '20px 8px 20px 8px', 'dot2'),
('mint', '荷',
 'repeating-linear-gradient(0deg, rgba(90,170,140,.05) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, rgba(90,170,140,.05) 0 1px, transparent 1px 18px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '10px', 'triangle'),
('indigo', '蓝',
 'radial-gradient(52% 44% at 24% 12%, rgba(52,80,140,.09), transparent 70%), radial-gradient(40% 36% at 78% 24%, rgba(52,80,140,.07), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '18px 18px 6px 18px', 'moon'),
('coffee', '焙',
 'radial-gradient(circle at 30% 24%, rgba(96,64,40,.06) 0 5px, transparent 6px), radial-gradient(circle at 66% 14%, rgba(96,64,40,.05) 0 3px, transparent 4px), repeating-linear-gradient(0deg, rgba(96,64,40,.03) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '16px 4px 16px 16px', 'seal'),
('gold', '金',
 'repeating-linear-gradient(60deg, rgba(212,175,96,.075) 0 2px, transparent 2px 12px), repeating-linear-gradient(-30deg, rgba(212,175,96,.04) 0 1px, transparent 1px 18px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '3px', 'diamond'),
('almanac', '历',
 'repeating-linear-gradient(90deg, rgba(90,80,60,.05) 0 1px, transparent 1px 44px), repeating-linear-gradient(0deg, rgba(90,80,60,.05) 0 1px, transparent 1px 30px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '4px 16px 4px 16px', 'bar'),
('greyblue', '霁',
 'repeating-linear-gradient(102deg, rgba(108,132,156,.06) 0 1px, transparent 1px 13px), radial-gradient(48% 36% at 82% 6%, rgba(108,132,156,.08), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '14px 20px 14px 20px', 'wave'),
('linen', '织',
 'repeating-linear-gradient(0deg, rgba(130,116,96,.045) 0 2px, transparent 2px 8px), repeating-linear-gradient(90deg, rgba(130,116,96,.045) 0 2px, transparent 2px 8px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '12px 2px 12px 2px', 'dot2'),
('pom', '绒',
 'radial-gradient(circle at 20% 78%, rgba(200,140,150,.07) 0 9px, transparent 10px), radial-gradient(circle at 72% 84%, rgba(200,140,150,.06) 0 7px, transparent 8px), radial-gradient(circle at 46% 88%, rgba(200,140,150,.05) 0 5px, transparent 6px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 78%)',
 '22px', 'ring'),
('olive', '橄',
 'repeating-linear-gradient(118deg, rgba(110,120,60,.05) 0 1px, transparent 1px 15px), radial-gradient(46% 36% at 12% 2%, rgba(110,120,60,.07), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '16px 16px 4px 16px', 'triangle'),
('lavender', '薰',
 'repeating-linear-gradient(75deg, rgba(140,110,180,.05) 0 2px, transparent 2px 11px), radial-gradient(50% 40% at 84% 0%, rgba(140,110,180,.08), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '18px 6px 18px 6px', 'starb'),
('ochre', '赭',
 'repeating-radial-gradient(circle at 18% 84%, rgba(150,96,48,.045) 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(24deg, rgba(150,96,48,.03) 0 1px, transparent 1px 19px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '8px 20px 8px 20px', 'diamond'),
('glacier', '凛',
 'linear-gradient(35deg, transparent 46%, rgba(150,190,215,.10) 46.5% 47.5%, transparent 48%), linear-gradient(-28deg, transparent 62%, rgba(150,190,215,.08) 62.5% 63.5%, transparent 64%), linear-gradient(70deg, transparent 30%, rgba(150,190,215,.06) 30.5% 31.5%, transparent 32%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '4px 18px 18px 4px', 'bracket'),
('pomelo', '柚',
 'radial-gradient(circle at 26% 22%, rgba(220,160,60,.08) 0 4px, transparent 5px), radial-gradient(circle at 58% 12%, rgba(220,160,60,.06) 0 3px, transparent 4px), radial-gradient(circle at 82% 28%, rgba(220,160,60,.07) 0 4px, transparent 5px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
 '20px 20px 8px 20px', 'ring'),
('bamboo', '节',
 'repeating-linear-gradient(0deg, rgba(92,124,62,.06) 0 1px, transparent 1px 27px), linear-gradient(90deg, transparent 10%, rgba(92,124,62,.05) 10.5% 12%, transparent 12.5%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '4px 4px 14px 14px', 'bar'),
('midnight', '夜',
 'radial-gradient(circle at 18% 22%, rgba(255,255,255,.35) 0 1px, transparent 1.8px), radial-gradient(circle at 72% 12%, rgba(255,255,255,.28) 0 1px, transparent 1.6px), radial-gradient(circle at 48% 34%, rgba(255,255,255,.22) 0 .8px, transparent 1.4px), radial-gradient(circle at 86% 42%, rgba(255,255,255,.30) 0 1px, transparent 1.8px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
 '16px', 'starb'),
('rosegold', '缠',
 'repeating-linear-gradient(90deg, rgba(226,178,162,.06) 0 1px, transparent 1px 5px), repeating-linear-gradient(0deg, rgba(226,178,162,.035) 0 1px, transparent 1px 9px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '14px 14px 14px 2px', 'ring'),
('cedar', '杉',
 'repeating-radial-gradient(circle at 50% 118%, rgba(96,64,38,.05) 0 2px, transparent 2px 14px), repeating-linear-gradient(88deg, rgba(96,64,38,.04) 0 1px, transparent 1px 34px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '10px 22px 10px 22px', 'triangle'),
('sky', '晴',
 'radial-gradient(circle at 28% 82%, rgba(255,255,255,.30) 0 7px, transparent 8px), radial-gradient(circle at 64% 90%, rgba(255,255,255,.22) 0 5px, transparent 6px), radial-gradient(52% 40% at 78% 2%, rgba(255,255,255,.28), transparent 74%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 84%)',
 '24px 8px 24px 8px', 'moon'),
('oldnews', '闻',
 'repeating-linear-gradient(0deg, rgba(78,72,62,.055) 0 1px, transparent 1px 17px), repeating-linear-gradient(90deg, rgba(78,72,62,.04) 0 1px, transparent 1px 116px), radial-gradient(40% 30% at 14% 0%, rgba(78,72,62,.05), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '2px', 'ticket'),
('porcelain', '釉',
 'linear-gradient(65deg, transparent 46%, rgba(120,150,165,.09) 46.5% 47.5%, transparent 48%), linear-gradient(-30deg, transparent 62%, rgba(120,150,165,.07) 62.5% 63.5%, transparent 64%), linear-gradient(18deg, transparent 74%, rgba(120,150,165,.05) 74.5% 75.5%, transparent 76%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
 '18px 4px 18px 18px', 'seal'),
]


def build_l():
    """v6.0 交付 A1：25 套本地皮肤材质身份 → assets/skins-l.css（always-loaded ≤ 30KB）。"""
    out = ["""/* ============================================================================
   skins-l.css · v6.0 全员识别 3.0（25 套本地皮肤材质身份层）
   ----------------------------------------------------------------------------
   由 tools/gen_m.py 的 L 表生成（手改会被覆盖；要改规格请改 tools/gen_m.py）。
   每套四层：① 材质纹理（.app-main::before 背景层，零请求零 DOM）
             ② 页头徽记（.page-title::after，专属字）
             ③ 形状语言（卡片圆角）  ④ tabbar 选中指示形状（TAB_SHAPES 12 种库）
   纪律：全部规则在 html[data-skin="…"] 作用域内，未选中时零影响；
   纹理用 token 取色（skins-v43.css 为全部本地皮肤提供完整 token 集）。
   ============================================================================ */

/* 徽记基座（与 skins-m.css 同语义）：默认隐藏，L 表皮肤显式开启 */
html[data-skin] .page-head .page-title::after { display: none; }
"""]
    for sid, ch, scene, radius, tab in L:
        out.append('')
        out.append('/* ---- %s · 材质身份 · 徽记「%s」 ---- */' % (sid, ch))
        out.append('html[data-skin="%s"] .app-main::before {' % sid)
        out.append('  background: %s;' % scene)
        out.append('}')
        out.append('html[data-skin="%s"][data-skin][data-theme] .page-head .page-title::after { content: "%s"; display: inline-grid; vertical-align: 2px; margin-left: 9px; width: 22px; height: 22px; place-items: center; font-size: 12px; font-weight: 600; font-family: var(--serif, serif); border: 1px solid var(--line-2); border-radius: 6px; color: var(--green); background: var(--green-soft); opacity: .92; pointer-events: none; }' % (sid, ch))
        out.append('html[data-skin="%s"] .card { border-radius: %s; }' % (sid, radius))
        out.append('html[data-skin="%s"] .tabbar button.on::before { %s opacity: .95; }' % (sid, TAB_SHAPES[tab]))
    css = '\n'.join(out) + '\n'
    path = os.path.join(ROOT, 'assets', 'skins-l.css')
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('skins-l.css %dB · %d skins' % (len(css.encode('utf-8')), len(L)))


if __name__ == '__main__':
    build()
    build_l()
