import { useState, useEffect } from 'react'
import { loadPdfDocument } from '../lib/pdfRenderer'
import type { PDFDocumentProxy } from '../lib/pdfRenderer'

interface UsePdfDocumentResult {
  pdfDoc: PDFDocumentProxy | null
  pageCount: number
  error: string | null
}

/**
 * Loads a PDF document from raw bytes using PDF.js.
 * Re-loads whenever the bytes reference changes.
 */
export function usePdfDocument(bytes: Uint8Array | null): UsePdfDocumentResult {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bytes) {
      setPdfDoc(null)
      setPageCount(0)
      return
    }

    let cancelled = false

    loadPdfDocument(bytes)
      .then((doc) => {
        if (cancelled) return
        setPdfDoc(doc)
        setPageCount(doc.numPages)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setError('Erro ao carregar PDF: ' + String(err))
      })

    return () => {
      cancelled = true
    }
  }, [bytes])

  return { pdfDoc, pageCount, error }
}
