/* 能量账本 · 离线缓存
   页面与静态资源优先走网络，失败时回退缓存；不缓存 API。
   皮肤包（assets/skins/）单独走 cache-first，写入 el-skins-v2，避免旧缓存卡住新版本。 */
const CACHE = 'energy-ledger-v5.0.2';
const SKIN_CACHE = 'el-skins-v2';
const ASSETS = [
  './',
  './index.html',
  './assets/app.css',
  './assets/skins-v43.css',
  './assets/skins-v5.css',
  './assets/data.js',
  './assets/engine.js',
  './assets/wellness.js',
  './assets/gender.js',
  './assets/extras.js',
  './assets/skin-fx.js',
  './assets/codes.js',
  './assets/announce.js',
  './assets/app.js',
  './icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SKIN_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 版本公告必须走网络：每次都带 cache-busting 参数，且不写入缓存
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req));
    return;
  }

  if (url.pathname.indexOf('/assets/skins/') >= 0) {
    // 皮肤包 cache-first：下载过的断网可用；未下载的才回源
    event.respondWith(
      caches.open(SKIN_CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            c.put(req, copy).catch(() => {});
          }
          return res;
        });
      })).catch(() => fetch(req))
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
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
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || new Response('', { status: 504 })))
  );
});
