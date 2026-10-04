import type { Comfort, RideConditions } from './types'

export type GearSlot =
  | 'helmet'
  | 'neck'
  | 'base'
  | 'mid'
  | 'jacket'
  | 'gloves'
  | 'pants'
  | 'boots'
  | 'rain'
  | 'extras'

export type GearLevel = 'must' | 'recommended' | 'optional'

export interface GearItem {
  slot: GearSlot
  icon: string
  name: string
  why: string
  level: GearLevel
}

export type TempBand = 'scorching' | 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'frigid' | 'arctic'

export interface BandInfo {
  band: TempBand
  label: string
  emoji: string
  blurb: string
}

/** Lower bound (°C, effective ride feel) for each band, warmest first. */
const BANDS: [TempBand, number, string, string, string][] = [
  ['scorching', 32, 'Scorching', '🔥', 'Heat is the hazard today. Vent everything and hydrate.'],
  ['hot', 27, 'Hot', '🥵', 'Mesh season. Keep moving and drink water.'],
  ['warm', 21, 'Warm', '😎', 'Prime riding weather. Vents open.'],
  ['mild', 15, 'Mild', '🙂', 'Comfortable. A light layer for the highway.'],
  ['cool', 9, 'Cool', '🧥', 'Crisp air at speed. Close the vents and add a layer.'],
  ['cold', 3, 'Cold', '🥶', 'Cold on the bike. Liners in, gauntlets on.'],
  ['frigid', -3, 'Frigid', '🧊', 'Heated gear territory. Watch for ice.'],
  ['arctic', -Infinity, 'Arctic', '☃️', 'Seriously cold. Only the dedicated (and heated) should ride.'],
]

/** How much a comfort preference shifts the effective temperature (°C). */
export const COMFORT_OFFSET: Record<Comfort, number> = {
  warm: -4, // likes to be warm → treat the day as colder → more layers
  normal: 0,
  cool: 4, // likes to be cool → treat the day as warmer → fewer layers
}

export function bandFor(effectiveC: number): BandInfo {
  const [band, , label, emoji, blurb] = BANDS.find(([, min]) => effectiveC >= min) ?? BANDS[BANDS.length - 1]
  return { band, label, emoji, blurb }
}

const BAND_ORDER: TempBand[] = ['arctic', 'frigid', 'cold', 'cool', 'mild', 'warm', 'hot', 'scorching']
const atMost = (b: TempBand, limit: TempBand) => BAND_ORDER.indexOf(b) <= BAND_ORDER.indexOf(limit)
const atLeast = (b: TempBand, limit: TempBand) => BAND_ORDER.indexOf(b) >= BAND_ORDER.indexOf(limit)

export interface GearPlan {
  /** Effective temp used for gear choice (coldest ride feel + comfort offset). */
  effectiveTemp: number
  band: BandInfo
  /** Band for the warmest part of the ride, if very different (big temp swing). */
  warmBand: BandInfo | null
  items: GearItem[]
  rainLevel: 'none' | 'pack' | 'wear'
  heated: boolean
}

export interface GearInput {
  conditions: RideConditions
  comfort: Comfort
  atgatt: boolean
}

export function recommendGear({ conditions: c, comfort, atgatt }: GearInput): GearPlan {
  const offset = COMFORT_OFFSET[comfort]
  const effectiveTemp = c.minRideFeel + offset
  const band = bandFor(effectiveTemp)
  const warmEffective = c.maxRideFeel + offset
  const warmBandInfo = bandFor(warmEffective)
  const warmBand =
    BAND_ORDER.indexOf(warmBandInfo.band) - BAND_ORDER.indexOf(band.band) >= 2 ? warmBandInfo : null
  const b = band.band

  const wetLikely = c.maxPrecipProb >= 60 || c.totalPrecip >= 1
  const wetPossible = c.maxPrecipProb >= 30 || c.totalPrecip >= 0.2
  const rainLevel: GearPlan['rainLevel'] = wetLikely ? 'wear' : wetPossible ? 'pack' : 'none'
  const heated = atMost(b, 'frigid') || (b === 'cold' && comfort === 'warm')
  const items: GearItem[] = []
  const add = (slot: GearSlot, icon: string, name: string, why: string, level: GearLevel = 'must') =>
    items.push({ slot, icon, name, why, level })

  // ── Helmet ───────────────────────────────────────────────
  {
    const visor = c.darkness
      ? 'clear visor'
      : c.maxUV >= 5 && c.maxPrecipProb < 50
        ? 'tinted visor or drop-down sun shield'
        : 'clear or light-smoke visor'
    const antiFog = atMost(b, 'cool') || wetPossible ? ' with a Pinlock anti-fog insert' : ''
    if (atgatt || atMost(b, 'cool') || wetPossible) {
      add('helmet', '🪖', 'Full-face helmet', `${cap(visor)}${antiFog}.`)
    } else {
      add(
        'helmet',
        '🪖',
        'Full-face or modular helmet',
        `${cap(visor)}. Open-face lids skip chin protection — your call, but full-face is the safe pick.`,
      )
    }
  }

  // ── Neck ─────────────────────────────────────────────────
  if (atMost(b, 'frigid')) add('neck', '🧣', 'Balaclava + neck warmer', 'Seal the gap between helmet and jacket — it’s where the cold sneaks in.')
  else if (atMost(b, 'cool')) add('neck', '🧣', 'Neck gaiter', 'Blocks the draft down your collar at speed.')
  else if (atLeast(b, 'hot')) add('neck', '💦', 'Cooling neck wrap', 'Soak it in water before you ride — evaporative cooling works wonders.', 'optional')

  // ── Base layer ───────────────────────────────────────────
  if (atLeast(b, 'hot')) add('base', '👕', 'Moisture-wicking shirt', 'Lightweight synthetic or cooling base layer. Skip cotton — it stays soggy.')
  else if (atLeast(b, 'mild')) add('base', '👕', 'Wicking T-shirt', 'Breathable base under your jacket.', 'recommended')
  else if (atLeast(b, 'cold')) add('base', '🧦', 'Thermal base layer (top & bottom)', 'Merino or synthetic long underwear keeps heat in without bulk.')
  else add('base', '🧦', 'Heavyweight merino base layers', 'Thick thermal top and bottoms — the foundation of staying warm.')

  // ── Mid layer ────────────────────────────────────────────
  if (b === 'mild' && comfort === 'warm') add('mid', '🧥', 'Light fleece or hoodie', 'You like it toasty — a thin layer for highway stretches.', 'optional')
  else if (b === 'cool') add('mid', '🧥', 'Light fleece or thermal liner', 'Zip-in liner or thin fleece for wind at speed.', 'recommended')
  else if (b === 'cold') add('mid', '🧥', 'Insulated jacket liner', heated ? 'Or a heated vest — you said you like it warm.' : 'Puffy liner or heavy fleece under your shell.')
  else if (atMost(b, 'frigid')) add('mid', '🔌', 'Heated jacket liner / vest', 'Wire it to the bike. Heated gear is the difference between fun and misery here.')

  // ── Jacket ───────────────────────────────────────────────
  if (atLeast(b, 'hot')) {
    add('jacket', '🧥', atgatt ? 'Armored mesh jacket' : 'Mesh jacket or armored riding shirt', 'CE armor at shoulders and elbows, max airflow. Back protector recommended.')
  } else if (b === 'warm') {
    add('jacket', '🧥', 'Mesh or vented textile jacket', 'Vents wide open. Armored, of course.')
  } else if (b === 'mild') {
    add('jacket', '🧥', 'All-season textile or leather jacket', 'Vents adjustable — open in town, close on the highway.')
  } else if (b === 'cool') {
    add('jacket', '🧥', 'Textile or leather jacket, vents closed', 'Wind-blocking shell keeps the chill off.')
  } else {
    add('jacket', '🧥', 'Insulated winter / touring jacket', 'Wind- and waterproof outer shell over your liner layers.')
  }

  // ── Gloves ───────────────────────────────────────────────
  if (atLeast(b, 'hot')) add('gloves', '🧤', atgatt ? 'Perforated short-cuff armored gloves' : 'Summer short-cuff gloves', 'Hard knuckles and palm sliders — your hands hit first in a fall.')
  else if (atLeast(b, 'mild')) add('gloves', '🧤', atgatt ? 'Gauntlet or short-cuff armored gloves' : 'All-season riding gloves', 'Mid-weight leather or textile.')
  else if (b === 'cool') add('gloves', '🧤', 'Insulated gauntlet gloves', 'Long cuffs over the jacket sleeves block drafts.')
  else if (b === 'cold') add('gloves', heated ? '🔌' : '🧤', heated ? 'Heated gloves or grip heaters' : 'Winter gauntlets (+ grip heaters if you have them)', 'Numb fingers mean slow reactions on the controls.')
  else add('gloves', '🔌', 'Heated gloves + grip heaters', 'Add handlebar muffs if you have them.')

  // ── Pants ────────────────────────────────────────────────
  if (atLeast(b, 'hot')) {
    add('pants', '👖', atgatt ? 'Armored mesh pants' : 'Riding jeans with knee armor', atgatt ? 'CE knee and hip armor, lots of airflow.' : 'Aramid-lined (AA-rated or better) with knee armor in the pockets.')
  } else if (atLeast(b, 'mild')) {
    add('pants', '👖', atgatt ? 'Textile or leather riding pants' : 'Armored riding jeans', atgatt ? 'CE knee and hip armor.' : 'Aramid-lined denim with knee armor. Regular jeans shred in a slide.')
  } else if (atLeast(b, 'cold')) {
    add('pants', '👖', atgatt ? 'Textile riding pants with thermal liner' : 'Riding jeans + over-pants or thermal liner', 'Knee armor plus a wind-blocking layer.')
  } else {
    add('pants', '👖', 'Insulated winter riding pants', 'Fully lined, windproof, with knee and hip armor.')
  }

  // ── Boots ────────────────────────────────────────────────
  {
    const waterproof = wetPossible || atMost(b, 'cool')
    if (atgatt) {
      add('boots', '🥾', waterproof ? 'Waterproof over-ankle riding boots' : atLeast(b, 'hot') ? 'Vented over-ankle riding boots' : 'Over-ankle riding boots', 'Ankle armor, stiff sole, oil-resistant grip.')
    } else {
      add('boots', '🥾', waterproof ? 'Waterproof riding boots' : 'Riding boots or riding shoes', 'At least ankle-high with a firm sole. Laces tucked away from the chain.')
    }
    if (atMost(b, 'cold')) add('boots', '🧦', heated ? 'Heated socks / insoles' : 'Wool riding socks', 'Toes get cold fast on the pegs.', heated ? 'recommended' : 'must')
  }

  // ── Rain ─────────────────────────────────────────────────
  if (rainLevel === 'wear') {
    add('rain', '🌧️', 'Rain suit on (or waterproof gear)', `${Math.round(c.maxPrecipProb)}% chance of rain along the ride. Hi-viz rain suit doubles as visibility.`)
    add('rain', '🧤', 'Waterproof gloves or glove covers', 'Wet hands go cold fast, even in summer.', 'recommended')
  } else if (rainLevel === 'pack') {
    add('rain', '🎒', 'Pack the rain suit', `${Math.round(c.maxPrecipProb)}% chance of showers. Stash it under the seat — just in case.`, 'recommended')
  }

  // ── Extras ───────────────────────────────────────────────
  add('extras', '🎧', 'Earplugs', 'Wind noise at highway speed causes real hearing damage.', 'recommended')
  if (c.darkness || c.minVisibility < 3000 || rainLevel === 'wear' || c.fog) {
    add('extras', '🦺', 'Hi-viz vest or reflective gear', c.darkness ? 'Part of your ride is after dark — be seen.' : 'Low visibility today — be seen.', 'recommended')
  }
  if (atLeast(b, 'warm') || c.maxTemp >= 27) {
    add('extras', '💧', 'Water / hydration pack', 'Dehydration sneaks up on you in gear. Sip at every stop.', atLeast(b, 'hot') ? 'must' : 'recommended')
  }
  if (c.maxUV >= 6) add('extras', '🧴', 'Sunscreen', `UV index up to ${Math.round(c.maxUV)} — neck and face burn fast.`, 'recommended')
  if (c.maxGust >= 50) add('extras', '💨', 'Snug-fitting gear', 'Gusty — flapping gear is exhausting. Cinch straps and tuck in.', 'optional')
  if (atgatt) add('extras', '🛡️', 'Back protector', 'Level 2 CE back armor — ATGATT, after all.', 'recommended')

  return { effectiveTemp, band, warmBand, items, rainLevel, heated }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Ride score ─────────────────────────────────────────────

export interface Hazard {
  icon: string
  title: string
  detail: string
  severity: 'info' | 'caution' | 'danger'
}

export interface RideScore {
  score: number
  verdict: string
  emoji: string
  hazards: Hazard[]
}

/** 0–100: how good is it to ride right now? Uses metric units internally. */
export function rideScore(c: RideConditions, comfort: Comfort): RideScore {
  const hazards: Hazard[] = []
  let score = 100
  const feelCold = c.minRideFeel + COMFORT_OFFSET[comfort]
  const feelHot = c.maxRideFeel + COMFORT_OFFSET[comfort]

  // Temperature comfort (ideal ride feel ~16–27 °C).
  if (feelCold < 16) score -= Math.min(45, (16 - feelCold) * 1.6)
  if (feelHot > 29) score -= Math.min(35, (feelHot - 29) * 3)

  // Rain
  score -= c.maxPrecipProb * 0.25
  score -= Math.min(20, c.totalPrecip * 4)
  if (c.maxPrecipProb >= 50 || c.totalPrecip >= 1) {
    hazards.push({ icon: '🌧️', title: 'Wet roads', detail: 'Painted lines, manhole covers and tar snakes get slick. Smooth inputs, bigger gaps.', severity: 'caution' })
  }

  // Wind
  if (c.maxGust >= 40) {
    score -= Math.min(25, (c.maxGust - 40) * 0.8)
    hazards.push({
      icon: '💨',
      title: c.maxGust >= 65 ? 'Strong gusts' : 'Gusty wind',
      detail: 'Relax your grip, grip the tank with your knees, and watch for gaps between trucks and buildings.',
      severity: c.maxGust >= 65 ? 'danger' : 'caution',
    })
  }

  // Severe stuff
  if (c.thunder) {
    score -= 35
    hazards.push({ icon: '⛈️', title: 'Thunderstorms', detail: 'Lightning, hail and sudden downpours. Consider waiting it out.', severity: 'danger' })
  }
  if (c.snow) {
    score -= 40
    hazards.push({ icon: '❄️', title: 'Snow', detail: 'Two wheels and snow don’t mix.', severity: 'danger' })
  }
  if (c.minTemp <= 3) {
    score -= c.minTemp <= 0 ? 25 : 12
    hazards.push({ icon: '🧊', title: 'Possible ice', detail: 'Bridges, overpasses and shaded corners freeze first. Cold tires have less grip too.', severity: c.minTemp <= 0 ? 'danger' : 'caution' })
  }
  if (c.fog || c.minVisibility < 1000) {
    score -= 15
    hazards.push({ icon: '🌫️', title: 'Low visibility', detail: 'Fog or haze — use your high-beam judiciously and slow down.', severity: 'caution' })
  }
  if (c.darkness) {
    score -= 8
    hazards.push({ icon: '🌙', title: 'Riding after dark', detail: 'Watch for wildlife and make yourself visible. Clear visor!', severity: 'info' })
  }
  if (feelHot >= 35) {
    hazards.push({ icon: '🔥', title: 'Heat stress', detail: 'Stop every hour for water and shade. Wet your base layer for evaporative cooling.', severity: 'caution' })
  }
  if (c.maxUV >= 8) {
    hazards.push({ icon: '☀️', title: 'Very high UV', detail: 'Sunscreen on any exposed skin and a tinted visor.', severity: 'info' })
  }

  score = Math.round(Math.max(0, Math.min(100, score)))
  const [verdict, emoji] =
    score >= 85
      ? ['Send it!', '🏍️💨']
      : score >= 70
        ? ['Great day to ride', '😎']
        : score >= 50
          ? ['Gear up & go', '🧥']
          : score >= 30
            ? ['Ride with caution', '⚠️']
            : ['Maybe take the cage', '🚗']

  const order = { danger: 0, caution: 1, info: 2 }
  hazards.sort((a, b) => order[a.severity] - order[b.severity])
  return { score, verdict, emoji, hazards }
}
