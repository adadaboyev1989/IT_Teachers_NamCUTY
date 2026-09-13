import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Teacher } from '../types'
import { supabase } from '../lib/supabase'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

const avatarColors = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#ea580c', '#4f46e5', '#16a34a', '#c026d3',
]

export function TeacherFormModal({ onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [subject, setSubject] = useState('')
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
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

    const color = avatarColors[fullName.charCodeAt(0) % avatarColors.length]

    const { error: insertError } = await supabase
      .from('teachers')
      .insert({
        full_name: fullName.trim(),
        school: school.trim(),
        subject: subject.trim(),
        bio: bio.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        avatar_color: color,
      })

    setSaving(false)

    if (insertError) {
      setError('Saqlab bo\'lmadi. Qaytadan urinib ko\'ring.')
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-scale-in">
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-100 bg-white px-6 py-4">
          <h3 className="font-display text-lg font-bold text-neutral-900">
            O'qituvchi profilini qo'shish
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="To'liq ism *">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Ali Valiyev"
                maxLength={200}
              />
            </Field>
            <Field label="Fan *">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field"
                placeholder="Informatika"
                maxLength={200}
              />
            </Field>
          </div>

          <Field label="Maktab / Muassasa *">
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="input-field"
              placeholder="Namangan 1-maktab"
              maxLength={200}
            />
          </Field>

          <Field label="Biografiya">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="O'qituvchilik tajribangiz haqida qisqacha..."
              maxLength={2000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="teacher@example.uz"
              />
            </Field>
            <Field label="Telefon">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder="+998 90 123 45 67"
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Bekor qilish
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                'Profilni saqlash'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  )
}
