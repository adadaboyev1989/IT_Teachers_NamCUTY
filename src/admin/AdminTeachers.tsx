import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Teacher } from '../types'
import { Plus, Trash2, Edit3, X, Loader2, Search, Mail, Phone } from 'lucide-react'

const avatarColors = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#ea580c', '#4f46e5', '#16a34a', '#c026d3',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)

  const fetchTeachers = useCallback(async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setTeachers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu o\'qituvchini o\'chirishni istaysizmi?')) return
    await supabase.from('teachers').delete().eq('id', id)
    fetchTeachers()
  }

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase()
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.school.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <SectionHeader
        title="O'qituvchilar boshqaruvi"
        subtitle="O'qituvchilarni qo'shish, tahrirlash va o'chirish"
        onAdd={() => { setEditing(null); setShowForm(true) }}
        addLabel="O'qituvchi qo'shish"
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Ism, maktab yoki fan bo'yicha qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'Qidiruv bo\'yicha o\'qituvchilar topilmadi.' : 'Hali o\'qituvchilar yo\'q.'} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-neutral-700">O'qituvchi</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 md:table-cell">Maktab</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 lg:table-cell">Aloqa</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((teacher) => (
                  <tr key={teacher.id} className="transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                          style={{ backgroundColor: teacher.avatar_color || avatarColors[teacher.full_name.charCodeAt(0) % avatarColors.length] }}
                        >
                          {getInitials(teacher.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">{teacher.full_name}</div>
                          <div className="text-xs text-primary-600">{teacher.subject}</div>
                          <div className="text-xs text-neutral-500 md:hidden">{teacher.school}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{teacher.school}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs text-neutral-500">
                        {teacher.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{teacher.email}</span>}
                        {teacher.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{teacher.phone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditing(teacher); setShowForm(true) }}
                          className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-primary-50 hover:text-primary-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <TeacherForm
          teacher={editing}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchTeachers() }}
        />
      )}
    </div>
  )
}

function TeacherForm({ teacher, onClose, onSuccess }: { teacher: Teacher | null; onClose: () => void; onSuccess: () => void }) {
  const [fullName, setFullName] = useState(teacher?.full_name || '')
  const [school, setSchool] = useState(teacher?.school || '')
  const [subject, setSubject] = useState(teacher?.subject || '')
  const [bio, setBio] = useState(teacher?.bio || '')
  const [email, setEmail] = useState(teacher?.email || '')
  const [phone, setPhone] = useState(teacher?.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !school.trim() || !subject.trim()) {
      setError('Ism, maktab va fan kiritilishi shart.')
      return
    }

    setSaving(true)
    setError(null)

    const color = teacher?.avatar_color || avatarColors[fullName.charCodeAt(0) % avatarColors.length]
    const payload = {
      full_name: fullName.trim(),
      school: school.trim(),
      subject: subject.trim(),
      bio: bio.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      avatar_color: color,
    }

    const { error: upsertError } = teacher
      ? await supabase.from('teachers').update(payload).eq('id', teacher.id)
      : await supabase.from('teachers').insert(payload)

    setSaving(false)

    if (upsertError) {
      setError('Saqlab bo\'lmadi. Qaytadan urinib ko\'ring.')
      return
    }

    onSuccess()
  }

  return (
    <Modal title={teacher ? 'O\'qituvchini tahrirlash' : 'O\'qituvchi qo\'shish'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="To'liq ism *">
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="Ali Valiyev" />
          </FormField>
          <FormField label="Fan *">
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field" placeholder="Informatika" />
          </FormField>
        </div>
        <FormField label="Maktab / Muassasa *">
          <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} className="input-field" placeholder="Namangan 1-maktab" />
        </FormField>
        <FormField label="Biografiya">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="O'qituvchilik tajribangiz haqida qisqacha..." />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="teacher@example.uz" />
          </FormField>
          <FormField label="Telefon">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+998 90 123 45 67" />
          </FormField>
        </div>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={teacher ? 'Saqlash' : 'Qo\'shish'} />
      </form>
    </Modal>
  )
}

// --- Shared components ---

export function SectionHeader({ title, subtitle, onAdd, addLabel }: { title: string; subtitle: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
      <button onClick={onAdd} className="btn-primary">
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="input-field pl-11" />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-20 text-center">
      <p className="text-sm font-medium text-neutral-500">{message}</p>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in">
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-neutral-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{message}</div>
}

export function FormActions({ onClose, saving, saveLabel }: { onClose: () => void; saving: boolean; saveLabel: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="btn-ghost">Bekor qilish</button>
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Saqlanmoqda...</>
        ) : (
          saveLabel
        )}
      </button>
    </div>
  )
}
