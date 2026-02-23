import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Settings {
  anthropicApiKey: string;
  model: string;
  systemPrompt: string;
  maxSteps: number;
  enabledChannels: string[];
  slackBotToken?: string;
  slackAppToken?: string;
}

function loadSystemPrompt(): string {
  const promptPath = resolve(__dirname, "system-prompt.txt");
  return readFileSync(promptPath, "utf-8").trim();
}

export function loadSettings(): Settings {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }

  return {
    anthropicApiKey: apiKey,
    model: process.env.AGENT_MODEL ?? "claude-sonnet-4-5-20250929",
    systemPrompt: loadSystemPrompt(),
    maxSteps: parseInt(process.env.AGENT_MAX_TURNS ?? "25", 10),
    enabledChannels: (process.env.ENABLED_CHANNELS ?? "cli")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackAppToken: process.env.SLACK_APP_TOKEN,
  };
}
