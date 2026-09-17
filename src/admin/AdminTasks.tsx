import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskCompletion, PedagogData } from '../types'
import { Trash2, Edit3, Check, Loader2, ClipboardCheck } from 'lucide-react'
import { SectionHeader, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './shared'

export function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (!error && data) setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu topshiriqni o'chirishni istaysizmi?")) return
    await supabase.from('tasks').delete().eq('id', id)
    if (selectedTask?.id === id) setSelectedTask(null)
    fetchTasks()
  }

  return (
    <div>
      <SectionHeader title="Topshiriqlar" subtitle="Topshiriq alohida Telegram guruhda bajariladi — bu yerda faqat e'lon qilinadi va bajarilganlik belgilanadi" onAdd={() => { setEditing(null); setShowForm(true) }} addLabel="Topshiriq qo'shish" />

      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState message="Hali topshiriq yo'q." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <div key={task.id} className={`card cursor-pointer p-5 transition-all hover:border-primary-300 ${selectedTask?.id === task.id ? 'border-primary-400 ring-2 ring-primary-100' : ''}`} onClick={() => setSelectedTask(task)}>
              <div className="mb-2 flex items-start justify-between">
                <span className="badge bg-primary-50 text-primary-700">{task.points} ball</span>
                {!task.is_active && <span className="badge bg-neutral-100 text-neutral-500">Nofaol</span>}
              </div>
              <h3 className="font-display font-bold text-neutral-900">{task.title}</h3>
              {task.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{task.description}</p>}
              <div className="mt-3 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setEditing(task); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-600"><Edit3 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(task.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && <div className="mt-8"><CompletionsPanel task={selectedTask} /></div>}

      {showForm && (
        <TaskForm
          task={editing}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchTasks() }}
        />
      )}
    </div>
  )
}

function TaskForm({ task, onClose, onSuccess }: { task: Task | null; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [points, setPoints] = useState((task?.points ?? 10).toString())
  const [isActive, setIsActive] = useState(task?.is_active ?? true)
  const [notify, setNotify] = useState(!task)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Sarlavha kiritilishi shart.'); return }
    setSaving(true)
    setError(null)

    const payload = { title: title.trim(), description: description.trim() || null, points: parseInt(points) || 0, is_active: isActive }

    const { error: upsertError } = task
      ? await supabase.from('tasks').update(payload).eq('id', task.id)
      : await supabase.from('tasks').insert(payload)

    if (upsertError) {
      setSaving(false)
      setError("Saqlab bo'lmadi. Qaytadan urinib ko'ring.")
      return
    }

    // New tasks can announce themselves to every registered teacher via the
    // bot. This goes through notify-task, which is only reachable with a
    // valid Supabase Auth session (verify_jwt = true in config.toml) — no
    // secret is embedded in this client code.
    if (!task && notify) {
      await supabase.functions.invoke('notify-task', { body: { title: title.trim(), points: parseInt(points) || 0 } }).catch(() => {})
    }

    setSaving(false)
    onSuccess()
  }

  return (
    <Modal title={task ? 'Topshiriqni tahrirlash' : "Topshiriq qo'shish"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Sarlavha *"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Ochiq dars ishlab chiqish" /></FormField>
        <FormField label="Tavsif"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[70px] resize-none" placeholder="Batafsil ma'lumot va Telegram guruh havolasi" /></FormField>
        <FormField label="Ball"><input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="input-field" min={0} /></FormField>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          Faol
        </label>
        {!task && (
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
            Bot orqali barcha o'qituvchilarga e'lon qilish
          </label>
        )}
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={task ? 'Saqlash' : "Qo'shish"} />
      </form>
    </Modal>
  )
}

function CompletionsPanel({ task }: { task: Task }) {
  const [pedagogs, setPedagogs] = useState<PedagogData[]>([])
  const [completions, setCompletions] = useState<Map<string, TaskCompletion>>(new Map())
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: peds }, { data: comps }] = await Promise.all([
      supabase.from('pedagog_data').select('*').order('full_name'),
      supabase.from('task_completions').select('*').eq('task_id', task.id),
    ])
    setPedagogs(peds || [])
    setCompletions(new Map((comps || []).map((c) => [c.pedagog_data_id, c])))
    setLoading(false)
  }, [task.id])

  useEffect(() => { setLoading(true); fetchData() }, [fetchData])

  const toggle = async (pedagogId: string, currentlyCompleted: boolean) => {
    setTogglingId(pedagogId)
    await supabase.from('task_completions').upsert(
      { task_id: task.id, pedagog_data_id: pedagogId, completed: !currentlyCompleted },
      { onConflict: 'task_id,pedagog_data_id' }
    )
    setTogglingId(null)
    fetchData()
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary-600" />
        <h3 className="font-display text-lg font-bold text-neutral-900">"{task.title}" — bajarilganlik</h3>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : pedagogs.length === 0 ? (
        <EmptyState message="Hali pedagog qo'shilmagan." />
      ) : (
        <div className="divide-y divide-neutral-100">
          {pedagogs.map((p) => {
            const completed = completions.get(p.id)?.completed ?? false
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{p.full_name}</p>
                  <p className="text-xs text-neutral-400">{p.school}</p>
                </div>
                <button
                  onClick={() => toggle(p.id, completed)}
                  disabled={togglingId === p.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    completed ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                  }`}
                >
                  {togglingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {completed ? 'Bajardi' : "Bajarmadi"}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
