import React, { useMemo, useState } from 'react'
import LocationDropdowns, { OTHER_VALUE } from './LocationDropdowns'

// Volunteer add/edit form (no login) with validation and optional editor key.
// Uses dropdown values + "Other" support and submits through onSubmit(payload, editorKey).

const TIME_RE = /^\d{1,2}:\d{2}(?:\s?[APMapm]{2})?$/

function todayDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getFinal(value, otherValue) {
  return value === OTHER_VALUE ? otherValue.trim() : value
}

export default function VolunteerForm({ options, defaults, onSubmit, submitting }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(defaults)
  const [otherInput, setOtherInput] = useState({ country: '', state: '', district: '', area: '' })
  const [form, setForm] = useState({ date: todayDate(), sehri: '', iftar: '', editorKey: '', action: 'add' })
  const [error, setError] = useState('')

  const derived = useMemo(() => {
    const country = getFinal(selected.country, otherInput.country)
    const state = getFinal(selected.state, otherInput.state)
    const district = getFinal(selected.district, otherInput.district)
    const area = getFinal(selected.area, otherInput.area)
    return { country, state, district, area }
  }, [selected, otherInput])

  function handleSelect(field, value) {
    setError('')
    if (field === 'country') {
      if (value === OTHER_VALUE) {
        setSelected({ country: OTHER_VALUE, state: OTHER_VALUE, district: OTHER_VALUE, area: OTHER_VALUE })
        return
      }
      const state = options.byCountry[value]?.[0] || ''
      const district = options.byState[value]?.[state]?.[0] || ''
      const area = options.byDistrict[value]?.[state]?.[district]?.[0] || ''
      setSelected({ country: value, state, district, area })
      return
    }

    if (field === 'state') {
      if (value === OTHER_VALUE) {
        setSelected((p) => ({ ...p, state: OTHER_VALUE, district: OTHER_VALUE, area: OTHER_VALUE }))
        return
      }
      const country = getFinal(selected.country, otherInput.country)
      const district = options.byState[country]?.[value]?.[0] || ''
      const area = options.byDistrict[country]?.[value]?.[district]?.[0] || ''
      setSelected((p) => ({ ...p, state: value, district, area }))
      return
    }

    if (field === 'district') {
      if (value === OTHER_VALUE) {
        setSelected((p) => ({ ...p, district: OTHER_VALUE, area: OTHER_VALUE }))
        return
      }
      const country = getFinal(selected.country, otherInput.country)
      const state = getFinal(selected.state, otherInput.state)
      const area = options.byDistrict[country]?.[state]?.[value]?.[0] || ''
      setSelected((p) => ({ ...p, district: value, area }))
      return
    }

    setSelected((p) => ({ ...p, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    const payload = {
      action: form.action,
      Country: derived.country,
      State: derived.state,
      District: derived.district,
      Area: derived.area,
      Date: form.date,
      Sehri: form.sehri.trim(),
      Iftar: form.iftar.trim(),
    }

    const required = ['Country', 'State', 'District', 'Area', 'Date', 'Sehri', 'Iftar']
    for (const key of required) {
      if (!payload[key]) {
        setError(`${key} is required`)
        return
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.Date)) {
      setError('Date must be yyyy-MM-dd')
      return
    }
    if (!TIME_RE.test(payload.Sehri) || !TIME_RE.test(payload.Iftar)) {
      setError('Time must be HH:mm or hh:mm AM/PM')
      return
    }

    await onSubmit(payload, form.editorKey)
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <button className="w-full rounded-lg bg-islamic-green px-3 py-2 text-white" onClick={() => setOpen((p) => !p)}>
        Volunteer: Add / Edit Timing
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <LocationDropdowns
            options={{ countries: options.countries, states: options.states(selected, otherInput), districts: options.districts(selected, otherInput), areas: options.areas(selected, otherInput) }}
            selected={selected}
            otherInput={otherInput}
            onSelect={handleSelect}
            onOtherChange={(field, value) => setOtherInput((p) => ({ ...p, [field]: value }))}
          />

          <label className="block text-sm font-medium">
            Action
            <select
              value={form.action}
              onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="add">Add</option>
              <option value="update">Update</option>
            </select>
          </label>

          <Field label="Date" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
          <Field label="Sehri" value={form.sehri} onChange={(v) => setForm((p) => ({ ...p, sehri: v }))} placeholder="05:10" />
          <Field label="Iftar" value={form.iftar} onChange={(v) => setForm((p) => ({ ...p, iftar: v }))} placeholder="18:20" />
          <Field
            label="Editor Key (optional)"
            value={form.editorKey}
            onChange={(v) => setForm((p) => ({ ...p, editorKey: v }))}
            placeholder="Only admins should enter this"
          />

          {error && <p className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-lg border border-islamic-green px-3 py-2 text-islamic-green disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      )}
    </section>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  )
}
