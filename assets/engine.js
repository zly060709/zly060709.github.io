/* 能量账本 · 计算引擎
   纯函数，不依赖 DOM 与存储，便于单独验证。
   核心：自适应 TDEE（用你自己的体重与摄入反推真实消耗）、区间估算、下一餐决策。
*/
(function (global) {
  'use strict';

  const DATA = global.LEDGER_DATA;
  const KCAL_PER_KG = 7700;
  const WINDOW = 28;

  /* ---------------- 日期 ---------------- */
  const pad = n => (n < 10 ? '0' + n : '' + n);
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateOf(key) { const p = key.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function todayKey() { return keyOf(new Date()); }
  function addDays(key, delta) {
    const p = key.split('-').map(Number);
    return keyOf(new Date(p[0], p[1] - 1, p[2] + delta));
  }
  function rangeKeys(endKey, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i));
    return out;
  }
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function weekday(key) { return WEEK[dateOf(key).getDay()]; }
  function isWeekend(key) { const w = dateOf(key).getDay(); return w === 0 || w === 6; }
  function dateLabel(key) {
    const p = key.split('-').map(Number);
    return p[1] + '月' + p[2] + '日';
  }
  function fullLabel(key) { return dateLabel(key) + ' · 周' + weekday(key); }
  function shortLabel(key) { const p = key.split('-'); return Number(p[1]) + '/' + Number(p[2]); }
  function daysBetween(a, b) { return Math.round((dateOf(b) - dateOf(a)) / 86400000); }
  function relativeDay(key, today) {
    if (key === today) return '今天';
    if (key === addDays(today, -1)) return '昨天';
    if (key === addDays(today, 1)) return '明天';
    return dateLabel(key);
  }

  /* ---------------- 食物库 ---------------- */
  const CATS = DATA.categories;
  const FOODS = DATA.foods.map((r, i) => ({
    id: 'f' + i,
    name: r[0],
    cat: r[1],
    catName: CATS[r[1]],
    kcal: r[2],
    p: r[3],
    c: r[4],
    f: r[5],
    fib: r[6],
    unitG: r[7] || 0,
    unit: r[8] || '',
    aliases: r[9] ? r[9].split('|') : [],
    custom: false
  }));

  const EXERCISES = DATA.exercises.map((r, i) => ({ id: 'e' + i, name: r[0], mets: r[1] }));
  const MEALS = DATA.meals;
  const ACTIVITIES = DATA.activities;

  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  function searchFoods(keyword, foods) {
    const pool = foods || FOODS;
    const q = norm(keyword);
    if (!q) return pool.slice(0, 40);
    const scored = [];
    pool.forEach(f => {
      let score = 0;
      const n = norm(f.name);
      if (n === q) score = 100;
      else if (n.indexOf(q) === 0) score = 80;
      else if (n.indexOf(q) > -1) score = 55;
      else if (f.aliases.some(a => norm(a).indexOf(q) > -1)) score = 45;
      else if (norm(f.catName).indexOf(q) > -1) score = 20;
      if (score) scored.push({ f, score });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 40).map(x => x.f);
  }
  function foodByName(name, foods) {
    const q = norm(name);
    const pool = foods || FOODS;
    return pool.find(f => norm(f.name) === q) ||
      pool.find(f => f.aliases.some(a => norm(a) === q)) ||
      pool.find(f => norm(f.name).replace(/（.*?）/g, '') === q) || null;
  }
  function mealLabel(key) { const m = MEALS.find(x => x[0] === key); return m ? m[1] : '一餐'; }
  function guessMeal(now) {
    const h = (now || new Date()).getHours();
    if (h < 10) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 21) return 'dinner';
    return 'snack';
  }

  /* ---------------- 目标 ---------------- */
  function targets(p, weightKg) {
    if (!p || !p.sex || !p.age || !p.height) return null;
    const w = Number(weightKg || p.weight || 65);
    const height = Number(p.height), age = Number(p.age);
    const base = 10 * w + 6.25 * height - 5 * age;
    const bmr = Math.round(p.sex === 'male' ? base + 5 : base - 161);
    const activity = ACTIVITIES.find(a => a[0] === p.activity) || ACTIVITIES[1];
    const priorTDEE = Math.round(bmr * activity[3]);
    const rate = Number(p.rate || 0.5);
    const goal = p.goal || 'lose';
    let deficit;
    if (goal === 'lose') deficit = Math.min(rate * KCAL_PER_KG / 7, priorTDEE * 0.22);
    else if (goal === 'gain') deficit = -Math.min(rate * KCAL_PER_KG / 7, priorTDEE * 0.15);
    else deficit = 0;
    deficit = Math.round(deficit);
    const floor = p.sex === 'male'
      ? Math.max(1500, Math.round(bmr * 0.92))
      : Math.max(1200, Math.round(bmr * 0.92));
    let budget = priorTDEE - deficit;
    if (budget < floor) { budget = floor; deficit = priorTDEE - budget; }
    const proteinPerKg = Number(p.proteinFactor) || (goal === 'lose' ? 1.6 : goal === 'gain' ? 1.8 : 1.4);
    return {
      bmr,
      priorTDEE,
      activity: activity[1],
      activityFactor: activity[3],
      deficit,
      floor,
      budgetPrior: Math.round(budget / 10) * 10,
      protein: Math.round(w * proteinPerKg),
      proteinPerKg,
      fiber: p.sex === 'male' ? 30 : 25,
      water: Math.round(w * 35 / 50) * 50,
      rate,
      goal,
      weight: w,
      capped: goal === 'lose' && rate * KCAL_PER_KG / 7 > priorTDEE * 0.22
    };
  }

  function budgetFor(tdee, tgt) {
    if (!tgt) return tdee;
    return Math.max(tgt.floor, Math.round((tdee - tgt.deficit) / 10) * 10);
  }

  /* ---------------- 线性回归 ---------------- */
  function regress(points) {
    const n = points.length;
    if (n < 2) return null;
    let mx = 0, my = 0;
    points.forEach(p => { mx += p.x; my += p.y; });
    mx /= n; my /= n;
    let sxx = 0, sxy = 0, syy = 0;
    points.forEach(p => {
      const dx = p.x - mx, dy = p.y - my;
      sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
    });
    if (!sxx) return null;
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const ssr = Math.max(0, syy - slope * sxy);
    const se = n > 2 ? Math.sqrt((ssr / (n - 2)) / sxx) : 0;
    return { slope, intercept, n, se, mx, my };
  }

  /* ---------------- 体重趋势（EMA） ---------------- */
  function weightMap(weights) {
    const map = {};
    (weights || []).forEach(w => {
      const kg = Number(w.kg != null ? w.kg : w.weight);
      if (!isFinite(kg) || kg <= 0) return;
      const k = w.date || w.dateKey;
      map[k] = kg;
    });
    return map;
  }

  function trendSeries(weights, startKey, endKey) {
    const map = weightMap(weights);
    const keys = Object.keys(map).sort();
    if (!keys.length) return [];
    const out = [];
    let tw = null;
    const begin = addDays(startKey, -14);
    for (let k = begin; k <= endKey; k = addDays(k, 1)) {
      if (map[k] != null) {
        tw = tw == null ? map[k] : tw + 0.22 * (map[k] - tw);
        out.push({ date: k, tw: tw, raw: map[k] });
      } else if (tw != null && k >= startKey) {
        out.push({ date: k, tw: tw, raw: null });
      }
    }
    return out;
  }

  function latestWeight(weights, profile) {
    const map = weightMap(weights);
    const keys = Object.keys(map).sort();
    if (keys.length) {
      const k = keys[keys.length - 1];
      return { kg: map[k], date: k };
    }
    return profile && profile.weight ? { kg: Number(profile.weight), date: null } : null;
  }

  /* ---------------- 自适应 TDEE ---------------- */
  function adaptive(entries, weights, profile, tgt, today) {
    const todayK = today || todayKey();
    const end = addDays(todayK, -1);
    const start = addDays(end, -(WINDOW - 1));
    const intakeMap = {};
    (entries || []).forEach(e => {
      const k = e.date || e.dateKey;
      if (k < start || k > end) return;
      intakeMap[k] = (intakeMap[k] || 0) + Math.max(0, Number(e.kcal) || 0);
    });
    const keys = rangeKeys(end, WINDOW);
    const validDays = keys.filter(k => intakeMap[k] >= 500);
    const meanIntake = validDays.length
      ? validDays.reduce((s, k) => s + intakeMap[k], 0) / validDays.length : 0;

    const wmap = weightMap(weights);
    const wpoints = Object.keys(wmap).filter(k => k >= addDays(start, -7) && k <= end)
      .sort().map(k => ({ x: daysBetween(start, k), y: wmap[k], key: k }));
    const reg = wpoints.length >= 4 ? regress(wpoints) : null;
    const span = wpoints.length ? daysBetween(wpoints[0].key, wpoints[wpoints.length - 1].key) : 0;

    let observed = null, w = 0, band = Math.round(tgt.priorTDEE * 0.12), status = 'prior';
    const enough = validDays.length >= 8 && wpoints.length >= 5 && span >= 12 && reg;
    if (enough) {
      observed = meanIntake - reg.slope * KCAL_PER_KG;
      const evidence = Math.min(validDays.length, Math.max(wpoints.length * 1.5, 8));
      w = Math.min(0.92, Math.max(0, evidence / 26));
      if (observed < tgt.priorTDEE * 0.72 || observed > tgt.priorTDEE * 1.4) {
        w = Math.min(w, 0.3);
      }
      observed = Math.max(tgt.priorTDEE * 0.72, Math.min(tgt.priorTDEE * 1.4, observed));
      band = Math.max(80, Math.min(900, Math.round(reg.se * 1.64 * KCAL_PER_KG)));
      status = w >= 0.55 ? 'calibrated' : 'calibrating';
    }
    const tdee = enough ? Math.round(observed * w + tgt.priorTDEE * (1 - w)) : tgt.priorTDEE;
    const evidenceDays = Math.min(validDays.length, Math.max(wpoints.length * 2, 0));
    const daysNeeded = Math.max(0, Math.min(18, 22 - evidenceDays));

    // 预测用斜率：最近 28 天全部体重点
    const recent = Object.keys(wmap).filter(k => k >= addDays(end, -27) && k <= end)
      .sort().map(k => ({ x: daysBetween(start, k), y: wmap[k], key: k }));
    const regRecent = recent.length >= 4 ? regress(recent) : reg;
    const latest = latestWeight(weights, profile);
    const series = trendSeries(weights, start, end);
    const trendNow = series.length ? series[series.length - 1].tw : (latest ? latest.kg : null);

    return {
      prior: tgt.priorTDEE,
      observed: observed == null ? null : Math.round(observed),
      tdee,
      band,
      weight: w,
      percent: Math.round(w * 100),
      status,
      validDays: validDays.length,
      weightDays: wpoints.length,
      spanDays: span,
      meanIntake: Math.round(meanIntake),
      daysNeeded,
      slope: regRecent && regRecent.slope ? regRecent.slope : 0,
      trendWeight: trendNow == null ? null : Math.round(trendNow * 10) / 10,
      budget: budgetFor(tdee, tgt),
      windowStart: start,
      windowEnd: end
    };
  }

  /* ---------------- 单日汇总与区间 ---------------- */
  const ERR = { high: 0.06, med: 0.16, low: 0.3 };
  function confOf(e) {
    if (e.conf) return e.conf;
    if (e.source === 'ai') return 'low';
    if (e.source === 'lib' || e.source === 'combo') return 'high';
    return 'med';
  }
  function summary(entries, dateKey) {
    const list = (entries || []).filter(e => (e.date || e.dateKey) === dateKey);
    const s = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, low: 0, high: 0, count: list.length, items: list, byMeal: {} };
    MEALS.forEach(m => { s.byMeal[m[0]] = { kcal: 0, p: 0, c: 0, f: 0, fib: 0, items: [], low: 0, high: 0 }; });
    list.forEach(e => {
      const kcal = Math.max(0, Number(e.kcal) || 0);
      const err = ERR[confOf(e)] != null ? ERR[confOf(e)] : 0.16;
      s.kcal += kcal;
      s.p += Number(e.p) || 0;
      s.c += Number(e.c) || 0;
      s.f += Number(e.f) || 0;
      s.fib += Number(e.fib) || 0;
      s.low += kcal * (1 - err);
      s.high += kcal * (1 + err);
      const m = s.byMeal[e.meal] || s.byMeal.snack;
      m.kcal += kcal;
      m.p += Number(e.p) || 0;
      m.c += Number(e.c) || 0;
      m.f += Number(e.f) || 0;
      m.fib += Number(e.fib) || 0;
      m.items.push(e);
      m.low += kcal * (1 - err);
      m.high += kcal * (1 + err);
    });
    s.low = Math.round(s.low);
    s.high = Math.round(s.high);
    s.kcal = Math.round(s.kcal);
    s.p = Math.round(s.p);
    s.c = Math.round(s.c);
    s.f = Math.round(s.f);
    s.fib = Math.round(s.fib);
    Object.keys(s.byMeal).forEach(k => {
      const m = s.byMeal[k];
      m.kcal = Math.round(m.kcal); m.p = Math.round(m.p); m.fib = Math.round(m.fib);
      m.low = Math.round(m.low); m.high = Math.round(m.high);
    });
    return s;
  }

  function burnedByDate(exercises, dateKey) {
    return (exercises || []).filter(x => (x.date || x.dateKey) === dateKey)
      .reduce((s, x) => s + Math.max(0, Number(x.kcal) || 0), 0);
  }

  function entryKcal(e, grams) {
    if (grams != null && e.per100 > 0) return Math.round(e.per100 * grams / 100);
    return Math.round(Number(e.kcal) || 0);
  }

  function streak(entries, today) {
    const days = new Set((entries || []).map(e => e.date || e.dateKey));
    let k = days.has(today) ? today : addDays(today, -1);
    if (!days.has(k)) return 0;
    let n = 0;
    while (days.has(k) && n < 999) { n++; k = addDays(k, -1); }
    return n;
  }

  /* ---------------- 预测 ---------------- */
  function forecast(weights, targetKg, today, windowDays) {
    const end = today || todayKey();
    const start = addDays(end, -(windowDays || 28) + 1);
    const map = weightMap(weights);
    const pts = Object.keys(map).filter(k => k >= start && k <= end).sort()
      .map(k => ({ x: daysBetween(start, k), y: map[k], key: k }));
    if (pts.length < 4 || daysBetween(pts[0].key, pts[pts.length - 1].key) < 10) return null;
    const reg = regress(pts);
    if (!reg) return null;
    const series = trendSeries(weights, start, end);
    const now = series.length ? series[series.length - 1].tw : pts[pts.length - 1].y;
    const weekly = reg.slope * 7;
    const fourWeek = now + reg.slope * 28;
    let etaDays = null;
    if (targetKg && Math.abs(targetKg - now) > 1 && Math.abs(reg.slope) > 0.002) {
      const toward = (targetKg - now) * reg.slope > 0;
      if (toward) etaDays = Math.round((targetKg - now) / reg.slope);
    }
    return {
      now: Math.round(now * 10) / 10,
      weekly: Math.round(weekly * 100) / 100,
      fourWeek: Math.round(fourWeek * 10) / 10,
      etaDays,
      slope: reg.slope,
      points: pts.length,
      start: start
    };
  }

  /* ---------------- 洞察 ---------------- */
  function insights(entries, weights, profile, tgt, ad, today, days) {
    const n = days || 14;
    const end = today || todayKey();
    const keys = rangeKeys(end, n);
    const daily = keys.map(k => {
      const s = summary(entries, k);
      return { date: k, kcal: s.kcal, p: s.p, fib: s.fib, logged: s.count > 0 };
    });
    const logged = daily.filter(d => d.logged);
    const avgIntake = logged.length ? Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length) : 0;
    const within = daily.filter(d => d.logged && d.kcal <= ad.budget * 1.03).length;
    const proteinHit = daily.filter(d => d.logged && d.p >= tgt.protein * 0.9).length;
    const avgProtein = logged.length ? Math.round(logged.reduce((s, d) => s + d.p, 0) / logged.length) : 0;
    const avgFiber = logged.length ? Math.round(logged.reduce((s, d) => s + d.fib, 0) / logged.length) : 0;

    const series = trendSeries(weights, keys[0], end);
    let delta = null;
    if (series.length > 3) delta = Math.round((series[series.length - 1].tw - series[0].tw) * 10) / 10;

    const wk = daily.filter(d => d.logged && !isWeekend(d.date));
    const we = daily.filter(d => d.logged && isWeekend(d.date));
    const wkAvg = wk.length ? Math.round(wk.reduce((s, d) => s + d.kcal, 0) / wk.length) : 0;
    const weAvg = we.length ? Math.round(we.reduce((s, d) => s + d.kcal, 0) / we.length) : 0;

    const coverage = Math.round(logged.length / n * 100);
    const narrative = [];
    if (logged.length < 4) {
      narrative.push('这段时间只记录了 ' + logged.length + ' 天，账本还不足以判断趋势。先把「记一天」变成习惯，校准会更快。');
    } else {
      narrative.push('过去 ' + n + ' 天你记账 ' + logged.length + ' 天，平均摄入 ' + avgIntake.toLocaleString() + ' kcal，'
        + (avgIntake <= ad.budget ? '比预算低 ' + (ad.budget - avgIntake) + ' kcal。' : '比预算高 ' + (avgIntake - ad.budget) + ' kcal。'));
      if (delta != null) {
        narrative.push('体重趋势' + (delta === 0 ? '基本持平' : (delta > 0 ? '上升 ' : '下降 ') + Math.abs(delta) + ' kg') + '。'
          + (ad.status === 'calibrated' ? '按 7,700 kcal/kg 反推，你的真实消耗约为 ' + ad.tdee + ' kcal/天，比公式估计'
            + (ad.tdee >= ad.prior ? '高 ' : '低 ') + Math.abs(ad.tdee - ad.prior) + ' kcal。' : '足够的体重与摄入记录之后，这里会给出你的真实消耗。'));
      }
      if (logged.length >= 5) {
        narrative.push('蛋白质平均 ' + avgProtein + ' g，达标 ' + proteinHit + ' 天；膳食纤维平均 ' + avgFiber + ' g。'
          + (avgProtein < tgt.protein * 0.85 ? '蛋白质是当前最值得补的一项。' : '蛋白质完成得不错。'));
      }
      if (wk.length >= 2 && we.length >= 2 && Math.abs(weAvg - wkAvg) > 80) {
        narrative.push('周末平均 ' + weAvg + ' kcal，工作日 ' + wkAvg + ' kcal，相差 ' + Math.abs(weAvg - wkAvg) + ' kcal——这是最明显的波动来源。');
      }
    }
    return {
      days: n, loggedDays: logged.length, coverage, avgIntake, within, proteinHit,
      avgProtein, avgFiber, delta, weekdayAvg: wkAvg, weekendAvg: weAvg,
      narrative, daily, budget: ad.budget
    };
  }

  /* ---------------- 下一餐 ---------------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r5(v) { return Math.round(v / 5) * 5; }

  function nextBite(opts) {
    const foods = opts.foods || FOODS;
    const remaining = Math.round(opts.remaining || 0);
    const gap = Math.max(0, Math.round(opts.proteinGap || 0));
    const meal = opts.meal || guessMeal();
    const seed = opts.seed || 0;

    if (remaining <= 0) {
      return { type: 'over', items: [], totals: { kcal: 0, p: 0 }, text: '今天已经超出预算。下一顿以蔬菜和蛋白质为主，主食减半就好。' };
    }
    if (remaining <= 140) {
      return { type: 'done', items: [], totals: { kcal: 0, p: 0 }, text: '预算基本用完。如果还饿，喝水或无糖茶，等下一餐。' };
    }

    const mealBudget = Math.min(remaining, clamp(remaining * 0.45, 220, 720));
    const prefer = {
      breakfast: { protein: /蛋|奶|酸奶|鸡胸/, carb: /燕麦|面包|馒头|吐司|贝果/, veg: true },
      lunch: { protein: /鸡|牛|猪|鱼|虾|豆腐|蛋/, carb: /米饭|面|藜麦|红薯|玉米|土豆/, veg: true },
      dinner: { protein: /鱼|虾|豆腐|鸡|牛|蛋/, carb: /红薯|玉米|糙米|米饭|面|南瓜/, veg: true },
      snack: { protein: /酸奶|牛奶|鸡蛋|豆浆/, carb: /面包|水果|玉米/, veg: false }
    }[meal] || { veg: true };

    const pPool = foods.filter(f => f.p >= 8 && f.kcal > 0 && [1, 2, 3].indexOf(f.cat) > -1);
    const cPool = foods.filter(f => f.cat === 0);
    const vPool = foods.filter(f => f.cat === 4);
    const lightPool = foods.filter(f => (f.cat === 5 || f.cat === 3 || f.cat === 6) && f.kcal > 0);

    function pick(pool, bonus) {
      if (!pool.length) return null;
      const scored = pool.map(f => {
        let s = (f.p / Math.max(f.kcal, 1)) * 100;
        if (bonus && bonus.test(f.name)) s += 12;
        s += (seed % 3) * 0.01;
        return { f, s };
      }).sort((a, b) => b.s - a.s);
      return scored[Math.min(seed, scored.length - 1)].f;
    }

    const proteinF = pick(pPool, prefer.protein);
    let carbF = pick(cPool, prefer.carb);
    let vegF = prefer.veg !== false ? pick(vPool, null) : null;

    if (!proteinF) return { type: 'empty', items: [], totals: { kcal: 0, p: 0 }, text: '食物库为空，先在设置里添加几种常吃的食物。' };

    const items = [];
    function add(f, grams) {
      grams = Math.max(5, r5(grams));
      const kcal = Math.round(f.kcal * grams / 100);
      items.push({
        name: f.name, grams, kcal,
        p: Math.round(f.p * grams / 100 * 10) / 10,
        c: Math.round(f.c * grams / 100 * 10) / 10,
        f: Math.round(f.f * grams / 100 * 10) / 10,
        fib: Math.round(f.fib * grams / 100 * 10) / 10,
        cat: f.catName, per100: f.kcal,
        p100: f.p, c100: f.c, f100: f.f, fib100: f.fib
      });
      return kcal;
    }

    let used = 0;
    const pNeed = clamp(Math.max(gap * 0.8, 18), 18, 48);
    let pGrams = clamp(pNeed * 100 / proteinF.p, 50, 220);
    used += add(proteinF, pGrams);
    if (vegF) {
      used += add(vegF, meal === 'snack' ? 100 : 180);
    }
    if (carbF) {
      const left = mealBudget - used - 40;
      let cGrams = clamp(left * 100 / carbF.kcal, 40, 240);
      used += add(carbF, cGrams);
    }
    // 预算过高时补一份水果/坚果
    if (used < mealBudget * 0.65 && remaining > 380 && lightPool.length) {
      const extra = pick(lightPool, null);
      if (extra && extra.id !== proteinF.id) used += add(extra, extra.unitG || 100);
    }
    // 超预算则先削减主食
    while (used > remaining * 1.03 && items.length > 1) {
      const idx = items.map((x, i) => ({ x, i })).filter(o => o.x.cat === '主食').map(o => o.i)[0];
      if (idx == null) break;
      const item = items[idx];
      if (item.grams <= 45) { used -= item.kcal; items.splice(idx, 1); break; }
      const cut = Math.min(30, item.grams - 40);
      const oldKcal = item.kcal;
      item.grams -= cut;
      item.kcal = Math.round(item.p100 && item.per100 ? item.per100 * item.grams / 100 : oldKcal);
      item.p = Math.round(item.p100 * item.grams / 100 * 10) / 10;
      item.c = Math.round(item.c100 * item.grams / 100 * 10) / 10;
      item.f = Math.round(item.f100 * item.grams / 100 * 10) / 10;
      item.fib = Math.round(item.fib100 * item.grams / 100 * 10) / 10;
      used -= oldKcal - item.kcal;
    }
    // 仍然超出：削减蛋白来源（最少 40g）
    let guard = 0;
    while (used > remaining * 1.03 && guard < 12) {
      guard++;
      const idx = items.map((x, i) => ({ x, i })).filter(o => o.x.p100 >= 8).map(o => o.i)[0];
      if (idx == null) break;
      const item = items[idx];
      if (item.grams <= 45) { used -= item.kcal; items.splice(idx, 1); break; }
      const cut = Math.min(15, item.grams - 40);
      const oldKcal = item.kcal;
      item.grams -= cut;
      item.kcal = Math.round(item.per100 * item.grams / 100);
      item.p = Math.round(item.p100 * item.grams / 100 * 10) / 10;
      item.c = Math.round(item.c100 * item.grams / 100 * 10) / 10;
      item.f = Math.round(item.f100 * item.grams / 100 * 10) / 10;
      item.fib = Math.round(item.fib100 * item.grams / 100 * 10) / 10;
      used -= oldKcal - item.kcal;
    }

    const totalKcal = items.reduce((s, x) => s + x.kcal, 0);
    const totalP = Math.round(items.reduce((s, x) => s + x.p, 0) * 10) / 10;
    const pct = Math.round(totalKcal / Math.max(1, remaining) * 100);
    let text;
    if (gap > 15) text = '蛋白质还差 ' + gap + ' g，这一组能补 ' + totalP + ' g，约占今日剩余的 ' + pct + '%。';
    else if (remaining > 600) text = '蛋白已接近目标，这组以稳定血糖和饱腹为主，约占今日剩余的 ' + pct + '%。';
    else text = '这一组刚好收尾，约占今日剩余的 ' + pct + '%。';

    return {
      type: 'plan', meal, items, totals: { kcal: totalKcal, p: totalP },
      text, mealBudget, remaining, proteinGap: gap
    };
  }

  /* ---------------- 组合/示例 ---------------- */
  function toFood(row) {
    return {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: row.name, cat: row.cat == null ? 0 : row.cat,
      catName: CATS[row.cat] || '自定义',
      kcal: Number(row.kcal) || 0, p: Number(row.p) || 0, c: Number(row.c) || 0,
      f: Number(row.f) || 0, fib: Number(row.fib) || 0,
      unitG: Number(row.unitG) || 0, unit: row.unit || '', aliases: [], custom: true
    };
  }

  function burn(mets, kg, minutes) {
    return Math.round(Number(mets) * Number(kg) * (Number(minutes) / 60) * 1.05);
  }

  global.Engine = {
    KCAL_PER_KG, ERR, CATS, FOODS, EXERCISES, MEALS, ACTIVITIES,
    keyOf, dateOf, todayKey, addDays, rangeKeys, weekday, isWeekend, dateLabel, fullLabel,
    shortLabel, daysBetween, relativeDay,
    searchFoods, foodByName, mealLabel, guessMeal, norm,
    targets, budgetFor, regress, weightMap, trendSeries, latestWeight,
    adaptive, summary, burnedByDate, entryKcal, streak, forecast, insights, nextBite,
    toFood, burn, confOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
