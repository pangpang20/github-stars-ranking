import { useParams, Link } from 'react-router-dom';
import { useRepo } from '../hooks/useRepo';
import { Loading } from '../components/Loading';
import { LANGUAGE_COLORS } from '../lib/constants';

export function RepoDetail() {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const { data, isLoading, error } = useRepo(owner || '', name || '', 90);

  if (isLoading) return <Loading />;
  if (error || !data?.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-8 text-center text-github-red">
          Repository not found or failed to load.
        </div>
      </div>
    );
  }

  const repo = data.data;
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] || '#8b949e' : '#8b949e';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/" className="text-github-accent hover:underline text-sm">
          ← Back to Rankings
        </Link>
      </div>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          {repo.avatar_url && (
            <img
              src={repo.avatar_url}
              alt={repo.full_name}
              className="w-16 h-16 rounded-xl flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-github-text">{repo.full_name}</h1>
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
              <p className="text-github-muted mt-2">{repo.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-github-muted flex-wrap">
              <span>⭐ {repo.watchers_count?.toLocaleString()} stars</span>
              <span>🍴 {repo.forks_count?.toLocaleString()} forks</span>
              <span>📋 {repo.open_issues?.toLocaleString()} issues</span>
              {repo.created_at && (
                <span>📅 Created {new Date(repo.created_at).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3">
              {repo.html_url && (
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-github-accent hover:underline"
                >
                  View on GitHub →
                </a>
              )}
              <a
                href={`https://www.star-history.com/${repo.full_name}#history`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-github-accent hover:underline"
              >
                ⭐ Star History →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Daily Growth"
          value={repo.daily_delta}
          color="text-github-green"
        />
        <StatCard
          label="Weekly Growth"
          value={repo.weekly_delta}
          color="text-github-accent"
        />
        <StatCard
          label="Monthly Growth"
          value={repo.monthly_delta}
          color="text-github-orange"
        />
      </div>

      {/* Star History Chart */}
      <div className="card overflow-hidden">
        <h2 className="text-lg font-semibold p-6 pb-2">Star History</h2>
        <iframe
          src={`https://api.star-history.com/svg?repos=${owner}/${name}&type=Date`}
          width="100%"
          height="600"
          style={{ minHeight: '500px' }}
          frameBorder="0"
          scrolling="no"
          title={`${repo.full_name} Star History`}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-sm text-github-muted mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value > 0 ? '+' : ''}{formatNumber(value)}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}
