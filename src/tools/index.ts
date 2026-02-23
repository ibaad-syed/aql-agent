import { systemInfoTool } from "./system-info.js";
import { getTimeTool } from "./get-time.js";
import { anthropicTools } from "./anthropic.js";

export const toolSet = {
  get_system_info: systemInfoTool,
  get_time: getTimeTool,
  ...anthropicTools,
};
