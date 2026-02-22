import React, { useEffect, useMemo, useState } from 'react'
import LocationDropdowns, { OTHER_VALUE } from './LocationDropdowns'

const TIME_RE = /^\d{1,2}:\d{2}(?:\s?[APMapm]{2})?$/

function todayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function resolveValue(value, otherValue) {
  return value === OTHER_VALUE ? otherValue : value
}

export default function VolunteerForm({ options, defaults, onSubmit, submitting, emptyLocations }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(defaults)
  const [otherInput, setOtherInput] = useState({ country: '', state: '', district: '', area: '' })
  const [form, setForm] = useState({ date: todayDate(), sehri: '', iftar: '', editorKey: '', action: 'add' })
  const [error, setError] = useState('')
  useEffect(() => {
    setSelected(defaults)
  }, [defaults])


  const locationValues = useMemo(() => {
    return {
      country: resolveValue(selected.country, otherInput.country),
      state: resolveValue(selected.state, otherInput.state),
      district: resolveValue(selected.district, otherInput.district),
      area: resolveValue(selected.area, otherInput.area),
    }
  }, [selected, otherInput])

  function onSelect(field, value) {
    setError('')
    if (field === 'country') {
      setSelected({ country: value, state: '', district: '', area: '' })
      return
    }
    if (field === 'state') {
      setSelected((prev) => ({ ...prev, state: value, district: '', area: '' }))
      return
    }
    if (field === 'district') {
      setSelected((prev) => ({ ...prev, district: value, area: '' }))
      return
    }
    setSelected((prev) => ({ ...prev, [field]: value }))
  }

  async function submitForm(e) {
    e.preventDefault()
    setError('')

    const payload = {
      action: form.action,
      Country: locationValues.country,
      State: locationValues.state,
      District: locationValues.district,
      Area: locationValues.area,
      Date: form.date,
      Sehri: form.sehri,
      Iftar: form.iftar,
    }

    const required = ['Country', 'State', 'District', 'Area', 'Date', 'Sehri', 'Iftar']
    for (const key of required) {
      if (!String(payload[key] || '').trim()) {
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
      <button className="w-full rounded-lg bg-islamic-green px-3 py-2 text-white" onClick={() => setOpen((v) => !v)}>
        Volunteer: Add / Edit Timing
      </button>

      {open && (
        <form className="mt-4 space-y-3" onSubmit={submitForm}>
          <LocationDropdowns
            options={options}
            selected={selected}
            otherInput={otherInput}
            onSelect={onSelect}
            onOtherChange={(field, value) => setOtherInput((prev) => ({ ...prev, [field]: value }))}
            showEmptyHint={emptyLocations}
          />

          <Field label="Action" as="select" value={form.action} onChange={(v) => setForm((p) => ({ ...p, action: v }))}>
            <option value="add">Add</option>
            <option value="update">Update</option>
          </Field>
          <Field label="Date" type="date" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} />
          <Field label="Sehri" value={form.sehri} onChange={(v) => setForm((p) => ({ ...p, sehri: v }))} placeholder="05:10" />
          <Field label="Iftar" value={form.iftar} onChange={(v) => setForm((p) => ({ ...p, iftar: v }))} placeholder="18:20" />
          <Field
            label="Editor key (optional)"
            value={form.editorKey}
            onChange={(v) => setForm((p) => ({ ...p, editorKey: v }))}
            placeholder="Only admins should enter this"
          />

          {error && <p className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full rounded-lg border border-islamic-green px-3 py-2 text-islamic-green disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      )}
    </section>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text', as = 'input', children }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {as === 'select' ? (
        <select
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  )
}
