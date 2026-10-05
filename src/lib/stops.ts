import { distanceKm, samplePolyline, type Route } from './geo'
import type { LatLon, StopKind } from './types'

export interface Stop extends LatLon {
  id: string
  kind: StopKind
  name: string
  /** Extra detail, e.g. cuisine or brand. */
  detail?: string
  /** Position along the route (0–1) and how far off the route it sits. */
  frac: number
  alongKm: number
  offKm: number
  /** Name suggests a classic rider hangout. */
  bikerSpot: boolean
  /** Chain fast food — fine in a pinch, but a local spot makes a better ride stop. */
  fastFood: boolean
}

export const STOP_META: Record<StopKind, { icon: string; label: string; plural: string }> = {
  gas: { icon: '⛽', label: 'Gas', plural: 'Gas stations' },
  food: { icon: '🍔', label: 'Food', plural: 'Food' },
  bar: { icon: '🍺', label: 'Bar', plural: 'Bars' },
}

const AMENITY: Record<StopKind, string[]> = {
  gas: ['fuel'],
  food: ['restaurant', 'fast_food', 'cafe'],
  bar: ['bar', 'pub', 'biergarten'],
}

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

const ATTEMPT_TIMEOUT_MS = 15000

/** Max distance (m) a stop can be from the route. */
const SEARCH_RADIUS_M = 600

interface OsmElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const BIKER = /\b(biker|moto|motorcycle|harley|chopper|bike night|hog)\b/i

function kindOf(amenity: string | undefined): StopKind | null {
  for (const k of Object.keys(AMENITY) as StopKind[]) if (amenity && AMENITY[k].includes(amenity)) return k
  return null
}

/** Find gas, food and bars within a few hundred meters of the route (OpenStreetMap via Overpass). */
export async function fetchStops(route: Route, kinds: StopKind[], signal?: AbortSignal): Promise<Stop[]> {
  if (kinds.length === 0) return []
  // A route-shaped search area: points every ~2 km (Overpass accepts a polyline for `around`).
  const n = Math.max(8, Math.min(90, Math.round(route.distanceKm / 2)))
  const along = samplePolyline(route.line, n)
  const coords = along.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join(',')
  const amenities = kinds.flatMap((k) => AMENITY[k]).join('|')
  const query = `[out:json][timeout:25];nwr(around:${SEARCH_RADIUS_M},${coords})[amenity~"^(${amenities})$"];out center tags 400;`

  let data: { elements?: OsmElement[] } | null = null
  let lastErr: unknown
  for (const url of ENDPOINTS) {
    // Public Overpass servers sometimes hang when busy — give each one a time limit.
    const attempt = new AbortController()
    const onAbort = () => attempt.abort()
    signal?.addEventListener('abort', onAbort)
    const timer = setTimeout(() => attempt.abort(), ATTEMPT_TIMEOUT_MS)
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: attempt.signal })
      if (!res.ok) throw new Error(`Stop search failed (${res.status})`)
      data = await res.json()
      break
    } catch (e) {
      if (signal?.aborted) throw e
      lastErr = e
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }
  if (!data) throw lastErr instanceof Error ? lastErr : new Error('Stop search failed')

  const stops: Stop[] = []
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {}
    const kind = kindOf(tags.amenity)
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (!kind || lat == null || lon == null) continue
    const name = tags.name || tags.brand
    if (!name && kind !== 'gas') continue // an unnamed diner isn't much of a recommendation
    // Nearest sampled point gives position along the route.
    let best = along[0]
    let bestD = Infinity
    for (const p of along) {
      const d = distanceKm(p, { lat, lon })
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    const detail =
      kind === 'food'
        ? tags.cuisine?.split(';')[0]?.replace(/_/g, ' ') || (tags.amenity === 'fast_food' ? 'fast food' : tags.amenity)
        : kind === 'gas'
          ? tags.brand && tags.brand !== name
            ? tags.brand
            : undefined
          : tags.amenity === 'pub'
            ? 'pub'
            : tags.amenity === 'biergarten'
              ? 'beer garden'
              : undefined
    stops.push({
      id: `${el.type}/${el.id}`,
      kind,
      name: name || 'Gas station',
      detail,
      lat,
      lon,
      frac: best.frac,
      alongKm: best.frac * route.distanceKm,
      offKm: bestD,
      bikerSpot: BIKER.test(name ?? ''),
      fastFood: tags.amenity === 'fast_food',
    })
  }
  return stops
}

/**
 * Where along the ride each kind of stop is most useful:
 * gas mid-way on long loops (early on short ones), food around halfway,
 * and bars at the end — after the bike is parked.
 */
export function idealFrac(kind: StopKind, routeKm: number): number {
  if (kind === 'gas') return routeKm > 150 ? 0.5 : 0.1
  if (kind === 'food') return 0.5
  return 0.95
}

/** Rank stops of one kind, best first: close to the ideal spot, close to the road, biker spots win ties. */
export function rankStops(stops: Stop[], kind: StopKind, routeKm: number): Stop[] {
  const target = idealFrac(kind, routeKm)
  const cost = (s: Stop) =>
    Math.abs(s.frac - target) * routeKm + s.offKm * 4 - (s.bikerSpot ? 8 : 0) + (s.name === 'Gas station' ? 2 : 0) + (s.fastFood ? 6 : 0)
  return stops.filter((s) => s.kind === kind).sort((a, b) => cost(a) - cost(b))
}
