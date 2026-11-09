/* skins-v7.js · v5.5 五十连发运行时（g36–g85）
   五台机制引擎：grow / meter / plate / vessel / motion。
   职责（与 v5.4 的 skins-v6.js 同纪律）：不改业务逻辑；数据只读 fxDataContext 快照；
   reduced-motion 只关动效不关形状；组件失败不影响账本（try/catch 包裹渲染）。 */
(function () {
  'use strict';

  var V7 = ["g36","g37","g38","g39","g40","g41","g42","g43","g44","g45","g46","g47","g48","g49","g50","g51","g52","g53","g54","g55","g56","g57","g58","g59","g60","g61","g62","g63","g64","g65","g66","g67","g68","g69","g70","g71","g72","g73","g74","g75","g76","g77","g78","g79","g80","g81","g82","g83","g84","g85"];
  var CFG = {"g36":{"tip":"第{n}天·已记","eng":"grow","mech":"pot","bind":"streak","max":8,"h":168,"tip0":"窗台"},"g37":{"tip":"{n} 笔","eng":"grow","mech":"string","bind":"count","max":10,"h":164,"tip0":"夜市"},"g38":{"tip":"{d}·{on}","eng":"grow","mech":"hex","bind":"miss14","max":14,"h":172,"tip0":"蜂巢"},"g39":{"tip":"{d}","eng":"grow","mech":"stamps","bind":"miss14","max":14,"h":176,"tip0":"集邮"},"g40":{"tip":"{d}","eng":"grow","mech":"tray","bind":"miss12","max":12,"h":170,"tip0":"育苗"},"g41":{"tip":"第{n}天","eng":"grow","mech":"bells","bind":"streak","max":7,"h":180,"tip0":"檐下"},"g42":{"tip":"{d}","eng":"grow","mech":"nests","bind":"week7","max":7,"h":172,"tip0":"归巢"},"g43":{"tip":"{n}/30","eng":"grow","mech":"keel","bind":"streak30","max":10,"h":178,"tip0":"龙骨"},"g44":{"tip":"{k}{n}g","eng":"grow","mech":"bulbs","bind":"macro","max":3,"h":176,"tip0":"钨丝"},"g45":{"tip":"{n} 笔","eng":"grow","mech":"stones","bind":"count","max":9,"h":172,"tip0":"石庭"},"g46":{"unit":"kcal","eng":"meter","mech":"column","bind":"progress","max":5,"h":196,"tip0":"寒暑表"},"g47":{"unit":"kcal","eng":"meter","mech":"gauge","bind":"leftRatio","max":9,"h":190,"tip0":"黄铜"},"g48":{"unit":"kcal","eng":"meter","mech":"balance","bind":"deficit","max":7,"h":180,"tip0":"药戥"},"g49":{"unit":"kcal","eng":"meter","mech":"cells","bind":"leftRatio","max":5,"h":168,"tip0":"电量"},"g50":{"unit":"杯","eng":"meter","mech":"anemo","bind":"count","max":12,"h":188,"tip0":"气象"},"g51":{"unit":"kcal","eng":"meter","mech":"scalex","bind":"leftRatio","max":9,"h":182,"tip0":"电子管"},"g52":{"unit":"kcal","eng":"meter","mech":"swing","bind":"progress","max":9,"h":200,"tip0":"座钟"},"g53":{"unit":"kcal","eng":"meter","mech":"hourglass","bind":"leftRatio","max":7,"h":196,"tip0":"沙漏"},"g54":{"unit":"kcal","eng":"meter","mech":"gaugecol","bind":"progress","max":10,"h":188,"tip0":"雨量"},"g55":{"unit":"星","eng":"meter","mech":"rings","bind":"dayphase","max":12,"h":200,"tip0":"星盘"},"g56":{"eng":"plate","mech":"flap","bind":"left","max":6,"h":186,"tip0":"翻牌"},"g57":{"eng":"plate","mech":"type","bind":"items","max":6,"h":186,"tip0":"活字"},"g58":{"eng":"plate","mech":"rods","bind":"kcal","max":6,"h":184,"tip0":"算筹"},"g59":{"eng":"plate","mech":"led","bind":"count","max":9,"h":180,"tip0":"闸机"},"g60":{"eng":"plate","mech":"floors","bind":"count","max":9,"h":198,"tip0":"电梯"},"g61":{"eng":"plate","mech":"seal","bind":"recorded","max":6,"h":188,"tip0":"火漆"},"g62":{"eng":"plate","mech":"chalk","bind":"items","max":5,"h":196,"tip0":"黑板"},"g63":{"eng":"plate","mech":"marquee","bind":"kcal","max":6,"h":190,"tip0":"灯箱"},"g64":{"eng":"plate","mech":"tide","bind":"left","max":6,"h":186,"tip0":"码头"},"g65":{"eng":"plate","mech":"weights","bind":"meals","max":5,"h":188,"tip0":"砝码"},"g66":{"eng":"vessel","mech":"rack","bind":"items","max":6,"h":190,"tip0":"信匣"},"g67":{"eng":"vessel","mech":"stack","bind":"count","max":4,"h":198,"tip0":"蒸笼"},"g68":{"eng":"vessel","mech":"tube","bind":"items","max":6,"h":192,"tip0":"签筒"},"g69":{"eng":"vessel","mech":"puppet","bind":"items","max":6,"h":196,"tip0":"幕布"},"g70":{"eng":"vessel","mech":"wok","bind":"items","max":6,"h":192,"tip0":"炊烟"},"g71":{"unit":"kcal","eng":"vessel","mech":"jarfill","bind":"progress","max":10,"h":192,"tip0":"陶罐"},"g72":{"eng":"vessel","mech":"shelf","bind":"items","max":6,"h":190,"tip0":"书立"},"g73":{"unit":"kcal","eng":"vessel","mech":"well","bind":"leftRatio","max":7,"h":200,"tip0":"井台"},"g74":{"eng":"vessel","mech":"basket","bind":"items","max":6,"h":188,"tip0":"果篮"},"g75":{"unit":"kcal","eng":"vessel","mech":"icebox","bind":"leftRatio","max":7,"h":192,"tip0":"冰鉴"},"g76":{"eng":"motion","mech":"disc","bind":"recorded","max":6,"h":192,"tip0":"唱片"},"g77":{"eng":"motion","mech":"wheel","bind":"progress","max":8,"h":198,"tip0":"水车"},"g78":{"eng":"motion","mech":"pinwheel","bind":"progress","max":8,"h":192,"tip0":"纸鸢"},"g79":{"eng":"motion","mech":"lantern","bind":"items","max":6,"h":198,"tip0":"走马"},"g80":{"tip":"{d}","eng":"motion","mech":"loom","bind":"miss14","max":14,"h":196,"tip0":"织机"},"g81":{"eng":"motion","mech":"top","bind":"health","max":5,"h":190,"tip0":"陀螺"},"g82":{"eng":"motion","mech":"music","bind":"count","max":12,"h":192,"tip0":"八音"},"g83":{"eng":"motion","mech":"odo","bind":"count","max":6,"h":184,"tip0":"计程"},"g84":{"eng":"motion","mech":"fan","bind":"progress","max":4,"h":190,"tip0":"轴流"},"g85":{"eng":"motion","mech":"sundial","bind":"dayphase","max":5,"h":196,"tip0":"日晷"}};
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var state = { id: '', count: -1, streak: -1, view: 0, lastSig: '' };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function active() { return root.getAttribute('data-skin') || ''; }
  function isV7(id) { return V7.indexOf(id) >= 0; }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  /* ---------------- 数据写入（与 v6 同一数据面） ---------------- */
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
    return { count: count, streak: streak, left: left, budget: budget,
             progress: progress, leftRatio: leftRatio,
             kcal: Math.round(Number(d.kcal) || 0),
             meals: d.meals || {}, macros: d.macros || { p: 0, c: 0, f: 0 },
             items: d.items || [], recorded: count > 0,
             over: left != null && left < 0,
             recentMiss: d.recentMiss || [], recentDates: d.recentDates || [],
             dayphase: root.getAttribute('data-dayphase') || 'noon' };
  }

  /* ---------------- 布局坐标（E-A） ---------------- */
  var LAYOUT = {
    pot: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 44 + (i % 2 ? 9 : -3) + Math.floor(i / 2) * 2, y: 62 - Math.floor(i / 2) * 11 }); return a; },
    string: function (n) { var a = []; for (var i = 0; i < n; i++) { var t = n <= 1 ? .5 : i / (n - 1); a.push({ x: 8 + t * 84, y: 20 + Math.sin(t * Math.PI) * 26 }); } return a; },
    hex: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = i < 7 ? 0 : 1, c = i % 7; a.push({ x: 12 + c * 11.5 + (r ? 5.8 : 0), y: 24 + r * 34 }); } return a; },
    stamps: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = i < 7 ? 0 : 1, c = i % 7; a.push({ x: 8 + c * 12.6, y: 18 + r * 42 }); } return a; },
    tray: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = Math.floor(i / 4), c = i % 4; a.push({ x: 14 + c * 18.5, y: 16 + r * 30 }); } return a; },
    bells: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 12 + i * 12.4, y: 26 }); return a; },
    nests: function (n) { var a = []; for (var i = 0; i < n; i++) { var r = i < 4 ? 0 : 1, c = i % 4; a.push({ x: 12 + c * 19 + (r ? 9 : 0), y: 26 + r * 36 }); } return a; },
    keel: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 6 + i * 9.2, y: 74 - i * 6.2 }); return a; },
    bulbs: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 14 + i * 27, y: 22 }); return a; },
    stones: function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ x: 42 + (i % 2 ? 4 : 0), y: 70 - i * 7.4 }); return a; }
  };
  var WEEK_CH = ['日', '一', '二', '三', '四', '五', '六'];
  function weekCh(ds) {
    try {
      var p = String(ds || '').split('-');
      var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return WEEK_CH[dt.getDay()] || '';
    } catch (e) { return ''; }
  }

  /* ---------------- E-A grow 渲染器 ---------------- */
  function renderGrow(box, d, cfg, id) {
    var bind = cfg.bind, N = cfg.max || 8, on = [], labels = [], i;
    if (bind === 'streak') { for (i = 0; i < N; i++) on.push(i < Math.min(d.streak, N)); }
    else if (bind === 'count') { for (i = 0; i < N; i++) on.push(i < Math.min(d.count, N)); }
    else if (bind === 'streak30') { var k = Math.min(Math.round(d.streak / 3), N); for (i = 0; i < N; i++) on.push(i < k); }
    else if (bind === 'miss14' || bind === 'miss12') {
      var m = bind === 'miss14' ? 14 : 12;
      var src = d.recentMiss.slice(-m);
      while (src.length < m) src.unshift(0);
      N = m; on = src.map(function (x) { return !!x; });
      labels = d.recentDates.slice(-m).map(function (dt) { return weekCh(dt); });
      while (labels.length < m) labels.unshift('');
    } else if (bind === 'week7') {
      var s7 = d.recentMiss.slice(-7);
      while (s7.length < 7) s7.unshift(0);
      N = 7; on = s7.map(function (x) { return !!x; });
      labels = d.recentDates.slice(-7).map(function (dt) { return weekCh(dt); });
      while (labels.length < 7) labels.unshift('');
    } else if (bind === 'macro') {
      N = 3; var mc = d.macros || {};
      var vals = [Number(mc.p) || 0, Number(mc.c) || 0, Number(mc.f) || 0];
      var caps = [80, 220, 66];
      on = vals.map(function (v, j) { return v > 0; });
      labels = ['蛋白', '碳水', '脂肪'].map(function (nm, j) {
        return nm + ' ' + vals[j] + 'g'; });
      var pos = LAYOUT.bulbs(3);
      var html = '<div class="sk-decor d-' + id + '"></div><div class="gv-units">';
      for (var j = 0; j < 3; j++) {
        var lit = clamp(vals[j] / caps[j], 0, 1);
        html += '<button type="button" class="gu" data-i="' + j + '" data-tip="' + esc(labels[j]) +
          '" style="left:' + pos[j].x + '%;top:' + pos[j].y + '%;--lit:' + lit.toFixed(2) + '"><i></i><b>' + ['蛋白', '碳水', '脂肪'][j] + '</b></button>';
      }
      html += '</div><div class="gv-read">' + (d.recorded ? '宏量 · 今日' : '宏量 · 等待第一笔') + '</div>';
      box.innerHTML = html;
      return;
    }
    var pos = (LAYOUT[cfg.mech] || LAYOUT.stones)(N);
    var units = '';
    for (i = 0; i < N; i++) {
      var tip = '';
      if (bind === 'streak' || bind === 'streak30') tip = '第' + (i + 1) + '天';
      else if (bind === 'count') tip = (i + 1) + ' 笔';
      else tip = (labels[i] || '') + (on[i] ? '·已记' : '·未记');
      units += '<button type="button" class="gu' + (on[i] ? ' on' : ' off') + '" data-i="' + i + '" data-tip="' + esc(tip) + '" style="left:' + pos[i].x + '%;top:' + pos[i].y + '%"><i></i></button>';
    }
    var read = bind === 'streak' || bind === 'streak30' ? '连续 ' + d.streak + ' 天'
      : bind === 'count' ? '今日 ' + d.count + ' 笔'
      : bind === 'week7' ? '本周 ' + on.filter(Boolean).length + '/7 天'
      : '近 ' + N + ' 天 ' + on.filter(Boolean).length + ' 记';
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="gv-units">' + units + '</div>' +
      (on.some(Boolean) ? '<div class="gv-read">' + esc(read) + '</div>' : '<div class="gv-empty">记下第一笔，' + esc((cfg.tip0 || '这里')) + '就开始生长</div>');
  }

  /* ---------------- E-B meter 渲染器 ---------------- */
  function meterVal(d, cfg) {
    if (cfg.bind === 'progress') return { v: d.progress, big: d.left != null ? d.left : d.kcal, sub: d.left != null ? (d.over ? '超支 kcal' : '结余 kcal') : '已记 kcal' };
    if (cfg.bind === 'leftRatio') return { v: d.leftRatio, big: d.left != null ? d.left : d.kcal, sub: d.left != null ? (d.over ? '超支 kcal' : '结余 kcal') : '已记 kcal' };
    if (cfg.bind === 'deficit') return { v: d.leftRatio, big: d.left != null ? d.left : d.kcal, sub: d.left != null ? (d.over ? '右倾 · 超支' : '左倾 · 结余') : '已记 kcal' };
    if (cfg.bind === 'count') return { v: clamp(d.count / 8, 0, 1), big: d.count, sub: '今日笔数' };
    return { v: d.progress, big: d.kcal, sub: '已记 kcal' };
  }
  function renderMeter(box, d, cfg, id) {
    var m = meterVal(d, cfg);
    var mech = cfg.mech, html = '<div class="sk-decor d-' + id + '"></div><div class="mt-wrap">';
    box.style.setProperty('--v', m.v.toFixed(4));
    if (mech === 'column' || mech === 'gaugecol') {
      html += '<div class="mt-tube"><div class="mt-col"></div></div>';
      html += '<div class="mt-marks" style="right:calc(100% - 54px);top:18px;bottom:44px;width:12px">' + '<i></i><i></i><i></i><i></i><i></i>' + '</div>';
      if (mech === 'gaugecol') html += '<div class="mt-drops"><i></i><i></i><i></i></div>';
      else html += '<div class="mt-bulb"></div>';
    } else if (mech === 'gauge' || mech === 'balance' || mech === 'rings' || mech === 'scalex' || mech === 'swing' || mech === 'cells' || mech === 'hourglass' || mech === 'anemo') {
      if (mech === 'gauge') {
        var ang = -120 + m.v * 240;
        box.style.setProperty('--ang', ang.toFixed(1) + 'deg');
        /* v5.5 修复（验证4/5）：针与轴心嵌在表盘容器内，否则支点脱离弧心 */
        html += '<div class="mt-dial"><div class="mt-needle"></div><div class="mt-pin"></div></div>';
      } else if (mech === 'balance') {
        var tilt = clamp((d.left != null ? d.left : 0) / Math.max(1, d.budget) * 10, -11, 11);
        box.style.setProperty('--ang', tilt.toFixed(1) + 'deg');
        html += '<div class="mt-colm"></div><div class="mt-beam"><span class="mt-pan l"></span><span class="mt-pan r"></span></div>';
      } else if (mech === 'cells') {
        var cells = '', onN = Math.round(m.v * 5);
        for (var ci = 0; ci < 5; ci++) cells += '<span class="mt-cell' + (ci < onN ? ' on' : '') + '"></span>';
        html += '<div class="mt-cells">' + cells + '</div>';
        if (d.over) html += '<div class="mt-badge">超支 · 请留意</div>';
      } else if (mech === 'scalex') {
        html += '<div class="mt-scale"></div><div class="mt-needle-x"></div>';
      } else if (mech === 'swing') {
        html += '<div class="mt-case"><div class="mt-face"></div></div><div class="mt-pend"></div>';
      } else if (mech === 'hourglass') {
        html += '<div class="hg-frame"><div class="hg-glass"></div><div class="hg-top"></div><div class="hg-stream"></div></div>';
      } else if (mech === 'anemo') {
        var meals = d.meals || {}, domI = 0, domV = -1, keys = ['breakfast', 'lunch', 'dinner', 'snack', 'exercise'];
        for (var mi = 0; mi < keys.length; mi++) { var vv = Number(meals[keys[mi]]) || 0; if (vv > domV) { domV = vv; domI = mi; } }
        box.style.setProperty('--vane', (domI * 72 - 108) + 'deg');
        html += '<div class="mo-cups"><i></i><i></i><i></i></div><div class="mo-vane" style="transform:rotate(var(--vane))"></div>';
      } else if (mech === 'rings') {
        var phaseAng = { dawn: -60, noon: -20, dusk: 30, night: 80 }[d.dayphase] || 0;
        var stars = '';
        for (var si = 0; si < Math.min(d.count, 12); si++) {
          var aa = (si * 30 + phaseAng) * Math.PI / 180;
          stars += '<span class="rg-star" style="left:calc(50% + ' + (Math.cos(aa) * 62).toFixed(1) + 'px);top:calc(46% + ' + (Math.sin(aa) * 62 * .62).toFixed(1) + 'px)"></span>';
        }
        html += '<div class="rg-stage"><span class="rg-ring r1"></span><span class="rg-ring r2"></span><span class="rg-ring r3"></span>' + stars + '<span class="rg-core"></span></div>';
      }
    }
    html += '<div class="mt-read"><b>' + esc(String(m.big)) + '</b> ' + esc(m.sub) + '</div></div>';
    box.innerHTML = html;
  }

  /* ---------------- E-C plate 渲染器 ---------------- */
  var PL_VIEWS = ['今天', '清单', '三餐'];
  function plateView(d, v) {
    if (v === 1) {
      var its = d.items.slice(-6);
      return { type: 'list', rows: its.map(function (x) { return { name: x.name || '一餐', kcal: Math.round(x.kcal || 0) }; }) };
    }
    if (v === 2) {
      var meals = d.meals || {}, rows = [];
      [['breakfast', '早'], ['lunch', '午'], ['dinner', '晚'], ['snack', '点'], ['exercise', '动']].forEach(function (mm) {
        rows.push({ name: mm[1], kcal: Math.round(Number(meals[mm[0]]) || 0) });
      });
      return { type: 'chips', rows: rows };
    }
    return { type: 'num', big: d.left != null ? (d.over ? '-' + Math.abs(d.left) : String(d.left)) : String(d.kcal),
             sub: d.left != null ? (d.over ? '超支 kcal' : '结余 kcal') : '已记 kcal' };
  }
  function renderPlate(box, d, cfg, id) {
    var mech = cfg.mech, view = clamp(state.view, 0, 2), pv = plateView(d, view);
    var dots = '<div class="pl-dots">' + PL_VIEWS.map(function (nm, j) { return '<i class="' + (j === view ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    var inner = '';
    if (mech === 'flap') {
      var s = String(pv.type === 'num' ? pv.big : (d.count || 0));
      if (s.length > 6) s = s.slice(0, 6);
      inner = s.split('').map(function (ch, j) { return '<span class="fl-cell"><b>' + esc(ch === '-' ? '–' : ch) + '</b></span>'; }).join('');
    } else if (mech === 'type' || mech === 'marquee') {
      if (pv.type === 'list') inner = pv.rows.slice(0, 5).map(function (r) { return '<span class="ty-cell">' + esc(String(r.name).slice(0, 4)) + '</span>'; }).join('');
      else if (pv.type === 'chips') inner = pv.rows.filter(function (r) { return r.kcal > 0; }).map(function (r) { return '<span class="ty-cell ink">' + esc(r.name) + '</span>'; }).join('') || '<span class="pl-empty">三餐未记</span>';
      else inner = '<span class="ty-cell">' + esc(pv.sub.split(' ')[0]) + '</span><span class="ty-cell ink">' + esc(String(pv.big)) + '</span><span class="ty-cell">kcal</span>';
    } else if (mech === 'rods') {
      var num = Math.abs(Number(pv.type === 'num' ? pv.big : d.kcal) || 0);
      var digits = String(num).split('');
      inner = digits.map(function (dg) {
        var n = Number(dg) || 0;
        var vert = Math.min(n, 5), hor = n > 5 ? 1 : 0;
        var g1 = '', j;
        for (j = 0; j < vert; j++) g1 += '<i class="rd-i"></i>';
        for (j = 0; j < hor; j++) g1 += '<i class="rd-i h"></i>';
        if (!g1) g1 = '<i class="rd-i" style="opacity:.15"></i>';
        return '<span class="rd-group">' + g1 + '</span>';
      }).join('');
    } else if (mech === 'led') {
      inner = '<div><div class="led-num">' + esc(String(pv.type === 'num' ? pv.big : d.count)) + '</div><div class="led-sub">' + esc(pv.type === 'num' ? pv.sub : 'PASS · 今日') + '</div></div>';
    } else if (mech === 'floors') {
      var fl = clamp(d.count, 0, 9);
      box.style.setProperty('--fl', String(fl));
      inner = '<div class="fl-rail"></div><div class="fl-cab" style="top:calc(58px - var(--fl,0)*14px)"></div><div class="fl-num">' + fl + '</div>';
    } else if (mech === 'seal') {
      inner = '<span class="se-flap"></span><span class="se-wax"><b>' + (d.recorded ? '记' : '空') + '</b></span>';
    } else if (mech === 'chalk') {
      /* v5.5 修复（验证4/5）：视图感知文案——有记录时不得显示「空空如也」 */
      var ckRows = '';
      if (pv.type === 'list') {
        ckRows = pv.rows.length ? pv.rows.slice(0, 5).map(function (r) { return '<div class="ck-line">' + esc(r.name) + '<em>' + r.kcal + ' kcal</em></div>'; }).join('') : '<div class="ck-line">今日还没有记录</div>';
      } else if (pv.type === 'chips') {
        ckRows = pv.rows.filter(function (r) { return r.kcal > 0; }).map(function (r) { return '<div class="ck-line">' + esc(r.name) + '<em>' + r.kcal + ' kcal</em></div>'; }).join('') || '<div class="ck-line">三餐未记</div>';
      } else {
        ckRows = d.recorded ? '<div class="ck-line">今日 ' + d.count + ' 笔<em>' + d.kcal + ' kcal</em></div>' : '<div class="ck-line">今日菜单空空如也</div>';
      }
      inner = '<div class="ck-board">' + ckRows + '</div>';
    } else if (mech === 'weights') {
      inner = '<div class="wt-row">' + (pv.type === 'chips' ? pv.rows.map(function (r) { return '<span class="wt-chip"><b>' + esc(r.name) + '</b><i>' + r.kcal + '</i></span>'; }).join('') : '<span class="pl-empty">左右滑动看三餐</span>') + '</div>';
    } else if (mech === 'tide') {
      var ticks = '';
      for (var ti = 0; ti < 9; ti++) ticks += '<i></i>';
      inner = '<div class="td-board"><div class="td-num">' + esc(String(pv.type === 'num' ? pv.big : d.kcal)) + '</div><div class="td-ticks">' + ticks + '</div></div>';
    }
    var foot = pv.type === 'num' ? '<b>' + esc(String(pv.big)) + '</b> ' + esc(pv.sub)
      : pv.type === 'list' ? '<b>' + pv.rows.length + '</b> 条今日记录 · 左右滑切换'
      : '<b>三餐</b> 结构 · 左右滑切换';
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="pl-wrap">' +
      (mech === 'chalk' ? '' : dots) + '<div class="pl-mech">' + inner + '</div><div class="pl-foot">' + foot + '</div></div>';
    if (mech === 'flap' && !reduced) box.querySelectorAll('.fl-cell').forEach(function (c, j) { setTimeout(function () { c.classList.add('flip'); }, j * 60); });
  }

  /* ---------------- E-D vessel 渲染器 ---------------- */
  function renderVessel(box, d, cfg, id) {
    var mech = cfg.mech, items = d.items.slice(-6), i;
    var inner = '';
    if (mech === 'rack') {
      inner = items.map(function (x) { return '<button type="button" class="vs-it" data-tip="' + esc(x.name || '一餐') + ' ' + Math.round(x.kcal || 0) + '"><i></i><b>' + esc(String(x.name || '一餐').slice(0, 4)) + '</b></button>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="vs-body">' + (inner || '') + '</div>' +
        (items.length ? '<div class="vs-read">' + items.length + ' 封今日来信</div>' : '<div class="vs-empty">记下第一笔，信匣就有了第一封信</div>');
      return;
    }
    if (mech === 'stack') {
      var n = clamp(d.count, 0, 4), lay = '';
      for (i = 0; i < n; i++) lay += '<div class="st-layer" style="bottom:' + (8 + i * 30) + 'px"></div>';
      lay += '<div class="st-steam"></div>';
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="vs-body">' + lay + '</div>' +
        '<div class="vs-read">' + (n ? '笼叠 ' + n + ' 层 · ' + d.count + ' 笔' : '空笼 · 记一笔开笼') + '</div>';
      return;
    }
    if (mech === 'tube') {
      var sticks = items.map(function (x, j) { return '<span class="st-stick" style="left:calc(50% + ' + ((j - (items.length - 1) / 2) * 9) + 'px);transform:rotate(' + ((j % 2 ? 1 : -1) * (2 + j)) + 'deg)"><b>' + esc(String(x.name || '签').slice(0, 6)) + '</b></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="vs-items">' + sticks + '</div><div class="vs-body"></div>' +
        (items.length ? '<div class="vs-read">' + items.length + ' 支今日签</div>' : '<div class="vs-empty">摇一摇 · 记一笔起签</div>');
      return;
    }
    if (mech === 'puppet') {
      var figs = items.map(function (x, j) { return '<span class="pp-fig" style="left:calc(12% + ' + (j * 13) + '%)"></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="pp-stage">' + figs + '</div>' +
        '<div class="vs-read">' + (items.length ? items.length + ' 位影人登台' : '幕布后空无一人 · 记一笔开演') + '</div>';
      return;
    }
    if (mech === 'wok') {
      var bits = items.map(function (x, j) { return '<span class="wk-bit" style="left:calc(50% + ' + (-24 + j * 9) + 'px);top:calc(100% - ' + (52 + (j % 3) * 7) + 'px)"></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div>' + bits + '<div class="wk-pan"></div>' + (d.recorded ? '<div class="wk-flame"></div>' : '') +
        '<div class="vs-read">' + (items.length ? '锅中 ' + items.length + ' 味 · ' + d.kcal + ' kcal' : '灶膛未点火 · 记一笔开灶') + '</div>';
      return;
    }
    if (mech === 'jarfill') {
      box.style.setProperty('--v', d.progress.toFixed(4));
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="jr-pot"><div class="jr-fill"></div><div class="jr-seal"></div></div>' +
        '<div class="vs-read"><b>' + (d.left != null ? d.left : d.kcal) + '</b> ' + (d.left != null ? (d.over ? '超支' : '结余') : '已记') + ' kcal</div>';
      return;
    }
    if (mech === 'shelf') {
      var books = items.map(function (x, j) {
        var w = clamp(18 + Math.round((x.kcal || 0) / 30), 18, 44);
        return '<span class="sh-book" style="left:calc(14% + ' + j * 11 + '%);width:' + w + 'px;height:' + clamp(46 + (j % 3) * 8, 46, 66) + 'px" data-tip="' + esc(x.name || '') + ' ' + Math.round(x.kcal || 0) + '"></span>';
      }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div>' + books + '<div class="sh-board"></div>' +
        (items.length ? '<div class="vs-read">今日 ' + items.length + ' 册 · 点书脊看热量</div>' : '<div class="vs-empty">书架空着 · 记一笔上架</div>');
      return;
    }
    if (mech === 'well') {
      box.style.setProperty('--v', d.leftRatio.toFixed(4));
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="wl-frame"></div><div class="wl-rope"></div><div class="wl-bucket"></div><div class="wl-pit"><div class="wl-water"></div></div>' +
        '<div class="vs-read">水位 ' + Math.round(d.leftRatio * 100) + '% · ' + (d.left != null ? d.left : '--') + ' kcal</div>';
      return;
    }
    if (mech === 'basket') {
      var fruits = items.map(function (x, j) { return '<span class="bk-fruit c' + (j % 3) + '" style="left:calc(50% + ' + (-30 + (j % 4) * 16) + 'px);bottom:' + (40 + Math.floor(j / 4) * 18) + 'px" data-tip="' + esc(x.name || '') + '"></span>'; }).join('');
      box.innerHTML = '<div class="sk-decor d-' + id + '"></div>' + fruits + '<div class="bk-basket"></div>' +
        (items.length ? '<div class="vs-read">今日收获 ' + items.length + ' 味</div>' : '<div class="vs-empty">篮子还空 · 记一笔开始收获</div>');
      return;
    }
    /* icebox */
    box.style.setProperty('--v', d.leftRatio.toFixed(4));
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="ib-box"><div class="ib-ice"></div></div><div class="ib-lid"></div>' +
      '<div class="vs-read">冰层 ' + Math.round(d.leftRatio * 100) + '% · ' + (d.left != null ? d.left : '--') + ' kcal</div>';
  }

  /* ---------------- E-E motion 渲染器 ---------------- */
  function renderMotion(box, d, cfg, id) {
    var mech = cfg.mech;
    var dur = d.recorded ? (16 - 12 * d.progress) : 0;
    box.style.setProperty('--mo-dur', (dur ? Math.max(3.2, dur) : 8).toFixed(2) + 's');
    var run = d.recorded && !reduced ? ' mo-run' : '';
    box.className = box.className.replace(/\bmo-\S+/g, '').trim() + run;
    var inner = '';
    if (mech === 'disc') {
      inner = '<div class="mo-rotor"></div><div class="mo-arm"></div>';
    } else if (mech === 'wheel') {
      inner = '<div class="mo-rotor"><i></i><i></i><i></i><i></i></div><div class="mo-flow"></div>';
    } else if (mech === 'pinwheel') {
      inner = '<div class="mo-rotor"><i></i><i></i><i></i><i></i></div>';
    } else if (mech === 'lantern') {
      var its = d.items.slice(-4);
      var nm = its.length ? its[(state.count >= 0 ? its.length - 1 : 0)] : null;
      inner = '<div class="lt-cap"></div><div class="lt-body"><span class="lt-face">' + esc(nm ? String(nm.name).slice(0, 5) : (d.recorded ? '今日' + d.count + '笔' : '等待点灯')) + '</span></div><div class="lt-tassel"></div>';
    } else if (mech === 'loom') {
      var src = d.recentMiss.slice(-14); while (src.length < 14) src.unshift(0);
      var cells = '';
      for (var i = 0; i < 14; i++) cells += '<span class="lw-cell' + (src[i] ? ' on' : '') + '"></span>';
      inner = '<div class="lw-warp">' + cells + '</div><div class="lw-shuttle"></div>';
    } else if (mech === 'top') {
      box.classList.toggle('tilt', !!d.over);
      inner = '<div class="mo-rotor"></div><div class="mo-ring"></div>';
    } else if (mech === 'music') {
      inner = (d.recorded ? '<b class="mu-note">♪</b><b class="mu-note">♫</b>' : '') + '<div class="mu-comb"></div><div class="mu-cyl"></div>';
    } else if (mech === 'odo') {
      var s = String(d.count), pad = '';
      for (var pi = s.length; pi < 6; pi++) pad += '0';
      var rolled = state.count >= 0 && d.count !== state.count ? ' roll' : '';
      inner = '<div class="od-win">' + (pad + s).split('').map(function (dg) { return '<span class="od-digit' + rolled + '">' + dg + '</span>'; }).join('') + '</div>';
    } else if (mech === 'fan') {
      inner = '<div class="fn-guard"></div><div class="mo-rotor"><i></i><i></i><i></i><span class="mo-hub"></span></div>';
    } else { /* sundial */
      var pa = { dawn: -56, noon: -6, dusk: 48, night: 96 }[d.dayphase || 'noon'] || 0;
      box.style.setProperty('--sd', pa + 'deg');
      var meals = d.meals || {};
      var marks = [['早', '12%', Number(meals.breakfast) || 0], ['午', '42%', Number(meals.lunch) || 0], ['晚', '72%', Number(meals.dinner) || 0]].map(function (mm) {
        return '<span class="sd-meal" style="left:' + mm[1] + ';opacity:' + (mm[2] > 0 ? '.95' : '.3') + '">' + mm[0] + '</span>';
      }).join('');
      inner = '<div class="sd-dial"><div class="sd-marks"></div>' + marks + '<div class="sd-shadow" style="transform:rotate(var(--sd,0deg))"></div><div class="sd-gnomon"></div></div>';
    }
    var read = mech === 'sundial' ? ({ dawn: '晨光', noon: '日中', dusk: '暮色', night: '夜晷' }[d.dayphase] || '') + ' · ' + d.count + ' 笔'
      : d.recorded ? '运转中 · ' + Math.round((d.left != null ? d.leftRatio : d.progress) * 100) + '%'
      : '静默 · 记一笔启动';
    box.innerHTML = '<div class="sk-decor d-' + id + '"></div><div class="mo-stage">' + inner + '</div><div class="mo-read">' + esc(read) + '</div>' +
      (!d.recorded ? '<div class="mo-empty">' + esc(cfg.tip0 || '记下第一笔，机构开始运转') + '</div>' : '');
  }

  /* ---------------- 交互 ---------------- */
  function bindTap(box) {
    if (box.dataset.tapBound) return;
    box.dataset.tapBound = '1';
    box.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('.gu, .vs-it, .sh-book, .bk-fruit, .ty-cell') : null;
      if (!t) return;
      var tip = t.getAttribute('data-tip') || t.dataset.tip;
      if (t.classList.contains('ty-cell')) { t.classList.add('ink'); return; }
      if (!tip) return;
      if (reduced) return;
      var r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
      var s = el('<span class="gv-tip"></span>');
      s.textContent = tip;
      s.style.left = (r.left - b.left + r.width / 2) + 'px';
      s.style.top = (r.top - b.top) + 'px';
      box.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.remove(); }, 950);
      if (t.classList.contains('gu')) {
        t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      }
    });
  }
  function bindVesselOpen(box) {
    if (box.dataset.vopenBound) return;
    box.dataset.vopenBound = '1';
    box.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.gu, .vs-it, .sh-book, .bk-fruit')) return;
      box.classList.toggle('v-open');
    });
  }
  /* v5.5 修复（验证4/5）：表计引擎的签名交互「点按表盘 → 精确数字徽章」此前漏绑定 */
  function bindMeterTap(box) {
    if (box.dataset.meterTapBound) return;
    box.dataset.meterTapBound = '1';
    box.addEventListener('click', function (ev) {
      if (reduced) return;
      if (ev.target.closest && ev.target.closest('.gu, .vs-it')) return;
      var id = active(), cfg = CFG[id];
      if (!cfg || cfg.eng !== 'meter' || box.querySelector('.mt-badge')) return;
      var m = meterVal(state.lastData || {}, cfg);
      var s = el('<div class="mt-badge"></div>');
      s.textContent = m.big + ' ' + (cfg.unit || 'kcal');
      box.appendChild(s);
      setTimeout(function () { if (s.parentNode) s.remove(); }, 1150);
    });
  }
  function bindSwipe(box) {
    if (box.dataset.swipeBound) return;
    box.dataset.swipeBound = '1';
    var x0 = null;
    box.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    box.addEventListener('pointerup', function (e) {
      if (x0 == null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) < 36) return;
      state.view = clamp(state.view + (dx < 0 ? 1 : -1), 0, 2);
      var id = active();
      if (CFG[id] && CFG[id].eng === 'plate') renderStage(id, state.lastData, true);
    });
  }
  function bindFlick(box) {
    if (box.dataset.flickBound) return;
    box.dataset.flickBound = '1';
    var x0 = null, t0 = 0, pressT = 0;
    box.addEventListener('pointerdown', function (e) {
      x0 = e.clientX; t0 = Date.now();
      pressT = setTimeout(function () { box.classList.add('mo-freeze'); }, 430);
    });
    box.addEventListener('pointerup', function (e) {
      clearTimeout(pressT);
      box.classList.remove('mo-freeze');
      if (x0 == null) return;
      var dx = e.clientX - x0, dt = Date.now() - t0; x0 = null;
      if (Math.abs(dx) > 40 && dt < 500 && !reduced) {
        box.classList.add('mo-boost');
        setTimeout(function () { box.classList.remove('mo-boost'); }, 2200);
      }
    });
    box.addEventListener('pointercancel', function () { clearTimeout(pressT); box.classList.remove('mo-freeze'); x0 = null; });
  }

  /* ---------------- 渲染编排 ---------------- */
  var RENDER = { grow: renderGrow, meter: renderMeter, plate: renderPlate, vessel: renderVessel, motion: renderMotion };
  function renderStage(id, d, force) {
    var cfg = CFG[id];
    var box = document.getElementById('skinStage');
    if (!box || !cfg || !RENDER[cfg.eng]) return;
    var sig = [d.count, d.streak, d.left, d.progress.toFixed(3), state.view,
               (d.items || []).map(function (x) { return x.id; }).join(','), d.dayphase].join('|');
    if (!force && sig === state.lastSig) return;
    state.lastSig = sig; state.lastData = d;
    try { RENDER[cfg.eng](box, d, cfg, id); } catch (e) { /* 皮肤组件失败不影响账本 */ }
    if (cfg.eng === 'grow') bindTap(box);
    if (cfg.eng === 'meter') bindMeterTap(box);   /* v5.5：表计签名交互 */
    if (cfg.eng === 'vessel') { bindTap(box); bindVesselOpen(box); }
    if (cfg.eng === 'plate') bindSwipe(box);
    if (cfg.eng === 'motion') bindFlick(box);
  }

  /* ---------------- 动态 manifest（对齐 v6） ---------------- */
  var lastManifestSkin = '';
  function swapManifest(id) {
    if (!isV7(id) || id === lastManifestSkin) return;
    var link = document.querySelector('link[rel="manifest"]');
    if (!link || !URL || !URL.createObjectURL) return;
    var cs = getComputedStyle(root);
    var paper = (cs.getPropertyValue('--paper') || '').trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(paper)) return;
    fetch('manifest.webmanifest', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (!m) return;
        m.theme_color = paper; m.background_color = paper;
        var blob = new Blob([JSON.stringify(m)], { type: 'application/manifest+json' });
        link.setAttribute('href', URL.createObjectURL(blob));
        lastManifestSkin = id;
      })
      .catch(function () { /* 离线保持原 manifest */ });
  }

  function sync(id, data) {
    var cfg = CFG[id];
    if (!isV7(id) || !cfg) {
      root.removeAttribute('data-skin-v7');
      root.removeAttribute('data-skin-v7-eng');
      if (isV7(state.id) && !isV7(id)) { state.id = ''; state.lastSig = ''; state.view = 0; }
      return;
    }
    state.id = id;
    root.setAttribute('data-skin-v7', '1');
    root.setAttribute('data-skin-v7-eng', cfg.eng);
    var d = writeData(data);
    if (document.getElementById('skinStage')) {
      renderStage(id, d, id !== sync.lastId);
      sync.lastId = id;
    } else {
      document.addEventListener('DOMContentLoaded', function () { renderStage(id, writeData(data), true); }, { once: true });
    }
    swapManifest(id);
    state.count = d.count;
    state.streak = d.streak;
  }

  /* ---------------- auditV7 ---------------- */
  function auditV7() {
    var de = document.documentElement;
    var box = document.getElementById('skinStage');
    var id = de.getAttribute('data-skin') || '';
    var cfg = CFG[id] || null;
    var out = {
      skin: id,
      v7: de.getAttribute('data-skin-v7') === '1',
      eng: de.getAttribute('data-skin-v7-eng') || '',
      expect: cfg ? { eng: cfg.eng, mech: cfg.mech, bind: cfg.bind } : null,
      data: {
        count: root.style.getPropertyValue('--sk-count').trim(),
        streak: root.style.getPropertyValue('--sk-streak').trim(),
        progress: root.style.getPropertyValue('--sk-progress').trim(),
        leftRatio: root.style.getPropertyValue('--sk-left-ratio').trim()
      },
      stage: {
        mounted: !!box && box.offsetHeight > 0,
        h: box ? Math.round(box.offsetHeight) : 0,
        children: box ? box.childElementCount : 0
      },
      reduced: reduced,
      manifestSwapped: lastManifestSkin === active() && isV7(active())
    };
    return out;
  }

  window.SkinV7 = {
    ids: V7,
    sync: sync,
    audit: auditV7,
    state: function () { return { id: state.id, view: state.view, count: state.count, streak: state.streak }; },
    detail: function (on) { var box = document.getElementById('skinStage'); if (box) box.style.visibility = on ? '' : 'hidden'; }
  };
})();
