# -*- coding: utf-8 -*-
"""v5.6 交付 A · 全池 100 套皮肤五通道差异化审计。

五通道签名：
  ① stage   舞台场景指纹（场景串归一化后 sha1 前 8 位）
  ② emblem  页头徽记字（全池唯一 = 1 秒辨识度锚点）
  ③ shape   卡片形状语言（圆角签名）
  ④ tab     tabbar 选中指示形状
  ⑤ motion  签名动效签名（族/时长/相位）

判定：任何两套共享 ≥3 通道同值 → 记为同质对（clones），必须就地把弱者改出差异；
任一通道缺失 → 记入 debts。产物：assets/skins/distinct-report.json（v8-harness 面板消费）。
运行：python tools/audit_distinct.py   （在仓库根目录执行）
"""
import hashlib
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ident_tables import IDENT7, IDENT6, mo7, mo6, mo40, TAB7_SHAPES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(p):
    with io.open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def fp(s):
    if not s:
        return None
    return 'h:' + hashlib.sha1(re.sub(r'\s+', '', s).lower().encode('utf-8')).hexdigest()[:8]


def main():
    idx = json.loads(read('assets/skins/index.json'))
    ids = [x['id'] for x in idx['items']]
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    from gen_m import M, DESK
    from skin_spec_v7 import SPEC

    m_map = {row[0]: row for row in M}          # id -> (id, ch, scene, radius, tab)
    spec_map = {sp['id']: (i, sp) for i, sp in enumerate(SPEC)}
    v6css = read('assets/skins-v6.css')
    v7css = read('assets/skins-v7.css')
    mcss = read('assets/skins-m.css')

    # v6.css 逐套块解析（--sk-stage / --radius / 徽记 / tab / 动效）
    def v6_block(sid):
        m = re.search(r'html\[data-skin="%s"\]\s*\{([^}]*)\}' % sid, v6css)
        return m.group(1) if m else ''

    skins, debts = {}, {}
    order = []

    def put(sid, stage, emblem, shape, tab, motion, desk):
        order.append(sid)
        skins[sid] = {'stage': stage, 'emblem': emblem, 'shape': shape,
                      'tab': tab, 'motion': motion, 'desk': desk}
        miss = [k for k, v in (('stage', stage), ('emblem', emblem), ('shape', shape),
                               ('tab', tab), ('motion', motion), ('desk', desk)) if not v]
        if miss:
            debts[sid] = miss

    for i, sid in enumerate([r[0] for r in M]):
        row = m_map[sid]
        mo = mo40(i)
        dh = DESK[sid][0]
        # m.css 实际产物核对（场景/徽记+动效/桌面逐套）
        has_scene = ('html[data-skin="%s"] .app-main::before{background:' % sid) in mcss
        has_emb = ('content:"%s"' % row[1]) in mcss
        has_mo = ('data-skin="%s"] .page-head .page-title::after{content:"%s";animation:skid-%s' % (sid, row[1], mo[0])) in mcss
        has_desk = ('html[data-skin="%s"]{--skm-desk-h:%dpx' % (sid, dh)) in mcss
        put(sid, fp(row[2]) if has_scene else None,
            row[1] if has_emb else None,
            row[3], row[4],
            '%s/%s/%s' % mo if has_mo else None,
            ('%dpx' % dh) if has_desk else None)

    for i, sp in enumerate(SPEC):
        sid = sp['id']
        ident = IDENT7[sid]
        mo = mo7(i, sp['eng'])
        flat = v7css.replace('\n', ' ')
        has_emb = ('data-skin="%s"] .page-head .page-title::after { content:"%s"' % (sid, ident[0])) in flat
        has_tab = ('data-skin="%s"] .tabbar button.on::before { %s' % (sid, TAB7_SHAPES[ident[2]])) in flat
        # 徽记动效（必现、必可见）+ 装饰动效行；comp 是否绘制 .sk-decor 由 R3/R4 视觉验证
        has_mo = ('data-skin="%s"] #skinStage .sk-decor { animation:skid-' % sid) in flat
        has_rad = ident[1] in v7css
        has_desk = re.search(r'html\[data-skin="%s"\]\s*\{[^}]*--skm-desk-h' % sid, v7css)
        put(sid, fp(sp['stage']),
            ident[0] if has_emb else None,
            ident[1] if has_rad else None,
            ident[2] if has_tab else None,
            '%s/%s/%s' % mo if has_mo else None,
            'yes' if has_desk else None)

    v6ids = sorted([x for x in ids if re.fullmatch(r'g(2[6-9]|3[0-5])', x)])
    for i, sid in enumerate(v6ids):
        blk = v6_block(sid)
        ident = IDENT6[sid]  # (emb, rad, tab, dh)
        mo = mo6(i)
        stage = re.search(r'--sk-stage:\s*([^;]+);', blk)
        rad = re.search(r'html\[data-skin="%s"\]\{--radius:([^;]+);' % sid, v6css)
        has_emb = ('content:"%s"' % ident[0]) in v6css and sid in v6css
        has_tab = ('data-skin="%s"] .tabbar button.on::before { %s' % (sid, TAB7_SHAPES[ident[2]])) in v6css.replace('\n', ' ')
        has_mo = ('data-skin="%s"] #skinStage .sk-decor { animation: skid-%s' % (sid, mo[0])) in v6css.replace('\n', ' ')
        has_desk = ('html[data-skin="%s"]{--radius:%s;--skm-desk-h:%dpx' % (sid, ident[1], ident[3])) in v6css
        put(sid, fp(stage.group(1)) if stage else None,
            ident[0] if has_emb else None,
            rad.group(1).strip() if rad else None,
            ident[2] if has_tab else None,
            '%s/%s/%s' % mo if has_mo else None,
            ('%dpx' % ident[3]) if has_desk else None)

    # 同质对：≥3 通道同值
    clones, near = [], []
    chans = ('stage', 'emblem', 'shape', 'tab', 'motion')
    for a in range(len(order)):
        for b in range(a + 1, len(order)):
            ia, ib = order[a], order[b]
            if ia not in skins or ib not in skins:
                continue
            shared = [k for k in chans if skins[ia][k] and skins[ib][k] and skins[ia][k] == skins[ib][k]]
            if len(shared) >= 3:
                clones.append([ia, ib, shared])
            elif len(shared) == 2:
                near.append([ia, ib, shared])

    report = {
        'version': 'v5.6',
        'channels': list(chans) + ['desk'],
        'pool': len(order),
        'skins': {k: skins[k] for k in order},
        'debts': debts,
        'clones': clones,
        'nearDupes': near,
        'stats': {
            'emblemUnique': len(set(v['emblem'] for v in skins.values() if v['emblem'])) == sum(1 for v in skins.values() if v['emblem']),
            'clonePairs': len(clones),
            'nearPairs': len(near),
            'debts': len(debts),
        },
    }
    out = os.path.join(ROOT, 'assets', 'skins', 'distinct-report.json')
    with io.open(out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print('pool=%d debts=%d clones=%d near=%d' % (
        len(order), len(debts), len(clones), len(near)))
    if debts:
        for k in sorted(debts):
            print('  DEBT', k, debts[k])
    for c in clones:
        print('  CLONE', c)
    ok = not debts and not clones and report['stats']['emblemUnique']
    print('emblemUnique=%s' % report['stats']['emblemUnique'])
    print('== 差异化审计: %s ==' % ('PASS 全池五通道齐备、徽记全池唯一、零同质对' if ok else 'FAIL'))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
