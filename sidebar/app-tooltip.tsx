import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import type { ComponentProps, ReactElement, ReactNode } from "react";

type AppTooltipProps = ComponentProps<typeof Tooltip> & {
  children: ReactElement;
  content: ReactNode;
  contentClassName?: string;
  sideOffset?: number;
};

/**
 * CDXC:Tooltips 2026-05-06-18:58
 * User-facing tooltips must render through the shadcn/Radix tooltip instead of
 * native title attributes. Action tooltip copy should describe the action
 * directly and omit project or group names when the surrounding UI already
 * supplies that context.
 */
export function AppTooltip({
  children,
  content,
  contentClassName,
  sideOffset = 8,
  ...tooltipProps
}: AppTooltipProps) {
  if (content === undefined || content === null || content === "") {
    return children;
  }

  return (
    <Tooltip {...tooltipProps}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={contentClassName} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
