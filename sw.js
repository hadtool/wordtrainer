const C = 'vt-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())))
// Кэш сначала, обновление в фоне: сайт и наборы работают без сети.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  e.respondWith(caches.open(C).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true })
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r }).catch(() => hit)
    return hit || net }))
})
