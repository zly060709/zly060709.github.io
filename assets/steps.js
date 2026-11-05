/* ============================================================
   Energy Ledger · 计步峰值检测（L2 估算，纯函数）
   ------------------------------------------------------------
   输入是加速度模长（m/s²，含重力）与时间戳（ms）。
   做法：慢速基线 EMA 去重力 → 高通残差 → 阈值 + 不应期 + 步频合理性。
   已知限制：屏幕熄灭后浏览器会停发 devicemotion；晃手机、坐车颠簸会误判。
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Steps = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEF = {
    threshold: 0.32,     // 高通残差阈值（g 量级）
    refractory: 260,     // 两次落步最小间隔（ms）≈ 3.8 步/秒
    ema: 0.88,           // 基线平滑系数
    cadenceMin: 0.9,     // 低于 0.9 步/秒不算步频合理
    cadenceMax: 3.6
  };

  function detector(opts) {
    var o = Object.assign({}, DEF, opts || {});
    var base = null, lastStep = 0, lastGap = 0, steps = 0, firstAt = 0, lastAt = 0;
    function feed(mag, t) {
      if (!isFinite(mag) || !isFinite(t)) return false;
      if (base === null) { base = mag; firstAt = t; return false; }
      base = base * o.ema + mag * (1 - o.ema);
      var hp = mag - base;
      var gap = t - lastStep;
      if (hp > o.threshold && gap > o.refractory) {
        if (lastGap && (1000 / lastGap) > o.cadenceMax) { lastStep = t; return false; }
        lastGap = gap; lastStep = t; lastAt = t; steps++;
        return true;
      }
      return false;
    }
    feed.stats = function () {
      return { steps: steps, startedAt: firstAt, lastAt: lastAt, cadence: lastGap ? 1000 / lastGap : 0 };
    };
    return feed;
  }

  /* 离线套用：samples = [{t, a}] → {steps, cadence, durationS} */
  function count(samples, opts) {
    var det = detector(opts);
    var steps = 0, t0 = 0, t1 = 0;
    (samples || []).forEach(function (s) {
      if (!s || !isFinite(s.a)) return;
      if (!t0) t0 = s.t;
      t1 = s.t;
      if (det(s.a, s.t)) steps++;
    });
    var dur = t0 && t1 > t0 ? (t1 - t0) / 1000 : 0;
    return { steps: steps, cadence: dur > 0 ? steps / dur : 0, durationS: Math.round(dur) };
  }

  return { detector: detector, count: count, DEFAULT: DEF };
});
