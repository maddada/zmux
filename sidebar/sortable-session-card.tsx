import { IconPencil, IconX } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/react/sortable";
import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import type { WebviewApi } from "./webview-api";

const CONTEXT_MENU_HEIGHT_PX = 90;
const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_WIDTH_PX = 156;

type ContextMenuPosition = {
  x: number;
  y: number;
};

type HoverTooltipPosition = {
  left: number;
  top: number;
};

export type SortableSessionCardProps = {
  index: number;
  session: SidebarSessionItem;
  showCloseButton: boolean;
  showHotkeys: boolean;
  vscode: WebviewApi;
};

function clampContextMenuPosition(clientX: number, clientY: number): ContextMenuPosition {
  return {
    x: Math.max(
      CONTEXT_MENU_MARGIN_PX,
      Math.min(clientX, window.innerWidth - CONTEXT_MENU_WIDTH_PX - CONTEXT_MENU_MARGIN_PX),
    ),
    y: Math.max(
      CONTEXT_MENU_MARGIN_PX,
      Math.min(clientY, window.innerHeight - CONTEXT_MENU_HEIGHT_PX - CONTEXT_MENU_MARGIN_PX),
    ),
  };
}

export function SortableSessionCard({
  index,
  session,
  showCloseButton,
  showHotkeys,
  vscode,
}: SortableSessionCardProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>();
  const [aliasTooltipPosition, setAliasTooltipPosition] = useState<HoverTooltipPosition>();
  const menuRef = useRef<HTMLDivElement>(null);
  const aliasHeadingRef = useRef<HTMLDivElement>(null);
  const secondaryText = session.detail ?? session.primaryTitle ?? session.activityLabel;
  const secondaryTitle =
    session.primaryTitle && session.detail
      ? `${session.primaryTitle}\n${session.detail}`
      : secondaryText;
  const isAliasOverflowing = useIsTextOverflowing(aliasHeadingRef, session.alias);
  const sortable = useSortable({
    disabled: contextMenuPosition !== undefined,
    id: session.sessionId,
    index,
  });

  useEffect(() => {
    setContextMenuPosition(undefined);
  }, [session.alias, session.sessionId]);

  useEffect(() => {
    if (!contextMenuPosition) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenuPosition(undefined);
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenuPosition(undefined);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuPosition(undefined);
      }
    };
    const handleBlur = () => {
      setContextMenuPosition(undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setContextMenuPosition(undefined);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [contextMenuPosition]);

  const openContextMenu = (clientX: number, clientY: number) => {
    setContextMenuPosition(clampContextMenuPosition(clientX, clientY));
  };

  const openAliasTooltip = () => {
    if (!isAliasOverflowing) {
      return;
    }

    const aliasElement = aliasHeadingRef.current;
    if (!aliasElement) {
      return;
    }

    const bounds = aliasElement.getBoundingClientRect();
    setAliasTooltipPosition({
      left: bounds.left + bounds.width / 2,
      top: Math.max(12, bounds.top - 8),
    });
  };

  const closeAliasTooltip = () => {
    setAliasTooltipPosition(undefined);
  };

  const requestRename = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "promptRenameSession",
    });
  };

  const requestClose = () => {
    setContextMenuPosition(undefined);
    vscode.postMessage({
      sessionId: session.sessionId,
      type: "closeSession",
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      openContextMenu(bounds.left + 24, bounds.top + 18);
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    vscode.postMessage({ sessionId: session.sessionId, type: "focusSession" });
  };

  return (
    <>
      <article
        aria-expanded={contextMenuPosition ? true : undefined}
        aria-haspopup="menu"
        aria-pressed={session.isFocused}
        className="session"
        data-activity={session.activity}
        data-dragging={String(Boolean(sortable.isDragging))}
        data-focused={String(session.isFocused)}
        data-running={String(session.isRunning)}
        data-visible={String(session.isVisible)}
        onAuxClick={(event) => {
          if (event.button !== 1) {
            return;
          }

          event.preventDefault();
          requestClose();
        }}
        onClick={(event) => {
          if (event.metaKey) {
            event.preventDefault();
            requestClose();
            return;
          }

          vscode.postMessage({
            sessionId: session.sessionId,
            type: "focusSession",
          });
        }}
        onContextMenu={(event: ReactMouseEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();
          openContextMenu(event.clientX, event.clientY);
        }}
        onKeyDown={handleKeyDown}
        ref={sortable.ref}
        role="button"
        tabIndex={0}
      >
        <div className="session-head">
          <div
            className="session-alias-heading"
            onBlur={closeAliasTooltip}
            onMouseEnter={openAliasTooltip}
            onMouseLeave={closeAliasTooltip}
            ref={aliasHeadingRef}
          >
            {session.alias}
          </div>
          {showCloseButton ? (
            <button
              aria-label="Close session"
              className="close-button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                vscode.postMessage({ sessionId: session.sessionId, type: "closeSession" });
              }}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="session-footer">
          {secondaryText ? (
            <div className="session-secondary" title={secondaryTitle}>
              {secondaryText}
            </div>
          ) : (
            <div />
          )}
          <div className="session-meta" data-visible={String(showHotkeys)}>
            {session.shortcutLabel}
          </div>
        </div>
      </article>
      {aliasTooltipPosition && isAliasOverflowing
        ? createPortal(
            <div
              aria-hidden="true"
              className="session-hover-tooltip"
              style={{
                left: `${aliasTooltipPosition.left}px`,
                top: `${aliasTooltipPosition.top}px`,
              }}
            >
              <div className="tooltip-popup">{session.alias}</div>
            </div>,
            document.body,
          )
        : null}
      {contextMenuPosition
        ? createPortal(
            <div
              className="session-context-menu"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              ref={menuRef}
              role="menu"
              style={{
                left: `${contextMenuPosition.x}px`,
                top: `${contextMenuPosition.y}px`,
              }}
            >
              <button
                className="session-context-menu-item"
                onClick={requestRename}
                role="menuitem"
                type="button"
              >
                <IconPencil
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={16}
                  stroke={1.8}
                />
                Rename
              </button>
              <button
                className="session-context-menu-item session-context-menu-item-danger"
                onClick={requestClose}
                role="menuitem"
                type="button"
              >
                <IconX
                  aria-hidden="true"
                  className="session-context-menu-icon"
                  size={16}
                  stroke={1.8}
                />
                Terminate
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function useIsTextOverflowing<TElement extends HTMLElement>(
  ref: RefObject<TElement | null>,
  text: string,
): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      setIsOverflowing(false);
      return;
    }

    const updateOverflow = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflow();
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, text]);

  return isOverflowing;
}
