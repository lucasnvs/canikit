import { useState, useEffect, useRef } from 'react'
import { parseRange, serializeRange } from '../lib/rangeParser'

interface Props {
  pageCount: number
  selectedPages: Set<number>
  onRangeApply: (next: Set<number>) => void
}

export default function RangeInput({ pageCount, selectedPages, onRangeApply }: Props) {
  const [localText, setLocalText] = useState('')
  const hasFocusRef = useRef(false)

  // Sync text from external selection changes (grid/list clicks), but not while user is typing
  useEffect(() => {
    if (!hasFocusRef.current) {
      setLocalText(serializeRange(selectedPages))
    }
  }, [selectedPages])

  function applyRange() {
    const next = parseRange(localText, pageCount)
    onRangeApply(next)
  }

  return (
    <div className="ps-range-row">
      <span className="ps-range-label">Intervalo:</span>
      <input
        className="ps-range-input"
        value={localText}
        placeholder="ex: 1-3, 5, 8-10"
        onFocus={() => { hasFocusRef.current = true }}
        onBlur={() => { hasFocusRef.current = false }}
        onChange={e => setLocalText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') applyRange() }}
      />
      <button onClick={applyRange} disabled={!localText.trim()}>
        Aplicar
      </button>
    </div>
  )
}
