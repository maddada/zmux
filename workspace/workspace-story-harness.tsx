import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type {
  SidebarHydrateMessage,
  SidebarToExtensionMessage,
} from "../shared/session-grid-contract";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import type { TerminalSessionSnapshot } from "../shared/terminal-host-protocol";
import { SidebarApp } from "../sidebar/sidebar-app";
import {
  createSidebarStoryMessage as createSidebarStateMessage,
  createSidebarStoryWorkspace,
  reduceSidebarStoryWorkspace,
  type SidebarStoryWorkspace,
} from "../sidebar/sidebar-story-workspace";
import { WorkspaceApp } from "./workspace-app";

export type WorkspaceStoryHarnessProps = {
  debuggingMode?: boolean;
  message: SidebarHydrateMessage;
};

type StoryMessageSource = Pick<Window, "addEventListener" | "removeEventListener"> & EventTarget;

const STORYBOOK_CONNECTION = {
  baseUrl: "ws://127.0.0.1:0",
  mock: true,
  token: "storybook",
  workspaceId: "storybook-workspace",
};

export function WorkspaceStoryHarness({
  debuggingMode = false,
  message,
}: WorkspaceStoryHarnessProps) {
  const [workspace, setWorkspace] = useState(() => createSidebarStoryWorkspace(message));
  const workspaceRef = useRef(workspace);
  const sidebarMessageSource = useRef<StoryMessageSource>(createStoryMessageSource()).current;
  const workspaceMessageSource = useRef<StoryMessageSource>(createStoryMessageSource()).current;

  const applyWorkspaceMessage = (nextMessage: SidebarToExtensionMessage) => {
    const nextWorkspace = reduceSidebarStoryWorkspace(workspaceRef.current, nextMessage);
    if (!nextWorkspace) {
      return;
    }

    startTransition(() => {
      setWorkspace(nextWorkspace);
    });
  };

  const sidebarVscode = useMemo(
    () => ({
      postMessage(nextMessage: SidebarToExtensionMessage) {
        applyWorkspaceMessage(nextMessage);
      },
    }),
    [],
  );

  const workspaceVscode = useMemo(
    () => ({
      postMessage(nextMessage: unknown) {
        const focusMessage = getFocusSessionMessage(nextMessage);
        if (!focusMessage) {
          return;
        }

        applyWorkspaceMessage({
          sessionId: focusMessage.sessionId,
          type: "focusSession",
        });
      },
    }),
    [],
  );

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    startTransition(() => {
      setWorkspace(createSidebarStoryWorkspace(message));
    });
  }, [message]);

  useEffect(() => {
    const sidebarMessage = createSidebarStateMessage(workspace);
    const workspaceMessage = createWorkspaceStoryMessage(workspace, debuggingMode);
    const timeoutId = window.setTimeout(() => {
      dispatchStoryMessage(sidebarMessageSource, sidebarMessage);
      dispatchStoryMessage(workspaceMessageSource, workspaceMessage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debuggingMode, sidebarMessageSource, workspace, workspaceMessageSource]);

  return (
    <div
      style={{
        boxSizing: "border-box",
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "170px minmax(0, 1fr)",
        height: "100vh",
        padding: "16px",
      }}
    >
      <div
        style={{
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <SidebarApp messageSource={sidebarMessageSource} vscode={sidebarVscode} />
      </div>
      <div
        style={{
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <WorkspaceApp messageSource={workspaceMessageSource} vscode={workspaceVscode} />
      </div>
    </div>
  );
}

function createWorkspaceStoryMessage(
  workspace: SidebarStoryWorkspace,
  debuggingMode: boolean,
): ExtensionToWorkspacePanelMessage {
  const sidebarMessage = createSidebarStateMessage(workspace);
  const activeGroup =
    sidebarMessage.groups.find((group) => group.isActive) ?? sidebarMessage.groups[0];
  const focusedSessionId = activeGroup?.sessions.find((session) => session.isFocused)?.sessionId;
  const sessionById = new Map(
    (activeGroup?.sessions ?? []).map((session) => [session.sessionId, session]),
  );
  const visibleSessionIds =
    workspace.snapshot.groups.find((group) => group.groupId === workspace.snapshot.activeGroupId)
      ?.snapshot.visibleSessionIds ?? [];
  const panes = visibleSessionIds
    .map((sessionId) => sessionById.get(sessionId))
    .filter(
      (session): session is NonNullable<typeof session> =>
        session !== undefined && session.isVisible,
    )
    .map<WorkspacePanelTerminalPane>((session) => ({
      isVisible: true,
      kind: "terminal",
      sessionId: session.sessionId,
      sessionRecord: {
        alias: session.alias,
        column: session.column,
        createdAt: new Date(0).toISOString(),
        displayId: parseDisplayId(session.shortcutLabel),
        kind: "terminal",
        row: session.row,
        sessionId: session.sessionId,
        slotIndex: parseSlotIndex(session.shortcutLabel),
        title: session.primaryTitle ?? session.alias,
      },
      snapshot: createTerminalSnapshot(session.sessionId),
      terminalTitle: session.terminalTitle,
    }));

  return {
    activeGroupId: workspace.snapshot.activeGroupId,
    connection: STORYBOOK_CONNECTION,
    debuggingMode,
    focusedSessionId,
    layoutAppearance: {
      activePaneBorderColor: "rgba(90, 134, 255, 0.95)",
      paneGap: 12,
    },
    panes,
    terminalAppearance: {
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: '"MesloLGL Nerd Font Mono", Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      letterSpacing: 0,
      lineHeight: 1,
    },
    type: "hydrate",
    viewMode: activeGroup?.viewMode ?? "grid",
    visibleCount: activeGroup?.visibleCount ?? 1,
    workspaceSnapshot: workspace.snapshot,
  };
}

function createTerminalSnapshot(sessionId: string): TerminalSessionSnapshot {
  return {
    agentName: "OpenAI Codex",
    agentStatus: "idle",
    cols: 120,
    cwd: "/Users/madda/dev/_active/agent-tiler",
    history: getTerminalHistory(sessionId),
    isAttached: true,
    restoreState: "live",
    rows: 34,
    sessionId,
    shell: "/bin/zsh",
    startedAt: new Date(0).toISOString(),
    status: "running",
    workspaceId: "storybook-workspace",
  };
}

function getTerminalHistory(sessionId: string): string {
  return [
    "\u001b[38;2;145;203;255mdev/_active/agent-tiler\u001b[0m ",
    `\u001b[38;2;255;216;115m${sessionId}\u001b[0m`,
    "\r\n",
    "$ pnpm exec tsc -p tsconfig.extension.json --noEmit\r\n",
    "No type errors found.\r\n",
    "$ pnpm exec vp build --config vite.workspace.config.ts\r\n",
    "vite v8.0.0 building client environment for production...\r\n",
    "transforming... ✓ 26 modules transformed.\r\n",
    "rendering chunks...\r\n",
    "computing gzip size...\r\n",
    '$ echo "focus / resize / fit debugging"\r\n',
    "focus / resize / fit debugging\r\n",
    "$ ",
  ].join("");
}

function parseDisplayId(shortcutLabel: string): string {
  const matchedIndex = shortcutLabel.match(/(\d+)$/)?.[1];
  return matchedIndex ? matchedIndex.padStart(2, "0") : "00";
}

function parseSlotIndex(shortcutLabel: string): number {
  const matchedIndex = shortcutLabel.match(/(\d+)$/)?.[1];
  const slotIndex = matchedIndex ? Number.parseInt(matchedIndex, 10) : Number.NaN;
  return Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : 1;
}

function dispatchStoryMessage(source: StoryMessageSource, data: unknown) {
  source.dispatchEvent(new MessageEvent("message", { data }));
}

function createStoryMessageSource(): StoryMessageSource {
  return new EventTarget();
}

function getFocusSessionMessage(
  value: unknown,
): { sessionId: string; type: "focusSession" } | undefined {
  return isObjectRecord(value) &&
    value.type === "focusSession" &&
    typeof value.sessionId === "string"
    ? {
        sessionId: value.sessionId,
        type: "focusSession",
      }
    : undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
