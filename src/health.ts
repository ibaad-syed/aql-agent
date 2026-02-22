export function startHeartbeat(channels: string[]): NodeJS.Timeout {
  const label = channels.join(", ");
  return setInterval(() => {
    console.log(`[health] heartbeat — channels: ${label}`);
  }, 300_000); // 5 minutes
}
