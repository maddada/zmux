import {
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconGitCommit,
  IconGitPullRequest,
  IconLoader2,
  IconUpload,
} from "@tabler/icons-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildSidebarGitMenuItems,
  resolveSidebarGitPrimaryActionState,
  type SidebarGitAction,
  type SidebarGitState,
} from "../shared/sidebar-git";
import type { WebviewApi } from "./webview-api";

export type GitActionRowProps = {
  git: SidebarGitState;
  vscode: WebviewApi;
};

type GitMenuPosition = {
  left: number;
  top: number;
  width: number;
};

const GIT_MENU_MAX_WIDTH_PX = 220;
const GIT_MENU_MARGIN_PX = 12;
const GIT_MENU_OFFSET_PX = 8;

export function GitActionRow({ git, vscode }: GitActionRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<GitMenuPosition>();
  const menuRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuItems = useMemo(() => buildSidebarGitMenuItems(git), [git]);
  const primaryAction = useMemo(() => resolveSidebarGitPrimaryActionState(git), [git]);
  const primaryDescription = primaryAction.disabledReason ?? primaryAction.label;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        wrapperRef.current?.contains(event.target as Node) ||
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }

      setIsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      setMenuPosition(undefined);
      return;
    }

    const updateMenuPosition = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) {
        return;
      }

      const wrapperBounds = wrapper.getBoundingClientRect();
      const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 0;
      const width = Math.min(GIT_MENU_MAX_WIDTH_PX, Math.max(wrapperBounds.width, 180));
      const left = Math.max(
        GIT_MENU_MARGIN_PX,
        Math.min(wrapperBounds.right - width, window.innerWidth - width - GIT_MENU_MARGIN_PX),
      );
      const top = Math.max(
        GIT_MENU_MARGIN_PX,
        Math.min(
          wrapperBounds.bottom + GIT_MENU_OFFSET_PX,
          window.innerHeight - menuHeight - GIT_MENU_MARGIN_PX,
        ),
      );

      setMenuPosition({ left, top, width });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    const animationFrameId = window.requestAnimationFrame(updateMenuPosition);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isMenuOpen, menuItems.length]);

  const requestRefresh = () => {
    vscode.postMessage({ type: "refreshGitState" });
  };

  const setPrimaryAction = (action: SidebarGitAction) => {
    vscode.postMessage({
      action,
      type: "setSidebarGitPrimaryAction",
    });
  };

  const setCommitConfirmationEnabled = (enabled: boolean) => {
    vscode.postMessage({
      enabled,
      type: "setSidebarGitCommitConfirmationEnabled",
    });
  };

  const setGenerateCommitBodyEnabled = (enabled: boolean) => {
    vscode.postMessage({
      enabled,
      type: "setSidebarGitGenerateCommitBodyEnabled",
    });
  };

  const runAction = (action: SidebarGitAction) => {
    setIsMenuOpen(false);
    vscode.postMessage({
      action,
      type: "runSidebarGitAction",
    });
  };

  return (
    <div className="git-action-row" onMouseEnter={requestRefresh} ref={wrapperRef}>
      <div className="git-action-split-button">
        <button
          aria-label={primaryDescription}
          className="git-action-main-button"
          data-disabled={String(primaryAction.disabled)}
          data-empty-space-blocking="true"
          onClick={() => runAction(primaryAction.action)}
          title={primaryDescription}
          type="button"
        >
          <span aria-hidden="true" className="git-action-main-icon-shell">
            {git.isBusy ? (
              <IconLoader2
                className="git-action-main-icon git-action-main-icon-spinning"
                size={16}
              />
            ) : (
              <GitActionIcon action={primaryAction.action} />
            )}
          </span>
          <span className="git-action-main-label">{primaryAction.label}</span>
          <span aria-hidden="true" className="git-action-diff-stat">
            <span className="git-action-diff-stat-additions">+{git.additions}</span>
            <span className="git-action-diff-stat-divider">/</span>
            <span className="git-action-diff-stat-deletions">-{git.deletions}</span>
          </span>
        </button>
        <button
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-label="Git action options"
          className="git-action-toggle-button"
          data-empty-space-blocking="true"
          onClick={() => {
            if (!isMenuOpen) {
              requestRefresh();
            }
            setIsMenuOpen((previous) => !previous);
          }}
          title="Git action options"
          type="button"
        >
          <IconChevronDown aria-hidden="true" className="git-action-toggle-icon" size={16} />
        </button>
      </div>
      {isMenuOpen && menuPosition
        ? createPortal(
            <div
              className="git-action-menu"
              ref={menuRef}
              role="menu"
              style={{
                left: `${menuPosition.left}px`,
                top: `${menuPosition.top}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              {menuItems.map((item) => (
                <button
                  aria-label={item.disabledReason ?? item.label}
                  className="git-action-menu-item"
                  data-disabled={String(item.disabled)}
                  key={item.action}
                  onClick={() => {
                    setPrimaryAction(item.action);
                    setIsMenuOpen(false);
                  }}
                  role="menuitem"
                  title={item.disabledReason ?? item.label}
                  type="button"
                >
                  <GitActionIcon action={item.action} />
                  <span className="git-action-menu-item-label">{item.label}</span>
                  {item.action === "pr" && git.pr?.state === "open" ? (
                    <IconExternalLink
                      aria-hidden="true"
                      className="git-action-menu-item-trailing-icon"
                      size={14}
                    />
                  ) : null}
                </button>
              ))}
              <div aria-hidden="true" className="git-action-menu-divider" />
              <button
                aria-label={
                  git.confirmSuggestedCommit
                    ? "Disable suggested commit review"
                    : "Enable suggested commit review"
                }
                className="git-action-menu-item git-action-menu-toggle-item"
                onClick={() => setCommitConfirmationEnabled(!git.confirmSuggestedCommit)}
                role="menuitemcheckbox"
                title={
                  git.confirmSuggestedCommit
                    ? "Review suggested commit message before running the git action"
                    : "Use the suggested commit message immediately without opening the review modal"
                }
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="git-action-menu-toggle-check"
                  data-selected={String(git.confirmSuggestedCommit)}
                >
                  {git.confirmSuggestedCommit ? <IconCheck size={14} /> : null}
                </span>
                <span className="git-action-menu-item-label">Review Commit Title</span>
                <span className="git-action-menu-toggle-state">
                  {git.confirmSuggestedCommit ? "On" : "Off"}
                </span>
              </button>
              <button
                aria-label={
                  git.generateCommitBody
                    ? "Disable generated commit body in the review modal"
                    : "Enable generated commit body in the review modal"
                }
                className="git-action-menu-item git-action-menu-toggle-item"
                onClick={() => setGenerateCommitBodyEnabled(!git.generateCommitBody)}
                role="menuitemcheckbox"
                title={
                  git.generateCommitBody
                    ? "Include generated bullet points in the suggested commit message"
                    : "Only suggest the commit title without generated bullet points"
                }
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="git-action-menu-toggle-check"
                  data-selected={String(git.generateCommitBody)}
                >
                  {git.generateCommitBody ? <IconCheck size={14} /> : null}
                </span>
                <span className="git-action-menu-item-label">Generate commit body</span>
                <span className="git-action-menu-toggle-state">
                  {git.generateCommitBody ? "On" : "Off"}
                </span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

type GitActionIconProps = {
  action: SidebarGitAction;
};

function GitActionIcon({ action }: GitActionIconProps) {
  if (action === "push") {
    return <IconUpload aria-hidden="true" className="git-action-main-icon" size={16} />;
  }

  if (action === "pr") {
    return <IconGitPullRequest aria-hidden="true" className="git-action-main-icon" size={16} />;
  }

  return <IconGitCommit aria-hidden="true" className="git-action-main-icon" size={16} />;
}
