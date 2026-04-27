import { describe, expect, test } from "vite-plus/test";
import {
  createGroupDropData,
  createSessionDropTargetData,
  createSessionDragData,
  getSidebarDropData,
  getSidebarSessionDropTarget,
  getSidebarSessionDropTargetAtPoint,
  moveSessionIdsByDropTarget,
  type SidebarSessionDropTarget,
} from "./sidebar-dnd";

describe("getSidebarDropData", () => {
  test("should parse session and group drop payloads", () => {
    expect(getSidebarDropData({ data: createSessionDragData("group-1", "session-1") })).toEqual({
      groupId: "group-1",
      kind: "session",
      sessionId: "session-1",
    });

    expect(getSidebarDropData({ data: createGroupDropData("group-2") })).toEqual({
      groupId: "group-2",
      kind: "group",
    });

    expect(
      getSidebarDropData({
        data: createSessionDropTargetData({
          groupId: "group-2",
          kind: "session",
          position: "after",
          sessionId: "session-9",
        }),
      }),
    ).toEqual({
      dropTarget: {
        groupId: "group-2",
        kind: "session",
        position: "after",
        sessionId: "session-9",
      },
      kind: "session-drop-target",
    });
  });
});

describe("getSidebarSessionDropTarget", () => {
  test("should read explicit session drop target payloads", () => {
    expect(
      getSidebarSessionDropTarget(
        getSidebarDropData({
          data: createSessionDropTargetData({
            groupId: "group-1",
            kind: "session",
            position: "before",
            sessionId: "session-2",
          }),
        }),
      ),
    ).toEqual({
      groupId: "group-1",
      kind: "session",
      position: "before",
      sessionId: "session-2",
    });
  });
});

describe("moveSessionIdsByDropTarget", () => {
  test("should move a session into an empty group", () => {
    const nextSessionIdsByGroup = moveSessionIdsByDropTarget(
      {
        "group-1": ["session-1"],
        "group-2": [],
      },
      "session-1",
      {
        groupId: "group-2",
        kind: "group",
        position: "start",
      },
    );

    expect(nextSessionIdsByGroup).toEqual({
      "group-1": [],
      "group-2": ["session-1"],
    });
  });

  test("should leave the order unchanged when dropping a session on itself", () => {
    const sessionIdsByGroup = {
      "group-1": ["session-1", "session-2"],
    };

    const nextSessionIdsByGroup = moveSessionIdsByDropTarget(sessionIdsByGroup, "session-1", {
      groupId: "group-1",
      kind: "session",
      position: "before",
      sessionId: "session-1",
    });

    expect(nextSessionIdsByGroup).toBe(sessionIdsByGroup);
  });

  test("should insert after the hovered session in another group", () => {
    const nextSessionIdsByGroup = moveSessionIdsByDropTarget(
      {
        "group-1": ["session-1"],
        "group-2": ["session-2", "session-3"],
      },
      "session-1",
      {
        groupId: "group-2",
        kind: "session",
        position: "after",
        sessionId: "session-2",
      } satisfies SidebarSessionDropTarget,
    );

    expect(nextSessionIdsByGroup).toEqual({
      "group-1": [],
      "group-2": ["session-2", "session-1", "session-3"],
    });
  });
});

describe("getSidebarSessionDropTargetAtPoint", () => {
  test("should skip dragging elements and resolve the non-dragging session underneath", () => {
    const groupElement = createMockElement({
      dataset: { sidebarGroupId: "group-1" },
    }) as HTMLElement;
    const sessionElement = createMockElement({
      closestMap: new Map([["[data-sidebar-group-id]", groupElement]]),
      dataset: { sidebarSessionId: "session-2" },
      getBoundingClientRect: () => ({ height: 40, top: 100 }),
    }) as HTMLElement;
    const draggingSessionElement = createMockElement({
      closestMap: new Map([["[data-dragging='true']", {} as HTMLElement]]),
    });
    const targetSessionElement = createMockElement({
      closestMap: new Map([
        ["[data-dragging='true']", null],
        ["[data-sidebar-session-id]", sessionElement],
      ]),
    });

    const dropTarget = getSidebarSessionDropTargetAtPoint(
      {
        elementFromPoint: () => draggingSessionElement,
        elementsFromPoint: () => [draggingSessionElement, targetSessionElement],
      },
      50,
      130,
    );

    expect(dropTarget).toEqual({
      groupId: "group-1",
      kind: "session",
      position: "after",
      sessionId: "session-2",
    });
  });
});

function createMockElement({
  closestMap = new Map(),
  dataset,
  getBoundingClientRect,
}: {
  closestMap?: ReadonlyMap<string, Element | null>;
  dataset?: Record<string, string>;
  getBoundingClientRect?: () => { height: number; top: number };
}): Element {
  return {
    dataset,
    closest(selector: string) {
      return closestMap.get(selector) ?? null;
    },
    getBoundingClientRect,
  } as unknown as Element;
}
