import { useState } from 'react'
import {
  hexToRgb,
  rgbToHsl,
  fmtHex,
  fmtRgb,
  fmtHsl,
  contrastColor,
} from './lib/colorUtils'

const MAX_HISTORY = 20

export default function ColorPicker() {
  const [color, setColor] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  async function handlePick() {
    if (!(window as any).EyeDropper) {
      alert('EyeDropper não é suportado neste ambiente.')
      return
    }
    setPicking(true)
    try {
      const eyeDropper = new (window as any).EyeDropper()
      const result = await eyeDropper.open()
      const hex: string = result.sRGBHex
      setColor(hex)
      setHistory(prev => [hex, ...prev.filter(c => c !== hex)].slice(0, MAX_HISTORY))
    } catch {
      // user cancelled — no-op
    } finally {
      setPicking(false)
    }
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  function selectFromHistory(hex: string) {
    setColor(hex)
  }

  const rgb = color ? hexToRgb(color) : null
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null
  const fg = color ? contrastColor(color) : '#ffffff'

  const formats = color && rgb && hsl
    ? [
        { label: 'HEX', value: fmtHex(color) },
        { label: 'RGB', value: fmtRgb(rgb.r, rgb.g, rgb.b) },
        { label: 'HSL', value: fmtHsl(hsl.h, hsl.s, hsl.l) },
      ]
    : []

  return (
    <div className="cp-root">
      <div className="cp-main">
        {/* Swatch + pick button */}
        <div
          className="cp-swatch"
          style={color ? { background: color } : undefined}
        >
          {!color && <span className="cp-swatch-empty">?</span>}
          {color && (
            <span className="cp-swatch-hex" style={{ color: fg }}>
              {fmtHex(color)}
            </span>
          )}
        </div>

        <button
          className={`btn-primary large cp-pick-btn${picking ? ' cp-pick-btn--active' : ''}`}
          onClick={handlePick}
          disabled={picking}
        >
          {picking ? 'Selecione uma cor...' : 'Capturar Cor da Tela'}
        </button>

        {/* Format rows */}
        {formats.length > 0 && (
          <div className="cp-formats">
            {formats.map(({ label, value }) => (
              <div key={label} className="cp-format-row">
                <span className="cp-format-label">{label}</span>
                <span className="cp-format-value">{value}</span>
                <button
                  className={`cp-copy-btn${copied === label ? ' cp-copy-btn--done' : ''}`}
                  onClick={() => copyText(value, label)}
                >
                  {copied === label ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="cp-history-section">
          <span className="cp-history-label">Histórico</span>
          <div className="cp-history">
            {history.map((hex, i) => (
              <button
                key={i}
                className={`cp-history-swatch${hex === color ? ' cp-history-swatch--active' : ''}`}
                style={{ background: hex }}
                title={fmtHex(hex)}
                onClick={() => selectFromHistory(hex)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
