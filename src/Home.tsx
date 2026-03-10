import { useNavigate } from 'react-router-dom'
import { TOOLS } from './tools/registry'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <h1 className="home-title">NevesTools</h1>
      <p className="home-subtitle">Suas ferramentas pessoais</p>
      <div className="tools-grid">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className="tool-card"
            onClick={() => navigate(tool.route)}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
            {tool.description && (
              <span className="tool-desc">{tool.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
