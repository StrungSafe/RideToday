import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConditionsCard } from './components/ConditionsCard'
import { GearLoadout } from './components/GearLoadout'
import { Hazards } from './components/Hazards'
import { Header, REPO_URL } from './components/Header'
import { PlaceSearch } from './components/PlaceSearch'
import { RideMap } from './components/RideMap'
import { RiderProfileSheet } from './components/RiderProfile'
import { RideSetup } from './components/RideSetup'
import { HourlyTimeline, RouteTimeline } from './components/Timeline'
import { Card } from './components/ui'
import { useRideForecast } from './hooks/useRideForecast'
import { useStoredState } from './hooks/useStoredState'
import { useTheme } from './hooks/useTheme'
import { recommendGear, rideScore } from './lib/gear'
import { getBrowserLocation, reverseGeocode } from './lib/geo'
import type { Place, Settings } from './lib/types'
import { KM_PER_MILE, defaultUnits } from './lib/units'

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

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [setSettings])

  const locate = useCallback(async () => {
    setLocating(true)
    setLocError(null)
    try {
      const pos = await getBrowserLocation()
      const name = (await reverseGeocode(pos)) ?? 'My location'
      setOrigin({ ...pos, name })
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Could not get your location.')
    } finally {
      setLocating(false)
    }
  }, [setOrigin])

  const forecast = useRideForecast(origin, destination, settings, refreshKey)

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

  return (
    <div className="asphalt min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
        <Header theme={theme.pref} onTheme={theme.setPref} units={settings.units} onUnits={(units) => update({ units })} />

        {!origin ? (
          <Welcome onLocate={locate} locating={locating} error={locError} onPick={setOrigin} />
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="order-last space-y-5 lg:order-first">
              <RideSetup
                settings={settings}
                update={update}
                origin={origin}
                onOrigin={setOrigin}
                onLocate={locate}
                locating={locating}
                destination={destination}
                onDestination={setDestination}
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
                  <RideMap origin={origin} samples={forecast.samples} route={forecast.route} settings={settings} />
                  {settings.mode === 'route' ? (
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
        <PlaceSearch placeholder="City or town…" onPick={onPick} />
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
