import type { RideScore } from '../lib/gear'
import type { RideConditions, Settings } from '../lib/types'
import { fmtSpeed, fmtTemp, fmtTime, fmtVisibility } from '../lib/units'
import { codeIcon, codeLabel } from '../lib/wmo'
import { RideOMeter } from './RideOMeter'
import { Stat } from './ui'

const SCORE_COLOR = (s: number) =>
  s >= 85
    ? 'text-green-600 dark:text-green-500'
    : s >= 70
      ? 'text-lime-600 dark:text-lime-500'
      : s >= 50
        ? 'text-yellow-600 dark:text-yellow-500'
        : s >= 30
          ? 'text-orange-600 dark:text-orange-500'
          : 'text-red-600 dark:text-red-500'

export function ConditionsCard({ c, score, settings, placeName, departAt, rideEnd, sunset, loading }: {
  c: RideConditions
  score: RideScore
  settings: Settings
  placeName: string
  departAt: number
  rideEnd: number
  sunset: number | null
  loading: boolean
}) {
  const u = settings.units
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-stone-50 to-throttle-50 p-5 text-stone-900 shadow-xl ring-1 ring-stone-200 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 dark:text-stone-100 dark:ring-stone-700/50 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-throttle-500/15 blur-3xl dark:bg-throttle-500/25" />
      <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="flex flex-col items-center text-stone-500 dark:text-stone-300">
          <div className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-throttle-600 dark:text-throttle-400">Ride-O-Meter</div>
          <RideOMeter score={score.score} loading={loading} />
          <div className={`-mt-3 font-display text-5xl font-bold ${SCORE_COLOR(score.score)}`}>{loading ? '··' : score.score}</div>
          <div className="mt-1 text-center font-display text-xl font-semibold uppercase tracking-wide text-stone-900 dark:text-white">
            {score.verdict} <span aria-hidden>{score.emoji}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3">
            <div className="text-5xl" aria-hidden>{codeIcon(c.typicalCode, sunset == null || departAt < sunset)}</div>
            <div>
              <div className="text-sm text-stone-500 dark:text-stone-400">
                {placeName} · {fmtTime(departAt)} – {fmtTime(rideEnd)}
              </div>
              <div className="font-display text-2xl font-semibold">
                {codeLabel(c.typicalCode)}
                {c.worstCode !== c.typicalCode && (
                  <span className="text-base font-normal text-stone-500 dark:text-stone-400"> · at worst {codeLabel(c.worstCode).toLowerCase()}</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat
              icon="🌡️"
              label="Air temp"
              value={Math.round(c.minTemp) === Math.round(c.maxTemp) ? fmtTemp(c.minTemp, u) : `${fmtTemp(c.minTemp, u, false)}–${fmtTemp(c.maxTemp, u)}`}
            />
            <Stat icon="🏍️" label="Feels at speed" value={fmtTemp(c.minRideFeel, u)} sub="coldest, w/ wind chill" />
            <Stat icon="☔" label="Rain chance" value={`${Math.round(c.maxPrecipProb)}%`} />
            <Stat icon="💨" label="Gusts" value={fmtSpeed(c.maxGust, u)} sub={`wind ${fmtSpeed(c.maxWind, u)}`} />
            <Stat icon="👁️" label="Visibility" value={c.minVisibility >= 10000 ? 'Great' : fmtVisibility(c.minVisibility, u)} />
            <Stat icon="🌇" label="Sunset" value={sunset ? fmtTime(sunset) : '—'} sub={`UV max ${Math.round(c.maxUV)}`} />
          </div>
        </div>
      </div>
    </section>
  )
}
