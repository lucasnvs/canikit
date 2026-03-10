import { useState, useEffect } from 'react'
import {
  loadPdfDocument,
  renderPage,
} from '../../pdf-text-editor/lib/pdfRenderer'
import type { PageThumbnail } from '../types'

interface UsePdfPagesResult {
  pages: PageThumbnail[]
  pageCount: number
  loading: boolean
  error: string | null
}

export function usePdfPages(
  bytes: Uint8Array | null,
  thumbWidth = 150,
): UsePdfPagesResult {
  const [pages, setPages] = useState<PageThumbnail[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bytes) {
      setPages([])
      setPageCount(0)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const doc = await loadPdfDocument(bytes!)
        if (cancelled) return

        const count = doc.numPages
        setPageCount(count)

        // Initialize all pages with loading: true
        const initial: PageThumbnail[] = Array.from({ length: count }, (_, i) => ({
          pageNumber: i + 1,
          dataUrl: '',
          width: 0,
          height: 0,
          loading: true,
        }))
        setPages(initial)

        // Render thumbnails sequentially
        const offscreen = document.createElement('canvas')

        for (let i = 1; i <= count; i++) {
          if (cancelled) break

          // Get natural page width to compute scale
          const page = await doc.getPage(i)
          const viewport = page.getViewport({ scale: 1 })
          const scale = thumbWidth / viewport.width

          const { width, height } = await renderPage(doc, i, offscreen, scale)
          if (cancelled) break

          const dataUrl = offscreen.toDataURL('image/jpeg', 0.7)

          setPages(prev =>
            prev.map(p =>
              p.pageNumber === i
                ? { ...p, dataUrl, width, height, loading: false }
                : p,
            ),
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError('Erro ao carregar PDF: ' + String(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [bytes, thumbWidth])

  return { pages, pageCount, loading, error }
}
