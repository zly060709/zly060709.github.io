/* ============================================================
   Energy Ledger · GPX / TCX 导入解析（纯函数，无 DOM 之外的依赖）
   ------------------------------------------------------------
   Gpx.parse(text, fileName) → {
     ok, error?, kind:'gpx'|'tcx', name, points, minutes, distanceKm,
     ascentM, movingRatio, avgPace, avgSpeedKmh, suspect, reason, type
   }
   判定口径：
     - 相邻采样点按时间戳与经纬度算速度；速度 < 0.8 m/s 记为静止点
     - 静止点占比 > 60%（即移动占比 < 40%）→ suspect
     - 平均配速快于 3:00/km → suspect
   说明：只做文件结构与位移合理性检查，无法核验文件真伪，也无法识别
   把手机绑在车上之类的"非人运动"。suspect 只用于"不计里程"，不是鉴伪。
   ============================================================ */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Gpx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var R = 6371;
  function rad(d) { return d * Math.PI / 180; }
  function hav(a, b) {
    var dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function timeOf(s) {
    if (!s) return null;
    var t = Date.parse(s);
    return isFinite(t) ? t : null;
  }
  function collect(doc, tag) {
    var out = [];
    var nodes = doc.getElementsByTagName('*');
    for (var i = 0; i < nodes.length; i++) {
      var nm = (nodes[i].localName || nodes[i].nodeName || '').toLowerCase();
      if (nm === tag) out.push(nodes[i]);
    }
    return out;
  }
  function child(node, name) {
    var els = node.getElementsByTagName('*');
    for (var i = 0; i < els.length; i++) {
      var nm = (els[i].localName || els[i].nodeName || '').toLowerCase();
      if (nm === name) return els[i];
    }
    return null;
  }
  function textOf(el) { return el ? String(el.textContent || '').trim() : ''; }

  function parseGpx(doc) {
    var pts = collect(doc, 'trkpt').concat(collect(doc, 'wpt'));
    var samples = pts.map(function (p) {
      const lat = num(p.getAttribute('lat')), lon = num(p.getAttribute('lon'));
      if (lat === null || lon === null) return null;
      return { lat: lat, lon: lon, t: timeOf(textOf(child(p, 'time')), 0), ele: num(textOf(child(p, 'ele'))) };
    }).filter(Boolean);
    return samples;
  }
  function parseTcx(doc) {
    var tps = collect(doc, 'trackpoint');
    return tps.map(function (p) {
      var latEl = child(p, 'latitudeDegrees'), lonEl = child(p, 'longitudeDegrees');
      var t = timeOf(textOf(child(p, 'time')));
      return {
        lat: num(textOf(latEl)), lon: num(textOf(lonEl)), t: t,
        ele: num(textOf(child(p, 'altitudeMeters'))),
        dist: num(textOf(child(p, 'distanceMeters')))
      };
    }).filter(function (s) { return s.t != null && s.lat != null && s.lon != null; });
  }

  function typeOf(avgSpeed, ascent) {
    if (ascent >= 300 && avgSpeed < 9) return 'hike';
    if (avgSpeed >= 20) return 'bike';
    if (avgSpeed >= 8) return 'run';
    return 'walk';
  }

  function parse(text, name) {
    if (!text || !text.trim()) return { ok: false, error: '文件是空的' };
    if (typeof DOMParser === 'undefined') return { ok: false, error: '当前环境不支持 XML 解析' };
    var doc;
    try { doc = new DOMParser().parseFromString(text, 'text/xml'); } catch (e) { return { ok: false, error: 'XML 解析失败' }; }
    if (!doc || !doc.documentElement) return { ok: false, error: '不是有效的 XML' };
    var rootName = (doc.documentElement.localName || doc.documentElement.nodeName || '').toLowerCase();
    var errEl = doc.getElementsByTagName('parsererror');
    if (errEl && errEl.length) return { ok: false, error: 'XML 语法错误：文件可能被截断或不是 GPX/TCX' };
    if (rootName !== 'gpx' && rootName !== 'trainingcenterdatabase') {
      return { ok: false, error: '不认识的根节点 <' + rootName + '>，只支持 GPX / TCX' };
    }
    var samples = rootName === 'gpx' ? parseGpx(doc) : parseTcx(doc);
    // 过滤掉没有时间戳的点后再做位移判断
    var timed = samples.filter(function (s) { return s.t != null; });
    if (timed.length < 2) return { ok: false, error: '有效采样点少于 2 个（需要带时间戳的轨迹点）' };
    var total = 0, movingD = 0, ascent = 0, prevEle = null, movingPairs = 0, pairs = 0, maxJump = 0;
    var t0 = timed[0].t, t1 = timed[timed.length - 1].t;
    for (var i = 1; i < timed.length; i++) {
      var a = timed[i - 1], b = timed[i];
      var dt = (b.t - a.t) / 1000;
      var d = hav([a.lat, a.lon], [b.lat, b.lon]);
      if (dt <= 0) continue;
      if (d > 30) continue; // 明显跳点（跨城/信号漂移），不计入距离
      total += d;
      pairs++;
      if (d / dt >= 0.0008) { movingD += d; movingPairs++; } // ≥0.8 m/s 视为移动
      maxJump = Math.max(maxJump, d);
      if (b.ele != null) {
        if (prevEle == null) prevEle = b.ele;
        var dEle = b.ele - prevEle;
        if (dEle > 3) ascent += dEle;
        prevEle = b.ele;
      }
    }
    if (pairs < 2) return { ok: false, error: '有效轨迹段不足，无法计算时长与距离' };
    var minutes = Math.max(1, Math.round((t1 - t0) / 60000));
    var distanceKm = total;
    var movingRatio = pairs ? movingD / Math.max(0.0001, total) : 0;
    var hours = (t1 - t0) / 3600000;
    var avgSpeed = hours > 0 ? distanceKm / hours : 0;
    var avgPace = distanceKm > 0 ? (minutes / distanceKm) : 0;
    var reason = [];
    var suspect = false;
    // 静止点占比 > 60% ⇔ 移动距离占比 < 40%（以位移而不是点数为分母，避免采样密度影响）
    if (movingRatio < 0.4) { suspect = true; reason.push('静止点占比 ' + Math.round((1 - movingRatio) * 100) + '%（> 60%），判定存疑'); }
    if (avgPace > 0 && avgPace < 3) { suspect = true; reason.push('平均配速 ' + avgPace.toFixed(1) + ' 分/km 快于 3:00/km'); }
    if (avgSpeed > 60) { suspect = true; reason.push('平均速度 ' + avgSpeed.toFixed(0) + ' km/h 超出人力范围'); }
    return {
      ok: true, kind: rootName === 'gpx' ? 'gpx' : 'tcx', name: name || '',
      points: timed.length, minutes: minutes, distanceKm: distanceKm,
      ascentM: ascent, movingRatio: movingRatio, avgPace: avgPace, avgSpeedKmh: avgSpeed,
      suspect: suspect, reason: reason.join('；'), type: typeOf(avgSpeed, ascent),
      maxJumpKm: maxJump
    };
  }

  return { parse: parse, haversineKm: hav };
});
