import { describe, expect, test } from "vite-plus/test";
import {
  createManagedTerminalHeadless,
  createPendingAttachQueue,
  createTerminalReplayChunks,
  queuePendingAttachChunk,
} from "./terminal-daemon-headless";

describe("terminal-daemon-headless", () => {
  test("should serialize output into reconnect replay chunks and append queued live output", async () => {
    const headless = await createManagedTerminalHeadless({
      cols: 12,
      rows: 4,
    });

    headless.recordOutput(Buffer.from("before-ready\n", "utf8"));
    await headless.terminal.whenIdle();

    const pendingAttachQueue = createPendingAttachQueue();
    const replayChunks = createTerminalReplayChunks(headless.serialize(), 5);

    queuePendingAttachChunk(pendingAttachQueue, Buffer.from("after-ready\n", "utf8"));

    expect(Buffer.concat([...replayChunks, ...pendingAttachQueue.chunks]).toString("utf8")).toBe(
      "before-ready\nafter-ready\n",
    );

    await headless.dispose();
  });

  test("should compact the serialized replay after a hard reset", async () => {
    const headless = await createManagedTerminalHeadless({
      cols: 12,
      rows: 4,
    });

    headless.recordOutput(Buffer.from("before", "utf8"));
    headless.recordOutput(Buffer.from("\u001bcafter", "utf8"));
    await headless.terminal.whenIdle();

    expect(headless.serialize()).toBe("\u001bcafter");

    await headless.dispose();
  });
});
