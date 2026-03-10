import { useState, useRef, useCallback, useEffect } from 'react'
import { usePdfDocument } from './hooks/usePdfDocument'
import { useHistory } from './hooks/useHistory'
import { openPdfFile, savePdfFile } from './lib/tauriFs'
import { applyAnnotations } from './lib/pdfWriter'
import type { TextAnnotation, PdfState, ToolbarSettings, PendingClick, DrawStroke } from './types'
import Toolbar from './components/Toolbar'
import PdfCanvas, { type PdfCanvasHandle } from './components/PdfCanvas'
import PageNavigation from './components/PageNavigation'

const DEFAULT_SETTINGS: ToolbarSettings = {
  fontFamily: 'Helvetica',
  fontSize: 18,
  color: '#000000',
}

interface EditorState {
  annotations: TextAnnotation[]
  strokes: DrawStroke[]
}

const EMPTY_STATE: EditorState = { annotations: [], strokes: [] }

export default function PdfTextEditor() {
  const [pdfState, setPdfState] = useState<PdfState>({
    filePath: null,
    bytes: null,
    pageCount: 0,
    currentPage: 1,
  })
  const history = useHistory<EditorState>(EMPTY_STATE)
  const { annotations, strokes } = history.state

  const [settings, setSettings] = useState<ToolbarSettings>(DEFAULT_SETTINGS)
  const [zoom, setZoom] = useState(1.0)
  const [pendingClick, setPendingClick] = useState<PendingClick | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [textMode, setTextMode] = useState(false)
  const [drawMode, setDrawMode] = useState(false)
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawLineWidth, setDrawLineWidth] = useState(2)

  const { pdfDoc, pageCount, error } = usePdfDocument(pdfState.bytes)
  const canvasRef = useRef<PdfCanvasHandle>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  // Refs for values needed inside stable keyboard handler
  const pdfDocRef = useRef(pdfDoc)
  pdfDocRef.current = pdfDoc

  // Sync pageCount when doc loads
  if (pageCount > 0 && pdfState.pageCount !== pageCount) {
    setPdfState((s) => ({ ...s, pageCount }))
  }

  // Keyboard undo/redo
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault()
          if (e.shiftKey) history.redo()
          else history.undo()
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault()
          history.redo()
        }
        return
      }

      if (isTyping) return

      // T — toggle text insertion mode
      if (e.key === 't' || e.key === 'T') {
        if (pdfDocRef.current) { e.preventDefault(); setTextMode((v) => !v); setDrawMode(false); setPendingClick(null) }
      }
      // D — toggle draw mode
      if (e.key === 'd' || e.key === 'D') {
        if (pdfDocRef.current) { e.preventDefault(); setDrawMode((v) => !v); setTextMode(false); setPendingClick(null) }
      }
      // Escape — cancel / deactivate
      if (e.key === 'Escape') {
        setPendingClick(null); setTextMode(false); setDrawMode(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [history.undo, history.redo])

  async function handleOpenFile() {
    const result = await openPdfFile()
    if (!result) return
    history.reset(EMPTY_STATE)
    setPendingClick(null)
    setTextMode(false)
    setDrawMode(false)
    setPdfState({ filePath: result.filePath, bytes: result.bytes, pageCount: 0, currentPage: 1 })
    setStatusMsg(null)
  }

  async function handleSaveFile() {
    if (!pdfState.bytes || (annotations.length === 0 && strokes.length === 0)) return
    setSaving(true)
    try {
      const newBytes = await applyAnnotations(pdfState.bytes, annotations, strokes)
      const ok = await savePdfFile(pdfState.filePath, newBytes)
      if (ok) setStatusMsg('✓ PDF salvo com sucesso!')
    } catch (err) {
      setStatusMsg('Erro ao salvar: ' + String(err))
    } finally {
      setSaving(false)
    }
  }

  function handlePageClick(pageNumber: number, xRatio: number, yRatio: number) {
    if (!pdfDoc) return
    setPendingClick({ pageNumber, xRatio, yRatio })
  }

  function handleAnnotationEdit(id: string, pageNumber: number, xRatio: number, yRatio: number, initialText: string, maxWidthRatio: number) {
    setPendingClick({ pageNumber, xRatio, yRatio, editId: id, initialText, maxWidthRatio })
  }

  function handlePendingConfirm(text: string) {
    if (!pendingClick) return
    if (pendingClick.editId) {
      // Apply current toolbar settings (color, font, size) when editing
      history.set({
        ...history.state,
        annotations: annotations.map((a) =>
          a.id === pendingClick.editId
            ? { ...a, text, fontFamily: settings.fontFamily, fontSize: settings.fontSize, color: settings.color }
            : a,
        ),
      })
    } else {
      const annotation: TextAnnotation = {
        id: crypto.randomUUID(),
        pageNumber: pendingClick.pageNumber,
        xRatio: pendingClick.xRatio,
        yRatio: pendingClick.yRatio,
        text,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        color: settings.color,
        maxWidthRatio: 0.5,
      }
      history.set({ ...history.state, annotations: [...annotations, annotation] })
    }
    setPendingClick(null)
    // Deactivate text mode after placing new text (not after editing existing)
    if (!pendingClick.editId) setTextMode(false)
    setStatusMsg(null)
  }

  function handleAnnotationMove(id: string, xRatio: number, yRatio: number) {
    history.set({
      ...history.state,
      annotations: annotations.map((a) => (a.id === id ? { ...a, xRatio, yRatio } : a)),
    })
  }

  function handleAnnotationResize(id: string, maxWidthRatio: number) {
    history.set({
      ...history.state,
      annotations: annotations.map((a) => (a.id === id ? { ...a, maxWidthRatio } : a)),
    })
  }

  function handleStrokeComplete(stroke: DrawStroke) {
    history.set({ ...history.state, strokes: [...strokes, stroke] })
  }

  const handleCurrentPageChange = useCallback((page: number) => {
    setPdfState((s) => (s.currentPage === page ? s : { ...s, currentPage: page }))
  }, [])

  return (
    <div className="pdf-editor">
      <Toolbar
        settings={settings}
        onSettingsChange={setSettings}
        zoom={zoom}
        onZoomChange={setZoom}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        hasFile={!!pdfState.bytes}
        hasAnnotations={annotations.length > 0 || strokes.length > 0}
        textMode={textMode}
        onTextModeToggle={() => {
          setTextMode((v) => !v)
          setDrawMode(false)
          setPendingClick(null)
        }}
        drawMode={drawMode}
        onDrawModeToggle={() => {
          setDrawMode((v) => !v)
          setTextMode(false)
          setPendingClick(null)
        }}
        drawColor={drawColor}
        onDrawColorChange={setDrawColor}
        drawLineWidth={drawLineWidth}
        onDrawLineWidthChange={setDrawLineWidth}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
      />

      {error && <div className="error-bar">{error}</div>}
      {statusMsg && <div className="status-bar">{statusMsg}</div>}
      {saving && <div className="status-bar">Salvando PDF...</div>}

      {!pdfDoc && !error && (
        <div className="empty-state">
          <span>📄</span>
          <p>Abra um arquivo PDF para começar</p>
          <button className="btn-primary large" onClick={handleOpenFile}>
            Abrir PDF
          </button>
        </div>
      )}

      {pdfDoc && (
        <>
          <div className="canvas-area" ref={canvasAreaRef}>
            <PdfCanvas
              ref={canvasRef}
              scrollRoot={canvasAreaRef}
              pdfDoc={pdfDoc}
              pageCount={pdfState.pageCount}
              zoom={zoom}
              annotations={annotations}
              pendingClick={pendingClick}
              toolbarSettings={settings}
              textMode={textMode}
              onPageClick={handlePageClick}
              onCurrentPageChange={handleCurrentPageChange}
              onAnnotationMove={handleAnnotationMove}
              onAnnotationResize={handleAnnotationResize}
              onAnnotationEdit={handleAnnotationEdit}
              onPendingConfirm={handlePendingConfirm}
              onPendingCancel={() => { setPendingClick(null); setTextMode(false) }}
              drawMode={drawMode}
              drawColor={drawColor}
              drawLineWidth={drawLineWidth}
              strokes={strokes}
              onStrokeComplete={handleStrokeComplete}
            />
          </div>

          <PageNavigation
            currentPage={pdfState.currentPage}
            pageCount={pdfState.pageCount}
            onPrev={() => {
              const p = Math.max(1, pdfState.currentPage - 1)
              canvasRef.current?.scrollToPage(p)
            }}
            onNext={() => {
              const p = Math.min(pdfState.pageCount, pdfState.currentPage + 1)
              canvasRef.current?.scrollToPage(p)
            }}
          />

          {(annotations.length > 0 || strokes.length > 0) && (
            <div className="annotation-count">
              {annotations.length > 0 && <>{annotations.length} texto{annotations.length !== 1 ? 's' : ''}</>}
              {annotations.length > 0 && strokes.length > 0 && ' · '}
              {strokes.length > 0 && <>{strokes.length} traço{strokes.length !== 1 ? 's' : ''}</>}
              {' '} — "Salvar PDF" para aplicar
            </div>
          )}
        </>
      )}
    </div>
  )
}
