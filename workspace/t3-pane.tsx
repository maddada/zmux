import { useEffect, useRef } from "react";
import type {
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelT3Pane,
} from "../shared/workspace-panel-contract";

type T3ClipboardFilePayload = {
  buffer: ArrayBuffer;
  name: string;
  type: string;
};

export type T3PaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  isFocused: boolean;
  onFocus: () => void;
  pane: WorkspacePanelT3Pane;
};

export const T3Pane: React.FC<T3PaneProps> = ({ autoFocusRequest, isFocused, onFocus, pane }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const blobUrlRef = useRef<string | undefined>(undefined);
  const lastHandledAutoFocusRequestIdRef = useRef<number | undefined>(undefined);
  const previousIsFocusedRef = useRef(isFocused);

  const requestComposerFocus = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: "focusComposer" }, "*");
  };

  const postToFrame = (message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, "*");
  };

  useEffect(() => {
    const blob = new Blob([pane.html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    blobUrlRef.current = blobUrl;

    if (iframeRef.current) {
      iframeRef.current.src = blobUrl;
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = undefined;
      }
    };
  }, [pane.html]);

  useEffect(() => {
    const wasFocused = previousIsFocusedRef.current;
    previousIsFocusedRef.current = isFocused;
    if (isFocused && !wasFocused) {
      requestComposerFocus();
    }
  }, [isFocused, pane.sessionId]);

  useEffect(() => {
    if (
      !isFocused ||
      !autoFocusRequest ||
      lastHandledAutoFocusRequestIdRef.current === autoFocusRequest.requestId
    ) {
      return;
    }

    lastHandledAutoFocusRequestIdRef.current = autoFocusRequest.requestId;
    requestComposerFocus();
  }, [autoFocusRequest, isFocused]);

  useEffect(() => {
    const readClipboardPayload = async (): Promise<{
      files: T3ClipboardFilePayload[];
      text: string;
    }> => {
      let text = "";
      const files: T3ClipboardFilePayload[] = [];

      if (typeof navigator.clipboard.read === "function") {
        const clipboardItems = await navigator.clipboard.read().catch(() => []);
        let imageIndex = 0;
        for (const item of clipboardItems) {
          for (const mimeType of item.types) {
            const blob = await item.getType(mimeType).catch(() => undefined);
            if (!blob) {
              continue;
            }

            if (!text && mimeType === "text/plain") {
              text = await blob.text().catch(() => "");
              continue;
            }

            if (!mimeType.startsWith("image/")) {
              continue;
            }

            imageIndex += 1;
            files.push({
              buffer: await blob.arrayBuffer(),
              name: inferClipboardImageName(mimeType, imageIndex),
              type: mimeType,
            });
          }
        }
      }

      if (!text) {
        text = await navigator.clipboard.readText().catch(() => "");
      }

      return { files, text };
    };

    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        typeof event.data?.type !== "string"
      ) {
        return;
      }

      if (event.data.type === "vsmuxT3ClipboardWrite") {
        const text = typeof event.data.text === "string" ? event.data.text : "";
        void navigator.clipboard.writeText(text).catch(() => {});
        return;
      }

      if (event.data.type === "vsmuxT3ClipboardWriteRequest") {
        const requestId =
          typeof event.data.requestId === "number" ? event.data.requestId : undefined;
        const text = typeof event.data.text === "string" ? event.data.text : "";
        if (requestId === undefined) {
          return;
        }

        void navigator.clipboard.writeText(text).then(
          () => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                ok: true,
                requestId,
                type: "vsmuxT3ClipboardWriteResult",
              },
              "*",
            );
          },
          (error) => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                error: error instanceof Error ? error.message : String(error),
                ok: false,
                requestId,
                type: "vsmuxT3ClipboardWriteResult",
              },
              "*",
            );
          },
        );
        return;
      }

      if (event.data.type === "vsmuxT3ClipboardReadRequest") {
        const requestId =
          typeof event.data.requestId === "number" ? event.data.requestId : undefined;
        if (requestId === undefined) {
          return;
        }

        void readClipboardPayload().then(({ files, text }) => {
          const transferables = files.map((file) => file.buffer);
          iframeRef.current?.contentWindow?.postMessage(
            {
              files,
              requestId,
              text,
              type: "vsmuxT3ClipboardReadResult",
            },
            "*",
            transferables,
          );
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="t3-pane-root" onMouseDown={onFocus}>
      <iframe
        allow="clipboard-read; clipboard-write"
        className="t3-pane-frame"
        onLoad={() => {
          if (!isFocused) {
            return;
          }
          requestComposerFocus();
        }}
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
        title={pane.sessionRecord.title}
      />
    </div>
  );
};

function inferClipboardImageName(mimeType: string, index: number): string {
  const extension = mimeType.split("/")[1] ?? "png";
  return `clipboard-image-${index}.${extension}`;
}
