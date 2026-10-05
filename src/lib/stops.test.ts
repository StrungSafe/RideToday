import { describe, expect, it } from 'vitest'
import { buildGpx, googleMapsLoopUrl, GOOGLE_MAX_WAYPOINTS } from './export'
import { idealFrac, rankStops, type Stop } from './stops'

const stop = (p: Partial<Stop>): Stop => ({
  id: Math.random().toString(36),
  kind: 'food',
  name: 'Place',
  lat: 40,
  lon: -105,
  frac: 0.5,
  alongKm: 50,
  offKm: 0.1,
  bikerSpot: false,
  fastFood: false,
  ...p,
})

describe('idealFrac', () => {
  it('puts food halfway and bars at the finish', () => {
    expect(idealFrac('food', 100)).toBe(0.5)
    expect(idealFrac('bar', 100)).toBeGreaterThan(0.9)
  })
  it('suggests gas early on short loops and mid-way on long ones', () => {
    expect(idealFrac('gas', 80)).toBeLessThan(0.2)
    expect(idealFrac('gas', 250)).toBe(0.5)
  })
})

describe('rankStops', () => {
  it('prefers stops near the ideal spot and close to the road', () => {
    const near = stop({ name: 'Near', frac: 0.5 })
    const far = stop({ name: 'Far', frac: 0.1 })
    const detour = stop({ name: 'Detour', frac: 0.5, offKm: 0.6 })
    expect(rankStops([far, detour, near], 'food', 100).map((s) => s.name)).toEqual(['Near', 'Detour', 'Far'])
  })
  it('ranks a local spot over chain fast food, and biker spots highest', () => {
    const chain = stop({ name: 'Chain', fastFood: true })
    const local = stop({ name: 'Local', frac: 0.55 })
    const biker = stop({ name: 'Biker Diner', frac: 0.6, bikerSpot: true })
    expect(rankStops([chain, local, biker], 'food', 100).map((s) => s.name)).toEqual(['Biker Diner', 'Local', 'Chain'])
  })
  it('only returns the requested kind', () => {
    expect(rankStops([stop({ kind: 'gas' }), stop({ kind: 'bar' })], 'bar', 100)).toHaveLength(1)
  })
})

describe('export', () => {
  const home = { lat: 40, lon: -105 }
  it('Google Maps link starts and ends at home with waypoints in ride order', () => {
    const url = new URL(
      googleMapsLoopUrl(home, [
        { lat: 41, lon: -105, frac: 0.7, name: 'b' },
        { lat: 42, lon: -105, frac: 0.2, name: 'a' },
      ]),
    )
    expect(url.searchParams.get('origin')).toBe(url.searchParams.get('destination'))
    expect(url.searchParams.get('waypoints')).toBe('42.000000,-105.000000|41.000000,-105.000000')
  })
  it('caps Google Maps waypoints', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ lat: 40 + i / 10, lon: -105, frac: i / 15, name: `${i}` }))
    expect(new URL(googleMapsLoopUrl(home, many)).searchParams.get('waypoints')!.split('|')).toHaveLength(GOOGLE_MAX_WAYPOINTS)
  })
  it('GPX escapes names and includes track and waypoints', () => {
    const gpx = buildGpx('Loop', [home, { lat: 40.1, lon: -105 }], [{ ...home, frac: 0, name: 'Bar & Grill <3' }])
    expect(gpx).toContain('<name>Bar &amp; Grill &lt;3</name>')
    expect(gpx.match(/<trkpt/g)).toHaveLength(2)
  })
})
