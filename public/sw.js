const C = 'vt-v2'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())))
// Страницы и данные (.json): сначала сеть, кэш — только если сети нет. Остальное (файлы с хэшем): кэш сначала.
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url)
  if (r.method !== 'GET' || u.origin !== self.location.origin) return
  const fresh = r.mode === 'navigate' || u.pathname.endsWith('.json')
  e.respondWith(caches.open(C).then(async c => {
    const hit = await c.match(r, { ignoreSearch: true })
    const net = () => fetch(r, fresh ? { cache: 'no-cache' } : undefined).then(res => { if (res.ok) c.put(r, res.clone()); return res })
    return fresh ? net().catch(() => hit) : (hit || net()) }))
})
