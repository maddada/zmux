import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, waitFor, within } from "storybook/test";
import type { SidebarStoryArgs } from "./sidebar-story-fixtures";
import { resetSidebarStoryMessages } from "./sidebar-story-harness";
import {
  dragAndDrop,
  dragSessionToGroup,
  dragToHover,
  expectMessage,
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
    highlightedVisibleCount: 4,
    visibleCount: 4,
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

    await step("change sessions shown", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(
        canvas.getByRole("button", { name: "Open visible session options for Group 4" }),
      );
      await userEvent.click(await body.findByRole("menuitem", { name: "6" }));
      await expectMessage({ type: "setVisibleCount", visibleCount: 6 });
    });

    await step("switch layout mode", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(
        canvas.getByRole("button", { name: "Open layout options for Group 4" }),
      );
      await userEvent.click(await body.findByRole("menuitem", { name: "Columns" }));
      await expectMessage({ type: "setViewMode", viewMode: "horizontal" });
    });

    await step("open sidebar settings", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", { name: "Open sidebar menu" }));
      await userEvent.click(await body.findByRole("menuitem", { name: "Sidebar Settings" }));
      await expectMessage({ type: "openSettings" });
    });
  },
};

export const SessionCardActions: Story = {
  play: async ({ canvas, canvasElement, step, userEvent }) => {
    const storyDocument = canvasElement.ownerDocument;
    const body = within(storyDocument.body);

    const sessionCard = await canvas.findByRole("button", { name: /Harbor Vale/i });
    resetSidebarStoryMessages();

    await step("focus a session from its card", async () => {
      await userEvent.click(sessionCard);
      await expectMessage({ sessionId: "session-3", type: "focusSession" });
    });

    await step("rename a session from the hover button", async () => {
      resetSidebarStoryMessages();

      await userEvent.hover(sessionCard);
      await userEvent.click(await canvas.findByRole("button", { name: "Rename session" }));

      await expectMessage({ sessionId: "session-3", type: "promptRenameSession" });
    });

    await step("rename through the session context menu", async () => {
      resetSidebarStoryMessages();

      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", { name: "Rename" }));

      await expectMessage({ sessionId: "session-3", type: "promptRenameSession" });
    });

    await step("copy a resume command through the session context menu", async () => {
      resetSidebarStoryMessages();

      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", { name: "Copy resume" }));

      await expectMessage({ sessionId: "session-3", type: "copyResumeCommand" });
    });

    await step("terminate through the session context menu", async () => {
      resetSidebarStoryMessages();

      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", { name: "Terminate" }));

      await expectMessage({ sessionId: "session-3", type: "closeSession" });
    });
  },
};

export const DragToReorderWithinGroup: Story = {
  play: async ({ canvas, canvasElement, step }) => {
    const storyRoot = canvasElement.ownerDocument.body;
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
      await dragAndDrop(firstSession, secondSession);

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

    await step("move the same session back and forth across groups", async () => {
      resetSidebarStoryMessages();
      await dragAndDrop(
        await findRequiredElement(
          storyRoot,
          '[data-sidebar-session-id="session-3"]',
          "session-3 card",
        ),
        await findRequiredElement(
          storyRoot,
          '[data-sidebar-group-id="group-2"]',
          "group-2 section",
        ),
      );
      await expectMessage({
        groupId: "group-2",
        sessionId: "session-3",
        targetIndex: 0,
        type: "moveSessionToGroup",
      });
      await expectSessionMembership(storyRoot, "group-2", ["session-3", "session-4", "session-5"]);

      resetSidebarStoryMessages();
      await dragAndDrop(
        await findRequiredElement(
          storyRoot,
          '[data-sidebar-session-id="session-3"]',
          "session-3 card",
        ),
        await findRequiredElement(
          storyRoot,
          '[data-sidebar-group-id="group-1"]',
          "group-1 section",
        ),
      );
      await expectMessage({
        groupId: "group-1",
        sessionId: "session-3",
        targetIndex: 0,
        type: "moveSessionToGroup",
      });
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
