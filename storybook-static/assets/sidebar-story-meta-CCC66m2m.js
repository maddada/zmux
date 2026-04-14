import { a as e, n as t } from "./chunk-BneVvdWh.js";
import { n, t as r } from "./iframe-D3MQgCEY.js";
import {
  S as i,
  _ as a,
  a as o,
  c as s,
  d as c,
  f as l,
  g as u,
  h as d,
  i as f,
  l as p,
  m,
  n as h,
  o as g,
  p as _,
  r as v,
  s as y,
  t as b,
  u as x,
  x as S,
} from "./sidebar-story-workspace-BS6zh4-W.js";
function C() {
  return [...k];
}
function w() {
  k.length = 0;
}
function T({ message: e }) {
  let [t, n] = (0, D.useState)(() => h(e)),
    r = (0, D.useRef)(t),
    i = (0, D.useRef)({
      postMessage(e) {
        k.push(e);
        let t = f(r.current, e);
        t &&
          E(() => {
            (0, D.startTransition)(() => {
              n(t);
            });
          });
      },
    }).current;
  return (
    (0, D.useEffect)(() => {
      r.current = t;
    }, [t]),
    (0, D.useEffect)(() => {
      (0, D.startTransition)(() => {
        n(h(e));
      });
    }, [e]),
    (0, D.useEffect)(() => {
      let e = b(t),
        n = window.setTimeout(() => {
          window.postMessage(e, `*`);
        }, 0);
      return () => {
        window.clearTimeout(n);
      };
    }, [t]),
    (0, O.jsx)(`div`, {
      style: { height: `100%`, width: `100%` },
      children: (0, O.jsx)(o, { vscode: i }),
    })
  );
}
function E(e) {
  window.setTimeout(() => {
    if (typeof window.requestAnimationFrame != `function`) {
      e();
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        e();
      });
    });
  }, A);
}
var D,
  O,
  k,
  A,
  j = t(() => {
    ((D = e(n())),
      g(),
      v(),
      (O = r()),
      (k = []),
      (A = 900),
      (T.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SidebarStoryHarness`,
        props: {
          message: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  groups: SidebarSessionGroup[];
  previousSessions: SidebarPreviousSessionItem[];
  revision: number;
  scratchPadContent: string;
  type: 'hydrate';
  hud: SidebarHudState;
}`,
              signature: {
                properties: [
                  {
                    key: `groups`,
                    value: {
                      name: `Array`,
                      elements: [
                        {
                          name: `signature`,
                          type: `object`,
                          raw: `{
  kind?: 'browser' | 'workspace';
  groupId: string;
  isActive: boolean;
  isFocusModeActive: boolean;
  layoutVisibleCount: VisibleSessionCount;
  sessions: SidebarSessionItem[];
  title: string;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
}`,
                          signature: {
                            properties: [
                              {
                                key: `kind`,
                                value: {
                                  name: `union`,
                                  raw: `'browser' | 'workspace'`,
                                  elements: [
                                    { name: `literal`, value: `'browser'` },
                                    { name: `literal`, value: `'workspace'` },
                                  ],
                                  required: !1,
                                },
                              },
                              { key: `groupId`, value: { name: `string`, required: !0 } },
                              { key: `isActive`, value: { name: `boolean`, required: !0 } },
                              {
                                key: `isFocusModeActive`,
                                value: { name: `boolean`, required: !0 },
                              },
                              {
                                key: `layoutVisibleCount`,
                                value: {
                                  name: `union`,
                                  raw: `1 | 2 | 3 | 4 | 6 | 9`,
                                  elements: [
                                    { name: `literal`, value: `1` },
                                    { name: `literal`, value: `2` },
                                    { name: `literal`, value: `3` },
                                    { name: `literal`, value: `4` },
                                    { name: `literal`, value: `6` },
                                    { name: `literal`, value: `9` },
                                  ],
                                  required: !0,
                                },
                              },
                              {
                                key: `sessions`,
                                value: {
                                  name: `Array`,
                                  elements: [
                                    {
                                      name: `signature`,
                                      type: `object`,
                                      raw: `{
  kind?: 'browser' | 'workspace';
  activity: 'idle' | 'working' | 'attention';
  activityLabel?: string;
  agentIcon?: SidebarAgentIcon;
  sessionId: string;
  sessionNumber?: string;
  primaryTitle?: string;
  terminalTitle?: string;
  alias: string;
  shortcutLabel: string;
  row: number;
  column: number;
  isFocused: boolean;
  isVisible: boolean;
  isRunning: boolean;
  detail?: string;
}`,
                                      signature: {
                                        properties: [
                                          {
                                            key: `kind`,
                                            value: {
                                              name: `union`,
                                              raw: `'browser' | 'workspace'`,
                                              elements: [
                                                { name: `literal`, value: `'browser'` },
                                                { name: `literal`, value: `'workspace'` },
                                              ],
                                              required: !1,
                                            },
                                          },
                                          {
                                            key: `activity`,
                                            value: {
                                              name: `union`,
                                              raw: `'idle' | 'working' | 'attention'`,
                                              elements: [
                                                { name: `literal`, value: `'idle'` },
                                                { name: `literal`, value: `'working'` },
                                                { name: `literal`, value: `'attention'` },
                                              ],
                                              required: !0,
                                            },
                                          },
                                          {
                                            key: `activityLabel`,
                                            value: { name: `string`, required: !1 },
                                          },
                                          {
                                            key: `agentIcon`,
                                            value: {
                                              name: `union`,
                                              raw: `"browser" | DefaultSidebarAgent["icon"]`,
                                              elements: [
                                                { name: `literal`, value: `"browser"` },
                                                {
                                                  name: `unknown[number]["icon"]`,
                                                  raw: `DefaultSidebarAgent["icon"]`,
                                                },
                                              ],
                                              required: !1,
                                            },
                                          },
                                          {
                                            key: `sessionId`,
                                            value: { name: `string`, required: !0 },
                                          },
                                          {
                                            key: `sessionNumber`,
                                            value: { name: `string`, required: !1 },
                                          },
                                          {
                                            key: `primaryTitle`,
                                            value: { name: `string`, required: !1 },
                                          },
                                          {
                                            key: `terminalTitle`,
                                            value: { name: `string`, required: !1 },
                                          },
                                          { key: `alias`, value: { name: `string`, required: !0 } },
                                          {
                                            key: `shortcutLabel`,
                                            value: { name: `string`, required: !0 },
                                          },
                                          { key: `row`, value: { name: `number`, required: !0 } },
                                          {
                                            key: `column`,
                                            value: { name: `number`, required: !0 },
                                          },
                                          {
                                            key: `isFocused`,
                                            value: { name: `boolean`, required: !0 },
                                          },
                                          {
                                            key: `isVisible`,
                                            value: { name: `boolean`, required: !0 },
                                          },
                                          {
                                            key: `isRunning`,
                                            value: { name: `boolean`, required: !0 },
                                          },
                                          {
                                            key: `detail`,
                                            value: { name: `string`, required: !1 },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                  raw: `SidebarSessionItem[]`,
                                  required: !0,
                                },
                              },
                              { key: `title`, value: { name: `string`, required: !0 } },
                              {
                                key: `viewMode`,
                                value: {
                                  name: `union`,
                                  raw: `"horizontal" | "vertical" | "grid"`,
                                  elements: [
                                    { name: `literal`, value: `"horizontal"` },
                                    { name: `literal`, value: `"vertical"` },
                                    { name: `literal`, value: `"grid"` },
                                  ],
                                  required: !0,
                                },
                              },
                              {
                                key: `visibleCount`,
                                value: {
                                  name: `union`,
                                  raw: `1 | 2 | 3 | 4 | 6 | 9`,
                                  elements: [
                                    { name: `literal`, value: `1` },
                                    { name: `literal`, value: `2` },
                                    { name: `literal`, value: `3` },
                                    { name: `literal`, value: `4` },
                                    { name: `literal`, value: `6` },
                                    { name: `literal`, value: `9` },
                                  ],
                                  required: !0,
                                },
                              },
                            ],
                          },
                        },
                      ],
                      raw: `SidebarSessionGroup[]`,
                      required: !0,
                    },
                  },
                  {
                    key: `previousSessions`,
                    value: {
                      name: `Array`,
                      elements: [
                        {
                          name: `intersection`,
                          raw: `SidebarSessionItem & {
  closedAt: string;
  historyId: string;
  isGeneratedName: boolean;
  isRestorable: boolean;
}`,
                          elements: [
                            {
                              name: `signature`,
                              type: `object`,
                              raw: `{
  kind?: 'browser' | 'workspace';
  activity: 'idle' | 'working' | 'attention';
  activityLabel?: string;
  agentIcon?: SidebarAgentIcon;
  sessionId: string;
  sessionNumber?: string;
  primaryTitle?: string;
  terminalTitle?: string;
  alias: string;
  shortcutLabel: string;
  row: number;
  column: number;
  isFocused: boolean;
  isVisible: boolean;
  isRunning: boolean;
  detail?: string;
}`,
                              signature: {
                                properties: [
                                  {
                                    key: `kind`,
                                    value: {
                                      name: `union`,
                                      raw: `'browser' | 'workspace'`,
                                      elements: [
                                        { name: `literal`, value: `'browser'` },
                                        { name: `literal`, value: `'workspace'` },
                                      ],
                                      required: !1,
                                    },
                                  },
                                  {
                                    key: `activity`,
                                    value: {
                                      name: `union`,
                                      raw: `'idle' | 'working' | 'attention'`,
                                      elements: [
                                        { name: `literal`, value: `'idle'` },
                                        { name: `literal`, value: `'working'` },
                                        { name: `literal`, value: `'attention'` },
                                      ],
                                      required: !0,
                                    },
                                  },
                                  { key: `activityLabel`, value: { name: `string`, required: !1 } },
                                  {
                                    key: `agentIcon`,
                                    value: {
                                      name: `union`,
                                      raw: `"browser" | DefaultSidebarAgent["icon"]`,
                                      elements: [
                                        { name: `literal`, value: `"browser"` },
                                        {
                                          name: `unknown[number]["icon"]`,
                                          raw: `DefaultSidebarAgent["icon"]`,
                                        },
                                      ],
                                      required: !1,
                                    },
                                  },
                                  { key: `sessionId`, value: { name: `string`, required: !0 } },
                                  { key: `sessionNumber`, value: { name: `string`, required: !1 } },
                                  { key: `primaryTitle`, value: { name: `string`, required: !1 } },
                                  { key: `terminalTitle`, value: { name: `string`, required: !1 } },
                                  { key: `alias`, value: { name: `string`, required: !0 } },
                                  { key: `shortcutLabel`, value: { name: `string`, required: !0 } },
                                  { key: `row`, value: { name: `number`, required: !0 } },
                                  { key: `column`, value: { name: `number`, required: !0 } },
                                  { key: `isFocused`, value: { name: `boolean`, required: !0 } },
                                  { key: `isVisible`, value: { name: `boolean`, required: !0 } },
                                  { key: `isRunning`, value: { name: `boolean`, required: !0 } },
                                  { key: `detail`, value: { name: `string`, required: !1 } },
                                ],
                              },
                            },
                            {
                              name: `signature`,
                              type: `object`,
                              raw: `{
  closedAt: string;
  historyId: string;
  isGeneratedName: boolean;
  isRestorable: boolean;
}`,
                              signature: {
                                properties: [
                                  { key: `closedAt`, value: { name: `string`, required: !0 } },
                                  { key: `historyId`, value: { name: `string`, required: !0 } },
                                  {
                                    key: `isGeneratedName`,
                                    value: { name: `boolean`, required: !0 },
                                  },
                                  { key: `isRestorable`, value: { name: `boolean`, required: !0 } },
                                ],
                              },
                            },
                          ],
                        },
                      ],
                      raw: `SidebarPreviousSessionItem[]`,
                      required: !0,
                    },
                  },
                  { key: `revision`, value: { name: `number`, required: !0 } },
                  { key: `scratchPadContent`, value: { name: `string`, required: !0 } },
                  { key: `type`, value: { name: `literal`, value: `'hydrate'`, required: !0 } },
                  {
                    key: `hud`,
                    value: {
                      name: `signature`,
                      type: `object`,
                      raw: `{
  agentManagerZoomPercent: number;
  agents: SidebarAgentButton[];
  collapsedSections: SidebarSectionCollapseState;
  commands: SidebarCommandButton[];
  completionBellEnabled: boolean;
  completionSound: CompletionSoundSetting;
  completionSoundLabel: string;
  debuggingMode: boolean;
  focusedSessionTitle?: string;
  git: SidebarGitState;
  isFocusModeActive: boolean;
  pendingAgentIds: string[];
  sectionVisibility: SidebarSectionVisibility;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  theme:
    | 'plain-dark'
    | 'plain-light'
    | 'dark-green'
    | 'dark-blue'
    | 'dark-red'
    | 'dark-pink'
    | 'dark-orange'
    | 'light-blue'
    | 'light-green'
    | 'light-pink'
    | 'light-orange';
  highlightedVisibleCount: VisibleSessionCount;
  visibleCount: VisibleSessionCount;
  visibleSlotLabels: string[];
  viewMode: TerminalViewMode;
}`,
                      signature: {
                        properties: [
                          {
                            key: `agentManagerZoomPercent`,
                            value: { name: `number`, required: !0 },
                          },
                          {
                            key: `agents`,
                            value: {
                              name: `Array`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  agentId: string;
  command?: string;
  icon?: SidebarAgentIcon;
  isDefault: boolean;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      {
                                        key: `icon`,
                                        value: {
                                          name: `union`,
                                          raw: `"browser" | DefaultSidebarAgent["icon"]`,
                                          elements: [
                                            { name: `literal`, value: `"browser"` },
                                            {
                                              name: `unknown[number]["icon"]`,
                                              raw: `DefaultSidebarAgent["icon"]`,
                                            },
                                          ],
                                          required: !1,
                                        },
                                      },
                                      {
                                        key: `isDefault`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                              ],
                              raw: `SidebarAgentButton[]`,
                              required: !0,
                            },
                          },
                          {
                            key: `collapsedSections`,
                            value: {
                              name: `signature`,
                              type: `object`,
                              raw: `{
  actions: boolean;
  agents: boolean;
}`,
                              signature: {
                                properties: [
                                  { key: `actions`, value: { name: `boolean`, required: !0 } },
                                  { key: `agents`, value: { name: `boolean`, required: !0 } },
                                ],
                              },
                              required: !0,
                            },
                          },
                          {
                            key: `commands`,
                            value: {
                              name: `Array`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  command?: string;
  commandId: string;
  isDefault: boolean;
  name: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `actionType`,
                                        value: {
                                          name: `union`,
                                          raw: `"browser" | "terminal"`,
                                          elements: [
                                            { name: `literal`, value: `"browser"` },
                                            { name: `literal`, value: `"terminal"` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `closeTerminalOnExit`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `isDefault`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                              ],
                              raw: `SidebarCommandButton[]`,
                              required: !0,
                            },
                          },
                          {
                            key: `completionBellEnabled`,
                            value: { name: `boolean`, required: !0 },
                          },
                          {
                            key: `completionSound`,
                            value: {
                              name: `unknown[number]["value"]`,
                              raw: `(typeof COMPLETION_SOUND_OPTIONS)[number]["value"]`,
                              required: !0,
                            },
                          },
                          { key: `completionSoundLabel`, value: { name: `string`, required: !0 } },
                          { key: `debuggingMode`, value: { name: `boolean`, required: !0 } },
                          { key: `focusedSessionTitle`, value: { name: `string`, required: !1 } },
                          {
                            key: `git`,
                            value: {
                              name: `signature`,
                              type: `object`,
                              raw: `{
  additions: number;
  aheadCount: number;
  behindCount: number;
  branch: string | null;
  confirmSuggestedCommit: boolean;
  deletions: number;
  hasGitHubCli: boolean;
  hasOriginRemote: boolean;
  hasUpstream: boolean;
  hasWorkingTreeChanges: boolean;
  isBusy: boolean;
  isRepo: boolean;
  pr: SidebarGitPullRequest | null;
  primaryAction: SidebarGitAction;
}`,
                              signature: {
                                properties: [
                                  { key: `additions`, value: { name: `number`, required: !0 } },
                                  { key: `aheadCount`, value: { name: `number`, required: !0 } },
                                  { key: `behindCount`, value: { name: `number`, required: !0 } },
                                  {
                                    key: `branch`,
                                    value: {
                                      name: `union`,
                                      raw: `string | null`,
                                      elements: [{ name: `string` }, { name: `null` }],
                                      required: !0,
                                    },
                                  },
                                  {
                                    key: `confirmSuggestedCommit`,
                                    value: { name: `boolean`, required: !0 },
                                  },
                                  { key: `deletions`, value: { name: `number`, required: !0 } },
                                  { key: `hasGitHubCli`, value: { name: `boolean`, required: !0 } },
                                  {
                                    key: `hasOriginRemote`,
                                    value: { name: `boolean`, required: !0 },
                                  },
                                  { key: `hasUpstream`, value: { name: `boolean`, required: !0 } },
                                  {
                                    key: `hasWorkingTreeChanges`,
                                    value: { name: `boolean`, required: !0 },
                                  },
                                  { key: `isBusy`, value: { name: `boolean`, required: !0 } },
                                  { key: `isRepo`, value: { name: `boolean`, required: !0 } },
                                  {
                                    key: `pr`,
                                    value: {
                                      name: `union`,
                                      raw: `SidebarGitPullRequest | null`,
                                      elements: [
                                        {
                                          name: `signature`,
                                          type: `object`,
                                          raw: `{
  number?: number;
  state: "open" | "closed" | "merged";
  title: string;
  url: string;
}`,
                                          signature: {
                                            properties: [
                                              {
                                                key: `number`,
                                                value: { name: `number`, required: !1 },
                                              },
                                              {
                                                key: `state`,
                                                value: {
                                                  name: `union`,
                                                  raw: `"open" | "closed" | "merged"`,
                                                  elements: [
                                                    { name: `literal`, value: `"open"` },
                                                    { name: `literal`, value: `"closed"` },
                                                    { name: `literal`, value: `"merged"` },
                                                  ],
                                                  required: !0,
                                                },
                                              },
                                              {
                                                key: `title`,
                                                value: { name: `string`, required: !0 },
                                              },
                                              {
                                                key: `url`,
                                                value: { name: `string`, required: !0 },
                                              },
                                            ],
                                          },
                                        },
                                        { name: `null` },
                                      ],
                                      required: !0,
                                    },
                                  },
                                  {
                                    key: `primaryAction`,
                                    value: {
                                      name: `union`,
                                      raw: `"commit" | "push" | "pr"`,
                                      elements: [
                                        { name: `literal`, value: `"commit"` },
                                        { name: `literal`, value: `"push"` },
                                        { name: `literal`, value: `"pr"` },
                                      ],
                                      required: !0,
                                    },
                                  },
                                ],
                              },
                              required: !0,
                            },
                          },
                          { key: `isFocusModeActive`, value: { name: `boolean`, required: !0 } },
                          {
                            key: `pendingAgentIds`,
                            value: {
                              name: `Array`,
                              elements: [{ name: `string` }],
                              raw: `string[]`,
                              required: !0,
                            },
                          },
                          {
                            key: `sectionVisibility`,
                            value: {
                              name: `signature`,
                              type: `object`,
                              raw: `{
  actions: boolean;
  agents: boolean;
  browsers: boolean;
  git: boolean;
}`,
                              signature: {
                                properties: [
                                  { key: `actions`, value: { name: `boolean`, required: !0 } },
                                  { key: `agents`, value: { name: `boolean`, required: !0 } },
                                  { key: `browsers`, value: { name: `boolean`, required: !0 } },
                                  { key: `git`, value: { name: `boolean`, required: !0 } },
                                ],
                              },
                              required: !0,
                            },
                          },
                          {
                            key: `showCloseButtonOnSessionCards`,
                            value: { name: `boolean`, required: !0 },
                          },
                          {
                            key: `showHotkeysOnSessionCards`,
                            value: { name: `boolean`, required: !0 },
                          },
                          {
                            key: `theme`,
                            value: {
                              name: `union`,
                              raw: `| 'plain-dark'
| 'plain-light'
| 'dark-green'
| 'dark-blue'
| 'dark-red'
| 'dark-pink'
| 'dark-orange'
| 'light-blue'
| 'light-green'
| 'light-pink'
| 'light-orange'`,
                              elements: [
                                { name: `literal`, value: `'plain-dark'` },
                                { name: `literal`, value: `'plain-light'` },
                                { name: `literal`, value: `'dark-green'` },
                                { name: `literal`, value: `'dark-blue'` },
                                { name: `literal`, value: `'dark-red'` },
                                { name: `literal`, value: `'dark-pink'` },
                                { name: `literal`, value: `'dark-orange'` },
                                { name: `literal`, value: `'light-blue'` },
                                { name: `literal`, value: `'light-green'` },
                                { name: `literal`, value: `'light-pink'` },
                                { name: `literal`, value: `'light-orange'` },
                              ],
                              required: !0,
                            },
                          },
                          {
                            key: `highlightedVisibleCount`,
                            value: {
                              name: `union`,
                              raw: `1 | 2 | 3 | 4 | 6 | 9`,
                              elements: [
                                { name: `literal`, value: `1` },
                                { name: `literal`, value: `2` },
                                { name: `literal`, value: `3` },
                                { name: `literal`, value: `4` },
                                { name: `literal`, value: `6` },
                                { name: `literal`, value: `9` },
                              ],
                              required: !0,
                            },
                          },
                          {
                            key: `visibleCount`,
                            value: {
                              name: `union`,
                              raw: `1 | 2 | 3 | 4 | 6 | 9`,
                              elements: [
                                { name: `literal`, value: `1` },
                                { name: `literal`, value: `2` },
                                { name: `literal`, value: `3` },
                                { name: `literal`, value: `4` },
                                { name: `literal`, value: `6` },
                                { name: `literal`, value: `9` },
                              ],
                              required: !0,
                            },
                          },
                          {
                            key: `visibleSlotLabels`,
                            value: {
                              name: `Array`,
                              elements: [{ name: `string` }],
                              raw: `string[]`,
                              required: !0,
                            },
                          },
                          {
                            key: `viewMode`,
                            value: {
                              name: `union`,
                              raw: `"horizontal" | "vertical" | "grid"`,
                              elements: [
                                { name: `literal`, value: `"horizontal"` },
                                { name: `literal`, value: `"vertical"` },
                                { name: `literal`, value: `"grid"` },
                              ],
                              required: !0,
                            },
                          },
                        ],
                      },
                      required: !0,
                    },
                  },
                ],
              },
            },
            description: ``,
          },
        },
      }));
  });
function M({
  activity: e = `idle`,
  activityLabel: t,
  alias: n,
  agentIcon: r,
  detail: i,
  isFocused: a = !1,
  isRunning: o = !0,
  isVisible: s = !1,
  primaryTitle: c,
  sessionId: l,
  shortcutLabel: u,
  terminalTitle: d,
}) {
  return {
    activity: e,
    activityLabel: t,
    agentIcon: r,
    alias: n,
    column: 0,
    detail: i,
    isFocused: a,
    isRunning: o,
    isVisible: s,
    primaryTitle: c,
    row: 0,
    sessionId: l,
    shortcutLabel: u,
    terminalTitle: d,
  };
}
function N(e) {
  return e.map((e) => ({ ...e, sessions: e.sessions.map((e) => ({ ...e })) }));
}
function P(e) {
  let t = e.flatMap((e) => e.sessions).find((e) => e.isFocused);
  return t ? (t.alias ?? t.terminalTitle ?? t.primaryTitle ?? t.detail) : void 0;
}
function F(e) {
  return e
    .flatMap((e) => e.sessions)
    .filter((e) => e.isVisible)
    .map((e) => e.shortcutLabel);
}
var I = t(() => {}),
  L,
  R,
  z,
  B,
  V,
  H,
  U = t(() => {
    (I(),
      (L = [
        {
          groupId: `group-1`,
          isActive: !1,
          sessions: [
            M({
              alias: `show title in 2nd row`,
              agentIcon: `codex`,
              detail: `OpenAI Codex`,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
            }),
            M({
              alias: `layout drift fix`,
              agentIcon: `codex`,
              detail: `OpenAI Codex`,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
            }),
            M({
              alias: `Harbor Vale`,
              agentIcon: `codex`,
              detail: `OpenAI Codex`,
              sessionId: `session-3`,
              shortcutLabel: `⌘⌥3`,
            }),
          ],
          title: `Main`,
        },
        {
          groupId: `group-2`,
          isActive: !1,
          sessions: [
            M({
              activity: `attention`,
              alias: `tooltip & show an indicator on the active card`,
              detail: `OpenAI Codex`,
              sessionId: `session-4`,
              shortcutLabel: `⌘⌥4`,
            }),
            M({
              alias: `Indigo Grove`,
              detail: `OpenAI Codex`,
              sessionId: `session-5`,
              shortcutLabel: `⌘⌥5`,
            }),
          ],
          title: `Group 2`,
        },
        {
          groupId: `group-4`,
          isActive: !0,
          sessions: [
            M({
              alias: `Amber Lattice`,
              detail: `OpenAI Codex`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-6`,
              shortcutLabel: `⌘⌥6`,
            }),
          ],
          title: `Group 4`,
        },
      ]),
      (R = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            M({
              activity: `working`,
              alias: `active refactor`,
              detail: `Claude Code`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
            }),
            M({
              alias: `ui hover audit`,
              detail: `OpenAI Codex`,
              isVisible: !0,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
            }),
            M({
              activity: `attention`,
              alias: `terminal title indicator`,
              detail: `OpenAI Codex`,
              isVisible: !0,
              sessionId: `session-3`,
              shortcutLabel: `⌘⌥3`,
            }),
            M({
              alias: `workspace sync`,
              detail: `OpenAI Codex`,
              isVisible: !0,
              sessionId: `session-4`,
              shortcutLabel: `⌘⌥4`,
            }),
          ],
          title: `Main`,
        },
        {
          groupId: `group-2`,
          isActive: !1,
          sessions: [
            M({
              alias: `fallback styling pass`,
              detail: `OpenAI Codex`,
              isRunning: !1,
              sessionId: `session-5`,
              shortcutLabel: `⌘⌥5`,
            }),
          ],
          title: `Review`,
        },
      ]),
      (z = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            M({
              activity: `working`,
              alias: `extremely long alias for the primary debugging session that should truncate cleanly`,
              detail: `OpenAI Codex running a sidebar layout regression pass with long secondary text`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
              terminalTitle: `OpenAI Codex / terminal / feature/sidebar-storybook / very-long-branch-name`,
            }),
            M({
              activity: `attention`,
              alias: `hover tooltip verification for overflow and status chip alignment`,
              detail: `Claude Code with a surprisingly verbose secondary line to stress wrapping assumptions`,
              isVisible: !0,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
              terminalTitle: `Claude Code / visual diff / attention state`,
            }),
            M({
              alias: `inactive session with close button`,
              detail: `Gemini CLI`,
              isRunning: !1,
              sessionId: `session-3`,
              shortcutLabel: `⌘⌥3`,
            }),
          ],
          title: `Main workspace with a deliberately long group title`,
        },
        {
          groupId: `group-2`,
          isActive: !1,
          sessions: [
            M({
              alias: `session card spacing audit across themes`,
              detail: `OpenAI Codex`,
              sessionId: `session-4`,
              shortcutLabel: `⌘⌥4`,
            }),
            M({
              alias: `secondary label overflow with keyboard shortcut visible`,
              detail: `OpenAI Codex with another very long provider name for stress testing`,
              sessionId: `session-5`,
              shortcutLabel: `⌘⌥5`,
            }),
          ],
          title: `Secondary investigations`,
        },
        {
          groupId: `group-3`,
          isActive: !1,
          sessions: [
            M({
              alias: `one more card for density`,
              detail: `OpenAI Codex`,
              sessionId: `session-6`,
              shortcutLabel: `⌘⌥6`,
            }),
          ],
          title: `QA`,
        },
      ]),
      (B = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            M({
              alias: `fresh workspace`,
              detail: `OpenAI Codex`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
            }),
          ],
          title: `Main`,
        },
        { groupId: `group-2`, isActive: !1, sessions: [], title: `Design` },
        { groupId: `group-3`, isActive: !1, sessions: [], title: `Review` },
      ]),
      (V = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            M({
              alias: `Atlas Forge`,
              detail: `OpenAI Codex`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
            }),
            M({
              alias: `Beryl Note`,
              detail: `OpenAI Codex`,
              isVisible: !0,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
            }),
          ],
          title: `Main`,
        },
        {
          groupId: `group-2`,
          isActive: !1,
          sessions: [
            M({
              alias: `Cinder Path`,
              detail: `OpenAI Codex`,
              sessionId: `session-3`,
              shortcutLabel: `⌘⌥3`,
            }),
            M({
              alias: `Dune Echo`,
              detail: `OpenAI Codex`,
              sessionId: `session-4`,
              shortcutLabel: `⌘⌥4`,
            }),
          ],
          title: `Group 2`,
        },
        {
          groupId: `group-3`,
          isActive: !1,
          sessions: [
            M({
              alias: `Elm Signal`,
              detail: `OpenAI Codex`,
              sessionId: `session-5`,
              shortcutLabel: `⌘⌥5`,
            }),
            M({
              alias: `Fjord Thread`,
              detail: `OpenAI Codex`,
              sessionId: `session-6`,
              shortcutLabel: `⌘⌥6`,
            }),
          ],
          title: `Group 3`,
        },
      ]),
      (H = {
        default: L,
        "empty-groups": B,
        "overflow-stress": z,
        "selector-states": R,
        "three-groups-stress": V,
      }));
  });
function W(e) {
  let t = N(H[e.fixture]).map((t) => {
    let n = t.isActive ? e.visibleCount : a(Math.max(1, t.sessions.length));
    return {
      ...t,
      isFocusModeActive: t.isActive ? e.isFocusModeActive : !1,
      layoutVisibleCount: t.isActive ? e.highlightedVisibleCount : n,
      viewMode: t.isActive ? e.viewMode : `grid`,
      visibleCount: n,
    };
  });
  return {
    groups: t,
    hud: {
      agentManagerZoomPercent: 100,
      agents: l(),
      collapsedSections: S(),
      commands: x(),
      completionBellEnabled: !1,
      completionSound: m,
      completionSoundLabel: d(m),
      debuggingMode: !1,
      focusedSessionTitle: P(t),
      git: s(),
      highlightedVisibleCount: e.highlightedVisibleCount,
      isFocusModeActive: e.isFocusModeActive,
      pendingAgentIds: [],
      sectionVisibility: i(),
      showCloseButtonOnSessionCards: e.showCloseButtonOnSessionCards,
      showHotkeysOnSessionCards: e.showHotkeysOnSessionCards,
      theme: e.theme,
      viewMode: e.viewMode,
      visibleCount: e.visibleCount,
      visibleSlotLabels: F(t),
    },
    previousSessions: [],
    revision: 1,
    scratchPadContent: ``,
    type: `hydrate`,
  };
}
var G = t(() => {
  (u(), _(), c(), p(), y(), U(), I());
});
function K(e) {
  return (0, q.jsx)(T, { message: W(e) });
}
var q,
  J,
  Y,
  X,
  Z = t(() => {
    (j(),
      G(),
      (q = r()),
      (J = {
        fixture: `default`,
        highlightedVisibleCount: 1,
        isFocusModeActive: !1,
        showCloseButtonOnSessionCards: !1,
        showHotkeysOnSessionCards: !1,
        theme: `dark-blue`,
        viewMode: `grid`,
        visibleCount: 1,
      }),
      (Y = {
        fixture: {
          control: `select`,
          options: [
            `default`,
            `selector-states`,
            `overflow-stress`,
            `empty-groups`,
            `three-groups-stress`,
          ],
        },
        highlightedVisibleCount: { control: `inline-radio`, options: [1, 2, 3, 4, 6, 9] },
        isFocusModeActive: { control: `boolean` },
        showCloseButtonOnSessionCards: { control: `boolean` },
        showHotkeysOnSessionCards: { control: `boolean` },
        theme: {
          control: `select`,
          options: [
            `plain-dark`,
            `plain-light`,
            `dark-green`,
            `dark-blue`,
            `dark-red`,
            `dark-pink`,
            `dark-orange`,
            `light-blue`,
            `light-green`,
            `light-pink`,
            `light-orange`,
          ],
        },
        viewMode: { control: `inline-radio`, options: [`horizontal`, `vertical`, `grid`] },
        visibleCount: { control: `inline-radio`, options: [1, 2, 3, 4, 6, 9] },
      }),
      (X = [
        (e) =>
          (0, q.jsx)(`div`, {
            style: { display: `grid`, justifyItems: `center`, minHeight: `100vh`, padding: `16px` },
            children: (0, q.jsx)(`div`, {
              style: { height: `950px`, overflow: `auto`, width: `300px` },
              children: (0, q.jsx)(e, {}),
            }),
          }),
      ]),
      (K.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `renderSidebarStory`,
        props: {
          fixture: {
            required: !0,
            tsType: {
              name: `union`,
              raw: `| 'default'
| 'selector-states'
| 'overflow-stress'
| 'empty-groups'
| 'three-groups-stress'`,
              elements: [
                { name: `literal`, value: `'default'` },
                { name: `literal`, value: `'selector-states'` },
                { name: `literal`, value: `'overflow-stress'` },
                { name: `literal`, value: `'empty-groups'` },
                { name: `literal`, value: `'three-groups-stress'` },
              ],
            },
            description: ``,
          },
          highlightedVisibleCount: {
            required: !0,
            tsType: {
              name: `union`,
              raw: `1 | 2 | 3 | 4 | 6 | 9`,
              elements: [
                { name: `literal`, value: `1` },
                { name: `literal`, value: `2` },
                { name: `literal`, value: `3` },
                { name: `literal`, value: `4` },
                { name: `literal`, value: `6` },
                { name: `literal`, value: `9` },
              ],
            },
            description: ``,
          },
          isFocusModeActive: { required: !0, tsType: { name: `boolean` }, description: `` },
          showCloseButtonOnSessionCards: {
            required: !0,
            tsType: { name: `boolean` },
            description: ``,
          },
          showHotkeysOnSessionCards: { required: !0, tsType: { name: `boolean` }, description: `` },
          theme: {
            required: !0,
            tsType: {
              name: `union`,
              raw: `| "plain-dark"
| "plain-light"
| "dark-green"
| "dark-blue"
| "dark-red"
| "dark-pink"
| "dark-orange"
| "light-blue"
| "light-green"
| "light-pink"
| "light-orange"`,
              elements: [
                { name: `literal`, value: `"plain-dark"` },
                { name: `literal`, value: `"plain-light"` },
                { name: `literal`, value: `"dark-green"` },
                { name: `literal`, value: `"dark-blue"` },
                { name: `literal`, value: `"dark-red"` },
                { name: `literal`, value: `"dark-pink"` },
                { name: `literal`, value: `"dark-orange"` },
                { name: `literal`, value: `"light-blue"` },
                { name: `literal`, value: `"light-green"` },
                { name: `literal`, value: `"light-pink"` },
                { name: `literal`, value: `"light-orange"` },
              ],
            },
            description: ``,
          },
          viewMode: {
            required: !0,
            tsType: {
              name: `union`,
              raw: `"horizontal" | "vertical" | "grid"`,
              elements: [
                { name: `literal`, value: `"horizontal"` },
                { name: `literal`, value: `"vertical"` },
                { name: `literal`, value: `"grid"` },
              ],
            },
            description: ``,
          },
          visibleCount: {
            required: !0,
            tsType: {
              name: `union`,
              raw: `1 | 2 | 3 | 4 | 6 | 9`,
              elements: [
                { name: `literal`, value: `1` },
                { name: `literal`, value: `2` },
                { name: `literal`, value: `3` },
                { name: `literal`, value: `4` },
                { name: `literal`, value: `6` },
                { name: `literal`, value: `9` },
              ],
            },
            description: ``,
          },
        },
      }));
  });
export { K as a, C as c, Z as i, j as l, Y as n, W as o, X as r, G as s, J as t, w as u };
