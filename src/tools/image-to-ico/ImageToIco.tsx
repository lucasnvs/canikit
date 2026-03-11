import { useState } from 'react'
import { ALL_SIZES, loadImageElement, resizeToPng, generatePreviews } from './lib/imageResizer'
import { buildIco } from './lib/icoEncoder'
import { openImageFile, saveIcoFile, type OpenedImageFile } from './lib/tauriFs'

const FORMAT_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/svg+xml': 'SVG',
}

export default function ImageToIco() {
  const [imgFile, setImgFile] = useState<OpenedImageFile | null>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set(ALL_SIZES))
  const [previews, setPreviews] = useState<Map<number, string>>(new Map())
  const [converting, setConverting] = useState(false)
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  async function handleOpenFile() {
    const file = await openImageFile()
    if (!file) return

    setStatus(null)

    // Revoke previous object URL to avoid memory leak
    if (objectUrl) URL.revokeObjectURL(objectUrl)

    try {
      const img = await loadImageElement(file.bytes, file.mimeType)
      const url = URL.createObjectURL(new Blob([file.bytes.buffer as ArrayBuffer], { type: file.mimeType }))
      const prevs = await generatePreviews(img)

      setImgFile(file)
      setImgEl(img)
      setObjectUrl(url)
      setPreviews(prevs)
      setSelectedSizes(new Set(ALL_SIZES))
    } catch (err) {
      setStatus({ msg: 'Erro ao carregar imagem: ' + String(err), type: 'error' })
    }
  }

  function toggleSize(size: number) {
    setSelectedSizes(prev => {
      if (prev.size === 1 && prev.has(size)) return prev // keep at least 1
      const next = new Set(prev)
      next.has(size) ? next.delete(size) : next.add(size)
      return next
    })
  }

  function selectAll() {
    setSelectedSizes(new Set(ALL_SIZES))
  }

  function selectNone() {
    setSelectedSizes(new Set([ALL_SIZES[0]])) // keep minimum 1
  }

  async function handleConvert() {
    if (!imgEl || selectedSizes.size === 0) return
    setConverting(true)
    setStatus(null)
    try {
      const pngs = new Map<number, Uint8Array>()
      for (const size of ALL_SIZES) {
        if (selectedSizes.has(size)) {
          pngs.set(size, await resizeToPng(imgEl, size))
        }
      }
      const icoBytes = buildIco(pngs)
      const baseName = imgFile!.filePath.replace(/\.[^.]+$/, '.ico')
      const ok = await saveIcoFile(baseName, icoBytes)
      if (ok) {
        setStatus({ msg: `ICO exportado com ${selectedSizes.size} tamanho(s)!`, type: 'success' })
      }
    } catch (err) {
      setStatus({ msg: 'Erro ao converter: ' + String(err), type: 'error' })
    } finally {
      setConverting(false)
    }
  }

  const filename = imgFile?.filePath.split(/[\\/]/).pop()
  const dimensions = imgEl ? `${imgEl.naturalWidth} × ${imgEl.naturalHeight} px` : ''

  return (
    <div className="ico-root">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-group">
          <button className="btn-primary" onClick={handleOpenFile}>
            Abrir Imagem
          </button>
          {filename && <span className="ps-filename">{filename}</span>}
        </div>
        <div className="toolbar-separator" />
        <div className="toolbar-group">
          <button
            className="btn-primary"
            onClick={handleConvert}
            disabled={!imgEl || converting}
          >
            {converting ? 'Convertendo...' : 'Converter .ico'}
            {imgEl && selectedSizes.size > 0 && (
              <span className="ps-export-badge">{selectedSizes.size}</span>
            )}
          </button>
        </div>
      </div>

      {status && (
        <div className={status.type === 'success' ? 'status-bar' : 'error-bar'}>
          {status.msg}
        </div>
      )}

      {!imgEl && (
        <div className="empty-state">
          <span style={{ fontSize: 48 }}>🖼️</span>
          <p>Abra uma imagem JPG, PNG ou SVG para converter em .ico</p>
          <button className="btn-primary large" onClick={handleOpenFile}>
            Abrir Imagem
          </button>
        </div>
      )}

      {imgEl && (
        <div className="ico-content">
          {/* Left: original preview */}
          <div className="ico-preview-panel">
            <img
              src={objectUrl!}
              alt="preview"
              className="ico-preview-img"
            />
            <div className="ico-file-info">
              <span>{filename}</span>
              <span>{FORMAT_LABELS[imgFile!.mimeType] ?? imgFile!.mimeType}</span>
              <span>{dimensions}</span>
            </div>
          </div>

          {/* Right: size selector */}
          <div className="ico-sizes-panel">
            <div className="ico-sizes-actions">
              <button onClick={selectAll}>Selecionar todos</button>
              <button onClick={selectNone}>Limpar</button>
            </div>
            {ALL_SIZES.map(size => {
              const selected = selectedSizes.has(size)
              const preview = previews.get(size)
              return (
                <label
                  key={size}
                  className={`ico-size-row${selected ? ' ico-size-row--selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSize(size)}
                  />
                  <span className="ico-size-label">{size}×{size}</span>
                  {preview && (
                    <img
                      src={preview}
                      alt={`${size}px`}
                      className="ico-size-thumb"
                      style={{ width: Math.min(size, 64), height: Math.min(size, 64) }}
                    />
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
