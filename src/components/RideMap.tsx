import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { latLngBounds } from 'leaflet'
import type { Route } from '../lib/geo'
import type { LatLon, RideSampleWeather, Settings } from '../lib/types'
import { fmtTemp } from '../lib/units'
import { codeIcon, codeLabel } from '../lib/wmo'
import { Card } from './ui'

/** Color a marker by temperature (°C). */
function tempColor(c: number) {
  if (c >= 32) return '#dc2626'
  if (c >= 27) return '#f97316'
  if (c >= 21) return '#f59e0b'
  if (c >= 15) return '#84cc16'
  if (c >= 9) return '#06b6d4'
  if (c >= 3) return '#3b82f6'
  return '#6366f1'
}

function FitBounds({ points }: { points: LatLon[] }) {
  const map = useMap()
  const key = points.map((p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`).join('|')
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) map.setView([points[0].lat, points[0].lon], 11)
    else map.fitBounds(latLngBounds(points.map((p) => [p.lat, p.lon])), { padding: [24, 24] })
  }, [map, key])
  return null
}

export function RideMap({ origin, samples, route, settings }: {
  origin: LatLon
  samples: RideSampleWeather[]
  route: Route | null
  settings: Settings
}) {
  const radiusMode = settings.mode === 'radius'
  const shown = samples.filter((s) => s.leg !== 'back')
  const bounds: LatLon[] = radiusMode ? samples : route ? route.line : [origin]

  return (
    <Card title="Ride Map" icon="📍">
      <div className="h-72 overflow-hidden rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800">
        <MapContainer center={[origin.lat, origin.lon]} zoom={10} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {radiusMode && settings.radiusKm > 0 && (
            <Circle
              center={[origin.lat, origin.lon]}
              radius={settings.radiusKm * 1000}
              pathOptions={{ color: '#f97316', weight: 2, fillOpacity: 0.08, dashArray: '6 6' }}
            />
          )}
          {route && (
            <Polyline
              positions={route.line.map((p): [number, number] => [p.lat, p.lon])}
              pathOptions={{ color: '#f97316', weight: 5, opacity: 0.85, dashArray: route.approximate ? '8 8' : undefined }}
            />
          )}
          {shown.map((s, i) => {
            const h = s.hours[0]
            if (!h) return null
            return (
              <CircleMarker
                key={i}
                center={[s.lat, s.lon]}
                radius={i === 0 ? 9 : 7}
                pathOptions={{ color: '#fff', weight: 2, fillColor: tempColor(h.temp), fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <strong>{s.label}</strong>
                  <br />
                  {codeIcon(h.code, h.isDay)} {codeLabel(h.code)} · {fmtTemp(h.temp, settings.units)} · ☔ {Math.round(h.precipProb)}%
                </Tooltip>
              </CircleMarker>
            )
          })}
          <FitBounds points={bounds} />
        </MapContainer>
      </div>
      {route?.approximate && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Couldn’t reach the routing service — showing a straight-line estimate.
        </p>
      )}
      {radiusMode && settings.radiusKm > 0 && (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          We check the weather at {samples.length} spots across your riding radius and plan for the worst of them.
        </p>
      )}
    </Card>
  )
}
