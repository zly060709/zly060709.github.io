/* 能量账本 · 性别配置（v3.1）
   两套完整的文案与默认参数集中在这里，避免在业务代码里散落 if。
   未选择性别时按女性版呈现（与 v3.0 行为一致），老用户不受影响。
   女性版文案保持原样；男性版为对等的「训练 / 恢复 / 营养」表述，
   不复用经期、黄体、乳房胀痛等女性专属内容。 */
(function (global) {
  'use strict';

  const PROFILES = {
    female: {
      key: 'female',
      label: '女生',
      marker: '女',
      avatar: '女',
      cycleEnabled: true,
      numbers: { iron: 20, ironOlder: 12, calcium: 800, calciumOlder: 1000, vd: 10, vdOlder: 15, folate: 400 },
      body: {
        sub: '周期、围度、状态与营养，只保存在本机',
        disclaimer: '周期相位为估算，不用于避孕或诊断；营养目标为参考值。身体不适请咨询医生。',
        measureHint: '体重不动时，围度可能已经在变。',
        measureEmpty: '还没有围度记录。不需要每天量，两周一次就够。',
        checkinNote: '这些记录只用于帮你看见模式：黄体期更馋、睡不好更想吃、压力大更想甜食。它们不是意志力问题。',
        reportSub: '最近 8 周体重、摄入、周期、症状、围度与补剂。',
        symptoms: ['腹痛', '腹胀', '头痛', '疲劳', '睡眠差', '情绪波动', '腰酸', '乳房胀痛']
      },
      cycle: {
        title: '周期感知',
        offSub: '可选。记录后，经期水分不会被误判成脂肪。',
        offEmpty: '不记录也完全能用。开启后可以看见相位、经期窗口和更干净的体重趋势。',
        offBtn: '开启周期记录',
        missingCopy: '经期开始日期还没填，或日期在未来。',
        currentLabel: '当前周期',
        meta: function (ci) { return '周期 ' + ci.length + ' 天 · 距下次月经约 ' + ci.daysToNext + ' 天'; },
        periodBtn: '今天来月经了',
        adjustBtn: '调整周期',
        excluded: function (n) { return '本次代谢校准已排除 ' + n + ' 次经期/黄体末期体重，避免水分干扰。'; },
        todayLine: function (ci) { return '周期第 ' + ci.day + ' 天 · ' + ci.phaseLabel + ' · 距下次约 ' + ci.daysToNext + ' 天'; }
      },
      nutrients: {
        iron: '经期失血会提高需求',
        calcium: '骨骼与围绝经期',
        vd: '与钙一起看',
        folate: '绿叶菜与豆类'
      },
      coachSuggestions: ['今天还能吃什么？', '为什么体重这几天不动？', '晚饭怎么补够蛋白？', '经期前总是馋，怎么安排？'],
      coachKeyHint: '今天还能吃什么 / 为什么体重不动 / 经期前馋',
      coachContext: '当天摄入、7 天均值、体重趋势、周期相位、状态与营养缺口；不发送原始记录列表。',
      settings: {
        bodyGroupTitle: '身体与周期',
        bodyGroupSub: '周期、围度、状态、营养，只保存在本机'
      },
      report: { cycleHeading: '周期与症状', symptomHeading: '症状记录' }
    },
    male: {
      key: 'male',
      label: '男生',
      marker: '男',
      avatar: '男',
      cycleEnabled: false,
      numbers: { iron: 12, ironOlder: 12, calcium: 800, calciumOlder: 1000, vd: 10, vdOlder: 15, folate: 400 },
      body: {
        sub: '训练、围度、状态与营养，只保存在本机',
        disclaimer: '围度与体重会受训练、盐分与水分影响；营养目标为参考值。身体不适请咨询医生。',
        measureHint: '体重不动时，围度或训练表现可能已经在变。',
        measureEmpty: '还没有围度记录。两周量一次就够，训练日与休息日尽量固定时间。',
        checkinNote: '这些记录只用于帮你看见模式：训练量大更饿、睡不好更想吃、压力大更想甜食。它们不是意志力问题。',
        reportSub: '最近 8 周体重、摄入、训练、症状、围度与补剂。',
        symptoms: ['肌肉酸痛', '疲劳', '睡眠差', '压力大', '腹胀', '头痛', '食欲增加', '训练状态差']
      },
      recovery: {
        title: '训练与恢复',
        sub: '体重会受训练、盐分与水分影响，不必把每次波动都当成脂肪。',
        empty: '这里不做激素周期估算。记录训练、围度与状态，就能看见自己的恢复节奏。',
        hint: '大重量训练后 1–2 天的体重上浮多为水分与糖原，不代表脂肪增加；账本会看 2–4 周的趋势。',
        checkinBtn: '记录今天的状态',
        measureBtn: '记录围度'
      },
      nutrients: {
        iron: '日常需求；大量耐力训练会略增',
        calcium: '骨骼与力量训练',
        vd: '与钙一起看，室内训练更要注意',
        folate: '绿叶菜与豆类'
      },
      coachSuggestions: ['今天还能吃什么？', '为什么体重这几天不动？', '训练后怎么补够蛋白？', '晚上有应酬怎么记？'],
      coachKeyHint: '今天还能吃什么 / 为什么体重不动 / 训练后补蛋白',
      coachContext: '当天摄入、7 天均值、体重趋势、训练与状态、营养缺口；不发送原始记录列表。',
      settings: {
        bodyGroupTitle: '身体与训练',
        bodyGroupSub: '围度、状态、营养，只保存在本机'
      },
      report: { cycleHeading: '训练与症状', symptomHeading: '症状记录' }
    }
  };

  function normalize(sex) {
    return sex === 'male' ? 'male' : 'female';
  }

  function of(profileOrSex) {
    const sex = typeof profileOrSex === 'string' ? profileOrSex : (profileOrSex && profileOrSex.sex);
    return PROFILES[normalize(sex)];
  }

  function numbers(sex) {
    return of(sex).numbers;
  }

  function label(sex) {
    return of(sex).label;
  }

  global.Gender = { PROFILES, normalize, of, numbers, label };
})(typeof window !== 'undefined' ? window : globalThis);
