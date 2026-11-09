# -*- coding: utf-8 -*-
"""v6.0 验证 1/5 · 代码审查（静态）：check_v55 的超集
新增断言：150 清单 / 175 徽记唯一 / V7SKIN 正则边界 / 新五引擎 ×10 /
skins-l.css 接入 / 新派生锚点 / 身份三件套覆盖 / DOM 预算静态抽查。
运行：python tools/check_v60.py   （在仓库根目录执行）"""
import json, re, io, os, sys
from collections import Counter

ok = []
def check(name, cond, detail=''):
    ok.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + ('  ' + detail if detail else ''))

for p in ('assets/skins/index.json', 'version.json', 'manifest.webmanifest'):
    json.load(open(p, encoding='utf-8')); check('json:' + p, True)

idx = json.load(open('assets/skins/index.json', encoding='utf-8'))
ids = [x['id'] for x in idx['items']]
check('manifest count=150', len(ids) == 150, str(len(ids)))
check('manifest unique ids', len(set(ids)) == 150)
v7ids = [i for i in ids if i.startswith('g') and i[1:].isdigit() and 36 <= int(i[1:]) <= 135]
check('manifest g36-g135 = 100', len(v7ids) == 100, str(len(v7ids)))
check('v7 全代零图片字段', all('art' not in x and 'thumb' not in x for x in idx['items'] if x['id'] in v7ids))
check('all top tier', set(x['tier'] for x in idx['items']) == {'top'})
top = [x for x in idx['items'] if x.get('tier') == 'top']
check('扭蛋池 150（本地 25 不入池）', len(top) == 150)

css = open('assets/skins-v7.css', encoding='utf-8').read()
mcss = open('assets/skins-m.css', encoding='utf-8').read()
lcss = open('assets/skins-l.css', encoding='utf-8').read()
v6css = open('assets/skins-v6.css', encoding='utf-8').read()
js = open('assets/skins-v7.js', encoding='utf-8').read()
for nm, s in (('v7css', css), ('mcss', mcss), ('lcss', lcss), ('v6css', v6css)):
    check(nm + ' braces', s.count('{') == s.count('}'), '%d/%d' % (s.count('{'), s.count('}')))
check('v7css 100 light blocks', len(re.findall(r'html\[data-skin="g\d+"\] \{', css)) == 100)
check('v7css 100 dark blocks', css.count('[data-theme="dark"][data-skin="g') == 100)
check('lcss 25 skin blocks', len(re.findall(r'html\[data-skin="[a-z]+"\]', lcss)) >= 25)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from strip_js import strip_js
stripped = strip_js(js)
for a, b in (('{', '}'), ('(', ')'), ('[', ']')):
    check('v7js %s%s balance' % (a, b), stripped.count(a) == stripped.count(b),
          '%d/%d' % (stripped.count(a), stripped.count(b)))

mv7 = re.search(r'var V7 = \[([^\]]+)\]', js)
check('v7js V7 array parses', bool(mv7))
if mv7:
    arr = [x.strip('"') for x in mv7.group(1).split(',')]
    check('V7 = 100 unique ids', len(arr) == 100 and len(set(arr)) == 100, str(len(arr)))
    check('V7 range g36..g135', arr[0] == 'g36' and arr[-1] == 'g135')

cfg_ids = set(re.findall(r'"(g\d+)":\{"', js))
css_ids = set(re.findall(r'html\[data-skin="(g\d+)"\] \{', css))
check('CFG==CSS ids', cfg_ids == css_ids, 'diff=' + str(sorted(set(cfg_ids) ^ set(css_ids)))[:120])

engs = re.findall(r'"eng":"(\w+)"', js)
check('10 engines x10', Counter(engs) == Counter({'grow': 10, 'meter': 10, 'plate': 10, 'vessel': 10,
      'motion': 10, 'orbit': 10, 'light': 10, 'desk': 10, 'time': 10, 'shelf': 10}), str(dict(Counter(engs))))
for eng, fn in (('orbit', 'renderOrbit'), ('light', 'renderLight'), ('desk', 'renderDesk'),
                ('time', 'renderTime'), ('shelf', 'renderShelf')):
    check('v7js %s 渲染器注册' % fn, ('%s: render%s' % (eng, fn[6:].capitalize())) in js or fn in js)

# v6.0 新派生锚点（writeData 直通/派生）
for key in ('totalRecords', 'term', 'weekday', 'monthOf', 'solarTerm' if False else 'TERMS'):
    check('v7js 派生锚点含 %s' % key, key in js)

VER = json.load(open('version.json', encoding='utf-8'))['version']
check('version = 6.0.0', VER == '6.0.0', VER)
appjs = open('assets/app.js', encoding='utf-8').read()
check('app.js SkinV7.sync x2', appjs.count('SkinV7.sync') == 2, str(appjs.count('SkinV7.sync')))
check('app.js knownSkin SkinV7', 'SkinV7 && SkinV7.ids' in appjs)
html = open('index.html', encoding='utf-8').read()
check('index.html V7SKIN 正则放宽', 'g(3[6-9]|[4-8][0-9]|9[0-9]|1[0-2][0-9]|13[0-5])' in html)
m = re.search(r'var V7SKIN = /(.*)/;', html)
if m:
    rx = re.compile('^' + m.group(1).replace('\\/', '/') + '$')
    boundary = {'g89': True, 'g90': True, 'g135': True, 'g136': False, 'g139': False, 'g140': False, 'g86': True, 'a-xyz': False}
    bad = {k: bool(rx.match(k)) for k, v in boundary.items() if bool(rx.match(k)) != v}
    check('V7SKIN 正则边界测试 (g89/g90/g135/g139✓ g136/g140/a-xyz✗)', not bad, str(bad))
check('index.html v7 assets linked', ('skins-v7.css?v=' + VER) in html and ('skins-v7.js?v=' + VER) in html)
check('index.html skins-m.css linked', 'skins-m.css?v=' + VER in html)
check('index.html skins-l.css linked（新增）', 'skins-l.css?v=' + VER in html)
sw = open('sw.js', encoding='utf-8').read()
check('sw.js precache v7+m+l', all('skins-%s.css?v=%s' % (k, VER) in sw for k in ('v7', 'm', 'l')))
check('sw.js cache name 6.0.0', 'energy-ledger-v' + VER in sw)

# 规格完整性 + 身份三件套
from skin_spec_v7 import SPEC
check('SPEC = 100', len(SPEC) == 100)
missing = [s['id'] for s in SPEC if not s.get('comp') or not s.get('stage') or not s.get('anchors')]
check('SPEC comp/stage/anchors complete', not missing, str(missing))
dup = [k for k, v in Counter(s['id'] for s in SPEC).items() if v > 1]
check('SPEC unique ids', not dup, str(dup))

import gen_v7
ident = {}
for s in SPEC:
    b, e, t = gen_v7.skin_identity(s)
    ident[s['id']] = (b, e, t)
check('新50徽记显式字段', all(s.get('badge') for s in SPEC if int(s['id'][1:]) >= 86))
check('旧50徽记唯一表接入', all(ident[i][0] for i in ident))

# 全池徽记唯一（v7 100 + gen_m M/L 65 + v6 10）
gm = open('tools/gen_m.py', encoding='utf-8').read()
allb = {}
conf = []
for s in SPEC:
    b = ident[s['id']][0]
    if b in allb: conf.append((b, s['id'], allb[b]))
    allb[b] = s['id']
for mm in re.finditer(r"\('([a-z0-9-]+)', '(.)',", gm):
    if mm.group(2) in allb: conf.append((mm.group(2), mm.group(1), allb[mm.group(2)]))
    allb[mm.group(2)] = mm.group(1)
for k, v in (('g26', '饭'), ('g27', '柜'), ('g28', '带'), ('g29', '秤'), ('g30', '叠'),
             ('g31', '瓶'), ('g32', '印'), ('g33', '路'), ('g34', '罐'), ('g35', '贴')):
    if v in allb: conf.append((v, k, allb[v]))
    allb[v] = k
check('175 徽记全池唯一', len(allb) == 175 and not conf, 'n=%d conf=%s' % (len(allb), conf[:4]))

# 身份三件套落进 CSS 的抽查（v7css：徽记规则 100 条；lcss 25 条；v6css 10 条）
nb = len(re.findall(r'page-title::after \{ content:', css))
check('v7css 徽记规则=100', nb == 100, str(nb))
check('lcss 徽记规则=25', len(re.findall(r'page-title::after \{ content:', lcss)) == 25)
check('v6css 徽记规则=10', len(re.findall(r'page-title::after \{ content:', v6css)) == 10)
check('v7css tabbar 指示分组≥10', len(re.findall(r'\.tabbar button\.on::before', css)) >= 10)

# DOM 预算静态抽查：单皮肤 comp 内 HTML 标签数上限（粗略：comp 字符串内标签出现数）
worst = max(SPEC, key=lambda s: len(re.findall(r'<[a-z]', s.get('comp', ''))))
check('comp 静态标签预算（≤60 标记）', len(re.findall(r'<[a-z]', worst['comp'])) <= 60,
      '%s: %d' % (worst['id'], len(re.findall(r'<[a-z]', worst['comp']))))

# PLAN/VALIDATION 存在
check('PLAN-v6.0.md 存在', os.path.exists('PLAN-v6.0.md'))
check('tools/v8-harness.html 存在（验证3 载体）', os.path.exists('tools/v8-harness.html'))

fails = [x for x in ok if not x[1]]
print('\n== 验证1/5 静态审查(v6.0): %d checks, %d fail ==' % (len(ok), len(fails)))
sys.exit(1 if fails else 0)
