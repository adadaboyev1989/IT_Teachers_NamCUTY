import { Mail, Phone } from 'lucide-react'
import type { Teacher } from '../types'

type Props = {
  teacher: Teacher
}

const avatarColors = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#ea580c', '#4f46e5', '#16a34a', '#c026d3',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function TeacherCard({ teacher }: Props) {
  const color = teacher.avatar_color || avatarColors[teacher.full_name.charCodeAt(0) % avatarColors.length]

  return (
    <div className="card group p-5 animate-slide-up">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md"
          style={{ backgroundColor: color }}
        >
          {getInitials(teacher.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold text-neutral-900">
            {teacher.full_name}
          </h3>
          <p className="mt-0.5 text-sm font-medium text-primary-600">
            {teacher.subject}
          </p>
          <p className="mt-0.5 truncate text-sm text-neutral-500">
            {teacher.school}
          </p>
        </div>
      </div>

      {teacher.bio && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {teacher.bio}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-4">
        {teacher.email && (
          <a
            href={`mailto:${teacher.email}`}
            className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-primary-600"
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">{teacher.email}</span>
          </a>
        )}
        {teacher.phone && (
          <a
            href={`tel:${teacher.phone}`}
            className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-primary-600"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{teacher.phone}</span>
          </a>
        )}
      </div>
    </div>
  )
}
