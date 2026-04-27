import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

type CollapsibleStyle = CSSProperties & {
  "--sidebar-collapse-content-height"?: string;
};

export function useCollapsibleHeight<T extends HTMLElement>() {
  const contentRef = useRef<T>(null);
  const [contentHeight, setContentHeight] = useState<number>();

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }

    let animationFrameId = 0;

    const updateHeight = () => {
      const renderedHeight = Math.ceil(element.getBoundingClientRect().height);
      setContentHeight(Math.max(element.scrollHeight, renderedHeight));
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(updateHeight);
    };

    updateHeight();
    const observer = new ResizeObserver(() => {
      scheduleUpdate();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const collapsibleStyle: CollapsibleStyle | undefined =
    contentHeight === undefined
      ? undefined
      : ({
          "--sidebar-collapse-content-height": `${contentHeight}px`,
        } as CollapsibleStyle);

  return {
    collapsibleStyle,
    contentRef,
  };
}
