import { GraduationCap, Star, Award, Puzzle, Swords, ClipboardCheck, BadgeCheck } from 'lucide-react'
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
  const breakdown = [
    { icon: BadgeCheck, label: `Toifa (${profile.category})`, points: profile.category_points },
    { icon: Award, label: profile.has_certificate ? 'Xalqaro sertifikat' : "Xalqaro sertifikat yo'q", points: profile.certificate_points, muted: !profile.has_certificate },
    { icon: Puzzle, label: 'Quest (o\'yinlar)', points: profile.quest_points },
    { icon: Swords, label: 'Battle', points: profile.battle_points },
    { icon: ClipboardCheck, label: 'Topshiriqlar', points: profile.task_points },
  ]

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

      <div className="card p-4 text-center">
        <div className="flex items-center justify-center gap-1 text-2xl font-bold text-neutral-900">
          <Star className="h-5 w-5 text-amber-500" />
          {profile.rank ?? '—'}
        </div>
        <p className="mt-1 text-xs text-neutral-500">O'rin (jami {profile.total_teachers} o'qituvchi)</p>
      </div>

      <div className="card p-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Ball taqsimoti</p>
        <div className="divide-y divide-neutral-100">
          {breakdown.map(({ icon: Icon, label, points, muted }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${muted ? 'bg-neutral-100 text-neutral-300' : 'bg-primary-50 text-primary-600'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-sm ${muted ? 'text-neutral-400' : 'text-neutral-700'}`}>{label}</span>
              </div>
              <span className={`font-display text-sm font-bold ${muted ? 'text-neutral-300' : 'text-neutral-900'}`}>+{points}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm font-semibold text-neutral-900">Jami</span>
            <span className="font-display text-base font-extrabold text-primary-600">{profile.total_points}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
