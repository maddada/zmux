import { createHash } from "node:crypto";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { createEditorLayoutPlan } from "../shared/editor-layout";
import {
  MAX_SESSION_COUNT,
  clampSidebarThemeSetting,
  createSessionAlias,
  createSidebarHudState,
  getVisiblePrimaryTitle,
  getOrderedSessions,
  getSessionShortcutLabel,
  resolveSidebarTheme,
  type ExtensionToSidebarMessage,
  type SessionGridDirection,
  type SessionGroupRecord,
  type SessionRecord,
  type SidebarSessionGroup,
  type SidebarThemeVariant,
  type SidebarToExtensionMessage,
  type SidebarSessionItem,
  type TerminalViewMode,
  type VisibleSessionCount,
} from "../shared/session-grid-contract";
import type {
  TerminalSessionSnapshot,
  TerminalAgentStatus,
  TerminalSessionStatus,
} from "../shared/terminal-host-protocol";
import { SessionGridStore } from "./session-grid-store";
import { SessionSidebarViewProvider } from "./session-sidebar-view";
import { TerminalHostClient } from "./terminal-host-client";

const DEFAULT_TERMINAL_COLS = 120;
const DEFAULT_TERMINAL_ROWS = 34;
const FOCUSED_TERMINAL_FLASH_FRAME_DURATION_MS = 120;
const DEFAULT_FOCUSED_TERMINAL_FLASH_MARKERS = ["🟥", "🟩", "🟨", "🟦", "🟪", "⬜"] as const;
const MINUTE_IN_MS = 60_000;
const SETTINGS_SECTION = "agentCanvasX";
const BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING = "backgroundSessionTimeoutMinutes";
const SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING = "sendRenameCommandOnSidebarRename";
const SIDEBAR_THEME_SETTING = "sidebarTheme";
const SHOW_TERMINAL_TITLE_INDICATOR_ON_SIDEBAR_ACTIVATE_SETTING =
  "showTerminalTitleIndicatorOnSidebarActivate";
const TERMINAL_TITLE_INDICATOR_MARKERS_SETTING = "terminalTitleIndicatorMarkers";
const SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING = "showCloseButtonOnSessionCards";
const SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING = "showHotkeysOnSessionCards";
const SESSIONS_VIEW_ID = "agentCanvasX.sessions";
const SHORTCUT_LABEL_PLATFORM = process.platform === "darwin" ? "mac" : "default";

type SessionProjection = {
  bridge: SessionTerminalBridge;
  terminal: vscode.Terminal;
};

export class NativeTerminalWorkspaceController implements vscode.Disposable {
  private hasApprovedUntrustedShells = vscode.workspace.isTrusted;
  private readonly client: TerminalHostClient;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly projections = new Map<string, SessionProjection>();
  private readonly sessions = new Map<string, TerminalSessionSnapshot>();
  private readonly store: SessionGridStore;
  private readonly terminalToSessionId = new Map<vscode.Terminal, string>();
  public readonly sidebarProvider: SessionSidebarViewProvider;
  private readonly workspaceId: string;

  public constructor(context: vscode.ExtensionContext) {
    this.store = new SessionGridStore(context);
    this.workspaceId = getWorkspaceId();
    this.client = new TerminalHostClient({
      daemonScriptPath: path.join(
        context.extensionUri.fsPath,
        "out",
        "extension",
        "terminal-host-daemon.js",
      ),
      storagePath: context.globalStorageUri.fsPath,
    });
    this.sidebarProvider = new SessionSidebarViewProvider({
      onMessage: async (message) => this.handleSidebarMessage(message),
    });

    this.client.on("sessionOutput", (event) => {
      const previousSession = this.sessions.get(event.sessionId);
      const nextSession = previousSession
        ? {
            ...previousSession,
            history: `${previousSession.history ?? ""}${event.data}`.slice(-200_000),
          }
        : createDisconnectedSessionSnapshot(event.sessionId, this.workspaceId);

      this.sessions.set(event.sessionId, nextSession);
      this.projections.get(event.sessionId)?.bridge.write(event.data);
      void this.refreshSidebar();
    });

    this.client.on("sessionState", (event) => {
      if (event.session.workspaceId !== this.workspaceId) {
        return;
      }

      this.sessions.set(event.session.sessionId, event.session);
      if (
        event.session.agentStatus === "attention" &&
        this.shouldAcknowledgeSessionAttention(event.session.sessionId)
      ) {
        void this.acknowledgeSessionAttention(event.session.sessionId);
        return;
      }

      void this.refreshSidebar();
    });

    this.disposables.push(
      { dispose: () => void this.client.dispose() },
      this.sidebarProvider,
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(getBackgroundSessionTimeoutConfigurationKey())) {
          void this.syncDaemonConfiguration();
        }

        if (
          event.affectsConfiguration(getSidebarThemeConfigurationKey()) ||
          event.affectsConfiguration(getShowCloseButtonOnSessionCardsConfigurationKey()) ||
          event.affectsConfiguration(getShowHotkeysOnSessionCardsConfigurationKey())
        ) {
          void this.refreshSidebar("hydrate");
        }
      }),
      vscode.window.onDidChangeActiveColorTheme(() => {
        void this.refreshSidebar("hydrate");
      }),
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        const sessionId = terminal ? this.terminalToSessionId.get(terminal) : undefined;
        if (!sessionId) {
          return;
        }

        void this.handleProjectedTerminalActivated(sessionId);
      }),
      vscode.window.onDidCloseTerminal((terminal) => {
        const sessionId = this.terminalToSessionId.get(terminal);
        if (!sessionId) {
          return;
        }

        this.terminalToSessionId.delete(terminal);
        const projection = this.projections.get(sessionId);
        if (projection?.terminal === terminal) {
          projection.bridge.dispose();
          this.projections.delete(sessionId);
        }
      }),
    );
  }

  public async initialize(): Promise<void> {
    await this.syncDaemonConfiguration();
    await this.loadLiveSessions();
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar("hydrate");
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    this.disposeAllProjections();
  }

  public async createSession(): Promise<void> {
    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      return;
    }

    await this.createOrAttachSession(sessionRecord.sessionId);
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async focusDirection(direction: SessionGridDirection): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusDirection(direction);
    if (!changed) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds);
    await this.refreshSidebar();
  }

  public async focusSession(sessionId: string, preserveFocus = false): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusSession(sessionId);
    if (changed) {
      await this.updateFocusedTerminal(previousVisibleSessionIds, preserveFocus);
    }

    const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);
    if (changed && !acknowledgedAttention) {
      await this.refreshSidebar();
    }
  }

  public async focusSessionSlot(slotNumber: number): Promise<void> {
    const normalizedSlotNumber = Math.max(1, Math.min(MAX_SESSION_COUNT, Math.floor(slotNumber)));
    const session = getOrderedSessions(this.getActiveSnapshot()).find(
      (sessionRecord) => sessionRecord.slotIndex === normalizedSlotNumber - 1,
    );
    if (!session) {
      return;
    }

    await this.focusSession(session.sessionId);
  }

  public async openWorkspace(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.agentCanvasXSessions");

    if (this.getAllSessionRecords().length === 0) {
      await this.createSession();
      return;
    }

    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async revealSession(sessionId?: string): Promise<void> {
    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Reveal session"));
    if (!resolvedSessionId) {
      return;
    }

    await this.focusSession(resolvedSessionId);
  }

  public async resetWorkspace(): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      "Reset Agent Canvas X sessions?",
      {
        detail:
          "This clears the saved session grid for the current workspace and kills all detached shells owned by it.",
        modal: true,
      },
      "Reset",
    );

    if (!confirmation) {
      return;
    }

    for (const sessionRecord of this.getAllSessionRecords()) {
      try {
        await this.client.kill(sessionRecord.sessionId);
      } catch {
        // ignore stale daemon sessions during reset
      }
    }

    this.sessions.clear();
    this.disposeAllProjections();
    await this.store.reset();
    await this.refreshSidebar();
  }

  public async restartSession(sessionId: string): Promise<void> {
    try {
      await this.client.kill(sessionId);
    } catch {
      // ignore stale daemon sessions and recreate below
    }

    this.sessions.delete(sessionId);
    this.disposeProjection(sessionId);
    await this.createOrAttachSession(sessionId);
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async restartSessionFromCommand(sessionId?: string): Promise<void> {
    const resolvedSessionId = sessionId ?? (await this.promptForSessionId("Restart session"));
    if (!resolvedSessionId) {
      return;
    }

    await this.restartSession(resolvedSessionId);
  }

  public async renameSession(sessionId: string, title: string): Promise<void> {
    const nextAlias = title.trim();
    if (!nextAlias) {
      return;
    }

    const changed = await this.store.renameSessionAlias(sessionId, nextAlias);
    if (!changed) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (sessionRecord) {
      this.projections.get(sessionId)?.bridge.setName(getSessionTabTitle(sessionRecord));
    }

    if (getSendRenameCommandOnSidebarRename()) {
      await this.writePendingRenameCommand(sessionId, nextAlias);
      await this.focusSession(sessionId);
    }

    await this.refreshSidebar();
  }

  public async promptRenameSession(sessionId: string): Promise<void> {
    const session = this.store.getSession(sessionId);
    if (!session) {
      return;
    }

    const title = await vscode.window.showInputBox({
      prompt: "Enter a session nickname",
      title: "Rename VSC-Mux Session",
      validateInput: (value) =>
        value.trim().length === 0 ? "Session nickname cannot be empty." : undefined,
      value: session.alias,
      valueSelection: [0, session.alias.length],
    });
    if (title === undefined) {
      return;
    }

    await this.renameSession(sessionId, title);
  }

  public async promptRenameFocusedSession(): Promise<void> {
    const session =
      this.store.getFocusedSession() ?? getOrderedSessions(this.getActiveSnapshot())[0];
    if (!session) {
      void vscode.window.showInformationMessage("No sessions are available yet.");
      return;
    }

    await this.promptRenameSession(session.sessionId);
  }

  public async closeSession(sessionId: string): Promise<void> {
    const removed = await this.store.removeSession(sessionId);
    if (!removed) {
      return;
    }

    this.disposeProjection(sessionId);

    try {
      await this.client.kill(sessionId);
    } catch {
      // ignore stale daemon sessions and continue removing local state
    }

    this.sessions.delete(sessionId);
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async setVisibleCount(visibleCount: VisibleSessionCount): Promise<void> {
    await this.store.setVisibleCount(visibleCount);
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async toggleFullscreenSession(): Promise<void> {
    await this.store.toggleFullscreenSession();
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async setViewMode(viewMode: TerminalViewMode): Promise<void> {
    await this.store.setViewMode(viewMode);
    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async openSettings(): Promise<void> {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:maddada.agent-canvas-x",
    );
  }

  public async focusGroup(groupId: string): Promise<void> {
    if (!this.store.getGroup(groupId)) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusGroup(groupId);
    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async focusGroupByIndex(groupIndex: number): Promise<void> {
    if (!this.store.getSnapshot().groups[groupIndex - 1]) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.focusGroupByIndex(groupIndex);
    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  public async renameGroup(groupId: string, title: string): Promise<void> {
    const changed = await this.store.renameGroup(groupId, title);
    if (!changed) {
      return;
    }

    await this.refreshSidebar();
  }

  public async syncSessionOrder(groupId: string, sessionIds: readonly string[]): Promise<void> {
    const changed = await this.store.syncSessionOrder(groupId, sessionIds);
    if (!changed) {
      return;
    }

    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  public async syncGroupOrder(groupIds: readonly string[]): Promise<void> {
    const changed = await this.store.syncGroupOrder(groupIds);
    if (!changed) {
      return;
    }

    await this.refreshSidebar();
  }

  public async moveSessionToGroup(sessionId: string, groupId: string): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const changed = await this.store.moveSessionToGroup(sessionId, groupId);
    if (!changed) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async createGroupFromSession(sessionId: string): Promise<void> {
    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    const groupId = await this.store.createGroupFromSession(sessionId);
    if (!groupId) {
      return;
    }

    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async createSessionInGroup(groupId: string): Promise<void> {
    if (!this.store.getGroup(groupId)) {
      return;
    }

    const previousVisibleSessionIds = this.getActiveSnapshot().visibleSessionIds;
    await this.store.focusGroup(groupId);

    const sessionRecord = await this.store.createSession();
    if (!sessionRecord) {
      void vscode.window.showWarningMessage("The workspace already has 9 sessions.");
      await this.updateFocusedTerminal(previousVisibleSessionIds, false);
      await this.refreshSidebar();
      return;
    }

    await this.createOrAttachSession(sessionRecord.sessionId);
    await this.updateFocusedTerminal(previousVisibleSessionIds, false);
    await this.refreshSidebar();
  }

  public async closeGroup(groupId: string): Promise<void> {
    const group = this.store.getGroup(groupId);
    if (!group || this.store.getSnapshot().groups.length <= 1) {
      return;
    }

    for (const sessionRecord of group.snapshot.sessions) {
      this.disposeProjection(sessionRecord.sessionId);

      try {
        await this.client.kill(sessionRecord.sessionId);
      } catch {
        // ignore stale daemon sessions and continue removing local state
      }

      this.sessions.delete(sessionRecord.sessionId);
    }

    const removed = await this.store.removeGroup(groupId);
    if (!removed) {
      return;
    }

    await this.reconcileVisibleTerminals();
    await this.refreshSidebar();
  }

  private async createOrAttachSession(sessionId: string): Promise<TerminalSessionSnapshot> {
    if (!(await this.ensureShellSpawnAllowed())) {
      const blockedSession = createBlockedSessionSnapshot(sessionId, this.workspaceId);
      this.sessions.set(sessionId, blockedSession);
      return blockedSession;
    }

    try {
      await this.client.ensureConnected();
      const session = await this.client.createOrAttach({
        cols: DEFAULT_TERMINAL_COLS,
        cwd: getDefaultWorkspaceCwd(),
        rows: DEFAULT_TERMINAL_ROWS,
        sessionId,
        shell: getDefaultShell(),
        workspaceId: this.workspaceId,
      });
      this.sessions.set(sessionId, session);
      return session;
    } catch (error) {
      const erroredSession = {
        ...createDisconnectedSessionSnapshot(sessionId, this.workspaceId),
        errorMessage: getErrorMessage(error),
        startedAt: new Date().toISOString(),
        status: "error" as const,
      };
      this.sessions.set(sessionId, erroredSession);
      return erroredSession;
    }
  }

  private createSidebarMessage(
    type: ExtensionToSidebarMessage["type"] = "sessionState",
  ): ExtensionToSidebarMessage {
    const workspaceSnapshot = this.store.getSnapshot();
    const activeSnapshot = this.getActiveSnapshot();

    return {
      hud: createSidebarHudState(
        activeSnapshot,
        resolveSidebarTheme(getSidebarThemeSetting(), getSidebarThemeVariant()),
        getShowCloseButtonOnSessionCards(),
        getShowHotkeysOnSessionCards(),
      ),
      groups: workspaceSnapshot.groups.map((group) => this.createSidebarGroup(group)),
      type,
    };
  }

  private createSidebarGroup(group: SessionGroupRecord): SidebarSessionGroup {
    return {
      groupId: group.groupId,
      isActive: this.store.getSnapshot().activeGroupId === group.groupId,
      sessions: getOrderedSessions(group.snapshot).map((session) =>
        this.createSidebarItem(group, session),
      ),
      title: group.title,
    };
  }

  private createSidebarItem(
    group: SessionGroupRecord,
    sessionRecord: SessionRecord,
  ): SidebarSessionItem {
    const sessionSnapshot =
      this.sessions.get(sessionRecord.sessionId) ??
      createDisconnectedSessionSnapshot(sessionRecord.sessionId, this.workspaceId);
    const activeSnapshot = this.getActiveSnapshot();
    const isActiveGroup = this.store.getSnapshot().activeGroupId === group.groupId;

    return {
      activity: sessionSnapshot.agentStatus,
      activityLabel: getSessionActivityLabel(
        sessionSnapshot.agentStatus,
        sessionSnapshot.agentName,
      ),
      alias: sessionRecord.alias,
      column: sessionRecord.column,
      detail: sessionSnapshot.errorMessage,
      isFocused: isActiveGroup && activeSnapshot.focusedSessionId === sessionRecord.sessionId,
      isRunning: sessionSnapshot.status === "running",
      isVisible:
        isActiveGroup && activeSnapshot.visibleSessionIds.includes(sessionRecord.sessionId),
      primaryTitle: getVisiblePrimaryTitle(sessionRecord.title),
      row: sessionRecord.row,
      sessionId: sessionRecord.sessionId,
      shortcutLabel: getSessionShortcutLabel(sessionRecord.slotIndex, SHORTCUT_LABEL_PLATFORM),
    };
  }

  private disposeAllProjections(): void {
    for (const sessionId of this.projections.keys()) {
      this.disposeProjection(sessionId);
    }
  }

  private disposeProjection(sessionId: string): void {
    const projection = this.projections.get(sessionId);
    if (!projection) {
      return;
    }

    this.terminalToSessionId.delete(projection.terminal);
    projection.bridge.dispose();
    projection.terminal.dispose();
    this.projections.delete(sessionId);
  }

  private async ensureSessionShell(sessionId: string): Promise<TerminalSessionSnapshot> {
    const existingSession = this.sessions.get(sessionId);
    if (
      existingSession &&
      existingSession.status !== "disconnected" &&
      existingSession.status !== "error"
    ) {
      return existingSession;
    }

    return this.createOrAttachSession(sessionId);
  }

  private async ensureShellSpawnAllowed(): Promise<boolean> {
    if (vscode.workspace.isTrusted || this.hasApprovedUntrustedShells) {
      this.hasApprovedUntrustedShells = true;
      return true;
    }

    const approval = await vscode.window.showWarningMessage(
      "Agent Canvas X is about to start a shell in an untrusted workspace.",
      {
        detail:
          "Shell sessions can run commands against files in this workspace. Trust the workspace or explicitly allow shell access to continue.",
        modal: true,
      },
      "Allow Shell Access",
    );

    if (!approval) {
      return false;
    }

    this.hasApprovedUntrustedShells = true;
    return true;
  }

  private async handleSidebarMessage(message: SidebarToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        await this.refreshSidebar("hydrate");
        return;

      case "createSession":
        await this.createSession();
        return;

      case "createSessionInGroup":
        await this.createSessionInGroup(message.groupId);
        return;

      case "focusGroup":
        await this.focusGroup(message.groupId);
        return;

      case "toggleFullscreenSession":
        await this.toggleFullscreenSession();
        return;

      case "openSettings":
        await this.openSettings();
        return;

      case "focusSession":
        if (message.sessionId) {
          await this.focusSession(message.sessionId, message.preserveFocus === true);
          await this.flashSidebarFocusedTerminal(message.sessionId);
        }
        return;

      case "promptRenameSession":
        if (message.sessionId) {
          await this.promptRenameSession(message.sessionId);
        }
        return;

      case "restartSession":
        if (message.sessionId) {
          await this.restartSession(message.sessionId);
        }
        return;

      case "renameSession":
        if (message.sessionId) {
          await this.renameSession(message.sessionId, message.title);
        }
        return;

      case "renameGroup":
        await this.renameGroup(message.groupId, message.title);
        return;

      case "closeGroup":
        await this.closeGroup(message.groupId);
        return;

      case "closeSession":
        if (message.sessionId) {
          await this.closeSession(message.sessionId);
        }
        return;

      case "moveSessionToGroup":
        await this.moveSessionToGroup(message.sessionId, message.groupId);
        return;

      case "createGroupFromSession":
        await this.createGroupFromSession(message.sessionId);
        return;

      case "setVisibleCount":
        if (message.visibleCount) {
          await this.setVisibleCount(message.visibleCount);
        }
        return;

      case "setViewMode":
        if (message.viewMode) {
          await this.setViewMode(message.viewMode);
        }
        return;

      case "syncSessionOrder":
        await this.syncSessionOrder(message.groupId, message.sessionIds);
        return;

      case "syncGroupOrder":
        await this.syncGroupOrder(message.groupIds);
        return;
    }
  }

  private async loadLiveSessions(): Promise<void> {
    try {
      await this.client.ensureConnected();
    } catch {
      return;
    }

    for (const session of await this.client.listSessions()) {
      if (session.workspaceId !== this.workspaceId) {
        continue;
      }

      this.sessions.set(session.sessionId, session);
    }
  }

  private async refreshSidebar(
    type: ExtensionToSidebarMessage["type"] = "sessionState",
  ): Promise<void> {
    await this.sidebarProvider.postMessage(this.createSidebarMessage(type));
  }

  private async acknowledgeSessionAttention(sessionId: string): Promise<boolean> {
    const sessionSnapshot = this.sessions.get(sessionId);
    if (!sessionSnapshot || sessionSnapshot.agentStatus !== "attention") {
      return false;
    }

    this.sessions.set(sessionId, {
      ...sessionSnapshot,
      agentStatus: "idle",
    });

    try {
      await this.client.acknowledgeAttention(sessionId);
    } catch {
      // ignore daemon disconnects; local optimistic state is sufficient here
    }

    await this.refreshSidebar();
    return true;
  }

  private async handleProjectedTerminalActivated(sessionId: string): Promise<void> {
    const changed = await this.store.focusSession(sessionId);
    const acknowledgedAttention = await this.acknowledgeSessionAttention(sessionId);

    if (changed && !acknowledgedAttention) {
      await this.refreshSidebar();
    }
  }

  private shouldAcknowledgeSessionAttention(sessionId: string): boolean {
    const snapshot = this.getActiveSnapshot();
    if (snapshot.focusedSessionId === sessionId && snapshot.visibleSessionIds.includes(sessionId)) {
      return true;
    }

    const activeTerminal = vscode.window.activeTerminal;
    return !!activeTerminal && this.terminalToSessionId.get(activeTerminal) === sessionId;
  }

  private async syncDaemonConfiguration(): Promise<void> {
    try {
      await this.client.ensureConnected();
      await this.client.configure({
        idleShutdownTimeoutMs: getBackgroundSessionTimeoutMs(),
      });
    } catch {
      // leave the existing daemon state untouched if it cannot be reached
    }
  }

  private async writePendingRenameCommand(sessionId: string, alias: string): Promise<void> {
    const sessionSnapshot = this.sessions.get(sessionId);
    if (!sessionSnapshot || sessionSnapshot.status !== "running") {
      return;
    }

    try {
      await this.client.write(sessionId, `/rename ${alias}`);
    } catch {
      // keep the local alias change even if the backing shell cannot be reached
    }
  }

  private async syncSessionTitle(sessionId: string, title: string): Promise<void> {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    const sessionRecord = this.store.getSession(sessionId);
    if (!sessionRecord || sessionRecord.title === nextTitle) {
      return;
    }

    const changed = await this.store.setSessionTitle(sessionId, nextTitle);
    if (changed) {
      await this.refreshSidebar();
    }
  }

  private async updateFocusedTerminal(
    previousVisibleSessionIds: readonly string[],
    preserveFocus = false,
  ): Promise<void> {
    const snapshot = this.getActiveSnapshot();

    if (
      haveSameSessionIds(previousVisibleSessionIds, snapshot.visibleSessionIds) &&
      snapshot.visibleSessionIds.every((sessionId) => this.projections.has(sessionId))
    ) {
      const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
      this.projections.get(focusedSessionId ?? "")?.terminal.show(preserveFocus);
      return;
    }

    await this.reconcileVisibleTerminals(preserveFocus);
  }

  private async promptForSessionId(title: string): Promise<string | undefined> {
    const sessions = this.store.getSnapshot().groups.flatMap((group) =>
      getOrderedSessions(group.snapshot).map((session) => ({
        groupTitle: group.title,
        session,
      })),
    );
    if (sessions.length === 0) {
      void vscode.window.showInformationMessage("No sessions are available yet.");
      return undefined;
    }

    const selection = await vscode.window.showQuickPick(
      sessions.map(({ groupTitle, session }) => ({
        description: `${groupTitle} · ${session.alias} · R${session.row + 1}C${session.column + 1}`,
        label: session.title,
        sessionId: session.sessionId,
      })),
      {
        placeHolder: title,
        title: `Agent Canvas X: ${title}`,
      },
    );

    return selection?.sessionId;
  }

  private async reconcileVisibleTerminals(preserveFocus = false): Promise<void> {
    const snapshot = this.getActiveSnapshot();
    this.disposeAllProjections();

    if (snapshot.visibleSessionIds.length === 0) {
      return;
    }

    await applyEditorLayout(snapshot.visibleSessionIds.length, snapshot.viewMode);

    for (let index = 0; index < snapshot.visibleSessionIds.length; index += 1) {
      const sessionId = snapshot.visibleSessionIds[index];
      const sessionRecord = snapshot.sessions.find((session) => session.sessionId === sessionId);
      if (!sessionRecord) {
        continue;
      }

      const sessionSnapshot = await this.ensureSessionShell(sessionId);
      const terminalTabTitle = getSessionTabTitle(sessionRecord);
      const bridge = new SessionTerminalBridge({
        history: sessionSnapshot.history ?? "",
        name: terminalTabTitle,
        onClose: () => {
          this.projections.delete(sessionId);
        },
        onInput: async (data) => {
          const liveSession = this.sessions.get(sessionId);
          if (!liveSession || liveSession.status !== "running" || data.length === 0) {
            return;
          }

          await this.client.write(sessionId, data);
        },
        onResize: async (cols, rows) => {
          const liveSession = this.sessions.get(sessionId);
          if (!liveSession || liveSession.status !== "running") {
            return;
          }

          if (liveSession.cols === cols && liveSession.rows === rows) {
            return;
          }

          const resizedSession = {
            ...liveSession,
            cols,
            rows,
          };

          this.sessions.set(sessionId, resizedSession);

          try {
            await this.client.resize(sessionId, cols, rows);
          } catch (error) {
            this.sessions.set(sessionId, liveSession);
            throw error;
          }
        },
        onTitleChange: async (title) => {
          await this.syncSessionTitle(sessionId, title);
        },
      });
      const terminal = vscode.window.createTerminal({
        iconPath: new vscode.ThemeIcon("terminal"),
        isTransient: true,
        location: {
          preserveFocus: true,
          viewColumn: getViewColumn(index),
        },
        name: terminalTabTitle,
        pty: bridge,
      });

      this.projections.set(sessionId, { bridge, terminal });
      this.terminalToSessionId.set(terminal, sessionId);
      terminal.show(true);
    }

    const focusedSessionId = snapshot.focusedSessionId ?? snapshot.visibleSessionIds[0];
    this.projections.get(focusedSessionId)?.terminal.show(preserveFocus);
  }

  private async flashSidebarFocusedTerminal(sessionId: string): Promise<void> {
    const snapshot = this.getActiveSnapshot();
    if (
      !getShowTerminalTitleIndicatorOnSidebarActivate() ||
      snapshot.visibleSessionIds.length <= 1 ||
      !snapshot.visibleSessionIds.includes(sessionId)
    ) {
      return;
    }

    this.projections.get(sessionId)?.bridge.flash(getTerminalTitleIndicatorMarkers());
  }

  private getActiveSnapshot() {
    return this.store.getActiveGroup()?.snapshot ?? createEmptyWorkspaceSessionSnapshot();
  }

  private getAllSessionRecords(): SessionRecord[] {
    return this.store.getSnapshot().groups.flatMap((group) => getOrderedSessions(group.snapshot));
  }
}

type SessionTerminalBridgeOptions = {
  history: string;
  name: string;
  onClose: () => void;
  onInput: (data: string) => Promise<void>;
  onResize: (cols: number, rows: number) => Promise<void>;
  onTitleChange: (title: string) => Promise<void>;
};

class SessionTerminalBridge implements vscode.Disposable, vscode.Pseudoterminal {
  private readonly closeEmitter = new vscode.EventEmitter<number | void>();
  private readonly nameEmitter = new vscode.EventEmitter<string>();
  private readonly writeEmitter = new vscode.EventEmitter<string>();
  private hasReplayedHistory = false;
  private flashTimeout: NodeJS.Timeout | undefined;
  private isFlashingName = false;
  private pendingOutput = "";
  private stableName: string;
  public readonly onDidChangeName = this.nameEmitter.event;
  public readonly onDidClose = this.closeEmitter.event;
  public readonly onDidWrite = this.writeEmitter.event;
  private isOpen = false;

  public constructor(private readonly options: SessionTerminalBridgeOptions) {
    this.stableName = options.name;
  }

  public close(): void {
    this.options.onClose();
    this.closeEmitter.fire();
  }

  public dispose(): void {
    if (this.flashTimeout) {
      clearTimeout(this.flashTimeout);
      this.flashTimeout = undefined;
    }

    this.closeEmitter.dispose();
    this.nameEmitter.dispose();
    this.writeEmitter.dispose();
  }

  public flash(markers: readonly string[]): void {
    if (!this.isOpen) {
      return;
    }

    if (this.flashTimeout) {
      clearTimeout(this.flashTimeout);
    }

    this.isFlashingName = true;
    let frameIndex = 0;
    const effectiveMarkers = markers.length > 0 ? markers : DEFAULT_FOCUSED_TERMINAL_FLASH_MARKERS;

    const emitFrame = () => {
      if (!this.isOpen) {
        this.isFlashingName = false;
        this.flashTimeout = undefined;
        return;
      }

      const marker = effectiveMarkers[frameIndex];
      this.nameEmitter.fire(`${marker} ${this.stableName} ${marker}`);

      frameIndex += 1;
      if (frameIndex >= effectiveMarkers.length) {
        this.isFlashingName = false;
        this.flashTimeout = undefined;
        this.nameEmitter.fire(this.stableName);
        return;
      }

      this.flashTimeout = setTimeout(emitFrame, FOCUSED_TERMINAL_FLASH_FRAME_DURATION_MS);
    };

    emitFrame();
  }

  public setName(name: string): void {
    if (this.stableName === name) {
      return;
    }

    this.stableName = name;
    if (!this.isFlashingName) {
      this.nameEmitter.fire(name);
    }
  }

  public handleInput(data: string): void {
    void this.options.onInput(data);
  }

  public open(): void {
    this.isOpen = true;
    if (!this.hasReplayedHistory && this.options.history.length > 0) {
      this.hasReplayedHistory = true;
      const replayOutput = this.consumeOutput(this.options.history);
      if (replayOutput.length > 0) {
        this.writeEmitter.fire(replayOutput);
      }
    }
  }

  public setDimensions(dimensions: vscode.TerminalDimensions | undefined): void {
    if (!dimensions) {
      return;
    }

    void this.options.onResize(dimensions.columns, dimensions.rows);
  }

  public write(data: string): void {
    if (!this.isOpen || data.length === 0) {
      return;
    }

    const output = this.consumeOutput(data);
    if (output.length > 0) {
      this.writeEmitter.fire(output);
    }
  }

  private consumeOutput(data: string): string {
    const parsedChunk = parseTerminalOutputChunk(`${this.pendingOutput}${data}`);
    this.pendingOutput = parsedChunk.pending;

    for (const title of parsedChunk.titles) {
      void this.options.onTitleChange(title);
    }

    return parsedChunk.output;
  }
}

type ParsedTerminalOutputChunk = {
  output: string;
  pending: string;
  titles: string[];
};

async function applyEditorLayout(visibleCount: number, viewMode: TerminalViewMode): Promise<void> {
  const layoutPlan = createEditorLayoutPlan(visibleCount, viewMode);
  await vscode.commands.executeCommand("workbench.action.joinAllGroups");
  await vscode.commands.executeCommand("vscode.setEditorLayout", layoutPlan.layout);
}

function parseTerminalOutputChunk(data: string): ParsedTerminalOutputChunk {
  let index = 0;
  let output = "";
  const titles: string[] = [];

  while (index < data.length) {
    if (data[index] !== "\u001b" || data[index + 1] !== "]") {
      output += data[index];
      index += 1;
      continue;
    }

    const controlStart = index;
    const terminator = findOscTerminator(data, controlStart + 2);
    if (!terminator) {
      return {
        output,
        pending: data.slice(controlStart),
        titles,
      };
    }

    const controlBody = data.slice(controlStart + 2, terminator.contentEnd);
    const sequence = data.slice(controlStart, terminator.sequenceEnd);
    const separatorIndex = controlBody.indexOf(";");
    const command = separatorIndex >= 0 ? controlBody.slice(0, separatorIndex) : controlBody;
    const title = separatorIndex >= 0 ? controlBody.slice(separatorIndex + 1).trim() : "";

    if ((command === "0" || command === "2") && title.length > 0) {
      titles.push(title);
    } else {
      output += sequence;
    }

    index = terminator.sequenceEnd;
  }

  return {
    output,
    pending: "",
    titles,
  };
}

function findOscTerminator(
  data: string,
  startIndex: number,
): { contentEnd: number; sequenceEnd: number } | undefined {
  for (let index = startIndex; index < data.length; index += 1) {
    const currentCharacter = data[index];
    if (currentCharacter === "\u0007") {
      return {
        contentEnd: index,
        sequenceEnd: index + 1,
      };
    }

    if (currentCharacter === "\u001b" && data[index + 1] === "\\") {
      return {
        contentEnd: index,
        sequenceEnd: index + 2,
      };
    }
  }

  return undefined;
}

function haveSameSessionIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((sessionId, index) => sessionId === right[index]);
}

function createEmptyWorkspaceSessionSnapshot() {
  return {
    focusedSessionId: undefined,
    fullscreenRestoreVisibleCount: undefined,
    sessions: [],
    visibleCount: 1 as const,
    visibleSessionIds: [],
    viewMode: "grid" as const,
  };
}

function createBlockedSessionSnapshot(
  sessionId: string,
  workspaceId: string,
): TerminalSessionSnapshot {
  return {
    ...createDisconnectedSessionSnapshot(sessionId, workspaceId),
    errorMessage: "Shell creation blocked in an untrusted workspace.",
    status: "error",
  };
}

function createDisconnectedSessionSnapshot(
  sessionId: string,
  workspaceId: string,
  status: TerminalSessionStatus = "disconnected",
): TerminalSessionSnapshot {
  return {
    agentName: undefined,
    agentStatus: "idle",
    cols: DEFAULT_TERMINAL_COLS,
    cwd: getDefaultWorkspaceCwd(),
    history: "",
    restoreState: "replayed",
    rows: DEFAULT_TERMINAL_ROWS,
    sessionId,
    shell: getDefaultShell(),
    startedAt: new Date(0).toISOString(),
    status,
    workspaceId,
  };
}

function getSessionActivityLabel(
  activity: TerminalAgentStatus,
  agentName: string | undefined,
): string | undefined {
  const resolvedAgentName = agentName?.trim();
  const titleCaseAgentName = resolvedAgentName
    ? `${resolvedAgentName.slice(0, 1).toUpperCase()}${resolvedAgentName.slice(1)}`
    : "Agent";

  switch (activity) {
    case "working":
      return `${titleCaseAgentName} active`;
    case "attention":
      return `${titleCaseAgentName} needs attention`;
    default:
      return undefined;
  }
}

function getSessionTabTitle(session: SessionRecord): string {
  const sessionNumber = getSessionNumber(session.sessionId);
  if (sessionNumber === undefined) {
    return session.alias;
  }

  const defaultAlias = createSessionAlias(sessionNumber, session.slotIndex);
  if (session.alias !== defaultAlias) {
    return session.alias;
  }

  return `Session ${sessionNumber}`;
}

function getDefaultShell(): string {
  const configuredShell = process.env.SHELL?.trim();
  if (configuredShell) {
    return configuredShell;
  }

  return process.platform === "win32" ? "powershell.exe" : "/bin/zsh";
}

function getBackgroundSessionTimeoutConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING}`;
}

function getSidebarThemeConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SIDEBAR_THEME_SETTING}`;
}

function getSidebarThemeVariant(): SidebarThemeVariant {
  switch (vscode.window.activeColorTheme.kind) {
    case vscode.ColorThemeKind.Light:
    case vscode.ColorThemeKind.HighContrastLight:
      return "light";
    default:
      return "dark";
  }
}

function getShowCloseButtonOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING}`;
}

function getShowHotkeysOnSessionCardsConfigurationKey(): string {
  return `${SETTINGS_SECTION}.${SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING}`;
}

function getBackgroundSessionTimeoutMs(): number | null {
  const configuredMinutes = vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<number>(BACKGROUND_SESSION_TIMEOUT_MINUTES_SETTING, 0);

  if (!Number.isFinite(configuredMinutes) || configuredMinutes <= 0) {
    return null;
  }

  return Math.floor(configuredMinutes * MINUTE_IN_MS);
}

function getSidebarThemeSetting() {
  const configuredTheme = vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<string>(SIDEBAR_THEME_SETTING, "auto");

  return clampSidebarThemeSetting(configuredTheme);
}

function getSendRenameCommandOnSidebarRename(): boolean {
  return vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<boolean>(SEND_RENAME_COMMAND_ON_SIDEBAR_RENAME_SETTING, true);
}

function getShowTerminalTitleIndicatorOnSidebarActivate(): boolean {
  return vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<boolean>(SHOW_TERMINAL_TITLE_INDICATOR_ON_SIDEBAR_ACTIVATE_SETTING, true);
}

function getTerminalTitleIndicatorMarkers(): string[] {
  const configuredMarkers = vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<string>(
      TERMINAL_TITLE_INDICATOR_MARKERS_SETTING,
      DEFAULT_FOCUSED_TERMINAL_FLASH_MARKERS.join(" "),
    );

  return parseTerminalTitleIndicatorMarkers(configuredMarkers);
}

function getShowCloseButtonOnSessionCards(): boolean {
  return vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<boolean>(SHOW_CLOSE_BUTTON_ON_SESSION_CARDS_SETTING, false);
}

function getShowHotkeysOnSessionCards(): boolean {
  return vscode.workspace
    .getConfiguration(SETTINGS_SECTION)
    .get<boolean>(SHOW_HOTKEYS_ON_SESSION_CARDS_SETTING, false);
}

function getDefaultWorkspaceCwd(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? os.homedir();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseTerminalTitleIndicatorMarkers(value: string): string[] {
  const markers = value
    .split(/[\s,]+/u)
    .map((marker) => marker.trim())
    .filter((marker) => marker.length > 0);

  return markers.length > 0 ? markers : [...DEFAULT_FOCUSED_TERMINAL_FLASH_MARKERS];
}

function getSessionNumber(sessionId: string): number | undefined {
  const match = /^session-(\d+)$/.exec(sessionId);
  if (!match) {
    return undefined;
  }

  const sessionNumber = Number.parseInt(match[1], 10);
  return Number.isInteger(sessionNumber) && sessionNumber > 0 ? sessionNumber : undefined;
}

function getViewColumn(index: number): vscode.ViewColumn {
  return Math.max(vscode.ViewColumn.One, Math.min(index + 1, vscode.ViewColumn.Nine));
}

function getWorkspaceId(): string {
  const workspaceKey =
    vscode.workspace.workspaceFile?.toString() ??
    vscode.workspace.workspaceFolders?.map((folder) => folder.uri.toString()).join("|") ??
    "no-workspace";

  return createHash("sha1").update(workspaceKey).digest("hex").slice(0, 12);
}

export { SESSIONS_VIEW_ID };
