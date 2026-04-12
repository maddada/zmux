import { IconPencil, IconWorld } from "@tabler/icons-react";
import { Tooltip } from "@base-ui/react/tooltip";
import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type RefObject,
} from "react";
import type { SidebarSessionItem } from "../shared/session-grid-contract";
import { getSidebarAgentNameByIcon, type SidebarAgentIcon } from "../shared/sidebar-agents";
import { AGENT_LOGOS } from "./agent-logos";
import { formatRelativeTime, getRelativeTimeColor } from "./relative-time";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { useRelativeTimeTick } from "./use-relative-time-tick";

const AGENT_SECONDARY_LABELS: Record<SidebarAgentIcon, readonly string[]> = {
  browser: ["browser"],
  claude: ["claude", "claude code"],
  codex: ["codex", "codex cli", "openai codex"],
  copilot: ["copilot", "github copilot"],
  gemini: ["gemini"],
  opencode: ["open code", "opencode"],
  t3: ["t3", "t3 code"],
};

let activeOverflowTooltipId: symbol | undefined;
let activeOverflowTooltipClose: (() => void) | undefined;
const TERMINAL_TITLE_MARKER = "∗";
const UNSYNCED_TITLE_LABEL = "(Unsynced title)";

export type SessionCardContentProps = {
  aliasHeadingRef?: RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  onRename?: () => void;
  session: SidebarSessionItem;
  showDebugSessionNumbers: boolean;
  showCloseButton: boolean;
  showHotkeys: boolean;
  showLastInteractionTime?: boolean;
};

export function SessionCardContent({
  aliasHeadingRef,
  onClose,
  onRename,
  session,
  showDebugSessionNumbers,
  showCloseButton,
  showHotkeys,
  showLastInteractionTime = false,
}: SessionCardContentProps) {
  const { headingText } = getSessionCardTitleTooltip({
    session,
    showDebugSessionNumbers,
  });
  const showMeta = showHotkeys;
  const hasLastInteractionTime = showLastInteractionTime && Boolean(session.lastInteractionAt);
  useRelativeTimeTick(hasLastInteractionTime);
  const lastInteractionLabel =
    hasLastInteractionTime && session.lastInteractionAt
      ? formatRelativeTime(session.lastInteractionAt).value
      : undefined;
  const lastInteractionStyle =
    hasLastInteractionTime && session.lastInteractionAt
      ? { color: getRelativeTimeColor(session.lastInteractionAt) }
      : undefined;

  return (
    <>
      <div className="session-head">
        <div className="session-alias-heading" ref={aliasHeadingRef}>
          {headingText}
        </div>
        {lastInteractionLabel ? (
          <div className="session-last-interaction-time" style={lastInteractionStyle}>
            {lastInteractionLabel}
          </div>
        ) : null}
        {/* <div className="session-head-actions">
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
        </div> */}
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

export function getSessionCardTitleTooltip({
  alwaysShowTitleTooltip = false,
  session,
  showDebugSessionNumbers,
}: {
  alwaysShowTitleTooltip?: boolean;
  session: Pick<
    SidebarSessionItem,
    | "activityLabel"
    | "agentIcon"
    | "alias"
    | "detail"
    | "isPrimaryTitleTerminalTitle"
    | "primaryTitle"
    | "sessionNumber"
    | "terminalTitle"
  >;
  showDebugSessionNumbers: boolean;
}): {
  headingText: string;
  tooltip?: string;
  tooltipWhen: "always" | "overflow";
} {
  const headingText = formatSessionHeadingText({
    includeUnsyncedTitleLabel: false,
    isPrimaryTitleTerminalTitle: session.isPrimaryTitleTerminalTitle,
    primaryTitle: session.primaryTitle,
    terminalTitle: session.terminalTitle,
    alias: session.alias,
  });
  const tooltipHeadingText = formatSessionHeadingText({
    includeUnsyncedTitleLabel: true,
    isPrimaryTitleTerminalTitle: session.isPrimaryTitleTerminalTitle,
    primaryTitle: session.primaryTitle,
    terminalTitle: session.terminalTitle,
    alias: session.alias,
  });
  const secondaryText = getSessionTooltipSecondaryText(session);
  const debugSessionNumberTooltip =
    showDebugSessionNumbers && session.sessionNumber !== undefined
      ? `Session number: ${session.sessionNumber}`
      : undefined;
  const titleTooltip = buildSessionTitleTooltip({
    debugSessionNumberTooltip,
    headingText: tooltipHeadingText,
    secondaryText,
  });
  const titleTooltipOptions = getSessionTitleTooltipOptions({
    alwaysShowTitleTooltip,
    headingText,
    titleTooltip,
  });

  return {
    headingText,
    ...titleTooltipOptions,
  };
}

export function formatSessionHeadingText({
  alias,
  includeUnsyncedTitleLabel = false,
  isPrimaryTitleTerminalTitle,
  primaryTitle,
  terminalTitle,
}: Pick<
  SidebarSessionItem,
  "alias" | "isPrimaryTitleTerminalTitle" | "primaryTitle" | "terminalTitle"
> & {
  includeUnsyncedTitleLabel?: boolean;
}): string {
  const normalizedPrimaryTitle = primaryTitle?.trim();
  const normalizedTerminalTitle = terminalTitle?.trim();
  const baseHeadingText = normalizedPrimaryTitle || alias;
  if (
    isPrimaryTitleTerminalTitle ||
    !normalizedPrimaryTitle ||
    normalizedPrimaryTitle === normalizedTerminalTitle
  ) {
    return baseHeadingText;
  }

  return includeUnsyncedTitleLabel
    ? `${baseHeadingText} ${TERMINAL_TITLE_MARKER} ${UNSYNCED_TITLE_LABEL}`
    : `${baseHeadingText} ${TERMINAL_TITLE_MARKER}`;
}

export function buildSessionTitleTooltip({
  debugSessionNumberTooltip,
  headingText,
  secondaryText,
}: {
  debugSessionNumberTooltip?: string;
  headingText: string;
  secondaryText?: string;
}): string {
  const uniqueLines = [headingText, secondaryText, debugSessionNumberTooltip].reduce<string[]>(
    (lines, line) => {
      const normalizedLine = line?.trim();
      if (!normalizedLine || lines.includes(normalizedLine)) {
        return lines;
      }

      return [...lines, normalizedLine];
    },
    [],
  );

  return uniqueLines.join("\n");
}

export function getSessionTooltipSecondaryText(
  session: Pick<SidebarSessionItem, "activityLabel" | "agentIcon" | "detail" | "terminalTitle">,
): string | undefined {
  const detail = stripAgentTooltipText(session.detail, session.agentIcon);
  if (detail) {
    return detail;
  }

  const terminalTitle = stripAgentTooltipText(session.terminalTitle, session.agentIcon);
  if (terminalTitle) {
    return terminalTitle;
  }

  return session.activityLabel?.trim() || undefined;
}

export function getSessionTitleTooltipOptions({
  alwaysShowTitleTooltip,
  headingText,
  titleTooltip,
}: {
  alwaysShowTitleTooltip: boolean;
  headingText: string;
  titleTooltip: string;
}): {
  tooltip?: string;
  tooltipWhen: "always" | "overflow";
} {
  const hasTooltipMetadata = titleTooltip !== headingText;
  if (alwaysShowTitleTooltip || hasTooltipMetadata) {
    return {
      tooltip: titleTooltip,
      tooltipWhen: "always",
    };
  }

  return {
    tooltip: undefined,
    tooltipWhen: "overflow",
  };
}

type SessionAgentIconProps = {
  agentIcon: SidebarSessionItem["agentIcon"];
  isFavorite?: boolean;
};

type SessionAgentLogoStyle = CSSProperties & {
  "--session-agent-logo": string;
};

export function SessionFloatingAgentIcon({ agentIcon, isFavorite = false }: SessionAgentIconProps) {
  const favoriteState = String(isFavorite);
  if (agentIcon === "browser") {
    return (
      <IconWorld
        aria-hidden="true"
        className="session-floating-agent-tabler-icon"
        data-agent-icon="browser"
        data-favorite={favoriteState}
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
      data-favorite={favoriteState}
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

function stripAgentTooltipText(
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

  const normalizedAgentLabels = Array.from(
    new Set([getSidebarAgentNameByIcon(agentIcon), ...AGENT_SECONDARY_LABELS[agentIcon]]),
  )
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .sort((left, right) => right.length - left.length);
  const lowerValue = normalizedValue.toLowerCase();

  for (const label of normalizedAgentLabels) {
    const lowerLabel = label.toLowerCase();
    if (lowerValue === lowerLabel) {
      return undefined;
    }

    if (!lowerValue.startsWith(lowerLabel)) {
      continue;
    }

    const remainder = normalizedValue.slice(label.length).trimStart();
    if (!remainder) {
      return undefined;
    }

    const separatorMatch = remainder.match(/^([:/|-]+)\s*(.*)$/);
    if (separatorMatch) {
      const strippedValue = separatorMatch[2]?.trim();
      return strippedValue || undefined;
    }

    return normalizedValue;
  }

  return normalizedValue;
}

type OverflowTooltipTextProps = {
  children: ReactElement<{
    onBlur?: FocusEventHandler<HTMLElement>;
    onFocus?: FocusEventHandler<HTMLElement>;
    onMouseEnter?: MouseEventHandler<HTMLElement>;
    onMouseLeave?: MouseEventHandler<HTMLElement>;
  }>;
  textRef?: RefObject<HTMLDivElement | null>;
  text: string;
  tooltip?: string;
  tooltipWhen?: "always" | "overflow";
};

export function OverflowTooltipText({
  children,
  text,
  textRef,
  tooltip,
  tooltipWhen = "overflow",
}: OverflowTooltipTextProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutIdRef = useRef<number | undefined>(undefined);
  const tooltipIdRef = useRef(Symbol("overflowTooltip"));

  const clearOpenTimeout = () => {
    if (openTimeoutIdRef.current === undefined) {
      return;
    }

    window.clearTimeout(openTimeoutIdRef.current);
    openTimeoutIdRef.current = undefined;
  };

  const closeTooltip = () => {
    clearOpenTimeout();
    if (activeOverflowTooltipId === tooltipIdRef.current) {
      activeOverflowTooltipId = undefined;
      activeOverflowTooltipClose = undefined;
    }
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
      if (activeOverflowTooltipId !== tooltipIdRef.current) {
        activeOverflowTooltipClose?.();
      }

      activeOverflowTooltipId = tooltipIdRef.current;
      activeOverflowTooltipClose = closeTooltip;
      setIsOpen(true);
      openTimeoutIdRef.current = undefined;
    }, TOOLTIP_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      clearOpenTimeout();
      if (activeOverflowTooltipId === tooltipIdRef.current) {
        activeOverflowTooltipId = undefined;
        activeOverflowTooltipClose = undefined;
      }
    };
  }, []);

  const trigger = cloneElement(children, {
    onBlur: chainEventHandlers(children.props.onBlur, closeTooltip),
    onFocus: chainEventHandlers(children.props.onFocus, openTooltip),
    onMouseEnter: chainEventHandlers(children.props.onMouseEnter, openTooltip),
    onMouseLeave: chainEventHandlers(children.props.onMouseLeave, closeTooltip),
  });

  return (
    <Tooltip.Root onOpenChange={(open) => !open && closeTooltip()} open={isOpen}>
      <Tooltip.Trigger disabled render={trigger} />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{tooltip ?? text}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function chainEventHandlers<Event>(
  originalHandler: ((event: Event) => void) | undefined,
  nextHandler: (event: Event) => void,
): (event: Event) => void {
  return (event) => {
    originalHandler?.(event);
    nextHandler(event);
  };
}
