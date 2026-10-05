import type { Comfort } from '../lib/types'
import { Sheet } from './Sheet'

const COMFORT: { value: Comfort; emoji: string; label: string; sub: string }[] = [
  { value: 'warm', emoji: '🔥', label: 'Toasty', sub: 'I get cold easily — bundle me up' },
  { value: 'normal', emoji: '😎', label: 'Normal', sub: 'Just tell me what’s right' },
  { value: 'cool', emoji: '🧊', label: 'Cool', sub: 'I run hot — keep it light' },
]

interface ProfileProps {
  comfort: Comfort
  onComfort: (c: Comfort) => void
  atgatt: boolean
  onAtgatt: (v: boolean) => void
}

function RiderProfileControls({ comfort, onComfort, atgatt, onAtgatt }: ProfileProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-300">How do you like to feel?</div>
        <div role="radiogroup" aria-label="Comfort preference" className="grid grid-cols-3 gap-2">
          {COMFORT.map((c) => {
            const active = comfort === c.value
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onComfort(c.value)}
                className={`rounded-2xl border-2 px-2 py-3 text-center transition-all ${
                  active
                    ? 'scale-[1.03] border-throttle-500 bg-throttle-50 shadow-md dark:bg-throttle-500/10'
                    : 'border-transparent bg-stone-100 hover:border-stone-300 dark:bg-stone-800 dark:hover:border-stone-600'
                }`}
              >
                <div className="text-2xl" aria-hidden>{c.emoji}</div>
                <div className="font-display text-sm font-semibold uppercase tracking-wide">{c.label}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">{c.sub}</div>
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={atgatt}
        aria-label="ATGATT mode: all the gear, all the time"
        onClick={() => onAtgatt(!atgatt)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
          atgatt
            ? 'border-throttle-500 bg-gradient-to-r from-throttle-500 to-amber-500 text-white shadow-lg shadow-throttle-500/25'
            : 'border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800'
        }`}
      >
        <span className="text-3xl" aria-hidden>{atgatt ? '🛡️' : '🧢'}</span>
        <span className="flex-1">
          <span className="block font-display text-base font-bold uppercase tracking-wide">
            ATGATT {atgatt ? 'mode: ON' : 'mode: off'}
          </span>
          <span className={`block text-xs ${atgatt ? 'text-white/90' : 'text-stone-500 dark:text-stone-400'}`}>
            All The Gear, All The Time — full armor every ride, no matter the weather.
          </span>
        </span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${atgatt ? 'bg-white/30' : 'bg-stone-300 dark:bg-stone-600'}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${atgatt ? 'left-6' : 'left-1'}`}
          />
        </span>
      </button>
    </div>
  )
}

/** Rider settings, opened from the loadout's gear button. */
export function RiderProfileSheet({ open, onClose, ...props }: ProfileProps & { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Rider Profile" icon="🧑‍🚀">
      <RiderProfileControls {...props} />
    </Sheet>
  )
}
