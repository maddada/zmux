import { IconFolderFilled } from "@tabler/icons-react";
import type { SidebarProjectHeader as SidebarProjectHeaderData } from "../shared/session-grid-contract";

export type SidebarProjectHeaderProps = {
  projectHeader?: SidebarProjectHeaderData;
};

export function SidebarProjectHeader({ projectHeader }: SidebarProjectHeaderProps) {
  if (!projectHeader) {
    return null;
  }

  const displayDirectory = formatSidebarProjectDirectory(projectHeader.directory);

  return (
    <div className="sidebar-project-header-region" data-empty-space-blocking="true">
      <div className="sidebar-project-header-surface">
        <div className="sidebar-project-header-main">
          <div aria-hidden="true" className="sidebar-project-header-icon-shell">
            {projectHeader.faviconDataUrl ? (
              <img
                alt=""
                className="sidebar-project-header-icon-image"
                src={projectHeader.faviconDataUrl}
              />
            ) : (
              <IconFolderFilled className="sidebar-project-header-icon-fallback" size={18} />
            )}
          </div>
          <div className="sidebar-project-header-copy">
            <div className="sidebar-project-header-name">{projectHeader.name}</div>
            <button
              className="sidebar-project-header-directory"
              onClick={() => {
                const copyPromise = navigator.clipboard?.writeText(projectHeader.directory);
                void copyPromise?.catch(() => {});
              }}
              type="button"
            >
              {displayDirectory}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSidebarProjectDirectory(directory: string): string {
  return directory.replace(/^\/Users\/[^/]+(?=\/|$)/, "~").replace(/^\/home\/[^/]+(?=\/|$)/, "~");
}
