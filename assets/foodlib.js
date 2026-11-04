/* 能量账本 · 食物库运行时
   数据不进 localStorage：首次使用时从 assets/foodlib-data.js 懒加载，
   随后缓存到 IndexedDB；记录本身仍然只写 localStorage。
   所有营养值为估算值，界面必须标注。 */
(function (global) {
  'use strict';

  const VERSION = '4.0.0';
  const SCRIPT_URL = 'assets/foodlib-data.js?v=' + VERSION;
  const IDB_NAME = 'energy-ledger-foodlib';
  const IDB_STORE = 'shard';
  const IDB_KEY = 'v4';
  const STATIC_MODE = (function () {
    const meta = document.querySelector('meta[name="ledger-mode"]');
    return !!(meta && meta.getAttribute('content') === 'static');
  })();

  let items = null;
  let metaInfo = { count: 0, cats: [], source: '' };
  let pending = null;
  let loadSource = 'none';

  const DEFAULT_CATS = ['主食', '肉禽', '水产', '蛋奶', '豆制品', '蔬菜', '水果', '坚果', '调味', '饮品', '零食', '半成品'];

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[\s·（）()]/g, '');
  }

  function parsePortions(str, fallbackGrams) {
    const out = [];
    String(str || '').split(';').forEach(p => {
      const bits = p.split('|');
      const label = (bits[0] || '').trim();
      const grams = Math.max(1, Math.round(Number(bits[1]) || 0));
      if (label && grams) out.push({ label: label, grams: grams });
    });
    if (!out.length) out.push({ label: '1 份', grams: fallbackGrams || 100 });
    return out;
  }

  function buildFrom(payload) {
    const rows = payload.rows || [];
    const cats = payload.cats && payload.cats.length ? payload.cats : DEFAULT_CATS;
    const list = [];
    const byName = Object.create(null);
    rows.forEach(r => {
      const name = String(r[0] || '').trim();
      if (!name) return;
      const cat = cats.indexOf(r[1]) >= 0 ? r[1] : '半成品';
      const tokens = String(r[9] || '').split(/\s+/).filter(Boolean);
      const item = {
        name: name,
        cat: cat,
        kcal: Number(r[2]) || 0,
        p: Number(r[3]) || 0,
        c: Number(r[4]) || 0,
        f: Number(r[5]) || 0,
        fib: Number(r[6]) || 0,
        aliases: String(r[7] || '').split('|').filter(Boolean),
        portions: parsePortions(r[8], 100),
        ini: tokens[0] || '',
        index: norm(name + '|' + (r[7] || '')) + ' ' + String(r[9] || ''),
        norm: norm(name)
      };
      list.push(item);
      byName[name] = item;
      item.aliases.forEach(a => { if (!byName[a]) byName[a] = item; });
    });
    items = list;
    metaInfo = { count: list.length, cats: cats, source: payload.source || '', version: VERSION };
    return list;
  }

  function hasInlineData() {
    return !!(global.__FOODLIB_DATA__ && Array.isArray(global.__FOODLIB_DATA__.rows));
  }

  function loadScript() {
    return new Promise((resolve, reject) => {
      if (hasInlineData()) { resolve(global.__FOODLIB_DATA__); return; }
      const s = document.createElement('script');
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = () => resolve(global.__FOODLIB_DATA__ || null);
      s.onerror = () => reject(new Error('食物库数据加载失败'));
      document.head.appendChild(s);
    });
  }

  function idbOpen() {
    return new Promise((resolve) => {
      if (!global.indexedDB) { resolve(null); return; }
      let req;
      try { req = indexedDB.open(IDB_NAME, 1); } catch (e) { resolve(null); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  function idbGet() {
    return idbOpen().then(db => new Promise((resolve) => {
      if (!db) { resolve(null); return; }
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    }));
  }

  function idbPut(payload) {
    return idbOpen().then(db => new Promise((resolve) => {
      if (!db) { resolve(); return; }
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ v: VERSION, at: Date.now(), payload: payload }, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) { resolve(); }
    }));
  }

  function ensure() {
    if (items) return Promise.resolve(items);
    if (pending) return pending;
    pending = idbGet().then(cached => {
      if (cached && cached.v === VERSION && cached.payload && cached.payload.rows) {
        loadSource = 'indexeddb';
        return buildFrom(cached.payload);
      }
      return loadScript().then(payload => {
        if (!payload || !payload.rows) throw new Error('食物库数据为空');
        loadSource = STATIC_MODE ? 'inline' : 'script';
        buildFrom(payload);
        idbPut(payload);
        return items;
      });
    }).catch(err => {
      console.warn('[食物库] 加载失败', err);
      loadSource = 'error';
      items = items || [];
      return items;
    });
    return pending;
  }

  function scoreItem(item, q) {
    if (!q) return 1;
    const n = item.norm;
    const idx = item.index;
    if (n === q) return 120;
    if (n.indexOf(q) === 0) return 100;
    if (n.indexOf(q) > 0) return 82;
    if (item.aliases.some(a => norm(a) === q)) return 110;
    if (item.aliases.some(a => norm(a).indexOf(q) > -1)) return 70;
    if (item.ini && item.ini.indexOf(q) === 0) return 92;
    if (idx.indexOf(q) > -1) return 58;
    return 0;
  }

  function search(query, cat, limit, opts) {
    if (!items) return [];
    const o = opts || {};
    const q = norm(query);
    const useMap = o.recent || {};
    const favSet = o.favorites || null;
    let pool = cat && cat !== '全部' ? items.filter(x => x.cat === cat) : items;
    if (!q && o.favorites && o.favorites.length) {
      const seen = Object.create(null);
      const favItems = [];
      o.favorites.forEach(n => {
        const it = items.find(x => x.name === n);
        if (it && !seen[it.name]) { seen[it.name] = 1; favItems.push(it); }
      });
      pool = favItems.concat(pool.filter(x => !seen[x.name]));
    }
    const scored = [];
    for (let i = 0; i < pool.length; i++) {
      const s = scoreItem(pool[i], q);
      if (!s) continue;
      let bonus = 0;
      if (q && useMap[pool[i].name]) bonus += Math.min(12, useMap[pool[i].name] * 2);
      if (favSet && favSet[pool[i].name]) bonus += 8;
      if (q && pool[i].norm === q) bonus += 20;
      scored.push({ item: pool[i], s: s + bonus });
    }
    // 同分时保留数据顺序（基础食材在各类别开头），比按名字排序更符合预期
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, limit || 40).map(x => x.item);
  }

  function recentItems(map, limit) {
    const names = Object.keys(map || {}).sort((a, b) => map[b] - map[a]).slice(0, limit || 6);
    return names.map(n => items && items.find(x => x.name === n)).filter(Boolean);
  }

  function byName(name) {
    if (!items) return null;
    return items.find(x => x.name === name) || null;
  }

  global.FoodLib = {
    VERSION: VERSION,
    ensure: ensure,
    ready: () => !!items,
    search: search,
    byName: byName,
    recent: recentItems,
    all: () => items || [],
    meta: () => metaInfo,
    cats: () => (metaInfo.cats.length ? metaInfo.cats : DEFAULT_CATS),
    source: () => loadSource,
    isStatic: () => STATIC_MODE
  };
})(window);
