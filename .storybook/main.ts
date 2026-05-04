import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const storybookDir = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  /**
   * CDXC:NativeOnlyCleanup 2026-05-05-02:22
   * Storybook now covers the native/shared sidebar UI only. The old VS Code
   * workspace webview was removed with the unused extension terminal backend.
   */
  stories: ["../sidebar/**/*.stories.@(ts|tsx)"],
  viteFinal: async (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(Array.isArray(config.resolve?.alias) ? {} : config.resolve?.alias),
        "@": path.resolve(storybookDir, ".."),
      },
    };

    return config;
  },
};

export default config;
