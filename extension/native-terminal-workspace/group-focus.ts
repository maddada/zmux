type CreateGroupFocusPlanOptions = {
  changed: boolean;
  hasFocusedSession: boolean;
  isWorkspacePanelVisible: boolean;
  source?: "sidebar";
};

type GroupFocusPlan = {
  shouldEnqueueWorkspaceAutoFocus: boolean;
  shouldRefreshWorkspacePanel: boolean;
  shouldRevealWorkspacePanel: boolean;
};

export function createGroupFocusPlan({
  changed,
  hasFocusedSession,
  isWorkspacePanelVisible,
  source,
}: CreateGroupFocusPlanOptions): GroupFocusPlan {
  if (source !== "sidebar") {
    return {
      shouldEnqueueWorkspaceAutoFocus: false,
      shouldRefreshWorkspacePanel: false,
      shouldRevealWorkspacePanel: false,
    };
  }

  if (changed) {
    return {
      shouldEnqueueWorkspaceAutoFocus: hasFocusedSession,
      shouldRefreshWorkspacePanel: false,
      shouldRevealWorkspacePanel: false,
    };
  }

  if (hasFocusedSession && !isWorkspacePanelVisible) {
    return {
      shouldEnqueueWorkspaceAutoFocus: true,
      shouldRefreshWorkspacePanel: true,
      shouldRevealWorkspacePanel: true,
    };
  }

  return {
    shouldEnqueueWorkspaceAutoFocus: false,
    shouldRefreshWorkspacePanel: false,
    shouldRevealWorkspacePanel: false,
  };
}
