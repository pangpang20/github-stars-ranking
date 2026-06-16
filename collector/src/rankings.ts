import { getDb } from './db.js';

export function computeRankings(date: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  console.log('Computing rankings...');

  // Get all languages
  const languages = db.prepare(
    "SELECT DISTINCT language FROM repos WHERE language IS NOT NULL AND language != ''"
  ).all() as Array<{ language: string }>;

  const allLanguages = ['all', ...languages.map(l => l.language)];
  const periods = ['daily', 'weekly', 'monthly', 'alltime'] as const;

  // Clear old rankings
  db.prepare('DELETE FROM rankings').run();

  for (const language of allLanguages) {
    for (const period of periods) {
      const deltaDays = period === 'daily' ? 1
        : period === 'weekly' ? 7
        : period === 'monthly' ? 30
        : 0;

      let query: string;
      let params: any[];

      if (language === 'all') {
        if (deltaDays === 0) {
          // All-time: rank by current stars
          query = `
            INSERT INTO rankings (language, period, rank, repo_id, stars, delta, computed_at)
            SELECT
              'all', 'alltime',
              ROW_NUMBER() OVER (ORDER BY ss.stars DESC),
              ss.repo_id, ss.stars, 0, ?
            FROM star_snapshots ss
            WHERE ss.date = ?
            ORDER BY ss.stars DESC
            LIMIT 1000
          `;
          params = [now, date];
        } else {
          // Compare current stars with closest available past date
          const targetPastDate = getDateNDaysAgo(date, deltaDays);
          const pastDate = findClosestSnapshotDate(db, targetPastDate) || targetPastDate;
          query = `
            INSERT INTO rankings (language, period, rank, repo_id, stars, delta, computed_at)
            SELECT
              'all', ?,
              ROW_NUMBER() OVER (ORDER BY (ss_curr.stars - COALESCE(ss_past.stars, 0)) DESC),
              ss_curr.repo_id, ss_curr.stars,
              ss_curr.stars - COALESCE(ss_past.stars, 0), ?
            FROM star_snapshots ss_curr
            LEFT JOIN star_snapshots ss_past ON ss_curr.repo_id = ss_past.repo_id AND ss_past.date = ?
            WHERE ss_curr.date = ?
            ORDER BY (ss_curr.stars - COALESCE(ss_past.stars, 0)) DESC
            LIMIT 1000
          `;
          params = [period, now, pastDate, date];
        }
      } else {
        if (deltaDays === 0) {
          query = `
            INSERT INTO rankings (language, period, rank, repo_id, stars, delta, computed_at)
            SELECT
              ?, 'alltime',
              ROW_NUMBER() OVER (ORDER BY ss.stars DESC),
              ss.repo_id, ss.stars, 0, ?
            FROM star_snapshots ss
            JOIN repos r ON r.id = ss.repo_id
            WHERE ss.date = ? AND r.language = ?
            ORDER BY ss.stars DESC
            LIMIT 1000
          `;
          params = [language, now, date, language];
        } else {
          const targetPastDate = getDateNDaysAgo(date, deltaDays);
          const pastDate = findClosestSnapshotDate(db, targetPastDate) || targetPastDate;
          query = `
            INSERT INTO rankings (language, period, rank, repo_id, stars, delta, computed_at)
            SELECT
              ?, ?,
              ROW_NUMBER() OVER (ORDER BY (ss_curr.stars - COALESCE(ss_past.stars, 0)) DESC),
              ss_curr.repo_id, ss_curr.stars,
              ss_curr.stars - COALESCE(ss_past.stars, 0), ?
            FROM star_snapshots ss_curr
            LEFT JOIN star_snapshots ss_past ON ss_curr.repo_id = ss_past.repo_id AND ss_past.date = ?
            JOIN repos r ON r.id = ss_curr.repo_id
            WHERE ss_curr.date = ? AND r.language = ?
            ORDER BY (ss_curr.stars - COALESCE(ss_past.stars, 0)) DESC
            LIMIT 1000
          `;
          params = [language, period, now, pastDate, date, language];
        }
      }

      try {
        db.prepare(query).run(...params);
      } catch (err) {
        console.error(`Failed to compute rankings for ${language}/${period}:`, err);
      }
    }
  }

  const count = (db.prepare('SELECT COUNT(*) as c FROM rankings').get() as any).c;
  console.log(`Computed ${count} ranking entries`);
}

function getDateNDaysAgo(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Find the closest available snapshot date to the target date
function findClosestSnapshotDate(db: any, targetDate: string): string | null {
  // Try on or before first
  const before = db.prepare(
    'SELECT date FROM star_snapshots WHERE date <= ? ORDER BY date DESC LIMIT 1'
  ).get(targetDate) as any;
  if (before?.date) return before.date;

  // Fallback to earliest available
  const earliest = db.prepare(
    'SELECT date FROM star_snapshots ORDER BY date ASC LIMIT 1'
  ).get() as any;
  return earliest?.date || null;
}
