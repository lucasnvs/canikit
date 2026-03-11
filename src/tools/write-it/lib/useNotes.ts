import { useState, useEffect, useRef } from 'react'
import { readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs'
import { appLocalDataDir, join } from '@tauri-apps/api/path'

export interface Note {
  id: string
  title: string
  content: string
  category: string
  createdAt: number
  updatedAt: number
}

export const DEFAULT_CATEGORIES = ['Português', 'Matemática', 'Programação', 'Geral']

interface Paths {
  notes: string
  categories: string
}

async function initPaths(): Promise<Paths> {
  const base = await appLocalDataDir()
  const dir = await join(base, 'writeit')
  await mkdir(dir, { recursive: true })
  return {
    notes: await join(dir, 'notes.json'),
    categories: await join(dir, 'categories.json'),
  }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readTextFile(path)) as T
  } catch {
    return fallback
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const pathsRef = useRef<Paths | null>(null)

  useEffect(() => {
    initPaths().then(async paths => {
      pathsRef.current = paths
      setNotes(await readJson<Note[]>(paths.notes, []))
      setCategories(await readJson<string[]>(paths.categories, DEFAULT_CATEGORIES))
    })
  }, [])

  function saveNotes(next: Note[]) {
    setNotes(next)
    const p = pathsRef.current
    if (p) writeTextFile(p.notes, JSON.stringify(next)).catch(() => {})
  }

  function saveCategories(next: string[]) {
    setCategories(next)
    const p = pathsRef.current
    if (p) writeTextFile(p.categories, JSON.stringify(next)).catch(() => {})
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
    const fallback = categories.find(c => c !== name) ?? 'Geral'
    saveNotes(notes.map(n => n.category === name ? { ...n, category: fallback } : n))
    saveCategories(categories.filter(c => c !== name))
  }

  return { notes, categories, createNote, updateNote, deleteNote, addCategory, removeCategory }
}
