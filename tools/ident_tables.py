# -*- coding: utf-8 -*-
"""v5.6 身份表（单一事实来源）：徽记 / 形状语言 / tabbar 指示 / 签名动效 / 桌面舞台。

消费方：
  tools/gen_v7.py   —— 为 g36–g85 生成 身份层 CSS（此前 50 套共用 14px 圆角、无徽记、
                       无 tab 指示形状、无桌面高度，全靠引擎差异硬撑辨识度）
  tools/gen_m.py    —— 为 40 套存量皮肤生成 签名动效 + 桌面窄带舞台（v5.5 只有静态场景）
  skins-v6.css      —— g26–g35 的身份补全块（手写，但数据引用本表，audit 负责核对一致）
  tools/audit_distinct.py —— 五通道签名矩阵的取数与验证

纪律：徽记字全池唯一；圆角/桌高按世界观手工指定；tab 形状与动效族按确定性函数分配，
相邻皮肤互不相同；reduced-motion 下全部动效关闭（由各消费方统一处理）。
"""

# g36–g85：（徽记字, 卡片圆角, tab 指示形状）
IDENT7 = {
    'g36': ('盆', '6px 20px 6px 20px', 'moon'),
    'g37': ('串', '18px 18px 6px 6px', 'ring'),
    'g38': ('巢', '3px', 'bar'),
    'g39': ('邮', '2px 10px 2px 10px', 'notch'),
    'g40': ('苗', '4px 4px 16px 4px', 'diamond'),
    'g41': ('铃', '16px 4px 16px 4px', 'dot2'),
    'g42': ('鸽', '20px 8px 8px 8px', 'wave'),
    'g43': ('龙', '2px 14px 2px 14px', 'moon'),
    'g44': ('钨', '22px 22px 6px 6px', 'ring'),
    'g45': ('石', '10px 26px 10px 26px', 'bar'),
    'g46': ('汞', '12px 12px 26px 26px', 'notch'),
    'g47': ('铜', '4px 16px 16px 16px', 'diamond'),
    'g48': ('戥', '3px 14px 14px 3px', 'dot2'),
    'g49': ('格', '2px 2px 10px 10px', 'wave'),
    'g50': ('风', '18px 4px 18px 4px', 'moon'),
    'g51': ('频', '8px 8px 20px 20px', 'ring'),
    'g52': ('钟', '30px 30px 4px 4px', 'bar'),
    'g53': ('沙', '4px 22px 22px 4px', 'notch'),
    'g54': ('雨', '2px 12px 2px 12px', 'diamond'),
    'g55': ('星', '24px 4px 24px 4px', 'dot2'),
    'g56': ('牌', '3px 3px 14px 14px', 'wave'),
    'g57': ('字', '2px', 'moon'),
    'g58': ('筹', '8px 2px 8px 2px', 'ring'),
    'g59': ('闸', '4px 18px 18px 4px', 'bar'),
    'g60': ('梯', '3px 3px 3px 18px', 'notch'),
    'g61': ('漆', '26px 6px 26px 6px', 'diamond'),
    'g62': ('板', '4px 4px 14px 4px', 'dot2'),
    'g63': ('影', '6px 22px 6px 22px', 'wave'),
    'g64': ('尺', '2px 2px 16px 16px', 'moon'),
    'g65': ('砝', '4px 14px 14px 14px', 'ring'),
    'g66': ('信', '3px 12px 12px 3px', 'bar'),
    'g67': ('笼', '20px 20px 8px 8px', 'notch'),
    'g68': ('签', '6px 6px 26px 26px', 'diamond'),
    'g69': ('幕', '2px 18px 2px 18px', 'dot2'),
    'g70': ('炊', '4px 4px 34px 34px', 'wave'),
    'g71': ('罐', '10px 10px 30px 30px', 'moon'),
    'g72': ('书', '2px 2px 2px 16px', 'ring'),
    'g73': ('井', '6px 24px 6px 24px', 'bar'),
    'g74': ('果', '14px 14px 30px 30px', 'notch'),
    'g75': ('冰', '4px 4px 20px 20px', 'diamond'),
    'g76': ('唱', '6px 6px 24px 24px', 'dot2'),
    'g77': ('车', '18px 2px 18px 2px', 'wave'),
    'g78': ('鸢', '4px 24px 4px 24px', 'moon'),
    'g79': ('马', '30px 30px 8px 8px', 'ring'),
    'g80': ('织', '2px 16px 16px 2px', 'bar'),
    'g81': ('螺', '40% 40% 8px 8px', 'notch'),
    'g82': ('音', '16px 16px 4px 16px', 'diamond'),
    'g83': ('程', '3px 3px 20px 20px', 'dot2'),
    'g84': ('扇', '4px 4px 4px 26px', 'wave'),
    'g85': ('晷', '2px 2px 40% 40%', 'moon'),
}

# g26–g35：（徽记字, 卡片圆角, tab 指示形状, 桌面窄带舞台高度px）
IDENT6 = {
    'g26': ('撕', '4px 14px 4px 14px', 'moon', 180),
    'g27': ('药', '3px 3px 12px 3px', 'ring', 168),
    'g28': ('带', '2px 16px 16px 2px', 'bar', 152),
    'g29': ('码', '2px 2px 2px 14px', 'notch', 144),
    'g30': ('折', '2px 20px 2px 20px', 'diamond', 160),
    'g31': ('瓶', '6px 6px 24px 24px', 'dot2', 172),
    'g32': ('印', '3px', 'wave', 148),
    'g33': ('线', '4px 4px 4px 16px', 'moon', 168),
    'g34': ('钱', '10px 10px 30px 30px', 'ring', 184),   # 存钱罐
    'g35': ('贴', '2px 2px 18px 18px', 'bar', 176),      # 冰箱贴
}

# v6 签名动效族（与 v7 五族共用 keyframes；v6.css 手写块引用）
MO6_FAM = ('sway', 'drift', 'pulse', 'sheen', 'flare')


def mo6(i):
    dur = 4.0 + ((i * 11) % 20) / 10.0
    delay = -((i * 19) % 36) / 10.0
    return (MO6_FAM[i % 5], round(dur, 1), round(delay, 1))

# v7 签名动效族（引擎 → 基础族），时长/相位按确定性函数逐套唯一
MO7_FAM = {'grow': 'drift', 'meter': 'pulse', 'plate': 'sheen', 'vessel': 'sway', 'motion': 'flare'}


def mo7(i, eng):
    """i = 皮肤在 SPEC 中的序号。返回 (族, 时长s, 相位s)；(dur,delay) 二元组在 50 套内唯一。"""
    dur = 3.6 + ((i * 7) % 22) / 10.0
    delay = -((i * 13) % 40) / 10.0
    return (MO7_FAM[eng], round(dur, 1), round(delay, 1))


# 40 套存量皮肤（gen_m M 表序）签名动效：三族轮换 + 唯一相位
MO40_FAM = ('br', 'br2', 'lift')


def mo40(i):
    dur = 3.8 + ((i * 9) % 24) / 10.0
    delay = -((i * 17) % 44) / 10.0
    return (MO40_FAM[i % 3], round(dur, 1), round(delay, 1))


# v7 tab 指示形状 CSS（扩充 notch/ring 两族；与 gen_m.TAB_SHAPES 同语法）
TAB7_SHAPES = {
    'bar': 'width:3px;height:12px;border-radius:2px;',
    'diamond': 'width:6px;height:6px;border-radius:1px;transform:translateX(-50%) rotate(45deg);',
    'dot2': 'width:9px;height:4px;border-radius:2px;background:linear-gradient(90deg,var(--green) 0 3.5px,transparent 3.5px 5.5px,var(--green) 5.5px);',
    'moon': 'width:8px;height:8px;border-radius:8px 8px 0 0;transform:translateX(-50%);',
    'wave': 'width:14px;height:4px;border-radius:3px;background:linear-gradient(90deg,var(--green) 0 4px,transparent 4px 10px,var(--green) 10px);',
    'notch': 'width:8px;height:8px;border-radius:1px;transform:translateX(-50%) rotate(45deg);box-shadow:inset 0 0 0 2px var(--green);background:none;',
    'ring': 'width:8px;height:8px;border-radius:50%;box-shadow:inset 0 0 0 2px var(--green);background:none;',
}
