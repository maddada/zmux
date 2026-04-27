import type { T3SessionMetadata } from "./session-grid-contract-core";

type LegacyT3SessionMetadata = Omit<T3SessionMetadata, "boundThreadId"> & {
  boundThreadId?: string;
};

export function getT3SessionBoundThreadId(metadata: LegacyT3SessionMetadata): string {
  const normalizedBoundThreadId = metadata.boundThreadId?.trim();
  if (normalizedBoundThreadId) {
    return normalizedBoundThreadId;
  }

  return metadata.threadId.trim();
}

export function normalizeT3SessionMetadata(metadata: LegacyT3SessionMetadata): T3SessionMetadata {
  const boundThreadId = getT3SessionBoundThreadId(metadata);
  return {
    ...metadata,
    boundThreadId,
    threadId: boundThreadId,
  };
}

export function setT3SessionBoundThreadId(
  metadata: LegacyT3SessionMetadata,
  boundThreadId: string,
): T3SessionMetadata {
  return normalizeT3SessionMetadata({
    ...metadata,
    boundThreadId,
    threadId: boundThreadId,
  });
}
