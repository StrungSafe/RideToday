import type { Place, Settings } from '../lib/types'
import { KM_PER_MILE, fmtDistance, fmtDuration, fmtTime } from '../lib/units'
import { PlaceSearch } from './PlaceSearch'
import { Card, Segmented, Slider } from './ui'

export function RideSetup({ settings: s, update, origin, onOrigin, onLocate, locating, destination, onDestination }: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  origin: Place | null
  onOrigin: (p: Place) => void
  onLocate: () => void
  locating: boolean
  destination: Place | null
  onDestination: (p: Place | null) => void
}) {
  const imperial = s.units === 'imperial'
  const radiusDisplay = imperial ? Math.round(s.radiusKm / KM_PER_MILE) : Math.round(s.radiusKm)
  const departLabel =
    s.departInMinutes === 0
      ? 'Now'
      : `${fmtDuration(s.departInMinutes / 60)} · ${fmtTime(Date.now() / 1000 + s.departInMinutes * 60)}`

  return (
    <Card title="Your Ride" icon="🗺️">
      <div className="space-y-5">
        {/* Start */}
        <div>
          <div className="mb-1.5 text-sm font-medium text-stone-600 dark:text-stone-300">Starting from</div>
          <div className="mb-2 flex items-center gap-2">
            <div className="min-w-0 flex-1 truncate rounded-2xl bg-throttle-50 px-3 py-2 text-sm font-semibold text-throttle-700 dark:bg-throttle-500/15 dark:text-throttle-300">
              📍 {origin ? origin.name : 'No location yet'}
            </div>
            <button
              type="button"
              onClick={onLocate}
              disabled={locating}
              title="Use my current location"
              className="shrink-0 rounded-2xl bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              {locating ? '…' : '🎯 Locate'}
            </button>
          </div>
          <PlaceSearch placeholder="Search a city or town…" onPick={onOrigin} />
        </div>

        <Segmented
          label="Ride type"
          value={s.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: 'radius', label: '⭕ Riding radius' },
            { value: 'route', label: '🛣️ A to B route' },
          ]}
        />

        {s.mode === 'radius' ? (
          <>
            <Slider
              label="Riding radius"
              min={0}
              max={imperial ? 150 : 250}
              step={imperial ? 5 : 10}
              value={radiusDisplay}
              onChange={(v) => update({ radiusKm: imperial ? v * KM_PER_MILE : v })}
              display={s.radiusKm < 1 ? 'Just around town' : fmtDistance(s.radiusKm, s.units)}
            />
            <Slider
              label="Time in the saddle"
              min={0.5}
              max={10}
              step={0.5}
              value={s.durationHours}
              onChange={(durationHours) => update({ durationHours })}
              display={fmtDuration(s.durationHours)}
            />
          </>
        ) : (
          <div>
            <div className="mb-1.5 text-sm font-medium text-stone-600 dark:text-stone-300">Destination</div>
            {destination && (
              <div className="mb-2 flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate rounded-2xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                  🏁 {destination.name}
                </div>
                <button
                  type="button"
                  onClick={() => onDestination(null)}
                  aria-label="Clear destination"
                  className="rounded-2xl px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  ✕
                </button>
              </div>
            )}
            <PlaceSearch placeholder="Where are you headed?" onPick={onDestination} />
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
              <input
                type="checkbox"
                checked={s.roundTrip}
                onChange={(e) => update({ roundTrip: e.target.checked })}
                className="h-4 w-4 accent-throttle-500"
              />
              Round trip (ride back the same way)
            </label>
          </div>
        )}

        <Slider
          label="Kickstands up"
          min={0}
          max={24 * 60}
          step={30}
          value={s.departInMinutes}
          onChange={(departInMinutes) => update({ departInMinutes })}
          display={departLabel}
        />

        <div>
          <div className="mb-1.5 text-sm font-medium text-stone-600 dark:text-stone-300">Mostly riding…</div>
          <Segmented
            label="Typical speed"
            value={s.speed}
            onChange={(speed) => update({ speed })}
            options={[
              { value: 'city', label: '🏙️ City', title: '~30 mph / 50 km/h' },
              { value: 'mixed', label: '🛤️ Backroads', title: '~45 mph / 75 km/h' },
              { value: 'highway', label: '🛣️ Highway', title: '~65 mph / 105 km/h' },
            ]}
          />
          <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">Used to work out wind chill at speed.</p>
        </div>
      </div>
    </Card>
  )
}
