import * as vscode from "vscode";
import {
  createDefaultSessionGridSnapshot,
  type GroupedSessionWorkspaceSnapshot,
  type SessionGridDirection,
  type SessionGroupRecord,
  type SessionRecord,
  type TerminalViewMode,
  type VisibleSessionCount,
  getOrderedSessions,
} from "../shared/session-grid-contract";
import {
  createGroupFromSessionInWorkspace,
  createSessionInWorkspace,
  focusGroupByIndexInWorkspace,
  focusGroupInWorkspace,
  focusSessionInWorkspace,
  getActiveGroup,
  getGroupById,
  getGroupForSession,
  moveSessionToGroupInWorkspace,
  normalizeGroupedSessionWorkspaceSnapshot,
  removeGroupInWorkspace,
  removeSessionInWorkspace,
  renameGroupInWorkspace,
  renameSessionAliasInWorkspace,
  setSessionTitleInWorkspace,
  setViewModeInWorkspace,
  setVisibleCountInWorkspace,
  syncGroupOrderInWorkspace,
  syncSessionOrderInWorkspace,
  toggleFullscreenSessionInWorkspace,
} from "../shared/grouped-session-workspace-state";
import { focusDirectionInSnapshot } from "../shared/session-grid-state";

const WORKSPACE_SNAPSHOT_KEY = "VS-AGENT-MUX.sessionGridSnapshot";

export class SessionGridStore {
  private snapshot: GroupedSessionWorkspaceSnapshot;

  public constructor(private readonly context: vscode.ExtensionContext) {
    this.snapshot = normalizeGroupedSessionWorkspaceSnapshot(
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

  public async createSession(): Promise<SessionRecord | undefined> {
    const result = createSessionInWorkspace(this.snapshot);
    this.snapshot = result.snapshot;
    await this.persist();

    return result.session;
  }

  public async focusDirection(direction: SessionGridDirection): Promise<boolean> {
    const activeGroup = getActiveGroup(this.snapshot);
    if (!activeGroup) {
      return false;
    }

    const result = focusDirectionInSnapshot(activeGroup.snapshot, direction);
    if (!result.changed) {
      return false;
    }

    this.snapshot = {
      ...this.snapshot,
      groups: this.snapshot.groups.map((group) =>
        group.groupId === activeGroup.groupId
          ? {
              ...group,
              snapshot: result.snapshot,
            }
          : group,
      ),
    };
    await this.persist();
    return true;
  }

  public async focusGroup(groupId: string): Promise<boolean> {
    const result = focusGroupInWorkspace(this.snapshot, groupId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async focusGroupByIndex(groupIndex: number): Promise<boolean> {
    const result = focusGroupByIndexInWorkspace(this.snapshot, groupIndex);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async focusSession(sessionId: string): Promise<boolean> {
    const result = focusSessionInWorkspace(this.snapshot, sessionId);
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
    const result = renameGroupInWorkspace(this.snapshot, groupId, title);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async removeGroup(groupId: string): Promise<boolean> {
    const result = removeGroupInWorkspace(this.snapshot, groupId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async reset(): Promise<void> {
    this.snapshot = normalizeGroupedSessionWorkspaceSnapshot(undefined);
    await this.persist();
  }

  public async removeSession(sessionId: string): Promise<boolean> {
    const result = removeSessionInWorkspace(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async renameSessionAlias(sessionId: string, alias: string): Promise<boolean> {
    const result = renameSessionAliasInWorkspace(this.snapshot, sessionId, alias);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async setSessionTitle(sessionId: string, title: string): Promise<boolean> {
    const result = setSessionTitleInWorkspace(this.snapshot, sessionId, title);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    this.snapshot = setVisibleCountInWorkspace(this.snapshot, visibleCount);
    await this.persist();
  }

  public async toggleFullscreenSession(): Promise<void> {
    this.snapshot = toggleFullscreenSessionInWorkspace(this.snapshot);
    await this.persist();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    this.snapshot = setViewModeInWorkspace(this.snapshot, viewMode);
    await this.persist();
  }

  public async syncSessionOrder(groupId: string, sessionIds: readonly string[]): Promise<boolean> {
    const result = syncSessionOrderInWorkspace(this.snapshot, groupId, sessionIds);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<boolean> {
    const result = syncGroupOrderInWorkspace(this.snapshot, groupIds);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async moveSessionToGroup(sessionId: string, groupId: string): Promise<boolean> {
    const result = moveSessionToGroupInWorkspace(this.snapshot, sessionId, groupId);
    this.snapshot = result.snapshot;
    if (result.changed) {
      await this.persist();
    }

    return result.changed;
  }

  public async createGroupFromSession(sessionId: string): Promise<string | undefined> {
    const result = createGroupFromSessionInWorkspace(this.snapshot, sessionId);
    this.snapshot = result.snapshot;
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
