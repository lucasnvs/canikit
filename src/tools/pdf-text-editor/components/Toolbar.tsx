import type { ToolbarSettings, FontFamily } from '../types'

const FONT_OPTIONS: FontFamily[] = ['Helvetica', 'Times-Roman', 'Courier']
const ZOOM_STEP = 0.25
const ZOOM_MIN = 0.5
const ZOOM_MAX = 3.0

interface Props {
  settings: ToolbarSettings
  onSettingsChange: (s: ToolbarSettings) => void
  zoom: number
  onZoomChange: (z: number) => void
  onOpenFile: () => void
  onSaveFile: () => void
  hasFile: boolean
  hasAnnotations: boolean
  textMode: boolean
  onTextModeToggle: () => void
  drawMode: boolean
  onDrawModeToggle: () => void
  drawColor: string
  onDrawColorChange: (c: string) => void
  drawLineWidth: number
  onDrawLineWidthChange: (w: number) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export default function Toolbar({
  settings,
  onSettingsChange,
  zoom,
  onZoomChange,
  onOpenFile,
  onSaveFile,
  hasFile,
  hasAnnotations,
  textMode,
  onTextModeToggle,
  drawMode,
  onDrawModeToggle,
  drawColor,
  onDrawColorChange,
  drawLineWidth,
  onDrawLineWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  function update(partial: Partial<ToolbarSettings>) {
    onSettingsChange({ ...settings, ...partial })
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="btn-primary" onClick={onOpenFile}>
          📂 Abrir PDF
        </button>
        <button
          className="btn-primary"
          onClick={onSaveFile}
          disabled={!hasFile || !hasAnnotations}
          title={!hasAnnotations ? 'Adicione texto antes de salvar' : ''}
        >
          💾 Salvar PDF
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">↩ Desfazer</button>
        <button onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Y)">↪ Refazer</button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={textMode ? 'btn-primary btn-text-mode-active' : 'btn-text-mode'}
          onClick={onTextModeToggle}
          disabled={!hasFile}
          title={textMode ? 'Clique em qualquer lugar no PDF para adicionar texto (Esc cancela)' : 'Inserir texto no PDF [T]'}
        >
          ✏️ Inserir Texto
        </button>
        <button
          className={drawMode ? 'btn-primary btn-text-mode-active' : 'btn-text-mode'}
          onClick={onDrawModeToggle}
          disabled={!hasFile}
          title={drawMode ? 'Desenho ativo (Esc cancela)' : 'Desenhar no PDF [D]'}
        >
          🖊️ Desenhar
        </button>
      </div>

      {drawMode && (
        <>
          <div className="toolbar-separator" />
          <div className="toolbar-group">
            <label className="toolbar-label">Espessura</label>
            <input
              type="number"
              min={1}
              max={20}
              value={drawLineWidth}
              onChange={(e) => onDrawLineWidthChange(Number(e.target.value))}
              className="font-size-input"
            />
          </div>
          <div className="toolbar-group">
            <label className="toolbar-label">Cor traço</label>
            <input
              type="color"
              value={drawColor}
              onChange={(e) => onDrawColorChange(e.target.value)}
              className="color-input"
            />
          </div>
        </>
      )}

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Zoom</label>
        <button
          className="zoom-btn"
          onClick={() => onZoomChange(Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2)))}
          disabled={zoom <= ZOOM_MIN}
        >
          −
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button
          className="zoom-btn"
          onClick={() => onZoomChange(Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2)))}
          disabled={zoom >= ZOOM_MAX}
        >
          +
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <label className="toolbar-label">Fonte</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value as FontFamily })}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">Tamanho</label>
        <input
          type="number"
          min={6}
          max={144}
          value={settings.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          className="font-size-input"
        />
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">Cor</label>
        <input
          type="color"
          value={settings.color}
          onChange={(e) => update({ color: e.target.value })}
          className="color-input"
        />
      </div>
    </div>
  )
}
