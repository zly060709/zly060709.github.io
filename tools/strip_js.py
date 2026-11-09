# -*- coding: utf-8 -*-
"""JS 词法级剥离器：识别字符串/注释/正则字面量，输出纯代码用于括号配平检查。"""
import re

REGEX_PREV = set('(,=:[!&|?{};+-*%~^<>/\n')
KEYWORDS = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'case'}


def strip_js(src):
    out = []
    i = 0
    n = len(src)
    q = None
    prev = '\n'
    while i < n:
        c = src[i]
        if q:
            if c == chr(92):
                i += 2
                continue
            if c == q:
                q = None
                prev = 'x'
            i += 1
            continue
        if c in ('"', "'"):
            q = c
            i += 1
            continue
        if c == '/' and src.startswith('//', i):
            j = src.find('\n', i)
            i = j if j >= 0 else n
            prev = '\n'
            continue
        if c == '/' and src.startswith('/*', i):
            j = src.find('*/', i + 2)
            i = (j + 2) if j >= 0 else n
            prev = '\n'
            continue
        if c == '/' and (prev in REGEX_PREV or _last_word(src, i) in KEYWORDS):
            # 正则字面量：处理 [] 字符类（类内 / 不结束）
            j = i + 1
            in_class = False
            while j < n:
                d = src[j]
                if d == chr(92):
                    j += 2
                    continue
                if d == '[':
                    in_class = True
                elif d == ']':
                    in_class = False
                elif d == '/' and not in_class:
                    break
                elif d == '\n':
                    break  # JS 正则不能跨行 → 不是正则（保守退出）
                j += 1
            # 跳过 g/i/m 后缀
            while j + 1 < n and src[j + 1] in 'gimsuy':
                j += 1
            i = j + 1
            prev = 'x'
            continue
        if not c.isspace():
            prev = c
        out.append(c if c not in '\r\n' else ' ')
        i += 1
    return ''.join(out)


def _last_word(src, i):
    m = re.search(r'[A-Za-z_$]+$', src[:i].rstrip())
    return m.group(0) if m else ''


if __name__ == '__main__':
    import sys
    for f in sys.argv[1:]:
        s = strip_js(open(f, encoding='utf-8').read())
        bal = {a: s.count(a) - s.count(b) for a, b in (('{', '}'), ('(', ')'), ('[', ']'))}
        print(f, 'balance:', bal, 'OK' if all(v == 0 for v in bal.values()) else 'FAIL')
