import { useEffect, type ReactNode } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import type { Route } from '../lib/geo'
import { STOP_META, type Stop } from '../lib/stops'
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

const stopIcon = (s: Stop, picked: boolean) =>
  divIcon({
    className: '',
    html: `<span class="stop-pin${picked ? ' stop-pin--picked' : ''}">${STOP_META[s.kind].icon}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

/** The map itself (no card chrome), so other cards can embed it. */
export function RideMapView({ origin, samples, route, settings, stops = [], pickedIds, className = 'h-80 md:h-96' }: {
  origin: LatLon
  samples: RideSampleWeather[]
  route: Route | null
  settings: Settings
  stops?: Stop[]
  pickedIds?: Set<string>
  className?: string
}) {
  const radiusMode = settings.mode === 'radius'
  const shown = samples.filter((s) => s.leg !== 'back')
  const bounds: LatLon[] = radiusMode ? samples : route ? route.line : [origin]

  return (
    <div className={`overflow-hidden rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 ${className}`}>
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
        {stops.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={stopIcon(s, !!pickedIds?.has(s.id))} zIndexOffset={pickedIds?.has(s.id) ? 1000 : 0}>
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{s.name}</strong>
              {s.detail && <> · {s.detail}</>}
            </Tooltip>
          </Marker>
        ))}
        <FitBounds points={bounds} />
      </MapContainer>
    </div>
  )
}

export function RideMap({ children, ...props }: {
  origin: LatLon
  samples: RideSampleWeather[]
  route: Route | null
  settings: Settings
  /** Extra content under the map (e.g. a save button). */
  children?: ReactNode
}) {
  const { route, settings, samples } = props
  const radiusMode = settings.mode === 'radius'
  return (
    <Card title="Ride Map" icon="📍">
      <RideMapView {...props} />
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
      {children && <div className="mt-3">{children}</div>}
    </Card>
  )
}
