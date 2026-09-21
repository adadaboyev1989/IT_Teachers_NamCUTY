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
  last_birthday_greeted_year: number | null
  created_at: string
}

export type LeaderboardRow = {
  pedagog_data_id: string
  full_name: string
  school: string
  category: PedagogCategory
  category_points: number
  certificate_points: number
  quest_points: number
  battle_points: number
  task_points: number
  achievement_points: number
  activity_points: number
  total_points: number
}

export type QuestStage = {
  id: string
  title: string
  description: string | null
  order_index: number
  time_limit_seconds: number | null
  is_active: boolean
  created_at: string
}

export type QuestQuestion = {
  id: string
  stage_id: string
  question: string
  options: string[]
  correct_option: number
  points: number
  order_index: number
  created_at: string
}

export type BattleQuestion = {
  id: string
  question: string
  options: string[]
  correct_option: number
  is_active: boolean
  created_at: string
}

export type RatingSetting = {
  key: string
  label: string
  points: number
  updated_at: string
}

export type Task = {
  id: string
  title: string
  description: string | null
  points: number
  is_active: boolean
  created_at: string
}

export type TaskCompletion = {
  id: string
  task_id: string
  pedagog_data_id: string
  completed: boolean
  completed_at: string | null
}

export type Achievement = {
  id: string
  pedagog_data_id: string
  title: string
  points: number
  awarded_at: string
  created_at: string
}

export type BotUser = {
  telegram_id: number
  telegram_username: string | null
  telegram_first_name: string | null
  telegram_last_name: string | null
  phone_number: string | null
  pedagog_data_id: string | null
  is_registered: boolean
  state: string
  created_at: string
  last_seen_at: string | null
}

export type AdminTabId = 'pedagog' | 'quest' | 'battle' | 'rating' | 'tasks' | 'achievements' | 'bot-status'
