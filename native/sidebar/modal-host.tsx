import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { AgentConfigModal, type AgentConfigDraft } from "../../sidebar/agent-config-modal";
import {
  CommandConfigModal,
  type CommandConfigDraft,
} from "../../sidebar/command-config-modal";
import { DaemonSessionsModal } from "../../sidebar/daemon-sessions-modal";
import { PinnedPromptsModal } from "../../sidebar/pinned-prompts-modal";
import { PreviousSessionsModal } from "../../sidebar/previous-sessions-modal";
import { ScratchPadModal } from "../../sidebar/scratch-pad-modal";
import { SettingsModal } from "../../sidebar/settings-modal";
import { SessionRenameModal } from "../../sidebar/session-rename-modal";
import type { SidebarActionType } from "../../shared/sidebar-commands";
import { installAppModalGlobalErrorLogging, logAppModalError } from "../../sidebar/app-modal-error-log";
import { postAppModalHostMessage } from "../../sidebar/app-modal-host-bridge";
import { useSidebarStore } from "../../sidebar/sidebar-store";
import type { WebviewApi } from "../../sidebar/webview-api";
import "../../sidebar/styles.css";

type AppModalKind =
  | "agentConfig"
  | "commandConfig"
  | "daemonSessions"
  | "pinnedPrompts"
  | "previousSessions"
  | "renameSession"
  | "scratchPad"
  | "settings";

type AppModalHostMessage =
  | {
      agentDraft?: AgentConfigDraft;
      commandDraft?: CommandConfigDraft;
      initialTitle?: string;
      lockedActionType?: SidebarActionType;
      modal: AppModalKind;
      sessionId?: string;
      type: "open";
    }
  | { type: "close" }
  | { message: unknown; type: "sidebarState" };

type RenameSessionModalState = {
  initialTitle: string;
  sessionId: string;
};

type ConfigModalState = {
  agentDraft?: AgentConfigDraft;
  commandDraft?: CommandConfigDraft;
  lockedActionType?: SidebarActionType;
};

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        zmuxAppModalHost?: {
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
  const { activeModal, config, renameSession } = useModalStateFromNative();
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
      <DaemonSessionsModal
        isOpen={activeModal === "daemonSessions"}
        onClose={closeModal}
        vscode={vscode}
      />
      <ScratchPadModal
        isOpen={activeModal === "scratchPad"}
        onClose={closeModal}
        onSave={(content) => {
          vscode.postMessage({
            content,
            type: "saveScratchPad",
          });
        }}
      />
      <SettingsModal
        isOpen={activeModal === "settings"}
        onChange={(nextSettings) => {
          vscode.postMessage({
            settings: nextSettings,
            type: "updateSettings",
          });
        }}
        onClose={closeModal}
        settings={settings}
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
  const [renameSession, setRenameSession] = useState<RenameSessionModalState>();

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
          } else if (message.modal === "commandConfig") {
            if (!message.commandDraft) {
              throw new Error("Command config modal request is missing commandDraft.");
            }
            setConfig({
              commandDraft: message.commandDraft,
              lockedActionType: message.lockedActionType,
            });
            setRenameSession(undefined);
          } else if (message.modal === "agentConfig") {
            if (!message.agentDraft) {
              throw new Error("Agent config modal request is missing agentDraft.");
            }
            setConfig({ agentDraft: message.agentDraft });
            setRenameSession(undefined);
          } else {
            setConfig({});
            setRenameSession(undefined);
          }
          setActiveModal(message.modal);
          return;
        }

        if (message.type === "close") {
          setActiveModal(undefined);
          setConfig({});
          setRenameSession(undefined);
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

  return { activeModal, config, renameSession };
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

function applySidebarStateMessage(message: unknown) {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return;
  }

  if (message.type === "hydrate" || message.type === "sessionState") {
    useSidebarStore
      .getState()
      .applySidebarMessage(
        message as Parameters<ReturnType<typeof useSidebarStore.getState>["applySidebarMessage"]>[0],
      );
    return;
  }

  if (message.type === "daemonSessionsState") {
    useSidebarStore
      .getState()
      .setDaemonSessionsState(
        message as Parameters<ReturnType<typeof useSidebarStore.getState>["setDaemonSessionsState"]>[0],
      );
  }
}

document.body.classList.add("app-modal-host-body");
installAppModalGlobalErrorLogging("AppModals:modalHost");
createRoot(document.getElementById("root")!).render(<AppModalHost />);
