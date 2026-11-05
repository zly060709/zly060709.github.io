/* 背景动效引擎 · 只画背景层，不碰数据区
   约束：轻档 ≤40 粒子、30fps 上限、页面隐藏即停、reduced-motion 静态、省电模式全关；
   满功率仅在图鉴预览与扭蛋出蛋的几秒内短暂开启，随后回落轻档。
   连续掉帧（2 秒平均帧间隔 >45ms）自动降档，并在设置里显示当前档位。 */
(function () {
  'use strict';
  const DEFAULT_FX = {
    sakura: { theme: 'sakura', mode: 'petal', fps: 30, opacity: .55, particles: { far: 14, mid: 16, near: 8 }, speed: { far: .22, mid: .5, near: .9 }, sway: { far: 8, mid: 16, near: 26 }, size: { far: 2.4, mid: 3.6, near: 5.2 }, colors: ['#F7C4D4', '#F2A9BF', '#FBE0E7'], vignette: .16 },
    galaxy: { theme: 'galaxy', mode: 'starfield', fps: 30, opacity: .7, particles: { stars: 34 }, twinklePeriod: 3.4, meteorEvery: 12, parallax: .22, colors: ['#EAF1FF', '#A9B8FF', '#7E9CF0'], vignette: .2 },
    neon: { theme: 'neon', mode: 'rain', fps: 30, opacity: .6, particles: { drops: 32, signs: 3 }, angle: 16, fallSpeed: .85, flicker: .9, reflection: .22, colors: ['#C77DFF', '#FF6FB5', '#7AE7FF'], vignette: .22 },
    wuxia: { theme: 'wuxia', mode: 'ink', fps: 30, opacity: .35, particles: { blooms: 6, motes: 12 }, bloomPeriod: 14, swordEvery: 9, colors: ['#2B2A26', '#4A463E'], vignette: .24 },
    fireworks: { theme: 'fireworks', mode: 'fireworks', fps: 30, opacity: .7, particles: { sparks: 30, embers: 8 }, shellEvery: 8, rise: 1.1, colors: ['#FFC46B', '#FF8A5B', '#FFE7B5', '#FF6B6B'], vignette: .24 },
    /* v5.3 十套数据/材质/交互皮肤：canvas 只有 wave / pulse 两条路径与 nodes 一组静态点，
       glass / polar / type / chrome 为 mode none（纯 CSS，零 canvas 开销） */
    'a-tidal': { theme: 'a-tidal', mode: 'wave', fps: 30, opacity: .8, amp: .16, colors: ['#37C2B0', '#5FD9C9', '#F2B366'], vignette: .12 },
    'a-aurora': { theme: 'a-aurora', mode: 'wave', fps: 30, opacity: .5, amp: .1, colors: ['#6CE5B1', '#A78BFA', '#FFB86B'], vignette: .14 },
    'a-radio': { theme: 'a-radio', mode: 'pulse', fps: 30, opacity: .6, amp: .05, colors: ['#8FE3A8'], vignette: .12 },
    'a-culture': { theme: 'a-culture', mode: 'nodes', fps: 30, opacity: .8, colors: ['#2F6B4F', '#C8A24A'], vignette: .1 },
    'a-glass': { theme: 'a-glass', mode: 'none', fps: 30, opacity: 0, colors: ['#A8DADC'], vignette: 0 },
    'a-polar': { theme: 'a-polar', mode: 'none', fps: 30, opacity: 0, colors: ['#F4D9A8'], vignette: 0 },
    'a-type': { theme: 'a-type', mode: 'none', fps: 30, opacity: 0, colors: ['#A63A2B'], vignette: 0 },
    'a-pulse': { theme: 'a-pulse', mode: 'pulse', fps: 30, opacity: .65, amp: .06, colors: ['#FF5C6C', '#6FE3D0'], vignette: .12 },
    'a-chart': { theme: 'a-chart', mode: 'nodes', fps: 30, opacity: .9, colors: ['#E8EEFF', '#F5C86B', '#4A5F86'], vignette: .12 },
    'a-chrome': { theme: 'a-chrome', mode: 'none', fps: 30, opacity: 0, colors: ['#B9F0E4'], vignette: 0 }
  };
  const CACHE = 'el-skins-v2';
  const MAX_LIGHT = 40;
  const MAX_FULL = 90;

  let layer = null, canvas = null, ctx = null, dpr = 1;
  let cfg = null, theme = '', particles = [], mode = '';
  let raf = 0, last = 0, startedAt = 0, boostUntil = 0;
  let power = true, powerSave = false, reduced = false, still = false;
  let hidden = document.hidden;
  let tier = 'light';
  let gapT0 = 0, gapSum = 0, gapN = 0;
  let frames = 0;
  let peak = 0; // 本套皮肤内的粒子峰值（供验收直接读取，避免采样抖动）
  let timers = {};
  let W = 0, H = 0;
  let fxData = null; // v5.3：账本数据上下文（应用层经 setData 注入，特效只读）

  function capFull() {
    if (!power || powerSave || reduced || still) return 0;
    return (boostUntil && Date.now() < boostUntil) ? MAX_FULL : MAX_LIGHT;
  }
  function fpsNow() {
    if (!power || powerSave || reduced || still) return 0;
    return (boostUntil && Date.now() < boostUntil) ? 60 : 30;
  }
  function parseCssColors(list, fb) {
    return (Array.isArray(list) && list.length ? list : fb);
  }

  function fetchCfg(t) {
    const fallback = DEFAULT_FX[t] || null;
    if (!window.fetch) return Promise.resolve(fallback);
    const url = 'assets/skins/' + t + '/fx.json?v=' + (window.__EL_VER || '5.3.0');
    const get = (u) => (window.caches ? caches.match(u).then(hit => hit || fetch(u)) : fetch(u));
    return get(url).then(r => (r && r.ok ? r.json() : null)).catch(() => null)
      .then(j => {
        if (!j) return fallback;
        return Object.assign({}, fallback || {}, j);
      });
  }

  function ensureLayer() {
    if (canvas && document.body.contains(canvas)) {
      if (W !== window.innerWidth || H !== window.innerHeight) resize();
      return;
    }
    layer = document.createElement('div');
    layer.id = 'skinFxLayer';
    layer.setAttribute('aria-hidden', 'true');
    canvas = document.createElement('canvas');
    layer.appendChild(canvas);
    document.body.appendChild(layer);
    ctx = canvas.getContext('2d');
    resize();
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    if (!canvas) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function build() {
    particles = [];
    timers = { meteor: 0, sword: 0, shell: 0, bloom: 0 };
    if (!cfg) return;
    /* v5.3：wave / pulse 只画一条路径，nodes 画静态数据点，none 纯 CSS——都不需要粒子 */
    if (mode === 'none' || mode === 'wave' || mode === 'pulse' || mode === 'nodes') return;
    const p = cfg.particles || {};
    const mult = tier === 'eco' ? 0.5 : 1;
    const full = (boostUntil && Date.now() < boostUntil) ? 1.6 : 1;
    const colors = parseCssColors(cfg.colors, ['#FFFFFF']);
    if (mode === 'petal') {
      ['far', 'mid', 'near'].forEach(function (band) {
        const n = Math.round((p[band] || 0) * mult * full);
        for (let i = 0; i < n; i++) particles.push({
          k: 'petal', band: band, x: rnd(0, W), y: rnd(0, H),
          vy: (cfg.speed[band] || .5) * 26, sway: cfg.sway[band] || 14,
          ph: rnd(0, 6.28), size: cfg.size[band] || 3, c: pick(colors)
        });
      });
    } else if (mode === 'starfield') {
      const n = Math.round((p.stars || 30) * mult * full);
      for (let i = 0; i < n; i++) particles.push({
        k: 'star', x: rnd(0, W), y: rnd(0, H * .82), r: rnd(.6, 1.9),
        ph: rnd(0, 6.28), c: pick(colors)
      });
      particles.push({ k: 'meteor', x: -1, y: -1, t: 0, life: 0 });
    } else if (mode === 'rain') {
      const n = Math.round((p.drops || 28) * mult * full);
      for (let i = 0; i < n; i++) particles.push({
        k: 'drop', x: rnd(-W * .2, W * 1.1), y: rnd(-H, H),
        len: rnd(10, 26), v: rnd(.6, 1.3), c: pick(colors), a: rnd(.18, .5)
      });
      for (let i = 0; i < (p.signs || 2); i++) particles.push({
        k: 'sign', x: rnd(W * .1, W * .85), y: rnd(H * .08, H * .45),
        w: rnd(26, 54), h: rnd(8, 14), c: pick(colors), ph: rnd(0, 6.28), off: 0
      });
    } else if (mode === 'ink') {
      const n = Math.round((p.blooms || 5) * mult * full);
      for (let i = 0; i < n; i++) particles.push({
        k: 'bloom', x: rnd(0, W), y: rnd(0, H), r: rnd(26, 80),
        ph: rnd(0, 6.28), grow: rnd(.25, .6), c: pick(colors)
      });
      const m = Math.round((p.motes || 10) * mult * full);
      for (let i = 0; i < m; i++) particles.push({
        k: 'mote', x: rnd(0, W), y: rnd(0, H), r: rnd(.6, 1.6), ph: rnd(0, 6.28), c: pick(colors)
      });
    } else if (mode === 'fog') {
      /* 雾：极低透明度的缓慢漂移团块，不压正文 */
      const n = Math.round((p.fog || 8) * mult * full);
      for (let i = 0; i < n; i++) particles.push({
        k: 'fog', x: rnd(-W * .1, W * 1.1), y: rnd(H * .2, H * 1.05),
        r: rnd(48, 110), ph: rnd(0, 6.28), vx: rnd(-7, 7), vy: rnd(-5, -1.5), c: pick(colors)
      });
    } else if (mode === 'fireworks') {
      for (let i = 0; i < (p.embers || 6); i++) particles.push({
        k: 'ember', x: rnd(0, W), y: rnd(H * .3, H), vy: rnd(-14, -5), ph: rnd(0, 6.28), c: pick(colors)
      });
      particles.push({ k: 'shell', x: -1, y: -1, t: 0, life: 0 });
    }
    if (particles.length > (boostUntil && Date.now() < boostUntil ? MAX_FULL : MAX_LIGHT)) {
      particles = particles.slice(0, boostUntil && Date.now() < boostUntil ? MAX_FULL : MAX_LIGHT);
    }
  }

  function drawPetals(t) {
    ctx.globalCompositeOperation = 'source-over';
    particles.forEach(function (p) {
      const a = p.band === 'far' ? .22 : p.band === 'mid' ? .34 : .46;
      ctx.globalAlpha = a * cfg.opacity;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      const rad = p.size;
      ctx.ellipse(p.x + Math.sin(t * .001 * (p.band === 'near' ? .9 : .5) + p.ph) * p.sway,
        p.y, rad, rad * 1.7, Math.sin(t * .0008 + p.ph) * .7, 0, 6.283);
      ctx.fill();
    });
  }
  function drawStars(t) {
    const tw = cfg.twinklePeriod || 3;
    particles.forEach(function (p) {
      if (p.k === 'meteor') {
        if (p.life > 0) {
          const k = 1 - p.life / 1.4;
          ctx.globalAlpha = cfg.opacity * Math.sin(Math.PI * k);
          ctx.strokeStyle = '#EAF1FF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 90, p.y - 34);
          ctx.stroke();
          p.x += 130 * .016; p.y += 48 * .016; p.life -= .016;
        }
        return;
      }
      ctx.globalAlpha = cfg.opacity * (.35 + .65 * Math.abs(Math.sin(t * .001 / tw * 3.14 + p.ph)));
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
    });
    const meteor = particles.find(function (x) { return x.k === 'meteor'; });
    timers.meteor = timers.meteor || 0;
    if (meteor && meteor.life <= 0) {
      timers.meteor += .016;
      if (timers.meteor >= (cfg.meteorEvery || 12)) {
        timers.meteor = 0;
        meteor.x = rnd(W * .55, W * .95); meteor.y = rnd(20, H * .35); meteor.life = 1.4;
      }
    }
  }
  function drawRain(t) {
    ctx.globalCompositeOperation = 'source-over';
    const ang = (cfg.angle || 16) * Math.PI / 180;
    particles.forEach(function (p) {
      if (p.k === 'drop') {
        ctx.globalAlpha = p.a * cfg.opacity;
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.sin(ang) * p.len, p.y + Math.cos(ang) * p.len);
        ctx.stroke();
        return;
      }
      ctx.globalAlpha = cfg.opacity * .5;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.w, p.h);
    });
  }
  function drawInk(t) {
    particles.forEach(function (p) {
      if (p.k === 'bloom') {
        const k = .5 + .5 * Math.sin(t * .00022 * (p.grow * 3) + p.ph);
        ctx.globalAlpha = cfg.opacity * (.20 + k * .22);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + k * .35), 0, 6.283);
        ctx.fill();
        return;
      }
      ctx.globalAlpha = cfg.opacity * .5 * (.4 + .6 * Math.sin(t * .001 + p.ph) ** 2);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
    });
    const sword = particles.find(function (x) { return x.k === 'sword'; });
    if (sword && sword.life > 0) {
      const k = 1 - sword.life / .7;
      ctx.globalAlpha = cfg.opacity * 1.6 * Math.sin(Math.PI * k);
      ctx.strokeStyle = 'rgba(240,238,228,.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, H * .62 - k * H * .34);
      ctx.lineTo(W, H * .38 - k * H * .34);
      ctx.stroke();
      sword.life -= .016;
    }
  }
  function drawFog(t) {
    ctx.globalCompositeOperation = 'source-over';
    particles.forEach(function (p) {
      if (p.k !== 'fog') return;
      const k = .5 + .5 * Math.sin(t * .00018 + p.ph);
      const r = p.r * (1 + k * .18);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      const base = p.c || '#EAF4FF';
      g.addColorStop(0, base);
      g.addColorStop(.55, base);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = cfg.opacity * (.16 + k * .16);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.283);
      ctx.fill();
    });
  }
  /* ---------- v5.3 数据驱动模式 ----------
     wave：潮汐/极光——整屏一条路径，零粒子；振幅与色温来自当日数据
     pulse：静默电台/脉搏——一条滚动的示波线，落账瞬间出一次尖峰
     nodes：菌群/星图——每笔记录一个确定性节点，数据变了重画一次即停 */
  function hash01(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function drawWave(t) {
    const d = fxData || {};
    const cols = cfg.colors || ['#37C2B0'];
    if (cfg.bands === 3) {
      /* 极光餐盘：碳水/蛋白/脂肪三条极光带，宽度与亮度来自宏量配比 */
      const kcal = Math.max(0, (d.macros && d.macros.kcal) || 0);
      const shares = kcal > 0 ? [
        Math.max(0, (d.macros.c || 0)) * 4 / kcal,
        Math.max(0, (d.macros.p || 0)) * 4 / kcal,
        Math.max(0, (d.macros.f || 0)) * 9 / kcal
      ] : [0, 0, 0];
      const tot = shares[0] + shares[1] + shares[2] || 1;
      const baseYs = [H * .30, H * .48, H * .66];
      for (let b = 0; b < 3; b++) {
        const w = Math.max(.05, shares[b] / tot);
        const c = cols[b] || cols[0];
        ctx.globalAlpha = cfg.opacity * (0.28 + w * .72) * (kcal > 0 ? 1 : .18);
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(1.2, H * .05 * w + 1);
        ctx.beginPath();
        for (let x = 0; x <= W; x += Math.max(6, W / 60)) {
          const u = x / W;
          const y = baseYs[b]
            + Math.sin(u * 6.283 * (1.1 + b * .5) + t * .00035 * (1 + b * .4)) * H * (cfg.amp || .1) * (.6 + w)
            + Math.sin(u * 6.283 * 3.1 - t * .00021) * H * .008;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      return;
    }
    /* 潮汐：缺口越大越平静偏青；超额转暖色并起碎浪；三餐各生成一道波峰 */
    const over = d.deficitRatio != null && d.deficitRatio < 0;
    const calm = Math.max(0, Math.min(1, d.deficitRatio == null ? .5 : d.deficitRatio));
    const amp = (cfg.amp || .16) * (over ? 1.5 : (0.55 + 0.75 * (1 - calm)));
    const baseY = H * (over ? .80 : .74);
    const c0 = over ? (cols[2] || '#F2B366') : cols[0];
    const c1 = cols[1] || c0;
    const meals = d.meals || {};
    const crestXs = [.18, .5, .82];
    const crestAmps = [meals.breakfast, meals.lunch, meals.dinner].map(v => Math.min(1, (v || 0) / 900));
    const g = ctx.createLinearGradient(0, baseY - H * .3, 0, H);
    g.addColorStop(0, c1);
    g.addColorStop(1, c0);
    ctx.globalAlpha = cfg.opacity * (d.recorded === false ? .35 : .8);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    const seg = Math.max(6, Math.floor(W / 48));
    for (let x = 0; x <= W + seg; x += seg) {
      const u = x / W;
      let y = Math.sin(u * 6.283 * 1.6 + t * .0006) * H * amp * .5
        + Math.sin(u * 6.283 * 4.3 - t * .0011) * H * amp * (over ? .22 : .07);
      crestAmps.forEach(function (a, i) {
        const dx = u - crestXs[i];
        y -= Math.exp(-dx * dx * 90) * H * amp * (.45 + a);
      });
      ctx.lineTo(x, baseY + y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    if (d.recorded === false) {
      ctx.globalAlpha = cfg.opacity * .5;
      ctx.strokeStyle = c1;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(W, baseY);
      ctx.stroke();
    }
  }
  function ecgShape(u) {
    /* 一个周期内的简化 QRS：主峰 + 前后两个小波 */
    return Math.exp(-Math.pow((u - .3) / .018, 2))
      - .22 * Math.exp(-Math.pow((u - .22) / .012, 2))
      - .28 * Math.exp(-Math.pow((u - .4) / .02, 2));
  }
  function drawPulse(t) {
    const d = fxData || {};
    const cols = cfg.colors || ['#8FE3A8'];
    const baseY = H * .82;
    const amp = (cfg.amp || .06);
    const spike = d.lastAddAt ? Math.max(0, 1 - (Date.now() - d.lastAddAt) / 2600) : 0;
    const scroll = (t * .00004) % 1;
    ctx.globalAlpha = cfg.opacity;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = cols[1] || cols[0];
    ctx.beginPath();
    const seg = Math.max(3, Math.floor(W / 140));
    for (let x = 0; x <= W; x += seg) {
      const u = (x / W + scroll) % 1;
      const beat = ecgShape(u);
      const y = baseY
        + Math.sin(u * 6.283 * 2 + t * .0008) * H * amp * .18
        - beat * H * (amp + spike * .16);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    /* 扫描亮标：像仪器扫过一道 */
    ctx.globalAlpha = cfg.opacity * .9;
    ctx.fillStyle = cols[0];
    ctx.fillRect(0, baseY - H * amp * 1.6, W, 1);
  }
  function drawNodes(t) {
    const d = fxData || {};
    const cols = cfg.colors || ['#2F6B4F'];
    const n = Math.min(40, Math.max(0, d.totalRecords | 0));
    if (cfg.style === 'chart') {
      /* 星图：每条记录一颗星，按日期连成星座；断记的日子留暗星 */
      const dates = d.recentDates || [];
      const pts = [];
      for (let i = 0; i < n; i++) {
        pts.push({ x: (hash01(i * 2 + 1) * .84 + .08) * W, y: (hash01(i * 2 + 2) * .58 + .07) * H });
      }
      ctx.strokeStyle = cols[2] || '#4A5F86';
      ctx.lineWidth = .8;
      ctx.globalAlpha = cfg.opacity * .45;
      ctx.beginPath();
      pts.forEach(function (p, i) {
        if (i === 0) { ctx.moveTo(p.x, p.y); return; }
        const q = pts[i - 1];
        const gap = dates && dates[i] && dates[i - 1] ? daysBetweenKeys(dates[i - 1], dates[i]) : 1;
        if (gap === 1) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();
      pts.forEach(function (p, i) {
        const last = i === pts.length - 1;
        ctx.globalAlpha = cfg.opacity * (.5 + .5 * Math.abs(Math.sin(t * .0008 + i)));
        ctx.fillStyle = last ? (cols[1] || '#F5C86B') : cols[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, last ? 2.4 : 1.4, 0, 6.283);
        ctx.fill();
      });
      const miss = d.recentMiss || [];
      miss.forEach(function (m, i) {
        if (m) return;
        ctx.globalAlpha = cfg.opacity * .26;
        ctx.fillStyle = cols[0];
        ctx.beginPath();
        ctx.arc((hash01(i * 13 + 7) * .84 + .08) * W, (hash01(i * 13 + 8) * .58 + .07) * H, 1.1, 0, 6.283);
        ctx.fill();
      });
      return;
    }
    /* 菌落：每记一笔长一个节点，相邻两天的记录连成菌丝 */
    const dates = d.recentDates || [];
    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({ x: (hash01(i * 3 + 5) * .8 + .1) * W, y: (hash01(i * 3 + 6) * .64 + .14) * H });
    }
    ctx.strokeStyle = cols[0];
    ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      const gap = dates && dates[i] && dates[i - 1] ? daysBetweenKeys(dates[i - 1], dates[i]) : 0;
      if (gap !== 1) continue;
      const a = pts[i - 1], b = pts[i];
      if (Math.hypot(a.x - b.x, a.y - b.y) > W * .34) continue;
      ctx.globalAlpha = cfg.opacity * .3;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    pts.forEach(function (p, i) {
      ctx.globalAlpha = cfg.opacity * (.4 + .6 * (i / Math.max(1, n - 1)));
      ctx.fillStyle = i % 5 === 4 ? (cols[1] || cols[0]) : cols[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === n - 1 ? 2.3 : 1.6, 0, 6.283);
      ctx.fill();
    });
  }
  function daysBetweenKeys(a, b) {
    try {
      const da = new Date(a + 'T12:00:00');
      const db = new Date(b + 'T12:00:00');
      return Math.round(Math.abs(db - da) / 86400000);
    } catch (e) { return 0; }
  }
  function drawFireworks(t) {
    particles.forEach(function (p) {
      if (p.k === 'ember') {
        ctx.globalAlpha = cfg.opacity * .45;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, 6.283);
        ctx.fill();
        return;
      }
      if (p.k === 'spark') {
        ctx.globalAlpha = Math.max(0, p.life / p.max) * cfg.opacity;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.7, 0, 6.283);
        ctx.fill();
        return;
      }
      if (p.k !== 'shell') return;
      if (p.life > 0) {
        ctx.globalAlpha = cfg.opacity;
        ctx.fillStyle = '#FFE7B5';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, 6.283);
        ctx.fill();
      }
    });
  }

  function step(t) {
    if (!power || powerSave || reduced || still || hidden) { raf = 0; return; }
    raf = requestAnimationFrame(step);
    const fps = fpsNow();
    const minGap = 1000 / fps;
    if (last && t - last < minGap) return;
    const gap = last ? (t - last) : 16;
    last = t;
    // 掉帧采样（2 秒窗口）
    if (!gapT0) gapT0 = t;
    gapSum += gap; gapN++;
    if (t - gapT0 > 2000) {
      const avg = gapSum / Math.max(1, gapN);
      if (avg > 45 && tier === 'light') { tier = 'eco'; build(); }
      gapT0 = t; gapSum = 0; gapN = 0;
    }
    const dt = Math.min(.05, gap / 1000);
    // 满功率结束：立即回落到轻档粒子数（不在 boost 结束后继续维持高粒子数）
    if (boostUntil && Date.now() >= boostUntil) { boostUntil = 0; build(); }
    frames++;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'wave') {
      drawWave(t);
    } else if (mode === 'pulse') {
      drawPulse(t);
    } else if (mode === 'nodes') {
      /* 数据静态皮肤：画一次即停，等 setData / resize / boost 再重绘 */
      drawNodes(t);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    } else if (mode === 'petal') {
      particles.forEach(function (p) {
        p.y += p.vy * dt;
        if (p.y > H + 12) { p.y = -12; p.x = rnd(0, W); }
      });
      drawPetals(t);
    } else if (mode === 'starfield') {
      drawStars(t);
    } else if (mode === 'rain') {
      particles.forEach(function (p) {
        if (p.k === 'drop') {
          p.y += p.v * 260 * dt;
          p.x += p.v * 70 * dt;
          if (p.y > H + 20) { p.y = -20; p.x = rnd(-W * .1, W); }
        }
      });
      drawRain(t);
    } else if (mode === 'ink') {
      if (!particles.some(function (x) { return x.k === 'sword'; })) {
        particles.push({ k: 'sword', life: 0 });
      }
      timers.sword = (timers.sword || 0) + dt;
      const sword = particles.find(function (x) { return x.k === 'sword'; });
      if (sword && sword.life <= 0 && timers.sword >= (cfg.swordEvery || 9)) {
        timers.sword = 0; sword.life = .7;
      }
      drawInk(t);
      if (sword) sword.life -= 0; // 生命周期在 drawInk 内递减
    } else if (mode === 'fog') {
      particles.forEach(function (p) {
        if (p.k !== 'fog') return;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -p.r) { p.y = H + p.r; p.x = rnd(-W * .1, W * 1.1); }
        if (p.x < -p.r) p.x = W + p.r;
        if (p.x > W + p.r) p.x = -p.r;
      });
      drawFog(t);
    } else if (mode === 'fireworks') {
      timers.shell = (timers.shell || 0) + dt;
      const shell = particles.find(function (x) { return x.k === 'shell'; });
      if (shell && shell.life <= 0 && timers.shell >= (cfg.shellEvery || 8)) {
        timers.shell = 0;
        shell.x = rnd(W * .2, W * .8); shell.y = H + 10;
        shell.vy = -(H / 1.1); shell.life = 1.1;
      }
      if (shell && shell.life > 0) {
        shell.y += shell.vy * dt;
        shell.life -= dt;
        if (shell.life <= 0) {
          // 硬上限：爆发后总数不得超过当前档位上限（轻档 40 / eco 20 / 满功率 90），
          // 避免爆发与上一轮余烬叠加时越过 ≤40 的承诺。
          const cap = (boostUntil && Date.now() < boostUntil) ? MAX_FULL : (tier === 'eco' ? MAX_LIGHT / 2 : MAX_LIGHT);
          const room = Math.max(0, cap - particles.length);
          const n = Math.min(30, Math.round((cfg.particles.sparks || 30) * (tier === 'eco' ? .5 : 1)), room);
          for (let i = 0; i < n; i++) {
            const ang = (Math.PI * 2 * i) / n + rnd(-.1, .1);
            const sp = rnd(28, 90);
            particles.push({
              k: 'spark', x: shell.x, y: shell.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
              life: rnd(.7, 1.3), max: 1.3, c: pick(cfg.colors || ['#FFC46B'])
            });
          }
        }
      }
      particles.forEach(function (p) {
        if (p.k === 'spark') {
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vy += 60 * dt; p.vx *= .985; p.life -= dt;
        } else if (p.k === 'ember') {
          p.y += p.vy * dt;
          if (p.y < H * .1) { p.y = H + 6; p.x = rnd(0, W); }
        }
      });
      drawFireworks(t);
      // 清掉已熄灭的火花，保持粒子总数受控
      const live = particles.filter(function (p) { return p.k !== 'spark' || p.life > 0; });
      if (live.length !== particles.length) particles = live;
    }
    if (particles.length > peak) peak = particles.length;
    ctx.globalAlpha = 1;
  }

  function apply(c) {
    still = !!c.still;
    powerSave = !!c.powerSave;
    reduced = !!c.reduced;
    power = c.power !== false;
    if (!power || powerSave || reduced || still || !cfg || mode === 'none') stopLoop();
    else if (!raf) startLoop();
  }

  function startLoop() {
    if (raf) return;
    last = 0; gapT0 = 0; gapSum = 0; gapN = 0;
    raf = requestAnimationFrame(step);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx && canvas) ctx.clearRect(0, 0, W, H);
  }

  document.addEventListener('visibilitychange', function () {
    hidden = document.hidden;
    if (hidden) stopLoop();
    else if (cfg && power && !powerSave && !reduced && !still) { last = 0; startLoop(); }
  });
  window.addEventListener('resize', function () {
    if (!cfg) return;
    resize();
    build();
    if (mode === 'nodes') startLoop(); // 静态数据皮肤重排后重画一次
  });

  window.SkinFX = {
    cacheName: CACHE,
    start: function (t, opts) {
      const o = opts || {};
      if (cfg && theme === t) {
        if (layer) layer.style.display = '';
        apply({ power: o.power, powerSave: o.powerSave, reduced: o.reduced, still: o.still });
        return Promise.resolve(true);
      }
      theme = t;
      tier = 'light'; // 换主题重新采样，真低端会在 2 秒内再次降档
      peak = 0;
      gapT0 = 0; gapSum = 0; gapN = 0; // 换主题时重置掉帧采样窗口
      mode = (DEFAULT_FX[t] || {}).mode || '';
      return fetchCfg(t).then(function (j) {
        cfg = j;
        mode = cfg && cfg.mode ? cfg.mode : mode;
        if (mode === 'trace') mode = 'nodes'; // 星图的连线画法归入 nodes 族（style: chart）
        if (!cfg) return null;
        if (mode !== 'none') ensureLayer();
        build();
        apply({ power: o.power, powerSave: o.powerSave, reduced: o.reduced, still: o.still });
        return true;
      });
    },
    stop: function () {
      cfg = null; particles = []; theme = ''; mode = '';
      stopLoop();
      if (layer) layer.style.display = 'none';
    },
    update: function (o) {
      apply(o || {});
      if (layer && cfg) layer.style.display = '';
    },
    boost: function (ms) {
      boostUntil = Date.now() + (Number(ms) || 3000);
      if (cfg) build();
    },
    /* v5.3：应用层把当日账本数据交给特效（只读）。nodes 类皮肤收到新数据会重绘一次 */
    setData: function (d) {
      fxData = d || null;
      if (cfg && (mode === 'nodes') && power && !powerSave && !reduced && !still && !hidden && !raf) startLoop();
    },
    state: function () {
      return {
        theme: theme, mode: mode, count: particles.length,
        fpsTarget: fpsNow(), tier: tier, running: !!raf && !hidden,
        power: power, powerSave: powerSave, reduced: reduced, still: still,
        boost: !!(boostUntil && Date.now() < boostUntil), cache: CACHE, frames: frames, peak: peak,
        data: !!fxData
      };
    }
  };
})();
