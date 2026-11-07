#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
fi
if [ ! -f apps/frontend/.env.local ]; then
  cp .env.example apps/frontend/.env.local
fi

if [ ! -d node_modules ]; then
  npm install
fi

# Avoid EADDRINUSE from leftover Nest/Next processes on 3847/3848
free_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti ":${port}" | xargs -r kill -9 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
  fi
}
free_port 3847
free_port 3848
pkill -9 -f "nest start --watch" 2>/dev/null || true
pkill -9 -f "next dev -p 3847" 2>/dev/null || true
sleep 1

npm run build -w @small-web/shared
npm run seed
npm run dev
