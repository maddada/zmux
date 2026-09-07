/**
 * CDXC:SessionChat 2026-09-06 DECISION:
 * User: Ghostex-generated file references use descriptive Markdown links instead of @filepath, with a purpose and reference number or a session-title Handoff label.
 * SEE-ALSO: apps/mobile/app/src/screens/terminal-screen/session-lookups.ts mirrors the handoff format in the standalone mobile app.
 */
export function sessionChatFileReference(path: string, label: string): string {
  const escapedLabel = label
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\\[\]]/g, '\\$&');
  const destination = /[\s<>]/.test(path) ? `<${path.replace(/[\\<>]/g, '\\$&')}>` : path.replace(/[\\()]/g, '\\$&');
  return `[${escapedLabel}](${destination})`;
}

/** A staged link, followed by room for the user's own prompt; never submitted automatically. */
export function sessionChatHandoffDraft(path: string, sessionTitle: string): string {
  return `${sessionChatFileReference(path, `${sessionTitle} Handoff`)} `;
}
