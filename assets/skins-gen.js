/* skins-gen.js · 30 套强化皮肤的共享渲染核（无框架，约 5 KB 未压缩）
   职责只有三件：
   1) 需要时才请求 assets/skins-gen.css —— 默认纸面皮肤首屏零皮肤请求；
   2) 把皮肤定义里的材质 / 结构 / 签名通道写到 <html> 上（CSS 只有一份，30 套靠属性取值）；
   3) 暴露 audit()：把当前皮肤的实际 token、对比度、横溢、触控尺寸读出来，供验收脚本取证。
   约束：不碰 DOM 结构、不改任何业务逻辑、不做 30 套各自的 JS 分支。 */
(function () {
  'use strict';
  var GEN = ['a-sakura','a-galaxy','a-neon','a-wuxia','a-fireworks',
    'g01','g02','g03','g04','g05','g06','g07','g08','g09','g10','g11','g12','g13','g14','g15',
    'g16','g17','g18','g19','g20','g21','g22','g23','g24','g25'];
  var CSS_HREF = 'assets/skins-gen.css?v=6.1.0';
  var FX_HREF = 'assets/skins-fx.js?v=6.1.0';
  /* 9 个材质核 → 特效内核（材质决定"怎么动"，不是一套粒子换颜色） */
  var FXK = { paper: 'bloom', ink: 'bloom', metal: 'glint', glass: 'glint', lacquer: 'glint',
              cloth: 'weave', wood: 'mist', stone: 'mist', ceramic: 'halftone' };
  /* 逐套内核覆盖：同材质也不许共用走法（g22 漆面换 refract，不与 g05 的 glint 同路；
     g01 瓷面换 mist，不与 g20/g24 的 halftone 同路；g08 漆面换 refract，不与 g05 同路） */
  var FX_OVERRIDE = { g22: 'refract', 'a-galaxy': 'mist',
                      'a-wuxia': 'brush', 'a-fireworks': 'spark',
                      g01: 'mist', g08: 'refract',
                      /* g14/g17 纸面：bloom 的时间漂移 200ms 只走 6~7px 且是大半径
                         平滑晕团，帧差量不出（1.0%/1.2%，低于 10% 门限）；改成
                         "光带按时间扫过 + 边缘折射"，云海日出/林间漏光本就该是扫光 */
                      g14: 'refract', g17: 'refract' };
  function fxKernel(id, mat) { return FX_OVERRIDE[id] || FXK[mat] || ''; }
  var fxLoading = null;
  var state = { ready: false, loading: null, id: '' };
  var CONF = null; // id -> {structure, material, motion}，第一次需要时再取（首屏不多一个请求）

  function inject() {
    if (state.ready) return Promise.resolve(true);
    if (state.loading) return state.loading;
    var pre = document.getElementById('skinsGenCss');
    if (pre) {
      if (pre.sheet) { state.ready = true; return Promise.resolve(true); }
      state.loading = new Promise(function (res) {
        pre.onload = function () { state.ready = true; res(true); };
        pre.onerror = function () { res(false); };
      });
      return state.loading;
    }
    state.loading = new Promise(function (res) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_HREF;
      link.onload = function () { state.ready = true; res(true); };
      link.onerror = function () { res(false); };
      document.head.appendChild(link);
    });
    return state.loading;
  }

  function confOf(id) {
    if (CONF) return CONF[id] || null;
    return null;
  }
  function loadConf() {
    if (CONF) return Promise.resolve(CONF);
    return fetch('assets/skins/defs/index.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var m = {};
        (j && j.items || []).forEach(function (x) { m[x.id] = x; });
        CONF = m;
        return m;
      }).catch(function () { CONF = {}; return CONF; });
  }

  /* 真值来源仍是 app.js 的 applySkins()：它先设 data-skin，这里只补材质/结构/签名 */
  function sync(id) {
    var root = document.documentElement;
    if (GEN.indexOf(id) < 0) {
      root.removeAttribute('data-skin-gen');
      root.removeAttribute('data-skin-detail');
      root.removeAttribute('data-skin-mat');
      root.removeAttribute('data-skin-arch');
      root.removeAttribute('data-skin-sig');
      root.removeAttribute('data-fx');
      if (window.SkinFx) SkinFx.init(), SkinFx.bind('', '');
      state.id = '';
      return;
    }
    if (state.id === id && state.ready) return;
    state.id = id;
    root.setAttribute('data-skin-gen', '1');
    root.setAttribute('data-skin-detail', '1');
    inject();
    loadConf().then(function (m) {
      var c = m && m[id];
      if (!c) return;
      root.setAttribute('data-skin-mat', c.kernel || '');
      root.setAttribute('data-skin-arch', (c.structure && c.structure.archetype) || '');
      root.setAttribute('data-skin-sig', (c.motion && c.motion.signature) || '');
      deferFx(c.kernel || '');
    });
  }

  /* A/B 取证用：关掉细节层 = "抽掉材质"，内容与尺寸完全不变 */
  function detail(on) {
    var root = document.documentElement;
    if (on) root.setAttribute('data-skin-detail', '1');
    else root.removeAttribute('data-skin-detail');
  }

  function ensureFx(kernel) {
    function run() {
      if (!window.SkinFx) return;
      SkinFx.init();
      SkinFx.bind(state.id, fxKernel(state.id, kernel));
    }
    if (window.SkinFx) { run(); return Promise.resolve(true); }
    if (fxLoading) { fxLoading.then(run); return fxLoading; }
    fxLoading = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = FX_HREF;
      s.defer = true;
      s.onload = function () { run(); res(true); };
      s.onerror = function () { res(false); };
      document.head.appendChild(s);
    });
    return fxLoading;
  }

  /* 首帧之后才拉特效：首屏仍然只有 skins-gen.js / index.json 两个额外请求 */
  function deferFx(kernel) {
    var go = function () { ensureFx(kernel); };
    if (window.requestIdleCallback) setTimeout(function () { requestIdleCallback(go, { timeout: 2500 }); }, 900);
    else setTimeout(go, 1200);
  }

  /* ---------- 验收：把"看到的"读成数字 ---------- */
  function rgbOf(s) {
    s = String(s || '').trim();
    if (s.charAt(0) === '#') {
      var x = s.slice(1);
      if (x.length === 3) x = x[0] + x[0] + x[1] + x[1] + x[2] + x[2];
      return [parseInt(x.slice(0, 2), 16) || 0, parseInt(x.slice(2, 4), 16) || 0,
              parseInt(x.slice(4, 6), 16) || 0, 1];
    }
    var m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return [0, 0, 0, 1];
    var p = m[1].split(',').map(parseFloat);
    return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1];
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function tokens() {
    var cs = getComputedStyle(document.documentElement);
    var out = {};
    ['--paper','--surface','--surface-2','--ink','--ink-2','--ink-3','--line','--green','--amber','--red','--seal']
      .forEach(function (k) { out[k.slice(2)] = cs.getPropertyValue(k).trim(); });
    out.card = cs.getPropertyValue('--sk-card').trim();
    out.grain = cs.getPropertyValue('--sk-grain').trim();
    return out;
  }
  function audit() {
    var t = tokens();
    var surface = rgbOf(t.surface);
    var pairs = [];
    ['ink','ink-2','ink-3','green','amber','red','seal'].forEach(function (k) {
      var v = t[k.replace('-', '')] || t[k];
      var c = document.createElement('span');
      c.style.color = 'var(--' + k + ')';
      c.style.display = 'none';
      document.body.appendChild(c);
      var col = rgbOf(getComputedStyle(c).color);
      document.body.removeChild(c);
      pairs.push({ role: k, color: getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim(),
                   ratio: Math.round(ratio(col, surface) * 100) / 100 });
    });
    var de = document.documentElement;
    var small = [];
    var taps = [];
    document.querySelectorAll('.tabbar button, .btn, .rail-nav button, .seg button').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.height < 44 || r.width < 44) taps.push({ sel: el.className || el.tagName, w: Math.round(r.width), h: Math.round(r.height) });
    });
    document.querySelectorAll('.view:not([hidden]) *').forEach(function (el) {
      if (!el.childElementCount && el.textContent && el.textContent.trim().length > 1) {
        var fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs && fs < 11) small.push({ fs: fs, text: el.textContent.trim().slice(0, 14) });
      }
    });
    var over = [];
    document.querySelectorAll('body *').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 2) return;
      if (r.right > window.innerWidth + 1.5) over.push({ cls: String(el.className || el.tagName).slice(0, 40), right: Math.round(r.right) });
    });
    var anims = document.getAnimations ? document.getAnimations() : [];
    var running = anims.filter(function (a) { return a.playState === 'running'; });
    return {
      skin: de.getAttribute('data-skin'),
      theme: de.getAttribute('data-theme'),
      gen: de.getAttribute('data-skin-gen') === '1',
      // 实际跑的内核（含逐套覆盖），与 data-skin-mat（材质核）区分开：报告要报前者
      fxKernel: fxKernel(state.id, de.getAttribute('data-skin-mat') || ''),
      tokens: t,
      pairs: pairs,
      minRatio: Math.min.apply(null, pairs.map(function (p) { return p.ratio; })),
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      offscreen: over.slice(0, 6),
      smallText: small.slice(0, 6),
      tapTargets: taps.slice(0, 8),
      animations: { total: anims.length, running: running.length },
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      innerWidth: window.innerWidth
    };
  }
  window.SkinGen = { ids: GEN, sync: sync, audit: audit, ensure: inject, detail: detail,
    fx: function (kernel) { return ensureFx(kernel); },
    state: function () { return { ready: state.ready, id: state.id }; } };
})();
