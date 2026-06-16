import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/github-stars.db'),
  ghTokens: (process.env.GH_TOKENS || '').split(',').filter(Boolean),
  graphqlBatchSize: 50,
  searchPerPage: 100,
  maxSearchPages: 3,       // 3 pages * 100 per page = 300 results per query
  discoveryDelay: 2000,    // 2s between search API calls (30/min limit)
  trendingDelay: 1500,     // 1.5s between trending page scrapes
  rateLimitBuffer: 100,
};

export function getNextToken(tokens: string[], index: number): string {
  if (tokens.length === 0) return '';
  return tokens[index % tokens.length];
}
