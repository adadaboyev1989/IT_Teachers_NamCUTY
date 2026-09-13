import { GraduationCap, Users, BookOpen, CalendarDays } from 'lucide-react'
import type { TabId } from '../types'

type Props = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'teachers', label: 'O\'qituvchilar', icon: Users },
  { id: 'resources', label: 'Resurslar', icon: BookOpen },
  { id: 'events', label: 'Tadbirlar', icon: CalendarDays },
]

export function Navbar({ activeTab, onTabChange }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/60 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-md shadow-primary-600/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-bold text-neutral-900">
              IT O'qituvchilar
            </span>
            <span className="text-xs font-medium text-neutral-500">
              Namangan shahri
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 sm:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <nav className="flex items-center gap-1 sm:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-500 hover:bg-neutral-100'
                }`}
                aria-label={tab.label}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
