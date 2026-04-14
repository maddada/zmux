import { n as e } from "./chunk-BneVvdWh.js";
import { a as t, i as n, n as r, r as i, t as a } from "./sidebar-story-meta-CCC66m2m.js";
var o, s, c, l, u, d;
e(() => {
  (n(),
    (o = { title: `Sidebar/App`, args: a, argTypes: r, decorators: i, render: t }),
    (s = {}),
    (c = {
      args: {
        fixture: `selector-states`,
        highlightedVisibleCount: 4,
        isFocusModeActive: !0,
        showCloseButtonOnSessionCards: !0,
        showHotkeysOnSessionCards: !0,
        theme: `dark-green`,
        viewMode: `vertical`,
        visibleCount: 1,
      },
    }),
    (l = {
      args: {
        fixture: `overflow-stress`,
        highlightedVisibleCount: 6,
        showCloseButtonOnSessionCards: !0,
        showHotkeysOnSessionCards: !0,
        theme: `light-orange`,
        viewMode: `grid`,
        visibleCount: 6,
      },
    }),
    (u = {
      args: {
        fixture: `empty-groups`,
        highlightedVisibleCount: 1,
        showCloseButtonOnSessionCards: !1,
        showHotkeysOnSessionCards: !1,
        theme: `dark-blue`,
        viewMode: `horizontal`,
        visibleCount: 1,
      },
    }),
    (s.parameters = {
      ...s.parameters,
      docs: {
        ...s.parameters?.docs,
        source: { originalSource: `{}`, ...s.parameters?.docs?.source },
      },
    }),
    (c.parameters = {
      ...c.parameters,
      docs: {
        ...c.parameters?.docs,
        source: {
          originalSource: `{
  args: {
    fixture: "selector-states",
    highlightedVisibleCount: 4,
    isFocusModeActive: true,
    showCloseButtonOnSessionCards: true,
    showHotkeysOnSessionCards: true,
    theme: "dark-green",
    viewMode: "vertical",
    visibleCount: 1
  }
}`,
          ...c.parameters?.docs?.source,
        },
      },
    }),
    (l.parameters = {
      ...l.parameters,
      docs: {
        ...l.parameters?.docs,
        source: {
          originalSource: `{
  args: {
    fixture: "overflow-stress",
    highlightedVisibleCount: 6,
    showCloseButtonOnSessionCards: true,
    showHotkeysOnSessionCards: true,
    theme: "light-orange",
    viewMode: "grid",
    visibleCount: 6
  }
}`,
          ...l.parameters?.docs?.source,
        },
      },
    }),
    (u.parameters = {
      ...u.parameters,
      docs: {
        ...u.parameters?.docs,
        source: {
          originalSource: `{
  args: {
    fixture: "empty-groups",
    highlightedVisibleCount: 1,
    showCloseButtonOnSessionCards: false,
    showHotkeysOnSessionCards: false,
    theme: "dark-blue",
    viewMode: "horizontal",
    visibleCount: 1
  }
}`,
          ...u.parameters?.docs?.source,
        },
      },
    }),
    (d = [`Default`, `SelectorStates`, `OverflowStress`, `EmptyGroups`]));
})();
export {
  s as Default,
  u as EmptyGroups,
  l as OverflowStress,
  c as SelectorStates,
  d as __namedExportsOrder,
  o as default,
};
