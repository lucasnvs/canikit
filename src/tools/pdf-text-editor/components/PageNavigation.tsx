interface Props {
  currentPage: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
}

export default function PageNavigation({ currentPage, pageCount, onPrev, onNext }: Props) {
  return (
    <div className="page-nav">
      <button onClick={onPrev} disabled={currentPage <= 1}>
        ‹ Anterior
      </button>
      <span className="page-info">
        {currentPage} / {pageCount}
      </span>
      <button onClick={onNext} disabled={currentPage >= pageCount}>
        Próxima ›
      </button>
    </div>
  )
}
