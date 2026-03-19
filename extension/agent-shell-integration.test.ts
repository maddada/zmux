import { describe, expect, test } from "vite-plus/test";
import {
  detectCodexLifecycleEventFromLogLine,
  parseAgentControlChunk,
} from "./agent-shell-integration";

describe("parseAgentControlChunk", () => {
  test("should strip agent lifecycle markers from visible terminal output", () => {
    const parsed = parseAgentControlChunk(`hello\u001b]9001;agent-canvas-x;start;codex\u0007world`);

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
    const firstChunk = parseAgentControlChunk(`busy\u001b]9001;agent-canvas-x;stop;codex`);

    expect(firstChunk.output).toBe("busy");
    expect(firstChunk.pending).toBe(`\u001b]9001;agent-canvas-x;stop;codex`);
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

  test("should detect current Codex task completion events", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"timestamp":"2026-03-02T22:59:37.361Z","type":"event_msg","payload":{"type":"task_complete","turn_id":"019cb0c7-25ec-7582-908d-61b59ecdd86d"}}',
    );

    expect(eventType).toBe("stop");
  });

  test("should keep recognizing legacy Superset-style Codex task start events", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"dir":"to_tui","kind":"codex_event","msg":{"type":"task_started","turn_id":"legacy-turn"}}',
    );

    expect(eventType).toBe("start");
  });

  test("should ignore unrelated Codex session log lines", () => {
    const eventType = detectCodexLifecycleEventFromLogLine(
      '{"timestamp":"2026-03-02T22:59:37.052Z","type":"event_msg","payload":{"type":"agent_reasoning","text":"thinking"}}',
    );

    expect(eventType).toBeUndefined();
  });
});
