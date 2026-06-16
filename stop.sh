#!/usr/bin/env bash
set -euo pipefail

echo "Stopping server..."
pkill -f "tsx watch src/index.ts" 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null && echo "  stopped." || echo "  not running."

echo "Stopping frontend..."
pkill -f "vite" 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null && echo "  stopped." || echo "  not running."

echo "All services stopped."
