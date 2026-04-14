import { n as e } from "./chunk-BneVvdWh.js";
import {
  a as t,
  c as n,
  i as r,
  l as i,
  n as a,
  r as o,
  t as s,
  u as c,
} from "./sidebar-story-meta-CCC66m2m.js";
async function l() {
  (await E(() => w(n().some((e) => e.type === `ready`)).toBe(!0), { timeout: 3e3 }),
    await E(
      () => {
        let e = document.body.querySelector(`.stack`),
          t = document.body.querySelector(`[data-sidebar-group-id]`);
        (w(e).toBeTruthy(), w(e).toHaveAttribute(`data-dimmed`, `false`), w(t).toBeTruthy());
      },
      { timeout: 3e3 },
    ),
    await S(window));
}
async function u(e) {
  await E(() => w(n().some((t) => C(t, e))).toBe(!0));
}
async function d(e, t = 50) {
  (await x(t), w(n().some((t) => C(t, e))).toBe(!1));
}
async function f(e, t, n = `center`) {
  await m(t, await p(e, t, n));
}
async function p(e, t, n = `center`) {
  let r = y(e),
    i = b(t, n),
    a = { button: 0, buttons: 1, isPrimary: !0, pointerId: 1, pointerType: `mouse` };
  return (
    await T.pointerDown(e, { ...a, bubbles: !0, clientX: r.x, clientY: r.y }),
    await x(250),
    await T.pointerMove(e.ownerDocument, { ...a, bubbles: !0, clientX: r.x + 2, clientY: r.y + 2 }),
    await S(e.ownerDocument.defaultView),
    await T.pointerMove(t, { ...a, bubbles: !0, clientX: i.x, clientY: i.y }),
    await S(e.ownerDocument.defaultView),
    { pointerData: a, targetPosition: i }
  );
}
async function m(e, t) {
  (await T.pointerUp(e, {
    ...t.pointerData,
    buttons: 0,
    bubbles: !0,
    clientX: t.targetPosition.x,
    clientY: t.targetPosition.y,
  }),
    await S(e.ownerDocument.defaultView));
}
async function h(e) {
  let t = e.getBoundingClientRect();
  await T.contextMenu(e, { bubbles: !0, clientX: t.left + t.width / 2, clientY: t.top + 12 });
}
async function g(e, t, n) {
  c();
  let r = e.querySelector(`[data-sidebar-group-id="${n}"] [data-sidebar-session-id]`);
  (await f(
    await v(e, `[data-sidebar-session-id="${t}"]`, `${t} card`),
    r instanceof HTMLElement
      ? r
      : await v(e, `[data-sidebar-group-id="${n}"] .group-empty-state`, `${n} empty state`),
    r instanceof HTMLElement ? `before` : `center`,
  ),
    await u({ groupId: n, sessionId: t, targetIndex: 0, type: `moveSessionToGroup` }));
}
async function _(e, t, n) {
  await E(() =>
    w(
      Array.from(
        e.querySelectorAll(`[data-sidebar-group-id="${t}"] [data-sidebar-session-id]`),
      ).map((e) => e.getAttribute(`data-sidebar-session-id`)),
    ).toEqual(n),
  );
}
async function v(e, t, n) {
  let r;
  if (
    (await E(() => {
      let i = e.querySelector(t);
      if (!(i instanceof HTMLElement)) throw Error(`Could not find ${n} with selector: ${t}`);
      return ((r = i), w(i).toBeTruthy());
    }),
    !r)
  )
    throw Error(`Could not find ${n} with selector: ${t}`);
  return r;
}
function y(e) {
  let t = e.getBoundingClientRect();
  return { x: t.left + t.width / 2, y: t.top + t.height / 2 };
}
function b(e, t) {
  let n = e.getBoundingClientRect(),
    r = n.left + n.width / 2;
  return t === `before`
    ? { x: r, y: n.top + n.height * 0.25 }
    : t === `after`
      ? { x: r, y: n.top + n.height * 0.75 }
      : { x: r, y: n.top + n.height / 2 };
}
async function x(e) {
  await new Promise((t) => {
    setTimeout(t, e);
  });
}
async function S(e) {
  await new Promise((t) => {
    if (!e || typeof e.requestAnimationFrame != `function`) {
      setTimeout(t, 0);
      return;
    }
    e.requestAnimationFrame(() => {
      t(void 0);
    });
  });
}
function C(e, t) {
  return Object.entries(t).every(([t, n]) => {
    let r = e[t];
    return Array.isArray(n) ? JSON.stringify(r) === JSON.stringify(n) : r === n;
  });
}
var w,
  T,
  E,
  D = e(() => {
    (i(), ({ expect: w, fireEvent: T, waitFor: E } = __STORYBOOK_MODULE_TEST__));
  }),
  O,
  k,
  A,
  j,
  M,
  N,
  P,
  F,
  I,
  L,
  R,
  z;
e(() => {
  (i(),
    D(),
    r(),
    ({ expect: O, waitFor: k, within: A } = __STORYBOOK_MODULE_TEST__),
    (j = { title: `Sidebar/Interactions`, args: s, argTypes: a, decorators: o, render: t }),
    (M = {
      args: { highlightedVisibleCount: 2, visibleCount: 2 },
      play: async ({ canvas: e, canvasElement: t, step: n, userEvent: r }) => {
        let i = A(t.ownerDocument.body);
        (await l(),
          c(),
          await n(`remove the global new session button`, async () => {
            await O(e.queryByRole(`button`, { name: `New Session` })).toBeNull();
          }),
          await n(`request a new session inside a group`, async () => {
            (await r.click(e.getByRole(`button`, { name: `Create a session in Group 4` })),
              await u({ groupId: `group-4`, type: `createSessionInGroup` }));
          }),
          await n(`toggle sessions shown`, async () => {
            (c(),
              await r.click(e.getByRole(`button`, { name: `Select split count for Group 4` })),
              await r.click(await i.findByRole(`menuitem`, { name: `Show 2 splits` })),
              await u({ type: `setVisibleCount`, visibleCount: 2 }));
          }),
          await n(`keep the split menu available on right click`, async () => {
            (c(),
              await h(e.getByRole(`button`, { name: `Select split count for Group 4` })),
              await i.findByRole(`menuitem`, { name: `Show 3 splits` }),
              await i.findByRole(`menuitem`, { name: `Show 4 splits` }),
              await i.findByRole(`menuitem`, { name: `Show 6 splits` }),
              await i.findByRole(`menuitem`, { name: `Show 9 splits` }),
              await r.click(await i.findByRole(`menuitem`, { name: `Show 4 splits` })),
              await u({ type: `setVisibleCount`, visibleCount: 4 }));
          }),
          await n(`keep the layout selector hidden`, async () => {
            await O(
              e.queryByRole(`button`, { name: `Open layout options for Group 4` }),
            ).toBeNull();
          }),
          await n(`open sidebar settings`, async () => {
            (c(),
              await r.click(e.getByRole(`button`, { name: `Open sidebar menu` })),
              await r.click(await i.findByRole(`menuitem`, { name: `Sidebar Settings` })),
              await u({ type: `openSettings` }));
          }));
      },
    }),
    (N = {
      play: async ({ canvas: e, canvasElement: t, step: n, userEvent: r }) => {
        let i = t.ownerDocument,
          a = A(i.body),
          o = () => e.findByRole(`button`, { name: /Harbor Vale/i });
        (await l(),
          c(),
          await n(`focus a session from its card`, async () => {
            let e = await o();
            (await r.click(e), await u({ sessionId: `session-3`, type: `focusSession` }));
          }),
          await n(`rename a session from the hover button`, async () => {
            c();
            let e = await o();
            await r.hover(e);
            let t = e.closest(`.session-frame`);
            if (!(t instanceof HTMLElement))
              throw Error(`Expected hovered session card to be wrapped by .session-frame`);
            (await r.click(A(t).getByRole(`button`, { name: `Rename session` })),
              await u({ sessionId: `session-3`, type: `promptRenameSession` }));
          }),
          await n(`rename through the session context menu`, async () => {
            (c(),
              await h(await o()),
              await r.click(await a.findByRole(`menuitem`, { name: `Rename` })),
              await u({ sessionId: `session-3`, type: `promptRenameSession` }));
          }),
          await n(`copy a resume command through the session context menu`, async () => {
            (c(),
              await h(await o()),
              await r.click(await a.findByRole(`menuitem`, { name: `Copy resume` })),
              await u({ sessionId: `session-3`, type: `copyResumeCommand` }));
          }),
          await n(`terminate through the session context menu`, async () => {
            (c(),
              await h(await o()),
              await r.click(await a.findByRole(`menuitem`, { name: `Terminate` })),
              await u({ sessionId: `session-3`, type: `closeSession` }));
          }));
      },
    }),
    (P = {
      play: async ({ canvas: e, canvasElement: t, step: n }) => {
        let r = t.ownerDocument.body;
        await l();
        let i = await v(r, `[data-sidebar-session-id="session-1"]`, `session-1 card`),
          a = await v(r, `[data-sidebar-session-id="session-2"]`, `session-2 card`),
          o = await v(r, `[data-sidebar-session-id="session-4"]`, `session-4 card`),
          s = await v(r, `[data-sidebar-session-id="session-5"]`, `session-5 card`);
        (c(),
          await n(`keep each group-2 frame mapped to a single session while hovering`, async () => {
            let e = await p(o, s);
            (await k(() =>
              O(
                Array.from(
                  r.querySelectorAll(`[data-sidebar-group-id="group-2"] .session-frame`),
                ).map((e) => e.querySelectorAll(`.session`).length),
              ).toEqual([1, 1]),
            ),
              await m(s, e));
          }),
          await n(`reorder sessions inside a group`, async () => {
            (await m(a, await p(i, a, `after`)),
              await u({
                groupId: `group-1`,
                sessionIds: [`session-2`, `session-1`, `session-3`],
                type: `syncSessionOrder`,
              }),
              await O(
                e.getAllByRole(`button`, {
                  name: /show title in 2nd row|layout drift fix|Harbor Vale/i,
                })[0],
              ).toHaveTextContent(`layout drift fix`));
          }));
      },
    }),
    (F = {
      play: async ({ canvasElement: e, step: t }) => {
        let n = e.ownerDocument.body;
        await l();
        let r = await v(n, `[data-sidebar-session-id="session-3"]`, `session-3 card`),
          i = await v(n, `[data-sidebar-session-id="session-4"]`, `session-4 card`);
        (c(),
          await t(`move a session into another group at the hovered slot`, async () => {
            (await f(r, i),
              await u({
                groupId: `group-2`,
                sessionId: `session-3`,
                targetIndex: 0,
                type: `moveSessionToGroup`,
              }),
              await _(n, `group-1`, [`session-1`, `session-2`]),
              await _(n, `group-2`, [`session-3`, `session-4`, `session-5`]));
          }));
      },
    }),
    (I = {
      play: async ({ canvasElement: e, step: t }) => {
        let n = e.ownerDocument.body;
        (await l(),
          await t(`move the same session back and forth across groups`, async () => {
            (await g(n, `session-3`, `group-2`),
              await _(n, `group-2`, [`session-3`, `session-4`, `session-5`]),
              await g(n, `session-3`, `group-1`),
              await _(n, `group-1`, [`session-3`, `session-1`, `session-2`]),
              await _(n, `group-2`, [`session-4`, `session-5`]));
          }));
      },
    }),
    (L = {
      args: { fixture: `three-groups-stress`, highlightedVisibleCount: 2, visibleCount: 2 },
      play: async ({ canvasElement: e, step: t }) => {
        let n = e.ownerDocument.body;
        (await l(),
          await t(`move sessions across three groups until groups empty and refill`, async () => {
            (await g(n, `session-2`, `group-2`),
              await _(n, `group-1`, [`session-1`]),
              await _(n, `group-2`, [`session-2`, `session-3`, `session-4`]),
              await g(n, `session-1`, `group-3`),
              await _(n, `group-1`, []),
              await _(n, `group-3`, [`session-1`, `session-5`, `session-6`]),
              await g(n, `session-3`, `group-1`),
              await _(n, `group-1`, [`session-3`]),
              await _(n, `group-2`, [`session-2`, `session-4`]),
              await g(n, `session-5`, `group-1`),
              await _(n, `group-1`, [`session-3`, `session-5`]),
              await _(n, `group-3`, [`session-1`, `session-6`]),
              await g(n, `session-4`, `group-3`),
              await _(n, `group-2`, [`session-2`]),
              await _(n, `group-3`, [`session-1`, `session-4`, `session-6`]),
              await g(n, `session-2`, `group-1`),
              await _(n, `group-1`, [`session-2`, `session-3`, `session-5`]),
              await _(n, `group-2`, []));
          }));
      },
    }),
    (R = {
      args: { fixture: `empty-groups` },
      play: async ({ canvasElement: e, step: t }) => {
        let n = e.ownerDocument.body;
        (await l(),
          await t(`move a session into an empty group`, async () => {
            (c(),
              await f(
                await v(n, `[data-sidebar-session-id="session-1"]`, `session-1 card`),
                await v(
                  n,
                  `[data-sidebar-group-id="group-2"] .group-empty-state`,
                  `group-2 empty state`,
                ),
              ),
              await u({
                groupId: `group-2`,
                sessionId: `session-1`,
                targetIndex: 0,
                type: `moveSessionToGroup`,
              }),
              await _(n, `group-1`, []),
              await _(n, `group-2`, [`session-1`]));
          }),
          await t(`ignore drops outside the groups`, async () => {
            (c(),
              await f(
                await v(n, `[data-sidebar-session-id="session-1"]`, `session-1 card`),
                await v(n, `button[aria-label="Create a new group"]`, `new group button`),
              ),
              await d({ type: `moveSessionToGroup` }),
              await d({ type: `syncSessionOrder` }),
              await _(n, `group-1`, []),
              await _(n, `group-2`, [`session-1`]));
          }));
      },
    }),
    (M.parameters = {
      ...M.parameters,
      docs: {
        ...M.parameters?.docs,
        source: {
          originalSource: `{
  args: {
    highlightedVisibleCount: 2,
    visibleCount: 2
  },
  play: async ({
    canvas,
    canvasElement,
    step,
    userEvent
  }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitForReadyMessage();
    resetSidebarStoryMessages();
    await step("remove the global new session button", async () => {
      await expect(canvas.queryByRole("button", {
        name: "New Session"
      })).toBeNull();
    });
    await step("request a new session inside a group", async () => {
      await userEvent.click(canvas.getByRole("button", {
        name: "Create a session in Group 4"
      }));
      await expectMessage({
        groupId: "group-4",
        type: "createSessionInGroup"
      });
    });
    await step("toggle sessions shown", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", {
        name: "Select split count for Group 4"
      }));
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Show 2 splits"
      }));
      await expectMessage({
        type: "setVisibleCount",
        visibleCount: 2
      });
    });
    await step("keep the split menu available on right click", async () => {
      resetSidebarStoryMessages();
      const splitModeButton = canvas.getByRole("button", {
        name: "Select split count for Group 4"
      });
      await openContextMenu(splitModeButton);
      await body.findByRole("menuitem", {
        name: "Show 3 splits"
      });
      await body.findByRole("menuitem", {
        name: "Show 4 splits"
      });
      await body.findByRole("menuitem", {
        name: "Show 6 splits"
      });
      await body.findByRole("menuitem", {
        name: "Show 9 splits"
      });
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Show 4 splits"
      }));
      await expectMessage({
        type: "setVisibleCount",
        visibleCount: 4
      });
    });
    await step("keep the layout selector hidden", async () => {
      await expect(canvas.queryByRole("button", {
        name: "Open layout options for Group 4"
      })).toBeNull();
    });
    await step("open sidebar settings", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", {
        name: "Open sidebar menu"
      }));
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Sidebar Settings"
      }));
      await expectMessage({
        type: "openSettings"
      });
    });
  }
}`,
          ...M.parameters?.docs?.source,
        },
      },
    }),
    (N.parameters = {
      ...N.parameters,
      docs: {
        ...N.parameters?.docs,
        source: {
          originalSource: `{
  play: async ({
    canvas,
    canvasElement,
    step,
    userEvent
  }) => {
    const storyDocument = canvasElement.ownerDocument;
    const body = within(storyDocument.body);
    const findSessionCard = () => canvas.findByRole("button", {
      name: /Harbor Vale/i
    });
    await waitForReadyMessage();
    resetSidebarStoryMessages();
    await step("focus a session from its card", async () => {
      const sessionCard = await findSessionCard();
      await userEvent.click(sessionCard);
      await expectMessage({
        sessionId: "session-3",
        type: "focusSession"
      });
    });
    await step("rename a session from the hover button", async () => {
      resetSidebarStoryMessages();
      const sessionCard = await findSessionCard();
      await userEvent.hover(sessionCard);
      const sessionFrame = sessionCard.closest(".session-frame");
      if (!(sessionFrame instanceof HTMLElement)) {
        throw new Error("Expected hovered session card to be wrapped by .session-frame");
      }
      await userEvent.click(within(sessionFrame).getByRole("button", {
        name: "Rename session"
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "promptRenameSession"
      });
    });
    await step("rename through the session context menu", async () => {
      resetSidebarStoryMessages();
      const sessionCard = await findSessionCard();
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Rename"
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "promptRenameSession"
      });
    });
    await step("copy a resume command through the session context menu", async () => {
      resetSidebarStoryMessages();
      const sessionCard = await findSessionCard();
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Copy resume"
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "copyResumeCommand"
      });
    });
    await step("terminate through the session context menu", async () => {
      resetSidebarStoryMessages();
      const sessionCard = await findSessionCard();
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Terminate"
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "closeSession"
      });
    });
  }
}`,
          ...N.parameters?.docs?.source,
        },
      },
    }),
    (P.parameters = {
      ...P.parameters,
      docs: {
        ...P.parameters?.docs,
        source: {
          originalSource: `{
  play: async ({
    canvas,
    canvasElement,
    step
  }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    const firstSession = await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-1"]', "session-1 card");
    const secondSession = await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-2"]', "session-2 card");
    const firstGroupTwoSession = await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-4"]', "session-4 card");
    const secondGroupTwoSession = await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-5"]', "session-5 card");
    resetSidebarStoryMessages();
    await step("keep each group-2 frame mapped to a single session while hovering", async () => {
      const dragState = await dragToHover(firstGroupTwoSession, secondGroupTwoSession);
      await waitFor(() => {
        const frameSessionCounts = Array.from(storyRoot.querySelectorAll('[data-sidebar-group-id="group-2"] .session-frame')).map(frame => frame.querySelectorAll(".session").length);
        return expect(frameSessionCounts).toEqual([1, 1]);
      });
      await releaseDrag(secondGroupTwoSession, dragState);
    });
    await step("reorder sessions inside a group", async () => {
      const dragState = await dragToHover(firstSession, secondSession, "after");
      await releaseDrag(secondSession, dragState);
      await expectMessage({
        groupId: "group-1",
        sessionIds: ["session-2", "session-1", "session-3"],
        type: "syncSessionOrder"
      });
      const reorderedSessionCards = canvas.getAllByRole("button", {
        name: /show title in 2nd row|layout drift fix|Harbor Vale/i
      });
      await expect(reorderedSessionCards[0]).toHaveTextContent("layout drift fix");
    });
  }
}`,
          ...P.parameters?.docs?.source,
        },
      },
    }),
    (F.parameters = {
      ...F.parameters,
      docs: {
        ...F.parameters?.docs,
        source: {
          originalSource: `{
  play: async ({
    canvasElement,
    step
  }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    const sourceSession = await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-3"]', "session-3 card");
    const targetSession = await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-4"]', "session-4 card");
    resetSidebarStoryMessages();
    await step("move a session into another group at the hovered slot", async () => {
      await dragAndDrop(sourceSession, targetSession);
      await expectMessage({
        groupId: "group-2",
        sessionId: "session-3",
        targetIndex: 0,
        type: "moveSessionToGroup"
      });
      await expectSessionMembership(storyRoot, "group-1", ["session-1", "session-2"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-3", "session-4", "session-5"]);
    });
  }
}`,
          ...F.parameters?.docs?.source,
        },
      },
    }),
    (I.parameters = {
      ...I.parameters,
      docs: {
        ...I.parameters?.docs,
        source: {
          originalSource: `{
  play: async ({
    canvasElement,
    step
  }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    await step("move the same session back and forth across groups", async () => {
      await dragSessionToGroup(storyRoot, "session-3", "group-2");
      await expectSessionMembership(storyRoot, "group-2", ["session-3", "session-4", "session-5"]);
      await dragSessionToGroup(storyRoot, "session-3", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-3", "session-1", "session-2"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-4", "session-5"]);
    });
  }
}`,
          ...I.parameters?.docs?.source,
        },
      },
    }),
    (L.parameters = {
      ...L.parameters,
      docs: {
        ...L.parameters?.docs,
        source: {
          originalSource: `{
  args: {
    fixture: "three-groups-stress",
    highlightedVisibleCount: 2,
    visibleCount: 2
  },
  play: async ({
    canvasElement,
    step
  }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    await step("move sessions across three groups until groups empty and refill", async () => {
      await dragSessionToGroup(storyRoot, "session-2", "group-2");
      await expectSessionMembership(storyRoot, "group-1", ["session-1"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-2", "session-3", "session-4"]);
      await dragSessionToGroup(storyRoot, "session-1", "group-3");
      await expectSessionMembership(storyRoot, "group-1", []);
      await expectSessionMembership(storyRoot, "group-3", ["session-1", "session-5", "session-6"]);
      await dragSessionToGroup(storyRoot, "session-3", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-3"]);
      await expectSessionMembership(storyRoot, "group-2", ["session-2", "session-4"]);
      await dragSessionToGroup(storyRoot, "session-5", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-3", "session-5"]);
      await expectSessionMembership(storyRoot, "group-3", ["session-1", "session-6"]);
      await dragSessionToGroup(storyRoot, "session-4", "group-3");
      await expectSessionMembership(storyRoot, "group-2", ["session-2"]);
      await expectSessionMembership(storyRoot, "group-3", ["session-1", "session-4", "session-6"]);
      await dragSessionToGroup(storyRoot, "session-2", "group-1");
      await expectSessionMembership(storyRoot, "group-1", ["session-2", "session-3", "session-5"]);
      await expectSessionMembership(storyRoot, "group-2", []);
    });
  }
}`,
          ...L.parameters?.docs?.source,
        },
      },
    }),
    (R.parameters = {
      ...R.parameters,
      docs: {
        ...R.parameters?.docs,
        source: {
          originalSource: `{
  args: {
    fixture: "empty-groups"
  },
  play: async ({
    canvasElement,
    step
  }) => {
    const storyRoot = canvasElement.ownerDocument.body;
    await waitForReadyMessage();
    await step("move a session into an empty group", async () => {
      resetSidebarStoryMessages();
      await dragAndDrop(await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-1"]', "session-1 card"), await findRequiredElement(storyRoot, '[data-sidebar-group-id="group-2"] .group-empty-state', "group-2 empty state"));
      await expectMessage({
        groupId: "group-2",
        sessionId: "session-1",
        targetIndex: 0,
        type: "moveSessionToGroup"
      });
      await expectSessionMembership(storyRoot, "group-1", []);
      await expectSessionMembership(storyRoot, "group-2", ["session-1"]);
    });
    await step("ignore drops outside the groups", async () => {
      resetSidebarStoryMessages();
      await dragAndDrop(await findRequiredElement(storyRoot, '[data-sidebar-session-id="session-1"]', "session-1 card"), await findRequiredElement(storyRoot, 'button[aria-label="Create a new group"]', "new group button"));
      await expectNoMessage({
        type: "moveSessionToGroup"
      });
      await expectNoMessage({
        type: "syncSessionOrder"
      });
      await expectSessionMembership(storyRoot, "group-1", []);
      await expectSessionMembership(storyRoot, "group-2", ["session-1"]);
    });
  }
}`,
          ...R.parameters?.docs?.source,
        },
      },
    }),
    (z = [
      `ToolbarActions`,
      `SessionCardActions`,
      `DragToReorderWithinGroup`,
      `DragToMoveAcrossGroups`,
      `DragAcrossGroupsRepeatedly`,
      `DragAcrossThreeGroupsStress`,
      `DragIntoEmptyGroupAndRejectOutsideDrops`,
    ]));
})();
export {
  I as DragAcrossGroupsRepeatedly,
  L as DragAcrossThreeGroupsStress,
  R as DragIntoEmptyGroupAndRejectOutsideDrops,
  F as DragToMoveAcrossGroups,
  P as DragToReorderWithinGroup,
  N as SessionCardActions,
  M as ToolbarActions,
  z as __namedExportsOrder,
  j as default,
};
