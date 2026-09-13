import { useState } from 'react'
import { Bot, Users, Trophy } from 'lucide-react'
import { AdminPedagog } from './AdminPedagog'
import { AdminReyting } from './AdminReyting'

type BotSubTab = 'pedagog' | 'reyting'

const subTabs: { id: BotSubTab; label: string; icon: typeof Users }[] = [
  { id: 'pedagog', label: 'Pedagog', icon: Users },
  { id: 'reyting', label: 'Reyting', icon: Trophy },
]

export function AdminBot() {
  const [activeSubTab, setActiveSubTab] = useState<BotSubTab>('pedagog')

  return (
    <div>
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 shadow-md shadow-primary-600/20">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900">Bot bo'limi</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Telegram bot orqali amalga oshiriladigan funksiyalar
            </p>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl border border-neutral-200 bg-white p-1.5">
          {subTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
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
      </div>

      <div className="animate-fade-in">
        {activeSubTab === 'pedagog' && <AdminPedagog />}
        {activeSubTab === 'reyting' && <AdminReyting />}
      </div>
    </div>
  )
}
