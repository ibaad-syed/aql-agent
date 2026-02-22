import { loadSettings, type Settings } from "./config.js";
import { Agent } from "./agent.js";
import { startHeartbeat } from "./health.js";
import { CLIChannel } from "./channels/cli.js";
import { SlackChannel } from "./channels/slack.js";
import type { Channel } from "./channels/base.js";

function buildChannels(settings: Settings): Channel[] {
  const channels: Channel[] = [];

  for (const name of settings.enabledChannels) {
    switch (name) {
      case "cli":
        channels.push(new CLIChannel());
        break;
      case "slack": {
        if (!settings.slackBotToken || !settings.slackAppToken) {
          throw new Error("Slack channel requires SLACK_BOT_TOKEN and SLACK_APP_TOKEN");
        }
        channels.push(new SlackChannel(settings.slackBotToken, settings.slackAppToken));
        break;
      }
      default:
        console.warn(`[main] unknown channel: ${name}`);
    }
  }

  return channels;
}

async function main(): Promise<void> {
  const settings = loadSettings();
  console.log(`[main] starting aql-agent (model: ${settings.model})`);

  const agent = new Agent(settings);
  await agent.initialize();

  const channels = buildChannels(settings);
  for (const ch of channels) {
    ch.onMessage((msg) => agent.getReply(msg));
  }

  const heartbeat = startHeartbeat(settings.enabledChannels);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[main] shutting down...");
    clearInterval(heartbeat);
    await Promise.all(channels.map((ch) => ch.stop()));
    await agent.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start all channels concurrently
  await Promise.all(channels.map((ch) => ch.start()));
}

main().catch((err) => {
  console.error("[main] fatal:", err);
  process.exit(1);
});
