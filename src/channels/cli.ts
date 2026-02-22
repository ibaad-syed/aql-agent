import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Channel } from "./base.js";
import { createMessage } from "../models.js";

export class CLIChannel extends Channel {
  private running = false;

  async start(): Promise<void> {
    this.running = true;
    const rl = createInterface({ input: stdin, output: stdout });

    console.log("CLI channel ready. Type a message (Ctrl+D to quit).");

    try {
      for await (const line of rl) {
        if (!this.running) break;
        const text = line.trim();
        if (!text) continue;

        const msg = createMessage({
          body: text,
          channel: "cli",
          senderId: "local",
          senderName: "You",
          chatType: "dm",
          groupId: "",
        });

        if (this.handler) {
          const reply = await this.handler(msg);
          console.log(`\n${reply}\n`);
        }
      }
    } catch {
      // EOF or readline closed
    } finally {
      rl.close();
    }
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  async send(_recipient: string, text: string): Promise<void> {
    console.log(text);
  }
}
