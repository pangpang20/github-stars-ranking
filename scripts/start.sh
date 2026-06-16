#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check for .env
if [ ! -f .env ]; then
  echo "Warning: .env file not found."
  echo "Copy .env.example to .env and add your GitHub tokens:"
  echo "  cp .env.example .env"
  echo ""
  echo "Continuing without authentication (rate limited to 60 requests/hour)..."
  echo ""
fi

echo "========================================="
echo "  GitHub Stars Ranking"
echo "========================================="
echo ""

# Build and start
echo "Building and starting services..."
docker-compose up -d --build

echo ""
echo "========================================="
echo "  Services Started!"
echo "========================================="
echo ""
echo "  Frontend + API: http://localhost:${PORT:-3000}"
echo ""
echo "  Useful commands:"
echo "    View logs:           docker-compose logs -f"
echo "    Trigger collection:  docker-compose exec collector pnpm --filter collector run collect:trending"
echo "    Stop services:       ./scripts/stop.sh"
echo ""
