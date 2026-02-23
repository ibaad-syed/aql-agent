# CLAUDE.md

## Project Overview

aql-agent is a TypeScript AI agent for Raspberry Pi 5. It uses the Vercel AI SDK v6 with Claude (Anthropic) and supports CLI + Slack channels.

## Commands

- `npm run dev` -- run from source with tsx
- `npm run build` -- compile TypeScript to `dist/` and copy `system-prompt.txt`
- `npm start` -- run compiled `dist/index.js`

## Architecture

**Startup flow** (`src/index.ts`):
1. `loadSettings()` reads `.env` + `src/system-prompt.txt`
2. `loadMCPClients()` reads `.mcp.json`, connects MCP servers via stdio
3. MCP tools are merged with built-in `toolSet` from `src/tools/index.ts`
4. `Agent` is constructed with settings + merged tools
5. Channels are built and started, each calling `agent.getReply(msg)`

**Agent** (`src/agent.ts`):
- Wraps `ToolLoopAgent` from AI SDK v6
- Holds a `Map<string, ModelMessage[]>` for per-conversation history
- Key is `channel:senderId` for DMs, `channel:groupId` for groups
- `getReply()` appends user message, calls `agent.generate()`, appends response

**Tools** (`src/tools/`):
- `system-info.ts` -- `get_system_info`: hostname, platform, arch, node version, uptime, memory
- `get-time.ts` -- `get_time`: current UTC ISO timestamp
- `anthropic.ts` -- Anthropic provider tools:
  - `webSearch` -- server-side web search (zero-config)
  - `webFetch` -- server-side web page fetch (zero-config)
  - `codeExecution` -- server-side sandboxed Python/Bash (zero-config)
  - `memory` -- client-side file storage in `data/memories/` (has `execute` callback)
- `index.ts` -- barrel that merges all tools into `toolSet`

**MCP** (`src/mcp.ts`):
- Reads `.mcp.json` from project root
- Connects each server via `Experimental_StdioMCPTransport`
- Returns `{ clients, shutdown }` handle
- Currently configured with Playwright MCP (`@playwright/mcp --headless`)

**Channels** (`src/channels/`):
- `base.ts` -- abstract `Channel` with `onMessage()`, `start()`, `stop()`, `send()`
- `cli.ts` -- readline-based interactive channel
- `slack.ts` -- Slack socket mode, handles DMs, mentions, and thread replies

**Config** (`src/config.ts`):
- Loads env vars via `dotenv/config`
- System prompt loaded from `src/system-prompt.txt` (resolved via `import.meta.url`)
- Build step copies `system-prompt.txt` to `dist/`

## Key Patterns

- ES modules throughout (`"type": "module"` in package.json, `Node16` module resolution)
- All local imports use `.js` extension (required by Node16 ESM)
- `ToolLoopAgent` handles the tool-calling loop; agent just manages conversations
- Anthropic provider tools (webSearch, webFetch, codeExecution) are server-side -- Anthropic executes them, no local config needed
- Memory tool is client-side -- requires an `execute` callback implementing file ops
- MCP servers are defined in `.mcp.json`, not in source code

## File Layout

```
src/
  index.ts              Entry point, wiring
  agent.ts              ToolLoopAgent + conversation map
  config.ts             Settings from .env + system-prompt.txt
  models.ts             Message type, conversationKey(), formatForAgent()
  health.ts             5-minute heartbeat timer
  system-prompt.txt     System prompt (plain text)
  mcp.ts                MCP client loader
  tools/
    index.ts            Barrel export (toolSet)
    system-info.ts      get_system_info
    get-time.ts         get_time
    anthropic.ts        webSearch, webFetch, codeExecution, memory
  channels/
    base.ts             Abstract Channel
    cli.ts              CLI channel
    slack.ts            Slack channel
scripts/
  install.sh            One-shot Pi setup
  update.sh             Git pull + rebuild + restart
systemd/
  aql-agent.service     Main service unit
  aql-agent-update.*    Auto-update service + timer
```

## Platform Notes

- Target: Raspberry Pi 5 (aarch64, Debian)
- Node.js 20.x
- Playwright MCP uses system Chromium (`/usr/bin/chromium`) via `--executable-path` to avoid version mismatch with npx-cached playwright-core
- Memory files stored in `data/memories/` (gitignored)
- Agent runs as systemd service under user `ibpi`
