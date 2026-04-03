import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import type { SidebarStoryArgs } from "./sidebar-story-fixtures";
import { resetSidebarStoryMessages } from "./sidebar-story-harness";
import {
  dragAndDrop,
  dragSessionToGroup,
  dragToHover,
  expectMessage,
  expectNoMessage,
  expectSessionMembership,
  findRequiredElement,
  openContextMenu,
  releaseDrag,
  waitForReadyMessage,
} from "./sidebar-app.interactions.helpers";
import {
  DEFAULT_SIDEBAR_STORY_ARGS,
  SIDEBAR_STORY_ARG_TYPES,
  SIDEBAR_STORY_DECORATORS,
  renderSidebarStory,
} from "./sidebar-story-meta";

const meta = {
  title: "Sidebar/Interactions",
  args: DEFAULT_SIDEBAR_STORY_ARGS,
  argTypes: SIDEBAR_STORY_ARG_TYPES,
  decorators: SIDEBAR_STORY_DECORATORS,
  render: renderSidebarStory,
} satisfies Meta<SidebarStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ToolbarActions: Story = {
  args: {
    highlightedVisibleCount: 2,
    visibleCount: 2,
  },
  play: async ({ canvas, canvasElement, step, userEvent }) => {
    const body = within(canvasElement.ownerDocument.body);

    await waitForReadyMessage();
    resetSidebarStoryMessages();

    await step("remove the global new session button", async () => {
      await expect(canvas.queryByRole("button", { name: "New Session" })).toBeNull();
    });

    await step("request a new session inside a group", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Create a session in Group 4" }));
      await expectMessage({ groupId: "group-4", type: "createSessionInGroup" });
    });

    await step("toggle sessions shown", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", { name: "Select split count for Group 4" }));
      await userEvent.click(await body.findByRole("menuitem", { name: "Show 2 splits" }));
      await expectMessage({ type: "setVisibleCount", visibleCount: 2 });
    });

    await step("keep the split menu available on right click", async () => {
      resetSidebarStoryMessages();
      const splitModeButton = canvas.getByRole("button", { name: "Select split count for Group 4" });
      await openContextMenu(splitModeButton);
      await body.findByRole("menuitem", { name: "Show 3 splits" });
      await body.findByRole("menuitem", { name: "Show 4 splits" });
      await body.findByRole("menuitem", { name: "Show 6 splits" });
      await body.findByRole("menuitem", { name: "Show 9 splits" });
      await userEvent.click(await body.findByRole("menuitem", { name: "Show 4 splits" }));
      await expectMessage({ type: "setVisibleCount", visibleCount: 4 });
    });

    await step("keep the layout selector hidden", async () => {
      await expect(
        canvas.queryByRole("button", { name: "Open layout options for Group 4" }),
      ).toBeNull();
    });

    await step("open sidebar settings", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", { name: "Open sidebar menu" }));
      await userEvent.click(await body.findByRole("menuitem", { name: "VSmux Settings" }));
      await expectMessage({ type: "openSettings" });
    });

    await step("collapse the sidebar menu from its trigger", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Open sidebar menu" }));
      await body.findByRole("menuitem", { name: "Add Agent" });
      await userEvent.click(canvas.getByRole("button", { name: "Open sidebar menu" }));
      await waitFor(() => {
        expect(body.queryByRole("menuitem", { name: "Add Agent" })).toBeNull();
      });
    });

    await step("zoom terminals without closing the sidebar menu", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", { name: "Open sidebar menu" }));
      await userEvent.click(await body.findByRole("menuitem", { name: "Zoom Out" }));
      await expectMessage({ delta: -1, type: "adjustTerminalFontSize" });
      await expect(body.getByRole("menuitem", { name: "Zoom In" })).toBeVisible();

      resetSidebarStoryMessages();
      await userEvent.click(body.getByRole("menuitem", { name: "Zoom In" }));
      await expectMessage({ delta: 1, type: "adjustTerminalFontSize" });
      await expect(body.getByRole("menuitem", { name: "Zoom Out" })).toBeVisible();
    });

    await step("still create a session in a group after menu interactions", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", { name: "Create a session in Group 4" }));
      await expectMessage({ groupId: "group-4", type: "createSessionInGroup" });
    });
  },
};

export const SessionCardActions: Story = {
  play: async ({ canvas, canvasElement, step, userEvent }) => {
    const storyDocument = canvasElement.ownerDocument;
    const body = within(storyDocument.body);
    const findSessionCard = () => canvas.findByRole("button", { name: /Harbor Vale/i });

    await waitForReadyMessage();
    resetSidebarStoryMessages();

    await step("focus a session from its card", async () => {
      const sessionCard = await findSessionCard();
      await userEvent.click(sessionCard);
      await expectMessage({ sessionId: "session-3", type: "focusSession" });
    });

    await step("rename a session from the hover button", async () => {
      resetSidebarStoryMessages();

      const sessionCard = await findSessionCard();
      await userEvent.hover(sessionCard);
      const sessionFrame = sessionCard.closest(".session-frame");
      if (!(sessionFrame instanceof HTMLElement)) {
        throw new Error("Expected hovered session card to be wrapped by .session-frame");
      }

      await userEvent.click(within(sessionFrame).getByRole("button", { name: "Rename session" }));

      await expectMessage({ sessionId: "session-3", type: "promptRenameSession" });
    });

    await step("rename through the session context menu", async () => {
      resetSidebarStoryMessages();

      const sessionCard = await findSessionCard();
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", { name: "Rename" }));

      await expectMessage({ sessionId: "session-3", type: "promptRenameSession" });
    });

    await step("copy a resume command through the session context menu", async () => {
      resetSidebarStoryMessages();

      const sessionCard = await findSessionCard();
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", { name: "Copy resume" }));

      await expectMessage({ sessionId: "session-3", type: "copyResumeCommand" });
    });

    await step("terminate through the session context menu", async () => {
      resetSidebarStoryMessages();

      const sessionCard = await findSessionCard();
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", { name: "Terminate" }));

      await expectMessage({ sessionId: "session-3", type: "closeSession" });
    });
  },
};

export const DragToReorderWithinGroup: Story = {
  play: async ({ canvas, canvasElement, step }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    const firstSession = await findRequiredElement(
      storyRoot,
      '[data-sidebar-session-id="session-1"]',
      "session-1 card",
    );
    const secondSession = await findRequiredElement(
      storyRoot,
      '[data-sidebar-session-id="session-2"]',
      "session-2 card",
    );
    const firstGroupTwoSession = await findRequiredElement(
      storyRoot,
      '[data-sidebar-session-id="session-4"]',
      "session-4 card",
    );
    const secondGroupTwoSession = await findRequiredElement(
      storyRoot,
      '[data-sidebar-session-id="session-5"]',
      "session-5 card",
    );
    resetSidebarStoryMessages();

    await step("keep each group-2 frame mapped to a single session while hovering", async () => {
      const dragState = await dragToHover(firstGroupTwoSession, secondGroupTwoSession);

      await waitFor(() => {
        const frameSessionCounts = Array.from(
          storyRoot.querySelectorAll('[data-sidebar-group-id="group-2"] .session-frame'),
        ).map((frame) => frame.querySelectorAll(".session").length);

        return expect(frameSessionCounts).toEqual([1, 1]);
      });

      await releaseDrag(secondGroupTwoSession, dragState);
    });

    await step("reorder sessions inside a group", async () => {
      const dragState = await dragToHover(firstSession, secondSession, "after");

      await waitFor(() => {
        const targetFrame = secondSession.closest(".session-frame");
        return expect(targetFrame).toHaveAttribute("data-drop-position", "after");
      });

      await releaseDrag(secondSession, dragState);

      await expectMessage({
        groupId: "group-1",
        sessionIds: ["session-2", "session-1", "session-3"],
        type: "syncSessionOrder",
      });

      const reorderedSessionCards = canvas.getAllByRole("button", {
        name: /show title in 2nd row|layout drift fix|Harbor Vale/i,
      });
      await expect(reorderedSessionCards[0]).toHaveTextContent("layout drift fix");
    });
  },
};

export const DragToMoveAcrossGroups: Story = {
  play: async ({ canvasElement, step }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    const sourceSession = await findRequiredElement(
      storyRoot,
      '[data-sidebar-session-id="session-3"]',
      "session-3 card",
    );
    const targetSession = await findRequiredElement(
      storyRoot,
      '[data-sidebar-session-id="session-4"]',
      "session-4 card",
    );
    resetSidebarStoryMessages();

    await step("move a session into another group at the hovered slot", async () => {
      await dragAndDrop(sourceSession, targetSession);

      await expectMessage({
        groupId: "group-2",
        sessionId: "session-3",
        targetIndex: 0,
        type: "moveSessionToGroup",
      });
      await expectSessionMembership(storyRoot, "group-1", ["session-1", "session-2"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-3", "session-4", "session-5"]);
    });
  },
};

export const DragAcrossGroupsRepeatedly: Story = {
  play: async ({ canvasElement, step }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();

    await step("move the same session back and forth across groups", async () => {
      await dragSessionToGroup(storyRoot, "session-3", "group-2");
      await expectSessionMembership(storyRoot, "group-2", ["session-3", "session-4", "session-5"]);

      await dragSessionToGroup(storyRoot, "session-3", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-3", "session-1", "session-2"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-4", "session-5"]);
    });
  },
};

export const DragAcrossThreeGroupsStress: Story = {
  args: {
    fixture: "three-groups-stress",
    highlightedVisibleCount: 2,
    visibleCount: 2,
  },
  play: async ({ canvasElement, step }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();

    await step("move sessions across three groups until groups empty and refill", async () => {
      await dragSessionToGroup(storyRoot, "session-2", "group-2");
      await expectSessionMembership(storyRoot, "group-1", ["session-1"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-2", "session-3", "session-4"]);

      await dragSessionToGroup(storyRoot, "session-1", "group-3");
      await expectSessionMembership(storyRoot, "group-1", []);
      await expectSessionMembership(storyRoot, "group-3", ["session-1", "session-5", "session-6"]);

      await dragSessionToGroup(storyRoot, "session-3", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-3"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-2", "session-4"]);

      await dragSessionToGroup(storyRoot, "session-5", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-3", "session-5"]);
      await expectSessionMembership(storyRoot, "group-3", ["session-1", "session-6"]);

      await dragSessionToGroup(storyRoot, "session-4", "group-3");
      await expectSessionMembership(storyRoot, "group-2", ["session-2"]);
      await expectSessionMembership(storyRoot, "group-3", ["session-1", "session-4", "session-6"]);

      await dragSessionToGroup(storyRoot, "session-2", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-2", "session-3", "session-5"]);
      await expectSessionMembership(storyRoot, "group-2", []);
    });
  },
};

export const DragIntoEmptyGroupAndRejectOutsideDrops: Story = {
  args: {
    fixture: "empty-groups",
  },
  play: async ({ canvasElement, step }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();

    await step("move a session into an empty group", async () => {
      resetSidebarStoryMessages();
      const sourceSession = await findRequiredElement(
        storyRoot,
        '[data-sidebar-session-id="session-1"]',
        "session-1 card",
      );
      const emptyState = await findRequiredElement(
        storyRoot,
        '[data-sidebar-group-id="group-2"] .group-empty-state',
        "group-2 empty state",
      );
      const dragState = await dragToHover(sourceSession, emptyState);

      await waitFor(() => {
        const emptyDropTarget = storyRoot.querySelector(
          '[data-sidebar-group-id="group-2"] .group-empty-drop-target',
        );
        expect(emptyDropTarget).toHaveAttribute("data-drop-position", "start");
        return expect(emptyDropTarget).toHaveAttribute("data-drop-target", "true");
      });

      await releaseDrag(emptyState, dragState);

      await expectMessage({
        groupId: "group-2",
        sessionId: "session-1",
        targetIndex: 0,
        type: "moveSessionToGroup",
      });
      await expectSessionMembership(storyRoot, "group-1", []);
      await expectSessionMembership(storyRoot, "group-2", ["session-1"]);
    });

    await step("ignore drops outside the groups", async () => {
      resetSidebarStoryMessages();
      await dragAndDrop(
        await findRequiredElement(
          storyRoot,
          '[data-sidebar-session-id="session-1"]',
          "session-1 card",
        ),
        await findRequiredElement(
          storyRoot,
          'button[aria-label="Create a new group"]',
          "new group button",
        ),
      );

      await expectNoMessage({ type: "moveSessionToGroup" });
      await expectNoMessage({ type: "syncSessionOrder" });
      await expectSessionMembership(storyRoot, "group-1", []);
      await expectSessionMembership(storyRoot, "group-2", ["session-1"]);
    });
  },
};
