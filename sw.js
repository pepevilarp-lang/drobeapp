const CACHE = 'drobe-v21';
const SHELL = [
  './','./index.html','./styles.css','./app.js','./wardrobe3d.js',
  './lib/supabase.js','./manifest.webmanifest',
  './assets/icon-192.png','./assets/icon-512.png',
  './assets/scalpers-snake-grey.png','./assets/scalpers-skull-white.png',
  './assets/silbon-raquetas-white.png','./assets/pepe-eggo-white.png',
  './assets/pepe-eggo-grey.png','./assets/stoneisland-compass-black.png',
  './assets/stoneisland-knit-cream.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map(u=>c.add(u)))).then(() => self.skipWaiting())
  );
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
  // nunca cachear API ni cross-origin (Three CDN, Supabase, Nominatim, Open-Meteo)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  // NETWORK-FIRST para todo lo de la app: siempre la versión fresca,
  // cae a caché solo si no hay red. Evita servir JS/CSS obsoletos en iOS.
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
