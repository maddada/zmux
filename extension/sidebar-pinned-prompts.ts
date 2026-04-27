import type * as vscode from "vscode";
import {
  normalizeSidebarPinnedPrompts,
  type SidebarPinnedPrompt,
} from "../shared/sidebar-pinned-prompts";

const GLOBAL_PINNED_PROMPTS_KEY = "zmux.globalPinnedPrompts";

export type SaveSidebarPinnedPromptInput = {
  content: string;
  promptId?: string;
  title: string;
};

export function getSidebarPinnedPrompts(context: vscode.ExtensionContext): SidebarPinnedPrompt[] {
  return normalizeSidebarPinnedPrompts(context.globalState.get(GLOBAL_PINNED_PROMPTS_KEY));
}

export async function saveSidebarPinnedPrompt(
  context: vscode.ExtensionContext,
  input: SaveSidebarPinnedPromptInput,
): Promise<void> {
  const content = input.content;
  const title = input.title.trim();
  if (!content.trim() || !title) {
    return;
  }

  const currentPrompts = getSidebarPinnedPrompts(context);
  const now = new Date().toISOString();
  const promptId = input.promptId?.trim() || createPinnedPromptId();
  const existingPrompt = currentPrompts.find((prompt) => prompt.promptId === promptId);
  const nextPrompt: SidebarPinnedPrompt = {
    content,
    createdAt: existingPrompt?.createdAt ?? now,
    promptId,
    title,
    updatedAt: now,
  };
  const nextPrompts = existingPrompt
    ? currentPrompts.map((prompt) => (prompt.promptId === promptId ? nextPrompt : prompt))
    : [nextPrompt, ...currentPrompts];
  await context.globalState.update(GLOBAL_PINNED_PROMPTS_KEY, nextPrompts);
}

function createPinnedPromptId(): string {
  return `pinned-prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
