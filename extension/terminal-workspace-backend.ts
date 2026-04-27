import * as vscode from "vscode";
import type { SessionRecord } from "../shared/session-grid-contract";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";
import type { PersistedSessionState } from "./session-state-file";

export type TerminalCreateOrAttachResult = {
  didCreateTerminal: boolean;
  snapshot: TerminalSessionSnapshot;
};

export type TerminalWorkspaceBackendTitleChange = {
  sessionId: string;
  title?: string;
};

export type TerminalWorkspaceBackendPresentationChange = {
  sessionId: string;
  title?: string;
};

export type TerminalWorkspaceBackendActivityChange = {
  didComplete?: boolean;
  sessionId: string;
};

export type TerminalWorkspaceBackend = vscode.Disposable & {
  readonly onDidChangeSessions: vscode.Event<void>;
  readonly onDidChangeSessionActivity: vscode.Event<TerminalWorkspaceBackendActivityChange>;
  readonly onDidChangeSessionPresentation: vscode.Event<TerminalWorkspaceBackendPresentationChange>;
  readonly onDidChangeSessionTitle: vscode.Event<TerminalWorkspaceBackendTitleChange>;
  hasAttachedTerminal: (sessionId: string) => boolean;
  getLastTerminalActivityAt: (sessionId: string) => number | undefined;
  hasLiveTerminal: (sessionId: string) => boolean;
  initialize: (sessionRecords: readonly SessionRecord[]) => Promise<void>;
  acknowledgeAttention: (sessionId: string) => Promise<boolean>;
  createOrAttachSession: (sessionRecord: SessionRecord) => Promise<TerminalCreateOrAttachResult>;
  applyFirstPromptAutoRename: (sessionId: string, title: string) => Promise<void>;
  focusSession: (sessionId: string) => Promise<boolean>;
  getSessionSnapshot: (sessionId: string) => TerminalSessionSnapshot | undefined;
  killSession: (sessionId: string) => Promise<void>;
  persistLastTerminalActivityAt: (sessionId: string, activityAt: number) => Promise<void>;
  readPersistedSessionState: (sessionId: string) => Promise<PersistedSessionState>;
  renameSession: (sessionRecord: SessionRecord) => Promise<void>;
  restartSession: (sessionRecord: SessionRecord) => Promise<TerminalSessionSnapshot>;
  syncResizeEligibleSessions: (sessionIds: readonly string[]) => Promise<void>;
  syncSessions: (sessionRecords: readonly SessionRecord[]) => void;
  syncConfiguration: () => Promise<void>;
  writeText: (sessionId: string, data: string, shouldExecute?: boolean) => Promise<void>;
};
