import Fuse, { type IFuseOptions } from "fuse.js";
import type { SidebarRecentProject } from "../shared/session-grid-contract";

type RecentProjectSearchRecord = {
  itemIndex: number;
  searchText: string;
};

const RECENT_PROJECT_SEARCH_OPTIONS = {
  ignoreDiacritics: true,
  ignoreLocation: true,
  keys: ["searchText"],
  shouldSort: false,
  threshold: 0.3,
  useTokenSearch: true,
} satisfies IFuseOptions<RecentProjectSearchRecord>;

export function filterRecentProjects(
  projects: readonly SidebarRecentProject[],
  query: string,
): SidebarRecentProject[] {
  const normalizedQuery = normalizeRecentProjectSearchValue(query);
  if (!normalizedQuery) {
    return [...projects];
  }

  /**
   * CDXC:RecentProjects 2026-05-04-14:25
   * The Recent Projects drawer needs lightweight fuzzy search across project
   * names and paths without changing the native-provided recency order.
   */
  const searchRecords = projects.map((project, itemIndex) => ({
    itemIndex,
    searchText: [project.title, project.path]
      .map((part) => normalizeRecentProjectSearchValue(part))
      .filter(Boolean)
      .join(" "),
  }));
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const shouldUseAbbreviationMatching =
    queryTokens.length > 0 && queryTokens.every((token) => token.length <= 3);
  if (shouldUseAbbreviationMatching) {
    return projects.filter((_, itemIndex) =>
      matchesNormalizedQueryTokens(searchRecords[itemIndex]?.searchText ?? "", queryTokens),
    );
  }

  const fuse = new Fuse(searchRecords, RECENT_PROJECT_SEARCH_OPTIONS);
  const matchedItemIndexes = new Set(
    fuse.search(normalizedQuery).map((result) => result.item.itemIndex),
  );

  return projects.filter((_, itemIndex) => matchedItemIndexes.has(itemIndex));
}

function matchesNormalizedQueryTokens(searchText: string, queryTokens: readonly string[]): boolean {
  return queryTokens.every((token) => fuzzyIncludes(searchText, token));
}

function fuzzyIncludes(text: string, query: string): boolean {
  let queryIndex = 0;

  for (const character of text) {
    if (character !== query[queryIndex]) {
      continue;
    }

    queryIndex += 1;
    if (queryIndex >= query.length) {
      return true;
    }
  }

  return query.length === 0;
}

function normalizeRecentProjectSearchValue(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_/\\.]+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
