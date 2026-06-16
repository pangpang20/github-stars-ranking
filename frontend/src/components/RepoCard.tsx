import { Link } from 'react-router-dom';
import { LANGUAGE_COLORS } from '../lib/constants';

interface RepoCardProps {
  rank: number;
  full_name: string;
  description: string | null;
  language: string | null;
  stars: number;
  delta: number;
  avatar_url: string | null;
  html_url: string | null;
  period: string;
}

export function RepoCard({
  rank,
  full_name,
  description,
  language,
  stars,
  delta,
  avatar_url,
  html_url,
  period,
}: RepoCardProps) {
  const langColor = language ? LANGUAGE_COLORS[language] || '#8b949e' : '#8b949e';

  return (
    <div className="card p-4 hover:border-github-accent/50 transition-colors group">
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="flex-shrink-0 w-10 text-center">
          <span className={`text-lg font-bold ${
            rank <= 3 ? 'text-github-orange' : 'text-github-muted'
          }`}>
            {rank}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar_url ? (
            <img
              src={avatar_url}
              alt={full_name}
              className="w-10 h-10 rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-github-border" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/repo/${full_name}`}
              className="text-github-accent hover:underline font-medium truncate"
            >
              {full_name}
            </Link>
            {language && (
              <span className="badge badge-language flex-shrink-0">
                <span
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: langColor }}
                />
                {language}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-github-muted mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm text-github-text font-medium">
            {formatNumber(stars)} ★
          </div>
          <div className={`text-sm font-medium ${
            delta > 0 ? 'text-github-green' : delta < 0 ? 'text-github-red' : 'text-github-muted'
          }`}>
            {delta > 0 ? '+' : ''}{formatNumber(delta)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}
