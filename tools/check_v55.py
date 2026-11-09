# -*- coding: utf-8 -*-
"""验证 1/5 · 代码审查（静态）"""
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
check('manifest count=100', len(ids) == 100, str(len(ids)))
check('manifest unique ids', len(set(ids)) == 100)
v7ids = [i for i in ids if i.startswith('g') and i[1:].isdigit() and 36 <= int(i[1:]) <= 85]
check('manifest g36-g85 = 50', len(v7ids) == 50, str(len(v7ids)))
check('v7 零图片字段', all('art' not in x and 'thumb' not in x for x in idx['items'] if x['id'] in v7ids))
check('all top tier', set(x['tier'] for x in idx['items']) == {'top'})

css = open('assets/skins-v7.css', encoding='utf-8').read()
mcss = open('assets/skins-m.css', encoding='utf-8').read()
js = open('assets/skins-v7.js', encoding='utf-8').read()
check('v7css braces', css.count('{') == css.count('}'), '%d/%d' % (css.count('{'), css.count('}')))
check('mcss braces', mcss.count('{') == mcss.count('}'))
check('v7css 50 light blocks', len(re.findall(r'html\[data-skin="g\d+"\] \{', css)) == 50)
check('v7css 50 dark blocks', css.count('[data-theme="dark"][data-skin="g') == 50)

# JS 括号配平：词法级剥离（识别字符串/注释/正则字面量）
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
    check('V7 = 50 unique ids', len(arr) == 50 and len(set(arr)) == 50, str(len(arr)))
    check('V7 range g36..g85', arr[0] == 'g36' and arr[-1] == 'g85')

cfg_ids = set(re.findall(r'"(g\d\d)":\{"', js))
css_ids = set(re.findall(r'html\[data-skin="(g\d\d)"\] \{', css))
check('CFG==CSS ids', cfg_ids == css_ids, 'diff=' + str(set(cfg_ids) ^ set(css_ids))[:120])

engs = re.findall(r'"eng":"(\w+)"', js)
check('5 engines x10', Counter(engs) == Counter({'grow': 10, 'meter': 10, 'plate': 10, 'vessel': 10, 'motion': 10}),
      str(dict(Counter(engs))))

VER = json.load(open('version.json', encoding='utf-8'))['version']
appjs = open('assets/app.js', encoding='utf-8').read()
check('app.js SkinV7.sync x2', appjs.count('SkinV7.sync') == 2, str(appjs.count('SkinV7.sync')))
check('app.js knownSkin SkinV7', 'SkinV7 && SkinV7.ids' in appjs)
html = open('index.html', encoding='utf-8').read()
check('index.html V7SKIN regex', 'V7SKIN' in html and 'g(3[6-9]|[4-8][0-9])' in html)
check('index.html v7 assets linked', ('skins-v7.css?v=' + VER) in html and ('skins-v7.js?v=' + VER) in html)
check('index.html skins-m.css linked', 'skins-m.css?v=' + VER in html)
sw = open('sw.js', encoding='utf-8').read()
check('sw.js precache v7+m', 'skins-v7.css?v=' + VER in sw and 'skins-m.css?v=' + VER in sw)
check('sw.js cache name 5.5.0', 'energy-ledger-v' + VER in sw)

# 规格完整性：每套 spec 有 comp/stage/cfg
import os, sys
sys.path.insert(0, 'tools')
from skin_spec_v7 import SPEC
check('SPEC = 50', len(SPEC) == 50)
missing = [s['id'] for s in SPEC if not s.get('comp') or not s.get('stage') or not s.get('anchors')]
check('SPEC comp/stage/anchors complete', not missing, str(missing))
dup = [k for k, v in Counter(s['id'] for s in SPEC).items() if v > 1]
check('SPEC unique ids', not dup, str(dup))

fails = [x for x in ok if not x[1]]
print('\n== 验证1/5 静态审查: %d checks, %d fail ==' % (len(ok), len(fails)))
