import { createRoot } from "react-dom/client";
import { DebugPanelApp } from "./app";
import "./styles.css";

declare global {
  function acquireVsCodeApi(): {
    postMessage: (message: unknown) => void;
  };
  interface Window {
    __VSMUX_DEBUG_CLEAR_URL__?: string;
    __VSMUX_DEBUG_STATE_URL__?: string;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Debug panel root element was not found.");
}

const vscode = typeof globalThis.acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;
const root = createRoot(rootElement);

root.render(
  <DebugPanelApp
    clearUrl={window.__VSMUX_DEBUG_CLEAR_URL__ ?? "/clear"}
    vscode={vscode}
    stateUrl={window.__VSMUX_DEBUG_STATE_URL__ ?? "/state"}
  />,
);
