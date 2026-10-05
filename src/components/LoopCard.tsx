import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildGpx, downloadText, GOOGLE_MAX_WAYPOINTS, googleMapsLoopUrl, googleMapsPlaceUrl } from '../lib/export'
import type { LoopRoute } from '../lib/loop'
import { rankStops, STOP_META, type Stop } from '../lib/stops'
import type { LatLon, RideSampleWeather, Settings, StopKind } from '../lib/types'
import { fmtDistance, fmtDuration } from '../lib/units'
import { RideMapView } from './RideMap'
import { SaveRouteForm } from './SaveRouteForm'
import { Card } from './ui'

const KINDS: StopKind[] = ['gas', 'food', 'bar']
const PER_KIND = 3

function funLabel(r: number) {
  if (r >= 9) return ['Dragon-level', '🐉']
  if (r >= 7) return ['Very twisty', '🌀']
  if (r >= 5) return ['Twisty', '〰️']
  if (r >= 3) return ['Some sweepers', '↪️']
  return ['Mostly straight', '🌾']
}

function kindHint(kind: StopKind, routeKm: number) {
  if (kind === 'gas') return routeKm > 150 ? 'best around halfway' : 'top off early'
  if (kind === 'food') return 'around halfway'
  return 'near the finish'
}

export interface LoopCardProps {
  origin: LatLon
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  loop: LoopRoute | null
  index: number
  total: number
  progress: { done: number; total: number }
  onShuffle: () => void
  samples: RideSampleWeather[]
  settings: Settings
  update: (patch: Partial<Settings>) => void
  stops: { status: 'idle' | 'loading' | 'ready' | 'error'; stops: Stop[]; retry: () => void }
  /** Set when showing a route from the rider's library. */
  saved: { name: string; stops: Stop[] } | null
  /** Name of the library entry this planned loop was saved as, if any. */
  savedAs: string | null
  defaultSaveName: string
  onSave: (name: string, makeHome: boolean, picked: Stop[]) => string | null
}

export function LoopCard(p: LoopCardProps) {
  const { loop, settings: s } = p
  const u = s.units
  const savedStops = p.saved?.stops

  const ranked = useMemo(() => {
    const out = {} as Record<StopKind, Stop[]>
    for (const k of KINDS) {
      const best = loop ? rankStops(p.stops.stops, k, loop.distanceKm) : []
      // A saved route's chosen stops always stay in the list.
      const pinned = (savedStops ?? []).filter((st) => st.kind === k)
      const pinnedIds = new Set(pinned.map((st) => st.id))
      out[k] = [...pinned, ...best.filter((st) => !pinnedIds.has(st.id))].slice(0, Math.max(PER_KIND, pinned.length))
    }
    return out
  }, [p.stops.stops, loop, savedStops])

  // Saved routes restore their stops; otherwise the top pick of each kind is added by default.
  const [picked, setPicked] = useState<Set<string>>(new Set())
  useEffect(() => {
    setPicked(
      new Set(savedStops?.length ? savedStops.map((st) => st.id) : KINDS.map((k) => ranked[k][0]?.id).filter((id): id is string => !!id)),
    )
  }, [ranked, savedStops])

  const visibleStops = KINDS.filter((k) => s.stopKinds.includes(k)).flatMap((k) => ranked[k])
  const pickedStops = visibleStops.filter((st) => picked.has(st.id))

  const toggleKind = (k: StopKind) =>
    p.update({ stopKinds: s.stopKinds.includes(k) ? s.stopKinds.filter((x) => x !== k) : [...s.stopKinds, k] })
  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exportPoints = loop
    ? [
        ...loop.vias.map((v, i) => ({ ...v, name: `Via ${i + 1}` })),
        ...pickedStops.map((st) => ({ lat: st.lat, lon: st.lon, frac: st.frac, name: `${STOP_META[st.kind].icon} ${st.name}` })),
      ]
    : []

  const downloadGpx = () => {
    if (!loop) return
    const date = new Date().toISOString().slice(0, 10)
    const gpx = buildGpx(
      `RideToday loop · ${fmtDistance(loop.distanceKm, u)}`,
      loop.line,
      pickedStops.map((st) => ({ ...st, name: `${STOP_META[st.kind].label}: ${st.name}` })),
    )
    downloadText(`ridetoday-loop-${date}.gpx`, gpx)
  }

  return (
    <Card
      title="Today’s Loop"
      icon="🎲"
      action={
        <button
          type="button"
          onClick={p.onShuffle}
          disabled={p.status === 'loading'}
          className="group flex items-center gap-1.5 rounded-full bg-throttle-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-throttle-600 disabled:opacity-60"
        >
          <span aria-hidden className="inline-block transition group-hover:rotate-180">🎲</span>
          {p.saved ? 'Plan a new route' : 'Another route'}
          {!p.saved && p.status === 'ready' && p.total > 1 && (
            <span className="rounded-full bg-white/25 px-1.5 text-[11px]">
              {p.index + 1}/{p.total}
            </span>
          )}
        </button>
      }
    >
      {p.status === 'loading' && (
        <div className="py-10 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-8 border-stone-800 border-t-throttle-500 dark:border-stone-600 dark:border-t-throttle-500" aria-hidden />
          <p className="mt-4 font-display text-lg uppercase tracking-wide text-stone-600 dark:text-stone-300">Hunting for twisties…</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Trying route {Math.min(p.progress.done + 1, p.progress.total || 3)} of {p.progress.total || 3}
          </p>
        </div>
      )}

      {p.status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 py-4">
          <span className="text-3xl" aria-hidden>🚧</span>
          <div className="flex-1">
            <div className="font-semibold">Couldn’t plan a loop</div>
            <div className="text-sm text-stone-500 dark:text-stone-400">{p.error}</div>
          </div>
        </div>
      )}

      {p.status === 'ready' && loop && (
        <div className="space-y-4">
          {/* Fun rating + stats */}
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <FunBadge rating={loop.funRating} />
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon="📏" label="Distance" value={fmtDistance(loop.distanceKm, u)} />
              <MiniStat icon="⏱️" label="Ride time" value={fmtDuration(Math.round(loop.durationHours * 4) / 4)} />
              <MiniStat
                icon="⛰️"
                label="Climb"
                value={u === 'imperial' ? `${Math.round((loop.climbM * 3.28084) / 50) * 50} ft` : `${Math.round(loop.climbM / 10) * 10} m`}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge ok={!loop.hasHighway}>{loop.hasHighway ? 'Some highway' : 'No highways'}</Badge>
            <Badge ok={!loop.hasToll}>{loop.hasToll ? 'Has tolls' : 'Toll-free'}</Badge>
            <Badge ok>Ends back home</Badge>
          </div>

          <RideMapView
            origin={p.origin}
            samples={p.samples}
            route={loop}
            settings={s}
            stops={visibleStops}
            pickedIds={picked}
            className="h-80 md:h-[26rem]"
          />

          {/* Take it with you */}
          <div className="flex flex-wrap gap-2">
            <a
              href={googleMapsLoopUrl(p.origin, exportPoints)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-2xl bg-stone-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
            >
              🧭 Open in Google Maps
            </a>
            <button
              type="button"
              onClick={downloadGpx}
              className="flex-1 rounded-2xl border-2 border-stone-200 px-4 py-2 text-sm font-semibold transition hover:border-throttle-500 dark:border-stone-700"
            >
              ⬇️ GPX for your GPS
            </button>
          </div>
          <p className="-mt-2 text-xs text-stone-500 dark:text-stone-400">
            Google Maps may pick different roads between points (and caps at {GOOGLE_MAX_WAYPOINTS} stops) — the GPX follows this exact route.
          </p>

          <SaveRouteForm
            defaultName={p.defaultSaveName}
            savedName={p.saved?.name ?? p.savedAs}
            onSave={(name, home) => p.onSave(name, home, pickedStops)}
          />

          {/* Stops */}
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-stone-600 dark:text-stone-300">Stops:</span>
              {KINDS.map((k) => {
                const on = s.stopKinds.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleKind(k)}
                    className={`rounded-full border-2 px-3 py-1 text-sm font-medium transition ${
                      on
                        ? 'border-throttle-500 bg-throttle-50 text-throttle-700 dark:bg-throttle-500/15 dark:text-throttle-300'
                        : 'border-stone-200 text-stone-500 dark:border-stone-700 dark:text-stone-400'
                    }`}
                  >
                    {STOP_META[k].icon} {STOP_META[k].label}
                  </button>
                )
              })}
            </div>

            {p.stops.status === 'loading' && <p className="text-sm text-stone-500 dark:text-stone-400">Scouting gas, grub and bars along the way…</p>}
            {p.stops.status === 'error' && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Couldn’t load stops right now (OpenStreetMap search is busy).{' '}
                <button type="button" onClick={p.stops.retry} className="font-semibold underline">
                  Try again
                </button>
              </p>
            )}

            {p.stops.status === 'ready' && (
              <div className="grid gap-3 md:grid-cols-3">
                {KINDS.filter((k) => s.stopKinds.includes(k)).map((k) => (
                  <div key={k} className="rounded-2xl bg-stone-100 p-3 dark:bg-stone-800/60">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
                        {STOP_META[k].icon} {STOP_META[k].plural}
                      </h3>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">{kindHint(k, loop.distanceKm)}</span>
                    </div>
                    {ranked[k].length === 0 ? (
                      <p className="text-xs text-stone-500 dark:text-stone-400">None close to this loop — try another route.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {ranked[k].map((st) => (
                          <StopRow key={st.id} stop={st} picked={picked.has(st.id)} onToggle={() => togglePick(st.id)} settings={s} />
                        ))}
                      </ul>
                    )}
                    {k === 'bar' && ranked[k].length > 0 && (
                      <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">🍻 Save it for the finish — park the bike first.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {p.stops.status === 'ready' && pickedStops.length > 0 && (
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                ✓ Checked stops are added to the Google Maps link and GPX.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function StopRow({ stop, picked, onToggle, settings }: { stop: Stop; picked: boolean; onToggle: () => void; settings: Settings }) {
  return (
    <li className={`flex items-start gap-2 rounded-xl p-1.5 ${picked ? 'bg-white dark:bg-stone-900' : ''}`}>
      <input
        type="checkbox"
        checked={picked}
        onChange={onToggle}
        aria-label={`Add ${stop.name} to the route`}
        className="mt-1 h-4 w-4 shrink-0 accent-throttle-500"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <a
            href={googleMapsPlaceUrl(stop)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-semibold hover:text-throttle-600 hover:underline dark:hover:text-throttle-400"
          >
            {stop.name}
          </a>
          {stop.bikerSpot && (
            <span className="rounded-full bg-throttle-500 px-1.5 text-[10px] font-bold uppercase text-white">🏍️ Biker spot</span>
          )}
        </div>
        <div className="text-[11px] text-stone-500 dark:text-stone-400">
          {stop.detail && <span className="capitalize">{stop.detail} · </span>}
          {stop.frac < 0.03 ? 'at the start' : stop.frac > 0.97 ? 'at the finish' : `${fmtDistance(stop.alongKm, settings.units)} in`}
          {stop.offKm >= 0.1 && <> · {fmtDistance(stop.offKm, settings.units)} off route</>}
        </div>
      </div>
    </li>
  )
}

function FunBadge({ rating }: { rating: number }) {
  const [label, emoji] = funLabel(rating)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-throttle-500 to-amber-500 px-4 py-3 text-white shadow-md shadow-throttle-500/20">
      <div className="text-3xl" aria-hidden>{emoji}</div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/85">Fun rating</div>
        <div className="font-display text-2xl font-bold leading-none">
          {rating}
          <span className="text-base font-semibold text-white/80">/10</span>
        </div>
        <div className="text-xs font-medium">{label}</div>
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-stone-100 px-3 py-2 dark:bg-stone-800/70">
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        <span aria-hidden>{icon}</span> {label}
      </div>
      <div className="font-display text-lg font-semibold">{value}</div>
    </div>
  )
}

function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-medium ${
        ok ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
      }`}
    >
      {ok ? '✓' : '!'} {children}
    </span>
  )
}
