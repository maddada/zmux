import { TerminalDaemonRingBuffer } from "./terminal-daemon-ring-buffer";

export type PendingAttachQueue = {
  chunks: Buffer[];
  replayCursor: number;
};

export function createPendingAttachQueue(replayCursor: number): PendingAttachQueue {
  return {
    chunks: [],
    replayCursor,
  };
}

export function queuePendingAttachChunk(
  pendingAttachQueue: PendingAttachQueue,
  chunk: Buffer,
  chunkStartCursor: number,
  chunkEndCursor: number,
): void {
  if (chunkEndCursor <= pendingAttachQueue.replayCursor) {
    return;
  }

  if (chunkStartCursor >= pendingAttachQueue.replayCursor) {
    pendingAttachQueue.chunks.push(chunk);
    return;
  }

  const replayStartIndex = pendingAttachQueue.replayCursor - chunkStartCursor;
  pendingAttachQueue.chunks.push(chunk.subarray(replayStartIndex));
}

export function createTerminalReplaySnapshot(
  historyBuffer: TerminalDaemonRingBuffer,
  replayCursor = historyBuffer.bytesWritten,
): Buffer {
  const replayStartOffset = historyBuffer.getSafeReplayOffset(replayCursor);
  return historyBuffer.snapshotRange(replayStartOffset, replayCursor);
}

export function createTerminalReplayChunks(
  historyBuffer: TerminalDaemonRingBuffer,
  replayCursor = historyBuffer.bytesWritten,
  chunkSize = 128 * 1024,
): Buffer[] {
  return splitTerminalReplaySnapshot(
    createTerminalReplaySnapshot(historyBuffer, replayCursor),
    chunkSize,
  );
}

export function splitTerminalReplaySnapshot(replaySnapshot: Buffer, chunkSize: number): Buffer[] {
  if (replaySnapshot.length === 0) {
    return [];
  }

  if (chunkSize <= 0 || replaySnapshot.length <= chunkSize) {
    return [replaySnapshot];
  }

  const chunks: Buffer[] = [];
  for (let index = 0; index < replaySnapshot.length; index += chunkSize) {
    chunks.push(replaySnapshot.subarray(index, Math.min(replaySnapshot.length, index + chunkSize)));
  }
  return chunks;
}

export function serializeTerminalReplayHistory(
  historyBuffer: TerminalDaemonRingBuffer,
  replayCursor = historyBuffer.bytesWritten,
): string {
  return createTerminalReplaySnapshot(historyBuffer, replayCursor).toString("utf8");
}
