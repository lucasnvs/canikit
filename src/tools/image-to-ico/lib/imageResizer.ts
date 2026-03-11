export const ALL_SIZES = [16, 32, 48, 64, 128, 256] as const
export type IcoSize = typeof ALL_SIZES[number]

/**
 * Loads raw image bytes into an HTMLImageElement via a Blob URL.
 * Works for JPG, PNG, and SVG.
 */
export function loadImageElement(bytes: Uint8Array, mimeType: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao carregar a imagem'))
    }
    img.src = url
  })
}

/**
 * Renders the image at the given pixel size using an off-screen canvas
 * and returns the result as a PNG-encoded Uint8Array.
 */
export function resizeToPng(img: HTMLImageElement, size: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error(`Falha ao renderizar tamanho ${size}px`))
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
    }, 'image/png')
  })
}

/**
 * Renders the image at each size and returns a dataUrl per size for preview.
 */
export async function generatePreviews(img: HTMLImageElement): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  for (const size of ALL_SIZES) {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)
    map.set(size, canvas.toDataURL('image/png'))
  }
  return map
}
