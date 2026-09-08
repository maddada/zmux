/**
 * CDXC:AgentProviders 2026-09-08 DECISION:
 * User: every reset stat shows days and hours at 24 hours or more (5d 12h), and only shows minutes below 24 hours (19h 50m).
 */
export function formatResetCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
