import * as vscode from "vscode";
import type { SessionRecord } from "../shared/session-grid-contract";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";

export type TerminalWorkspaceBackendTitleChange = {
  sessionId: string;
  title: string;
};

export type TerminalWorkspaceBackend = vscode.Disposable & {
  readonly onDidActivateSession: vscode.Event<string>;
  readonly onDidChangeSessions: vscode.Event<void>;
  readonly onDidChangeSessionTitle: vscode.Event<TerminalWorkspaceBackendTitleChange>;
  hasAttachedTerminal: (sessionId: string) => boolean;
  getLastTerminalActivityAt: (sessionId: string) => number | undefined;
  hasLiveTerminal: (sessionId: string) => boolean;
  initialize: (sessionRecords: readonly SessionRecord[]) => Promise<void>;
  acknowledgeAttention: (sessionId: string) => Promise<boolean>;
  createOrAttachSession: (sessionRecord: SessionRecord) => Promise<TerminalSessionSnapshot>;
  focusSession: (sessionId: string) => Promise<boolean>;
  getObservedGroupIndex: (sessionId: string) => number | undefined;
  isSessionForegroundVisible: (sessionId: string) => boolean;
  parkAllEditorTerminalsToPanel: () => Promise<void>;
  clearObservedEditorGroupPlacement: () => void;
  restoreAllManagedTerminalsToEditor: () => Promise<void>;
  revealSessionInGroup: (
    sessionRecord: SessionRecord,
    targetGroupIndex: number,
    isCancelled?: () => boolean,
  ) => Promise<boolean>;
  syncRunningTerminalTitles: () => Promise<void>;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  killSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionRecord: SessionRecord) => Promise<void>;
  restartSession: (sessionRecord: SessionRecord) => Promise<TerminalSessionSnapshot>;
  syncSessions: (sessionRecords: readonly SessionRecord[]) => void;
  syncConfiguration: () => Promise<void>;
  writeText: (sessionId: string, data: string, shouldExecute?: boolean) => Promise<void>;
};
