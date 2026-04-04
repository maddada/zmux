import { TerminalDaemonReplayBoundaryTracker } from "./terminal-daemon-replay-boundary-tracker";

export class TerminalDaemonRingBuffer {
  private readonly buffer: Buffer;
  private readonly replayBoundaryTracker = new TerminalDaemonReplayBoundaryTracker();
  private readonly safeReplayOffsets: number[] = [];
  private filled = 0;
  private head = 0;
  private total = 0;

  public constructor(private readonly capacity: number) {
    this.buffer = Buffer.alloc(capacity);
    this.safeReplayOffsets.push(0);
  }

  public write(data: Uint8Array): void {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const length = chunk.length;
    if (length === 0) {
      return;
    }

    const chunkStartOffset = this.total;
    this.total += length;
    this.safeReplayOffsets.push(...this.replayBoundaryTracker.feed(chunk, chunkStartOffset));

    if (length >= this.capacity) {
      chunk.copy(this.buffer, 0, length - this.capacity, length);
      this.head = 0;
      this.filled = this.capacity;
      this.pruneSafeReplayOffsets();
      return;
    }

    const spaceToEnd = this.capacity - this.head;
    if (length <= spaceToEnd) {
      chunk.copy(this.buffer, this.head);
    } else {
      chunk.copy(this.buffer, this.head, 0, spaceToEnd);
      chunk.copy(this.buffer, 0, spaceToEnd);
    }

    this.head = (this.head + length) % this.capacity;
    this.filled = Math.min(this.filled + length, this.capacity);
    this.pruneSafeReplayOffsets();
  }

  public snapshot(): Buffer {
    if (this.filled === 0) {
      return Buffer.alloc(0);
    }

    if (this.filled < this.capacity) {
      return Buffer.from(this.buffer.subarray(0, this.filled));
    }

    const result = Buffer.alloc(this.capacity);
    const tailLength = this.capacity - this.head;
    this.buffer.copy(result, 0, this.head, this.head + tailLength);
    this.buffer.copy(result, tailLength, 0, this.head);
    return result;
  }

  public snapshotRange(startOffset: number, endOffset = this.total): Buffer {
    const oldestOffset = this.oldestOffset;
    const clampedStart = Math.max(oldestOffset, Math.min(startOffset, endOffset, this.total));
    const clampedEnd = Math.max(clampedStart, Math.min(endOffset, this.total));
    if (clampedStart === clampedEnd) {
      return Buffer.alloc(0);
    }

    const snapshot = this.snapshot();
    return Buffer.from(
      snapshot.subarray(clampedStart - oldestOffset, clampedEnd - oldestOffset),
    );
  }

  public getSafeReplayOffset(endOffset = this.total): number {
    const oldestOffset = this.oldestOffset;
    const clampedEnd = Math.max(oldestOffset, Math.min(endOffset, this.total));
    for (const safeReplayOffset of this.safeReplayOffsets) {
      if (safeReplayOffset < oldestOffset) {
        continue;
      }

      if (safeReplayOffset <= clampedEnd) {
        return safeReplayOffset;
      }

      break;
    }

    return clampedEnd;
  }

  public clear(): void {
    this.head = 0;
    this.filled = 0;
    this.replayBoundaryTracker.reset(this.total);
    this.safeReplayOffsets.length = 0;
    this.safeReplayOffsets.push(this.total);
  }

  public get bytesWritten(): number {
    return this.total;
  }

  private get oldestOffset(): number {
    return Math.max(0, this.total - this.filled);
  }

  private pruneSafeReplayOffsets(): void {
    const oldestOffset = this.oldestOffset;
    while ((this.safeReplayOffsets[0] ?? this.total) < oldestOffset) {
      this.safeReplayOffsets.shift();
    }

    if (this.safeReplayOffsets.length === 0) {
      this.safeReplayOffsets.push(oldestOffset);
    }
  }
}
