import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: resolve(__dirname, "out", "debug-panel"),
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
