import type { Message } from "../models.js";

export type MessageHandler = (message: Message) => Promise<string>;

export abstract class Channel {
  protected handler?: MessageHandler;

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract send(recipient: string, text: string): Promise<void>;
}
