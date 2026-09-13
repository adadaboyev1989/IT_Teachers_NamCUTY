import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Event } from '../types'
import { Plus, Trash2, Edit3, MapPin, Calendar, User } from 'lucide-react'
import { SectionHeader, SearchBar, LoadingSpinner, EmptyState, Modal, FormField, ErrorBox, FormActions } from './AdminTeachers'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} ${d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

export function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
    if (!error && data) setEvents(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleDelete = async (id: string) => {
    if (!confirm('Bu tadbirni o\'chirishni istaysizmi?')) return
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }

  const filtered = events.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.title.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q) ||
      e.organizer.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <SectionHeader
        title="Tadbirlar boshqaruvi"
        subtitle="Tadbirlarni qo'shish, tahrirlash va o'chirish"
        onAdd={() => { setEditing(null); setShowForm(true) }}
        addLabel="Tadbir qo'shish"
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Tadbirlarni qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'Qidiruv bo\'yicha tadbirlar topilmadi.' : 'Hali tadbirlar yo\'q.'} />
      ) : (
        <div className="space-y-4">
          {filtered.map((event) => (
            <div key={event.id} className="card group flex items-start gap-5 p-5">
              <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-50">
                <span className="font-display text-xl font-bold text-primary-700">
                  {String(new Date(event.event_date).getDate()).padStart(2, '0')}
                </span>
                <span className="text-xs font-medium text-primary-500">
                  {['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'][new Date(event.event_date).getMonth()]}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-bold text-neutral-900">{event.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600">{event.description}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(event.event_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {event.organizer}
                  </span>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  onClick={() => { setEditing(event); setShowForm(true) }}
                  className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-primary-50 hover:text-primary-600"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="rounded-lg p-1.5 text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <EventForm
          event={editing}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchEvents() }}
        />
      )}
    </div>
  )
}

function EventForm({ event, onClose, onSuccess }: { event: Event | null; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [date, setDate] = useState(event ? new Date(event.event_date).toISOString().slice(0, 10) : '')
  const [time, setTime] = useState(event ? new Date(event.event_date).toTimeString().slice(0, 5) : '')
  const [location, setLocation] = useState(event?.location || '')
  const [organizer, setOrganizer] = useState(event?.organizer || '')
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

    const payload = {
      title: title.trim(),
      description: description.trim(),
      event_date: eventDate,
      location: location.trim(),
      organizer: organizer.trim(),
    }

    const { error: upsertError } = event
      ? await supabase.from('events').update(payload).eq('id', event.id)
      : await supabase.from('events').insert(payload)

    setSaving(false)

    if (upsertError) {
      setError('Saqlab bo\'lmadi. Qaytadan urinib ko\'ring.')
      return
    }

    onSuccess()
  }

  return (
    <Modal title={event ? 'Tadbirni tahrirlash' : 'Tadbir qo\'shish'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Tadbir nomi *">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Boshlovchilar uchun Python seminari" />
        </FormField>
        <FormField label="Tavsif *">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Bu tadbir haqida nima?" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Sana *">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </FormField>
          <FormField label="Vaqt *">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-field" />
          </FormField>
        </div>
        <FormField label="Joy *">
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-field" placeholder="Namangan IT Markazi, Uchkhod ko'chasi 12" />
        </FormField>
        <FormField label="Tashkilotchi *">
          <input type="text" value={organizer} onChange={(e) => setOrganizer(e.target.value)} className="input-field" placeholder="Namangan Ta'lim Boshqarmasi" />
        </FormField>
        {error && <ErrorBox message={error} />}
        <FormActions onClose={onClose} saving={saving} saveLabel={event ? 'Saqlash' : 'Qo\'shish'} />
      </form>
    </Modal>
  )
}
