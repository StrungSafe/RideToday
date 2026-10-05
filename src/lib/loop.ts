import { destination, distanceKm, samplePolyline, type Route } from './geo'
import type { LatLon } from './types'

/** A generated "just ride" round trip, with what makes it fun. */
export interface LoopRoute extends Route {
  id: string
  /** Via points the loop is routed through (excluding the start/finish). */
  vias: (LatLon & { frac: number })[]
  /** Degrees of road bending per km — higher is twistier. */
  twistiness: number
  /** Total climbing in meters (approximate, from sampled elevations). */
  climbM: number
  /** Share of the loop that retraces itself (out-and-back spurs). */
  overlap: number
  hasHighway: boolean
  hasToll: boolean
  /** 1–10 overall fun rating. */
  funRating: number
  score: number
}

/** Average speed used to turn "hours of riding" into a target loop distance. */
const LOOP_SPEED_KMH = 60
/** Roads are longer than the circle we aim them along. */
const ROAD_FACTOR = 1.3
const CANDIDATES = 3

// ── Small seeded RNG so a given shuffle is reproducible ────────────────────
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Three via points on a circle that passes through the origin, so routing
 * origin → vias → origin traces a rough loop of about `targetKm`.
 */
export function loopVias(origin: LatLon, targetKm: number, bearing: number, clockwise: boolean, rand: () => number): LatLon[] {
  const r = targetKm / (2 * Math.PI * ROAD_FACTOR)
  const center = destination(origin, bearing, r)
  const startAngle = bearing + 180 // where the origin sits, seen from the center
  const dir = clockwise ? 1 : -1
  return [1, 2, 3].map((i) => {
    const angle = startAngle + dir * (i * 90 + (rand() - 0.5) * 30)
    return destination(center, angle, r * (0.85 + rand() * 0.3))
  })
}

// ── Valhalla (FOSSGIS public server) with motorcycle costing ─────────────
const VALHALLA = 'https://valhalla1.openstreetmap.de/route'

/** Decode a Valhalla/Google encoded polyline (precision 6). */
export function decodePolyline(str: string, precision = 6): LatLon[] {
  const factor = 10 ** precision
  const out: LatLon[] = []
  let lat = 0
  let lon = 0
  let i = 0
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0
      let result = 0
      let b: number
      do {
        b = str.charCodeAt(i++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (which === 0) lat += delta
      else lon += delta
    }
    out.push({ lat: lat / factor, lon: lon / factor })
  }
  return out
}

interface ValhallaResult {
  line: LatLon[]
  distanceKm: number
  durationHours: number
  hasHighway: boolean
  hasToll: boolean
}

export async function motorcycleRoute(points: LatLon[], avoidHighways: boolean, signal?: AbortSignal): Promise<ValhallaResult> {
  const body = {
    locations: points.map((p) => ({ lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6) })),
    costing: 'motorcycle',
    costing_options: {
      // use_trails stays at its default (0): no dirt tracks for street bikes.
      motorcycle: { use_highways: avoidHighways ? 0 : 0.5, use_tolls: 0.2 },
    },
    units: 'kilometers',
    directions_type: 'none',
  }
  const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(body))}`, { signal })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.trip) throw new Error(data.error ? `Routing: ${data.error}` : `Routing failed (${res.status})`)
  const line = (data.trip.legs as { shape: string }[]).flatMap((l, i) => {
    const pts = decodePolyline(l.shape)
    return i === 0 ? pts : pts.slice(1)
  })
  return {
    line,
    distanceKm: data.trip.summary.length,
    durationHours: data.trip.summary.time / 3600,
    hasHighway: !!data.trip.summary.has_highway,
    hasToll: !!data.trip.summary.has_toll,
  }
}

// ── What makes a loop fun ──────────────────────────────────────────────

function bearing(a: LatLon, b: LatLon) {
  const toRad = Math.PI / 180
  const y = Math.sin((b.lon - a.lon) * toRad) * Math.cos(b.lat * toRad)
  const x =
    Math.cos(a.lat * toRad) * Math.sin(b.lat * toRad) -
    Math.sin(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.cos((b.lon - a.lon) * toRad)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/**
 * Degrees of bend per km. Only gentle-to-tight bends count (2–75° between
 * ~20 m segments), so square city-grid turns don't masquerade as twisties.
 */
export function twistiness(line: LatLon[]): number {
  const pts: LatLon[] = []
  for (const p of line) {
    if (pts.length === 0 || distanceKm(pts[pts.length - 1], p) >= 0.02) pts.push(p)
  }
  let total = 0
  let km = 0
  let prev: number | null = null
  for (let i = 1; i < pts.length; i++) {
    km += distanceKm(pts[i - 1], pts[i])
    const b = bearing(pts[i - 1], pts[i])
    if (prev !== null) {
      const d = Math.abs(((b - prev + 540) % 360) - 180)
      if (d >= 2 && d <= 75) total += d
    }
    prev = b
  }
  return km > 0 ? total / km : 0
}

/** Share of the route (0–1) that rides over road it has already covered. */
export function overlapRatio(line: LatLon[], origin: LatLon): number {
  const km = line.reduce((a, p, i) => (i ? a + distanceKm(line[i - 1], p) : 0), 0)
  const pts = samplePolyline(line, Math.max(10, Math.round(km * 10))) // every ~100 m
  const seen = new Map<string, number>()
  let counted = 0
  let overlap = 0
  pts.forEach((p, i) => {
    if (distanceKm(p, origin) < 1.5) return // leaving/returning home on the same street is fine
    counted++
    const key = `${Math.round(p.lat / 0.0008)},${Math.round(p.lon / 0.0008)}`
    const first = seen.get(key)
    if (first === undefined) seen.set(key, i)
    else if (i - first > 8) overlap++
  })
  return counted ? overlap / counted : 0
}

/** Elevations for many points in one Open-Meteo request (max 100). */
async function fetchElevations(points: LatLon[], signal?: AbortSignal): Promise<number[] | null> {
  try {
    const lat = points.map((p) => p.lat.toFixed(4)).join(',')
    const lon = points.map((p) => p.lon.toFixed(4)).join(',')
    const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`, { signal })
    if (!res.ok) return null
    return (await res.json()).elevation ?? null
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return null
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Normalized 0–10 scores that make up the fun rating. */
export function funParts(twist: number, climbM: number, km: number) {
  const twistScore = clamp(twist / 22, 0, 10) // ~220°/km of bends ≈ Tail of the Dragon
  const hillScore = clamp(((climbM / Math.max(km, 1)) * 10) / 15, 0, 10) // 15 m climb per km = mountain riding
  return { twistScore, hillScore }
}

export function rateLoop(r: { twistiness: number; climbM: number; distanceKm: number; durationHours: number; overlap: number; hasHighway: boolean }, targetHours: number) {
  const { twistScore, hillScore } = funParts(r.twistiness, r.climbM, r.distanceKm)
  const fun = twistScore * 0.65 + hillScore * 0.35
  const timeErr = Math.abs(r.durationHours - targetHours) / targetHours
  const score = fun - r.overlap * 20 - timeErr * 6 - (r.hasHighway ? 1.5 : 0)
  return { funRating: clamp(Math.round(fun), 1, 10), score }
}

function nearestFrac(line: LatLon[], p: LatLon) {
  let best = 0
  let bestD = Infinity
  line.forEach((q, i) => {
    const d = (q.lat - p.lat) ** 2 + (q.lon - p.lon) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return line.length > 1 ? best / (line.length - 1) : 0
}

/**
 * Plan several candidate loops from `origin` and return them best-first.
 * Requests go out one at a time to be gentle on the free routing server.
 */
export async function planLoops(
  origin: LatLon,
  hours: number,
  avoidHighways: boolean,
  seed: number,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<LoopRoute[]> {
  const rand = rng(seed * 7919 + Math.round(origin.lat * 1000) + Math.round(origin.lon * 1000))
  const targetKm = hours * LOOP_SPEED_KMH
  const base = rand() * 360

  const routed: (ValhallaResult & { vias: LatLon[]; i: number })[] = []
  let lastError: unknown
  // Twisty/mountain roads are slower and longer than the circle suggests, so each
  // result rescales the next attempt toward the requested ride time.
  let scale = 1
  const closeEnough = () => routed.some((r) => Math.abs(r.durationHours - hours) / hours <= 0.4)
  const maxAttempts = CANDIDATES + 1
  for (let i = 0; i < maxAttempts; i++) {
    if (i === CANDIDATES && closeEnough()) break // one bonus try only if nothing fit the time
    onProgress?.(Math.min(i, CANDIDATES - 1), CANDIDATES)
    const vias = loopVias(origin, targetKm * scale, base + (i * 360) / CANDIDATES + (i >= CANDIDATES ? 60 : 0), rand() < 0.5, rand)
    try {
      const r = await motorcycleRoute([origin, ...vias, origin], avoidHighways, signal)
      routed.push({ ...r, vias, i })
      scale = clamp(scale * (hours / Math.max(r.durationHours, 0.1)), 0.25, 1.6)
    } catch (e) {
      if (signal?.aborted) throw e
      lastError = e
    }
  }
  onProgress?.(CANDIDATES, CANDIDATES)
  if (routed.length === 0) throw lastError instanceof Error ? lastError : new Error('Could not plan a loop here.')

  // One elevation request covering every candidate.
  const PER = Math.floor(100 / routed.length)
  const samples = routed.map((r) => samplePolyline(r.line, PER))
  const elev = await fetchElevations(samples.flat(), signal)

  const loops = routed.map((r, k) => {
    let climbM = 0
    if (elev) {
      const e = elev.slice(k * PER, (k + 1) * PER)
      for (let j = 1; j < e.length; j++) climbM += Math.max(0, e[j] - e[j - 1])
    }
    const metrics = {
      twistiness: twistiness(r.line),
      overlap: overlapRatio(r.line, origin),
      climbM,
      distanceKm: r.distanceKm,
      durationHours: r.durationHours,
      hasHighway: r.hasHighway,
    }
    const loop: LoopRoute = {
      id: `${seed}-${r.i}`,
      line: r.line,
      approximate: false,
      vias: r.vias.map((v) => ({ ...v, frac: nearestFrac(r.line, v) })).sort((a, b) => a.frac - b.frac),
      hasToll: r.hasToll,
      ...metrics,
      ...rateLoop(metrics, hours),
    }
    return loop
  })
  // Drop loops that badly miss the requested ride time, as long as something fits.
  const fits = loops.filter((l) => Math.abs(l.durationHours - hours) / hours <= 0.75)
  return (fits.length ? fits : loops).sort((a, b) => b.score - a.score)
}
