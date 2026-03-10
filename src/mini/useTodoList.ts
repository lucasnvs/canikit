import { useState } from 'react'

export interface Todo {
  id: string
  text: string
  done: boolean
}

const STORAGE_KEY = 'canikit-todos'

function loadTodos(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function useTodoList() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)

  function save(next: Todo[]) {
    setTodos(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return {
    todos,
    add(text: string) {
      const trimmed = text.trim()
      if (!trimmed) return
      save([...todos, { id: crypto.randomUUID(), text: trimmed, done: false }])
    },
    toggle(id: string) {
      save(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
    },
    remove(id: string) {
      save(todos.filter(t => t.id !== id))
    },
  }
}
