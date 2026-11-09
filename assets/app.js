/* 能量账本 · 应用层
   本地优先：数据只写入当前设备的 localStorage。
   设计原则：账本可以估算，但必须诚实地展示不确定性，并用你自己的数据持续校准。 */
(function () {
  'use strict';

  const E = window.Engine;
  const W = window.Wellness;
  const G = window.Gender;
  const X = window.Extras;
  const FL = window.FoodLib;
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
  const round2 = n => Math.round(n * 100) / 100;
  const round5 = n => Math.round(n / 5) * 5;
  const STATIC_MODE = (function () {
    const meta = document.querySelector('meta[name="ledger-mode"]');
    return !!(meta && meta.getAttribute('content') === 'static');
  })();
  const AI_GLM = { baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4v-flash' };
  const AI_QWEN = { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-vl-max' };
  const AI_DEFAULT = STATIC_MODE ? AI_QWEN : AI_GLM;

  /* ============================================================
     存储
     ============================================================ */
  const KEY = 'energy-ledger.v2';
  const DEFAULT_DB = {
    version: 2,
    createdAt: Date.now(),
    onboarded: false,
    profile: null,
    settings: {
      theme: 'auto',
      ai: Object.assign({ key: '' }, AI_DEFAULT),
      demo: false,
      gentle: false,
      fx: true,
      powerSave: false,
      motion: false,
      /* v5.2 长辈模式：持久化开关，只影响界面，不改任何记录 */
      elder: false,
      pin: { on: false, hash: '' },
      /* 账本模式：ledger = 纯账本 / full = 完整。缺失或非法一律按 full（老用户优先不丢入口） */
      mode: 'full',
      modeHintSeen: false,
      prefs: { vegetarian: false, lactoseFree: false, glutenFree: false, halal: false }
    },
    entries: [],
    weights: [],
    exercises: [],
    foods: [],
    combos: [],
    water: {},
    notes: {},
    cycle: { enabled: false, lastStart: '', length: 28, periodLength: 5, history: [] },
    measures: [],
    checkins: [],
    supplements: [],
    stats: { aiCalls: 0, aiOk: 0, aiFail: 0, aiMs: 0 },
    /* 运动环游记：total_km 只是缓存，永远由 exercises 重算；collected 是收藏的站点编号 */
    trip: { total_km: 0, updatedAt: 0, collected: [], last_station: 0 },
    logs: [],
    lifts: [],
    recipes: [],
    shopping: null,
    controlChecks: {},
    wearable: {},
    favorites: [],
    foodUse: {},
    reco: { prefs: { veg: false, lowcarb: false, highprotein: false, light: false }, seen: [] },
    wallet: { credits: [], applied: [] },
    /* 扭蛋币：与抽奖券完全独立，可存可累计、无过期、无上限 */
    coins: 0,
    /* 扭蛋机状态：里程碑次数、已领取里程碑、最近 20 条抽取历史 */
    gacha: { credits: 0, milestones: {}, history: [] },
    scratch: {
      lastEarnedDate: '', count: 0, miss: 0, log: [], card: null, last: null, weeklyKcal: {},
      pass: { week: '', used: false }, tickets: [], milestones: {}, batch: null
    },
    cheatDays: { history: [] },
    leaveDays: [],
    wishlist: [],
    skins: {
      active: 'paper', unlocked: ['paper', 'kraft'], theme: 'paper', stamp: 'seal-red', cover: 'default',
      texture: 'fiber', bookmark: '', signature: '', font: '', scratchArt: 'cloth', fxTheme: '',
      unlockedCos: [], packs: {}
    },
    collect: { quotes: [], eggs: [], medals: [] },
    codex: { lit: [] },
    bank: { loans: [], waivers: { free: 0, extra: 0 } },
    /* 热量信用卡：events/certificates 全部可由 entries 逐日重算；meta 只是对账缓存 */
    credit: { events: [], certificates: [], meta: {} },
    /* 冰箱库存：items 只是 ops 的重建缓存；扣减与入库都能从记录复算 */
    pantry: { items: [], ops: [], hintDate: '' },
    revive: [],
    tasks: { date: '', list: [] },
    anti: { since: 0, lastPrompt: 0, date: '' }
  };

  function normalizeDB(raw) {
    const db = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DB)), raw || {});
    db.settings = Object.assign({}, DEFAULT_DB.settings, db.settings || {});
    db.settings.ai = Object.assign({}, DEFAULT_DB.settings.ai, (db.settings || {}).ai || {});
    db.settings.prefs = Object.assign({}, DEFAULT_DB.settings.prefs, (db.settings || {}).prefs || {});
    db.settings.pin = Object.assign({ on: false, hash: '' }, (db.settings || {}).pin || {});
    db.settings.powerSave = !!db.settings.powerSave;
    db.settings.motion = !!db.settings.motion;
    db.settings.elder = !!db.settings.elder;
    db.settings.mode = (db.settings.mode === 'ledger' || db.settings.mode === 'full') ? db.settings.mode : 'full';
    db.settings.modeHintSeen = !!db.settings.modeHintSeen;
    if (STATIC_MODE && !db.settings.ai.key && (!db.settings.ai.baseURL || db.settings.ai.baseURL === AI_GLM.baseURL)) {
      db.settings.ai.baseURL = AI_QWEN.baseURL;
      db.settings.ai.model = AI_QWEN.model;
    }
    ['entries', 'weights', 'exercises', 'foods', 'combos', 'measures', 'checkins', 'supplements', 'logs', 'lifts', 'recipes'].forEach(k => {
      if (!Array.isArray(db[k])) db[k] = [];
    });
    db.lifts = db.lifts.map(x => ({
      id: x.id || uid(), date: x.date || x.dateKey || '', exercise: String(x.exercise || x.name || '').trim(),
      sets: Math.max(1, Number(x.sets) || 1), weight: Math.max(0, Number(x.weight) || 0),
      reps: Math.max(1, Number(x.reps) || 1), note: String(x.note || ''), createdAt: Number(x.createdAt) || Date.now()
    })).filter(x => x.date && x.exercise);
    db.recipes = db.recipes.map(r => ({
      id: r.id || uid(), name: String(r.name || '未命名菜谱'), at: Number(r.at) || Date.now(),
      items: (Array.isArray(r.items) ? r.items : []).map(it => ({
        name: String(it.name || ''), grams: Math.max(1, Number(it.grams) || 100),
        per100: Object.assign({ kcal: 0, p: 0, c: 0, f: 0, fib: 0 }, (it.per100 || {}))
      })).filter(it => it.name)
    })).filter(r => r.items.length);
    if (db.shopping && Array.isArray(db.shopping.items)) {
      db.shopping = {
        recipeId: db.shopping.recipeId || '', recipeName: db.shopping.recipeName || '',
        at: Number(db.shopping.at) || Date.now(),
        items: db.shopping.items.map(it => ({ name: String(it.name || ''), grams: Math.max(0, Number(it.grams) || 0), checked: !!it.checked })).filter(it => it.name)
      };
    } else db.shopping = null;
    if (!db.wearable || typeof db.wearable !== 'object' || Array.isArray(db.wearable)) db.wearable = {};
    if (!db.stats || typeof db.stats !== 'object') db.stats = { aiCalls: 0, aiOk: 0, aiFail: 0, aiMs: 0 };
    else db.stats = Object.assign({ aiCalls: 0, aiOk: 0, aiFail: 0, aiMs: 0 }, db.stats);
    db.logs = db.logs.slice(0, 30);
    if (!db.water || typeof db.water !== 'object') db.water = {};
    if (!db.notes || typeof db.notes !== 'object') db.notes = {};
    if (!db.controlChecks || typeof db.controlChecks !== 'object') db.controlChecks = {};
    if (!db.favorites) db.favorites = [];
    if (!db.foodUse || typeof db.foodUse !== 'object' || Array.isArray(db.foodUse)) db.foodUse = {};
    if (!db.reco || typeof db.reco !== 'object') db.reco = { prefs: {}, seen: [] };
    db.reco.prefs = Object.assign({ veg: false, lowcarb: false, highprotein: false, light: false }, db.reco.prefs || {});
    if (!Array.isArray(db.reco.seen)) db.reco.seen = [];
    db.reco.seen = db.reco.seen.slice(-500);
    if (!db.wallet || typeof db.wallet !== 'object') db.wallet = { credits: [], applied: [] };
    if (!Array.isArray(db.wallet.credits)) db.wallet.credits = [];
    if (!Array.isArray(db.wallet.applied)) db.wallet.applied = [];
    db.wallet.credits = db.wallet.credits.filter(c => c && c.id && Number(c.kcal) > 0).map(c => ({
      id: c.id, kcal: Math.max(0, Number(c.kcal) || 0), kind: c.kind === 'week' ? 'week' : 'day',
      expire: String(c.expire || ''), label: String(c.label || '弹性额度'),
      used: !!c.used, usedAt: Number(c.usedAt) || 0, from: String(c.from || '')
    }));
    db.wallet.applied = db.wallet.applied.filter(a => a && a.date && a.id).map(a => ({
      id: a.id, date: a.date, kcal: Math.max(0, Number(a.kcal) || 0)
    }));
    if (!db.scratch || typeof db.scratch !== 'object') db.scratch = { lastEarnedDate: '', count: 0, miss: 0, log: [], card: null, last: null, weeklyKcal: {}, pass: { week: '', used: false } };
    db.scratch.miss = Math.max(0, Number(db.scratch.miss) || 0);
    db.scratch.count = Math.max(0, Number(db.scratch.count) || 0);
    if (!Array.isArray(db.scratch.log)) db.scratch.log = [];
    db.scratch.log = db.scratch.log.slice(-60);
    if (!Array.isArray(db.scratch.tickets)) db.scratch.tickets = [];
    db.coins = Math.max(0, Number(db.coins) || 0);
    if (!db.trip || typeof db.trip !== 'object') db.trip = { total_km: 0, updatedAt: 0, collected: [], last_station: 0 };
    db.trip.total_km = Math.max(0, Number(db.trip.total_km) || 0);
    db.trip.last_station = Math.max(0, Number(db.trip.last_station) || 0);
    if (!Array.isArray(db.trip.collected)) db.trip.collected = [];
    db.trip.collected = db.trip.collected.map(n => Number(n)).filter(n => n > 0 && n <= 30);
    if (!db.gacha || typeof db.gacha !== 'object') db.gacha = { credits: 0, milestones: {}, history: [] };
    db.gacha.credits = Math.max(0, Number(db.gacha.credits) || 0);
    if (!db.gacha.milestones || typeof db.gacha.milestones !== 'object') db.gacha.milestones = {};
    if (!Array.isArray(db.gacha.history)) db.gacha.history = [];
    db.gacha.history = db.gacha.history.slice(0, 20);
    db.scratch.tickets = db.scratch.tickets.filter(t => t && t.id).map(t => ({
      id: t.id, source: String(t.source || 'daily'), date: String(t.date || E.todayKey()), at: Number(t.at) || Date.now()
    })).slice(-20000);
    if (!db.scratch.milestones || typeof db.scratch.milestones !== 'object') db.scratch.milestones = {};
    /* 连刮批次：开批即落盘，关面板不丢券。settled 只允许结算一次 */
    const sb = db.scratch.batch;
    if (!sb || typeof sb !== 'object' || !Array.isArray(sb.cards) || !sb.cards.length) {
      db.scratch.batch = null;
    } else {
      sb.id = String(sb.id || '');
      sb.at = Number(sb.at) || Date.now();
      sb.date = String(sb.date || E.todayKey());
      sb.count = Math.min(5, Math.max(1, Number(sb.count) || sb.cards.length));
      sb.cards = sb.cards.slice(0, 5).map(function (c) {
        return {
          date: String((c && c.date) || ''), source: String((c && c.source) || 'daily'),
          ticketId: String((c && c.ticketId) || ''), revealed: !!(c && c.revealed),
          tier: c && c.tier ? String(c.tier) : null,
          reward: c && c.reward && typeof c.reward === 'object' ? c.reward : null
        };
      });
      sb.settled = !!sb.settled;
      sb.results = Array.isArray(sb.results) ? sb.results : null;
      sb.counts = sb.counts && typeof sb.counts === 'object' ? sb.counts : null;
      sb.summary = String(sb.summary || '');
    }
    if (!db.scratch.weeklyKcal || typeof db.scratch.weeklyKcal !== 'object') db.scratch.weeklyKcal = {};
    if (!db.scratch.pass || typeof db.scratch.pass !== 'object') db.scratch.pass = { week: '', used: false };
    if (!db.cheatDays || typeof db.cheatDays !== 'object') db.cheatDays = { history: [] };
    if (!Array.isArray(db.cheatDays.history)) db.cheatDays.history = [];
    if (!Array.isArray(db.leaveDays)) db.leaveDays = [];
    if (!Array.isArray(db.wishlist)) db.wishlist = [];
    if (!db.skins || typeof db.skins !== 'object') db.skins = { active: 'paper', unlocked: ['paper', 'kraft'], unlockedCos: [] };
    if (!Array.isArray(db.skins.unlocked)) db.skins.unlocked = ['paper', 'kraft'];
    if (!Array.isArray(db.skins.unlockedCos)) db.skins.unlockedCos = [];
    if (!db.skins.packs || typeof db.skins.packs !== 'object') db.skins.packs = {};
    if (!db.skins.active) db.skins.active = 'paper';
    if (typeof db.skins.stamp !== 'string') db.skins.stamp = 'seal-red';
    if (typeof db.skins.texture !== 'string') db.skins.texture = 'fiber';
    if (typeof db.skins.bookmark !== 'string') db.skins.bookmark = '';
    if (typeof db.skins.signature !== 'string') db.skins.signature = '';
    if (typeof db.skins.font !== 'string') db.skins.font = '';
    if (typeof db.skins.scratchArt !== 'string') db.skins.scratchArt = 'cloth';
    if (typeof db.skins.fxTheme !== 'string') db.skins.fxTheme = '';
    if (typeof db.skins.cover !== 'string') db.skins.cover = 'default';
    if (!db.collect || typeof db.collect !== 'object') db.collect = { quotes: [], eggs: [], medals: [] };
    ['quotes', 'eggs', 'medals'].forEach(k => { if (!Array.isArray(db.collect[k])) db.collect[k] = []; });
    if (!db.codex || typeof db.codex !== 'object') db.codex = { lit: [] };
    if (!Array.isArray(db.codex.lit)) db.codex.lit = [];
    if (!db.bank || typeof db.bank !== 'object') db.bank = { loans: [], waivers: { free: 0, extra: 0 } };
    if (!Array.isArray(db.bank.loans)) db.bank.loans = [];
    if (!db.bank.waivers || typeof db.bank.waivers !== 'object') db.bank.waivers = { free: 0, extra: 0 };
    db.bank.waivers.free = Math.max(0, Number(db.bank.waivers.free) || 0);
    db.bank.waivers.extra = Math.max(0, Number(db.bank.waivers.extra) || 0);
    if (!db.credit || typeof db.credit !== 'object') db.credit = { events: [], certificates: [], meta: {} };
    if (!Array.isArray(db.credit.events)) db.credit.events = [];
    if (!Array.isArray(db.credit.certificates)) db.credit.certificates = [];
    if (!db.credit.meta || typeof db.credit.meta !== 'object') db.credit.meta = {};
    db.credit.events = db.credit.events.filter(e => e && e.date && Number(e.amount) > 0).map(e => ({
      id: String(e.id || 'crd-' + e.date), date: String(e.date), amount: Math.max(0, Math.round(Number(e.amount) || 0)),
      days: clamp(Math.round(Number(e.days) || 3), 3, 7), daily: Math.max(1, Math.round(Number(e.daily) || 1)),
      start: String(e.start || ''), paid: Math.max(0, Math.round(Number(e.paid) || 0)),
      remain: Math.max(0, Math.round(Number(e.remain) || 0)), plan: Array.isArray(e.plan) ? e.plan : [],
      schedule: Array.isArray(e.schedule) ? e.schedule : [], createdAt: Number(e.createdAt) || 0
    }));
    db.credit.certificates = db.credit.certificates.filter(c => c && c.date).map(c => ({
      id: String(c.id || 'cert-' + c.date), date: String(c.date), total: Math.max(0, Math.round(Number(c.total) || 0)),
      days: Math.max(1, Math.round(Number(c.days) || 1)), periods: Math.max(1, Math.round(Number(c.periods) || 1))
    }));
    if (!Array.isArray(db.revive)) db.revive = [];
    if (!db.pantry || typeof db.pantry !== 'object') db.pantry = { items: [], ops: [], hintDate: '' };
    if (!Array.isArray(db.pantry.items)) db.pantry.items = [];
    if (!Array.isArray(db.pantry.ops)) db.pantry.ops = [];
    db.pantry.hintDate = String(db.pantry.hintDate || '');
    db.pantry.items = db.pantry.items.filter(x => x && String(x.name || '').trim()).map(x => ({
      id: String(x.id || uid()), name: String(x.name || '').trim(), unit: String(x.unit || 'g'),
      qty: Math.max(0, Number(x.qty) || 0), expire: String(x.expire || ''),
      updatedAt: Number(x.updatedAt) || 0
    })).filter(x => x.qty > 0);
    db.pantry.ops = db.pantry.ops.filter(x => x && String(x.name || '').trim()).map(x => ({
      id: String(x.id || uid()), at: Number(x.at) || Date.now(), date: String(x.date || ''),
      entryId: String(x.entryId || ''), meal: String(x.meal || ''), name: String(x.name || '').trim(),
      unit: String(x.unit || 'g'), delta: Number(x.delta) || 0, kind: String(x.kind || 'add'),
      note: String(x.note || ''), expire: String(x.expire || '')
    })).slice(-500);
    if (!db.tasks || typeof db.tasks !== 'object') db.tasks = { date: '', list: [] };
    if (!Array.isArray(db.tasks.list)) db.tasks.list = [];
    if (!db.anti || typeof db.anti !== 'object') db.anti = { since: 0, lastPrompt: 0, date: '' };
    if (!db.cycle || typeof db.cycle !== 'object') db.cycle = Object.assign({}, DEFAULT_DB.cycle);
    db.cycle = Object.assign({}, DEFAULT_DB.cycle, db.cycle);
    if (!Array.isArray(db.cycle.history)) db.cycle.history = [];
    db.entries.forEach(e => {
      if (!e.id) e.id = uid();
      if (!e.date && e.dateKey) e.date = e.dateKey;
      if (!e.conf) e.conf = e.source === 'ai' ? 'low' : (e.source === 'manual' || e.source === 'custom') ? 'high' : 'med';
    });
    db.weights = db.weights.map(w => ({ date: w.date || w.dateKey, kg: Number(w.kg != null ? w.kg : w.weight) })).filter(w => w.date && w.kg > 0);
    db.measures = db.measures.map(m => ({ id: m.id || uid(), date: m.date || m.dateKey, waist: Number(m.waist) || 0, hip: Number(m.hip) || 0, thigh: Number(m.thigh) || 0, note: m.note || '' })).filter(m => m.date);
    db.checkins = db.checkins.map(c => ({ id: c.id || uid(), date: c.date || c.dateKey, hunger: Number(c.hunger) || 3, craving: Number(c.craving) || 3, mood: Number(c.mood) || 3, symptoms: Array.isArray(c.symptoms) ? c.symptoms : [], note: c.note || '' })).filter(c => c.date);
    db.supplements = db.supplements.map(s => ({ id: s.id || uid(), date: s.date || s.dateKey, name: s.name || '', iron: Number(s.iron) || 0, calcium: Number(s.calcium) || 0, note: s.note || '' })).filter(s => s.date && s.name);
    if (db.profile && (!db.profile.sex || !Number(db.profile.age) || !Number(db.profile.height) || !Number(db.profile.weight))) {
      db.profile = null;
      db.onboarded = false;
    }
    return db;
  }

  let DB;
  let MAINT_MODE = false;
  let REAL_DB = null;
  let storageOK = true;
  function maintOn() { return !!(MAINT_MODE && window.Maintenance); }
  function activeKey() { return maintOn() ? window.Maintenance.key : KEY; }
  function loadDBFrom(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return normalizeDB({});
      return normalizeDB(JSON.parse(raw));
    } catch (err) {
      storageOK = false;
      console.warn('[账本] 本地存储不可用', err);
      return normalizeDB({});
    }
  }
  function loadDB() {
    return loadDBFrom(KEY);
  }
  function probeStorage() {
    try {
      localStorage.setItem(KEY + '.probe', '1');
      localStorage.removeItem(KEY + '.probe');
      return true;
    } catch (err) {
      return false;
    }
  }
  function paintStorageBanner() {
    let el = document.getElementById('storageBanner');
    if (storageOK) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'storageBanner';
      el.className = 'storage-banner';
      el.setAttribute('role', 'alert');
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>本地存储写入失败：新记录可能不会保存。请先在设置里导出备份，再清理浏览器空间。</span>' +
      '<button class="btn-quiet tiny" data-act="open-settings">去设置</button>';
  }
  function saveDB(silent) {
    try {
      localStorage.setItem(activeKey(), JSON.stringify(DB));
      storageOK = true;
      /* 记录一有变化就标记重算；信用卡不允许只存结果 */
      try {
        const sig = creditSig();
        if (sig !== CREDIT_SIG) { CREDIT_SIG = sig; CREDIT_DIRTY = true; }
      } catch (e) { CREDIT_DIRTY = true; }
      paintStorageBanner();
      return true;
    } catch (err) {
      storageOK = false;
      paintStorageBanner();
      if (!silent) toast('保存失败：本地存储空间不足或被浏览器限制');
      return false;
    }
  }
  // 用户清理空间后切回页面时自动复检，避免“写入失败”提示一直挂着
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    const ok = probeStorage();
    if (ok !== storageOK) {
      storageOK = ok;
      paintStorageBanner();
    }
  });
  function commit(revert) {
    if (saveDB(true)) return true;
    if (revert) revert();
    toast('保存失败：新记录没有写入。请先导出备份，清理空间后再试');
    return false;
  }
  /* 可选维护模块的宿主桥：公开构建不加载维护模块，桥本身不含任何口令或密钥 */
  window.__ledgerHost = {
    db: function () { return DB; },
    loadFrom: loadDBFrom,
    save: function () { return saveDB(true); },
    enterMaint: function (nextDB) { REAL_DB = DB; MAINT_MODE = true; DB = nextDB; },
    exitMaint: function () {
      saveDB(true);
      MAINT_MODE = false;
      DB = REAL_DB || loadDBFrom(KEY);
      REAL_DB = null;
    },
    isMaint: maintOn,
    repaint: function () { applySkins(); renderActive(); },
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet,
    sheetHead: sheetHead,
    today: function () { return E.todayKey(); }
  };
  DB = loadDB();
  storageOK = storageOK && probeStorage();
  paintStorageBanner();

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
    document.documentElement.setAttribute('data-gentle', DB.settings.gentle ? '1' : '0');
    applySkinThemeColor();
  }
  /* v5.3：theme-color 跟随当前皮肤——直接读 html 上生效的 --paper 计算值，
     深色主题、极昼极夜的时段档、a-polar 夜间翻转全部自动正确 */
  function applySkinThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    let color = resolvedTheme() === 'dark' ? '#121714' : '#EFECE2';
    if (isFull()) {
      const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
      if (/^#[0-9a-fA-F]{6}$/.test(paper)) color = paper;
    }
    meta.setAttribute('content', color);
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
    sheetData: null,
    coach: null,
    coachBusy: false,
    coachLast: null,
    photos: null,
    weekCard: null,
    batch: null,
    creditOpen: false,
    tripFilter: 'all',
    globe: null,
    steps: null,
    importRes: null,
    motionBound: false,
    /* v5.2 热力图视图：year = 近一年 53 周；month = 单月网格 */
    heatView: 'year',
    heatMonth: ''
  };

  function setTab(tab) {
    state.tab = tab;
    $$('.rail-nav button, .tabbar button').forEach(b => {
      b.classList.toggle('on', b.dataset.tab === tab);
      /* aria-current 跟随激活页，读屏器不再把六个空按钮都当"当前页" */
      if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $$('.view').forEach(v => { v.hidden = v.dataset.view !== tab; });
    renderActive();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  /* 账本模式唯一判断点：ledger 只隐藏界面、停后台任务，不删任何数据 */
  function isFull() {
    return (DB && DB.settings && DB.settings.mode) === 'full';
  }
  /* 长辈模式：只改界面与动效，数据与账本模式互不影响 */
  function applyElder() {
    const on = !!(DB.settings && DB.settings.elder);
    document.documentElement.setAttribute('data-elder', on ? '1' : '0');
    if (on && window.SkinFX) SkinFX.stop();
  }
  function applyModeChrome() {
    const mode = isFull() ? 'full' : 'ledger';
    const elder = !!(DB.settings && DB.settings.elder);
    document.documentElement.setAttribute('data-mode', mode);
    $$('.rail-nav button, .tabbar button').forEach(b => {
      const ledgerHide = mode === 'ledger' && (b.dataset.tab === 'trend' || b.dataset.tab === 'body' || b.dataset.tab === 'trip');
      /* 长辈模式：导航精简为 今日 / 账本 / 设置 */
      const elderHide = elder && ['today', 'ledger', 'settings'].indexOf(b.dataset.tab) < 0;
      b.hidden = ledgerHide || elderHide;
    });
    if ((mode === 'ledger' || elder) && ['trend', 'body', 'trip'].indexOf(state.tab) >= 0) state.tab = 'today';
  }
  function renderActive() {
    if (state.tab !== 'trip' && state.globe && state.globe.destroy) { state.globe.destroy(); state.globe = null; }
    const elder = !!(DB.settings && DB.settings.elder);
    if ((!isFull() || elder) && (state.tab === 'trend' || state.tab === 'body' || state.tab === 'trip')) state.tab = 'today';
    if (state.tab === 'today') renderToday();
    else if (state.tab === 'ledger') renderLedger();
    else if (state.tab === 'trend') renderTrend();
    else if (state.tab === 'body') renderBody();
    else if (state.tab === 'trip') renderTrip();
    else if (state.tab === 'settings') renderSettings();
    updateRail();
  }
  function updateRail() {
    const today = E.todayKey();
    const st = DB.profile ? streakNow() : E.streak(DB.entries, today);
    const rs = $('#railStreak');
    if (rs) rs.textContent = st;
    const ts = $('#topStreak');
    if (ts) ts.textContent = st > 0 ? '连续达标 ' + st + ' 天' : (DB.onboarded ? '从今天开始' : '尚未开始');
    const td = $('#topDate');
    if (td) td.textContent = E.dateLabel(today) + ' 周' + E.weekday(today);
  }

  /* ============================================================
     派生数据
     ============================================================ */
  function allFoods() {
    return W.filterFoods(E.FOODS.concat(DB.foods || []), DB.settings.prefs);
  }
  function currentWeight() {
    const w = E.latestWeight(DB.weights, DB.profile);
    return w ? w.kg : (DB.profile && DB.profile.weight) || 65;
  }
  function targetsNow() {
    if (!DB.profile) return null;
    return E.targets(DB.profile, currentWeight());
  }
  function snapshotRaw(dateKey) {
    const t = targetsNow();
    if (!t) return null;
    const day = dateKey || E.todayKey();
    const gp = G.of(DB.profile);
    const cycleActive = !!(DB.cycle && DB.cycle.enabled && gp.cycleEnabled);
    const weightFeed = cycleActive ? W.filterWeights(DB.weights, DB.cycle) : { weights: DB.weights, excluded: 0 };
    const ad = E.adaptive(DB.entries, weightFeed.weights, DB.profile, t, day);
    const appliedKcal = creditApplied(day);
    const cheat = cheatActive(day);
    const borrow = bankBorrow(day);
    const repay = bankRepay(day);
    const sum = E.summary(DB.entries, day);
    const burned = E.burnedByDate(DB.exercises, day);
    return {
      t, ad, sum, burned, day, cycleExcluded: weightFeed.excluded,
      appliedKcal, cheat, borrow, repay, baseBudget: ad.budget
    };
  }
  /* 信用卡只影响 full 模式；ledger 仍按 baseBudget 原样展示，不扣欠款 */
  function snapshot(dateKey) {
    const raw = snapshotRaw(dateKey);
    if (!raw) return null;
    const credit = isFull() ? creditEnsure(true) : null;
    const crRepay = credit ? (Number((credit.schedByDate || credit.repayByDate)[raw.day]) || 0) : 0;
    let budget = raw.baseBudget + raw.appliedKcal + raw.borrow - raw.repay - crRepay;
    if (raw.cheat) budget = Math.round(budget * 1.15);
    const creditInfo = credit ? {
      debt: credit.debt, repay: crRepay,
      surplus: Number(credit.surplusByDate[raw.day]) || 0,
      capHit: credit.capByDate[raw.day] || null,
      base: raw.baseBudget, floor: credit.floor, cap: credit.cap,
      certToday: (credit.certificates || []).find(c => c.date === raw.day) || null
    } : null;
    return Object.assign({}, raw, { budget: budget, remain: budget - raw.sum.kcal, credit: creditInfo });
  }

  /* ============================================================
     热量信用卡：欠款与分期全部由 entries 逐日重算
     规则：额度 = 当日 baseBudget；欠款从次日开始还；还款不破 BMR×0.8；
     盈余 ≥50 kcal 直接抵债；上限 = baseBudget×0.6×7；归零当天出一张凭证。
     ============================================================ */
  let CREDIT_DIRTY = true;
  let CREDIT_SIG = '';
  let CREDIT_CACHE = null;
  let CREDIT_SAVING = false;

  function creditSig() {
    if (!DB) return '';
    let h = 2166136261;
    const push = s => {
      s = String(s == null ? '' : s);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    };
    push(DB.settings && DB.settings.mode);
    push(E.todayKey());
    if (DB.profile) {
      const p = DB.profile;
      push([p.sex, p.age, p.height, p.weight, p.activity, p.goal, p.rate, p.targetWeight].join(','));
    }
    const es = DB.entries || [];
    push('E' + es.length);
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      push((e.date || '') + ':' + Math.round(Number(e.kcal) || 0));
    }
    const ws = DB.weights || [];
    push('W' + ws.length);
    for (let i = Math.max(0, ws.length - 7); i < ws.length; i++) {
      const w = ws[i] || {};
      push((w.date || '') + ':' + (w.kg || ''));
    }
    return String(h);
  }
  function creditEmpty() {
    return {
      debt: 0, repayToday: 0, schedByDate: {}, repayByDate: {}, surplusByDate: {}, capByDate: {},
      events: [], certificates: [], floor: 0, cap: 0, base: 0, bmr: 0, changed: false
    };
  }
  function creditFutureRows(ev, today) {
    const out = [];
    let rem = Math.max(0, Number(ev.remain) || 0);
    let d = E.addDays(today, 1);
    let guard = 0;
    while (ev.remain > 0 && rem > 0 && guard++ < 14) {
      const amt = Math.min(rem, Math.max(1, Number(ev.daily) || 1));
      out.push({ date: d, amount: amt, status: 'pending' });
      rem -= amt;
      d = E.addDays(d, 1);
    }
    return out;
  }
  function creditSimulate() {
    const today = E.todayKey();
    const t = targetsNow();
    if (!DB.profile || !t) return creditEmpty();
    const bmr = Number(t.bmr) || 0;
    const floor = Math.round(bmr * 0.8);
    let start = E.addDays(today, -30);
    (DB.entries || []).forEach(e => { if (e.date && e.date < start) start = e.date; });
    const minStart = E.addDays(today, -180);
    if (start < minStart) start = minStart;
    if (start > today) start = today;

    const events = [];
    const certificates = [];
    const schedByDate = {}, repayByDate = {}, surplusByDate = {}, capByDate = {};
    let cycle = null;
    const debtNow = () => events.reduce((s, e) => s + Math.max(0, e.remain), 0);
    const rounds = list => {
      const seen = {};
      list.forEach(ev => (ev.schedule || []).forEach(r => { if (r.amount > 0) seen[r.date] = 1; }));
      return Object.keys(seen).length;
    };

    let d = start;
    let guard = 0;
    while (d <= today && guard++ < 400) {
      const raw = snapshotRaw(d);
      const base = Math.max(1, Math.round(raw ? raw.baseBudget : 1));
      const intake = Math.round(raw ? raw.sum.kcal : 0);
      const isToday = d === today;

      /* 1) 还款：有 ≥50 kcal 盈余时用盈余抵债（不重复扣当天分期）；
            否则按分期扣，到地板即停，剩余顺延。 */
      let maxRepay = Math.max(0, base - floor);
      let paidSched = 0;
      let surplusPaid = 0;
      const surplusPre = base - intake;
      if (!(isToday && intake === 0) && surplusPre >= 50 && debtNow() > 0 && maxRepay > 0) {
        let left = Math.min(surplusPre, debtNow(), maxRepay);
        events.forEach(ev => {
          if (left <= 0 || ev.remain <= 0) return;
          const use = Math.min(ev.remain, left);
          ev.remain -= use;
          ev.paid += use;
          left -= use;
          surplusPaid += use;
          ev.schedule.push({ date: d, due: use, amount: use, status: 'surplus' });
        });
        if (surplusPaid > 0) surplusByDate[d] = surplusPaid;
        paidSched = surplusPaid;
      } else {
        events.forEach(ev => {
          if (ev.remain <= 0 || d < ev.start) return;
          const want = Math.min(ev.remain, Math.max(1, ev.daily));
          const pay = Math.max(0, Math.min(want, maxRepay));
          maxRepay -= pay;
          if (pay > 0) {
            ev.paid += pay;
            ev.remain -= pay;
            paidSched += pay;
            ev.schedule.push({ date: d, due: want, amount: pay, status: pay >= want ? 'paid' : 'partial' });
          } else {
            ev.schedule.push({ date: d, due: want, amount: 0, status: 'deferred' });
          }
        });
      }
      /* 3) 当日超支：只和当日 baseBudget 比（分期还款本身不制造新欠款），封顶 base×0.6×7 */
      const cap = Math.round(base * 0.6 * 7);
      const over = intake - base;
      let added = 0;
      if (over > 0) {
        const allow = Math.max(0, cap - debtNow());
        if (over > allow) capByDate[d] = { over: Math.round(over), allowed: Math.round(allow), cap: cap, base: base };
        const amount = Math.min(Math.round(over), allow);
        if (amount > 0) {
          const days = clamp(Math.ceil(amount / Math.max(1, base * 0.15)), 3, 7);
          const daily = Math.ceil(amount / days);
          const ev = {
            id: 'crd-' + d, date: d, amount: amount, days: days, daily: daily,
            start: E.addDays(d, 1), paid: 0, remain: amount,
            plan: [], schedule: [], createdAt: Date.now()
          };
          let rem = amount;
          for (let i = 0; i < days; i++) {
            const amt = i === days - 1 ? rem : Math.min(daily, rem);
            ev.plan.push({ date: E.addDays(ev.start, i), amount: amt });
            rem -= amt;
          }
          events.push(ev);
          added = amount;
          if (!cycle) cycle = { start: d, total: 0, periods: 0 };
          cycle.total += amount;
          cycle.periods = Math.max(cycle.periods || 0, days);
        }
      }
      if (paidSched > 0) schedByDate[d] = paidSched;
      if (paidSched > 0 || surplusPaid > 0) repayByDate[d] = paidSched + surplusPaid;

      /* 4) 归零当天生成结清凭证：同一天只发一张，重复结算不重复发 */
      if (debtNow() === 0 && cycle) {
        if (!certificates.some(c => c.date === d)) {
          certificates.push({
            id: 'cert-' + d, date: d, total: Math.round(cycle.total),
            days: Math.max(1, rounds(events.filter(ev => ev.date >= cycle.start))), periods: Math.max(1, cycle.periods || 1)
          });
        }
        cycle = null;
      }
      d = E.addDays(d, 1);
    }

    const debt = debtNow();
    const eventsOut = events.map(ev => {
      const future = ev.remain > 0 ? creditFutureRows(ev, today) : [];
      const sched = (ev.schedule || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).concat(future);
      return Object.assign({}, ev, { schedule: sched });
    });
    return {
      debt: debt, repayToday: (schedByDate[today] || 0), schedByDate: schedByDate,
      repayByDate: repayByDate, surplusByDate: surplusByDate,
      capByDate: capByDate, events: eventsOut, certificates: certificates,
      floor: floor, cap: Math.round(Math.max(1, (snapshotRaw(today) || {}).baseBudget || 1) * 0.6 * 7),
      base: Math.round((snapshotRaw(today) || {}).baseBudget || 0), bmr: bmr, changed: false
    };
  }
  function creditEnsure(persist) {
    const today = E.todayKey();
    if (!CREDIT_DIRTY && CREDIT_CACHE && CREDIT_CACHE.today === today) return CREDIT_CACHE;
    const res = creditSimulate();
    const prev = DB.credit.meta || {};
    res.changed = Number(prev.debt) !== res.debt || Number(prev.events) !== res.events.length || Number(prev.certs) !== res.certificates.length;
    DB.credit.events = res.events;
    DB.credit.certificates = res.certificates;
    DB.credit.meta = {
      debt: res.debt, events: res.events.length, certs: res.certificates.length,
      at: Date.now(), date: today, base: res.base, bmr: res.bmr, floor: res.floor, cap: res.cap
    };
    res.today = today;
    CREDIT_CACHE = res;
    CREDIT_DIRTY = false;
    if (persist !== false && !CREDIT_SAVING) {
      CREDIT_SAVING = true;
      saveDB(true);
      CREDIT_SAVING = false;
    }
    return res;
  }
  function creditStored() {
    if (CREDIT_CACHE && CREDIT_CACHE.today === E.todayKey()) return CREDIT_CACHE;
    const m = DB.credit.meta || {};
    return {
      debt: Math.round(Number(m.debt) || 0), repayToday: 0, schedByDate: {}, repayByDate: {}, surplusByDate: {}, capByDate: {},
      events: DB.credit.events || [], certificates: DB.credit.certificates || [],
      floor: Math.round(Number(m.floor) || 0), cap: Math.round(Number(m.cap) || 0),
      base: Math.round(Number(m.base) || 0), bmr: Math.round(Number(m.bmr) || 0), changed: false
    };
  }
  function dayStart(key) {
    const p = key.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function weekStart(key) {
    const d = dayStart(key);
    const w = d.getDay();
    return E.addDays(key, -((w + 6) % 7));
  }
  function weekEnd(key) {
    return E.addDays(weekStart(key), 6);
  }
  function cheatActive(key) {
    return (DB.cheatDays.history || []).some(h => h.date === key);
  }
  function cheatUsedWeek(key) {
    const a = weekStart(key), b = weekEnd(key);
    return (DB.cheatDays.history || []).filter(h => h.date >= a && h.date <= b).length;
  }
  function creditApplied(key) {
    return (DB.wallet.applied || []).filter(x => x.date === key).reduce((s, x) => s + (Number(x.kcal) || 0), 0);
  }
  function bankBorrow(key) {
    return (DB.bank.loans || []).filter(l => l.date === key).reduce((s, l) => s + (Number(l.amount) || 0), 0);
  }
  function bankRepay(key) {
    return (DB.bank.loans || []).filter(l => l.due === key).reduce((s, l) => s + (Number(l.repay) || 0), 0);
  }
  function bankActive() {
    const today = E.todayKey();
    return (DB.bank.loans || []).find(l => l.due >= today) || null;
  }
  function creditUsable(key) {
    const today = key || E.todayKey();
    return (DB.wallet.credits || []).filter(c => !c.used && (!c.expire || c.expire >= today));
  }
  /* 过期额度券：当日券在当天结束时仍有效，次日自动失效并提示 */
  function expireCredits(silent) {
    const today = E.todayKey();
    const keep = [];
    let n = 0;
    (DB.wallet.credits || []).forEach(c => {
      if (!c.used && c.expire && c.expire < today) { n++; return; }
      keep.push(c);
    });
    if (n) {
      DB.wallet.credits = keep;
      saveDB(true);
      if (!silent) toast(n + ' 张弹性额度已过期失效');
    }
    return n;
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
  /* ============================================================
     v3.1 · 变更日志 / 撤销 / 运行统计 / 安全护栏
     ============================================================ */
  function logChange(text, undo) {
    if (!Array.isArray(DB.logs)) DB.logs = [];
    DB.logs.unshift({ id: uid(), at: Date.now(), text: text, undo: undo || null });
    DB.logs = DB.logs.slice(0, 30);
    saveDB(true);
  }

  function lastUndoable() {
    return (DB.logs || []).filter(x => x.undo)[0] || null;
  }

  function logTime(at) {
    const d = new Date(at || Date.now());
    const p = n => (n < 10 ? '0' : '') + n;
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function undoLast() {
    const item = lastUndoable();
    if (!item) { toast('没有可撤销的操作'); return; }
    const u = item.undo;
    if (u.kind === 'entry') DB.entries.push(u.item);
    else if (u.kind === 'entry-edit') {
      const idx = DB.entries.findIndex(x => x.id === u.item.id);
      if (idx > -1) DB.entries[idx] = u.item; else DB.entries.push(u.item);
    }
    else if (u.kind === 'exercise') DB.exercises.push(u.item);
    else if (u.kind === 'supplement') DB.supplements.push(u.item);
    else if (u.kind === 'measure') DB.measures.push(u.item);
    else if (u.kind === 'food') DB.foods.push(u.item);
    else if (u.kind === 'combo') DB.combos.push(u.item);
    else if (u.kind === 'lift') DB.lifts.push(u.item);
    else if (u.kind === 'entry-add') DB.entries = DB.entries.filter(e => e.id !== u.item.id);
    else if (u.kind === 'batch') {
      const ids = new Set(u.items.map(x => x.id));
      DB.entries = DB.entries.filter(e => !ids.has(e.id));
    }
    else { toast('这条操作无法撤销'); return; }
    item.undo = null;
    item.text = item.text + '（已撤销）';
    saveDB();
    renderActive();
    toast('已撤销：' + item.text.replace('（已撤销）', ''));
  }

  function recordAI(ok, ms) {
    if (!DB.stats) DB.stats = { aiCalls: 0, aiOk: 0, aiFail: 0, aiMs: 0 };
    DB.stats.aiCalls += 1;
    if (ok) DB.stats.aiOk += 1; else DB.stats.aiFail += 1;
    DB.stats.aiMs += Math.max(0, ms || 0);
    saveDB(true);
  }

  function safetyGuard(st) {
    const today = E.todayKey();
    const items = [];
    if (!st || !st.t || !DB.profile) return items;
    const t = st.t;
    let lowStreak = 0;
    for (let i = 0; i < 3; i++) {
      const s = E.summary(DB.entries, E.addDays(today, -i));
      if (s.count === 0) { lowStreak = 0; break; }
      if (s.kcal < t.floor * 0.9) lowStreak += 1;
      else break;
    }
    if (lowStreak >= 3) {
      items.push({ tone: 'red', title: '连续 ' + lowStreak + ' 天低于安全下限', sub: '长期低于 ' + fmt(t.floor) + ' kcal 会影响恢复与代谢。如果是有意控制，请把下限当底线。' });
    }
    if (st.ad && Number(st.ad.slope) < -0.013 && (st.ad.weightDays || 0) >= 4) {
      const weekly = round1(Number(st.ad.slope) * 7);
      const pctW = DB.profile.weight ? Math.abs(weekly) / DB.profile.weight * 100 : 0;
      if (pctW > 1.1) {
        items.push({ tone: 'amber', title: '体重下降偏快', sub: '近 7 天约 ' + weekly + ' kg（约 ' + round1(pctW) + '% 体重），可能是水分，也可能是缺口过大。' });
      }
    }
    const lw = E.latestWeight(DB.weights, DB.profile);
    if (DB.entries.length && (!lw || E.daysBetween(lw.date, today) > 9)) {
      items.push({ tone: 'amber', title: '超过 9 天没有称重', sub: '趋势校准需要体重样本；同一时间、空腹称一次就够。', act: 'open-weight' });
    }
    const from = E.addDays(today, -6);
    const dayP = {};
    DB.entries.forEach(e => {
      if (e.date >= from && e.date <= today) dayP[e.date] = (dayP[e.date] || 0) + (Number(e.p) || 0);
    });
    const days = Object.keys(dayP);
    if (days.length >= 4 && t.protein > 0) {
      const avgP = days.reduce((s, k) => s + dayP[k], 0) / days.length;
      if (avgP < t.protein * 0.65) {
        items.push({ tone: 'amber', title: '蛋白质连续偏低', sub: '近 ' + days.length + ' 天平均 ' + Math.round(avgP) + 'g / 目标 ' + t.protein + 'g。蛋白质不足时，缺口更容易来自肌肉。' });
      }
    }
    return items.slice(0, 3);
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
      cat: String(food.catName || food.catLabel || '未分类'),
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
     月度账页
     ============================================================ */
  function monthStats(key) {
    const list = DB.entries.filter(e => e.date && e.date.slice(0, 7) === key);
    const byDay = {};
    const byCat = {};
    let total = 0;
    list.forEach(e => {
      total += Number(e.kcal) || 0;
      byDay[e.date] = (byDay[e.date] || 0) + (Number(e.kcal) || 0);
      const cat = e.cat || '未分类';
      byCat[cat] = (byCat[cat] || 0) + (Number(e.kcal) || 0);
    });
    const days = Object.keys(byDay);
    const budget = (() => {
      const st = snapshot(E.todayKey());
      return st ? st.budget : 0;
    })();
    return {
      key: key, list: list, total: total, byDay: byDay, byCat: byCat,
      days: days.length, avg: days.length ? total / days.length : 0, budget: budget
    };
  }

  function shiftMonthKey(key, delta) {
    const p = key.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1 + delta, 1);
    return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1);
  }

  function lunarText(key) {
    try {
      const d = new Date(key + 'T12:00:00');
      return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(d);
    } catch (e) { return ''; }
  }

  function monthComment(mt) {
    if (!mt.days) return '这个月还没有记录。先从今天的一餐开始，月底这页就会有话说。';
    const avg = mt.avg;
    const bud = mt.budget;
    const diff = bud ? avg - bud : 0;
    const top = Object.keys(mt.byCat).sort((a, b) => mt.byCat[b] - mt.byCat[a])[0];
    const parts = [];
    parts.push('已记 ' + mt.days + ' 天，日均 ' + fmt(avg) + ' kcal');
    if (bud) {
      if (Math.abs(diff) <= bud * 0.05) parts.push('和单日预算基本对齐，节奏稳。');
      else if (diff > 0) parts.push('比单日预算高 ' + fmt(diff) + ' kcal，月底可以挑几天清淡些找回节奏。');
      else parts.push('比单日预算低 ' + fmt(-diff) + ' kcal，偏克制，注意别长期吃太少。');
    }
    if (top) parts.push('吃得最多的是「' + top + '」类，占 ' + fmt(mt.byCat[top]) + ' kcal。');
    if (mt.days >= 20) parts.push('记录覆盖了大部分日子，这份数据已经足够可信。');
    else if (mt.days >= 10) parts.push('记录过半，趋势开始有意义。');
    else parts.push('记录天数还少，结论先当参考，不必当真。');
    return parts.map(p => p.replace(/。$/, '')).join('；') + '。';
  }

  function monthBodyHtml() {
    const key = state.monthKey;
    const mt = monthStats(key);
    const p = key.split('-').map(Number);
    const y = p[0], m = p[1];
    const daysInMonth = new Date(y, m, 0).getDate();
    const startCol = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const cats = Object.keys(mt.byCat).sort((a, b) => mt.byCat[b] - mt.byCat[a]).slice(0, 5);
    const maxCat = cats.length ? mt.byCat[cats[0]] || 1 : 1;
    let cells = '';
    for (let i = 0; i < startCol; i++) cells += '<span class="mc-cell blank"></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = key + '-' + (d < 10 ? '0' : '') + d;
      const k = mt.byDay[dk] || 0;
      const cls = !k ? 'empty' : (mt.budget && k > mt.budget * 1.05 ? 'over' : 'good');
      cells += '<div class="mc-cell ' + cls + '" title="' + dk + ' · ' + (k ? fmt(k) + ' kcal' : '无记录') + '">' +
        '<span class="mc-d">' + d + '</span><span class="mc-dot"></span></div>';
    }
    const catRows = cats.length ? cats.map(c => {
      const v = mt.byCat[c];
      return '<div class="mcat-row"><span class="mcat-n">' + esc(c) + '</span><div class="mcat-bar"><span style="width:' + Math.round(v / maxCat * 100) + '%"></span></div><span class="mcat-v">' + fmt(v) + '</span></div>';
    }).join('') : '<div class="body-empty" style="padding:6px 0">这个月还没有分类数据。</div>';

    return '<div class="month-sheet" id="monthBody" data-key="' + key + '">' +
      '<div class="month-top">' +
        '<button class="month-arrow" data-act="month-prev" aria-label="上个月">‹</button>' +
        '<div class="month-title"><b>' + y + ' 年 ' + m + ' 月</b><span>第 ' + (m) + ' 页 · ' + daysInMonth + ' 天 · 已记 ' + mt.days + ' 天</span></div>' +
        '<button class="month-arrow" data-act="month-next" aria-label="下个月">›</button>' +
      '</div>' +
      '<div class="month-sum">' +
        '<div><span class="ms-n">' + fmt(mt.total) + '</span><span class="ms-l">本月摄入 kcal</span></div>' +
        '<div><span class="ms-n">' + mt.days + '</span><span class="ms-l">记账天数</span></div>' +
        '<div><span class="ms-n">' + fmt(mt.avg) + '</span><span class="ms-l">日均 kcal</span></div>' +
      '</div>' +
      '<div class="month-cal">' +
        ['一', '二', '三', '四', '五', '六', '日'].map(w => '<span class="mc-w">' + w + '</span>').join('') +
        cells +
      '</div>' +
      '<div class="month-cats"><div class="mc-title">分类占比</div>' + catRows + '</div>' +
      '<div class="month-comment"><div class="mc-c-head">本月评语</div><div class="mc-c-body">' + esc(monthComment(mt)) + '</div></div>' +
      '<div class="month-actions">' +
        '<button class="btn btn-primary" data-act="month-export">导出月度对账单</button>' +
        '<button class="btn btn-ghost" data-act="close-sheet">关闭</button>' +
      '</div>' +
      '<div class="tiny faint month-note">对账单为 PNG 图片，含每日摄入与分类合计；图片在本机生成，不上传。</div>' +
    '</div>';
  }

  function openMonthSheet() {
    if (!state.monthKey) state.monthKey = E.todayKey().slice(0, 7);
    openSheet(
      sheetHead('月度账页', '翻页查看 · 分类占比 · 可导出对账单') +
      '<div class="sheet-body">' + monthBodyHtml() + '</div>',
      'month'
    );
  }

  function paintMonth() {
    const host = $('#monthBody');
    if (!host) return;
    const wrap = host.parentNode;
    wrap.innerHTML = monthBodyHtml();
    const el = $('#monthBody');
    if (el) {
      el.classList.add('flip');
      setTimeout(() => el.classList.remove('flip'), 320);
    }
  }

  function exportMonthStatement() {
    const key = state.monthKey || E.todayKey().slice(0, 7);
    const mt = monthStats(key);
    const p = key.split('-').map(Number);
    const daysInMonth = new Date(p[0], p[1], 0).getDate();
    const W = 900, H = 250 + daysInMonth * 24 + 260;
    const cvs = document.createElement('canvas');
    cvs.width = W;
    cvs.height = H;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#FBF8EF';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(36,58,46,.08)';
    for (let yy = 120; yy < H; yy += 26) {
      ctx.beginPath(); ctx.moveTo(60, yy); ctx.lineTo(W - 60, yy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(151,70,58,.28)';
    ctx.beginPath(); ctx.moveTo(104, 40); ctx.lineTo(104, H - 40); ctx.stroke();
    ctx.fillStyle = '#233A2D';
    ctx.font = '30px "Kaiti SC", KaiTi, "STKaiti", serif';
    ctx.fillText('能量账本 · 月度对账单', 130, 92);
    ctx.font = '17px "Kaiti SC", KaiTi, "STKaiti", serif';
    ctx.fillStyle = '#5B6B60';
    ctx.fillText(p[0] + ' 年 ' + p[1] + ' 月 · 已记 ' + mt.days + ' 天 · 合计 ' + fmt(mt.total) + ' kcal · 日均 ' + fmt(mt.avg) + ' kcal', 130, 126);
    ctx.font = '15px "Kaiti SC", KaiTi, "STKaiti", serif';
    ctx.fillStyle = '#5B6B60';
    ctx.fillText('日期', 140, 166);
    ctx.fillText('笔数', 420, 166);
    ctx.fillText('摄入 kcal', 600, 166);
    ctx.fillText('相对预算', 760, 166);
    let y = 196;
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = key + '-' + (d < 10 ? '0' : '') + d;
      const list = mt.list.filter(e => e.date === dk);
      if (!list.length) continue;
      const kcal = mt.byDay[dk] || 0;
      ctx.fillStyle = '#233A2D';
      ctx.fillText(String(d), 140, y);
      ctx.fillText(String(list.length), 420, y);
      ctx.fillText(fmt(kcal), 600, y);
      const diff = mt.budget ? kcal - mt.budget : 0;
      ctx.fillStyle = diff > 0 ? '#9A4B3C' : '#3F7257';
      ctx.fillText((diff > 0 ? '+' : '') + fmt(diff), 760, y);
      y += 24;
    }
    const catY = y + 40;
    ctx.fillStyle = '#233A2D';
    ctx.font = '20px "Kaiti SC", KaiTi, "STKaiti", serif';
    ctx.fillText('分类合计', 130, catY);
    ctx.font = '16px "Kaiti SC", KaiTi, "STKaiti", serif';
    Object.keys(mt.byCat).sort((a, b) => mt.byCat[b] - mt.byCat[a]).slice(0, 6).forEach((c, i) => {
      const yy = catY + 30 + i * 26;
      ctx.fillStyle = '#233A2D';
      ctx.fillText(c, 140, yy);
      const barW = mt.total ? Math.round(mt.byCat[c] / mt.total * 520) : 0;
      ctx.fillStyle = 'rgba(63,114,87,.22)';
      ctx.fillRect(300, yy - 13, 520, 14);
      ctx.fillStyle = '#3F7257';
      ctx.fillRect(300, yy - 13, barW, 14);
      ctx.fillStyle = '#5B6B60';
      ctx.fillText(fmt(mt.byCat[c]), 846 - 40, yy);
    });
    ctx.fillStyle = '#7A8A7F';
    ctx.font = '13px "Kaiti SC", KaiTi, "STKaiti", serif';
    ctx.fillText('营养值为估算值，仅用于个人记录，不构成医疗建议。', 130, H - 54);
    cvs.toBlob(blob => {
      if (!blob) { toast('导出失败：浏览器不支持生成图片'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '能量账本-' + key + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      window.__LAST_EXPORT__ = { key: key, w: W, h: H, size: blob.size };
      toast('月度对账单已导出');
    }, 'image/png');
  }

  /* ============================================================
     离线提示
     ============================================================ */
  function paintOffline() {
    let el = document.getElementById('offlineChip');
    const off = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!off) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'offlineChip';
      el.className = 'offline-chip';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = '已离线 · 账本仍可用，数据保存在本机';
  }
  window.addEventListener('online', paintOffline);
  window.addEventListener('offline', paintOffline);


  /* ============================================================
     今日
     ============================================================ */
  function streakNow() {
    const today = E.todayKey();
    const skip = (DB.leaveDays || []).concat((DB.cheatDays.history || []).map(h => h.date));
    const cache = {};
    return E.streak(DB.entries, today, {
      skipDays: skip,
      okDay: function (d) {
        if (!cache[d]) cache[d] = snapshot(d);
        const s = cache[d];
        if (!s || s.sum.count === 0) return true;
        return s.cheat || s.sum.kcal <= s.budget * 1.05;
      }
    });
  }
  function renderMealPlanEntry(st) {
    const started = st.sum.count > 0;
    const gapP = Math.max(0, st.t.protein - st.sum.p);
    return '<section class="reco-entry' + (started ? '' : ' fresh') + '">' +
      '<div class="re-head"><span class="re-k">今天吃什么</span><span class="re-tag">三餐推荐</span></div>' +
      '<div class="re-title">' + (started ? '接下来怎么吃，已经替你搭好' : '一人三餐，按你的预算搭好') + '</div>' +
      '<div class="re-sub">早 · 午 · 晚 · 每餐 5 套以上 · 每套 3–5 道 · 合计热量与蛋白</div>' +
      '<div class="re-meta"><span>剩余 ' + fmt(Math.max(0, st.remain)) + ' kcal</span><span>蛋白缺口 ' + round1(gapP) + 'g</span><span>规则组合 · 估算值</span></div>' +
      '<div class="re-actions"><button class="btn btn-primary" data-act="open-reco">看看今天吃什么</button>' +
        '<button class="btn btn-ghost" data-act="open-reco" data-random="1">随便来一套</button></div>' +
    '</section>';
  }
  function renderPerks(st) {
    const today = E.todayKey();
    const credit = creditUsable(today);
    const leave = (DB.leaveDays || []).indexOf(today) >= 0;
    return renderRewardEntry() +
      '<section class="perk-row">' +
      '<button class="perk-chip" data-act="open-wallet">' + icon('book') + '<span>福利钱包' + (credit.length ? ' · ' + credit.length + ' 张额度' : '') + '</span></button>' +
      (st.cheat ? '<span class="perk-chip on">放纵日已批准 · +15%</span>' : (leave ? '<span class="perk-chip">今日请假条 · 已标灰</span>' : '')) +
    '</section>';
  }
  /* ============================================================
     运动环游记（full 模式；ledger 只在首页留一行摘要）
     ============================================================ */
  let tripLoading = null;
  let globeLoading = null;
  /* v5.3 通用懒加载：可分离模块（兑换码 / 公告 / 维护）不再进首屏关键路径 */
  const SCRIPT_LOADS = {};
  function ensureScript(src) {
    if (SCRIPT_LOADS[src]) return SCRIPT_LOADS[src];
    SCRIPT_LOADS[src] = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(true);
      s.onerror = () => { delete SCRIPT_LOADS[src]; resolve(false); };
      document.head.appendChild(s);
    });
    return SCRIPT_LOADS[src];
  }
  function verUrl(path) { return path + '?v=' + (window.__EL_VER || APP_VERSION); }
  function ensureCodes() {
    if (window.ELCodes) return Promise.resolve(true);
    return ensureScript(verUrl('assets/codes.js'));
  }
  function ensureAnnounce() {
    if (window.ELAnnounce) return Promise.resolve(true);
    return ensureScript(verUrl('assets/announce.js'));
  }
  function ensureMaint() {
    if (window.Maintenance) return Promise.resolve(true);
    return ensureScript(verUrl('assets/maint-credential.js'))
      .then(() => ensureScript(verUrl('assets/maint.js')));
  }
  /* 按需加载换算模块：ledger 首页不请求 trip.js */
  function ensureTrip() {
    if (window.Trip) return Promise.resolve(true);
    if (tripLoading) return tripLoading;
    tripLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = verUrl('assets/trip.js');
      s.onload = () => resolve(!!window.Trip);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    }).then(ok => { tripLoading = null; return ok; });
    return tripLoading;
  }
  /* 地球渲染器与海岸线数据都只在环游记页面按需加载（ledger 模式 0 请求） */
  function ensureGlobe() {
    if (window.Globe) return Promise.resolve(true);
    if (globeLoading) return globeLoading;
    globeLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = verUrl('assets/globe.js');
      s.onload = () => resolve(!!window.Globe);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    }).then(ok => { globeLoading = null; return ok; });
    return globeLoading;
  }
  function mountTripGlobe(km) {
    const cv = $('#trkGlobe');
    if (!cv) return;
    ensureGlobe().then(ok => {
      if (!ok || !$('#trkGlobe')) return;
      if (state.globe && state.globe.destroy) state.globe.destroy();
      state.globe = Globe.mount(cv, {
        km: km,
        rot: 0.6,
        stations: Trip.LANDMARKS,
        reduced: prefersReduced(),
        powerSave: !!DB.settings.powerSave
      });
      /* 验收用的只读观测钩子（与 __v5 / __v43 同类，不写数据） */
      window.__v51 = window.__v51 || {};
      window.__v51.globeStats = () => (state.globe ? state.globe.stats() : null);
      window.__v51.globeLive = () => !!state.globe;
    });
  }
  /* 单条记录"计入环游记"的等效里程：含可信度倍率，仅存档/存疑记 0 */
  function recKmEq(x) {
    if (!x || x.valid === false || x.suspect === true) return 0;
    if (tripReady() && Trip.countedKm) return Trip.countedKm(x, currentWeight());
    const k = Number(x.km_eq);
    if (isFinite(k) && k > 0) return k;
    const kcal = Number(x.kcal) || 0;
    const kg = Number(x.weight_at_time) || currentWeight() || 62;
    return kcal > 0 && kg > 0 ? kcal / kg : 0;
  }
  function tripTotalKm() {
    if (!tripReady()) {
      return Math.max(0, (DB.exercises || []).reduce((s, x) => s + recKmEq(x), 0));
    }
    const acc = Trip.accumulate(DB.exercises || [], currentWeight());
    return Math.max(0, Number(acc.total_km) || 0);
  }
  /* total_km 只是缓存；与记录重算偏差 > 0.5 km 时以记录为准回写（规格 §2.2） */
  function syncTrip(persist) {
    if (!tripReady()) return Number(DB.trip.total_km) || 0;
    const km = tripTotalKm();
    if (Math.abs((Number(DB.trip.total_km) || 0) - km) > 0.5) {
      DB.trip.total_km = km;
      DB.trip.updatedAt = Date.now();
      if (persist) saveDB(true);
    }
    return km;
  }
  function tripCollect(no) {
    const n = Number(no);
    if (!(n >= 1 && n <= 30)) return;
    const list = DB.trip.collected || [];
    const has = list.indexOf(n) >= 0;
    const before = list.slice();
    DB.trip.collected = has ? list.filter(x => x !== n) : list.concat(n).sort((a, b) => a - b);
    if (!commit(() => { DB.trip.collected = before; })) return;
    toast(has ? '已从旅行册移除' : '已收藏进旅行册');
    renderTrip();
  }
  function renderTrip() {
    const view = $('#view-trip');
    if (!view) return;
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    if (!tripReady()) {
      view.innerHTML = '<div class="page-head"><div><h1 class="page-title">环游记</h1>' +
        '<div class="page-sub">正在载入换算模块…</div></div></div>';
      ensureTrip().then(ok => { if (ok && state.tab === 'trip') renderActive(); });
      return;
    }
    syncTrip(true);
    creditEnsure(true);
    const certs = ((DB.credit && DB.credit.certificates) || []).slice().sort((a, b) => a.date < b.date ? 1 : -1);
    const km = Math.max(0, Number(DB.trip.total_km) || 0);
    const st = Trip.currentStation(km);
    const lp = Trip.laps(km);
    const C = Trip.constants.EARTH_CIRCUMFERENCE_KM;
    const inLap = st.done_lap_km ? C : st.in_lap_km;
    const toPct = pct(inLap, C);
    const from = (typeof state.tripAnimFrom === 'number') ? state.tripAnimFrom : km;
    const prevLap = Math.floor(Math.max(0, from) / C);
    const fromPct = (prevLap === Math.floor(km / C) && from <= km) ? pct(from % C, C) : 0;
    state.tripAnimFrom = km;
    const lapNo = lp.lap + 1;
    const stationNo = st.station.no;
    const collected = (DB.trip.collected || []).slice();
    const hasCollected = collected.indexOf(stationNo) >= 0;

    const ticks = Trip.LANDMARKS.slice(0, 29).map(s => {
      const p = pct(s.cum_km, C);
      const passed = inLap >= s.cum_km;
      return '<i class="trk-tick' + (passed ? ' passed' : '') + '" style="left:' + p + '%"></i>';
    }).join('');
    const labelLeft = clamp(pct(st.station.cum_km, C), 6, 94);
    const nextText = st.done_lap_km
      ? '已绕回北京 · 下一圈从现在开始'
      : '距 ' + esc(st.next.name) + ' 还剩 ' + round1(st.to_next_km).toFixed(1) + ' km';

    const book = collected.length
      ? '<div class="trip-book-list">' + collected.map(no => {
        const s = Trip.LANDMARKS[no - 1];
        return s ? '<div class="tb-item"><span class="tb-no">' + no + '</span><span class="tb-n">' + esc(s.name) + '</span>' +
          '<span class="tb-k">' + fmt(s.cum_km) + ' km</span></div>' : '';
      }).join('') + '</div>'
      : '<div class="cart-empty">还没收藏站点。到站后点「收藏进旅行册」，这里会留下走过的地名。</div>';

    view.innerHTML =
      '<div class="page-head"><div><h1 class="page-title">环游记</h1>' +
        '<div class="page-sub">换算刻度，不是导航里程 · 1 kcal ≈ 1 kg·km</div></div>' +
        '<div class="trip-lap-badge">第 ' + lapNo + ' 圈</div>' +
      '</div>' +

      '<section class="card trip-track-card" data-trk="track">' +
        '<div class="trip-track-top"><span id="trkLapText">第 ' + lapNo + ' 圈 · 已走 ' + inLap.toFixed(2) + ' / ' + fmt(C) + ' km</span>' +
          '<span class="tiny faint">' + (lp.lap > 0 ? '已绕地球 ' + lp.lap + ' 圈' : '起点：北京') + '</span></div>' +
        '<div class="trk-wrap" data-trk="globe">' +
          '<canvas id="trkGlobe" class="trk-globe-canvas" aria-label="环游地球：已走 ' + inLap.toFixed(2) + ' 公里"></canvas>' +
        '</div>' +
        '<div class="trk-legend"><span><i class="lg gold"></i>已走</span><span><i class="lg dash"></i>这一圈还差 ' +
          Math.max(0, round1(C - inLap)).toFixed(1) + ' km</span>' +
          (lp.lap > 0 ? '<span><i class="lg hist"></i>' + lp.lap + ' 圈历史</span>' : '') + '</div>' +
        '<div class="trk-next">' + nextText + '</div>' +
      '</section>' +

      '<section class="card trip-stop" data-trk="card">' +
        '<div class="ts-head"><span class="ts-no">第 ' + stationNo + ' 站</span>' +
          '<span class="ts-km">累计 ' + fmt(Math.round(st.station.cum_km || inLap)) + ' km</span></div>' +
        '<div class="ts-name">' + esc(st.station.name) + '</div>' +
        '<div class="ts-copy">' + esc(st.station.copy) + '</div>' +
        '<div class="ts-fact">' + esc(st.station.fact) + '</div>' +
        '<button class="btn ' + (hasCollected ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-act="trip-collect" data-no="' + stationNo + '">' +
          (hasCollected ? '已收藏 · 点击移出' : '收藏进旅行册') + '</button>' +
      '</section>' +

      sportBoardHtml() +

      '<section class="card trip-book" data-trk="book">' +
        '<div class="trip-book-head"><span>旅行册</span><span class="tiny faint">' + collected.length + ' 站</span></div>' +
        book +
      '</section>' +

      '<section class="card trip-certs" data-trk="certs">' +
        '<div class="trip-book-head"><span>凭证</span><span class="tiny faint">' + certs.length + ' 张</span></div>' +
        (certs.length
          ? '<div class="cert-list">' + certs.map(c =>
            '<div class="cert-item"><span class="cert-seal">' + icon('check') + '</span>' +
              '<span class="cert-main"><b>热量信用卡结清凭证</b>' +
                '<em>' + creditDayText(c.date) + ' · 超支合计 ' + fmt(c.total) + ' kcal · ' + c.days + ' 天还清' +
                (c.periods ? ' · ' + c.periods + ' 期' : '') + '</em></span></div>').join('') + '</div>'
          : '<div class="cart-empty">还没有结清凭证。欠款归零当天会自动生成一张，同一天不重复发。</div>') +
      '</section>' +
      '<div class="notebox">口径：kcal = MET × 体重 × 时长 × 1.05；里程 = kcal ÷ 体重，登山每 100 m 爬升折 1 km。' +
        '可信度：L0 手记按 1×、L1 导入文件判定通过按 1.2×、L2 计步按 1× 估算；判为存疑与命中防虚填规则的记录只存档、不计里程。</div>';

    state.tripKm = km;
    requestAnimationFrame(() => mountTripGlobe(km));
  }

  /* ---------- 运动板块（九类分组 / 周月汇总 / 可信度） ---------- */
  const LEGACY_TO_CAT = { jog: 'run', strength: 'other', ball: 'other' };
  function sportCatOf(x) {
    const t = tripReady() ? (Trip.resolveType(x) || 'other') : (x.type || 'other');
    if (Trip.CATEGORIES.indexOf(t) >= 0) return t;
    return LEGACY_TO_CAT[t] || 'other';
  }
  function sportAgg(from, to) {
    const out = { km: 0, min: 0, count: 0, byCat: {} };
    Trip.CATEGORIES.forEach(c => { out.byCat[c] = { km: 0, min: 0, count: 0 }; });
    out.byCat.other = { km: 0, min: 0, count: 0 };
    (DB.exercises || []).forEach(x => {
      if (!x || x.date < from || x.date > to) return;
      const c = sportCatOf(x);
      const km = recKmEq(x), min = Number(x.minutes) || 0;
      if (!out.byCat[c]) out.byCat[c] = { km: 0, min: 0, count: 0 };
      out.byCat[c].km += km;
      out.byCat[c].min += min;
      out.byCat[c].count += 1;
      out.km += km;
      out.min += min;
      out.count += 1;
    });
    return out;
  }
  function confBadge(x, id) {
    if (x.valid === false) return '<button class="conf-badge s-bad" data-act="why-km" data-id="' + esc(id || x.id) + '">仅存档</button>';
    const src = Trip.sourceOf(x);
    if (x.suspect === true) return '<button class="conf-badge s-bad" data-act="why-km" data-id="' + esc(id || x.id) + '">存疑 · 不计里程</button>';
    if (src === 'import') return '<button class="conf-badge s-l1" data-act="why-km" data-id="' + esc(id || x.id) + '">L1 已验证 · 1.2×</button>';
    if (src === 'motion') return '<button class="conf-badge s-l2" data-act="why-km" data-id="' + esc(id || x.id) + '">L2 估算</button>';
    return '<button class="conf-badge s-l0" data-act="why-km" data-id="' + esc(id || x.id) + '">L0 手记</button>';
  }
  function weekMoveSummary(today) {
    const a = weekStart(today), b = today || E.todayKey();
    const list = (DB.exercises || []).filter(x => x.date >= a && x.date <= b);
    const minutes = list.reduce((s, x) => s + (Number(x.minutes) || 0), 0);
    const km = list.reduce((s, x) => s + recKmEq(x), 0);
    return { minutes: minutes, km: round1(km), count: list.length };
  }

  function sportBoardHtml() {
    const today = E.todayKey();
    const wk = sportAgg(weekStart(today), today);
    const mo = sportAgg(today.slice(0, 7) + '-01', today);
    const maxKm = Math.max(1, Math.max.apply(null, Trip.CATEGORIES.map(c => wk.byCat[c].km)));
    const bars = Trip.CATEGORIES.map(c => {
      const g = wk.byCat[c];
      return '<button class="sb-cat" data-act="ex-filter" data-id="' + c + '">' +
        '<span class="sb-cat-head"><b>' + esc(Trip.MET_TABLE[c].label) + '</b>' +
        '<em>' + round1(g.km).toFixed(1) + ' km · ' + g.min + ' 分钟</em></span>' +
        '<span class="sb-bar"><i style="width:' + pct(g.km, maxKm) + '%"></i></span></button>';
    }).join('');
    const chips = ['全部'].concat(Trip.CATEGORIES.map(c => Trip.MET_TABLE[c].label));
    const keys = ['all'].concat(Trip.CATEGORIES);
    const hasOther = wk.byCat.other.count > 0 || mo.byCat.other.count > 0;
    if (hasOther) { chips.push('旧记录'); keys.push('other'); }
    let f = state.tripFilter || 'all';
    if (keys.indexOf(f) < 0) f = 'all';
    return '<section class="card sport-board" data-trk="sport">' +
      '<div class="trip-book-head"><span>运动板块</span><span class="tiny faint">九类分组 · 本周 / 本月</span></div>' +
      '<div class="sb-sum">' +
        '<div class="sb-sum-item"><span>本周</span><b>' + round1(wk.km).toFixed(1) + ' km</b><em>' + wk.min + ' 分钟 · ' + wk.count + ' 次</em></div>' +
        '<div class="sb-sum-item"><span>本月</span><b>' + round1(mo.km).toFixed(1) + ' km</b><em>' + mo.min + ' 分钟 · ' + mo.count + ' 次</em></div>' +
      '</div>' +
      '<div class="sb-cats">' + bars + '</div>' +
      '<div class="sb-tools"><button class="btn btn-primary btn-sm" data-act="open-exercise">' + icon('plus') + '记一条</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="ex-import">' + icon('upload') + '导入 GPX / TCX</button>' +
        '<input type="file" id="exFile" class="hidden-input" accept=".gpx,.tcx,.fit" aria-label="导入运动文件"></div>' +
      stepsPanelHtml() +
      '<div class="sb-filter" id="sbFilter">' + chips.map((t, i) =>
        '<button data-act="ex-filter" data-id="' + keys[i] + '" class="' + (f === keys[i] ? 'on' : '') + '">' + esc(t) + '</button>').join('') + '</div>' +
      '<div class="sb-list" id="sportList">' + sportListHtml(f) + '</div>' +
      '</section>';
  }

  function sportListHtml(f) {
    f = f || state.tripFilter || 'all';
    const list = (DB.exercises || []).filter(x => x && (f === 'all' || sportCatOf(x) === f))
      .sort((a, b) => (a.date === b.date ? (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0) : (a.date < b.date ? 1 : -1)))
      .slice(0, 30);
    if (!list.length) return '<div class="cart-empty">这一类还没有记录。记一条，或导入运动文件。</div>';
    return list.map(x => {
      const label = x.name || (Trip.MET_TABLE[sportCatOf(x)] || {}).label || '运动';
      const extra = [];
      if (Number(x.distance_km) > 0) extra.push(round1(Number(x.distance_km)).toFixed(1) + ' km');
      if (Number(x.ascent_m) > 0) extra.push('爬升 ' + Math.round(Number(x.ascent_m)) + ' m');
      if (Number(x.jumps) > 0) extra.push(Math.round(Number(x.jumps)) + ' 次');
      if (Number(x.floors) > 0) extra.push(Math.round(Number(x.floors)) + ' 层');
      if (x.stroke) extra.push(esc(x.stroke));
      return '<div class="sb-rec"><div class="sb-rec-main"><b>' + esc(label) + '</b>' +
        '<em>' + E.shortLabel(x.date) + ' · ' + (Number(x.minutes) || 0) + ' 分钟' +
        (extra.length ? ' · ' + extra.join(' · ') : '') + '</em></div>' +
        '<div class="sb-rec-k"><span>' + fmt(x.kcal) + ' kcal</span><em>' + round1(recKmEq(x)).toFixed(1) + ' km</em></div>' +
        confBadge(x) +
        '<button class="x" data-act="del-exercise" data-id="' + x.id + '" aria-label="删除">' + icon('close') + '</button></div>';
    }).join('');
  }

  function explainKm(id) {
    const x = (DB.exercises || []).find(v => v.id === id);
    if (!x || !tripReady()) return;
    const kg = Trip.resolveWeight(x, currentWeight());
    const mets = Trip.resolveMets(x);
    const min = Number(x.minutes) || 0;
    const kcal = Number(x.kcal) > 0 ? Number(x.kcal) : Trip.estimateKcal(x, kg);
    const base = round2(kcal / kg);
    const ascent = Number(x.ascent_m) || 0;
    const extra = ascent > 0 ? round2(ascent / 100) : 0;
    const raw = Number(x.km_eq) > 0 ? round2(Number(x.km_eq)) : round2(base + extra);
    const factor = Trip.recFactor(x);
    const counted = round2(raw * factor);
    const srcTxt = { manual: '手记 · L0（基础里程，1×）', import: '文件导入 · L1（检验通过，1.2×）', motion: '手机计步 · L2（估算，1×）' }[Trip.sourceOf(x)];
    const why = x.valid === false ? '命中防虚填规则（' + (x.invalid_code || '未通过校验') + '），只存档、不计里程。'
      : x.suspect ? '导入判定存疑：' + (x.suspect_reason || '静止点过多或平均配速异常') + '，只存档、不计里程。'
        : '按来源倍率 ×' + factor + ' 计入。';
    openSheet(sheetHead('这条里程是怎么算的', esc(x.name || '运动') + ' · ' + E.shortLabel(x.date)) +
      '<div class="sheet-body"><div class="why-box">' +
        '<div class="why-row"><span>METs</span><b>' + (mets || '—') + '</b></div>' +
        '<div class="why-row"><span>体重</span><b>' + kg + ' kg</b></div>' +
        '<div class="why-row"><span>时长</span><b>' + min + ' 分钟</b></div>' +
        '<div class="why-row"><span>热量</span><b>' + fmt(kcal) + ' kcal</b></div>' +
        '<div class="why-row"><span>基础里程</span><b>' + base + ' km（kcal ÷ 体重）</b></div>' +
        (extra > 0 ? '<div class="why-row"><span>爬升加权</span><b>+' + extra + ' km（每 100 m 折 1 km）</b></div>' : '') +
        '<div class="why-row"><span>原始等效</span><b>' + raw + ' km</b></div>' +
        '<div class="why-row"><span>来源</span><b>' + srcTxt + '</b></div>' +
        '<div class="why-row"><span>计入环游记</span><b>' + counted + ' km</b></div>' +
      '</div><div class="notebox">' + esc(why) +
        ' 说明：导入只做文件结构与位移合理性检查，前端无法核验文件真伪。</div>' +
      '</div><div class="sheet-foot"><button class="btn btn-primary" style="flex:1" data-act="close-sheet">知道了</button></div>', 'why');
  }

  /* ---------- L1：GPX / TCX 导入 ---------- */
  let gpxLoading = null;
  function ensureGpx() {
    if (window.Gpx) return Promise.resolve(true);
    if (gpxLoading) return gpxLoading;
    gpxLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'assets/gpx.js?v=5.1.0';
      s.onload = () => resolve(!!window.Gpx);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    }).then(ok => { gpxLoading = null; return ok; });
    return gpxLoading;
  }
  function pickExFile() {
    const i = $('#exFile');
    if (i) i.click();
  }
  function handleExFile(input) {
    const f = input && input.files && input.files[0];
    if (!f) return;
    const name = f.name;
    const ext = (name.split('.').pop() || '').toLowerCase();
    input.value = '';
    if (ext === 'fit') { toast('FIT 暂不支持：请先在运动 App 导出 GPX 或 TCX'); return; }
    if (f.size > 8 * 1024 * 1024) { toast('文件超过 8 MB，先裁剪再导入'); return; }
    const rd = new FileReader();
    rd.onload = () => ensureGpx().then(ok => {
      if (!ok) { toast('解析模块未能加载，检查网络后重试'); return; }
      const res = Gpx.parse(String(rd.result || ''), name);
      if (!res || !res.ok) { toast('无法解析：' + ((res && res.error) || '不是有效的 GPX/TCX')); return; }
      state.importRes = res;
      showImportConfirm(res);
    });
    rd.onerror = () => toast('读取文件失败');
    rd.readAsText(f);
  }
  function showImportConfirm(r) {
    const t = r.type;
    const opts = ['walk', 'run', 'bike', 'hike', 'swim'].map(k =>
      '<button data-act="imp-type" data-id="' + k + '" class="' + (t === k ? 'on' : '') + '">' + Trip.MET_TABLE[k].label + '</button>').join('');
    openSheet(sheetHead('导入运动文件', esc(r.name)) +
      '<div class="sheet-body"><div class="why-box">' +
        '<div class="why-row"><span>格式</span><b>' + r.kind.toUpperCase() + '</b></div>' +
        '<div class="why-row"><span>时长</span><b>' + r.minutes + ' 分钟</b></div>' +
        '<div class="why-row"><span>距离</span><b>' + r.distanceKm.toFixed(2) + ' km</b></div>' +
        '<div class="why-row"><span>爬升</span><b>' + Math.round(r.ascentM) + ' m</b></div>' +
        '<div class="why-row"><span>采样点</span><b>' + r.points + ' 个</b></div>' +
        '<div class="why-row"><span>静止点占比</span><b>' + Math.round((1 - r.movingRatio) * 100) + '%</b></div>' +
        '<div class="why-row"><span>平均配速</span><b>' + (r.avgPace > 0 ? r.avgPace.toFixed(1) + ' 分/km' : '—') + '</b></div>' +
        '<div class="why-row"><span>判定</span><b>' + (r.suspect ? '存疑 · 不计里程' : '通过 · 按 1.2× 计入') + '</b></div>' +
      '</div>' +
      '<div class="sb-filter sb-filter-imp">' + opts + '</div>' +
      (r.suspect ? '<div class="notebox">判定原因：' + esc(r.reason) + '。这条会存档，但不计入环游记。</div>' : '') +
      '<div class="notebox">导入只做文件结构与位移合理性检查，前端无法核验文件是否为真实运动记录；1.2× 是规则上的奖励倍率，不是"已核验真实性"。</div>' +
      '</div><div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button>' +
      '<button class="btn btn-primary" style="flex:1" data-act="imp-save">确认写入</button></div>', 'import');
  }
  function saveImported() {
    const r = state.importRes;
    if (!r || !tripReady()) return;
    const type = r.type;
    const m = Trip.MET_TABLE[type];
    const kg = currentWeight();
    const today = E.todayKey();
    const minutes = clamp(Math.round(r.minutes), 1, 720);
    const mets = m.mid;
    const kcal = E.burn(mets, kg, minutes);
    const ascent = clamp(Math.round(r.ascentM || 0), 0, 3000);
    const km = Trip.toEquivalentKm(kcal, kg, ascent);
    const dayTotal = DB.exercises.filter(x => x.date === today).reduce((s, x) => s + (Number(x.minutes) || 0), 0) + minutes;
    if (!isFinite(km) || km <= 0) { toast('这条没有有效时长，未写入'); return; }
    const rec = {
      id: uid(), date: today, type: type, name: m.label, intensity: 'mid', mets: mets,
      minutes: minutes, distance_km: round2(r.distanceKm), ascent_m: ascent, weight_at_time: kg,
      kcal: kcal, km_eq: km, valid: true, invalid_code: null,
      source: 'import', confidence: 'L1', multiplier: r.suspect ? 0 : 1.2,
      suspect: !!r.suspect, suspect_reason: r.reason || '', src_name: r.name,
      createdAt: Date.now()
    };
    const v = Trip.validateRecord(rec, dayTotal);
    if (!v.ok) { rec.valid = false; rec.invalid_code = v.code; rec.km_eq = 0; }
    const before = DB.exercises.length;
    const tripBefore = { km: DB.trip.total_km, at: DB.trip.updatedAt };
    DB.exercises.push(rec);
    syncTrip(false);
    if (!commit(() => {
      DB.exercises.length = before;
      DB.trip.total_km = tripBefore.km;
      DB.trip.updatedAt = tripBefore.at;
    })) return;
    state.importRes = null;
    closeSheet();
    renderActive();
    toast(r.suspect ? '已存档（存疑，不计里程）' : '已导入 · 计入 ' + round1(Trip.countedKm(rec, kg)).toFixed(1) + ' km');
  }

  /* ---------- L2：计步（默认关；屏幕熄灭会停止、晃动会误判） ---------- */
  function motionSupport() {
    if (!('DeviceMotionEvent' in window)) return { ok: false, why: '当前浏览器不支持运动传感器（DeviceMotion）' };
    if (!window.isSecureContext) return { ok: false, why: '当前不是 HTTPS / 安全环境，浏览器禁用传感器' };
    return { ok: true, why: '' };
  }
  let stepsLoading = null;
  function ensureSteps() {
    if (window.Steps) return Promise.resolve(true);
    if (stepsLoading) return stepsLoading;
    stepsLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'assets/steps.js?v=5.1.0';
      s.onload = () => resolve(!!window.Steps);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    }).then(ok => { stepsLoading = null; return ok; });
    return stepsLoading;
  }
  function stepsPanelHtml() {
    const sup = motionSupport();
    if (!DB.settings.motion) {
      return '<div class="sb-steps off"><span id="sbStepsLive">计步（L2 估算）未开启</span><em>' +
        (sup.ok ? '在设置里打开；屏幕熄灭会停止、晃动会误判' : esc(sup.why)) + '</em></div>';
    }
    if (!sup.ok) return '<div class="sb-steps off"><span>计步（L2）不可用</span><em>' + esc(sup.why) + '</em></div>';
    const st = state.steps || { steps: 0, minutes: 0 };
    return '<div class="sb-steps"><span id="sbStepsLive">计步中 · ' + st.steps + ' 步（估算）</span>' +
      '<em>' + st.minutes + ' 分钟 · 屏幕熄灭会停止、晃动会误判</em>' +
      (st.steps > 0 ? '<button class="btn btn-ghost btn-sm" data-act="steps-settle">记入</button>' : '') + '</div>';
  }
  function startMotionCounting() {
    if (!DB.settings.motion || !motionSupport().ok) return;
    ensureSteps().then(ok => {
      if (!ok) return;
      state.steps = { steps: 0, minutes: 0, startTs: Date.now() };
      if (state.motionBound) return;
      state.motionBound = true;
      const det = Steps.detector();
      window.addEventListener('devicemotion', ev => {
        const a = ev.accelerationIncludingGravity || ev.acceleration;
        if (!a) return;
        const mag = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0));
        if (det(mag, Date.now())) {
          state.steps.steps++;
          state.steps.minutes = Math.round((Date.now() - state.steps.startTs) / 60000);
          const el = $('#sbStepsLive');
          if (el) el.textContent = '计步中 · ' + state.steps.steps + ' 步（估算）';
        }
      });
    });
  }
  function settleSteps() {
    if (!tripReady()) return;
    const st = state.steps;
    if (!st || st.steps < 10) { toast('步数太少，先走一段再记'); return; }
    const kg = currentWeight();
    const minutes = clamp(Math.round((Date.now() - st.startTs) / 60000), 1, 720);
    const mets = Trip.MET_TABLE.walk.mid;
    const kcal = E.burn(mets, kg, minutes);
    const km = Trip.toEquivalentKm(kcal, kg, 0);
    const today = E.todayKey();
    const rec = {
      id: uid(), date: today, type: 'walk', name: '计步（估算）', intensity: 'mid', mets: mets,
      minutes: minutes, distance_km: round2(st.steps * 0.7 / 1000), ascent_m: 0, weight_at_time: kg,
      kcal: kcal, km_eq: km, valid: true, invalid_code: null, steps: st.steps,
      source: 'motion', confidence: 'L2', multiplier: 1, createdAt: Date.now()
    };
    const v = Trip.validateRecord(rec, minutes);
    if (!v.ok) { rec.valid = false; rec.invalid_code = v.code; rec.km_eq = 0; }
    const before = DB.exercises.length;
    DB.exercises.push(rec);
    syncTrip(false);
    if (!commit(() => { DB.exercises.length = before; })) return;
    state.steps = { steps: 0, minutes: 0, startTs: Date.now() };
    renderActive();
    toast('已记入 ' + st.steps + ' 步 · 估算 ' + round1(km).toFixed(1) + ' km');
  }
  /* ============================================================
     账房批注（纯规则，不调模型、不联网）
     状态只写独立键 energy-ledger.coach，不进账本、不进导出
     ============================================================ */
  const COACH_KEY = 'energy-ledger.coach';
  const COACH_COPY = {
    over: [
      '今天超了 {n} kcal，明天回到线内',
      '账上超支 {n} kcal，先记下不追补',
      '额度用完了，还多出 {n} kcal'
    ],
    protein: [
      '蛋白质还差 {n} g，下一餐补上',
      '今天蛋白只有 {p} g，差 {n} g',
      '蛋白没吃够，还差 {n} g'
    ],
    missed: [
      '前 3 天没记账，今天补上了',
      '断了 3 天的账，从今天续上',
      '3 天没记餐，今天重新开账'
    ],
    late: [
      '22 点后又吃了 {n} kcal',
      '深夜这顿 {n} kcal，记在账上',
      '夜里加餐 {n} kcal，已入账'
    ],
    staple: [
      '连着 5 天主食用{name}，换一换',
      '5 天主食都是{name}，掺点粗粮',
      '{name}连着 5 天，明天换个主食'
    ],
    veg: [
      '蔬菜水果都少，加一份绿叶菜',
      '今天的蔬果不够，明天补一盘',
      '菜太少，来一份凉拌或水果'
    ],
    workout: [
      '本周只动了 {n} 分钟，走一走',
      '这周运动 {n} 分钟，还差一些',
      '本周运动不足，散步也算数'
    ],
    water: [
      '今天的饮水还没记，先补 1 杯',
      '账上饮水 0 ml，记一口也算',
      '水还没入账，随手记一杯'
    ]
  };
  const COACH_ORDER = ['over', 'protein', 'missed', 'late', 'staple', 'veg', 'workout', 'water'];
  let COACH = loadCoach();

  function loadCoach() {
    const def = { on: true, ledger: false, silenced: {} };
    try {
      const raw = JSON.parse(localStorage.getItem(COACH_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return def;
      return {
        on: raw.on === false ? false : true,
        ledger: raw.ledger === true,
        silenced: (raw.silenced && typeof raw.silenced === 'object') ? raw.silenced : {}
      };
    } catch (e) { return def; }
  }
  function saveCoach() {
    try { localStorage.setItem(COACH_KEY, JSON.stringify(COACH)); } catch (e) { /* 存储受限时静默，不影响账本 */ }
  }
  function coachSeed(id) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 97;
    return h;
  }
  function coachPick(id, date) {
    const pool = COACH_COPY[id] || [''];
    const day = E.daysBetween('1970-01-01', date || E.todayKey());
    const idx = (day + coachSeed(id)) % pool.length;
    return pool[idx < 0 ? idx + pool.length : idx];
  }
  function coachFill(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (_, k) {
      return vars && vars[k] != null ? vars[k] : '';
    });
  }
  function coachSilencedAt(id, date) {
    const at = COACH.silenced[id];
    if (!at) return false;
    return E.daysBetween(at, date || E.todayKey()) < 7;
  }
  function dayStaple(date) {
    const rows = DB.entries.filter(e => (e.date || e.dateKey) === date && e.cat === '主食');
    if (!rows.length) return null;
    let best = rows[0];
    rows.forEach(r => { if ((Number(r.grams) || 0) > (Number(best.grams) || 0)) best = r; });
    return best.name || '同一种主食';
  }
  /* 返回命中规则（优先级由 COACH_ORDER 决定），当天无任何餐记录时一律 0 条 */
  function coachObservations(date) {
    const today = date || E.todayKey();
    if (!DB.profile) return [];
    const entries = DB.entries.filter(e => (e.date || e.dateKey) === today);
    if (!entries.length) return [];
    const st = snapshot(today);
    if (!st) return [];
    const sum = E.summary(DB.entries, today);
    const t = targetsNow();
    const lw = E.latestWeight(DB.weights, DB.profile);
    const kg = Number(lw && lw.kg) || Number(DB.profile.weight) || 0;
    const pTarget = kg ? Math.round(kg * 1.2) : (t ? Number(t.protein) || 0 : 0);
    const out = [];
    if (sum.kcal > st.budget) {
      out.push({ id: 'over', vars: { n: fmt(sum.kcal - st.budget) }, basis: '今天 ' + fmt(sum.kcal) + ' kcal，额度 ' + fmt(st.budget) + ' kcal' });
    }
    if (pTarget > 0 && sum.p < pTarget) {
      out.push({ id: 'protein', vars: { p: sum.p, n: pTarget - sum.p }, basis: '今天蛋白 ' + sum.p + ' g，目标 ' + pTarget + ' g（体重 ×1.2）' });
    }
    const gap3 = [1, 2, 3].every(i => !DB.entries.some(e => (e.date || e.dateKey) === E.addDays(today, -i)));
    if (gap3) {
      let last = '';
      for (let i = 4; i <= 30; i++) {
        const d = E.addDays(today, -i);
        if (DB.entries.some(e => (e.date || e.dateKey) === d)) { last = d; break; }
      }
      out.push({ id: 'missed', vars: {}, basis: last ? '最近一次餐记录在 ' + E.daysBetween(last, today) + ' 天前' : '此前的账页没有餐记录' });
    }
    const late = entries.filter(e => new Date(Number(e.createdAt) || 0).getHours() >= 22);
    const lateKcal = late.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    if (lateKcal > 300) {
      out.push({ id: 'late', vars: { n: fmt(lateKcal) }, basis: '22 点后 ' + late.length + ' 笔，合计 ' + fmt(lateKcal) + ' kcal' });
    }
    const s5 = [0, 1, 2, 3, 4].map(i => dayStaple(E.addDays(today, -i)));
    if (s5[0] && s5.every(x => x && x === s5[0])) {
      out.push({ id: 'staple', vars: { name: s5[0] }, basis: '最近 5 天，主食记录都是' + s5[0] });
    }
    const vegG = entries.reduce((s, e) => s + (e.cat === '蔬菜' ? (Number(e.grams) || 0) : 0), 0);
    const fruitG = entries.reduce((s, e) => s + (e.cat === '水果' ? (Number(e.grams) || 0) : 0), 0);
    if (vegG < 200 && fruitG < 100) {
      out.push({ id: 'veg', vars: {}, basis: '蔬菜 ' + Math.round(vegG) + ' g、水果 ' + Math.round(fruitG) + ' g' });
    }
    const ws = weekStart(today);
    const wk = weekMoveSummary(today);
    const wkCount = (DB.exercises || []).filter(x => (x.date || x.dateKey) >= ws && (x.date || x.dateKey) <= today).length;
    if (wkCount >= 1 && wk.minutes < 60) {
      out.push({ id: 'workout', vars: { n: wk.minutes }, basis: '本周 ' + wk.minutes + ' 分钟，参考 60 分钟' });
    }
    const water = Number(DB.water[today] || 0);
    if (water <= 0) {
      out.push({ id: 'water', vars: {}, basis: '饮水 0 ml，目标 ' + fmt(t ? t.water : 0) + ' ml' });
    }
    return out.sort((a, b) => COACH_ORDER.indexOf(a.id) - COACH_ORDER.indexOf(b.id));
  }
  function coachNotes(date, limit) {
    const day = date || E.todayKey();
    return coachObservations(day)
      .filter(o => !coachSilencedAt(o.id, day))
      .slice(0, Math.max(1, limit || 3))
      .map(o => ({ id: o.id, main: coachFill(coachPick(o.id, day), o.vars), basis: o.basis }));
  }
  function coachHtml(limit) {
    if (!DB.profile || !COACH.on) return '';
    if (!isFull() && !COACH.ledger) return '';
    const notes = coachNotes(E.todayKey(), isFull() ? (limit || 3) : 1);
    if (!notes.length) return '';
    return '<section class="coach-notes" data-coach="notes">' +
      '<div class="cn-head"><span>账房批注</span><em>' + notes.length + ' 条</em></div>' +
      notes.map(n => '<div class="cn-item" data-rule="' + n.id + '">' +
        '<div class="cn-row"><span class="cn-t">' + esc(n.main) + '</span>' +
        '<button type="button" class="cn-x" data-act="coach-hide" data-rule="' + n.id + '">不再提示</button></div>' +
        (n.basis ? '<div class="cn-b">' + esc(n.basis) + '</div>' : '') +
      '</div>').join('') +
    '</section>';
  }
  function coachHide(rule) {
    if (!rule) return;
    COACH.silenced[rule] = E.todayKey();
    saveCoach();
    renderActive();
    toast('这条批注 7 天内不再提示');
  }
  function toggleCoach() {
    COACH.on = !COACH.on;
    saveCoach();
    renderActive();
    toast(COACH.on ? '账房批注已开启' : '账房批注已关闭');
  }
  function toggleCoachLedger() {
    COACH.ledger = !COACH.ledger;
    saveCoach();
    renderActive();
    toast(COACH.ledger ? '纯账本模式会显示 1 条批注' : '纯账本模式不再显示批注');
  }

  /* 纯账本首页：恰好 6 个内容块，不多一个入口，也不跑任何奖励/公告逻辑 */
  function renderTodayLedger() {
    const view = $('#view-today');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const budget = Math.max(1, st.baseBudget);
    const sum = st.sum;
    const remain = budget - sum.kcal;
    const streak = streakNow();
    const wk = weekMoveSummary(today);
    const ringPct = pct(sum.kcal, budget);
    /* 规格：首屏只展示早/午/晚三个小条；加餐计入已摄入，不再单列 */
    const meals = E.MEALS.slice(0, 3).map(m => Object.assign({ key: m[0], label: m[1] }, sum.byMeal[m[0]]));
    view.innerHTML =
      '<section class="lg-hero" data-lme="1">' +
        '<div class="lg-ring' + (remain < 0 ? ' over' : '') + '" style="--p:' + ringPct + '">' +
          '<div class="lg-ring-in"><div class="lg-v">' + fmt(Math.abs(remain)) + '</div><div class="lg-k">kcal ' + (remain < 0 ? '超出' : '剩余') + '</div></div>' +
        '</div>' +
        '<div class="lg-side">' +
          '<div class="lg-intake" data-lme="2"><b>' + fmt(sum.kcal) + '</b><span>已摄入 kcal</span></div>' +
          '<div class="lg-budget">今日额度 ' + fmt(budget) + ' kcal<br><span>只含基础预算</span></div>' +
        '</div>' +
      '</section>' +
      coachHtml(1) +
      '<section class="lg-meals" data-lme="3">' +
        '<div class="lg-meals-head"><span>三餐进度</span><span>' + sum.count + ' 笔</span></div>' +
        meals.map(m => '<div class="lg-meal"><span class="lm-k">' + m.label + '</span>' +
          '<span class="lm-bar"><i style="width:' + pct(m.kcal || 0, budget / 3) + '%"></i></span>' +
          '<span class="lm-v">' + (m.kcal ? fmt(m.kcal) : '未记录') + '</span></div>').join('') +
      '</section>' +
      '<button class="lg-add" data-lme="4" data-act="open-ledger-add">' +
        icon('plus') + '<span class="t">记一笔</span><span class="s">餐 · 体重 · 运动</span>' +
      '</button>' +
      '<div class="lg-week" data-lme="5">本周 ' + wk.minutes + ' 分钟 · 折合 ' + wk.km.toFixed(1) + ' 公里</div>' +
      '<div class="lg-streak" data-lme="6">连续记录 <b>' + streak + '</b> 天</div>';
  }
  function creditDayText(d) {
    const p = String(d || '').split('-');
    return p.length === 3 ? (p[1] + '.' + p[2]) : d;
  }
  function renderCreditStrip(st) {
    if (!isFull() || !st || !st.credit) return '';
    const c = st.credit;
    const debt = Math.max(0, Math.round(Number(c.debt) || 0));
    if (debt <= 0 && !c.certToday && !c.capHit) return '';
    const warn = debt > 0;
    const open = !!state.creditOpen;
    const rows = [];
    const evs = (CREDIT_CACHE ? CREDIT_CACHE.events : (DB.credit.events || [])) || [];
    evs.forEach(ev => {
      const active = Number(ev.remain) > 0;
      const recent = (ev.schedule || []).some(r => r.date >= E.addDays(E.todayKey(), -7));
      if (!active && !recent) return;
      rows.push('<div class="cs-ev-head"><span>超支事件 ' + creditDayText(ev.date) + '</span>' +
        '<span>' + fmt(ev.amount) + ' kcal · ' + ev.days + ' 期</span></div>');
      (ev.schedule || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(r => {
        const stText = { paid: '已还', partial: '部分已还', deferred: '顺延', surplus: '盈余抵扣', pending: '待还' }[r.status] || '待还';
        rows.push('<div class="cs-row ' + r.status + '"><span class="cs-date">' + creditDayText(r.date) + '</span>' +
          '<span class="cs-amt">' + (r.amount > 0 || r.status === 'pending' ? fmt(r.amount) : 0) + ' kcal</span>' +
          '<span class="cs-st">' + stText + '</span></div>');
      });
    });
    const capText = c.capHit
      ? '<div class="cs-cap">已达欠款上限 ' + fmt(c.capHit.cap) + ' kcal（今日额度 × 0.6 × 7）。本次超支 ' + fmt(c.capHit.over) + ' kcal' +
        (c.capHit.allowed > 0
          ? '，其中 ' + fmt(c.capHit.allowed) + ' kcal 计入上限内欠款，其余 ' + fmt(c.capHit.over - c.capHit.allowed) + ' kcal 只提示、不再新增。'
          : ' 只做提示，不再新增欠款。') +
        '</div>'
      : '';
    const certText = c.certToday
      ? '<div class="cs-cert">已结清：超支合计 ' + fmt(c.certToday.total) + ' kcal · ' + c.certToday.days + ' 天还清 · 凭证已放进「旅行册 → 凭证」。</div>'
      : '';
    const surplusText = c.surplus > 0
      ? '<div class="cs-surplus">今日盈余 ' + fmt(c.surplus) + ' kcal 已直接抵扣欠款，额度不回升。</div>'
      : '';
    return '<section class="credit-strip' + (warn ? ' warn' : ' ok') + '" data-credit="strip">' +
        '<button type="button" class="cs-head" data-act="credit-toggle" aria-expanded="' + (open ? 'true' : 'false') + '">' +
          '<span class="cs-ic">' + icon('flame') + '</span>' +
          '<span class="cs-main"><span class="cs-t">热量信用卡</span>' +
            (debt > 0
              ? '<span class="cs-s">欠款 <b>' + fmt(debt) + '</b> kcal · 今日还 <b>' + fmt(c.repay) + '</b></span>'
              : '<span class="cs-s">今日无欠款 · 额度恢复全额</span>') +
          '</span>' +
          '<span class="cs-go">' + (open ? '收起明细' : '分期明细') + ' ›</span>' +
        '</button>' +
        capText + certText + surplusText +
        '<div class="cs-detail"' + (open ? '' : ' hidden') + '>' +
          (rows.length ? rows.join('') : '<div class="cs-empty">没有进行中的分期。超支后次日开始扣，天数 3–7 天。</div>') +
          '<div class="cs-floor">还款地板：BMR × 0.8 = ' + fmt(c.floor) + ' kcal；到地板当天停扣，顺延次日。</div>' +
        '</div>' +
      '</section>';
  }
  function renderToday() {
    const view = $('#view-today');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    if (!isFull()) { renderTodayLedger(); return; }
    const today = E.todayKey();
    expireCredits(true);
    const st = snapshot(today);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, budget, sum, burned, remain } = st;
    const streak = streakNow();
    checkMilestones(streak);
    /* 盖章册跟随连续达标同步；独立键，静默写入，不打扰主流程 */
    syncStamps(true);
    checkAnti();
    if (checkScratchEarn(st)) toast('今日刮卡已到账：在「今天吃什么」下方刮开');
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
    const gap = gapNext(st, water);
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
    const gp = G.of(DB.profile);
    const ci = gp.cycleEnabled ? W.cycleInfo(DB.cycle, today) : null;
    const gentle = DB.settings.gentle;
    const statusWord = sum.count === 0 ? '还没开始' : over ? '略高' : remain < budget * 0.12 ? '接近上限' : '在范围内';
    const heroNumber = gentle ? statusWord : fmt(Math.abs(remain));
    const heroUnit = gentle ? '今日状态' : ('kcal ' + (over ? '超出' : '可用'));
    const statIntake = gentle ? sum.count + ' 笔' : fmt(sum.kcal);
    const statBudget = gentle ? '按计划' : fmt(budget);
    const statBurned = gentle ? (burned ? '已记录' : '—') : fmt(burned);

    const heroCap = gentle
      ? '温和模式已隐藏热量数字 · 趋势仍会记录'
      : (over
        ? (st.cheat
          ? '已超过今日预算 <b>' + fmt(Math.abs(remain)) + '</b> kcal · 经批准的放纵日，不算破连续达标'
          : '已超过今日预算 <b>' + fmt(Math.abs(remain)) + '</b> kcal · 下一餐清淡些，不必补偿')
        : '今日还可摄入 · 估算区间 <span class="range">' + fmt(Math.max(0, budget - sum.high)) + '–' + fmt(Math.max(0, budget - sum.low)) + ' kcal</span>');
    const quickActions = [
      ['open-add', 'plus', '记一餐'],
      ['open-dish', 'spark', '菜名估算'],
      ['open-ai', 'camera', '拍照识别'],
      ['open-exercise', 'run', '记运动'],
      ['open-weight', 'scale', '称重']
    ];
    const aiReady = !!(DB.settings.ai && DB.settings.ai.key);
    const guard = safetyGuard(st);
    const dp = today.split('-');
    const dayNum = dp[2];
    const monNum = Number(dp[1]);
    const stamp = sum.count
      ? (over
        ? (st.cheat
          ? '<div class="ledger-stamp approved" aria-label="经批准的放纵日"><span>经批准</span><em>' + monNum + '.' + dayNum + '</em></div>'
          : '<div class="ledger-stamp over" aria-label="今日超支"><span>超支</span><em>' + monNum + '.' + dayNum + '</em></div>')
        : '<div class="ledger-stamp ok" aria-label="今日已核"><span>已核</span><em>' + monNum + '.' + dayNum + '</em></div>')
      : '';
    const cheatLine = st.cheat
      ? '<div class="cheat-line">经批准的放纵日 · 预算 +15%（' + fmt(st.baseBudget) + ' → ' + fmt(budget) + '）</div>'
      : '';
    const creditLine = st.appliedKcal
      ? '<div class="credit-line">已启用额度券 +' + fmt(st.appliedKcal) + ' kcal</div>'
      : '';

    view.innerHTML =
      '<div class="page-head">' +
        '<div><h1 class="page-title">今日</h1><div class="page-sub">记录得更少，知道得更多</div></div>' +
        '<div class="tiny faint">仅本机 · 无账号</div>' +
      '</div>' +

      '<section class="hero ledger-paper">' +
        '<div class="ledger-head">' +
          '<div class="ledger-date"><span class="ld-day">' + dayNum + '</span><span class="ld-ym">' + dp[0] + '.' + dp[1] + '</span><span class="ld-w">周' + E.weekday(today) + '</span></div>' +
          '<div class="ledger-id"><span class="li-k">今日账页</span><span class="li-s">NO. ' + today.replace(/-/g, '') + ' · ' + (streak > 0 ? '连续达标 ' + streak + ' 天' : '今天开始') + (DB.skins.active === 'almanac' ? ' · 农历 ' + lunarText(today) : '') + '</span></div>' +
          stamp +
        '</div>' +
        (ci ? '<div class="cycle-line" data-act="open-cycle">周期第 ' + ci.day + ' 天 · ' + ci.phaseLabel + ' · 距下次约 ' + ci.daysToNext + ' 天</div>' : '') +
        cheatLine + creditLine +
        '<div class="balance"><div class="balance-num' + (gentle ? ' gentle-word' : (over ? ' neg' : '')) + '">' + heroNumber + '</div><div class="balance-unit">' + heroUnit + '</div></div>' +
        '<div class="bal-cap">' + heroCap + '</div>' +
        '<div class="meter">' +
          '<div class="meter-band" style="left:' + bandLeft + '%;width:' + bandW + '%"></div>' +
          '<div class="meter-fill' + (over ? ' warn' : '') + '" style="width:' + Math.min(100, fillPct) + '%"></div>' +
          '<div class="meter-tick" style="left:' + tickPct + '%"></div>' +
        '</div>' +
        '<div class="meter-legend"><span>0</span><span>' + (gentle ? '记录进度 · 预算线已隐藏' : '估算 ' + fmt(sum.low) + '–' + fmt(sum.high) + ' kcal · 预算线 ' + fmt(budget)) + '</span></div>' +
        renderCreditStrip(st) +
        '<div class="hero-stats">' +
          '<div class="hs-item"><div class="n">' + statIntake + '</div><div class="l">已摄入</div></div>' +
          '<div class="hs-item"><div class="n">' + statBudget + '</div><div class="l">今日预算</div></div>' +
          '<div class="hs-item"><div class="n' + (burned ? ' amber' : '') + '">' + statBurned + '</div><div class="l">运动消耗</div></div>' +
        '</div>' +
        '<div class="hero-note">' + icon('info') + '<span>预算随代谢校准变化；运动用于校准与趋势，不额外兑换食物，避免重复计算。</span></div>' +
      '</section>' +
      renderFirstEntryCard(st) +
      coachHtml(3) +
      pantryHintHtml() +

      '<section class="quick-card">' +
        quickActions.map(q => '<button class="quick" data-act="' + q[0] + '"><span class="q-ic">' + icon(q[1]) + '</span><span class="q-t">' + q[2] + '</span></button>').join('') +
      '</section>' +
      renderMealPlanEntry(st) +
      renderPerks(st) +
      '<button class="portion-hint" data-act="open-portion"><span class="ph-ic">' + icon('scale') + '</span><span class="ph-t"><b>不知道吃了多少克？</b><em>用手掌、碗、杯、包装估一份</em></span><span class="ph-a">份量参照 →</span></button>' +

      renderGapCard(gap) +
      renderControlCard() +
      renderToolsCard() +

      '<section class="coach-card">' +
        '<button class="coach-entry" data-act="open-coach">' +
          '<span class="coach-ic">' + icon('chat') + '</span>' +
          '<span class="coach-main"><span class="t">问账本</span><span class="s">' + (aiReady ? 'AI 教练只看你的记录，回答一句能做的事' : '配置 AI Key 后，可以直接问账本') + '</span></span>' +
          '<span class="coach-go">' + icon('arrow-r') + '</span>' +
        '</button>' +
      '</section>' +

      '<section class="section" style="margin-top:18px">' +
        '<div class="section-head"><h2>菜谱</h2><span class="act" data-act="open-recipes">管理 ›</span></div>' +
        '<div class="card card-tight">' +
          (DB.recipes.length ?
            '<div class="recipe-strip">' + DB.recipes.slice(0, 5).map(r =>
              '<button class="recipe-card" data-act="recipe-add" data-id="' + r.id + '"><div class="n">' + esc(r.name) + '</div><div class="k">' + r.items.length + ' 项 · ' + fmt(r.items.reduce((s, i) => s + i.per100.kcal * i.grams / 100, 0)) + ' kcal</div><div class="add">加入' + E.mealLabel(E.guessMeal()) + ' →</div></button>').join('') + '</div>'
            : '<div class="body-empty">在「记一餐」里选好几样食物，点「存为菜谱」，之后就能一键回到今天。</div>') +
          (DB.shopping && DB.shopping.items.length ?
            '<div class="shop-teaser"><div class="row-between"><div class="tiny faint">购物清单 · ' + esc(DB.shopping.recipeName || '手动') + '</div><span class="act tiny" data-act="open-shopping">查看 ' + DB.shopping.items.filter(i => i.checked).length + '/' + DB.shopping.items.length + ' ›</span></div>' +
              '<div class="chip-row" style="margin-top:8px">' + DB.shopping.items.slice(0, 5).map(i => '<span class="chip' + (i.checked ? ' on' : '') + '">' + esc(i.name) + ' ' + i.grams + 'g</span>').join('') + '</div></div>' : '') +
        '</div>' +
      '</section>' +

      '<section class="card week-entry" style="margin-top:14px">' +
        '<div class="row-between"><div><div class="body-card-title">周报卡片</div><div class="tiny faint">摄入 · 体重 · 训练 · 达标，一张长图</div></div>' +
        '<div class="week-actions"><button class="btn btn-ghost btn-sm" data-act="week-card" data-scope="last">上周</button><button class="btn btn-primary btn-sm" data-act="week-card" data-scope="this">本周</button></div></div>' +
      '</section>' +

      (guard.length ?
      '<section class="guard-card">' +
        guard.map(g => '<div class="guard-item ' + g.tone + '">' +
          '<span class="guard-dot"></span>' +
          '<span class="guard-main"><span class="t">' + g.title + '</span><span class="s">' + g.sub + '</span></span>' +
          (g.act ? '<button class="btn-quiet tiny guard-act" data-act="' + g.act + '">处理</button>' : '') +
        '</div>').join('') +
      '</section>' : '') +

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

      renderDailyExtras(st, streak) +

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
        '<div class="card card-tight ledger-paper">' +
          '<div class="ledger-cols"><span>项目</span><span>支出 kcal</span></div>' +
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
          '<div class="balance-line"><span class="k">今日结余（预算 − 支出）</span><span class="v' + (over ? ' red' : '') + '">' + (over ? '−' : '') + fmt(Math.abs(remain)) + ' kcal</span></div>' +
        '</div>' +
      '</section>' +

      '<section class="card month-entry" data-act="open-month">' +
        '<div class="me-left"><span class="me-k">月度账页</span><span class="me-s">按月合计 · 分类占比 · 导出对账单</span></div>' +
        '<span class="me-go">翻页 ›</span>' +
      '</section>' +

      (!weightToday ? '<section class="weight-prompt"><div><div class="t">今天还没称重</div><div class="s">同一时间、空腹称重，趋势才可信。最近的记录：' + (lastWeight ? lastWeight.kg + ' kg' + (lastWeight.date ? '（' + E.relativeDay(lastWeight.date, today) + '）' : '') : '暂无') + '</div></div><button class="btn btn-ghost btn-sm" data-act="open-weight">记录体重</button></section>' : '') +

      '<div class="disclaimer">所有热量、消耗与代谢值均为估算，会随记录持续校准；本应用不构成医疗建议。</div>';
  }

  function remainingText(remain, sum) {
    if (remain <= 0) return '今日预算已用完。';
    if (sum.kcal === 0) return '从第一笔开始，账本会用你自己的体重变化校准一切。';
    return '';
  }

  /* ---------- v5.3 第一笔入口：空账日不再只有三处「尚未开始」 ----------
     大按钮 + 三个一键模板（吃了 / 动了 / 称重）。吃过、动过或称过任意一项后整卡消失，
     「连续 0 天」的空态第一次有了下一步。 */
  function renderFirstEntryCard(st) {
    const today = E.todayKey();
    /* 只看饮食与运动：引导建档会写入当日体重，体重不算"第一笔"
       （连续达标由饮食/运动驱动）；称重后卡片保留，饮食或运动入账后消失 */
    const hasAny = st.sum.count > 0
      || DB.exercises.some(x => x.date === today);
    if (hasAny) return '';
    return '<section class="first-entry" aria-label="记第一笔">' +
      '<div class="fe-head"><b>从第一笔开始</b><span>今天记下任意一笔，连续就从今天算起</span></div>' +
      '<button class="fe-main" data-act="open-add">' + icon('plus') +
        '<span class="t">记第一笔</span><span class="s">一餐 · 一杯 · 一次运动都算</span>' +
      '</button>' +
      '<div class="fe-quick">' +
        '<button class="fe-chip" data-act="quick-eat">' + icon('flame') + '<span>吃了</span><em>简记一餐</em></button>' +
        '<button class="fe-chip" data-act="quick-move">' + icon('run') + '<span>动了</span><em>快走 20 分钟</em></button>' +
        '<button class="fe-chip" data-act="quick-weight">' + icon('scale') + '<span>称重</span><em>沿用上次读数</em></button>' +
      '</div>' +
      '<div class="fe-note">「吃了」「动了」点一下就入账并标为粗估，之后在账本里随时改成实际数字。</div>' +
    '</section>';
  }
  function quickFirstEntry(kind) {
    const today = E.todayKey();
    if (kind === 'eat') {
      const meal = E.guessMeal();
      const entry = {
        id: uid(), date: today, meal: meal, name: '简记·一餐（待补充）', grams: 0, per100: null,
        kcal: 400, p: 15, c: 0, f: 0, fib: 2, conf: 'low', source: 'quick', createdAt: Date.now()
      };
      const before = DB.entries.length;
      DB.entries.push(entry);
      if (!commit(() => { DB.entries.length = before; })) return;
      logChange('一键简记一餐（粗估 400 kcal）', { kind: 'entry-add', item: entry });
      renderActive();
      toast('已记入' + E.mealLabel(meal) + ' · 粗估 400 kcal，账本里可改成实际菜名');
    } else if (kind === 'move') {
      const kg = currentWeight();
      const mets = 5.0; /* 与 Trip.MET_TABLE.walk.mid 同口径 */
      const kcal = E.burn(mets, kg, 20);
      const km = tripReady() ? Trip.toEquivalentKm(kcal, kg, 0) : 0;
      const rec = {
        id: uid(), date: today, type: 'walk', name: '快走 20 分钟（简记）', intensity: 'mid', mets: mets,
        minutes: 20, distance_km: 0, ascent_m: 0, weight_at_time: kg,
        kcal: kcal, km_eq: km, valid: true, invalid_code: null,
        source: 'quick', confidence: 'L2', multiplier: 1, createdAt: Date.now()
      };
      const before = DB.exercises.length;
      const tripBefore = { km: DB.trip.total_km, at: DB.trip.updatedAt };
      DB.exercises.push(rec);
      syncTrip(false);
      if (!commit(() => {
        DB.exercises.length = before;
        DB.trip.total_km = tripBefore.km;
        DB.trip.updatedAt = tripBefore.at;
      })) return;
      logChange('一键简记快走 20 分钟（约 ' + Math.round(kcal) + ' kcal）', { kind: 'exercise-add', item: rec });
      renderActive();
      toast('已记入快走 20 分钟 · 约 ' + Math.round(kcal) + ' kcal');
    }
  }

  /* ---------- 创新：今日还差什么 ---------- */
  function adherenceStreak(budget, t) {
    let d = E.summary(DB.entries, E.todayKey()).count ? E.todayKey() : E.addDays(E.todayKey(), -1);
    let n = 0;
    while (n < 365) {
      const s = E.summary(DB.entries, d);
      if (!s.count) break;
      if (s.kcal > budget * 1.05 || s.kcal < budget * 0.85) break;
      n++;
      d = E.addDays(d, -1);
    }
    const next = [3, 7, 14, 30, 60, 100].find(m => m > n) || null;
    return { n: n, next: next, toNext: next ? next - n : 0 };
  }

  function gapNext(st, water) {
    const today = E.todayKey();
    const push = adherenceStreak(st.budget, st.t);
    const base = { streak: push };
    if (st.sum.count === 0) {
      return Object.assign(base, { kind: 'start', title: '先记下第一餐', sub: '有了第一笔，账本才会开始校准你的预算。', act: 'open-add', label: '记一餐' });
    }
    if (st.remain <= 0) {
      return Object.assign(base, { kind: 'over', title: '今天预算已用完', sub: '不必补偿，散散步或早点休息就好。', act: 'open-exercise', label: '记运动' });
    }
    const pGap = Math.max(0, st.t.protein - st.sum.p);
    const fiberGap = Math.max(0, st.t.fiber - st.sum.fib);
    const wGap = Math.max(0, st.t.water - water);
    if (pGap >= 8) {
      const cands = allFoods().filter(f => f.p >= 12 && f.kcal <= 260 && !/零食|薯片|蛋糕|可乐/.test(f.name))
        .filter(f => f.kcal * 1.5 <= st.remain && f.kcal * 0.5 <= st.remain);
      cands.sort((a, b) => (b.p / Math.max(1, b.kcal)) - (a.p / Math.max(1, a.kcal)));
      if (cands.length) {
        const f = cands[0];
        const g = f.kcal * 1.5 <= st.remain ? 150 : 100;
        return Object.assign(base, { kind: 'protein', title: '蛋白质还差 ' + Math.round(pGap) + 'g', sub: '一份 ' + f.name + ' ' + g + 'g 约补 ' + round1(f.p * g / 100) + 'g，热量也在今天剩余内。', act: 'gap-add', food: f.id, grams: g, label: '加 ' + g + 'g ' + f.name, pGap: pGap });
      }
    }
    if (wGap >= 250) {
      const ml = wGap >= 500 ? 500 : 250;
      return Object.assign(base, { kind: 'water', title: '饮水还差 ' + round1(wGap / 1000) + 'L', sub: '一次 ' + ml + 'ml，分几次喝完比一次灌更舒服。', act: 'quick-water', ml: ml, label: '+' + ml + 'ml 水' });
    }
    if (fiberGap >= 5) {
      const cands = allFoods().filter(f => f.fib >= 2.5 && f.kcal <= st.remain + 50)
        .sort((a, b) => (b.fib / Math.max(1, b.kcal)) - (a.fib / Math.max(1, a.kcal)));
      if (cands.length) {
        const f = cands[0];
        return Object.assign(base, { kind: 'fiber', title: '膳食纤维还差 ' + Math.round(fiberGap) + 'g', sub: '一份 ' + f.name + ' 150g 约补 ' + round1(f.fib * 1.5) + 'g。', act: 'gap-add', food: f.id, grams: 150, label: '加 150g ' + f.name });
      }
    }
    return Object.assign(base, { kind: 'done', title: '今天的关键项都够了', sub: push.n ? '已达标的连续天数：' + push.n + ' 天' + (push.next ? '，距 ' + push.next + ' 天里程碑还差 ' + push.toNext + ' 天' : '') : '蛋白质、纤维和饮水都在目标附近。' });
  }

  function renderGapCard(gap) {
    const ic = gap.kind === 'done' ? icon('check') : gap.kind === 'over' ? icon('info') : icon('plus');
    let btn = '';
    if (gap.act === 'gap-add') {
      btn = '<button class="btn btn-primary btn-sm" data-act="gap-add" data-food="' + gap.food + '" data-grams="' + gap.grams + '">' + esc(gap.label) + '</button>';
    } else if (gap.act === 'quick-water') {
      btn = '<button class="btn btn-primary btn-sm" data-act="quick-water" data-ml="' + gap.ml + '">' + esc(gap.label) + '</button>';
    } else if (gap.act) {
      btn = '<button class="btn btn-primary btn-sm" data-act="' + gap.act + '">' + esc(gap.label) + '</button>';
    }
    const st = gap.streak || { n: 0, next: 3, toNext: 3 };
    return '<section class="card gap-card gap-' + gap.kind + '">' +
      '<div class="gap-main"><span class="gap-ic">' + ic + '</span>' +
        '<div><div class="eyebrow">今天还差什么</div><div class="gap-title">' + esc(gap.title) + '</div><div class="gap-sub">' + esc(gap.sub) + '</div></div>' +
      '</div>' +
      (btn ? '<div class="gap-act">' + btn + '</div>' : '') +
      '<div class="gap-foot">' + icon('flame') + '<span>' + (st.n ? '连续达标 <b>' + st.n + ' 天</b>' + (st.next ? ' · 还差 ' + st.toNext + ' 天到 ' + st.next + ' 天里程碑' : ' · 已到最长里程碑') : '连续达标从今天开始 · 吃在预算内并记下来就算一天') + '</span></div>' +
    '</section>';
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

      (isFull() ? renderHeatCard() : '') +

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

  /* ---------- v5.2 饮食日历热力图 ----------
     365 格按周排列；颜色只说明「记录完整度 + 是否在额度内」，没有记录就保持空白，不伪造颜色。 */
  const HEAT_LEVELS = [
    { lv: 1, label: '超出预算' },
    { lv: 2, label: '有记录' },
    { lv: 3, label: '较完整' },
    { lv: 4, label: '三餐完整' }
  ];
  function heatWeekdayNum(k) {
    const d = new Date(k + 'T00:00:00');
    return (d.getDay() + 6) % 7; /* 0 = 周一 */
  }
  function heatLevelOf(k) {
    const s = E.summary(DB.entries, k);
    if (!s || !s.count) return 0;
    const st = snapshot(k);
    const budget = st ? st.budget : 0;
    if (!budget) return 0;
    if (s.kcal > budget * 1.03) return 1;
    const list = DB.entries.filter(e => e.date === k);
    const meals = {};
    list.forEach(e => { meals[e.meal] = 1; });
    const nMeals = Object.keys(meals).length;
    if (nMeals >= 3 && list.length >= 3) return 4;
    if (list.length >= 2 || nMeals >= 2) return 3;
    return 2;
  }
  function heatYearCells() {
    const today = E.todayKey();
    const start = E.addDays(today, -364);
    const first = E.addDays(start, -heatWeekdayNum(start));
    const end = E.addDays(today, 6 - heatWeekdayNum(today));
    const out = [];
    let k = first, guard = 0;
    while (k <= end && guard++ < 400) {
      const inRange = k >= start && k <= today;
      out.push({ date: k, inRange: inRange, future: k > today, level: inRange ? heatLevelOf(k) : 0 });
      k = E.addDays(k, 1);
    }
    return out;
  }
  function heatMonthCells(month) {
    const today = E.todayKey();
    const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7));
    const last = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < heatWeekdayNum(month + '-01'); i++) cells.push(null);
    for (let d = 1; d <= last; d++) {
      const k = month + '-' + (d < 10 ? '0' : '') + d;
      cells.push({ date: k, inRange: true, future: k > today, level: k <= today ? heatLevelOf(k) : 0 });
    }
    return cells;
  }
  function heatMonthShift(month, delta) {
    const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7));
    const d = new Date(y, m - 1 + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function renderHeatCard() {
    const today = E.todayKey();
    const view = state.heatView === 'month' ? 'month' : 'year';
    const month = state.heatMonth || today.slice(0, 7);
    const cells = view === 'year' ? heatYearCells() : heatMonthCells(month);
    const cls = 'heat-cell' + (view === 'year' ? ' hy' : ' hm');
    const grid = cells.map(function (x) {
      if (!x) return '<span class="' + cls + ' blank"></span>';
      const filled = x.level > 0 && !x.future;
      return '<button class="' + cls + (filled ? ' lv' + x.level : '') + (x.future ? ' future' : '') + (x.date === today ? ' now' : '') + '"' +
        ' data-act="heat-day" data-date="' + x.date + '"' +
        (filled ? ' title="' + E.dateLabel(x.date) + ' · ' + HEAT_LEVELS[x.level - 1].label + '"' : '') +
        (x.future || !x.inRange ? ' disabled' : '') + ' aria-label="' + E.dateLabel(x.date) + (filled ? ' ' + HEAT_LEVELS[x.level - 1].label : ' 无记录') + '"></button>';
    }).join('');
    const prevDisabled = view === 'month' && month >= today.slice(0, 7);
    return '<section class="card heat-card" id="heatCard" style="margin-top:14px">' +
      '<div class="heat-head"><div><div class="eyebrow">饮食日历</div><div class="heat-title">' +
        (view === 'year' ? '近一年 · 365 天' : Number(month.slice(0, 4)) + ' 年 ' + Number(month.slice(5, 7)) + ' 月') + '</div></div>' +
        '<div class="seg heat-seg">' + [['year', '年'], ['month', '月']].map(x =>
          '<button data-act="heat-view" data-v="' + x[0] + '" class="' + (view === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      '</div>' +
      (view === 'month' ? '<div class="heat-month-nav">' +
        '<button class="arrow-btn" data-act="heat-month" data-d="-1" aria-label="上个月">' + icon('chevron-l') + '</button>' +
        '<span>' + Number(month.slice(0, 4)) + '.' + month.slice(5, 7) + '</span>' +
        '<button class="arrow-btn" data-act="heat-month" data-d="1"' + (prevDisabled ? ' disabled' : '') + ' aria-label="下个月">' + icon('chevron-r') + '</button>' +
      '</div>' : '') +
      '<div class="heat-grid ' + (view === 'year' ? 'heat-year' : 'heat-month') + '">' + grid + '</div>' +
      '<div class="heat-legend">' + HEAT_LEVELS.map(x => '<span><i class="hl lv' + x.lv + '"></i>' + x.label + '</span>').join('') +
        '<span><i class="hl"></i>无记录</span></div>' +
      '<div class="heat-note tiny faint">点任意格子回看当天；没有记录的日子保持空白，不补色。</div>' +
    '</section>';
  }

  /* ---------- 创新：控糖 / 控油 / 控盐 ---------- */
  const CONTROL_META = {
    sugar: { key: 'sugar', label: '糖', full: '添加糖', unit: 'g', target: 25, cap: 50, color: 'sugar' },
    oil: { key: 'oil', label: '油', full: '烹调油', unit: 'g', target: 30, cap: 35, color: 'oil' },
    salt: { key: 'salt', label: '盐', full: '盐（当量）', unit: 'g', target: 5, cap: 5, color: 'salt' }
  };

  function controlTotals(date) {
    const entries = DB.entries.filter(e => e.date === date);
    const t = { sugar: 0, oil: 0, salt: 0, sodium: 0, counted: 0, total: entries.length };
    entries.forEach(e => {
      if (!e.control) return;
      t.sugar += Number(e.control.sugar) || 0;
      t.oil += Number(e.control.oil) || 0;
      t.salt += Number(e.control.salt) || 0;
      t.sodium += Number(e.control.sodium) || 0;
      t.counted++;
    });
    t.sugar = round1(t.sugar); t.oil = round1(t.oil); t.salt = round1(t.salt); t.sodium = Math.round(t.sodium);
    return t;
  }

  function controlSources(date, key) {
    return DB.entries.filter(e => e.date === date && e.control && Number(e.control[key]) > 0)
      .map(e => ({ name: e.name, grams: e.grams, amt: Number(e.control[key]) || 0, kcal: e.kcal }))
      .sort((a, b) => b.amt - a.amt).slice(0, 4);
  }

  function renderControlCard() {
    const c = controlTotals(E.todayKey());
    const rows = Object.keys(CONTROL_META).map(k => {
      const m = CONTROL_META[k];
      const p = pct(c[k], m.target);
      const over = c[k] > m.target;
      return '<div class="cc-row"><span class="lbl">' + m.label + '</span><div class="cc-bar"><i class="' + m.color + (over ? ' over' : '') + '" style="width:' + p + '%"></i></div>' +
        '<span class="v">' + c[k] + ' / ' + m.target + m.unit + '</span></div>';
    }).join('');
    return '<section class="card control-card" data-act="open-control" role="button" tabindex="0">' +
      '<div class="cc-head"><div><div class="eyebrow">今日三控</div><div class="cc-title">糖 · 油 · 盐</div></div>' +
      '<span class="badge ' + (c.sugar > 25 || c.oil > 30 || c.salt > 5 ? '' : 'high') + '">' + (c.counted ? '已拆解 ' + c.counted + ' 笔' : '待记录') + '</span></div>' +
      '<div class="cc-bars">' + rows + '</div>' +
      '<div class="cc-note">' + (c.counted ? '来自已拆解的菜名/零食记录 · 点开看主要来源和下一步' : '用「菜名估算」或记零食后，这里会自动统计糖油盐') + '</div>' +
    '</section>';
  }

  function controlRadar(key, limit) {
    const all = buildDishCatalog().filter(d => ['snack', 'drink', 'fast', 'staple', 'home'].indexOf(d.cat) >= 0 && d.control && d.control[key] > 0);
    return all.sort((a, b) => (b.control[key] || 0) - (a.control[key] || 0)).slice(0, limit || 6);
  }

  function renderControlSheet() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'control') return;
    const tab = sd.tab || 'sugar';
    const m = CONTROL_META[tab];
    const c = controlTotals(E.todayKey());
    const val = c[tab];
    const p = pct(val, m.target);
    const over = val > m.target;
    const sources = controlSources(E.todayKey(), tab);
    const checks = (DB.controlChecks[E.todayKey()] || []);
    const radar = controlRadar(tab, 6);
    const tips = {
      sugar: ['一瓶 500ml 可乐约 53g 糖，全糖奶茶常在 40–60g。', '看包装上的“糖”和碳水化合物，NRV% 超过 15% 算高。', '用无糖茶、气泡水、白水替代含糖饮料；水果不算添加糖。'],
      oil: ['油炸、干锅、水煮、酥皮最吸油；一份中薯条约 15g 油。', '坚果和牛油果是食物脂肪，不计入“烹调油”，但热量要算。', '多用蒸、煮、炖、凉拌；不粘锅和喷雾油能明显减油。'],
      salt: ['5g 盐 ≈ 2000mg 钠；10ml 酱油 ≈ 1.5g 盐。', '隐形盐：火腿肠、培根、泡面、辣条、话梅、面包、奶酪。', '用限盐勺，出锅前放盐；醋、柠檬、香料可以提味。']
    }[tab];
    const action = over
      ? (tab === 'sugar' ? '下一杯选无糖，甜点今天到此为止。' : tab === 'oil' ? '下一餐改蒸煮/凉拌，不再煎炸。' : '下一餐少酱料，多喝白水，多吃高钾蔬果。')
      : val > m.target * 0.75
        ? (tab === 'sugar' ? '接近上限了，晚餐避开甜饮和甜点。' : tab === 'oil' ? '还有一点空间，下一餐尽量清淡。' : '接近上限了，酱油和加工肉先停一停。')
        : '目前还有空间，保持现在的做法。';
    const tabBar = Object.keys(CONTROL_META).map(k => {
      const mm = CONTROL_META[k];
      return '<button class="control-tab ' + (k === tab ? 'on ' + mm.color : '') + '" data-act="control-tab" data-v="' + k + '">' + mm.label + '<small>' + controlTotals(E.todayKey())[k] + '/' + mm.target + mm.unit + '</small></button>';
    }).join('');
    const list = sources.length ? sources.map(s =>
      '<div class="ctrl-src-row"><span class="n">' + esc(s.name) + '</span><span class="g">' + s.grams + 'g</span><span class="v">' + round1(s.amt) + m.unit + '</span></div>').join('')
      : '<div class="cart-empty">今天还没有可拆解的记录。用菜名估算或记一份零食后，这里会显示主要来源。</div>';
    const radarList = radar.map(d =>
      '<button class="ctrl-radar-row" data-act="control-radar" data-name="' + esc(d.n) + '"><span class="n">' + esc(d.n) + '</span>' +
      '<span class="v">' + (tab === 'salt' ? round1(d.control.salt) + 'g 盐' : round1(d.control[tab]) + 'g') + '</span><span class="a">估算 →</span></button>').join('');
    return '<div class="control-tabs">' + tabBar + '</div>' +
      '<div class="control-hero ' + m.color + '">' +
        '<div class="ch-top"><span>' + m.full + ' · 目标 ≤ ' + m.target + m.unit + '</span><span>' + (over ? '已超' : val > m.target * 0.75 ? '接近上限' : '还有空间') + '</span></div>' +
        '<div class="ch-val">' + val + '<small>' + m.unit + '</small><em>/ ' + m.target + m.unit + '</em></div>' +
        '<div class="ch-bar"><i style="width:' + p + '%"></i></div>' +
        '<div class="ch-next">' + esc(action) + '</div>' +
      '</div>' +
      '<div class="section-title-sm">主要来源</div><div class="ctrl-src">' + list + '</div>' +
      '<div class="section-title-sm">高' + m.label + '食物雷达</div><div class="ctrl-radar">' + radarList + '</div>' +
      '<div class="section-title-sm">今日三控清单 · ' + checks.length + '/5</div>' +
      '<div class="ctrl-check">' + [
        '没有喝含糖饮料',
        '烹调以蒸煮/凉拌为主',
        '用了限盐勺或少放酱油',
        '零食选原味、非油炸',
        '看过一款包装的营养成分表'
      ].map((x, i) => '<button class="ctrl-check-row ' + (checks.indexOf(i) >= 0 ? 'on' : '') + '" data-act="control-check" data-i="' + i + '"><span class="box">' + (checks.indexOf(i) >= 0 ? '✓' : '') + '</span>' + x + '</button>').join('') + '</div>' +
      '<div class="ctrl-tips">' + tips.map(t => '<div class="tip">· ' + esc(t) + '</div>').join('') + '</div>' +
      '<div class="notebox">依据《中国居民膳食指南（2022）》：添加糖 ≤25g/天（上限 50g）、烹调油 25–30g/天、盐 <5g/天（钠 <2000mg）。这里只统计已拆解的菜名/零食记录；普通食物条目未拆分油盐糖，不会假装精确。</div>';
  }

  function openControlSheet() {
    state.sheetData = { type: 'control', tab: 'sugar' };
    openSheet(
      sheetHead('控糖 · 控油 · 控盐', '今日 ' + E.relativeDay(E.todayKey(), E.todayKey()) + ' · 参考膳食指南 · 只统计可拆解记录') +
      '<div class="sheet-body" id="controlBody">' + renderControlSheet() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">知道了</button></div>',
      'control'
    );
  }

  /* ---------- 份量参照 ---------- */
  const HAND_GUIDE = [
    ['一个手掌', '约 100g', '肉、鱼、禽：和手掌一样大、差不多厚'],
    ['一个拳头', '约 150g', '米饭、面条、薯类（熟）'],
    ['一大把', '约 100g', '绿叶蔬菜，双手捧满'],
    ['一小把', '约 25g', '坚果、葡萄干、枸杞'],
    ['一个拇指', '约 15g', '油、黄油、花生酱'],
    ['一汤匙', '约 15g', '油、沙拉酱；酱油约 15ml'],
    ['一茶匙', '约 5g', '盐、糖、油'],
    ['一个杯子', '约 250ml', '牛奶、水、果汁']
  ];

  const PORTION_CATS = { staple: '主食', protein: '蛋白', veg: '蔬菜', fruit: '水果', drink: '饮品', fat: '油盐糖', snack: '零食' };

  function PU(n, unit, g, cat, note) { return { n: n, unit: unit, g: g, cat: cat, note: note || '' }; }

  const PORTION_UNITS = [
    PU('米饭', '小碗', 150, 'staple', '约一个拳头'), PU('米饭', '大碗', 250, 'staple', '约两个拳头'),
    PU('粥', '小碗', 250, 'staple', ''), PU('面条', '一碗', 250, 'staple', ''), PU('米粉', '一碗', 250, 'staple', ''),
    PU('馒头', '一个', 80, 'staple', ''), PU('花卷', '一个', 80, 'staple', ''), PU('包子', '一个', 80, 'staple', ''),
    PU('饺子', '一个', 25, 'staple', ''), PU('馄饨', '一个', 20, 'staple', ''), PU('烧麦', '一个', 30, 'staple', ''),
    PU('面包', '一片', 30, 'staple', ''), PU('吐司', '一片', 35, 'staple', ''), PU('贝果', '一个', 100, 'staple', ''),
    PU('油条', '一根', 60, 'staple', ''), PU('煎饼', '一个', 150, 'staple', ''), PU('手抓饼', '一张', 100, 'staple', ''),
    PU('玉米', '一根', 200, 'staple', ''), PU('红薯', '一个', 200, 'staple', ''), PU('粽子', '一个', 150, 'staple', ''),
    PU('鸡蛋', '一个', 50, 'protein', ''), PU('鸡胸', '一块', 150, 'protein', ''), PU('鸡腿', '一个', 120, 'protein', ''),
    PU('鸡翅', '一个', 50, 'protein', ''), PU('排骨', '一块', 30, 'protein', ''), PU('牛肉', '一片', 15, 'protein', ''),
    PU('猪肉丝', '一筷子', 20, 'protein', ''), PU('鱼', '一条', 300, 'protein', '可食部'), PU('鱼片', '一片', 20, 'protein', ''),
    PU('虾', '一只', 10, 'protein', ''), PU('豆腐', '一块', 300, 'protein', ''), PU('豆干', '一块', 30, 'protein', ''),
    PU('火腿肠', '一根', 40, 'protein', ''), PU('培根', '一片', 15, 'protein', ''), PU('午餐肉', '一片', 30, 'protein', ''),
    PU('猪肝', '一片', 20, 'protein', ''), PU('虾滑', '一勺', 30, 'protein', ''), PU('牛肉丸', '一个', 20, 'protein', ''),
    PU('鱼丸', '一个', 15, 'protein', ''), PU('蟹棒', '一根', 20, 'protein', ''),
    PU('番茄', '一个', 150, 'veg', ''), PU('黄瓜', '一根', 200, 'veg', ''), PU('青椒', '一个', 80, 'veg', ''),
    PU('洋葱', '一个', 150, 'veg', ''), PU('胡萝卜', '一根', 100, 'veg', ''), PU('土豆', '一个', 150, 'veg', ''),
    PU('茄子', '一个', 200, 'veg', ''), PU('西兰花', '一颗', 300, 'veg', ''), PU('白菜', '一片', 30, 'veg', ''),
    PU('生菜', '一片', 20, 'veg', ''), PU('菠菜', '一把', 100, 'veg', ''), PU('青菜', '一把', 100, 'veg', ''),
    PU('蘑菇', '一个', 15, 'veg', ''), PU('香菇', '一个', 20, 'veg', ''), PU('木耳', '一朵', 10, 'veg', '泡发'),
    PU('豆角', '一根', 10, 'veg', ''), PU('花菜', '一朵', 100, 'veg', ''), PU('莲藕', '一段', 100, 'veg', ''),
    PU('山药', '一段', 150, 'veg', ''), PU('冬瓜', '一块', 100, 'veg', ''), PU('南瓜', '一块', 100, 'veg', ''),
    PU('苹果', '一个', 200, 'fruit', ''), PU('香蕉', '一根', 120, 'fruit', ''), PU('橘子', '一个', 150, 'fruit', ''),
    PU('橙子', '一个', 200, 'fruit', ''), PU('梨', '一个', 200, 'fruit', ''), PU('桃', '一个', 200, 'fruit', ''),
    PU('猕猴桃', '一个', 100, 'fruit', ''), PU('火龙果', '一个', 350, 'fruit', ''), PU('芒果', '一个', 200, 'fruit', ''),
    PU('西瓜', '一块', 150, 'fruit', ''), PU('葡萄', '一串', 150, 'fruit', ''), PU('草莓', '一颗', 15, 'fruit', ''),
    PU('蓝莓', '一颗', 2, 'fruit', ''), PU('樱桃', '一颗', 8, 'fruit', ''), PU('荔枝', '一颗', 20, 'fruit', ''),
    PU('龙眼', '一颗', 10, 'fruit', ''), PU('枣', '一颗', 15, 'fruit', ''), PU('柠檬', '一个', 100, 'fruit', ''),
    PU('牛油果', '一个', 150, 'fruit', ''), PU('椰子', '一个', 500, 'fruit', '可食部'),
    PU('牛奶', '一盒', 250, 'drink', ''), PU('酸奶', '一杯', 200, 'drink', ''), PU('豆浆', '一杯', 300, 'drink', ''),
    PU('咖啡', '一杯', 350, 'drink', ''), PU('奶茶', '一杯', 500, 'drink', ''), PU('可乐', '一罐', 330, 'drink', ''),
    PU('啤酒', '一瓶', 500, 'drink', ''), PU('白酒', '一两', 50, 'drink', ''), PU('红酒', '一杯', 150, 'drink', ''),
    PU('果汁', '一杯', 350, 'drink', ''), PU('水', '一杯', 250, 'drink', ''), PU('茶', '一杯', 250, 'drink', ''),
    PU('气泡水', '一瓶', 500, 'drink', ''), PU('运动饮料', '一瓶', 500, 'drink', ''), PU('椰奶', '一杯', 250, 'drink', ''),
    PU('油', '一汤匙', 15, 'fat', ''), PU('油', '一茶匙', 5, 'fat', ''), PU('盐', '一平勺', 5, 'fat', ''),
    PU('糖', '一平勺', 5, 'fat', ''), PU('酱油', '一汤匙', 15, 'fat', ''), PU('沙拉酱', '一汤匙', 15, 'fat', ''),
    PU('花生酱', '一汤匙', 15, 'fat', ''), PU('坚果', '一小把', 25, 'fat', ''), PU('花生', '10 粒', 15, 'fat', ''),
    PU('瓜子', '一把', 20, 'fat', ''), PU('核桃', '一个', 10, 'fat', ''), PU('腰果', '一个', 3, 'fat', ''),
    PU('杏仁', '一颗', 2, 'fat', ''), PU('开心果', '一颗', 1.5, 'fat', ''), PU('芝麻', '一勺', 5, 'fat', ''),
    PU('薯片', '一小包', 50, 'snack', ''), PU('薯片', '分享装', 110, 'snack', ''), PU('饼干', '一块', 10, 'snack', ''),
    PU('巧克力', '一块', 10, 'snack', ''), PU('巧克力', '一排', 50, 'snack', ''), PU('糖果', '一颗', 5, 'snack', ''),
    PU('蛋糕', '一块', 80, 'snack', ''), PU('蛋挞', '一个', 60, 'snack', ''), PU('泡芙', '一个', 30, 'snack', ''),
    PU('面包', '一个', 100, 'snack', ''), PU('冰淇淋', '一支', 80, 'snack', ''), PU('雪糕', '一支', 70, 'snack', ''),
    PU('爆米花', '一小桶', 80, 'snack', ''), PU('海苔', '一小包', 10, 'snack', ''), PU('辣条', '一小包', 30, 'snack', '')
  ];

  function portionForCatalog(d) {
    const unit = { home: '盘', soup: '碗', staple: '份', snack: '包', drink: '杯', fruit: '份', light: '份', fast: '份', breakfast: '份' }[d.cat] || '份';
    return { unit: unit, grams: Math.round(d.grams), kcal: Math.round(d.k) };
  }

  function portionUnits(q) {
    const query = String(q || '').trim();
    if (!query) return PORTION_UNITS.slice(0, 24);
    return PORTION_UNITS.filter(u => u.n.indexOf(query) >= 0 || query.indexOf(u.n) >= 0).slice(0, 30);
  }

  function unitText(unit) {
    if (unit === '分享装') return unit;
    if (/^[一两二三四五六七八九十0-9]/.test(unit)) return unit;
    return '1' + unit;
  }

  function renderPortionBody() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'portion') return '';
    const q = sd.query || '';
    if (sd.tab === 'hand') {
      return '<div class="hand-grid">' + HAND_GUIDE.map(h =>
        '<div class="hand-card"><div class="h">' + esc(h[0]) + '</div><div class="g">' + esc(h[1]) + '</div><div class="s">' + esc(h[2]) + '</div></div>').join('') + '</div>' +
        '<div class="notebox">手掌、拳头按普通成年女性估；手大或手小会上下浮动约 20%。这套方法适合日常记录，不需要每顿称重。</div>';
    }
    if (sd.tab === 'units') {
      const rows = portionUnits(q);
      return '<div class="portion-list">' + (rows.length ? rows.map(u =>
        '<div class="portion-row"><span class="n">' + esc(u.n) + '</span><span class="u">' + esc(unitText(u.unit)) + '</span><span class="g">≈ ' + u.g + 'g</span>' + (u.note ? '<span class="s">' + esc(u.note) + '</span>' : '') + '</div>').join('')
        : '<div class="cart-empty">没有匹配的常见单位，试试「碗」「个」「把」「杯」。</div>') + '</div>' +
        '<div class="notebox">这些是常见家用份量的中位数。同一碗饭，小碗 150g、大碗 250g，差很多；拿不准就选小碗。</div>';
    }
    const all = buildDishCatalog();
    const list = q ? dishSuggestions(q, 'all', 20) : all.slice().sort((a, b) => (b.pop - a.pop) || (a.n.length - b.n.length)).slice(0, 16);
    return '<div class="portion-list">' + list.map(d => {
      const p = portionForCatalog(d);
      return '<button class="portion-row catalog" data-act="portion-dish" data-name="' + esc(d.n) + '"><span class="n">' + esc(d.n) + '</span>' +
        '<span class="u">1' + p.unit + '</span><span class="g">≈ ' + p.grams + 'g</span><span class="k">' + fmt(p.kcal) + ' kcal</span><span class="a">估算 →</span></button>';
    }).join('') + '</div>' +
      '<div class="notebox">这里的“1 份”是该菜/零食的默认份量，可直接点进估算页按这个份量记录。共 ' + fmt(all.length) + ' 条。</div>';
  }

  function openPortionSheet() {
    state.sheetData = { type: 'portion', tab: 'hand', query: '' };
    openSheet(
      sheetHead('份量参照', '手、碗、杯、包装都能估 · 不用每顿称重') +
      '<div class="sheet-body">' +
        '<div class="seg portion-tabs">' +
          '<button data-act="portion-tab" data-v="hand" class="on">手 / 餐具</button>' +
          '<button data-act="portion-tab" data-v="units">常见一份</button>' +
          '<button data-act="portion-tab" data-v="catalog">整份菜 / 零食</button>' +
        '</div>' +
        '<div class="search-box" id="portionSearchWrap" style="margin-top:10px;display:none">' + icon('search') + '<input class="input" id="portionSearch" placeholder="搜索食物，如 米饭 / 鸡蛋 / 薯片" autocomplete="off"></div>' +
        '<div id="portionBody" style="margin-top:10px">' + renderPortionBody() + '</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">知道了</button></div>',
      'portion'
    );
  }

  function setPortionTab(tab) {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'portion') return;
    sd.tab = tab;
    const seg = $('.portion-tabs');
    if (seg) $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === tab));
    const wrap = $('#portionSearchWrap');
    if (wrap) wrap.style.display = tab === 'hand' ? 'none' : '';
    const body = $('#portionBody');
    if (body) body.innerHTML = renderPortionBody();
  }

  function portionSuggestionsFor(name, grams, isDish) {
    const q = String(name || '').replace(/（.*?）/g, '').trim();
    const out = [];
    if (!isDish) {
      PORTION_UNITS.filter(u => u.n && (q.indexOf(u.n) === 0 || u.n.indexOf(q) === 0)).slice(0, 4).forEach(u => out.push({ label: unitText(u.unit), grams: u.g, note: u.n }));
    }
    if (grams > 0) {
      out.push({ label: '整份', grams: Math.round(grams), note: '' });
      out.push({ label: '半份', grams: Math.round(grams / 2), note: '' });
    }
    const seen = new Set();
    return out.filter(x => x.grams > 0 && !seen.has(x.grams) && seen.add(x.grams)).slice(0, 6);
  }

  /* ---------- 智能工具：共享 ---------- */
  const TOOL_ITEMS = [
    ['open-planner', 'spark', '配这一餐', '按剩余预算组合'],
    ['open-daily', 'book', '一日三餐', '早中晚 + 购物清单'],
    ['open-dining', 'camera', '外卖 / 聚餐', '点单前后都能估'],
    ['open-fridge', 'scale', '冰箱库存', '入库 · 扣减 · 临期'],
    ['open-weekly', 'check', '一周复盘', '7 天趋势与建议'],
    ['open-control-cal', 'flame', '三控日历', '30 天达标热力图'],
    ['open-quicklog', 'chat', '一句话快记', '“两个鸡蛋一杯牛奶”'],
    ['open-metabolism', 'info', '代谢实验室', '预算是怎么算的']
  ];

  function renderToolsCard() {
    return '<section class="card tools-card"><div class="cc-head"><div><div class="eyebrow">智能工具</div><div class="cc-title">计划、复盘与快记</div></div><span class="badge">全本地</span></div>' +
      '<div class="tool-grid">' + TOOL_ITEMS.filter(t => isFull() || t[0] !== 'open-fridge').map(t =>
        '<button class="tool-tile" data-act="' + t[0] + '"><span class="t-ic">' + icon(t[1]) + '</span><span class="t-t"><b>' + t[2] + '</b><em>' + t[3] + '</em></span><span class="t-a">→</span></button>').join('') + '</div></section>';
  }

  function exactCatalog(name) {
    const q = normDish(name);
    return buildDishCatalog().find(d => normDish(d.n) === q || (d.a || []).some(a => normDish(a) === q)) || null;
  }

  function itemFromCatalog(d, grams) {
    const g = grams || d.grams;
    const scale = g / d.grams;
    if (d.serve) {
      const s = d.serve;
      return {
        d: d, grams: g, name: d.n, meal: null,
        kcal: Math.round(s.kcal * scale), p: s.p * scale, c: s.c * scale, f: s.f * scale, fib: s.fib * scale,
        control: {
          sugar: round1((d.control.sugar || 0) * scale), oil: round1((d.control.oil || 0) * scale),
          salt: round1((d.control.salt || 0) * scale), sodium: Math.round((d.control.sodium || 0) * scale)
        }
      };
    }
    const comps = d.c.map(p => [p[0], p[1] * scale]);
    const t = compTotals(comps);
    return {
      d: d, grams: t.grams, name: d.n, meal: null,
      kcal: t.kcal, p: t.p, c: t.c, f: t.f, fib: t.fib, control: t.control, comps: comps
    };
  }

  function entryFromItem(it, date, meal) {
    const g = it.grams;
    return {
      id: uid(), date: date, meal: meal, name: it.name, grams: g,
      per100: { kcal: it.kcal / g * 100, p: it.p / g * 100, c: it.c / g * 100, f: it.f / g * 100, fib: it.fib / g * 100 },
      kcal: it.kcal, p: round1(it.p), c: round1(it.c), f: round1(it.f), fib: round1(it.fib),
      conf: it.d && it.d.conf === 'high' ? 'med' : 'low', source: 'dish', estimate: true,
      control: it.control,
      sugar: it.control.sugar, oil: it.control.oil, salt: it.control.salt, sodium: it.control.sodium,
      components: it.comps ? it.comps.map(p => {
        const f = ingOf(p[0]);
        return f ? { name: f.n, grams: Math.round(p[1]), kcal: Math.round(f.kcal * p[1] / 100), p: round1(f.p * p[1] / 100) } : null;
      }).filter(Boolean) : [{ name: '整份', grams: g, kcal: it.kcal, p: round1(it.p) }],
      createdAt: Date.now()
    };
  }

  function addItemsToMeals(items, date, defaultMeal, label) {
    const before = DB.entries.length;
    const clones = items.map(it => entryFromItem(it, date, it.meal || defaultMeal));
    DB.entries.push.apply(DB.entries, clones);
    if (!commit(() => { DB.entries.length = before; })) return 0;
    const pd = pantryAutoDeduct(clones);
    if (pd.any) saveDB(true);
    logChange(label + ' · ' + clones.length + ' 项', { kind: 'batch', items: clones });
    closeSheet();
    renderActive();
    return clones.length;
  }

  function mealTotals(items) {
    return items.reduce((s, it) => {
      s.kcal += it.kcal; s.p += it.p; s.c += it.c; s.f += it.f; s.fib += it.fib;
      s.sugar += it.control.sugar; s.oil += it.control.oil; s.salt += it.control.salt;
      return s;
    }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0, sugar: 0, oil: 0, salt: 0 });
  }

  function fitStaple(items, target) {
    const total = mealTotals(items).kcal;
    if (total <= target * 1.05) return items;
    const idx = items.findIndex(it => /米饭|杂粮饭|糙米饭|面条|汤面|拌面|炒面|盖面|凉面|米线|河粉|米粉|红薯|玉米/.test(it.name) && it.grams >= 120);
    if (idx < 0) return items;
    const it = items[idx];
    const perG = it.kcal / it.grams;
    const cut = Math.min(it.grams - 100, Math.ceil((total - target) / perG / 10) * 10);
    if (cut <= 0) return items;
    const repl = itemFromCatalog(it.d, it.grams - cut);
    repl.meal = it.meal;
    items[idx] = repl;
    return items;
  }

  /* ---------- 一日三餐 ---------- */
  const DAILY_TEMPLATES = {
    breakfast: [
      [['豆浆', 300], ['油条']],
      [['牛奶', 250], ['全麦面包', 50], ['水煮蛋', 100]],
      [['白粥', 150], ['水煮蛋', 100], ['清炒时蔬', 250]],
      [['酸奶', 200], ['全麦面包', 50], ['香蕉', 120]]
    ],
    lunch: [
      [['白米饭', 200], ['番茄炒蛋'], ['清炒时蔬', 250]],
      [['番茄鸡蛋汤面'], ['凉拌黄瓜', 200]],
      [['黄焖鸡米饭'], ['蒜蓉西兰花', 200]],
      [['白米饭', 200], ['清蒸鲈鱼'], ['蒜蓉西兰花', 200]],
      [['牛肉面'], ['凉拌黄瓜', 200]]
    ],
    dinner: [
      [['白米饭', 150], ['宫保鸡丁'], ['清炒时蔬', 250]],
      [['杂粮饭', 150], ['白灼虾'], ['蒜蓉西兰花', 200]],
      [['麻婆豆腐'], ['白米饭', 150], ['清炒时蔬', 250]],
      [['番茄鸡蛋汤面'], ['凉拌黄瓜', 200]],
      [['烤红薯'], ['清蒸鲈鱼'], ['凉拌黄瓜', 200]]
    ]
  };

  const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

  function resolveTemplate(tpl, meal) {
    const items = tpl.map(p => {
      const d = exactCatalog(p[0]);
      return d ? itemFromCatalog(d, p[1] || d.grams) : null;
    }).filter(Boolean);
    items.forEach(it => { it.meal = meal; });
    return items;
  }

  function pickMealPlan(meal, target, seed) {
    const cands = DAILY_TEMPLATES[meal].map(tpl => {
      const items = resolveTemplate(tpl, meal);
      return { items: items, kcal: mealTotals(items).kcal };
    }).filter(x => x.items.length);
    cands.sort((a, b) => Math.abs(a.kcal - target) - Math.abs(b.kcal - target));
    const pick = cands[(seed + (meal === 'lunch' ? 1 : meal === 'dinner' ? 2 : 0)) % Math.min(3, cands.length)] || cands[0];
    return fitStaple(pick.items.slice(), target);
  }

  function buildDailyPlan(seed) {
    const st = snapshot(E.todayKey());
    const budget = (st && st.budget) || 1600;
    const proteinTarget = st ? st.t.protein : 70;
    const plan = {
      breakfast: pickMealPlan('breakfast', budget * 0.26, seed),
      lunch: pickMealPlan('lunch', budget * 0.4, seed),
      dinner: pickMealPlan('dinner', budget * 0.32, seed)
    };
    return { budget: budget, proteinTarget: proteinTarget, meals: plan, total: mealTotals(plan.breakfast.concat(plan.lunch, plan.dinner)) };
  }

  function planMealHtml(meal, items, budget) {
    const t = mealTotals(items);
    return '<div class="plan-meal"><div class="pm-head"><span class="pm-name">' + MEAL_LABELS[meal] + '</span><span class="pm-k">' + fmt(t.kcal) + ' kcal · 蛋白 ' + round1(t.p) + 'g</span>' +
      '<button class="btn-quiet tiny" data-act="plan-meal-shuffle" data-meal="' + meal + '">换一换</button></div>' +
      '<div class="pm-items">' + items.map(it =>
        '<div class="pm-row"><span class="n">' + esc(it.name) + '</span><span class="g">' + Math.round(it.grams) + 'g</span><span class="k">' + fmt(it.kcal) + ' kcal</span></div>').join('') + '</div></div>';
  }

  function renderDailyPlan() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'daily') return '';
    const plan = sd.plan;
    const total = plan.total;
    const over = total.kcal > plan.budget;
    const saltHigh = total.salt > 5;
    return '<div class="plan-hero"><div class="ph-row"><span>全天计划</span><span class="badge ' + (over ? '' : 'high') + '">' + (over ? '略超预算' : '在预算内') + '</span></div>' +
      '<div class="plan-big">' + fmt(total.kcal) + '<small> / ' + fmt(plan.budget) + ' kcal</small></div>' +
      '<div class="plan-macros">蛋白 ' + round1(total.p) + 'g / ' + round1(plan.proteinTarget) + 'g · 纤维 ' + round1(total.fib) + 'g</div>' +
      '<div class="plan-macros">三控：糖 ' + round1(total.sugar) + 'g · 油 ' + round1(total.oil) + 'g · 盐 ' + round1(total.salt) + 'g' + (saltHigh ? ' · 盐偏高，少酱汁' : '') + '</div></div>' +
      planMealHtml('breakfast', plan.meals.breakfast, plan.budget) +
      planMealHtml('lunch', plan.meals.lunch, plan.budget) +
      planMealHtml('dinner', plan.meals.dinner, plan.budget) +
      '<div class="notebox">按今日预算自动搭配，默认份量可以直接记入。每餐可单独换一换；总热量偏高时会自动减主食。食材估算为参考值。</div>';
  }

  function openDailyPlan() {
    state.sheetData = { type: 'daily', seed: 0 };
    state.sheetData.plan = buildDailyPlan(0);
    openSheet(
      sheetHead('一日三餐', '按今日预算搭配 · 可换一换 · 可生成购物清单') +
      '<div class="sheet-body" id="dailyBody">' + renderDailyPlan() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="daily-shuffle">换一天</button><button class="btn btn-ghost" data-act="daily-shop">购物清单</button><button class="btn btn-primary" data-act="daily-log">记入三餐</button></div>',
      'daily'
    );
  }

  function dailyShopList() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'daily') return [];
    const all = sd.plan.meals.breakfast.concat(sd.plan.meals.lunch, sd.plan.meals.dinner);
    const merged = {};
    all.forEach(it => {
      if (it.comps && it.comps.length) {
        it.comps.forEach(p => {
          if (['盐', '酱油', '植物油', '白砂糖', '蚝油', '豆瓣酱'].indexOf(p[0]) >= 0) return;
          const f = DISH_ING[p[0]];
          if (!f) return;
          const key = f.n;
          merged[key] = (merged[key] || 0) + p[1];
        });
      } else merged[it.name] = (merged[it.name] || 0) + it.grams;
    });
    return Object.keys(merged).map(k => ({ name: k, grams: Math.round(merged[k]), checked: false }))
      .sort((a, b) => a.name < b.name ? -1 : 1);
  }

  /* ============================================================
     v4.1 · 三餐推荐（规则组合 + 估算）
     ============================================================ */
  const RECO_MEALS = [
    { key: 'breakfast', label: '早餐', share: 0.25 },
    { key: 'lunch', label: '午餐', share: 0.40 },
    { key: 'dinner', label: '晚餐', share: 0.35 }
  ];
  const RECO_MEAT = /肉|鸡|鸭|鹅|鱼|虾|蟹|贝|排骨|牛|羊|火腿|培根|香肠|腊|肝|肚|蹄|翅/;
  const RECO_PLANT = /豆腐|豆干|豆皮|腐竹|毛豆|鹰嘴豆|豆浆|牛奶|酸奶|鸡蛋|蛋/;
  const RECO_SWEET = /蛋糕|蛋挞|蛋卷|饼干|布丁|奶昔|冰淇淋|雪糕|蛋仔|糖/;
  const RECO_STAPLE = /米饭|炒饭|拌饭|盖饭|饭团|寿司|煲仔饭|粥|面|粉|米线|河粉|馄饨|饺|锅贴|包子|馒头|花卷|烧麦|糯米鸡|吐司|面包|贝果|三明治|燕麦|红薯|玉米|南瓜|紫薯|山药|藜麦|糙米|杂粮|油条|煎饼|手抓饼|鸡蛋灌饼|葱油饼|烧饼|馍|饼/;
  const RECO_VEG = /菜|心|瓜|菇|蘑|笋|茄|萝卜|土豆|豆角|豆芽|豆苗|木耳|银耳|海带|紫菜|藕|山药|秋葵|芦笋|青椒|洋葱|番茄|西红柿|西兰花|菠菜|芹菜|韭菜|生菜|白菜|甘蓝|南瓜|冬瓜|丝瓜|苦瓜|莴笋|芋|玉米|荷兰豆|豌豆|毛豆|金针菇|杏鲍菇|香菇|平菇|口蘑|竹笋/;
  const RECO_HEAVY = /炸|煎|红烧|糖醋|干锅|香辣|麻辣|孜然|烧烤|回锅|油焖|爆炒|水煮|卤|酱爆|椒盐|干煸|糖|蜜汁|奶油/;

  function recoPrefOn(k) { return !!(DB.reco && DB.reco.prefs && DB.reco.prefs[k]); }
  function recoPrefKey() {
    const p = DB.reco.prefs;
    return [p.veg, p.lowcarb, p.highprotein, p.light].map(x => (x ? 1 : 0)).join('');
  }
  function recoIsProtein(n) { return RECO_MEAT.test(n) || RECO_PLANT.test(n); }
  function recoIsDessert(n) { return RECO_SWEET.test(n); }
  function recoHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function recoRng() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return a[0] / 4294967296;
    } catch (e) { return Math.random(); }
  }

  let RECO_CACHE = null;
  function recoCandidates() {
    const key = recoPrefKey() + '|' + pantrySig();
    if (RECO_CACHE && RECO_CACHE.key === key) return RECO_CACHE;
    const all = buildDishCatalog();
    const prefs = DB.reco.prefs;
    const passBase = d => (d.cat === 'home' || d.cat === 'light' || d.cat === 'staple' || d.cat === 'breakfast' || d.cat === 'soup' || d.cat === 'fruit') && !recoIsDessert(d.n);
    const staples = [], proteins = [], vegs = [], extras = [];
    all.forEach(d => {
      if (!passBase(d) || !d.grams) return;
      const n = d.n;
      if (prefs.veg && RECO_MEAT.test(n)) return;
      if (prefs.light && RECO_HEAVY.test(n)) return;
      const isStaple = RECO_STAPLE.test(n) && d.cat !== 'fruit';
      const isSoup = d.cat === 'soup' && /汤|羹/.test(n);
      const isFruit = d.cat === 'fruit';
      const isProtein = recoIsProtein(n) && !isStaple && !isSoup && !isFruit;
      const isVeg = RECO_VEG.test(n) && !isProtein && !isStaple && !isSoup && !isFruit;
      if (isStaple) {
        if (prefs.lowcarb && !/红薯|玉米|南瓜|紫薯|山药|藜麦|糙米|杂粮|燕麦|全麦|荞麦|紫米|红豆|绿豆/.test(n)) return;
        staples.push(d);
      } else if (isProtein) {
        if (prefs.highprotein && d.p < 10) return;
        proteins.push(d);
      } else if (isVeg) {
        vegs.push(d);
      } else if (isSoup || isFruit) {
        extras.push(d);
      }
    });
    const pstock = pantryStockSet();
    all.forEach(d => {
      d.pantryScore = pstock.size ? (d.c || []).reduce((s, p) => s + (pstock.has(pantryCanon(p[0])) ? 1 : 0), 0) : 0;
    });
    const byPop = (a, b) => (b.pantryScore || 0) - (a.pantryScore || 0) || (b.pop || 0) - (a.pop || 0) || (a.n < b.n ? -1 : 1);
    staples.sort(byPop); proteins.sort(byPop); vegs.sort(byPop); extras.sort(byPop);
    const uniq = arr => {
      const seen = {}, out = [];
      arr.forEach(d => { const k = normDish(d.n); if (!seen[k]) { seen[k] = 1; out.push(d); } });
      return out;
    };
    const data = {
      key: key,
      staples: uniq(staples), proteins: uniq(proteins), vegs: uniq(vegs), extras: uniq(extras),
      pool: null, poolSize: 0
    };
    RECO_CACHE = data;
    return data;
  }

  /* v4.3：每餐 1,180 套，合计 3,540 套；生成时去重（同名菜顺序不同算同一组），
     并按餐次热量区间过滤：早 300–600 / 午 500–900 / 晚 450–800 kcal。
     组合只在内存里按需生成（懒加载），不写 localStorage。 */
  const RECO_POOL_TARGET = 1180;
  const RECO_KCAL_RANGE = { breakfast: [300, 600], lunch: [500, 900], dinner: [450, 800] };
  function recoPoolRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function recoMealPools(cands, meal) {
    let S = cands.staples, P = cands.proteins, V = cands.vegs, X = cands.extras;
    if (meal === 'breakfast') {
      const bs = S.filter(d => d.cat === 'breakfast' || /粥|馒头|包|吐司|面包|贝果|三明治|燕麦|红薯|玉米|煎饼|手抓饼|鸡蛋灌饼|蒸饺|水饺|馄饨|肠粉|花卷|烧麦/.test(d.n));
      const bp = P.filter(d => /蛋|豆浆|牛奶|酸奶|豆腐脑|培根|火腿|鸡|金枪鱼/.test(d.n));
      const bv = V.filter(d => /黄瓜|番茄|生菜|时蔬|菠菜|西兰花|蔬菜|沙拉|凉拌|番茄|南瓜/.test(d.n));
      if (bs.length >= 8) S = bs;
      if (bp.length >= 5) P = bp;
      if (bv.length >= 5) V = bv;
    }
    if (!S.length || !P.length || !V.length) return [];
    const range = RECO_KCAL_RANGE[meal] || RECO_KCAL_RANGE.lunch;
    const extraSet = meal === 'breakfast'
      ? X.filter(d => d.cat === 'fruit' || /豆浆|牛奶|酸奶|汤/.test(d.n))
      : X;
    const xs = extraSet.length ? extraSet : X;
    const rng = recoPoolRng(meal === 'breakfast' ? 0x9E3779B1 : meal === 'lunch' ? 0x85EBCA77 : 0xC2B2AE3D);
    const prior = arr => arr.filter(d => (d.pantryScore || 0) > 0);
    const Sp = prior(S), Pp = prior(P), Vp = prior(V);
    const pick = (arr, pri) => (pri.length && rng() < 0.72) ? pri[(rng() * pri.length) | 0] : arr[(rng() * arr.length) | 0];
    const out = [], seen = {};
    const maxTry = 90000;
    for (let k = 0; k < maxTry && out.length < RECO_POOL_TARGET; k++) {
      const sd0 = pick(S, Sp);
      const pd0 = pick(P, Pp);
      const v1 = pick(V, Vp);
      const f = 0.92 + rng() * 0.16;
      const refs = [
        [sd0, Math.max(30, Math.round(sd0.grams * f / 10) * 10)],
        [pd0, Math.max(30, Math.round(pd0.grams * (meal === 'breakfast' ? 0.9 : 0.8) * f / 10) * 10)],
        [v1, Math.max(30, Math.round(v1.grams * f / 10) * 10)]
      ];
      const roll = rng();
      if (roll < 0.62) {
        if (xs.length) {
          const x = xs[(rng() * xs.length) | 0];
          refs.push([x, Math.max(30, Math.round(x.grams * f / 10) * 10)]);
        } else {
          const v2 = V[(rng() * V.length) | 0];
          if (normDish(v2.n) !== normDish(v1.n)) refs.push([v2, Math.max(30, Math.round(v2.grams * f / 10) * 10)]);
        }
      }
      if (roll < 0.26 && V.length > 2) {
        const v3 = V[(rng() * V.length) | 0];
        if (!refs.some(r => normDish(r[0].n) === normDish(v3.n))) {
          refs.push([v3, Math.max(30, Math.round(v3.grams * f / 10) * 10)]);
        }
      }
      if (refs.length < 3) continue;
      const items = refs.slice(0, 5).map(r => itemFromCatalog(r[0], r[1])).filter(Boolean);
      if (items.length < 3 || items.length > 5) continue;
      const kcal = items.reduce((s, it) => s + it.kcal, 0);
      if (kcal < range[0] || kcal > range[1]) continue;
      const sig = items.map(it => normDish(it.name)).sort().join('+');
      if (seen[sig]) continue;
      seen[sig] = 1;
      out.push({ meal: meal, sig: sig, kcal: Math.round(kcal), items: items });
    }
    return out;
  }

  function recoPools() {
    const c = recoCandidates();
    if (!c.pool) {
      const b = recoMealPools(c, 'breakfast');
      const l = recoMealPools(c, 'lunch');
      const dn = recoMealPools(c, 'dinner');
      c.pool = { breakfast: b, lunch: l, dinner: dn };
      c.poolSize = b.length + l.length + dn.length;
    }
    return c;
  }

  function recoMealTargets(st) {
    const remain = Math.max(0, st.remain);
    const base = remain > 200 ? remain : st.budget;
    return {
      kcal: {
        breakfast: Math.round(base * 0.25),
        lunch: Math.round(base * 0.4),
        dinner: Math.round(base * 0.35)
      },
      protein: Math.max(0, st.t.protein - st.sum.p),
      base: base,
      usingRemain: remain > 200
    };
  }

  function recoScale(items, target) {
    const k = items.reduce((s, it) => s + it.kcal, 0);
    if (!k) return items;
    const f = clamp(target / k, 0.6, 1.5);
    return items.map(it => itemFromCatalog(it.d, Math.max(30, Math.round(it.grams * f / 10) * 10)));
  }

  function recoTotals(items) {
    return items.reduce((s, it) => {
      s.kcal += it.kcal; s.p += it.p; s.c += it.c; s.f += it.f; s.fib += it.fib;
      return s;
    }, { kcal: 0, p: 0, c: 0, f: 0, fib: 0 });
  }

  function recoPickSets(meal, target, attempt, n) {
    const c = recoPools();
    const pool = c.pool[meal] || [];
    let seen = new Set(DB.reco.seen || []);
    let cands = pool.filter(x => !seen.has(x.sig));
    if (cands.length < n * 2) {
      // 池子被看完了才释放，界面上会提示，避免静默重复
      DB.reco.seen = [];
      saveDB(true);
      seen = new Set();
      cands = pool.slice();
    }
    const scored = cands.map(x => {
      const k = x.items.reduce((s, it) => s + it.kcal, 0);
      const jitter = (recoHash(x.sig + ':' + attempt) % 9) * 18;
      const ps = x.items.reduce((s, it) => s + ((it.d && it.d.pantryScore) || 0), 0);
      return { x: x, score: Math.abs(k - target) + jitter - ps * 120 };
    }).sort((a, b) => a.score - b.score || (a.x.sig < b.x.sig ? -1 : 1));
    const out = [], usedS = {}, usedP = {};
    /* 库存优先：把“用到库存食材最多、蛋白最高”的一套放到首位，其余仍按热量接近度排序 */
    if (isFull()) {
      const ps = scored.filter(o => o.x.items.some(it => it.d && (it.d.pantryScore || 0) > 0));
      ps.sort((a, b) => {
        const sa = a.x.items.reduce((s, it) => s + ((it.d && it.d.pantryScore) || 0), 0);
        const sb = b.x.items.reduce((s, it) => s + ((it.d && it.d.pantryScore) || 0), 0);
        const pa = (a.x.items[1] && a.x.items[1].p) || 0, pb = (b.x.items[1] && b.x.items[1].p) || 0;
        return sb - sa || pb - pa || a.score - b.score;
      });
      if (ps.length) {
        const x = ps[0].x;
        const sName = x.items[0] ? x.items[0].name : '', pName = x.items[1] ? x.items[1].name : '';
        out.push(x);
        usedS[sName] = 1;
        usedP[pName] = 1;
      }
    }
    for (let i = 0; i < scored.length && out.length < n; i++) {
      const x = scored[i].x;
      if (out.indexOf(x) >= 0) continue;
      const sName = x.items[0] ? x.items[0].name : '';
      const pName = x.items[1] ? x.items[1].name : '';
      if ((usedS[sName] || 0) >= 2 || (usedP[pName] || 0) >= 3) continue;
      usedS[sName] = (usedS[sName] || 0) + 1;
      usedP[pName] = (usedP[pName] || 0) + 1;
      out.push(x);
    }
    for (let i = 0; i < scored.length && out.length < n; i++) {
      if (out.indexOf(scored[i].x) < 0) out.push(scored[i].x);
    }
    return out.map((x, i) => {
      const items = recoScale(x.items, target);
      const t = recoTotals(items);
      return {
        sig: x.sig, idx: i, items: items, kcal: Math.round(t.kcal),
        p: round1(t.p), c: round1(t.c), f: round1(t.f), fib: round1(t.fib)
      };
    });
  }

  function recoMarkSeen(sets) {
    const list = DB.reco.seen || (DB.reco.seen = []);
    sets.forEach(s => { if (list.indexOf(s.sig) < 0) list.push(s.sig); });
    DB.reco.seen = list.slice(-500);
    saveDB(true);
  }

  function recoBuildPlan(attemptSeed) {
    const st = snapshot(E.todayKey());
    const targets = recoMealTargets(st);
    const seed = attemptSeed == null ? 0 : attemptSeed;
    const sets = {};
    RECO_MEALS.forEach(m => {
      sets[m.key] = recoPickSets(m.key, targets.kcal[m.key], seed + (m.key === 'lunch' ? 1 : m.key === 'dinner' ? 2 : 0), 5);
      recoMarkSeen(sets[m.key]);
    });
    return { st: st, targets: targets, sets: sets, seed: seed, attempts: { breakfast: 0, lunch: 0, dinner: 0 } };
  }

  function recoMissHtml(it) {
    if (!isFull() || !it || !it.d) return '';
    const stock = pantryStockSet();
    if (!stock.size) return '';
    const comps = (it.d.c || []).map(p => p[0]).filter(k => PANTRY_SEASON.indexOf(k) < 0);
    const uniq = comps.filter((k, i) => comps.indexOf(k) === i);
    if (!uniq.length) return '';
    const have = uniq.filter(k => stock.has(pantryCanon(k)));
    const miss = uniq.filter(k => !stock.has(pantryCanon(k)));
    if (!have.length || !miss.length) return '';
    return '<span class="reco-miss">缺 ' + miss.slice(0, 2).map(esc).join('、') + '</span>';
  }
  function recoSetHtml(meal, set, i) {
    return '<div class="reco-set" data-sig="' + esc(set.sig) + '" data-kcal="' + set.kcal + '" data-p="' + set.p + '">' +
      '<div class="rs-head"><span class="rs-n">搭配 ' + (i + 1) + '</span><span class="rs-k">' + fmt(set.kcal) + ' kcal · 蛋白 ' + set.p + 'g</span></div>' +
      '<div class="rs-items">' + set.items.map(it =>
        '<span class="reco-item"><b>' + esc(it.name) + '</b><em>' + Math.round(it.grams) + 'g</em><i>' + fmt(it.kcal) + '</i>' + recoMissHtml(it) + '</span>').join('') +
      '</div>' +
      '<div class="rs-foot"><button class="btn btn-ghost btn-sm" data-act="reco-cart" data-meal="' + meal + '" data-i="' + i + '">加入购物车</button>' +
      '<button class="btn btn-primary btn-sm" data-act="reco-log" data-meal="' + meal + '" data-i="' + i + '">记入这一餐</button></div>' +
    '</div>';
  }

  function recoMealHtml(meal, sets, target, attempt) {
    const m = RECO_MEALS.find(x => x.key === meal);
    return '<section class="reco-meal" data-meal="' + meal + '">' +
      '<div class="rm-head"><div><div class="rm-name">' + m.label + '</div><div class="rm-target">目标 ' + fmt(target) + ' kcal · ' + sets.length + ' 套</div></div>' +
        '<button class="btn-quiet tiny" data-act="reco-swap" data-meal="' + meal + '">换一换 ↻</button></div>' +
      '<div class="reco-sets">' + sets.map((s, i) => recoSetHtml(meal, s, i)).join('') + '</div>' +
    '</section>';
  }

  function renderReco() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'reco') return '';
    const p = sd.plan;
    const st = p.st;
    const targets = p.targets;
    const firsts = RECO_MEALS.map(m => p.sets[m.key][0]).filter(Boolean);
    const planKcal = firsts.reduce((s, x) => s + x.kcal, 0);
    const planP = firsts.reduce((s, x) => s + x.p, 0);
    const diff = st.remain - planKcal;
    const pool = recoPools();
    const prefs = DB.reco.prefs;
    const chips = [['veg', '素食'], ['lowcarb', '低碳'], ['highprotein', '高蛋白'], ['light', '清淡']].map(x =>
      '<button class="chip' + (prefs[x[0]] ? ' on' : '') + '" data-act="reco-pref" data-v="' + x[0] + '">' + x[1] + '</button>').join('');
    return '<div class="reco-hero">' +
        '<div class="rh-row"><span class="rh-k">今日剩余预算</span><span class="rh-v">' + fmt(Math.max(0, st.remain)) + ' kcal</span></div>' +
        '<div class="rh-row"><span class="rh-k">蛋白质缺口</span><span class="rh-v">' + round1(targets.protein) + 'g</span></div>' +
        '<div class="rh-row"><span class="rh-k">三餐目标（25/40/35）</span><span class="rh-v">' + fmt(targets.kcal.breakfast) + ' / ' + fmt(targets.kcal.lunch) + ' / ' + fmt(targets.kcal.dinner) + '</span></div>' +
        '<div class="rh-note">' + (st.sum.count ? '按剩余预算分配；' : '今天还没记录，按全天预算分配；') + '组合池 ' + pool.poolSize + ' 组 · 营养值为估算</div>' +
      '</div>' +
      '<div class="reco-prefs"><span class="rp-k">偏好</span>' + chips + '</div>' +
      '<div class="reco-plan"><div class="rp-head"><span>今日推荐方案</span><span class="rp-k">' + fmt(planKcal) + ' kcal · 蛋白 ' + round1(planP) + 'g</span></div>' +
        '<div class="rp-row">' + RECO_MEALS.map(m => {
          const s = p.sets[m.key][0];
          return '<span class="rp-cell"><b>' + m.label + '</b><em>' + (s ? s.items.slice(0, 2).map(it => it.name).join('、') : '—') + '</em></span>';
        }).join('') + '</div>' +
        '<div class="rp-diff">方案合计 ' + fmt(planKcal) + ' kcal，与剩余预算差 ' + (diff >= 0 ? '+' : '−') + fmt(Math.abs(diff)) + ' kcal（份量可再调）</div>' +
      '</div>' +
      RECO_MEALS.map(m => recoMealHtml(m.key, p.sets[m.key], targets.kcal[m.key], p.attempts[m.key])).join('') +
      '<div class="notebox">每套 3–5 道，含主食、蛋白、蔬菜、汤或水果；「换一换」会避开你已看过的组合。营养值为按食材与家常配比估算，不是营养师方案。</div>';
  }

  function paintReco() {
    const body = $('#recoBody');
    if (body) body.innerHTML = renderReco();
  }

  function openRecoSheet(opts) {
    const o = opts || {};
    const randomPlan = !!(o.random || (state.sheetData && state.sheetData.randomOnce));
    const attempt = randomPlan ? (recoRng() * 100000 | 0) : 0;
    state.sheetData = { type: 'reco', plan: recoBuildPlan(attempt), randomOnce: false };
    openSheet(
      sheetHead('今天吃什么', '一人三餐 · 早/午/晚 · 按剩余预算搭配 · 估算值') +
      '<div class="sheet-body" id="recoBody">' + renderReco() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="reco-random">随便来一套</button>' +
      '<button class="btn btn-primary" data-act="reco-log-plan">按方案记入三餐</button></div>',
      'reco'
    );
  }

  function recoSwap(meal) {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'reco') return;
    const p = sd.plan;
    p.attempts[meal] = (p.attempts[meal] || 0) + 1;
    const sets = recoPickSets(meal, p.targets.kcal[meal], p.attempts[meal] + p.seed, 5);
    p.sets[meal] = sets;
    recoMarkSeen(sets);
    paintReco();
  }

  function recoRandomAll() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'reco') return;
    const p = sd.plan;
    const seed = (p.seed || 0) + 1 + (recoRng() * 1000 | 0);
    p.seed = seed;
    RECO_MEALS.forEach(m => {
      p.attempts[m.key] = (p.attempts[m.key] || 0) + 1;
      const sets = recoPickSets(m.key, p.targets.kcal[m.key], p.attempts[m.key] + seed, 5);
      p.sets[m.key] = sets;
      recoMarkSeen(sets);
    });
    paintReco();
    toast('已换一整套三餐方案');
  }

  function recoSetAt(meal, i) {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'reco') return null;
    const arr = sd.plan.sets[meal];
    return arr ? arr[i] : null;
  }

  function recoFoodOf(it) {
    const g = Math.max(1, it.grams);
    return {
      id: 'reco:' + normDish(it.name), name: it.name,
      kcal: it.kcal / g * 100, p: it.p / g * 100, c: it.c / g * 100, f: it.f / g * 100, fib: it.fib / g * 100,
      cat: 0, catName: '三餐推荐', unitG: 0, unit: '', custom: true
    };
  }

  function recoToCart(meal, i) {
    const set = recoSetAt(meal, i);
    if (!set) return;
    openFoodSheet({
      date: E.todayKey(), meal: meal,
      cart: set.items.map(it => ({ food: recoFoodOf(it), grams: Math.max(1, it.grams) }))
    });
  }

  function recoLog(meal, i) {
    const set = recoSetAt(meal, i);
    if (!set) return;
    const n = addItemsToMeals(set.items, E.todayKey(), meal, '三餐推荐记入');
    if (n) toast('已记入' + E.mealLabel(meal) + ' · ' + fmt(set.kcal) + ' kcal（估算）');
  }

  function recoLogPlan() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'reco') return;
    const all = [];
    RECO_MEALS.forEach(m => {
      const s = sd.plan.sets[m.key][0];
      if (s) s.items.forEach(it => all.push(Object.assign({}, it, { meal: m.key })));
    });
    if (!all.length) return;
    const n = addItemsToMeals(all, E.todayKey(), 'breakfast', '三餐推荐·整套记入');
    if (n) toast('已按方案记入 ' + n + ' 项 · ' + fmt(sd.plan.sets.breakfast[0].kcal + sd.plan.sets.lunch[0].kcal + sd.plan.sets.dinner[0].kcal) + ' kcal（估算）');
  }

  /* ============================================================
     v4.1 · 刮卡 / 钱包 / 放纵日
     ============================================================ */
  const SCRATCH_TIER = {
    common: { label: '普通', color: 'slate' },
    rare: { label: '稀有', color: 'blue' },
    legend: { label: '传说', color: 'gold' }
  };
  const SCRATCH_QUOTES = [
    '记下来的一笔，比发誓的一百句更算数。',
    '账本不催你，它只是把昨天的选择摆出来。',
    '今天吃多了也没关系，明天还有一页。',
    '数字是估算，感觉是真的。两样都记。',
    '慢慢来，是在往前走的一种方式。',
    '不用每次都吃得完美，能记下来就已经赢了一半。',
    '预算不是枷锁，是给选择留的余地。',
    '一顿饭说明不了什么，一个月的记录会说话。',
    '饿的时候先喝水，再决定要不要吃。',
    '体重会波动，趋势不会撒谎。',
    '你不是在减肥，你是在学着照顾自己。',
    '今天少记一笔，明天就要多猜一次。',
    '吃饱不等于吃好，吃好也不必吃撑。',
    '把注意力放回身体，数字会自己跟上。',
    '偶尔的超支，不值得用一整周的愧疚来还。',
    '能长期做的，才是对的方案。',
    '别和别人比进度，你只和昨天的自己比。',
    '慢一点吃，饱的信号才追得上你。',
    '每一餐都是一次重新开始的机会。',
    '账本的意义，是让你看见而不是审判你。',
    '休息也是计划的一部分。',
    '不要用明天的饥饿，惩罚今天的放纵。',
    '食物没有好坏，份量才有。',
    '记录不是为了控制，而是为了自由地选择。',
    '今天走了多少步，也算数。',
    '蛋白质吃够，饥饿感会温柔一些。',
    '真正的自律，是允许自己有例外。',
    '一次没记，不代表前功尽弃。',
    '把账本当成朋友，而不是考官。',
    '你已经在做了，这比想象中更重要。'
  ];
  const WISH_POOL = [
    ['炸鸡', '炸鸡'], ['火锅', '火锅'], ['烧烤', '烤肉'], ['披萨', '披萨'], ['薯条', '薯条'],
    ['麻辣香锅', '麻辣香锅'], ['奶油蛋糕', '蛋糕'], ['珍珠奶茶', '珍珠奶茶']
  ];

  function scratchEligible(st) {
    return !!(st && st.sum && st.sum.count > 0);
  }

  const TICKET_SRC = { daily: '每日打卡', m3: '连续 3 天', m7: '连续 7 天', m14: '连续 14 天', m30: '连续 30 天', maint: '维护' };
  const TICKET_MILESTONES = [
    { id: 'm3', days: 3, n: 1 }, { id: 'm7', days: 7, n: 2 },
    { id: 'm14', days: 14, n: 3 }, { id: 'm30', days: 30, n: 4 }
  ];
  function addTicket(source, n, date) {
    const count = Math.max(1, Number(n) || 1);
    const d = date || E.todayKey();
    let added = 0, overflow = 0;
    for (let i = 0; i < count; i++) {
      if (!maintOn() && DB.scratch.tickets.length >= 10) { overflow++; continue; }
      DB.scratch.tickets.push({ id: uid(), source: source, date: d, at: Date.now() });
      added++;
    }
    if (added) saveDB(true);
    return { added: added, overflow: overflow };
  }
  /* ---------- v5.0 扭蛋机 ----------
     池子 = 未解锁顶级皮肤；必中、不重复、无空奖、不出语录，抽中即移出池。
     次数：连续达标里程碑 7/14/21/30 天 → 1/2/3/4 次（一次性），扭蛋币 1:1。
     消耗顺序：先里程碑次数，再扭蛋币（扣币前二次确认）。 */
  const GACHA_MILESTONES = [
    { id: 'g7', days: 7, n: 1 }, { id: 'g14', days: 14, n: 2 },
    { id: 'g21', days: 21, n: 3 }, { id: 'g30', days: 30, n: 4 }
  ];
  function grantGachaMilestones(streak) {
    const days = Math.max(0, Number(streak) || 0);
    let got = 0;
    GACHA_MILESTONES.forEach(function (m) {
      if (days >= m.days && !DB.gacha.milestones[m.id]) {
        DB.gacha.milestones[m.id] = E.todayKey();
        DB.gacha.credits = (Number(DB.gacha.credits) || 0) + m.n;
        got += m.n;
      }
    });
    if (got) {
      saveDB(true);
      toast('扭蛋次数 +' + got + '（连续 ' + days + ' 天里程碑，一次性）');
    }
    return got;
  }
  function gachaPool() {
    /* pending（素材未交付）不进池：宁可少抽一套，也不下发空图 */
    return SKINS.filter(s => s.tier === 'top' && !s.pending && !skinUnlocked(s.id));
  }
  function gachaCredits() { return Math.max(0, Number(DB.gacha.credits) || 0); }
  function gachaPlan(n) {
    const want = Math.max(1, Math.min(5, Number(n) || 1));
    const credits = gachaCredits();
    const useCredits = Math.min(credits, want);
    const needCoins = want - useCredits;
    return { want: want, credits: useCredits, coins: needCoins, enough: (Number(DB.coins) || 0) >= needCoins };
  }
  function performGacha(n) {
    const pool = gachaPool();
    if (!pool.length) return null;
    const want = Math.min(Math.max(1, Number(n) || 1), pool.length);
    const plan = gachaPlan(want);
    plan.want = want;
    if (!plan.enough) return null;
    const picks = [];
    for (let i = 0; i < want; i++) {
      const idx = (recoRng() * pool.length) | 0;
      picks.push(pool.splice(idx, 1)[0]);
    }
    DB.gacha.credits = gachaCredits() - plan.credits;
    DB.coins = (Number(DB.coins) || 0) - plan.coins;
    picks.forEach(function (s) {
      if (!skinUnlocked(s.id)) DB.skins.unlocked.push(s.id);
    });
    const src = (plan.credits && plan.coins) ? ('里程碑 ' + plan.credits + ' · 币 ' + plan.coins) : (plan.credits ? '里程碑' : '币');
    DB.gacha.history.unshift({
      id: uid(), at: Date.now(), n: want, source: src,
      items: picks.map(s => ({ id: s.id, name: s.name }))
    });
    DB.gacha.history = DB.gacha.history.slice(0, 20);
    saveDB(true);
    picks.forEach(function (s) { if (s.art && !s.pending) downloadSkinPack(s.id, { silent: true }); });
    return { plan: plan, want: want, picks: picks, source: src };
  }
  function nextGachaMilestone(streak) {
    return GACHA_MILESTONES.find(function (m) { return !DB.gacha.milestones[m.id]; }) || null;
  }
  function grantMilestones(streak) {
    const got = [];
    TICKET_MILESTONES.forEach(m => {
      if (streak >= m.days && !DB.scratch.milestones[m.id]) {
        DB.scratch.milestones[m.id] = E.todayKey();
        const r = addTicket(m.id, m.n);
        got.push({ id: m.id, days: m.days, n: m.n, added: r.added, overflow: r.overflow });
      }
    });
    if (got.length) {
      saveDB(true);
      const ok = got.filter(g => g.added);
      if (ok.length) toast('里程碑奖励：+' + ok.reduce((s, g) => s + g.added, 0) + ' 张抽奖券');
      const over = got.filter(g => g.overflow);
      if (over.length) toast('抽奖券已达上限 10 张，本次超出未发放');
    }
    grantGachaMilestones(streak);
    return got;
  }
  function nextMilestone(streak) {
    const m = TICKET_MILESTONES.find(x => streak < x.days);
    return m || null;
  }

  function checkScratchEarn(st) {
    const today = E.todayKey();
    if (DB.scratch.lastEarnedDate === today) return false;
    if (!scratchEligible(st)) return false;
    DB.scratch.lastEarnedDate = today;
    const r = addTicket('daily', 1, today);
    if (r.overflow) toast('抽奖券已满 10 张，今日基础卡未发放');
    saveDB(true);
    return r.added > 0;
  }

  /* 刮卡三档：普通 78% / 稀有 19% / 传说 3%
     保底：连续 6 张未出稀有及以上时，第 7 张强制稀有池；保底不产扭蛋币，避免刷币。
     约束：顶级皮肤只进扭蛋池，刮卡池永不回填（见 legendReward）。 */
  function scratchTierInfo(miss) {
    if (miss >= 6) return { tier: 'rare', pity: true };
    const r = recoRng();
    return { tier: r < 0.78 ? 'common' : (r < 0.97 ? 'rare' : 'legend'), pity: false };
  }
  function scratchTier(miss) { return scratchTierInfo(miss).tier; }

  function addCoin(n, from) {
    const add = Math.max(0, Number(n) || 0);
    if (!add) return 0;
    DB.coins = Math.max(0, Number(DB.coins) || 0) + add;
    saveDB(true);
    return add;
  }
  function spendCoin(n) {
    const need = Math.max(0, Number(n) || 0);
    if ((Number(DB.coins) || 0) < need) return false;
    DB.coins = (Number(DB.coins) || 0) - need;
    saveDB(true);
    return true;
  }

  function addCredit(kcal, kind, expire, label, from) {
    DB.wallet.credits.push({
      id: uid(), kcal: Math.max(0, Math.round(kcal)), kind: kind === 'week' ? 'week' : 'day',
      expire: expire || '', label: label || '弹性额度', used: false, usedAt: 0, from: from || '刮卡'
    });
    DB.wallet.credits = DB.wallet.credits.slice(-50);
    saveDB(true);
  }

  /* v5.2：顶级皮肤目录可由 assets/skins/index.json 动态扩充（字段契约见该文件）。
     manifest 缺失或解析失败时保持原有 5 套顶级皮肤，不影响任何已解锁状态。 */
  let SKINS = [
    { id: 'paper', name: '宣纸·米白', src: '开局自带', tier: 'base', swatch: '#FBF9F2', ink: '#1D2A23', tag: '米白' },
    { id: 'kraft', name: '牛皮纸·老账房', src: '开局自带', tier: 'base', swatch: '#E7D7BD', ink: '#26364A', tag: '牛皮' },
    { id: 'green', name: '账房·墨绿', src: '连续达标 7 天', tier: 'milestone', swatch: '#2A4238', ink: '#EDE6D4', tag: '墨绿' },
    { id: 'pen', name: '钢笔·灰蓝', src: '连续达标 30 天', tier: 'milestone', swatch: '#F4F7FA', ink: '#23384D', tag: '灰蓝' },
    { id: 'sakura', name: '樱粉·便签', src: '稀有掉落', tier: 'rare', swatch: '#FFF7F8', ink: '#4B3A40', tag: '樱粉' },
    { id: 'mint', name: '薄荷·方格', src: '稀有掉落', tier: 'rare', swatch: '#F4FBF6', ink: '#214034', tag: '薄荷' },
    { id: 'indigo', name: '深夜·靛蓝', src: '稀有掉落', tier: 'rare', swatch: '#232C4A', ink: '#F2E9D8', tag: '靛蓝' },
    { id: 'coffee', name: '咖啡渍·旧账簿', src: '稀有掉落', tier: 'rare', swatch: '#F4EAD3', ink: '#4A3826', tag: '咖啡' },
    { id: 'gold', name: '烫金·黑膠', src: '稀有掉落', tier: 'rare', swatch: '#1D1D1D', ink: '#E8D9B4', tag: '黑金' },
    { id: 'almanac', name: '老黄历·朱砂', src: '稀有掉落', tier: 'rare', swatch: '#F5EBCB', ink: '#3A2A1C', tag: '朱砂' },
    { id: 'greyblue', name: '灰蓝·表格', src: '稀有掉落', tier: 'rare', swatch: '#F3F6F8', ink: '#26333F', tag: '灰蓝' },
    { id: 'linen', name: '亚麻·手账', src: '稀有掉落', tier: 'rare', swatch: '#F6F0E4', ink: '#3A332A', tag: '亚麻' },
    { id: 'pom', name: '石榴·朱红', src: '稀有掉落', tier: 'rare', swatch: '#FBF0ED', ink: '#53251F', tag: '朱红' },
    { id: 'olive', name: '橄榄·军绿', src: '稀有掉落', tier: 'rare', swatch: '#F1F3E7', ink: '#303826', tag: '军绿' },
    { id: 'lavender', name: '雾紫·薰衣草', src: '稀有掉落', tier: 'rare', swatch: '#F7F3FA', ink: '#3B3148', tag: '薰衣草' },
    { id: 'ochre', name: '赭石·陶土', src: '稀有掉落', tier: 'rare', swatch: '#F8F1E8', ink: '#4A3526', tag: '陶土' },
    { id: 'glacier', name: '冰川·银灰', src: '稀有掉落', tier: 'rare', swatch: '#F2F6F8', ink: '#2A3A44', tag: '银灰' },
    { id: 'pomelo', name: '蜜柚·橙黄', src: '稀有掉落', tier: 'rare', swatch: '#FFF5E2', ink: '#4A3822', tag: '橙黄' },
    { id: 'bamboo', name: '竹青·浅绿', src: '稀有掉落', tier: 'rare', swatch: '#F1F8F0', ink: '#23392A', tag: '浅绿' },
    { id: 'midnight', name: '墨夜·深蓝', src: '稀有掉落', tier: 'rare', swatch: '#E8EEF7', ink: '#1B2A44', tag: '深蓝' },
    { id: 'rosegold', name: '玫瑰金·米色', src: '稀有掉落', tier: 'rare', swatch: '#FBF3EC', ink: '#4A3128', tag: '米色' },
    { id: 'cedar', name: '雪松·深棕', src: '稀有掉落', tier: 'rare', swatch: '#F4EDE5', ink: '#38281C', tag: '深棕' },
    { id: 'sky', name: '气泡·天青', src: '稀有掉落', tier: 'rare', swatch: '#EFF8FB', ink: '#1D3947', tag: '天青' },
    { id: 'oldnews', name: '旧报·灰白', src: '稀有掉落', tier: 'rare', swatch: '#F5F4EF', ink: '#33342E', tag: '灰白' },
    { id: 'porcelain', name: '釉蓝·瓷器', src: '稀有掉落', tier: 'rare', swatch: '#EEF4F8', ink: '#21384D', tag: '釉蓝' },
    { id: 'a-sakura', name: '樱花祭·吹雪', src: '扭蛋限定', tier: 'top', swatch: '#FCEFF4', ink: '#4A2333', tag: '和风粉', art: 'sakura' },
    { id: 'a-galaxy', name: '星海·银河', src: '扭蛋限定', tier: 'top', swatch: '#101B33', ink: '#EAF1FF', tag: '深蓝星空', art: 'galaxy' },
    { id: 'a-neon', name: '霓虹雨夜·赛博', src: '扭蛋限定', tier: 'top', swatch: '#1B1230', ink: '#F6E9FF', tag: '紫粉霓虹', art: 'neon' },
    { id: 'a-wuxia', name: '水墨江湖·武侠', src: '扭蛋限定', tier: 'top', swatch: '#F4F0E6', ink: '#22201C', tag: '宣纸水墨', art: 'wuxia' },
    { id: 'a-fireworks', name: '夏日祭·烟火', src: '扭蛋限定', tier: 'top', swatch: '#1E140F', ink: '#FFF0DD', tag: '暖橙烟火', art: 'fireworks' }
  ];
  const LEGACY_TOP_IDS = ['a-sakura', 'a-galaxy', 'a-neon', 'a-wuxia', 'a-fireworks'];
  let SKIN_MANIFEST = { state: 'idle', count: 0, error: '', source: 'local', promise: null };
  function gallerySkins() { return SKINS; }
  function galleryUnlocked() { return SKINS.filter(s => skinUnlocked(s.id)).length; }
  function galleryTopCount() { return SKINS.filter(s => s.tier === 'top').length; }
  function loadSkinManifest() {
    if (SKIN_MANIFEST.promise) return SKIN_MANIFEST.promise;
    const p = fetch('assets/skins/index.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        const raw = (data && Array.isArray(data.skins)) ? data.skins
          : ((data && Array.isArray(data.items)) ? data.items : []);
        const seen = Object.create(null);
        const items = raw.filter(x => x && x.id && x.name && x.tier === 'top' && !seen[String(x.id)] && (seen[String(x.id)] = true)).map(function (x) {
          /* v5.2.1 真实素材契约：key→art；fg/fx/accent 随条目下发；pending 条目留空位、不发图请求 */
          const pending = x.pending === true || x.status === 'pending' || x.status === 'missing';
          return {
            id: String(x.id), name: String(x.name), src: String(x.src || '扭蛋限定'),
            tier: 'top', swatch: String(x.swatch || '#F4F1E7'), ink: String(x.ink || '#1D2A23'),
            tag: String(x.tag || '扭蛋'), thumb: pending ? '' : String(x.thumb || ''),
            art: pending ? '' : String(x.key || x.art || ''), fg: pending ? '' : String(x.fg || ''),
            fx: (x.fx && typeof x.fx === 'object') ? x.fx : null,
            accent: String(x.accent || ''), pending: pending, manifest: true
          };
        });
        if (!items.length) throw new Error('manifest 无有效条目');
        /* 成功时顶级目录以 manifest 为准；已解锁的旧顶级仍保留，避免丢收藏（同 id 以 manifest 为准） */
        const keepLegacy = SKINS.filter(s => s.tier === 'top' && LEGACY_TOP_IDS.indexOf(s.id) >= 0 && skinUnlocked(s.id) && !seen[s.id]);
        SKINS = SKINS.filter(s => s.tier !== 'top').concat(items).concat(keepLegacy);
        SKIN_MANIFEST = { state: 'ok', count: items.length, error: '', source: 'manifest', promise: p };
        /* v5.2.1：manifest 到达后重新套用当前皮肤（启动时 g 系皮肤尚未进表，
           不重跑会退回 paper），并把已解锁皮肤的缓存包读回运行时（不联网） */
        applySkins();
        if (isFull()) bootSkinPacks();
        return SKIN_MANIFEST;
      })
      .catch(function (e) {
        SKIN_MANIFEST = { state: 'fail', count: 0, error: String((e && e.message) || e), source: 'local', promise: p };
        return SKIN_MANIFEST;
      });
    SKIN_MANIFEST.promise = p;
    return p;
  }
  function refreshManifestViews() {
    updateRail();
    renderActive();
    const gb = $('#galleryBody');
    if (state.sheet === 'gallery' && gb) gb.innerHTML = renderSkinGallery();
    const gacha = $('#gachaBody');
    if (state.sheet === 'gacha' && gacha && typeof renderGachaBody === 'function') gacha.innerHTML = renderGachaBody();
  }
  function skinById(id) { return SKINS.find(s => s.id === id) || null; }
  function skinSrcShort(s) {
    if (s.tier === 'base') return '默认';
    if (s.tier === 'milestone') return s.id === 'green' ? '连续 7 天' : '连续 30 天';
    if (s.tier === 'top') return '扭蛋机';
    return '稀有掉落';
  }
  function skinUnlocked(id) { return (DB.skins.unlocked || []).indexOf(id) >= 0; }
  function unlockSkin(id, silent) {
    if (!id || skinUnlocked(id)) return false;
    DB.skins.unlocked.push(id);
    saveDB(true);
    if (!silent) toast('解锁皮肤：' + (skinById(id) || { name: id }).name);
    // 顶级皮肤解锁即按需拉包；普通皮肤无大图，不触发请求
    const sk = skinById(id);
    if (sk && sk.art && !sk.pending) downloadSkinPack(id);
    return true;
  }

  /* v4.3 外观收藏目录 */
  const STAMPS = [
    { id: 'seal-red', name: '朱砂方章' }, { id: 'seal-ink', name: '墨色方章' },
    { id: 'seal-gold', name: '烫金方章' }, { id: 'seal-blue', name: '靛蓝方章' },
    { id: 'seal-green', name: '竹青方章' }, { id: 'seal-violet', name: '雾紫方章' },
    { id: 'seal-amber', name: '赭石方章' }, { id: 'seal-cyan', name: '天青方章' },
    { id: 'seal-rose', name: '玫瑰方章' }, { id: 'seal-silver', name: '银灰方章' },
    { id: 'round', name: '方框朱印' }, { id: 'double', name: '双框方印' }
  ];
  const TEXTURES = [
    { id: 'fiber', name: '细纤维' }, { id: 'grid', name: '方格' }, { id: 'linen', name: '亚麻' },
    { id: 'dot', name: '点阵' }, { id: 'ruled', name: '横线' }, { id: 'kraft', name: '牛皮纹' },
    { id: 'marble', name: '石纹' }, { id: 'plain', name: '素面' }
  ];
  const BOOKMARKS = [
    { id: 'ribbon-red', name: '朱红书签' }, { id: 'ribbon-gold', name: '烫金书签' },
    { id: 'ribbon-blue', name: '靛蓝书签' }, { id: 'ribbon-green', name: '竹青书签' },
    { id: 'ribbon-violet', name: '雾紫书签' }, { id: 'ribbon-ink', name: '墨色书签' }
  ];
  const SIGNATURES = [
    { id: 'sig-plain', name: '素', text: '记一笔，算一笔。' },
    { id: 'sig-brush', name: '行书', text: '日日有记，岁岁有余。' },
    { id: 'sig-seal', name: '落款', text: '此页由今日之我落款。' },
    { id: 'sig-pencil', name: '铅笔', text: '草稿也是生活。' },
    { id: 'sig-gold', name: '烫金', text: '把日子过成账本里的光。' }
  ];
  const FONTS = [
    { id: 'font-song', name: '宋体正文' }, { id: 'font-kai', name: '楷体手写' },
    { id: 'font-hei', name: '黑体清晰' }, { id: 'font-mono', name: '等宽数字' }
  ];
  const SCRATCH_ARTS = [
    { id: 'cloth', name: '素布刮层' }, { id: 'petal', name: '花瓣刮层' }, { id: 'star', name: '星点刮层' },
    { id: 'neon', name: '霓虹刮层' }, { id: 'ink', name: '水墨刮层' }, { id: 'fire', name: '烟火刮层' }
  ];
  const FX_THEMES = [
    { id: 'slow', name: '慢速微光' }, { id: 'particle', name: '粒子飘落' }, { id: 'still', name: '静止无动效' }
  ];
  const COVERS = [
    { id: 'default', name: '素色封面' }, { id: 'gold', name: '烫金封面' },
    { id: 'linen', name: '亚麻封面' }, { id: 'ink', name: '水墨封面' }
  ];
  const LEDGER_EGGS = [
    '你翻到了账本的第一页——它一直在这里等你。',
    '据说连续记录 100 天的人，会看见纸页自己翻动。',
    '在空白页写下“今天很好”，热量不会变，心情会。',
    '旧账房的抽屉里，藏着一张没有数字的收据。',
    '把预算写成诗，数字也会温柔一点。',
    '深夜的账本会记住你没吃的那一口。',
    '如果今天只记了一杯水，也算数。',
    '账本说：不必每天完美，只要还回来。',
    '有人在页脚画了一朵小花，墨水很淡。',
    '最后一页没有总结，只有一句“继续”。'
  ];
  const COS_KINDS = {
    stamp: { list: STAMPS, field: 'stamp', label: '印章' },
    texture: { list: TEXTURES, field: 'texture', label: '纸纹' },
    bookmark: { list: BOOKMARKS, field: 'bookmark', label: '书签' },
    signature: { list: SIGNATURES, field: 'signature', label: '页脚签名' },
    font: { list: FONTS, field: 'font', label: '字体' },
    scratch: { list: SCRATCH_ARTS, field: 'scratchArt', label: '刮卡背面' },
    fx: { list: FX_THEMES, field: 'fxTheme', label: '动效主题' },
    cover: { list: COVERS, field: 'cover', label: '对账单封面' }
  };
  function cosKey(kind, id) { return kind + ':' + id; }
  // 默认值视为已拥有，避免抽到“无变化”
  const COS_DEFAULT = { stamp: 'seal-red', texture: 'fiber', scratch: 'cloth', cover: 'default' };
  function cosUnlocked(kind, id) {
    if (COS_DEFAULT[kind] === id) return true;
    return (DB.skins.unlockedCos || []).indexOf(cosKey(kind, id)) >= 0;
  }
  function unlockCos(kind, id, silent) {
    const def = COS_KINDS[kind];
    if (!def) return false;
    const item = def.list.find(x => x.id === id);
    if (!item) return false;
    const k = cosKey(kind, id);
    if ((DB.skins.unlockedCos || []).indexOf(k) >= 0) return false;
    DB.skins.unlockedCos.push(k);
    DB.skins[def.field] = id; // 解锁即启用
    saveDB(true);
    applySkins();
    if (!silent) toast('解锁外观：' + item.name);
    return true;
  }
  function applyCos(kind, id) {
    const def = COS_KINDS[kind];
    if (!def || !cosUnlocked(kind, id)) return false;
    DB.skins[def.field] = id;
    saveDB(true);
    applySkins();
    return true;
  }
  /* ---------- v5.0 皮肤包按需下载 ----------
     大图不再内嵌主包：未解锁只显示极小剪影，零大图请求；
     解锁/抽中后才按需拉取 assets/skins/<theme>/key.webp + fx.json，
     写入 Cache Storage（el-skins-v2），刷新与断网仍可用。 */
  const SKIN_PACK_CACHE = 'el-skins-v2';
  const TOP_ART = {
    'a-sakura': 'sakura', 'a-galaxy': 'galaxy', 'a-neon': 'neon',
    'a-wuxia': 'wuxia', 'a-fireworks': 'fireworks'
  };
  // ≤1KB 的 inline 剪影占位，未解锁/未下载都只用它，绝不触发大图请求
  const PACK_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#6b6b6b" stop-opacity=".18"/><stop offset="1" stop-color="#3a3a3a" stop-opacity=".34"/>' +
    '</linearGradient></defs><rect width="240" height="360" fill="url(#g)"/>' +
    '<rect x="46" y="96" width="148" height="188" rx="14" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>' +
    '<path d="M76 138h88M76 172h64M76 206h78" stroke="#fff" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>'
  );
  const PACK_RT = {};
  /* art 字段在 v5.2.1 起是真实路径（assets/skins/<dir>/key.webp），主题目录需从路径解析 */
  function artThemeOf(s) {
    if (!s) return '';
    if (s.theme) return s.theme;
    const m = /assets\/skins\/([^/]+)\//.exec(String(s.art || ''));
    if (m) return m[1];
    return TOP_ART[s.id] || String(s.art || '');
  }
  function packTheme(id) {
    return artThemeOf(skinById(id));
  }
  function packKey(theme, file) { return 'assets/skins/' + theme + '/' + file; }
  function packReady(id) {
    const t = packTheme(id);
    return !!(t && PACK_RT[t] && PACK_RT[t].status === 'done' && PACK_RT[t].url);
  }
  function packState(id) {
    const t = packTheme(id);
    return (t && PACK_RT[t]) ? PACK_RT[t] : null;
  }
  function skinArtUrl(id) {
    const s = skinById(id);
    if (!s || !s.art) return '';
    return packReady(id) ? PACK_RT[packTheme(id)].url : '';
  }
  function skinArtThumb(id) {
    return skinArtUrl(id) || (packTheme(id) ? PACK_PLACEHOLDER : '');
  }
  function cacheOpen() {
    if (!window.caches) return Promise.resolve(null);
    return caches.open(SKIN_PACK_CACHE).catch(() => null);
  }
  function cachePut(key, blob, type) {
    return cacheOpen().then(function (c) {
      if (!c) return false;
      return c.put(key, new Response(blob, { headers: { 'Content-Type': type || 'application/octet-stream' } }))
        .then(() => true).catch(() => false);
    });
  }
  function cacheMatch(key) {
    return cacheOpen().then(function (c) { return c ? c.match(key).catch(() => null) : null; });
  }
  function packProgressText(id) {
    const st = packState(id);
    if (!st) return '';
    if (st.status === 'loading') return '皮肤包下载中 · ' + (st.pct || 0) + '%';
    if (st.status === 'error') return '联网后自动补全';
    return '';
  }
  function packStatusText(id) {
    const t = packTheme(id);
    if (!t) return '';
    if (packReady(id)) return '皮肤包已就绪 · 离线可用';
    if (DB.skins.packs && DB.skins.packs[t]) return '已获得 · 待下载';
    return '已获得 · 待下载';
  }
  function downloadSkinPack(id, opt) {
    const theme = packTheme(id);
    if (!theme) return Promise.resolve(false);
    if (packReady(id)) return Promise.resolve(true);
    const st = PACK_RT[theme] || (PACK_RT[theme] = { status: 'idle', pct: 0, url: '', bytes: 0 });
    if (st.status === 'loading') return st.promise || Promise.resolve(false);
    const done = function (blob) {
      if (st.blobUrl) { try { URL.revokeObjectURL(st.blobUrl); } catch (e) {} }
      st.blobUrl = URL.createObjectURL(blob);
      st.url = st.blobUrl;
      st.status = 'done';
      st.pct = 100;
      st.bytes = blob.size;
      if (!DB.skins.packs) DB.skins.packs = {};
      DB.skins.packs[theme] = { at: Date.now(), bytes: blob.size };
      saveDB(true);
      applySkins();
      refreshPackViews();
      if (!opt || !opt.silent) toast('皮肤包已就绪：' + theme + ' · ' + Math.round(blob.size / 1024) + ' KB');
      return true;
    };
    if (!window.fetch || location.protocol.indexOf('http') !== 0) {
      st.status = 'error';
      refreshPackViews();
      return Promise.resolve(false);
    }
    if (navigator.onLine === false) {
      st.status = 'error';
      refreshPackViews();
      return Promise.resolve(false);
    }
    st.status = 'loading';
    st.pct = 0;
    refreshPackViews();
    const url = packKey(theme, 'key.webp') + '?v=5.2.1';
    st.promise = fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const total = Number(res.headers.get('content-length')) || 0;
      if (!res.body || !res.body.getReader || !total) return res.blob();
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      const pump = function () {
        return reader.read().then(function (r) {
          if (r.done) return new Blob(chunks, { type: 'image/webp' });
          got += r.value.length;
          chunks.push(r.value);
          st.pct = Math.min(99, Math.round(got / total * 100));
          refreshPackViews();
          return pump();
        });
      };
      return pump();
    }).then(function (blob) {
      /* 一次补齐 key + thumb + fx 三件套，之后离线可用 */
      return Promise.all([
        cachePut(packKey(theme, 'key.webp'), blob, 'image/webp'),
        // fx.json 与图一起缓存；失败不阻塞底图
        fetch(packKey(theme, 'fx.json') + '?v=5.2.1')
          .then(function (r) { return r.ok ? r.text() : null; })
          .catch(function () { return null; })
          .then(function (txt) {
            if (txt) return cachePut(packKey(theme, 'fx.json'), txt, 'application/json');
            return null;
          }),
        // thumb 同步缓存，图鉴离线也能出图
        fetch(packKey(theme, 'thumb.webp') + '?v=5.2.1')
          .then(function (r) { return r.ok ? r.blob() : null; })
          .catch(function () { return null; })
          .then(function (tb) {
            if (tb) return cachePut(packKey(theme, 'thumb.webp'), tb, 'image/webp');
            return null;
          })
      ]).then(function () { return done(blob); });
    }).catch(function () {
      st.status = 'error';
      st.pct = 0;
      refreshPackViews();
      if (!opt || !opt.silent) toast('皮肤包暂时没下下来 · 联网后会自动补全');
      return false;
    });
    return st.promise;
  }
  function bootSkinPacks() {
    if (!isFull()) return;
    const owned = SKINS.filter(s => s.art && !s.pending && skinUnlocked(s.id)).map(s => packTheme(s.id)).filter(Boolean);
    owned.forEach(function (theme) {
      const st = PACK_RT[theme] || (PACK_RT[theme] = { status: 'idle', pct: 0, url: '', bytes: 0 });
      cacheMatch(packKey(theme, 'key.webp')).then(function (res) {
        if (!res) {
          // 已获得但缓存缺失：保持“待下载”，绝不在这里自动预取
          if (DB.skins.packs && DB.skins.packs[theme]) st.status = 'error';
          refreshPackViews();
          return;
        }
        return res.blob().then(function (blob) {
          if (st.blobUrl) { try { URL.revokeObjectURL(st.blobUrl); } catch (e) {} }
          st.blobUrl = URL.createObjectURL(blob);
          st.url = st.blobUrl;
          st.status = 'done';
          st.pct = 100;
          st.bytes = blob.size;
          applySkins();
          refreshPackViews();
        });
      }).catch(function () {});
    });
  }
  function refreshPackViews() {
    const gb = $('#galleryBody');
    if (gb) gb.innerHTML = renderSkinGallery();
    const sb = $('#skinBody');
    if (sb) sb.innerHTML = renderSkinWall();
    const ga = $('#gachaBody');
    if (ga) {
      // 动画/结果展示期间只更新槽位与历史，避免把出蛋画面整块冲掉
      const sl = $('#gachaSlots');
      if (sl) sl.innerHTML = renderGachaSlots();
      const hist = $('#gachaHist');
      if (hist) hist.innerHTML = renderGachaHistory();
      const top = $('#gachaTop');
      if (top) top.innerHTML = renderGachaTop();
      const gr = $('#gachaResults');
      if (gr && state.gachaLast) gr.innerHTML = gachaResultsHtml(state.gachaLast);
      if (!state.gachaAnimating && !state.gachaLast) ga.innerHTML = renderGachaBody();
    }
  }
  window.addEventListener('online', function () {
    // 只补已获得的皮肤；未解锁的永不预取
    SKINS.filter(s => s.art && !s.pending && skinUnlocked(s.id)).forEach(function (s) {
      if (!packReady(s.id)) downloadSkinPack(s.id, { silent: true }).then(function (ok) { if (ok) toast('皮肤包已自动补全：' + s.name); });
    });
  });

  function refreshSkinFx() {
    if (!window.SkinFX) return;
    applyDayPhase();
    if (!isFull()) { SkinFX.stop(); return; }
    const sk = skinById(DB.skins.active);
    const ready = sk && sk.art && !sk.pending && skinUnlocked(sk.id) && packReady(sk.id);
    const off = DB.settings.fx === false || DB.settings.powerSave;
    if (!ready || off) { SkinFX.stop(); return; }
    SkinFX.start(packTheme(sk.id), {
      power: DB.settings.fx !== false,
      powerSave: !!DB.settings.powerSave,
      reduced: prefersReduced(),
      still: DB.skins.fxTheme === 'still'
    });
    /* v5.3：数据驱动皮肤（潮汐/极光/菌群/星图/脉搏）读取当日账本上下文 */
    if (SkinFX.setData) SkinFX.setData(fxDataContext());
  }
  /* v5.3：极昼极夜按本机时间分四档，写入 data-dayphase 供 CSS 取天空色 */
  function applyDayPhase() {
    const h = new Date().getHours();
    const phase = h >= 5 && h < 10 ? 'dawn' : h >= 10 && h < 16 ? 'noon' : h >= 16 && h < 20 ? 'dusk' : 'night';
    const el = document.documentElement;
    if (el.getAttribute('data-dayphase') !== phase) el.setAttribute('data-dayphase', phase);
  }
  /* 数据上下文带缓存：同一"日期 + 记录数"组合只算一次，皮肤切换频繁也不抖 */
  let _fxCache = { key: '', data: null };
  function fxDataContext() {
    const today = E.todayKey();
    const key = today + ':' + DB.entries.length + ':' + DB.exercises.length;
    if (_fxCache.key === key) return _fxCache.data;
    const t = targetsNow();
    const sum = E.summary(DB.entries, today);
    let deficitRatio = 0;
    if (t && t.priorTDEE) deficitRatio = Math.max(-1, Math.min(1, (t.priorTDEE - sum.kcal) / t.priorTDEE));
    const meals = {};
    E.MEALS.forEach(m => { meals[m[0]] = (sum.byMeal[m[0]] && sum.byMeal[m[0]].kcal) || 0; });
    const lastAddAt = DB.entries.reduce((mx, e) => e.date === today ? Math.max(mx, e.createdAt || 0) : mx, 0);
    /* 最近 14 天断记表（1=有记录）：星图的暗星 */
    const recentMiss = [];
    for (let i = 13; i >= 0; i--) {
      recentMiss.push(E.summary(DB.entries, E.addDays(today, -i)).count > 0 ? 1 : 0);
    }
    const data = {
      date: today,
      recorded: sum.count > 0,
      count: sum.count,
      kcal: sum.kcal,
      deficitRatio: deficitRatio,
      meals: meals,
      macros: { p: sum.p, c: sum.c, f: sum.f, kcal: sum.kcal },
      budget: t && t.budgetPrior ? Math.round(t.budgetPrior) : 0,
      left: t && t.budgetPrior ? Math.round(t.budgetPrior - sum.kcal) : null,
      items: DB.entries.filter(e => e.date === today).slice(-6)
        .map(e => ({ id: e.id, name: e.name, kcal: e.kcal, meal: e.meal })),
      streak: E.streak(DB.entries, today),
      totalRecords: DB.entries.length,
      lastAddAt: lastAddAt,
      recentDates: DB.entries.slice(-40).map(e => e.date).reverse(),
      recentMiss: recentMiss
    };
    _fxCache = { key: key, data: data };
    return data;
  }
  /* v5.3：玻璃器皿的指针视差高光——一个 CSS 变量，全程零 canvas。
     （液态金属的滚动偏移改用 CSS scroll-timeline 实现，无需 JS 监听） */
  let fxPointerBound = false;
  function bindFxPointer() {
    if (fxPointerBound) return;
    fxPointerBound = true;
    let rafId = 0, px = 50, py = 50;
    window.addEventListener('pointermove', function (ev) {
      px = Math.round(ev.clientX / Math.max(1, window.innerWidth) * 100);
      py = Math.round(ev.clientY / Math.max(1, window.innerHeight) * 100);
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        document.documentElement.style.setProperty('--fx-gx', px + '%');
        document.documentElement.style.setProperty('--fx-gy', py + '%');
      });
    }, { passive: true });
  }
  function previewSkinFx(id) {
    if (!window.SkinFX) return;
    const sk = skinById(id);
    const t = packTheme(id);
    if (!t || !sk || !sk.art || sk.pending) return;
    /* 未下载的已解锁皮肤：先静默补包，包到手再放预览 */
    if (skinUnlocked(id) && !packReady(id)) {
      downloadSkinPack(id, { silent: true }).then(ok => { if (ok) previewSkinFx(id); });
      return;
    }
    if (!packReady(id)) return;
    SkinFX.start(t, {
      power: true, powerSave: !!DB.settings.powerSave,
      reduced: prefersReduced(), still: false
    });
    SkinFX.boost(3000);
  }
  function applyFx() {
    document.documentElement.setAttribute('data-fx', DB.settings.fx === false ? 'off' : 'on');
    refreshSkinFx();
  }

  function applySkins() {
    const s = DB.skins || {};
    const root = document.documentElement;
    if (!isFull()) {
      /* 纯账本：固定 paper 基础皮肤，不套用任何皮肤包/纹理/字体，也不发任何请求 */
      root.setAttribute('data-skin', 'paper');
      root.setAttribute('data-skin-cover', 'default');
      root.setAttribute('data-skin-stamp', 'seal-red');
      root.setAttribute('data-skin-theme', 'paper');
      root.setAttribute('data-skin-texture', 'fiber');
      root.setAttribute('data-skin-bookmark', 'none');
      root.setAttribute('data-skin-signature', 'none');
      root.setAttribute('data-skin-font', 'default');
      root.setAttribute('data-skin-scratch', 'cloth');
      root.setAttribute('data-skin-fx', 'default');
      root.style.removeProperty('--skin-art');
      const fx = document.getElementById('skinArtFx');
      if (fx) fx.remove();
      const se = document.getElementById('ledgerSignature');
      if (se) se.remove();
      if (window.SkinGen) SkinGen.sync('paper');
      if (window.SkinV6) SkinV6.sync('paper', null);
      refreshSkinFx();
      return;
    }
    /* 清单（skins/index.json）是异步加载的：没加载完时 skinById() 还查不到 g01~g25，
       旧逻辑会先退回 paper 再在清单到位后切回来，实测闪一次纸面并产生 0.003 的 CLS。
       这里把 SkinGen 认识的 id 也当成"已知"，CSS 早已按 data-skin 备好，不必等清单。 */
    const knownSkin = !!skinById(s.active) || !!(window.SkinGen && SkinGen.ids.indexOf(s.active) >= 0)
      || !!(window.SkinV6 && SkinV6.ids.indexOf(s.active) >= 0);   /* v5.4：机制型皮肤不依赖 manifest 也能认出，避免闪回 paper */
    const id = knownSkin && skinUnlocked(s.active) ? s.active : 'paper';
    root.setAttribute('data-skin', id);
    root.setAttribute('data-skin-cover', s.cover || 'default');
    root.setAttribute('data-skin-stamp', s.stamp || 'seal-red');
    root.setAttribute('data-skin-theme', s.theme || 'paper');
    root.setAttribute('data-skin-texture', s.texture || 'fiber');
    root.setAttribute('data-skin-bookmark', s.bookmark || 'none');
    root.setAttribute('data-skin-signature', s.signature || 'none');
    root.setAttribute('data-skin-font', s.font || 'default');
    root.setAttribute('data-skin-scratch', s.scratchArt || 'cloth');
    root.setAttribute('data-skin-fx', s.fxTheme || 'default');
    /* v5.3：纯 CSS 材质皮肤（无 canvas）不铺占位剪影——背景由皮肤自己的 CSS 画 */
    const CSS_MATERIAL_SKINS = ['a-glass', 'a-polar', 'a-type', 'a-chrome'];
    const art = skinArtUrl(id) || (packTheme(id) && CSS_MATERIAL_SKINS.indexOf(id) < 0 ? PACK_PLACEHOLDER : '');
    if (art) root.style.setProperty('--skin-art', 'url("' + art + '")');
    else root.style.removeProperty('--skin-art');
    const oldFx = document.getElementById('skinArtFx');
    if (oldFx) oldFx.remove();
    refreshSkinFx();
    if (id === 'a-glass' || id === 'a-chrome') bindFxPointer();
    applySkinThemeColor();
    if (window.SkinGen) SkinGen.sync(id);
    /* v5.4：机制型皮肤的数据联动 + 舞台渲染（无 window.SkinV6 时零开销） */
    if (window.SkinV6) SkinV6.sync(id, typeof fxDataContext === 'function' ? fxDataContext() : null);
    const sig = (SIGNATURES.find(x => x.id === s.signature) || null);
    let se = document.getElementById('ledgerSignature');
    if (sig) {
      if (!se) { se = document.createElement('div'); se.id = 'ledgerSignature'; document.body.appendChild(se); }
      se.textContent = sig.text;
    } else if (se) se.remove();
  }

  function weekId(key) { return weekStart(key || E.todayKey()); }
  function pickWeighted(items) {
    const total = items.reduce((s, x) => s + x.w, 0);
    let r = recoRng() * total;
    for (let i = 0; i < items.length; i++) { r -= items[i].w; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function creditCapGrant(kcal, label, from) {
    if (maintOn()) { addCredit(kcal, 'day', E.todayKey(), label, from); return kcal; }
    const wk = weekId();
    const used = Number(DB.scratch.weeklyKcal[wk]) || 0;
    if (used + kcal > 300) return null;
    DB.scratch.weeklyKcal[wk] = used + kcal;
    addCredit(kcal, 'day', E.todayKey(), label, from);
    return kcal;
  }
  function cosItems(kind, w) {
    const def = COS_KINDS[kind];
    return def.list.filter(x => !cosUnlocked(kind, x.id)).map(x => ({
      w: w,
      fn: () => {
        unlockCos(kind, x.id, true);
        return { kind: kind, label: def.label + ' · ' + x.name, detail: '已解锁并启用，可在皮肤图鉴或外观收藏中切换。' };
      }
    }));
  }
  function cosmeticFallback() {
    const all = [];
    Object.keys(COS_KINDS).forEach(k => { cosItems(k, 1).forEach(x => all.push(x)); });
    if (all.length) return pickWeighted(all).fn();
    const q = quoteReward();
    if (q) return q;
    return { kind: 'egg', label: '外观已集齐', detail: '外观收藏已满，本次转为纪念记录。' };
  }
  function quoteReward() {
    const left = SCRATCH_QUOTES.map((q, i) => i).filter(i => DB.collect.quotes.indexOf(i) < 0);
    if (!left.length) return null;
    const i = left[(recoRng() * left.length) | 0];
    DB.collect.quotes.push(i);
    saveDB(true);
    return { kind: 'quote', label: '账本语录', detail: SCRATCH_QUOTES[i] };
  }
  function eggReward() {
    const left = LEDGER_EGGS.map((q, i) => i).filter(i => DB.collect.eggs.indexOf(i) < 0);
    if (!left.length) return null;
    const i = left[(recoRng() * left.length) | 0];
    DB.collect.eggs.push(i);
    saveDB(true);
    return { kind: 'egg', label: '账本彩蛋', detail: LEDGER_EGGS[i] };
  }
  function unlockRandomSkin(tier) {
    const pool = SKINS.filter(s => s.tier === tier && !skinUnlocked(s.id));
    if (!pool.length) return null;
    const s = pool[(recoRng() * pool.length) | 0];
    unlockSkin(s.id, true);
    return s;
  }
  function addRevive() {
    DB.revive.push({ id: uid(), at: Date.now(), used: false });
    DB.revive = DB.revive.slice(-10);
    saveDB(true);
  }
  function codexLight(name) {
    const q = String(name || '').trim();
    if (!q) return false;
    if (!DB.codex.lit) DB.codex.lit = [];
    if (DB.codex.lit.indexOf(q) >= 0) return false;
    DB.codex.lit.push(q);
    DB.codex.lit = DB.codex.lit.slice(-1200);
    saveDB(true);
    return true;
  }
  function codexLightRandom(n) {
    const count = Math.max(1, Number(n) || 1);
    function lightFrom(rows) {
      let add = 0;
      for (let i = 0; i < rows.length && add < count; i++) {
        const idx = (recoRng() * rows.length) | 0;
        if (codexLight(rows[idx][0])) add++;
      }
      if (add) saveDB(true);
      return add;
    }
    const data = window.__FOODLIB_DATA__;
    if (data && data.rows) return lightFrom(data.rows);
    if (FL && FL.ensure) {
      FL.ensure().then(function () {
        if (window.__FOODLIB_DATA__ && window.__FOODLIB_DATA__.rows) lightFrom(window.__FOODLIB_DATA__.rows);
      });
    }
    return 0;
  }

  function coinReward(n, from) {
    addCoin(n || 1, from || '刮卡');
    return { kind: 'coin', label: '扭蛋币 ×' + (n || 1), detail: '已存入账本，可累计、无上限，仅用于扭蛋机。' };
  }
  function legendReward() {
    /* 约束：顶级皮肤只进扭蛋池，刮卡池永不回填。
       传说档不再产出任何顶级皮肤；60% 扭蛋币，40% 稀有外观。 */
    if (recoRng() < 0.60) return coinReward(1, '刮卡·传说');
    const items = [];
    if (!cosUnlocked('cover', 'gold')) items.push({
      w: 1,
      fn: () => {
        unlockCos('cover', 'gold', true);
        return { kind: 'cover', label: '对账单 · 烫金封面', detail: '月度对账单使用烫金浮雕样式。' };
      }
    });
    if (DB.collect.medals.indexOf('legend-medal') < 0) items.push({
      w: 1,
      fn: () => {
        DB.collect.medals.push('legend-medal');
        addRevive();
        saveDB(true);
        return { kind: 'medal', label: '特殊纪念章 + 复活券', detail: '纪念章已收藏；复活券可在钱包使用，补回断掉的一天。' };
      }
    });
    const rareStamps = cosItems('stamp', 1);
    if (rareStamps.length) items.push({
      w: 1,
      fn: () => pickWeighted(rareStamps).fn()
    });
    if (!items.length) {
      // 外观全部集齐后仍守住 60/40：40% 档折算复活券，不折算扭蛋币
      addRevive();
      saveDB(true);
      return { kind: 'revive', label: '复活券 ×1', detail: '稀有外观已集齐，这一档折算为复活券。' };
    }
    return pickWeighted(items).fn();
  }

  function applyScratchReward(tier, pity) {
    const today = E.todayKey();
    if (tier === 'legend') return legendReward();
    // 稀有档 8% 掉扭蛋币；保底不产币，避免刷币
    if (tier === 'rare' && !pity && recoRng() < 0.08) return coinReward(1, '刮卡·稀有');
    const common = [
      { w: 24, fn: () => quoteReward() || cosmeticFallback() },
      { w: 12, fn: () => {
        const its = cosItems('stamp', 1);
        return its.length ? pickWeighted(its).fn() : cosmeticFallback();
      } },
      { w: 10, fn: () => {
        const its = cosItems('texture', 1);
        return its.length ? pickWeighted(its).fn() : cosmeticFallback();
      } },
      { w: 8, fn: () => {
        const its = cosItems('bookmark', 1);
        return its.length ? pickWeighted(its).fn() : cosmeticFallback();
      } },
      { w: 6, fn: () => {
        const its = cosItems('signature', 1);
        return its.length ? pickWeighted(its).fn() : cosmeticFallback();
      } },
      { w: 12, fn: () => {
        const w = WISH_POOL[(recoRng() * WISH_POOL.length) | 0];
        DB.wishlist.push({ name: w[0], kcal: 0, at: Date.now() });
        DB.wishlist = DB.wishlist.slice(-30);
        saveDB(true);
        return { kind: 'wish', label: '想吃清单 · ' + w[0], detail: '只展示与记录，不自动记账、不记热量。' };
      } },
      { w: 10, fn: () => {
        const got = creditCapGrant(80, '当日 +80 kcal 弹性额度', '刮卡·普通');
        if (!got) return cosmeticFallback();
        return { kind: 'credit', label: '当日 +80 kcal 弹性额度', detail: '已放入钱包，今天有效，过期作废；本周额度上限 300 kcal。' };
      } },
      { w: 8, fn: () => {
        const n = codexLightRandom(3);
        return { kind: 'codex', label: '图鉴点亮卡', detail: n ? '已点亮 ' + n + ' 种原料。' : '已放入图鉴收藏，打开图鉴查看进度。' };
      } },
      { w: 6, fn: () => eggReward() || cosmeticFallback() }
    ];
    const rare = [];
    const rareSkins = SKINS.filter(s => s.tier === 'rare' && !skinUnlocked(s.id));
    const rareSkinW = rareSkins.length ? 30 / rareSkins.length : 0;
    rareSkins.forEach(s => rare.push({
      w: rareSkinW, fn: () => {
        unlockSkin(s.id, true);
        return { kind: 'skin', label: '皮肤 · ' + s.name, detail: '稀有掉落已永久解锁，可在皮肤图鉴切换。' };
      }
    }));
    cosItems('stamp', 12).forEach(x => rare.push(x));
    cosItems('texture', 10).forEach(x => rare.push(x));
    cosItems('bookmark', 8).forEach(x => rare.push(x));
    cosItems('signature', 6).forEach(x => rare.push(x));
    cosItems('font', 8).forEach(x => rare.push(x));
    cosItems('scratch', 10).forEach(x => rare.push(x));
    cosItems('fx', 6).forEach(x => rare.push(x));
    cosItems('cover', 8).forEach(x => rare.push(x));
    rare.push({ w: 10, fn: () => {
      if (DB.leaveDays.indexOf(today) < 0) DB.leaveDays.push(today);
      saveDB(true);
      return { kind: 'leave', label: '请假条（今天）', detail: '今天不记账也不打断连续达标；当天标灰。' };
    } });
    rare.push({ w: 12, fn: () => {
      const got = creditCapGrant(150, '当日 +150 kcal 弹性额度', '刮卡·稀有');
      if (!got) return cosmeticFallback();
      return { kind: 'credit', label: '当日 +150 kcal 弹性额度', detail: '已放入钱包，今天有效，过期作废；本周额度上限 300 kcal。' };
    } });
    rare.push({ w: 10, fn: () => {
      DB.scratch.pass = { week: weekId(), used: false, at: Date.now() };
      saveDB(true);
      return { kind: 'pass', label: '放纵日通行证', detail: '本周内可用一次；用后当天预算 +15%，超支标「经批准」，不破连续达标。' };
    } });
    rare.push({ w: 8, fn: () => {
      DB.bank.waivers.free = (DB.bank.waivers.free || 0) + 1;
      saveDB(true);
      return { kind: 'waiver-free', label: '免息借额券', detail: '下次向预算银行借 100 kcal 免息，只还 100。' };
    } });
    rare.push({ w: 6, fn: () => {
      DB.bank.waivers.extra = (DB.bank.waivers.extra || 0) + 1;
      saveDB(true);
      return { kind: 'waiver-extra', label: '预算银行提额券', detail: '下次借额上限从 100 提升到 150 kcal。' };
    } });
    const pool = tier === 'rare' ? rare : common;
    const avail = pool.filter(x => x.w > 0);
    if (!avail.length) return cosmeticFallback();
    return pickWeighted(avail).fn();
  }

  function activateCheat(date, source) {
    if (cheatActive(date)) return false;
    DB.cheatDays.history.push({ date: date, at: Date.now(), source: source || 'manual' });
    DB.cheatDays.history = DB.cheatDays.history.slice(-60);
    saveDB(true);
    return true;
  }

  function revealScratchCard() {
    const card = DB.scratch.card;
    if (!card || card.revealed) return null;
    const ti = scratchTierInfo(DB.scratch.miss);
    const tier = ti.tier;
    const reward = applyScratchReward(tier, ti.pity);
    card.revealed = true;
    card.tier = tier;
    card.revealedAt = Date.now();
    card.reward = reward;
    DB.scratch.miss = tier === 'common' ? DB.scratch.miss + 1 : 0;
    DB.scratch.count = (DB.scratch.count || 0) + 1;
    DB.scratch.last = { tier: tier, label: reward.label, detail: reward.detail, at: Date.now(), date: card.date };
    DB.scratch.log.unshift({ id: uid(), date: card.date, tier: tier, label: reward.label, at: Date.now(), source: card.source || 'daily' });
    DB.scratch.log = DB.scratch.log.slice(0, 60);
    saveDB(true);
    paintScratchReveal(card, reward);
    toast('刮出' + SCRATCH_TIER[tier].label + '：' + reward.label);
    if (state.tab === 'today') renderToday();
    return { tier: tier, reward: reward };
  }

  function scratchCardHtml(card) {
    const tier = card.tier ? SCRATCH_TIER[card.tier] : null;
    return '<div class="scratch-stage' + (card.revealed ? ' revealed tier-' + card.tier : ' entering') + '" id="scratchStage">' +
      '<div class="scratch-prize" id="scratchPrize">' +
        (card.revealed && card.reward
          ? '<div class="sp-tier ' + (tier ? tier.color : '') + '">' + (tier ? tier.label : '') + '奖</div>' +
            '<div class="sp-name">' + esc(card.reward.label) + '</div>' +
            '<div class="sp-detail">' + esc(card.reward.detail || '') + '</div>'
          : '<div class="sp-lock">' + icon('spark') + '<span>今天的手气<br>刮开才知道</span></div>') +
      '</div>' +
      (card.revealed ? '' :
        '<canvas id="scratchCanvas" aria-label="刮开今日福利"></canvas>' +
        '<div class="scratch-progress"><span id="scratchProgress"></span></div>' +
        '<div class="scratch-hint">用手指或鼠标涂开，刮开 60% 自动揭晓</div>') +
    '</div>' +
    (card.revealed ? '' : '<div class="scratch-tools"><button class="btn btn-ghost btn-sm" data-act="scratch-reveal">直接揭晓</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="toggle-fx">动效：' + (DB.settings.fx ? '开' : '关') + '</button></div>');
  }

  function drawTicket() {
    if (DB.scratch.card && !DB.scratch.card.revealed) { toast('先刮开手里这张'); return null; }
    const t = DB.scratch.tickets.shift();
    if (!t) { toast('还没有抽奖券，先去完成今天的记账'); return null; }
    DB.scratch.card = {
      date: t.date, id: uid(), revealed: false, tier: null, reward: null,
      earnedAt: Date.now(), source: t.source, ticketId: t.id
    };
    saveDB(true);
    openScratchSheet();
    return t;
  }

  function renderTicketList() {
    const list = DB.scratch.tickets || [];
    if (!list.length) return '<div class="wallet-empty">券袋是空的。每日达标 +1 张；连续 3/7/14/30 天再各发 1/2/3/4 张。</div>';
    const shown = list.slice(0, 20);
    return '<div class="ticket-list">' + shown.map(t =>
      '<div class="ticket-row"><span class="tk-ic">' + icon('spark') + '</span>' +
      '<span class="tk-main"><b>' + esc(TICKET_SRC[t.source] || t.source) + '</b><em>' + esc(t.date) + ' 获得</em></span>' +
      '<span class="tk-tag">待刮</span></div>').join('') +
      (list.length > 20 ? '<div class="tiny faint">另有 ' + (list.length - 20) + ' 张未展示（按获得顺序排队）</div>' : '') +
      '</div>';
  }

  function renderMilestoneProgress(streak) {
    const next = nextMilestone(streak);
    const claimed = DB.scratch.milestones || {};
    const last = TICKET_MILESTONES.filter(m => claimed[m.id]).slice(-1)[0];
    const from = last ? last.days : 0;
    const pct = next ? Math.min(100, Math.round((streak - from) / Math.max(1, next.days - from) * 100)) : 100;
    return '<div class="ms-progress">' +
      '<div class="ms-head"><b>连续达标 ' + streak + ' 天</b><span>' +
      (next ? '距 ' + next.days + ' 天还差 ' + (next.days - streak) + ' 天 · 可得 ' + next.n + ' 张' : '全部里程碑已领取') + '</span></div>' +
      '<div class="ms-bar"><i style="width:' + Math.max(0, pct) + '%"></i></div>' +
      '<div class="ms-chips">' + TICKET_MILESTONES.map(m =>
        '<span class="ms-chip' + (claimed[m.id] ? ' on' : '') + '">' + m.days + '天 +' + m.n + '</span>').join('') + '</div>' +
      '<div class="tiny faint">每个里程碑只发一次；券可存，上限 10 张，无过期。</div></div>';
  }

  function renderPoolBoard() {
    const around = SKINS.filter(s => s.tier === 'rare');
    const sk = around.map(s => '<span class="pool-chip' + (skinUnlocked(s.id) ? ' on' : ' locked') +
      '" title="' + esc(s.src) + '">' + (skinUnlocked(s.id) ? '' : icon('lock')) + esc(s.name) + '</span>').join('');
    const groups = Object.keys(COS_KINDS).map(k => {
      const def = COS_KINDS[k];
      const items = def.list.map(x => '<span class="pool-chip' + (cosUnlocked(k, x.id) ? ' on' : ' locked') +
        '" title="稀有档掉落">' + (cosUnlocked(k, x.id) ? '' : icon('lock')) + esc(x.name) + '</span>').join('');
      return '<div class="pool-group"><div class="pg-head">' + def.label + ' ' +
        def.list.filter(x => cosUnlocked(k, x.id)).length + '/' + def.list.length + '</div><div class="pool-grid">' + items + '</div></div>';
    }).join('');
    const props = [
      ['+80 kcal 弹性额度', '普通/稀有'], ['+150 kcal 弹性额度', '稀有'], ['请假条（当天）', '稀有'],
      ['连续达标复活券', '传说纪念章附带'], ['免息借额券', '稀有'], ['预算银行提额券', '稀有']
    ].map(p => '<span class="pool-chip locked" title="' + p[1] + '档">' + icon('lock') + p[0] + '</span>').join('');
    const tops = SKINS.filter(s => s.tier === 'top').map(s =>
      '<span class="pool-chip top' + (skinUnlocked(s.id) ? ' on' : ' locked') + '" title="传说档 · 各 15%">' +
      (skinUnlocked(s.id) ? '' : icon('lock')) + esc(s.name) + '</span>').join('');
    return '<div class="pool-board">' +
      '<div class="pool-cat"><div class="pc-head"><b>外观</b><span>全 ' + gallerySkins().length + ' 套：默认 2 · 里程碑 2 · 稀有池 ' + around.length + ' · 顶级 ' + galleryTopCount() + '；另含印章 12 / 纸纹 8 / 书签 6 / 签名 5 / 字体 4 / 刮层 6 / 动效 3 / 封面 4</span></div>' +
        '<div class="pool-group"><div class="pg-head">稀有池皮肤 ' + around.filter(s => skinUnlocked(s.id)).length + '/' + around.length + '</div><div class="pool-grid">' + sk + '</div></div>' + groups + '</div>' +
      '<div class="pool-cat"><div class="pc-head"><b>道具</b><span>热量额度、请假条、复活券、银行券</span></div><div class="pool-grid">' + props + '</div></div>' +
      '<div class="pool-cat"><div class="pc-head"><b>顶级</b><span>仅传说档 · 只从扭蛋机产出（池中 ' + gachaPool().length + ' 套）</span></div><div class="pool-grid">' + tops + '</div></div>' +
      '</div>';
  }

  function renderScratchHistory() {
    const rows = (DB.scratch.log || []).slice(0, 20);
    return '<div class="hist-head"><b>最近抽奖 · ' + rows.length + '/20</b>' +
      '<button class="btn-quiet tiny" data-act="export-scratch-log">导出</button></div>' +
      (rows.length ? '<div class="hist-list">' + rows.map(r => {
        const d = new Date(r.at || Date.now());
        const hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        const chip = r.batch ? ((r.subs ? r.subs.length : 5) + '连') : SCRATCH_TIER[r.tier].label;
        return '<div class="hist-row"><span class="hr-tier ' + r.tier + '">' + chip + '</span>' +
          '<span class="hr-main"><b>' + esc(r.label) + '</b><em>' + esc((r.date || '') + ' ' + hh) + '</em></span></div>';
      }).join('') + '</div>' : '<div class="wallet-empty">还没有抽奖记录。</div>');
  }

  function batchLabel(tk) {
    if (tk >= 5) return '一次刮 5 张';
    if (tk >= 2) return '刮剩下的 ' + tk + ' 张';
    if (tk === 1) return '刮剩下的 1 张';
    return '一次刮 5 张';
  }
  function ticketHelpHtml(open) {
    const today = E.todayKey();
    const st = snapshot(today);
    const logged = st && st.sum && st.sum.count > 0;
    const claimed = DB.scratch.lastEarnedDate === today;
    const streak = streakNow();
    const next = nextMilestone(streak);
    const tk = DB.scratch.tickets.length;
    const full = !maintOn() && tk >= 10;
    const daily = claimed ? '今日已领（+1 张）' : (logged ? '今天已记餐，可领 1 张' : '记一餐可拿 1 张（今天还没记账）');
    const ms = next
      ? '连续达标 ' + streak + ' 天；距 ' + next.days + ' 天还差 ' + (next.days - streak) + ' 天，可得 ' + next.n + ' 张'
      : '连续达标 ' + streak + ' 天；3/7/14/30 天里程碑已全部领取';
    return '<div class="ticket-help" id="ticketHelp"' + (open ? '' : ' hidden') + '>' +
      '<div class="th-head">怎么拿券</div>' +
      '<div class="th-row"><b>每日</b><span>' + daily + '</span></div>' +
      '<div class="th-row"><b>里程碑</b><span>' + ms + '</span></div>' +
      '<div class="th-row"><b>券袋</b><span>' + tk + '/10' + (full ? ' · 已满，新获得的券会作废，先用存量' : ' · 券可存，无过期') + '</span></div>' +
      '<div class="th-actions"><button class="btn btn-primary btn-sm" data-act="open-add">去记一餐</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="goto-trend">看连续进度</button></div>' +
      '</div>';
  }
  function scratchEntryActions(tk, revealed) {
    let html = '<div class="scratch-actions' + (revealed ? ' wait' : '') + '">';
    if (revealed) html += '<button class="btn btn-primary btn-sm" data-act="open-wallet">存进钱包</button>';
    if (tk > 0) {
      html += '<button class="btn ' + (revealed ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-act="scratch-draw">再刮一张（剩 ' + tk + '）</button>';
    } else {
      html += '<button class="btn btn-primary btn-sm" data-act="ticket-help">券用完了 · 怎么拿券</button>';
    }
    html += '<button class="btn btn-ghost btn-sm" data-act="scratch-batch"' + (tk ? '' : ' disabled') + '>' + batchLabel(tk) + '</button>';
    if (revealed) html += '<button class="btn btn-ghost btn-sm" data-act="close-sheet">回今天</button>';
    html += '</div><div id="ticketHelpSlot">' + ticketHelpHtml(false) + '</div>' +
      '<div class="scratch-coin"><span>扭蛋币 <b>' + (Number(DB.coins) || 0) + '</b> 枚 · 扭蛋池 <b>' + gachaPool().length + '</b> 套</span>' +
      '<button class="btn btn-ghost btn-sm" data-act="open-gacha">去扭蛋机</button></div>';
    return html;
  }

  function openScratchSheet() {
    expireCredits(true);
    /* 有未揭晓的连刮批次：重开面板直接续揭，不丢券 */
    if (DB.scratch.batch && !DB.scratch.batch.settled) {
      state.batch = hydrateBatch(DB.scratch.batch);
      openBatchSheet();
      return;
    }
    state.sheetData = { type: 'scratch' };
    const card = DB.scratch.card;
    const streak = streakNow();
    const tk = DB.scratch.tickets.length;
    const lastBatch = DB.scratch.batch && DB.scratch.batch.settled
      ? '<div class="batch-resume"><b>上次连刮 ' + DB.scratch.batch.count + ' 张已入账</b>' +
        '<span>' + esc(DB.scratch.batch.summary || '') + '</span>' +
        '<button class="btn-quiet tiny" data-act="batch-resume">查看结果</button></div>' : '';
    let body;
    if (card) {
      const src = TICKET_SRC[card.source] || '每日打卡';
      body = '<div class="scratch-meta"><span class="tiny faint">' + card.date + ' · 来源：' + src + '</span>' +
        '<span class="tiny faint">剩余券 ' + tk + ' 张 · 连续普通 ' + DB.scratch.miss + '/7 · 保底稀有</span></div>' +
        scratchCardHtml(card) +
        (card.revealed ? scratchEntryActions(tk, true) : '');
    } else if (tk) {
      const first = DB.scratch.tickets[0];
      body = '<div class="scratch-empty"><div class="se-ic">' + icon('spark') + '</div>' +
        '<div class="se-t">券袋里有 ' + tk + ' 张抽奖券</div>' +
        '<div class="se-s">最早一张：' + esc(TICKET_SRC[first.source] || first.source) + ' · ' + esc(first.date) + ' 获得。刮开即消耗 1 张。</div></div>' +
        scratchEntryActions(tk, false);
    } else {
      const st = snapshot(E.todayKey());
      const ok = scratchEligible(st);
      body = '<div class="scratch-empty"><div class="se-ic">' + icon('spark') + '</div>' +
        '<div class="se-t">' + (ok ? '今天已记餐，明日再记可再领 1 张' : '今天还没有抽奖券') + '</div>' +
        '<div class="se-s">获得条件：当天至少 1 条记账即得 1 张；连续 3/7/14/30 天另有里程碑券。券可存，上限 10 张。</div></div>' +
        scratchEntryActions(0, false);
    }
    openSheet(
      sheetHead('抽奖券', '每日基础卡 + 连续里程碑 · 无付费、无真钱、无外部奖品', '') +
      '<div class="sheet-body" id="scratchBody">' +
        '<div class="scratch-meta"><span class="tiny faint">券袋 ' + tk + (maintOn() ? ' 张（不封顶）' : '/10') + ' · 本周热量额度 ' + (Number(DB.scratch.weeklyKcal[weekId()]) || 0) + '/300 kcal</span><span class="tiny faint">抽奖券无过期</span></div>' +
        lastBatch +
        body +
        renderTicketList() +
        renderMilestoneProgress(streak) +
        '<div class="sheet-sub">奖池一览 <span class="tiny faint">（灰色为未解锁，悬停/长按看获取方式）</span></div>' + renderPoolBoard() +
        '<div class="sheet-sub">抽奖历史</div>' + renderScratchHistory() +
      '</div>' +
      '<div class="sheet-foot"><span class="tiny faint">普通 80% · 稀有 17% · 传说 3% · 连续 7 张未出稀有及以上则第 7 张保底；顶级皮肤只出在传说档</span></div>',
      'scratch'
    );
    if (card && !card.revealed) initScratchCanvas();
  }

  /* ---------- v5.0 奖励中心 + 扭蛋机界面 ---------- */
  function prefersReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function rewardAvail() { return gachaCredits() + (Number(DB.coins) || 0); }
  function rewardBadge(n, kind) {
    const v = Number(n) || 0;
    if (!v) return '';
    return '<i class="rw-badge ' + (kind || '') + '">' + v + '</i>';
  }
  /* ---------- v5.2 盖章册 ----------
     独立 localStorage 键 energy-ledger.stamps：不进账本主数据、不进导出。
     连续达标一日盖 1 枚，7 枚一页；断签只清空「当前页」，已集满的页保留。 */
  const STAMP_KEY = 'energy-ledger.stamps';
  const STAMP_PATTERNS = [
    { id: 'seal-ink', name: '墨色方章' }, { id: 'seal-gold', name: '烫金方章' },
    { id: 'seal-blue', name: '靛蓝方章' }, { id: 'seal-green', name: '竹青方章' },
    { id: 'seal-violet', name: '雾紫方章' }, { id: 'seal-amber', name: '赭石方章' }
  ];
  function loadStamps() {
    const raw = readStore(STAMP_KEY, null);
    const st = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    st.version = 1;
    st.run = Array.isArray(st.run) ? st.run.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort() : [];
    st.patterns = Array.isArray(st.patterns) ? st.patterns.filter(id => STAMP_PATTERNS.some(p => p.id === id)) : [];
    st.pages = Array.isArray(st.pages) ? st.pages.filter(p => p && Array.isArray(p.stamps) && p.stamps.length === 7)
      .map(p => ({
        id: String(p.id || uid()), stamps: p.stamps.slice(0, 7).sort(),
        at: Number(p.at) || Date.now(), claimed: !!p.claimed,
        reward: p.reward === 'pattern' ? 'pattern' : (p.reward === 'ticket' ? 'ticket' : ''),
        pattern: p.pattern || ''
      })) : [];
    return st;
  }
  function saveStamps(st) { return writeStore(STAMP_KEY, st); }
  function stampSeries() {
    const today = E.todayKey();
    const skip = {};
    (DB.leaveDays || []).forEach(x => { skip[typeof x === 'string' ? x : (x && x.date)] = 1; });
    (DB.cheatDays.history || []).forEach(x => { if (x && x.date) skip[x.date] = 1; });
    const has = {};
    DB.entries.forEach(e => { has[e.date] = 1; });
    let k = (has[today] || skip[today]) ? today : E.addDays(today, -1);
    if (!has[k] && !skip[k]) return [];
    const out = [];
    for (let i = 0; i < 999; i++) {
      if (has[k]) {
        const st = snapshot(k);
        if (!st) break;
        if (!st.cheat && st.sum.kcal > st.budget * 1.05) break;
        out.push(k);
        k = E.addDays(k, -1);
      } else if (skip[k]) {
        k = E.addDays(k, -1);
      } else break;
    }
    return out.reverse();
  }
  function syncStamps(silent) {
    const st = loadStamps();
    const series = stampSeries();
    const completed = {};
    st.pages.forEach(p => p.stamps.forEach(d => { completed[d] = 1; }));
    /* 当前页必须是今天这串连续日期的末尾；断签→只丢弃当前页，已完成页保留 */
    let run = st.run.filter(d => series.indexOf(d) >= 0);
    if (run.length) {
      const tail = series.slice(series.length - run.length);
      if (tail.join('|') !== run.join('|')) run = [];
    }
    series.forEach(d => {
      if (!completed[d] && run.indexOf(d) < 0) run.push(d);
    });
    run.sort();
    let changed = run.join('|') !== st.run.join('|');
    while (run.length >= 7) {
      st.pages.push({
        id: uid(), stamps: run.slice(0, 7), at: Date.now(),
        claimed: false, reward: '', pattern: ''
      });
      run = run.slice(7);
      changed = true;
    }
    st.run = run;
    const pagesBefore = st.pages.length;
    if (changed) saveStamps(st);
    if (changed && pagesBefore > 0 && !silent) {
      const ready = st.pages.filter(p => !p.claimed).length;
      if (ready) toast('盖章册：可以兑 ' + ready + ' 页了');
    }
    return st;
  }
  function stampSummary() {
    const st = syncStamps(true);
    return {
      current: st.run.length,
      pages: st.pages.length,
      claimable: st.pages.filter(p => !p.claimed).length,
      patterns: st.patterns.length
    };
  }
  function renderStampCard() {
    const sm = stampSummary();
    if (!sm.pages && !sm.current && sm.patterns === 0) {
      return '<div class="stamp-card" data-act="open-stamps" role="button" tabindex="0">' +
        '<span class="sc-ic">' + icon('book') + '</span>' +
        '<span class="sc-main"><b>盖章册</b><em>连续达标一日盖 1 枚 · 7 枚一页 · 今日还没有盖章</em></span>' +
        '<span class="sc-go">查看</span></div>';
    }
    return '<div class="stamp-card" data-act="open-stamps" role="button" tabindex="0">' +
      '<span class="sc-ic">' + icon('book') + '</span>' +
      '<span class="sc-main"><b>盖章册</b><em>当前页 ' + sm.current + '/7 · 已集满 ' + sm.pages + ' 页 · 纹样 ' + sm.patterns + ' 枚</em></span>' +
      '<span class="sc-go">' + (sm.claimable ? '可兑' : '查看') + (sm.claimable ? '<i>' + sm.claimable + '</i>' : '') + '</span></div>';
  }
  function stampSealHTML(k, n) {
    return '<span class="stamp-seal on" title="' + E.dateLabel(k) + '"><span>' + (n % 7 + 1) + '</span></span>';
  }
  function renderStampSheet() {
    const st = syncStamps(true);
    const pages = st.pages.slice().sort((a, b) => b.at - a.at);
    const curSlots = [];
    for (let i = 0; i < 7; i++) {
      curSlots.push(st.run[i] ? stampSealHTML(st.run[i], i) : '<span class="stamp-seal">·</span>');
    }
    const pageCards = pages.length ? pages.map(function (p, idx) {
      const range = p.stamps[0] + ' → ' + p.stamps[6];
      const reward = p.claimed
        ? (p.reward === 'ticket' ? '已兑 1 张刮刮卡' : '已兑纹样：' + (STAMP_PATTERNS.find(x => x.id === p.pattern) || { name: '纹样' }).name)
        : '';
      return '<div class="stamp-page">' +
        '<div class="stamp-page-top"><b>第 ' + (pages.length - idx) + ' 页</b><em>' + range + '</em></div>' +
        '<div class="stamp-slots">' + p.stamps.map((k, i) => stampSealHTML(k, i)).join('') + '</div>' +
        (p.claimed ? '<div class="stamp-claimed">' + reward + '</div>' :
          '<div class="stamp-page-actions">' +
            '<button class="btn btn-ghost" data-act="stamp-claim" data-id="' + p.id + '" data-kind="ticket">兑 1 张刮刮卡</button>' +
            '<button class="btn btn-ghost" data-act="stamp-claim" data-id="' + p.id + '" data-kind="pattern">兑 1 个纹样</button>' +
          '</div>') +
      '</div>';
    }).join('') : '<div class="rw-hist-empty tiny faint" style="margin-top:10px">还没有集满的页。连续达标 7 天即可集满一页。</div>';
    const patHTML = st.patterns.length
      ? '<div class="stamp-patterns">' + st.patterns.map(id => {
          const p = STAMP_PATTERNS.find(x => x.id === id);
          return '<span class="chip">' + esc(p ? p.name : id) + '</span>';
        }).join('') + '</div>'
      : '<div class="tiny faint" style="margin-top:8px">纹样会解锁到「外观收藏 · 印章」，可随时切换。</div>';
    return sheetHead('盖章册', '连续达标一日盖 1 枚 · 7 枚一页 · 断签只重置当前页', '') +
      '<div class="sheet-body">' +
        '<div class="stamp-progress"><b>' + st.run.length + '</b><em>/ 7 当前页 · 已集满 ' + st.pages.length + ' 页</em></div>' +
        '<div class="stamp-page current">' +
          '<div class="stamp-page-top"><b>当前页</b><em>' + (st.run.length ? st.run[0] + ' → 今天' : '从今天开始') + '</em></div>' +
          '<div class="stamp-slots">' + curSlots.join('') + '</div>' +
        '</div>' +
        pageCards +
        '<div class="stamp-note">盖章状态保存在独立键 <b>energy-ledger.stamps</b>，不进账本主数据、不进导出；断签只清空当前页，已集满页不受影响。</div>' +
        '<div class="stamp-page-actions"><button class="btn btn-primary" data-act="open-rewards">回奖励中心</button></div>' +
        (patHTML ? '<div class="section-head" style="margin-top:16px"><h2>已收集纹样</h2></div>' + patHTML : '') +
      '</div>';
  }
  function openStampSheet() {
    state.sheetData = { type: 'stamps' };
    openSheet(renderStampSheet(), 'stamps');
  }
  function claimStampPage(id, kind) {
    const st = loadStamps();
    const p = st.pages.find(x => x.id === id);
    if (!p) return toast('这一页不存在');
    if (p.claimed) return toast('这一页已经兑过了，不能重复结算');
    if (kind === 'ticket') {
      const got = addTicket('stamp', 1);
      if (!got.added) return toast('刮刮卡已满 10 张，先刮掉几张再来兑');
      p.claimed = true; p.reward = 'ticket';
      saveStamps(st);
      toast('已兑换 1 张刮刮卡');
    } else {
      const next = STAMP_PATTERNS.find(x => !cosUnlocked('stamp', x.id));
      if (!next) return toast('印章纹样已经集齐了，换刮刮卡吧');
      unlockCos('stamp', next.id, true);
      if (st.patterns.indexOf(next.id) < 0) st.patterns.push(next.id);
      p.claimed = true; p.reward = 'pattern'; p.pattern = next.id;
      saveStamps(st);
      toast('已兑换纹样：' + next.name + '（可在设置 · 外观收藏切换）');
    }
    openStampSheet();
  }

  function renderRewardEntry() {
    if (DB.settings && DB.settings.elder) return '';
    const tk = DB.scratch.tickets.length;
    const ga = rewardAvail();
    return '<section class="reward-entry-wrap">' +
      '<div class="reward-entry">' +
        '<button class="re-main" data-act="open-rewards">' +
          '<span class="re-ic">' + icon('gift') + '</span>' +
          '<span class="re-txt"><b>奖励中心</b><em>券 ' + tk + ' 张 · 扭蛋 ' + ga + ' 次 · 池中 ' + gachaPool().length + ' 套</em></span>' +
          '<span class="re-go">' + icon('arrow-r') + '</span>' +
        '</button>' +
        '<div class="re-jump">' +
          '<button class="re-btn" data-act="open-scratch" aria-label="直接打开刮刮卡">' + icon('scratch') +
            '<span>刮刮卡</span><i class="rb-n">' + (tk > 0 ? tk : '') + '</i></button>' +
          '<button class="re-btn" data-act="open-gacha" aria-label="直接打开扭蛋机">' + icon('capsule') +
            '<span>扭蛋机</span><i class="rb-n ga">' + (ga > 0 ? ga : '') + '</i></button>' +
        '</div>' +
      '</div></section>';
  }
  /* ---------- 兑换码 / 版本公告 ----------
     兑换码与公告状态一律写在独立 localStorage 键（el.codes.* / el.version.*），
     不进 DB、不进导出 JSON。verifyCode 是纯函数，状态由这里读写。 */
  const APP_VERSION = (window.__EL_VER || '5.3.0');
  const CODE_KEYS = (window.ELCodes && window.ELCodes.STORAGE_KEYS) ||
    { used: 'el.codes.used', revoked: 'el.codes.revoked', attempts: 'el.codes.attempts' };
  const CODE_TITLES = {
    FORMAT: '格式不对', CHECK: '校验位错', USED: '本机已用',
    EXPIRED: '已过期', REVOKED: '已作废', RATE_LIMIT: '尝试过频'
  };

  function readStore(key, dft) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : dft;
    } catch (e) { return dft; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function codeUsed() {
    const u = readStore(CODE_KEYS.used, {});
    return (u && typeof u === 'object' && !Array.isArray(u)) ? u : {};
  }
  function codeRevoked() {
    const v = readStore(CODE_KEYS.revoked, []);
    return (v && typeof v === 'object') ? v : [];
  }
  function codeAttempts() {
    const a = readStore(CODE_KEYS.attempts, []);
    return Array.isArray(a) ? a : [];
  }
  function maskCode(code) {
    const s = String(code || '').replace(/[^0-9A-Z]/g, '');
    return s.length === 12 ? s.slice(0, 4) + '-****-' + s.slice(8) : String(code || '');
  }
  function codeHistory() {
    const u = codeUsed();
    return Object.keys(u).map(k => u[k]).filter(x => x && x.at)
      .sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 20);
  }
  function codeTime(ms) {
    const d = new Date(ms);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function renderCodeCard() {
    const res = state.codeResult;
    const hist = codeHistory();
    const histHTML = hist.length
      ? '<div class="rw-hist"><div class="rw-hist-t">最近兑换 · ' + hist.length + '/20</div>' +
          hist.map(x => '<div class="rw-hist-row"><span class="rh-code">' + esc(x.mask || '—') + '</span>' +
            '<span class="rh-amt">' + (x.tickets ? '券 +' + x.tickets : '') + (x.tickets && x.coins ? ' · ' : '') +
            (x.coins ? '币 +' + x.coins : '') + '</span>' +
            '<span class="rh-time tiny faint">' + codeTime(x.at) + '</span></div>').join('') +
        '</div>'
      : '<div class="rw-hist-empty tiny faint">还没有兑换记录。兑换成功后，这里最多保留最近 20 条。</div>';

    return '<section class="rw-code">' +
      '<div class="rw-code-head">' + icon('gift') + '<b>兑换码</b><em>券与币分开入账 · 只在本机记录</em></div>' +
      '<div class="rw-code-row">' +
        '<input id="codeInput" class="code-input" type="text" autocomplete="off" spellcheck="false" ' +
          'maxlength="26" placeholder="输入兑换码，如 3542-YP52-S6GF" aria-label="兑换码">' +
        '<button class="code-btn" data-act="redeem-code">兑换</button>' +
      '</div>' +
      '<div class="code-hint tiny faint">大小写、空格、短横线与全角字符都能识别；码里不含 0、1、I、L、O。</div>' +
      (res ? '<div class="code-result ' + (res.ok ? 'ok' : 'bad') + '" role="status" aria-live="polite">' +
        '<b>' + esc(res.title || (res.ok ? '兑换成功' : '兑换失败')) + '</b>' +
        '<span>' + esc(res.message) + '</span></div>' : '') +
      histHTML +
    '</section>';
  }

  function redeemCode() {
    const C = window.ELCodes;
    const inp = $('#codeInput');
    if (!C) { ensureCodes().then(ok => { if (ok) redeemCode(); }); return; }
    if (!inp) return;
    const r = C.verifyCode(inp.value, {
      usedHashes: codeUsed(), revokedHashes: codeRevoked(), attempts: codeAttempts()
    });
    if (r.attempts) writeStore(CODE_KEYS.attempts, r.attempts);
    if (!r.ok) {
      state.codeResult = {
        ok: false,
        title: CODE_TITLES[r.reason] || '兑换失败',
        message: r.message, reason: r.reason
      };
      openRewardCenter(true);
      return;
    }
    const tickets = r.reward.tickets || 0;
    const coins = r.reward.coins || 0;
    let got = { added: 0, overflow: 0 };
    if (tickets) got = addTicket('code', tickets);
    if (coins) addCoin(coins, 'code');
    const used = codeUsed();
    used[r.hash] = { at: Date.now(), tickets: tickets, coins: coins, mask: maskCode(r.code), batch: 'code' };
    const keys = Object.keys(used).sort((a, b) => (used[a].at || 0) - (used[b].at || 0));
    while (keys.length > 500) delete used[keys.shift()];
    writeStore(CODE_KEYS.used, used);
    writeStore(CODE_KEYS.attempts, []);
    state.codeResult = {
      ok: true,
      message: (tickets ? '抽奖券 +' + got.added + ' 张' : '') +
        (tickets && coins ? ' · ' : '') + (coins ? '扭蛋币 +' + coins + ' 枚' : '') +
        (got.overflow ? '（券已达上限 10 张，超出部分未入账）' : '') + '。入口徽标已刷新。'
    };
    openRewardCenter(false);
  }

  function rewardSheetHTML(tk, ga, pool) {
    return '<div class="sheet-body reward-center">' +
      '<div class="rw-top"><span>抽奖券 <b>' + tk + '</b></span><span>扭蛋次数 <b>' + ga + '</b></span><span>池中 <b>' + pool + '</b> 套</span></div>' +
      '<button class="rw-card rw-scratch" data-act="open-scratch">' +
        '<span class="rw-ic">' + icon('scratch') + '</span>' +
        '<span class="rw-txt"><b>刮刮卡</b><em>券 ' + tk + ' 张 · 每日记一餐得 1 张 · 支持一次刮 5 张</em></span>' +
        '<span class="rw-card-badge">' + rewardBadge(tk, 'tk') + '</span>' +
      '</button>' +
      '<button class="rw-card rw-gacha" data-act="open-gacha">' +
        '<span class="rw-ic">' + icon('capsule') + '</span>' +
        '<span class="rw-txt"><b>扭蛋机</b><em>可用 ' + ga + ' 次 · 池中 ' + pool + ' 套顶级皮肤 · 必中不重复</em></span>' +
        '<span class="rw-card-badge">' + rewardBadge(ga, 'ga') + '</span>' +
      '</button>' +
      renderStampCard() +
      renderCodeCard() +
      '<div class="rw-note tiny faint">扭蛋限定皮肤只从扭蛋池产出；扭蛋币可累计、无上限，仅用于扭蛋。</div>' +
    '</div>';
  }

  function openRewardCenter(keepInput) {
    state.sheetData = { type: 'rewards' };
    const tk = DB.scratch.tickets.length;
    const ga = rewardAvail();
    const pool = gachaPool().length;
    const prev = keepInput && $('#codeInput') ? $('#codeInput').value : '';
    openSheet(
      sheetHead('奖励中心', '刮刮卡、扭蛋机与兑换码 · 无付费、无真钱、无外部奖品', '') +
      rewardSheetHTML(tk, ga, pool),
      'rewards'
    );
    if (prev) {
      const inp = $('#codeInput');
      if (inp) inp.value = prev;
    }
  }

  /* ---------- 版本公告（首屏后静默拉取，失败不打扰） ---------- */
  function initAnnounce() {
    if (!window.ELAnnounce) {
      /* v5.3：公告模块已移出关键路径，首屏渲染完再拉起；失败静默 */
      ensureAnnounce().then(ok => { if (ok) initAnnounce(); });
      return;
    }
    window.ELAnnounce.checkVersion({ appVersion: APP_VERSION }).then(function (r) {
      if (!r || r.status !== 'new') return;
      state.announce = r;
      paintAnnounce(r);
    }).catch(function () {});
  }
  function paintAnnounce(r) {
    const host = $('.app-main');
    if (!host) return;
    const old = $('#verBanner');
    if (old) old.remove();
    const bar = document.createElement('div');
    bar.id = 'verBanner';
    bar.className = 'ver-banner' + (r.forceUpgrade ? ' force' : '');
    bar.setAttribute('role', 'status');
    const notes = (r.data.notes || []).slice(0, 4)
      .map(n => '<li>' + esc(n) + '</li>').join('');
    bar.innerHTML = '<i class="ver-dot" aria-hidden="true"></i>' +
      '<div class="vb-line"><b>' + (r.forceUpgrade ? '需要刷新到新版本' : '新版本 v' + esc(r.data.version)) + '</b>' +
        (r.forceUpgrade ? '' : '<button class="vb-toggle" data-act="ver-toggle" aria-expanded="false">更新点</button>') +
      '</div>' +
      '<div class="vb-detail"' + (r.forceUpgrade ? '' : ' hidden') + '>' +
        '<span class="vb-sub">' + (r.forceUpgrade
          ? esc(r.message)
          : (r.data.released ? esc(r.data.released) + ' 发布 · 本次更新：' : '本次更新：')) + '</span>' +
        (notes ? '<ul class="vb-notes">' + notes + '</ul>' : '') +
      '</div>' +
      '<div class="vb-acts">' +
        '<button class="vb-btn" data-act="ver-snooze">稍后</button>' +
        '<button class="vb-btn primary" data-act="ver-seen">' + (r.forceUpgrade ? '刷新页面' : '知道了') + '</button>' +
      '</div>';
    host.insertBefore(bar, host.firstChild);
    $$('[data-tab="settings"]').forEach(b => b.classList.add('has-ver-dot'));
  }
  function dismissAnnounce(kind) {
    const r = state.announce;
    if (r && window.ELAnnounce) {
      if (kind === 'seen') window.ELAnnounce.markSeen(r.data.version);
      else window.ELAnnounce.snooze(r.data.version);
    }
    const bar = $('#verBanner');
    if (bar) bar.remove();
    $$('[data-tab="settings"]').forEach(b => b.classList.remove('has-ver-dot'));
    state.announce = null;
    if (kind === 'seen' && r && r.forceUpgrade) location.reload();
  }

  function renderGachaTop() {
    return '<span>池中 <b>' + gachaPool().length + '</b> 套</span>' +
      '<span>里程碑次数 <b>' + gachaCredits() + '</b></span>' +
      '<span>扭蛋币 <b>' + (Number(DB.coins) || 0) + '</b></span>';
  }
  function renderGachaSlots() {
    const tops = SKINS.filter(s => s.tier === 'top');
    return tops.map(function (s) {
      const own = skinUnlocked(s.id);
      const ready = packReady(s.id);
      if (s.pending) {
        return '<div class="gacha-slot soon" title="' + esc(s.name) + ' · 即将上架">' +
          '<span class="gs-q">…</span><span class="gs-tag">即将上架</span></div>';
      }
      const bg = own && ready ? ' style="background-image:url(&quot;' + skinArtThumb(s.id).replace(/"/g, '&quot;') + '&quot;)"' : '';
      return '<div class="gacha-slot' + (own ? ' own' : '') + (own && !ready ? ' pending' : '') + '"' + bg + ' title="' + esc(s.name) + '">' +
        (own ? '<span class="gs-name">' + esc(s.name.split('·')[0]) + '</span>' + (ready ? '' : '<span class="gs-tag">' + (s.art ? '待下载' : '已获得') + '</span>') : '<span class="gs-q">?</span><span class="gs-tag">未获得</span>') +
        '</div>';
    }).join('');
  }
  function renderGachaHistory() {
    const h = DB.gacha.history || [];
    if (!h.length) return '<div class="gh-empty tiny faint">还没有抽取记录。每次抽取会记录时间、来源与获得的皮肤。</div>';
    return '<div class="gh-list">' + h.slice(0, 20).map(function (r) {
      const d = new Date(r.at || Date.now());
      const pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return '<div class="gh-row"><span class="gh-t">' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</span>' +
        '<span class="gh-src">' + esc(r.source || '') + '</span>' +
        '<span class="gh-it">' + (r.items || []).map(function (x) { return esc(x.name); }).join('、') + '</span></div>';
    }).join('') + '</div>';
  }
  function gachaResultsHtml(res) {
    if (!res) return '';
    return '<div class="gacha-result">' + res.picks.map(function (s) {
      const ready = packReady(s.id);
      const hasArt = !!s.art && !s.pending;
      return '<div class="gacha-win">' +
        '<span class="gw-art" style="background:' + (s.swatch || '#ccc') + '">' + (ready ? '<img alt="" src="' + skinArtThumb(s.id) + '">' : '<span class="gw-ph">' + icon('lock') + '</span>') + '</span>' +
        '<span class="gw-txt"><b>' + esc(s.name) + '</b><em>' + (ready ? '皮肤包已就绪' : hasArt ? (packProgressText(s.id) || '已获得 · 待下载') : '已获得 · 素材待接入') + '</em></span>' +
        (hasArt && !ready ? '<button class="btn btn-ghost btn-sm" data-act="skin-download" data-id="' + s.id + '"' + (packState(s.id) && packState(s.id).status === 'loading' ? ' disabled' : '') + '>' + (packState(s.id) && packState(s.id).status === 'loading' ? '下载中' : '下载') + '</button>' : '') +
        '</div>';
    }).join('') + '<div class="gacha-sum">共得 ' + res.picks.length + ' 套 · 池中剩 ' + gachaPool().length + ' 套 · 来源：' + esc(res.source) + '</div></div>';
  }
  function renderGachaBody() {
    const pool = gachaPool().length;
    const ga = rewardAvail();
    const empty = !pool;
    const last = state.gachaLast;
    return '<div class="gacha-top" id="gachaTop">' + renderGachaTop() + '</div>' +
      '<div class="gacha-machine' + (empty ? ' empty' : '') + '" id="gachaMachine">' +
        '<div class="gm-head">胶囊扭蛋机<span>扭蛋限定 · 5 抽封顶</span></div>' +
        '<div class="gm-dome"><div class="gm-balls"><i></i><i></i><i></i><i></i><i></i></div></div>' +
        '<div class="gm-body"><div class="gm-lever"><span></span></div><div class="gm-knob"></div><div class="gm-out" id="gachaOut"></div></div>' +
      '</div>' +
      '<div class="gacha-results" id="gachaResults">' + gachaResultsHtml(last) + '</div>' +
      (empty
        ? '<div class="gacha-empty"><b>已集齐 · 等待新皮肤上架</b><em>池中 0 套，抽取历史保留在下方。</em></div>'
        : '<div class="gacha-actions" id="gachaActions">' +
            '<button class="btn btn-primary" data-act="gacha-draw" data-n="1"' + (ga < 1 ? ' disabled' : '') + '>单抽 · 用 1 次</button>' +
            '<button class="btn btn-gold" data-act="gacha-draw" data-n="' + Math.min(5, pool) + '"' + (ga < 1 ? ' disabled' : '') + '>' +
              (pool >= 5 ? '一次抽 5 个' : '抽完池中 ' + pool + ' 套') + ' · 用 ' + Math.min(5, pool) + ' 次</button>' +
          '</div>') +
      '<div class="gacha-slots" id="gachaSlots">' + renderGachaSlots() + '</div>' +
      '<div class="gacha-confirm" id="gachaConfirm"></div>' +
      '<div class="sheet-sub">抽取历史 <span class="tiny faint">（最近 20 条 · 来源：里程碑/币）</span></div>' +
      '<div id="gachaHist">' + renderGachaHistory() + '</div>';
  }
  function openGachaSheet() {
    state.gachaLast = null;
    state.sheetData = { type: 'gacha' };
    openSheet(
      sheetHead('扭蛋机', '池子 = 未解锁顶级皮肤 · 必中、不重复、无空奖', '') +
      '<div class="sheet-body" id="gachaBody">' + renderGachaBody() + '</div>' +
      '<div class="sheet-foot"><span class="tiny faint">次数来源：连续达标 7/14/21/30 天 → 1/2/3/4 次（各一次）；扭蛋币 1 枚 = 1 次。先扣里程碑次数，再扣币（扣币前确认）。</span></div>',
      'gacha'
    );
  }
  function gachaTimersClear() {
    (state.gachaT || []).forEach(function (t) { clearTimeout(t); });
    state.gachaT = [];
    state.gachaAnimating = false;
    const m = $('#gachaMachine');
    if (m) m.classList.remove('run');
  }
  function gachaConfirmHtml(n, plan) {
    return '<div class="gc-box"><div class="gc-t">这次要动用扭蛋币</div>' +
      '<div class="gc-s">里程碑次数已用完：本次消耗 ' + plan.coins + ' 枚扭蛋币（当前 ' + (Number(DB.coins) || 0) + ' 枚）。</div>' +
      '<div class="gc-btns"><button class="btn btn-primary btn-sm" data-act="gacha-confirm" data-n="' + n + '">确认消耗 ' + plan.coins + ' 枚</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="gacha-confirm-cancel">先不抽</button></div></div>';
  }
  function gachaGo(n, confirmed) {
    if (state.gachaAnimating) return;
    const pool = gachaPool();
    if (!pool.length) { toast('已集齐 · 等待新皮肤上架'); return; }
    const want = Math.min(Math.max(1, Number(n) || 1), pool.length);
    const plan = gachaPlan(want);
    if (!plan.enough) {
      toast('次数不够：里程碑 ' + gachaCredits() + ' 次 · 扭蛋币 ' + (Number(DB.coins) || 0) + ' 枚');
      return;
    }
    if (plan.coins > 0 && !confirmed) {
      const box = $('#gachaConfirm');
      if (box) box.innerHTML = gachaConfirmHtml(want, plan);
      return;
    }
    const res = performGacha(want);
    if (!res) return;
    state.gachaLast = res;
    const box = $('#gachaConfirm');
    if (box) box.innerHTML = '';
    runGachaAnim(res);
  }
  function runGachaAnim(res) {
    gachaTimersClear();
    const out = $('#gachaOut');
    if (!out) return;
    const reduce = prefersReduced() || DB.settings.fx === false || DB.settings.powerSave;
    if (reduce) { paintGachaResults(res); return; }
    state.gachaAnimating = true;
    state.gachaT = [];
    if (window.SkinFX) SkinFX.boost(3600);
    const machine = $('#gachaMachine');
    if (machine) machine.classList.add('run');
    out.innerHTML = '<div class="gacha-eggs" id="gachaEggs"></div>' +
      '<button class="gacha-skip" data-act="gacha-skip">跳过</button>';
    const eggs = $('#gachaEggs');
    const n = res.picks.length;
    const interval = n <= 1 ? 0 : Math.min(460, 2000 / n);
    for (let i = 0; i < n; i++) {
      state.gachaT.push(setTimeout(function () {
        if (!eggs) return;
        eggs.insertAdjacentHTML('beforeend', '<span class="egg" style="--i:' + i + '"><i class="egg-cap"></i><i class="egg-shell"></i></span>');
      }, i * interval));
    }
    const openAt = n <= 1 ? 900 : 2500;
    state.gachaT.push(setTimeout(function () { if (eggs) eggs.classList.add('open'); }, openAt));
    state.gachaT.push(setTimeout(function () { paintGachaResults(res); }, openAt + 380));
  }
  function paintGachaResults(res) {
    gachaTimersClear();
    const out = $('#gachaOut');
    if (out) out.innerHTML = '';
    const box = $('#gachaResults');
    if (box) box.innerHTML = gachaResultsHtml(res);
    const slots = $('#gachaSlots');
    if (slots) slots.innerHTML = renderGachaSlots();
    const hist = $('#gachaHist');
    if (hist) hist.innerHTML = renderGachaHistory();
    const top = $('#gachaTop');
    if (top) top.innerHTML = renderGachaTop();
    const acts = $('#gachaActions');
    if (acts) {
      const pool = gachaPool().length;
      const ga = rewardAvail();
      acts.innerHTML = pool
        ? '<button class="btn btn-primary" data-act="gacha-draw" data-n="1"' + (ga < 1 ? ' disabled' : '') + '>再抽一次</button>' +
          (pool >= 2 ? '<button class="btn btn-gold" data-act="gacha-draw" data-n="' + Math.min(5, pool) + '"' + (ga < 1 ? ' disabled' : '') + '>再抽 ' + Math.min(5, pool) + ' 个</button>' : '')
        : '<div class="gacha-empty"><b>已集齐 · 等待新皮肤上架</b><em>全部顶级皮肤都在图鉴里了。</em></div>';
    }
    if (window.SkinFX) SkinFX.boost(1200);
  }

  /* ---------- 五张连刮 ---------- */
  function hydrateBatch(pb) {
    if (!pb) return null;
    return {
      id: pb.id, at: pb.at, date: pb.date, count: pb.count, cards: pb.cards,
      done: !!pb.settled, results: pb.results || null, counts: pb.counts || null, summary: pb.summary || ''
    };
  }

  function startBatch(n) {
    const tk = DB.scratch.tickets.length;
    if (!tk) { toast('券袋是空的，先看看怎么拿券'); return false; }
    if (DB.scratch.batch && !DB.scratch.batch.settled) {
      /* 已有未揭晓的批次：先继续它，不重复开批 */
      state.batch = hydrateBatch(DB.scratch.batch);
      openBatchSheet();
      return true;
    }
    if (DB.scratch.card && !DB.scratch.card.revealed) { toast('先刮开手里这张'); return false; }
    const count = Math.min(Number(n) || 5, tk, 5);
    if (count === 1) return drawTicket();
    const tickets = DB.scratch.tickets.slice();
    const cards = [];
    for (let i = 0; i < count; i++) {
      const t = tickets[i];
      cards.push({ date: t.date, source: t.source, ticketId: t.id, revealed: false, tier: null, reward: null });
    }
    const prevCard = DB.scratch.card;
    const prevBatch = DB.scratch.batch;
    DB.scratch.card = null;
    DB.scratch.tickets = tickets.slice(count);
    /* 先建批再落盘：券扣除与 5 张卡同一次写入，关面板也不会丢 */
    DB.scratch.batch = {
      id: uid(), at: Date.now(), date: E.todayKey(), count: count, cards: cards,
      settled: false, results: null, counts: null, summary: ''
    };
    state.batch = hydrateBatch(DB.scratch.batch);
    if (!saveDB(true)) {
      DB.scratch.tickets = tickets;
      DB.scratch.card = prevCard;
      DB.scratch.batch = prevBatch;
      state.batch = null;
      toast('开批失败：存储写入失败，券未扣除');
      return false;
    }
    openBatchSheet();
    return true;
  }

  function openBatchSheet() {
    const b = state.batch;
    if (!b) return;
    expireCredits(true);
    state.sheetData = { type: 'scratch-batch' };
    const tk = DB.scratch.tickets.length;
    openSheet(
      sheetHead('五张连刮', '一次划过，全部同开 · 每张独立结算', '') +
      '<div class="sheet-body" id="batchBody">' +
        '<div class="scratch-meta"><span class="tiny faint">本次 ' + b.count + ' 张 · 券袋剩余 ' + tk + ' 张</span><span class="tiny faint">五张共用一条擦除轨迹</span></div>' +
        '<div class="batch-grid" id="batchGrid">' + b.cards.map((c, i) =>
          '<div class="batch-card" data-i="' + i + '">' +
          '<div class="bc-face"><span class="sp-lock">' + icon('spark') + '<span>刮开<br>才知道</span></span></div>' +
          '<canvas class="batch-canvas" aria-label="第 ' + (i + 1) + ' 张"></canvas>' +
          '<span class="bc-no">' + (i + 1) + '</span></div>').join('') +
        '</div>' +
        '<div class="batch-progress"><span id="batchProgress"></span></div>' +
        '<div class="batch-foot" id="batchFoot"></div>' +
        '<div id="ticketHelpSlot">' + ticketHelpHtml(false) + '</div>' +
        '<div class="scratch-tools" id="batchTools"><button class="btn btn-ghost btn-sm" data-act="batch-reveal">直接揭晓</button></div>' +
      '</div>' +
      '<div class="sheet-foot"><span class="tiny faint">五张共用一条擦除轨迹；每张按普通 80% / 稀有 17% / 传说 3% 独立结算，连续 7 张未出稀有则保底。</span></div>',
      'scratch-batch'
    );
    if (b.done && b.results) paintBatchResults();
    else initBatchCanvases();
  }

  function batchCoat(ctx, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const coat = {
      cloth: ['#cfd4d0', '#e9ebe6', '#b9c1bb', '#dfe3dc'],
      petal: ['#f3d6df', '#fbebf0', '#e7b9c9', '#f8e2e9'],
      star: ['#4a5a7a', '#8d9cbe', '#35405c', '#6b7897'],
      neon: ['#4a2b68', '#8a4fb0', '#2e1c44', '#6f3d93'],
      ink: ['#c9c4b8', '#e6e2d8', '#a9a396', '#d9d4c8'],
      fire: ['#7a3a2a', '#b06a3a', '#5a2a1e', '#9a5530']
    }[DB.skins.scratchArt] || ['#cfd4d0', '#e9ebe6', '#b9c1bb', '#dfe3dc'];
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, coat[0]); g.addColorStop(0.35, coat[1]);
    g.addColorStop(0.6, coat[2]); g.addColorStop(1, coat[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    let seed = 20261104;
    for (let i = 0; i < 260; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const nx = (seed % w), ny = ((seed >> 8) % h);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + (seed % 7) / 100) + ')';
      ctx.fillRect(nx, ny, 1.2 * dpr, 1.2 * dpr);
    }
    const dark = ['star', 'neon', 'fire'].indexOf(DB.skins.scratchArt) >= 0;
    ctx.fillStyle = dark ? 'rgba(255,255,255,.7)' : 'rgba(70,80,72,.45)';
    ctx.textAlign = 'center';
    ctx.font = Math.round(11 * dpr) + 'px system-ui, sans-serif';
    ctx.fillText('刮', w / 2, h / 2 + 4 * dpr);
  }

  function initBatchCanvases() {
    const grid = $('#batchGrid');
    if (!grid) return;
    const b = state.batch;
    if (!b) return;
    const cards = $$('.batch-card', grid);
    const cvs = cards.map(c => $('canvas', c)).filter(Boolean);
    if (!cvs.length) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctxs = cvs.map(function (cv) {
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = cv.getContext('2d');
      batchCoat(ctx, cv.width, cv.height);
      ctx.globalCompositeOperation = 'destination-out';
      return { cv: cv, ctx: ctx };
    });
    const BRUSH = Math.max(12, 18 * dpr);
    let anchor = null, last = null, drawing = false, tick = 0;
    function rel(e) {
      const r = (anchor || cvs[0]).getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      };
    }
    function erase(x, y) {
      ctxs.forEach(function (o) {
        o.ctx.beginPath();
        o.ctx.arc(o.cv.width * x, o.cv.height * y, BRUSH, 0, Math.PI * 2);
        o.ctx.fill();
      });
    }
    function line(a, z) {
      const steps = Math.min(24, Math.max(1, Math.round(Math.hypot((z.x - a.x) * 120, (z.y - a.y) * 100))));
      for (let i = 0; i <= steps; i++) erase(a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps);
    }
    function ratio() {
      const list = [];
      ctxs.forEach(function (o) {
        try {
          const img = o.ctx.getImageData(0, 0, o.cv.width, o.cv.height).data;
          let clear = 0, total = 0;
          for (let i = 3; i < img.length; i += 48) { total++; if (img[i] < 40) clear++; }
          list.push(total ? clear / total : 0);
        } catch (e) { list.push(0); }
      });
      return { list: list, avg: list.length ? list.reduce(function (a, z) { return a + z; }, 0) / list.length : 0 };
    }
    function progress() {
      const r = ratio();
      b.covered = r.avg;
      b.ratios = r.list;
      const bar = $('#batchProgress');
      if (bar) bar.style.width = Math.round(r.avg * 100) + '%';
      if (r.avg >= 0.6 && !b.done) settleBatch();
    }
    grid.addEventListener('pointerdown', function (e) {
      if (b.done) return;
      const card = e.target.closest ? e.target.closest('.batch-card') : null;
      const cv = card ? $('canvas', card) : null;
      if (!cv) return;
      anchor = cv;
      drawing = true;
      if (grid.setPointerCapture) grid.setPointerCapture(e.pointerId);
      last = rel(e);
      erase(last.x, last.y);
      e.preventDefault();
    });
    grid.addEventListener('pointermove', function (e) {
      if (!drawing || b.done) return;
      const p = rel(e);
      line(last, p);
      last = p;
      if (++tick % 6 === 0) progress();
      e.preventDefault();
    });
    function end(e) {
      if (!drawing) return;
      drawing = false;
      anchor = null;
      progress();
    }
    grid.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', end);
    grid.addEventListener('pointerleave', function () { if (drawing) end(); });
  }

  function settleBatch() {
    const b = state.batch;
    if (!b) return null;
    const pb = DB.scratch.batch;
    /* 同一批只结算一次：内存标记 + 落盘 settled 双保险（刷新后也不会重复入账） */
    if (b.done || (pb && pb.id === b.id && pb.settled)) return null;
    const snapshot = JSON.stringify(DB);
    try {
      b.done = true;
      const subs = [];
      b.cards.forEach(function (c) {
        const ti = scratchTierInfo(DB.scratch.miss);
        const tier = ti.tier;
        const reward = applyScratchReward(tier, ti.pity);
        c.revealed = true;
        c.tier = tier;
        c.reward = reward;
        DB.scratch.miss = tier === 'common' ? DB.scratch.miss + 1 : 0;
        DB.scratch.count = (DB.scratch.count || 0) + 1;
        subs.push({ tier: tier, label: reward.label, detail: reward.detail || '' });
      });
      const counts = { common: 0, rare: 0, legend: 0 };
      subs.forEach(function (s) { counts[s.tier]++; });
      const order = { legend: 3, rare: 2, common: 1 };
      const sorted = subs.slice().sort(function (a, z) { return order[z.tier] - order[a.tier]; });
      const summary = ['legend', 'rare', 'common'].filter(function (t) { return counts[t]; })
        .map(function (t) { return counts[t] + ' ' + SCRATCH_TIER[t].label; }).join(' / ');
      const top = sorted[0] ? sorted[0].tier : 'common';
      b.results = sorted;
      b.counts = counts;
      b.summary = summary;
      DB.scratch.last = { tier: top, label: '连刮 ' + b.count + ' 张 · ' + summary, detail: subs.map(function (s) { return s.label; }).join('；'), at: Date.now(), date: E.todayKey(), batch: true };
      DB.scratch.log.unshift({
        id: uid(), date: E.todayKey(), at: Date.now(), source: 'batch', batch: true, tier: top,
        label: '刮 ' + b.count + ' 张 · ' + summary,
        subs: subs.map(function (s) { return { tier: s.tier, label: s.label }; })
      });
      DB.scratch.log = DB.scratch.log.slice(0, 60);
      /* 批次结果与奖励一次性写入；settled 落盘后重开只能查看，不能再结算 */
      if (pb && pb.id === b.id) {
        pb.settled = true;
        pb.settledAt = Date.now();
        pb.results = sorted;
        pb.counts = counts;
        pb.summary = summary;
        pb.cards.forEach(function (c, i) {
          const s = subs[i];
          if (!s) return;
          c.revealed = true;
          c.tier = s.tier;
          c.reward = { label: s.label, detail: s.detail || '' };
        });
      }
      if (!saveDB(true)) throw new Error('save-failed');
    } catch (e) {
      /* 任一环节失败：整批回滚，券与奖励都不变，批次仍可继续揭晓 */
      DB = JSON.parse(snapshot);
      state.batch = hydrateBatch(DB.scratch.batch);
      toast('结算失败：本批未入账，券与奖励保持原样；请清理存储后重试');
      if (state.sheet === 'scratch-batch') openBatchSheet();
      return null;
    }
    paintBatchResults();
    toast('连刮 ' + b.count + ' 张：' + b.summary);
    if (state.tab === 'today') renderToday();
    return { results: b.results, counts: b.counts, summary: b.summary };
  }

  function paintBatchResults() {
    const b = state.batch;
    if (!b || !b.results) return;
    const grid = $('#batchGrid');
    const prog = $('.batch-progress');
    if (prog) prog.hidden = true;
    if (grid) {
      const noAnim = prefersReduced() || DB.settings.fx === false;
      grid.className = 'batch-results' + (noAnim ? ' no-anim' : ' anim');
      grid.innerHTML = b.results.map(function (s, i) {
        return '<div class="br-row tier-' + s.tier + '" style="--i:' + i + '">' +
          '<span class="hr-tier ' + SCRATCH_TIER[s.tier].color + '">' + SCRATCH_TIER[s.tier].label + '</span>' +
          '<span class="hr-main"><b>' + esc(s.label) + '</b><em>' + esc(s.detail || '') + '</em></span></div>';
      }).join('');
    }
    const tk = DB.scratch.tickets.length;
    const foot = $('#batchFoot');
    if (foot) {
      const noAnim = prefersReduced() || DB.settings.fx === false;
      foot.innerHTML = '<div class="batch-sum"><b>共得 ' + b.summary + '</b><em>' + b.count + ' 张已各自入账，抽奖历史记为 1 条</em></div>' +
        '<div class="scratch-actions">' +
        (tk > 0
          ? '<button class="btn btn-primary btn-sm" data-act="scratch-draw">再刮一张（剩 ' + tk + '）</button>'
          : '<button class="btn btn-primary btn-sm" data-act="ticket-help">券用完了 · 怎么拿券</button>') +
        '<button class="btn btn-ghost btn-sm" data-act="scratch-batch"' + (tk ? '' : ' disabled') + '>' + batchLabel(tk) + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="close-sheet">回今天</button>' +
        '</div>' + (noAnim ? '' : '<div class="scratch-tools"><button class="btn btn-ghost btn-sm" data-act="batch-skip">跳过动画</button></div>');
    }
    const tools = $('#batchTools');
    if (tools) tools.hidden = true;
  }

  function exportScratchLog() {
    const rows = (DB.scratch.log || []).slice(0, 20).map(r => ({
      date: r.date, time: new Date(r.at || Date.now()).toLocaleString('zh-CN'),
      tier: r.tier, tierLabel: SCRATCH_TIER[r.tier].label, prize: r.label,
      batch: !!r.batch,
      subs: r.batch && Array.isArray(r.subs) ? r.subs.map(s => ({ tier: s.tier, tierLabel: SCRATCH_TIER[s.tier].label, prize: s.label })) : undefined
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'energy-ledger-scratch-log.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('已导出最近 ' + rows.length + ' 条抽奖记录');
  }

  function paintScratchReveal(card, reward) {
    const stage = $('#scratchStage');
    if (!stage) return;
    stage.outerHTML = scratchCardHtml(card);
    const body = $('#scratchBody');
    if (body && !$('.scratch-actions')) {
      const div = document.createElement('div');
      div.className = 'scratch-actions wait';
      div.innerHTML = '<button class="btn btn-primary btn-sm" data-act="open-wallet">存进钱包</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="close-sheet">回今天</button>';
      body.appendChild(div);
    }
    if (DB.settings.fx && !prefersReduced()) spawnSparkles(card.tier === 'rare' ? 36 : card.tier === 'legend' ? 18 : 6);
  }

  function prefersReduced() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }

  function spawnSparkles(count) {
    const stage = $('#scratchStage');
    if (!stage) return;
    const n = Math.min(40, Math.max(1, Number(count) || 6));
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'scratch-spark';
      s.style.left = (10 + Math.random() * 80) + '%';
      s.style.animationDelay = (Math.random() * 0.55) + 's';
      s.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      stage.appendChild(s);
    }
    setTimeout(() => { $$('.scratch-spark', stage).forEach(x => x.remove()); }, 2200);
  }

  /* 刮除碎屑：同时最多 8 个，只动 transform/opacity */
  function spawnChip(cv, x, y) {
    const stage = $('#scratchStage');
    if (!stage) return;
    const live = stage.querySelectorAll('.scratch-chip').length;
    if (live >= 8) return;
    const s = document.createElement('span');
    s.className = 'scratch-chip';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--dx', (Math.random() * 34 - 17) + 'px');
    stage.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }

  function initScratchCanvas() {
    const cv = $('#scratchCanvas');
    if (!cv || !cv.getContext) return;
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const coat = {
      cloth: ['#cfd4d0', '#e9ebe6', '#b9c1bb', '#dfe3dc'],
      petal: ['#f3d6df', '#fbebf0', '#e7b9c9', '#f8e2e9'],
      star: ['#4a5a7a', '#8d9cbe', '#35405c', '#6b7897'],
      neon: ['#4a2b68', '#8a4fb0', '#2e1c44', '#6f3d93'],
      ink: ['#c9c4b8', '#e6e2d8', '#a9a396', '#d9d4c8'],
      fire: ['#7a3a2a', '#b06a3a', '#5a2a1e', '#9a5530']
    }[DB.skins.scratchArt] || ['#cfd4d0', '#e9ebe6', '#b9c1bb', '#dfe3dc'];
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, coat[0]); g.addColorStop(0.35, coat[1]);
    g.addColorStop(0.6, coat[2]); g.addColorStop(1, coat[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    /* 银色涂层颗粒噪点 */
    let seed = 20261104;
    for (let i = 0; i < 900; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const nx = (seed % w), ny = ((seed >> 8) % h);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + (seed % 7) / 100) + ')';
      ctx.fillRect(nx, ny, 1.4 * dpr, 1.4 * dpr);
    }
    const darkCoat = ['star', 'neon', 'fire'].indexOf(DB.skins.scratchArt) >= 0;
    ctx.fillStyle = darkCoat ? 'rgba(255,255,255,.72)' : 'rgba(70,80,72,.45)';
    ctx.font = Math.round(15 * dpr) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('刮开今日福利', w / 2, h / 2 - 4 * dpr);
    ctx.fillStyle = darkCoat ? 'rgba(255,255,255,.55)' : 'rgba(70,80,72,.35)';
    ctx.font = Math.round(11 * dpr) + 'px system-ui, sans-serif';
    ctx.fillText('涂开 60% 自动揭晓', w / 2, h / 2 + 16 * dpr);
    ctx.globalCompositeOperation = 'destination-out';
    let drawing = false, lastPt = null, tick = 0, done = false;
    const dprScale = dpr;
    function pos(e) {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
    }
    function dot(x, y, r) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    function ratio() {
      try {
        const img = ctx.getImageData(0, 0, w, h).data;
        let clear = 0, total = 0;
        for (let i = 3; i < img.length; i += 64) { total++; if (img[i] < 40) clear++; }
        return total ? clear / total : 0;
      } catch (e) { return 0; }
    }
    function check() {
      const p = ratio();
      const bar = $('#scratchProgress');
      if (bar) bar.style.width = Math.round(p * 100) + '%';
      if (p >= 0.6 && !done) { done = true; revealScratchCard(); }
    }
    const BRUSH = 24 * dprScale; /* 笔刷半径 24px */
    cv.addEventListener('pointerdown', function (e) {
      if (done) return;
      drawing = true;
      if (cv.setPointerCapture) cv.setPointerCapture(e.pointerId);
      lastPt = pos(e);
      dot(lastPt.x, lastPt.y, BRUSH);
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (err) { } }
      e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drawing || done) return;
      const p = pos(e);
      const dx = p.x - lastPt.x, dy = p.y - lastPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.round(dist / (8 * dprScale)));
      for (let i = 1; i <= steps; i++) dot(lastPt.x + dx * i / steps, lastPt.y + dy * i / steps, BRUSH);
      lastPt = p;
      if (!prefersReduced() && tick % 2 === 0) spawnChip(cv, e.clientX, e.clientY);
      if (++tick % 6 === 0) check();
      e.preventDefault();
    });
    function up(e) {
      if (!drawing) return;
      drawing = false;
      if (cv.releasePointerCapture && e.pointerId != null) { try { cv.releasePointerCapture(e.pointerId); } catch (err) { } }
      check();
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', up);
  }

  function openWalletSheet() {
    expireCredits(false);
    state.sheetData = { type: 'wallet' };
    openSheet(
      sheetHead('福利钱包', '额度券 · 放纵日通行证 · 预算银行 · 复活券 · 图鉴', '') +
      '<div class="sheet-body" id="walletBody">' + renderWallet() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-ghost" data-act="open-skins">皮肤墙</button><button class="btn btn-primary" data-act="open-codex">图鉴</button></div>',
      'wallet'
    );
  }

  function paintWallet() {
    const b = $('#walletBody');
    if (b) b.innerHTML = renderWallet();
  }

  function creditExpireText(c) {
    if (!c.expire) return '长期有效';
    if (c.expire === E.todayKey()) return '今天到期';
    return c.expire + ' 到期';
  }

  function renderWallet() {
    const today = E.todayKey();
    const credits = DB.wallet.credits.filter(c => !c.used && (!c.expire || c.expire >= today));
    const used = DB.wallet.credits.filter(c => c.used).slice(-4);
    const pass = DB.scratch.pass || {};
    const passWeek = pass.week === weekId();
    const loan = bankActive();
    const applied = creditApplied(today);
    const wish = DB.wishlist.slice(-4).reverse();
    const revive = DB.revive.filter(v => !v.used);
    const wkUsed = Number(DB.scratch.weeklyKcal[weekId()]) || 0;
    const lit = (DB.codex.lit || []).length;
    return '<div class="wallet-sum">' +
        '<div class="ws-cell"><div class="ws-n">' + credits.length + '</div><div class="ws-l">今日可用额度券</div></div>' +
        '<div class="ws-cell"><div class="ws-n">' + (applied ? '+' + fmt(applied) : '0') + '</div><div class="ws-l">今日已启用 kcal</div></div>' +
        '<div class="ws-cell"><div class="ws-n">' + wkUsed + '/300</div><div class="ws-l">本周额度已发</div></div>' +
      '</div>' +
      '<div class="wallet-sec"><div class="section-head"><h2>额度券</h2><span class="tiny faint">当日有效 · 不攒 · 过期作废</span></div>' +
        (credits.length ? credits.map(c =>
          '<div class="credit-row"><span class="cr-k">+' + fmt(c.kcal) + '<small>kcal</small></span>' +
          '<span class="cr-main"><b>' + esc(c.label) + '</b><em>' + creditExpireText(c) + ' · ' + esc(c.from || '') + '</em></span>' +
          '<button class="btn btn-ghost btn-sm" data-act="wallet-use" data-id="' + c.id + '">使用</button></div>').join('')
          : '<div class="wallet-empty">还没有额度券。每日刮卡的小概率额度会进这里，本周累计上限 300 kcal。</div>') +
        (used.length ? '<div class="credit-used">最近已用：' + used.map(c => fmt(c.kcal) + ' kcal').join('、') + '</div>' : '') +
      '</div>' +
      '<div class="wallet-sec"><div class="section-head"><h2>放纵日通行证</h2><span class="tiny faint">只在刮卡稀有档掉落 · 每周 1 次</span></div>' +
        '<div class="cheat-box' + (cheatActive(today) ? ' on' : '') + '">' +
          '<div class="cb-t">' + (passWeek && !pass.used
            ? '本周通行证可用：使用后今天预算 +15%，超支标「经批准」，不打断连续达标。'
            : (passWeek && pass.used
              ? '本周通行证已用过。下周刮到稀有档时可能再获得。'
              : '没有可用的通行证。它由稀有档 20% 子项掉落，仅本周有效，不叠加。')) + '</div>' +
          (passWeek && !pass.used && !cheatActive(today)
            ? '<button class="btn btn-ghost btn-sm" data-act="pass-use">使用放纵日通行证</button>' : '') +
        '</div>' +
        ((DB.leaveDays || []).length ? '<div class="tiny faint" style="margin-top:8px">请假条：' + DB.leaveDays.slice(-5).join('、') + '（当天标灰，不打断连续达标）</div>' : '') +
      '</div>' +
      '<div class="wallet-sec"><div class="section-head"><h2>预算银行</h2><span class="tiny faint">借 100 · 明天还 120</span></div>' +
        '<div class="cheat-box' + (loan ? ' on' : '') + '">' +
          '<div class="cb-t">' + (loan
            ? '已借 ' + fmt(loan.amount) + ' kcal，明天（' + loan.due + '）预算自动扣 ' + fmt(loan.repay) + ' kcal（含 20 kcal 利息）。'
            : '今天可向明天借 100 kcal，明天还款 120 kcal。只影响预算，不影响连续达标判定。') + '</div>' +
          ((DB.bank.waivers.free || 0) > 0 || (DB.bank.waivers.extra || 0) > 0
            ? '<div class="tiny faint" style="margin:6px 0 2px">可用券：' +
              ((DB.bank.waivers.free || 0) > 0 ? '免息 ×' + DB.bank.waivers.free + ' ' : '') +
              ((DB.bank.waivers.extra || 0) > 0 ? '提额 ×' + DB.bank.waivers.extra : '') + '</div>' : '') +
          (loan ? '' : '<button class="btn btn-ghost btn-sm" data-act="bank-borrow">借 ' + ((DB.bank.waivers.extra || 0) > 0 ? '150' : '100') + ' kcal</button>') +
        '</div>' +
      '</div>' +
      '<div class="wallet-sec"><div class="section-head"><h2>复活券</h2><span class="tiny faint">传说 10% 纪念章附带</span></div>' +
        (revive.length ? revive.map(v =>
          '<div class="credit-row"><span class="cr-k">' + icon('spark') + '</span>' +
          '<span class="cr-main"><b>连续达标复活券</b><em>补回最近一个断档日，当天按请假条处理</em></span>' +
          '<button class="btn btn-ghost btn-sm" data-act="revive-use" data-id="' + v.id + '">使用</button></div>').join('')
          : '<div class="wallet-empty">还没有复活券。传说档「特殊纪念章」有 10% 概率附带。</div>') +
      '</div>' +
      '<div class="wallet-sec"><div class="section-head"><h2>想吃清单</h2><span class="tiny faint">只展示与记录，不记热量</span></div>' +
        (wish.length ? '<div class="chip-row">' + wish.map(w => '<span class="chip">' + esc(w.name) + '</span>').join('') + '</div>'
          : '<div class="wallet-empty">刮到普通奖时可能解锁高热量菜谱，只做展示，不自动记账。</div>') +
      '</div>' +
      '<div class="wallet-sec"><div class="section-head"><h2>图鉴与皮肤</h2><span class="tiny faint">' + lit + '/1,046 原料点亮</span></div>' +
        '<div class="chip-row"><button class="chip" data-act="open-codex">图鉴 ' + lit + '</button>' +
        '<button class="chip" data-act="open-skins">皮肤 ' + galleryUnlocked() + '/' + gallerySkins().length + ' · ' + esc((skinById(DB.skins.active) || { name: '宣纸' }).name) + '</button></div>' +
      '</div>';
  }

  function useWalletCredit(id) {
    const c = DB.wallet.credits.find(x => x.id === id);
    if (!c || c.used) return;
    const today = E.todayKey();
    if (c.expire && c.expire < today) { expireCredits(false); paintWallet(); toast('这张额度券已过期'); return; }
    c.used = true;
    c.usedAt = Date.now();
    DB.wallet.applied.push({ date: today, id: c.id, kcal: c.kcal });
    saveDB(true);
    renderToday();
    paintWallet();
    toast('已启用 +' + c.kcal + ' kcal：今日预算已上调');
  }

  function useCheatPass() {
    const today = E.todayKey();
    const p = DB.scratch.pass || {};
    if (p.week !== weekId()) { toast('这张通行证已过期：仅当周有效'); return; }
    if (p.used) { toast('本周的放纵日通行证已用过'); return; }
    if (cheatActive(today)) { toast('今天已经是经批准的放纵日'); return; }
    activateCheat(today, '通行证');
    p.used = true;
    p.usedAt = Date.now();
    saveDB(true);
    renderToday();
    paintWallet();
    toast('放纵日已启用：今日预算 +15%，不打断连续达标');
  }

  function borrowBudget() {
    const today = E.todayKey();
    if (bankActive()) { toast('已有一笔预算借款，明天还清后再借'); return; }
    const w = DB.bank.waivers || { free: 0, extra: 0 };
    const lift = (w.extra || 0) > 0;
    const free = (w.free || 0) > 0;
    const amount = lift ? 150 : 100;
    const repay = free ? amount : amount + 20;
    if (lift) { DB.bank.waivers.extra -= 1; }
    if (free) { DB.bank.waivers.free -= 1; }
    DB.bank.loans.push({ id: uid(), date: today, amount: amount, due: E.addDays(today, 1), repay: repay, at: Date.now(), lift: lift, free: free });
    DB.bank.loans = DB.bank.loans.slice(-20);
    saveDB(true);
    renderToday();
    paintWallet();
    toast('已借 ' + amount + ' kcal：明天预算自动还 ' + repay + ' kcal' + (free ? '（免息券已用）' : ''));
  }

  function useRevive(id) {
    const v = DB.revive.find(x => x.id === id && !x.used);
    if (!v) { toast('这张复活券已用过'); return; }
    const today = E.todayKey();
    let day = E.addDays(today, -1);
    let found = '';
    for (let i = 0; i < 60; i++) {
      const d = E.addDays(today, -1 - i);
      const has = DB.entries.some(e => e.date === d);
      const skip = (DB.leaveDays || []).indexOf(d) >= 0 || cheatActive(d);
      if (!has && !skip) { found = d; break; }
    }
    if (!found) { toast('最近 60 天没有可补的断档日'); return; }
    DB.leaveDays.push(found);
    v.used = true;
    v.usedAt = Date.now();
    saveDB(true);
    renderActive();
    toast('复活券已使用：' + found + ' 按请假条补回，连续达标已续上');
  }

  function renderSkinWall() {
    const active = DB.skins.active;
    const unlocked = SKINS.filter(s => skinUnlocked(s.id)).length;
    return '<div class="skin-note">' + unlocked + ' / ' + SKINS.length + ' 套纸面 · 点击即切换 · 暗色模式自动使用对应暗色变体 · 正文对比度 ≥ WCAG AA 4.5:1</div>' +
      '<div class="skin-grid">' + SKINS.map(s => {
        const on = skinUnlocked(s.id);
        const soon = !!s.pending;
        return '<button class="skin-card' + (on ? '' : ' locked') + (soon ? ' soon' : '') + (s.id === active ? ' active' : '') + (s.tier === 'top' ? ' top' : '') + '" data-act="skin-apply" data-id="' + s.id + '">' +
          '<span class="sk-swatch' + (s.art ? ' art' : '') + '" style="--sw:' + s.swatch + ';--swink:' + s.ink + (s.art ? ';background-image:url(' + skinArtThumb(s.id) + ')' : '') + '"><b>账</b></span>' +
          '<span class="sk-main"><b>' + s.name + '</b><em>' + (soon ? '即将上架' : (on ? (s.art && !packReady(s.id) ? '已获得 · 待下载' : (s.id === active ? '当前使用' : '已解锁')) : '未解锁 · ' + s.src)) + '</em></span>' +
          (s.tier === 'top' ? '<span class="sk-top">' + (soon ? '即将上架' : '扭蛋限定') + '</span>' : '') +
          (on || soon ? '' : '<span class="sk-lock">' + icon('lock') + '</span>') +
        '</button>';
      }).join('') + '</div>' +
      '<div class="notebox">解锁来源：开局自带 2 套；连续达标 7 天 / 30 天各 1 套；稀有档解锁 21 套；顶级 ' + galleryTopCount() + ' 套为扭蛋限定，只从扭蛋机产出，刮卡池永不回填。</div>';
  }

  function openSkinsSheet() {
    state.sheetData = { type: 'skins' };
    openSheet(
      sheetHead('皮肤墙', '纸色 · 纸纹 · 墨色 · 印章 · 字体 · 暗色', '') +
      '<div class="sheet-body" id="skinBody">' + renderSkinWall() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="open-skin-gallery">皮肤图鉴</button><button class="btn btn-ghost" data-act="close-sheet">关闭</button><span class="tiny faint">当前：' + esc((skinById(DB.skins.active) || { name: '宣纸·米白' }).name) + '</span></div>',
      'skins'
    );
  }

  function applySkin(id) {
    const s = skinById(id);
    if (!s) return;
    if (!skinUnlocked(id)) {
      toast('未解锁：' + s.name + ' · 来源：' + s.src);
      return;
    }
    DB.skins.active = id;
    saveDB(true);
    applySkins();
    const b = $('#skinBody');
    if (b) b.innerHTML = renderSkinWall();
    renderToday();
    toast('已切换皮肤：' + s.name);
  }

  /* ---------- v4.3 皮肤图鉴 ---------- */
  function renderSkinGallery() {
    const sd = state.sheetData || {};
    const filter = sd.filter || 'all';
    const selected = skinById(sd.selected) || skinById(DB.skins.active) || SKINS[0];
    const unlockedN = galleryUnlocked();
    const totalN = gallerySkins().length;
    const list = gallerySkins().filter(s => filter === 'all' ? true : filter === 'unlocked' ? skinUnlocked(s.id) : !skinUnlocked(s.id));
    const on = skinUnlocked(selected.id);
    const pending = on && selected.art && !packReady(selected.id);
    const soon = !!selected.pending;
    const preview = '<div class="gal-preview' + (selected.art ? ' art' : '') + (on ? '' : ' locked') + (soon ? ' soon' : '') + '" style="--sw:' + selected.swatch + ';--swink:' + selected.ink +
      (selected.thumb ? ';background-image:url(' + esc(selected.thumb) + ')' : selected.art ? ';background-image:url(' + skinArtThumb(selected.id) + ')' : '') + '">' +
      '<div class="gp-paper"><b>账本</b><span>' + (soon ? '即将上架 · ' + esc(selected.tag) : '预览 · ' + esc(selected.tag)) + '</span></div></div>' +
      '<div class="gal-info"><b>' + esc(selected.name) + (selected.tier === 'top' ? ' <span class="top-mark">' + (soon ? '即将上架' : '扭蛋限定') + '</span>' : '') + '</b>' +
      '<span class="tiny faint">' + esc(soon ? '素材制作中' : selected.src) + ' · 色系：' + esc(selected.tag) +
        (selected.tier === 'top' && !on && !soon ? ' · 在扭蛋池中（池中 ' + gachaPool().length + ' 套）' : '') + '</span>' +
      (soon
        ? '<div class="gal-soon-tip">' + icon('spark') + ' 这套素材还在制作中，暂不进入扭蛋池；上好即上架。</div>'
        : (on
        ? '<button class="btn btn-primary btn-sm" data-act="skin-set-active" data-id="' + selected.id + '">' + (DB.skins.active === selected.id ? '当前使用中' : '设为当前') + '</button>' +
          (selected.tier === 'top' && selected.art ? '<button class="btn btn-ghost btn-sm" data-act="skin-preview" data-id="' + selected.id + '">动效预览 3 秒</button>' : '') +
          (pending ? '<div class="pack-pending"><b>已获得 · 待下载</b><em>' + (packProgressText(selected.id) || '点按钮下载皮肤包，之后离线也能用') + '</em>' +
            '<button class="btn btn-ghost btn-sm" data-act="skin-download" data-id="' + selected.id + '"' + (packState(selected.id) && packState(selected.id).status === 'loading' ? ' disabled' : '') + '>下载皮肤包</button></div>' : '')
        : '<div class="gal-locked-tip">' + icon('lock') + ' 未解锁 · 获取方式：' + esc(selected.src) + '。图鉴不提供跳过解锁的按钮。</div>')) +
      '</div>';
    const cards = list.map(s => {
      const u = skinUnlocked(s.id);
      const soon2 = !!s.pending;
      return '<button class="gal-card' + (u ? '' : ' locked') + (soon2 ? ' soon' : '') + (s.id === selected.id ? ' sel' : '') + (s.tier === 'top' ? ' top' : '') + '" data-act="gallery-pick" data-id="' + s.id + '">' +
        '<span class="gc-thumb' + (s.art ? ' art' : '') + '" style="--sw:' + s.swatch + ';--swink:' + s.ink +
        (!s.thumb && s.art ? ';background-image:url(' + skinArtThumb(s.id) + ')' : '') + '">' +
        (s.thumb ? '<img class="gc-img" loading="lazy" decoding="async" alt="" src="' + esc(s.thumb) + '">' : '') + '<b>账</b>' +
        (soon2 ? '<span class="gc-soon">即将上架</span>' : (u ? '' : '<span class="gc-lock">' + icon('lock') + '</span>')) + '</span>' +
        '<span class="gc-name">' + esc(s.name) + '</span>' +
        '<span class="gc-tag">' + esc(s.tag) + '</span>' +
        '<span class="gc-src">' + (soon2 ? '即将上架' : esc(skinSrcShort(s))) + '</span>' +
        '</button>';
    }).join('');
    const cosGroups = Object.keys(COS_KINDS).map(k => {
      const def = COS_KINDS[k];
      const chips = def.list.map(x => {
        const u = cosUnlocked(k, x.id);
        const cur = DB.skins[def.field] === x.id;
        return '<button class="cos-chip' + (u ? '' : ' locked') + (cur ? ' on' : '') + '" data-act="cos-apply" data-kind="' + k + '" data-id="' + x.id + '">' +
          (u ? '' : icon('lock')) + esc(x.name) + (cur ? ' · 使用中' : '') + '</button>';
      }).join('');
      return '<div class="cos-group"><div class="cg-head">' + def.label + ' <span class="tiny faint">' +
        def.list.filter(x => cosUnlocked(k, x.id)).length + '/' + def.list.length + '</span></div><div class="cos-grid">' + chips + '</div></div>';
    }).join('');
    return '<div class="gal-head"><div><b>皮肤图鉴</b><span class="tiny faint">已解锁 ' + unlockedN + ' / ' + totalN + ' · 收集率 ' + Math.round(unlockedN / totalN * 100) + '%</span></div>' +
      '<div class="seg gal-seg">' + [['all', '全部'], ['unlocked', '已解锁'], ['locked', '未解锁']].map(x =>
        '<button data-act="gallery-filter" data-f="' + x[0] + '" class="' + (filter === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
      '<div class="gal-preview-wrap">' + preview + '</div>' +
      '<div class="gal-grid">' + cards + '</div>' +
      '<div class="sheet-sub">外观收藏 <span class="tiny faint">（点击已解锁项直接启用）</span></div>' + cosGroups +
      '<div class="notebox">未解锁项显示灰度剪影，不提供假装解锁的按钮；顶级 ' + galleryTopCount() + ' 套为扭蛋限定，只从扭蛋机产出。</div>';
  }

  function openSkinGallery() {
    state.sheetData = { type: 'gallery', filter: 'all', selected: DB.skins.active };
    openSheet(
      sheetHead('皮肤图鉴', gallerySkins().length + ' 套纸面 · 未解锁显示灰度剪影 · 顶级 ' + galleryTopCount() + ' 套扭蛋限定', '') +
      '<div class="sheet-body" id="galleryBody">' + renderSkinGallery() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="open-skins">皮肤墙</button><button class="btn btn-ghost" data-act="close-sheet">关闭</button></div>',
      'gallery'
    );
  }

  function simulateScratch(n) {
    const total = Math.max(1, Number(n) || 1);
    let common = 0, rare = 0, legend = 0, top = 0, gold = 0, medal = 0, cosmetic = 0, coin = 0, pity = 0;
    for (let i = 0; i < total; i++) {
      const ti = scratchTierInfo(0);
      if (ti.tier === 'common') common++;
      else if (ti.tier === 'rare') rare++;
      else {
        legend++;
        const x = recoRng();
        if (x < 0.60) coin++;
        else if (x < 0.60 + 0.40 / 3) gold++;
        else if (x < 0.60 + 0.40 * 2 / 3) medal++;
        else cosmetic++;
      }
    }
    const pct = v => (v / total * 100).toFixed(2) + '%';
    return {
      n: total, common: common, rare: rare, legend: legend, top: top, gold: gold, medal: medal,
      cosmetic: cosmetic, coin: coin, pity: pity,
      commonPct: pct(common), rarePct: pct(rare), legendPct: pct(legend), topPct: pct(top),
      coinPct: pct(coin), topInLegendPct: '0.00%'
    };
  }
  function renderCodex(data) {
    const lit = new Set(DB.codex.lit || []);
    const cats = data.cats || [];
    const rows = data.rows || [];
    const total = rows.length;
    let hit = 0;
    const byCat = cats.map(() => ({ n: 0, hit: 0 }));
    rows.forEach(r => {
      const ci = cats.indexOf(r[1]);
      if (ci < 0) return;
      byCat[ci].n++;
      if (lit.has(r[0])) { byCat[ci].hit++; hit++; }
    });
    const rate = total ? hit / total * 100 : 0;
    return '<div class="codex-head"><div class="cx-rate">' + rate.toFixed(1) + '<small>%</small></div>' +
      '<div class="cx-meta"><b>已点亮 ' + hit + ' / ' + fmt(total) + ' 种原料</b><em>记账时用到食物库里的原料就会点亮；刮卡普通档「图鉴点亮卡」也会随机点亮 3 种。</em></div></div>' +
      '<div class="codex-cats">' + cats.map((c, i) => {
        const p = byCat[i].n ? byCat[i].hit / byCat[i].n * 100 : 0;
        return '<div class="cx-row"><span class="cx-c">' + esc(c) + '</span>' +
          '<span class="cx-bar"><span style="width:' + p.toFixed(1) + '%"></span></span>' +
          '<span class="cx-n">' + byCat[i].hit + '/' + byCat[i].n + '</span></div>';
      }).join('') + '</div>' +
      '<div class="notebox">图鉴只记录是否用过，不代表营养数据来源；食物库营养值为估算。</div>';
  }

  function openCodexSheet() {
    state.sheetData = { type: 'codex' };
    const data = window.__FOODLIB_DATA__;
    openSheet(
      sheetHead('原料图鉴', '1,046 种原料 · 用过即点亮', '') +
      '<div class="sheet-body" id="codexBody">' + (data ? renderCodex(data) : '<div class="wallet-empty">正在载入食物库…</div>') + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" data-act="open-add">去记一餐</button></div>',
      'codex'
    );
    if (!data && FL && FL.ensure) {
      FL.ensure().then(function () {
        const b = $('#codexBody');
        if (b && window.__FOODLIB_DATA__) b.innerHTML = renderCodex(window.__FOODLIB_DATA__);
      });
    }
  }

  function checkMilestones(streak) {
    let got = [];
    if (streak >= 7 && !skinUnlocked('green')) { unlockSkin('green', true); got.push('账房·墨绿'); }
    if (streak >= 30 && !skinUnlocked('pen')) { unlockSkin('pen', true); got.push('钢笔·灰蓝'); }
    if (got.length) toast('连续达标里程碑：解锁皮肤 ' + got.join('、'));
    grantMilestones(streak);
    return got;
  }

  function tasksFor(st) {
    const today = E.todayKey();
    const pool = [
      { k: 'breakfast', t: '记一顿早餐', d: DB.entries.some(e => e.date === today && e.meal === 'breakfast') },
      { k: 'water', t: '喝水 6 杯', d: (Number(DB.water[today]) || 0) >= 6 },
      { k: 'weight', t: '称一次体重', d: DB.weights.some(w => w.date === today) },
      { k: 'move', t: '任意训练 1 次', d: DB.exercises.some(x => x.date === today) },
      { k: 'protein', t: '蛋白吃到达标 90%', d: st.sum.p >= st.t.protein * 0.9 },
      { k: 'note', t: '写一句今天的感觉', d: !!(DB.notes && DB.notes[today]) }
    ];
    const h = recoHash(today);
    const idx = [];
    for (let i = 0; i < pool.length && idx.length < 3; i++) {
      const j = (h + i * 2) % pool.length;
      if (idx.indexOf(j) < 0) idx.push(j);
    }
    return idx.map(i => pool[i]);
  }

  function renderDailyExtras(st, streak) {
    const level = pct(st.sum.kcal, st.budget);
    const tasks = tasksFor(st);
    const done = tasks.filter(t => t.d).length;
    return '<section class="level-card">' +
      '<div class="lc-head"><span>今日消耗水位</span><span class="lc-v">' + fmt(st.sum.kcal) + ' / ' + fmt(st.budget) + ' kcal</span></div>' +
      '<div class="level-track"><span class="level-fill' + (level >= 100 ? ' over' : level >= 85 ? ' high' : '') + '" style="width:' + Math.min(100, level) + '%"></span>' +
        '<i class="level-mark" style="left:85%"></i></div>' +
      '<div class="level-labels"><span>低</span><span>合适</span><span>偏高</span><span>超支</span></div>' +
    '</section>' +
    '<section class="task-card"><div class="tc-head"><span>今日小任务</span><span class="tiny faint">' + done + '/' + tasks.length + ' · 只提示，不加抽卡</span></div>' +
      '<div class="tc-list">' + tasks.map(t =>
        '<span class="task-item' + (t.d ? ' done' : '') + '"><i>' + (t.d ? '✓' : '○') + '</i>' + t.t + '</span>').join('') + '</div>' +
    '</section>' +
    '<section class="daily-card">' +
      '<div class="dc-head"><span class="dc-k">账本日报</span><span class="dc-d">' + todayLabel() + '</span></div>' +
      '<div class="dc-rows"><div><b>' + fmt(st.sum.kcal) + '</b><em>摄入 kcal</em></div><div><b>' + fmt(Math.max(0, st.remain)) + '</b><em>剩余 kcal</em></div><div><b>' + round1(st.sum.p) + 'g</b><em>蛋白</em></div><div><b>' + streak + ' 天</b><em>连续达标</em></div></div>' +
      (st.sum.count === 0
        ? '<button class="dc-line dc-cta" data-act="open-add">' + esc(dailyLine(st, streak)) + ' <b>记一餐 →</b></button>'
        : '<div class="dc-line">' + dailyLine(st, streak) + '</div>') +
      '<button class="btn btn-ghost btn-sm" data-act="daily-card">存为 PNG</button>' +
    '</section>';
  }

  function todayLabel() {
    const k = E.todayKey();
    return E.fullLabel(k);
  }

  function dailyLine(st, streak) {
    if (st.cheat) return '今天是经批准的放纵日，预算上浮 15%；吃过量也不算破连续达标。';
    if (st.sum.count === 0) return '今天还没记账，先记一笔，哪怕只是估个大概。';
    const d = st.remain;
    if (d < 0) return '超出预算 ' + fmt(-d) + ' kcal。明天正常吃就好，不用补偿。';
    if (d < st.budget * 0.15) return '今天吃得很贴近预算，收尾稳。';
    return '还有 ' + fmt(d) + ' kcal 余量，晚餐可以吃得从容些。';
  }

  function exportDailyCard() {
    const st = snapshot(E.todayKey());
    if (!st) return;
    const w = 720, h = 420;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const paper = '#FBF9F2';
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(44,107,81,.18)';
    ctx.lineWidth = 2;
    for (let y = 96; y < h; y += 34) { ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(w - 48, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(44,107,81,.35)';
    ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#1D2A23';
    ctx.font = '600 30px "Kaiti SC", KaiTi, serif';
    ctx.fillText('账本日报 · ' + todayLabel(), 56, 76);
    ctx.font = '500 46px Georgia, serif';
    ctx.fillText(fmt(st.sum.kcal), 56, 150);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#5C6A60';
    ctx.fillText('摄入 kcal', 56, 178);
    ctx.fillStyle = '#1D2A23';
    ctx.font = '500 36px Georgia, serif';
    ctx.fillText(fmt(Math.max(0, st.remain)), 250, 150);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#5C6A60';
    ctx.fillText('剩余 kcal', 250, 178);
    ctx.fillStyle = '#1D2A23';
    ctx.font = '500 36px Georgia, serif';
    ctx.fillText(round1(st.sum.p) + 'g', 430, 150);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#5C6A60';
    ctx.fillText('蛋白', 430, 178);
    ctx.fillStyle = '#2C6B51';
    ctx.font = '500 22px "Kaiti SC", KaiTi, serif';
    ctx.fillText(dailyLine(st, streakNow()), 56, 238);
    ctx.fillStyle = '#8A9A90';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('能量账本 · 估算值，非营养师方案', 56, h - 58);
    const blob = cv.toBlob ? cv.toBlob(function (b) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = '能量账本-日报-' + E.todayKey() + '.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }) : null;
    return !!blob;
  }

  function checkAnti() {
    const now = Date.now();
    const today = E.todayKey();
    if (DB.anti.date !== today) {
      DB.anti = { since: now, lastPrompt: 0, date: today };
      saveDB(true);
      return;
    }
    if (now - DB.anti.since >= 3 * 3600 * 1000 && now - (DB.anti.lastPrompt || 0) >= 3 * 3600 * 1000) {
      DB.anti.lastPrompt = now;
      saveDB(true);
      toast('已经连续用了 3 小时，起来走两步再回来记。');
    }
  }

  /* ---------- 配这一餐 ---------- */
  const PLANNER_PROTEINS = ['番茄炒蛋', '青椒肉丝', '宫保鸡丁', '麻婆豆腐', '白灼虾', '清蒸鲈鱼', '香煎鸡丁', '红烧牛肉', '香菇鸡块', '番茄牛腩', '青椒炒鸡丁', '洋葱炒牛肉'];
  const PLANNER_VEGS = ['清炒时蔬', '蒜蓉西兰花', '凉拌黄瓜', '清炒西兰花', '清炒豆芽', '蒜蓉菠菜', '清炒土豆'];
  const PLANNER_STAPLES = [['白米饭', 150], ['杂粮饭', 150], ['烤红薯', 200], ['玉米', 200]];

  function buildMealCombos(remain, proteinGap, style, seed) {
    const out = [];
    PLANNER_PROTEINS.forEach((pn, i) => {
      const d = exactCatalog(pn);
      if (!d || !d.c) return;
      const it = itemFromCatalog(d, Math.round(d.grams * (remain < 500 ? 0.65 : 0.8)));
      const vd = exactCatalog(PLANNER_VEGS[(i + seed) % PLANNER_VEGS.length]);
      if (!vd) return;
      const vit = itemFromCatalog(vd);
      const items = [it, vit];
      if (remain >= 520) {
        const st = PLANNER_STAPLES[(i + seed) % PLANNER_STAPLES.length];
        const sd = exactCatalog(st[0]);
        if (sd) items.push(itemFromCatalog(sd, st[1]));
      }
      const t = mealTotals(items);
      if (t.kcal <= remain * 1.25 || items.length <= 2) {
        out.push({ items: items, t: t, name: it.name + ' + ' + vit.name });
      }
    });
    if (style === 'protein') out.sort((a, b) => b.t.p - a.t.p || Math.abs(a.t.kcal - remain) - Math.abs(b.t.kcal - remain));
    else if (style === 'light') out.sort((a, b) => a.t.oil - b.t.oil || a.t.salt - b.t.salt);
    else if (style === 'sugar') out.sort((a, b) => a.t.sugar - b.t.sugar || Math.abs(a.t.kcal - remain) - Math.abs(b.t.kcal - remain));
    else out.sort((a, b) => Math.abs(a.t.kcal - remain) - Math.abs(b.t.kcal - remain));
    const picked = [];
    const seen = new Set();
    for (const c of out) {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      picked.push(c);
      if (picked.length >= 3) break;
    }
    return picked;
  }

  function comboHtml(combo, i, remain) {
    const t = combo.t;
    const fit = t.kcal <= remain ? '在剩余内' : '略超剩余';
    return '<div class="combo-card"><div class="combo-head"><div><div class="combo-name">方案 ' + (i + 1) + ' · ' + esc(combo.name) + '</div><div class="tiny faint">' + fit + ' · 蛋白 ' + round1(t.p) + 'g</div></div>' +
      '<span class="badge ' + (t.kcal <= remain ? 'high' : '') + '">' + fmt(t.kcal) + ' kcal</span></div>' +
      '<div class="combo-items">' + combo.items.map(it => '<div class="pm-row"><span class="n">' + esc(it.name) + '</span><span class="g">' + Math.round(it.grams) + 'g</span><span class="k">' + fmt(it.kcal) + ' kcal</span></div>').join('') + '</div>' +
      '<div class="combo-foot"><span>糖 ' + round1(t.sugar) + 'g · 油 ' + round1(t.oil) + 'g · 盐 ' + round1(t.salt) + 'g</span><button class="btn btn-primary btn-sm" data-act="planner-log" data-i="' + i + '">记入这一餐</button></div></div>';
  }

  function renderPlanner() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'planner') return '';
    const st = snapshot(E.todayKey());
    const remain = Math.max(250, (st ? st.budget - st.sum.kcal : 600));
    const combos = sd.combos || [];
    return '<div class="planner-hero"><div class="tiny faint">今日剩余约</div><div class="planner-big">' + fmt(remain) + '<small> kcal</small></div>' +
      '<div class="plan-macros">蛋白还差约 ' + round1(Math.max(0, (st ? st.t.protein : 70) - (st ? st.sum.p : 0))) + 'g · 已记 ' + (st ? st.sum.count : 0) + ' 笔</div></div>' +
      '<div class="planner-styles"><button data-act="planner-style" data-v="balanced" class="' + (sd.style === 'balanced' ? 'on' : '') + '">均衡</button>' +
      '<button data-act="planner-style" data-v="protein" class="' + (sd.style === 'protein' ? 'on' : '') + '">蛋白优先</button>' +
      '<button data-act="planner-style" data-v="light" class="' + (sd.style === 'light' ? 'on' : '') + '">清淡少油</button>' +
      '<button data-act="planner-style" data-v="sugar" class="' + (sd.style === 'sugar' ? 'on' : '') + '">低糖</button></div>' +
      (combos.length ? combos.map((c, i) => comboHtml(c, i, remain)).join('') : '<div class="cart-empty">今天记录太少，先记一餐再配；或直接用「一日三餐」。</div>');
  }

  function openMealBuilder() {
    const st = snapshot(E.todayKey());
    const remain = Math.max(250, (st ? st.budget - st.sum.kcal : 600));
    const gap = Math.max(0, (st ? st.t.protein : 70) - (st ? st.sum.p : 0));
    state.sheetData = {
      type: 'planner', style: 'balanced', meal: E.guessMeal(), date: E.todayKey(),
      combos: buildMealCombos(remain, gap, 'balanced', 0)
    };
    openSheet(
      sheetHead('帮我配这一餐', '按剩余预算组合 · 可换一批 · 可整餐记入') +
      '<div class="sheet-body" id="plannerBody">' + renderPlanner() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="planner-shuffle">换一批</button><button class="btn btn-ghost" data-act="open-daily">一日三餐</button></div>',
      'planner'
    );
  }

  /* ---------- 外卖 / 聚餐 ---------- */
  function renderDining() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'dining') return '';
    const items = sd.items || [];
    const t = mealTotals(items);
    const q = sd.query || '';
    const picks = dishSuggestions(q, 'all', 8);
    const warnings = [];
    if (t.oil > 30) warnings.push('油已偏高，主食减半或换清蒸/白灼');
    if (t.salt > 5) warnings.push('盐已偏高，少蘸酱、少喝汤');
    if (t.sugar > 25) warnings.push('糖已偏高，饮料换无糖');
    if (!warnings.length) warnings.push('目前负担不高，按这个记即可');
    return '<div class="dine-total">' + fmt(t.kcal) + '<small> kcal · 蛋白 ' + round1(t.p) + 'g</small></div>' +
      '<div class="dine-burden">糖 ' + round1(t.sugar) + 'g · 油 ' + round1(t.oil) + 'g · 盐 ' + round1(t.salt) + 'g</div>' +
      '<div class="dine-warn">' + warnings.map(w => '<div>· ' + esc(w) + '</div>').join('') + '</div>' +
      (items.length ? '<div class="section-title-sm">这顿点了</div><div class="portion-list">' + items.map((it, i) =>
        '<div class="portion-row"><span class="n">' + esc(it.name) + '</span><span class="g">' + Math.round(it.grams) + 'g</span><span class="k">' + fmt(it.kcal) + ' kcal</span><button class="x" data-act="dine-remove" data-i="' + i + '" aria-label="移除">' + icon('close') + '</button></div>').join('') + '</div>' : '') +
      '<div class="dine-swaps"><button data-act="dine-swap-staple">主食减半</button><button data-act="dine-swap-drink">饮料换无糖</button><button data-act="dine-swap-light">最高油的一道减量 30%</button></div>' +
      '<div class="section-title-sm">加一道菜 / 饮料</div>' +
      '<div class="dish-pick-list">' + picks.map(d => '<button class="dish-pick-row" data-act="dine-pick" data-name="' + esc(d.n) + '"><span class="n">' + esc(d.n) + '</span><span class="c">' + (DISH_CAT_LABEL[d.cat] || '') + '</span><span class="k">约 ' + fmt(d.k) + ' kcal</span><span class="a">加入</span></button>').join('') + '</div>';
  }

  function openDining() {
    state.sheetData = { type: 'dining', items: [], query: '', meal: E.guessMeal(), date: E.todayKey() };
    openSheet(
      sheetHead('外卖 / 聚餐', '点单前后估负担 · 可替换 · 可整餐记入') +
      '<div class="sheet-body"><div class="search-box">' + icon('search') + '<input class="input" id="dineSearch" placeholder="搜索这顿想吃的，如 水煮鱼 / 汉堡 / 奶茶" autocomplete="off"></div>' +
        '<div id="dineBody" style="margin-top:10px">' + renderDining() + '</div></div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" data-act="dine-log">记入这餐</button></div>',
      'dining'
    );
  }

  /* ============================================================
     冰箱库存（仅完整模式）
     items 只是 ops 的重建缓存：入库 +，扣减 / 手动用掉 −。
     规则：同食物同单位累加；扣到 0 为止；单位不猜；启动/导入后按记录对账。
     ============================================================ */
  const PANTRY_UNITS = ['g', 'kg', 'ml', 'L', '个', '份'];
  const PANTRY_CLASS = { g: 'mass', kg: 'mass', ml: 'vol', L: 'vol', '个': 'count', '份': 'count' };
  const PANTRY_SEASON = ['盐', '酱油', '植物油', '食用油', '白砂糖', '蚝油', '豆瓣酱', '淀粉', '料酒', '醋', '葱', '姜', '蒜'];
  function pantryUnitOk(u) { return PANTRY_CLASS[u] ? u : 'g'; }
  function pantryClass(u) { return PANTRY_CLASS[u] || 'mass'; }
  function pantryCanon(name) {
    const s = String(name == null ? '' : name).trim();
    if (!s) return '';
    if (FL && FL.ready && FL.ready()) {
      const it = FL.byName(s);
      if (it && it.name) return it.name;
    }
    return s;
  }
  function pantryQty(n) { return Math.round((Number(n) || 0) * 1000) / 1000; }
  function pantryFrom(base, u) { return (u === 'kg' || u === 'L') ? base / 1000 : base; }
  function pantryShow(n, u) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    return v + ' ' + u;
  }
  function pantryDayDiff(dateKey, todayKey) {
    const p = k => {
      const m = String(k || '').match(/(\d{4})-(\d{2})-(\d{2})/);
      return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
    };
    const a = p(dateKey), b = p(todayKey || E.todayKey());
    if (a == null || b == null) return null;
    return Math.round((a - b) / 86400000);
  }
  function pantryStatus(it, todayKey) {
    if (!it || !it.expire) return { key: 'fresh', label: '', days: null };
    const d = pantryDayDiff(it.expire, todayKey);
    if (d == null) return { key: 'fresh', label: '', days: null };
    if (d < 0) return { key: 'expired', label: '已过期', days: d };
    if (d <= 2) return { key: 'warn', label: '快过期', days: d };
    return { key: 'fresh', label: '', days: d };
  }
  function pantryItems() { return (DB && DB.pantry && Array.isArray(DB.pantry.items)) ? DB.pantry.items : []; }
  function pantryOps() { return (DB && DB.pantry && Array.isArray(DB.pantry.ops)) ? DB.pantry.ops : []; }
  function pantryStock() {
    const out = [];
    pantryItems().forEach(it => { if (Number(it.qty) > 0) out.push(it); });
    return out;
  }
  function pantryStockSet() {
    const s = new Set();
    if (!isFull()) return s;
    pantryStock().forEach(it => s.add(pantryCanon(it.name)));
    return s;
  }
  function pantryFind(name, cls, unit) {
    const n = pantryCanon(name);
    const live = pantryStock().filter(it => pantryCanon(it.name) === n);
    if (!live.length) return null;
    if (unit) { const u = live.find(it => it.unit === unit); if (u) return u; }
    if (cls) { const c = live.find(it => pantryClass(it.unit) === cls); if (c) return c; }
    return live[0];
  }
  function pantryMatchAmount(item, ing) {
    const cls = pantryClass(item.unit);
    const grams = Number(ing.grams) || 0;
    if (cls === 'mass') {
      if (grams > 0) return { amount: pantryFrom(grams, item.unit), why: '' };
      return { amount: 0, why: '单位不同，未扣减' };
    }
    if (cls === 'vol') {
      if (Number(ing.ml) > 0) return { amount: pantryFrom(Number(ing.ml), item.unit), why: '' };
      return { amount: 0, why: '单位不同，未扣减' };
    }
    const p = ing.portion || null;
    const lab = p && p.label ? String(p.label) : '';
    const m = lab.match(/(\d+(?:\.\d+)?)\s*(个|份)/);
    if (m && m[2] === item.unit && Number(p.grams) > 0 && grams > 0) {
      return { amount: Number(m[1]) * grams / Number(p.grams), why: '' };
    }
    return { amount: 0, why: '单位不同，未扣减' };
  }
  function pantryAdd(name, unit, qty, expire) {
    const n = pantryCanon(name);
    const u = pantryUnitOk(unit);
    const q = pantryQty(qty);
    if (!n || q <= 0) return null;
    const hit = pantryItems().find(x => pantryCanon(x.name) === n && x.unit === u);
    const op = {
      id: uid(), at: Date.now(), date: E.todayKey(), entryId: '', meal: '',
      name: n, unit: u, delta: q, kind: 'add', note: '入库', expire: String(expire || '')
    };
    DB.pantry.ops.push(op);
    if (hit) {
      hit.qty = pantryQty(hit.qty + q);
      hit.updatedAt = Date.now();
      if (expire) hit.expire = String(expire);
    } else {
      DB.pantry.items.push({ id: uid(), name: n, unit: u, qty: q, expire: String(expire || ''), updatedAt: Date.now() });
    }
    DB.pantry.ops = DB.pantry.ops.slice(-500);
    return { name: n, unit: u, qty: q, merged: !!hit };
  }
  function pantryDeductItem(item, amount, ctx) {
    if (!item || amount <= 0) return null;
    const c = ctx || {};
    const before = Number(item.qty) || 0;
    const actual = pantryQty(Math.min(before, amount));
    if (actual <= 0) return null;
    item.qty = pantryQty(before - actual);
    item.updatedAt = Date.now();
    DB.pantry.ops.push({
      id: uid(), at: Date.now(), date: c.date || E.todayKey(), entryId: c.entryId || '',
      meal: c.meal || '', name: item.name, unit: item.unit, delta: -actual,
      kind: c.kind || 'deduct', note: c.note || '', expire: ''
    });
    DB.pantry.ops = DB.pantry.ops.slice(-500);
    if (item.qty <= 0) DB.pantry.items = DB.pantry.items.filter(x => x.id !== item.id);
    return { name: item.name, unit: item.unit, amount: actual, short: amount > before + 1e-9, requested: amount, itemId: item.id };
  }
  function pantryClearItem(item, note) {
    if (!item) return;
    const q = Number(item.qty) || 0;
    if (q > 0) {
      DB.pantry.ops.push({
        id: uid(), at: Date.now(), date: E.todayKey(), entryId: '', meal: '',
        name: item.name, unit: item.unit, delta: -q, kind: 'clear', note: note || '清理', expire: ''
      });
    }
    DB.pantry.items = DB.pantry.items.filter(x => x.id !== item.id);
    DB.pantry.ops = DB.pantry.ops.slice(-500);
  }
  function pantryIngredientsOf(e) {
    const out = [];
    if (Array.isArray(e.components) && e.components.length) {
      e.components.forEach(c => out.push({ name: c.name, grams: c.grams }));
    } else if (Array.isArray(e.comps) && e.comps.length) {
      e.comps.forEach(c => out.push({ name: c[0], grams: c[1] }));
    } else {
      out.push({ name: e.name, grams: e.grams, portion: e.portion });
    }
    return out;
  }
  function pantryPreferredUnit(ing) {
    const lab = ing.portion && ing.portion.label ? String(ing.portion.label) : '';
    const m = lab.match(/(个|份)/);
    return m ? m[1] : '';
  }
  function pantryAutoDeduct(entries) {
    const res = { taken: [], short: [], unit: [], skip: 0, any: false };
    if (!isFull()) return res;
    (entries || []).forEach(e => {
      pantryIngredientsOf(e).forEach(ing => {
        const pref = pantryPreferredUnit(ing);
        const item = pantryFind(ing.name, pref ? 'count' : 'mass', pref);
        if (!item) { res.skip++; return; }
        const m = pantryMatchAmount(item, ing);
        if (!m.amount) {
          res.unit.push({ name: pantryCanon(ing.name), unit: item.unit, why: m.why });
          res.any = true;
          return;
        }
        const d = pantryDeductItem(item, m.amount, { date: e.date, entryId: e.id, meal: e.meal, kind: 'deduct' });
        if (!d) return;
        res.any = true;
        (d.short ? res.short : res.taken).push(d);
      });
    });
    return res;
  }
  function pantryAggRows(rows) {
    const map = {};
    (rows || []).forEach(r => {
      const k = r.name + '|' + r.unit;
      const m = map[k] || (map[k] = { name: r.name, unit: r.unit, amount: 0 });
      m.amount += r.amount;
    });
    return Object.keys(map).map(k => map[k]);
  }
  function pantryResText(res) {
    if (!res) return '';
    const taken = pantryAggRows(res.taken);
    const short = pantryAggRows(res.short);
    const unit = res.unit || [];
    const parts = [];
    if (taken.length) parts.push(taken.map(r => r.name + ' −' + pantryShow(r.amount, r.unit)).join('、'));
    if (short.length) parts.push(short.map(r => r.name + ' −' + pantryShow(r.amount, r.unit) + '（库存不足）').join('、'));
    const unitNames = unit.map(u => u.name).filter((n, i, a) => a.indexOf(n) === i);
    if (unitNames.length) parts.push(unitNames.join('、') + ' 单位不同，未扣减');
    return parts.join('；');
  }
  function pantryCartPlan(cart) {
    const map = {};
    (cart || []).forEach(it => {
      if (!it || !it.food) return;
      const ing = { name: it.food.name, grams: it.grams, portion: it.portion };
      const pref = pantryPreferredUnit(ing);
      const item = pantryFind(ing.name, pref ? 'count' : 'mass', pref);
      if (!item) return;
      const m = pantryMatchAmount(item, ing);
      const key = item.name + '|' + item.unit;
      const row = map[key] || (map[key] = { name: item.name, unit: item.unit, amount: 0, why: '', item: item, matched: true });
      if (!m.amount) { row.why = m.why; row.matched = false; }
      else row.amount += m.amount;
    });
    return Object.keys(map).map(k => {
      const r = map[k];
      return { name: r.name, unit: r.unit, amount: r.amount, matched: r.matched, why: r.why, item: r.item };
    });
  }
  function renderPantryPreview(cart) {
    const sd = state.sheetData;
    const on = !!sd && sd.pantryDeduct !== false;
    const plan = pantryCartPlan(cart);
    const rows = plan.map(r => r.matched
      ? '<div class="pd-row' + (r.amount > r.item.qty ? ' warn' : '') + '"><span class="pd-n">' + esc(r.name) + '</span><span class="pd-v">−' + pantryShow(r.amount, r.unit) + (r.amount > r.item.qty ? ' · 库存只剩 ' + pantryShow(r.item.qty, r.unit) : '') + '</span></div>'
      : '<div class="pd-row warn"><span class="pd-n">' + esc(r.name) + '</span><span class="pd-v">' + r.why + '</span></div>').join('');
    return '<div class="pantry-deduct" id="pantryPreview">' +
      '<div class="pd-head"><span class="pd-t">' + icon('scale') + '冰箱扣减</span>' +
      '<button class="pd-switch' + (on ? ' on' : '') + '" data-act="pantry-deduct-toggle" aria-pressed="' + (on ? 'true' : 'false') + '">' + (on ? '已开启' : '已关闭') + '</button></div>' +
      (on ? (rows || '<div class="pd-note">库存里没有这一餐的食材，不扣减</div>') : '<div class="pd-note">本次不扣库存</div>') +
      '<div class="pd-foot">扣减会写进库存记录，可在冰箱里查。</div></div>';
  }
  function paintPantryPreview() {
    const sd = state.sheetData;
    const el = $('#pantryPreview');
    if (!el || !sd || !sd.cart) return;
    el.outerHTML = renderPantryPreview(sd.cart);
  }
  function pantrySig() {
    if (!isFull()) return 'ledger';
    return pantryStock().map(it => pantryCanon(it.name) + ':' + pantryQty(it.qty) + it.unit).sort().join(',');
  }
  function pantryRebuild(ops) {
    const map = {};
    (ops || []).forEach(op => {
      const n = pantryCanon(op.name) || String(op.name || '').trim();
      const u = pantryUnitOk(op.unit);
      if (!n) return;
      const key = n + '|' + u;
      const row = map[key] || (map[key] = { name: n, unit: u, qty: 0, expire: '', lastAddAt: -1, updatedAt: 0 });
      row.qty += Number(op.delta) || 0;
      row.updatedAt = Math.max(row.updatedAt, Number(op.at) || 0);
      if (op.kind === 'add') {
        const at = Number(op.at) || 0;
        if (at >= row.lastAddAt) { row.lastAddAt = at; row.expire = String(op.expire || ''); }
      }
    });
    return Object.keys(map).map(k => {
      const r = map[k];
      return { id: 'pi-' + k, name: r.name, unit: r.unit, qty: pantryQty(Math.max(0, r.qty)), expire: r.expire, updatedAt: r.updatedAt };
    }).filter(x => x.qty > 0).sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }
  function pantryEnsure(notify) {
    if (!isFull()) return { changed: false, count: 0 };
    const rebuilt = pantryRebuild(pantryOps());
    const live = pantryStock();
    const sig = list => list.map(x => pantryCanon(x.name) + '|' + x.unit + '|' + pantryQty(x.qty) + '|' + String(x.expire || '')).sort().join(';');
    if (sig(rebuilt) !== sig(live)) {
      const before = live.length;
      DB.pantry.items = rebuilt.map(x => ({ id: uid(), name: x.name, unit: x.unit, qty: x.qty, expire: x.expire, updatedAt: x.updatedAt }));
      saveDB(true);
      if (notify) toast('冰箱库存与扣减记录不一致，已按记录重建 ' + rebuilt.length + ' 项');
      return { changed: true, count: rebuilt.length, before: before };
    }
    return { changed: false, count: rebuilt.length };
  }
  function pantrySeedOpsFromItems() {
    if (pantryOps().length || !pantryItems().length) return;
    pantryItems().slice().forEach(it => {
      DB.pantry.ops.push({
        id: uid(), at: Date.now(), date: E.todayKey(), entryId: '', meal: '',
        name: it.name, unit: it.unit, delta: Number(it.qty) || 0, kind: 'add', note: '备份基线', expire: it.expire || ''
      });
    });
  }
  function pantryImportMerge(prev) {
    if (!isFull() || !prev || !Array.isArray(prev.items) || !prev.items.length) return 0;
    pantrySeedOpsFromItems();
    pantryEnsure(false);
    let merged = 0;
    prev.items.filter(x => Number(x.qty) > 0).forEach(p => {
      const name = pantryCanon(p.name);
      const unit = pantryUnitOk(p.unit);
      const q = pantryQty(p.qty);
      if (!name || !unit || q <= 0) return;
      merged++;
      const hit = pantryItems().find(x => pantryCanon(x.name) === name && x.unit === unit);
      if (!hit) {
        DB.pantry.items.push({ id: uid(), name: name, unit: unit, qty: q, expire: String(p.expire || ''), updatedAt: Date.now() });
        DB.pantry.ops.push({
          id: uid(), at: Date.now(), date: E.todayKey(), entryId: '', meal: '',
          name: name, unit: unit, delta: q, kind: 'add', note: '导入合并', expire: String(p.expire || '')
        });
        return;
      }
      if (q > Number(hit.qty) + 1e-9) {
        const add = pantryQty(q - Number(hit.qty));
        DB.pantry.ops.push({
          id: uid(), at: Date.now(), date: E.todayKey(), entryId: '', meal: '',
          name: name, unit: unit, delta: add, kind: 'add', note: '导入合并（取较大）', expire: String(p.expire || hit.expire || '')
        });
        hit.qty = q;
        if (p.expire) hit.expire = String(p.expire);
      }
    });
    DB.pantry.ops = DB.pantry.ops.slice(-500);
    saveDB(true);
    return merged;
  }
  function pantryHintHtml() {
    if (!isFull() || !DB.profile) return '';
    const today = E.todayKey();
    if (DB.pantry.hintDate === today) return '';
    const warn = pantryStock().filter(it => pantryStatus(it, today).key === 'warn');
    if (!warn.length) return '';
    return '<section class="fridge-hint">' +
      '<button class="fh-main" data-act="open-fridge"><span class="fh-ic">' + icon('scale') + '</span>' +
      '<span class="fh-t"><b>' + warn.length + ' 样库存快过期</b><em>' + warn.slice(0, 3).map(it => esc(it.name) + ' ' + pantryShow(it.qty, it.unit)).join('、') + (warn.length > 3 ? ' 等' : '') + '，点开处理</em></span>' +
      '<span class="fh-go">查看 →</span></button>' +
      '<button class="fh-x" data-act="fridge-hint-close" aria-label="今天不再提示">' + icon('close') + '</button></section>';
  }
  function fridgeBadge(it, today) {
    const s = pantryStatus(it, today);
    if (!s.label) return '';
    return '<span class="fr-badge ' + s.key + '">' + s.label + '</span>';
  }
  function fridgeExpireText(it, today) {
    const s = pantryStatus(it, today);
    if (!it.expire) return '未设保质期';
    const d = it.expire.slice(5).replace('-', '.');
    if (s.days == null) return '截止 ' + d;
    if (s.key === 'expired') return '截止 ' + d + ' · 已过期 ' + Math.abs(s.days) + ' 天';
    if (s.days === 0) return '截止 ' + d + ' · 今天到期';
    return '截止 ' + d + ' · 剩 ' + s.days + ' 天';
  }
  function renderFridge() {
    const today = E.todayKey();
    const stock = pantryStock().slice();
    const warn = stock.filter(it => pantryStatus(it, today).key === 'warn').length;
    const expired = stock.filter(it => pantryStatus(it, today).key === 'expired').length;
    const rank = it => { const s = pantryStatus(it, today); return s.key === 'expired' ? 0 : s.key === 'warn' ? 1 : 2; };
    stock.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'zh'));
    const rows = stock.map(it => {
      const s = pantryStatus(it, today);
      return '<div class="fr-row ' + s.key + '" data-id="' + esc(it.id) + '">' +
        '<div class="fr-main"><div class="fr-n">' + esc(it.name) + fridgeBadge(it, today) + '</div>' +
        '<div class="fr-e">' + fridgeExpireText(it, today) + '</div></div>' +
        '<div class="fr-q">' + pantryShow(it.qty, it.unit) + '</div>' +
        '<div class="fr-btns"><button class="fr-btn" data-act="fridge-use" data-id="' + esc(it.id) + '">用掉</button>' +
        '<button class="fr-btn del" data-act="fridge-del" data-id="' + esc(it.id) + '" aria-label="删除">' + icon('trash') + '</button></div>' +
        '</div>';
    }).join('');
    const rec = pantryOps().filter(op => op.kind !== 'add').slice(-12).reverse();
    const recRows = rec.length ? rec.map(op => {
      const label = op.kind === 'manual' ? '手动用掉' : op.kind === 'clear' ? '清理' : E.mealLabel(op.meal) + '记餐';
      return '<div class="fr-rec"><span class="d">' + (op.date ? esc(op.date.slice(5).replace('-', '.')) : '—') + '</span>' +
        '<span class="m">' + esc(label) + '</span><span class="t">' + esc(op.name) + '</span>' +
        '<span class="v">' + (op.delta > 0 ? '+' : '−') + pantryShow(Math.abs(op.delta), op.unit) + '</span></div>';
    }).join('') : '<div class="cart-empty">还没有扣减记录。</div>';
    return '<div class="fridge-sum"><span class="fs-n">' + stock.length + '</span><span class="fs-k">项库存</span>' +
        '<span class="fs-s ' + (warn ? 'warn' : '') + '">快过期 ' + warn + '</span>' +
        '<span class="fs-s ' + (expired ? 'bad' : '') + '">已过期 ' + expired + '</span>' +
        (expired ? '<button class="btn-quiet tiny fs-clear" data-act="fridge-clear-expired">一键清理过期</button>' : '') + '</div>' +
      '<div class="fr-list">' + (rows || '<div class="cart-empty">冰箱还是空的。点右上角「＋ 入库」加第一样。</div>') + '</div>' +
      '<div class="fr-sec-title">扣减记录</div>' + '<div class="fr-recs">' + recRows + '</div>' +
      '<div class="notebox">库存写在账本主数据里，导出备份会带上；扣减记录可追溯，重启后按记录对账。单位不同的食材不会硬扣。</div>';
  }
  function openFridge() {
    if (!isFull()) { toast('冰箱库存只完整模式可用'); return; }
    state.sheetData = { type: 'fridge' };
    openSheet(
      sheetHead('冰箱库存', '仅完整模式 · 入库 / 扣减 / 临期', '<button class="btn-quiet tiny" data-act="fridge-add">＋ 入库</button>') +
      '<div class="sheet-body" id="fridgeBody">' + renderFridge() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">完成</button></div>',
      'fridge'
    );
  }
  function paintFridge() {
    const box = $('#fridgeBody');
    if (box) box.innerHTML = renderFridge();
  }
  function renderFridgeAddResults() {
    const sd = state.sheetData;
    const box = $('#fridgeAddResults');
    if (!sd || sd.type !== 'fridgeAdd' || !box) return;
    if (!FL || !FL.ready()) {
      box.innerHTML = '<div class="tiny faint">食物库载入中…也可以直接在下方输入名称。</div>';
      return;
    }
    const q = String(sd.query || '').trim();
    if (!q) {
      box.innerHTML = '<div class="tiny faint">输入关键词，从 ' + fmt(FL.meta().count) + ' 种食物库里选，或直接输入名称。</div>';
      return;
    }
    const res = FL.search(q, null, 18, { recent: DB.foodUse, favorites: DB.favorites });
    box.innerHTML = res.length
      ? '<div class="pick-list">' + res.map(it =>
        '<button class="pick-row" data-act="fridge-pick" data-name="' + esc(it.name) + '"><span class="n">' + esc(it.name) + '</span>' +
        '<span class="c">' + esc(it.cat) + '</span><span class="k">' + fmt(it.kcal) + ' <span class="tiny faint">/100g</span></span></button>').join('') + '</div>'
      : '<div class="cart-empty">没找到，直接输入名称即可。</div>';
  }
  function openFridgeAdd() {
    if (!isFull()) return;
    const sd = state.sheetData;
    const preset = sd && sd.type === 'fridge' ? '' : '';
    state.sheetData = { type: 'fridgeAdd', name: preset, unit: 'g', query: '' };
    openSheet(
      sheetHead('入库', '从食物库选，或直接输入名称 · 同食物同单位会累加') +
      '<div class="sheet-body">' +
        '<div class="search-box">' + icon('search') + '<input class="input" id="fridgeSearch" placeholder="搜索食物，如 鸡蛋 / 鸡胸 / 牛奶" autocomplete="off"></div>' +
        '<div id="fridgeAddResults" style="margin-top:8px"></div>' +
        '<div class="field" style="margin-top:12px"><label>名称</label><input class="input" id="fridgeName" placeholder="食物名称" maxlength="30"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>数量</label><input class="input input-num" id="fridgeQty" type="number" min="0" step="0.1" placeholder="10"></div>' +
          '<div class="field"><label>保质期截止日（可空）</label><input class="input" id="fridgeExpire" type="date"></div>' +
        '</div>' +
        '<div class="field"><label>单位</label><div class="seg" id="fridgeUnits">' +
          PANTRY_UNITS.map(u => '<button type="button" data-act="fridge-unit" data-v="' + u + '" class="' + (u === 'g' ? 'on' : '') + '">' + u + '</button>').join('') +
        '</div></div>' +
        '<div class="notebox" id="fridgeAddHint">g / kg、ml / L 会互相换算；个 / 份不与重量互转。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" data-act="fridge-add-save">入库</button></div>',
      'fridgeAdd'
    );
    renderFridgeAddResults();
    if (FL) FL.ensure().then(() => { if (state.sheetData && state.sheetData.type === 'fridgeAdd') renderFridgeAddResults(); });
    setTimeout(() => { const el = $('#fridgeSearch'); if (el) el.focus(); }, 80);
  }
  function saveFridgeAdd() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'fridgeAdd') return;
    const name = ($('#fridgeName') && $('#fridgeName').value.trim()) || '';
    const qty = Number($('#fridgeQty') && $('#fridgeQty').value);
    const expire = ($('#fridgeExpire') && $('#fridgeExpire').value) || '';
    if (!name) { toast('先写食物名称'); return; }
    if (!(qty > 0)) { toast('数量要大于 0'); return; }
    if (qty > 100000) { toast('数量太大，请检查'); return; }
    const before = JSON.parse(JSON.stringify(DB.pantry));
    const added = pantryAdd(name, sd.unit, qty, expire);
    if (!added) { toast('没有入库'); return; }
    if (!commit(() => { DB.pantry = before; })) return;
    openFridge();
    renderActive();
    toast('已入库 ' + added.name + ' ' + pantryShow(qty, added.unit) + (added.merged ? ' · 已累加到现有库存' : ''));
  }
  function openFridgeUse(id, opts) {
    if (!isFull()) return;
    const item = pantryItems().find(x => x.id === id);
    if (!item) return;
    state.sheetData = { type: 'fridgeUse', id: id, returnEntry: (opts && opts.returnEntry) || '' };
    openSheet(
      sheetHead('用掉一些', esc(item.name) + ' · 现有 ' + pantryShow(item.qty, item.unit)) +
      '<div class="sheet-body">' +
        '<div class="field"><label>用掉多少 ' + esc(item.unit) + '</label><input class="input input-num" id="fridgeUseQty" type="number" min="0" step="0.1" value="1"></div>' +
        '<div class="notebox">手动用掉只改库存，不写进餐记录；扣到 0 为止，不会出现负数。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" data-act="fridge-use-save">确认用掉</button></div>',
      'fridgeUse'
    );
    setTimeout(() => { const el = $('#fridgeUseQty'); if (el) { el.focus(); el.select(); } }, 80);
  }
  function saveFridgeUse() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'fridgeUse') return;
    const item = pantryItems().find(x => x.id === sd.id);
    if (!item) { closeSheet(); openFridge(); return; }
    const want = Number($('#fridgeUseQty') && $('#fridgeUseQty').value);
    if (!(want > 0)) { toast('用掉数量要大于 0'); return; }
    const before = JSON.parse(JSON.stringify(DB.pantry));
    const d = pantryDeductItem(item, want, { date: E.todayKey(), kind: 'manual', note: '手动用掉' });
    if (!d) { toast('库存已经为 0'); return; }
    if (!commit(() => { DB.pantry = before; })) return;
    const entryId = sd.returnEntry;
    if (entryId) openEntrySheet(entryId); else openFridge();
    renderActive();
    toast('已用掉 ' + d.name + ' ' + pantryShow(d.amount, d.unit) + (d.short ? '（库存只有这么多）' : ''));
  }
  function pantryEntryBlock(e) {
    if (!isFull() || !e) return '';
    const n = pantryCanon(e.name);
    const list = pantryStock().filter(it => pantryCanon(it.name) === n);
    if (!list.length) return '';
    return '<div class="notebox pantry-entry">冰箱里有 ' + list.map(it => esc(it.name) + ' ' + pantryShow(it.qty, it.unit)).join('、') +
      '<span class="pe-btns">' + list.map(it => '<button class="btn-quiet tiny" data-act="fridge-use" data-entry="' + esc(e.id) + '" data-id="' + esc(it.id) + '">用掉一些</button>').join('') + '</span>' +
      '<br>自由记录不会自动扣库存；这里可以手动用掉。</div>';
  }

  /* ---------- 一周复盘 ---------- */
  function weeklyStats() {
    const today = E.todayKey();
    const days = E.rangeKeys(today, 7);
    const st = snapshot(today);
    const budget = st ? st.budget : 1600;
    const sections = days.map(d => ({ date: d, sum: E.summary(DB.entries, d), ctl: controlTotals(d) }));
    const logged = sections.filter(s => s.sum.count > 0);
    const avg = logged.length ? logged.reduce((s, x) => s + x.sum.kcal, 0) / logged.length : 0;
    const controlDays = sections.filter(s => s.ctl.counted > 0 && s.ctl.sugar <= 25 && s.ctl.oil <= 30 && s.ctl.salt <= 5).length;
    const wpts = DB.weights.filter(w => days.indexOf(w.date) >= 0).sort((a, b) => a.date < b.date ? -1 : 1);
    const wDelta = wpts.length >= 2 ? round1(wpts[wpts.length - 1].kg - wpts[0].kg) : null;
    const volume = DB.lifts.filter(l => days.indexOf(l.date) >= 0).reduce((s, l) => s + (l.weight || 0) * (l.reps || 0) * (l.sets || 0), 0);
    const avgProtein = logged.length ? logged.reduce((s, x) => s + x.sum.p, 0) / logged.length : 0;
    const suggestion = logged.length === 0 ? '这一周还没有完整记录，先从今天的一餐开始。'
      : logged.length < 3 ? '记录天数偏少，先保证每天记一餐，再谈达标。'
        : avg > budget + 120 ? '平均摄入高于预算，先把晚餐主食减 1/4。'
          : controlDays < 3 ? '三控达标天数偏少，这周先盯住含糖饮料和油炸。'
            : avgProtein < (st ? st.t.protein * 0.8 : 60) ? '蛋白偏低，早餐加一个蛋或一杯奶。'
              : '这一周节奏不错，保持记录密度。';
    return { days: days, sections: sections, logged: logged.length, avg: avg, budget: budget, controlDays: controlDays, wDelta: wDelta, volume: volume, avgProtein: avgProtein, suggestion: suggestion };
  }

  function renderWeekly() {
    const w = weeklyStats();
    return '<div class="weekly-grid">' +
      '<div class="weekly-tile"><div class="k">记录天数</div><div class="v">' + w.logged + '<small>/7</small></div></div>' +
      '<div class="weekly-tile"><div class="k">平均摄入</div><div class="v">' + fmt(w.avg) + '<small>kcal</small></div><div class="s">预算 ' + fmt(w.budget) + '</div></div>' +
      '<div class="weekly-tile"><div class="k">体重变化</div><div class="v">' + (w.wDelta == null ? '—' : (w.wDelta > 0 ? '+' : '') + w.wDelta) + '<small>kg</small></div><div class="s">近 7 天称重</div></div>' +
      '<div class="weekly-tile"><div class="k">训练容量</div><div class="v">' + fmt(w.volume) + '<small>kg</small></div><div class="s">7 天总和</div></div>' +
      '</div>' +
      '<div class="weekly-control"><div class="row-between"><span>三控达标天数</span><b>' + w.controlDays + ' / 7</b></div><div class="weekly-days">' + w.days.map(d => {
        const s = w.sections.find(x => x.date === d);
        const ok = s.ctl.counted > 0 && s.ctl.sugar <= 25 && s.ctl.oil <= 30 && s.ctl.salt <= 5;
        return '<span class="wd ' + (ok ? 'ok' : s.ctl.counted ? 'warn' : 'none') + '">' + E.weekday(d) + '</span>';
      }).join('') + '</div></div>' +
      '<div class="weekly-advice">' + icon('spark') + '<span>' + esc(w.suggestion) + '</span></div>' +
      '<button class="btn btn-ghost btn-block" data-act="weekly-copy">复制复盘文字</button>' +
      '<div class="notebox">复盘只统计本机记录；体重看趋势，不看单日。三控达标要求当天有拆解记录且糖、油、盐都在目标内。</div>';
  }

  function openWeekly() {
    state.sheetData = { type: 'weekly' };
    openSheet(
      sheetHead('一周复盘', '近 7 天 · 记录、体重、训练、三控') +
      '<div class="sheet-body">' + renderWeekly() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">知道了</button></div>',
      'weekly'
    );
  }

  function weeklyText() {
    const w = weeklyStats();
    return '能量账本 · 一周复盘\n记录 ' + w.logged + '/7 天，平均摄入 ' + Math.round(w.avg) + ' kcal（预算 ' + w.budget + '）。\n体重变化 ' + (w.wDelta == null ? '—' : w.wDelta + 'kg') + '，训练容量 ' + w.volume + 'kg，三控达标 ' + w.controlDays + '/7 天。\n建议：' + w.suggestion;
  }

  /* ---------- 三控日历 ---------- */
  function renderControlCalendar() {
    const today = E.todayKey();
    const days = E.rangeKeys(today, 30);
    const cells = days.map(d => {
      const c = controlTotals(d);
      let status = 'none';
      if (c.counted > 0) {
        const over = (c.sugar > 25 ? 1 : 0) + (c.oil > 30 ? 1 : 0) + (c.salt > 5 ? 1 : 0);
        status = over === 0 ? 'good' : over === 1 ? 'warn' : 'bad';
      }
      return '<button class="cal-cell ' + status + '" data-act="control-day" data-date="' + d + '"><span class="d">' + Number(d.slice(8)) + '</span><span class="m">' + (c.counted ? c.sugar + '/' + c.oil + '/' + c.salt : '—') + '</span></button>';
    }).join('');
    const good = days.filter(d => {
      const c = controlTotals(d);
      return c.counted > 0 && c.sugar <= 25 && c.oil <= 30 && c.salt <= 5;
    }).length;
    const checks = Object.keys(DB.controlChecks || {}).filter(d => (DB.controlChecks[d] || []).length >= 3).length;
    return '<div class="cal-summary"><div><b>' + good + '</b><small> 天三控达标</small></div><div><b>' + checks + '</b><small> 天清单 ≥3 项</small></div></div>' +
      '<div class="cal-legend"><span class="good">达标</span><span class="warn">1 项超</span><span class="bad">2 项超</span><span class="none">无拆解</span></div>' +
      '<div class="cal-week">' + ['日', '一', '二', '三', '四', '五', '六'].map(x => '<span>' + x + '</span>').join('') + '</div>' +
      '<div class="cal-grid">' + '<span></span>'.repeat(E.dateOf(days[0]).getDay()) + cells + '</div>' +
      '<div class="notebox">格子里是「糖/油/盐」的当天克数；灰色是没有可拆解记录。点格子看当天明细。</div>';
  }

  function openControlCalendar() {
    state.sheetData = { type: 'controlcal' };
    openSheet(
      sheetHead('三控日历', '近 30 天 · 糖 / 油 / 盐') +
      '<div class="sheet-body">' + renderControlCalendar() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">知道了</button></div>',
      'controlcal'
    );
  }

  /* ---------- 一句话快记 ---------- */
  const QUICK_MEAL_WORDS = [['早餐', 'breakfast'], ['早饭', 'breakfast'], ['午餐', 'lunch'], ['午饭', 'lunch'], ['晚餐', 'dinner'], ['晚饭', 'dinner'], ['加餐', 'snack'], ['夜宵', 'snack']];
  const CN_NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };

  function quickNames() {
    const set = new Set(PORTION_UNITS.map(u => u.n).filter(n => n.length >= 2));
    ['番茄炒蛋', '宫保鸡丁', '麻婆豆腐', '牛肉面', '黄焖鸡米饭', '薯片', '水煮蛋', '油条', '全麦面包', '白粥', '酸奶', '香蕉', '苹果', '玉米', '烤红薯', '清蒸鲈鱼', '白灼虾', '凉拌黄瓜', '蒜蓉西兰花', '清炒时蔬', '奶茶', '可乐', '牛奶', '豆浆', '米饭', '面条', '鸡蛋', '鸡胸', '鸡腿', '豆腐', '番茄', '黄瓜', '土豆'].forEach(n => set.add(n));
    return Array.from(set).sort((a, b) => b.length - a.length);
  }

  function quickQty(s) {
    if (s == null) return 1;
    if (CN_NUM[s] != null) return CN_NUM[s];
    const n = Number(s);
    return isFinite(n) ? n : 1;
  }

  function itemFromIngredient(k, grams) {
    const f = DISH_ING[k];
    if (!f) return null;
    const g = grams;
    const scale = g / 100;
    return {
      d: { n: f.n, conf: 'mid' }, name: f.n, grams: g,
      kcal: Math.round(f.kcal * scale), p: f.p * scale, c: f.c * scale, f: f.f * scale, fib: f.fib * scale,
      control: { sugar: round1((f.sug || 0) * scale), oil: k === '植物油' ? g : 0, salt: round1((f.na || 0) * scale / 400), sodium: Math.round((f.na || 0) * scale) },
      comps: [[k, g]]
    };
  }

  function parseQuickText(text) {
    let work = String(text || '').trim();
    let meal = E.guessMeal();
    QUICK_MEAL_WORDS.forEach(w => { if (work.indexOf(w[0]) >= 0) { meal = w[1]; work = work.replace(w[0], ' '); } });
    const used = new Array(work.length).fill(false);
    const items = [];
    quickNames().forEach(name => {
      let idx = work.indexOf(name);
      while (idx >= 0) {
        let overlap = false;
        for (let j = idx; j < idx + name.length; j++) if (used[j]) overlap = true;
        if (!overlap) {
          const prefix = work.slice(Math.max(0, idx - 8), idx);
          const m = prefix.match(/([0-9]+(?:\.[0-9]+)?|[一二两三四五六七八九十半])\s*(个|杯|碗|盒|包|片|根|块|把|勺|颗|只|条|份|罐|瓶|两|斤|克|g|ml|毫升)?\s*$/);
          const qty = m ? quickQty(m[1]) : 1;
          const unit = m ? (m[2] || '') : '';
          const d = exactCatalog(name);
          let grams = null;
          if (d) grams = d.grams * (qty || 1);
          else {
            const f = DISH_ING[name];
            if (f) {
              const urow = PORTION_UNITS.find(u => u.n === name && (unit === '' || u.unit.indexOf(unit) >= 0 || unit.indexOf(u.unit) >= 0));
              const ug = urow ? urow.g : (unit === '克' || unit === 'g' ? 1 : 100);
              grams = ug * (qty || 1);
            }
          }
          if (grams && grams > 0) {
            const it = d ? itemFromCatalog(d, grams) : itemFromIngredient(name, grams);
            if (it) { it.meal = meal; items.push(it); }
          }
          for (let j = idx; j < idx + name.length; j++) used[j] = true;
        }
        idx = work.indexOf(name, idx + 1);
      }
    });
    return { meal: meal, items: items };
  }

  function renderQuickLog() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'quicklog') return '';
    const items = sd.items || [];
    const t = mealTotals(items);
    return '<div class="quick-examples"><button data-act="quicklog-example" data-v="早餐两个鸡蛋一杯牛奶">早餐两个鸡蛋一杯牛奶</button><button data-act="quicklog-example" data-v="午餐一碗米饭一份番茄炒蛋">午餐一碗米饭一份番茄炒蛋</button><button data-act="quicklog-example" data-v="下午一杯全糖珍珠奶茶">下午一杯全糖珍珠奶茶</button></div>' +
      (items.length ? '<div class="section-title-sm">识别到 · ' + (MEAL_LABELS[sd.meal] || '加餐') + '</div><div class="portion-list">' + items.map((it, i) =>
        '<div class="portion-row"><span class="n">' + esc(it.name) + '</span><span class="g">' + Math.round(it.grams) + 'g</span><span class="k">' + fmt(it.kcal) + ' kcal</span><button class="x" data-act="quicklog-remove" data-i="' + i + '">' + icon('close') + '</button></div>').join('') + '</div>' +
        '<div class="quick-total">合计 ' + fmt(t.kcal) + ' kcal · 蛋白 ' + round1(t.p) + 'g</div>' +
        '<button class="btn btn-primary btn-block" data-act="quicklog-log">记入' + (MEAL_LABELS[sd.meal] || '加餐') + '</button>'
        : '<div class="cart-empty">输入一句话，或点上面的例子。例如“早餐两个鸡蛋一杯牛奶”。</div>') +
      '<div class="notebox">支持常见单位：个 / 杯 / 碗 / 盒 / 包 / 片 / 根 / 块 / 把 / 勺 / 颗 / 只 / 条 / 份。识别不到的菜，建议用「菜名估算」。</div>';
  }

  function openQuickLog() {
    state.sheetData = { type: 'quicklog', items: [], meal: E.guessMeal(), text: '' };
    openSheet(
      sheetHead('一句话快记', '说或输一句 · 本地解析份量 · 确认后记入') +
      '<div class="sheet-body">' +
        '<div class="search-box">' + icon('chat') + '<input class="input" id="quickText" placeholder="早餐两个鸡蛋一杯牛奶" autocomplete="off">' +
        '<button class="btn-quiet tiny" data-act="quicklog-mic" style="margin-left:6px">语音</button></div>' +
        '<div class="quick-actions-row"><button class="btn btn-primary btn-sm" data-act="quicklog-parse">解析</button></div>' +
        '<div id="quickBody" style="margin-top:10px">' + renderQuickLog() + '</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">关闭</button></div>',
      'quicklog'
    );
  }

  /* ---------- 代谢实验室 ---------- */
  function renderMetabolism() {
    const st = snapshot(E.todayKey());
    if (!st) return '<div class="body-empty">先完成建档。</div>';
    const ad = st.ad;
    const status = { prior: '公式先验', calibrating: '校准中', calibrated: '已校准' }[ad.status];
    const diff = ad.observed == null ? null : ad.observed - ad.prior;
    return '<div class="meta-hero"><div class="tiny faint">当前实测 TDEE</div><div class="meta-big">' + fmt(ad.tdee) + '<small> kcal/天</small></div>' +
      '<div class="plan-macros">预算 ' + fmt(st.budget) + ' kcal · ' + status + ' · 权重 ' + ad.percent + '%</div></div>' +
      '<div class="meta-rows">' +
        '<div class="meta-row"><span>公式先验</span><b>' + fmt(ad.prior) + ' kcal</b></div>' +
        '<div class="meta-row"><span>实测反推</span><b>' + (ad.observed == null ? '数据不足' : fmt(ad.observed) + ' kcal') + '</b></div>' +
        '<div class="meta-row"><span>与公式差</span><b>' + (diff == null ? '—' : (diff > 0 ? '+' : '') + fmt(diff) + ' kcal') + '</b></div>' +
        '<div class="meta-row"><span>有效摄入天数</span><b>' + ad.validDays + ' 天</b></div>' +
        '<div class="meta-row"><span>体重记录</span><b>' + ad.weightDays + ' 次 / ' + ad.spanDays + ' 天</b></div>' +
        '<div class="meta-row"><span>平均摄入</span><b>' + fmt(ad.meanIntake) + ' kcal</b></div>' +
        '<div class="meta-row"><span>趋势体重</span><b>' + (ad.trendWeight == null ? '—' : ad.trendWeight + ' kg') + '</b></div>' +
        '<div class="meta-row"><span>近 28 天斜率</span><b>' + round1(ad.slope * 7 * 100) / 100 + ' kg/周</b></div>' +
      '</div>' +
      '<div class="notebox">' + (ad.status === 'prior'
        ? '现在预算主要来自公式先验。再记 8 天以上完整摄入、5 次体重，才会开始用你的真实数据反推。'
        : '已用 ' + ad.validDays + ' 天摄入、' + ad.weightDays + ' 次体重和 ' + ad.spanDays + ' 天跨度反推。' + (ad.daysNeeded ? '还需约 ' + ad.daysNeeded + ' 天会更稳。' : '数据已经比较稳。') + '体重波动会明显影响结果，看趋势不看单日。') + '</div>' +
      '<button class="btn btn-ghost btn-block" data-act="open-weight">去记一次体重</button>';
  }

  function openMetabolism() {
    state.sheetData = { type: 'meta' };
    openSheet(
      sheetHead('代谢实验室', 'TDEE 怎么来的 · 数据够不够') +
      '<div class="sheet-body">' + renderMetabolism() + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-primary" data-act="close-sheet">知道了</button></div>',
      'meta'
    );
  }

  /* ---------- 创新：同上一餐一键复刻 ---------- */
  function repeatMeal(meal) {
    const target = state.tab === 'ledger' ? state.recordDate : E.todayKey();
    const priorDates = Array.from(new Set(DB.entries.filter(e => e.meal === meal && e.date < target).map(e => e.date))).sort().reverse();
    let src = null, list = [];
    for (const d of priorDates) {
      const items = DB.entries.filter(e => e.meal === meal && e.date === d);
      if (items.length) { src = d; list = items; break; }
    }
    if (!list.length) {
      toast('还没有可复刻的' + E.mealLabel(meal) + '，先完整记一餐吧');
      return;
    }
    const existing = DB.entries.filter(e => e.meal === meal && e.date === target).length;
    const doIt = () => {
      const before = DB.entries.length;
      const clones = list.map(e => Object.assign({}, e, { id: uid(), date: target, source: 'repeat', createdAt: Date.now() }));
      DB.entries.push.apply(DB.entries, clones);
      if (!commit(() => { DB.entries.length = before; })) return;
      logChange('复刻' + E.mealLabel(meal) + '「来自 ' + E.dateLabel(src) + '」· ' + clones.length + ' 项', { kind: 'batch', items: clones });
      renderActive();
      toast('已复刻 ' + clones.length + ' 项到' + E.mealLabel(meal) + ' · ' + fmt(clones.reduce((s, x) => s + x.kcal, 0)) + ' kcal');
    };
    if (existing) {
      confirmSheet('复刻上一餐？', '这一餐已有 ' + existing + ' 项，会再加 ' + list.length + ' 项。', '继续复刻', false).then(ok => { if (ok) doIt(); });
    } else doIt();
  }

  function renderMealBlock(m, day) {
    return '<div class="meal-block">' +
      '<div class="meal-head"><span class="name">' + m.label + '</span><span class="k">' + m.items.length + ' 项</span><span class="kcal">' + (m.items.length ? fmt(m.kcal) + ' kcal' : '') + '</span>' +
        '<button class="repeat" data-act="repeat-meal" data-meal="' + m.key + '" title="把上一餐同样的食物复制到这一餐">复刻</button>' +
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
  /* ---------- 创新：真实瘦 vs 水波动 ---------- */
  function weightDecomp() {
    const today = E.todayKey();
    const series = E.trendSeries(DB.weights, E.addDays(today, -27), today).filter(x => x.raw != null);
    if (series.length < 3) return null;
    const first = series[0], last = series[series.length - 1];
    const span = Math.max(1, (E.dateOf(last.date) - E.dateOf(first.date)) / 86400000);
    const weekly = (last.tw - first.tw) / span * 7;
    const residuals = series.map(x => x.raw - x.tw);
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const sd = Math.sqrt(residuals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / residuals.length);
    const jump = series.length > 1 ? series[series.length - 1].raw - series[series.length - 2].raw : null;
    return { weekly: round1(weekly), noise: round1(sd * 1.96), jump: jump == null ? null : round1(jump), days: Math.round(span) };
  }

  function renderDecompCard() {
    const d = weightDecomp();
    if (!d) {
      return '<section class="card decomp-card" style="margin-top:14px"><div class="chart-title">真实瘦 vs 水波动</div>' +
        '<div class="body-empty" style="margin-top:8px">至少称 3 次体重（可间隔几天），这里会把趋势方向和水分波动拆开显示。</div></section>';
    }
    const jumpText = d.jump == null ? '—' : (d.jump > 0 ? '+' : '') + d.jump + ' <small>kg</small>';
    const jumpWarn = d.jump != null && Math.abs(d.jump) >= 2;
    return '<section class="card decomp-card" style="margin-top:14px">' +
      '<div class="chart-head"><div><div class="chart-title">真实瘦 vs 水波动</div><div class="chart-sub">趋势值是平滑后的方向，短期数字不必当真</div></div><span class="badge">近 ' + d.days + ' 天</span></div>' +
      '<div class="decomp-grid">' +
        '<div class="decomp-item"><div class="k">趋势变化</div><div class="v ' + (d.weekly < 0 ? 'green' : d.weekly > 0 ? 'amber' : '') + '">' + (d.weekly > 0 ? '+' : '') + d.weekly + ' <small>kg/周</small></div><div class="s">平滑后的真实方向</div></div>' +
        '<div class="decomp-item"><div class="k">水分波动带</div><div class="v">±' + d.noise + ' <small>kg</small></div><div class="s">单日偏离趋势的典型幅度</div></div>' +
        '<div class="decomp-item"><div class="k">最近一次变化</div><div class="v ' + (jumpWarn ? 'amber' : '') + '">' + jumpText + '</div><div class="s">' + (jumpWarn ? '单日 ≥2kg，多为水分/盐分' : '与前一次称重相比') + '</div></div>' +
      '</div>' +
      (jumpWarn ? '<div class="decomp-note">最近一次单日变化 ' + (d.jump > 0 ? '+' : '') + d.jump + ' kg，超出日常水分波动范围。建议同一时间、空腹复称一次；趋势值未被这一天带偏。</div>' : '') +
    '</section>';
  }

  function renderTrend() {
    const view = $('#view-trend');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, budget } = st;
    const keys = E.rangeKeys(today, state.range);
    const ins = E.insights(DB.entries, DB.weights, DB.profile, t, ad, today, state.range);
    const gp = G.of(DB.profile);
    const ci = gp.cycleEnabled ? W.cycleInfo(DB.cycle, today) : null;
    if (ci) {
      let extra = '按周期估算，你现在处于' + ci.phaseLabel + '第 ' + ci.day + ' 天。';
      if (ins.delta != null && ins.delta > 0 && (ci.phase === 'luteal' || ci.phase === 'menstrual')) {
        extra += '这段时间体重容易受水分影响，1–2 kg 的波动不代表脂肪增加；账本已把经期窗口从校准中排除。';
      } else if (ci.phase === 'follicular') {
        extra += '卵泡期体重通常更干净，适合看趋势。';
      }
      ins.narrative.push(extra);
    }
    const strip = gp.cycleEnabled ? W.cycleStrip(keys, DB.cycle) : [];
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
        (strip.length ? '<div class="cycle-strip">' + strip.map(s => '<span style="background:' + s.color + '" title="' + E.dateLabel(s.date) + ' · ' + (W.PHASES[s.phase] ? W.PHASES[s.phase].label : '') + '"></span>').join('') + '</div>' +
          '<div class="cycle-legend"><span style="color:' + W.PHASES.menstrual.color + '">经期</span><span style="color:' + W.PHASES.follicular.color + '">卵泡</span><span style="color:' + W.PHASES.ovulation.color + '">排卵</span><span style="color:' + W.PHASES.luteal.color + '">黄体</span></div>' : '') +
        '<div class="chart-wrap">' + weightChart + '</div>' +
        (fore ? '<div class="forecast">' +
          '<div class="fc-item"><div class="k">每周变化</div><div class="v ' + (fore.weekly < 0 ? 'green' : 'amber') + '">' + (fore.weekly > 0 ? '+' : '') + fore.weekly + ' <small>kg</small></div></div>' +
          '<div class="fc-item"><div class="k">4 周后（趋势）</div><div class="v">' + fore.fourWeek + ' <small>kg</small></div></div>' +
          '<div class="fc-item"><div class="k">到达目标</div><div class="v">' + (fore.etaDays ? '约 ' + Math.ceil(fore.etaDays / 7) + ' <small>周</small>' : '—') + '</div></div>' +
        '</div>' : '') +
      '</section>' +

      renderDecompCard() +

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
    if (DB.cycle.enabled) {
      const cells = window.Wellness.cycleStrip(keys, DB.cycle);
      cells.forEach((c, i) => {
        if (!c.phase) return;
        const x1 = xOf(keys[i]);
        const x2 = i + 1 < keys.length ? xOf(keys[i + 1]) : x1 + (W - L - R) / Math.max(1, keys.length - 1);
        if (x2 > x1) svg += '<rect x="' + x1.toFixed(1) + '" y="' + T + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (H - T - B) + '" fill="' + c.color + '" opacity=".08"/>';
      });
    }
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
     身体 / 周期
     ============================================================ */
  /* ---------- 创新：训练容量周环比 ---------- */
  function volumeWindow(offset) {
    const today = E.todayKey();
    const end = E.addDays(today, -7 * offset);
    const start = E.addDays(end, -6);
    const by = {};
    let total = 0;
    DB.lifts.filter(x => x.date >= start && x.date <= end).forEach(x => {
      const v = (Number(x.weight) || 0) * (Number(x.reps) || 0) * (Number(x.sets) || 0);
      total += v;
      by[x.exercise] = (by[x.exercise] || 0) + v;
    });
    return { total: total, by: by, start: start, end: end };
  }

  function renderVolumeCard() {
    const cur = volumeWindow(0), prev = volumeWindow(1);
    if (!DB.lifts.length) {
      return '<div class="card"><div class="body-card-title">训练容量 · 周环比</div>' +
        '<div class="body-empty" style="margin-top:10px">记下力量训练后，这里会算出近 7 天总容量，并和上一个 7 天对比。</div></div>';
    }
    const pct = prev.total > 0 ? Math.round((cur.total - prev.total) / prev.total * 100) : null;
    const items = Object.keys(cur.by).sort((a, b) => cur.by[b] - cur.by[a]).slice(0, 3);
    return '<div class="card volume-card">' +
      '<div class="row-between"><div><div class="body-card-title">训练容量 · 近 7 天</div><div class="tiny faint">重量 × 次数 × 组数 · 对比前 7 天</div></div>' +
      '<span class="badge ' + (pct != null && pct > 0 ? 'high' : '') + '">' + (pct == null ? '首个周期' : (pct > 0 ? '+' : '') + pct + '%') + '</span></div>' +
      '<div class="vol-total"><span class="serif">' + fmt(cur.total) + '</span><small> kg 总容量</small></div>' +
      (items.length ? '<div class="vol-list">' + items.map(k => {
        const d = prev.by[k] ? Math.round((cur.by[k] - prev.by[k]) / prev.by[k] * 100) : null;
        return '<div class="vol-row"><span class="n">' + esc(k) + '</span><span class="v">' + fmt(cur.by[k]) + ' kg</span><span class="d ' + (d != null && d > 0 ? 'up' : d != null && d < 0 ? 'down' : '') + '">' + (d == null ? '新增' : (d > 0 ? '+' : '') + d + '%') + '</span></div>';
      }).join('') + '</div>' : '<div class="body-empty" style="margin-top:10px">这 7 天还没有力量训练。</div>') +
      '<div class="body-note">上周 ' + fmt(prev.total) + ' kg · 按训练日期滚动 7 天，不是自然周。</div>' +
    '</div>';
  }

  /* ============================================================
     体重预测：近 14 天加权回归 + 净热量一致性校验
     只依据记录即时计算，不缓存预测结果；仅 full 模式渲染。
     ============================================================ */
  const WF_SPAN = 14;
  const WF_KCAL = 7700;

  function weightPredict() {
    const today = E.todayKey();
    const start = E.addDays(today, -(WF_SPAN - 1));
    const map = {};
    (DB.weights || []).forEach(w => {
      const kg = Number(w.kg);
      if (!w.date || !isFinite(kg) || kg <= 0 || w.date < start || w.date > today) return;
      map[w.date] = kg;
    });
    const pts = Object.keys(map).sort().map(k => ({ key: k, x: E.daysBetween(start, k), y: map[k] }));
    const weightDays = pts.length;
    const diet = {};
    (DB.entries || []).forEach(e => {
      const d = e.date;
      if (d && d >= start && d <= today) diet[d] = true;
    });
    const dietDays = Object.keys(diet).length;
    const out = {
      today, weightDays, dietDays, pts,
      needW: Math.max(0, 5 - weightDays), needD: Math.max(0, 10 - dietDays),
      ok: false, mismatch: false, flat: true, preds: [], slope: null,
      current: null, observed: null, netMean: null, theory: null
    };
    const lw = E.latestWeight(DB.weights, DB.profile);
    out.current = lw ? Math.round(lw.kg * 10) / 10 : null;
    if (weightDays >= 2) {
      const first = pts[0], last = pts[pts.length - 1];
      const days = Math.max(1, E.daysBetween(first.key, last.key));
      out.observed = Math.round((last.y - first.y) / days * 100) / 100;
      const recent = E.addDays(today, -6);
      let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
      pts.forEach(p => {
        const w = p.key >= recent ? 2 : 1;
        sw += w; swx += w * p.x; swy += w * p.y; swxx += w * p.x * p.x; swxy += w * p.x * p.y;
      });
      const den = sw * swxx - swx * swx;
      if (den > 1e-9) {
        const slope = (sw * swxy - swx * swy) / den;
        const icpt = (swy - slope * swx) / sw;
        let rss = 0;
        pts.forEach(p => {
          const w = p.key >= recent ? 2 : 1;
          rss += w * Math.pow(p.y - (icpt + slope * p.x), 2);
        });
        const sd = Math.max(0.3, Math.sqrt(rss / sw));
        const base = icpt + slope * (WF_SPAN - 1);
        out.slope = Math.round(slope * 1000) / 1000;
        out.flat = Math.abs(slope) < 0.002;
        out.base = Math.round(base * 10) / 10;
        out.sd = Math.round(sd * 100) / 100;
        out.preds = [7, 14, 30].map(d => {
          const v = base + slope * d;
          return {
            days: d, v: Math.round(v * 10) / 10,
            lo: Math.round((v - sd) * 10) / 10, hi: Math.round((v + sd) * 10) / 10
          };
        });
      }
    }
    const t = targetsNow();
    const bmr = t ? Number(t.bmr) || 0 : 0;
    let netSum = 0, n = 0;
    Object.keys(diet).forEach(d => {
      netSum += E.summary(DB.entries, d).kcal - E.burnedByDate(DB.exercises, d) - bmr;
      n++;
    });
    out.netMean = n ? Math.round(netSum / n) : null;
    out.theory = n ? Math.round((netSum / n) / WF_KCAL * 1000) / 1000 : null;
    if (out.slope != null && out.theory != null) {
      const a = Math.abs(out.slope), b = Math.abs(out.theory);
      out.mismatch = b > 1e-5 ? (a > b * 2 || a < b / 2) : a > 1e-4;
    }
    out.ok = weightDays >= 5 && dietDays >= 10 && out.preds.length === 3;
    return out;
  }

  function weightPredictSvg(f) {
    const today = E.todayKey();
    const start = E.addDays(today, -29);
    const seen = {};
    const pts = [];
    (DB.weights || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).forEach(w => {
      const kg = Number(w.kg);
      if (!w.date || !isFinite(kg) || w.date < start || w.date > today || seen[w.date]) return;
      seen[w.date] = 1;
      pts.push({ x: E.daysBetween(today, w.date), y: kg, key: w.date });
    });
    if (pts.length < 3) return '';
    const preds = f.ok ? f.preds : [];
    const vals = pts.map(p => p.y);
    preds.forEach(p => { vals.push(p.v, p.lo, p.hi); });
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const pad = Math.max(0.4, (max - min) * 0.12);
    const lo = min - pad, hi = max + pad;
    const W = 360, H = 132, L = 8, R = 8, T = 10, B = 18;
    const xOf = d => L + (d + 29) / 59 * (W - L - R);
    const yOf = v => T + (hi - v) / Math.max(0.1, hi - lo) * (H - T - B);
    const actual = pts.map(p => xOf(p.x).toFixed(1) + ',' + yOf(p.y).toFixed(1)).join(' ');
    let predLine = '', dots = '', labels = '';
    if (preds.length) {
      const last = pts[pts.length - 1];
      predLine = 'M' + xOf(last.x).toFixed(1) + ' ' + yOf(last.y).toFixed(1);
      preds.forEach(p => {
        predLine += ' L' + xOf(p.days).toFixed(1) + ' ' + yOf(p.v).toFixed(1);
        dots += '<circle class="wf-dot" cx="' + xOf(p.days).toFixed(1) + '" cy="' + yOf(p.v).toFixed(1) + '" r="3.6"/>';
        labels += '<text class="wf-lab" x="' + xOf(p.days).toFixed(1) + '" y="' + (yOf(p.v) + 14).toFixed(1) + '" text-anchor="middle">+' + p.days + '</text>';
      });
    }
    return '<svg class="wf-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="近 30 天体重趋势与预测">' +
      '<line class="wf-axis" x1="' + L + '" y1="' + (H - B + 2) + '" x2="' + (W - R) + '" y2="' + (H - B + 2) + '"/>' +
      '<polyline class="wf-line" points="' + actual + '"/>' +
      (predLine ? '<path class="wf-pred-line" d="' + predLine + '"/>' : '') +
      dots + labels +
      '<text class="wf-lab" x="' + xOf(0).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">今天</text>' +
      '</svg>';
  }

  function weightPredictCard() {
    if (!isFull()) return '';
    const f = weightPredict();
    const svg = weightPredictSvg(f);
    const head = '<div class="row-between"><div><div class="body-card-title">体重预测</div>' +
      '<div class="tiny faint">近 14 天加权回归 · 净热量校验</div></div><span class="badge">参考</span></div>';
    if (!f.ok) {
      const obs = f.observed != null
        ? '近 14 天平均日变化 ' + (f.observed > 0 ? '+' : '') + f.observed.toFixed(2) + ' kg/天。'
        : '';
      return '<div class="card wf-card" id="wfCard">' + head +
        '<div class="wf-empty">还需要 ' + f.needW + ' 天体重、' + f.needD + ' 天饮食</div>' +
        (obs ? '<div class="wf-sub">' + obs + '</div>' : '') +
        svg +
        '<div class="body-note">体重记满 5 天、饮食记满 10 天后，这里会给出 7 / 14 / 30 天预测与区间；预测只按你的记录外推，不承诺结果。</div>' +
      '</div>';
    }
    const now = f.current != null ? f.current : f.base;
    const predHtml = f.preds.map(p =>
      '<div class="wf-pred"><div class="k">' + p.days + ' 天后</div>' +
      '<div class="v">' + p.v.toFixed(1) + '<small>kg</small></div>' +
      '<div class="r">区间 ' + p.lo.toFixed(1) + '–' + p.hi.toFixed(1) + '</div></div>'
    ).join('');
    const p7 = f.preds[0];
    const flags = [];
    if (f.mismatch) flags.push('热量推算与实测趋势差异超过 2 倍，以实测趋势为准。');
    if (f.flat) flags.push('趋势持平。');
    const note = '预计 7 天后约 ' + p7.v.toFixed(1) + ' kg（区间 ' + p7.lo.toFixed(1) + '–' + p7.hi.toFixed(1) + '）。' +
      (flags.length ? ' ' + flags.join(' ') : '') + ' 预测只按当前趋势外推，不承诺结果。';
    const trend = f.flat ? '趋势持平' : '趋势 ' + (f.slope > 0 ? '+' : '') + f.slope.toFixed(2) + ' kg/天';
    const net = f.netMean != null ? ' · 近 14 天净热量均值 ' + fmt(f.netMean) + ' kcal/天' : '';
    return '<div class="card wf-card" id="wfCard">' + head +
      '<div class="wf-now"><div class="v">' + now.toFixed(1) + '<small>kg</small></div>' +
      '<div class="s">当前体重 · ' + trend + net + '</div></div>' +
      svg +
      '<div class="wf-preds">' + predHtml + '</div>' +
      '<div class="body-note">' + note + '</div>' +
    '</div>';
  }

  function renderBody() {
    const view = $('#view-body');
    if (!DB.profile) { view.innerHTML = renderNeedsOnboard(); return; }
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) { view.innerHTML = renderNeedsOnboard(); return; }
    const { t, ad, sum, cycleExcluded } = st;
    const gp = G.of(DB.profile);
    const ci = gp.cycleEnabled ? W.cycleInfo(DB.cycle, today) : null;
    const nt = W.nutrientTargets(DB.profile);
    const todaySupp = DB.supplements.filter(s => s.date === today);
    const nut = W.nutrientTotals(sum.items, todaySupp);
    const prefLabels = W.prefsLabels(DB.settings.prefs);
    const allCount = E.FOODS.length + DB.foods.length;
    const availCount = allFoods().length;
    const check = DB.checkins.find(c => c.date === today);
    const checks = DB.checkins.slice().sort((a, b) => a.date < b.date ? -1 : 1).slice(-5).reverse();
    const measures = DB.measures.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const lastM = measures[measures.length - 1];
    const prevM = measures[measures.length - 2];
    const delta = (cur, old) => (cur && old ? round1(cur - old) : null);

    const prs = X.prStats(DB.lifts);
    const recentLifts = DB.lifts.slice().sort((a, b) => (b.date + String(b.createdAt || '')) < (a.date + String(a.createdAt || '')) ? -1 : 1).slice(0, 4);
    const photos = state.photos || [];
    if (state.photos === null) loadPhotos();
    const liftHtml = '<div class="card">' +
      '<div class="row-between"><div><div class="body-card-title">力量训练 · PR</div><div class="tiny faint">组数、重量、次数；Epley 估算 1RM</div></div>' +
      '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="lift-csv">CSV</button><button class="btn btn-primary btn-sm" data-act="open-lift">记录</button></div></div>' +
      (prs.length ?
        '<div class="pr-grid">' + prs.slice(0, 4).map(p => '<div class="pr-item"><div class="k">' + esc(p.exercise) + '</div><div class="v">' + p.bestWeight + '<small>kg × ' + p.bestReps + '</small></div><div class="s">1RM ≈ ' + p.bestE1rm + 'kg · ' + p.sets + ' 组</div></div>').join('') + '</div>'
        : '<div class="body-empty" style="margin-top:10px">还没有力量记录。先从深蹲、卧推或硬拉的一组成绩开始。</div>') +
      (recentLifts.length ? '<div class="lift-recent">' + recentLifts.map(x => '<div class="lift-row"><span class="d">' + E.shortLabel(x.date) + '</span><span class="n">' + esc(x.exercise) + '</span><span class="v">' + x.weight + 'kg × ' + x.reps + ' × ' + x.sets + '组</span>' +
        '<button class="icon-mini danger" data-act="delete-lift" data-id="' + x.id + '" aria-label="删除这条力量记录">' + icon('trash') + '</button></div>').join('') + '</div>' : '') +
      '<div class="body-note">1RM 为估算值（Epley），只用于比较同一动作的进步；不要用来测试极限重量。</div>' +
    '</div>';

    const photoHtml = '<div class="card">' +
      '<div class="row-between"><div><div class="body-card-title">进度照片</div><div class="tiny faint">' + (photos.length ? photos.length + ' 张 · 仅本机 IndexedDB' : '本地压缩，长边 ≤1080') + '</div></div>' +
      '<div class="row-actions"><button class="btn btn-ghost btn-sm" data-act="photo-pick">添加</button><button class="btn btn-ghost btn-sm" data-act="open-photos">管理</button></div></div>' +
      (photos.length ?
        '<div class="photo-mini-grid">' + photos.slice(0, 4).map(p => '<button class="photo-thumb" data-act="open-photos" title="' + esc(p.date) + '"><img src="' + p.data + '" alt="进度照片 ' + esc(p.date) + '"></button>').join('') + '</div>'
        : '<div class="body-empty" style="margin-top:10px">还没有照片。建议同一光线、同一角度，每 2–4 周一张。</div>') +
      '<div class="body-note">照片压缩后存入 IndexedDB，不写入 localStorage，不随 JSON 备份，也不会自动同步。</div>' +
    '</div>';

    const phaseOrder = ['menstrual', 'follicular', 'ovulation', 'luteal'];

    let cycleHtml;
    if (!gp.cycleEnabled) {
      const rc = gp.recovery;
      cycleHtml = '<div class="card">' +
        '<div class="row-between"><div><div class="body-card-title">' + rc.title + '</div><div class="tiny faint">' + rc.sub + '</div></div>' +
        '<span class="badge">训练视角</span></div>' +
        '<div class="body-empty" style="margin-top:14px">' + rc.empty + '</div>' +
        '<div class="body-note">' + rc.hint + '</div>' +
        '<div class="cycle-actions"><button class="btn btn-ghost btn-sm" data-act="open-checkin">' + rc.checkinBtn + '</button><button class="btn btn-ghost btn-sm" data-act="open-measure">' + rc.measureBtn + '</button></div>' +
      '</div>';
    } else if (!DB.cycle.enabled) {
      const cy = gp.cycle;
      cycleHtml = '<div class="card">' +
        '<div class="row-between"><div><div class="body-card-title">' + cy.title + '</div><div class="tiny faint">' + cy.offSub + '</div></div>' +
        '<span class="badge">未开启</span></div>' +
        '<div class="body-empty" style="margin-top:14px">' + cy.offEmpty + '<br><button class="btn btn-ghost btn-sm" style="margin-top:10px" data-act="open-cycle">' + cy.offBtn + '</button></div>' +
      '</div>';
    } else if (!ci) {
      cycleHtml = '<div class="card"><div class="body-card-title">' + gp.cycle.title + '</div><div class="body-empty" style="margin-top:10px">' + gp.cycle.missingCopy + '<button class="btn btn-ghost btn-sm" data-act="open-cycle" style="margin-top:10px;display:block">去设置</button></div></div>';
    } else {
      cycleHtml = '<div class="card">' +
        '<div class="cycle-main"><div><div class="eyebrow">' + gp.cycle.currentLabel + '</div><div class="cycle-phase-label">' + ci.phaseLabel + '<span>第 ' + ci.day + ' 天</span></div>' +
          '<div class="cycle-meta">' + gp.cycle.meta(ci) + '</div></div>' +
          '<div class="cycle-day"><div class="n">' + ci.day + '</div><div class="l">/ ' + ci.length + ' 天</div></div></div>' +
        '<div class="phase-track">' + phaseTrack + '</div>' +
        '<div class="cycle-actions"><button class="btn btn-ghost btn-sm" data-act="cycle-today">' + gp.cycle.periodBtn + '</button><button class="btn btn-ghost btn-sm" data-act="open-cycle">' + gp.cycle.adjustBtn + '</button></div>' +
        (cycleExcluded ? '<div class="tiny faint" style="margin-top:8px">' + gp.cycle.excluded(cycleExcluded) + '</div>' : '') +
      '</div>';
    }

    const checkinHtml = '<div class="card">' +
      '<div class="row-between"><div><div class="body-card-title">今天的状态</div><div class="tiny faint">饿、馋、情绪，不给它们贴好坏标签。</div></div>' +
      (check ? '<button class="btn btn-ghost btn-sm" data-act="open-checkin">修改</button>' : '') + '</div>' +
      (check ?
        '<div class="checkin-summary"><div><span>饿</span><b>' + check.hunger + '</b></div><div><span>馋</span><b>' + check.craving + '</b></div><div><span>情绪</span><b>' + check.mood + '</b></div></div>' +
        (check.symptoms.length ? '<div class="symptom-chips">' + check.symptoms.map(s => '<span class="chip on">' + esc(s) + '</span>').join('') + '</div>' : '') +
        (check.note ? '<div class="tiny faint" style="margin-top:8px">' + esc(check.note) + '</div>' : '')
        :
        '<div class="body-empty" style="margin-top:12px"><button class="btn btn-ghost btn-sm" data-act="open-checkin">记录今天的状态</button><br>30 秒，不需要写日记。</div>') +
      (checks.length ? '<div class="checkin-recent">' + checks.map(c => '<div class="checkin-row"><span class="d">' + E.shortLabel(c.date) + '</span><span class="v">饿 ' + c.hunger + ' · 馋 ' + c.craving + ' · 情绪 ' + c.mood + '</span><span class="s">' + (c.symptoms.slice(0, 2).join('、') || '—') + '</span></div>').join('') + '</div>' : '') +
    '</div>';

    const measureHtml = '<div class="card">' +
      '<div class="row-between"><div><div class="body-card-title">围度</div><div class="tiny faint">' + gp.body.measureHint + '</div></div><button class="btn btn-ghost btn-sm" data-act="open-measure">记录</button></div>' +
      (lastM ?
        '<div class="measure-grid">' +
          '<div class="measure-item"><div class="k">腰围</div><div class="v">' + (lastM.waist || '—') + '<small>cm</small></div><div class="delta">' + (delta(lastM.waist, prevM && prevM.waist) == null ? '' : (delta(lastM.waist, prevM.waist) > 0 ? '+' : '') + delta(lastM.waist, prevM.waist)) + '</div></div>' +
          '<div class="measure-item"><div class="k">臀围</div><div class="v">' + (lastM.hip || '—') + '<small>cm</small></div><div class="delta">' + (delta(lastM.hip, prevM && prevM.hip) == null ? '' : (delta(lastM.hip, prevM.hip) > 0 ? '+' : '') + delta(lastM.hip, prevM.hip)) + '</div></div>' +
          '<div class="measure-item"><div class="k">大腿</div><div class="v">' + (lastM.thigh || '—') + '<small>cm</small></div><div class="delta">' + (delta(lastM.thigh, prevM && prevM.thigh) == null ? '' : (delta(lastM.thigh, prevM.thigh) > 0 ? '+' : '') + delta(lastM.thigh, prevM.thigh)) + '</div></div>' +
        '</div>' +
        '<div class="tiny faint" style="margin-top:8px">最近记录 ' + E.relativeDay(lastM.date, today) + (prevM ? ' · 上次 ' + E.relativeDay(prevM.date, today) : '') + ' · 单位 cm</div>'
        : '<div class="body-empty" style="margin-top:10px">' + gp.body.measureEmpty + '</div>') +
    '</div>';

    const nRows = [
      ['铁', nut.iron, nt.iron, 'mg', gp.nutrients.iron],
      ['钙', nut.calcium, nt.calcium, 'mg', gp.nutrients.calcium],
      ['维生素 D', nut.vd, nt.vd, 'µg', gp.nutrients.vd],
      ['叶酸', nut.folate, nt.folate, 'µg', gp.nutrients.folate]
    ];
    const nutrientHtml = '<div class="card">' +
      '<div class="body-card-title">关键营养 · 今天</div>' +
      '<div class="nutrient-list">' + nRows.map(r => {
        const p = pct(r[1], r[2]);
        return '<div class="nutrient-row"><div class="top"><span>' + r[0] + '</span><span class="v">' + r[1] + '<small>/' + r[2] + ' ' + r[3] + '</small></span></div>' +
          '<div class="nutrient-bar"><span style="width:' + p + '%"></span></div><div class="tiny faint">' + r[4] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="search-caption" style="margin-top:16px"><span class="k">补剂</span><span class="tiny faint">单独计入</span></div>' +
      (todaySupp.length ? todaySupp.map(s => '<div class="supp-row"><span>' + esc(s.name) + '</span><span class="tiny faint">' + (s.iron ? '铁 ' + s.iron + 'mg ' : '') + (s.calcium ? '钙 ' + s.calcium + 'mg' : '') + '</span><button class="icon-mini danger" data-act="del-supplement" data-id="' + s.id + '">' + icon('close') + '</button></div>').join('') : '<div class="tiny faint" style="padding:8px 0">今天还没有补剂记录。</div>') +
      '<button class="btn btn-ghost btn-sm btn-block" style="margin-top:10px" data-act="open-supplement">＋ 记一条补剂</button>' +
      '<div class="body-note">营养值只覆盖内置食物库中的常见食物；未收录的食物按 0 计。目标是参考值，不是处方。</div>' +
    '</div>';

    const prefsHtml = '<div class="card">' +
      '<div class="row-between"><div><div class="body-card-title">饮食偏好</div><div class="tiny faint">' + (prefLabels.length ? prefLabels.join(' · ') : '未设置') + '</div></div><button class="btn btn-ghost btn-sm" data-act="open-prefs">调整</button></div>' +
      '<div class="tiny faint" style="margin-top:8px">食物库当前可用 ' + availCount + ' / ' + allCount + ' 种。过滤依据名称与分类，可能不完整；过敏请以包装与医生意见为准。</div>' +
    '</div>';

    const reportHtml = '<div class="card">' +
      '<div class="row-between"><div><div class="body-card-title">就诊摘要</div><div class="tiny faint">' + gp.body.reportSub + '</div></div>' +
      '<button class="btn btn-primary btn-sm" data-act="open-report">生成</button></div>' +
      '<div class="body-note">报告在本机生成，可打印或另存为 PDF；不会上传。</div>' +
    '</div>';

    view.innerHTML =
      '<div class="page-head"><div><h1 class="page-title">身体</h1><div class="page-sub">' + gp.body.sub + '</div></div>' +
      '<div class="tiny faint">' + (DB.settings.gentle ? '温和模式' : '完整数字') + '</div></div>' +
      (isFull() ? weightPredictCard() : '') +
      cycleHtml +
      '<div class="section">' + checkinHtml + measureHtml + liftHtml + renderVolumeCard() + photoHtml + nutrientHtml + prefsHtml + reportHtml + '</div>' +
      '<div class="disclaimer">' + gp.body.disclaimer + '</div>';
  }

  /* ============================================================
     设置
     ============================================================ */
  /* v5.3：本机占用（字符数≈UTF-16 码元数，与浏览器配额统计同量级，够用于感知） */
  function dbBytes() {
    try { return (localStorage.getItem(KEY) || '').length * 2; } catch (e) { return 0; }
  }
  function fmtBytes(n) {
    if (!n) return '0 KB';
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }
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
    const gp = G.of(DB.profile);
    const stt = DB.stats || {};
    const aiRate = stt.aiCalls ? Math.round(stt.aiOk / stt.aiCalls * 100) : 0;

    const modeNow = isFull() ? 'full' : 'ledger';
    view.innerHTML =
      '<div class="page-head"><div><h1 class="page-title">设置</h1><div class="page-sub">你的账本，只对你负责</div></div></div>' +

      (isFull() && !DB.settings.modeHintSeen ?
        '<section class="mode-hint" role="status">' +
          '<div class="mh-t">这本账很厚，可在设置里换成轻量账本</div>' +
          '<div class="mh-s">纯账本只保留首页、流水、记一笔和设置；券、币、皮肤、欠款都会原样保留。</div>' +
          '<button class="btn btn-ghost btn-sm" data-act="mode-hint-seen">知道了</button>' +
        '</section>' : '') +

      '<div class="setting-group mode-group">' +
        '<div class="gh"><div class="t">账本模式</div><div class="s">当前：' + (isFull() ? '完整' : '纯账本') + ' · 只写一个字段，不影响任何记录</div></div>' +
        '<div class="setting-row"><span class="l"><span class="t">模式</span><span class="s">' +
          (isFull() ? '完整：记账 + 奖励 + 图鉴 + 更多页面' : '纯账本：4 个页面，无抽奖入口，公告与皮肤包不加载') +
        '</span></span><div class="r"><div class="seg" style="width:210px">' +
          [['ledger', '纯账本'], ['full', '完整']].map(x =>
            '<button data-act="set-mode" data-v="' + x[0] + '" class="' + (modeNow === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') +
        '</div></div></div>' +
        '<div class="setting-row"><span class="l"><span class="t">切换不会删数据</span><span class="s">你的券、币、皮肤、欠款、兑换历史、运动记录都还在，切换回来即可看到</span></span></div>' +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">账房批注</div><div class="s">规则写死在本机，不调模型、不联网</div></div>' +
        settingRow('首页批注', COACH.on ? '已开启' : '已关闭', '最多 3 条；单条点「不再提示」静默 7 天', 'toggle-coach', true) +
        settingRow('纯账本模式批注', COACH.ledger ? '已开启' : '已关闭', COACH.ledger ? '纯账本首页只显示 1 条' : '纯账本默认不显示，开启后只出 1 条', 'toggle-coach-ledger', true) +
        '<div class="setting-row"><span class="l"><span class="t">存储位置</span><span class="s">独立键 energy-ledger.coach，不写进账本主数据，也不随 JSON 导出</span></span></div>' +
      '</div>' +

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
        settingRow('AI 拍照 / 文字识别', ai.key ? '已配置' : '未配置', STATIC_MODE ? '静态版直连 · 通义千问 VL 可用' : '配置后可用；不配置也能手动记录', 'open-ai', true) +
        settingRow('食物库与组合', (DB.foods.length + ' 个自定义 · ' + DB.combos.length + ' 个组合'), '共 ' + (E.FOODS.length + DB.foods.length) + ' 种常用食物', 'open-library', true) +
        settingRow('运动记录', DB.exercises.length + ' 条', '按 METs × 体重 × 时长估算') +
        settingRow('力量训练', DB.lifts.length ? DB.lifts.length + ' 组' : '未记录', 'PR、最佳单次与 Epley 1RM', 'open-lift', true) +
        settingRow('菜谱与购物清单', DB.recipes.length + ' 个菜谱', '组合食物一键记入；可生成合并同名食材的清单', 'open-recipes', true) +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">AI 教练</div><div class="s">只用你自己的数字回答，不上传整本账本</div></div>' +
        settingRow('问账本', ai.key ? '可用' : '需要先配置 Key', gp.coachKeyHint, 'open-coach', true) +
        '<div class="setting-row"><span class="l"><span class="t">发送内容</span><span class="s">' + gp.coachContext + '</span></span></div>' +
        settingRow('AI 调用统计', stt.aiCalls ? stt.aiOk + ' 成功 · ' + stt.aiFail + ' 失败' : '尚无调用', stt.aiCalls ? '成功率 ' + aiRate + '% · 平均 ' + (stt.aiMs / stt.aiCalls / 1000).toFixed(1) + ' 秒 · 只记数量不记内容' : '识别与问账本都会计入本机统计') +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">' + gp.settings.bodyGroupTitle + '</div><div class="s">' + gp.settings.bodyGroupSub + '</div></div>' +
        (gp.cycleEnabled ? settingRow('周期感知', DB.cycle.enabled ? '已开启' : '未开启', DB.cycle.enabled ? '经期水分窗口会从代谢校准中排除' : '可选；不开启不影响任何功能', 'open-cycle', true) : settingRow('训练与恢复', '在身体页查看', '训练、盐分与水分都会影响体重', 'goto-body', true)) +
        settingRow('今天的状态', DB.checkins.some(c => c.date === E.todayKey()) ? '已记录' : '未记录', '饿、馋、情绪与症状', 'open-checkin', true) +
        settingRow('围度记录', DB.measures.length ? DB.measures.length + ' 条' : '未记录', '腰围 / 臀围 / 大腿，低频记录', 'open-measure', true) +
        settingRow('饮食偏好', W.prefsLabels(DB.settings.prefs).join(' · ') || '未设置', '素食、无乳糖、无麸质、清真', 'open-prefs', true) +
        settingRow('关键营养与补剂', '查看', '铁、钙、维生素 D、叶酸', 'goto-body', true) +
        settingRow('就诊摘要', '生成 8 周报告', '可打印 / 另存 PDF，本机生成', 'open-report', true) +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">隐私</div><div class="s">PIN 是遮挡，不是加密</div></div>' +
        settingRow('PIN 锁', DB.settings.pin.on ? '已开启' : '未开启', DB.settings.pin.on ? '打开应用或离开 5 分钟后需要输入' : '给随手打开的人加一道门', 'open-pin', true) +
        (DB.settings.pin.on ? '<button class="setting-row" data-act="lock-now"><span class="l"><span class="t">立即锁定</span><span class="s">现在遮住屏幕，回到 PIN 界面</span></span><span class="r">' + icon('lock') + '</span></button>' : '') +
        '<div class="setting-row"><span class="l"><span class="t">说明</span><span class="s">PIN 只保存在本机，用于遮挡；它不是加密，清除浏览器数据会连同账本一起清除。</span></span></div>' +
      '</div>' +

      /* v5.3：隐私从一句文案变成可感知的状态——真实占用、真实规模，导出按钮就在下一组 */
      '<div class="setting-group">' +
        '<div class="gh"><div class="t">本机状态</div><div class="s">没有账号，没有云端，也没有别人——这是这本账在你设备上的真实占用</div></div>' +
        settingRow('本地占用', fmtBytes(dbBytes()), '存储键 ' + KEY + ' · 只写这台设备的浏览器') +
        settingRow('账本规模', DB.entries.length + ' 笔饮食 · ' + DB.weights.length + ' 次体重 · ' + DB.exercises.length + ' 次运动', '删除记录会同步缩小占用') +
        '<div class="setting-row"><span class="l"><span class="t">哪些时候会联网</span><span class="s">记账、校准、统计全部在本机完成。只有皮肤包、版本公告，以及你自己配置的 AI 识别会联网；皮肤包下载一次后离线可用。</span></span></div>' +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">最近操作</div><div class="s">删除可以在本机撤销；日志只保留最近 30 条</div></div>' +
        (DB.logs.length ? DB.logs.slice(0, 5).map(x =>
          '<div class="setting-row"><span class="l"><span class="t">' + esc(x.text) + '</span><span class="s">' + logTime(x.at) + '</span></span></div>').join('')
          : '<div class="setting-row"><span class="l"><span class="t">还没有操作记录</span><span class="s">删除与撤销会记录在这里</span></span></div>') +
        (lastUndoable() ? '<button class="setting-row" data-act="undo-last"><span class="l"><span class="t">撤销上一步删除</span><span class="s">' + esc(lastUndoable().text) + '</span></span><span class="r">' + icon('arrow-r') + '</span></button>' : '') +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">数据</div><div class="s">你的数据属于你。随时全量导出，或彻底删除</div></div>' +
        '<button class="setting-row" data-act="export-json"><span class="l"><span class="t">导出完整备份（JSON）</span><span class="s">包含记录、体重、运动、奖励（券/币/皮肤）与设置（不含 API Key）</span></span><span class="r">' + icon('download') + '</span></button>' +
        '<button class="setting-row" data-act="export-csv"><span class="l"><span class="t">导出明细（CSV）</span><span class="s">可用 Excel 打开或做自己的分析</span></span><span class="r">' + icon('download') + '</span></button>' +
        '<button class="setting-row" data-act="export-health-csv"><span class="l"><span class="t">导出健康数据（CSV）</span><span class="s">体重、围度、状态、补剂、饮水、运动、饮食合成一张长表，可直接给医生或教练</span></span><span class="r">' + icon('download') + '</span></button>' +
        '<button class="setting-row" data-act="import-json"><span class="l"><span class="t">导入备份</span><span class="s">支持本应用备份，也兼容旧版「轻卡日记」的 JSON</span></span><span class="r">' + icon('upload') + '</span></button>' +
        '<button class="setting-row" data-act="import-wearable"><span class="l"><span class="t">导入可穿戴数据</span><span class="s">Apple Health XML / 华为运动健康 CSV · 步数、体重、睡眠；先预览匹配结果</span></span><span class="r">' + icon('upload') + '</span></button>' +
        '<div class="setting-row"><span class="l"><span class="t">换设备怎么迁移</span><span class="s">旧设备导出 JSON → 新设备导入即可；进度照片在 IndexedDB，不在 JSON 里，需要逐张另存。</span></span></div>' +
        '<button class="setting-row" data-act="load-demo"><span class="l"><span class="t">载入示例账本</span><span class="s">用 21 天假数据体验校准与复盘（会覆盖当前数据）</span></span><span class="r">' + icon('spark') + '</span></button>' +
        '<button class="setting-row danger" data-act="clear-data"><span class="l"><span class="t">清除本机全部数据</span><span class="s">不可恢复。建议先导出备份</span></span><span class="r">' + icon('trash') + '</span></button>' +
      '</div>' +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">外观与体验</div></div>' +
        settingRow('温和模式', DB.settings.gentle ? '已开启' : '已关闭', '模糊热量数字；点按可临时查看', 'toggle-gentle', true) +
        settingRow('长辈模式', DB.settings.elder ? '已开启' : '已关闭', '字号 ×1.3 · 按钮 ≥48px · 关闭动效与抽奖入口 · 导航只留今日/账本/设置', 'toggle-elder', true) +
        settingRow('省电模式', DB.settings.powerSave ? '已开启' : '已关闭', DB.settings.powerSave ? '背景动效已全部关闭' : '一键关闭全部背景动效（含粒子）', 'toggle-power-save', true) +
        settingRow('计步（L2 估算）', DB.settings.motion ? '已开启' : '已关闭', motionSupport().ok ? '屏幕熄灭会停止、晃动会误判；只算估算里程' : motionSupport().why, 'toggle-motion', motionSupport().ok) +
        settingRow('动效档位', (window.SkinFX ? (SkinFX.state().tier === 'eco' ? '降档' : '轻档') : '轻档'), '轻档 ≤40 粒子 / 30fps；连续掉帧会自动降档' + (DB.settings.fx === false ? ' · 当前已手动关闭动效' : '')) +
        (isFull() && !DB.settings.elder ? '<button class="setting-row" data-act="open-rewards"><span class="l"><span class="t">奖励中心</span><span class="s">刮刮卡与扭蛋机 · 券 ' + DB.scratch.tickets.length + ' 张 · 扭蛋 ' + rewardAvail() + ' 次</span></span><span class="r">' + icon('gift') + '</span></button>' : '') +
        '<div class="setting-row"><span class="l"><span class="t">主题</span><span class="s">跟随系统，或固定浅色 / 深色</span></span>' +
          '<div class="r"><div class="seg" style="width:210px">' + [['auto', '跟随'], ['light', '浅色'], ['dark', '深色']].map(x =>
            '<button data-act="set-theme" data-v="' + x[0] + '" class="' + (themePref === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div></div>' +
        (isFull() && !DB.settings.elder ? '<button class="setting-row" data-act="open-skin-gallery"><span class="l"><span class="t">皮肤图鉴</span><span class="s">' + gallerySkins().length + ' 张集中管理 · 未解锁显示灰度剪影 · 收集率 ' + galleryUnlocked() + '/' + gallerySkins().length + '</span></span><span class="r">' + icon('spark') + '</span></button>' +
        '<button class="setting-row" data-act="open-skins"><span class="l"><span class="t">皮肤墙</span><span class="s">快速切换 · 当前：' + ((skinById(DB.skins.active) || { name: '宣纸' }).name) + '</span></span><span class="r">' + icon('arrow-r') + '</span></button>' : '') +
      '</div>' +
      (isFull() && window.Maintenance ? window.Maintenance.settingsHTML() : '') +

      '<div class="setting-group">' +
        '<div class="gh"><div class="t">关于</div></div>' +
        '<button class="setting-row" data-act="ver-tap"><span class="l"><span class="t">能量账本 v5.2.1</span><span class="s">本地优先 · 无账号 · 无云端 · 无社交</span></span><span class="r tiny faint">ENERGY LEDGER</span></button>' +
        settingRow('运行模式', STATIC_MODE ? '静态网页' : '本机服务', STATIC_MODE ? '可部署到任意静态主机，无后端依赖' : '带本机 AI 转发与离线缓存') +
        '<div class="setting-row"><span class="l"><span class="t">数据与免责声明</span><span class="s">所有数值均为估算，不构成医疗或营养处方。孕期、哺乳期、慢性病人群请咨询专业人士。</span></span></div>' +
        '<div class="setting-row"><span class="l"><span class="t">存储状态</span><span class="s">' + (storageOK ? 'localStorage 正常 · 数据只在此浏览器' : '本地存储受限，请导出备份') + '</span><span class="r tiny ' + (storageOK ? 'faint' : 'red') + '">' + (storageOK ? '正常' : '异常') + '</span></div>' +
      '</div>' +

      '<div class="disclaimer">没有服务器保存你的记录。换设备不会自动同步，请用导出 / 导入迁移。</div>';
  }

  /* 切换模式：只写 settings.mode 一个字段，不删/不改任何记录 */
  function switchMode(next) {
    if (next !== 'ledger' && next !== 'full') return;
    if (DB.settings.mode === next) return;
    const before = DB.settings.mode;
    DB.settings.mode = next;
    if (!commit(() => { DB.settings.mode = before; })) return;
    applyModeChrome();
    applySkins();
    applyFx();
    if (next === 'full') {
      bootSkinPacks();
      ensureTrip().then(() => syncTrip(true));
      creditEnsure(true);
      pantryEnsure(true);
    } else if (window.SkinFX) {
      SkinFX.stop();
    }
    /* 公告不因模式切换而消失；未拉取过就补一次 */
    if (!state.announceTried && DB.profile) { state.announceTried = true; setTimeout(initAnnounce, 600); }
    if (!isFull() && (state.tab === 'trend' || state.tab === 'body' || state.tab === 'trip')) state.tab = 'today';
    closeSheet();
    setTab(state.tab);
    toast('已切换，数据都还在');
  }
  function openLedgerAddSheet() {
    state.sheetData = { type: 'lgadd' };
    openSheet(
      sheetHead('记一笔', '餐、体重、运动都在这一页', '') +
      '<div class="sheet-body">' +
        '<button class="lg-add-row" data-act="lg-go" data-go="add">' + icon('plus') + '<span><b>记一餐</b><em>早 / 午 / 晚 · 食物库与菜名估算</em></span></button>' +
        '<button class="lg-add-row" data-act="lg-go" data-go="weight">' + icon('scale') + '<span><b>称体重</b><em>每天一次，用来校准预算</em></span></button>' +
        '<button class="lg-add-row" data-act="lg-go" data-go="exercise">' + icon('run') + '<span><b>记运动</b><em>类型 + 时长，折算公里</em></span></button>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button></div>',
      'lgadd'
    );
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
    const prev = state.sheet;
    $('#sheetRoot').innerHTML = '';
    state.sheet = null;
    state.sheetData = null;
    document.documentElement.style.overflow = '';
    gachaTimersClear();
    if (prev === 'gallery' || prev === 'gacha') refreshSkinFx();
    if (prev) renderActive();
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
        const v = b.dataset.mini;
        if (v === 'yes') {
          const val = miniState && miniState.readValue ? miniState.readValue() : true;
          miniClose(val);
        } else if (v === 'no' || v === 'cancel') {
          miniClose(false);
        } else {
          /* 多于两个分支的选择（如导入的「合并 / 覆盖」）直接返回分支名 */
          miniClose(v);
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
     菜名估算（本地规则，不联网）
     ============================================================ */
  const DISH_ING = {
    '米饭': { n: '米饭', kcal: 116, p: 2.6, c: 25.9, f: 0.3, fib: 0.3, type: 'staple', a: ['米饭', '白饭', '饭'] },
    '面条': { n: '面条', kcal: 110, p: 3.5, c: 23, f: 0.5, fib: 1, type: 'staple', a: ['面条', '面'] },
    '面粉': { n: '面粉', kcal: 350, p: 10, c: 75, f: 1, fib: 2.5, type: 'staple', a: ['面粉', '面皮', '饺子皮'] },
    '米粉': { n: '米粉', kcal: 110, p: 2, c: 24, f: 0.2, fib: 0.5, type: 'staple', a: ['米粉', '河粉', '粉'] },
    '鸡蛋': { n: '鸡蛋', kcal: 144, p: 13.3, c: 2.8, f: 8.8, fib: 0, type: 'protein', a: ['鸡蛋', '蛋'] },
    '鸡胸': { n: '鸡胸肉', kcal: 165, p: 31, c: 0, f: 3.6, fib: 0, type: 'protein', a: ['鸡胸', '鸡胸肉'] },
    '鸡腿肉': { n: '鸡腿肉', kcal: 181, p: 24, c: 0, f: 9, fib: 0, type: 'protein', a: ['鸡腿', '鸡肉', '鸡'] },
    '猪里脊': { n: '猪里脊', kcal: 143, p: 20.2, c: 1, f: 3.5, fib: 0, type: 'protein', a: ['里脊', '肉丝', '肉片', '瘦猪肉', '猪肉', '肉'] },
    '猪肉馅': { n: '猪肉馅', kcal: 250, p: 17, c: 0, f: 20, fib: 0, type: 'protein', a: ['肉馅', '猪肉馅'] },
    '五花肉': { n: '五花肉', kcal: 568, p: 9.3, c: 0, f: 53, fib: 0, type: 'protein', a: ['五花肉', '五花'] },
    '排骨': { n: '排骨', kcal: 278, p: 17, c: 0, f: 22, fib: 0, type: 'protein', a: ['排骨', '肋排'] },
    '牛肉': { n: '牛肉', kcal: 125, p: 19.9, c: 2, f: 3, fib: 0, type: 'protein', a: ['牛肉', '牛'] },
    '牛肉末': { n: '牛肉末', kcal: 190, p: 18, c: 0, f: 13, fib: 0, type: 'protein', a: ['牛肉末', '牛肉馅'] },
    '鲈鱼': { n: '鲈鱼', kcal: 105, p: 18.6, c: 0, f: 3.4, fib: 0, type: 'protein', a: ['鲈鱼', '鱼'] },
    '三文鱼': { n: '三文鱼', kcal: 208, p: 20, c: 0, f: 13, fib: 0, type: 'protein', a: ['三文鱼', '三文'] },
    '虾仁': { n: '虾仁', kcal: 93, p: 18.6, c: 0, f: 1, fib: 0, type: 'protein', a: ['虾仁', '虾'] },
    '豆腐': { n: '豆腐', kcal: 84, p: 8.1, c: 4.2, f: 3.7, fib: 0.4, type: 'protein', a: ['豆腐'] },
    '豆浆': { n: '豆浆', kcal: 31, p: 3, c: 1.2, f: 1.6, fib: 0.5, type: 'protein', a: ['豆浆'] },
    '牛奶': { n: '牛奶', kcal: 54, p: 3, c: 4.8, f: 3.2, fib: 0, type: 'protein', a: ['牛奶'] },
    '酸奶': { n: '酸奶', kcal: 72, p: 3.5, c: 9, f: 2.5, fib: 0, type: 'protein', a: ['酸奶'] },
    '皮蛋': { n: '皮蛋', kcal: 200, p: 14, c: 4, f: 15, fib: 0, type: 'protein', a: ['皮蛋'] },
    '火腿': { n: '火腿', kcal: 330, p: 16, c: 2, f: 26, fib: 0, type: 'protein', a: ['火腿'] },
    '芝士': { n: '芝士', kcal: 350, p: 20, c: 4, f: 28, fib: 0, type: 'protein', a: ['芝士', '奶酪'] },
    '植物油': { n: '植物油', kcal: 900, p: 0, c: 0, f: 100, fib: 0, type: 'fat', a: ['植物油', '食用油', '油'] },
    '白砂糖': { n: '白砂糖', kcal: 400, p: 0, c: 100, f: 0, fib: 0, type: 'sugar', a: ['白砂糖', '糖'] },
    '花生': { n: '花生', kcal: 574, p: 24, c: 16, f: 49, fib: 5.5, type: 'fat', a: ['花生', '花生米'] },
    '淀粉': { n: '淀粉', kcal: 350, p: 0, c: 85, f: 0, fib: 0, type: 'sugar', a: ['淀粉'] },
    '番茄': { n: '番茄', kcal: 18, p: 0.9, c: 3.9, f: 0.2, fib: 1.2, type: 'veg', a: ['番茄', '西红柿'] },
    '青椒': { n: '青椒', kcal: 22, p: 1, c: 5.4, f: 0.2, fib: 1.4, type: 'veg', a: ['青椒', '尖椒'] },
    '土豆': { n: '土豆', kcal: 77, p: 2, c: 17.2, f: 0.2, fib: 2.2, type: 'veg', a: ['土豆', '马铃薯'] },
    '西兰花': { n: '西兰花', kcal: 34, p: 2.8, c: 6.6, f: 0.4, fib: 2.6, type: 'veg', a: ['西兰花', '西蓝花'] },
    '青菜': { n: '青菜', kcal: 15, p: 1.5, c: 2.7, f: 0.3, fib: 1.4, type: 'veg', a: ['青菜', '菠菜', '小白菜', '时蔬', '蔬菜'] },
    '生菜': { n: '生菜', kcal: 15, p: 1.4, c: 2.9, f: 0.2, fib: 1.3, type: 'veg', a: ['生菜'] },
    '黄瓜': { n: '黄瓜', kcal: 15, p: 0.7, c: 3.6, f: 0.1, fib: 0.5, type: 'veg', a: ['黄瓜'] },
    '茄子': { n: '茄子', kcal: 23, p: 1.1, c: 4.9, f: 0.2, fib: 1.3, type: 'veg', a: ['茄子'] },
    '胡萝卜': { n: '胡萝卜', kcal: 32, p: 0.7, c: 8.8, f: 0.2, fib: 2.8, type: 'veg', a: ['胡萝卜'] },
    '洋葱': { n: '洋葱', kcal: 40, p: 1.1, c: 9, f: 0.1, fib: 1.7, type: 'veg', a: ['洋葱'] },
    '豆角': { n: '豆角', kcal: 30, p: 1.8, c: 6.7, f: 0.2, fib: 2.1, type: 'veg', a: ['豆角', '四季豆'] },
    '豆芽': { n: '豆芽', kcal: 18, p: 2.1, c: 2.9, f: 0.1, fib: 1.8, type: 'veg', a: ['豆芽'] },
    '木耳': { n: '木耳', kcal: 27, p: 1.5, c: 6, f: 0.1, fib: 2.6, type: 'veg', a: ['木耳'] },
    '白菜': { n: '白菜', kcal: 13, p: 1.5, c: 2.2, f: 0.2, fib: 0.8, type: 'veg', a: ['白菜'] },
    '冬瓜': { n: '冬瓜', kcal: 12, p: 0.4, c: 2.4, f: 0.2, fib: 0.7, type: 'veg', a: ['冬瓜'] },
    '玉米': { n: '玉米', kcal: 112, p: 4, c: 22.8, f: 1.2, fib: 2.9, type: 'veg', a: ['玉米'] },
    '紫菜': { n: '紫菜', kcal: 250, p: 26, c: 44, f: 1.1, fib: 21, type: 'veg', a: ['紫菜'] },
    '燕麦': { n: '燕麦', kcal: 389, p: 16.9, c: 66, f: 6.9, fib: 10.6, type: 'staple', a: ['燕麦'] },
    '面包': { n: '面包', kcal: 280, p: 8, c: 50, f: 5, fib: 2, type: 'staple', a: ['面包', '汉堡胚'] },
    '番茄酱': { n: '番茄酱', kcal: 100, p: 1, c: 22, f: 0, fib: 0, type: 'sugar', a: ['番茄酱'] },
    '珍珠': { n: '珍珠', kcal: 330, p: 2, c: 75, f: 2, fib: 0, type: 'sugar', a: ['珍珠'] },
    '可乐': { n: '可乐', kcal: 42, p: 0, c: 10.6, f: 0, fib: 0, type: 'sugar', a: ['可乐'] },
    '咖喱块': { n: '咖喱块', kcal: 500, p: 6, c: 50, f: 30, fib: 0, type: 'fat', a: ['咖喱'] },
    '红薯': { n: '红薯', kcal: 86, p: 1.6, c: 20.1, f: 0.1, fib: 3, type: 'staple', a: ['红薯', '地瓜'] },
    '苹果': { n: '苹果', kcal: 52, p: 0.3, c: 13.8, f: 0.2, fib: 2.4, type: 'veg', a: ['苹果'] },
    '香蕉': { n: '香蕉', kcal: 93, p: 1.4, c: 22, f: 0.2, fib: 1.2, type: 'veg', a: ['香蕉'] },
    '白萝卜': { n: '白萝卜', kcal: 16, p: 0.7, c: 4, f: 0.1, fib: 1.6, type: 'veg', a: ['白萝卜', '萝卜'] },
    '海带': { n: '海带', kcal: 13, p: 1.2, c: 2.1, f: 0.1, fib: 0.5, type: 'veg', a: ['海带'] },
    '蒜苔': { n: '蒜苔', kcal: 61, p: 2, c: 15, f: 0.1, fib: 2.5, type: 'veg', a: ['蒜苔', '蒜薹'] },
    '芹菜': { n: '芹菜', kcal: 16, p: 0.8, c: 3.9, f: 0.1, fib: 1.4, type: 'veg', a: ['芹菜', '西芹'] },
    '苦瓜': { n: '苦瓜', kcal: 19, p: 1, c: 4.3, f: 0.1, fib: 2, type: 'veg', a: ['苦瓜'] },
    '丝瓜': { n: '丝瓜', kcal: 20, p: 1, c: 4.2, f: 0.2, fib: 0.6, type: 'veg', a: ['丝瓜'] },
    '山药': { n: '山药', kcal: 57, p: 1.9, c: 12.4, f: 0.2, fib: 0.8, type: 'veg', a: ['山药'] },
    '莲藕': { n: '莲藕', kcal: 73, p: 1.9, c: 17.2, f: 0.2, fib: 4.9, type: 'veg', a: ['莲藕', '藕'] },
    '南瓜': { n: '南瓜', kcal: 23, p: 0.7, c: 5.3, f: 0.1, fib: 0.8, type: 'veg', a: ['南瓜'] },
    '蘑菇': { n: '蘑菇', kcal: 22, p: 3.1, c: 3.3, f: 0.3, fib: 1, type: 'veg', a: ['蘑菇', '香菇', '菌菇'] },
    '花菜': { n: '花菜', kcal: 25, p: 2, c: 4.6, f: 0.2, fib: 1.6, type: 'veg', a: ['花菜', '菜花'] },
    '紫甘蓝': { n: '紫甘蓝', kcal: 25, p: 1.2, c: 6.2, f: 0.2, fib: 2, type: 'veg', a: ['紫甘蓝'] },
    '油麦菜': { n: '油麦菜', kcal: 15, p: 1.4, c: 2.8, f: 0.4, fib: 1.2, type: 'veg', a: ['油麦菜'] },
    '空心菜': { n: '空心菜', kcal: 20, p: 2.2, c: 3.6, f: 0.3, fib: 1.4, type: 'veg', a: ['空心菜'] },
    '荷兰豆': { n: '荷兰豆', kcal: 42, p: 2.7, c: 7.5, f: 0.2, fib: 2, type: 'veg', a: ['荷兰豆'] },
    '芦笋': { n: '芦笋', kcal: 22, p: 2.2, c: 4.1, f: 0.1, fib: 2, type: 'veg', a: ['芦笋'] },
    '秋葵': { n: '秋葵', kcal: 33, p: 1.9, c: 7.5, f: 0.2, fib: 3.2, type: 'veg', a: ['秋葵'] },
    '西葫芦': { n: '西葫芦', kcal: 17, p: 1.2, c: 3.1, f: 0.2, fib: 1, type: 'veg', a: ['西葫芦'] },
    '韭菜': { n: '韭菜', kcal: 26, p: 2.4, c: 4.6, f: 0.4, fib: 1.4, type: 'veg', a: ['韭菜'] },
    '豆干': { n: '豆干', kcal: 140, p: 16, c: 6, f: 7, fib: 1, type: 'protein', a: ['豆干', '香干'] },
    '盐': { n: '盐', kcal: 0, p: 0, c: 0, f: 0, fib: 0, type: 'seasoning', a: ['盐', '食盐'] },
    '酱油': { n: '酱油', kcal: 60, p: 5, c: 8, f: 0, fib: 0, type: 'seasoning', a: ['酱油', '生抽', '老抽'] },
    '蚝油': { n: '蚝油', kcal: 100, p: 2, c: 18, f: 0, fib: 0, type: 'seasoning', a: ['蚝油'] },
    '豆瓣酱': { n: '豆瓣酱', kcal: 180, p: 6, c: 20, f: 6, fib: 2, type: 'seasoning', a: ['豆瓣酱', '豆酱'] },
    '银耳': { n: '银耳', kcal: 26, p: 1.4, c: 6.6, f: 0.1, fib: 2.5, type: 'veg', a: ['银耳'] },
    '莲子': { n: '莲子', kcal: 344, p: 17, c: 64, f: 2.5, fib: 3, type: 'staple', a: ['莲子'] },
    '绿豆': { n: '绿豆', kcal: 329, p: 21.6, c: 62, f: 0.8, fib: 6.4, type: 'staple', a: ['绿豆'] },
    '红豆': { n: '红豆', kcal: 324, p: 20, c: 63, f: 0.6, fib: 7.7, type: 'staple', a: ['红豆'] },
    '薏米': { n: '薏米', kcal: 361, p: 12, c: 71, f: 3.4, fib: 2, type: 'staple', a: ['薏米'] },
    '猪肝': { n: '猪肝', kcal: 129, p: 19.3, c: 5, f: 3.5, fib: 0, type: 'protein', a: ['猪肝'] },
    '橘子': { n: '橘子', kcal: 44, p: 0.8, c: 11.5, f: 0.2, fib: 1.8, type: 'veg', a: ['橘子', '橙子'] },
    '海苔': { n: '海苔', kcal: 177, p: 29, c: 38, f: 4, fib: 23, type: 'veg', a: ['海苔'] }
  };

  const ING_CONTROL = {
    '白砂糖': { sug: 100 }, '可乐': { sug: 10.6, na: 5 }, '珍珠': { sug: 30, na: 10 },
    '番茄酱': { sug: 20, na: 1100 }, '面包': { sug: 6, na: 400 }, '火腿': { sug: 1, na: 1200 },
    '芝士': { sug: 1, na: 600 }, '猪肉馅': { na: 60 }, '豆腐': { na: 7 },
    '咖喱块': { sug: 10, na: 3000 }, '盐': { na: 39300 }, '酱油': { sug: 5, na: 5500 },
    '蚝油': { sug: 10, na: 4000 }, '豆瓣酱': { sug: 5, na: 6000 }, '豆干': { na: 700 },
    '紫菜': { na: 710 }, '虾仁': { na: 150 }, '牛奶': { sug: 0 }, '酸奶': { sug: 6 }
  };
  /* 食材别名 → 主键。生成菜谱里会写「菠菜」「香菇」等别名，必须能折算营养 */
  const ING_ALIAS = {};
  Object.keys(DISH_ING).forEach(k => {
    ING_ALIAS[k] = k;
    (DISH_ING[k].a || []).forEach(a => { if (!ING_ALIAS[a]) ING_ALIAS[a] = k; });
  });
  function ingOf(name) {
    if (!name) return null;
    if (DISH_ING[name]) return DISH_ING[name];
    const k = ING_ALIAS[name];
    return k ? DISH_ING[k] : null;
  }
  Object.keys(ING_CONTROL).forEach(k => { if (DISH_ING[k]) Object.assign(DISH_ING[k], ING_CONTROL[k]); });

  const DISH_DB = [
    { n: '番茄炒蛋', a: ['西红柿炒鸡蛋', '番茄炒鸡蛋', '西红柿炒蛋'], c: [['番茄', 200], ['鸡蛋', 120], ['植物油', 12], ['白砂糖', 3]], note: '家常 2 个蛋 + 2 个番茄，油 12g' },
    { n: '青椒肉丝', a: ['青椒炒肉丝', '尖椒肉丝'], c: [['青椒', 150], ['猪里脊', 120], ['植物油', 13], ['白砂糖', 2]], note: '一盘约 150g 青椒 + 120g 瘦肉' },
    { n: '鱼香肉丝', a: ['鱼香猪肉丝'], c: [['猪里脊', 120], ['木耳', 30], ['胡萝卜', 50], ['青椒', 50], ['植物油', 15], ['白砂糖', 8]], note: '含糖醋汁，油和糖都不低' },
    { n: '宫保鸡丁', a: ['宫爆鸡丁'], c: [['鸡胸', 140], ['花生', 30], ['黄瓜', 50], ['植物油', 12], ['白砂糖', 5]], note: '花生和油是主要热量来源' },
    { n: '麻婆豆腐', a: ['麻辣豆腐'], c: [['豆腐', 250], ['牛肉末', 40], ['植物油', 15]], note: '豆腐 250g，肉末 40g' },
    { n: '红烧肉', a: ['红烧五花肉'], c: [['五花肉', 150], ['植物油', 10], ['白砂糖', 8]], note: '五花肉按 150g 常规份，油脂很高' },
    { n: '回锅肉', a: ['回锅五花肉'], c: [['五花肉', 120], ['青椒', 100], ['青菜', 30], ['植物油', 10]], note: '五花肉 120g，青椒 100g' },
    { n: '糖醋里脊', a: ['糖醋肉'], c: [['猪里脊', 150], ['淀粉', 30], ['白砂糖', 15], ['植物油', 18]], note: '挂糊油炸 + 糖醋汁' },
    { n: '红烧排骨', a: ['烧排骨'], c: [['排骨', 200], ['植物油', 8], ['白砂糖', 8]], note: '排骨 200g 常规份' },
    { n: '清蒸鲈鱼', a: ['清蒸鱼', '蒸鱼'], c: [['鲈鱼', 250], ['植物油', 5]], note: '按半条鱼 250g 可食部估' },
    { n: '红烧鱼', a: ['红烧鲈鱼'], c: [['鲈鱼', 250], ['植物油', 10], ['白砂糖', 5]], note: '鱼 250g + 红烧汁' },
    { n: '水煮鱼', a: ['水煮鲈鱼'], c: [['鲈鱼', 200], ['豆芽', 100], ['植物油', 20]], note: '餐馆版油量按 20g 估' },
    { n: '酸菜鱼', a: ['酸菜鲈鱼'], c: [['鲈鱼', 200], ['白菜', 100], ['植物油', 15]], note: '鱼 200g + 酸菜 100g' },
    { n: '白灼虾', a: ['水煮虾', '清蒸虾'], c: [['虾仁', 200], ['植物油', 3]], note: '虾 200g 可食部' },
    { n: '蒜蓉西兰花', a: ['清炒西兰花'], c: [['西兰花', 200], ['植物油', 8]], note: '西兰花 200g，油 8g' },
    { n: '清炒时蔬', a: ['炒青菜', '清炒蔬菜', '炒菠菜'], c: [['青菜', 250], ['植物油', 8]], note: '一盘青菜 250g' },
    { n: '地三鲜', a: ['地三鲜'], c: [['土豆', 150], ['茄子', 150], ['青椒', 50], ['植物油', 15]], note: '三种蔬菜先炸后炒，吸油' },
    { n: '干煸豆角', a: ['干煸四季豆'], c: [['豆角', 200], ['植物油', 12]], note: '豆角 200g，油 12g' },
    { n: '酸辣土豆丝', a: ['土豆丝', '炒土豆丝'], c: [['土豆', 200], ['植物油', 10]], note: '土豆 200g，油 10g' },
    { n: '蛋炒饭', a: ['鸡蛋炒饭', '炒饭'], c: [['米饭', 250], ['鸡蛋', 100], ['植物油', 10]], note: '一碗饭 250g + 1 个蛋' },
    { n: '扬州炒饭', a: ['什锦炒饭'], c: [['米饭', 250], ['鸡蛋', 80], ['虾仁', 40], ['火腿', 30], ['植物油', 10]], note: '含虾仁和火腿的什锦炒饭' },
    { n: '牛肉面', a: ['红烧牛肉面'], c: [['面条', 250], ['牛肉', 80], ['植物油', 5]], note: '面 250g + 牛肉 80g' },
    { n: '炸酱面', a: [], c: [['面条', 250], ['猪肉馅', 60], ['植物油', 10], ['白砂糖', 5]], note: '面 250g + 肉酱 60g' },
    { n: '猪肉白菜饺子', a: ['饺子', '水饺'], c: [['面粉', 100], ['猪肉馅', 60], ['白菜', 80], ['植物油', 3]], note: '约 10 个饺子，总重 300g' },
    { n: '小笼包', a: ['小笼汤包'], c: [['面粉', 80], ['猪肉馅', 60], ['植物油', 5]], note: '按 6 个小笼包估' },
    { n: '猪肉包子', a: ['包子', '肉包'], c: [['面粉', 80], ['猪肉馅', 50], ['植物油', 3]], note: '按 1 个中等肉包估' },
    { n: '白粥', a: ['大米粥', '稀饭'], c: [['米饭', 150]], note: '一碗稠粥约 150g 熟饭' },
    { n: '皮蛋瘦肉粥', a: ['皮蛋粥'], c: [['米饭', 150], ['皮蛋', 30], ['猪里脊', 30], ['植物油', 2]], note: '一碗粥的常规配料' },
    { n: '豆浆', a: [], c: [['豆浆', 300]], note: '一杯 300ml 无糖豆浆' },
    { n: '牛奶', a: [], c: [['牛奶', 250]], note: '一盒 250ml 纯牛奶' },
    { n: '拿铁', a: ['咖啡拿铁'], c: [['牛奶', 200], ['白砂糖', 5]], note: '中杯拿铁，按微糖估' },
    { n: '奶茶', a: ['珍珠奶茶'], c: [['牛奶', 150], ['珍珠', 40], ['白砂糖', 20]], note: '中杯珍珠奶茶，全糖偏高' },
    { n: '可乐', a: [], c: [['可乐', 330]], note: '一罐 330ml 可乐' },
    { n: '牛肉汉堡', a: ['汉堡'], c: [['面包', 100], ['牛肉', 80], ['芝士', 20], ['番茄酱', 10], ['植物油', 5]], note: '一个常规牛肉汉堡' },
    { n: '炸鸡', a: ['炸鸡腿'], c: [['鸡腿肉', 150], ['面粉', 30], ['植物油', 15]], note: '一个裹粉炸鸡腿' },
    { n: '薯条', a: ['炸薯条'], c: [['土豆', 150], ['植物油', 15]], note: '一份中薯约 150g' },
    { n: '披萨', a: ['芝士披萨'], c: [['面粉', 120], ['芝士', 50], ['番茄酱', 20], ['火腿', 30]], note: '按 2 片普通披萨估' },
    { n: '鸡胸沙拉', a: ['沙拉', '鸡胸肉沙拉'], c: [['鸡胸', 100], ['生菜', 100], ['番茄', 100], ['植物油', 10]], note: '鸡胸 100g + 蔬菜 + 油醋汁' },
    { n: '麻辣烫', a: ['麻辣烫'], c: [['青菜', 200], ['豆腐', 50], ['猪肉馅', 80], ['面条', 50], ['植物油', 10]], note: '按一碗混合麻辣烫估' },
    { n: '火锅', a: ['小火锅'], c: [['牛肉', 150], ['青菜', 200], ['豆腐', 100], ['植物油', 10]], note: '一人份肉 + 菜 + 油碟' },
    { n: '黄焖鸡米饭', a: ['黄焖鸡'], c: [['鸡腿肉', 180], ['米饭', 250], ['土豆', 100], ['植物油', 10]], note: '含一碗米饭的套餐' },
    { n: '咖喱鸡饭', a: ['咖喱鸡'], c: [['鸡腿肉', 150], ['米饭', 250], ['土豆', 100], ['胡萝卜', 50], ['咖喱块', 30], ['植物油', 5]], note: '含米饭和咖喱块' },
    { n: '牛肉盖饭', a: ['牛肉饭', '肥牛饭'], c: [['牛肉', 100], ['米饭', 250], ['洋葱', 50], ['植物油', 8]], note: '一碗牛肉盖饭' },
    { n: '三文鱼饭', a: ['三文鱼盖饭'], c: [['三文鱼', 120], ['米饭', 250]], note: '三文鱼 120g + 米饭' },
    { n: '紫菜蛋花汤', a: ['紫菜鸡蛋汤'], c: [['紫菜', 5], ['鸡蛋', 50], ['植物油', 2]], note: '一碗汤，紫菜按干重 5g' },
    { n: '西红柿鸡蛋汤', a: ['番茄蛋汤', '西红柿蛋汤'], c: [['番茄', 100], ['鸡蛋', 50], ['植物油', 3]], note: '一碗家常蛋汤' },
    { n: '烤红薯', a: ['红薯', '地瓜'], c: [['红薯', 200]], note: '一个中等烤红薯约 200g' },
    { n: '玉米', a: ['煮玉米', '甜玉米'], c: [['玉米', 200]], note: '一根玉米可食部约 200g' },
    { n: '燕麦粥', a: ['燕麦牛奶', '牛奶燕麦'], c: [['燕麦', 40], ['牛奶', 200]], note: '40g 燕麦 + 200ml 牛奶' },
    { n: '酸奶', a: [], c: [['酸奶', 200]], note: '一杯 200g 酸奶' },
    { n: '苹果', a: [], c: [['苹果', 200]], note: '一个中等苹果可食部约 200g' },
    { n: '香蕉', a: [], c: [['香蕉', 120]], note: '一根中等香蕉可食部约 120g' }
  ];

  /* ============================================================
     大目录：家常菜 / 主食 / 汤粥 / 零食 / 饮料
     说明：常见菜用配料表；扩展条目按菜名、品类和做法估算。
     ============================================================ */
  let DISH_CATALOG = null;

  function catOfDishName(n) {
    if (/饭|面|粉|饺|馄饨|包|馒头|烧麦|粽子|寿司|饭团|粥/.test(n)) return 'staple';
    if (/汤|羹/.test(n)) return 'soup';
    if (/可乐|雪碧|牛奶|豆浆|拿铁|奶茶|咖啡|酸奶|果汁|茶|水|酒/.test(n)) return 'drink';
    if (/冰淇淋|雪糕|蛋糕|饼干|巧克力|薯片|辣条|果干|坚果|肉干|布丁|果冻|软糖|硬糖|棒棒糖|牛轧糖|棉花糖|沙琪玛|桃酥|蛋挞|泡芙|甜甜圈|马卡龙|布朗尼/.test(n)) return 'snack';
    if (/沙拉|轻食/.test(n)) return 'light';
    if (/汉堡|炸鸡|披萨|薯条|三明治|热狗|蛋挞|鸡块|鸡翅|鸡米花/.test(n)) return 'fast';
    if (/油条|包子|煎饼|烧饼|馒头|豆浆|豆腐脑|粥|蛋|吐司|面包|燕麦/.test(n)) return 'breakfast';
    return 'home';
  }

  function compTotals(comps) {
    const t = { grams: 0, kcal: 0, p: 0, c: 0, f: 0, fib: 0, sugar: 0, oil: 0, na: 0 };
    (comps || []).forEach(p => {
      const f = ingOf(p[0]);
      if (!f) return;
      const g = Number(p[1]) || 0;
      t.grams += g;
      t.kcal += f.kcal * g / 100;
      t.p += f.p * g / 100;
      t.c += f.c * g / 100;
      t.f += f.f * g / 100;
      t.fib += f.fib * g / 100;
      t.sugar += (f.sug || 0) * g / 100;
      t.na += (f.na || 0) * g / 100;
      if (f.n === '植物油') t.oil += g;
    });
    t.kcal = Math.round(t.kcal);
    t.p = round1(t.p); t.c = round1(t.c); t.f = round1(t.f); t.fib = round1(t.fib);
    t.control = { sugar: round1(t.sugar), oil: round1(t.oil), salt: round1(t.na / 400), sodium: Math.round(t.na) };
    return t;
  }

  const SNACK_FLAVORS = {
    chips: ['原味', '番茄', '烧烤', '香辣', '黄瓜', '海盐', '芝士', '黑胡椒'],
    biscuit: ['原味', '巧克力', '黄油', '海盐', '抹茶', '黑芝麻', '芝士', '蔓越莓'],
    candy: ['牛奶', '黑巧', '榛子', '杏仁', '焦糖', '草莓', '抹茶', '海盐'],
    nut: ['原味', '盐焗', '蜂蜜', '奶油', '焦糖', '香辣', '蒜香', '海盐'],
    fruit: ['原味', '蜂蜜', '酸奶', '玫瑰', '陈皮', '话梅', '低糖', '椰香'],
    meat: ['原味', '香辣', '麻辣', '五香', '黑椒', '孜然', '蜜汁', '蒜香'],
    spicy: ['原味', '香辣', '麻辣', '甜辣', '蒜香', '藤椒', '烧烤', '酱香'],
    bakery: ['原味', '巧克力', '奶油', '芝士', '红豆', '肉松', '抹茶', '芋泥'],
    ice: ['香草', '巧克力', '草莓', '芒果', '抹茶', '咖啡', '焦糖', '坚果'],
    dessert: ['原味', '芒果', '草莓', '抹茶', '红豆', '椰香', '芋泥', '黑糖']
  };

  function SB(name, kcal, p, c, f, fib, serve, sug, oil, na, cat) {
    return { n: name, kcal: kcal, p: p, c: c, f: f, fib: fib, serve: serve, sug: sug, oil: oil, na: na, cat: cat };
  }

  const SNACK_ALIAS = {
    '薯片': ['乐事', '可比克', '品客'], '厚切薯片': ['乐事大波浪'], '夹心饼干': ['奥利奥'],
    '苏打饼干': ['太平', '闲趣'], '曲奇': ['皇冠', '蓝罐'], '威化': ['雀巢'],
    '巧克力棒': ['士力架'], '黑巧克力': ['德芙', '费列罗'], '牛奶巧克力': ['德芙', '好时'],
    '软糖': ['旺仔', '徐福记'], '辣条': ['卫龙'], '豆干': ['良品铺子'],
    '牛肉干': ['三只松鼠', '良品铺子', '百草味'], '猪肉脯': ['来伊份', '三只松鼠'],
    '海苔': ['波力', '美好时光'], '冰淇淋': ['哈根达斯', '梦龙'], '雪糕': ['梦龙', '可爱多'],
    '蛋挞': ['肯德基'], '花生': ['三只松鼠', '良品铺子'], '开心果': ['三只松鼠', '百草味']
  };
  const DRINK_ALIAS = {
    '可乐': ['可口可乐', '百事可乐', '百事'], '雪碧': ['可口可乐'], '芬达': ['可口可乐'],
    '气泡水': ['元气森林'], '苏打水': ['屈臣氏'], '无糖茶': ['东方树叶', '三得利'],
    '冰红茶': ['康师傅', '统一'], '凉茶': ['王老吉', '加多宝'], '豆浆': ['永和'],
    '酸奶': ['伊利', '蒙牛', '光明'], '纯牛奶': ['伊利', '蒙牛', '光明'],
    '拿铁': ['瑞幸', '星巴克'], '美式咖啡': ['瑞幸', '星巴克'],
    '珍珠奶茶': ['喜茶', '奈雪', '蜜雪冰城'], '黑糖珍珠奶茶': ['喜茶', '蜜雪冰城'],
    '生椰拿铁': ['瑞幸'], '杨枝甘露': ['喜茶', '7分甜']
  };
  const INSTANT_ALIAS = {
    '红烧牛肉面': ['康师傅', '统一'], '香辣牛肉面': ['康师傅'], '老坛酸菜面': ['统一', '康师傅'],
    '番茄鸡蛋面': ['康师傅'], '鲜虾鱼板面': ['康师傅'], '香菇炖鸡面': ['康师傅'],
    '火鸡面': ['三养'], '螺蛳粉': ['好欢螺', '李子柒'], '酸辣粉': ['白家'],
    '热干面': ['蔡林记'], '油泼面': ['西贝']
  };

  const SNACK_BASES = [
    SB('薯片', 536, 7, 53, 35, 4, 50, 2, 25, 600, 'chips'),
    SB('厚切薯片', 520, 6, 55, 32, 4, 50, 2, 22, 550, 'chips'),
    SB('薯条', 312, 4, 41, 15, 4, 80, 1, 12, 400, 'chips'),
    SB('锅巴', 520, 7, 65, 25, 3, 40, 2, 18, 700, 'chips'),
    SB('虾条', 480, 6, 60, 24, 2, 40, 3, 15, 800, 'chips'),
    SB('玉米脆', 500, 6, 62, 25, 3, 40, 3, 18, 600, 'chips'),
    SB('蔬菜脆', 450, 5, 55, 20, 5, 30, 4, 12, 500, 'chips'),
    SB('米饼', 420, 5, 70, 12, 1, 30, 3, 8, 400, 'chips'),
    SB('仙贝', 400, 6, 72, 10, 1, 30, 4, 7, 500, 'chips'),
    SB('雪饼', 430, 5, 68, 15, 1, 30, 8, 10, 400, 'chips'),
    SB('爆米花', 480, 7, 60, 24, 4, 50, 5, 20, 500, 'chips'),
    SB('海苔', 300, 30, 40, 5, 30, 10, 5, 2, 1500, 'chips'),
    SB('薯圈', 530, 6, 55, 33, 3, 40, 2, 24, 600, 'chips'),
    SB('紫薯脆', 460, 4, 60, 22, 3, 30, 4, 14, 500, 'chips'),
    SB('山药脆', 440, 5, 62, 18, 3, 30, 4, 12, 500, 'chips'),
    SB('秋葵脆', 420, 8, 45, 18, 6, 25, 3, 10, 500, 'chips'),
    SB('香菇脆', 430, 10, 45, 18, 6, 25, 2, 10, 600, 'chips'),
    SB('冻干草莓', 350, 2, 75, 2, 6, 20, 60, 0, 20, 'chips'),
    SB('冻干榴莲', 380, 3, 70, 8, 3, 20, 55, 2, 20, 'chips'),
    SB('海苔脆', 330, 25, 45, 8, 20, 20, 8, 4, 1500, 'chips'),

    SB('苏打饼干', 450, 9, 70, 15, 2, 30, 3, 10, 600, 'biscuit'),
    SB('夹心饼干', 500, 6, 65, 25, 1, 30, 25, 15, 400, 'biscuit'),
    SB('曲奇', 520, 6, 60, 28, 1, 30, 20, 18, 300, 'biscuit'),
    SB('威化', 480, 6, 65, 22, 1, 30, 22, 14, 300, 'biscuit'),
    SB('消化饼', 430, 8, 68, 14, 4, 30, 10, 8, 400, 'biscuit'),
    SB('全麦饼', 380, 9, 65, 10, 5, 30, 5, 6, 350, 'biscuit'),
    SB('蛋卷', 480, 7, 62, 22, 1, 30, 18, 15, 300, 'biscuit'),
    SB('蛋黄派', 450, 6, 60, 20, 1, 40, 25, 12, 350, 'biscuit'),
    SB('铜锣烧', 380, 7, 65, 10, 1, 50, 20, 6, 300, 'biscuit'),
    SB('沙琪玛', 500, 6, 65, 24, 1, 40, 25, 15, 250, 'biscuit'),
    SB('桃酥', 520, 6, 62, 26, 1, 40, 20, 18, 300, 'biscuit'),
    SB('老婆饼', 450, 7, 60, 20, 2, 50, 18, 12, 300, 'biscuit'),

    SB('黑巧克力', 600, 8, 45, 40, 10, 20, 20, 25, 50, 'candy'),
    SB('牛奶巧克力', 535, 7, 58, 30, 3, 20, 50, 20, 80, 'candy'),
    SB('白巧克力', 560, 6, 60, 32, 0, 20, 55, 22, 80, 'candy'),
    SB('巧克力棒', 500, 8, 55, 25, 3, 30, 40, 15, 100, 'candy'),
    SB('巧克力豆', 480, 5, 65, 20, 2, 30, 50, 12, 80, 'candy'),
    SB('软糖', 350, 5, 85, 0, 0, 20, 55, 0, 50, 'candy'),
    SB('硬糖', 400, 0, 98, 0, 0, 15, 75, 0, 30, 'candy'),
    SB('棒棒糖', 380, 0, 95, 0, 0, 15, 75, 0, 30, 'candy'),
    SB('牛轧糖', 450, 8, 65, 18, 1, 20, 45, 10, 100, 'candy'),
    SB('棉花糖', 320, 2, 80, 0, 0, 15, 55, 0, 20, 'candy'),
    SB('太妃糖', 430, 4, 70, 15, 0, 20, 50, 8, 100, 'candy'),
    SB('花生糖', 480, 10, 60, 22, 2, 20, 35, 10, 150, 'candy'),

    SB('海绵蛋糕', 350, 7, 55, 12, 1, 70, 30, 8, 200, 'dessert'),
    SB('戚风蛋糕', 300, 7, 45, 12, 1, 70, 25, 8, 150, 'dessert'),
    SB('奶油蛋糕', 380, 5, 45, 20, 1, 80, 35, 12, 200, 'dessert'),
    SB('慕斯', 320, 6, 40, 18, 1, 80, 30, 10, 150, 'dessert'),
    SB('芝士蛋糕', 340, 7, 35, 22, 1, 80, 25, 12, 200, 'dessert'),
    SB('提拉米苏', 330, 6, 35, 20, 1, 80, 28, 12, 150, 'dessert'),
    SB('蛋挞', 300, 5, 30, 16, 1, 60, 20, 10, 180, 'dessert'),
    SB('泡芙', 280, 6, 25, 16, 1, 50, 15, 10, 150, 'dessert'),
    SB('瑞士卷', 320, 6, 40, 16, 1, 60, 25, 10, 150, 'dessert'),
    SB('甜甜圈', 380, 5, 50, 18, 1, 60, 30, 12, 250, 'dessert'),
    SB('马卡龙', 400, 7, 60, 18, 1, 20, 50, 10, 100, 'dessert'),
    SB('布朗尼', 420, 6, 50, 22, 2, 50, 35, 12, 150, 'dessert'),

    SB('花生', 574, 24, 16, 49, 5.5, 25, 4, 0, 300, 'nut'),
    SB('瓜子', 540, 25, 20, 45, 3, 25, 3, 0, 500, 'nut'),
    SB('核桃', 654, 15, 14, 65, 6, 25, 2, 0, 20, 'nut'),
    SB('腰果', 553, 18, 30, 44, 3, 25, 5, 0, 200, 'nut'),
    SB('杏仁', 579, 21, 22, 50, 12, 25, 4, 0, 150, 'nut'),
    SB('开心果', 560, 20, 28, 45, 10, 25, 4, 0, 300, 'nut'),
    SB('夏威夷果', 700, 8, 14, 75, 8, 20, 4, 0, 150, 'nut'),
    SB('巴旦木', 579, 21, 22, 50, 12, 25, 4, 0, 150, 'nut'),
    SB('榛子', 628, 15, 17, 61, 10, 25, 3, 0, 100, 'nut'),
    SB('碧根果', 690, 9, 14, 72, 6, 20, 3, 0, 100, 'nut'),
    SB('松子', 673, 14, 13, 68, 4, 20, 2, 0, 100, 'nut'),
    SB('南瓜子', 559, 30, 15, 45, 4, 25, 2, 0, 200, 'nut'),

    SB('葡萄干', 341, 3, 79, 0.5, 3.7, 30, 60, 0, 50, 'fruit'),
    SB('红枣', 276, 3, 70, 0.5, 3, 30, 55, 0, 20, 'fruit'),
    SB('枸杞', 258, 13, 64, 1.5, 16, 20, 45, 0, 50, 'fruit'),
    SB('芒果干', 320, 2, 78, 0.5, 2, 30, 55, 0, 100, 'fruit'),
    SB('香蕉片', 519, 2, 58, 34, 2, 25, 35, 10, 100, 'fruit'),
    SB('蔓越莓干', 308, 0, 82, 0.1, 5, 30, 60, 0, 20, 'fruit'),
    SB('蓝莓干', 300, 1, 80, 0.5, 5, 30, 55, 0, 20, 'fruit'),
    SB('桂圆干', 286, 5, 72, 0.5, 2, 25, 50, 0, 20, 'fruit'),
    SB('话梅', 260, 3, 65, 1, 5, 20, 40, 0, 2000, 'fruit'),
    SB('杏干', 250, 3, 63, 0.5, 4, 25, 45, 0, 50, 'fruit'),
    SB('柿饼', 250, 2, 62, 0.3, 4, 30, 45, 0, 20, 'fruit'),
    SB('山楂片', 350, 1, 85, 0.5, 2, 20, 65, 0, 100, 'fruit'),

    SB('牛肉干', 550, 45, 20, 25, 1, 30, 8, 10, 1500, 'meat'),
    SB('猪肉脯', 400, 25, 40, 15, 1, 30, 20, 8, 1200, 'meat'),
    SB('鸡肉肠', 250, 15, 20, 15, 1, 40, 3, 10, 1000, 'meat'),
    SB('鱿鱼丝', 300, 50, 20, 5, 1, 25, 5, 2, 1500, 'meat'),
    SB('鱼片', 350, 45, 30, 8, 1, 25, 5, 5, 1500, 'meat'),
    SB('鸭脖', 280, 25, 10, 18, 1, 50, 5, 10, 1800, 'meat'),
    SB('鸭翅', 300, 22, 5, 22, 0, 50, 3, 12, 1700, 'meat'),
    SB('卤鸡爪', 250, 20, 5, 18, 0, 50, 2, 10, 1500, 'meat'),
    SB('泡椒凤爪', 250, 20, 5, 18, 0, 50, 2, 10, 1800, 'meat'),
    SB('火腿肠', 260, 12, 15, 18, 0, 40, 2, 12, 1200, 'meat'),
    SB('午餐肉', 310, 13, 10, 26, 0, 50, 1, 20, 1400, 'meat'),
    SB('培根', 400, 15, 2, 35, 0, 30, 1, 25, 1600, 'meat'),

    SB('辣条', 420, 12, 50, 22, 2, 30, 8, 15, 1600, 'spicy'),
    SB('面筋', 200, 20, 25, 5, 2, 30, 3, 2, 1200, 'spicy'),
    SB('豆干', 300, 25, 15, 18, 2, 30, 2, 10, 1200, 'spicy'),
    SB('素肉', 350, 20, 30, 18, 3, 30, 5, 10, 1000, 'spicy'),
    SB('魔芋爽', 150, 2, 20, 5, 5, 50, 3, 3, 1200, 'spicy'),
    SB('海带结', 100, 5, 15, 1, 5, 50, 1, 1, 1500, 'spicy'),
    SB('卤蛋', 160, 13, 5, 10, 0, 50, 1, 5, 800, 'spicy'),
    SB('豆皮', 300, 25, 15, 18, 2, 30, 2, 8, 1000, 'spicy'),
    SB('鱼豆腐', 250, 15, 20, 15, 1, 30, 3, 10, 1200, 'spicy'),
    SB('蟹棒', 200, 10, 25, 8, 1, 30, 5, 4, 800, 'spicy'),

    SB('吐司', 280, 8, 50, 5, 2, 50, 5, 4, 450, 'bakery'),
    SB('全麦面包', 250, 9, 45, 4, 6, 50, 4, 3, 400, 'bakery'),
    SB('可颂', 400, 8, 45, 22, 2, 50, 8, 15, 400, 'bakery'),
    SB('丹麦面包', 380, 7, 48, 18, 1, 50, 12, 12, 350, 'bakery'),
    SB('菠萝包', 350, 7, 50, 13, 1, 50, 15, 8, 300, 'bakery'),
    SB('奶黄包', 280, 7, 48, 6, 1, 60, 15, 4, 250, 'bakery'),
    SB('肉松卷', 350, 10, 45, 14, 1, 50, 10, 8, 350, 'bakery'),
    SB('欧包', 260, 9, 50, 3, 4, 60, 3, 2, 350, 'bakery'),
    SB('贝果', 280, 10, 52, 3, 3, 60, 4, 2, 300, 'bakery'),
    SB('华夫饼', 350, 8, 50, 14, 2, 60, 15, 8, 250, 'bakery'),

    SB('冰淇淋', 250, 4, 30, 12, 1, 80, 25, 10, 100, 'ice'),
    SB('雪糕', 220, 3, 30, 10, 1, 70, 20, 8, 80, 'ice'),
    SB('甜筒', 260, 4, 35, 11, 1, 80, 25, 9, 100, 'ice'),
    SB('冰棒', 150, 1, 25, 3, 0, 70, 18, 0, 30, 'ice'),
    SB('糯米糍', 300, 4, 50, 10, 1, 50, 25, 5, 50, 'ice'),
    SB('布丁', 150, 4, 20, 5, 0, 100, 15, 3, 80, 'ice'),
    SB('果冻', 70, 0, 17, 0, 0, 100, 15, 0, 20, 'ice'),
    SB('双皮奶', 180, 5, 20, 8, 0, 150, 18, 5, 80, 'ice'),
    SB('杨枝甘露', 180, 2, 30, 6, 1, 200, 20, 4, 50, 'ice'),
    SB('芋圆', 200, 2, 40, 5, 1, 150, 15, 2, 20, 'ice'),
    SB('豌豆脆', 380, 12, 55, 12, 6, 30, 3, 8, 600, 'chips'),
    SB('鹰嘴豆脆', 400, 14, 50, 14, 8, 30, 3, 9, 500, 'chips'),
    SB('藜麦脆', 420, 10, 60, 14, 5, 30, 3, 9, 400, 'chips'),
    SB('海带脆', 280, 8, 40, 10, 10, 20, 4, 6, 1400, 'chips'),
    SB('莲藕脆', 430, 7, 62, 17, 5, 30, 4, 10, 500, 'chips'),
    SB('芋头脆', 450, 6, 62, 20, 4, 30, 5, 12, 400, 'chips'),
    SB('红薯脆', 440, 5, 65, 18, 5, 30, 8, 11, 400, 'chips'),
    SB('南瓜脆', 430, 6, 62, 18, 6, 30, 8, 10, 400, 'chips'),
    SB('米果', 380, 6, 72, 8, 2, 30, 5, 5, 500, 'chips'),
    SB('麦片脆', 420, 9, 60, 15, 7, 30, 10, 8, 300, 'chips'),
    SB('奶酪脆', 500, 14, 45, 30, 2, 25, 5, 18, 800, 'chips'),
    SB('谷物棒', 400, 8, 60, 14, 5, 40, 20, 8, 300, 'biscuit'),
    SB('蛋白棒', 380, 25, 40, 12, 6, 50, 15, 6, 400, 'biscuit'),
    SB('能量棒', 420, 12, 55, 16, 4, 50, 25, 8, 300, 'biscuit'),
    SB('酸奶块', 380, 8, 60, 12, 1, 30, 40, 6, 200, 'dessert')
  ];

  function DR(name, kcal, p, c, f, fib, serve, na, cat, sugar) {
    return { n: name, kcal: kcal, p: p, c: c, f: f, fib: fib, serve: serve, na: na, cat: cat, sugar: sugar };
  }

  const DRINK_BASES = [
    DR('绿茶', 0, 0, 0, 0, 0, 500, 0, 'tea', 0),
    DR('红茶', 0, 0, 0, 0, 0, 500, 0, 'tea', 0),
    DR('乌龙茶', 0, 0, 0, 0, 0, 500, 0, 'tea', 0),
    DR('普洱茶', 0, 0, 0, 0, 0, 500, 0, 'tea', 0),
    DR('茉莉花茶', 0, 0, 0, 0, 0, 500, 0, 'tea', 0),
    DR('菊花茶', 0, 0, 0, 0, 0, 500, 0, 'tea', 0),
    DR('大麦茶', 2, 0, 0.5, 0, 0, 500, 0, 'tea', 0),
    DR('荞麦茶', 2, 0, 0.5, 0, 0, 500, 0, 'tea', 0),
    DR('柠檬茶', 1, 0, 0.2, 0, 0, 500, 10, 'tea', 0),
    DR('蜂蜜柚子茶', 40, 0, 10, 0, 0, 500, 10, 'tea', 10),
    DR('珍珠奶茶', 45, 1, 8, 1, 0, 500, 50, 'tea', 3),
    DR('椰果奶茶', 40, 1, 7, 1, 0, 500, 50, 'tea', 3),
    DR('芋泥奶茶', 55, 1, 10, 1.5, 0, 500, 60, 'tea', 4),
    DR('抹茶拿铁', 50, 2, 7, 2, 0, 450, 60, 'tea', 4),
    DR('红茶拿铁', 48, 2, 6.5, 2, 0, 450, 60, 'tea', 4),
    DR('水果茶', 30, 0, 7, 0, 0, 500, 10, 'tea', 6),
    DR('百香果茶', 32, 0, 8, 0, 0, 500, 10, 'tea', 6),
    DR('草莓奶昔', 90, 2, 15, 3, 0, 400, 80, 'tea', 10),
    DR('芒果冰沙', 80, 1, 18, 1, 1, 400, 30, 'tea', 12),
    DR('酸梅汤', 35, 0, 9, 0, 0, 500, 20, 'tea', 8),
    DR('美式咖啡', 2, 0.1, 0, 0, 0, 350, 5, 'coffee', 0),
    DR('拿铁', 45, 2, 5, 2, 0, 350, 40, 'coffee', 0),
    DR('卡布奇诺', 40, 2, 5, 2, 0, 300, 30, 'coffee', 0),
    DR('摩卡', 60, 2, 8, 2.5, 0, 350, 40, 'coffee', 4),
    DR('焦糖玛奇朵', 65, 2, 9, 3, 0, 350, 50, 'coffee', 6),
    DR('馥芮白', 50, 2, 5, 2.5, 0, 300, 40, 'coffee', 0),
    DR('冷萃咖啡', 2, 0.1, 0, 0, 0, 350, 5, 'coffee', 0),
    DR('浓缩咖啡', 3, 0.2, 0, 0, 0, 60, 5, 'coffee', 0),
    DR('澳白', 48, 2, 5, 2.5, 0, 300, 40, 'coffee', 0),
    DR('冰美式', 2, 0.1, 0, 0, 0, 400, 5, 'coffee', 0),
    DR('可乐', 42, 0, 10.6, 0, 0, 330, 5, 'soda', 10.6),
    DR('雪碧', 40, 0, 10, 0, 0, 330, 5, 'soda', 10),
    DR('芬达', 45, 0, 11, 0, 0, 330, 5, 'soda', 11),
    DR('苏打水', 0, 0, 0, 0, 0, 500, 10, 'soda', 0),
    DR('气泡水', 0, 0, 0, 0, 0, 500, 5, 'soda', 0),
    DR('能量饮料', 45, 0, 11, 0, 0, 250, 100, 'soda', 10),
    DR('运动饮料', 25, 0, 6, 0, 0, 500, 30, 'soda', 6),
    DR('电解质水', 10, 0, 2.5, 0, 0, 500, 20, 'soda', 2),
    DR('汤力水', 35, 0, 9, 0, 0, 330, 10, 'soda', 9),
    DR('橙汁', 45, 0.7, 10, 0, 0, 350, 5, 'juice', 10),
    DR('苹果汁', 46, 0.1, 11.3, 0, 0, 350, 5, 'juice', 11),
    DR('葡萄汁', 60, 0.3, 15, 0, 0, 350, 5, 'juice', 15),
    DR('西瓜汁', 30, 0.5, 7, 0, 0, 350, 5, 'juice', 7),
    DR('芒果汁', 60, 0.4, 15, 0, 0, 350, 5, 'juice', 15),
    DR('桃汁', 50, 0.3, 12, 0, 0, 350, 5, 'juice', 12),
    DR('椰子水', 19, 0.2, 3.7, 0, 0, 350, 20, 'juice', 3),
    DR('番茄汁', 20, 0.8, 4, 0, 0, 350, 30, 'juice', 4),
    DR('混合果汁', 48, 0.4, 11.5, 0, 0, 350, 5, 'juice', 11),
    DR('石榴汁', 55, 0.3, 13, 0, 0, 350, 5, 'juice', 13),
    DR('蓝莓汁', 45, 0.3, 10, 0, 0, 350, 5, 'juice', 10),
    DR('甘蔗汁', 60, 0.2, 15, 0, 0, 350, 5, 'juice', 15),
    DR('纯牛奶', 54, 3, 4.8, 3.2, 0, 250, 50, 'milk', 4.8),
    DR('低脂牛奶', 42, 3.4, 4.5, 1.5, 0, 250, 50, 'milk', 4.5),
    DR('脱脂牛奶', 35, 3.4, 4.8, 0.2, 0, 250, 50, 'milk', 4.8),
    DR('豆浆', 31, 3, 1.2, 1.6, 0.5, 300, 10, 'milk', 1.2),
    DR('燕麦奶', 45, 1, 7, 1.5, 0, 250, 40, 'milk', 3),
    DR('杏仁奶', 30, 1, 3, 2, 0, 250, 30, 'milk', 2),
    DR('椰奶', 60, 1, 5, 5, 0, 250, 20, 'milk', 3),
    DR('酸奶', 72, 3.5, 9, 2.5, 0, 200, 60, 'milk', 6),
    DR('啤酒', 43, 0.5, 3.6, 0, 0, 500, 20, 'alcohol', 3),
    DR('白酒', 230, 0, 0, 0, 0, 50, 5, 'alcohol', 0),
    DR('红酒', 85, 0.1, 2.5, 0, 0, 150, 5, 'alcohol', 2),
    DR('黄酒', 130, 1, 10, 0, 0, 150, 10, 'alcohol', 8),
    DR('鸡尾酒', 120, 0.2, 15, 0, 0, 250, 10, 'alcohol', 10),
    DR('果酒', 90, 0.2, 10, 0, 0, 200, 5, 'alcohol', 8),
    DR('米酒', 100, 0.5, 12, 0, 0, 200, 5, 'alcohol', 10),
    DR('威士忌', 240, 0, 0, 0, 0, 50, 2, 'alcohol', 0),
    DR('白开水', 0, 0, 0, 0, 0, 500, 0, 'other', 0),
    DR('柠檬水', 2, 0, 0.5, 0, 0, 500, 5, 'other', 0),
    DR('蜂蜜水', 30, 0, 8, 0, 0, 500, 5, 'other', 8),
    DR('无糖茶', 0, 0, 0, 0, 0, 500, 5, 'other', 0),
    DR('冰红茶', 40, 0, 10, 0, 0, 500, 20, 'other', 10),
    DR('凉茶', 30, 0, 7, 0, 0, 500, 10, 'other', 7),
    DR('咖啡饮料', 45, 0.5, 10, 1, 0, 350, 30, 'other', 10),
    DR('奶茶饮料', 50, 1, 11, 1, 0, 500, 50, 'other', 10),
    DR('乳饮料', 55, 1, 10, 1, 0, 350, 50, 'other', 10),
    DR('果蔬汁', 40, 0.5, 9, 0, 0.5, 350, 10, 'other', 9),
    DR('龟苓膏饮品', 50, 1, 11, 0, 0, 300, 20, 'other', 10),
    DR('运动电解质水', 10, 0, 2.5, 0, 0, 500, 30, 'other', 2),
    DR('茉莉奶绿', 40, 1, 6, 1.5, 0, 500, 40, 'tea', 3),
    DR('桂花乌龙', 20, 0, 5, 0, 0, 500, 10, 'tea', 2),
    DR('生椰拿铁', 55, 1, 7, 3, 0, 450, 50, 'tea', 4),
    DR('厚乳拿铁', 70, 2, 8, 4, 0, 450, 60, 'tea', 4),
    DR('燕麦拿铁', 50, 1, 7, 2, 1, 450, 40, 'tea', 3),
    DR('椰云拿铁', 65, 1, 8, 3.5, 0, 450, 50, 'tea', 4),
    DR('黑糖珍珠奶茶', 60, 1, 11, 2, 0, 500, 60, 'tea', 5),
    DR('芋泥波波奶茶', 65, 1, 12, 2, 0, 500, 60, 'tea', 5),
    DR('多肉葡萄', 45, 0, 11, 0, 0.5, 500, 10, 'tea', 9),
    DR('杨枝甘露', 55, 1, 12, 1.5, 0.5, 500, 40, 'tea', 8),
    DR('满杯红柚', 40, 0, 10, 0, 0.5, 500, 10, 'tea', 8),
    DR('芝士奶盖茶', 60, 1, 7, 3.5, 0, 500, 50, 'tea', 5),
    DR('抹茶奶盖', 55, 1, 7, 3, 0, 500, 50, 'tea', 5),
    DR('可可奶盖', 65, 1, 8, 3.5, 0, 500, 50, 'tea', 6),
    DR('桂花酒酿奶茶', 60, 1, 10, 2, 0, 500, 40, 'tea', 6),
    DR('姜茶', 20, 0, 5, 0, 0, 500, 10, 'tea', 3),
    DR('红枣茶', 30, 0, 7, 0, 0, 500, 10, 'tea', 5),
    DR('桂圆茶', 30, 0, 7, 0, 0, 500, 10, 'tea', 5),
    DR('枸杞茶', 10, 0, 2, 0, 0, 500, 10, 'tea', 1),
    DR('洛神花茶', 25, 0, 6, 0, 0, 500, 10, 'tea', 4)
  ];

  const INSTANT_BASES = [
    ['红烧牛肉面', 470, 10, 60, 20, 2, 3, 18, 1800, 100],
    ['香辣牛肉面', 480, 10, 60, 21, 2, 4, 19, 1900, 100],
    ['老坛酸菜面', 450, 9, 58, 19, 2, 3, 17, 2000, 100],
    ['番茄鸡蛋面', 440, 10, 58, 17, 2, 5, 15, 1500, 100],
    ['鲜虾鱼板面', 430, 10, 57, 16, 2, 4, 14, 1700, 100],
    ['香菇炖鸡面', 440, 11, 56, 17, 2, 3, 15, 1600, 100],
    ['酸辣牛肉面', 470, 10, 59, 20, 2, 4, 18, 1900, 100],
    ['藤椒牛肉面', 480, 10, 60, 21, 2, 3, 19, 1900, 100],
    ['火鸡面', 500, 9, 60, 24, 2, 6, 22, 2000, 100],
    ['炸酱面', 460, 10, 60, 19, 2, 6, 17, 1700, 100],
    ['葱油拌面', 470, 9, 62, 20, 1, 5, 20, 1500, 100],
    ['麻酱拌面', 480, 10, 58, 22, 2, 4, 21, 1400, 100],
    ['螺蛳粉', 430, 9, 62, 16, 3, 3, 15, 2200, 100],
    ['酸辣粉', 420, 6, 65, 15, 2, 3, 14, 2000, 100],
    ['重庆小面', 450, 9, 60, 18, 2, 4, 16, 1800, 100],
    ['牛肉米粉', 440, 10, 62, 16, 2, 3, 14, 1700, 100],
    ['肥肠粉', 460, 10, 60, 19, 2, 3, 16, 1900, 100],
    ['热干面', 480, 10, 62, 21, 2, 5, 19, 1600, 100],
    ['油泼面', 470, 9, 65, 20, 2, 2, 19, 1500, 100],
    ['咖喱面', 460, 9, 60, 19, 2, 3, 16, 1500, 100]
  ];

  const FROZEN_BASES = [
    ['猪肉水饺', 220, 9, 28, 8, 1.5, 2, 5, 500, 100],
    ['韭菜鸡蛋水饺', 180, 7, 25, 6, 1.5, 2, 4, 400, 100],
    ['虾仁馄饨', 190, 9, 24, 7, 1, 2, 5, 500, 100],
    ['小笼包', 220, 8, 26, 10, 1, 3, 6, 600, 100],
    ['生煎包', 250, 8, 28, 13, 1, 4, 7, 700, 100],
    ['锅贴', 230, 8, 27, 11, 1, 4, 6, 600, 100],
    ['烧麦', 200, 7, 25, 8, 1, 3, 5, 500, 100],
    ['糯米鸡', 220, 8, 30, 8, 1, 3, 5, 600, 100],
    ['粽子', 210, 5, 35, 6, 1, 4, 4, 500, 100],
    ['汤圆', 300, 5, 50, 8, 1, 8, 3, 200, 100],
    ['春卷', 280, 6, 35, 12, 1, 6, 8, 600, 100],
    ['蛋饺', 190, 10, 10, 10, 0, 3, 6, 500, 100],
    ['鱼丸', 100, 12, 10, 2, 0, 2, 3, 600, 100],
    ['牛肉丸', 180, 15, 10, 9, 0, 3, 5, 700, 100],
    ['虾滑', 120, 15, 8, 2, 0, 2, 4, 600, 100],
    ['鸡米花', 280, 15, 20, 15, 1, 4, 8, 700, 100],
    ['鸡块', 250, 14, 20, 13, 1, 4, 7, 600, 100],
    ['鸡翅', 230, 18, 8, 15, 0, 3, 6, 600, 100],
    ['手抓饼', 320, 7, 40, 15, 1, 5, 8, 500, 100],
    ['葱油饼', 300, 6, 42, 13, 1, 5, 8, 500, 100],
    ['南瓜饼', 250, 4, 40, 10, 2, 10, 5, 300, 100],
    ['紫薯球', 220, 3, 45, 5, 2, 13, 4, 200, 100],
    ['鱼豆腐', 200, 12, 18, 10, 1, 6, 6, 700, 100],
    ['蟹棒', 180, 10, 20, 7, 1, 5, 4, 600, 100],
    ['油条', 390, 7, 50, 20, 1, 2, 10, 400, 100],
    ['麻花', 450, 8, 55, 22, 1, 7, 12, 300, 100],
    ['藕盒', 220, 7, 20, 12, 2, 5, 6, 400, 100],
    ['茄盒', 210, 6, 18, 13, 2, 5, 7, 400, 100],
    ['八宝饭', 300, 4, 55, 8, 2, 20, 5, 200, 100],
    ['发糕', 230, 5, 48, 3, 2, 7, 3, 200, 100]
  ];

  const GEN_METHODS = {
    '清炒': { oil: 8, salt: 1.2 },
    '蒜蓉': { oil: 8, salt: 1.2 },
    '蚝油': { oil: 8, salt: 1, soy: 5 },
    '白灼': { oil: 2, salt: 1, soy: 2 },
    '凉拌': { oil: 5, salt: 0.8, soy: 3 },
    '上汤': { oil: 4, salt: 1.2 },
    '红烧': { oil: 10, salt: 1.8, soy: 8, sugar: 6 },
    '干煸': { oil: 12, salt: 1.5, soy: 2 },
    '香辣': { oil: 12, salt: 1.5, soy: 3, sugar: 2 },
    '孜然': { oil: 10, salt: 1.5, soy: 1 },
    '烤': { oil: 5, salt: 1.2, soy: 3 },
    '酸辣': { oil: 8, salt: 1.5, sugar: 2, soy: 2 },
    '醋溜': { oil: 8, salt: 1.2, sugar: 3, soy: 2 },
    '咖喱': { oil: 6, salt: 1.2, curry: 20 },
    '番茄': { oil: 8, salt: 1.2, tomato: 100 },
    '蒜香': { oil: 10, salt: 1.4, soy: 2 },
    '黑椒': { oil: 8, salt: 1.3, soy: 4 },
    '清蒸': { oil: 2, salt: 1.2, soy: 3 },
    '香煎': { oil: 8, salt: 1.2, soy: 2 },
    '椒盐': { oil: 12, salt: 2 },
    '炖': { oil: 6, salt: 1.8, soy: 6 }
  };

  function methodComps(baseKey, grams, method, extra) {
    const m = GEN_METHODS[method] || GEN_METHODS['清炒'];
    const c = [[baseKey, grams], ['植物油', m.oil], ['盐', m.salt]];
    if (m.soy) c.push(['酱油', m.soy]);
    if (m.sugar) c.push(['白砂糖', m.sugar]);
    if (m.curry) c.push(['咖喱块', m.curry]);
    if (m.tomato) c.push(['番茄', m.tomato]);
    return c.concat(extra || []);
  }

  const GEN_VEG_GROUPS = [
    { m: ['清炒', '蒜蓉', '蚝油', '白灼', '凉拌', '上汤'], items: ['青菜', '菠菜', '生菜', '油麦菜', '空心菜', '白菜', '紫甘蓝', '韭菜', '芹菜', '蒜苔'], g: 250 },
    { m: ['清炒', '红烧', '干煸', '香辣', '孜然', '凉拌', '烤'], items: ['土豆', '茄子', '豆角', '青椒', '胡萝卜', '冬瓜', '南瓜', '山药', '莲藕', '玉米', '西葫芦', '秋葵', '芦笋', '荷兰豆', '花菜', '西兰花', '白萝卜', '海带'], g: 200 },
    { m: ['清炒', '蒜蓉', '凉拌', '烤'], items: ['黄瓜', '苦瓜', '丝瓜', '番茄', '洋葱'], g: 200 },
    { m: ['清炒', '蚝油', '蒜蓉', '红烧', '干煸'], items: ['蘑菇', '木耳', '豆芽'], g: 200 },
    { m: ['清炒', '蒜蓉', '酸辣', '醋溜', '咖喱', '凉拌'], items: ['土豆', '莲藕', '山药', '花菜', '西兰花', '豆角', '茄子', '蘑菇', '木耳', '豆芽', '西葫芦', '胡萝卜'], g: 200 }
  ];

  const GEN_PROTEINS = [
    { k: '鸡胸', d: '鸡丁', g: 140, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '鱼香', '宫保', '水煮', '香煎', '烤'] },
    { k: '鸡腿肉', d: '鸡块', g: 150, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '宫保', '水煮', '烤'] },
    { k: '猪里脊', d: '肉丝', g: 120, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '鱼香', '水煮'] },
    { k: '牛肉', d: '牛柳', g: 120, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '水煮', '香煎', '烤'] },
    { k: '虾仁', d: '虾仁', g: 120, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '水煮', '清蒸'] },
    { k: '鲈鱼', d: '鱼片', g: 150, m: ['红烧', '香辣', '咖喱', '蒜香', '椒盐', '糖醋', '水煮', '清蒸', '香煎', '烤'] },
    { k: '豆腐', d: '豆腐', g: 200, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '鱼香', '宫保', '水煮', '清蒸', '香煎'] },
    { k: '鸡蛋', d: '鸡蛋', g: 120, m: ['青椒炒', '洋葱炒', '番茄', '香辣', '咖喱', '蒜香', '椒盐', '糖醋', '鱼香'] },
    { k: '五花肉', d: '五花肉', g: 120, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '蒜香', '椒盐', '糖醋', '烤'] },
    { k: '排骨', d: '排骨', g: 180, m: ['红烧', '香辣', '孜然', '蒜香', '椒盐', '糖醋', '烤', '炖'] },
    { k: '豆干', d: '豆干', g: 120, m: ['青椒炒', '洋葱炒', '红烧', '香辣', '孜然', '黑椒', '咖喱', '蒜香', '椒盐', '糖醋', '鱼香', '宫保'] }
  ];

  const GEN_PROTEIN_EXTRAS = {
    '青椒炒': [['青椒', 100]],
    '洋葱炒': [['洋葱', 80]],
    '红烧': [['白砂糖', 5]],
    '香辣': [['青椒', 50]],
    '孜然': [['洋葱', 40]],
    '黑椒': [['洋葱', 50]],
    '咖喱': [['土豆', 80]],
    '鱼香': [['木耳', 20], ['胡萝卜', 30]],
    '宫保': [['花生', 25], ['黄瓜', 50]],
    '水煮': [['豆芽', 100]],
    '糖醋': [['淀粉', 20]]
  };

  const GEN_PAIR_VEGS = ['土豆', '茄子', '豆角', '青椒', '番茄', '洋葱', '胡萝卜', '冬瓜', '南瓜', '山药', '莲藕', '玉米', '西葫芦', '秋葵', '芦笋', '荷兰豆', '花菜', '西兰花', '白萝卜', '海带', '紫甘蓝', '蘑菇', '木耳', '豆芽', '黄瓜', '苦瓜', '丝瓜'];

  const RICE_TOPPINGS = [
    ['番茄鸡蛋', [['番茄', 150], ['鸡蛋', 100], ['植物油', 6]]],
    ['青椒肉丝', [['青椒', 100], ['猪里脊', 90], ['植物油', 6]]],
    ['鱼香肉丝', [['猪里脊', 90], ['木耳', 20], ['胡萝卜', 30], ['植物油', 8], ['白砂糖', 5]]],
    ['宫保鸡丁', [['鸡胸', 100], ['花生', 20], ['黄瓜', 40], ['植物油', 8], ['白砂糖', 3]]],
    ['红烧肉', [['五花肉', 100], ['植物油', 5], ['白砂糖', 4]]],
    ['红烧牛肉', [['牛肉', 100], ['植物油', 6], ['白砂糖', 3]]],
    ['土豆牛肉', [['牛肉', 90], ['土豆', 100], ['植物油', 6]]],
    ['咖喱鸡', [['鸡腿肉', 100], ['土豆', 80], ['咖喱块', 20], ['植物油', 5]]],
    ['黄焖鸡', [['鸡腿肉', 120], ['土豆', 80], ['植物油', 8]]],
    ['香菇鸡', [['鸡腿肉', 100], ['蘑菇', 80], ['植物油', 6]]],
    ['麻婆豆腐', [['豆腐', 150], ['牛肉末', 25], ['植物油', 8]]],
    ['回锅肉', [['五花肉', 90], ['青椒', 80], ['植物油', 6]]],
    ['鱼香茄子', [['茄子', 150], ['猪肉馅', 50], ['植物油', 10], ['白砂糖', 5]]],
    ['肉末茄子', [['茄子', 150], ['猪肉馅', 60], ['植物油', 10]]],
    ['虾仁滑蛋', [['虾仁', 80], ['鸡蛋', 100], ['植物油', 6]]],
    ['照烧鸡', [['鸡腿肉', 120], ['酱油', 10], ['白砂糖', 8]]],
    ['黑椒牛柳', [['牛肉', 100], ['洋葱', 50], ['植物油', 6]]],
    ['番茄牛腩', [['牛肉', 100], ['番茄', 150], ['植物油', 6]]],
    ['木须肉', [['猪里脊', 80], ['鸡蛋', 80], ['木耳', 30], ['黄瓜', 50], ['植物油', 8]]],
    ['尖椒肉丝', [['青椒', 100], ['猪里脊', 90], ['植物油', 8]]]
  ];

  const RICE_STYLES = [
    ['盖饭', 250, 1], ['拌饭', 250, 1], ['炒饭', 250, 0.8], ['烩饭', 250, 0.9],
    ['煲仔饭', 250, 0.9], ['便当', 200, 1]
  ];

  const NOODLE_STYLES = [
    ['汤面', 250, 1], ['拌面', 250, 1], ['炒面', 250, 0.8], ['盖面', 250, 1],
    ['凉面', 250, 1], ['米线', 250, 1], ['河粉', 250, 1], ['乌冬面', 250, 1],
    ['意面', 250, 1], ['烩面', 250, 1]
  ];

  const NOODLE_TOPPINGS = RICE_TOPPINGS.concat([
    ['炸酱', [['猪肉馅', 60], ['植物油', 6], ['白砂糖', 3]]],
    ['雪菜肉丝', [['青菜', 100], ['猪里脊', 80], ['植物油', 6]]],
    ['大排', [['猪里脊', 120], ['植物油', 5]]],
    ['三鲜', [['虾仁', 50], ['鸡蛋', 50], ['猪里脊', 50], ['植物油', 5]]],
    ['鸡丝', [['鸡胸', 100], ['植物油', 4]]],
    ['酸辣', [['青菜', 100], ['豆腐', 50], ['植物油', 6]]],
    ['麻辣', [['牛肉', 80], ['豆芽', 80], ['植物油', 8]]],
    ['葱油', [['青菜', 50], ['植物油', 10], ['酱油', 8]]],
    ['麻酱', [['青菜', 50], ['植物油', 5], ['酱油', 5]]],
    ['海鲜', [['虾仁', 60], ['鲈鱼', 60], ['植物油', 5]]]
  ]);

  const SOUP_ITEMS = [
    ['番茄鸡蛋汤', [['番茄', 150], ['鸡蛋', 60], ['植物油', 3], ['盐', 1.5]]],
    ['紫菜蛋花汤', [['紫菜', 5], ['鸡蛋', 50], ['植物油', 2], ['盐', 1.2]]],
    ['冬瓜排骨汤', [['冬瓜', 200], ['排骨', 100], ['盐', 2], ['植物油', 2]]],
    ['萝卜排骨汤', [['白萝卜', 150], ['排骨', 100], ['盐', 2], ['植物油', 2]]],
    ['玉米排骨汤', [['玉米', 150], ['排骨', 100], ['盐', 2]]],
    ['海带排骨汤', [['海带', 100], ['排骨', 100], ['盐', 2]]],
    ['山药排骨汤', [['山药', 150], ['排骨', 100], ['盐', 2]]],
    ['莲藕排骨汤', [['莲藕', 150], ['排骨', 100], ['盐', 2]]],
    ['香菇鸡汤', [['蘑菇', 80], ['鸡腿肉', 120], ['盐', 2]]],
    ['冬瓜丸子汤', [['冬瓜', 150], ['猪肉馅', 80], ['盐', 2]]],
    ['白菜豆腐汤', [['白菜', 150], ['豆腐', 100], ['盐', 1.5]]],
    ['鲫鱼豆腐汤', [['鲈鱼', 150], ['豆腐', 100], ['盐', 2], ['植物油', 3]]],
    ['酸辣汤', [['豆腐', 80], ['木耳', 30], ['鸡蛋', 50], ['盐', 2]]],
    ['番茄牛腩汤', [['番茄', 150], ['牛肉', 100], ['盐', 2]]],
    ['罗宋汤', [['番茄', 150], ['牛肉', 80], ['土豆', 100], ['盐', 2]]],
    ['南瓜浓汤', [['南瓜', 250], ['牛奶', 100], ['盐', 1]]],
    ['玉米羹', [['玉米', 150], ['鸡蛋', 50], ['盐', 1.2]]],
    ['西湖牛肉羹', [['牛肉', 60], ['豆腐', 80], ['鸡蛋', 40], ['盐', 1.5]]],
    ['银耳莲子羹', [['银耳', 30], ['莲子', 30], ['白砂糖', 15]]],
    ['绿豆汤', [['绿豆', 50], ['白砂糖', 15]]],
    ['红豆汤', [['红豆', 50], ['白砂糖', 15]]],
    ['冬瓜薏米汤', [['冬瓜', 200], ['薏米', 30], ['盐', 1]]],
    ['丝瓜蛋汤', [['丝瓜', 200], ['鸡蛋', 50], ['盐', 1.5]]],
    ['菠菜猪肝汤', [['菠菜', 150], ['猪肝', 50], ['盐', 1.5]]],
    ['菌菇汤', [['蘑菇', 150], ['盐', 1.5]]],
    ['味噌汤', [['豆腐', 80], ['海带', 30], ['盐', 2]]],
    ['蛋花汤', [['鸡蛋', 60], ['盐', 1.2]]],
    ['萝卜牛腩汤', [['白萝卜', 150], ['牛肉', 100], ['盐', 2]]],
    ['莲藕花生汤', [['莲藕', 150], ['花生', 30], ['盐', 2]]],
    ['山药鸡汤', [['山药', 150], ['鸡腿肉', 120], ['盐', 2]]]
  ];

  const EXTRA_DISH_NAMES = `回锅肉 鱼香肉丝 宫保鸡丁 麻婆豆腐 水煮牛肉 水煮肉片 辣子鸡 口水鸡 白切鸡 烧鹅 叉烧 虾饺 干蒸烧卖 肠粉 煲仔饭 佛跳墙 沙茶面 土笋冻 蚵仔煎 卤肉饭 台湾牛肉面 肉夹馍 羊肉泡馍 凉皮 螺蛳粉 老友粉 过桥米线 汽锅鸡 酸汤鱼 丝娃娃 烤全羊 大盘鸡 手抓饭 馕 锅包肉 溜肉段 猪肉炖粉条 小鸡炖蘑菇 杀猪菜 葱烧海参 九转大肠 糖醋鲤鱼 德州扒鸡 煎饼果子 驴肉火烧 狗不理包子 天津麻花 耳朵眼炸糕 北京烤鸭 京酱肉丝 炸酱面 卤煮火烧 炒肝 爆肚 豆汁 焦圈 涮羊肉 羊蝎子 香河肉饼 驴打滚 豌豆黄 艾窝窝 糖火烧 褡裢火烧 炒疙瘩 麻豆腐 芥末墩 乾隆白菜 宫保虾球 油焖大虾 糖醋排骨 可乐鸡翅 红烧鸡翅 黄焖鸡 三杯鸡 大盘鸡 辣子鸡丁 宫保鸡丁 鱼香茄子 肉末茄子 干煸豆角 干锅花菜 干锅土豆片 干锅千页豆腐 麻辣香锅 冒菜 钵钵鸡 串串香 冷锅串串 酸菜鱼 水煮鱼 烤鱼 纸包鱼 松鼠鳜鱼 清蒸鲈鱼 红烧带鱼 糖醋带鱼 干烧黄鱼 香煎黄花鱼 椒盐小黄鱼 剁椒鱼头 双椒鱼头 鱼头豆腐汤 酸汤肥牛 番茄牛腩 土豆烧牛肉 萝卜炖牛腩 咖喱牛肉 黑椒牛柳 蚝油牛肉 葱爆牛肉 孜然牛肉 水煮牛肉 小炒黄牛肉 芹菜炒牛肉 洋葱炒牛肉 青椒炒肉 农家小炒肉 辣椒炒肉 回锅肉 盐煎肉 蒜泥白肉 梅菜扣肉 粉蒸肉 东坡肉 红烧肉 把子肉 狮子头 四喜丸子 珍珠丸子 糯米丸子 糖醋里脊 锅包肉 溜肉段 京酱肉丝 鱼香肉丝 青椒肉丝 蒜苔肉丝 芹菜肉丝 榨菜肉丝 木耳肉片 木须肉 滑溜肉片 水煮肉片 咕咾肉 菠萝咕咾肉 糖醋排骨 红烧排骨 蒜香排骨 椒盐排骨 烤排骨 排骨炖豆角 排骨炖土豆 排骨炖玉米 排骨炖莲藕 排骨炖冬瓜 排骨炖萝卜 排骨炖海带 排骨炖山药 红烧猪蹄 黄豆炖猪蹄 卤猪蹄 酱猪蹄 卤猪耳 卤猪舌 卤肥肠 肥肠粉 肥肠面 干煸肥肠 爆炒肥肠 毛血旺 鸭血粉丝汤 盐水鸭 板鸭 酱鸭 啤酒鸭 老鸭汤 酸萝卜老鸭汤 虫草花鸡汤 花胶鸡汤 椰子鸡 猪肚鸡 白切鸡 盐焗鸡 豉油鸡 葱油鸡 手撕鸡 口水鸡 椒麻鸡 大盘鸡 新疆椒麻鸡 黄焖鸡米饭 三杯鸡 香菇滑鸡 滑蛋牛肉 番茄炒蛋 韭菜炒蛋 苦瓜炒蛋 青椒炒蛋 洋葱炒蛋 木耳炒蛋 虾仁滑蛋 蒸蛋羹 肉末蒸蛋 蛤蜊蒸蛋 茶叶蛋 卤蛋 虎皮蛋 溏心蛋 煎蛋 荷包蛋 炒鸡蛋 鸡蛋羹 蛋花汤 紫菜蛋花汤 番茄鸡蛋汤 丝瓜蛋汤 菠菜蛋汤 豆腐蛋汤 白菜豆腐汤 味噌汤 罗宋汤 奶油蘑菇汤 南瓜浓汤 玉米浓汤 土豆浓汤 花菜浓汤 番茄浓汤 海鲜汤 蛤蜊汤 虾仁豆腐汤 鱼头豆腐汤 鲫鱼豆腐汤 萝卜丝鲫鱼汤 冬瓜丸子汤 白菜丸子汤 番茄丸子汤 豆腐丸子汤 珍珠丸子 糯米丸子 四喜丸子 狮子头 红烧狮子头 清蒸狮子头 蟹粉狮子头 糖醋藕盒 炸藕盒 炸茄盒 炸春卷 炸丸子 炸酥肉 炸鸡翅 炸鸡腿 炸鸡排 炸猪排 炸虾 炸鱿鱼圈 炸蘑菇 炸茄盒 炸藕盒 炸豆腐 炸鲜奶 炸冰淇淋 炸串 烤串 羊肉串 牛肉串 鸡肉串 烤鸡翅 烤鸡腿 烤鸡爪 烤韭菜 烤茄子 烤蘑菇 烤玉米 烤红薯 烤土豆 烤鱼 烤肉 韩式烤肉 日式烤肉 铁板烧 章鱼小丸子 大阪烧 文字烧 鲷鱼烧 鸡蛋仔 华夫饼 可颂 甜甜圈 贝果 吐司 三明治 帕尼尼 汉堡 牛肉汉堡 鸡肉汉堡 鱼汉堡 素食汉堡 热狗 披萨 意面 通心粉 千层面 焗饭 焗意面 蛋包饭 咖喱饭 牛肉饭 照烧鸡饭 鳗鱼饭 天妇罗饭 寿司 刺身 饭团 茶泡饭 亲子丼 牛丼 猪排饭 鸡排饭 卤肉饭 肉燥饭 煲仔饭 腊味煲仔饭 排骨煲仔饭 滑鸡煲仔饭 黄鳝煲仔饭 田鸡煲仔饭 咸鱼鸡粒炒饭 扬州炒饭 蛋炒饭 酱油炒饭 咖喱炒饭 菠萝炒饭 虾仁炒饭 牛肉炒饭 腊肠炒饭 菜心炒饭 瑶柱蛋白炒饭 福建炒饭 印尼炒饭 泰式炒饭 韩式泡菜炒饭 石锅拌饭 韩式拌饭 紫菜包饭 辣白菜 韩式炸鸡 部队锅 年糕 炒年糕 辣炒年糕 冷面 韩式冷面 荞麦冷面 炸酱面 海鲜面 乌冬面 咖喱乌冬 天妇罗乌冬 味噌拉面 豚骨拉面 酱油拉面 盐味拉面 札幌拉面 博多拉面 担担面 重庆小面 宜宾燃面 甜水面 鸡丝凉面 麻酱凉面 葱油拌面 阳春面 大排面 焖肉面 爆鱼面 三虾面 蟹粉面 鳝丝面 雪菜肉丝面 大肉面 牛肉面 兰州拉面 河南烩面 山西刀削面 陕西油泼面 岐山臊子面 武汉热干面 桂林米粉 柳州螺蛳粉 云南过桥米线 小锅米线 贵州酸汤粉 遵义羊肉粉 花溪牛肉粉 南宁老友粉 广州肠粉 潮汕粿条 沙县拌面 沙县扁肉 福建鱼丸 福州鱼丸 温州瘦肉丸 宁波汤圆 上海小笼包 南翔小笼 生煎包 锅贴 烧麦 灌汤包 叉烧包 奶黄包 豆沙包 莲蓉包 菜包 肉包 花卷 馒头 红糖馒头 全麦馒头 玉米馒头 大饼 烧饼 芝麻烧饼 葱油饼 手抓饼 鸡蛋灌饼 煎饼果子 肉夹馍 驴肉火烧 牛肉饼 韭菜盒子 锅盔 馕 烤包子 生煎 小笼 蒸饺 水饺 煎饺 馄饨 抄手 云吞 龙抄手 钟水饺 红油抄手 酸汤水饺 冰花煎饺 锅贴 春卷 蛋饺 豆腐脑 油条 麻花 糖油粑粑 糖葫芦 炒栗子 煮玉米 烤红薯 米糕 发糕 马拉糕 萝卜糕 芋头糕 马蹄糕 绿豆糕 红豆糕 驴打滚 豌豆黄 芸豆卷 枣泥糕 桂花糕 重阳糕 月饼 广式月饼 苏式月饼 五仁月饼 蛋黄酥 凤梨酥 老婆饼 老公饼 桃酥 核桃酥 杏仁酥 花生酥 芝麻酥 蛋卷 沙琪玛 米花糖 芝麻糖 花生糖 牛轧糖 棉花糖 太妃糖 巧克力 黑巧克力 牛奶巧克力 白巧克力 棒棒糖 软糖 硬糖 果冻 布丁 双皮奶 龟苓膏 杨枝甘露 芋圆 烧仙草 芒果班戟 雪媚娘 麻薯 大福 泡芙 闪电泡芙 蛋挞 葡式蛋挞 芝士蛋糕 慕斯蛋糕 提拉米苏 黑森林蛋糕 红丝绒蛋糕 戚风蛋糕 海绵蛋糕 瑞士卷 肉松小贝 甜甜圈 马卡龙 布朗尼 华夫饼 铜锣烧 鲷鱼烧 车轮饼 红豆饼 绿豆饼 老婆饼 蛋黄派 巧克力派 瑞士卷 面包 吐司 全麦面包 欧包 法棍 可颂 丹麦面包 菠萝包 奶黄包 肉松卷 贝果 汉堡胚 三明治 热狗 披萨 薯条 薯片 薯饼 鸡块 鸡翅 鸡米花 鸡排 洋葱圈 蛋挞 可乐 雪碧 芬达 奶茶 珍珠奶茶 水果茶 柠檬茶 绿茶 红茶 乌龙茶 普洱 花茶 咖啡 美式 拿铁 卡布奇诺 摩卡 焦糖玛奇朵 澳白 冷萃 浓缩 豆奶 豆浆 牛奶 酸奶 燕麦奶 椰奶 杏仁奶 橙汁 苹果汁 葡萄汁 西瓜汁 椰子水 番茄汁 酸梅汤 凉茶 王老吉 加多宝 元气森林 气泡水 苏打水 矿泉水 纯净水 啤酒 白酒 红酒 黄酒 米酒 果酒 鸡尾酒 威士忌`.split(/\s+/);

  function buildDishCatalog() {
    if (DISH_CATALOG) return DISH_CATALOG;
    const out = [];
    const seen = new Set();
    const add = (name, comps, cat, note, opts) => {
      const key = normDish(name);
      if (!key || seen.has(key)) return;
      const t = compTotals(comps);
      if (!t.grams) return;
      out.push({ n: name, a: (opts && opts.a) || [], c: comps, grams: t.grams, k: t.kcal, p: t.p, c2: t.c, f: t.f, fib: t.fib, oil: t.control ? t.control.oil : 0, cat: cat || 'home', note: note || '', pop: (opts && opts.pop) || 0, conf: (opts && opts.conf) || 'mid', control: t.control });
      seen.add(key);
    };
    const addServe = (name, serve, cat, note, opts) => {
      const key = normDish(name);
      if (!key || seen.has(key)) return;
      out.push({
        n: name, a: (opts && opts.a) || [], serve: serve, grams: serve.grams, k: Math.round(serve.kcal), cat: cat || 'snack', note: note || '',
        pop: (opts && opts.pop) || 0, conf: 'mid',
        control: { sugar: round1(serve.sugar || 0), oil: round1(serve.oil || 0), salt: round1((serve.na || 0) / 400), sodium: Math.round(serve.na || 0) }
      });
      seen.add(key);
    };

    DISH_DB.forEach(d => {
      let comps = d.c.slice();
      if (!/酸奶|苹果|香蕉|牛奶|豆浆|可乐|奶茶|拿铁|白粥|烤红薯|玉米|燕麦粥|水果/.test(d.n) && !comps.some(x => x[0] === '盐')) {
        comps.push(['盐', 1.5]);
      }
      add(d.n, comps, catOfDishName(d.n), d.note, { a: d.a, pop: 8, conf: 'high' });
    });

    GEN_VEG_GROUPS.forEach(g => {
      g.items.forEach(item => {
        g.m.forEach(method => {
          const name = method + item;
          add(name, methodComps(item, g.g, method), 'home', '家常' + method + '，按 200–250g 可食部估', { pop: 3, a: method === '清炒' && item === '土豆' ? ['土豆丝'] : [] });
        });
      });
    });

    GEN_PROTEINS.forEach(p => {
      p.m.forEach(method => {
        const extra = (GEN_PROTEIN_EXTRAS[method] || []).map(x => [x[0], x[1]]);
        add(method + p.d, methodComps(p.k, p.g, method, extra), 'home', '按 ' + p.g + 'g ' + DISH_ING[p.k].n + ' + 家常' + method, { pop: 4 });
      });
    });

    GEN_PAIR_VEGS.forEach(v => {
      GEN_PROTEINS.forEach(p => {
        if (['青菜', '菠菜', '生菜', '油麦菜', '空心菜', '白菜', '韭菜', '芹菜', '蒜苔'].indexOf(v) >= 0 && ['猪里脊', '鸡胸', '虾仁', '豆干'].indexOf(p.k) < 0) return;
        add(v + '炒' + p.d, [[v, 120], [p.k, 100], ['植物油', 8], ['盐', 1.2], ['酱油', 3]], 'home', '家常小炒，按 ' + v + ' 120g + ' + p.d + ' 100g', { pop: 2 });
        if (['土豆', '冬瓜', '南瓜', '山药', '莲藕', '玉米', '白萝卜', '海带', '茄子', '豆角', '胡萝卜', '蘑菇', '木耳'].indexOf(v) >= 0) {
          add(v + '烧' + p.d, [[v, 150], [p.k, 100], ['植物油', 7], ['盐', 1.5], ['酱油', 5], ['白砂糖', 3]], 'home', '家常烧菜，按 ' + v + ' 150g + ' + p.d + ' 100g', { pop: 2 });
          add(v + '炖' + p.d, [[v, 200], [p.k, 100], ['植物油', 3], ['盐', 1.8], ['酱油', 4]], 'home', '炖菜，按 ' + v + ' 200g + ' + p.d + ' 100g', { pop: 2 });
        }
      });
    });

    RICE_TOPPINGS.forEach(tp => {
      RICE_STYLES.forEach(st => {
        const comps = [['米饭', st[1]]].concat(tp[1].map(x => [x[0], Math.round(x[1] * st[2])]), [['盐', 1], ['酱油', 2]]);
        add(tp[0] + st[0], comps, 'staple', st[0] + '，含米饭 ' + st[1] + 'g', { pop: 4 });
      });
    });

    NOODLE_TOPPINGS.forEach(tp => {
      NOODLE_STYLES.forEach(st => {
        const base = st[0] === '米线' || st[0] === '河粉' ? '米粉' : '面条';
        const comps = [[base, st[1]]].concat(tp[1].map(x => [x[0], Math.round(x[1] * st[2])]), [['盐', 1.2], ['酱油', 3]]);
        add(tp[0] + st[0], comps, 'staple', st[0] + '，含' + base + ' ' + st[1] + 'g', { pop: 3 });
      });
    });

    SOUP_ITEMS.forEach(s => add(s[0], s[1], 'soup', '一碗汤的常规配料', { pop: 3 }));

    ['白粥', '小米粥', '南瓜粥', '红薯粥', '八宝粥', '绿豆粥', '红豆粥', '燕麦粥', '玉米粥', '紫米粥', '山药粥', '瘦肉粥', '皮蛋瘦肉粥', '海鲜粥', '蔬菜粥', '香菇鸡肉粥', '排骨粥', '鱼片粥', '虾仁粥', '红枣桂圆粥'].forEach((n, i) => {
      const base = i < 10 ? 150 : 180;
      const comps = [['米饭', base], ['盐', 0.5]];
      add(n, comps, 'soup', '一碗粥约 ' + base + 'g 熟饭', { pop: 3 });
    });

    [['白米饭', [['米饭', 250]]], ['糙米饭', [['米饭', 250]]], ['杂粮饭', [['米饭', 250]]], ['藜麦饭', [['米饭', 250]]],
      ['紫米饭', [['米饭', 250]]], ['红豆饭', [['米饭', 250], ['红豆', 20]]], ['绿豆饭', [['米饭', 250], ['绿豆', 20]]],
      ['糯米饭', [['米饭', 250]]], ['寿司', [['米饭', 200], ['三文鱼', 40], ['海苔', 10]]], ['饭团', [['米饭', 200], ['海苔', 10]]],
      ['蛋炒饭', [['米饭', 250], ['鸡蛋', 100], ['植物油', 10]]], ['扬州炒饭', [['米饭', 250], ['鸡蛋', 80], ['虾仁', 40], ['火腿', 30], ['植物油', 10]]],
      ['酱油炒饭', [['米饭', 250], ['鸡蛋', 80], ['酱油', 10], ['植物油', 10]]], ['咖喱炒饭', [['米饭', 250], ['鸡蛋', 80], ['咖喱块', 20], ['植物油', 8]]],
      ['菠萝炒饭', [['米饭', 250], ['鸡蛋', 80], ['虾仁', 40], ['植物油', 8]]], ['腊肠炒饭', [['米饭', 250], ['火腿', 40], ['鸡蛋', 60], ['植物油', 8]]],
      ['牛肉炒饭', [['米饭', 250], ['牛肉', 80], ['鸡蛋', 60], ['植物油', 8]]], ['虾仁炒饭', [['米饭', 250], ['虾仁', 80], ['鸡蛋', 60], ['植物油', 8]]],
      ['石锅拌饭', [['米饭', 250], ['牛肉', 80], ['鸡蛋', 60], ['青菜', 100], ['植物油', 8]]], ['韩式拌饭', [['米饭', 250], ['牛肉', 80], ['鸡蛋', 60], ['青菜', 100], ['植物油', 8]]],
      ['卤肉饭', [['米饭', 250], ['五花肉', 100], ['酱油', 10], ['白砂糖', 5]]], ['肉燥饭', [['米饭', 250], ['猪肉馅', 80], ['酱油', 8]]],
      ['牛肉盖饭', [['米饭', 250], ['牛肉', 100], ['洋葱', 50], ['植物油', 6]]], ['照烧鸡饭', [['米饭', 250], ['鸡腿肉', 120], ['酱油', 10], ['白砂糖', 6]]],
      ['鳗鱼饭', [['米饭', 250], ['鲈鱼', 100], ['酱油', 8], ['白砂糖', 5]]], ['咖喱鸡饭', [['米饭', 250], ['鸡腿肉', 100], ['土豆', 80], ['咖喱块', 20]]],
      ['黄焖鸡米饭', [['米饭', 250], ['鸡腿肉', 120], ['土豆', 80], ['植物油', 6]]], ['排骨煲仔饭', [['米饭', 250], ['排骨', 100], ['植物油', 5]]],
      ['腊味煲仔饭', [['米饭', 250], ['火腿', 60], ['植物油', 5]]], ['滑鸡煲仔饭', [['米饭', 250], ['鸡腿肉', 100], ['植物油', 5]]]
    ].forEach(d => add(d[0], d[1], 'staple', '常见主食', { pop: 5 }));

    const dumplingFillings = [
      ['猪肉白菜', [['猪肉馅', 60], ['白菜', 80]]], ['猪肉韭菜', [['猪肉馅', 60], ['韭菜', 60]]],
      ['猪肉芹菜', [['猪肉馅', 60], ['芹菜', 60]]], ['猪肉香菇', [['猪肉馅', 60], ['蘑菇', 50]]],
      ['牛肉大葱', [['牛肉', 60], ['洋葱', 40]]], ['羊肉胡萝卜', [['牛肉', 60], ['胡萝卜', 50]]],
      ['三鲜', [['虾仁', 30], ['猪肉馅', 40], ['韭菜', 50]]], ['虾仁韭菜', [['虾仁', 50], ['韭菜', 60]]],
      ['鸡肉香菇', [['鸡胸', 60], ['蘑菇', 50]]], ['素三鲜', [['鸡蛋', 50], ['韭菜', 60], ['豆腐', 40]]],
      ['酸菜猪肉', [['猪肉馅', 60], ['白菜', 80]]], ['玉米猪肉', [['猪肉馅', 60], ['玉米', 50]]]
    ];
    const dumplingForms = ['水饺', '蒸饺', '煎饺', '馄饨', '锅贴'];
    dumplingFillings.forEach(f => dumplingForms.forEach(form => {
      add(f[0] + form, [['面粉', 100]].concat(f[1], [['植物油', form === '煎饺' || form === '锅贴' ? 6 : 2], ['盐', 1]]), 'staple', '约 10 个' + form, { pop: 4 });
    }));
    ['鲜肉包', '酱肉包', '菜包', '豆沙包', '奶黄包', '叉烧包', '小笼包', '生煎包', '灌汤包', '花卷', '馒头', '烧麦', '糯米鸡'].forEach(n => {
      const comps = n.indexOf('豆沙') >= 0 || n.indexOf('奶黄') >= 0
        ? [['面粉', 80], ['白砂糖', 20], ['植物油', 5]]
        : [['面粉', 80], ['猪肉馅', 50], ['植物油', 3], ['盐', 1]];
      add(n, comps, 'breakfast', '常见早餐面点', { pop: 3 });
    });

    ['油条', '煎饼果子', '手抓饼', '鸡蛋灌饼', '葱油饼', '烧饼', '鸡蛋饼', '茶叶蛋', '水煮蛋', '蒸蛋', '豆腐脑', '豆浆', '牛奶', '燕麦粥', '小米粥', '白粥', '皮蛋瘦肉粥', '胡辣汤', '小笼包', '生煎包', '锅贴', '馄饨', '肠粉', '热干面', '牛肉面', '三明治', '贝果', '吐司', '华夫饼', '煎蛋', '培根', '火腿', '酸奶', '水果燕麦', '牛奶燕麦'].forEach(n => {
      const comps = n.indexOf('油条') >= 0 ? [['面粉', 60], ['植物油', 15]]
        : n.indexOf('煎饼') >= 0 ? [['面粉', 80], ['鸡蛋', 50], ['植物油', 8]]
          : n.indexOf('手抓饼') >= 0 ? [['面粉', 80], ['植物油', 10]]
            : n.indexOf('蛋') >= 0 ? [['鸡蛋', 100], ['植物油', 3]]
              : n.indexOf('豆浆') >= 0 ? [['豆浆', 300]]
                : n.indexOf('牛奶') >= 0 ? [['牛奶', 250]]
                  : n.indexOf('粥') >= 0 ? [['米饭', 150]]
                    : [['面粉', 80], ['植物油', 5]];
      add(n, comps, 'breakfast', '常见早餐，按常规份量估', { pop: 4 });
    });

    const saladItems = ['鸡胸沙拉', '牛肉沙拉', '虾仁沙拉', '金枪鱼沙拉', '鸡蛋沙拉', '豆腐沙拉', '藜麦沙拉', '蔬菜沙拉', '水果沙拉', '凯撒沙拉', '希腊沙拉', '土豆沙拉', '南瓜沙拉', '西兰花沙拉', '菠菜沙拉', '生菜沙拉', '紫甘蓝沙拉', '玉米沙拉', '鹰嘴豆沙拉', '混合豆沙拉'];
    const dressings = [['油醋汁', [['植物油', 10]]], ['沙拉酱', [['植物油', 15], ['白砂糖', 3]]], ['酸奶酱', [['酸奶', 30]]], ['芝麻酱', [['植物油', 12], ['白砂糖', 2]]]];
    saladItems.forEach(s => dressings.forEach(d => {
      const main = s.indexOf('鸡胸') >= 0 ? [['鸡胸', 100]] : s.indexOf('牛肉') >= 0 ? [['牛肉', 100]] : s.indexOf('虾仁') >= 0 ? [['虾仁', 100]] : s.indexOf('金枪鱼') >= 0 ? [['鲈鱼', 100]] : s.indexOf('鸡蛋') >= 0 ? [['鸡蛋', 100]] : s.indexOf('豆腐') >= 0 ? [['豆腐', 150]] : [['生菜', 150]];
      add(s + '（' + d[0] + '）', [['生菜', 100], ['番茄', 100]].concat(main, d[1]), 'light', '轻食沙拉，酱汁单独计', { pop: 3 });
    }));

    const fruits = [['苹果', 200], ['香蕉', 120], ['橙子', 200], ['梨', 200], ['桃', 200], ['葡萄', 150], ['西瓜', 300], ['哈密瓜', 250], ['草莓', 200], ['蓝莓', 150], ['芒果', 200], ['菠萝', 200], ['猕猴桃', 150], ['火龙果', 250], ['柚子', 250], ['樱桃', 150], ['李子', 150], ['杏', 150], ['石榴', 200], ['柿子', 200], ['荔枝', 150], ['龙眼', 150], ['枇杷', 150], ['杨梅', 150], ['柠檬', 100], ['牛油果', 150], ['椰子', 200], ['枣', 100], ['无花果', 150], ['百香果', 100]];
    fruits.forEach(f => {
      const ing = f[0] === '橙子' ? '橘子' : f[0] === '梨' ? '苹果' : f[0] === '桃' ? '苹果' : f[0] === '葡萄' ? '香蕉' : f[0] === '西瓜' ? '苹果' : f[0] === '草莓' ? '苹果' : f[0] === '蓝莓' ? '葡萄干' : f[0] === '芒果' ? '苹果' : f[0] === '菠萝' ? '苹果' : f[0] === '猕猴桃' ? '苹果' : f[0] === '火龙果' ? '苹果' : f[0] === '柚子' ? '苹果' : f[0] === '樱桃' ? '苹果' : f[0] === '李子' ? '苹果' : f[0] === '杏' ? '苹果' : f[0] === '石榴' ? '苹果' : f[0] === '柿子' ? '苹果' : f[0] === '荔枝' ? '苹果' : f[0] === '龙眼' ? '苹果' : f[0] === '枇杷' ? '苹果' : f[0] === '杨梅' ? '苹果' : f[0] === '柠檬' ? '苹果' : f[0] === '牛油果' ? '花生' : f[0] === '椰子' ? '花生' : f[0] === '枣' ? '红枣' : f[0] === '无花果' ? '苹果' : f[0] === '百香果' ? '苹果' : f[0];
      if (!DISH_ING[ing]) return;
      add(f[0], [[ing, f[1]]], 'fruit', '一份水果，按可食部 ' + f[1] + 'g 估', { pop: 3 });
    });

    ['汉堡', '牛肉汉堡', '鸡肉汉堡', '鱼汉堡', '素食汉堡', '热狗', '披萨', '薯条', '鸡块', '鸡翅', '鸡米花', '鸡排', '洋葱圈', '炸鸡', '三明治', '卷饼', '肉夹馍', '煎饼果子', '手抓饼', '鸡蛋灌饼', '烤冷面', '凉皮', '酸辣粉', '螺蛳粉', '麻辣烫', '关东煮', '烤肠', '炸串', '臭豆腐', '章鱼小丸子', '鸡蛋仔', '鲷鱼烧', '糖葫芦', '炒栗子', '烤红薯', '煮玉米'].forEach(n => {
      const comps = n.indexOf('薯条') >= 0 ? [['土豆', 150], ['植物油', 15]]
        : n.indexOf('鸡') >= 0 ? [['鸡腿肉', 120], ['植物油', 12], ['面粉', 20]]
          : n.indexOf('汉堡') >= 0 || n.indexOf('三明治') >= 0 ? [['面包', 100], ['牛肉', 70], ['芝士', 20], ['植物油', 5]]
            : n.indexOf('披萨') >= 0 ? [['面粉', 120], ['芝士', 50], ['植物油', 8]]
              : n.indexOf('凉皮') >= 0 ? [['面粉', 100], ['植物油', 8]]
                : n.indexOf('红薯') >= 0 ? [['红薯', 200]]
                  : n.indexOf('玉米') >= 0 ? [['玉米', 200]]
                    : [['面粉', 100], ['植物油', 10]];
      add(n, comps, 'fast', '快餐/小吃，按常规份量粗估', { pop: 4 });
    });

    const snackNote = '包装零食，按品类与口味估，实际看包装营养成分表';
    SNACK_BASES.forEach(b => {
      addServe(b.n, {
        grams: b.serve, kcal: b.kcal * b.serve / 100,
        p: b.p * b.serve / 100, c: b.c * b.serve / 100, f: b.f * b.serve / 100, fib: b.fib * b.serve / 100,
        sugar: b.sug * b.serve / 100, oil: b.oil * b.serve / 100, na: b.na * b.serve / 100
      }, 'snack', snackNote, { pop: 3, a: SNACK_ALIAS[b.n] || [] });
      const fl = SNACK_FLAVORS[b.cat] || SNACK_FLAVORS.chips;
      fl.forEach(f => {
        const nm = f === '原味' ? '原味' + b.n : f + '味' + b.n;
        [['', 1], ['分享装', 2.2]].forEach(sz => {
          const grams = Math.round(b.serve * sz[1]);
          addServe((sz[0] ? sz[0] : '') + nm, {
            grams: grams,
            kcal: b.kcal * grams / 100,
            p: b.p * grams / 100, c: b.c * grams / 100, f: b.f * grams / 100, fib: b.fib * grams / 100,
            sugar: b.sug * grams / 100, oil: b.oil * grams / 100, na: b.na * grams / 100
          }, 'snack', snackNote, { pop: 2, a: sz[1] === 1 ? [b.n] : [] });
        });
      });
    });

    DRINK_BASES.forEach(b => {
      addServe(b.n, {
        grams: b.serve, kcal: b.kcal * b.serve / 100,
        p: b.p * b.serve / 100, c: b.c * b.serve / 100, f: b.f * b.serve / 100, fib: b.fib * b.serve / 100,
        sugar: b.sugar * b.serve / 100, oil: 0, na: b.na * b.serve / 100
      }, 'drink', '饮品，默认按基础配方估；可在列表里选甜度', { pop: 3, a: DRINK_ALIAS[b.n] || [] });
      let variants;
      if (b.cat === 'tea') variants = [['无糖', 0], ['三分糖', 3], ['半糖', 5], ['全糖', 8]];
      else if (b.cat === 'coffee') variants = [['无糖', 0], ['加糖', 5]];
      else if (b.cat === 'soda') variants = [['常规', b.sugar], ['无糖', 0]];
      else if (b.cat === 'juice') variants = [['纯果汁', b.sugar], ['加糖', b.sugar + 5]];
      else if (b.cat === 'milk') variants = [['原味', b.sugar], ['低糖', Math.max(0, b.sugar - 3)]];
      else variants = [['常规', b.sugar]];
      variants.forEach(v => {
        const sugar = v[1];
        const kcal = Math.max(0, b.kcal + (sugar - b.sugar) * 4);
        [['单份', 1], ['大份', 1.4]].forEach(sz => {
          const grams = Math.round(b.serve * sz[1]);
          const nm = sz[0] + v[0] + b.n;
          addServe(nm, {
            grams: grams, kcal: kcal * grams / 100,
            p: b.p * grams / 100, c: b.c * grams / 100, f: b.f * grams / 100, fib: b.fib * grams / 100,
            sugar: sugar * grams / 100, oil: 0, na: b.na * grams / 100
          }, 'drink', '饮品，糖量按甜度档位估；大份为 1.4 倍', { pop: 2, a: (sz[1] === 1 ? [b.n] : []).concat(sz[1] === 1 ? (DRINK_ALIAS[b.n] || []) : []) });
        });
      });
    });

    const instNote = '方便食品，按包装营养与常见口味估';
    INSTANT_BASES.forEach(b => {
      [['袋装', 1], ['杯面', 1]].forEach(sz => {
        const grams = b[9];
        addServe(sz[0] + b[0], {
          grams: grams, kcal: b[1] * grams / 100, p: b[2] * grams / 100, c: b[3] * grams / 100,
          f: b[4] * grams / 100, fib: b[5] * grams / 100, sugar: b[6] * grams / 100, oil: b[7] * grams / 100, na: b[8] * grams / 100
        }, 'staple', instNote, { pop: 2, a: sz[0] === '袋装' ? (INSTANT_ALIAS[b[0]] || []) : [] });
      });
    });

    const frozenFlavors = ['原味', '香辣', '鲜虾', '玉米'];
    FROZEN_BASES.forEach(b => {
      frozenFlavors.forEach(f => {
        const grams = b[9];
        const nm = (f === '原味' ? '' : f + '味') + b[0];
        addServe(nm, {
          grams: grams, kcal: b[1] * grams / 100, p: b[2] * grams / 100, c: b[3] * grams / 100,
          f: b[4] * grams / 100, fib: b[5] * grams / 100, sugar: b[6] * grams / 100, oil: b[7] * grams / 100, na: b[8] * grams / 100
        }, 'staple', '冷冻/半成品，按品类估', { pop: 1 });
      });
    });

    EXTRA_DISH_NAMES.forEach(n => {
      if (n.length < 2) return;
      const parsed = parseDishName(n);
      add(n, parsed.comps, catOfDishName(n), '地方菜/常见菜名，按菜名与品类粗估', { pop: 1, conf: parsed.conf === 'low' ? 'low' : 'mid' });
    });

    DISH_CATALOG = out;
    return out;
  }

  function normDish(s) {
    return String(s || '').toLowerCase().replace(/[\s，,。.、（）()\[\]【】]/g, '').replace(/(一份|大份|小份|半份|两人份|单人份|的)/g, '');
  }

  function dishKeysFromName(name) {
    const text = normDish(name);
    const aliases = [];
    Object.keys(DISH_ING).forEach(k => DISH_ING[k].a.forEach(a => aliases.push({ a: a, k: k })));
    aliases.sort((x, y) => y.a.length - x.a.length);
    const used = new Array(text.length).fill(false);
    const found = [];
    aliases.forEach(it => {
      let idx = text.indexOf(it.a);
      while (idx >= 0) {
        let free = true;
        for (let j = idx; j < idx + it.a.length; j++) if (used[j]) free = false;
        if (free) {
          found.push(it.k);
          for (let j = idx; j < idx + it.a.length; j++) used[j] = true;
          break;
        }
        idx = text.indexOf(it.a, idx + 1);
      }
    });
    return found.filter((k, i) => found.indexOf(k) === i);
  }

  function dishMethod(name) {
    const s = String(name || '');
    if (/炸|酥|脆|裹粉/.test(s)) return { oil: 18, sugar: 0, salt: 1.5, soy: 2, label: '油炸' };
    if (/糖醋|红烧|干锅|干煸|回锅/.test(s)) return { oil: 12, sugar: 8, salt: 2, soy: 8, label: '红烧/糖醋' };
    if (/煎|烤/.test(s)) return { oil: 8, sugar: 0, salt: 1.2, soy: 3, label: '煎烤' };
    if (/炒|爆|溜|煸/.test(s)) return { oil: 10, sugar: 0, salt: 1.2, soy: 3, label: '炒' };
    if (/蒸|煮|汤|羹|粥|炖|白灼/.test(s)) return { oil: 3, sugar: 0, salt: 1.5, soy: 2, label: '蒸煮' };
    if (/凉拌|拌/.test(s)) return { oil: 6, sugar: 0, salt: 1, soy: 3, label: '凉拌' };
    return { oil: 10, sugar: 0, salt: 1.2, soy: 3, label: '家常炒' };
  }

  function parseDishName(name) {
    const keys = dishKeysFromName(name);
    const comps = [];
    const staples = keys.filter(k => DISH_ING[k].type === 'staple');
    const proteins = keys.filter(k => DISH_ING[k].type === 'protein');
    const vegs = keys.filter(k => DISH_ING[k].type === 'veg');
    const method = dishMethod(name);
    if (staples.length) {
      staples.forEach(k => comps.push([k, k === '面粉' ? 100 : 250]));
      if (proteins.length) proteins.forEach((k, i) => comps.push([k, Math.round(100 / proteins.length)]));
      else if (/炒饭|盖饭|拌饭|煲仔饭|卤肉饭/.test(name)) comps.push(['鸡蛋', 80]);
      vegs.slice(0, 2).forEach(k => comps.push([k, 100]));
    } else {
      if (proteins.length) {
        proteins.forEach((k, i) => comps.push([k, Math.round(120 / proteins.length)]));
        const rest = 200;
        if (vegs.length) vegs.forEach((k, i) => comps.push([k, Math.round(rest / vegs.length)]));
        else comps.push(['青菜', rest]);
      } else if (vegs.length) {
        vegs.forEach((k, i) => comps.push([k, Math.round(250 / vegs.length)]));
      } else {
        comps.push(['鸡胸', 100], ['青菜', 150]);
      }
    }
    if (method.oil) comps.push(['植物油', method.oil]);
    if (method.sugar) comps.push(['白砂糖', method.sugar]);
    if (method.salt) comps.push(['盐', method.salt]);
    if (method.soy) comps.push(['酱油', method.soy]);
    return { comps: comps, conf: (keys.length >= 2 ? 'mid' : keys.length === 1 ? 'mid' : 'low'), method: method.label, keys: keys, salt: method.salt, soy: method.soy };
  }

  function matchDish(name) {
    const q = normDish(name);
    if (!q) return null;
    const catalog = buildDishCatalog();
    let hit = catalog.find(d => normDish(d.n) === q || d.a.some(x => normDish(x) === q));
    if (hit) return hit;
    let best = null, score = 0;
    catalog.forEach(d => {
      const names = [d.n].concat(d.a).map(normDish);
      names.forEach(n => {
        if (n.length >= 3 && q.length >= 3 && (q.indexOf(n) >= 0 || n.indexOf(q) >= 0)) {
          const s = Math.min(n.length, q.length);
          if (s > score) { score = s; best = d; }
        }
      });
    });
    return score >= 2 ? best : null;
  }

  function dishGrams(g, size) {
    const raw = g * size;
    return raw < 20 ? Math.max(1, Math.round(raw)) : Math.max(5, Math.round(raw / 5) * 5);
  }

  function estimateDish(name, size, withRice) {
    const text = String(name || '').trim();
    if (!text) return null;
    const hit = matchDish(text);
    if (hit && hit.serve) {
      const scale = size;
      const s = hit.serve;
      const grams = Math.round(s.grams * scale);
      const total = {
        grams: grams,
        kcal: Math.round(s.kcal * scale),
        p: round1(s.p * scale), c: round1(s.c * scale), f: round1(s.f * scale), fib: round1(s.fib * scale)
      };
      const control = {
        sugar: round1((hit.control.sugar || 0) * scale),
        oil: round1((hit.control.oil || 0) * scale),
        salt: round1((hit.control.salt || 0) * scale),
        sodium: Math.round((hit.control.sodium || 0) * scale)
      };
      return {
        name: hit.n, query: text, sub: '包装/品类估算' + (scale !== 1 ? ' · ' + (scale < 1 ? '小份' : '大份') : ''),
        confidence: 'mid', range: 25,
        components: [{ name: '整份', grams: grams, kcal: total.kcal, p: total.p }],
        total: total, control: control, hasStaple: hit.cat === 'staple', cat: hit.cat,
        note: hit.note + '。含糖/油/盐按品类估，实际以包装标签为准。', size: size, withRice: false
      };
    }
    let comps, conf, sub, note;
    if (hit) {
      comps = hit.c.map(p => [p[0], dishGrams(p[1], size)]);
      conf = hit.conf || 'mid';
      sub = (conf === 'high' ? '常见菜谱匹配' : '扩展菜谱') + (normDish(text) !== normDish(hit.n) && text !== hit.n ? ' · 按「' + hit.n + '」估' : '');
      note = hit.note + '。按家常做法估，用油和份量会浮动。';
    } else {
      const parsed = parseDishName(text);
      comps = parsed.comps.map(p => [p[0], dishGrams(p[1], size)]);
      conf = parsed.conf;
      sub = conf === 'low' ? '没认出具体食材 · 按家常炒菜估' : '按菜名里的食材拆解 · ' + parsed.method;
      note = conf === 'low'
        ? '没认出具体食材，按一份家常炒菜（蛋白食材 100g + 蔬菜 150g + 油 10g）估。建议按实际份量改一改。'
        : '从菜名里识别到：' + parsed.keys.map(k => DISH_ING[k].n).join('、') + '；按「' + parsed.method + '」补了油和盐。实际配料可能更多。';
    }
    const hasStaple = comps.some(p => DISH_ING[p[0]] && DISH_ING[p[0]].type === 'staple');
    if (withRice && !hasStaple) comps.push(['米饭', 250]);
    const t = compTotals(comps);
    const components = comps.map(p => {
      const f = DISH_ING[p[0]];
      if (!f) return null;
      return { name: f.n, grams: p[1], kcal: Math.round(f.kcal * p[1] / 100), p: round1(f.p * p[1] / 100) };
    }).filter(Boolean);
    return {
      name: hit ? hit.n : text, query: text, sub: sub, confidence: conf,
      range: conf === 'high' ? 15 : conf === 'mid' ? 20 : 30,
      components: components, total: { grams: t.grams, kcal: t.kcal, p: t.p, c: t.c, f: t.f, fib: t.fib },
      control: t.control, hasStaple: hasStaple, cat: hit ? hit.cat : catOfDishName(text),
      note: note, size: size, withRice: withRice
    };
  }

  function renderDishResult(res) {
    if (!res) {
      return '<div class="cart-empty">先输入菜名，再点底部「估算」。<br>例如：番茄炒蛋、青椒肉丝、牛肉面、麻辣烫。</div>';
    }
    const compRows = res.components.map(c =>
      '<div class="dr-row"><span class="n">' + esc(c.name) + '</span><span class="g">' + c.grams + 'g</span><span class="k">' + fmt(c.kcal) + ' kcal</span></div>').join('');
    return '<div class="dish-result">' +
      '<div class="dr-head"><div><div class="dr-name">' + esc(res.name) + '</div><div class="tiny faint">' + esc(res.sub) + '</div></div>' +
        '<span class="badge ' + (res.confidence === 'high' ? 'high' : '') + '">估算 ±' + res.range + '%</span></div>' +
      '<div class="dr-total"><span class="big">' + fmt(res.total.kcal) + '</span><span class="u">kcal · 约 ' + res.total.grams + 'g</span></div>' +
      '<div class="dr-macros">蛋白 ' + round1(res.total.p) + 'g · 碳水 ' + round1(res.total.c) + 'g · 脂肪 ' + round1(res.total.f) + 'g · 纤维 ' + round1(res.total.fib) + 'g</div>' +
      (res.control ? '<div class="dr-control">三控估算 · 糖 ' + round1(res.control.sugar) + 'g · 油 ' + round1(res.control.oil) + 'g · 盐 ' + round1(res.control.salt) + 'g（钠 ' + Math.round(res.control.sodium) + 'mg）</div>' : '') +
      '<div class="dr-comps">' + compRows + '</div>' +
      '<div class="dr-note">' + esc(res.note) + (res.hasStaple && res.withRice ? ' 这份已含主食，没有额外加米饭。' : '') + '</div>' +
    '</div>';
  }

  const DISH_CATS = [
    ['all', '全部'], ['home', '家常菜'], ['staple', '主食'], ['soup', '汤粥'],
    ['snack', '零食'], ['drink', '饮料'], ['breakfast', '早餐'], ['light', '轻食'],
    ['fruit', '水果'], ['fast', '快餐']
  ];
  const DISH_CAT_LABEL = Object.fromEntries(DISH_CATS);

  function dishSuggestions(q, cat, limit) {
    const all = buildDishCatalog();
    const query = normDish(q);
    let list = cat && cat !== 'all' ? all.filter(d => d.cat === cat) : all;
    if (!query) {
      return list.slice().sort((a, b) => (b.pop - a.pop) || (a.n.length - b.n.length)).slice(0, limit || 10);
    }
    const scored = [];
    list.forEach(d => {
      const names = [d.n].concat(d.a || []).map(normDish);
      let s = 0;
      names.forEach(n => {
        if (n === query) s = Math.max(s, 1000);
        else if (n.indexOf(query) === 0) s = Math.max(s, 600);
        else if (n.indexOf(query) >= 0) s = Math.max(s, 420 - n.length);
      });
      if (s > 0) scored.push({ d: d, s: s + (d.pop || 0) * 6 - d.n.length });
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, limit || 12).map(x => x.d);
  }

  function refreshDishSuggestions() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'dish') return;
    const cats = $('#dishCats');
    if (cats) {
      cats.innerHTML = DISH_CATS.map(c =>
        '<button class="chip" data-act="dish-cat" data-v="' + c[0] + '" style="' + (sd.cat === c[0] ? 'border-color:var(--green);background:var(--green-soft);color:var(--green)' : '') + '">' + c[1] + '</button>').join('');
    }
    const box = $('#dishSuggest');
    if (!box) return;
    const q = ($('#dishName') || {}).value || '';
    const cat = sd.cat || 'all';
    const all = buildDishCatalog();
    const filtered = cat === 'all' ? all : all.filter(d => d.cat === cat);
    const items = dishSuggestions(q, cat, 12);
    const total = q ? filtered.filter(d => [d.n].concat(d.a || []).some(n => normDish(n).indexOf(normDish(q)) >= 0)).length : filtered.length;
    box.innerHTML = '<div class="search-caption"><span class="k">' + (q ? '匹配结果' : '推荐与常用') + '</span><span class="tiny faint">共 ' + fmt(filtered.length) + ' 条' + (q ? ' · 匹配 ' + fmt(total) : '') + '</span></div>' +
      '<div class="dish-pick-list">' + items.map(d =>
        '<button class="dish-pick-row" data-act="dish-pick" data-name="' + esc(d.n) + '"><span class="n">' + esc(d.n) + '</span>' +
        '<span class="c">' + (DISH_CAT_LABEL[d.cat] || '') + '</span><span class="k">约 ' + fmt(d.k) + ' kcal</span><span class="a">估算 →</span></button>').join('') + '</div>' +
      (items.length ? '' : '<div class="cart-empty">没有匹配。可以换个关键词，或直接点底部「估算」按菜名拆解。</div>');
  }

  function refreshDishResult() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'dish') return;
    const name = ($('#dishName') || {}).value || '';
    sd.query = name;
    sd.result = name ? estimateDish(name, sd.size, sd.rice) : null;
    const box = $('#dishResultBox');
    if (box) box.innerHTML = renderDishResult(sd.result);
    const btn = $('#dishSaveBtn');
    if (btn) {
      btn.disabled = !sd.result;
      btn.textContent = sd.result ? '记入' + E.mealLabel(sd.meal) + ' · ' + fmt(sd.result.total.kcal) + ' kcal' : '记入这餐';
    }
    const riceBtn = $('#dishRice');
    if (riceBtn) {
      const noRice = !!(sd.result && (sd.result.cat === 'snack' || sd.result.cat === 'drink'));
      riceBtn.style.display = noRice ? 'none' : '';
      riceBtn.classList.toggle('on', !!sd.rice);
      riceBtn.textContent = sd.result && sd.result.hasStaple ? '已含主食' : '配一碗米饭';
      riceBtn.disabled = !!(sd.result && sd.result.hasStaple);
    }
  }

  function openDishSheet(opts) {
    const o = opts || {};
    const date = o.date || (state.tab === 'ledger' ? state.recordDate : E.todayKey());
    const meal = o.meal || E.guessMeal();
    const catalog = buildDishCatalog();
    state.sheetData = { type: 'dish', date: date, meal: meal, size: 1, rice: false, result: null, cat: 'all' };
    const mealSeg = '<div class="seg meal-seg">' + E.MEALS.map(m =>
      '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (m[0] === meal ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>';
    openSheet(
      sheetHead('菜名估算', E.relativeDay(date, E.todayKey()) + ' · 收录 ' + fmt(catalog.length) + ' 道菜与零食 · 不联网') +
      '<div class="sheet-body">' +
        mealSeg +
        '<div id="dishCats" class="chip-row" style="margin-top:10px"></div>' +
        '<div class="search-box" style="margin-top:8px">' + icon('search') + '<input class="input" id="dishName" placeholder="输入菜名，如 番茄炒蛋 / 薯片 / 珍珠奶茶" autocomplete="off"></div>' +
        '<div id="dishSuggest" style="margin-top:4px"></div>' +
        '<div class="dish-size-row"><span class="lbl">份量</span><div class="seg dish-size">' +
          [['0.75', '小份'], ['1', '常规'], ['1.3', '大份']].map(p =>
            '<button data-act="dish-size" data-v="' + p[0] + '" class="' + (p[0] === '1' ? 'on' : '') + '">' + p[1] + '</button>').join('') +
        '</div><button class="chip dish-rice" id="dishRice" data-act="dish-rice">配一碗米饭</button></div>' +
        '<button class="portion-link" data-act="open-portion">不知道一份多大？看份量参照 →</button>' +
        '<div id="dishResultBox" style="margin-top:10px">' + renderDishResult(null) + '</div>' +
        '<div class="notebox">常见菜用配料表；扩展菜名按食材和做法估；零食饮料按品类/口味估。实际用油、份量和包装标签会浮动，记入后仍可改份量或删除。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="dish-calc">估算</button><button class="btn btn-primary" id="dishSaveBtn" data-act="save-dish" disabled>记入这餐</button></div>',
      'dish'
    );
    refreshDishSuggestions();
    if (o.query) {
      const i = $('#dishName');
      if (i) i.value = o.query;
      refreshDishResult();
    } else {
      setTimeout(() => { const i = $('#dishName'); if (i) i.focus(); }, 60);
    }
  }

  function saveDish() {
    const sd = state.sheetData;
    const res = sd && sd.result;
    if (!res) { toast('先估算一份再记入'); return; }
    if (res.total.grams < 1 || res.total.grams > 3000) { toast('估算总量需要在 1–3000g，请调小份量或换菜名'); return; }
    const before = DB.entries.length;
    const entry = {
      id: uid(), date: sd.date, meal: sd.meal, name: res.name,
      grams: res.total.grams,
      per100: {
        kcal: res.total.kcal / res.total.grams * 100,
        p: res.total.p / res.total.grams * 100,
        c: res.total.c / res.total.grams * 100,
        f: res.total.f / res.total.grams * 100,
        fib: res.total.fib / res.total.grams * 100
      },
      kcal: res.total.kcal, p: res.total.p, c: res.total.c, f: res.total.f, fib: res.total.fib,
      conf: res.confidence === 'high' ? 'med' : 'low', source: 'dish', estimate: true,
      control: res.control || { sugar: 0, oil: 0, salt: 0, sodium: 0 },
      sugar: res.control ? res.control.sugar : 0,
      oil: res.control ? res.control.oil : 0,
      salt: res.control ? res.control.salt : 0,
      sodium: res.control ? res.control.sodium : 0,
      components: res.components.map(c => ({ name: c.name, grams: c.grams, kcal: c.kcal, p: c.p })),
      createdAt: Date.now()
    };
    DB.entries.push(entry);
    if (!commit(() => { DB.entries.length = before; })) return;
    const pd = pantryAutoDeduct([entry]);
    if (pd.any) saveDB(true);
    logChange('估算记入「' + res.name + '」· ' + res.total.grams + 'g / ' + res.total.kcal + ' kcal', { kind: 'entry-add', item: entry });
    closeSheet();
    renderActive();
    toast('已估算记入' + E.mealLabel(sd.meal) + ' · ' + res.name + ' ' + res.total.grams + 'g / ' + fmt(res.total.kcal) + ' kcal' + (pd.any ? ' · 冰箱：' + pantryResText(pd) : ''));
  }

  /* ============================================================
     添加食物
     ============================================================ */
  function openFoodSheet(opts) {
    const o = opts || {};
    const date = o.date || (state.tab === 'ledger' ? state.recordDate : E.todayKey());
    const meal = o.meal || E.guessMeal();
    state.sheetData = { type: 'food', date: date, meal: meal, cart: (o.cart || []).slice(), query: '', cat: null, pantryDeduct: true };
    const rec = recents(8);
    const combos = DB.combos || [];
    const mealSeg = '<div class="seg meal-seg">' + E.MEALS.map(m =>
      '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (m[0] === meal ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>';
    const comboBox = combos.length ? '<div class="search-caption"><span class="k">我的组合</span><span class="tiny faint">点一下整组加入</span></div>' +
      '<div class="combo-strip">' + combos.map(c => '<button class="combo-card" data-act="apply-combo" data-id="' + c.id + '"><div class="n">' + esc(c.name) + '</div><div class="k">' + c.items.length + ' 项 · ' + fmt(c.items.reduce((s, i) => s + (i.kcal || 0), 0)) + ' kcal</div></button>').join('') + '</div>' : '';
    const recentBox = rec.length ? '<div class="search-caption"><span class="k">最近吃过</span><span class="tiny faint">按上次份量</span></div>' +
      '<div class="chip-row">' + rec.map(e => '<button class="chip" data-act="cart-recent" data-id="' + e.id + '">' + esc(e.name) + '<span class="n">' + fmt(e.kcal) + '</span></button>').join('') + '</div>' : '';

    openSheet(
      sheetHead('记一餐', E.relativeDay(date, E.todayKey()) + ' · <span id="foodCount">正在载入食物库…</span>', '<button class="btn-quiet tiny" data-act="open-manual" style="margin-right:4px;color:var(--green)">手动热量</button>') +
      '<div class="sheet-body">' +
        mealSeg +
        '<button class="dish-launch" data-act="open-dish"><span class="dl-ic">' + icon('spark') + '</span><span class="dl-t"><b>只知道菜名？</b><em>输入「番茄炒蛋」，自动估食材、克数和热量</em></span><span class="dl-a">估算 →</span></button>' +
        '<div class="search-box">' + icon('search') + '<input class="input" id="foodSearch" placeholder="搜索食物 / 拼音首字母，如 mf、fqcd" autocomplete="off"></div>' +
        comboBox + recentBox +
        '<div id="pickBox" style="margin-top:8px"></div>' +
        '<div id="cartBox"></div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="save-combo">存为组合</button><button class="btn btn-ghost" data-act="save-recipe">存菜谱</button><button class="btn btn-primary" id="saveMealBtn" data-act="save-meal" disabled>记入账本</button></div>',
      'food'
    );
    updatePicks();
    updateCart();
    /* 长辈模式：默认带入第一条常见食物，记一餐只需「打开 → 保存」两步 */
    if (DB.settings && DB.settings.elder && (!state.sheetData.cart || !state.sheetData.cart.length)) {
      const first = $('#pickBox .pick-row');
      if (first) first.click();
    }
    if (FL) {
      FL.ensure().then(() => {
        if (!state.sheetData || state.sheetData.type !== 'food') return;
        const c = $('#foodCount');
        const n = FL.meta().count;
        if (c) c.textContent = n ? ('食物库 ' + n + ' 种原料 · 菜名库 ' + fmt(buildDishCatalog().length) + ' 道 · 估算值') : '食物库载入失败，仍可按 100g 手动记录';
        updatePicks();
      });
    }
  }

  function paintFoodCount() {
    const c = $('#foodCount');
    if (!c || !FL || !FL.ready()) return;
    const n = FL.meta().count;
    c.textContent = n ? ('食物库 ' + n + ' 种原料 · 菜名库 ' + fmt(buildDishCatalog().length) + ' 道 · 估算值') : '食物库载入失败';
  }

  function libToFood(it) {
    return {
      id: 'fl:' + it.name, name: it.name, kcal: it.kcal, p: it.p, c: it.c, f: it.f, fib: it.fib,
      cat: 0, catName: it.cat, catLabel: it.cat, unitG: 0, unit: '', custom: false,
      portions: it.portions, libItem: it
    };
  }

  function foodFromLib(item, grams, portion) {
    if (!item) return null;
    const food = libToFood(item);
    addToCart(food, grams, portion);
    return food;
  }

  function updatePicks() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'food') return;
    const box = $('#pickBox');
    if (!box) return;
    const libReady = !!(FL && FL.ready());
    if (libReady && typeof sd.cat === 'number') sd.cat = null;
    let cats, results;
    if (libReady) {
      cats = ['全部'].concat(FL.cats()).map(c => {
        const on = (c === '全部' && !sd.cat) || sd.cat === c;
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="food-cat" data-v="' + (c === '全部' ? '' : c) + '">' + c + '</button>';
      }).join('');
      results = FL.search(sd.query, sd.cat, 60, { recent: DB.foodUse, favorites: DB.favorites });
    } else {
      cats = [null, '主食', '肉蛋', '水产', '蔬菜', '水果', '豆乳'].map(c => {
        const idx = c ? E.CATS.indexOf(c) : null;
        return '<button class="chip" data-act="food-cat" data-v="' + (idx == null ? '' : idx) + '" style="' + ((sd.cat === idx || (c == null && sd.cat == null)) ? 'border-color:var(--green);background:var(--green-soft);color:var(--green)' : '') + '">' + (c || '全部') + '</button>';
      }).join('');
      results = (sd.query ? E.searchFoods(sd.query, allFoods()) : allFoods())
        .filter(f => sd.cat == null || f.cat === sd.cat).slice(0, 60);
    }
    const head = '<div class="chip-row lib-cats" style="margin-bottom:2px">' + cats + '</div>';
    let list;
    if (libReady) {
      list = results.length ? '<div class="pick-list">' + results.map(it => {
        const fav = DB.favorites.indexOf(it.name) >= 0;
        const chips = it.portions.slice(0, 3).map(p =>
          '<button class="portion-chip" data-act="pick-portion" data-name="' + esc(it.name) + '" data-g="' + p.grams + '" data-label="' + esc(p.label) + '">' + esc(p.label) + ' · ' + p.grams + 'g</button>').join('');
        return '<div class="pick-row lib-row">' +
          '<div class="lib-top"><span class="n">' + esc(it.name) + (fav ? '<span class="fav-mark">★</span>' : '') + '</span>' +
          '<span class="c">' + esc(it.cat) + '</span>' +
          '<span class="k">' + fmt(it.kcal) + ' <span class="tiny faint">/100g</span></span>' +
          '<button class="fav-btn' + (fav ? ' on' : '') + '" data-act="food-fav" data-name="' + esc(it.name) + '" aria-label="收藏">' + (fav ? '★' : '☆') + '</button></div>' +
          '<div class="pick-portions">' + chips + '</div></div>';
      }).join('') + '</div>'
        : '<div class="cart-empty">没有找到。可以换个关键词、拼音首字母，或点右上角「手动热量」。</div>';
    } else {
      list = results.length ? '<div class="pick-list">' + results.map(f =>
        '<button type="button" class="pick-row" data-act="pick-food" data-id="' + f.id + '"><span class="n">' + esc(f.name) + '</span>' +
        (f.custom ? '<span class="c">自定义</span>' : '') +
        '<span class="k">' + fmt(f.kcal) + ' <span class="tiny faint">/100g</span></span>' +
        '<span class="add-i">' + icon('plus') + '</span></button>'
      ).join('') + '</div>' : '<div class="cart-empty">食物库载入中，也可以先手动记录热量。</div>';
    }
    box.innerHTML = head + list +
      '<div class="tiny faint lib-source">' + (libReady ? '营养值为估算值（按常见品类与家常配比换算），非逐条官方检测数据。点份量直接加入。' : '正在准备食物库…') + '</div>';
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
        '<div class="cart-row"><div class="n">' + esc(it.food.name) + (it.portion ? '<small class="p-portion">' + esc(it.portion.label) + '</small>' : '') + '<small>' + Math.round(it.food.kcal) + ' kcal/100g · 蛋白 ' + round1(it.food.p) + 'g</small></div>' +
        '<div class="step">' +
          '<button class="step-btn" data-act="cart-step" data-i="' + i + '" data-d="-5" aria-label="减少 5 克">−</button>' +
          '<input class="input input-num g" type="number" min="0" max="3000" step="5" value="' + it.grams + '" data-cart-grams="' + i + '" aria-label="克数">' +
          '<button class="step-btn" data-act="cart-step" data-i="' + i + '" data-d="5" aria-label="增加 5 克">＋</button>' +
        '</div>' +
        '<div class="k" id="cartKcal' + i + '">' + Math.round(it.food.kcal * it.grams / 100) + '</div>' +
        '<button class="x" data-act="cart-remove" data-i="' + i + '" aria-label="移除">' + icon('close') + '</button></div>'
      ).join('') +
      '<div class="cart-total"><span class="k">合计 · 约</span><span class="v" id="cartTotal">' + Math.round(totals.kcal) + ' <small>kcal</small></span></div>' +
      '</div>' + renderPantryPreview(sd.cart);
    if (btn) { btn.disabled = false; btn.textContent = '记入 · ' + Math.round(totals.kcal) + ' kcal'; }
  }

  function paintCartTotals() {
    const sd = state.sheetData;
    if (!sd || !sd.cart) return;
    sd.cart.forEach((it, i) => {
      const k = $('#cartKcal' + i);
      if (k) k.textContent = Math.round(it.food.kcal * it.grams / 100);
    });
    const total = sd.cart.reduce((s, it) => s + it.food.kcal * it.grams / 100, 0);
    const tot = $('#cartTotal');
    if (tot) tot.innerHTML = Math.round(total) + ' <small>kcal</small>';
    const btn = $('#saveMealBtn');
    if (btn && !btn.disabled) btn.textContent = '记入 · ' + Math.round(total) + ' kcal';
  }

  function addToCart(food, grams, portion) {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'food') return;
    const g = grams || food.unitG || 100;
    sd.cart.push({ food: food, grams: g, portion: portion || null });
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
    const doSave = () => {
      const before = DB.entries.length;
      let total = 0;
      const added = [];
      sd.cart.forEach(it => {
        const cal = it.food.kcal * it.grams / 100;
        total += cal;
        const e = makeEntry(it.food, it.grams, sd.meal, sd.date, 'lib', 'med');
        if (it.portion) e.portion = { label: it.portion.label, grams: it.portion.grams };
        DB.entries.push(e);
        added.push(e);
      });
      if (!commit(() => { DB.entries.length = before; })) return;
      sd.cart.forEach(it => { DB.foodUse[it.food.name] = (DB.foodUse[it.food.name] || 0) + 1; });
      sd.cart.forEach(it => { codexLight(it.food.name); });
      const pd = (sd.pantryDeduct !== false) ? pantryAutoDeduct(added) : null;
      saveDB(true);
      const label = E.mealLabel(sd.meal) + ' · ' + Math.round(total) + ' kcal';
      closeSheet();
      renderActive();
      toast('已记入' + label + (pd && pd.any ? ' · 冰箱：' + pantryResText(pd) : ''));
    };
    const dupNames = sd.cart.map(it => it.food.name).filter(n =>
      DB.entries.some(e => e.date === sd.date && e.meal === sd.meal && e.name === n));
    if (dupNames.length) {
      confirmSheet('这一餐已有相同食物',
        '「' + dupNames.slice(0, 3).join('、') + '」已经记在' + E.mealLabel(sd.meal) + '。再记一遍会变成两份。',
        '仍然记入').then(ok => { if (ok) doSave(); });
      return;
    }
    doSave();
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
    const kcalRaw = ($('#mKcal') && $('#mKcal').value) || '';
    const kcal = Number(kcalRaw);
    const grams = Number($('#mGrams') && $('#mGrams').value) || 0;
    const p = Number($('#mP') && $('#mP').value) || 0;
    const fib = Number($('#mFib') && $('#mFib').value) || 0;
    if (!name) { toast('先写个名字'); return; }
    /* 0 kcal 合法：白水、无糖茶等；只拒绝空值和负数 */
    if (kcalRaw === '' || !isFinite(kcal) || kcal < 0) { toast('热量要填 0 或更大的数字'); return; }
    if (kcal > 5000) { toast('单笔热量别超过 5000 kcal，请检查是否填错'); return; }
    if (grams && (grams < 1 || grams > 3000)) { toast('份量要填 1–3000g，或留空'); return; }
    const per100 = grams > 0 ? { kcal: kcal / grams * 100, p: p / grams * 100, c: 0, f: 0, fib: fib / grams * 100 } : null;
    const before = DB.entries.length;
    DB.entries.push({
      id: uid(), date: sd.date, meal: sd.meal, name: name,
      grams: grams || 100, per100: per100, kcal: Math.round(kcal), p: p, c: 0, f: 0, fib: fib,
      conf: 'high', source: 'manual', createdAt: Date.now()
    });
    if (!commit(() => { DB.entries.length = before; })) return;
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
    const pSug = hasPer100 ? portionSuggestionsFor(e.name, grams, e.source === 'dish') : [];
    state.sheetData = { type: 'entry', id: id, meal: e.meal, conf: E.confOf(e) };
    const srcLabel = { lib: '食物库', manual: '手动', ai: 'AI 识别', combo: '组合', dish: '菜名估算', legacy: '旧版导入', custom: '自定义' }[e.source] || '记录';
    openSheet(
      sheetHead('这一笔', E.relativeDay(e.date, E.todayKey()) + ' · 从' + srcLabel + '添加') +
      '<div class="sheet-body">' +
        '<div class="field"><label>食物</label><input class="input" id="eName" value="' + esc(e.name) + '" maxlength="30"></div>' +
        (hasPer100 ?
          '<div class="form-grid"><div class="field"><label>份量 g</label>' +
            '<div class="step">' +
              '<button class="step-btn" data-act="entry-step" data-d="-5" aria-label="减少 5 克">−</button>' +
              '<input class="input input-num" id="eGrams" type="number" min="1" max="3000" value="' + grams + '">' +
              '<button class="step-btn" data-act="entry-step" data-d="5" aria-label="增加 5 克">＋</button>' +
            '</div></div>' +
          '<div class="field"><label>热量（自动）</label><div class="input input-num" style="display:flex;align-items:center;justify-content:center" id="eKcalView">' + fmt(e.kcal) + ' kcal</div></div></div>' +
          '<div class="portion-chips">' + [50, 100, 150, 200, 250].map(g => '<button data-act="entry-grams" data-v="' + g + '">' + g + 'g</button>').join('') + '</div>' +
          (pSug.length ? '<div class="portion-suggest"><span class="lbl">不知道多少克？</span>' + pSug.map(x => '<button data-act="entry-portion" data-g="' + x.grams + '">' + esc(x.label) + ' · ' + x.grams + 'g</button>').join('') + '</div>' : '') +
          '<div class="notebox">每 100g：' + Math.round(e.per100.kcal) + ' kcal · 蛋白 ' + round1(e.per100.p) + 'g · 碳水 ' + round1(e.per100.c) + 'g · 脂肪 ' + round1(e.per100.f) + 'g</div>' +
          (e.components && e.components.length ? '<div class="notebox entry-comps">估算构成：' + e.components.map(c => esc(c.name) + ' ' + c.grams + 'g').join(' · ') + '<br>这是按菜名拆出的配料，改份量会按比例换算。</div>' : '') +
          (e.control ? '<div class="notebox entry-comps">三控估算：添加糖 ' + round1(e.control.sugar) + 'g · 烹调油 ' + round1(e.control.oil) + 'g · 盐 ' + round1(e.control.salt) + 'g（钠 ' + Math.round(e.control.sodium) + 'mg）</div>' : '')
          :
          '<div class="form-grid"><div class="field"><label>热量 kcal</label><input class="input input-num" id="eKcal" type="number" min="0" value="' + Math.round(e.kcal) + '"></div>' +
          '<div class="field"><label>蛋白质 g</label><input class="input input-num" id="eP" type="number" min="0" value="' + (e.p || 0) + '"></div></div>'
        ) +
        '<div class="field" style="margin-top:14px"><label>餐次</label><div class="seg">' + E.MEALS.map(m => '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (e.meal === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>这份数据有多准</label><div class="seg">' + [['high', '称过 / 包装'], ['med', '参考值'], ['low', '目测 / AI']].map(c =>
          '<button data-act="set-conf" data-v="' + c[0] + '" class="' + (E.confOf(e) === c[0] ? 'on' : '') + '">' + c[1] + '</button>').join('') + '</div></div>' +
        '<div class="notebox">可信度只影响“摄入区间”的宽度，不会改变热量本身。诚实地标出「目测」，比假装精确更有用。</div>' +
        pantryEntryBlock(e) +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-danger" data-act="delete-entry" data-id="' + id + '">删除</button><button class="btn btn-primary" style="flex:1" data-act="save-entry">保存修改</button></div>',
      'entry'
    );
  }

  /* ============================================================
     运动
     ============================================================ */
  const TRIP_TYPES = ['walk', 'run', 'bike', 'swim', 'hike', 'row', 'rope', 'stairs', 'yoga'];
  const TRIP_LEVELS = { low: '低强度', mid: '中强度', high: '高强度' };
  function tripReady() { return !!(window.Trip && window.Trip.MET_TABLE); }
  function exMets(type, intensity) {
    const m = tripReady() ? Trip.MET_TABLE[type] : null;
    return m ? m[String(intensity || 'mid').toLowerCase()] || m.mid : 0;
  }
  function exPreview(sd) {
    const mets = exMets(sd.selected, sd.intensity);
    const kg = currentWeight();
    const minutes = clamp(Number(sd.minutes) || 0, 0, 720);
    const ascent = sd.selected === 'hike' ? Math.max(0, Number(sd.ascent) || 0) : 0;
    const kcal = mets && minutes ? E.burn(mets, kg, minutes) : 0;
    const km = tripReady() ? Trip.toEquivalentKm(kcal, kg, ascent) : 0;
    return { mets: mets, kg: kg, minutes: minutes, ascent: ascent, kcal: kcal, km: km };
  }
  function refreshExPreview() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise' || !sd.selected || !tripReady()) return;
    const pv = exPreview(sd);
    const k = $('#exKcalVal');
    if (k) k.innerHTML = pv.kcal + '<small> kcal</small>';
    const m = $('#exKmVal');
    if (m) m.innerHTML = round1(pv.km).toFixed(1) + '<small> km</small>';
    const b = $('#exSaveBtn');
    if (b && !b.disabled) b.textContent = '记入 · ' + pv.kcal + ' kcal · ' + round1(pv.km).toFixed(1) + ' km';
  }

  function openExerciseSheet() {
    const date = state.tab === 'ledger' ? state.recordDate : E.todayKey();
    state.sheetData = { type: 'exercise', date: date, selected: null, intensity: 'mid', minutes: 30, distance: '', ascent: '', query: '' };
    openSheet(
      sheetHead('记录运动', 'kcal 与运动消耗同一套公式；里程计入环游记') +
      '<div class="sheet-body">' +
        '<div id="exList" style="margin-top:4px"></div>' +
        '<div id="exCalc"></div>' +
        '<div class="search-caption" style="margin-top:18px"><span class="k">' + E.relativeDay(date, E.todayKey()) + '已记录</span></div>' +
        '<div id="exToday"></div>' +
        '<div class="notebox">估算公式：METs × 体重(kg) × 时长(小时) × 1.05（与「运动消耗」完全一致）。里程 = kcal ÷ 体重，登山另加 100 m 爬升折 1 km；异常记录只存档、不推进进度。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" style="flex:1" id="exSaveBtn" data-act="save-exercise" disabled>选择类型</button></div>',
      'exercise'
    );
    renderExList();
    renderExCalc();
    renderExToday();
    if (!tripReady()) ensureTrip().then(ok => {
      if (!ok || !state.sheetData || state.sheetData.type !== 'exercise') return;
      renderExList();
      renderExCalc();
    });
  }

  function renderExList() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise') return;
    const box = $('#exList');
    if (!box || !tripReady()) return;
    box.innerHTML = '<div class="ex-grid">' + TRIP_TYPES.map(t => {
      const m = Trip.MET_TABLE[t];
      return '<button type="button" class="ex-row' + (sd.selected === t ? ' on' : '') + '" data-act="ex-select" data-id="' + t + '">' +
        '<span class="n">' + esc(m.label) + '</span>' +
        '<span class="k">METs ' + m.mid + ' · 30 分钟约 ' + E.burn(m.mid, currentWeight(), 30) + ' kcal</span></button>';
    }).join('') + '</div>';
  }

  function renderExCalc() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise') return;
    const box = $('#exCalc');
    if (!box) return;
    if (!sd.selected || !tripReady()) {
      box.innerHTML = '<div class="ex-calc" style="margin-top:14px"><div class="note">先选一类运动，再填时长；距离、爬升、次数按类目出现。</div></div>';
      const b = $('#exSaveBtn');
      if (b) { b.disabled = true; b.textContent = '选择类型'; }
      return;
    }
    const m = Trip.MET_TABLE[sd.selected];
    const pv = exPreview(sd);
    const spec = Trip.FIELD_SPEC[sd.selected] || {};
    const dist = Math.max(0, Number(sd.distance) || 0);
    const speed = sd.minutes > 0 && dist > 0 ? round1(dist / (sd.minutes / 60)) : 0;
    const pace = dist > 0 && sd.minutes > 0 ? round1(sd.minutes / dist) : 0;
    const strokes = ['自由泳', '蛙泳', '仰泳', '蝶泳'];
    box.innerHTML = '<div class="ex-calc"><div class="row-between"><span class="strong">' + esc(m.label) + '</span>' +
      '<span class="tiny faint">METs ' + pv.mets + ' · 体重 ' + pv.kg + ' kg</span></div>' +
      '<div class="seg ex-seg" style="margin-top:10px">' + ['low', 'mid', 'high'].map(k =>
        '<button data-act="ex-intensity" data-v="' + k + '" class="' + (sd.intensity === k ? 'on' : '') + '">' + TRIP_LEVELS[k] + '</button>').join('') + '</div>' +
      '<div class="form-grid" style="margin-top:10px;align-items:end">' +
        '<div class="field" style="margin:0"><label>时长（分钟）</label><input class="input input-num" id="exMinutes" type="number" min="1" max="720" value="' + sd.minutes + '"></div>' +
        (spec.distance ? '<div class="field" style="margin:0"><label>距离 km</label><input class="input input-num" id="exDistance" type="number" min="0" step="0.1" value="' + esc(sd.distance || '') + '" placeholder="选填"></div>' : '') +
        (spec.ascent ? '<div class="field" style="margin:0"><label>爬升 m</label><input class="input input-num" id="exAscent" type="number" min="0" max="3000" step="10" value="' + esc(sd.ascent || '') + '"></div>' : '') +
        (spec.jumps ? '<div class="field" style="margin:0"><label>跳绳次数</label><input class="input input-num" id="exJumps" type="number" min="0" max="20000" step="10" value="' + esc(sd.jumps || '') + '"></div>' : '') +
        (spec.floors ? '<div class="field" style="margin:0"><label>楼层数</label><input class="input input-num" id="exFloors" type="number" min="0" max="300" step="1" value="' + esc(sd.floors || '') + '"></div>' : '') +
      '</div>' +
      (spec.stroke ? '<div class="seg ex-seg" style="margin-top:10px">' + strokes.map(k =>
        '<button data-act="ex-stroke" data-v="' + k + '" class="' + ((sd.stroke || '蛙泳') === k ? 'on' : '') + '">' + k + '</button>').join('') + '</div>' : '') +
      ((spec.speed || spec.pace) ? '<div class="tiny faint" style="margin-top:8px">' +
        (spec.speed ? '均速 ' + (speed ? speed.toFixed(1) + ' km/h' : '—（填距离后显示）') : '') +
        (spec.pace ? ' · 配速 ' + (pace ? pace.toFixed(1) + ' 分/km' : '—（填距离后显示）') : '') + '</div>' : '') +
      '<div class="ex-preview" style="margin-top:10px"><div class="v" id="exKcalVal">' + pv.kcal + '<small> kcal</small></div>' +
      '<div class="v2" id="exKmVal">' + round1(pv.km).toFixed(1) + '<small> km</small></div>' +
      '<div class="tiny faint">估算消耗 · 折算里程（手记 L0 · 1×）</div></div>' +
      '</div>';
    const b = $('#exSaveBtn');
    if (b) { b.disabled = false; b.textContent = '记入 · ' + pv.kcal + ' kcal · ' + round1(pv.km).toFixed(1) + ' km'; }
  }

  function renderExToday() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'exercise') return;
    const box = $('#exToday');
    if (!box) return;
    const list = DB.exercises.filter(x => x.date === sd.date);
    box.innerHTML = list.length ? list.map(x => {
      const bad = x.valid === false;
      return '<div class="ex-item"><span>' + esc(x.name) + '</span>' +
        '<span class="tiny faint">' + x.minutes + ' 分钟</span>' +
        '<span class="k">' + fmt(x.kcal) + ' kcal · ' + round1(recKmEq(x)).toFixed(1) + ' km</span>' +
        confBadge(x) +
        '<button class="x" data-act="del-exercise" data-id="' + x.id + '" aria-label="删除">' + icon('close') + '</button></div>';
    }).join('') : '<div class="cart-empty">这一天还没有运动记录。</div>';
  }

  function saveExercise() {
    const sd = state.sheetData;
    if (!sd || !sd.selected || !tripReady()) return;
    const m = Trip.MET_TABLE[sd.selected];
    const intensity = sd.intensity || 'mid';
    const mets = exMets(sd.selected, intensity);
    const minutes = clamp(Number(sd.minutes) || 30, 1, 720);
    const kg = currentWeight();
    const spec = Trip.FIELD_SPEC[sd.selected] || {};
    const ascent = spec.ascent ? Math.max(0, Number(sd.ascent) || 0) : 0;
    const distance = spec.distance ? Math.max(0, Number(sd.distance) || 0) : 0;
    const jumps = spec.jumps ? Math.max(0, Math.round(Number(sd.jumps) || 0)) : 0;
    const floors = spec.floors ? Math.max(0, Math.round(Number(sd.floors) || 0)) : 0;
    const stroke = spec.stroke ? (sd.stroke || '蛙泳') : '';
    const kcal = E.burn(mets, kg, minutes);
    const dayTotal = DB.exercises.filter(x => x.date === sd.date).reduce((s, x) => s + (Number(x.minutes) || 0), 0) + minutes;
    const rec = {
      id: uid(), date: sd.date, type: sd.selected, name: m.label, intensity: intensity, mets: mets,
      minutes: minutes, distance_km: distance, ascent_m: ascent, weight_at_time: kg,
      jumps: jumps, floors: floors, stroke: stroke,
      kcal: kcal, km_eq: 0, valid: true, invalid_code: null,
      source: 'manual', confidence: 'L0', multiplier: 1, createdAt: Date.now()
    };
    const km = Trip.toEquivalentKm(kcal, kg, ascent);
    const v = Trip.validateRecord(Object.assign({}, rec, { km_eq: km }), dayTotal);
    if (v.ok) rec.km_eq = km;
    else { rec.valid = false; rec.invalid_code = v.code; rec.km_eq = 0; }
    const before = DB.exercises.length;
    const tripBefore = { km: DB.trip.total_km, at: DB.trip.updatedAt };
    DB.exercises.push(rec);
    syncTrip(false);
    if (!commit(() => {
      DB.exercises.length = before;
      DB.trip.total_km = tripBefore.km;
      DB.trip.updatedAt = tripBefore.at;
    })) return;
    closeSheet();
    renderActive();
    if (v.ok) toast('已记录 ' + m.label + ' ' + minutes + ' 分钟 · ' + round1(km).toFixed(1) + ' km');
    else toast('仅存档：' + v.message);
  }

  /* ============================================================
     体重
     ============================================================ */
  function weightHistHtml() {
    if (!DB.weights.length) return '';
    const hist = DB.weights.slice().sort((a, b) => (a.date < b.date ? 1 : (a.date > b.date ? -1 : 0))).slice(0, 30);
    return '<div class="w-hist">' +
      '<div class="w-hist-head"><span>最近记录</span><span>' + DB.weights.length + ' 条</span></div>' +
      hist.map(w => '<div class="w-row"><span class="d">' + E.shortLabel(w.date) + '</span>' +
        '<span class="v">' + w.kg + ' kg</span>' +
        '<button type="button" class="icon-mini danger" data-act="delete-weight" data-date="' + w.date + '" aria-label="删除 ' + w.date + ' 的体重记录">' + icon('trash') + '</button></div>').join('') +
      '<div class="w-hist-note">删除后体重预测与周报会按剩余记录重算。</div>' +
    '</div>';
  }
  function deleteWeight(date) {
    const item = DB.weights.find(w => w.date === date);
    if (!item) return;
    confirmSheet('删除这条体重记录',
      '将删除 <b>' + E.dateLabel(date) + '</b> 的 <b>' + item.kg + ' kg</b>。删除后体重预测与周报会按剩余记录重算。',
      '删除', true).then(ok => {
        if (!ok) return;
        const before = DB.weights.map(w => ({ ...w }));
        const pw = DB.profile.weight;
        DB.weights = DB.weights.filter(w => w.date !== date);
        const lw = E.latestWeight(DB.weights, DB.profile);
        DB.profile.weight = lw ? lw.kg : pw;
        if (!commit(() => { DB.weights = before; DB.profile.weight = pw; })) return;
        renderActive();
        if (state.sheet === 'weight') openWeightSheet();
        toast('已删除 ' + E.dateLabel(date) + ' 的体重记录');
      });
  }
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
          '<div class="i"><div class="k">趋势值</div><div class="v">' + (trendNow != null ? round1(trendNow) : '—') + ' <small>kg</small></div></div>' +
          '<div class="i"><div class="k">近 7 天变化</div><div class="v ' + (weekAgo != null && trendNow != null && trendNow - weekAgo < 0 ? 'green' : '') + '">' + (weekAgo != null && trendNow != null ? (trendNow - weekAgo > 0 ? '+' : '') + round1(trendNow - weekAgo) : '—') + ' <small>kg</small></div></div>' +
          '<div class="i"><div class="k">当前节奏</div><div class="v">' + (fore ? (fore.weekly > 0 ? '+' : '') + fore.weekly : '—') + ' <small>kg/周</small></div></div>' +
        '</div>' +
        '<div class="notebox">体重一天内会因水分、盐分、碳水摄入波动 0.5–1.5 kg。账本用 EMA 趋势与回归斜率，而不是单日数字。' + (date !== E.todayKey() ? ' 你正在补记 ' + E.dateLabel(date) + ' 的体重。' : '') + '</div>' +
        (weightHistHtml()) +
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
    const apply = () => {
      const wBefore = DB.weights.map(w => ({ ...w }));
      const pw = DB.profile.weight;
      if (idx > -1) DB.weights[idx].kg = rounded;
      else DB.weights.push({ date: sd.date, kg: rounded });
      const lw = E.latestWeight(DB.weights, DB.profile);
      DB.profile.weight = lw ? lw.kg : rounded;
      if (!commit(() => { DB.weights = wBefore; DB.profile.weight = pw; })) return;
      closeSheet();
      renderActive();
      toast('已记录 ' + rounded + ' kg · 趋势会吸收这次波动');
    };
    if (idx > -1 && Math.abs(DB.weights[idx].kg - rounded) >= 0.1) {
      const old = DB.weights[idx].kg;
      confirmSheet('这一天已有体重记录',
        '已有 <b>' + old + ' kg</b>，要替换成 <b>' + rounded + ' kg</b> 吗？',
        '替换').then(ok => { if (ok) apply(); });
      return;
    }
    apply();
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
    const aiNote = STATIC_MODE
      ? '静态版：浏览器直接请求你填写的接口，API Key 只保存在本机。通义千问 VL 可以直连；智谱 / OpenAI 会被跨域拦截，需要本机代理。'
      : (fileMode ? '识别在本机代理转发，API Key 只保存在这台设备。' : '你正在双击打开网页，浏览器会拦截跨域请求。请用「启动账本.bat」打开后再用 AI 识别。');
    state.sheetData = { type: 'ai', date: date, meal: E.guessMeal(), image: null, text: '', items: [] };
    const presets = [
      ['通义千问 VL', AI_QWEN.baseURL, AI_QWEN.model],
      ['智谱 GLM', AI_GLM.baseURL, AI_GLM.model],
      ['OpenAI', 'https://api.openai.com/v1', 'gpt-4o-mini']
    ];
    openSheet(
      sheetHead('AI 识别', '拍照或描述一餐，AI 给出候选食物与克数') +
      '<div class="sheet-body">' +
        '<div class="field"><label>餐次</label><div class="seg">' + E.MEALS.map(m => '<button data-act="set-meal" data-v="' + m[0] + '" class="' + (m[0] === state.sheetData.meal ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div></div>' +
        '<div class="notebox" style="margin-bottom:14px">' + aiNote + '</div>' +
        '<div class="search-caption"><span class="k">识别设置</span><span class="tiny faint">OpenAI 兼容接口 · Key 只存本机</span></div>' +
        '<div class="field"><label>API Key</label><input class="input" id="aiKey" type="password" value="' + esc(cfg.key || '') + '" placeholder="如 sk-…（只保存在本机）"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>接口地址</label><input class="input" id="aiBase" value="' + esc(cfg.baseURL || AI_DEFAULT.baseURL) + '"></div>' +
          '<div class="field"><label>模型</label><input class="input" id="aiModel" value="' + esc(cfg.model || AI_DEFAULT.model) + '"></div>' +
        '</div>' +
        '<div class="chip-row" style="margin-top:8px">' + presets.map(p =>
          '<button class="chip" data-act="ai-preset" data-base="' + p[1] + '" data-model="' + p[2] + '">' + p[0] + '</button>').join('') + '</div>' +
        '<div class="tiny faint" style="margin-top:6px">静态版推荐通义千问；智谱 / OpenAI 需要后端代理。</div>' +
        '<div class="form-grid" style="margin-top:12px">' +
          '<div class="field"><label>照片</label><label class="file-btn" for="aiFile">' + icon('camera') + '选择并压缩</label><input id="aiFile" type="file" accept="image/*" capture="environment" style="display:none"></div>' +
          '<div class="field"><label>或文字描述</label><textarea class="input" id="aiText" rows="3" placeholder="例：一碗牛肉面，两个煎蛋，一杯豆浆"></textarea></div>' +
        '</div>' +
        '<div id="aiPreview"></div>' +
        '<div class="row" style="margin:12px 0">' +
          '<button class="btn btn-primary btn-sm" data-act="ai-run" id="aiRunBtn" style="flex:1">开始识别</button>' +
          (STATIC_MODE ? '<button class="btn btn-ghost btn-sm" data-act="ai-test" id="aiTestBtn">测试</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-act="ai-save-config">保存</button>' +
        '</div>' +
        '<div id="aiResults"></div>' +
        '<div class="notebox">AI 识别属于「目测级」估算，误差通常在 20–40%。识别后请核对克数；账本会把这类记录标为「粗」，并计入更宽的区间。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" style="flex:1" id="aiSaveBtn" data-act="save-ai-results" disabled>记入识别结果</button></div>',
      'ai'
    );
  }

  function readAIConfig() {
    return {
      key: ($('#aiKey') && $('#aiKey').value.trim()) || '',
      baseURL: (($('#aiBase') && $('#aiBase').value.trim()) || AI_DEFAULT.baseURL).replace(/\/+$/, ''),
      model: ($('#aiModel') && $('#aiModel').value.trim()) || AI_DEFAULT.model
    };
  }

  function aiErrorMessage(raw, status) {
    let msg = (raw && raw.error && (raw.error.message || raw.error)) || (raw && raw.message) || ('HTTP ' + status);
    msg = String(msg);
    if (status === 401 || status === 403) return 'API Key 无效或无权限：' + msg;
    if (status === 404) return '接口地址或模型名不对：' + msg;
    if (status === 429) return '请求太频繁或额度用完：' + msg;
    return msg;
  }

  function aiNetworkError(err) {
    const m = (err && err.message) || '网络异常';
    if (/failed to fetch|networkerror|load failed|fetch/i.test(m)) {
      return '浏览器直连被拦截（跨域或网络不可达）。通义千问 VL 可以直连；智谱 GLM / OpenAI 需要本机代理。';
    }
    return m;
  }

  function saveAIConfig() {
    const cfg = readAIConfig();
    DB.settings.ai = cfg;
    saveDB();
    toast('识别设置已保存在本机');
    return cfg;
  }

  async function callAIRequest(opts) {
    const baseURL = String(opts.baseURL || '').replace(/\/+$/, '');
    if (STATIC_MODE) {
      const content = [{ type: 'text', text: opts.prompt }];
      if (opts.image) content.push({ type: 'image_url', image_url: { url: opts.image } });
      let res;
      try {
        res = await fetch(baseURL + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + opts.key },
          body: JSON.stringify({
            model: opts.model,
            messages: [{ role: 'user', content: content }],
            temperature: 0.2,
            max_tokens: 1200
          })
        });
      } catch (e) {
        throw new Error(aiNetworkError(e));
      }
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(aiErrorMessage(raw, res.status));
      return raw;
    }
    let res;
    try {
      res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseURL: baseURL, apiKey: opts.key, model: opts.model, prompt: opts.prompt, image: opts.image || null, text: '' })
      });
    } catch (e) {
      throw new Error('无法连接本机代理：' + (e.message || '网络异常'));
    }
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(aiErrorMessage(raw, res.status));
    return raw;
  }

  async function callAI(opts) {
    const t0 = Date.now();
    try {
      const raw = await callAIRequest(opts);
      recordAI(true, Date.now() - t0);
      return raw;
    } catch (err) {
      recordAI(false, Date.now() - t0);
      throw err;
    }
  }

  async function testAIConnection() {
    const cfg = readAIConfig();
    if (!cfg.key) { toast('先填写 API Key'); return; }
    saveAIConfig();
    const btn = $('#aiTestBtn');
    const box = $('#aiResults');
    if (btn) { btn.disabled = true; btn.textContent = '测试中…'; }
    if (box) box.innerHTML = '<div class="cart-empty">正在请求 ' + esc(cfg.model) + ' …</div>';
    try {
      const raw = await callAI({ baseURL: cfg.baseURL, key: cfg.key, model: cfg.model, prompt: '只回复 OK 两个字母，不要解释。', image: null });
      const content = raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content;
      if (box) box.innerHTML = '<div class="notebox">连接成功 · 模型返回：' + esc(String(content || '（空）').slice(0, 80)) + '</div>';
      toast('连接成功');
    } catch (e) {
      if (box) box.innerHTML = '<div class="notebox" style="color:var(--red)">' + esc(e.message || '连接失败') + '</div>';
      toast('连接失败');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '测试'; }
    }
  }

  async function runAI() {
    if (location.protocol === 'file:') {
      toast('请用「启动账本.bat」打开后再使用 AI 识别');
      return;
    }
    const sd = state.sheetData;
    if (!sd) return;
    const cfg = readAIConfig();
    const text = ($('#aiText') && $('#aiText').value.trim()) || '';
    if (!cfg.key) { toast('先填写 API Key'); return; }
    if (!sd.image && !text) { toast('先拍照，或写一句描述'); return; }
    DB.settings.ai = cfg;
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
      const raw = await callAI({ baseURL: cfg.baseURL, key: cfg.key, model: cfg.model, prompt: prompt, image: sd.image });
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
    const before = DB.entries.length;
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
    if (!commit(() => { DB.entries.length = before; })) return;
    closeSheet();
    renderActive();
    toast('已记入 ' + E.mealLabel(sd.meal) + ' · ' + total + ' kcal');
  }

  /* ============================================================
     v3.1 · 问账本（AI 教练）
     ============================================================ */
  function coachFacts() {
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) return null;
    const { t, ad, budget, sum, remain } = st;
    const from = E.addDays(today, -6);
    const dayMap = {};
    let exMinutes = 0;
    DB.exercises.forEach(x => {
      if (x.date >= from && x.date <= today) exMinutes += Number(x.minutes) || 0;
    });
    DB.entries.forEach(e => {
      if (e.date >= from && e.date <= today) dayMap[e.date] = (dayMap[e.date] || 0) + (Number(e.kcal) || 0);
    });
    const days = Object.keys(dayMap);
    const avgIntake = days.length ? Math.round(days.reduce((s, k) => s + dayMap[k], 0) / days.length) : 0;
    const wFrom = E.addDays(today, -7);
    const wOld = DB.weights.filter(w => w.date >= wFrom && w.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1))[0] || null;
    const wNew = E.latestWeight(DB.weights, DB.profile);
    const gp = G.of(DB.profile);
    const ci = gp.cycleEnabled ? W.cycleInfo(DB.cycle, today) : null;
    const check = DB.checkins.filter(c => c.date === today).pop() || null;
    const todayEntries = DB.entries.filter(e => e.date === today);
    const todaySupp = DB.supplements.filter(s => s.date === today);
    const nut = W.nutrientTotals(todayEntries, todaySupp);
    const nt = W.nutrientTargets(DB.profile);
    return { today, t, ad, budget, sum, remain, avgIntake, days: days.length, wOld, wNew, ci, check, nut, nt, exMinutes };
  }

  function coachContextText(f) {
    const lines = [];
    lines.push('[今日] ' + f.today + ' 预算 ' + fmt(f.budget) + ' kcal；已摄入 ' + fmt(f.sum.kcal) + ' kcal；剩余 ' + fmt(f.remain) + ' kcal；蛋白 ' + Math.round(f.sum.p) + '/' + f.t.protein + 'g；纤维 ' + Math.round(f.sum.fib) + '/' + f.t.fiber + 'g');
    lines.push('[近7天] 有记录 ' + f.days + ' 天，平均摄入 ' + fmt(f.avgIntake) + ' kcal；运动 ' + f.exMinutes + ' 分钟');
    if (f.wOld && f.wNew) lines.push('[体重] ' + f.wOld.date + ' ' + f.wOld.kg + ' kg → 最近 ' + f.wNew.kg + ' kg；趋势值 ' + (f.ad.trendWeight != null ? f.ad.trendWeight : '—') + ' kg');
    else if (f.wNew) lines.push('[体重] 最近 ' + f.wNew.kg + ' kg；趋势值 ' + (f.ad.trendWeight != null ? f.ad.trendWeight : '—') + ' kg');
    lines.push('[代谢] 采用消耗 ' + fmt(f.ad.tdee) + ' ± ' + fmt(f.ad.band) + ' kcal，校准度 ' + f.ad.percent + '%');
    if (f.ci) lines.push('[周期] ' + f.ci.phaseLabel + ' 第 ' + f.ci.day + ' 天，距下次约 ' + f.ci.daysToNext + ' 天');
    if (f.check) lines.push('[状态] 饿 ' + f.check.hunger + '/5，馋 ' + f.check.craving + '/5，情绪 ' + f.check.mood + '/5' + (f.check.symptoms.length ? '，症状 ' + f.check.symptoms.join('、') : ''));
    lines.push('[关键营养] 铁 ' + f.nut.iron + '/' + f.nt.iron + 'mg，钙 ' + f.nut.calcium + '/' + f.nt.calcium + 'mg，维D ' + f.nut.vd + '/' + f.nt.vd + 'μg，叶酸 ' + f.nut.folate + '/' + f.nt.folate + 'μg');
    const meals = E.MEALS.map(m => {
      const items = (f.sum.byMeal[m[0]] && f.sum.byMeal[m[0]].items) || [];
      if (!items.length) return null;
      return m[1] + ' ' + items.slice(0, 3).map(i => i.name + ' ' + Math.round(i.kcal) + 'kcal').join('、');
    }).filter(Boolean);
    if (meals.length) lines.push('[今天的餐] ' + meals.join('；'));
    return lines.join('\n');
  }

  function coachPrompt(question) {
    const f = coachFacts();
    if (!f) return null;
    return '你是「能量账本」里的私人饮食教练。用户只要一个能马上执行的建议。\n' +
      '规则：1) 只能使用下面给出的数字，不要编造；2) 先给结论，再给一个具体到食物和份量的建议；3) 总共不超过 3 句话；4) 不做医疗诊断，不劝节食，不用羞辱性语气；5) 数据不足就直说；6) 只输出纯文本，不要 Markdown、不要列表符号。\n\n' +
      coachContextText(f) + '\n\n[用户问题] ' + question;
  }

  function renderCoachMessages() {
    const c = state.coach;
    if (!c || !c.messages.length) return '<div class="coach-empty">还没有对话。挑一个问题，或自己写一句。</div>';
    return c.messages.map(m =>
      '<div class="coach-msg ' + (m.role === 'user' ? 'user' : 'ai') + (m.pending ? ' pending' : '') + '">' + esc(m.text) +
      (m.retry ? '<button class="coach-retry" data-act="coach-retry">重试</button>' : '') +
      '</div>'
    ).join('');
  }

  function openCoachSheet() {
    if (!state.coach) state.coach = { messages: [] };
    const cfg = DB.settings.ai || {};
    const gp = G.of(DB.profile);
    const suggestions = gp.coachSuggestions;
    const f = coachFacts();
    const ctx = f ? '<div class="coach-ctx">' +
      '<span>剩余 ' + fmt(f.remain) + ' kcal</span>' +
      '<span>蛋白 ' + Math.round(f.sum.p) + '/' + f.t.protein + 'g</span>' +
      '<span>7 天均 ' + fmt(f.avgIntake) + ' kcal</span>' +
      (f.ci ? '<span>' + esc(f.ci.phaseLabel) + '</span>' : '') +
      '</div>' : '';
    if (!cfg.key) {
      openSheet(
        sheetHead('问账本', 'AI 教练 · 只看你自己的数字') +
        '<div class="sheet-body">' + ctx +
          '<div class="notebox">问账本需要一个 AI Key。它只会把下面这段数字摘要和你的问题发给你选择的模型；账本本身不上传记录。</div>' +
          '<div class="row" style="margin-top:12px"><button class="btn btn-ghost" data-act="close-sheet">稍后</button><button class="btn btn-primary" style="flex:1" data-act="coach-config">去配置 AI</button></div>' +
        '</div>',
        'coach'
      );
      return;
    }
    openSheet(
      sheetHead('问账本', 'AI 教练 · 只看你自己的数字', '<button class="btn-quiet tiny" data-act="coach-clear" style="margin-right:4px;color:var(--ink-3)">清空对话</button>') +
      '<div class="sheet-body coach-sheet" id="coachBody">' + ctx +
        '<div class="coach-msgs" id="coachMsgs">' + renderCoachMessages() + '</div>' +
        '<div class="chip-row">' + suggestions.map(q =>
          '<button class="chip" data-act="coach-suggest" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>' +
      '</div>' +
      '<div class="sheet-foot" style="display:block"><div class="coach-input">' +
        '<textarea class="input" id="coachInput" rows="2" maxlength="300" placeholder="问一句，例如：今晚吃什么能补够蛋白？"></textarea>' +
        '<button class="coach-send" data-act="coach-send" id="coachSend">发送</button>' +
      '</div><div class="coach-hint">问题与数字摘要会发送给你配置的模型服务商；回答是估算，不是医疗建议。</div></div>',
      'coach'
    );
  }

  function updateCoachView() {
    const box = $('#coachMsgs');
    if (!box) return;
    box.innerHTML = renderCoachMessages();
    const last = box.lastElementChild;
    if (last && last.scrollIntoView) last.scrollIntoView({ block: 'nearest' });
    const send = $('#coachSend');
    if (send) send.disabled = !!state.coachBusy;
  }

  async function sendCoachQuestion(q) {
    const input = $('#coachInput');
    const text = String(q || (input && input.value) || '').trim();
    if (!text) { toast('先写一句问题'); return; }
    const cfg = DB.settings.ai || {};
    if (!cfg.key) { toast('先配置 AI Key'); return; }
    if (state.coachBusy) return;
    if (!state.coach) state.coach = { messages: [] };
    state.coachBusy = true;
    state.coachLast = text;
    state.coach.messages.push({ role: 'user', text: text });
    state.coach.messages.push({ role: 'ai', text: '正在读你的账本…', pending: true });
    if (input) input.value = '';
    updateCoachView();
    const prompt = coachPrompt(text) || text;
    try {
      const raw = await callAI({ baseURL: cfg.baseURL, key: cfg.key, model: cfg.model, prompt: prompt, image: null });
      const content = raw.choices && raw.choices[0] && raw.choices[0].message && raw.choices[0].message.content;
      state.coach.messages.pop();
      state.coach.messages.push({ role: 'ai', text: String(content || '模型没有返回内容').trim().slice(0, 1200) });
    } catch (err) {
      state.coach.messages.pop();
      state.coach.messages.push({ role: 'ai', text: '请求失败：' + (err.message || '网络异常'), retry: true });
    } finally {
      state.coachBusy = false;
      updateCoachView();
    }
  }

  /* ============================================================
     v3.1 · PIN 锁 / 健康数据
     ============================================================ */
  function pinHash(pin) {
    let h = 2166136261;
    const s = 'energy-ledger:' + String(pin);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function openPinSheet() {
    const p = DB.settings.pin || {};
    state.sheetData = { type: 'pin' };
    const body = p.on
      ? '<div class="sheet-body">' +
          '<div class="field"><label>新的 PIN（4–8 位数字）</label><input class="input input-num" id="pinNew" inputmode="numeric" maxlength="8" placeholder="留空则不修改"></div>' +
          '<div class="notebox">PIN 只用来遮挡随手打开的人，不是加密。清除浏览器数据或换设备都不会保留它。</div>' +
          '<button class="btn btn-ghost btn-block" style="margin-top:12px;color:var(--ink-3)" data-act="pin-off">关闭 PIN 锁</button>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="pin-save">保存</button></div>'
      : '<div class="sheet-body">' +
          '<div class="field"><label>设置 PIN（4–8 位数字）</label><input class="input input-num" id="pinNew" inputmode="numeric" maxlength="8" placeholder="例如 2468"></div>' +
          '<div class="notebox">PIN 只用来遮挡随手打开的人，不是加密。忘记 PIN 只能清除浏览器数据重置，账本也会一起丢失，建议先导出备份。</div>' +
        '</div>' +
        '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="pin-save">开启 PIN 锁</button></div>';
    openSheet(sheetHead('PIN 锁', '本机遮挡 · 不是加密') + body, 'pin');
  }

  function savePin() {
    const input = $('#pinNew');
    const val = input ? input.value.trim() : '';
    if (DB.settings.pin.on && !val) { closeSheet(); toast('PIN 未修改'); return; }
    if (!/^\d{4,8}$/.test(val)) { toast('PIN 需要 4–8 位数字'); return; }
    DB.settings.pin = { on: true, hash: pinHash(val) };
    saveDB();
    closeSheet();
    renderActive();
    toast('PIN 锁已开启');
  }

  function disablePin() {
    confirmSheet('关闭 PIN 锁？', '之后打开账本不再需要输入 PIN。', '关闭', true).then(ok => {
      if (!ok) return;
      DB.settings.pin = { on: false, hash: '' };
      saveDB();
      closeSheet();
      renderActive();
      toast('PIN 锁已关闭');
    });
  }

  function showLock() {
    if (!DB.settings.pin.on || !DB.settings.pin.hash) return;
    if ($('#lockRoot')) return;
    const el = document.createElement('div');
    el.id = 'lockRoot';
    el.innerHTML = '<div class="lock-overlay"><div class="lock-box" id="lockBox">' +
      '<div class="lock-mark">' + icon('lock') + '</div>' +
      '<div class="lock-title">能量账本</div>' +
      '<div class="lock-sub">输入 PIN 解锁<br>数据仍只保存在这台设备</div>' +
      '<input class="lock-input" id="lockPin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••">' +
      '<div class="lock-err" id="lockErr"></div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:6px" data-act="unlock">解锁</button>' +
      '</div></div>';
    document.body.appendChild(el);
    document.documentElement.style.overflow = 'hidden';
    const i = $('#lockPin');
    if (i) i.focus();
  }

  function tryUnlock() {
    const i = $('#lockPin');
    const err = $('#lockErr');
    const val = i ? i.value.trim() : '';
    if (pinHash(val) === DB.settings.pin.hash) {
      const root = $('#lockRoot');
      if (root) root.remove();
      document.documentElement.style.overflow = '';
      renderActive();
      return;
    }
    if (err) err.textContent = 'PIN 不正确';
    const box = $('#lockBox');
    if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
    if (i) { i.value = ''; i.focus(); }
  }

  function lockNow() {
    if (!DB.settings.pin.on) { toast('还没有设置 PIN'); return; }
    closeSheet();
    showLock();
  }

  function exportHealthCSV() {
    const rows = [['日期', '类型', '项目', '数值', '单位', '备注']];
    const push = (d, t, k, v, u, n) => { if (d) rows.push([d, t, k, v, u || '', n || '']); };
    DB.weights.forEach(w => push(w.date, '体重', '体重', w.kg, 'kg', ''));
    DB.measures.forEach(m => {
      if (m.waist) push(m.date, '围度', '腰围', m.waist, 'cm', m.note);
      if (m.hip) push(m.date, '围度', '臀围', m.hip, 'cm', m.note);
      if (m.thigh) push(m.date, '围度', '大腿', m.thigh, 'cm', m.note);
    });
    DB.checkins.forEach(c => {
      push(c.date, '状态', '饥饿', c.hunger, '1-5', '');
      push(c.date, '状态', '馋', c.craving, '1-5', c.symptoms.join('、'));
      push(c.date, '状态', '情绪', c.mood, '1-5', c.note);
    });
    DB.supplements.forEach(s => push(s.date, '补剂', s.name, s.iron || s.calcium || 0, 'mg', s.note));
    Object.keys(DB.water).forEach(k => push(k, '饮水', '饮水', DB.water[k], 'ml', ''));
    DB.exercises.forEach(x => push(x.date, '运动', x.name, x.minutes, '分钟', Math.round(Number(x.kcal) || 0) + ' kcal'));
    DB.entries.forEach(e => push(e.date, '饮食', e.name, Math.round(Number(e.kcal) || 0), 'kcal', (e.grams || '') + 'g'));
    if (rows.length === 1) { toast('还没有可导出的数据'); return; }
    rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const csv = '\uFEFF' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    downloadFile('能量账本-健康数据-' + dateStamp() + '.csv', csv, 'text/csv;charset=utf-8');
    toast('健康数据已导出');
  }

  /* ============================================================
     周期 / 围度 / 状态 / 补剂 / 偏好 / 报告
     ============================================================ */
  function openCycleSheet() {
    if (!G.of(DB.profile).cycleEnabled) { toast('当前档案使用男性版，不做周期记录'); return; }
    const c = DB.cycle || {};
    state.sheetData = { type: 'cycle' };
    openSheet(
      sheetHead('周期记录', '可选；只保存在本机') +
      '<div class="sheet-body">' +
        '<div class="field"><label>上次经期开始</label><input class="input" id="cycStart" type="date" max="' + E.todayKey() + '" value="' + esc(c.lastStart || E.todayKey()) + '"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>周期长度（天）</label><input class="input input-num" id="cycLength" type="number" min="21" max="40" value="' + (c.length || 28) + '"></div>' +
          '<div class="field"><label>经期长度（天）</label><input class="input input-num" id="cycPeriod" type="number" min="2" max="10" value="' + (c.periodLength || 5) + '"></div>' +
        '</div>' +
        '<div class="notebox">周期相位是估算，不用于避孕或诊断。开启后，经期与黄体最后几天的体重会从代谢校准中排除，避免水分把真实消耗算偏。</div>' +
        (c.enabled ? '<button class="btn btn-ghost btn-block" style="margin-top:12px;color:var(--ink-3)" data-act="cycle-off">关闭周期记录</button>' : '') +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="cycle-today">今天来月经了</button><button class="btn btn-primary" style="flex:1" data-act="cycle-save">保存周期</button></div>',
      'cycle'
    );
  }

  function saveCycle() {
    const start = ($('#cycStart') && $('#cycStart').value) || '';
    if (!start || start > E.todayKey()) { toast('请选择今天或之前的日期'); return; }
    const length = clamp(Number($('#cycLength') && $('#cycLength').value) || 28, 21, 40);
    const period = clamp(Number($('#cycPeriod') && $('#cycPeriod').value) || 5, 2, 10);
    const history = (DB.cycle.history || []).slice();
    if (history.indexOf(start) < 0) history.push(start);
    history.sort();
    const before = JSON.parse(JSON.stringify(DB.cycle || {}));
    DB.cycle = { enabled: true, lastStart: start, length: length, periodLength: period, history: history.slice(-12) };
    if (!commit(() => { DB.cycle = before; })) return;
    closeSheet();
    renderActive();
    toast('周期记录已更新');
  }

  function markPeriodToday() {
    const today = E.todayKey();
    const history = (DB.cycle.history || []).slice();
    if (history.indexOf(today) < 0) history.push(today);
    const before = JSON.parse(JSON.stringify(DB.cycle || {}));
    DB.cycle = {
      enabled: true,
      lastStart: today,
      length: DB.cycle.length || 28,
      periodLength: DB.cycle.periodLength || 5,
      history: history.sort().slice(-12)
    };
    if (!commit(() => { DB.cycle = before; })) return;
    closeSheet();
    renderActive();
    toast('已记录：今天开始，注意休息');
  }

  function stopCycle() {
    const before = DB.cycle.enabled;
    DB.cycle.enabled = false;
    if (!commit(() => { DB.cycle.enabled = before; })) return;
    closeSheet();
    renderActive();
    toast('周期记录已关闭，历史仍保留');
  }

  function openMeasureSheet() {
    const today = E.todayKey();
    const existing = DB.measures.find(m => m.date === today) || DB.measures[DB.measures.length - 1] || {};
    state.sheetData = { type: 'measure' };
    openSheet(
      sheetHead('记录围度', '低频记录，看趋势而不是单日') +
      '<div class="sheet-body">' +
        '<div class="field"><label>日期</label><input class="input" id="meaDate" type="date" max="' + today + '" value="' + today + '"></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>腰围 cm</label><input class="input input-num" id="meaWaist" type="number" step="0.1" min="0" value="' + (existing.waist || '') + '"></div>' +
          '<div class="field"><label>臀围 cm</label><input class="input input-num" id="meaHip" type="number" step="0.1" min="0" value="' + (existing.hip || '') + '"></div>' +
          '<div class="field"><label>大腿 cm</label><input class="input input-num" id="meaThigh" type="number" step="0.1" min="0" value="' + (existing.thigh || '') + '"></div>' +
        '</div>' +
        '<div class="field"><label>备注（可选）</label><input class="input" id="meaNote" maxlength="40" value="' + esc(existing.note || '') + '" placeholder="如：早晨空腹、同一位置"></div>' +
        '<div class="notebox">测量位置尽量固定，两周一次就够。围度下降往往早于体重变化。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-measure">保存围度</button></div>',
      'measure'
    );
    setTimeout(() => { const i = $('#meaWaist'); if (i) i.focus(); }, 80);
  }

  function saveMeasure() {
    const date = ($('#meaDate') && $('#meaDate').value) || E.todayKey();
    const waist = Number($('#meaWaist') && $('#meaWaist').value) || 0;
    const hip = Number($('#meaHip') && $('#meaHip').value) || 0;
    const thigh = Number($('#meaThigh') && $('#meaThigh').value) || 0;
    if (!waist && !hip && !thigh) { toast('至少填一个围度'); return; }
    const note = ($('#meaNote') && $('#meaNote').value.trim()) || '';
    const idx = DB.measures.findIndex(m => m.date === date);
    const item = { id: idx > -1 ? DB.measures[idx].id : uid(), date: date, waist: round1(waist), hip: round1(hip), thigh: round1(thigh), note: note };
    const before = DB.measures.map(m => ({ ...m }));
    if (idx > -1) DB.measures[idx] = item; else DB.measures.push(item);
    DB.measures.sort((a, b) => a.date < b.date ? -1 : 1);
    if (!commit(() => { DB.measures = before; })) return;
    closeSheet();
    renderActive();
    toast('围度已记录');
  }

  function rangeRow(id, label, hint, value) {
    return '<div class="range-row"><div class="range-label"><span>' + label + '</span><small>' + hint + '</small></div>' +
      '<input type="range" min="1" max="5" step="1" value="' + value + '" id="' + id + '">' +
      '<div class="range-val" id="' + id + 'Val">' + value + '</div></div>';
  }

  function openCheckinSheet() {
    const today = E.todayKey();
    const gp = G.of(DB.profile);
    const existing = DB.checkins.find(c => c.date === today);
    const c = existing || { hunger: 3, craving: 3, mood: 3, symptoms: [], note: '' };
    state.sheetData = { type: 'checkin', symptoms: c.symptoms.slice() };
    const symptoms = gp.body.symptoms;
    openSheet(
      sheetHead('今天的状态', '30 秒；不给饿和馋贴好坏标签') +
      '<div class="sheet-body">' +
        rangeRow('ckHunger', '饿', '1 不饿 · 5 很饿', c.hunger) +
        rangeRow('ckCraving', '馋', '1 没有 · 5 很强', c.craving) +
        rangeRow('ckMood', '情绪', '1 低落 · 5 很好', c.mood) +
        '<div class="field" style="margin-top:16px"><label>身体感受（可多选）</label><div class="chip-row symptom-chips">' + symptoms.map(s =>
          '<button class="chip ' + (state.sheetData.symptoms.indexOf(s) > -1 ? 'on' : '') + '" data-act="toggle-symptom" data-v="' + s + '">' + s + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>想补一句（可选）</label><textarea class="input" id="ckNote" rows="2" maxlength="80" placeholder="今天发生了什么？">' + esc(c.note || '') + '</textarea></div>' +
        '<div class="notebox">' + gp.body.checkinNote + '</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-checkin">保存</button></div>',
      'checkin'
    );
  }

  function saveCheckin() {
    const today = E.todayKey();
    const hunger = Number($('#ckHunger') && $('#ckHunger').value) || 3;
    const craving = Number($('#ckCraving') && $('#ckCraving').value) || 3;
    const mood = Number($('#ckMood') && $('#ckMood').value) || 3;
    const note = ($('#ckNote') && $('#ckNote').value.trim()) || '';
    const symptoms = (state.sheetData && state.sheetData.symptoms) || [];
    const idx = DB.checkins.findIndex(c => c.date === today);
    const item = { id: idx > -1 ? DB.checkins[idx].id : uid(), date: today, hunger: hunger, craving: craving, mood: mood, symptoms: symptoms, note: note };
    const before = DB.checkins.map(c => ({ ...c }));
    if (idx > -1) DB.checkins[idx] = item; else DB.checkins.push(item);
    if (!commit(() => { DB.checkins = before; })) return;
    closeSheet();
    renderActive();
    toast('今天的状态已记录');
  }

  function openSupplementSheet() {
    const today = E.todayKey();
    state.sheetData = { type: 'supplement' };
    openSheet(
      sheetHead('补剂记录', '只记录，不推荐剂量') +
      '<div class="sheet-body">' +
        '<div class="field"><label>名称</label><input class="input" id="supName" maxlength="30" placeholder="如：铁剂、钙片、维生素 D"></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label>铁 mg（可选）</label><input class="input input-num" id="supIron" type="number" min="0" step="1" placeholder="0"></div>' +
          '<div class="field"><label>钙 mg（可选）</label><input class="input input-num" id="supCalcium" type="number" min="0" step="1" placeholder="0"></div>' +
        '</div>' +
        '<div class="field"><label>备注</label><input class="input" id="supNote" maxlength="40" placeholder="如：随餐、医嘱"></div>' +
        '<div class="notebox">补剂剂量请遵医嘱或包装说明。账本只把它计入当日铁/钙总量，不做推荐。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-supplement">保存</button></div>',
      'supplement'
    );
  }

  function saveSupplement() {
    const name = ($('#supName') && $('#supName').value.trim()) || '';
    if (!name) { toast('给补剂写个名字'); return; }
    const iron = Number($('#supIron') && $('#supIron').value) || 0;
    const calcium = Number($('#supCalcium') && $('#supCalcium').value) || 0;
    const note = ($('#supNote') && $('#supNote').value.trim()) || '';
    const before = DB.supplements.length;
    DB.supplements.push({ id: uid(), date: E.todayKey(), name: name, iron: iron, calcium: calcium, note: note });
    if (!commit(() => { DB.supplements.length = before; })) return;
    closeSheet();
    renderActive();
    toast('补剂已记录');
  }

  function deleteSupplement(id) {
    const item = DB.supplements.find(s => s.id === id);
    const before = DB.supplements.slice();
    DB.supplements = DB.supplements.filter(s => s.id !== id);
    if (!commit(() => { DB.supplements = before; })) return;
    if (item) logChange('删除补剂「' + item.name + '」', { kind: 'supplement', item: item });
    renderActive();
    toast('已删除这条补剂，可在设置里撤销');
  }

  function openPrefsSheet() {
    state.sheetData = { type: 'prefs', prefs: Object.assign({}, DB.settings.prefs) };
    const rows = [
      ['vegetarian', '素食', '过滤肉类与水产，蛋奶保留'],
      ['lactoseFree', '无乳糖', '过滤牛奶、酸奶、奶酪、拿铁等'],
      ['glutenFree', '无麸质', '过滤面食、面包、燕麦等'],
      ['halal', '清真', '过滤猪肉及猪肉制品']
    ];
    openSheet(
      sheetHead('饮食偏好', '只影响食物库与“下一口”，不影响历史记录') +
      '<div class="sheet-body">' +
        '<div class="pref-list">' + rows.map(r =>
          '<button class="pref-row ' + (state.sheetData.prefs[r[0]] ? 'on' : '') + '" data-act="toggle-pref" data-v="' + r[0] + '">' +
            '<span class="l"><span class="t">' + r[1] + '</span><span class="s">' + r[2] + '</span></span><span class="switch"><i></i></span></button>'
        ).join('') + '</div>' +
        '<div class="notebox">过滤依据食物名称与分类，可能不完整；严重过敏请以包装标签和医生意见为准。自定义食物也会一起过滤。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-prefs">保存偏好</button></div>',
      'prefs'
    );
  }

  function savePrefs() {
    const before = Object.assign({}, DB.settings.prefs);
    DB.settings.prefs = Object.assign({}, state.sheetData.prefs);
    if (!commit(() => { DB.settings.prefs = before; })) return;
    closeSheet();
    renderActive();
    toast('饮食偏好已更新');
  }

  function openReport() {
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) { toast('还没有足够数据'); return; }
    const html = W.reportHTML({
      profile: DB.profile,
      gender: G.of(DB.profile),
      entries: DB.entries,
      weights: DB.weights,
      exercises: DB.exercises,
      cycle: DB.cycle,
      measures: DB.measures,
      checkins: DB.checkins,
      supplements: DB.supplements,
      targets: Object.assign({}, st.t, { budget: st.budget }),
      adaptive: st.ad,
      today: today
    });
    openReportPreview(html);
  }

  function openReportPreview(html) {
    const old = $('#reportOverlay');
    if (old) old.remove();
    state.reportHTML = html;
    const overlay = document.createElement('div');
    overlay.id = 'reportOverlay';
    overlay.className = 'report-overlay';
    overlay.innerHTML =
      '<div class="report-bar"><div class="report-bar-title">能量账本 · 就诊摘要</div>' +
        '<div class="report-bar-actions"><button class="btn btn-ghost btn-sm" data-act="report-download">下载 HTML</button>' +
        '<button class="btn btn-primary btn-sm" data-act="report-print">打印 / PDF</button>' +
        '<button class="icon-mini" data-act="close-report" aria-label="关闭">' + icon('close') + '</button></div></div>' +
      '<iframe class="report-frame" id="reportFrame" title="就诊摘要"></iframe>';
    document.body.appendChild(overlay);
    const frame = $('#reportFrame');
    if (frame) frame.srcdoc = html;
  }

  /* ============================================================
     v3.2 · 力量训练 / 菜谱 / 周报 / 可穿戴 / 进度照片
     ============================================================ */
  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function dateKeyOfTs(ts) {
    const d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  function downloadDataURL(name, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 500);
  }

  /* ---------------- 进度照片 ---------------- */
  function loadPhotos() {
    if (!X) return;
    X.photosAll().then(list => {
      state.photos = list || [];
      if (state.tab === 'body') renderBody();
    }).catch(err => {
      state.photos = [];
      toast(err && err.message ? err.message : '照片库不可用');
      if (state.tab === 'body') renderBody();
    });
  }

  function pickPhoto() {
    const input = $('#photoFile');
    if (!input) return;
    input.value = '';
    input.click();
  }

  async function handlePhotoFiles(files) {
    const list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    let ok = 0;
    let fail = 0;
    let quotaHit = false;
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        const res = await X.compressImage(file, 1080);
        const rec = {
          id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          date: dateKeyOfTs(file.lastModified),
          at: Date.now(),
          name: file.name || '照片',
          w: res.w, h: res.h, bytes: res.bytes, stored: res.data.length, data: res.data
        };
        await X.photoAdd(rec);
        ok++;
      } catch (err) {
        fail++;
        if (err && err.code === 'quota') { quotaHit = true; break; }
        toast(err && err.message ? err.message : '照片保存失败');
      }
    }
    await new Promise(r => setTimeout(r, 0));
    loadPhotos();
    if (state.sheet === 'photos') openPhotosSheet();
    if (ok) toast('已添加 ' + ok + ' 张照片' + (fail ? '，' + fail + ' 张失败' : ''));
    else if (quotaHit) toast('照片空间不足：请先在「进度照片」里清理');
    else if (fail) toast('没有可用的图片（需要 JPEG/PNG/WebP）');
  }

  function openPhotosSheet() {
    X.photosAll().then(list => {
      state.photos = list || [];
      X.photoStats(list).then(stats => {
        const groups = {};
        list.forEach(p => { (groups[p.date] = groups[p.date] || []).push(p); });
        const dates = Object.keys(groups).sort().reverse();
        const quotaText = stats.quota ? '浏览器已用 ' + fmtBytes(stats.usage) + ' / 配额 ' + fmtBytes(stats.quota) : '浏览器未报告配额';
        const body = '<div class="photo-stats">' +
          '<div class="ps-item"><div class="v">' + stats.count + '</div><div class="k">张照片</div></div>' +
          '<div class="ps-item"><div class="v">' + fmtBytes(stats.bytes) + '</div><div class="k">照片占用</div></div>' +
          '<div class="ps-item"><div class="v tiny-value">' + quotaText + '</div><div class="k">存储配额</div></div>' +
        '</div>' +
        (dates.length ? dates.map(date => '<div class="photo-date"><div class="pd-head"><span>' + E.relativeDay(date, E.todayKey()) + '</span><span class="tiny faint">' + E.dateLabel(date) + ' · ' + groups[date].length + ' 张</span></div>' +
          '<div class="photo-grid">' + groups[date].map(p => '<div class="photo-cell"><img src="' + p.data + '" alt="' + esc(p.date) + '"><div class="pc-meta">' + p.w + '×' + p.h + ' · ' + fmtBytes(p.bytes) + '</div><button class="icon-mini danger pc-del" data-act="photo-del" data-id="' + p.id + '" aria-label="删除">' + icon('trash') + '</button></div>').join('') + '</div></div>').join('')
          : '<div class="body-empty" style="margin:16px 0">还没有照片。上传后会在本机压缩到长边 ≤1080、JPEG 格式。</div>') +
        '<div class="body-note">照片保存在 IndexedDB（库名 energy-ledger-photos），不写入 localStorage，也不在 JSON 备份里。清理照片不会影响账本记录。</div>';
        state.sheet = 'photos';
        openSheet(sheetHead('进度照片', list.length + ' 张 · 按日期分组', '<button class="btn-quiet tiny" data-act="photo-pick" style="color:var(--green)">添加</button>') +
          '<div class="sheet-body">' + body + '</div>' +
          '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-danger" data-act="photo-clear" style="flex:1">一键清理全部照片</button></div>',
          'photos');
      });
    }).catch(err => toast(err && err.message ? err.message : '照片库不可用'));
  }

  function deletePhoto(id) {
    confirmSheet('删除这张照片？', '只删除这一张，不影响账本里的记录。', '删除', true).then(ok => {
      if (!ok) return;
      X.photoDelete(id).then(() => {
        loadPhotos();
        openPhotosSheet();
        toast('照片已删除');
      }).catch(err => toast(err && err.message ? err.message : '删除失败'));
    });
  }

  function clearPhotos() {
    const n = (state.photos || []).length;
    confirmSheet('清空全部进度照片？', '会删除本机 IndexedDB 里的 <b>' + n + '</b> 张照片，账本记录与备份不受影响。', '清空照片', true).then(ok => {
      if (!ok) return;
      X.photoClear().then(() => {
        loadPhotos();
        openPhotosSheet();
        toast('照片已清空');
      }).catch(err => toast(err && err.message ? err.message : '清理失败'));
    });
  }

  /* ---------------- 力量训练 ---------------- */
  function openLiftSheet(editId) {
    const item = editId ? DB.lifts.find(x => x.id === editId) : null;
    const names = ['深蹲', '卧推', '硬拉', '推举', '划船', '引体向上', '臀桥', '弓步蹲'];
    X.prStats(DB.lifts).forEach(p => { if (names.indexOf(p.exercise) < 0) names.push(p.exercise); });
    state.sheetData = { type: 'lift', id: editId || null };
    openSheet(
      sheetHead(item ? '编辑力量记录' : '记录力量训练', '动作 · 组数 · 重量 · 次数；1RM 自动估算') +
      '<div class="sheet-body">' +
        '<div class="field"><label>动作</label><input class="input" id="liftName" list="liftNames" maxlength="20" placeholder="深蹲 / 卧推 / 硬拉" value="' + esc(item ? item.exercise : '') + '"><datalist id="liftNames">' + names.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></div>' +
        '<div class="form-grid-3">' +
          '<div class="field"><label>组数</label><input class="input input-num" id="liftSets" type="number" min="1" max="30" value="' + (item ? item.sets : 3) + '"></div>' +
          '<div class="field"><label>重量 kg</label><input class="input input-num" id="liftWeight" type="number" step="0.5" min="0" max="600" value="' + (item ? item.weight : '') + '" placeholder="60"></div>' +
          '<div class="field"><label>次数</label><input class="input input-num" id="liftReps" type="number" min="1" max="60" value="' + (item ? item.reps : 8) + '"></div>' +
        '</div>' +
        '<div class="field"><label>日期</label><input class="input" id="liftDate" type="date" max="' + E.todayKey() + '" value="' + (item ? item.date : E.todayKey()) + '"></div>' +
        '<div class="preview-box" id="liftPreview"></div>' +
        '<div class="notebox">Epley 公式：1RM ≈ 重量 × (1 + 次数 / 30)。它是估算，不是极限测试。</div>' +
      '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="save-lift">保存</button></div>',
      'lift'
    );
    updateLiftPreview();
  }

  function updateLiftPreview() {
    const box = $('#liftPreview');
    if (!box) return;
    const w = Number($('#liftWeight') && $('#liftWeight').value) || 0;
    const r = Number($('#liftReps') && $('#liftReps').value) || 0;
    box.innerHTML = w > 0 && r > 0
      ? '<div class="preview-line"><span>估算 1RM</span><b>' + X.epley(w, r) + ' kg</b></div><div class="tiny faint">按 ' + w + ' kg × ' + r + ' 次</div>'
      : '<div class="tiny faint">填入重量与次数后，这里会显示估算 1RM。</div>';
  }

  function saveLift() {
    const name = ($('#liftName') && $('#liftName').value.trim()) || '';
    const sets = Number($('#liftSets') && $('#liftSets').value);
    const weight = Number($('#liftWeight') && $('#liftWeight').value);
    const reps = Number($('#liftReps') && $('#liftReps').value);
    const date = ($('#liftDate') && $('#liftDate').value) || E.todayKey();
    if (!name) { toast('请填写动作名称'); return; }
    if (!(sets >= 1 && sets <= 30)) { toast('组数需要在 1–30 之间'); return; }
    if (!(weight > 0 && weight <= 600)) { toast('重量需要在 0–600 kg 之间'); return; }
    if (!(reps >= 1 && reps <= 60)) { toast('次数需要在 1–60 之间'); return; }
    if (date > E.todayKey()) { toast('日期不能在未来'); return; }
    const sd = state.sheetData;
    const item = sd && sd.id ? DB.lifts.find(x => x.id === sd.id) : null;
    const before = DB.lifts.map(x => ({ ...x }));
    if (item) {
      Object.assign(item, { exercise: name, sets: sets, weight: weight, reps: reps, date: date });
    } else {
      DB.lifts.push({ id: uid(), date: date, exercise: name, sets: sets, weight: weight, reps: reps, note: '', createdAt: Date.now() });
    }
    if (!commit(() => { DB.lifts = before; })) return;
    toast(item ? '已更新力量记录' : '已记录 ' + name + ' · ' + weight + 'kg × ' + reps + ' × ' + sets + ' 组');
    closeSheet();
    renderActive();
  }

  function deleteLift(id) {
    const item = DB.lifts.find(x => x.id === id);
    if (!item) { toast('记录已不存在'); return; }
    confirmSheet('删除这条力量记录？', '只删除这一组，PR 会按剩余记录重新计算；删除后可在「最近操作」撤销。', '删除', true).then(ok => {
      if (!ok) return;
      const before = DB.lifts.slice();
      DB.lifts = DB.lifts.filter(x => x.id !== id);
      if (!commit(() => { DB.lifts = before; })) return;
      logChange('删除力量记录：' + item.exercise + ' ' + item.weight + 'kg × ' + item.reps + ' × ' + item.sets + ' 组', { kind: 'lift', item: item });
      renderActive();
      toast('已删除，可在最近操作撤销');
    });
  }

  function exportLiftCSV() {
    if (!DB.lifts.length) { toast('还没有力量训练记录'); return; }
    downloadFile('能量账本-力量训练-' + dateStamp() + '.csv', X.liftCSV(DB.lifts), 'text/csv;charset=utf-8');
    toast('力量训练 CSV 已导出');
  }

  /* ---------------- 菜谱 / 购物清单 ---------------- */
  function saveRecipeFromCart() {
    const sd = state.sheetData;
    if (!sd || !sd.cart || !sd.cart.length) { toast('先选几样食物'); return; }
    askName('给这份菜谱起个名字', '例如：鸡胸藜麦沙拉', '我的菜谱').then(name => {
      if (!name) return;
      const before = DB.recipes.length;
      DB.recipes.push({
        id: uid(), name: name, at: Date.now(),
        items: sd.cart.map(it => ({
          name: it.food.name, grams: it.grams,
          per100: { kcal: Number(it.food.kcal) || 0, p: Number(it.food.p) || 0, c: Number(it.food.c) || 0, f: Number(it.food.f) || 0, fib: Number(it.food.fib) || 0 }
        }))
      });
      if (!commit(() => { DB.recipes.length = before; })) return;
      toast('菜谱「' + name + '」已保存 · ' + sd.cart.length + ' 项');
    });
  }

  function openRecipesSheet() {
    const recipes = DB.recipes;
    const shop = DB.shopping;
    const list = recipes.length ? recipes.map(r => {
      const kcal = Math.round(r.items.reduce((s, i) => s + i.per100.kcal * i.grams / 100, 0));
      return '<div class="recipe-row"><div class="rm"><div class="n">' + esc(r.name) + '</div><div class="k">' + r.items.length + ' 项 · ' + kcal + ' kcal · ' + esc(r.items.slice(0, 3).map(i => i.name).join('、')) + (r.items.length > 3 ? ' 等' : '') + '</div></div>' +
        '<div class="ra"><button class="btn btn-primary btn-sm" data-act="recipe-add" data-id="' + r.id + '">加入' + E.mealLabel(E.guessMeal()) + '</button><button class="btn btn-ghost btn-sm" data-act="recipe-shop" data-id="' + r.id + '">购物清单</button><button class="icon-mini danger" data-act="recipe-del" data-id="' + r.id + '" aria-label="删除菜谱">' + icon('trash') + '</button></div></div>';
    }).join('') : '<div class="body-empty">还没有菜谱。回到「记录一餐」选好食物后，点底部的「存为菜谱」。</div>';
    const shopHtml = shop && shop.items.length ? '<div class="shop-block"><div class="row-between"><div><div class="body-card-title">购物清单</div><div class="tiny faint">' + esc(shop.recipeName || '手动') + ' · ' + shop.items.filter(i => i.checked).length + '/' + shop.items.length + ' 已勾选</div></div><button class="btn btn-ghost btn-sm" data-act="shop-clear">清空</button></div>' +
      '<div class="shop-list">' + shop.items.map((i, idx) => '<button class="shop-row' + (i.checked ? ' on' : '') + '" data-act="shop-toggle" data-i="' + idx + '"><span class="box">' + (i.checked ? icon('check') : '') + '</span><span class="n">' + esc(i.name) + '</span><span class="q">' + i.grams + ' g</span></button>').join('') + '</div></div>' : '<div class="shop-block"><div class="row-between"><div class="body-card-title">购物清单</div><button class="btn btn-ghost btn-sm" data-act="open-shopping">打开</button></div><div class="tiny faint" style="margin-top:6px">还没有购物清单，去菜谱里点「加入购物清单」。</div></div>';
    state.sheet = 'recipes';
    openSheet(
      sheetHead('菜谱与购物清单', '菜谱 = 多个食物条目；加入今日某餐时不改变原记录') +
      '<div class="sheet-body">' + list + shopHtml + '<div class="body-note">菜谱保存食物名称、克数与每 100g 营养值；购物清单按名称合并克数，只在本机保存勾选状态。</div></div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" style="flex:1" data-act="open-add">去选食物做菜谱</button></div>',
      'recipes'
    );
  }

  function addRecipeToMeal(id) {
    const r = DB.recipes.find(x => x.id === id);
    if (!r) { toast('菜谱不存在'); return; }
    const meal = E.guessMeal();
    const today = E.todayKey();
    const before = DB.entries.length;
    const added = [];
    r.items.forEach(it => {
      const food = { name: it.name, kcal: it.per100.kcal, p: it.per100.p, c: it.per100.c, f: it.per100.f, fib: it.per100.fib, cat: 0, catName: '菜谱', unitG: 0, custom: true };
      const e = makeEntry(food, it.grams, meal, today, 'recipe', 'med');
      DB.entries.push(e);
      added.push(e);
    });
    if (!commit(() => { DB.entries.length = before; })) return;
    const pd = pantryAutoDeduct(added);
    if (pd.any) saveDB(true);
    closeSheet();
    renderActive();
    toast('菜谱「' + r.name + '」已加入今日' + E.mealLabel(meal) + (pd.any ? ' · 冰箱：' + pantryResText(pd) : ''));
  }

  function makeShoppingFromRecipe(id) {
    const r = DB.recipes.find(x => x.id === id);
    if (!r) { toast('菜谱不存在'); return; }
    const items = X.shoppingFromRecipe(r);
    const merged = r.items.length - items.length;
    const doMake = () => {
      const before = DB.shopping;
      DB.shopping = { recipeId: r.id, recipeName: r.name, at: Date.now(), items: items };
      if (!commit(() => { DB.shopping = before; })) return;
      openShoppingSheet();
      toast('购物清单已生成 · ' + items.length + ' 项' + (merged > 0 ? '（合并 ' + merged + ' 项同名食材）' : ''));
    };
    if (DB.shopping && DB.shopping.items && DB.shopping.items.some(i => !i.checked)) {
      confirmSheet('替换当前购物清单？', '当前清单还有未勾选的项，生成新的会覆盖它。', '覆盖生成', true).then(ok => { if (ok) doMake(); });
    } else doMake();
  }

  function openShoppingSheet() {
    const shop = DB.shopping;
    if (!shop || !shop.items.length) {
      state.sheet = 'shopping';
      openSheet(
        sheetHead('购物清单', '还没有内容') +
        '<div class="sheet-body"><div class="body-empty">还没有购物清单，去菜谱里点「加入购物清单」。</div><div class="body-note">在「菜谱」浮层里对某份菜谱点「购物清单」，同名食材会按克数合并。</div></div>' +
        '<div class="sheet-foot"><button class="btn btn-primary" style="flex:1" data-act="open-recipes">去菜谱</button><button class="btn btn-ghost" data-act="close-sheet">关闭</button></div>',
        'shopping'
      );
      return;
    }
    state.sheet = 'shopping';
    openSheet(
      sheetHead('购物清单', esc(shop.recipeName || '手动') + ' · ' + shop.items.filter(i => i.checked).length + '/' + shop.items.length + ' 已勾选', '<button class="btn-quiet tiny" data-act="close-sheet">关闭</button>') +
      '<div class="sheet-body"><div class="shop-list">' + shop.items.map((i, idx) => '<button class="shop-row' + (i.checked ? ' on' : '') + '" data-act="shop-toggle" data-i="' + idx + '"><span class="box">' + (i.checked ? icon('check') : '') + '</span><span class="n">' + esc(i.name) + '</span><span class="q">' + i.grams + ' g</span></button>').join('') + '</div>' +
      '<div class="body-note">勾选状态只保存在本机。同名食材已按克数合并。</div></div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="shop-clear">清空清单</button>' + (shop.recipeId ? '<button class="btn btn-primary" style="flex:1" data-act="open-recipes">返回菜谱</button>' : '<button class="btn btn-primary" style="flex:1" data-act="close-sheet">关闭</button>') + '</div>',
      'shopping'
    );
  }

  function toggleShopping(idx) {
    const shop = DB.shopping;
    if (!shop || !shop.items[idx]) return;
    const before = shop.items[idx].checked;
    shop.items[idx].checked = !shop.items[idx].checked;
    if (!commit(() => { shop.items[idx].checked = before; })) return;
    if (state.sheet === 'shopping') openShoppingSheet();
    else if (state.sheet === 'recipes') openRecipesSheet();
    else renderToday();
  }

  function clearShopping() {
    const before = DB.shopping;
    DB.shopping = null;
    if (!commit(() => { DB.shopping = before; })) return;
    closeSheet();
    renderActive();
    toast('购物清单已清空');
  }

  function deleteRecipe(id) {
    const r = DB.recipes.find(x => x.id === id);
    confirmSheet('删除这个菜谱？', '删除「' + esc(r ? r.name : '') + '」不会影响已经记入账本的食物。', '删除', true).then(ok => {
      if (!ok) return;
      const before = DB.recipes.slice();
      DB.recipes = DB.recipes.filter(x => x.id !== id);
      if (!commit(() => { DB.recipes = before; })) return;
      openRecipesSheet();
      toast('菜谱已删除');
    });
  }

  /* ---------------- 周报卡片 ---------------- */
  function weekRange(scope) {
    const today = E.todayKey();
    const p = today.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    const dow = (d.getDay() + 6) % 7;
    const monday = E.addDays(today, -dow);
    if (scope === 'last') {
      const end = E.addDays(monday, -1);
      return { start: E.addDays(end, -6), end: end, ref: end, label: '上周' };
    }
    return { start: monday, end: today, ref: today, label: '本周' };
  }

  function buildWeekData(scope) {
    const r = weekRange(scope);
    const st = snapshot(E.todayKey());
    if (!st) return null;
    const n = E.daysBetween(r.start, r.ref) + 1;
    const ins = E.insights(DB.entries, DB.weights, DB.profile, st.t, st.ad, r.ref, n);
    const trainDates = {};
    DB.lifts.forEach(x => { if (x.date >= r.start && x.date <= r.end) trainDates[x.date] = (trainDates[x.date] || 0) + 1; });
    DB.exercises.forEach(x => { const d = x.date || x.dateKey; if (d >= r.start && d <= r.end) trainDates[d] = (trainDates[d] || 0) + 1; });
    const trainCount = Object.keys(trainDates).length;
    const hit = ins.daily.filter(d => d.logged && Math.abs(d.kcal - st.budget) <= st.budget * 0.1).length;
    const logged = ins.loggedDays;
    const delta = ins.delta;
    const stats = [
      { label: '平均摄入', value: logged ? fmt(ins.avgIntake) + ' kcal' : '—', sub: '记录 ' + logged + ' / ' + n + ' 天' },
      { label: '体重变化', value: (delta == null ? '—' : (delta > 0 ? '+' : '') + delta + ' kg'), sub: delta == null ? '体重点不足' : (delta <= 0 ? '趋势下降' : '趋势上升'), tone: delta == null ? '' : (delta > 0 ? 'amber' : '') },
      { label: '训练次数', value: trainCount + ' 次', sub: '力量 ' + DB.lifts.filter(x => x.date >= r.start && x.date <= r.end).length + ' 组 · 有氧 ' + DB.exercises.filter(x => (x.date || x.dateKey) >= r.start && (x.date || x.dateKey) <= r.end).length + ' 条' },
      { label: '达标天数', value: hit + ' 天', sub: '摄入在预算 ±10%' }
    ];
    return {
      title: r.label,
      range: E.dateLabel(r.start) + ' – ' + E.dateLabel(r.end),
      badge: '记录 ' + logged + ' / ' + n + ' 天',
      stats: stats,
      days: ins.daily.map(d => ({ date: d.date, label: E.weekday(d.date), kcal: d.kcal, logged: d.logged })),
      budget: st.budget,
      footer: '记录 ' + logged + ' / ' + n + ' 天 · 达标 ' + hit + ' 天 · 训练 ' + trainCount + ' 次',
      generated: '生成于 ' + E.dateLabel(E.todayKey()) + ' · 能量账本 v3.2'
    };
  }

  function openWeekCard(scope) {
    const data = buildWeekData(scope);
    if (!data) { toast('还没有足够数据'); return; }
    const canvas = document.createElement('canvas');
    X.drawWeekCard(canvas, data);
    const url = canvas.toDataURL('image/png');
    state.weekCard = { url: url, scope: scope, title: data.title };
    state.sheet = 'week';
    openSheet(
      sheetHead(data.title + '周报卡片', data.range + ' · 长图 ' + canvas.width + '×' + canvas.height, '<button class="btn-quiet tiny" data-act="close-sheet">关闭</button>') +
      '<div class="sheet-body"><div class="week-preview"><img src="' + url + '" alt="' + data.title + '周报卡片"></div>' +
      '<div class="body-note">卡片在本机用 Canvas 生成，包含平均摄入、体重变化、训练次数与达标天数；导出的 PNG 不含任何账号信息。</div></div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">关闭</button><button class="btn btn-primary" style="flex:1" data-act="week-download">下载 PNG 长图</button></div>',
      'week'
    );
  }

  function downloadWeekCard() {
    if (!state.weekCard) { toast('请先生成周报卡片'); return; }
    downloadDataURL('能量账本-周报-' + (state.weekCard.scope === 'last' ? '上周' : '本周') + '-' + dateStamp() + '.png', state.weekCard.url);
    toast('周报 PNG 已导出');
  }

  /* ---------------- 可穿戴导入 ---------------- */
  function pickWearableFile() {
    const input = $('#wearableFile');
    if (!input) return;
    input.value = '';
    input.click();
  }

  async function handleWearableFile(file) {
    let text = '';
    try { text = await file.text(); } catch (e) { toast('文件读取失败'); return; }
    if (!text || text.length < 16) { toast('文件是空的'); return; }
    let parsed;
    try {
      const isXml = /\.xml$/i.test(file.name || '') || /^\s*<\?xml|^\s*<HealthData/i.test(text);
      parsed = isXml ? X.parseAppleHealth(text) : X.parseHuaweiCSV(text);
    } catch (err) {
      toast(err && err.message ? err.message : '无法解析这个文件');
      return;
    }
    if (!X.hasWearableData(parsed)) {
      toast('没有找到可导入的步数、体重或睡眠数据');
      return;
    }
    const preview = X.previewImport(parsed, DB);
    state.sheetData = { type: 'wearable', parsed: parsed, preview: preview, decisions: {}, fileName: file.name || '' };
    state.sheet = 'wearable';
    openSheet(renderWearablePreview());
  }

  function renderWearablePreview() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'wearable') return '';
    const p = sd.parsed;
    const pv = sd.preview;
    const sourceLabel = p.source === 'apple' ? 'Apple Health XML' : '华为运动健康 CSV';
    const rows = pv.rows;
    const conflictRows = rows.filter(r => r.conflicts.length);
    const sample = rows.slice(0, 24);
    const shown = [];
    sample.forEach(r => { if (shown.indexOf(r) < 0) shown.push(r); });
    conflictRows.forEach(r => { if (shown.indexOf(r) < 0) shown.push(r); });
    const body = '<div class="import-sum">' +
      '<div class="is-item"><div class="v">' + pv.totals.steps + '</div><div class="k">天步数</div></div>' +
      '<div class="is-item"><div class="v">' + pv.totals.weight + '</div><div class="k">次体重</div></div>' +
      '<div class="is-item"><div class="v">' + pv.totals.sleep + '</div><div class="k">天睡眠</div></div>' +
      '<div class="is-item"><div class="v">' + pv.rows.length + '</div><div class="k">个日期</div></div>' +
    '</div>' +
    '<div class="import-note">来源：' + sourceLabel + ' · ' + esc(sd.fileName) + '<br>识别 ' + pv.rows.length + ' 个日期，冲突 ' + pv.conflicts.length + ' 项。默认覆盖同日数据；勾选「跳过」则保留原值。</div>' +
    '<div class="import-list">' + shown.map(r => {
      const parts = [];
      if (r.steps != null) parts.push('步数 ' + fmt(r.steps) + (r.current.steps != null ? '（现有 ' + fmt(r.current.steps) + '）' : ''));
      if (r.weight != null) parts.push('体重 ' + r.weight + ' kg' + (r.current.weight != null ? '（现有 ' + r.current.weight + '）' : ''));
      if (r.sleep != null) parts.push('睡眠 ' + r.sleep + ' h' + (r.current.sleepH != null ? '（现有 ' + r.current.sleepH + '）' : ''));
      return '<div class="import-row' + (r.conflicts.length ? ' conflict' : '') + '"><div class="im-date">' + E.dateLabel(r.date) + '</div><div class="im-vals">' + parts.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' +
        (r.conflicts.length ? '<div class="im-conf">' + r.conflicts.map(t => '<label><input type="checkbox" data-wskip="' + t + ':' + r.date + '"' + (sd.decisions[t + ':' + r.date] ? ' checked' : '') + '> 跳过' + ({ weight: '体重', steps: '步数', sleep: '睡眠' }[t]) + '</label>').join('') + '</div>' : '') + '</div>';
    }).join('') + '</div>' +
    (rows.length > shown.length ? '<div class="tiny faint" style="margin-top:8px">还有 ' + (rows.length - shown.length) + ' 个日期未展开，导入会一并处理。</div>' : '') +
    (p.unsupported && Object.keys(p.unsupported).length ? '<div class="body-note">未导入的记录类型：' + Object.keys(p.unsupported).slice(0, 6).map(k => k.replace('HKQuantityTypeIdentifier', '').replace('HKCategoryTypeIdentifier', '')).join('、') + '（不支持：心率、卡路里、 workout 等）。</div>' : '') +
    (p.warnings && p.warnings.length ? '<div class="body-note">' + p.warnings.slice(0, 4).map(esc).join('<br>') + '</div>' : '') +
    '<div class="body-note">导入只写入体重、步数与睡眠；不会改动饮食、运动或周期记录。</div>';
    const importCount = pv.rows.reduce((s, r) => s + (r.steps != null ? 1 : 0) + (r.weight != null ? 1 : 0) + (r.sleep != null ? 1 : 0), 0);
    return sheetHead('预览可穿戴导入', sourceLabel + ' · 先确认再写入') +
      '<div class="sheet-body">' + body + '</div>' +
      '<div class="sheet-foot"><button class="btn btn-ghost" data-act="close-sheet">取消</button><button class="btn btn-primary" style="flex:1" data-act="wearable-apply">导入 ' + importCount + ' 项</button></div>';
  }

  function applyWearableImport() {
    const sd = state.sheetData;
    if (!sd || sd.type !== 'wearable') return;
    const dbBefore = JSON.stringify(DB);
    const stats = X.applyImport(sd.parsed, DB, sd.decisions);
    if (!commit(() => { DB = JSON.parse(dbBefore); })) return;
    closeSheet();
    renderActive();
    const skipped = stats.weightSkipped + stats.stepsSkipped + stats.sleepSkipped;
    toast('已导入：体重 ' + stats.weight + ' · 步数 ' + stats.steps + ' · 睡眠 ' + stats.sleep + (skipped ? ' · 跳过 ' + skipped : ''));
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
    const before = { profile: DB.profile, weights: DB.weights.map(w => ({ ...w })), onboarded: DB.onboarded };
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
    if (!commit(() => { DB.profile = before.profile; DB.weights = before.weights; DB.onboarded = before.onboarded; })) return;
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
    const before = DB.foods.length;
    DB.foods.push(f);
    if (!commit(() => { DB.foods.length = before; })) return;
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

  function buildExportPayload() {
    return {
      version: 4, app: 'energy-ledger', appVersion: APP_VERSION, exportedAt: new Date().toISOString(),
      profile: DB.profile,
      settings: {
        theme: DB.settings.theme, gentle: DB.settings.gentle, prefs: DB.settings.prefs,
        mode: DB.settings.mode, modeHintSeen: DB.settings.modeHintSeen,
        fx: DB.settings.fx, powerSave: DB.settings.powerSave, motion: DB.settings.motion,
        ai: { baseURL: DB.settings.ai.baseURL, model: DB.settings.ai.model }
      },
      entries: DB.entries, weights: DB.weights, exercises: DB.exercises,
      foods: DB.foods, combos: DB.combos, water: DB.water, notes: DB.notes,
      cycle: DB.cycle, measures: DB.measures, checkins: DB.checkins, supplements: DB.supplements,
      lifts: DB.lifts, recipes: DB.recipes, shopping: DB.shopping, wearable: DB.wearable,
      trip: DB.trip,
      pantry: DB.pantry,
      /* 奖励资产：券袋与抽奖历史、扭蛋币、皮肤与解锁状态，全部可恢复 */
      scratch: DB.scratch, coins: DB.coins, gacha: DB.gacha,
      skins: DB.skins, collect: DB.collect, codex: DB.codex, wallet: DB.wallet,
      cheatDays: DB.cheatDays, leaveDays: DB.leaveDays, wishlist: DB.wishlist,
      bank: DB.bank, favorites: DB.favorites, foodUse: DB.foodUse, reco: DB.reco,
      tasks: DB.tasks, anti: DB.anti, revive: DB.revive, stats: DB.stats
    };
  }

  function exportJSON() {
    if (!DB.profile) { toast('还没有可导出的数据'); return; }
    const payload = buildExportPayload();
    downloadFile('能量账本-备份-' + dateStamp() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('备份已导出（含奖励、券与皮肤解锁）');
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

  function importKey(x, fields) {
    return fields.map(function (f) { return String(x && x[f] != null ? x[f] : ''); }).join('|');
  }
  function mergeBy(cur, inc, keyFn) {
    const out = Array.isArray(cur) ? cur : [];
    const seen = Object.create(null);
    out.forEach(function (x) { const k = keyFn(x); if (k) seen[k] = 1; });
    (Array.isArray(inc) ? inc : []).forEach(function (x) {
      if (!x) return;
      const k = keyFn(x);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(x);
    });
    return out;
  }
  function unionList(a, b) {
    const out = [], seen = Object.create(null);
    (a || []).concat(b || []).forEach(function (x) {
      const k = typeof x === 'string' ? x : JSON.stringify(x);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }
  function importPayload(data) {
    const isLegacy = data && data.app === 'qingka-riji';
    if (isLegacy) return { isLegacy: true, version: 0, payload: convertLegacy(data) };
    if (!data || !Array.isArray(data.entries)) return null;
    return {
      isLegacy: false,
      version: Number(data.version) || 3,
      payload: {
        profile: data.profile, entries: data.entries, weights: data.weights || [],
        exercises: data.exercises || [], foods: data.foods || [], combos: data.combos || [],
        water: data.water || {}, notes: data.notes || {}, settings: data.settings || {},
        cycle: data.cycle || null, measures: data.measures || [],
        checkins: data.checkins || [], supplements: data.supplements || [],
        lifts: data.lifts || [], recipes: data.recipes || [], shopping: data.shopping || null,
        wearable: data.wearable || {}, pantry: data.pantry || null, trip: data.trip || null,
        scratch: data.scratch || null, coins: data.coins, gacha: data.gacha || null,
        skins: data.skins || null, collect: data.collect || null, codex: data.codex || null,
        wallet: data.wallet || null, cheatDays: data.cheatDays || null, leaveDays: data.leaveDays || null,
        wishlist: data.wishlist || null, bank: data.bank || null, favorites: data.favorites || null,
        foodUse: data.foodUse || null, reco: data.reco || null, tasks: data.tasks || null,
        anti: data.anti || null, revive: data.revive || null, stats: data.stats || null,
        counts: { entries: data.entries.length, weights: (data.weights || []).length, exercises: (data.exercises || []).length }
      }
    };
  }

  function mergeImport(payload) {
    const src = payload;
    DB.entries = mergeBy(DB.entries, src.entries, x => x.id || importKey(x, ['date', 'meal', 'name', 'createdAt']));
    DB.weights = mergeBy(DB.weights, src.weights, x => String(x.date || ''));
    DB.exercises = mergeBy(DB.exercises, src.exercises, x => x.id || importKey(x, ['date', 'name', 'minutes', 'createdAt']));
    DB.foods = mergeBy(DB.foods, src.foods, x => x.id || String(x.name || ''));
    DB.combos = mergeBy(DB.combos, src.combos, x => x.id || String(x.name || ''));
    DB.measures = mergeBy(DB.measures, src.measures, x => x.id || importKey(x, ['date', 'kind', 'part']));
    DB.checkins = mergeBy(DB.checkins, src.checkins, x => importKey(x, ['date', 'kind', 'tag']));
    DB.supplements = mergeBy(DB.supplements, src.supplements, x => x.id || importKey(x, ['date', 'name']));
    DB.lifts = mergeBy(DB.lifts, src.lifts, x => x.id || importKey(x, ['date', 'exercise', 'sets', 'weight']));
    DB.recipes = mergeBy(DB.recipes, src.recipes, x => x.id || String(x.name || ''));
    DB.favorites = unionList(DB.favorites, src.favorites);
    DB.water = Object.assign({}, src.water || {}, DB.water || {});
    DB.notes = Object.assign({}, src.notes || {}, DB.notes || {});
    DB.leaveDays = unionList(DB.leaveDays, src.leaveDays);
    DB.wishlist = mergeBy(DB.wishlist, src.wishlist, x => importKey(x, ['name', 'at']));
    DB.cheatDays = DB.cheatDays || { history: [] };
    DB.cheatDays.history = mergeBy(DB.cheatDays.history, (src.cheatDays && src.cheatDays.history) || [], x => importKey(x, ['date', 'source']));
    DB.bank = DB.bank || { loans: [], waivers: { free: 0, extra: 0 } };
    DB.bank.loans = mergeBy(DB.bank.loans, (src.bank && src.bank.loans) || [], x => x.id || importKey(x, ['date', 'kcal']));
    DB.bank.waivers.free = Math.max(DB.bank.waivers.free || 0, (src.bank && src.bank.waivers && src.bank.waivers.free) || 0);
    DB.bank.waivers.extra = Math.max(DB.bank.waivers.extra || 0, (src.bank && src.bank.waivers && src.bank.waivers.extra) || 0);
    if (src.foodUse) Object.keys(src.foodUse).forEach(k => { DB.foodUse[k] = Math.max(DB.foodUse[k] || 0, Number(src.foodUse[k]) || 0); });
    if (src.reco && Array.isArray(src.reco.seen)) DB.reco.seen = unionList(DB.reco.seen, src.reco.seen).slice(-500);
    if (src.shopping && !DB.shopping) DB.shopping = src.shopping;
    if (src.cycle && (!DB.cycle || !DB.cycle.enabled)) DB.cycle = src.cycle;
    if (src.wearable) DB.wearable = Object.assign({}, src.wearable, DB.wearable);
    if (src.trip) {
      DB.trip.total_km = Math.max(DB.trip.total_km || 0, Number(src.trip.total_km) || 0);
      DB.trip.collected = unionList(DB.trip.collected, src.trip.collected).map(Number).filter(n => n > 0 && n <= 30);
    }
    /* 奖励资产：券、抽奖历史、币、皮肤解锁取并集/较大值，绝不覆盖归零 */
    const sc = src.scratch;
    if (sc) {
      DB.scratch.tickets = mergeBy(DB.scratch.tickets, sc.tickets, t => String(t.id || '')).slice(-10);
      DB.scratch.log = mergeBy(DB.scratch.log, sc.log, r => String(r.id || '')).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 60);
      DB.scratch.count = Math.max(DB.scratch.count || 0, Number(sc.count) || 0);
      DB.scratch.miss = Math.max(DB.scratch.miss || 0, Number(sc.miss) || 0);
      DB.scratch.milestones = Object.assign({}, sc.milestones || {}, DB.scratch.milestones || {});
      DB.scratch.weeklyKcal = Object.assign({}, sc.weeklyKcal || {}, DB.scratch.weeklyKcal || {});
      if (sc.pass && sc.pass.week) {
        const cur = DB.scratch.pass && DB.scratch.pass.week;
        if (!cur || String(sc.pass.week) > String(DB.scratch.pass.week)) DB.scratch.pass = sc.pass;
      }
      if (!DB.scratch.card && sc.card) DB.scratch.card = sc.card;
      if (!DB.scratch.batch && sc.batch) DB.scratch.batch = sc.batch;
      if (sc.last && (!DB.scratch.last || (Number(sc.last.at) || 0) > (Number(DB.scratch.last.at) || 0))) DB.scratch.last = sc.last;
    }
    DB.coins = Math.max(DB.coins || 0, Number(src.coins) || 0);
    if (src.gacha) {
      DB.gacha.credits = Math.max(DB.gacha.credits || 0, Number(src.gacha.credits) || 0);
      DB.gacha.milestones = Object.assign({}, src.gacha.milestones || {}, DB.gacha.milestones || {});
      DB.gacha.history = mergeBy(DB.gacha.history, src.gacha.history || [], x => x.id || importKey(x, ['at', 'kind'])).slice(0, 20);
    }
    if (src.skins) {
      DB.skins.unlocked = unionList(DB.skins.unlocked, src.skins.unlocked);
      DB.skins.unlockedCos = unionList(DB.skins.unlockedCos, src.skins.unlockedCos);
      DB.skins.packs = Object.assign({}, src.skins.packs || {}, DB.skins.packs || {});
    }
    if (src.collect) {
      DB.collect.quotes = unionList(DB.collect.quotes, src.collect.quotes);
      DB.collect.eggs = unionList(DB.collect.eggs, src.collect.eggs);
      DB.collect.medals = unionList(DB.collect.medals, src.collect.medals);
    }
    if (src.codex) DB.codex.lit = unionList(DB.codex.lit, src.codex.lit);
    if (src.wallet) {
      DB.wallet.credits = mergeBy(DB.wallet.credits, src.wallet.credits, c => String(c.id || ''));
      DB.wallet.applied = mergeBy(DB.wallet.applied, src.wallet.applied, a => String(a.id || ''));
    }
    if (src.tasks && src.tasks.date === DB.tasks.date) {
      DB.tasks.list = mergeBy(DB.tasks.list, src.tasks.list || [], t => String(t.id || ''));
    }
    if (src.anti && src.anti.since) DB.anti = Object.assign({}, src.anti, DB.anti);
    if (src.revive) DB.revive = mergeBy(DB.revive, src.revive, x => x.id || importKey(x, ['date', 'kind']));
    if (src.stats) {
      DB.stats.aiCalls = Math.max(DB.stats.aiCalls || 0, Number(src.stats.aiCalls) || 0);
      DB.stats.aiOk = Math.max(DB.stats.aiOk || 0, Number(src.stats.aiOk) || 0);
      DB.stats.aiFail = Math.max(DB.stats.aiFail || 0, Number(src.stats.aiFail) || 0);
      DB.stats.aiMs = Math.max(DB.stats.aiMs || 0, Number(src.stats.aiMs) || 0);
    }
    if (!DB.profile && src.profile) DB.profile = src.profile;
    DB.onboarded = true;
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'importFile';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    const old = document.getElementById('importFile');
    if (old) old.remove();
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let data;
        try { data = JSON.parse(reader.result); } catch (e) { toast('文件不是有效的 JSON'); return; }
        const parsed = importPayload(data);
        if (!parsed) { toast('无法识别的备份格式'); return; }
        const payload = parsed.payload;
        if (!payload.profile) { toast('备份里没有身体档案'); return; }
        const choice = await new Promise(function (resolve) {
          miniOpen(
            '<div class="mini-t">导入备份</div>' +
            '<div class="mini-b">备份版本 v' + (parsed.isLegacy ? '旧版轻卡日记' : parsed.version) + ' · 含 <b>' + payload.counts.entries + '</b> 笔记录、<b>' + payload.counts.weights + '</b> 次体重。<br><br>' +
              '<b>合并</b>：保留本机现有数据，重复记录自动去重，奖励取并集 / 较大值。<br>' +
              '<b>覆盖</b>：用备份替换本机全部数据，<b>不可撤销</b>。本机现有 <b>' + DB.entries.length + '</b> 笔记录、<b>' + DB.weights.length + '</b> 次体重。</div>' +
            '<div class="mini-a mini-a-3"><button class="btn btn-ghost" data-mini="cancel">取消</button>' +
            '<button class="btn btn-ghost" data-mini="merge">合并导入</button>' +
            '<button class="btn btn-danger" data-mini="overwrite">覆盖导入</button></div>',
            resolve
          );
        });
        if (!choice) return;
        if (choice === 'overwrite') {
          const sure = await confirmSheet('确认覆盖？',
            '备份将替换本机全部数据，覆盖后无法撤销。建议先导出当前备份。<br><br>本机现有 <b>' + DB.entries.length + '</b> 笔记录、<b>' + DB.weights.length + '</b> 次体重。',
            '仍然覆盖', true);
          if (!sure) return;
        }
        const dbBefore = DB;
        const snapshot = JSON.stringify(DB);
        const keepKey = (DB.settings.ai && DB.settings.ai.key) || '';
        const backupSettings = payload.settings || {};
        const debtBefore = isFull() ? creditEnsure(true).debt : 0;
        const pantryPrev = JSON.parse(JSON.stringify(DB.pantry || { items: [], ops: [] }));
        try {
          if (choice === 'merge') {
            mergeImport(payload);
          } else {
            DB = normalizeDB({
              version: 4, createdAt: Date.now(), onboarded: true,
              profile: payload.profile,
              settings: {
                theme: backupSettings.theme || dbBefore.settings.theme,
                gentle: !!backupSettings.gentle,
                prefs: backupSettings.prefs || dbBefore.settings.prefs,
                pin: dbBefore.settings.pin,
                ai: Object.assign({}, dbBefore.settings.ai, backupSettings.ai || {}, { key: keepKey }),
                fx: backupSettings.fx !== false,
                powerSave: !!backupSettings.powerSave,
                motion: !!backupSettings.motion,
                /* 模式跟着备份走；旧备份没有该字段时按规格兜底为 full */
                mode: backupSettings.mode || 'full',
                modeHintSeen: !!backupSettings.modeHintSeen,
                demo: false
              },
              entries: payload.entries, weights: payload.weights, exercises: payload.exercises,
              foods: payload.foods, combos: payload.combos, water: payload.water, notes: payload.notes,
              cycle: payload.cycle || dbBefore.cycle, measures: payload.measures,
              checkins: payload.checkins, supplements: payload.supplements,
              lifts: payload.lifts, recipes: payload.recipes, shopping: payload.shopping, wearable: payload.wearable,
              trip: payload.trip || { total_km: 0, updatedAt: 0, collected: [], last_station: 0 },
              pantry: payload.pantry || { items: [], ops: [], hintDate: '' },
              /* 旧版备份没有奖励字段时保留本机资产，避免换代清零 */
              scratch: payload.scratch || dbBefore.scratch,
              coins: payload.coins != null ? payload.coins : dbBefore.coins,
              gacha: payload.gacha || dbBefore.gacha,
              skins: payload.skins || dbBefore.skins,
              collect: payload.collect || dbBefore.collect,
              codex: payload.codex || dbBefore.codex,
              wallet: payload.wallet || dbBefore.wallet,
              cheatDays: payload.cheatDays || dbBefore.cheatDays,
              leaveDays: payload.leaveDays || dbBefore.leaveDays,
              wishlist: payload.wishlist || dbBefore.wishlist,
              bank: payload.bank || dbBefore.bank,
              favorites: payload.favorites || dbBefore.favorites,
              foodUse: payload.foodUse || dbBefore.foodUse,
              reco: payload.reco || dbBefore.reco,
              tasks: payload.tasks || dbBefore.tasks,
              anti: payload.anti || dbBefore.anti,
              revive: payload.revive || dbBefore.revive,
              stats: payload.stats || dbBefore.stats
            });
          }
          if (!commit(() => { DB = normalizeDB(JSON.parse(snapshot)); })) return;
        } catch (e) {
          /* 导入失败整包回滚：任何解析 / 归一化异常都不留下半份数据 */
          try { DB = normalizeDB(JSON.parse(snapshot)); } catch (e2) { DB = dbBefore; }
          saveDB(true);
          toast('导入失败：已整包回滚，原数据未变');
          return;
        }
        const pantryMerged = choice === 'overwrite' ? pantryImportMerge(pantryPrev) : 0;
        state.recordDate = E.todayKey();
        closeSheet();
        applyModeChrome();
        applySkins();
        applyFx();
        if (isFull()) bootSkinPacks();
        if (isFull()) ensureTrip().then(() => syncTrip(true));
        const debtAfter = isFull() ? creditEnsure(true).debt : 0;
        renderActive();
        toast((choice === 'merge' ? '已合并导入 ' : '已覆盖导入 ') + payload.counts.entries + ' 笔记录' + (pantryMerged ? ' · 冰箱合并 ' + pantryMerged + ' 条' : '') + (debtAfter !== debtBefore
          ? ' · 欠款按新记录重算为 ' + fmt(debtAfter) + ' kcal' : ''));
      };
      reader.readAsText(file);
    };
    window.__importInput = input;
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
    state.ob = { step: 1, sex: 'female', age: '', height: '', weight: '', targetWeight: '', activity: 'light', goal: 'lose', rate: 0.25, mode: 'ledger', modeTouched: false };
    renderOnboarding();
  }
  function renderOnboarding() {
    const ob = state.ob;
    if (!ob) return;
    const root = $('#onboardRoot');
    const dots = '<div class="ob-dots">' + [1, 2, 3, 4].map(i => '<span class="' + (i <= ob.step ? 'on' : '') + '"></span>').join('') + '</div>';
    let body = '';
    if (ob.step === 1) {
      body = '<div class="ob-step">' + dots +
        '<div class="eyebrow">SET UP · 1 / 4</div>' +
        '<h1 class="ob-title">先认识你的身体</h1>' +
        '<p class="ob-sub">这不是体检，只需要四个数字。它们只用来给账本一个起点；两周后，你自己的体重变化会替代这些猜测。</p>' +
        '<div class="field"><label>性别</label><div class="seg">' + [['female', '女'], ['male', '男']].map(x =>
          '<button data-ob="sex" data-v="' + x[0] + '" class="' + (ob.sex === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
          '<div class="tiny faint" style="margin-top:6px">默认女性版；切换后身体页、症状与营养提示会换成对应版本，之后可在设置里修改。</div></div>' +
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
      body = '<div class="ob-step">' + dots +
        '<div class="eyebrow">SET UP · 2 / 4</div>' +
        '<h1 class="ob-title">这本账有多厚</h1>' +
        '<p class="ob-sub">只选这一次，之后随时能在设置里切换。两种模式共用同一份数据，切换不删任何东西。</p>' +
        '<div class="ob-mode">' +
          '<button class="mode-card' + (ob.mode === 'ledger' ? ' on' : '') + '" data-ob="mode" data-v="ledger"><div class="t">轻一点 · 只记账</div><div class="s">只有今日额度、三餐、体重、运动，一屏看完</div></button>' +
          '<button class="mode-card' + (ob.mode === 'full' ? ' on' : '') + '" data-ob="mode" data-v="full"><div class="t">丰富一点 · 全部功能</div><div class="s">含周报、奖励、图鉴、旅行册，可随时切换</div></button>' +
        '</div>' +
        '<div class="ob-actions"><button class="btn btn-ghost" data-ob="back">上一步</button><button class="btn btn-primary" data-ob="nextmode" id="obNextMode">继续</button></div>' +
        '<p class="ob-note">默认高亮纯账本；跳过未选也按纯账本处理。选完整不会多收费，选纯账本也不会删数据。</p>' +
      '</div>';
    } else if (ob.step === 3) {
      const rateBox = ob.goal === 'maintain'
        ? '<div class="notebox">维持目标：预算等于校准后的日常消耗，不设刻意缺口。</div>'
        : '<div class="field"><label>速度（kg / 周）</label><div class="seg">' + [0.25, 0.5, 0.75].map(r =>
          '<button data-ob="rate" data-v="' + r + '" class="' + (Math.abs(ob.rate - r) < .01 ? 'on' : '') + '">' + r + (r === 0.25 ? ' 温和' : r === 0.5 ? ' 标准' : ' 进取') + '</button>').join('') + '</div></div>';
      body = '<div class="ob-step">' + dots +
        '<div class="eyebrow">SET UP · 3 / 4</div>' +
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
        '<div class="eyebrow">SET UP · 4 / 4</div>' +
        '<h1 class="ob-title">这是起点，不是答案</h1>' +
        '<p class="ob-sub">账本会先按公式给你一个预算。从今天起，它开始观察你的摄入和体重，并在两周内逐步替换成你自己的真实消耗。</p>' +
        '<div class="result-box">' +
          '<div class="result-grid">' +
            '<div class="result-item"><div class="k">基础代谢 BMR</div><div class="v">' + fmt(t.bmr) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">公式日消耗</div><div class="v">' + fmt(t.priorTDEE) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">起始预算（推荐）</div><div class="v green">' + fmt(t.budgetPrior) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">安全下限（硬底线）</div><div class="v">' + fmt(t.floor) + ' <small>kcal</small></div></div>' +
            '<div class="result-item"><div class="k">蛋白质目标</div><div class="v">' + t.protein + ' <small>g / 天</small></div></div>' +
          '</div>' +
          '<div class="result-note">' + (ob.sex === 'male' ? '男' : '女') + ' · ' + ob.age + ' 岁 · ' + ob.height + ' cm · ' + ob.weight + ' kg → 目标 ' + ob.targetWeight + ' kg（' + goalText + '，' + ob.rate + ' kg/周）<br>最终采用<b>推荐值 ' + fmt(t.budgetPrior) + ' kcal</b>；<b>安全下限 ' + fmt(t.floor) + ' kcal</b> 是硬底线，只有推荐值低于它时才会抬到下限。' + (t.capped ? ' 你选择的速度超过消耗的 22%，已自动收窄。' : '') + '</div>' +
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
    const before = { profile: DB.profile, weights: DB.weights, onboarded: DB.onboarded, mode: DB.settings.mode, hint: DB.settings.modeHintSeen };
    DB.weights = [{ date: E.todayKey(), kg: p.weight }];
    DB.onboarded = true;
    DB.settings.mode = ob.mode === 'full' ? 'full' : 'ledger';
    DB.settings.modeHintSeen = true;
    if (!commit(() => {
      DB.profile = before.profile; DB.weights = before.weights; DB.onboarded = before.onboarded;
      DB.settings.mode = before.mode; DB.settings.modeHintSeen = before.hint;
    })) return;
    $('#onboardRoot').innerHTML = '';
    state.ob = null;
    state.tab = 'today';
    applyModeChrome();
    applySkins();
    applyFx();
    applyTheme();
    setTab('today');
    renderActive();
    if (isFull()) bootSkinPacks();
    if (!state.announceTried) { state.announceTried = true; setTimeout(initAnnounce, 800); }
    if (isFull()) ensureTrip().then(() => syncTrip(true));
    toast(DB.settings.mode === 'full' ? '账本已建立 · 完整模式' : '账本已建立 · 纯账本模式');
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
    if (action === 'mode') { ob.mode = el.dataset.v === 'full' ? 'full' : 'ledger'; ob.modeTouched = true; renderOnboarding(); return; }
    if (action === 'back') { readObForm(); ob.step = Math.max(1, ob.step - 1); renderOnboarding(); return; }
    if (action === 'nextmode') { readObForm(); ob.step = 3; renderOnboarding(); return; }
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
      ob.step = 4; renderOnboarding(); return;
    }
    if (action === 'finish') { finishOnboarding(); return; }
    if (action === 'demo') { generateDemo(); return; }
  }

  function handleAction(el) {
    const act = el.dataset.act;
    const sd = state.sheetData;
    switch (act) {
      case 'close-sheet': closeSheet(); break;
      case 'open-settings': closeSheet(); setTab('settings'); break;
      case 'open-add': {
        const date = state.tab === 'ledger' ? state.recordDate : E.todayKey();
        openFoodSheet({ date: date, meal: el.dataset.meal });
        break;
      }
      case 'open-manual': openManualSheet(); break;
      case 'open-dish': {
        const prev = state.sheetData;
        const date = (prev && prev.date) || (state.tab === 'ledger' ? state.recordDate : E.todayKey());
        const meal = (prev && prev.meal) || E.guessMeal();
        openDishSheet({ date: date, meal: meal });
        break;
      }
      case 'dish-pick': {
        const i = $('#dishName');
        if (i) i.value = el.dataset.name || '';
        refreshDishSuggestions();
        refreshDishResult();
        break;
      }
      case 'dish-calc': refreshDishResult(); break;
      case 'dish-cat': {
        if (!sd) break;
        sd.cat = el.dataset.v || 'all';
        const di = $('#dishName');
        if (di) di.value = '';
        sd.query = '';
        refreshDishSuggestions();
        break;
      }
      case 'dish-size': {
        if (!sd) break;
        sd.size = Number(el.dataset.v) || 1;
        const seg = el.closest('.seg');
        if (seg) $$('button', seg).forEach(b => b.classList.toggle('on', b === el));
        refreshDishResult();
        break;
      }
      case 'dish-rice': {
        if (!sd) break;
        sd.rice = !sd.rice;
        refreshDishResult();
        break;
      }
      case 'save-dish': saveDish(); break;
      case 'open-exercise': openExerciseSheet(); break;
      case 'open-weight': openWeightSheet(); break;
      case 'coach-hide': coachHide(el.dataset.rule); break;
      case 'toggle-coach': toggleCoach(); break;
      case 'toggle-coach-ledger': toggleCoachLedger(); break;
      case 'delete-weight': deleteWeight(el.dataset.date); break;
      case 'open-ai': openAISheet(); break;
      case 'open-coach': openCoachSheet(); break;
      case 'coach-send': sendCoachQuestion(); break;
      case 'coach-suggest': sendCoachQuestion(el.dataset.q); break;
      case 'coach-clear': {
        if (state.coach) state.coach.messages = [];
        updateCoachView();
        break;
      }
      case 'coach-config': openAISheet(); break;
      case 'coach-retry': if (state.coachLast) sendCoachQuestion(state.coachLast); break;
      case 'open-pin': openPinSheet(); break;
      case 'pin-save': savePin(); break;
      case 'pin-off': disablePin(); break;
      case 'unlock': tryUnlock(); break;
      case 'lock-now': lockNow(); break;
      case 'undo-last': undoLast(); break;
      case 'export-health-csv': exportHealthCSV(); break;
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
      case 'pick-portion': {
        const item = FL && FL.byName(el.dataset.name);
        const g = Math.max(1, Number(el.dataset.g) || item.portions[0].grams);
        if (item) foodFromLib(item, g, el.dataset.label ? { label: el.dataset.label, grams: g } : null);
        break;
      }
      case 'food-fav': {
        const name = el.dataset.name;
        if (!name) break;
        const idx = DB.favorites.indexOf(name);
        if (idx >= 0) DB.favorites.splice(idx, 1);
        else DB.favorites.push(name);
        saveDB(true);
        updatePicks();
        break;
      }
      case 'food-cat': {
        if (!sd) break;
        const v = el.dataset.v;
        if (FL && FL.ready()) sd.cat = v === '' ? null : v;
        else sd.cat = v === '' ? null : Number(v);
        updatePicks();
        break;
      }
      case 'cart-remove': {
        if (!sd) break;
        sd.cart.splice(Number(el.dataset.i), 1);
        updateCart();
        break;
      }
      case 'cart-step': {
        if (!sd || !sd.cart) break;
        const i = Number(el.dataset.i);
        const item = sd.cart[i];
        if (!item) break;
        const g = Math.round(Number(item.grams) || 0) + Number(el.dataset.d);
        if (g <= 0) {
          sd.cart.splice(i, 1);
          updateCart();
          break;
        }
        if (g > 3000) { toast('单项份量别超过 3000g'); break; }
        item.grams = g;
        item.portion = null;
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
          const before = DB.combos.length;
          DB.combos.push({
            id: uid(), name: name, createdAt: Date.now(),
            items: sd.cart.map(it => ({
              name: it.food.name, grams: it.grams,
              kcal: Math.round(it.food.kcal * it.grams / 100),
              p: round1(it.food.p * it.grams / 100),
              per100: { kcal: it.food.kcal, p: it.food.p, c: it.food.c, f: it.food.f, fib: it.food.fib }
            }))
          });
          if (!commit(() => { DB.combos.length = before; })) return;
          toast('组合「' + name + '」已保存');
        });
        break;
      }
      case 'save-recipe': saveRecipeFromCart(); break;
      case 'open-lift': openLiftSheet(); break;
      case 'save-lift': saveLift(); break;
      case 'lift-csv': exportLiftCSV(); break;
      case 'delete-lift': deleteLift(el.dataset.id); break;
      case 'open-recipes': openRecipesSheet(); break;
      case 'recipe-add': addRecipeToMeal(el.dataset.id); break;
      case 'recipe-shop': makeShoppingFromRecipe(el.dataset.id); break;
      case 'recipe-del': deleteRecipe(el.dataset.id); break;
      case 'open-shopping': openShoppingSheet(); break;
      case 'shop-toggle': toggleShopping(Number(el.dataset.i)); break;
      case 'shop-clear': clearShopping(); break;
      case 'week-card': openWeekCard(el.dataset.scope || 'this'); break;
      case 'week-download': downloadWeekCard(); break;
      case 'photo-pick': pickPhoto(); break;
      case 'open-photos': openPhotosSheet(); break;
      case 'photo-del': deletePhoto(el.dataset.id); break;
      case 'photo-clear': clearPhotos(); break;
      case 'import-wearable': pickWearableFile(); break;
      case 'wearable-apply': applyWearableImport(); break;
      case 'save-manual': saveManual(); break;
      case 'edit-entry': openEntrySheet(el.dataset.id); break;
      case 'entry-grams': {
        const g = $('#eGrams');
        if (g) g.value = el.dataset.v;
        updateEntryGramsView();
        break;
      }
      case 'entry-step': {
        const g = $('#eGrams');
        if (!g) break;
        const v = Math.round(Number(g.value) || 0) + Number(el.dataset.d);
        if (v < 1) { toast('份量至少 1g；要删掉这一笔请点「删除」'); break; }
        if (v > 3000) { toast('单项份量别超过 3000g'); break; }
        g.value = v;
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
      case 'heat-view': {
        state.heatView = el.dataset.v === 'month' ? 'month' : 'year';
        if (state.heatView === 'month' && !state.heatMonth) state.heatMonth = E.todayKey().slice(0, 7);
        renderLedger();
        break;
      }
      case 'heat-month': {
        const base = state.heatMonth || E.todayKey().slice(0, 7);
        state.heatMonth = heatMonthShift(base, Number(el.dataset.d) || 0);
        renderLedger();
        break;
      }
      case 'heat-day': {
        if (!el.dataset.date || el.dataset.date > E.todayKey()) break;
        state.recordDate = el.dataset.date;
        renderLedger();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }
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
      case 'repeat-meal': repeatMeal(el.dataset.meal); break;
      case 'open-control': openControlSheet(); break;
      case 'open-portion': openPortionSheet(); break;
      case 'open-planner': openMealBuilder(); break;
      case 'planner-style': {
        if (!sd || sd.type !== 'planner') break;
        sd.style = el.dataset.v || 'balanced';
        sd.seed = 0;
        const st = snapshot(E.todayKey());
        const remain = Math.max(250, st ? st.budget - st.sum.kcal : 600);
        const gap = Math.max(0, st ? st.t.protein - st.sum.p : 40);
        sd.combos = buildMealCombos(remain, gap, sd.style, 0);
        const box = $('#plannerBody');
        if (box) box.innerHTML = renderPlanner();
        break;
      }
      case 'planner-shuffle': {
        if (!sd || sd.type !== 'planner') break;
        sd.seed = (sd.seed || 0) + 1;
        const st = snapshot(E.todayKey());
        const remain = Math.max(250, st ? st.budget - st.sum.kcal : 600);
        const gap = Math.max(0, st ? st.t.protein - st.sum.p : 40);
        sd.combos = buildMealCombos(remain, gap, sd.style, sd.seed);
        const box = $('#plannerBody');
        if (box) box.innerHTML = renderPlanner();
        break;
      }
      case 'planner-log': {
        if (!sd || sd.type !== 'planner') break;
        const combo = sd.combos[Number(el.dataset.i)];
        if (!combo) break;
        const n = addItemsToMeals(combo.items, sd.date, sd.meal, '配餐记入');
        if (n) toast('已记入 ' + n + ' 项 · ' + fmt(combo.t.kcal) + ' kcal');
        break;
      }
      case 'open-daily': openDailyPlan(); break;
      case 'open-reco': openRecoSheet({ random: el.dataset.random === '1' }); break;
      case 'reco-pref': {
        if (!sd || sd.type !== 'reco') break;
        const k = el.dataset.v;
        DB.reco.prefs[k] = !DB.reco.prefs[k];
        RECO_CACHE = null;
        saveDB(true);
        sd.plan = recoBuildPlan(sd.plan.seed || 0);
        paintReco();
        toast('偏好已记住：' + (DB.reco.prefs[k] ? '开启 ' : '关闭 ') + ({ veg: '素食', lowcarb: '低碳', highprotein: '高蛋白', light: '清淡' }[k] || ''));
        break;
      }
      case 'reco-swap': recoSwap(el.dataset.meal); break;
      case 'reco-random': recoRandomAll(); break;
      case 'reco-cart': recoToCart(el.dataset.meal, Number(el.dataset.i)); break;
      case 'reco-log': recoLog(el.dataset.meal, Number(el.dataset.i)); break;
      case 'reco-log-plan': recoLogPlan(); break;
      case 'open-scratch': openScratchSheet(); break;
      case 'open-rewards': openRewardCenter(); break;
      case 'open-stamps': openStampSheet(); break;
      case 'stamp-claim': claimStampPage(el.dataset.id, el.dataset.kind); break;
      case 'toggle-elder': {
        DB.settings.elder = !DB.settings.elder;
        saveDB(true);
        applyElder();
        applyModeChrome();
        renderActive();
        toast(DB.settings.elder ? '长辈模式已开启：字号放大、入口精简' : '已退出长辈模式');
        break;
      }
      case 'open-gacha': openGachaSheet(); break;
      case 'gacha-draw': gachaGo(Number(el.dataset.n) || 1, false); break;
      case 'gacha-confirm': gachaGo(Number(el.dataset.n) || 1, true); break;
      case 'gacha-confirm-cancel': {
        const box = $('#gachaConfirm');
        if (box) box.innerHTML = '';
        break;
      }
      case 'gacha-skip': if (state.gachaLast) paintGachaResults(state.gachaLast); break;
      case 'redeem-code': redeemCode(); break;
      case 'ver-seen': dismissAnnounce('seen'); break;
      case 'ver-snooze': dismissAnnounce('snooze'); break;
      case 'ver-toggle': {
        const d = $('#verBanner .vb-detail');
        if (!d) break;
        d.hidden = !d.hidden;
        el.setAttribute('aria-expanded', d.hidden ? 'false' : 'true');
        el.textContent = d.hidden ? '更新点' : '收起';
        break;
      }
      case 'skin-download': downloadSkinPack(el.dataset.id); break;
      case 'toggle-power-save':
        DB.settings.powerSave = !DB.settings.powerSave;
        saveDB(true);
        applyFx();
        if (state.globe && state.globe.destroy) { state.globe.destroy(); state.globe = null; }
        if (state.sheet === 'settings') renderSettings();
        if (state.tab === 'trip' && isFull()) renderActive();
        toast(DB.settings.powerSave ? '省电模式已开启 · 全部动效关闭' : '省电模式已关闭');
        break;
      case 'toggle-motion': {
        const sup = motionSupport();
        if (!sup.ok) { toast(sup.why); break; }
        DB.settings.motion = !DB.settings.motion;
        saveDB(true);
        if (DB.settings.motion) startMotionCounting();
        else { state.steps = null; }
        if (state.sheet === 'settings') renderSettings();
        if (state.tab === 'trip' && isFull()) renderActive();
        toast(DB.settings.motion ? '计步已开启 · 屏幕熄灭会停止、晃动会误判' : '计步已关闭');
        break;
      }
      case 'toggle-fx':
        DB.settings.fx = !DB.settings.fx;
        saveDB(true);
        applyFx();
        openScratchSheet();
        toast(DB.settings.fx ? '动效已开启' : '动效已关闭');
        break;
      case 'scratch-reveal': revealScratchCard(); break;
      case 'open-wallet': openWalletSheet(); break;
      case 'credit-toggle':
        state.creditOpen = !state.creditOpen;
        renderToday();
        break;
      case 'wallet-use': useWalletCredit(el.dataset.id); break;
      case 'pass-use': useCheatPass(); break;
      case 'bank-borrow': borrowBudget(); break;
      case 'revive-use': useRevive(el.dataset.id); break;
      case 'open-codex': openCodexSheet(); break;
      case 'open-skins': openSkinsSheet(); break;
      case 'skin-apply': applySkin(el.dataset.id); break;
      case 'open-skin-gallery': openSkinGallery(); break;
      case 'gallery-filter': {
        if (!sd || sd.type !== 'gallery') break;
        sd.filter = el.dataset.f || 'all';
        const box = $('#galleryBody');
        if (box) box.innerHTML = renderSkinGallery();
        break;
      }
      case 'gallery-pick': {
        if (!sd || sd.type !== 'gallery') break;
        const s = skinById(el.dataset.id);
        if (!s) break;
        sd.selected = s.id;
        if (!skinUnlocked(s.id)) toast('未解锁 · 获取方式：' + s.src);
        previewSkinFx(s.id);
        const box = $('#galleryBody');
        if (box) box.innerHTML = renderSkinGallery();
        break;
      }
      case 'skin-set-active': {
        applySkin(el.dataset.id);
        const box = $('#galleryBody');
        if (box) box.innerHTML = renderSkinGallery();
        break;
      }
      case 'cos-apply': {
        const kind = el.dataset.kind, cid = el.dataset.id;
        if (!cosUnlocked(kind, cid)) {
          const def = COS_KINDS[kind];
          const item = def && def.list.find(x => x.id === cid);
          toast('未解锁：' + (item ? item.name : cid) + ' · 稀有档抽奖掉落');
          break;
        }
        if (applyCos(kind, cid)) {
          const box = $('#galleryBody');
          if (box) box.innerHTML = renderSkinGallery();
        }
        break;
      }
      case 'scratch-draw': drawTicket(); break;
      case 'export-scratch-log': exportScratchLog(); break;
      case 'scratch-batch': {
        const tk = DB.scratch.tickets.length;
        if (!tk) { toast('券袋是空的，先看看怎么拿券'); break; }
        startBatch(Math.min(5, tk));
        break;
      }
      case 'batch-reveal': settleBatch(); break;
      case 'batch-resume': {
        const pb = DB.scratch.batch;
        if (!pb) break;
        state.batch = hydrateBatch(pb);
        openBatchSheet();
        break;
      }
      case 'batch-skip': {
        const grid = $('#batchGrid');
        if (grid) grid.classList.remove('anim');
        const skip = $('[data-act="batch-skip"]');
        if (skip) skip.remove();
        break;
      }
      case 'ticket-help': {
        const slot = $('#ticketHelpSlot');
        if (slot) slot.innerHTML = ticketHelpHtml(true);
        break;
      }
      case 'goto-trend': closeSheet(); setTab('trend'); break;
      case 'maint-open':
        if (window.Maintenance) window.Maintenance.openSheet();
        else { toast('维护模块加载中…'); ensureMaint().then(ok => { if (ok) window.Maintenance.openSheet(); }); }
        break;
      case 'ver-tap': {
        const now = Date.now();
        if (!state.verTap || now - state.verTap.last > 5000) state.verTap = { n: 0, last: now };
        state.verTap.n++;
        state.verTap.last = now;
        if (state.verTap.n >= 7) {
          state.verTap.n = 0;
          if (window.Maintenance) window.Maintenance.openSheet();
          else ensureMaint().then(ok => { if (ok) window.Maintenance.openSheet(); });
        }
        break;
      }
      case 'set-mode': switchMode(el.dataset.v); break;
      case 'mode-hint-seen':
        DB.settings.modeHintSeen = true;
        if (!commit(() => { DB.settings.modeHintSeen = false; })) return;
        renderActive();
        break;
      case 'open-ledger-add': openLedgerAddSheet(); break;
      case 'lg-go': {
        const go = el.dataset.go;
        closeSheet();
        if (go === 'add') openFoodSheet({ date: E.todayKey() });
        else if (go === 'weight') openWeightSheet();
        else if (go === 'exercise') openExerciseSheet();
        break;
      }
      case 'maint-unlock': {
        const input = $('#maintPass');
        if (window.Maintenance) window.Maintenance.unlock(input ? input.value : '');
        break;
      }
      case 'maint-exit': if (window.Maintenance) window.Maintenance.exit(); break;
      case 'maint-sim': if (window.Maintenance) window.Maintenance.simulate(); break;
      case 'daily-card': exportDailyCard(); break;
      case 'daily-shuffle': {
        if (!sd || sd.type !== 'daily') break;
        sd.seed = (sd.seed || 0) + 1;
        sd.plan = buildDailyPlan(sd.seed);
        const box = $('#dailyBody');
        if (box) box.innerHTML = renderDailyPlan();
        break;
      }
      case 'plan-meal-shuffle': {
        if (!sd || sd.type !== 'daily') break;
        sd.seed = (sd.seed || 0) + 1;
        const meal = el.dataset.meal;
        const share = meal === 'lunch' ? 0.4 : meal === 'dinner' ? 0.32 : 0.26;
        sd.plan.meals[meal] = pickMealPlan(meal, sd.plan.budget * share, sd.seed);
        sd.plan.total = mealTotals(sd.plan.meals.breakfast.concat(sd.plan.meals.lunch, sd.plan.meals.dinner));
        const box = $('#dailyBody');
        if (box) box.innerHTML = renderDailyPlan();
        break;
      }
      case 'daily-log': {
        if (!sd || sd.type !== 'daily') break;
        const all = sd.plan.meals.breakfast.concat(sd.plan.meals.lunch, sd.plan.meals.dinner);
        const n = addItemsToMeals(all, E.todayKey(), 'lunch', '一日三餐计划记入');
        if (n) toast('已按计划记入 ' + n + ' 项');
        break;
      }
      case 'daily-shop': {
        if (!sd || sd.type !== 'daily') break;
        const items = dailyShopList();
        const before = DB.shopping;
        DB.shopping = { recipeId: '', recipeName: '一日三餐计划', at: Date.now(), items: items };
        if (!commit(() => { DB.shopping = before; })) break;
        openShoppingSheet();
        break;
      }
      case 'open-dining': openDining(); break;
      case 'dine-pick': {
        if (!sd || sd.type !== 'dining') break;
        const d = exactCatalog(el.dataset.name);
        if (!d) break;
        sd.items.push(itemFromCatalog(d));
        const box = $('#dineBody');
        if (box) box.innerHTML = renderDining();
        break;
      }
      case 'dine-remove': {
        if (!sd || sd.type !== 'dining') break;
        sd.items.splice(Number(el.dataset.i), 1);
        const box = $('#dineBody');
        if (box) box.innerHTML = renderDining();
        break;
      }
      case 'dine-swap-staple': {
        if (!sd || sd.type !== 'dining') break;
        sd.items = sd.items.map(it => (/米饭|面|粉|粥|红薯|玉米/.test(it.name) && it.grams > 100 ? itemFromCatalog(it.d, Math.round(it.grams / 2)) : it));
        const box = $('#dineBody');
        if (box) box.innerHTML = renderDining();
        toast('主食已减半');
        break;
      }
      case 'dine-swap-drink': {
        if (!sd || sd.type !== 'dining') break;
        const tea = exactCatalog('无糖茶');
        if (!tea) break;
        let changed = false;
        sd.items = sd.items.map(it => {
          if (it.d && it.d.cat === 'drink') { changed = true; return itemFromCatalog(tea); }
          return it;
        });
        const box = $('#dineBody');
        if (box) box.innerHTML = renderDining();
        toast(changed ? '饮料已换无糖茶' : '这顿没有饮料');
        break;
      }
      case 'dine-swap-light': {
        if (!sd || sd.type !== 'dining' || !sd.items.length) break;
        let idx = 0;
        sd.items.forEach((it, i) => { if (it.control.oil > sd.items[idx].control.oil) idx = i; });
        sd.items[idx] = itemFromCatalog(sd.items[idx].d, Math.round(sd.items[idx].grams * 0.7));
        const box = $('#dineBody');
        if (box) box.innerHTML = renderDining();
        toast('最高油的一道已减量 30%');
        break;
      }
      case 'dine-log': {
        if (!sd || sd.type !== 'dining' || !sd.items.length) { toast('先加一道菜'); break; }
        const n = addItemsToMeals(sd.items, sd.date, sd.meal, '外卖/聚餐记入');
        if (n) toast('已记入 ' + n + ' 项');
        break;
      }
      case 'open-pantry':
      case 'open-fridge': openFridge(); break;
      case 'pantry-deduct-toggle': {
        if (!sd || sd.type !== 'food') break;
        sd.pantryDeduct = sd.pantryDeduct === false;
        updateCart();
        break;
      }
      case 'fridge-add': openFridgeAdd(); break;
      case 'fridge-pick': {
        if (!sd || sd.type !== 'fridgeAdd') break;
        const nm = String(el.dataset.name || '');
        sd.name = nm;
        const inp = $('#fridgeName');
        if (inp) inp.value = nm;
        const hint = $('#fridgeAddHint');
        if (hint) hint.textContent = '已选食物库：' + nm + '。同一食物同单位再入库会累加。';
        break;
      }
      case 'fridge-unit': {
        if (!sd || sd.type !== 'fridgeAdd') break;
        const seg = $('#fridgeUnits');
        if (seg) $$('button', seg).forEach(b => b.classList.toggle('on', b === el));
        sd.unit = pantryUnitOk(el.dataset.v);
        break;
      }
      case 'fridge-add-save': saveFridgeAdd(); break;
      case 'fridge-use': openFridgeUse(el.dataset.id, { returnEntry: el.dataset.entry || '' }); break;
      case 'fridge-use-save': saveFridgeUse(); break;
      case 'fridge-del': {
        const item = pantryItems().find(x => x.id === el.dataset.id);
        if (!item) break;
        confirmSheet('删除这项库存？', '只影响库存，不影响已经记过的餐。', '删除', true).then(ok => {
          if (!ok) return;
          const before = JSON.parse(JSON.stringify(DB.pantry));
          pantryClearItem(item, '删除');
          if (!commit(() => { DB.pantry = before; })) return;
          openFridge();
          renderActive();
          toast('已删除 ' + item.name);
        });
        break;
      }
      case 'fridge-clear-expired': {
        const today = E.todayKey();
        const exp = pantryStock().filter(it => pantryStatus(it, today).key === 'expired');
        if (!exp.length) { toast('没有已过期的库存'); break; }
        const before = JSON.parse(JSON.stringify(DB.pantry));
        exp.forEach(it => pantryClearItem(it, '清理过期'));
        if (!commit(() => { DB.pantry = before; })) return;
        openFridge();
        renderActive();
        toast('已清理 ' + exp.length + ' 项过期库存');
        break;
      }
      case 'fridge-hint-close': {
        DB.pantry.hintDate = E.todayKey();
        saveDB(true);
        renderActive();
        break;
      }
      case 'open-weekly': openWeekly(); break;
      case 'open-month': openMonthSheet(); break;
      case 'month-prev': state.monthKey = shiftMonthKey(state.monthKey || E.todayKey().slice(0, 7), -1); paintMonth(); break;
      case 'month-next': state.monthKey = shiftMonthKey(state.monthKey || E.todayKey().slice(0, 7), 1); paintMonth(); break;
      case 'month-export': exportMonthStatement(); break;
      case 'weekly-copy': {
        const txt = weeklyText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(() => toast('复盘已复制'), () => toast('复制失败，请手动选中'));
        } else toast('当前浏览器不支持复制');
        break;
      }
      case 'open-control-cal': openControlCalendar(); break;
      case 'control-day': {
        const d = el.dataset.date;
        const c = controlTotals(d);
        toast(d + ' · 糖 ' + c.sugar + 'g / 油 ' + c.oil + 'g / 盐 ' + c.salt + 'g' + (c.counted ? '' : '（无拆解）'));
        break;
      }
      case 'open-quicklog': openQuickLog(); break;
      case 'quicklog-parse':
      case 'quicklog-example': {
        if (!sd || sd.type !== 'quicklog') break;
        if (el.dataset.v) { const i = $('#quickText'); if (i) i.value = el.dataset.v; }
        const text = ($('#quickText') || {}).value || '';
        const parsed = parseQuickText(text);
        sd.items = parsed.items;
        sd.meal = parsed.meal;
        const box = $('#quickBody');
        if (box) box.innerHTML = renderQuickLog();
        if (!parsed.items.length) toast('没认出来，换种说法或用品名估算');
        break;
      }
      case 'quicklog-remove': {
        if (!sd || sd.type !== 'quicklog') break;
        sd.items.splice(Number(el.dataset.i), 1);
        const box = $('#quickBody');
        if (box) box.innerHTML = renderQuickLog();
        break;
      }
      case 'quicklog-log': {
        if (!sd || sd.type !== 'quicklog' || !sd.items.length) { toast('先解析一句话'); break; }
        const n = addItemsToMeals(sd.items, E.todayKey(), sd.meal, '一句话快记');
        if (n) toast('已记入 ' + n + ' 项');
        break;
      }
      case 'quicklog-mic': {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { toast('这个浏览器不支持语音，直接输入文字即可'); break; }
        const rec = new SR();
        rec.lang = 'zh-CN';
        rec.onresult = ev => {
          const text = ev.results[0][0].transcript;
          const i = $('#quickText');
          if (i) i.value = text;
          const parsed = parseQuickText(text);
          if (sd && sd.type === 'quicklog') {
            sd.items = parsed.items; sd.meal = parsed.meal;
            const box = $('#quickBody');
            if (box) box.innerHTML = renderQuickLog();
          }
        };
        rec.onerror = () => toast('没听清，再试一次或直接输入');
        rec.start();
        toast('正在听…');
        break;
      }
      case 'open-metabolism': openMetabolism(); break;
      case 'portion-tab': setPortionTab(el.dataset.v || 'hand'); break;
      case 'portion-dish': openDishSheet({ date: E.todayKey(), meal: E.guessMeal(), query: el.dataset.name }); break;
      case 'entry-portion': {
        const gi = $('#eGrams');
        if (gi) {
          gi.value = el.dataset.g;
          gi.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      }
      case 'control-tab': {
        if (!sd) break;
        sd.tab = el.dataset.v || 'sugar';
        const box = $('#controlBody');
        if (box) box.innerHTML = renderControlSheet();
        break;
      }
      case 'control-check': {
        const today = E.todayKey();
        const list = (DB.controlChecks[today] || []).slice();
        const i = Number(el.dataset.i);
        const idx = list.indexOf(i);
        if (idx >= 0) list.splice(idx, 1); else list.push(i);
        const before = DB.controlChecks[today];
        DB.controlChecks[today] = list;
        if (!commit(() => { if (before == null) delete DB.controlChecks[today]; else DB.controlChecks[today] = before; })) break;
        const box = $('#controlBody');
        if (box) box.innerHTML = renderControlSheet();
        break;
      }
      case 'control-radar': {
        openDishSheet({ date: E.todayKey(), meal: E.guessMeal(), query: el.dataset.name });
        break;
      }
      case 'gap-add': {
        const f = allFoods().find(x => x.id === el.dataset.food);
        const grams = Number(el.dataset.grams) || 100;
        if (!f) { toast('这个食物不在当前食物库里'); break; }
        if (grams < 1 || grams > 3000) { toast('份量需要在 1–3000g'); break; }
        const meal = E.guessMeal();
        const today = E.todayKey();
        const before = DB.entries.length;
        const entry = makeEntry(f, grams, meal, today, 'lib', 'med');
        DB.entries.push(entry);
        if (!commit(() => { DB.entries.length = before; })) break;
        logChange('补记「' + f.name + '」' + grams + 'g', { kind: 'entry-add', item: entry });
        renderToday();
        toast('已加 ' + f.name + ' ' + grams + 'g · 蛋白 +' + round1(f.p * grams / 100) + 'g');
        break;
      }
      case 'recent-add': addRecent(el.dataset.id); break;
      /* v5.3 第一笔一键模板 */
      case 'quick-eat': quickFirstEntry('eat'); break;
      case 'quick-move': quickFirstEntry('move'); break;
      case 'quick-weight': openWeightSheet(); break;
      /* v5.3 图鉴动效微预览：复用满功率窗口 3 秒 */
      case 'skin-preview': previewSkinFx(el.dataset.id); break;
      case 'quick-water': {
        const today = E.todayKey();
        const before = DB.water[today];
        DB.water[today] = (Number(DB.water[today]) || 0) + Number(el.dataset.ml || 250);
        if (!commit(() => { if (before == null) delete DB.water[today]; else DB.water[today] = before; })) break;
        renderToday();
        break;
      }
      case 'set-range': state.range = Number(el.dataset.v); renderTrend(); break;
      case 'open-cycle': openCycleSheet(); break;
      case 'cycle-save': saveCycle(); break;
      case 'cycle-today': markPeriodToday(); break;
      case 'cycle-off': stopCycle(); break;
      case 'open-measure': openMeasureSheet(); break;
      case 'save-measure': saveMeasure(); break;
      case 'open-checkin': openCheckinSheet(); break;
      case 'save-checkin': saveCheckin(); break;
      case 'toggle-symptom': {
        if (!sd || sd.type !== 'checkin') break;
        const v = el.dataset.v;
        const i = sd.symptoms.indexOf(v);
        if (i > -1) sd.symptoms.splice(i, 1); else sd.symptoms.push(v);
        el.classList.toggle('on', sd.symptoms.indexOf(v) > -1);
        break;
      }
      case 'open-supplement': openSupplementSheet(); break;
      case 'save-supplement': saveSupplement(); break;
      case 'del-supplement': deleteSupplement(el.dataset.id); break;
      case 'open-prefs': openPrefsSheet(); break;
      case 'save-prefs': savePrefs(); break;
      case 'toggle-pref': {
        if (!sd || sd.type !== 'prefs') break;
        const v = el.dataset.v;
        sd.prefs[v] = !sd.prefs[v];
        el.classList.toggle('on', !!sd.prefs[v]);
        break;
      }
      case 'open-report': openReport(); break;
      case 'report-print': {
        const frame = $('#reportFrame');
        if (frame && frame.contentWindow) {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        }
        break;
      }
      case 'report-download': {
        if (state.reportHTML) downloadFile('能量账本-就诊摘要-' + dateStamp() + '.html', state.reportHTML, 'text/html;charset=utf-8');
        break;
      }
      case 'close-report': {
        const overlay = $('#reportOverlay');
        if (overlay) overlay.remove();
        break;
      }
      case 'toggle-gentle': {
        const before = DB.settings.gentle;
        DB.settings.gentle = !DB.settings.gentle;
        if (!commit(() => { DB.settings.gentle = before; })) break;
        applyTheme();
        renderActive();
        toast(DB.settings.gentle ? '温和模式已开启' : '已恢复精确数字');
        break;
      }
      case 'goto-body': setTab('body'); break;
      case 'set-theme': {
        const before = DB.settings.theme;
        DB.settings.theme = el.dataset.v;
        if (!commit(() => { DB.settings.theme = before; })) break;
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
        renderExList();
        renderExCalc();
        break;
      }
      case 'ex-intensity': {
        if (!sd || sd.type !== 'exercise') break;
        sd.intensity = el.dataset.v || 'mid';
        renderExCalc();
        break;
      }
      case 'ex-stroke': {
        const sdx = state.sheetData;
        if (!sdx || sdx.type !== 'exercise') break;
        sdx.stroke = el.dataset.v || '蛙泳';
        renderExCalc();
        break;
      }
      case 'ex-filter': {
        state.tripFilter = el.dataset.id || 'all';
        renderActive();
        break;
      }
      case 'why-km': explainKm(el.dataset.id); break;
      case 'ex-import': pickExFile(); break;
      case 'imp-type': {
        if (state.importRes) { state.importRes.type = el.dataset.id; showImportConfirm(state.importRes); }
        break;
      }
      case 'imp-save': saveImported(); break;
      case 'steps-settle': settleSteps(); break;
      case 'save-exercise': saveExercise(); break;
      case 'del-exercise': {
        const item = DB.exercises.find(x => x.id === el.dataset.id);
        const before = DB.exercises.slice();
        const tripBefore = { km: DB.trip.total_km, at: DB.trip.updatedAt };
        DB.exercises = DB.exercises.filter(x => x.id !== el.dataset.id);
        syncTrip(false);
        if (!commit(() => {
          DB.exercises = before;
          DB.trip.total_km = tripBefore.km;
          DB.trip.updatedAt = tripBefore.at;
        })) break;
        if (item) logChange('删除运动「' + item.name + '」', { kind: 'exercise', item: item });
        renderExToday();
        renderActive();
        toast('已删除这条运动');
        break;
      }
      case 'trip-collect': tripCollect(el.dataset.no); break;
      case 'ai-run': runAI(); break;
      case 'ai-test': testAIConnection(); break;
      case 'ai-preset': {
        const b = $('#aiBase'), m = $('#aiModel');
        if (b) b.value = el.dataset.base;
        if (m) m.value = el.dataset.model;
        toast('已填入 ' + el.textContent.trim() + ' 的接口');
        break;
      }
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
        const item = DB.foods.find(f => f.id === el.dataset.id);
        const before = DB.foods.slice();
        DB.foods = DB.foods.filter(f => f.id !== el.dataset.id);
        if (!commit(() => { DB.foods = before; })) return;
        if (item) logChange('删除自定义食物「' + item.name + '」', { kind: 'food', item: item });
        renderLibrarySheet();
        toast('已删除');
      }); break;
      case 'del-combo': confirmSheet('删除这个组合？', '组合只是快捷方式，不影响已经记录的账目。', '删除', true).then(ok => {
        if (!ok) return;
        const item = DB.combos.find(c => c.id === el.dataset.id);
        const before = DB.combos.slice();
        DB.combos = DB.combos.filter(c => c.id !== el.dataset.id);
        if (!commit(() => { DB.combos = before; })) return;
        if (item) logChange('删除组合「' + item.name + '」', { kind: 'combo', item: item });
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
    const idx = DB.entries.findIndex(x => x.id === sd.id);
    const before = Object.assign({}, e);
    let nextGrams = null;
    let nextKcal = null;
    if (e.per100) {
      const raw = $('#eGrams') ? $('#eGrams').value : '';
      const g = Number(raw);
      if (raw === '' || !isFinite(g) || g < 1 || g > 3000) { toast('份量要填 1–3000g 之间的数字'); return; }
      nextGrams = g;
    } else {
      const raw = $('#eKcal') ? $('#eKcal').value : '';
      const kcal = Number(raw);
      if (raw === '' || !isFinite(kcal) || kcal < 0) { toast('热量要填 0 或更大的数字'); return; }
      if (kcal > 5000) { toast('单笔热量别超过 5000 kcal，请检查是否填错'); return; }
      nextKcal = kcal;
    }
    const name = ($('#eName') && $('#eName').value.trim()) || e.name;
    e.name = name;
    e.meal = sd.meal || e.meal;
    e.conf = sd.conf || E.confOf(e);
    if (e.per100) {
      const g = nextGrams;
      e.grams = g;
      e.kcal = Math.round(e.per100.kcal * g / 100);
      e.p = round1(e.per100.p * g / 100);
      e.c = round1(e.per100.c * g / 100);
      e.f = round1(e.per100.f * g / 100);
      e.fib = round1(e.per100.fib * g / 100);
      if (before.components && before.grams) {
        const ratio = g / before.grams;
        e.components = before.components.map(c => ({
          name: c.name, grams: Math.max(1, Math.round(c.grams * ratio)), kcal: Math.round(c.kcal * ratio), p: round1((c.p || 0) * ratio)
        }));
        if (before.control) {
          e.control = {
            sugar: round1(before.control.sugar * ratio), oil: round1(before.control.oil * ratio),
            salt: round1(before.control.salt * ratio), sodium: Math.round(before.control.sodium * ratio)
          };
          e.sugar = e.control.sugar; e.oil = e.control.oil; e.salt = e.control.salt; e.sodium = e.control.sodium;
        }
      }
    } else {
      e.kcal = Math.round(nextKcal);
      e.p = Number($('#eP') && $('#eP').value) || 0;
      e.per100 = null;
    }
    const changed = before.name !== e.name || before.kcal !== e.kcal || before.grams !== e.grams || before.meal !== e.meal || before.conf !== e.conf;
    if (!commit(() => { DB.entries[idx] = before; })) return;
    if (changed) logChange('修改记录「' + e.name + '」：' + Math.round(before.kcal) + ' → ' + Math.round(e.kcal) + ' kcal', { kind: 'entry-edit', item: before });
    closeSheet();
    renderActive();
    toast(changed ? '已更新这一笔，可在设置里撤销' : '这一笔没有变化');
  }

  function deleteEntry(id) {
    confirmSheet('删除这一笔？', '这条食物记录会从账本中移除；之后可以在设置里撤销。', '删除', true).then(ok => {
      if (!ok) return;
      const beforeDebt = isFull() ? creditEnsure(true).debt : 0;
      const item = DB.entries.find(e => e.id === id);
      const before = DB.entries.slice();
      DB.entries = DB.entries.filter(e => e.id !== id);
      if (!commit(() => { DB.entries = before; })) return;
      if (item) logChange('删除记录「' + item.name + '」', { kind: 'entry', item: item });
      const afterDebt = isFull() ? creditEnsure(true).debt : 0;
      closeSheet();
      renderActive();
      if (isFull() && beforeDebt !== afterDebt) {
        toast('已删除 · 欠款按剩余记录重算：' + fmt(beforeDebt) + ' → ' + fmt(afterDebt) + ' kcal（分期同步更新）');
      } else {
        toast('已删除');
      }
    });
  }

  function copyYesterday() {
    const target = state.recordDate;
    const source = E.addDays(target, -1);
    const list = DB.entries.filter(e => e.date === source);
    if (!list.length) { toast('昨天没有记录可以复制'); return; }
    const doCopy = () => {
      const before = DB.entries.length;
      list.forEach(e => {
        DB.entries.push(Object.assign({}, e, { id: uid(), date: target, createdAt: Date.now() }));
      });
      if (!commit(() => { DB.entries.length = before; })) return;
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
    const before = DB.entries.length;
    DB.entries.push(copy);
    if (!commit(() => { DB.entries.length = before; })) return;
    renderActive();
    toast('已记入 ' + E.mealLabel(copy.meal) + ' · ' + copy.kcal + ' kcal');
  }

  function logNextBite() {
    const today = E.todayKey();
    const st = snapshot(today);
    if (!st) return;
    const nb = E.nextBite({ remaining: st.remain, proteinGap: st.t.protein - st.sum.p, meal: E.guessMeal(), foods: allFoods(), seed: state.nextSeed });
    if (nb.type !== 'plan' || !nb.items.length) { toast('这一餐没有可记录的内容'); return; }
    const before = DB.entries.length;
    nb.items.forEach(it => {
      const food = { name: it.name, kcal: it.per100 || it.kcal / it.grams * 100, p: it.p100 || it.p / it.grams * 100, c: it.c100 || 0, f: it.f100 || 0, fib: it.fib100 || 0, cat: 0, catName: it.cat, unitG: 0 };
      const entry = makeEntry(food, it.grams, E.guessMeal(), today, 'combo', 'med');
      DB.entries.push(entry);
    });
    if (!commit(() => { DB.entries.length = before; })) return;
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

  /* ---------- 跨午夜自动翻篇 ---------- */
  let liveDay = E.todayKey();
  function checkDayRollover() {
    const t = E.todayKey();
    if (t === liveDay) return;
    const prev = liveDay;
    liveDay = t;
    if (state.recordDate === prev) state.recordDate = t;
    if (!state.sheet && !document.querySelector('#sheetWrap')) renderActive();
    toast('已进入新的一天 · ' + E.dateLabel(t));
  }
  setInterval(checkDayRollover, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDayRollover(); });

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
    if (t.id === 'ckHunger' || t.id === 'ckCraving' || t.id === 'ckMood') {
      const out = $('#' + t.id + 'Val');
      if (out) out.textContent = t.value;
      return;
    }
    if (t.id === 'foodSearch') {
      if (state.sheetData && state.sheetData.type === 'food') {
        state.sheetData.query = t.value;
        updatePicks();
      }
      return;
    }
    if (t.id === 'dishName') {
      if (state.sheetData && state.sheetData.type === 'dish') {
        state.sheetData.query = t.value;
        refreshDishSuggestions();
      }
      return;
    }
    if (t.id === 'portionSearch') {
      if (state.sheetData && state.sheetData.type === 'portion') {
        state.sheetData.query = t.value;
        const body = $('#portionBody');
        if (body) body.innerHTML = renderPortionBody();
      }
      return;
    }
    if (t.id === 'dineSearch') {
      if (state.sheetData && state.sheetData.type === 'dining') {
        state.sheetData.query = t.value;
        const body = $('#dineBody');
        if (body) body.innerHTML = renderDining();
      }
      return;
    }
    if (t.id === 'fridgeSearch') {
      if (state.sheetData && state.sheetData.type === 'fridgeAdd') {
        state.sheetData.query = t.value;
        renderFridgeAddResults();
      }
      return;
    }
    if (t.dataset && t.dataset.cartGrams != null) {
      const sd = state.sheetData;
      if (!sd || !sd.cart) return;
      const i = Number(t.dataset.cartGrams);
      const item = sd.cart[i];
      if (!item) return;
      if (t.value === '') return;
      const v = Number(t.value);
      if (!isFinite(v) || v <= 0 || v > 3000) return; // 非法值等 change 时统一提示
      item.grams = v;
      item.portion = null;
      paintCartTotals();
      paintPantryPreview();
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
      if (!sd || sd.type !== 'exercise') return;
      sd.minutes = clamp(Number(t.value) || 1, 1, 600);
      refreshExPreview();
      return;
    }
    if (t.id === 'exDistance' || t.id === 'exAscent' || t.id === 'exJumps' || t.id === 'exFloors') {
      const sd = state.sheetData;
      if (!sd || sd.type !== 'exercise') return;
      const map = { exDistance: 'distance', exAscent: 'ascent', exJumps: 'jumps', exFloors: 'floors' };
      sd[map[t.id]] = t.value;
      refreshExPreview();
      return;
    }
    if (t.id === 'eGrams') { updateEntryGramsView(); return; }
    if (t.id === 'liftWeight' || t.id === 'liftReps') { updateLiftPreview(); return; }
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
    if (t.id === 'exFile') { handleExFile(t); return; }
    if (t.id === 'photoFile') {
      handlePhotoFiles(t.files);
      return;
    }
    if (t.dataset && t.dataset.cartGrams != null) {
      const sd = state.sheetData;
      if (!sd || !sd.cart) return;
      const i = Number(t.dataset.cartGrams);
      const item = sd.cart[i];
      if (!item) return;
      const raw = t.value;
      const v = Number(raw);
      if (raw === '' || !isFinite(v) || v < 0) { t.value = item.grams; toast('份量要填 0–3000g 之间的数字'); return; }
      if (v > 3000) { t.value = item.grams; toast('单项份量别超过 3000g'); return; }
      if (v === 0) { sd.cart.splice(i, 1); updateCart(); return; }
      item.grams = v;
      item.portion = null;
      paintCartTotals();
      paintPantryPreview();
      return;
    }
    if (t.id === 'wearableFile') {
      const file = t.files && t.files[0];
      if (file) handleWearableFile(file);
      return;
    }
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
    if (t.dataset && t.dataset.wskip) {
      const sd = state.sheetData;
      if (sd && sd.type === 'wearable') sd.decisions[t.dataset.wskip] = !!t.checked;
      return;
    }
  });

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t && t.id === 'lockPin') {
      if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); }
      return;
    }
    if (t && t.id === 'coachInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendCoachQuestion();
      return;
    }
    if (t && t.id === 'dishName' && e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      refreshDishResult();
      return;
    }
    if (t && t.id === 'quickText' && e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      const b = document.querySelector('[data-act="quicklog-parse"]');
      if (b) b.click();
      return;
    }
    if (e.key === 'Escape') {
      if (miniState) { miniClose(false); return; }
      if ($('#sheetRoot') && $('#sheetRoot').innerHTML) { closeSheet(); }
    }
  });

  /* 自测钩子：只读/可控状态，便于无头浏览器真操作验收；不参与界面逻辑 */
  window.__v41 = {
    poolSize: function () { return recoPools().poolSize; },
    dish: function (name) {
      const d = buildDishCatalog().find(x => x.n === name);
      return d ? { n: d.n, g: d.grams, k: d.k, p: d.p, comps: d.c, cat: d.cat } : null;
    },
    pools: function () {
      const c = recoPools();
      return { breakfast: c.pool.breakfast.length, lunch: c.pool.lunch.length, dinner: c.pool.dinner.length, total: c.poolSize };
    },
    rollTier: function () { return scratchTier(0); },
    rollTierWithPity: function (miss) { return scratchTier(Number(miss) || 0); },
    scratchState: function () {
      return {
        card: DB.scratch.card, miss: DB.scratch.miss, count: DB.scratch.count,
        last: DB.scratch.last, wallet: DB.wallet, cheat: DB.cheatDays, leave: DB.leaveDays, wishlist: DB.wishlist
      };
    },
    setScratchMiss: function (n) { DB.scratch.miss = Math.max(0, Number(n) || 0); saveDB(true); return DB.scratch.miss; },
    budget: function () {
      const s = snapshot(E.todayKey());
      return s ? { budget: s.budget, base: s.baseBudget, applied: s.appliedKcal, cheat: s.cheat, remain: s.remain, intake: s.sum.kcal, protein: s.t.protein } : null;
    },
    grantCredit: function (kcal, opt) {
      const o = opt || {};
      addCredit(Number(kcal) || 150, o.kind === 'week' ? 'week' : 'day', o.expire || E.todayKey(), o.label || '测试额度', '测试');
      return DB.wallet.credits.slice();
    },
    grantCapped: function (kcal) { return creditCapGrant(Number(kcal) || 150, '测试额度', '测试'); },
    grantPass: function () {
      DB.scratch.pass = { week: weekId(), used: false };
      saveDB(true);
      return DB.scratch.pass;
    },
    grantRevive: function () { addRevive(); return DB.revive.slice(); },
    unlockRandomSkin: function (tier) { const s = unlockRandomSkin(tier); return s ? s.id : null; },
    streakNow: function () { return streakNow(); },
    clearCheat: function (date) {
      const d = date || E.todayKey();
      DB.cheatDays.history = DB.cheatDays.history.filter(h => h.date !== d);
      saveDB(true);
      return DB.cheatDays.history.slice();
    },
    plan: function () {
      const sd = state.sheetData;
      if (!sd || sd.type !== 'reco') return null;
      const out = { prefs: Object.assign({}, DB.reco.prefs), pool: recoPools().poolSize, sets: {}, sigs: [], kcal: {}, protein: {} };
      RECO_MEALS.forEach(m => {
        const arr = sd.plan.sets[m.key] || [];
        out.sets[m.key] = arr.map(s => ({ sig: s.sig, n: s.items.length, kcal: s.kcal, p: s.p, items: s.items.map(it => it.name) }));
        out.kcal[m.key] = arr.map(s => s.kcal);
        out.protein[m.key] = arr.map(s => s.p);
        arr.forEach(s => out.sigs.push(s.sig));
      });
      out.total = out.sigs.length;
      out.unique = Array.from(new Set(out.sigs)).length;
      out.seen = DB.reco.seen.length;
      return out;
    }
  };

  window.__v43 = {
    poolAudit: function () {
      const c = recoPools();
      const out = { total: c.poolSize, meals: {} };
      ['breakfast', 'lunch', 'dinner'].forEach(m => {
        const arr = c.pool[m] || [];
        const ks = arr.map(s => s.kcal);
        const sigs = {};
        arr.forEach(s => { sigs[s.sig] = 1; });
        const r = RECO_KCAL_RANGE[m];
        out.meals[m] = {
          count: arr.length, unique: Object.keys(sigs).length,
          kcalMin: Math.min.apply(null, ks), kcalMax: Math.max.apply(null, ks),
          range: r, inRange: arr.every(s => s.kcal >= r[0] && s.kcal <= r[1]),
          items3to5: arr.every(s => s.items.length >= 3 && s.items.length <= 5)
        };
      });
      return out;
    },
    mealSets: function (meal) {
      return (recoPools().pool[meal] || []).map(s => ({ sig: s.sig, kcal: s.kcal, n: s.items.length, items: s.items.map(i => i.name) }));
    },
    swap: function (meal, n) {
      const out = [];
      for (let i = 0; i < (n || 50); i++) {
        recoSwap(meal);
        const sd = state.sheetData;
        if (sd && sd.type === 'reco') out.push(sd.plan.sets[meal].map(s => s.sig));
        else break;
      }
      return out;
    },
    tickets: function () { return DB.scratch.tickets.map(t => ({ source: t.source, date: t.date, id: t.id })); },
    milestones: function () { return Object.assign({}, DB.scratch.milestones); },
    grantMilestones: function (days) { return grantMilestones(Number(days) || 0); },
    scratchState: function () {
      return { tickets: DB.scratch.tickets.length, miss: DB.scratch.miss, card: DB.scratch.card, weekly: DB.scratch.weeklyKcal, log: DB.scratch.log.slice(0, 20) };
    },
    setMiss: function (n) { DB.scratch.miss = Number(n) || 0; saveDB(true); return DB.scratch.miss; },
    drawTicket: drawTicket,
    reveal: revealScratchCard,
    addTicket: function (src, n) { return addTicket(src || 'daily', Number(n) || 1); },
    applyReward: function (tier) { return applyScratchReward(tier); },
    simulate: simulateScratch,
    skins: function () { return SKINS.map(s => ({ id: s.id, name: s.name, tier: s.tier, art: !!s.art, unlocked: skinUnlocked(s.id), src: s.src })); },
    unlockAll: function () {
      SKINS.forEach(s => { if (DB.skins.unlocked.indexOf(s.id) < 0) DB.skins.unlocked.push(s.id); });
      Object.keys(COS_KINDS).forEach(k => COS_KINDS[k].list.forEach(x => {
        const key = cosKey(k, x.id);
        if (DB.skins.unlockedCos.indexOf(key) < 0) DB.skins.unlockedCos.push(key);
      }));
      saveDB(true); applySkins(); return DB.skins.unlocked.length;
    },
    applySkin: applySkin,
    openGallery: openSkinGallery,
    openReco: openRecoSheet,
    capGrant: function (kcal) { return creditCapGrant(Number(kcal) || 0, '测试额度', '测试'); },
    openScratch: openScratchSheet,
    exportData: function () { return JSON.parse(JSON.stringify(buildExportPayload())); },
    showAnnounce: paintAnnounce,
    batchStart: startBatch,
    batchSettle: settleBatch,
    batchState: function () {
      const pb = DB.scratch.batch;
      if (!pb && !state.batch) return null;
      const persisted = pb ? {
        id: pb.id, at: pb.at, count: pb.count, settled: !!pb.settled,
        cards: pb.cards.map(c => ({ revealed: !!c.revealed, tier: c.tier, label: c.reward && c.reward.label })),
        results: pb.results || null, summary: pb.summary || ''
      } : null;
      const b = state.batch;
      if (!b) return { persisted: persisted };
      return {
        count: b.count, done: b.done, covered: b.covered || 0,
        ratios: b.ratios || [],
        results: b.results, counts: b.counts, summary: b.summary,
        tickets: DB.scratch.tickets.length,
        persisted: persisted
      };
    },
    ticketHelpText: function () {
      const d = document.createElement('div');
      d.innerHTML = ticketHelpHtml(false);
      return d.textContent.replace(/\s+/g, ' ').trim();
    },
    simulate: simulateScratch,
    simulateScratch: simulateScratch,
    readReal: function () { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    theme: function (t) { DB.settings.theme = t; saveDB(true); applyTheme(); return document.documentElement.getAttribute('data-theme'); },
    contrast: function (sel) {
      function rgb(s) {
        const m = String(s || '').match(/rgba?\(([^)]+)\)/);
        if (!m) return [0, 0, 0, 1];
        const p = m[1].split(',').map(x => parseFloat(x));
        return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1];
      }
      function lum(c) {
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      }
      const el = sel ? document.querySelector(sel) : null;
      if (!el) return null;
      const fg = rgb(getComputedStyle(el).color);
      let node = el, bg = [255, 255, 255, 1];
      while (node && node !== document.documentElement) {
        const b = rgb(getComputedStyle(node).backgroundColor);
        if (b[3] > 0.05) { bg = b; break; }
        node = node.parentElement;
      }
      if (bg[3] < 1) bg = bg.slice(0, 3).concat([1]);
      const l1 = lum(fg), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      return { selector: sel, color: getComputedStyle(el).color, bg: getComputedStyle(node).backgroundColor, ratio: Math.round(ratio * 100) / 100 };
    }
  };

  /* v5.0 自测钩子：扭蛋 / 币 / 皮肤包 / 动效 */
  window.__v5 = {
    creditState: function () {
      const c = isFull() ? creditEnsure(true) : creditStored();
      const today = E.todayKey();
      return {
        mode: DB.settings.mode, today: today, base: c.base, bmr: c.bmr, floor: c.floor, cap: c.cap,
        debt: c.debt, repayToday: c.repayToday || 0,
        nextBudget: (function () {
          const tomorrow = E.addDays(today, 1);
          const maxRepay = Math.max(0, c.base - c.floor);
          const due = (c.events || []).filter(e => e.remain > 0 && e.start <= tomorrow)
            .reduce((s, e) => s + Math.min(e.remain, e.daily), 0);
          return Math.round(Math.max(c.floor, c.base - Math.min(due, maxRepay)));
        })(),
        surplusToday: c.surplusByDate[today] || 0, capHitToday: c.capByDate[today] || null,
        events: (c.events || []).map(e => ({
          date: e.date, amount: e.amount, days: e.days, daily: e.daily, paid: e.paid, remain: e.remain,
          plan: e.plan, schedule: e.schedule
        })),
        certificates: c.certificates || [],
        stored: DB.credit.meta || {}
      };
    },
    creditRecalc: function () {
      CREDIT_DIRTY = true;
      return window.__v5.creditState();
    },
    pantryState: function () {
      return {
        mode: DB.settings.mode,
        items: pantryStock().map(it => ({ name: it.name, unit: it.unit, qty: it.qty, expire: it.expire })),
        ops: pantryOps().length,
        hintDate: DB.pantry.hintDate,
        filtered: isFull() && pantryStock().length > 0
      };
    },
    recoPantry: function () {
      const cands = recoCandidates();
      const P = cands.proteins || [];
      const pri = P.filter(d => (d.pantryScore || 0) > 0);
      return {
        stock: Array.from(pantryStockSet()), pool: P.length, pri: pri.length,
        names: pri.slice(0, 12).map(d => d.n),
        chicken: P.filter(d => /鸡/.test(d.n)).slice(0, 12).map(d => ({ n: d.n, s: d.pantryScore || 0, c: (d.c || []).map(x => x[0]) }))
      };
    },
    recoTop: function (meal, n) {
      return [...document.querySelectorAll('.reco-meal[data-meal="' + (meal || 'lunch') + '"] .reco-set')].slice(0, n || 3).map(set => {
        const names = [...set.querySelectorAll('.reco-item b')].map(b => b.innerText);
        const comps = names.map(nm => { const d = exactCatalog(nm); return d && d.c ? d.c.map(x => x[0]) : []; });
        const st = pantryStockSet();
        return {
          names: names,
          chicken: comps.some(c => c.some(k => pantryCanon(k) === '鸡胸')),
          stock: comps.some(c => c.some(k => st.has(pantryCanon(k))))
        };
      });
    },
    coins: function () { return Number(DB.coins) || 0; },
    weightPredict: function () { return weightPredict(); },
    coach: function (date) {
      const day = date || E.todayKey();
      return {
        on: COACH.on, ledger: COACH.ledger, silenced: Object.assign({}, COACH.silenced),
        raw: coachObservations(day).map(o => ({ id: o.id, basis: o.basis })),
        notes: coachNotes(day, 3)
      };
    },
    coachAt: function (date, limit) { return coachNotes(date || E.todayKey(), limit || 3); },
    coachKey: function () { return localStorage.getItem(COACH_KEY); },
    coachSilenced: function (rule, date) { return coachSilencedAt(rule, date || E.todayKey()); },
    budget: function (date) {
      const st = snapshot(date || E.todayKey());
      return st ? { budget: st.budget, bmr: st.t.bmr, protein: st.t.protein, water: st.t.water } : null;
    },
    coachReset: function () { COACH.silenced = {}; saveCoach(); return true; },
    setCoins: function (n) { DB.coins = Math.max(0, Number(n) || 0); saveDB(true); return DB.coins; },
    gachaState: function () {
      return {
        pool: gachaPool().map(s => s.id), poolSize: gachaPool().length,
        credits: gachaCredits(), coins: Number(DB.coins) || 0,
        milestones: Object.assign({}, DB.gacha.milestones),
        history: DB.gacha.history.slice(), historyLen: DB.gacha.history.length
      };
    },
    grantMilestones: function (days) { return grantGachaMilestones(Number(days) || 0); },
    draw: function (n, confirmed) { return gachaGo(Number(n) || 1, !!confirmed); },
    perform: function (n) { return performGacha(Number(n) || 1); },
    openGacha: openGachaSheet,
    openRewards: openRewardCenter,
    plan: gachaPlan,
    packs: function () {
      return SKINS.filter(s => s.tier === 'top').map(function (s) {
        const st = PACK_RT[packTheme(s.id)] || {};
        return {
          id: s.id, theme: packTheme(s.id), unlocked: skinUnlocked(s.id),
          ready: packReady(s.id), status: st.status || 'idle', pct: st.pct || 0, bytes: st.bytes || 0,
          url: st.url || '', saved: !!(DB.skins.packs || {})[packTheme(s.id)]
        };
      });
    },
    download: function (id) { return downloadSkinPack(id); },
    skinArt: function (id) { return skinArtUrl(id); },
    fx: function () { return window.SkinFX ? SkinFX.state() : null; },
    fxProbe: function () {
      const s = window.SkinFX ? SkinFX.state() : null;
      return s ? { count: s.count, mode: s.mode, tier: s.tier, running: s.running, fps: s.fpsTarget, theme: s.theme, frames: s.frames, boost: s.boost, power: s.power, peak: s.peak } : null;
    },
    setFx: function (on) { DB.settings.fx = !!on; saveDB(true); applyFx(); return DB.settings.fx; },
    setPowerSave: function (on) { DB.settings.powerSave = !!on; saveDB(true); applyFx(); return DB.settings.powerSave; },
    boost: function (ms) { if (window.SkinFX) SkinFX.boost(Number(ms) || 3000); },
    previewFx: previewSkinFx,
    badge: function () {
      return {
        tickets: DB.scratch.tickets.length,
        gacha: rewardAvail(),
        entryText: renderRewardEntry().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      };
    },
    openTicketHelp: function () {
      const d = document.createElement('div');
      d.innerHTML = ticketHelpHtml(true);
      return d.textContent.replace(/\s+/g, ' ').trim();
    },
    legendRun: function (n) {
      const total = Math.max(1, Number(n) || 1);
      const before = Number(DB.coins) || 0;
      const count = { coin: 0, cover: 0, medal: 0, stamp: 0, top: 0 };
      for (let i = 0; i < total; i++) {
        const r = applyScratchReward('legend', false);
        if (r.kind === 'coin') count.coin++;
        else if (r.kind === 'cover') count.cover++;
        else if (r.kind === 'medal') count.medal++;
        else if (r.kind === 'skin-top') count.top++;
        else count.stamp++;
      }
      return { n: total, coin: count.coin, cover: count.cover, medal: count.medal, stamp: count.stamp, top: count.top, coinDelta: (Number(DB.coins) || 0) - before };
    },
    rareRun: function (n, pity) {
      const total = Math.max(1, Number(n) || 1);
      const before = Number(DB.coins) || 0;
      let coin = 0;
      for (let i = 0; i < total; i++) {
        const r = applyScratchReward('rare', !!pity);
        if (r.kind === 'coin') coin++;
      }
      return { n: total, pity: !!pity, coin: coin, coinDelta: (Number(DB.coins) || 0) - before };
    },
    simulateGacha: function (runs) {
      const n = Math.max(1, Number(runs) || 1);
      let total = 0, dup = 0, emptyWin = 0, maxLen = 0;
      for (let i = 0; i < n; i++) {
        const pool = SKINS.filter(s => s.tier === 'top').map(s => s.id);
        let draws = 0, guard = 0;
        while (pool.length && guard++ < 20) {
          const idx = (recoRng() * pool.length) | 0;
          const got = pool.splice(idx, 1)[0];
          if (!got) emptyWin++;
          draws++;
        }
        maxLen = Math.max(maxLen, draws);
        total += draws;
        if (draws !== 5) dup++;
      }
      return { runs: n, avg: total / n, nonFive: dup, emptyWin: emptyWin, maxLen: maxLen };
    }
  };

  /* v5.2 验收钩子：只读状态 + 少量与 UI 同源的写入口，便于回归脚本断言 */
  window.__v52 = {
    stateDate: function () { return state.recordDate; },
    heat: function () {
      const view = state.heatView === 'month' ? 'month' : 'year';
      const month = state.heatMonth || E.todayKey().slice(0, 7);
      const cells = (view === 'year' ? heatYearCells() : heatMonthCells(month)).filter(Boolean);
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
      cells.forEach(c => { if (!c.future) counts[c.level]++; });
      return { view: view, month: month, counts: counts, cells: cells.map(c => ({ date: c.date, level: c.level, future: c.future })) };
    },
    setHeatView: function (v, month) {
      state.heatView = v === 'month' ? 'month' : 'year';
      if (month) state.heatMonth = month;
      else if (state.heatView === 'month' && !state.heatMonth) state.heatMonth = E.todayKey().slice(0, 7);
      if (state.tab === 'ledger') renderLedger();
      return state.heatView;
    },
    stamps: function () {
      const st = syncStamps(true);
      return {
        run: st.run.slice(), pages: st.pages.length,
        claimable: st.pages.filter(p => !p.claimed).length,
        patterns: st.patterns.slice(), series: stampSeries().length,
        pageIds: st.pages.map(p => p.id)
      };
    },
    syncStamps: function () { return this.stamps(); },
    claimStamp: claimStampPage,
    elder: function () {
      const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
      const base = parseFloat(getComputedStyle(document.body).fontSize) || 0;
      return {
        on: !!DB.settings.elder,
        attr: document.documentElement.getAttribute('data-elder'),
        zoom: zoom, baseFont: base, renderedFont: round1(base * zoom),
        visibleTabs: $$('.tabbar button').filter(b => !b.hidden).map(b => b.dataset.tab),
        tab: state.tab,
        rewardEntry: !!$('.reward-entry-wrap'),
        rewardEntryVisible: (function () { const x = $('.reward-entry-wrap'); return !!(x && x.getClientRects().length); })(),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    },
    setElder: function (on) {
      DB.settings.elder = !!on;
      saveDB(true);
      applyElder();
      applyModeChrome();
      renderActive();
      return window.__v52.elder();
    },
    manifest: function () {
      return {
        state: SKIN_MANIFEST.state, count: SKIN_MANIFEST.count,
        error: SKIN_MANIFEST.error, source: SKIN_MANIFEST.source,
        skins: SKINS.length, tops: galleryTopCount(),
        normal: SKINS.filter(s => s.tier !== 'top').length
      };
    },
    reloadManifest: function () { return loadSkinManifest().then(function () { refreshManifestViews(); return window.__v52.manifest(); }); },
    drawAll: function () {
      const rounds = [];
      let guard = 0;
      while (gachaPool().length && guard++ < 12) {
        const res = performGacha(Math.min(5, gachaPool().length));
        if (!res) break;
        rounds.push(res.picks.map(s => s.id));
      }
      return {
        rounds: rounds.length, left: gachaPool().length,
        picked: rounds.reduce((a, r) => a.concat(r), [])
      };
    },
    gallery: function () {
      return {
        total: gallerySkins().length, top: galleryTopCount(),
        normal: gallerySkins().filter(s => s.tier !== 'top').length,
        unlocked: galleryUnlocked(), thumbs: gallerySkins().filter(s => s.thumb).length,
        ids: gallerySkins().map(s => s.id)
      };
    }
  };

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    applyTheme();
    applyElder();
    applySkins();
    applyModeChrome();
    if (DB.profile) bootSkinPacks();
    applyFx();
    paintOffline();
    /* 公告只对已建档用户拉取，与模式无关：ledger 下也要能看到新版本 */
    if (DB.profile) { state.announceTried = true; setTimeout(initAnnounce, 600); }
    /* 环游记换算模块按需加载：完整模式启动时预热并校验 total_km；ledger 不请求 */
    if (DB.profile && isFull()) ensureTrip().then(ok => {
      if (!ok) return;
      syncTrip(true);
      if (state.tab === 'trip') renderActive();
    });
    if (DB.profile) DB.onboarded = true;
    /* 启动重算：欠款/分期以记录为准，旧缓存只做对账 */
    if (DB.profile && isFull()) creditEnsure(true);
    /* 启动对账：库存以扣减记录为准，不一致就重建并提示 */
    if (DB.profile && isFull()) pantryEnsure(true);
    if (DB.profile && DB.settings.motion) startMotionCounting();
    updateRail();
    renderActive();
    if (!DB.profile) startOnboarding();
    /* v5.2：皮肤 manifest 后置加载（首次引导期间也加载，引导完成后图鉴已是 30 套）；
       缺失或解析失败自动保留旧 5 套，不影响首屏 */
    loadSkinManifest().then(function () { if (DB.profile) refreshManifestViews(); });
    if (DB.settings.pin.on && DB.settings.pin.hash) showLock();
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && DB.settings.pin.on && Date.now() - hiddenAt > 5 * 60 * 1000) showLock();
      hiddenAt = 0;
    });
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
