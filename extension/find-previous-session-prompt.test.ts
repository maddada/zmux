import { describe, expect, test } from "vite-plus/test";
import {
  DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE,
  renderFindPreviousSessionPrompt,
} from "./find-previous-session-prompt";

describe("renderFindPreviousSessionPrompt", () => {
  test("should replace the query placeholder", () => {
    expect(renderFindPreviousSessionPrompt("Find: {query}", "last active full reload")).toBe(
      "Find: last active full reload",
    );
  });

  test("should replace the topic placeholder for backwards-compatible templates", () => {
    expect(renderFindPreviousSessionPrompt("Find: {topic}", "search button overlay")).toBe(
      "Find: search button overlay",
    );
  });

  test("should append the query when the template omits a placeholder", () => {
    expect(renderFindPreviousSessionPrompt("Find my session", "session restore bug")).toBe(
      "Find my session\n\nQuery: session restore bug",
    );
  });

  test("should fall back to the default template when the saved template is blank", () => {
    expect(renderFindPreviousSessionPrompt("   ", "session search")).toBe(
      DEFAULT_FIND_PREVIOUS_SESSION_PROMPT_TEMPLATE.replace("{query}", "session search"),
    );
  });
});
