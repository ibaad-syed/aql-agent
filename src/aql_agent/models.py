"""Normalized message format shared across all channels."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class Message:
    body: str
    channel: str  # "cli", "slack", "whatsapp"
    sender_id: str
    sender_name: str = ""
    chat_type: str = "dm"  # "dm" or "group"
    group_id: str = ""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    raw: Any = None  # Original event from the channel library

    @property
    def conversation_key(self) -> str:
        """Key used to look up the agent session for this conversation."""
        if self.chat_type == "group" and self.group_id:
            return f"{self.channel}:{self.group_id}"
        return f"{self.channel}:{self.sender_id}"

    def format_for_agent(self) -> str:
        """Envelope string sent to the agent as context."""
        time_str = self.timestamp.strftime("%H:%M")
        name = self.sender_name or self.sender_id
        return f"[{self.channel} {name} {time_str}] {self.body}"
