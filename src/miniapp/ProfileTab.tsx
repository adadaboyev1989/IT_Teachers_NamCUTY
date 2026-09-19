import { GraduationCap, Star, Award, Puzzle, Swords, ClipboardCheck, BadgeCheck, AlertTriangle, Clock, Calendar } from 'lucide-react'
import type { Profile } from './MiniApp'

const categoryColors: Record<string, string> = {
  Oliy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Birinchi: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400',
  Ikkinchi: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Mutaxassis: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
}

function stars(rank: number | null, total: number): string {
  if (!rank || !total) return '☆☆☆☆☆'
  const ratio = 1 - (rank - 1) / total
  const full = Math.max(0, Math.min(5, Math.round(ratio * 5)))
  return '⭐'.repeat(full) + '☆'.repeat(5 - full)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function ProfileTab({ profile }: { profile: Profile }) {
  const { certificate_status: certStatus } = profile

  const breakdown = [
    { icon: BadgeCheck, label: `Toifa (${profile.category})`, points: profile.category_points },
    { icon: Award, label: profile.has_certificate ? 'Xalqaro sertifikat' : "Xalqaro sertifikat yo'q", points: profile.certificate_points, muted: !profile.has_certificate },
    { icon: Puzzle, label: "Quest (o'yinlar)", points: profile.quest_points },
    { icon: Swords, label: 'Battle', points: profile.battle_points },
    { icon: ClipboardCheck, label: 'Topshiriqlar', points: profile.task_points },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center rounded-2xl bg-surface p-6 text-center shadow-sm">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/20">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="font-display text-lg font-bold text-neutral-900">{profile.full_name}</h1>
        <p className="text-sm text-neutral-500">{profile.school}</p>
        <span className={`badge mt-2 ${categoryColors[profile.category] || 'bg-neutral-100 text-neutral-600'}`}>{profile.category}</span>
      </div>

      {/* Certificate expiry warning — shown first so it's the first thing a
          teacher sees, not buried below the fold in the points breakdown. */}
      {profile.has_certificate && certStatus.is_expired && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Sertifikat muddati tugagan!</p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/80">
              {profile.certificate_name} — {formatDate(profile.certificate_expiry_date)} sanasida tugagan ({Math.abs(certStatus.days_until_expiry ?? 0)} kun oldin). Yangilashni unutmang.
            </p>
          </div>
        </div>
      )}
      {profile.has_certificate && !certStatus.is_expired && certStatus.is_expiring_soon && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Sertifikat muddati tez orada tugaydi</p>
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400/80">
              {profile.certificate_name} — yana {certStatus.days_until_expiry} kundan so'ng ({formatDate(profile.certificate_expiry_date)}) tugaydi.
            </p>
          </div>
        </div>
      )}

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

      {profile.has_certificate && (
        <div className="card p-4">
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Xalqaro sertifikat</p>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
              certStatus.is_expired
                ? 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400'
                : certStatus.is_expiring_soon
                ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
            }`}>
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-900">{profile.certificate_name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                <Calendar className="h-3 w-3" />
                {formatDate(profile.certificate_issue_date)} — {formatDate(profile.certificate_expiry_date)}
              </p>
              <span className={`badge mt-2 text-xs ${
                certStatus.is_expired
                  ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                  : certStatus.is_expiring_soon
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              }`}>
                {certStatus.is_expired ? 'Muddati tugagan' : certStatus.is_expiring_soon ? `${certStatus.days_until_expiry} kun qoldi` : 'Amal qilmoqda'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Ball taqsimoti</p>
        <div className="divide-y divide-neutral-100">
          {breakdown.map(({ icon: Icon, label, points, muted }) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${muted ? 'bg-neutral-100 text-neutral-300' : 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'}`}>
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
