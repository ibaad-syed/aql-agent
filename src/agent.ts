import { generateText, stepCountIs, type ModelMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Settings } from "./config.js";
import type { Message } from "./models.js";
import { conversationKey, formatForAgent } from "./models.js";
import { customTools } from "./tools/custom.js";

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpJsonFile {
  mcpServers: Record<string, McpServerConfig>;
}

export class Agent {
  private model;
  private settings: Settings;
  private conversations = new Map<string, ModelMessage[]>();
  private mcpClients: MCPClient[] = [];

  constructor(settings: Settings) {
    this.settings = settings;
    const anthropic = createAnthropic({ apiKey: settings.anthropicApiKey });
    this.model = anthropic(settings.model);
  }

  async initialize(): Promise<void> {
    const mcpPath = resolve(process.cwd(), ".mcp.json");
    if (!existsSync(mcpPath)) return;

    const mcpJson: McpJsonFile = JSON.parse(
      readFileSync(mcpPath, "utf-8"),
    );

    for (const [name, server] of Object.entries(mcpJson.mcpServers)) {
      console.log(`[agent] connecting MCP server: ${name}`);
      const transport = new Experimental_StdioMCPTransport({
        command: server.command,
        args: server.args,
        env: { ...process.env as Record<string, string>, ...(server.env ?? {}) },
      });
      const client = await createMCPClient({ transport, name });
      this.mcpClients.push(client);
    }
  }

  async shutdown(): Promise<void> {
    for (const client of this.mcpClients) {
      await client.close().catch(() => {});
    }
    this.mcpClients = [];
  }

  async getReply(message: Message): Promise<string> {
    const key = conversationKey(message);
    const history = this.conversations.get(key) ?? [];

    history.push({ role: "user", content: formatForAgent(message) });

    // Merge custom tools with MCP tools
    let allTools: Record<string, any> = { ...customTools };
    for (const client of this.mcpClients) {
      const mcpTools = await client.tools();
      allTools = { ...allTools, ...mcpTools };
    }

    try {
      const result = await generateText({
        model: this.model,
        system: this.settings.systemPrompt,
        messages: history,
        tools: allTools,
        stopWhen: stepCountIs(this.settings.maxSteps),
      });

      // Append the response messages to conversation history
      history.push(...result.response.messages);
      this.conversations.set(key, history);

      return result.text || "(no response)";
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.error(`[agent] error: ${errMsg}`);
      return `Sorry, something went wrong: ${errMsg}`;
    }
  }
}
