import { useEffect, useId, useRef, useState } from 'react'
import { searchPlaces } from '../lib/geo'
import type { Place } from '../lib/types'

/** Town names almost never contain digits; street addresses almost always do. */
const looksLikeAddress = (q: string) => /\d/.test(q)

export function PlaceSearch({ placeholder, onPick, autoFocus, addressHint }: {
  placeholder: string
  onPick: (p: Place) => void
  autoFocus?: boolean
  /** Shown instead of "No places found" when the search looks like a street address. */
  addressHint?: string
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const listId = useId()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then((r) => {
          setResults(r)
          setActive(0)
          setError(r.length ? null : addressHint && looksLikeAddress(q) ? addressHint : 'No places found')
        })
        .catch(() => !ctrl.signal.aborted && setError('Search unavailable'))
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, addressHint])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (p: Place) => {
    onPick(p)
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!results.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => (a + 1) % results.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => (a - 1 + results.length) % results.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            pick(results[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none ring-throttle-500/40 placeholder:text-stone-400 focus:border-throttle-500 focus:ring-4 dark:border-stone-700 dark:bg-stone-800 dark:placeholder:text-stone-500"
      />
      {open && q.trim().length >= 2 && (results.length > 0 || error) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-800"
        >
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lon}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(r)}
                className={`block w-full px-4 py-2 text-left text-sm ${i === active ? 'bg-throttle-50 dark:bg-stone-700' : ''}`}
              >
                📍 {r.name}
              </button>
            </li>
          ))}
          {results.length === 0 && error && <li className="px-4 py-2 text-sm text-stone-500">{error}</li>}
        </ul>
      )}
    </div>
  )
}
