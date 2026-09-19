import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { PedagogData, BotUser } from '../types'
import { Bot, CheckCircle2, CircleSlash, Send, Users } from 'lucide-react'
import { SearchBar, LoadingSpinner, EmptyState } from './shared'

type Row = {
  pedagog: PedagogData
  botUser: BotUser | null
}

type StatusFilter = 'all' | 'registered' | 'not_started'

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function relativeTime(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'hozirgina'
  if (minutes < 60) return `${minutes} daqiqa oldin`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} soat oldin`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} kun oldin`
  return null
}

export function AdminBotStatus() {
  const [pedagogs, setPedagogs] = useState<PedagogData[]>([])
  const [botUsers, setBotUsers] = useState<BotUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  const fetchData = useCallback(async () => {
    const [{ data: peds }, { data: users }] = await Promise.all([
      supabase.from('pedagog_data').select('*').order('full_name'),
      supabase.from('bot_users').select('*'),
    ])
    setPedagogs(peds || [])
    setBotUsers(users || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const botUserByPedagogId = useMemo(() => {
    const map = new Map<string, BotUser>()
    for (const u of botUsers) {
      if (u.pedagog_data_id) map.set(u.pedagog_data_id, u)
    }
    return map
  }, [botUsers])

  const rows: Row[] = useMemo(
    () => pedagogs.map((pedagog) => ({ pedagog, botUser: botUserByPedagogId.get(pedagog.id) || null })),
    [pedagogs, botUserByPedagogId]
  )

  const registeredCount = rows.filter((r) => r.botUser?.is_registered).length
  const notStartedCount = rows.length - registeredCount
  // Someone messaged the bot and typed a PINFL that didn't match any
  // pedagog_data row — no way to know who they are, but worth surfacing so
  // the admin knows there's a mismatch to chase down (typo, not yet
  // entered into pedagog_data, etc).
  const unmatchedAttempts = botUsers.filter((u) => !u.pedagog_data_id).length

  const filtered = rows.filter((r) => {
    if (filter === 'registered' && !r.botUser?.is_registered) return false
    if (filter === 'not_started' && r.botUser?.is_registered) return false
    const q = search.toLowerCase()
    return r.pedagog.full_name.toLowerCase().includes(q) || r.pedagog.school.toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Bot holati</h2>
        <p className="mt-1 text-sm text-neutral-500">Admin kiritgan pedagoglar asosida — kim botga start bergan, kim hali ulanmagan</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Jami pedagoglar" value={rows.length} color="primary" />
        <StatCard icon={CheckCircle2} label="Botga ulangan" value={registeredCount} color="emerald" />
        <StatCard icon={CircleSlash} label="Hali ulanmagan" value={notStartedCount} color="amber" />
        <StatCard icon={Send} label="Mos kelmagan urinishlar" value={unmatchedAttempts} color="cyan" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(
          [
            ['all', 'Barchasi'],
            ['registered', 'Ulanganlar'],
            ['not_started', 'Ulanmaganlar'],
          ] as [StatusFilter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              filter === id ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="FIO yoki maktab bo'yicha qidirish..." />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message={search ? 'Qidiruv bo\'yicha hech kim topilmadi.' : "Hali pedagog qo'shilmagan."} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-neutral-700">FIO</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 md:table-cell">Maktab</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Holat</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 lg:table-cell">Telegram</th>
                  <th className="hidden px-4 py-3 font-semibold text-neutral-700 xl:table-cell">Birinchi marta kirgan</th>
                  <th className="px-4 py-3 font-semibold text-neutral-700">Oxirgi faollik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(({ pedagog, botUser }) => {
                  const rel = relativeTime(botUser?.last_seen_at ?? null)
                  return (
                    <tr key={pedagog.id} className="transition-colors hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{pedagog.full_name}</div>
                        <div className="text-xs text-neutral-500 md:hidden">{pedagog.school}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{pedagog.school}</td>
                      <td className="px-4 py-3">
                        {botUser?.is_registered ? (
                          <span className="badge inline-flex items-center gap-1 bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Ulangan</span>
                        ) : (
                          <span className="badge inline-flex items-center gap-1 bg-neutral-100 text-neutral-500"><CircleSlash className="h-3.5 w-3.5" />Ulanmagan</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-neutral-600 lg:table-cell">
                        {botUser?.telegram_username ? `@${botUser.telegram_username}` : botUser ? <span className="text-neutral-400">username yo'q</span> : '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-neutral-500 xl:table-cell">{formatDateTime(botUser?.created_at ?? null)}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {botUser?.last_seen_at ? (rel ? <span title={formatDateTime(botUser.last_seen_at)}>{rel}</span> : formatDateTime(botUser.last_seen_at)) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Bot
  label: string
  value: number
  color: 'primary' | 'emerald' | 'amber' | 'cyan'
}) {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  }
  return (
    <div className="card p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-display text-2xl font-bold text-neutral-900">{value}</p>
      <p className="mt-0.5 text-sm text-neutral-500">{label}</p>
    </div>
  )
}
