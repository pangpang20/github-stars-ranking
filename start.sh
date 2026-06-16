#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

# Load .env file if exists
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

# GitHub tokens for API rate limit bypass (set in .env or environment)
if [ -z "${GH_TOKENS:-}" ]; then
  echo "WARNING: GH_TOKENS not set. Set it in .env or environment."
fi

# Resolve pnpm command — prefer global, fallback to npx
if command -v pnpm &>/dev/null; then
  PNPM="pnpm"
  echo "Using: pnpm (global)"
else
  PNPM="/usr/bin/npx pnpm"
  echo "Using: npx pnpm"
fi

# Kill any previous instances
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

echo "Starting server..."
cd "$ROOT/server"
nohup bash -c "$PNPM dev" > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo "  server PID: $SERVER_PID  (log: $LOG_DIR/server.log)"

echo "Starting frontend..."
cd "$ROOT/frontend"
nohup bash -c "$PNPM dev" > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  frontend PID: $FRONTEND_PID  (log: $LOG_DIR/frontend.log)"

# Wait briefly and verify processes are alive
sleep 3
RUNNING=0
kill -0 "$SERVER_PID" 2>/dev/null && { echo "  server is running."; RUNNING=$((RUNNING+1)); } || echo "  ERROR: server failed to start. Check $LOG_DIR/server.log"
kill -0 "$FRONTEND_PID" 2>/dev/null && { echo "  frontend is running."; RUNNING=$((RUNNING+1)); } || echo "  ERROR: frontend failed to start. Check $LOG_DIR/frontend.log"

if [ "$RUNNING" -eq 2 ]; then
  echo ""
  echo "All services started."
  echo "  Server:   http://0.0.0.0:3000"
  echo "  Frontend: http://0.0.0.0:5173"
else
  echo ""
  echo "Some services failed. Check logs in $LOG_DIR/"
fi
