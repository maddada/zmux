import { useEffect, useState, type RefObject } from 'react';

export function useSessionChatPaneFocus(rootRef: RefObject<HTMLDivElement | null>, hostOwnsFocus: boolean) {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (hostOwnsFocus) return;
    const update = (): void => {
      const root = rootRef.current;
      setFocused(document.hasFocus() && !!root?.contains(document.activeElement));
    };
    update();
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
    };
  }, [hostOwnsFocus, rootRef]);
  return [focused, setFocused] as const;
}
