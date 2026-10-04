import { useEffect, useMemo, useRef, useState } from 'react'
import { answer, getProgress, isKnown, dayStreak, todayCount, exportData, importData, NEED, DAY_GOAL } from './store.js'
import { buildRound, shuffle } from './queue.js'
import { LANGS, makeT } from './i18n.js'

const base = import.meta.env.BASE_URL + 'data/'
const SIZES = [20, 35, 50, 'all', 'endless']
const ls = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch {} }

export default function App() {
  const [lang, setLang] = useState(() => ls('vt:lang', 'ru')), [theme, setTheme] = useState(() => ls('vt:theme', 'auto'))
  const [sets, setSets] = useState([]), [view, setView] = useState('home'), [cur, setCur] = useState(null)
  const [words, setWords] = useState([]), [size, setSize] = useState(20), [res, setRes] = useState(null), [err, setErr] = useState(false)
  const t = makeT(lang)
  useEffect(() => { lsSet('vt:lang', lang); document.documentElement.lang = lang === 'tg' ? 'tg' : lang }, [lang])
  useEffect(() => { lsSet('vt:theme', theme)
    theme === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.setAttribute('data-theme', theme) }, [theme])
  useEffect(() => { fetch(base + 'index.json').then(r => r.json()).then(setSets).catch(() => setErr(true)) }, [])

  async function pick(s) {
    try { setWords(await (await fetch(base + s.file)).json()); setCur(s); setView('mode') } catch { setErr(true) }
  }
  if (view === 'quiz') return <Quiz t={t} words={words} size={size} onDone={r => { setRes(r); setView('result') }} />
  if (view === 'result') return <Result t={t} r={res} onBack={() => setView('home')} />
  if (view === 'stats') return <Stats t={t} sets={sets} onBack={() => setView('home')} />
  if (view === 'mode') return <div className="app"><button className="ghost" onClick={() => setView('home')}>{t('back')}</button>
    <h1>{cur.title}</h1><p className="muted">{t('howMany')}</p>
    {SIZES.map(n => <button key={n} className="set" onClick={() => { setSize(n); setView('quiz') }}>
      {n === 'all' ? t('all') : n === 'endless' ? t('endless') : t('words', { n })}</button>)}</div>
  return <div className="app">
    <div className="top">
      <div className="seg">{LANGS.map(([k, l]) => <button key={k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{l}</button>)}</div>
      <div className="seg">{['auto', 'light', 'dark'].map(k => <button key={k} className={theme === k ? 'on' : ''} onClick={() => setTheme(k)}>{t(k)}</button>)}</div>
    </div>
    <div className="row"><h1>{t('pickSet')}</h1><button className="ghost" onClick={() => setView('stats')}>{t('stats')}</button></div>
    {err && <p>{t('loadErr')}</p>}
    <SetList t={t} sets={sets} onPick={pick} /></div>
}

function useCounts(sets) {
  const [c, setC] = useState({})
  useEffect(() => { const p = getProgress(); sets.forEach(s => fetch(base + s.file).then(r => r.json()).then(w =>
    setC(x => ({ ...x, [s.id]: [w.filter(i => isKnown(p, i.id)).length, w.length] })))) }, [sets])
  return c
}

function SetBar({ t, s, kn, n }) {
  return <><div className="row"><span><span className="badge">{s.level}</span> <b>{s.title}</b></span>
    <span className="muted">{t('learned', { k: kn, n })}</span></div>
    <div className="bar"><i style={{ width: n ? (kn / n) * 100 + '%' : 0 }} /></div></>
}

function SetList({ t, sets, onPick }) {
  const c = useCounts(sets)
  return sets.map(s => { const [k, n] = c[s.id] ?? [0, 0]
    return <button key={s.id} className="set" onClick={() => onPick(s)}><SetBar t={t} s={s} kn={k} n={n} /></button> })
}

function Stats({ t, sets, onBack }) {
  const c = useCounts(sets), [msg, setMsg] = useState('')
  const total = Object.values(c).reduce((a, [k]) => a + k, 0)
  function doExport() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }))
    a.download = 'wordtrainer-progress.json'; a.click() }
  async function doImport(e) {
    try { importData(await e.target.files[0].text()); setMsg(t('importOk')) } catch { setMsg(t('importBad')) } e.target.value = '' }
  return <div className="app"><button className="ghost" onClick={onBack}>{t('back')}</button><h1>{t('stats')}</h1>
    <div className="grid">
      <div className="card stat"><b>{total}</b><span className="muted">{t('totalLearned')}</span></div>
      <div className="card stat"><b>{dayStreak()}</b><span className="muted">{t('streak')}</span></div>
      <div className="card stat"><b>{todayCount()}</b><span className="muted">{t('today')}</span></div></div>
    <p className="muted">{t('goalHint', { n: DAY_GOAL })}</p>
    <h2>{t('bySets')}</h2>
    {sets.map(s => { const [k, n] = c[s.id] ?? [0, 0]; return <div key={s.id} className="card pad"><SetBar t={t} s={s} kn={k} n={n} /></div> })}
    <p className="muted">{t('backup')}</p>
    <div className="chips"><button className="btn" onClick={doExport}>{t('exportBtn')}</button>
      <label className="ghost">{t('importBtn')}<input type="file" accept="application/json" hidden onChange={doImport} /></label></div>
    {msg && <p>{msg}</p>}</div>
}

function Quiz({ words, size, onDone, t }) {
  const endless = size === 'endless'
  const [known0] = useState(() => new Set(words.filter(w => isKnown(getProgress(), w.id)).map(w => w.id)))
  const qRef = useRef(null)
  if (!qRef.current) qRef.current = buildRound(words, getProgress(), endless ? words.length : size)
  const st = useRef({ ok: 0, total: 0, wrong: {} })
  const [step, setStep] = useState(0), [sel, setSel] = useState(null), [showTr, setShowTr] = useState(false)
  const w = qRef.current[0]
  const opts = useMemo(() => shuffle(w.options.map((t, i) => ({ t, ok: i === w.correct }))), [step])

  const finish = () => { const p = getProgress()
    onDone({ ok: st.current.ok, total: st.current.total, wrong: Object.values(st.current.wrong),
      learned: words.filter(x => isKnown(p, x.id) && !known0.has(x.id)).length }) }

  // Слово возвращается в очередь, пока не набрано NEED правильных подряд.
  function advance(requeue) {
    const q = qRef.current.slice(1)
    if (requeue) q.splice(Math.min(4, q.length), 0, w)
    if (!q.length) { if (endless) q.push(...buildRound(words, getProgress(), words.length)); else return finish() }
    qRef.current = q; setSel(null); setShowTr(false); setStep(s => s + 1)
  }
  function choose(i) {
    if (sel !== null) return
    const ok = opts[i].ok; setSel(i); answer(w.id, ok); st.current.total++
    if (ok) { st.current.ok++; const streak = getProgress()[w.id].streak
      setTimeout(() => advance(streak < NEED), 350) }
    else st.current.wrong[w.id] = w
  }
  useEffect(() => { const h = e => {
    if (e.key >= '1' && e.key <= '4') choose(+e.key - 1)
    else if (e.key === 't' || e.key === 'T') setShowTr(v => !v)
    else if ((e.key === 'Enter' || e.key === ' ') && sel !== null && !opts[sel].ok) { e.preventDefault(); advance(true) } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) })
  return <div className="app">
    <div className="row"><button className="ghost" onClick={finish}>{t('stop')}</button>
      <span className="muted">{t('queue', { n: qRef.current.length })}</span></div>
    <div className="word">{w.word}</div>
    <div className="hint">{w.pos && <span className="muted">{w.pos}</span>}
      {w.tr && <button className="ghost" onClick={() => setShowTr(v => !v)}>{showTr ? w.tr : t('translate')}</button>}</div>
    {opts.map((o, i) => <button key={i} className={'opt' + (sel !== null && o.ok ? ' ok' : sel === i ? ' bad' : '')} onClick={() => choose(i)}>
      <kbd>{i + 1}</kbd><span>{o.t}</span></button>)}
    {sel !== null && !opts[sel].ok && <div className="next"><button className="btn" onClick={() => advance(true)}>{t('next')}</button></div>}
  </div>
}

function Result({ t, r, onBack }) {
  return <div className="app"><h1>{t('results')}</h1>
    <p>{t('correctOf', { a: r.ok, b: r.total })}</p>
    <p>{t('newLearned', { n: r.learned })}</p>
    {r.wrong.length > 0 && <><p className="muted">{t('mistakes')}</p><ul className="err">
      {r.wrong.map(w => <li key={w.id}><b>{w.word}</b>{w.options[w.correct]}</li>)}</ul></>}
    <button className="btn" onClick={onBack}>{t('toSets')}</button></div>
}
