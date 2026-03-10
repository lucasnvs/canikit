export interface TextAnnotation {
  id: string
  pageNumber: number    // 1-indexed
  xRatio: number        // fraction 0.0–1.0 of page width (top-left origin)
  yRatio: number        // fraction 0.0–1.0 of page height (top-left origin); marks the TOP of the text
  text: string
  fontFamily: FontFamily
  fontSize: number      // PDF points
  color: string         // hex "#000000"
  maxWidthRatio: number // fraction 0.0–1.0 of page width; text wraps within this width
}

export type FontFamily = 'Helvetica' | 'Times-Roman' | 'Courier'

export interface PdfState {
  filePath: string | null
  bytes: Uint8Array | null
  pageCount: number
  currentPage: number   // 1-indexed
}

export interface ToolbarSettings {
  fontFamily: FontFamily
  fontSize: number
  color: string
}

export interface PendingClick {
  pageNumber: number
  xRatio: number
  yRatio: number
  editId?: string          // set when editing an existing annotation
  initialText?: string     // pre-filled text for editing
  maxWidthRatio?: number   // carried from existing annotation when editing
}

export interface StrokePoint {
  xRatio: number
  yRatio: number
}

export interface DrawStroke {
  id: string
  pageNumber: number
  points: StrokePoint[]
  color: string    // hex
  lineWidth: number // PDF points
}
