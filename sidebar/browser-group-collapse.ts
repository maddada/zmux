type CollapsedGroupsById = Record<string, true>;
type SessionIdsByGroup = Record<string, readonly string[]>;

export function getBrowserSessionCountsByGroup({
  browserGroupIds,
  sessionIdsByGroup,
}: {
  browserGroupIds: readonly string[];
  sessionIdsByGroup: SessionIdsByGroup;
}): Record<string, number> {
  return getSessionCountsByGroup({
    groupIds: browserGroupIds,
    sessionIdsByGroup,
  });
}

export function getSessionCountsByGroup({
  groupIds,
  sessionIdsByGroup,
}: {
  groupIds: readonly string[];
  sessionIdsByGroup: SessionIdsByGroup;
}): Record<string, number> {
  return Object.fromEntries(
    groupIds.map((groupId) => [groupId, (sessionIdsByGroup[groupId] ?? []).length]),
  );
}

export function reconcileCollapsedGroupsById({
  autoCollapseGroupIds,
  browserGroupIds,
  collapseBlockedGroupIds = [],
  groupIds,
  previousBrowserSessionCountsByGroup,
  previousCollapsedGroupsById,
  sessionIdsByGroup,
}: {
  autoCollapseGroupIds?: readonly string[];
  browserGroupIds: readonly string[];
  collapseBlockedGroupIds?: readonly string[];
  groupIds: readonly string[];
  previousBrowserSessionCountsByGroup: Readonly<Record<string, number>>;
  previousCollapsedGroupsById: CollapsedGroupsById;
  sessionIdsByGroup: SessionIdsByGroup;
}): CollapsedGroupsById {
  const blockedGroupIds = new Set(collapseBlockedGroupIds);
  const validGroupIds = new Set(groupIds);
  let changed = false;
  const next: CollapsedGroupsById = {};

  for (const [groupId, collapsed] of Object.entries(previousCollapsedGroupsById)) {
    if (!validGroupIds.has(groupId)) {
      changed = true;
      continue;
    }

    next[groupId] = collapsed;
  }

  /**
   * CDXC:SidebarGroups 2026-05-05-04:48
   * Empty Combined-mode project and Chats sections behave like browser groups:
   * they stay collapsed while empty, expand when a session/chat appears, and
   * collapse again when their last session disappears. Preserve manual
   * collapse for non-empty groups unless their session count increases.
   */
  for (const groupId of new Set(autoCollapseGroupIds ?? browserGroupIds)) {
    const previousCount = previousBrowserSessionCountsByGroup[groupId];
    const nextCount = (sessionIdsByGroup[groupId] ?? []).length;

    if (nextCount === 0) {
      if (blockedGroupIds.has(groupId)) {
        continue;
      }

      if (!next[groupId]) {
        next[groupId] = true;
        changed = true;
      }
      continue;
    }

    if (previousCount !== undefined && nextCount > previousCount && next[groupId]) {
      delete next[groupId];
      changed = true;
    }
  }

  return changed ? next : previousCollapsedGroupsById;
}

export function expandCollapsedGroupsById({
  groupIds,
  previousCollapsedGroupsById,
}: {
  groupIds: readonly string[];
  previousCollapsedGroupsById: CollapsedGroupsById;
}): CollapsedGroupsById {
  if (groupIds.length === 0) {
    return previousCollapsedGroupsById;
  }

  let changed = false;
  const next = { ...previousCollapsedGroupsById };

  for (const groupId of groupIds) {
    if (!next[groupId]) {
      continue;
    }

    delete next[groupId];
    changed = true;
  }

  return changed ? next : previousCollapsedGroupsById;
}
