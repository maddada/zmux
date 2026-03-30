import { describe, expect, test } from "vite-plus/test";
import { TerminalDaemonRingBuffer } from "./terminal-daemon-ring-buffer";

describe("TerminalDaemonRingBuffer", () => {
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
});
