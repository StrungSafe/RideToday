import type { LatLon } from './types'

/** Decode a Google/Valhalla encoded polyline. Valhalla uses precision 6, Google 5. */
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

/** Encode points as a Google polyline string (precision 5 ≈ 1 m, plenty for a riding route). */
export function encodePolyline(points: LatLon[], precision = 5): string {
  const factor = 10 ** precision
  let out = ''
  let prevLat = 0
  let prevLon = 0
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63)
      n >>= 5
    }
    out += String.fromCharCode(n + 63)
  }
  for (const p of points) {
    const lat = Math.round(p.lat * factor)
    const lon = Math.round(p.lon * factor)
    enc(lat - prevLat)
    enc(lon - prevLon)
    prevLat = lat
    prevLon = lon
  }
  return out
}

/**
 * Douglas–Peucker simplification: drops points that sit within `toleranceM`
 * of the line between their neighbours. Straight stretches collapse to a few
 * points while every bend keeps its shape.
 */
export function simplify(points: LatLon[], toleranceM: number): LatLon[] {
  if (points.length <= 2) return points
  // Local flat projection in meters around the first point.
  const lat0 = (points[0].lat * Math.PI) / 180
  const mx = 111320 * Math.cos(lat0)
  const my = 110540
  const xy = points.map((p) => [p.lon * mx, p.lat * my] as const)

  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  const tol2 = toleranceM * toleranceM
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = xy[a]
    const [bx, by] = xy[b]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    let maxD = 0
    let idx = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i]
      let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
      t = Math.max(0, Math.min(1, t))
      const ex = ax + t * dx - px
      const ey = ay + t * dy - py
      const d = ex * ex + ey * ey
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (idx !== -1 && maxD > tol2) {
      keep[idx] = 1
      stack.push([a, idx], [idx, b])
    }
  }
  return points.filter((_, i) => keep[i])
}
