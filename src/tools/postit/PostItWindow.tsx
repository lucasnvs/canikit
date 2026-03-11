import { useEffect, useState, useMemo } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { marked } from 'marked'

export default function PostItWindow() {
  const [title, setTitle] = useState('Nota')
  const [content, setContent] = useState('')

  useEffect(() => {
    const win = getCurrentWindow()
    const label = win.label
    const raw = localStorage.getItem(`postit_${label}`)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        setTitle(data.title || 'Nota')
        setContent(data.content || '')
      } catch { /* ignore */ }
    }
    return () => {
      localStorage.removeItem(`postit_${label}`)
    }
  }, [])

  const html = useMemo(() => {
    if (!content) return '<em style="opacity:0.4">Nota vazia</em>'
    return marked.parse(content, { async: false }) as string
  }, [content])

  function handleClose() {
    getCurrentWindow().close()
  }

  function handleDragStart(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.postit-close')) return
    getCurrentWindow().startDragging()
  }

  return (
    <div className="postit-root">
      <div className="postit-card">
        <div className="postit-titlebar" onMouseDown={handleDragStart}>
          <span className="postit-title">{title || 'Nota'}</span>
          <button className="postit-close" onClick={handleClose} onMouseDown={e => e.stopPropagation()}>
            ×
          </button>
        </div>
        <div
          className="postit-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
