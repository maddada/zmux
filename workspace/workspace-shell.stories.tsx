import type { Meta, StoryObj } from "@storybook/react-vite";
import type { SidebarStoryArgs } from "../sidebar/sidebar-story-fixtures";
import { createSidebarStoryMessage } from "../sidebar/sidebar-story-fixtures";
import { DEFAULT_SIDEBAR_STORY_ARGS, SIDEBAR_STORY_ARG_TYPES } from "../sidebar/sidebar-story-meta";
import { WorkspaceStoryHarness } from "./workspace-story-harness";

type WorkspaceShellStoryArgs = SidebarStoryArgs & {
  debuggingMode: boolean;
};

const meta = {
  title: "Workspace/Debug Shell",
  args: {
    ...DEFAULT_SIDEBAR_STORY_ARGS,
    debuggingMode: true,
  },
  argTypes: {
    ...SIDEBAR_STORY_ARG_TYPES,
    debuggingMode: {
      control: "boolean",
    },
  },
  render: (args: WorkspaceShellStoryArgs) => (
    <WorkspaceStoryHarness
      debuggingMode={args.debuggingMode}
      message={createSidebarStoryMessage(args)}
    />
  ),
} satisfies Meta<WorkspaceShellStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SplitFocusDebug: Story = {
  args: {
    debuggingMode: true,
    fixture: "selector-states",
    highlightedVisibleCount: 2,
    isFocusModeActive: false,
    theme: "dark-blue",
    viewMode: "vertical",
    visibleCount: 2,
  },
};
