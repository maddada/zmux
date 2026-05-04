import { IconBrowser, IconLoader2 } from "@tabler/icons-react";
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
import { type SidebarSessionItem } from "../shared/session-grid-contract";
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
  session: SidebarSessionItem;
  showDebugSessionNumbers: boolean;
  showCloseButton: boolean;
  showHotkeys: boolean;
  showLastInteractionTime?: boolean;
};

export function SessionCardContent({
  aliasHeadingRef,
  session,
  showDebugSessionNumbers,
  showLastInteractionTime = false,
}: SessionCardContentProps) {
  const isGeneratingFirstPromptTitle = session.isGeneratingFirstPromptTitle === true;
  const { headingText } = getSessionCardTitleTooltip({
    session,
    showDebugSessionNumbers,
  });
  const hasLastInteractionTime = Boolean(session.lastInteractionAt);
  const showHeaderLoadingSpinner = session.isReloading === true || isGeneratingFirstPromptTitle;
  const hasHeaderAgentIcon = Boolean(session.agentIcon) || showHeaderLoadingSpinner;
  useRelativeTimeTick(hasLastInteractionTime);
  const lastInteractionLabel =
    hasLastInteractionTime && session.lastInteractionAt
      ? formatRelativeTime(session.lastInteractionAt, {
          allowJustNow: false,
        }).value
      : undefined;
  const lastInteractionStyle =
    hasLastInteractionTime && session.lastInteractionAt
      ? { color: getRelativeTimeColor(session.lastInteractionAt) }
      : undefined;
  /**
   * CDXC:SidebarSessions 2026-04-28-05:18
   * Settings selects the default trailing mode. Agent Icon mode must
   * not fall back to showing Last Active for iconless sessions; keep the default
   * slot blank and reveal the timestamp only on hover.
   *
   * CDXC:Sidebar-overflow-menu 2026-05-04-03:54
   * Agent Icon/Last Active is a settings preference, not an overflow-menu
   * shortcut, because it changes the default display behavior for all cards.
   */
  const defaultTrailingDisplay = !showLastInteractionTime
    ? "icon"
    : lastInteractionLabel
      ? "time"
      : "icon";
  const shouldKeepLoadingIconVisible = showHeaderLoadingSpinner && hasHeaderAgentIcon;
  const hoverTrailingDisplay = shouldKeepLoadingIconVisible
    ? "icon"
    : defaultTrailingDisplay === "icon"
      ? lastInteractionLabel
        ? "time"
        : "icon"
      : hasHeaderAgentIcon
        ? "icon"
        : "time";
  const hasSessionHeadTrailing = Boolean(lastInteractionLabel) || hasHeaderAgentIcon;

  return (
    <>
      <div className="session-head">
        <div className="session-alias-heading" ref={aliasHeadingRef}>
          {headingText}
        </div>
        {hasSessionHeadTrailing ? (
          <div
            className="session-head-trailing"
            data-default-trailing-display={defaultTrailingDisplay}
            data-hover-trailing-display={hoverTrailingDisplay}
          >
            {lastInteractionLabel ? (
              <div className="session-last-interaction-time" style={lastInteractionStyle}>
                {lastInteractionLabel}
              </div>
            ) : null}
            {hasHeaderAgentIcon ? (
              <SessionHeaderAgentIcon
                agentIcon={session.agentIcon}
                faviconDataUrl={session.faviconDataUrl}
                isFavorite={session.isFavorite}
                isGeneratingFirstPromptTitle={session.isGeneratingFirstPromptTitle}
                isReloading={session.isReloading}
              />
            ) : null}
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
      {isGeneratingFirstPromptTitle ? (
        <div className="session-title-generation-overlay" role="status">
          <IconLoader2
            aria-hidden="true"
            className="session-title-generation-overlay-icon"
            size={13}
          />
          <span>Generating title</span>
        </div>
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
    | "kind"
    | "isPrimaryTitleTerminalTitle"
    | "primaryTitle"
    | "sessionKind"
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
    agentIcon: session.agentIcon,
    includeUnsyncedTitleLabel: false,
    kind: session.kind,
    isPrimaryTitleTerminalTitle: session.isPrimaryTitleTerminalTitle,
    primaryTitle: session.primaryTitle,
    sessionKind: session.sessionKind,
    terminalTitle: session.terminalTitle,
    alias: session.alias,
  });
  const tooltipHeadingText = formatSessionHeadingText({
    agentIcon: session.agentIcon,
    includeUnsyncedTitleLabel: true,
    kind: session.kind,
    isPrimaryTitleTerminalTitle: session.isPrimaryTitleTerminalTitle,
    primaryTitle: session.primaryTitle,
    sessionKind: session.sessionKind,
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
  agentIcon,
  alias,
  includeUnsyncedTitleLabel = false,
  kind,
  isPrimaryTitleTerminalTitle,
  primaryTitle,
  sessionKind,
  terminalTitle,
}: Pick<
  SidebarSessionItem,
  | "agentIcon"
  | "alias"
  | "kind"
  | "isPrimaryTitleTerminalTitle"
  | "primaryTitle"
  | "sessionKind"
  | "terminalTitle"
> & {
  includeUnsyncedTitleLabel?: boolean;
}): string {
  const normalizedPrimaryTitle = primaryTitle?.trim();
  const normalizedTerminalTitle = terminalTitle?.trim();
  const baseHeadingText = normalizedPrimaryTitle || alias;
  const isBrowserSession = kind === "browser" || sessionKind === "browser";
  if (
    isBrowserSession ||
    agentIcon === "t3" ||
    isPrimaryTitleTerminalTitle ||
    !normalizedPrimaryTitle ||
    normalizedPrimaryTitle === normalizedTerminalTitle
  ) {
    return baseHeadingText;
  }

  return includeUnsyncedTitleLabel
    ? `${TERMINAL_TITLE_MARKER} ${baseHeadingText} ${UNSYNCED_TITLE_LABEL}`
    : `${TERMINAL_TITLE_MARKER} ${baseHeadingText}`;
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
  faviconDataUrl?: string;
  isFavorite?: boolean;
  isGeneratingFirstPromptTitle?: boolean;
  isReloading?: boolean;
};

type SessionAgentLogoStyle = CSSProperties & {
  "--session-agent-logo": string;
};

type SessionAgentIconDecorationProps = SessionAgentIconProps & {
  className: string;
  loadingClassName: string;
  tablerClassName: string;
};

function SessionAgentIconDecoration({
  agentIcon,
  className,
  faviconDataUrl,
  isFavorite = false,
  isGeneratingFirstPromptTitle = false,
  isReloading = false,
  loadingClassName,
  tablerClassName,
}: SessionAgentIconDecorationProps) {
  if (isReloading || isGeneratingFirstPromptTitle) {
    return <IconLoader2 aria-hidden="true" className={loadingClassName} size={14} stroke={1.8} />;
  }

  const favoriteState = String(isFavorite);
  if (agentIcon === "browser") {
    if (faviconDataUrl) {
      /**
       * CDXC:BrowserPanes 2026-05-03-11:28
       * Browser-pane cards identify the loaded tab with the page favicon when
       * available. Keep the Tabler browser glyph as the fallback so cards still
       * have a stable browser affordance before favicon discovery or for pages
       * without icons.
       */
      return (
        <img
          alt=""
          aria-hidden="true"
          className={tablerClassName}
          data-agent-icon="browser"
          data-favorite={favoriteState}
          data-icon-variant="favicon"
          src={faviconDataUrl}
        />
      );
    }
    return (
      <IconBrowser
        aria-hidden="true"
        className={tablerClassName}
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
      className={className}
      data-agent-icon={agentIcon}
      data-favorite={favoriteState}
      style={agentLogoStyle}
    />
  );
}

export function SessionFloatingAgentIcon({
  agentIcon,
  faviconDataUrl,
  isFavorite = false,
}: SessionAgentIconProps) {
  return (
    <SessionAgentIconDecoration
      agentIcon={agentIcon}
      className="session-floating-agent-icon"
      faviconDataUrl={faviconDataUrl}
      isFavorite={isFavorite}
      loadingClassName="session-floating-reloading-icon"
      tablerClassName="session-floating-agent-tabler-icon"
    />
  );
}

function SessionHeaderAgentIcon({
  agentIcon,
  faviconDataUrl,
  isFavorite = false,
  isGeneratingFirstPromptTitle = false,
  isReloading = false,
}: SessionAgentIconProps) {
  return (
    <SessionAgentIconDecoration
      agentIcon={agentIcon}
      className="session-header-agent-icon"
      faviconDataUrl={faviconDataUrl}
      isFavorite={isFavorite}
      isGeneratingFirstPromptTitle={isGeneratingFirstPromptTitle}
      isReloading={isReloading}
      loadingClassName="session-header-reloading-icon"
      tablerClassName="session-header-agent-tabler-icon"
    />
  );
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
    .filter((label): label is string => typeof label === "string")
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
