import { defaultExclude, defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    exclude: [...defaultExclude, ".vendor/**", "**/.vendor/**"],
  },
});
