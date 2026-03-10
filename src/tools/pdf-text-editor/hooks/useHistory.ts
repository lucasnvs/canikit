import { useState, useCallback } from 'react'

interface Snapshot<T> {
  past: T[]
  present: T
  future: T[]
}

interface HistoryResult<T> {
  state: T
  set: (next: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  reset: (initial: T) => void
}

export function useHistory<T>(initial: T): HistoryResult<T> {
  const [snap, setSnap] = useState<Snapshot<T>>({ past: [], present: initial, future: [] })

  const set = useCallback((next: T) => {
    setSnap((s) => ({ past: [...s.past, s.present], present: next, future: [] }))
  }, [])

  const undo = useCallback(() => {
    setSnap((s) => {
      if (s.past.length === 0) return s
      const previous = s.past[s.past.length - 1]
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setSnap((s) => {
      if (s.future.length === 0) return s
      const next = s.future[0]
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) }
    })
  }, [])

  const reset = useCallback((initial: T) => {
    setSnap({ past: [], present: initial, future: [] })
  }, [])

  return {
    state: snap.present,
    set,
    undo,
    redo,
    canUndo: snap.past.length > 0,
    canRedo: snap.future.length > 0,
    reset,
  }
}
