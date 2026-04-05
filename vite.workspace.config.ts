import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { profileBuildOverrides } from "./vite.profile-build";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: resolve(__dirname, "out", "workspace"),
    ...profileBuildOverrides,
    rollupOptions: {
      input: {
        workspace: resolve(__dirname, "workspace", "index.html"),
        "t3-frame-host": resolve(__dirname, "workspace", "t3-frame-host.ts"),
      },
      output: {
        assetFileNames: "[name][extname]",
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js",
      },
    },
  },
});
