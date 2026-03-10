import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { TOOLS } from './tools/registry'
import Logo from './components/Logo'

export default function Home() {
  const navigate = useNavigate()

  const groups = TOOLS.reduce<Record<string, typeof TOOLS>>((acc, tool) => {
    ;(acc[tool.category] ??= []).push(tool)
    return acc
  }, {})

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-brand">
          <Logo size={40} />
          <div className="home-brand-text">
            <h1 className="home-title">CaniKit</h1>
            <p className="home-subtitle">by Lucas Neves</p>
          </div>
        </div>
        <div className="home-header-right">
          <button className="mini-open-btn" onClick={() => invoke('toggle_overlay')}>
            ⊞ Overlay
          </button>
          <span className="home-count">{TOOLS.length} ferramentas</span>
        </div>
      </header>

      {Object.entries(groups).map(([category, tools]) => (
        <section key={category} className="tools-section">
          <h2 className="tools-section-title">{category}</h2>
          <div className="tools-grid">
            {tools.map((tool) => (
              <button
                key={tool.id}
                className="tool-card"
                onClick={() => navigate(tool.route)}
              >
                <div className="tool-icon-wrap">{tool.icon}</div>
                <div className="tool-card-body">
                  <span className="tool-label">{tool.label}</span>
                  {tool.description && (
                    <span className="tool-desc">{tool.description}</span>
                  )}
                </div>
                <span className="tool-arrow">→</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
