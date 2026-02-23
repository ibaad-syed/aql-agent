import { tool } from "ai";
import { z } from "zod";

export const getTimeTool = tool({
  description: "Get the current date and time in UTC",
  inputSchema: z.object({}),
  execute: async () => ({
    utc: new Date().toISOString(),
  }),
});
