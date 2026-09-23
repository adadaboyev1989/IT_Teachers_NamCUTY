import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { QuestStage, QuestQuestion, QuestDifficulty } from '../types'
import { Trash2, Edit3, ChevronRight, Clock, ListChecks, Upload, FileSpreadsheet, Loader2, X } from 'lucide-react'
import { SectionHeader, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './shared'

const difficulties: QuestDifficulty[] = ['oson', 'orta', 'qiyin']

const difficultyLabels: Record<QuestDifficulty, string> = {
  oson: 'Oson',
  orta: "O'rta",
  qiyin: 'Qiyin',
}

const difficultyColors: Record<QuestDifficulty, string> = {
  oson: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  orta: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  qiyin: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
}

// Fallback default points-by-difficulty if rating_settings somehow doesn't
// have these keys yet — matches the values the migration seeds them with.
const DEFAULT_DIFFICULTY_POINTS: Record<QuestDifficulty, number> = { oson: 5, orta: 10, qiyin: 15 }

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
            <div key={stage.id} className={`card cursor-pointer p-5 transition-all hover:border-primary-300 dark:hover:border-primary-500/40 ${selectedStage?.id === stage.id ? 'border-primary-400 ring-2 ring-primary-100 dark:border-primary-500/60 dark:ring-primary-500/20' : ''}`} onClick={() => setSelectedStage(stage)}>
              <div className="mb-2 flex items-start justify-between">
                <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-400">#{stage.order_index}</span>
                {!stage.is_active && <span className="badge bg-neutral-100 text-neutral-500">Nofaol</span>}
              </div>
              <h3 className="font-display font-bold text-neutral-900">{stage.title}</h3>
              {stage.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{stage.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                {stage.time_limit_seconds ? (
                  <span className="inline-flex items-center gap-1 text-xs text-neutral-400"><Clock className="h-3.5 w-3.5" />{stage.time_limit_seconds}s</span>
                ) : <span />}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditing(stage); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(stage.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
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
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // xlsx is loaded on demand so its ~140KB doesn't ship in the initial admin
  // panel bundle for admins who never import quest questions.
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const template = [
      { Savol: 'HTML nima uchun ishlatiladi?', 'Javob A': 'Sahifa tuzilishi', 'Javob B': 'Uslub berish', 'Javob C': 'Server mantiqi', 'Javob D': "Ma'lumotlar bazasi", "To'g'ri javob": 'A', 'Qiyinlik darajasi': 'oson' },
      { Savol: 'Rekursiya nima?', 'Javob A': 'Tsikl turi', 'Javob B': "Funksiyaning o'zini o'zi chaqirishi", 'Javob C': "O'zgaruvchi turi", 'Javob D': 'Massiv metodi', "To'g'ri javob": 'B', 'Qiyinlik darajasi': "o'rta" },
      { Savol: 'Big O notatsiyasida O(log n) nimani anglatadi?', 'Javob A': 'Chiziqli murakkablik', 'Javob B': "Doimiy murakkablik", 'Javob C': 'Logarifmik murakkablik', 'Javob D': 'Kvadratik murakkablik', "To'g'ri javob": 'C', 'Qiyinlik darajasi': 'qiyin' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    ws['!cols'] = [{ wch: 40 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Savollar')
    XLSX.writeFile(wb, 'quest_savollar_namuna.xlsx')
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMsg(null)

    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      const { data: settings } = await supabase.from('rating_settings').select('key, points').in('key', ['quest_points_oson', 'quest_points_orta', 'quest_points_qiyin'])
      const pointsByDifficulty: Record<QuestDifficulty, number> = { ...DEFAULT_DIFFICULTY_POINTS }
      for (const s of settings || []) {
        if (s.key === 'quest_points_oson') pointsByDifficulty.oson = s.points
        if (s.key === 'quest_points_orta') pointsByDifficulty.orta = s.points
        if (s.key === 'quest_points_qiyin') pointsByDifficulty.qiyin = s.points
      }

      const getVal = (row: Record<string, unknown>, keys: string[]): string => {
        for (const k of keys) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase().trim() === k.toLowerCase().trim()) {
              const v = row[key]
              if (v === undefined || v === null || v === '') return ''
              return String(v).trim()
            }
          }
        }
        return ''
      }

      let nextOrder = questions.length
      const questionRows = rows
        .map((row) => {
          const question = getVal(row, ['Savol', 'Question'])
          const options = [
            getVal(row, ['Javob A', 'Variant A', 'A']),
            getVal(row, ['Javob B', 'Variant B', 'B']),
            getVal(row, ['Javob C', 'Variant C', 'C']),
            getVal(row, ['Javob D', 'Variant D', 'D']),
          ]
          const correctLetter = getVal(row, ["To'g'ri javob", "Togri javob", 'Correct answer']).toUpperCase()
          const correctOption = ['A', 'B', 'C', 'D'].indexOf(correctLetter)
          const rawDifficulty = getVal(row, ['Qiyinlik darajasi', 'Difficulty']).toLowerCase().replace(/['’‘]/g, '')
          const difficulty: QuestDifficulty = rawDifficulty === 'oson' ? 'oson' : rawDifficulty === 'qiyin' ? 'qiyin' : 'orta'

          return {
            stage_id: stage.id,
            question,
            options,
            correct_option: correctOption,
            points: pointsByDifficulty[difficulty],
            difficulty,
            order_index: nextOrder++,
          }
        })
        .filter((r) => r.question && r.options.every((o) => o) && r.correct_option >= 0)

      if (questionRows.length === 0) {
        setImportMsg("Faylda hech qanday to'g'ri savol topilmadi. Har bir qatorda savol, 4 ta javob va to'g'ri javob (A/B/C/D) to'ldirilganini tekshiring.")
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      const { error } = await supabase.from('quest_questions').insert(questionRows)

      if (error) {
        setImportMsg(`Import xatosi: ${error.message}`)
      } else {
        setImportMsg(`${questionRows.length} ta savol muvaffaqiyatli import qilindi!`)
        fetchQuestions()
      }
    } catch {
      setImportMsg("Faylni o'qib bo'lmadi. Excel formatini tekshiring.")
    }

    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const countByDifficulty = difficulties.map((d) => ({ difficulty: d, count: questions.filter((q) => q.difficulty === d).length }))

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary-600" />
          <h3 className="font-display text-lg font-bold text-neutral-900">"{stage.title}" savollari</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="btn-ghost">
            {importing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Import qilinmoqda...</>) : (<><Upload className="h-4 w-4" /> Excel import</>)}
          </button>
          <button onClick={handleDownloadTemplate} className="btn-ghost"><FileSpreadsheet className="h-4 w-4" />Namuna jadval</button>
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary">Savol qo'shish</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
        </div>
      </div>

      {questions.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <span>Jami {questions.length} ta savol:</span>
          {countByDifficulty.map(({ difficulty, count }) => (
            <span key={difficulty} className={`badge ${difficultyColors[difficulty]}`}>{difficultyLabels[difficulty]}: {count}</span>
          ))}
        </div>
      )}

      {importMsg && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${importMsg.includes('xatosi') || importMsg.includes('topilmadi') || importMsg.includes("o'qib") ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'}`}>
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="ml-3 text-current opacity-60 hover:opacity-100"><X className="inline h-3.5 w-3.5" /></button>
        </div>
      )}

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
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900">{idx + 1}. {q.question}</p>
                    <span className={`badge flex-shrink-0 text-xs ${difficultyColors[q.difficulty]}`}>{difficultyLabels[q.difficulty]}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((opt, i) => (
                      <span key={i} className={`badge text-xs ${i === q.correct_option ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500'}`}>{opt}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">{q.points} ball</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(q); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(q.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
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
  const [difficulty, setDifficulty] = useState<QuestDifficulty>(question?.difficulty ?? 'orta')
  const [points, setPoints] = useState((question?.points ?? DEFAULT_DIFFICULTY_POINTS.orta).toString())
  const [orderIndex, setOrderIndex] = useState((question?.order_index ?? nextOrder).toString())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Difficulty drives the default point value (admin-editable in Reyting
  // qoidalari) — picking a difficulty fills in its points; the admin can
  // still override the number afterward if this question should differ.
  const handleDifficultyChange = async (d: QuestDifficulty) => {
    setDifficulty(d)
    const { data } = await supabase.from('rating_settings').select('points').eq('key', `quest_points_${d}`).maybeSingle()
    setPoints((data?.points ?? DEFAULT_DIFFICULTY_POINTS[d]).toString())
  }

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
      difficulty,
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

        <FormField label="Qiyinlik darajasi *">
          <div className="flex gap-2">
            {difficulties.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDifficultyChange(d)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  difficulty === d ? `border-transparent ${difficultyColors[d]}` : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                {difficultyLabels[d]}
              </button>
            ))}
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
