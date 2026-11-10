/* 能量账本 · v3.2 扩展层
   纯逻辑：力量训练 PR、菜谱/购物清单合并、周报卡片绘制、可穿戴解析、照片压缩与 IndexedDB。
   不直接读写 localStorage；所有业务数据由 app.js 统一保存。 */
(function (global) {
  'use strict';

  /* ============================================================
     力量训练：Epley 1RM 与 PR
     ============================================================ */
  function epley(weight, reps) {
    const w = Number(weight) || 0;
    const r = Math.max(1, Number(reps) || 1);
    return Math.round(w * (1 + r / 30) * 10) / 10;
  }

  function prStats(lifts) {
    const groups = {};
    (lifts || []).forEach(x => {
      const name = String(x.exercise || '').trim();
      if (!name) return;
      const w = Number(x.weight) || 0;
      const r = Math.max(1, Number(x.reps) || 1);
      const g = groups[name] || (groups[name] = { exercise: name, bestWeight: 0, bestReps: 0, bestE1rm: 0, sets: 0, lastDate: '' });
      g.sets += 1;
      if (w > g.bestWeight || (w === g.bestWeight && r > g.bestReps)) {
        g.bestWeight = w;
        g.bestReps = r;
      }
      if (w > 0) g.bestE1rm = Math.max(g.bestE1rm, epley(w, r));
      if ((x.date || '') > g.lastDate) g.lastDate = x.date || '';
    });
    return Object.keys(groups).map(k => groups[k]).sort((a, b) => b.bestE1rm - a.bestE1rm);
  }

  function liftCSV(lifts) {
    const rows = [['日期', '动作', '组数', '重量kg', '次数', '估算1RMkg', '备注']];
    (lifts || []).slice().sort((a, b) => ((a.date || '') + (a.createdAt || 0)) < ((b.date || '') + (b.createdAt || 0)) ? -1 : 1).forEach(x => {
      rows.push([x.date || '', x.exercise || '', x.sets || 0, x.weight || 0, x.reps || 0, epley(x.weight, x.reps), x.note || '']);
    });
    return '\uFEFF' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  }

  /* ============================================================
     菜谱 / 购物清单
     ============================================================ */
  function shoppingFromRecipe(recipe) {
    const map = {};
    (recipe && recipe.items || []).forEach(it => {
      const name = String(it.name || '').trim();
      if (!name) return;
      const grams = Number(it.grams) || 0;
      if (!map[name]) map[name] = { name: name, grams: 0, checked: false };
      map[name].grams += grams;
    });
    return Object.keys(map).map(k => map[k]);
  }

  /* ============================================================
     可穿戴导入
     ============================================================ */
  function parseCSVRows(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const firstLine = clean.split(/\r?\n/)[0] || '';
    const comma = (firstLine.match(/,/g) || []).length;
    const semi = (firstLine.match(/;/g) || []).length;
    const tab = (firstLine.match(/\t/g) || []).length;
    const delim = semi > comma && semi > tab ? ';' : (tab > comma && tab > semi ? '\t' : ',');
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (quoted) {
        if (ch === '"') {
          if (clean[i + 1] === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delim) { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* ignore */ }
      else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(v => String(v).trim() !== ''));
  }

  function parseDateValue(v) {
    const s = String(v || '').trim();
    let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    m = s.match(/(\d{4})(\d{2})(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return '';
  }

  function numValue(v) {
    const s = String(v == null ? '' : v).replace(/,/g, '').replace(/[^\d.\-]/g, '');
    const n = Number(s);
    return isFinite(n) ? n : null;
  }

  function parseSleepValue(v, header) {
    const raw = String(v == null ? '' : v).trim();
    const h = String(header || '').toLowerCase();
    if (!raw) return null;
    let m = raw.match(/(\d+)\s*(?:h|小时)\s*(\d+)?\s*(?:m|分)?/i);
    if (m) return Math.round((Number(m[1]) + (Number(m[2] || 0) / 60)) * 100) / 100;
    m = raw.match(/(\d{1,2}):(\d{2})/);
    if (m) return Math.round((Number(m[1]) + Number(m[2]) / 60) * 100) / 100;
    const n = numValue(raw);
    if (n == null) return null;
    if (/分钟|min/.test(h)) return Math.round(n / 60 * 100) / 100;
    if (/小时|hour|\bh\b/.test(h)) return Math.round(n * 100) / 100;
    if (n > 24) return Math.round(n / 60 * 100) / 100;
    return Math.round(n * 100) / 100;
  }

  function parseHuaweiCSV(text) {
    const rows = parseCSVRows(text);
    if (!rows.length) throw new Error('CSV 里没有数据行');
    const header = rows[0].map(s => String(s).toLowerCase().replace(/\s+/g, ''));
    const find = pats => {
      for (let i = 0; i < header.length; i++) {
        for (let j = 0; j < pats.length; j++) if (header[i].indexOf(pats[j]) > -1) return i;
      }
      return -1;
    };
    const dateIdx = find(['日期', 'date']) > -1 ? find(['日期', 'date']) : find(['时间', 'time', 'day']);
    const stepIdx = find(['步数', 'steps', 'step']);
    const weightIdx = find(['体重', 'bodyweight', 'weight']);
    const sleepIdx = find(['睡眠', 'sleep']);
    if (dateIdx < 0 || stepIdx < 0 && weightIdx < 0 && sleepIdx < 0) {
      throw new Error('没有识别到日期 + 步数/体重/睡眠列，请确认是华为运动健康导出的 CSV');
    }
    const steps = {};
    const weight = {};
    const sleep = {};
    const warnings = [];
    let rowsUsed = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const date = parseDateValue(r[dateIdx]);
      if (!date) continue;
      let used = false;
      if (stepIdx > -1) {
        const n = numValue(r[stepIdx]);
        if (n != null && n >= 0) { steps[date] = (steps[date] || 0) + Math.round(n); used = true; }
      }
      if (weightIdx > -1) {
        const n = numValue(r[weightIdx]);
        if (n != null && n > 0) {
          const isJin = /斤/.test(header[weightIdx]);
          const isLb = /lb|磅/.test(header[weightIdx]);
          const kg = Math.round((isJin ? n / 2 : isLb ? n * 0.453592 : n) * 10) / 10;
          if (kg >= 20 && kg <= 350) { weight[date] = kg; used = true; }
          else warnings.push(date + ' 体重 ' + n + ' 超出常见范围，已跳过');
        }
      }
      if (sleepIdx > -1) {
        const h = parseSleepValue(r[sleepIdx], header[sleepIdx]);
        if (h != null && h > 0 && h <= 24) { sleep[date] = Math.round(((sleep[date] || 0) + h) * 100) / 100; used = true; }
      }
      if (used) rowsUsed++;
    }
    return { source: 'huawei', steps: steps, weight: weight, sleep: sleep, unsupported: {}, warnings: warnings, rowsUsed: rowsUsed };
  }

  function parseAppleHealth(xmlText) {
    if (typeof DOMParser === 'undefined') throw new Error('当前环境无法解析 XML');
    const doc = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML 格式错误，无法解析');
    const records = Array.prototype.slice.call(doc.getElementsByTagName('Record'));
    if (!records.length) throw new Error('没有找到 Apple Health 的 Record 记录');
    const stepGroups = {};
    const sleepGroups = {};
    const steps = {};
    const weight = {};
    const sleep = {};
    const unsupported = {};
    const warnings = [];
    let rowsUsed = 0;
    records.forEach(rec => {
      const type = rec.getAttribute('type') || '';
      const start = rec.getAttribute('startDate') || '';
      const end = rec.getAttribute('endDate') || '';
      const value = rec.getAttribute('value');
      const unit = (rec.getAttribute('unit') || '').toLowerCase();
      const source = rec.getAttribute('sourceName') || '未标注来源';
      const sDate = parseDateValue(start.slice(0, 10));
      if (/StepCount/i.test(type)) {
        const n = numValue(value);
        if (!sDate || n == null) return;
        const key = sDate + '|' + source;
        stepGroups[key] = (stepGroups[key] || 0) + Math.max(0, n);
        rowsUsed++;
      } else if (/BodyMass|BodyWeight/i.test(type)) {
        const n = numValue(value);
        if (!sDate || n == null || n <= 0) return;
        const kg = unit === 'lb' ? n * 0.453592 : n;
        if (kg >= 20 && kg <= 350) { weight[sDate] = Math.round(kg * 10) / 10; rowsUsed++; }
        else warnings.push(sDate + ' 体重 ' + n + ' ' + unit + ' 超出常见范围，已跳过');
      } else if (/SleepAnalysis/i.test(type)) {
        const eDate = parseDateValue(end.slice(0, 10)) || sDate;
        const s = start ? new Date(start) : null;
        const e = end ? new Date(end) : null;
        if (!sDate || !eDate || !s || !e || !isFinite(s.getTime()) || !isFinite(e.getTime())) return;
        if (/Awake|InBed/i.test(value || '')) return;
        const mins = Math.max(0, (e.getTime() - s.getTime()) / 60000);
        if (mins <= 0) return;
        const key = eDate + '|' + source;
        sleepGroups[key] = (sleepGroups[key] || 0) + mins;
        rowsUsed++;
      } else if (type) {
        unsupported[type] = (unsupported[type] || 0) + 1;
      }
    });
    const collapse = groups => {
      const out = {};
      Object.keys(groups).forEach(k => {
        const date = k.split('|')[0];
        out[date] = Math.max(out[date] || 0, groups[k]);
      });
      return out;
    };
    const stepDaily = collapse(stepGroups);
    const sleepDaily = collapse(sleepGroups);
    Object.keys(stepDaily).forEach(d => { steps[d] = Math.round(stepDaily[d]); });
    Object.keys(sleepDaily).forEach(d => { sleep[d] = Math.round(sleepDaily[d] / 60 * 100) / 100; });
    return { source: 'apple', steps: steps, weight: weight, sleep: sleep, unsupported: unsupported, warnings: warnings, rowsUsed: rowsUsed };
  }

  function hasWearableData(p) {
    return !!(p && Object.keys(p.steps || {}).length + Object.keys(p.weight || {}).length + Object.keys(p.sleep || {}).length);
  }

  function previewImport(parsed, db) {
    const dates = {};
    ['steps', 'weight', 'sleep'].forEach(k => Object.keys(parsed[k] || {}).forEach(d => { dates[d] = 1; }));
    const wmap = {};
    (db.weights || []).forEach(w => { if (w.date) wmap[w.date] = w.kg; });
    const wearable = db.wearable || {};
    const rows = Object.keys(dates).sort().reverse().map(date => {
      const cur = wearable[date] || {};
      const row = { date: date, steps: parsed.steps[date], weight: parsed.weight[date], sleep: parsed.sleep[date], current: { steps: cur.steps, sleepH: cur.sleepH, weight: wmap[date] } };
      row.conflicts = [];
      if (row.weight != null && wmap[date] != null) row.conflicts.push('weight');
      if (row.steps != null && cur.steps != null) row.conflicts.push('steps');
      if (row.sleep != null && cur.sleepH != null) row.conflicts.push('sleep');
      return row;
    });
    const conflicts = [];
    rows.forEach(r => r.conflicts.forEach(t => conflicts.push(t + ':' + r.date)));
    return { rows: rows, conflicts: conflicts, totals: { steps: Object.keys(parsed.steps || {}).length, weight: Object.keys(parsed.weight || {}).length, sleep: Object.keys(parsed.sleep || {}).length } };
  }

  function applyImport(parsed, db, decisions) {
    const skip = k => !!(decisions && decisions[k]);
    const stats = { weight: 0, weightSkipped: 0, steps: 0, stepsSkipped: 0, sleep: 0, sleepSkipped: 0 };
    if (!db.wearable || typeof db.wearable !== 'object') db.wearable = {};
    Object.keys(parsed.weight || {}).forEach(date => {
      if (skip('weight:' + date)) { stats.weightSkipped++; return; }
      const kg = parsed.weight[date];
      db.weights = (db.weights || []).filter(w => w.date !== date);
      db.weights.push({ date: date, kg: kg });
      stats.weight++;
    });
    Object.keys(parsed.steps || {}).forEach(date => {
      if (skip('steps:' + date)) { stats.stepsSkipped++; return; }
      const cur = db.wearable[date] || {};
      db.wearable[date] = Object.assign({}, cur, { steps: parsed.steps[date], source: parsed.source || cur.source || 'import', at: Date.now() });
      stats.steps++;
    });
    Object.keys(parsed.sleep || {}).forEach(date => {
      if (skip('sleep:' + date)) { stats.sleepSkipped++; return; }
      const cur = db.wearable[date] || {};
      db.wearable[date] = Object.assign({}, cur, { sleepH: parsed.sleep[date], source: parsed.source || cur.source || 'import', at: Date.now() });
      stats.sleep++;
    });
    return stats;
  }

  /* ============================================================
     进度照片：压缩 + IndexedDB
     ============================================================ */
  const PHOTO_DB = 'energy-ledger-photos';
  const PHOTO_STORE = 'photos';
  let photoDBCache = null;

  function openPhotoDB() {
    if (!global.indexedDB) return Promise.reject(new Error('当前浏览器不支持 IndexedDB，照片无法保存在本机'));
    if (photoDBCache) return Promise.resolve(photoDBCache);
    return new Promise((resolve, reject) => {
      const req = global.indexedDB.open(PHOTO_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          const store = db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
      };
      req.onsuccess = () => { photoDBCache = req.result; resolve(req.result); };
      req.onerror = () => reject(req.error || new Error('照片库打开失败'));
    });
  }

  function photoTx(mode, fn) {
    return openPhotoDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, mode);
      const store = tx.objectStore(PHOTO_STORE);
      let result;
      try { result = fn(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
      tx.onerror = () => reject(tx.error || new Error('照片库读写失败'));
      tx.onabort = () => reject(tx.error || new Error('照片写入被中止（可能空间不足）'));
    }));
  }

  function photosAll() {
    return photoTx('readonly', store => {
      const out = { __req: store.getAll() };
      return out;
    }).then(list => (list || []).sort((a, b) => (b.at || 0) - (a.at || 0)));
  }

  function photoDelete(id) { return photoTx('readwrite', store => store.delete(id)); }
  function photoClear() { return photoTx('readwrite', store => store.clear()); }

  function quotaRoom(bytes) {
    if (!global.navigator || !navigator.storage || !navigator.storage.estimate) return Promise.resolve(true);
    return navigator.storage.estimate().then(e => {
      if (!e || !e.quota) return true;
      return (e.usage || 0) + (bytes || 0) < e.quota * 0.98;
    }).catch(() => true);
  }

  function photoAdd(rec) {
    return quotaRoom(Number(rec.stored) || rec.bytes || 0).then(room => {
      if (!room) {
        const err = new Error('浏览器配额几乎用尽，请先清理照片或导出备份');
        err.code = 'quota';
        throw err;
      }
      return photoTx('readwrite', store => store.add(rec));
    }).catch(err => {
      if (err && err.name === 'QuotaExceededError') {
        const e2 = new Error('浏览器配额已满，照片没有保存');
        e2.code = 'quota';
        throw e2;
      }
      throw err;
    });
  }

  function photoStats(list) {
    const bytes = (list || []).reduce((s, p) => s + (Number(p.bytes) || 0), 0);
    const base = { count: (list || []).length, bytes: bytes };
    if (!global.navigator || !navigator.storage || !navigator.storage.estimate) {
      return Promise.resolve(Object.assign(base, { usage: null, quota: null }));
    }
    return navigator.storage.estimate().then(e => Object.assign(base, { usage: (e && e.usage) || 0, quota: (e && e.quota) || 0 })).catch(() => Object.assign(base, { usage: null, quota: null }));
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片解码失败：可能是不支持的格式（如 HEIC），请先转成 JPEG/PNG'));
      img.src = url;
    });
  }

  function compressImage(file, maxSide) {
    const limit = maxSide || 1080;
    if (!file || !/^image\//.test(file.type || '')) {
      return Promise.reject(new Error('不是图片文件（需要 JPEG/PNG/WebP 等）'));
    }
    const url = URL.createObjectURL(file);
    return loadImage(url).then(img => {
      const w0 = img.naturalWidth || img.width;
      const h0 = img.naturalHeight || img.height;
      if (!w0 || !h0) throw new Error('图片尺寸为 0，无法压缩');
      const scale = Math.min(1, limit / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * scale));
      const h = Math.max(1, Math.round(h0 * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL('image/jpeg', 0.82);
      return { w: w, h: h, data: data, bytes: Math.round(data.length * 0.75), original: { w: w0, h: h0 } };
    }).then(res => { URL.revokeObjectURL(url); return res; }, err => { URL.revokeObjectURL(url); throw err; });
  }

  /* ============================================================
     周报卡片绘制（Canvas，无第三方依赖）
     ============================================================ */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawWeekCard(canvas, data) {
    const W = 1080;
    const H = 1620;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const font = (size, weight) => (weight || 500) + ' ' + size + 'px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#F2EFE7';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2C6B51';
    ctx.fillRect(0, 0, W, 420);
    ctx.fillStyle = '#F7F5ED';
    ctx.font = font(30, 600);
    ctx.fillText('ENERGY LEDGER', 80, 96);
    ctx.font = font(74, 600);
    ctx.fillText(data.title + '回顾', 80, 210);
    ctx.font = font(30, 400);
    ctx.fillStyle = 'rgba(247,245,237,.82)';
    ctx.fillText(data.range, 80, 270);
    ctx.fillText('只在本机生成 · 不含账号与云端', 80, 320);
    ctx.fillStyle = '#F7F5ED';
    ctx.font = font(52, 600);
    ctx.fillText(data.badge || '', 80, 375);

    const stats = data.stats || [];
    const cards = [[80, 470], [560, 470], [80, 750], [560, 750]];
    stats.slice(0, 4).forEach((s, i) => {
      const p = cards[i];
      ctx.fillStyle = '#FBFAF5';
      roundRect(ctx, p[0], p[1], 440, 240, 24);
      ctx.fill();
      ctx.fillStyle = '#6F7A72';
      ctx.font = font(26, 400);
      ctx.fillText(s.label, p[0] + 30, p[1] + 56);
      ctx.fillStyle = s.tone === 'amber' ? '#B7791F' : (s.tone === 'red' ? '#A6473B' : '#1F2421');
      ctx.font = font(58, 600);
      ctx.fillText(s.value, p[0] + 30, p[1] + 136);
      ctx.fillStyle = '#8A938C';
      ctx.font = font(23, 400);
      ctx.fillText(s.sub || '', p[0] + 30, p[1] + 192);
    });

    const chartY = 1060;
    const chartH = 360;
    ctx.fillStyle = '#1F2421';
    ctx.font = font(34, 600);
    ctx.fillText('每日摄入', 80, chartY - 32);
    ctx.fillStyle = '#6F7A72';
    ctx.font = font(24, 400);
    ctx.fillText('虚线为每日预算', 260, chartY - 32);
    ctx.fillStyle = '#FBFAF5';
    roundRect(ctx, 80, chartY, 920, chartH, 24);
    ctx.fill();

    const days = data.days || [];
    const baseY = chartY + chartH - 60;
    const max = Math.max(1, data.budget || 1, Math.max.apply(null, days.map(d => d.kcal || 0)));
    const slot = 920 / Math.max(1, days.length);
    const barW = Math.min(74, slot * 0.52);
    const budgetY = baseY - (data.budget || 0) / max * (chartH - 130);
    ctx.strokeStyle = '#C9C2B2';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(100, budgetY);
    ctx.lineTo(1000, budgetY);
    ctx.stroke();
    ctx.setLineDash([]);
    days.forEach((d, i) => {
      const x = 100 + slot * i + (slot - barW) / 2;
      const h = Math.max(4, (d.kcal || 0) / max * (chartH - 130));
      ctx.fillStyle = d.logged ? (d.kcal > (data.budget || 0) * 1.1 ? '#C08B5C' : '#2C6B51') : '#DED8CA';
      roundRect(ctx, x, baseY - h, barW, h, 10);
      ctx.fill();
      ctx.fillStyle = '#6F7A72';
      ctx.font = font(21, 400);
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, baseY + 36);
      if (d.logged) {
        ctx.fillStyle = '#8A938C';
        ctx.font = font(19, 400);
        ctx.fillText(String(Math.round(d.kcal)), x + barW / 2, baseY - h - 12);
      }
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = '#2C6B51';
    ctx.font = font(26, 500);
    ctx.fillText(data.footer || '', 80, 1500);
    ctx.fillStyle = '#8A938C';
    ctx.font = font(22, 400);
    ctx.fillText(data.generated || '', 80, 1542);
    ctx.fillText('所有数值为估算，不构成医疗或营养处方。', 80, 1578);
  }

  global.Extras = {
    epley: epley,
    prStats: prStats,
    liftCSV: liftCSV,
    shoppingFromRecipe: shoppingFromRecipe,
    parseHuaweiCSV: parseHuaweiCSV,
    parseAppleHealth: parseAppleHealth,
    hasWearableData: hasWearableData,
    previewImport: previewImport,
    applyImport: applyImport,
    compressImage: compressImage,
    photosAll: photosAll,
    photoAdd: photoAdd,
    photoDelete: photoDelete,
    photoClear: photoClear,
    photoStats: photoStats,
    quotaRoom: quotaRoom,
    drawWeekCard: drawWeekCard,
    PHOTO_DB: PHOTO_DB,
    PHOTO_STORE: PHOTO_STORE
  };
})(typeof window !== 'undefined' ? window : globalThis);
