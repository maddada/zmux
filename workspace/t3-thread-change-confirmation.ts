export type T3ThreadChangeConfirmationSource = "activeThread" | "navigation";

export function shouldEmitT3ThreadChangeAfterConfirmation(params: {
  isFocusedPane: boolean;
  isVisiblePane: boolean;
}): boolean {
  return params.isFocusedPane && params.isVisiblePane;
}

export function getT3ThreadChangeConfirmation(params: {
  activeThreadId?: string;
  navigationThreadId?: string;
  pendingThreadId: string;
}):
  | {
      confirmationSource: T3ThreadChangeConfirmationSource;
      confirmedThreadId: string;
    }
  | undefined {
  const pendingThreadId = params.pendingThreadId.trim();
  if (!pendingThreadId) {
    return undefined;
  }

  const navigationThreadId = params.navigationThreadId?.trim();
  if (navigationThreadId && navigationThreadId === pendingThreadId) {
    return {
      confirmationSource: "navigation",
      confirmedThreadId: navigationThreadId,
    };
  }

  const activeThreadId = params.activeThreadId?.trim();
  if (activeThreadId && activeThreadId === pendingThreadId) {
    return {
      confirmationSource: "activeThread",
      confirmedThreadId: activeThreadId,
    };
  }

  return undefined;
}
