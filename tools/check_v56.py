# -*- coding: utf-8 -*-
"""验证 1/5 · v5.6 代码审查（静态 + 编译 + 接入点 + 契约）
check_v55 的超集：新增 v6/v5/v43 全量配平、预绘覆盖模拟、换肤 CSS 覆盖、
skins-m.css 体积契约、SPEC 身份字段、v8-harness 覆盖率、distinct-report 一致性。
运行：python tools/check_v56.py   （在仓库根目录执行）
"""
import io, json, os, re, sys
from collections import Counter

OK = []
def check(name, cond, detail=''):
    OK.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (('  ' + detail) if detail else ''))

def read(p):
    with io.open(p, encoding='utf-8') as f:
        return f.read()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from strip_js import strip_js

VER = json.load(read('version.json') and open('version.json', encoding='utf-8'))['version']

# ---------- 1) JSON ----------
for p in ('assets/skins/index.json', 'version.json', 'manifest.webmanifest'):
    try:
        json.loads(read(p)); check('json:' + p, True)
    except Exception as e:
        check('json:' + p, False, str(e))

idx = json.loads(read('assets/skins/index.json'))
ids = [x['id'] for x in idx['items']]
check('manifest count=100', len(ids) == 100, str(len(ids)))
check('manifest unique ids', len(set(ids)) == 100)
v7ids = [i for i in ids if re.fullmatch(r'g(3[6-9]|[4-8][0-9])', i)]
check('manifest g36-g85 = 50', len(v7ids) == 50, str(len(v7ids)))
check('v7 零图片字段', all('art' not in x and 'thumb' not in x for x in idx['items'] if x['id'] in v7ids))
check('all top tier', set(x['tier'] for x in idx['items']) == {'top'})
GENIDS = [i for i in ids if re.fullmatch(r'g(0\d|1\d|2[0-5])', i)]
ART5 = [i for i in ids if i in ('a-sakura', 'a-galaxy', 'a-neon', 'a-wuxia', 'a-fireworks')]
ART10 = [i for i in ids if re.fullmatch(r'a-(aurora|chart|chrome|culture|glass|polar|pulse|radio|tidal|type)', i)]
V6IDS = [i for i in ids if re.fullmatch(r'g(2[6-9]|3[0-5])', i)]
check('家族划分 25+5+10+10+50', len(GENIDS) == 25 and len(ART5) == 5 and len(ART10) == 10 and len(V6IDS) == 10,
      '%d/%d/%d/%d' % (len(GENIDS), len(ART5), len(ART10), len(V6IDS)))

# ---------- 2) CSS 全量配平 + 体积契约 ----------
CSS_FILES = ['assets/app.css', 'assets/skins-v43.css', 'assets/skins-v5.css',
             'assets/skins-v6.css', 'assets/skins-gen.css', 'assets/skins-m.css', 'assets/skins-v7.css']
for p in CSS_FILES:
    if not os.path.exists(p):
        check('css exists:' + p, False); continue
    css = read(p)
    check('css braces:' + os.path.basename(p), css.count('{') == css.count('}'),
          '%d/%d' % (css.count('{'), css.count('}')))
mcss_size = os.path.getsize('assets/skins-m.css')
check('skins-m.css ≤40KB', mcss_size <= 40 * 1024, '%dB' % mcss_size)

v7css = read('assets/skins-v7.css')
check('v7css 50 light blocks', len(re.findall(r'html\[data-skin="g\d+"\] \{', v7css)) == 50)
check('v7css 50 dark blocks', v7css.count('[data-theme="dark"][data-skin="g') == 50)
v6css = read('assets/skins-v6.css')
v6_stage_ids = set(re.findall(r'html\[data-skin="(g\d\d)"\][^{]*\{[^}]*--sk-stage', v6css))
check('v6css stage covers g26-g35', set(V6IDS) <= v6_stage_ids or len(v6_stage_ids) >= 9,
      'found=%d' % len(v6_stage_ids))

# ---------- 3) JS 词法配平（v5.5 只查 v7，本轮全量） ----------
JS_FILES = ['assets/app.js', 'assets/skins-gen.js', 'assets/skins-v6.js',
            'assets/skins-v7.js', 'assets/skin-fx.js']
for p in JS_FILES:
    if not os.path.exists(p):
        check('js exists:' + p, False); continue
    s = strip_js(read(p))
    bal = {a: s.count(a) - s.count(b) for a, b in (('{', '}'), ('(', ')'), ('[', ']'))}
    check('js balance:' + os.path.basename(p), all(v == 0 for v in bal.values()), str(bal))

v7js = read('assets/skins-v7.js')
mv7 = re.search(r'var V7 = \[([^\]]+)\]', v7js)
check('v7js V7 array parses', bool(mv7))
if mv7:
    arr = [x.strip('"') for x in mv7.group(1).split(',')]
    check('V7 = 50 unique ids', len(arr) == 50 and len(set(arr)) == 50, str(len(arr)))
    check('V7 range g36..g85', arr[0] == 'g36' and arr[-1] == 'g85')
cfg_ids = set(re.findall(r'"(g\d\d)":\{"', v7js))
css_ids = set(re.findall(r'html\[data-skin="(g\d\d)"\] \{', v7css))
check('CFG==CSS ids', cfg_ids == css_ids, 'diff=%s' % str(set(cfg_ids) ^ set(css_ids))[:120])
engs = re.findall(r'"eng":"(\w+)"', v7js)
check('5 engines x10', Counter(engs) == Counter({'grow': 10, 'meter': 10, 'plate': 10, 'vessel': 10, 'motion': 10}),
      str(dict(Counter(engs))))

# ---------- 4) 接入点 ----------
appjs = read('assets/app.js')
check('app.js SkinV7.sync x2', appjs.count('SkinV7.sync') == 2, str(appjs.count('SkinV7.sync')))
check('app.js knownSkin SkinV7', 'SkinV7 && SkinV7.ids' in appjs)
check('app.js 换肤家族CSS保障 ensureSkinFamilyCss', 'function ensureSkinFamilyCss' in appjs,
      '实时切换 paper→g36/g01 必须注入对应样式表（R1#1 修复）')
html = read('index.html')
check('index.html V7SKIN regex', 'V7SKIN' in html and 'g(3[6-9]|[4-8][0-9])' in html)
check('index.html v7 assets linked', ('skins-v7.css?v=' + VER) in html and ('skins-v7.js?v=' + VER) in html)
check('index.html skins-m.css linked', 'skins-m.css?v=' + VER in html)
# 预绘覆盖模拟：全部 100 个 id 必须在首帧挂上 data-skin（paper 无需）
m_oldgen = re.search(r'var OLDGEN = ([^;]+);', html)
m_a10 = re.search(r'var A10GEN = ([^;]+);', html)
m_v6 = re.search(r'var V6SKIN = ([^;]+);', html)
m_v7 = re.search(r'var V7SKIN = ([^;]+);', html)
def sim(rx_src, sid):
    if not rx_src:
        return False
    s = rx_src.strip()
    if s.startswith('/'):
        s = s[1:]
    if s.endswith('$/'):
        s = s[:-2]
    elif s.endswith('/'):
        s = s[:-1]
    try:
        return re.fullmatch(s, sid) is not None
    except re.error:
        return False
missing_pre = [i for i in ids if not (
    sim(m_oldgen.group(1) if m_oldgen else '', i)
    or sim(m_a10.group(1) if m_a10 else '', i)
    or sim(m_v6.group(1) if m_v6 else '', i)
    or sim(m_v7.group(1) if m_v7 else '', i))]
check('预绘首帧覆盖 100/100', not missing_pre, 'missing=%s' % str(missing_pre[:8]))

sw = read('sw.js')
check('sw.js precache v7+m', 'skins-v7.css?v=' + VER in sw and 'skins-m.css?v=' + VER in sw)
check('sw.js cache name == version', 'energy-ledger-v' + VER in sw)
missing_pre_files = []
for m in re.finditer(r"'(\./[^']+)'", sw):
    path = m.group(1)[2:].split('?')[0]
    if path and not os.path.exists(path):
        missing_pre_files.append(path)
check('sw.js PRECACHE 实存', not missing_pre_files, str(missing_pre_files[:5]))
notes = json.dumps(json.loads(read('version.json')).get('notes', []), ensure_ascii=False)
check('version.json notes 缓存名与版本一致', ('energy-ledger-v' + VER) in notes,
      'notes 中 SW 缓存名必须写当前版本（R1#2 文档失真修复）')

# ---------- 5) SPEC 完整性 + 身份字段 ----------
from skin_spec_v7 import SPEC
check('SPEC = 50', len(SPEC) == 50)
missing = [s['id'] for s in SPEC if not s.get('comp') or not s.get('stage') or not s.get('anchors')]
check('SPEC comp/stage/anchors complete', not missing, str(missing))
dup = [k for k, v in Counter(s['id'] for s in SPEC).items() if v > 1]
check('SPEC unique ids', not dup, str(dup))
dupname = [k for k, v in Counter(s['name'] for s in SPEC).items() if v > 1]
check('SPEC unique names', not dupname, str(dupname))
bad_h = [s['id'] for s in SPEC if not (150 <= s.get('h', 0) <= 210)]
check('SPEC h ∈ [150,210]', not bad_h, str(bad_h))
import re as _re
bad_hex = [s['id'] for s in SPEC for k, v in s['anchors'].items()
           if not _re.fullmatch(r'#[0-9a-fA-F]{6}', str(v))]
check('SPEC anchors hex6', not bad_hex, str(bad_hex[:5]))
import ident_tables as _idt
EMB = getattr(_idt, 'IDENT7', None)
if EMB and isinstance(EMB, dict):
    emb_chars = [v[0] for v in EMB.values() if isinstance(v, (tuple, list)) and v]
    check('v7 徽记 50 套齐备且唯一', len(EMB) == 50 and len(set(emb_chars)) == 50,
          '%d/%d' % (len(EMB), len(set(emb_chars))))
    # 全池 100 套徽记唯一（含 gen_m.M 40 + IDENT6 10）
    from gen_m import M as _M
    all_emb = [r[1] for r in _M] + emb_chars + [v[0] for v in getattr(_idt, 'IDENT6').values()]
    check('全池 100 徽记唯一', len(all_emb) == 100 and len(set(all_emb)) == 100,
          '%d/%d dup=%s' % (len(set(all_emb)), len(all_emb),
                            [c for c, n in __import__('collections').Counter(all_emb).items() if n > 1][:5]))
else:
    check('v7 徽记 50 套齐备且唯一', False, 'ident_tables.IDENT7 缺失（A 交付）')

# ---------- 6) v8-harness 全池覆盖 ----------
h8path = 'tools/v8-harness.html'
if os.path.exists(h8path):
    h8 = read(h8path)
    fams = {}
    for name, pat in (('V7', r'\bV7=(\[[^\]]+\])'), ('V6', r'\bV6=(\[[^\]]+\])'),
                      ('GEN', r'\bGEN=(\[[^\]]+\])'), ('ART5', r'\bART5=(\[[^\]]+\])'),
                      ('A10', r'\bA10=(\[[^\]]+\])')):
        mm = re.search(pat, h8)
        fams[name] = re.findall(r'"([^"]+)"', mm.group(1)) if mm else []
    union = [i for k in ('V7', 'V6', 'GEN', 'ART5', 'A10') for i in fams[k]]
    check('v8-harness 全池=101（50+10+25+5+10+paper）',
          len(union) == 100 and 'V7.concat(V6,GEN,ART5,A10' in h8.replace(' ', ''),
          '%d+%d+%d+%d+%d' % tuple(len(fams[k]) for k in ('V7', 'V6', 'GEN', 'ART5', 'A10')))
    check('v8-harness 无缺漏', set(union) == set(ids),
          'diff=%s' % str(set(union) ^ set(ids))[:120])
    check('v8-harness 增强审计探针', 'scanMinFont' in h8 and 'scanTap44' in h8 and 'contrastSpot' in h8)
    check('v8-harness 逻辑探针', 'runLogic' in h8 and 'P4c' in h8 and 'ensureSkinFamily' in appjs)
else:
    check('v8-harness 存在', False, 'tools/v8-harness.html 缺失（D 交付）')

# ---------- 7) 差异化报告 ----------
drpath = 'assets/skins/distinct-report.json'
if os.path.exists(drpath):
    dr = json.loads(read(drpath))
    check('distinct-report 100 套', len(dr.get('skins', {})) == 100, str(len(dr.get('skins', {}))))
    check('distinct-report 无 ≥3 通道同质对', not dr.get('clones'),
          str(dr.get('clones', [])[:3]))
else:
    check('distinct-report 存在', False, 'A 交付未完成')

# ---------- 8) 页头徽记槽位冲突扫描（R3 教训：gen.css 水墨线吃掉 a-wuxia 徽记） ----------
# .page-title::after 是徽记专用槽位：仅允许 skins-m.css（40 套存量）、skins-v6.css §9（g26–g35）、
# skins-v7.css（g36–g85）三处声明；其余文件出现即为槽位抢占。
slot_conflicts = []
for p, owner_ok in (('assets/skins-gen.css', False), ('assets/skins-v43.css', False),
                    ('assets/skins-v5.css', False), ('assets/app.css', False)):
    if not os.path.exists(p):
        continue
    s2 = read(p)
    if 'page-title::after' in s2:
        for m2 in re.finditer(r'[^{}]*\.page-title::after', s2):
            slot_conflicts.append(p + ' :: ' + m2.group(0).strip()[-70:])
check('徽记槽位无跨文件抢占', not slot_conflicts, str(slot_conflicts[:3]))

fails = [x for x in OK if not x[1]]
print('\n== 验证1/5 代码审查: %d checks, %d fail ==' % (len(OK), len(fails)))
for name, _, detail in fails:
    print('  FAIL ->', name, detail)
sys.exit(1 if fails else 0)
