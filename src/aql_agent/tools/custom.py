"""In-process MCP tools — lightweight utilities the agent can call."""

from __future__ import annotations

import platform
from datetime import datetime, timezone
from typing import Any

from claude_agent_sdk import create_sdk_mcp_server, tool


@tool(
    "get_system_info",
    "Get system information (OS, architecture, hostname, Python version)",
    {},
)
async def get_system_info(args: dict[str, Any]) -> dict[str, Any]:
    info = (
        f"Hostname: {platform.node()}\n"
        f"OS: {platform.system()} {platform.release()}\n"
        f"Arch: {platform.machine()}\n"
        f"Python: {platform.python_version()}"
    )
    return {"content": [{"type": "text", "text": info}]}


@tool(
    "get_time",
    "Get the current date and time in UTC",
    {},
)
async def get_time(args: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return {"content": [{"type": "text", "text": now}]}


def build_custom_server():
    """Create the in-process MCP server with all custom tools."""
    return create_sdk_mcp_server(
        name="aql-tools",
        version="0.1.0",
        tools=[get_system_info, get_time],
    )
