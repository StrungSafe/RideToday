import { useEffect, useState } from 'react'

/** useState that persists to localStorage (best-effort; works without storage). */
export function useStoredState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return fallback
      const parsed = JSON.parse(raw)
      // Merge objects so newly added settings get defaults.
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && fallback && typeof fallback === 'object'
        ? { ...fallback, ...parsed }
        : parsed
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable */
    }
  }, [key, value])

  return [value, setValue] as const
}
