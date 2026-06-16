# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub Stars Ranking — a real-time ranking system that tracks GitHub repository star growth across 20+ programming languages. Supports two deployment modes: Docker (self-hosted with SQLite) and Cloudflare Pages (serverless with D1).

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start frontend dev server (Vite on port 5173, proxies `/api` to `:3000`) |
| `pnpm dev:server` | Start Express server in watch mode |
| `pnpm dev:all` | Run both server and frontend concurrently |
| `pnpm build` | Build frontend (Vite) then server (tsc) |
| `pnpm collect:trending` | Run collector in trending discovery mode |
| `pnpm collect:daily` | Run collector in daily snapshot mode |
| `pnpm start` | `docker-compose up -d --build` |
| `pnpm stop` | `docker-compose down` |

No test runner, linter, or formatter is configured.

## Architecture

### Monorepo Layout (pnpm workspaces)

- **frontend/** — React 18 SPA (Vite 5, Tailwind CSS 3, Recharts, TanStack Query v5, react-router-dom v6)
- **server/** — Express.js API + static file serving (better-sqlite3, read-only DB access)
- **collector/** — GitHub data collection engine (GraphQL batch queries, Cheerio scraping, cron-scheduled)
- **shared/** — SQLite/D1 schema (`schema.sql`), TypeScript interfaces (`types.ts`), constants (`constants.ts`)

### Data Flow

**Docker mode:** Collector → SQLite DB → Express Server → Browser (static frontend served by Express)

**Cloudflare mode:** GitHub Actions → Collector → D1 → Cloudflare Pages Functions → Browser

### Collector Pipeline (`collector/src/`)

1. **discovery.ts** — Two parallel discovery strategies: GitHub Search API (17 queries per language) + scraping `github.com/trending` with Cheerio
2. **snapshot.ts** — Fetches repo metadata via REST, star counts via GraphQL (50 repos/batch with aliased fields), token rotation (round-robin)
3. **rankings.ts** — Computes rankings by comparing current vs. past snapshots (1d/7d/30d deltas) using SQL window functions (`ROW_NUMBER() OVER`)

### API Endpoints (identical in Express and Cloudflare Functions)

| Path | Description |
|------|-------------|
| `GET /api/rankings?language=&period=&page=&per_page=` | Paginated rankings by language/period |
| `GET /api/repo/:owner/:name?days=` | Repo detail with star history and growth deltas |
| `GET /api/languages` | All languages with repo counts |
| `GET /api/search?q=&language=&page=&per_page=` | Full-text search |
| `GET /api/stats` | Global stats (total repos, snapshots, languages, last update) |

### Database Schema (`shared/schema.sql`)

Four tables: `repos` (metadata), `star_snapshots` (daily star counts, PK: repo_id+date), `rankings` (pre-computed, PK: language+period+rank, cleared and recomputed each run), `tracked_repos` (polling list with priority).

### Frontend Routes

`/` (Home), `/rankings`, `/repo/:owner/:name`, `/search`, `/languages`

## Key Design Decisions

- All packages use ESM (`"type": "module"`). TypeScript target: ES2022, module: ESNext, resolution: bundler.
- Server opens SQLite in **read-only mode** (WAL journaling); collector opens read-write. Both share the same volume in Docker.
- Collector runs on cron: trending every 6 hours, daily at 3am. In Docker via `dcron`; in Cloudflare via GitHub Actions schedules.
- Token rotation is round-robin across `GH_TOKENS` (comma-separated env var). No persistence of token index across restarts.
- The frontend `frontend/src/lib/types.ts` duplicates `shared/types.ts` rather than importing from it (slight divergence exists).
- Cloudflare Functions use a catch-all route handler (`functions/api/[[route]].ts`) with manual URL dispatch.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GH_TOKENS` | (none) | Comma-separated GitHub PATs for API auth |
| `DB_PATH` | `/app/data/github-stars.db` | SQLite database path |
| `PORT` | `3000` | Server port |

## TypeScript Configuration

- `tsconfig.base.json` at root defines shared compiler options (ES2022, ESNext module, strict, bundler resolution)
- Each package extends the base config
- Frontend uses path alias `@/*` → `./src/*`
