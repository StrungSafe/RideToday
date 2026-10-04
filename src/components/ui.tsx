import type { ReactNode } from 'react'

export function Card({ title, icon, action, children, className = '' }: {
  title?: string
  icon?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-stone-800 dark:bg-stone-900/80 ${className}`}
    >
      {title && (
        <header className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-stone-700 dark:text-stone-200">
            {icon && <span aria-hidden>{icon}</span>}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-2xl bg-stone-100 p-1 dark:bg-stone-800"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl font-medium transition-all ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'} ${
              active
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-600 dark:text-white'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Slider({ label, value, min, max, step, onChange, display }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-stone-600 dark:text-stone-300">{label}</span>
        <span className="font-display text-base font-semibold text-throttle-600 dark:text-throttle-400">{display}</span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

/** Small stat tile. `onDark` styles it for the always-dark dashboard card. */
export function Stat({ icon, label, value, sub, onDark }: {
  icon: string
  label: string
  value: ReactNode
  sub?: ReactNode
  onDark?: boolean
}) {
  const muted = onDark ? 'text-stone-400' : 'text-stone-500 dark:text-stone-400'
  return (
    <div className={`rounded-2xl px-3 py-2.5 ${onDark ? 'bg-white/5 text-white' : 'bg-stone-100 dark:bg-stone-800/70'}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${muted}`}>
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className="mt-0.5 font-display text-xl font-semibold">{value}</div>
      {sub && <div className={`text-xs ${muted}`}>{sub}</div>}
    </div>
  )
}
