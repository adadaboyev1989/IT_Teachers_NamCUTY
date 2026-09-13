import { useState } from 'react'
import { Plus, MapPin, Calendar, User } from 'lucide-react'
import type { Event } from '../types'
import { EventFormModal } from './EventFormModal'

type Props = {
  events: Event[]
  onRefresh: () => void
}

function formatDate(dateStr: string): { day: string; month: string; time: string } {
  const d = new Date(dateStr)
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: months[d.getMonth()],
    time: d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

export function EventsView({ events, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.event_date) >= now)
  const past = events.filter((e) => new Date(e.event_date) < now)

  return (
    <div className="pt-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">
            Jamoaviy tadbirlar
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            IT o'qituvchilari uchun seminarlar, uchrashuvlar va konferensiyalar
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Tadbir qo'shish
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-20 text-center">
          <p className="text-sm font-medium text-neutral-500">
            Hali tadbirlar rejalashtirilmagan. Birinchisini qo'shing!
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Yaqinlashmoqda
              </h3>
              <div className="space-y-4">
                {upcoming.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                O'tgan tadbirlar
              </h3>
              <div className="space-y-4">
                {past.map((event) => (
                  <EventRow key={event.id} event={event} isPast />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <EventFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}

function EventRow({
  event,
  isPast = false,
}: {
  event: Event
  isPast?: boolean
}) {
  const { day, month, time } = formatDate(event.event_date)

  return (
    <div
      className={`card group flex items-start gap-5 p-5 animate-slide-up ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-50">
        <span className="font-display text-xl font-bold text-primary-700">
          {day}
        </span>
        <span className="text-xs font-medium text-primary-500">{month}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-base font-bold text-neutral-900">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600">
          {event.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {time}
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
    </div>
  )
}
