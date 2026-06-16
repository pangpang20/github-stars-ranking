import { useState, useEffect, useRef, useCallback } from 'react';
import { triggerCollect } from '../lib/api';

interface LogEntry {
  time: string;
  text: string;
}

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [mode, setMode] = useState<'trending' | 'daily'>('trending');
  const [resume, setResume] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const autoScroll = useRef(true);

  const connectSSE = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource('/api/collect/logs');
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const entry: LogEntry = JSON.parse(e.data);
        setLogs(prev => [...prev, entry]);
        if (entry.text.includes('=== Finished')) {
          setCollecting(false);
        }
      } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => { esRef.current?.close(); };
  }, [connectSSE]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll.current && termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    const el = termRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  };

  const handleCollect = async () => {
    setCollecting(true);
    setLogs([]);
    try {
      await triggerCollect(mode, resume);
    } catch (err: any) {
      setCollecting(false);
      setLogs(prev => [...prev, { time: new Date().toISOString(), text: `ERROR: ${err.message}` }]);
    }
  };

  const handleClear = () => setLogs([]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-github-text">Collector Logs</h1>
          <p className="text-github-muted text-sm mt-1">
            Run collector and view real-time output
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <span className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-green-400' : 'text-github-red'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-github-red'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <select
          value={mode}
          onChange={e => setMode(e.target.value as 'trending' | 'daily')}
          disabled={collecting}
          className="input text-sm w-auto"
        >
          <option value="trending">Trending discovery</option>
          <option value="daily">Daily snapshot</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-github-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={resume}
            onChange={e => setResume(e.target.checked)}
            disabled={collecting}
            className="rounded border-github-border"
          />
          Resume
        </label>

        <button
          onClick={handleCollect}
          disabled={collecting}
          className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {collecting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running...
            </>
          ) : 'Run Collector'}
        </button>

        <button onClick={handleClear} className="btn-ghost text-sm px-3 py-1.5">
          Clear
        </button>

        <span className="text-github-muted text-xs ml-auto">
          {logs.length} lines
        </span>
      </div>

      {/* Terminal */}
      <div className="card overflow-hidden">
        <div className="bg-[#0d1117] px-3 py-2 flex items-center gap-2 border-b border-github-border">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="text-github-muted text-xs ml-2 font-mono">collector output</span>
        </div>
        <div
          ref={termRef}
          onScroll={handleScroll}
          className="bg-[#0d1117] p-4 h-[60vh] overflow-y-auto font-mono text-sm leading-relaxed"
        >
          {logs.length === 0 ? (
            <span className="text-github-muted">
              {connected ? 'Waiting for collector output...' : 'Connecting...'}
            </span>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-github-muted/50 select-none shrink-0 text-xs leading-relaxed">
                  {new Date(entry.time).toLocaleTimeString()}
                </span>
                <LogLine text={entry.text} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LogLine({ text }: { text: string }) {
  // Colorize based on content
  let color = 'text-gray-300';
  if (text.includes('ERROR') || text.includes('Failed') || text.includes('error:')) {
    color = 'text-red-400';
  } else if (text.includes('WARNING') || text.includes('Rate limited') || text.includes('WARN')) {
    color = 'text-yellow-400';
  } else if (text.includes('=== ') || text.includes('Complete') || text.includes('Done')) {
    color = 'text-green-400 font-bold';
  } else if (text.startsWith('---')) {
    color = 'text-cyan-400';
  } else if (text.includes('Phase')) {
    color = 'text-blue-400';
  }
  return <span className={`${color} break-all`}>{text}</span>;
}
