import { useEffect, useId, useRef, useState } from 'react'
import { KIND_ICON, searchAsYouType, searchNominatim, SOURCE_CREDIT, type SearchResult, type SearchSource } from '../lib/geocode'
import type { LatLon, Place } from '../lib/types'

type Status = 'idle' | 'searching' | 'done' | 'error'

/**
 * Place & address search box. Suggestions come from Photon as you type; if
 * nothing matches, the rider can run one explicit OpenStreetMap (Nominatim) search.
 */
export function PlaceSearch({ placeholder, onPick, autoFocus, bias }: {
  placeholder: string
  onPick: (p: Place) => void
  autoFocus?: boolean
  /** Prefer results near this point (e.g. the current start). */
  bias?: LatLon | null
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [source, setSource] = useState<SearchSource>('photon')
  const [status, setStatus] = useState<Status>('idle')
  const [deepSearched, setDeepSearched] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const biasKey = bias ? `${bias.lat.toFixed(1)},${bias.lon.toFixed(1)}` : ''

  // Search as you type (debounced).
  useEffect(() => {
    setDeepSearched(false)
    if (q.trim().length < 3) {
      setResults([])
      setStatus('idle')
      return
    }
    const ctrl = new AbortController()
    setStatus('searching')
    const t = setTimeout(() => {
      searchAsYouType(q, bias ?? null, ctrl.signal)
        .then((r) => {
          setResults(r.results)
          setSource(r.source)
          setActive(0)
          setStatus('done')
        })
        .catch(() => !ctrl.signal.aborted && setStatus('error'))
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // Bias only matters at ~10 km granularity, so key on that rather than the object.
  }, [q, biasKey])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  /** One explicit OpenStreetMap search (Nominatim doesn't allow search-as-you-type). */
  const deepSearch = async () => {
    setStatus('searching')
    setDeepSearched(true)
    try {
      const r = await searchNominatim(q)
      setResults(r)
      setSource('nominatim')
      setActive(0)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const pick = (r: SearchResult) => {
    onPick({ lat: r.lat, lon: r.lon, name: r.name })
    setQ('')
    setResults([])
    setStatus('idle')
    setOpen(false)
  }

  const canDeepSearch = !deepSearched && (status === 'done' || status === 'error') && results.length === 0
  const show = open && q.trim().length >= 3 && status !== 'idle'

  return (
    <div ref={boxRef} className="relative">
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={show && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') return setOpen(false)
          if (e.key === 'Enter') {
            e.preventDefault()
            if (results.length) pick(results[active])
            else if (canDeepSearch) deepSearch()
            return
          }
          if (!results.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => (a + 1) % results.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => (a - 1 + results.length) % results.length)
          }
        }}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none ring-throttle-500/40 placeholder:text-stone-400 focus:border-throttle-500 focus:ring-4 dark:border-stone-700 dark:bg-stone-800 dark:placeholder:text-stone-500"
      />
      {show && (
        <div className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-800">
          {results.length > 0 && (
            <ul id={listId} role="listbox">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lon},${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(r)}
                    className={`flex w-full gap-2 px-4 py-2 text-left text-sm ${i === active ? 'bg-throttle-50 dark:bg-stone-700' : ''}`}
                  >
                    <span aria-hidden>{KIND_ICON[r.kind]}</span>
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {status === 'searching' && <p className="px-4 py-2 text-sm text-stone-500">Searching…</p>}

          {status !== 'searching' && results.length === 0 && (
            <div className="px-4 py-2 text-sm text-stone-500 dark:text-stone-400">
              {status === 'error' ? 'Search is unavailable right now.' : deepSearched ? 'Still no match — try adding the town or state.' : 'No matches.'}
              {canDeepSearch && (
                <button
                  type="button"
                  onClick={deepSearch}
                  className="mt-1.5 block w-full rounded-xl border border-stone-200 px-3 py-1.5 text-left font-semibold text-throttle-600 hover:border-throttle-500 dark:border-stone-700 dark:text-throttle-400"
                >
                  🔎 Search OpenStreetMap for “{q.trim()}”
                </button>
              )}
            </div>
          )}

          {status === 'done' && results.length > 0 && (
            <p className="border-t border-stone-100 px-4 py-1 text-[10px] text-stone-400 dark:border-stone-700">{SOURCE_CREDIT[source]}</p>
          )}
        </div>
      )}
    </div>
  )
}
