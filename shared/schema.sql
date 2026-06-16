-- GitHub Stars Ranking Database Schema
-- Compatible with both SQLite (Docker) and Cloudflare D1

-- Core repository metadata
CREATE TABLE IF NOT EXISTS repos (
    id              INTEGER PRIMARY KEY,
    owner           TEXT NOT NULL,
    name            TEXT NOT NULL,
    full_name       TEXT NOT NULL UNIQUE,
    description     TEXT,
    homepage        TEXT,
    language        TEXT,
    license         TEXT,
    topics          TEXT DEFAULT '[]',
    created_at      TEXT,
    pushed_at       TEXT,
    fork            INTEGER DEFAULT 0,
    archived        INTEGER DEFAULT 0,
    open_issues     INTEGER DEFAULT 0,
    forks_count     INTEGER DEFAULT 0,
    watchers_count  INTEGER DEFAULT 0,
    default_branch  TEXT DEFAULT 'main',
    avatar_url      TEXT,
    html_url        TEXT,
    updated_at      TEXT
);

-- Daily star snapshots
CREATE TABLE IF NOT EXISTS star_snapshots (
    repo_id         INTEGER NOT NULL,
    date            TEXT NOT NULL,
    stars           INTEGER NOT NULL,
    PRIMARY KEY (repo_id, date),
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

-- Pre-computed rankings for fast queries
CREATE TABLE IF NOT EXISTS rankings (
    language        TEXT NOT NULL,
    period          TEXT NOT NULL,
    rank            INTEGER NOT NULL,
    repo_id         INTEGER NOT NULL,
    stars           INTEGER NOT NULL,
    delta           INTEGER NOT NULL,
    computed_at     TEXT NOT NULL,
    PRIMARY KEY (language, period, rank)
);

-- Tracking list
CREATE TABLE IF NOT EXISTS tracked_repos (
    repo_id         INTEGER PRIMARY KEY,
    priority        INTEGER DEFAULT 0,
    discovered_at   TEXT,
    last_polled     TEXT,
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON star_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_snapshots_repo ON star_snapshots(repo_id, date);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repos(language);
CREATE INDEX IF NOT EXISTS idx_repos_stars ON repos(id);
CREATE INDEX IF NOT EXISTS idx_rankings_lookup ON rankings(language, period, rank);
CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repos(full_name);
