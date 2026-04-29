import { describe, expect, test } from "vitest";
import {
  registerModalPromptEditorInterceptor,
  resetModalPromptEditorInterceptorState,
  saveAndCloseActivePromptTempModalEditor,
} from "./modal-prompt-editor-interceptor";

describe("modal prompt editor interceptor", () => {
  test("should remain a no-op compatibility shim", async () => {
    /**
     * CDXC:AppModals 2026-04-28-16:18
     * Prompt temp files must not be moved into VS Code modal editor groups.
     * The interceptor stays importable for compatibility, but registering,
     * resetting, and saving must not invoke workbench modal editor commands.
     */
    const disposable = registerModalPromptEditorInterceptor();

    resetModalPromptEditorInterceptorState();
    await saveAndCloseActivePromptTempModalEditor();

    expect(() => disposable.dispose()).not.toThrow();
  });
});
