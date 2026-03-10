import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import OverlayApp from './overlay/OverlayApp'
import './index.css'

const isOverlay = window.location.hash === '#/overlay'

if (isOverlay) {
  document.documentElement.classList.add('is-overlay')
  // Force transparent background via inline style — overrides any CSS cascade
  document.documentElement.style.setProperty('background', 'transparent', 'important')
  document.body.style.setProperty('background', 'transparent', 'important')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isOverlay
      ? <OverlayApp />
      : <HashRouter><App /></HashRouter>
    }
  </React.StrictMode>,
)
