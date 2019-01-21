'use strict';

const cacheName = 'blog-cache';

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(cacheName));
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== cacheName) {
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
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(e.request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await fetch(e.request);
    await cache.put(e.request, response);
    return cache.match(e.request);
  }());
});
