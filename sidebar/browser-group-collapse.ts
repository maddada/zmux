type CollapsedGroupsById = Record<string, true>;
type SessionIdsByGroup = Record<string, readonly string[]>;

export function getBrowserSessionCountsByGroup({
  browserGroupIds,
  sessionIdsByGroup,
}: {
  browserGroupIds: readonly string[];
  sessionIdsByGroup: SessionIdsByGroup;
}): Record<string, number> {
  return Object.fromEntries(
    browserGroupIds.map((groupId) => [groupId, (sessionIdsByGroup[groupId] ?? []).length]),
  );
}

export function reconcileCollapsedGroupsById({
  browserGroupIds,
  groupIds,
  previousBrowserSessionCountsByGroup,
  previousCollapsedGroupsById,
  sessionIdsByGroup,
}: {
  browserGroupIds: readonly string[];
  groupIds: readonly string[];
  previousBrowserSessionCountsByGroup: Readonly<Record<string, number>>;
  previousCollapsedGroupsById: CollapsedGroupsById;
  sessionIdsByGroup: SessionIdsByGroup;
}): CollapsedGroupsById {
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

  for (const browserGroupId of browserGroupIds) {
    const previousCount = previousBrowserSessionCountsByGroup[browserGroupId];
    const nextCount = (sessionIdsByGroup[browserGroupId] ?? []).length;

    if (previousCount === undefined && nextCount === 0) {
      if (!next[browserGroupId]) {
        next[browserGroupId] = true;
        changed = true;
      }
      continue;
    }

    if (previousCount !== undefined && nextCount > previousCount && next[browserGroupId]) {
      delete next[browserGroupId];
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
