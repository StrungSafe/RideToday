import type { ThemePref, UnitSystem } from '../lib/types'
import { Segmented } from './ui'

export const REPO_URL = 'https://github.com/StrungSafe/RideToday'

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
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          title="View source on GitHub"
          aria-label="View source on GitHub"
          className="grid h-9 w-9 place-items-center rounded-2xl bg-stone-100 text-stone-600 transition hover:text-stone-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </header>
  )
}
