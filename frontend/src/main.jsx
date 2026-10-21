import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('PWA update available. Refresh to apply the newest build.')
  },
  onOfflineReady() {
    console.info('Wardrobe AI is ready to work offline.')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
