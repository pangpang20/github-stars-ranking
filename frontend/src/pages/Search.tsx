import { useSearchParams, Link } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';
import { LanguageFilter } from '../components/LanguageFilter';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/Loading';
import { LANGUAGE_COLORS } from '../lib/constants';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const language = searchParams.get('language') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading, error } = useSearch(q, language, page);
  const results = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 0;

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    if (updates.language) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-2">Search Results</h1>
      {q && (
        <p className="text-github-muted mb-6">
          {meta ? `${meta.total.toLocaleString()} results` : 'Searching...'} for "{q}"
        </p>
      )}

      {/* Language filter */}
      <div className="card p-4 mb-6">
        <LanguageFilter value={language} onChange={(lang) => updateParams({ language: lang })} />
      </div>

      {/* Results */}
      {!q ? (
        <div className="card p-8 text-center text-github-muted">
          Enter a search query to find repositories.
        </div>
      ) : isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="card p-8 text-center text-github-red">
          Search failed. Please try again.
        </div>
      ) : results.length === 0 ? (
        <div className="card p-8 text-center text-github-muted">
          No repositories found matching "{q}".
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {results.map((repo: any) => {
              const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || '#8b949e' : '#8b949e';

              return (
                <div key={repo.id} className="card p-4 hover:border-github-accent/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {repo.avatar_url && (
                      <img
                        src={repo.avatar_url}
                        alt={repo.full_name}
                        className="w-10 h-10 rounded-lg flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/repo/${repo.full_name}`}
                          className="text-github-accent hover:underline font-medium"
                        >
                          {repo.full_name}
                        </Link>
                        {repo.language && (
                          <span className="badge badge-language">
                            <span
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: langColor }}
                            />
                            {repo.language}
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-github-muted mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-github-muted">
                        <span>⭐ {repo.watchers_count?.toLocaleString()}</span>
                        <span>🍴 {repo.forks_count?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </>
      )}
    </div>
  );
}
