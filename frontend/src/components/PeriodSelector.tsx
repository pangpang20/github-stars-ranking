import { PERIODS } from '../lib/constants';

interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-github-surface rounded-lg p-1">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === period.value
              ? 'bg-github-accent text-white'
              : 'text-github-muted hover:text-github-text'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
