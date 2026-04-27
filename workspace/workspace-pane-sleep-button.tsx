import { IconMoon, IconPlayerPlay } from "@tabler/icons-react";
import { WorkspacePaneActionTooltip } from "./workspace-pane-action-tooltip";

export type WorkspacePaneSleepButtonProps = {
  isSleeping: boolean;
  onToggleSleeping: () => void;
};

export const WorkspacePaneSleepButton: React.FC<WorkspacePaneSleepButtonProps> = ({
  isSleeping,
  onToggleSleeping,
}) => (
  <WorkspacePaneActionTooltip tooltip={isSleeping ? "Wake" : "Sleep"}>
    <button
      aria-label={isSleeping ? "Wake session" : "Sleep session"}
      className={`workspace-pane-sleep-button ${isSleeping ? "workspace-pane-sleep-button-sleeping" : ""}`}
      draggable={false}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          onToggleSleeping();
        }
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggleSleeping();
      }}
      type="button"
    >
      {isSleeping ? (
        <IconPlayerPlay aria-hidden size={14} stroke={1.8} />
      ) : (
        <IconMoon aria-hidden size={14} stroke={1.8} />
      )}
    </button>
  </WorkspacePaneActionTooltip>
);
