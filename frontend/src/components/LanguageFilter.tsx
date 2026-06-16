import { useLanguages } from '../hooks/useLanguages';

interface LanguageFilterProps {
  value: string;
  onChange: (language: string) => void;
}

export function LanguageFilter({ value, onChange }: LanguageFilterProps) {
  const { data, isLoading } = useLanguages();
  const languages = data?.data || [];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onChange('all')}
        className={`badge whitespace-nowrap cursor-pointer transition-colors ${
          value === 'all'
            ? 'bg-github-accent text-white'
            : 'bg-github-surface text-github-muted hover:text-github-text'
        }`}
      >
        All Languages
      </button>
      {!isLoading &&
        languages.slice(0, 20).map((lang) => (
          <button
            key={lang.language}
            onClick={() => onChange(lang.language)}
            className={`badge whitespace-nowrap cursor-pointer transition-colors ${
              value === lang.language
                ? 'bg-github-accent text-white'
                : 'bg-github-surface text-github-muted hover:text-github-text'
            }`}
          >
            {lang.language}
            <span className="ml-1 opacity-60">{lang.count}</span>
          </button>
        ))}
    </div>
  );
}
