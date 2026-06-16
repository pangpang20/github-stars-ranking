import { useState } from 'react';
import { useRankings } from '../hooks/useRankings';
import { RankingTable } from '../components/RankingTable';
import { LanguageFilter } from '../components/LanguageFilter';
import { PeriodSelector } from '../components/PeriodSelector';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/Loading';

export function Home() {
  const [language, setLanguage] = useState('all');
  const [period, setPeriod] = useState('monthly');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useRankings({
    language,
    period,
    page,
    per_page: 50,
  });

  const rankings = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-github-text mb-3">
          GitHub Stars Ranking
        </h1>
        <p className="text-github-muted text-lg max-w-2xl mx-auto">
          Real-time ranking of GitHub repositories by star growth.
          Discover trending projects across all programming languages.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <LanguageFilter value={language} onChange={(lang) => { setLanguage(lang); setPage(1); }} />
          <PeriodSelector value={period} onChange={(p) => { setPeriod(p); setPage(1); }} />
        </div>
      </div>

      {/* Results info */}
      {meta && (
        <div className="flex items-center justify-between mb-4 text-sm text-github-muted">
          <span>
            Showing {((meta.page - 1) * meta.per_page + 1)}-{Math.min(meta.page * meta.per_page, meta.total)} of {meta.total.toLocaleString()} repos
          </span>
          {meta.updated_at && (
            <span>
              Updated: {new Date(meta.updated_at).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="card p-8 text-center text-github-red">
          Failed to load rankings. Please try again later.
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <RankingTable data={rankings} period={period} />
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
