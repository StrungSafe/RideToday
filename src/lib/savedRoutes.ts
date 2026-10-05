import type { LoopRoute } from './loop'
import { decodePolyline, encodePolyline, simplify } from './polyline'
import type { Stop } from './stops'
import type { LatLon, Place } from './types'

/**
 * A route saved in this browser. Loops keep their geometry (a planner won't
 * reproduce the same loop twice); A→B routes only keep their endpoints and
 * are re-routed when loaded.
 */
export type SavedRoute = SavedLoop | SavedAB

interface SavedBase {
  v: 1
  id: string
  name: string
  createdAt: number
  origin: Place
}

export interface SavedLoop extends SavedBase {
  kind: 'loop'
  /** Id of the planned loop this was saved from (to show it as saved). */
  sourceId?: string
  /** Encoded polyline (precision 5), simplified to ~5 m. */
  line: string
  vias: (LatLon & { frac: number })[]
  stops: Stop[]
  stats: {
    distanceKm: number
    durationHours: number
    funRating: number
    climbM: number
    twistiness: number
    hasHighway: boolean
    hasToll: boolean
  }
}

export interface SavedAB extends SavedBase {
  kind: 'ab'
  destination: Place
  roundTrip: boolean
}

export interface RouteLibrary {
  homeId: string | null
  routes: SavedRoute[]
}

export const EMPTY_LIBRARY: RouteLibrary = { homeId: null, routes: [] }
export const STORAGE_KEY = 'ridetoday.routes'

/** Simplification tolerance: well under a lane's width, invisible on the map and fine for GPS. */
const SIMPLIFY_M = 5

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 12)

export function loopToSaved(loop: LoopRoute, origin: Place, stops: Stop[], name: string): SavedLoop {
  return {
    v: 1,
    id: newId(),
    kind: 'loop',
    sourceId: loop.id,
    name,
    createdAt: Date.now(),
    origin,
    line: encodePolyline(simplify(loop.line, SIMPLIFY_M)),
    vias: loop.vias.map((v) => ({ lat: +v.lat.toFixed(5), lon: +v.lon.toFixed(5), frac: +v.frac.toFixed(3) })),
    stops,
    stats: {
      distanceKm: loop.distanceKm,
      durationHours: loop.durationHours,
      funRating: loop.funRating,
      climbM: loop.climbM,
      twistiness: loop.twistiness,
      hasHighway: loop.hasHighway,
      hasToll: loop.hasToll,
    },
  }
}

export function abToSaved(origin: Place, destination: Place, roundTrip: boolean, name: string): SavedAB {
  return { v: 1, id: newId(), kind: 'ab', name, createdAt: Date.now(), origin, destination, roundTrip }
}

/** Rebuild a LoopRoute from a saved loop so the rest of the app can use it as-is. */
export function savedToLoop(s: SavedLoop): LoopRoute {
  return {
    id: `saved-${s.id}`,
    line: decodePolyline(s.line, 5),
    approximate: false,
    vias: s.vias,
    overlap: 0,
    score: 0,
    ...s.stats,
  }
}

export function loadLibrary(): RouteLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_LIBRARY
    const parsed = JSON.parse(raw) as RouteLibrary
    if (!Array.isArray(parsed.routes)) return EMPTY_LIBRARY
    return { homeId: parsed.homeId ?? null, routes: parsed.routes.filter((r) => r && r.v === 1) }
  } catch {
    return EMPTY_LIBRARY
  }
}

/** Persist the library. Returns an error message instead of throwing (storage full/blocked). */
export function saveLibrary(lib: RouteLibrary): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))
    return null
  } catch (e) {
    return e instanceof DOMException && e.name === 'QuotaExceededError'
      ? 'Browser storage is full — delete a saved route and try again.'
      : 'This browser is blocking storage (private mode?) — routes can’t be saved.'
  }
}

/** Bytes the library takes up in storage (UTF-16 in most browsers, so ~2 bytes/char). */
export function libraryBytes(lib: RouteLibrary): number {
  return (STORAGE_KEY.length + JSON.stringify(lib).length) * 2
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
