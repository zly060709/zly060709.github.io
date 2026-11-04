# 能量账本 · Energy Ledger

一本会自我校准的私人饮食账本。本地优先：没有账号、没有云端、没有社交；数据只写入当前浏览器的 `localStorage`。

当前版本：**v3.2**（在 v3.1 上新增进度照片 / 力量 PR / 周报卡片 / 菜谱与购物清单 / 可穿戴导入）

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
│  ├─ extras.js               v3.2 纯逻辑：PR / 菜谱合并 / 周报绘制 / 可穿戴解析 / 照片压缩与 IndexedDB
│  ├─ app.js                  应用层：视图、浮层、导入导出、AI、PIN
│  └─ app.css                 视觉层
├─ tools/
│  ├─ gender_scan.py          男性版关键词扫描（自动跑无头 Edge）
│  ├─ scan_page.html          扫描用测试页
│  ├─ testserver.py           开发用：起服务并收集自测结果
│  ├─ run_probe.py            开发用：一键跑无头 Edge 自测（v3.1 / v3.2）
│  ├─ probe.html              v3.1 端到端自测
│  └─ probe32.html            v3.2 端到端自测
└─ README.md
```

---

## 三、v3.2 新增

| 模块 | 说明 | 入口 |
|---|---|---|
| 进度照片 | 上传后在本机压缩（长边 ≤1080、JPEG），存 IndexedDB；按日期分组、单张删除、占用统计、一键清理 | 身体页「进度照片」 |
| 力量 PR / 训练日志 | 动作 + 组数 + 重量 + 次数；自动算最佳重量、最大重量下的最佳次数、Epley 1RM；倒序列表；CSV 导出 | 身体页「力量训练 · PR」/ 设置 → 记录 |
| 周报卡片 | 复用现有 insights，生成本周/上周长图：平均摄入、体重变化、训练次数、达标天数、每日摄入柱状图；导出 PNG | 今日页「周报卡片」 |
| 菜谱 / 购物清单 | 菜谱 = 多个食物条目组合；一键加入今日某餐；生成购物清单并按同名食材合并克数，可勾选 | 今日页「菜谱」/ 记一餐底部「存菜谱」 |
| 可穿戴导入 | Apple Health XML、华为运动健康 CSV；支持步数/体重/睡眠；导入前预览匹配与冲突，逐项勾选跳过或覆盖 | 设置 → 数据 → 导入可穿戴数据 |
| 备份与迁移 | JSON 导出/导入补齐 v3.2 新数据；照片不进入 JSON，需手动另存 | 设置 → 数据 |
| 单文件部署 | `extras.js` 一并内联；构建后仍为单个 HTML | `python build_standalone.py` |

### 新增数据键（都避开已有键）

localStorage 主键仍是 `energy-ledger.v2`（未改键、未迁移旧数据）。新增的是同一对象里的字段：

- `lifts = [{ id, date, exercise, sets, weight, reps, note, createdAt }]`
- `recipes = [{ id, name, at, items: [{ name, grams, per100: { kcal, p, c, f, fib } }] }]`
- `shopping = { recipeId, recipeName, at, items: [{ name, grams, checked }] } | null`
- `wearable = { 'YYYY-MM-DD': { steps, sleepH, source, at } }`

照片不在 localStorage，单独的 IndexedDB：

- 数据库：`energy-ledger-photos`
- 对象仓库：`photos`（keyPath `id`，索引 `date`）
- 记录：`{ id, date, at, name, w, h, bytes, stored, data }`，`data` 为压缩后的 JPEG data URL

`normalizeDB()` 只做内存兜底；旧数据在没有任何保存动作前不会被改写。下一次正常保存才会补齐默认字段，已有 `entries / weights / cycle / settings` 等字段原样保留。

### 周报「达标天数」口径

`记录且当天摄入在预算 ±10% 内`。体重变化取该周趋势的首尾差；训练次数按“有力量或有氧记录的独立日期”计数，不是组数。

### 进度照片的配额与边界

- 压缩目标：最长边 1080 px，JPEG 质量 0.82，白色背景（透明 PNG 不会变黑）。
- 写入前用 `navigator.storage.estimate()` 检查剩余配额；接近 98% 时拒绝写入并提示先清理。
- 捕获 IndexedDB 的 `QuotaExceededError`，不会破坏已有照片。
- 非图片文件、HEIC 等浏览器不能解码的格式会提示转换；超大图只缩小尺寸，不会无限占用。
- 照片只在本机，浏览器清数据/换浏览器会丢失；导出 JSON 不包含照片。

### 可穿戴导入支持字段

| 格式 | 支持 | 不支持 / 说明 |
|---|---|---|
| Apple Health XML | `HKQuantityTypeIdentifierStepCount`（按日 + 来源取最大值，避免手表和手机重复计数）、`BodyMass/BodyWeight`（kg/lb）、`SleepAnalysis`（不含 Awake/InBed，按结束日汇总小时） | 心率、卡路里、锻炼、站立、血氧等只显示为“未导入类型”；Apple 导出文件通常很大，浏览器解析需要内存 |
| 华为运动健康 CSV | 列名含 `日期/date/时间` + `步数/steps` + `体重/weight` + `睡眠/sleep`；体重支持 kg/斤/lb（按表头判断）；睡眠支持 `7.5`、`7:30`、`7h30m`、`分钟` | 列名必须能识别；多设备重复记录不做去重；心率、卡路里等列不导入 |

冲突处理：预览按日期列出“现有值 → 新值”，每个冲突项都有「跳过」勾选；不勾选即覆盖同日值。导入只写体重、步数、睡眠，不改饮食/运动/周期。

### 为什么不做云同步

项目没有后端、没有账号体系。做“云同步”只能做成假的（把数据塞进某个第三方存储或让用户手动贴 JSON），既不可靠也不符合“本地优先”的承诺。v3.2 的做法是：

1. 设置 → 数据 → 导出 JSON（含所有新数据结构，不含照片）
2. 新设备打开账本 → 导入 JSON
3. 照片在旧设备的「进度照片」里逐张另存，或在新设备重新上传
4. 不提供自动覆盖、自动合并或后台同步

---

## 四、v3.1 回顾

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

## 五、验证

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
python tools/run_probe.py          # v3.1 回归（probe.html）
python tools/run_probe.py probe32   # v3.2 新功能（probe32.html）
```

`run_probe.py` 会自动启动 8766 端口、跑无头 Edge、等待页面把断言 POST 回来，失败返回非 0。
也可以手动：

```bash
python tools/testserver.py
# 浏览器打开 http://127.0.0.1:8766/tools/probe.html 或 /tools/probe32.html
```

最近一次 v3.1 回归：

```
female_has_cycle=1 / female_symptoms_have_cramp=1 / female_report_period=1
male_has_recovery=1 / male_has_cycle_word=0 / male_has_breast_word=0
male_symptoms_have_soreness=1 / male_report_training=1
guard_low_intake=1 / guard_no_weight=1 / guard_has_card=1
entries_after_delete=2 → undo_button=1 → entries_after_undo=3
weight_confirm_shown=1 / weight_after_cancel=70
ai_error_bubble=1 / ai_retry_button=1 / ai_stats_fail=1
PIN: lock_after_reload=1 / wrong_pin_err=PIN 不正确 / after_unlock_lock=0
RESULT: PASS
```

最近一次 v3.2（关键断言，真实页面操作后读回 localStorage / IndexedDB）：

```
epley_100_5=116.7
lift_saved_count=2 / pr_best_weight=110 / pr_best_reps_at_weight=3 / pr_best_e1rm=121
lift_csv_lines=4 / lift_csv_bom=65279 / lift_csv_has_121=1
recipe_added_entries=3 / recipe_source=recipe
shopping_items=2 / shopping_chicken_grams=250
week_this_img=1 / week_this_width=1080 / week_this_height=1620 / week_this_png=1
week_last_differs=1
import_rows=2 / import_conflict_labels=3
wearable_steps_duplicate_rows_summed=15000 / wearable_weight_kept_after_skip=70 / wearable_sleep_h=7.5
apple_weight_overwritten=70.5 / apple_steps_kept_after_skip=15000
photo0_w=1080 / photo0_h=756 / photo0_jpeg=data:image/jpeg;base64
photo_count_after_second=2 / photos_sheet_groups=1 / photo_count_after_delete_one=1
photo_bad_toast=没有可用的图片（需要 JPEG/PNG/WebP）
photo_quota_toast=照片空间不足：请先在「进度照片」里清理
photo_count_after_clear=0
compat_entries_kept=7 / compat_raw_new_keys_absent=1 / compat_entries_after_save=7
RESULT: PASS
```

### 3. 构建

```bash
python build_standalone.py
# → energy-ledger-standalone.html 397.5 KB（407,027 B）
```

---

## 六、已知限制

- **没有云同步**：无后端、无账号。换设备只能导出 JSON → 导入；照片在 IndexedDB，不在 JSON 里，需要逐张另存或重新上传。
- **PIN 不是加密**：只遮挡随手打开的人；同一台电脑的熟练用户仍可读取 `localStorage`。清除浏览器数据会连同账本一起清除。
- **AI 教练需要 API Key**：静态版可直连通义千问（DashScope）；智谱 / OpenAI 需要本机代理。回答是估算，不是医疗建议。
- **性别文案**：男性版是按对等语义新写的通用健身/营养表述；专业场景建议由专业人士再润色。
- **照片配额**：IndexedDB 仍受浏览器配额限制；清理照片只删照片，不动账本。HEIC 需要先转 JPEG/PNG。
- **可穿戴解析**是“常见字段”适配：Apple 步数按来源取最大、睡眠按结束日归档；华为 CSV 依赖列名识别，不做多设备去重。心率、卡路里、锻炼不导入。
- **1RM 是估算**：Epley 公式只适合比较同一动作的长期趋势，不适合测试极限重量。
- **周报口径**：达标天数 = 记录且摄入在预算 ±10%；训练次数按独立日期计数。上周/本周的预算使用当前体重与目标，不会回溯历史预算。
- **部署**：GitHub Pages 若使用 `docs/`，需要同时更新 `docs/index.html`、`docs/assets/*` 与 `docs/energy-ledger-standalone.html`；只更新 `deploy/` 不会改变该路径。

### 建议但未做（按优先级）

1. 云同步 / 多设备合并：需要账号与后端，违背本地优先定位，暂不做。
2. 照片导出打包（ZIP）：需要额外依赖或复杂压缩，当前只支持逐张另存。
3. 可穿戴更多字段（心率、睡眠分期、锻炼）：解析成本高且与现有模型无对应入口。
4. 训练容量/周计划与图表：当前只做 PR 与 CSV，不做课表。
5. 菜谱营养分摊（按份数而非克数）：当前所有克数都按整份计。
