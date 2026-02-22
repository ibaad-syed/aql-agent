import "dotenv/config";

export interface Settings {
  anthropicApiKey: string;
  model: string;
  systemPrompt: string;
  maxSteps: number;
  enabledChannels: string[];
  slackBotToken?: string;
  slackAppToken?: string;
}

export function loadSettings(): Settings {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }

  return {
    anthropicApiKey: apiKey,
    model: process.env.AGENT_MODEL ?? "claude-sonnet-4-5-20250929",
    systemPrompt:
      process.env.AGENT_SYSTEM_PROMPT ??
      "You are a helpful AI assistant running on a Raspberry Pi.",
    maxSteps: parseInt(process.env.AGENT_MAX_TURNS ?? "25", 10),
    enabledChannels: (process.env.ENABLED_CHANNELS ?? "cli")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackAppToken: process.env.SLACK_APP_TOKEN,
  };
}
