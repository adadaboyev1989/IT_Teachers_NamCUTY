import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Achievement, PedagogData } from '../types'
import { Trash2, Edit3, Medal } from 'lucide-react'
import { SectionHeader, SearchBar, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './shared'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function AdminAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [pedagogs, setPedagogs] = useState<PedagogData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Achievement | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: ach }, { data: peds }] = await Promise.all([
      supabase.from('achievements').select('*').order('awarded_at', { ascending: false }),
      supabase.from('pedagog_data').select('*').order('full_name'),
    ])
    setAchievements(ach || [])
    setPedagogs(peds || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const pedagogById = new Map(pedagogs.map((p) => [p.id, p]))

  const handleDelete = async (id: string) => {
    if (!confirm("Bu yutuqni o'chirishni istaysizmi? Unga tegishli ball ham olib tashlanadi.")) return
    await supabase.from('achievements').delete().eq('id', id)
    fetchData()
  }

  const filtered = achievements.filter((a) => {
    const p = pedagogById.get(a.pedagog_data_id)
    const q = search.toLowerCase()
    return a.title.toLowerCase().includes(q) || (p?.full_name || '').toLowerCase().includes(q) || (p?.school || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <SectionHeader
        title="Yutuqlar"
        subtitle="Olimpiada, viloyat yoki respublika ko'rik-tanlovlaridagi g'oliblik uchun individual ball berish"
        onAdd={() => { setEditing(null); setShowForm(true) }}
        addLabel="Yutuq qo'shish"
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Pedagog, maktab yoki tanlov nomi bo'yicha qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={achievements.length === 0 ? "Hali yutuq qo'shilmagan." : 'Hech narsa topilmadi.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const p = pedagogById.get(a.pedagog_data_id)
            return (
              <div key={a.id} className="card flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <Medal className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{a.title}</p>
                  <p className="truncate text-xs text-neutral-500">{p ? `${p.full_name} — ${p.school}` : "O'chirilgan pedagog"}</p>
                  <p className="text-xs text-neutral-400">{formatDate(a.awarded_at)}</p>
                </div>
                <span className="badge flex-shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">+{a.points} ball</span>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button onClick={() => { setEditing(a); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(a.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <AchievementForm
          achievement={editing}
          pedagogs={pedagogs}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchData() }}
        />
      )}
    </div>
  )
}

function AchievementForm({ achievement, pedagogs, onClose, onSuccess }: { achievement: Achievement | null; pedagogs: PedagogData[]; onClose: () => void; onSuccess: () => void }) {
  const [pedagogId, setPedagogId] = useState(achievement?.pedagog_data_id || pedagogs[0]?.id || '')
  const [title, setTitle] = useState(achievement?.title || '')
  const [points, setPoints] = useState((achievement?.points ?? 20).toString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pointsNum = parseInt(points)
    if (!pedagogId) { setError('Pedagog tanlanishi shart.'); return }
    if (!title.trim()) { setError('Tanlov nomi kiritilishi shart.'); return }
    if (!pointsNum || pointsNum <= 0) { setError("Ball 0 dan katta bo'lishi shart."); return }

    setSaving(true)
    setError(null)

    const payload = { pedagog_data_id: pedagogId, title: title.trim(), points: pointsNum }

    const { error: upsertError } = achievement
      ? await supabase.from('achievements').update(payload).eq('id', achievement.id)
      : await supabase.from('achievements').insert(payload)

    setSaving(false)
    if (upsertError) { setError("Saqlab bo'lmadi. Qaytadan urinib ko'ring."); return }
    onSuccess()
  }

  return (
    <Modal title={achievement ? 'Yutuqni tahrirlash' : "Yutuq qo'shish"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Pedagog *">
          <select value={pedagogId} onChange={(e) => setPedagogId(e.target.value)} className="input-field">
            <option value="" disabled>Tanlang...</option>
            {pedagogs.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name} — {p.school}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Tanlov / yutuq nomi *">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Respublika fan olimpiadasi g'olibi" />
        </FormField>
        <FormField label="Ball *">
          <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="input-field" min={1} />
        </FormField>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={achievement ? 'Saqlash' : "Qo'shish"} />
      </form>
    </Modal>
  )
}
