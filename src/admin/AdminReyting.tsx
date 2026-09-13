import { useState, useEffect, useCallback } from 'react'
import { Trophy, TrendingUp, Star, Award, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PedagogData } from '../types'
import { calculateRating } from '../lib/rating'
import { LoadingSpinner, EmptyState } from './AdminTeachers'

const categoryColors: Record<string, string> = {
  Oliy: 'bg-emerald-50 text-emerald-700',
  Birinchi: 'bg-primary-50 text-primary-700',
  Ikkinchi: 'bg-amber-50 text-amber-700',
  Mutaxassis: 'bg-cyan-50 text-cyan-700',
}

export function AdminReyting() {
  const [data, setData] = useState<PedagogData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: rows, error } = await supabase.from('pedagog_data').select('*')
    if (!error && rows) setData(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const total = data.length
  const oliyCount = data.filter((p) => p.category === 'Oliy').length
  const certifiedCount = data.filter((p) => !!p.certificate_name).length
  const avgHours = total > 0 ? Math.round(data.reduce((sum, p) => sum + (p.lesson_hours || 0), 0) / total) : 0

  const ranked = [...data]
    .map((p) => ({ pedagog: p, score: calculateRating(p) }))
    .sort((a, b) => b.score - a.score)

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Reyting</h2>
        <p className="mt-1 text-sm text-neutral-500">
          O'qituvchilarning pedagogik ko'rsatkichlari bo'yicha reyting tizimi
        </p>
      </div>

      <div className="mb-8 rounded-2xl border border-primary-200 bg-primary-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-600 shadow-md shadow-primary-600/20">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-neutral-900">
              Reyting tizimi
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Bu bo'limda pedagog ma'lumotlari asosida o'qituvchilar reytingi tuziladi.
              Toifa, dars soatlari va sertifikatlar hisobga olinadi (Mini App'dagi bilan bir xil formula).
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Jami pedagoglar" value={String(total)} color="primary" />
        <StatCard icon={Award} label="Oliy toifa" value={String(oliyCount)} color="emerald" />
        <StatCard icon={Star} label="Sertifikatlangan" value={String(certifiedCount)} color="amber" />
        <StatCard icon={TrendingUp} label="O'rtacha dars soati" value={String(avgHours)} color="cyan" />
      </div>

      <div className="mt-8">
        {loading ? (
          <LoadingSpinner />
        ) : ranked.length === 0 ? (
          <EmptyState message="Hali pedagog ma'lumotlari yo'q. Avval Pedagog bo'limidan ma'lumot qo'shing." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-700">#</th>
                    <th className="px-4 py-3 font-semibold text-neutral-700">FIO</th>
                    <th className="hidden px-4 py-3 font-semibold text-neutral-700 md:table-cell">Maktab</th>
                    <th className="hidden px-4 py-3 font-semibold text-neutral-700 sm:table-cell">Toifa</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-700">Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {ranked.map(({ pedagog, score }, index) => (
                    <tr key={pedagog.id} className="transition-colors hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{pedagog.full_name}</div>
                        <div className="text-xs text-neutral-500 md:hidden">{pedagog.school}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{pedagog.school}</td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className={`badge ${categoryColors[pedagog.category] || 'bg-neutral-100 text-neutral-600'}`}>
                          {pedagog.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-display font-bold text-primary-600">{score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy
  label: string
  value: string
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
