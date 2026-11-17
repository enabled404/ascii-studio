// Reusable control primitives + tuning / effects panels. Original UI code.

import type { ReactNode } from 'react'

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <label className="ctl">
      <span className="ctl-label">
        {props.label}
        <b>{props.format ? props.format(props.value) : props.value}</b>
      </span>
      <input
        type="range"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function Select(props: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="ctl">
      <span className="ctl-label">{props.label}</span>
      <select aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.label}
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span className="toggle-track" />
      <span className="toggle-label">
        {props.label}
        {props.hint && <small>{props.hint}</small>}
      </span>
    </label>
  )
}

export function ColorInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="ctl">
      <span className="ctl-label">{props.label}</span>
      <span className="color-row">
        <input type="color" aria-label={props.label} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
        <code>{props.value}</code>
      </span>
    </label>
  )
}

export function Section(props: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel-section">
      <div className="panel-section-head">
        <h3>{props.title}</h3>
        {props.action}
      </div>
      {props.children}
    </section>
  )
}
