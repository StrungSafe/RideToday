import { useEffect, useState } from 'react'
import { fetchRoute, radiusSamplePoints, samplePolyline, type Route } from '../lib/geo'
import type { HourSample, Place, PointForecast, RideConditions, RideSample, RideSampleWeather, Settings } from '../lib/types'
import { SPEED_KMH, setDisplayTimeZone } from '../lib/units'
import { attachWeather, fetchForecasts, forecastFor, summarize } from '../lib/weather'

export interface RideForecast {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'needs-destination'
  error?: string
  departAt: number
  rideEnd: number
  samples: RideSampleWeather[]
  conditions: RideConditions | null
  route: Route | null
  home: PointForecast | null
  /** Hourly forecast at the start, around the ride window. */
  timeline: HourSample[]
  fetchedAt: number
}

const EMPTY: RideForecast = {
  status: 'idle',
  departAt: 0,
  rideEnd: 0,
  samples: [],
  conditions: null,
  route: null,
  home: null,
  timeline: [],
  fetchedAt: 0,
}

export function useRideForecast(origin: Place | null, destination: Place | null, s: Settings, refreshKey: number) {
  const [state, setState] = useState<RideForecast>(EMPTY)
  const speedKmh = SPEED_KMH[s.speed]

  useEffect(() => {
    if (!origin) {
      setState(EMPTY)
      return
    }
    if (s.mode === 'route' && !destination) {
      setState({ ...EMPTY, status: 'needs-destination' })
      return
    }
    const ctrl = new AbortController()
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }))

    // Small debounce so dragging sliders doesn't spam the APIs.
    const timer = setTimeout(async () => {
      try {
        const departAt = Math.floor(Date.now() / 1000) + s.departInMinutes * 60
        let samples: RideSample[]
        let route: Route | null = null
        let rideEnd: number

        if (s.mode === 'radius') {
          rideEnd = departAt + s.durationHours * 3600
          samples = radiusSamplePoints(origin, s.radiusKm).map((p) => ({ ...p, from: departAt, to: rideEnd }))
        } else {
          route = await fetchRoute(origin, destination!, speedKmh * 0.8, ctrl.signal)
          const legSecs = route.durationHours * 3600
          const n = Math.max(3, Math.min(10, Math.round(route.distanceKm / 30) + 2))
          const pts = samplePolyline(route.line, n)
          samples = pts.map((p, i) => {
            const eta = departAt + p.frac * legSecs
            return {
              lat: p.lat,
              lon: p.lon,
              label: i === 0 ? 'Start' : i === pts.length - 1 ? 'Destination' : `Stop ${i}`,
              distKm: p.frac * route!.distanceKm,
              leg: 'out' as const,
              from: eta - 1800,
              to: eta + 1800,
            }
          })
          rideEnd = departAt + legSecs
          if (s.roundTrip) {
            const back = [...pts].reverse().slice(1).map((p) => {
              const eta = departAt + legSecs + (1 - p.frac) * legSecs
              return {
                lat: p.lat,
                lon: p.lon,
                label: p.frac === 0 ? 'Home' : `Return ${Math.round((1 - p.frac) * (n - 1))}`,
                distKm: route!.distanceKm + (1 - p.frac) * route!.distanceKm,
                leg: 'back' as const,
                from: eta - 1800,
                to: eta + 1800,
              }
            })
            samples = [...samples, ...back]
            rideEnd = departAt + legSecs * 2
          }
        }

        const map = await fetchForecasts([origin, ...samples], ctrl.signal)
        const withWeather = attachWeather(samples, map)
        const home = forecastFor(map, origin) ?? null
        setDisplayTimeZone(home?.timezone)
        const timeline = (home?.hours ?? []).filter((h) => h.time + 3600 > departAt - 3600 && h.time <= Math.max(rideEnd + 3 * 3600, departAt + 10 * 3600))

        setState({
          status: 'ready',
          departAt,
          rideEnd,
          samples: withWeather,
          conditions: summarize(withWeather, speedKmh),
          route,
          home,
          timeline,
          fetchedAt: Date.now(),
        })
      } catch (e) {
        if (ctrl.signal.aborted) return
        setState((prev) => ({ ...prev, status: 'error', error: e instanceof Error ? e.message : String(e) }))
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [
    origin,
    destination,
    s.mode,
    s.radiusKm,
    s.durationHours,
    s.departInMinutes,
    s.roundTrip,
    speedKmh,
    refreshKey,
  ])

  return state
}
