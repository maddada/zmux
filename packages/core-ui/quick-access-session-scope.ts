export const SESSIONS_SCOPE_TOGGLE_HOTKEY = 'alt+c';

export function isQuickAccessSessionScopeHotkey(event: KeyboardEvent): boolean {
  return (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.code === 'KeyC' || event.key.toLowerCase() === 'c')
  );
}

export function isReservedQuickAccessSessionScopeHotkey(event: KeyboardEvent): boolean {
  return (
    isQuickAccessSessionScopeHotkey(event) && document.querySelector('.previous-sessions-modal') !== null
  );
}
