type DiagnosticSink = (event: string, details?: Record<string, unknown>) => void;

/**
 * CDXC:SessionChat 2026-09-07 WHY:
 * A loading regression may happen days after the diagnostic scenario expires.
 * Keep a bounded memory history and attach it only to a regression warning; routine disk events still use the host's scenario gate.
 * Flat history entries fit the native support writer's depth limit.
 */
export function createSessionChatDiagnosticRecorder(sink: DiagnosticSink): DiagnosticSink {
  const recent: Record<string, unknown>[] = [];
  const pageId = crypto.randomUUID();
  let lastComposerFocusAtMs: number | null = null;
  let lastNonemptyDraftAtMs: number | null = null;
  return (event, details = {}) => {
    const atMs = Date.now();
    if (event.startsWith('sessionChat.draft.')) {
      sink(event, details);
      return;
    }
    if (event === 'sessionChat.composerFocusEntered') lastComposerFocusAtMs = atMs;
    if (event === 'sessionChat.composerEmptyChanged' && details.empty === false) lastNonemptyDraftAtMs = atMs;
    const entry = { ...details, atMs, event };
    sink(event, {
      ...details,
      atMs,
      pageId,
      ...(event === 'sessionChat.loadingRegressionWarning'
        ? { recent: [...recent], lastComposerFocusAtMs, lastNonemptyDraftAtMs }
        : {}),
    });
    recent.push(entry);
    if (recent.length > 24) recent.shift();
  };
}
