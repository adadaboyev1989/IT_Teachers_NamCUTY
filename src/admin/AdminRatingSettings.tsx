import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RatingSetting, LeaderboardRow } from '../types'
import { Save, Loader2, SlidersHorizontal, Trophy } from 'lucide-react'
import { LoadingSpinner, SearchBar, EmptyState } from './shared'

const categoryColors: Record<string, string> = {
  Oliy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Birinchi: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400',
  Ikkinchi: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Mutaxassis: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
}

export function AdminRatingSettings() {
  return (
    <div className="space-y-10">
      <Leaderboard />
      <RatingRules />
    </div>
  )
}

function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setRows(data)
        setLoading(false)
      })
  }, [])

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase()
    return r.full_name.toLowerCase().includes(q) || r.school.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Barcha xodimlar reytingi</h2>
        <p className="mt-1 text-sm text-neutral-500">Jami ball bo'yicha saralangan — har bir manbadan qancha ball to'plangani ko'rinadi</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="FIO yoki maktab bo'yicha qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? "Hech narsa topilmadi." : "Hali pedagog qo'shilmagan."} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-neutral-700">O'rin</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700">FIO</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 md:table-cell">Maktab</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 sm:table-cell">Toifa</th>
                  <th className="hidden px-4 py-3 text-right font-semibold text-neutral-700 lg:table-cell">Quest</th>
                  <th className="hidden px-4 py-3 text-right font-semibold text-neutral-700 lg:table-cell">Battle</th>
                  <th className="hidden px-4 py-3 text-right font-semibold text-neutral-700 lg:table-cell">Topshiriq</th>
                  <th className="hidden px-4 py-3 text-right font-semibold text-neutral-700 lg:table-cell">Yutuq</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Jami</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((r, i) => (
                  <tr key={r.pedagog_data_id} className="transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-neutral-100 text-neutral-500'
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{r.full_name}</div>
                      <div className="text-xs text-neutral-500 md:hidden">{r.school}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{r.school}</td>
                    <td className="hidden px-4 py-3 sm:table-cell"><span className={`badge ${categoryColors[r.category] || 'bg-neutral-100 text-neutral-600'}`}>{r.category}</span></td>
                    <td className="hidden px-4 py-3 text-right text-neutral-600 lg:table-cell">{r.quest_points}</td>
                    <td className="hidden px-4 py-3 text-right text-neutral-600 lg:table-cell">{r.battle_points}</td>
                    <td className="hidden px-4 py-3 text-right text-neutral-600 lg:table-cell">{r.task_points}</td>
                    <td className="hidden px-4 py-3 text-right text-neutral-600 lg:table-cell">{r.achievement_points}</td>
                    <td className="px-4 py-3 text-right font-display font-bold text-primary-600">{r.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function RatingRules() {
  const [settings, setSettings] = useState<RatingSetting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase.from('rating_settings').select('*').order('key')
    if (!error && data) {
      setSettings(data)
      setValues(Object.fromEntries(data.map((s) => [s.key, s.points.toString()])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async (key: string) => {
    const points = parseInt(values[key])
    if (isNaN(points)) return
    setSavingKey(key)
    const { error } = await supabase.from('rating_settings').update({ points, updated_at: new Date().toISOString() }).eq('key', key)
    setSavingKey(null)
    if (!error) {
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, points } : s)))
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 1500)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary-600" />
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Reyting qoidalari</h2>
          <p className="mt-1 text-sm text-neutral-500">Har bir manba uchun ball miqdorini shu yerdan o'zgartirasiz — kod o'zgarishi shart emas.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-surface">
          <div className="divide-y divide-neutral-100">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{s.label}</p>
                    <p className="text-xs text-neutral-400">{s.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={values[s.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    className="input-field w-24 text-right"
                  />
                  <button onClick={() => handleSave(s.key)} disabled={savingKey === s.key} className="btn-ghost !px-3">
                    {savingKey === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : savedKey === s.key ? <span className="text-emerald-600 text-xs">✓</span> : <Save className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
