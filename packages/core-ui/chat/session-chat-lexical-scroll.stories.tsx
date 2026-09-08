import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import type { SessionChatComposerInputApi } from './session-chat-composer';
import { SessionChatLexicalInput } from './session-chat-lexical-input';

const DRAFT =
  Array.from({ length: 30 }, (_, index) =>
    index === 14
      ? ''
      : `Line ${String(index + 1).padStart(2, '0')}: ${'A long draft wraps onto several visual lines. '.repeat(2)}`
  ).join('\n') + '\n';
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function LexicalScrollStory() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SessionChatComposerInputApi | null>(null);
  const [result, setResult] = useState('Ready');

  const check = async () => {
    const root = host.current?.querySelector<HTMLElement>('[role="textbox"]');
    if (!root || !api.current) return;
    setResult('Checking');
    const press = async (key: string, modifiers: KeyboardEventInit = {}) => {
      root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }));
      await nextFrame();
    };
    const assertVisible = (step: string) => {
      const selection = window.getSelection();
      if (!selection?.focusNode || !root.contains(selection.focusNode)) throw new Error(`${step}: focus left editor`);
      const range = document.createRange();
      range.setStart(selection.focusNode, selection.focusOffset);
      range.collapse(true);
      let rect = [...range.getClientRects()].find((box) => box.height > 0);
      if (!rect && selection.focusNode instanceof Element) {
        rect =
          selection.focusNode.childNodes[selection.focusOffset] instanceof Element
            ? (selection.focusNode.childNodes[selection.focusOffset] as Element).getBoundingClientRect()
            : undefined;
      }
      const box = root.getBoundingClientRect();
      if (!rect || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) {
        throw new Error(
          `${step}: caret outside editor (scroll ${root.scrollTop}, caret ${rect?.top}, viewport ${box.top}..${box.bottom})`
        );
      }
    };
    try {
      const pageScroll = window.scrollY;
      api.current.focus();
      api.current.applyValue(DRAFT, DRAFT.length);
      await nextFrame();
      // Start on text; the final blank line is checked separately below.
      await press('ArrowLeft');
      for (let index = 0; index < 14; index++) {
        await press('ArrowUp');
        assertVisible(`ArrowUp ${index + 1}`);
      }
      await press('ArrowUp', { metaKey: true });
      assertVisible('Document start');
      for (let index = 0; index < 65; index++) {
        await press('ArrowDown');
        assertVisible(`ArrowDown ${index + 1}`);
      }
      await press('ArrowUp', { metaKey: true, shiftKey: true });
      assertVisible('Extend selection to start');
      await press('ArrowDown', { metaKey: true, shiftKey: true });
      assertVisible('Extend selection to end');
      await press('ArrowDown', { metaKey: true });
      assertVisible('Trailing blank line');
      root.scrollTop = 0;
      await nextFrame();
      await nextFrame();
      if (root.scrollTop !== 0) throw new Error('Manual scrolling snapped back to the caret');
      await press('ArrowLeft');
      assertVisible('Navigation after manual scrolling');
      if (window.scrollY !== pageScroll) throw new Error('Navigation scrolled the surrounding page');
      if (api.current.getValue() !== DRAFT) throw new Error('Navigation changed the draft');
      setResult(
        'Passed: wrapped lines, blank lines, arrows in both directions, document jumps, selection extension, and manual scrolling. Draft and page position unchanged.'
      );
    } catch (error) {
      setResult(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className='ghostex-session-chat-scope bg-background p-6 text-foreground' style={{ minHeight: '100vh' }}>
      <div style={{ width: 420, maxWidth: '100%', display: 'grid', gap: 16 }}>
        <button onClick={() => void check()}>Run scrolling checks</button>
        <output role='status'>{result}</output>
        <div ref={host} className='ghostex-chat-composer' style={{ padding: 12 }}>
          <SessionChatLexicalInput
            initialValue={DRAFT}
            onCaretChange={() => undefined}
            onChange={() => undefined}
            onKeyDown={() => undefined}
            onPasteData={() => false}
            placeholder='Message'
            fillHeight={false}
            registerApi={(value) => {
              api.current = value;
            }}
            theme='dark'
          />
        </div>
      </div>
    </div>
  );
}

const meta = {
  component: LexicalScrollStory,
  parameters: { layout: 'fullscreen' },
  title: 'Chat/Lexical caret scrolling',
} satisfies Meta<typeof LexicalScrollStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TallDraft: Story = {};
