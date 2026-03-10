import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'

export interface OpenedImageFile {
  filePath: string
  bytes: Uint8Array
  mimeType: 'image/jpeg' | 'image/png' | 'image/svg+xml'
}

/**
 * Opens a system file dialog filtered to image files.
 * Returns the opened file or null if cancelled.
 */
export async function openImageFile(): Promise<OpenedImageFile | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Imagem', extensions: ['jpg', 'jpeg', 'png', 'svg'] }],
  })

  if (!selected || typeof selected !== 'string') return null

  const raw = await readFile(selected)
  const bytes = new Uint8Array(raw)

  const ext = selected.split('.').pop()?.toLowerCase()
  let mimeType: OpenedImageFile['mimeType'] = 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
  else if (ext === 'svg') mimeType = 'image/svg+xml'

  return { filePath: selected, bytes, mimeType }
}

/**
 * Opens a system save dialog and writes the ICO bytes to disk.
 * Returns true on success, false if cancelled.
 */
export async function saveIcoFile(
  defaultPath: string | null,
  bytes: Uint8Array,
): Promise<boolean> {
  const outputPath = await save({
    defaultPath: defaultPath ?? undefined,
    filters: [{ name: 'ICO', extensions: ['ico'] }],
  })

  if (!outputPath) return false

  await writeFile(outputPath, bytes)
  return true
}
