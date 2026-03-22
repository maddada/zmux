import { defaultExclude, defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    exclude: [...defaultExclude, "forks/t3code-embed/**", ".vendor/**", "**/.vendor/**"],
  },
});
