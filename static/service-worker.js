'use strict';

const CACHE_NAME = 'blog-cache';

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (!e.request.url.startsWith(location.origin)) {
    return;
  }
  if (e.request.method != 'GET') {
    return;
  }
  e.respondWith(async function() {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(e.request);
    if (cachedResponse) {
      e.waitUntil(async function() {
        const response = await fetch(e.request);
        await cache.put(e.request, response);
      }());
      return cachedResponse;
    }
    const response = await fetch(e.request);
    await cache.put(e.request, response.clone());
    return response;
  }());
});
