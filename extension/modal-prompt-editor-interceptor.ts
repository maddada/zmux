import * as vscode from "vscode";
import { getOpenPromptTempFilesInModalEditor } from "./native-terminal-workspace/settings";

const DEFAULT_EDITOR_ID = "default";
const MODAL_EDITOR_CLOSE_DELAY_MS = 200;
const MODAL_EDITOR_GROUP = -4;
const OPEN_WITH_COMMAND = "_workbench.openWith";
const CLOSE_MODAL_EDITOR_COMMAND = "workbench.action.closeModalEditor";
const REVEAL_WORKSPACE_IN_BACKGROUND_COMMAND = "zmux.revealWorkspaceInBackground";

const interceptedPromptUris = new Set<string>();
const promptModalSessions = new Map<string, PromptModalSession>();

type PromptTempDocumentLike = {
  uri: {
    fsPath?: string;
    scheme?: string;
    toString(skipEncoding?: boolean): string;
  };
};

type PromptModalSession = {
  hasSeenMultipleTabs: boolean;
  isClosingRemainingTab: boolean;
  uri: PromptTempDocumentLike["uri"];
};

export function registerModalPromptEditorInterceptor(): vscode.Disposable {
  const disposables: vscode.Disposable[] = [];

  const interceptDocument = (document: PromptTempDocumentLike | undefined): void => {
    if (!getOpenPromptTempFilesInModalEditor()) {
      return;
    }

    if (!document || !isAgentPromptTempDocument(document)) {
      return;
    }

    const documentKey = document.uri.toString(true);
    if (interceptedPromptUris.has(documentKey)) {
      return;
    }

    interceptedPromptUris.add(documentKey);
    void openPromptDocumentInModal(document.uri).catch(() => {
      interceptedPromptUris.delete(documentKey);
    });
  };

  disposables.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      interceptDocument(document);
    }),
  );

  disposables.push(
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      for (const editor of editors) {
        interceptDocument(editor.document);
      }
    }),
  );

  disposables.push(
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      for (const session of promptModalSessions.values()) {
        updatePromptSession(session, event);
      }
    }),
  );

  for (const editor of vscode.window.visibleTextEditors) {
    interceptDocument(editor.document);
  }

  return new vscode.Disposable(() => {
    while (disposables.length > 0) {
      disposables.pop()?.dispose();
    }
  });
}

export function isAgentPromptTempDocument(document: PromptTempDocumentLike): boolean {
  return isAgentPromptTempPath(document.uri.fsPath, document.uri.scheme);
}

export function isAgentPromptTempPath(filePath: string | undefined, scheme = "file"): boolean {
  if (scheme !== "file" || !filePath) {
    return false;
  }

  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath.endsWith(".md")) {
    return false;
  }

  const pathSegments = normalizedPath.split("/");
  const fileName = pathSegments[pathSegments.length - 1] ?? "";

  if (normalizedPath.startsWith("/tmp/") && /^claude-prompt-[^/]+\.md$/i.test(fileName)) {
    return true;
  }

  if (
    (normalizedPath.startsWith("/var/folders/") || normalizedPath.startsWith("/tmp/")) &&
    /^\.tmp[^/]*\.md$/i.test(fileName)
  ) {
    return true;
  }

  return false;
}

export function resetModalPromptEditorInterceptorState(): void {
  interceptedPromptUris.clear();
  promptModalSessions.clear();
}

export async function saveAndCloseActivePromptTempModalEditor(): Promise<void> {
  if (!getOpenPromptTempFilesInModalEditor()) {
    return;
  }

  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || !isAgentPromptTempDocument(activeEditor.document)) {
    return;
  }

  const saved = await activeEditor.document.save();
  if (!saved) {
    return;
  }

  await vscode.commands.executeCommand(CLOSE_MODAL_EDITOR_COMMAND);
}

async function openPromptDocumentInModal(uri: PromptTempDocumentLike["uri"]): Promise<void> {
  const documentKey = uri.toString(true);
  promptModalSessions.set(documentKey, {
    hasSeenMultipleTabs: false,
    isClosingRemainingTab: false,
    uri,
  });

  await vscode.commands.executeCommand(OPEN_WITH_COMMAND, uri, DEFAULT_EDITOR_ID, [
    MODAL_EDITOR_GROUP,
    { preserveFocus: false },
  ]);

  await delay(50);
  await Promise.resolve(
    vscode.commands.executeCommand(REVEAL_WORKSPACE_IN_BACKGROUND_COMMAND),
  ).catch(() => undefined);
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function updatePromptSession(session: PromptModalSession, event: vscode.TabChangeEvent): void {
  if (!getOpenPromptTempFilesInModalEditor()) {
    return;
  }

  const matchingTabs = getMatchingTextTabs(session.uri);
  if (matchingTabs.length >= 2) {
    session.hasSeenMultipleTabs = true;
  }

  if (!tabChangeTouchesUri(event, session.uri)) {
    return;
  }

  if (matchingTabs.length === 0) {
    finishPromptSession(session.uri);
    return;
  }

  if (
    session.hasSeenMultipleTabs &&
    matchingTabs.length === 1 &&
    event.closed.some((tab) => isMatchingTextTab(tab, session.uri))
  ) {
    void closeRemainingPromptTab(session);
  }
}

async function closeRemainingPromptTab(session: PromptModalSession): Promise<void> {
  if (session.isClosingRemainingTab) {
    return;
  }

  session.isClosingRemainingTab = true;

  await delay(MODAL_EDITOR_CLOSE_DELAY_MS);

  if (!getOpenPromptTempFilesInModalEditor()) {
    finishPromptSession(session.uri);
    return;
  }

  const remainingTabs = getMatchingTextTabs(session.uri);
  if (remainingTabs.length === 1) {
    await vscode.window.tabGroups.close(remainingTabs[0], true);
  }

  finishPromptSession(session.uri);
}

function finishPromptSession(uri: PromptTempDocumentLike["uri"]): void {
  const documentKey = uri.toString(true);
  promptModalSessions.delete(documentKey);
  interceptedPromptUris.delete(documentKey);
}

function getMatchingTextTabs(uri: PromptTempDocumentLike["uri"]): vscode.Tab[] {
  return vscode.window.tabGroups.all.flatMap((group) =>
    group.tabs.filter((tab) => isMatchingTextTab(tab, uri)),
  );
}

function isMatchingTextTab(tab: vscode.Tab, uri: PromptTempDocumentLike["uri"]): boolean {
  return (
    tab.input instanceof vscode.TabInputText && tab.input.uri.toString(true) === uri.toString(true)
  );
}

function tabChangeTouchesUri(
  event: vscode.TabChangeEvent,
  uri: PromptTempDocumentLike["uri"],
): boolean {
  return [...event.opened, ...event.closed, ...event.changed].some((tab) =>
    isMatchingTextTab(tab, uri),
  );
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}
