/* 能量账本 · v3.2 扩展层
   纯逻辑：力量训练 PR、菜谱/购物清单合并、周报卡片绘制、可穿戴解析、照片压缩与 IndexedDB。
   不直接读写 localStorage；所有业务数据由 app.js 统一保存。 */
(function (global) {
  'use strict';

  /* ============================================================
     力量训练：Epley 1RM 与 PR
     ============================================================ */
  function epley(weight, reps) {
    const w = Number(weight) || 0;
    const r = Math.max(1, Number(reps) || 1);
    return Math.round(w * (1 + r / 30) * 10) / 10;
  }

  function prStats(lifts) {
    const groups = {};
    (lifts || []).forEach(x => {
      const name = String(x.exercise || '').trim();
      if (!name) return;
      const w = Number(x.weight) || 0;
      const r = Math.max(1, Number(x.reps) || 1);
      const g = groups[name] || (groups[name] = { exercise: name, bestWeight: 0, bestReps: 0, bestE1rm: 0, sets: 0, lastDate: '' });
      g.sets += 1;
      if (w > g.bestWeight || (w === g.bestWeight && r > g.bestReps)) {
        g.bestWeight = w;
        g.bestReps = r;
      }
      if (w > 0) g.bestE1rm = Math.max(g.bestE1rm, epley(w, r));
      if ((x.date || '') > g.lastDate) g.lastDate = x.date || '';
    });
    return Object.keys(groups).map(k => groups[k]).sort((a, b) => b.bestE1rm - a.bestE1rm);
  }

  function liftCSV(lifts) {
    const rows = [['日期', '动作', '组数', '重量kg', '次数', '估算1RMkg', '备注']];
    (lifts || []).slice().sort((a, b) => ((a.date || '') + (a.createdAt || 0)) < ((b.date || '') + (b.createdAt || 0)) ? -1 : 1).forEach(x => {
      rows.push([x.date || '', x.exercise || '', x.sets || 0, x.weight || 0, x.reps || 0, epley(x.weight, x.reps), x.note || '']);
    });
    return '\uFEFF' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  }

  /* ============================================================
     菜谱 / 购物清单
     ============================================================ */
  function shoppingFromRecipe(recipe) {
    const map = {};
    (recipe && recipe.items || []).forEach(it => {
      const name = String(it.name || '').trim();
      if (!name) return;
      const grams = Number(it.grams) || 0;
      if (!map[name]) map[name] = { name: name, grams: 0, checked: false };
      map[name].grams += grams;
    });
    return Object.keys(map).map(k => map[k]);
  }

  /* ============================================================
     可穿戴导入
     ============================================================ */
  function parseCSVRows(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const firstLine = clean.