import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getInitialTheme, setStoredTheme, type Theme } from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setStoredTheme(next)
    setTheme(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all hover:bg-neutral-100"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
