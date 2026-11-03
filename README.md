# 能量账本 · Energy Ledger

一本会自我校准的私人饮食账本。本地优先：没有账号、没有云端、没有社交；数据只写入当前浏览器的 `localStorage`。

当前版本：**v3.1**（性别分支 + 问账本 / PIN / 健康导出 / 安全护栏 / 撤销 / AI 统计 / 输入校验）

---

## 一、怎么跑

### 方式 A：本机服务（推荐，功能最全）

```bat
启动账本.bat
```

或手动：

```bash
python server.py          # 默认 http://127.0.0.1:8787
python server.py --lan    # 同一 Wi-Fi 的手机也能访问
```

需要 Python 3（仅标准库）。本机服务会转发 AI 视觉请求，绕过浏览器跨域限制。

### 方式 B：单文件静态版（发给别人 / 部署）

```bash
python build_standalone.py
```

生成 `energy-ledger-standalone.html`（把 CSS 与全部 JS 内联进一个文件），双击即可用，也可上传到任意静态主机（GitHub Pages 等）。该文件带 `ledger-standalone` 标记，会自动注销旧 Service Worker，避免缓存串版本。

### 方式 C：多文件开发

直接用 `index.html` + `assets/*.js`，通过任意静态服务器打开。修改 `index.html` 里的 `?v=` 版本号可绕过缓存。

---

## 二、目录

```
energy-ledger/
├─ index.html                 多文件入口（本机/开发）
├─ server.py                  本机服务 + AI 转发 + 局域网
├─ sw.js                      离线缓存（多文件模式）
├─ build_standalone.py        单文件构建脚本
├─ energy-ledger-standalone.html   单文件产物（构建生成）
├─ deploy/index.html          部署用单文件（= 上述产物副本）
├─ assets/
│  ├─ data.js                 约 200 种食物、活动、运动
│  ├─ engine.js               自适应 TDEE、区间、趋势、预测、洞察
│  ├─ wellness.js             周期相位、营养、偏好过滤、就诊摘要
│  ├─ gender.js               v3.1 性别配置（两套文案与默认参数）
│  ├─ app.js                  应用层：视图、浮层、导入导出、AI、PIN
│  └─ app.css                 视觉层
├─ tools/
│  ├─ gender_scan.py          男性版关键词扫描（自动跑无头 Edge）
│  ├─ scan_page.html          扫描用测试页
│  ├─ testserver.py           开发用：起服务并收集自测结果
│  └─ probe.html              开发用：浏览器内端到端自测
└─ README.md
```

---

## 三、v3.1 新增

| 模块 | 说明 | 入口 |
|---|---|---|
| 性别分支 | 女/男两套完整文案与默认参数；默认女性版，老用户不受影响 | 设置 → 我的账本 → 编辑 |
| 问账本（AI 教练） | 用当天/7 天/体重/周期/营养摘要回答问题；失败可重试 | 今日页「问账本」 |
| PIN 锁 | 4–8 位数字，本机遮挡；启动与离开 5 分钟后要求输入 | 设置 → 隐私 |
| 健康数据导出 | 体重/围度/状态/补剂/饮水/运动/饮食合成一张长表 CSV | 设置 → 数据 |
| 安全护栏 | 连续低摄入、掉秤过快、久未称重、蛋白偏低提醒 | 今日页 |
| 撤销与操作日志 | 删除记录/运动/补剂/自定义食物/组合后可撤销；保留最近 30 条 | 设置 → 最近操作 |
| AI 调用统计 | 本机记录调用次数、成功/失败、平均耗时（不记录内容） | 设置 → AI 教练 |
| 输入校验 | 同日体重替换需确认；同餐重复食物需确认 | 称重 / 记一餐 |
| 备份完整性 | JSON 备份与导入补齐周期、围度、状态、补剂；导入保留本机 PIN | 设置 → 数据 |

### 性别分支怎么切换

1. 设置 → 「我的账本」右侧 **编辑**
2. 选择 **女 / 男**，保存
3. 身体页、症状选项、营养提示、AI 教练建议、就诊摘要会立即切换

首次建档默认选中「女」（与 v3.0 行为一致），可在建档时直接改成「男」。

### 两套内容在哪

全部集中在 `assets/gender.js` 的 `Gender.PROFILES`，业务代码只通过 `G.of(profile)` 读取，不再散落 `if (sex === ...)`。

每个性别档案包含：

- `label / marker / avatar`：称呼与头像文字
- `cycleEnabled`：是否具备周期模块（女 true，男 false）
- `numbers`：铁/钙/维 D/叶酸目标（含 50 岁以上分支）
- `body`：身体页副标题、免责声明、围度文案、症状列表、打卡提示、报告副标题
- `cycle`：周期卡片全套文案（女性）
- `recovery`：训练与恢复卡片（男性，替代周期卡）
- `nutrients`：四项营养提示
- `coachSuggestions / coachKeyHint / coachContext`：问账本的推荐问题与说明
- `settings`：设置页分组标题
- `report`：就诊摘要小节标题

新增字段都在 `normalizeDB()` 里兜底，旧备份、旧 localStorage 不需要迁移。

### 数据模型新增字段

- `settings.pin = { on, hash }`：PIN 开关与散列（非加密，仅遮挡）
- `stats = { aiCalls, aiOk, aiFail, aiMs }`：本机 AI 调用统计
- `logs = [{ id, at, text, undo }]`：最近 30 条操作日志与撤销载荷

---

## 四、验证

### 1. 端到端（无头 Edge）

`tools/gender_scan.py` 会自动启动本地服务、写入一份男性档案、渲染今日/身体/设置/趋势/打卡/报告，扫描女性专属词：

```bash
python tools/gender_scan.py
```

最近一次输出：

```
扫描字符数: 3673
检查词表: 经期、月经、黄体、卵泡、排卵、乳房、痛经、避孕、围绝经、女性、她、乳房胀痛
命中: 无
RESULT: PASS（男性版无女性专属词残留）
```

### 2. 功能回归（浏览器内脚本）

```bash
python tools/testserver.py
# 浏览器打开 http://127.0.0.1:8766/tools/probe.html
# 结果写到 tools/_probe_result.json
```

`probe.html` 通过 iframe 驱动真实页面（建档、女性/男性切换、报告、护栏、删除撤销、体重替换、PIN 锁、AI 失败重试），最近一次结果：

```
female_has_cycle=1 / female_symptoms_have_cramp=1 / female_report_period=1
male_has_recovery=1 / male_has_cycle_word=0 / male_has_breast_word=0
male_symptoms_have_soreness=1 / male_report_training=1
guard_low_intake=1 / guard_no_weight=1 / guard_has_card=1
entries_after_delete=2 → undo_button=1 → entries_after_undo=3
weight_confirm_shown=1 / weight_after_cancel=70
ai_error_bubble=1 / ai_retry_button=1 / ai_stats_fail=1
PIN: lock_after_reload=1 / wrong_pin_err=PIN 不正确 / after_unlock_lock=0
```

### 3. 构建

```bash
python build_standalone.py
# → energy-ledger-standalone.html 327.1 KB
```

---

## 五、已知限制

- **PIN 不是加密**：只遮挡随手打开的人；同一台电脑的熟练用户仍可读取 `localStorage`。清除浏览器数据会连同账本一起清除。
- **AI 教练需要 API Key**：静态版可直连通义千问（DashScope）；智谱 / OpenAI 需要本机代理。回答是估算，不是医疗建议。
- **性别文案**：男性版是按对等语义新写的，属于通用健身/营养表述；若用于专业场景（康复、内分泌），建议由专业人士再润色。
- **周报、进度照片、力量 PR、菜谱/购物清单、可穿戴接入**未实现（见下）。
- **多设备同步**仍不提供：用 JSON 备份导出/导入迁移。

### 建议但未做（按优先级）

1. 进度照片（本地压缩存储，占用空间需配额管理）
2. 力量训练 PR 与训练日志（需要新的数据结构与图表）
3. 菜谱 / 购物清单（与食物库组合联动）
4. 可穿戴数据导入（需要文件格式适配，如 Apple Health / 华为运动健康导出）
5. 周报卡片（7 天复盘，可复用现有 insights）
6. 云同步（需要账号与后端，违背当前“本地优先”定位，暂不做）
