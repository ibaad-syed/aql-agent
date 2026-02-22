#!/usr/bin/env bash
# One-shot setup for aql-agent on Raspberry Pi 5 (Debian/Ubuntu)
set -euo pipefail

REPO_DIR="${1:-/home/pi/aql-agent}"
echo "=== aql-agent installer ==="
echo "Install directory: $REPO_DIR"

# ── System dependencies ──────────────────────────────────────
echo "→ Updating packages…"
sudo apt-get update -qq
sudo apt-get install -y -qq git curl

# ── Node.js (for Playwright MCP) ─────────────────────────────
if ! command -v node &>/dev/null; then
    echo "→ Installing Node.js 20.x…"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
fi
echo "  Node.js $(node --version)"

# ── uv (Python package manager) ──────────────────────────────
if ! command -v uv &>/dev/null; then
    echo "→ Installing uv…"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi
echo "  uv $(uv --version)"

# ── Claude Code CLI (bundled with claude-agent-sdk) ──────────
if ! command -v claude &>/dev/null; then
    echo "→ Installing Claude Code CLI…"
    npm install -g @anthropic-ai/claude-code
fi
echo "  Claude CLI installed"

# ── Project setup ────────────────────────────────────────────
cd "$REPO_DIR"
echo "→ Installing Python dependencies…"
uv sync

# ── Playwright browsers ─────────────────────────────────────
echo "→ Installing Playwright browser (Chromium)…"
npx playwright install chromium
sudo npx playwright install-deps chromium

# ── .env file ────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo "→ Creating .env from example…"
    cp .env.example .env
    echo "  ⚠ Edit .env and add your ANTHROPIC_API_KEY before starting!"
fi

# ── systemd service ──────────────────────────────────────────
echo "→ Installing systemd service…"
sudo cp systemd/aql-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable aql-agent

echo ""
echo "=== Done! ==="
echo "1. Edit $REPO_DIR/.env with your API keys"
echo "2. Start with: sudo systemctl start aql-agent"
echo "3. Check logs: journalctl -u aql-agent -f"
