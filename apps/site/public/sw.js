/*
 * Retires the service worker of the old nafaa.pk site (apps/marketing
 * registered /sw.js). Browsers re-check /sw.js on navigation, install this
 * version, and it removes the old caches and unregisters itself. The new site
 * does not register a service worker.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((client) => client.navigate(client.url))),
  );
});
