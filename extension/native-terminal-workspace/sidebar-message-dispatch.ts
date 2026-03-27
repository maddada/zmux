import type {
  VisibleSessionCount,
  SidebarToExtensionMessage,
} from "../../shared/session-grid-contract";
import type { TerminalViewMode } from "../../shared/session-grid-contract";
import type { SidebarActionType } from "../../shared/sidebar-commands";
import type { SidebarAgentIcon } from "../../shared/sidebar-agents";
import { logVSmuxDebug } from "../vsmux-debug-log";

export type SidebarMessageHandlers = {
  clearStartupSidebarRefreshes: () => void;
  clearGeneratedPreviousSessions: () => Promise<void>;
  closeGroup: (groupId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  copyResumeCommand: (sessionId: string) => Promise<void>;
  createGroupFromSession: (sessionId: string) => Promise<void>;
  createSession: () => Promise<void>;
  createSessionInGroup: (groupId: string) => Promise<void>;
  deletePreviousSession: (historyId: string) => Promise<void>;
  deleteSidebarAgent: (agentId: string) => Promise<void>;
  deleteSidebarCommand: (commandId: string) => Promise<void>;
  focusGroup: (groupId: string) => Promise<void>;
  focusSession: (sessionId: string, source?: "sidebar") => Promise<void>;
  moveSessionToGroup: (sessionId: string, groupId: string, targetIndex?: number) => Promise<void>;
  moveSidebarToOtherSide: () => Promise<void>;
  openBrowser: () => Promise<void>;
  openSettings: () => Promise<void>;
  promptRenameSession: (sessionId: string) => Promise<void>;
  refreshSidebarHydrate: () => Promise<void>;
  renameGroup: (groupId: string, title: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  restartSession: (sessionId: string) => Promise<void>;
  restorePreviousSession: (historyId: string) => Promise<void>;
  runSidebarAgent: (agentId: string) => Promise<void>;
  runSidebarCommand: (commandId: string) => Promise<void>;
  saveScratchPad: (content: string) => Promise<void>;
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
    command?: string,
    url?: string,
  ) => Promise<void>;
  syncSidebarAgentOrder: (agentIds: readonly string[]) => Promise<void>;
  setViewMode: (viewMode: TerminalViewMode) => Promise<void>;
  setVisibleCount: (visibleCount: VisibleSessionCount) => Promise<void>;
  syncGroupOrder: (groupIds: readonly string[]) => Promise<void>;
  syncSessionOrder: (groupId: string, sessionIds: readonly string[]) => Promise<void>;
  syncSidebarCommandOrder: (commandIds: readonly string[]) => Promise<void>;
  toggleCompletionBell: () => Promise<void>;
  toggleFullscreenSession: () => Promise<void>;
  toggleVsMuxDisabled: () => Promise<void>;
};

export async function dispatchSidebarMessage(
  message: SidebarToExtensionMessage,
  handlers: SidebarMessageHandlers,
): Promise<void> {
  if (message.type !== "ready") {
    handlers.clearStartupSidebarRefreshes();
  }

  switch (message.type) {
    case "ready":
      await handlers.refreshSidebarHydrate();
      return;
    case "createSession":
      await handlers.createSession();
      return;
    case "openBrowser":
      await handlers.openBrowser();
      return;
    case "createSessionInGroup":
      await handlers.createSessionInGroup(message.groupId);
      return;
    case "focusGroup":
      await handlers.focusGroup(message.groupId);
      return;
    case "toggleFullscreenSession":
      await handlers.toggleFullscreenSession();
      return;
    case "openSettings":
      await handlers.openSettings();
      return;
    case "toggleCompletionBell":
      await handlers.toggleCompletionBell();
      return;
    case "toggleVsMuxDisabled":
      await handlers.toggleVsMuxDisabled();
      return;
    case "moveSidebarToOtherSide":
      await handlers.moveSidebarToOtherSide();
      return;
    case "runSidebarAgent":
      await handlers.runSidebarAgent(message.agentId);
      return;
    case "runSidebarCommand":
      await handlers.runSidebarCommand(message.commandId);
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
        message.command,
        message.url,
      );
      return;
    case "deleteSidebarAgent":
      await handlers.deleteSidebarAgent(message.agentId);
      return;
    case "syncSidebarAgentOrder":
      await handlers.syncSidebarAgentOrder(message.agentIds);
      return;
    case "deleteSidebarCommand":
      await handlers.deleteSidebarCommand(message.commandId);
      return;
    case "syncSidebarCommandOrder":
      await handlers.syncSidebarCommandOrder(message.commandIds);
      return;
    case "focusSession":
      if (message.sessionId) {
        await handlers.focusSession(message.sessionId, "sidebar");
      }
      return;
    case "promptRenameSession":
      if (message.sessionId) {
        logVSmuxDebug("sidebar.dispatch.promptRenameSession", {
          sessionId: message.sessionId,
        });
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
    case "copyResumeCommand":
      if (message.sessionId) {
        await handlers.copyResumeCommand(message.sessionId);
      }
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
    case "syncSessionOrder":
      await handlers.syncSessionOrder(message.groupId, message.sessionIds);
      return;
    case "syncGroupOrder":
      await handlers.syncGroupOrder(message.groupIds);
      return;
  }
}
