# GitHub Stars Ranking

Real-time ranking of GitHub repositories by star growth. Discover trending projects across all programming languages.

## Features

- 🏆 **Daily/Weekly/Monthly Rankings** — Track star growth across all GitHub repos
- 🔍 **Real-time Search** — Search and filter by language, sort by stars or growth
- 📊 **Star History Charts** — Visualize star trends over time
- 🌐 **Multi-language Support** — Filter rankings by 20+ programming languages
- 🐳 **Docker Support** — One-command deployment with docker-compose
- ☁️ **Cloudflare Pages** — Deploy as a serverless app with D1 database
- 🤖 **GitHub Actions** — Automated data collection every 6 hours

## Quick Start

### Docker (Recommended)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env and add your GitHub tokens

# 2. Start
./scripts/start.sh

# 3. Access
open http://localhost:3000
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Build frontend
pnpm --filter frontend build

# Start server
pnpm --filter server start
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Actions  │     │ Cloudflare Pages │     │   Docker Host   │
│                 │     │                 │     │                 │
│  Data Collector │     │ Static Frontend │     │ Static Frontend │
│       │         │     │ + CF Functions  │     │ + Express API   │
│       ▼         │     │       ▼         │     │       ▼         │
│   GitHub API    │     │  Cloudflare D1  │     │  Local SQLite   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Project Structure

```
├── collector/          # Data collection (Node.js + GitHub API)
├── frontend/           # React SPA (Vite + Tailwind CSS)
├── server/             # Express.js API (Docker deployment)
├── functions/          # Cloudflare Pages Functions
├── shared/             # Database schema & shared types
├── docker/             # Dockerfiles
├── scripts/            # start.sh, stop.sh
└── .github/workflows/  # GitHub Actions
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rankings` | Get rankings (filter by language, period) |
| GET | `/api/repo/:owner/:name` | Get repo details with star history |
| GET | `/api/languages` | List all languages with counts |
| GET | `/api/search` | Search repositories |
| GET | `/api/stats` | Global statistics |

## Cloudflare Pages Deployment

### Prerequisites

1. Create a Cloudflare account
2. Create a D1 database in Cloudflare Dashboard
3. Get your Account ID and API Token

### Steps

1. **Create D1 Database:**
   ```bash
   npx wrangler d1 create github-stars
   ```
   Copy the `database_id` to `wrangler.toml`.

2. **Initialize Database Schema:**
   ```bash
   npx wrangler d1 execute github-stars --file=./shared/schema.sql
   ```

3. **Configure GitHub Secrets:**
   - `CF_API_TOKEN` — Cloudflare API token
   - `CF_ACCOUNT_ID` — Cloudflare account ID
   - `GH_TOKEN_1`, `GH_TOKEN_2` — GitHub personal access tokens

4. **Push to main** — GitHub Actions will deploy automatically.

### Local Development with Wrangler

```bash
# Install wrangler
npm install -g wrangler

# Run locally with D1
npx wrangler pages dev frontend/dist --d1=DB=github-stars
```

## GitHub Actions Setup

### Secrets Required

| Secret | Description |
|--------|-------------|
| `GH_TOKEN_1` | GitHub PAT (public_repo scope) |
| `GH_TOKEN_2` | (Optional) Additional GitHub PAT |
| `GH_TOKEN_3` | (Optional) Additional GitHub PAT |
| `CF_API_TOKEN` | (For CF Pages) Cloudflare API token |
| `CF_ACCOUNT_ID` | (For CF Pages) Cloudflare account ID |

### Workflows

- **collect-trending.yml** — Runs every 6 hours, discovers and snapshots trending repos
- **collect-daily.yml** — Runs daily at 03:00 UTC, full snapshot of all tracked repos
- **deploy-pages.yml** — Deploys frontend to Cloudflare Pages on push to main

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| State | TanStack Query (auto-caching, polling) |
| API (CF) | Cloudflare Pages Functions + D1 |
| API (Docker) | Express.js + better-sqlite3 |
| Collector | Node.js, GraphQL batch queries |
| Deploy | GitHub Actions, Docker, Cloudflare Pages |

## License

MIT
