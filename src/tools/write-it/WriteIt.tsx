import { useState } from 'react'
import { emit } from '@tauri-apps/api/event'
import { useNotes } from './lib/useNotes'
import NotesSidebar from './NotesSidebar'
import NoteEditor from './NoteEditor'
import type { Note } from './lib/useNotes'

export default function WriteIt() {
  const { notes, categories, createNote, updateNote, deleteNote, addCategory, removeCategory } = useNotes()
  const [selectedId, setSelectedId] = useState<string | null>(
    notes.length > 0 ? notes[0].id : null
  )

  const selectedNote = notes.find(n => n.id === selectedId) ?? null

  function handleNew(category: string) {
    const note = createNote(category)
    setSelectedId(note.id)
  }

  async function handleDelete(id: string) {
    deleteNote(id)
    await emit('remove-postit', { id })
    if (selectedId === id) {
      const remaining = notes.filter(n => n.id !== id)
      setSelectedId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  function handleAddCategory() {
    const name = window.prompt('Nome da nova categoria:')
    if (name) addCategory(name)
  }

  async function handlePin(note: Note) {
    await emit('pin-note', {
      id: note.id,
      title: note.title,
      content: note.content,
    })
  }

  return (
    <div className="wi-root">
      <div className="wi-body">
        <NotesSidebar
          notes={notes}
          categories={categories}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={handleNew}
          onDelete={handleDelete}
          onAddCategory={handleAddCategory}
          onRemoveCategory={removeCategory}
        />
        <NoteEditor
          note={selectedNote}
          onUpdate={patch => selectedId && updateNote(selectedId, patch)}
          onPin={handlePin}
        />
      </div>
    </div>
  )
}
