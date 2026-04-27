import { IconMinus, IconPlus } from "@tabler/icons-react";
import { WorkspacePaneActionTooltip } from "./workspace-pane-action-tooltip";

export type WorkspacePaneFontSizeControlsProps = {
  onAdjustZoom: (delta: -1 | 1) => void;
  onResetZoom: () => void;
};

export const WorkspacePaneFontSizeControls: React.FC<WorkspacePaneFontSizeControlsProps> = ({
  onAdjustZoom,
  onResetZoom,
}) => (
  <>
    <WorkspacePaneActionTooltip tooltip="Zoom Out">
      <button
        aria-label="Zoom Out"
        className="workspace-pane-font-size-button"
        draggable={false}
        onClick={(event) => {
          event.stopPropagation();
          if (event.detail === 0) {
            onAdjustZoom(-1);
          }
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.button === 1) {
            onResetZoom();
            return;
          }
          if (event.button !== 0) {
            return;
          }
          onAdjustZoom(-1);
        }}
        onAuxClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        type="button"
      >
        <IconMinus aria-hidden size={14} stroke={1.8} />
      </button>
    </WorkspacePaneActionTooltip>
    <WorkspacePaneActionTooltip tooltip="Zoom In">
      <button
        aria-label="Zoom In"
        className="workspace-pane-font-size-button"
        draggable={false}
        onClick={(event) => {
          event.stopPropagation();
          if (event.detail === 0) {
            onAdjustZoom(1);
          }
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.button === 1) {
            onResetZoom();
            return;
          }
          if (event.button !== 0) {
            return;
          }
          onAdjustZoom(1);
        }}
        onAuxClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        type="button"
      >
        <IconPlus aria-hidden size={14} stroke={1.8} />
      </button>
    </WorkspacePaneActionTooltip>
  </>
);
