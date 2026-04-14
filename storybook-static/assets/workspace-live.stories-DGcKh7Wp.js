import { a as e, n as t } from "./chunk-BneVvdWh.js";
import { n, t as r } from "./iframe-D3MQgCEY.js";
import { a as i, i as a, o, r as s, t as c } from "./sidebar-story-workspace-BS6zh4-W.js";
import { n as l, t as u } from "./workspace-app-DKUyd1-Y.js";
function d() {
  let [e, t] = (0, S.useState)(),
    [n, r] = (0, S.useState)(),
    [o, s] = (0, S.useState)(),
    l = (0, S.useRef)(n),
    d = (0, S.useRef)(h()).current,
    _ = (0, S.useRef)(h()).current,
    y = (e) => {
      if (!l.current) return;
      let t = a(l.current, e);
      t &&
        (0, S.startTransition)(() => {
          r(t);
        });
    },
    b = (0, S.useMemo)(
      () => ({
        postMessage(e) {
          y(e);
        },
      }),
      [],
    ),
    x = (0, S.useMemo)(
      () => ({
        postMessage(e) {
          let t = g(e);
          t && y({ sessionId: t.sessionId, type: `focusSession` });
        },
      }),
      [],
    );
  return (
    (0, S.useEffect)(() => {
      l.current = n;
    }, [n]),
    (0, S.useEffect)(() => {
      let e = !1;
      return (
        fetch(`${w}/bootstrap`)
          .then(async (e) => {
            if (!e.ok) throw Error(`Bootstrap failed with ${String(e.status)}.`);
            let t = v(await e.json());
            if (!t) throw Error(`Bootstrap response was malformed.`);
            return t;
          })
          .then((t) => {
            e ||
              (s(t.connection),
              (0, S.startTransition)(() => {
                r(f(t.sessions));
              }));
          })
          .catch((n) => {
            e || t(n instanceof Error ? n.message : String(n));
          }),
        () => {
          e = !0;
        }
      );
    }, []),
    (0, S.useEffect)(() => {
      if (!n || !o) return;
      let e = c(n),
        t = p(n, o),
        r = window.setTimeout(() => {
          (m(d, e), m(_, t));
        }, 0);
      return () => {
        window.clearTimeout(r);
      };
    }, [o, d, n, _]),
    e
      ? (0, C.jsxs)(`div`, {
          style: { padding: 24 },
          children: [
            (0, C.jsx)(`strong`, { children: `Live Story Unavailable` }),
            (0, C.jsx)(`div`, { children: e }),
            (0, C.jsx)(`div`, {
              children: "Run `pnpm storybook:live` to start the local PTY sidecar.",
            }),
          ],
        })
      : !n || !o
        ? (0, C.jsx)(`div`, {
            style: { padding: 24 },
            children: (0, C.jsx)(`strong`, { children: `Connecting live story…` }),
          })
        : (0, C.jsxs)(`div`, {
            style: {
              background: `#0a0f16`,
              alignItems: `stretch`,
              boxSizing: `border-box`,
              display: `grid`,
              gap: `16px`,
              gridTemplateColumns: `170px minmax(0, 1fr)`,
              inset: 0,
              height: `100dvh`,
              left: 0,
              minWidth: 0,
              overflow: `hidden`,
              padding: `16px`,
              position: `fixed`,
              top: 0,
              width: `100vw`,
            },
            children: [
              (0, C.jsx)(`div`, {
                style: { height: `100%`, minWidth: 0, minHeight: 0, overflow: `auto` },
                children: (0, C.jsx)(i, { messageSource: d, vscode: b }),
              }),
              (0, C.jsx)(`div`, {
                style: { height: `100%`, minWidth: 0, minHeight: 0, overflow: `hidden` },
                children: (0, C.jsx)(u, { messageSource: _, vscode: x }),
              }),
            ],
          })
  );
}
function f(e) {
  let t = e.map((e, t) => ({
      alias: e.alias,
      column: t,
      createdAt: new Date(0).toISOString(),
      displayId: e.displayId,
      kind: `terminal`,
      row: 0,
      sessionId: e.sessionId,
      slotIndex: t,
      title: e.title,
    })),
    n = {
      activeGroupId: `group-live`,
      groups: [
        {
          groupId: `group-live`,
          snapshot: {
            focusedSessionId: t[0]?.sessionId,
            fullscreenRestoreVisibleCount: void 0,
            sessions: t,
            viewMode: `vertical`,
            visibleCount: _(t.length),
            visibleSessionIds: t.slice(0, 2).map((e) => e.sessionId),
          },
          title: `Live`,
        },
      ],
      nextGroupNumber: 2,
      nextSessionDisplayId: e.length,
      nextSessionNumber: e.length + 1,
    };
  return {
    options: {
      agentManagerZoomPercent: 100,
      agents: [],
      commands: [],
      completionBellEnabled: !1,
      completionSound: `ping`,
      debuggingMode: !1,
      scratchPadContent: ``,
      showCloseButtonOnSessionCards: !0,
      showHotkeysOnSessionCards: !1,
      theme: `dark-blue`,
    },
    sessionDecorationsById: Object.fromEntries(
      e.map((e) => [
        e.sessionId,
        {
          activity: `idle`,
          activityLabel: `Idle`,
          detail: e.alias,
          isRunning: !0,
          terminalTitle: e.title,
        },
      ]),
    ),
    snapshot: n,
  };
}
function p(e, t) {
  let n =
      e.snapshot.groups.find((t) => t.groupId === e.snapshot.activeGroupId) ?? e.snapshot.groups[0],
    r = new Map((n?.snapshot.sessions ?? []).map((e) => [e.sessionId, e])),
    i = (n?.snapshot.visibleSessionIds ?? [])
      .map((e) => r.get(e))
      .filter((e) => e?.kind === `terminal`)
      .map((t) => ({
        isVisible: !0,
        kind: `terminal`,
        sessionId: t.sessionId,
        sessionRecord: t,
        terminalTitle: e.sessionDecorationsById[t.sessionId]?.terminalTitle ?? t.title,
      }));
  return {
    activeGroupId: e.snapshot.activeGroupId,
    connection: t,
    debuggingMode: !0,
    focusedSessionId: n?.snapshot.focusedSessionId,
    layoutAppearance: { activePaneBorderColor: `rgba(90, 134, 255, 0.95)`, paneGap: 12 },
    panes: i,
    terminalAppearance: {
      cursorBlink: !0,
      cursorStyle: `bar`,
      fontFamily: `"MesloLGL Nerd Font Mono", Menlo, Monaco, "Courier New", monospace`,
      fontSize: 12,
      letterSpacing: 0,
      lineHeight: 1,
    },
    type: `hydrate`,
    viewMode: n?.snapshot.viewMode ?? `vertical`,
    visibleCount: n?.snapshot.visibleCount ?? 2,
    workspaceSnapshot: e.snapshot,
  };
}
function m(e, t) {
  e.dispatchEvent(new MessageEvent(`message`, { data: t }));
}
function h() {
  return new EventTarget();
}
function g(e) {
  return x(e) && e.type === `focusSession` && typeof e.sessionId == `string`
    ? { sessionId: e.sessionId, type: `focusSession` }
    : void 0;
}
function _(e) {
  return e <= 1 ? 1 : 2;
}
function v(e) {
  if (!x(e)) return;
  let t = b(e.connection),
    n = Array.isArray(e.sessions) ? e.sessions.map(y) : void 0;
  if (!(!t || !n || n.some((e) => e === void 0)))
    return { connection: t, sessions: n.filter((e) => e !== void 0) };
}
function y(e) {
  return x(e) &&
    typeof e.alias == `string` &&
    typeof e.displayId == `string` &&
    typeof e.sessionId == `string` &&
    typeof e.title == `string`
    ? { alias: e.alias, displayId: e.displayId, sessionId: e.sessionId, title: e.title }
    : void 0;
}
function b(e) {
  return x(e) &&
    typeof e.baseUrl == `string` &&
    typeof e.token == `string` &&
    typeof e.workspaceId == `string` &&
    (e.mock === void 0 || typeof e.mock == `boolean`)
    ? { baseUrl: e.baseUrl, mock: e.mock, token: e.token, workspaceId: e.workspaceId }
    : void 0;
}
function x(e) {
  return typeof e == `object` && !!e;
}
var S,
  C,
  w,
  T = t(() => {
    ((S = e(n())),
      o(),
      s(),
      l(),
      (C = r()),
      (w = `http://127.0.0.1:41737`),
      (d.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `WorkspaceLiveStoryHarness`,
      }));
  }),
  E,
  D,
  O,
  k;
t(() => {
  (T(),
    (E = r()),
    (D = { title: `Workspace/Live Debug Shell`, render: () => (0, E.jsx)(d, {}) }),
    (O = {}),
    (O.parameters = {
      ...O.parameters,
      docs: {
        ...O.parameters?.docs,
        source: { originalSource: `{}`, ...O.parameters?.docs?.source },
      },
    }),
    (k = [`ClaudeAndGemini`]));
})();
export { O as ClaudeAndGemini, k as __namedExportsOrder, D as default };
