import type { Preview } from "@storybook/react-vite";
import "../sidebar/styles.css";
import "../workspace/styles.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "zmux dark",
      values: [{ name: "zmux dark", value: "#050505" }],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
  },
};

export default preview;
