import type { SessionChatTextEditCommand } from './session-chat-edit-shortcuts';

interface TerminalEditingInput {
  getValue: () => string;
  getSelection: () => { start: number; end: number; focus: number };
  setSelection: (start: number, end?: number) => void;
  insertText: (text: string) => boolean;
}

/** Per-editor kill buffer; yanking restores canonical reference Markdown too. */
export function createSessionChatTerminalEditing(input: TerminalEditingInput) {
  let killed = '';
  let consecutive = false;
  let previousValue = '';
  let previousCaret = 0;
  const breakSequence = () => {
    consecutive = false;
  };
  const run = (command: SessionChatTextEditCommand): boolean => {
    if (!['killLineLeft', 'killLineRight', 'yank', 'lineStart', 'lineEnd'].includes(command)) {
      breakSequence();
      return false;
    }
    const value = input.getValue();
    const selection = input.getSelection();
    const caret = selection.focus;
    const lineStart = caret === 0 ? 0 : value.lastIndexOf('\n', caret - 1) + 1;
    const newline = value.indexOf('\n', caret);
    const lineEnd = newline < 0 ? value.length : newline;
    if (command === 'lineStart' || command === 'lineEnd') {
      breakSequence();
      input.setSelection(command === 'lineStart' ? lineStart : lineEnd);
      return true;
    }
    if (command === 'yank') {
      breakSequence();
      if (killed) input.insertText(killed);
      return true;
    }
    const backward = command === 'killLineLeft';
    let { start, end } = selection;
    if (start === end) {
      start = backward ? lineStart : caret;
      // Like kill-line, Ctrl+K at the end of a line removes its newline.
      end = backward ? caret : lineEnd === caret && newline >= 0 ? caret + 1 : lineEnd;
    }
    if (start === end) return true;
    const text = value.slice(start, end);
    killed =
      consecutive && value === previousValue && caret === previousCaret
        ? backward
          ? text + killed
          : killed + text
        : text;
    input.setSelection(start, end);
    input.insertText('');
    consecutive = true;
    previousValue = input.getValue();
    previousCaret = input.getSelection().focus;
    return true;
  };
  return { run, breakSequence };
}
