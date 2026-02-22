import React, { useCallback, useEffect, useMemo, useState } from 'react'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec'
const FALLBACK_URL = '/data/timings.json'
const REFRESH_MS = 5 * 60 * 1000
const THEME_KEY = 'ramadanTheme'

// Convert different API shapes into one consistent nested format:
// data[country][state][district][area] = { sehri, iftar, lastUpdated }
function normalizeApiData(payload) {
  if (!payload) return {}

  // Case 1: API already returns nested object in expected shape.
  if (!Array.isArray(payload) && typeof payload === 'object') {
    const maybeCountry = Object.values(payload)[0]
    const looksNested = typeof maybeCountry === 'object' && maybeCountry !== null
    if (looksNested) return payload
  }

  // Case 2: API returns a wrapper object like { data: [...] } or { timings: [...] }.
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.timings)
        ? payload.timings
        : []

  const output = {}

  for (const item of list) {
    // Support common key variations from Google Sheets headers.
    const country = String(item.country ?? item.Country ?? 'India').trim()
    const state = String(item.state ?? item.State ?? 'Tamil Nadu').trim()
    const district = String(item.district ?? item.District ?? 'Unknown District').trim()
    const area = String(item.area ?? item.Area ?? item.locality ?? 'Unknown Area').trim()

    const sehri = String(item.sehri ?? item.Sehri ?? item.suhoor ?? '--:--').trim()
    const iftar = String(item.iftar ?? item.Iftar ?? '--:--').trim()
    const lastUpdated = String(
      item.lastUpdated ?? item.last_updated ?? item['Last Updated'] ?? new Date().toLocaleString('en-IN'),
    ).trim()

    if (!output[country]) output[country] = {}
    if (!output[country][state]) output[country][state] = {}
    if (!output[country][state][district]) output[country][state][district] = {}

    output[country][state][district][area] = { sehri, iftar, lastUpdated }
  }

  return output
}

function parseTimeToDate(timeValue) {
  if (!timeValue || timeValue === '--:--') return null

  const now = new Date()

  // Handles 24-hour format: 18:22
  let match = timeValue.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const [_, hh, mm] = match
    const target = new Date(now)
    target.setHours(Number(hh), Number(mm), 0, 0)
    return target
  }

  // Handles 12-hour format: 6:22 PM
  match = timeValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match) {
    const [_, rawHh, mm, amPm] = match
    let hh = Number(rawHh)
    if (amPm.toUpperCase() === 'PM' && hh !== 12) hh += 12
    if (amPm.toUpperCase() === 'AM' && hh === 12) hh = 0
    const target = new Date(now)
    target.setHours(hh, Number(mm), 0, 0)
    return target
  }

  return null
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Iftar time has started. Ramadan Mubarak!'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}h ${m}m ${s}s left`
}

export default function App() {
  const [dataset, setDataset] = useState({})
  const [location, setLocation] = useState({ country: '', state: '', district: '', area: '' })
  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light')
  const [status, setStatus] = useState({ loading: true, error: '', source: 'API' })
  const [countdown, setCountdown] = useState('Loading countdown...')
  const [lastFetchedAt, setLastFetchedAt] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const fetchTimings = useCallback(async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: '' }))

    try {
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error(`API request failed (${response.status})`)

      const payload = await response.json()
      const normalized = normalizeApiData(payload)
      if (!Object.keys(normalized).length) throw new Error('API returned empty data')

      setDataset(normalized)
      setStatus({ loading: false, error: '', source: 'Google Apps Script API' })
      setLastFetchedAt(new Date().toLocaleString('en-IN'))
    } catch (apiError) {
      try {
        // Fallback so the app still works if API has CORS/network issues.
        const fallbackResponse = await fetch(FALLBACK_URL)
        const fallbackPayload = await fallbackResponse.json()
        const normalizedFallback = normalizeApiData(fallbackPayload)

        setDataset(normalizedFallback)
        setStatus({
          loading: false,
          error: `API unavailable right now (${apiError.message}). Showing fallback data.`,
          source: 'Local JSON fallback',
        })
        setLastFetchedAt(new Date().toLocaleString('en-IN'))
      } catch {
        setDataset({})
        setStatus({ loading: false, error: 'Unable to load timing data from API and fallback.', source: 'Unavailable' })
      }
    }
  }, [])

  // Initial fetch + auto refresh every 5 minutes.
  useEffect(() => {
    fetchTimings()
    const refreshId = setInterval(fetchTimings, REFRESH_MS)
    return () => clearInterval(refreshId)
  }, [fetchTimings])

  const countries = useMemo(() => Object.keys(dataset), [dataset])
  const states = useMemo(() => Object.keys(dataset?.[location.country] || {}), [dataset, location.country])
  const districts = useMemo(
    () => Object.keys(dataset?.[location.country]?.[location.state] || {}),
    [dataset, location.country, location.state],
  )
  const areas = useMemo(
    () => Object.keys(dataset?.[location.country]?.[location.state]?.[location.district] || {}),
    [dataset, location.country, location.state, location.district],
  )

  // Keep selection valid whenever dataset updates.
  useEffect(() => {
    if (!countries.length) return

    const nextCountry = countries.includes(location.country)
      ? location.country
      : countries.find((c) => c === 'India') || countries[0]

    const nextStates = Object.keys(dataset[nextCountry] || {})
    const nextState = nextStates.includes(location.state)
      ? location.state
      : nextStates.find((s) => s === 'Tamil Nadu') || nextStates[0] || ''

    const nextDistricts = Object.keys(dataset[nextCountry]?.[nextState] || {})
    const nextDistrict = nextDistricts.includes(location.district) ? location.district : nextDistricts[0] || ''

    const nextAreas = Object.keys(dataset[nextCountry]?.[nextState]?.[nextDistrict] || {})
    const nextArea = nextAreas.includes(location.area) ? location.area : nextAreas[0] || ''

    if (
      nextCountry !== location.country ||
      nextState !== location.state ||
      nextDistrict !== location.district ||
      nextArea !== location.area
    ) {
      setLocation({ country: nextCountry, state: nextState, district: nextDistrict, area: nextArea })
    }
  }, [countries, dataset, location.country, location.state, location.district, location.area])

  const timing = useMemo(() => {
    return dataset?.[location.country]?.[location.state]?.[location.district]?.[location.area] || null
  }, [dataset, location])

  useEffect(() => {
    if (!timing?.iftar) {
      setCountdown('Iftar timing not available for this location.')
      return
    }

    const tick = () => {
      const now = new Date()
      const target = parseTimeToDate(timing.iftar)

      if (!target) {
        setCountdown('Invalid Iftar time format.')
        return
      }

      if (target <= now) target.setDate(target.getDate() + 1)
      setCountdown(formatCountdown(target.getTime() - now.getTime()))
    }

    tick()
    const timerId = setInterval(tick, 1000)
    return () => clearInterval(timerId)
  }, [timing])

  const onSelect = (field, value) => {
    if (field === 'country') {
      const firstState = Object.keys(dataset[value] || {})[0] || ''
      const firstDistrict = Object.keys(dataset[value]?.[firstState] || {})[0] || ''
      const firstArea = Object.keys(dataset[value]?.[firstState]?.[firstDistrict] || {})[0] || ''
      setLocation({ country: value, state: firstState, district: firstDistrict, area: firstArea })
      return
    }

    if (field === 'state') {
      const firstDistrict = Object.keys(dataset[location.country]?.[value] || {})[0] || ''
      const firstArea = Object.keys(dataset[location.country]?.[value]?.[firstDistrict] || {})[0] || ''
      setLocation((prev) => ({ ...prev, state: value, district: firstDistrict, area: firstArea }))
      return
    }

    if (field === 'district') {
      const firstArea = Object.keys(dataset[location.country]?.[location.state]?.[value] || {})[0] || ''
      setLocation((prev) => ({ ...prev, district: value, area: firstArea }))
      return
    }

    setLocation((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-stone-100 p-4 text-slate-800 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-islamic-green dark:text-emerald-300">Ramadan Timings</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Simple, clean, and beginner-friendly Islamic design</p>
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="rounded-lg border px-3 py-2 text-sm">
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p>Data source: {status.source}</p>
            <p className="sm:text-right">Last sync: {lastFetchedAt || 'Loading...'}</p>
          </div>
          {status.error && <p className="mt-2 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">{status.error}</p>}
        </header>

        <main className="grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Country" value={location.country} options={countries} onChange={(v) => onSelect('country', v)} />
              <Select label="State" value={location.state} options={states} onChange={(v) => onSelect('state', v)} />
              <Select label="District" value={location.district} options={districts} onChange={(v) => onSelect('district', v)} />
              <Select label="Area" value={location.area} options={areas} onChange={(v) => onSelect('area', v)} />
            </div>

            {status.loading ? (
              <p className="mt-6">Loading timings...</p>
            ) : !timing ? (
              <p className="mt-6 rounded-md bg-rose-100 px-3 py-2 text-rose-700">No timing found for selected location.</p>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Card title="Sehri (Suhoor)">
                    <p className="text-3xl font-semibold text-islamic-green dark:text-emerald-300">{timing.sehri || '--:--'}</p>
                  </Card>
                  <Card title="Iftar">
                    <p className="text-3xl font-semibold text-islamic-gold">{timing.iftar || '--:--'}</p>
                  </Card>
                </div>

                <Card title="Countdown to Next Iftar" extraClass="mt-4">
                  <p className="text-xl font-medium">{countdown}</p>
                </Card>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  Last updated timestamp: {timing.lastUpdated || 'Not available'}
                </p>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-amber-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <h2 className="text-xl font-semibold text-islamic-green dark:text-emerald-300">How it works (Beginner Guide)</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
              <li>The app fetches timing data from Google Apps Script API.</li>
              <li>You choose Country → State → District → Area from dropdowns.</li>
              <li>Sehri, Iftar, and Last Updated are shown instantly.</li>
              <li>Countdown auto-updates every second for next Iftar.</li>
              <li>Data auto-refreshes every 5 minutes in the background.</li>
            </ol>
            <button onClick={fetchTimings} className="mt-4 w-full rounded-lg bg-islamic-green px-3 py-2 text-white">
              Refresh Now
            </button>
          </section>
        </main>
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
        disabled={!options.length}
      >
        {!options.length ? <option>No options</option> : null}
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
    <div
      className={`rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-slate-700 dark:bg-slate-800 ${extraClass}`}
    >
      <p className="text-sm text-slate-500 dark:text-slate-300">{title}</p>
      {children}
    </div>
  )
}
