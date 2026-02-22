import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Countdown from './components/Countdown'
import LocationDropdowns, { OTHER_VALUE } from './components/LocationDropdowns'
import VolunteerForm from './components/VolunteerForm'
import { fetchTimings, fetchUniqueValues, postTiming } from './services/ApiService'

function todayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalizeRow(row) {
  return {
    Country: String(row.Country ?? row.country ?? '').trim(),
    State: String(row.State ?? row.state ?? '').trim(),
    District: String(row.District ?? row.district ?? '').trim(),
    Area: String(row.Area ?? row.area ?? '').trim(),
    Date: String(row.Date ?? row.date ?? todayDate()).trim(),
    Sehri: String(row.Sehri ?? row.sehri ?? '--:--').trim(),
    Iftar: String(row.Iftar ?? row.iftar ?? '--:--').trim(),
    LastUpdated: String(row.LastUpdated ?? row.lastUpdated ?? new Date().toISOString()).trim(),
  }
}

function resolve(value, otherValue) {
  return value === OTHER_VALUE ? otherValue : value
}

export default function App() {
  const [rows, setRows] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayDate())
  const [location, setLocation] = useState({ country: '', state: '', district: '', area: '' })
  const [otherInput, setOtherInput] = useState({ country: '', state: '', district: '', area: '' })
  const [theme, setTheme] = useState(localStorage.getItem('ramadanTheme') || 'light')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('ramadanTheme', theme)
  }, [theme])

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const raw = await fetchTimings({ date: selectedDate })
      setRows(raw.map(normalizeRow))
    } catch (err) {
      setRows([])
      setError(err.message || 'Failed to load timings')
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadRows()
    const id = setInterval(loadRows, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadRows])

  const countryValue = resolve(location.country, otherInput.country).trim()
  const stateValue = resolve(location.state, otherInput.state).trim()
  const districtValue = resolve(location.district, otherInput.district).trim()
  const areaValue = resolve(location.area, otherInput.area).trim()

  // Hierarchical, unique, alphabetical options.
  const countries = useMemo(() => fetchUniqueValues(rows, 'Country'), [rows])
  const states = useMemo(
    () => fetchUniqueValues(rows, 'State', (r) => r.Country === countryValue),
    [rows, countryValue],
  )
  const districts = useMemo(
    () => fetchUniqueValues(rows, 'District', (r) => r.Country === countryValue && r.State === stateValue),
    [rows, countryValue, stateValue],
  )
  const areas = useMemo(
    () =>
      fetchUniqueValues(
        rows,
        'Area',
        (r) => r.Country === countryValue && r.State === stateValue && r.District === districtValue,
      ),
    [rows, countryValue, stateValue, districtValue],
  )

  // Keep user on placeholders by default; never force-select Other.
  useEffect(() => {
    if (location.country && location.country !== OTHER_VALUE && !countries.includes(location.country)) {
      setLocation({ country: '', state: '', district: '', area: '' })
      return
    }

    if (location.state && location.state !== OTHER_VALUE && !states.includes(location.state)) {
      setLocation((prev) => ({ ...prev, state: '', district: '', area: '' }))
      return
    }

    if (location.district && location.district !== OTHER_VALUE && !districts.includes(location.district)) {
      setLocation((prev) => ({ ...prev, district: '', area: '' }))
      return
    }

    if (location.area && location.area !== OTHER_VALUE && !areas.includes(location.area)) {
      setLocation((prev) => ({ ...prev, area: '' }))
    }
  }, [countries, states, districts, areas, location])

  const activeRow = useMemo(() => {
    return (
      rows.find(
        (row) =>
          row.Date === selectedDate &&
          row.Country === countryValue &&
          row.State === stateValue &&
          row.District === districtValue &&
          row.Area === areaValue,
      ) || null
    )
  }, [rows, selectedDate, countryValue, stateValue, districtValue, areaValue])

  const noSavedLocations = !loading && countries.length === 0

  function onSelect(field, value) {
    setToast('')
    if (field === 'country') {
      setLocation({ country: value, state: '', district: '', area: '' })
      return
    }
    if (field === 'state') {
      setLocation((prev) => ({ ...prev, state: value, district: '', area: '' }))
      return
    }
    if (field === 'district') {
      setLocation((prev) => ({ ...prev, district: value, area: '' }))
      return
    }
    setLocation((prev) => ({ ...prev, area: value }))
  }

  async function submitVolunteer(payload, editorKey) {
    setSubmitLoading(true)
    setError('')
    setToast('')
    try {
      const result = await postTiming(payload, editorKey)
      setToast(result.success ? `Success: ${result.action || 'saved'}` : result.message || 'Saved as pending')
      await loadRows()
    } catch (err) {
      setError(err.message || 'Submit failed')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-stone-100 p-4 text-slate-800 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-islamic-green dark:text-emerald-300">Ramadan Timings</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Choose location from saved names, or type manually if missing.</p>
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="min-h-11 rounded-lg border px-3 py-2 text-sm">
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <label className="mb-3 block text-sm font-medium" htmlFor="date-filter">
              Date
              <input
                id="date-filter"
                type="date"
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>

            <LocationDropdowns
              options={{ countries, states, districts, areas }}
              selected={location}
              otherInput={otherInput}
              onSelect={onSelect}
              onOtherChange={(field, value) => setOtherInput((prev) => ({ ...prev, [field]: value }))}
              showEmptyHint={noSavedLocations}
            />

            {loading && <p className="mt-5">Loading timings...</p>}
            {error && <p className="mt-5 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {toast && <p className="mt-5 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{toast}</p>}

            {activeRow ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Card title="Sehri (Suhoor)">
                    <p className="text-3xl font-semibold text-islamic-green dark:text-emerald-300">{activeRow.Sehri}</p>
                  </Card>
                  <Card title="Iftar">
                    <p className="text-3xl font-semibold text-islamic-gold">{activeRow.Iftar}</p>
                  </Card>
                </div>

                <Card title="Countdown to Next Iftar" extraClass="mt-4">
                  <Countdown date={activeRow.Date} iftar={activeRow.Iftar} />
                </Card>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Last updated timestamp: {activeRow.LastUpdated}</p>
              </>
            ) : (
              !loading &&
              !error &&
              (countryValue || stateValue || districtValue || areaValue) && (
                <p className="mt-5 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">No timing found for selected filters.</p>
              )
            )}
          </section>

          <VolunteerForm
            options={{ countries, states, districts, areas }}
            defaults={location}
            onSubmit={submitVolunteer}
            submitting={submitLoading}
            emptyLocations={noSavedLocations}
          />
        </main>
      </div>
    </div>
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
