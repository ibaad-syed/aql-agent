export interface Message {
  body: string;
  channel: string;
  senderId: string;
  senderName: string;
  chatType: "dm" | "group";
  groupId: string;
  timestamp: Date;
  raw?: unknown;
}

export function createMessage(
  fields: Omit<Message, "timestamp"> & { timestamp?: Date },
): Message {
  return { timestamp: new Date(), ...fields };
}

export function conversationKey(msg: Message): string {
  const id = msg.chatType === "group" ? msg.groupId : msg.senderId;
  return `${msg.channel}:${id}`;
}

export function formatForAgent(msg: Message): string {
  const time = msg.timestamp.toISOString().slice(11, 16);
  return `[${msg.channel} ${msg.senderName} ${time}] ${msg.body}`;
}
