import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import type { SidebarHydrateMessage } from "../shared/session-grid-contract";
import { createDefaultSidebarGitState } from "../shared/sidebar-git";
import {
  getWorkspaceStoryMessages,
  resetWorkspaceStoryMessages,
  WorkspaceStoryHarness,
} from "./workspace-story-harness";

const meta = {
  title: "Workspace/Interactions",
  render: () => <WorkspaceStoryHarness message={createT3WorkspaceMessage()} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const T3PaneActions: Story = {
  play: async ({ canvas, step }) => {
    await waitForWorkspaceReady(canvas);
    resetWorkspaceStoryMessages();

    await step(
      "reload the T3 pane by reloading the workspace panel to the same session",
      async () => {
        const workspacePane = getWorkspacePaneElement();
        fireEvent.click(within(workspacePane).getByRole("button", { name: "Full reload session" }));
        await expectWorkspaceMessage({
          sessionId: "session-t3-1",
          type: "reloadWorkspacePanel",
        });
      },
    );

    await step("require confirmation before closing the T3 pane", async () => {
      resetWorkspaceStoryMessages();

      const workspacePane = getWorkspacePaneElement();
      fireEvent.click(within(workspacePane).getByRole("button", { name: "Close session" }));
      await expectWorkspaceMessageAbsent({
        sessionId: "session-t3-1",
        type: "closeSession",
      });
      expect(
        within(workspacePane).getByRole("button", { name: "Confirm close session" }),
      ).toBeTruthy();
      await expect(canvas.getByRole("status")).toHaveTextContent(
        "Click the X again within 3 seconds to close T3 Code.",
      );

      fireEvent.click(within(workspacePane).getByRole("button", { name: "Confirm close session" }));
      await expectWorkspaceMessage({
        sessionId: "session-t3-1",
        type: "closeSession",
      });
    });
  },
};

async function waitForWorkspaceReady(canvas: ReturnType<typeof within>) {
  await waitFor(
    () => {
      expect(
        getWorkspaceStoryMessages().some((message) => isSubsetMatch(message, { type: "ready" })),
      ).toBe(true);
    },
    { timeout: 3_000 },
  );

  await waitFor(
    () => {
      const workspacePane = getWorkspacePaneElement();
      expect(within(workspacePane).getByText("T3 Code")).toBeVisible();
      expect(
        within(workspacePane).getByRole("button", { name: "Full reload session" }),
      ).toBeTruthy();
      expect(within(workspacePane).getByRole("button", { name: "Close session" })).toBeTruthy();
    },
    { timeout: 3_000 },
  );
}

function getWorkspacePaneElement() {
  const paneElements = Array.from(
    document.querySelectorAll<HTMLElement>("#storybook-root .workspace-pane"),
  );
  const paneElement = paneElements[paneElements.length - 1];
  if (!paneElement) {
    throw new Error("Expected a workspace pane inside #storybook-root.");
  }

  return paneElement;
}

async function expectWorkspaceMessage(expectedMessage: Record<string, unknown>) {
  await waitFor(() => {
    expect(
      getWorkspaceStoryMessages().some((message) => isSubsetMatch(message, expectedMessage)),
    ).toBe(true);
  });
}

async function expectWorkspaceMessageAbsent(
  expectedMessage: Record<string, unknown>,
  delayMs = 50,
) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
  expect(
    getWorkspaceStoryMessages().some((message) => isSubsetMatch(message, expectedMessage)),
  ).toBe(false);
}

function isSubsetMatch(candidate: unknown, expected: Record<string, unknown>): boolean {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  return Object.entries(expected).every(
    ([key, value]) => (candidate as Record<string, unknown>)[key] === value,
  );
}

function createT3WorkspaceMessage(): SidebarHydrateMessage {
  return {
    groups: [
      {
        groupId: "group-1",
        isActive: true,
        isFocusModeActive: false,
        kind: "workspace",
        layoutVisibleCount: 1,
        sessions: [
          {
            activity: "idle",
            agentIcon: "t3",
            alias: "T3 Code",
            column: 0,
            isFocused: true,
            isRunning: true,
            isVisible: true,
            kind: "workspace",
            primaryTitle: "T3 Code",
            row: 0,
            sessionId: "session-t3-1",
            sessionKind: "t3",
            shortcutLabel: "⌘⌥1",
          },
        ],
        title: "Main",
        viewMode: "grid",
        visibleCount: 1,
      },
    ],
    hud: {
      activeSessionsSortMode: "manual",
      agentManagerZoomPercent: 100,
      agents: [],
      collapsedSections: {
        actions: false,
        agents: false,
      },
      commands: [],
      commandSessionIndicators: [],
      completionBellEnabled: false,
      completionSound: "arcade",
      completionSoundLabel: "Arcade",
      debuggingMode: false,
      focusedSessionTitle: "T3 Code",
      git: createDefaultSidebarGitState(),
      highlightedVisibleCount: 1,
      isFocusModeActive: false,
      pendingAgentIds: [],
      sectionVisibility: {
        actions: true,
        agents: true,
        browsers: true,
        git: true,
      },
      createSessionOnSidebarDoubleClick: false,
      renameSessionOnDoubleClick: false,
      showCloseButtonOnSessionCards: false,
      showHotkeysOnSessionCards: false,
      showLastInteractionTimeOnSessionCards: true,
      theme: "dark-blue",
      viewMode: "grid",
      visibleCount: 1,
      visibleSlotLabels: ["⌘⌥1"],
    },
    pinnedPrompts: [],
    previousSessions: [],
    revision: 1,
    scratchPadContent: "",
    type: "hydrate",
  };
}
