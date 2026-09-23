import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { BattleQuestion } from '../types'
import { Trash2, Edit3, Upload, FileSpreadsheet, Loader2, X } from 'lucide-react'
import { SectionHeader, SearchBar, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './shared'

export function AdminBattle() {
  const [questions, setQuestions] = useState<BattleQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BattleQuestion | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase.from('battle_questions').select('*').order('created_at', { ascending: false })
    if (!error && data) setQuestions(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu savolni o'chirishni istaysizmi?")) return
    await supabase.from('battle_questions').delete().eq('id', id)
    fetchQuestions()
  }

  // xlsx is loaded on demand so its ~140KB doesn't ship in the initial admin
  // panel bundle for admins who never import battle questions.
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const template = [
      { Savol: 'HTML nima uchun ishlatiladi?', 'Javob A': 'Sahifa tuzilishi', 'Javob B': 'Uslub berish', 'Javob C': 'Server mantiqi', 'Javob D': "Ma'lumotlar bazasi", "To'g'ri javob": 'A' },
      { Savol: 'CSS nima uchun ishlatiladi?', 'Javob A': 'Tuzilma', 'Javob B': 'Uslublash', 'Javob C': 'Backend', 'Javob D': 'Baza', "To'g'ri javob": 'B' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    ws['!cols'] = [{ wch: 40 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Savollar')
    XLSX.writeFile(wb, 'battle_savollar_namuna.xlsx')
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

          return { question, options, correct_option: correctOption, is_active: true }
        })
        .filter((r) => r.question && r.options.every((o) => o) && r.correct_option >= 0)

      if (questionRows.length === 0) {
        setImportMsg("Faylda hech qanday to'g'ri savol topilmadi. Har bir qatorda savol, 4 ta javob va to'g'ri javob (A/B/C/D) to'ldirilganini tekshiring.")
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      const { error } = await supabase.from('battle_questions').insert(questionRows)

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

  const filtered = questions.filter((q) => q.question.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <SectionHeader title="Battle savollar banki" subtitle="Onlayn o'qituvchilar o'rtasidagi jonli duel uchun savollar" onAdd={() => { setEditing(null); setShowForm(true) }} addLabel="Savol qo'shish" />

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="btn-ghost">
          {importing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Import qilinmoqda...</>) : (<><Upload className="h-4 w-4" /> Excel import</>)}
        </button>
        <button onClick={handleDownloadTemplate} className="btn-ghost"><FileSpreadsheet className="h-4 w-4" />Namuna jadval</button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
      </div>

      {importMsg && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${importMsg.includes('xatosi') || importMsg.includes('topilmadi') || importMsg.includes("o'qib") ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'}`}>
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="ml-3 text-current opacity-60 hover:opacity-100"><X className="inline h-3.5 w-3.5" /></button>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Savol bo'yicha qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message="Hali battle savoli yo'q." />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900">{q.question}</p>
                    {!q.is_active && <span className="badge bg-neutral-100 text-neutral-500">Nofaol</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt, i) => (
                      <span key={i} className={`badge text-xs ${i === q.correct_option ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500'}`}>{opt}</span>
                    ))}
                  </div>
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

      {showForm && <BattleQuestionForm question={editing} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchQuestions() }} />}
    </div>
  )
}

function BattleQuestionForm({ question, onClose, onSuccess }: { question: BattleQuestion | null; onClose: () => void; onSuccess: () => void }) {
  const [text, setText] = useState(question?.question || '')
  const [options, setOptions] = useState<string[]>(question?.options?.length ? question.options : ['', '', '', ''])
  const [correctOption, setCorrectOption] = useState(question?.correct_option ?? 0)
  const [isActive, setIsActive] = useState(question?.is_active ?? true)
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
      setError('Savol matni va kamida 2 ta variant kiritilishi shart.')
      return
    }
    if (correctOption >= cleanOptions.length) {
      setError("To'g'ri javobni tanlang.")
      return
    }

    setSaving(true)
    setError(null)

    const payload = { question: text.trim(), options: cleanOptions, correct_option: correctOption, is_active: isActive }

    const { error: upsertError } = question
      ? await supabase.from('battle_questions').update(payload).eq('id', question.id)
      : await supabase.from('battle_questions').insert(payload)

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
                {options.length > 2 && <button type="button" onClick={() => removeOption(i)} className="text-neutral-400 hover:text-red-500">&times;</button>}
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm font-medium text-primary-600 hover:text-primary-700">+ Variant qo'shish</button>
          </div>
        </FormField>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          Faol (o'yinda ishlatiladi)
        </label>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={question ? 'Saqlash' : "Qo'shish"} />
      </form>
    </Modal>
  )
}
