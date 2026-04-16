import { createRoot } from "react-dom/client";
import type {
  WorkspacePanelHydrateMessage,
  WorkspacePanelSessionStateMessage,
} from "../shared/workspace-panel-contract";
import { WorkspaceApp } from "./workspace-app";
import "./styles.css";

declare global {
  function acquireVsCodeApi(): {
    postMessage: (message: unknown) => void;
  };

  interface Window {
    __VSMUX_WORKSPACE_VSCODE__?: {
      postMessage: (message: unknown) => void;
    };
    __VSMUX_WORKSPACE_BOOTSTRAP__?:
      | WorkspacePanelHydrateMessage
      | WorkspacePanelSessionStateMessage;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Workspace root element was not found.");
}

const root = createRoot(rootElement);
const vscodeApi = acquireVsCodeApi();
window.__VSMUX_WORKSPACE_VSCODE__ = vscodeApi;
root.render(<WorkspaceApp vscode={vscodeApi} />);
