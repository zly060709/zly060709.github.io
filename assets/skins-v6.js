/* skins-v6.js · v5.4 机制型皮肤运行时（g26–g35）+ 移动 DNA 通道
   职责五件事（无框架，零图片，零 canvas）：
   1) v6 皮肤激活时写 data-skin-v6 / data-skin-mat / data-skin-arch / data-skin-sig；
   2) 把账本数据（fxDataContext 快照）写进根节点 CSS 变量与 data-*，驱动数据锚点；
   3) 渲染 #skinStage 里的皮肤组件（票根/抽屉/磁带/LCD/晶体/印章/线路/豆子/磁贴）；
   4) 触屏等价：卡片涟漪、抽屉点开、磁带翻面、磁贴拖拽（位置 localStorage 持久化）；
   5) Frame 通道：按皮肤 token 动态生成 manifest（PWA 状态栏/启动画面跟皮肤走）。
   约束：不改业务逻辑；reduced-motion / 省电档只关动效不关形状锚点。 */
(function () {
  'use strict';

  var V6 = ['g26', 'g27', 'g28', 'g29', 'g30', 'g31', 'g32', 'g33', 'g34', 'g35'];
  /* 每套的三通道取值（与 work/defs/gXX.json 一致，内联省一次请求） */
  var CH = {
    g26: { mat: 'paper', arch: 'ticket',    sig: 'tearoff' },
    g27: { mat: 'wood',  arch: 'drawer',    sig: 'drawer' },
    g28: { mat: 'metal', arch: 'cassette',  sig: 'reel' },
    g29: { mat: 'metal', arch: 'lcd',       sig: 'flip' },
    g30: { mat: 'paper', arch: 'fold',      sig: 'unfold' },
    g31: { mat: 'glass', arch: 'flask',     sig: 'crystallize' },
    g32: { mat: 'paper', arch: 'stampgrid', sig: 'press' },
    g33: { mat: 'metal', arch: 'route',     sig: 'transit' },
    g34: { mat: 'glass', arch: 'jar',       sig: 'drop' },
    g35: { mat: 'metal', arch: 'board',     sig: 'pin' }
  };
  var CABS = ['早', '午', '晚', '点', '水', '果', '零', '运动', '称重', '加', '夜', '补'];
  var STATION_LABELS = ['早餐', '午餐', '晚餐', '终点'];
  var MAGNET_COLORS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'];
  var MAGNET_KEY = 'energy-ledger.v2/skin.g35.magnets';
  var state = { id: '', sig: '', count: -1, streak: -1, side: 'a', pressed: null };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function active() { return root.getAttribute('data-skin') || ''; }
  function isV6(id) { return V6.indexOf(id) >= 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------------- Frame 通道：动态 manifest ---------------- */
  var lastManifestSkin = '';
  function swapManifest(id) {
    if (!isV6(id) || id === lastManifestSkin) return;
    var link = document.querySelector('link[rel="manifest"]');
    if (!link || !URL || !URL.createObjectURL) return;
    var cs = getComputedStyle(root);
    var paper = (cs.getPropertyValue('--paper') || '').trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(paper)) return;
    fetch('manifest.webmanifest', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (!m) return;
        m.theme_color = paper;
        m.background_color = paper;
        var blob = new Blob([JSON.stringify(m)], { type: 'application/manifest+json' });
        link.setAttribute('href', URL.createObjectURL(blob));
        lastManifestSkin = id;
      })
      .catch(function () { /* 离线时保持原 manifest，不报错 */ });
  }

  /* ---------------- 数据写入（数据锚点） ---------------- */
  function writeData(d) {
    d = d || {};
    var count = Number(d.count) || 0;
    var streak = Number(d.streak) || 0;
    var left = (d.left == null || !isFinite(d.left)) ? null : Math.round(d.left);
    var budget = (d.budget == null || !isFinite(d.budget)) ? 0 : Math.max(1, Math.round(d.budget));
    var progress = clamp((budget - (left == null ? 0 : left)) / budget, 0, 1);
    var leftRatio = (left == null) ? .5 : clamp(left / budget, 0, 1);
    root.style.setProperty('--sk-count', String(count));
    root.style.setProperty('--sk-streak', String(streak));
    root.style.setProperty('--sk-progress', progress.toFixed(4));
    root.style.setProperty('--sk-left-ratio', leftRatio.toFixed(4));
    root.setAttribute('data-sk-recorded', count > 0 ? '1' : '0');
    root.setAttribute('data-sk-over', (left != null && left < 0) ? '1' : '0');
    return { count: count, streak: streak, left: left, progress: progress, leftRatio: leftRatio,
             items: d.items || [], recorded: count > 0, over: left != null && left < 0 };
  }

  /* ---------------- 七段数码渲染（g29） ---------------- */
  var SEG_PTS = (function () {
    /* 18×30 字框内 7 段多边形；A顶 B右上 C右下 D底 E左下 F左上 G中 */
    var w = 18, h = 30, t = 3.2, g = 1.1;  // t=段厚 g=段间隙
    function hp(y, x1, x2) { return [[x1 + t / 2 + g, y], [x1 + t + g, y - t / 2], [x2 - t - g, y - t / 2], [x2 - t / 2 - g, y], [x2 - t - g, y + t / 2], [x1 + t + g, y + t / 2]]; }
    function vp(x, y1, y2) { return [[x, y1 + t / 2 + g], [x + t / 2, y1 + t + g], [x + t / 2, y2 - t - g], [x, y2 - t / 2 - g], [x - t / 2, y2 - t - g], [x - t / 2, y1 + t + g]]; }
    return {
      A: hp(t / 2 + 1, 1, w - 1), G: hp(h / 2, 1.5, w - 1.5), D: hp(h - t / 2 - 1, 1, w - 1),
      B: vp(w - t / 2 - 1, 1, h / 2), C: vp(w - t / 2 - 1, h / 2, h - 1),
      F: vp(t / 2 + 1, 1, h / 2), E: vp(t / 2 + 1, h / 2, h - 1)
    };
  })();
  var SEG_MAP = { '0': 'ABCDEF', '1': 'BC', '2': 'ABGED', '3': 'ABGCD', '4': 'FGBC', '5': 'AFGCD', '6': 'AFGECD', '7': 'ABC', '8': 'ABCDEFG', '9': 'ABCDFG', '-': 'G', ' ': '' };
  function polyPts(pts, dx, dy, s) {
    return pts.map(function (p) { return (dx + p[0] * s).toFixed(1) + ',' + (dy + p[1] * s).toFixed(1); }).join(' ');
  }
  function sevenSegSVG(valueStr, boxW, boxH) {
    var n = valueStr.length;
    var dw = 18, dh = 30, gap = 6;
    var scale = Math.min(1, (boxH - 4) / dh);
    var totalW = n * (dw * scale + gap) - gap;
    var startX = Math.max(2, (boxW - totalW) / 2);
    var dy = (boxH - dh * scale) / 2;
    var out = '';
    for (var i = 0; i < n; i++) {
      var on = SEG_MAP[valueStr.charAt(i)] || '';
      var dx = startX + i * (dw * scale + gap);
      Object.keys(SEG_PTS).forEach(function (k) {
        var cls = on.indexOf(k) >= 0 ? '' : ' class="seg-off"';
        out += '<polygon' + cls + ' points="' + polyPts(SEG_PTS[k], dx, dy, scale) + '"/>';
      });
    }
    return out;
  }

  /* ---------------- 各皮肤舞台组件渲染 ---------------- */
  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mStorage() {
    try { return JSON.parse(localStorage.getItem(MAGNET_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  var RENDER = {
    /* g26 票根串：记录数 → 票根（最多 8 张，多的并进计数） */
    g26: function (box, d) {
      var n = Math.min(d.count, 8);
      var html = '<div class="stub-strip">';
      for (var i = 0; i < n; i++) {
        html += '<div class="stub' + (reduced ? '' : ' tear') + '" style="--i:' + i + ';--rot:' + (i % 2 ? 1 : -1) * (0.6 + i * .25) + 'deg">'
          + '<i></i><i></i><b>' + String(41 + i).padStart(4, '0') + '</b></div>';
      }
      html += '</div><div class="stub-count">已撕 ' + d.count + '</div>';
      box.innerHTML = html;
      if (!reduced) {
        var last = box.querySelector('.stub:last-of-type');
        if (last && state.count >= 0 && d.count > state.count) {
          /* 新票根播放撕页动画；首渲染不播（避免每次进页都动） */
          if (state.count > 0) last.classList.add('tear');
        }
      }
    },
    /* g27 药柜：连续天数 → 点亮格数；点按开抽屉 */
    g27: function (box, d) {
      var lit = Math.min(d.streak, 12);
      var html = '<div class="cabs">';
      for (var i = 0; i < 12; i++) {
        html += '<div class="cab' + (i < lit ? ' on' : '') + '" role="button" tabindex="-1" data-label="' + CABS[i] + '"><b>' + CABS[i] + '</b></div>';
      }
      html += '</div>';
      box.innerHTML = html;
      box.querySelectorAll('.cab').forEach(function (c) {
        c.addEventListener('click', function () { c.classList.toggle('open'); });
      });
    },
    /* g28 磁带：卷轴角 = 预算进度；左右滑翻 A/B 面 */
    g28: function (box, d) {
      box.innerHTML =
        '<div class="cas-lab"><b>' + (state.side === 'a' ? 'SIDE A · 今日' : 'SIDE B · 昨日') + '</b><span>EL-60 TYPEⅠ</span></div>'
        + '<span class="rec"></span>'
        + '<div class="tape-window"><i class="reel l"></i><i class="reel r"></i></div>'
        + '<div class="tape-foot"><b>' + (d.left != null ? (d.over ? 'OVER ▸+' + Math.abs(d.left) : 'LEFT ' + d.left) + ' KCAL' : Math.round((d.progress || 0) * 100) + '%') + '</b>'
        + '<span class="flip-hint">‹ 滑动翻面 ›</span></div>';
      bindFlip(box);
    },
    /* g29 LCD：七段数码显示结余（无预算时显示已记摄入） */
    g29: function (box, d) {
      var w = box.clientWidth || 340, h = box.clientHeight || 160;
      var val, tag;
      if (d.left != null) { val = d.left < 0 ? '-' + String(Math.abs(d.left)) : String(d.left); tag = d.over ? 'OVER · 超支' : 'KCAL LEFT · 背光 AUTO'; }
      else { val = String(Math.round(d.kcal || 0)); tag = 'KCAL TODAY'; }
      if (val.length > 6) val = val.slice(0, 6);
      var svg = box.querySelector('.lcd-svg');
      var flip = !!svg && state.count >= 0 && d.count !== state.count;
      var node = svg || el('<svg class="lcd-svg' + (flip && !reduced ? ' flip' : '') + '" viewBox="0 0 ' + (w - 20) + ' ' + (h - 36) + '" preserveAspectRatio="xMidYMid meet"></svg>');
      node.innerHTML = sevenSegSVG(val, w - 20, h - 36);
      if (!svg) box.appendChild(node);
      var head = box.querySelector('.lcd-head'), foot = box.querySelector('.lcd-foot');
      if (!head) {
        head = el('<div class="lcd-head"><span>ENERGY LEDGER</span><span>DIGITAL-7</span></div>');
        foot = el('<div class="lcd-foot"><span>' + esc(tag) + '</span><span>g29</span></div>');
        box.insertBefore(head, box.firstChild);
        box.appendChild(foot);
      } else {
        foot.firstChild.textContent = tag;
      }
    },
    /* g31 天气瓶：液面 = 结余比；晶体数 = 记录数（≤14） */
    g31: function (box, d) {
      var water = box.querySelector('.water'), xtalN = box.querySelectorAll('.xtal').length;
      if (!water) {
        box.innerHTML = '<div class="flask"><div class="water"></div></div><div class="flask-read"><b>' + (d.left != null ? d.left : '--') + '</b>kcal 余量</div>';
        water = box.querySelector('.water');
        xtalN = 0;
      }
      box.querySelector('.flask-read b').textContent = d.left != null ? d.left : '--';
      var want = Math.min(d.count, 14);
      var flask = box.querySelector('.flask');
      for (var i = xtalN; i < want; i++) {
        var x = el('<span class="xtal"></span>');
        x.style.setProperty('--xi', String(i));
        x.style.left = (12 + ((i * 37) % 84)) + 'px';
        x.style.bottom = (14 + ((i * 23) % 52)) + 'px';
        flask.appendChild(x);
      }
      while (flask.querySelectorAll('.xtal').length > want) {
        var lastX = flask.querySelectorAll('.xtal');
        lastX[lastX.length - 1].remove();
      }
    },
    /* g32 印章阵：连续天数 → 盖章（14 格两周） */
    g32: function (box, d) {
      var n = Math.min(d.streak, 14);
      var html = '<div class="stamps">';
      for (var i = 0; i < 14; i++) {
        html += '<div class="stamp ' + (i < n ? 'full' : 'empty') + '" style="--si:' + i + '"></div>';
      }
      html += '</div>';
      var old = box.querySelector('.stamps');
      box.innerHTML = html;
      /* 盖章下压：连续天数增加时最后一枚播放 press */
      if (!reduced && state.streak >= 0 && d.streak > state.streak) {
        var last = box.querySelectorAll('.stamp.full');
        if (last.length) last[last.length - 1].classList.add('press');
      }
      if (old && old.childElementCount) { /* keep layout stable */ }
    },
    /* g33 线路：记录数 → 列车站位；SVG 一次构建 */
    g33: function (box, d) {
      var svg = box.querySelector('svg.route-svg');
      var W = box.clientWidth || 340, H = box.clientHeight || 200;
      if (!svg) {
        /* 竖向 S 线：4 站 */
        var pts = [[46, 26], [W - 58, 26 + (H - 60) / 3], [46, 26 + (H - 60) * 2 / 3], [W - 58, H - 34]];
        var path = 'M ' + pts[0][0] + ' ' + pts[0][1]
          + ' C ' + pts[0][0] + ' ' + (pts[0][1] + 34) + ', ' + pts[1][0] + ' ' + (pts[1][1] - 34) + ', ' + pts[1][0] + ' ' + pts[1][1]
          + ' C ' + pts[1][0] + ' ' + (pts[1][1] + 34) + ', ' + pts[2][0] + ' ' + (pts[2][1] - 34) + ', ' + pts[2][0] + ' ' + pts[2][1]
          + ' C ' + pts[2][0] + ' ' + (pts[2][1] + 34) + ', ' + pts[3][0] + ' ' + (pts[3][1] - 34) + ', ' + pts[3][0] + ' ' + pts[3][1];
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'route-svg');
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.innerHTML =
          '<path class="route-line" d="' + path + '"/>'
          + pts.map(function (p, i) {
            return '<g class="station' + (i === 3 ? ' terminal' : '') + '" data-st="' + i + '">'
              + '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8"/>'
              + '<text x="' + (p[0] + (i % 2 ? -12 : 12)) + '" y="' + (p[1] + 3.5) + '" text-anchor="' + (i % 2 ? 'end' : 'start') + '">' + STATION_LABELS[i] + '</text></g>';
          }).join('')
          + '<g class="train" data-train><circle class="body" r="7"/><text text-anchor="middle" dy="3">电</text></g>';
        box.appendChild(svg);
      }
      var st = clamp(d.count, 0, 4);
      var stations = box.querySelectorAll('.station');
      stations.forEach(function (s, i) { s.classList.toggle('hit', i < st); });
      var target = stations[Math.max(0, st - 1)];
      var train = box.querySelector('.train');
      if (target) {
        var c = target.querySelector('circle');
        train.setAttribute('transform', 'translate(' + c.getAttribute('cx') + ',' + c.getAttribute('cy') + ')');
      }
      train.setAttribute('opacity', st === 0 ? '0' : '1');  /* 未出发时列车不入画面 */
      var line = box.querySelector('.route-line');
      line.classList.toggle('done', st >= 4);
    },
    /* g34 存钱罐：豆子 = 连续天数（≤24），颜色随深度，新增豆下落回弹 */
    g34: function (box, d) {
      var jar = box.querySelector('.jar');
      if (!jar) {
        box.innerHTML = '<div class="jar"></div><div class="jar-read"><b>' + d.streak + '</b>天连续 · 每天一颗</div>';
        jar = box.querySelector('.jar');
      }
      box.querySelector('.jar-read b').textContent = d.streak;
      var want = Math.min(d.streak, 24);
      var beans = jar.querySelectorAll('.bean');
      var have = beans.length;
      var jw = jar.clientWidth || 110, jh = jar.clientHeight || 150;
      for (var i = have; i < want; i++) {
        var b = el('<span class="bean' + (!reduced && i === want - 1 && have > 0 ? ' drop' : '') + '"></span>');
        var col = i < 6 ? '#E8C983' : i < 12 ? '#DBA757' : i < 18 ? '#C98B3E' : '#A96F2C';
        b.style.setProperty('--bc', col);
        var row = Math.floor(i / 4), colI = i % 4;
        b.style.left = (10 + colI * ((jw - 34) / 3)) + 'px';
        b.style.bottom = (8 + row * 15) + 'px';
        jar.appendChild(b);
      }
      while (jar.querySelectorAll('.bean').length > want) {
        var bs = jar.querySelectorAll('.bean');
        bs[bs.length - 1].remove();
      }
    },
    /* g35 冰箱贴：今日条目 → 可拖磁贴（位置持久化） */
    g35: function (box, d, reflow) {
      var saved = mStorage();
      var items = (d.items || []).slice(-6);
      var existing = {};
      box.querySelectorAll('.magnet').forEach(function (m) { existing[m.dataset.mid] = m; });
      box.innerHTML = '<div class="door-line"></div>';
      items.forEach(function (it, i) {
        var id = String(it.id || (it.createdAt || i));
        var pos = saved[id] || {};
        var x = pos.x != null ? pos.x : 12 + (i % 2) * (box.clientWidth - 128);
        var y = pos.y != null ? pos.y : 10 + Math.floor(i / 2) * 66;
        var m = el('<div class="magnet ' + MAGNET_COLORS[i % 6] + '" data-mid="' + esc(id) + '">'
          + '<b>' + esc(it.name || '一餐') + '</b><i>' + Math.round(it.kcal || 0) + ' kcal</i></div>');
        m.style.setProperty('--mx', clamp(x, 0, Math.max(0, box.clientWidth - 100)) + 'px');
        m.style.setProperty('--my', clamp(y, 0, Math.max(0, box.clientHeight - 66)) + 'px');
        m.style.setProperty('--mr', ((i % 3) - 1) * 2.4 + 'deg');
        box.appendChild(m);
        bindDrag(m, box);
      });
      if (!items.length) {
        box.appendChild(el('<div class="magnet-hint">记下第一笔，冰箱门就有了第一张磁贴</div>'));
      } else {
        box.appendChild(el('<div class="magnet-hint">磁贴可以拖动 · 位置会记住</div>'));
      }
      if (!reflow && !reduced) {
        box.querySelectorAll('.magnet').forEach(function (m) {
          m.classList.add('pinned');
          m.addEventListener('animationend', function () { m.classList.remove('pinned'); }, { once: true });
        });
      }
    }
  };

  /* ---------------- 交互绑定 ---------------- */
  function bindFlip(box) {
    if (box.dataset.flipBound) return;
    box.dataset.flipBound = '1';
    var x0 = null;
    box.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    box.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 36) return;   /* 不够滑动距离视为点按 */
      state.side = dx < 0 ? 'b' : 'a';
      box.setAttribute('data-side', state.side);
      if (!reduced) {
        box.classList.remove('flip-anim');
        void box.offsetWidth;
        box.classList.add('flip-anim');
      }
      var lab = box.querySelector('.cas-lab b');
      if (lab) lab.textContent = state.side === 'a' ? 'SIDE A · 今日' : 'SIDE B · 昨日';
    });
  }
  function bindDrag(m, box) {
    if (m.dataset.dragBound) return;
    m.dataset.dragBound = '1';
    var sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
    var cap = false;
    function savePos() {
      var saved = mStorage();
      saved[m.dataset.mid] = {
        x: parseFloat(m.style.getPropertyValue('--mx')) || 0,
        y: parseFloat(m.style.getPropertyValue('--my')) || 0
      };
      try { localStorage.setItem(MAGNET_KEY, JSON.stringify(saved)); } catch (err) { /* 隐私模式忽略 */ }
    }
    m.addEventListener('pointerdown', function (e) {
      sx = e.clientX; sy = e.clientY;
      ox = parseFloat(m.style.getPropertyValue('--mx')) || 0;
      oy = parseFloat(m.style.getPropertyValue('--my')) || 0;
      moved = false;
      /* 捕获失败（指针已失效/合成事件）也能拖：降级为无捕获模式 */
      try { m.setPointerCapture(e.pointerId); cap = true; }
      catch (err) { cap = false; }
    });
    m.addEventListener('pointermove', function (e) {
      if (cap && m.hasPointerCapture && !m.hasPointerCapture(e.pointerId)) return;
      var nx = clamp(ox + e.clientX - sx, 0, Math.max(0, box.clientWidth - 100));
      var ny = clamp(oy + e.clientY - sy, 0, Math.max(0, box.clientHeight - 66));
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 4) moved = true;
      m.style.setProperty('--mx', nx + 'px');
      m.style.setProperty('--my', ny + 'px');
    });
    function endDrag(e) {
      if (cap && m.hasPointerCapture && m.hasPointerCapture(e.pointerId)) {
        try { m.releasePointerCapture(e.pointerId); } catch (err) { /* 已释放 */ }
      }
      if (moved) savePos();
      cap = false; moved = false;
    }
    m.addEventListener('pointerup', endDrag);
    m.addEventListener('pointercancel', endDrag);
  }
  /* 卡片涟漪：触屏设备、非省电、非 reduced-motion 才启用 */
  function bindRipple() {
    if (reduced || (document.documentElement.getAttribute('data-fx') === 'off')) return;
    document.addEventListener('pointerdown', function (ev) {
      var card = ev.target && ev.target.closest ? ev.target.closest('.card, .btn, .btn-sm') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      var s = el('<span class="sk-ripple"></span>');
      var size = Math.max(r.width, r.height) * 1.2;
      s.style.width = s.style.height = size + 'px';
      s.style.left = (ev.clientX - r.left) + 'px';
      s.style.top = (ev.clientY - r.top) + 'px';
      var cs = getComputedStyle(card);
      var wasStatic = cs.position === 'static';
      if (wasStatic) card.style.position = 'relative';   /* 仅供涟漪锚定，动画后还原 */
      card.appendChild(s);
      var restore = function () { if (wasStatic) card.style.removeProperty('position'); };
      s.addEventListener('animationend', restore, { once: true });
      setTimeout(restore, 700);
      s.addEventListener('animationend', function () { s.remove(); });
      setTimeout(function () { if (s.parentNode) s.remove(); }, 700);
    }, { passive: true });
  }
  /* 滚动视差：rAF 节流，只写一个变量 */
  var scrollRaf = 0;
  function bindScroll() {
    window.addEventListener('scroll', function () {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () {
        scrollRaf = 0;
        root.style.setProperty('--sk-scroll', String(Math.min(window.scrollY, 600)));
      });
    }, { passive: true });
  }

  /* ---------------- 渲染编排 ---------------- */
  var lastDataSig = '';
  function renderStage(id, d, force) {
    var box = document.getElementById('skinStage');
    if (!box || !RENDER[id]) return;
    var sig2 = [d.count, d.streak, d.left, d.progress.toFixed(3), state.side,
                (d.items || []).map(function (x) { return x.id; }).join(',')].join('|');
    if (!force && sig2 === lastDataSig) return;
    lastDataSig = sig2;
    try { RENDER[id](box, d); } catch (e) { /* 皮肤组件失败不影响账本 */ }
  }
  function sync(id, data) {
    var ch = CH[id];
    if (!isV6(id) || !ch) {
      root.removeAttribute('data-skin-v6');
      root.removeAttribute('data-skin-v6-mat');
      root.removeAttribute('data-skin-v6-arch');
      root.removeAttribute('data-skin-v6-sig');
      if (isV6(state.id) && !isV6(id)) { state.id = ''; lastDataSig = ''; }
      return;
    }
    state.id = id;
    root.setAttribute('data-skin-v6', '1');
    root.setAttribute('data-skin-mat', ch.mat);
    root.setAttribute('data-skin-arch', ch.arch);
    root.setAttribute('data-skin-sig', ch.sig);
    var d = writeData(data);
    /* 渲染时机：DOM 就绪后（defer 脚本阶段 DOM 已可查） */
    if (document.getElementById('skinStage')) {
      renderStage(id, d, id !== sync.lastId);
      sync.lastId = id;
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        renderStage(id, writeData(data), true);
      }, { once: true });
    }
    swapManifest(id);
    /* streak 变化记录（press/drop 动画只在真正 +1 时播放） */
    state.count = d.count;
    state.streak = d.streak;
  }

  /* ---------------- auditV6：把「看到了什么」读成数字（验收用） ---------------- */
  function auditV6() {
    var de = document.documentElement;
    var box = document.getElementById('skinStage');
    var out = {
      skin: de.getAttribute('data-skin'),
      v6: de.getAttribute('data-skin-v6') === '1',
      channels: {
        mat: de.getAttribute('data-skin-mat') || '',
        arch: de.getAttribute('data-skin-arch') || '',
        sig: de.getAttribute('data-skin-sig') || ''
      },
      data: {
        count: root.style.getPropertyValue('--sk-count').trim(),
        streak: root.style.getPropertyValue('--sk-streak').trim(),
        progress: root.style.getPropertyValue('--sk-progress').trim(),
        leftRatio: root.style.getPropertyValue('--sk-left-ratio').trim(),
        recorded: de.getAttribute('data-sk-recorded'),
        over: de.getAttribute('data-sk-over')
      },
      stage: {
        mounted: !!box && box.offsetHeight > 0,
        h: box ? Math.round(box.offsetHeight) : 0,
        children: box ? box.childElementCount : 0
      },
      cssBackdrop: (function () {
        var am = document.querySelector('.app-main');
        if (!am) return false;
        var cs = getComputedStyle(am, '::before');
        return cs.content !== 'none' && cs.content !== '' && cs.backgroundImage !== 'none';
      })(),
      tabbar: (function () {
        var tb = document.querySelector('.tabbar');
        if (!tb) return null;
        var cs = getComputedStyle(tb);
        return { bg: cs.backgroundColor, themed: cs.backgroundColor !== 'rgba(251, 249, 242, 0.93)' };
      })(),
      reduced: reduced,
      manifestSwapped: lastManifestSkin === active() && isV6(active())
    };
    return out;
  }

  /* ---------------- 启动 ---------------- */
  if (!reduced) bindRipple();
  bindScroll();
  /* 深度巡检入口：window.SkinV6 */
  window.SkinV6 = {
    ids: V6,
    sync: sync,
    audit: auditV6,
    state: function () { return { id: state.id, side: state.side, count: state.count, streak: state.streak }; },
    detail: function (on) { /* A/B 取证：抽掉 DOM 舞台层，内容与布局不变 */
      var box = document.getElementById('skinStage');
      if (box) box.style.visibility = on ? '' : 'hidden';
    }
  };
})();
