import type { LatLon } from './types'

export interface ExportPoint extends LatLon {
  name: string
  /** Position along the route (0–1), used to order waypoints. */
  frac: number
}

const ll = (p: LatLon) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`

/** Google Maps limits URL directions to 9 waypoints. */
export const GOOGLE_MAX_WAYPOINTS = 9

/** Google Maps directions link for a loop: start → waypoints (in ride order) → back to start. */
export function googleMapsLoopUrl(origin: LatLon, points: ExportPoint[]): string {
  const ordered = [...points].sort((a, b) => a.frac - b.frac).slice(0, GOOGLE_MAX_WAYPOINTS)
  const params = new URLSearchParams({
    api: '1',
    origin: ll(origin),
    destination: ll(origin),
    travelmode: 'driving',
  })
  if (ordered.length) params.set('waypoints', ordered.map(ll).join('|'))
  return `https://www.google.com/maps/dir/?${params}`
}

export function googleMapsPlaceUrl(p: LatLon & { name?: string }): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll(p))}`
}

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

/** GPX 1.1 with the full track plus stops as waypoints — loads into most motorcycle GPS units and apps. */
export function buildGpx(name: string, line: LatLon[], stops: ExportPoint[]): string {
  const wpts = stops
    .map((s) => `  <wpt lat="${s.lat.toFixed(6)}" lon="${s.lon.toFixed(6)}"><name>${esc(s.name)}</name></wpt>`)
    .join('\n')
  const trkpts = line.map((p) => `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"/>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RideToday" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${esc(name)}</name></metadata>
${wpts}
  <trk>
    <name>${esc(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`
}

/** Save text as a file in the browser. */
export function downloadText(filename: string, text: string, type = 'application/gpx+xml') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
