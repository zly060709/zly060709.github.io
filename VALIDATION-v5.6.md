# v5.6 皮肤系统「全池差异化审计 + 桌面舞台平权」· 五轮验证报告

> 验证对象：v5.5.5 → v5.6.0 全部改动。
> 目标：用户要求「成品好于 PLAN-v5.5.md」；五轮验证（代码/逻辑/自测/模拟用户体验/实际加载），
> 每轮至少 1 个真实问题修复或 1 项内容改进。
> 方法：check_v56.py（50 项静态断言，check_v55 超集）+ tools/audit_distinct.py（五通道差异化矩阵）
> + tools/v8-harness.html（101 项真实浏览器审计矩阵）+ 真实浏览器 390×844 实操。
> 交接规格：工作区 HANDOFF-v56.md §4–§8。

## 验证 1/5 · 代码审查（静态 + 编译 + 生成器 + 接入点）

**工具**：tools/check_v56.py（50 项断言；v5.5 的 check_v55 只有 30 项，本轮新增 v6/v5/v43 全量词法配平、
预绘覆盖模拟、换肤 CSS 覆盖、skins-m.css 体积契约、SPEC 身份字段、v8-harness 覆盖率、distinct-report 一致性）。
**生成器幂等性**：`python tools/gen_v7.py` 重跑后 `git diff` 零漂移（生成物未被手改，生成器即真源）✓；
`gen_m.py` 重跑仅差异于本轮文档修正行 ✓。

| # | 发现的问题 | 严重度 | 修复 | 复测 |
|---|---|---|---|---|
| 1 | **实时换肤缺失家族样式表（P1）**：`applySkin` 是实时切换（不刷新页面），但 skins-gen.css / skins-v7.css 只由 index.html 预绘脚本按「页面加载时」的激活皮肤注入——图鉴里从 paper/v6 现场切到 g01–g25 / g36–g85 时无人补注入，引擎样式缺失、舞台裸奔直到下次刷新。v5.5 测试台从未发现：其 setSkin 总是整页导航，从未覆盖实时切换路径 | 高 | app.js 新增 `ensureSkinFamilyCss(id)`（复用预绘 skinsGenCss id、跨家族改 href、paper/a-*/v6 清理注入表），接入 applySkins 全分支 + 纯账本分支 | 静态断言 PASS；浏览器实测见验证 4/5 #2 |
| 2 | **预绘首帧覆盖缺口（10 套 a-*）**：OLDGEN 正则只含 5 套立绘，a-aurora…a-type 十套 v5.3 皮肤首帧无 data-skin/data-theme/skinned 属性（app.js 才补挂）→ 首屏闪烁 + CLS；且计划书附录 A 自曝此问题但 v5.5 未修 | 高 | index.html 预绘新增 A10GEN 分支：十套 a-* 首帧挂属性（样式在 v43/v5 静态层，无需注入，顺带省去 30KB 无谓 gen.css 请求） | check_v56「预绘首帧覆盖 100/100」PASS |
| 3 | version.json notes 写「SW 缓存名 energy-ledger-v5.5.0」，实际是 v5.5.5（文档失真，会误导后续维护） | 中 | notes 修正为当前版本；check_v56 新增「notes 缓存名==版本」断言防复发 | PASS |
| 4 | gen_m.py 文档字符串与 CSS 头注释声称「55 套存量皮肤」，实际 M 表 40 套 | 低 | 修正为 40 套 | PASS |
| 5 | （改进）check_v55 → check_v56：断言 30→50 项，覆盖 v5.5 未覆盖的 5 份 CSS + 4 份 JS 配平与预绘/换肤覆盖模拟 | 改进 | — | 50 项基线跑分 7 fail → R1 修复后 4 fail（余 4 项为 A/C/D 交付占位，见后续轮次） |

R1 余留 FAIL：skins-m.css ≤40KB（C 交付）、v7 徽记（A 交付）、v8-harness（D 交付）、distinct-report（A 交付）
—— 均为交付物占位断言，在对应交付落地后转 PASS；发布前 check_v56 必须 0 fail。

## 验证 2/5 · 逻辑验证（解锁 / 扭蛋 / 图鉴 / 离线 / 回退 / 边界数学）

（进行中）

## 验证 3/5 · 自动化自测（v8-harness 101 项审计矩阵 × 真实浏览器）

（进行中）

## 验证 4/5 · 模拟用户体验（真实视口实操 + 截图目检 + 1 秒辨识度打分）

（进行中）

## 验证 5/5 · 实际加载（节流 + SW 离线重放 + 体积 + 线上确认）

（进行中）
