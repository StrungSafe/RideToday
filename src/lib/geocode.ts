import type { LatLon, Place } from './types'

/**
 * Place & address search, all free and key-less:
 * - Photon (komoot, OpenStreetMap data) for search-as-you-type, addresses included
 * - Open-Meteo town search as a fallback if Photon is down
 * - Nominatim (OpenStreetMap) for an explicit "search harder" — its usage policy
 *   forbids autocomplete and allows ~1 request/second, so it's only run on demand.
 */

export type ResultKind = 'address' | 'street' | 'place'

export interface SearchResult extends Place {
  kind: ResultKind
}

export type SearchSource = 'photon' | 'towns' | 'nominatim'

export const SOURCE_CREDIT: Record<SearchSource, string> = {
  photon: 'Search by Photon · © OpenStreetMap',
  towns: 'Town search by Open-Meteo',
  nominatim: 'Search by Nominatim · © OpenStreetMap',
}

/** Join name parts, skipping blanks and repeats ("Boulder, Boulder" → "Boulder"). */
function joinParts(parts: (string | undefined)[]) {
  const out: string[] = []
  for (const p of parts) if (p && !out.includes(p)) out.push(p)
  return out.join(', ')
}

// ── Photon ──────────────────────────────────────────────────────────────

interface PhotonProps {
  name?: string
  housenumber?: string
  street?: string
  city?: string
  district?: string
  county?: string
  state?: string
  countrycode?: string
  type?: string
}

export function photonToResult(p: PhotonProps, [lon, lat]: [number, number]): SearchResult {
  const kind: ResultKind = p.housenumber || p.type === 'house' ? 'address' : p.type === 'street' ? 'street' : 'place'
  const line1 = p.housenumber && p.street ? `${p.housenumber} ${p.street}` : (p.name ?? p.street)
  const town = p.city ?? p.district ?? p.county
  const name =
    kind === 'place'
      ? joinParts([line1, p.state, p.countrycode])
      : joinParts([line1, town, p.state && p.countrycode === 'US' ? p.state : p.countrycode])
  return { name, lat, lon, kind }
}

// Cache answers so retyping or backspacing doesn't re-query the free public server.
const photonCache = new Map<string, SearchResult[]>()

export async function searchPhoton(query: string, bias: LatLon | null, signal?: AbortSignal): Promise<SearchResult[]> {
  const q = query.trim()
  const key = `${q.toLowerCase()}|${bias ? `${bias.lat.toFixed(1)},${bias.lon.toFixed(1)}` : ''}`
  const hit = photonCache.get(key)
  if (hit) return hit
  const params = new URLSearchParams({ q, limit: '6', lang: 'en' })
  if (bias) {
    // Prefer results near where the rider is.
    params.set('lat', bias.lat.toFixed(3))
    params.set('lon', bias.lon.toFixed(3))
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal })
  if (!res.ok) throw new Error(`Photon search failed (${res.status})`)
  const data = (await res.json()) as { features?: { properties: PhotonProps; geometry: { coordinates: [number, number] } }[] }
  const results = (data.features ?? []).map((f) => photonToResult(f.properties, f.geometry.coordinates))
  photonCache.set(key, results)
  return results
}

// ── Open-Meteo (towns only) ──────────────────────────────────────────────

export async function searchTowns(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Place search failed')
  const data = await res.json()
  return (data.results ?? []).map(
    (r: { name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }) => ({
      name: joinParts([r.name, r.admin1, r.country_code]),
      lat: r.latitude,
      lon: r.longitude,
      kind: 'place' as const,
    }),
  )
}

/** Search-as-you-type: Photon first, towns-only search if Photon is unavailable. */
export async function searchAsYouType(
  query: string,
  bias: LatLon | null,
  signal?: AbortSignal,
): Promise<{ results: SearchResult[]; source: SearchSource }> {
  try {
    return { results: await searchPhoton(query, bias, signal), source: 'photon' }
  } catch (e) {
    if (signal?.aborted) throw e
    return { results: await searchTowns(query, signal), source: 'towns' }
  }
}

// ── Nominatim (on demand only) ───────────────────────────────────────────

interface NominatimResult {
  lat: string
  lon: string
  addresstype?: string
  name?: string
  display_name: string
  address?: Record<string, string>
}

export function nominatimToResult(r: NominatimResult): SearchResult {
  const a = r.address ?? {}
  const kind: ResultKind = a.house_number ? 'address' : r.addresstype === 'road' ? 'street' : 'place'
  const line1 = a.house_number && a.road ? `${a.house_number} ${a.road}` : r.name || a.road
  const town = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county
  const cc = a.country_code?.toUpperCase()
  return {
    name: line1 ? joinParts([line1, town, cc === 'US' ? a.state : cc]) : r.display_name.split(',').slice(0, 3).join(','),
    lat: +r.lat,
    lon: +r.lon,
    kind,
  }
}

let lastNominatim = 0

export async function searchNominatim(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  // Usage policy: at most one request per second.
  const wait = lastNominatim + 1100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastNominatim = Date.now()
  const params = new URLSearchParams({ q: query.trim(), format: 'jsonv2', addressdetails: '1', limit: '5' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  return ((await res.json()) as NominatimResult[]).map(nominatimToResult)
}

export const KIND_ICON: Record<ResultKind, string> = { address: '🏠', street: '🛣️', place: '📍' }
