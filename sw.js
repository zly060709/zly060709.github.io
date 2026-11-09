/* 能量账本 · 离线缓存（v5.2.1 多文件版）
   安装时只预缓存入口与 JS/CSS；30 套皮肤包一律按需缓存，启动不预取未解锁素材。
   页面/静态资源网络优先，断网回退缓存；version.json 网络优先、缓存兜底。 */
const CACHE = 'energy-ledger-v5.5.5';
const PRECACHE = [
  './',
  './index.html',
  './version.json',
  './icon.svg',
  './manifest.webmanifest',
  './assets/app.css?v=5.5.5',
  './assets/skins-v43.css?v=5.5.5',
  './assets/skins-v5.css?v=5.5.5',
  './assets/skins-v6.css?v=5.5.5',
  './assets/skins-v6.js?v=5.5.5',
  './assets/skins-v7.css?v=5.5.5',
  './assets/skins-v7.js?v=5.5.5',
  './assets/skins-m.css?v=5.5.5',
  './assets/data.js?v=5.5.5',
  './assets/engine.js?v=5.5.5',
  './assets/wellness.js?v=5.5.5',
  './assets/gender.js?v=5.5.5',
  './assets/extras.js?v=5.5.5',
  './assets/foodlib.js?v=5.5.5',
  './assets/foodlib-data.js?v=5.5.5',
  './assets/skin-fx.js?v=5.5.5',
  './assets/codes.js?v=5.5.5',
  './assets/announce.js?v=5.5.5',
  './assets/trip.js?v=5.5.5',
  './assets/app.js?v=5.5.5',
  './assets/maint-credential.js?v=5.5.5',
  './assets/maint.js?v=5.5.5'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 版本公告：先走网络，失败回退缓存（断网不报错）
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // 皮肤包：缓存优先（已预缓存，断网直接可用），未命中再回源并写入
  if (url.pathname.indexOf('/assets/skins/') >= 0) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || new Response('离线下暂无缓存，请联网后重新打开。', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || new Response('', { status: 504 })))
  );
});
