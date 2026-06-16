import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.dirname(CONFIG.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(CONFIG.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  const schemaPath = path.join(__dirname, '../../shared/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function upsertRepo(repo: {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description?: string;
  homepage?: string;
  language?: string;
  license?: string;
  topics?: string[];
  created_at?: string;
  pushed_at?: string;
  fork?: boolean;
  archived?: boolean;
  open_issues?: number;
  forks_count?: number;
  watchers_count?: number;
  default_branch?: string;
  avatar_url?: string;
  html_url?: string;
}): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO repos (id, owner, name, full_name, description, homepage, language, license, topics,
      created_at, pushed_at, fork, archived, open_issues, forks_count, watchers_count,
      default_branch, avatar_url, html_url, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      description = COALESCE(excluded.description, repos.description),
      homepage = COALESCE(excluded.homepage, repos.homepage),
      language = COALESCE(excluded.language, repos.language),
      license = COALESCE(excluded.license, repos.license),
      topics = COALESCE(excluded.topics, repos.topics),
      pushed_at = COALESCE(excluded.pushed_at, repos.pushed_at),
      fork = excluded.fork,
      archived = excluded.archived,
      open_issues = excluded.open_issues,
      forks_count = excluded.forks_count,
      watchers_count = excluded.watchers_count,
      default_branch = COALESCE(excluded.default_branch, repos.default_branch),
      avatar_url = COALESCE(excluded.avatar_url, repos.avatar_url),
      html_url = COALESCE(excluded.html_url, repos.html_url),
      updated_at = excluded.updated_at
  `).run(
    repo.id, repo.owner, repo.name, repo.full_name,
    repo.description || null, repo.homepage || null, repo.language || null,
    repo.license || null, JSON.stringify(repo.topics || []),
    repo.created_at || null, repo.pushed_at || null,
    repo.fork ? 1 : 0, repo.archived ? 1 : 0,
    repo.open_issues || 0, repo.forks_count || 0, repo.watchers_count || 0,
    repo.default_branch || 'main', repo.avatar_url || null, repo.html_url || null,
    now
  );
}

export function upsertStarSnapshot(repoId: number, date: string, stars: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO star_snapshots (repo_id, date, stars)
    VALUES (?, ?, ?)
    ON CONFLICT(repo_id, date) DO UPDATE SET stars = excluded.stars
  `).run(repoId, date, stars);
}

export function upsertTrackedRepo(repoId: number, priority: number = 0): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tracked_repos (repo_id, priority, discovered_at, last_polled)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(repo_id) DO UPDATE SET
      priority = MAX(tracked_repos.priority, excluded.priority),
      last_polled = excluded.last_polled
  `).run(repoId, priority, now, now);
}

export function getTrackedRepoIds(): Array<{ repo_id: number; priority: number }> {
  const db = getDb();
  return db.prepare('SELECT repo_id, priority FROM tracked_repos ORDER BY priority DESC, repo_id').all() as any[];
}

export function getStarSnapshot(repoId: number, date: string): number | null {
  const db = getDb();
  const row = db.prepare('SELECT stars FROM star_snapshots WHERE repo_id = ? AND date = ?').get(repoId, date) as any;
  return row?.stars ?? null;
}

export function getRepoIdByFullName(fullName: string): number | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM repos WHERE full_name = ?').get(fullName) as any;
  return row?.id ?? null;
}
