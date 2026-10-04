import { describe, expect, it } from 'vitest'
import { bandFor, recommendGear, rideScore } from './gear'
import type { RideConditions } from './types'

const base: RideConditions = {
  minTemp: 22,
  maxTemp: 24,
  avgTemp: 23,
  minRideFeel: 22,
  maxRideFeel: 24,
  maxPrecipProb: 0,
  totalPrecip: 0,
  maxWind: 10,
  maxGust: 20,
  minVisibility: 20000,
  maxUV: 3,
  maxHumidity: 50,
  thunder: false,
  snow: false,
  fog: false,
  darkness: false,
  worstCode: 1,
  typicalCode: 1,
}
const cond = (p: Partial<RideConditions>): RideConditions => ({ ...base, ...p })
const names = (plan: ReturnType<typeof recommendGear>) => plan.items.map((i) => i.name).join(' | ')

describe('bandFor', () => {
  it('maps temps to bands', () => {
    expect(bandFor(35).band).toBe('scorching')
    expect(bandFor(23).band).toBe('warm')
    expect(bandFor(10).band).toBe('cool')
    expect(bandFor(-10).band).toBe('arctic')
  })
})

describe('recommendGear', () => {
  it('always includes helmet, jacket, gloves, pants and boots', () => {
    for (const t of [-10, 0, 10, 20, 30, 40]) {
      for (const atgatt of [true, false]) {
        const plan = recommendGear({ conditions: cond({ minRideFeel: t, maxRideFeel: t }), comfort: 'normal', atgatt })
        const slots = new Set(plan.items.map((i) => i.slot))
        for (const s of ['helmet', 'jacket', 'gloves', 'pants', 'boots'] as const) expect(slots.has(s)).toBe(true)
      }
    }
  })

  it('comfort preference shifts the band', () => {
    const c = cond({ minRideFeel: 18, maxRideFeel: 18 })
    expect(recommendGear({ conditions: c, comfort: 'normal', atgatt: false }).band.band).toBe('mild')
    expect(recommendGear({ conditions: c, comfort: 'warm', atgatt: false }).band.band).toBe('cool')
    expect(recommendGear({ conditions: c, comfort: 'cool', atgatt: false }).band.band).toBe('warm')
  })

  it('ATGATT gets armored pants instead of jeans', () => {
    const c = cond({ minRideFeel: 30, maxRideFeel: 30 })
    expect(names(recommendGear({ conditions: c, comfort: 'normal', atgatt: false }))).toMatch(/jeans/i)
    const atgatt = recommendGear({ conditions: c, comfort: 'normal', atgatt: true })
    expect(names(atgatt)).toMatch(/Armored mesh pants/)
    expect(names(atgatt)).toMatch(/Back protector/)
  })

  it('recommends heated gear when frigid', () => {
    const plan = recommendGear({ conditions: cond({ minRideFeel: -5, maxRideFeel: -2, minTemp: 2 }), comfort: 'normal', atgatt: false })
    expect(plan.heated).toBe(true)
    expect(names(plan)).toMatch(/Heated/)
  })

  it('rain levels', () => {
    expect(recommendGear({ conditions: cond({ maxPrecipProb: 10 }), comfort: 'normal', atgatt: false }).rainLevel).toBe('none')
    expect(recommendGear({ conditions: cond({ maxPrecipProb: 40 }), comfort: 'normal', atgatt: false }).rainLevel).toBe('pack')
    expect(recommendGear({ conditions: cond({ maxPrecipProb: 80 }), comfort: 'normal', atgatt: false }).rainLevel).toBe('wear')
  })

  it('flags a big temperature swing', () => {
    const plan = recommendGear({ conditions: cond({ minRideFeel: 5, maxRideFeel: 28 }), comfort: 'normal', atgatt: false })
    expect(plan.band.band).toBe('cold')
    expect(plan.warmBand?.band).toBe('hot')
  })
})

describe('rideScore', () => {
  it('scores a perfect day high', () => {
    expect(rideScore(base, 'normal').score).toBeGreaterThanOrEqual(85)
  })

  it('scores thunderstorms and ice low with danger hazards', () => {
    const s = rideScore(cond({ thunder: true, maxPrecipProb: 90, totalPrecip: 8, minTemp: 1, minRideFeel: -5 }), 'normal')
    expect(s.score).toBeLessThan(30)
    expect(s.hazards[0].severity).toBe('danger')
  })
})
