import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";

export type WorkspacePaneActionTooltipProps = {
  children: ReactElement;
  tooltip: string;
};

export const WorkspacePaneActionTooltip: React.FC<WorkspacePaneActionTooltipProps> = ({
  children,
  tooltip,
}) => (
  <Tooltip.Root>
    <Tooltip.Trigger render={children} />
    <Tooltip.Portal>
      <Tooltip.Positioner className="workspace-tooltip-positioner" sideOffset={8}>
        <Tooltip.Popup className="workspace-tooltip-popup">{tooltip}</Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  </Tooltip.Root>
);
