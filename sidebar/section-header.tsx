import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type SectionHeaderProps = {
  actions?: ReactNode;
  isCollapsed?: boolean;
  isCollapsible?: boolean;
  onToggleCollapsed?: () => void;
  title: string;
};

export function SectionHeader({
  actions,
  isCollapsed = false,
  isCollapsible = false,
  onToggleCollapsed,
  title,
}: SectionHeaderProps) {
  const collapseLabel = `${isCollapsed ? "Expand" : "Collapse"} ${title}`;

  return (
    <div className="section-titlebar" data-empty-space-blocking="true">
      <div className="section-titlebar-main">
        {isCollapsible ? (
          <button
            aria-label={collapseLabel}
            className="section-titlebar-toggle"
            data-empty-space-blocking="true"
            onClick={onToggleCollapsed}
            title={collapseLabel}
            type="button"
          >
            {isCollapsed ? (
              <IconChevronRight aria-hidden="true" className="section-titlebar-toggle-icon" />
            ) : (
              <IconChevronDown aria-hidden="true" className="section-titlebar-toggle-icon" />
            )}
          </button>
        ) : null}
        <span className="section-titlebar-label">{title}</span>
      </div>
      {actions ? <div className="section-titlebar-actions">{actions}</div> : null}
    </div>
  );
}
