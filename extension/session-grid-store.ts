import * as vscode from "vscode";
import {
  createDefaultSessionGridSnapshot,
  getOrderedSessions,
  type CreateSessionRecordOptions,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridDirection,
  type SessionGroupRecord,
  type SessionRecord,
  type T3SessionMetadata,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import {
  createGroupInSimpleWorkspace,
  createGroupFromSessionInSimpleWorkspace,
  createSessionInSimpleWorkspace,
  focusGroupByIndexInSimpleWorkspace,
  focusGroupInSimpleWorkspace,
  focusSessionInSimpleWorkspace,
  getActiveGroup,
  getGroupById,
  getGroupForSession,
  moveSessionToGroupInSimpleWorkspace,
  normalizeSimpleGroupedSessionWorkspaceSnapshot,
  removeGroupInSimpleWorkspace,
  removeSessionInSimpleWorkspace,
  renameGroupInSimpleWorkspace,
  renameSessionAliasInSimpleWorkspace,
  setSessionTitleInSimpleWorkspace,
  setT3SessionMetadataInSimpleWorkspace,
  setViewModeInSimpleWorkspace,
  setVisibleCountInSimpleWorkspace,
  syncGroupOrderInSimpleWorkspace,
  syncSessionOrderInSimpleWorkspace,
  toggleFullscreenSessionInSimpleWorkspace,
} from "../shared/simple-grouped-session-workspace-state";
import { logVSmuxDebug } from "./vsmux-debug-log";

const WORKSPACE_SNAPSHOT_KEY = "VSmux.sessionGridSnapshot";

export class SessionGridStore {
  private snapshot: GroupedSessionWorkspaceSnapshot;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.snapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(
      context.workspaceState.get<GroupedSessionWorkspaceSnapshot>(WORKSPACE_SNAPSHOT_KEY),
    );
  }

  public getSnapshot(): GroupedSessionWorkspaceSnapshot {
    return this.snapshot;
  }

  public getActiveGroup(): SessionGroupRecord | undefined {
    return getActiveGroup(this.snapshot);
  }

  public getGroup(groupId: string): SessionGroupRecord | undefined {
    return getGroupById(this.snapshot, groupId);
  }

  public getSessionGroup(sessionId: string): SessionGroupRecord | undefined {
    return getGroupForSession(this.snapshot, sessionId);
  }

  public async createSession(
    options?: CreateSessionRecordOptions,
  ): Promise<SessionRecord | undefined> {
    const result = createSessionInSimpleWorkspace(this.snapshot, options);
    this.snapshot = result.snapshot;
    await this.persist();
    return result.session;
  }

  public async focusDirection(direction: SessionGridDirection): Promise<boolean> {
    const activeGroup = getActiveGroup(this.snapshot);
    const focusedSessionId = activeGroup?.snapshot.focusedSessionId;
    if (!activeGroup || !focusedSessionId) {
      return false;
    }

    const orderedSessions = getOrderedSessions(activeGroup.snapshot);
    const focusedIndex = orderedSessions.findIndex((session) => session.sessionId === focusedSessionId);
    if (focusedIndex < 0) {
      return false;
    }

    const nextIndex =
      direction === "left" || direction === "up" ? focusedIndex - 1 : focusedIndex + 1;
    const nextSession = orderedSessions[nextIndex];
    if (!nextSession) {
      return false;
    }

    return this.focusSession(nextSession.sessionId);
  }

  public async focusGroup(groupId: string): Promise<boolean> {
    const result = focusGroupInSimpleWorkspace(this.snapshot, groupId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async focusGroupByIndex(groupIndex: number): Promise<boolean> {
    const result = focusGroupByIndexInSimpleWorkspace(this.snapshot, groupIndex);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async focusSession(sessionId: string): Promise<boolean> {
    const result = focusSessionInSimpleWorkspace(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public getFocusedSession(): SessionRecord | undefined {
    const activeGroup = getActiveGroup(this.snapshot);
    if (!activeGroup?.snapshot.focusedSessionId) {
      return undefined;
    }

    return activeGroup.snapshot.sessions.find(
      (session) => session.sessionId === activeGroup.snapshot.focusedSessionId,
    );
  }

  public getSession(sessionId: string): SessionRecord | undefined {
    return this.snapshot.groups
      .flatMap((group) => group.snapshot.sessions)
      .find((session) => session.sessionId === sessionId);
  }

  public async renameGroup(groupId: string, title: string): Promise<boolean> {
    const result = renameGroupInSimpleWorkspace(this.snapshot, groupId, title);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async removeGroup(groupId: string): Promise<boolean> {
    const result = removeGroupInSimpleWorkspace(this.snapshot, groupId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async reset(): Promise<void> {
    this.snapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(undefined);
    await this.persist();
  }

  public async replaceSnapshot(snapshot: GroupedSessionWorkspaceSnapshot): Promise<void> {
    this.snapshot = normalizeSimpleGroupedSessionWorkspaceSnapshot(snapshot);
    await this.persist();
  }

  public async removeSession(sessionId: string): Promise<boolean> {
    const result = removeSessionInSimpleWorkspace(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async renameSessionAlias(sessionId: string, alias: string): Promise<boolean> {
    const result = renameSessionAliasInSimpleWorkspace(this.snapshot, sessionId, alias);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setSessionTitle(sessionId: string, title: string): Promise<boolean> {
    const result = setSessionTitleInSimpleWorkspace(this.snapshot, sessionId, title);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setT3SessionMetadata(
    sessionId: string,
    t3: T3SessionMetadata,
  ): Promise<boolean> {
    const result = setT3SessionMetadataInSimpleWorkspace(this.snapshot, sessionId, t3);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setBrowserSessionMetadata(): Promise<boolean> {
    return false;
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    this.snapshot = setVisibleCountInSimpleWorkspace(this.snapshot, visibleCount);
    await this.persist();
  }

  public async toggleFullscreenSession(): Promise<void> {
    this.snapshot = toggleFullscreenSessionInSimpleWorkspace(this.snapshot);
    await this.persist();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    this.snapshot = setViewModeInSimpleWorkspace(this.snapshot, viewMode);
    await this.persist();
  }

  public async syncSessionOrder(groupId: string, sessionIds: readonly string[]): Promise<boolean> {
    const previousSnapshot = this.snapshot;
    const result = syncSessionOrderInSimpleWorkspace(this.snapshot, groupId, sessionIds);
    this.snapshot = result.snapshot;
    logVSmuxDebug("store.syncSessionOrder", {
      changed: result.changed,
      groupId,
      requestedSessionIds: [...sessionIds],
      next: summarizeWorkspaceSnapshot(this.snapshot),
      previous: summarizeWorkspaceSnapshot(previousSnapshot),
    });
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<boolean> {
    const previousSnapshot = this.snapshot;
    const result = syncGroupOrderInSimpleWorkspace(this.snapshot, groupIds);
    this.snapshot = result.snapshot;
    logVSmuxDebug("store.syncGroupOrder", {
      changed: result.changed,
      next: summarizeWorkspaceSnapshot(this.snapshot),
      previous: summarizeWorkspaceSnapshot(previousSnapshot),
      requestedGroupIds: [...groupIds],
    });
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async moveSessionToGroup(
    sessionId: string,
    groupId: string,
    targetIndex?: number,
  ): Promise<boolean> {
    const previousSnapshot = this.snapshot;
    const result = moveSessionToGroupInSimpleWorkspace(this.snapshot, sessionId, groupId, targetIndex);
    this.snapshot = result.snapshot;
    logVSmuxDebug("store.moveSessionToGroup", {
      changed: result.changed,
      groupId,
      next: summarizeWorkspaceSnapshot(this.snapshot),
      previous: summarizeWorkspaceSnapshot(previousSnapshot),
      sessionId,
      targetIndex,
    });
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async createGroupFromSession(sessionId: string): Promise<string | undefined> {
    const previousSnapshot = this.snapshot;
    const result = createGroupFromSessionInSimpleWorkspace(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    logVSmuxDebug("store.createGroupFromSession", {
      changed: result.changed,
      groupId: result.groupId,
      next: summarizeWorkspaceSnapshot(this.snapshot),
      previous: summarizeWorkspaceSnapshot(previousSnapshot),
      sessionId,
    });
    if (result.changed) {
      await this.persist();
    }
    return result.groupId;
  }

  public async createGroup(): Promise<string | undefined> {
    const previousSnapshot = this.snapshot;
    const result = createGroupInSimpleWorkspace(this.snapshot);
    this.snapshot = result.snapshot;
    logVSmuxDebug("store.createGroup", {
      changed: result.changed,
      groupId: result.groupId,
      next: summarizeWorkspaceSnapshot(this.snapshot),
      previous: summarizeWorkspaceSnapshot(previousSnapshot),
    });
    if (result.changed) {
      await this.persist();
    }
    return result.groupId;
  }

  public getActiveGroupSessions(): SessionRecord[] {
    return getOrderedSessions(getActiveGroup(this.snapshot)?.snapshot ?? createDefaultSessionGridSnapshot());
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(WORKSPACE_SNAPSHOT_KEY, this.snapshot);
  }
}

function summarizeWorkspaceSnapshot(snapshot: GroupedSessionWorkspaceSnapshot) {
  return {
    activeGroupId: snapshot.activeGroupId,
    groups: snapshot.groups.map((group) => ({
      focusedSessionId: group.snapshot.focusedSessionId,
      groupId: group.groupId,
      sessionIds: group.snapshot.sessions.map((session) => session.sessionId),
      title: group.title,
      visibleSessionIds: [...group.snapshot.visibleSessionIds],
    })),
  };
}
