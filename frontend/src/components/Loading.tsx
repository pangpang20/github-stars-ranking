export function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-github-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-github-muted text-sm">Loading...</span>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-github-border rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-github-border rounded w-1/3" />
              <div className="h-3 bg-github-border rounded w-2/3" />
            </div>
            <div className="w-20 h-6 bg-github-border rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
