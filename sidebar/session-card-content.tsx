import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import { getSidebarAgentNameByIcon, type SidebarAgentIcon } from "../shared/sidebar-agents";
import { AGENT_LOGOS } from "./agent-logos";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";

const AGENT_SECONDARY_LABELS: Record<SidebarAgentIcon, readonly string[]> = {
  claude: ["claude", "claude code"],
  codex: ["codex", "codex cli", "openai codex"],
  gemini: ["gemini"],
  opencode: ["open code", "opencode"],
};

export type SessionCardContentProps = {
  aliasHeadingRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  secondaryRef?: RefObject<HTMLDivElement | null>;
  session: SidebarSessionItem;
  showDebugSessionNumbers: boolean;
  showCloseButton: boolean;
  showHotkeys: boolean;
};

export function SessionCardContent({
  aliasHeadingRef,
  onClose,
  secondaryRef,
  session,
  showDebugSessionNumbers,
  showCloseButton,
  showHotkeys,
}: SessionCardContentProps) {
  const terminalTitle = getAgentSecondaryText(session.terminalTitle, session.agentIcon);
  const primaryTitle = getAgentSecondaryText(session.primaryTitle, session.agentIcon);
  const secondaryText =
    session.detail ??
    terminalTitle ??
    primaryTitle ??
    session.activityLabel ??
    getSidebarAgentNameByIcon(session.agentIcon);
  const secondaryTitle = [terminalTitle, primaryTitle, session.detail]
    .filter((value) => value && value.length > 0)
    .join("\n");
  const showDebugSessionNumber = showDebugSessionNumbers && session.sessionNumber !== undefined;
  const showMeta = showHotkeys || showDebugSessionNumber;

  return (
    <>
      {session.agentIcon ? (
        <span
          aria-hidden="true"
          className="session-agent-watermark"
          style={
            {
              "--session-agent-logo": `url("${AGENT_LOGOS[session.agentIcon]}")`,
            } as CSSProperties
          }
        />
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
        <div
          className="session-meta"
          data-visible={String(showMeta)}
        >
          {showDebugSessionNumber ? (
            <span className="session-debug-number">{session.sessionNumber}</span>
          ) : null}
          {showHotkeys ? (
            <span className="session-shortcut-label">{session.shortcutLabel}</span>
          ) : null}
        </div>
      </div>
    </>
  );
}

function getAgentSecondaryText(
  value: string | undefined,
  agentIcon: SidebarSessionItem["agentIcon"],
): string | undefined {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  if (!agentIcon) {
    return normalizedValue;
  }

  const matchingGenericLabel = AGENT_SECONDARY_LABELS[agentIcon].includes(
    normalizedValue.toLowerCase(),
  );
  if (matchingGenericLabel) {
    return getSidebarAgentNameByIcon(agentIcon);
  }

  return normalizedValue;
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
