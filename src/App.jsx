import React, { useCallback, useEffect, useMemo, useState } from 'react'

const API_URL =
  'https://script.google.com/macros/s/AKfycbyPkBWIASupSmjB8iG7uw3NjBIU5EmBil97nmAzi7agAAZtstYk3Iq6Lr7zqt3qwP3B/exec'
const FALLBACK_URL = '/data/timings.json'
const REFRESH_MS = 5 * 60 * 1000
const THEME_KEY = 'ramadanTheme'
const OTHER_VALUE = '__OTHER__'

// Normalize different API payload shapes to one nested map:
// dataset[country][state][district][area] = { sehri, iftar, lastUpdated }
function normalizeApiData(payload) {
  if (!payload) return {}

  if (!Array.isArray(payload) && typeof payload === 'object') {
    const topValue = Object.values(payload)[0]
    if (topValue && typeof topValue === 'object' && !Array.isArray(topValue)) return payload
  }

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.timings)
        ? payload.timings
        : []

  const output = {}

  for (const item of rows) {
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

function toTargetDate(timeValue) {
  if (!timeValue || timeValue === '--:--') return null
  const now = new Date()

  let match = timeValue.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const [_, h, m] = match
    const date = new Date(now)
    date.setHours(Number(h), Number(m), 0, 0)
    return date
  }

  match = timeValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match) {
    const [_, rawH, m, ampm] = match
    let h = Number(rawH)
    if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0
    const date = new Date(now)
    date.setHours(h, Number(m), 0, 0)
    return date
  }

  return null
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Iftar time has started. Ramadan Mubarak!'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}h ${m}m ${s}s left`
}

function getUserValue(value, typedValue) {
  if (value === OTHER_VALUE) return typedValue.trim()
  return value
}

function withOther(options) {
  return [...options, OTHER_VALUE]
}

export default function App() {
  const [dataset, setDataset] = useState({})
  const [location, setLocation] = useState({ country: '', state: '', district: '', area: '' })
  const [otherInput, setOtherInput] = useState({ country: '', state: '', district: '', area: '' })

  const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || 'light')
  const [status, setStatus] = useState({ loading: true, error: '', source: 'API' })
  const [countdown, setCountdown] = useState('Loading countdown...')
  const [lastFetchedAt, setLastFetchedAt] = useState('')

  const [submitState, setSubmitState] = useState({ loading: false, success: '', error: '' })
  const [newTiming, setNewTiming] = useState({
    country: '',
    state: '',
    district: '',
    area: '',
    sehri: '',
    iftar: '',
  })

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
        const fallbackResponse = await fetch(FALLBACK_URL)
        const fallbackPayload = await fallbackResponse.json()
        const normalizedFallback = normalizeApiData(fallbackPayload)

        setDataset(normalizedFallback)
        setStatus({
          loading: false,
          error: `API unavailable (${apiError.message}). Showing fallback data.`,
          source: 'Local JSON fallback',
        })
        setLastFetchedAt(new Date().toLocaleString('en-IN'))
      } catch {
        setDataset({})
        setStatus({ loading: false, error: 'Unable to load timing data.', source: 'Unavailable' })
      }
    }
  }, [])

  useEffect(() => {
    fetchTimings()
    const id = setInterval(fetchTimings, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchTimings])

  const countries = useMemo(() => Object.keys(dataset), [dataset])
  const activeCountry = getUserValue(location.country, otherInput.country)
  const states = useMemo(() => Object.keys(dataset?.[activeCountry] || {}), [dataset, activeCountry])
  const activeState = getUserValue(location.state, otherInput.state)
  const districts = useMemo(() => Object.keys(dataset?.[activeCountry]?.[activeState] || {}), [dataset, activeCountry, activeState])
  const activeDistrict = getUserValue(location.district, otherInput.district)
  const areas = useMemo(
    () => Object.keys(dataset?.[activeCountry]?.[activeState]?.[activeDistrict] || {}),
    [dataset, activeCountry, activeState, activeDistrict],
  )
  const activeArea = getUserValue(location.area, otherInput.area)

  useEffect(() => {
    if (!countries.length) return

    const country = countries.includes(location.country) ? location.country : countries.find((c) => c === 'India') || countries[0] || ''
    const nextStates = Object.keys(dataset[country] || {})
    const state = nextStates.includes(location.state) ? location.state : nextStates.find((s) => s === 'Tamil Nadu') || nextStates[0] || ''
    const nextDistricts = Object.keys(dataset[country]?.[state] || {})
    const district = nextDistricts.includes(location.district) ? location.district : nextDistricts[0] || ''
    const nextAreas = Object.keys(dataset[country]?.[state]?.[district] || {})
    const area = nextAreas.includes(location.area) ? location.area : nextAreas[0] || ''

    if (
      location.country !== country ||
      location.state !== state ||
      location.district !== district ||
      location.area !== area
    ) {
      setLocation({ country, state, district, area })
    }
  }, [countries, dataset, location])

  // Timing only uses existing dataset path. Manual "Other" values are for add-form convenience.
  const timing = useMemo(
    () => dataset?.[location.country]?.[location.state]?.[location.district]?.[location.area] || null,
    [dataset, location],
  )

  useEffect(() => {
    if (!timing?.iftar) {
      setCountdown('Iftar timing not available for this location.')
      return
    }

    const tick = () => {
      const now = new Date()
      const target = toTargetDate(timing.iftar)
      if (!target) {
        setCountdown('Invalid Iftar time format.')
        return
      }
      if (target <= now) target.setDate(target.getDate() + 1)
      setCountdown(formatCountdown(target.getTime() - now.getTime()))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timing])

  function onSelect(field, value) {
    setSubmitState({ loading: false, success: '', error: '' })

    if (field === 'country') {
      if (value === OTHER_VALUE) {
        setLocation({ country: OTHER_VALUE, state: OTHER_VALUE, district: OTHER_VALUE, area: OTHER_VALUE })
        return
      }

      const firstState = Object.keys(dataset[value] || {})[0] || ''
      const firstDistrict = Object.keys(dataset[value]?.[firstState] || {})[0] || ''
      const firstArea = Object.keys(dataset[value]?.[firstState]?.[firstDistrict] || {})[0] || ''
      setLocation({ country: value, state: firstState, district: firstDistrict, area: firstArea })
      return
    }

    if (field === 'state') {
      if (value === OTHER_VALUE) {
        setLocation((prev) => ({ ...prev, state: OTHER_VALUE, district: OTHER_VALUE, area: OTHER_VALUE }))
        return
      }

      const firstDistrict = Object.keys(dataset[activeCountry]?.[value] || {})[0] || ''
      const firstArea = Object.keys(dataset[activeCountry]?.[value]?.[firstDistrict] || {})[0] || ''
      setLocation((prev) => ({ ...prev, state: value, district: firstDistrict, area: firstArea }))
      return
    }

    if (field === 'district') {
      if (value === OTHER_VALUE) {
        setLocation((prev) => ({ ...prev, district: OTHER_VALUE, area: OTHER_VALUE }))
        return
      }

      const firstArea = Object.keys(dataset[activeCountry]?.[activeState]?.[value] || {})[0] || ''
      setLocation((prev) => ({ ...prev, district: value, area: firstArea }))
      return
    }

    setLocation((prev) => ({ ...prev, [field]: value }))
  }

  function handleNewTimingChange(field, value) {
    setNewTiming((prev) => ({ ...prev, [field]: value }))
  }

  function buildSubmissionPayload() {
    const country = getUserValue(location.country, otherInput.country)
    const state = getUserValue(location.state, otherInput.state)
    const district = getUserValue(location.district, otherInput.district)
    const area = getUserValue(location.area, otherInput.area)

    return {
      country: newTiming.country.trim() || country,
      state: newTiming.state.trim() || state,
      district: newTiming.district.trim() || district,
      area: newTiming.area.trim() || area,
      sehri: newTiming.sehri.trim(),
      iftar: newTiming.iftar.trim(),
    }
  }

  function validateTimingPayload(payload) {
    const requiredFields = ['country', 'state', 'district', 'area', 'sehri', 'iftar']
    for (const field of requiredFields) {
      if (!payload[field]) return `${field} is required`
    }

    const timePattern = /^(\d{1,2}):(\d{2})(\s*(AM|PM))?$/i
    if (!timePattern.test(payload.sehri)) return 'Sehri time format should be HH:MM or HH:MM AM/PM'
    if (!timePattern.test(payload.iftar)) return 'Iftar time format should be HH:MM or HH:MM AM/PM'

    return ''
  }

  async function handleSubmitNewTiming(e) {
    e.preventDefault()
    setSubmitState({ loading: true, success: '', error: '' })

    const payload = buildSubmissionPayload()
    const validationError = validateTimingPayload(payload)
    if (validationError) {
      setSubmitState({ loading: false, success: '', error: validationError })
      return
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`POST failed (${response.status})`)

      setSubmitState({ loading: false, success: 'Timing submitted successfully.', error: '' })
      setNewTiming({ country: '', state: '', district: '', area: '', sehri: '', iftar: '' })
      await fetchTimings()
    } catch (error) {
      setSubmitState({
        loading: false,
        success: '',
        error: `Could not submit right now (${error.message}). Please try again.`,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-stone-100 p-4 text-slate-800 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-islamic-green dark:text-emerald-300">Ramadan Timings</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Simple and beginner-friendly Islamic design</p>
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
              <Select
                label="Country"
                value={location.country}
                options={withOther(countries)}
                onChange={(v) => onSelect('country', v)}
              />
              <Select label="State" value={location.state} options={withOther(states)} onChange={(v) => onSelect('state', v)} />
              <Select
                label="District"
                value={location.district}
                options={withOther(districts)}
                onChange={(v) => onSelect('district', v)}
              />
              <Select label="Area" value={location.area} options={withOther(areas)} onChange={(v) => onSelect('area', v)} />
            </div>

            {/* Show text input only for selected "Other" fields */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {location.country === OTHER_VALUE && (
                <Input label="New Country" value={otherInput.country} onChange={(v) => setOtherInput((p) => ({ ...p, country: v }))} />
              )}
              {location.state === OTHER_VALUE && (
                <Input label="New State" value={otherInput.state} onChange={(v) => setOtherInput((p) => ({ ...p, state: v }))} />
              )}
              {location.district === OTHER_VALUE && (
                <Input label="New District" value={otherInput.district} onChange={(v) => setOtherInput((p) => ({ ...p, district: v }))} />
              )}
              {location.area === OTHER_VALUE && (
                <Input label="New Area" value={otherInput.area} onChange={(v) => setOtherInput((p) => ({ ...p, area: v }))} />
              )}
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
            <h2 className="text-xl font-semibold text-islamic-green dark:text-emerald-300">Add New Ramadan Timing</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use this simple form to add new location timings.</p>

            <form className="mt-3 space-y-3" onSubmit={handleSubmitNewTiming}>
              <Input label="Country" value={newTiming.country} placeholder={activeCountry || 'India'} onChange={(v) => handleNewTimingChange('country', v)} />
              <Input label="State" value={newTiming.state} placeholder={activeState || 'Tamil Nadu'} onChange={(v) => handleNewTimingChange('state', v)} />
              <Input label="District" value={newTiming.district} placeholder={activeDistrict || 'Chennai'} onChange={(v) => handleNewTimingChange('district', v)} />
              <Input label="Area" value={newTiming.area} placeholder={activeArea || 'Anna Nagar'} onChange={(v) => handleNewTimingChange('area', v)} />
              <Input label="Sehri" value={newTiming.sehri} placeholder="04:47" onChange={(v) => handleNewTimingChange('sehri', v)} />
              <Input label="Iftar" value={newTiming.iftar} placeholder="18:22" onChange={(v) => handleNewTimingChange('iftar', v)} />

              <button
                type="submit"
                disabled={submitState.loading}
                className="w-full rounded-lg bg-islamic-green px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState.loading ? 'Submitting...' : 'Submit New Timing'}
              </button>
            </form>

            {submitState.success && <p className="mt-3 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{submitState.success}</p>}
            {submitState.error && <p className="mt-3 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{submitState.error}</p>}

            <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-semibold">Beginner guide:</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Select a location from dropdowns. Use Other if not listed.</li>
                <li>If you select Other, type new value in the new input field.</li>
                <li>Fill Sehri and Iftar, then click submit.</li>
              </ol>
            </div>

            <button onClick={fetchTimings} className="mt-4 w-full rounded-lg border border-islamic-green px-3 py-2 text-islamic-green dark:text-emerald-300">
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
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === OTHER_VALUE ? 'Other' : option}
          </option>
        ))}
      </select>
    </label>
  )
}

function Input({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
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
