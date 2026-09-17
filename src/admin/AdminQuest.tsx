import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { QuestStage, QuestQuestion } from '../types'
import { Trash2, Edit3, ChevronRight, Clock, ListChecks } from 'lucide-react'
import { SectionHeader, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './shared'

export function AdminQuest() {
  const [stages, setStages] = useState<QuestStage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<QuestStage | null>(null)
  const [selectedStage, setSelectedStage] = useState<QuestStage | null>(null)

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase.from('quest_stages').select('*').order('order_index')
    if (!error && data) setStages(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchStages() }, [fetchStages])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu bosqichni (va undagi barcha savollarni) o'chirishni istaysizmi?")) return
    await supabase.from('quest_stages').delete().eq('id', id)
    if (selectedStage?.id === id) setSelectedStage(null)
    fetchStages()
  }

  return (
    <div>
      <SectionHeader title="Quest bosqichlari" subtitle="Escape room uslubidagi ko'p bosqichli savol-javob o'yini" onAdd={() => { setEditing(null); setShowForm(true) }} addLabel="Bosqich qo'shish" />

      {loading ? (
        <LoadingSpinner />
      ) : stages.length === 0 ? (
        <EmptyState message="Hali bosqich yaratilmagan." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage) => (
            <div key={stage.id} className={`card cursor-pointer p-5 transition-all hover:border-primary-300 ${selectedStage?.id === stage.id ? 'border-primary-400 ring-2 ring-primary-100' : ''}`} onClick={() => setSelectedStage(stage)}>
              <div className="mb-2 flex items-start justify-between">
                <span className="badge bg-primary-50 text-primary-700">#{stage.order_index}</span>
                {!stage.is_active && <span className="badge bg-neutral-100 text-neutral-500">Nofaol</span>}
              </div>
              <h3 className="font-display font-bold text-neutral-900">{stage.title}</h3>
              {stage.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{stage.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                {stage.time_limit_seconds ? (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-400"><Clock className="h-3.5 w-3.5" />{stage.time_limit_seconds}s</span>
                ) : <span />}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditing(stage); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-600"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(stage.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  <ChevronRight className="h-4 w-4 text-neutral-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStage && <div className="mt-8"><QuestionsPanel stage={selectedStage} /></div>}

      {showForm && (
        <StageForm
          stage={editing}
          nextOrder={stages.length}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchStages() }}
        />
      )}
    </div>
  )
}

function StageForm({ stage, nextOrder, onClose, onSuccess }: { stage: QuestStage | null; nextOrder: number; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(stage?.title || '')
  const [description, setDescription] = useState(stage?.description || '')
  const [orderIndex, setOrderIndex] = useState((stage?.order_index ?? nextOrder).toString())
  const [timeLimit, setTimeLimit] = useState(stage?.time_limit_seconds?.toString() || '')
  const [isActive, setIsActive] = useState(stage?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Sarlavha kiritilishi shart.'); return }
    setSaving(true)
    setError(null)

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      order_index: parseInt(orderIndex) || 0,
      time_limit_seconds: timeLimit ? parseInt(timeLimit) : null,
      is_active: isActive,
    }

    const { error: upsertError } = stage
      ? await supabase.from('quest_stages').update(payload).eq('id', stage.id)
      : await supabase.from('quest_stages').insert(payload)

    setSaving(false)
    if (upsertError) { setError("Saqlab bo'lmadi. Qaytadan urinib ko'ring."); return }
    onSuccess()
  }

  return (
    <Modal title={stage ? 'Bosqichni tahrirlash' : 'Bosqich qo\'shish'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Sarlavha *"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="1-bosqich: Kirish" /></FormField>
        <FormField label="Tavsif"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[70px] resize-none" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tartib raqami"><input type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} className="input-field" min={0} /></FormField>
          <FormField label="Vaqt chegarasi (soniya)"><input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="input-field" placeholder="cheklovsiz" min={0} /></FormField>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          Faol (o'qituvchilarga ko'rinadi)
        </label>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={stage ? 'Saqlash' : "Qo'shish"} />
      </form>
    </Modal>
  )
}

function QuestionsPanel({ stage }: { stage: QuestStage }) {
  const [questions, setQuestions] = useState<QuestQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<QuestQuestion | null>(null)

  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase.from('quest_questions').select('*').eq('stage_id', stage.id).order('order_index')
    if (!error && data) setQuestions(data)
    setLoading(false)
  }, [stage.id])

  useEffect(() => { setLoading(true); fetchQuestions() }, [fetchQuestions])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu savolni o'chirishni istaysizmi?")) return
    await supabase.from('quest_questions').delete().eq('id', id)
    fetchQuestions()
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary-600" />
          <h3 className="font-display text-lg font-bold text-neutral-900">"{stage.title}" savollari</h3>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">Savol qo'shish</button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : questions.length === 0 ? (
        <EmptyState message="Bu bosqichda hali savol yo'q." />
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">{idx + 1}. {q.question}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((opt, i) => (
                      <span key={i} className={`badge text-xs ${i === q.correct_option ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{opt}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">{q.points} ball</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(q); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-600"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(q.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <QuestionForm
          stageId={stage.id}
          question={editing}
          nextOrder={questions.length}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchQuestions() }}
        />
      )}
    </div>
  )
}

function QuestionForm({ stageId, question, nextOrder, onClose, onSuccess }: { stageId: string; question: QuestQuestion | null; nextOrder: number; onClose: () => void; onSuccess: () => void }) {
  const [text, setText] = useState(question?.question || '')
  const [options, setOptions] = useState<string[]>(question?.options?.length ? question.options : ['', '', '', ''])
  const [correctOption, setCorrectOption] = useState(question?.correct_option ?? 0)
  const [points, setPoints] = useState((question?.points ?? 10).toString())
  const [orderIndex, setOrderIndex] = useState((question?.order_index ?? nextOrder).toString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateOption = (i: number, value: string) => setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))
  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (i: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== i))
    if (correctOption >= i) setCorrectOption((c) => Math.max(0, c - 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!text.trim() || cleanOptions.length < 2) {
      setError("Savol matni va kamida 2 ta variant kiritilishi shart.")
      return
    }
    if (correctOption >= cleanOptions.length) {
      setError("To'g'ri javobni tanlang.")
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      stage_id: stageId,
      question: text.trim(),
      options: cleanOptions,
      correct_option: correctOption,
      points: parseInt(points) || 0,
      order_index: parseInt(orderIndex) || 0,
    }

    const { error: upsertError } = question
      ? await supabase.from('quest_questions').update(payload).eq('id', question.id)
      : await supabase.from('quest_questions').insert(payload)

    setSaving(false)
    if (upsertError) { setError("Saqlab bo'lmadi. Qaytadan urinib ko'ring."); return }
    onSuccess()
  }

  return (
    <Modal title={question ? 'Savolni tahrirlash' : "Savol qo'shish"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Savol matni *"><textarea value={text} onChange={(e) => setText(e.target.value)} className="input-field min-h-[70px] resize-none" /></FormField>

        <FormField label="Variantlar (to'g'ri javobni belgilang) *">
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctOption === i} onChange={() => setCorrectOption(i)} className="h-4 w-4" />
                <input type="text" value={opt} onChange={(e) => updateOption(i, e.target.value)} className="input-field flex-1" placeholder={`Variant ${i + 1}`} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-neutral-400 hover:text-red-500">&times;</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm font-medium text-primary-600 hover:text-primary-700">+ Variant qo'shish</button>
          </div>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ball"><input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="input-field" min={0} /></FormField>
          <FormField label="Tartib raqami"><input type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} className="input-field" min={0} /></FormField>
        </div>

        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={question ? 'Saqlash' : "Qo'shish"} />
      </form>
    </Modal>
  )
}
