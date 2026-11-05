# -*- coding: utf-8 -*-
"""能量账本 · 构建脚本（v5.3 起版本号统一注入）

唯一版本来源：version.json 的 "version" 字段。
运行 `python build.py` 会把 index.html / sw.js 里所有 ?v= 旧值与
SW 缓存名同步成同一版本号，并校验 PRECACHE 列表里的文件都存在。

以前 ?v= 手写在十几个文件里，漏改一个就新旧混载；现在只改 version.json，
再跑一次本脚本即可。发布流程：
  1. 改 version.json（版本号 + 更新点）
  2. python build.py
  3. 提交并推送
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))

def read(p):
    with io.open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

def write(p, s):
    with io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)

def main():
    ver = json.loads(read('version.json'))['version']
    changed = []

    # 1) index.html：所有 ?v= 旧值 → 新版本（含 __EL_VER 内联常量）
    html = read('index.html')
    html2 = re.sub(r'(\?v=)\d+\.\d+\.\d+', r'\g<1>' + ver, html)
    html2 = re.sub(r"(window\.__EL_VER = ')\d+\.\d+\.\d+(')", r'\g<1>' + ver + r'\g<2>', html2)
    if html2 != html:
        write('index.html', html2); changed.append('index.html')

    # 2) sw.js：缓存名 + PRECACHE 的 ?v=
    sw = read('sw.js')
    sw2 = re.sub(r"(const CACHE = 'energy-ledger-v)\d+\.\d+\.\d+(')", r'\g<1>' + ver + r'\g<2>', sw)
    sw2 = re.sub(r'(\?v=)\d+\.\d+\.\d+', r'\g<1>' + ver, sw2)
    if sw2 != sw:
        write('sw.js', sw2); changed.append('sw.js')

    # 3) 校验：PRECACHE 里的文件（去掉查询串）必须真实存在
    missing = []
    for m in re.finditer(r"'(\./[^']+)'", read('sw.js')):
        path = m.group(1)[2:].split('?')[0]
        if path and not os.path.exists(os.path.join(ROOT, path)):
            missing.append(path)
    if missing:
        print('PRECACHE 缺文件：'); [print('  -', p) for p in missing]; sys.exit(1)

    print(('已同步版本 %s → %s' % (', '.join(changed), ver)) if changed else '版本已是 %s，无需改动' % ver)
    # 额外打印入口里与 sw 里的版本是否一致，双保险
    for p in ('index.html', 'sw.js'):
        vs = set(re.findall(r'\?v=(\d+\.\d+\.\d+)', read(p)))
        print('  %s: %s' % (p, sorted(vs)))

if __name__ == '__main__':
    main()
