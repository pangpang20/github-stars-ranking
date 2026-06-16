import { useStats } from '../hooks/useStats';

export function Footer() {
  const { data } = useStats();
  const stats = data?.data;

  return (
    <footer className="border-t border-github-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-github-muted">
          <div className="flex items-center gap-4">
            <span>GitHub Stars Ranking</span>
            {stats && (
              <>
                <span>·</span>
                <span>{stats.total_repos.toLocaleString()} repos tracked</span>
                <span>·</span>
                <span>{stats.languages_count} languages</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {stats?.last_update && (
              <span>Last updated: {new Date(stats.last_update).toLocaleString()}</span>
            )}
            <a
              href="mailto:676814828@qq.com"
              className="hover:text-github-accent transition-colors"
            >
              Powered by 676814828@qq.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
