import type { SpeedProfile, UnitSystem } from './types'

export const KM_PER_MILE = 1.609344

export const cToF = (c: number) => (c * 9) / 5 + 32

export function fmtTemp(c: number, units: UnitSystem, withUnit = true): string {
  const v = Math.round(units === 'imperial' ? cToF(c) : c)
  return withUnit ? `${v}°${units === 'imperial' ? 'F' : 'C'}` : `${v}°`
}

export function fmtSpeed(kmh: number, units: UnitSystem): string {
  return units === 'imperial'
    ? `${Math.round(kmh / KM_PER_MILE)} mph`
    : `${Math.round(kmh)} km/h`
}

export function fmtDistance(km: number, units: UnitSystem): string {
  const v = units === 'imperial' ? km / KM_PER_MILE : km
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10} ${units === 'imperial' ? 'mi' : 'km'}`
}

export function fmtPrecip(mm: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const inches = mm / 25.4
    return `${inches < 0.1 ? inches.toFixed(2) : inches.toFixed(1)} in`
  }
  return `${mm < 10 ? mm.toFixed(1) : Math.round(mm)} mm`
}

export function fmtVisibility(m: number, units: UnitSystem): string {
  return fmtDistance(m / 1000, units)
}

// Times are shown in the ride location's time zone (set when a forecast loads).
let displayTimeZone: string | undefined

export function setDisplayTimeZone(tz: string | undefined) {
  displayTimeZone = tz
}

export function fmtTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: displayTimeZone })
}

export function fmtHour(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString([], { hour: 'numeric', timeZone: displayTimeZone })
}

export function fmtDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export const SPEED_KMH: Record<SpeedProfile, number> = {
  city: 50,
  mixed: 75,
  highway: 105,
}

export function defaultUnits(): UnitSystem {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US'
  return /^(en-US|en-LR|my)/i.test(lang) || lang === 'en' ? 'imperial' : 'metric'
}
