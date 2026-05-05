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
      sessionPersistenceProvider?: "tmux" | "zmx";
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
      sessionId: string;
      text: string;
      type: "writeTerminalText";
    }
  | {
      layout: NativeTerminalLayout;
      type: "setTerminalLayout";
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
