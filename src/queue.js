import { isKnown } from './store.js'
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// Раунд: сначала неизвестные (с ошибками — раньше), выученные изредка возвращаются.
export function buildRound(words, progress, n) {
  const size = n === 'all' ? words.length : Math.min(n, words.length)
  const unk = shuffle(words.filter(w => !isKnown(progress, w.id)))
    .sort((a, b) => (progress[b.id]?.errors ?? 0) - (progress[a.id]?.errors ?? 0))
  const kn = shuffle(words.filter(w => isKnown(progress, w.id)))
  const recheck = Math.min(kn.length, Math.round(size * 0.15))
  const pick = [...unk.slice(0, size - recheck), ...kn.slice(0, recheck)]
  for (const w of unk.slice(size - recheck)) { if (pick.length >= size) break; pick.push(w) }
  return shuffle(pick)
}
