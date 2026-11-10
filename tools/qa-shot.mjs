#!/usr/bin/env node
/**
 * qa-shot.mjs · 无头浏览器实拍 + 页面测量（零依赖，走 Edge/Chrome CDP）
 *
 * 用法：
 *   node tools/qa-shot.mjs --url https://zly060709.github.io/ --w 390 --h 844 --out shots/a.png
 *   node tools/qa-shot.mjs --url file:///.../skins-v8.html --w 390 --h 844 --out shots/b.png \
 *        --eval "document.querySelector('[data-skin=g136]').click()" --wait 600
 *
 * 参数：
 *   --url    必填
 *   --w/--h  视口 CSS 像素，默认 390×844
 *   --dpr    设备像素比，默认 2
 *   --out    PNG 输出路径（相对仓库根）
 *   --eval   页面加载后执行的 JS（可重复），返回值会打印
 *   --wait   每次 eval 后额外等待毫秒，默认 350
 *   --full   整页截图（默认只截视口）
 *   --json   只输出测量 JSON（不截图）
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, def = '') {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : 'true';
}
function argAll(name) {
  const out = [];
  process.argv.forEach((a, i) => { if (a === '--' + name && process.argv[i + 1]) out.push(process.argv[i + 1]); });
  return out;
}

const url = arg('url');
if (!url) { console.error('missing --url'); process.exit(2); }
const W = Number(arg('w', '390'));
const H = Number(arg('h', '844'));
const DPR = Number(arg('dpr', '2'));
const out = arg('out', '');
const full = arg('full', 'false') === 'true';
const jsonOnly = arg('json', 'false') === 'true';
const wait = Number(arg('wait', '350'));
const evals = argAll('eval');

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const exe = CANDIDATES.find(p => existsSync(p));
if (!exe) { console.error('no chrome/edge found'); process.exit(2); }

const port = 9300 + Math.floor(Math.random() * 400);
const profile = resolve(os.tmpdir(), 'qa-shot-' + process.pid);
const child = spawn(exe, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--mute-audio',
  '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
  '--window-size=' + W + ',' + H, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWs() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/json/version');
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    await sleep(200);
  }
  throw new Error('CDP not ready');
}

let id = 0;
function rpc(ws, method, params = {}, sessionId) {
  return new Promise((res, rej) => {
    const msg = { id: ++id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    const onMsg = ev => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.id !== msg.id) return;
      ws.removeEventListener('message', onMsg);
      m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify(msg));
  });
}

const cleanup = () => {
  try { child.kill(); } catch { /* ignore */ }
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ } }, 400);
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

try {
  const wsUrl = await getWs();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const { targetId } = await rpc(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc(ws, 'Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => rpc(ws, m, p, sessionId);

  await s('Page.enable');
  await s('Runtime.enable');
  await s('Log.enable');

  const errors = [];
  ws.addEventListener('message', ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails || {};
      errors.push('EXCEPTION: ' + (d.exception && (d.exception.description || d.exception.value) || d.text) +
        ' @' + ((d.url || '') + ':' + (d.lineNumber || 0)));
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry || {};
      if (e.level === 'error') errors.push('LOG: ' + e.text + (e.url ? ' @' + e.url : ''));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('CONSOLE: ' + (m.params.args || []).map(a => a.value || a.description || '').join(' '));
    }
  });
  await s('Emulation.setDeviceMetricsOverride', {
    width: W, height: H, deviceScaleFactor: DPR, mobile: W < 720,
    screenWidth: W, screenHeight: H,
  });
  await s('Emulation.setTouchEmulationEnabled', { enabled: W < 720, maxTouchPoints: 5 });

  await s('Page.navigate', { url });
  await sleep(1200);

  const results = [];
  for (const code of evals) {
    const r = await s('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      results.push('EVAL-ERROR: ' + ((d.exception && (d.exception.description || d.exception.value)) || d.text));
    } else {
      results.push(r.result && r.result.value);
    }
    await sleep(wait);
  }

  let metrics = null;
  if (jsonOnly || evals.length === 0) {
    const r = await s('Runtime.evaluate', {
      expression: `(()=>{const d=document.documentElement;const b=document.body;
        const over=[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();
          return r.width>0&&(r.right>innerWidth+1||r.left<-1);}).slice(0,40).map(el=>{
          const r=el.getBoundingClientRect();
          return {tag:el.tagName.toLowerCase(),cls:(el.className&&el.className.baseVal!==undefined?el.className.baseVal:String(el.className||'')).slice(0,60),
            x:Math.round(r.left),w:Math.round(r.width),right:Math.round(r.right)};});
        return {vw:innerWidth,vh:innerHeight,clientW:d.clientWidth,scrollW:d.scrollWidth,
          bodyScrollW:b.scrollWidth,docH:d.scrollHeight,overflow:over};})()`,
      returnByValue: true,
    });
    metrics = r.result.value;
  }

  let shot = null;
  if (!jsonOnly) {
    const cap = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full });
    shot = cap.data;
    if (out) {
      const p = resolve(ROOT, out);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, Buffer.from(shot, 'base64'));
    }
  }

  console.log(JSON.stringify({ ok: true, url, w: W, h: H, eval: results, metrics, errors, out: out || null }, null, 1));
  ws.close();
  cleanup();
  process.exit(0);
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
  cleanup();
  process.exit(1);
}
