import { anthropic } from "@ai-sdk/anthropic";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  renameSync,
  existsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { execFile } from "node:child_process";

const MEMORY_DIR = resolve(process.cwd(), "data", "memories");
mkdirSync(MEMORY_DIR, { recursive: true });

function memPath(p: string): string {
  return resolve(MEMORY_DIR, p);
}

type MemoryInput =
  | { command: "view"; path: string; view_range?: [number, number] }
  | { command: "create"; path: string; file_text: string }
  | { command: "str_replace"; path: string; old_str: string; new_str: string }
  | { command: "insert"; path: string; insert_line: number; insert_text: string }
  | { command: "delete"; path: string }
  | { command: "rename"; old_path: string; new_path: string };

function executeMemory(input: MemoryInput): string {
  switch (input.command) {
    case "view": {
      const fp = memPath(input.path);
      if (!existsSync(fp)) return `Error: file not found: ${input.path}`;
      const lines = readFileSync(fp, "utf-8").split("\n");
      if (input.view_range) {
        const [start, end] = input.view_range;
        return lines.slice(start - 1, end).join("\n");
      }
      return lines.join("\n");
    }
    case "create": {
      const fp = memPath(input.path);
      mkdirSync(dirname(fp), { recursive: true });
      writeFileSync(fp, input.file_text, "utf-8");
      return `Created ${input.path}`;
    }
    case "str_replace": {
      const fp = memPath(input.path);
      if (!existsSync(fp)) return `Error: file not found: ${input.path}`;
      const content = readFileSync(fp, "utf-8");
      if (!content.includes(input.old_str))
        return `Error: old_str not found in ${input.path}`;
      writeFileSync(fp, content.replace(input.old_str, input.new_str), "utf-8");
      return `Replaced in ${input.path}`;
    }
    case "insert": {
      const fp = memPath(input.path);
      if (!existsSync(fp)) return `Error: file not found: ${input.path}`;
      const lines = readFileSync(fp, "utf-8").split("\n");
      lines.splice(input.insert_line, 0, input.insert_text);
      writeFileSync(fp, lines.join("\n"), "utf-8");
      return `Inserted at line ${input.insert_line} in ${input.path}`;
    }
    case "delete": {
      const fp = memPath(input.path);
      if (!existsSync(fp)) return `Error: file not found: ${input.path}`;
      unlinkSync(fp);
      return `Deleted ${input.path}`;
    }
    case "rename": {
      const oldFp = memPath(input.old_path);
      const newFp = memPath(input.new_path);
      if (!existsSync(oldFp)) return `Error: file not found: ${input.old_path}`;
      mkdirSync(dirname(newFp), { recursive: true });
      renameSync(oldFp, newFp);
      return `Renamed ${input.old_path} → ${input.new_path}`;
    }
  }
}

export const anthropicTools = {
  webSearch: anthropic.tools.webSearch_20250305(),
  webFetch: anthropic.tools.webFetch_20250910(),
  bash: anthropic.tools.bash_20250124({
    execute: async ({ command, restart }) => {
      if (restart) return "Shell restarted.";
      if (!command) return "Error: no command provided.";
      return new Promise((resolve) => {
        execFile("bash", ["-c", command], {
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
          env: { ...process.env, HOME: process.env.HOME ?? "/home/ibpi" },
        }, (err, stdout, stderr) => {
          const parts: string[] = [];
          if (stdout) parts.push(stdout);
          if (stderr) parts.push(`STDERR:\n${stderr}`);
          if (err && !stderr) parts.push(`Error: ${err.message}`);
          resolve(parts.join("\n") || "(no output)");
        });
      });
    },
  }),
  memory: anthropic.tools.memory_20250818({
    execute: async (input) => executeMemory(input as MemoryInput),
  }),
};
