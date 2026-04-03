type T3FrameBootstrap = {
  scriptSrc: string;
  sessionId: string;
  sessionRecordTitle: string;
  serverOrigin: string;
  styleHref?: string;
  threadId: string;
  workspaceRoot: string;
  wsUrl: string;
};

declare global {
  interface Window {
    __VSMUX_T3_BOOTSTRAP__?: {
      embedMode: "vsmux-mobile";
      httpOrigin: string;
      sessionId: string;
      threadId: string;
      workspaceRoot: string;
      wsUrl: string;
    };
  }
}

const bootstrap = readBootstrap();
document.title = bootstrap.sessionRecordTitle;
window.__VSMUX_T3_BOOTSTRAP__ = {
  embedMode: "vsmux-mobile",
  httpOrigin: bootstrap.serverOrigin,
  sessionId: bootstrap.sessionId,
  threadId: bootstrap.threadId,
  workspaceRoot: bootstrap.workspaceRoot,
  wsUrl: bootstrap.wsUrl,
};

if (bootstrap.styleHref) {
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = bootstrap.styleHref;
  document.head.append(stylesheet);
}

const root = document.getElementById("root");
if (root) {
  root.id = "root";
}

window.addEventListener("message", (event) => {
  if (event.data?.type !== "focusComposer") {
    return;
  }

  focusComposerEditor();
});

window.addEventListener("focus", () => {
  notifyParentFocus();
});

document.addEventListener(
  "pointerdown",
  () => {
    notifyParentFocus();
  },
  true,
);

let nextClipboardRequestId = 0;
const pendingClipboardReads = new Map<number, (text: string) => void>();

window.addEventListener("message", (event) => {
  if (event.data?.type !== "vsmuxT3ClipboardReadResult") {
    return;
  }

  const requestId = typeof event.data.requestId === "number" ? event.data.requestId : undefined;
  if (requestId === undefined) {
    return;
  }

  const resolver = pendingClipboardReads.get(requestId);
  if (!resolver) {
    return;
  }

  pendingClipboardReads.delete(requestId);
  resolver(typeof event.data.text === "string" ? event.data.text : "");
});

document.addEventListener(
  "keydown",
  (event) => {
    const primaryModifier = navigator.platform.toLowerCase().includes("mac") ? event.metaKey : event.ctrlKey;
    if (!primaryModifier || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "c") {
      const text = readSelectedText();
      if (!text) {
        return;
      }
      event.preventDefault();
      writeClipboard(text);
      return;
    }

    if (key === "x") {
      const text = readSelectedText();
      if (!text || !isEditableTarget(document.activeElement)) {
        return;
      }
      event.preventDefault();
      writeClipboard(text);
      deleteSelectionFromActiveTarget();
      return;
    }

    if (key === "v" && isEditableTarget(document.activeElement)) {
      event.preventDefault();
      void readClipboard().then((text) => {
        insertTextIntoActiveTarget(text);
      });
    }
  },
  true,
);

document.addEventListener(
  "copy",
  (event) => {
    const text = readSelectedText();
    if (!text) {
      return;
    }
    event.preventDefault();
    writeClipboard(text);
  },
  true,
);

document.addEventListener(
  "cut",
  (event) => {
    const text = readSelectedText();
    if (!text || !isEditableTarget(document.activeElement)) {
      return;
    }
    event.preventDefault();
    writeClipboard(text);
    deleteSelectionFromActiveTarget();
  },
  true,
);

document.addEventListener(
  "paste",
  (event) => {
    if (!isEditableTarget(document.activeElement)) {
      return;
    }
    event.preventDefault();
    void readClipboard().then((text) => {
      insertTextIntoActiveTarget(text);
    });
  },
  true,
);

const script = document.createElement("script");
script.type = "module";
script.src = bootstrap.scriptSrc;
document.body.append(script);

function readBootstrap(): T3FrameBootstrap {
  const bootstrapElement = document.getElementById("vsmux-t3-bootstrap");
  const encoded = bootstrapElement?.textContent;
  if (!encoded) {
    throw new Error("Missing VSmux T3 iframe bootstrap payload.");
  }

  return JSON.parse(encoded) as T3FrameBootstrap;
}

function focusComposerEditor() {
  const maxAttempts = 10;
  let attempt = 0;

  const tryFocus = () => {
    const composer = document.querySelector(
      '[data-testid="composer-editor"][contenteditable="true"]',
    );
    if (!(composer instanceof HTMLElement)) {
      if (attempt < maxAttempts) {
        attempt += 1;
        window.setTimeout(tryFocus, 50);
      }
      return;
    }

    composer.focus();
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(composer);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  tryFocus();
}

function notifyParentFocus() {
  window.parent?.postMessage(
    {
      sessionId: bootstrap.sessionId,
      type: "vsmuxT3Focus",
    },
    "*",
  );
}

function writeClipboard(text: string) {
  window.parent?.postMessage(
    {
      text,
      type: "vsmuxT3ClipboardWrite",
    },
    "*",
  );
}

function readClipboard(): Promise<string> {
  const requestId = nextClipboardRequestId++;
  return new Promise((resolve) => {
    pendingClipboardReads.set(requestId, resolve);
    window.parent?.postMessage(
      {
        requestId,
        type: "vsmuxT3ClipboardReadRequest",
      },
      "*",
    );
  });
}

function readSelectedText(): string {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? start;
    return start === end ? "" : activeElement.value.slice(start, end);
  }

  return window.getSelection()?.toString() ?? "";
}

function isEditableTarget(target: Element | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function insertTextIntoActiveTarget(text: string) {
  if (!text) {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart ?? activeElement.value.length;
    const end = activeElement.selectionEnd ?? start;
    activeElement.setRangeText(text, start, end, "end");
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertText",
      }),
    );
    return;
  }

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    if (dispatchSyntheticPaste(activeElement, text)) {
      return;
    }

    if (dispatchSyntheticBeforeInput(activeElement, text)) {
      return;
    }

    activeElement.focus();
    if (typeof document.execCommand === "function" && document.execCommand("insertText", false, text)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    if (selection.rangeCount === 0) {
      const range = document.createRange();
      range.selectNodeContents(activeElement);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertText",
      }),
    );
  }
}

function dispatchSyntheticPaste(target: HTMLElement, text: string): boolean {
  if (typeof ClipboardEvent !== "function" || typeof DataTransfer !== "function") {
    return false;
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.setData("text/plain", text);
  const event = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer,
  });
  return !target.dispatchEvent(event);
}

function dispatchSyntheticBeforeInput(target: HTMLElement, text: string): boolean {
  if (typeof InputEvent !== "function") {
    return false;
  }

  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: "insertFromPaste",
  });
  return !target.dispatchEvent(event);
}

function deleteSelectionFromActiveTarget() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
    const start = activeElement.selectionStart ?? 0;
    const end = activeElement.selectionEnd ?? start;
    if (start === end) {
      return;
    }
    activeElement.setRangeText("", start, end, "start");
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: "",
        inputType: "deleteByCut",
      }),
    );
    return;
  }

  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      return;
    }
    range.deleteContents();
    activeElement.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: "",
        inputType: "deleteByCut",
      }),
    );
  }
}
