/*
CDXC:SessionChatDetectedOptions 2026-09-04 DECISION:
User: the context meter popover gets a "More details" section under the Compact
button, with rows grouped under "Usage & cost", "Context & cache" and "Session".
A pen icon opens a dialog to show/hide rows and reorder them within their group
only (rows never cross a group). Any row, shown or not, can be starred, and the
starred values render as one wrapping text line under the chat box
(`9.0% • $49.28 • …/Ghostex`), each with its title on hover. A group label is
never rendered without at least one row under it. The catalog of rows and the
localStorage-backed preferences live here; the popover, the dialog and the
status line only render what `resolveSessionChatContextDetailGroups` returns.
*/

import { useEffect, useState, useSyncExternalStore } from 'react';
import { formatResetCountdown } from '@/packages/shared/reset-countdown';
import { formatSessionChatDuration } from './session-chat-duration';
export { formatSessionChatDuration } from './session-chat-duration';

import {
  CODEX_CONTEXT_DETAIL_ROWS,
  SHARED_CONTEXT_DETAIL_ROWS,
  type AdditionalContextDetailRowId,
  type ContextDetailStatus,
  type ContextDetailsAgent,
} from './session-chat-context-details-agents';
import { formatSessionChatContextTokens } from './session-chat-context-meter';

export type SessionChatContextDetailGroupId = 'usage' | 'context' | 'session';

export const SESSION_CHAT_CONTEXT_DETAIL_GROUPS: ReadonlyArray<{ id: SessionChatContextDetailGroupId; label: string }> =
  [
    { id: 'usage', label: 'Usage & cost' },
    { id: 'context', label: 'Context & cache' },
    { id: 'session', label: 'Session' },
  ];

export type SessionChatContextDetailRowId =
  | AdditionalContextDetailRowId
  | 'cost'
  | 'rateLimits'
  | 'lines'
  | 'promptCache'
  | 'lastRequest'
  | 'totalOutputTokens'
  | 'remaining'
  | 'cacheMisses'
  | 'thinking'
  | 'version'
  | 'outputStyle'
  | 'sessionName'
  | 'repo'
  | 'folder'
  | 'pr';

/**
 * Ghostex's own view of the session for the session row. User: the title and
 * id come from Ghostex data (the sidebar title, the agent session id on the
 * chat read state), not from Claude's payload.
 */
export interface SessionChatContextDetailSession {
  /** The sidebar title, null while the session has none. */
  title: string | null;
  /** Claude's conversation id (`claude --resume` takes it), null until it resolves. */
  agentSessionId: string | null;
  /** No prompt has reached the agent yet, so the id is not one worth copying. */
  draft: boolean;
}

export interface SessionChatContextDetailRowInput {
  status: ContextDetailStatus;
  /** Milliseconds since the epoch, for the reset and expiry countdowns. */
  now: number;
  /** Null when the host did not describe the session; the session row is skipped. */
  session: SessionChatContextDetailSession | null;
}

export interface SessionChatContextDetailRowDefinition {
  id: SessionChatContextDetailRowId;
  group: SessionChatContextDetailGroupId;
  label: string;
  description: string;
  /** Shown in the popover on a fresh install. Starred is never a default. */
  recommended: boolean;
  /** Null when Claude did not report what the row needs; the row is skipped. */
  value: (input: SessionChatContextDetailRowInput) => string | null;
  /**
   * Text a click on the status line item copies, with the toast title. User:
   * clicking the session name in the status line copies the session id.
   */
  copy?: (input: SessionChatContextDetailRowInput) => { text: string; label: string } | null;
}

const SEPARATOR = ' · ';

function isFinite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Time left until an epoch-seconds instant, or null once it has passed. */
function formatCountdown(epochSeconds: number, now: number): string | null {
  const remainingMs = epochSeconds * 1000 - now;
  if (remainingMs <= 0) {
    return null;
  }
  return formatResetCountdown(remainingMs);
}

function formatPercentage(value: number): string {
  return value < 10 ? `${value.toFixed(1).replace(/\.0$/, '')}%` : `${Math.round(value)}%`;
}

function joinParts(parts: ReadonlyArray<string | null | undefined>): string | null {
  const present = parts.filter((part): part is string => typeof part === 'string' && part.length > 0);
  return present.length > 0 ? present.join(SEPARATOR) : null;
}

function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/u, '');
  const name = trimmed.split(/[\\/]/u).pop();
  return name && name.length > 0 ? name : trimmed;
}

export const SESSION_CHAT_CONTEXT_DETAIL_ROWS: readonly SessionChatContextDetailRowDefinition[] = [
  {
    id: 'cost',
    group: 'usage',
    label: 'Cost',
    description: 'Total spend, session time, API time',
    recommended: true,
    value: ({ status }) =>
      joinParts([
        isFinite(status.cost?.totalUsd) ? formatUsd(status.cost.totalUsd) : null,
        isFinite(status.cost?.durationMs) ? formatSessionChatDuration(status.cost.durationMs) : null,
        isFinite(status.cost?.apiDurationMs) ? `API ${formatSessionChatDuration(status.cost.apiDurationMs)}` : null,
      ]),
  },
  {
    id: 'rateLimits',
    group: 'usage',
    label: 'Rate limits',
    description: '5h and 7d usage, 5h reset countdown',
    recommended: true,
    value: ({ status, now }) => {
      const fiveHour = status.rateLimits?.fiveHour;
      const sevenDay = status.rateLimits?.sevenDay;
      const reset = isFinite(fiveHour?.resetsAt) ? formatCountdown(fiveHour.resetsAt, now) : null;
      return joinParts([
        isFinite(fiveHour?.usedPercentage) ? `5h ${formatPercentage(fiveHour.usedPercentage)}` : null,
        isFinite(sevenDay?.usedPercentage) ? `7d ${formatPercentage(sevenDay.usedPercentage)}` : null,
        reset ? `resets ${reset}` : null,
      ]);
    },
  },
  {
    id: 'lines',
    group: 'usage',
    label: 'Lines changed',
    description: 'Added and removed this session',
    recommended: true,
    value: ({ status }) =>
      isFinite(status.cost?.linesAdded) || isFinite(status.cost?.linesRemoved)
        ? `+${status.cost?.linesAdded ?? 0} / −${status.cost?.linesRemoved ?? 0}`
        : null,
  },
  {
    id: 'promptCache',
    group: 'context',
    label: 'Prompt cache',
    description: 'Warm state, TTL left, hit ratio',
    recommended: true,
    value: ({ status, now }) => {
      const cache = status.promptCache;
      if (!cache || (cache.warm === undefined && !isFinite(cache.hitRatio))) {
        return null;
      }
      const left = cache.warm && isFinite(cache.expiresAt) ? formatCountdown(cache.expiresAt, now) : null;
      return joinParts([
        cache.warm === undefined ? null : cache.warm ? 'warm' : 'cold',
        left ? `${left} left` : null,
        isFinite(cache.hitRatio) ? `${Math.round(cache.hitRatio * 100)}% hits` : null,
      ]);
    },
  },
  {
    id: 'lastRequest',
    group: 'context',
    label: 'Last request',
    description: 'Input, output and cached tokens',
    recommended: true,
    value: ({ status }) => {
      const request = status.lastRequest;
      return joinParts([
        isFinite(request?.inputTokens) ? `${formatSessionChatContextTokens(request.inputTokens)} in` : null,
        isFinite(request?.outputTokens) ? `${formatSessionChatContextTokens(request.outputTokens)} out` : null,
        isFinite(request?.cacheReadTokens) ? `${formatSessionChatContextTokens(request.cacheReadTokens)} cached` : null,
      ]);
    },
  },
  {
    id: 'totalOutputTokens',
    group: 'context',
    label: 'Total output tokens',
    description: 'Everything Claude wrote this session',
    recommended: false,
    value: ({ status }) =>
      isFinite(status.totalOutputTokens) ? formatSessionChatContextTokens(status.totalOutputTokens) : null,
  },
  {
    id: 'remaining',
    group: 'context',
    label: 'Remaining context',
    description: 'Free share of the window before it compacts',
    recommended: false,
    value: ({ status }) => (isFinite(status.remainingPercentage) ? formatPercentage(status.remainingPercentage) : null),
  },
  {
    id: 'cacheMisses',
    group: 'context',
    label: 'Cache misses',
    description: 'Count and the last miss cause',
    recommended: false,
    value: ({ status }) => {
      const cache = status.promptCache;
      return isFinite(cache?.misses)
        ? joinParts([`${cache.misses}`, cache.lastMissCause ? `last: ${cache.lastMissCause}` : null])
        : null;
    },
  },
  {
    id: 'thinking',
    group: 'session',
    label: 'Thinking',
    description: 'Whether extended thinking is on',
    recommended: true,
    value: ({ status }) => (status.thinkingEnabled === undefined ? null : status.thinkingEnabled ? 'on' : 'off'),
  },
  {
    id: 'version',
    group: 'session',
    label: 'Claude Code version',
    description: 'The CLI build running this session',
    recommended: true,
    value: ({ status }) => status.version ?? null,
  },
  {
    id: 'outputStyle',
    group: 'session',
    label: 'Output style',
    description: "Claude's active output style",
    recommended: false,
    value: ({ status }) => status.outputStyle ?? null,
  },
  {
    id: 'sessionName',
    group: 'session',
    label: 'Session title',
    description: 'The sidebar title, or the session id until there is one',
    recommended: false,
    // User: the id stands in until the session has a title, and a draft
    // (nothing sent yet) says so instead of showing an id that will not be resumed.
    value: ({ session }) =>
      session === null ? null : session.draft ? 'Draft session' : (session.title ?? session.agentSessionId),
    copy: ({ session }) =>
      session !== null && !session.draft && session.agentSessionId !== null
        ? { text: session.agentSessionId, label: 'Session id copied' }
        : null,
  },
  {
    id: 'repo',
    group: 'session',
    label: 'Repository',
    description: 'Owner and name of the git repository',
    recommended: false,
    value: ({ status }) => {
      const repo = status.repo;
      if (!repo?.name) {
        return null;
      }
      return repo.owner ? `${repo.owner}/${repo.name}` : repo.name;
    },
  },
  {
    id: 'folder',
    group: 'session',
    label: 'Folder',
    description: "Claude's current working folder",
    recommended: false,
    value: ({ status }) => {
      const dir = status.currentDir ?? status.projectDir;
      return dir ? `…/${baseName(dir)}` : null;
    },
  },
  {
    id: 'pr',
    group: 'session',
    label: 'Pull request',
    description: 'Number and review state, when one exists',
    recommended: false,
    value: ({ status }) => {
      const pr = status.pr;
      return isFinite(pr?.number)
        ? joinParts([`#${pr.number}`, pr.reviewState ? pr.reviewState.replace(/_/gu, ' ').toLowerCase() : null])
        : null;
    },
  },
  ...SHARED_CONTEXT_DETAIL_ROWS,
];

const CODEX_SHARED_ROWS = new Set<SessionChatContextDetailRowId>([
  'lastRequest',
  'totalOutputTokens',
  'remaining',
  'version',
  'sessionName',
  'folder',
  'thinking',
  'rateLimits',
  ...SHARED_CONTEXT_DETAIL_ROWS.map((row) => row.id),
]);
const CODEX_ROWS: readonly SessionChatContextDetailRowDefinition[] = [
  ...SESSION_CHAT_CONTEXT_DETAIL_ROWS.filter((row) => CODEX_SHARED_ROWS.has(row.id)).map(
    (row): SessionChatContextDetailRowDefinition => {
      if (row.id === 'thinking')
        return {
          ...row,
          label: 'Reasoning effort',
          description: 'The session’s reasoning effort',
          value: ({ status }) => status.effortName ?? null,
        };
      if (row.id === 'version') return { ...row, label: 'Codex version' };
      if (row.id === 'folder') return { ...row, description: "Codex's current working folder" };
      if (row.id === 'totalOutputTokens')
        return { ...row, description: 'Cumulative Codex output, including reasoning tokens' };
      if (row.id === 'rateLimits')
        return {
          ...row,
          description: 'Usage windows last reported by Codex',
          value: ({ status, now, session }) =>
            joinParts(
              CODEX_CONTEXT_DETAIL_ROWS.filter((row) => row.id === 'primaryLimit' || row.id === 'secondaryLimit').map(
                (row) => row.value({ status, now, session })
              )
            ),
        };
      return row;
    }
  ),
  ...CODEX_CONTEXT_DETAIL_ROWS,
];

export function sessionChatContextDetailRows(
  agent: ContextDetailsAgent = 'claude'
): readonly SessionChatContextDetailRowDefinition[] {
  return agent === 'codex' ? CODEX_ROWS : SESSION_CHAT_CONTEXT_DETAIL_ROWS;
}
const ROWS_BY_AGENT = {
  claude: new Map(SESSION_CHAT_CONTEXT_DETAIL_ROWS.map((row) => [row.id, row])),
  codex: new Map(CODEX_ROWS.map((row) => [row.id, row])),
};
function isRowId(value: unknown, agent: ContextDetailsAgent = 'claude'): value is SessionChatContextDetailRowId {
  return typeof value === 'string' && ROWS_BY_AGENT[agent].has(value as SessionChatContextDetailRowId);
}

// ---------------------------------------------------------------------------
// Preferences

export interface SessionChatContextDetailsPreferences {
  /** Row shown in the popover. Absent means the row's `recommended` flag. */
  shown: Partial<Record<SessionChatContextDetailRowId, boolean>>;
  /** Row rendered in the status line under the chat box. Absent means off. */
  starred: Partial<Record<SessionChatContextDetailRowId, boolean>>;
  /** Per-group row order; rows missing here follow in catalog order. */
  order: Partial<Record<SessionChatContextDetailGroupId, SessionChatContextDetailRowId[]>>;
  /**
   * The status line's own order, independent of the groups: starred rows
   * missing here follow in group order. User: the status line items must be
   * freely rearrangeable, so the dialog lists them in their own section.
   */
  starredOrder: SessionChatContextDetailRowId[];
}

export const SESSION_CHAT_CONTEXT_DETAILS_STORAGE_KEY = 'ghostex.chat.context-details.v1';
const CHANGED_EVENT = 'ghostex-chat-context-details-changed';

export const DEFAULT_SESSION_CHAT_CONTEXT_DETAILS_PREFERENCES: SessionChatContextDetailsPreferences = {
  shown: {},
  starred: {},
  order: {},
  starredOrder: [],
};

function normalizeFlags(
  candidate: unknown,
  agent: ContextDetailsAgent
): Partial<Record<SessionChatContextDetailRowId, boolean>> {
  const flags: Partial<Record<SessionChatContextDetailRowId, boolean>> = {};
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    for (const [id, flag] of Object.entries(candidate)) {
      if (isRowId(id, agent) && typeof flag === 'boolean') {
        flags[id] = flag;
      }
    }
  }
  return flags;
}

function normalizeOrder(
  candidate: unknown,
  agent: ContextDetailsAgent
): Partial<Record<SessionChatContextDetailGroupId, SessionChatContextDetailRowId[]>> {
  const order: Partial<Record<SessionChatContextDetailGroupId, SessionChatContextDetailRowId[]>> = {};
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    for (const group of SESSION_CHAT_CONTEXT_DETAIL_GROUPS) {
      const ids = (candidate as Record<string, unknown>)[group.id];
      if (Array.isArray(ids)) {
        const kept = ids.filter(
          (id): id is SessionChatContextDetailRowId =>
            isRowId(id, agent) && ROWS_BY_AGENT[agent].get(id)?.group === group.id
        );
        order[group.id] = [...new Set(kept)];
      }
    }
  }
  return order;
}

export function normalizeSessionChatContextDetailsPreferences(
  candidate: unknown,
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailsPreferences {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return DEFAULT_SESSION_CHAT_CONTEXT_DETAILS_PREFERENCES;
  }
  const record = candidate as Record<string, unknown>;
  return {
    shown: normalizeFlags(record.shown, agent),
    starred: normalizeFlags(record.starred, agent),
    order: normalizeOrder(record.order, agent),
    starredOrder: Array.isArray(record.starredOrder)
      ? [...new Set(record.starredOrder.filter((id): id is SessionChatContextDetailRowId => isRowId(id, agent)))]
      : [],
  };
}

/** CDXC:AgentProviders 2026-09-08 DECISION:
 * User: keep the same Claude UI and status line, but save popover and status-line settings independently for Claude and Codex.
 * Claude keeps its existing storage key and configuration; copying to the other agent is a one-time action.
 */
const preferenceKeys = {
  claude: SESSION_CHAT_CONTEXT_DETAILS_STORAGE_KEY,
  codex: 'ghostex.chat.context-details.codex.v1',
};
const cachedPreferences: Partial<Record<ContextDetailsAgent, SessionChatContextDetailsPreferences>> = {};

export function readSessionChatContextDetailsPreferences(
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailsPreferences {
  if (!cachedPreferences[agent]) {
    try {
      cachedPreferences[agent] = normalizeSessionChatContextDetailsPreferences(
        JSON.parse(window.localStorage.getItem(preferenceKeys[agent]) ?? 'null'),
        agent
      );
    } catch {
      cachedPreferences[agent] = DEFAULT_SESSION_CHAT_CONTEXT_DETAILS_PREFERENCES;
    }
  }
  return cachedPreferences[agent];
}

export function writeSessionChatContextDetailsPreferences(
  next: SessionChatContextDetailsPreferences,
  agent: ContextDetailsAgent = 'claude'
): void {
  const normalized = normalizeSessionChatContextDetailsPreferences(next, agent);
  window.localStorage.setItem(preferenceKeys[agent], JSON.stringify(normalized));
  cachedPreferences[agent] = normalized;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/*
CDXC:SessionChatDetectedOptions 2026-09-04 DECISION:
User: a change saved in one chat view must reach every other chat view, not
necessarily instantly. Every desktop chat view is its own CEF browser on the
shared app-UI profile, so they read one localStorage; the `storage` event
carries a save to the other views and a focus re-read covers a view that
missed it, so the next time it is looked at it shows the latest picks.
*/
function subscribe(listener: () => void): () => void {
  const reread = () => {
    delete cachedPreferences.claude;
    delete cachedPreferences.codex;
    listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || Object.values(preferenceKeys).includes(event.key)) reread();
  };
  window.addEventListener(CHANGED_EVENT, reread);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', reread);
  return () => {
    window.removeEventListener(CHANGED_EVENT, reread);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', reread);
  };
}

export function useSessionChatContextDetailsPreferences(
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailsPreferences {
  return useSyncExternalStore(
    subscribe,
    () => readSessionChatContextDetailsPreferences(agent),
    () => readSessionChatContextDetailsPreferences(agent)
  );
}

/** CDXC:AgentProviders 2026-09-08 DECISION:
 * User: an export icon copies current settings to the other agent, matching fields as closely as possible.
 * Matching rows copy visibility, stars, and order; unmatched destination fields retain their settings.
 */
export function copySessionChatContextDetailsPreferences(
  source: SessionChatContextDetailsPreferences,
  from: ContextDetailsAgent
): { matched: number; skipped: number } {
  const to = from === 'claude' ? 'codex' : 'claude';
  const destination = normalizeSessionChatContextDetailsPreferences(readSessionChatContextDetailsPreferences(to), to);
  const sourceRows = sessionChatContextDetailRows(from);
  const matched = sourceRows.filter((row) => ROWS_BY_AGENT[to].has(row.id));
  const matchingIds = new Set(matched.map((row) => row.id));
  const previousStarredOrder = orderedSessionChatStarredRows(destination, to).map((row) => row.id);
  for (const row of matched) {
    destination.shown[row.id] = isSessionChatContextDetailShown(source, row);
    destination.starred[row.id] = isSessionChatContextDetailStarred(source, row);
  }
  // Replace matching slots in their existing group, preserving the relative order of unrelated fields.
  const mergeOrder = (existing: SessionChatContextDetailRowId[], incoming: SessionChatContextDetailRowId[]) => {
    let index = 0;
    const merged = existing.flatMap((id) =>
      matchingIds.has(id) ? (incoming[index] ? [incoming[index++]] : []) : [id]
    );
    return [...merged, ...incoming.slice(index)];
  };
  for (const group of SESSION_CHAT_CONTEXT_DETAIL_GROUPS) {
    const incoming = orderedSessionChatContextDetailRows(source, group.id, from)
      .filter((row) => matchingIds.has(row.id))
      .map((row) => row.id);
    destination.order[group.id] = mergeOrder(
      orderedSessionChatContextDetailRows(destination, group.id, to).map((row) => row.id),
      incoming
    );
  }
  destination.starredOrder = mergeOrder(
    previousStarredOrder,
    orderedSessionChatStarredRows(source, from)
      .filter((row) => matchingIds.has(row.id))
      .map((row) => row.id)
  );
  writeSessionChatContextDetailsPreferences(destination, to);
  return { matched: matched.length, skipped: sourceRows.length - matched.length };
}

/** Wall clock that re-renders the countdowns every half minute. */
export function useSessionChatContextDetailsClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

// ---------------------------------------------------------------------------
// Resolution

export function isSessionChatContextDetailShown(
  preferences: SessionChatContextDetailsPreferences,
  row: SessionChatContextDetailRowDefinition
): boolean {
  return preferences.shown[row.id] ?? row.recommended;
}

export function isSessionChatContextDetailStarred(
  preferences: SessionChatContextDetailsPreferences,
  row: SessionChatContextDetailRowDefinition
): boolean {
  return preferences.starred[row.id] === true;
}

/** The group's rows in the user's order, missing rows appended in catalog order. */
export function orderedSessionChatContextDetailRows(
  preferences: SessionChatContextDetailsPreferences,
  group: SessionChatContextDetailGroupId,
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailRowDefinition[] {
  const catalog = sessionChatContextDetailRows(agent).filter((row) => row.group === group);
  const ordered = (preferences.order[group] ?? [])
    .map((id) => ROWS_BY_AGENT[agent].get(id))
    .filter((row): row is SessionChatContextDetailRowDefinition => row !== undefined && row.group === group);
  const seen = new Set(ordered.map((row) => row.id));
  return [...ordered, ...catalog.filter((row) => !seen.has(row.id))];
}

export interface SessionChatContextDetailItem {
  id: SessionChatContextDetailRowId;
  label: string;
  value: string;
  /** Present when a click on the status line item copies something. */
  copy?: { text: string; label: string };
}

export interface SessionChatContextDetailGroup {
  id: SessionChatContextDetailGroupId;
  label: string;
  items: SessionChatContextDetailItem[];
}

/**
 * Groups with at least one row that is selected AND has a value; a group with
 * nothing under it is dropped so its label never renders alone.
 */
export function resolveSessionChatContextDetailGroups(
  status: ContextDetailStatus | undefined,
  preferences: SessionChatContextDetailsPreferences,
  now: number,
  select: 'shown' | 'starred',
  session: SessionChatContextDetailSession | null,
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailGroup[] {
  if (!status) {
    return [];
  }
  const selected = select === 'shown' ? isSessionChatContextDetailShown : isSessionChatContextDetailStarred;
  const groups: SessionChatContextDetailGroup[] = [];
  for (const group of SESSION_CHAT_CONTEXT_DETAIL_GROUPS) {
    const items: SessionChatContextDetailItem[] = [];
    for (const row of orderedSessionChatContextDetailRows(preferences, group.id, agent)) {
      if (!selected(preferences, row)) {
        continue;
      }
      const value = row.value({ status, now, session });
      if (value !== null) {
        items.push({ id: row.id, label: row.label, value });
      }
    }
    if (items.length > 0) {
      groups.push({ id: group.id, label: group.label, items });
    }
  }
  return groups;
}

/** The starred rows in the status line's own order, then any others in group order. */
export function orderedSessionChatStarredRows(
  preferences: SessionChatContextDetailsPreferences,
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailRowDefinition[] {
  const starred = SESSION_CHAT_CONTEXT_DETAIL_GROUPS.flatMap((group) =>
    orderedSessionChatContextDetailRows(preferences, group.id, agent).filter((row) =>
      isSessionChatContextDetailStarred(preferences, row)
    )
  );
  const byId = new Map(starred.map((row) => [row.id, row]));
  const ordered = preferences.starredOrder
    .map((id) => byId.get(id))
    .filter((row): row is SessionChatContextDetailRowDefinition => row !== undefined);
  const seen = new Set(ordered.map((row) => row.id));
  return [...ordered, ...starred.filter((row) => !seen.has(row.id))];
}

/** The starred rows with a value, in the status line's order. */
export function resolveSessionChatStarredContextDetails(
  status: ContextDetailStatus | undefined,
  preferences: SessionChatContextDetailsPreferences,
  now: number,
  session: SessionChatContextDetailSession | null,
  agent: ContextDetailsAgent = 'claude'
): SessionChatContextDetailItem[] {
  if (!status) {
    return [];
  }
  const items: SessionChatContextDetailItem[] = [];
  for (const row of orderedSessionChatStarredRows(preferences, agent)) {
    const value = row.value({ status, now, session });
    if (value === null) {
      continue;
    }
    const copy = row.copy?.({ status, now, session }) ?? null;
    items.push({ id: row.id, label: row.label, value, ...(copy ? { copy } : {}) });
  }
  return items;
}
