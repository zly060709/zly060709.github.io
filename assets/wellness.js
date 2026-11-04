/* 能量账本 · 身体与周期模块
   周期相位、经期水分窗口、关键营养、饮食偏好过滤、就诊摘要。
   纯计算，不直接操作 DOM。 */
(function (global) {
  'use strict';
  const E = global.Engine;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round1 = n => Math.round(n * 10) / 10;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (isFinite(Number(n)) ? Math.round(Number(n)).toLocaleString('en-US') : '—');

  /* ---------------- 周期 ---------------- */
  const PHASES = {
    menstrual: { key: 'menstrual', label: '经期', short: '经期', color: '#B86B5E' },
    follicular: { key: 'follicular', label: '卵泡期', short: '卵泡', color: '#7FA98A' },
    ovulation: { key: 'ovulation', label: '排卵期', short: '排卵', color: '#C79A52' },
    luteal: { key: 'luteal', label: '黄体期', short: '黄体', color: '#9B8AAE' }
  };

  function cleanCycle(cycle) {
    if (!cycle || !cycle.enabled || !cycle.lastStart) return null;
    const length = clamp(Math.round(Number(cycle.length) || 28), 21, 40);
    const periodLength = clamp(Math.round(Number(cycle.periodLength) || 5), 2, 10);
    return {
      enabled: true,
      lastStart: cycle.lastStart,
      length,
      periodLength,
      history: Array.isArray(cycle.history) ? cycle.history.slice(-12) : []
    };
  }

  function phaseFromDay(day, length, periodLength) {
    const ovulation = length - 14;
    if (day <= periodLength) return PHASES.menstrual;
    if (day < ovulation) return PHASES.follicular;
    if (day <= ovulation + 1) return PHASES.ovulation;
    return PHASES.luteal;
  }

  function cycleInfo(cycle, today) {
    const c = cleanCycle(cycle);
    if (!c) return null;
    const date = today || E.todayKey();
    const diff = E.daysBetween(c.lastStart, date);
    if (diff < 0) return null;
    const cycleIndex = Math.floor(diff / c.length);
    const day = (diff - cycleIndex * c.length) + 1;
    const nextStart = E.addDays(c.lastStart, (cycleIndex + 1) * c.length);
    const phase = phaseFromDay(day, c.length, c.periodLength);
    return {
      phase: phase.key,
      phaseLabel: phase.label,
      phaseShort: phase.short,
      color: phase.color,
      day: day,
      length: c.length,
      periodLength: c.periodLength,
      nextStart: nextStart,
      daysToNext: E.daysBetween(date, nextStart),
      cycleIndex: cycleIndex,
      lastStart: c.lastStart
    };
  }

  function phaseForDate(date, cycle) {
    const c = cleanCycle(cycle);
    if (!c) return null;
    let diff = E.daysBetween(c.lastStart, date);
    const idx = Math.floor(diff / c.length);
    const day = diff - idx * c.length + 1;
    const phase = phaseFromDay(day, c.length, c.periodLength);
    return {
      phase: phase.key,
      phaseLabel: phase.label,
      phaseShort: phase.short,
      color: phase.color,
      day: day,
      length: c.length,
      periodLength: c.periodLength
    };
  }

  // 经期 + 黄体最后 5 天视为水分窗口，自适应 TDEE 校准时排除
  function isWaterWindow(date, cycle) {
    const p = phaseForDate(date, cycle);
    if (!p) return false;
    if (p.phase === 'menstrual') return true;
    return p.phase === 'luteal' && p.day >= p.length - 4;
  }

  function filterWeights(weights, cycle) {
    const c = cleanCycle(cycle);
    if (!c || !weights || !weights.length) return { weights: weights || [], excluded: 0 };
    const kept = [];
    let excluded = 0;
    weights.forEach(w => {
      if (isWaterWindow(w.date, c)) excluded++;
      else kept.push(w);
    });
    // 排除后样本太少就退回全部，避免把校准做废
    if (kept.length < 5) return { weights: weights, excluded: 0, fallback: true };
    return { weights: kept, excluded, fallback: false };
  }

  function cycleStrip(keys, cycle) {
    const c = cleanCycle(cycle);
    if (!c) return [];
    return keys.map(k => {
      const p = phaseForDate(k, c);
      return { date: k, phase: p.phase, label: p.phaseShort, color: p.color, day: p.day };
    });
  }

  /* ---------------- 关键营养（每 100g，参考值） ---------------- */
  // [铁 mg, 钙 mg, 维生素D µg, 叶酸 µg]
  const NUTRIENTS = {
    '米饭（熟）': [0.3, 7, 0, 3],
    '糙米饭（熟）': [0.8, 10, 0, 20],
    '杂粮饭（熟）': [1.0, 15, 0, 25],
    '藜麦（熟）': [1.5, 17, 0, 42],
    '燕麦片（干）': [4.3, 54, 0, 30],
    '全麦面包': [2.5, 40, 0, 30],
    '白吐司': [1.0, 30, 0, 20],
    '面条（熟）': [0.6, 10, 0, 10],
    '荞麦面（熟）': [1.0, 15, 0, 20],
    '玉米（煮）': [1.1, 10, 0, 25],
    '红薯（蒸）': [0.6, 30, 0, 11],
    '紫薯（蒸）': [0.8, 25, 0, 10],
    '土豆（蒸）': [0.8, 12, 0, 15],
    '鸡胸肉（熟）': [0.7, 11, 0.1, 4],
    '鸡腿肉（去皮熟）': [0.9, 12, 0.1, 5],
    '鸡蛋': [1.8, 56, 1.1, 47],
    '蛋白': [0.1, 7, 0, 20],
    '蛋黄': [2.7, 129, 5.4, 150],
    '瘦牛肉（熟）': [2.6, 10, 0.1, 8],
    '猪里脊（熟）': [1.6, 6, 0.1, 5],
    '猪肝': [22.6, 6, 1.0, 300],
    '鸭血': [30.5, 5, 0, 10],
    '羊肉（瘦熟）': [2.3, 12, 0.1, 6],
    '三文鱼': [0.8, 9, 11, 26],
    '鲈鱼（清蒸）': [1.5, 50, 2, 10],
    '带鱼': [1.2, 28, 3, 10],
    '鳕鱼': [0.6, 42, 1.5, 10],
    '基围虾': [1.5, 60, 0.1, 20],
    '虾仁': [1.5, 60, 0.1, 20],
    '金枪鱼罐头': [1.0, 10, 2, 5],
    '生蚝': [5.0, 131, 0, 10],
    '蛤蜊': [22.0, 130, 0, 15],
    '海带（鲜）': [0.8, 168, 0, 20],
    '紫菜（干）': [54.9, 264, 0, 100],
    '北豆腐': [1.9, 138, 0, 20],
    '豆腐干': [4.9, 308, 0, 20],
    '腐竹': [16.5, 77, 0, 50],
    '豆浆（无糖）': [0.4, 15, 0, 10],
    '黄豆（干）': [8.2, 191, 0, 130],
    '毛豆': [3.5, 135, 0, 60],
    '红豆（熟）': [5.2, 74, 0, 100],
    '鹰嘴豆（熟）': [2.9, 49, 0, 172],
    '牛奶（全脂）': [0.1, 104, 0.1, 5],
    '低脂牛奶': [0.1, 110, 0.1, 5],
    '脱脂牛奶': [0.1, 120, 0.1, 5],
    '无糖酸奶': [0.1, 118, 0.1, 7],
    '希腊酸奶': [0.1, 110, 0, 10],
    '奶酪': [0.5, 720, 0.5, 20],
    '菠菜': [2.7, 99, 0, 194],
    '西兰花': [0.7, 47, 0, 63],
    '小白菜': [1.5, 105, 0, 60],
    '油麦菜': [1.2, 70, 0, 80],
    '木耳（泡发）': [5.5, 34, 0, 10],
    '芦笋': [1.4, 24, 0, 52],
    '秋葵': [0.8, 82, 0, 60],
    '番茄': [0.4, 10, 0, 15],
    '胡萝卜': [1.0, 32, 0, 19],
    '菜花': [1.0, 22, 0, 57],
    '猕猴桃': [0.3, 34, 0, 60],
    '橙子': [0.1, 40, 0, 30],
    '草莓': [0.4, 16, 0, 24],
    '牛油果': [0.5, 12, 0, 81],
    '红枣（干）': [2.3, 64, 0, 10],
    '杏仁': [3.7, 269, 0, 50],
    '芝麻酱': [10.0, 1170, 0, 50],
    '黑巧克力': [11.0, 90, 0, 20],
    '南瓜子': [8.0, 50, 0, 50],
    '花生': [2.5, 50, 0, 80],
    '核桃': [2.9, 98, 0, 50]
  };

  function nutrientTargets(profile) {
    const p = profile || {};
    const age = Number(p.age) || 30;
    const older = age >= 50;
    const gn = (typeof window !== 'undefined' && window.Gender) ? window.Gender.numbers(p.sex) : null;
    if (gn) {
      return {
        iron: older ? gn.ironOlder : gn.iron,
        calcium: older ? gn.calciumOlder : gn.calcium,
        vd: older ? gn.vdOlder : gn.vd,
        folate: gn.folate
      };
    }
    const female = p.sex === 'female';
    return {
      iron: female ? (older ? 12 : 20) : 12,
      calcium: older ? 1000 : 800,
      vd: older ? 15 : 10,
      folate: 400
    };
  }

  function nutrientTotals(entries, supplements) {
    const totals = { iron: 0, calcium: 0, vd: 0, folate: 0 };
    (entries || []).forEach(e => {
      const n = NUTRIENTS[e.name];
      if (!n) return;
      const g = (Number(e.grams) || 100) / 100;
      totals.iron += n[0] * g;
      totals.calcium += n[1] * g;
      totals.vd += n[2] * g;
      totals.folate += n[3] * g;
    });
    (supplements || []).forEach(s => {
      totals.iron += Number(s.iron) || 0;
      totals.calcium += Number(s.calcium) || 0;
    });
    return {
      iron: round1(totals.iron),
      calcium: Math.round(totals.calcium),
      vd: round1(totals.vd),
      folate: Math.round(totals.folate)
    };
  }

  /* ---------------- 饮食偏好过滤 ---------------- */
  const MEAT_RE = /(鸡胸|鸡腿|鸡翅|牛肉|牛腩|猪|羊|鸭|排骨|五花|培根|火腿|午餐肉|香肠|肉丸|炸鸡|肝|血|三文鱼|鲈鱼|带鱼|鳕鱼|巴沙鱼|虾|蟹|蚝|鱿鱼|蛤蜊|金枪鱼)/;
  const DAIRY_RE = /(牛奶|酸奶|奶酪|芝士|奶油|黄油|拿铁|卡布奇诺|摩卡|冰淇淋|奶茶|乳酪|乳清)/;
  const GLUTEN_RE = /(面条|面包|馒头|花卷|饺子|馄饨|包子|油条|煎饼|烧饼|饼干|蛋糕|披萨|意大利面|吐司|贝果|燕麦|曲奇|泡芙|小笼包|肉夹馍|手抓饼|烤冷面)/;
  const PORK_RE = /(猪|培根|火腿|香肠|午餐肉|排骨|五花|猪蹄|猪肝)/;

  function filterFoods(foods, prefs) {
    const p = prefs || {};
    const active = p.vegetarian || p.lactoseFree || p.glutenFree || p.halal;
    if (!active) return foods;
    return (foods || []).filter(f => {
      const n = String(f.name || '');
      if (p.vegetarian && MEAT_RE.test(n)) return false;
      if (p.lactoseFree && DAIRY_RE.test(n)) return false;
      if (p.glutenFree && GLUTEN_RE.test(n)) return false;
      if (p.halal && PORK_RE.test(n)) return false;
      return true;
    });
  }

  function prefsLabels(prefs) {
    const p = prefs || {};
    const out = [];
    if (p.vegetarian) out.push('素食');
    if (p.lactoseFree) out.push('无乳糖');
    if (p.glutenFree) out.push('无麸质');
    if (p.halal) out.push('清真');
    return out;
  }

  /* ---------------- 就诊摘要 ---------------- */
  function reportHTML(data) {
    const d = data || {};
    const end = d.today || E.todayKey();
    const start = E.addDays(end, -55);
    const keys = E.rangeKeys(end, 56);
    const entries = (d.entries || []).filter(e => (e.date || e.dateKey) >= start && (e.date || e.dateKey) <= end);
    const weights = (d.weights || []).filter(w => w.date >= start && w.date <= end).sort((a, b) => a.date < b.date ? -1 : 1);
    const measures = (d.measures || []).filter(m => m.date >= start).sort((a, b) => a.date < b.date ? -1 : 1);
    const checkins = (d.checkins || []).filter(c => c.date >= start).sort((a, b) => a.date < b.date ? -1 : 1);
    const supplements = (d.supplements || []).filter(s => s.date >= start);
    const p = d.profile || {};
    const t = d.targets || {};
    const ad = d.adaptive || {};
    const daily = {};
    entries.forEach(e => { daily[e.date] = (daily[e.date] || 0) + (Number(e.kcal) || 0); });
    const logged = keys.filter(k => daily[k] > 0);
    const avgIntake = logged.length ? Math.round(logged.reduce((s, k) => s + daily[k], 0) / logged.length) : 0;
    const avgProtein = logged.length ? Math.round(entries.filter(e => daily[e.date]).reduce((s, e) => s + (Number(e.p) || 0), 0) / logged.length) : 0;
    const gc = d.gender || ((typeof window !== 'undefined' && window.Gender) ? window.Gender.of(p.sex) : null);
    const genderCycle = !!(gc && gc.cycleEnabled);
    const cycleOn = !!(genderCycle && d.cycle && d.cycle.enabled);
    const ci = cycleOn ? cycleInfo(d.cycle, end) : null;
    const exercises = (d.exercises || []).filter(x => x.date >= start && x.date <= end);
    const exMinutes = exercises.reduce((s, x) => s + (Number(x.minutes) || 0), 0);
    const exNames = exercises.slice(-3).map(x => x.name + ' ' + (x.minutes || 0) + ' 分钟').join('、');
    const latestMeasure = measures.length ? measures[measures.length - 1] : null;
    const symptomCounts = {};
    checkins.forEach(c => (c.symptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; }));
    const symptomText = Object.keys(symptomCounts).map(s => s + '×' + symptomCounts[s]).join('、') || '无记录';
    const phaseRows = cycleOn ? keys.map(k => {
      const ph = phaseForDate(k, d.cycle);
      return ph ? E.shortLabel(k) + ' ' + ph.phaseLabel : '';
    }).filter(Boolean) : [];

    const rows = weights.map(w => '<tr><td>' + esc(w.date) + '</td><td>' + round1(w.kg) + '</td></tr>').join('');
    const cycleRows = (d.cycle && d.cycle.history || []).slice(-5).reverse().map(s => '<li>' + esc(s) + '</li>').join('');
    const measureText = latestMeasure ?
      ('腰围 ' + (latestMeasure.waist || '—') + ' cm · 臀围 ' + (latestMeasure.hip || '—') + ' cm · 大腿 ' + (latestMeasure.thigh || '—') + ' cm（' + latestMeasure.date + '）') : '无记录';
    const supplementText = supplements.length ? supplements.map(s => esc(s.name) + (s.iron ? ' 铁 ' + s.iron + 'mg' : '') + (s.calcium ? ' 钙 ' + s.calcium + 'mg' : '')).join('；') : '无记录';
    const weightDelta = weights.length > 1 ? round1(weights[weights.length - 1].kg - weights[0].kg) : null;

    return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>能量账本 · 就诊摘要</title>' +
      '<style>' +
      'body{font:14px/1.7 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1d2a23;background:#f7f5ee;margin:0;padding:32px}' +
      '.page{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2ddce;border-radius:12px;padding:32px 36px}' +
      'h1{font-family:Georgia,"Songti SC",serif;font-size:26px;margin:0 0 4px}' +
      'h2{font-family:Georgia,"Songti SC",serif;font-size:16px;margin:24px 0 8px;border-bottom:1px solid #e2ddce;padding-bottom:5px}' +
      '.sub{color:#8a948b;font-size:12px;margin-bottom:18px}' +
      'table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #eee;padding:5px 6px;text-align:left}th{color:#8a948b;font-weight:500}' +
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:13px}.k{color:#8a948b}.v{font-weight:600}' +
      '.note{color:#8a948b;font-size:11px;line-height:1.8;margin-top:24px;border-top:1px dashed #e2ddce;padding-top:14px}' +
      '.print{position:fixed;right:20px;top:20px;background:#2c6b51;color:#fff;border:0;border-radius:8px;padding:9px 16px;cursor:pointer}' +
      '@media print{body{background:#fff;padding:0}.page{border:0;padding:0}.print{display:none}}' +
      '</style></head><body><button class="print" onclick="window.print()">打印 / 另存为 PDF</button><div class="page">' +
      '<h1>能量账本 · 就诊摘要</h1><div class="sub">生成于 ' + esc(end) + ' · 最近 8 周 · 由本人记录，仅作就诊参考</div>' +
      '<div class="grid">' +
        '<div><span class="k">性别 / 年龄</span> <span class="v">' + (p.sex === 'male' ? '男' : '女') + ' / ' + (p.age || '—') + ' 岁</span></div>' +
        '<div><span class="k">身高 / 当前体重</span> <span class="v">' + (p.height || '—') + ' cm / ' + (weights.length ? weights[weights.length - 1].kg : (p.weight || '—')) + ' kg</span></div>' +
        '<div><span class="k">目标</span> <span class="v">' + ({ lose: '减脂', maintain: '维持', gain: '增肌' }[p.goal] || '—') + ' · 目标体重 ' + (p.targetWeight || '—') + ' kg</span></div>' +
        '<div><span class="k">当前校准消耗</span> <span class="v">' + (ad.tdee ? ad.tdee + ' ± ' + ad.band + ' kcal' : '数据不足') + '</span></div>' +
        '<div><span class="k">每日预算 / 蛋白质目标</span> <span class="v">' + (t.budget || ad.budget || '—') + ' kcal / ' + (t.protein || '—') + ' g</span></div>' +
        '<div><span class="k">体重变化（8 周）</span> <span class="v">' + (weightDelta == null ? '—' : (weightDelta > 0 ? '+' : '') + weightDelta + ' kg') + '</span></div>' +
      '</div>' +
      '<h2>体重记录</h2>' + (rows ? '<table><tr><th>日期</th><th>体重 kg</th></tr>' + rows + '</table>' : '<p>无记录</p>') +
      '<h2>摄入与营养（有记录日平均）</h2><div class="grid">' +
        '<div><span class="k">平均摄入</span> <span class="v">' + fmt(avgIntake) + ' kcal</span></div>' +
        '<div><span class="k">平均蛋白质</span> <span class="v">' + fmt(avgProtein) + ' g</span></div>' +
        '<div><span class="k">记录天数</span> <span class="v">' + logged.length + ' / 56</span></div>' +
        (genderCycle
          ? '<div><span class="k">当前周期</span> <span class="v">' + (ci ? ci.phaseLabel + ' 第 ' + ci.day + ' 天，距下次 ' + ci.daysToNext + ' 天' : '未记录') + '</span></div>'
          : '<div><span class="k">近 8 周训练</span> <span class="v">' + (exercises.length ? exercises.length + ' 次 · ' + exMinutes + ' 分钟' : '无记录') + '</span></div>') +
      '</div>' +
      (genderCycle
        ? '<h2>' + gc.report.cycleHeading + '</h2>' +
          '<p>最近经期开始：' + ((d.cycle && d.cycle.history || []).slice(-1)[0] || '—') + ' · 周期长度 ' + ((d.cycle && d.cycle.length) || '—') + ' 天</p>' +
          (cycleRows ? '<ul>' + cycleRows + '</ul>' : '') +
          '<p>症状记录：' + esc(symptomText) + '</p>'
        : '<h2>' + gc.report.cycleHeading + '</h2>' +
          '<p>训练记录：' + (exercises.length ? exercises.length + ' 次 · 共 ' + exMinutes + ' 分钟' + (exNames ? '；最近：' + exNames : '') : '无记录') + '</p>' +
          '<p>症状记录：' + esc(symptomText) + '</p>') +
      '<h2>围度与补剂</h2><p>' + esc(measureText) + '</p><p>' + supplementText + '</p>' +
      (genderCycle ? '<h2>周期相位（按日）</h2><p style="font-size:11px;color:#8a948b">' + esc(phaseRows.join('；') || '未开启周期记录') + '</p>' : '') +
      '<div class="note">数据由用户自行记录，热量与营养值为估算；本摘要不构成诊断或治疗建议。用药、补剂与症状请以医生意见为准。</div>' +
      '</div></body></html>';
  }

  global.Wellness = {
    PHASES, cleanCycle, phaseFromDay, cycleInfo, phaseForDate, isWaterWindow,
    filterWeights, cycleStrip, NUTRIENTS, nutrientTargets, nutrientTotals,
    filterFoods, prefsLabels, reportHTML
  };
})(typeof window !== 'undefined' ? window : globalThis);
