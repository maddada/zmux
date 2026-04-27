import { useEffect, useRef, useState } from "react";
import { IconX } from "@tabler/icons-react";
import type { WorkspacePanelShowToastMessage } from "../shared/workspace-panel-contract";
import { WorkspacePaneActionTooltip } from "./workspace-pane-action-tooltip";

export const WORKSPACE_PANE_CLOSE_CONFIRM_DURATION_MS = 3_000;

const getWorkspacePaneCloseConfirmToastMessage = (sessionLabel?: string) => {
  const trimmedSessionLabel = sessionLabel?.trim();
  if (!trimmedSessionLabel) {
    return "Click the X again within 3 seconds to close this session.";
  }

  return `Click the X again within 3 seconds to close ${trimmedSessionLabel}.`;
};

export type WorkspacePaneCloseButtonProps = {
  onConfirmClose: () => void;
  onConfirmToastDismissed?: (toast: WorkspacePanelShowToastMessage) => void;
  onConfirmToastShown?: (toast: WorkspacePanelShowToastMessage) => void;
  sessionLabel?: string;
};

export const WorkspacePaneCloseButton: React.FC<WorkspacePaneCloseButtonProps> = ({
  onConfirmClose,
  onConfirmToastDismissed,
  onConfirmToastShown,
  sessionLabel,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmTimeoutRef = useRef<number | undefined>(undefined);
  const confirmToastRef = useRef<WorkspacePanelShowToastMessage | undefined>(undefined);
  const confirmToastDismissedRef = useRef(onConfirmToastDismissed);

  confirmToastDismissedRef.current = onConfirmToastDismissed;

  useEffect(
    () => () => {
      if (confirmTimeoutRef.current !== undefined) {
        window.clearTimeout(confirmTimeoutRef.current);
      }
      if (confirmToastRef.current) {
        confirmToastDismissedRef.current?.(confirmToastRef.current);
        confirmToastRef.current = undefined;
      }
    },
    [],
  );

  const armConfirmation = () => {
    if (confirmTimeoutRef.current !== undefined) {
      window.clearTimeout(confirmTimeoutRef.current);
    }

    const confirmToast: WorkspacePanelShowToastMessage = {
      expiresAt: Date.now() + WORKSPACE_PANE_CLOSE_CONFIRM_DURATION_MS,
      message: getWorkspacePaneCloseConfirmToastMessage(sessionLabel),
      title: "Confirm close session",
      type: "showToast",
    };

    setIsConfirming(true);
    confirmToastRef.current = confirmToast;
    onConfirmToastShown?.(confirmToast);
    confirmTimeoutRef.current = window.setTimeout(() => {
      confirmTimeoutRef.current = undefined;
      if (confirmToastRef.current) {
        onConfirmToastDismissed?.(confirmToastRef.current);
        confirmToastRef.current = undefined;
      }
      setIsConfirming(false);
    }, WORKSPACE_PANE_CLOSE_CONFIRM_DURATION_MS);
  };

  const clearConfirmation = () => {
    if (confirmTimeoutRef.current !== undefined) {
      window.clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = undefined;
    }
    if (confirmToastRef.current) {
      onConfirmToastDismissed?.(confirmToastRef.current);
      confirmToastRef.current = undefined;
    }
    setIsConfirming(false);
  };

  return (
    <div className="workspace-pane-close-control">
      <WorkspacePaneActionTooltip tooltip={isConfirming ? "Confirm Close" : "Close"}>
        <button
          aria-label={isConfirming ? "Confirm close session" : "Close session"}
          className={`workspace-pane-close-button ${isConfirming ? "workspace-pane-close-button-confirming" : ""}`}
          draggable={false}
          onClick={(event) => {
            event.stopPropagation();

            if (isConfirming) {
              clearConfirmation();
              onConfirmClose();
              return;
            }

            armConfirmation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          type="button"
        >
          <IconX aria-hidden size={14} stroke={1.8} />
        </button>
      </WorkspacePaneActionTooltip>
    </div>
  );
};
