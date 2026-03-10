import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import type { PDFDocumentProxy } from '../lib/pdfRenderer'
import { renderPage } from '../lib/pdfRenderer'
import type { TextAnnotation, PendingClick, ToolbarSettings, DrawStroke } from '../types'
import TextAnnotationOverlay from './TextAnnotationOverlay'
import DrawCanvas from './DrawCanvas'

const DEFAULT_MAX_WIDTH_RATIO = 0.5

interface Props {
  pdfDoc: PDFDocumentProxy | null
  pageCount: number
  zoom: number
  annotations: TextAnnotation[]
  pendingClick: PendingClick | null
  toolbarSettings: ToolbarSettings
  textMode: boolean
  drawMode: boolean
  drawColor: string
  drawLineWidth: number
  strokes: DrawStroke[]
  scrollRoot?: React.RefObject<HTMLDivElement>
  onPageClick: (pageNumber: number, xRatio: number, yRatio: number) => void
  onCurrentPageChange: (page: number) => void
  onAnnotationMove: (id: string, xRatio: number, yRatio: number) => void
  onAnnotationResize: (id: string, maxWidthRatio: number) => void
  onAnnotationEdit: (id: string, pageNumber: number, xRatio: number, yRatio: number, text: string, maxWidthRatio: number) => void
  onPendingConfirm: (text: string) => void
  onPendingCancel: () => void
  onStrokeComplete: (stroke: DrawStroke) => void
}

export interface PdfCanvasHandle {
  scrollToPage: (n: number) => void
}

/**
 * Renders all PDF pages stacked vertically.
 * - Scroll to navigate between pages
 * - IntersectionObserver tracks the currently visible page
 * - Click anywhere (in text mode) to place text
 * - Annotations are draggable and resizable
 */
const PdfCanvas = forwardRef<PdfCanvasHandle, Props>(function PdfCanvas(
  {
    pdfDoc,
    pageCount,
    zoom,
    annotations,
    pendingClick,
    toolbarSettings,
    textMode,
    drawMode,
    drawColor,
    drawLineWidth,
    strokes,
    scrollRoot,
    onPageClick,
    onCurrentPageChange,
    onAnnotationMove,
    onAnnotationResize,
    onAnnotationEdit,
    onPendingConfirm,
    onPendingCancel,
    onStrokeComplete,
  },
  ref,
) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const pageWrapperRefs = useRef<(HTMLDivElement | null)[]>([])
  const [canvasSizes, setCanvasSizes] = useState<{ width: number; height: number }[]>([])

  useImperativeHandle(ref, () => ({
    scrollToPage: (n: number) => {
      pageWrapperRefs.current[n - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }))

  useEffect(() => {
    if (!pdfDoc || pageCount === 0) return
    let cancelled = false
    const sizes: { width: number; height: number }[] = Array(pageCount).fill({ width: 0, height: 0 })

    async function renderAll() {
      for (let i = 1; i <= pageCount; i++) {
        if (cancelled) break
        const canvas = canvasRefs.current[i - 1]
        if (!canvas) continue
        const size = await renderPage(pdfDoc!, i, canvas, zoom)
        sizes[i - 1] = size
      }
      if (!cancelled) setCanvasSizes([...sizes])
    }

    renderAll()
    return () => { cancelled = true }
  }, [pdfDoc, pageCount, zoom])

  useEffect(() => {
    if (pageCount === 0) return
    const thresholds = Array.from({ length: 11 }, (_, i) => i / 10)
    const visibilityMap = new Map<Element, number>()

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { visibilityMap.set(entry.target, entry.intersectionRatio) })
      let maxRatio = 0
      let mostVisible = 0
      pageWrapperRefs.current.forEach((el, idx) => {
        if (!el) return
        const ratio = visibilityMap.get(el) ?? 0
        if (ratio > maxRatio) { maxRatio = ratio; mostVisible = idx }
      })
      if (maxRatio > 0) onCurrentPageChange(mostVisible + 1)
    }, { root: scrollRoot?.current ?? null, threshold: thresholds })

    pageWrapperRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [pdfDoc, pageCount, onCurrentPageChange])

  return (
    <div className="all-pages">
      {Array.from({ length: pageCount }, (_, i) => {
        const pageNum = i + 1
        const size = canvasSizes[i] ?? { width: 0, height: 0 }
        const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum)
        const isPendingPage = pendingClick?.pageNumber === pageNum
        const inputWidthPx = (pendingClick?.maxWidthRatio ?? DEFAULT_MAX_WIDTH_RATIO) * size.width

        return (
          <div key={pageNum} className="page-block">
            <div
              ref={(el) => { pageWrapperRefs.current[i] = el }}
              className="canvas-wrapper"
              style={{ width: size.width || undefined, minHeight: size.height || 200 }}
            >
              <canvas ref={(el) => { canvasRefs.current[i] = el }} className="pdf-canvas" />

              {/* Drawing canvas overlay */}
              {size.width > 0 && (
                <DrawCanvas
                  pageNumber={pageNum}
                  width={size.width}
                  height={size.height}
                  zoom={zoom}
                  strokes={strokes.filter((s) => s.pageNumber === pageNum)}
                  drawMode={drawMode}
                  drawColor={drawColor}
                  drawLineWidth={drawLineWidth}
                  onStrokeComplete={onStrokeComplete}
                />
              )}

              {/* Click capture layer — only active in text mode.
                  z-index 3 keeps it BELOW annotation overlays (z 5) so annotations
                  always receive pointer events regardless of mode. */}
              {size.width > 0 && textMode && (
                <div
                  className="click-layer"
                  style={{ width: size.width, height: size.height, zIndex: 3 }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    onPageClick(pageNum, (e.clientX - rect.left) / size.width, (e.clientY - rect.top) / size.height)
                  }}
                />
              )}

              {/* Annotation overlays */}
              {size.width > 0 && pageAnnotations.map((ann) => (
                <TextAnnotationOverlay
                  key={ann.id}
                  annotation={ann}
                  canvasWidth={size.width}
                  canvasHeight={size.height}
                  hidden={pendingClick?.editId === ann.id}
                  onMove={onAnnotationMove}
                  onResize={onAnnotationResize}
                  onEditRequest={(id, xRatio, yRatio, text, maxWidthRatio) =>
                    onAnnotationEdit(id, pageNum, xRatio, yRatio, text, maxWidthRatio)
                  }
                />
              ))}

              {/* Inline text input at click/edit position */}
              {isPendingPage && pendingClick && size.width > 0 && (
                <input
                  autoFocus
                  defaultValue={pendingClick.initialText ?? ''}
                  className="inline-text-input"
                  style={{
                    position: 'absolute',
                    left: pendingClick.xRatio * size.width,
                    top: pendingClick.yRatio * size.height,
                    width: inputWidthPx,
                    fontSize: toolbarSettings.fontSize,
                    fontFamily: toolbarSettings.fontFamily,
                    color: toolbarSettings.color,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value.trim()
                      if (value) onPendingConfirm(value)
                      else onPendingCancel()
                    }
                    if (e.key === 'Escape') onPendingCancel()
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    if (value) onPendingConfirm(value)
                    else onPendingCancel()
                  }}
                />
              )}
            </div>
            <div className="page-number-label">Página {pageNum}</div>
          </div>
        )
      })}
    </div>
  )
})

export default PdfCanvas
