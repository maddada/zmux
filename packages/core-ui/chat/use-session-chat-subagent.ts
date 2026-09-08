import { useCallback, useEffect, useRef, useState } from 'react';
import type { GxserverReadSessionChatResult } from '@/packages/shared/session-chat';
import type { SessionChatTransport } from './session-chat-transport';

export function useSessionChatSubagent(read: NonNullable<SessionChatTransport['readSubagent']>, selector: string) {
  const [page, setPage] = useState<GxserverReadSessionChatResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const requestRef = useRef<(earlier: boolean) => void>(() => {});

  useEffect(() => {
    setPage(null);
    setError(null);
    setLoadingEarlier(false);
    let cancelled = false;
    let busy = false;
    let current: GxserverReadSessionChatResult | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const request = async (earlier: boolean) => {
      if (cancelled || busy || (earlier && !current?.hasMore)) return;
      busy = true;
      clearTimeout(timer);
      if (earlier) setLoadingEarlier(true);
      try {
        const target = current?.subagent?.id ?? selector;
        const next = await read({
          subagent: target,
          limit: 300,
          ...(earlier && current ? { beforeOffset: current.beforeOffset } : {}),
        });
        // A daemon predating child reads must never paint the main conversation in the popup.
        if (!next.subagent) throw new Error('This server needs an update to read subagent transcripts.');
        if (!earlier && current) {
          const lastOffset = current.messages.at(-1)?.byteOffset;
          let cursor = next.beforeOffset;
          let hasMore = next.hasMore;
          while (!cancelled && lastOffset !== undefined && hasMore && cursor > lastOffset) {
            const gap = await read({ subagent: next.subagent.id, limit: 300, beforeOffset: cursor });
            if (gap.beforeOffset >= cursor) break;
            next.messages = [...gap.messages, ...next.messages];
            cursor = gap.beforeOffset;
            hasMore = gap.hasMore;
          }
          next.beforeOffset = cursor;
          next.hasMore = hasMore;
        }
        if (cancelled) return;
        if (earlier && current) {
          const ids = new Set(current.messages.map((message) => message.id));
          current = {
            ...current,
            beforeOffset: next.beforeOffset,
            hasMore: next.hasMore,
            messages: [...next.messages.filter((message) => !ids.has(message.id)), ...current.messages],
          };
        } else {
          const older = next.hasMore
            ? (current?.messages.filter((message) => (message.byteOffset ?? Infinity) < next.beforeOffset) ?? [])
            : [];
          current = {
            ...next,
            ...(older.length && current ? { beforeOffset: current.beforeOffset, hasMore: current.hasMore } : {}),
            messages: [...older, ...next.messages],
          };
        }
        setPage(current);
        setError(null);
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : String(error));
      } finally {
        busy = false;
        if (!cancelled) {
          setLoadingEarlier(false);
          timer = setTimeout(() => {
            if (document.visibilityState !== 'hidden') void request(false);
          }, 2000);
        }
      }
    };
    const visible = () => {
      if (document.visibilityState !== 'hidden') void request(false);
    };
    requestRef.current = (earlier) => {
      void request(earlier);
    };
    document.addEventListener('visibilitychange', visible);
    void request(false);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      requestRef.current = () => {};
    };
  }, [read, selector]);

  return {
    page,
    error,
    loadingEarlier,
    loadEarlier: useCallback(() => requestRef.current(true), []),
    retry: useCallback(() => requestRef.current(false), []),
  };
}
