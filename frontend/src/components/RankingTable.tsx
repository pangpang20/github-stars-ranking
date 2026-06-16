import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { RankingResult } from '../lib/types';
import { LANGUAGE_COLORS } from '../lib/constants';

interface RankingTableProps {
  data: RankingResult[];
  period: string;
}

type SortKey = 'rank' | 'name' | 'language' | 'stars' | 'delta';
type SortDir = 'asc' | 'desc';

export function RankingTable({ data, period }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'language' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'rank': cmp = a.rank - b.rank; break;
        case 'name': cmp = (a.full_name || '').localeCompare(b.full_name || ''); break;
        case 'language': cmp = (a.repo_language || '').localeCompare(b.repo_language || ''); break;
        case 'stars': cmp = a.stars - b.stars; break;
        case 'delta': cmp = a.delta - b.delta; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  if (!data || data.length === 0) {
    return (
      <div className="card p-8 text-center text-github-muted">
        No ranking data available. Try a different language or period.
      </div>
    );
  }

  const periodLabel = period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'Total';

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="ml-1 text-github-muted/30">↕</span>;
    return <span className="ml-1 text-github-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-github-border">
            <th
              className="text-left py-3 px-4 text-sm font-medium text-github-muted w-12 cursor-pointer select-none hover:text-github-text transition-colors"
              onClick={() => handleSort('rank')}
            >
              #<SortIcon column="rank" />
            </th>
            <th
              className="text-left py-3 px-4 text-sm font-medium text-github-muted cursor-pointer select-none hover:text-github-text transition-colors"
              onClick={() => handleSort('name')}
            >
              Repository<SortIcon column="name" />
            </th>
            <th
              className="text-left py-3 px-4 text-sm font-medium text-github-muted hidden sm:table-cell cursor-pointer select-none hover:text-github-text transition-colors"
              onClick={() => handleSort('language')}
            >
              Language<SortIcon column="language" />
            </th>
            <th
              className="text-right py-3 px-4 text-sm font-medium text-github-muted cursor-pointer select-none hover:text-github-text transition-colors"
              onClick={() => handleSort('stars')}
            >
              Stars<SortIcon column="stars" />
            </th>
            <th
              className="text-right py-3 px-4 text-sm font-medium text-github-muted cursor-pointer select-none hover:text-github-text transition-colors"
              onClick={() => handleSort('delta')}
            >
              {periodLabel}<SortIcon column="delta" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => {
            const langColor = row.repo_language ? LANGUAGE_COLORS[row.repo_language] || '#8b949e' : '#8b949e';

            return (
              <tr
                key={row.repo_id}
                className="border-b border-github-border/50 hover:bg-github-surface/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <span className={`font-bold ${
                    row.rank <= 3 ? 'text-github-orange' : 'text-github-muted'
                  }`}>
                    {sortKey === 'rank' ? idx + 1 : row.rank}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {row.avatar_url && (
                      <img
                        src={row.avatar_url}
                        alt={row.full_name}
                        className="w-8 h-8 rounded-lg flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <Link
                        to={`/repo/${row.full_name}`}
                        className="text-github-accent hover:underline font-medium truncate block"
                      >
                        {row.full_name}
                      </Link>
                      {row.description && (
                        <p className="text-xs text-github-muted truncate max-w-md">
                          {row.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  {row.repo_language && (
                    <span className="badge badge-language">
                      <span
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: langColor }}
                      />
                      {row.repo_language}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-sm font-medium">
                  {formatNumber(row.stars)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`text-sm font-medium ${
                    row.delta > 0 ? 'text-github-green' : row.delta < 0 ? 'text-github-red' : 'text-github-muted'
                  }`}>
                    {row.delta > 0 ? '+' : ''}{formatNumber(row.delta)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}
