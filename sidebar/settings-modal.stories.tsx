import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsModal } from "./settings-modal";
import { DEFAULT_zmux_SETTINGS, type zmuxSettings } from "../shared/zmux-settings";

const modalSettings: zmuxSettings = {
  ...DEFAULT_zmux_SETTINGS,
  agentManagerZoomPercent: 95,
  completionBellEnabled: true,
  showCloseButtonOnSessionCards: true,
  showHotkeysOnSessionCards: true,
  showLastInteractionTimeOnSessionCards: false,
  showSidebarActions: true,
  showSidebarAgents: true,
  showSidebarGitButton: true,
  terminalFontSize: 16,
  terminalFontWeight: 400,
  terminalLineHeight: 1.35,
  workspacePaneGap: 16,
};

function SettingsModalStory({
  initialSettings = modalSettings,
}: {
  initialSettings?: zmuxSettings;
}) {
  const [settings, setSettings] = useState<zmuxSettings>(initialSettings);

  return (
    <div
      style={{
        background: "#050505",
        height: "100vh",
        width: "100vw",
      }}
    >
      <SettingsModal
        isOpen
        onChange={setSettings}
        onClose={() => undefined}
        settings={settings}
        theme={settings.sidebarTheme === "light-orange" ? "light-orange" : "dark-blue"}
      />
    </div>
  );
}

const meta = {
  title: "Sidebar/Settings Modal",
  parameters: {
    layout: "fullscreen",
  },
  render: () => <SettingsModalStory />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkGray: Story = {
  render: () => (
    <SettingsModalStory
      initialSettings={{
        ...modalSettings,
        sidebarTheme: "plain",
      }}
    />
  ),
};

export const LightOrange: Story = {
  render: () => (
    <SettingsModalStory
      initialSettings={{
        ...modalSettings,
        sidebarTheme: "light-orange",
      }}
    />
  ),
};
