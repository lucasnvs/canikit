import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
// Vite resolves ?url imports as a URL string — required for the worker
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }
export type { PDFDocumentProxy }

/**
 * Loads a PDF from raw bytes and returns the PDF.js document proxy.
 */
export async function loadPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  // .slice() gives pdf.js its own copy to transfer/detach internally,
  // keeping the original bytes in React state valid for later save operations.
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() })
  return loadingTask.promise
}

/**
 * Renders a PDF page into the given canvas element.
 * Returns the rendered canvas dimensions in pixels.
 */
export async function renderPage(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1,
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  canvas.width = viewport.width
  canvas.height = viewport.height

  const context = canvas.getContext('2d')!
  await page.render({ canvasContext: context, viewport }).promise

  return { width: viewport.width, height: viewport.height }
}
