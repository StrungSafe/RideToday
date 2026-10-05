import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import type { LatLon } from '../lib/types'

const PIN = divIcon({ className: '', html: '<span class="map-pin">📌</span>', iconSize: [32, 32], iconAnchor: [9, 30] })

function TapToPin({ onTap }: { onTap: (p: LatLon) => void }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lon: e.latlng.lng }) })
  return null
}

/** Tap (or drag) a pin on a small map — exact, and no search needed. */
export function PinPicker({ initial, center, onPick, onCancel }: {
  /** Existing spot to fine-tune, if any. */
  initial: LatLon | null
  /** Where to open the map when there's no pin yet. */
  center: LatLon | null
  onPick: (p: LatLon) => void
  onCancel: () => void
}) {
  const [pin, setPin] = useState<LatLon | null>(initial)
  const start = initial ?? center
  const handlers = useMemo(
    () => ({
      dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
        const ll = e.target.getLatLng()
        setPin({ lat: ll.lat, lon: ll.lng })
      },
    }),
    [],
  )

  return (
    <div className="space-y-2">
      <div className="h-56 overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-700">
        <MapContainer
          center={start ? [start.lat, start.lon] : [39.8, -98.6]}
          zoom={initial ? 17 : start ? 13 : 4}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TapToPin onTap={setPin} />
          {pin && <Marker position={[pin.lat, pin.lon]} icon={PIN} draggable eventHandlers={handlers} />}
        </MapContainer>
      </div>
      <p className="text-[11px] text-stone-500 dark:text-stone-400">
        {pin ? 'Drag the pin or tap elsewhere to move it.' : 'Zoom in and tap the map to drop a pin.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!pin}
          onClick={() => pin && onPick(pin)}
          className="flex-1 rounded-xl bg-throttle-500 px-3 py-2 text-sm font-semibold text-white hover:bg-throttle-600 disabled:opacity-50"
        >
          Use this spot
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
          Cancel
        </button>
      </div>
    </div>
  )
}
