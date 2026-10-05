import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConditionsCard } from './components/ConditionsCard'
import { GearLoadout } from './components/GearLoadout'
import { Hazards } from './components/Hazards'
import { LoopCard } from './components/LoopCard'
import { Header, REPO_URL } from './components/Header'
import { PlaceSearch } from './components/PlaceSearch'
import { RideMap } from './components/RideMap'
import { RiderProfileSheet } from './components/RiderProfile'
import { RideSetup, type Commute } from './components/RideSetup'
import { RoutesSheet } from './components/RoutesSheet'
import { SaveRouteForm } from './components/SaveRouteForm'
import { HourlyTimeline, RouteTimeline } from './components/Timeline'
import { Card } from './components/ui'
import { useLoopRoute } from './hooks/useLoopRoute'
import { useRideForecast } from './hooks/useRideForecast'
import { useSavedRoutes } from './hooks/useSavedRoutes'
import { useStops } from './hooks/useStops'
import { useStoredState } from './hooks/useStoredState'
import { useTheme } from './hooks/useTheme'
import { recommendGear, rideScore } from './lib/gear'
import { getBrowserLocation, reverseGeocode } from './lib/geo'
import { abToSaved, loopToSaved, savedToLoop, type SavedRoute } from './lib/savedRoutes'
import type { LatLon, MyPlaces, Place, Settings } from './lib/types'
import { KM_PER_MILE, defaultUnits, fmtDistance } from './lib/units'

const shortName = (p: Place) => p.name.split(',')[0]
const samePlace = (a: LatLon, b: LatLon) => a.lat.toFixed(4) === b.lat.toFixed(4) && a.lon.toFixed(4) === b.lon.toFixed(4)

const DEFAULT_SETTINGS: Settings = {
  units: defaultUnits(),
  comfort: 'normal',
  atgatt: false,
  speed: 'mixed',
  mode: 'radius',
  radiusKm: 25 * KM_PER_MILE,
  durationHours: 2,
  departInMinutes: 0,
  roundTrip: false,
  loopHours: 2,
  avoidHighways: true,
  stopKinds: ['gas', 'food', 'bar'],
}

export default function App() {
  const theme = useTheme()
  const [settings, setSettings] = useStoredState<Settings>('ridetoday.settings', DEFAULT_SETTINGS)
  const [origin, setOrigin] = useStoredState<Place | null>('ridetoday.origin', null)
  const [destination, setDestination] = useStoredState<Place | null>('ridetoday.destination', null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [routesOpen, setRoutesOpen] = useState(false)
  const [places, setPlaces] = useStoredState<MyPlaces>('ridetoday.places', { home: null, work: null })
  const library = useSavedRoutes()
  /** The saved route currently being shown, if any. */
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null)

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [setSettings])

  // Changing what the ride is (start, destination, loop length…) means it's no longer the saved route.
  const updateRide = useCallback(
    (patch: Partial<Settings>) => {
      if ('loopHours' in patch || 'avoidHighways' in patch || 'roundTrip' in patch) setActiveSavedId(null)
      update(patch)
    },
    [update],
  )
  const pickOrigin = useCallback(
    (p: Place) => {
      setActiveSavedId(null)
      setOrigin(p)
    },
    [setOrigin],
  )
  const pickDestination = useCallback(
    (p: Place | null) => {
      setActiveSavedId(null)
      setDestination(p)
    },
    [setDestination],
  )

  const locate = useCallback(async () => {
    setLocating(true)
    setLocError(null)
    try {
      const pos = await getBrowserLocation()
      const name = (await reverseGeocode(pos)) ?? 'My location'
      pickOrigin({ ...pos, name })
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Could not get your location.')
    } finally {
      setLocating(false)
    }
  }, [pickOrigin])

  const rideSaved = useCallback(
    (r: SavedRoute) => {
      setOrigin(r.origin)
      if (r.kind === 'loop') {
        update({ mode: 'loop' })
      } else {
        setDestination(r.destination)
        update({ mode: 'route', roundTrip: r.roundTrip })
      }
      setActiveSavedId(r.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [setOrigin, setDestination, update],
  )

  /** The work route: home → work in the morning, work → home after. */
  const commute = useCallback(
    (c: Commute) => {
      const { home, work } = places
      if (!home || !work) return
      setActiveSavedId(null)
      setOrigin(c === 'to-work' ? home : work)
      setDestination(c === 'to-work' ? work : home)
      update({ mode: 'route', roundTrip: false })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [places, setOrigin, setDestination, update],
  )

  const activeSaved = library.lib.routes.find((r) => r.id === activeSavedId) ?? null
  // Rebuild only when the route itself changes (not on rename), so weather isn't re-fetched needlessly.
  const savedLoopLine = activeSaved?.kind === 'loop' ? activeSaved.line : null
  const savedLoop = useMemo(() => (activeSaved?.kind === 'loop' ? savedToLoop(activeSaved) : null), [activeSavedId, savedLoopLine])
  const savedLoopInfo = useMemo(
    () => (activeSaved?.kind === 'loop' ? { name: activeSaved.name, stops: activeSaved.stops } : null),
    [activeSaved],
  )

  const loopMode = settings.mode === 'loop'
  // A saved loop replaces the planner until the rider asks for a new route.
  const loop = useLoopRoute(origin, loopMode && !savedLoop, settings.loopHours, settings.avoidHighways)
  const loopRoute = loopMode ? (savedLoop ?? loop.loop) : null
  const stops = useStops(loopRoute)
  const forecast = useRideForecast(origin, destination, settings, refreshKey, loopRoute)

  // Refresh automatically when the tab comes back after a while (weather goes stale).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && forecast.fetchedAt && Date.now() - forecast.fetchedAt > 15 * 60 * 1000) {
        setRefreshKey((k) => k + 1)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [forecast.fetchedAt])

  const c = forecast.conditions
  const plan = useMemo(
    () => (c ? recommendGear({ conditions: c, comfort: settings.comfort, atgatt: settings.atgatt }) : null),
    [c, settings.comfort, settings.atgatt],
  )
  const score = useMemo(() => (c ? rideScore(c, settings.comfort) : null), [c, settings.comfort])

  const sunset = useMemo(() => {
    const list = forecast.home?.sunset ?? []
    return list.find((t) => t > forecast.departAt) ?? null
  }, [forecast.home, forecast.departAt])

  const loading = forecast.status === 'loading'

  // Is what's on screen already in the library? (Planned loop saved earlier, or same A → B trip.)
  const loopSavedAs =
    loopRoute && !savedLoop
      ? (library.lib.routes.find((r) => r.kind === 'loop' && r.sourceId === loopRoute.id)?.name ?? null)
      : null
  const abSavedAs =
    settings.mode === 'route' && origin && destination
      ? (library.lib.routes.find(
          (r) => r.kind === 'ab' && samePlace(r.origin, origin) && samePlace(r.destination, destination) && r.roundTrip === settings.roundTrip,
        )?.name ?? null)
      : null
  const isCommute = (from: Place | null, to: Place | null) =>
    settings.mode === 'route' && !settings.roundTrip && !!(origin && destination && from && to) && samePlace(origin, from) && samePlace(destination, to)
  const showCommuteShortcut = !!places.home && !!places.work

  return (
    <div className="asphalt min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
        <Header theme={theme.pref} onTheme={theme.setPref} units={settings.units} onUnits={(units) => update({ units })} />

        {!origin ? (
          <Welcome onLocate={locate} locating={locating} error={locError} onPick={pickOrigin} />
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="order-last space-y-5 lg:order-first">
              <RideSetup
                settings={settings}
                update={updateRide}
                origin={origin}
                onOrigin={pickOrigin}
                onLocate={locate}
                locating={locating}
                destination={destination}
                onDestination={pickDestination}
                places={places}
                onCommute={commute}
                onOpenSettings={() => setRoutesOpen(true)}
              />
              {locError && <p className="text-sm text-red-600 dark:text-red-400">{locError}</p>}
              {/* Desktop: road report lives in the left column. On mobile it stays with the results (below). */}
              {score && (
                <div className="hidden lg:block">
                  <Hazards hazards={score.hazards} />
                </div>
              )}
            </aside>

            <main className="min-w-0 space-y-5">
              {/* Phones: Your Ride sits at the bottom, so the commute gets a shortcut up top. */}
              {showCommuteShortcut && (
                <div className="grid grid-cols-2 gap-2 lg:hidden">
                  {(
                    [
                      ['to-work', '🏢', 'To work', isCommute(places.home, places.work)],
                      ['to-home', '🏠', 'Head home', isCommute(places.work, places.home)],
                    ] as const
                  ).map(([c, icon, label, active]) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => commute(c)}
                      aria-pressed={active}
                      className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-2.5 font-display text-sm font-semibold uppercase tracking-wide transition ${
                        active
                          ? 'border-throttle-500 bg-throttle-500 text-white'
                          : 'border-throttle-400 bg-throttle-50 text-throttle-700 dark:border-throttle-500/50 dark:bg-throttle-500/10 dark:text-throttle-300'
                      }`}
                    >
                      <span aria-hidden>{icon}</span> {label}
                    </button>
                  ))}
                </div>
              )}

              {loopMode && (
                <LoopCard
                  origin={origin}
                  status={savedLoop ? 'ready' : loop.status}
                  error={loop.error}
                  loop={loopRoute}
                  index={loop.index}
                  total={savedLoop ? 0 : loop.loops.length}
                  progress={loop.progress}
                  onShuffle={savedLoop ? () => setActiveSavedId(null) : loop.shuffle}
                  samples={forecast.route === loopRoute ? forecast.samples : []}
                  settings={settings}
                  update={update}
                  stops={stops}
                  saved={savedLoopInfo}
                  savedAs={loopSavedAs}
                  defaultSaveName={loopRoute ? `${shortName(origin)} loop · ${fmtDistance(loopRoute.distanceKm, settings.units)}` : ''}
                  onSave={(name, picked) => (loopRoute ? library.add(loopToSaved(loopRoute, origin, picked, name)) : null)}
                />
              )}

              {forecast.status === 'needs-destination' && (
                <Card>
                  <div className="py-8 text-center">
                    <div className="text-5xl" aria-hidden>🏁</div>
                    <h2 className="mt-2 font-display text-2xl font-semibold uppercase">Where to?</h2>
                    <p className="mt-1 text-stone-500 dark:text-stone-400">
                      Pick a destination and we’ll check the weather all along the way — at the time you’ll get there.
                    </p>
                  </div>
                </Card>
              )}

              {forecast.status === 'error' && (
                <Card>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-3xl" aria-hidden>🔧</span>
                    <div className="flex-1">
                      <div className="font-semibold">Breakdown on the shoulder</div>
                      <div className="text-sm text-stone-500 dark:text-stone-400">{forecast.error}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRefreshKey((k) => k + 1)}
                      className="rounded-2xl bg-throttle-500 px-4 py-2 text-sm font-semibold text-white hover:bg-throttle-600"
                    >
                      Try again
                    </button>
                  </div>
                </Card>
              )}

              {loading && !c && <LoadingRoad />}

              {c && plan && score && (
                <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                  <ConditionsCard
                    c={c}
                    score={score}
                    settings={settings}
                    placeName={origin.name}
                    departAt={forecast.departAt}
                    rideEnd={forecast.rideEnd}
                    sunset={sunset}
                    loading={loading}
                  />
                  <div className="flex items-center justify-end gap-2 text-xs text-stone-500 dark:text-stone-400">
                    {loading ? 'Updating…' : `Updated ${new Date(forecast.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                    <button
                      type="button"
                      onClick={() => setRefreshKey((k) => k + 1)}
                      className="rounded-full px-2 py-1 font-semibold text-throttle-600 hover:bg-throttle-50 dark:text-throttle-400 dark:hover:bg-stone-800"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                  <GearLoadout
                    plan={plan}
                    atgatt={settings.atgatt}
                    gusty={c.maxGust >= 40}
                    units={settings.units}
                    onOpenSettings={() => setProfileOpen(true)}
                  />
                  <div className="lg:hidden">
                    <Hazards hazards={score.hazards} />
                  </div>
                  {!loopMode && (
                    <RideMap origin={origin} samples={forecast.samples} route={forecast.route} settings={settings}>
                      {settings.mode === 'route' && destination && (
                        <SaveRouteForm
                          defaultName={`${shortName(origin)} → ${shortName(destination)}`}
                          savedName={abSavedAs}
                          onSave={(name) => library.add(abToSaved(origin, destination, settings.roundTrip, name))}
                        />
                      )}
                    </RideMap>
                  )}
                  {settings.mode !== 'radius' ? (
                    <RouteTimeline samples={forecast.samples} settings={settings} />
                  ) : (
                    <HourlyTimeline hours={forecast.timeline} departAt={forecast.departAt} rideEnd={forecast.rideEnd} settings={settings} />
                  )}
                </div>
              )}
            </main>
          </div>
        )}

        <RiderProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          comfort={settings.comfort}
          onComfort={(comfort) => update({ comfort })}
          atgatt={settings.atgatt}
          onAtgatt={(atgatt) => update({ atgatt })}
        />
        <RoutesSheet
          open={routesOpen}
          onClose={() => setRoutesOpen(false)}
          places={places}
          onPlace={(key, p) => setPlaces((prev) => ({ ...prev, [key]: p }))}
          origin={origin}
          lib={library.lib}
          activeId={activeSavedId}
          units={settings.units}
          onRide={rideSaved}
          onRemove={library.remove}
          onRename={library.rename}
        />

        <footer className="mt-10 border-t border-stone-200 pt-4 text-center text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          Weather by{' '}
          <a className="underline hover:text-throttle-500" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          · Maps ©{' '}
          <a className="underline hover:text-throttle-500" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>{' '}
          · Routing by{' '}
          <a className="underline hover:text-throttle-500" href="https://project-osrm.org/" target="_blank" rel="noreferrer">
            OSRM
          </a>{' '}
          &amp;{' '}
          <a className="underline hover:text-throttle-500" href="https://valhalla.github.io/valhalla/" target="_blank" rel="noreferrer">
            Valhalla
          </a>
          <br />
          Search by{' '}
          <a className="underline hover:text-throttle-500" href="https://photon.komoot.io/" target="_blank" rel="noreferrer">
            Photon
          </a>{' '}
          &amp;{' '}
          <a className="underline hover:text-throttle-500" href="https://nominatim.org/" target="_blank" rel="noreferrer">
            Nominatim
          </a>{' '}
          · Stops via{' '}
          <a className="underline hover:text-throttle-500" href="https://overpass-api.de/" target="_blank" rel="noreferrer">
            Overpass
          </a>
          <br />
          Gear suggestions are a starting point — you know your bike, your body and your roads. Ride safe. ✌️
          <br />
          <a className="underline hover:text-throttle-500" href={REPO_URL} target="_blank" rel="noreferrer">
            Source on GitHub
          </a>{' '}
          · MIT License
        </footer>
      </div>
    </div>
  )
}

function Welcome({ onLocate, locating, error, onPick }: {
  onLocate: () => void
  locating: boolean
  error: string | null
  onPick: (p: Place) => void
}) {
  return (
    <div className="mx-auto mt-10 max-w-xl text-center sm:mt-16">
      <div className="text-7xl" aria-hidden>🏍️</div>
      <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
        Should you <span className="text-throttle-500">ride today?</span>
      </h2>
      <p className="mt-3 text-stone-600 dark:text-stone-300">
        Get a rider’s weather report for your area or route, a Ride-O-Meter score, and exactly what gear to wear.
      </p>
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-throttle-500 px-6 py-3.5 font-display text-lg font-semibold uppercase tracking-wide text-white shadow-lg shadow-throttle-500/30 transition hover:-translate-y-0.5 hover:bg-throttle-600 disabled:opacity-70"
      >
        {locating ? 'Finding you…' : '🎯 Use my location'}
      </button>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mx-auto mt-6 max-w-sm text-left">
        <div className="mb-2 text-center text-sm text-stone-500 dark:text-stone-400">or search for a place</div>
        <PlaceSearch placeholder="Address or town…" onPick={onPick} />
      </div>
    </div>
  )
}

function LoadingRoad() {
  return (
    <Card>
      <div className="py-10 text-center">
        <div className="relative mx-auto h-16 max-w-md overflow-hidden rounded-xl bg-stone-700 dark:bg-stone-800">
          <div className="road-line animate-road absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 text-yellow-300" />
          <div className="animate-ride absolute top-2 text-4xl" aria-hidden>
            🏍️
          </div>
        </div>
        <p className="mt-4 font-display text-lg uppercase tracking-wide text-stone-500 dark:text-stone-400">Checking the skies…</p>
      </div>
    </Card>
  )
}
