import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { Teacher, Resource, Event, TabId } from './types'
import type { Session } from '@supabase/supabase-js'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TeachersView } from './components/TeachersView'
import { ResourcesView } from './components/ResourcesView'
import { EventsView } from './components/EventsView'
import { Footer } from './components/Footer'
import { AdminLogin } from './admin/AdminLogin'
import { AdminLayout } from './admin/AdminLayout'

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.hash === '#admin' || window.location.pathname === '/admin'
  )

  const [session, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const checkRoute = () => {
      setIsAdminRoute(window.location.hash === '#admin' || window.location.pathname === '/admin')
    }
    window.addEventListener('hashchange', checkRoute)
    return () => window.removeEventListener('hashchange', checkRoute)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthChecked(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (isAdminRoute) {
    if (!authChecked) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      )
    }

    if (!session) {
      return <AdminLogin onSuccess={() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session))
      }} />
    }

    return <AdminLayout onLogout={() => setSession(null)} />
  }

  return <PublicSite />
}

function PublicSite() {
  const [activeTab, setActiveTab] = useState<TabId>('teachers')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // These fetch the full public board with no pagination UI yet, so cap each
  // query at a generous limit — otherwise the home page's load time grows
  // unbounded as the community board fills up.
  const LIST_LIMIT = 500

  const fetchTeachers = useCallback(async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT)
    if (!error && data) setTeachers(data)
  }, [])

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT)
    if (!error && data) setResources(data)
  }, [])

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .limit(LIST_LIMIT)
    if (!error && data) setEvents(data)
  }, [])

  useEffect(() => {
    (async () => {
      await Promise.all([fetchTeachers(), fetchResources(), fetchEvents()])
      setLoading(false)
    })()
  }, [fetchTeachers, fetchResources, fetchEvents])

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <Hero
        teacherCount={teachers.length}
        resourceCount={resources.length}
        eventCount={events.length}
        onExplore={() => setActiveTab('teachers')}
      />

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'teachers' && (
              <TeachersView teachers={teachers} onRefresh={fetchTeachers} />
            )}
            {activeTab === 'resources' && (
              <ResourcesView resources={resources} onRefresh={fetchResources} />
            )}
            {activeTab === 'events' && (
              <EventsView events={events} onRefresh={fetchEvents} />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
