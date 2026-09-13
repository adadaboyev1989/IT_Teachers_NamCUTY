import { useState, useEffect } from 'react'
import { GraduationCap, CalendarDays, BookOpen, Users, Bot, LogOut, ExternalLink } from 'lucide-react'
import type { AdminTabId } from '../types'
import { AdminTeachers } from './AdminTeachers'
import { AdminResources } from './AdminResources'
import { AdminEvents } from './AdminEvents'
import { AdminBot } from './AdminBot'
import { supabase } from '../lib/supabase'

type Props = {
  onLogout: () => void
}

const tabs: { id: AdminTabId; label: string; icon: typeof Users }[] = [
  { id: 'admin-teachers', label: 'O\'qituvchilar', icon: Users },
  { id: 'admin-resources', label: 'Resurslar', icon: BookOpen },
  { id: 'admin-events', label: 'Tadbirlar', icon: CalendarDays },
  { id: 'admin-bot', label: 'Bot', icon: Bot },
]

export function AdminLayout({ onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTabId>('admin-teachers')

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
              <span className="font-display text-base font-bold text-neutral-900">
                Admin Panel
              </span>
              <span className="text-xs font-medium text-neutral-500">
                IT O'qituvchilar Namangan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-100 hover:text-neutral-900 sm:flex"
            >
              <ExternalLink className="h-4 w-4" />
              Saytga
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
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
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="animate-fade-in">
          {activeTab === 'admin-teachers' && <AdminTeachers />}
          {activeTab === 'admin-resources' && <AdminResources />}
          {activeTab === 'admin-events' && <AdminEvents />}
          {activeTab === 'admin-bot' && <AdminBot />}
        </div>
      </div>
    </div>
  )
}
