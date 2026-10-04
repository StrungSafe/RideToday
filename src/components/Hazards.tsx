import type { Hazard } from '../lib/gear'
import { Card } from './ui'

const STYLE: Record<Hazard['severity'], string> = {
  danger: 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10',
  caution: 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
  info: 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10',
}

export function Hazards({ hazards }: { hazards: Hazard[] }) {
  return (
    <Card title="Road Report" icon="🚧">
      {hazards.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
          <span className="text-2xl" aria-hidden>✅</span>
          No weather hazards spotted. Usual rules apply: assume they don’t see you.
        </div>
      ) : (
        <ul className="space-y-2">
          {hazards.map((h) => (
            <li key={h.title} className={`flex gap-3 rounded-2xl border p-3 ${STYLE[h.severity]}`}>
              <span className="text-2xl" aria-hidden>{h.icon}</span>
              <div>
                <div className="font-semibold">{h.title}</div>
                <div className="text-sm text-stone-600 dark:text-stone-300">{h.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
