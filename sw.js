/*
 * File: sw.js
 * Fungsi: Service Worker PWA dengan strategi Network-First untuk App Shell (cache file statis lokal saja)
 * Fitur: 13
 * 
 * PERLU VERIFIKASI:
 * Dukungan browser terhadap Service Worker dan Cache Storage pada iOS Safari versi lawas.
 */

const CACHE_VERSION = 'asix-piano-v3';
const APP_SHELL_FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'config.js',
  'manifest.webmanifest',
  'asix_studio_circle_web_320_v2.webp',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png'
];

// Event: install (Cache file inti aplikasi dan langsung aktif)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(APP_SHELL_FILES);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Event: activate (Bersihkan cache versi sebelumnya dan klaim klien aktif)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_VERSION) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Event: fetch (Strategi Network-First untuk request GET same-origin)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Abaikan request selain GET
  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  // 2. JANGAN CACHE: request ke /api/*, domain lain (Supabase, Google Fonts, Tailwind CDN, dsb),
  // serta request data dinamis lagu/skor
  const isSameOrigin = url.origin === self.location.origin;
  const isApiRoute = url.pathname.startsWith('/api/');

  if (!isSameOrigin || isApiRoute) {
    return;
  }

  // 3. Strategi Network-First untuk App Shell lokal
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Jika respon sukses, perbarui cache untuk request yang cocok
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline atau jaringan gagal, fallback ke cache lokal
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika file tidak ada di cache, biarkan error alami (ditangani di app.js)
          return new Response('Offline: Konten tidak tersedia.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
