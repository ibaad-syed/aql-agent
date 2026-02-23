import { tool } from "ai";
import { z } from "zod";
import { hostname, platform, arch, uptime, totalmem, freemem } from "node:os";

export const systemInfoTool = tool({
  description: "Get system information about the host machine",
  inputSchema: z.object({}),
  execute: async () => ({
    hostname: hostname(),
    platform: platform(),
    architecture: arch(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(uptime()),
    totalMemoryMB: Math.floor(totalmem() / 1024 / 1024),
    freeMemoryMB: Math.floor(freemem() / 1024 / 1024),
  }),
});
