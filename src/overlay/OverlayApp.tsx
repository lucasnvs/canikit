import { useState, useEffect, useRef, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, LogicalSize, LogicalPosition, primaryMonitor } from '@tauri-apps/api/window'
import { marked } from 'marked'
import { TOOLS } from '../tools/registry'
import { useTodoList } from '../mini/useTodoList'

const BAR_W = 240
const BAR_H = 64
const PANEL_H = 300
const PIT_W = 260
const PIT_H = 220

interface PostIt {
  id: string
  title: string
  content: string
  pos: { x: number; y: number }
}

export default function OverlayApp() {
  const { todos, add, toggle, remove } = useTodoList()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 100, y: 20 })
  // anyHovered: passthrough off (any element under cursor)
  const [anyHovered, setAnyHovered] = useState(false)
  // barActive: cursor specifically on the bar
  const [barActive, setBarActive] = useState(false)
  // activePitId: which post-it cursor is on
  const [activePitId, setActivePitId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState('')
  const [postIts, setPostIts] = useState<PostIt[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const barDragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const pitDragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  const posRef = useRef(pos)
  const scaleRef = useRef(1)
  const passthroughRef = useRef(true)
  const postItsRef = useRef(postIts)
  const openRef = useRef(open)
  posRef.current = pos
  postItsRef.current = postIts
  openRef.current = open

  useEffect(() => {
    async function init() {
      const win = getCurrentWindow()
      await win.setIgnoreCursorEvents(true)
      const monitor = await primaryMonitor()
      if (monitor) {
        scaleRef.current = monitor.scaleFactor
        const scale = monitor.scaleFactor
        // Use work area (screen minus taskbar) so the overlay doesn't sit above the taskbar
        const [wx, wy, ww, wh] = await invoke<[number, number, number, number]>('get_work_area')
        await win.setSize(new LogicalSize(ww / scale, wh / scale))
        await win.setPosition(new LogicalPosition(wx / scale, wy / scale))
      }
    }
    init()
  }, [])

  // Polling: determines which element (if any) the cursor is on
  // Controls both passthrough (OS-level) and per-element active state (opacity)
  useEffect(() => {
    const win = getCurrentWindow()
    const interval = setInterval(async () => {
      const [px, py] = await invoke<[number, number]>('get_cursor_pos')
      if (px === 0 && py === 0) return
      const scale = scaleRef.current || 1
      const cx = px / scale
      const cy = py / scale
      const { x, y } = posRef.current
      const panelH = openRef.current ? BAR_H + PANEL_H + 6 : BAR_H

      const onBar = cx >= x && cx <= x + BAR_W && cy >= y && cy <= y + panelH
      const onPit = postItsRef.current.find(p =>
        cx >= p.pos.x && cx <= p.pos.x + PIT_W &&
        cy >= p.pos.y && cy <= p.pos.y + PIT_H
      ) ?? null
      const onAny = onBar || onPit !== null

      // Passthrough toggle
      if (onAny && passthroughRef.current) {
        passthroughRef.current = false
        win.setIgnoreCursorEvents(false)
      } else if (!onAny && !passthroughRef.current) {
        passthroughRef.current = true
        win.setIgnoreCursorEvents(true)
      }

      setAnyHovered(onAny)
      setBarActive(onBar)
      setActivePitId(onPit?.id ?? null)
    }, 16)
    return () => clearInterval(interval)
  }, [])

  // Listen for pin-note / remove-postit events from WriteIt
  useEffect(() => {
    const unlisteners: (() => void)[] = []
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ id: string; title: string; content: string }>('pin-note', (e) => {
        setPostIts(prev => {
          const exists = prev.find(p => p.id === e.payload.id)
          if (exists) {
            // Update content if already pinned
            return prev.map(p => p.id === e.payload.id ? { ...p, title: e.payload.title, content: e.payload.content } : p)
          }
          return [...prev, { ...e.payload, pos: { x: 300, y: 150 } }]
        })
      }).then(fn => unlisteners.push(fn))

      listen<{ id: string }>('remove-postit', (e) => {
        setPostIts(prev => prev.filter(p => p.id !== e.payload.id))
      }).then(fn => unlisteners.push(fn))
    })
    return () => { unlisteners.forEach(fn => fn()) }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const overlayTools = TOOLS.filter(t => t.overlay)
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement === inputRef.current) return
      const idx = parseInt(e.key, 10)
      if (!isNaN(idx) && idx >= 1 && idx <= overlayTools.length) {
        invoke('open_tool_in_main', { route: overlayTools[idx - 1].route })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function onBarDragStart(e: React.MouseEvent) {
    e.preventDefault()
    barDragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    function onMove(ev: MouseEvent) {
      if (!barDragging.current) return
      setPos({
        x: barDragging.current.origX + ev.clientX - barDragging.current.startX,
        y: barDragging.current.origY + ev.clientY - barDragging.current.startY,
      })
    }
    function onUp() {
      barDragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function onPitDragStart(e: React.MouseEvent, id: string) {
    e.preventDefault()
    const pit = postIts.find(p => p.id === id)
    if (!pit) return
    pitDragging.current = { id, startX: e.clientX, startY: e.clientY, origX: pit.pos.x, origY: pit.pos.y }
    function onMove(ev: MouseEvent) {
      if (!pitDragging.current) return
      const { id, startX, startY, origX, origY } = pitDragging.current
      setPostIts(prev => prev.map(p =>
        p.id === id ? { ...p, pos: { x: origX + ev.clientX - startX, y: origY + ev.clientY - startY } } : p
      ))
    }
    function onUp() {
      pitDragging.current = null
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
      {/* Main bar */}
      <div
        className={`overlay-bar-wrap${anyHovered ? '' : ' overlay-passthrough'}`}
        style={{ left: pos.x, top: pos.y, width: BAR_W, opacity: barActive ? 1 : anyHovered ? 0.55 : 0.3 }}
      >
        <div className="overlay-strip overlay-glass">
          <div className="overlay-drag" onMouseDown={onBarDragStart}>
            <img src="/icon.png" className="overlay-app-icon" alt="CaniKit" draggable={false} />
          </div>

          {TOOLS.filter(t => t.overlay).map((tool, i) => (
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

      {/* Post-its */}
      {postIts.map(pit => (
        <PostItPanel
          key={pit.id}
          pit={pit}
          isActive={activePitId === pit.id}
          anyHovered={anyHovered}
          onDragStart={onPitDragStart}
          onClose={id => setPostIts(prev => prev.filter(p => p.id !== id))}
        />
      ))}
    </div>
  )
}

function PostItPanel({ pit, isActive, anyHovered, onDragStart, onClose }: {
  pit: PostIt
  isActive: boolean
  anyHovered: boolean
  onDragStart: (e: React.MouseEvent, id: string) => void
  onClose: (id: string) => void
}) {
  const html = useMemo(() => {
    if (!pit.content) return '<em style="opacity:0.4">Nota vazia</em>'
    return marked.parse(pit.content, { async: false }) as string
  }, [pit.content])

  return (
    <div
      className={`overlay-postit overlay-glass${anyHovered ? '' : ' overlay-passthrough'}`}
      style={{
        left: pit.pos.x,
        top: pit.pos.y,
        opacity: isActive ? 1 : anyHovered ? 0.55 : 0.3,
      }}
    >
      <div className="overlay-postit-header" onMouseDown={e => onDragStart(e, pit.id)}>
        <span className="overlay-postit-title">{pit.title || 'Nota'}</span>
        <button
          className="overlay-postit-close"
          onClick={() => onClose(pit.id)}
          onMouseDown={e => e.stopPropagation()}
        >
          ×
        </button>
      </div>
      <div
        className="overlay-postit-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
