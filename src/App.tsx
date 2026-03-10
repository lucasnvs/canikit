import { Suspense } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { TOOLS } from './tools/registry'
import Home from './Home'

export default function App() {
  const navigate = useNavigate()

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
                  <button className="back-btn" onClick={() => navigate('/')}>
                    ← Voltar
                  </button>
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
