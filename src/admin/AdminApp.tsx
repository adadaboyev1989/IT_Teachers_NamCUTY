import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AdminLogin } from './AdminLogin'
import { AdminLayout } from './AdminLayout'

export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  if (!session) {
    return <AdminLogin onSuccess={() => supabase.auth.getSession().then(({ data }) => setSession(data.session))} />
  }

  return <AdminLayout onLogout={() => setSession(null)} />
}
