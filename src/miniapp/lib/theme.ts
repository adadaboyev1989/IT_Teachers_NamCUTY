import { useEffect } from 'react'
import { applyTheme, getInitialTheme } from '../../lib/theme'
import { getTelegramWebApp } from './telegram'

// Mini Apps conventionally follow the host Telegram client's theme rather
// than offering their own toggle. index.html's inline script already
// applied the right class before first paint; this just keeps it in sync
// if the user switches their Telegram theme while the app is open, and
// covers the plain-browser case (no Telegram context) with the same
// stored/system-preference fallback the admin panel uses.
export function useTelegramTheme() {
  useEffect(() => {
    const tg = getTelegramWebApp()
    if (!tg) {
      applyTheme(getInitialTheme())
      return
    }

    applyTheme(tg.colorScheme === 'dark' ? 'dark' : 'light')

    const onThemeChanged = () => {
      applyTheme(tg.colorScheme === 'dark' ? 'dark' : 'light')
    }
    tg.onEvent?.('themeChanged', onThemeChanged)
    return () => tg.offEvent?.('themeChanged', onThemeChanged)
  }, [])
}
