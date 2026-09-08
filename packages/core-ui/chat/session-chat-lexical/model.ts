import {
  $applyNodeReplacement,
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type PointType,
  type SerializedLexicalNode,
} from 'lexical';
import {
  sessionChatComposerReferences,
  sessionChatReferencePillText,
  type SessionChatComposerReference,
} from '../session-chat-reference-pills';

type SerializedReference = SerializedLexicalNode & {
  source: string;
  reference: SessionChatComposerReference;
};

/**
 * CDXC:SessionChat 2026-09-07 DECISION:
 * User: replace Monaco with Lexical to save RAM and start the composer immediately, preserving the existing composer UX.
 * References retain their canonical Markdown while their inline nodes own atomic selection, deletion, and the compact pill presentation.
 */
export class SessionChatReferenceNode extends DecoratorNode<null> {
  __source: string;
  __reference: SessionChatComposerReference;

  constructor(source: string, reference: SessionChatComposerReference, key?: NodeKey) {
    super(key);
    this.__source = source;
    this.__reference = reference;
  }

  static getType(): string {
    return 'ghostex-reference';
  }
  static clone(node: SessionChatReferenceNode): SessionChatReferenceNode {
    return new SessionChatReferenceNode(node.__source, node.__reference, node.__key);
  }
  static importJSON(node: SerializedReference): SessionChatReferenceNode {
    return $applyNodeReplacement(new SessionChatReferenceNode(node.source, node.reference));
  }
  exportJSON(): SerializedReference {
    return { ...super.exportJSON(), source: this.__source, reference: this.__reference };
  }
  createDOM(): HTMLElement {
    const pill = document.createElement('span');
    const { kind, label, path } = this.__reference;
    pill.className = `ghostex-chat-reference-pill ghostex-chat-reference-pill--${kind}`;
    pill.contentEditable = 'false';
    pill.dataset.ghostexReferencePath = path;
    pill.dataset.ghostexReferenceKey = this.__key;
    pill.setAttribute('role', 'img');
    pill.setAttribute('aria-label', `${label}: ${path}`);
    pill.textContent = sessionChatReferencePillText(label, kind);
    return pill;
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
  isInline(): true {
    return true;
  }
  isKeyboardSelectable(): false {
    return false;
  }
  getTextContent(): string {
    return this.__source;
  }
}

export function $composerNodes(text: string): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  const appendText = (value: string): void => {
    value.split('\n').forEach((line, index) => {
      if (index) nodes.push($createLineBreakNode());
      if (line) nodes.push($createTextNode(line));
    });
  };
  let offset = 0;
  for (const reference of sessionChatComposerReferences(text)) {
    appendText(text.slice(offset, reference.start));
    nodes.push(
      $applyNodeReplacement(new SessionChatReferenceNode(text.slice(reference.start, reference.end), reference))
    );
    offset = reference.end;
  }
  appendText(text.slice(offset));
  return nodes;
}

export function $setComposerText(text: string): void {
  $getRoot()
    .clear()
    .append($createParagraphNode().append(...$composerNodes(text)));
}

export function $composerLeaves(): { node: LexicalNode; start: number; end: number }[] {
  const leaves: { node: LexicalNode; start: number; end: number }[] = [];
  let offset = 0;
  const visit = (node: LexicalNode): void => {
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) visit(child);
    } else {
      const end = offset + node.getTextContentSize();
      leaves.push({ node, start: offset, end });
      offset = end;
    }
  };
  visit($getRoot());
  return leaves;
}

function $pointOffset(point: PointType): number {
  const target = point.getNode();
  let offset = 0;
  const visit = (node: LexicalNode): boolean => {
    if (node.is(target)) {
      offset += $isElementNode(node)
        ? node
            .getChildren()
            .slice(0, point.offset)
            .reduce((sum, child) => sum + child.getTextContentSize(), 0)
        : Math.min(point.offset, node.getTextContentSize());
      return true;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) if (visit(child)) return true;
    } else offset += node.getTextContentSize();
    return false;
  };
  visit($getRoot());
  return offset;
}

export interface ComposerSelection {
  anchor: number;
  focus: number;
  start: number;
  end: number;
}

export function $readComposerSelection(previous: ComposerSelection): ComposerSelection {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const anchor = $pointOffset(selection.anchor);
    const focus = $pointOffset(selection.focus);
    return { anchor, focus, start: Math.min(anchor, focus), end: Math.max(anchor, focus) };
  }
  if ($isNodeSelection(selection)) {
    const keys = new Set(selection.getNodes().map((node) => node.getKey()));
    const selected = $composerLeaves().filter(({ node }) => keys.has(node.getKey()));
    if (selected.length) {
      const start = selected[0]!.start;
      const end = selected[selected.length - 1]!.end;
      return { anchor: start, focus: end, start, end };
    }
  }
  return previous;
}

export function $setComposerSelection(anchor: number, focus = anchor): void {
  const selection = $createRangeSelection();
  const leaves = $composerLeaves();
  const setPoint = (point: PointType, offset: number): void => {
    const target = Math.max(0, Math.min(offset, $getRoot().getTextContentSize()));
    for (const { node, start, end } of leaves) {
      if (target > end) continue;
      if ($isTextNode(node)) point.set(node.getKey(), target - start, 'text');
      else point.set(node.getParentOrThrow().getKey(), node.getIndexWithinParent() + Number(target > start), 'element');
      return;
    }
    const paragraph = $getRoot().getFirstChild();
    if ($isElementNode(paragraph)) point.set(paragraph.getKey(), paragraph.getChildrenSize(), 'element');
  };
  setPoint(selection.anchor, anchor);
  setPoint(selection.focus, focus);
  $setSelection(selection);
}

export function $replaceComposerSelection(text: string): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  const nodes = $composerNodes(text.replace(/\r\n?/g, '\n'));
  if (nodes.length) selection.insertNodes(nodes);
  else selection.removeText();
}
