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

  return (
    <div className="t3-pane-root" onMouseDown={onFocus}>
      <iframe
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
