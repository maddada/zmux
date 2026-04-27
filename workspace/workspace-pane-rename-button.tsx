import { IconPencil } from "@tabler/icons-react";
import { WorkspacePaneActionTooltip } from "./workspace-pane-action-tooltip";

export type WorkspacePaneRenameButtonProps = {
  onRename: () => void;
};

export const WorkspacePaneRenameButton: React.FC<WorkspacePaneRenameButtonProps> = ({
  onRename,
}) => (
  <WorkspacePaneActionTooltip tooltip="Rename">
    <button
      aria-label="Rename session"
      className="workspace-pane-rename-button"
      draggable={false}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          onRename();
        }
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRename();
      }}
      type="button"
    >
      <IconPencil aria-hidden size={14} stroke={1.8} />
    </button>
  </WorkspacePaneActionTooltip>
);
