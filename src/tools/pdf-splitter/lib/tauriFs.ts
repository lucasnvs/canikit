import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'

export interface OpenedFile {
  filePath: string
  bytes: Uint8Array
}

/**
 * Opens a system file dialog filtered to PDF files.
 * Returns { filePath, bytes } or null if cancelled.
 */
export async function openPdfFile(): Promise<OpenedFile | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (!selected || typeof selected !== 'string') return null

  const raw = await readFile(selected)
  return { filePath: selected, bytes: new Uint8Array(raw) }
}

/**
 * Opens a system save dialog and writes the given bytes to disk.
 * Returns true on success, false if cancelled.
 */
export async function savePdfFile(
  defaultPath: string | null,
  bytes: Uint8Array,
): Promise<boolean> {
  const outputPath = await save({
    defaultPath: defaultPath ?? undefined,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })

  if (!outputPath) return false

  await writeFile(outputPath, bytes)
  return true
}
