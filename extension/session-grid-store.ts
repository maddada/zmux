import * as vscode from "vscode";
import {
  createDefaultSessionGridSnapshot,
  getOrderedSessions,
  type CreateSessionRecordOptions,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridDirection,
  type SessionGroupRecord,
  type SessionRecord,
  type TerminalEngine,
  type T3SessionMetadata,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import { logWorkspaceFocusTrace } from "./workspace-focus-trace-log";
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
  setSessionFavoriteInSimpleWorkspace,
  setSessionTitleInSimpleWorkspace,
  setSessionSleepingInSimpleWorkspace,
  setTerminalSessionEngineInSimpleWorkspace,
  setT3SessionMetadataInSimpleWorkspace,
  setViewModeInSimpleWorkspace,
  setVisibleCountInSimpleWorkspace,
  setGroupSleepingInSimpleWorkspace,
  syncGroupOrderInSimpleWorkspace,
  syncSessionOrderInSimpleWorkspace,
  toggleFullscreenSessionInSimpleWorkspace,
} from "../shared/simple-grouped-session-workspace-state";
import { logzmuxDebug } from "./zmux-debug-log";

const WORKSPACE_SNAPSHOT_KEY = "zmux.sessionGridSnapshot";

type SessionGridStoreOptions = {
  getReservedSessionIds?: () => readonly string[];
};

export class SessionGridStore {
  private snapshot: GroupedSessionWorkspaceSnapshot;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly options: SessionGridStoreOptions = {},
  ) {
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
    const result = createSessionInSimpleWorkspace(this.snapshot, options, {
      usedSessionIds: this.options.getReservedSessionIds?.() ?? [],
    });
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
    const focusedIndex = orderedSessions.findIndex(
      (session) => session.sessionId === focusedSessionId,
    );
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
    const previousSnapshot = this.snapshot;
    logWorkspaceFocusTrace("store.focusSession.before", {
      activeGroup: summarizeFocusTraceGroup(
        previousSnapshot.groups.find((group) => group.groupId === previousSnapshot.activeGroupId),
      ),
      requestedSessionId: sessionId,
      targetGroup: summarizeFocusTraceGroup(getGroupForSession(previousSnapshot, sessionId)),
    });
    const result = focusSessionInSimpleWorkspace(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    logWorkspaceFocusTrace("store.focusSession.after", {
      activeGroup: summarizeFocusTraceGroup(
        this.snapshot.groups.find((group) => group.groupId === this.snapshot.activeGroupId),
      ),
      changed: result.changed,
      requestedSessionId: sessionId,
      targetGroup: summarizeFocusTraceGroup(getGroupForSession(this.snapshot, sessionId)),
    });
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

  public async setTerminalSessionEngine(
    sessionId: string,
    terminalEngine: TerminalEngine,
  ): Promise<boolean> {
    const result = setTerminalSessionEngineInSimpleWorkspace(
      this.snapshot,
      sessionId,
      terminalEngine,
    );
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setSessionSleeping(sessionId: string, sleeping: boolean): Promise<boolean> {
    const result = setSessionSleepingInSimpleWorkspace(this.snapshot, sessionId, sleeping);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setSessionFavorite(sessionId: string, favorite: boolean): Promise<boolean> {
    const result = setSessionFavoriteInSimpleWorkspace(this.snapshot, sessionId, favorite);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setGroupSleeping(
    groupId: string,
    sleeping: boolean,
    sessionIds?: readonly string[],
  ): Promise<boolean> {
    const result = setGroupSleepingInSimpleWorkspace(this.snapshot, groupId, sleeping, sessionIds);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }
    return result.changed;
  }

  public async setT3SessionMetadata(sessionId: string, t3: T3SessionMetadata): Promise<boolean> {
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
    const currentSessionIds =
      previousSnapshot.groups
        .find((group) => group.groupId === groupId)
        ?.snapshot.sessions.map((session) => session.sessionId) ?? [];
    const requestedSessionIdSet = new Set(sessionIds);
    const result = syncSessionOrderInSimpleWorkspace(this.snapshot, groupId, sessionIds);
    this.snapshot = result.snapshot;
    logzmuxDebug("store.syncSessionOrder", {
      changed: result.changed,
      groupId,
      currentSessionIds,
      extraRequestedSessionIds: sessionIds.filter(
        (sessionId) => !currentSessionIds.includes(sessionId),
      ),
      missingRequestedSessionIds: currentSessionIds.filter(
        (sessionId) => !requestedSessionIdSet.has(sessionId),
      ),
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
    logzmuxDebug("store.syncGroupOrder", {
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
    const previousGroupIdsBySession = Object.fromEntries(
      previousSnapshot.groups.flatMap((group) =>
        group.snapshot.sessions.map((session) => [session.sessionId, group.groupId] as const),
      ),
    );
    const result = moveSessionToGroupInSimpleWorkspace(
      this.snapshot,
      sessionId,
      groupId,
      targetIndex,
    );
    this.snapshot = result.snapshot;
    logzmuxDebug("store.moveSessionToGroup", {
      changed: result.changed,
      groupId,
      next: summarizeWorkspaceSnapshot(this.snapshot),
      previous: summarizeWorkspaceSnapshot(previousSnapshot),
      previousGroupId: previousGroupIdsBySession[sessionId],
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
    logzmuxDebug("store.createGroupFromSession", {
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
    logzmuxDebug("store.createGroup", {
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
    return getOrderedSessions(
      getActiveGroup(this.snapshot)?.snapshot ?? createDefaultSessionGridSnapshot(),
    );
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

function summarizeFocusTraceGroup(group: SessionGroupRecord | undefined) {
  if (!group) {
    return undefined;
  }

  return {
    focusedSessionId: group.snapshot.focusedSessionId,
    groupId: group.groupId,
    sessions: group.snapshot.sessions.map((session, index) => ({
      alias: session.alias,
      displayId: session.displayId,
      index,
      isSleeping: session.isSleeping,
      kind: session.kind,
      sessionId: session.sessionId,
    })),
    title: group.title,
    viewMode: group.snapshot.viewMode,
    visibleCount: group.snapshot.visibleCount,
    visibleSlots: group.snapshot.visibleSessionIds.map((sessionId, slotIndex) => ({
      isFocused: sessionId === group.snapshot.focusedSessionId,
      sessionId,
      slotIndex,
    })),
  };
}
