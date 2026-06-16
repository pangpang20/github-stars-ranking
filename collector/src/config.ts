import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/github-stars.db'),
  ghTokens: (process.env.GH_TOKENS || '').split(',').filter(Boolean),
  graphqlBatchSize: 50,
  searchPerPage: 100,
  maxSearchPages: 10,      // 10 pages * 100 per page = 1000 results per query
  discoveryDelay: 2500,    // 2.5s between search API calls
  trendingDelay: 1500,     // 1.5s between trending page scrapes
  rateLimitBuffer: 100,
};

export function getNextToken(tokens: string[], index: number): string {
  if (tokens.length === 0) return '';
  return tokens[index % tokens.length];
}
