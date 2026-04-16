import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as vscode from "vscode";

export type SharedT3BrowserAccessState = {
  sessionId: string;
  sessionTitle: string;
  threadId: string;
  updatedAt: string;
  workspaceRoot: string;
};

const SHARED_T3_BROWSER_ACCESS_STATE_FILE = "t3-browser-access-state.json";

export async function readSharedT3BrowserAccessState(
  context: vscode.ExtensionContext,
): Promise<SharedT3BrowserAccessState | undefined> {
  try {
    const encoded = await readFile(getSharedT3BrowserAccessStatePath(context), "utf8");
    const parsed = JSON.parse(encoded) as Partial<SharedT3BrowserAccessState>;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.sessionTitle !== "string" ||
      typeof parsed.threadId !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.workspaceRoot !== "string"
    ) {
      return undefined;
    }

    const sessionId = parsed.sessionId.trim();
    const sessionTitle = parsed.sessionTitle.trim();
    const threadId = parsed.threadId.trim();
    const updatedAt = parsed.updatedAt.trim();
    const workspaceRoot = parsed.workspaceRoot.trim();
    if (!sessionId || !threadId || !updatedAt || !workspaceRoot) {
      return undefined;
    }

    return {
      sessionId,
      sessionTitle: sessionTitle || "T3 Code",
      threadId,
      updatedAt,
      workspaceRoot,
    };
  } catch {
    return undefined;
  }
}

export async function writeSharedT3BrowserAccessState(
  context: vscode.ExtensionContext,
  state: SharedT3BrowserAccessState,
): Promise<void> {
  const storageDir = context.globalStorageUri.fsPath;
  await mkdir(storageDir, { recursive: true });
  await writeFile(
    getSharedT3BrowserAccessStatePath(context),
    JSON.stringify(state, null, 2),
    "utf8",
  );
}

function getSharedT3BrowserAccessStatePath(context: vscode.ExtensionContext): string {
  return join(context.globalStorageUri.fsPath, SHARED_T3_BROWSER_ACCESS_STATE_FILE);
}
