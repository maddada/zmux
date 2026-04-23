import { useEffect, useRef, useState, type MutableRefObject } from "react";

type TerminalLoadingOverlayProgressState = {
  isVisible: boolean;
  progressPercent: number;
};

const INITIAL_PROGRESS_PERCENT = 12;
const MAX_FAKE_PROGRESS_PERCENT = 92;
const FAKE_PROGRESS_TICK_MS = 140;
const FINISH_ANIMATION_MS = 420;
const HIDE_AFTER_COMPLETE_MS = 100;

export function useTerminalLoadingOverlayProgress(
  isActive: boolean,
): TerminalLoadingOverlayProgressState {
  const [isVisible, setIsVisible] = useState(isActive);
  const [progressPercent, setProgressPercent] = useState(isActive ? INITIAL_PROGRESS_PERCENT : 0);
  const progressPercentRef = useRef(progressPercent);
  const fakeProgressTimerRef = useRef<number | undefined>(undefined);
  const finishAnimationFrameRef = useRef<number | undefined>(undefined);
  const hideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    progressPercentRef.current = progressPercent;
  }, [progressPercent]);

  useEffect(() => {
    return () => {
      clearLoadingTimers(fakeProgressTimerRef, finishAnimationFrameRef, hideTimerRef);
    };
  }, []);

  useEffect(() => {
    if (isActive) {
      if (hideTimerRef.current !== undefined) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = undefined;
      }
      if (finishAnimationFrameRef.current !== undefined) {
        window.cancelAnimationFrame(finishAnimationFrameRef.current);
        finishAnimationFrameRef.current = undefined;
      }

      setIsVisible(true);
      setProgressPercent((current) =>
        current > 0 ? Math.max(current, INITIAL_PROGRESS_PERCENT) : INITIAL_PROGRESS_PERCENT,
      );
      progressPercentRef.current = Math.max(progressPercentRef.current, INITIAL_PROGRESS_PERCENT);

      if (fakeProgressTimerRef.current === undefined) {
        fakeProgressTimerRef.current = window.setInterval(() => {
          setProgressPercent((current) => {
            const baseline = Math.max(current, INITIAL_PROGRESS_PERCENT);
            if (baseline >= MAX_FAKE_PROGRESS_PERCENT) {
              return baseline;
            }

            const remaining = MAX_FAKE_PROGRESS_PERCENT - baseline;
            const nextStep =
              baseline < 58 ? Math.max(1.8, remaining * 0.16) : Math.max(0.8, remaining * 0.08);
            return Math.min(MAX_FAKE_PROGRESS_PERCENT, baseline + nextStep);
          });
        }, FAKE_PROGRESS_TICK_MS);
      }

      return;
    }

    if (!isVisible) {
      return;
    }

    if (fakeProgressTimerRef.current !== undefined) {
      window.clearInterval(fakeProgressTimerRef.current);
      fakeProgressTimerRef.current = undefined;
    }

    const startedAt = performance.now();
    const startPercent = progressPercentRef.current;

    const animateToComplete = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / FINISH_ANIMATION_MS);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextPercent = startPercent + (100 - startPercent) * easedProgress;
      progressPercentRef.current = nextPercent;
      setProgressPercent(nextPercent);

      if (progress < 1) {
        finishAnimationFrameRef.current = window.requestAnimationFrame(animateToComplete);
        return;
      }

      finishAnimationFrameRef.current = undefined;
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = undefined;
        progressPercentRef.current = 0;
        setProgressPercent(0);
        setIsVisible(false);
      }, HIDE_AFTER_COMPLETE_MS);
    };

    finishAnimationFrameRef.current = window.requestAnimationFrame(animateToComplete);
  }, [isActive, isVisible]);

  return {
    isVisible,
    progressPercent,
  };
}

function clearLoadingTimers(
  fakeProgressTimerRef: MutableRefObject<number | undefined>,
  finishAnimationFrameRef: MutableRefObject<number | undefined>,
  hideTimerRef: MutableRefObject<number | undefined>,
): void {
  if (fakeProgressTimerRef.current !== undefined) {
    window.clearInterval(fakeProgressTimerRef.current);
    fakeProgressTimerRef.current = undefined;
  }

  if (finishAnimationFrameRef.current !== undefined) {
    window.cancelAnimationFrame(finishAnimationFrameRef.current);
    finishAnimationFrameRef.current = undefined;
  }

  if (hideTimerRef.current !== undefined) {
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = undefined;
  }
}
