import type { Meta } from "@storybook/react-vite";
import type { JSX } from "react";
import { SidebarStoryHarness } from "./sidebar-story-harness";
import { createSidebarStoryMessage, type SidebarStoryArgs } from "./sidebar-story-fixtures";

export const DEFAULT_SIDEBAR_STORY_ARGS: SidebarStoryArgs = {
  fixture: "default",
  highlightedVisibleCount: 1,
  isFocusModeActive: false,
  showCloseButtonOnSessionCards: false,
  showHotkeysOnSessionCards: false,
  theme: "dark-blue",
  viewMode: "grid",
  visibleCount: 1,
};

export const SIDEBAR_STORY_ARG_TYPES: NonNullable<Meta<SidebarStoryArgs>["argTypes"]> = {
  fixture: {
    control: "select",
    options: [
      "default",
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
  showCloseButtonOnSessionCards: {
    control: "boolean",
  },
  showHotkeysOnSessionCards: {
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
        display: "grid",
        justifyItems: "center",
        minHeight: "100vh",
        padding: "16px",
      }}
    >
      <div
        style={{
          height: "950px",
          overflow: "auto",
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
