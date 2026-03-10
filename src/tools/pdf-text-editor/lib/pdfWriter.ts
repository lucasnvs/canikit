import { PDFDocument, StandardFonts, rgb, LineCapStyle } from 'pdf-lib'
import type { TextAnnotation, FontFamily, DrawStroke } from '../types'

const FONT_MAP: Record<FontFamily, StandardFonts> = {
  'Helvetica': StandardFonts.Helvetica,
  'Times-Roman': StandardFonts.TimesRoman,
  'Courier': StandardFonts.Courier,
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  }
}

/**
 * Applies all text annotations to the original PDF bytes and returns the
 * modified PDF as a new Uint8Array.
 *
 * Coordinate conversion:
 *   PDF.js uses top-left origin; pdf-lib uses bottom-left origin.
 *   xRatio and yRatio are fractions of the page size (0.0–1.0).
 *   pdfX = xRatio * pdfWidth
 *   pdfY = pdfHeight - (yRatio * pdfHeight) - fontSize   ← flips Y axis
 */
export async function applyAnnotations(
  originalBytes: Uint8Array,
  annotations: TextAnnotation[],
  strokes: DrawStroke[] = [],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes)
  const pages = pdfDoc.getPages()

  // Pre-embed each font used across all annotations (dedup)
  const fontsNeeded = [...new Set(annotations.map((a) => a.fontFamily))]
  const embeddedFonts: Partial<Record<FontFamily, Awaited<ReturnType<typeof pdfDoc.embedFont>>>> = {}
  for (const family of fontsNeeded) {
    embeddedFonts[family] = await pdfDoc.embedFont(FONT_MAP[family])
  }

  for (const ann of annotations) {
    const page = pages[ann.pageNumber - 1]
    if (!page) continue

    const { width: pdfW, height: pdfH } = page.getSize()
    const pdfX = ann.xRatio * pdfW
    // yRatio marks the TOP of the text block (top-left origin).
    // Subtract fontSize so the baseline sits one em below the top anchor,
    // matching the HTML overlay's top: yRatio * canvasHeight layout.
    const pdfY = pdfH - ann.yRatio * pdfH - ann.fontSize
    const maxWidth = ann.maxWidthRatio * pdfW

    const { r, g, b } = hexToRgb(ann.color)
    const font = embeddedFonts[ann.fontFamily]!

    page.drawText(ann.text, {
      x: pdfX,
      y: pdfY,
      size: ann.fontSize,
      font,
      color: rgb(r, g, b),
      maxWidth,
      lineHeight: ann.fontSize * 1.2,
    })
  }

  for (const stroke of strokes) {
    const page = pages[stroke.pageNumber - 1]
    if (!page || stroke.points.length < 2) continue

    const { width: pdfW, height: pdfH } = page.getSize()
    const { r, g, b } = hexToRgb(stroke.color)

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const from = stroke.points[i]
      const to = stroke.points[i + 1]
      page.drawLine({
        start: { x: from.xRatio * pdfW, y: pdfH - from.yRatio * pdfH },
        end:   { x: to.xRatio * pdfW,   y: pdfH - to.yRatio * pdfH },
        thickness: stroke.lineWidth,
        color: rgb(r, g, b),
        lineCap: LineCapStyle.Round,
      })
    }
  }

  const savedBytes = await pdfDoc.save()
  return savedBytes
}
