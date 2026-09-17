import { GraduationCap, Star } from 'lucide-react'
import type { Profile } from './MiniApp'

const categoryColors: Record<string, string> = {
  Oliy: 'bg-emerald-50 text-emerald-700',
  Birinchi: 'bg-primary-50 text-primary-700',
  Ikkinchi: 'bg-amber-50 text-amber-700',
  Mutaxassis: 'bg-cyan-50 text-cyan-700',
}

function stars(rank: number | null, total: number): string {
  if (!rank || !total) return '☆☆☆☆☆'
  const ratio = 1 - (rank - 1) / total
  const full = Math.max(0, Math.min(5, Math.round(ratio * 5)))
  return '⭐'.repeat(full) + '☆'.repeat(5 - full)
}

export function ProfileTab({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/20">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="font-display text-lg font-bold text-neutral-900">{profile.full_name}</h1>
        <p className="text-sm text-neutral-500">{profile.school}</p>
        <span className={`badge mt-2 ${categoryColors[profile.category] || 'bg-neutral-100 text-neutral-600'}`}>{profile.category}</span>
      </div>

      <div className="card p-6 text-center">
        <div className="font-display text-5xl font-extrabold text-primary-600">{profile.total_points}</div>
        <p className="mt-1 text-sm text-neutral-500">Sizning reyting balingiz</p>
        <div className="mt-3 text-xl">{stars(profile.rank, profile.total_teachers)}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-neutral-900">
            <Star className="h-5 w-5 text-amber-500" />
            {profile.rank ?? '—'}
          </div>
          <p className="mt-1 text-xs text-neutral-500">O'rin (jami {profile.total_teachers})</p>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-neutral-900">{profile.category}</div>
          <p className="mt-1 text-xs text-neutral-500">Toifa</p>
        </div>
      </div>
    </div>
  )
}
