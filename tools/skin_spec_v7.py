# -*- coding: utf-8 -*-
"""v5.5 · 50 套机制型皮肤（g36–g85）规格表
字段说明：
  id/name/tag            皮肤标识与色系标签（进扭蛋图鉴）
  eng                    引擎：grow / meter / plate / vessel / motion
  mech                   引擎内机构（渲染器分派）
  bind                   数据锚点：streak/count/miss14/week7/macro/progress/left/items/dayphase
  max                    单元上限
  h                      --sk-stage-dom 舞台高度 px
  anchors                浅色主题锚点：bg 纸面 / card 卡面 / ink 墨色 / a1 主强调 / a2 次强调
  dark                   深色主题锚点（缺省自动派生）：dbg/dcard/dink 可覆盖
  stage                  --sk-stage 舞台场景 CSS（取用本皮肤 token）
  comp                   皮肤组件造型 CSS（引擎类 + 专属形状）
  cfg                    注入 skins-v7.js 的配置对象（JS 字面量）
"""

SPEC = [
# ================= E-A 生长·聚合（grow） =================
dict(id='g36', name='窗台·盆栽', tag='陶土苔绿', eng='grow', mech='pot', bind='streak', max=8, h=168,
    anchors=dict(bg='#E9DFD2', card='#F4ECE1', ink='#38301F', a1='#5F7C46', a2='#A9683C'),
    dark=dict(dbg='#131711', dcard='#1C221A', dink='#D9D2BC'),
    stage='repeating-linear-gradient(90deg, rgba(120,96,60,.05) 0 2px, transparent 2px 26px), radial-gradient(64% 44% at 78% 8%, rgba(95,124,70,.20), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g36"] #skinStage .gu{width:26px;height:34px;background:linear-gradient(150deg,var(--green) 20%,var(--green-deep));border-radius:2px 84% 10% 84%;transform-origin:50% 100%;box-shadow:0 2px 7px rgba(50,40,20,.14)}
html[data-skin="g36"] #skinStage .gu.off{background:var(--green-soft);opacity:.45;box-shadow:none}
html[data-skin="g36"] #skinStage .sk-decor.d-g36::after{content:"";position:absolute;left:24%;right:24%;bottom:6px;height:26px;background:linear-gradient(180deg,#B57947,#8E5630);border-radius:5px 5px 12px 12px;box-shadow:inset 0 3px 0 rgba(255,230,190,.35)}
html[data-skin="g36"] #skinStage .sk-decor.d-g36::before{content:"";position:absolute;inset:0;background:radial-gradient(46% 34% at 50% 104%, rgba(169,104,60,.24), transparent 70%)}""",
    cfg=dict(tip='第{n}天·已记'), ),
dict(id='g37', name='夜市·灯串', tag='暮蓝暖黄', eng='grow', mech='string', bind='count', max=10, h=164,
    anchors=dict(bg='#20283B', card='#2A3450', ink='#F2E9D4', a1='#E8B85C', a2='#7FA8C9'),
    dark=dict(always=True, dbg='#141A2A', dcard='#1E2740', dink='#EFE6CF'),
    stage='radial-gradient(52% 40% at 26% 0%, rgba(232,184,92,.16), transparent 70%), radial-gradient(40% 34% at 78% 4%, rgba(127,168,201,.14), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g37"] #skinStage .gu{width:18px;height:24px;border-radius:50% 50% 46% 46%;background:radial-gradient(60% 54% at 50% 36%, #FFE9AE, var(--a2-2, var(--amber)) 78%);box-shadow:0 0 14px rgba(232,184,92,.5);transform-origin:50% 0}
html[data-skin="g37"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-12px;width:1px;height:12px;background:rgba(242,233,212,.4)}
html[data-skin="g37"] #skinStage .gu.off{background:radial-gradient(60% 54% at 50% 36%, #5A6377, #3C455C 78%);box-shadow:none}
html[data-skin="g37"] #skinStage .sk-decor.d-g37::before{content:"";position:absolute;left:6%;right:6%;top:10px;height:44px;border-bottom:2px solid rgba(242,233,212,.35);border-radius:0 0 100% 100%/0 0 44px 44px}""",
    cfg=dict(tip='{n} 笔'), ),
dict(id='g38', name='蜂巢·六角', tag='蜜蜡深棕', eng='grow', mech='hex', bind='miss14', max=14, h=172,
    anchors=dict(bg='#E8D9B8', card='#F2E6C8', ink='#43331B', a1='#C89234', a2='#8A5A22'),
    dark=dict(dbg='#171207', dcard='#221A0D', dink='#E8D9B4'),
    stage='radial-gradient(46% 36% at 84% 6%, rgba(200,146,52,.16), transparent 70%), repeating-linear-gradient(0deg, rgba(138,90,34,.05) 0 1px, transparent 1px 10px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g38"] #skinStage .gu{width:30px;height:26px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:linear-gradient(160deg,var(--amber),var(--amber-soft));box-shadow:inset 0 0 0 2px rgba(67,51,27,.14)}
html[data-skin="g38"] #skinStage .gu.off{background:var(--field);box-shadow:inset 0 0 0 2px var(--line-2);opacity:.8}
html[data-skin="g38"] #skinStage .gu::after{content:"";position:absolute;left:50%;top:8%;width:44%;height:32%;border-radius:50%;background:rgba(255,244,214,.5)}""",
    cfg=dict(tip='{d}·{on}'), ),
dict(id='g39', name='集邮·册页', tag='靛青米白', eng='grow', mech='stamps', bind='miss14', max=14, h=176,
    anchors=dict(bg='#E3E7E4', card='#F1F3F0', ink='#26333C', a1='#33628C', a2='#A63A2B'),
    dark=dict(dbg='#0F1518', dcard='#1A2226', dink='#D4DEE2'),
    stage='repeating-linear-gradient(45deg, rgba(51,98,140,.05) 0 8px, transparent 8px 16px), radial-gradient(50% 40% at 12% 0%, rgba(166,58,43,.10), transparent 68%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g39"] #skinStage .gu{width:30px;height:36px;background:var(--surface);border:2px dashed var(--green-line);border-radius:3px;box-shadow:0 2px 6px rgba(38,51,60,.10);overflow:hidden}
html[data-skin="g39"] #skinStage .gu::before{content:"";position:absolute;inset:3px;background:linear-gradient(150deg,var(--green-soft),var(--green-line));opacity:.8}
html[data-skin="g39"] #skinStage .gu.off{border-style:solid;border-color:var(--line);background:var(--field)}
html[data-skin="g39"] #skinStage .gu.off::before{opacity:.25}
html[data-skin="g39"] #skinStage .gu b{position:relative;z-index:1;font-size:10px;color:var(--green-deep)}""",
    cfg=dict(tip='{d}'), ),
dict(id='g40', name='育苗·苗盘', tag='苗木土褐', eng='grow', mech='tray', bind='miss12', max=12, h=170,
    anchors=dict(bg='#E7E2D3', card='#F1ECDf', ink='#3A3421', a1='#6E8F4D', a2='#7C5E35'),
    dark=dict(dbg='#13140D', dcard='#1C1E14', dink='#DCD6C0'),
    stage='radial-gradient(60% 40% at 50% 0%, rgba(110,143,77,.14), transparent 72%), repeating-linear-gradient(90deg, rgba(124,94,53,.05) 0 1px, transparent 1px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g40"] #skinStage .gu{width:38px;height:38px;background:var(--field);border:1px solid var(--line-2);border-radius:6px;overflow:hidden}
html[data-skin="g40"] #skinStage .gu::before{content:"";position:absolute;left:50%;bottom:6px;width:4px;height:16px;background:var(--a2-2, var(--amber));transform:translateX(-50%)}
html[data-skin="g40"] #skinStage .gu::after{content:"";position:absolute;left:50%;bottom:18px;width:18px;height:10px;background:var(--green);border-radius:100% 100% 40% 40%;transform:translateX(-50%)}
html[data-skin="g40"] #skinStage .gu.off{opacity:.5}
html[data-skin="g40"] #skinStage .gu.off::before,html[data-skin="g40"] #skinStage .gu.off::after{opacity:.25}""",
    cfg=dict(tip='{d}'), ),
dict(id='g41', name='檐下·风铃', tag='靛蓝铜绿', eng='grow', mech='bells', bind='streak', max=7, h=180,
    anchors=dict(bg='#DFE5E4', card='#ECF0EE', ink='#223236', a1='#3E7C8C', a2='#8C6E4B'),
    dark=dict(dbg='#101416', dcard='#182022', dink='#CFDCDD'),
    stage='repeating-linear-gradient(102deg, rgba(62,124,140,.05) 0 1px, transparent 1px 14px), radial-gradient(48% 38% at 82% 2%, rgba(140,110,75,.14), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g41"] #skinStage .gu{width:22px;height:30px;background:linear-gradient(160deg,var(--a2-2, var(--amber)) 0 18%, var(--green) 18%);border-radius:6px 6px 44% 44%/8px 8px 56% 56%;transform-origin:50% 0}
html[data-skin="g41"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-14px;width:1px;height:14px;background:var(--ink-3)}
html[data-skin="g41"] #skinStage .gu::after{content:"";position:absolute;left:50%;bottom:-9px;width:5px;height:9px;margin-left:-2.5px;border-radius:2px;background:var(--amber)}
html[data-skin="g41"] #skinStage .gu.off{opacity:.35;box-shadow:none}""",
    cfg=dict(tip='第{n}天'), ),
dict(id='g42', name='归巢·鸽舍', tag='石灰赭红', eng='grow', mech='nests', bind='week7', max=7, h=172,
    anchors=dict(bg='#E5DFD6', card='#F0EAE1', ink='#33291F', a1='#9C4A38', a2='#7A6A54'),
    dark=dict(dbg='#141210', dcard='#1E1B17', dink='#DAD3C6'),
    stage='repeating-linear-gradient(0deg, rgba(122,106,84,.06) 0 2px, transparent 2px 18px), radial-gradient(50% 42% at 16% 0%, rgba(156,74,56,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g42"] #skinStage .gu{width:40px;height:30px;background:var(--field);border:1px solid var(--line-2);border-radius:22px 22px 4px 4px;overflow:hidden}
html[data-skin="g42"] #skinStage .gu::before{content:"";position:absolute;left:50%;bottom:-4px;width:16px;height:16px;border-radius:50% 50% 42% 42%;background:linear-gradient(160deg,#EDE6DA,#C9BFB0);transform:translateX(-50%);transition:transform .25s}
html[data-skin="g42"] #skinStage .gu.on::before{transform:translate(-50%,-8px)}
html[data-skin="g42"] #skinStage .gu::after{content:"";position:absolute;left:50%;bottom:8px;width:3px;height:3px;border-radius:50%;background:var(--a1-2, var(--red));transform:translateX(-50%)}""",
    cfg=dict(tip='{d}'), ),
dict(id='g43', name='龙骨·造船', tag='深海桐棕', eng='grow', mech='keel', bind='streak30', max=10, h=178,
    anchors=dict(bg='#DFE3E6', card='#EAEDEF', ink='#1F2A33', a1='#8A5A2E', a2='#2F5D74'),
    dark=dict(dbg='#0E1216', dcard='#171E24', dink='#CBD6DC'),
    stage='repeating-linear-gradient(6deg, rgba(47,93,116,.05) 0 2px, transparent 2px 20px), radial-gradient(56% 40% at 88% 0%, rgba(138,90,46,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g43"] #skinStage .gu{width:34px;height:18px;background:linear-gradient(160deg,var(--a1-2, var(--amber)),var(--amber-soft));border-radius:3px;transform:skewX(-32deg);box-shadow:inset 0 2px 0 rgba(255,235,200,.3)}
html[data-skin="g43"] #skinStage .gu.off{background:var(--field);box-shadow:inset 0 0 0 1px var(--line-2)}
html[data-skin="g43"] #skinStage .sk-decor.d-g43::after{content:"";position:absolute;right:10%;top:12%;width:2px;height:52%;background:var(--ink-3);border-radius:2px}
html[data-skin="g43"] #skinStage .sk-decor.d-g43::before{content:"";position:absolute;right:calc(10% - 14px);top:12%;width:30px;height:18px;background:var(--a2-2, var(--green));clip-path:polygon(0 0,100% 50%,0 100%);opacity:0;transition:opacity .3s}
html[data-skin="g43"] #skinStage.flag .sk-decor.d-g43::before{opacity:1}""",
    cfg=dict(tip='{n}/30'), ),
dict(id='g44', name='钨丝·灯泡', tag='煤灰钨橙', eng='grow', mech='bulbs', bind='macro', max=3, h=176,
    anchors=dict(bg='#26262A', card='#33333A', ink='#EFEAE0', a1='#E08A3C', a2='#8FA0B4'),
    dark=dict(always=True, dbg='#17171B', dcard='#232329', dink='#E9E4D8'),
    stage='radial-gradient(56% 44% at 50% 0%, rgba(224,138,60,.14), transparent 74%), repeating-linear-gradient(0deg, rgba(143,160,180,.04) 0 1px, transparent 1px 12px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g44"] #skinStage .gu{width:64px;height:78px;border-radius:50% 50% 46% 46%/56% 56% 40% 40%;background:radial-gradient(56% 50% at 50% 40%, rgba(224,138,60,var(--lit,0)), rgba(224,138,60,.06) 74%), var(--surface);box-shadow:inset 0 0 0 2px rgba(143,160,180,.28)}
html[data-skin="g44"] #skinStage .gu::before{content:"";position:absolute;left:50%;bottom:-8px;width:20px;height:10px;margin-left:-10px;background:repeating-linear-gradient(0deg,#9AA6B4 0 2px,#6C7887 2px 4px);border-radius:2px}
html[data-skin="g44"] #skinStage .gu::after{content:"";position:absolute;left:50%;top:44%;width:34%;height:1.5px;background:var(--amber);box-shadow:0 5px 0 -0.5px var(--amber),0 -5px 0 -0.5px var(--amber);opacity:calc(var(--lit,0)*.9)}
html[data-skin="g44"] #skinStage .gu b{position:relative;z-index:1;font-size:10px;color:var(--ink-2);bottom:-26px}""",
    cfg=dict(tip='{k}{n}g'), ),
dict(id='g45', name='石庭·叠石', tag='枯山水墨', eng='grow', mech='stones', bind='count', max=9, h=172,
    anchors=dict(bg='#E4E2DB', card='#EFEBE4', ink='#2C2A26', a1='#5E6E66', a2='#8C8378'),
    dark=dict(dbg='#111210', dcard='#1A1C19', dink='#D5D2C8'),
    stage='repeating-radial-gradient(circle at 30% 100%, rgba(140,131,120,.06) 0 2px, transparent 2px 26px), radial-gradient(52% 40% at 76% 4%, rgba(94,110,102,.10), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g45"] #skinStage .gu{width:44px;height:26px;border-radius:50%/62% 62% 44% 44%;background:linear-gradient(155deg,var(--surface-2),var(--line-2));box-shadow:0 3px 8px rgba(44,42,38,.16), inset 0 2px 0 rgba(255,255,255,.4)}
html[data-skin="g45"] #skinStage .gu:nth-child(3n){width:36px;height:22px}
html[data-skin="g45"] #skinStage .gu:nth-child(3n+1){border-radius:50%/56% 56% 48% 48%}
html[data-skin="g45"] #skinStage .gu.off{opacity:.3;box-shadow:none}""",
    cfg=dict(tip='{n} 笔'), ),
# ================= E-B 表计·指针（meter） =================
dict(id='g46', name='寒暑表·水银', tag='玻璃汞红', eng='meter', mech='column', bind='progress', max=5, h=196,
    anchors=dict(bg='#E6EBEA', card='#F0F4F3', ink='#25333A', a1='#B4472F', a2='#4E7F8C'),
    dark=dict(dbg='#101617', dcard='#192124', dink='#CFDCDA'),
    stage='radial-gradient(44% 40% at 14% 6%, rgba(180,71,47,.10), transparent 70%), repeating-linear-gradient(0deg, rgba(78,127,140,.05) 0 1px, transparent 1px 16px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g46"] #skinStage .mt-tube{width:18px;border-radius:10px;background:linear-gradient(90deg,rgba(255,255,255,.65),rgba(210,225,224,.4));box-shadow:inset 0 0 0 1px var(--line-2), inset -3px 0 4px rgba(37,51,58,.08)}
html[data-skin="g46"] #skinStage .mt-col{background:linear-gradient(180deg,var(--a1-2, var(--red)),#8E3322);border-radius:10px}
html[data-skin="g46"] #skinStage .mt-bulb{width:34px;height:34px;border-radius:50%;background:radial-gradient(60% 60% at 40% 36%,#D96A50,var(--a1-2, var(--red)) 72%);box-shadow:0 0 12px rgba(180,71,47,.4)}
html[data-skin="g46"] #skinStage .mt-marks i{width:12px;height:1.5px;background:var(--ink-3)}""",
    cfg=dict(unit='kcal'), ),
dict(id='g47', name='黄铜·仪表', tag='铜锈米黄', eng='meter', mech='gauge', bind='leftRatio', max=9, h=190,
    anchors=dict(bg='#E9E1CC', card='#F2EADA', ink='#3D3122', a1='#7C8C50', a2='#9C7C3C'),
    dark=dict(dbg='#161309', dcard='#211D12', dink='#E4DABE'),
    stage='repeating-conic-gradient(from -6deg at 50% 120%, rgba(156,124,60,.05) 0 4deg, transparent 4deg 12deg), radial-gradient(52% 44% at 50% 0%, rgba(124,140,80,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g47"] #skinStage .mt-dial{background:radial-gradient(80% 80% at 50% 108%, var(--field), var(--surface-2));border:2px solid var(--a2-2, var(--amber));border-radius:50% 50% 8px 8px/96% 96% 8px 8px;box-shadow:0 6px 16px rgba(61,49,18,.12)}
html[data-skin="g47"] #skinStage .mt-needle{width:4px;height:44%;background:linear-gradient(180deg,var(--a1-2, var(--green)),transparent);border-radius:3px;transform-origin:50% 100%}
html[data-skin="g47"] #skinStage .mt-pin{width:12px;height:12px;border-radius:50%;background:radial-gradient(60% 60% at 36% 32%,#E8D9A8,var(--a2-2, var(--amber)))}""",
    cfg=dict(unit='kcal'), ),
dict(id='g48', name='药戥·天平', tag='乌木黄铜', eng='meter', mech='balance', bind='deficit', max=7, h=180,
    anchors=dict(bg='#E3DCD0', card='#EFE7DA', ink='#2E2A20', a1='#9C7C3C', a2='#4A4234'),
    dark=dict(dbg='#121009', dcard='#1C1912', dink='#DDD4C0'),
    stage='radial-gradient(48% 40% at 50% 0%, rgba(156,124,60,.12), transparent 72%), repeating-linear-gradient(90deg, rgba(74,66,52,.04) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g48"] #skinStage .mt-beam{height:4px;border-radius:3px;background:linear-gradient(90deg,transparent,var(--a1-2, var(--amber)) 12% 88%,transparent);transform-origin:50% 50%;transition:transform .5s cubic-bezier(.3,1.3,.4,1)}
html[data-skin="g48"] #skinStage .mt-pan{width:52px;height:14px;border-radius:0 0 26px 26px;background:linear-gradient(180deg,var(--a2-2, var(--amber)),var(--amber-soft));box-shadow:0 3px 8px rgba(46,42,32,.18)}
html[data-skin="g48"] #skinStage .mt-pan::before{content:"";position:absolute;left:50%;top:-12px;width:1px;height:12px;background:var(--ink-3)}
html[data-skin="g48"] #skinStage .mt-col{width:6px;height:64%;background:linear-gradient(180deg,var(--a2-2, var(--amber)),var(--amber-soft));border-radius:4px}""",
    cfg=dict(unit='kcal'), ),
dict(id='g49', name='电量·格条', tag='石墨荧光', eng='meter', mech='cells', bind='leftRatio', max=5, h=168,
    anchors=dict(bg='#20242A', card='#2B313A', ink='#DFE8E2', a1='#59D98C', a2='#4A94A8'),
    dark=dict(always=True, dbg='#14171C', dcard='#1F2530', dink='#D9E4DC'),
    stage='radial-gradient(50% 40% at 50% 0%, rgba(89,217,140,.12), transparent 72%), repeating-linear-gradient(90deg, rgba(74,148,168,.05) 0 1px, transparent 1px 18px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g49"] #skinStage .mt-cells{gap:6px;padding:10px 14px;border:2px solid rgba(89,217,140,.4);border-radius:14px;background:linear-gradient(180deg,rgba(89,217,140,.06),transparent)}
html[data-skin="g49"] #skinStage .mt-cells::after{content:"";position:absolute;right:-8px;top:30%;width:6px;height:40%;border-radius:0 4px 4px 0;background:rgba(89,217,140,.4)}
html[data-skin="g49"] #skinStage .mt-cell{flex:1;height:38px;border-radius:6px;background:rgba(89,217,140,.10);box-shadow:inset 0 0 0 1px rgba(89,217,140,.3)}
html[data-skin="g49"] #skinStage .mt-cell.on{background:linear-gradient(180deg,var(--a1-2, var(--green)),rgba(89,217,140,.5));box-shadow:0 0 10px rgba(89,217,140,.4)}
html[data-skin="g49"] #skinStage .mt-cell.on::after{content:"";position:absolute;inset:2px;border-radius:4px;background:linear-gradient(180deg,rgba(255,255,255,.22),transparent)}""",
    cfg=dict(unit='kcal'), ),
dict(id='g50', name='气象·风速', tag='天青云白', eng='meter', mech='anemo', bind='count', max=12, h=188,
    anchors=dict(bg='#E2E9EC', card='#EDF2F4', ink='#22323C', a1='#3E88A8', a2='#E0A040'),
    dark=dict(dbg='#0F1518', dcard='#182126', dink='#CFE0E6'),
    stage='radial-gradient(60% 44% at 22% 0%, rgba(62,136,168,.14), transparent 72%), repeating-linear-gradient(84deg, rgba(224,160,64,.04) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g50"] #skinStage .mo-cups{width:52px;height:52px;position:relative}
html[data-skin="g50"] #skinStage .mo-cups i{position:absolute;left:50%;top:50%;width:14px;height:20px;margin:-10px 0 0 -7px;border-radius:3px 3px 10px 10px;background:linear-gradient(180deg,var(--surface),var(--line-2))}
html[data-skin="g50"] #skinStage .mo-cups i:nth-child(1){transform:rotate(0deg) translateY(-18px)}
html[data-skin="g50"] #skinStage .mo-cups i:nth-child(2){transform:rotate(120deg) translateY(-18px)}
html[data-skin="g50"] #skinStage .mo-cups i:nth-child(3){transform:rotate(240deg) translateY(-18px)}
html[data-skin="g50"] #skinStage .mo-vane{width:44px;height:10px;background:linear-gradient(90deg,var(--a2-2, var(--amber)),var(--amber-soft));clip-path:polygon(0 40%,64% 40%,64% 0,100% 50%,64% 100%,64% 60%,0 60%)}""",
    cfg=dict(unit='杯'), ),
dict(id='g51', name='电子管·调频', tag='胡桃琥珀', eng='meter', mech='scalex', bind='leftRatio', max=9, h=182,
    anchors=dict(bg='#E2D6C2', card='#EDE2CF', ink='#39301F', a1='#C2803A', a2='#7C8C50'),
    dark=dict(dbg='#151008', dcard='#1F1910', dink='#E2D5B8'),
    stage='repeating-linear-gradient(0deg, rgba(194,128,58,.05) 0 1px, transparent 1px 12px), radial-gradient(50% 42% at 84% 4%, rgba(124,140,80,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g51"] #skinStage .mt-scale{height:56px;border-radius:12px;background:linear-gradient(180deg,#2E2A24,#1F1C17);box-shadow:inset 0 0 0 1px rgba(226,213,184,.2), 0 4px 12px rgba(57,48,31,.2);position:relative;overflow:hidden}
html[data-skin="g51"] #skinStage .mt-scale::before{content:"";position:absolute;inset:8px 12px;background:repeating-linear-gradient(90deg,rgba(226,213,184,.5) 0 1px,transparent 1px 24px),repeating-linear-gradient(90deg,rgba(226,213,184,.9) 0 1px,transparent 1px 120px);background-size:auto 60%,auto 100%;background-position:0 100%,0 0}
html[data-skin="g51"] #skinStage .mt-needle-x{width:2.5px;height:70%;top:15%;background:linear-gradient(180deg,#FFD9A0,#C2803A);box-shadow:0 0 8px rgba(255,217,160,.8);border-radius:2px}
html[data-skin="g51"] #skinStage .mt-scale::after{content:"";position:absolute;left:12px;right:12px;top:12px;height:8px;border-radius:6px;background:radial-gradient(50% 100% at 50% 50%,rgba(194,128,58,.5),transparent)}""",
    cfg=dict(unit='kcal'), ),
dict(id='g52', name='座钟·摆锤', tag='胡桃鎏金', eng='meter', mech='swing', bind='progress', max=9, h=200,
    anchors=dict(bg='#E5DBCC', card='#F0E7D8', ink='#38291C', a1='#B08A3E', a2='#6E4E2E'),
    dark=dict(dbg='#140F09', dcard='#1E1811', dink='#E0D2B4'),
    stage='radial-gradient(46% 42% at 50% 0%, rgba(176,138,62,.14), transparent 70%), repeating-linear-gradient(0deg, rgba(110,78,46,.05) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g52"] #skinStage .mt-case{width:120px;height:100%;background:linear-gradient(160deg,var(--a2-2, var(--amber)),var(--amber-soft));border-radius:14px 14px 8px 8px;box-shadow:inset 0 0 0 2px rgba(56,41,28,.18), 0 8px 18px rgba(56,41,28,.14);position:relative;overflow:hidden}
html[data-skin="g52"] #skinStage .mt-face{width:64px;height:64px;margin:8px auto 0;border-radius:50%;background:radial-gradient(70% 70% at 42% 36%,var(--surface),var(--field));box-shadow:inset 0 0 0 3px var(--a1-2, var(--amber))}
html[data-skin="g52"] #skinStage .mt-pend{width:3px;height:54px;background:var(--ink-3);transform-origin:50% 0}
html[data-skin="g52"] #skinStage .mt-pend::after{content:"";position:absolute;left:50%;bottom:-14px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:radial-gradient(60% 60% at 40% 34%,#E8C983,var(--a1-2, var(--amber)))}""",
    cfg=dict(unit='kcal'), ),
dict(id='g53', name='沙漏·双锥', tag='紫檀沙金', eng='meter', mech='hourglass', bind='leftRatio', max=7, h=196,
    anchors=dict(bg='#E6DAD3', card='#F1E6DF', ink='#3A2620', a1='#8C5A4A', a2='#C9A25E'),
    dark=dict(dbg='#150F0C', dcard='#1F1815', dink='#DFCFC2'),
    stage='radial-gradient(46% 40% at 50% 0%, rgba(201,162,94,.12), transparent 70%), repeating-linear-gradient(90deg, rgba(140,90,74,.04) 0 1px, transparent 1px 16px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g53"] #skinStage .hg-frame{width:96px;height:100%;padding:10px 0;background:linear-gradient(180deg,var(--a2-2, var(--amber)),var(--amber-soft));border-radius:10px;box-shadow:inset 0 0 0 2px rgba(58,38,32,.16);position:relative}
html[data-skin="g53"] #skinStage .hg-glass{position:absolute;left:14px;right:14px;top:8px;bottom:8px;background:linear-gradient(105deg,rgba(255,255,255,.5),rgba(230,218,211,.25) 40%,rgba(255,255,255,.4));clip-path:polygon(0 0,100% 0,58% 50%,100% 100%,0 100%,42% 50%)}
html[data-skin="g53"] #skinStage .hg-top{position:absolute;left:0;right:0;height:var(--v,50%);background:linear-gradient(180deg,var(--a1-2, var(--amber)),rgba(201,162,94,.7));clip-path:polygon(0 0,100% 0,calc(100% - 30%) 100%,30% 100%);top:8px}
html[data-skin="g53"] #skinStage .hg-stream{position:absolute;left:50%;top:44%;width:2px;height:18%;margin-left:-1px;background:repeating-linear-gradient(180deg,var(--a1-2, var(--amber)) 0 3px,transparent 3px 6px)}""",
    cfg=dict(unit='kcal'), ),
dict(id='g54', name='雨量·檐滴', tag='黛瓦青苔', eng='meter', mech='gaugecol', bind='progress', max=10, h=188,
    anchors=dict(bg='#DFE3DF', card='#EAEFEB', ink='#242E28', a1='#3E7C5A', a2='#5A6C78'),
    dark=dict(dbg='#0F1311', dcard='#182019', dink='#CBD8CE'),
    stage='repeating-linear-gradient(94deg, rgba(90,108,120,.05) 0 2px, transparent 2px 18px), radial-gradient(48% 40% at 12% 0%, rgba(62,124,90,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g54"] #skinStage .mt-tube{width:26px;border-radius:4px 4px 12px 12px;background:linear-gradient(90deg,rgba(255,255,255,.5),rgba(210,224,218,.35));box-shadow:inset 0 0 0 1px var(--line-2)}
html[data-skin="g54"] #skinStage .mt-col{background:linear-gradient(180deg,rgba(62,124,90,.85),var(--a1-2, var(--green)));border-radius:4px 4px 10px 10px}
html[data-skin="g54"] #skinStage .mt-drops i{position:absolute;top:-6px;width:7px;height:10px;border-radius:50% 50% 60% 60%;background:var(--a2-2, var(--green));opacity:.85;animation:sk54-drop 1.1s ease-in infinite}
html[data-skin="g54"] #skinStage .mt-drops i:nth-child(2){animation-delay:.4s;left:24px}
html[data-skin="g54"] #skinStage .mt-drops i:nth-child(3){animation-delay:.8s;left:8px}
@keyframes sk54-drop{to{transform:translateY(46px);opacity:0}}""",
    cfg=dict(unit='kcal'), ),
dict(id='g55', name='星盘·浑天', tag='深空黄铜', eng='meter', mech='rings', bind='dayphase', max=12, h=200,
    anchors=dict(bg='#22283B', card='#2C3450', ink='#E8E4D2', a1='#C9A25E', a2='#6E88B4'),
    dark=dict(always=True, dbg='#151826', dcard='#1F2638', dink='#E4DFC8'),
    stage='radial-gradient(60% 46% at 50% 0%, rgba(201,162,94,.14), transparent 74%), repeating-radial-gradient(circle at 50% -20%, rgba(110,136,180,.05) 0 1px, transparent 1px 18px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g55"] #skinStage .rg-ring{position:absolute;left:50%;border-radius:50%;border:2px solid var(--a1-2, var(--amber));transform:translateX(-50%)}
html[data-skin="g55"] #skinStage .rg-ring.r1{width:150px;height:150px;top:6px;border-style:dashed;opacity:.7}
html[data-skin="g55"] #skinStage .rg-ring.r2{width:112px;height:112px;top:24px;border-color:var(--a2-2, var(--amber));transform:translateX(-50%) rotate3d(1,0,.4,60deg)}
html[data-skin="g55"] #skinStage .rg-ring.r3{width:80px;height:80px;top:40px;transform:translateX(-50%) rotate3d(0,.6,1,52deg);opacity:.8}
html[data-skin="g55"] #skinStage .rg-core{width:14px;height:14px;border-radius:50%;background:radial-gradient(60% 60% at 40% 34%,#FFE9AE,var(--a1-2, var(--amber)))}
html[data-skin="g55"] #skinStage .rg-star{position:absolute;width:4px;height:4px;border-radius:50%;background:#FFE9AE;box-shadow:0 0 6px rgba(255,233,174,.9)}""",
    cfg=dict(unit='星'), ),
# ================= E-C 铭牌·文字（plate） =================
dict(id='g56', name='翻牌·站牌', tag='铁皮信号橙', eng='plate', mech='flap', bind='left', max=6, h=186,
    anchors=dict(bg='#E3E5E6', card='#EEEFF0', ink='#262E33', a1='#D86830', a2='#5A6C78'),
    dark=dict(dbg='#101314', dcard='#191E21', dink='#D5DCDF'),
    stage='repeating-linear-gradient(0deg, rgba(90,108,120,.05) 0 1px, transparent 1px 12px), radial-gradient(50% 42% at 80% 0%, rgba(216,104,48,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g56"] #skinStage .fl-cell{width:34px;height:46px;border-radius:5px;background:linear-gradient(180deg,#3A4248 0 49%,#2C3338 51%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 3px 8px rgba(38,46,51,.2);position:relative;overflow:hidden}
html[data-skin="g56"] #skinStage .fl-cell b{position:absolute;left:0;right:0;top:5px;text-align:center;font-size:20px;font-weight:700;color:#F2E9DC;letter-spacing:.02em}
html[data-skin="g56"] #skinStage .fl-cell::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(0,0,0,.5)}
html[data-skin="g56"] #skinStage .fl-cell.flip b{animation:sk56-flip .34s ease}
@keyframes sk56-flip{0%{transform:rotateX(0)}49%{transform:rotateX(-88deg)}51%{transform:rotateX(88deg)}100%{transform:rotateX(0)}}""",
    cfg=dict(), ),
dict(id='g57', name='活字·字盘', tag='松烟宣纸', eng='plate', mech='type', bind='items', max=6, h=186,
    anchors=dict(bg='#E8E2D4', card='#F2EDDF', ink='#33302A', a1='#4A4E42', a2='#A04A32'),
    dark=dict(dbg='#121110', dcard='#1B1A17', dink='#DCD6C4'),
    stage='repeating-linear-gradient(0deg, rgba(74,78,66,.04) 0 1px, transparent 1px 14px), repeating-linear-gradient(90deg, rgba(74,78,66,.04) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g57"] #skinStage .ty-cell{min-width:40px;height:44px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,var(--surface-2),var(--field));border:1px solid var(--line-2);border-radius:4px;box-shadow:0 3px 6px rgba(51,48,42,.12), inset 0 -2px 0 rgba(51,48,42,.08);font-size:17px;color:var(--ink);padding:0 4px}
html[data-skin="g57"] #skinStage .ty-cell:active{background:var(--green-soft)}
html[data-skin="g57"] #skinStage .ty-cell.ink{color:var(--a2-2, var(--red));font-weight:600}""",
    cfg=dict(), ),
dict(id='g58', name='算筹·纵横', tag='竹青墨黑', eng='plate', mech='rods', bind='kcal', max=6, h=184,
    anchors=dict(bg='#E4E7DD', card='#EFF1E7', ink='#232B22', a1='#3E6E4A', a2='#8A5A2E'),
    dark=dict(dbg='#0F120E', dcard='#171E18', dink='#D0DACC'),
    stage='repeating-linear-gradient(90deg, rgba(62,110,74,.05) 0 1px, transparent 1px 18px), radial-gradient(50% 40% at 16% 0%, rgba(138,90,46,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g58"] #skinStage .rd-group{gap:3px}
html[data-skin="g58"] #skinStage .rd-i{width:3.5px;height:34px;border-radius:2px;background:linear-gradient(180deg,var(--ink),var(--ink-2))}
html[data-skin="g58"] #skinStage .rd-i.h{width:26px;height:3.5px;background:linear-gradient(90deg,var(--a1-2, var(--green)),var(--green-deep))}
html[data-skin="g58"] #skinStage .rd-cap{font-size:11px;color:var(--ink-3)}""",
    cfg=dict(), ),
dict(id='g59', name='闸机·LED', tag='钢灰荧光橙', eng='plate', mech='led', bind='count', max=9, h=180,
    anchors=dict(bg='#2A2C2E', card='#35383B', ink='#E8E6E0', a1='#F08A3C', a2='#5E7480'),
    dark=dict(always=True, dbg='#1B1D1F', dcard='#26292C', dink='#E4E2DA'),
    stage='radial-gradient(52% 42% at 50% 0%, rgba(240,138,60,.14), transparent 72%), repeating-linear-gradient(0deg, rgba(94,116,128,.05) 0 1px, transparent 1px 12px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g59"] #skinStage .pl-mech{background:linear-gradient(180deg,#20262B,#171C21);border-radius:12px;box-shadow:inset 0 0 0 1px rgba(94,116,128,.3), inset 0 6px 14px rgba(0,0,0,.4);padding:12px 16px}
html[data-skin="g59"] #skinStage .led-num{font:700 44px/1.1 ui-monospace,Consolas,monospace;color:var(--a1-2, var(--amber));text-shadow:0 0 12px rgba(240,138,60,.75),0 0 2px rgba(240,138,60,.9);letter-spacing:.08em}
html[data-skin="g59"] #skinStage .led-sub{font:600 11px/1.4 ui-monospace,Consolas,monospace;color:rgba(240,138,60,.55);letter-spacing:.3em}""",
    cfg=dict(), ),
dict(id='g60', name='电梯·楼层', tag='井道轿厢金', eng='plate', mech='floors', bind='count', max=9, h=198,
    anchors=dict(bg='#E1E2E3', card='#EBECEE', ink='#272A2E', a1='#B09040', a2='#4E5E6C'),
    dark=dict(dbg='#101214', dcard='#191D20', dink='#D4D8DB'),
    stage='repeating-linear-gradient(0deg, rgba(78,94,108,.05) 0 2px, transparent 2px 20px), radial-gradient(46% 40% at 86% 2%, rgba(176,144,64,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g60"] #skinStage .fl-rail{position:absolute;left:14px;top:10px;bottom:10px;width:8px;border-radius:5px;background:repeating-linear-gradient(180deg,var(--field) 0 16px,var(--line-2) 16px 17px);box-shadow:inset 0 0 0 1px var(--line-2)}
html[data-skin="g60"] #skinStage .fl-cab{position:absolute;left:6px;width:24px;height:30px;border-radius:5px;background:linear-gradient(160deg,var(--a1-2, var(--amber)),var(--amber-soft));box-shadow:0 3px 10px rgba(39,42,46,.25);transition:top .45s cubic-bezier(.3,1.2,.4,1)}
html[data-skin="g60"] #skinStage .fl-cab::before{content:"▲";position:absolute;left:50%;top:3px;transform:translateX(-50%);font-size:10px;color:rgba(255,255,255,.8)}
html[data-skin="g60"] #skinStage .fl-num{position:absolute;right:16px;font:700 40px/1 ui-monospace,Consolas,monospace;color:var(--ink)}""",
    cfg=dict(), ),
dict(id='g61', name='火漆·封缄', tag='绛红羊皮', eng='plate', mech='seal', bind='recorded', max=6, h=188,
    anchors=dict(bg='#E9DFCE', card='#F2E9D9', ink='#3A2A22', a1='#A6322A', a2='#8C6E4B'),
    dark=dict(dbg='#140F0B', dcard='#1E1812', dink='#E2D6C2'),
    stage='radial-gradient(48% 42% at 20% 4%, rgba(166,50,42,.10), transparent 68%), repeating-linear-gradient(8deg, rgba(140,110,75,.04) 0 2px, transparent 2px 20px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g61"] #skinStage .se-wax{width:74px;height:74px;border-radius:50%;background:radial-gradient(66% 66% at 42% 36%,#C4483C,var(--a1-2, var(--red)) 72%);box-shadow:0 6px 14px rgba(166,50,42,.3), inset 0 3px 6px rgba(255,220,210,.4), inset 0 -4px 8px rgba(90,20,16,.4);display:flex;align-items:center;justify-content:center;position:relative}
html[data-skin="g61"] #skinStage .se-wax::before{content:"";position:absolute;inset:9px;border-radius:50%;border:1.5px solid rgba(255,230,220,.55)}
html[data-skin="g61"] #skinStage .se-wax b{font-size:26px;color:#F6E8DC}
html[data-skin="g61"] #skinStage .se-flap{position:absolute;left:14%;right:14%;top:6px;height:34px;background:linear-gradient(180deg,var(--amber-soft),var(--field));clip-path:polygon(0 0,100% 0,50% 100%);opacity:.9;border-radius:3px 3px 0 0}""",
    cfg=dict(), ),
dict(id='g62', name='黑板·粉笔', tag='墨板粉白', eng='plate', mech='chalk', bind='items', max=5, h=196,
    anchors=dict(bg='#2F3B34', card='#38453D', ink='#EDEEE0', a1='#E8DCA8', a2='#C9D8C0'),
    dark=dict(always=True, dbg='#232E28', dcard='#2C3831', dink='#F2F2E8'),
    stage='radial-gradient(52% 44% at 84% 0%, rgba(232,220,168,.08), transparent 70%), repeating-linear-gradient(2deg, rgba(201,216,192,.03) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g62"] #skinStage .pl-mech{background:linear-gradient(165deg,#37463C,#2A3830);border-radius:12px;box-shadow:inset 0 0 0 6px #8A6E4E, inset 0 0 22px rgba(0,0,0,.4);padding:14px 16px}
html[data-skin="g62"] #skinStage .ck-line{font:600 15px/1.9 "Kaiti SC",KaiTi,cursive;color:var(--a2-2, #EFEFE4);text-shadow:0 0 3px rgba(240,239,230,.35);letter-spacing:.06em}
html[data-skin="g62"] #skinStage .ck-line em{font-style:normal;color:var(--a1-2, var(--amber));font-size:12px;margin-left:8px}
html[data-skin="g62"] #skinStage .ck-line::before{content:"· ";color:rgba(240,239,230,.5)}""",
    cfg=dict(), ),
dict(id='g63', name='灯箱·影院', tag='绒红排灯黄', eng='plate', mech='marquee', bind='kcal', max=6, h=190,
    anchors=dict(bg='#2A1E22', card='#3A282E', ink='#F2E6D0', a1='#E8B85C', a2='#B04A44'),
    dark=dict(always=True, dbg='#1A1316', dcard='#261B20', dink='#EBDFC8'),
    stage='radial-gradient(56% 44% at 50% 0%, rgba(232,184,92,.16), transparent 74%), repeating-linear-gradient(90deg, rgba(176,74,68,.06) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g63"] #skinStage .pl-mech{background:linear-gradient(180deg,#46222C,#371A22);border-radius:14px;box-shadow:inset 0 0 0 3px #C9964A, inset 0 0 26px rgba(0,0,0,.4);padding:14px 16px;position:relative}
html[data-skin="g63"] #skinStage .mq-bulbs{position:absolute;left:10px;right:10px;top:6px;height:8px;background:radial-gradient(circle 3px at 8px 4px,#FFE9AE 40%,transparent 46%),radial-gradient(circle 3px at 28px 4px,#FFE9AE 40%,transparent 46%),radial-gradient(circle 3px at 48px 4px,#FFE9AE 40%,transparent 46%),radial-gradient(circle 3px at 68px 4px,#FFE9AE 40%,transparent 46%);background-repeat:repeat-x;background-size:20px 8px;animation:sk63-blink 1.2s steps(2) infinite}
@keyframes sk63-blink{50%{opacity:.45}}
html[data-skin="g63"] #skinStage .mq-title{font:700 30px/1.3 "Kaiti SC",KaiTi,serif;color:#FFE9AE;text-shadow:0 0 14px rgba(232,184,92,.55),0 2px 0 rgba(0,0,0,.4)}""",
    cfg=dict(), ),
dict(id='g64', name='码头·水尺', tag='海雾锈红', eng='plate', mech='tide', bind='left', max=6, h=186,
    anchors=dict(bg='#DFE6E8', card='#EAF0F1', ink='#22313A', a1='#B45A3C', a2='#3E788C'),
    dark=dict(dbg='#0F1417', dcard='#181F24', dink='#CFDEE2'),
    stage='repeating-linear-gradient(90deg, rgba(62,120,140,.05) 0 2px, transparent 2px 20px), radial-gradient(50% 40% at 14% 0%, rgba(180,90,60,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g64"] #skinStage .td-board{background:linear-gradient(160deg,var(--surface),var(--field));border:2px solid var(--a2-2, var(--amber));border-radius:10px;padding:10px 16px;box-shadow:0 6px 14px rgba(34,49,58,.14)}
html[data-skin="g64"] #skinStage .td-num{font:700 40px/1.15 ui-monospace,Consolas,monospace;color:var(--ink);font-variant-numeric:tabular-nums}
html[data-skin="g64"] #skinStage .td-ticks{display:flex;gap:5px;align-items:flex-end;height:14px}
html[data-skin="g64"] #skinStage .td-ticks i{width:3px;background:var(--a1-2, var(--red));border-radius:2px}
html[data-skin="g64"] #skinStage .td-ticks i:nth-child(odd){height:9px;opacity:.55}
html[data-skin="g64"] #skinStage .td-ticks i:nth-child(even){height:14px}""",
    cfg=dict(), ),
dict(id='g65', name='砝码·天平盘', tag='铜绿呢绒', eng='plate', mech='weights', bind='meals', max=5, h=188,
    anchors=dict(bg='#E2E5DF', card='#ECEFE9', ink='#26302B', a1='#5E8C6A', a2='#9C7C3C'),
    dark=dict(dbg='#101412', dcard='#181F1B', dink='#D2DACC'),
    stage='radial-gradient(50% 42% at 50% 0%, rgba(156,124,60,.10), transparent 72%), repeating-linear-gradient(0deg, rgba(94,140,106,.04) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g65"] #skinStage .wt-row{gap:12px;flex-wrap:wrap;justify-content:center}
html[data-skin="g65"] #skinStage .wt-chip{width:56px;height:56px;border-radius:50% 50% 46% 46%;background:linear-gradient(155deg,var(--a2-2, var(--amber)),var(--amber-soft));box-shadow:0 5px 10px rgba(38,48,43,.18), inset 0 2px 0 rgba(255,255,255,.4), inset 0 -3px 0 rgba(0,0,0,.12);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
html[data-skin="g65"] #skinStage .wt-chip::before{content:"";position:absolute;top:8px;left:50%;width:16px;height:5px;margin-left:-8px;border-radius:3px;background:var(--field);box-shadow:inset 0 1px 2px rgba(0,0,0,.25)}
html[data-skin="g65"] #skinStage .wt-chip b{font-size:12px;color:var(--ink)}
html[data-skin="g65"] #skinStage .wt-chip i{font-style:normal;font-size:10px;color:var(--ink-2)}""",
    cfg=dict(), ),
# ================= E-D 容器·堆积（vessel） =================
dict(id='g66', name='信匣·信件', tag='牛皮火漆红', eng='vessel', mech='rack', bind='items', max=6, h=190,
    anchors=dict(bg='#E6DCC8', card='#F0E7D4', ink='#3A2E1E', a1='#A65832', a2='#7C8C50'),
    dark=dict(dbg='#141009', dcard='#1E1911', dink='#DFD3B8'),
    stage='repeating-linear-gradient(0deg, rgba(166,88,50,.05) 0 1px, transparent 1px 18px), radial-gradient(48% 40% at 84% 2%, rgba(124,140,80,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g66"] #skinStage .vs-body{background:linear-gradient(160deg,#8A6844,#6E5236);border-radius:10px;box-shadow:inset 0 0 0 2px rgba(58,46,30,.25), 0 6px 14px rgba(58,46,30,.18);padding:10px}
html[data-skin="g66"] #skinStage .vs-it{width:64px;height:44px;border-radius:4px;background:linear-gradient(155deg,#F4ECD8,#E2D5B8);box-shadow:0 3px 7px rgba(58,46,30,.22);position:relative;overflow:hidden}
html[data-skin="g66"] #skinStage .vs-it::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 0 48%,rgba(166,88,50,.5) 49% 51%,transparent 52%)}
html[data-skin="g66"] #skinStage .vs-it::after{content:"";position:absolute;left:50%;top:0;width:14px;height:10px;margin-left:-7px;background:radial-gradient(60% 100% at 50% 0,#C4483C 55%,#A6322A)}
html[data-skin="g66"] #skinStage .vs-it b{position:absolute;left:4px;bottom:2px;right:4px;font-size:10px;color:#5C4A2E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}""",
    cfg=dict(), ),
dict(id='g67', name='蒸笼·竹屉', tag='竹黄蒸汽白', eng='vessel', mech='stack', bind='count', max=4, h=198,
    anchors=dict(bg='#E7DFC8', card='#F1E9D2', ink='#3C3322', a1='#B08A3E', a2='#8C9C6E'),
    dark=dict(dbg='#14110A', dcard='#1E1A10', dink='#E0D6B8'),
    stage='radial-gradient(52% 44% at 50% 0%, rgba(255,255,255,.35), transparent 72%), repeating-linear-gradient(90deg, rgba(176,138,62,.05) 0 2px, transparent 2px 24px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g67"] #skinStage .st-layer{width:150px;height:34px;border-radius:8px;background:repeating-linear-gradient(90deg,var(--a1-2, var(--amber)) 0 4px,var(--amber-soft) 4px 9px);box-shadow:inset 0 0 0 1px rgba(60,51,34,.3), 0 4px 8px rgba(60,51,34,.14);position:relative}
html[data-skin="g67"] #skinStage .st-layer::before{content:"";position:absolute;left:-6px;right:-6px;top:-5px;height:8px;border-radius:6px;background:linear-gradient(90deg,var(--a2-2, var(--amber)),var(--amber-soft));box-shadow:inset 0 -2px 0 rgba(60,51,34,.25)}
html[data-skin="g67"] #skinStage .st-steam{position:absolute;left:50%;bottom:100%;width:60px;height:26px;margin-left:-30px;background:radial-gradient(40% 70% at 40% 100%,rgba(255,255,255,.75),transparent 70%),radial-gradient(36% 66% at 66% 100%,rgba(255,255,255,.6),transparent 72%);opacity:0;transition:opacity .3s}
html[data-skin="g67"] #skinStage.v-open .st-steam{opacity:1;animation:sk67-rise 1.6s ease infinite}
@keyframes sk67-rise{to{transform:translateY(-12px);opacity:0}}""",
    cfg=dict(), ),
dict(id='g68', name='签筒·灯谜', tag='朱漆签纸黄', eng='vessel', mech='tube', bind='items', max=6, h=192,
    anchors=dict(bg='#E8D9C4', card='#F2E5D1', ink='#3E2A1E', a1='#B03A2E', a2='#C9A25E'),
    dark=dict(dbg='#140E09', dcard='#1E1710', dink='#E4D5BC'),
    stage='radial-gradient(48% 42% at 78% 2%, rgba(201,162,94,.14), transparent 70%), repeating-linear-gradient(0deg, rgba(176,58,46,.04) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g68"] #skinStage .vs-body{width:92px;height:104px;border-radius:10px 10px 26px 26px;background:linear-gradient(160deg,#B4483A,#8E2E24);box-shadow:inset 0 0 0 2px rgba(62,42,30,.3), inset 0 -8px 14px rgba(90,20,16,.4), 0 8px 16px rgba(62,42,30,.2);position:relative}
html[data-skin="g68"] #skinStage .vs-body::before{content:"签";position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);font-size:26px;color:#F2E0C0;font-weight:700}
html[data-skin="g68"] #skinStage .st-stick{width:12px;height:78px;border-radius:4px;background:linear-gradient(180deg,#F2E5C8,#E0CD9E);box-shadow:0 2px 5px rgba(62,42,30,.2);transform-origin:50% 100%}
html[data-skin="g68"] #skinStage .st-stick b{position:absolute;left:50%;top:6px;transform:translateX(-50%) rotate(90deg);transform-origin:0 50%;font-size:10px;color:#6E4A2E;white-space:nowrap}""",
    cfg=dict(), ),
dict(id='g69', name='幕布·皮影', tag='幕布米影墨', eng='vessel', mech='puppet', bind='items', max=6, h=196,
    anchors=dict(bg='#E5DCCB', card='#F0E8D6', ink='#3A3028', a1='#B8863E', a2='#54483C'),
    dark=dict(dbg='#13100C', dcard='#1C1812', dink='#DFD5C0'),
    stage='radial-gradient(58% 46% at 50% 10%, rgba(184,134,62,.16), transparent 74%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g69"] #skinStage .pp-stage{position:absolute;inset:8px 10px;border-radius:8px;background:linear-gradient(180deg,rgba(255,240,214,.6),rgba(229,220,203,.9));box-shadow:inset 0 0 0 2px rgba(58,48,40,.2), inset 0 0 30px rgba(184,134,62,.18);overflow:hidden}
html[data-skin="g69"] #skinStage .pp-fig{position:absolute;bottom:8px;width:26px;height:58px;background:var(--ink);clip-path:polygon(50% 0,72% 14%,64% 26%,86% 34%,82% 46%,58% 46%,62% 100%,38% 100%,42% 46%,18% 46%,14% 34%,36% 26%,28% 14%);opacity:.85;transform-origin:50% 100%}
html[data-skin="g69"] #skinStage .pp-fig:nth-child(even){transform:scaleX(-1)}
html[data-skin="g69"] #skinStage.v-open .pp-fig{animation:sk69-show .6s ease}
@keyframes sk69-show{40%{transform:rotate(-8deg) translateY(-6px)}80%{transform:rotate(5deg)}}""",
    cfg=dict(), ),
dict(id='g70', name='炊烟·铁锅', tag='铸铁火苗橙', eng='vessel', mech='wok', bind='items', max=6, h=192,
    anchors=dict(bg='#2A2A2E', card='#38383E', ink='#EFE8DC', a1='#E8783C', a2='#B4A890'),
    dark=dict(always=True, dbg='#1A1A1E', dcard='#26262C', dink='#E9E2D4'),
    stage='radial-gradient(52% 42% at 50% 8%, rgba(232,120,60,.14), transparent 74%), repeating-linear-gradient(0deg, rgba(180,168,144,.04) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g70"] #skinStage .wk-pan{position:absolute;left:50%;bottom:22px;width:180px;height:64px;margin-left:-90px;border-radius:8px 8px 100px 100px;background:linear-gradient(180deg,#4A4A52,#26262C);box-shadow:inset 0 4px 10px rgba(0,0,0,.5), 0 10px 20px rgba(0,0,0,.3)}
html[data-skin="g70"] #skinStage .wk-flame{position:absolute;left:50%;bottom:6px;width:120px;height:18px;margin-left:-60px;background:radial-gradient(30% 90% at 30% 100%,rgba(232,120,60,.9),transparent 70%),radial-gradient(30% 90% at 55% 100%,rgba(255,180,80,.8),transparent 70%),radial-gradient(28% 86% at 76% 100%,rgba(232,120,60,.85),transparent 70%);filter:blur(1px);animation:sk70-flick .9s ease-in-out infinite alternate;transform-origin:50% 100%}
@keyframes sk70-flick{to{transform:scaleY(1.25) scaleX(.94)}}
html[data-skin="g70"] #skinStage .wk-bit{position:absolute;width:14px;height:10px;border-radius:6px;background:linear-gradient(150deg,var(--a2-2, #D8CFA8),#8E8468);box-shadow:0 2px 4px rgba(0,0,0,.35)}""",
    cfg=dict(), ),
dict(id='g71', name='陶罐·窖藏', tag='紫陶封泥', eng='vessel', mech='jarfill', bind='progress', max=10, h=192,
    anchors=dict(bg='#E3DAD2', card='#EEE4DC', ink='#33261F', a1='#7C4A56', a2='#A68C6E'),
    dark=dict(dbg='#120E0C', dcard='#1C1614', dink='#DDD0C4'),
    stage='radial-gradient(48% 42% at 16% 2%, rgba(124,74,86,.12), transparent 70%), repeating-linear-gradient(90deg, rgba(166,140,110,.04) 0 2px, transparent 2px 20px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g71"] #skinStage .jr-pot{position:absolute;left:50%;bottom:14px;width:130px;height:120px;margin-left:-65px;border-radius:44% 44% 40% 40%/26% 26% 52% 52%;background:linear-gradient(160deg,#8E5A64,#6E3E48);box-shadow:inset 0 6px 12px rgba(255,220,210,.16), inset 0 -10px 18px rgba(40,16,20,.4), 0 10px 18px rgba(51,38,31,.2);overflow:hidden}
html[data-skin="g71"] #skinStage .jr-fill{position:absolute;left:0;right:0;bottom:0;height:calc(var(--v,0)*84%);background:linear-gradient(180deg,rgba(201,162,94,.75),rgba(166,140,110,.85));transition:height .5s}
html[data-skin="g71"] #skinStage .jr-fill::before{content:"";position:absolute;left:0;right:0;top:-3px;height:6px;border-radius:50%;background:rgba(232,214,180,.7)}
html[data-skin="g71"] #skinStage .jr-seal{position:absolute;left:50%;top:-4px;width:56px;height:18px;margin-left:-28px;border-radius:8px;background:linear-gradient(160deg,#C9B896,#A69468);box-shadow:0 3px 6px rgba(51,38,31,.3)}""",
    cfg=dict(unit='kcal'), ),
dict(id='g72', name='书立·书脊', tag='藏书羊皮蓝', eng='vessel', mech='shelf', bind='items', max=6, h=190,
    anchors=dict(bg='#E1E4E6', card='#EBEEF0', ink='#26303A', a1='#3E628C', a2='#A68C5E'),
    dark=dict(dbg='#0F1216', dcard='#181E24', dink='#CFD9E0'),
    stage='repeating-linear-gradient(0deg, rgba(62,98,140,.05) 0 1px, transparent 1px 20px), radial-gradient(46% 40% at 84% 2%, rgba(166,140,94,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g72"] #skinStage .sh-board{position:absolute;left:8px;right:8px;bottom:26px;height:8px;border-radius:3px;background:linear-gradient(180deg,var(--a2-2, var(--amber)),var(--amber-soft));box-shadow:0 4px 8px rgba(38,48,58,.2)}
html[data-skin="g72"] #skinStage .sh-book{position:absolute;bottom:34px;width:26px;background:linear-gradient(180deg,var(--green-line),var(--green-deep));border-radius:3px 3px 0 0;box-shadow:inset 1.5px 0 0 rgba(255,255,255,.25), inset -1.5px 0 0 rgba(0,0,0,.2), 0 2px 4px rgba(38,48,58,.16);transform-origin:50% 100%;transition:transform .3s}
html[data-skin="g72"] #skinStage .sh-book:nth-child(2n){background:linear-gradient(180deg,var(--amber),var(--a2-2, var(--amber)))}
html[data-skin="g72"] #skinStage.v-open .sh-book:hover{transform:translateY(-8px) rotate(-3deg)}""",
    cfg=dict(), ),
dict(id='g73', name='井台·辘轳', tag='青砖井绳棕', eng='vessel', mech='well', bind='leftRatio', max=7, h=200,
    anchors=dict(bg='#E0E3DF', card='#EAEEE9', ink='#242C28', a1='#4E7C6A', a2='#8C6E4B'),
    dark=dict(dbg='#0F1210', dcard='#171F1B', dink='#CED8CF'),
    stage='repeating-linear-gradient(0deg, rgba(78,124,106,.05) 0 2px, transparent 2px 16px), radial-gradient(46% 40% at 84% 0%, rgba(140,110,75,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g73"] #skinStage .wl-frame{position:absolute;left:50%;bottom:26px;width:120px;height:120px;margin-left:-60px;border:3px solid var(--a2-2, var(--amber));border-bottom:0;border-radius:10px 10px 0 0;transform-origin:bottom}
html[data-skin="g73"] #skinStage .wl-rope{position:absolute;left:50%;top:0;width:2px;height:calc(30% + var(--v,0.5)*54%);margin-left:-1px;background:repeating-linear-gradient(180deg,var(--a1-2, var(--amber)) 0 5px,transparent 5px 8px)}
html[data-skin="g73"] #skinStage .wl-bucket{position:absolute;left:50%;top:calc(28% + var(--v,0.5)*52%);width:26px;height:22px;margin-left:-13px;border-radius:3px 3px 7px 7px;background:linear-gradient(160deg,#9C8C6E,#7C6E50);box-shadow:inset 0 2px 0 rgba(255,255,255,.3)}
html[data-skin="g73"] #skinStage .wl-pit{position:absolute;left:50%;bottom:10px;width:104px;height:16px;margin-left:-52px;border-radius:8px;background:linear-gradient(180deg,#3A423C,#242C28)}
html[data-skin="g73"] #skinStage .wl-water{position:absolute;left:8px;right:8px;top:4px;height:6px;border-radius:4px;background:linear-gradient(90deg,var(--a1-2, var(--green)),rgba(78,124,106,.4))}""",
    cfg=dict(unit='kcal'), ),
dict(id='g74', name='果篮·丰收', tag='藤黄果绿', eng='vessel', mech='basket', bind='items', max=6, h=188,
    anchors=dict(bg='#E8DFC4', card='#F2EAD0', ink='#3C3118', a1='#8C9C4E', a2='#C97C3A'),
    dark=dict(dbg='#14120A', dcard='#1E1B10', dink='#E2D8B4'),
    stage='repeating-linear-gradient(56deg, rgba(201,124,58,.06) 0 2px, transparent 2px 14px), repeating-linear-gradient(-56deg, rgba(140,156,78,.06) 0 2px, transparent 2px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g74"] #skinStage .bk-basket{position:absolute;left:50%;bottom:16px;width:170px;height:74px;margin-left:-85px;border-radius:10px 10px 60px 60px/10px 10px 80px 80px;background:repeating-linear-gradient(90deg,var(--a2-2, var(--amber)) 0 7px,var(--amber-soft) 7px 14px);box-shadow:inset 0 4px 10px rgba(60,49,24,.28), 0 8px 14px rgba(60,49,24,.16)}
html[data-skin="g74"] #skinStage .bk-basket::before{content:"";position:absolute;left:-4px;right:-4px;top:-8px;height:14px;border-radius:10px;background:repeating-linear-gradient(90deg,var(--a2-2, var(--amber)) 0 7px,var(--amber-soft) 7px 14px);box-shadow:inset 0 -2px 0 rgba(60,49,24,.3)}
html[data-skin="g74"] #skinStage .bk-fruit{position:absolute;width:26px;height:24px;border-radius:50%;box-shadow:inset -3px -4px 6px rgba(0,0,0,.2), inset 3px 3px 6px rgba(255,255,255,.35)}
html[data-skin="g74"] #skinStage .bk-fruit.c0{background:radial-gradient(60% 60% at 38% 34%,#E89A6A,#C9703A)}
html[data-skin="g74"] #skinStage .bk-fruit.c1{background:radial-gradient(60% 60% at 38% 34%,#B4C96A,#8C9C4E)}
html[data-skin="g74"] #skinStage .bk-fruit.c2{background:radial-gradient(60% 60% at 38% 34%,#E8C96A,#C9A23E)}""",
    cfg=dict(), ),
dict(id='g75', name='冰鉴·铜匣', tag='青铜冰蓝', eng='vessel', mech='icebox', bind='leftRatio', max=7, h=192,
    anchors=dict(bg='#DFE6E4', card='#EAF0EE', ink='#22322E', a1='#3E8C9C', a2='#7C9C6E'),
    dark=dict(dbg='#0F1414', dcard='#171F1F', dink='#CFDCDA'),
    stage='repeating-linear-gradient(0deg, rgba(62,140,156,.05) 0 1px, transparent 1px 14px), radial-gradient(50% 42% at 20% 0%, rgba(124,156,110,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g75"] #skinStage .ib-box{position:absolute;left:50%;bottom:16px;width:160px;height:110px;margin-left:-80px;border-radius:12px;background:linear-gradient(160deg,#6E8C7C,#4E6E62);box-shadow:inset 0 0 0 3px rgba(60,90,80,.4), inset 0 6px 12px rgba(255,255,255,.1), 0 10px 18px rgba(34,50,46,.22);overflow:hidden}
html[data-skin="g75"] #skinStage .ib-ice{position:absolute;left:0;right:0;bottom:0;height:calc(24% + var(--v,0.5)*56%);background:linear-gradient(180deg,rgba(214,238,244,.95),rgba(160,204,214,.9));transition:height .5s}
html[data-skin="g75"] #skinStage .ib-ice::before{content:"";position:absolute;left:10%;top:-4px;width:26%;height:8px;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:60px 3px 0 -1px rgba(255,255,255,.7),120px -2px 0 -2px rgba(255,255,255,.75)}
html[data-skin="g75"] #skinStage .ib-lid{position:absolute;left:6px;right:6px;top:-10px;height:16px;border-radius:8px;background:linear-gradient(160deg,#8CA494,#6E8C7C);transform-origin:left bottom;transition:transform .35s;box-shadow:0 3px 6px rgba(34,50,46,.3)}
html[data-skin="g75"] #skinStage.v-open .ib-lid{transform:rotate(-24deg) translateY(-6px)}""",
    cfg=dict(unit='kcal'), ),
# ================= E-E 动态·往复（motion） =================
dict(id='g76', name='唱片·旋转', tag='黑胶蜜橙', eng='motion', mech='disc', bind='recorded', max=6, h=192,
    anchors=dict(bg='#26221E', card='#332E28', ink='#EFE6D4', a1='#E8A04C', a2='#8C6E4B'),
    dark=dict(always=True, dbg='#181511', dcard='#241F19', dink='#EAE1CE'),
    stage='radial-gradient(56% 46% at 50% 4%, rgba(232,160,76,.16), transparent 74%), repeating-radial-gradient(circle at 30% 120%, rgba(140,110,75,.05) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g76"] #skinStage .mo-rotor{width:140px;height:140px;border-radius:50%;background:repeating-radial-gradient(circle at 50% 50%,#2C2822 0 2px,#1F1B16 2px 4px);box-shadow:0 8px 18px rgba(0,0,0,.4), inset 0 0 0 2px rgba(140,110,75,.3);position:relative}
html[data-skin="g76"] #skinStage .mo-rotor::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:radial-gradient(60% 60% at 40% 34%,#E8A04C,#B46E2E);box-shadow:0 0 0 3px rgba(239,230,212,.1)}
html[data-skin="g76"] #skinStage .mo-rotor::after{content:"";position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:#1F1B16}
html[data-skin="g76"] #skinStage .mo-arm{position:absolute;right:14px;top:12px;width:4px;height:78px;border-radius:3px;background:linear-gradient(180deg,#C9B896,#8C7C5E);transform-origin:50% 0;rotate:28deg}""",
    cfg=dict(), ),
dict(id='g77', name='水车·磨坊', tag='原木水蓝', eng='motion', mech='wheel', bind='progress', max=8, h=198,
    anchors=dict(bg='#E2E7E4', card='#EDF1EE', ink='#28322C', a1='#4E7C8C', a2='#8C6E4B'),
    dark=dict(dbg='#0F1312', dcard='#171F1D', dink='#CFDAD4'),
    stage='repeating-linear-gradient(88deg, rgba(78,124,140,.05) 0 2px, transparent 2px 20px), radial-gradient(50% 42% at 16% 0%, rgba(140,110,75,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g77"] #skinStage .mo-rotor{width:120px;height:120px;border-radius:50%;background:radial-gradient(70% 70% at 44% 40%,rgba(255,255,255,.28),rgba(140,110,75,.16) 70%);box-shadow:inset 0 0 0 5px var(--a2-2, var(--amber)), inset 0 0 0 7px rgba(40,50,44,.15);position:relative}
html[data-skin="g77"] #skinStage .mo-rotor i{position:absolute;left:50%;top:50%;width:6px;height:116px;margin:-58px 0 0 -3px;border-radius:4px;background:linear-gradient(180deg,var(--a2-2, var(--amber)),var(--amber-soft))}
html[data-skin="g77"] #skinStage .mo-rotor i:nth-child(2){transform:rotate(45deg)}
html[data-skin="g77"] #skinStage .mo-rotor i:nth-child(3){transform:rotate(90deg)}
html[data-skin="g77"] #skinStage .mo-rotor i:nth-child(4){transform:rotate(135deg)}
html[data-skin="g77"] #skinStage .mo-flow{position:absolute;left:10%;right:10%;bottom:10px;height:14px;border-radius:8px;background:repeating-linear-gradient(90deg,rgba(78,124,140,.4) 0 12px,rgba(78,124,140,.15) 12px 24px);animation:sk77-flow 2.6s linear infinite}
@keyframes sk77-flow{to{background-position:48px 0}}""",
    cfg=dict(), ),
dict(id='g78', name='纸鸢·风车', tag='洒金红竹白', eng='motion', mech='pinwheel', bind='progress', max=8, h=192,
    anchors=dict(bg='#E9DFD0', card='#F2E9DB', ink='#3A2E26', a1='#C44A3A', a2='#4E7C6A'),
    dark=dict(dbg='#140F0B', dcard='#1E1813', dink='#DFD4C2'),
    stage='radial-gradient(52% 44% at 82% 0%, rgba(196,74,58,.12), transparent 70%), repeating-linear-gradient(4deg, rgba(78,124,106,.04) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g78"] #skinStage .mo-rotor{width:110px;height:110px;border-radius:14px;position:relative;filter:drop-shadow(0 6px 10px rgba(58,46,38,.2))}
html[data-skin="g78"] #skinStage .mo-rotor i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:6px 50% 6px 60%}
html[data-skin="g78"] #skinStage .mo-rotor i:nth-child(1){background:var(--a1-2, var(--red));transform:rotate(0deg) translate(0,-26px)}
html[data-skin="g78"] #skinStage .mo-rotor i:nth-child(2){background:var(--a2-2, var(--green));transform:rotate(90deg) translate(0,-26px)}
html[data-skin="g78"] #skinStage .mo-rotor i:nth-child(3){background:var(--amber);transform:rotate(180deg) translate(0,-26px)}
html[data-skin="g78"] #skinStage .mo-rotor i:nth-child(4){background:var(--green-line);transform:rotate(270deg) translate(0,-26px)}
html[data-skin="g78"] #skinStage .mo-rotor::after{content:"";position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--surface);box-shadow:0 0 0 2px rgba(58,46,38,.3)}""",
    cfg=dict(), ),
dict(id='g79', name='走马·灯', tag='宫灯红绢黄', eng='motion', mech='lantern', bind='items', max=6, h=198,
    anchors=dict(bg='#2C2024', card='#3C2A30', ink='#F2E4CC', a1='#D86A4A', a2='#E8B85C'),
    dark=dict(always=True, dbg='#1B1317', dcard='#271C22', dink='#EBDCC4'),
    stage='radial-gradient(54% 44% at 50% 6%, rgba(216,106,74,.18), transparent 74%), repeating-linear-gradient(90deg, rgba(232,184,92,.05) 0 2px, transparent 2px 20px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g79"] #skinStage .lt-body{position:absolute;left:50%;bottom:14px;width:130px;height:130px;margin-left:-65px;border-radius:16px;background:linear-gradient(180deg,rgba(255,224,180,.28),rgba(255,224,180,.1));box-shadow:inset 0 0 0 3px var(--a1-2, var(--red)), inset 0 0 30px rgba(255,200,140,.3), 0 10px 22px rgba(0,0,0,.35);overflow:hidden;transform-style:preserve-3d}
html[data-skin="g79"] #skinStage .lt-body::before{content:"";position:absolute;inset:6px;background:repeating-linear-gradient(90deg,rgba(242,228,204,.14) 0 2px,transparent 2px 14px);border-radius:10px}
html[data-skin="g79"] #skinStage .lt-face{position:absolute;left:0;right:0;top:26px;text-align:center;font:700 15px/1.5 "Kaiti SC",KaiTi,serif;color:#FFE9C4;text-shadow:0 0 8px rgba(255,200,140,.5)}
html[data-skin="g79"] #skinStage .lt-cap{position:absolute;left:50%;bottom:138px;width:44px;height:12px;margin-left:-22px;border-radius:6px 6px 2px 2px;background:linear-gradient(160deg,var(--a2-2, var(--amber)),var(--amber-soft))}
html[data-skin="g79"] #skinStage .lt-tassel{position:absolute;left:50%;bottom:2px;width:3px;height:20px;margin-left:-1.5px;background:linear-gradient(180deg,var(--a1-2, var(--red)),transparent)}""",
    cfg=dict(), ),
dict(id='g80', name='织机·飞梭', tag='靛染本白', eng='motion', mech='loom', bind='miss14', max=14, h=196,
    anchors=dict(bg='#E3E0D4', card='#EEEBDF', ink='#2C3026', a1='#3E5A8C', a2='#8C9C6E'),
    dark=dict(dbg='#101114', dcard='#181B20', dink='#D5D6C4'),
    stage='repeating-linear-gradient(0deg, rgba(62,90,140,.05) 0 1px, transparent 1px 10px), radial-gradient(50% 40% at 84% 2%, rgba(140,156,110,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g80"] #skinStage .lw-warp{position:absolute;inset:12px 16px 30px;display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
html[data-skin="g80"] #skinStage .lw-cell{border-radius:2px;background:rgba(62,90,140,.14);min-height:14px}
html[data-skin="g80"] #skinStage .lw-cell.on{background:linear-gradient(160deg,var(--a1-2, var(--green)),var(--green-deep));box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}
html[data-skin="g80"] #skinStage .lw-shuttle{position:absolute;left:16px;right:16px;bottom:12px;height:14px;border-radius:8px;background:linear-gradient(90deg,var(--a2-2, var(--amber)),var(--amber-soft));box-shadow:0 3px 6px rgba(44,48,38,.2)}
html[data-skin="g80"] #skinStage .lw-shuttle::before{content:"";position:absolute;left:4px;right:4px;top:6px;height:2px;border-radius:2px;background:rgba(62,90,140,.5)}""",
    cfg=dict(tip='{d}'), ),
dict(id='g81', name='陀螺·鞭绳', tag='漆黑彩环', eng='motion', mech='top', bind='health', max=5, h=190,
    anchors=dict(bg='#24262B', card='#30343B', ink='#E8E4DA', a1='#5EB4D8', a2='#D86A8C'),
    dark=dict(always=True, dbg='#17191D', dcard='#21252C', dink='#E2DED2'),
    stage='radial-gradient(50% 42% at 50% 6%, rgba(94,180,216,.14), transparent 74%), repeating-linear-gradient(90deg, rgba(216,106,140,.04) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g81"] #skinStage .mo-rotor{width:84px;height:96px;position:relative}
html[data-skin="g81"] #skinStage .mo-rotor::before{content:"";position:absolute;left:50%;top:0;width:64px;height:74px;margin-left:-32px;border-radius:50% 50% 42% 42%/64% 64% 30% 30%;background:linear-gradient(160deg,var(--surface-2),var(--surface));box-shadow:inset 0 0 0 3px var(--a1-2, var(--green)), inset 0 -8px 14px rgba(0,0,0,.3)}
html[data-skin="g81"] #skinStage .mo-rotor::after{content:"";position:absolute;left:50%;bottom:0;width:8px;height:22px;margin-left:-4px;border-radius:3px 3px 2px 2px;background:linear-gradient(180deg,var(--a1-2, var(--green)),var(--green-deep))}
html[data-skin="g81"] #skinStage .mo-ring{position:absolute;left:50%;top:24px;width:46px;height:10px;margin-left:-23px;border-radius:6px;background:linear-gradient(90deg,var(--a2-2, var(--red)),transparent,var(--a2-2, var(--red)));opacity:.9}
html[data-skin="g81"] #skinStage.tilt .mo-rotor{transform:rotate(14deg) translateY(4px)}""",
    cfg=dict(), ),
dict(id='g82', name='八音·琴', tag='玫瑰铜绒紫', eng='motion', mech='music', bind='count', max=12, h=192,
    anchors=dict(bg='#2B2229', card='#382C35', ink='#EFE2DC', a1='#C98CA4', a2='#E8C983'),
    dark=dict(always=True, dbg='#1B141A', dcard='#261E26', dink='#EBDFD8'),
    stage='radial-gradient(54% 44% at 50% 2%, rgba(201,140,164,.16), transparent 74%), repeating-linear-gradient(0deg, rgba(232,201,131,.04) 0 1px, transparent 1px 14px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g82"] #skinStage .mu-cyl{position:absolute;left:50%;bottom:26px;width:150px;height:84px;margin-left:-75px;border-radius:12px;background:repeating-linear-gradient(90deg,#4E3E48 0 10px,#40323C 10px 20px);box-shadow:inset 0 6px 12px rgba(255,220,230,.12), inset 0 -8px 14px rgba(0,0,0,.4), 0 8px 16px rgba(0,0,0,.3);overflow:hidden}
html[data-skin="g82"] #skinStage .mu-note{position:absolute;width:12px;height:16px;color:#E8C983;font-size:13px;font-weight:700;animation:sk82-rise 2.2s ease infinite}
html[data-skin="g82"] #skinStage .mu-note:nth-child(2n){left:34%}
html[data-skin="g82"] #skinStage .mu-note:nth-child(2n+1){left:56%}
@keyframes sk82-rise{0%{transform:translateY(8px);opacity:0}25%{opacity:1}to{transform:translateY(-40px);opacity:0}}
html[data-skin="g82"] #skinStage .mu-comb{position:absolute;left:50%;bottom:116px;width:120px;height:12px;margin-left:-60px;border-radius:4px;background:repeating-linear-gradient(90deg,var(--a2-2, var(--amber)) 0 5px,var(--amber-soft) 5px 10px)}""",
    cfg=dict(), ),
dict(id='g83', name='计程·滚轮', tag='黄铜里程米', eng='motion', mech='odo', bind='count', max=6, h=184,
    anchors=dict(bg='#E5DCC6', card='#F0E7D2', ink='#3C321E', a1='#B08A3E', a2='#5E7C6A'),
    dark=dict(dbg='#141109', dcard='#1E1A10', dink='#E0D6B6'),
    stage='repeating-linear-gradient(0deg, rgba(176,138,62,.05) 0 1px, transparent 1px 12px), radial-gradient(48% 42% at 14% 0%, rgba(94,124,106,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g83"] #skinStage .od-win{display:flex;gap:6px;padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,#3C342A,#2C261E);box-shadow:inset 0 0 0 2px rgba(224,214,182,.25), inset 0 8px 16px rgba(0,0,0,.45)}
html[data-skin="g83"] #skinStage .od-digit{width:40px;height:56px;border-radius:6px;background:linear-gradient(180deg,#F2E8CE,#DCCEA8);box-shadow:inset 0 2px 0 rgba(255,255,255,.5), inset 0 -3px 0 rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;font:700 30px/1 ui-monospace,Consolas,monospace;color:#3C3020;overflow:hidden}
html[data-skin="g83"] #skinStage .od-digit.roll{animation:sk83-roll .4s cubic-bezier(.3,1.2,.4,1)}
@keyframes sk83-roll{0%{transform:translateY(-58%);opacity:.3}to{transform:none;opacity:1}}""",
    cfg=dict(), ),
dict(id='g84', name='轴流·风扇', tag='机电扇叶青', eng='motion', mech='fan', bind='progress', max=4, h=190,
    anchors=dict(bg='#E1E4E2', card='#EBEEEC', ink='#26302C', a1='#3E8C7C', a2='#8C949C'),
    dark=dict(dbg='#0F1211', dcard='#171F1D', dink='#CFDAD6'),
    stage='repeating-linear-gradient(0deg, rgba(140,148,156,.05) 0 1px, transparent 1px 14px), radial-gradient(50% 42% at 84% 0%, rgba(62,140,124,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g84"] #skinStage .mo-rotor{width:110px;height:110px;border-radius:50%;position:relative}
html[data-skin="g84"] #skinStage .mo-rotor i{position:absolute;left:50%;top:50%;width:44px;height:20px;margin:-10px 0 0 -10px;border-radius:4px 14px 14px 4px;background:linear-gradient(90deg,var(--a1-2, var(--green)),var(--green-line));transform-origin:10px 10px}
html[data-skin="g84"] #skinStage .mo-rotor i:nth-child(1){transform:rotate(0deg)}
html[data-skin="g84"] #skinStage .mo-rotor i:nth-child(2){transform:rotate(120deg)}
html[data-skin="g84"] #skinStage .mo-rotor i:nth-child(3){transform:rotate(240deg)}
html[data-skin="g84"] #skinStage .mo-hub{width:18px;height:18px;border-radius:50%;background:radial-gradient(60% 60% at 40% 34%,var(--surface),var(--line-2));box-shadow:0 0 0 2px var(--a2-2, var(--green))}
html[data-skin="g84"] #skinStage .fn-guard{position:absolute;left:50%;top:50%;width:116px;height:116px;margin:-58px 0 0 -58px;border-radius:50%;background:repeating-radial-gradient(circle at 50% 50%,transparent 0 7px,rgba(140,148,156,.35) 7px 8.5px)}""",
    cfg=dict(), ),
dict(id='g85', name='日晷·晷针', tag='汉白玉青铜', eng='motion', mech='sundial', bind='dayphase', max=5, h=196,
    anchors=dict(bg='#E6E4DC', card='#F0EEE6', ink='#2E2C26', a1='#7C8C6E', a2='#9C8C5E'),
    dark=dict(dbg='#121110', dcard='#1B1A16', dink='#D8D5C6'),
    stage='radial-gradient(56% 46% at 50% 8%, rgba(156,140,94,.14), transparent 74%), repeating-conic-gradient(from 0deg at 50% 60%, rgba(124,140,110,.05) 0 6deg, transparent 6deg 30deg), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g85"] #skinStage .sd-dial{position:absolute;left:50%;bottom:20px;width:170px;height:96px;margin-left:-85px;border-radius:50% 50% 12px 12px/70% 70% 12px 12px;background:linear-gradient(160deg,var(--surface),var(--field));box-shadow:inset 0 0 0 3px var(--a2-2, var(--amber)), 0 8px 16px rgba(46,44,38,.16);overflow:hidden}
html[data-skin="g85"] #skinStage .sd-marks{position:absolute;inset:8px;background:repeating-conic-gradient(from -80deg at 50% 100%,var(--ink-3) 0 1.5deg,transparent 1.5deg 20deg);opacity:.5}
html[data-skin="g85"] #skinStage .sd-shadow{position:absolute;left:50%;bottom:0;width:5px;height:62%;margin-left:-2.5px;border-radius:3px;background:linear-gradient(180deg,rgba(46,44,38,.72),rgba(46,44,38,.15));transform-origin:50% 100%;transition:transform .8s ease}
html[data-skin="g85"] #skinStage .sd-gnomon{position:absolute;left:50%;bottom:0;width:4px;height:70%;margin-left:-2px;border-radius:2px;background:linear-gradient(180deg,var(--a1-2, var(--amber)),var(--amber-soft));clip-path:polygon(0 12%,100% 0,100% 100%,0 100%)}
html[data-skin="g85"] #skinStage .sd-meal{position:absolute;bottom:8px;font-size:10px;color:var(--ink-2)}""",
    cfg=dict(), ),
# ################ v6.0 · E-F 轨道·连络（orbit） g86–g95 ################
dict(id='g86', name='星轨·行星', tag='深空行星金', eng='orbit', mech='planets', bind='streak', max=8, h=184,
    anchors=dict(bg='#1A2238', card='#252F4C', ink='#E8EAF2', a1='#D4A94E', a2='#7C9CD6'),
    dark=dict(always=True, dbg='#12182B', dcard='#1C2540', dink='#E2E6F0'),
    stage='radial-gradient(circle at 22% 26%, rgba(232,236,246,.30) 0 1px, transparent 2px), radial-gradient(circle at 68% 14%, rgba(232,236,246,.24) 0 1px, transparent 2px), radial-gradient(circle at 84% 52%, rgba(212,169,78,.12), transparent 66%), radial-gradient(56% 46% at 50% 108%, rgba(124,156,214,.14), transparent 74%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g86"] #skinStage .gu{width:20px;height:20px;border-radius:50%;background:radial-gradient(58% 58% at 36% 32%,var(--a1-2, var(--amber)) 0 28%,var(--a2-2, var(--green)) 62%,var(--surface-2));box-shadow:0 0 12px rgba(212,169,78,.35)}
html[data-skin="g86"] #skinStage .gu:nth-child(3n){background:radial-gradient(58% 58% at 36% 32%,#B8C8E0 0 30%,var(--a2-2, var(--green)) 66%,var(--surface-2));box-shadow:0 0 10px rgba(124,156,214,.35)}
html[data-skin="g86"] #skinStage .gu.off{background:radial-gradient(58% 58% at 36% 32%,var(--surface-2),var(--line-2));box-shadow:none;opacity:.5}
html[data-skin="g86"] #skinStage .sk-decor.d-g86::before{content:"";position:absolute;left:50%;top:52%;width:82%;height:34%;margin:-17% 0 0 -41%;border:1.5px dashed rgba(124,156,214,.30);border-radius:50%}
html[data-skin="g86"] #skinStage .sk-decor.d-g86::after{content:"";position:absolute;left:50%;top:52%;width:56%;height:22%;margin:-11% 0 0 -28%;border:1px dashed rgba(212,169,78,.26);border-radius:50%}""",
    cfg=dict(tip='第{n}天'), badge='曜', ),
dict(id='g87', name='地铁·环线', tag='石灰警示黄', eng='orbit', mech='subway', bind='miss14', max=14, h=178,
    anchors=dict(bg='#E7EAE2', card='#F1F4EC', ink='#2A3430', a1='#B48A2E', a2='#46628C'),
    dark=dict(dbg='#121714', dcard='#1C231C', dink='#DDE2D6'),
    stage='linear-gradient(0deg, transparent 62%, rgba(70,98,140,.06) 62% 63%), radial-gradient(50% 40% at 84% 0%, rgba(180,138,46,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g87"] #skinStage .gu{width:16px;height:16px;border-radius:4px;background:var(--a1-2, var(--amber));box-shadow:0 0 0 3px var(--surface),0 0 0 4.5px var(--a2-2, var(--green))}
html[data-skin="g87"] #skinStage .gu.off{background:var(--line-2);box-shadow:0 0 0 3px var(--surface),0 0 0 4.5px var(--line);opacity:.85}
html[data-skin="g87"] #skinStage .sk-decor.d-g87::before{content:"";position:absolute;left:6%;right:6%;top:47%;height:3px;border-radius:2px;background:var(--a2-2, var(--green));opacity:.55}
html[data-skin="g87"] #skinStage .sk-decor.d-g87::after{content:"M";position:absolute;right:8%;top:10px;font:700 15px/1 ui-monospace,Consolas,monospace;color:var(--a2-2, var(--green));opacity:.75}""",
    cfg=dict(tip='{d}'), badge='环', ),
dict(id='g88', name='星宿·连线', tag='墨蓝星银', eng='orbit', mech='stars', bind='count', max=9, h=180,
    anchors=dict(bg='#232B3B', card='#2F3950', ink='#E6E9F0', a1='#C2CEDF', a2='#6E88B0'),
    dark=dict(always=True, dbg='#1A2130', dcard='#253048', dink='#E0E5EF'),
    stage='radial-gradient(circle at 14% 20%, rgba(230,236,246,.26) 0 1px, transparent 2px), radial-gradient(circle at 78% 30%, rgba(230,236,246,.20) 0 1px, transparent 2px), radial-gradient(52% 42% at 12% 0%, rgba(110,136,176,.16), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g88"] #skinStage .gu{width:14px;height:14px;border-radius:50%;background:radial-gradient(60% 60% at 44% 40%,#FFFFFF,var(--a1-2, var(--green)) 70%);box-shadow:0 0 10px rgba(194,206,223,.55);clip-path:none}
html[data-skin="g88"] #skinStage .gu.off{background:var(--line-2);box-shadow:none;opacity:.35}
html[data-skin="g88"] #skinStage .sk-decor.d-g88::before{content:"";position:absolute;left:18%;top:30%;width:56%;height:1.5px;background:linear-gradient(90deg,rgba(194,206,223,.5),rgba(110,136,176,.5));transform:rotate(-14deg)}
html[data-skin="g88"] #skinStage .sk-decor.d-g88::after{content:"";position:absolute;left:34%;top:52%;width:44%;height:1.5px;background:linear-gradient(90deg,rgba(110,136,176,.5),rgba(194,206,223,.4));transform:rotate(9deg)}""",
    cfg=dict(tip='{n} 笔'), badge='宿', ),
dict(id='g89', name='齿轮·传动列', tag='机油黄铜', eng='orbit', mech='gears', bind='progress', max=4, h=186,
    anchors=dict(bg='#E3E1DC', card='#EEECE7', ink='#2E2C28', a1='#A98A4C', a2='#6E747C'),
    dark=dict(dbg='#131210', dcard='#1D1C18', dink='#DCD8CE'),
    stage='repeating-linear-gradient(0deg, rgba(110,116,124,.05) 0 1px, transparent 1px 15px), radial-gradient(50% 42% at 86% 2%, rgba(169,138,76,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g89"] #skinStage .gu{width:56px;height:56px;border-radius:50%;background:repeating-conic-gradient(var(--a1-2, var(--amber)) 0 14deg,var(--surface-2) 14deg 30deg);box-shadow:inset 0 0 0 2px rgba(110,116,124,.35), 0 3px 9px rgba(46,44,40,.14)}
html[data-skin="g89"] #skinStage .gu::after{content:"";position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--field);box-shadow:inset 0 0 0 2px var(--a2-2, var(--green))}
html[data-skin="g89"] #skinStage .gu:nth-child(2n){width:44px;height:44px}
html[data-skin="g89"] #skinStage .gu.off{opacity:.35;box-shadow:inset 0 0 0 2px var(--line-2)}
html[data-skin="g89"] #skinStage .gu.off::after{box-shadow:inset 0 0 0 2px var(--line)}
html[data-skin="g89"] #skinStage .gu{transform:rotate(var(--or-ang,0deg))}
html[data-skin="g89"] #skinStage .gu:nth-child(2n){transform:rotate(calc(var(--or-ang,0deg) * -1))}""",
    cfg=dict(tip='{v}%'), badge='齿', ),
dict(id='g90', name='摩天轮·座舱', tag='暮紫灯串黄', eng='orbit', mech='ferris', bind='meals', max=5, h=192,
    anchors=dict(bg='#2A2440', card='#362F55', ink='#F0E9DC', a1='#F0C470', a2='#9C8CD6'),
    dark=dict(always=True, dbg='#201B34', dcard='#2C2647', dink='#EAE2D2'),
    stage='radial-gradient(52% 44% at 50% 4%, rgba(240,196,112,.14), transparent 72%), radial-gradient(circle at 20% 60%, rgba(240,196,112,.18) 0 2px, transparent 3px), radial-gradient(circle at 80% 44%, rgba(240,196,112,.14) 0 2px, transparent 3px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g90"] #skinStage .gu{width:30px;height:26px;border-radius:6px 6px 9px 9px;background:linear-gradient(160deg,#FFEBB8,var(--a1-2, var(--amber)) 70%);box-shadow:0 0 14px rgba(240,196,112,.45), inset 0 0 0 1px rgba(255,255,255,.25)}
html[data-skin="g90"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-13px;width:1.5px;height:13px;background:rgba(240,233,220,.4)}
html[data-skin="g90"] #skinStage .gu.off{background:linear-gradient(160deg,var(--surface-2),var(--line-2));box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
html[data-skin="g90"] #skinStage .gu.off::before{opacity:.25}
html[data-skin="g90"] #skinStage .sk-decor.d-g90::before{content:"";position:absolute;left:50%;top:44%;width:64%;height:56%;margin:-28% 0 0 -32%;border:2px solid rgba(156,140,214,.35);border-radius:50%}""",
    cfg=dict(tip='{d}'), badge='摩', ),
dict(id='g91', name='缆车·索道', tag='雪山缆车红', eng='orbit', mech='cable', bind='streak', max=8, h=186,
    anchors=dict(bg='#EAF0F4', card='#F6FAFC', ink='#2C3640', a1='#C4504A', a2='#5E7C94'),
    dark=dict(dbg='#11161B', dcard='#1A222B', dink='#D5DFE6'),
    stage='radial-gradient(56% 40% at 50% 108%, rgba(94,124,148,.14), transparent 74%), repeating-linear-gradient(115deg, transparent 0 26px, rgba(94,124,148,.05) 26px 28px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g91"] #skinStage .gu{width:26px;height:20px;border-radius:4px 4px 7px 7px;background:linear-gradient(160deg,var(--a1-2, var(--red)) 0 26%,var(--surface) 26%);box-shadow:0 3px 8px rgba(44,54,64,.16)}
html[data-skin="g91"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-11px;width:1.5px;height:11px;background:var(--ink-3)}
html[data-skin="g91"] #skinStage .gu.off{background:var(--field);box-shadow:inset 0 0 0 1.5px var(--line-2)}
html[data-skin="g91"] #skinStage .sk-decor.d-g91::before{content:"";position:absolute;left:6%;top:18%;width:88%;height:1.5px;background:var(--ink-3);opacity:.6;transform:rotate(-16deg);transform-origin:6% 50%}
html[data-skin="g91"] #skinStage .sk-decor.d-g91::after{content:"";position:absolute;left:8%;bottom:16%;width:34%;height:22%;background:linear-gradient(165deg,transparent 30%,rgba(94,124,148,.22) 30% 46%,transparent 46%);clip-path:polygon(0 100%,38% 0,64% 100%)}""",
    cfg=dict(tip='第{n}天'), badge='缆', ),
dict(id='g92', name='星链·过境', tag='午夜日光银', eng='orbit', mech='satellites', bind='miss14', max=14, h=178,
    anchors=dict(bg='#10192B', card='#1A2540', ink='#E2E9F4', a1='#C0CCDD', a2='#5E7EA8'),
    dark=dict(always=True, dbg='#0D1524', dcard='#162136', dink='#DAE2EE'),
    stage='radial-gradient(64% 34% at 50% 118%, rgba(94,126,168,.22), transparent 76%), radial-gradient(circle at 30% 18%, rgba(226,233,244,.24) 0 1px, transparent 2px), radial-gradient(circle at 66% 10%, rgba(226,233,244,.18) 0 1px, transparent 2px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 94%)',
    comp="""html[data-skin="g92"] #skinStage .gu{width:18px;height:12px;border-radius:3px;background:linear-gradient(90deg,#D8E2F0 0 34%,var(--a2-2, var(--green)) 34% 66%,#D8E2F0 66%);box-shadow:0 0 10px rgba(192,204,221,.4)}
html[data-skin="g92"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-7px;width:1px;height:7px;background:rgba(226,233,244,.45)}
html[data-skin="g92"] #skinStage .gu.off{background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line-2);opacity:.55}
html[data-skin="g92"] #skinStage .sk-decor.d-g92::before{content:"";position:absolute;left:4%;top:34%;width:92%;height:40%;border-top:1.5px solid rgba(192,204,221,.30);border-radius:50% 50% 0 0/100% 100% 0 0}""",
    cfg=dict(tip='{d}'), badge='链', ),
dict(id='g93', name='双螺旋·阶梯', tag='墨青碱基彩', eng='orbit', mech='helix', bind='macro', max=6, h=186,
    anchors=dict(bg='#E2EAEC', card='#EEF4F6', ink='#223036', a1='#3E7E8C', a2='#C46A8A'),
    dark=dict(dbg='#101A1C', dcard='#192528', dink='#D3E0E2'),
    stage='repeating-linear-gradient(90deg, rgba(62,126,140,.04) 0 1px, transparent 1px 22px), radial-gradient(48% 40% at 88% 4%, rgba(196,106,138,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g93"] #skinStage .gu{width:34px;height:14px;border-radius:7px;background:linear-gradient(90deg,var(--a1-2, var(--green)),var(--a2-2, var(--amber)))}
html[data-skin="g93"] #skinStage .gu:nth-child(3n){background:linear-gradient(90deg,var(--a2-2, var(--amber)),var(--green-line))}
html[data-skin="g93"] #skinStage .gu.off{background:var(--field);box-shadow:inset 0 0 0 1.5px var(--line-2)}
html[data-skin="g93"] #skinStage .sk-decor.d-g93::before{content:"";position:absolute;left:16%;top:8%;width:2px;height:84%;background:var(--line-2);border-radius:2px}
html[data-skin="g93"] #skinStage .sk-decor.d-g93::after{content:"";position:absolute;right:16%;top:8%;width:2px;height:84%;background:var(--line-2);border-radius:2px}""",
    cfg=dict(tip='{d}'), badge='螺', ),
dict(id='g94', name='迷宫·寻径', tag='米墙墨线', eng='orbit', mech='maze', bind='count', max=9, h=180,
    anchors=dict(bg='#EDE8DC', card='#F5F1E6', ink='#32302A', a1='#4A4438', a2='#8C7E64'),
    dark=dict(dbg='#141210', dcard='#1E1C17', dink='#DCD6C6'),
    stage='repeating-linear-gradient(0deg, rgba(140,126,100,.05) 0 2px, transparent 2px 24px), repeating-linear-gradient(90deg, rgba(140,126,100,.05) 0 2px, transparent 2px 24px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g94"] #skinStage .gu{width:18px;height:18px;border-radius:3px;background:var(--a1-2, var(--green));box-shadow:0 0 0 2px var(--paper),0 0 0 3px rgba(74,68,56,.25)}
html[data-skin="g94"] #skinStage .gu.off{background:var(--field);box-shadow:inset 0 0 0 1.5px var(--line-2), 0 0 0 2px var(--paper);opacity:.9}
html[data-skin="g94"] #skinStage .gu:first-child{border-radius:50%}
html[data-skin="g94"] #skinStage .gu:last-child{border-radius:50% 3px 3px 3px}
html[data-skin="g94"] #skinStage .sk-decor.d-g94::after{content:"入";position:absolute;left:8%;bottom:8px;font-size:11px;color:var(--ink-3)}""",
    cfg=dict(tip='{n} 笔'), badge='迷', ),
dict(id='g95', name='电车·环线牌', tag='复古绿车厢黄', eng='orbit', mech='tram', bind='count', max=10, h=178,
    anchors=dict(bg='#E4E8DD', card='#EFF2E8', ink='#2A3226', a1='#5C7C50', a2='#B08A3C'),
    dark=dict(dbg='#12160F', dcard='#1B2018', dink='#D9DFD0'),
    stage='linear-gradient(0deg, transparent 58%, rgba(92,124,80,.07) 58% 60%), radial-gradient(46% 38% at 12% 2%, rgba(176,138,62,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g95"] #skinStage .gu{width:14px;height:14px;border-radius:50%;background:var(--a2-2, var(--amber));box-shadow:inset 0 0 0 2px var(--surface),0 0 0 1.5px var(--line-2)}
html[data-skin="g95"] #skinStage .gu.off{background:var(--field);opacity:.8}
html[data-skin="g95"] #skinStage .sk-decor.d-g95::before{content:"";position:absolute;left:5%;right:5%;top:46%;height:2.5px;border-radius:2px;background:var(--a1-2, var(--green));opacity:.6}
html[data-skin="g95"] #skinStage .sk-decor.d-g95::after{content:"◆";position:absolute;left:50%;top:12px;margin-left:-7px;font-size:12px;color:var(--a1-2, var(--green));opacity:.8}""",
    cfg=dict(tip='{n} 笔'), badge='铃', ),
# ################ v6.0 · E-G 光影·剧场（light） g96–g105 ################
dict(id='g96', name='月相·历', tag='午夜月银', eng='light', mech='moon', bind='miss14', max=14, h=180,
    anchors=dict(bg='#1A2233', card='#252E44', ink='#E4E8F2', a1='#C9D2E4', a2='#8C9CB8'),
    dark=dict(always=True, dbg='#151C2B', dcard='#1F2940', dink='#DFE4EF'),
    stage='radial-gradient(40% 30% at 78% 10%, rgba(201,210,228,.10), transparent 70%), radial-gradient(circle at 16% 30%, rgba(228,232,242,.22) 0 1px, transparent 2px), radial-gradient(circle at 52% 16%, rgba(228,232,242,.16) 0 1px, transparent 2px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g96"] #skinStage .gu{width:16px;height:16px;border-radius:50%;background:radial-gradient(60% 60% at 44% 40%,#F4F6FB,var(--a1-2, var(--green)) 74%);box-shadow:0 0 9px rgba(201,210,228,.4)}
html[data-skin="g96"] #skinStage .gu.off{background:radial-gradient(58% 58% at 42% 40%,var(--surface-2) 0 42%,var(--line-2) 72%);box-shadow:none;opacity:.45}
html[data-skin="g96"] #skinStage .gu:last-child{width:22px;height:22px;box-shadow:0 0 16px rgba(201,210,228,.55)}
html[data-skin="g96"] #skinStage .sk-decor.d-g96::before{content:"";position:absolute;left:4%;top:26%;width:1px;height:52%;background:linear-gradient(180deg,transparent,rgba(140,156,184,.4),transparent)}
html[data-skin="g96"] #skinStage .sk-decor.d-g96::after{content:"今";position:absolute;right:6%;top:8px;font-size:11px;color:var(--a1-2, var(--green));opacity:.8}""",
    cfg=dict(tip='{d}'), badge='望', ),
dict(id='g97', name='灯塔·光束', tag='海雾塔顶红', eng='light', mech='lighthouse', bind='leftRatio', max=5, h=196,
    anchors=dict(bg='#DFEAE9', card='#EAF3F2', ink='#243634', a1='#C45C50', a2='#4E8C8C'),
    dark=dict(dbg='#101B1A', dcard='#182624', dink='#CFDEDB'),
    stage='radial-gradient(56% 34% at 50% 118%, rgba(78,140,140,.16), transparent 76%), repeating-linear-gradient(4deg, rgba(78,140,140,.04) 0 2px, transparent 2px 22px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g97"] #skinStage .sk-decor.d-g97::before{content:"";position:absolute;left:50%;bottom:14px;width:64px;height:96px;margin-left:-32px;background:linear-gradient(90deg,var(--surface) 0 46%,var(--field) 46% 58%,var(--surface) 58%);clip-path:polygon(26% 0,74% 0,92% 100%,8% 100%);box-shadow:0 6px 14px rgba(36,54,52,.16)}
html[data-skin="g97"] #skinStage .sk-decor.d-g97::after{content:"";position:absolute;left:50%;bottom:106px;width:26px;height:14px;margin-left:-13px;background:linear-gradient(160deg,var(--a1-2, var(--red)),var(--red-soft));clip-path:polygon(12% 100%,12% 30%,50% 0,88% 30%,88% 100%)}
html[data-skin="g97"] #skinStage .lt-beam{left:50%;bottom:110px;width:150px;height:14px;margin-left:0;background:linear-gradient(90deg,rgba(240,214,150,.5),transparent 78%);transform:rotate(var(--beam,-26deg));clip-path:polygon(0 34%,100% 0,100% 100%,0 66%)}
html[data-skin="g97"] #skinStage .alarm .lt-beam{background:linear-gradient(90deg,rgba(196,92,80,.55),transparent 80%)}
html[data-skin="g97"] #skinStage .lt-lamp{position:absolute;left:50%;bottom:108px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:radial-gradient(60% 60% at 40% 36%,#FFF3C4,var(--a1-2, var(--amber)))}""",
    cfg=dict(tip='结余'), badge='塔', ),
dict(id='g98', name='放映·胶片', tag='绒幕胶片黑', eng='light', mech='film', bind='items', max=6, h=182,
    anchors=dict(bg='#241A1C', card='#302428', ink='#EFE4DC', a1='#C4504A', a2='#8C7864'),
    dark=dict(always=True, dbg='#1B1315', dcard='#271E21', dink='#E9DED6'),
    stage='radial-gradient(44% 34% at 50% 0%, rgba(196,80,74,.16), transparent 70%), repeating-linear-gradient(90deg, rgba(140,120,100,.05) 0 1px, transparent 1px 26px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g98"] #skinStage .gu{width:52px;height:44px;border-radius:3px;background:linear-gradient(165deg,var(--surface-2),var(--line-2));box-shadow:inset 0 0 0 2px rgba(239,228,220,.14), 0 3px 9px rgba(0,0,0,.3)}
html[data-skin="g98"] #skinStage .gu::before{content:"";position:absolute;left:3px;top:3px;bottom:3px;width:5px;background:repeating-linear-gradient(0deg,rgba(239,228,220,.4) 0 2.5px,transparent 2.5px 7px)}
html[data-skin="g98"] #skinStage .gu::after{content:"";position:absolute;right:3px;top:3px;bottom:3px;width:5px;background:repeating-linear-gradient(0deg,rgba(239,228,220,.4) 0 2.5px,transparent 2.5px 7px)}
html[data-skin="g98"] #skinStage .gu.off{opacity:.4;box-shadow:inset 0 0 0 2px var(--line-2)}
html[data-skin="g98"] #skinStage .sk-decor.d-g98::before{content:"";position:absolute;left:50%;top:0;width:56%;height:12px;margin-left:-28%;background:radial-gradient(60% 100% at 50% 0%,rgba(240,214,150,.35),transparent 76%)}""",
    cfg=dict(tip='{d}'), badge='映', ),
dict(id='g99', name='窗花·剪纸', tag='朱红窗纸米', eng='light', mech='papercut', bind='streak', max=7, h=178,
    anchors=dict(bg='#F2E8D8', card='#F8F0E2', ink='#3A2E22', a1='#B4472F', a2='#C47838'),
    dark=dict(dbg='#1A1310', dcard='#261D18', dink='#EBDFD0'),
    stage='radial-gradient(50% 42% at 50% 0%, rgba(255,238,200,.30), transparent 72%), repeating-linear-gradient(90deg, rgba(180,71,47,.04) 0 1px, transparent 1px 30px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g99"] #skinStage .gu{width:38px;height:38px;background:var(--a1-2, var(--red));clip-path:polygon(50% 0,62% 22%,86% 14%,80% 40%,100% 52%,80% 62%,86% 88%,62% 80%,50% 100%,38% 80%,14% 88%,20% 62%,0 52%,20% 40%,14% 14%,38% 22%);box-shadow:0 2px 7px rgba(180,71,47,.24);border-radius:0}
html[data-skin="g99"] #skinStage .gu.off{background:var(--line-2);opacity:.5}
html[data-skin="g99"] #skinStage .sk-decor.d-g99::before{content:"";position:absolute;left:8%;right:8%;top:12%;bottom:30%;border:2px solid rgba(180,71,47,.30);border-radius:4px}
html[data-skin="g99"] #skinStage .sk-decor.d-g99::after{content:"福";position:absolute;left:50%;top:22%;margin-left:-9px;font:600 18px/1 var(--serif,serif);color:var(--a1-2, var(--red));opacity:.55}""",
    cfg=dict(tip='第{n}天'), badge='剪', ),
dict(id='g100', name='剪影·天际线', tag='暮色窗光橙', eng='light', mech='skyline', bind='progress', max=12, h=190,
    anchors=dict(bg='#232C3E', card='#2D3850', ink='#EAE6DC', a1='#E09050', a2='#7C8CAC'),
    dark=dict(always=True, dbg='#1C2434', dcard='#273145', dink='#E4E0D5'),
    stage='radial-gradient(56% 40% at 82% 8%, rgba(224,144,80,.16), transparent 70%), linear-gradient(180deg, transparent 46%, rgba(124,140,172,.14) 46% 100%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g100"] #skinStage .gu{width:12px;height:12px;border-radius:2px;background:var(--a1-2, var(--amber));box-shadow:0 0 8px rgba(224,144,80,.5)}
html[data-skin="g100"] #skinStage .gu.off{background:var(--line-2);box-shadow:none;opacity:.4}
html[data-skin="g100"] #skinStage .sk-decor.d-g100::before{content:"";position:absolute;left:6%;right:6%;bottom:26px;height:58%;background:linear-gradient(180deg,var(--surface-2),var(--line-2));clip-path:polygon(0 100%,0 58%,9% 58%,9% 34%,20% 34%,20% 66%,30% 66%,30% 22%,42% 22%,42% 52%,55% 52%,55% 12%,66% 12%,66% 44%,78% 44%,78% 30%,89% 30%,89% 60%,100% 60%,100% 100%);opacity:.92}
html[data-skin="g100"] #skinStage .sk-decor.d-g100::after{content:"";position:absolute;left:6%;right:6%;bottom:24px;height:3px;background:var(--line)}""",
    cfg=dict(tip='{v}%'), badge='廓', ),
dict(id='g101', name='聚光·舞台', tag='绒幕金光', eng='light', mech='spotlight', bind='dayphase', max=3, h=192,
    anchors=dict(bg='#331E20', card='#40282C', ink='#F0E2D4', a1='#D6A85C', a2='#A85450'),
    dark=dict(always=True, dbg='#281819', dcard='#352124', dink='#EBDDCF'),
    stage='radial-gradient(50% 40% at 50% 0%, rgba(214,168,92,.16), transparent 72%), repeating-linear-gradient(90deg, rgba(168,84,80,.05) 0 2px, transparent 2px 30px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g101"] #skinStage .gu{min-width:44px;height:30px;padding:0 10px;border-radius:6px;background:linear-gradient(160deg,var(--surface-2),var(--line-2));color:var(--ink-2);font-size:11px;display:flex;align-items:center;justify-content:center;border-radius:6px}
html[data-skin="g101"] #skinStage .gu.on{background:linear-gradient(160deg,#F4DEB0,var(--a1-2, var(--amber)));color:#3A2C18;box-shadow:0 0 14px rgba(214,168,92,.5)}
html[data-skin="g101"] #skinStage .sk-decor.d-g101::before{content:"";position:absolute;left:50%;top:0;width:64%;height:64%;margin-left:-32%;background:linear-gradient(180deg,rgba(244,222,176,.22),transparent 84%);clip-path:polygon(34% 0,66% 0,100% 100%,0 100%);transform:rotate(var(--spot,0deg));transform-origin:50% 0}
html[data-skin="g101"] #skinStage .sk-decor.d-g101::after{content:"";position:absolute;left:6%;right:6%;bottom:30px;height:4px;background:var(--line-2);border-radius:2px;opacity:.8}""",
    cfg=dict(tip='{d}'), badge='聚', ),
dict(id='g102', name='星空·投影', tag='星云夜黑', eng='light', mech='projection', bind='count', max=9, h=186,
    anchors=dict(bg='#1E1828', card='#2A2236', ink='#EAE4F0', a1='#B08CD6', a2='#6E688C'),
    dark=dict(always=True, dbg='#171221', dcard='#231C30', dink='#E5DFF0'),
    stage='radial-gradient(60% 46% at 50% 104%, rgba(176,140,214,.20), transparent 76%), radial-gradient(circle at 24% 30%, rgba(234,228,240,.22) 0 1px, transparent 2px), radial-gradient(circle at 74% 22%, rgba(234,228,240,.16) 0 1px, transparent 2px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g102"] #skinStage .gu{width:12px;height:12px;border-radius:50%;background:radial-gradient(58% 58% at 42% 40%,#FFF,var(--a1-2, var(--green)) 72%);box-shadow:0 0 10px rgba(176,140,214,.6)}
html[data-skin="g102"] #skinStage .gu.off{background:var(--line-2);box-shadow:none;opacity:.35}
html[data-skin="g102"] #skinStage .sk-decor.d-g102::before{content:"";position:absolute;left:50%;bottom:14px;width:74%;height:64%;margin-left:-37%;border-top:2px solid rgba(176,140,214,.35);border-left:1.5px solid rgba(176,140,214,.22);border-right:1.5px solid rgba(176,140,214,.22);border-radius:50% 50% 0 0/92% 92% 0 0}
html[data-skin="g102"] #skinStage .sk-decor.d-g102::after{content:"";position:absolute;left:50%;bottom:10px;width:26px;height:8px;margin-left:-13px;border-radius:3px;background:var(--a2-2, var(--green));opacity:.7}""",
    cfg=dict(tip='{n} 笔'), badge='穹', ),
dict(id='g103', name='烛台·夜读', tag='暖蜡深木', eng='light', mech='candles', bind='streak', max=7, h=188,
    anchors=dict(bg='#2A2018', card='#362B20', ink='#F2E6D2', a1='#E8A850', a2='#9C7C54'),
    dark=dict(always=True, dbg='#221A12', dcard='#2E241A', dink='#ECDFCB'),
    stage='radial-gradient(48% 38% at 50% 6%, rgba(232,168,80,.16), transparent 70%), repeating-linear-gradient(0deg, rgba(156,124,84,.05) 0 1px, transparent 1px 18px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g103"] #skinStage .gu{width:18px;height:44px;border-radius:4px 4px 3px 3px;background:linear-gradient(90deg,#F6E9CE 0 32%,#E2D2B0 32% 62%,#F6E9CE 62%);transform-origin:50% 100%}
html[data-skin="g103"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-12px;width:8px;height:14px;margin-left:-4px;border-radius:50% 50% 46% 46%/72% 72% 30% 30%;background:radial-gradient(60% 62% at 50% 66%,#FFF0C0,var(--a1-2, var(--amber)) 66%,transparent 76%);filter:blur(.4px);animation:skv7-flicker 2.6s ease-in-out infinite}
html[data-skin="g103"] #skinStage .gu::after{content:"";position:absolute;left:50%;top:-3px;width:1.5px;height:5px;margin-left:-1px;background:var(--ink-2)}
html[data-skin="g103"] #skinStage .gu.off{background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line-2)}
html[data-skin="g103"] #skinStage .gu.off::before{content:none}
html[data-skin="g103"] #skinStage .sk-decor.d-g103::after{content:"";position:absolute;left:8%;right:8%;bottom:22px;height:6px;border-radius:3px;background:linear-gradient(180deg,var(--a2-2, var(--green)),var(--line-2))}""",
    cfg=dict(tip='第{n}天'), badge='烛', ),
dict(id='g104', name='日食·环', tag='曜石日冕金', eng='light', mech='eclipse', bind='leftRatio', max=5, h=196,
    anchors=dict(bg='#201E1A', card='#2C2A24', ink='#EFE8D6', a1='#E0B45C', a2='#8C8474'),
    dark=dict(always=True, dbg='#191713', dcard='#252220', dink='#EBE4D2'),
    stage='radial-gradient(52% 44% at 50% 42%, rgba(224,180,92,.14), transparent 72%), radial-gradient(70% 50% at 50% 110%, rgba(140,132,116,.10), transparent 76%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 94%)',
    comp="""html[data-skin="g104"] #skinStage .sk-decor.d-g104::before{content:"";position:absolute;left:50%;top:38%;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;background:radial-gradient(58% 58% at 44% 42%,#F6E3B4,var(--a1-2, var(--amber)) 62%,var(--amber-soft));box-shadow:0 0 26px rgba(224,180,92,.4)}
html[data-skin="g104"] #skinStage .sk-decor.d-g104::after{content:"";position:absolute;left:calc(50% + var(--ec,-44px));top:calc(38% + var(--ec,-44px));width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;background:var(--paper);box-shadow:inset -4px -4px 12px rgba(0,0,0,.14)}
html[data-skin="g104"] #skinStage .lt-lamp{position:absolute;left:50%;top:38%;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;min-width:44px;min-height:44px;background:none;border:0;opacity:0}
html[data-skin="g104"] #skinStage .lt-read{right:auto;left:50%;transform:translateX(-50%);bottom:14px}""",
    cfg=dict(tip='结余'), badge='蚀', ),
dict(id='g105', name='手影·戏', tag='幕布影墨', eng='light', mech='shadow', bind='items', max=6, h=182,
    anchors=dict(bg='#E8E2D2', card='#F2EDE0', ink='#34302A', a1='#443E36', a2='#A89878'),
    dark=dict(dbg='#161412', dcard='#201E1A', dink='#DCD6C8'),
    stage='radial-gradient(56% 44% at 50% 100%, rgba(168,152,120,.16), transparent 74%), radial-gradient(40% 32% at 14% 4%, rgba(255,244,214,.30), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g105"] #skinStage .gu{width:44px;height:52px;background:var(--ink);opacity:.82;border-radius:0}
html[data-skin="g105"] #skinStage .gu.c0{clip-path:polygon(30% 0,44% 16%,58% 6%,64% 22%,80% 18%,74% 36%,88% 34%,70% 52%,78% 68%,58% 62%,52% 100%,40% 62%,26% 70%,22% 44%,8% 40%,22% 24%,10% 12%,26% 18%)}
html[data-skin="g105"] #skinStage .gu.c1{clip-path:polygon(50% 0,68% 12%,62% 28%,84% 22%,72% 44%,92% 52%,66% 60%,58% 100%,42% 60%,16% 54%,30% 40%,18% 24%,38% 26%,34% 10%)}
html[data-skin="g105"] #skinStage .gu.c2{clip-path:polygon(20% 100%,26% 40%,14% 30%,30% 20%,26% 0,44% 12%,56% 2%,62% 18%,80% 14%,72% 34%,86% 44%,60% 54%,54% 100%)}
html[data-skin="g105"] #skinStage .gu.c3{clip-path:polygon(50% 2%,60% 18%,78% 12%,74% 30%,92% 38%,70% 50%,82% 66%,60% 60%,54% 98%,46% 60%,24% 68%,34% 50%,14% 40%,30% 30%,26% 12%,42% 18%)}
html[data-skin="g105"] #skinStage .gu.c4{clip-path:polygon(14% 100%,22% 44%,10% 36%,26% 26%,20% 6%,40% 16%,50% 0,60% 16%,80% 8%,72% 28%,90% 36%,68% 46%,76% 100%)}
html[data-skin="g105"] #skinStage .gu.c5{clip-path:polygon(26% 100%,20% 52%,4% 44%,22% 34%,14% 14%,36% 22%,48% 0,60% 20%,82% 10%,76% 32%,94% 42%,70% 54%,62% 100%)}
html[data-skin="g105"] #skinStage .sk-decor.d-g105::before{content:"";position:absolute;left:50%;top:2px;width:30px;height:10px;margin-left:-15px;border-radius:50%;background:rgba(255,244,214,.5);filter:blur(2px)}""",
    cfg=dict(tip='{d}'), badge='手', ),
# ################ v6.0 · E-H 账房·文书（desk） g106–g115 ################
dict(id='g106', name='算盘·珠算', tag='红木骨白珠', eng='desk', mech='abacus', bind='macro', max=3, h=196,
    anchors=dict(bg='#E6DCCB', card='#F1E8D9', ink='#3A2C1E', a1='#8C4A38', a2='#4A5C50'),
    dark=dict(dbg='#171210', dcard='#221B16', dink='#E3D6C4'),
    stage='repeating-linear-gradient(90deg, rgba(140,74,56,.04) 0 1px, transparent 1px 24px), radial-gradient(48% 40% at 84% 4%, rgba(74,92,80,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g106"] #skinStage .gu{width:22px;height:22px;border-radius:50%;background:radial-gradient(58% 58% at 38% 32%,#F7EFDD,#D9CBB0 70%);box-shadow:0 2px 5px rgba(58,44,30,.22), inset 0 0 0 1px rgba(140,74,56,.18)}
html[data-skin="g106"] #skinStage .gu.off{background:radial-gradient(58% 58% at 38% 32%,var(--surface-2),var(--line-2));opacity:.7}
html[data-skin="g106"] #skinStage .dk-rod{position:absolute;left:50%;width:2.5px;height:76%;margin-left:-1.25px;background:linear-gradient(90deg,var(--a1-2, var(--red)),rgba(58,44,30,.5));border-radius:2px}
html[data-skin="g106"] #skinStage .sk-decor.d-g106::before{content:"";position:absolute;left:10%;right:10%;top:30%;height:1.5px;background:rgba(58,44,30,.30)}
html[data-skin="g106"] #skinStage .sk-decor.d-g106::after{content:"";position:absolute;left:10%;right:10%;bottom:34%;height:1.5px;background:rgba(58,44,30,.30)}""",
    cfg=dict(tip='{d}'), badge='珠', ),
dict(id='g107', name='流水·账簿', tag='账页墨蓝', eng='desk', mech='ledger', bind='items', max=6, h=182,
    anchors=dict(bg='#ECE8DB', card='#F5F2E7', ink='#2E3236', a1='#34608C', a2='#8C7A54'),
    dark=dict(dbg='#141614', dcard='#1E211C', dink='#DBDFD2'),
    stage='repeating-linear-gradient(0deg, rgba(52,96,140,.05) 0 1px, transparent 1px 24px), radial-gradient(44% 36% at 88% 0%, rgba(140,122,84,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g107"] #skinStage .gu{width:64%;min-width:120px;height:30px;border-radius:3px;background:none;text-align:left;position:relative;box-shadow:none}
html[data-skin="g107"] #skinStage .gu::before{content:"";position:absolute;left:0;right:0;bottom:6px;height:1.5px;background:var(--line-2)}
html[data-skin="g107"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;bottom:12px;font:600 13px/1 var(--serif,serif);color:var(--a1-2, var(--green));letter-spacing:.04em;white-space:nowrap}
html[data-skin="g107"] #skinStage .gu.off::after{content:"——";color:var(--line-2)}
html[data-skin="g107"] #skinStage .sk-decor.d-g107::before{content:"";position:absolute;right:8%;top:10%;bottom:30%;width:1.5px;background:rgba(140,122,84,.4)}""",
    cfg=dict(tip='{d}'), badge='流', ),
dict(id='g108', name='存折·打印', tag='存折钢印灰', eng='desk', mech='passbook', bind='total', max=9, h=186,
    anchors=dict(bg='#E0E6DD', card='#EBF1E8', ink='#26342C', a1='#4A7C5E', a2='#7C8894'),
    dark=dict(dbg='#111613', dcard='#1A211D', dink='#D4DED6'),
    stage='repeating-linear-gradient(0deg, rgba(74,124,94,.04) 0 1px, transparent 1px 26px), radial-gradient(50% 40% at 12% 0%, rgba(124,136,148,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g108"] #skinStage .gu{width:56%;min-width:130px;height:24px;border-radius:2px;background:linear-gradient(90deg,var(--surface-2),transparent 88%);box-shadow:none;position:relative}
html[data-skin="g108"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:8px;top:50%;margin-top:-7px;font:600 11px/14px ui-monospace,Consolas,monospace;color:var(--ink-2);letter-spacing:.05em}
html[data-skin="g108"] #skinStage .gu.off::after{content:"· · · · · ·";color:var(--line-2)}
html[data-skin="g108"] #skinStage .sk-decor.d-g108::before{content:"存";position:absolute;left:6%;top:8px;font:600 14px/1 var(--serif,serif);color:var(--a1-2, var(--green));opacity:.85}
html[data-skin="g108"] #skinStage .sk-decor.d-g108::after{content:"";position:absolute;left:6%;right:6%;top:30px;height:2px;background:var(--a1-2, var(--green));opacity:.4}""",
    cfg=dict(tip='{n}'), badge='折', ),
dict(id='g109', name='打字·色带', tag='墨黑色带红', eng='desk', mech='typewriter', bind='count', max=1, h=190,
    anchors=dict(bg='#2A2A2C', card='#353538', ink='#ECE8E0', a1='#C45C50', a2='#9C9890'),
    dark=dict(always=True, dbg='#222224', dcard='#2D2D30', dink='#E8E4DC'),
    stage='repeating-linear-gradient(0deg, rgba(156,152,144,.05) 0 1px, transparent 1px 20px), radial-gradient(48% 38% at 50% 0%, rgba(196,92,80,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g109"] #skinStage .ty-paper{position:absolute;left:50%;top:22px;width:74%;height:88px;margin-left:-37%;border:0;padding:0;cursor:pointer;background:linear-gradient(175deg,#F4F1E8,#EAE5D6);border-radius:3px;box-shadow:0 6px 14px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.06)}
html[data-skin="g109"] #skinStage .ty-line{position:absolute;left:12%;right:12%;top:44%;font:600 15px/1.4 ui-monospace,Consolas,monospace;color:#2E2C28;white-space:nowrap;overflow:hidden}
html[data-skin="g109"] #skinStage .ty-line span{opacity:0;animation:sk109-type .06s steps(1) forwards}
@keyframes sk109-type{to{opacity:1}}
html[data-skin="g109"] #skinStage .ty-carriage{position:absolute;left:8%;right:8%;top:118px;height:12px;border-radius:4px;background:linear-gradient(180deg,#4A4A4E,#2C2C30);box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
html[data-skin="g109"] #skinStage .ty-ribbon{position:absolute;left:8%;right:8%;top:133px;height:5px;border-radius:2px;background:linear-gradient(90deg,var(--a1-2, var(--red)) 0 38%,#2E2C28 38%)}""",
    cfg=dict(tip='重打'), badge='键', ),
dict(id='g110', name='票据·存根', tag='牛皮骑缝红', eng='desk', mech='stubs', bind='miss14', max=14, h=178,
    anchors=dict(bg='#E9DFC8', card='#F2EAD6', ink='#3C3220', a1='#A84A3C', a2='#96784E'),
    dark=dict(dbg='#16130D', dcard='#211C13', dink='#E4D9C2'),
    stage='repeating-linear-gradient(0deg, rgba(150,120,78,.05) 0 1px, transparent 1px 22px), radial-gradient(46% 38% at 86% 2%, rgba(168,74,60,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g110"] #skinStage .gu{width:34px;height:44px;border-radius:2px;background:linear-gradient(165deg,var(--surface),var(--field));box-shadow:inset 0 0 0 1px rgba(150,120,78,.35), 0 2px 5px rgba(60,50,32,.10);position:relative}
html[data-skin="g110"] #skinStage .gu::before{content:"";position:absolute;left:0;right:0;top:50%;border-top:1.5px dashed rgba(168,74,60,.5)}
html[data-skin="g110"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:6px;font:600 10px/1 var(--serif,serif);color:var(--a2-2, var(--amber));text-align:center}
html[data-skin="g110"] #skinStage .gu.off{opacity:.45;box-shadow:inset 0 0 0 1px var(--line-2)}
html[data-skin="g110"] #skinStage .sk-decor.d-g110::after{content:"号";position:absolute;right:8%;top:10px;font:600 13px/1 var(--serif,serif);color:var(--a1-2, var(--red));opacity:.7}""",
    cfg=dict(tip='{d}'), badge='存', ),
dict(id='g111', name='当铺·木牌', tag='老木漆字金', eng='desk', mech='pawn', bind='total', max=8, h=182,
    anchors=dict(bg='#DFD4C0', card='#EAE0CE', ink='#362A1C', a1='#A8783C', a2='#6E5C44'),
    dark=dict(dbg='#15110C', dcard='#1F1A13', dink='#DFD4C0'),
    stage='repeating-linear-gradient(88deg, rgba(110,92,68,.05) 0 2px, transparent 2px 30px), radial-gradient(46% 40% at 14% 0%, rgba(168,120,60,.12), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g111"] #skinStage .gu{width:24px;height:52px;border-radius:4px;background:linear-gradient(90deg,#8A6A44,#6E5232 56%,#8A6A44);box-shadow:0 3px 7px rgba(54,42,28,.25);position:relative}
html[data-skin="g111"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:5px;width:3px;height:3px;margin-left:-1.5px;border-radius:50%;background:#3A2C1C}
html[data-skin="g111"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:16px;font:600 12px/1.15 var(--serif,serif);color:#F2E2C0;writing-mode:vertical-rl;letter-spacing:.1em}
html[data-skin="g111"] #skinStage .gu.off{opacity:.4}
html[data-skin="g111"] #skinStage .sk-decor.d-g111::before{content:"";position:absolute;left:6%;top:10px;width:56%;height:1.5px;background:rgba(110,92,68,.5)}
html[data-skin="g111"] #skinStage .sk-decor.d-g111::after{content:"当";position:absolute;left:6%;top:18px;font:600 20px/1 var(--serif,serif);color:var(--a1-2, var(--amber));opacity:.5}""",
    cfg=dict(tip='{n}'), badge='当', ),
dict(id='g112', name='卷宗·归档', tag='档案标签彩', eng='desk', mech='folders', bind='meals', max=5, h=186,
    anchors=dict(bg='#E4E4E0', card='#EEEEEA', ink='#303234', a1='#5C7C8C', a2='#C48450'),
    dark=dict(dbg='#131414', dcard='#1D1F1F', dink='#D8DAD8'),
    stage='repeating-linear-gradient(90deg, rgba(92,124,140,.04) 0 1px, transparent 1px 34px), radial-gradient(48% 38% at 50% 0%, rgba(196,132,80,.08), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g112"] #skinStage .gu{width:40px;height:56px;border-radius:3px 3px 2px 2px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line-2), 0 2px 6px rgba(48,50,52,.12);position:relative}
html[data-skin="g112"] #skinStage .gu::before{content:"";position:absolute;left:0;right:0;top:0;height:14px;border-radius:3px 3px 0 0;background:var(--tab,var(--a1-2, var(--green)))}
html[data-skin="g112"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:24px;font:600 11px/1 var(--serif,serif);color:var(--ink-2);text-align:center}
html[data-skin="g112"] #skinStage .gu.off{opacity:.5}
html[data-skin="g112"] #skinStage .gu.off::before{background:var(--line-2)}
html[data-skin="g112"] #skinStage .sk-decor.d-g112::after{content:"档";position:absolute;right:8%;top:12px;font:600 16px/1 var(--serif,serif);color:var(--a1-2, var(--green));opacity:.5}""",
    cfg=dict(tip='{d}'), badge='案', ),
dict(id='g113', name='墨研·松烟', tag='砚石松烟青', eng='desk', mech='inkstone', bind='kcal', max=1, h=192,
    anchors=dict(bg='#262A26', card='#323632', ink='#E4E6DC', a1='#5E7C6E', a2='#8C8878'),
    dark=dict(always=True, dbg='#1E221E', dcard='#292E29', dink='#E0E2D8'),
    stage='radial-gradient(52% 42% at 50% 46%, rgba(94,124,110,.12), transparent 72%), repeating-linear-gradient(46deg, rgba(140,136,120,.04) 0 1px, transparent 1px 16px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g113"] #skinStage .sk-decor.d-g113::before{content:"";position:absolute;left:50%;top:36%;width:130px;height:78px;margin:-39px 0 0 -65px;border-radius:50% 50% 46% 46%/64% 64% 40% 40%;background:linear-gradient(165deg,var(--surface),var(--line-2));box-shadow:0 8px 18px rgba(0,0,0,.30), inset 0 2px 0 rgba(255,255,255,.10)}
html[data-skin="g113"] #skinStage .sk-decor.d-g113::after{content:"";position:absolute;left:50%;top:calc(36% + 8px);width:86px;height:44px;margin-left:-43px;border-radius:50%;background:radial-gradient(64% 70% at 50% 46%,rgba(20,22,20,calc(.25 + var(--v,0)*.72)),var(--field));box-shadow:inset 0 3px 8px rgba(0,0,0,.35)}
html[data-skin="g113"] #skinStage .dk-stick{position:absolute;left:calc(50% + 34px);top:calc(36% - 6px);width:9px;height:34px;border-radius:4px 4px 2px 2px;background:linear-gradient(90deg,#2E2E2A,#44443E);transform:rotate(24deg);transform-origin:50% 90%;box-shadow:0 2px 4px rgba(0,0,0,.3)}
html[data-skin="g113"] #skinStage .dk-stick::after{content:"松烟";position:absolute;left:50%;top:6px;margin-left:-10px;font:600 9px/1 var(--serif,serif);color:rgba(228,230,220,.6);writing-mode:vertical-rl}""",
    cfg=dict(tip='研墨'), badge='研', ),
dict(id='g114', name='字据·画押', tag='宣纸朱砂', eng='desk', mech='sealmark', bind='recorded', max=1, h=188,
    anchors=dict(bg='#F1EAE0', card='#F7F2E9', ink='#3A342C', a1='#B4473A', a2='#A88C5C'),
    dark=dict(dbg='#171410', dcard='#221E17', dink='#E8DFCF'),
    stage='radial-gradient(46% 40% at 16% 6%, rgba(180,71,58,.08), transparent 70%), repeating-linear-gradient(94deg, rgba(168,140,92,.045) 0 1px, transparent 1px 12px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g114"] #skinStage .sk-decor.d-g114::before{content:"";position:absolute;left:50%;top:34%;width:120px;height:76px;margin:-38px 0 0 -60px;background:linear-gradient(178deg,var(--surface),var(--field));border-radius:2px;box-shadow:0 4px 10px rgba(58,52,44,.14), inset 0 0 0 1px rgba(168,140,92,.25)}
html[data-skin="g114"] #skinStage .sk-decor.d-g114::after{content:"字";position:absolute;left:calc(50% - 44px);top:calc(34% - 22px);font:600 20px/1 var(--serif,serif);color:var(--ink-3);opacity:.55}
html[data-skin="g114"] #skinStage .dk-mark{position:absolute;left:50%;top:calc(34% + 14px);width:44px;height:44px;margin-left:6px;border-radius:4px;background:var(--a1-2, var(--red));color:#F7EAD8;font:700 22px/44px var(--serif,serif);text-align:center;clip-path:polygon(6% 0,94% 4%,100% 88%,50% 100%,0 92%);box-shadow:0 0 0 2px rgba(180,71,58,.22);transform:rotate(-7deg)}
html[data-skin="g114"] #skinStage .dk-mark.empty{background:var(--line-2);color:transparent;box-shadow:none}
html[data-skin="g114"] #skinStage .dk-mark.pop{animation:sk114-stamp .5s cubic-bezier(.3,1.4,.4,1)}
@keyframes sk114-stamp{0%{transform:rotate(-7deg) scale(1.7);opacity:0}62%{transform:rotate(-7deg) scale(.94);opacity:1}to{transform:rotate(-7deg) scale(1)}}""",
    cfg=dict(tip='画押'), badge='押', ),
dict(id='g115', name='电报·译码', tag='电报纸墨点', eng='desk', mech='telegram', bind='count', max=1, h=186,
    anchors=dict(bg='#E4DCC2', card='#EEE7D0', ink='#343026', a1='#3E4854', a2='#96784E'),
    dark=dict(dbg='#14130D', dcard='#1E1C15', dink='#DFD9C4'),
    stage='repeating-linear-gradient(0deg, rgba(150,120,78,.05) 0 1px, transparent 1px 24px), radial-gradient(44% 36% at 84% 0%, rgba(62,72,84,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g115"] #skinStage .gu{width:100%;min-width:200px;height:30px;border-radius:2px;background:none;box-shadow:none;position:relative}
html[data-skin="g115"] #skinStage .gu i{position:absolute;top:13px;width:7px;height:4px;border-radius:1px;background:var(--a1-2, var(--green))}
html[data-skin="g115"] #skinStage .gu i.dt{width:4px;height:8px;top:11px}
html[data-skin="g115"] #skinStage .gu::after{content:attr(data-txt);position:absolute;right:0;top:9px;font:600 12px/1 ui-monospace,Consolas,monospace;color:var(--ink-2);letter-spacing:.12em}
html[data-skin="g115"] #skinStage .sk-decor.d-g115::before{content:"TELEGRAM";position:absolute;left:8%;top:10px;font:700 10px/1 ui-monospace,Consolas,monospace;letter-spacing:.3em;color:var(--a2-2, var(--amber));opacity:.75}
html[data-skin="g115"] #skinStage .sk-decor.d-g115::after{content:"";position:absolute;left:6%;right:6%;top:32px;height:1.5px;background:rgba(150,120,78,.4)}""",
    cfg=dict(tip='译码'), badge='码', ),
# ################ v6.0 · E-I 时序·节气（time） g116–g125 ################
dict(id='g116', name='刻漏·水钟', tag='青铜漏箭墨', eng='time', mech='waterclock', bind='dayphase', max=4, h=196,
    anchors=dict(bg='#DFE3DF', card='#EAEEEA', ink='#26302C', a1='#4E7C6C', a2='#8C8858'),
    dark=dict(dbg='#101513', dcard='#191F1C', dink='#CFDAD4'),
    stage='radial-gradient(48% 40% at 50% 108%, rgba(140,136,88,.14), transparent 74%), repeating-linear-gradient(90deg, rgba(78,124,108,.04) 0 1px, transparent 1px 24px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g116"] #skinStage .sk-decor.d-g116::before{content:"";position:absolute;left:50%;bottom:16px;width:92px;height:104px;margin-left:-46px;border-radius:12px 12px 44% 44%/14px 14px 30% 30%;background:linear-gradient(90deg,var(--surface) 0 34%,var(--field) 34% 52%,var(--surface) 52%);box-shadow:inset 0 0 0 2.5px rgba(140,136,88,.55), 0 8px 16px rgba(38,48,44,.16)}
html[data-skin="g116"] #skinStage .tm-fill{position:absolute;left:50%;bottom:18px;width:80px;height:calc(88px * var(--v,.5));margin-left:-40px;border-radius:0 0 40% 40%;background:linear-gradient(180deg,rgba(78,124,108,.5),rgba(78,124,108,.72));box-shadow:inset 0 2px 3px rgba(255,255,255,.25);transition:height .8s ease}
html[data-skin="g116"] #skinStage .tm-arrow{position:absolute;left:50%;bottom:calc(18px + 88px * var(--v,.5));width:3px;height:40px;margin-left:-1.5px;background:linear-gradient(180deg,var(--ink-2),transparent);transition:bottom .8s ease}
html[data-skin="g116"] #skinStage .tm-arrow::before{content:"";position:absolute;left:50%;top:-1px;width:11px;height:11px;margin-left:-5.5px;background:var(--a1-2, var(--green));clip-path:polygon(50% 0,100% 40%,50% 100%,0 40%)}
html[data-skin="g116"] #skinStage .sk-decor.d-g116::after{content:"";position:absolute;left:50%;bottom:calc(16px + 88px * var(--v,.5) + 40px);width:14px;height:5px;margin-left:-7px;border-radius:2px;background:var(--a2-2, var(--amber));transition:bottom .8s ease}""",
    cfg=dict(tip='{v}'), badge='漏', ),
dict(id='g117', name='节气·转盘', tag='立轴节气墨', eng='time', mech='termdial', bind='term', max=24, h=194,
    anchors=dict(bg='#ECE6D6', card='#F4F0E2', ink='#323028', a1='#4A6E5C', a2='#B4784E'),
    dark=dict(dbg='#151310', dcard='#1F1C16', dink='#DFD9C6'),
    stage='radial-gradient(52% 44% at 50% 44%, rgba(180,120,78,.10), transparent 72%), repeating-conic-gradient(from 0deg at 50% 46%, rgba(74,110,92,.05) 0 3deg, transparent 3deg 15deg), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g117"] #skinStage .sk-decor.d-g117{position:absolute;left:50%;top:42%;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:conic-gradient(from calc(var(--ang,0deg) * -1), var(--surface) 0 15deg, var(--field) 15deg 30deg);box-shadow:0 8px 18px rgba(50,48,40,.16), inset 0 0 0 3px rgba(180,120,78,.4);transform:rotate(var(--ang,0deg))}
html[data-skin="g117"] #skinStage .sk-decor.d-g117::before{content:"";position:absolute;inset:16px;border-radius:50%;background:repeating-conic-gradient(from 0deg,var(--line-2) 0 1.5deg,transparent 1.5deg 15deg);opacity:.7}
html[data-skin="g117"] #skinStage .sk-decor.d-g117::after{content:"";position:absolute;left:50%;top:0;width:3px;height:16px;margin-left:-1.5px;border-radius:2px;background:var(--a1-2, var(--green))}
html[data-skin="g117"] #skinStage .tm-core{position:absolute;left:50%;top:42%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:var(--paper);display:flex;align-items:center;justify-content:center;font:600 17px/1 var(--serif,serif);color:var(--a1-2, var(--green));box-shadow:0 3px 8px rgba(50,48,40,.20), inset 0 0 0 2px rgba(180,120,78,.35);min-width:44px;min-height:44px}""",
    cfg=dict(tip='{v}'), badge='气', ),
dict(id='g118', name='打更·梆子', tag='更楼锣金', eng='time', mech='watchdrum', bind='dayphase', max=5, h=188,
    anchors=dict(bg='#E2DACB', card='#ECE4D6', ink='#342C20', a1='#A87C3C', a2='#6C5844'),
    dark=dict(dbg='#14100B', dcard='#1F1912', dink='#DFD5C2'),
    stage='radial-gradient(52% 42% at 82% 4%, rgba(168,124,60,.13), transparent 72%), repeating-linear-gradient(0deg, rgba(108,88,68,.05) 0 2px, transparent 2px 26px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g118"] #skinStage .gu{width:52px;height:34px;border-radius:8px;background:linear-gradient(160deg,var(--surface),var(--line-2));color:var(--ink-2);font:600 13px/34px var(--serif,serif);text-align:center;box-shadow:0 3px 8px rgba(52,44,32,.16), inset 0 0 0 1.5px rgba(168,124,60,.35)}
html[data-skin="g118"] #skinStage .gu.on{background:linear-gradient(160deg,#F0D9A4,var(--a1-2, var(--amber)));color:#3A2C14;box-shadow:0 0 14px rgba(168,124,60,.4), inset 0 0 0 1.5px rgba(255,244,214,.5)}
html[data-skin="g118"] #skinStage .gu.off{opacity:.45}
html[data-skin="g118"] #skinStage .sk-decor.d-g118::before{content:"";position:absolute;left:8%;top:12px;width:2px;height:60%;background:var(--line-2)}
html[data-skin="g118"] #skinStage .sk-decor.d-g118::after{content:"更";position:absolute;left:12%;top:14px;font:600 16px/1 var(--serif,serif);color:var(--a1-2, var(--amber));opacity:.55}""",
    cfg=dict(tip='{v}'), badge='更', ),
dict(id='g119', name='四季·屏风', tag='屏风四季彩', eng='time', mech='season', bind='month', max=4, h=192,
    anchors=dict(bg='#E9E0D4', card='#F3ECE0', ink='#362E24', a1='#B45448', a2='#4E6E8C'),
    dark=dict(dbg='#161210', dcard='#201B17', dink='#E3DACC'),
    stage='repeating-linear-gradient(90deg, rgba(180,84,72,.04) 0 2px, transparent 2px 40px), radial-gradient(50% 42% at 50% 0%, rgba(78,110,140,.10), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g119"] #skinStage .gu{width:64px;height:88px;border-radius:6px;background:linear-gradient(178deg,var(--tab,var(--surface)),var(--field) 72%);box-shadow:inset 0 0 0 2.5px rgba(54,46,36,.30), inset 0 0 0 5px var(--surface), 0 3px 9px rgba(54,46,36,.14);position:relative}
html[data-skin="g119"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:8px;font:600 15px/1 var(--serif,serif);color:rgba(255,250,240,.92);text-align:center;letter-spacing:.2em}
html[data-skin="g119"] #skinStage .gu.off{opacity:.42}
html[data-skin="g119"] #skinStage .sk-decor.d-g119::before{content:"";position:absolute;left:4%;right:4%;bottom:20px;height:5px;border-radius:3px;background:var(--line-2)}
html[data-skin="g119"] #skinStage .sk-decor.d-g119::after{content:"屏";position:absolute;right:6%;top:10px;font:600 13px/1 var(--serif,serif);color:var(--a1-2, var(--red));opacity:.5}""",
    cfg=dict(tip='{v}'), badge='屏', ),
dict(id='g120', name='星轨·延时', tag='夜空轨迹青', eng='time', mech='startrails', bind='dayphase', max=4, h=190,
    anchors=dict(bg='#141C2C', card='#1E2840', ink='#E0E6F0', a1='#7CB0C4', a2='#C4B490'),
    dark=dict(always=True, dbg='#101725', dcard='#1A2338', dink='#DBE2EF'),
    stage='radial-gradient(64% 46% at 50% 112%, rgba(124,176,196,.16), transparent 76%), radial-gradient(circle at 20% 26%, rgba(224,230,240,.22) 0 1px, transparent 2px), radial-gradient(circle at 66% 18%, rgba(224,230,240,.18) 0 1px, transparent 2px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 94%)',
    comp="""html[data-skin="g120"] #skinStage .sk-decor.d-g120::before{content:"";position:absolute;left:50%;top:46%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:repeating-conic-gradient(from calc(var(--v,0) * -140deg),rgba(124,176,196,.30) 0 2deg,transparent 2deg 13deg);mask:radial-gradient(circle,transparent 0 44px,#000 45px 92px,transparent 93px);-webkit-mask:radial-gradient(circle,transparent 0 44px,#000 45px 92px,transparent 93px);transform:rotate(calc(var(--v,0) * 140deg))}
html[data-skin="g120"] #skinStage .sk-decor.d-g120::after{content:"";position:absolute;left:50%;top:46%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:radial-gradient(60% 60% at 40% 36%,#FFF,var(--a1-2, var(--green)) 72%);box-shadow:0 0 14px rgba(124,176,196,.7)}
html[data-skin="g120"] #skinStage .tm-ground{position:absolute;left:0;right:0;bottom:24px;height:1.5px;background:linear-gradient(90deg,transparent,var(--line-2),transparent)}
html[data-skin="g120"] #skinStage .tm-hill{position:absolute;left:0;right:0;bottom:24px;height:22px;background:linear-gradient(180deg,rgba(16,23,37,.9),transparent);clip-path:polygon(0 100%,0 44%,16% 44%,30% 0,46% 60%,62% 22%,80% 70%,100% 40%,100% 100%)}""",
    cfg=dict(tip='{v}'), badge='痕', ),
dict(id='g121', name='老黄历·宜忌', tag='黄历朱批红', eng='time', mech='almanac', bind='date', max=1, h=188,
    anchors=dict(bg='#EBDFA8', card='#F4ECBC', ink='#3E341E', a1='#B44A38', a2='#8C7440'),
    dark=dict(dbg='#181510', dcard='#231E15', dink='#E6DCC0'),
    stage='repeating-linear-gradient(0deg, rgba(140,116,64,.05) 0 1px, transparent 1px 20px), radial-gradient(46% 40% at 84% 2%, rgba(180,74,56,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g121"] #skinStage .gu{width:110px;height:96px;border-radius:3px;background:linear-gradient(176deg,var(--surface),var(--field));box-shadow:0 5px 12px rgba(62,52,30,.18), inset 0 0 0 1px rgba(140,116,64,.3);position:relative;min-width:44px;min-height:44px}
html[data-skin="g121"] #skinStage .gu::before{content:"宜 · 记账";position:absolute;left:0;right:0;top:12px;font:600 13px/1 var(--serif,serif);color:var(--a1-2, var(--red));text-align:center;letter-spacing:.1em}
html[data-skin="g121"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:44px;font:600 11px/1.3 var(--serif,serif);color:var(--ink-2);text-align:center}
html[data-skin="g121"] #skinStage .gu.flip{animation:sk121-flip .5s ease}
@keyframes sk121-flip{0%{transform:rotateY(0)}55%{transform:rotateY(84deg)}to{transform:rotateY(0)}}
html[data-skin="g121"] #skinStage .sk-decor.d-g121::before{content:"";position:absolute;left:50%;top:14px;width:8px;height:14px;margin-left:-4px;border-radius:4px;background:var(--a2-2, var(--amber))}
html[data-skin="g121"] #skinStage .sk-decor.d-g121::after{content:"";position:absolute;left:6%;right:6%;top:44px;height:1.5px;background:rgba(180,74,56,.35)}""",
    cfg=dict(tip='翻页'), badge='宜', ),
dict(id='g122', name='沙盘·等高线', tag='沙盘水线蓝', eng='time', mech='contour', bind='leftRatio', max=5, h=188,
    anchors=dict(bg='#E6DFC9', card='#F0E9D5', ink='#3A3424', a1='#4E7E9C', a2='#B09058'),
    dark=dict(dbg='#161409', dcard='#211E14', dink='#E1DAC4'),
    stage='repeating-radial-gradient(circle at 50% 120%, rgba(176,144,88,.06) 0 2px, transparent 2px 20px), radial-gradient(50% 40% at 14% 0%, rgba(78,126,156,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g122"] #skinStage .sk-decor.d-g122::before{content:"";position:absolute;left:12%;right:12%;top:22%;bottom:34%;border:2px solid rgba(58,52,36,.35);border-radius:8px;box-shadow:inset 0 0 0 2px rgba(240,233,213,.5)}
html[data-skin="g122"] #skinStage .tm-fill{position:absolute;left:13%;right:13%;bottom:35%;height:calc(42% * var(--v,.5));border-radius:0 0 6px 6px;background:linear-gradient(180deg,rgba(78,126,156,.34),rgba(78,126,156,.62));box-shadow:inset 0 2px 2px rgba(255,255,255,.3);transition:height .7s ease}
html[data-skin="g122"] #skinStage .tm-line{position:absolute;left:13%;right:13%;bottom:35%;border-top:1.5px dashed rgba(78,126,156,.55);transition:bottom .7s ease}
html[data-skin="g122"] #skinStage .tm-line.l2{bottom:calc(35% + 42% * var(--v,.5) * .5)}
html[data-skin="g122"] #skinStage .tm-line.l3{bottom:calc(35% + 42% * var(--v,.5))}
html[data-skin="g122"] #skinStage .sk-decor.d-g122::after{content:"H";position:absolute;right:14%;bottom:36%;font:600 11px/1 ui-monospace,Consolas,monospace;color:var(--a1-2, var(--green))}""",
    cfg=dict(tip='{v}%'), badge='线', ),
dict(id='g123', name='罗盘·更路', tag='罗盘针金', eng='time', mech='compass', bind='dayphase', max=4, h=196,
    anchors=dict(bg='#E3D9C4', card='#EDE3D0', ink='#362C1E', a1='#B49044', a2='#5E6E5C'),
    dark=dict(dbg='#151109', dcard='#1F1B13', dink='#DFD5BE'),
    stage='repeating-conic-gradient(from 0deg at 50% 44%, rgba(180,144,68,.05) 0 4deg, transparent 4deg 20deg), radial-gradient(50% 42% at 50% 44%, rgba(94,110,92,.10), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g123"] #skinStage .sk-decor.d-g123{position:absolute;left:50%;top:42%;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;background:radial-gradient(70% 70% at 46% 40%,var(--surface),var(--field));box-shadow:0 8px 18px rgba(54,44,30,.20), inset 0 0 0 3px rgba(180,144,68,.5)}
html[data-skin="g123"] #skinStage .sk-decor.d-g123::before{content:"";position:absolute;inset:10px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(54,44,30,.30) 0 1.5deg,transparent 1.5deg 30deg)}
html[data-skin="g123"] #skinStage .sk-decor.d-g123::after{content:"N";position:absolute;left:50%;top:7px;margin-left:-6px;font:700 11px/1 ui-monospace,Consolas,monospace;color:var(--a1-2, var(--amber))}
html[data-skin="g123"] #skinStage .tm-needle{position:absolute;left:50%;top:42%;width:4px;height:96px;margin:-48px 0 0 -2px;transform-origin:50% 50%;transform:rotate(var(--ang,0deg));transition:transform .7s cubic-bezier(.3,1.2,.4,1)}
html[data-skin="g123"] #skinStage .tm-needle::before{content:"";position:absolute;left:0;top:0;width:4px;height:48px;background:linear-gradient(180deg,var(--a1-2, var(--red)),rgba(180,90,70,.4));clip-path:polygon(50% 0,100% 100%,0 100%)}
html[data-skin="g123"] #skinStage .tm-needle::after{content:"";position:absolute;left:0;bottom:0;width:4px;height:44px;background:var(--a2-2, var(--green));clip-path:polygon(0 0,100% 0,50% 100%)}
html[data-skin="g123"] #skinStage .tm-core{position:absolute;left:50%;top:42%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:radial-gradient(60% 60% at 40% 34%,#F0DCA8,var(--a1-2, var(--amber)))}""",
    cfg=dict(tip='{v}'), badge='针', ),
dict(id='g124', name='年轮·木芯', tag='原木苔缘', eng='time', mech='yearrings', bind='total', max=9, h=192,
    anchors=dict(bg='#E8E0D0', card='#F2EADC', ink='#343022', a1='#7C8C54', a2='#A8784C'),
    dark=dict(dbg='#14120C', dcard='#1E1C14', dink='#DFD8C4'),
    stage='repeating-radial-gradient(circle at 50% 44%, rgba(168,120,76,.05) 0 2px, transparent 2px 16px), radial-gradient(50% 42% at 84% 2%, rgba(124,140,84,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g124"] #skinStage .gu{width:34px;height:34px;border-radius:50%;background:none;border:2.5px solid var(--a1-2, var(--green));opacity:.9;box-shadow:0 0 0 1px rgba(240,234,220,.4)}
html[data-skin="g124"] #skinStage .gu:nth-child(2n){border-color:var(--a2-2, var(--amber))}
html[data-skin="g124"] #skinStage .gu.off{border-style:dashed;border-color:var(--line-2);opacity:.5}
html[data-skin="g124"] #skinStage .sk-decor.d-g124::before{content:"";position:absolute;left:50%;top:44%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:conic-gradient(from 20deg,rgba(168,120,76,.08),transparent 62%,rgba(168,120,76,.06))}
html[data-skin="g124"] #skinStage .sk-decor.d-g124::after{content:attr(data-txt);position:absolute;left:50%;top:44%;margin:-8px 0 0 -20px;width:40px;text-align:center;font:600 15px/1 var(--serif,serif);color:var(--ink-2)}""",
    cfg=dict(tip='{n}'), badge='轮', ),
dict(id='g125', name='日暮·长影', tag='斜阳影灰', eng='time', mech='sunset', bind='dayphase', max=4, h=190,
    anchors=dict(bg='#E9DBC8', card='#F3E6D6', ink='#3C3020', a1='#C47838', a2='#8C8478'),
    dark=dict(dbg='#171310', dcard='#221C16', dink='#E6DACA'),
    stage='radial-gradient(56% 44% at 20% 8%, rgba(196,120,56,.18), transparent 72%), linear-gradient(180deg, transparent 62%, rgba(140,132,120,.14) 62%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g125"] #skinStage .sk-decor.d-g125::before{content:"";position:absolute;left:var(--sx,20%);top:30%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:radial-gradient(62% 62% at 44% 40%,#F6D9A0,var(--a1-2, var(--amber)) 66%,rgba(196,120,56,.4));box-shadow:0 0 24px rgba(196,120,56,.45);transition:left .8s ease}
html[data-skin="g125"] #skinStage .sk-decor.d-g125::after{content:"";position:absolute;left:0;right:0;bottom:30px;height:2px;background:var(--line)}
html[data-skin="g125"] #skinStage .tm-shadow{position:absolute;left:var(--sx,20%);bottom:32px;width:min(120px,calc(92% - var(--sx,20%)));height:7px;margin-left:26px;border-radius:4px;background:linear-gradient(90deg,rgba(60,48,32,.40),transparent);transform-origin:0 50%;transform:scaleX(var(--sh,.6));transition:left .8s ease,transform .8s ease}
html[data-skin="g125"] #skinStage .tm-hit{background:none;border:0}
html[data-skin="g125"] #skinStage .tm-post{position:absolute;left:var(--sx,20%);bottom:32px;width:6px;height:34px;margin-left:-3px;border-radius:3px;background:linear-gradient(180deg,var(--surface-2),var(--line-2));transition:left .8s ease}""",
    cfg=dict(tip='{v}'), badge='夕', ),
# ################ v6.0 · E-J 收藏·陈列（shelf） g126–g135 ################
dict(id='g126', name='标本·植物册', tag='标本蜡叶绿', eng='shelf', mech='specimens', bind='total', max=12, h=186,
    anchors=dict(bg='#EAE6D8', card='#F4F1E4', ink='#33322A', a1='#5E7C50', a2='#9C8860'),
    dark=dict(dbg='#141310', dcard='#1F1E17', dink='#DCD9C8'),
    stage='repeating-linear-gradient(0deg, rgba(156,136,96,.05) 0 1px, transparent 1px 22px), radial-gradient(46% 38% at 86% 0%, rgba(94,124,80,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g126"] #skinStage .gu{width:44px;height:34px;border-radius:2px;background:linear-gradient(165deg,var(--green-soft),var(--green-line));box-shadow:inset 0 0 0 1px rgba(94,124,80,.30), 0 2px 5px rgba(51,50,42,.10);position:relative}
html[data-skin="g126"] #skinStage .gu::before{content:"";position:absolute;left:6px;right:6px;top:8px;height:14px;background:var(--a1-2, var(--green));clip-path:polygon(50% 0,88% 50%,50% 100%,12% 50%);opacity:.75}
html[data-skin="g126"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;bottom:2px;font:600 8px/1 var(--serif,serif);color:var(--ink-3);text-align:center}
html[data-skin="g126"] #skinStage .gu.off{opacity:.35}
html[data-skin="g126"] #skinStage .gu.off::before{opacity:.2}
html[data-skin="g126"] #skinStage .sf-board{bottom:30px}""",
    cfg=dict(tip='{n}'), badge='标', ),
dict(id='g127', name='矿石·收藏盒', tag='天鹅绒矿彩', eng='shelf', mech='minerals', bind='miss14', max=14, h=182,
    anchors=dict(bg='#1E1C22', card='#2A2830', ink='#EAE6EE', a1='#B47C9C', a2='#6E9CC4'),
    dark=dict(always=True, dbg='#17151C', dcard='#242129', dink='#E4E0EA'),
    stage='radial-gradient(50% 40% at 50% 0%, rgba(110,156,196,.12), transparent 72%), repeating-linear-gradient(0deg, rgba(180,124,156,.04) 0 1px, transparent 1px 16px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g127"] #skinStage .gu{width:30px;height:26px;background:linear-gradient(155deg,var(--a1-2, var(--amber)) 0 34%,var(--a2-2, var(--green)) 34% 72%,var(--surface-2) 72%);clip-path:polygon(20% 0,80% 0,100% 48%,80% 100%,20% 100%,0 48%);box-shadow:0 0 10px rgba(180,124,156,.30)}
html[data-skin="g127"] #skinStage .gu:nth-child(3n){background:linear-gradient(155deg,var(--a2-2, var(--green)) 0 40%,var(--a1-2, var(--amber)) 40% 78%,var(--surface-2) 78%)}
html[data-skin="g127"] #skinStage .gu.off{background:var(--surface-2);box-shadow:none;opacity:.5}
html[data-skin="g127"] #skinStage .sf-board{background:linear-gradient(180deg,var(--line-2),transparent);opacity:.6}""",
    cfg=dict(tip='{d}'), badge='矿', ),
dict(id='g128', name='徽章·绶带', tag='绶带铜章', eng='shelf', mech='badges', bind='streakmile', max=4, h=190,
    anchors=dict(bg='#E2D6D0', card='#EEE2DC', ink='#362A28', a1='#A84844', a2='#96784E'),
    dark=dict(dbg='#161110', dcard='#201918', dink='#E0D4CE'),
    stage='repeating-linear-gradient(38deg, rgba(168,72,68,.05) 0 2px, transparent 2px 22px), radial-gradient(48% 40% at 50% 0%, rgba(150,120,78,.12), transparent 72%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g128"] #skinStage .gu{width:46px;height:56px;border-radius:4px;background:radial-gradient(64% 64% at 46% 38%,#E8C890,var(--a2-2, var(--amber)) 66%,var(--line-2));clip-path:polygon(0 0,100% 0,100% 62%,50% 100%,0 62%);box-shadow:0 3px 8px rgba(54,42,40,.20)}
html[data-skin="g128"] #skinStage .gu::before{content:"";position:absolute;left:8px;right:8px;top:8px;height:34px;background:linear-gradient(160deg,var(--a1-2, var(--red)),var(--red-soft));border-radius:3px;opacity:.85}
html[data-skin="g128"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:15px;font:600 11px/1 var(--serif,serif);color:#F6E8D8;text-align:center;z-index:1}
html[data-skin="g128"] #skinStage .gu.off{background:radial-gradient(64% 64% at 46% 38%,var(--surface-2),var(--line-2));opacity:.55}
html[data-skin="g128"] #skinStage .gu.off::before{background:var(--line-2)}
html[data-skin="g128"] #skinStage .gu.off::after{color:var(--ink-3)}""",
    cfg=dict(tip='{d}'), badge='章', ),
dict(id='g129', name='瓶盖·钉墙', tag='木板珐琅彩', eng='shelf', mech='caps', bind='count', max=12, h=180,
    anchors=dict(bg='#E4D6C2', card='#F0E2D0', ink='#3A2E20', a1='#4E7C8C', a2='#C46850'),
    dark=dict(dbg='#161209', dcard='#201A12', dink='#E3D5C0'),
    stage='repeating-linear-gradient(90deg, rgba(58,46,32,.05) 0 3px, transparent 3px 30px), radial-gradient(46% 40% at 12% 4%, rgba(78,124,140,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 86%)',
    comp="""html[data-skin="g129"] #skinStage .gu{width:26px;height:26px;border-radius:50%;background:radial-gradient(58% 58% at 40% 36%,var(--a1-2, var(--green)),var(--a2-2, var(--amber)) 68%,var(--line-2));box-shadow:0 2px 5px rgba(58,46,32,.22), inset 0 0 0 2px rgba(255,255,255,.22)}
html[data-skin="g129"] #skinStage .gu:nth-child(3n){background:radial-gradient(58% 58% at 40% 36%,#E8B090,var(--a2-2, var(--amber)) 68%,var(--line-2))}
html[data-skin="g129"] #skinStage .gu.off{background:var(--field);box-shadow:inset 0 0 0 2px var(--line-2);opacity:.7}
html[data-skin="g129"] #skinStage .sf-board{background:repeating-linear-gradient(90deg,var(--line-2) 0 2px,transparent 2px 12px);opacity:.5}""",
    cfg=dict(tip='{n} 笔'), badge='盖', ),
dict(id='g130', name='模型·火车', tag='车厢轨道灰', eng='shelf', mech='train', bind='recorded', max=4, h=190,
    anchors=dict(bg='#DFE4E8', card='#EAEFF3', ink='#243040', a1='#3E6E9C', a2='#8C94A0'),
    dark=dict(dbg='#111519', dcard='#1A2129', dink='#D3DCE4'),
    stage='linear-gradient(0deg, transparent 64%, rgba(140,148,160,.10) 64% 66%), radial-gradient(50% 40% at 84% 2%, rgba(62,110,156,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 90%)',
    comp="""html[data-skin="g130"] #skinStage .sf-board{bottom:40px;height:4px;background:repeating-linear-gradient(90deg,var(--ink-3) 0 10px,transparent 10px 20px);opacity:.7}
html[data-skin="g130"] #skinStage .sk-decor.d-g130{position:absolute;left:calc(14% + var(--tx,0%));bottom:44px;width:120px;height:44px;transition:left .8s ease}
html[data-skin="g130"] #skinStage .sk-decor.d-g130::before{content:"";position:absolute;left:0;bottom:0;width:64px;height:30px;border-radius:6px 12px 4px 4px;background:linear-gradient(165deg,var(--a1-2, var(--green)),var(--green-deep));box-shadow:0 3px 7px rgba(36,48,64,.2)}
html[data-skin="g130"] #skinStage .sk-decor.d-g130::after{content:"";position:absolute;left:66px;bottom:0;width:44px;height:24px;border-radius:4px 8px 4px 4px;background:linear-gradient(165deg,var(--surface-2),var(--line-2));box-shadow:inset 0 0 0 1.5px var(--a1-2, var(--green))}
html[data-skin="g130"] #skinStage .tm-wheels{position:absolute;left:10px;bottom:-6px;width:96px;height:12px;display:flex;gap:14px}
html[data-skin="g130"] #skinStage .tm-wheels i{width:12px;height:12px;border-radius:50%;background:var(--ink-3);box-shadow:0 0 0 2.5px var(--field)}
html[data-skin="g130"] #skinStage .tm-smoke{position:absolute;left:20px;top:-18px;width:16px;height:16px;border-radius:50%;background:rgba(240,240,240,.5);filter:blur(3px);animation:skv7-flicker 2.4s ease-in-out infinite}
html[data-skin="g130"] #skinStage .gu{min-width:44px;height:30px;padding:0 10px;border-radius:6px;background:var(--surface);color:var(--ink-2);font-size:11px;position:absolute;box-shadow:inset 0 0 0 1.5px var(--line-2)}""",
    cfg=dict(tip='鸣笛'), badge='汽', ),
dict(id='g131', name='门票·票夹', tag='票纸打孔线', eng='shelf', mech='tickets', bind='streak', max=7, h=184,
    anchors=dict(bg='#EDE4D8', card='#F6EFE4', ink='#34322A', a1='#B4604E', a2='#4E7C6E'),
    dark=dict(dbg='#151210', dcard='#1F1C18', dink='#DED7CB'),
    stage='repeating-linear-gradient(0deg, rgba(78,124,110,.04) 0 1px, transparent 1px 18px), radial-gradient(46% 38% at 86% 0%, rgba(180,96,78,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g131"] #skinStage .gu{width:38px;height:50px;border-radius:3px;background:linear-gradient(165deg,var(--surface),var(--field));box-shadow:0 2px 6px rgba(52,50,42,.12), inset 0 0 0 1px rgba(180,96,78,.25);position:relative}
html[data-skin="g131"] #skinStage .gu::before{content:"";position:absolute;left:4px;right:4px;top:34%;border-top:1.5px dashed var(--a2-2, var(--green))}
html[data-skin="g131"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:6px;font:600 11px/1 var(--serif,serif);color:var(--a1-2, var(--red));text-align:center}
html[data-skin="g131"] #skinStage .gu.off{opacity:.4}
html[data-skin="g131"] #skinStage .sf-board{bottom:32px}""",
    cfg=dict(tip='第{n}天'), badge='票', ),
dict(id='g132', name='扭蛋·展示架', tag='展架蛋壳彩', eng='shelf', mech='capsules', bind='miss14', max=14, h=184,
    anchors=dict(bg='#E8E8E6', card='#F2F2F0', ink='#303234', a1='#C48450', a2='#5C7C9C'),
    dark=dict(dbg='#131313', dcard='#1D1E1D', dink='#D9DAD8'),
    stage='radial-gradient(56% 44% at 50% 112%, rgba(196,132,80,.12), transparent 74%), repeating-linear-gradient(0deg, rgba(92,124,156,.04) 0 1px, transparent 1px 20px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g132"] #skinStage .gu{width:30px;height:34px;border-radius:50% 50% 44% 44%/62% 62% 38% 38%;background:linear-gradient(160deg,var(--surface) 0 48%,var(--a1-2, var(--amber)) 48% 56%,var(--surface) 56%);box-shadow:inset -4px -6px 8px rgba(0,0,0,.08), inset 0 3px 4px rgba(255,255,255,.5), 0 2px 6px rgba(48,50,52,.12)}
html[data-skin="g132"] #skinStage .gu:nth-child(4n){background:linear-gradient(160deg,var(--surface) 0 48%,var(--a2-2, var(--green)) 48% 56%,var(--surface) 56%)}
html[data-skin="g132"] #skinStage .gu.off{opacity:.35;box-shadow:inset 0 0 0 1.5px var(--line-2)}
html[data-skin="g132"] #skinStage .sf-board{bottom:34px;background:var(--line-2);opacity:.55}""",
    cfg=dict(tip='{d}'), badge='蛋', ),
dict(id='g133', name='火柴·花纸', tag='火花磷面棕', eng='shelf', mech='matches', bind='miss14', max=14, h=182,
    anchors=dict(bg='#E8DCCB', card='#F2E7D8', ink='#3A3224', a1='#B4543C', a2='#7C6848'),
    dark=dict(dbg='#161209', dcard='#201B14', dink='#E4D8C4'),
    stage='repeating-linear-gradient(84deg, rgba(124,104,72,.05) 0 2px, transparent 2px 26px), radial-gradient(44% 38% at 14% 2%, rgba(180,84,60,.10), transparent 70%), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g133"] #skinStage .gu{width:14px;height:46px;border-radius:3px 3px 2px 2px;background:linear-gradient(180deg,var(--a1-2, var(--red)) 0 18%,#E8DCC4 18%);box-shadow:0 2px 4px rgba(58,50,36,.16);transform-origin:50% 100%}
html[data-skin="g133"] #skinStage .gu::before{content:"";position:absolute;left:50%;top:-4px;width:9px;height:9px;margin-left:-4.5px;border-radius:50% 50% 40% 40%;background:radial-gradient(60% 60% at 42% 36%,#FFE2A0,var(--a2-2, var(--amber)))}
html[data-skin="g133"] #skinStage .gu.off{background:linear-gradient(180deg,var(--a2-2, var(--amber)) 0 18%,var(--field) 18%);opacity:.55}
html[data-skin="g133"] #skinStage .gu.off::before{background:var(--line-2);box-shadow:none}
html[data-skin="g133"] #skinStage .sf-board{bottom:30px;background:repeating-linear-gradient(90deg,var(--line-2) 0 6px,transparent 6px 14px)}""",
    cfg=dict(tip='{d}'), badge='火', ),
dict(id='g134', name='奖杯·陈列柜', tag='绒面鎏金', eng='shelf', mech='trophies', bind='streakmile', max=4, h=192,
    anchors=dict(bg='#2C1E20', card='#3A2A2E', ink='#F0E6D6', a1='#D6A85C', a2='#A85C58'),
    dark=dict(always=True, dbg='#241719', dcard='#312227', dink='#EBE0CF'),
    stage='radial-gradient(48% 38% at 50% 0%, rgba(214,168,92,.16), transparent 72%), repeating-linear-gradient(90deg, rgba(168,92,88,.05) 0 2px, transparent 2px 30px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 92%)',
    comp="""html[data-skin="g134"] #skinStage .gu{width:44px;height:52px;border-radius:4px 4px 8px 8px;background:linear-gradient(165deg,#F2D9A0,var(--a1-2, var(--amber)) 58%,#A8783C);clip-path:polygon(10% 0,90% 0,86% 40%,72% 62%,72% 78%,86% 88%,86% 100%,14% 100%,14% 88%,28% 78%,28% 62%,14% 40%);box-shadow:0 0 16px rgba(214,168,92,.35)}
html[data-skin="g134"] #skinStage .gu::after{content:attr(data-txt);position:absolute;left:0;right:0;top:16px;font:600 15px/1 var(--serif,serif);color:#5C4010;text-align:center}
html[data-skin="g134"] #skinStage .gu.off{background:linear-gradient(165deg,var(--surface-2),var(--line-2));box-shadow:none;opacity:.5}
html[data-skin="g134"] #skinStage .gu.off::after{color:var(--ink-3)}
html[data-skin="g134"] #skinStage .sf-board{bottom:36px;height:6px;border-radius:3px;background:linear-gradient(180deg,var(--a1-2, var(--amber)),var(--line-2));opacity:.75}
html[data-skin="g134"] #skinStage .sk-decor.d-g134::before{content:"";position:absolute;left:10%;width:80%;height:34%;background:radial-gradient(50% 90% at 50% 0%,rgba(244,222,176,.16),transparent 76%)}""",
    cfg=dict(tip='{d}'), badge='杯', ),
dict(id='g135', name='明信片·墙', tag='邮资风景彩', eng='shelf', mech='postcards', bind='streak', max=7, h=186,
    anchors=dict(bg='#EAE4D4', card='#F4F0E2', ink='#333026', a1='#4E7C8C', a2='#C48450'),
    dark=dict(dbg='#141310', dcard='#1E1D16', dink='#DCD9C6'),
    stage='radial-gradient(50% 40% at 50% 0%, rgba(196,132,80,.10), transparent 72%), repeating-linear-gradient(90deg, rgba(78,124,140,.04) 0 1px, transparent 1px 26px), linear-gradient(180deg, var(--paper-deep) 0%, transparent 88%)',
    comp="""html[data-skin="g135"] #skinStage .gu{width:52px;height:38px;border-radius:2px;background:linear-gradient(168deg,var(--a2-2, var(--amber)) 0 26%,var(--surface) 26%);box-shadow:0 3px 7px rgba(51,48,38,.16);transform:rotate(var(--pcr,-1.5deg));transform-origin:50% 0}
html[data-skin="g135"] #skinStage .gu:nth-child(2n){transform:rotate(1.6deg)}
html[data-skin="g135"] #skinStage .gu::before{content:"";position:absolute;left:6px;top:6px;width:14px;height:10px;border:1px solid rgba(78,124,140,.5)}
html[data-skin="g135"] #skinStage .gu::after{content:"";position:absolute;right:5px;top:5px;width:12px;height:12px;border-radius:50%;background:radial-gradient(58% 58% at 40% 36%,#F2E2B8,var(--a2-2, var(--amber)));opacity:.8}
html[data-skin="g135"] #skinStage .gu.off{opacity:.35}
html[data-skin="g135"] #skinStage .sk-decor.d-g135::before{content:"";position:absolute;left:6%;right:6%;top:10px;height:1.5px;background:var(--ink-3);opacity:.5}
html[data-skin="g135"] #skinStage .sk-decor.d-g135::after{content:"✉";position:absolute;left:8%;top:2px;font-size:13px;color:var(--ink-3);opacity:.6}""",
    cfg=dict(tip='第{n}天'), badge='片', ),
]
