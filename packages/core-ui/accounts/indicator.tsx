import './accounts.css';

/** CDXC:AgentProviders 2026-09-08 DECISION: The account indicator matches the stashed-message circle, in white at the top-left of the session agent icon. Sidebar icons and account menus have no badge. Users may replace the slot number with one custom letter or digit, or enter - to hide the indicator for that account. This replaces the centered slot badge. */
export function AccountIndicator({ value }: { value?: string }) {
  return value && value !== '-' ? <span aria-hidden='true' className='ghostex-chat-stash-count-badge gx-account-indicator'>{value}</span> : null;
}
