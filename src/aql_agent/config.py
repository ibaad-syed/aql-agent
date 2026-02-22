"""Settings loaded from environment / .env file."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


def _load_env() -> None:
    """Load .env from project root if present."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(env_path)


@dataclass(frozen=True)
class Settings:
    # Anthropic
    anthropic_api_key: str

    # Agent
    model: str = "claude-sonnet-4-5-20250929"
    system_prompt: str = "You are a helpful AI assistant running on a Raspberry Pi."
    max_turns: int = 25

    # Channels
    enabled_channels: list[str] = field(default_factory=lambda: ["cli"])

    # Slack (optional)
    slack_bot_token: str = ""
    slack_app_token: str = ""

    @classmethod
    def from_env(cls) -> Settings:
        _load_env()
        channels_raw = os.getenv("ENABLED_CHANNELS", "cli")
        channels = [c.strip() for c in channels_raw.split(",") if c.strip()]

        return cls(
            anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
            model=os.getenv("AGENT_MODEL", cls.model),
            system_prompt=os.getenv("AGENT_SYSTEM_PROMPT", cls.system_prompt),
            max_turns=int(os.getenv("AGENT_MAX_TURNS", str(cls.max_turns))),
            enabled_channels=channels,
            slack_bot_token=os.getenv("SLACK_BOT_TOKEN", ""),
            slack_app_token=os.getenv("SLACK_APP_TOKEN", ""),
        )
