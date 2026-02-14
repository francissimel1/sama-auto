// Service Worker TapTapGO - Mode hors ligne

const CACHE_NAME = 'taptapgo-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
];

// Installation : mise en cache des fichiers essentiels
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Activer immédiatement
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Fetch : stratégie Network First, fallback sur cache
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes Firebase
  if (event.request.url.includes('firebase') || event.request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache en cas d'erreur réseau
        return caches.match(event.request).then((response) => {
          return response || new Response('Hors ligne', { status: 503 });
        });
      })
  );
});
