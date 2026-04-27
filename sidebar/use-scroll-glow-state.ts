import { useEffect, useState, type RefObject } from "react";

export type ScrollGlowState = {
  showBottomGlow: boolean;
  showTopGlow: boolean;
};

const SCROLL_GLOW_EPSILON_PX = 2;

export function useScrollGlowState(
  scrollContainerRef: RefObject<HTMLElement | null>,
): ScrollGlowState {
  const [scrollGlowState, setScrollGlowState] = useState<ScrollGlowState>({
    showBottomGlow: false,
    showTopGlow: false,
  });

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) {
      return;
    }

    let animationFrameId = 0;

    const updateScrollGlowState = () => {
      animationFrameId = 0;

      const hasOverflow = element.scrollHeight - element.clientHeight > SCROLL_GLOW_EPSILON_PX;
      const showTopGlow = hasOverflow && element.scrollTop > SCROLL_GLOW_EPSILON_PX;
      const remainingBottom = element.scrollHeight - element.clientHeight - element.scrollTop;
      const showBottomGlow = hasOverflow && remainingBottom > SCROLL_GLOW_EPSILON_PX;

      setScrollGlowState((previous) =>
        previous.showTopGlow === showTopGlow && previous.showBottomGlow === showBottomGlow
          ? previous
          : {
              showBottomGlow,
              showTopGlow,
            },
      );
    };

    const scheduleScrollGlowUpdate = () => {
      if (animationFrameId !== 0) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateScrollGlowState);
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleScrollGlowUpdate();
    });
    const mutationObserver = new MutationObserver(() => {
      scheduleScrollGlowUpdate();
    });

    resizeObserver.observe(element);
    mutationObserver.observe(element, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    element.addEventListener("scroll", scheduleScrollGlowUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollGlowUpdate);
    scheduleScrollGlowUpdate();

    return () => {
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }

      resizeObserver.disconnect();
      mutationObserver.disconnect();
      element.removeEventListener("scroll", scheduleScrollGlowUpdate);
      window.removeEventListener("resize", scheduleScrollGlowUpdate);
    };
  }, [scrollContainerRef]);

  return scrollGlowState;
}
