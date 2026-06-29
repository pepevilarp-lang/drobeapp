const CACHE = 'drobe-v10';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './wardrobe3d.js',
  './lib/supabase.js',
  './lib/ocr.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/scalpers-snake-grey.png',
  './assets/scalpers-skull-white.png',
  './assets/silbon-raquetas-white.png',
  './assets/pepe-eggo-white.png',
  './assets/pepe-eggo-grey.png',
  './assets/stoneisland-compass-black.png',
  './assets/stoneisland-knit-cream.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // nunca cachear la IA ni peticiones cross-origin (CDN de three, Supabase)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    // network-first para la navegación, con fallback al shell
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // cache-first para el resto del shell
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
