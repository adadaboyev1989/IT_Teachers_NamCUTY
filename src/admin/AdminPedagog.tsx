import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { PedagogData, PedagogCategory } from '../types'
import { Trash2, Edit3, Upload, Download, FileSpreadsheet, X, Loader2, Clock } from 'lucide-react'
import { SectionHeader, SearchBar, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './shared'

const categories: PedagogCategory[] = ['Oliy', 'Birinchi', 'Ikkinchi', 'Mutaxassis']

const categoryColors: Record<string, string> = {
  Oliy: 'bg-emerald-50 text-emerald-700',
  Birinchi: 'bg-primary-50 text-primary-700',
  Ikkinchi: 'bg-amber-50 text-amber-700',
  Mutaxassis: 'bg-cyan-50 text-cyan-700',
}

export function AdminPedagog() {
  const [data, setData] = useState<PedagogData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PedagogData | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    const { data: rows, error } = await supabase.from('pedagog_data').select('*').order('created_at', { ascending: false })
    if (!error && rows) setData(rows)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm("Bu pedagog ma'lumotini o'chirishni istaysizmi?")) return
    await supabase.from('pedagog_data').delete().eq('id', id)
    fetchData()
  }

  // xlsx is loaded on demand (dynamic import) so its ~140KB doesn't ship in
  // the initial admin panel bundle for admins who never touch Excel.
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const template = [
      { FIO: 'Ali Valiyev', Maktabi: 'Namangan 1-maktab', JSHSHIR: '12345678901234', "Tug'ilgan sanasi": '1985-03-15', Toifasi: 'Oliy', 'Dars soati': 18 },
      { FIO: 'Vali Aliyev', Maktabi: 'Namangan 2-maktab', JSHSHIR: '98765432109876', "Tug'ilgan sanasi": '1990-07-20', Toifasi: 'Birinchi', 'Dars soati': 12 },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedagoglar')
    XLSX.writeFile(wb, 'pedagog_namuna.xlsx')
  }

  const handleExportExcel = async () => {
    if (data.length === 0) return
    const XLSX = await import('xlsx')
    const exportData = data.map((d) => ({
      FIO: d.full_name,
      Maktabi: d.school,
      JSHSHIR: d.pinfl || '',
      "Tug'ilgan sanasi": d.birth_date || '',
      Toifasi: d.category,
      'Dars soati': d.lesson_hours,
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedagoglar')
    XLSX.writeFile(wb, 'pedagoglar_eksport.xlsx')
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

      const pedagogRows = rows.map((row) => {
        const getVal = (keys: string[]): string => {
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

        const category = getVal(['Toifasi', 'Toifa', 'Category']) || 'Mutaxassis'
        const validCategory = categories.includes(category as PedagogCategory) ? category : 'Mutaxassis'
        const rawPinfl = getVal(['JSHSHIR', 'PINFL', 'Pinfl'])
        const validPinfl = /^\d{14}$/.test(rawPinfl) ? rawPinfl : null

        return {
          full_name: getVal(['FIO', 'F.I.O', 'Ism', 'Name']) || "Noma'lum",
          school: getVal(['Maktabi', 'Maktab', 'School']) || "Noma'lum",
          pinfl: validPinfl,
          birth_date: getVal(["Tug'ilgan sanasi", 'Tugilgan sanasi', 'Birth date']) || null,
          category: validCategory,
          lesson_hours: parseInt(getVal(['Dars soati', 'Dars soat', 'Lesson hours'])) || 0,
        }
      }).filter((r) => r.full_name !== "Noma'lum" && r.school !== "Noma'lum")

      if (pedagogRows.length === 0) {
        setImportMsg("Faylda hech qanday to'g'ri ma'lumot topilmadi.")
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      // Upsert-by-pinfl: a re-uploaded/corrected file with the same JSHSHIR
      // updates the existing record instead of failing the whole batch on
      // the pinfl UNIQUE constraint. Rows without a pinfl always insert as
      // new (NULLs never conflict).
      const { error } = await supabase.from('pedagog_data').upsert(pedagogRows, { onConflict: 'pinfl' })

      if (error) {
        setImportMsg(`Import xatosi: ${error.message}`)
      } else {
        setImportMsg(`${pedagogRows.length} ta pedagog muvaffaqiyatli import qilindi!`)
        fetchData()
      }
    } catch {
      setImportMsg("Faylni o'qib bo'lmadi. Excel formatini tekshiring.")
    }

    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filtered = data.filter((d) => {
    const q = search.toLowerCase()
    return d.full_name.toLowerCase().includes(q) || d.school.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.pinfl || '').toLowerCase().includes(q)
  })

  return (
    <div>
      <SectionHeader title="Pedagoglar" subtitle="O'qituvchilarning shaxsiy ma'lumotlarini boshqarish" onAdd={() => { setEditing(null); setShowForm(true) }} addLabel="Pedagog qo'shish" />

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="btn-ghost">
          {importing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Import qilinmoqda...</>) : (<><Upload className="h-4 w-4" /> Excel import</>)}
        </button>
        <button onClick={handleDownloadTemplate} className="btn-ghost"><FileSpreadsheet className="h-4 w-4" />Namuna jadval</button>
        <button onClick={handleExportExcel} disabled={data.length === 0} className="btn-ghost disabled:opacity-50"><Download className="h-4 w-4" />Eksport</button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
      </div>

      {importMsg && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm ${importMsg.includes('xatosi') || importMsg.includes('topilmadi') || importMsg.includes("o'qib") ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {importMsg}
          <button onClick={() => setImportMsg(null)} className="ml-3 text-current opacity-60 hover:opacity-100"><X className="inline h-3.5 w-3.5" /></button>
        </div>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="FIO, maktab, toifa yoki JSHSHIR bo'yicha qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'Qidiruv bo\'yicha pedagoglar topilmadi.' : "Hali pedagog ma'lumotlari yo'q."} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-neutral-700">FIO</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 md:table-cell">Maktab</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 lg:table-cell">JSHSHIR</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 sm:table-cell">Toifa</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 lg:table-cell">Dars soati</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{p.full_name}</div>
                      <div className="text-xs text-neutral-500 md:hidden">{p.school}</div>
                      <div className="mt-1 sm:hidden"><span className={`badge ${categoryColors[p.category] || 'bg-neutral-100 text-neutral-600'}`}>{p.category}</span></div>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{p.school}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-neutral-500 lg:table-cell">{p.pinfl || '—'}</td>
                    <td className="hidden px-4 py-3 sm:table-cell"><span className={`badge ${categoryColors[p.category] || 'bg-neutral-100 text-neutral-600'}`}>{p.category}</span></td>
                    <td className="hidden px-4 py-3 text-neutral-600 lg:table-cell"><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-neutral-400" />{p.lesson_hours} soat</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditing(p); setShowForm(true) }} className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-primary-50 hover:text-primary-600"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <PedagogForm pedagog={editing} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchData() }} />}
    </div>
  )
}

function PedagogForm({ pedagog, onClose, onSuccess }: { pedagog: PedagogData | null; onClose: () => void; onSuccess: () => void }) {
  const [fullName, setFullName] = useState(pedagog?.full_name || '')
  const [school, setSchool] = useState(pedagog?.school || '')
  const [pinfl, setPinfl] = useState(pedagog?.pinfl || '')
  const [birthDate, setBirthDate] = useState(pedagog?.birth_date ? pedagog.birth_date.slice(0, 10) : '')
  const [category, setCategory] = useState<PedagogCategory>(categories.includes(pedagog?.category as PedagogCategory) ? (pedagog?.category as PedagogCategory) : 'Mutaxassis')
  const [lessonHours, setLessonHours] = useState(pedagog?.lesson_hours?.toString() || '0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !school.trim() || !category) {
      setError("FIO, maktab va toifa kiritilishi shart.")
      return
    }
    if (pinfl.trim() && !/^\d{14}$/.test(pinfl.trim())) {
      setError("JSHSHIR 14 ta raqamdan iborat bo'lishi kerak.")
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      full_name: fullName.trim(),
      school: school.trim(),
      pinfl: pinfl.trim() || null,
      birth_date: birthDate || null,
      category,
      lesson_hours: parseInt(lessonHours) || 0,
    }

    const { error: upsertError } = pedagog
      ? await supabase.from('pedagog_data').update(payload).eq('id', pedagog.id)
      : await supabase.from('pedagog_data').insert(payload)

    setSaving(false)

    if (upsertError) {
      setError(upsertError.code === '23505' ? 'Bu JSHSHIR raqami bilan boshqa pedagog allaqachon mavjud.' : "Saqlab bo'lmadi. Qaytadan urinib ko'ring.")
      return
    }
    onSuccess()
  }

  return (
    <Modal title={pedagog ? "Pedagog ma'lumotini tahrirlash" : "Pedagog qo'shish"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="FIO *"><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="Ali Valiyev" /></FormField>
        <FormField label="Maktab / Muassasa *"><input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="input-field" placeholder="Namangan 1-maktab" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="JSHSHIR raqami"><input type="text" value={pinfl} onChange={(e) => setPinfl(e.target.value)} className="input-field" placeholder="12345678901234" maxLength={14} /></FormField>
          <FormField label="Tug'ilgan sanasi"><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input-field" /></FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Toifasi *">
            <select value={category} onChange={(e) => setCategory(e.target.value as PedagogCategory)} className="input-field">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Dars soati"><input type="number" value={lessonHours} onChange={(e) => setLessonHours(e.target.value)} className="input-field" min={0} /></FormField>
        </div>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={pedagog ? 'Saqlash' : "Qo'shish"} />
      </form>
    </Modal>
  )
}
