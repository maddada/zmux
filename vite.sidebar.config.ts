import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { profileBuildOverrides } from "./vite.profile-build";

const DND_KIT_PACKAGES = [
  "@dnd-kit/abstract",
  "@dnd-kit/collision",
  "@dnd-kit/dom",
  "@dnd-kit/helpers",
  "@dnd-kit/react",
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: DND_KIT_PACKAGES,
  },
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: resolve(__dirname, "out", "sidebar"),
    ...profileBuildOverrides,
    rollupOptions: {
      input: resolve(__dirname, "sidebar", "index.html"),
      output: {
        assetFileNames: "sidebar[extname]",
        chunkFileNames: "[name].js",
        entryFileNames: "sidebar.js",
      },
    },
  },
});
