const CACHE_NAME = 'hl-kbc-cache-v18';

const APP_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.css',
  '/icon.svg',
  '/iconkbc.png',
  '/hymns/houbungla.json',
  '/hymns/ladeilhen.json',
  '/hymns/lachom.json',
  '/hymns/houbungla-solfa.json',
  '/hymns/notifications.json',
  '/hymns/versions.json'
];

const PRECACHE_URLS = [...new Set(APP_FILES)];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        const cachePromises = PRECACHE_URLS.map(url => {
            return fetch(`${url}?cb=${Date.now()}`, { cache: 'no-store' }).then(response => {
                if (!response.ok) return;
                return cache.put(url, response);
            }).catch(() => {});
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  if (
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.includes('versions.json') ||
    url.pathname.endsWith('service-worker.js') ||
    url.pathname.endsWith('sw.js') ||
    url.pathname.includes('manifest.json')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(networkResponse => {
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then(response => {
            if (response) return response;
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            return new Response("You are offline.", { status: 503, statusText: "Service Unavailable" });
        });
      })
  );
});
