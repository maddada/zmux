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
      cwd: string;
      env?: Record<string, string>;
      initialInput?: string;
      sessionId: string;
      title?: string;
      type: "createTerminal";
    }
  | {
      sessionId: string;
      type: "closeTerminal";
    }
  | {
      sessionId: string;
      type: "focusTerminal";
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
      ttyName?: string;
      type: "terminalReady";
    }
  | {
      sessionId: string;
      title: string;
      type: "terminalTitleChanged";
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
      protocolVersion: typeof NATIVE_GHOSTTY_HOST_PROTOCOL_VERSION;
      type: "hostReady";
    };
