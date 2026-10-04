import type { GearItem, GearLevel, GearPlan } from '../lib/gear'
import type { UnitSystem } from '../lib/types'
import { fmtTemp } from '../lib/units'
import { RiderAvatar } from './RiderAvatar'
import { Card } from './ui'

const SLOT_LABEL: Record<GearItem['slot'], string> = {
  helmet: 'Head',
  neck: 'Neck',
  base: 'Base layer',
  mid: 'Mid layer',
  jacket: 'Jacket',
  gloves: 'Hands',
  pants: 'Legs',
  boots: 'Feet',
  rain: 'Rain',
  extras: 'Extras',
}

const LEVEL: Record<GearLevel, { label: string; cls: string }> = {
  must: { label: 'Wear', cls: 'bg-throttle-500 text-white' },
  recommended: { label: 'Recommended', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
  optional: { label: 'Optional', cls: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300' },
}

export function GearLoadout({ plan, atgatt, gusty, units }: {
  plan: GearPlan
  atgatt: boolean
  gusty: boolean
  units: UnitSystem
}) {
  return (
    <Card
      title="Today’s Loadout"
      icon="🎒"
      action={
        atgatt ? (
          <span className="rounded-full bg-throttle-500 px-2.5 py-1 font-display text-xs font-bold uppercase tracking-wider text-white">
            🛡️ ATGATT
          </span>
        ) : undefined
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,200px)_1fr]">
        <div className="flex flex-col items-center">
          <div className="h-64 w-44 md:h-72 md:w-48">
            <RiderAvatar plan={plan} atgatt={atgatt} gusty={gusty} />
          </div>
          <div className="mt-2 text-center">
            <div className="font-display text-2xl font-bold uppercase tracking-wide">
              {plan.band.emoji} {plan.band.label}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Dressing for {fmtTemp(plan.effectiveTemp, units)} on the bike
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 rounded-2xl bg-stone-100 px-3 py-2 text-sm dark:bg-stone-800/70">
            {plan.band.blurb}
            {plan.warmBand && (
              <>
                {' '}
                <strong>Big temperature swing:</strong> it warms up to “{plan.warmBand.label.toLowerCase()}” later — wear
                layers you can peel off and stash.
              </>
            )}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {plan.items.map((g, i) => (
              <li
                key={`${g.slot}-${i}`}
                className="group flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-throttle-400 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-throttle-500"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-2xl transition group-hover:scale-110 group-hover:rotate-[-6deg] dark:bg-stone-800" aria-hidden>
                  {g.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{SLOT_LABEL[g.slot]}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${LEVEL[g.level].cls}`}>
                      {LEVEL[g.level].label}
                    </span>
                  </div>
                  <div className="font-semibold leading-snug">{g.name}</div>
                  <div className="text-xs leading-snug text-stone-500 dark:text-stone-400">{g.why}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
