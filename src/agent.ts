import { ToolLoopAgent, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Settings } from "./config.js";
import type { Message } from "./models.js";
import { conversationKey, formatForAgent } from "./models.js";

export class Agent {
  private agent: ToolLoopAgent;
  private conversations = new Map<string, ModelMessage[]>();

  constructor(settings: Settings, tools: ToolSet) {
    const anthropic = createAnthropic({ apiKey: settings.anthropicApiKey });

    this.agent = new ToolLoopAgent({
      model: anthropic(settings.model),
      instructions: settings.systemPrompt,
      tools,
      stopWhen: stepCountIs(settings.maxSteps),
    });
  }

  async getReply(message: Message): Promise<string> {
    const key = conversationKey(message);
    const history = this.conversations.get(key) ?? [];

    history.push({ role: "user", content: formatForAgent(message) });

    try {
      const result = await this.agent.generate({
        messages: history,
        onStepFinish({ text, toolCalls }) {
          if (toolCalls.length > 0) {
            const names = toolCalls.map((tc) => tc.toolName).join(", ");
            console.log(`[agent] tools called: ${names}`);
          }
        },
      });

      history.push(...result.response.messages);
      this.conversations.set(key, history);

      return result.text || "(no response)";
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[agent] error: ${errMsg}`);
      return `Sorry, something went wrong: ${errMsg}`;
    }
  }
}
