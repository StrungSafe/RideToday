import { afterEach, describe, expect, it, vi } from 'vitest'
import { destination } from './geo'
import type { LoopRoute } from './loop'
import type { LatLon } from './types'
import { abToSaved, fmtBytes, loadLibrary, loopToSaved, saveLibrary, savedToLoop, STORAGE_KEY } from './savedRoutes'

const origin = { lat: 40, lon: -105, name: 'Home, CO' }

/** Shortest distance (m) from a point to a polyline, using a local flat projection. */
function distanceToLineM(p: LatLon, line: LatLon[]) {
  const mx = 111320 * Math.cos((p.lat * Math.PI) / 180)
  const my = 110540
  const xy = (q: LatLon) => [(q.lon - p.lon) * mx, (q.lat - p.lat) * my]
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = xy(line[i - 1])
    const [bx, by] = xy(line[i])
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return best
}

function fakeLoop(): LoopRoute {
  // A wiggly 30 km loop with a point every ~10 m.
  const line = Array.from({ length: 3000 }, (_, i) => {
    const a = (i / 3000) * 360
    return destination(destination(origin, 0, 5), a + 180 + Math.sin(i / 20) * 3, 5)
  })
  return {
    id: 'planned-1',
    line,
    distanceKm: 31.4,
    durationHours: 0.8,
    approximate: false,
    vias: [{ lat: 40.05, lon: -105.05, frac: 0.33 }],
    twistiness: 80,
    climbM: 400,
    overlap: 0,
    hasHighway: false,
    hasToll: false,
    funRating: 5,
    score: 3,
  }
}

describe('saved loops', () => {
  it('round-trips with a much smaller, still-faithful shape', () => {
    const loop = fakeLoop()
    const saved = loopToSaved(loop, origin, [], 'Test loop')
    const back = savedToLoop(saved)
    expect(saved.sourceId).toBe('planned-1')
    expect(back.line.length).toBeLessThan(loop.line.length / 3)
    expect(back.distanceKm).toBe(31.4)
    expect(back.funRating).toBe(5)
    // Every original point stays within ~8 m of the simplified line (5 m tolerance + rounding).
    for (const p of loop.line.filter((_, i) => i % 25 === 0)) {
      expect(distanceToLineM(p, back.line)).toBeLessThan(8)
    }
  })

  it('A → B routes only keep their endpoints', () => {
    const r = abToSaved(origin, { lat: 41, lon: -105, name: 'There' }, true, 'Trip')
    expect(JSON.stringify(r).length).toBeLessThan(300)
    expect(r.roundTrip).toBe(true)
  })
})

describe('library storage', () => {
  const store = new Map<string, string>()
  const fakeStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  }
  afterEach(() => {
    store.clear()
    vi.unstubAllGlobals()
  })

  it('saves and loads', () => {
    vi.stubGlobal('localStorage', fakeStorage)
    const lib = { homeId: null, routes: [abToSaved(origin, origin, false, 'x')] }
    expect(saveLibrary(lib)).toBeNull()
    expect(loadLibrary().routes[0].name).toBe('x')
  })

  it('reports a full storage instead of throwing', () => {
    vi.stubGlobal('localStorage', {
      ...fakeStorage,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    })
    expect(saveLibrary({ homeId: null, routes: [] })).toMatch(/full/)
  })

  it('ignores corrupt data', () => {
    vi.stubGlobal('localStorage', fakeStorage)
    store.set(STORAGE_KEY, '{not json')
    expect(loadLibrary().routes).toEqual([])
  })
})

describe('fmtBytes', () => {
  it('formats sizes', () => {
    expect(fmtBytes(512)).toBe('512 B')
    expect(fmtBytes(7168)).toBe('7.0 KB')
    expect(fmtBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
