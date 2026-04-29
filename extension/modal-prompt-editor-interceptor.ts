import type * as vscode from "vscode";

/**
 * CDXC:AppModals 2026-04-28-16:18
 * Prompt temp files must not be intercepted into VS Code modal editor groups.
 * The previous behavior used workbench modal editors; this module is now a
 * no-op compatibility shim so old activation paths cannot reopen that surface.
 */
export function registerModalPromptEditorInterceptor(): vscode.Disposable {
  return {
    dispose: () => undefined,
  };
}

export function resetModalPromptEditorInterceptorState(): void {
  return undefined;
}

export async function saveAndCloseActivePromptTempModalEditor(): Promise<void> {
  return undefined;
}
