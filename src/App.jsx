import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Countdown from './components/Countdown'
import LocationDropdowns, { OTHER_VALUE } from './components/LocationDropdowns'
import VolunteerForm from './components/VolunteerForm'
import { fetchTimings, postTiming } from './services/ApiService'

function todayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalizeRow(row) {
  return {
    Country: row.Country ?? row.country ?? '',
    State: row.State ?? row.state ?? '',
    District: row.District ?? row.district ?? '',
    Area: row.Area ?? row.area ?? '',
    Date: row.Date ?? row.date ?? todayDate(),
    Sehri: row.Sehri ?? row.sehri ?? '--:--',
    Iftar: row.Iftar ?? row.iftar ?? '--:--',
    LastUpdated: row.LastUpdated ?? row.lastUpdated ?? new Date().toISOString(),
  }
}

function getResolved(value, typed) {
  return value === OTHER_VALUE ? typed.trim() : value
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
      const data = await fetchTimings({ date: selectedDate })
      setRows(data.map(normalizeRow))
    } catch (err) {
      setError(err.message || 'Failed to load timings')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadRows()
    const id = setInterval(loadRows, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [loadRows])

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.Country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  )

  const currentCountry = getResolved(location.country, otherInput.country)
  const states = useMemo(
    () => [...new Set(rows.filter((r) => r.Country === currentCountry).map((r) => r.State).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows, currentCountry],
  )
  const currentState = getResolved(location.state, otherInput.state)

  const districts = useMemo(
    () => [...new Set(rows.filter((r) => r.Country === currentCountry && r.State === currentState).map((r) => r.District).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows, currentCountry, currentState],
  )
  const currentDistrict = getResolved(location.district, otherInput.district)

  const areas = useMemo(
    () => [...new Set(rows.filter((r) => r.Country === currentCountry && r.State === currentState && r.District === currentDistrict).map((r) => r.Area).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows, currentCountry, currentState, currentDistrict],
  )

  useEffect(() => {
    if (!countries.length) return
    const country = countries.includes(location.country) ? location.country : countries.find((c) => c === 'India') || countries[0]
    const st = [...new Set(rows.filter((r) => r.Country === country).map((r) => r.State).filter(Boolean))]
    const state = st.includes(location.state) ? location.state : st.find((s) => s === 'Tamil Nadu') || st[0] || ''
    const dt = [...new Set(rows.filter((r) => r.Country === country && r.State === state).map((r) => r.District).filter(Boolean))]
    const district = dt.includes(location.district) ? location.district : dt[0] || ''
    const ar = [...new Set(rows.filter((r) => r.Country === country && r.State === state && r.District === district).map((r) => r.Area).filter(Boolean))]
    const area = ar.includes(location.area) ? location.area : ar[0] || ''
    setLocation((prev) =>
      prev.country === country && prev.state === state && prev.district === district && prev.area === area
        ? prev
        : { country, state, district, area },
    )
  }, [countries, rows, location])

  const activeRow = useMemo(() => {
    const country = getResolved(location.country, otherInput.country)
    const state = getResolved(location.state, otherInput.state)
    const district = getResolved(location.district, otherInput.district)
    const area = getResolved(location.area, otherInput.area)
    return rows.find((r) => r.Date === selectedDate && r.Country === country && r.State === state && r.District === district && r.Area === area) || null
  }, [rows, location, otherInput, selectedDate])

  async function submitVolunteer(payload, editorKey) {
    setSubmitLoading(true)
    setError('')
    setToast('')
    try {
      const result = await postTiming(payload, editorKey)
      if (result.success) {
        setToast(`Success: ${result.action || 'saved'}`)
      } else {
        setToast(result.message || 'Saved as pending edit')
      }
      await loadRows()
    } catch (err) {
      setError(err.message || 'Submit failed')
    } finally {
      setSubmitLoading(false)
    }
  }

  function onSelect(field, value) {
    if (field === 'country') {
      if (value === OTHER_VALUE) {
        setLocation({ country: OTHER_VALUE, state: OTHER_VALUE, district: OTHER_VALUE, area: OTHER_VALUE })
        return
      }
      const state = states[0] || ''
      const district = districts[0] || ''
      const area = areas[0] || ''
      setLocation({ country: value, state, district, area })
      return
    }
    if (field === 'state' && value === OTHER_VALUE) {
      setLocation((p) => ({ ...p, state: OTHER_VALUE, district: OTHER_VALUE, area: OTHER_VALUE }))
      return
    }
    if (field === 'district' && value === OTHER_VALUE) {
      setLocation((p) => ({ ...p, district: OTHER_VALUE, area: OTHER_VALUE }))
      return
    }
    setLocation((p) => ({ ...p, [field]: value }))
  }

  const optionsForVolunteer = {
    countries,
    states: (sel, oth) => {
      const country = getResolved(sel.country, oth.country)
      return [...new Set(rows.filter((r) => r.Country === country).map((r) => r.State).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    },
    districts: (sel, oth) => {
      const country = getResolved(sel.country, oth.country)
      const state = getResolved(sel.state, oth.state)
      return [...new Set(rows.filter((r) => r.Country === country && r.State === state).map((r) => r.District).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    },
    areas: (sel, oth) => {
      const country = getResolved(sel.country, oth.country)
      const state = getResolved(sel.state, oth.state)
      const district = getResolved(sel.district, oth.district)
      return [...new Set(rows.filter((r) => r.Country === country && r.State === state && r.District === district).map((r) => r.Area).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    },
    byCountry: countries.reduce((acc, c) => {
      acc[c] = [...new Set(rows.filter((r) => r.Country === c).map((r) => r.State).filter(Boolean))]
      return acc
    }, {}),
    byState: rows.reduce((acc, r) => {
      acc[r.Country] = acc[r.Country] || {}
      acc[r.Country][r.State] = acc[r.Country][r.State] || []
      if (!acc[r.Country][r.State].includes(r.District)) acc[r.Country][r.State].push(r.District)
      return acc
    }, {}),
    byDistrict: rows.reduce((acc, r) => {
      acc[r.Country] = acc[r.Country] || {}
      acc[r.Country][r.State] = acc[r.Country][r.State] || {}
      acc[r.Country][r.State][r.District] = acc[r.Country][r.State][r.District] || []
      if (!acc[r.Country][r.State][r.District].includes(r.Area)) acc[r.Country][r.State][r.District].push(r.Area)
      return acc
    }, {}),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-stone-100 p-4 text-slate-800 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 sm:p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 rounded-2xl border border-emerald-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-islamic-green dark:text-emerald-300">Ramadan Timings</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Simple UI optimized for mobile, tablet, and desktop.</p>
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="rounded-lg border px-3 py-2 text-sm">
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
            <label className="mb-3 block text-sm font-medium">
              Date
              <input type="date" className="mt-1 w-full rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </label>

            <LocationDropdowns
              options={{ countries, states, districts, areas }}
              selected={location}
              otherInput={otherInput}
              onSelect={onSelect}
              onOtherChange={(field, value) => setOtherInput((p) => ({ ...p, [field]: value }))}
            />

            {loading ? <p className="mt-5">Loading timings...</p> : null}
            {error ? <p className="mt-5 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            {toast ? <p className="mt-5 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{toast}</p> : null}

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
              !loading && <p className="mt-5 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">No timing found for selected filters.</p>
            )}
          </section>

          <VolunteerForm
            options={optionsForVolunteer}
            defaults={location}
            onSubmit={submitVolunteer}
            submitting={submitLoading}
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
