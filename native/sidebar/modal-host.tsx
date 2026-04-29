import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { AgentConfigModal, type AgentConfigDraft } from "../../sidebar/agent-config-modal";
import { CommandConfigModal, type CommandConfigDraft } from "../../sidebar/command-config-modal";
import { DaemonSessionsModal } from "../../sidebar/daemon-sessions-modal";
import { FindPreviousSessionModal } from "../../sidebar/find-previous-session-modal";
import { HotkeysModal } from "../../sidebar/hotkeys-modal";
import { FirstUserMessageModal } from "../../sidebar/first-user-message-modal";
import { PinnedPromptsModal } from "../../sidebar/pinned-prompts-modal";
import { PreviousSessionsModal } from "../../sidebar/previous-sessions-modal";
import { ScratchPadModal } from "../../sidebar/scratch-pad-modal";
import { SettingsModal } from "../../sidebar/settings-modal";
import { SessionRenameModal } from "../../sidebar/session-rename-modal";
import { T3ThreadIdModal } from "../../sidebar/t3-thread-id-modal";
import {
  WorkspaceConfigModal,
  type WorkspaceConfigModalProps,
} from "../../sidebar/workspace-config-modal";
import type { SidebarActionType } from "../../shared/sidebar-commands";
import type { WorkspaceProjectConfigDraft } from "../../shared/workspace-dock-icons";
import {
  installAppModalGlobalErrorLogging,
  logAppModalError,
} from "../../sidebar/app-modal-error-log";
import { postAppModalHostMessage } from "../../sidebar/app-modal-host-bridge";
import { useSidebarStore } from "../../sidebar/sidebar-store";
import type { WebviewApi } from "../../sidebar/webview-api";
import "../../sidebar/styles.css";

type AppModalKind =
  | "agentConfig"
  | "commandConfig"
  | "daemonSessions"
  | "findPreviousSession"
  | "hotkeys"
  | "pinnedPrompts"
  | "previousSessions"
  | "firstUserMessage"
  | "renameSession"
  | "scratchPad"
  | "settings"
  | "t3ThreadId"
  | "workspaceConfig";

type AppModalHostMessage =
  | {
      agentDraft?: AgentConfigDraft;
      commandDraft?: CommandConfigDraft;
      initialTitle?: string;
      initialQuery?: string;
      message?: string;
      lockedActionType?: SidebarActionType;
      modal: AppModalKind;
      projectConfigDraft?: WorkspaceProjectConfigDraft;
      sessionId?: string;
      threadId?: string;
      title?: string;
      type: "open";
    }
  | { type: "close" }
  | { message: unknown; type: "sidebarState" };

type RenameSessionModalState = {
  initialTitle: string;
  sessionId: string;
};

type FirstUserMessageModalState = {
  message: string;
  title?: string;
};

type FindPreviousSessionModalState = {
  initialQuery?: string;
};

type T3ThreadIdModalState = {
  currentThreadId: string;
  sessionId: string;
};

type ConfigModalState = {
  agentDraft?: AgentConfigDraft;
  commandDraft?: CommandConfigDraft;
  lockedActionType?: SidebarActionType;
  projectConfigDraft?: WorkspaceProjectConfigDraft;
};

const WORKSPACE_CONFIG_THEME_OPTIONS = [
  { label: "Plain Dark", value: "plain-dark" },
  { label: "Plain Light", value: "plain-light" },
  { label: "Dark Blue", value: "dark-blue" },
  { label: "Dark Green", value: "dark-green" },
  { label: "Dark Red", value: "dark-red" },
  { label: "Dark Pink", value: "dark-pink" },
  { label: "Dark Orange", value: "dark-orange" },
  { label: "Light Blue", value: "light-blue" },
  { label: "Light Green", value: "light-green" },
  { label: "Light Pink", value: "light-pink" },
  { label: "Light Orange", value: "light-orange" },
] satisfies WorkspaceConfigModalProps["themeOptions"];

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        zmuxAppModalHost?: {
          postMessage: (message: unknown) => void;
        };
        zmuxNativeHost?: {
          postMessage: (message: unknown) => void;
        };
        zmuxNativeHostDiagnostics?: {
          postMessage: (message: unknown) => void;
        };
        zmuxWorkspaceBar?: {
          postMessage: (message: unknown) => void;
        };
      };
    };
  }
}

const vscode: WebviewApi = {
  postMessage(message) {
    postAppModalHostMessage({ message, type: "sidebarCommand" }, "AppModals:sidebarCommand");
  },
};

function closeModal() {
  postAppModalHostMessage({ type: "close" }, "AppModals:close");
}

function AppModalHost() {
  const { activeModal, config, findPreviousSession, firstUserMessage, renameSession, t3ThreadId } =
    useModalStateFromNative();
  const settings = useSidebarStore((state) => state.hud.settings);

  return (
    <>
      <PreviousSessionsModal
        isOpen={activeModal === "previousSessions"}
        onClose={closeModal}
        vscode={vscode}
      />
      <PinnedPromptsModal
        isOpen={activeModal === "pinnedPrompts"}
        onClose={closeModal}
        vscode={vscode}
      />
      <FirstUserMessageModal
        isOpen={activeModal === "firstUserMessage" && firstUserMessage !== undefined}
        message={firstUserMessage?.message ?? ""}
        onClose={closeModal}
        title={firstUserMessage?.title}
      />
      <DaemonSessionsModal
        isOpen={activeModal === "daemonSessions"}
        onClose={closeModal}
        vscode={vscode}
      />
      <FindPreviousSessionModal
        initialQuery={findPreviousSession?.initialQuery}
        isOpen={activeModal === "findPreviousSession"}
        onCancel={closeModal}
        onConfirm={(query) => {
          vscode.postMessage({
            query,
            type: "promptFindPreviousSession",
          });
          closeModal();
        }}
      />
      <ScratchPadModal
        isOpen={activeModal === "scratchPad"}
        onClose={closeModal}
        onDebug={(event, details) => {
          /**
           * CDXC:ScratchPadFocus 2026-04-28-05:21
           * Scratch Pad focus repros run inside the full-window modal host, not
           * the narrow sidebar webview. Forward those modal-host events through
           * the normal sidebar command bridge so native logs can correlate
           * textarea blur/focus with terminal first-responder changes.
           */
          vscode.postMessage({
            details,
            event,
            type: "sidebarDebugLog",
          });
        }}
        onSave={(content) => {
          vscode.postMessage({
            content,
            type: "saveScratchPad",
          });
        }}
      />
      <HotkeysModal
        hotkeys={settings?.hotkeys}
        isOpen={activeModal === "hotkeys"}
        onChange={(hotkeys) => {
          if (!settings) {
            return;
          }
          vscode.postMessage({
            settings: { ...settings, hotkeys },
            type: "updateSettings",
          });
        }}
        onClose={closeModal}
      />
      <SettingsModal
        accessibilityPermissionGranted={window.__zmux_NATIVE_HOST__?.accessibilityPermissionGranted}
        isOpen={activeModal === "settings"}
        onChange={(nextSettings) => {
          vscode.postMessage({
            settings: nextSettings,
            type: "updateSettings",
          });
        }}
        onGhosttySettingsAction={(action) => {
          vscode.postMessage({ type: action });
        }}
        onClose={closeModal}
        settings={settings}
      />
      <T3ThreadIdModal
        currentThreadId={t3ThreadId?.currentThreadId ?? ""}
        isOpen={activeModal === "t3ThreadId" && t3ThreadId !== undefined}
        onCancel={closeModal}
        onConfirm={(threadId) => {
          if (!t3ThreadId) {
            return;
          }
          vscode.postMessage({
            sessionId: t3ThreadId.sessionId,
            threadId,
            type: "setT3SessionThreadId",
          });
          closeModal();
        }}
      />
      <SessionRenameModal
        initialTitle={renameSession?.initialTitle ?? ""}
        isOpen={activeModal === "renameSession" && renameSession !== undefined}
        onCancel={closeModal}
        onConfirm={(title) => {
          if (!renameSession) {
            return;
          }
          vscode.postMessage({
            sessionId: renameSession.sessionId,
            title,
            type: "renameSession",
          });
          closeModal();
        }}
      />
      <CommandConfigModal
        draft={config.commandDraft ?? createEmptyCommandDraft()}
        isOpen={activeModal === "commandConfig" && config.commandDraft !== undefined}
        lockedActionType={config.lockedActionType}
        onCancel={closeModal}
        onSave={(draft) => {
          vscode.postMessage({
            actionType: draft.actionType,
            closeTerminalOnExit: draft.closeTerminalOnExit,
            command: draft.command,
            commandId: draft.commandId,
            icon: draft.icon,
            iconColor: draft.iconColor,
            isGlobal: draft.isGlobal,
            name: draft.name,
            playCompletionSound: draft.playCompletionSound,
            type: "saveSidebarCommand",
            url: draft.url,
          });
          closeModal();
        }}
      />
      <WorkspaceConfigModal
        draft={config.projectConfigDraft ?? createEmptyWorkspaceConfigDraft()}
        isOpen={activeModal === "workspaceConfig" && config.projectConfigDraft !== undefined}
        onCancel={closeModal}
        onSave={(draft) => {
          vscode.postMessage({
            icon: draft.icon,
            name: draft.name,
            projectId: draft.projectId,
            theme: draft.theme,
            type: "saveWorkspaceConfig",
          });
          closeModal();
        }}
        themeOptions={WORKSPACE_CONFIG_THEME_OPTIONS}
      />
      <AgentConfigModal
        draft={config.agentDraft ?? createEmptyAgentDraft()}
        isOpen={activeModal === "agentConfig" && config.agentDraft !== undefined}
        onCancel={closeModal}
        onSave={(draft) => {
          vscode.postMessage({
            agentId: draft.agentId,
            command: draft.command,
            icon: draft.icon,
            name: draft.name,
            type: "saveSidebarAgent",
          });
          closeModal();
        }}
      />
    </>
  );
}

/**
 * CDXC:AppModals 2026-04-26-15:10
 * Sidebar-owned modals must render from a full-window host so settings and
 * other management dialogs center over the whole application instead of being
 * constrained by the narrow sidebar WKWebView.
 */
function useModalStateFromNative() {
  const [activeModal, setActiveModal] = useState<AppModalKind | undefined>();
  const [config, setConfig] = useState<ConfigModalState>({});
  const [findPreviousSession, setFindPreviousSession] = useState<FindPreviousSessionModalState>();
  const [firstUserMessage, setFirstUserMessage] = useState<FirstUserMessageModalState>();
  const [renameSession, setRenameSession] = useState<RenameSessionModalState>();
  const [t3ThreadId, setT3ThreadId] = useState<T3ThreadIdModalState>();

  useEffect(() => {
    const handleMessage = (event: Event) => {
      try {
        const message = (event as CustomEvent<AppModalHostMessage>).detail;
        if (!message || typeof message !== "object") {
          return;
        }

        if (message.type === "open") {
          if (message.modal === "renameSession") {
            if (!message.sessionId) {
              throw new Error("Rename modal request is missing sessionId.");
            }
            setRenameSession({
              initialTitle: message.initialTitle ?? "",
              sessionId: message.sessionId,
            });
            setConfig({});
            setFindPreviousSession(undefined);
            setFirstUserMessage(undefined);
            setT3ThreadId(undefined);
          } else if (message.modal === "firstUserMessage") {
            if (typeof message.message !== "string" || !message.message.trim()) {
              throw new Error("First message modal request is missing message text.");
            }
            setFirstUserMessage({
              message: message.message,
              title: typeof message.title === "string" ? message.title : undefined,
            });
            setConfig({});
            setFindPreviousSession(undefined);
            setRenameSession(undefined);
            setT3ThreadId(undefined);
          } else if (message.modal === "findPreviousSession") {
            setFindPreviousSession({
              initialQuery:
                typeof message.initialQuery === "string" ? message.initialQuery : undefined,
            });
            setConfig({});
            setFirstUserMessage(undefined);
            setRenameSession(undefined);
            setT3ThreadId(undefined);
          } else if (message.modal === "t3ThreadId") {
            if (!message.sessionId || typeof message.threadId !== "string") {
              throw new Error("T3 thread id modal request is missing sessionId or threadId.");
            }
            setT3ThreadId({
              currentThreadId: message.threadId,
              sessionId: message.sessionId,
            });
            setConfig({});
            setFindPreviousSession(undefined);
            setFirstUserMessage(undefined);
            setRenameSession(undefined);
          } else if (message.modal === "commandConfig") {
            if (!message.commandDraft) {
              throw new Error("Command config modal request is missing commandDraft.");
            }
            setConfig({
              commandDraft: message.commandDraft,
              lockedActionType: message.lockedActionType,
            });
            setFirstUserMessage(undefined);
            setFindPreviousSession(undefined);
            setRenameSession(undefined);
            setT3ThreadId(undefined);
          } else if (message.modal === "agentConfig") {
            if (!message.agentDraft) {
              throw new Error("Agent config modal request is missing agentDraft.");
            }
            setConfig({ agentDraft: message.agentDraft });
            setFirstUserMessage(undefined);
            setFindPreviousSession(undefined);
            setRenameSession(undefined);
            setT3ThreadId(undefined);
          } else if (message.modal === "workspaceConfig") {
            if (!message.projectConfigDraft) {
              throw new Error("Workspace config modal request is missing projectConfigDraft.");
            }
            setConfig({ projectConfigDraft: message.projectConfigDraft });
            setFirstUserMessage(undefined);
            setFindPreviousSession(undefined);
            setRenameSession(undefined);
            setT3ThreadId(undefined);
          } else {
            setConfig({});
            setFindPreviousSession(undefined);
            setFirstUserMessage(undefined);
            setRenameSession(undefined);
            setT3ThreadId(undefined);
          }
          setActiveModal(message.modal);
          return;
        }

        if (message.type === "close") {
          setActiveModal(undefined);
          setConfig({});
          setFindPreviousSession(undefined);
          setFirstUserMessage(undefined);
          setRenameSession(undefined);
          setT3ThreadId(undefined);
          return;
        }

        if (message.type === "sidebarState") {
          applySidebarStateMessage(message.message);
        }
      } catch (error) {
        logAppModalError("AppModals:hostMessage", error);
        throw error;
      }
    };

    window.addEventListener("zmux-app-modal-host-message", handleMessage);
    postAppModalHostMessage({ type: "ready" }, "AppModals:ready");
    return () => {
      window.removeEventListener("zmux-app-modal-host-message", handleMessage);
    };
  }, []);

  return { activeModal, config, findPreviousSession, firstUserMessage, renameSession, t3ThreadId };
}

function createEmptyCommandDraft(): CommandConfigDraft {
  return {
    actionType: "terminal",
    closeTerminalOnExit: false,
    name: "",
    playCompletionSound: false,
  };
}

function createEmptyAgentDraft(): AgentConfigDraft {
  return {
    command: "",
    name: "",
  };
}

function createEmptyWorkspaceConfigDraft(): WorkspaceProjectConfigDraft {
  return {
    name: "",
    projectId: "",
  };
}

function applySidebarStateMessage(message: unknown) {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return;
  }

  if (message.type === "hydrate" || message.type === "sessionState") {
    useSidebarStore
      .getState()
      .applySidebarMessage(
        message as Parameters<
          ReturnType<typeof useSidebarStore.getState>["applySidebarMessage"]
        >[0],
      );
    return;
  }

  if (message.type === "daemonSessionsState") {
    useSidebarStore
      .getState()
      .setDaemonSessionsState(
        message as Parameters<
          ReturnType<typeof useSidebarStore.getState>["setDaemonSessionsState"]
        >[0],
      );
  }
}

document.body.classList.add("app-modal-host-body");
installAppModalGlobalErrorLogging("AppModals:modalHost");
createRoot(document.getElementById("root")!).render(<AppModalHost />);
