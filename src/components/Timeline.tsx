import type { HourSample, RideSampleWeather, Settings } from '../lib/types'
import { SPEED_KMH, fmtDistance, fmtHour, fmtSpeed, fmtTemp, fmtTime } from '../lib/units'
import { rideFeel } from '../lib/weather'
import { codeIcon, codeLabel } from '../lib/wmo'
import { Card } from './ui'

const rainBar = (p: number) => (p >= 60 ? 'bg-sky-500' : p >= 30 ? 'bg-sky-400' : 'bg-sky-300')

/** Hour-by-hour forecast at the start point, with the ride window highlighted. */
export function HourlyTimeline({ hours, departAt, rideEnd, settings }: {
  hours: HourSample[]
  departAt: number
  rideEnd: number
  settings: Settings
}) {
  const speed = SPEED_KMH[settings.speed]
  return (
    <Card title="Hour by Hour" icon="⏱️">
      <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {hours.map((h) => {
          const inRide = h.time + 3600 > departAt && h.time <= rideEnd
          return (
            <div
              key={h.time}
              title={codeLabel(h.code)}
              className={`flex w-20 shrink-0 snap-start flex-col items-center rounded-2xl border p-2 text-center ${
                inRide
                  ? 'border-throttle-400 bg-throttle-50 dark:border-throttle-500/60 dark:bg-throttle-500/10'
                  : 'border-stone-200 opacity-70 dark:border-stone-800'
              }`}
            >
              <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">{fmtHour(h.time)}</div>
              <div className="my-1 text-2xl" aria-hidden>{codeIcon(h.code, h.isDay)}</div>
              <div className="font-display text-lg font-semibold">{fmtTemp(h.temp, settings.units, false)}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">🏍️ {fmtTemp(rideFeel(h, speed), settings.units, false)}</div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                <div className={`h-full ${rainBar(h.precipProb)}`} style={{ width: `${h.precipProb}%` }} />
              </div>
              <div className="mt-0.5 text-[10px] text-sky-600 dark:text-sky-400">{Math.round(h.precipProb)}%</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">💨 {fmtSpeed(h.gusts, settings.units)}</div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        Highlighted hours are your ride. 🏍️ = feels-like at {fmtSpeed(speed, settings.units)} with wind chill.
      </p>
    </Card>
  )
}

/** Weather at each checkpoint along a route, at the time you'd reach it. */
export function RouteTimeline({ samples, settings }: { samples: RideSampleWeather[]; settings: Settings }) {
  const speed = SPEED_KMH[settings.speed]
  return (
    <Card title="Along the Route" icon="🛣️">
      <ol className="relative space-y-2 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-1 before:rounded-full before:bg-stone-200 dark:before:bg-stone-700">
        {samples.map((s, i) => {
          const eta = (s.from + s.to) / 2
          // Forecast hour closest to when we get here.
          const h = s.hours.reduce<HourSample | undefined>(
            (best, x) => (!best || Math.abs(x.time - eta) < Math.abs(best.time - eta) ? x : best),
            undefined,
          )
          if (!h) return null
          const first = i === 0
          const turnaround = s.leg === 'back' && samples[i - 1]?.leg === 'out'
          return (
            <li key={i} className="relative flex items-center gap-3">
              <div
                className={`z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-4 border-white text-lg dark:border-stone-900 ${
                  first ? 'bg-throttle-500' : s.label === 'Destination' ? 'bg-sky-500' : 'bg-stone-200 dark:bg-stone-700'
                }`}
                aria-hidden
              >
                {first ? '🏍️' : s.label === 'Destination' ? '🏁' : s.leg === 'back' && s.label === 'Home' ? '🏠' : codeIcon(h.code, h.isDay)}
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl bg-stone-100 px-3 py-2 dark:bg-stone-800/70">
                <div>
                  <div className="text-sm font-semibold">
                    {turnaround && <span className="mr-1 text-xs text-sky-500">↩ return</span>}
                    {fmtTime(eta)}
                    <span className="ml-2 text-xs font-normal text-stone-500 dark:text-stone-400">
                      {s.distKm != null && s.distKm > 0 ? fmtDistance(s.distKm, settings.units) : 'start'}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">{codeLabel(h.code)}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-display text-lg font-semibold">{fmtTemp(h.temp, settings.units)}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">🏍️ {fmtTemp(rideFeel(h, speed), settings.units, false)}</span>
                  <span className="text-xs text-sky-600 dark:text-sky-400">☔ {Math.round(h.precipProb)}%</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">💨 {fmtSpeed(h.gusts, settings.units)}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
