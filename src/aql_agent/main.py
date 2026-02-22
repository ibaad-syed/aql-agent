"""Entry point — starts all enabled channels concurrently."""

from __future__ import annotations

import asyncio
import logging
import signal
import sys

from aql_agent.agent import Agent
from aql_agent.channels.base import Channel
from aql_agent.config import Settings
from aql_agent.health import heartbeat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("aql-agent")


def _build_channels(settings: Settings) -> list[Channel]:
    """Instantiate only the channels listed in settings."""
    channels: list[Channel] = []

    for name in settings.enabled_channels:
        if name == "cli":
            from aql_agent.channels.cli import CLIChannel

            channels.append(CLIChannel())

        elif name == "slack":
            from aql_agent.channels.slack import SlackChannel

            channels.append(
                SlackChannel(
                    bot_token=settings.slack_bot_token,
                    app_token=settings.slack_app_token,
                )
            )
        else:
            logger.warning("Unknown channel %r — skipping", name)

    return channels


async def _run(settings: Settings) -> None:
    agent = Agent(settings)
    channels = _build_channels(settings)

    if not channels:
        logger.error("No channels enabled. Set ENABLED_CHANNELS in .env")
        sys.exit(1)

    # Register the agent as the message handler for every channel
    for ch in channels:
        ch.on_message(agent.get_reply)
        logger.info("Channel %r enabled", ch.name)

    # Graceful shutdown
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _shutdown() -> None:
        logger.info("Shutting down…")
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _shutdown)

    # Start all channels + heartbeat concurrently
    tasks = [asyncio.create_task(ch.start()) for ch in channels]
    tasks.append(asyncio.create_task(heartbeat(channels)))

    # Wait for shutdown signal
    await stop_event.wait()

    # Stop all channels
    for ch in channels:
        await ch.stop()

    # Cancel remaining tasks
    for t in tasks:
        t.cancel()

    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("All channels stopped.")


def main() -> None:
    settings = Settings.from_env()
    try:
        asyncio.run(_run(settings))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
