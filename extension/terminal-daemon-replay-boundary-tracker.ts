const ESCAPE = 0x1b;
const BELL = 0x07;
const SAFE_MARKER_INTERVAL_BYTES = 128;

type VtState =
  | "ground"
  | "escape"
  | "csi"
  | "osc"
  | "oscEscape"
  | "dcs"
  | "dcsEscape"
  | "string"
  | "stringEscape";

export class TerminalDaemonReplayBoundaryTracker {
  private nextPeriodicMarkerOffset = SAFE_MARKER_INTERVAL_BYTES;
  private utf8ContinuationBytesRemaining = 0;
  private vtState: VtState = "ground";

  public reset(nextSafeOffset = 0): void {
    this.nextPeriodicMarkerOffset =
      Math.floor(nextSafeOffset / SAFE_MARKER_INTERVAL_BYTES + 1) * SAFE_MARKER_INTERVAL_BYTES;
    this.utf8ContinuationBytesRemaining = 0;
    this.vtState = "ground";
  }

  public feed(chunk: Uint8Array, chunkStartOffset: number): number[] {
    const markers: number[] = [];
    let wasSafe = this.isSafe();

    for (let index = 0; index < chunk.length; index += 1) {
      const value = chunk[index] ?? 0;
      const absoluteOffset = chunkStartOffset + index + 1;

      this.updateUtf8State(value);
      this.updateVtState(value);

      const isSafe = this.isSafe();
      if (isSafe && (!wasSafe || absoluteOffset >= this.nextPeriodicMarkerOffset)) {
        markers.push(absoluteOffset);
        while (absoluteOffset >= this.nextPeriodicMarkerOffset) {
          this.nextPeriodicMarkerOffset += SAFE_MARKER_INTERVAL_BYTES;
        }
      }

      wasSafe = isSafe;
    }

    const chunkEndOffset = chunkStartOffset + chunk.length;
    if (chunk.length > 0 && this.isSafe() && markers[markers.length - 1] !== chunkEndOffset) {
      markers.push(chunkEndOffset);
    }

    return markers;
  }

  private isSafe(): boolean {
    return this.utf8ContinuationBytesRemaining === 0 && this.vtState === "ground";
  }

  private updateUtf8State(value: number): void {
    if (this.utf8ContinuationBytesRemaining > 0 && isUtf8ContinuationByte(value)) {
      this.utf8ContinuationBytesRemaining -= 1;
      return;
    }

    this.utf8ContinuationBytesRemaining = getUtf8ContinuationBytes(value);
  }

  private updateVtState(value: number): void {
    switch (this.vtState) {
      case "ground":
        if (value === ESCAPE) {
          this.vtState = "escape";
        }
        return;
      case "escape":
        this.vtState = getEscapeNextState(value);
        return;
      case "csi":
        if (value >= 0x40 && value <= 0x7e) {
          this.vtState = "ground";
        }
        return;
      case "osc":
        if (value === BELL) {
          this.vtState = "ground";
          return;
        }
        if (value === ESCAPE) {
          this.vtState = "oscEscape";
        }
        return;
      case "oscEscape":
        this.vtState = value === 0x5c ? "ground" : value === ESCAPE ? "oscEscape" : "osc";
        return;
      case "dcs":
        if (value === ESCAPE) {
          this.vtState = "dcsEscape";
        }
        return;
      case "dcsEscape":
        this.vtState = value === 0x5c ? "ground" : value === ESCAPE ? "dcsEscape" : "dcs";
        return;
      case "string":
        if (value === ESCAPE) {
          this.vtState = "stringEscape";
        }
        return;
      case "stringEscape":
        this.vtState = value === 0x5c ? "ground" : value === ESCAPE ? "stringEscape" : "string";
        return;
    }
  }
}

function getEscapeNextState(value: number): VtState {
  switch (value) {
    case 0x5b:
      return "csi";
    case 0x5d:
      return "osc";
    case 0x50:
      return "dcs";
    case 0x58:
    case 0x5e:
    case 0x5f:
      return "string";
    default:
      return "ground";
  }
}

function getUtf8ContinuationBytes(value: number): number {
  if (value >= 0xc2 && value <= 0xdf) {
    return 1;
  }

  if (value >= 0xe0 && value <= 0xef) {
    return 2;
  }

  if (value >= 0xf0 && value <= 0xf4) {
    return 3;
  }

  return 0;
}

function isUtf8ContinuationByte(value: number): boolean {
  return (value & 0b1100_0000) === 0b1000_0000;
}
