import { restGet, type RepoInfo } from './github-api.js';
import { CONFIG } from './config.js';
import { getDb } from './db.js';
import * as cheerio from 'cheerio';

function ts(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

export interface DiscoveredRepo {
  owner: string;
  name: string;
  full_name: string;
  language?: string;
  stars: number;
  source: string;
}

// Load existing repo full_names from DB
function getExistingRepos(): Set<string> {
  const db = getDb();
  const rows = db.prepare('SELECT full_name FROM repos').all() as Array<{ full_name: string }>;
  return new Set(rows.map(r => r.full_name));
}

// Discover repos via GitHub Search API
export async function discoverBySearch(): Promise<DiscoveredRepo[]> {
  const repos: DiscoveredRepo[] = [];
  const seen = getExistingRepos();
  const beforeCount = seen.size;

  // Use "language:X is:public stars:>Y" format, skip already known repos
  const queries = [
    'is:public stars:>1000 sort:stars',
    'is:public stars:>500 sort:stars',
    'is:public stars:>100 pushed:>2025-01-01 sort:stars',
    'language:JavaScript is:public stars:>100 sort:stars',
    'language:Python is:public stars:>100 sort:stars',
    'language:TypeScript is:public stars:>100 sort:stars',
    'language:Java is:public stars:>100 sort:stars',
    'language:Go is:public stars:>100 sort:stars',
    'language:Rust is:public stars:>100 sort:stars',
    'language:C++ is:public stars:>100 sort:stars',
    'language:C# is:public stars:>100 sort:stars',
    'language:PHP is:public stars:>100 sort:stars',
    'language:Ruby is:public stars:>100 sort:stars',
    'language:Swift is:public stars:>100 sort:stars',
    'language:Kotlin is:public stars:>100 sort:stars',
    'language:Dart is:public stars:>100 sort:stars',
    'language:Shell is:public stars:>100 sort:stars',
    'language:Lua is:public stars:>50 sort:stars',
    'language:Zig is:public stars:>50 sort:stars',
    'language:Haskell is:public stars:>50 sort:stars',
    'language:Elixir is:public stars:>50 sort:stars',
    'language:Scala is:public stars:>50 sort:stars',
  ];

  console.log(`[${ts()}] Starting search discovery (${beforeCount} repos already in DB)...`);

  for (let qi = 0; qi < queries.length; qi++) {
    const q = queries[qi];
    let queryNew = 0;
    let querySkipped = 0;

    for (let page = 1; page <= CONFIG.maxSearchPages; page++) {
      try {
        const data = await restGet(
          `/search/repositories?q=${encodeURIComponent(q)}&per_page=${CONFIG.searchPerPage}&page=${page}`
        );

        if (!data?.items?.length) break;

        for (const item of data.items) {
          if (seen.has(item.full_name)) {
            querySkipped++;
            continue;
          }
          seen.add(item.full_name);

          repos.push({
            owner: item.owner.login,
            name: item.name,
            full_name: item.full_name,
            language: item.language,
            stars: item.stargazers_count,
            source: 'search',
          });
          queryNew++;
        }

        if (data.items.length < CONFIG.searchPerPage) break;
        await new Promise(r => setTimeout(r, CONFIG.discoveryDelay));
      } catch (err) {
        console.error(`[${ts()}] Search failed for query "${q}" page ${page}:`, err);
        break;
      }
    }

    console.log(`[${ts()}] Search [${qi + 1}/${queries.length}] "${q}" → +${queryNew} new, ${querySkipped} exist (total new: ${repos.length})`);
  }

  console.log(`[${ts()}] Search discovery done: ${repos.length} new repos found`);
  return repos;
}

// Discover repos from GitHub Trending page
export async function discoverByTrending(): Promise<DiscoveredRepo[]> {
  const repos: DiscoveredRepo[] = [];
  const seen = getExistingRepos();

  // Top languages only
  const languages = ['', 'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c', 'php', 'ruby', 'swift', 'kotlin'];

  console.log(`[${ts()}] Starting trending discovery (${seen.size} repos already in DB)...`);

  for (let li = 0; li < languages.length; li++) {
    const lang = languages[li];
    const url = lang
      ? `https://github.com/trending/${lang}?since=daily`
      : 'https://github.com/trending?since=daily';

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'github-stars-ranking' },
      });

      if (!res.ok) {
        console.warn(`[${ts()}] Trending page failed for ${lang || 'all'}: ${res.status}`);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      let langNew = 0;

      $('article.Box-row').each((_, el) => {
        const $el = $(el);
        const repoLink = $el.find('h2 a').attr('href')?.trim();
        if (!repoLink) return;

        const parts = repoLink.split('/').filter(Boolean);
        if (parts.length < 2) return;

        const owner = parts[0];
        const name = parts[1];
        const full_name = `${owner}/${name}`;

        if (seen.has(full_name)) return;
        seen.add(full_name);

        // Extract star count from the page
        const starText = $el.find('[class*="star"] a, [href$="/stargazers"]').last().text().trim();
        const stars = parseStarCount(starText);

        // Extract language
        const langText = $el.find('[itemprop="programmingLanguage"]').text().trim();

        repos.push({
          owner,
          name,
          full_name,
          language: langText || undefined,
          stars: stars || 0,
          source: 'trending',
        });
        langNew++;
      });

      console.log(`[${ts()}] Trending [${li + 1}/${languages.length}] ${lang || 'all'} → +${langNew} new (total: ${repos.length})`);

      await new Promise(r => setTimeout(r, CONFIG.trendingDelay));
    } catch (err) {
      console.error(`[${ts()}] Trending scrape failed for ${lang || 'all'}:`, err);
    }
  }

  console.log(`[${ts()}] Trending discovery done: ${repos.length} new repos found`);
  return repos;
}

function parseStarCount(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/([\d.]+)\s*([kKmM]?)/);
  if (!match) return 0;

  let num = parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();
  if (suffix === 'k') num *= 1000;
  if (suffix === 'm') num *= 1000000;

  return Math.round(num);
}

// Convert RepoInfo from API to our DiscoveredRepo format
export function repoInfoToDiscovered(info: RepoInfo, source: string): DiscoveredRepo {
  return {
    owner: info.owner,
    name: info.name,
    full_name: info.full_name,
    language: info.language || undefined,
    stars: info.stargazers_count,
    source,
  };
}
