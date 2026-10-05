import type { LatLon } from './types'

const R_KM = 6371
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Point reached by travelling `km` from `start` along `bearingDeg`. */
export function destination(start: LatLon, bearingDeg: number, km: number): LatLon {
  const d = km / R_KM
  const b = rad(bearingDeg)
  const lat1 = rad(start.lat)
  const lon1 = rad(start.lon)
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lon2 =
    lon1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: deg(lat2), lon: ((deg(lon2) + 540) % 360) - 180 }
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** Points covering a riding radius: the center, an inner ring and an outer ring. */
export function radiusSamplePoints(center: LatLon, radiusKm: number): (LatLon & { label: string })[] {
  const pts: (LatLon & { label: string })[] = [{ ...center, label: 'Start' }]
  if (radiusKm <= 0) return pts
  if (radiusKm >= 40) {
    for (let i = 0; i < 4; i++) {
      pts.push({ ...destination(center, 45 + i * 90, radiusKm / 2), label: `${COMPASS[1 + i * 2]} (mid)` })
    }
  }
  for (let i = 0; i < 8; i++) {
    pts.push({ ...destination(center, i * 45, radiusKm), label: COMPASS[i] })
  }
  return pts
}

/**
 * Evenly spaced points (by distance) along a polyline, including both ends.
 * Returns each point with the fraction of total distance it sits at.
 */
export function samplePolyline(line: LatLon[], count: number): (LatLon & { frac: number })[] {
  if (line.length === 0) return []
  if (line.length === 1) return [{ ...line[0], frac: 0 }]
  const cum = [0]
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + distanceKm(line[i - 1], line[i]))
  const total = cum[cum.length - 1]
  if (total === 0) return [{ ...line[0], frac: 0 }]
  const out: (LatLon & { frac: number })[] = []
  let seg = 1
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1)
    while (seg < line.length - 1 && cum[seg] < target) seg++
    const segLen = cum[seg] - cum[seg - 1]
    const t = segLen === 0 ? 0 : (target - cum[seg - 1]) / segLen
    out.push({
      lat: line[seg - 1].lat + (line[seg].lat - line[seg - 1].lat) * t,
      lon: line[seg - 1].lon + (line[seg].lon - line[seg - 1].lon) * t,
      frac: target / total,
    })
  }
  return out
}

export interface Route {
  line: LatLon[]
  distanceKm: number
  /** Travel time in hours. */
  durationHours: number
  /** True when we fell back to a straight line because routing failed. */
  approximate: boolean
}

/** Road route via the public OSRM demo server; falls back to a straight line. */
export async function fetchRoute(
  from: LatLon,
  to: LatLon,
  fallbackSpeedKmh: number,
  signal?: AbortSignal,
): Promise<Route> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=simplified&geometries=geojson`
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`Routing failed (${res.status})`)
    const data = await res.json()
    const r = data.routes?.[0]
    if (!r) throw new Error('No route found')
    return {
      line: (r.geometry.coordinates as [number, number][]).map(([lon, lat]) => ({ lat, lon })),
      distanceKm: r.distance / 1000,
      durationHours: r.duration / 3600,
      approximate: false,
    }
  } catch (e) {
    if (signal?.aborted) throw e
    // Straight line, padded ~25% to approximate real roads.
    const km = distanceKm(from, to) * 1.25
    return { line: [from, to], distanceKm: km, durationHours: km / fallbackSpeedKmh, approximate: true }
  }
}

/** Best-effort reverse geocoding for a friendly place name. */
export async function reverseGeocode(p: LatLon, signal?: AbortSignal): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${p.lat}&longitude=${p.lon}&localityLanguage=en`
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const d = await res.json()
    const parts = [d.city || d.locality, d.principalSubdivisionCode?.split('-').pop() || d.principalSubdivision]
    const name = parts.filter(Boolean).join(', ')
    return name || null
  } catch {
    return null
  }
}

export function getBrowserLocation(): Promise<LatLon> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied — search for your city instead.'
              : 'Could not get your location — search for your city instead.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  })
}
