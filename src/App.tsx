import { useEffect, useState } from 'react'
import { AdminApp } from './admin/AdminApp'
import { MiniApp } from './miniapp/MiniApp'

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.pathname === '/admin' || window.location.hash === '#admin'
  )

  useEffect(() => {
    const onChange = () => {
      setIsAdminRoute(window.location.pathname === '/admin' || window.location.hash === '#admin')
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return isAdminRoute ? <AdminApp /> : <MiniApp />
}
