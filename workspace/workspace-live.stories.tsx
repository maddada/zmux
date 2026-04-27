import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkspaceLiveStoryHarness } from "./workspace-live-story-harness";

const meta = {
  title: "Workspace/Live Debug Shell",
  render: () => <WorkspaceLiveStoryHarness />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ClaudeAndGemini: Story = {};
