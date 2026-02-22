"""CLI channel — stdin/stdout for local testing."""

from __future__ import annotations

import asyncio
import sys

from aql_agent.channels.base import Channel
from aql_agent.models import Message


class CLIChannel(Channel):
    name = "cli"

    def __init__(self) -> None:
        super().__init__()
        self._running = False

    async def start(self) -> None:
        self._running = True
        print("aql-agent CLI ready. Type a message (Ctrl+C to quit).\n")

        loop = asyncio.get_running_loop()
        while self._running:
            try:
                line = await loop.run_in_executor(None, self._read_line)
            except EOFError:
                break

            if line is None:
                break

            text = line.strip()
            if not text:
                continue

            msg = Message(
                body=text,
                channel=self.name,
                sender_id="cli-user",
                sender_name="You",
            )

            if self._on_message:
                reply = await self._on_message(msg)
                await self.send("cli-user", reply)

    async def stop(self) -> None:
        self._running = False

    async def send(self, recipient_id: str, text: str) -> None:
        print(f"\n{text}\n")

    @staticmethod
    def _read_line() -> str | None:
        try:
            return input("> ")
        except (EOFError, KeyboardInterrupt):
            return None
