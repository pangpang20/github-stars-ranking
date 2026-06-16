import type { ApiResponse, RankingResult, RepoDetail, Stats } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface RankingParams {
  language?: string;
  period?: string;
  page?: number;
  per_page?: number;
}

export async function fetchRankings(params: RankingParams): Promise<ApiResponse<RankingResult[]>> {
  return fetchApi('/rankings', {
    language: params.language || 'all',
    period: params.period || 'monthly',
    page: String(params.page || 1),
    per_page: String(params.per_page || 50),
  });
}

export async function fetchRepo(owner: string, name: string, days?: number): Promise<{ data: RepoDetail }> {
  const params: Record<string, string> = {};
  if (days) params.days = String(days);
  return fetchApi(`/repo/${owner}/${name}`, params);
}

export async function fetchLanguages(): Promise<{ data: Array<{ language: string; count: number }> }> {
  return fetchApi('/languages');
}

export async function fetchSearch(params: {
  q: string;
  language?: string;
  page?: number;
  per_page?: number;
}): Promise<ApiResponse<any[]>> {
  return fetchApi('/search', {
    q: params.q,
    language: params.language || '',
    page: String(params.page || 1),
    per_page: String(params.per_page || 50),
  });
}

export async function fetchStats(): Promise<{ data: Stats }> {
  return fetchApi('/stats');
}

export async function triggerCollect(mode: 'trending' | 'daily' = 'trending', resume: boolean = false): Promise<{ status: string; mode: string }> {
  const res = await fetch(`${API_BASE}/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, resume }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchCollectStatus(): Promise<{
  running: boolean;
  last_run: string | null;
  output: string | null;
}> {
  return fetchApi('/collect/status');
}
