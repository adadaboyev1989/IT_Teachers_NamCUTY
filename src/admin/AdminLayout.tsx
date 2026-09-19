import { useState } from 'react'
import { GraduationCap, Users, Puzzle, Swords, Trophy, ClipboardList, Bot, LogOut } from 'lucide-react'
import type { AdminTabId } from '../types'
import { supabase } from '../lib/supabase'
import { AdminPedagog } from './AdminPedagog'
import { AdminQuest } from './AdminQuest'
import { AdminBattle } from './AdminBattle'
import { AdminRatingSettings } from './AdminRatingSettings'
import { AdminTasks } from './AdminTasks'
import { AdminBotStatus } from './AdminBotStatus'

type Props = { onLogout: () => void }

const tabs: { id: AdminTabId; label: string; icon: typeof Users }[] = [
  { id: 'pedagog', label: "Pedagoglar", icon: Users },
  { id: 'quest', label: 'Quest', icon: Puzzle },
  { id: 'battle', label: 'Battle', icon: Swords },
  { id: 'rating', label: 'Reyting', icon: Trophy },
  { id: 'tasks', label: 'Topshiriqlar', icon: ClipboardList },
  { id: 'bot-status', label: 'Bot holati', icon: Bot },
]

export function AdminLayout({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTabId>('pedagog')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-md shadow-primary-600/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-bold text-neutral-900">Admin Panel</span>
              <span className="text-xs font-medium text-neutral-500">IT O'qituvchilar Namangan</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Chiqish</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="animate-fade-in">
          {activeTab === 'pedagog' && <AdminPedagog />}
          {activeTab === 'quest' && <AdminQuest />}
          {activeTab === 'battle' && <AdminBattle />}
          {activeTab === 'rating' && <AdminRatingSettings />}
          {activeTab === 'tasks' && <AdminTasks />}
          {activeTab === 'bot-status' && <AdminBotStatus />}
        </div>
      </div>
    </div>
  )
}
