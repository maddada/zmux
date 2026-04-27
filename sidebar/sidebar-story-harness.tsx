import { startTransition, useEffect, useRef, useState } from "react";
import type {
  SidebarHydrateMessage,
  SidebarToExtensionMessage,
} from "../shared/session-grid-contract";
import { SidebarApp } from "./sidebar-app";
import { logSidebarDebug } from "./sidebar-debug";
import {
  createSidebarStoryMessage,
  createSidebarStoryWorkspace,
  reduceSidebarStoryWorkspace,
} from "./sidebar-story-workspace";
import type { WebviewApi } from "./webview-api";

export type SidebarStoryHarnessProps = {
  message: SidebarHydrateMessage;
};

const sidebarStoryMessages: SidebarToExtensionMessage[] = [];
const STORYBOOK_DRAG_SETTLE_DELAY_MS = 900;

export function getSidebarStoryMessages() {
  return [...sidebarStoryMessages];
}

export function resetSidebarStoryMessages() {
  sidebarStoryMessages.length = 0;
}

export function SidebarStoryHarness({ message }: SidebarStoryHarnessProps) {
  const [workspace, setWorkspace] = useState(() => createSidebarStoryWorkspace(message));
  const workspaceRef = useRef(workspace);
  const vscode = useRef<WebviewApi>({
    postMessage(nextMessage) {
      sidebarStoryMessages.push(nextMessage);

      if (nextMessage.type === "sidebarDebugLog") {
        logSidebarDebug(true, `storybook ${nextMessage.event}`, nextMessage.details);
      }

      const nextWorkspace = reduceSidebarStoryWorkspace(workspaceRef.current, nextMessage);
      if (!nextWorkspace) {
        return;
      }

      scheduleStoryWorkspaceUpdate(() => {
        startTransition(() => {
          setWorkspace(nextWorkspace);
        });
      });
    },
  }).current;

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    startTransition(() => {
      setWorkspace(createSidebarStoryWorkspace(message));
    });
  }, [message]);

  useEffect(() => {
    const nextMessage = createSidebarStoryMessage(workspace);
    const timeoutId = window.setTimeout(() => {
      window.postMessage(nextMessage, "*");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [workspace]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <SidebarApp vscode={vscode} />
    </div>
  );
}

function scheduleStoryWorkspaceUpdate(callback: () => void) {
  window.setTimeout(() => {
    if (typeof window.requestAnimationFrame !== "function") {
      callback();
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        callback();
      });
    });
  }, STORYBOOK_DRAG_SETTLE_DELAY_MS);
}
