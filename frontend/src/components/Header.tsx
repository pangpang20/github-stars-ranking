import { Link, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import { triggerCollect, fetchCollectStatus } from '../lib/api';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchCollectStatus();
        if (!status.running) {
          setCollecting(false);
          setCollectMsg('Collection complete!');
          stopPolling();
          setTimeout(() => setCollectMsg(null), 5000);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);
  }, [stopPolling]);

  useEffect(() => {
    // Check if collector is already running on mount
    fetchCollectStatus().then((status) => {
      if (status.running) {
        setCollecting(true);
        startPolling();
      }
    }).catch(() => {});
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const handleCollect = async (mode: 'trending' | 'daily') => {
    if (collecting) return;
    setCollecting(true);
    setCollectMsg(null);
    try {
      await triggerCollect(mode);
      setCollectMsg(`Started ${mode} collection...`);
      startPolling();
    } catch (err: any) {
      setCollecting(false);
      setCollectMsg(err.message || 'Failed to start collection');
      setTimeout(() => setCollectMsg(null), 5000);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-github-surface/95 backdrop-blur border-b border-github-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <svg className="w-8 h-8 text-github-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            <span className="text-lg font-bold text-github-text hidden sm:block">
              GitHub Stars Ranking
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className="btn-ghost text-sm">Home</Link>
            <Link to="/languages" className="btn-ghost text-sm">Rankings</Link>
            <Link to="/logs" className="btn-ghost text-sm">Logs</Link>
          </nav>

          {/* Right side: Collect + Search */}
          <div className="flex items-center gap-3">
            {/* Collect buttons */}
            <div className="relative group">
              <button
                disabled={collecting}
                onClick={() => handleCollect('trending')}
                className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Collect trending repos data"
              >
                {collecting ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Collect
              </button>
              {/* Dropdown for daily mode */}
              {!collecting && (
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
                  <button
                    onClick={() => handleCollect('daily')}
                    className="block w-full text-left px-4 py-2 text-sm text-github-text bg-github-surface border border-github-border rounded shadow-lg hover:bg-github-border/50 whitespace-nowrap"
                  >
                    Daily snapshot
                  </button>
                </div>
              )}
            </div>

            {/* Status message */}
            {collectMsg && (
              <span className="text-xs text-github-muted hidden lg:block max-w-40 truncate" title={collectMsg}>
                {collectMsg}
              </span>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repos..."
                className="input text-sm w-48 sm:w-64"
              />
              <button type="submit" className="btn-primary text-sm px-3 py-1.5">
                Search
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
