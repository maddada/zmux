import { describe, expect, test } from "vite-plus/test";
import { TerminalDaemonRingBuffer } from "./terminal-daemon-ring-buffer";
import {
  createPendingAttachQueue,
  createTerminalReplaySnapshot,
  queuePendingAttachChunk,
  serializeTerminalReplayHistory,
} from "./terminal-daemon-replay";

describe("createTerminalReplaySnapshot", () => {
  test("should return the raw buffered VT stream for session replay", () => {
    const historyBuffer = new TerminalDaemonRingBuffer(16);

    historyBuffer.write(Buffer.from("\u001b[2Jprompt\r\n"));

    expect(createTerminalReplaySnapshot(historyBuffer)).toEqual(Buffer.from("\u001b[2Jprompt\r\n"));
  });

  test("should skip a wrapped partial utf8 prefix in the binary replay path", () => {
    const historyBuffer = new TerminalDaemonRingBuffer(4);

    historyBuffer.write(Buffer.from("A🙂B", "utf8"));

    expect(createTerminalReplaySnapshot(historyBuffer).toString("utf8")).toBe("B");
  });

  test("should skip a wrapped partial OSC sequence in the binary replay path", () => {
    const historyBuffer = new TerminalDaemonRingBuffer(6);

    historyBuffer.write(Buffer.from("\u001b]0;title\u0007ok", "utf8"));

    expect(createTerminalReplaySnapshot(historyBuffer).toString("utf8")).toBe("ok");
  });
});

describe("serializeTerminalReplayHistory", () => {
  test("should expose the buffered VT stream as a utf8 string when the buffer starts cleanly", () => {
    const historyBuffer = new TerminalDaemonRingBuffer(16);

    historyBuffer.write(Buffer.from("prompt\r\noutput\r\n", "utf8"));

    expect(serializeTerminalReplayHistory(historyBuffer)).toBe("prompt\r\noutput\r\n");
  });

  test("should drop a wrapped partial utf8 prefix before serializing", () => {
    const historyBuffer = new TerminalDaemonRingBuffer(4);

    historyBuffer.write(Buffer.from("A🙂B", "utf8"));

    expect(serializeTerminalReplayHistory(historyBuffer)).toBe("B");
  });
});

describe("queuePendingAttachChunk", () => {
  test("should ignore chunks that end at or before the replay cursor", () => {
    const pendingAttachQueue = createPendingAttachQueue(5);

    queuePendingAttachChunk(pendingAttachQueue, Buffer.from("hello"), 0, 5);

    expect(pendingAttachQueue.chunks).toEqual([]);
  });

  test("should queue whole chunks that start after the replay cursor", () => {
    const pendingAttachQueue = createPendingAttachQueue(5);

    queuePendingAttachChunk(pendingAttachQueue, Buffer.from(" world"), 5, 11);

    expect(pendingAttachQueue.chunks).toEqual([Buffer.from(" world")]);
  });

  test("should queue only the unseen suffix when a chunk straddles the replay cursor", () => {
    const pendingAttachQueue = createPendingAttachQueue(3);

    queuePendingAttachChunk(pendingAttachQueue, Buffer.from("hello"), 0, 5);

    expect(pendingAttachQueue.chunks).toEqual([Buffer.from("lo")]);
  });
});
