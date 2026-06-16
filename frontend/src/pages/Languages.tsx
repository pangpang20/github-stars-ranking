import { useState, useMemo } from 'react';
import { useLanguages } from '../hooks/useLanguages';
import { useRankings } from '../hooks/useRankings';
import { RankingTable } from '../components/RankingTable';
import { PeriodSelector } from '../components/PeriodSelector';
import { Pagination } from '../components/Pagination';
import { Loading, TableSkeleton } from '../components/Loading';
import { LANGUAGE_COLORS } from '../lib/constants';

// Language category tree
const LANGUAGE_TREE = [
  {
    category: 'Web Development',
    children: ['JavaScript', 'TypeScript', 'PHP', 'Ruby', 'Dart'],
  },
  {
    category: 'Systems',
    children: ['C', 'C++', 'Rust', 'Go', 'Zig'],
  },
  {
    category: 'Enterprise',
    children: ['Java', 'C#', 'Kotlin', 'Scala', 'Swift'],
  },
  {
    category: 'Data & ML',
    children: ['Python'],
  },
  {
    category: 'Scripting',
    children: ['Shell', 'Lua'],
  },
  {
    category: 'Functional',
    children: ['Haskell', 'Elixir'],
  },
] as const;

export function Languages() {
  const { data, isLoading } = useLanguages();
  const languages = data?.data || [];

  // Build a set of available languages for quick lookup
  const availableLangs = useMemo(() => new Set(languages.map(l => l.language)), [languages]);
  const langCounts = useMemo(() => Object.fromEntries(languages.map(l => [l.language, l.count])), [languages]);

  // State
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(LANGUAGE_TREE.map(c => c.category)));
  const [focused, setFocused] = useState<string | null>(null);
  const [period, setPeriod] = useState('monthly');
  const [page, setPage] = useState(1);

  // Current language to show rankings for
  const currentLang = focused || (selected.size > 0 ? Array.from(selected)[0] : 'all');

  // Fetch rankings for current language
  const { data: rankData, isLoading: rankLoading } = useRankings({
    language: currentLang,
    period,
    page,
    per_page: 50,
  });

  const rankings = rankData?.data || [];
  const meta = rankData?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.per_page) : 0;

  // Toggle language selection
  const toggleLang = (lang: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(lang)) {
        next.delete(lang);
        if (focused === lang) setFocused(null);
      } else {
        next.add(lang);
        if (!focused) setFocused(lang);
      }
      return next;
    });
    setPage(1);
  };

  // Toggle category expansion
  const toggleCategory = (cat: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Select all languages in a category
  const toggleCategorySelect = (category: typeof LANGUAGE_TREE[number]) => {
    const catLangs = category.children.filter(l => availableLangs.has(l));
    const allSelected = catLangs.every(l => selected.has(l));

    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        catLangs.forEach(l => next.delete(l));
      } else {
        catLangs.forEach(l => next.add(l));
      }
      return next;
    });
    setPage(1);
  };

  // Select all / clear
  const selectAll = () => {
    setSelected(new Set(languages.map(l => l.language)));
    setPage(1);
  };
  const clearAll = () => {
    setSelected(new Set());
    setFocused(null);
    setPage(1);
  };

  if (isLoading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-6">
        {/* Left sidebar - Language tree */}
        <aside className="w-64 flex-shrink-0">
          <div className="card p-4 sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-github-text">Languages</h2>
              <div className="flex gap-1">
                <button onClick={selectAll} className="text-xs text-github-accent hover:underline">All</button>
                <span className="text-github-muted text-xs">/</span>
                <button onClick={clearAll} className="text-xs text-github-muted hover:text-github-accent hover:underline">Clear</button>
              </div>
            </div>

            {/* All Languages */}
            <button
              onClick={() => { setFocused(null); setSelected(new Set()); setPage(1); }}
              className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 transition-colors ${
                currentLang === 'all' && selected.size === 0
                  ? 'bg-github-accent/10 text-github-accent font-medium'
                  : 'text-github-text hover:bg-github-surface'
              }`}
            >
              All Languages
              <span className="text-github-muted ml-1">({languages.reduce((s, l) => s + l.count, 0)})</span>
            </button>

            {/* Tree */}
            <div className="mt-2 space-y-0.5">
              {LANGUAGE_TREE.map(category => {
                const catLangs = category.children.filter(l => availableLangs.has(l));
                if (catLangs.length === 0) return null;

                const isExpanded = expanded.has(category.category);
                const allSelected = catLangs.every(l => selected.has(l));
                const someSelected = catLangs.some(l => selected.has(l));

                return (
                  <div key={category.category}>
                    {/* Category header */}
                    <div className="flex items-center gap-1 px-1">
                      <button
                        onClick={() => toggleCategory(category.category)}
                        className="p-0.5 text-github-muted hover:text-github-text"
                      >
                        <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <label className="flex items-center gap-1.5 flex-1 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={() => toggleCategorySelect(category)}
                          className="rounded border-github-border w-3.5 h-3.5"
                        />
                        <span className="text-xs font-medium text-github-muted uppercase tracking-wider">
                          {category.category}
                        </span>
                      </label>
                    </div>

                    {/* Language items */}
                    {isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {catLangs.map(lang => {
                          const color = LANGUAGE_COLORS[lang] || '#8b949e';
                          const count = langCounts[lang] || 0;
                          const isSelected = selected.has(lang);
                          const isFocused = focused === lang;

                          return (
                            <label
                              key={lang}
                              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                                isFocused
                                  ? 'bg-github-accent/10 text-github-accent'
                                  : isSelected
                                    ? 'text-github-text'
                                    : 'text-github-muted hover:text-github-text hover:bg-github-surface/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLang(lang)}
                                className="rounded border-github-border w-3.5 h-3.5"
                              />
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span
                                className="text-sm flex-1 truncate"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (isSelected) {
                                    setFocused(lang);
                                    setPage(1);
                                  }
                                }}
                              >
                                {lang}
                              </span>
                              <span className="text-xs text-github-muted/70">{count}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            {selected.size > 0 && (
              <div className="mt-3 pt-3 border-t border-github-border text-xs text-github-muted">
                {selected.size} language{selected.size > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </aside>

        {/* Right side - Rankings */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-github-text">
              {currentLang === 'all' ? 'All Languages' : currentLang}
              {meta && (
                <span className="text-sm font-normal text-github-muted ml-2">
                  {meta.total.toLocaleString()} repos
                </span>
              )}
            </h1>
            <PeriodSelector value={period} onChange={(p) => { setPeriod(p); setPage(1); }} />
          </div>

          {/* Selected language tabs (when multiple selected) */}
          {selected.size > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Array.from(selected).map(lang => {
                const color = LANGUAGE_COLORS[lang] || '#8b949e';
                return (
                  <button
                    key={lang}
                    onClick={() => { setFocused(lang); setPage(1); }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      focused === lang
                        ? 'bg-github-accent/15 text-github-accent border border-github-accent/30'
                        : 'bg-github-surface text-github-muted border border-github-border hover:border-github-accent/30'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {lang}
                  </button>
                );
              })}
            </div>
          )}

          {/* Rankings table */}
          {rankLoading ? (
            <TableSkeleton />
          ) : (
            <>
              <div className="card overflow-hidden">
                <RankingTable data={rankings} period={period} />
              </div>
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}

          {/* Empty state */}
          {!rankLoading && rankings.length === 0 && (
            <div className="card p-8 text-center text-github-muted">
              No ranking data available for {currentLang}. Try running the collector first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
