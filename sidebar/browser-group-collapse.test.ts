import { describe, expect, test } from "vitest";
import {
  expandCollapsedGroupsById,
  getBrowserSessionCountsByGroup,
  reconcileCollapsedGroupsById,
} from "./browser-group-collapse";

describe("getBrowserSessionCountsByGroup", () => {
  test("should count browser sessions per browser group", () => {
    expect(
      getBrowserSessionCountsByGroup({
        browserGroupIds: ["browser-tabs", "preview-tabs"],
        sessionIdsByGroup: {
          "browser-tabs": ["browser-1", "browser-2"],
          "preview-tabs": [],
          "workspace-1": ["session-1"],
        },
      }),
    ).toEqual({
      "browser-tabs": 2,
      "preview-tabs": 0,
    });
  });
});

describe("reconcileCollapsedGroupsById", () => {
  test("should drop collapse state for removed groups", () => {
    expect(
      reconcileCollapsedGroupsById({
        browserGroupIds: [],
        groupIds: ["group-1"],
        previousBrowserSessionCountsByGroup: {},
        previousCollapsedGroupsById: {
          "group-1": true,
          "group-2": true,
        },
        sessionIdsByGroup: {
          "group-1": ["session-1"],
        },
      }),
    ).toEqual({
      "group-1": true,
    });
  });

  test("should collapse a newly-seen empty browser group by default", () => {
    expect(
      reconcileCollapsedGroupsById({
        browserGroupIds: ["browser-tabs"],
        groupIds: ["browser-tabs", "group-1"],
        previousBrowserSessionCountsByGroup: {},
        previousCollapsedGroupsById: {},
        sessionIdsByGroup: {
          "browser-tabs": [],
          "group-1": ["session-1"],
        },
      }),
    ).toEqual({
      "browser-tabs": true,
    });
  });

  test("should expand a collapsed browser group when a browser is added", () => {
    expect(
      reconcileCollapsedGroupsById({
        browserGroupIds: ["browser-tabs"],
        groupIds: ["browser-tabs", "group-1"],
        previousBrowserSessionCountsByGroup: {
          "browser-tabs": 0,
        },
        previousCollapsedGroupsById: {
          "browser-tabs": true,
        },
        sessionIdsByGroup: {
          "browser-tabs": ["browser-1"],
          "group-1": ["session-1"],
        },
      }),
    ).toEqual({});
  });

  test("should keep other collapsed groups untouched when browser counts stay flat", () => {
    const collapsedGroupsById = {
      "browser-tabs": true,
      "group-1": true,
    } satisfies Record<string, true>;

    expect(
      reconcileCollapsedGroupsById({
        browserGroupIds: ["browser-tabs"],
        groupIds: ["browser-tabs", "group-1"],
        previousBrowserSessionCountsByGroup: {
          "browser-tabs": 1,
        },
        previousCollapsedGroupsById: collapsedGroupsById,
        sessionIdsByGroup: {
          "browser-tabs": ["browser-1"],
          "group-1": ["session-1"],
        },
      }),
    ).toBe(collapsedGroupsById);
  });
});

describe("expandCollapsedGroupsById", () => {
  test("should expand only the requested groups", () => {
    expect(
      expandCollapsedGroupsById({
        groupIds: ["browser-tabs"],
        previousCollapsedGroupsById: {
          "browser-tabs": true,
          "group-1": true,
        },
      }),
    ).toEqual({
      "group-1": true,
    });
  });

  test("should preserve the same object when nothing changes", () => {
    const collapsedGroupsById = {
      "group-1": true,
    } satisfies Record<string, true>;

    expect(
      expandCollapsedGroupsById({
        groupIds: ["browser-tabs"],
        previousCollapsedGroupsById: collapsedGroupsById,
      }),
    ).toBe(collapsedGroupsById);
  });
});
