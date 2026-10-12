import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import { useStore } from './store'
import { registerSW } from './lib/device'
import './styles.css'

useStore.getState().rebase()
registerSW()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      theme="system"
      offset={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      toastOptions={{ className: 'toast-ui', duration: 2600 }}
    />
  </StrictMode>,
)
