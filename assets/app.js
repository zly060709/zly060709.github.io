/* 能量账本 · 应用层
   本地优先：数据只写入当前设备的 localStorage。
   设计原则：账本可以估算，但必须诚实地展示不确定性，并用你自己的数据持续校准。 */
(function () {
  'use strict';

  const E = window.Engine;
  const DATA = window.LEDGER_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const icon = (n, cls) => '<svg class="' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString('en-US') : '—');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pct = (v, max) => clamp(max > 0 ? v / max * 100 : 0, 0, 100);
  const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const round1 = n => Math.round(n * 10) / 10;
  const round5 = n => Math.round(n / 5) * 5;
  const STATIC_MODE = (function () {
    const meta = document.querySelector('meta[name="ledger-mode"]');
    return !!(meta && meta.getAttribute('content') === 'static');
  })();

  /* ============================================================
     存储
     ============================================================ */
  const KEY = 'energy-ledger.v2';
  const DEFAULT_DB = {
    version: 2,
    createdAt: Date.now(),
    onboarded: false,
    profile: null,
    settings: { theme: 'auto', ai: { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-flash', key: '' }, demo: false },
    entries: [],
    weights: [],
    exercises: [],
    foods: [],
    combos: [],
    water: {},
    notes: {}
  };

  function normalizeDB(raw) {
    const db = Object.assign({}, DEFAULT_DB, raw || {});
    db.settings = Object.assign({}, DEFAULT_DB.settings, db.settings || {});
    db.settings.ai = Object.assign({}, DEFAULT_DB.settings.ai, (db.settings || {}).ai || {});
    ['entries', 'weights', 'exercises', 'foods', 'combos'].forEach(k => {
      if (!Array.isArray(db[k])) db[k] = [];
    });
    if (!db.water || typeof db.water !== 'object') db.water = {};
    if (!db.notes || typeof db.notes !== 'object') db.notes = {};
    db.entries.forEach(e => {
      if (!e.id) e.id = uid();
      if (!e.date && e.dateKey) e.date = e.dateKey;
      if (!e.conf) e.conf = e.source === 'ai' ? 'low' : (e.source === 'manual' || e.source === 'custom') ? 'high' : 'med';
    });
    db.weights = db.weights.map(w => ({ date: w.date || w.dateKey, kg: Number(w.kg != null ? w.kg : w.weight) })).filter(w => w.date && w.kg > 0);
    if (db.profile && (!db.profile.sex || !Number(db.profile.age) || !Number(db.profile.height) || !Number(db.profile.weight))) {
      db.profile = null;
      db.onboarded = false;
    }
    return db;
  }

  let DB;
  let storageOK = true;
  function loadDB() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return normalizeDB({});
      return normalizeDB(JSON.parse(raw));
    } catch (err) {
      storageOK = false;
      console.warn('[账本] 本地存储不可用', err);
      return normalizeDB({});
    }
  }
  function saveDB(silent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(DB));
      storageOK = true;
    } catch (err) {
      storageOK = false;
      if (!silent) toast('保存失败：本地存储空间不足或被浏览器限制');
    }
  }
  DB = loadDB();

  /* ============================================================
     主题
     ============================================================ */
  const mqDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() {
    const pref = DB.settings.theme || 'auto';
    if (pref === 'auto') return mqDark && mqDark.matches ? 'dark' : 'light';
    return pref;
  }
  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#121714' : '#EFECE2');
  }
  if (mqDark && mqDark.addEventListener) mqDark.addEventListener('change', () => { if (DB.settings.theme === 'auto') applyTheme(); });

  /* ============================================================
     UI 基础
     ============================================================ */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  const state = {
    tab: 'today',
    recordDate: E.todayKey(),
    range: 14,
    nextSeed: 0,
    ob: null,
    sheet: null,
    sheetData: null
  };

  function setTab(tab) {
    state.tab = tab;
    $$('.rail-nav button, .tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $$('.view').forEach(v => { v.hidden = v.dataset.view !== tab; });
    renderActive();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function renderActive() {
    if (state.tab === 'today') renderToday();
    else if (state.tab === 'ledger') renderLedger();
    else if (state.tab === 'trend') renderTrend();
    else if (state.tab === 'settings') renderSettings();
    updateRail();
  }
  function updateRail() {
    const today = E.todayKey();
    const st = E.streak(DB.entries, today);
    const rs = $('#railStreak');
    if (rs) rs.textContent = st;
    const ts = $('#topStreak');
    if (ts) ts.textContent = st > 0 ? '连续 ' + st + ' 天' : (DB.onboarded ? '从今天开始' : '尚未开始');
    const td = $('#topDate');
    if (td) td.textContent = E.dateLabel(today) + ' 周' + E.weekday(today);
  }

  /* ============================================================
     派生数据
     ============================================================ */
  function allFoods() {
    return E.FOODS.concat(DB.foods || []);
  }
  function currentWeight() {
    const w = E.latestWeight(DB.weights, DB.profile);
    return w ? w.kg : (DB.profile && DB.profile.weight) || 65;
  }
  function targetsNow() {
    if (!DB.profile) return null;
    return E.targets(DB.profile, currentWeight());
  }
  function snapshot(dateKey) {
    const t = targetsNow();
    if (!t) return null;
    const day = dateKey || E.todayKey();
    const ad = E.adaptive(DB.entries, DB.weights, DB.profile, t, day);
    const budget = ad.budget;
    const sum = E.summary(DB.entries, day);
    const burned = E.burnedByDate(DB.exercises, day);
    return { t, ad, budget, sum, burned, remain: budget - sum.kcal, day };
  }
  function recents(n) {
    const seen = {};
    const out = [];
    for (let i = DB.entries.length - 1; i >= 0 && out.length < (n || 6); i--) {
      const e = DB.entries[i];
      if (!e.name || seen[e.name]) continue;
      seen[e.name] = 1;
      out.push(e);
    }
    return out;
  }
  function entryMacros(e) {
    if (e.per100 && e.grams) {
      const p = e.per100;
      return {
        kcal: Math.round(p.kcal * e.grams / 100),
        p: round1(p.p * e.grams / 100),
        c: round1(p.c * e.grams / 100),
        f: round1(p.f * e.grams / 100),
        fib: round1(p.fib * e.grams / 100)
      };
    }
    return { kcal: Math.round(Number(e.kcal) || 0), p: Number(e.p) || 0, c: Number(e.c) || 0, f: Number(e.f) || 0, fib: Number(e.fib) || 0 };
  }
  function makeEntry(food, grams, meal, dateKey, source, conf) {
    const g = Math.max(1, round1(grams));
    const kcal = Math.round(food.kcal * g / 100 * 10) / 10;
    return {
      id: uid(),
      date: dateKey,
      meal: meal,
      name: food.name,
      grams: g,
      per100: { kcal: food.kcal, p: food.p, c: food.c, f: food.f, fib: food.fib },
      kcal: Math.round(kcal),
      p: round1(food.p * g / 100),
      c: round1(food.c * g / 100),
      f: round1(food.f * g / 100),
      fib: round1(food.fib * g / 100),
      conf: conf || (source === 'ai' ? 'low' : (source === 'manual' || source === 'custom') ? 'high' : 'med'),
      source: source || 'lib',
      createdAt: Date.now()
    };
  }
  function addEntry(entry) {
    DB.entries.push(entry);
    saveDB();
  }

  /* ============================================================
     今日
     ============================================================ */
  function renderToday() {
    const view = $('#view-today');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, budget, sum, burned, remain } = st;
    const streak = E.streak(DB.entries, today);
    const burnedNote = burned > 0;
    const scale = Math.max(budget, sum.high * 1.03, 1);
    const fillPct = sum.kcal / scale * 100;
    const bandLeft = sum.low / scale * 100;
    const bandW = Math.max(0.8, (sum.high - sum.low) / scale * 100);
    const tickPct = budget / scale * 100;
    const over = remain < 0;
    const meals = E.MEALS.map(m => {
      const s = sum.byMeal[m[0]];
      return { key: m[0], label: m[1], ...s };
    });
    const nb = E.nextBite({ remaining: remain, proteinGap: t.protein - sum.p, meal: E.guessMeal(), foods: allFoods(), seed: state.nextSeed });
    const recent = recents(6);
    const water = Number(DB.water[today] || 0);
    const weightToday = DB.weights.find(w => w.date === today) || null;
    const lastWeight = E.latestWeight(DB.weights, DB.profile);

    const statusText = {
      prior: '公式先验',
      calibrating: '校准中',
      calibrated: '已校准'
    }[ad.status];
    const calibSub = ad.status === 'prior'
      ? '需要至少 8 天完整摄入与 5 次体重，才能开始反推你的真实消耗'
      : '已用 ' + ad.validDays + ' 天摄入与 ' + ad.weightDays + ' 次体重反推 · 还需约 ' + ad.daysNeeded + ' 天更稳';

    const heroCap = over
      ? '已超过今日预算 <b>' + fmt(Math.abs(remain)) + '</b> kcal · 下一餐清淡些，不必补偿'
      : '今日还可摄入 · 估算区间 <span class="range">' + fmt(Math.max(0, budget - sum.high)) + '–' + fmt(Math.max(0, budget - sum.low)) + ' kcal</span>';
    const quickActions = STATIC_MODE
      ? [['open-add', 'plus', '记一餐'], ['open-manual', 'edit', '手动热量'], ['open-exercise', 'run', '记运动'], ['open-weight', 'scale', '称重']]
      : [['open-add', 'plus', '记一餐'], ['open-ai', 'camera', '拍照识别'], ['open-exercise', 'run', '记运动'], ['open-weight', 'scale', '称重']];

    view.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">今日</h1><div class="page-sub">记录得更少，知道得更多</div></div>' +
        '<div class="tiny faint">仅本机 · 无账号</div>' +
      '</div>' +

      '<section class="hero">' +
        '<div class="hero-top">' +
          '<div class="hero-date"><b>' + E.dateLabel(today) + '</b> · 周' + E.weekday(today) + '</div>' +
          (streak > 0 ? '<div class="hero-streak">' + icon('flame') + '连续 ' + streak + ' 天</div>' : '<div class="hero-streak" style="background:transparent;border-color:var(--line);color:var(--ink-3)">今天开始</div>') +
        '</div>' +
        '<div class="balance"><div class="balance-num' + (over ? ' neg' : '') + '">' + fmt(Math.abs(remain)) + '</div><div class="balance-unit">kcal ' + (over ? '超出' : '可用') + '</div></div>' +
        '<div class="bal-cap">' + heroCap + '</div>' +
        '<div class="meter">' +
          '<div class="meter-band" style="left:' + bandLeft + '%;width:' + bandW + '%"></div>' +
          '<div class="meter-fill' + (over ? ' warn' : '') + '" style="width:' + Math.min(100, fillPct) + '%"></div>' +
          '<div class="meter-tick" style="left:' + tickPct + '%"></div>' +
        '</div>' +
        '<div class="meter-legend"><span>0</span><span>估算 ' + fmt(sum.low) + '–' + fmt(sum.high) + ' kcal · 预算线 ' + fmt(budget) + '</span></div>' +
        '<div class="hero-stats">' +
          '<div class="hs-item"><div class="n">' + fmt(sum.kcal) + '</div><div class="l">已摄入 kcal</div></div>' +
          '<div class="hs-item"><div class="n">' + fmt(budget) + '</div><div class="l">今日预算 kcal</div></div>' +
          '<div class="hs-item"><div class="n' + (burned ? ' amber' : '') + '">' + fmt(burned) + '</div><div class="l">运动消耗 kcal</div></div>' +
        '</div>' +
        '<div class="hero-note">' + icon('info') + '<span>预算随代谢校准变化；运动用于校准与趋势，不额外兑换食物，避免重复计算。</span></div>' +
      '</section>' +

      '<section class="quick-card">' +
        quickActions.map(q => '<button class="quick" data-act="' + q[0] + '"><span class="q-ic">' + icon(q[1]) + '</span><span class="q-t">' + q[2] + '</span></button>').join('') +
      '</section>' +

      (recent.length ?
      '<section class="recent-strip">' +
        '<div class="search-caption"><span class="k">最近吃过</span><span class="tiny faint">点一下，按上次份量记入</span></div>' +
        '<div class="chip-row">' +
          recent.map(e => '<button class="chip" data-act="recent-add" data-id="' + e.id + '">' + esc(e.name) + '<span class="n">' + fmt(e.kcal) + ' kcal</span></button>').join('') +
        '</div>' +
      '</section>' : '') +

      '<section class="card macro-card" style="margin-top:16px">' +
        '<div class="macro-grid">' +
          '<div class="macro"><div class="top"><span class="name">蛋白质</span><span class="val">' + fmt(sum.p) + '<small>/' + t.protein + 'g</small></span></div><div class="macro-bar"><span style="width:' + pct(sum.p, t.protein) + '%"></span></div></div>' +
          '<div class="macro"><div class="top"><span class="name">膳食纤维</span><span class="val">' + fmt(sum.fib) + '<small>/' + t.fiber + 'g</small></span></div><div class="macro-bar"><span class="amber" style="width:' + pct(sum.fib, t.fiber) + '%"></span></div></div>' +
          '<div class="macro"><div class="top"><span class="name">饮水</span><span class="val">' + round1(water / 1000) + '<small>/' + round1(t.water / 1000) + 'L</small></span></div><div class="macro-bar"><span class="blue" style="width:' + pct(water, t.water) + '%"></span></div><button class="btn-quiet tiny" data-act="quick-water" data-ml="250" style="padding:2px 0;color:var(--ink-3)">' + icon('plus', 'inline-ic') + '250ml</button></div>' +
        '</div>' +
      '</section>' +

      '<section class="card calib-card" style="margin-top:12px">' +
        '<div class="calib">' +
          '<div class="calib-left">' +
            '<div class="eyebrow">代谢校准 · ' + statusText + '</div>' +
            '<div class="calib-val" style="margin-top:5px">≈ ' + fmt(ad.tdee) + ' <small>kcal/天</small> <small style="color:var(--ink-3)">±' + fmt(ad.band) + '</small></div>' +
            '<div class="calib-sub">' + calibSub + '</div>' +
            '<div class="calib-bar"><span style="width:' + Math.max(4, ad.percent) + '%"></span></div>' +
          '</div>' +
          '<div class="calib-right"><div class="calib-big">' + ad.percent + '%</div><div class="calib-small">可信度</div></div>' +
        '</div>' +
        '<div class="row-between" style="margin-top:12px">' +
          '<span class="tiny faint">公式先验 ' + fmt(ad.prior) + ' kcal' + (ad.observed ? ' · 数据反推 ' + fmt(ad.observed) : '') + '</span>' +
          '<button class="btn-quiet tiny" data-act="open-engine" style="color:var(--green)">怎么算的 ›</button>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h2>下一口</h2><span class="next-badge">' + E.mealLabel(E.guessMeal()) + '</span></div>' +
        renderNextBite(nb, remainingText(remain, sum)) +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h2>今日流水</h2><span class="act" data-act="goto-ledger">去账本 ›</span></div>' +
        '<div class="card card-tight">' +
          '<div class="timeline">' +
            meals.map(m => {
              const names = m.items.slice(0, 2).map(x => x.name).join('、');
              return '<button type="button" class="tl-row" data-act="goto-meal" data-meal="' + m.key + '">' +
                '<span class="tl-time">' + m.label + '</span>' +
                '<span class="tl-dot' + (m.items.length ? '' : ' empty') + '"></span>' +
                '<span class="tl-main"><span class="t">' + (m.items.length ? esc(names) + (m.items.length > 2 ? ' 等 ' + m.items.length + ' 项' : '') : '还没有记录') + '</span>' +
                '<span class="s">' + (m.items.length ? m.p + 'g 蛋白' + (m.items.some(i => i.conf === 'low') ? ' · 含粗估' : '') : '点这里补一笔') + '</span></span>' +
                '<span class="tl-kcal' + (m.items.length ? '' : ' faint') + '">' + (m.items.length ? fmt(m.kcal) : '+') + '</span>' +
              '</button>';
            }).join('') +
            (burnedNote ? '<div class="tl-row">' +
              '<span class="tl-time">运动</span><span class="tl-dot" style="background:var(--amber)"></span>' +
              '<span class="tl-main"><span class="t">' + esc((DB.exercises.filter(x => x.date === today).map(x => x.name).slice(0, 2).join('、') || '运动')) + '</span><span class="s">用于校准，不抵扣食物</span></span>' +
              '<span class="tl-kcal amber">-' + fmt(burned) + '</span></div>' : '') +
            (weightToday ? '<div class="tl-row"><span class="tl-time">体重</span><span class="tl-dot" style="background:var(--green-line)"></span>' +
              '<span class="tl-main"><span class="t">' + weightToday.kg + ' kg</span><span class="s">趋势值 ' + (ad.trendWeight != null ? ad.trendWeight : weightToday.kg) + ' kg</span></span>' +
              '<span class="tl-kcal">' + icon('check') + '</span></div>' : '') +
          '</div>' +
          '<div class="balance-line"><span class="k">今日结余（按预算）</span><span class="v' + (over ? ' red' : '') + '">' + (over ? '−' : '') + fmt(Math.abs(remain)) + ' kcal</span></div>' +
        '</div>' +
      '</section>' +

      (!weightToday ? '<section class="weight-prompt"><div><div class="t">今天还没称重</div><div class="s">同一时间、空腹称重，趋势才可信。最近的记录：' + (lastWeight ? lastWeight.kg + ' kg' + (lastWeight.date ? '（' + E.relativeDay(lastWeight.date, today) + '）' : '') : '暂无') + '</div></div><button class="btn btn-ghost btn-sm" data-act="open-weight">记录体重</button></section>' : '') +

      '<div class="disclaimer">所有热量、消耗与代谢值均为估算，会随记录持续校准；本应用不构成医疗建议。</div>';
  }

  function remainingText(remain, sum) {
    if (remain <= 0) return '今日预算已用完。';
    if (sum.kcal === 0) return '从第一笔开始，账本会用你自己的体重变化校准一切。';
    return '';
  }

  function renderNextBite(nb, extra) {
    if (!nb || nb.type !== 'plan') {
      return '<div class="card card-tight"><div class="next-head"><div><div class="tiny faint">' + esc(nb ? nb.text : '') + '</div>' + (extra ? '<div class="tiny faint" style="margin-top:4px">' + esc(extra) + '</div>' : '') + '</div></div></div>';
    }
    return '<div class="card card-tight">' +
      '<div class="next-head"><div><div class="small" style="color:var(--ink-2);line-height:1.75">' + esc(nb.text) + '</div></div><span class="next-badge">' + nb.totals.p + 'g 蛋白</span></div>' +
      '<div class="next-list">' + nb.items.map(it =>
        '<div class="nb-row"><span class="nb-name">' + esc(it.name) + '</span><span class="nb-cat">' + esc(it.cat) + '</span><span class="nb-dots"></span><span class="nb-grams">' + it.grams + 'g</span><span class="nb-kcal">' + it.kcal + '</span></div>'
      ).join('') + '</div>' +
      '<div class="nb-total"><span class="k">这一组 · 占今日剩余 ' + Math.round(nb.totals.kcal / Math.max(1, nb.remaining) * 100) + '%</span><span class="v">' + nb.totals.kcal + ' <small>kcal</small></span></div>' +
      '<div class="next-actions"><button class="btn btn-ghost btn-sm" data-act="next-shuffle">换一组</button><button class="btn btn-primary btn-sm" style="flex:1" data-act="next-log">记下这一餐</button></div>' +
    '</div>';
  }

  function renderNeedsOnboard() {
    return '<div class="card" style="margin-top:30px;text-align:center;padding:36px 24px">' +
      '<div class="mark" style="margin:0 auto 16px;width:44px;height:44px;border-radius:12px">' + icon('mark') + '</div>' +
      '<h2 class="serif" style="font-size:22px">先建立你的基线</h2>' +
      '<div class="small faint" style="margin:8px 0 20px;line-height:1.8">账本需要四个数字来计算起点。<br>之后，它会被你自己的数据替代。</div>' +
      '<button class="btn btn-primary" data-act="open-profile">填写身体档案</button>' +
    '</div>';
  }

  /* ============================================================
     账本
     ============================================================ */
  function renderLedger() {
    const view = $('#view-ledger');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const d = state.recordDate;
    const st = snapshot(d);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, budget, sum, burned, remain } = st;
    const isToday = d === E.todayKey();
    const prevHas = DB.entries.some(e => e.date === E.addDays(d, -1));
    const heatKeys = E.rangeKeys(d, 14).filter(k => k <= E.todayKey());
    const meals = E.MEALS.map(m => ({ key: m[0], label: m[1], ...sum.byMeal[m[0]] }));

    view.innerHTML =
      '<div class="page-head"><div><h1 class="page-title">账本</h1><div class="page-sub">每一笔都能修改，估算也能被标出来</div></div>' +
      '<div class="tiny faint" style="text-align:right">' + (storageOK ? '仅保存在本机' : '⚠ 存储受限') + '</div></div>' +

      '<section class="card">' +
        '<div class="day-nav">' +
          '<button class="arrow-btn" data-act="day-prev">' + icon('chevron-l') + '</button>' +
          '<div class="center"><div class="d">' + E.relativeDay(d, E.todayKey()) + '</div><div class="s">' + E.dateLabel(d) + ' · 周' + E.weekday(d) + (isToday ? '' : ' · 回看') + '</div></div>' +
          '<button class="arrow-btn" data-act="day-next"' + (isToday ? ' disabled' : '') + '>' + icon('chevron-r') + '</button>' +
        '</div>' +

        '<div class="day-summary">' +
          '<div class="ds-item"><div class="v">' + fmt(sum.kcal) + '</div><div class="k">摄入 kcal</div></div>' +
          '<div class="ds-item"><div class="v">' + fmt(budget) + '</div><div class="k">预算 kcal</div></div>' +
          '<div class="ds-item"><div class="v ' + (remain < 0 ? 'red' : 'green') + '">' + (remain < 0 ? '−' : '') + fmt(Math.abs(remain)) + '</div><div class="k">' + (remain < 0 ? '超出' : '结余') + ' kcal</div></div>' +
        '</div>' +

        '<div class="heat-strip">' + heatKeys.map(k => {
          const s = E.summary(DB.entries, k);
          const h = Math.min(100, pct(s.kcal, budget));
          return '<div class="heat-cell"><div class="sq' + (s.kcal > budget * 1.03 ? ' over' : '') + (k === d ? ' today' : '') + '" title="' + E.dateLabel(k) + ' ' + s.kcal + ' kcal"><span style="height:' + h + '%"></span></div><div class="lb">' + (k === E.todayKey() ? '今天' : E.weekday(k)) + '</div></div>';
        }).join('') + '</div>' +

        '<div class="ledger-tools">' +
          '<button class="tool-btn" data-act="copy-yesterday">' + icon('copy') + '复制昨天</button>' +
          '<button class="tool-btn" data-act="open-add">' + icon('plus') + '记一餐</button>' +
          '<button class="tool-btn" data-act="open-exercise">' + icon('run') + '运动</button>' +
          '<button class="tool-btn" data-act="open-weight">' + icon('scale') + '称重</button>' +
          (prevHas ? '' : '') +
        '</div>' +
      '</section>' +

      '<section class="section" style="margin-top:16px">' +
        '<div class="card" style="padding-top:6px;padding-bottom:6px">' +
          meals.map(m => renderMealBlock(m, d)).join('') +
          '<div class="day-note"><span>摄入区间 ' + fmt(sum.low) + '–' + fmt(sum.high) + ' kcal · 已按每笔的可信度计算</span><span>' + sum.count + ' 笔</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="card card-tight" style="margin-top:14px">' +
        '<div class="row-between"><div class="tiny faint">按当前校准的真实消耗做对照</div><div class="tiny faint">TDEE ' + fmt(ad.tdee) + ' ±' + fmt(ad.band) + '</div></div>' +
        '<div class="balance-line"><span class="k">实际能量差（摄入 − 消耗）</span><span class="v ' + (sum.kcal - ad.tdee > 0 ? 'amber' : 'green') + '">' + (sum.kcal - ad.tdee > 0 ? '+' : '') + fmt(sum.kcal - ad.tdee) + ' kcal</span></div>' +
        (burned ? '<div class="tiny faint" style="margin-top:4px">运动已计入日常消耗，不再重复扣减。今天记录的运动消耗：' + fmt(burned) + ' kcal。</div>' : '') +
      '</section>' +

      '<div class="disclaimer">历史日的预算按「当时已有记录」的校准结果计算，所以回看某天时会与今天的预算不同。这是账本在学习，不是数据错误。</div>';
  }

  function renderMealBlock(m, day) {
    return '<div class="meal-block">' +
      '<div class="meal-head"><span class="name">' + m.label + '</span><span class="k">' + m.items.length + ' 项</span><span class="kcal">' + (m.items.length ? fmt(m.kcal) + ' kcal' : '') + '</span>' +
        '<button class="add" data-act="open-add" data-meal="' + m.key + '" title="添加食物">' + icon('plus') + '</button></div>' +
      (m.items.length ? m.items.map(e => {
        const conf = E.confOf(e);
        const label = { high: '准', med: '估', low: '粗' }[conf];
        return '<button type="button" class="entry" data-act="edit-entry" data-id="' + e.id + '">' +
          '<span class="n">' + esc(e.name) + '</span>' +
          '<span class="badge ' + conf + '" title="' + (conf === 'high' ? '热量来自包装或手动核准' : conf === 'med' ? '来自食物参考值' : 'AI 目测，误差较大') + '">' + label + '</span>' +
          '<span class="p">' + (e.p ? e.p + 'g 蛋白' : '蛋白未知') + '</span>' +
          '<span class="dots"></span>' +
          '<span class="k">' + fmt(e.kcal) + '</span>' +
          '<span class="more">' + icon('more') + '</span>' +
        '</button>';
      }).join('') : '<div class="empty-meal">还没有记录，点 + 添加</div>') +
    '</div>';
  }

  /* ============================================================
     趋势
     ============================================================ */
  function renderTrend() {
    const view = $('#view-trend');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, budget } = st;
    const keys = E.rangeKeys(today, state.range);
    const ins = E.insights(DB.entries, DB.weights, DB.profile, t, ad, today, state.range);
    const fore = E.forecast(DB.weights, DB.profile.targetWeight, today, Math.min(28, Math.max(state.range, 14)));
    const hasWeights = DB.weights.length > 0;
    const hasEntries = DB.entries.length > 0;

    const weightChart = hasWeights ? chartWeight(keys) : '<div class="chart-empty">还没有体重记录。秤一次，账本就能开始画线。</div>';
    const intakeChart = hasEntries ? chartIntake(keys, budget) : '<div class="chart-empty">还没有饮食记录。记下第一餐，这里会出现每日柱状图。</div>';

    view.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">趋势</h1><div class="page-sub">不看你今天吃了多少，看你正在往哪里走</div></div>' +
        '<div class="range-tabs">' + [[7, '7 天'], [14, '14 天'], [30, '30 天']].map(r =>
          '<button class="' + (state.range === r[0] ? 'on' : '') + '" data-act="set-range" data-v="' + r[0] + '">' + r[1] + '</button>').join('') +
        '</div>' +
      '</div>' +

      '<section class="card chart-card">' +
        '<div class="chart-head"><div><div class="chart-title">体重与真实趋势</div><div class="chart-sub">点是每次称重，线是平滑趋势 · 去除水分波动</div></div>' +
        '<div style="text-align:right"><div class="serif" style="font-size:20px">' + (ad.trendWeight != null ? ad.trendWeight : '—') + ' <small class="tiny faint">kg</small></div><div class="tiny faint">趋势值</div></div></div>' +
        '<div class="chart-legend"><span class="legend-item"><span class="legend-swatch line"></span>趋势</span><span class="legend-item"><span class="legend-swatch" style="background:var(--line-2);height:5px;border-radius:50%"></span>称重</span>' + (DB.profile.targetWeight ? '<span class="legend-item"><span class="legend-swatch dash"></span>目标 ' + DB.profile.targetWeight + ' kg</span>' : '') + '</div>' +
        '<div class="chart-wrap">' + weightChart + '</div>' +
        (fore ? '<div class="forecast">' +
          '<div class="fc-item"><div class="k">每周变化</div><div class="v ' + (fore.weekly < 0 ? 'green' : 'amber') + '">' + (fore.weekly > 0 ? '+' : '') + fore.weekly + ' <small>kg</small></div></div>' +
          '<div class="fc-item"><div class="k">4 周后（趋势）</div><div class="v">' + fore.fourWeek + ' <small>kg</small></div></div>' +
          '<div class="fc-item"><div class="k">到达目标</div><div class="v">' + (fore.etaDays ? '约 ' + Math.ceil(fore.etaDays / 7) + ' <small>周</small>' : '—') + '</div></div>' +
        '</div>' : '') +
      '</section>' +

      '<section class="card chart-card" style="margin-top:14px">' +
        '<div class="chart-head"><div><div class="chart-title">摄入与预算</div><div class="chart-sub">每根柱子是一天 · 虚线是当前预算</div></div>' +
        '<div class="tiny faint" style="text-align:right">均值<br><span class="serif" style="font-size:15px;color:var(--ink-2)">' + fmt(ins.avgIntake) + '</span></div></div>' +
        '<div class="chart-legend"><span class="legend-item"><span class="legend-swatch bar"></span>未超预算</span><span class="legend-item"><span class="legend-swatch" style="background:var(--amber)"></span>超出</span><span class="legend-item"><span class="legend-swatch dash"></span>预算 ' + fmt(budget) + ' kcal</span></div>' +
        '<div class="chart-wrap">' + intakeChart + '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h2>复盘 · 最近 ' + state.range + ' 天</h2><span class="tiny faint">自动生成</span></div>' +
        '<div class="stat-tiles">' +
          '<div class="stat-tile"><div class="v">' + fmt(ins.avgIntake) + '<small> kcal</small></div><div class="k">平均摄入 · 预算 ' + fmt(budget) + '</div></div>' +
          '<div class="stat-tile"><div class="v ' + ((ins.delta || 0) < 0 ? 'green' : (ins.delta || 0) > 0 ? 'amber' : '') + '">' + (ins.delta == null ? '—' : (ins.delta > 0 ? '+' : '') + ins.delta) + '<small> kg</small></div><div class="k">趋势体重变化</div></div>' +
          '<div class="stat-tile"><div class="v">' + ins.proteinHit + '<small>/' + ins.loggedDays + '</small></div><div class="k">蛋白达标天数</div></div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="narrative">' + ins.narrative.map(p => '<p>' + p + '</p>').join('') + '</div>' +
          '<div class="review-sign"><span>由 ' + DB.entries.length + ' 笔记录生成 · ' + E.dateLabel(today) + '</span><span class="seal">' + (ad.status === 'calibrated' ? '已校准' : '校准中') + '</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head"><h2>模式</h2><span class="tiny faint">不用猜，算出来</span></div>' +
        '<div class="card">' +
          '<div class="pattern-list">' +
            patternRow('记录完整度', ins.coverage + '%', ins.coverage, ins.loggedDays + ' / ' + state.range + ' 天有记录') +
            patternRow('蛋白质达标率', Math.round(ins.proteinHit / Math.max(1, ins.loggedDays) * 100) + '%', ins.proteinHit / Math.max(1, ins.loggedDays) * 100, '平均 ' + ins.avgProtein + 'g / 目标 ' + t.protein + 'g') +
            patternRow('膳食纤维', ins.avgFiber + 'g', ins.avgFiber / Math.max(1, t.fiber) * 100, '目标 ' + t.fiber + 'g / 天') +
            (ins.weekendAvg && ins.weekdayAvg ? patternWeekend(ins) : '') +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="section"><div class="idea">' + icon('spark', 'idea-ic') + '<div>' + suggestionFor(ins, ad, t) + '</div></div></section>' +

      '<div class="disclaimer">趋势与预测基于当前记录估算，体重会受水分、盐分与生理周期影响。请关注 2–4 周的趋势，而不是单日数字。</div>';
  }

  function patternRow(label, valueText, percent, sub) {
    return '<div class="pattern-row"><div class="top"><span>' + label + '<span class="tiny faint"> · ' + sub + '</span></span><span class="v">' + valueText + '</span></div>' +
      '<div class="pattern-track"><span class="a" style="width:' + clamp(percent, 0, 100) + '%"></span></div></div>';
  }
  function patternWeekend(ins) {
    const max = Math.max(ins.weekdayAvg, ins.weekendAvg, 1);
    return '<div class="pattern-row"><div class="top"><span>工作日 vs 周末<span class="tiny faint"> · 摄入均值</span></span><span class="v">' + fmt(ins.weekdayAvg) + ' / ' + fmt(ins.weekendAvg) + '</span></div>' +
      '<div class="pattern-track"><span class="a" style="width:' + (ins.weekdayAvg / max * 50) + '%"></span><span class="b" style="width:' + (ins.weekendAvg / max * 50) + '%"></span></div></div>';
  }
  function suggestionFor(ins, ad, t) {
    if (ins.loggedDays < 5) return '<b>先把记录做完整。</b>账本不要求精确到每一克，但需要知道大概吃了多少。连续记 7 天，校准的可信度会明显上升。';
    if (ins.avgProtein < t.protein * 0.85) return '<b>优先补蛋白质。</b>你平均只到 ' + ins.avgProtein + 'g，目标 ' + t.protein + 'g。最简单的做法：每餐固定加一份鸡蛋、鸡胸、豆腐或无糖酸奶。';
    if (ins.weekendAvg && ins.weekdayAvg && ins.weekendAvg - ins.weekdayAvg > 150) return '<b>周末是主要波动来源。</b>周末比工作日多 ' + (ins.weekendAvg - ins.weekdayAvg) + ' kcal。提前决定一到两顿，比事后补偿有效得多。';
    if (ins.delta != null && Math.abs(ins.delta) < 0.2 && Math.abs(ad.tdee - ad.budget) > 300) return '<b>趋势没有动。</b>如果连续 3 周体重不变，说明实际摄入或消耗与估算有偏差——先确认每天是否记全，再考虑调整目标速度。';
    if (ad.status !== 'prior' && ins.delta != null && ins.delta < 0) {
      const f = E.forecast(DB.weights, DB.profile.targetWeight, E.todayKey(), 28);
      return '<b>方向是对的。</b>你的趋势每周变化 ' + (f ? f.weekly : '—') + ' kg，比单日数字更值得相信。保持当前预算，不要因为一天波动改变策略。';
    }
    return '<b>继续记录。</b>账本正在把你的摄入与体重变成一条只属于你的曲线。数据越多，它越不像一个通用公式。';
  }

  function chartWeight(keys) {
    const start = keys[0], end = keys[keys.length - 1];
    const series = E.trendSeries(DB.weights, start, end).filter(s => s.date >= start && s.date <= end);
    const points = DB.weights.filter(w => w.date >= start && w.date <= end).sort((a, b) => a.date < b.date ? -1 : 1);
    if (!series.length && !points.length) return '<div class="chart-empty">这段期间没有体重记录</div>';
    const vals = series.map(s => s.tw).concat(points.map(p => p.kg));
    const target = DB.profile && DB.profile.targetWeight ? Number(DB.profile.targetWeight) : null;
    if (target) vals.push(target);
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 1.6) { const mid = (min + max) / 2; min = mid - .8; max = mid + .8; }
    const pad = (max - min) * .14;
    min -= pad; max += pad;
    const W = 620, H = 205, L = 40, R = 16, T = 14, B = 26;
    const n = Math.max(1, keys.length - 1);
    const xOf = key => L + (E.daysBetween(start, key) / n) * (W - L - R);
    const yOf = v => T + (max - v) / (max - min) * (H - T - B);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="体重趋势图">';
    for (let i = 0; i < 3; i++) {
      const v = min + (max - min) * (i / 2);
      const y = yOf(v);
      svg += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/>';
      svg += '<text x="' + (L - 7) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="9" fill="var(--ink-3)">' + round1(v) + '</text>';
    }
    if (target) {
      const ty = yOf(target);
      svg += '<line x1="' + L + '" y1="' + ty + '" x2="' + (W - R) + '" y2="' + ty + '" stroke="var(--amber)" stroke-width="1.2" stroke-dasharray="4 5" opacity=".8"/>';
      svg += '<text x="' + (W - R) + '" y="' + (ty - 5) + '" text-anchor="end" font-size="9" fill="var(--amber)">目标 ' + target + '</text>';
    }
    if (series.length > 1) {
      const d = series.map((s, i) => (i ? 'L' : 'M') + xOf(s.date).toFixed(1) + ' ' + yOf(s.tw).toFixed(1)).join(' ');
      svg += '<path d="' + d + '" fill="none" stroke="var(--green)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    points.forEach(p => {
      svg += '<circle cx="' + xOf(p.date).toFixed(1) + '" cy="' + yOf(p.kg).toFixed(1) + '" r="2.6" fill="var(--ink-2)" opacity=".38"/>';
    });
    const labels = [start, keys[Math.floor(n / 2)], end];
    labels.forEach((k, i) => {
      svg += '<text x="' + xOf(k) + '" y="' + (H - 7) + '" text-anchor="' + (i === 0 ? 'start' : i === 2 ? 'end' : 'middle') + '" font-size="9" fill="var(--ink-3)">' + E.shortLabel(k) + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  function chartIntake(keys, budget) {
    const vals = keys.map(k => E.summary(DB.entries, k).kcal);
    const maxV = Math.max(budget * 1.18, Math.max.apply(null, vals.concat([1])));
    const W = 620, H = 190, L = 40, R = 14, T = 14, B = 28;
    const today = E.todayKey();
    const n = keys.length;
    const slot = (W - L - R) / n;
    const bw = Math.min(22, Math.max(3, slot * .58));
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="每日摄入图">';
    for (let i = 0; i < 3; i++) {
      const v = maxV * (i / 2), y = T + (H - T - B) * (1 - i / 2);
      svg += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="var(--line)" stroke-width="1"/>';
      svg += '<text x="' + (L - 7) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="9" fill="var(--ink-3)">' + fmt(v) + '</text>';
    }
    const by = T + (H - T - B) * (1 - budget / maxV);
    svg += '<line x1="' + L + '" y1="' + by + '" x2="' + (W - R) + '" y2="' + by + '" stroke="var(--amber)" stroke-width="1.2" stroke-dasharray="4 5" opacity=".85"/>';
    vals.forEach((v, i) => {
      const x = L + slot * i + slot / 2;
      const h = Math.max(v > 0 ? 2 : 0, (H - T - B) * v / maxV);
      const color = v > budget * 1.03 ? 'var(--amber)' : (keys[i] === today ? 'var(--green)' : 'var(--green-line)');
      if (h > 0) svg += '<rect x="' + (x - bw / 2) + '" y="' + (H - B - h) + '" width="' + bw + '" height="' + h + '" rx="2" fill="' + color + '" opacity="' + (keys[i] === today ? 1 : .9) + '"/>';
    });
    const step = Math.ceil(n / 6);
    keys.forEach((k, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      svg += '<text x="' + (L + slot * i + slot / 2) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="9" fill="' + (k === today ? 'var(--green)' : 'var(--ink-3)') + '">' + E.shortLabel(k) + '</text>';
    });
    svg += '</svg>';
    return svg;
  }

  /* ============================================================
     设置
     ============================================================ */
  function renderSettings() {
    const view = $('#view-settings');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const st = snapshot(E.todayKey());
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, budget } = st;
    const ai = DB.settings.ai || {};
    const goalText = { lose: '减脂', maintain: '维持', gain: '增肌' }[DB.profile.goal] || '减脂';
    const rateText = DB.profile.goal === 'maintain' ? '不设缺口' : (DB.profile.goal === 'gain' ? '+' : '−') + DB.profile.rate + ' kg/周';
    const lw = E.latestWeight(DB.weights, DB.profile);
    const themePref = DB.settings.theme || 'auto';

    view.innerHTML =
      '<div class="page-head"><div><h1 class="page-title">设置</h1><div class="page-sub">你的账本，只对你负责</div></div></div>' +

      '<section class="card profile-brief">' +
        '<div class="avatar">' + (DB.profile.sex === 'male' ? '男' : '女') + '</div>' +
        '<div style="flex:1"><div class="name">我的账本</div><div class="meta">' + (DB.profile.sex === 'male' ? '男' : '女') + ' · ' + DB.profile.age + ' 岁 · ' + DB.profile.height + ' cm · ' + (lw ? lw.kg : DB.profile.weight) + ' kg</div>' +
        '<div class="meta">目标 ' + goalText + ' · 目标体重 ' + DB.profile.targetWeight + ' kg · ' + rateText + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="open-profile">编辑</button>' +
      '</section>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">今日基线</div><div class="s">公式给起点，你的数据给答案</div></div>' +
        settingRow('基础代谢 BMR', fmt(t.bmr) + ' kcal', '按 Mifflin-St Jeor 公式') +
        settingRow('公式先验消耗', fmt(t.priorTDEE) + ' kcal', '活动水平：' + t.activity) +
        settingRow('账本采用消耗', fmt(ad.tdee) + ' ± ' + fmt(ad.band) + ' kcal', '校准度 ' + ad.percent + '% · ' + (ad.status === 'prior' ? '尚未开始校准' : '已用 ' + ad.validDays + ' 天摄入 + ' + ad.weightDays + ' 次体重')) +
        settingRow('每日预算', fmt(budget) + ' kcal', '目标缺口 ' + fmt(t.deficit) + ' kcal · 安全下限 ' + fmt(t.floor)) +
        settingRow('蛋白质目标', t.protein + ' g', '按当前体重 × ' + t.proteinPerKg.toFixed(1) + ' g/kg') +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">代谢校准</div><div class="s">这是本应用与普通热量记录工具最大的不同</div></div>' +
        settingRow('公式先验', fmt(ad.prior) + ' kcal', '人群平均模型，误差可能 ±15%', 'open-engine', true) +
        settingRow('数据反推', ad.observed ? fmt(ad.observed) + ' kcal' : '数据不足', ad.observed ? '摄入均值 ' + fmt(ad.meanIntake) + ' · 回归斜率已计入' : '至少需要 8 天摄入与 5 次体重', 'open-engine', true) +
        settingRow('为什么预算会变', '查看方法', '不是 bug，是反馈回路', 'open-engine', true) +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">识别与记录</div><div class="s">AI 是加速器，不是必需品</div></div>' +
        (STATIC_MODE
          ? settingRow('AI 拍照 / 文字识别', '静态版不可用', '静态托管没有本机代理；手动记录与食物库不受影响')
          : settingRow('AI 拍照 / 文字识别', ai.key ? '已配置' : '未配置', ai.key ? ai.model : '配置后可用；不配置也能手动记录', 'open-ai', true)) +
        settingRow('食物库与组合', (DB.foods.length + ' 个自定义 · ' + DB.combos.length + ' 个组合'), '共 ' + (E.FOODS.length + DB.foods.length) + ' 种常用食物', 'open-library', true) +
        settingRow('运动记录', DB.exercises.length + ' 条', '按 METs × 体重 × 时长估算') +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">数据</div><div class="s">你的数据属于你。随时全量导出，或彻底删除</div></div>' +
        '<button class="setting-row" data-act="export-json"><span class="l"><span class="t">导出完整备份（JSON）</span><span class="s">包含记录、体重、运动、自定义食物与设置（不含 API Key）</span></span><span class="r">' + icon('download') + '</span></button>' +
        '<button class="setting-row" data-act="export-csv"><span class="l"><span class="t">导出明细（CSV）</span><span class="s">可用 Excel 打开或做自己的分析</span></span><span class="r">' + icon('download') + '</span></button>' +
        '<button class="setting-row" data-act="import-json"><span class="l"><span class="t">导入备份</span><span class="s">支持本应用备份，也兼容旧版「轻卡日记」的 JSON</span></span><span class="r">' + icon('upload') + '</span></button>' +
        '<button class="setting-row" data-act="load-demo"><span class="l"><span class="t">载入示例账本</span><span class="s">用 21 天假数据体验校准与复盘（会覆盖当前数据）</span></span><span class="r">' + icon('spark') + '</span></button>' +
        '<button class="setting-row danger" data-act="clear-data"><span class="l"><span class="t">清除本机全部数据</span><span class="s">不可恢复。建议先导出备份</span></span><span class="r">' + icon('trash') + '</span></button>' +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">外观</div></div>' +
        '<div class="setting-row"><span class="l"><span class="t">主题</span><span class="s">跟随系统，或固定浅色 / 深色</span></span>' +
          '<div class="r"><div class="seg" style="width:210px">' + [['auto', '跟随'], ['light', '浅色'], ['dark', '深色']].map(x =>
            '<button data-act="set-theme" data-v="' + x[0] + '" class="' + (themePref === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div></div>' +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">关于</div></div>' +
        '<div class="setting-row"><span class="l"><span class="t">能量账本 v2.1</span><span class="s">本地优先 · 无账号 · 无云端 · 无社交</span></span><span class="r tiny faint">ENERGY LEDGER</span></div>' +
        settingRow('运行模式', STATIC_MODE ? '静态网页' : '本机服务', STATIC_MODE ? '可部署到任意静态主机，无后端依赖' : '带本机 AI 转发与离线缓存') +
        '<div class="setting-row"><span class="l"><span class="t">数据与免责声明</span><span class="s">所有数值均为估算，不构成医疗或营养处方。孕期、哺乳期、慢性病人群请咨询专业人士。</span></span></div>' +
        '<div class="setting-row"><span class="l"><span class="t">存储状态</span><span class="s">' + (storageOK ? 'localStorage 正常 · 数据只在此浏览器' : '本地存储受限，请导出备份') + '</span><span class="r tiny ' + (storageOK ? 'faint' : 'red') + '">' + (storageOK ? '正常' : '异常') + '</span></div>' +
      '</div>' +

      '<div class="disclaimer">没有服务器保存你的记录。换设备不会自动同步，请用导出 / 导入迁移。</div>';
  }

  function settingRow(title, value, sub, act, clickable) {
    const inner = '<span class="l"><span class="t">' + title + '</span><span class="s">' + sub + '</span></span>' +
      '<span class="r">' + value + (act ? ' ' + icon('chevron-r') : '') + '</span>';
    if (act) return '<button type="button" class="setting-row" data-act="' + act + '">' + inner + '</button>';
    return '<div class="setting-row">' + inner + '</div>';
  }

  /* ============================================================
     浮层基础
     ============================================================ */
  function sheetHead(title, sub, right) {
    return '<div class="sheet-head"><div><div class="t">' + title + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>' +
      (right || '') + '<button class="sheet-close" data-act="close-sheet" aria-label="关闭">' + icon('close') + '</button></div>';
  }
  function openSheet(inner, type) {
    state.sheet = type;
    $('#sheetRoot').innerHTML = '<div class="sheet-wrap" id="sheetWrap"><div class="sheet" role="dialog" aria-modal="true">' + inner + '</div></div>';
    document.documentElement.style.overflow = 'hidden';
  }
  function closeSheet() {
    $('#sheetRoot').innerHTML = '';
    state.sheet = null;
    state.sheetData = null;
    document.documentElement.style.overflow = '';
  }
  let miniState = null;
  function miniOpen(inner, resolve, readValue) {
    let root = $('#miniRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'miniRoot';
      document.body.appendChild(root);
    }
    root.innerHTML = '<div class="sheet-wrap mini-wrap" id="miniWrap"><div class="mini-sheet">' + inner + '</div></div>';
    miniState = { resolve: resolve, readValue: readValue || null };
    const sheet = root.querySelector('.mini-sheet');
    if (sheet) {
      sheet.addEventListener('click', e => {
        const b = e.target.closest('[data-mini]');
        if (!b) return;
        if (b.dataset.mini === 'yes') {
          const v = miniState && miniState.readValue ? miniState.readValue() : true;
          miniClose(v);
        } else {
          miniClose(false);
        }
      });
    }
  }
  function miniClose(result) {
    const st = miniState;
    miniState = null;
    const root = $('#miniRoot');
    if (root) root.innerHTML = '';
    if (st && st.resolve) st.resolve(result);
  }
  function confirmSheet(title, body, okText, danger) {
    return new Promise(resolve => {
      miniOpen(
        '<div class="mini-t">' + title + '</div>' +
        '<div class="mini-b">' + body + '</div>' +
        '<div class="mini-a"><button class="btn btn-ghost" data-mini="no">取消</button>' +
        '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-mini="yes">' + okText + '</button></div>',
        resolve
      );
    });
  }
  function askName(title, placeholder, initial) {
    return new Promise(resolve => {
      miniOpen(
        '<div class="mini-t">' + title + '</div>' +
        '<div class="mini-b"><input class="input" id="miniName" maxlength="24" placeholder="' + esc(placeholder) + '" value="' + esc(initial || '') + '"></div>' +
        '<div class="mini-a"><button class="btn btn-ghost" data-mini="no">取消</button><button class="btn btn-primary" data-mini="yes">保存</button></div>',
        resolve,
        function () {
          const i = $('#miniName');
          return i && i.value.trim() ? i.value.trim() : null;
        }
      );
      setTimeout(() => {
        const i = $('#miniName');
        if (!i) return;
        i.focus();
        i.select();
        i.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') {
            const v = i.value.trim();
            miniClose(v || null);
          }
        });
      }, 60);
    });
  }

  /* ============================================================
     添加食物
     ============================================================ */
  function openFoodSheet(opts) {
    const o = opts || {};
    const date = o.date || (state.tab === 'ledger' ? state.recordDate : E.todayKey());
    const meal = o.meal || E.guessMeal();
    state.sheetData = { type: 'food', date: date, meal: meal, cart: [], query: '', cat: null };
    const rec = recents(8);
    const combos = DB.combos || [];
    const mealSeg = '<div class="seg meal-seg">' + E.MEALS.map(m =>
      '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (m[0] === meal ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>';
    const comboBox = combos.length ? '<div class="search-caption"><span class="k">我的组合</span><span class="tiny faint">点一下整组加入</span></div>' +
      '<div class="combo-strip">' + combos.map(c => '<button class="combo-card" data-act="apply-combo" data-id="' + c.id + '"><div class="n">' + esc(c.name) + '</div><div class="k">' + c.items.length + ' 项 · ' + fmt(c.items.reduce((s, i) => s + (i.kcal || 0), 0)) + ' kcal</div></button>').join('') + '</div>' : '';
    const recentBox = rec.length ? '<div class="search-caption"><span class="k">最近吃过</span><span class="tiny faint">按上次份量</span></div>' +
      '<div class="chip-row">' + rec.map(e => '<button class="chip" data-act="cart-recent" data-id="' + e.id + '">' + esc(e.name) + '<span class="n">' + fmt(e.kcal) + '</span></button>').join('') + '</div>' : '';

    openSheet(
      sheetHead('记一餐', E.relativeDay(date, E.todayKey()) + ' · 从 ' + (E.FOODS.length + DB.foods.length) + ' 种食物里选', '<button class="btn-quiet tiny" data-act="open-manual" style="margin-right:4px;color:var(--green)">手动热量</button>') +
      '<div class="sheet-body">' +
        mealSeg +
        '<div class="search-box">' + icon('search') + '<input class="input" id="foodSearch" placeholder="搜索食物，如 米饭 / 鸡胸 / 燕麦" autocomplete="off"></div>' +
        comboBox + recentBox +
        '<div id="pickBox" style="margin-top:8px"></div>' +
        '<div id="cartBox"></div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="save-combo">存为组合</button><button class="btn btn-primary" id="saveMealBtn" data-act="save-meal" disabled>记入账本</button></div>',
      'food'
    );
    updatePicks();
    updateCart();
  }

  function updatePicks() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'food') return;
    const box = $('#pickBox');
    if (!box) return;
    const cats = [null, '主食', '肉蛋', '水产', '蔬菜', '水果', '豆乳'].map(c => {
      const idx = c ? E.CATS.indexOf(c) : null;
      return '<button class="chip" data-act="food-cat" data-v="' + (idx == null ? '' : idx) + '" style="' + ((sd.cat === idx || (c == null && sd.cat == null)) ? 'border-color:var(--green);background:var(--green-soft);color:var(--green)' : '') + '">' + (c || '全部') + '</button>';
    }).join('');
    const results = (sd.query ? E.searchFoods(sd.query, allFoods()) : allFoods())
      .filter(f => sd.cat == null || f.cat === sd.cat).slice(0, 60);
    box.innerHTML = '<div class="chip-row" style="margin-bottom:2px">' + cats + '</div>' +
      (results.length ? '<div class="pick-list">' + results.map(f =>
        '<button type="button" class="pick-row" data-act="pick-food" data-id="' + f.id + '"><span class="n">' + esc(f.name) + '</span>' +
        (f.custom ? '<span class="c">自定义</span>' : '') +
        '<span class="k">' + fmt(f.kcal) + ' <span class="tiny faint">/100g</span></span>' +
        '<span class="add-i">' + icon('plus') + '</span></button>'
      ).join('') + '</div>' : '<div class="cart-empty">没有找到。可以换个关键词，或点右上角「手动热量」。</div>') +
      '<div class="tiny faint" style="margin-top:8px">营养值为每 100g 参考值；份量可以随时改。</div>';
  }

  function updateCart() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'food') return;
    const box = $('#cartBox');
    const btn = $('#saveMealBtn');
    if (!box) return;
    if (!sd.cart.length) {
      box.innerHTML = '<div class="cart-empty">还没有选食物。点上方列表加入，份量会按一份自动填好。</div>';
      if (btn) { btn.disabled = true; btn.textContent = '记入账本'; }
      return;
    }
    const totals = sd.cart.reduce((s, it) => {
      const g = it.grams;
      s.kcal += it.food.kcal * g / 100;
      s.p += it.food.p * g / 100;
      return s;
    }, { kcal: 0, p: 0 });
    box.innerHTML = '<div class="cart">' +
      '<div class="cart-head"><span class="t">这一餐</span><span class="s">' + sd.cart.length + ' 项 · 蛋白 ' + round1(totals.p) + 'g</span></div>' +
      sd.cart.map((it, i) =>
        '<div class="cart-row"><div class="n">' + esc(it.food.name) + '<small>' + Math.round(it.food.kcal) + ' kcal/100g · 蛋白 ' + round1(it.food.p) + 'g</small></div>' +
        '<input class="input input-num g" type="number" min="1" step="5" value="' + it.grams + '" data-cart-grams="' + i + '" aria-label="克数">' +
        '<div class="k" id="cartKcal' + i + '">' + Math.round(it.food.kcal * it.grams / 100) + '</div>' +
        '<button class="x" data-act="cart-remove" data-i="' + i + '" aria-label="移除">' + icon('close') + '</button></div>'
      ).join('') +
      '<div class="cart-total"><span class="k">合计 · 约</span><span class="v" id="cartTotal">' + Math.round(totals.kcal) + ' <small>kcal</small></span></div>' +
      '</div>';
    if (btn) { btn.disabled = false; btn.textContent = '记入 · ' + Math.round(totals.kcal) + ' kcal'; }
  }

  function addToCart(food, grams) {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'food') return;
    const g = grams || food.unitG || 100;
    sd.cart.push({ food: food, grams: g });
    updateCart();
  }

  function foodFromEntry(e) {
    if (e.per100) {
      return Object.assign({}, e.per100, { id: 'r' + e.id, name: e.name, cat: 0, catName: '复用', unitG: 0, unit: '', custom: true });
    }
    return { id: 'r' + e.id, name: e.name, kcal: e.kcal, p: e.p || 0, c: e.c || 0, f: e.f || 0, fib: e.fib || 0, cat: 0, catName: '复用', unitG: 0, unit: '', custom: true };
  }

  function saveMeal() {
    const sd = state.sheetData;
    if (!sd || !sd.cart.length) return;
    let total = 0;
    sd.cart.forEach(it => {
      const cal = it.food.kcal * it.grams / 100;
      total += cal;
      const e = makeEntry(it.food, it.grams, sd.meal, sd.date, 'lib', 'med');
      DB.entries.push(e);
    });
    saveDB();
    const label = E.mealLabel(sd.meal) + ' · ' + Math.round(total) + ' kcal';
    closeSheet();
    renderActive();
    toast('已记入' + label);
  }

  function openManualSheet() {
    const sd = state.sheetData;
    const date = (sd && sd.date) || E.todayKey();
    const meal = (sd && sd.meal) || E.guessMeal();
    state.sheetData = { type: 'manual', date: date, meal: meal };
    openSheet(
      sheetHead('手动记一笔', '只填热量也可以；填了份量，就能按克数重新计算') +
      '<div class="sheet-body">' +
        '<div class="field"><label>食物或餐名</label><input class="input" id="mName" placeholder="如：公司楼下的牛肉面" maxlength="30"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>热量 kcal</label><input class="input input-num" id="mKcal" type="number" min="0" placeholder="520"></div>' +
          '<div class="field"><label>份量 g（可选）</label><input class="input input-num" id="mGrams" type="number" min="0" placeholder="400"></div>' +
        '</div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>蛋白质 g（可选）</label><input class="input input-num" id="mP" type="number" min="0" placeholder="25"></div>' +
          '<div class="field"><label>膳食纤维 g（可选）</label><input class="input input-num" id="mFib" type="number" min="0" placeholder="3"></div>' +
        '</div>' +
        '<div class="field"><label>餐次</label><div class="seg">' + E.MEALS.map(m => '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (m[0] === meal ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div></div>' +
        '<div class="notebox">手动填入的热量按「较准」处理；如果只是目测，之后可以在这笔记录里改成「估算」。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" data-act="save-manual">记入账本</button></div>',
      'manual'
    );
    setTimeout(() => { const el = $('#mName'); if (el) el.focus(); }, 80);
  }

  function saveManual() {
    const sd = state.sheetData;
    if (!sd) return;
    const name = ($('#mName') && $('#mName').value.trim()) || '';
    const kcal = Number($('#mKcal') && $('#mKcal').value);
    const grams = Number($('#mGrams') && $('#mGrams').value) || 0;
    const p = Number($('#mP') && $('#mP').value) || 0;
    const fib = Number($('#mFib') && $('#mFib').value) || 0;
    if (!name) { toast('先写个名字'); return; }
    if (!kcal || kcal <= 0) { toast('热量要大于 0'); return; }
    const per100 = grams > 0 ? { kcal: kcal / grams * 100, p: p / grams * 100, c: 0, f: 0, fib: fib / grams * 100 } : null;
    DB.entries.push({
      id: uid(), date: sd.date, meal: sd.meal, name: name,
      grams: grams || 100, per100: per100, kcal: Math.round(kcal), p: p, c: 0, f: 0, fib: fib,
      conf: 'high', source: 'manual', createdAt: Date.now()
    });
    saveDB();
    closeSheet();
    renderActive();
    toast('已记入 ' + E.mealLabel(sd.meal));
  }

  /* ============================================================
     编辑一笔
     ============================================================ */
  function openEntrySheet(id) {
    const e = DB.entries.find(x => x.id === id);
    if (!e) return;
    const hasPer100 = !!e.per100;
    const grams = e.grams || 100;
    state.sheetData = { type: 'entry', id: id, meal: e.meal, conf: E.confOf(e) };
    const srcLabel = { lib: '食物库', manual: '手动', ai: 'AI 识别', combo: '组合', legacy: '旧版导入', custom: '自定义' }[e.source] || '记录';
    openSheet(
      sheetHead('这一笔', E.relativeDay(e.date, E.todayKey()) + ' · 从' + srcLabel + '添加') +
      '<div class="sheet-body">' +
        '<div class="field"><label>食物</label><input class="input" id="eName" value="' + esc(e.name) + '" maxlength="30"></div>' +
        (hasPer100 ?
          '<div class="form-grid"><div class="field"><label>份量 g</label><input class="input input-num" id="eGrams" type="number" min="1" value="' + grams + '"></div>' +
          '<div class="field"><label>热量（自动）</label><div class="input input-num" style="display:flex;align-items:center;justify-content:center" id="eKcalView">' + fmt(e.kcal) + ' kcal</div></div></div>' +
          '<div class="portion-chips">' + [50, 100, 150, 200, 250].map(g => '<button data-act="entry-grams" data-v="' + g + '">' + g + 'g</button>').join('') + '</div>' +
          '<div class="notebox">每 100g：' + Math.round(e.per100.kcal) + ' kcal · 蛋白 ' + round1(e.per100.p) + 'g · 碳水 ' + round1(e.per100.c) + 'g · 脂肪 ' + round1(e.per100.f) + 'g</div>'
          :
          '<div class="form-grid"><div class="field"><label>热量 kcal</label><input class="input input-num" id="eKcal" type="number" min="0" value="' + Math.round(e.kcal) + '"></div>' +
          '<div class="field"><label>蛋白质 g</label><input class="input input-num" id="eP" type="number" min="0" value="' + (e.p || 0) + '"></div></div>'
        ) +
        '<div class="field" style="margin-top:14px"><label>餐次</label><div class="seg">' + E.MEALS.map(m => '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (e.meal === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>这份数据有多准</label><div class="seg">' + [['high', '称过 / 包装'], ['med', '参考值'], ['low', '目测 / AI']].map(c =>
          '<button data-act="set-conf" data-v="' + c[0] + '" class="' + (E.confOf(e) === c[0] ? 'on' : '') + '">' + c[1] + '</button>').join('') + '</div></div>' +
        '<div class="notebox">可信度只影响“摄入区间”的宽度，不会改变热量本身。诚实地标出「目测」，比假装精确更有用。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-danger" data-act="delete-entry" data-id="' + id + '">删除</button><button class="btn btn-primary" style="flex:1" data-act="save-entry">保存修改</button></div>',
      'entry'
    );
  }

  /* ============================================================
     运动
     ============================================================ */
  function openExerciseSheet() {
    const date = state.tab === 'ledger' ? state.recordDate : E.todayKey();
    state.sheetData = { type: 'exercise', date: date, selected: null, minutes: 30, query: '' };
    openSheet(
      sheetHead('记录运动', '运动消耗计入长期校准，不额外增加今日预算') +
      '<div class="sheet-body">' +
        '<div class="search-box">' + icon('search') + '<input class="input" id="exSearch" placeholder="搜索运动，如 快走 / 力量 / 游泳" autocomplete="off"></div>' +
        '<div id="exList" style="margin-top:10px"></div>' +
        '<div id="exCalc"></div>' +
        '<div class="search-caption" style="margin-top:18px"><span class="k">' + E.relativeDay(date, E.todayKey()) + '已记录</span></div>' +
        '<div id="exToday"></div>' +
        '<div class="notebox">METs 是运动强度系数。估算公式：METs × 体重(kg) × 时长(小时) × 1.05。手环数据通常也只在这个精度附近。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" style="flex:1" id="exSaveBtn" data-act="save-exercise" disabled>选择一项运动</button></div>',
      'exercise'
    );
    renderExList();
    renderExCalc();
    renderExToday();
  }

  function renderExList() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise') return;
    const q = E.norm(sd.query);
    const list = E.EXERCISES.filter(x => !q || E.norm(x.name).indexOf(q) > -1);
    const box = $('#exList');
    if (!box) return;
    box.innerHTML = list.length ? '<div class="pick-list" style="max-height:240px">' + list.map(x =>
      '<button type="button" class="ex-row" data-act="ex-select" data-id="' + x.id + '"><span class="n">' + esc(x.name) + '</span><span class="m">METs ' + x.mets + '</span><span class="k">30 分钟约 ' + E.burn(x.mets, currentWeight(), 30) + ' kcal</span></button>'
    ).join('') + '</div>' : '<div class="cart-empty">没有找到这项运动</div>';
  }

  function renderExCalc() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise') return;
    const box = $('#exCalc');
    if (!box) return;
    const ex = E.EXERCISES.find(x => x.id === sd.selected);
    if (!ex) {
      box.innerHTML = '<div class="ex-calc" style="margin-top:14px"><div class="note">先选一项运动，再调整时长。</div></div>';
      const b = $('#exSaveBtn');
      if (b) { b.disabled = true; b.textContent = '选择一项运动'; }
      return;
    }
    const kcal = E.burn(ex.mets, currentWeight(), sd.minutes);
    box.innerHTML = '<div class="ex-calc"><div class="row-between"><span class="strong">' + esc(ex.name) + '</span><span class="tiny faint">METs ' + ex.mets + ' · 体重 ' + currentWeight() + ' kg</span></div>' +
      '<div class="form-grid" style="margin-top:10px;align-items:end">' +
        '<div class="field" style="margin:0"><label>时长（分钟）</label><input class="input input-num" id="exMinutes" type="number" min="1" max="600" value="' + sd.minutes + '"></div>' +
        '<div style="text-align:right;padding-bottom:2px"><div class="v" id="exKcalVal">' + kcal + '<small> kcal</small></div><div class="tiny faint">估算消耗</div></div>' +
      '</div></div>';
    const b = $('#exSaveBtn');
    if (b) { b.disabled = false; b.textContent = '记入 · ' + kcal + ' kcal'; }
  }

  function renderExToday() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise') return;
    const box = $('#exToday');
    if (!box) return;
    const list = DB.exercises.filter(x => x.date === sd.date);
    box.innerHTML = list.length ? list.map(x =>
      '<div class="ex-item"><span>' + esc(x.name) + '</span><span class="tiny faint">' + x.minutes + ' 分钟</span><span class="k">' + fmt(x.kcal) + ' kcal</span><button class="x" data-act="del-exercise" data-id="' + x.id + '" aria-label="删除">' + icon('close') + '</button></div>'
    ).join('') : '<div class="cart-empty">这一天还没有运动记录。</div>';
  }

  function saveExercise() {
    const sd = state.sheetData;
    if (!sd || !sd.selected) return;
    const ex = E.EXERCISES.find(x => x.id === sd.selected);
    if (!ex) return;
    const minutes = clamp(Number(sd.minutes) || 30, 1, 600);
    DB.exercises.push({
      id: uid(), date: sd.date, name: ex.name, mets: ex.mets, minutes: minutes,
      kcal: E.burn(ex.mets, currentWeight(), minutes), createdAt: Date.now()
    });
    saveDB();
    closeSheet();
    renderActive();
    toast('已记录 ' + ex.name + ' ' + minutes + ' 分钟');
  }

  /* ============================================================
     体重
     ============================================================ */
  function openWeightSheet() {
    const date = state.tab === 'ledger' ? state.recordDate : E.todayKey();
    const existing = DB.weights.find(w => w.date === date);
    const latest = E.latestWeight(DB.weights, DB.profile);
    const kg = existing ? existing.kg : (latest ? latest.kg : (DB.profile.weight || 65));
    state.sheetData = { type: 'weight', date: date, kg: kg };
    const fore = E.forecast(DB.weights, DB.profile.targetWeight, E.todayKey(), 28);
    const series = E.trendSeries(DB.weights, E.addDays(E.todayKey(), -13), E.todayKey());
    const weekAgo = series.length ? series[0].tw : null;
    const trend = latest ? E.trendSeries(DB.weights, E.addDays(E.todayKey(), -27), E.todayKey()) : [];
    const trendNow = trend.length ? trend[trend.length - 1].tw : null;
    openSheet(
      sheetHead('记录体重', '同一时间、空腹、排空后称重，趋势最可信') +
      '<div class="sheet-body">' +
        '<div class="weight-big"><input id="wInput" type="number" step="0.1" min="25" max="300" value="' + kg + '" aria-label="体重 kg"><small>kg</small></div>' +
        '<div class="weight-stepper"><button data-act="w-step" data-v="-0.1">−</button><span class="tiny faint">每次 0.1 kg</span><button data-act="w-step" data-v="0.1">＋</button></div>' +
        '<div class="weight-trend">' +
          '<div class="i"><div class="k">趋势值</div><div class="v">' + (trendNow != null ? trendNow : '—') + ' <small>kg</small></div></div>' +
          '<div class="i"><div class="k">近 7 天变化</div><div class="v ' + (weekAgo != null && trendNow != null && trendNow - weekAgo < 0 ? 'green' : '') + '">' + (weekAgo != null && trendNow != null ? (trendNow - weekAgo > 0 ? '+' : '') + round1(trendNow - weekAgo) : '—') + ' <small>kg</small></div></div>' +
          '<div class="i"><div class="k">当前节奏</div><div class="v">' + (fore ? (fore.weekly > 0 ? '+' : '') + fore.weekly : '—') + ' <small>kg/周</small></div></div>' +
        '</div>' +
        '<div class="notebox">体重一天内会因水分、盐分、碳水摄入波动 0.5–1.5 kg。账本用 EMA 趋势与回归斜率，而不是单日数字。' + (date !== E.todayKey() ? ' 你正在补记 ' + E.dateLabel(date) + ' 的体重。' : '') + '</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-weight">保存体重</button></div>',
      'weight'
    );
    setTimeout(() => { const i = $('#wInput'); if (i) i.select(); }, 80);
  }

  function saveWeight() {
    const sd = state.sheetData;
    if (!sd) return;
    const kg = Number($('#wInput') && $('#wInput').value);
    if (!isFinite(kg) || kg < 25 || kg > 300) { toast('请输入 25–300 之间的体重'); return; }
    const rounded = Math.round(kg * 10) / 10;
    const idx = DB.weights.findIndex(w => w.date === sd.date);
    if (idx > -1) DB.weights[idx].kg = rounded;
    else DB.weights.push({ date: sd.date, kg: rounded });
    const lw = E.latestWeight(DB.weights, DB.profile);
    DB.profile.weight = lw ? lw.kg : rounded;
    saveDB();
    closeSheet();
    renderActive();
    toast('已记录 ' + rounded + ' kg · 趋势会吸收这次波动');
  }

  /* ============================================================
     AI 识别
     ============================================================ */
  function readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        let w = img.width, h = img.height;
        if (Math.max(w, h) > max) {
          const scale = max / Math.max(w, h);
          w = Math.round(w * scale); h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
      img.src = url;
    });
  }

  function extractJSON(text) {
    if (!text) return null;
    let t = String(text).trim().replace(/```json/gi, '').replace(/```/g, '').trim();
    const s = t.indexOf('{'), e = t.lastIndexOf('}');
    if (s < 0 || e <= s) return null;
    try { return JSON.parse(t.slice(s, e + 1)); } catch (err) { return null; }
  }

  function openAISheet() {
    const date = state.tab === 'ledger' ? state.recordDate : E.todayKey();
    const cfg = DB.settings.ai || {};
    const fileMode = location.protocol !== 'file:';
    state.sheetData = { type: 'ai', date: date, meal: E.guessMeal(), image: null, text: '', items: [] };
    openSheet(
      sheetHead('AI 识别', '拍照或描述一餐，AI 给出候选食物与克数') +
      '<div class="sheet-body">' +
        '<div class="field"><label>餐次</label><div class="seg">' + E.MEALS.map(m => '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (m[0] === state.sheetData.meal ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div></div>' +
        '<div class="notebox" style="margin-bottom:14px">' + (fileMode ? '识别在本机代理转发，API Key 只保存在这台设备。' : '你正在双击打开网页，浏览器会拦截跨域请求。请用「启动账本.bat」打开后再用 AI 识别。') + '</div>' +
        '<div class="search-caption"><span class="k">识别设置</span><span class="tiny faint">OpenAI 兼容接口</span></div>' +
        '<div class="field"><label>API Key</label><input class="input" id="aiKey" type="password" value="' + esc(cfg.key || '') + '" placeholder="如 8f3a…（留空则不用 AI）"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>接口地址</label><input class="input" id="aiBase" value="' + esc(cfg.baseURL || 'https://open.bigmodel.cn/api/paas/v4') + '"></div>' +
          '<div class="field"><label>模型</label><input class="input" id="aiModel" value="' + esc(cfg.model || 'glm-4v-flash') + '"></div>' +
        '</div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>照片</label><label class="file-btn" for="aiFile">' + icon('camera') + '选择并压缩</label><input id="aiFile" type="file" accept="image/*" capture="environment" style="display:none"></div>' +
          '<div class="field"><label>或文字描述</label><textarea class="input" id="aiText" rows="3" placeholder="例：一碗牛肉面，两个煎蛋，一杯豆浆"></textarea></div>' +
        '</div>' +
        '<div id="aiPreview"></div>' +
        '<div class="row" style="margin:12px 0"><button class="btn btn-primary btn-sm" data-act="ai-run" id="aiRunBtn" style="flex:1">开始识别</button><button class="btn btn-ghost btn-sm" data-act="ai-save-config">保存设置</button></div>' +
        '<div id="aiResults"></div>' +
        '<div class="notebox">AI 识别属于「目测级」估算，误差通常在 20–40%。识别后请核对克数；账本会把这类记录标为「粗」，并计入更宽的区间。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" style="flex:1" id="aiSaveBtn" data-act="save-ai-results" disabled>记入识别结果</button></div>',
      'ai'
    );
  }

  function saveAIConfig() {
    const cfg = {
      key: ($('#aiKey') && $('#aiKey').value.trim()) || '',
      baseURL: ($('#aiBase') && $('#aiBase').value.trim()) || 'https://open.bigmodel.cn/api/paas/v4',
      model: ($('#aiModel') && $('#aiModel').value.trim()) || 'glm-4v-flash'
    };
    DB.settings.ai = cfg;
    saveDB();
    toast('识别设置已保存在本机');
  }

  async function runAI() {
    if (location.protocol === 'file:') {
      toast('请用「启动账本.bat」打开后再使用 AI 识别');
      return;
    }
    const sd = state.sheetData;
    if (!sd) return;
    const key = ($('#aiKey') && $('#aiKey').value.trim()) || '';
    const baseURL = ($('#aiBase') && $('#aiBase').value.trim()) || 'https://open.bigmodel.cn/api/paas/v4';
    const model = ($('#aiModel') && $('#aiModel').value.trim()) || 'glm-4v-flash';
    const text = ($('#aiText') && $('#aiText').value.trim()) || '';
    if (!key) { toast('先填写 API Key'); return; }
    if (!sd.image && !text) { toast('先拍照，或写一句描述'); return; }
    DB.settings.ai = { key: key, baseURL: baseURL, model: model };
    saveDB(true);

    const prompt = '你是营养估算助手。分析图片中的食物（若没有图片则分析用户的文字描述），只输出 JSON，不要任何解释。\n' +
      '格式：{"foods":[{"name":"食物中文名","grams":估算克数,"kcalPer100g":每百克热量,"proteinPer100g":蛋白质,"carbsPer100g":碳水,"fatPer100g":脂肪,"fiberPer100g":纤维,"confidence":0到1}],"note":"一句提示"}\n' +
      '规则：1) 用常见中餐名称；2) 克数按常见餐具大小估算，不确定时取中间值并把 confidence 降到 0.4 以下；3) 不要编造精确到个位的热量；4) 只输出 JSON。' +
      (text ? '\n用户描述：' + text : '');
    const btn = $('#aiRunBtn');
    if (btn) { btn.disabled = true; btn.textContent = '识别中…'; }
    const box = $('#aiResults');
    if (box) box.innerHTML = '<div class="cart-empty">正在请求视觉模型，通常需要 10–30 秒…</div>';
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseURL: baseURL, apiKey: key, model: model, prompt: prompt, image: sd.image, text: text })
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (raw.error && (raw.error.message || raw.error)) || raw.message || ('HTTP ' + res.status);
        throw new Error(msg);
      }
      const content = raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content;
      const parsed = extractJSON(content);
      if (!parsed || !Array.isArray(parsed.foods) || !parsed.foods.length) {
        throw new Error('模型没有返回可解析的食物，换张更清晰的照片或写得更具体些');
      }
      const items = parsed.foods.filter(f => f && f.name).slice(0, 8).map(f => {
        const grams = clamp(round5(Number(f.grams) || 100), 5, 2000);
        const lib = E.foodByName(String(f.name), allFoods());
        const per100 = lib ? { kcal: lib.kcal, p: lib.p, c: lib.c, f: lib.f, fib: lib.fib } : {
          kcal: Math.max(0, Number(f.kcalPer100g) || 0),
          p: Math.max(0, Number(f.proteinPer100g) || 0),
          c: Math.max(0, Number(f.carbsPer100g) || 0),
          f: Math.max(0, Number(f.fatPer100g) || 0),
          fib: Math.max(0, Number(f.fiberPer100g) || 0)
        };
        return {
          name: lib ? lib.name : String(f.name).slice(0, 30),
          grams: grams, per100: per100,
          conf: Number(f.confidence) >= 0.85 ? 'med' : 'low',
          match: lib ? '食物库校准' : 'AI 估算'
        };
      });
      sd.items = items;
      renderAIResults(parsed.note);
    } catch (err) {
      if (box) box.innerHTML = '<div class="cart-empty" style="color:var(--red)">' + esc(err.message || '识别失败') + '</div>';
      toast('识别失败：' + (err.message || '网络异常'));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '再次识别'; }
    }
  }

  function renderAIResults(note) {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'ai') return;
    const box = $('#aiResults');
    const saveBtn = $('#aiSaveBtn');
    if (!box) return;
    if (!sd.items.length) { box.innerHTML = ''; if (saveBtn) saveBtn.disabled = true; return; }
    const totals = sd.items.reduce((s, it) => {
      s.kcal += it.per100.kcal * it.grams / 100;
      s.p += it.per100.p * it.grams / 100;
      return s;
    }, { kcal: 0, p: 0 });
    box.innerHTML = '<div class="search-caption"><span class="k">识别结果</span><span class="tiny faint">克数可改</span></div>' +
      (note ? '<div class="notebox" style="margin-bottom:8px">' + esc(note) + '</div>' : '') +
      '<div class="cart">' + sd.items.map((it, i) =>
        '<div class="cart-row"><div class="n">' + esc(it.name) + '<small>' + it.match + ' · 蛋白 ' + round1(it.per100.p) + 'g/100g</small></div>' +
        '<input class="input input-num g" type="number" min="1" step="5" value="' + it.grams + '" data-ai-grams="' + i + '">' +
        '<div class="k" id="aiKcal' + i + '">' + Math.round(it.per100.kcal * it.grams / 100) + '</div>' +
        '<button class="x" data-act="ai-remove" data-i="' + i + '">' + icon('close') + '</button></div>'
      ).join('') +
      '<div class="cart-total"><span class="k">合计 · 蛋白 ' + round1(totals.p) + 'g</span><span class="v" id="aiTotal">' + Math.round(totals.kcal) + ' <small>kcal</small></span></div></div>';
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '记入 · ' + Math.round(totals.kcal) + ' kcal'; }
  }

  function saveAIResults() {
    const sd = state.sheetData;
    if (!sd || !sd.items.length) return;
    let total = 0;
    sd.items.forEach(it => {
      const food = {
        name: it.name, kcal: it.per100.kcal, p: it.per100.p, c: it.per100.c,
        f: it.per100.f, fib: it.per100.fib, cat: 1, catName: 'AI', unitG: 0
      };
      const e = makeEntry(food, it.grams, sd.meal, sd.date, 'ai', it.conf);
      DB.entries.push(e);
      total += e.kcal;
    });
    saveDB();
    closeSheet();
    renderActive();
    toast('已记入 ' + E.mealLabel(sd.meal) + ' · ' + total + ' kcal');
  }

  /* ============================================================
     身体档案
     ============================================================ */
  function openProfileSheet() {
    const p = DB.profile || { sex: 'female', age: '', height: '', weight: E.latestWeight(DB.weights, null) ? E.latestWeight(DB.weights, null).kg : '', targetWeight: '', activity: 'light', goal: 'lose', rate: 0.25 };
    const weight = E.latestWeight(DB.weights, p);
    state.sheetData = { type: 'profile', sex: p.sex === 'male' ? 'male' : 'female', goal: p.goal || 'lose', rate: p.rate || 0.25, activity: p.activity || 'light' };
    openSheet(
      sheetHead('身体档案', '用于计算起点；之后会用你的数据校准') +
      '<div class="sheet-body">' +
        '<div class="field"><label>性别</label><div class="seg" id="pSexSeg">' + [['female', '女'], ['male', '男']].map(x => '<button data-act="p-sex" data-v="' + x[0] + '" class="' + (state.sheetData.sex === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>年龄</label><input class="input input-num" id="pAge" type="number" min="12" max="90" value="' + (p.age || '') + '" placeholder="29"></div>' +
          '<div class="field"><label>身高 cm</label><input class="input input-num" id="pHeight" type="number" min="120" max="220" value="' + (p.height || '') + '" placeholder="165"></div>' +
          '<div class="field"><label>当前体重 kg</label><input class="input input-num" id="pWeight" type="number" step="0.1" min="25" max="300" value="' + (weight ? weight.kg : (p.weight || '')) + '" placeholder="63.5"></div>' +
        '</div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>目标体重 kg</label><input class="input input-num" id="pTarget" type="number" step="0.1" min="25" max="300" value="' + (p.targetWeight || '') + '" placeholder="58"></div>' +
          '<div class="field"><label>日常活动</label><select class="select" id="pActivity">' + DATA.activities.map(a => '<option value="' + a[0] + '"' + (state.sheetData.activity === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></div>' +
        '</div>' +
        '<div class="field"><label>目标</label><div class="seg" id="pGoalSeg">' + [['lose', '减脂'], ['maintain', '维持'], ['gain', '增肌']].map(x => '<button data-act="p-goal" data-v="' + x[0] + '" class="' + (state.sheetData.goal === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
        '<div id="rateBox">' + renderRateSeg(state.sheetData.goal, state.sheetData.rate) + '</div>' +
        '<div class="preview-box" id="pPreview"></div>' +
        '<div class="notebox">减脂速度按每周 kg 计算。账本会把缺口限制在消耗的 22% 以内，并设置安全下限——低于 BMR 的预算不会出现。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-profile">保存档案</button></div>',
      'profile'
    );
    updateProfilePreview();
  }

  function renderRateSeg(goal, rate) {
    if (goal === 'maintain') return '<div class="notebox">维持目标：预算 = 校准后的日常消耗，不设刻意缺口。</div>';
    return '<div class="field"><label>速度（kg / 周）</label><div class="seg">' + [0.25, 0.5, 0.75].map(r =>
      '<button data-act="p-rate" data-v="' + r + '" class="' + (Math.abs(rate - r) < .01 ? 'on' : '') + '">' + r + ' kg</button>').join('') + '</div>' +
      '<div class="tiny faint" style="margin-top:6px">0.25 温和 · 0.5 标准 · 0.75 进取</div></div>';
  }

  function readProfileForm() {
    const sd = state.sheetData;
    const age = Number($('#pAge') && $('#pAge').value);
    const height = Number($('#pHeight') && $('#pHeight').value);
    const weight = Number($('#pWeight') && $('#pWeight').value);
    const targetWeight = Number($('#pTarget') && $('#pTarget').value);
    const activity = ($('#pActivity') && $('#pActivity').value) || sd.activity;
    return { sex: sd.sex, age: age, height: height, weight: weight, targetWeight: targetWeight, activity: activity, goal: sd.goal, rate: sd.rate };
  }

  function updateProfilePreview() {
    const box = $('#pPreview');
    if (!box) return;
    const p = readProfileForm();
    if (!p.age || !p.height || !p.weight || p.age < 12 || p.height < 120 || p.weight < 25) { box.style.display = 'none'; return; }
    const t = E.targets(p, p.weight);
    if (!t) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = '<div class="eyebrow">起点预览</div>' +
      '<div class="result-grid" style="margin-top:10px">' +
        '<div class="result-item"><div class="k">基础代谢</div><div class="v">' + fmt(t.bmr) + ' <small>kcal</small></div></div>' +
        '<div class="result-item"><div class="k">公式消耗</div><div class="v">' + fmt(t.priorTDEE) + ' <small>kcal</small></div></div>' +
        '<div class="result-item"><div class="k">起始预算</div><div class="v">' + fmt(t.budgetPrior) + ' <small>kcal</small></div></div>' +
        '<div class="result-item"><div class="k">蛋白质目标</div><div class="v">' + t.protein + ' <small>g</small></div></div>' +
      '</div>' +
      '<div class="result-note">这只是第 1 天的起点。记录 8 天摄入与 5 次体重后，账本会开始用你自己的数据替代公式。' + (t.capped ? ' 你选择的速度已被限制在安全范围内。' : '') + '</div>';
  }

  function saveProfile() {
    const p = readProfileForm();
    if (!p.age || p.age < 12 || p.age > 90) { toast('年龄请填 12–90'); return; }
    if (!p.height || p.height < 120 || p.height > 220) { toast('身高请填 120–220 cm'); return; }
    if (!p.weight || p.weight < 25 || p.weight > 300) { toast('体重请填 25–300 kg'); return; }
    if (!p.targetWeight || p.targetWeight < 25 || p.targetWeight > 300) { toast('请填写目标体重'); return; }
    const old = DB.profile || {};
    DB.profile = {
      sex: p.sex, age: p.age, height: p.height, weight: p.weight,
      targetWeight: p.targetWeight, activity: p.activity, goal: p.goal, rate: p.rate,
      proteinFactor: old.proteinFactor || (p.goal === 'lose' ? 1.6 : p.goal === 'gain' ? 1.8 : 1.4),
      createdAt: old.createdAt || Date.now()
    };
    const latest = E.latestWeight(DB.weights, null);
    if (!latest || Math.abs(latest.kg - p.weight) > 0.05) {
      const idx = DB.weights.findIndex(w => w.date === E.todayKey());
      if (idx > -1) DB.weights[idx].kg = p.weight;
      else DB.weights.push({ date: E.todayKey(), kg: p.weight });
    }
    DB.onboarded = true;
    saveDB();
    closeSheet();
    renderActive();
    toast('档案已更新 · 预算会随数据继续校准');
  }

  /* ============================================================
     引擎说明
     ============================================================ */
  function openEngineSheet() {
    const st = snapshot(E.todayKey());
    if (!st) return;
    const { t, ad } = st;
    const max = Math.max(ad.prior, ad.observed || 0, ad.tdee) * 1.05;
    const priorW = ad.prior / max * 100;
    const obsW = ad.observed ? ad.observed / max * 100 : 0;
    const finalW = ad.tdee / max * 100;
    openSheet(
      sheetHead('代谢校准是怎么算的', '这不是玄学，是一个带先验的反馈回路') +
      '<div class="sheet-body">' +
        '<div class="engine-bars">' +
          '<div class="engine-bar"><div class="top"><span>公式先验（人群平均）</span><b>' + fmt(ad.prior) + ' kcal</b></div><div class="engine-track"><span class="prior" style="left:0;width:' + priorW + '%"></span></div></div>' +
          '<div class="engine-bar"><div class="top"><span>你的数据反推（摄入 + 体重）</span><b>' + (ad.observed ? fmt(ad.observed) + ' kcal' : '数据不足') + '</b></div><div class="engine-track"><span class="obs" style="left:0;width:' + (obsW || 0.5) + '%"></span></div></div>' +
          '<div class="engine-bar"><div class="top"><span>账本采用（按证据量加权）</span><b>' + fmt(ad.tdee) + ' ± ' + fmt(ad.band) + '</b></div><div class="engine-track"><span class="final" style="left:0;width:' + finalW + '%"></span></div></div>' +
        '</div>' +
        '<div class="notebox" style="margin-top:16px">' +
          '<b>第一步：给一个起点。</b>用 Mifflin-St Jeor 公式算基础代谢，再乘活动系数。人群层面的误差通常在 ±15%，所以它只是先验。' +
        '</div>' +
        '<div class="notebox" style="margin-top:10px">' +
          '<b>第二步：用能量守恒反推。</b>把最近 28 天的每日摄入与当天体重做线性回归。斜率代表每天体重变化，乘以 7,700 kcal/kg，就是你的每日能量缺口；再用平均摄入减去缺口，得到真实消耗。' +
        '</div>' +
        '<div class="notebox" style="margin-top:10px">' +
          '<b>第三步：按证据量加权。</b>当前证据来自 ' + ad.validDays + ' 天有效摄入与 ' + ad.weightDays + ' 次体重，校准度 ' + ad.percent + '%。数据越多，越少依赖公式。' +
        '</div>' +
        '<div class="notebox" style="margin-top:10px">' +
          '<b>它为什么会变？</b>因为你的代谢、活动量、记录完整度都在变。预算变化不是错误，而是账本在学习。' + (ad.status === 'prior' ? ' 现在还没有足够数据，先按公式起步。' : '') +
        '</div>' +
        '<div class="notebox" style="margin-top:10px;border-color:var(--amber)">' +
          '<b>它的局限。</b>如果某些天漏记，平均摄入会偏低，反推的消耗也会偏低。所以「记录完整度」比「记录精确度」更重要。体重的水分波动会让区间变宽，而不是让点值更准。' +
        '</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary btn-block" data-act="close-sheet">知道了</button></div>',
      'engine'
    );
  }

  /* ============================================================
     食物库与组合
     ============================================================ */
  function openLibrarySheet() {
    state.sheetData = { type: 'library' };
    renderLibrarySheet();
  }
  function renderLibrarySheet() {
    const custom = DB.foods || [];
    const combos = DB.combos || [];
    const inner =
      sheetHead('食物库与组合', '自定义食物只补你常吃、但库里没有的那几样') +
      '<div class="sheet-body">' +
        '<div class="search-caption"><span class="k">自定义食物</span><span class="tiny faint">' + custom.length + ' 个</span></div>' +
        (custom.length ? custom.map(f => '<div class="list-row"><span class="n">' + esc(f.name) + '<small>' + fmt(f.kcal) + ' kcal/100g · 蛋白 ' + round1(f.p) + 'g</small></span><button class="list-del" data-act="del-custom-food" data-id="' + f.id + '">' + icon('trash') + '</button></div>').join('')
          : '<div class="cart-empty">还没有自定义食物。下方可以添加。</div>') +
        '<div class="notebox" style="margin-top:14px">' +
          '<div class="field"><label>名称</label><input class="input" id="libName" placeholder="如：妈妈做的杂粮饭" maxlength="24"></div>' +
          '<div class="form-grid"><div class="field"><label>分类</label><select class="select" id="libCat">' + E.CATS.map((c, i) => '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>每 100g 热量</label><input class="input input-num" id="libKcal" type="number" min="0" placeholder="116"></div></div>' +
          '<div class="form-grid-3"><div class="field"><label>蛋白 g</label><input class="input input-num" id="libP" type="number" min="0" step="0.1" placeholder="2.6"></div>' +
          '<div class="field"><label>碳水 g</label><input class="input input-num" id="libC" type="number" min="0" step="0.1" placeholder="25.9"></div>' +
          '<div class="field"><label>脂肪 g</label><input class="input input-num" id="libF" type="number" min="0" step="0.1" placeholder="0.3"></div></div>' +
          '<div class="form-grid"><div class="field"><label>纤维 g</label><input class="input input-num" id="libFib" type="number" min="0" step="0.1" placeholder="0.3"></div>' +
          '<div class="field"><label>一份克数（可选）</label><input class="input input-num" id="libUnitG" type="number" min="0" placeholder="150"></div></div>' +
          '<button class="btn btn-ghost btn-block" data-act="add-custom-food">' + icon('plus') + '加入食物库</button>' +
        '</div>' +
        '<div class="search-caption" style="margin-top:22px"><span class="k">我的组合</span><span class="tiny faint">' + combos.length + ' 个</span></div>' +
        (combos.length ? combos.map(c => '<div class="list-row"><span class="n">' + esc(c.name) + '<small>' + c.items.length + ' 项 · ' + fmt(c.items.reduce((s, i) => s + (i.kcal || 0), 0)) + ' kcal</small></span><button class="list-del" data-act="del-combo" data-id="' + c.id + '">' + icon('trash') + '</button></div>').join('')
          : '<div class="cart-empty">在「记一餐」里选好食物后，点底部「存为组合」即可创建。</div>') +
        '<div class="notebox" style="margin-top:14px">组合适合固定早餐、公司食堂常点的套餐。它保存的是当时的食物快照，不会随食物库变动。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary btn-block" data-act="close-sheet">完成</button></div>';
    openSheet(inner, 'library');
  }

  function addCustomFood() {
    const name = ($('#libName') && $('#libName').value.trim()) || '';
    const kcal = Number($('#libKcal') && $('#libKcal').value);
    if (!name) { toast('给食物起个名字'); return; }
    if (!kcal || kcal <= 0) { toast('每 100g 热量要大于 0'); return; }
    const cat = Number($('#libCat') && $('#libCat').value) || 0;
    const f = E.toFood({
      name: name, cat: cat, kcal: kcal,
      p: Number($('#libP') && $('#libP').value) || 0,
      c: Number($('#libC') && $('#libC').value) || 0,
      f: Number($('#libF') && $('#libF').value) || 0,
      fib: Number($('#libFib') && $('#libFib').value) || 0,
      unitG: Number($('#libUnitG') && $('#libUnitG').value) || 0
    });
    DB.foods.push(f);
    saveDB();
    renderLibrarySheet();
    toast('已加入食物库');
  }

  /* ============================================================
     示例数据
     ============================================================ */
  function generateDemo() {
    const today = E.todayKey();
    const profile = {
      sex: 'female', age: 29, height: 165, weight: 63.4, targetWeight: 58,
      activity: 'light', goal: 'lose', rate: 0.25, proteinFactor: 1.6, createdAt: Date.now()
    };
    const entries = [], weights = [], exercises = [], water = {};
    const breakfasts = [
      [['燕麦片（干）', 40], ['牛奶（全脂）', 250], ['鸡蛋', 50], ['蓝莓', 50]],
      [['全麦面包', 70], ['鸡蛋', 100], ['拿铁', 300], ['圣女果', 100]],
      [['豆浆（无糖）', 250], ['馒头', 100], ['鸡蛋', 50], ['苹果', 150]]
    ];
    const lunches = [
      [['鸡胸肉（熟）', 140], ['米饭（熟）', 150], ['西兰花', 200], ['橄榄油', 5]],
      [['瘦牛肉（熟）', 100], ['糙米饭（熟）', 150], ['菠菜', 200], ['橄榄油', 5]],
      [['三文鱼', 100], ['藜麦（熟）', 150], ['芦笋', 150], ['橄榄油', 5]],
      [['北豆腐', 200], ['米饭（熟）', 150], ['小白菜', 200], ['橄榄油', 5]]
    ];
    const dinners = [
      [['鲈鱼（清蒸）', 150], ['红薯（蒸）', 150], ['生菜', 100], ['橄榄油', 5]],
      [['鸡腿肉（去皮熟）', 120], ['玉米（煮）', 150], ['番茄', 150], ['橄榄油', 5]],
      [['基围虾', 120], ['荞麦面（熟）', 200], ['黄瓜', 150], ['橄榄油', 5]]
    ];
    const snacks = [['无糖酸奶', 150], ['苹果', 180], ['杏仁', 15]];
    let order = 0;
    for (let i = 0; i <= 20; i++) {
      const date = E.addDays(today, -(20 - i));
      const todayOnly = i === 20;
      weights.push({ date: date, kg: round1(63.4 - 0.036 * i + Math.sin(i * 1.7) * 0.12) });
      water[date] = 1200 + (i % 5) * 200;
      if (!todayOnly) {
        const d = i % 3;
        const mealPlans = [
          ['breakfast', breakfasts[d]],
          ['lunch', lunches[(i + 1) % 4]],
          ['dinner', dinners[(i + 2) % 3]]
        ];
        mealPlans.forEach(mp => {
          mp[1].forEach(pair => {
            const food = E.foodByName(pair[0], allFoods());
            if (!food) return;
            const e = makeEntry(food, pair[1], mp[0], date, 'lib', 'med');
            e.createdAt = E.dateOf(date).getTime() + order++ * 60000;
            entries.push(e);
          });
        });
        if (i % 4 !== 3) {
          const food = E.foodByName(snacks[i % 3][0], allFoods());
          if (food) {
            const e = makeEntry(food, snacks[i % 3][1], 'snack', date, 'lib', 'med');
            e.createdAt = E.dateOf(date).getTime() + order++ * 60000;
            entries.push(e);
          }
        }
        if (E.isWeekend(date)) {
          [['可乐', 330], ['薯片', 50]].forEach(pair => {
            const food = E.foodByName(pair[0], allFoods());
            if (!food) return;
            const e = makeEntry(food, pair[1], 'snack', date, 'lib', 'med');
            e.createdAt = E.dateOf(date).getTime() + order++ * 60000;
            entries.push(e);
          });
        }
        if (i % 7 === 2) exercises.push({ id: uid(), date: date, name: '快走', mets: 5, minutes: 40, kcal: E.burn(5, 63.4, 40), createdAt: Date.now() });
        if (i % 7 === 5) exercises.push({ id: uid(), date: date, name: '力量训练', mets: 3.5, minutes: 30, kcal: E.burn(3.5, 63.2, 30), createdAt: Date.now() });
      } else {
        breakfasts[0].forEach(pair => {
          const food = E.foodByName(pair[0], allFoods());
          if (food) entries.push(makeEntry(food, pair[1], 'breakfast', date, 'lib', 'med'));
        });
      }
    }
    const keepAI = DB.settings.ai;
    DB = normalizeDB({
      version: 2, createdAt: Date.now(), onboarded: true, profile: profile,
      settings: { theme: DB.settings.theme, ai: keepAI, demo: true },
      entries: entries, weights: weights, exercises: exercises, foods: [], combos: [], water: water, notes: {}
    });
    saveDB();
    state.recordDate = today;
    state.nextSeed = 0;
    const onboard = $('#onboardRoot');
    if (onboard) onboard.innerHTML = '';
    state.ob = null;
    setTab('today');
    renderActive();
    toast('已载入 21 天示例账本');
  }

  /* ============================================================
     导入 / 导出
     ============================================================ */
  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function dateStamp() { return E.todayKey().replace(/-/g, ''); }

  function exportJSON() {
    if (!DB.profile) { toast('还没有可导出的数据'); return; }
    const payload = {
      version: 2, app: 'energy-ledger', exportedAt: new Date().toISOString(),
      profile: DB.profile,
      settings: { theme: DB.settings.theme, ai: { baseURL: DB.settings.ai.baseURL, model: DB.settings.ai.model } },
      entries: DB.entries, weights: DB.weights, exercises: DB.exercises,
      foods: DB.foods, combos: DB.combos, water: DB.water, notes: DB.notes
    };
    downloadFile('能量账本-备份-' + dateStamp() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('备份已导出');
  }

  function exportCSV() {
    if (!DB.entries.length) { toast('还没有记录'); return; }
    const rows = [['日期', '餐次', '食物', '克数', '热量kcal', '蛋白质g', '碳水g', '脂肪g', '纤维g', '可信度', '来源']];
    DB.entries.slice().sort((a, b) => (a.date + a.createdAt) < (b.date + b.createdAt) ? -1 : 1).forEach(e => {
      rows.push([e.date, E.mealLabel(e.meal), e.name, e.grams || '', Math.round(e.kcal), e.p || 0, e.c || 0, e.f || 0, e.fib || 0, e.conf || '', e.source || '']);
    });
    const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    downloadFile('能量账本-明细-' + dateStamp() + '.csv', csv, 'text/csv;charset=utf-8');
    toast('明细已导出');
  }

  function parseGrams(str) {
    const m = String(str || '').match(/(\d+(?:\.\d+)?)\s*(g|克)/i);
    return m ? Number(m[1]) : 0;
  }

  function convertLegacy(data) {
    const p = data.profile || {};
    const weight = Number(p.weight) || 65;
    const target = Number(p.targetWeight) || Math.max(40, weight - 5);
    const entries = (data.meals || []).map(m => {
      const food = E.foodByName(m.name, E.FOODS);
      const grams = parseGrams(m.portion) || (food && food.unitG) || 100;
      const per100 = food ? { kcal: food.kcal, p: food.p, c: food.c, f: food.f, fib: food.fib } : null;
      const kcal = Number(m.calories) || 0;
      return {
        id: uid(), date: m.dateKey, meal: m.mealType || 'lunch', name: m.name,
        grams: grams, per100: per100, kcal: kcal,
        p: per100 ? round1(per100.p * grams / 100) : 0,
        c: per100 ? round1(per100.c * grams / 100) : 0,
        f: per100 ? round1(per100.f * grams / 100) : 0,
        fib: per100 ? round1(per100.fib * grams / 100) : 0,
        conf: 'med', source: 'legacy', createdAt: m.createdAt || Date.now()
      };
    });
    const weights = (data.weights || []).map(w => ({ date: w.dateKey, kg: Number(w.weight) })).filter(w => w.date && w.kg > 0);
    const exercises = (data.exercises || []).map(x => {
      const ex = E.EXERCISES.find(e => e.name === x.name) || { mets: 3.5 };
      return { id: uid(), date: x.dateKey, name: x.name, mets: x.mets || ex.mets, minutes: x.minutes || 30, kcal: Number(x.calories != null ? x.calories : x.kcal) || 0, createdAt: Date.now() };
    });
    const activityMap = { sedentary: 'sed', light: 'light', moderate: 'mod', intense: 'high' };
    return {
      profile: {
        sex: p.gender === 'male' ? 'male' : 'female',
        age: Number(p.age) || 30, height: Number(p.height) || 170,
        weight: weight, targetWeight: target,
        activity: activityMap[p.activityLevel] || 'light',
        goal: target < weight - 0.5 ? 'lose' : target > weight + 0.5 ? 'gain' : 'maintain',
        rate: 0.25, proteinFactor: 1.6, createdAt: Date.now()
      },
      entries: entries, weights: weights, exercises: exercises,
      foods: [], combos: [], water: {}, notes: {},
      counts: { entries: entries.length, weights: weights.length, exercises: exercises.length }
    };
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (e) { toast('文件不是有效的 JSON'); return; }
        const isLegacy = data && data.app === 'qingka-riji';
        let payload;
        if (isLegacy) {
          payload = convertLegacy(data);
        } else if (data && Array.isArray(data.entries)) {
          payload = {
            profile: data.profile, entries: data.entries, weights: data.weights || [],
            exercises: data.exercises || [], foods: data.foods || [], combos: data.combos || [],
            water: data.water || {}, notes: data.notes || {}, settings: data.settings || {},
            counts: { entries: data.entries.length, weights: (data.weights || []).length, exercises: (data.exercises || []).length }
          };
        } else {
          toast('无法识别的备份格式');
          return;
        }
        if (!payload.profile) { toast('备份里没有身体档案'); return; }
        const ok = await confirmSheet('导入备份？',
          '即将覆盖当前的 <b>' + DB.entries.length + '</b> 笔记录、' + DB.weights.length + ' 次体重。<br>备份中有 <b>' + payload.counts.entries + '</b> 笔记录、' + payload.counts.weights + ' 次体重' + (isLegacy ? '（来自旧版轻卡日记）' : '') + '。<br><br>这会清空当前数据，且不可撤销。',
          '覆盖并导入', true);
        if (!ok) return;
        const keepKey = (DB.settings.ai && DB.settings.ai.key) || '';
        const backupSettings = payload.settings || {};
        DB = normalizeDB({
          version: 2, createdAt: Date.now(), onboarded: true,
          profile: payload.profile,
          settings: {
            theme: backupSettings.theme || DB.settings.theme,
            ai: Object.assign({}, DB.settings.ai, backupSettings.ai || {}, { key: keepKey }),
            demo: false
          },
          entries: payload.entries, weights: payload.weights, exercises: payload.exercises,
          foods: payload.foods, combos: payload.combos, water: payload.water, notes: payload.notes
        });
        saveDB();
        state.recordDate = E.todayKey();
        closeSheet();
        renderActive();
        toast('已导入 ' + payload.counts.entries + ' 笔记录');
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function clearAll() {
    const ok = await confirmSheet('清除全部数据？',
      '会删除本机的所有记录、体重、运动、自定义食物与档案。<br>这不会影响你导出的备份，但删除后无法恢复。',
      '彻底删除', true);
    if (!ok) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    DB = normalizeDB({});
    closeSheet();
    applyTheme();
    state.recordDate = E.todayKey();
    renderActive();
    startOnboarding();
    toast('已清除本机数据');
  }

  /* ============================================================
     引导
     ============================================================ */
  function startOnboarding() {
    state.ob = { step: 1, sex: null, age: '', height: '', weight: '', targetWeight: '', activity: 'light', goal: 'lose', rate: 0.25 };
    renderOnboarding();
  }
  function renderOnboarding() {
    const ob = state.ob;
    if (!ob) return;
    const root = $('#onboardRoot');
    const dots = '<div class="ob-dots">' + [1, 2, 3].map(i => '<span class="' + (i <= ob.step ? 'on' : '') + '"></span>').join('') + '</div>';
    let body = '';
    if (ob.step === 1) {
      body = '<div class="ob-step">' + dots +
        '<div class="eyebrow">SET UP · 1 / 3</div>' +
        '<h1 class="ob-title">先认识你的身体</h1>' +
        '<p class="ob-sub">这不是体检，只需要四个数字。它们只用来给账本一个起点；两周后，你自己的体重变化会替代这些猜测。</p>' +
        '<div class="field"><label>性别</label><div class="seg">' + [['female', '女'], ['male', '男']].map(x =>
          '<button data-ob="sex" data-v="' + x[0] + '" class="' + (ob.sex === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>年龄</label><input class="input input-num" id="obAge" type="number" min="12" max="90" value="' + ob.age + '" placeholder="29"></div>' +
          '<div class="field"><label>身高 cm</label><input class="input input-num" id="obHeight" type="number" min="120" max="220" value="' + ob.height + '" placeholder="165"></div>' +
          '<div class="field"><label>体重 kg</label><input class="input input-num" id="obWeight" type="number" step="0.1" min="25" max="300" value="' + ob.weight + '" placeholder="63.5"></div>' +
        '</div>' +
        '<div class="ob-actions"><button class="btn btn-primary btn-block" data-ob="next1" id="obNext1">继续</button></div>' +
        '<p class="ob-note">数据不会上传。账本没有账号系统，没有云端，也没有“排行榜”。</p>' +
        '<button class="demo-link" data-ob="demo">没有数据？先用 21 天示例看看账本长什么样</button>' +
      '</div>';
    } else if (ob.step === 2) {
      const rateBox = ob.goal === 'maintain'
        ? '<div class="notebox">维持目标：预算等于校准后的日常消耗，不设刻意缺口。</div>'
        : '<div class="field"><label>速度（kg / 周）</label><div class="seg">' + [0.25, 0.5, 0.75].map(r =>
          '<button data-ob="rate" data-v="' + r + '" class="' + (Math.abs(ob.rate - r) < .01 ? 'on' : '') + '">' + r + (r === 0.25 ? ' 温和' : r === 0.5 ? ' 标准' : ' 进取') + '</button>').join('') + '</div></div>';
      body = '<div class="ob-step">' + dots +
        '<div class="eyebrow">SET UP · 2 / 3</div>' +
        '<h1 class="ob-title">你想往哪里走</h1>' +
        '<p class="ob-sub">目标决定预算，但账本不会允许不安全的缺口。它会在 22% 的消耗上限和基础代谢下限之间自动收口。</p>' +
        '<div class="field"><label>目标</label><div class="ob-goal">' + [['lose', '减脂', '稳住肌肉'], ['maintain', '维持', '体重不变'], ['gain', '增肌', '小幅盈余']].map(x =>
          '<button class="goal-card ' + (ob.goal === x[0] ? 'on' : '') + '" data-ob="goal" data-v="' + x[0] + '"><div class="t">' + x[1] + '</div><div class="s">' + x[2] + '</div></button>').join('') + '</div></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>目标体重 kg</label><input class="input input-num" id="obTarget" type="number" step="0.1" min="25" max="300" value="' + ob.targetWeight + '" placeholder="58"></div>' +
          '<div class="field"><label>日常活动</label><select class="select" id="obActivity">' + DATA.activities.map(a =>
            '<option value="' + a[0] + '"' + (ob.activity === a[0] ? ' selected' : '') + '>' + a[1] + '</option>').join('') + '</select></div>' +
        '</div>' +
        rateBox +
        '<div class="ob-actions"><button class="btn btn-ghost" data-ob="back">上一步</button><button class="btn btn-primary" data-ob="next2" id="obNext2">看我的起点</button></div>' +
        '<p class="ob-note">活动水平只影响第一天的先验。之后账本会用你的摄入与体重反推真实消耗，不再依赖这个选项。</p>' +
      '</div>';
    } else {
      const p = { sex: ob.sex || 'female', age: Number(ob.age), height: Number(ob.height), weight: Number(ob.weight), targetWeight: Number(ob.targetWeight), activity: ob.activity, goal: ob.goal, rate: ob.rate };
      const t = E.targets(p, p.weight);
      const goalText = { lose: '减脂', maintain: '维持', gain: '增肌' }[ob.goal];
      body = '<div class="ob-step">' + dots +
        '<div class="eyebrow">SET UP · 3 / 3</div>' +
        '<h1 class="ob-title">这是起点，不是答案</h1>' +
        '<p class="ob-sub">账本会先按公式给你一个预算。从今天起，它开始观察你的摄入和体重，并在两周内逐步替换成你自己的真实消耗。</p>' +
        '<div class="result-box">' +
          '<div class="result-grid">' +
            '<div class="result-item"><div class="k">基础代谢 BMR</div><div class="v">' + fmt(t.bmr) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">公式日消耗</div><div class="v">' + fmt(t.priorTDEE) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">起始预算</div><div class="v green">' + fmt(t.budgetPrior) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">蛋白质目标</div><div class="v">' + t.protein + ' <small>g / 天</small></div></div>' +
          '</div>' +
          '<div class="result-note">' + (ob.sex === 'male' ? '男' : '女') + ' · ' + ob.age + ' 岁 · ' + ob.height + ' cm · ' + ob.weight + ' kg → 目标 ' + ob.targetWeight + ' kg（' + goalText + '，' + ob.rate + ' kg/周）<br>预算已应用安全下限 ' + fmt(t.floor) + ' kcal。' + (t.capped ? ' 你选择的速度超过消耗的 22%，已自动收窄。' : '') + '</div>' +
        '</div>' +
        '<div class="ob-actions"><button class="btn btn-ghost" data-ob="back">上一步</button><button class="btn btn-primary" data-ob="finish">开始记账</button></div>' +
        '<p class="ob-note">第一周：先把记录做完整，不必追求精确。<br>第二周：账本开始校准。<br>第四周：你会看到一条只属于你的曲线。</p>' +
      '</div>';
    }
    root.innerHTML = '<div class="onboard-wrap"><div class="onboard">' +
      '<div class="ob-brand"><div class="mark">' + icon('mark') + '</div><div><div class="brand-name">能量账本</div><div class="brand-en">ENERGY LEDGER</div></div></div>' +
      body + '</div></div>';
  }
  function readObForm() {
    const ob = state.ob;
    if (!ob) return;
    const a = $('#obAge'), h = $('#obHeight'), w = $('#obWeight'), t = $('#obTarget');
    if (a) ob.age = Number(a.value);
    if (h) ob.height = Number(h.value);
    if (w) ob.weight = Number(w.value);
    if (t) ob.targetWeight = Number(t.value);
    const act = $('#obActivity');
    if (act) ob.activity = act.value;
  }
  function finishOnboarding() {
    const ob = state.ob;
    if (!ob) return;
    const p = { sex: ob.sex, age: Number(ob.age), height: Number(ob.height), weight: Number(ob.weight), targetWeight: Number(ob.targetWeight), activity: ob.activity, goal: ob.goal, rate: ob.rate };
    DB.profile = {
      sex: p.sex, age: p.age, height: p.height, weight: p.weight, targetWeight: p.targetWeight,
      activity: p.activity, goal: p.goal, rate: p.rate,
      proteinFactor: p.goal === 'lose' ? 1.6 : p.goal === 'gain' ? 1.8 : 1.4,
      createdAt: Date.now()
    };
    DB.weights = [{ date: E.todayKey(), kg: p.weight }];
    DB.onboarded = true;
    saveDB();
    $('#onboardRoot').innerHTML = '';
    state.ob = null;
    state.tab = 'today';
    applyTheme();
    setTab('today');
    renderActive();
    toast('账本已建立 · 从今天开始');
  }

  /* ============================================================
     事件
     ============================================================ */
  function handleOb(action, el) {
    const ob = state.ob;
    if (!ob) return;
    if (action === 'sex') { ob.sex = el.dataset.v; renderOnboarding(); return; }
    if (action === 'goal') { ob.goal = el.dataset.v; renderOnboarding(); return; }
    if (action === 'rate') { ob.rate = Number(el.dataset.v); renderOnboarding(); return; }
    if (action === 'back') { ob.step = Math.max(1, ob.step - 1); renderOnboarding(); return; }
    if (action === 'next1') {
      readObForm();
      if (!ob.sex) { toast('先选择性别'); return; }
      if (!(ob.age >= 12 && ob.age <= 90)) { toast('年龄请填 12–90'); return; }
      if (!(ob.height >= 120 && ob.height <= 220)) { toast('身高请填 120–220 cm'); return; }
      if (!(ob.weight >= 25 && ob.weight <= 300)) { toast('体重请填 25–300 kg'); return; }
      ob.step = 2; renderOnboarding(); return;
    }
    if (action === 'next2') {
      readObForm();
      if (!(ob.targetWeight >= 25 && ob.targetWeight <= 300)) { toast('请填写目标体重（25–300 kg）'); return; }
      ob.step = 3; renderOnboarding(); return;
    }
    if (action === 'finish') { finishOnboarding(); return; }
    if (action === 'demo') { generateDemo(); return; }
  }

  function handleAction(el) {
    const act = el.dataset.act;
    const sd = state.sheetData;
    switch (act) {
      case 'close-sheet': closeSheet(); break;
      case 'open-add': {
        const date = state.tab === 'ledger' ? state.recordDate : E.todayKey();
        openFoodSheet({ date: date, meal: el.dataset.meal });
        break;
      }
      case 'open-manual': openManualSheet(); break;
      case 'open-exercise': openExerciseSheet(); break;
      case 'open-weight': openWeightSheet(); break;
      case 'open-ai': openAISheet(); break;
      case 'open-profile': openProfileSheet(); break;
      case 'open-engine': openEngineSheet(); break;
      case 'open-library': openLibrarySheet(); break;
      case 'set-meal': {
        if (!sd) break;
        sd.meal = el.dataset.v;
        const seg = el.closest('.seg');
        if (seg) $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === sd.meal));
        break;
      }
      case 'pick-food': {
        const f = allFoods().find(x => x.id === el.dataset.id);
        if (f) addToCart(f);
        break;
      }
      case 'food-cat': {
        if (!sd) break;
        sd.cat = el.dataset.v === '' ? null : Number(el.dataset.v);
        updatePicks();
        break;
      }
      case 'cart-remove': {
        if (!sd) break;
        sd.cart.splice(Number(el.dataset.i), 1);
        updateCart();
        break;
      }
      case 'save-meal': saveMeal(); break;
      case 'cart-recent': {
        const e = DB.entries.find(x => x.id === el.dataset.id);
        if (e) addToCart(foodFromEntry(e), e.grams || 100);
        break;
      }
      case 'apply-combo': {
        const c = DB.combos.find(x => x.id === el.dataset.id);
        if (!c || !sd) break;
        c.items.forEach(it => {
          const kcal100 = it.per100 ? it.per100.kcal : (it.kcal / Math.max(1, it.grams) * 100);
          const p100 = it.per100 ? it.per100.p : (it.p || 0) / Math.max(1, it.grams) * 100;
          const c100 = it.per100 ? it.per100.c : 0;
          const f100 = it.per100 ? it.per100.f : 0;
          const fib100 = it.per100 ? it.per100.fib : 0;
          sd.cart.push({ food: { id: 'cb' + uid(), name: it.name, kcal: kcal100, p: p100, c: c100, f: f100, fib: fib100, cat: 0, catName: '组合', unitG: 0, unit: '', custom: true }, grams: it.grams });
        });
        updateCart();
        break;
      }
      case 'save-combo': {
        if (!sd || !sd.cart.length) { toast('先选几样食物'); break; }
        askName('给这组食物起个名字', '例如：工作日早餐', '我的常吃组合').then(name => {
          if (!name) return;
          DB.combos.push({
            id: uid(), name: name, createdAt: Date.now(),
            items: sd.cart.map(it => ({
              name: it.food.name, grams: it.grams,
              kcal: Math.round(it.food.kcal * it.grams / 100),
              p: round1(it.food.p * it.grams / 100),
              per100: { kcal: it.food.kcal, p: it.food.p, c: it.food.c, f: it.food.f, fib: it.food.fib }
            }))
          });
          saveDB();
          toast('组合「' + name + '」已保存');
        });
        break;
      }
      case 'save-manual': saveManual(); break;
      case 'edit-entry': openEntrySheet(el.dataset.id); break;
      case 'entry-grams': {
        const g = $('#eGrams');
        if (g) g.value = el.dataset.v;
        updateEntryGramsView();
        break;
      }
      case 'set-conf': {
        if (!sd) break;
        sd.conf = el.dataset.v;
        const seg = el.closest('.seg');
        if (seg) $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === sd.conf));
        break;
      }
      case 'save-entry': saveEntry(); break;
      case 'delete-entry': deleteEntry(el.dataset.id); break;
      case 'day-prev': state.recordDate = E.addDays(state.recordDate, -1); renderLedger(); break;
      case 'day-next': {
        const next = E.addDays(state.recordDate, 1);
        if (next <= E.todayKey()) { state.recordDate = next; renderLedger(); }
        break;
      }
      case 'copy-yesterday': copyYesterday(); break;
      case 'goto-ledger': state.recordDate = E.todayKey(); setTab('ledger'); break;
      case 'goto-meal': openFoodSheet({ date: E.todayKey(), meal: el.dataset.meal }); break;
      case 'next-shuffle': state.nextSeed++; renderToday(); break;
      case 'next-log': logNextBite(); break;
      case 'recent-add': addRecent(el.dataset.id); break;
      case 'quick-water': {
        const today = E.todayKey();
        DB.water[today] = (Number(DB.water[today]) || 0) + Number(el.dataset.ml || 250);
        saveDB();
        renderToday();
        break;
      }
      case 'set-range': state.range = Number(el.dataset.v); renderTrend(); break;
      case 'set-theme': {
        DB.settings.theme = el.dataset.v;
        saveDB();
        applyTheme();
        renderSettings();
        break;
      }
      case 'p-sex': {
        if (!sd) break;
        sd.sex = el.dataset.v;
        $$('button', el.closest('.seg')).forEach(b => b.classList.toggle('on', b.dataset.v === sd.sex));
        updateProfilePreview();
        break;
      }
      case 'p-goal': {
        if (!sd) break;
        sd.goal = el.dataset.v;
        $$('button', el.closest('.seg')).forEach(b => b.classList.toggle('on', b.dataset.v === sd.goal));
        const rb = $('#rateBox');
        if (rb) rb.innerHTML = renderRateSeg(sd.goal, sd.rate);
        updateProfilePreview();
        break;
      }
      case 'p-rate': {
        if (!sd) break;
        sd.rate = Number(el.dataset.v);
        $$('button', el.closest('.seg')).forEach(b => b.classList.toggle('on', Number(b.dataset.v) === sd.rate));
        updateProfilePreview();
        break;
      }
      case 'save-profile': saveProfile(); break;
      case 'w-step': {
        const i = $('#wInput');
        if (!i) break;
        const v = clamp((Number(i.value) || 0) + Number(el.dataset.v), 25, 300);
        i.value = round1(v);
        break;
      }
      case 'save-weight': saveWeight(); break;
      case 'ex-select': {
        if (!sd) break;
        sd.selected = el.dataset.id;
        renderExCalc();
        break;
      }
      case 'save-exercise': saveExercise(); break;
      case 'del-exercise': {
        DB.exercises = DB.exercises.filter(x => x.id !== el.dataset.id);
        saveDB();
        renderExToday();
        renderActive();
        toast('已删除这条运动');
        break;
      }
      case 'ai-run': runAI(); break;
      case 'ai-save-config': saveAIConfig(); break;
      case 'ai-remove': {
        if (!sd) break;
        sd.items.splice(Number(el.dataset.i), 1);
        renderAIResults('');
        break;
      }
      case 'save-ai-results': saveAIResults(); break;
      case 'add-custom-food': addCustomFood(); break;
      case 'del-custom-food': confirmSheet('删除这个自定义食物？', '已经记录的账目不会受影响。', '删除', true).then(ok => {
        if (!ok) return;
        DB.foods = DB.foods.filter(f => f.id !== el.dataset.id);
        saveDB();
        renderLibrarySheet();
        toast('已删除');
      }); break;
      case 'del-combo': confirmSheet('删除这个组合？', '组合只是快捷方式，不影响已经记录的账目。', '删除', true).then(ok => {
        if (!ok) return;
        DB.combos = DB.combos.filter(c => c.id !== el.dataset.id);
        saveDB();
        renderLibrarySheet();
        toast('已删除');
      }); break;
      case 'export-json': exportJSON(); break;
      case 'export-csv': exportCSV(); break;
      case 'import-json': importJSON(); break;
      case 'load-demo': loadDemoConfirmed(); break;
      case 'clear-data': clearAll(); break;
      default: break;
    }
  }

  function updateEntryGramsView() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'entry') return;
    const e = DB.entries.find(x => x.id === sd.id);
    const g = Number($('#eGrams') && $('#eGrams').value) || 0;
    const view = $('#eKcalView');
    if (e && e.per100 && view && g > 0) view.textContent = Math.round(e.per100.kcal * g / 100) + ' kcal';
  }

  function saveEntry() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'entry') return;
    const e = DB.entries.find(x => x.id === sd.id);
    if (!e) return;
    const name = ($('#eName') && $('#eName').value.trim()) || e.name;
    e.name = name;
    e.meal = sd.meal || e.meal;
    e.conf = sd.conf || E.confOf(e);
    if (e.per100) {
      const g = clamp(Number($('#eGrams') && $('#eGrams').value) || 1, 1, 5000);
      e.grams = g;
      e.kcal = Math.round(e.per100.kcal * g / 100);
      e.p = round1(e.per100.p * g / 100);
      e.c = round1(e.per100.c * g / 100);
      e.f = round1(e.per100.f * g / 100);
      e.fib = round1(e.per100.fib * g / 100);
    } else {
      const kcal = Number($('#eKcal') && $('#eKcal').value);
      if (!kcal || kcal <= 0) { toast('热量要大于 0'); return; }
      e.kcal = Math.round(kcal);
      e.p = Number($('#eP') && $('#eP').value) || 0;
      e.per100 = null;
    }
    saveDB();
    closeSheet();
    renderActive();
    toast('已更新这一笔');
  }

  function deleteEntry(id) {
    confirmSheet('删除这一笔？', '这条食物记录会从账本中移除，无法撤销。', '删除', true).then(ok => {
      if (!ok) return;
      DB.entries = DB.entries.filter(e => e.id !== id);
      saveDB();
      closeSheet();
      renderActive();
      toast('已删除');
    });
  }

  function copyYesterday() {
    const target = state.recordDate;
    const source = E.addDays(target, -1);
    const list = DB.entries.filter(e => e.date === source);
    if (!list.length) { toast('昨天没有记录可以复制'); return; }
    const doCopy = () => {
      list.forEach(e => {
        DB.entries.push(Object.assign({}, e, { id: uid(), date: target, createdAt: Date.now() }));
      });
      saveDB();
      renderLedger();
      renderActive();
      toast('已把 ' + list.length + ' 笔记录复制到' + E.relativeDay(target, E.todayKey()));
    };
    const existing = DB.entries.filter(e => e.date === target);
    if (existing.length) {
      confirmSheet('这一天已经有记录', '复制会把昨天的 <b>' + list.length + '</b> 笔再加一遍。如果昨天和今天吃得一样，这会很方便；否则请先删除。', '继续复制').then(ok => { if (ok) doCopy(); });
    } else doCopy();
  }

  function addRecent(id) {
    const e = DB.entries.find(x => x.id === id);
    if (!e) return;
    const today = E.todayKey();
    const copy = Object.assign({}, e, { id: uid(), date: today, createdAt: Date.now() });
    if (!copy.meal) copy.meal = E.guessMeal();
    DB.entries.push(copy);
    saveDB();
    renderActive();
    toast('已记入 ' + E.mealLabel(copy.meal) + ' · ' + copy.kcal + ' kcal');
  }

  function logNextBite() {
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) return;
    const nb = E.nextBite({ remaining: st.remain, proteinGap: st.t.protein - st.sum.p, meal: E.guessMeal(), foods: allFoods(), seed: state.nextSeed });
    if (nb.type !== 'plan' || !nb.items.length) { toast('这一餐没有可记录的内容'); return; }
    nb.items.forEach(it => {
      const food = { name: it.name, kcal: it.per100 || it.kcal / it.grams * 100, p: it.p100 || it.p / it.grams * 100, c: it.c100 || 0, f: it.f100 || 0, fib: it.fib100 || 0, cat: 0, catName: it.cat, unitG: 0 };
      const entry = makeEntry(food, it.grams, E.guessMeal(), today, 'combo', 'med');
      DB.entries.push(entry);
    });
    saveDB();
    renderToday();
    toast('已记下这一餐 · ' + nb.totals.kcal + ' kcal');
  }

  async function loadDemoConfirmed() {
    if (DB.entries.length || DB.profile) {
      const ok = await confirmSheet('载入示例账本？', '会用 21 天的假数据覆盖当前的 <b>' + DB.entries.length + '</b> 笔记录与档案。建议先导出备份。', '覆盖并载入', true);
      if (!ok) return;
    }
    generateDemo();
  }

  document.addEventListener('click', e => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) { setTab(tabBtn.dataset.tab); return; }
    if (e.target.id === 'sheetWrap') { closeSheet(); return; }
    if (e.target.id === 'miniWrap') { miniClose(false); return; }
    const obBtn = e.target.closest('[data-ob]');
    if (obBtn) { handleOb(obBtn.dataset.ob, obBtn); return; }
    const actBtn = e.target.closest('[data-act]');
    if (actBtn) { handleAction(actBtn); }
  });

  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'foodSearch') {
      if (state.sheetData && state.sheetData.type === 'food') {
        state.sheetData.query = t.value;
        updatePicks();
      }
      return;
    }
    if (t.dataset && t.dataset.cartGrams != null) {
      const sd = state.sheetData;
      if (!sd || !sd.cart) return;
      const i = Number(t.dataset.cartGrams);
      const item = sd.cart[i];
      if (!item) return;
      item.grams = Math.max(1, Number(t.value) || 1);
      const k = $('#cartKcal' + i);
      if (k) k.textContent = Math.round(item.food.kcal * item.grams / 100);
      const total = sd.cart.reduce((s, it) => s + it.food.kcal * it.grams / 100, 0);
      const tot = $('#cartTotal');
      if (tot) tot.innerHTML = Math.round(total) + ' <small>kcal</small>';
      const btn = $('#saveMealBtn');
      if (btn && !btn.disabled) btn.textContent = '记入 · ' + Math.round(total) + ' kcal';
      return;
    }
    if (t.dataset && t.dataset.aiGrams != null) {
      const sd = state.sheetData;
      if (!sd || !sd.items) return;
      const i = Number(t.dataset.aiGrams);
      const it = sd.items[i];
      if (!it) return;
      it.grams = Math.max(1, Number(t.value) || 1);
      const k = $('#aiKcal' + i);
      if (k) k.textContent = Math.round(it.per100.kcal * it.grams / 100);
      const total = sd.items.reduce((s, x) => s + x.per100.kcal * x.grams / 100, 0);
      const tot = $('#aiTotal');
      if (tot) tot.innerHTML = Math.round(total) + ' <small>kcal</small>';
      const btn = $('#aiSaveBtn');
      if (btn && !btn.disabled) btn.textContent = '记入 · ' + Math.round(total) + ' kcal';
      return;
    }
    if (t.id === 'exSearch') {
      if (state.sheetData) { state.sheetData.query = t.value; renderExList(); }
      return;
    }
    if (t.id === 'exMinutes') {
      const sd = state.sheetData;
      if (!sd) return;
      sd.minutes = clamp(Number(t.value) || 1, 1, 600);
      const ex = E.EXERCISES.find(x => x.id === sd.selected);
      if (ex) {
        const kcal = E.burn(ex.mets, currentWeight(), sd.minutes);
        const v = $('#exKcalVal');
        if (v) v.innerHTML = kcal + '<small> kcal</small>';
        const b = $('#exSaveBtn');
        if (b) b.textContent = '记入 · ' + kcal + ' kcal';
      }
      return;
    }
    if (t.id === 'eGrams') { updateEntryGramsView(); return; }
    if (['pAge', 'pHeight', 'pWeight', 'pTarget'].indexOf(t.id) > -1) { updateProfilePreview(); return; }
    if (t.closest('#onboardRoot')) {
      const ob = state.ob;
      if (!ob) return;
      if (t.id === 'obAge') ob.age = Number(t.value);
      if (t.id === 'obHeight') ob.height = Number(t.value);
      if (t.id === 'obWeight') ob.weight = Number(t.value);
      if (t.id === 'obTarget') ob.targetWeight = Number(t.value);
      return;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'aiFile') {
      const file = t.files && t.files[0];
      if (!file) return;
      readImage(file).then(dataURL => {
        if (!state.sheetData) return;
        state.sheetData.image = dataURL;
        const box = $('#aiPreview');
        if (box) box.innerHTML = '<div class="thumb"><img src="' + dataURL + '" alt="待识别照片"><div class="t">照片已压缩 · 可开始识别<div class="s">原图不会上传，只发送压缩后的副本</div></div></div>';
      }).catch(() => toast('照片读取失败'));
      return;
    }
    if (t.id === 'pActivity' && state.sheetData) {
      state.sheetData.activity = t.value;
      updateProfilePreview();
      return;
    }
    if (t.id === 'obActivity' && state.ob) { state.ob.activity = t.value; return; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (miniState) { miniClose(false); return; }
      if ($('#sheetRoot') && $('#sheetRoot').innerHTML) { closeSheet(); }
    }
  });

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    applyTheme();
    if (DB.profile) DB.onboarded = true;
    updateRail();
    renderActive();
    if (!DB.profile) startOnboarding();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    let lastDay = E.todayKey();
    setInterval(() => {
      const nowDay = E.todayKey();
      if (nowDay !== lastDay) {
        lastDay = nowDay;
        state.recordDate = nowDay;
        updateRail();
        renderActive();
      }
    }, 60000);
  }
  init();
})();
