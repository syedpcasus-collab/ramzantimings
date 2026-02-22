import React from 'react'

// Reusable hierarchical dropdowns with placeholder + Other fallback.
// Keeps keyboard accessibility and mobile-friendly targets.

export const OTHER_VALUE = '__OTHER__'

const PLACEHOLDER = {
  country: 'Select country',
  state: 'Select state',
  district: 'Select district',
  area: 'Select area',
}

function SelectField({ name, label, value, options, onChange, disabled, ariaLabel }) {
  return (
    <label className="text-sm font-medium" htmlFor={`select-${name}`}>
      {label}
      <select
        id={`select-${name}`}
        aria-label={ariaLabel}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
      >
        <option value="">{PLACEHOLDER[name]}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other (type manually)</option>
      </select>
    </label>
  )
}

function OtherInput({ name, value, onChange }) {
  const label = `Enter ${name}`
  return (
    <label className="text-sm font-medium" htmlFor={`other-${name}`}>
      {label}
      <input
        id={`other-${name}`}
        aria-label={label}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </label>
  )
}

export default function LocationDropdowns({
  options,
  selected,
  otherInput,
  onSelect,
  onOtherChange,
  showEmptyHint = false,
}) {
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          name="country"
          label="Country"
          value={selected.country}
          options={options.countries}
          onChange={onSelect}
          ariaLabel="Country dropdown"
        />
        <SelectField
          name="state"
          label="State"
          value={selected.state}
          options={options.states}
          onChange={onSelect}
          disabled={!selected.country && selected.country !== OTHER_VALUE}
          ariaLabel="State dropdown"
        />
        <SelectField
          name="district"
          label="District"
          value={selected.district}
          options={options.districts}
          onChange={onSelect}
          disabled={!selected.state && selected.state !== OTHER_VALUE}
          ariaLabel="District dropdown"
        />
        <SelectField
          name="area"
          label="Area"
          value={selected.area}
          options={options.areas}
          onChange={onSelect}
          disabled={!selected.district && selected.district !== OTHER_VALUE}
          ariaLabel="Area dropdown"
        />
      </div>

      {showEmptyHint && (
        <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
          No saved locations found — please type your location below.
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {selected.country === OTHER_VALUE && <OtherInput name="country" value={otherInput.country} onChange={onOtherChange} />}
        {selected.state === OTHER_VALUE && <OtherInput name="state" value={otherInput.state} onChange={onOtherChange} />}
        {selected.district === OTHER_VALUE && <OtherInput name="district" value={otherInput.district} onChange={onOtherChange} />}
        {selected.area === OTHER_VALUE && <OtherInput name="area" value={otherInput.area} onChange={onOtherChange} />}
      </div>
    </div>
  )
}
