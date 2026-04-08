import type { WebSocket } from "ws";

type ResttyHeadlessTerminal = {
  dispose: () => void;
  loadAddon: (addon: ResttySerializeAddon) => void;
  onData: (listener: (data: string) => void) => { dispose: () => void };
  resize: (cols: number, rows: number) => void;
  whenIdle: () => Promise<void>;
  write: (data: string | Uint8Array | ArrayBuffer, callback?: () => void) => void;
};

type ResttyHeadlessTerminalConstructor = new (options: {
  cols: number;
  rows: number;
}) => ResttyHeadlessTerminal;

type ResttySerializeAddon = {
  activate: (terminal: unknown) => void;
  dispose: () => void;
  serialize: (options?: { includeHardReset?: boolean }) => string;
};

type ResttySerializeAddonConstructor = new () => ResttySerializeAddon;
let resttyModules:
  | {
      SerializeAddon: ResttySerializeAddonConstructor;
      Terminal: ResttyHeadlessTerminalConstructor;
    }
  | undefined;

export type PendingAttachQueue = {
  chunks: Buffer[];
};

export type ManagedTerminalHeadless = {
  terminal: ResttyHeadlessTerminal;
  serializeAddon: ResttySerializeAddon;
  recordOutput: (chunk: Buffer) => void;
  resize: (cols: number, rows: number) => void;
  serialize: () => string;
  dispose: () => Promise<void>;
};

function loadResttyHeadlessModules(): {
  SerializeAddon: ResttySerializeAddonConstructor;
  Terminal: ResttyHeadlessTerminalConstructor;
} {
  if (!resttyModules) {
    const headlessModule = require("restty/headless") as {
      Terminal?: ResttyHeadlessTerminalConstructor;
    };
    const serializeModule = require("restty/serialize") as {
      SerializeAddon?: ResttySerializeAddonConstructor;
    };
    if (!headlessModule.Terminal || !serializeModule.SerializeAddon) {
      throw new Error("Failed to load restty headless modules.");
    }
    resttyModules = {
      SerializeAddon: serializeModule.SerializeAddon,
      Terminal: headlessModule.Terminal,
    };
  }

  return resttyModules;
}

export async function createManagedTerminalHeadless(options: {
  cols: number;
  rows: number;
  onReplyData?: (data: string) => void;
}): Promise<ManagedTerminalHeadless> {
  const { SerializeAddon, Terminal } = loadResttyHeadlessModules();
  const terminal = new Terminal({
    cols: options.cols,
    rows: options.rows,
  });
  const serializeAddon = new SerializeAddon();
  terminal.loadAddon(serializeAddon);

  if (options.onReplyData) {
    terminal.onData(options.onReplyData);
  }

  return {
    terminal,
    serializeAddon,
    recordOutput: (chunk) => {
      terminal.write(chunk);
    },
    resize: (cols, rows) => {
      terminal.resize(cols, rows);
    },
    serialize: () => {
      return serializeAddon.serialize({ includeHardReset: false });
    },
    dispose: async () => {
      terminal.dispose();
      await terminal.whenIdle();
    },
  };
}

export function createPendingAttachQueue(): PendingAttachQueue {
  return {
    chunks: [],
  };
}

export function queuePendingAttachChunk(
  pendingAttachQueue: PendingAttachQueue,
  chunk: Buffer,
): void {
  if (chunk.length <= 0) {
    return;
  }
  pendingAttachQueue.chunks.push(chunk);
}

export function createTerminalReplayChunks(
  serializedReplay: string,
  chunkSize = 128 * 1024,
): Buffer[] {
  const replayBuffer = Buffer.from(serializedReplay, "utf8");
  if (replayBuffer.length === 0) {
    return [];
  }
  if (chunkSize <= 0 || replayBuffer.length <= chunkSize) {
    return [replayBuffer];
  }

  const chunks: Buffer[] = [];
  for (let index = 0; index < replayBuffer.length; index += chunkSize) {
    chunks.push(replayBuffer.subarray(index, Math.min(replayBuffer.length, index + chunkSize)));
  }
  return chunks;
}

export function flushPendingAttachQueue(
  socket: WebSocket,
  pendingAttachQueue: PendingAttachQueue,
): void {
  let flushedCount = 0;
  for (const chunk of pendingAttachQueue.chunks) {
    if (socket.readyState !== 1) {
      break;
    }
    socket.send(chunk);
    flushedCount += 1;
  }

  if (flushedCount > 0) {
    pendingAttachQueue.chunks.splice(0, flushedCount);
  }
}
