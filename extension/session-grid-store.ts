import * as vscode from "vscode";
import {
  type SessionGridDirection,
  type SessionGridSnapshot,
  type SessionRecord,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import {
  createSessionInSnapshot,
  focusDirectionInSnapshot,
  focusSessionInSnapshot,
  normalizeSessionGridSnapshot,
  removeSessionInSnapshot,
  renameSessionAliasInSnapshot,
  setSessionTitleInSnapshot,
  setVisibleCountInSnapshot,
  setViewModeInSnapshot,
  syncSessionOrderInSnapshot,
  toggleFullscreenSessionInSnapshot,
} from "../shared/session-grid-state";

const WORKSPACE_SNAPSHOT_KEY = "agentCanvasX.sessionGridSnapshot";

export class SessionGridStore {
  private snapshot: SessionGridSnapshot;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.snapshot = normalizeSessionGridSnapshot(
      context.workspaceState.get<SessionGridSnapshot>(WORKSPACE_SNAPSHOT_KEY),
    );
  }

  public getSnapshot(): SessionGridSnapshot {
    return this.snapshot;
  }

  public async createSession(): Promise<SessionRecord | undefined> {
    const result = createSessionInSnapshot(this.snapshot);
    this.snapshot = result.snapshot;
    await this.persist();

    return result.session;
  }

  public async focusDirection(direction: SessionGridDirection): Promise<boolean> {
    const result = focusDirectionInSnapshot(this.snapshot, direction);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async focusSession(sessionId: string): Promise<boolean> {
    const result = focusSessionInSnapshot(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public getFocusedSession(): SessionRecord | undefined {
    return this.snapshot.focusedSessionId
      ? this.snapshot.sessions.find(
          (session) => session.sessionId === this.snapshot.focusedSessionId,
        )
      : undefined;
  }

  public getSession(sessionId: string): SessionRecord | undefined {
    return this.snapshot.sessions.find((session) => session.sessionId === sessionId);
  }

  public async reset(): Promise<void> {
    this.snapshot = normalizeSessionGridSnapshot(undefined);
    await this.persist();
  }

  public async removeSession(sessionId: string): Promise<boolean> {
    const result = removeSessionInSnapshot(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async renameSessionAlias(sessionId: string, alias: string): Promise<boolean> {
    const result = renameSessionAliasInSnapshot(this.snapshot, sessionId, alias);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async setSessionTitle(sessionId: string, title: string): Promise<boolean> {
    const result = setSessionTitleInSnapshot(this.snapshot, sessionId, title);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    this.snapshot = setVisibleCountInSnapshot(this.snapshot, visibleCount);
    await this.persist();
  }

  public async toggleFullscreenSession(): Promise<void> {
    this.snapshot = toggleFullscreenSessionInSnapshot(this.snapshot);
    await this.persist();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    this.snapshot = setViewModeInSnapshot(this.snapshot, viewMode);
    await this.persist();
  }

  public async syncSessionOrder(sessionIds: readonly string[]): Promise<boolean> {
    const result = syncSessionOrderInSnapshot(this.snapshot, sessionIds);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(WORKSPACE_SNAPSHOT_KEY, this.snapshot);
  }
}
