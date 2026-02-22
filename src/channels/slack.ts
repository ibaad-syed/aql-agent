import { App } from "@slack/bolt";
import { Channel } from "./base.js";
import { createMessage } from "../models.js";

interface SlackMessageEvent {
  user?: string;
  text?: string;
  channel: string;
  channel_type?: string;
  ts: string;
  bot_id?: string;
  subtype?: string;
}

export class SlackChannel extends Channel {
  private app: App;
  private botUserId = "";

  constructor(botToken: string, appToken: string) {
    super();
    this.app = new App({
      token: botToken,
      appToken,
      socketMode: true,
    });

    // DMs and multi-person IMs
    this.app.message(async ({ message, say }) => {
      await this.handleEvent(message as SlackMessageEvent, say, false);
    });

    // @mentions in channels
    this.app.event("app_mention", async ({ event, say }) => {
      await this.handleEvent(event as unknown as SlackMessageEvent, say, true);
    });
  }

  private async handleEvent(
    event: SlackMessageEvent,
    say: (opts: { text: string; thread_ts?: string }) => Promise<unknown>,
    isMention: boolean,
  ): Promise<void> {
    // Ignore bot's own messages and subtypes (edits, deletions, etc.)
    if (event.bot_id || event.subtype) return;
    if (event.user === this.botUserId) return;

    let text = event.text ?? "";
    // Strip bot mention from text
    if (isMention) {
      text = text.replace(new RegExp(`<@${this.botUserId}>`, "g"), "").trim();
    }
    if (!text) return;

    const isDM = event.channel_type === "im" || event.channel_type === "mpim";

    const msg = createMessage({
      body: text,
      channel: "slack",
      senderId: event.user ?? "unknown",
      senderName: event.user ?? "unknown",
      chatType: isDM ? "dm" : "group",
      groupId: isDM ? "" : event.channel,
      raw: event,
    });

    if (!this.handler) return;

    const reply = await this.handler(msg);

    // In channels, reply in thread; in DMs, reply directly
    if (isDM) {
      await say({ text: reply });
    } else {
      await say({ text: reply, thread_ts: event.ts });
    }
  }

  async start(): Promise<void> {
    await this.app.start();
    // Fetch bot user ID
    const auth = await this.app.client.auth.test();
    this.botUserId = (auth.user_id as string) ?? "";
    console.log(`[slack] connected as <@${this.botUserId}>`);
  }

  async stop(): Promise<void> {
    await this.app.stop();
  }

  async send(channelId: string, text: string): Promise<void> {
    await this.app.client.chat.postMessage({ channel: channelId, text });
  }
}
