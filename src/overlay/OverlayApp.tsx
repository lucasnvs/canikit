import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, LogicalSize, LogicalPosition, primaryMonitor } from '@tauri-apps/api/window'
import { TOOLS } from '../tools/registry'
import { useTodoList } from '../mini/useTodoList'

const BAR_W = 420
const BAR_H = 64
const PANEL_H = 300

export default function OverlayApp() {
  const { todos, add, toggle, remove } = useTodoList()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 100, y: 20 })
  const [hovered, setHovered] = useState(false)
  const [newTask, setNewTask] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Refs to avoid stale closures in polling interval
  const posRef = useRef(pos)
  const scaleRef = useRef(1)
  // Whether the window is currently in passthrough mode
  const passthroughRef = useRef(true)
  posRef.current = pos

  // On mount: cover full monitor, enable passthrough immediately
  useEffect(() => {
    async function init() {
      const win = getCurrentWindow()
      await win.setIgnoreCursorEvents(true)
      const monitor = await primaryMonitor()
      if (monitor) {
        scaleRef.current = monitor.scaleFactor
        const w = monitor.size.width / monitor.scaleFactor
        const h = monitor.size.height / monitor.scaleFactor
        await win.setSize(new LogicalSize(w, h))
        await win.setPosition(new LogicalPosition(0, 0))
      }
    }
    init()
  }, [])

  // Poll cursor position only while passthrough is ON to detect cursor entry.
  // Exit (leave) is handled by onMouseLeave on the bar element, which is more
  // reliable and avoids the WebView2 focus bug that returns wrong cursor coords
  // when an input inside the panel has autoFocus.
  useEffect(() => {
    const win = getCurrentWindow()

    const interval = setInterval(async () => {
      if (!passthroughRef.current) return
      const [px, py] = await invoke<[number, number]>('get_cursor_pos')
      if (px === 0 && py === 0) return
      const scale = scaleRef.current || 1
      const cx = px / scale
      const cy = py / scale
      const { x, y } = posRef.current
      const inBar = cx >= x && cx <= x + BAR_W && cy >= y && cy <= y + BAR_H
      if (inBar) {
        passthroughRef.current = false
        setHovered(true)
        win.setIgnoreCursorEvents(false)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [])

  function handleMouseEnter() {
    const win = getCurrentWindow()
    passthroughRef.current = false
    setHovered(true)
    win.setIgnoreCursorEvents(false)
  }

  function handleMouseLeave() {
    const win = getCurrentWindow()
    passthroughRef.current = true
    setHovered(false)
    win.setIgnoreCursorEvents(true)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement === inputRef.current) return
      const idx = parseInt(e.key, 10)
      if (!isNaN(idx) && idx >= 1 && idx <= TOOLS.length) {
        invoke('open_tool_in_main', { route: TOOLS[idx - 1].route })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Manual drag — moves bar within fullscreen canvas
  function onDragStart(e: React.MouseEvent) {
    e.preventDefault()
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    function onMove(ev: MouseEvent) {
      if (!dragging.current) return
      setPos({
        x: dragging.current.origX + ev.clientX - dragging.current.startX,
        y: dragging.current.origY + ev.clientY - dragging.current.startY,
      })
    }
    function onUp() {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const doneTodos = todos.filter(t => t.done)
  const pendingTodos = todos.filter(t => !t.done)

  return (
    <div className="overlay-canvas">
      <div
        className={`overlay-bar-wrap${hovered ? '' : ' overlay-passthrough'}`}
        style={{ left: pos.x, top: pos.y, width: BAR_W }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Horizontal icon bar */}
        <div className="overlay-strip overlay-glass">
          <div className="overlay-drag" onMouseDown={onDragStart}>
            <span className="overlay-drag-icon">⠿</span>
          </div>

          {TOOLS.map((tool, i) => (
            <button
              key={tool.id}
              className="overlay-tool-btn"
              onClick={() => invoke('open_tool_in_main', { route: tool.route })}
              title={`${tool.label} (${i + 1})`}
            >
              {tool.icon}
            </button>
          ))}

          <div className="overlay-spacer" />

          <button
            className={`overlay-win-btn${open ? ' active' : ''}`}
            onClick={() => setOpen(o => !o)}
            title="Tarefas"
          >
            📋
          </button>
        </div>

        {/* Todo panel */}
        {open && (
          <div className="overlay-panel overlay-glass" style={{ height: PANEL_H }}>
            <div className="overlay-todo-header">
              Tarefas
              {doneTodos.length > 0 && (
                <span style={{ marginLeft: 6, opacity: 0.5 }}>
                  {doneTodos.length}/{todos.length}
                </span>
              )}
            </div>

            <div className="overlay-todo-list">
              {pendingTodos.map(todo => (
                <div key={todo.id} className="overlay-todo-row">
                  <input type="checkbox" checked={false} onChange={() => toggle(todo.id)} />
                  <span className="overlay-todo-text">{todo.text}</span>
                  <button className="overlay-todo-del" onClick={() => remove(todo.id)}>×</button>
                </div>
              ))}
              {doneTodos.map(todo => (
                <div key={todo.id} className="overlay-todo-row">
                  <input type="checkbox" checked={true} onChange={() => toggle(todo.id)} />
                  <span className="overlay-todo-text overlay-todo-text--done">{todo.text}</span>
                  <button className="overlay-todo-del" onClick={() => remove(todo.id)}>×</button>
                </div>
              ))}
              {todos.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>
                  Nenhuma tarefa — adicione abaixo
                </div>
              )}
            </div>

            <div className="overlay-todo-add">
              <input
                ref={inputRef}
                className="overlay-todo-input"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { add(newTask); setNewTask('') }
                }}
                placeholder="+ Adicionar tarefa..."
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
