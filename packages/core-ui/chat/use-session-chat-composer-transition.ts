import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

const DURATION_MS = 280;
const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const PROMPT = '.ghostex-chat-composer-row';
const FOOTER = '.ghostex-chat-composer-footer';
const CONTROLS =
  '.ghostex-chat-composer-footer-options, .ghostex-chat-composer-footer-actions-expanded, .ghostex-chat-composer-footer-actions-compact';
const OVERLAY = '[data-chat-composer-overlay]';

function measure(composer: HTMLElement) {
  const style = getComputedStyle(composer);
  const input = composer.querySelector<HTMLElement>(
    '.ghostex-chat-composer-lexical-content, .ghostex-chat-composer-plain-input'
  );
  return {
    height: composer.getBoundingClientRect().height,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    prompt: composer.querySelector<HTMLElement>(PROMPT)?.getBoundingClientRect(),
    footer: composer.querySelector<HTMLElement>(FOOTER)?.getBoundingClientRect(),
    lineHeight: input ? Number.parseFloat(getComputedStyle(input).lineHeight) : 0,
  };
}

/**
 * CDXC:SessionChat 2026-09-08 WHY:
 * Height alone made the editor and controls snap when their layout switched, and canceling a tween before measuring it made quick reversals jump.
 * Capture the painted geometry before changing state, settle editor layout before measuring the destination, and move/reveal the contents on the same timeline.
 * The overlay that hosts the composer is pinned at its destination height for the tween, with the box glued to its bottom edge, so the transcript inset observer sees one change per transition instead of one per animation frame.
 * The transcript viewport itself never changes size during a transition, so nothing here touches its scroll position.
 */
export function useSessionChatComposerTransition({
  collapsed,
  composerRef,
}: {
  collapsed: boolean;
  composerRef: RefObject<HTMLDivElement | null>;
}) {
  const beforeRef = useRef<ReturnType<typeof measure> | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const contentAnimationsRef = useRef<Animation[]>([]);
  const arrivalAnimationsRef = useRef<Animation[]>([]);
  const targetHeightRef = useRef<number | null>(null);
  const bodySizeRef = useRef<{ width: number; height: number } | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const pinnedOverlayRef = useRef<HTMLElement | null>(null);
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;

  const capture = useCallback(() => {
    if (composerRef.current) beforeRef.current = measure(composerRef.current);
  }, [composerRef]);

  const clearOverlayPin = useCallback(() => {
    const overlay = pinnedOverlayRef.current;
    pinnedOverlayRef.current = null;
    overlay?.style.removeProperty('height');
    overlay?.style.removeProperty('display');
    overlay?.style.removeProperty('flex-direction');
    overlay?.style.removeProperty('justify-content');
  }, []);

  const clear = useCallback(
    (clearArrivals: boolean) => {
      if (cleanupTimerRef.current !== null) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
      animationRef.current?.cancel();
      animationRef.current = null;
      for (const animation of contentAnimationsRef.current) animation.cancel();
      contentAnimationsRef.current = [];
      if (clearArrivals) {
        for (const animation of arrivalAnimationsRef.current) animation.cancel();
        arrivalAnimationsRef.current = [];
      }
      clearOverlayPin();
    },
    [clearOverlayPin]
  );

  const transition = useCallback(
    (stateChanged: boolean) => {
      const composer = composerRef.current;
      if (!composer) return;
      const interrupted = animationRef.current;
      const previous = stateChanged ? beforeRef.current : measure(composer);
      beforeRef.current = null;
      const previousTarget = targetHeightRef.current;
      const elapsed = typeof interrupted?.currentTime === 'number' ? interrupted.currentTime : 0;
      const previousDuration = interrupted?.effect?.getComputedTiming().duration;
      clear(stateChanged);
      const next = measure(composer);
      targetHeightRef.current = next.height;
      bodySizeRef.current = next.prompt ? { width: next.prompt.width, height: next.prompt.height } : null;
      if (
        !previous ||
        Math.abs(next.height - previous.height) < 0.5 ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        clear(true);
        return;
      }
      const duration =
        !stateChanged &&
        previousTarget !== null &&
        Math.abs(next.height - previousTarget) < 0.5 &&
        typeof previousDuration === 'number'
          ? Math.max(1, previousDuration - elapsed)
          : DURATION_MS;
      // Backwards fill keeps the start keyframe applied while a freshly created animation waits for its start time.
      // Without it the natural layout paints for a frame, and a resize callback landing in that frame measures the destination and cancels the tween as already complete.
      const timing: KeyframeAnimationOptions = { duration, easing: EASING, fill: 'backwards' };

      const overlay = composer.closest<HTMLElement>(OVERLAY);
      if (overlay) {
        overlay.style.height = `${overlay.getBoundingClientRect().height}px`;
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'flex-end';
        pinnedOverlayRef.current = overlay;
      }

      const animation = composer.animate(
        [
          {
            height: `${previous.height}px`,
            paddingTop: previous.paddingTop,
            paddingBottom: previous.paddingBottom,
            overflow: 'clip',
          },
          {
            height: `${next.height}px`,
            paddingTop: next.paddingTop,
            paddingBottom: next.paddingBottom,
            overflow: 'clip',
          },
        ],
        timing
      );
      animationRef.current = animation;

      for (const [selector, rect] of [
        [PROMPT, previous.prompt],
        [FOOTER, previous.footer],
      ] as const) {
        const element = composer.querySelector<HTMLElement>(selector);
        if (!element || !rect) continue;
        const baselineOffset = selector === PROMPT ? (previous.lineHeight - next.lineHeight) / 2 : 0;
        const offset = rect.top - element.getBoundingClientRect().top + baselineOffset;
        if (Math.abs(offset) >= 0.5) {
          contentAnimationsRef.current.push(
            element.animate([{ transform: `translateY(${offset}px)` }, { transform: 'none' }], timing)
          );
        }
      }

      if (stateChanged && !collapsedRef.current) {
        const prompt = composer.querySelector<HTMLElement>(PROMPT);
        if (prompt && previous.prompt && next.prompt && next.prompt.height > previous.prompt.height) {
          arrivalAnimationsRef.current.push(
            prompt.animate(
              [
                { clipPath: `inset(0 0 ${next.prompt.height - previous.prompt.height}px 0)` },
                { clipPath: 'inset(0 0 0 0)' },
              ],
              timing
            )
          );
        }
        for (const controls of composer.querySelectorAll<HTMLElement>(CONTROLS)) {
          if (!controls.getClientRects().length) continue;
          arrivalAnimationsRef.current.push(
            controls.animate(
              [
                { opacity: 0, transform: 'translateY(4px)' },
                { opacity: 1, transform: 'none' },
              ],
              { ...timing, duration: duration / 2, delay: duration / 2, fill: 'backwards' }
            )
          );
        }
      }

      const finish = () => {
        if (animationRef.current !== animation) return;
        clear(true);
      };
      animation.onfinish = finish;
      cleanupTimerRef.current = window.setTimeout(finish, duration + 50);
    },
    [composerRef, clear]
  );

  useLayoutEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) transition(true);
    });
    return () => {
      active = false;
    };
  }, [collapsed, transition]);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const body = composer.querySelector<HTMLElement>(PROMPT);
    // Retarget a running tween only when the editor body itself reports a resize that differs from the destination the tween was built against.
    // Comparing bounding rects on every composer resize retargeted on sub-pixel jitter from the body's own translate animation, and each retarget restarted the tween until it snapped.
    const observer = new ResizeObserver((entries) => {
      if (!animationRef.current || !body || !entries.some((entry) => entry.target === body)) return;
      const rect = body.getBoundingClientRect();
      const recorded = bodySizeRef.current;
      if (recorded && Math.abs(rect.width - recorded.width) < 0.5 && Math.abs(rect.height - recorded.height) < 0.5)
        return;
      transition(false);
    });
    observer.observe(composer);
    if (body) observer.observe(body);
    return () => {
      observer.disconnect();
      clear(true);
    };
  }, [composerRef, clear, transition]);

  return capture;
}
