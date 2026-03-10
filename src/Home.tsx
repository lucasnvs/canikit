import { useNavigate } from 'react-router-dom'
import { TOOLS } from './tools/registry'
import Logo from './components/Logo'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <div className="home-brand">
        <Logo size={64} />
        <h1 className="home-title">CaniKit</h1>
      </div>
      <p className="home-subtitle">by Lucas Neves</p>
      <div className="tools-grid">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className="tool-card"
            onClick={() => navigate(tool.route)}
          >
            <div className="tool-icon-wrap">{tool.icon}</div>
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
