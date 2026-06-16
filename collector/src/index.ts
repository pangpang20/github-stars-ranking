import { discoverBySearch, discoverByTrending } from './discovery.js';
import { snapshotRepos, snapshotStarCounts } from './snapshot.js';
import { computeRankings } from './rankings.js';
import { getDb, closeDb } from './db.js';

function ts(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'trending';
const resume = args.includes('--resume');

async function main() {
  console.log(`[${ts()}] Starting collection in ${mode} mode${resume ? ' (resume)' : ''}...`);

  const today = new Date().toISOString().split('T')[0];

  try {
    if (mode === 'trending') {
      if (resume) {
        console.log(`[${ts()}] --- Resume: Skipping discovery, using existing tracked repos ---`);
      } else {
        console.log(`[${ts()}] --- Phase 1: Discover repos ---`);
        const [searchRepos, trendingRepos] = await Promise.all([
          discoverBySearch(),
          discoverByTrending(),
        ]);

        // Merge and deduplicate
        const allRepos = [...searchRepos];
        const seen = new Set(allRepos.map(r => r.full_name));
        for (const repo of trendingRepos) {
          if (!seen.has(repo.full_name)) {
            allRepos.push(repo);
            seen.add(repo.full_name);
          }
        }
        console.log(`[${ts()}] Total unique new repos discovered: ${allRepos.length}`);

        console.log(`[${ts()}] --- Phase 2: Snapshot repo metadata ---`);
        await snapshotRepos(allRepos, today);
      }

      console.log(`[${ts()}] --- Phase 3: Snapshot star counts ---`);
      await snapshotStarCounts(today);

    } else if (mode === 'daily') {
      console.log(`[${ts()}] --- Phase 1: Snapshot all tracked repos ---`);
      await snapshotStarCounts(today);
    }

    console.log(`[${ts()}] --- Phase 4: Compute rankings ---`);
    computeRankings(today);

    // Print stats
    const db = getDb();
    const repoCount = (db.prepare('SELECT COUNT(*) as c FROM repos').get() as any).c;
    const snapshotCount = (db.prepare('SELECT COUNT(*) as c FROM star_snapshots').get() as any).c;
    const rankingCount = (db.prepare('SELECT COUNT(*) as c FROM rankings').get() as any).c;

    console.log(`\n[${ts()}] --- Collection Complete ---`);
    console.log(`[${ts()}] Repos tracked: ${repoCount}`);
    console.log(`[${ts()}] Star snapshots: ${snapshotCount}`);
    console.log(`[${ts()}] Ranking entries: ${rankingCount}`);

  } catch (err) {
    console.error(`[${ts()}] Collection failed:`, err);
    process.exit(1);
  } finally {
    closeDb();
  }
}

main();
