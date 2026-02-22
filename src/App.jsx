import { useEffect, useMemo, useState } from 'react'

const DEFAULT_LOCATION = {
  country: 'India',
  state: 'Tamil Nadu',
  district: 'Chennai',
  area: 'Anna Nagar',
}

const STORAGE_KEY = 'ramadanTimingsData'
const THEME_KEY = 'ramadanTheme'

function formatRemaining(ms) {
  if (ms <= 0) return 'Iftar time has started. Ramadan Mubarak!'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h ${minutes}m ${seconds}s left`
}

function parseTodayTime(time24) {
  const [hour, minute] = time24.split(':').map(Number)
  const target = new Date()
  target.setHours(hour, minute, 0, 0)
  return target
}

function getTiming(dataset, location) {
  return dataset?.[location.country]?.[location.state]?.[location.district]?.[location.area] ?? null
}

export default function App() {
  const [dataset, setDataset] = useState(null)
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [lastUpdated, setLastUpdated] = useState('')
  const [countdown, setCountdown] = useState('Loading countdown...')
  const [rawJson, setRawJson] = useState('')
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    async function loadData() {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setDataset(parsed)
        setRawJson(JSON.stringify(parsed, null, 2))
        return
      }

      const response = await fetch('/data/timings.json')
      const fromFile = await response.json()
      setDataset(fromFile)
      setRawJson(JSON.stringify(fromFile, null, 2))
    }

    loadData()
  }, [])

  const countries = useMemo(() => (dataset ? Object.keys(dataset) : []), [dataset])
  const states = useMemo(() => (dataset ? Object.keys(dataset[location.country] || {}) : []), [dataset, location.country])
  const districts = useMemo(
    () => (dataset ? Object.keys(dataset[location.country]?.[location.state] || {}) : []),
    [dataset, location.country, location.state],
  )
  const areas = useMemo(
    () => (dataset ? Object.keys(dataset[location.country]?.[location.state]?.[location.district] || {}) : []),
    [dataset, location.country, location.state, location.district],
  )

  const timing = useMemo(() => getTiming(dataset, location), [dataset, location])

  useEffect(() => {
    if (!timing) return
    setLastUpdated(timing.lastUpdated)

    const tick = () => {
      const now = new Date()
      const target = parseTodayTime(timing.iftar)
      if (target <= now) {
        target.setDate(target.getDate() + 1)
      }
      setCountdown(formatRemaining(target.getTime() - now.getTime()))
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timing])

  const onSelect = (field, value) => {
    setMessage('')
    if (field === 'country') {
      const firstState = Object.keys(dataset[value] || {})[0]
      const firstDistrict = Object.keys(dataset[value]?.[firstState] || {})[0]
      const firstArea = Object.keys(dataset[value]?.[firstState]?.[firstDistrict] || {})[0]
      setLocation({ country: value, state: firstState, district: firstDistrict, area: firstArea })
      return
    }

    if (field === 'state') {
      const firstDistrict = Object.keys(dataset[location.country]?.[value] || {})[0]
      const firstArea = Object.keys(dataset[location.country]?.[value]?.[firstDistrict] || {})[0]
      setLocation((prev) => ({ ...prev, state: value, district: firstDistrict, area: firstArea }))
      return
    }

    if (field === 'district') {
      const firstArea = Object.keys(dataset[location.country]?.[location.state]?.[value] || {})[0]
      setLocation((prev) => ({ ...prev, district: value, area: firstArea }))
      return
    }

    setLocation((prev) => ({ ...prev, [field]: value }))
  }

  const saveJson = () => {
    try {
      const parsed = JSON.parse(rawJson)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      setDataset(parsed)
      setMessage('✅ Timings updated successfully. Last updated timestamp will refresh automatically.')
    } catch {
      setMessage('❌ Invalid JSON. Please fix formatting and try again.')
    }
  }

  if (!dataset || !timing) {
    return <div className="p-6 text-slate-700 dark:text-slate-200">Loading Ramadan timings...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-stone-100 p-4 text-slate-800 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-islamic-green dark:text-emerald-300">Ramadan Timings</h1>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>

          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Simple Islamic design • Default location: India → Tamil Nadu.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Country" value={location.country} options={countries} onChange={(v) => onSelect('country', v)} />
            <Select label="State" value={location.state} options={states} onChange={(v) => onSelect('state', v)} />
            <Select label="District" value={location.district} options={districts} onChange={(v) => onSelect('district', v)} />
            <Select label="Area" value={location.area} options={areas} onChange={(v) => onSelect('area', v)} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Card title="Sehri (Suhoor)">
              <p className="text-3xl font-semibold text-islamic-green dark:text-emerald-300">{timing.sehri}</p>
            </Card>
            <Card title="Iftar">
              <p className="text-3xl font-semibold text-islamic-gold">{timing.iftar}</p>
            </Card>
          </div>

          <Card title="Countdown to Next Iftar" extraClass="mt-4">
            <p className="text-xl font-medium">{countdown}</p>
          </Card>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Last updated timestamp: {lastUpdated}</p>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <h2 className="text-xl font-semibold text-islamic-green dark:text-emerald-300">Easy Admin Update</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            No login needed. Edit JSON and click save. Useful for masjid volunteers.
          </p>
          <textarea
            className="mt-3 h-72 w-full rounded-lg border p-3 font-mono text-xs dark:bg-slate-950"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          />
          <button onClick={saveJson} className="mt-3 w-full rounded-lg bg-islamic-green px-3 py-2 text-white">
            Save Timings
          </button>
          {message && <p className="mt-2 text-sm">{message}</p>}
        </section>
      </div>
    </div>
  )
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Card({ title, children, extraClass = '' }) {
  return (
    <div className={`rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-slate-700 dark:bg-slate-800 ${extraClass}`}>
      <p className="text-sm text-slate-500 dark:text-slate-300">{title}</p>
      {children}
    </div>
  )
}
