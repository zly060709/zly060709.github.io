# v5.4 皮肤系统改造 · 五轮验证报告

> 验证对象：本仓库工作树（v5.3.0 → v5.4.0 全部改动）。
> 方法：5 轮不同角度独立验证，每轮至少找出 1 个真实问题并修复后复测。
> 测试台：`tools/v6-harness.html`（390×844 真实视口 iframe，可直接切皮肤/造数据/跑审计）。

## 验证 1/5 · 代码审查（静态 + 编译）

自动化：52 个 JSON 全量解析 ✓；skins-v6.css 括号 267/267 ✓；app.js / skins-v6.js / skins-gen.js / skin-fx.js / skins-fx.js / sw.js 全部 `new Function` 编译 ✓；build.py 版本同步校验 ✓。

| # | 发现的问题 | 严重度 | 修复 |
|---|---|---|---|
| 1 | v6 皮肤用户刷新时，manifest 未到前 `knownSkin` 查不到 g26–g35，先闪回 paper 再跳回（CLS+白闪）。这是 g01 当年修过、v5.3 新增皮肤没跟上的同类问题 | 高 | app.js `knownSkin` 增加 `SkinV6.ids` 识别 |
| 2 | index.html 首屏预绘脚本没写 `data-skin-v6`，#skinStage 要等 JS 挂属性才显示 → 高度跳变 | 高 | 预绘脚本对 g26–g35 直接置 `data-skin-v6="1"`，舞台首帧就位 |
| 3 | skins-v6.css 里暗色 tabbar 选择器写成了 `[data-theme="dark"] html[data-skin] …`——html 不可能是自己的后代，规则永不生效 | 中 | 改为 `html[data-skin][data-theme="dark"] …` |
| 4 | g26 票根计数竖排文字在 64px 舞台里溢出裁切 | 低 | 舞台 64→72px，文案精简，文字垂直居中 |

## 验证 2/5 · 逻辑验证（解锁 / 扭蛋 / 离线 / 回退）

- manifest 合并：`skins/index.json` 50 条 top（40+10）✓；图鉴 75 卡（25 普通 + 50 顶级）✓；扭蛋池数学：50 − 20 已解锁 = 30 ✓。
- 解锁路径：g26–g35 无 `art` 字段 → `unlockSkin` 不触发皮肤包下载 ✓；`refreshSkinFx` 因无 art 永不启动 canvas ✓。
- 启动路径：v6 皮肤在 manifest 缺失（离线首装）时仍可渲染——tokens 全部内联在 skins-v6.css，`SkinV6` 通道数据内联在 skins-v6.js ✓。
- 纯账本模式（mode≠full）：`applySkins()` paper 分支同步调用 `SkinV6.sync('paper')` 清理 v6 属性 ✓。
- Service Worker：新缓存名 `energy-ledger-v5.4.0`，预缓存 114 项含 skins-v6.css/js（构建器校验文件存在）✓。
- **#5 发现并修复**：结余口径用了 `priorTDEE`（1693），与账页卡片「今日预算 1700」口径不一致 → `fxDataContext` 改用 `budgetPrior`，液面/磁带/LCD 显示与账本完全同源。

## 验证 3/5 · 自动化自测（21 套审计矩阵）

`SkinGen.audit()` + `SkinV6.audit()` 对 g26–g35 + 5 套 a- + 5 套 g- + paper 全量跑 390×844：

- 横向溢出 0 / 小字 <11px 0 / 屏外元素 0 / 运行时错误 0（全部 21 套）✓
- v6 皮肤对比度：dark 4.95–5.96、light 4.61–5.45，全部 ≥4.5 ✓
- 三通道：10 套 v6 皮肤 mat/arch/sig 全部正确写入并被 CSS 消费 ✓；存量 GEN 皮肤 mat 通道生效（ceramic/wood/metal/ink…）✓
- **#6 发现并修复**：`bindDrag` 的 `setPointerCapture` 无防御，合成/已失效指针直接抛 `NotFoundError` → try/catch + 无捕获拖拽兜底 + `pointercancel` 收尾
- **#7 发现并修复**：图鉴 .btn-sm 高 33–35px < 44px 触控标准（v5.3 只给 gen 皮肤补了）→ skins-v6.css 扩展到全部皮肤
- **#8–11 发现并修复（站方历史欠账）**：paper 默认主题 4 处对比度不达标——亮色 ink-3 2.98→4.58、amber 3.58→5.30；暗色 ink-3 4.34→5.15、seal 4.49→5.49

## 验证 4/5 · 模拟用户体验（390×844 实机操作）

截图目检 10 套新皮肤 + 存量抽样（g12/a-系列）+ 图鉴：

- g26 撕页（锯齿+票根串+骑缝编号）、g27 药柜（12 格 6 亮）、g28 磁带（双卷轴+A/B 面）、g29 数码（真七段字形+余辉暗段）、g30 折纸（交替折角）、g31 天气瓶（液面=余量、晶体=记录数）、g32 印章（6 盖 8 空、章位错落）、g33 线路（S 形 4 站+列车）、g34 存钱罐（6 颗豆）、g35 冰箱贴（磁贴可拖）——全部符合设计意图 ✓
- 交互实测：g28 滑动翻面 → SIDE B·昨日 ✓；g27 点抽屉滑出 ✓；g35 真实指针拖拽 → 位置写入 localStorage 并在重载后还原 ✓
- 存量皮肤与新舞台共存：g12 的桌面装饰与舞台无层级冲突 ✓
- **#12 发现并修复**：g28 REC 红点压住 "EL-60 TYPE I" 标签文字 → 标签为红点预留 16px

## 验证 5/5 · 实际加载与性能

- **CLS = 0**（预算 <0.005；舞台容器预置于 HTML + 预绘 CSS，首帧高度一次到位）
- domInteractive 328ms（localhost）；皮肤相关首屏请求 3 个（v6.css / v6.js / skins/index.json，预算 ≤2~3 持平 v5.3 的 gen 路径）
- SW 离线：`energy-ledger-v5.4.0` 激活，预缓存 114 项含全部新文件 ✓
- 资源纪律：10 套新皮肤零图片、零 canvas、零额外请求（组件纯 CSS+内联 SVG）；数据联动复用 `fxDataContext()`（带缓存）零新增计算路径

## 结论

5 轮验证共发现 **12 个问题，全部修复并复测通过**；其中 4 个是站方 v5.3 既有欠账（paper 对比度×4、btn 触控、knownSkin 类同问题、口径不一致），其余 8 个为本次改动中拦截。发布版本 v5.4.0。
