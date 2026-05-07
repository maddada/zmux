import { IconLoader2, IconTerminal2, IconWorld } from "@tabler/icons-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "./app-tooltip";
import {
  DEFAULT_TERMINAL_SESSION_TITLE,
  type SidebarSessionItem,
} from "../shared/session-grid-contract";
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
const GHOST_PLACEHOLDER_TITLE_PATTERN = /^👻(?:\s+Terminal Session)?$/u;

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
  const showTerminalSessionIcon = shouldShowTerminalSessionIcon(session);
  const hasHeaderAgentIcon =
    Boolean(session.agentIcon) || showTerminalSessionIcon || showHeaderLoadingSpinner;
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
   * Settings selects the default trailing mode. Agent Icon mode must keep
   * the icon slot as the default display and reveal Last Active only on hover.
   *
   * CDXC:SidebarSessions 2026-05-07-14:57
   * Agentless terminal sessions use the terminal glyph as the default icon
   * slot, so new plain terminals have visible card identity before detection
   * assigns a real agent icon.
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
                sessionPersistenceName={session.sessionPersistenceName}
                sessionPersistenceProvider={session.sessionPersistenceProvider}
                showTerminalIcon={showTerminalSessionIcon}
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
    | "sessionPersistenceName"
    | "sessionPersistenceProvider"
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
  const tooltipMetadata = [
    getSessionTooltipSecondaryText(session),
    getSessionPersistenceTooltipText(session),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");
  const debugSessionNumberTooltip =
    showDebugSessionNumbers && session.sessionNumber !== undefined
      ? `Session number: ${session.sessionNumber}`
      : undefined;
  const titleTooltip = buildSessionTitleTooltip({
    debugSessionNumberTooltip,
    headingText: tooltipHeadingText,
    secondaryText: tooltipMetadata,
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
  const primaryHeadingTitle = normalizeSessionCardHeadingTitle(primaryTitle);
  const terminalHeadingTitle = normalizeSessionCardHeadingTitle(terminalTitle);
  const aliasHeadingTitle = normalizeSessionCardHeadingTitle(alias);
  const normalizedPrimaryTitle = primaryHeadingTitle.text;
  const normalizedTerminalTitle = terminalHeadingTitle.text;
  const baseHeadingTitle = normalizedPrimaryTitle ? primaryHeadingTitle : aliasHeadingTitle;
  const baseHeadingText = baseHeadingTitle.text || alias;
  const isBrowserSession = kind === "browser" || sessionKind === "browser";
  if (baseHeadingTitle.isGhostPlaceholder) {
    return formatNonPersistentSessionHeadingText(baseHeadingText, includeUnsyncedTitleLabel);
  }

  if (
    isBrowserSession ||
    agentIcon === "t3" ||
    isPrimaryTitleTerminalTitle ||
    !normalizedPrimaryTitle ||
    normalizedPrimaryTitle === normalizedTerminalTitle
  ) {
    return baseHeadingText;
  }

  return formatNonPersistentSessionHeadingText(baseHeadingText, includeUnsyncedTitleLabel);
}

function formatNonPersistentSessionHeadingText(
  headingText: string,
  includeUnsyncedTitleLabel: boolean,
): string {
  return includeUnsyncedTitleLabel
    ? `${TERMINAL_TITLE_MARKER} ${headingText} ${UNSYNCED_TITLE_LABEL}`
    : `${TERMINAL_TITLE_MARKER} ${headingText}`;
}

function normalizeSessionCardHeadingTitle(title: string | undefined): {
  isGhostPlaceholder: boolean;
  text?: string;
} {
  const normalizedTitle = title?.trim().replace(/\s+/g, " ");
  if (!normalizedTitle) {
    return { isGhostPlaceholder: false };
  }

  /**
   * CDXC:SidebarSessions 2026-05-07-14:48
   * Ghost placeholder titles are UI-only session defaults, not meaningful
   * terminal titles. Sidebar cards must render them with the existing
   * non-persistent title marker as `∗ Terminal Session` instead of exposing
   * the ghost emoji as the card title.
   */
  if (GHOST_PLACEHOLDER_TITLE_PATTERN.test(normalizedTitle)) {
    return {
      isGhostPlaceholder: true,
      text: DEFAULT_TERMINAL_SESSION_TITLE,
    };
  }

  return {
    isGhostPlaceholder: false,
    text: normalizedTitle,
  };
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
  /**
   * CDXC:Tooltips 2026-05-07-18:16
   * Session title tooltips can wrap inside the narrow sidebar, so separate each
   * logical metadata row with a blank line. Splitting metadata blocks first keeps
   * authored line breaks visible while making row boundaries readable after
   * wrapping.
   */
  const uniqueLines = [headingText, secondaryText, debugSessionNumberTooltip].reduce<string[]>(
    (lines, block) => {
      const normalizedBlockLines =
        block
          ?.split(/\r?\n/u)
          .map((line) => line.trim())
          .filter(Boolean) ?? [];

      return normalizedBlockLines.reduce<string[]>((nextLines, normalizedLine) => {
        if (nextLines.includes(normalizedLine)) {
          return nextLines;
        }

        return [...nextLines, normalizedLine];
      }, lines);
    },
    [],
  );

  return uniqueLines.join("\n\n");
}

export function getSessionTooltipSecondaryText(
  session: Pick<SidebarSessionItem, "activityLabel" | "agentIcon" | "detail" | "terminalTitle">,
): string | undefined {
  const detail = stripAgentTooltipText(session.detail, session.agentIcon);
  if (detail) {
    return detail;
  }

  const terminalHeadingTitle = normalizeSessionCardHeadingTitle(session.terminalTitle);
  const terminalTitle = terminalHeadingTitle.isGhostPlaceholder
    ? undefined
    : stripAgentTooltipText(terminalHeadingTitle.text, session.agentIcon);
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
  sessionPersistenceName?: string;
  sessionPersistenceProvider?: SidebarSessionItem["sessionPersistenceProvider"];
  showTerminalIcon?: boolean;
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
  showTerminalIcon = false,
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
       * available. Keep a Tabler world glyph as the fallback so cards still
       * have a stable browser affordance before favicon discovery or for pages
       * without icons.
       *
       * CDXC:SidebarBrowserIcon 2026-05-07-19:44
       * Browser affordances in the sidebar use the Tabler world glyph so
       * browser sessions share the same globe cue as browser groups.
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
      <IconWorld
        aria-hidden="true"
        className={tablerClassName}
        data-agent-icon="browser"
        data-favorite={favoriteState}
        size={14}
        stroke={1.8}
      />
    );
  }

  if (showTerminalIcon && !agentIcon) {
    /**
     * CDXC:SidebarSessions 2026-05-07-14:57
     * Plain terminal sessions still need a visible card identity before an
     * agent is detected. Render the Tabler terminal glyph as a white
     * non-agent icon instead of leaving the Agent Icon slot blank.
     */
    return (
      <IconTerminal2
        aria-hidden="true"
        className={tablerClassName}
        data-agent-icon="terminal"
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
  sessionPersistenceName,
  sessionPersistenceProvider,
  showTerminalIcon = false,
}: SessionAgentIconProps) {
  return (
    <>
      <SessionAgentIconDecoration
        agentIcon={agentIcon}
        className="session-floating-agent-icon"
        faviconDataUrl={faviconDataUrl}
        isFavorite={isFavorite}
        loadingClassName="session-floating-reloading-icon"
        showTerminalIcon={showTerminalIcon}
        tablerClassName="session-floating-agent-tabler-icon"
      />
      <SessionPersistenceProviderBadge
        sessionPersistenceName={sessionPersistenceName}
        sessionPersistenceProvider={sessionPersistenceProvider}
        slot="floating"
      />
    </>
  );
}

function SessionHeaderAgentIcon({
  agentIcon,
  faviconDataUrl,
  isFavorite = false,
  isGeneratingFirstPromptTitle = false,
  isReloading = false,
  sessionPersistenceName,
  sessionPersistenceProvider,
  showTerminalIcon = false,
}: SessionAgentIconProps) {
  return (
    <>
      <SessionAgentIconDecoration
        agentIcon={agentIcon}
        className="session-header-agent-icon"
        faviconDataUrl={faviconDataUrl}
        isFavorite={isFavorite}
        isGeneratingFirstPromptTitle={isGeneratingFirstPromptTitle}
        isReloading={isReloading}
        loadingClassName="session-header-reloading-icon"
        showTerminalIcon={showTerminalIcon}
        tablerClassName="session-header-agent-tabler-icon"
      />
      <SessionPersistenceProviderBadge
        sessionPersistenceName={sessionPersistenceName}
        sessionPersistenceProvider={sessionPersistenceProvider}
        slot="header"
      />
    </>
  );
}

function SessionPersistenceProviderBadge({
  sessionPersistenceName,
  sessionPersistenceProvider,
  slot,
}: {
  sessionPersistenceName?: string;
  sessionPersistenceProvider?: SidebarSessionItem["sessionPersistenceProvider"];
  slot: "floating" | "header";
}) {
  const label = getSessionPersistenceProviderBadgeLabel(sessionPersistenceProvider);
  if (!label) {
    return null;
  }
  /**
   * CDXC:SessionPersistence 2026-05-07-20:32
   * Provider-backed cards show a tiny low-opacity provider letter centered on
   * the existing agent icon. The badge stays subtle while the tooltip and
   * context menu expose the exact tmux/zmx/zellij attach identity.
   *
   * CDXC:SessionPersistence 2026-05-07-21:00
   * The visible badge is keyed by provider, not by native-confirmed session
   * name, so a newly mounted provider-backed card shows its t/z/j identity
   * immediately while attach copying still waits for the durable name.
   */
  return (
    <span
      aria-hidden="true"
      className="session-persistence-provider-badge"
      data-provider={sessionPersistenceProvider}
      data-slot={slot}
    >
      {label}
    </span>
  );
}

function getSessionPersistenceProviderBadgeLabel(
  provider: SidebarSessionItem["sessionPersistenceProvider"],
): string | undefined {
  switch (provider) {
    case "tmux":
      return "t";
    case "zmx":
      return "z";
    case "zellij":
      return "j";
    default:
      return undefined;
  }
}

function getSessionPersistenceTooltipText(
  session: Pick<SidebarSessionItem, "sessionPersistenceName" | "sessionPersistenceProvider">,
): string | undefined {
  if (!session.sessionPersistenceName || !session.sessionPersistenceProvider) {
    return undefined;
  }
  return `${session.sessionPersistenceProvider} session: ${session.sessionPersistenceName}`;
}

export function shouldShowTerminalSessionIcon(
  session: Pick<SidebarSessionItem, "agentIcon" | "sessionKind">,
): boolean {
  return (
    !session.agentIcon && (session.sessionKind === undefined || session.sessionKind === "terminal")
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
    <Tooltip onOpenChange={(open) => !open && closeTooltip()} open={isOpen}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent sideOffset={8}>{tooltip ?? text}</TooltipContent>
    </Tooltip>
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
