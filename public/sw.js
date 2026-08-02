// Service worker minimal : met en cache ce qui a déjà été chargé en ligne
// (JS/CSS/HTML/images de l'app), pour que l'app se recharge hors ligne —
// utile en supermarché où la connexion est souvent mauvaise. Les appels vers
// Supabase (autre origine) ne passent jamais par ce cache.
const CACHE_NAME = 'monpanier-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await cache.match(self.registration.scope);
          if (shell) return shell;
        }
        throw err;
      }
    }),
  );
});
