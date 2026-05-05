import { Tooltip } from "@base-ui/react/tooltip";
import { KeyboardSensor, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, type DragDropEventHandlers } from "@dnd-kit/react";
import {
  IconBell,
  IconBellOff,
  IconArrowsSort,
  IconBookmark,
  IconBrowser,
  IconCaretRightFilled,
  IconChevronDown,
  IconChevronRight,
  IconDeviceMobile,
  IconEye,
  IconFolder,
  IconHelpCircle,
  IconHistory,
  IconKeyboard,
  IconLayoutSidebar,
  IconPencil,
  IconPlusFilled,
  IconSearch,
  IconSettings,
  IconTerminal2,
} from "@tabler/icons-react";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import {
  MAX_GROUP_COUNT,
  type ExtensionToSidebarMessage,
  type SidebarCollapsibleSection,
} from "../shared/session-grid-contract";
import {
  getWorkspaceThemeForeground,
  normalizeWorkspaceThemeColor,
} from "../shared/workspace-dock-icons";
import type { SidebarActionType } from "../shared/sidebar-commands";
import { playCompletionSound, prepareCompletionSoundPlayback } from "./completion-sound-player";
import { AgentsPanel } from "./agents-panel";
import { CommandsPanel } from "./commands-panel";
import { GitCommitModal } from "./git-commit-modal";
import { SidebarProjectHeader } from "./project-header";
import {
  SidebarPreviousSessionsSearchGroup,
  SidebarSessionSearchField,
} from "./sidebar-session-search-overlay";
import {
  createSidebarSessionSearchResults,
  createSidebarSessionSearchSelection,
  getNextSidebarSessionSearchSelection,
  isSidebarSessionSearchSelectionMatch,
  type SidebarSessionSearchSelection,
} from "./sidebar-session-search";
import { logSidebarDebug } from "./sidebar-debug";
import { postSidebarOrderReproLog } from "./sidebar-order-repro-log";
import { scrollElementIntoViewIfNeeded } from "./scroll-into-view-if-needed";
import { resetSidebarStore, useSidebarStore } from "./sidebar-store";
import {
  getClientPoint,
  getSidebarDropData,
  getSidebarSessionDropTarget,
  type SidebarSessionDropTarget,
  getSidebarSessionDropTargetFromEvent,
  getSidebarSessionDropTargetAtPoint,
  moveSessionIdsByDropTarget,
} from "./sidebar-dnd";
import {
  expandCollapsedGroupsById,
  getSessionCountsByGroup,
  reconcileCollapsedGroupsById,
} from "./browser-group-collapse";
import { SessionGroupSection } from "./session-group-section";
import {
  applyTextEditingKey,
  isEditableKeyboardTarget,
  isTextEditingKey,
} from "./text-input-keyboard";
import { TOOLTIP_DELAY_MS } from "./tooltip-delay";
import { useScrollGlowState } from "./use-scroll-glow-state";
import type { WebviewApi } from "./webview-api";
import { createDisplaySessionLayout } from "../shared/active-sessions-sort";
import { filterPreviousSessions, filterSidebarSessionItems } from "./previous-session-search";
import { filterRecentProjects } from "./recent-project-search";
import { isEmptySidebarDoubleClick } from "./empty-sidebar-double-click";
import { closeAppModal, openAppModal } from "./app-modal-host-bridge";

export type SidebarAppProps = {
  messageSource?: Pick<Window, "addEventListener" | "removeEventListener">;
  vscode: WebviewApi;
};

type SessionIdsByGroup = Record<string, string[]>;
type FloatingMenuPosition = {
  right: number;
  top: number;
};

type SidebarPointerDownSessionTarget = {
  groupId: string;
  point: {
    x: number;
    y: number;
  };
  sessionId: string;
};

type SidebarSessionPointerDragState = {
  didMove: boolean;
  startPoint?: {
    x: number;
    y: number;
  };
};

const sensors = [
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === "touch") {
        return [new PointerActivationConstraints.Delay({ tolerance: 5, value: 250 })];
      }

      return [new PointerActivationConstraints.Distance({ value: 6 })];
    },
  }),
  KeyboardSensor,
];

const SIDEBAR_STARTUP_INTERACTION_BLOCK_MS = 1500;
const SIDEBAR_STARTUP_REPRO_WINDOW_MS = 15_000;
const SIDEBAR_POINTER_DRAG_REORDER_THRESHOLD_PX = 8;
const SIDEBAR_SECTION_COLLAPSE_PERSIST_DEBOUNCE_MS = 200;
const BROWSER_AUTO_COLLAPSE_SUPPRESSION_MS = 1_200;
const MIN_SESSION_SEARCH_QUERY_LENGTH = 2;
const COMPLETION_FLASH_DURATION_MS = 3_000;
const DEBUG_BUILD_STAMP_STYLE: CSSProperties = {
  position: "fixed",
  right: "10px",
  bottom: "8px",
  zIndex: 20,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "var(--vscode-foreground)",
  fontFamily: "var(--vscode-font-family)",
  fontSize: "10px",
  lineHeight: 1.2,
  fontVariantNumeric: "tabular-nums",
  opacity: 0.72,
};

export function SidebarApp({ messageSource = window, vscode }: SidebarAppProps) {
  const [isStartupInteractionBlocked, setIsStartupInteractionBlocked] = useState(true);
  const [autoEditingGroupId, setAutoEditingGroupId] = useState<string>();
  const [agentCreateRequestId, setAgentCreateRequestId] = useState(0);
  const [commandCreateActionType, setCommandCreateActionType] = useState<SidebarActionType>();
  const [commandCreateRequestId, setCommandCreateRequestId] = useState(0);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isDaemonSessionsOpen, setIsDaemonSessionsOpen] = useState(false);
  const [isPinnedPromptsOpen, setIsPinnedPromptsOpen] = useState(false);
  const [isPreviousSessionsOpen, setIsPreviousSessionsOpen] = useState(false);
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState(false);
  const [isScratchPadOpen, setIsScratchPadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionSearchOpen, setIsSessionSearchOpen] = useState(false);
  const [completionFlashNonceBySessionId, setCompletionFlashNonceBySessionId] = useState<
    Record<string, number>
  >({});
  const [collapsedGroupsById, setCollapsedGroupsById] = useState<Record<string, true>>({});
  const [recentProjectsQuery, setRecentProjectsQuery] = useState("");
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [sessionDropIndicatorGroupId, setSessionDropIndicatorGroupId] = useState<string>();
  const [overflowMenuAnchor, setOverflowMenuAnchor] = useState<HTMLElement>();
  const [overflowMenuPosition, setOverflowMenuPosition] = useState<FloatingMenuPosition>();
  const [isSessionSearchSelectionVisible, setIsSessionSearchSelectionVisible] = useState(false);
  const [selectedSessionSearchResult, setSelectedSessionSearchResult] =
    useState<SidebarSessionSearchSelection>();
  const pendingCreateGroupRef = useRef(false);
  const didResetStoreRef = useRef(false);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const sessionGroupsPanelRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const groupIdsRef = useRef<string[]>([]);
  const sessionIdsByGroupRef = useRef<SessionIdsByGroup>({});
  const previousAutoCollapseSessionCountsByGroupRef = useRef<Record<string, number>>({});
  const browserAutoCollapseSuppressedUntilRef = useRef(0);
  const previousNormalizedSessionSearchQueryRef = useRef("");
  const pointerDownSessionTargetRef = useRef<SidebarPointerDownSessionTarget | undefined>(
    undefined,
  );
  const sessionPointerDragStateRef = useRef<SidebarSessionPointerDragState | undefined>(undefined);
  const completionFlashTimeoutBySessionIdRef = useRef<Map<string, number>>(new Map());
  const sectionCollapsePersistTimeoutsRef = useRef<
    Partial<Record<SidebarCollapsibleSection, number>>
  >({});
  const sessionGroupsContentRef = useRef<HTMLDivElement>(null);
  const sidebarStartupStartedAtRef = useRef(getSidebarStartupNow());
  const hasAppliedHydrateRef = useRef(false);
  const firstHydrateRevisionRef = useRef<number | undefined>(undefined);
  const lastSidebarStartupRenderStateKeyRef = useRef<string | undefined>(undefined);

  if (!didResetStoreRef.current) {
    resetSidebarStore();
    didResetStoreRef.current = true;
  }

  const applyLocalFocus = useSidebarStore((state) => state.applyLocalFocus);
  const applyCommandRunStateClearedMessage = useSidebarStore(
    (state) => state.applyCommandRunStateClearedMessage,
  );
  const applyCommandRunStateMessage = useSidebarStore((state) => state.applyCommandRunStateMessage);
  const applyOrderSyncResultMessage = useSidebarStore((state) => state.applyOrderSyncResultMessage);
  const applySessionPresentationMessage = useSidebarStore(
    (state) => state.applySessionPresentationMessage,
  );
  const applySidebarMessage = useSidebarStore((state) => state.applySidebarMessage);
  const setDaemonSessionsState = useSidebarStore((state) => state.setDaemonSessionsState);
  const setGitCommitDraft = useSidebarStore((state) => state.setGitCommitDraft);
  const setSectionCollapsed = useSidebarStore((state) => state.setSectionCollapsed);
  const {
    activeSessionsSortMode,
    agentManagerZoomPercent,
    browserGroupIds,
    collapsedSections,
    completionBellEnabled,
    createSessionOnSidebarDoubleClick,
    customThemeColor,
    debuggingMode,
    groupOrder,
    previousSessions,
    recentProjects,
    sectionVisibility,
    settings,
    projectHeader,
    revision,
    showHotkeysOnSessionCards,
    showLastInteractionTimeOnSessionCards,
    sessionsById,
    theme,
    workspaceGroupIds,
  } = useSidebarStore(
    useShallow((state) => ({
      activeSessionsSortMode: state.hud.activeSessionsSortMode,
      agentManagerZoomPercent: state.hud.agentManagerZoomPercent,
      browserGroupIds: state.browserGroupIds,
      collapsedSections: state.hud.collapsedSections,
      completionBellEnabled: state.hud.completionBellEnabled,
      createSessionOnSidebarDoubleClick: state.hud.createSessionOnSidebarDoubleClick,
      customThemeColor: state.hud.customThemeColor,
      debuggingMode: state.hud.debuggingMode,
      groupOrder: state.groupOrder,
      previousSessions: state.previousSessions,
      recentProjects: state.hud.recentProjects,
      projectHeader: state.hud.projectHeader,
      revision: state.revision,
      sectionVisibility: state.hud.sectionVisibility,
      settings: state.hud.settings,
      showHotkeysOnSessionCards: state.hud.showHotkeysOnSessionCards,
      showLastInteractionTimeOnSessionCards: state.hud.showLastInteractionTimeOnSessionCards,
      sessionsById: state.sessionsById,
      theme: state.hud.theme,
      workspaceGroupIds: state.workspaceGroupIds,
    })),
  );
  const gitCommitDraft = useSidebarStore((state) => state.gitCommitDraft);
  const authoritativeSessionIdsByGroup = useSidebarStore((state) => state.sessionIdsByGroup);
  const buildStamp = useSidebarStore((state) =>
    state.hud.debuggingMode ? state.hud.buildStamp : undefined,
  );

  const postSidebarDebugLog = useEffectEvent((event: string, details: unknown) => {
    if (!debuggingMode) {
      return;
    }

    logSidebarDebug(debuggingMode, event, details);
    vscode.postMessage({
      details,
      event,
      type: "sidebarDebugLog",
    });
  });

  const postSidebarStartupReproLog = useEffectEvent((event: string, details: unknown) => {
    if (
      getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current) >
      SIDEBAR_STARTUP_REPRO_WINDOW_MS
    ) {
      return;
    }

    vscode.postMessage({
      details,
      event: `repro.sidebarStartup.${event}`,
      type: "sidebarDebugLog",
    });
  });

  /**
   * CDXC:SidebarMode 2026-05-03-10:42
   * Combined mode is only active when the host sends persisted settings. That
   * keeps legacy sidebar hydration on the existing Separated behavior while
   * the native app can default new installs to Combined.
   */
  const isCombinedSidebarMode = settings?.sidebarMode === "combined";

  useLayoutEffect(() => {
    const autoCollapseGroupIds = isCombinedSidebarMode
      ? [...browserGroupIds, ...workspaceGroupIds]
      : browserGroupIds;
    const nextAutoCollapseSessionCountsByGroup = getSessionCountsByGroup({
      groupIds: autoCollapseGroupIds,
      sessionIdsByGroup: authoritativeSessionIdsByGroup,
    });
    const collapseBlockedBrowserGroupIds =
      getSidebarStartupNow() < browserAutoCollapseSuppressedUntilRef.current ? browserGroupIds : [];

    setCollapsedGroupsById((previous) =>
      reconcileCollapsedGroupsById({
        autoCollapseGroupIds,
        browserGroupIds,
        collapseBlockedGroupIds: collapseBlockedBrowserGroupIds,
        groupIds: groupOrder,
        previousBrowserSessionCountsByGroup: previousAutoCollapseSessionCountsByGroupRef.current,
        previousCollapsedGroupsById: previous,
        sessionIdsByGroup: authoritativeSessionIdsByGroup,
      }),
    );
    previousAutoCollapseSessionCountsByGroupRef.current = nextAutoCollapseSessionCountsByGroup;
  }, [
    authoritativeSessionIdsByGroup,
    browserGroupIds,
    groupOrder,
    isCombinedSidebarMode,
    workspaceGroupIds,
  ]);

  const isSidebarInteractionBlocked = isStartupInteractionBlocked;

  const expandGroups = (groupIds: readonly string[]) => {
    setCollapsedGroupsById((previous) =>
      expandCollapsedGroupsById({
        groupIds,
        previousCollapsedGroupsById: previous,
      }),
    );
  };

  const prepareBrowserGroupsForOpen = (groupIds: readonly string[]) => {
    browserAutoCollapseSuppressedUntilRef.current =
      getSidebarStartupNow() + BROWSER_AUTO_COLLAPSE_SUPPRESSION_MS;
    expandGroups(groupIds);
  };

  const setGroupCollapsed = (groupId: string, collapsed: boolean) => {
    setCollapsedGroupsById((previous) => {
      if (collapsed) {
        if (previous[groupId]) {
          return previous;
        }

        return {
          ...previous,
          [groupId]: true,
        };
      }

      if (!previous[groupId]) {
        return previous;
      }

      const next = { ...previous };
      delete next[groupId];
      return next;
    });
  };

  const requestNewSession = () => {
    if (isSidebarInteractionBlocked) {
      return;
    }

    vscode.postMessage({ type: "createSession" });
  };

  const handleSidebarDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!createSessionOnSidebarDoubleClick) {
      return;
    }

    if (!isEmptySidebarDoubleClick(event)) {
      return;
    }

    event.preventDefault();
    requestNewSession();
  };

  const handleWindowMessage = useEffectEvent((event: MessageEvent<ExtensionToSidebarMessage>) => {
    if (!event.data) {
      return;
    }

    if (event.data.type === "playCompletionSound") {
      const sessionId = event.data.sessionId;
      postSidebarDebugLog("completionSound.messageReceived", {
        sound: event.data.sound,
        sessionId,
      });
      if (sessionId) {
        const existingTimeout = completionFlashTimeoutBySessionIdRef.current.get(sessionId);
        if (existingTimeout !== undefined) {
          window.clearTimeout(existingTimeout);
        }
        setCompletionFlashNonceBySessionId((previous) => ({
          ...previous,
          [sessionId]: (previous[sessionId] ?? 0) + 1,
        }));
        const timeout = window.setTimeout(() => {
          completionFlashTimeoutBySessionIdRef.current.delete(sessionId);
          setCompletionFlashNonceBySessionId((previous) => {
            if (!(sessionId in previous)) {
              return previous;
            }

            const next = { ...previous };
            delete next[sessionId];
            return next;
          });
        }, COMPLETION_FLASH_DURATION_MS);
        completionFlashTimeoutBySessionIdRef.current.set(sessionId, timeout);
      }
      void playCompletionSound(event.data.sound, (soundEvent, details) => {
        postSidebarDebugLog(soundEvent, details);
      });
      return;
    }

    if (event.data.type === "sessionPresentationChanged") {
      applySessionPresentationMessage(event.data);
      return;
    }

    if (event.data.type === "sidebarCommandRunStateChanged") {
      applyCommandRunStateMessage(event.data);
      return;
    }

    if (event.data.type === "sidebarCommandRunStateCleared") {
      applyCommandRunStateClearedMessage(event.data);
      return;
    }

    if (event.data.type === "sidebarOrderSyncResult") {
      postSidebarOrderReproLog(vscode, "repro.sidebarOrder.webview.syncResultReceived", {
        itemIds: event.data.itemIds,
        kind: event.data.kind,
        requestId: event.data.requestId,
        status: event.data.status,
      });
      applyOrderSyncResultMessage(event.data);
      return;
    }

    if (event.data.type === "daemonSessionsState") {
      setDaemonSessionsState(event.data);
      return;
    }

    if (event.data.type === "promptGitCommit") {
      setGitCommitDraft(event.data);
      return;
    }

    if (event.data.type === "showT3BrowserAccess") {
      /**
       * CDXC:T3RemoteAccess 2026-05-02-00:57
       * Remote Access is launched from sidebar session actions, but the QR
       * modal must render in the app-level host so it is centered over the
       * whole workspace instead of being constrained to the sidebar.
       */
      openAppModal({
        access: event.data,
        modal: "t3BrowserAccess",
        type: "open",
      });
      return;
    }

    if (event.data.type === "showSessionRenameModal") {
      openAppModal({
        initialTitle: event.data.initialTitle,
        modal: "renameSession",
        sessionId: event.data.sessionId,
        type: "open",
      });
      return;
    }

    if (event.data.type === "showFindPreviousSessionModal") {
      openAppModal({
        initialQuery: event.data.initialQuery,
        modal: "findPreviousSession",
        type: "open",
      });
      return;
    }

    if (event.data.type === "showT3ThreadIdModal") {
      openAppModal({
        modal: "t3ThreadId",
        sessionId: event.data.sessionId,
        threadId: event.data.currentThreadId,
        type: "open",
      });
      return;
    }

    if (event.data.type !== "hydrate" && event.data.type !== "sessionState") {
      return;
    }

    postSidebarOrderReproLog(vscode, "repro.sidebarOrder.webview.messageReceived", {
      agentIds: event.data.hud.agents.map((agent) => agent.agentId),
      commandIds: event.data.hud.commands.map((command) => command.commandId),
      groupTitles: event.data.groups.map((group) => group.title),
      messageType: event.data.type,
      revision: event.data.revision,
    });
    postSidebarStartupReproLog("messageReceived", {
      elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
      groupCount: event.data.groups.length,
      hasHydrateBeforeMessage: hasAppliedHydrateRef.current,
      firstHydrateRevision: firstHydrateRevisionRef.current,
      messageType: event.data.type,
      previousRevision: revision,
      revision: event.data.revision,
      sessionCount: countSidebarSessions(event.data.groups),
      stale: event.data.revision < revision,
      startupInteractionBlocked: isStartupInteractionBlocked,
    });
    if (event.data.type === "sessionState" && !hasAppliedHydrateRef.current) {
      postSidebarStartupReproLog("sessionStateBeforeHydrate", {
        elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
        previousRevision: revision,
        revision: event.data.revision,
        sessionCount: countSidebarSessions(event.data.groups),
      });
    }
    /*
     * CDXC:AgentDetection 2026-04-27-07:29
     * Agent-icon debugging must verify the message boundary, not the CSS layer:
     * log whether native-projected agentIcon values reach the sidebar webview
     * and survive the Zustand store apply step.
     */
    postSidebarAgentIconBoundaryLog(vscode, "sidebar.agentIcon.messageReceived", {
      messageType: event.data.type,
      revision: event.data.revision,
      summary: summarizeSidebarAgentIconsFromGroups(event.data.groups),
    });

    if (pendingCreateGroupRef.current) {
      const nextGroupId = findCreatedGroupId(
        groupOrder,
        event.data.groups.map((group) => group.groupId),
      );
      if (nextGroupId) {
        setAutoEditingGroupId(nextGroupId);
        pendingCreateGroupRef.current = false;
      }
    }

    applySidebarMessage(event.data);
    postSidebarAgentIconBoundaryLog(vscode, "sidebar.agentIcon.messageApplied", {
      messageType: event.data.type,
      revision: event.data.revision,
      summary: summarizeSidebarAgentIconsFromStore(useSidebarStore.getState().sessionsById),
    });
    if (event.data.type === "hydrate" && !hasAppliedHydrateRef.current) {
      hasAppliedHydrateRef.current = true;
      firstHydrateRevisionRef.current = event.data.revision;
    }
    postSidebarStartupReproLog("messageApplied", {
      elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
      groupCount: event.data.groups.length,
      hasHydrateAfterApply: hasAppliedHydrateRef.current,
      firstHydrateRevision: firstHydrateRevisionRef.current,
      messageType: event.data.type,
      previousRevision: revision,
      revision: event.data.revision,
      sessionCount: countSidebarSessions(event.data.groups),
      stale: event.data.revision < revision,
      startupInteractionBlocked: isStartupInteractionBlocked,
    });
  });

  useEffect(() => {
    postSidebarStartupReproLog("appMounted", {
      elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
      startupInteractionBlockMs: SIDEBAR_STARTUP_INTERACTION_BLOCK_MS,
    });

    return () => {
      postSidebarStartupReproLog("appUnmounted", {
        elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
        finalRevision: useSidebarStore.getState().revision,
      });
    };
  }, [postSidebarStartupReproLog]);

  useEffect(() => {
    const renderState = {
      browserGroupCount: browserGroupIds.length,
      elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
      firstHydrateRevision: firstHydrateRevisionRef.current,
      groupCount: groupOrder.length,
      hasHydrate: hasAppliedHydrateRef.current,
      revision,
      sessionCount: Object.keys(sessionsById).length,
      startupInteractionBlocked: isStartupInteractionBlocked,
      workspaceGroupCount: workspaceGroupIds.length,
    };
    const renderStateKey = JSON.stringify(renderState);
    if (lastSidebarStartupRenderStateKeyRef.current === renderStateKey) {
      return;
    }

    lastSidebarStartupRenderStateKeyRef.current = renderStateKey;
    postSidebarStartupReproLog("renderState", renderState);
    if (hasAppliedHydrateRef.current && renderState.sessionCount === 0) {
      postSidebarStartupReproLog("emptyStateAfterHydrate", renderState);
    }
  }, [
    browserGroupIds,
    groupOrder,
    isStartupInteractionBlocked,
    postSidebarStartupReproLog,
    revision,
    sessionsById,
    workspaceGroupIds,
  ]);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      if (event instanceof MessageEvent) {
        handleWindowMessage(event);
      }
    };

    messageSource.addEventListener("message", handleMessage);

    return () => {
      messageSource.removeEventListener("message", handleMessage);
    };
  }, [handleWindowMessage, messageSource]);

  useEffect(() => {
    return () => {
      for (const timeout of completionFlashTimeoutBySessionIdRef.current.values()) {
        window.clearTimeout(timeout);
      }
      completionFlashTimeoutBySessionIdRef.current.clear();

      for (const timeoutId of Object.values(sectionCollapsePersistTimeoutsRef.current)) {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      }
      sectionCollapsePersistTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      postSidebarStartupReproLog("interactionBlockReleased", {
        elapsedMs: getSidebarStartupElapsedMs(sidebarStartupStartedAtRef.current),
        revision: useSidebarStore.getState().revision,
      });
      setIsStartupInteractionBlocked(false);
    }, SIDEBAR_STARTUP_INTERACTION_BLOCK_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.sidebarTheme = theme;
    const normalizedThemeColor = normalizeWorkspaceThemeColor(customThemeColor);
    if (normalizedThemeColor) {
      /**
       * CDXC:WorkspaceTheme 2026-05-05-02:58
       * Custom workspace colors are active-project sidebar theme overrides:
       * keep the preset data-sidebar-theme as fallback, but publish validated
       * CSS variables so the app-level theme surfaces derive from the color.
       */
      document.body.dataset.sidebarCustomTheme = "true";
      document.body.style.setProperty("--workspace-sidebar-theme-color", normalizedThemeColor);
      document.body.style.setProperty(
        "--workspace-sidebar-theme-foreground",
        getWorkspaceThemeForeground(normalizedThemeColor),
      );
    } else {
      delete document.body.dataset.sidebarCustomTheme;
      document.body.style.removeProperty("--workspace-sidebar-theme-color");
      document.body.style.removeProperty("--workspace-sidebar-theme-foreground");
    }

    return () => {
      delete document.body.dataset.sidebarTheme;
      delete document.body.dataset.sidebarCustomTheme;
      document.body.style.removeProperty("--workspace-sidebar-theme-color");
      document.body.style.removeProperty("--workspace-sidebar-theme-foreground");
    };
  }, [customThemeColor, theme]);

  useEffect(() => {
    document.body.style.setProperty("--zmux-agent-manager-zoom", `${agentManagerZoomPercent}%`);

    return () => {
      document.body.style.removeProperty("--zmux-agent-manager-zoom");
    };
  }, [agentManagerZoomPercent]);

  const closeGitCommitModal = useEffectEvent((requestId: string) => {
    setGitCommitDraft(undefined);
    vscode.postMessage({
      requestId,
      type: "cancelSidebarGitCommit",
    });
  });

  useEffect(() => {
    if (!sessionGroupsPanelRef.current) {
      return;
    }

    sessionGroupsPanelRef.current.inert = isSidebarInteractionBlocked;
  }, [isSidebarInteractionBlocked]);

  useEffect(() => {
    if (!isOverflowMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (overflowMenuRef.current?.contains(target)) {
        return;
      }

      if (target instanceof Element && target.closest('[data-sidebar-overflow-trigger="true"]')) {
        return;
      }

      setIsOverflowMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOverflowMenuOpen(false);
      }
    };

    const handleBlur = () => {
      setIsOverflowMenuOpen(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setIsOverflowMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isOverflowMenuOpen]);

  useEffect(() => {
    if (!isOverflowMenuOpen || !overflowMenuAnchor) {
      setOverflowMenuPosition(undefined);
      return;
    }

    const updateOverflowMenuPosition = () => {
      if (!overflowMenuAnchor.isConnected) {
        setIsOverflowMenuOpen(false);
        setOverflowMenuAnchor(undefined);
        return;
      }

      const triggerBounds = overflowMenuAnchor.getBoundingClientRect();
      if (!triggerBounds) {
        return;
      }

      /*
       * CDXC:Sidebar-overflow-menu 2026-05-04-07:47
       * The overflow menu's right edge must sit directly below the overflow
       * trigger's right edge. Fixed right positioning avoids transform/width
       * rounding drift and preserves the sidebar-width cap from CSS.
       */
      setOverflowMenuPosition({
        right: Math.max(0, window.innerWidth - triggerBounds.right),
        top: triggerBounds.bottom + 6,
      });
    };

    updateOverflowMenuPosition();
    window.addEventListener("resize", updateOverflowMenuPosition);
    window.addEventListener("scroll", updateOverflowMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateOverflowMenuPosition);
      window.removeEventListener("scroll", updateOverflowMenuPosition, true);
    };
  }, [isOverflowMenuOpen, overflowMenuAnchor]);

  const toggleOverflowMenu = (trigger: HTMLElement) => {
    setOverflowMenuAnchor(trigger);
    setIsOverflowMenuOpen((previous) => !previous);
  };

  const isManualActiveSessionsSort = activeSessionsSortMode === "manual";
  const visibleBrowserGroupIds =
    !isCombinedSidebarMode && sectionVisibility.browsers ? browserGroupIds : [];
  const shouldShowActionsPanel = !isCombinedSidebarMode && sectionVisibility.actions;
  /**
   * CDXC:SidebarMode 2026-05-04-07:00
   * Combined mode hides Actions but keeps the current-project header. The
   * Agents section remains governed by the normal sidebar setting so agent
   * sessions stay reachable while scanning all project groups.
   */
  const shouldShowAgentsPanel = sectionVisibility.agents;

  const { groupIds: effectiveGroupIds, sessionIdsByGroup: effectiveSessionIdsByGroup } = useMemo(
    () =>
      createDisplaySessionLayout({
        sessionIdsByGroup: createWorkspaceSessionIdsByGroup(
          workspaceGroupIds,
          authoritativeSessionIdsByGroup,
        ),
        sessionsById,
        sortMode: activeSessionsSortMode,
        workspaceGroupIds,
      }),
    [activeSessionsSortMode, authoritativeSessionIdsByGroup, sessionsById, workspaceGroupIds],
  );
  const normalizedSessionSearchQuery = sessionSearchQuery.trim();
  const isSessionSearchFiltering =
    isSessionSearchOpen && normalizedSessionSearchQuery.length >= MIN_SESSION_SEARCH_QUERY_LENGTH;
  const displayedBrowserSessionIdsByGroup = useMemo(
    () =>
      createDisplayedSessionIdsByGroup({
        groupIds: visibleBrowserGroupIds,
        query: normalizedSessionSearchQuery,
        sessionIdsByGroup: authoritativeSessionIdsByGroup,
        sessionsById,
        shouldFilter: isSessionSearchFiltering,
      }),
    [
      authoritativeSessionIdsByGroup,
      isSessionSearchFiltering,
      normalizedSessionSearchQuery,
      sessionsById,
      visibleBrowserGroupIds,
    ],
  );
  const displayedWorkspaceSessionIdsByGroup = useMemo(
    () =>
      createDisplayedSessionIdsByGroup({
        groupIds: effectiveGroupIds,
        query: normalizedSessionSearchQuery,
        sessionIdsByGroup: effectiveSessionIdsByGroup,
        sessionsById,
        shouldFilter: isSessionSearchFiltering,
      }),
    [
      effectiveGroupIds,
      effectiveSessionIdsByGroup,
      isSessionSearchFiltering,
      normalizedSessionSearchQuery,
      sessionsById,
    ],
  );
  const displayedBrowserGroupIds = useMemo(
    () =>
      createDisplayedGroupIds(
        visibleBrowserGroupIds,
        displayedBrowserSessionIdsByGroup,
        isSessionSearchFiltering,
      ),
    [displayedBrowserSessionIdsByGroup, isSessionSearchFiltering, visibleBrowserGroupIds],
  );
  const displayedWorkspaceGroupIds = useMemo(
    () =>
      createDisplayedGroupIds(
        effectiveGroupIds,
        displayedWorkspaceSessionIdsByGroup,
        isSessionSearchFiltering,
      ),
    [displayedWorkspaceSessionIdsByGroup, effectiveGroupIds, isSessionSearchFiltering],
  );
  const filteredPreviousSessions = useMemo(
    () =>
      !isSessionSearchFiltering
        ? []
        : filterPreviousSessions(previousSessions, normalizedSessionSearchQuery),
    [isSessionSearchFiltering, normalizedSessionSearchQuery, previousSessions],
  );
  const filteredRecentProjects = useMemo(
    () => filterRecentProjects(recentProjects, recentProjectsQuery),
    [recentProjects, recentProjectsQuery],
  );
  const focusedSessionId = useMemo(
    () => Object.values(sessionsById).find((session) => session.isFocused)?.sessionId,
    [sessionsById],
  );
  const shouldShowSessionSearchEmptyState =
    isSessionSearchFiltering &&
    displayedBrowserGroupIds.length === 0 &&
    displayedWorkspaceGroupIds.length === 0 &&
    filteredPreviousSessions.length === 0;
  const {
    hasOverflow: sessionGroupsHaveScrollableOverflow,
    showBottomGlow: showSessionGroupsBottomGlow,
    showTopGlow: showSessionGroupsTopGlow,
  } = useScrollGlowState(sessionGroupsContentRef);
  const sidebarSessionSearchResults = useMemo(
    () =>
      createSidebarSessionSearchResults({
        displayedBrowserGroupIds,
        displayedBrowserSessionIdsByGroup,
        displayedWorkspaceGroupIds,
        displayedWorkspaceSessionIdsByGroup,
        filteredPreviousSessions,
      }),
    [
      displayedBrowserGroupIds,
      displayedBrowserSessionIdsByGroup,
      displayedWorkspaceGroupIds,
      displayedWorkspaceSessionIdsByGroup,
      filteredPreviousSessions,
    ],
  );
  const dragStructureKey = useMemo(
    () => createDragStructureKey(displayedWorkspaceGroupIds, displayedWorkspaceSessionIdsByGroup),
    [displayedWorkspaceGroupIds, displayedWorkspaceSessionIdsByGroup],
  );

  useEffect(() => {
    groupIdsRef.current = displayedWorkspaceGroupIds;
  }, [displayedWorkspaceGroupIds]);

  useEffect(() => {
    sessionIdsByGroupRef.current = displayedWorkspaceSessionIdsByGroup;
  }, [displayedWorkspaceSessionIdsByGroup]);

  useEffect(() => {
    const queryChanged =
      previousNormalizedSessionSearchQueryRef.current !== normalizedSessionSearchQuery;
    previousNormalizedSessionSearchQueryRef.current = normalizedSessionSearchQuery;

    if (
      !isSessionSearchOpen ||
      normalizedSessionSearchQuery.length === 0 ||
      sidebarSessionSearchResults.length === 0 ||
      queryChanged
    ) {
      setIsSessionSearchSelectionVisible(false);
    }

    setSelectedSessionSearchResult((previous) => {
      if (!isSessionSearchOpen || normalizedSessionSearchQuery.length === 0) {
        return previous;
      }

      if (sidebarSessionSearchResults.length === 0) {
        return undefined;
      }

      if (queryChanged) {
        return createSidebarSessionSearchSelection(sidebarSessionSearchResults[0]);
      }

      if (!previous) {
        return undefined;
      }

      return sidebarSessionSearchResults.some((result) =>
        isSidebarSessionSearchSelectionMatch(result, previous),
      )
        ? previous
        : createSidebarSessionSearchSelection(sidebarSessionSearchResults[0]);
    });
  }, [isSessionSearchOpen, normalizedSessionSearchQuery, sidebarSessionSearchResults]);

  useEffect(() => {
    if (!isSessionSearchSelectionVisible || !selectedSessionSearchResult) {
      return;
    }

    const selectedElement =
      selectedSessionSearchResult.kind === "session"
        ? document.querySelector<HTMLElement>(
            `[data-sidebar-session-id="${selectedSessionSearchResult.sessionId}"]`,
          )
        : document.querySelector<HTMLElement>(
            `[data-sidebar-history-id="${selectedSessionSearchResult.historyId}"]`,
          );
    selectedElement?.scrollIntoView({
      block: "nearest",
    });
  }, [isSessionSearchSelectionVisible, selectedSessionSearchResult]);

  useEffect(() => {
    if (!focusedSessionId || !sessionGroupsContentRef.current) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      const scrollViewport = sessionGroupsContentRef.current;
      if (!scrollViewport) {
        return;
      }

      const focusedSessionElement = document.querySelector<HTMLElement>(
        `[data-sidebar-session-id="${focusedSessionId}"]`,
      );
      if (!focusedSessionElement) {
        return;
      }

      scrollElementIntoViewIfNeeded(focusedSessionElement, scrollViewport);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [focusedSessionId]);

  const unlockCompletionSoundPlayback = useEffectEvent(() => {
    void prepareCompletionSoundPlayback((soundEvent, details) => {
      postSidebarDebugLog(soundEvent, details);
    });
  });

  const recordPointerDownSessionTarget = useEffectEvent((event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      pointerDownSessionTargetRef.current = undefined;
      return;
    }

    const sessionElement = target.closest<HTMLElement>("[data-sidebar-session-id]");
    const groupElement = target.closest<HTMLElement>("[data-sidebar-group-id]");
    const sessionId = sessionElement?.dataset.sidebarSessionId;
    const groupId = groupElement?.dataset.sidebarGroupId;
    if (!sessionId || !groupId) {
      pointerDownSessionTargetRef.current = undefined;
      return;
    }

    pointerDownSessionTargetRef.current = {
      groupId,
      point: {
        x: event.clientX,
        y: event.clientY,
      },
      sessionId,
    };
  });

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      recordPointerDownSessionTarget(event);
      unlockCompletionSoundPlayback();
    };
    const handleKeyDown = () => {
      pointerDownSessionTargetRef.current = undefined;
      unlockCompletionSoundPlayback();
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [recordPointerDownSessionTarget, unlockCompletionSoundPlayback]);

  const updateSessionDropIndicator = useEffectEvent(
    (event: Parameters<NonNullable<DragDropEventHandlers["onDragOver"]>>[0]) => {
      if (isManualActiveSessionsSort) {
        setSessionDropIndicatorGroupId(undefined);
        return;
      }

      const sourceData = getSidebarDropData(event.operation.source);
      if (sourceData?.kind !== "session") {
        setSessionDropIndicatorGroupId(undefined);
        return;
      }

      const resolvedSessionDropTarget = resolveSessionDropTargetFromPoint(
        getDragNativeEvent(event),
        sessionIdsByGroupRef.current,
        getSidebarDropData(event.operation.target),
        sourceData,
      );
      const nextGroupId =
        resolvedSessionDropTarget && resolvedSessionDropTarget.groupId !== sourceData.groupId
          ? resolvedSessionDropTarget.groupId
          : undefined;

      setSessionDropIndicatorGroupId((previous) =>
        previous === nextGroupId ? previous : nextGroupId,
      );
    },
  );

  const handleDragStart = ((event) => {
    const nativeEvent = getDragNativeEvent(event);
    const sourceData = getSidebarDropData(event.operation.source);
    const pointerDownSessionTarget = pointerDownSessionTargetRef.current;
    sessionPointerDragStateRef.current =
      sourceData?.kind === "session"
        ? createSessionPointerDragState(sourceData, pointerDownSessionTarget, nativeEvent)
        : undefined;
    setSessionDropIndicatorGroupId(undefined);
    postSidebarDebugLog("session.dragStart", {
      nativeEventType: nativeEvent?.type,
      pointerDragState: sessionPointerDragStateRef.current,
      point: getClientPoint(nativeEvent),
      sourceData,
      targetData: getSidebarDropData(event.operation.target),
    });
  }) satisfies DragDropEventHandlers["onDragStart"];

  const handleDragMove = ((event) => {
    updateSessionPointerDragState(sessionPointerDragStateRef.current, getDragNativeEvent(event));
    updateSessionDropIndicator(event);
  }) satisfies DragDropEventHandlers["onDragMove"];

  const handleDragOver = ((event) => {
    updateSessionPointerDragState(sessionPointerDragStateRef.current, getDragNativeEvent(event));
    updateSessionDropIndicator(event);
  }) satisfies DragDropEventHandlers["onDragOver"];

  const handleDragEnd = ((event) => {
    setSessionDropIndicatorGroupId(undefined);
    const currentGroupIds = groupIdsRef.current;
    const currentSessionIdsByGroup = sessionIdsByGroupRef.current;
    const authoritativeGroupIds = workspaceGroupIds;
    const previousSessionIdsByGroup = effectiveSessionIdsByGroup;

    const nativeEvent = getDragNativeEvent(event);
    const sourceData = getSidebarDropData(event.operation.source);
    const targetData = getSidebarDropData(event.operation.target);
    const sessionPointerDragState = sessionPointerDragStateRef.current;
    updateSessionPointerDragState(sessionPointerDragState, nativeEvent);
    sessionPointerDragStateRef.current = undefined;
    const resolvedSessionDropTarget =
      sourceData?.kind === "session"
        ? resolveSessionDropTargetFromPoint(
            nativeEvent,
            currentSessionIdsByGroup,
            targetData,
            sourceData,
          )
        : undefined;
    postSidebarDebugLog("session.dragEnd", {
      canceled: event.canceled,
      nativeEventType: nativeEvent?.type,
      pointerDragState: sessionPointerDragState,
      point: getClientPoint(nativeEvent),
      resolvedSessionDropTarget,
      sourceData,
      targetData,
    });
    if (!sourceData) {
      return;
    }

    if (sourceData.kind === "group") {
      if (event.canceled || targetData?.kind !== "group") {
        return;
      }

      const nextGroupIds = move(currentGroupIds, event);
      if (haveSameSessionOrder(authoritativeGroupIds, nextGroupIds)) {
        return;
      }

      vscode.postMessage({
        groupIds: nextGroupIds,
        type: "syncGroupOrder",
      });
      return;
    }

    if (sourceData.kind !== "session") {
      return;
    }

    if (sessionPointerDragState?.startPoint && !sessionPointerDragState.didMove) {
      postSidebarDebugLog("session.dragEndIgnoredWithoutPointerMovement", {
        point: getClientPoint(nativeEvent),
        sourceData,
      });
      return;
    }

    if (event.canceled) {
      return;
    }

    if (resolvedSessionDropTarget === null) {
      return;
    }

    if (!targetData && resolvedSessionDropTarget === undefined) {
      return;
    }

    const nextSessionIdsByGroup =
      resolvedSessionDropTarget !== undefined
        ? moveSessionIdsByDropTarget(
            currentSessionIdsByGroup,
            sourceData.sessionId,
            resolvedSessionDropTarget,
          )
        : move(currentSessionIdsByGroup, event);
    const nextListedSessionIds = new Set(Object.values(nextSessionIdsByGroup).flat());
    const omittedSessionIds = Object.values(currentSessionIdsByGroup)
      .flat()
      .filter((sessionId) => !nextListedSessionIds.has(sessionId));
    postSidebarDebugLog("session.dragComputedOrder", {
      currentSessionIdsByGroup,
      nextSessionIdsByGroup,
      omittedSessionIds,
      resolvedSessionDropTarget,
      sourceData,
      targetData,
    });
    const previousGroupId = findSessionGroupId(previousSessionIdsByGroup, sourceData.sessionId);
    const nextGroupId = findSessionGroupId(nextSessionIdsByGroup, sourceData.sessionId);
    if (!previousGroupId || !nextGroupId) {
      return;
    }

    if (previousGroupId !== nextGroupId) {
      const targetIndex = nextSessionIdsByGroup[nextGroupId]?.indexOf(sourceData.sessionId);
      if (targetIndex == null || targetIndex < 0) {
        return;
      }

      vscode.postMessage({
        groupId: nextGroupId,
        sessionId: sourceData.sessionId,
        targetIndex,
        type: "moveSessionToGroup",
      });
      return;
    }

    if (!isManualActiveSessionsSort) {
      return;
    }

    const previousSessionIds = previousSessionIdsByGroup[nextGroupId] ?? [];
    const nextSessionIds = nextSessionIdsByGroup[nextGroupId] ?? [];
    if (haveSameSessionOrder(previousSessionIds, nextSessionIds)) {
      return;
    }

    vscode.postMessage({
      groupId: nextGroupId,
      sessionIds: nextSessionIds,
      type: "syncSessionOrder",
    });
  }) satisfies DragDropEventHandlers["onDragEnd"];

  const openScratchPad = () => {
    setIsOverflowMenuOpen(false);
    setIsDaemonSessionsOpen(false);
    setIsPinnedPromptsOpen(false);
    setIsPreviousSessionsOpen(false);
    setIsSessionSearchSelectionVisible(false);
    setIsSessionSearchOpen(false);
    setSessionSearchQuery("");
    openAppModal({ modal: "scratchPad", type: "open" });
  };

  const persistSectionCollapsed = useEffectEvent(
    (section: SidebarCollapsibleSection, collapsed: boolean) => {
      vscode.postMessage({
        collapsed,
        section,
        type: "setSidebarSectionCollapsed",
      });
    },
  );

  const scheduleSectionCollapsePersistence = useEffectEvent(
    (section: SidebarCollapsibleSection, collapsed: boolean) => {
      const existingTimeoutId = sectionCollapsePersistTimeoutsRef.current[section];
      if (existingTimeoutId !== undefined) {
        window.clearTimeout(existingTimeoutId);
      }

      const timeoutId = window.setTimeout(() => {
        if (sectionCollapsePersistTimeoutsRef.current[section] !== timeoutId) {
          return;
        }

        delete sectionCollapsePersistTimeoutsRef.current[section];
        persistSectionCollapsed(section, collapsed);
      }, SIDEBAR_SECTION_COLLAPSE_PERSIST_DEBOUNCE_MS);

      sectionCollapsePersistTimeoutsRef.current[section] = timeoutId;
    },
  );

  const openRunningSessions = () => {
    setIsOverflowMenuOpen(false);
    setIsPinnedPromptsOpen(false);
    setIsPreviousSessionsOpen(false);
    setIsScratchPadOpen(false);
    setIsSessionSearchSelectionVisible(false);
    setIsSessionSearchOpen(false);
    setSessionSearchQuery("");
    openAppModal({ modal: "daemonSessions", type: "open" });
    vscode.postMessage({ type: "refreshDaemonSessions" });
  };

  const openSidebarSettings = () => {
    setIsOverflowMenuOpen(false);
    setIsPinnedPromptsOpen(false);
    if (!settings) {
      vscode.postMessage({ type: "openSettings" });
      return;
    }
    setIsPreviousSessionsOpen(false);
    setIsDaemonSessionsOpen(false);
    setIsScratchPadOpen(false);
    setIsSessionSearchSelectionVisible(false);
    setIsSessionSearchOpen(false);
    setSessionSearchQuery("");
    openAppModal({ modal: "settings", type: "open" });
  };

  const openHotkeys = () => {
    setIsOverflowMenuOpen(false);
    setIsPinnedPromptsOpen(false);
    setIsPreviousSessionsOpen(false);
    setIsDaemonSessionsOpen(false);
    setIsScratchPadOpen(false);
    setIsSessionSearchSelectionVisible(false);
    setIsSessionSearchOpen(false);
    setSessionSearchQuery("");
    openAppModal({ modal: "hotkeys", type: "open" });
  };

  const closeSessionSearch = () => {
    setIsSessionSearchSelectionVisible(false);
    setIsSessionSearchOpen(false);
    setSessionSearchQuery("");
  };

  const closeTopmostSidebarOverlay = useEffectEvent(() => {
    if (gitCommitDraft) {
      closeGitCommitModal(gitCommitDraft.requestId);
      return true;
    }

    if (isDaemonSessionsOpen) {
      setIsDaemonSessionsOpen(false);
      return true;
    }

    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }

    if (isPreviousSessionsOpen) {
      setIsPreviousSessionsOpen(false);
      return true;
    }

    if (isPinnedPromptsOpen) {
      setIsPinnedPromptsOpen(false);
      return true;
    }

    if (isScratchPadOpen) {
      setIsScratchPadOpen(false);
      return true;
    }

    if (isOverflowMenuOpen) {
      setIsOverflowMenuOpen(false);
      return true;
    }

    if (isSessionSearchOpen) {
      closeSessionSearch();
      return true;
    }

    return false;
  });

  const toggleSessionSearch = () => {
    closeAppModal("AppModals:sidebarSearch");
    setIsDaemonSessionsOpen(false);
    setIsPinnedPromptsOpen(false);
    setIsPreviousSessionsOpen(false);
    setIsScratchPadOpen(false);
    setIsSessionSearchOpen((previous) => {
      if (previous) {
        setIsSessionSearchSelectionVisible(false);
        setSessionSearchQuery("");
      }

      return !previous;
    });
  };

  const restoreSearchedPreviousSession = (historyId: string) => {
    vscode.postMessage({
      historyId,
      type: "restorePreviousSession",
    });
    closeSessionSearch();
  };

  const deleteSearchedPreviousSession = (historyId: string) => {
    vscode.postMessage({
      historyId,
      type: "deletePreviousSession",
    });
  };

  const activateSelectedSessionSearchResult = useEffectEvent(() => {
    if (!selectedSessionSearchResult) {
      return false;
    }

    if (selectedSessionSearchResult.kind === "previous") {
      restoreSearchedPreviousSession(selectedSessionSearchResult.historyId);
      return true;
    }

    const selectedResult = sidebarSessionSearchResults.find((result) =>
      isSidebarSessionSearchSelectionMatch(result, selectedSessionSearchResult),
    );
    if (!selectedResult || selectedResult.kind !== "session") {
      return false;
    }

    applyLocalFocus(selectedResult.groupId, selectedResult.sessionId);
    vscode.postMessage({
      sessionId: selectedResult.sessionId,
      type: "focusSession",
    });
    return true;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const searchInput = searchInputRef.current;
      const isSearchInputTarget = searchInput !== null && target === searchInput;

      if (event.key === "Escape") {
        if (!closeTopmostSidebarOverlay()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (
        event.defaultPrevented ||
        gitCommitDraft !== undefined ||
        isDaemonSessionsOpen ||
        isPreviousSessionsOpen ||
        isScratchPadOpen ||
        isOverflowMenuOpen ||
        (isEditableSidebarKeyboardTarget(target) && !isSearchInputTarget)
      ) {
        return;
      }

      if (
        isSessionSearchOpen &&
        isSidebarSessionSearchNavigationKey(event) &&
        (isSearchInputTarget || !isEditableSidebarKeyboardTarget(target))
      ) {
        const nextSelection = getNextSidebarSessionSearchSelection({
          currentSelection: selectedSessionSearchResult,
          direction: getSidebarSessionSearchNavigationDirection(event),
          results: sidebarSessionSearchResults,
        });
        if (!nextSelection) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setSelectedSessionSearchResult(nextSelection);
        setIsSessionSearchSelectionVisible(true);
        return;
      }

      if (
        isSessionSearchOpen &&
        event.key === "Enter" &&
        (isSearchInputTarget || !isEditableSidebarKeyboardTarget(target))
      ) {
        if (!activateSelectedSessionSearchResult()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setIsSessionSearchSelectionVisible(false);
        return;
      }

      if (isSearchInputTarget) {
        return;
      }

      if (isSessionSearchOpen && isTextEditingKey(event)) {
        const nextSearchState = applyTextEditingKey(
          {
            value: sessionSearchQuery,
          },
          event.key,
          event,
        );
        if (!nextSearchState) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setSessionSearchQuery(nextSearchState.value);
        return;
      }

      if (!isSidebarSearchActivationKey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsSessionSearchOpen(true);
      setSessionSearchQuery((previous) =>
        isSessionSearchOpen ? `${previous}${event.key}` : event.key,
      );
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    activateSelectedSessionSearchResult,
    closeTopmostSidebarOverlay,
    gitCommitDraft,
    isDaemonSessionsOpen,
    isOverflowMenuOpen,
    isPreviousSessionsOpen,
    isScratchPadOpen,
    isSessionSearchOpen,
    selectedSessionSearchResult,
    sessionSearchQuery,
    sidebarSessionSearchResults,
  ]);

  const toggleCompletionBell = () => {
    setIsOverflowMenuOpen(false);
    vscode.postMessage({ type: "toggleCompletionBell" });
  };

  const cycleSessionPersistenceProvider = () => {
    setIsOverflowMenuOpen(false);
    vscode.postMessage({ type: "cycleSessionPersistenceProvider" });
  };

  const restoreRecentProject = (projectId: string) => {
    setRecentProjectsQuery("");
    setIsRecentProjectsOpen(false);
    vscode.postMessage({
      projectId,
      type: "restoreRecentProject",
    });
  };

  const toggleActiveSessionsSortMode = () => {
    setIsOverflowMenuOpen(false);
    vscode.postMessage({ type: "toggleActiveSessionsSortMode" });
  };

  const moveSidebar = () => {
    setIsOverflowMenuOpen(false);
    vscode.postMessage({ type: "moveSidebarToOtherSide" });
  };

  const openWorkspaceWelcome = () => {
    setIsOverflowMenuOpen(false);
    vscode.postMessage({ type: "openWorkspaceWelcome" });
  };

  const openBrowserPane = () => {
    /**
     * CDXC:ChromiumBrowserPanes 2026-05-04-16:51
     * The sidebar needs a direct browser-pane creation button for Chromium/CEF
     * testing. Use the explicit browser-pane message so this button is stable
     * even when the general browser action setting still targets Chrome Canary.
     */
    setIsOverflowMenuOpen(false);
    vscode.postMessage({ type: "openBrowserPane" });
  };

  const browserAccessSessionId = useMemo(() => {
    const orderedSessionIds = groupOrder.flatMap(
      (groupId) => authoritativeSessionIdsByGroup[groupId] ?? [],
    );
    const focusedSessionId = orderedSessionIds.find(
      (sessionId) => sessionsById[sessionId]?.isFocused,
    );
    return focusedSessionId ?? orderedSessionIds[0];
  }, [authoritativeSessionIdsByGroup, groupOrder, sessionsById]);

  const togglePinnedPrompts = () => {
    setIsOverflowMenuOpen(false);
    setIsDaemonSessionsOpen(false);
    setIsPreviousSessionsOpen(false);
    setIsScratchPadOpen(false);
    setIsSessionSearchSelectionVisible(false);
    setIsSessionSearchOpen(false);
    setSessionSearchQuery("");
    openAppModal({ modal: "pinnedPrompts", type: "open" });
  };

  const topControlOptions = {
    browserAccessSessionId,
    completionBellEnabled,
    isManualActiveSessionsSort,
    isOverflowMenuOpen,
    isPinnedPromptsOpen,
    isPreviousSessionsOpen,
    isScratchPadOpen,
    isSessionSearchOpen,
    sessionPersistenceProvider: settings?.sessionPersistenceProvider,
    onMoveSidebar: moveSidebar,
    onOpenBrowser: openBrowserPane,
    onAccessT3FromBrowser: (sessionId: string) => {
      setIsOverflowMenuOpen(false);
      vscode.postMessage({
        sessionId,
        type: "requestT3SessionBrowserAccess",
      });
    },
    onOpenHelp: openWorkspaceWelcome,
    onOpenHotkeys: openHotkeys,
    onOpenSettings: openSidebarSettings,
    onShowRunning: openRunningSessions,
    onTogglePinnedPrompts: togglePinnedPrompts,
    onTogglePreviousSessions: () => {
      setIsOverflowMenuOpen(false);
      setIsPinnedPromptsOpen(false);
      setIsDaemonSessionsOpen(false);
      setIsScratchPadOpen(false);
      setIsSessionSearchSelectionVisible(false);
      setIsSessionSearchOpen(false);
      setSessionSearchQuery("");
      openAppModal({ modal: "previousSessions", type: "open" });
    },
    onToggleSessionSearch: () => {
      setIsOverflowMenuOpen(false);
      toggleSessionSearch();
    },
    onToggleActiveSessionsSortMode: toggleActiveSessionsSortMode,
    onToggleBell: toggleCompletionBell,
    onToggleMenu: toggleOverflowMenu,
    onToggleScratchPad: openScratchPad,
    onCycleSessionPersistenceProvider: cycleSessionPersistenceProvider,
    overflowMenuPosition,
    overflowMenuRef,
  } satisfies RenderSidebarTopControlsOptions;

  return (
    <Tooltip.Provider delay={TOOLTIP_DELAY_MS}>
      {/* CDXC:SidebarMode 2026-05-04-07:00: Combined mode still shows the
          current-project header because empty project groups act as project
          selectors for subsequent agent/action launches. */}
      <SidebarProjectHeader projectHeader={projectHeader} />
      {renderFloatingOverflowMenu(topControlOptions)}
      <div
        className="stack"
        data-dimmed={String(isStartupInteractionBlocked)}
        data-sidebar-custom-theme={String(Boolean(normalizeWorkspaceThemeColor(customThemeColor)))}
        data-sidebar-theme={theme}
        onDoubleClick={handleSidebarDoubleClick}
      >
        <div className="sidebar-top-panels">
          {/* CDXC:SidebarMode 2026-05-03-19:46: Previous sessions, pinned
              prompts, search, and completion sound live only in the overflow
              menu now, so section titlebars do not render duplicate buttons. */}
          <CommandsPanel
            createActionType={commandCreateActionType}
            createRequestId={commandCreateRequestId}
            isCollapsed={collapsedSections.actions}
            isVisible={shouldShowActionsPanel}
            onBrowserCommandRun={() => prepareBrowserGroupsForOpen(browserGroupIds)}
            onToggleCollapsed={(collapsed) => {
              setSectionCollapsed("actions", collapsed);
              scheduleSectionCollapsePersistence("actions", collapsed);
            }}
            showGitButton={sectionVisibility.git}
            vscode={vscode}
          />
          <AgentsPanel
            createRequestId={agentCreateRequestId}
            isCollapsed={collapsedSections.agents}
            isVisible={shouldShowAgentsPanel}
            onToggleCollapsed={(collapsed) => {
              setSectionCollapsed("agents", collapsed);
              scheduleSectionCollapsePersistence("agents", collapsed);
            }}
            vscode={vscode}
          />
        </div>
        <section className="session-groups-panel" ref={sessionGroupsPanelRef}>
          <div className="session-groups-top">
            {isSessionSearchOpen ? (
              <SidebarSessionSearchField
                inputRef={searchInputRef}
                query={sessionSearchQuery}
                setQuery={setSessionSearchQuery}
              />
            ) : null}
          </div>
          <div
            className="session-groups-scroll-shell"
            data-scroll-glow-bottom={String(showSessionGroupsBottomGlow)}
            data-scroll-glow-top={String(showSessionGroupsTopGlow)}
            data-scrollable-y={String(sessionGroupsHaveScrollableOverflow)}
          >
            <div
              aria-hidden="true"
              className="session-groups-scroll-glow session-groups-scroll-glow-top"
            />
            <div
              className="session-groups-content scroll-mask-y"
              data-scrollable-y={String(sessionGroupsHaveScrollableOverflow)}
              ref={sessionGroupsContentRef}
            >
              {displayedBrowserGroupIds.length > 0 ? (
                <div className="group-list browser-group-list">
                  {displayedBrowserGroupIds.map((groupId) => (
                    <SessionGroupSection
                      autoEdit={false}
                      canClose={false}
                      completionFlashNonceBySessionId={completionFlashNonceBySessionId}
                      draggingDisabled={isSessionSearchOpen}
                      groupId={groupId}
                      index={-1}
                      isCollapsed={collapsedGroupsById[groupId] === true}
                      key={groupId}
                      onAutoEditHandled={() => undefined}
                      onCollapsedChange={setGroupCollapsed}
                      onCreateSessionRequested={(requestedGroupId) =>
                        prepareBrowserGroupsForOpen([requestedGroupId])
                      }
                      orderedSessionIds={displayedBrowserSessionIdsByGroup[groupId] ?? []}
                      selectedSearchSessionId={
                        isSessionSearchSelectionVisible &&
                        selectedSessionSearchResult?.kind === "session"
                          ? selectedSessionSearchResult.sessionId
                          : undefined
                      }
                      vscode={vscode}
                    />
                  ))}
                </div>
              ) : null}
              <DragDropProvider
                key={dragStructureKey}
                onDragEnd={handleDragEnd}
                onDragMove={handleDragMove}
                onDragOver={handleDragOver}
                onDragStart={handleDragStart}
                sensors={sensors}
              >
                <div className="group-list workspace-group-list">
                  {displayedWorkspaceGroupIds.map((groupId, groupIndex) => (
                    <SessionGroupSection
                      autoEdit={autoEditingGroupId === groupId}
                      canClose={effectiveGroupIds.length > 1}
                      completionFlashNonceBySessionId={completionFlashNonceBySessionId}
                      draggingDisabled={isSessionSearchOpen}
                      groupId={groupId}
                      index={groupIndex}
                      isCollapsed={collapsedGroupsById[groupId] === true}
                      key={groupId}
                      onAutoEditHandled={() => setAutoEditingGroupId(undefined)}
                      onCollapsedChange={setGroupCollapsed}
                      onFocusRequested={applyLocalFocus}
                      orderedSessionIds={displayedWorkspaceSessionIdsByGroup[groupId] ?? []}
                      selectedSearchSessionId={
                        isSessionSearchSelectionVisible &&
                        selectedSessionSearchResult?.kind === "session"
                          ? selectedSessionSearchResult.sessionId
                          : undefined
                      }
                      sessionDropIndicatorGroupId={sessionDropIndicatorGroupId}
                      sessionDraggingDisabled={isCombinedSidebarMode}
                      showHeaderActions={true}
                      showSessionDropPositionIndicators={
                        !isCombinedSidebarMode && !isSessionSearchOpen && isManualActiveSessionsSort
                      }
                      vscode={vscode}
                    />
                  ))}
                </div>
              </DragDropProvider>
              {isSessionSearchFiltering ? (
                <SidebarPreviousSessionsSearchGroup
                  onDeletePreviousSession={deleteSearchedPreviousSession}
                  onRestorePreviousSession={restoreSearchedPreviousSession}
                  previousSessions={filteredPreviousSessions}
                  selectedHistoryId={
                    isSessionSearchSelectionVisible &&
                    selectedSessionSearchResult?.kind === "previous"
                      ? selectedSessionSearchResult.historyId
                      : undefined
                  }
                  showDebugSessionNumbers={debuggingMode}
                  showHotkeys={showHotkeysOnSessionCards}
                />
              ) : null}
              {!isCombinedSidebarMode && !isSessionSearchOpen ? (
                <div className="group-list group-create-list">
                  <div className="group group-create-shell" data-empty-space-blocking="true">
                    <div className="group-head">
                      <button
                        aria-label="Create a new group"
                        className="group-create-button"
                        disabled={effectiveGroupIds.length >= MAX_GROUP_COUNT}
                        onClick={() => {
                          pendingCreateGroupRef.current = true;
                          vscode.postMessage({ type: "createGroup" });
                        }}
                        type="button"
                      >
                        <span className="group-title-wrap">
                          <span className="group-title-row">
                            <span
                              aria-hidden="true"
                              className="group-collapse-button section-titlebar-toggle group-create-button-icon-shell"
                            >
                              <IconPlusFilled
                                aria-hidden="true"
                                className="group-create-button-icon"
                                size={14}
                              />
                            </span>
                            <span className="group-title-handle">
                              <span className="group-title section-titlebar-label group-create-button-label">
                                New Group
                              </span>
                            </span>
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {shouldShowSessionSearchEmptyState ? (
                <div className="empty session-search-empty-state" data-empty-space-blocking="true">
                  No current or previous sessions match that search.
                </div>
              ) : displayedBrowserGroupIds.length === 0 &&
                displayedWorkspaceGroupIds.every(
                  (groupId) => (displayedWorkspaceSessionIdsByGroup[groupId] ?? []).length === 0,
                ) &&
                !isSessionSearchOpen ? (
                <div className="empty" data-empty-space-blocking="true"></div>
              ) : null}
            </div>
            <div
              aria-hidden="true"
              className="session-groups-scroll-glow session-groups-scroll-glow-bottom"
            />
          </div>
        </section>
        {isCombinedSidebarMode && recentProjects.length > 0 ? (
          <section
            aria-label="Recent Projects"
            className="recent-projects-drawer"
            data-open={String(isRecentProjectsOpen)}
          >
            {/*
             * CDXC:RecentProjects 2026-05-04-14:25
             * Combined mode parks projects without surfaced sessions in a
             * bottom drawer. Clicking a row asks native to restore the full
             * project and only create a blank terminal when no sessions were
             * preserved.
             */}
            <button
              aria-expanded={isRecentProjectsOpen}
              className="recent-projects-drawer-toggle group-head"
              data-collapsible="true"
              onClick={() => setIsRecentProjectsOpen((previous) => !previous)}
              type="button"
            >
              <span className="group-title-wrap">
                <span className="group-title-row">
                  <span
                    aria-hidden="true"
                    className="group-collapse-button section-titlebar-toggle"
                    data-collapsed={String(!isRecentProjectsOpen)}
                    data-has-idle-icon="true"
                  >
                    <span className="group-collapse-icon group-collapse-idle-icon section-titlebar-toggle-icon section-titlebar-toggle-idle-icon">
                      <IconHistory size={16} stroke={1.8} />
                    </span>
                    <IconCaretRightFilled
                      aria-hidden="true"
                      className="group-collapse-icon group-collapse-chevron-icon section-titlebar-toggle-icon section-titlebar-toggle-chevron-icon"
                      size={16}
                    />
                  </span>
                  <span className="group-title-handle">
                    <span className="recent-projects-drawer-title group-title section-titlebar-label">
                      Recent Projects
                    </span>
                  </span>
                </span>
              </span>
            </button>
            {isRecentProjectsOpen ? (
              <div className="recent-projects-drawer-body">
                <label className="recent-projects-search">
                  <IconSearch aria-hidden="true" size={14} stroke={1.8} />
                  <input
                    autoComplete="off"
                    onChange={(event) => setRecentProjectsQuery(event.currentTarget.value)}
                    placeholder="Search projects"
                    type="search"
                    value={recentProjectsQuery}
                  />
                </label>
                <div className="recent-projects-list">
                  {filteredRecentProjects.length > 0 ? (
                    filteredRecentProjects.map((project) => (
                      <button
                        className="recent-projects-row group-head"
                        key={project.projectId}
                        onClick={() => restoreRecentProject(project.projectId)}
                        title={project.path}
                        type="button"
                      >
                        <span className="group-title-wrap">
                          <span className="group-title-row">
                            <span
                              aria-hidden="true"
                              className="recent-projects-row-icon group-collapse-button section-titlebar-toggle"
                            >
                              <IconFolder size={16} stroke={1.8} />
                            </span>
                            <span className="group-title-handle">
                              <span className="recent-projects-row-title group-title section-titlebar-label">
                                {project.title}
                              </span>
                            </span>
                            <span className="group-title-spacer" />
                            <span
                              aria-label={`${project.sessionCount} preserved sessions`}
                              className="recent-projects-session-count group-add-button"
                            >
                              {project.sessionCount}
                            </span>
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="recent-projects-empty">No projects match that search.</div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
        <GitCommitModal
          draft={
            gitCommitDraft ?? {
              confirmLabel: "Commit",
              description: "",
              requestId: "",
              suggestedBody: undefined,
              suggestedSubject: "",
            }
          }
          isOpen={gitCommitDraft !== undefined}
          onCancel={(requestId) => {
            closeGitCommitModal(requestId);
          }}
          onConfirm={(requestId, message) => {
            setGitCommitDraft(undefined);
            vscode.postMessage({
              message,
              requestId,
              type: "confirmSidebarGitCommit",
            });
          }}
        />
        {buildStamp ? (
          <button
            aria-label={`Copy build stamp ${buildStamp}`}
            className="copy-cursor"
            onClick={() => {
              void navigator.clipboard.writeText(buildStamp).catch(() => {});
            }}
            style={DEBUG_BUILD_STAMP_STYLE}
            title="Copy build stamp"
            type="button"
          >
            {buildStamp}
          </button>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}

type ToolbarIconButtonProps = {
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: "dialog" | "menu";
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  dataDimmed?: string;
  isDisabled?: boolean;
  isDimmed?: boolean;
  isSelected?: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  tabIndex?: number;
  tooltip: string;
  triggerDataName?: string;
};

function ToolbarIconButton({
  ariaControls,
  ariaExpanded,
  ariaHasPopup,
  ariaLabel,
  children,
  className,
  dataDimmed,
  isDisabled = false,
  isDimmed = false,
  isSelected = false,
  onClick,
  tabIndex,
  tooltip,
  triggerDataName,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            aria-controls={ariaControls}
            aria-disabled={isDisabled}
            aria-expanded={ariaExpanded}
            aria-haspopup={ariaHasPopup}
            aria-label={ariaLabel}
            className={className ? `toolbar-button ${className}` : "toolbar-button"}
            data-disabled={String(isDisabled)}
            data-dimmed={dataDimmed ?? String(isDimmed)}
            data-sidebar-overflow-trigger={triggerDataName}
            data-selected={String(isSelected)}
            onClick={(event) => {
              if (isDisabled) {
                return;
              }

              onClick(event);
            }}
            tabIndex={tabIndex}
            type="button"
          >
            {children}
          </button>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="tooltip-positioner" sideOffset={8}>
          <Tooltip.Popup className="tooltip-popup">{tooltip}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function createWorkspaceSessionIdsByGroup(
  workspaceGroupIds: readonly string[],
  sessionIdsByGroup: SessionIdsByGroup,
): SessionIdsByGroup {
  return Object.fromEntries(
    workspaceGroupIds.map((groupId) => [groupId, sessionIdsByGroup[groupId] ?? []]),
  );
}

function createDragStructureKey(
  groupIds: readonly string[],
  sessionIdsByGroup: SessionIdsByGroup,
): string {
  return groupIds
    .map((groupId) => `${groupId}:${(sessionIdsByGroup[groupId] ?? []).join(",")}`)
    .join("|");
}

function findSessionGroupId(
  sessionIdsByGroup: SessionIdsByGroup,
  sessionId: string,
): string | undefined {
  return Object.entries(sessionIdsByGroup).find(([, sessionIds]) =>
    sessionIds.includes(sessionId),
  )?.[0];
}

function haveSameSessionOrder(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((sessionId, index) => sessionId === right[index]);
}

function findCreatedGroupId(
  previousGroups: readonly string[],
  nextGroups: readonly string[],
): string | undefined {
  const previousGroupIds = new Set(previousGroups);
  return nextGroups.find((groupId) => !previousGroupIds.has(groupId));
}

function OverflowIcon() {
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 16 16">
      <circle cx="3.5" cy="8" fill="currentColor" r="1.1" />
      <circle cx="8" cy="8" fill="currentColor" r="1.1" />
      <circle cx="12.5" cy="8" fill="currentColor" r="1.1" />
    </svg>
  );
}

function getActiveSessionsSortMenuLabel(isManualActiveSessionsSort: boolean): string {
  return isManualActiveSessionsSort ? "Manual Sort" : "Last Activity Sort";
}

function getScratchPadMenuLabel(isScratchPadOpen: boolean): string {
  return isScratchPadOpen ? "Hide Scratch Pad" : "Scratch Pad";
}

function getSessionPersistenceProviderMenuLabel(provider: string | undefined): string {
  if (provider === "tmux") {
    return "Persistence: tmux";
  }
  if (provider === "zmx") {
    return "Persistence: zmx";
  }
  return "Persistence: Off";
}

type RenderSidebarTopControlsOptions = {
  browserAccessSessionId?: string;
  completionBellEnabled: boolean;
  isManualActiveSessionsSort: boolean;
  isOverflowMenuOpen: boolean;
  isPinnedPromptsOpen: boolean;
  isPreviousSessionsOpen: boolean;
  isScratchPadOpen: boolean;
  isSessionSearchOpen: boolean;
  sessionPersistenceProvider?: string;
  onAccessT3FromBrowser: (sessionId: string) => void;
  onMoveSidebar: () => void;
  onOpenBrowser: () => void;
  onOpenHelp: () => void;
  onOpenHotkeys: () => void;
  onOpenSettings: () => void;
  onShowRunning: () => void;
  onTogglePinnedPrompts: () => void;
  onTogglePreviousSessions: () => void;
  onToggleSessionSearch: () => void;
  onCycleSessionPersistenceProvider: () => void;
  onToggleActiveSessionsSortMode: () => void;
  onToggleBell: () => void;
  onToggleMenu: (trigger: HTMLElement) => void;
  onToggleScratchPad: () => void;
  overflowMenuPosition?: FloatingMenuPosition;
  overflowMenuRef: RefObject<HTMLDivElement | null>;
};

function renderFloatingOverflowMenu({
  browserAccessSessionId,
  completionBellEnabled,
  isManualActiveSessionsSort,
  isOverflowMenuOpen,
  isPinnedPromptsOpen,
  isPreviousSessionsOpen,
  isScratchPadOpen,
  isSessionSearchOpen,
  sessionPersistenceProvider,
  onAccessT3FromBrowser,
  onMoveSidebar: _onMoveSidebar,
  onOpenBrowser,
  onOpenHelp,
  onOpenHotkeys,
  onOpenSettings,
  onShowRunning,
  onToggleActiveSessionsSortMode,
  onToggleBell,
  onTogglePinnedPrompts,
  onTogglePreviousSessions,
  onToggleSessionSearch,
  onCycleSessionPersistenceProvider,
  onToggleMenu,
  onToggleScratchPad,
  overflowMenuPosition,
  overflowMenuRef,
}: RenderSidebarTopControlsOptions) {
  return (
    <>
      {/*
       * CDXC:Sidebar-controls 2026-04-25-09:50
       * The overflow menu must stay available even when project/section headers
       * are hidden, so its trigger floats at the top-right of the whole sidebar
       * instead of being owned by a header titlebar.
       */}
      <ToolbarIconButton
        ariaLabel="Open Chromium browser pane"
        className="floating-toolbar-button sidebar-floating-browser-trigger"
        onClick={onOpenBrowser}
        tooltip="New Browser"
      >
        <IconBrowser aria-hidden="true" className="toolbar-tabler-icon" size={14} stroke={2} />
      </ToolbarIconButton>
      <ToolbarIconButton
        ariaControls="sidebar-overflow-menu"
        ariaExpanded={isOverflowMenuOpen}
        ariaHasPopup="menu"
        ariaLabel="Open sidebar menu"
        className="floating-toolbar-button sidebar-floating-overflow-trigger"
        isSelected={isOverflowMenuOpen}
        onClick={(event) => onToggleMenu(event.currentTarget)}
        tooltip="More"
        triggerDataName="true"
      >
        <OverflowIcon />
      </ToolbarIconButton>
      {isOverflowMenuOpen && overflowMenuPosition
        ? createPortal(
            <div
              aria-label="Sidebar actions"
              className="session-context-menu sidebar-floating-menu"
              data-empty-space-blocking="true"
              id="sidebar-overflow-menu"
              ref={overflowMenuRef}
              role="menu"
              style={{
                right: overflowMenuPosition.right,
                top: overflowMenuPosition.top,
                zIndex: 250,
              }}
            >
              <div className="session-context-menu-group">
                {/*
                 * CDXC:SidebarMode 2026-05-03-17:34
                 * Previous sessions, pinned prompts, search, and scratch pad
                 * are permanent overflow-menu actions in both Combined and
                 * Separated modes so the compact toolbar controls remain
                 * reachable from one consistent menu.
                 *
                 * CDXC:Sidebar-overflow-menu 2026-05-04-03:09
                 * The overflow menu order must match the grouped desktop menu:
                 * primary navigation, session behavior, status/help, then
                 * Settings as its own final action.
                 */}
                <button
                  aria-checked={isSessionSearchOpen}
                  className="session-context-menu-item"
                  onClick={onToggleSessionSearch}
                  role="menuitemcheckbox"
                  type="button"
                >
                  <IconSearch
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  Search
                </button>
                <button
                  aria-checked={isPreviousSessionsOpen}
                  className="session-context-menu-item"
                  onClick={onTogglePreviousSessions}
                  role="menuitemcheckbox"
                  type="button"
                >
                  <IconHistory aria-hidden="true" className="session-context-menu-icon" size={14} />
                  Previous Sessions
                </button>
                <button
                  aria-checked={isPinnedPromptsOpen}
                  className="session-context-menu-item"
                  onClick={onTogglePinnedPrompts}
                  role="menuitemcheckbox"
                  type="button"
                >
                  <IconBookmark
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  Pinned Prompts
                </button>
                <button
                  className="session-context-menu-item"
                  onClick={onToggleScratchPad}
                  role="menuitem"
                  type="button"
                >
                  <IconPencil
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  {getScratchPadMenuLabel(isScratchPadOpen)}
                </button>
              </div>
              <div className="session-context-menu-divider" role="separator" />
              <div className="session-context-menu-group">
                <button
                  aria-checked={completionBellEnabled}
                  className="session-context-menu-item"
                  onClick={onToggleBell}
                  role="menuitemcheckbox"
                  type="button"
                >
                  {completionBellEnabled ? (
                    <IconBell
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                      stroke={1.8}
                    />
                  ) : (
                    <IconBellOff
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                      stroke={1.8}
                    />
                  )}
                  {completionBellEnabled ? "Completion Sound On" : "Completion Sound Off"}
                </button>
                <button
                  className="session-context-menu-item"
                  onClick={onCycleSessionPersistenceProvider}
                  role="menuitem"
                  type="button"
                >
                  {/*
                   * CDXC:SessionPersistence 2026-05-05-07:28
                   * Session persistence is a launch behavior users need while
                   * working, so the overflow menu cycles the persisted provider
                   * without requiring a settings-modal detour.
                   */}
                  <IconTerminal2
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  {getSessionPersistenceProviderMenuLabel(sessionPersistenceProvider)}
                </button>
                <button
                  className="session-context-menu-item"
                  onClick={onToggleActiveSessionsSortMode}
                  role="menuitem"
                  type="button"
                >
                  <IconArrowsSort
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  {getActiveSessionsSortMenuLabel(isManualActiveSessionsSort)}
                </button>
              </div>
              <div className="session-context-menu-divider" role="separator" />
              <div className="session-context-menu-group">
                {browserAccessSessionId ? (
                  <button
                    className="session-context-menu-item"
                    onClick={() => onAccessT3FromBrowser(browserAccessSessionId)}
                    role="menuitem"
                    type="button"
                  >
                    <IconDeviceMobile
                      aria-hidden="true"
                      className="session-context-menu-icon"
                      size={14}
                      stroke={1.8}
                    />
                    Remote Access
                  </button>
                ) : null}
                <button
                  className="session-context-menu-item"
                  onClick={onShowRunning}
                  role="menuitem"
                  type="button"
                >
                  <IconHistory aria-hidden="true" className="session-context-menu-icon" size={14} />
                  Running
                </button>
                <button
                  className="session-context-menu-item"
                  onClick={onOpenHotkeys}
                  role="menuitem"
                  type="button"
                >
                  <IconKeyboard
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  Hotkeys
                </button>
                <button
                  className="session-context-menu-item"
                  onClick={onOpenHelp}
                  role="menuitem"
                  type="button"
                >
                  <IconHelpCircle
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  Tips &amp; Tricks
                </button>
              </div>
              <div className="session-context-menu-divider" role="separator" />
              <div className="session-context-menu-group">
                <button
                  className="session-context-menu-item"
                  onClick={onOpenSettings}
                  role="menuitem"
                  type="button"
                >
                  <IconSettings
                    aria-hidden="true"
                    className="session-context-menu-icon"
                    size={14}
                    stroke={1.8}
                  />
                  Settings
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function resolveSessionDropTargetFromPoint(
  nativeEvent: Event | undefined,
  sessionIdsByGroup: SessionIdsByGroup,
  targetData: ReturnType<typeof getSidebarDropData>,
  sourceData: Extract<ReturnType<typeof getSidebarDropData>, { kind: "session" }> | undefined,
) {
  const point = getClientPoint(nativeEvent);
  const candidates = [
    getSidebarSessionDropTarget(targetData),
    getSidebarSessionDropTargetFromDropData(targetData, point),
    point ? getSidebarSessionDropTargetAtPoint(document, point.x, point.y) : undefined,
    getSidebarSessionDropTargetFromEvent(nativeEvent),
  ];

  for (const candidate of candidates) {
    if (!candidate || isSourceSessionDropTarget(candidate, sourceData)) {
      continue;
    }

    const groupSessionIds = sessionIdsByGroup[candidate.groupId];
    if (!groupSessionIds) {
      continue;
    }

    if (candidate.kind === "session" && !groupSessionIds.includes(candidate.sessionId)) {
      continue;
    }

    return candidate;
  }

  return null;
}

function isSourceSessionDropTarget(
  candidate: SidebarSessionDropTarget,
  sourceData: Extract<ReturnType<typeof getSidebarDropData>, { kind: "session" }> | undefined,
): boolean {
  return Boolean(
    sourceData &&
    candidate.kind === "session" &&
    candidate.groupId === sourceData.groupId &&
    candidate.sessionId === sourceData.sessionId,
  );
}

function getSidebarSessionDropTargetFromDropData(
  targetData: ReturnType<typeof getSidebarDropData>,
  point: ReturnType<typeof getClientPoint>,
): SidebarSessionDropTarget | undefined {
  if (targetData?.kind === "session") {
    const sessionElement = getTargetSessionElement(targetData.sessionId, point);
    if (!sessionElement) {
      return undefined;
    }

    const bounds = sessionElement.getBoundingClientRect();
    const relativeY = point?.y ?? bounds.top + bounds.height / 2;
    const position: "after" | "before" =
      relativeY > bounds.top + bounds.height / 2 ? "after" : "before";
    return {
      groupId: targetData.groupId,
      kind: "session",
      position,
      sessionId: targetData.sessionId,
    };
  }

  if (targetData?.kind === "group") {
    const groupElement = document.querySelector<HTMLElement>(
      `[data-sidebar-group-id="${targetData.groupId}"]`,
    );
    if (!groupElement) {
      return undefined;
    }

    const bounds = groupElement.getBoundingClientRect();
    const relativeY = point?.y ?? bounds.top;
    const position: "end" | "start" = relativeY > bounds.top + bounds.height / 2 ? "end" : "start";
    return {
      groupId: targetData.groupId,
      kind: "group",
      position,
    };
  }

  return undefined;
}

function getTargetSessionElement(
  sessionId: string,
  point: ReturnType<typeof getClientPoint>,
): HTMLElement | undefined {
  const selector = `[data-sidebar-session-id="${sessionId}"]`;
  if (point) {
    for (const element of document.elementsFromPoint(point.x, point.y)) {
      const sessionElement = element.closest<HTMLElement>(selector);
      if (sessionElement && sessionElement.dataset.dragging !== "true") {
        return sessionElement;
      }
    }
  }

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
    (sessionElement) => sessionElement.dataset.dragging !== "true",
  );
}

function getDragNativeEvent(value: unknown): Event | undefined {
  return isObjectRecord(value) && value.nativeEvent instanceof Event
    ? value.nativeEvent
    : undefined;
}

function createSessionPointerDragState(
  sourceData: Extract<ReturnType<typeof getSidebarDropData>, { kind: "session" }>,
  pointerDownSessionTarget: SidebarPointerDownSessionTarget | undefined,
  nativeEvent: Event | undefined,
): SidebarSessionPointerDragState {
  const startPoint =
    pointerDownSessionTarget &&
    pointerDownSessionTarget.groupId === sourceData.groupId &&
    pointerDownSessionTarget.sessionId === sourceData.sessionId
      ? pointerDownSessionTarget.point
      : undefined;

  return {
    didMove: hasPointerDragMovedPastThreshold(startPoint, getClientPoint(nativeEvent)),
    startPoint,
  };
}

function updateSessionPointerDragState(
  pointerDragState: SidebarSessionPointerDragState | undefined,
  nativeEvent: Event | undefined,
): void {
  if (!pointerDragState || pointerDragState.didMove) {
    return;
  }

  pointerDragState.didMove = hasPointerDragMovedPastThreshold(
    pointerDragState.startPoint,
    getClientPoint(nativeEvent),
  );
}

function hasPointerDragMovedPastThreshold(
  startPoint: { x: number; y: number } | undefined,
  currentPoint: { x: number; y: number } | undefined,
): boolean {
  if (!startPoint || !currentPoint) {
    return false;
  }

  return (
    Math.hypot(currentPoint.x - startPoint.x, currentPoint.y - startPoint.y) >=
    SIDEBAR_POINTER_DRAG_REORDER_THRESHOLD_PX
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSidebarStartupNow(): number {
  if (typeof performance !== "undefined") {
    return performance.now();
  }

  return Date.now();
}

function getSidebarStartupElapsedMs(startedAt: number): number {
  return Math.round(getSidebarStartupNow() - startedAt);
}

function countSidebarSessions(groups: readonly { sessions: readonly unknown[] }[]): number {
  return groups.reduce((total, group) => total + group.sessions.length, 0);
}

function postSidebarAgentIconBoundaryLog(
  vscode: WebviewApi,
  event: string,
  details: Record<string, unknown>,
): void {
  vscode.postMessage({
    details,
    event,
    type: "sidebarDebugLog",
  });
}

function summarizeSidebarAgentIconsFromGroups(
  groups: readonly {
    groupId: string;
    sessions: readonly {
      agentIcon?: string;
      sessionId: string;
      sessionKind?: string;
    }[];
  }[],
) {
  const sessions = groups.flatMap((group) =>
    group.sessions.map((session) => ({
      agentIcon: session.agentIcon,
      groupId: group.groupId,
      sessionId: session.sessionId,
      sessionKind: session.sessionKind,
    })),
  );

  return summarizeSidebarAgentIconSessions(sessions);
}

function summarizeSidebarAgentIconsFromStore(
  sessionsById: ReturnType<typeof useSidebarStore.getState>["sessionsById"],
) {
  return summarizeSidebarAgentIconSessions(
    Object.values(sessionsById).map((session) => ({
      agentIcon: session.agentIcon,
      sessionId: session.sessionId,
      sessionKind: session.sessionKind,
    })),
  );
}

function summarizeSidebarAgentIconSessions(
  sessions: readonly {
    agentIcon?: string;
    groupId?: string;
    sessionId: string;
    sessionKind?: string;
  }[],
) {
  const agentSessions = sessions.filter((session) => Boolean(session.agentIcon));
  return {
    agentIconSessionCount: agentSessions.length,
    agentSessions: agentSessions.slice(0, 10),
    sessionCount: sessions.length,
  };
}

function createDisplayedSessionIdsByGroup({
  groupIds,
  query,
  sessionIdsByGroup,
  sessionsById,
  shouldFilter,
}: {
  groupIds: readonly string[];
  query: string;
  sessionIdsByGroup: SessionIdsByGroup;
  sessionsById: ReturnType<typeof useSidebarStore.getState>["sessionsById"];
  shouldFilter: boolean;
}): SessionIdsByGroup {
  const displayedSessionIdsByGroup: SessionIdsByGroup = {};

  for (const groupId of groupIds) {
    const sessionIds = sessionIdsByGroup[groupId] ?? [];
    displayedSessionIdsByGroup[groupId] = !shouldFilter
      ? [...sessionIds]
      : filterSessionIdsByQuery(sessionIds, sessionsById, query);
  }

  return displayedSessionIdsByGroup;
}

function filterSessionIdsByQuery(
  sessionIds: readonly string[],
  sessionsById: ReturnType<typeof useSidebarStore.getState>["sessionsById"],
  query: string,
): string[] {
  const sessions = sessionIds.flatMap((sessionId) => {
    const session = sessionsById[sessionId];
    return session ? [session] : [];
  });
  const matchedSessionIds = new Set(
    filterSidebarSessionItems(sessions, query).map((session) => session.sessionId),
  );

  return sessionIds.filter((sessionId) => matchedSessionIds.has(sessionId));
}

function createDisplayedGroupIds(
  groupIds: readonly string[],
  sessionIdsByGroup: SessionIdsByGroup,
  shouldFilter: boolean,
): string[] {
  if (!shouldFilter) {
    return [...groupIds];
  }

  return groupIds.filter((groupId) => (sessionIdsByGroup[groupId] ?? []).length > 0);
}

function isSidebarSearchActivationKey(event: KeyboardEvent): boolean {
  return (
    event.key.length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    /^[\p{L}\p{N}]$/u.test(event.key)
  );
}

function isSidebarSessionSearchNavigationKey(event: KeyboardEvent): boolean {
  return (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Tab")
  );
}

function getSidebarSessionSearchNavigationDirection(event: KeyboardEvent): -1 | 1 {
  return event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey) ? -1 : 1;
}

function isEditableSidebarKeyboardTarget(target: Node): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable]"));
}
