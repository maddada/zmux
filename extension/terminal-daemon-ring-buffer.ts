export class TerminalDaemonRingBuffer {
  private readonly buffer: Buffer;
  private filled = 0;
  private head = 0;

  public constructor(private readonly capacity: number) {
    this.buffer = Buffer.alloc(capacity);
  }

  public write(data: Uint8Array): void {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const length = chunk.length;
    if (length === 0) {
      return;
    }

    if (length >= this.capacity) {
      chunk.copy(this.buffer, 0, length - this.capacity, length);
      this.head = 0;
      this.filled = this.capacity;
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
}
