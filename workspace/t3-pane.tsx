import { useEffect, useRef } from "react";
import type {
  WorkspacePanelAutoFocusRequest,
  WorkspacePanelT3Pane,
} from "../shared/workspace-panel-contract";

export type T3PaneProps = {
  autoFocusRequest?: WorkspacePanelAutoFocusRequest;
  isFocused: boolean;
  onFocus: () => void;
  pane: WorkspacePanelT3Pane;
};

export const T3Pane: React.FC<T3PaneProps> = ({
  autoFocusRequest,
  isFocused,
  onFocus,
  pane,
}) => {
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
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || typeof event.data?.type !== "string") {
        return;
      }

      if (event.data.type === "vsmuxT3ClipboardWrite") {
        const text = typeof event.data.text === "string" ? event.data.text : "";
        void navigator.clipboard.writeText(text).catch(() => {});
        return;
      }

      if (event.data.type === "vsmuxT3ClipboardReadRequest") {
        const requestId =
          typeof event.data.requestId === "number" ? event.data.requestId : undefined;
        if (requestId === undefined) {
          return;
        }

        void navigator.clipboard
          .readText()
          .catch(() => "")
          .then((text) => {
            postToFrame({
              requestId,
              text,
              type: "vsmuxT3ClipboardReadResult",
            });
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
