"""Claude Agent SDK wrapper — one session per conversation."""

from __future__ import annotations

import logging
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    query,
)

from aql_agent.config import Settings
from aql_agent.models import Message
from aql_agent.tools.custom import build_custom_server

logger = logging.getLogger(__name__)

# Path to .mcp.json in project root (for Playwright)
_MCP_JSON = Path(__file__).resolve().parents[2] / ".mcp.json"


class Agent:
    """Manages agent sessions keyed by conversation."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._sessions: dict[str, str] = {}  # conversation_key -> session_id
        self._custom_server = build_custom_server()

    def _build_mcp_servers(self) -> dict:
        """Build the MCP servers dict for the agent options."""
        servers: dict = {"aql-tools": self._custom_server}

        # Add Playwright from .mcp.json if it exists
        if _MCP_JSON.exists():
            servers["playwright"] = {
                "command": "npx",
                "args": ["@playwright/mcp", "--headless"],
            }

        return servers

    def _build_options(self, message: Message) -> ClaudeAgentOptions:
        """Build ClaudeAgentOptions, resuming session if one exists."""
        key = message.conversation_key
        session_id = self._sessions.get(key)

        opts = ClaudeAgentOptions(
            model=self._settings.model,
            system_prompt=self._settings.system_prompt,
            permission_mode="bypassPermissions",
            max_turns=self._settings.max_turns,
            mcp_servers=self._build_mcp_servers(),
            allowed_tools=[
                "mcp__aql-tools__get_system_info",
                "mcp__aql-tools__get_time",
                "mcp__playwright__*",
            ],
        )

        if session_id:
            opts.resume = session_id

        return opts

    async def get_reply(self, message: Message) -> str:
        """Send a message to Claude and return the reply text."""
        prompt = message.format_for_agent()
        opts = self._build_options(message)
        key = message.conversation_key

        reply_parts: list[str] = []

        try:
            async for msg in query(prompt=prompt, options=opts):
                # Capture session ID from init event
                if hasattr(msg, "subtype") and msg.subtype == "init":
                    sid = getattr(msg, "data", {})
                    if isinstance(sid, dict) and "session_id" in sid:
                        self._sessions[key] = sid["session_id"]

                # Capture session ID from result
                if hasattr(msg, "session_id") and msg.session_id:
                    self._sessions[key] = msg.session_id

                # Collect text from assistant messages
                if isinstance(msg, AssistantMessage):
                    for block in msg.content:
                        if isinstance(block, TextBlock):
                            reply_parts.append(block.text)

        except Exception:
            logger.exception("Agent query failed for %s", key)
            return "Sorry, something went wrong. Please try again."

        return "\n".join(reply_parts) if reply_parts else "I have nothing to say."
