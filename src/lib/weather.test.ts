import { describe, expect, it } from 'vitest'
import { destination, distanceKm, radiusSamplePoints, samplePolyline } from './geo'
import { hoursInWindow, rideFeel, windChill } from './weather'
import type { HourSample } from './types'

describe('windChill', () => {
  it('matches the reference table (0 °C, 50 km/h ≈ -8 °C)', () => {
    expect(windChill(0, 50)).toBeCloseTo(-8.1, 0)
  })
  it('does nothing in calm air', () => {
    expect(windChill(5, 2)).toBe(5)
  })
})

describe('rideFeel', () => {
  it('is colder than air temp at speed when cool', () => {
    expect(rideFeel({ temp: 10, feelsLike: 10, wind: 0 }, 100)).toBeLessThan(5)
  })
  it('never feels cooler than air in serious heat', () => {
    expect(rideFeel({ temp: 35, feelsLike: 38, wind: 10 }, 100)).toBe(38)
  })
})

describe('geo', () => {
  const austin = { lat: 30.27, lon: -97.74 }
  it('destination() travels the requested distance', () => {
    expect(distanceKm(austin, destination(austin, 90, 50))).toBeCloseTo(50, 3)
  })
  it('radius points include center plus rings', () => {
    expect(radiusSamplePoints(austin, 0)).toHaveLength(1)
    expect(radiusSamplePoints(austin, 20)).toHaveLength(9)
    expect(radiusSamplePoints(austin, 80)).toHaveLength(13)
  })
  it('samplePolyline spaces points evenly including the ends', () => {
    const line = [austin, destination(austin, 0, 100)]
    const pts = samplePolyline(line, 5)
    expect(pts).toHaveLength(5)
    expect(pts[0].frac).toBe(0)
    expect(pts[4].frac).toBe(1)
    expect(distanceKm(pts[0], pts[2])).toBeCloseTo(50, 0)
  })
})

describe('hoursInWindow', () => {
  const h = (time: number) => ({ time }) as HourSample
  const hours = [0, 3600, 7200, 10800].map(h)
  it('includes the hour in progress at the start of the window', () => {
    expect(hoursInWindow(hours, 1800, 5400).map((x) => x.time)).toEqual([0, 3600])
  })
  it('falls back to the nearest hour outside the range', () => {
    expect(hoursInWindow(hours, 99999, 100000).map((x) => x.time)).toEqual([10800])
  })
})
