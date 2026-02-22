import React from 'react'

// Location dropdown chain with "Other" support.
// Usage:
// <LocationDropdowns ... /> and provide options, selected values, and handlers.

export const OTHER_VALUE = '__OTHER__'

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

function Input({ label, value, onChange }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Type ${label.toLowerCase()}`}
      />
    </label>
  )
}

export default function LocationDropdowns({ options, selected, otherInput, onSelect, onOtherChange }) {
  const withOther = (list) => [...list, OTHER_VALUE]

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Country" value={selected.country} options={withOther(options.countries)} onChange={(v) => onSelect('country', v)} />
        <Select label="State" value={selected.state} options={withOther(options.states)} onChange={(v) => onSelect('state', v)} />
        <Select
          label="District"
          value={selected.district}
          options={withOther(options.districts)}
          onChange={(v) => onSelect('district', v)}
        />
        <Select label="Area" value={selected.area} options={withOther(options.areas)} onChange={(v) => onSelect('area', v)} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {selected.country === OTHER_VALUE && (
          <Input label="New Country" value={otherInput.country} onChange={(v) => onOtherChange('country', v)} />
        )}
        {selected.state === OTHER_VALUE && <Input label="New State" value={otherInput.state} onChange={(v) => onOtherChange('state', v)} />}
        {selected.district === OTHER_VALUE && (
          <Input label="New District" value={otherInput.district} onChange={(v) => onOtherChange('district', v)} />
        )}
        {selected.area === OTHER_VALUE && <Input label="New Area" value={otherInput.area} onChange={(v) => onOtherChange('area', v)} />}
      </div>
    </div>
  )
}
