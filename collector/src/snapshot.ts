import { fetchStarCountBatch, fetchRepoInfo } from './github-api.js';
import { upsertRepo, upsertStarSnapshot, upsertTrackedRepo, getTrackedRepoIds, getDb } from './db.js';
import type { DiscoveredRepo } from './discovery.js';

function ts(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

export async function snapshotRepos(repos: DiscoveredRepo[], date: string): Promise<number> {
  console.log(`[${ts()}] Snapshotting ${repos.length} repos for ${date}...`);

  const db = getDb();

  // Find repos already processed today (updated_at = today)
  const alreadyDone = new Set<string>();
  const rows = db.prepare(
    "SELECT full_name FROM repos WHERE updated_at >= date('now', 'start of day')"
  ).all() as Array<{ full_name: string }>;
  for (const r of rows) alreadyDone.add(r.full_name);

  let upserted = 0;
  let skipped = 0;
  const total = repos.length;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];

    // Skip if already processed today
    if (alreadyDone.has(repo.full_name)) {
      skipped++;
      continue;
    }

    try {
      const info = await fetchRepoInfo(repo.owner, repo.name);

      const ownerObj = typeof info.owner === 'object' ? info.owner : null;
      upsertRepo({
        id: info.id,
        owner: ownerObj?.login || repo.owner,
        name: info.name,
        full_name: info.full_name,
        description: info.description,
        homepage: info.homepage,
        language: info.language,
        license: info.license?.spdx_id,
        topics: info.topics,
        created_at: info.created_at,
        pushed_at: info.pushed_at,
        fork: info.fork,
        archived: info.archived,
        open_issues: info.open_issues,
        forks_count: info.forks_count,
        watchers_count: info.watchers_count,
        default_branch: info.default_branch,
        avatar_url: ownerObj?.avatar_url,
        html_url: info.html_url,
      });

      upsertTrackedRepo(info.id, repo.source === 'trending' ? 1 : 0);
      upserted++;
    } catch (err) {
      console.error(`[${ts()}] Failed to upsert repo ${repo.full_name}:`, err);
    }

    // Progress every 50 repos
    if ((upserted + skipped) % 50 === 0 || i === total - 1) {
      console.log(`[${ts()}] Progress: ${upserted + skipped}/${total} (${upserted} done, ${skipped} skipped)`);
    }

    // Rate limit: small delay between REST calls
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[${ts()}] Upserted ${upserted} repo metadata entries (${skipped} skipped)`);
  return upserted;
}

export async function snapshotStarCounts(date: string): Promise<number> {
  const tracked = getTrackedRepoIds();
  if (tracked.length === 0) {
    console.log(`[${ts()}] No tracked repos to snapshot`);
    return 0;
  }

  const db = getDb();

  // Find repos that already have today's snapshot
  const existingSnapshots = new Set<number>();
  const snapshotRows = db.prepare(
    'SELECT repo_id FROM star_snapshots WHERE date = ?'
  ).all(date) as Array<{ repo_id: number }>;
  for (const r of snapshotRows) existingSnapshots.add(r.repo_id);

  // Filter out repos that already have today's snapshot
  const remaining = tracked.filter(t => !existingSnapshots.has(t.repo_id));
  const skippedCount = tracked.length - remaining.length;

  if (remaining.length === 0) {
    console.log(`[${ts()}] All ${tracked.length} repos already snapshotted for ${date}`);
    return 0;
  }

  console.log(`[${ts()}] Fetching star counts for ${remaining.length}/${tracked.length} repos (${skippedCount} already done)...`);

  const repoInfos = db.prepare('SELECT id, owner, name FROM repos').all() as Array<{
    id: number; owner: string; name: string;
  }>;

  const repoMap = new Map(repoInfos.map(r => [r.id, r]));
  const batch = remaining.map(t => {
    const repo = repoMap.get(t.repo_id);
    return repo ? { owner: repo.owner, name: repo.name, repoId: t.repo_id } : null;
  }).filter(Boolean) as Array<{ owner: string; name: string; repoId: number }>;

  // Process in batches of 50 (GraphQL limit)
  const BATCH_SIZE = 50;
  let snapshotCount = 0;

  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const chunk = batch.slice(i, i + BATCH_SIZE);
    const repoBatch = chunk.map(({ owner, name }) => ({ owner, name }));

    try {
      const starCounts = await fetchStarCountBatch(repoBatch);

      for (const { owner, name, repoId } of chunk) {
        const stars = starCounts.get(`${owner}/${name}`);
        if (stars !== undefined) {
          upsertStarSnapshot(repoId, date, stars);
          snapshotCount++;
        }
      }
    } catch (err) {
      console.error(`[${ts()}] Batch failed for repos ${i}-${i + chunk.length}:`, err);
    }

    console.log(`[${ts()}] Star snapshots: ${snapshotCount}/${remaining.length} (${Math.min(i + BATCH_SIZE, batch.length)}/${batch.length} batches)`);
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`[${ts()}] Snapshotted ${snapshotCount} star counts (${skippedCount} skipped)`);
  return snapshotCount;
}
