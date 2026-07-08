import { Buffer } from 'buffer'
// Expose Buffer globally — Mastra's legacy stream path references bare `Buffer`
if (typeof globalThis.Buffer === 'undefined') {
  ;(globalThis as any).Buffer = Buffer
}
// Polyfill setImmediate — used by Mastra's tool execution framework
if (typeof globalThis.setImmediate === 'undefined') {
  ;(globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args)
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { LanguageProvider } from './i18n'
import './app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
