import { useCallback, useEffect, useState } from 'react'
import { loadLibrary, saveLibrary, STORAGE_KEY, type RouteLibrary, type SavedRoute } from '../lib/savedRoutes'

/** The rider's saved routes (this browser only), kept in sync across open tabs. */
export function useSavedRoutes() {
  const [lib, setLib] = useState<RouteLibrary>(loadLibrary)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLib(loadLibrary())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Apply a change and persist it; returns an error message if storage failed (state is left unchanged). */
  const commit = useCallback(
    (next: RouteLibrary): string | null => {
      const err = saveLibrary(next)
      if (!err) setLib(next)
      return err
    },
    [],
  )

  const add = useCallback(
    (route: SavedRoute, makeHome: boolean) =>
      commit({ homeId: makeHome ? route.id : lib.homeId, routes: [route, ...lib.routes] }),
    [commit, lib],
  )

  const remove = useCallback(
    (id: string) => commit({ homeId: lib.homeId === id ? null : lib.homeId, routes: lib.routes.filter((r) => r.id !== id) }),
    [commit, lib],
  )

  const rename = useCallback(
    (id: string, name: string) => commit({ ...lib, routes: lib.routes.map((r) => (r.id === id ? { ...r, name } : r)) }),
    [commit, lib],
  )

  /** Make a route the home route, or clear it if it already is. */
  const toggleHome = useCallback(
    (id: string) => commit({ ...lib, homeId: lib.homeId === id ? null : id }),
    [commit, lib],
  )

  const home = lib.routes.find((r) => r.id === lib.homeId) ?? null
  return { lib, home, add, remove, rename, toggleHome }
}
