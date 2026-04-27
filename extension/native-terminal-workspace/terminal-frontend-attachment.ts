export function shouldAwaitWorkspaceTerminalFrontendConnection(input: {
  isSessionVisibleInWorkspace: boolean;
  isWorkspacePanelVisible: boolean;
}): boolean {
  return input.isWorkspacePanelVisible && input.isSessionVisibleInWorkspace;
}

export function hasTerminalFrontendConnectionAfterReload(input: {
  frontendAttachmentGeneration: number;
  frontendAttachmentGenerationBeforeReload: number;
  isAttached: boolean;
  sawDetachedSinceReload: boolean;
  wasAttachedBeforeReload: boolean;
}): boolean {
  if (!input.isAttached) {
    return false;
  }

  return (
    !input.wasAttachedBeforeReload ||
    input.sawDetachedSinceReload ||
    input.frontendAttachmentGeneration > input.frontendAttachmentGenerationBeforeReload
  );
}
