import { useRef, useEffect, useCallback } from 'react'
import type { DrawStroke, StrokePoint } from '../types'

interface Props {
  pageNumber: number
  width: number
  height: number
  zoom: number
  strokes: DrawStroke[]         // committed strokes for this page
  drawMode: boolean
  drawColor: string
  drawLineWidth: number          // PDF points (scaled by zoom for canvas)
  onStrokeComplete: (stroke: DrawStroke) => void
}

export default function DrawCanvas({
  pageNumber,
  width,
  height,
  zoom,
  strokes,
  drawMode,
  drawColor,
  drawLineWidth,
  onStrokeComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const currentPoints = useRef<StrokePoint[]>([])

  // Redraw committed strokes whenever they change or size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.lineWidth * zoom
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(stroke.points[0].xRatio * width, stroke.points[0].yRatio * height)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].xRatio * width, stroke.points[i].yRatio * height)
      }
      ctx.stroke()
    }
  }, [strokes, width, height, zoom])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): StrokePoint {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      xRatio: (e.clientX - rect.left) / width,
      yRatio: (e.clientY - rect.top) / height,
    }
  }

  function drawLiveSegment(from: StrokePoint, to: StrokePoint) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.strokeStyle = drawColor
    ctx.lineWidth = drawLineWidth * zoom
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(from.xRatio * width, from.yRatio * height)
    ctx.lineTo(to.xRatio * width, to.yRatio * height)
    ctx.stroke()
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawMode) return
    e.preventDefault()
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    drawing.current = true
    const pt = getPoint(e)
    currentPoints.current = [pt]
  }, [drawMode])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const pt = getPoint(e)
    const pts = currentPoints.current
    if (pts.length > 0) {
      drawLiveSegment(pts[pts.length - 1], pt)
    }
    pts.push(pt)
  }, [drawColor, drawLineWidth, zoom, width, height])

  const handlePointerUp = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    const pts = currentPoints.current
    currentPoints.current = []
    if (pts.length < 2) return
    onStrokeComplete({
      id: crypto.randomUUID(),
      pageNumber,
      points: pts,
      color: drawColor,
      lineWidth: drawLineWidth,
    })
  }, [pageNumber, drawColor, drawLineWidth, onStrokeComplete])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: drawMode ? 'crosshair' : 'default',
        pointerEvents: drawMode ? 'auto' : 'none',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { drawing.current = false; currentPoints.current = [] }}
    />
  )
}
