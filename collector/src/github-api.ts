import { CONFIG, getNextToken } from './config.js';

let tokenIndex = 0;

function getToken(): string {
  const token = getNextToken(CONFIG.ghTokens, tokenIndex);
  tokenIndex++;
  return token;
}

export async function graphqlQuery(query: string, variables?: Record<string, unknown>): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'github-stars-ranking',
  };
  if (token) {
    headers['Authorization'] = `bearer ${token}`;
  }

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
    console.warn(`Rate limited, waiting ${waitMs}ms...`);
    await sleep(waitMs);
    return graphqlQuery(query, variables);
  }

  if (!res.ok) {
    throw new Error(`GraphQL error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function restGet(path: string): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-stars-ranking',
  };
  if (token) {
    headers['Authorization'] = `bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com${path}`, { headers });

  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
    console.warn(`Rate limited, waiting ${waitMs}ms...`);
    await sleep(waitMs);
    return restGet(path);
  }

  if (!res.ok) {
    throw new Error(`REST error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export interface RepoInfo {
  id: number;
  owner: { login: string; avatar_url: string } | string;
  name: string;
  full_name: string;
  description: string;
  homepage: string;
  language: string;
  license: { spdx_id: string } | null;
  topics: string[];
  created_at: string;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  open_issues: number;
  forks_count: number;
  watchers_count: number;
  default_branch: string;
  html_url: string;
  stargazers_count: number;
}

export async function fetchRepoInfo(owner: string, name: string): Promise<RepoInfo> {
  return restGet(`/repos/${owner}/${name}`);
}

export async function fetchStarCountBatch(repos: Array<{ owner: string; name: string }>): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const batchSize = CONFIG.graphqlBatchSize;

  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const aliases = batch.map((repo, idx) => `
      r${idx}: repository(owner: "${repo.owner}", name: "${repo.name}") {
        stargazerCount
      }
    `).join('\n');

    const query = `{
      ${aliases}
      rateLimit {
        remaining
        resetAt
        cost
      }
    }`;

    try {
      const data = await graphqlQuery(query);
      if (data?.data) {
        batch.forEach((repo, idx) => {
          const key = `${repo.owner}/${repo.name}`;
          const repoData = data.data[`r${idx}`];
          if (repoData) {
            result.set(key, repoData.stargazerCount);
          }
        });
      }

      if (data?.data?.rateLimit?.remaining < CONFIG.rateLimitBuffer) {
        const resetAt = new Date(data.data.rateLimit.resetAt).getTime();
        const waitMs = Math.max(0, resetAt - Date.now()) + 1000;
        console.warn(`Rate limit low (${data.data.rateLimit.remaining}), waiting ${waitMs}ms...`);
        await sleep(waitMs);
      }
    } catch (err) {
      console.error(`Batch query failed for batch starting at ${i}:`, err);
    }

    // Small delay between batches
    if (i + batchSize < repos.length) {
      await sleep(100);
    }
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
