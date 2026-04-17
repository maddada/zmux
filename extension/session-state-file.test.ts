import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  createDefaultPersistedSessionState,
  deletePersistedSessionStateFile,
  readPersistedSessionStateFromFile,
  readPersistedSessionStateSnapshotFromFile,
  serializePersistedSessionState,
  writePersistedSessionStateToFile,
} from "./session-state-file";

describe("deletePersistedSessionStateFile", () => {
  test("should remove the persisted session state file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-session-state-"));
    const filePath = path.join(tempDir, "session-00.state");

    await writePersistedSessionStateToFile(filePath, {
      agentName: "claude",
      agentStatus: "attention",
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
});

describe("persisted session title normalization", () => {
  test("should strip indicators and trim when serializing titles", () => {
    expect(
      serializePersistedSessionState({
        agentName: "claude",
        agentStatus: "working",
        hasAutoTitleFromFirstPrompt: true,
        lastActivityAt: "2026-04-08T10:00:00.000Z",
        pendingFirstPromptAutoRenamePrompt: "rename this session from the first prompt",
        title: "  ✦ release audit  ",
      }),
    ).toContain("title=release audit");
  });

  test("should normalize stored titles when reading them back", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-session-state-"));
    const filePath = path.join(tempDir, "session-01.state");

    await writeFile(
      filePath,
      "status=working\nagent=codex\nautoTitleFromFirstPrompt=1\nlastActivityAt=2026-04-08T10:00:00.000Z\npendingFirstPromptAutoRenamePrompt=  explain the project and suggest improvements  \ntitle=  🤖 Copilot fix  \n",
      "utf8",
    );

    await expect(readPersistedSessionStateFromFile(filePath)).resolves.toEqual({
      agentName: "codex",
      agentStatus: "working",
      hasAutoTitleFromFirstPrompt: true,
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
        lastActivityAt: "2026-04-08T10:00:00.000Z",
        title: "⠸ Codex",
      }),
    ).toContain("title=");

    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-session-state-"));
    const filePath = path.join(tempDir, "session-ignored-title.state");

    await writeFile(
      filePath,
      "status=idle\nagent=claude\nlastActivityAt=2026-04-08T10:00:00.000Z\ntitle=Claude Code\n",
      "utf8",
    );

    await expect(readPersistedSessionStateFromFile(filePath)).resolves.toEqual({
      agentName: "claude",
      agentStatus: "idle",
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      pendingFirstPromptAutoRenamePrompt: undefined,
      title: undefined,
    });
  });

  test("should expose the persisted state file modification time", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vsmux-session-state-"));
    const filePath = path.join(tempDir, "session-02.state");

    await writeFile(
      filePath,
      "status=attention\nagent=claude\nautoTitleFromFirstPrompt=\nlastActivityAt=2026-04-08T10:00:00.000Z\npendingFirstPromptAutoRenamePrompt=rename this session\ntitle=Claude Code\n",
      "utf8",
    );

    const snapshot = await readPersistedSessionStateSnapshotFromFile(filePath);
    expect(snapshot.state).toEqual({
      agentName: "claude",
      agentStatus: "attention",
      hasAutoTitleFromFirstPrompt: undefined,
      lastActivityAt: "2026-04-08T10:00:00.000Z",
      pendingFirstPromptAutoRenamePrompt: "rename this session",
      title: undefined,
    });
    expect(snapshot.updatedAtMs).toEqual(expect.any(Number));
  });
});
