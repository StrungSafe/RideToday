import type { ThemePref, UnitSystem } from '../lib/types'
import { Segmented } from './ui'

export function Header({ theme, onTheme, units, onUnits }: {
  theme: ThemePref
  onTheme: (t: ThemePref) => void
  units: UnitSystem
  onUnits: (u: UnitSystem) => void
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-throttle-500 text-2xl shadow-lg shadow-throttle-500/30">
          <span aria-hidden>🏍️</span>
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-wide">
            Ride<span className="text-throttle-500">Today</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">Weather check + gear call for riders</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Segmented
          label="Units"
          size="sm"
          value={units}
          onChange={onUnits}
          options={[
            { value: 'imperial', label: '°F', title: 'Imperial (°F, mph, mi)' },
            { value: 'metric', label: '°C', title: 'Metric (°C, km/h, km)' },
          ]}
        />
        <Segmented
          label="Color theme"
          size="sm"
          value={theme}
          onChange={onTheme}
          options={[
            { value: 'light', label: '☀️', title: 'Light mode' },
            { value: 'system', label: '🖥️', title: 'Match system' },
            { value: 'dark', label: '🌙', title: 'Dark mode' },
          ]}
        />
      </div>
    </header>
  )
}
