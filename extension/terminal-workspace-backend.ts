import * as vscode from "vscode";
import type { NativeTerminalBackendDebugState } from "../shared/native-terminal-debug-contract";
import type { SessionGridSnapshot, SessionRecord } from "../shared/session-grid-contract";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";

export type TerminalWorkspaceBackendTitleChange = {
  sessionId: string;
  title: string;
};

export type TerminalWorkspaceBackend = vscode.Disposable & {
  readonly onDidActivateSession: vscode.Event<string>;
  readonly onDidChangeDebugState: vscode.Event<void>;
  readonly onDidChangeSessions: vscode.Event<void>;
  readonly onDidChangeSessionTitle: vscode.Event<TerminalWorkspaceBackendTitleChange>;
  clearDebugArtifacts: () => Promise<void>;
  getDebugState: () => NativeTerminalBackendDebugState;
  getLastTerminalActivityAt: (sessionId: string) => number | undefined;
  hasLiveTerminal: (sessionId: string) => boolean;
  initialize: (sessionRecords: readonly SessionRecord[]) => Promise<void>;
  acknowledgeAttention: (sessionId: string) => Promise<boolean>;
  createOrAttachSession: (sessionRecord: SessionRecord) => Promise<TerminalSessionSnapshot>;
  canReuseVisibleLayout: (snapshot: SessionGridSnapshot) => boolean;
  focusSession: (sessionId: string, preserveFocus?: boolean) => Promise<boolean>;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  killSession: (sessionId: string) => Promise<void>;
  reconcileVisibleTerminals: (
    snapshot: SessionGridSnapshot,
    preserveFocus?: boolean,
  ) => Promise<void>;
  renameSession: (sessionRecord: SessionRecord) => Promise<void>;
  restartSession: (sessionRecord: SessionRecord) => Promise<TerminalSessionSnapshot>;
  syncConfiguration: () => Promise<void>;
  writeText: (sessionId: string, data: string, shouldExecute?: boolean) => Promise<void>;
};
