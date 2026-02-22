"""Abstract base for channel adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable

from aql_agent.models import Message

# Callback signature: async (message) -> reply_text
MessageHandler = Callable[[Message], Awaitable[str]]


class Channel(ABC):
    """Base class every channel adapter implements."""

    name: str  # e.g. "cli", "slack"

    def __init__(self) -> None:
        self._on_message: MessageHandler | None = None

    def on_message(self, handler: MessageHandler) -> None:
        """Register the handler that turns a Message into a reply string."""
        self._on_message = handler

    @abstractmethod
    async def start(self) -> None:
        """Begin listening for messages (blocks until stop)."""

    @abstractmethod
    async def stop(self) -> None:
        """Gracefully shut down the channel."""

    @abstractmethod
    async def send(self, recipient_id: str, text: str) -> None:
        """Send a message to a specific recipient."""
