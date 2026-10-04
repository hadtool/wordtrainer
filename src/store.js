// Прогресс хранится только в localStorage. Ключ слова — его id.
const P = 'vt:progress', D = 'vt:days'
export const NEED = 3          // правильных ответов подряд до статуса «выучено»
export const DAY_GOAL = 10     // ответов в день для серии
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export const getProgress = () => read(P, {})
export const isKnown = (p, id) => (p[id]?.streak ?? 0) >= NEED
export const today = () => new Date().toISOString().slice(0, 10)

export function answer(id, ok) {
  const p = getProgress(), w = p[id] ?? { streak: 0, errors: 0 }
  w.streak = ok ? w.streak + 1 : 0          // любая ошибка сбрасывает счётчик
  if (!ok) w.errors += 1
  p[id] = w; write(P, p)
  const d = read(D, {}); d[today()] = (d[today()] ?? 0) + 1; write(D, d)
}

export function dayStreak() {
  const d = read(D, {}); let n = 0, t = new Date()
  if ((d[t.toISOString().slice(0, 10)] ?? 0) < DAY_GOAL) t.setDate(t.getDate() - 1)
  while ((d[t.toISOString().slice(0, 10)] ?? 0) >= DAY_GOAL) { n++; t.setDate(t.getDate() - 1) }
  return n
}

export const exportData = () => JSON.stringify({ v: 1, progress: getProgress(), days: read(D, {}) })
export function importData(text) {
  const o = JSON.parse(text)
  if (o.v !== 1 || typeof o.progress !== 'object') throw new Error('bad file')
  write(P, o.progress); write(D, o.days ?? {})
}
export const todayCount = () => read(D, {})[today()] ?? 0
