import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import type { SidebarHydrateMessage } from "../shared/session-grid-contract";
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
  play: async ({ canvas, step, userEvent }) => {
    await waitForWorkspaceReady();
    resetWorkspaceStoryMessages();

    await step(
      "reload the T3 pane by reloading the workspace panel to the same session",
      async () => {
        await userEvent.click(canvas.getByRole("button", { name: "Full reload session" }));
        await expectWorkspaceMessage({
          sessionId: "session-t3-1",
          type: "reloadWorkspacePanel",
        });
      },
    );

    await step("require confirmation before closing the T3 pane", async () => {
      resetWorkspaceStoryMessages();

      await userEvent.click(canvas.getByRole("button", { name: "Close session" }));
      await expectWorkspaceMessageAbsent({
        sessionId: "session-t3-1",
        type: "closeSession",
      });
      await expect(canvas.getByRole("button", { name: "Confirm close session" })).toBeVisible();

      await userEvent.click(canvas.getByRole("button", { name: "Confirm close session" }));
      await expectWorkspaceMessage({
        sessionId: "session-t3-1",
        type: "closeSession",
      });
    });
  },
};

async function waitForWorkspaceReady() {
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
      const body = within(document.body);
      expect(body.getByText("T3 Code")).toBeVisible();
      expect(body.getByRole("button", { name: "Full reload session" })).toBeVisible();
      expect(body.getByRole("button", { name: "Close session" })).toBeVisible();
    },
    { timeout: 3_000 },
  );
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
      completionBellEnabled: false,
      completionSound: "ping",
      completionSoundLabel: "Ping",
      debuggingMode: false,
      focusedSessionTitle: "T3 Code",
      git: {
        branchLabel: "",
        confirmSuggestedCommit: false,
        hasChanges: false,
        isCommitReady: false,
        isPullRequestReady: false,
        isPushReady: false,
        primaryAction: "commit",
      },
      highlightedVisibleCount: 1,
      isFocusModeActive: false,
      pendingAgentIds: [],
      sectionVisibility: {
        actions: true,
        agents: true,
        browsers: true,
        git: true,
      },
      showCloseButtonOnSessionCards: false,
      showHotkeysOnSessionCards: false,
      showLastInteractionTimeOnSessionCards: true,
      theme: "dark-blue",
      viewMode: "grid",
      visibleCount: 1,
      visibleSlotLabels: ["⌘⌥1"],
    },
    previousSessions: [],
    revision: 1,
    scratchPadContent: "",
    type: "hydrate",
  };
}
