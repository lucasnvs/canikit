import { useState, useMemo } from 'react'
import { marked } from 'marked'
import { Eye, Edit3, Pin } from 'lucide-react'
import type { Note } from './lib/useNotes'

interface Props {
  note: Note | null
  onUpdate: (patch: Partial<Note>) => void
  onPin: (note: Note) => void
}

export default function NoteEditor({ note, onUpdate, onPin }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  const renderedHtml = useMemo(() => {
    if (!note?.content) return ''
    return marked.parse(note.content, { async: false }) as string
  }, [note?.content])

  if (!note) {
    return (
      <div className="wi-editor wi-editor--empty">
        <span>Selecione uma nota ou crie uma nova</span>
      </div>
    )
  }

  return (
    <div className="wi-editor">
      <div className="wi-editor-toolbar">
        <input
          className="wi-title-input"
          value={note.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Título da nota..."
        />
        <button
          className={`wi-toolbar-btn${mode === 'edit' ? ' active' : ''}`}
          onClick={() => setMode('edit')}
          title="Editar"
        >
          <Edit3 size={15} />
        </button>
        <button
          className={`wi-toolbar-btn${mode === 'preview' ? ' active' : ''}`}
          onClick={() => setMode('preview')}
          title="Visualizar"
        >
          <Eye size={15} />
        </button>
        <div className="wi-toolbar-sep" />
        <button
          className="wi-toolbar-btn wi-pin-btn"
          onClick={() => onPin(note)}
          title="Fixar como Post-it"
        >
          <Pin size={15} />
        </button>
      </div>

      <div className="wi-editor-content">
        {mode === 'edit' ? (
          <textarea
            className="wi-textarea"
            value={note.content}
            onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Escreva em markdown..."
            spellCheck={false}
          />
        ) : (
          <div
            className="wi-preview"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </div>
  )
}
