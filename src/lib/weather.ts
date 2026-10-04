import type {
  HourSample,
  LatLon,
  PointForecast,
  RideConditions,
  RideSample,
  RideSampleWeather,
} from './types'
import { codeSeverity, isFog, isSnow, isThunder } from './wmo'

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'visibility',
  'uv_index',
  'is_day',
] as const

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  timezone?: string
  hourly: Record<(typeof HOURLY)[number] | 'time', (number | null)[]>
  daily: { sunrise: number[]; sunset: number[] }
}

const key = (p: LatLon) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`

/** Fetch hourly forecasts for many points in a single Open-Meteo request. */
export async function fetchForecasts(points: LatLon[], signal?: AbortSignal): Promise<Map<string, PointForecast>> {
  const unique = [...new Map(points.map((p) => [key(p), p])).values()]
  const params = new URLSearchParams({
    latitude: unique.map((p) => p.lat.toFixed(4)).join(','),
    longitude: unique.map((p) => p.lon.toFixed(4)).join(','),
    hourly: HOURLY.join(','),
    daily: 'sunrise,sunset',
    timeformat: 'unixtime',
    timezone: 'auto',
    forecast_days: '3',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) {
    let reason = `${res.status}`
    try {
      reason = (await res.json()).reason ?? reason
    } catch {
      /* ignore */
    }
    throw new Error(`Weather service error: ${reason}`)
  }
  const json = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[]
  const list = Array.isArray(json) ? json : [json]

  const out = new Map<string, PointForecast>()
  list.forEach((r, i) => {
    const h = r.hourly
    const n = (arr: (number | null)[], j: number, fallback = 0) => arr[j] ?? fallback
    const hours: HourSample[] = h.time.map((t, j) => ({
      time: t as number,
      temp: n(h.temperature_2m, j),
      feelsLike: n(h.apparent_temperature, j),
      humidity: n(h.relative_humidity_2m, j),
      precipProb: n(h.precipitation_probability, j),
      precip: n(h.precipitation, j),
      code: n(h.weather_code, j),
      wind: n(h.wind_speed_10m, j),
      gusts: n(h.wind_gusts_10m, j),
      visibility: n(h.visibility, j, 20000),
      uv: n(h.uv_index, j),
      isDay: n(h.is_day, j, 1) === 1,
    }))
    out.set(key(unique[i]), {
      lat: unique[i].lat,
      lon: unique[i].lon,
      hours,
      sunrise: r.daily.sunrise,
      sunset: r.daily.sunset,
      timezone: r.timezone,
    })
  })
  return out
}

export function forecastFor(map: Map<string, PointForecast>, p: LatLon): PointForecast | undefined {
  return map.get(key(p))
}

/** Hours overlapping the [from, to] window (unix seconds). Always returns at least one hour. */
export function hoursInWindow(hours: HourSample[], from: number, to: number): HourSample[] {
  const inside = hours.filter((h) => h.time <= to && h.time + 3600 > from)
  if (inside.length > 0) return inside
  // Window is outside the forecast range: use the nearest hour.
  let best = hours[0]
  for (const h of hours) if (Math.abs(h.time - from) < Math.abs(best.time - from)) best = h
  return best ? [best] : []
}

export function attachWeather(samples: RideSample[], map: Map<string, PointForecast>): RideSampleWeather[] {
  return samples.map((s) => ({ ...s, hours: hoursInWindow(forecastFor(map, s)?.hours ?? [], s.from, s.to) }))
}

/** Wind chill (Environment Canada / NWS formula), °C and km/h. */
export function windChill(tempC: number, windKmh: number): number {
  if (windKmh < 4.8) return tempC
  const v = windKmh ** 0.16
  return 13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v
}

/**
 * What the air feels like on the bike at riding speed.
 * Cold: wind chill at speed (plus some ambient wind). Hot: wind stops helping and
 * humid heat (apparent temperature) dominates.
 */
export function rideFeel(h: Pick<HourSample, 'temp' | 'feelsLike' | 'wind'>, rideSpeedKmh: number): number {
  const v = rideSpeedKmh + h.wind * 0.5
  const t = h.temp
  const chilled = Math.min(t, windChill(t, v))
  if (t <= 20) return chilled
  if (t < 30) {
    const w = (t - 20) / 10
    return chilled * (1 - w) + t * w
  }
  return Math.max(t, h.feelsLike)
}

export function summarize(samples: RideSampleWeather[], rideSpeedKmh: number): RideConditions | null {
  const all = samples.flatMap((s) => s.hours)
  if (all.length === 0) return null
  const feels = all.map((h) => rideFeel(h, rideSpeedKmh))
  const codeCounts = new Map<number, number>()
  for (const h of all) codeCounts.set(h.code, (codeCounts.get(h.code) ?? 0) + 1)
  let typicalCode = all[0].code
  for (const [c, n] of codeCounts) if (n > (codeCounts.get(typicalCode) ?? 0)) typicalCode = c

  // Precip total: sum per sample location, then take the wettest location.
  const totalPrecip = Math.max(...samples.map((s) => s.hours.reduce((a, h) => a + h.precip, 0)))

  return {
    minTemp: Math.min(...all.map((h) => h.temp)),
    maxTemp: Math.max(...all.map((h) => h.temp)),
    avgTemp: all.reduce((a, h) => a + h.temp, 0) / all.length,
    minRideFeel: Math.min(...feels),
    maxRideFeel: Math.max(...feels),
    maxPrecipProb: Math.max(...all.map((h) => h.precipProb)),
    totalPrecip,
    maxWind: Math.max(...all.map((h) => h.wind)),
    maxGust: Math.max(...all.map((h) => h.gusts)),
    minVisibility: Math.min(...all.map((h) => h.visibility)),
    maxUV: Math.max(...all.map((h) => h.uv)),
    maxHumidity: Math.max(...all.map((h) => h.humidity)),
    thunder: all.some((h) => isThunder(h.code)),
    snow: all.some((h) => isSnow(h.code)),
    fog: all.some((h) => isFog(h.code)),
    darkness: all.some((h) => !h.isDay),
    worstCode: all.reduce((w, h) => (codeSeverity(h.code) > codeSeverity(w) ? h.code : w), all[0].code),
    typicalCode,
  }
}
