import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getEffectiveDark } from '@/utils/storage'
import { ThemeProvider } from '@/hooks/useTheme'
import App from './App'
import './index.css'

if (import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

if (getEffectiveDark()) document.documentElement.classList.add('dark')
else document.documentElement.classList.remove('dark')

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
