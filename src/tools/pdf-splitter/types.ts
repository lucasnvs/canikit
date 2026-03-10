export type ViewMode = 'grid' | 'list'

export interface PageThumbnail {
  pageNumber: number // 1-indexed
  dataUrl: string    // canvas.toDataURL('image/jpeg', 0.7)
  width: number
  height: number
  loading: boolean
}

export interface PdfSplitterState {
  filePath: string | null
  bytes: Uint8Array | null
  pageCount: number
}
