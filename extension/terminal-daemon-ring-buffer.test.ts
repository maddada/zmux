import { describe, expect, test } from "vite-plus/test";
import { TerminalDaemonRingBuffer } from "./terminal-daemon-ring-buffer";

describe("TerminalDaemonRingBuffer", () => {
  test("should return an empty buffer when nothing has been written", () => {
    const buffer = new TerminalDaemonRingBuffer(8);

    expect(buffer.snapshot()).toEqual(Buffer.alloc(0));
  });

  test("should return buffered data in write order before wrapping", () => {
    const buffer = new TerminalDaemonRingBuffer(8);

    buffer.write(Buffer.from("hello"));

    expect(buffer.snapshot().toString("utf8")).toBe("hello");
  });

  test("should keep only the newest bytes after wrapping", () => {
    const buffer = new TerminalDaemonRingBuffer(8);

    buffer.write(Buffer.from("hello"));
    buffer.write(Buffer.from(" world"));

    expect(buffer.snapshot().toString("utf8")).toBe("lo world");
  });

  test("should accept generic Uint8Array chunks", () => {
    const buffer = new TerminalDaemonRingBuffer(8);

    buffer.write(new Uint8Array(Buffer.from("hello")));

    expect(buffer.snapshot().toString("utf8")).toBe("hello");
  });

  test("should keep only the tail when a single write exceeds capacity", () => {
    const buffer = new TerminalDaemonRingBuffer(5);

    buffer.write(Buffer.from("abcdefghij"));

    expect(buffer.snapshot().toString("utf8")).toBe("fghij");
  });

  test("should clear the buffer contents without resetting bytes written", () => {
    const buffer = new TerminalDaemonRingBuffer(8);

    buffer.write(Buffer.from("hello"));
    buffer.clear();

    expect(buffer.snapshot()).toEqual(Buffer.alloc(0));
    expect(buffer.bytesWritten).toBe(5);
  });

  test("should track total bytes written across wraps", () => {
    const buffer = new TerminalDaemonRingBuffer(4);

    buffer.write(Buffer.from("abcdef"));
    buffer.write(Buffer.from("gh"));

    expect(buffer.bytesWritten).toBe(8);
    expect(buffer.snapshot().toString("utf8")).toBe("efgh");
  });

  test("should expose a safe replay offset after a wrapped utf8 prefix", () => {
    const buffer = new TerminalDaemonRingBuffer(4);

    buffer.write(Buffer.from("A🙂B", "utf8"));

    expect(buffer.getSafeReplayOffset()).toBe(buffer.bytesWritten - 1);
    expect(buffer.snapshotRange(buffer.getSafeReplayOffset()).toString("utf8")).toBe("B");
  });

  test("should expose a safe replay offset after a wrapped OSC sequence", () => {
    const buffer = new TerminalDaemonRingBuffer(6);

    buffer.write(Buffer.from("\u001b]0;title\u0007ok", "utf8"));

    expect(buffer.snapshotRange(buffer.getSafeReplayOffset()).toString("utf8")).toBe("ok");
  });
});
