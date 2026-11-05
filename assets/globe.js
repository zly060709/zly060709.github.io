/* ============================================================
   能量账本 · 环游记地球（Canvas 2D，无第三方库）
   ------------------------------------------------------------
   纯数学部分可单独调用（便于断言）：
     Globe.arcAngle(km)            θ = 2π × km / 40075
     Globe.arcPixels(km, R)        R × θ
     Globe.project(lon, lat, R, rot)  正交投影
   渲染部分：
     var g = Globe.mount(canvas, { km: 0, reduced: false, powerSave: false });
     g.setKm(1234.5);  g.destroy();  Globe.stats(g)
   自转 0.02 rad/s（≈1.15°/s）；页面隐藏自动停帧；reduced-motion 静止；
   省电模式 15fps 且不自转。
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Globe = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var G = (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

  var EARTH_KM = 40075;
  var TWO_PI = Math.PI * 2;
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var SPIN = 0.02;                 // rad/s
  var START = { lat: 39.9, lon: 116.4 }; // 北京
  var BEARING = 260 * D2R;         // 向西出发的大圆
  var ROUTE_STEP = 0.5;            // 路线采样间隔（度）

  /* ---------- 1. 大圆 ---------- */
  function arcAngle(totalKm) {
    var n = Number(totalKm);
    if (!isFinite(n) || n <= 0) return 0;
    return TWO_PI * n / EARTH_KM;
  }
  function arcPixels(totalKm, R) {
    return Math.max(0, Number(R) || 0) * arcAngle(totalKm);
  }
  /* 由起点沿方位角 brg 走角距离 d（弧度）后的经纬度 */
  function dest(lat1, lon1, brg, d) {
    var s2 = Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg);
    s2 = Math.max(-1, Math.min(1, s2));
    var lat2 = Math.asin(s2);
    var lon2 = lon1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * s2);
    return [((lon2 * R2D + 540) % 360) - 180, lat2 * R2D];
  }
  /* 路线采样表（等角距） */
  var ROUTE = (function () {
    var out = [];
    var lat0 = START.lat * D2R, lon0 = START.lon * D2R;
    for (var deg = 0; deg <= 360; deg += ROUTE_STEP) out.push(dest(lat0, lon0, BEARING, deg * D2R));
    return out;
  })();
  function routeAt(theta) {
    var deg = (theta * R2D) % 360;
    if (deg < 0) deg += 360;
    var i = Math.floor(deg / ROUTE_STEP);
    var f = deg / ROUTE_STEP - i;
    var a = ROUTE[i], b = ROUTE[(i + 1) % ROUTE.length];
    var dLon = ((b[0] - a[0] + 540) % 360) - 180;
    return [a[0] + dLon * f, a[1] + (b[1] - a[1]) * f];
  }
  function stationPoint(cumKm) {
    return routeAt(arcAngle(cumKm));
  }

  /* ---------- 2. 正交投影 ---------- */
  /* x = R·cosφ·sinλ，y = -R·sinφ（屏幕 y 向下）；背面 cosφ·cosλ ≤ 0 不绘制 */
  function project(lon, lat, R, rotDeg) {
    var lam = (lon - rotDeg) * D2R;
    var phi = lat * D2R;
    var cp = Math.cos(phi), sp = Math.sin(phi);
    var vis = cp * Math.cos(lam) > 0;
    return { x: R * cp * Math.sin(lam), y: -R * sp, vis: vis, depth: cp * Math.cos(lam), cosPhi: cp };
  }

  /* ---------- 3. 渲染 ---------- */
  var LAND = null, LAND_P = null;
  function loadLand() {
    if (LAND_P) return LAND_P;
    LAND_P = fetch('assets/geo/coastline.json', { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw new Error('geo ' + r.status); return r.json(); })
      .then(function (j) {
        LAND = (j && j.polys || []).map(function (flat) {
          var pts = new Float32Array(flat.length);
          for (var i = 0; i < flat.length; i++) pts[i] = flat[i];
          return pts;
        });
        return LAND;
      })
      .catch(function () { LAND = []; return LAND; });
    return LAND_P;
  }

  var PAL = {
    base0: '#2b4a52', base1: '#14232a',
    rim: 'rgba(196,214,220,.55)',
    grid: 'rgba(206,220,226,',
    land: 'rgba(222,210,176,.20)',
    landLine: 'rgba(226,214,182,.52)',
    gold: '#e0a83c',
    goldDim: 'rgba(224,168,60,.22)',
    hist: 'rgba(224,168,60,.30)',
    dot: 'rgba(238,236,226,.85)',
    you: '#f2d79a'
  };

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var km = Math.max(0, Number(opts.km) || 0);
    var reduced = !!opts.reduced;
    var power = !!opts.powerSave;
    var rot = opts.rot != null ? Number(opts.rot) : 0.6;
    var raf = 0, alive = true, last = 0, phase = 0;
    var stats = { frames: 0, draws: 0, points: 0, fps: 0, lastAt: 0, land: 0, error: null };
    var stations = opts.stations || [];
    var histLaps = Math.min(3, Math.floor(km / EARTH_KM));

    function size() {
      var dpr = Math.min(2, (G.devicePixelRatio || 1));
      var w = canvas.clientWidth || 300;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return w;
    }
    var W = size();
    var R = Math.max(40, W / 2 - 6);
    var cx = W / 2, cy = W / 2;
    var grad = null;

    function drawSphere() {
      if (!grad) {
        grad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.2, cx, cy, R);
        grad.addColorStop(0, PAL.base0);
        grad.addColorStop(1, PAL.base1);
      }
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI);
      ctx.fillStyle = grad; ctx.fill();
      // 内侧暗角
      var vg = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)');
      ctx.fillStyle = vg; ctx.fill();
      // 外缘亮边
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, TWO_PI);
      ctx.strokeStyle = PAL.rim; ctx.lineWidth = 1; ctx.stroke();
      stats.draws += 3;
    }

    function drawGrid() {
      var rotDeg = rot * R2D;
      ctx.lineWidth = 1;
      // 经线（每 15°）
      for (var lon = -180; lon < 180; lon += 15) {
        var started = false;
        for (var lat = -90; lat <= 90; lat += 4) {
          var p = project(lon, lat, R, rotDeg);
          if (!p.vis) { started = false; continue; }
          var a = 0.10 + 0.22 * Math.pow(p.depth, 1.2);
          if (!started) { ctx.beginPath(); ctx.moveTo(cx + p.x, cy + p.y); started = true; }
          else ctx.lineTo(cx + p.x, cy + p.y);
          if (lat > 86 || !project(lon, lat + 4, R, rotDeg).vis) {
            ctx.strokeStyle = PAL.grid + (a).toFixed(3) + ')';
            ctx.stroke(); stats.draws++;
            started = false;
          }
        }
      }
      // 纬线（每 15°）
      for (var la = -75; la <= 75; la += 15) {
        var on = false;
        for (var lo = -180; lo <= 180; lo += 5) {
          var q = project(lo, la, R, rotDeg);
          if (!q.vis) { if (on) { ctx.stroke(); stats.draws++; on = false; } continue; }
          var aa = 0.08 + 0.18 * Math.pow(q.depth, 1.4);
          if (!on) { ctx.beginPath(); ctx.moveTo(cx + q.x, cy + q.y); on = true; }
          else ctx.lineTo(cx + q.x, cy + q.y);
          ctx.strokeStyle = PAL.grid + aa.toFixed(3) + ')';
        }
        if (on) { ctx.stroke(); stats.draws++; }
      }
    }

    function drawLand() {
      if (!LAND || !LAND.length) return;
      var rotDeg = rot * R2D;
      for (var pi = 0; pi < LAND.length; pi++) {
        var flat = LAND[pi], run = 0, visCount = 0, total = flat.length / 2;
        ctx.beginPath();
        var open = false;
        for (var i = 0; i < flat.length; i += 2) {
          var p = project(flat[i], flat[i + 1], R, rotDeg);
          if (!p.vis) { open = false; run = 0; continue; }
          visCount++;
          if (!open) { ctx.moveTo(cx + p.x, cy + p.y); open = true; }
          else ctx.lineTo(cx + p.x, cy + p.y);
          run++;
          stats.points++;
        }
        if (visCount < 3) continue;
        if (visCount / total > 0.75) { ctx.fillStyle = PAL.land; ctx.fill(); }
        ctx.strokeStyle = PAL.landLine; ctx.lineWidth = 0.8; ctx.stroke();
        stats.draws += 2;
      }
    }

    function drawArc(from, to, dashed, color, width, glow) {
      var rotDeg = rot * R2D;
      ctx.beginPath();
      var started = false, segs = Math.max(2, Math.ceil((to - from) * R2D / 2));
      for (var i = 0; i <= segs; i++) {
        var th = from + (to - from) * i / segs;
        var ll = routeAt(th);
        var p = project(ll[0], ll[1], R, rotDeg);
        if (!p.vis) { started = false; continue; }
        if (!started) { ctx.moveTo(cx + p.x, cy + p.y); started = true; }
        else ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.setLineDash(dashed ? [4, 4] : []);
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (glow) { ctx.shadowColor = 'rgba(224,168,60,.75)'; ctx.shadowBlur = 8; }
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.setLineDash([]);
      stats.draws++;
    }

    function drawStations(theta) {
      var rotDeg = rot * R2D;
      for (var i = 0; i < stations.length; i++) {
        var cum = Number(stations[i].cum_km);
        if (!isFinite(cum) || cum > EARTH_KM) continue;
        var th = arcAngle(cum);
        if (th > theta + 1e-6) { /* 未过站也画 */ }
        var ll = routeAt(th);
        var p = project(ll[0], ll[1], R, rotDeg);
        if (!p.vis) continue;
        var passed = cum <= km % EARTH_KM || (km > EARTH_KM && km % EARTH_KM === 0);
        var r = passed ? 2.1 : 1.7;
        ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, r, 0, TWO_PI);
        if (passed) { ctx.fillStyle = PAL.gold; ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(236,232,220,.55)'; ctx.lineWidth = 1; ctx.stroke(); }
      }
      stats.draws += 1;
    }

    function drawPerson(theta, t) {
      var ll = routeAt(theta);
      var p = project(ll[0], ll[1], R, rot * R2D);
      if (!p.vis) return;
      var scale = 0.45 + 0.75 * Math.pow(p.cosPhi, 0.6);
      var bob = Math.sin(t * 7.5) * 2 * scale;
      var x = cx + p.x, y = cy + p.y + bob;
      // 影子
      ctx.beginPath(); ctx.ellipse(x, cy + p.y + 7 * scale, 4.2 * scale, 1.5 * scale, 0, 0, TWO_PI);
      ctx.fillStyle = 'rgba(0,0,0,.30)'; ctx.fill();
      // 小人 6×10
      ctx.strokeStyle = PAL.you; ctx.fillStyle = PAL.you;
      ctx.lineWidth = Math.max(1, 1.2 * scale); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y - 6 * scale, 1.9 * scale, 0, TWO_PI); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - 4 * scale); ctx.lineTo(x, y + 1 * scale);
      var swing = Math.sin(t * 7.5) * 2.2 * scale;
      ctx.moveTo(x, y + 1 * scale); ctx.lineTo(x - 2.2 * scale + swing, y + 6 * scale);
      ctx.moveTo(x, y + 1 * scale); ctx.lineTo(x + 2.2 * scale - swing, y + 6 * scale);
      ctx.moveTo(x, y - 2 * scale); ctx.lineTo(x - 2.4 * scale, y + 1 * scale);
      ctx.moveTo(x, y - 2 * scale); ctx.lineTo(x + 2.4 * scale, y + 1 * scale);
      ctx.stroke();
      stats.draws += 3;
    }

    function frame(ts) {
      if (!alive) return;
      raf = 0;
      if (!last) last = ts;
      var dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (document.hidden && !reduced) { stats.hiddenSkip = (stats.hiddenSkip || 0) + 1; raf = G.requestAnimationFrame(frame); return; }
      if (!reduced && !power) rot = (rot + SPIN * dt) % (Math.PI * 2);
      phase += dt;
      stats.draws = 0; stats.points = 0;
      ctx.clearRect(0, 0, W, W);
      drawSphere();
      drawGrid();
      drawLand();
      var theta = arcAngle(km);
      if (histLaps > 0) {
        for (var h = 0; h < histLaps; h++) drawArc(0, TWO_PI, false, PAL.hist, 5, false);
      }
      drawArc(theta, TWO_PI, true, PAL.goldDim, 1.5, false);
      drawArc(0, theta, false, PAL.gold, 3, true);
      drawStations(theta);
      drawPerson(theta, phase);
      stats.frames++;
      stats.lastAt = ts;
      stats.fps = dt > 0 ? Math.round(1 / dt) : 0;
      if (reduced) { stats.static = true; return; }
      var gap = power ? 66 : 0;
      if (gap) setTimeout(function () { if (alive) raf = G.requestAnimationFrame(frame); }, gap);
      else raf = G.requestAnimationFrame(frame);
    }

    function start() { if (!raf && alive && !reduced) raf = G.requestAnimationFrame(frame); }
    function onVis() { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else start(); }
    document.addEventListener('visibilitychange', onVis);
    G.addEventListener('resize', function () { W = size(); R = Math.max(40, W / 2 - 6); cx = W / 2; cy = W / 2; grad = null; });

    loadLand().then(function (l) { stats.land = l ? l.length : 0; });
    if (reduced) frame(0); else { frame(0); }

    return {
      setKm: function (v) { km = Math.max(0, Number(v) || 0); histLaps = Math.min(3, Math.floor(km / EARTH_KM)); if (reduced) { phase = 0; frame(0); } },
      setReduced: function (v) { reduced = !!v; if (reduced) { if (raf) { cancelAnimationFrame(raf); raf = 0; } frame(0); } else start(); },
      stats: function () { return stats; },
      stationPoint: stationPoint,
      arcAngle: arcAngle,
      destroy: function () {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }

  return {
    EARTH_KM: EARTH_KM,
    ROUTE_STEP: ROUTE_STEP,
    route: ROUTE,
    project: project,
    arcAngle: arcAngle,
    arcPixels: arcPixels,
    routeAt: routeAt,
    stationPoint: stationPoint,
    loadLand: loadLand,
    mount: mount
  };
});
