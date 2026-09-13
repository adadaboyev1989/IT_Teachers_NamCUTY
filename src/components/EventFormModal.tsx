import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Props = {
  onClose: () => void
  onSuccess: () => void
}

export function EventFormModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !date || !time || !location.trim() || !organizer.trim()) {
      setError('Barcha maydonlar to\'ldirilishi shart.')
      return
    }

    setSaving(true)
    setError(null)

    const eventDate = new Date(`${date}T${time}`).toISOString()

    const { error: insertError } = await supabase.from('events').insert({
      title: title.trim(),
      description: description.trim(),
      event_date: eventDate,
      location: location.trim(),
      organizer: organizer.trim(),
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
            Tadbir qo'shish
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Field label="Tadbir nomi *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Boshlovchilar uchun Python seminari"
              maxLength={200}
            />
          </Field>

          <Field label="Tavsif *">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="Bu tadbir haqida nima?"
              maxLength={4000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sana *">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Vaqt *">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-field"
              />
            </Field>
          </div>

          <Field label="Joy *">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              placeholder="Namangan IT Markazi, Uchkhod ko'chasi 12"
              maxLength={200}
            />
          </Field>

          <Field label="Tashkilotchi *">
            <input
              type="text"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              className="input-field"
              placeholder="Namangan Ta'lim Boshqarmasi"
              maxLength={200}
            />
          </Field>

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
                "Tadbir qo'shish"
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
