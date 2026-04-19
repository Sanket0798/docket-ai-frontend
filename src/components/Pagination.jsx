/**
 * Reusable pagination bar.
 *
 * Props:
 *   page        — current page (1-based)
 *   totalPages  — total number of pages
 *   onPageChange(newPage) — callback
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2; // pages to show around current

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8 flex-wrap">
      {/* Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="h-[34px] px-3 border border-input-border rounded-[6px] text-sm font-medium text-text-h2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
      >
        ← Prev
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="h-[34px] px-2 flex items-center text-text-h2 text-sm">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`h-[34px] w-[34px] rounded-[6px] text-sm font-medium transition cursor-pointer
              ${p === page
                ? 'bg-brand-color text-white'
                : 'border border-input-border text-text-h2 hover:bg-gray-50'
              }`}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="h-[34px] px-3 border border-input-border rounded-[6px] text-sm font-medium text-text-h2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
      >
        Next →
      </button>
    </div>
  );
};

export default Pagination;
