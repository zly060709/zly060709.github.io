/* skins-fx.js · 8 个特效内核（canvas 2d，无依赖）
   每个内核与材质咬合，不是"一套粒子换颜色"：
     bloom    湿纸晕开（纸/墨/漆）
     glint    镜面高光带随指针走（金属/玻璃/漆）
     weave    织线受指针牵动（布）
     mist     颗粒沿光源漂移（石/木/陶）
     halftone 印刷网点对位闪烁（瓷/纸/印刷）
     refract  漆面：反光带按时间扫过 + 边缘折射（与指针无关，g22）
     brush    水墨笔锋拖尾 + 飞白（a-wuxia）
     spark    火花爆开 + 重力下落（a-fireworks）
   约束：首屏不请求（由 skins-gen.js 在首帧后 idle 注入）；离屏/后台暂停；
   prefers-reduced-motion 全关；三级降档；自适应掉帧保护。 */
(function () {
  'use strict';
  var cv, ctx, W = 0, H = 0, DPR = 1;
  var raf = 0, last = 0, level = 2, kernel = '';
  var px = .5, py = .3, tx = .5, ty = .3, moved = false;
  var t0 = 0, responseMs = -1, pendingSince = 0;
  var frames = [], frameMs = [], running = false;
  var P = {}, reduced = false;
  var sprite = {};

  var KPARAM = {
    bloom:    { n: 7,  r: .34, a: .14, speed: .00018, color: 'ink' },
    glint:    { n: 3,  r: .55, a: .55, speed: .00006, color: 'amber' },
    weave:    { n: 1,  r: .34, a: .10, speed: 7,     color: 'ink' },
    mist:     { n: 92, r: .40, a: .18, speed: 1.6,   color: 'ink' },
    halftone: { n: 1,  r: .46, a: .16, speed: .0016, color: 'ink' },
    refract:  { n: 2,  r: .34, a: .55, speed: .00016, color: 'amber', sweep: .55, edge: .018 },
    brush:    { n: 1,  r: .34, a: .18, speed: .85,   color: 'ink', width: .016 },
    spark:    { n: 96, r: .30, a: .55, speed: 1,     color: 'amber', burst: .85, gravity: 1.5 }
  };

  function num(v, d) { var f = parseFloat(v); return isNaN(f) ? d : f; }

  function readVars() {
    var cs = getComputedStyle(document.documentElement);
    var light = cs.getPropertyValue('--sk-light').trim() || '118deg';
    var ang = num(light.replace('deg', ''), 118);
    P.angle = ang;
    P.dirx = Math.cos((ang - 90) * Math.PI / 180);
    P.diry = Math.sin((ang - 90) * Math.PI / 180);
    P.alpha = num(cs.getPropertyValue('--fx-opacity'), .9);
    var col = cs.getPropertyValue('--sk-fx-color').trim() || 'rgba(0,0,0,.55)';
    P.color = col;
    P.deep = cs.getPropertyValue('--sk-fx-deep').trim() || 'rgba(255,255,255,.35)';
    P.radius = num(cs.getPropertyValue('--fx-radius'), .34);
    P.grain = num(cs.getPropertyValue('--sk-grain'), .3);
    // 同内核的套必须至少差两项：密度 --fx-n、速度 --fx-speed、方向 --fx-drift、
    // 响应 --fx-mode(0 推开 / 1 吸附 / 2 拖拽)、作用范围 --fx-range、带宽 --fx-band。
    // 缺省时退回 KPARAM，行为与以前完全一致。
    P.n = num(cs.getPropertyValue('--fx-n'), 0);
    P.speed = num(cs.getPropertyValue('--fx-speed'), 0);
    P.mode = num(cs.getPropertyValue('--fx-mode'), 0);
    P.range = num(cs.getPropertyValue('--fx-range'), .18);
    P.band = num(cs.getPropertyValue('--fx-band'), 1);
    P.follow = num(cs.getPropertyValue('--fx-follow'), .35);
    P.peak = num(cs.getPropertyValue('--fx-peak'), .92);
    P.width = num(cs.getPropertyValue('--fx-width'), 0);
    P.burst = num(cs.getPropertyValue('--fx-burst'), 0);
    P.gravity = num(cs.getPropertyValue('--fx-gravity'), 0);
    P.sweep = num(cs.getPropertyValue('--fx-sweep'), 0);
    P.edge = num(cs.getPropertyValue('--fx-edge'), 0);
    var da = num(cs.getPropertyValue('--fx-drift'), ang);
    P.dx = Math.cos((da - 90) * Math.PI / 180);
    P.dy = Math.sin((da - 90) * Math.PI / 180);
  }

  function mkSprite(color) {
    var s = document.createElement('canvas');
    s.width = s.height = 96;
    var c = s.getContext('2d');
    var gr = c.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, color);
    gr.addColorStop(.42, color.replace(/[\d.]+\)$/, function (m) { return (parseFloat(m) * .5) + ')'; }));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 96, 96);
    return s;
  }

  function resize() {
    DPR = Math.min(1.5, window.devicePixelRatio || 1);
    W = cv.width = Math.floor(innerWidth * DPR);
    H = cv.height = Math.floor(innerHeight * DPR);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  }

  /* ---------- 内核 ---------- */
  var R = {};

  R.bloom = function (t) {
    var s = P.radius; // 材质吸附半径：纸大、漆小（由 CSS --fx-radius 给）
    var bn = P.n || KPARAM.bloom.n;              // 团数（每套不同：g16 7 团 / a-sakura 4 团）
    var bsp = P.speed || KPARAM.bloom.speed;     // 晕开速度（a-sakura 更慢）
    var sp = sprite[P.color] || (sprite[P.color] = mkSprite(P.color));
    ctx.globalAlpha = P.alpha * .85;
    for (var i = 0; i < bn; i++) {
      var ph = t * bsp + i * 1.31;
      var bx = (0.18 + 0.64 * (0.5 + 0.5 * Math.sin(ph * 1.7 + i)) + px * .10 * Math.cos(ph)) * W;
      var by = (0.22 + 0.56 * (0.5 + 0.5 * Math.cos(ph * 1.2 + i * 2)) + py * .10) * H;
      var rr = (0.10 + 0.16 * (0.5 + 0.5 * Math.sin(ph * 2.3))) * Math.min(W, H) * (P.radius / .34) * (1 + s * .9);
      ctx.drawImage(sp, bx - rr, by - rr, rr * 2, rr * 2);
    }
    // 指针处"湿点"：随停留时间扩大，模拟纸的吸附
    if (moved) {
      var wr = (0.06 + 0.10 * (1 - Math.exp(-(t - t0) / 900))) * Math.min(W, H) * (P.radius / .34);
      ctx.globalAlpha = P.alpha * .9;
      ctx.drawImage(sp, px * W - wr * 1.6, py * H - wr * 1.6, wr * 3.2, wr * 3.2);
    }
  };

  R.glint = function (t) {
    // 高光带：沿光源方位角，随指针横移；带是有形状的斜切，不是整块提亮
    var a = P.angle * Math.PI / 180;
    var len = Math.hypot(W, H) * 1.15;
    var gN = P.n || KPARAM.glint.n;
    var band = P.band;
    var mid = Math.floor(gN / 2);
    ctx.save();
    ctx.translate(W * (.5 + (px - .5) * P.follow), H * (.34 + (py - .5) * .22));
    ctx.rotate(a);
    for (var i = 0; i < gN; i++) {
      var off = gN > 1 ? (-.42 + .84 * i / (gN - 1)) * H : 0;
      var w = (0.045 + 0.012 * i) * len * (P.radius / .5) * band;
      var x0 = off;
      var g = ctx.createLinearGradient(x0 - w, 0, x0 + w, 0);
      var peak = P.alpha * (i === mid ? P.peak : .55);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(.30, P.deep.replace(/[\d.]+\)$/, (peak * .62) + ')'));
      g.addColorStop(.5, P.deep.replace(/[\d.]+\)$/, peak + ')'));
      g.addColorStop(.62, P.color.replace(/[\d.]+\)$/, (peak * .42) + ')'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 - w, -len * .5, w * 2, len);
    }
    ctx.restore();
  };

  R.weave = function (t) {
    // 只画指针附近 ±160px 的经纬线，省性能；线被"拽"出 1–2px 再回弹
    var zx = px * W, zy = py * H;
    var box = Math.max(160, Math.min(W, H) * .30) * DPR;
    // 同内核不同套必须差 ≥2 项：--fx-n 给线距（px，缺省 3），--fx-band 给牵引幅度（缺省 1）
    var gap = Math.max(1.5, P.n || 3) * DPR;
    var ampK = P.band || 1;
    ctx.globalAlpha = P.alpha * .9;
    ctx.strokeStyle = P.color.replace(/[\d.]+\)$/, (.45) + ')');
    ctx.lineWidth = Math.max(1, DPR * .7);
    var n = Math.ceil(box / gap);
    for (var i = -n; i <= n; i += 2) {
      var gx = Math.round(zx / gap) * gap + i * gap;
      var gy = Math.round(zy / gap) * gap + i * gap;
      var amp = 2.4 * DPR * ampK * (1 - Math.abs(i * gap) / box) * (Math.sin(t * .0018 + i * .6) > 0 ? 1 : .4);
      ctx.beginPath();
      ctx.moveTo(gx + amp, zy - box);
      ctx.lineTo(gx - amp, zy + box);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(zx - box, gy - amp);
      ctx.lineTo(zx + box, gy + amp);
      ctx.stroke();
    }
  };

  R.mist = function (t) {
    var mn = P.n || KPARAM.mist.n;
    var msp = P.speed || KPARAM.mist.speed;
    var n = level === 2 ? mn : Math.min(22, mn);
    // 浮尘薄雾：3 团大而淡的漂移，沿光源方向，证明"整面在动"而不是几点噪声
    var veil = level === 2 ? 3 : 1;
    for (var v = 0; v < veil; v++) {
      var ph2 = t * .00082 + v * 2.1;
      var vx2 = (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(ph2)) + P.dx * .12 * Math.sin(ph2 * .7)) * W;
      var vy2 = (0.30 + 0.5 * (0.5 + 0.5 * Math.cos(ph2 * 1.3)) + P.dy * .12 * Math.cos(ph2 * .8)) * H;
      var rr2 = Math.min(W, H) * (0.26 + 0.06 * v) * (P.radius / .38);
      var gr2 = ctx.createRadialGradient(vx2, vy2, 0, vx2, vy2, rr2);
      gr2.addColorStop(0, P.color.replace(/[\d.]+\)$/, (.16) + ')'));
      gr2.addColorStop(.55, P.color.replace(/[\d.]+\)$/, (.07) + ')'));
      gr2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = P.alpha;
      ctx.fillStyle = gr2;
      ctx.fillRect(vx2 - rr2, vy2 - rr2, rr2 * 2, rr2 * 2);
    }
    ctx.globalAlpha = P.alpha;
    ctx.fillStyle = P.color.replace(/[\d.]+\)$/, (.46) + ')');
    for (var i = 0; i < n; i++) {
      var seed = i * 37.17;
      var vx = (0.5 + 0.5 * Math.sin(seed * 2.1)) * W;
      var vy = (0.5 + 0.5 * Math.cos(seed * 1.3)) * H;
      var drift = (t * msp * (0.4 + (i % 5) * 0.16)) % (H + 40);
      var x = (vx + P.dx * drift * .55) % (W + 40);
      var y = (vy + P.dy * drift * .55) % (H + 40) - 20;
      // 指针响应按套分三种：0 推开（绕开光标）、1 吸附（被光聚成团）、2 拖拽（顺着指针运动走）
      var dx = x - px * W, dy = y - py * H;
      var d2 = dx * dx + dy * dy;
      var r0 = Math.min(W, H) * P.range;
      if (d2 < r0 * r0 && d2 > 1) {
        var d = Math.sqrt(d2);
        var k = 1 - d / r0;
        if (P.mode === 1) {
          x -= dx / d * r0 * .45 * k;
          y -= dy / d * r0 * .45 * k;
        } else if (P.mode === 2) {
          x += (MOVE_DX || 0) * .55 * k;
          y += (MOVE_DY || 0) * .55 * k;
        } else {
          x += dx / d * r0 * .35 * k;
          y += dy / d * r0 * .35 * k;
        }
      }
      var s = (2 + (i % 4) * .9) * DPR;
      ctx.fillRect(x, y, s, s);
    }
  };

  R.halftone = function (t) {
    // 网点相位：整页缓慢跳 0..1 像素，模拟套印错位；指针处相位再偏 1 格
    var gap = 7 * DPR;
    var phase = Math.sin(t * KPARAM.halftone.speed) * .9 + (MOVE_DX * .6) + (MOVE_DY * .6);
    var cols = Math.ceil(W / gap), rows = Math.ceil(H / gap);
    ctx.globalAlpha = P.alpha;
    ctx.fillStyle = P.color.replace(/[\d.]+\)$/, (.34) + ')');
    var startX = Math.max(0, Math.floor((px * W - Math.min(W, H) * .70) / gap));
    var endX = Math.min(cols, Math.ceil((px * W + Math.min(W, H) * .70) / gap));
    var startY = Math.max(0, Math.floor((py * H - Math.min(W, H) * .70) / gap));
    var endY = Math.min(rows, Math.ceil((py * H + Math.min(W, H) * .70) / gap));
    for (var cx = startX; cx < endX; cx += 2) {
      for (var cy = startY; cy < endY; cy += 2) {
        var r = (1.9 + 2.6 * (0.5 + 0.5 * Math.sin(cx * .6 + cy * .4 + t * .0012))) * DPR;
        ctx.beginPath();
        ctx.arc(cx * gap + phase * DPR, cy * gap + phase * DPR, r, 0, 6.2832);
        ctx.fill();
      }
    }
  };

  var MOVE_DX = 0, MOVE_DY = 0, MOVES = 0;

  // 漆面：①反光带按时间扫过（与指针无关）②边缘折射细亮线各自呼吸。
  // 和 glint 的根本区别：glint 的带子中心锁在指针上；这里两条运动都不跟手。
  R.refract = function (t) {
    var sw = P.sweep || KPARAM.refract.sweep;
    var span = Math.hypot(W, H) * 1.3;
    ctx.save();
    ctx.translate(W * .5, H * .5);
    ctx.rotate((P.angle + 16) * Math.PI / 180);
    for (var b = 0; b < 2; b++) {
      // 两条带周期不同（1× / 1.55×）、扫描方向相反 —— 独立运动，不是同一根带子换宽
      var per = (b ? 1.55 : 1) * 4200 / Math.max(.2, sw);
      var ph = (t % per) / per;
      var pos = (b ? (.58 - 1.16 * ph) : (-.58 + 1.16 * ph)) * span;
      var w = span * (b ? .12 : .17);
      var g = ctx.createLinearGradient(pos - w, 0, pos + w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(.34, P.deep.replace(/[\d.]+\)$/, (.26 * P.alpha) + ')'));
      g.addColorStop(.5, P.deep.replace(/[\d.]+\)$/, (.60 * P.alpha) + ')'));
      g.addColorStop(.66, P.color.replace(/[\d.]+\)$/, (.20 * P.alpha) + ')'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-span * .5, -span * .5, span, span);
    }
    ctx.restore();
    // ② 边缘折射：四条边的窄亮带，相位各不相同、亮度沿边起伏
    var ew = Math.max(2, Math.min(W, H) * (P.edge || KPARAM.refract.edge));
    ctx.globalAlpha = P.alpha;
    var edges = [
      [0, 0, W, 0, 0, 0, W, ew, 0.0],          // 上：沿 x 起伏
      [W, 0, W, H, W - ew, 0, ew, H, 2.1],     // 右：沿 y 起伏
      [0, 0, W, 0, 0, H - ew, W, ew, 4.2],     // 下：沿 x 起伏
      [0, H, 0, 0, 0, 0, ew, H, 6.0]           // 左：沿 y 起伏
    ];
    for (var e = 0; e < edges.length; e++) {
      var gx0 = edges[e][0], gy0 = edges[e][1], gx1 = edges[e][2], gy1 = edges[e][3];
      var rx = edges[e][4], ry = edges[e][5], rw = edges[e][6], rh = edges[e][7];
      var eg = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      var ph3 = edges[e][8] + t * .0011;
      for (var k = 0; k <= 6; k++) {
        var kk = k / 6;
        var aa = .08 + .42 * Math.max(0, Math.sin(kk * 7.5 + ph3));
        eg.addColorStop(kk, P.deep.replace(/[\d.]+\)$/, (aa) + ')'));
      }
      ctx.fillStyle = eg;
      ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.globalAlpha = 1;
  };

  // 水墨：笔锋拖尾 + 飞白。轨迹随指针走，笔画渐细渐淡，端点是断续墨点。
  var TRAIL = [];
  R.brush = function (t) {
    var wid = Math.min(W, H) * (P.width || KPARAM.brush.width);
    var keep = Math.round(18 + (P.speed || KPARAM.brush.speed) * 14);  // 速度 = 笔尾长度
    var lastP = TRAIL[TRAIL.length - 1];
    if (!lastP || Math.abs(lastP.x - px * W) > .6 || Math.abs(lastP.y - py * H) > .6)
      TRAIL.push({ x: px * W, y: py * H, t: t });
    while (TRAIL.length > keep) TRAIL.shift();
    ctx.globalAlpha = P.alpha;
    ctx.strokeStyle = P.color.replace(/[\d.]+\)$/, (.40) + ')');
    ctx.lineCap = 'round';
    for (var i = 1; i < TRAIL.length; i++) {
      var a = TRAIL[i - 1], b = TRAIL[i];
      var k = i / TRAIL.length;
      ctx.lineWidth = wid * k;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // 飞白：笔尾两侧的断续墨点
    ctx.fillStyle = P.color.replace(/[\d.]+\)$/, (.30) + ')');
    for (var j = 0; j < 14; j++) {
      var f = TRAIL[Math.max(0, TRAIL.length - 1 - (j % 6))];
      if (!f) break;
      var ang = j * 2.1 + t * .0006;
      var rr = (1.2 + (j % 3) * .8) * DPR;
      ctx.fillRect(f.x + Math.cos(ang) * wid * .8, f.y + Math.sin(ang) * wid * .5, rr, rr);
    }
  };

  // 烟火：从指针处爆开，按重力下落，逐帧熄灭（与 bloom 的"越停越大"相反）
  R.spark = function (t) {
    var n = P.n || KPARAM.spark.n;
    var cnt = level === 2 ? n : Math.min(30, n);
    var burst = P.burst || KPARAM.spark.burst;
    var grav = P.gravity || KPARAM.spark.gravity;
    var unit = Math.min(W, H);
    for (var i = 0; i < cnt; i++) {
      var life = 780 + (i % 7) * 150;
      var age = (t + i * (life / cnt)) % life;
      var k = age / life;
      var ang = i * 2.399 + (i % 3) * .7;
      var reach = unit * .30 * burst * (0.4 + (i % 5) * .15);
      var x = px * W + Math.cos(ang) * reach * k;
      var y = py * H + Math.sin(ang) * reach * k * .55 + .5 * grav * k * k * unit * .5;
      var r = (1.3 + (i % 4) * .7) * DPR * (1 - k * .55);
      ctx.globalAlpha = P.alpha * (1 - k) * .95;
      ctx.fillStyle = (i % 4 === 0) ? P.deep.replace(/[\d.]+\)$/, (.9) + ')')
                                    : P.color.replace(/[\d.]+\)$/, (.75) + ')');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    running = false;
  }

  function tick(t) {
    if (document.hidden || reduced) { stop(); return; }
    raf = requestAnimationFrame(tick);
    var dt = last ? t - last : 16.7;
    last = t;
    if (dt > 0) { frameMs.push(dt); frames.push(t); }
    if (frameMs.length > 120) { frameMs.shift(); frames.shift(); }
    // 掉帧保护：连续 40 帧均值 < 45fps → 降一档
    if (frameMs.length === 120 && level > 0) {
      var avg = frameMs.reduce(function (a, b) { return a + b; }, 0) / 120;
      if (avg > 22.2) setLevel(level - 1, true);
      frameMs = [];
    }
    px += (tx - px) * .16;
    py += (ty - py) * .16;
    // 卡面高光跟随指针：写两个 CSS 变量，材质层（background-image）在合成器上自己走，
    // 文字永远在这层之上，不会因为特效压低对比度
    if (FRAME % 2 === 0) {
      var root = document.documentElement;
      root.style.setProperty('--fx-mx', ((px - .5) * 2).toFixed(3));
      root.style.setProperty('--fx-my', ((py - .5) * 2).toFixed(3));
    }
    FRAME++;
    MOVE_DX += ((tx - .5) - MOVE_DX) * .10;
    MOVE_DY += ((ty - .5) - MOVE_DY) * .10;
    ctx.clearRect(0, 0, W, H);
    var k = R[kernel];
    if (k) k(t);
    ctx.globalAlpha = 1;
    if (pendingSince && responseMs < 0) {
      // rAF 的时间戳是"帧开始"，事件可能在帧开始后才派发 → 差值为负，
      // 含义是"同一个合成帧内就画上了"，按 0 计（仍给出原始值供核对）
      responseMs = Math.max(0, t - pendingSince);
      lastDelta = t - pendingSince;
      pendingSince = 0;
      RESP++;
    }
    window.__fxdbg = { pend: pendingSince, resp: responseMs, raw: lastDelta, moves: MOVES, RESP: RESP };
  }

  var RESP = 0, lastDelta = 0, FRAME = 0;

  function start() {
    if (reduced || level === 0 || !kernel || running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  }

  function setLevel(n, silent) {
    level = Math.max(0, Math.min(2, n | 0));
    document.documentElement.setAttribute('data-fx-level', String(level));
    if (level === 0) { stop(); if (ctx) ctx.clearRect(0, 0, W, H); }
    else start();
    if (!silent) document.dispatchEvent(new CustomEvent('skin-fx-level', { detail: { level: level } }));
  }

  function bind(id, k) {
    kernel = k || '';
    document.documentElement.setAttribute('data-fx', kernel ? '1' : '0');
    readVars();
    start();
  }

  function init() {
    if (cv) return;
    reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    cv = document.createElement('canvas');
    cv.id = 'sk-fx';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    ctx = cv.getContext('2d', { alpha: true });
    resize();
    addEventListener('resize', function () { resize(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    function onMove(e) {
      MOVES++;
      tx = e.clientX / innerWidth;
      ty = e.clientY / innerHeight;
      moved = true;
      if (responseMs < 0 && !pendingSince) pendingSince = performance.now();
    }
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('mousemove', onMove, { passive: true });
    addEventListener('pointerdown', function () {
      // 按下：给一个短促脉冲（各内核对 t0 的解读不同）
      t0 = performance.now(); moved = true;
      if (responseMs < 0) pendingSince = performance.now();
      document.documentElement.setAttribute('data-fx-press', '1');
      setTimeout(function () { document.documentElement.removeAttribute('data-fx-press'); }, 180);
    }, { passive: true });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
      reduced = e.matches;
      if (reduced) stop(); else start();
    });
  }

  function stats() {
    var ms = frameMs.slice();
    if (!ms.length) return { frames: 0, fps: 0, p95: 0, level: level };
    ms.sort(function (a, b) { return a - b; });
    var avg = ms.reduce(function (a, b) { return a + b; }, 0) / ms.length;
    return {
      frames: ms.length,
      fps: Math.round(1000 / avg * 10) / 10,
      p95: Math.round(ms[Math.floor(ms.length * .95)] * 10) / 10,
      level: level,
      kernel: kernel,
      responseMs: responseMs < 0 ? null : Math.round(responseMs * 10) / 10,
      moves: MOVES, pending: Math.round(pendingSince || 0)
    };
  }

  window.SkinFx = {
    init: init, bind: bind, setLevel: setLevel, stats: stats,
    level: function () { return level; },
    kernel: function () { return kernel; },
    reset: function () { frameMs = []; frames = []; responseMs = -1; }
  };
})();
