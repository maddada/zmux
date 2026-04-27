import { describe, expect, test } from "vite-plus/test";
import {
  createManagedTerminalEnvironment,
  getManagedTerminalIdentity,
} from "./native-managed-terminal";

describe("native managed terminal helpers", () => {
  test("should read session identity from shell-backed terminal creation options", () => {
    const identity = getManagedTerminalIdentity({
      creationOptions: {
        env: createManagedTerminalEnvironment(
          "workspace-1",
          "session-3",
          "/tmp/session-3.env",
          "/workspace",
        ),
        name: "Harbor Vale",
      },
    } as never);

    expect(identity).toEqual({
      sessionId: "session-3",
      workspaceId: "workspace-1",
    });
  });

  test("should ignore extension-owned terminals", () => {
    const identity = getManagedTerminalIdentity({
      creationOptions: {
        name: "Harbor Vale",
        pty: {},
      },
    } as never);

    expect(identity).toBeUndefined();
  });

  test("should ignore terminals without both workspace and session markers", () => {
    const identity = getManagedTerminalIdentity({
      creationOptions: {
        env: {
          zmux_SESSION_ID: "session-3",
        },
        name: "Harbor Vale",
      },
    } as never);

    expect(identity).toBeUndefined();
  });

  test("should ignore terminals without managed env metadata", () => {
    const identity = getManagedTerminalIdentity({
      creationOptions: {
        name: "Harbor Vale",
      },
      name: "Harbor Vale",
    } as never);

    expect(identity).toBeUndefined();
  });
});
