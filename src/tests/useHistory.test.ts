import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from '../tools/pdf-text-editor/hooks/useHistory'

describe('useHistory', () => {
  it('starts with the initial state', () => {
    const { result } = renderHook(() => useHistory(0))
    expect(result.current.state).toBe(0)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('set() updates the state and enables undo', () => {
    const { result } = renderHook(() => useHistory(0))
    act(() => result.current.set(1))
    expect(result.current.state).toBe(1)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo() reverts to the previous state', () => {
    const { result } = renderHook(() => useHistory(0))
    act(() => result.current.set(1))
    act(() => result.current.set(2))
    act(() => result.current.undo())
    expect(result.current.state).toBe(1)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)
  })

  it('undo() all the way to the initial state', () => {
    const { result } = renderHook(() => useHistory('a'))
    act(() => result.current.set('b'))
    act(() => result.current.set('c'))
    act(() => result.current.undo())
    act(() => result.current.undo())
    expect(result.current.state).toBe('a')
    expect(result.current.canUndo).toBe(false)
  })

  it('redo() reapplies an undone state', () => {
    const { result } = renderHook(() => useHistory(0))
    act(() => result.current.set(1))
    act(() => result.current.undo())
    act(() => result.current.redo())
    expect(result.current.state).toBe(1)
    expect(result.current.canRedo).toBe(false)
  })

  it('set() after undo clears the redo stack', () => {
    const { result } = renderHook(() => useHistory(0))
    act(() => result.current.set(1))
    act(() => result.current.set(2))
    act(() => result.current.undo())  // back to 1
    act(() => result.current.set(99)) // new branch
    expect(result.current.state).toBe(99)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo() does nothing when already at the beginning', () => {
    const { result } = renderHook(() => useHistory(42))
    act(() => result.current.undo())
    expect(result.current.state).toBe(42)
  })

  it('redo() does nothing when there is nothing to redo', () => {
    const { result } = renderHook(() => useHistory(42))
    act(() => result.current.set(100))
    act(() => result.current.redo()) // nothing to redo
    expect(result.current.state).toBe(100)
  })

  it('reset() clears history and sets new initial state', () => {
    const { result } = renderHook(() => useHistory(0))
    act(() => result.current.set(1))
    act(() => result.current.set(2))
    act(() => result.current.reset(99))
    expect(result.current.state).toBe(99)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('works with objects (annotations + strokes pattern)', () => {
    const initial = { annotations: [] as string[], strokes: [] as number[] }
    const { result } = renderHook(() => useHistory(initial))

    act(() => result.current.set({ annotations: ['a'], strokes: [] }))
    act(() => result.current.set({ annotations: ['a', 'b'], strokes: [] }))
    act(() => result.current.set({ annotations: ['a', 'b'], strokes: [1] }))

    expect(result.current.state.strokes).toEqual([1])
    act(() => result.current.undo())
    expect(result.current.state).toEqual({ annotations: ['a', 'b'], strokes: [] })
    act(() => result.current.undo())
    expect(result.current.state).toEqual({ annotations: ['a'], strokes: [] })
    act(() => result.current.redo())
    expect(result.current.state.annotations).toEqual(['a', 'b'])
  })
})
