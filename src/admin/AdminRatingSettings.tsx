import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RatingSetting } from '../types'
import { Save, Loader2, SlidersHorizontal } from 'lucide-react'
import { LoadingSpinner } from './shared'

export function AdminRatingSettings() {
  const [settings, setSettings] = useState<RatingSetting[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase.from('rating_settings').select('*').order('key')
    if (!error && data) {
      setSettings(data)
      setValues(Object.fromEntries(data.map((s) => [s.key, s.points.toString()])))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleSave = async (key: string) => {
    const points = parseInt(values[key])
    if (isNaN(points)) return
    setSavingKey(key)
    const { error } = await supabase.from('rating_settings').update({ points, updated_at: new Date().toISOString() }).eq('key', key)
    setSavingKey(null)
    if (!error) {
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, points } : s)))
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 1500)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-neutral-900">Reyting qoidalari</h2>
        <p className="mt-1 text-sm text-neutral-500">Har bir manba uchun ball miqdorini shu yerdan o'zgartirasiz — kod o'zgarishi shart emas.</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="divide-y divide-neutral-100">
            {settings.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{s.label}</p>
                    <p className="text-xs text-neutral-400">{s.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={values[s.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    className="input-field w-24 text-right"
                  />
                  <button onClick={() => handleSave(s.key)} disabled={savingKey === s.key} className="btn-ghost !px-3">
                    {savingKey === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : savedKey === s.key ? <span className="text-emerald-600 text-xs">✓</span> : <Save className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
