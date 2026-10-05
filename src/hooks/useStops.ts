import { useEffect, useState } from 'react'
import type { Route } from '../lib/geo'
import { fetchStops, type Stop } from '../lib/stops'

const ALL_KINDS = ['gas', 'food', 'bar'] as const

/**
 * Stops along a route. Always fetches every kind once per route, so toggling
 * Gas / Food / Bars in the UI is instant and doesn't re-query OpenStreetMap.
 */
export function useStops(route: (Route & { id: string }) | null) {
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; stops: Stop[]; routeId?: string }>({
    status: 'idle',
    stops: [],
  })

  useEffect(() => {
    if (!route) {
      setState({ status: 'idle', stops: [] })
      return
    }
    const ctrl = new AbortController()
    setState({ status: 'loading', stops: [], routeId: route.id })
    fetchStops(route, [...ALL_KINDS], ctrl.signal)
      .then((stops) => setState({ status: 'ready', stops, routeId: route.id }))
      .catch(() => !ctrl.signal.aborted && setState({ status: 'error', stops: [], routeId: route.id }))
    return () => ctrl.abort()
    // A route is identified by its id; re-run only when it changes.
  }, [route?.id])

  return state
}
