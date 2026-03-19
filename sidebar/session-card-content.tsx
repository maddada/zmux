import { Tooltip } from "@base-ui/react/tooltip";
import type { RefObject } from "react";
import type { SidebarSessionItem } from "../shared/session-grid-contract";

export type SessionCardContentProps = {
  aliasHeadingRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  secondaryRef?: RefObject<HTMLDivElement | null>;
  session: SidebarSessionItem;
  showAliasTooltip?: boolean;
  showCloseButton: boolean;
  showHotkeys: boolean;
  showSecondaryTooltip?: boolean;
};

export function SessionCardContent({
  aliasHeadingRef,
  onClose,
  secondaryRef,
  session,
  showAliasTooltip = false,
  showCloseButton,
  showHotkeys,
  showSecondaryTooltip = false,
}: SessionCardContentProps) {
  const secondaryText =
    session.detail ?? session.terminalTitle ?? session.primaryTitle ?? session.activityLabel;
  const secondaryTitle = [session.terminalTitle, session.primaryTitle, session.detail]
    .filter((value) => value && value.length > 0)
    .join("\n");

  return (
    <>
      <div className="session-head">
        <OverflowTooltipText
          className="session-alias-heading"
          textRef={aliasHeadingRef}
          showTooltip={showAliasTooltip}
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
            showTooltip={showSecondaryTooltip}
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
  showTooltip: boolean;
  text: string;
  textRef?: RefObject<HTMLDivElement | null>;
  tooltip?: string;
};

function OverflowTooltipText({
  className,
  showTooltip,
  text,
  textRef,
  tooltip,
}: OverflowTooltipTextProps) {
  const content = (
    <div className={className} ref={textRef}>
      {text}
    </div>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={content} />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{tooltip ?? text}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
