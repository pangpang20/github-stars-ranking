import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRankings } from '../hooks/useRankings';
import { RankingTable } from '../components/RankingTable';
import { LanguageFilter } from '../components/LanguageFilter';
import { PeriodSelector } from '../components/PeriodSelector';
import { Pagination } from '../components/Pagination';
import { TableSkeleton } from '../components/Loading';

export function Rankings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const language = searchParams.get('language') || 'all';
  const period = searchParams.get('period') || 'monthly';
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading, error } = useRankings({
    language,
    period,
    page,
    per_page: 50,
  });

  const rankings = data?.data || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 0;

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      newParams.set(key, value);
    });
    if (updates.language || updates.period) {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Rankings</h1>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <LanguageFilter value={language} onChange={(lang) => updateParams({ language: lang })} />
          <PeriodSelector value={period} onChange={(p) => updateParams({ period: p })} />
        </div>
      </div>

      {/* Results info */}
      {meta && (
        <div className="flex items-center justify-between mb-4 text-sm text-github-muted">
          <span>
            {meta.total.toLocaleString()} repos ranked
          </span>
          {meta.updated_at && (
            <span>Updated: {new Date(meta.updated_at).toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="card p-8 text-center text-github-red">
          Failed to load rankings.
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <RankingTable data={rankings} period={period} />
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
