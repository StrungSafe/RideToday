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

  const add = useCallback((route: SavedRoute) => commit({ routes: [route, ...lib.routes] }), [commit, lib])

  const remove = useCallback(
    (id: string) => commit({ routes: lib.routes.filter((r) => r.id !== id) }),
    [commit, lib],
  )

  const rename = useCallback(
    (id: string, name: string) => commit({ routes: lib.routes.map((r) => (r.id === id ? { ...r, name } : r)) }),
    [commit, lib],
  )

  return { lib, add, remove, rename }
}
