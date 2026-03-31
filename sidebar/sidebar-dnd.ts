type SessionDragData = {
  groupId: string;
  kind: "session";
  sessionId: string;
};

type GroupDropData = {
  groupId: string;
  kind: "group";
};

type CreateGroupDropData = {
  kind: "create-group";
};

export type SidebarDropData = SessionDragData | GroupDropData | CreateGroupDropData;

export type SidebarSessionDropTarget =
  | {
      groupId: string;
      kind: "group";
      position: "start" | "end";
    }
  | {
      groupId: string;
      kind: "session";
      position: "before" | "after";
      sessionId: string;
    };

const SIDEBAR_GROUP_SELECTOR = "[data-sidebar-group-id]";
const SIDEBAR_SESSION_SELECTOR = "[data-sidebar-session-id]";

export function createSessionDragData(groupId: string, sessionId: string): SessionDragData {
  return {
    groupId,
    kind: "session",
    sessionId,
  };
}

export function createGroupDropData(groupId: string): GroupDropData {
  return {
    groupId,
    kind: "group",
  };
}

export function createCreateGroupDropData(): CreateGroupDropData {
  return {
    kind: "create-group",
  };
}

export function getSidebarDropData(candidate: unknown): SidebarDropData | undefined {
  if (!hasData(candidate)) {
    return undefined;
  }

  const data = candidate.data;
  if (!isObjectRecord(data) || !("kind" in data)) {
    return undefined;
  }

  switch (data.kind) {
    case "session":
      return typeof data.groupId === "string" && typeof data.sessionId === "string"
        ? {
            groupId: data.groupId,
            kind: "session",
            sessionId: data.sessionId,
          }
        : undefined;

    case "group":
      return typeof data.groupId === "string"
        ? {
            groupId: data.groupId,
            kind: "group",
          }
        : undefined;

    case "create-group":
      return { kind: "create-group" };

    default:
      return undefined;
  }
}

export function getClientPoint(
  event: Event | null | undefined,
): { x: number; y: number } | undefined {
  if (
    !event ||
    !("clientX" in event) ||
    !("clientY" in event) ||
    typeof event.clientX !== "number" ||
    typeof event.clientY !== "number"
  ) {
    return undefined;
  }

  return {
    x: event.clientX,
    y: event.clientY,
  };
}

export function getSidebarSessionDropTargetAtPoint(
  documentLike: Pick<Document, "elementFromPoint"> &
    Partial<Pick<Document, "elementsFromPoint">>,
  x: number,
  y: number,
): SidebarSessionDropTarget | undefined {
  const elements =
    typeof documentLike.elementsFromPoint === "function"
      ? documentLike.elementsFromPoint(x, y)
      : [documentLike.elementFromPoint(x, y)];

  for (const element of elements) {
    if (!isDomElement(element) || isDraggingElement(element)) {
      continue;
    }

    const target = getSidebarSessionDropTargetFromElement(element, y);
    if (target) {
      return target;
    }
  }

  return undefined;
}

export function getSidebarSessionDropTargetFromEvent(
  event: Event | null | undefined,
): SidebarSessionDropTarget | undefined {
  const point = getClientPoint(event);
  const target = event?.target;
  const element = target instanceof Element ? target : undefined;
  if (!element) {
    return undefined;
  }

  return getSidebarSessionDropTargetFromElement(element, point?.y);
}

export function moveSessionIdsByDropTarget(
  sessionIdsByGroup: Record<string, string[]>,
  sessionId: string,
  target: SidebarSessionDropTarget,
): Record<string, string[]> {
  const sourceGroupId = findSessionGroupId(sessionIdsByGroup, sessionId);
  if (!sourceGroupId) {
    return sessionIdsByGroup;
  }

  const sourceSessionIds = sessionIdsByGroup[sourceGroupId];
  if (!sourceSessionIds) {
    return sessionIdsByGroup;
  }

  const sourceIndex = sourceSessionIds.indexOf(sessionId);
  if (sourceIndex < 0) {
    return sessionIdsByGroup;
  }

  const targetSessionIds = sessionIdsByGroup[target.groupId];
  if (!targetSessionIds) {
    return sessionIdsByGroup;
  }

  const targetIndex = getTargetInsertIndex(targetSessionIds, target);
  if (targetIndex === undefined) {
    return sessionIdsByGroup;
  }

  if (sourceGroupId === target.groupId) {
    const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    if (adjustedTargetIndex === sourceIndex) {
      return sessionIdsByGroup;
    }

    const nextSessionIds = [...sourceSessionIds];
    nextSessionIds.splice(sourceIndex, 1);
    nextSessionIds.splice(
      clampIndex(adjustedTargetIndex, nextSessionIds.length),
      0,
      sessionId,
    );

    return {
      ...sessionIdsByGroup,
      [sourceGroupId]: nextSessionIds,
    };
  }

  const nextSourceSessionIds = sourceSessionIds.filter((candidate) => candidate !== sessionId);
  const nextTargetSessionIds = [...targetSessionIds];
  nextTargetSessionIds.splice(clampIndex(targetIndex, nextTargetSessionIds.length), 0, sessionId);

  return {
    ...sessionIdsByGroup,
    [sourceGroupId]: nextSourceSessionIds,
    [target.groupId]: nextTargetSessionIds,
  };
}

function getTargetInsertIndex(
  targetSessionIds: readonly string[],
  target: SidebarSessionDropTarget,
): number | undefined {
  if (target.kind === "group") {
    return target.position === "end" ? targetSessionIds.length : 0;
  }

  const hoveredSessionIndex = targetSessionIds.indexOf(target.sessionId);
  if (hoveredSessionIndex < 0) {
    return undefined;
  }

  return hoveredSessionIndex + (target.position === "after" ? 1 : 0);
}

function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(index, max));
}

function findSessionGroupId(
  sessionIdsByGroup: Record<string, readonly string[]>,
  sessionId: string,
): string | undefined {
  return Object.entries(sessionIdsByGroup).find(([, sessionIds]) =>
    sessionIds.includes(sessionId),
  )?.[0];
}

function getSidebarSessionDropTargetFromElement(
  element: Element,
  clientY: number | undefined,
): SidebarSessionDropTarget | undefined {
  const sessionElement = element.closest<HTMLElement>(SIDEBAR_SESSION_SELECTOR);
  if (sessionElement) {
    const groupElement = sessionElement.closest<HTMLElement>(SIDEBAR_GROUP_SELECTOR);
    const groupId = groupElement?.dataset.sidebarGroupId;
    const sessionId = sessionElement.dataset.sidebarSessionId;
    if (groupId && sessionId) {
      const bounds = sessionElement.getBoundingClientRect();
      const relativeY = clientY ?? bounds.top + bounds.height / 2;
      return {
        groupId,
        kind: "session",
        position: relativeY > bounds.top + bounds.height / 2 ? "after" : "before",
        sessionId,
      };
    }
  }

  const groupElement = element.closest<HTMLElement>(SIDEBAR_GROUP_SELECTOR);
  const groupId = groupElement?.dataset.sidebarGroupId;
  if (!groupId) {
    return undefined;
  }

  const bounds = groupElement.getBoundingClientRect();
  const relativeY = clientY ?? bounds.top + bounds.height / 2;
  return {
    groupId,
    kind: "group",
    position: relativeY > bounds.top + bounds.height / 2 ? "end" : "start",
  };
}

function hasData(candidate: unknown): candidate is { data?: unknown } {
  return isObjectRecord(candidate) && "data" in candidate;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDraggingElement(element: Element): boolean {
  return element.closest<HTMLElement>("[data-dragging='true']") !== null;
}

function isDomElement(candidate: unknown): candidate is Element {
  return typeof candidate === "object" && candidate !== null && "closest" in candidate;
}
