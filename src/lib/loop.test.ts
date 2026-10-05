import { describe, expect, it } from 'vitest'
import { destination, distanceKm } from './geo'
import { loopVias, overlapRatio, rateLoop, rng, twistiness } from './loop'
import { decodePolyline, encodePolyline, simplify } from './polyline'
import type { LatLon } from './types'

const home = { lat: 40, lon: -105 }

/** A line heading east from `start`, with points every `stepKm`, bending by `bendDeg` each step. */
function path(start: LatLon, steps: number, stepKm: number, bend: (i: number) => number) {
  const pts = [start]
  let heading = 90
  for (let i = 0; i < steps; i++) {
    heading += bend(i)
    pts.push(destination(pts[pts.length - 1], heading, stepKm))
  }
  return pts
}

describe('decodePolyline', () => {
  it('decodes the reference Google example (precision 5)', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)
    expect(pts).toHaveLength(3)
    expect(pts[0].lat).toBeCloseTo(38.5)
    expect(pts[0].lon).toBeCloseTo(-120.2)
    expect(pts[2].lat).toBeCloseTo(43.252)
    expect(pts[2].lon).toBeCloseTo(-126.453)
  })
  it('round-trips with encodePolyline', () => {
    const pts = path(home, 50, 0.3, (i) => (i % 7) - 3)
    const back = decodePolyline(encodePolyline(pts), 5)
    expect(back).toHaveLength(pts.length)
    back.forEach((p, i) => {
      expect(p.lat).toBeCloseTo(pts[i].lat, 4)
      expect(p.lon).toBeCloseTo(pts[i].lon, 4)
    })
  })
})

describe('simplify', () => {
  it('collapses a straight road to its ends', () => {
    expect(simplify(path(home, 200, 0.05, () => 0), 5)).toHaveLength(2)
  })
  it('keeps the shape of bends within tolerance', () => {
    const twisty = path(home, 300, 0.02, (i) => (Math.floor(i / 15) % 2 ? 6 : -6))
    const simple = simplify(twisty, 5)
    expect(simple.length).toBeLessThan(twisty.length / 2)
    // Every original point stays within ~5 m of the simplified line's vertices' neighbourhood.
    const maxGap = Math.max(...twisty.map((p) => Math.min(...simple.map((q) => distanceKm(p, q)))))
    expect(maxGap).toBeLessThan(0.2)
  })
})

describe('twistiness', () => {
  it('is ~0 for a straight road', () => {
    expect(twistiness(path(home, 100, 0.05, () => 0))).toBeLessThan(1)
  })
  it('ignores square city-grid turns', () => {
    // 500 m blocks with 90° turns alternating left/right
    const grid = path(home, 40, 0.1, (i) => (i % 5 === 4 ? (i % 10 === 4 ? 90 : -90) : 0))
    expect(twistiness(grid)).toBeLessThan(5)
  })
  it('is high for continuous S-bends', () => {
    const twisty = path(home, 200, 0.03, (i) => (Math.floor(i / 10) % 2 ? 9 : -9))
    expect(twistiness(twisty)).toBeGreaterThan(200)
  })
})

describe('overlapRatio', () => {
  it('is ~0 for a clean loop', () => {
    const circle = Array.from({ length: 361 }, (_, i) => destination({ lat: 40.1, lon: -105 }, i, 10))
    expect(overlapRatio(circle, circle[0])).toBeLessThan(0.05)
  })
  it('is high for an out-and-back ride', () => {
    const out = path(home, 100, 0.2, () => 0)
    expect(overlapRatio([...out, ...[...out].reverse()], home)).toBeGreaterThan(0.4)
  })
})

describe('loopVias', () => {
  it('places three vias at a sensible distance for the target loop size', () => {
    const vias = loopVias(home, 120, 45, true, rng(42))
    expect(vias).toHaveLength(3)
    for (const v of vias) {
      const d = distanceKm(home, v)
      expect(d).toBeGreaterThan(2)
      expect(d).toBeLessThan(120 / Math.PI) // never farther than the loop's diameter
    }
  })
  it('is reproducible for the same seed', () => {
    expect(loopVias(home, 100, 0, false, rng(7))).toEqual(loopVias(home, 100, 0, false, rng(7)))
  })
})

describe('rateLoop', () => {
  const base = { twistiness: 150, climbM: 1000, distanceKm: 120, durationHours: 2, overlap: 0, hasHighway: false }
  it('rates twisty hilly loops higher than flat straight ones', () => {
    expect(rateLoop(base, 2).funRating).toBeGreaterThan(rateLoop({ ...base, twistiness: 10, climbM: 50 }, 2).funRating)
  })
  it('penalizes missing the requested time, retracing, and highways', () => {
    const good = rateLoop(base, 2).score
    expect(rateLoop({ ...base, durationHours: 4 }, 2).score).toBeLessThan(good)
    expect(rateLoop({ ...base, overlap: 0.3 }, 2).score).toBeLessThan(good)
    expect(rateLoop({ ...base, hasHighway: true }, 2).score).toBeLessThan(good)
  })
  it('keeps the fun rating within 1–10', () => {
    expect(rateLoop({ ...base, twistiness: 0, climbM: 0 }, 2).funRating).toBe(1)
    expect(rateLoop({ ...base, twistiness: 900, climbM: 9000 }, 2).funRating).toBe(10)
  })
})
