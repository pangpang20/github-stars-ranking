export interface Repo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  license: string | null;
  topics: string;
  created_at: string | null;
  pushed_at: string | null;
  fork: number;
  archived: number;
  open_issues: number;
  forks_count: number;
  watchers_count: number;
  default_branch: string;
  avatar_url: string | null;
  html_url: string | null;
  updated_at: string | null;
}

export interface StarSnapshot {
  repo_id: number;
  date: string;
  stars: number;
}

export interface Ranking {
  language: string;
  period: RankingPeriod;
  rank: number;
  repo_id: number;
  stars: number;
  delta: number;
  computed_at: string;
}

export interface TrackedRepo {
  repo_id: number;
  priority: number;
  discovered_at: string | null;
  last_polled: string | null;
}

export type RankingPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

export interface RankingQueryParams {
  language?: string;
  period?: RankingPeriod;
  page?: number;
  per_page?: number;
}

export interface RankingResult extends Ranking {
  full_name: string;
  description: string | null;
  language: string | null;
  avatar_url: string | null;
  html_url: string | null;
  forks_count: number;
  open_issues: number;
  star_history?: StarHistoryPoint[];
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    page: number;
    per_page: number;
    total: number;
    updated_at: string | null;
  };
}

export interface StarHistoryPoint {
  date: string;
  stars: number;
}

export interface RepoDetail extends Repo {
  star_history: StarHistoryPoint[];
  daily_delta: number;
  weekly_delta: number;
  monthly_delta: number;
}

export interface SearchParams {
  q: string;
  language?: string;
  page?: number;
  per_page?: number;
}

export interface Stats {
  total_repos: number;
  total_snapshots: number;
  last_update: string | null;
  languages_count: number;
}
