import type { FC } from "react";
import type {
  WorkspacePanelAcknowledgeSessionAttentionReason,
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelConnection,
  WorkspacePanelTerminalAppearance,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import "./terminal-pane.css";

export type TerminalPaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  connection: WorkspacePanelConnection;
  debugLog?: (event: string, payload?: Record<string, unknown>) => void;
  debuggingMode: boolean;
  isFocused: boolean;
  isVisible: boolean;
  onAttentionInteraction: (reason: WorkspacePanelAcknowledgeSessionAttentionReason) => void;
  onCancelFirstPromptAutoRename?: () => void;
  onTerminalEnter?: () => void;
  onLagDetected?: (payload: {
    overshootMs: number;
    sessionId: string;
    visibilityState: DocumentVisibilityState;
  }) => void;
  onActivate: (source: "focusin" | "pointer") => void;
  pane: WorkspacePanelTerminalPane;
  refreshRequestId: number;
  scrollToBottomRequestId?: number;
  terminalAppearance: WorkspacePanelTerminalAppearance;
};

export const TerminalPane: FC<TerminalPaneProps> = ({ isFocused, onActivate, pane }) => (
  <div
    className={`terminal-pane-root terminal-pane-root-native${isFocused ? " terminal-pane-root-focused" : ""}`}
    data-session-id={pane.sessionId}
    onFocus={() => onActivate("focusin")}
    onPointerDown={() => onActivate("pointer")}
    tabIndex={0}
  >
    <div className="terminal-pane-native-placeholder">
      Native Ghostty renders this terminal in the macOS host.
    </div>
  </div>
);
