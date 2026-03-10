import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { applyAnnotations } from '../tools/pdf-text-editor/lib/pdfWriter'
import type { TextAnnotation, DrawStroke } from '../tools/pdf-text-editor/types'

/** Creates a minimal single-page PDF as Uint8Array */
async function makeBlankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([600, 800])
  return doc.save()
}

describe('applyAnnotations', () => {
  it('returns a valid PDF when no annotations or strokes are given', async () => {
    const original = await makeBlankPdf()
    const result = await applyAnnotations(original, [])
    // Should start with the PDF magic bytes
    expect(result[0]).toBe(0x25) // %
    expect(result[1]).toBe(0x50) // P
    expect(result[2]).toBe(0x44) // D
    expect(result[3]).toBe(0x46) // F
  })

  it('returns a larger PDF after adding a text annotation', async () => {
    const original = await makeBlankPdf()
    const annotation: TextAnnotation = {
      id: 'test-1',
      pageNumber: 1,
      xRatio: 0.1,
      yRatio: 0.1,
      text: 'Olá, mundo!',
      fontFamily: 'Helvetica',
      fontSize: 18,
      color: '#000000',
      maxWidthRatio: 0.5,
    }
    const result = await applyAnnotations(original, [annotation])
    expect(result.length).toBeGreaterThan(original.length)
  })

  it('result can be re-loaded by pdf-lib', async () => {
    const original = await makeBlankPdf()
    const annotation: TextAnnotation = {
      id: 'test-2',
      pageNumber: 1,
      xRatio: 0.5,
      yRatio: 0.5,
      text: 'Teste',
      fontFamily: 'Times-Roman',
      fontSize: 12,
      color: '#ff0000',
      maxWidthRatio: 0.5,
    }
    const result = await applyAnnotations(original, [annotation])
    // If this does not throw, the output is a valid PDF
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('handles annotations on specific pages correctly', async () => {
    // Create a 2-page PDF
    const doc = await PDFDocument.create()
    doc.addPage([600, 800])
    doc.addPage([600, 800])
    const original = await doc.save()

    const annotations: TextAnnotation[] = [
      { id: 'p1', pageNumber: 1, xRatio: 0.1, yRatio: 0.1, text: 'Página 1', fontFamily: 'Courier', fontSize: 14, color: '#000000', maxWidthRatio: 0.5 },
      { id: 'p2', pageNumber: 2, xRatio: 0.5, yRatio: 0.5, text: 'Página 2', fontFamily: 'Helvetica', fontSize: 14, color: '#0000ff', maxWidthRatio: 0.5 },
    ]
    const result = await applyAnnotations(original, annotations)
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(2)
  })

  it('skips annotations whose pageNumber is out of range', async () => {
    const original = await makeBlankPdf() // 1 page
    const annotation: TextAnnotation = {
      id: 'oob',
      pageNumber: 99,
      xRatio: 0.5,
      yRatio: 0.5,
      text: 'Fora do intervalo',
      fontFamily: 'Helvetica',
      fontSize: 12,
      color: '#000000',
      maxWidthRatio: 0.5,
    }
    // Should not throw
    const result = await applyAnnotations(original, [annotation])
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('applies draw strokes without throwing', async () => {
    const original = await makeBlankPdf()
    const stroke: DrawStroke = {
      id: 'stroke-1',
      pageNumber: 1,
      points: [
        { xRatio: 0.1, yRatio: 0.1 },
        { xRatio: 0.2, yRatio: 0.2 },
        { xRatio: 0.3, yRatio: 0.15 },
      ],
      color: '#ff0000',
      lineWidth: 2,
    }
    const result = await applyAnnotations(original, [], [stroke])
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('skips strokes with fewer than 2 points', async () => {
    const original = await makeBlankPdf()
    const stroke: DrawStroke = {
      id: 'single-point',
      pageNumber: 1,
      points: [{ xRatio: 0.5, yRatio: 0.5 }],
      color: '#000000',
      lineWidth: 2,
    }
    // Should not throw
    const result = await applyAnnotations(original, [], [stroke])
    expect(result[0]).toBe(0x25) // valid PDF
  })

  it('accepts both text annotations and strokes together', async () => {
    const original = await makeBlankPdf()
    const annotation: TextAnnotation = {
      id: 'combined-text',
      pageNumber: 1,
      xRatio: 0.1,
      yRatio: 0.1,
      text: 'Com traço',
      fontFamily: 'Helvetica',
      fontSize: 16,
      color: '#000000',
      maxWidthRatio: 0.5,
    }
    const stroke: DrawStroke = {
      id: 'combined-stroke',
      pageNumber: 1,
      points: [{ xRatio: 0.2, yRatio: 0.3 }, { xRatio: 0.8, yRatio: 0.3 }],
      color: '#0000ff',
      lineWidth: 3,
    }
    const result = await applyAnnotations(original, [annotation], [stroke])
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('does not mutate the original bytes', async () => {
    const original = await makeBlankPdf()
    const snapshot = original.slice()
    const annotation: TextAnnotation = {
      id: 'mutate-check',
      pageNumber: 1,
      xRatio: 0.5,
      yRatio: 0.5,
      text: 'Não muta',
      fontFamily: 'Helvetica',
      fontSize: 12,
      color: '#000000',
      maxWidthRatio: 0.5,
    }
    await applyAnnotations(original, [annotation])
    expect(original).toEqual(snapshot)
  })
})
