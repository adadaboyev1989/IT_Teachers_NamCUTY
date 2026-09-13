export type Teacher = {
  id: string
  full_name: string
  school: string
  subject: string
  bio: string | null
  email: string | null
  phone: string | null
  avatar_color: string | null
  created_at: string
}

export type Resource = {
  id: string
  title: string
  description: string
  category: string
  url: string
  author_name: string
  created_at: string
}

export type Event = {
  id: string
  title: string
  description: string
  event_date: string
  location: string
  organizer: string
  created_at: string
}

export type TabId = 'teachers' | 'resources' | 'events'

export type AdminTabId = 'admin-teachers' | 'admin-resources' | 'admin-events' | 'admin-bot'

export type PedagogCategory = 'Oliy' | 'Birinchi' | 'Ikkinchi' | 'Mutaxassis'

export type PedagogData = {
  id: string
  full_name: string
  school: string
  pinfl: string | null
  birth_date: string | null
  category: PedagogCategory
  lesson_hours: number
  certificate_name: string | null
  certificate_issue_date: string | null
  certificate_expiry_date: string | null
  created_at: string
}
