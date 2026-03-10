import { useState, useEffect, useRef } from 'react'
import type { TextAnnotation } from '../types'

const SEL_COLOR = '#4C9EFF'
const HANDLE_SIZE = 8
const HANDLE_OFFSET = -(HANDLE_SIZE / 2)

/** Small square handle used for corners and edge midpoints */
function Handle({ style, onMouseDown }: {
  style: React.CSSProperties
  onMouseDown?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        background: '#fff',
        border: `1.5px solid ${SEL_COLOR}`,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        pointerEvents: onMouseDown ? 'auto' : 'none',
        cursor: onMouseDown ? 'col-resize' : 'default',
        zIndex: 7,
        ...style,
      }}
    />
  )
}

interface Props {
  annotation: TextAnnotation
  canvasWidth: number
  canvasHeight: number
  hidden?: boolean
  onMove: (id: string, xRatio: number, yRatio: number) => void
  onResize: (id: string, maxWidthRatio: number) => void
  onEditRequest: (id: string, xRatio: number, yRatio: number, text: string, maxWidthRatio: number) => void
}

export default function TextAnnotationOverlay({
  annotation,
  canvasWidth,
  canvasHeight,
  hidden,
  onMove,
  onResize,
  onEditRequest,
}: Props) {
  const [pos, setPos] = useState({
    x: annotation.xRatio * canvasWidth,
    y: annotation.yRatio * canvasHeight,
  })
  const [widthPx, setWidthPx] = useState(annotation.maxWidthRatio * canvasWidth)
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)   // true while any drag is in progress

  useEffect(() => {
    setPos({ x: annotation.xRatio * canvasWidth, y: annotation.yRatio * canvasHeight })
    setWidthPx(annotation.maxWidthRatio * canvasWidth)
  }, [annotation.xRatio, annotation.yRatio, annotation.maxWidthRatio, canvasWidth, canvasHeight])

  const currentPos = useRef({ x: 0, y: 0 })
  const currentWidth = useRef(0)

  const showChrome = hovered || active

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    onEditRequest(annotation.id, annotation.xRatio, annotation.yRatio, annotation.text, annotation.maxWidthRatio)
  }

  function handleDragMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setActive(true)
    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startX = pos.x
    const startY = pos.y
    currentPos.current = { x: startX, y: startY }

    function onMouseMove(ev: MouseEvent) {
      const newX = Math.max(0, Math.min(canvasWidth, startX + (ev.clientX - startMouseX)))
      const newY = Math.max(0, Math.min(canvasHeight, startY + (ev.clientY - startMouseY)))
      currentPos.current = { x: newX, y: newY }
      setPos({ x: newX, y: newY })
    }

    function onMouseUp() {
      setActive(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      onMove(annotation.id, currentPos.current.x / canvasWidth, currentPos.current.y / canvasHeight)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    setActive(true)
    const startX = e.clientX
    const startWidth = widthPx

    function onMouseMove(ev: MouseEvent) {
      const newWidth = Math.max(40, startWidth + (ev.clientX - startX))
      const clamped = Math.min(newWidth, canvasWidth - pos.x)
      currentWidth.current = clamped
      setWidthPx(clamped)
    }

    function onMouseUp() {
      setActive(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      onResize(annotation.id, currentWidth.current / canvasWidth)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  if (hidden) return null

  const h = HANDLE_OFFSET   // shorthand for centering on edge

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => !active && setHovered(false)}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: widthPx,
        zIndex: 5,
        outline: showChrome ? `1.5px solid ${SEL_COLOR}` : '1.5px solid transparent',
        borderRadius: 2,
        transition: 'outline-color 0.1s',
      }}
    >
      {/* Text body — draggable */}
      <span
        onMouseDown={handleDragMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'block',
          fontSize: annotation.fontSize,
          fontFamily: annotation.fontFamily,
          color: annotation.color,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.2,
          userSelect: 'none',
          cursor: active ? 'grabbing' : 'grab',
          padding: '0 2px',
        }}
        title="Arraste para mover · Duplo clique para editar · Arraste a borda direita para redimensionar"
      >
        {annotation.text}
      </span>

      {/* Figma-style handles — visible on hover/active */}
      {showChrome && (
        <>
          {/* Corners (decorative) */}
          <Handle style={{ top: h, left: h }} />
          <Handle style={{ top: h, right: h }} />
          <Handle style={{ bottom: h, left: h }} />
          <Handle style={{ bottom: h, right: h }} />

          {/* Right-center — functional resize handle */}
          <Handle
            style={{ top: '50%', right: h, transform: 'translateY(-50%)', cursor: 'col-resize' }}
            onMouseDown={handleResizeMouseDown}
          />
        </>
      )}
    </div>
  )
}
