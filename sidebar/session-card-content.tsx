import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";

export type SessionCardContentProps = {
  aliasHeadingRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  secondaryRef?: RefObject<HTMLDivElement | null>;
  session: SidebarSessionItem;
  showCloseButton: boolean;
  showHotkeys: boolean;
};

export function SessionCardContent({
  aliasHeadingRef,
  onClose,
  secondaryRef,
  session,
  showCloseButton,
  showHotkeys,
}: SessionCardContentProps) {
  const secondaryText =
    session.detail ?? session.terminalTitle ?? session.primaryTitle ?? session.activityLabel;
  const secondaryTitle = [session.terminalTitle, session.primaryTitle, session.detail]
    .filter((value) => value && value.length > 0)
    .join("\n");

  return (
    <>
      {session.activity === "attention" ? (
        <div aria-hidden className="session-attention-dot" />
      ) : null}
      <div className="session-head">
        <OverflowTooltipText
          className="session-alias-heading"
          textRef={aliasHeadingRef}
          text={session.alias}
        />
        {showCloseButton && onClose ? (
          <button
            aria-label="Close session"
            className="close-button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="session-footer">
        {secondaryText ? (
          <OverflowTooltipText
            className="session-secondary"
            textRef={secondaryRef}
            text={secondaryText}
            tooltip={secondaryTitle}
          />
        ) : (
          <div />
        )}
        <div className="session-meta" data-visible={String(showHotkeys)}>
          {session.shortcutLabel}
        </div>
      </div>
    </>
  );
}

type OverflowTooltipTextProps = {
  className: string;
  text: string;
  textRef?: RefObject<HTMLDivElement | null>;
  tooltip?: string;
};

function OverflowTooltipText({ className, text, textRef, tooltip }: OverflowTooltipTextProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutIdRef = useRef<number>();

  const clearOpenTimeout = () => {
    if (openTimeoutIdRef.current === undefined) {
      return;
    }

    window.clearTimeout(openTimeoutIdRef.current);
    openTimeoutIdRef.current = undefined;
  };

  const closeTooltip = () => {
    clearOpenTimeout();
    setIsOpen(false);
  };

  const hasOverflow = () => {
    const element = textRef?.current;
    if (!element) {
      return false;
    }

    if (element.scrollWidth > element.clientWidth) {
      return true;
    }

    return element.scrollHeight > element.clientHeight;
  };

  const openTooltip = () => {
    clearOpenTimeout();
    if (!hasOverflow()) {
      setIsOpen(false);
      return;
    }

    openTimeoutIdRef.current = window.setTimeout(() => {
      setIsOpen(true);
      openTimeoutIdRef.current = undefined;
    }, TOOLTIP_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      clearOpenTimeout();
    };
  }, []);

  const content = (
    <div className={className} ref={textRef}>
      {text}
    </div>
  );

  return (
    <Tooltip.Root onOpenChange={(open) => !open && closeTooltip()} open={isOpen}>
      <Tooltip.Trigger
        disabled
        render={
          <div
            className="session-tooltip-trigger"
            onBlur={closeTooltip}
            onFocus={openTooltip}
            onMouseEnter={openTooltip}
            onMouseLeave={closeTooltip}
          >
            {content}
          </div>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{tooltip ?? text}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
