import { describe, expect, test } from "vite-plus/test";
import {
  applyAgentShellIntegrationEnvironment,
  createAgentShellIntegrationEnvironmentRequest,
} from "./agent-shell-integration-environment";

describe("createAgentShellIntegrationEnvironmentRequest", () => {
  test("should return an empty request when shell integration is unavailable", () => {
    expect(createAgentShellIntegrationEnvironmentRequest(undefined)).toEqual({});
  });

  test("should include shell integration paths when shell integration is available", () => {
    expect(
      createAgentShellIntegrationEnvironmentRequest({
        binDir: "/tmp/vsmux/bin",
        zshDotDir: "/tmp/vsmux/zsh",
      }),
    ).toEqual({
      shellIntegrationBinDir: "/tmp/vsmux/bin",
      shellIntegrationZdotDir: "/tmp/vsmux/zsh",
    });
  });
});

describe("applyAgentShellIntegrationEnvironment", () => {
  test("should prepend the wrapper bin directory to PATH", () => {
    const environment = applyAgentShellIntegrationEnvironment(
      {
        PATH: "/usr/bin:/bin",
        VSMUX_SESSION_ID: "session-7",
      },
      {
        shellIntegrationBinDir: "/tmp/vsmux/bin",
      },
    );

    expect(environment).toMatchObject({
      PATH: expect.stringContaining("/tmp/vsmux/bin"),
      VSMUX_SESSION_ID: "session-7",
    });
    expect(environment.PATH.split(":").at(0)).toBe("/tmp/vsmux/bin");
  });

  test.runIf(process.platform !== "win32")(
    "should set ZDOTDIR when the daemon receives a shell integration zsh directory",
    () => {
      const environment = applyAgentShellIntegrationEnvironment(
        {
          PATH: "/usr/bin:/bin",
        },
        {
          shellIntegrationZdotDir: "/tmp/vsmux/zsh",
        },
      );

      expect(environment.ZDOTDIR).toBe("/tmp/vsmux/zsh");
    },
  );
});
