"""Simple heartbeat logger — logs channel status periodically."""

from __future__ import annotations

import asyncio
import logging

from aql_agent.channels.base import Channel

logger = logging.getLogger(__name__)

HEARTBEAT_INTERVAL = 300  # seconds


async def heartbeat(channels: list[Channel]) -> None:
    """Log a heartbeat every HEARTBEAT_INTERVAL seconds."""
    while True:
        names = [ch.name for ch in channels]
        logger.info("Heartbeat — active channels: %s", ", ".join(names))
        await asyncio.sleep(HEARTBEAT_INTERVAL)
