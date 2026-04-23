import { Tooltip } from "@base-ui/react/tooltip";
import { IconFolderFilled } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { SidebarProjectHeader as SidebarProjectHeaderData } from "../shared/session-grid-contract";

export type SidebarProjectHeaderProps = {
  projectHeader?: SidebarProjectHeaderData;
};

const PROJECT_HEADER_TOOLTIP_DELAY_MS = 200;
const PROJECT_HEADER_COPIED_TOOLTIP_DURATION_MS = 1200;

export function SidebarProjectHeader({ projectHeader }: SidebarProjectHeaderProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const copiedTimerRef = useRef<number | undefined>(undefined);
  const isHoveringRef = useRef(false);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== undefined) {
        window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = undefined;
      }
    };
  }, []);

  if (!projectHeader) {
    return null;
  }

  const displayDirectory = formatSidebarProjectDirectory(projectHeader.directory);
  const copyPath = () => {
    const copyPromise = navigator.clipboard?.writeText(projectHeader.directory);
    void copyPromise?.catch(() => {});
    setIsCopied(true);
    setIsTooltipOpen(true);

    if (copiedTimerRef.current !== undefined) {
      window.clearTimeout(copiedTimerRef.current);
    }

    copiedTimerRef.current = window.setTimeout(() => {
      setIsCopied(false);
      copiedTimerRef.current = undefined;

      if (!isHoveringRef.current && !isFocusedRef.current) {
        setIsTooltipOpen(false);
      }
    }, PROJECT_HEADER_COPIED_TOOLTIP_DURATION_MS);
  };

  return (
    <div className="sidebar-project-header-region" data-empty-space-blocking="true">
      <div className="sidebar-project-header-surface">
        <div className="sidebar-project-header-main">
          <div
            aria-hidden="true"
            className="sidebar-project-header-icon-shell"
            data-icon-variant={projectHeader.faviconDataUrl ? "favicon" : "placeholder"}
          >
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
          <Tooltip.Provider delay={PROJECT_HEADER_TOOLTIP_DELAY_MS}>
            <Tooltip.Root
              onOpenChange={(open) => {
                if (!open && isCopied) {
                  return;
                }

                setIsTooltipOpen(open);
              }}
              open={isTooltipOpen}
            >
              <Tooltip.Trigger
                render={
                  <button
                    aria-label={`Copy project path: ${projectHeader.directory}`}
                    className="sidebar-project-header-copy copy-cursor"
                    onBlur={() => {
                      isFocusedRef.current = false;
                      if (!isCopied && !isHoveringRef.current) {
                        setIsTooltipOpen(false);
                      }
                    }}
                    onClick={copyPath}
                    onFocus={() => {
                      isFocusedRef.current = true;
                    }}
                    onMouseEnter={() => {
                      isHoveringRef.current = true;
                    }}
                    onMouseLeave={() => {
                      isHoveringRef.current = false;
                      if (!isCopied && !isFocusedRef.current) {
                        setIsTooltipOpen(false);
                      }
                    }}
                    type="button"
                  >
                    <span className="sidebar-project-header-name">{projectHeader.name}</span>
                    <span className="sidebar-project-header-directory">{displayDirectory}</span>
                  </button>
                }
              />
              <Tooltip.Portal>
                <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
                  <Tooltip.Popup className="tooltip-popup">
                    {isCopied ? "Copied path!" : "Click here to copy the path"}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>
    </div>
  );
}

function formatSidebarProjectDirectory(directory: string): string {
  return directory.replace(/^\/Users\/[^/]+(?=\/|$)/, "~").replace(/^\/home\/[^/]+(?=\/|$)/, "~");
}
