import { WidgetType, type EditorView } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MermaidDiagram } from '@/packages/core-ui/mermaid/mermaid-diagram';

export function getFencedCodeContent(state: EditorState, node: { from: number; to: number }): string {
  const startLine = state.doc.lineAt(node.from);
  const endLine = state.doc.lineAt(Math.max(node.to - 1, node.from));

  const lines: string[] = [];
  let inContent = false;

  for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum += 1) {
    const line = state.doc.line(lineNum);
    const lineText = state.doc.sliceString(line.from, line.to);

    if (!inContent) {
      if (/^[ \t]{0,3}(?:`{3,}|~{3,})/.test(lineText)) {
        inContent = true;
      }
      continue;
    }

    if (/^[ \t]{0,3}(?:`{3,}|~{3,})/.test(lineText)) {
      break;
    }

    lines.push(lineText);
  }

  return lines.join('\n');
}

/** CodeMirror owns source ranges; the shared React component owns diagram rendering and controls. */
export class MermaidDiagramWidget extends WidgetType {
  private root: Root | null = null;

  constructor(
    readonly diagramText: string,
    readonly startLine = 0,
    readonly endLine = 0
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof MermaidDiagramWidget &&
      other.diagramText === this.diagramText &&
      other.startLine === this.startLine &&
      other.endLine === this.endLine
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'meo-mermaid-react-widget';
    container.dataset.meoRenderedBlockKind = 'mermaid';
    container.dataset.meoRenderedBlockStartLine = String(this.startLine);
    container.dataset.meoRenderedBlockEndLine = String(this.endLine);
    const root = createRoot(container);
    this.root = root;
    root.render(
      createElement(MermaidDiagram, {
        source: this.diagramText,
        onResize: () => view.requestMeasure(),
        onExpand:
          'ghostexGpui' in window
            ? (source: string) => {
                const host = (
                  window as unknown as {
                    webkit?: { messageHandlers?: { ghostexManageFiles?: { postMessage: (message: unknown) => void } } };
                  }
                ).webkit?.messageHandlers?.ghostexManageFiles;
                if (!host) throw new Error('Docs host is unavailable.');
                host.postMessage({ action: 'openMermaidDiagram', source });
              }
            : undefined,
      })
    );
    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(): void {
    const root = this.root;
    this.root = null;
    // A React parent can remove CodeMirror during its own commit.
    queueMicrotask(() => root?.unmount());
  }
}
