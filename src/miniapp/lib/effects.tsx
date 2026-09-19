import { type CSSProperties } from 'react'
import { Sparkles } from 'lucide-react'

const CONFETTI_COLORS = ['bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-400', 'bg-cyan-500']

export function Confetti({ count = 16 }: { count?: number }) {
  const pieces = Array.from({ length: count })
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * 360 + (i % 2 === 0 ? 10 : -10)
        const distance = 60 + ((i * 37) % 50)
        const rad = (angle * Math.PI) / 180
        const x = Math.cos(rad) * distance
        const y = Math.sin(rad) * distance - 30
        return (
          <span
            key={i}
            className={`absolute left-1/2 top-16 h-2 w-2 rounded-sm ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]} animate-confetti-pop`}
            style={{ '--confetti-x': `${x}px`, '--confetti-y': `${y}px`, animationDelay: `${i * 30}ms` } as CSSProperties}
          />
        )
      })}
    </div>
  )
}

export function PointToast({ points, toastKey, label = 'ball' }: { points: number; toastKey: number; label?: string }) {
  return (
    <div key={toastKey} className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
      <div className="animate-float-up-fade mt-1 flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30">
        <Sparkles className="h-4 w-4" />+{points} {label}
      </div>
    </div>
  )
}
