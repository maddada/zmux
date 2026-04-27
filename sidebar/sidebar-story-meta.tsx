import type { Meta } from "@storybook/react-vite";
import type { JSX } from "react";
import { SidebarStoryHarness } from "./sidebar-story-harness";
import { createSidebarStoryMessage, type SidebarStoryArgs } from "./sidebar-story-fixtures";

export const DEFAULT_SIDEBAR_STORY_ARGS: SidebarStoryArgs = {
  createSessionOnSidebarDoubleClick: false,
  debuggingMode: false,
  fixture: "default",
  highlightedVisibleCount: 1,
  isFocusModeActive: false,
  renameSessionOnDoubleClick: false,
  showCloseButtonOnSessionCards: false,
  showHotkeysOnSessionCards: false,
  showLastInteractionTimeOnSessionCards: false,
  theme: "dark-blue",
  viewMode: "grid",
  visibleCount: 1,
};

export const SIDEBAR_STORY_ARG_TYPES: NonNullable<Meta<SidebarStoryArgs>["argTypes"]> = {
  createSessionOnSidebarDoubleClick: {
    control: "boolean",
  },
  debuggingMode: {
    control: "boolean",
  },
  fixture: {
    control: "select",
    options: [
      "agent-icon-render",
      "browser-groups",
      "command-indicator-active",
      "default",
      "sort-toggle-demo",
      "selector-states",
      "overflow-stress",
      "empty-groups",
      "three-groups-stress",
    ],
  },
  highlightedVisibleCount: {
    control: "inline-radio",
    options: [1, 2, 3, 4, 6, 9],
  },
  isFocusModeActive: {
    control: "boolean",
  },
  renameSessionOnDoubleClick: {
    control: "boolean",
  },
  showCloseButtonOnSessionCards: {
    control: "boolean",
  },
  showHotkeysOnSessionCards: {
    control: "boolean",
  },
  showLastInteractionTimeOnSessionCards: {
    control: "boolean",
  },
  theme: {
    control: "select",
    options: [
      "plain-dark",
      "plain-light",
      "dark-green",
      "dark-blue",
      "dark-red",
      "dark-pink",
      "dark-orange",
      "light-blue",
      "light-green",
      "light-pink",
      "light-orange",
    ],
  },
  viewMode: {
    control: "inline-radio",
    options: ["horizontal", "vertical", "grid"],
  },
  visibleCount: {
    control: "inline-radio",
    options: [1, 2, 3, 4, 6, 9],
  },
};

export const SIDEBAR_STORY_DECORATORS = [
  (Story: () => JSX.Element) => (
    <div
      style={{
        boxSizing: "border-box",
        display: "grid",
        height: "100vh",
        justifyItems: "center",
        overflow: "hidden",
        padding: "16px",
      }}
    >
      <div
        style={{
          height: "100%",
          maxHeight: "950px",
          minHeight: 0,
          overflow: "hidden",
          width: "300px",
        }}
      >
        <Story />
      </div>
    </div>
  ),
];

export function renderSidebarStory(args: SidebarStoryArgs) {
  return <SidebarStoryHarness message={createSidebarStoryMessage(args)} />;
}
