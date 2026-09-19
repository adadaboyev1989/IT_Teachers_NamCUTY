type TelegramWebApp = {
  ready: () => void
  expand: () => void
  initData: string
  initDataUnsafe?: { user?: { id: number; first_name?: string } }
  colorScheme?: 'light' | 'dark'
  onEvent?: (event: string, callback: () => void) => void
  offEvent?: (event: string, callback: () => void) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}

export function getInitData(): string {
  return getTelegramWebApp()?.initData || ''
}
