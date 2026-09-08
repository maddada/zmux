import type { SessionChatDraftVersion, SessionChatDraft } from '@/packages/shared/session-chat-queue';
/**
 * Local cache for composer drafts and the Recovered list. Every edit carries a
 * stable identity and increasing revision; gxserver owns durable acknowledgements
 * and consumed-revision records. Legacy text remains readable without inventing
 * evidence that it was sent.
 */

import { sessionChatDraftFingerprint, type SessionChatDraftDiagnosticLog } from './session-chat-draft-diagnostics';
import { recordDeliveredSessionChatDrafts } from './session-chat-sent-history';

const SESSION_CHAT_DRAFT_STORAGE_PREFIX = 'ghostex.sessionChat.draft.';

/** Recovered drafts older than this are deleted on enumeration. */
const RECOVERED_DRAFT_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

/** Drafts shorter than this (trimmed) are noise ("ok", a stray letter). */
const RECOVERED_DRAFT_MIN_CHARS = 3;

export type RecoveredSessionChatDraft = {
  /** The raw `<sessionKey>` portion of the storage key. */
  sessionKey: string;
  projectId: string | undefined;
  sessionId: string | undefined;
  text: string;
  /** Epoch milliseconds of the last edit (stamped now for legacy values). */
  updatedAt: number;
};

export type DecodedStoredDraft = {
  version?: SessionChatDraftVersion;
  submitted?: boolean;
  text: string;
  updatedAt: number | undefined;
};

function draftStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function draftStorageKey(sessionKey: string): string {
  return `${SESSION_CHAT_DRAFT_STORAGE_PREFIX}${sessionKey}`;
}

function decodeStoredDraft(raw: string): DecodedStoredDraft {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { text?: unknown }).text === 'string' &&
      typeof (parsed as { updatedAt?: unknown }).updatedAt === 'number'
    ) {
      const entry = parsed as DecodedStoredDraft;
      const version = entry.version;
      return {
        text: entry.text,
        updatedAt: entry.updatedAt,
        submitted: entry.submitted === true,
        version:
          version &&
          typeof version.draftId === 'string' &&
          Number.isSafeInteger(version.revision) &&
          version.revision > 0
            ? version
            : undefined,
      };
    }
  } catch {
    // Legacy drafts are the raw composer text, not JSON.
  }
  return { text: raw, updatedAt: undefined };
}

export function readStoredSessionChatDraft(sessionKey: string | undefined): string {
  if (!sessionKey) {
    return '';
  }
  const raw = draftStorage()?.getItem(draftStorageKey(sessionKey));
  return raw === null || raw === undefined ? '' : decodeStoredDraft(raw).text;
}

/**
 * The stored draft with its stamp, for deciding whether gxserver's synced copy
 * is newer than what this client still has on disk. `updatedAt` is undefined
 * for legacy plain-string values, which callers must treat as "age unknown".
 */
export function readStoredSessionChatDraftEntry(sessionKey: string | undefined): DecodedStoredDraft | null {
  if (!sessionKey) {
    return null;
  }
  const raw = draftStorage()?.getItem(draftStorageKey(sessionKey));
  return raw === null || raw === undefined ? null : decodeStoredDraft(raw);
}

export function nextSessionChatDraftVersion(previous?: SessionChatDraftVersion): SessionChatDraftVersion {
  return previous ? { ...previous, revision: previous.revision + 1 } : { draftId: crypto.randomUUID(), revision: 1 };
}

export function writeStoredSessionChatDraft(
  sessionKey: string | undefined,
  draft: string,
  updatedAt?: number,
  version?: SessionChatDraftVersion,
  submitted = false
): DecodedStoredDraft {
  const previous = readStoredSessionChatDraftEntry(sessionKey);
  const entry: DecodedStoredDraft = {
    text: draft,
    updatedAt: updatedAt ?? Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1),
    version:
      version ??
      (updatedAt === undefined
        ? nextSessionChatDraftVersion(previous?.submitted ? undefined : previous?.version)
        : undefined),
    submitted,
  };
  if (sessionKey) {
    try {
      draftStorage()?.setItem(draftStorageKey(sessionKey), JSON.stringify(entry));
    } catch {
      /* The live draft remains available if storage is unavailable. */
    }
  }
  return entry;
}

/** Resolve an untouched cache against durable identity/version state, including clears. */
export function recoverSessionChatDraft(
  stored: DecodedStoredDraft | null,
  incoming: Pick<SessionChatDraft, 'content' | 'updatedAt' | 'version' | 'consumedDrafts'>
): DecodedStoredDraft | null {
  const retired =
    stored?.version &&
    incoming.consumedDrafts?.some(
      (receipt) => receipt.draftId === stored.version?.draftId && receipt.revision >= stored.version.revision
    );
  if (retired) {
    const incomingConsumed =
      incoming.version &&
      incoming.consumedDrafts?.some(
        (receipt) => receipt.draftId === incoming.version?.draftId && receipt.revision >= incoming.version.revision
      );
    if (incoming.version && !incomingConsumed && incoming.content !== '') {
      return { text: incoming.content, updatedAt: Date.parse(incoming.updatedAt), version: incoming.version };
    }
    return { text: '', updatedAt: Date.parse(incoming.updatedAt), version: stored.version, submitted: true };
  }
  if (stored?.version && incoming.version?.draftId === stored.version.draftId) {
    return incoming.version.revision > stored.version.revision
      ? { text: incoming.content, updatedAt: Date.parse(incoming.updatedAt), version: incoming.version }
      : null;
  }
  // Another draft's retirement says nothing about this client's unsent text.
  if (stored?.version && stored.text !== '') return null;
  if (
    incoming.content === '' ||
    (incoming.version &&
      incoming.consumedDrafts?.some(
        (receipt) => receipt.draftId === incoming.version?.draftId && receipt.revision >= incoming.version.revision
      ))
  )
    return null;
  const incomingAt = Date.parse(incoming.updatedAt);
  if (stored && (stored.updatedAt === undefined || stored.updatedAt >= incomingAt)) return null;
  return { text: incoming.content, updatedAt: incomingAt, version: incoming.version };
}

/**
 * Retire the saved version submitted by this send, not a newer edit that
 * happens to have the same text. Local edit stamps advance even within a
 * millisecond; restores retain their original stamp.
 */
export function clearStoredSessionChatDraftIfUnchanged(
  sessionKey: string | undefined,
  submitted: DecodedStoredDraft | string | null
): void {
  const current = readStoredSessionChatDraftEntry(sessionKey);
  // The mobile host's pre-mount acknowledgement carries text only. Composer
  // sends capture an entry so later edits must also match its version.
  const matches =
    typeof submitted === 'string'
      ? current?.text === submitted
      : submitted &&
        current?.text === submitted.text &&
        (submitted.version
          ? current.version?.draftId === submitted.version.draftId &&
            current.version.revision === submitted.version.revision
          : current.updatedAt === submitted.updatedAt);
  if (matches) {
    writeStoredSessionChatDraft(sessionKey, '', undefined, current?.version, true);
  }
}

/*
 * CDXC:Drafts 2026-08-28:
 * An explicit delete (the Recovered row's trash action) writes a STAMPED BLANK
 * entry rather than removing the key. gxserver holds a durable copy of every
 * draft and `reconcileSessionChatDraftsFromServer` heals this cache from it at
 * boot — a bare removal would just resurrect the deleted draft on the next
 * launch. The blank entry is a tombstone: newer than the server copy, so the
 * reconcile refuses it, hidden from the Recovered list (blank is below the
 * noise threshold), and swept by the same 5-day retention as every other
 * entry — matching the reconcile's own 5-day cutoff, so nothing outlives it.
 */
export function deleteStoredSessionChatDraft(sessionKey: string): void {
  writeStoredSessionChatDraft(sessionKey, '');
}

/**
 * Reconcile both saved edits and consumed revisions at boot. A Chromium cache
 * rollback must not bring back a sent draft, even if an older copy contains
 * words the user deleted. Revision ordering applies within an identity; a
 * receipt for a different draft cannot discard local unsent text.
 */
export function reconcileSessionChatDraftsFromServer(
  drafts: readonly (Pick<
    SessionChatDraft,
    'content' | 'updatedAt' | 'version' | 'consumedDrafts' | 'deliveredDrafts'
  > & {
    projectId: string;
    sessionId: string;
  })[],
  sessionKeyPrefix = '',
  diagnosticLog?: SessionChatDraftDiagnosticLog
): void {
  const storage = draftStorage();
  if (!storage) {
    diagnosticLog?.('sessionChat.draft.bootStorageUnavailable', {});
    return;
  }
  const now = Date.now();
  for (const draft of drafts) {
    recordDeliveredSessionChatDrafts(draft.deliveredDrafts);
    const serverAt = Date.parse(draft.updatedAt);
    if (Number.isNaN(serverAt)) {
      continue;
    }
    const sessionKey = `${sessionKeyPrefix}${draft.projectId}:${draft.sessionId}`;
    const stored = readStoredSessionChatDraftEntry(sessionKey);
    const details = {
      sessionKey,
      incoming: { ...sessionChatDraftFingerprint(draft.content), updatedAt: draft.updatedAt },
      stored: stored ? { ...sessionChatDraftFingerprint(stored.text), updatedAt: stored.updatedAt } : null,
    };
    const recovered = recoverSessionChatDraft(stored, draft);
    if (!recovered || (recovered.text !== '' && now - serverAt > RECOVERED_DRAFT_MAX_AGE_MS)) {
      diagnosticLog?.('sessionChat.draft.bootRestoreSkipped', details);
      continue;
    }
    try {
      // The server's stamp, not now: the entry's age (retention, freshness
      // comparisons) must describe the text, not the moment it was healed.
      storage.setItem(draftStorageKey(sessionKey), JSON.stringify(recovered));
      diagnosticLog?.('sessionChat.draft.bootRestoreApplied', details);
    } catch {
      diagnosticLog?.('sessionChat.draft.bootRestoreRejected', details);
      // Storage quota/private-mode failures must not break the client.
    }
  }
}

/*
 * The sessionKey is `<projectId>:<sessionId>` on desktop and
 * `<machineId>:<projectId>:<sessionId>` on web, so the last two `:`-separated
 * segments are the ids in both shapes.
 */
function parseDraftSessionKey(sessionKey: string): { projectId: string | undefined; sessionId: string | undefined } {
  const parts = sessionKey.split(':');
  if (parts.length < 2) {
    return { projectId: undefined, sessionId: sessionKey || undefined };
  }
  return { projectId: parts[parts.length - 2] || undefined, sessionId: parts[parts.length - 1] || undefined };
}

/*
 * Lists every surviving composer draft for the Recovered view, enforcing the
 * retention rules in one pass: drafts older than five days are deleted, legacy
 * timestamp-less values are re-stamped now so their five-day clock starts, and
 * trivial drafts are hidden (but kept — the composer may be mid-typing them).
 */
export function listRecoveredSessionChatDrafts(): RecoveredSessionChatDraft[] {
  const storage = draftStorage();
  if (!storage) {
    return [];
  }
  const draftKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(SESSION_CHAT_DRAFT_STORAGE_PREFIX)) {
      draftKeys.push(key);
    }
  }
  const now = Date.now();
  const recovered: RecoveredSessionChatDraft[] = [];
  for (const key of draftKeys) {
    const raw = storage.getItem(key);
    if (raw === null) {
      continue;
    }
    const sessionKey = key.slice(SESSION_CHAT_DRAFT_STORAGE_PREFIX.length);
    const decoded = decodeStoredDraft(raw);
    let updatedAt = decoded.updatedAt;
    try {
      if (updatedAt === undefined) {
        updatedAt = now;
        storage.setItem(key, JSON.stringify({ ...decoded, updatedAt }));
      } else if (now - updatedAt > RECOVERED_DRAFT_MAX_AGE_MS) {
        storage.removeItem(key);
        continue;
      }
    } catch {
      // A failed re-stamp still lists the draft; retention retries next open.
    }
    if (decoded.text.trim().length < RECOVERED_DRAFT_MIN_CHARS) {
      continue;
    }
    recovered.push({
      sessionKey,
      ...parseDraftSessionKey(sessionKey),
      text: decoded.text,
      updatedAt: updatedAt ?? now,
    });
  }
  return recovered.sort((left, right) => right.updatedAt - left.updatedAt);
}
