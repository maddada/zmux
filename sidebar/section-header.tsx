import { IconCaretRightFilled } from "@tabler/icons-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

export type SectionHeaderProps = {
  actions?: ReactNode;
  idleIcon?: ReactNode;
  isCollapsed?: boolean;
  isCollapsible?: boolean;
  onToggleCollapsed?: () => void;
  title: string;
};

export function SectionHeader({
  actions,
  idleIcon,
  isCollapsed = false,
  isCollapsible = false,
  onToggleCollapsed,
  title,
}: SectionHeaderProps) {
  const collapseLabel = `${isCollapsed ? "Expand" : "Collapse"} ${title}`;
  const handleHeaderClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isCollapsible) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".section-titlebar-actions")) {
      return;
    }

    onToggleCollapsed?.();
  };

  return (
    <div
      className="section-titlebar"
      data-collapsible={String(isCollapsible)}
      data-empty-space-blocking="true"
      onClick={handleHeaderClick}
    >
      <div className="section-titlebar-main">
        {isCollapsible ? (
          <button
            aria-label={collapseLabel}
            className="section-titlebar-toggle"
            data-collapsed={String(isCollapsed)}
            data-empty-space-blocking="true"
            data-has-idle-icon={String(idleIcon !== undefined)}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapsed?.();
            }}
            title={collapseLabel}
            type="button"
          >
            {idleIcon ? (
              <span
                aria-hidden="true"
                className="section-titlebar-toggle-icon section-titlebar-toggle-idle-icon"
              >
                {idleIcon}
              </span>
            ) : null}
            <IconCaretRightFilled
              aria-hidden="true"
              className="section-titlebar-toggle-icon section-titlebar-toggle-chevron-icon"
            />
          </button>
        ) : null}
        <span className="section-titlebar-label">{title}</span>
      </div>
      {actions ? (
        <div
          className="section-titlebar-actions"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
