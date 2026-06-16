// Shared API handler logic for Cloudflare Pages Functions

import type { D1Database } from '@cloudflare/workers-types';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function handleRankings(db: D1Database, params: URLSearchParams) {
  const language = params.get('language') || 'all';
  const period = params.get('period') || 'monthly';
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(params.get('per_page') || String(DEFAULT_PAGE_SIZE))));
  const offset = (page - 1) * perPage;

  const rows = await db.prepare(`
    SELECT r.language, r.period, r.rank, r.repo_id, r.stars, r.delta, r.computed_at,
           repos.full_name, repos.description, repos.language as repo_language,
           repos.avatar_url, repos.html_url, repos.forks_count, repos.open_issues
    FROM rankings r
    JOIN repos ON r.repo_id = repos.id
    WHERE r.language = ? AND r.period = ?
    ORDER BY r.rank
    LIMIT ? OFFSET ?
  `).bind(language, period, perPage, offset).all();

  const totalRow = await db.prepare(
    'SELECT COUNT(*) as c FROM rankings WHERE language = ? AND period = ?'
  ).bind(language, period).first() as any;

  const updatedRow = await db.prepare(
    'SELECT MAX(computed_at) as t FROM rankings WHERE language = ? AND period = ?'
  ).bind(language, period).first() as any;

  return {
    data: rows.results || [],
    meta: {
      page,
      per_page: perPage,
      total: totalRow?.c || 0,
      updated_at: updatedRow?.t || null,
    },
  };
}

export async function handleRepo(db: D1Database, owner: string, name: string, params: URLSearchParams) {
  const fullName = `${owner}/${name}`;
  const days = Math.min(365, parseInt(params.get('days') || '90'));

  const repo = await db.prepare('SELECT * FROM repos WHERE full_name = ?')
    .bind(fullName).first() as any;

  if (!repo) {
    return null;
  }

  const starHistory = await db.prepare(`
    SELECT date, stars FROM star_snapshots
    WHERE repo_id = ?
    ORDER BY date DESC
    LIMIT ?
  `).bind(repo.id, days).all();

  // Get deltas
  const today = new Date().toISOString().split('T')[0];
  const getDelta = async (daysAgo: number) => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysAgo);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    const current = await db.prepare(
      'SELECT stars FROM star_snapshots WHERE repo_id = ? AND date = ?'
    ).bind(repo.id, today).first() as any;
    const past = await db.prepare(
      'SELECT stars FROM star_snapshots WHERE repo_id = ? AND date = ?'
    ).bind(repo.id, pastDateStr).first() as any;

    if (!current || !past) return 0;
    return current.stars - past.stars;
  };

  return {
    ...repo,
    fork: !!repo.fork,
    archived: !!repo.archived,
    topics: repo.topics ? JSON.parse(repo.topics) : [],
    star_history: (starHistory.results || []).reverse(),
    daily_delta: await getDelta(1),
    weekly_delta: await getDelta(7),
    monthly_delta: await getDelta(30),
  };
}

export async function handleLanguages(db: D1Database) {
  const rows = await db.prepare(`
    SELECT language, COUNT(*) as count
    FROM repos
    WHERE language IS NOT NULL AND language != ''
    GROUP BY language
    ORDER BY count DESC
  `).all();

  return rows.results || [];
}

export async function handleSearch(db: D1Database, params: URLSearchParams) {
  const q = params.get('q') || '';
  const language = params.get('language') || '';
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(params.get('per_page') || String(DEFAULT_PAGE_SIZE))));
  const offset = (page - 1) * perPage;

  if (!q.trim()) {
    return { data: [], meta: { page, per_page: perPage, total: 0, updated_at: null } };
  }

  const searchTerm = `%${q}%`;
  let query = `SELECT * FROM repos WHERE (full_name LIKE ? OR description LIKE ?)`;
  const binds: any[] = [searchTerm, searchTerm];

  if (language) {
    query += ' AND language = ?';
    binds.push(language);
  }

  query += ' ORDER BY watchers_count DESC LIMIT ? OFFSET ?';
  binds.push(perPage, offset);

  const rows = await db.prepare(query).bind(...binds).all();

  // Count
  let countQuery = `SELECT COUNT(*) as c FROM repos WHERE (full_name LIKE ? OR description LIKE ?)`;
  const countBinds: any[] = [searchTerm, searchTerm];
  if (language) {
    countQuery += ' AND language = ?';
    countBinds.push(language);
  }
  const totalRow = await db.prepare(countQuery).bind(...countBinds).first() as any;

  return {
    data: (rows.results || []).map((r: any) => ({ ...r, fork: !!r.fork, archived: !!r.archived })),
    meta: {
      page,
      per_page: perPage,
      total: totalRow?.c || 0,
      updated_at: null,
    },
  };
}

export async function handleStats(db: D1Database) {
  const repoCount = (await db.prepare('SELECT COUNT(*) as c FROM repos').first() as any)?.c || 0;
  const snapshotCount = (await db.prepare('SELECT COUNT(*) as c FROM star_snapshots').first() as any)?.c || 0;
  const lastUpdate = (await db.prepare('SELECT MAX(computed_at) as t FROM rankings').first() as any)?.t || null;
  const langCount = (await db.prepare("SELECT COUNT(DISTINCT language) as c FROM repos WHERE language IS NOT NULL AND language != ''").first() as any)?.c || 0;

  return {
    total_repos: repoCount,
    total_snapshots: snapshotCount,
    last_update: lastUpdate,
    languages_count: langCount,
  };
}
