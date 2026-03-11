import { Trash2, Plus, FolderMinus } from 'lucide-react'
import type { Note } from './lib/useNotes'

interface Props {
  notes: Note[]
  categories: string[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: (category: string) => void
  onDelete: (id: string) => void
  onAddCategory: () => void
  onRemoveCategory: (cat: string) => void
}

export default function NotesSidebar({
  notes, categories, selectedId, onSelect, onNew, onDelete, onAddCategory, onRemoveCategory,
}: Props) {
  const grouped = categories.reduce<Record<string, Note[]>>((acc, cat) => {
    acc[cat] = notes.filter(n => n.category === cat)
    return acc
  }, {})

  // Notes in unknown categories (e.g. old data)
  const knownCats = new Set(categories)
  const orphans = notes.filter(n => !knownCats.has(n.category))

  return (
    <div className="wi-sidebar">
      <div className="wi-sidebar-top">
        <span className="wi-sidebar-title">Notas</span>
        <button className="wi-cat-add-btn" onClick={onAddCategory} title="Nova categoria">
          <Plus size={13} />
        </button>
      </div>

      <div className="wi-sidebar-list">
        {categories.map(cat => (
          <div key={cat}>
            <div className="wi-cat-header">
              <span>{cat}</span>
              <div className="wi-cat-actions">
                <button
                  className="wi-cat-new-btn"
                  onClick={() => onNew(cat)}
                  title={`Nova nota em ${cat}`}
                >
                  <Plus size={11} />
                </button>
                <button
                  className="wi-cat-del-btn"
                  onClick={() => onRemoveCategory(cat)}
                  title={`Remover categoria ${cat}`}
                >
                  <FolderMinus size={11} />
                </button>
              </div>
            </div>

            {grouped[cat].length === 0 && (
              <div className="wi-note-empty">sem notas</div>
            )}

            {grouped[cat].map(note => (
              <div
                key={note.id}
                className={`wi-note-row${selectedId === note.id ? ' wi-note-row--active' : ''}`}
                onClick={() => onSelect(note.id)}
              >
                <span className="wi-note-title">{note.title || 'Sem título'}</span>
                <button
                  className="wi-note-del"
                  onClick={e => { e.stopPropagation(); onDelete(note.id) }}
                  title="Deletar nota"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}

        {orphans.length > 0 && (
          <div>
            <div className="wi-cat-header"><span>Outros</span></div>
            {orphans.map(note => (
              <div
                key={note.id}
                className={`wi-note-row${selectedId === note.id ? ' wi-note-row--active' : ''}`}
                onClick={() => onSelect(note.id)}
              >
                <span className="wi-note-title">{note.title || 'Sem título'}</span>
                <button
                  className="wi-note-del"
                  onClick={e => { e.stopPropagation(); onDelete(note.id) }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
