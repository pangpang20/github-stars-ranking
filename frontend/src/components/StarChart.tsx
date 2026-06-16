import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StarHistoryPoint } from '../lib/types';

interface StarChartProps {
  data: StarHistoryPoint[];
  height?: number;
}

export function StarChart({ data, height = 300 }: StarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-github-muted">
        No star history data available
      </div>
    );
  }

  const chartData = data.map((point) => ({
    date: point.date,
    stars: point.stars,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis
          dataKey="date"
          stroke="#8b949e"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const d = new Date(value);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          stroke="#8b949e"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            color: '#c9d1d9',
          }}
          labelFormatter={(label) => `Date: ${label}`}
          formatter={(value: number) => [formatNumber(value), 'Stars']}
        />
        <Line
          type="monotone"
          dataKey="stars"
          stroke="#58a6ff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#58a6ff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Sparkline version for table rows
export function Sparkline({ data, width = 80, height = 24 }: { data: StarHistoryPoint[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="stars"
          stroke="#3fb950"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}
