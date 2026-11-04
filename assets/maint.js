/* 维护入口 · 本机自用；口令只以加盐派生值参与比对，页面内不含明文 */
(function () {
  'use strict';
  const H = window.__ledgerHost;
  const CRED = window.__MAINT_CRED;
  if (!H || !CRED) return;

  const DB_KEY = 'energy-ledger.dev';
  const TOKEN_KEY = 'el.mt.token';
  const SKEY_KEY = 'el.mt.key';
  const ATTEMPT_KEY = 'el.mt.attempts';

  let active = false;

  function hex(buf) {
    return Array.prototype.map.call(buf, b => (b < 16 ? '0' : '') + b.toString(16)).join('');
  }
  function rndBytes(n) {
    const a = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return hex(a);
  }
  function derive(text, iter) {
    if (!(window.crypto && window.crypto.subtle && window.crypto.subtle.deriveBits)) return null;
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey('raw', enc.encode(text), { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(k => window.crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(CRED.salt), iterations: iter || CRED.iter, hash: 'SHA-256' }, k, 256))
      .then(buf => hex(new Uint8Array(buf)));
  }
  function fingerprint() {
    const s = [navigator.userAgent || '', navigator.platform || '', screen.width + 'x' + screen.height,
      String(new Date().getTimezoneOffset())].join('|');
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }
  function sessionSig(id, ts) {
    return derive(id + '|' + ts + '|' + fingerprint(), CRED.iter);
  }
  function readToken() {
    try {
      const t = String(localStorage.getItem(TOKEN_KEY) || '');
      const p = t.split('.');
      return p.length === 2 && p[0] && p[1] ? { id: p[0], ts: p[1] } : null;
    } catch (e) { return null; }
  }
  function tokenValid() {
    const t = readToken();
    if (!t) return Promise.resolve(false);
    let stored = '';
    try { stored = String(localStorage.getItem(SKEY_KEY) || ''); } catch (e) { stored = ''; }
    if (!stored) return Promise.resolve(false);
    const sig = sessionSig(t.id, t.ts);
    if (!sig) return Promise.resolve(false);
    return sig.then(v => v === stored);
  }
  function writeToken() {
    const id = rndBytes(32);
    const ts = String(Date.now());
    const sig = sessionSig(id, ts);
    if (!sig) return Promise.resolve(false);
    return sig.then(v => {
      try {
        localStorage.setItem(TOKEN_KEY, id + '.' + ts);
        localStorage.setItem(SKEY_KEY, v);
      } catch (e) {}
      return true;
    });
  }
  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SKEY_KEY);
    } catch (e) {}
  }
  function attempts() {
    try { return Number(localStorage.getItem(ATTEMPT_KEY)) || 0; } catch (e) { return 0; }
  }
  function bumpAttempts() {
    const n = attempts() + 1;
    try { localStorage.setItem(ATTEMPT_KEY, String(n)); } catch (e) {}
    return n;
  }

  function paintBanner() {
    let b = document.getElementById('maintBanner');
    if (!active) {
      if (b) b.remove();
      document.body.classList.remove('maint-mode');
      return;
    }
    if (!b) {
      b = document.createElement('div');
      b.id = 'maintBanner';
      b.innerHTML = '<span class="mn-tag">维护模式</span><span class="mn-sub">独立数据空间 · 券与热量额度不封顶</span>' +
        '<button class="mn-exit" data-act="maint-exit">退出维护模式</button>';
      document.body.appendChild(b);
    }
    document.body.classList.add('maint-mode');
  }

  function defaultProfile() {
    return {
      sex: 'female', age: 28, height: 165, weight: 60, targetWeight: 55,
      activity: 'light', goal: 'lose', rate: 0.5, proteinFactor: 1.6
    };
  }
  function ensureDb() {
    const db = H.loadFrom(DB_KEY);
    if (!db.profile) {
      const real = H.db();
      const p = real && real.profile ? JSON.parse(JSON.stringify(real.profile)) : defaultProfile();
      db.profile = p;
      db.onboarded = true;
      if (!db.weights.length) db.weights = [{ date: H.today(), kg: Number(p.weight) || 60 }];
    }
    return db;
  }
  function grant(db) {
    let today = H.today();
    for (let i = 0; i < 10000; i++) {
      db.scratch.tickets.push({ id: 'm-' + i + '-' + rndBytes(4), source: 'maint', date: today, at: 0 });
    }
    db.coins = 10000;
    db.granted = true;
    db.scratch.milestones = { m3: today, m7: today, m14: today, m30: today };
  }

  function enter(quiet) {
    if (active) return true;
    const db = ensureDb();
    H.enterMaint(db);
    active = true;
    if (!db.granted) grant(db);
    if ((Number(db.coins) || 0) < 10000) db.coins = 10000;
    try {
      if (window.__v43 && window.__v43.unlockAll) window.__v43.unlockAll();
    } catch (e) {}
    H.save();
    paintBanner();
    H.repaint();
    if (!quiet) {
      H.toast('维护空间已开启 · 独立数据，不读写真实账本');
      openSheet();
    }
    return true;
  }
  function exit() {
    if (!active) return;
    H.exitMaint();
    active = false;
    paintBanner();
    H.repaint();
    H.toast('已退出维护模式 · 已恢复真实账本');
    H.closeSheet();
  }

  function unlock(pw) {
    const d = derive(String(pw == null ? '' : pw), CRED.iter);
    if (!d) {
      H.toast('当前环境不支持安全校验，请用本机或 https 打开');
      return Promise.resolve(false);
    }
    return d.then(function (digest) {
      if (digest !== CRED.hash) {
        const n = bumpAttempts();
        H.toast('口令不正确（本机尝试 ' + n + ' 次）');
        const e = document.getElementById('maintAttempts');
        if (e) e.textContent = '本机已尝试 ' + n + ' 次，未做锁死';
        return false;
      }
      return writeToken().then(() => enter(false));
    });
  }

  function stat(label, value) {
    return '<div class="mn-stat"><span>' + label + '</span><b>' + value + '</b></div>';
  }
  function openSheet() {
    if (!active) {
      tokenValid().then(ok => {
        if (ok) { enter(false); return; }
        paintSheet(false);
      });
      return;
    }
    paintSheet(true);
  }
  function paintSheet(isOn) {
    const db = H.db();
    let body;
    if (isOn) {
      const totalSkins = window.__v43 ? window.__v43.skins().length : 30;
      body = '<div class="mn-on"><div class="mn-head">维护模式已开启</div>' +
        stat('抽奖券', db.scratch.tickets.length + ' 张') +
        stat('扭蛋币', (Number(db.coins) || 0) + ' 枚') +
        stat('扭蛋剩余池', (window.__v5 ? window.__v5.gachaState().poolSize : 0) + ' 套') +
        stat('已解锁皮肤', db.skins.unlocked.length + ' / ' + totalSkins) +
        stat('数据空间', '独立（与真实账本互不可见）') +
        '<div class="mn-row"><button class="btn btn-primary btn-sm" data-act="maint-sim">批量抽取 1,000 次并统计</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="maint-exit">退出维护模式</button></div>' +
        '<div class="mn-sim" id="maintSimOut">尚未运行抽样。</div>' +
        '<div class="notebox">维护模式下抽奖券不设 10 张上限，热量奖品不受每周 300 kcal 限制；外观全部解锁。退出后真实账本 <code>energy-ledger.v2</code> 不受影响。</div></div>';
    } else {
      body = '<div class="mn-form"><div class="mn-head">输入维护口令</div>' +
        '<div class="tiny faint">仅用于本机自测；口令以加盐派生值参与比对，首次通过后本机记住令牌。</div>' +
        '<input class="mn-input" id="maintPass" type="password" autocomplete="off" placeholder="口令" />' +
        '<div class="mn-row"><button class="btn btn-primary btn-sm" data-act="maint-unlock">确认</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="close-sheet">取消</button></div>' +
        '<div class="tiny faint" id="maintAttempts">本机已尝试 ' + attempts() + ' 次，未做锁死</div></div>';
    }
    H.openSheet(H.sheetHead('维护模式', '独立数据空间 · 不读写真实账本', '') +
      '<div class="sheet-body" id="maintBody">' + body + '</div>' +
      '<div class="sheet-foot"><span class="tiny faint">真实账本与维护空间各自保留，切换时互不覆盖。</span></div>',
      'maint');
  }

  function simulate() {
    const r = window.__v43 && window.__v43.simulate ? window.__v43.simulate(1000) : null;
    const out = document.getElementById('maintSimOut');
    if (!r || !out) return;
    out.innerHTML = '<div class="sim-grid">' +
      '<div><b>' + r.commonPct + '</b><em>普通 (' + r.common + ')</em></div>' +
      '<div><b>' + r.rarePct + '</b><em>稀有 (' + r.rare + ')</em></div>' +
      '<div><b>' + r.legendPct + '</b><em>传说 (' + r.legend + ')</em></div>' +
      '<div><b>' + r.topPct + '</b><em>顶级皮肤 (' + r.top + ')</em></div></div>' +
      '<div class="tiny faint">传说档内部：扭蛋币 ' + r.coin + ' 次（应为约 60%）；刮卡池顶级皮肤恒为 0，顶级只进扭蛋池。</div>';
  }

  function settingsHTML() {
    return '<div class="setting-group">' +
      '<div class="gh"><div class="t">维护</div><div class="s">本机自用入口 · 数据与真实账本隔离</div></div>' +
      '<button class="setting-row" data-act="maint-open"><span class="l"><span class="t">维护模式</span><span class="s">' +
      (active ? '已开启 · 当前写入独立数据空间' : '需要口令 · 数据与真实账本隔离') +
      '</span></span><span class="r">' + (active ? '退出' : '进入') + '</span></button>' +
      '</div>';
  }

  const style = document.createElement('style');
  style.textContent =
    'body.maint-mode .app-shell{padding-top:36px}' +
    '#maintBanner{position:fixed;top:0;left:0;right:0;z-index:2000;height:36px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#1C2A22;color:#E8E2CF;font-size:11px;box-shadow:0 2px 10px rgba(0,0,0,.25)}' +
    '.mn-tag{font-weight:700;letter-spacing:.08em;color:#D8B96F;border:1px solid #D8B96F;border-radius:4px;padding:1px 6px}' +
    '.mn-sub{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#F3EEE0}' +
    '.mn-exit{border:1px solid #A9B6AC;background:transparent;color:#F3EEE0;border-radius:999px;font-size:10px;padding:3px 10px;cursor:pointer}' +
    '.mn-head{font-size:14px;font-weight:600;margin-bottom:10px}' +
    '.mn-stat{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px dashed var(--line);font-size:11px}' +
    '.mn-stat b{font-size:13px}' +
    '.mn-row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}' +
    '.mn-input{width:100%;padding:10px 12px;border:1px solid var(--line-2);border-radius:10px;background:var(--field);color:var(--ink);font-size:14px;margin:10px 0}' +
    '.mn-sim{margin-top:10px;font-size:11px;color:var(--ink-2)}' +
    '@media (prefers-reduced-motion:reduce){#maintBanner{transition:none}}';
  document.head.appendChild(style);

  window.Maintenance = {
    key: DB_KEY,
    active: function () { return active; },
    boot: function () { return tokenValid().then(ok => { if (ok) enter(true); return ok; }); },
    settingsHTML: settingsHTML,
    openSheet: openSheet,
    unlock: unlock,
    exit: exit,
    simulate: simulate,
    hasToken: tokenValid
  };

  window.__v43 = window.__v43 || {};
  window.__v43.isMaint = function () { return active; };
  window.__v43.enterMaint = function (pw) { return unlock(pw); };
  window.__v43.exitMaint = exit;
  window.__v43.maintState = function () {
    const db = H.db();
    return {
      active: active, key: H.isMaint() ? DB_KEY : 'energy-ledger.v2', token: !!readToken(),
      tickets: db.scratch.tickets.length, skins: db.skins.unlocked.length,
      cos: db.skins.unlockedCos.length, granted: !!db.granted
    };
  };
  window.__v43.readMaint = function () { try { return JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { return null; } };

  window.Maintenance.boot();
})();
