import { useEffect, useState } from 'react'

const CX = 130
const CY = 130
const R = 100

const SEGMENTS: [number, number, string][] = [
  [0, 30, '#ef4444'],
  [30, 50, '#f97316'],
  [50, 70, '#facc15'],
  [70, 85, '#a3e635'],
  [85, 100, '#22c55e'],
]

/** Point on the dial for a 0–100 value (0 = far left, 100 = far right). */
function pt(v: number, r = R) {
  const a = Math.PI - (v / 100) * Math.PI
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const
}

function arc(from: number, to: number, r = R) {
  const [x1, y1] = pt(from, r)
  const [x2, y2] = pt(to, r)
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
}

/** Speedometer-style "Ride-O-Meter" for the 0–100 ride score. */
export function RideOMeter({ score, loading }: { score: number; loading?: boolean }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setShown(loading ? 0 : score), 60)
    return () => clearTimeout(t)
  }, [score, loading])

  return (
    <svg viewBox="0 0 260 160" className="w-full max-w-xs" role="img" aria-label={`Ride score ${score} out of 100`}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* track */}
      <path d={arc(0, 100)} stroke="currentColor" strokeOpacity={0.12} strokeWidth={18} fill="none" strokeLinecap="round" />
      {SEGMENTS.map(([a, b, color]) => (
        <path key={a} d={arc(a + 0.6, b - 0.6)} stroke={color} strokeWidth={14} fill="none" opacity={0.9} />
      ))}
      {/* ticks */}
      {Array.from({ length: 21 }, (_, i) => {
        const v = i * 5
        const major = v % 10 === 0
        const [x1, y1] = pt(v, R - 14)
        const [x2, y2] = pt(v, R - (major ? 26 : 20))
        return (
          <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={major ? 0.6 : 0.3} strokeWidth={major ? 2 : 1} />
        )
      })}
      {[0, 20, 40, 60, 80, 100].map((v) => {
        const [x, y] = pt(v, R - 38)
        return (
          <text key={v} x={x} y={y + 4} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.55} fontFamily="Oswald, sans-serif">
            {v}
          </text>
        )
      })}
      {/* needle */}
      <g
        style={{
          transform: `rotate(${shown * 1.8}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: 'transform 1.1s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        <path d={`M ${CX - R + 18} ${CY} L ${CX} ${CY - 5} L ${CX + 12} ${CY} L ${CX} ${CY + 5} Z`} fill="#f97316" filter="url(#glow)" />
      </g>
      <circle cx={CX} cy={CY} r={10} fill="currentColor" />
      <circle cx={CX} cy={CY} r={4} fill="#f97316" />
    </svg>
  )
}
