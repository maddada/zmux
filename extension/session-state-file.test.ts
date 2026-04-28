import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  createPersistedSessionHookDedupMarker,
  createDefaultPersistedSessionState,
  deletePersistedSessionStateFile,
  getPersistedSessionHookDedupMarkerPath,
  readPersistedSessionStateFromFile,
  readPersistedSessionStateSnapshotFromFile,
  parsePersistedSessionState,
  serializePersistedSessionState,
  writePersistedSessionStateToFile,
} from "./session-state-file";

describe("deletePersistedSessionStateFile", () => {
  test("should remove the persisted session state file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-00.state");

    await writePersistedSessionStateToFile(filePath, {
      agentName: "claude",
      agentStatus: "attention",
      agentSessionId: "session-123",
      firstUserMessage: "first\nmessage",
      hasAutoTitleFromFirstPrompt: true,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      pendingFirstPromptAutoRenamePrompt: "rename this session from the first prompt",
      title: "Claude Code",
    });
    await readFile(filePath, "utf8");

    await deletePersistedSessionStateFile(filePath);

    await expect(readPersistedSessionStateFromFile(filePath)).resolves.toEqual(
      createDefaultPersistedSessionState(),
    );
  });

  test("should remove any persisted hook dedupe markers for the session", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-01.state");
    const markerPath = getPersistedSessionHookDedupMarkerPath(
      filePath,
      "UserPromptSubmit",
      "turn-123",
    );

    await writePersistedSessionStateToFile(filePath, {
      agentName: "codex",
      agentStatus: "working",
      title: "Codex",
    });
    await createPersistedSessionHookDedupMarker(filePath, "UserPromptSubmit", "turn-123");
    await readFile(markerPath, "utf8");

    await deletePersistedSessionStateFile(filePath);

    await expect(readFile(markerPath, "utf8")).rejects.toThrow();
  });
});

describe("createPersistedSessionHookDedupMarker", () => {
  test("should acquire once and reject duplicate claims for the same turn", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-claim.state");

    await expect(
      createPersistedSessionHookDedupMarker(filePath, "UserPromptSubmit", "turn-123"),
    ).resolves.toMatchObject({
      acquired: true,
    });

    await expect(
      createPersistedSessionHookDedupMarker(filePath, "UserPromptSubmit", "turn-123"),
    ).resolves.toMatchObject({
      acquired: false,
    });
  });

  test("should keep only the latest hook dedupe marker for the session", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-cleanup.state");

    await createPersistedSessionHookDedupMarker(filePath, "UserPromptSubmit", "turn-1");
    const secondMarker = await createPersistedSessionHookDedupMarker(
      filePath,
      "UserPromptSubmit",
      "turn-2",
    );

    const dedupeMarkers = (await readdir(tempDir)).filter((entry) =>
      entry.includes(".hook-dedupe."),
    );
    expect(secondMarker.acquired).toBe(true);
    expect(dedupeMarkers).toHaveLength(1);
    expect(dedupeMarkers[0]).toContain("turn-2");
  });
});

describe("persisted session title normalization", () => {
  test("should strip indicators and trim when serializing titles", () => {
    expect(
      serializePersistedSessionState({
        agentName: "claude",
        agentStatus: "working",
        agentSessionId: "session-abc",
        hasAutoTitleFromFirstPrompt: true,
        lastActivityAt: "2026-04-08T10:00:00.000Z",
        pendingFirstPromptAutoRenamePrompt: "rename this session from the first prompt",
        title: "  ✦ release audit  ",
      }),
    ).toContain("title=release audit");
  });

  test("should normalize stored titles when reading them back", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-01.state");

    await writeFile(
      filePath,
      `status=working\nagent=codex\nagentSessionId=session-xyz\nfirstUserMessageBase64=${Buffer.from("first\nmessage", "utf8").toString("base64")}\nautoTitleFromFirstPrompt=1\nlastActivityAt=2026-04-08T10:00:00.000Z\npendingFirstPromptAutoRenamePrompt=  explain the project and suggest improvements  \ntitle=  🤖 Copilot fix  \n`,
      "utf8",
    );

    await expect(readPersistedSessionStateFromFile(filePath)).resolves.toEqual({
      agentName: "codex",
      agentStatus: "working",
      agentSessionId: "session-xyz",
      firstUserMessage: "first\nmessage",
      frozenAt: undefined,
      hasAutoTitleFromFirstPrompt: true,
      historyBase64: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      pendingFirstPromptAutoRenamePrompt: "explain the project and suggest improvements",
      title: "Copilot fix",
    });
  });

  test("should ignore bare agent titles when reading and serializing persisted titles", async () => {
    expect(
      serializePersistedSessionState({
        agentName: "codex",
        agentStatus: "idle",
        agentSessionId: "session-idle",
        lastActivityAt: "2026-04-08T10:00:00.000Z",
        title: "⠸ Codex",
      }),
    ).toContain("title=");

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-ignored-title.state");

    await writeFile(
      filePath,
      "status=idle\nagent=claude\nlastActivityAt=2026-04-08T10:00:00.000Z\ntitle=Claude Code\n",
      "utf8",
    );

    await expect(readPersistedSessionStateFromFile(filePath)).resolves.toEqual({
      agentName: "claude",
      agentStatus: "idle",
      agentSessionId: undefined,
      firstUserMessage: undefined,
      frozenAt: undefined,
      historyBase64: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      pendingFirstPromptAutoRenamePrompt: undefined,
      title: undefined,
    });
  });

  test("should expose the persisted state file modification time", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "zmux-session-state-"));
    const filePath = path.join(tempDir, "session-02.state");

    await writeFile(
      filePath,
      "status=attention\nagent=claude\nagentSessionId=session-snapshot\nfirstUserMessageBase64=\nautoTitleFromFirstPrompt=\nlastActivityAt=2026-04-08T10:00:00.000Z\npendingFirstPromptAutoRenamePrompt=rename this session\ntitle=Claude Code\n",
      "utf8",
    );

    const snapshot = await readPersistedSessionStateSnapshotFromFile(filePath);
    expect(snapshot.state).toEqual({
      agentName: "claude",
      agentStatus: "attention",
      agentSessionId: "session-snapshot",
      firstUserMessage: undefined,
      frozenAt: undefined,
      hasAutoTitleFromFirstPrompt: undefined,
      historyBase64: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      pendingFirstPromptAutoRenamePrompt: "rename this session",
      title: undefined,
    });
    expect(snapshot.updatedAtMs).toEqual(expect.any(Number));
  });

  test("should round-trip frozen terminal history metadata", async () => {
    const serialized = serializePersistedSessionState({
      agentName: "codex",
      agentStatus: "idle",
      frozenAt: "2026-04-23T08:00:00.000Z",
      historyBase64: Buffer.from("prompt\r\noutput\r\n", "utf8").toString("base64"),
      title: "Bug hunt",
    });

    expect(serialized).toContain("frozenAt=2026-04-23T08:00:00.000Z");
    expect(serialized).toContain(
      `historyBase64=${Buffer.from("prompt\r\noutput\r\n", "utf8").toString("base64")}`,
    );
  });

  test("should round-trip first user message text with line breaks", async () => {
    const serialized = serializePersistedSessionState({
      agentName: "codex",
      agentStatus: "idle",
      firstUserMessage: "please fix this\n\nand keep the repro",
      title: "Bug hunt",
    });

    expect(serialized).toContain(
      `firstUserMessageBase64=${Buffer.from("please fix this\n\nand keep the repro", "utf8").toString("base64")}`,
    );
    expect(parsePersistedSessionState(serialized).firstUserMessage).toBe(
      "please fix this\n\nand keep the repro",
    );
  });

  test("should expose legacy pending first prompt as the first user message", () => {
    expect(
      parsePersistedSessionState(
        "status=idle\nagent=codex\npendingFirstPromptAutoRenamePrompt=rename from this prompt\n",
      ).firstUserMessage,
    ).toBe("rename from this prompt");
  });
});
