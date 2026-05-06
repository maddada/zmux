export const NATIVE_GHOSTTY_HOST_PROTOCOL_VERSION = 1;

export type NativeTerminalLayout =
  | {
      kind: "leaf";
      sessionId: string;
    }
  | {
      children: NativeTerminalLayout[];
      direction: "horizontal" | "vertical";
      kind: "split";
      ratio?: number;
    };

export type NativeGhosttyHostCommand =
  | {
      activateOnCreate?: boolean;
      cwd: string;
      env?: Record<string, string>;
      initialInput?: string;
      sessionId: string;
      sessionPersistenceName?: string;
      sessionPersistenceProvider?: "tmux" | "zmx" | "zellij";
      title?: string;
      tmuxMode?: boolean;
      tmuxSessionName?: string;
      type: "createTerminal";
    }
  | {
      cwd?: string;
      projectId?: string;
      sessionId: string;
      threadId?: string;
      title: string;
      type: "createWebPane";
      url: string;
    }
  | {
      sessionId: string;
      type: "closeTerminal";
    }
  | {
      sessionId: string;
      type: "closeWebPane";
    }
  | {
      sessionId: string;
      type: "focusTerminal";
    }
  | {
      sessionId: string;
      type: "focusWebPane";
    }
  | {
      cwd: string;
      type: "startT3CodeRuntime";
    }
  | {
      type: "stopT3CodeRuntime";
    }
  | {
      /**
       * CDXC:EditorPanes 2026-05-06-14:21
       * Project editor buttons launch a shared embedded code-server runtime,
       * then native AppKit creates one persistent Chromium editor surface per
       * project. These commands stay separate from terminal/web-pane sessions
       * because editor panes must not participate in split layout.
       *
       * CDXC:EditorPanes 2026-05-06-15:00
       * The runtime command carries the VS Code user-config link setting so the
       * native launcher can pass code-server's CLI flags before the editor
       * process starts instead of mutating the embedded VS Code UI later.
       */
      cwd: string;
      linkVscodeUserConfig?: boolean;
      type: "startCodeServerRuntime";
      vscodeUserConfigDir?: string;
    }
  | {
      type: "stopCodeServerRuntime";
    }
  | {
      projectId: string;
      title: string;
      type: "createProjectEditorPane";
      url: string;
    }
  | {
      projectId: string;
      type: "focusProjectEditorPane";
    }
  | {
      projectId: string;
      type: "closeProjectEditorPane";
    }
  | {
      sessionId: string;
      text: string;
      type: "writeTerminalText";
    }
  | {
      layout: NativeTerminalLayout;
      type: "setTerminalLayout";
    }
  | {
      activeProjectEditorId?: string;
      activeSessionIds: string[];
      attentionSessionIds?: string[];
      backgroundColor?: string;
      focusRequestId?: number;
      focusedSessionId?: string;
      layout?: NativeTerminalLayout;
      paneGap?: number;
      sessionActivities?: Record<string, "attention" | "working">;
      sessionAgentIconColors?: Record<string, string>;
      sessionAgentIconDataUrls?: Record<string, string>;
      sessionTitles?: Record<string, string>;
      type: "setActiveTerminalSet";
    }
  | {
      sessionId: string;
      type: "setTerminalVisibility";
      visible: boolean;
    };

export type NativeGhosttyHostEvent =
  | {
      foregroundPid?: number;
      sessionId: string;
      sessionPersistenceName?: string;
      tmuxSessionName?: string;
      ttyName?: string;
      type: "terminalReady";
    }
  | {
      sessionId: string;
      sessionPersistenceName?: string;
      title: string;
      tmuxSessionName?: string;
      type: "terminalTitleChanged";
    }
  | {
      faviconDataUrl?: string;
      sessionId: string;
      type: "browserFaviconChanged";
    }
  | {
      sessionId: string;
      type: "browserUrlChanged";
      url: string;
    }
  | {
      cwd: string;
      sessionId: string;
      type: "terminalCwdChanged";
    }
  | {
      exitCode?: number;
      sessionId: string;
      type: "terminalExited";
    }
  | {
      sessionId: string;
      type: "terminalFocused";
    }
  | {
      sessionId: string;
      type: "terminalBell";
    }
  | {
      message: string;
      sessionId: string;
      type: "terminalError";
    }
  | {
      projectId: string;
      serverOrigin: string;
      sessionId: string;
      threadId: string;
      type: "t3ThreadReady";
      workspaceRoot: string;
    }
  | {
      protocolVersion: typeof NATIVE_GHOSTTY_HOST_PROTOCOL_VERSION;
      type: "hostReady";
    };
