import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../shared/constants.js';
import type { RankingResult, ApiResponse, RepoDetail, Stats } from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COLLECTOR_DIR = path.join(__dirname, '../../collector');

const router = Router();

// Track collector status
let collectorRunning = false;
let collectorChild: ReturnType<typeof spawn> | null = null;
let collectorLastRun: string | null = null;
let collectorLastOutput: string | null = null;

// Log buffer for SSE streaming
const MAX_LOG_LINES = 1000;
const logBuffer: Array<{ time: string; text: string }> = [];
const sseClients = new Set<Response>();

function broadcastLog(text: string) {
  const entry = { time: new Date().toISOString(), text };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
  for (const client of sseClients) {
    try {
      client.write(`data: ${JSON.stringify(entry)}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// GET /api/rankings
router.get('/rankings', (req: Request, res: Response) => {
  const db = getDb();
  const language = (req.query.language as string) || 'all';
  const period = (req.query.period as string) || 'monthly';
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.per_page as string) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * perPage;

  try {
    const rows = db.prepare(`
      SELECT r.language, r.period, r.rank, r.repo_id, r.stars, r.delta, r.computed_at,
             repos.full_name, repos.description, repos.language as repo_language,
             repos.avatar_url, repos.html_url, repos.forks_count, repos.open_issues
      FROM rankings r
      JOIN repos ON r.repo_id = repos.id
      WHERE r.language = ? AND r.period = ?
      ORDER BY r.rank
      LIMIT ? OFFSET ?
    `).all(language, period, perPage, offset) as RankingResult[];

    const totalRow = db.prepare(
      'SELECT COUNT(*) as c FROM rankings WHERE language = ? AND period = ?'
    ).get(language, period) as { c: number };

    const updatedRow = db.prepare(
      'SELECT MAX(computed_at) as t FROM rankings WHERE language = ? AND period = ?'
    ).get(language, period) as { t: string | null };

    const response: ApiResponse<RankingResult[]> = {
      data: rows,
      meta: {
        page,
        per_page: perPage,
        total: totalRow.c,
        updated_at: updatedRow.t,
      },
    };

    res.json(response);
  } catch (err) {
    console.error('Rankings query failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/repo/:owner/:name
router.get('/repo/:owner/:name', (req: Request, res: Response) => {
  const db = getDb();
  const fullName = `${req.params.owner}/${req.params.name}`;

  try {
    const repo = db.prepare('SELECT * FROM repos WHERE full_name = ?').get(fullName) as any;
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get star history (last 90 days)
    const days = Math.min(365, parseInt(req.query.days as string) || 90);
    const starHistory = db.prepare(`
      SELECT date, stars FROM star_snapshots
      WHERE repo_id = ? AND date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `).all(repo.id, days) as Array<{ date: string; stars: number }>;

    // Get deltas
    const today = new Date().toISOString().split('T')[0];
    const getDelta = (daysAgo: number): number => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - daysAgo);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const current = db.prepare(
        'SELECT stars FROM star_snapshots WHERE repo_id = ? AND date = ?'
      ).get(repo.id, today) as any;
      const past = db.prepare(
        'SELECT stars FROM star_snapshots WHERE repo_id = ? AND date = ?'
      ).get(repo.id, pastDateStr) as any;

      if (!current || !past) return 0;
      return current.stars - past.stars;
    };

    const detail: RepoDetail = {
      ...repo,
      fork: !!repo.fork,
      archived: !!repo.archived,
      topics: repo.topics ? JSON.parse(repo.topics) : [],
      star_history: starHistory,
      daily_delta: getDelta(1),
      weekly_delta: getDelta(7),
      monthly_delta: getDelta(30),
    };

    res.json({ data: detail });
  } catch (err) {
    console.error('Repo query failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/languages
router.get('/languages', (_req: Request, res: Response) => {
  const db = getDb();

  try {
    const languages = db.prepare(`
      SELECT language, COUNT(*) as count
      FROM repos
      WHERE language IS NOT NULL AND language != ''
      GROUP BY language
      ORDER BY count DESC
    `).all() as Array<{ language: string; count: number }>;

    res.json({ data: languages });
  } catch (err) {
    console.error('Languages query failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/search
router.get('/search', (req: Request, res: Response) => {
  const db = getDb();
  const q = (req.query.q as string) || '';
  const language = req.query.language as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.per_page as string) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * perPage;

  if (!q.trim()) {
    return res.json({ data: [], meta: { page, per_page: perPage, total: 0, updated_at: null } });
  }

  try {
    const searchTerm = `%${q}%`;
    let query = `
      SELECT * FROM repos
      WHERE (full_name LIKE ? OR description LIKE ?)
    `;
    const params: any[] = [searchTerm, searchTerm];

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    query += ' ORDER BY watchers_count DESC LIMIT ? OFFSET ?';
    params.push(perPage, offset);

    const rows = db.prepare(query).all(...params);

    // Count total
    let countQuery = `
      SELECT COUNT(*) as c FROM repos
      WHERE (full_name LIKE ? OR description LIKE ?)
    `;
    const countParams: any[] = [searchTerm, searchTerm];
    if (language) {
      countQuery += ' AND language = ?';
      countParams.push(language);
    }
    const totalRow = db.prepare(countQuery).get(...countParams) as { c: number };

    const response: ApiResponse<any[]> = {
      data: rows.map((r: any) => ({ ...r, fork: !!r.fork, archived: !!r.archived })),
      meta: {
        page,
        per_page: perPage,
        total: totalRow.c,
        updated_at: null,
      },
    };

    res.json(response);
  } catch (err) {
    console.error('Search query failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats
router.get('/stats', (_req: Request, res: Response) => {
  const db = getDb();

  try {
    const repoCount = (db.prepare('SELECT COUNT(*) as c FROM repos').get() as any).c;
    const snapshotCount = (db.prepare('SELECT COUNT(*) as c FROM star_snapshots').get() as any).c;
    const lastUpdate = (db.prepare('SELECT MAX(computed_at) as t FROM rankings').get() as any).t;
    const langCount = (db.prepare("SELECT COUNT(DISTINCT language) as c FROM repos WHERE language IS NOT NULL AND language != ''").get() as any).c;

    const stats: Stats = {
      total_repos: repoCount,
      total_snapshots: snapshotCount,
      last_update: lastUpdate,
      languages_count: langCount,
    };

    res.json({ data: stats });
  } catch (err) {
    console.error('Stats query failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/collect
router.post('/collect', (req: Request, res: Response) => {
  if (collectorRunning) {
    return res.status(409).json({ error: 'Collection already in progress' });
  }

  const mode = (req.body?.mode as string) || 'trending';
  const resume = req.body?.resume === true;
  if (!['trending', 'daily'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode. Use "trending" or "daily".' });
  }

  collectorRunning = true;
  collectorLastOutput = null;
  logBuffer.length = 0;

  broadcastLog(`=== Starting ${mode} collection${resume ? ' (resume)' : ''} ===`);

  // Use tsx directly for reliable arg passing
  const child = spawn('npx', ['tsx', 'src/index.ts', `--mode=${mode}`, ...(resume ? ['--resume'] : [])], {
    cwd: COLLECTOR_DIR,
    env: {
      ...process.env,
      DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../data/github-stars.db'),
    },
    shell: true,
  });

  collectorChild = child;
  let output = '';

  child.stdout.on('data', (data: Buffer) => {
    const text = data.toString();
    output += text;
    for (const line of text.split('\n').filter(l => l.trim())) {
      broadcastLog(line);
    }
    console.log(`[collector] ${text.trimEnd()}`);
  });

  child.stderr.on('data', (data: Buffer) => {
    const text = data.toString();
    output += text;
    for (const line of text.split('\n').filter(l => l.trim())) {
      broadcastLog(line);
    }
    console.error(`[collector] ${text.trimEnd()}`);
  });

  child.on('close', (code: number | null) => {
    collectorRunning = false;
    collectorChild = null;
    collectorLastRun = new Date().toISOString();
    collectorLastOutput = output;
    broadcastLog(`=== Finished with exit code ${code} ===`);
    console.log(`[collector] Finished with exit code ${code}`);
  });

  child.on('error', (err: Error) => {
    collectorRunning = false;
    collectorLastRun = new Date().toISOString();
    collectorLastOutput = `Error: ${err.message}`;
    broadcastLog(`ERROR: ${err.message}`);
    console.error(`[collector] Failed to start:`, err);
  });

  res.json({ status: 'started', mode });
});

// GET /api/collect/status
router.get('/collect/status', (_req: Request, res: Response) => {
  // Check if the process is actually alive
  let actuallyRunning = collectorRunning;
  if (collectorRunning && collectorChild) {
    try {
      // kill -0 checks if process exists without sending a signal
      process.kill(collectorChild.pid!, 0);
    } catch {
      actuallyRunning = false;
      collectorRunning = false;
      collectorChild = null;
      collectorLastRun = new Date().toISOString();
    }
  }

  res.json({
    running: actuallyRunning,
    last_run: collectorLastRun,
    output: collectorLastOutput,
  });
});

// GET /api/collect/logs — SSE stream
router.get('/collect/logs', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send buffer history first
  for (const entry of logBuffer) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

export default router;
