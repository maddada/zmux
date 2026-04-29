import type { AgentConfigDraft } from "./agent-config-modal";
import { logAppModalError } from "./app-modal-error-log";
import type { CommandConfigDraft } from "./command-config-modal";
import type { SidebarActionType } from "../shared/sidebar-commands";
import type { WorkspaceProjectConfigDraft } from "../shared/workspace-dock-icons";

export type AppModalKind =
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

export type OpenAppModalMessage =
  | {
      modal: Exclude<
        AppModalKind,
        | "agentConfig"
        | "commandConfig"
        | "firstUserMessage"
        | "findPreviousSession"
        | "renameSession"
        | "t3ThreadId"
        | "workspaceConfig"
      >;
      type: "open";
    }
  | { initialQuery?: string; modal: "findPreviousSession"; type: "open" }
  | { modal: "t3ThreadId"; sessionId: string; threadId: string; type: "open" }
  | { agentDraft: AgentConfigDraft; modal: "agentConfig"; type: "open" }
  | {
      commandDraft: CommandConfigDraft;
      lockedActionType?: SidebarActionType;
      modal: "commandConfig";
      type: "open";
    }
  | {
      modal: "workspaceConfig";
      projectConfigDraft: WorkspaceProjectConfigDraft;
      type: "open";
    }
  | {
      message: string;
      modal: "firstUserMessage";
      title?: string;
      type: "open";
    }
  | { initialTitle: string; modal: "renameSession"; sessionId: string; type: "open" };

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

/**
 * CDXC:AppModals 2026-04-27-14:25
 * Modal launchers must never fall back to sidebar-local dialogs. If the native
 * full-window modal host is unavailable, persist the error and throw so the
 * broken bridge is visible instead of silently showing a squeezed modal.
 */
export function openAppModal(message: OpenAppModalMessage): void {
  postAppModalHostMessage(message, `AppModals:${message.modal}`);
}

export function closeAppModal(area = "AppModals:close"): void {
  postAppModalHostMessage({ type: "close" }, area);
}

export function postAppModalHostMessage(message: unknown, area: string): void {
  const modalHost = window.webkit?.messageHandlers?.zmuxAppModalHost;
  if (!modalHost) {
    const error = new Error("Native full-window modal host is unavailable.");
    logAppModalError(area, error);
    throw error;
  }

  try {
    modalHost.postMessage(message);
  } catch (error) {
    logAppModalError(area, error);
    throw error;
  }
}
