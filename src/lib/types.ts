export interface LatLon {
  lat: number
  lon: number
}

export interface Place extends LatLon {
  name: string
}

export type UnitSystem = 'imperial' | 'metric'
export type ThemePref = 'system' | 'light' | 'dark'

/** How the rider likes to feel: bundle up (warm), normal, or keep it cool. */
export type Comfort = 'warm' | 'normal' | 'cool'

/** Typical riding speed, used to work out wind chill at speed. */
export type SpeedProfile = 'city' | 'mixed' | 'highway'

export type RideMode = 'radius' | 'route'

export interface Settings {
  units: UnitSystem
  comfort: Comfort
  atgatt: boolean
  speed: SpeedProfile
  mode: RideMode
  /** Riding radius in km (0 = right here only). */
  radiusKm: number
  /** Ride duration in hours (radius mode). */
  durationHours: number
  /** Minutes from now until departure. */
  departInMinutes: number
  roundTrip: boolean
}

/** One hourly forecast sample at one location (all metric). */
export interface HourSample {
  time: number // unix seconds
  temp: number // °C
  feelsLike: number // °C
  humidity: number // %
  precipProb: number // %
  precip: number // mm
  code: number // WMO weather code
  wind: number // km/h
  gusts: number // km/h
  visibility: number // m
  uv: number
  isDay: boolean
}

export interface PointForecast extends LatLon {
  hours: HourSample[]
  sunrise: number[]
  sunset: number[]
  /** IANA time zone of the location, e.g. America/Denver. */
  timezone?: string
}

/** A location + time window we care about along the ride. */
export interface RideSample extends LatLon {
  label: string
  /** Route mode: distance from the start, and which leg of a round trip. */
  distKm?: number
  leg?: 'out' | 'back'
  /** Window (unix seconds) during which the rider is expected here. */
  from: number
  to: number
}

export interface RideSampleWeather extends RideSample {
  hours: HourSample[]
}

/** Aggregated conditions over the whole ride (all metric). */
export interface RideConditions {
  minTemp: number
  maxTemp: number
  avgTemp: number
  /** Coldest "feels like" at riding speed. */
  minRideFeel: number
  /** Warmest "feels like" while riding. */
  maxRideFeel: number
  maxPrecipProb: number
  totalPrecip: number
  maxWind: number
  maxGust: number
  minVisibility: number
  maxUV: number
  maxHumidity: number
  thunder: boolean
  snow: boolean
  fog: boolean
  /** Some part of the ride happens after sunset / before sunrise. */
  darkness: boolean
  /** Representative weather code (the most severe seen). */
  worstCode: number
  /** Most common code — what the sky mostly looks like. */
  typicalCode: number
}
