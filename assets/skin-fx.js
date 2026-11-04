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
    fireworks: { theme: 'fireworks', mode: 'fireworks', fps: 30, opacity: .7, particles: { sparks: 30, embers: 8 }, shellEvery: 8, rise: 1.1, colors: ['#FFC46B', '#FF8A5B', '#FFE7B5', '#FF6B6B'], vignette: .24 }
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
    const url = 'assets/skins/' + t + '/fx.json';
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
    if (mode === 'petal') {
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
    if (!power || powerSave || reduced || still || !cfg) stopLoop();
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
  window.addEventListener('resize', function () { if (cfg) { resize(); build(); } });

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
        if (!cfg) return null;
        ensureLayer();
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
    state: function () {
      return {
        theme: theme, mode: mode, count: particles.length,
        fpsTarget: fpsNow(), tier: tier, running: !!raf && !hidden,
        power: power, powerSave: powerSave, reduced: reduced, still: still,
        boost: !!(boostUntil && Date.now() < boostUntil), cache: CACHE, frames: frames, peak: peak
      };
    }
  };
})();
