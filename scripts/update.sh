#!/usr/bin/env bash
# Auto-update aql-agent: pull latest commits, rebuild if changed, restart service.
set -euo pipefail

REPO_DIR="/home/ibpi/aql-agent"
cd "$REPO_DIR"

# Fetch latest from remote
git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "[update] new commits detected ($LOCAL -> $REMOTE)"
git pull --ff-only origin main

echo "[update] installing dependencies..."
npm install --silent

echo "[update] building..."
npm run build

echo "[update] restarting aql-agent service..."
sudo systemctl restart aql-agent

echo "[update] done"
