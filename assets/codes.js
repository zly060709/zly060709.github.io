/* Energy Ledger · 兑换码校验模块（零依赖、浏览器/Node/Bun 通用）
 *
 * 安全上限（必须先读）：
 *   secret 内置在前端，任何人打开 DevTools 都能拿到，也能离线复刻整套算法。
 *   因此本模块能防：手误输错、随手改一位、贴错码；防不了：逆向 App 后批量造码。
 *   真正的防伪要靠服务端签发/核销（见 README「升级路径」）。
 *
 * 码结构（12 位，字母表 31 字符，固定 4-4-4 分组）：
 *   [0]      版本位（v1 -> '3'）
 *   [1]      刮刮卡张数 tickets（0..30）
 *   [2]      扭蛋币个数 coins（0..30）
 *   [3][4]   有效期月索引（自 2025-01 起的月数，0..960，月末 23:59:59.999Z 到期）
 *   [5..8]   随机序列号（4 位）
 *   [9..11]  HMAC-SHA256 截断校验位（3 位，1/29791 随机命中）
 *
 * 字母表剔除 0 O 1 I L，避免手抄混淆。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ELCodes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------- 常量 ---------------- */

  var ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 字符，无 0/1/I/L/O
  var SECRET = 'EL5::codes::2026::v1::d3adb33f';    // 前端可见，见文件头说明
  var CODE_VERSION = 1;

  var RAW_LEN = 12;
  var CHECK_LEN = 3;
  var BASE = 31;
  var ALPHABET_LEN = ALPHABET.length; // 31
  var CHECK_MOD = 29791;              // 31^3

  var EXPIRY_BASE_YEAR = 2025;
  var EXPIRY_MAX_INDEX = 960;         // 2025-01 .. 2105-01

  var LIMIT_MAX = 5;
  var LIMIT_WINDOW_MS = 60 * 1000;

  // 独立存储键，绝不写入账本主数据（避免污染备份/导出）
  var STORAGE_KEYS = {
    used: 'el.codes.used',
    revoked: 'el.codes.revoked',
    attempts: 'el.codes.attempts'
  };

  var REASONS = {
    OK: 'OK',
    FORMAT: 'FORMAT',
    CHECK: 'CHECK',
    USED: 'USED',
    REVOKED: 'REVOKED',
    EXPIRED: 'EXPIRED',
    RATE_LIMIT: 'RATE_LIMIT'
  };

  var MESSAGES = {
    OK: '兑换成功',
    FORMAT_EMPTY: '请输入兑换码。',
    FORMAT_LEN: '兑换码应为 12 位（不含空格和短横线），当前是 {n} 位。',
    FORMAT_CHARS: '兑换码含有不可用字符「{chars}」。为避免混淆，码里不含 0、1、I、L、O。',
    FORMAT_VERSION: '这个兑换码来自其他版本（v{ver}），当前客户端只支持 v1。',
    FORMAT_FIELD: '兑换码的面额/有效期字段无效，可能被改动过。',
    CHECK: '兑换码校验失败：可能输错了一位，或码被改过。',
    USED: '这个兑换码已在本机兑换过，同一台设备不能重复使用。',
    EXPIRED: '这个兑换码已于 {date} 到期。',
    REVOKED: '这个兑换码已下架，无法兑换。',
    RATE_LIMIT: '尝试次数过多，请 {sec} 秒后再试。'
  };

  var sha256K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  /* ---------------- 编码工具 ---------------- */

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else if (c >= 0xd800 && c <= 0xdbff) {
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    return new Uint8Array(out);
  }

  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256Bytes(msg) {
    var H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    var len = msg.length;
    var paddedLen = (((len + 9 + 63) >> 6) << 6);
    var padded = new Uint8Array(paddedLen);
    padded.set(msg);
    padded[len] = 0x80;
    var view = new DataView(padded.buffer);
    var bitsHi = Math.floor((len * 8) / 4294967296);
    var bitsLo = (len * 8) % 4294967296;
    view.setUint32(paddedLen - 8, bitsHi);
    view.setUint32(paddedLen - 4, bitsLo);

    var w = new Uint32Array(64);
    for (var off = 0; off < paddedLen; off += 64) {
      var t;
      for (t = 0; t < 16; t++) w[t] = view.getUint32(off + t * 4);
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + sha256K[t] + w[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var out = new Uint8Array(32);
    var ov = new DataView(out.buffer);
    for (var i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]);
    return out;
  }

  function concatBytes(a, b) {
    var out = new Uint8Array(a.length + b.length);
    out.set(a); out.set(b, a.length);
    return out;
  }

  function hmacSha256(keyBytes, msgBytes) {
    var key = keyBytes;
    if (key.length > 64) key = sha256Bytes(key);
    var k = new Uint8Array(64);
    k.set(key);
    var ipad = new Uint8Array(64), opad = new Uint8Array(64);
    for (var i = 0; i < 64; i++) { ipad[i] = k[i] ^ 0x36; opad[i] = k[i] ^ 0x5c; }
    var inner = sha256Bytes(concatBytes(ipad, msgBytes));
    return sha256Bytes(concatBytes(opad, inner));
  }

  function toHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
    return s;
  }

  /* ---------------- 码位工具 ---------------- */

  function indexOfChar(ch) { return ALPHABET.indexOf(ch); }

  function encodeBase31(value, len) {
    var out = '';
    for (var i = len - 1; i >= 0; i--) {
      out = ALPHABET[value % BASE] + out;
      value = Math.floor(value / BASE);
    }
    return out;
  }

  // 规范化：大小写、全角、空格、短横线都能容错；不做 0->O 之类猜测，避免作弊码误判
  function normalizeCode(input) {
    if (typeof input !== 'string') return '';
    var s = input;
    if (typeof s.normalize === 'function') s = s.normalize('NFKC');
    s = s.replace(/[\s\u00a0\u200b\u200c\u200d\ufeff]/g, '').replace(/[-–—]/g, '');
    return s.toUpperCase();
  }

  function formatCode(raw) {
    var s = normalizeCode(raw);
    if (s.length !== RAW_LEN) return s;
    return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
  }

  // 校验位：HMAC-SHA256(secret, "EL1:" + payload9)，取前 8 字节转整数后模 31^3
  function computeCheck(payload) {
    var mac = hmacSha256(utf8Bytes(SECRET), utf8Bytes('EL1:' + payload));
    var v = 0n;
    for (var i = 0; i < 8; i++) v = (v << 8n) | BigInt(mac[i]);
    return encodeBase31(Number(v % 29791n), CHECK_LEN);
  }

  function computePayload(version, tickets, coins, expiryIndex, serial) {
    return ALPHABET[version] + ALPHABET[tickets] + ALPHABET[coins] +
      encodeBase31(expiryIndex, 2) + serial;
  }

  // 用于「已用记录」「作废名单」的键：规范化后整码的 sha256
  function hashCode(code) {
    return toHex(sha256Bytes(utf8Bytes(normalizeCode(code))));
  }

  /* ---------------- 工具函数 ---------------- */

  function toHashSet(input) {
    var set = new Set();
    if (!input) return set;
    if (Array.isArray(input)) {
      for (var i = 0; i < input.length; i++) if (typeof input[i] === 'string') set.add(input[i].toLowerCase());
    } else if (typeof input === 'object') {
      Object.keys(input).forEach(function (k) { set.add(k.toLowerCase()); });
    }
    return set;
  }

  function sanitizeAttempts(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i] === 'number' && isFinite(list[i])) out.push(list[i]);
    }
    return out.slice(-200);
  }

  function pruneAttempts(list, now, windowMs) {
    var win = windowMs || LIMIT_WINDOW_MS;
    return sanitizeAttempts(list).filter(function (ts) { return now - ts < win; });
  }

  // 限流：窗口内最多 5 次；返回是否放行与需等待秒数
  function checkRateLimit(attempts, now, options) {
    var opt = options || {};
    var max = opt.max || LIMIT_MAX;
    var win = opt.windowMs || LIMIT_WINDOW_MS;
    var kept = pruneAttempts(attempts, now, win);
    if (kept.length >= max) {
      var oldest = Math.min.apply(null, kept);
      var waitMs = Math.max(0, oldest + win - now);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)), attempts: kept };
    }
    return { allowed: true, retryAfterSec: 0, attempts: kept };
  }

  function expiryToMs(index) {
    var year = EXPIRY_BASE_YEAR + Math.floor(index / 12);
    var month = (index % 12); // 0-based
    // 下个月 1 日 00:00:00.000Z 的前 1ms = 本月最后 1ms
    return Date.UTC(year, month + 1, 1) - 1;
  }

  function isoDate(ms) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  function rewardText(tickets, coins) {
    var parts = [];
    if (tickets > 0) parts.push(tickets + ' 张刮刮卡');
    if (coins > 0) parts.push(coins + ' 枚扭蛋币');
    return parts.join(' + ');
  }

  function fail(reason, message, extra) {
    var base = {
      ok: false,
      reason: reason,
      message: message,
      recordAttempt: true
    };
    if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }

  /* ---------------- 主函数 ---------------- */

  /**
   * 纯函数校验（不改外部状态，限流状态由调用方持有并回写）。
   * @param {string} raw 用户输入的兑换码（允许空格/短横线/小写/全角）
   * @param {Object} [opts]
   * @param {Array|Object} [opts.usedHashes] 本机已用哈希（数组或对象键）
   * @param {Array|Object} [opts.revokedHashes] 作废名单哈希
   * @param {number|Date} [opts.now] 当前时间
   * @param {Array<number>} [opts.attempts] 近期尝试时间戳
   * @param {string} [opts.secret] 覆盖默认 secret（仅测试/自定义批次用）
   * @param {{max:number,windowMs:number}} [opts.rateLimit]
   * @returns {Object} 结果对象，见 README「返回值」
   */
  function verifyCode(raw, opts) {
    var o = opts || {};
    var now = o.now instanceof Date ? o.now.getTime() : (typeof o.now === 'number' ? o.now : Date.now());
    var secret = typeof o.secret === 'string' && o.secret ? o.secret : SECRET;

    var rate = checkRateLimit(o.attempts, now, o.rateLimit);
    if (!rate.allowed) {
      return {
        ok: false,
        reason: REASONS.RATE_LIMIT,
        message: MESSAGES.RATE_LIMIT.replace('{sec}', rate.retryAfterSec),
        retryAfterSec: rate.retryAfterSec,
        recordAttempt: false,
        attempts: rate.attempts
      };
    }

    var attemptsNext = rate.attempts.concat([now]);

    // 1) 格式
    var s = normalizeCode(raw);
    if (s.length === 0) {
      return fail(REASONS.FORMAT, MESSAGES.FORMAT_EMPTY, { attempts: attemptsNext, hash: null });
    }

    var bad = [];
    for (var i = 0; i < s.length; i++) {
      if (ALPHABET.indexOf(s[i]) < 0 && bad.indexOf(s[i]) < 0) bad.push(s[i]);
    }
    if (bad.length > 0) {
      return fail(REASONS.FORMAT, MESSAGES.FORMAT_CHARS.replace('{chars}', bad.join('、')),
        { attempts: attemptsNext, invalidChars: bad, hash: null });
    }
    if (s.length !== RAW_LEN) {
      return fail(REASONS.FORMAT, MESSAGES.FORMAT_LEN.replace('{n}', s.length),
        { attempts: attemptsNext, hash: null });
    }

    var payload = s.slice(0, RAW_LEN - CHECK_LEN);
    var normalized = s;
    var displayed = formatCode(s);
    var hash = hashCode(s);

    // 2) 校验位（先算，失败即可提前退出）
    var expected = computeCheckWithSecret(payload, secret);
    if (s.slice(RAW_LEN - CHECK_LEN) !== expected) {
      return fail(REASONS.CHECK, MESSAGES.CHECK, {
        attempts: attemptsNext, code: displayed, hash: hash
      });
    }

    // 3) 结构字段
    var versionIdx = indexOfChar(s[0]);
    if (versionIdx !== CODE_VERSION) {
      return fail(REASONS.FORMAT, MESSAGES.FORMAT_VERSION.replace('{ver}', versionIdx), {
        attempts: attemptsNext, code: displayed, hash: hash
      });
    }

    var tickets = indexOfChar(s[1]);
    var coins = indexOfChar(s[2]);
    var expiryIndex = indexOfChar(s[3]) * BASE + indexOfChar(s[4]);

    if (tickets < 0 || coins < 0 || expiryIndex > EXPIRY_MAX_INDEX || (tickets === 0 && coins === 0)) {
      return fail(REASONS.FORMAT, MESSAGES.FORMAT_FIELD, {
        attempts: attemptsNext, code: displayed, hash: hash
      });
    }

    var expiresAt = expiryToMs(expiryIndex);
    var serial = s.slice(5, 9);

    // 4) 作废名单
    if (toHashSet(o.revokedHashes).has(hash)) {
      return fail(REASONS.REVOKED, MESSAGES.REVOKED, {
        attempts: attemptsNext, code: displayed, hash: hash
      });
    }

    // 5) 本机已用
    if (toHashSet(o.usedHashes).has(hash)) {
      return fail(REASONS.USED, MESSAGES.USED, {
        attempts: attemptsNext, code: displayed, hash: hash
      });
    }

    // 6) 有效期
    if (now > expiresAt) {
      return fail(REASONS.EXPIRED, MESSAGES.EXPIRED.replace('{date}', isoDate(expiresAt)), {
        attempts: attemptsNext, code: displayed, hash: hash
      });
    }

    return {
      ok: true,
      reason: REASONS.OK,
      message: MESSAGES.OK + '：' + rewardText(tickets, coins),
      reward: { tickets: tickets, coins: coins },
      code: displayed,
      hash: hash,
      serial: serial,
      version: versionIdx,
      expiresAt: new Date(expiresAt).toISOString(),
      attempts: attemptsNext,
      recordAttempt: true
    };
  }

  // 供测试/自定义 secret 使用；默认走 SECRET
  function computeCheckWithSecret(payload, secret) {
    var key = secret || SECRET;
    if (key === SECRET) return computeCheck(payload);
    var mac = hmacSha256(utf8Bytes(key), utf8Bytes('EL1:' + payload));
    var v = 0n;
    for (var i = 0; i < 8; i++) v = (v << 8n) | BigInt(mac[i]);
    return encodeBase31(Number(v % 29791n), CHECK_LEN);
  }

  return {
    verifyCode: verifyCode,
    checkRateLimit: checkRateLimit,
    parseCode: function (raw) {
      var s = normalizeCode(raw);
      return {
        normalized: s,
        formatted: formatCode(s),
        version: indexOfChar(s[0]),
        tickets: indexOfChar(s[1]),
        coins: indexOfChar(s[2]),
        expiryIndex: indexOfChar(s[3]) * BASE + indexOfChar(s[4]),
        serial: s.slice(5, 9),
        check: s.slice(9, 12),
        expectedCheck: computeCheck(s.slice(0, 9)),
        hash: hashCode(s)
      };
    },
    hashCode: hashCode,
    normalizeCode: normalizeCode,
    formatCode: formatCode,
    computeCheck: computeCheck,
    encodeBase31: encodeBase31,
    ALPHABET: ALPHABET,
    SECRET: SECRET,
    CODE_VERSION: CODE_VERSION,
    CODE_LENGTH: RAW_LEN,
    STORAGE_KEYS: STORAGE_KEYS,
    REASONS: REASONS,
    MESSAGES: MESSAGES,
    RATE_LIMIT: { max: LIMIT_MAX, windowMs: LIMIT_WINDOW_MS },
    EXPIRY_BASE_YEAR: EXPIRY_BASE_YEAR
  };
});
