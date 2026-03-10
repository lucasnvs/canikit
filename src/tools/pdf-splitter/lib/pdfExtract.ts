import { PDFDocument } from 'pdf-lib'

/**
 * Creates a new PDF containing only the pages at the given 1-indexed page numbers,
 * preserving their order sorted ascending.
 */
export async function extractPages(
  originalBytes: Uint8Array,
  selectedPages: Set<number>, // 1-indexed
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(originalBytes)
  const outDoc = await PDFDocument.create()

  const indices = [...selectedPages]
    .filter(n => n >= 1 && n <= srcDoc.getPageCount())
    .sort((a, b) => a - b)
    .map(n => n - 1) // 0-indexed for pdf-lib

  const copied = await outDoc.copyPages(srcDoc, indices)
  copied.forEach(page => outDoc.addPage(page))

  return outDoc.save()
}
