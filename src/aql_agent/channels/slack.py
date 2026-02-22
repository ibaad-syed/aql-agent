"""Slack channel — Socket Mode (no public URL needed)."""

from __future__ import annotations

import logging

from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
from slack_bolt.async_app import AsyncApp

from aql_agent.channels.base import Channel
from aql_agent.models import Message

logger = logging.getLogger(__name__)


class SlackChannel(Channel):
    name = "slack"

    def __init__(self, bot_token: str, app_token: str) -> None:
        super().__init__()
        self._app = AsyncApp(token=bot_token)
        self._app_token = app_token
        self._handler: AsyncSocketModeHandler | None = None
        self._bot_user_id: str | None = None

        # Register event listeners
        self._app.event("message")(self._handle_message)
        self._app.event("app_mention")(self._handle_mention)

    async def start(self) -> None:
        # Get bot's own user ID so we can ignore our own messages
        auth = await self._app.client.auth_test()
        self._bot_user_id = auth["user_id"]
        logger.info("Slack bot user ID: %s", self._bot_user_id)

        self._handler = AsyncSocketModeHandler(self._app, self._app_token)
        await self._handler.start_async()

    async def stop(self) -> None:
        if self._handler:
            await self._handler.close_async()

    async def send(self, recipient_id: str, text: str) -> None:
        await self._app.client.chat_postMessage(channel=recipient_id, text=text)

    async def _handle_event(self, event: dict, say) -> None:
        """Shared handler for DMs and mentions."""
        # Ignore bot's own messages and message edits/deletions
        if event.get("user") == self._bot_user_id:
            return
        if event.get("subtype"):
            return

        text = event.get("text", "").strip()
        if not text:
            return

        # Strip bot mention from text if present
        if self._bot_user_id:
            text = text.replace(f"<@{self._bot_user_id}>", "").strip()

        channel_id = event.get("channel", "")
        channel_type = event.get("channel_type", "")
        is_dm = channel_type in ("im", "mpim")

        msg = Message(
            body=text,
            channel=self.name,
            sender_id=event.get("user", "unknown"),
            sender_name=event.get("user", "unknown"),
            chat_type="dm" if is_dm else "group",
            group_id="" if is_dm else channel_id,
            raw=event,
        )

        if self._on_message:
            reply = await self._on_message(msg)
            # Reply in thread if in a channel, directly if DM
            thread_ts = event.get("thread_ts") or event.get("ts")
            if is_dm:
                await say(text=reply)
            else:
                await say(text=reply, thread_ts=thread_ts)

    async def _handle_message(self, event: dict, say) -> None:
        # Only handle DMs — channel messages handled via app_mention
        if event.get("channel_type") in ("im", "mpim"):
            await self._handle_event(event, say)

    async def _handle_mention(self, event: dict, say) -> None:
        await self._handle_event(event, say)
