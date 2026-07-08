import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useLanguage } from '../i18n'

const KEY = 'mastra-browser-agent:theme'

function getInitial(): boolean {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light') return true
    if (stored === 'dark') return false
  } catch {}
  return !window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeToggle() {
  const [light, setLight] = useState(getInitial)
  const { t } = useLanguage()

  useEffect(() => {
    const root = document.documentElement
    if (light) {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
    try { localStorage.setItem(KEY, light ? 'light' : 'dark') } catch {}
  }, [light])

  // Sync with system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setLight(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <button
      className="size-8 flex items-center justify-center rounded-md border border-(--border1) bg-(--surface3) text-(--neutral3) hover:bg-(--surface4) hover:text-(--neutral5) transition-colors cursor-pointer shrink-0"
      onClick={() => setLight(l => !l)}
      aria-label={light ? t('theme.switchDark') : t('theme.switchLight')}
    >
      {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  )
}
