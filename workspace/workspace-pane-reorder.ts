import type { WorkspacePanelPane } from "../shared/workspace-panel-contract";

export function buildVisiblePaneOrderForDrop(
  currentVisiblePaneIds: readonly string[],
  reorderablePaneIds: readonly string[],
  sourcePaneId: string,
  targetPaneId: string,
): string[] | undefined {
  if (sourcePaneId === targetPaneId) {
    return undefined;
  }

  const reorderableSet = new Set(reorderablePaneIds);
  if (!reorderableSet.has(sourcePaneId) || !reorderableSet.has(targetPaneId)) {
    return undefined;
  }

  const reorderedPaneIds = swapPaneIds(reorderablePaneIds, sourcePaneId, targetPaneId);
  if (!reorderedPaneIds) {
    return undefined;
  }

  let reorderedIndex = 0;
  return currentVisiblePaneIds.map((paneId) =>
    reorderableSet.has(paneId) ? (reorderedPaneIds[reorderedIndex++] ?? paneId) : paneId,
  );
}

export function buildFullSessionOrderFromVisiblePaneOrder(
  allSessionIds: readonly string[],
  nextVisiblePaneIds: readonly string[],
): string[] | undefined {
  const allSessionIdSet = new Set(allSessionIds);
  if (allSessionIdSet.size !== allSessionIds.length) {
    return undefined;
  }

  const visibleSessionIdSet = new Set(nextVisiblePaneIds);
  if (
    visibleSessionIdSet.size !== nextVisiblePaneIds.length ||
    nextVisiblePaneIds.some((sessionId) => !allSessionIdSet.has(sessionId))
  ) {
    return undefined;
  }

  return nextVisiblePaneIds.concat(
    allSessionIds.filter((sessionId) => !visibleSessionIdSet.has(sessionId)),
  );
}

export function sortPanesBySessionIds(
  panes: readonly WorkspacePanelPane[],
  orderedSessionIds: readonly string[],
): WorkspacePanelPane[] {
  if (orderedSessionIds.length === 0) {
    return [...panes];
  }

  const orderBySessionId = new Map(
    orderedSessionIds.map((sessionId, index): [string, number] => [sessionId, index]),
  );

  return [...panes].sort((left, right) => {
    const leftOrder = orderBySessionId.get(left.sessionId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderBySessionId.get(right.sessionId) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

export function sortVisiblePanesBySlotIndex(
  panes: readonly WorkspacePanelPane[],
): WorkspacePanelPane[] {
  return [...panes].sort((left, right) => {
    const leftSlotIndex =
      typeof left.visibleSlotIndex === "number" ? left.visibleSlotIndex : Number.MAX_SAFE_INTEGER;
    const rightSlotIndex =
      typeof right.visibleSlotIndex === "number" ? right.visibleSlotIndex : Number.MAX_SAFE_INTEGER;
    return leftSlotIndex - rightSlotIndex;
  });
}

function swapPaneIds(
  paneIds: readonly string[],
  sourcePaneId: string,
  targetPaneId: string,
): string[] | undefined {
  const sourceIndex = paneIds.indexOf(sourcePaneId);
  const targetIndex = paneIds.indexOf(targetPaneId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return undefined;
  }

  const nextPaneIds = [...paneIds];
  nextPaneIds[sourceIndex] = targetPaneId;
  nextPaneIds[targetIndex] = sourcePaneId;
  return nextPaneIds;
}
