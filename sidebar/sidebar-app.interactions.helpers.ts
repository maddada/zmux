import { expect, fireEvent, waitFor } from "storybook/test";
import type { SidebarToExtensionMessage } from "../shared/session-grid-contract";
import { getSidebarStoryMessages, resetSidebarStoryMessages } from "./sidebar-story-harness";

export async function waitForReadyMessage() {
  await waitFor(() => {
    return expect(getSidebarStoryMessages().some((message) => message.type === "ready")).toBe(true);
  });
}

export async function expectMessage(expectedMessage: Partial<SidebarToExtensionMessage>) {
  await waitFor(() => {
    return expect(
      getSidebarStoryMessages().some((message) => isSubsetMatch(message, expectedMessage)),
    ).toBe(true);
  });
}

export async function dragAndDrop(source: HTMLElement, target: HTMLElement) {
  const dragState = await dragToHover(source, target);
  await releaseDrag(target, dragState);
}

export async function dragToHover(source: HTMLElement, target: HTMLElement) {
  const sourcePosition = getCenter(source);
  const targetPosition = getCenter(target);
  const pointerData = {
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 1,
    pointerType: "mouse",
  };

  await fireEvent.pointerDown(source, {
    ...pointerData,
    bubbles: true,
    clientX: sourcePosition.x,
    clientY: sourcePosition.y,
  });
  await delay(250);
  await fireEvent.pointerMove(source.ownerDocument, {
    ...pointerData,
    bubbles: true,
    clientX: sourcePosition.x + 2,
    clientY: sourcePosition.y + 2,
  });
  await nextFrame(source.ownerDocument.defaultView);
  await fireEvent.pointerMove(target, {
    ...pointerData,
    bubbles: true,
    clientX: targetPosition.x,
    clientY: targetPosition.y,
  });
  await nextFrame(source.ownerDocument.defaultView);

  return { pointerData, targetPosition };
}

export async function releaseDrag(
  target: HTMLElement,
  dragState: {
    pointerData: {
      button: number;
      buttons: number;
      isPrimary: boolean;
      pointerId: number;
      pointerType: string;
    };
    targetPosition: { x: number; y: number };
  },
) {
  await fireEvent.pointerUp(target, {
    ...dragState.pointerData,
    buttons: 0,
    bubbles: true,
    clientX: dragState.targetPosition.x,
    clientY: dragState.targetPosition.y,
  });
  await nextFrame(target.ownerDocument.defaultView);
}

export async function openContextMenu(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  await fireEvent.contextMenu(element, {
    bubbles: true,
    clientX: bounds.left + bounds.width / 2,
    clientY: bounds.top + 12,
  });
}

export async function dragSessionToGroup(root: ParentNode, sessionId: string, groupId: string) {
  resetSidebarStoryMessages();
  await dragAndDrop(
    await findRequiredElement(
      root,
      `[data-sidebar-session-id="${sessionId}"]`,
      `${sessionId} card`,
    ),
    await findRequiredElement(root, `[data-sidebar-group-id="${groupId}"]`, `${groupId} section`),
  );
  await expectMessage({
    groupId,
    sessionId,
    targetIndex: 0,
    type: "moveSessionToGroup",
  });
}

export async function expectSessionMembership(
  root: ParentNode,
  groupId: string,
  expectedSessionIds: readonly string[],
) {
  await waitFor(() => {
    const groupSessionIds = Array.from(
      root.querySelectorAll(`[data-sidebar-group-id="${groupId}"] [data-sidebar-session-id]`),
    ).map((element) => element.getAttribute("data-sidebar-session-id"));

    return expect(groupSessionIds).toEqual(expectedSessionIds);
  });
}

export async function findRequiredElement(
  root: ParentNode,
  selector: string,
  description: string,
) {
  let matchedElement: HTMLElement | undefined;

  await waitFor(() => {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Could not find ${description} with selector: ${selector}`);
    }

    matchedElement = element;
    return expect(element).toBeTruthy();
  });

  if (!matchedElement) {
    throw new Error(`Could not find ${description} with selector: ${selector}`);
  }

  return matchedElement;
}

function getCenter(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

async function delay(durationMs: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function nextFrame(windowLike: Window | null) {
  await new Promise((resolve) => {
    if (!windowLike || typeof windowLike.requestAnimationFrame !== "function") {
      setTimeout(resolve, 0);
      return;
    }

    windowLike.requestAnimationFrame(() => {
      resolve(undefined);
    });
  });
}

function isSubsetMatch(
  actualMessage: SidebarToExtensionMessage,
  expectedMessage: Partial<SidebarToExtensionMessage>,
) {
  return Object.entries(expectedMessage).every(([key, value]) => {
    const actualValue = actualMessage[key as keyof SidebarToExtensionMessage];
    return Array.isArray(value)
      ? JSON.stringify(actualValue) === JSON.stringify(value)
      : actualValue === value;
  });
}
