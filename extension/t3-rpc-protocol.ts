export type T3RpcRequestMessage = {
  _tag: "Request";
  headers: Array<[string, string]>;
  id: string;
  payload: Record<string, unknown>;
  tag: string;
};

export type T3RpcChunkMessage = {
  _tag: "Chunk";
  requestId: string;
  values: unknown[];
};

export type T3RpcExitMessage = {
  _tag: "Exit";
  exit:
    | {
        _tag: "Success";
        value: unknown;
      }
    | {
        _tag: "Failure";
        cause: unknown;
      };
  requestId: string;
};

export type T3RpcDefectMessage = {
  _tag: "Defect";
  defect: unknown;
};

export type T3RpcAckMessage = {
  _tag: "Ack";
  requestId: string;
};

export type T3RpcInterruptMessage = {
  _tag: "Interrupt";
  requestId: string;
};

export type T3RpcPingMessage = {
  _tag: "Ping";
};

export type T3RpcPongMessage = {
  _tag: "Pong";
};

export type T3RpcIncomingMessage =
  | T3RpcChunkMessage
  | T3RpcDefectMessage
  | T3RpcExitMessage
  | T3RpcPingMessage
  | T3RpcPongMessage;

export function createT3RpcRequestMessage(
  id: string,
  tag: string,
  payload: Record<string, unknown> = {},
): T3RpcRequestMessage {
  return {
    _tag: "Request",
    headers: [],
    id,
    payload,
    tag,
  };
}

export function createT3RpcAckMessage(requestId: string): T3RpcAckMessage {
  return {
    _tag: "Ack",
    requestId,
  };
}

export function createT3RpcInterruptMessage(requestId: string): T3RpcInterruptMessage {
  return {
    _tag: "Interrupt",
    requestId,
  };
}

export function createT3RpcPongMessage(): T3RpcPongMessage {
  return {
    _tag: "Pong",
  };
}

let nextRequestId = 0n;

export function createT3RpcRequestId(): string {
  nextRequestId += 1n;
  return nextRequestId.toString();
}

export function parseT3RpcIncomingMessage(
  raw: string | ArrayBuffer | Blob,
): T3RpcIncomingMessage | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T3RpcIncomingMessage;
  } catch {
    return undefined;
  }
}

export function formatT3RpcFailure(
  exit: T3RpcExitMessage["exit"] | undefined,
  fallbackMessage: string,
): string {
  if (!exit || exit._tag !== "Failure") {
    return fallbackMessage;
  }

  const encoded = stringifyUnknown(exit.cause);
  const messageMatch = encoded.match(/"message":"([^"]+)"/u);
  if (messageMatch?.[1]) {
    return messageMatch[1];
  }

  return encoded || fallbackMessage;
}

export function formatT3RpcDefect(defect: unknown, fallbackMessage: string): string {
  const encoded = stringifyUnknown(defect);
  return encoded || fallbackMessage;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.stack ?? value.message;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
