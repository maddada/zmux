import { readFileSync } from "node:fs";
import * as vscode from "vscode";
import { COMPLETION_SOUND_OPTIONS, getCompletionSoundFileName } from "../shared/completion-sound";
import { isSidebarCommandRunMode } from "../shared/sidebar-commands";
import {
  isSidebarCommandIcon,
  normalizeSidebarCommandIconColor,
} from "../shared/sidebar-command-icons";
import type {
  ExtensionToSidebarMessage,
  SidebarToExtensionMessage,
} from "../shared/session-grid-contract";
import { getDebuggingMode } from "./native-terminal-workspace/settings";
import { appendTerminalRestartReproLog } from "./terminal-restart-repro-log";
import { appendT3CloseSessionReproLog } from "./t3-close-session-repro-log";
import { getDefaultWorkspaceCwd } from "./terminal-workspace-environment";

const EXTENSION_ID = "maddada.zmux";
const SIDEBAR_STARTUP_REPRO_WINDOW_MS = 15_000;

type SessionSidebarViewOptions = {
  onDidResolveView?: () => void | Promise<void>;
  onMessage: (message: SidebarToExtensionMessage) => void | Promise<void>;
};

export class SessionSidebarViewProvider implements vscode.Disposable, vscode.WebviewViewProvider {
  private readonly disposables: vscode.Disposable[] = [];
  private messageQueue: Promise<void> = Promise.resolve();
  private nextQueuedMessageId = 0;
  private queuedSidebarMessageCount = 0;
  private resolveCount = 0;
  private sidebarStartupReproDeadline = Date.now() + SIDEBAR_STARTUP_REPRO_WINDOW_MS;
  private view: vscode.WebviewView | undefined;
  private latestReplayableHydrate:
    | Extract<ExtensionToSidebarMessage, { type: "hydrate" }>
    | undefined;
  private latestReplayableSessionState:
    | Extract<ExtensionToSidebarMessage, { type: "sessionState" }>
    | undefined;

  public constructor(private readonly options: SessionSidebarViewOptions) {}

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    this.view = undefined;
  }

  public async postMessage(message: ExtensionToSidebarMessage): Promise<void> {
    if (message.type === "hydrate" || message.type === "sessionState") {
      this.recordReplayableMessage(message);
      this.appendSidebarStartupReproLog(
        this.view ? "sidebar.view.postMessage.sent" : "sidebar.view.postMessage.buffered",
        {
          groupCount: message.groups.length,
          hasView: this.view !== undefined,
          messageType: message.type,
          revision: message.revision,
          sessionCount: countSidebarSessions(message),
        },
      );
    }

    if (!this.view) {
      return;
    }

    await this.view.webview.postMessage(message);
  }

  public async reveal(): Promise<void> {
    this.view?.show?.(true);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this.resolveCount += 1;
    this.sidebarStartupReproDeadline = Date.now() + SIDEBAR_STARTUP_REPRO_WINDOW_MS;
    const latestReplayableMessage = this.getLatestReplayableMessage();
    this.appendSidebarStartupReproLog("sidebar.view.resolve.start", {
      bufferedHydrateRevision: this.latestReplayableHydrate?.revision,
      bufferedHydrateSessionCount: this.latestReplayableHydrate
        ? countSidebarSessions(this.latestReplayableHydrate)
        : 0,
      bufferedSessionStateRevision: this.latestReplayableSessionState?.revision,
      bufferedSessionStateSessionCount: this.latestReplayableSessionState
        ? countSidebarSessions(this.latestReplayableSessionState)
        : 0,
      hasBufferedHydrate: this.latestReplayableHydrate !== undefined,
      hasBufferedSessionState: this.latestReplayableSessionState !== undefined,
      hasLatestMessage: latestReplayableMessage !== undefined,
      latestMessageRevision:
        latestReplayableMessage !== undefined ? latestReplayableMessage.revision : undefined,
      latestMessageType:
        latestReplayableMessage !== undefined ? latestReplayableMessage.type : undefined,
      resolveCount: this.resolveCount,
      visible: webviewView.visible,
    });
    const extensionUri = getExtensionUri();
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: extensionUri
        ? [
            vscode.Uri.joinPath(extensionUri, "media", "sounds"),
            vscode.Uri.joinPath(extensionUri, "out", "sidebar"),
          ]
        : undefined,
    };
    webviewView.webview.html = getSidebarHtml(webviewView.webview, extensionUri);

    this.disposables.push(
      webviewView.onDidDispose(() => {
        this.appendSidebarStartupReproLog("sidebar.view.dispose", {
          resolveCount: this.resolveCount,
        });
        if (this.view === webviewView) {
          this.view = undefined;
        }
      }),
      webviewView.onDidChangeVisibility(() => {
        this.appendSidebarStartupReproLog("sidebar.view.visibilityChanged", {
          bufferedHydrateRevision: this.latestReplayableHydrate?.revision,
          bufferedSessionStateRevision: this.latestReplayableSessionState?.revision,
          hasBufferedHydrate: this.latestReplayableHydrate !== undefined,
          hasBufferedSessionState: this.latestReplayableSessionState !== undefined,
          resolveCount: this.resolveCount,
          visible: webviewView.visible,
        });
      }),
      webviewView.webview.onDidReceiveMessage((message: unknown) => {
        if (!isSidebarMessage(message)) {
          return;
        }

        if (message.type === "sidebarDebugLog") {
          void Promise.resolve(this.options.onMessage(message)).catch((error) => {
            this.appendSidebarStartupReproLog("sidebar.view.debugLogDispatchFailed", {
              error: getErrorMessage(error),
              event: message.event,
              resolveCount: this.resolveCount,
            });
          });
          return;
        }

        const shouldBypassQueue = shouldBypassSidebarMessageQueue(message);
        const queueMessageId = this.nextQueuedMessageId + 1;
        if (message.type === "closeSession") {
          this.logCloseSessionRepro("sessionSidebarView.closeSession.received", {
            bypassQueue: shouldBypassQueue,
            queuedSidebarMessageCount: this.queuedSidebarMessageCount,
            sessionId: message.sessionId,
          });
        }

        if (shouldBypassQueue) {
          if (message.type === "closeSession") {
            this.logCloseSessionRepro("sessionSidebarView.closeSession.bypassDispatchStart", {
              queuedSidebarMessageCount: this.queuedSidebarMessageCount,
              sessionId: message.sessionId,
            });
          }
          void Promise.resolve(this.options.onMessage(message))
            .then(() => {
              if (message.type === "closeSession") {
                this.logCloseSessionRepro(
                  "sessionSidebarView.closeSession.bypassDispatchComplete",
                  {
                    queuedSidebarMessageCount: this.queuedSidebarMessageCount,
                    sessionId: message.sessionId,
                  },
                );
              }
            })
            .catch((error) => {
              if (message.type === "closeSession") {
                this.logCloseSessionRepro("sessionSidebarView.closeSession.bypassDispatchFailed", {
                  error: getErrorMessage(error),
                  queuedSidebarMessageCount: this.queuedSidebarMessageCount,
                  sessionId: message.sessionId,
                });
              }
            });
          return;
        }

        this.nextQueuedMessageId = queueMessageId;
        this.queuedSidebarMessageCount += 1;
        this.logCloseSessionRepro("sessionSidebarView.queue.enqueued", {
          message: describeQueuedSidebarMessage(message),
          queueMessageId,
          queuedSidebarMessageCount: this.queuedSidebarMessageCount,
        });
        if (message.type === "closeSession") {
          this.logCloseSessionRepro("sessionSidebarView.closeSession.enqueued", {
            queueMessageId,
            queuedSidebarMessageCount: this.queuedSidebarMessageCount,
            sessionId: message.sessionId,
          });
        }

        this.messageQueue = this.messageQueue
          .catch(() => undefined)
          .then(async () => {
            this.logCloseSessionRepro("sessionSidebarView.queue.dispatchStart", {
              message: describeQueuedSidebarMessage(message),
              queueMessageId,
              queuedSidebarMessageCount: this.queuedSidebarMessageCount,
            });
            if (message.type === "closeSession") {
              this.logCloseSessionRepro("sessionSidebarView.closeSession.dispatchStart", {
                queueMessageId,
                queuedSidebarMessageCount: this.queuedSidebarMessageCount,
                sessionId: message.sessionId,
              });
            }

            try {
              await this.options.onMessage(message);
              this.logCloseSessionRepro("sessionSidebarView.queue.dispatchComplete", {
                message: describeQueuedSidebarMessage(message),
                queueMessageId,
                queuedSidebarMessageCount: this.queuedSidebarMessageCount,
              });
              if (message.type === "closeSession") {
                this.logCloseSessionRepro("sessionSidebarView.closeSession.dispatchComplete", {
                  queueMessageId,
                  queuedSidebarMessageCount: this.queuedSidebarMessageCount,
                  sessionId: message.sessionId,
                });
              }
            } catch (error) {
              this.logCloseSessionRepro("sessionSidebarView.queue.dispatchFailed", {
                error: getErrorMessage(error),
                message: describeQueuedSidebarMessage(message),
                queueMessageId,
                queuedSidebarMessageCount: this.queuedSidebarMessageCount,
              });
              if (message.type === "closeSession") {
                this.logCloseSessionRepro("sessionSidebarView.closeSession.dispatchFailed", {
                  error: getErrorMessage(error),
                  queueMessageId,
                  queuedSidebarMessageCount: this.queuedSidebarMessageCount,
                  sessionId: message.sessionId,
                });
              }
              throw error;
            } finally {
              this.queuedSidebarMessageCount = Math.max(0, this.queuedSidebarMessageCount - 1);
              this.logCloseSessionRepro("sessionSidebarView.queue.settled", {
                message: describeQueuedSidebarMessage(message),
                queueMessageId,
                queuedSidebarMessageCount: this.queuedSidebarMessageCount,
              });
              if (message.type === "closeSession") {
                this.logCloseSessionRepro("sessionSidebarView.closeSession.queueSettled", {
                  queueMessageId,
                  queuedSidebarMessageCount: this.queuedSidebarMessageCount,
                  sessionId: message.sessionId,
                });
              }
            }
          });
      }),
    );

    void this.options.onDidResolveView?.();

    void this.replayLatestMessages(webviewView);
  }

  private recordReplayableMessage(
    message: Extract<ExtensionToSidebarMessage, { type: "hydrate" | "sessionState" }>,
  ): void {
    if (message.type === "hydrate") {
      if (
        !this.latestReplayableHydrate ||
        this.latestReplayableHydrate.revision <= message.revision
      ) {
        this.latestReplayableHydrate = message;
      }
      return;
    }

    if (
      !this.latestReplayableSessionState ||
      this.latestReplayableSessionState.revision <= message.revision
    ) {
      this.latestReplayableSessionState = message;
    }
  }

  private getLatestReplayableMessage():
    | Extract<ExtensionToSidebarMessage, { type: "hydrate" | "sessionState" }>
    | undefined {
    if (
      this.latestReplayableHydrate &&
      this.latestReplayableSessionState &&
      this.latestReplayableSessionState.revision > this.latestReplayableHydrate.revision
    ) {
      return this.latestReplayableSessionState;
    }

    return this.latestReplayableHydrate ?? this.latestReplayableSessionState;
  }

  private async replayLatestMessages(webviewView: vscode.WebviewView): Promise<void> {
    this.appendSidebarStartupReproLog("sidebar.view.resolve.replaySummary", {
      hydrateRevision: this.latestReplayableHydrate?.revision,
      hasHydrate: this.latestReplayableHydrate !== undefined,
      hasSessionState: this.latestReplayableSessionState !== undefined,
      resolveCount: this.resolveCount,
      sessionStateRevision: this.latestReplayableSessionState?.revision,
    });

    if (this.latestReplayableHydrate) {
      this.appendSidebarStartupReproLog("sidebar.view.resolve.replayLatestMessage", {
        groupCount: this.latestReplayableHydrate.groups.length,
        messageType: this.latestReplayableHydrate.type,
        resolveCount: this.resolveCount,
        revision: this.latestReplayableHydrate.revision,
        sessionCount: countSidebarSessions(this.latestReplayableHydrate),
      });
      await webviewView.webview.postMessage(this.latestReplayableHydrate);
    }

    if (
      this.latestReplayableSessionState &&
      (!this.latestReplayableHydrate ||
        this.latestReplayableSessionState.revision > this.latestReplayableHydrate.revision)
    ) {
      this.appendSidebarStartupReproLog("sidebar.view.resolve.replayLatestMessage", {
        groupCount: this.latestReplayableSessionState.groups.length,
        messageType: this.latestReplayableSessionState.type,
        resolveCount: this.resolveCount,
        revision: this.latestReplayableSessionState.revision,
        sessionCount: countSidebarSessions(this.latestReplayableSessionState),
      });
      await webviewView.webview.postMessage(this.latestReplayableSessionState);
    }
  }

  private logCloseSessionRepro(event: string, details: Record<string, unknown>): void {
    if (!getDebuggingMode()) {
      return;
    }
    void appendT3CloseSessionReproLog(getDefaultWorkspaceCwd(), event, details);
  }

  private appendSidebarStartupReproLog(event: string, details: Record<string, unknown>): void {
    if (Date.now() > this.sidebarStartupReproDeadline) {
      return;
    }

    void appendTerminalRestartReproLog(getDefaultWorkspaceCwd(), event, details);
  }
}

function countSidebarSessions(
  message: Extract<ExtensionToSidebarMessage, { type: "hydrate" | "sessionState" }>,
): number {
  return message.groups.reduce((total, group) => total + group.sessions.length, 0);
}

export function shouldBypassSidebarMessageQueue(message: SidebarToExtensionMessage): boolean {
  switch (message.type) {
    case "closeSession":
    case "focusSession":
    case "sidebarDebugLog":
    case "runSidebarGitAction":
    case "confirmSidebarGitCommit":
    case "cancelSidebarGitCommit":
    case "refreshGitState":
    case "openSettings":
    case "promptFindPreviousSession":
    case "openT3SessionBrowserAccessLink":
    case "syncSidebarAgentOrder":
    case "syncSidebarCommandOrder":
      return true;
    default:
      return false;
  }
}

function getSidebarHtml(webview: vscode.Webview, extensionUri: vscode.Uri | undefined): string {
  if (!extensionUri) {
    return `<!DOCTYPE html>
<html lang="en">
  <body>
    <p>Unable to resolve the zmux extension assets.</p>
  </body>
</html>`;
  }

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "sidebar", "sidebar.js"),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "out", "sidebar", "sidebar.css"),
  );
  const nonce = getNonce();
  const soundUrls = buildEmbeddedSoundUrls(extensionUri);
  const soundUrlsJson = JSON.stringify(soundUrls).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} data:; media-src ${webview.cspSource} data:;"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Sessions</title>
    <link href="${styleUri}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.__zmux_SOUND_URLS__ = ${soundUrlsJson};
    </script>
    <script nonce="${nonce}" src="${scriptUri}" type="module"></script>
  </body>
</html>`;
}

function buildEmbeddedSoundUrls(extensionUri: vscode.Uri): Record<string, string> {
  return Object.fromEntries(
    COMPLETION_SOUND_OPTIONS.map((option) => {
      const soundFileUri = vscode.Uri.joinPath(
        extensionUri,
        "media",
        "sounds",
        getCompletionSoundFileName(option.value),
      );
      const soundBytes = readFileSync(soundFileUri.fsPath);
      return [option.value, `data:audio/mpeg;base64,${soundBytes.toString("base64")}`];
    }),
  );
}

function getExtensionUri(): vscode.Uri | undefined {
  const directMatch = vscode.extensions.getExtension(EXTENSION_ID);
  if (directMatch) {
    return directMatch.extensionUri;
  }

  return vscode.extensions.all.find((extension) => extension.packageJSON.name === "zmux")
    ?.extensionUri;
}

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function describeQueuedSidebarMessage(
  message: SidebarToExtensionMessage,
): Record<string, string | undefined> {
  return {
    groupId:
      "groupId" in message && typeof message.groupId === "string" ? message.groupId : undefined,
    historyId:
      "historyId" in message && typeof message.historyId === "string"
        ? message.historyId
        : undefined,
    requestId:
      "requestId" in message && typeof message.requestId === "string"
        ? message.requestId
        : undefined,
    sessionId:
      "sessionId" in message && typeof message.sessionId === "string"
        ? message.sessionId
        : undefined,
    type: message.type,
  };
}

export function isSidebarMessage(candidate: unknown): candidate is SidebarToExtensionMessage {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const message = candidate as Partial<SidebarToExtensionMessage>;
  switch (message.type) {
    case "openSettings":
    case "toggleCompletionBell":
    case "toggleShowLastInteractionTimeOnSessionCards":
    case "openWorkspaceWelcome":
    case "promptFindPreviousSession":
    case "refreshDaemonSessions":
    case "killTerminalDaemon":
    case "killT3RuntimeServer":
    case "moveSidebarToOtherSide":
    case "createSession":
    case "openBrowser":
      return true;
    case "openT3SessionBrowserAccessLink":
      return typeof message.url === "string" && message.url.length > 0;
    case "adjustTerminalFontSize":
      return message.delta === -1 || message.delta === 1;
    case "killDaemonSession":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        typeof message.workspaceId === "string" &&
        message.workspaceId.length > 0
      );
    case "killT3RuntimeSession":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;
    case "toggleFullscreenSession":
      return true;

    case "runSidebarCommand":
      return (
        typeof message.commandId === "string" &&
        message.commandId.length > 0 &&
        (message.runMode === undefined || isSidebarCommandRunMode(message.runMode)) &&
        (message.worktreePath === undefined ||
          (typeof message.worktreePath === "string" && message.worktreePath.length > 0))
      );
    case "endSidebarCommandRun":
      return typeof message.commandId === "string" && message.commandId.length > 0;
    case "deleteSidebarCommand":
      return typeof message.commandId === "string" && message.commandId.length > 0;

    case "runSidebarGitAction":
    case "setSidebarGitPrimaryAction":
      return (
        typeof message.action === "string" && ["commit", "push", "pr"].includes(message.action)
      );

    case "refreshGitState":
      return true;

    case "setSidebarGitCommitConfirmationEnabled":
    case "setSidebarGitGenerateCommitBodyEnabled":
      return typeof message.enabled === "boolean";

    case "confirmSidebarGitCommit":
      return (
        typeof message.requestId === "string" &&
        message.requestId.length > 0 &&
        typeof message.message === "string"
      );

    case "cancelSidebarGitCommit":
      return typeof message.requestId === "string" && message.requestId.length > 0;

    case "syncSidebarCommandOrder":
      return (
        typeof message.requestId === "string" &&
        message.requestId.length > 0 &&
        Array.isArray(message.commandIds) &&
        message.commandIds.every(
          (commandId) => typeof commandId === "string" && commandId.length > 0,
        )
      );

    case "runSidebarAgent":
    case "deleteSidebarAgent":
      return typeof message.agentId === "string" && message.agentId.length > 0;

    case "syncSidebarAgentOrder":
      return (
        typeof message.requestId === "string" &&
        message.requestId.length > 0 &&
        Array.isArray(message.agentIds) &&
        message.agentIds.every((agentId) => typeof agentId === "string" && agentId.length > 0)
      );

    case "createSessionInGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "focusGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "focusSession":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;

    case "promptRenameSession":
    case "restartSession":
    case "closeSession":
    case "setSessionSleeping":
    case "setSessionFavorite":
    case "copyResumeCommand":
    case "forkSession":
    case "fullReloadSession":
    case "attachToIde":
    case "requestT3SessionBrowserAccess":
      return (
        (message.type === "attachToIde" ||
          (typeof message.sessionId === "string" && message.sessionId.length > 0)) &&
        (message.type !== "setSessionSleeping" || typeof message.sleeping === "boolean") &&
        (message.type !== "setSessionFavorite" || typeof message.favorite === "boolean")
      );

    case "fullReloadGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "restorePreviousSession":
    case "deletePreviousSession":
      return typeof message.historyId === "string" && message.historyId.length > 0;

    case "clearGeneratedPreviousSessions":
      return true;

    case "saveScratchPad":
      return typeof message.content === "string";

    case "savePinnedPrompt":
      return (
        typeof message.content === "string" &&
        typeof message.title === "string" &&
        (message.promptId === undefined || typeof message.promptId === "string")
      );

    case "setSidebarSectionCollapsed":
      return (
        (message.section === "actions" || message.section === "agents") &&
        typeof message.collapsed === "boolean"
      );

    case "sidebarDebugLog":
      return typeof message.event === "string" && message.event.length > 0;

    case "renameSession":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        typeof message.title === "string"
      );

    case "setT3SessionThreadId":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        typeof message.threadId === "string" &&
        message.threadId.trim().length > 0
      );

    case "renameGroup":
      return (
        typeof message.groupId === "string" &&
        message.groupId.length > 0 &&
        typeof message.title === "string"
      );

    case "setVisibleCount":
      return (
        typeof message.visibleCount === "number" &&
        [1, 2, 3, 4, 6, 9].includes(message.visibleCount)
      );

    case "setViewMode":
      return (
        typeof message.viewMode === "string" &&
        ["horizontal", "vertical", "grid"].includes(message.viewMode)
      );

    case "toggleActiveSessionsSortMode":
      return true;

    case "moveSessionToGroup":
      return (
        typeof message.sessionId === "string" &&
        message.sessionId.length > 0 &&
        typeof message.groupId === "string" &&
        message.groupId.length > 0 &&
        (message.targetIndex === undefined ||
          (typeof message.targetIndex === "number" &&
            Number.isInteger(message.targetIndex) &&
            message.targetIndex >= 0))
      );

    case "createGroupFromSession":
      return typeof message.sessionId === "string" && message.sessionId.length > 0;

    case "createGroup":
      return true;

    case "syncSessionOrder":
      return (
        typeof message.groupId === "string" &&
        message.groupId.length > 0 &&
        Array.isArray(message.sessionIds) &&
        message.sessionIds.every(
          (sessionId) => typeof sessionId === "string" && sessionId.length > 0,
        )
      );

    case "setGroupSleeping":
      return (
        typeof message.groupId === "string" &&
        message.groupId.length > 0 &&
        typeof message.sleeping === "boolean"
      );

    case "closeGroup":
      return typeof message.groupId === "string" && message.groupId.length > 0;

    case "syncGroupOrder":
      return (
        Array.isArray(message.groupIds) &&
        message.groupIds.every((groupId) => typeof groupId === "string" && groupId.length > 0)
      );

    case "saveSidebarCommand":
      return (
        (message.commandId === undefined ||
          (typeof message.commandId === "string" && message.commandId.length > 0)) &&
        typeof message.name === "string" &&
        typeof message.actionType === "string" &&
        ["browser", "terminal"].includes(message.actionType) &&
        typeof message.closeTerminalOnExit === "boolean" &&
        (message.command === undefined || typeof message.command === "string") &&
        (message.icon === undefined || isSidebarCommandIcon(message.icon)) &&
        (message.iconColor === undefined ||
          normalizeSidebarCommandIconColor(message.iconColor) !== undefined) &&
        (message.isGlobal === undefined || typeof message.isGlobal === "boolean") &&
        typeof message.playCompletionSound === "boolean" &&
        (message.url === undefined || typeof message.url === "string")
      );

    case "saveSidebarAgent":
      return (
        (message.agentId === undefined ||
          (typeof message.agentId === "string" && message.agentId.length > 0)) &&
        typeof message.name === "string" &&
        typeof message.command === "string" &&
        (message.icon === undefined || typeof message.icon === "string")
      );

    default:
      return false;
  }
}
