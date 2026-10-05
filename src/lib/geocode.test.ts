import { describe, expect, it } from 'vitest'
import { nominatimToResult, photonToResult } from './geocode'

describe('photonToResult', () => {
  it('formats a US street address with the state', () => {
    const r = photonToResult(
      { housenumber: '1777', street: 'Broadway', city: 'Boulder', state: 'Colorado', countrycode: 'US', type: 'house' },
      [-105.2797, 40.0176],
    )
    expect(r).toMatchObject({ kind: 'address', name: '1777 Broadway, Boulder, Colorado', lat: 40.0176, lon: -105.2797 })
  })

  it('formats an address abroad with the country code', () => {
    const r = photonToResult({ housenumber: '10', street: 'Downing Street', city: 'London', countrycode: 'GB', type: 'house' }, [-0.1276, 51.5034])
    expect(r.name).toBe('10 Downing Street, London, GB')
  })

  it('formats a town without repeating parts', () => {
    const r = photonToResult({ name: 'Boulder', city: 'Boulder', state: 'Colorado', countrycode: 'US', type: 'city' }, [-105.27, 40.01])
    expect(r).toMatchObject({ kind: 'place', name: 'Boulder, Colorado, US' })
  })

  it('marks streets', () => {
    expect(photonToResult({ name: 'Pearl Street', city: 'Boulder', countrycode: 'US', type: 'street' }, [0, 0]).kind).toBe('street')
  })
})

describe('nominatimToResult', () => {
  it('builds a short address label from address details', () => {
    const r = nominatimToResult({
      lat: '40.0176',
      lon: '-105.2797',
      addresstype: 'building',
      name: 'Municipal Building',
      display_name: 'Municipal Building, 1777, Broadway, Boulder, Boulder County, Colorado, 80302, United States',
      address: { house_number: '1777', road: 'Broadway', city: 'Boulder', state: 'Colorado', country_code: 'us' },
    })
    expect(r).toMatchObject({ kind: 'address', name: '1777 Broadway, Boulder, Colorado', lat: 40.0176 })
  })
})
