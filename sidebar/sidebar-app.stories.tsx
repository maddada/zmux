import type { Meta, StoryObj } from "@storybook/react-vite";
import type { SidebarStoryArgs } from "./sidebar-story-fixtures";
import {
  DEFAULT_SIDEBAR_STORY_ARGS,
  SIDEBAR_STORY_ARG_TYPES,
  SIDEBAR_STORY_DECORATORS,
  renderSidebarStory,
} from "./sidebar-story-meta";

const meta = {
  title: "Sidebar/App",
  args: DEFAULT_SIDEBAR_STORY_ARGS,
  argTypes: SIDEBAR_STORY_ARG_TYPES,
  decorators: SIDEBAR_STORY_DECORATORS,
  render: renderSidebarStory,
} satisfies Meta<SidebarStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ActiveSortToggle: Story = {
  args: {
    fixture: "sort-toggle-demo",
    highlightedVisibleCount: 2,
    showCloseButtonOnSessionCards: true,
    showHotkeysOnSessionCards: true,
    showLastInteractionTimeOnSessionCards: true,
    theme: "dark-blue",
    viewMode: "grid",
    visibleCount: 2,
  },
};

export const SelectorStates: Story = {
  args: {
    fixture: "selector-states",
    highlightedVisibleCount: 4,
    isFocusModeActive: true,
    showCloseButtonOnSessionCards: true,
    showHotkeysOnSessionCards: true,
    showLastInteractionTimeOnSessionCards: true,
    theme: "dark-green",
    viewMode: "vertical",
    visibleCount: 1,
  },
};

export const OverflowStress: Story = {
  args: {
    fixture: "overflow-stress",
    highlightedVisibleCount: 6,
    showCloseButtonOnSessionCards: true,
    showHotkeysOnSessionCards: true,
    showLastInteractionTimeOnSessionCards: true,
    theme: "light-orange",
    viewMode: "grid",
    visibleCount: 6,
  },
};

export const EmptyGroups: Story = {
  args: {
    fixture: "empty-groups",
    highlightedVisibleCount: 1,
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    showLastInteractionTimeOnSessionCards: true,
    theme: "dark-blue",
    viewMode: "horizontal",
    visibleCount: 1,
  },
};
