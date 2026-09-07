import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function SessionChatUserMessageLayout({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const bubble = ref.current?.querySelector<HTMLElement>('[data-slot="bubble-content"]');
    if (!bubble) return;
    const measure = () => {
      const style = getComputedStyle(bubble);
      const textHeight = bubble.scrollHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setCompact(textHeight <= 2 * parseFloat(style.lineHeight) + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bubble);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div className='ghostex-chat-user-message' data-compact={compact} ref={ref}>
      {children}
    </div>
  );
}
