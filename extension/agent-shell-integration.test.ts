import { describe, expect, test } from "vite-plus/test";
import {
  detectCodexLifecycleEventFromLogLine,
  getCodexHookSettingsContent,
  getClaudeHookSettingsContent,
  getPowerShellBootstrapContent,
  parseAgentControlChunk,
  resolveActiveCodexHooksPath,
} from "./agent-shell-integration";
import { getOpenCodePluginContent, getZshRcShimContent } from "./agent-shell-integration-content";

describe("parseAgentControlChunk", () => {
  test("should strip agent lifecycle markers from visible terminal output", () => {
    const parsed = parseAgentControlChunk(`hello\u001b]9001;VSmux;start;codex\u0007world`);

    expect(parsed.output).toBe("helloworld");
    expect(parsed.pending).toBe("");
    expect(parsed.events).toEqual([{ agentName: "codex", eventType: "start" }]);
  });

  test("should preserve unrelated OSC sequences", () => {
    const parsed = parseAgentControlChunk(`\u001b]0;My Title\u0007ready`);

    expect(parsed.output).toBe(`\u001b]0;My Title\u0007ready`);
    expect(parsed.events).toEqual([]);
  });

  test("should buffer incomplete lifecycle markers until the terminator arrives", () => {
    const firstChunk = parseAgentControlChunk(`busy\u001b]9001;VSmux;stop;codex`);

    expect(firstChunk.output).toBe("busy");
    expect(firstChunk.pending).toBe(`\u001b]9001;VSmux;stop;codex`);
    expect(firstChunk.events).toEqual([]);

    const secondChunk = parseAgentControlChunk(`${firstChunk.pending}\u0007done`);

    expect(secondChunk.output).toBe("done");
    expect(secondChunk.pending).toBe("");
    expect(secondChunk.events).toEqual([{ agentName: "codex", eventType: "stop" }]);
  });
});

describe("detectCodexLifecycleEventFromLogLine", () => {
  test("should detect current Codex task start events", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"timestamp":"2026-03-02T22:59:29.154Z","type":"event_msg","payload":{"type":"task_started","turn_id":"019cb0c7-25ec-7582-908d-61b59ecdd86d"}}',
    );

    expect(eventType).toBe("start");
  });

  test("should detect nested Codex task start events from payload.msg", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"ts":"2026-03-19T14:03:20.996Z","dir":"to_tui","kind":"codex_event","payload":{"id":"019d0668-7023-7963-8eb3-3e26c95c76ea","msg":{"type":"task_started","turn_id":"019d0668-7023-7963-8eb3-3e26c95c76ea"}}}',
    );

    expect(eventType).toBe("start");
  });

  test("should detect current Codex task completion events", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"timestamp":"2026-03-02T22:59:37.361Z","type":"event_msg","payload":{"type":"task_complete","turn_id":"019cb0c7-25ec-7582-908d-61b59ecdd86d"}}',
    );

    expect(eventType).toBe("stop");
  });

  test("should detect nested Codex abort events as completion", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"ts":"2026-03-19T14:03:24.883Z","dir":"to_tui","kind":"codex_event","payload":{"id":"019d0668-7023-7963-8eb3-3e26c95c76ea","msg":{"type":"turn_aborted","turn_id":"019d0668-7023-7963-8eb3-3e26c95c76ea","reason":"interrupted"}}}',
    );

    expect(eventType).toBe("stop");
  });

  test("should ignore unrelated Codex session log lines", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"timestamp":"2026-03-02T22:59:37.052Z","type":"event_msg","payload":{"type":"agent_reasoning","text":"thinking"}}',
    );

    expect(eventType).toBeUndefined();
  });
});

describe("getClaudeHookSettingsContent", () => {
  test("should wire Claude lifecycle hooks into the shared notifier", () => {
    const settings = JSON.parse(getClaudeHookSettingsContent("/tmp/vsmux-notify.sh", "linux")) as {
      hooks: Record<
        string,
        Array<{ hooks: Array<{ command: string; type: string }>; matcher?: string }>
      >;
    };

    expect(settings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command: "'/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.Stop).toEqual([
      {
        hooks: [
          {
            command: "'/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.StopFailure).toEqual([
      {
        hooks: [
          {
            command: "'/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.Notification).toEqual([
      {
        hooks: [
          {
            command: "'/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
        matcher: "permission_prompt|idle_prompt",
      },
    ]);
  });

  test("should emit a Windows-safe command when requested", () => {
    const settings = JSON.parse(
      getClaudeHookSettingsContent("C:\\temp\\vsmux-notify.cmd", "win32"),
    ) as {
      hooks: Record<
        string,
        Array<{ hooks: Array<{ command: string; type: string }>; matcher?: string }>
      >;
    };

    expect(settings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command: '"C:\\temp\\vsmux-notify.cmd"',
            type: "command",
          },
        ],
      },
    ]);
  });
});

describe("getZshRcShimContent", () => {
  test("should make CLAUDE_BIN point at the VSmux Claude wrapper for user profile aliases", () => {
    const content = getZshRcShimContent("/tmp/vsmux/bin");
    const expectedExport = "export CLAUDE_BIN='/tmp/vsmux/bin/claude'";

    expect(content).toContain(expectedExport);
    expect(content.indexOf(expectedExport)).toBeLessThan(
      content.indexOf('if [ -f "$HOME/.zshrc" ]'),
    );
    expect(content.lastIndexOf(expectedExport)).toBeGreaterThan(
      content.indexOf("export PATH='/tmp/vsmux/bin':$PATH"),
    );
  });
});

describe("getCodexHookSettingsContent", () => {
  test("should wire Codex UserPromptSubmit hooks into the shared notifier", () => {
    const settings = JSON.parse(
      getCodexHookSettingsContent("/tmp/vsmux-notify.js", "/usr/local/bin/node", "linux"),
    ) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(settings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command: "ELECTRON_RUN_AS_NODE=1 '/usr/local/bin/node' '/tmp/vsmux-notify.js'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.Stop).toBeUndefined();
  });
});

describe("resolveActiveCodexHooksPath", () => {
  test("should follow the active CODEX_HOME directory", () => {
    expect(
      resolveActiveCodexHooksPath({
        CODEX_HOME: "/Users/test/.codex-profiles/personal",
      } as NodeJS.ProcessEnv),
    ).toBe("/Users/test/.codex-profiles/personal/hooks.json");
  });
});

describe("getOpenCodePluginContent", () => {
  test("should schedule a non-blocking sync of the current session status", () => {
    const plugin = getOpenCodePluginContent("/tmp/vsmux-notify.js", "/usr/local/bin/node");

    expect(plugin).toContain("const currentSessionId = process?.env?.VSMUX_SESSION_ID;");
    expect(plugin).toContain("if (!client?.session?.status) {");
    expect(plugin).toContain("const statuses = await client.session.status();");
    expect(plugin).toContain("const status = statuses.data?.[currentSessionId];");
    expect(plugin).toContain(
      'const isSessionActive = (status) => status?.type && status.type !== "idle";',
    );
    expect(plugin).toContain("setTimeout(() => {");
    expect(plugin).toContain("void syncInitialStatus();");
  });

  test("should treat non-idle session.status events as active", () => {
    const plugin = getOpenCodePluginContent("/tmp/vsmux-notify.js", "/usr/local/bin/node");

    expect(plugin).toContain("if (isSessionActive(status)) {");
    expect(plugin).toContain('if (event.type === "session.busy") {');
    expect(plugin).toContain(
      'if (event.type === "session.idle" || event.type === "session.error") {',
    );
  });
});

describe("getPowerShellBootstrapContent", () => {
  test("should persist and re-emit the current PowerShell title", () => {
    const content = getPowerShellBootstrapContent();

    expect(content).toContain("function global:__vsmux_sync_current_title()");
    expect(content).toContain("function global:vsmux_set_title");
    expect(content).toContain('[System.Console]::Out.Write("$([char]27)]0;');
    expect(content).toContain("__vsmux_write_session_title $title");
    expect(content).toContain("$Host.UI.RawUI.WindowTitle = $title");
  });
});
