import { useCallback, useEffect, useState } from 'react'
import { planLoops, type LoopRoute } from '../lib/loop'
import type { LatLon } from '../lib/types'

export interface LoopState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  loops: LoopRoute[]
  index: number
  /** Which candidate is being routed while loading (for a progress hint). */
  progress: { done: number; total: number }
}

// Plans are expensive (several routing calls) — remember them for the session.
const cache = new Map<string, LoopRoute[]>()

/**
 * Plans "just ride" loops from the origin. `shuffle()` steps through the
 * candidates, then plans a fresh batch once they're used up.
 */
export function useLoopRoute(origin: LatLon | null, enabled: boolean, hours: number, avoidHighways: boolean) {
  const [seed, setSeed] = useState(1)
  const [state, setState] = useState<LoopState>({ status: 'idle', loops: [], index: 0, progress: { done: 0, total: 0 } })

  // New ride settings start over from the first batch.
  useEffect(() => setSeed(1), [origin, hours, avoidHighways])

  useEffect(() => {
    if (!enabled || !origin) return
    const key = `${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}|${hours}|${avoidHighways}|${seed}`
    const cached = cache.get(key)
    if (cached) {
      setState({ status: 'ready', loops: cached, index: 0, progress: { done: 0, total: 0 } })
      return
    }
    const ctrl = new AbortController()
    setState((s) => ({ ...s, status: 'loading', error: undefined, progress: { done: 0, total: 3 } }))
    // Debounce slider drags before hitting the routing server.
    const timer = setTimeout(() => {
      planLoops(origin, hours, avoidHighways, seed, (done, total) => setState((s) => ({ ...s, progress: { done, total } })), ctrl.signal)
        .then((loops) => {
          cache.set(key, loops)
          setState({ status: 'ready', loops, index: 0, progress: { done: 0, total: 0 } })
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return
          setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : String(e) }))
        })
    }, 500)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [enabled, origin, hours, avoidHighways, seed])

  const canStep = state.status === 'ready' && state.index < state.loops.length - 1
  const shuffle = useCallback(() => {
    if (canStep) setState((s) => ({ ...s, index: s.index + 1 }))
    else setSeed((n) => n + 1)
  }, [canStep])

  return { ...state, loop: state.status === 'ready' ? (state.loops[state.index] ?? null) : null, shuffle }
}
