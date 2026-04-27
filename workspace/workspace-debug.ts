export function logWorkspaceDebug(
  enabled: boolean | undefined,
  _event: string,
  _payload?: Record<string, unknown>,
): void {
  if (!enabled) {
    return;
  }
}
