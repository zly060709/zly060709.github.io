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
html[data-skin="g39"] #skinStage .gu b{position:relative;z-index:1;font-size:9px;color:var(--green-deep)}""",
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
html[data-skin="g60"] #skinStage .fl-cab::before{content:"▲";position:absolute;left:50%;top:3px;transform:translateX(-50%);font-size:8px;color:rgba(255,255,255,.8)}
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
html[data-skin="g65"] #skinStage .wt-chip i{font-style:normal;font-size:9px;color:var(--ink-2)}""",
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
html[data-skin="g66"] #skinStage .vs-it b{position:absolute;left:4px;bottom:2px;right:4px;font-size:9px;color:#5C4A2E;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}""",
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
html[data-skin="g68"] #skinStage .st-stick b{position:absolute;left:50%;top:6px;transform:translateX(-50%) rotate(90deg);transform-origin:0 50%;font-size:9px;color:#6E4A2E;white-space:nowrap}""",
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
]
