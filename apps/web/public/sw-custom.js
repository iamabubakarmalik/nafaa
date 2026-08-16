/* Nafaa background sync — app band ho to bhi net aane pe sync trigger */
self.addEventListener('sync', (event) => {
  if (event.tag === 'nafaa-pending-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'NAFAA_SYNC_NOW' }));
      }),
    );
  }
});
