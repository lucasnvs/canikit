import { useState } from 'react'

export interface Note {
  id: string
  title: string
  content: string
  category: string
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'nevestools-notes'
const CATEGORIES_KEY = 'nevestools-note-categories'

export const DEFAULT_CATEGORIES = ['Português', 'Matemática', 'Programação', 'Geral']

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function loadCategories(): string[] {
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [categories, setCategories] = useState<string[]>(loadCategories)

  function saveNotes(next: Note[]) {
    setNotes(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function saveCategories(next: string[]) {
    setCategories(next)
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next))
  }

  function createNote(category: string): Note {
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Nova nota',
      content: '',
      category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveNotes([note, ...notes])
    return note
  }

  function updateNote(id: string, patch: Partial<Note>) {
    saveNotes(notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n))
  }

  function deleteNote(id: string) {
    saveNotes(notes.filter(n => n.id !== id))
  }

  function addCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed || categories.includes(trimmed)) return
    saveCategories([...categories, trimmed])
  }

  function removeCategory(name: string) {
    // Move orphaned notes to 'Geral'
    const fallback = categories.find(c => c !== name) ?? 'Geral'
    const updatedNotes = notes.map(n => n.category === name ? { ...n, category: fallback } : n)
    saveNotes(updatedNotes)
    saveCategories(categories.filter(c => c !== name))
  }

  return { notes, categories, createNote, updateNote, deleteNote, addCategory, removeCategory }
}
