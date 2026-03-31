import { IconPencil, IconWorld } from "@tabler/icons-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import { getSidebarAgentNameByIcon, type SidebarAgentIcon } from "../shared/sidebar-agents";
import { AGENT_LOGOS } from "./agent-logos";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";

const AGENT_SECONDARY_LABELS: Record<SidebarAgentIcon, readonly string[]> = {
  browser: ["browser"],
  claude: ["claude", "claude code"],
  codex: ["codex", "codex cli", "openai codex"],
  copilot: ["copilot", "github copilot"],
  gemini: ["gemini"],
  opencode: ["open code", "opencode"],
  t3: ["t3", "t3 code"],
};

export type SessionCardContentProps = {
  aliasHeadingRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  onRename?: () => void;
  session: SidebarSessionItem;
  showDebugSessionNumbers: boolean;
  showCloseButton: boolean;
  showHotkeys: boolean;
};

export function SessionCardContent({
  aliasHeadingRef,
  onClose,
  onRename,
  session,
  showDebugSessionNumbers,
  showCloseButton,
  showHotkeys,
}: SessionCardContentProps) {
  const headingText = session.primaryTitle?.trim() || session.alias;
  const terminalTitle = getAgentSecondaryText(session.terminalTitle, session.agentIcon);
  const secondaryText =
    session.detail ??
    terminalTitle ??
    session.activityLabel ??
    getSidebarAgentNameByIcon(session.agentIcon);
  const showDebugSessionNumber = showDebugSessionNumbers && session.sessionNumber !== undefined;
  const debugSessionNumberTooltip = showDebugSessionNumber
    ? `Session number: ${session.sessionNumber}`
    : undefined;
  const titleTooltip = [headingText, secondaryText, debugSessionNumberTooltip]
    .filter(Boolean)
    .join("\n");
  const showMeta = showHotkeys;

  return (
    <>
      <div className="session-head">
        <OverflowTooltipText
          className="session-alias-heading"
          textRef={aliasHeadingRef}
          text={headingText}
          tooltip={titleTooltip}
          tooltipWhen={secondaryText || debugSessionNumberTooltip ? "always" : "overflow"}
        />
        <div className="session-head-actions">
          <div className="session-meta" data-visible={String(showMeta)}>
            {showHotkeys ? (
              <span className="session-shortcut-label">{session.shortcutLabel}</span>
            ) : null}
          </div>
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
      </div>
      {onRename ? (
        <button
          aria-label="Rename session"
          className="session-rename-button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRename();
          }}
          type="button"
        >
          <IconPencil aria-hidden="true" size={14} stroke={1.8} />
        </button>
      ) : null}
    </>
  );
}

type SessionAgentIconProps = {
  agentIcon: SidebarSessionItem["agentIcon"];
};

type SessionAgentLogoStyle = CSSProperties & {
  "--session-agent-logo": string;
};

export function SessionFloatingAgentIcon({ agentIcon }: SessionAgentIconProps) {
  if (agentIcon === "browser") {
    return (
      <IconWorld
        aria-hidden="true"
        className="session-floating-agent-tabler-icon"
        data-agent-icon="browser"
        size={14}
        stroke={1.8}
      />
    );
  }

  if (!agentIcon) {
    return null;
  }

  const agentLogoStyle: SessionAgentLogoStyle = {
    "--session-agent-logo": `url("${AGENT_LOGOS[agentIcon]}")`,
  };

  return (
    <span
      aria-hidden="true"
      className="session-floating-agent-icon"
      data-agent-icon={agentIcon}
      style={agentLogoStyle}
    />
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
  tooltipWhen?: "always" | "overflow";
};

function OverflowTooltipText({
  className,
  text,
  textRef,
  tooltip,
  tooltipWhen = "overflow",
}: OverflowTooltipTextProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutIdRef = useRef<number | undefined>(undefined);

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
    const shouldOpen = tooltipWhen === "always" ? Boolean(tooltip ?? text) : hasOverflow();
    if (!shouldOpen) {
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
            key={`${className}:${text}:${tooltip ?? ""}`}
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
