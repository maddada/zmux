type CreateSessionFocusPlanOptions = {
  isWorkspacePanelActiveEditorTab: boolean;
  source?: "sidebar" | "workspace";
};

type SessionFocusPlan = {
  shouldRevealWorkspacePanel: boolean;
};

export function createSessionFocusPlan({
  isWorkspacePanelActiveEditorTab,
  source,
}: CreateSessionFocusPlanOptions): SessionFocusPlan {
  return {
    shouldRevealWorkspacePanel: source === "sidebar" && !isWorkspacePanelActiveEditorTab,
  };
}
