import { useState } from 'react'
import type { PdfSplitterState, ViewMode } from './types'
import { usePdfPages } from './hooks/usePdfPages'
import { extractPages } from './lib/pdfExtract'
import { openPdfFile, savePdfFile } from './lib/tauriFs'
import PageGrid from './components/PageGrid'
import PageList from './components/PageList'
import RangeInput from './components/RangeInput'

export default function PdfSplitter() {
  const [pdfState, setPdfState] = useState<PdfSplitterState>({
    filePath: null,
    bytes: null,
    pageCount: 0,
  })
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [exporting, setExporting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error'>('success')

  const { pages, pageCount, error } = usePdfPages(pdfState.bytes)

  // Sync resolved pageCount into state
  if (pageCount > 0 && pdfState.pageCount !== pageCount) {
    setPdfState(s => ({ ...s, pageCount }))
  }

  async function handleOpenFile() {
    const result = await openPdfFile()
    if (!result) return
    setSelectedPages(new Set())
    setStatusMsg(null)
    setPdfState({ filePath: result.filePath, bytes: result.bytes, pageCount: 0 })
  }

  function handleToggle(pageNumber: number) {
    setSelectedPages(prev => {
      const next = new Set(prev)
      next.has(pageNumber) ? next.delete(pageNumber) : next.add(pageNumber)
      return next
    })
    setStatusMsg(null)
  }

  function handleSelectAll() {
    setSelectedPages(new Set(Array.from({ length: pdfState.pageCount }, (_, i) => i + 1)))
  }

  function handleSelectNone() {
    setSelectedPages(new Set())
  }

  async function handleExport() {
    if (!pdfState.bytes || selectedPages.size === 0) return
    setExporting(true)
    try {
      const outBytes = await extractPages(pdfState.bytes, selectedPages)
      const defaultPath = pdfState.filePath
        ? pdfState.filePath.replace(/\.pdf$/i, '_splitted.pdf')
        : 'output_splitted.pdf'
      const ok = await savePdfFile(defaultPath, outBytes)
      if (ok) {
        setStatusMsg(`${selectedPages.size} página(s) exportadas com sucesso!`)
        setStatusType('success')
      }
    } catch (err) {
      setStatusMsg('Erro ao exportar: ' + String(err))
      setStatusType('error')
    } finally {
      setExporting(false)
    }
  }

  const hasFile = !!pdfState.bytes

  return (
    <div className="ps-root">
      <div className="toolbar">
        <div className="toolbar-group">
          <button className="btn-primary" onClick={handleOpenFile}>
            Abrir PDF
          </button>
          {pdfState.filePath && (
            <span className="ps-filename">
              {pdfState.filePath.split(/[\\/]/).pop()}
            </span>
          )}
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button
            className={viewMode === 'grid' ? 'btn-primary' : ''}
            onClick={() => setViewMode('grid')}
            disabled={!hasFile}
          >
            Grade
          </button>
          <button
            className={viewMode === 'list' ? 'btn-primary' : ''}
            onClick={() => setViewMode('list')}
            disabled={!hasFile}
          >
            Lista
          </button>
        </div>

        {hasFile && (
          <>
            <div className="toolbar-separator" />
            <RangeInput
              pageCount={pdfState.pageCount}
              selectedPages={selectedPages}
              onRangeApply={setSelectedPages}
            />
          </>
        )}

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={selectedPages.size === 0 || exporting}
          >
            {exporting ? 'Exportando...' : 'Exportar'}
            {selectedPages.size > 0 && (
              <span className="ps-export-badge">{selectedPages.size}</span>
            )}
          </button>
        </div>
      </div>

      {(error || statusMsg) && (
        <div className={statusMsg && statusType === 'success' ? 'status-bar' : 'error-bar'}>
          {error || statusMsg}
        </div>
      )}

      {!hasFile && (
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>✂️</span>
          <p>Abra um PDF para selecionar e exportar páginas</p>
          <button className="btn-primary large" onClick={handleOpenFile}>
            Abrir PDF
          </button>
        </div>
      )}

      {hasFile && (
        <div className="ps-content">
          {viewMode === 'grid' ? (
            <PageGrid
              pages={pages}
              selectedPages={selectedPages}
              onToggle={handleToggle}
            />
          ) : (
            <PageList
              pages={pages}
              selectedPages={selectedPages}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onSelectNone={handleSelectNone}
            />
          )}
        </div>
      )}
    </div>
  )
}
