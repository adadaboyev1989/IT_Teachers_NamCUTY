import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { LeaderboardRow } from '../types'

export function RatingTab({ myId }: { myId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // `leaderboard` is a view with an anon SELECT policy (see
    // 20260917090100_create_rating_and_points.sql) — it's the one place
    // the Mini App queries Supabase directly instead of going through
    // miniapp-api, since it deliberately exposes nothing sensitive.
    supabase
      .from('leaderboard')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRows(data || [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" /></div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className="font-display text-lg font-bold text-neutral-900">Reyting jadvali</h2>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.pedagog_data_id} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${row.pedagog_data_id === myId ? 'bg-primary-50 ring-1 ring-primary-200' : 'bg-white'}`}>
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>{i + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{row.full_name}</p>
              <p className="truncate text-xs text-neutral-400">{row.school}</p>
            </div>
            <div className="font-display font-bold text-primary-600">{row.total_points}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
