# GitHub Stars Ranking

GitHub 仓库星标增长实时排行榜，发现各编程语言的热门项目。

[English](#english) | 中文

## ✨ 功能特性

- 🏆 **实时排行榜** — 按日/周/月/总排行，追踪星标增长
- 🔍 **多语言筛选** — 支持 20+ 编程语言，树形分类，多选对比
- 📊 **增长趋势图** — 仓库详情展示星标历史曲线
- 🔄 **断点续采** — 采集器支持中断恢复，跳过已处理数据
- 📝 **实时日志** — SSE 推送采集进度，终端风格展示
- 🌗 **主题切换** — 浅色/深色模式，自动保存偏好
- 🐳 **Docker 部署** — 一键启动，开箱即用
- ☁️ **Cloudflare Pages** — 无服务器部署，全球 CDN

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm (或 npm/npx)

### 安装运行

```bash
# 1. 克隆仓库
git clone git@github.com:pangpang20/github-stars-ranking.git
cd github-stars-ranking

# 2. 配置 GitHub Token
cp .env.example .env
# 编辑 .env，填入你的 GitHub Token（至少一个）
# GH_TOKENS=ghp_xxxxxxxxxxxx

# 3. 启动服务
./start.sh

# 4. 访问
# 前端: http://localhost:5173
# API:  http://localhost:3000
```

### 停止服务

```bash
./stop.sh
```

## 📐 架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Collector   │     │   Frontend   │     │    Server    │
│  GitHub API   │     │  React + Vite │     │   Express    │
│  Trending     │     │  Tailwind CSS │     │  SQLite (RO) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
                    ┌──────────────┐
                    │   SQLite DB  │
                    │  github-stars│
                    └──────────────┘
```

## 📁 项目结构

```
├── collector/          # 数据采集器（GitHub API + 爬虫）
├── frontend/           # React SPA（Vite + Tailwind CSS）
├── server/             # Express.js API 服务
├── shared/             # 数据库 Schema & 共享类型
├── functions/          # Cloudflare Pages Functions
├── docker/             # Dockerfile
├── start.sh            # 启动脚本
├── stop.sh             # 停止脚本
└── .env.example        # 环境变量模板
```

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/rankings` | 排行榜（支持语言、周期筛选） |
| GET | `/api/repo/:owner/:name` | 仓库详情（星标历史、增长数据） |
| GET | `/api/languages` | 语言列表及仓库数量 |
| GET | `/api/search` | 搜索仓库 |
| GET | `/api/stats` | 全局统计 |
| POST | `/api/collect` | 触发数据采集 |
| GET | `/api/collect/status` | 采集状态查询 |
| GET | `/api/collect/logs` | 采集日志（SSE） |

## ⚙️ 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `GH_TOKENS` | GitHub Token（逗号分隔，支持轮询） | 无 |
| `DB_PATH` | SQLite 数据库路径 | `./data/github-stars.db` |
| `PORT` | 服务端口 | `3000` |

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18, Vite 5, Tailwind CSS 3, Recharts |
| 状态管理 | TanStack Query v5 |
| API 服务 | Express.js, better-sqlite3 |
| 采集器 | Node.js, Cheerio, GraphQL |
| 部署 | Docker, Cloudflare Pages, GitHub Actions |

## 📄 开源协议

MIT

---

<a id="english"></a>

# GitHub Stars Ranking

Real-time ranking of GitHub repositories by star growth. Discover trending projects across all programming languages.

## Features

- 🏆 **Real-time Rankings** — Daily/Weekly/Monthly/All-time star growth tracking
- 🔍 **Multi-language Filter** — 20+ languages with tree view and multi-select
- 📊 **Growth Charts** — Star history visualization for each repo
- 🔄 **Checkpoint Resume** — Interrupted collection resumes from last checkpoint
- 📝 **Live Logs** — Real-time collection progress via SSE
- 🌗 **Theme Toggle** — Light/dark mode with auto-save
- 🐳 **Docker Ready** — One-command deployment
- ☁️ **Cloudflare Pages** — Serverless deployment with global CDN

## Quick Start

```bash
# Clone and configure
git clone git@github.com:pangpang20/github-stars-ranking.git
cd github-stars-ranking
cp .env.example .env
# Add your GitHub tokens to .env

# Start
./start.sh

# Access
# Frontend: http://localhost:5173
# API: http://localhost:3000
```

## License

MIT
