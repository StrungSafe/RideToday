/** WMO weather interpretation codes, as used by Open-Meteo. */
interface CodeInfo {
  label: string
  day: string
  night: string
  /** Higher = worse for riding. Used to pick the "worst" code over a ride. */
  severity: number
}

const CODES: Record<number, CodeInfo> = {
  0: { label: 'Clear sky', day: '☀️', night: '🌙', severity: 0 },
  1: { label: 'Mostly clear', day: '🌤️', night: '🌙', severity: 1 },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️', severity: 2 },
  3: { label: 'Overcast', day: '☁️', night: '☁️', severity: 3 },
  45: { label: 'Fog', day: '🌫️', night: '🌫️', severity: 20 },
  48: { label: 'Freezing fog', day: '🌫️', night: '🌫️', severity: 40 },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌧️', severity: 10 },
  53: { label: 'Drizzle', day: '🌦️', night: '🌧️', severity: 12 },
  55: { label: 'Heavy drizzle', day: '🌧️', night: '🌧️', severity: 15 },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️', severity: 45 },
  57: { label: 'Heavy freezing drizzle', day: '🌧️', night: '🌧️', severity: 50 },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️', severity: 14 },
  63: { label: 'Rain', day: '🌧️', night: '🌧️', severity: 18 },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️', severity: 25 },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️', severity: 55 },
  67: { label: 'Heavy freezing rain', day: '🌧️', night: '🌧️', severity: 60 },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️', severity: 40 },
  73: { label: 'Snow', day: '🌨️', night: '🌨️', severity: 50 },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️', severity: 60 },
  77: { label: 'Snow grains', day: '🌨️', night: '🌨️', severity: 40 },
  80: { label: 'Light showers', day: '🌦️', night: '🌧️', severity: 14 },
  81: { label: 'Showers', day: '🌧️', night: '🌧️', severity: 18 },
  82: { label: 'Violent showers', day: '⛈️', night: '⛈️', severity: 30 },
  85: { label: 'Snow showers', day: '🌨️', night: '🌨️', severity: 45 },
  86: { label: 'Heavy snow showers', day: '❄️', night: '❄️', severity: 55 },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️', severity: 65 },
  96: { label: 'Thunderstorm w/ hail', day: '⛈️', night: '⛈️', severity: 70 },
  99: { label: 'Severe thunderstorm w/ hail', day: '⛈️', night: '⛈️', severity: 75 },
}

const UNKNOWN: CodeInfo = { label: 'Unknown', day: '❔', night: '❔', severity: 0 }

export const codeInfo = (code: number): CodeInfo => CODES[code] ?? UNKNOWN
export const codeLabel = (code: number) => codeInfo(code).label
export const codeIcon = (code: number, isDay = true) =>
  isDay ? codeInfo(code).day : codeInfo(code).night
export const codeSeverity = (code: number) => codeInfo(code).severity

export const isThunder = (code: number) => code >= 95
export const isSnow = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86
export const isFreezingPrecip = (code: number) => [48, 56, 57, 66, 67].includes(code)
export const isFog = (code: number) => code === 45 || code === 48
export const isWet = (code: number) => code >= 51
