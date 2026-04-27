import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { WorkspaceDock, type WorkspaceBarStateMessage } from "../native/sidebar/native-sidebar";
import "./styles.css";

const state: WorkspaceBarStateMessage = {
  activeProjectId: "project-zmux",
  projects: [
    {
      isActive: true,
      path: "/Users/madda/dev/_active/zmux",
      projectId: "project-zmux",
      sessionCounts: { done: 1, running: 2, working: 1 },
      theme: "dark-blue",
      title: "zmux",
    },
    {
      isActive: false,
      path: "/Users/madda/dev/_active/agent-tiler",
      projectId: "project-agent-tiler",
      sessionCounts: { done: 0, running: 1, working: 0 },
      theme: "dark-green",
      title: "agent-tiler",
    },
  ],
  type: "workspaceBarState",
};

const meta = {
  component: WorkspaceDock,
  decorators: [
    (Story) => (
      <div style={{ height: 520, width: 54 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
  title: "Sidebar/Workspace Dock",
} satisfies Meta<typeof WorkspaceDock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state,
  },
  render: ({ state: initialState }) => {
    const [currentState, setCurrentState] = useState(initialState);

    return (
      <WorkspaceDock
        actions={{
          focusProject: (projectId) => {
            setCurrentState((previous) => ({
              ...previous,
              activeProjectId: projectId,
              projects: previous.projects.map((project) => ({
                ...project,
                isActive: project.projectId === projectId,
              })),
            }));
          },
          pickWorkspaceFolder: () => undefined,
          pickWorkspaceIcon: () => undefined,
          removeProject: (projectId) => {
            setCurrentState((previous) => ({
              ...previous,
              projects: previous.projects.filter((project) => project.projectId !== projectId),
            }));
          },
          reorderProjects: (projectIds) => {
            setCurrentState((previous) => ({
              ...previous,
              projects: projectIds
                .map((projectId) =>
                  previous.projects.find((project) => project.projectId === projectId),
                )
                .filter((project): project is (typeof previous.projects)[number] => Boolean(project)),
            }));
          },
          setProjectTheme: (projectId, theme) => {
            setCurrentState((previous) => ({
              ...previous,
              projects: previous.projects.map((project) =>
                project.projectId === projectId ? { ...project, theme } : project,
              ),
            }));
          },
        }}
        state={currentState}
      />
    );
  },
};
