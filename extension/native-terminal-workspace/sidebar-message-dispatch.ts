import type {
  SidebarCollapsibleSection,
  VisibleSessionCount,
  SidebarToExtensionMessage,
} from "../../shared/session-grid-contract";
import type { TerminalViewMode } from "../../shared/session-grid-contract";
import type { SidebarActionType, SidebarCommandRunMode } from "../../shared/sidebar-commands";
import type { SidebarAgentIcon } from "../../shared/sidebar-agents";
import type { SidebarCommandIcon } from "../../shared/sidebar-command-icons";
import type { SidebarGitAction } from "../../shared/sidebar-git";

export type SidebarMessageHandlers = {
  adjustTerminalFontSize: (delta: -1 | 1) => Promise<void>;
  clearGeneratedPreviousSessions: () => Promise<void>;
  closeGroup: (groupId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  confirmSidebarGitCommit: (requestId: string, message: string) => Promise<void>;
  copyResumeCommand: (sessionId: string) => Promise<void>;
  forkSession: (sessionId: string) => Promise<void>;
  generateSessionName: (sessionId: string) => Promise<void>;
  fullReloadGroup: (groupId: string) => Promise<void>;
  fullReloadSession: (sessionId: string) => Promise<void>;
  openT3SessionBrowserAccessLink: (url: string) => Promise<void>;
  setGroupSleeping: (groupId: string, sleeping: boolean) => Promise<void>;
  setSessionFavorite: (sessionId: string, favorite: boolean) => Promise<void>;
  setSessionSleeping: (sessionId: string, sleeping: boolean) => Promise<void>;
  requestT3SessionBrowserAccess: (sessionId: string) => Promise<void>;
  cancelSidebarGitCommit: (requestId: string) => Promise<void>;
  createGroup: () => Promise<void>;
  createGroupFromSession: (sessionId: string) => Promise<void>;
  createSession: () => Promise<void>;
  createSessionInGroup: (groupId: string) => Promise<void>;
  deletePreviousSession: (historyId: string) => Promise<void>;
  killDaemonSession: (workspaceId: string, sessionId: string) => Promise<void>;
  killTerminalDaemon: () => Promise<void>;
  killT3RuntimeServer: () => Promise<void>;
  killT3RuntimeSession: (sessionId: string) => Promise<void>;
  deleteSidebarAgent: (agentId: string) => Promise<void>;
  deleteSidebarCommand: (commandId: string) => Promise<void>;
  endSidebarCommandRun: (commandId: string) => Promise<void>;
  focusGroup: (groupId: string, source?: "sidebar") => Promise<void>;
  focusSession: (sessionId: string, source?: "sidebar" | "workspace") => Promise<void>;
  moveSessionToGroup: (sessionId: string, groupId: string, targetIndex?: number) => Promise<void>;
  moveSidebarToOtherSide: () => Promise<void>;
  applyRecommendedGhosttySettings: () => Promise<void>;
  openGhosttyConfigFile: () => Promise<void>;
  openGhosttySettingsDocs: () => Promise<void>;
  openBrowser: () => Promise<void>;
  openWorkspaceWelcome: () => Promise<void>;
  openSettings: () => Promise<void>;
  promptFindPreviousSession: (query?: string) => Promise<void>;
  resetGhosttySettingsToDefault: () => Promise<void>;
  promptRenameSession: (sessionId: string) => Promise<void>;
  renameGroup: (groupId: string, title: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  setT3SessionThreadId: (sessionId: string, threadId: string) => Promise<void>;
  refreshGitState: () => Promise<void>;
  refreshDaemonSessions: () => Promise<void>;
  restartSession: (sessionId: string) => Promise<void>;
  restorePreviousSession: (historyId: string) => Promise<void>;
  runSidebarAgent: (agentId: string) => Promise<void>;
  runSidebarCommand: (
    commandId: string,
    runMode?: SidebarCommandRunMode,
    worktreePath?: string,
  ) => Promise<void>;
  runSidebarGitAction: (action: SidebarGitAction) => Promise<void>;
  setSidebarGitCommitConfirmationEnabled: (enabled: boolean) => Promise<void>;
  setSidebarGitGenerateCommitBodyEnabled: (enabled: boolean) => Promise<void>;
  savePinnedPrompt: (promptId: string | undefined, title: string, content: string) => Promise<void>;
  saveScratchPad: (content: string) => Promise<void>;
  setSidebarSectionCollapsed: (
    section: SidebarCollapsibleSection,
    collapsed: boolean,
  ) => Promise<void>;
  saveSidebarAgent: (
    agentId: string | undefined,
    name: string,
    command: string,
    icon?: SidebarAgentIcon,
  ) => Promise<void>;
  saveSidebarCommand: (
    commandId: string | undefined,
    name: string,
    actionType: SidebarActionType,
    closeTerminalOnExit?: boolean,
    playCompletionSound?: boolean,
    command?: string,
    icon?: SidebarCommandIcon,
    iconColor?: string,
    isGlobal?: boolean,
    url?: string,
  ) => Promise<void>;
  syncSidebarAgentOrder: (requestId: string, agentIds: readonly string[]) => Promise<void>;
  setSidebarGitPrimaryAction: (action: SidebarGitAction) => Promise<void>;
  toggleActiveSessionsSortMode: () => Promise<void>;
  toggleShowLastInteractionTimeOnSessionCards: () => Promise<void>;
  setViewMode: (viewMode: TerminalViewMode) => Promise<void>;
  setVisibleCount: (visibleCount: VisibleSessionCount) => Promise<void>;
  syncGroupOrder: (groupIds: readonly string[]) => Promise<void>;
  syncSessionOrder: (groupId: string, sessionIds: readonly string[]) => Promise<void>;
  syncSidebarCommandOrder: (requestId: string, commandIds: readonly string[]) => Promise<void>;
  toggleCompletionBell: () => Promise<void>;
  toggleFullscreenSession: () => Promise<void>;
};

export async function dispatchSidebarMessage(
  message: SidebarToExtensionMessage,
  handlers: SidebarMessageHandlers,
): Promise<void> {
  switch (message.type) {
    case "createSession":
      await handlers.createSession();
      return;
    case "openBrowser":
      await handlers.openBrowser();
      return;
    case "openWorkspaceWelcome":
      await handlers.openWorkspaceWelcome();
      return;
    case "createSessionInGroup":
      await handlers.createSessionInGroup(message.groupId);
      return;
    case "focusGroup":
      await handlers.focusGroup(message.groupId, "sidebar");
      return;
    case "toggleFullscreenSession":
      await handlers.toggleFullscreenSession();
      return;
    case "openSettings":
      await handlers.openSettings();
      return;
    case "applyRecommendedGhosttySettings":
      await handlers.applyRecommendedGhosttySettings();
      return;
    case "resetGhosttySettingsToDefault":
      await handlers.resetGhosttySettingsToDefault();
      return;
    case "openGhosttySettingsDocs":
      await handlers.openGhosttySettingsDocs();
      return;
    case "openGhosttyConfigFile":
      await handlers.openGhosttyConfigFile();
      return;
    case "promptFindPreviousSession":
      await handlers.promptFindPreviousSession(message.query);
      return;
    case "toggleCompletionBell":
      await handlers.toggleCompletionBell();
      return;
    case "toggleShowLastInteractionTimeOnSessionCards":
      await handlers.toggleShowLastInteractionTimeOnSessionCards();
      return;
    case "adjustTerminalFontSize":
      await handlers.adjustTerminalFontSize(message.delta);
      return;
    case "refreshDaemonSessions":
      await handlers.refreshDaemonSessions();
      return;
    case "killTerminalDaemon":
      await handlers.killTerminalDaemon();
      return;
    case "killT3RuntimeServer":
      await handlers.killT3RuntimeServer();
      return;
    case "killDaemonSession":
      await handlers.killDaemonSession(message.workspaceId, message.sessionId);
      return;
    case "killT3RuntimeSession":
      await handlers.killT3RuntimeSession(message.sessionId);
      return;
    case "moveSidebarToOtherSide":
      await handlers.moveSidebarToOtherSide();
      return;
    case "runSidebarAgent":
      await handlers.runSidebarAgent(message.agentId);
      return;
    case "runSidebarCommand":
      await handlers.runSidebarCommand(message.commandId, message.runMode, message.worktreePath);
      return;
    case "endSidebarCommandRun":
      await handlers.endSidebarCommandRun(message.commandId);
      return;
    case "runSidebarGitAction":
      await handlers.runSidebarGitAction(message.action);
      return;
    case "setSidebarGitPrimaryAction":
      await handlers.setSidebarGitPrimaryAction(message.action);
      return;
    case "refreshGitState":
      await handlers.refreshGitState();
      return;
    case "setSidebarGitCommitConfirmationEnabled":
      await handlers.setSidebarGitCommitConfirmationEnabled(message.enabled);
      return;
    case "setSidebarGitGenerateCommitBodyEnabled":
      await handlers.setSidebarGitGenerateCommitBodyEnabled(message.enabled);
      return;
    case "confirmSidebarGitCommit":
      await handlers.confirmSidebarGitCommit(message.requestId, message.message);
      return;
    case "cancelSidebarGitCommit":
      await handlers.cancelSidebarGitCommit(message.requestId);
      return;
    case "saveSidebarAgent":
      await handlers.saveSidebarAgent(message.agentId, message.name, message.command, message.icon);
      return;
    case "saveSidebarCommand":
      await handlers.saveSidebarCommand(
        message.commandId,
        message.name,
        message.actionType,
        message.closeTerminalOnExit,
        message.playCompletionSound,
        message.command,
        message.icon,
        message.iconColor,
        message.isGlobal,
        message.url,
      );
      return;
    case "deleteSidebarAgent":
      await handlers.deleteSidebarAgent(message.agentId);
      return;
    case "syncSidebarAgentOrder":
      await handlers.syncSidebarAgentOrder(message.requestId, message.agentIds);
      return;
    case "deleteSidebarCommand":
      await handlers.deleteSidebarCommand(message.commandId);
      return;
    case "syncSidebarCommandOrder":
      await handlers.syncSidebarCommandOrder(message.requestId, message.commandIds);
      return;
    case "focusSession":
      if (message.sessionId) {
        await handlers.focusSession(message.sessionId, "sidebar");
      }
      return;
    case "promptRenameSession":
      if (message.sessionId) {
        await handlers.promptRenameSession(message.sessionId);
      }
      return;
    case "restartSession":
      if (message.sessionId) {
        await handlers.restartSession(message.sessionId);
      }
      return;
    case "renameSession":
      if (message.sessionId) {
        await handlers.renameSession(message.sessionId, message.title);
      }
      return;
    case "setT3SessionThreadId":
      await handlers.setT3SessionThreadId(message.sessionId, message.threadId);
      return;
    case "renameGroup":
      await handlers.renameGroup(message.groupId, message.title);
      return;
    case "closeGroup":
      await handlers.closeGroup(message.groupId);
      return;
    case "closeSession":
      if (message.sessionId) {
        await handlers.closeSession(message.sessionId);
      }
      return;
    case "setSessionSleeping":
      if (message.sessionId) {
        await handlers.setSessionSleeping(message.sessionId, message.sleeping);
      }
      return;
    case "setSessionFavorite":
      if (message.sessionId) {
        await handlers.setSessionFavorite(message.sessionId, message.favorite);
      }
      return;
    case "setGroupSleeping":
      await handlers.setGroupSleeping(message.groupId, message.sleeping);
      return;
    case "copyResumeCommand":
      if (message.sessionId) {
        await handlers.copyResumeCommand(message.sessionId);
      }
      return;
    case "forkSession":
      if (message.sessionId) {
        await handlers.forkSession(message.sessionId);
      }
      return;
    case "generateSessionName":
      /**
       * CDXC:SessionNaming 2026-04-30-01:50
       * "Generate Name" is an explicit context-menu command for Claude/Codex
       * threads and routes separately from user-entered rename text.
       */
      if (message.sessionId) {
        await handlers.generateSessionName(message.sessionId);
      }
      return;
    case "fullReloadSession":
      if (message.sessionId) {
        await handlers.fullReloadSession(message.sessionId);
      }
      return;
    case "attachToIde":
      return;
    case "fullReloadGroup":
      if (message.groupId) {
        await handlers.fullReloadGroup(message.groupId);
      }
      return;
    case "requestT3SessionBrowserAccess":
      await handlers.requestT3SessionBrowserAccess(message.sessionId);
      return;
    case "openT3SessionBrowserAccessLink":
      await handlers.openT3SessionBrowserAccessLink(message.url);
      return;
    case "restorePreviousSession":
      await handlers.restorePreviousSession(message.historyId);
      return;
    case "deletePreviousSession":
      await handlers.deletePreviousSession(message.historyId);
      return;
    case "clearGeneratedPreviousSessions":
      await handlers.clearGeneratedPreviousSessions();
      return;
    case "saveScratchPad":
      await handlers.saveScratchPad(message.content);
      return;
    case "savePinnedPrompt":
      await handlers.savePinnedPrompt(message.promptId, message.title, message.content);
      return;
    case "setSidebarSectionCollapsed":
      await handlers.setSidebarSectionCollapsed(message.section, message.collapsed);
      return;
    case "createGroup":
      await handlers.createGroup();
      return;
    case "moveSessionToGroup":
      await handlers.moveSessionToGroup(message.sessionId, message.groupId, message.targetIndex);
      return;
    case "createGroupFromSession":
      await handlers.createGroupFromSession(message.sessionId);
      return;
    case "setVisibleCount":
      if (message.visibleCount) {
        await handlers.setVisibleCount(message.visibleCount);
      }
      return;
    case "setViewMode":
      if (message.viewMode) {
        await handlers.setViewMode(message.viewMode);
      }
      return;
    case "toggleActiveSessionsSortMode":
      await handlers.toggleActiveSessionsSortMode();
      return;
    case "syncSessionOrder":
      await handlers.syncSessionOrder(message.groupId, message.sessionIds);
      return;
    case "syncGroupOrder":
      await handlers.syncGroupOrder(message.groupIds);
      return;
  }
}
