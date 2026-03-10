import { Suspense, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { TOOLS } from './tools/registry'
import Home from './Home'

export default function App() {
  const navigate = useNavigate()

  // Listen for navigate-to events emitted by the mini window via Rust
  useEffect(() => {
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string>('navigate-to', (e) => navigate(e.payload))
        .then(fn => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [])

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        {TOOLS.map((tool) => (
          <Route
            key={tool.id}
            path={tool.route}
            element={
              <Suspense fallback={<div className="loading">Carregando...</div>}>
                <div className="tool-shell">
                  <div className="tool-titlebar">
                    <button className="back-btn" onClick={() => navigate('/')}>
                      ← CaniKit
                    </button>
                    <span className="tool-titlebar-sep">/</span>
                    <span className="tool-titlebar-name">{tool.label}</span>
                  </div>
                  <tool.component />
                </div>
              </Suspense>
            }
          />
        ))}
      </Routes>
    </div>
  )
}
