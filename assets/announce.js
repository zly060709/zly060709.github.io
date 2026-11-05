/* Energy Ledger · 版本公告（静默失败，不阻塞首屏）
 *
 * 用法：首屏渲染完成后调用 checkVersion()，返回 new 时在奖励中心/顶部显示公告条 + 红点；
 * 用户点「知道了」-> markSeen()；点「稍后」-> snooze()（默认 24 小时后再提示）。
 * 断网、404、超时、JSON 损坏都只返回 {status:'silent'}，不抛异常、不弹窗。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ELAnnounce = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION_URL = './version.json';
  var TIMEOUT_MS = 5000;
  var SNOOZE_HOURS = 24;
  var STORAGE_KEYS = {
    seen: 'el.version.seen',
    snooze: 'el.version.snooze'
  };

  function getStorage(storage) {
    if (storage) return storage;
    try {
      return (typeof localStorage !== 'undefined') ? localStorage : null;
    } catch (e) {
      return null;
    }
  }

  function readJson(storage, key) {
    var s = getStorage(storage);
    if (!s) return null;
    try {
      var raw = s.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeJson(value, storage, key) {
    var s = getStorage(storage);
    if (!s) return false;
    try {
      s.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // '5.1.0' -> [5,1,0]；非数字段按 0 处理，避免脏数据抛错
  function parseVersion(v) {
    return String(v || '').split('.').map(function (p) {
      var n = parseInt(p, 10);
      return isFinite(n) ? n : 0;
    });
  }

  function compareVersions(a, b) {
    var pa = parseVersion(a), pb = parseVersion(b);
    var len = Math.max(pa.length, pb.length);
    for (var i = 0; i < len; i++) {
      var x = pa[i] || 0, y = pb[i] || 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  }

  function nowMs(now) {
    return now instanceof Date ? now.getTime() : (typeof now === 'number' ? now : Date.now());
  }

  // 超时包装：清掉内部定时器，避免页面/测试被悬挂 timer 拖住
  function raceWithTimeout(promise, ms) {
    var timer;
    var guard = new Promise(function (_, reject) {
      timer = setTimeout(function () { reject(new Error('timeout')); }, ms);
    });
    return Promise.race([promise, guard]).then(function (v) {
      clearTimeout(timer); return v;
    }, function (e) {
      clearTimeout(timer); throw e;
    });
  }

  function fetchJson(url, fetchImpl, now, timeoutMs) {
    var doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!doFetch) return Promise.reject(new Error('no-fetch'));

    // cache-busting：每次请求带时间戳，避免 CDN / 浏览器缓存旧版本
    var bust = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + now;
    var limit = timeoutMs || TIMEOUT_MS;
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, limit);

    var opts = { cache: 'no-store', credentials: 'omit' };
    if (controller) opts.signal = controller.signal;

    var req = Promise.resolve(doFetch(bust, opts)).then(function (res) {
      if (!res || !res.ok) throw new Error('http-' + (res ? res.status : 'unknown'));
      return res.json();
    });

    return raceWithTimeout(req, limit + 50).then(function (data) {
      clearTimeout(timer);
      return data;
    }).catch(function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  function validate(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.version !== 'string' || !data.version) return false;
    if (!Array.isArray(data.notes)) return false;
    return true;
  }

  /**
   * @param {Object} [options] {url, fetchImpl, storage, now, appVersion, timeoutMs}
   * @returns {Promise<Object>}
   *   {status:'new', data, forceUpgrade, seenVersion, message}
   *   {status:'none', reason:'seen'|'snoozed'|'not-newer'|'invalid'}
   *   {status:'silent', reason:'network'|'timeout'|'parse'|'no-fetch'}
   */
  function checkVersion(options) {
    var o = options || {};
    var now = nowMs(o.now);
    var url = o.url || VERSION_URL;

    return fetchJson(url, o.fetchImpl, now, o.timeoutMs).then(function (data) {
      if (!validate(data)) {
        return { status: 'silent', reason: 'invalid' };
      }

      var seen = readJson(o.storage, STORAGE_KEYS.seen);
      var seenVersion = null;
      if (seen && typeof seen === 'object') seenVersion = seen.version;
      else if (typeof seen === 'string') seenVersion = seen;

      /* 语义版本比较：低于/等于当前客户端版本的公告不再弹出（除非确实需要强制升级） */
      var forceUpgrade = false;
      if (o.appVersion && data.minClient) {
        forceUpgrade = compareVersions(o.appVersion, data.minClient) < 0;
      }
      if (!forceUpgrade && o.appVersion && compareVersions(data.version, o.appVersion) <= 0) {
        return { status: 'none', reason: 'not-newer', data: data };
      }

      if (seenVersion && seenVersion === data.version) {
        return { status: 'none', reason: 'seen', data: data };
      }
      if (seenVersion && compareVersions(data.version, seenVersion) <= 0) {
        return { status: 'none', reason: 'not-newer', data: data };
      }

      var snoozed = readJson(o.storage, STORAGE_KEYS.snooze);
      if (snoozed && snoozed.version === data.version && typeof snoozed.until === 'number' && now < snoozed.until) {
        return {
          status: 'none', reason: 'snoozed', data: data,
          snoozeUntil: new Date(snoozed.until).toISOString()
        };
      }

      return {
        status: 'new',
        data: data,
        seenVersion: seenVersion,
        forceUpgrade: forceUpgrade,
        message: forceUpgrade
          ? '当前客户端 v' + o.appVersion + ' 低于最低版本 v' + data.minClient + '，建议先更新再使用。'
          : '有新版本 v' + data.version + ' 可用。'
      };
    }).catch(function (e) {
      var reason = 'network';
      if (e && e.message === 'timeout') reason = 'timeout';
      if (e && e.message === 'no-fetch') reason = 'no-fetch';
      return { status: 'silent', reason: reason };
    });
  }

  // 「知道了」：同一版本不再提示
  function markSeen(version, options) {
    var o = options || {};
    var now = nowMs(o.now);
    return writeJson({ version: version, at: new Date(now).toISOString() }, o.storage, STORAGE_KEYS.seen);
  }

  // 「稍后」：默认 24 小时内不再提示，之后仍会提示同一版本
  function snooze(version, options) {
    var o = options || {};
    var now = nowMs(o.now);
    var hours = typeof o.hours === 'number' ? o.hours : SNOOZE_HOURS;
    var until = now + hours * 3600 * 1000;
    var ok = writeJson({ version: version, until: until }, o.storage, STORAGE_KEYS.snooze);
    return { ok: ok, until: new Date(until).toISOString() };
  }

  function clearSeen(options) {
    var s = getStorage((options || {}).storage);
    if (!s) return false;
    try { s.removeItem(STORAGE_KEYS.seen); s.removeItem(STORAGE_KEYS.snooze); return true; }
    catch (e) { return false; }
  }

  return {
    VERSION_URL: VERSION_URL,
    STORAGE_KEYS: STORAGE_KEYS,
    SNOOZE_HOURS: SNOOZE_HOURS,
    checkVersion: checkVersion,
    markSeen: markSeen,
    snooze: snooze,
    clearSeen: clearSeen,
    compareVersions: compareVersions,
    parseVersion: parseVersion
  };
});
