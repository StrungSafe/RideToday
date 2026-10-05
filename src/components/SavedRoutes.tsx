import { useState } from 'react'
import { fmtBytes, libraryBytes, type RouteLibrary, type SavedRoute } from '../lib/savedRoutes'
import type { UnitSystem } from '../lib/types'
import { fmtDistance, fmtDuration } from '../lib/units'

export function routeMeta(r: SavedRoute, units: UnitSystem) {
  if (r.kind === 'loop') {
    const s = r.stats
    return `Loop · ${fmtDistance(s.distanceKm, units)} · ${fmtDuration(Math.round(s.durationHours * 4) / 4)} · fun ${s.funRating}/10`
  }
  return `A → B${r.roundTrip ? ' · round trip' : ''}`
}

/** The rider's saved routes, newest first. */
export function SavedRoutesList({ lib, activeId, units, onRide, onRemove, onRename }: {
  lib: RouteLibrary
  activeId: string | null
  units: UnitSystem
  onRide: (r: SavedRoute) => void
  onRemove: (id: string) => string | null
  onRename: (id: string, name: string) => string | null
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => string | null) => setError(fn())

  const routes = [...lib.routes].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div>
      {routes.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Save a <strong>Just ride</strong> loop or an <strong>A → B</strong> route with 💾 Save route to keep it here.
        </p>
      ) : (
        <ul className="space-y-2">
          {routes.map((r) => {
            const active = r.id === activeId
            return (
              <li key={r.id} className="rounded-2xl border border-stone-200 p-3 dark:border-stone-800">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg" aria-hidden>{r.kind === 'loop' ? '🎲' : '🛣️'}</span>
                  <div className="min-w-0 flex-1">
                    {editing === r.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
                          if (name) run(() => onRename(r.id, name))
                          setEditing(null)
                        }}
                      >
                        <input
                          name="name"
                          defaultValue={r.name}
                          autoFocus
                          maxLength={60}
                          aria-label="Route name"
                          onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                          className="w-full rounded-lg border border-throttle-500 bg-white px-2 py-1 text-sm outline-none dark:bg-stone-800"
                        />
                      </form>
                    ) : (
                      <div className="truncate font-semibold">{r.name}</div>
                    )}
                    <div className="text-xs text-stone-500 dark:text-stone-400">{routeMeta(r, units)}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onRide(r)}
                    disabled={active}
                    className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:bg-green-600 disabled:opacity-100 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white dark:disabled:bg-green-500 dark:disabled:text-white"
                  >
                    {active ? '✓ Showing' : '🏍️ Ride it'}
                  </button>
                  <IconButton label="Rename" onClick={() => setEditing(r.id)}>
                    ✏️
                  </IconButton>
                  {confirmDelete === r.id ? (
                    <span className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          run(() => onRemove(r.id))
                          setConfirmDelete(null)
                        }}
                        className="rounded-lg bg-red-600 px-2 py-1 font-semibold text-white"
                      >
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1 text-stone-500">
                        Keep
                      </button>
                    </span>
                  ) : (
                    <IconButton label="Delete" onClick={() => setConfirmDelete(r.id)}>
                      🗑️
                    </IconButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {routes.length > 0 && (
        <p className="mt-3 text-[11px] text-stone-500 dark:text-stone-400">
          {routes.length} route{routes.length === 1 ? '' : 's'} · {fmtBytes(libraryBytes(lib))} in this browser (not synced to other devices)
        </p>
      )}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-lg text-sm transition hover:bg-stone-100 dark:hover:bg-stone-800"
    >
      <span aria-hidden>{children}</span>
    </button>
  )
}
