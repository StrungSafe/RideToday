import type { GearPlan } from '../lib/gear'

const BAND_BG: Record<string, [string, string]> = {
  scorching: ['#fecaca', '#f97316'],
  hot: ['#fed7aa', '#fb923c'],
  warm: ['#fef08a', '#fbbf24'],
  mild: ['#d9f99d', '#4ade80'],
  cool: ['#bae6fd', '#38bdf8'],
  cold: ['#bfdbfe', '#3b82f6'],
  frigid: ['#c7d2fe', '#6366f1'],
  arctic: ['#e0e7ff', '#818cf8'],
}

/** A cartoon rider that dresses up according to the gear plan. */
export function RiderAvatar({ plan, atgatt, gusty }: { plan: GearPlan; atgatt: boolean; gusty: boolean }) {
  const band = plan.band.band
  const has = (icon: string) => plan.items.some((i) => i.icon === icon)
  const item = (slot: string) => plan.items.find((i) => i.slot === slot)

  const hot = band === 'hot' || band === 'scorching'
  const warmish = hot || band === 'warm'
  const cold = band === 'cold' || band === 'frigid' || band === 'arctic'
  const jacket: 'mesh' | 'textile' | 'winter' = warmish ? 'mesh' : cold ? 'winter' : 'textile'
  const rainSuit = plan.rainLevel === 'wear'
  const tinted = /tinted/i.test(item('helmet')?.why ?? '')
  const neck = item('neck')
  const hiViz = has('🦺') && !rainSuit
  const hydration = has('💧')
  const raining = plan.rainLevel !== 'none'

  const jacketFill = rainSuit ? '#facc15' : jacket === 'mesh' ? 'url(#mesh)' : jacket === 'winter' ? '#1e3a8a' : '#292524'
  const sleeve = rainSuit ? '#facc15' : jacket === 'mesh' ? '#57534e' : jacket === 'winter' ? '#1e3a8a' : '#292524'
  const pants = rainSuit
    ? '#eab308'
    : atgatt || cold
      ? hot
        ? 'url(#mesh)'
        : '#292524'
      : '#1d4ed8'
  const helmet = atgatt ? '#f97316' : '#e7e5e4'
  const [bg1, bg2] = BAND_BG[band] ?? BAND_BG.mild

  return (
    <svg viewBox="0 0 200 300" className="h-full w-full" role="img" aria-label={`Rider dressed for ${plan.band.label.toLowerCase()} weather`}>
      <defs>
        <radialGradient id="spot" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={bg1} stopOpacity={0.9} />
          <stop offset="100%" stopColor={bg2} stopOpacity={0.15} />
        </radialGradient>
        <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#44403c" />
          <circle cx="3" cy="3" r="1.4" fill="#a8a29e" />
        </pattern>
        <filter id="heat" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <ellipse cx="100" cy="150" rx="96" ry="140" fill="url(#spot)" />
      <ellipse cx="100" cy="286" rx="52" ry="7" fill="#000" opacity="0.15" />

      {/* Weather effects behind the rider */}
      {hot && (
        <g className="origin-center" opacity={0.9}>
          <circle cx="166" cy="34" r="16" fill="#fbbf24" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return (
              <line key={i} x1={166 + Math.cos(a) * 21} y1={34 + Math.sin(a) * 21} x2={166 + Math.cos(a) * 28} y2={34 + Math.sin(a) * 28} stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
            )
          })}
        </g>
      )}
      {cold &&
        [
          [28, 40], [172, 60], [20, 130], [180, 150], [36, 220], [168, 236], [150, 22],
        ].map(([x, y], i) => (
          <text key={i} x={x} y={y} fontSize={i % 2 ? 14 : 18} textAnchor="middle" fill="#fff" opacity={0.95}>❄</text>
        ))}
      {raining &&
        Array.from({ length: 14 }, (_, i) => {
          const x = 12 + ((i * 37) % 180)
          const y = 14 + ((i * 53) % 230)
          return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 12} stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity={0.75} />
        })}
      {gusty &&
        [70, 120, 200].map((y, i) => (
          <path key={y} d={`M ${4 + i * 4} ${y} q 12 -6 24 0 t 24 0`} stroke="#78716c" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity={0.7} />
        ))}

      <g className="animate-bob">
        {/* Heated gear glow */}
        {plan.heated && <rect x="58" y="92" width="84" height="92" rx="20" fill="#f97316" opacity="0.55" filter="url(#heat)" />}

        {/* Legs */}
        <rect x="70" y="176" width="28" height="84" rx="10" fill={pants} />
        <rect x="102" y="176" width="28" height="84" rx="10" fill={pants} />
        {/* Knee armor */}
        <rect x="74" y="210" width="20" height="16" rx="6" fill="#fff" opacity="0.18" />
        <rect x="106" y="210" width="20" height="16" rx="6" fill="#fff" opacity="0.18" />

        {/* Boots */}
        <path d={`M 68 ${atgatt ? 238 : 252} h 31 v 34 h -40 q -2 -12 9 -14 Z`} fill="#1c1917" />
        <path d={`M 101 ${atgatt ? 238 : 252} h 31 v 20 q 11 2 9 14 h -40 Z`} fill="#1c1917" />
        {atgatt && (
          <>
            <rect x="72" y="244" width="22" height="4" rx="2" fill="#f97316" />
            <rect x="106" y="244" width="22" height="4" rx="2" fill="#f97316" />
          </>
        )}

        {/* Arms */}
        <path d="M 66 100 L 44 172" stroke={sleeve} strokeWidth="22" strokeLinecap="round" />
        <path d="M 134 100 L 156 172" stroke={sleeve} strokeWidth="22" strokeLinecap="round" />
        {/* Elbow armor */}
        <circle cx="53" cy="140" r="7" fill="#fff" opacity="0.2" />
        <circle cx="147" cy="140" r="7" fill="#fff" opacity="0.2" />

        {/* Torso */}
        <path d="M 62 94 Q 100 84 138 94 L 134 184 Q 100 190 66 184 Z" fill={jacketFill} />
        {jacket === 'winter' && !rainSuit && (
          <g stroke="#1e40af" strokeWidth="2.5">
            <line x1="66" y1="120" x2="134" y2="120" />
            <line x1="66" y1="146" x2="134" y2="146" />
            <line x1="66" y1="170" x2="134" y2="170" />
          </g>
        )}
        {jacket === 'textile' && !rainSuit && (
          <path d="M 64 112 L 136 112 L 136 120 L 64 120 Z" fill="#f97316" opacity="0.9" />
        )}
        {rainSuit && (
          <g fill="#e7e5e4" opacity="0.9">
            <rect x="65" y="128" width="70" height="7" />
            <rect x="65" y="158" width="70" height="7" />
          </g>
        )}
        {/* Zipper */}
        <line x1="100" y1="92" x2="100" y2="186" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
        {/* Shoulder armor */}
        <ellipse cx="66" cy="100" rx="12" ry="9" fill="#fff" opacity="0.2" />
        <ellipse cx="134" cy="100" rx="12" ry="9" fill="#fff" opacity="0.2" />

        {/* Hi-viz vest */}
        {hiViz && (
          <g>
            <path d="M 66 96 L 86 92 L 92 186 L 68 184 Z" fill="#d9f99d" opacity="0.92" />
            <path d="M 134 96 L 114 92 L 108 186 L 132 184 Z" fill="#d9f99d" opacity="0.92" />
            <rect x="67" y="150" width="24" height="5" fill="#e7e5e4" />
            <rect x="109" y="150" width="24" height="5" fill="#e7e5e4" />
          </g>
        )}
        {/* Hydration pack straps */}
        {hydration && (
          <g>
            <path d="M 78 92 L 82 150" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" />
            <path d="M 122 92 L 118 150" stroke="#0ea5e9" strokeWidth="6" strokeLinecap="round" />
            <path d="M 118 96 q 10 20 -4 34" stroke="#0369a1" strokeWidth="2.5" fill="none" />
          </g>
        )}

        {/* Gloves */}
        {[
          [42, 178],
          [158, 178],
        ].map(([x, y]) => (
          <g key={x}>
            {cold && <rect x={x - 12} y={y - 16} width="24" height="12" rx="4" fill="#1c1917" />}
            <circle cx={x} cy={y} r="12" fill={rainSuit ? '#1c1917' : '#0c0a09'} />
            <rect x={x - 6} y={y - 6} width="12" height="5" rx="2" fill="#57534e" />
            {plan.heated && <circle cx={x} cy={y} r="15" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />}
          </g>
        ))}

        {/* Neck */}
        {neck && (
          <rect x="84" y="78" width="32" height="16" rx="6" fill={neck.icon === '💦' ? '#22d3ee' : band === 'frigid' || band === 'arctic' ? '#1e293b' : '#78716c'} />
        )}

        {/* Helmet */}
        <circle cx="100" cy="50" r="32" fill={helmet} />
        <path d="M 70 58 Q 100 92 130 58 L 128 74 Q 100 90 72 74 Z" fill={helmet} />
        <path d="M 72 44 Q 100 20 128 44" stroke="#000" strokeOpacity="0.15" strokeWidth="5" fill="none" />
        {/* Visor */}
        <rect x="74" y="40" width="52" height="22" rx="11" fill={tinted ? '#1c1917' : '#7dd3fc'} opacity={tinted ? 1 : 0.85} />
        <path d="M 80 46 Q 92 42 104 44" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
        {!tinted && (
          <g fill="#1c1917">
            <circle cx="91" cy="52" r="2.5" />
            <circle cx="109" cy="52" r="2.5" />
          </g>
        )}
        {atgatt && <path d="M 100 18 L 100 30" stroke="#1c1917" strokeWidth="4" strokeLinecap="round" />}
      </g>
    </svg>
  )
}
