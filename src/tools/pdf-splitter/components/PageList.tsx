import type { PageThumbnail } from '../types'

interface Props {
  pages: PageThumbnail[]
  selectedPages: Set<number>
  onToggle: (pageNumber: number) => void
  onSelectAll: () => void
  onSelectNone: () => void
}

export default function PageList({
  pages,
  selectedPages,
  onToggle,
  onSelectAll,
  onSelectNone,
}: Props) {
  return (
    <div className="ps-list">
      <div className="ps-list-actions">
        <button onClick={onSelectAll}>Selecionar todos</button>
        <button onClick={onSelectNone}>Limpar</button>
      </div>
      {pages.map(page => {
        const selected = selectedPages.has(page.pageNumber)
        return (
          <label
            key={page.pageNumber}
            className={`ps-list-row${selected ? ' ps-list-row--selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(page.pageNumber)}
            />
            <span className="ps-list-page-num">Página {page.pageNumber}</span>
            {!page.loading && page.dataUrl && (
              <img
                src={page.dataUrl}
                alt={`Página ${page.pageNumber}`}
                className="ps-list-thumb"
              />
            )}
          </label>
        )
      })}
    </div>
  )
}
