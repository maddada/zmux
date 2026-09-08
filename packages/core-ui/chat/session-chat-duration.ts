/**
 * CDXC:SessionChat 2026-09-08 WHY:
 * The context row catalog and agent rows both use this formatter; importing it from the catalog created a runtime cycle that prevented chat from loading.
 */
export function formatSessionChatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
