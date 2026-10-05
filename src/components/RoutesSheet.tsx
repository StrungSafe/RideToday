import { useState } from 'react'
import { getBrowserLocation, reverseGeocode } from '../lib/geo'
import type { RouteLibrary, SavedRoute } from '../lib/savedRoutes'
import type { MyPlaces, Place, UnitSystem } from '../lib/types'
import { PlaceSearch } from './PlaceSearch'
import { SavedRoutesList } from './SavedRoutes'
import { Sheet } from './Sheet'

type PlaceKey = keyof MyPlaces

const PLACE_META: Record<PlaceKey, { icon: string; label: string; hint: string }> = {
  home: { icon: '🏠', label: 'Home', hint: 'One tap to start any ride from home.' },
  work: { icon: '🏢', label: 'Work', hint: 'With Home set, gives you a one-tap commute both ways.' },
}

const samePlace = (a: Place, b: Place) => a.lat.toFixed(4) === b.lat.toFixed(4) && a.lon.toFixed(4) === b.lon.toFixed(4)

/** "Your Ride" settings: saved places (home / work) and saved routes. */
export function RoutesSheet({ open, onClose, places, onPlace, origin, lib, activeId, units, onRide, onRemove, onRename }: {
  open: boolean
  onClose: () => void
  places: MyPlaces
  onPlace: (key: PlaceKey, p: Place | null) => void
  /** Current start, offered as a quick way to set a place. */
  origin: Place | null
  lib: RouteLibrary
  activeId: string | null
  units: UnitSystem
  onRide: (r: SavedRoute) => void
  onRemove: (id: string) => string | null
  onRename: (id: string, name: string) => string | null
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Places & Routes" icon="💾" wide>
      <section>
        <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">My places</h3>
        <div className="space-y-2">
          {(['home', 'work'] as const).map((k) => (
            <PlaceRow key={k} kind={k} place={places[k]} origin={origin} onChange={(p) => onPlace(k, p)} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">Stored only in this browser.</p>
      </section>

      <section className="mt-5">
        <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Saved routes</h3>
        <SavedRoutesList
          lib={lib}
          activeId={activeId}
          units={units}
          onRide={(r) => {
            onRide(r)
            onClose()
          }}
          onRemove={onRemove}
          onRename={onRename}
        />
      </section>
    </Sheet>
  )
}

/** Why the search finds towns but not street addresses, and what to do instead. */
function AddressNote() {
  return (
    <details className="group rounded-xl bg-stone-100 px-3 py-2 text-[11px] text-stone-600 dark:bg-stone-800/70 dark:text-stone-300">
      <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">
        ℹ️ Search finds towns, not street addresses. For your exact spot, use <strong>📍 Use my current location</strong> while
        you’re there. <span className="text-throttle-600 underline group-open:hidden dark:text-throttle-400">Why?</span>
      </summary>
      <p className="mt-1.5">
        RideToday runs entirely in your browser, with no server and no accounts. Place search uses a free, open service
        (Open-Meteo) that only covers cities and towns. The services that can look up street addresses either need an API key
        tied to an account (usually paid) or, like OpenStreetMap’s free one, don’t allow search-as-you-type from apps
        like this one.
      </p>
      <p className="mt-1.5">
        Your location is better anyway: it’s accurate to your driveway, and it’s stored only in this browser.
      </p>
    </details>
  )
}

function PlaceRow({ kind, place, origin, onChange }: {
  kind: PlaceKey
  place: Place | null
  origin: Place | null
  onChange: (p: Place | null) => void
}) {
  const meta = PLACE_META[kind]
  const [editing, setEditing] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showForm = editing || !place

  const set = (p: Place) => {
    onChange(p)
    setEditing(false)
    setError(null)
  }

  const useMyLocation = async () => {
    setLocating(true)
    setError(null)
    try {
      const pos = await getBrowserLocation()
      set({ ...pos, name: (await reverseGeocode(pos)) ?? `My ${meta.label.toLowerCase()}` })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get your location.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 p-3 dark:border-stone-800">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{meta.label}</div>
          <div className={`truncate text-sm ${place ? 'font-semibold' : 'text-stone-400'}`}>{place ? place.name : 'Not set'}</div>
        </div>
        {place && !editing && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-throttle-600 hover:bg-throttle-50 dark:text-throttle-400 dark:hover:bg-stone-800"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={`Clear ${meta.label}`}
              title={`Clear ${meta.label}`}
              className="rounded-lg px-2 py-1 text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {showForm && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900"
            >
              {locating ? 'Locating…' : '📍 Use my current location'}
            </button>
            {origin && !(place && samePlace(place, origin)) && (
              <button
                type="button"
                onClick={() => set(origin)}
                className="max-w-full truncate rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:border-throttle-500 dark:border-stone-700"
              >
                Use current start ({origin.name.split(',')[0]})
              </button>
            )}
            {editing && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl px-3 py-1.5 text-xs text-stone-500">
                Cancel
              </button>
            )}
          </div>
          <PlaceSearch
            placeholder={`…or search a town for ${meta.label.toLowerCase()}`}
            onPick={set}
            addressHint="Street addresses can’t be searched — try your town, or use 📍 Use my current location."
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <AddressNote />
          {!place && <p className="text-[11px] text-stone-500 dark:text-stone-400">{meta.hint}</p>}
        </div>
      )}
    </div>
  )
}
