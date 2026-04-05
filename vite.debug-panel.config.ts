import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { profileBuildOverrides } from "./vite.profile-build";

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: resolve(__dirname, "out", "debug-panel"),
    ...profileBuildOverrides,
    rollupOptions: {
      input: resolve(__dirname, "debug-panel", "index.html"),
      output: {
        assetFileNames: "debug-panel[extname]",
        chunkFileNames: "[name].js",
        entryFileNames: "debug-panel.js",
      },
    },
  },
});
