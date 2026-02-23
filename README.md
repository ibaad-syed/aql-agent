# aql-agent

Lightweight AI agent for Raspberry Pi 5. Uses Claude via the Vercel AI SDK with multi-channel support (CLI and Slack), tool calling, and MCP integration.

## Features

- **Multi-channel** -- CLI for local use, Slack for remote access (socket mode)
- **Tool calling** -- built-in tools (system info, time) plus Anthropic provider tools (web search, web fetch, code execution, memory)
- **MCP support** -- connects to MCP servers defined in `.mcp.json` (ships with Playwright for browser automation)
- **Conversation history** -- per-channel, per-user message history
- **Auto-update** -- systemd timer pulls from git, rebuilds, and restarts every 5 minutes
- **Runs headless** -- designed for always-on Pi deployment as a systemd service

## Quick Start

```bash
git clone https://github.com/ibaad-syed/aql-agent.git
cd aql-agent
bash scripts/install.sh
```

Edit `.env` with your API keys, then:

```bash
# Run interactively
npm run dev

# Or start as a service
sudo systemctl start aql-agent
```

## Configuration

### Environment Variables (`.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | -- | Anthropic API key |
| `AGENT_MODEL` | No | `claude-sonnet-4-5-20250929` | Claude model ID |
| `AGENT_MAX_TURNS` | No | `25` | Max tool-calling steps per reply |
| `ENABLED_CHANNELS` | No | `cli` | Comma-separated: `cli`, `slack` |
| `SLACK_BOT_TOKEN` | If Slack | -- | Slack bot token (`xoxb-...`) |
| `SLACK_APP_TOKEN` | If Slack | -- | Slack app token (`xapp-...`) |

### System Prompt

Edit `src/system-prompt.txt` (plain text, multi-line). Rebuild after changes.

### MCP Servers (`.mcp.json`)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp", "--headless", "--executable-path", "/usr/bin/chromium"]
    }
  }
}
```

Add or remove MCP servers here. Each gets its tools merged into the agent automatically.

## Development

```bash
npm run dev      # Run with tsx (live TypeScript)
npm run build    # Compile to dist/
npm start        # Run compiled output
```

### Project Structure

```
src/
  index.ts              Entry point -- loads MCP, builds channels, wires shutdown
  agent.ts              ToolLoopAgent wrapper with conversation history
  config.ts             Loads .env and system-prompt.txt
  models.ts             Message type and helpers
  health.ts             Heartbeat logger (5-min interval)
  system-prompt.txt     System prompt (plain text)
  mcp.ts                MCP client loader (reads .mcp.json)
  tools/
    index.ts            Barrel -- merges all tools into one toolSet
    system-info.ts      get_system_info (hostname, arch, memory, uptime)
    get-time.ts         get_time (current UTC time)
    anthropic.ts        Anthropic provider tools (web search, web fetch, code exec, memory)
  channels/
    base.ts             Abstract Channel class
    cli.ts              Interactive readline channel
    slack.ts            Slack socket-mode channel
```

### Adding a Tool

Create `src/tools/my-tool.ts`:

```ts
import { tool } from "ai";
import { z } from "zod";

export const myTool = tool({
  description: "Does something useful",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ result: query.toUpperCase() }),
});
```

Add it to `src/tools/index.ts`:

```ts
import { myTool } from "./my-tool.js";

export const toolSet = {
  // ...existing tools
  my_tool: myTool,
};
```

### Adding a Channel

Extend the `Channel` abstract class in `src/channels/base.ts`, implement `start()`, `stop()`, and `send()`. Register it in `buildChannels()` in `src/index.ts`.

## Deployment

### systemd

The installer sets up three systemd units:

- `aql-agent.service` -- main agent process
- `aql-agent-update.service` -- pulls git, rebuilds, restarts
- `aql-agent-update.timer` -- triggers update check every 5 minutes

```bash
sudo systemctl status aql-agent
journalctl -u aql-agent -f          # live logs
journalctl -u aql-agent-update -f   # update logs
```

### Raspberry Pi Notes

- **Playwright**: The bundled Chromium from `npx playwright install` may get out of sync with `@playwright/mcp`'s playwright-core version. The `.mcp.json` points at system Chromium (`/usr/bin/chromium`) to avoid this.
- **Memory**: The agent's memory tool stores files in `data/memories/` (gitignored). These persist across restarts.

## Runtime Data

| Path | Purpose | Gitignored |
|---|---|---|
| `data/memories/` | Agent memory tool storage | Yes |
| `dist/` | Compiled JS output | Yes |
| `.env` | Secrets and settings | Yes |
