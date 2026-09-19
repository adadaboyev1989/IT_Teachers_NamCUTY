import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { GraduationCap, Loader2, Lock, User } from 'lucide-react'

type Props = { onSuccess: () => void }

export function AdminLogin({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)

    if (signInError || !data.session) {
      setError(signInError?.message || "Login yoki parol noto'g'ri.")
      return
    }
    onSuccess()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-4">
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary-500 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-accent-500 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-600/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-primary-200">IT O'qituvchilar Namangan</p>
        </div>

        <div className="rounded-2xl bg-surface p-8 shadow-2xl animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Login</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field pl-11" placeholder="admin@it-teachers.uz" required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">Parol</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pl-11" placeholder="••••••••" required />
              </div>
            </div>
            {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-500/15 dark:text-red-400">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Kirilmoqda...</>) : ('Tizimga kirish')}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-primary-300">Faqat administratorlar uchun</p>
      </div>
    </div>
  )
}
