import { useEffect, useState } from 'react'
import type { ThemePref } from '../lib/types'

const KEY = 'ridetoday.theme'

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'system'
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref)
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const dark = pref === 'dark' || (pref === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0c0a09' : '#f97316')
    try {
      localStorage.setItem(KEY, pref)
    } catch {
      /* ignore */
    }
  }, [dark, pref])

  return { pref, setPref, dark }
}
