export type FinalizeRestoredPreviousSessionOptions = {
  afterStateChange: () => Promise<void>;
  createSurfaceIfNeeded: () => Promise<void>;
  persistSessionAgentLaunchState: () => Promise<void>;
  removePreviousSession: () => Promise<void>;
  resumeDetachedTerminalSession: () => Promise<void>;
};

export async function finalizeRestoredPreviousSession(
  options: FinalizeRestoredPreviousSessionOptions,
): Promise<void> {
  await options.createSurfaceIfNeeded();
  await options.persistSessionAgentLaunchState();
  await options.resumeDetachedTerminalSession();
  await options.removePreviousSession();
  await options.afterStateChange();
}
