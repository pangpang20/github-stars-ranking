interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← Prev
      </button>

      {pages.map((p, idx) =>
        typeof p === 'number' ? (
          <button
            key={idx}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              p === page
                ? 'bg-github-accent text-white'
                : 'text-github-muted hover:text-github-text hover:bg-github-surface'
            }`}
          >
            {p}
          </button>
        ) : (
          <span key={idx} className="px-2 text-github-muted">
            {p}
          </span>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next →
      </button>
    </div>
  );
}
