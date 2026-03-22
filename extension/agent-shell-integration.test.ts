import { describe, expect, test } from "vite-plus/test";
import {
  detectCodexLifecycleEventFromLogLine,
  getClaudeHookSettingsContent,
  parseAgentControlChunk,
} from "./agent-shell-integration";

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
    const settings = JSON.parse(getClaudeHookSettingsContent("/tmp/vsmux-notify.sh")) as {
      hooks: Record<
        string,
        Array<{ hooks: Array<{ command: string; type: string }>; matcher?: string }>
      >;
    };

    expect(settings.hooks.UserPromptSubmit).toEqual([
      {
        hooks: [
          {
            command: "VSMUX_AGENT=claude sh '/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.Stop).toEqual([
      {
        hooks: [
          {
            command: "VSMUX_AGENT=claude sh '/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.StopFailure).toEqual([
      {
        hooks: [
          {
            command: "VSMUX_AGENT=claude sh '/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
      },
    ]);
    expect(settings.hooks.Notification).toEqual([
      {
        hooks: [
          {
            command: "VSMUX_AGENT=claude sh '/tmp/vsmux-notify.sh'",
            type: "command",
          },
        ],
        matcher: "permission_prompt|idle_prompt",
      },
    ]);
  });
});
