import { describe, expect, test } from "vite-plus/test";
import { shouldPreserveLastActivityForTerminalWrite } from "./last-activity-control-command";

describe("shouldPreserveLastActivityForTerminalWrite", () => {
  test("should preserve last activity for rename commands", () => {
    expect(shouldPreserveLastActivityForTerminalWrite("/rename My Thread")).toBe(true);
    expect(shouldPreserveLastActivityForTerminalWrite("   /rename My Thread")).toBe(true);
    expect(shouldPreserveLastActivityForTerminalWrite("/rename")).toBe(true);
  });

  test("should not preserve last activity for regular terminal input", () => {
    expect(shouldPreserveLastActivityForTerminalWrite("npm test")).toBe(false);
    expect(shouldPreserveLastActivityForTerminalWrite("/resume")).toBe(false);
    expect(shouldPreserveLastActivityForTerminalWrite("/renamed thread")).toBe(false);
  });
});
