/* ============================================================
   Energy Ledger · 运动环游记 换算模块（纯函数，无 DOM、无网络）
   ------------------------------------------------------------
   可直接在 file:// 下用 <script src="trip.js"></script> 加载，
   挂到 window.Trip / globalThis.Trip；同时兼容 CommonJS require。
   不依赖构建、不读写 localStorage、不访问 DOM。

   口径：
     kcal   = MET × 体重kg × 时长h × 1.05      （1.05 与现有 E.burn 一致）
     km_eq  = kcal / (体重kg × 1 kcal/kg·km)  （缺省体重 62 kg 估算）
     登山爬升：另加 ascent_m / 100 × 1 km      （每 100 m 爬升 ≈ 1 km 等效）
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Trip = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- 常量 ---------- */
  var EARTH_CIRCUMFERENCE_KM = 40075; // 地球一圈（赤道周长，取整）
  var K_KCAL = 1.05;                  // MET 换算系数，与现有 E.burn 对齐
  var KCAL_PER_KG_KM = 1;             // 统一尺子：1 kcal ≈ 1 kg·km
  var ASCENT_KM_PER_100M = 1;         // 每 100 m 爬升折算 1 km 等效
  var DEFAULT_WEIGHT_KG = 62;         // 无体重时的估算值（须在 UI 明确标注"按 62 kg 估算"）

  /* ---------- 合理性阈值（防虚填） ---------- */
  var LIMIT = {
    singleMinutes: 720,      // 单次 12 h
    dailyMinutes: 720,       // 单日合计 12 h
    runKm: 42,               // 单次跑步 ≤ 42 km（马拉松）
    swimKm: 10,              // 单次游泳 ≤ 10 km
    ascentM: 3000,           // 单次爬升 ≤ 3000 m
    paceMinPerKm: 3,         // 配速不得快于 3:00/km（即 20 km/h）
    singleKmEq: 120          // 单次等效里程上限
  };

  /* ---------- MET 表：9 类 × 3 档 ----------
     mid 档优先复用现有 EXERCISES 表里的数值（散步 2.8 / 快走 5.0 / 慢跑 7.0 /
     跑步 10.0 / 骑行 6.0 / 游泳 蛙泳 6.0 / 登山 6.0 / 跳绳 11.0 / 力量 3.5 /
     羽毛球 5.5 等），low/high 为同一运动的轻度/高强度档。 */
  var MET_TABLE = {
    walk:     { label: '走',       low: 2.8, mid: 5.0,  high: 6.5 },
    run:      { label: '跑',       low: 8.3, mid: 10.0, high: 11.5 },
    bike:     { label: '骑行',     low: 6.0, mid: 8.0,  high: 10.0 },
    swim:     { label: '游泳',     low: 6.0, mid: 8.3,  high: 10.0 },
    hike:     { label: '登山',     low: 5.0, mid: 6.0,  high: 7.5 },
    row:      { label: '划船',     low: 4.0, mid: 7.0,  high: 9.0 },
    rope:     { label: '跳绳',     low: 11.0, mid: 12.0, high: 13.0 },
    stairs:   { label: '爬楼',     low: 5.0, mid: 8.0,  high: 10.0 },
    yoga:     { label: '瑜伽',     low: 2.3, mid: 3.0,  high: 4.0 },
    /* 以下为旧账本的兼容类目，不再出现在九类选择器里，但历史记录仍按原 MET 折算 */
    jog:      { label: '慢跑（旧）', low: 7.0, mid: 8.3,  high: 10.0, legacy: true },
    strength: { label: '力量训练（旧）', low: 3.5, mid: 5.0, high: 6.0, legacy: true },
    ball:     { label: '球类（旧）', low: 4.0, mid: 5.5, high: 8.0, legacy: true }
  };

  /* 九类运动板块：顺序即 UI 顺序 */
  var CATEGORIES = ['walk', 'run', 'bike', 'swim', 'hike', 'row', 'rope', 'stairs', 'yoga'];

  /* 每类需要额外出哪些字段（时长永远必填） */
  var FIELD_SPEC = {
    walk:   { distance: true },
    run:    { distance: true, pace: true },
    bike:   { distance: true, speed: true },
    swim:   { distance: true, stroke: true },
    hike:   { distance: true, ascent: true },
    row:    { distance: true },
    rope:   { jumps: true },
    stairs: { floors: true },
    yoga:   {}
  };

  var INTENSITY = {
    low: 'low', mid: 'mid', high: 'high',
    低: 'low', 中: 'mid', 高: 'high',
    easy: 'low', normal: 'mid', hard: 'high'
  };

  /* 旧数据兼容：DB.exercises[].name 直接映射到类别；映射不到但有 mets 的按 'other' 处理 */
  var NAME_TO_TYPE = {
    '散步': 'walk', '快走': 'walk',
    '慢跑': 'jog',
    '跑步 8km/h': 'run', '跑步 10km/h': 'run', '跑步 12km/h': 'run',
    '骑行 通勤': 'bike', '骑行 锻炼': 'bike', '动感单车': 'bike', '椭圆机': 'bike',
    '游泳 蛙泳': 'swim', '游泳 自由泳': 'swim',
    '登山': 'hike', '徒步': 'hike', '爬楼梯': 'hike',
    '跳绳': 'rope',
    '力量训练': 'strength', '力量训练 高强度': 'strength', '壶铃': 'strength',
    '深蹲': 'strength', '俯卧撑': 'strength', '平板支撑': 'strength',
    '瑜伽': 'strength', '普拉提': 'strength', '拉伸': 'strength', '太极拳': 'strength',
    '羽毛球': 'ball', '篮球': 'ball', '足球': 'ball', '乒乓球': 'ball',
    '排球': 'ball', '网球': 'ball', '高尔夫': 'ball'
  };

  /* ---------- 30 个地标 ----------
     累计公里：由真实经纬度的大圆距离逐段累加（北京出发、向西绕行），
     再按 k = 40075 / 41063 ≈ 0.9759 等比缩放，使第 30 站恰为 40075。
     单站与实测偏差 ≤3%，用于"环游刻度"而非导航里程。 */
  var LANDMARKS = [
    { no: 1,  name: '北京',       cum_km: 0,     copy: '账本从这里翻开，旅程也从这里出发。', fact: '北京中轴线（钟鼓楼至永定门）约 7.8 km，2024 年列入《世界遗产名录》。' },
    { no: 2,  name: '乌鲁木齐',   cum_km: 2353,  copy: '翻过天山，抵达离海最远的一座城。', fact: '乌鲁木齐是世界上距海洋最远的大城市之一，距最近海岸约 2,500 km。' },
    { no: 3,  name: '喀什',       cum_km: 3406,  copy: '老城的土墙被夕阳照亮，巷子拐了又拐。', fact: '喀什高台民居有 600 多年历史，是中国唯一以伊斯兰文化为特色的迷宫式老街区。' },
    { no: 4,  name: '阿拉木图',   cum_km: 3822,  copy: '雪山就在街尽头，苹果树结满山坡。', fact: '阿拉木图在 1991–1997 年曾是哈萨克斯坦首都，也是苹果的栽培起源地之一。' },
    { no: 5,  name: '撒马尔罕',   cum_km: 4718,  copy: '蓝瓷砖在烈日下发亮，丝路的风还在吹。', fact: '乌兹别克斯坦的撒马尔罕是丝路名城，列吉斯坦广场由三座 15–17 世纪神学院围成。' },
    { no: 6,  name: '塔什干',     cum_km: 4977,  copy: '绿荫很厚，地铁站像一座座地下宫殿。', fact: '塔什干是中亚人口最多的城市，1976 年大地震后大规模重建。' },
    { no: 7,  name: '德黑兰',     cum_km: 6607,  copy: '城市背后，厄尔布尔士山的雪线一路随行。', fact: '德黑兰海拔约 1,200 m，背靠厄尔布尔士山脉，是中东海拔较高的大都市。' },
    { no: 8,  name: '巴库',       cum_km: 7135,  copy: '里海的风把火苗吹得歪了一下。', fact: '巴库被称为"火之国"，郊外的 Yanar Dag 天然气自燃已持续数十年。' },
    { no: 9,  name: '伊斯坦布尔', cum_km: 8851,  copy: '一脚在欧洲，一脚在亚洲，船笛声不断。', fact: '伊斯坦布尔是唯一横跨欧亚两洲的大城市，博斯普鲁斯海峡从城中穿过。' },
    { no: 10, name: '基辅',       cum_km: 9882,  copy: '第聂伯河的台阶上，栗子树正开花。', fact: '基辅的圣索菲亚大教堂始建于 11 世纪，是东斯拉夫建筑的重要遗产。' },
    { no: 11, name: '莫斯科',     cum_km: 10619, copy: '红场的石砖被脚步磨得发亮。', fact: '红场面积约 2.3 万 m²，圣瓦西里大教堂有 9 个彩色穹顶。' },
    { no: 12, name: '圣彼得堡',   cum_km: 11236, copy: '凌晨的河面还亮着，天色不肯黑。', fact: '圣彼得堡位于北纬约 60°，夏季会出现"白夜"，日落极晚。' },
    { no: 13, name: '赫尔辛基',   cum_km: 11531, copy: '岩石教堂里，回声比风更干净。', fact: '赫尔辛基的岩石教堂（Temppeliaukio）直接凿入花岗岩，穹顶为铜制。' },
    { no: 14, name: '塔林',       cum_km: 11611, copy: '红屋顶一座接一座，塔尖数不过来。', fact: '塔林老城是 UNESCO 世界遗产，城墙与塔楼大多建于 13–16 世纪。' },
    { no: 15, name: '斯德哥尔摩', cum_km: 11981, copy: '十四座岛，一路都是桥和水的颜色。', fact: '斯德哥尔摩由 14 座岛屿组成，市区有 50 多座桥把它们连在一起。' },
    { no: 16, name: '哥本哈根',   cum_km: 12490, copy: '自行车比汽车多，风把车铃吹得很轻。', fact: '哥本哈根通勤者中骑自行车的比例接近一半，是著名的自行车城市。' },
    { no: 17, name: '阿姆斯特丹', cum_km: 13096, copy: '运河一圈套一圈，房子窄得很有礼貌。', fact: '阿姆斯特丹运河带 2010 年列入《世界遗产名录》，城区海拔低于海平面。' },
    { no: 18, name: '伦敦',       cum_km: 13446, copy: '一条线从地面穿过，时间在这里排队。', fact: '格林尼治天文台所在的本初子午线（0° 经线）穿过伦敦东南部。' },
    { no: 19, name: '都柏林',     cum_km: 13898, copy: '酒馆门一推开，音乐就先把座位占满。', fact: '都柏林跨利菲河而建，健力士黑啤的酒厂与 9,000 年租约是城市名片。' },
    { no: 20, name: '雷克雅未克', cum_km: 15357, copy: '北纬六十四度，热水从地下直接进屋。', fact: '雷克雅未克是世界最北的首都，市区供暖几乎全部来自地热。' },
    { no: 21, name: '纽约',       cum_km: 19458, copy: '楼太高，天空被切成一条一条。', fact: '曼哈顿中央公园面积约 3.41 km²，是纽约最大的城市公园。' },
    { no: 22, name: '芝加哥',     cum_km: 20575, copy: '风从湖上来，铁桥一座座抬高又放下。', fact: '芝加哥常被称为摩天楼发源地，1900 年工程人员让芝加哥河倒流以保护水源。' },
    { no: 23, name: '墨西哥城',   cum_km: 23231, copy: '老城下面还压着一座水上的城。', fact: '墨西哥城建在特斯科科湖的湖床上，海拔约 2,240 m，长期抽取地下水导致地面沉降。' },
    { no: 24, name: '洛杉矶',     cum_km: 25662, copy: '公路尽头是海，山上的字慢慢变白。', fact: '洛杉矶是好莱坞所在地，66 号公路的西端终点在圣莫尼卡。' },
    { no: 25, name: '拉斯维加斯', cum_km: 26020, copy: '沙漠里亮起一条街，白天像没睡醒。', fact: '拉斯维加斯位于莫哈韦沙漠，20 世纪 40 年代起随赌场与演出业迅速扩张。' },
    { no: 26, name: '温哥华',     cum_km: 27576, copy: '海堤步道上，跑者比海鸥还准时。', fact: '温哥华斯坦利公园面积约 4.05 km²，比纽约中央公园更大。' },
    { no: 27, name: '西雅图',     cum_km: 27768, copy: '雨很细，咖啡很烫，雪山在天边。', fact: '西雅图是星巴克 1971 年首店与波音早期厂房的所在地，晴天可见瑞尼尔山。' },
    { no: 28, name: '檀香山',     cum_km: 31976, copy: '浪把脚印一遍遍抹掉，再重新写上。', fact: '檀香山是夏威夷州首府，威基基海滩因 20 世纪初的冲浪推广而闻名。' },
    { no: 29, name: '东京',       cum_km: 38036, copy: '最后一班电车进站，站台安静了一秒。', fact: '东京都市圈人口约 3,700 万，是世界上人口最多的都市圈。' },
    { no: 30, name: '北京',       cum_km: 40075, copy: '地球一圈走完，账本又翻回第一页。', fact: '地球赤道周长约 40,075 km，这就是"绕地球一圈"的尺子。' }
  ];

  /* ---------- 小工具 ---------- */
  function isPos(n) { return typeof n === 'number' && isFinite(n) && n > 0; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function mod(a, b) { return ((a % b) + b) % b; }
  function cleanWeight(w) {
    var n = Number(w);
    return isFinite(n) && n >= 25 && n <= 300 ? n : DEFAULT_WEIGHT_KG;
  }

  function resolveIntensity(rec) {
    var raw = rec && rec.intensity;
    if (!raw) return 'mid';
    var key = String(raw).trim().toLowerCase();
    return INTENSITY[key] || 'mid';
  }

  function resolveType(rec) {
    if (!rec) return null;
    var raw = rec.type || rec.name;
    if (!raw) return rec.mets ? 'other' : null;
    var key = String(raw).trim();
    if (MET_TABLE[key]) return key;
    var low = key.toLowerCase();
    if (MET_TABLE[low]) return low;
    if (NAME_TO_TYPE[key]) return NAME_TO_TYPE[key];
    return rec.mets ? 'other' : null;
  }

  function resolveMets(rec) {
    if (!rec) return null;
    var legacy = Number(rec.mets);
    if (isFinite(legacy) && legacy > 0) return legacy; // 旧记录自带 MET，优先保真
    var type = resolveType(rec);
    if (type && MET_TABLE[type]) return MET_TABLE[type][resolveIntensity(rec)];
    return null;
  }

  function resolveWeight(rec, weight) {
    if (rec && isPos(Number(rec.weight_at_time))) return Number(rec.weight_at_time);
    if (isPos(Number(weight))) return Number(weight);
    return DEFAULT_WEIGHT_KG;
  }

  /* ---------- 1. 估热量 ---------- */
  function estimateKcal(rec, weight) {
    var mets = resolveMets(rec);
    if (!mets) return 0;
    var minutes = Number(rec.minutes);
    if (!isFinite(minutes) || minutes <= 0) return 0;
    var kg = resolveWeight(rec, weight);
    return Math.round(mets * kg * (minutes / 60) * K_KCAL);
  }

  /* ---------- 2. 折算等效公里 ---------- */
  /* ascentM 只在登山/徒步类传入；其它类型传 0 或省略 */
  function toEquivalentKm(kcal, weight, ascentM) {
    var n = Number(kcal);
    if (!isFinite(n) || n <= 0) {
      // 0 热量时仍可能有纯爬升（如负重爬楼），但本模块不允许无时长记录推进度
      if (!(isFinite(Number(ascentM)) && Number(ascentM) > 0)) return 0;
      n = 0;
    }
    var kg = cleanWeight(weight);
    var base = n / (kg * KCAL_PER_KG_KM);
    var ascent = Number(ascentM);
    var extra = isFinite(ascent) && ascent > 0 ? (ascent / 100) * ASCENT_KM_PER_100M : 0;
    return round2(base + extra);
  }

  /* ---------- 3. 单条记录校验 ---------- */
  function validateRecord(rec, dayTotalMinutes) {
    if (!rec) return { ok: false, code: 'no_record', message: '这条记录为空，未计入里程。' };
    if (!resolveMets(rec)) {
      return { ok: false, code: 'unknown_type', message: '运动类型无法识别，这条只存档、不推进度。' };
    }
    var minutes = Number(rec.minutes);
    if (!isFinite(minutes) || minutes < 1) {
      return { ok: false, code: 'no_minutes', message: '缺少有效时长，这条只存档、不推进度。' };
    }
    if (minutes > LIMIT.singleMinutes) {
      return { ok: false, code: 'too_long', message: '单次超过 12 小时，这条只存档、不推进度。' };
    }
    var day = Number(dayTotalMinutes);
    if (isFinite(day) && day > LIMIT.dailyMinutes) {
      return { ok: false, code: 'daily_over_12h', message: '当天累计超过 12 小时，这条只存档、不推进度。' };
    }
    var type = resolveType(rec);
    var km = Number(rec.distance_km);
    if (isFinite(km) && km > 0 && minutes / km < LIMIT.paceMinPerKm) {
      return { ok: false, code: 'pace_too_fast', message: '配速快于 3:00/km，超过常理，这条只存档、不推进度。' };
    }
    if ((type === 'run' || type === 'jog') && isFinite(km) && km > LIMIT.runKm) {
      return { ok: false, code: 'run_too_far', message: '单次跑步超过 42 km，这条只存档、不推进度。' };
    }
    if (type === 'swim' && isFinite(km) && km > LIMIT.swimKm) {
      return { ok: false, code: 'swim_too_far', message: '单次游泳超过 10 km，这条只存档、不推进度。' };
    }
    var ascent = Number(rec.ascent_m);
    if (isFinite(ascent) && ascent > LIMIT.ascentM) {
      return { ok: false, code: 'ascent_too_high', message: '单次爬升超过 3,000 m，这条只存档、不推进度。' };
    }
    var kmEq = toEquivalentKm(estimateKcal(rec, resolveWeight(rec, null)), resolveWeight(rec, null), ascent);
    if (kmEq > LIMIT.singleKmEq) {
      return { ok: false, code: 'single_too_far', message: '单次折算里程超过 120 km，这条只存档、不推进度。' };
    }
    return { ok: true, code: null, message: '' };
  }

  /* ---------- 3.5 可信度分级 ----------
     manual → L0（基础里程，1×）
     import → L1（导入文件，判定通过 1.2×；判为 suspect 则 0）
     motion → L2（手机计步估算，1×）
     倍率只影响"计入环游记的里程"，不改 kcal 与原始 km_eq。 */
  var SOURCE_LABEL = { manual: '手记', import: '导入', motion: '计步' };
  function sourceOf(rec) {
    var s = rec && rec.source;
    return SOURCE_LABEL[s] ? s : 'manual';
  }
  function confidenceOf(rec) {
    var s = sourceOf(rec);
    return s === 'import' ? 'L1' : (s === 'motion' ? 'L2' : 'L0');
  }
  function recFactor(rec) {
    if (!rec) return 0;
    if (rec.valid === false || rec.suspect === true) return 0;
    var m = Number(rec.multiplier);
    if (isFinite(m) && m >= 0) return m;
    return confidenceOf(rec) === 'L1' ? 1.2 : 1;
  }
  /* 计入环游记的里程（含倍率；仅存档记录为 0） */
  function countedKm(rec, weight) {
    if (!rec || rec.valid === false || rec.suspect === true) return 0;
    var kg = resolveWeight(rec, weight);
    var kcal = Number(rec.kcal) > 0 ? Number(rec.kcal) : estimateKcal(rec, weight);
    var ascent = Number(rec.ascent_m) > 0 ? Number(rec.ascent_m) : 0;
    var kmEq = Number(rec.km_eq) > 0 ? Number(rec.km_eq) : toEquivalentKm(kcal, kg, ascent);
    return round2(kmEq * recFactor(rec));
  }

  /* ---------- 4. 累计 ---------- */
  /* 只累计校验通过的记录。当天总时长按数组顺序累加（含未通过的记录，因为身体承受的是总负荷），
     超 12 h 的那条起判为 daily_over_12h。 */
  function accumulate(records, weight) {
    var list = Array.isArray(records) ? records : [];
    var dayRun = {};
    var totalKm = 0, totalMin = 0, kcalTotal = 0, valid = 0, skipped = [], byType = {};

    list.forEach(function (r) {
      if (!r) { skipped.push({ id: null, code: 'no_record' }); return; }
      var d = String(r.date || 'unknown');
      var m = Number(r.minutes);
      dayRun[d] = (dayRun[d] || 0) + (isFinite(m) && m > 0 ? m : 0);
      var v = validateRecord(r, dayRun[d]);
      if (!v.ok) {
        skipped.push({ id: r.id != null ? r.id : null, code: v.code });
        return;
      }
      var kg = resolveWeight(r, weight);
      var kcal = Number.isFinite(Number(r.kcal)) && Number(r.kcal) > 0
        ? Number(r.kcal)                       // 旧记录已有 kcal，直接沿用
        : estimateKcal(r, weight);
      var ascent = Number(r.ascent_m) > 0 ? Number(r.ascent_m) : 0;
      var kmEq = r.km_eq != null && Number.isFinite(Number(r.km_eq)) && Number(r.km_eq) > 0
        ? round2(Number(r.km_eq))              // 已写入的等效里程，直接沿用
        : toEquivalentKm(kcal, kg, ascent);
      var counted = round2(kmEq * recFactor(r));
      totalKm += counted;
      totalMin += Number(r.minutes) || 0;
      kcalTotal += kcal;
      valid += 1;
      var type = resolveType(r) || 'other';
      if (!byType[type]) byType[type] = { minutes: 0, km_eq: 0, count: 0 };
      byType[type].minutes += Number(r.minutes) || 0;
      byType[type].km_eq = round2(byType[type].km_eq + counted);
      byType[type].count += 1;
    });

    return {
      total_km: round2(totalKm),
      total_minutes: totalMin,
      kcal_total: kcalTotal,
      valid_count: valid,
      invalid_count: skipped.length,
      skipped: skipped,
      by_type: byType
    };
  }

  /* ---------- 5. 当前站点 ---------- */
  /* totalKm 超过一圈时按圈内里程取站点；第 30 站（北京 40075）为完成一圈的那一刻 */
  function currentStation(totalKm) {
    var n = Number(totalKm);
    var inLap = isFinite(n) && n > 0 ? mod(n, EARTH_CIRCUMFERENCE_KM) : 0;
    if (isFinite(n) && n > 0 && n % EARTH_CIRCUMFERENCE_KM === 0 && n >= EARTH_CIRCUMFERENCE_KM) {
      var last = LANDMARKS[LANDMARKS.length - 1];
      return {
        index: LANDMARKS.length - 1, station: last, next: last,
        to_next_km: 0, progress: 1, in_lap_km: EARTH_CIRCUMFERENCE_KM, done_lap_km: true
      };
    }
    var idx = 0;
    for (var i = 0; i < LANDMARKS.length; i++) {
      if (LANDMARKS[i].cum_km <= inLap) idx = i; else break;
    }
    var cur = LANDMARKS[idx];
    var next = LANDMARKS[Math.min(idx + 1, LANDMARKS.length - 1)];
    var span = next.cum_km - cur.cum_km;
    return {
      index: idx,
      station: cur,
      next: next,
      to_next_km: round2(next.cum_km - inLap),
      progress: span > 0 ? round2((inLap - cur.cum_km) / span) : 1,
      in_lap_km: round2(inLap),
      done_lap_km: false
    };
  }

  /* ---------- 6. 圈数 ---------- */
  function laps(totalKm) {
    var n = Number(totalKm);
    if (!isFinite(n) || n <= 0) return { lap: 0, inLapKm: 0, remainKm: EARTH_CIRCUMFERENCE_KM };
    var lap = Math.floor(n / EARTH_CIRCUMFERENCE_KM);
    var inLap = mod(n, EARTH_CIRCUMFERENCE_KM);
    return {
      lap: lap,
      inLapKm: round2(inLap),
      remainKm: round2(EARTH_CIRCUMFERENCE_KM - inLap)
    };
  }

  /* ---------- 7. 展示辅助（供规格引用，不参与计算） ---------- */
  function describe(rec, weight) {
    var kg = resolveWeight(rec, weight);
    var assumed = !(rec && isPos(Number(rec.weight_at_time))) && !isPos(Number(weight));
    var kcal = estimateKcal(rec, weight);
    var km = toEquivalentKm(kcal, kg, rec && rec.ascent_m);
    return {
      weight_kg: kg,
      weight_assumed: assumed,
      kcal: kcal,
      km_eq: km,
      text: (assumed ? '按 ' + kg + ' kg 估算：' : '') + kcal + ' kcal ≈ ' + km + ' km'
    };
  }

  return {
    constants: {
      EARTH_CIRCUMFERENCE_KM: EARTH_CIRCUMFERENCE_KM,
      K_KCAL: K_KCAL,
      KCAL_PER_KG_KM: KCAL_PER_KG_KM,
      ASCENT_KM_PER_100M: ASCENT_KM_PER_100M,
      DEFAULT_WEIGHT_KG: DEFAULT_WEIGHT_KG,
      LIMIT: LIMIT
    },
    MET_TABLE: MET_TABLE,
    CATEGORIES: CATEGORIES,
    FIELD_SPEC: FIELD_SPEC,
    SOURCE_LABEL: SOURCE_LABEL,
    sourceOf: sourceOf,
    confidenceOf: confidenceOf,
    recFactor: recFactor,
    countedKm: countedKm,
    LANDMARKS: LANDMARKS,
    estimateKcal: estimateKcal,
    toEquivalentKm: toEquivalentKm,
    accumulate: accumulate,
    currentStation: currentStation,
    laps: laps,
    validateRecord: validateRecord,
    describe: describe,
    resolveType: resolveType,
    resolveMets: resolveMets,
    resolveWeight: resolveWeight
  };
});
