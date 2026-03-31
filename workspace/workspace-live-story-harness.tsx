import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type {
  GroupedSessionWorkspaceSnapshot,
  TerminalSessionRecord,
} from "../shared/session-grid-contract";
import type {
  ExtensionToWorkspacePanelMessage,
  WorkspacePanelConnection,
  WorkspacePanelTerminalPane,
} from "../shared/workspace-panel-contract";
import { SidebarApp } from "../sidebar/sidebar-app";
import {
  createSidebarStoryMessage as createSidebarStateMessage,
  reduceSidebarStoryWorkspace,
  type SidebarStoryWorkspace,
} from "../sidebar/sidebar-story-workspace";
import type { WebviewApi } from "../sidebar/webview-api";
import { WorkspaceApp } from "./workspace-app";

type LiveBootstrapSession = {
  alias: string;
  displayId: string;
  sessionId: string;
  title: string;
};

type LiveBootstrapResponse = {
  connection: WorkspacePanelConnection;
  sessions: LiveBootstrapSession[];
};

type StoryMessageSource = Pick<Window, "addEventListener" | "removeEventListener"> & EventTarget;

const LIVE_SERVER_URL = "http://127.0.0.1:41737";

export function WorkspaceLiveStoryHarness() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [workspace, setWorkspace] = useState<SidebarStoryWorkspace | undefined>();
  const [connection, setConnection] = useState<WorkspacePanelConnection | undefined>();
  const workspaceRef = useRef(workspace);
  const sidebarMessageSource = useRef<StoryMessageSource>(createStoryMessageSource()).current;
  const workspaceMessageSource = useRef<StoryMessageSource>(createStoryMessageSource()).current;

  const applyWorkspaceMessage = (nextMessage: Parameters<WebviewApi["postMessage"]>[0]) => {
    if (!workspaceRef.current) {
      return;
    }

    const nextWorkspace = reduceSidebarStoryWorkspace(workspaceRef.current, nextMessage);
    if (!nextWorkspace) {
      return;
    }

    startTransition(() => {
      setWorkspace(nextWorkspace);
    });
  };

  const sidebarVscode = useMemo<WebviewApi>(
    () => ({
      postMessage(nextMessage) {
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
    let didCancel = false;

    void fetch(`${LIVE_SERVER_URL}/bootstrap`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Bootstrap failed with ${String(response.status)}.`);
        }

        const payload = await response.json();
        const bootstrap = parseLiveBootstrapResponse(payload);
        if (!bootstrap) {
          throw new Error("Bootstrap response was malformed.");
        }

        return bootstrap;
      })
      .then((bootstrap) => {
        if (didCancel) {
          return;
        }

        setConnection(bootstrap.connection);
        startTransition(() => {
          setWorkspace(createLiveStoryWorkspace(bootstrap.sessions));
        });
      })
      .catch((error: unknown) => {
        if (didCancel) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : String(error));
      });

    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    if (!workspace || !connection) {
      return;
    }

    const sidebarMessage = createSidebarStateMessage(workspace);
    const workspaceMessage = createWorkspaceMessage(workspace, connection);
    const timeoutId = window.setTimeout(() => {
      dispatchStoryMessage(sidebarMessageSource, sidebarMessage);
      dispatchStoryMessage(workspaceMessageSource, workspaceMessage);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [connection, sidebarMessageSource, workspace, workspaceMessageSource]);

  if (errorMessage) {
    return (
      <div style={{ padding: 24 }}>
        <strong>Live Story Unavailable</strong>
        <div>{errorMessage}</div>
        <div>Run `pnpm storybook:live` to start the local PTY sidecar.</div>
      </div>
    );
  }

  if (!workspace || !connection) {
    return (
      <div style={{ padding: 24 }}>
        <strong>Connecting live story…</strong>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#0a0f16",
        alignItems: "stretch",
        boxSizing: "border-box",
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "170px minmax(0, 1fr)",
        inset: 0,
        height: "100dvh",
        left: 0,
        minWidth: 0,
        overflow: "hidden",
        padding: "16px",
        position: "fixed",
        top: 0,
        width: "100vw",
      }}
    >
      <div
        style={{
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <SidebarApp messageSource={sidebarMessageSource} vscode={sidebarVscode} />
      </div>
      <div
        style={{
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <WorkspaceApp messageSource={workspaceMessageSource} vscode={workspaceVscode} />
      </div>
    </div>
  );
}

function createLiveStoryWorkspace(
  sessions: readonly LiveBootstrapSession[],
): SidebarStoryWorkspace {
  const sessionRecords = sessions.map<TerminalSessionRecord>((session, index) => ({
    alias: session.alias,
    column: index,
    createdAt: new Date(0).toISOString(),
    displayId: session.displayId,
    kind: "terminal",
    row: 0,
    sessionId: session.sessionId,
    slotIndex: index,
    title: session.title,
  }));

  const snapshot: GroupedSessionWorkspaceSnapshot = {
    activeGroupId: "group-live",
    groups: [
      {
        groupId: "group-live",
        snapshot: {
          focusedSessionId: sessionRecords[0]?.sessionId,
          fullscreenRestoreVisibleCount: undefined,
          sessions: sessionRecords,
          viewMode: "vertical",
          visibleCount: getInitialVisibleCount(sessionRecords.length),
          visibleSessionIds: sessionRecords.slice(0, 2).map((session) => session.sessionId),
        },
        title: "Live",
      },
    ],
    nextGroupNumber: 2,
    nextSessionDisplayId: sessions.length,
    nextSessionNumber: sessions.length + 1,
  };

  return {
    options: {
      agentManagerZoomPercent: 100,
      agents: [],
      commands: [],
      completionBellEnabled: false,
      completionSound: "ping",
      debuggingMode: false,
      scratchPadContent: "",
      showCloseButtonOnSessionCards: true,
      showHotkeysOnSessionCards: false,
      theme: "dark-blue",
    },
    sessionDecorationsById: Object.fromEntries(
      sessions.map((session) => [
        session.sessionId,
        {
          activity: "idle",
          activityLabel: "Idle",
          detail: session.alias,
          isRunning: true,
          terminalTitle: session.title,
        },
      ]),
    ),
    snapshot,
  };
}

function createWorkspaceMessage(
  workspace: SidebarStoryWorkspace,
  connection: WorkspacePanelConnection,
): ExtensionToWorkspacePanelMessage {
  const activeGroup =
    workspace.snapshot.groups.find((group) => group.groupId === workspace.snapshot.activeGroupId) ??
    workspace.snapshot.groups[0];
  const sessionById = new Map(
    (activeGroup?.snapshot.sessions ?? []).map((session) => [session.sessionId, session]),
  );
  const panes = (activeGroup?.snapshot.visibleSessionIds ?? [])
    .map((sessionId) => sessionById.get(sessionId))
    .filter((session): session is TerminalSessionRecord => session?.kind === "terminal")
    .map<WorkspacePanelTerminalPane>((sessionRecord) => ({
      isVisible: true,
      kind: "terminal",
      sessionId: sessionRecord.sessionId,
      sessionRecord,
      terminalTitle:
        workspace.sessionDecorationsById[sessionRecord.sessionId]?.terminalTitle ??
        sessionRecord.title,
    }));

  return {
    activeGroupId: workspace.snapshot.activeGroupId,
    connection,
    debuggingMode: true,
    focusedSessionId: activeGroup?.snapshot.focusedSessionId,
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
    viewMode: activeGroup?.snapshot.viewMode ?? "vertical",
    visibleCount: activeGroup?.snapshot.visibleCount ?? 2,
    workspaceSnapshot: workspace.snapshot,
  };
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

function getInitialVisibleCount(sessionCount: number): 1 | 2 {
  return sessionCount <= 1 ? 1 : 2;
}

function parseLiveBootstrapResponse(value: unknown): LiveBootstrapResponse | undefined {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const connection = parseWorkspacePanelConnection(value.connection);
  const sessions = Array.isArray(value.sessions)
    ? value.sessions.map(parseLiveBootstrapSession)
    : undefined;
  if (!connection || !sessions || sessions.some((session) => session === undefined)) {
    return undefined;
  }

  return {
    connection,
    sessions,
  };
}

function parseLiveBootstrapSession(value: unknown): LiveBootstrapSession | undefined {
  return isObjectRecord(value) &&
    typeof value.alias === "string" &&
    typeof value.displayId === "string" &&
    typeof value.sessionId === "string" &&
    typeof value.title === "string"
    ? {
        alias: value.alias,
        displayId: value.displayId,
        sessionId: value.sessionId,
        title: value.title,
      }
    : undefined;
}

function parseWorkspacePanelConnection(value: unknown): WorkspacePanelConnection | undefined {
  return isObjectRecord(value) &&
    typeof value.baseUrl === "string" &&
    typeof value.token === "string" &&
    typeof value.workspaceId === "string" &&
    (value.mock === undefined || typeof value.mock === "boolean")
    ? {
        baseUrl: value.baseUrl,
        mock: value.mock,
        token: value.token,
        workspaceId: value.workspaceId,
      }
    : undefined;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
