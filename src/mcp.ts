import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpJsonFile {
  mcpServers: Record<string, McpServerConfig>;
}

export interface MCPHandle {
  clients: MCPClient[];
  shutdown: () => Promise<void>;
}

export async function loadMCPClients(): Promise<MCPHandle> {
  const clients: MCPClient[] = [];

  const mcpPath = resolve(process.cwd(), ".mcp.json");
  if (!existsSync(mcpPath)) {
    return { clients, shutdown: async () => {} };
  }

  const mcpJson: McpJsonFile = JSON.parse(readFileSync(mcpPath, "utf-8"));

  for (const [name, server] of Object.entries(mcpJson.mcpServers)) {
    console.log(`[mcp] connecting server: ${name}`);
    const transport = new Experimental_StdioMCPTransport({
      command: server.command,
      args: server.args,
      env: {
        ...(process.env as Record<string, string>),
        ...(server.env ?? {}),
      },
    });
    const client = await createMCPClient({ transport, name });
    clients.push(client);
  }

  const shutdown = async () => {
    for (const client of clients) {
      await client.close().catch(() => {});
    }
  };

  return { clients, shutdown };
}
