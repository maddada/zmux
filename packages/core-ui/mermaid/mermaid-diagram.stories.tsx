import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, type CSSProperties } from 'react';
import { MermaidDiagram, MermaidDiagramModal } from './mermaid-diagram';
import { SessionChatMarkdown } from '../chat/session-chat-markdown';
import { createEditor } from '@/apps/desktop/views/meo/editor';
import '@/apps/desktop/views/meo/styles.css';

const FLOWCHART = `flowchart TB
    UI["Shared UI · GPUI Kit<br/>History window, search, previews, settings"]
    CORE["Shared core · Rust<br/>Capture rules, history, search, paste workflow"]
    STORE["Shared storage<br/>SQLite, attachments, migrations"]
    CONTRACT["Platform interface<br/>Clipboard, shortcuts, permissions, app focus"]
    MAC["macOS adapter"]
    WIN["Windows adapter · later"]
    LIN["Linux adapter · later<br/>Wayland / X11 backends"]
    UI <-->|"Commands and state"| CORE
    CORE <-->|"Storage interface"| STORE
    CORE <-->|"Native requests and events"| CONTRACT
    CONTRACT --- MAC
    CONTRACT --- WIN
    CONTRACT --- LIN`;

const SEQUENCE = `sequenceDiagram
    participant UI as Shared UI
    participant Core as Shared core
    participant OS as OS adapter
    participant Target as Target app
    UI->>Core: Paste selected history item
    Core->>OS: Write item to clipboard
    OS-->>Core: Success or failure
    Core-->>UI: Hide picker after successful write
    Core->>OS: Restore target and request paste
    OS->>Target: Native focus and paste action
    OS-->>Core: Result`;
const fence = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\``;

const meta = {
  title: 'Components/Mermaid Diagram',
  component: MermaidDiagram,
  args: { source: FLOWCHART },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MermaidDiagram>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Flowchart: Story = {};
export const NarrowChat: Story = {
  render: () => (
    <div style={{ width: 360, maxWidth: '100%' }}>
      <SessionChatMarkdown markdown={fence(FLOWCHART)} />
    </div>
  ),
};
export const Light: Story = {
  decorators: [
    (Story) => (
      <div style={{ '--background': '#fafafa', '--foreground': '#1f2937', '--border': '#d1d5db' } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
};
export const Sequence: Story = { args: { source: SEQUENCE } };
export const Invalid: Story = { args: { source: 'flowchart TB\n A[Unfinished' } };
export const Chat: Story = {
  render: () => <SessionChatMarkdown markdown={`${fence(FLOWCHART)}\n\n${fence(SEQUENCE)}`} />,
};
export const Streaming: Story = {
  render: () => (
    <SessionChatMarkdown
      isStreaming
      markdown={`${fence(FLOWCHART)}\n\n\`\`\`mermaid\nsequenceDiagram\n UI->>Core: Paste`}
    />
  ),
};

function DocsEditor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const editor = createEditor({
      parent: ref.current,
      initialMode: 'live',
      text: `${fence(FLOWCHART)}\n\n${fence(SEQUENCE)}`,
      onApplyChanges: () => {},
      onOpenLink: () => {},
      onSelectionChange: () => {},
    });
    return () => editor.destroy();
  }, []);
  return <div ref={ref} className='editor-root' />;
}
export const Docs: Story = { render: () => <DocsEditor /> };

function NativeExpandedDiagram() {
  useEffect(() => {
    const classes = ['app-modal-host-body', 'app-modal-host-native-window-body'];
    const added = classes.filter((name) => !document.body.classList.contains(name));
    const previous = document.body.dataset.appModalFixedWindow;
    document.body.classList.add(...added);
    document.body.dataset.appModalFixedWindow = 'true';
    return () => {
      document.body.classList.remove(...added);
      if (previous === undefined) delete document.body.dataset.appModalFixedWindow;
      else document.body.dataset.appModalFixedWindow = previous;
    };
  }, []);
  return <MermaidDiagramModal source={FLOWCHART} onClose={() => {}} />;
}

export const NativeExpanded: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <NativeExpandedDiagram />,
};
