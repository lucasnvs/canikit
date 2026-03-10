import type { PageThumbnail } from '../types'

interface Props {
  pages: PageThumbnail[]
  selectedPages: Set<number>
  onToggle: (pageNumber: number) => void
}

export default function PageGrid({ pages, selectedPages, onToggle }: Props) {
  return (
    <div className="ps-grid">
      {pages.map(page => {
        const selected = selectedPages.has(page.pageNumber)
        return (
          <div
            key={page.pageNumber}
            className={`ps-grid-cell${selected ? ' ps-grid-cell--selected' : ''}`}
            onClick={() => onToggle(page.pageNumber)}
          >
            <div className="ps-thumb-wrap">
              {page.loading || !page.dataUrl ? (
                <div className="ps-thumb-skeleton" />
              ) : (
                <img
                  src={page.dataUrl}
                  alt={`Página ${page.pageNumber}`}
                  className="ps-thumb-img"
                />
              )}
              {selected && <div className="ps-check-overlay">✓</div>}
            </div>
            <div className="ps-page-num">Pág. {page.pageNumber}</div>
          </div>
        )
      })}
    </div>
  )
}
