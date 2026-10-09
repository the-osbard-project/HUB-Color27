const CACHE = 'color-time-v386';
const ASSETS = [
  './',
  './index.html',
  './assets/dd-profile-boot.js',
  './assets/dd.bundle.js',
  './manifest.json',
  './robots.txt',
  './sitemap.xml',
  './assets/styles/ct-critical.css',
  './assets/styles/ct-deferred.css',
  './assets/fonts/fredoka-latin-400-normal.woff2',
  './assets/fonts/fredoka-latin-500-normal.woff2',
  './assets/fonts/fredoka-latin-600-normal.woff2',
  './assets/fonts/fredoka-latin-700-normal.woff2',
  './assets/backpack/bundles.json',
  './assets/backpack/bundle-01/pages.json',
  './assets/backpack/bundle-01/1 - Heart.svg',
  './assets/backpack/bundle-01/2 - Star.svg',
  './assets/backpack/bundle-01/3 - Hot-air Balloon.svg',
  './assets/backpack/bundle-01/4 - Paw.svg',
  './assets/img-ct/cursors/pencil.svg',
  './assets/img-ct/cursors/bucket.svg',
  './assets/img-ct/cursors/eraser.svg',
  './assets/img-ct/cursors/crayon.svg',
  './assets/img-ct/cursors/pastel.svg',
  './assets/img-ct/cursors/marker.svg',
  './assets/img-ct/cursors/star.svg',
  './assets/img-ct/cursors/osbard.svg',
  './assets/img-ct/open-graph.webp',
  './assets/img-ct/open-graph-512-osbard.png',
  './assets/img-ct/logo-512-ct.png',
  './assets/img-ct/logo-512-ct-contrast.png',
  './assets/img-ct/favicon-192-ct.png',
  './assets/img-ct/favicon-512-ct.png',
  './assets/img-ct/apple-touch-icon-ct.png',
  './assets/img/scoopy.svg',
  './assets/img/facebook.svg',
  './assets/img/instagram.svg',
  './assets/img/substack.svg',
  './assets/vendor/phosphor/fill/style.css',
  './assets/vendor/phosphor/fill/Phosphor-Fill.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request)),
  );
});
