// Cloudflare Pages Functions - catch-all API handler

import type { PagesFunction } from '@cloudflare/workers-types';
import {
  handleRankings,
  handleRepo,
  handleLanguages,
  handleSearch,
  handleStats,
} from './_helpers';

interface Env {
  DB: D1Database;
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');

  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const db = context.env.DB;

    // Route: /api/rankings
    if (path === 'rankings' || path.startsWith('rankings/')) {
      const result = await handleRankings(db, url.searchParams);
      return jsonResponse(result);
    }

    // Route: /api/repo/:owner/:name
    if (path.startsWith('repo/')) {
      const parts = path.replace('repo/', '').split('/');
      if (parts.length >= 2) {
        const result = await handleRepo(db, parts[0], parts[1], url.searchParams);
        if (!result) {
          return jsonResponse({ error: 'Repository not found' }, 404);
        }
        return jsonResponse({ data: result });
      }
    }

    // Route: /api/languages
    if (path === 'languages') {
      const result = await handleLanguages(db);
      return jsonResponse({ data: result });
    }

    // Route: /api/search
    if (path === 'search') {
      const result = await handleSearch(db, url.searchParams);
      return jsonResponse(result);
    }

    // Route: /api/stats
    if (path === 'stats') {
      const result = await handleStats(db);
      return jsonResponse({ data: result });
    }

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (err: any) {
    console.error('API error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
};
