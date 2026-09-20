import { useEffect, useState } from 'react'
import { User, Trophy, Puzzle, Swords } from 'lucide-react'
import { getTelegramWebApp } from './lib/telegram'
import { callMiniApi } from './lib/api'
import { useTelegramTheme } from './lib/theme'
import { ProfileTab } from './ProfileTab'
import { RatingTab } from './RatingTab'
import { QuestTab } from './QuestTab'
import { BattleTab } from './BattleTab'

export type CertificateStatus = {
  days_until_expiry: number | null
  is_expired: boolean
  is_expiring_soon: boolean
}

export type Profile = {
  pedagog_data_id: string
  full_name: string
  school: string
  category: string
  has_certificate: boolean
  certificate_name: string | null
  certificate_issue_date: string | null
  certificate_expiry_date: string | null
  certificate_status: CertificateStatus
  category_points: number
  certificate_points: number
  quest_points: number
  battle_points: number
  task_points: number
  achievement_points: number
  total_points: number
  rank: number | null
  total_teachers: number
}

type TabId = 'profile' | 'rating' | 'quest' | 'battle'

const tabs: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'rating', label: 'Reyting', icon: Trophy },
  { id: 'quest', label: 'Quest', icon: Puzzle },
  { id: 'battle', label: 'Battle', icon: Swords },
]

export function MiniApp() {
  useTelegramTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const loadProfile = async () => {
    const res = await callMiniApi<{ profile: Profile }>('/profile')
    if (!res.ok) {
      setError(res.error || "Ma'lumot topilmadi");
      setLoading(false)
      return
    }
    setProfile(res.profile)
    setLoading(false)
  }

  useEffect(() => {
    const tg = getTelegramWebApp()
    tg?.ready()
    tg?.expand()
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center">
        <p className="text-4xl">⚠️</p>
        <p className="text-sm font-medium text-neutral-600">{error || "Ma'lumot topilmadi"}</p>
        <p className="text-xs text-neutral-400">Iltimos, botga qaytib /start bosing.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-20">
      <main className="flex-1 px-4 pt-4">
        {activeTab === 'profile' && <ProfileTab profile={profile} />}
        {activeTab === 'rating' && <RatingTab myId={profile.pedagog_data_id} />}
        {activeTab === 'quest' && <QuestTab onPointsChanged={loadProfile} />}
        {activeTab === 'battle' && <BattleTab profile={profile} onPointsChanged={loadProfile} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-surface/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-all ${isActive ? 'text-primary-600' : 'text-neutral-400'}`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
