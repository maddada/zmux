import { a as e, n as t } from "./chunk-BneVvdWh.js";
import { n, t as r } from "./iframe-D3MQgCEY.js";
import {
  C as i,
  E as a,
  T as o,
  b as s,
  s as c,
  v as l,
  w as u,
  y as d,
} from "./sidebar-story-workspace-BS6zh4-W.js";
function f(e, t) {
  let n = p(e);
  if (t === `horizontal`)
    return {
      layout: { groups: h(n), orientation: 0 },
      rowLengths: Array.from({ length: n }, () => 1),
    };
  if (t === `vertical`) return { layout: { groups: h(n), orientation: 1 }, rowLengths: [n] };
  let r = m(n);
  return r.length === 1
    ? { layout: { groups: h(r[0]), orientation: 0 }, rowLengths: r }
    : {
        layout: { groups: r.map((e) => ({ groups: h(e), orientation: 0 })), orientation: 1 },
        rowLengths: r,
      };
}
function p(e) {
  return Math.max(1, Math.min(9, Math.floor(e)));
}
function m(e) {
  if (e === 3) return [2, 1];
  let t = Math.ceil(e / 3),
    n = Math.floor(e / t),
    r = e % t;
  return Array.from({ length: t }, (e, t) => n + (t < r ? 1 : 0));
}
function h(e) {
  return Array.from({ length: e }, () => ({}));
}
var g = t(() => {});
function _(e, t, n) {
  if (e) {
    if (n) {
      console.debug(`[VSmux workspace] ${t}`, n);
      return;
    }
    console.debug(`[VSmux workspace] ${t}`);
  }
}
var v = t(() => {}),
  y,
  b,
  x,
  S,
  C = t(() => {
    ((y = e(n())),
      i(),
      (b = r()),
      (x = 3e3),
      (S = ({ onConfirmClose: e }) => {
        let [t, n] = (0, y.useState)(!1),
          r = (0, y.useRef)(void 0),
          i = (0, y.useId)();
        (0, y.useEffect)(
          () => () => {
            r.current !== void 0 && window.clearTimeout(r.current);
          },
          [],
        );
        let a = () => {
            (r.current !== void 0 && window.clearTimeout(r.current),
              n(!0),
              (r.current = window.setTimeout(() => {
                ((r.current = void 0), n(!1));
              }, x)));
          },
          o = () => {
            (r.current !== void 0 && (window.clearTimeout(r.current), (r.current = void 0)), n(!1));
          };
        return (0, b.jsxs)(`div`, {
          className: `workspace-pane-close-control`,
          children: [
            (0, b.jsx)(`button`, {
              "aria-describedby": t ? i : void 0,
              "aria-label": t ? `Confirm close session` : `Close session`,
              className: `workspace-pane-close-button ${t ? `workspace-pane-close-button-confirming` : ``}`,
              draggable: !1,
              onClick: (n) => {
                if ((n.stopPropagation(), t)) {
                  (o(), e());
                  return;
                }
                a();
              },
              onMouseDown: (e) => {
                e.stopPropagation();
              },
              type: `button`,
              children: (0, b.jsx)(u, { "aria-hidden": !0, size: 14, stroke: 1.8 }),
            }),
            t
              ? (0, b.jsx)(`div`, {
                  className: `workspace-pane-close-tooltip`,
                  id: i,
                  role: `tooltip`,
                  children: `Click again to confirm`,
                })
              : null,
          ],
        });
      }),
      (S.__docgenInfo = { description: ``, methods: [], displayName: `WorkspacePaneCloseButton` }));
  }),
  w,
  T,
  E = t(() => {
    (i(),
      (w = r()),
      (T = ({ onRefresh: e }) =>
        (0, w.jsx)(`button`, {
          "aria-label": `Refresh terminal rendering`,
          className: `workspace-pane-refresh-button`,
          draggable: !1,
          onClick: (t) => {
            (t.stopPropagation(), t.detail === 0 && e());
          },
          onMouseDown: (t) => {
            (t.preventDefault(), t.stopPropagation(), e());
          },
          type: `button`,
          children: (0, w.jsx)(o, { "aria-hidden": !0, size: 14, stroke: 1.8 }),
        })),
      (T.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `WorkspacePaneRefreshButton`,
      }));
  });
function D(e, t, n, r) {
  if (n === r) return;
  let i = new Set(t);
  if (!i.has(n) || !i.has(r)) return;
  let a = k(t, n, r);
  if (!a) return;
  let o = 0;
  return e.map((e) => (i.has(e) ? (a[o++] ?? e) : e));
}
function ee(e, t) {
  let n = new Set(e);
  if (n.size !== e.length) return;
  let r = new Set(t);
  if (!(r.size !== t.length || t.some((e) => !n.has(e))))
    return t.concat(e.filter((e) => !r.has(e)));
}
function O(e, t) {
  if (t.length === 0) return [...e];
  let n = new Map(t.map((e, t) => [e, t]));
  return [...e].sort(
    (e, t) => (n.get(e.sessionId) ?? 2 ** 53 - 1) - (n.get(t.sessionId) ?? 2 ** 53 - 1),
  );
}
function k(e, t, n) {
  let r = e.indexOf(t),
    i = e.indexOf(n);
  if (r < 0 || i < 0 || r === i) return;
  let a = [...e];
  return ((a[r] = n), (a[i] = t), a);
}
var A = t(() => {});
function te(e, t, n) {
  return (
    e.addEventListener(t, n),
    {
      dispose: () => {
        n && e.removeEventListener(t, n);
      },
    }
  );
}
var j,
  M = t(() => {
    j = class {
      constructor(e, t) {
        ((this._disposables = []),
          (this._socket = e),
          (this._socket.binaryType = `arraybuffer`),
          (this._bidirectional = !(t && t.bidirectional === !1)));
      }
      activate(e) {
        (this._disposables.push(
          te(this._socket, `message`, (t) => {
            let n = t.data;
            e.write(typeof n == `string` ? n : new Uint8Array(n));
          }),
        ),
          this._bidirectional &&
            (this._disposables.push(e.onData((e) => this._sendData(e))),
            this._disposables.push(e.onBinary((e) => this._sendBinary(e)))),
          this._disposables.push(te(this._socket, `close`, () => this.dispose())),
          this._disposables.push(te(this._socket, `error`, () => this.dispose())));
      }
      dispose() {
        for (let e of this._disposables) e.dispose();
      }
      _sendData(e) {
        this._checkOpenSocket() && this._socket.send(e);
      }
      _sendBinary(e) {
        if (!this._checkOpenSocket()) return;
        let t = new Uint8Array(e.length);
        for (let n = 0; n < e.length; ++n) t[n] = e.charCodeAt(n) & 255;
        this._socket.send(t);
      }
      _checkOpenSocket() {
        switch (this._socket.readyState) {
          case WebSocket.OPEN:
            return !0;
          case WebSocket.CONNECTING:
            throw Error(`Attach addon was loaded before socket was open`);
          case WebSocket.CLOSING:
            return (console.warn(`Attach addon socket is closing`), !1);
          case WebSocket.CLOSED:
            throw Error(`Attach addon socket is closed`);
          default:
            throw Error(`Unexpected socket state`);
        }
      }
    };
  }),
  N,
  ne,
  re,
  ie = t(() => {
    ((N = 2),
      (ne = 1),
      (re = class {
        activate(e) {
          this._terminal = e;
        }
        dispose() {}
        fit() {
          let e = this.proposeDimensions();
          if (!e || !this._terminal || isNaN(e.cols) || isNaN(e.rows)) return;
          let t = this._terminal._core;
          (this._terminal.rows !== e.rows || this._terminal.cols !== e.cols) &&
            (t._renderService.clear(), this._terminal.resize(e.cols, e.rows));
        }
        proposeDimensions() {
          if (!this._terminal || !this._terminal.element || !this._terminal.element.parentElement)
            return;
          let e = this._terminal._core._renderService.dimensions;
          if (e.css.cell.width === 0 || e.css.cell.height === 0) return;
          let t =
              this._terminal.options.scrollback === 0
                ? 0
                : this._terminal.options.overviewRuler?.width || 14,
            n = window.getComputedStyle(this._terminal.element.parentElement),
            r = parseInt(n.getPropertyValue(`height`)),
            i = Math.max(0, parseInt(n.getPropertyValue(`width`))),
            a = window.getComputedStyle(this._terminal.element),
            o = {
              top: parseInt(a.getPropertyValue(`padding-top`)),
              bottom: parseInt(a.getPropertyValue(`padding-bottom`)),
              right: parseInt(a.getPropertyValue(`padding-right`)),
              left: parseInt(a.getPropertyValue(`padding-left`)),
            },
            s = o.top + o.bottom,
            c = o.right + o.left,
            l = r - s,
            u = i - c - t;
          return {
            cols: Math.max(N, Math.floor(u / e.css.cell.width)),
            rows: Math.max(ne, Math.floor(l / e.css.cell.height)),
          };
        }
      }));
  });
function ae(e) {
  oe(e) || be.onUnexpectedError(e);
}
function oe(e) {
  return e instanceof Se ? !0 : e instanceof Error && e.name === xe && e.message === xe;
}
function P(e, t, n = 0, r = e.length) {
  let i = n,
    a = r;
  for (; i < a; ) {
    let n = Math.floor((i + a) / 2);
    t(e[n]) ? (i = n + 1) : (a = n);
  }
  return i - 1;
}
function se(e, t) {
  return (n, r) => t(e(n), e(r));
}
function ce(e, t) {
  let n = Object.create(null);
  for (let r of e) {
    let e = t(r),
      i = n[e];
    ((i ||= n[e] = []), i.push(r));
  }
  return n;
}
function le(e, t) {
  let n = this,
    r = !1,
    i;
  return function () {
    if (r) return i;
    if (((r = !0), t))
      try {
        i = e.apply(n, arguments);
      } finally {
        t();
      }
    else i = e.apply(n, arguments);
    return i;
  };
}
function ue(e) {
  je = e;
}
function de(e) {
  return (je?.trackDisposable(e), e);
}
function fe(e) {
  je?.markAsDisposed(e);
}
function pe(e, t) {
  je?.setParent(e, t);
}
function me(e, t) {
  if (je) for (let n of e) je.setParent(n, t);
}
function he(e) {
  if (ke.is(e)) {
    let t = [];
    for (let n of e)
      if (n)
        try {
          n.dispose();
        } catch (e) {
          t.push(e);
        }
    if (t.length === 1) throw t[0];
    if (t.length > 1) throw AggregateError(t, `Encountered errors while disposing of store`);
    return Array.isArray(e) ? [] : e;
  } else if (e) return (e.dispose(), e);
}
function ge(...e) {
  let t = _e(() => he(e));
  return (me(e, t), t);
}
function _e(e) {
  let t = de({
    dispose: le(() => {
      (fe(t), e());
    }),
  });
  return t;
}
function ve(e, t = 0, n) {
  let r = setTimeout(() => {
      (e(), n && i.dispose());
    }, t),
    i = _e(() => {
      (clearTimeout(r), n?.deleteAndLeak(i));
    });
  return (n?.add(i), i);
}
var ye,
  be,
  xe,
  Se,
  Ce,
  we,
  Te,
  Ee,
  De,
  Oe,
  ke,
  Ae,
  je,
  Me,
  Ne,
  Pe,
  Fe,
  Ie,
  Le,
  Re,
  ze,
  Be,
  Ve,
  He,
  Ue,
  We,
  Ge,
  Ke,
  qe,
  Je,
  Ye,
  Xe,
  Ze,
  Qe,
  $e,
  et,
  tt,
  nt,
  rt,
  it,
  at,
  ot,
  st,
  ct,
  lt,
  ut,
  dt,
  ft,
  pt,
  mt,
  ht,
  gt,
  _t,
  vt,
  yt,
  bt,
  xt,
  St,
  Ct,
  wt,
  Tt,
  Et,
  Dt,
  Ot,
  kt = t(() => {
    if (
      ((ye = class {
        constructor() {
          ((this.listeners = []),
            (this.unexpectedErrorHandler = function (e) {
              setTimeout(() => {
                throw e.stack
                  ? Ce.isErrorNoTelemetry(e)
                    ? new Ce(
                        e.message +
                          `

` +
                          e.stack,
                      )
                    : Error(
                        e.message +
                          `

` +
                          e.stack,
                      )
                  : e;
              }, 0);
            }));
        }
        addListener(e) {
          return (
            this.listeners.push(e),
            () => {
              this._removeListener(e);
            }
          );
        }
        emit(e) {
          this.listeners.forEach((t) => {
            t(e);
          });
        }
        _removeListener(e) {
          this.listeners.splice(this.listeners.indexOf(e), 1);
        }
        setUnexpectedErrorHandler(e) {
          this.unexpectedErrorHandler = e;
        }
        getUnexpectedErrorHandler() {
          return this.unexpectedErrorHandler;
        }
        onUnexpectedError(e) {
          (this.unexpectedErrorHandler(e), this.emit(e));
        }
        onUnexpectedExternalError(e) {
          this.unexpectedErrorHandler(e);
        }
      }),
      (be = new ye()),
      (xe = `Canceled`),
      (Se = class extends Error {
        constructor() {
          (super(xe), (this.name = this.message));
        }
      }),
      (Ce = class e extends Error {
        constructor(e) {
          (super(e), (this.name = `CodeExpectedError`));
        }
        static fromError(t) {
          if (t instanceof e) return t;
          let n = new e();
          return ((n.message = t.message), (n.stack = t.stack), n);
        }
        static isErrorNoTelemetry(e) {
          return e.name === `CodeExpectedError`;
        }
      }),
      (we = class e {
        constructor(e) {
          ((this._array = e), (this._findLastMonotonousLastIdx = 0));
        }
        findLastMonotonous(t) {
          if (e.assertInvariants) {
            if (this._prevFindLastPredicate) {
              for (let e of this._array)
                if (this._prevFindLastPredicate(e) && !t(e))
                  throw Error(
                    `MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.`,
                  );
            }
            this._prevFindLastPredicate = t;
          }
          let n = P(this._array, t, this._findLastMonotonousLastIdx);
          return ((this._findLastMonotonousLastIdx = n + 1), n === -1 ? void 0 : this._array[n]);
        }
      }),
      (we.assertInvariants = !1),
      ((e) => {
        function t(e) {
          return e < 0;
        }
        e.isLessThan = t;
        function n(e) {
          return e <= 0;
        }
        e.isLessThanOrEqual = n;
        function r(e) {
          return e > 0;
        }
        e.isGreaterThan = r;
        function i(e) {
          return e === 0;
        }
        ((e.isNeitherLessOrGreaterThan = i),
          (e.greaterThan = 1),
          (e.lessThan = -1),
          (e.neitherLessOrGreaterThan = 0));
      })((Te ||= {})),
      (Ee = (e, t) => e - t),
      (De = class e {
        constructor(e) {
          this.iterate = e;
        }
        forEach(e) {
          this.iterate((t) => (e(t), !0));
        }
        toArray() {
          let e = [];
          return (this.iterate((t) => (e.push(t), !0)), e);
        }
        filter(t) {
          return new e((e) => this.iterate((n) => (t(n) ? e(n) : !0)));
        }
        map(t) {
          return new e((e) => this.iterate((n) => e(t(n))));
        }
        some(e) {
          let t = !1;
          return (this.iterate((n) => ((t = e(n)), !t)), t);
        }
        findFirst(e) {
          let t;
          return (this.iterate((n) => (e(n) ? ((t = n), !1) : !0)), t);
        }
        findLast(e) {
          let t;
          return (this.iterate((n) => (e(n) && (t = n), !0)), t);
        }
        findLastMaxBy(e) {
          let t,
            n = !0;
          return (
            this.iterate((r) => ((n || Te.isGreaterThan(e(r, t))) && ((n = !1), (t = r)), !0)), t
          );
        }
      }),
      (De.empty = new De((e) => {})),
      (Oe = class {
        constructor() {
          this.map = new Map();
        }
        add(e, t) {
          let n = this.map.get(e);
          (n || ((n = new Set()), this.map.set(e, n)), n.add(t));
        }
        delete(e, t) {
          let n = this.map.get(e);
          n && (n.delete(t), n.size === 0 && this.map.delete(e));
        }
        forEach(e, t) {
          let n = this.map.get(e);
          n && n.forEach(t);
        }
        get(e) {
          return this.map.get(e) || new Set();
        }
      }),
      ((e) => {
        function t(e) {
          return e && typeof e == `object` && typeof e[Symbol.iterator] == `function`;
        }
        e.is = t;
        let n = Object.freeze([]);
        function r() {
          return n;
        }
        e.empty = r;
        function* i(e) {
          yield e;
        }
        e.single = i;
        function a(e) {
          return t(e) ? e : i(e);
        }
        e.wrap = a;
        function o(e) {
          return e || n;
        }
        e.from = o;
        function* s(e) {
          for (let t = e.length - 1; t >= 0; t--) yield e[t];
        }
        e.reverse = s;
        function c(e) {
          return !e || e[Symbol.iterator]().next().done === !0;
        }
        e.isEmpty = c;
        function l(e) {
          return e[Symbol.iterator]().next().value;
        }
        e.first = l;
        function u(e, t) {
          let n = 0;
          for (let r of e) if (t(r, n++)) return !0;
          return !1;
        }
        e.some = u;
        function d(e, t) {
          for (let n of e) if (t(n)) return n;
        }
        e.find = d;
        function* f(e, t) {
          for (let n of e) t(n) && (yield n);
        }
        e.filter = f;
        function* p(e, t) {
          let n = 0;
          for (let r of e) yield t(r, n++);
        }
        e.map = p;
        function* m(e, t) {
          let n = 0;
          for (let r of e) yield* t(r, n++);
        }
        e.flatMap = m;
        function* h(...e) {
          for (let t of e) yield* t;
        }
        e.concat = h;
        function g(e, t, n) {
          let r = n;
          for (let n of e) r = t(r, n);
          return r;
        }
        e.reduce = g;
        function* _(e, t, n = e.length) {
          for (
            t < 0 && (t += e.length), n < 0 ? (n += e.length) : n > e.length && (n = e.length);
            t < n;
            t++
          )
            yield e[t];
        }
        e.slice = _;
        function v(t, n = 1 / 0) {
          let r = [];
          if (n === 0) return [r, t];
          let i = t[Symbol.iterator]();
          for (let t = 0; t < n; t++) {
            let t = i.next();
            if (t.done) return [r, e.empty()];
            r.push(t.value);
          }
          return [
            r,
            {
              [Symbol.iterator]() {
                return i;
              },
            },
          ];
        }
        e.consume = v;
        async function y(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return Promise.resolve(t);
        }
        e.asyncToArray = y;
      })((ke ||= {})),
      (Ae = !1),
      (je = null),
      (Me = class e {
        constructor() {
          this.livingDisposables = new Map();
        }
        getDisposableData(t) {
          let n = this.livingDisposables.get(t);
          return (
            n ||
              ((n = { parent: null, source: null, isSingleton: !1, value: t, idx: e.idx++ }),
              this.livingDisposables.set(t, n)),
            n
          );
        }
        trackDisposable(e) {
          let t = this.getDisposableData(e);
          t.source ||= Error().stack;
        }
        setParent(e, t) {
          let n = this.getDisposableData(e);
          n.parent = t;
        }
        markAsDisposed(e) {
          this.livingDisposables.delete(e);
        }
        markAsSingleton(e) {
          this.getDisposableData(e).isSingleton = !0;
        }
        getRootParent(e, t) {
          let n = t.get(e);
          if (n) return n;
          let r = e.parent ? this.getRootParent(this.getDisposableData(e.parent), t) : e;
          return (t.set(e, r), r);
        }
        getTrackedDisposables() {
          let e = new Map();
          return [...this.livingDisposables.entries()]
            .filter(([, t]) => t.source !== null && !this.getRootParent(t, e).isSingleton)
            .flatMap(([e]) => e);
        }
        computeLeakingDisposables(e = 10, t) {
          let n;
          if (t) n = t;
          else {
            let e = new Map(),
              t = [...this.livingDisposables.values()].filter(
                (t) => t.source !== null && !this.getRootParent(t, e).isSingleton,
              );
            if (t.length === 0) return;
            let r = new Set(t.map((e) => e.value));
            if (((n = t.filter((e) => !(e.parent && r.has(e.parent)))), n.length === 0))
              throw Error(`There are cyclic diposable chains!`);
          }
          if (!n) return;
          function r(e) {
            function t(e, t) {
              for (
                ;
                e.length > 0 && t.some((t) => (typeof t == `string` ? t === e[0] : e[0].match(t)));
              )
                e.shift();
            }
            let n = e.source
              .split(`
`)
              .map((e) => e.trim().replace(`at `, ``))
              .filter((e) => e !== ``);
            return (
              t(n, [
                `Error`,
                /^trackDisposable \(.*\)$/,
                /^DisposableTracker.trackDisposable \(.*\)$/,
              ]),
              n.reverse()
            );
          }
          let i = new Oe();
          for (let e of n) {
            let t = r(e);
            for (let n = 0; n <= t.length; n++)
              i.add(
                t.slice(0, n).join(`
`),
                e,
              );
          }
          n.sort(se((e) => e.idx, Ee));
          let a = ``,
            o = 0;
          for (let t of n.slice(0, e)) {
            o++;
            let e = r(t),
              s = [];
            for (let t = 0; t < e.length; t++) {
              let a = e[t];
              a = `(shared with ${
                i.get(
                  e.slice(0, t + 1).join(`
`),
                ).size
              }/${n.length} leaks) at ${a}`;
              let o = ce(
                [
                  ...i.get(
                    e.slice(0, t).join(`
`),
                  ),
                ].map((e) => r(e)[t]),
                (e) => e,
              );
              delete o[e[t]];
              for (let [e, t] of Object.entries(o))
                s.unshift(`    - stacktraces of ${t.length} other leaks continue with ${e}`);
              s.unshift(a);
            }
            a += `


==================== Leaking disposable ${o}/${n.length}: ${t.value.constructor.name} ====================
${s.join(`
`)}
============================================================

`;
          }
          return (
            n.length > e &&
              (a += `


... and ${n.length - e} more leaking disposables

`),
            { leaks: n, details: a }
          );
        }
      }),
      (Me.idx = 0),
      Ae)
    ) {
      let e = `__is_disposable_tracked__`;
      ue(
        new (class {
          trackDisposable(t) {
            let n = Error(`Potentially leaked disposable`).stack;
            setTimeout(() => {
              t[e] || console.log(n);
            }, 3e3);
          }
          setParent(t, n) {
            if (t && t !== Fe.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsDisposed(t) {
            if (t && t !== Fe.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsSingleton(e) {}
        })(),
      );
    }
    if (
      ((Ne = class e {
        constructor() {
          ((this._toDispose = new Set()), (this._isDisposed = !1), de(this));
        }
        dispose() {
          this._isDisposed || (fe(this), (this._isDisposed = !0), this.clear());
        }
        get isDisposed() {
          return this._isDisposed;
        }
        clear() {
          if (this._toDispose.size !== 0)
            try {
              he(this._toDispose);
            } finally {
              this._toDispose.clear();
            }
        }
        add(t) {
          if (!t) return t;
          if (t === this) throw Error(`Cannot register a disposable on itself!`);
          return (
            pe(t, this),
            this._isDisposed
              ? e.DISABLE_DISPOSED_WARNING ||
                console.warn(
                  Error(
                    `Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!`,
                  ).stack,
                )
              : this._toDispose.add(t),
            t
          );
        }
        delete(e) {
          if (e) {
            if (e === this) throw Error(`Cannot dispose a disposable on itself!`);
            (this._toDispose.delete(e), e.dispose());
          }
        }
        deleteAndLeak(e) {
          e && this._toDispose.has(e) && (this._toDispose.delete(e), pe(e, null));
        }
      }),
      (Ne.DISABLE_DISPOSED_WARNING = !1),
      (Pe = Ne),
      (Fe = class {
        constructor() {
          ((this._store = new Pe()), de(this), pe(this._store, this));
        }
        dispose() {
          (fe(this), this._store.dispose());
        }
        _register(e) {
          if (e === this) throw Error(`Cannot register a disposable on itself!`);
          return this._store.add(e);
        }
      }),
      (Fe.None = Object.freeze({ dispose() {} })),
      (Ie = class {
        constructor() {
          ((this._isDisposed = !1), de(this));
        }
        get value() {
          return this._isDisposed ? void 0 : this._value;
        }
        set value(e) {
          this._isDisposed ||
            e === this._value ||
            (this._value?.dispose(), e && pe(e, this), (this._value = e));
        }
        clear() {
          this.value = void 0;
        }
        dispose() {
          ((this._isDisposed = !0), fe(this), this._value?.dispose(), (this._value = void 0));
        }
        clearAndLeak() {
          let e = this._value;
          return ((this._value = void 0), e && pe(e, null), e);
        }
      }),
      (Le = class e {
        constructor(t) {
          ((this.element = t), (this.next = e.Undefined), (this.prev = e.Undefined));
        }
      }),
      (Le.Undefined = new Le(void 0)),
      (Re = globalThis.performance && typeof globalThis.performance.now == `function`),
      (ze = class e {
        static create(t) {
          return new e(t);
        }
        constructor(e) {
          ((this._now =
            Re && e === !1 ? Date.now : globalThis.performance.now.bind(globalThis.performance)),
            (this._startTime = this._now()),
            (this._stopTime = -1));
        }
        stop() {
          this._stopTime = this._now();
        }
        reset() {
          ((this._startTime = this._now()), (this._stopTime = -1));
        }
        elapsed() {
          return this._stopTime === -1
            ? this._now() - this._startTime
            : this._stopTime - this._startTime;
        }
      }),
      (Be = !1),
      (Ve = !1),
      (He = !1),
      ((e) => {
        e.None = () => Fe.None;
        function t(e) {
          if (He) {
            let { onDidAddListener: t } = e,
              n = Ye.create(),
              r = 0;
            e.onDidAddListener = () => {
              (++r === 2 &&
                (console.warn(
                  `snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here`,
                ),
                n.print()),
                t?.());
            };
          }
        }
        function n(e, t) {
          return f(e, () => {}, 0, void 0, !0, void 0, t);
        }
        e.defer = n;
        function r(e) {
          return (t, n = null, r) => {
            let i = !1,
              a;
            return (
              (a = e(
                (e) => {
                  if (!i) return (a ? a.dispose() : (i = !0), t.call(n, e));
                },
                null,
                r,
              )),
              i && a.dispose(),
              a
            );
          };
        }
        e.once = r;
        function i(e, t, n) {
          return u((n, r = null, i) => e((e) => n.call(r, t(e)), null, i), n);
        }
        e.map = i;
        function a(e, t, n) {
          return u(
            (n, r = null, i) =>
              e(
                (e) => {
                  (t(e), n.call(r, e));
                },
                null,
                i,
              ),
            n,
          );
        }
        e.forEach = a;
        function o(e, t, n) {
          return u((n, r = null, i) => e((e) => t(e) && n.call(r, e), null, i), n);
        }
        e.filter = o;
        function s(e) {
          return e;
        }
        e.signal = s;
        function c(...e) {
          return (t, n = null, r) => d(ge(...e.map((e) => e((e) => t.call(n, e)))), r);
        }
        e.any = c;
        function l(e, t, n, r) {
          let a = n;
          return i(e, (e) => ((a = t(a, e)), a), r);
        }
        e.reduce = l;
        function u(e, n) {
          let r,
            i = {
              onWillAddFirstListener() {
                r = e(a.fire, a);
              },
              onDidRemoveLastListener() {
                r?.dispose();
              },
            };
          n || t(i);
          let a = new rt(i);
          return (n?.add(a), a.event);
        }
        function d(e, t) {
          return (t instanceof Array ? t.push(e) : t && t.add(e), e);
        }
        function f(e, n, r = 100, i = !1, a = !1, o, s) {
          let c,
            l,
            u,
            d = 0,
            f,
            p = {
              leakWarningThreshold: o,
              onWillAddFirstListener() {
                c = e((e) => {
                  (d++,
                    (l = n(l, e)),
                    i && !u && (m.fire(l), (l = void 0)),
                    (f = () => {
                      let e = l;
                      ((l = void 0), (u = void 0), (!i || d > 1) && m.fire(e), (d = 0));
                    }),
                    typeof r == `number`
                      ? (clearTimeout(u), (u = setTimeout(f, r)))
                      : u === void 0 && ((u = 0), queueMicrotask(f)));
                });
              },
              onWillRemoveListener() {
                a && d > 0 && f?.();
              },
              onDidRemoveLastListener() {
                ((f = void 0), c.dispose());
              },
            };
          s || t(p);
          let m = new rt(p);
          return (s?.add(m), m.event);
        }
        e.debounce = f;
        function p(t, n = 0, r) {
          return e.debounce(t, (e, t) => (e ? (e.push(t), e) : [t]), n, void 0, !0, void 0, r);
        }
        e.accumulate = p;
        function m(e, t = (e, t) => e === t, n) {
          let r = !0,
            i;
          return o(
            e,
            (e) => {
              let n = r || !t(e, i);
              return ((r = !1), (i = e), n);
            },
            n,
          );
        }
        e.latch = m;
        function h(t, n, r) {
          return [e.filter(t, n, r), e.filter(t, (e) => !n(e), r)];
        }
        e.split = h;
        function g(e, t = !1, n = [], r) {
          let i = n.slice(),
            a = e((e) => {
              i ? i.push(e) : s.fire(e);
            });
          r && r.add(a);
          let o = () => {
              (i?.forEach((e) => s.fire(e)), (i = null));
            },
            s = new rt({
              onWillAddFirstListener() {
                a || ((a = e((e) => s.fire(e))), r && r.add(a));
              },
              onDidAddFirstListener() {
                i && (t ? setTimeout(o) : o());
              },
              onDidRemoveLastListener() {
                (a && a.dispose(), (a = null));
              },
            });
          return (r && r.add(s), s.event);
        }
        e.buffer = g;
        function _(e, t) {
          return (n, r, i) => {
            let a = t(new y());
            return e(
              function (e) {
                let t = a.evaluate(e);
                t !== v && n.call(r, t);
              },
              void 0,
              i,
            );
          };
        }
        e.chain = _;
        let v = Symbol(`HaltChainable`);
        class y {
          constructor() {
            this.steps = [];
          }
          map(e) {
            return (this.steps.push(e), this);
          }
          forEach(e) {
            return (this.steps.push((t) => (e(t), t)), this);
          }
          filter(e) {
            return (this.steps.push((t) => (e(t) ? t : v)), this);
          }
          reduce(e, t) {
            let n = t;
            return (this.steps.push((t) => ((n = e(n, t)), n)), this);
          }
          latch(e = (e, t) => e === t) {
            let t = !0,
              n;
            return (
              this.steps.push((r) => {
                let i = t || !e(r, n);
                return ((t = !1), (n = r), i ? r : v);
              }),
              this
            );
          }
          evaluate(e) {
            for (let t of this.steps) if (((e = t(e)), e === v)) break;
            return e;
          }
        }
        function b(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new rt({
              onWillAddFirstListener: () => e.on(t, r),
              onDidRemoveLastListener: () => e.removeListener(t, r),
            });
          return i.event;
        }
        e.fromNodeEventEmitter = b;
        function x(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new rt({
              onWillAddFirstListener: () => e.addEventListener(t, r),
              onDidRemoveLastListener: () => e.removeEventListener(t, r),
            });
          return i.event;
        }
        e.fromDOMEventEmitter = x;
        function S(e) {
          return new Promise((t) => r(e)(t));
        }
        e.toPromise = S;
        function C(e) {
          let t = new rt();
          return (
            e
              .then(
                (e) => {
                  t.fire(e);
                },
                () => {
                  t.fire(void 0);
                },
              )
              .finally(() => {
                t.dispose();
              }),
            t.event
          );
        }
        e.fromPromise = C;
        function w(e, t) {
          return e((e) => t.fire(e));
        }
        e.forward = w;
        function T(e, t, n) {
          return (t(n), e((e) => t(e)));
        }
        e.runAndSubscribe = T;
        class E {
          constructor(e, n) {
            ((this._observable = e), (this._counter = 0), (this._hasChanged = !1));
            let r = {
              onWillAddFirstListener: () => {
                e.addObserver(this);
              },
              onDidRemoveLastListener: () => {
                e.removeObserver(this);
              },
            };
            (n || t(r), (this.emitter = new rt(r)), n && n.add(this.emitter));
          }
          beginUpdate(e) {
            this._counter++;
          }
          handlePossibleChange(e) {}
          handleChange(e, t) {
            this._hasChanged = !0;
          }
          endUpdate(e) {
            (this._counter--,
              this._counter === 0 &&
                (this._observable.reportChanges(),
                this._hasChanged &&
                  ((this._hasChanged = !1), this.emitter.fire(this._observable.get()))));
          }
        }
        function D(e, t) {
          return new E(e, t).emitter.event;
        }
        e.fromObservable = D;
        function ee(e) {
          return (t, n, r) => {
            let i = 0,
              a = !1,
              o = {
                beginUpdate() {
                  i++;
                },
                endUpdate() {
                  (i--, i === 0 && (e.reportChanges(), a && ((a = !1), t.call(n))));
                },
                handlePossibleChange() {},
                handleChange() {
                  a = !0;
                },
              };
            (e.addObserver(o), e.reportChanges());
            let s = {
              dispose() {
                e.removeObserver(o);
              },
            };
            return (r instanceof Pe ? r.add(s) : Array.isArray(r) && r.push(s), s);
          };
        }
        e.fromObservableLight = ee;
      })((Ue ||= {})),
      (We = class e {
        constructor(t) {
          ((this.listenerCount = 0),
            (this.invocationCount = 0),
            (this.elapsedOverall = 0),
            (this.durations = []),
            (this.name = `${t}_${e._idPool++}`),
            e.all.add(this));
        }
        start(e) {
          ((this._stopWatch = new ze()), (this.listenerCount = e));
        }
        stop() {
          if (this._stopWatch) {
            let e = this._stopWatch.elapsed();
            (this.durations.push(e),
              (this.elapsedOverall += e),
              (this.invocationCount += 1),
              (this._stopWatch = void 0));
          }
        }
      }),
      (We.all = new Set()),
      (We._idPool = 0),
      (Ge = We),
      (Ke = -1),
      (qe = class e {
        constructor(t, n, r = (e._idPool++).toString(16).padStart(3, `0`)) {
          ((this._errorHandler = t),
            (this.threshold = n),
            (this.name = r),
            (this._warnCountdown = 0));
        }
        dispose() {
          this._stacks?.clear();
        }
        check(e, t) {
          let n = this.threshold;
          if (n <= 0 || t < n) return;
          this._stacks ||= new Map();
          let r = this._stacks.get(e.value) || 0;
          if ((this._stacks.set(e.value, r + 1), --this._warnCountdown, this._warnCountdown <= 0)) {
            this._warnCountdown = n * 0.5;
            let [e, r] = this.getMostFrequentStack(),
              i = `[${this.name}] potential listener LEAK detected, having ${t} listeners already. MOST frequent listener (${r}):`;
            (console.warn(i), console.warn(e));
            let a = new Xe(i, e);
            this._errorHandler(a);
          }
          return () => {
            let t = this._stacks.get(e.value) || 0;
            this._stacks.set(e.value, t - 1);
          };
        }
        getMostFrequentStack() {
          if (!this._stacks) return;
          let e,
            t = 0;
          for (let [n, r] of this._stacks) (!e || t < r) && ((e = [n, r]), (t = r));
          return e;
        }
      }),
      (qe._idPool = 1),
      (Je = qe),
      (Ye = class e {
        constructor(e) {
          this.value = e;
        }
        static create() {
          return new e(Error().stack ?? ``);
        }
        print() {
          console.warn(
            this.value
              .split(`
`)
              .slice(2).join(`
`),
          );
        }
      }),
      (Xe = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerLeakError`), (this.stack = t));
        }
      }),
      (Ze = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerRefusalError`), (this.stack = t));
        }
      }),
      (Qe = 0),
      ($e = class {
        constructor(e) {
          ((this.value = e), (this.id = Qe++));
        }
      }),
      (et = 2),
      (tt = (e, t) => {
        if (e instanceof $e) t(e);
        else
          for (let n = 0; n < e.length; n++) {
            let r = e[n];
            r && t(r);
          }
      }),
      Be)
    ) {
      let e = [];
      (setInterval(() => {
        e.length !== 0 &&
          (console.warn(`[LEAKING LISTENERS] GC'ed these listeners that were NOT yet disposed:`),
          console.warn(
            e.join(`
`),
          ),
          (e.length = 0));
      }, 3e3),
        (nt = new FinalizationRegistry((t) => {
          typeof t == `string` && e.push(t);
        })));
    }
    if (
      ((rt = class {
        constructor(e) {
          ((this._size = 0),
            (this._options = e),
            (this._leakageMon =
              Ke > 0 || this._options?.leakWarningThreshold
                ? new Je(e?.onListenerError ?? ae, this._options?.leakWarningThreshold ?? Ke)
                : void 0),
            (this._perfMon = this._options?._profName ? new Ge(this._options._profName) : void 0),
            (this._deliveryQueue = this._options?.deliveryQueue));
        }
        dispose() {
          if (!this._disposed) {
            if (
              ((this._disposed = !0),
              this._deliveryQueue?.current === this && this._deliveryQueue.reset(),
              this._listeners)
            ) {
              if (Ve) {
                let e = this._listeners;
                queueMicrotask(() => {
                  tt(e, (e) => e.stack?.print());
                });
              }
              ((this._listeners = void 0), (this._size = 0));
            }
            (this._options?.onDidRemoveLastListener?.(), this._leakageMon?.dispose());
          }
        }
        get event() {
          return (
            (this._event ??= (e, t, n) => {
              if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
                let e = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
                console.warn(e);
                let t = this._leakageMon.getMostFrequentStack() ?? [`UNKNOWN stack`, -1],
                  n = new Ze(
                    `${e}. HINT: Stack shows most frequent listener (${t[1]}-times)`,
                    t[0],
                  );
                return ((this._options?.onListenerError || ae)(n), Fe.None);
              }
              if (this._disposed) return Fe.None;
              t && (e = e.bind(t));
              let r = new $e(e),
                i;
              (this._leakageMon &&
                this._size >= Math.ceil(this._leakageMon.threshold * 0.2) &&
                ((r.stack = Ye.create()), (i = this._leakageMon.check(r.stack, this._size + 1))),
                Ve && (r.stack = Ye.create()),
                this._listeners
                  ? this._listeners instanceof $e
                    ? ((this._deliveryQueue ??= new it()), (this._listeners = [this._listeners, r]))
                    : this._listeners.push(r)
                  : (this._options?.onWillAddFirstListener?.(this),
                    (this._listeners = r),
                    this._options?.onDidAddFirstListener?.(this)),
                this._size++);
              let a = _e(() => {
                (nt?.unregister(a), i?.(), this._removeListener(r));
              });
              if ((n instanceof Pe ? n.add(a) : Array.isArray(n) && n.push(a), nt)) {
                let e = Error()
                    .stack.split(`
`)
                    .slice(2, 3)
                    .join(`
`)
                    .trim(),
                  t = /(file:|vscode-file:\/\/vscode-app)?(\/[^:]*:\d+:\d+)/.exec(e);
                nt.register(a, t?.[2] ?? e, a);
              }
              return a;
            }),
            this._event
          );
        }
        _removeListener(e) {
          if ((this._options?.onWillRemoveListener?.(this), !this._listeners)) return;
          if (this._size === 1) {
            ((this._listeners = void 0),
              this._options?.onDidRemoveLastListener?.(this),
              (this._size = 0));
            return;
          }
          let t = this._listeners,
            n = t.indexOf(e);
          if (n === -1)
            throw (
              console.log(`disposed?`, this._disposed),
              console.log(`size?`, this._size),
              console.log(`arr?`, JSON.stringify(this._listeners)),
              Error(`Attempted to dispose unknown listener`)
            );
          (this._size--, (t[n] = void 0));
          let r = this._deliveryQueue.current === this;
          if (this._size * et <= t.length) {
            let e = 0;
            for (let n = 0; n < t.length; n++)
              t[n]
                ? (t[e++] = t[n])
                : r &&
                  (this._deliveryQueue.end--, e < this._deliveryQueue.i && this._deliveryQueue.i--);
            t.length = e;
          }
        }
        _deliver(e, t) {
          if (!e) return;
          let n = this._options?.onListenerError || ae;
          if (!n) {
            e.value(t);
            return;
          }
          try {
            e.value(t);
          } catch (e) {
            n(e);
          }
        }
        _deliverQueue(e) {
          let t = e.current._listeners;
          for (; e.i < e.end; ) this._deliver(t[e.i++], e.value);
          e.reset();
        }
        fire(e) {
          if (
            (this._deliveryQueue?.current &&
              (this._deliverQueue(this._deliveryQueue), this._perfMon?.stop()),
            this._perfMon?.start(this._size),
            this._listeners)
          )
            if (this._listeners instanceof $e) this._deliver(this._listeners, e);
            else {
              let t = this._deliveryQueue;
              (t.enqueue(this, e, this._listeners.length), this._deliverQueue(t));
            }
          this._perfMon?.stop();
        }
        hasListeners() {
          return this._size > 0;
        }
      }),
      (it = class {
        constructor() {
          ((this.i = -1), (this.end = 0));
        }
        enqueue(e, t, n) {
          ((this.i = 0), (this.end = n), (this.current = e), (this.value = t));
        }
        reset() {
          ((this.i = this.end), (this.current = void 0), (this.value = void 0));
        }
      }),
      (at = Object.freeze(function (e, t) {
        let n = setTimeout(e.bind(t), 0);
        return {
          dispose() {
            clearTimeout(n);
          },
        };
      })),
      ((e) => {
        function t(t) {
          return t === e.None || t === e.Cancelled || t instanceof st
            ? !0
            : !t || typeof t != `object`
              ? !1
              : typeof t.isCancellationRequested == `boolean` &&
                typeof t.onCancellationRequested == `function`;
        }
        ((e.isCancellationToken = t),
          (e.None = Object.freeze({
            isCancellationRequested: !1,
            onCancellationRequested: Ue.None,
          })),
          (e.Cancelled = Object.freeze({
            isCancellationRequested: !0,
            onCancellationRequested: at,
          })));
      })((ot ||= {})),
      (st = class {
        constructor() {
          ((this._isCancelled = !1), (this._emitter = null));
        }
        cancel() {
          this._isCancelled ||
            ((this._isCancelled = !0),
            this._emitter && (this._emitter.fire(void 0), this.dispose()));
        }
        get isCancellationRequested() {
          return this._isCancelled;
        }
        get onCancellationRequested() {
          return this._isCancelled ? at : ((this._emitter ||= new rt()), this._emitter.event);
        }
        dispose() {
          this._emitter &&= (this._emitter.dispose(), null);
        }
      }),
      (ct = `en`),
      (lt = !1),
      (ut = !1),
      (dt = ct),
      (pt = globalThis),
      typeof pt.vscode < `u` && typeof pt.vscode.process < `u`
        ? (mt = pt.vscode.process)
        : typeof process < `u` && typeof process?.versions?.node == `string` && (mt = process),
      (ht = typeof mt?.versions?.electron == `string` && mt?.type === `renderer`),
      typeof mt == `object`)
    ) {
      (mt.platform,
        mt.platform,
        (lt = mt.platform === `linux`),
        lt && mt.env.SNAP && mt.env.SNAP_REVISION,
        mt.env.CI || mt.env.BUILD_ARTIFACTSTAGINGDIRECTORY,
        (dt = ct));
      let e = mt.env.VSCODE_NLS_CONFIG;
      if (e)
        try {
          let t = JSON.parse(e);
          (t.userLocale,
            t.osLocale,
            (dt = t.resolvedLanguage || ct),
            t.languagePack?.translationsConfigFile);
        } catch {}
    } else
      typeof navigator == `object` && !ht
        ? ((ft = navigator.userAgent),
          ft.indexOf(`Windows`),
          ft.indexOf(`Macintosh`),
          (ft.indexOf(`Macintosh`) >= 0 || ft.indexOf(`iPad`) >= 0 || ft.indexOf(`iPhone`) >= 0) &&
            navigator.maxTouchPoints &&
            navigator.maxTouchPoints,
          (lt = ft.indexOf(`Linux`) >= 0),
          ft?.indexOf(`Mobi`),
          (ut = !0),
          (dt = globalThis._VSCODE_NLS_LANGUAGE || ct),
          navigator.language.toLowerCase())
        : console.error(`Unable to resolve platform.`);
    (ut && typeof pt.importScripts == `function` && pt.origin,
      (gt = ft),
      (_t = dt),
      ((e) => {
        function t() {
          return _t;
        }
        e.value = t;
        function n() {
          return _t.length === 2
            ? _t === `en`
            : _t.length >= 3
              ? _t[0] === `e` && _t[1] === `n` && _t[2] === `-`
              : !1;
        }
        e.isDefaultVariant = n;
        function r() {
          return _t === `en`;
        }
        e.isDefault = r;
      })((vt ||= {})),
      (yt = typeof pt.postMessage == `function` && !pt.importScripts),
      (() => {
        if (yt) {
          let e = [];
          pt.addEventListener(`message`, (t) => {
            if (t.data && t.data.vscodeScheduleAsyncWork)
              for (let n = 0, r = e.length; n < r; n++) {
                let r = e[n];
                if (r.id === t.data.vscodeScheduleAsyncWork) {
                  (e.splice(n, 1), r.callback());
                  return;
                }
              }
          });
          let t = 0;
          return (n) => {
            let r = ++t;
            (e.push({ id: r, callback: n }), pt.postMessage({ vscodeScheduleAsyncWork: r }, `*`));
          };
        }
        return (e) => setTimeout(e);
      })(),
      (bt = !!(gt && gt.indexOf(`Chrome`) >= 0)),
      gt && gt.indexOf(`Firefox`),
      !bt && gt && gt.indexOf(`Safari`),
      gt && gt.indexOf(`Edg/`),
      gt && gt.indexOf(`Android`),
      (function () {
        typeof globalThis.requestIdleCallback != `function` || globalThis.cancelIdleCallback;
      })(),
      ((e) => {
        async function t(e) {
          let t,
            n = await Promise.all(
              e.map((e) =>
                e.then(
                  (e) => e,
                  (e) => {
                    t ||= e;
                  },
                ),
              ),
            );
          if (typeof t < `u`) throw t;
          return n;
        }
        e.settled = t;
        function n(e) {
          return new Promise(async (t, n) => {
            try {
              await e(t, n);
            } catch (e) {
              n(e);
            }
          });
        }
        e.withAsyncBody = n;
      })((xt ||= {})),
      (St = class e {
        static fromArray(t) {
          return new e((e) => {
            e.emitMany(t);
          });
        }
        static fromPromise(t) {
          return new e(async (e) => {
            e.emitMany(await t);
          });
        }
        static fromPromises(t) {
          return new e(async (e) => {
            await Promise.all(t.map(async (t) => e.emitOne(await t)));
          });
        }
        static merge(t) {
          return new e(async (e) => {
            await Promise.all(
              t.map(async (t) => {
                for await (let n of t) e.emitOne(n);
              }),
            );
          });
        }
        constructor(e, t) {
          ((this._state = 0),
            (this._results = []),
            (this._error = null),
            (this._onReturn = t),
            (this._onStateChanged = new rt()),
            queueMicrotask(async () => {
              let t = {
                emitOne: (e) => this.emitOne(e),
                emitMany: (e) => this.emitMany(e),
                reject: (e) => this.reject(e),
              };
              try {
                (await Promise.resolve(e(t)), this.resolve());
              } catch (e) {
                this.reject(e);
              } finally {
                ((t.emitOne = void 0), (t.emitMany = void 0), (t.reject = void 0));
              }
            }));
        }
        [Symbol.asyncIterator]() {
          let e = 0;
          return {
            next: async () => {
              do {
                if (this._state === 2) throw this._error;
                if (e < this._results.length) return { done: !1, value: this._results[e++] };
                if (this._state === 1) return { done: !0, value: void 0 };
                await Ue.toPromise(this._onStateChanged.event);
              } while (!0);
            },
            return: async () => (this._onReturn?.(), { done: !0, value: void 0 }),
          };
        }
        static map(t, n) {
          return new e(async (e) => {
            for await (let r of t) e.emitOne(n(r));
          });
        }
        map(t) {
          return e.map(this, t);
        }
        static filter(t, n) {
          return new e(async (e) => {
            for await (let r of t) n(r) && e.emitOne(r);
          });
        }
        filter(t) {
          return e.filter(this, t);
        }
        static coalesce(t) {
          return e.filter(t, (e) => !!e);
        }
        coalesce() {
          return e.coalesce(this);
        }
        static async toPromise(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return t;
        }
        toPromise() {
          return e.toPromise(this);
        }
        emitOne(e) {
          this._state === 0 && (this._results.push(e), this._onStateChanged.fire());
        }
        emitMany(e) {
          this._state === 0 &&
            ((this._results = this._results.concat(e)), this._onStateChanged.fire());
        }
        resolve() {
          this._state === 0 && ((this._state = 1), this._onStateChanged.fire());
        }
        reject(e) {
          this._state === 0 && ((this._state = 2), (this._error = e), this._onStateChanged.fire());
        }
      }),
      (St.EMPTY = St.fromArray([])),
      (Ct = class extends Fe {
        constructor(e) {
          (super(),
            (this._terminal = e),
            (this._linesCacheTimeout = this._register(new Ie())),
            (this._linesCacheDisposables = this._register(new Ie())),
            this._register(_e(() => this._destroyLinesCache())));
        }
        initLinesCache() {
          (this._linesCache ||
            ((this._linesCache = Array(this._terminal.buffer.active.length)),
            (this._linesCacheDisposables.value = ge(
              this._terminal.onLineFeed(() => this._destroyLinesCache()),
              this._terminal.onCursorMove(() => this._destroyLinesCache()),
              this._terminal.onResize(() => this._destroyLinesCache()),
            ))),
            (this._linesCacheTimeout.value = ve(() => this._destroyLinesCache(), 15e3)));
        }
        _destroyLinesCache() {
          ((this._linesCache = void 0),
            this._linesCacheDisposables.clear(),
            this._linesCacheTimeout.clear());
        }
        getLineFromCache(e) {
          return this._linesCache?.[e];
        }
        setLineInCache(e, t) {
          this._linesCache && (this._linesCache[e] = t);
        }
        translateBufferLineToStringWithWrap(e, t) {
          let n = [],
            r = [0],
            i = this._terminal.buffer.active.getLine(e);
          for (; i; ) {
            let a = this._terminal.buffer.active.getLine(e + 1),
              o = a ? a.isWrapped : !1,
              s = i.translateToString(!o && t);
            if (o && a) {
              let e = i.getCell(i.length - 1);
              e &&
                e.getCode() === 0 &&
                e.getWidth() === 1 &&
                a.getCell(0)?.getWidth() === 2 &&
                (s = s.slice(0, -1));
            }
            if ((n.push(s), o)) r.push(r[r.length - 1] + s.length);
            else break;
            (e++, (i = a));
          }
          return [n.join(``), r];
        }
      }),
      (wt = class {
        get cachedSearchTerm() {
          return this._cachedSearchTerm;
        }
        set cachedSearchTerm(e) {
          this._cachedSearchTerm = e;
        }
        get lastSearchOptions() {
          return this._lastSearchOptions;
        }
        set lastSearchOptions(e) {
          this._lastSearchOptions = e;
        }
        isValidSearchTerm(e) {
          return !!(e && e.length > 0);
        }
        didOptionsChange(e) {
          return this._lastSearchOptions
            ? e
              ? this._lastSearchOptions.caseSensitive !== e.caseSensitive ||
                this._lastSearchOptions.regex !== e.regex ||
                this._lastSearchOptions.wholeWord !== e.wholeWord
              : !1
            : !0;
        }
        shouldUpdateHighlighting(e, t) {
          return t?.decorations
            ? this._cachedSearchTerm === void 0 ||
                e !== this._cachedSearchTerm ||
                this.didOptionsChange(t)
            : !1;
        }
        clearCachedTerm() {
          this._cachedSearchTerm = void 0;
        }
        reset() {
          ((this._cachedSearchTerm = void 0), (this._lastSearchOptions = void 0));
        }
      }),
      (Tt = class {
        constructor(e, t) {
          ((this._terminal = e), (this._lineCache = t));
        }
        find(e, t, n, r) {
          if (!e || e.length === 0) {
            this._terminal.clearSelection();
            return;
          }
          if (n > this._terminal.cols)
            throw Error(`Invalid col: ${n} to search in terminal of ${this._terminal.cols} cols`);
          this._lineCache.initLinesCache();
          let i = { startRow: t, startCol: n },
            a = this._findInLine(e, i, r);
          if (!a)
            for (
              let n = t + 1;
              n < this._terminal.buffer.active.baseY + this._terminal.rows &&
              ((i.startRow = n), (i.startCol = 0), (a = this._findInLine(e, i, r)), !a);
              n++
            );
          return a;
        }
        findNextWithSelection(e, t, n) {
          if (!e || e.length === 0) {
            this._terminal.clearSelection();
            return;
          }
          let r = this._terminal.getSelectionPosition();
          this._terminal.clearSelection();
          let i = 0,
            a = 0;
          (r && (n === e ? ((i = r.end.x), (a = r.end.y)) : ((i = r.start.x), (a = r.start.y))),
            this._lineCache.initLinesCache());
          let o = { startRow: a, startCol: i },
            s = this._findInLine(e, o, t);
          if (!s)
            for (
              let n = a + 1;
              n < this._terminal.buffer.active.baseY + this._terminal.rows &&
              ((o.startRow = n), (o.startCol = 0), (s = this._findInLine(e, o, t)), !s);
              n++
            );
          if (!s && a !== 0)
            for (
              let n = 0;
              n < a && ((o.startRow = n), (o.startCol = 0), (s = this._findInLine(e, o, t)), !s);
              n++
            );
          return (
            !s &&
              r &&
              ((o.startRow = r.start.y), (o.startCol = 0), (s = this._findInLine(e, o, t))),
            s
          );
        }
        findPreviousWithSelection(e, t, n) {
          if (!e || e.length === 0) {
            this._terminal.clearSelection();
            return;
          }
          let r = this._terminal.getSelectionPosition();
          this._terminal.clearSelection();
          let i = this._terminal.buffer.active.baseY + this._terminal.rows - 1,
            a = this._terminal.cols;
          this._lineCache.initLinesCache();
          let o = { startRow: i, startCol: a },
            s;
          if (
            (r &&
              ((o.startRow = i = r.start.y),
              (o.startCol = a = r.start.x),
              n !== e &&
                ((s = this._findInLine(e, o, t, !1)),
                s || ((o.startRow = i = r.end.y), (o.startCol = a = r.end.x)))),
            (s ||= this._findInLine(e, o, t, !0)),
            !s)
          ) {
            o.startCol = Math.max(o.startCol, this._terminal.cols);
            for (
              let n = i - 1;
              n >= 0 && ((o.startRow = n), (s = this._findInLine(e, o, t, !0)), !s);
              n--
            );
          }
          if (!s && i !== this._terminal.buffer.active.baseY + this._terminal.rows - 1)
            for (
              let n = this._terminal.buffer.active.baseY + this._terminal.rows - 1;
              n >= i && ((o.startRow = n), (s = this._findInLine(e, o, t, !0)), !s);
              n--
            );
          return s;
        }
        _isWholeWord(e, t, n) {
          return (
            (e === 0 || ` ~!@#$%^&*()+\`-=[]{}|\\;:"',./<>?`.includes(t[e - 1])) &&
            (e + n.length === t.length ||
              ` ~!@#$%^&*()+\`-=[]{}|\\;:"',./<>?`.includes(t[e + n.length]))
          );
        }
        _findInLine(e, t, n = {}, r = !1) {
          let i = t.startRow,
            a = t.startCol;
          if (this._terminal.buffer.active.getLine(i)?.isWrapped) {
            if (r) {
              t.startCol += this._terminal.cols;
              return;
            }
            return (t.startRow--, (t.startCol += this._terminal.cols), this._findInLine(e, t, n));
          }
          let o = this._lineCache.getLineFromCache(i);
          o ||
            ((o = this._lineCache.translateBufferLineToStringWithWrap(i, !0)),
            this._lineCache.setLineInCache(i, o));
          let [s, c] = o,
            l = this._bufferColsToStringOffset(i, a),
            u = e,
            d = s;
          n.regex ||
            ((u = n.caseSensitive ? e : e.toLowerCase()),
            (d = n.caseSensitive ? s : s.toLowerCase()));
          let f = -1;
          if (n.regex) {
            let t = RegExp(u, n.caseSensitive ? `g` : `gi`),
              i;
            if (r)
              for (; (i = t.exec(d.slice(0, l))); )
                ((f = t.lastIndex - i[0].length), (e = i[0]), (t.lastIndex -= e.length - 1));
            else
              ((i = t.exec(d.slice(l))),
                i && i[0].length > 0 && ((f = l + (t.lastIndex - i[0].length)), (e = i[0])));
          } else
            r ? l - u.length >= 0 && (f = d.lastIndexOf(u, l - u.length)) : (f = d.indexOf(u, l));
          if (f >= 0) {
            if (n.wholeWord && !this._isWholeWord(f, d, e)) return;
            let t = 0;
            for (; t < c.length - 1 && f >= c[t + 1]; ) t++;
            let r = t;
            for (; r < c.length - 1 && f + e.length >= c[r + 1]; ) r++;
            let a = f - c[t],
              o = f + e.length - c[r],
              s = this._stringLengthToBufferSize(i + t, a),
              l = this._stringLengthToBufferSize(i + r, o) - s + this._terminal.cols * (r - t);
            return { term: e, col: s, row: i + t, size: l };
          }
        }
        _stringLengthToBufferSize(e, t) {
          let n = this._terminal.buffer.active.getLine(e);
          if (!n) return 0;
          for (let e = 0; e < t; e++) {
            let r = n.getCell(e);
            if (!r) break;
            let i = r.getChars();
            i.length > 1 && (t -= i.length - 1);
            let a = n.getCell(e + 1);
            a && a.getWidth() === 0 && t++;
          }
          return t;
        }
        _bufferColsToStringOffset(e, t) {
          let n = e,
            r = 0,
            i = this._terminal.buffer.active.getLine(n);
          for (; t > 0 && i; ) {
            for (let e = 0; e < t && e < this._terminal.cols; e++) {
              let t = i.getCell(e);
              if (!t) break;
              t.getWidth() && (r += t.getCode() === 0 ? 1 : t.getChars().length);
            }
            if ((n++, (i = this._terminal.buffer.active.getLine(n)), i && !i.isWrapped)) break;
            t -= this._terminal.cols;
          }
          return r;
        }
      }),
      (Et = class extends Fe {
        constructor(e) {
          (super(),
            (this._terminal = e),
            (this._highlightDecorations = []),
            (this._highlightedLines = new Set()),
            this._register(_e(() => this.clearHighlightDecorations())));
        }
        createHighlightDecorations(e, t) {
          this.clearHighlightDecorations();
          for (let n of e) {
            let e = this._createResultDecorations(n, t, !1);
            if (e) for (let t of e) this._storeDecoration(t, n);
          }
        }
        createActiveDecoration(e, t) {
          let n = this._createResultDecorations(e, t, !0);
          if (n)
            return {
              decorations: n,
              match: e,
              dispose() {
                he(n);
              },
            };
        }
        clearHighlightDecorations() {
          (he(this._highlightDecorations),
            (this._highlightDecorations = []),
            this._highlightedLines.clear());
        }
        _storeDecoration(e, t) {
          (this._highlightedLines.add(e.marker.line),
            this._highlightDecorations.push({
              decoration: e,
              match: t,
              dispose() {
                e.dispose();
              },
            }));
        }
        _applyStyles(e, t, n) {
          (e.classList.contains(`xterm-find-result-decoration`) ||
            (e.classList.add(`xterm-find-result-decoration`),
            t && (e.style.outline = `1px solid ${t}`)),
            n && e.classList.add(`xterm-find-active-result-decoration`));
        }
        _createResultDecorations(e, t, n) {
          let r = [],
            i = e.col,
            a = e.size,
            o = -this._terminal.buffer.active.baseY - this._terminal.buffer.active.cursorY + e.row;
          for (; a > 0; ) {
            let e = Math.min(this._terminal.cols - i, a);
            (r.push([o, i, e]), (i = 0), (a -= e), o++);
          }
          let s = [];
          for (let e of r) {
            let r = this._terminal.registerMarker(e[0]),
              i = this._terminal.registerDecoration({
                marker: r,
                x: e[1],
                width: e[2],
                backgroundColor: n ? t.activeMatchBackground : t.matchBackground,
                overviewRulerOptions: this._highlightedLines.has(r.line)
                  ? void 0
                  : {
                      color: n ? t.activeMatchColorOverviewRuler : t.matchOverviewRuler,
                      position: `center`,
                    },
              });
            if (i) {
              let e = [];
              (e.push(r),
                e.push(
                  i.onRender((e) =>
                    this._applyStyles(e, n ? t.activeMatchBorder : t.matchBorder, !1),
                  ),
                ),
                e.push(i.onDispose(() => he(e))),
                s.push(i));
            }
          }
          return s.length === 0 ? void 0 : s;
        }
      }),
      (Dt = class extends Fe {
        constructor() {
          (super(...arguments),
            (this._searchResults = []),
            (this._onDidChangeResults = this._register(new rt())));
        }
        get onDidChangeResults() {
          return this._onDidChangeResults.event;
        }
        get searchResults() {
          return this._searchResults;
        }
        get selectedDecoration() {
          return this._selectedDecoration;
        }
        set selectedDecoration(e) {
          this._selectedDecoration = e;
        }
        updateResults(e, t) {
          this._searchResults = e.slice(0, t);
        }
        clearResults() {
          this._searchResults = [];
        }
        clearSelectedDecoration() {
          this._selectedDecoration &&= (this._selectedDecoration.dispose(), void 0);
        }
        findResultIndex(e) {
          for (let t = 0; t < this._searchResults.length; t++) {
            let n = this._searchResults[t];
            if (n.row === e.row && n.col === e.col && n.size === e.size) return t;
          }
          return -1;
        }
        fireResultsChanged(e) {
          if (!e) return;
          let t = -1;
          (this._selectedDecoration && (t = this.findResultIndex(this._selectedDecoration.match)),
            this._onDidChangeResults.fire({
              resultIndex: t,
              resultCount: this._searchResults.length,
            }));
        }
        reset() {
          (this.clearSelectedDecoration(), this.clearResults());
        }
      }),
      (Ot = class extends Fe {
        constructor(e) {
          (super(),
            (this._highlightTimeout = this._register(new Ie())),
            (this._lineCache = this._register(new Ie())),
            (this._state = new wt()),
            (this._resultTracker = this._register(new Dt())),
            (this._highlightLimit = e?.highlightLimit ?? 1e3));
        }
        get onDidChangeResults() {
          return this._resultTracker.onDidChangeResults;
        }
        activate(e) {
          ((this._terminal = e),
            (this._lineCache.value = new Ct(e)),
            (this._engine = new Tt(e, this._lineCache.value)),
            (this._decorationManager = new Et(e)),
            this._register(this._terminal.onWriteParsed(() => this._updateMatches())),
            this._register(this._terminal.onResize(() => this._updateMatches())),
            this._register(_e(() => this.clearDecorations())));
        }
        _updateMatches() {
          (this._highlightTimeout.clear(),
            this._state.cachedSearchTerm &&
              this._state.lastSearchOptions?.decorations &&
              (this._highlightTimeout.value = ve(() => {
                let e = this._state.cachedSearchTerm;
                (this._state.clearCachedTerm(),
                  this.findPrevious(
                    e,
                    { ...this._state.lastSearchOptions, incremental: !0 },
                    { noScroll: !0 },
                  ));
              }, 200)));
        }
        clearDecorations(e) {
          (this._resultTracker.clearSelectedDecoration(),
            this._decorationManager?.clearHighlightDecorations(),
            this._resultTracker.clearResults(),
            e || this._state.clearCachedTerm());
        }
        clearActiveDecoration() {
          this._resultTracker.clearSelectedDecoration();
        }
        findNext(e, t, n) {
          if (!this._terminal || !this._engine)
            throw Error(`Cannot use addon until it has been loaded`);
          ((this._state.lastSearchOptions = t),
            this._state.shouldUpdateHighlighting(e, t) && this._highlightAllMatches(e, t));
          let r = this._findNextAndSelect(e, t, n);
          return (this._fireResults(t), (this._state.cachedSearchTerm = e), r);
        }
        _highlightAllMatches(e, t) {
          if (!this._terminal || !this._engine || !this._decorationManager)
            throw Error(`Cannot use addon until it has been loaded`);
          if (!this._state.isValidSearchTerm(e)) {
            this.clearDecorations();
            return;
          }
          this.clearDecorations(!0);
          let n = [],
            r,
            i = this._engine.find(e, 0, 0, t);
          for (
            ;
            i && (r?.row !== i.row || r?.col !== i.col) && !(n.length >= this._highlightLimit);
          )
            ((r = i),
              n.push(r),
              (i = this._engine.find(
                e,
                r.col + r.term.length >= this._terminal.cols ? r.row + 1 : r.row,
                r.col + r.term.length >= this._terminal.cols ? 0 : r.col + 1,
                t,
              )));
          (this._resultTracker.updateResults(n, this._highlightLimit),
            t.decorations && this._decorationManager.createHighlightDecorations(n, t.decorations));
        }
        _findNextAndSelect(e, t, n) {
          if (!this._terminal || !this._engine) return !1;
          if (!this._state.isValidSearchTerm(e))
            return (this._terminal.clearSelection(), this.clearDecorations(), !1);
          let r = this._engine.findNextWithSelection(e, t, this._state.cachedSearchTerm);
          return this._selectResult(r, t?.decorations, n?.noScroll);
        }
        findPrevious(e, t, n) {
          if (!this._terminal || !this._engine)
            throw Error(`Cannot use addon until it has been loaded`);
          ((this._state.lastSearchOptions = t),
            this._state.shouldUpdateHighlighting(e, t) && this._highlightAllMatches(e, t));
          let r = this._findPreviousAndSelect(e, t, n);
          return (this._fireResults(t), (this._state.cachedSearchTerm = e), r);
        }
        _fireResults(e) {
          this._resultTracker.fireResultsChanged(!!e?.decorations);
        }
        _findPreviousAndSelect(e, t, n) {
          if (!this._terminal || !this._engine) return !1;
          if (!this._state.isValidSearchTerm(e))
            return (this._terminal.clearSelection(), this.clearDecorations(), !1);
          let r = this._engine.findPreviousWithSelection(e, t, this._state.cachedSearchTerm);
          return this._selectResult(r, t?.decorations, n?.noScroll);
        }
        _selectResult(e, t, n) {
          if (!this._terminal || !this._decorationManager) return !1;
          if ((this._resultTracker.clearSelectedDecoration(), !e))
            return (this._terminal.clearSelection(), !1);
          if ((this._terminal.select(e.col, e.row, e.size), t)) {
            let n = this._decorationManager.createActiveDecoration(e, t);
            n && (this._resultTracker.selectedDecoration = n);
          }
          if (
            !n &&
            (e.row >= this._terminal.buffer.active.viewportY + this._terminal.rows ||
              e.row < this._terminal.buffer.active.viewportY)
          ) {
            let t = e.row - this._terminal.buffer.active.viewportY;
            ((t -= Math.floor(this._terminal.rows / 2)), this._terminal.scrollLines(t));
          }
          return !0;
        }
      }));
  });
function At(e, t) {
  let n = 0,
    r = t.length - 1,
    i;
  if (e < t[0][0] || e > t[r][1]) return !1;
  for (; r >= n; )
    if (((i = (n + r) >> 1), e > t[i][1])) n = i + 1;
    else if (e < t[i][0]) r = i - 1;
    else return !0;
  return !1;
}
function jt(e) {
  Mt(e) || Zt.onUnexpectedError(e);
}
function Mt(e) {
  return e instanceof $t ? !0 : e instanceof Error && e.name === Qt && e.message === Qt;
}
function Nt(e, t) {
  let n = this,
    r = !1,
    i;
  return function () {
    if (r) return i;
    if (((r = !0), t))
      try {
        i = e.apply(n, arguments);
      } finally {
        t();
      }
    else i = e.apply(n, arguments);
    return i;
  };
}
function Pt(e, t, n = 0, r = e.length) {
  let i = n,
    a = r;
  for (; i < a; ) {
    let n = Math.floor((i + a) / 2);
    t(e[n]) ? (i = n + 1) : (a = n);
  }
  return i - 1;
}
function Ft(e, t) {
  return (n, r) => t(e(n), e(r));
}
function It(e, t) {
  let n = Object.create(null);
  for (let r of e) {
    let e = t(r),
      i = n[e];
    ((i ||= n[e] = []), i.push(r));
  }
  return n;
}
function Lt(e) {
  ln = e;
}
function Rt(e) {
  return (ln?.trackDisposable(e), e);
}
function zt(e) {
  ln?.markAsDisposed(e);
}
function Bt(e, t) {
  ln?.setParent(e, t);
}
function Vt(e, t) {
  if (ln) for (let n of e) ln.setParent(n, t);
}
function Ht(e) {
  if (sn.is(e)) {
    let t = [];
    for (let n of e)
      if (n)
        try {
          n.dispose();
        } catch (e) {
          t.push(e);
        }
    if (t.length === 1) throw t[0];
    if (t.length > 1) throw AggregateError(t, `Encountered errors while disposing of store`);
    return Array.isArray(e) ? [] : e;
  } else if (e) return (e.dispose(), e);
}
function Ut(...e) {
  let t = Wt(() => Ht(e));
  return (Vt(e, t), t);
}
function Wt(e) {
  let t = Rt({
    dispose: Nt(() => {
      (zt(t), e());
    }),
  });
  return t;
}
function Gt(e, t) {
  let n = 0,
    r = t.length - 1,
    i;
  if (e < t[0][0] || e > t[r][1]) return !1;
  for (; r >= n; )
    if (((i = (n + r) >> 1), e > t[i][1])) n = i + 1;
    else if (e < t[i][0]) r = i - 1;
    else return !0;
  return !1;
}
var Kt,
  qt,
  Jt,
  Yt,
  Xt,
  Zt,
  Qt,
  $t,
  en,
  tn,
  nn,
  rn,
  an,
  on,
  sn,
  cn,
  ln,
  un,
  dn,
  fn,
  pn,
  mn,
  hn,
  gn,
  _n,
  vn,
  yn,
  bn,
  xn,
  Sn,
  Cn,
  wn,
  Tn,
  En,
  Dn,
  On,
  kn,
  An,
  jn,
  Mn,
  Nn,
  Pn,
  Fn,
  In,
  Ln,
  Rn,
  zn,
  Bn,
  Vn,
  Hn,
  Un,
  Wn = t(() => {
    if (
      ((Kt = [
        [768, 879],
        [1155, 1158],
        [1160, 1161],
        [1425, 1469],
        [1471, 1471],
        [1473, 1474],
        [1476, 1477],
        [1479, 1479],
        [1536, 1539],
        [1552, 1557],
        [1611, 1630],
        [1648, 1648],
        [1750, 1764],
        [1767, 1768],
        [1770, 1773],
        [1807, 1807],
        [1809, 1809],
        [1840, 1866],
        [1958, 1968],
        [2027, 2035],
        [2305, 2306],
        [2364, 2364],
        [2369, 2376],
        [2381, 2381],
        [2385, 2388],
        [2402, 2403],
        [2433, 2433],
        [2492, 2492],
        [2497, 2500],
        [2509, 2509],
        [2530, 2531],
        [2561, 2562],
        [2620, 2620],
        [2625, 2626],
        [2631, 2632],
        [2635, 2637],
        [2672, 2673],
        [2689, 2690],
        [2748, 2748],
        [2753, 2757],
        [2759, 2760],
        [2765, 2765],
        [2786, 2787],
        [2817, 2817],
        [2876, 2876],
        [2879, 2879],
        [2881, 2883],
        [2893, 2893],
        [2902, 2902],
        [2946, 2946],
        [3008, 3008],
        [3021, 3021],
        [3134, 3136],
        [3142, 3144],
        [3146, 3149],
        [3157, 3158],
        [3260, 3260],
        [3263, 3263],
        [3270, 3270],
        [3276, 3277],
        [3298, 3299],
        [3393, 3395],
        [3405, 3405],
        [3530, 3530],
        [3538, 3540],
        [3542, 3542],
        [3633, 3633],
        [3636, 3642],
        [3655, 3662],
        [3761, 3761],
        [3764, 3769],
        [3771, 3772],
        [3784, 3789],
        [3864, 3865],
        [3893, 3893],
        [3895, 3895],
        [3897, 3897],
        [3953, 3966],
        [3968, 3972],
        [3974, 3975],
        [3984, 3991],
        [3993, 4028],
        [4038, 4038],
        [4141, 4144],
        [4146, 4146],
        [4150, 4151],
        [4153, 4153],
        [4184, 4185],
        [4448, 4607],
        [4959, 4959],
        [5906, 5908],
        [5938, 5940],
        [5970, 5971],
        [6002, 6003],
        [6068, 6069],
        [6071, 6077],
        [6086, 6086],
        [6089, 6099],
        [6109, 6109],
        [6155, 6157],
        [6313, 6313],
        [6432, 6434],
        [6439, 6440],
        [6450, 6450],
        [6457, 6459],
        [6679, 6680],
        [6912, 6915],
        [6964, 6964],
        [6966, 6970],
        [6972, 6972],
        [6978, 6978],
        [7019, 7027],
        [7616, 7626],
        [7678, 7679],
        [8203, 8207],
        [8234, 8238],
        [8288, 8291],
        [8298, 8303],
        [8400, 8431],
        [12330, 12335],
        [12441, 12442],
        [43014, 43014],
        [43019, 43019],
        [43045, 43046],
        [64286, 64286],
        [65024, 65039],
        [65056, 65059],
        [65279, 65279],
        [65529, 65531],
      ]),
      (qt = [
        [68097, 68099],
        [68101, 68102],
        [68108, 68111],
        [68152, 68154],
        [68159, 68159],
        [119143, 119145],
        [119155, 119170],
        [119173, 119179],
        [119210, 119213],
        [119362, 119364],
        [917505, 917505],
        [917536, 917631],
        [917760, 917999],
      ]),
      (Yt = class {
        constructor() {
          if (((this.version = `6`), !Jt)) {
            ((Jt = new Uint8Array(65536)),
              Jt.fill(1),
              (Jt[0] = 0),
              Jt.fill(0, 1, 32),
              Jt.fill(0, 127, 160),
              Jt.fill(2, 4352, 4448),
              (Jt[9001] = 2),
              (Jt[9002] = 2),
              Jt.fill(2, 11904, 42192),
              (Jt[12351] = 1),
              Jt.fill(2, 44032, 55204),
              Jt.fill(2, 63744, 64256),
              Jt.fill(2, 65040, 65050),
              Jt.fill(2, 65072, 65136),
              Jt.fill(2, 65280, 65377),
              Jt.fill(2, 65504, 65511));
            for (let e = 0; e < Kt.length; ++e) Jt.fill(0, Kt[e][0], Kt[e][1] + 1);
          }
        }
        wcwidth(e) {
          return e < 32
            ? 0
            : e < 127
              ? 1
              : e < 65536
                ? Jt[e]
                : At(e, qt)
                  ? 0
                  : (e >= 131072 && e <= 196605) || (e >= 196608 && e <= 262141)
                    ? 2
                    : 1;
        }
        charProperties(e, t) {
          let n = this.wcwidth(e),
            r = n === 0 && t !== 0;
          if (r) {
            let e = In.extractWidth(t);
            e === 0 ? (r = !1) : e > n && (n = e);
          }
          return In.createPropertyValue(0, n, r);
        }
      }),
      (Xt = class {
        constructor() {
          ((this.listeners = []),
            (this.unexpectedErrorHandler = function (e) {
              setTimeout(() => {
                throw e.stack
                  ? en.isErrorNoTelemetry(e)
                    ? new en(
                        e.message +
                          `

` +
                          e.stack,
                      )
                    : Error(
                        e.message +
                          `

` +
                          e.stack,
                      )
                  : e;
              }, 0);
            }));
        }
        addListener(e) {
          return (
            this.listeners.push(e),
            () => {
              this._removeListener(e);
            }
          );
        }
        emit(e) {
          this.listeners.forEach((t) => {
            t(e);
          });
        }
        _removeListener(e) {
          this.listeners.splice(this.listeners.indexOf(e), 1);
        }
        setUnexpectedErrorHandler(e) {
          this.unexpectedErrorHandler = e;
        }
        getUnexpectedErrorHandler() {
          return this.unexpectedErrorHandler;
        }
        onUnexpectedError(e) {
          (this.unexpectedErrorHandler(e), this.emit(e));
        }
        onUnexpectedExternalError(e) {
          this.unexpectedErrorHandler(e);
        }
      }),
      (Zt = new Xt()),
      (Qt = `Canceled`),
      ($t = class extends Error {
        constructor() {
          (super(Qt), (this.name = this.message));
        }
      }),
      (en = class e extends Error {
        constructor(e) {
          (super(e), (this.name = `CodeExpectedError`));
        }
        static fromError(t) {
          if (t instanceof e) return t;
          let n = new e();
          return ((n.message = t.message), (n.stack = t.stack), n);
        }
        static isErrorNoTelemetry(e) {
          return e.name === `CodeExpectedError`;
        }
      }),
      (tn = class e {
        constructor(e) {
          ((this._array = e), (this._findLastMonotonousLastIdx = 0));
        }
        findLastMonotonous(t) {
          if (e.assertInvariants) {
            if (this._prevFindLastPredicate) {
              for (let e of this._array)
                if (this._prevFindLastPredicate(e) && !t(e))
                  throw Error(
                    `MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.`,
                  );
            }
            this._prevFindLastPredicate = t;
          }
          let n = Pt(this._array, t, this._findLastMonotonousLastIdx);
          return ((this._findLastMonotonousLastIdx = n + 1), n === -1 ? void 0 : this._array[n]);
        }
      }),
      (tn.assertInvariants = !1),
      ((e) => {
        function t(e) {
          return e < 0;
        }
        e.isLessThan = t;
        function n(e) {
          return e <= 0;
        }
        e.isLessThanOrEqual = n;
        function r(e) {
          return e > 0;
        }
        e.isGreaterThan = r;
        function i(e) {
          return e === 0;
        }
        ((e.isNeitherLessOrGreaterThan = i),
          (e.greaterThan = 1),
          (e.lessThan = -1),
          (e.neitherLessOrGreaterThan = 0));
      })((nn ||= {})),
      (rn = (e, t) => e - t),
      (an = class e {
        constructor(e) {
          this.iterate = e;
        }
        forEach(e) {
          this.iterate((t) => (e(t), !0));
        }
        toArray() {
          let e = [];
          return (this.iterate((t) => (e.push(t), !0)), e);
        }
        filter(t) {
          return new e((e) => this.iterate((n) => (t(n) ? e(n) : !0)));
        }
        map(t) {
          return new e((e) => this.iterate((n) => e(t(n))));
        }
        some(e) {
          let t = !1;
          return (this.iterate((n) => ((t = e(n)), !t)), t);
        }
        findFirst(e) {
          let t;
          return (this.iterate((n) => (e(n) ? ((t = n), !1) : !0)), t);
        }
        findLast(e) {
          let t;
          return (this.iterate((n) => (e(n) && (t = n), !0)), t);
        }
        findLastMaxBy(e) {
          let t,
            n = !0;
          return (
            this.iterate((r) => ((n || nn.isGreaterThan(e(r, t))) && ((n = !1), (t = r)), !0)), t
          );
        }
      }),
      (an.empty = new an((e) => {})),
      (on = class {
        constructor() {
          this.map = new Map();
        }
        add(e, t) {
          let n = this.map.get(e);
          (n || ((n = new Set()), this.map.set(e, n)), n.add(t));
        }
        delete(e, t) {
          let n = this.map.get(e);
          n && (n.delete(t), n.size === 0 && this.map.delete(e));
        }
        forEach(e, t) {
          let n = this.map.get(e);
          n && n.forEach(t);
        }
        get(e) {
          return this.map.get(e) || new Set();
        }
      }),
      ((e) => {
        function t(e) {
          return e && typeof e == `object` && typeof e[Symbol.iterator] == `function`;
        }
        e.is = t;
        let n = Object.freeze([]);
        function r() {
          return n;
        }
        e.empty = r;
        function* i(e) {
          yield e;
        }
        e.single = i;
        function a(e) {
          return t(e) ? e : i(e);
        }
        e.wrap = a;
        function o(e) {
          return e || n;
        }
        e.from = o;
        function* s(e) {
          for (let t = e.length - 1; t >= 0; t--) yield e[t];
        }
        e.reverse = s;
        function c(e) {
          return !e || e[Symbol.iterator]().next().done === !0;
        }
        e.isEmpty = c;
        function l(e) {
          return e[Symbol.iterator]().next().value;
        }
        e.first = l;
        function u(e, t) {
          let n = 0;
          for (let r of e) if (t(r, n++)) return !0;
          return !1;
        }
        e.some = u;
        function d(e, t) {
          for (let n of e) if (t(n)) return n;
        }
        e.find = d;
        function* f(e, t) {
          for (let n of e) t(n) && (yield n);
        }
        e.filter = f;
        function* p(e, t) {
          let n = 0;
          for (let r of e) yield t(r, n++);
        }
        e.map = p;
        function* m(e, t) {
          let n = 0;
          for (let r of e) yield* t(r, n++);
        }
        e.flatMap = m;
        function* h(...e) {
          for (let t of e) yield* t;
        }
        e.concat = h;
        function g(e, t, n) {
          let r = n;
          for (let n of e) r = t(r, n);
          return r;
        }
        e.reduce = g;
        function* _(e, t, n = e.length) {
          for (
            t < 0 && (t += e.length), n < 0 ? (n += e.length) : n > e.length && (n = e.length);
            t < n;
            t++
          )
            yield e[t];
        }
        e.slice = _;
        function v(t, n = 1 / 0) {
          let r = [];
          if (n === 0) return [r, t];
          let i = t[Symbol.iterator]();
          for (let t = 0; t < n; t++) {
            let t = i.next();
            if (t.done) return [r, e.empty()];
            r.push(t.value);
          }
          return [
            r,
            {
              [Symbol.iterator]() {
                return i;
              },
            },
          ];
        }
        e.consume = v;
        async function y(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return Promise.resolve(t);
        }
        e.asyncToArray = y;
      })((sn ||= {})),
      (cn = !1),
      (ln = null),
      (un = class e {
        constructor() {
          this.livingDisposables = new Map();
        }
        getDisposableData(t) {
          let n = this.livingDisposables.get(t);
          return (
            n ||
              ((n = { parent: null, source: null, isSingleton: !1, value: t, idx: e.idx++ }),
              this.livingDisposables.set(t, n)),
            n
          );
        }
        trackDisposable(e) {
          let t = this.getDisposableData(e);
          t.source ||= Error().stack;
        }
        setParent(e, t) {
          let n = this.getDisposableData(e);
          n.parent = t;
        }
        markAsDisposed(e) {
          this.livingDisposables.delete(e);
        }
        markAsSingleton(e) {
          this.getDisposableData(e).isSingleton = !0;
        }
        getRootParent(e, t) {
          let n = t.get(e);
          if (n) return n;
          let r = e.parent ? this.getRootParent(this.getDisposableData(e.parent), t) : e;
          return (t.set(e, r), r);
        }
        getTrackedDisposables() {
          let e = new Map();
          return [...this.livingDisposables.entries()]
            .filter(([, t]) => t.source !== null && !this.getRootParent(t, e).isSingleton)
            .flatMap(([e]) => e);
        }
        computeLeakingDisposables(e = 10, t) {
          let n;
          if (t) n = t;
          else {
            let e = new Map(),
              t = [...this.livingDisposables.values()].filter(
                (t) => t.source !== null && !this.getRootParent(t, e).isSingleton,
              );
            if (t.length === 0) return;
            let r = new Set(t.map((e) => e.value));
            if (((n = t.filter((e) => !(e.parent && r.has(e.parent)))), n.length === 0))
              throw Error(`There are cyclic diposable chains!`);
          }
          if (!n) return;
          function r(e) {
            function t(e, t) {
              for (
                ;
                e.length > 0 && t.some((t) => (typeof t == `string` ? t === e[0] : e[0].match(t)));
              )
                e.shift();
            }
            let n = e.source
              .split(`
`)
              .map((e) => e.trim().replace(`at `, ``))
              .filter((e) => e !== ``);
            return (
              t(n, [
                `Error`,
                /^trackDisposable \(.*\)$/,
                /^DisposableTracker.trackDisposable \(.*\)$/,
              ]),
              n.reverse()
            );
          }
          let i = new on();
          for (let e of n) {
            let t = r(e);
            for (let n = 0; n <= t.length; n++)
              i.add(
                t.slice(0, n).join(`
`),
                e,
              );
          }
          n.sort(Ft((e) => e.idx, rn));
          let a = ``,
            o = 0;
          for (let t of n.slice(0, e)) {
            o++;
            let e = r(t),
              s = [];
            for (let t = 0; t < e.length; t++) {
              let a = e[t];
              a = `(shared with ${
                i.get(
                  e.slice(0, t + 1).join(`
`),
                ).size
              }/${n.length} leaks) at ${a}`;
              let o = It(
                [
                  ...i.get(
                    e.slice(0, t).join(`
`),
                  ),
                ].map((e) => r(e)[t]),
                (e) => e,
              );
              delete o[e[t]];
              for (let [e, t] of Object.entries(o))
                s.unshift(`    - stacktraces of ${t.length} other leaks continue with ${e}`);
              s.unshift(a);
            }
            a += `


==================== Leaking disposable ${o}/${n.length}: ${t.value.constructor.name} ====================
${s.join(`
`)}
============================================================

`;
          }
          return (
            n.length > e &&
              (a += `


... and ${n.length - e} more leaking disposables

`),
            { leaks: n, details: a }
          );
        }
      }),
      (un.idx = 0),
      cn)
    ) {
      let e = `__is_disposable_tracked__`;
      Lt(
        new (class {
          trackDisposable(t) {
            let n = Error(`Potentially leaked disposable`).stack;
            setTimeout(() => {
              t[e] || console.log(n);
            }, 3e3);
          }
          setParent(t, n) {
            if (t && t !== pn.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsDisposed(t) {
            if (t && t !== pn.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsSingleton(e) {}
        })(),
      );
    }
    if (
      ((dn = class e {
        constructor() {
          ((this._toDispose = new Set()), (this._isDisposed = !1), Rt(this));
        }
        dispose() {
          this._isDisposed || (zt(this), (this._isDisposed = !0), this.clear());
        }
        get isDisposed() {
          return this._isDisposed;
        }
        clear() {
          if (this._toDispose.size !== 0)
            try {
              Ht(this._toDispose);
            } finally {
              this._toDispose.clear();
            }
        }
        add(t) {
          if (!t) return t;
          if (t === this) throw Error(`Cannot register a disposable on itself!`);
          return (
            Bt(t, this),
            this._isDisposed
              ? e.DISABLE_DISPOSED_WARNING ||
                console.warn(
                  Error(
                    `Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!`,
                  ).stack,
                )
              : this._toDispose.add(t),
            t
          );
        }
        delete(e) {
          if (e) {
            if (e === this) throw Error(`Cannot dispose a disposable on itself!`);
            (this._toDispose.delete(e), e.dispose());
          }
        }
        deleteAndLeak(e) {
          e && this._toDispose.has(e) && (this._toDispose.delete(e), Bt(e, null));
        }
      }),
      (dn.DISABLE_DISPOSED_WARNING = !1),
      (fn = dn),
      (pn = class {
        constructor() {
          ((this._store = new fn()), Rt(this), Bt(this._store, this));
        }
        dispose() {
          (zt(this), this._store.dispose());
        }
        _register(e) {
          if (e === this) throw Error(`Cannot register a disposable on itself!`);
          return this._store.add(e);
        }
      }),
      (pn.None = Object.freeze({ dispose() {} })),
      (mn = class e {
        constructor(t) {
          ((this.element = t), (this.next = e.Undefined), (this.prev = e.Undefined));
        }
      }),
      (mn.Undefined = new mn(void 0)),
      (hn = globalThis.performance && typeof globalThis.performance.now == `function`),
      (gn = class e {
        static create(t) {
          return new e(t);
        }
        constructor(e) {
          ((this._now =
            hn && e === !1 ? Date.now : globalThis.performance.now.bind(globalThis.performance)),
            (this._startTime = this._now()),
            (this._stopTime = -1));
        }
        stop() {
          this._stopTime = this._now();
        }
        reset() {
          ((this._startTime = this._now()), (this._stopTime = -1));
        }
        elapsed() {
          return this._stopTime === -1
            ? this._now() - this._startTime
            : this._stopTime - this._startTime;
        }
      }),
      (_n = !1),
      (vn = !1),
      (yn = !1),
      ((e) => {
        e.None = () => pn.None;
        function t(e) {
          if (yn) {
            let { onDidAddListener: t } = e,
              n = En.create(),
              r = 0;
            e.onDidAddListener = () => {
              (++r === 2 &&
                (console.warn(
                  `snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here`,
                ),
                n.print()),
                t?.());
            };
          }
        }
        function n(e, t) {
          return f(e, () => {}, 0, void 0, !0, void 0, t);
        }
        e.defer = n;
        function r(e) {
          return (t, n = null, r) => {
            let i = !1,
              a;
            return (
              (a = e(
                (e) => {
                  if (!i) return (a ? a.dispose() : (i = !0), t.call(n, e));
                },
                null,
                r,
              )),
              i && a.dispose(),
              a
            );
          };
        }
        e.once = r;
        function i(e, t, n) {
          return u((n, r = null, i) => e((e) => n.call(r, t(e)), null, i), n);
        }
        e.map = i;
        function a(e, t, n) {
          return u(
            (n, r = null, i) =>
              e(
                (e) => {
                  (t(e), n.call(r, e));
                },
                null,
                i,
              ),
            n,
          );
        }
        e.forEach = a;
        function o(e, t, n) {
          return u((n, r = null, i) => e((e) => t(e) && n.call(r, e), null, i), n);
        }
        e.filter = o;
        function s(e) {
          return e;
        }
        e.signal = s;
        function c(...e) {
          return (t, n = null, r) => d(Ut(...e.map((e) => e((e) => t.call(n, e)))), r);
        }
        e.any = c;
        function l(e, t, n, r) {
          let a = n;
          return i(e, (e) => ((a = t(a, e)), a), r);
        }
        e.reduce = l;
        function u(e, n) {
          let r,
            i = {
              onWillAddFirstListener() {
                r = e(a.fire, a);
              },
              onDidRemoveLastListener() {
                r?.dispose();
              },
            };
          n || t(i);
          let a = new Pn(i);
          return (n?.add(a), a.event);
        }
        function d(e, t) {
          return (t instanceof Array ? t.push(e) : t && t.add(e), e);
        }
        function f(e, n, r = 100, i = !1, a = !1, o, s) {
          let c,
            l,
            u,
            d = 0,
            f,
            p = {
              leakWarningThreshold: o,
              onWillAddFirstListener() {
                c = e((e) => {
                  (d++,
                    (l = n(l, e)),
                    i && !u && (m.fire(l), (l = void 0)),
                    (f = () => {
                      let e = l;
                      ((l = void 0), (u = void 0), (!i || d > 1) && m.fire(e), (d = 0));
                    }),
                    typeof r == `number`
                      ? (clearTimeout(u), (u = setTimeout(f, r)))
                      : u === void 0 && ((u = 0), queueMicrotask(f)));
                });
              },
              onWillRemoveListener() {
                a && d > 0 && f?.();
              },
              onDidRemoveLastListener() {
                ((f = void 0), c.dispose());
              },
            };
          s || t(p);
          let m = new Pn(p);
          return (s?.add(m), m.event);
        }
        e.debounce = f;
        function p(t, n = 0, r) {
          return e.debounce(t, (e, t) => (e ? (e.push(t), e) : [t]), n, void 0, !0, void 0, r);
        }
        e.accumulate = p;
        function m(e, t = (e, t) => e === t, n) {
          let r = !0,
            i;
          return o(
            e,
            (e) => {
              let n = r || !t(e, i);
              return ((r = !1), (i = e), n);
            },
            n,
          );
        }
        e.latch = m;
        function h(t, n, r) {
          return [e.filter(t, n, r), e.filter(t, (e) => !n(e), r)];
        }
        e.split = h;
        function g(e, t = !1, n = [], r) {
          let i = n.slice(),
            a = e((e) => {
              i ? i.push(e) : s.fire(e);
            });
          r && r.add(a);
          let o = () => {
              (i?.forEach((e) => s.fire(e)), (i = null));
            },
            s = new Pn({
              onWillAddFirstListener() {
                a || ((a = e((e) => s.fire(e))), r && r.add(a));
              },
              onDidAddFirstListener() {
                i && (t ? setTimeout(o) : o());
              },
              onDidRemoveLastListener() {
                (a && a.dispose(), (a = null));
              },
            });
          return (r && r.add(s), s.event);
        }
        e.buffer = g;
        function _(e, t) {
          return (n, r, i) => {
            let a = t(new y());
            return e(
              function (e) {
                let t = a.evaluate(e);
                t !== v && n.call(r, t);
              },
              void 0,
              i,
            );
          };
        }
        e.chain = _;
        let v = Symbol(`HaltChainable`);
        class y {
          constructor() {
            this.steps = [];
          }
          map(e) {
            return (this.steps.push(e), this);
          }
          forEach(e) {
            return (this.steps.push((t) => (e(t), t)), this);
          }
          filter(e) {
            return (this.steps.push((t) => (e(t) ? t : v)), this);
          }
          reduce(e, t) {
            let n = t;
            return (this.steps.push((t) => ((n = e(n, t)), n)), this);
          }
          latch(e = (e, t) => e === t) {
            let t = !0,
              n;
            return (
              this.steps.push((r) => {
                let i = t || !e(r, n);
                return ((t = !1), (n = r), i ? r : v);
              }),
              this
            );
          }
          evaluate(e) {
            for (let t of this.steps) if (((e = t(e)), e === v)) break;
            return e;
          }
        }
        function b(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new Pn({
              onWillAddFirstListener: () => e.on(t, r),
              onDidRemoveLastListener: () => e.removeListener(t, r),
            });
          return i.event;
        }
        e.fromNodeEventEmitter = b;
        function x(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new Pn({
              onWillAddFirstListener: () => e.addEventListener(t, r),
              onDidRemoveLastListener: () => e.removeEventListener(t, r),
            });
          return i.event;
        }
        e.fromDOMEventEmitter = x;
        function S(e) {
          return new Promise((t) => r(e)(t));
        }
        e.toPromise = S;
        function C(e) {
          let t = new Pn();
          return (
            e
              .then(
                (e) => {
                  t.fire(e);
                },
                () => {
                  t.fire(void 0);
                },
              )
              .finally(() => {
                t.dispose();
              }),
            t.event
          );
        }
        e.fromPromise = C;
        function w(e, t) {
          return e((e) => t.fire(e));
        }
        e.forward = w;
        function T(e, t, n) {
          return (t(n), e((e) => t(e)));
        }
        e.runAndSubscribe = T;
        class E {
          constructor(e, n) {
            ((this._observable = e), (this._counter = 0), (this._hasChanged = !1));
            let r = {
              onWillAddFirstListener: () => {
                e.addObserver(this);
              },
              onDidRemoveLastListener: () => {
                e.removeObserver(this);
              },
            };
            (n || t(r), (this.emitter = new Pn(r)), n && n.add(this.emitter));
          }
          beginUpdate(e) {
            this._counter++;
          }
          handlePossibleChange(e) {}
          handleChange(e, t) {
            this._hasChanged = !0;
          }
          endUpdate(e) {
            (this._counter--,
              this._counter === 0 &&
                (this._observable.reportChanges(),
                this._hasChanged &&
                  ((this._hasChanged = !1), this.emitter.fire(this._observable.get()))));
          }
        }
        function D(e, t) {
          return new E(e, t).emitter.event;
        }
        e.fromObservable = D;
        function ee(e) {
          return (t, n, r) => {
            let i = 0,
              a = !1,
              o = {
                beginUpdate() {
                  i++;
                },
                endUpdate() {
                  (i--, i === 0 && (e.reportChanges(), a && ((a = !1), t.call(n))));
                },
                handlePossibleChange() {},
                handleChange() {
                  a = !0;
                },
              };
            (e.addObserver(o), e.reportChanges());
            let s = {
              dispose() {
                e.removeObserver(o);
              },
            };
            return (r instanceof fn ? r.add(s) : Array.isArray(r) && r.push(s), s);
          };
        }
        e.fromObservableLight = ee;
      })((bn ||= {})),
      (xn = class e {
        constructor(t) {
          ((this.listenerCount = 0),
            (this.invocationCount = 0),
            (this.elapsedOverall = 0),
            (this.durations = []),
            (this.name = `${t}_${e._idPool++}`),
            e.all.add(this));
        }
        start(e) {
          ((this._stopWatch = new gn()), (this.listenerCount = e));
        }
        stop() {
          if (this._stopWatch) {
            let e = this._stopWatch.elapsed();
            (this.durations.push(e),
              (this.elapsedOverall += e),
              (this.invocationCount += 1),
              (this._stopWatch = void 0));
          }
        }
      }),
      (xn.all = new Set()),
      (xn._idPool = 0),
      (Sn = xn),
      (Cn = -1),
      (wn = class e {
        constructor(t, n, r = (e._idPool++).toString(16).padStart(3, `0`)) {
          ((this._errorHandler = t),
            (this.threshold = n),
            (this.name = r),
            (this._warnCountdown = 0));
        }
        dispose() {
          this._stacks?.clear();
        }
        check(e, t) {
          let n = this.threshold;
          if (n <= 0 || t < n) return;
          this._stacks ||= new Map();
          let r = this._stacks.get(e.value) || 0;
          if ((this._stacks.set(e.value, r + 1), --this._warnCountdown, this._warnCountdown <= 0)) {
            this._warnCountdown = n * 0.5;
            let [e, r] = this.getMostFrequentStack(),
              i = `[${this.name}] potential listener LEAK detected, having ${t} listeners already. MOST frequent listener (${r}):`;
            (console.warn(i), console.warn(e));
            let a = new Dn(i, e);
            this._errorHandler(a);
          }
          return () => {
            let t = this._stacks.get(e.value) || 0;
            this._stacks.set(e.value, t - 1);
          };
        }
        getMostFrequentStack() {
          if (!this._stacks) return;
          let e,
            t = 0;
          for (let [n, r] of this._stacks) (!e || t < r) && ((e = [n, r]), (t = r));
          return e;
        }
      }),
      (wn._idPool = 1),
      (Tn = wn),
      (En = class e {
        constructor(e) {
          this.value = e;
        }
        static create() {
          return new e(Error().stack ?? ``);
        }
        print() {
          console.warn(
            this.value
              .split(`
`)
              .slice(2).join(`
`),
          );
        }
      }),
      (Dn = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerLeakError`), (this.stack = t));
        }
      }),
      (On = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerRefusalError`), (this.stack = t));
        }
      }),
      (kn = 0),
      (An = class {
        constructor(e) {
          ((this.value = e), (this.id = kn++));
        }
      }),
      (jn = 2),
      (Mn = (e, t) => {
        if (e instanceof An) t(e);
        else
          for (let n = 0; n < e.length; n++) {
            let r = e[n];
            r && t(r);
          }
      }),
      _n)
    ) {
      let e = [];
      (setInterval(() => {
        e.length !== 0 &&
          (console.warn(`[LEAKING LISTENERS] GC'ed these listeners that were NOT yet disposed:`),
          console.warn(
            e.join(`
`),
          ),
          (e.length = 0));
      }, 3e3),
        (Nn = new FinalizationRegistry((t) => {
          typeof t == `string` && e.push(t);
        })));
    }
    ((Pn = class {
      constructor(e) {
        ((this._size = 0),
          (this._options = e),
          (this._leakageMon =
            Cn > 0 || this._options?.leakWarningThreshold
              ? new Tn(e?.onListenerError ?? jt, this._options?.leakWarningThreshold ?? Cn)
              : void 0),
          (this._perfMon = this._options?._profName ? new Sn(this._options._profName) : void 0),
          (this._deliveryQueue = this._options?.deliveryQueue));
      }
      dispose() {
        if (!this._disposed) {
          if (
            ((this._disposed = !0),
            this._deliveryQueue?.current === this && this._deliveryQueue.reset(),
            this._listeners)
          ) {
            if (vn) {
              let e = this._listeners;
              queueMicrotask(() => {
                Mn(e, (e) => e.stack?.print());
              });
            }
            ((this._listeners = void 0), (this._size = 0));
          }
          (this._options?.onDidRemoveLastListener?.(), this._leakageMon?.dispose());
        }
      }
      get event() {
        return (
          (this._event ??= (e, t, n) => {
            if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
              let e = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
              console.warn(e);
              let t = this._leakageMon.getMostFrequentStack() ?? [`UNKNOWN stack`, -1],
                n = new On(`${e}. HINT: Stack shows most frequent listener (${t[1]}-times)`, t[0]);
              return ((this._options?.onListenerError || jt)(n), pn.None);
            }
            if (this._disposed) return pn.None;
            t && (e = e.bind(t));
            let r = new An(e),
              i;
            (this._leakageMon &&
              this._size >= Math.ceil(this._leakageMon.threshold * 0.2) &&
              ((r.stack = En.create()), (i = this._leakageMon.check(r.stack, this._size + 1))),
              vn && (r.stack = En.create()),
              this._listeners
                ? this._listeners instanceof An
                  ? ((this._deliveryQueue ??= new Fn()), (this._listeners = [this._listeners, r]))
                  : this._listeners.push(r)
                : (this._options?.onWillAddFirstListener?.(this),
                  (this._listeners = r),
                  this._options?.onDidAddFirstListener?.(this)),
              this._size++);
            let a = Wt(() => {
              (Nn?.unregister(a), i?.(), this._removeListener(r));
            });
            if ((n instanceof fn ? n.add(a) : Array.isArray(n) && n.push(a), Nn)) {
              let e = Error()
                  .stack.split(`
`)
                  .slice(2, 3)
                  .join(`
`)
                  .trim(),
                t = /(file:|vscode-file:\/\/vscode-app)?(\/[^:]*:\d+:\d+)/.exec(e);
              Nn.register(a, t?.[2] ?? e, a);
            }
            return a;
          }),
          this._event
        );
      }
      _removeListener(e) {
        if ((this._options?.onWillRemoveListener?.(this), !this._listeners)) return;
        if (this._size === 1) {
          ((this._listeners = void 0),
            this._options?.onDidRemoveLastListener?.(this),
            (this._size = 0));
          return;
        }
        let t = this._listeners,
          n = t.indexOf(e);
        if (n === -1)
          throw (
            console.log(`disposed?`, this._disposed),
            console.log(`size?`, this._size),
            console.log(`arr?`, JSON.stringify(this._listeners)),
            Error(`Attempted to dispose unknown listener`)
          );
        (this._size--, (t[n] = void 0));
        let r = this._deliveryQueue.current === this;
        if (this._size * jn <= t.length) {
          let e = 0;
          for (let n = 0; n < t.length; n++)
            t[n]
              ? (t[e++] = t[n])
              : r &&
                (this._deliveryQueue.end--, e < this._deliveryQueue.i && this._deliveryQueue.i--);
          t.length = e;
        }
      }
      _deliver(e, t) {
        if (!e) return;
        let n = this._options?.onListenerError || jt;
        if (!n) {
          e.value(t);
          return;
        }
        try {
          e.value(t);
        } catch (e) {
          n(e);
        }
      }
      _deliverQueue(e) {
        let t = e.current._listeners;
        for (; e.i < e.end; ) this._deliver(t[e.i++], e.value);
        e.reset();
      }
      fire(e) {
        if (
          (this._deliveryQueue?.current &&
            (this._deliverQueue(this._deliveryQueue), this._perfMon?.stop()),
          this._perfMon?.start(this._size),
          this._listeners)
        )
          if (this._listeners instanceof An) this._deliver(this._listeners, e);
          else {
            let t = this._deliveryQueue;
            (t.enqueue(this, e, this._listeners.length), this._deliverQueue(t));
          }
        this._perfMon?.stop();
      }
      hasListeners() {
        return this._size > 0;
      }
    }),
      (Fn = class {
        constructor() {
          ((this.i = -1), (this.end = 0));
        }
        enqueue(e, t, n) {
          ((this.i = 0), (this.end = n), (this.current = e), (this.value = t));
        }
        reset() {
          ((this.i = this.end), (this.current = void 0), (this.value = void 0));
        }
      }),
      (In = class e {
        constructor() {
          ((this._providers = Object.create(null)),
            (this._active = ``),
            (this._onChange = new Pn()),
            (this.onChange = this._onChange.event));
          let e = new Yt();
          (this.register(e), (this._active = e.version), (this._activeProvider = e));
        }
        static extractShouldJoin(e) {
          return (e & 1) != 0;
        }
        static extractWidth(e) {
          return (e >> 1) & 3;
        }
        static extractCharKind(e) {
          return e >> 3;
        }
        static createPropertyValue(e, t, n = !1) {
          return ((e & 16777215) << 3) | ((t & 3) << 1) | (n ? 1 : 0);
        }
        dispose() {
          this._onChange.dispose();
        }
        get versions() {
          return Object.keys(this._providers);
        }
        get activeVersion() {
          return this._active;
        }
        set activeVersion(e) {
          if (!this._providers[e]) throw Error(`unknown Unicode version "${e}"`);
          ((this._active = e), (this._activeProvider = this._providers[e]), this._onChange.fire(e));
        }
        register(e) {
          this._providers[e.version] = e;
        }
        wcwidth(e) {
          return this._activeProvider.wcwidth(e);
        }
        getStringCellWidth(t) {
          let n = 0,
            r = 0,
            i = t.length;
          for (let a = 0; a < i; ++a) {
            let o = t.charCodeAt(a);
            if (55296 <= o && o <= 56319) {
              if (++a >= i) return n + this.wcwidth(o);
              let e = t.charCodeAt(a);
              56320 <= e && e <= 57343
                ? (o = (o - 55296) * 1024 + e - 56320 + 65536)
                : (n += this.wcwidth(e));
            }
            let s = this.charProperties(o, r),
              c = e.extractWidth(s);
            (e.extractShouldJoin(s) && (c -= e.extractWidth(r)), (n += c), (r = s));
          }
          return n;
        }
        charProperties(e, t) {
          return this._activeProvider.charProperties(e, t);
        }
      }),
      (Ln = [
        [768, 879],
        [1155, 1161],
        [1425, 1469],
        [1471, 1471],
        [1473, 1474],
        [1476, 1477],
        [1479, 1479],
        [1536, 1541],
        [1552, 1562],
        [1564, 1564],
        [1611, 1631],
        [1648, 1648],
        [1750, 1757],
        [1759, 1764],
        [1767, 1768],
        [1770, 1773],
        [1807, 1807],
        [1809, 1809],
        [1840, 1866],
        [1958, 1968],
        [2027, 2035],
        [2045, 2045],
        [2070, 2073],
        [2075, 2083],
        [2085, 2087],
        [2089, 2093],
        [2137, 2139],
        [2259, 2306],
        [2362, 2362],
        [2364, 2364],
        [2369, 2376],
        [2381, 2381],
        [2385, 2391],
        [2402, 2403],
        [2433, 2433],
        [2492, 2492],
        [2497, 2500],
        [2509, 2509],
        [2530, 2531],
        [2558, 2558],
        [2561, 2562],
        [2620, 2620],
        [2625, 2626],
        [2631, 2632],
        [2635, 2637],
        [2641, 2641],
        [2672, 2673],
        [2677, 2677],
        [2689, 2690],
        [2748, 2748],
        [2753, 2757],
        [2759, 2760],
        [2765, 2765],
        [2786, 2787],
        [2810, 2815],
        [2817, 2817],
        [2876, 2876],
        [2879, 2879],
        [2881, 2884],
        [2893, 2893],
        [2902, 2902],
        [2914, 2915],
        [2946, 2946],
        [3008, 3008],
        [3021, 3021],
        [3072, 3072],
        [3076, 3076],
        [3134, 3136],
        [3142, 3144],
        [3146, 3149],
        [3157, 3158],
        [3170, 3171],
        [3201, 3201],
        [3260, 3260],
        [3263, 3263],
        [3270, 3270],
        [3276, 3277],
        [3298, 3299],
        [3328, 3329],
        [3387, 3388],
        [3393, 3396],
        [3405, 3405],
        [3426, 3427],
        [3530, 3530],
        [3538, 3540],
        [3542, 3542],
        [3633, 3633],
        [3636, 3642],
        [3655, 3662],
        [3761, 3761],
        [3764, 3772],
        [3784, 3789],
        [3864, 3865],
        [3893, 3893],
        [3895, 3895],
        [3897, 3897],
        [3953, 3966],
        [3968, 3972],
        [3974, 3975],
        [3981, 3991],
        [3993, 4028],
        [4038, 4038],
        [4141, 4144],
        [4146, 4151],
        [4153, 4154],
        [4157, 4158],
        [4184, 4185],
        [4190, 4192],
        [4209, 4212],
        [4226, 4226],
        [4229, 4230],
        [4237, 4237],
        [4253, 4253],
        [4448, 4607],
        [4957, 4959],
        [5906, 5908],
        [5938, 5940],
        [5970, 5971],
        [6002, 6003],
        [6068, 6069],
        [6071, 6077],
        [6086, 6086],
        [6089, 6099],
        [6109, 6109],
        [6155, 6158],
        [6277, 6278],
        [6313, 6313],
        [6432, 6434],
        [6439, 6440],
        [6450, 6450],
        [6457, 6459],
        [6679, 6680],
        [6683, 6683],
        [6742, 6742],
        [6744, 6750],
        [6752, 6752],
        [6754, 6754],
        [6757, 6764],
        [6771, 6780],
        [6783, 6783],
        [6832, 6846],
        [6912, 6915],
        [6964, 6964],
        [6966, 6970],
        [6972, 6972],
        [6978, 6978],
        [7019, 7027],
        [7040, 7041],
        [7074, 7077],
        [7080, 7081],
        [7083, 7085],
        [7142, 7142],
        [7144, 7145],
        [7149, 7149],
        [7151, 7153],
        [7212, 7219],
        [7222, 7223],
        [7376, 7378],
        [7380, 7392],
        [7394, 7400],
        [7405, 7405],
        [7412, 7412],
        [7416, 7417],
        [7616, 7673],
        [7675, 7679],
        [8203, 8207],
        [8234, 8238],
        [8288, 8292],
        [8294, 8303],
        [8400, 8432],
        [11503, 11505],
        [11647, 11647],
        [11744, 11775],
        [12330, 12333],
        [12441, 12442],
        [42607, 42610],
        [42612, 42621],
        [42654, 42655],
        [42736, 42737],
        [43010, 43010],
        [43014, 43014],
        [43019, 43019],
        [43045, 43046],
        [43204, 43205],
        [43232, 43249],
        [43263, 43263],
        [43302, 43309],
        [43335, 43345],
        [43392, 43394],
        [43443, 43443],
        [43446, 43449],
        [43452, 43453],
        [43493, 43493],
        [43561, 43566],
        [43569, 43570],
        [43573, 43574],
        [43587, 43587],
        [43596, 43596],
        [43644, 43644],
        [43696, 43696],
        [43698, 43700],
        [43703, 43704],
        [43710, 43711],
        [43713, 43713],
        [43756, 43757],
        [43766, 43766],
        [44005, 44005],
        [44008, 44008],
        [44013, 44013],
        [64286, 64286],
        [65024, 65039],
        [65056, 65071],
        [65279, 65279],
        [65529, 65531],
      ]),
      (Rn = [
        [66045, 66045],
        [66272, 66272],
        [66422, 66426],
        [68097, 68099],
        [68101, 68102],
        [68108, 68111],
        [68152, 68154],
        [68159, 68159],
        [68325, 68326],
        [68900, 68903],
        [69446, 69456],
        [69633, 69633],
        [69688, 69702],
        [69759, 69761],
        [69811, 69814],
        [69817, 69818],
        [69821, 69821],
        [69837, 69837],
        [69888, 69890],
        [69927, 69931],
        [69933, 69940],
        [70003, 70003],
        [70016, 70017],
        [70070, 70078],
        [70089, 70092],
        [70191, 70193],
        [70196, 70196],
        [70198, 70199],
        [70206, 70206],
        [70367, 70367],
        [70371, 70378],
        [70400, 70401],
        [70459, 70460],
        [70464, 70464],
        [70502, 70508],
        [70512, 70516],
        [70712, 70719],
        [70722, 70724],
        [70726, 70726],
        [70750, 70750],
        [70835, 70840],
        [70842, 70842],
        [70847, 70848],
        [70850, 70851],
        [71090, 71093],
        [71100, 71101],
        [71103, 71104],
        [71132, 71133],
        [71219, 71226],
        [71229, 71229],
        [71231, 71232],
        [71339, 71339],
        [71341, 71341],
        [71344, 71349],
        [71351, 71351],
        [71453, 71455],
        [71458, 71461],
        [71463, 71467],
        [71727, 71735],
        [71737, 71738],
        [72148, 72151],
        [72154, 72155],
        [72160, 72160],
        [72193, 72202],
        [72243, 72248],
        [72251, 72254],
        [72263, 72263],
        [72273, 72278],
        [72281, 72283],
        [72330, 72342],
        [72344, 72345],
        [72752, 72758],
        [72760, 72765],
        [72767, 72767],
        [72850, 72871],
        [72874, 72880],
        [72882, 72883],
        [72885, 72886],
        [73009, 73014],
        [73018, 73018],
        [73020, 73021],
        [73023, 73029],
        [73031, 73031],
        [73104, 73105],
        [73109, 73109],
        [73111, 73111],
        [73459, 73460],
        [78896, 78904],
        [92912, 92916],
        [92976, 92982],
        [94031, 94031],
        [94095, 94098],
        [113821, 113822],
        [113824, 113827],
        [119143, 119145],
        [119155, 119170],
        [119173, 119179],
        [119210, 119213],
        [119362, 119364],
        [121344, 121398],
        [121403, 121452],
        [121461, 121461],
        [121476, 121476],
        [121499, 121503],
        [121505, 121519],
        [122880, 122886],
        [122888, 122904],
        [122907, 122913],
        [122915, 122916],
        [122918, 122922],
        [123184, 123190],
        [123628, 123631],
        [125136, 125142],
        [125252, 125258],
        [917505, 917505],
        [917536, 917631],
        [917760, 917999],
      ]),
      (zn = [
        [4352, 4447],
        [8986, 8987],
        [9001, 9002],
        [9193, 9196],
        [9200, 9200],
        [9203, 9203],
        [9725, 9726],
        [9748, 9749],
        [9800, 9811],
        [9855, 9855],
        [9875, 9875],
        [9889, 9889],
        [9898, 9899],
        [9917, 9918],
        [9924, 9925],
        [9934, 9934],
        [9940, 9940],
        [9962, 9962],
        [9970, 9971],
        [9973, 9973],
        [9978, 9978],
        [9981, 9981],
        [9989, 9989],
        [9994, 9995],
        [10024, 10024],
        [10060, 10060],
        [10062, 10062],
        [10067, 10069],
        [10071, 10071],
        [10133, 10135],
        [10160, 10160],
        [10175, 10175],
        [11035, 11036],
        [11088, 11088],
        [11093, 11093],
        [11904, 11929],
        [11931, 12019],
        [12032, 12245],
        [12272, 12283],
        [12288, 12329],
        [12334, 12350],
        [12353, 12438],
        [12443, 12543],
        [12549, 12591],
        [12593, 12686],
        [12688, 12730],
        [12736, 12771],
        [12784, 12830],
        [12832, 12871],
        [12880, 19903],
        [19968, 42124],
        [42128, 42182],
        [43360, 43388],
        [44032, 55203],
        [63744, 64255],
        [65040, 65049],
        [65072, 65106],
        [65108, 65126],
        [65128, 65131],
        [65281, 65376],
        [65504, 65510],
      ]),
      (Bn = [
        [94176, 94179],
        [94208, 100343],
        [100352, 101106],
        [110592, 110878],
        [110928, 110930],
        [110948, 110951],
        [110960, 111355],
        [126980, 126980],
        [127183, 127183],
        [127374, 127374],
        [127377, 127386],
        [127488, 127490],
        [127504, 127547],
        [127552, 127560],
        [127568, 127569],
        [127584, 127589],
        [127744, 127776],
        [127789, 127797],
        [127799, 127868],
        [127870, 127891],
        [127904, 127946],
        [127951, 127955],
        [127968, 127984],
        [127988, 127988],
        [127992, 128062],
        [128064, 128064],
        [128066, 128252],
        [128255, 128317],
        [128331, 128334],
        [128336, 128359],
        [128378, 128378],
        [128405, 128406],
        [128420, 128420],
        [128507, 128591],
        [128640, 128709],
        [128716, 128716],
        [128720, 128722],
        [128725, 128725],
        [128747, 128748],
        [128756, 128762],
        [128992, 129003],
        [129293, 129393],
        [129395, 129398],
        [129402, 129442],
        [129445, 129450],
        [129454, 129482],
        [129485, 129535],
        [129648, 129651],
        [129656, 129658],
        [129664, 129666],
        [129680, 129685],
        [131072, 196605],
        [196608, 262141],
      ]),
      (Hn = class {
        constructor() {
          if (((this.version = `11`), !Vn)) {
            ((Vn = new Uint8Array(65536)),
              Vn.fill(1),
              (Vn[0] = 0),
              Vn.fill(0, 1, 32),
              Vn.fill(0, 127, 160));
            for (let e = 0; e < Ln.length; ++e) Vn.fill(0, Ln[e][0], Ln[e][1] + 1);
            for (let e = 0; e < zn.length; ++e) Vn.fill(2, zn[e][0], zn[e][1] + 1);
          }
        }
        wcwidth(e) {
          return e < 32 ? 0 : e < 127 ? 1 : e < 65536 ? Vn[e] : Gt(e, Rn) ? 0 : Gt(e, Bn) ? 2 : 1;
        }
        charProperties(e, t) {
          let n = this.wcwidth(e),
            r = n === 0 && t !== 0;
          if (r) {
            let e = In.extractWidth(t);
            e === 0 ? (r = !1) : e > n && (n = e);
          }
          return In.createPropertyValue(0, n, r);
        }
      }),
      (Un = class {
        activate(e) {
          e.unicode.register(new Hn());
        }
        dispose() {}
      }));
  });
function Gn(e) {
  return (e[0] === `"` && e[e.length - 1] === `"`) || (e[0] === `'` && e[e.length - 1] === `'`)
    ? e.slice(1, -1)
    : e;
}
function Kn(e) {
  return JSON.stringify([Gn(e.family), e.stretch, e.style, e.unicodeRange, e.weight]);
}
function qn(e) {
  let t = Array.from(document.fonts);
  if (!e || !e.length) return Promise.all(t.map((e) => e.load()));
  let n = [],
    r = t.map((e) => Kn(e));
  for (let i of e)
    if (i instanceof FontFace) {
      let e = Kn(i),
        a = r.indexOf(e);
      a === -1 ? (document.fonts.add(i), t.push(i), r.push(e), n.push(i)) : n.push(t[a]);
    } else {
      let e = t.filter((e) => i === Gn(e.family));
      if (((n = n.concat(e)), !e.length))
        return Promise.reject(`font family "${i}" not registered in document.fonts`);
    }
  return Promise.all(n.map((e) => e.load()));
}
function Jn(e) {
  return document.fonts.ready.then(() => qn(e));
}
var Yn = t(() => {});
function Xn(e) {
  Zn(e) || yi.onUnexpectedError(e);
}
function Zn(e) {
  return e instanceof xi ? !0 : e instanceof Error && e.name === bi && e.message === bi;
}
function Qn(e, t, n = 0, r = e.length) {
  let i = n,
    a = r;
  for (; i < a; ) {
    let n = Math.floor((i + a) / 2);
    t(e[n]) ? (i = n + 1) : (a = n);
  }
  return i - 1;
}
function $n(e, t) {
  return (n, r) => t(e(n), e(r));
}
function er(e, t) {
  let n = Object.create(null);
  for (let r of e) {
    let e = t(r),
      i = n[e];
    ((i ||= n[e] = []), i.push(r));
  }
  return n;
}
function tr(e, t) {
  let n = this,
    r = !1,
    i;
  return function () {
    if (r) return i;
    if (((r = !0), t))
      try {
        i = e.apply(n, arguments);
      } finally {
        t();
      }
    else i = e.apply(n, arguments);
    return i;
  };
}
function nr(e) {
  Ai = e;
}
function rr(e) {
  return (Ai?.trackDisposable(e), e);
}
function ir(e) {
  Ai?.markAsDisposed(e);
}
function ar(e, t) {
  Ai?.setParent(e, t);
}
function or(e, t) {
  if (Ai) for (let n of e) Ai.setParent(n, t);
}
function sr(e) {
  if (Oi.is(e)) {
    let t = [];
    for (let n of e)
      if (n)
        try {
          n.dispose();
        } catch (e) {
          t.push(e);
        }
    if (t.length === 1) throw t[0];
    if (t.length > 1) throw AggregateError(t, `Encountered errors while disposing of store`);
    return Array.isArray(e) ? [] : e;
  } else if (e) return (e.dispose(), e);
}
function cr(...e) {
  let t = lr(() => sr(e));
  return (or(e, t), t);
}
function lr(e) {
  let t = rr({
    dispose: tr(() => {
      (ir(t), e());
    }),
  });
  return t;
}
function ur() {
  if (!Vi) return 0;
  let e = Li.match(/Version\/(\d+)/);
  return e === null || e.length < 2 ? 0 : parseInt(e[1]);
}
function dr(e) {
  let t = e.toString(16);
  return t.length < 2 ? `0` + t : t;
}
function fr(e, t) {
  return e < t ? (t + 0.05) / (e + 0.05) : (e + 0.05) / (t + 0.05);
}
function pr(e) {
  if (!e) throw Error(`value must not be falsy`);
  return e;
}
function mr(e) {
  return 57508 <= e && e <= 57558;
}
function hr(e) {
  return 57520 <= e && e <= 57527;
}
function gr(e) {
  return 57344 <= e && e <= 63743;
}
function _r(e) {
  return 9472 <= e && e <= 9631;
}
function vr(e) {
  return (
    (e >= 128512 && e <= 128591) ||
    (e >= 127744 && e <= 128511) ||
    (e >= 128640 && e <= 128767) ||
    (e >= 9728 && e <= 9983) ||
    (e >= 9984 && e <= 10175) ||
    (e >= 65024 && e <= 65039) ||
    (e >= 129280 && e <= 129535) ||
    (e >= 127462 && e <= 127487)
  );
}
function yr(e, t, n, r) {
  return t === 1 && n > Math.ceil(r * 1.5) && e !== void 0 && e > 255 && !vr(e) && !mr(e) && !gr(e);
}
function br(e) {
  return mr(e) || _r(e);
}
function xr() {
  return {
    css: { canvas: Sr(), cell: Sr() },
    device: { canvas: Sr(), cell: Sr(), char: { width: 0, height: 0, left: 0, top: 0 } },
  };
}
function Sr() {
  return { width: 0, height: 0 };
}
function Cr(e, t, n = 0) {
  return (e - (Math.round(t) * 2 - n)) % (Math.round(t) * 2);
}
function wr(e, t, n, r, i, a, o, s) {
  let c = ca[t];
  if (c) return (Tr(e, c, n, r, i, a), !0);
  let l = la[t];
  if (l) return (Er(e, l, n, r, i, a), !0);
  let u = ua[t];
  if (u) return (Dr(e, u, n, r, i, a, s), !0);
  let d = da[t];
  return d ? (Or(e, d, n, r, i, a, o, s), !0) : !1;
}
function Tr(e, t, n, r, i, a) {
  for (let o = 0; o < t.length; o++) {
    let s = t[o],
      c = i / 8,
      l = a / 8;
    e.fillRect(n + s.x * c, r + s.y * l, s.w * c, s.h * l);
  }
}
function Er(e, t, n, r, i, a) {
  let o = fa.get(t);
  o || ((o = new Map()), fa.set(t, o));
  let s = e.fillStyle;
  if (typeof s != `string`) throw Error(`Unexpected fillStyle type "${s}"`);
  let c = o.get(s);
  if (!c) {
    let n = t[0].length,
      r = t.length,
      i = e.canvas.ownerDocument.createElement(`canvas`);
    ((i.width = n), (i.height = r));
    let a = pr(i.getContext(`2d`)),
      l = new ImageData(n, r),
      u,
      d,
      f,
      p;
    if (s.startsWith(`#`))
      ((u = parseInt(s.slice(1, 3), 16)),
        (d = parseInt(s.slice(3, 5), 16)),
        (f = parseInt(s.slice(5, 7), 16)),
        (p = (s.length > 7 && parseInt(s.slice(7, 9), 16)) || 1));
    else if (s.startsWith(`rgba`))
      [u, d, f, p] = s
        .substring(5, s.length - 1)
        .split(`,`)
        .map((e) => parseFloat(e));
    else throw Error(`Unexpected fillStyle color format "${s}" when drawing pattern glyph`);
    for (let e = 0; e < r; e++)
      for (let r = 0; r < n; r++)
        ((l.data[(e * n + r) * 4] = u),
          (l.data[(e * n + r) * 4 + 1] = d),
          (l.data[(e * n + r) * 4 + 2] = f),
          (l.data[(e * n + r) * 4 + 3] = t[e][r] * (p * 255)));
    (a.putImageData(l, 0, 0), (c = pr(e.createPattern(i, null))), o.set(s, c));
  }
  ((e.fillStyle = c), e.fillRect(n, r, i, a));
}
function Dr(e, t, n, r, i, a, o) {
  e.strokeStyle = e.fillStyle;
  for (let [s, c] of Object.entries(t)) {
    (e.beginPath(), (e.lineWidth = o * Number.parseInt(s)));
    let t;
    t = typeof c == `function` ? c(0.15, (0.15 / a) * i) : c;
    for (let s of t.split(` `)) {
      let t = s[0],
        c = pa[t];
      if (!c) {
        console.error(`Could not find drawing instructions for "${t}"`);
        continue;
      }
      let l = s.substring(1).split(`,`);
      !l[0] || !l[1] || c(e, Ar(l, i, a, n, r, !0, o));
    }
    (e.stroke(), e.closePath());
  }
}
function Or(e, t, n, r, i, a, o, s) {
  let c = new Path2D();
  (c.rect(n, r, i, a), e.clip(c), e.beginPath());
  let l = o / 12;
  e.lineWidth = s * l;
  for (let o of t.d.split(` `)) {
    let c = o[0],
      u = pa[c];
    if (!u) {
      console.error(`Could not find drawing instructions for "${c}"`);
      continue;
    }
    let d = o.substring(1).split(`,`);
    !d[0] ||
      !d[1] ||
      u(
        e,
        Ar(d, i, a, n, r, !1, s, (t.leftPadding ?? 0) * (l / 2), (t.rightPadding ?? 0) * (l / 2)),
      );
  }
  (t.type === 1 ? ((e.strokeStyle = e.fillStyle), e.stroke()) : e.fill(), e.closePath());
}
function kr(e, t, n = 0) {
  return Math.max(Math.min(e, t), n);
}
function Ar(e, t, n, r, i, a, o, s = 0, c = 0) {
  let l = e.map((e) => parseFloat(e) || parseInt(e));
  if (l.length < 2) throw Error(`Too few arguments for instruction`);
  for (let e = 0; e < l.length; e += 2)
    ((l[e] *= t - s * o - c * o),
      a && l[e] !== 0 && (l[e] = kr(Math.round(l[e] + 0.5) - 0.5, t, 0)),
      (l[e] += r + s * o));
  for (let e = 1; e < l.length; e += 2)
    ((l[e] *= n), a && l[e] !== 0 && (l[e] = kr(Math.round(l[e] + 0.5) - 0.5, n, 0)), (l[e] += i));
  return l;
}
function jr(e, t, n, r) {
  let i = t.rgba >>> 24,
    a = (t.rgba >>> 16) & 255,
    o = (t.rgba >>> 8) & 255,
    s = n.rgba >>> 24,
    c = (n.rgba >>> 16) & 255,
    l = (n.rgba >>> 8) & 255,
    u = Math.floor((Math.abs(i - s) + Math.abs(a - c) + Math.abs(o - l)) / 12),
    d = !0;
  for (let t = 0; t < e.data.length; t += 4)
    (e.data[t] === i && e.data[t + 1] === a && e.data[t + 2] === o) ||
    (r && Math.abs(e.data[t] - i) + Math.abs(e.data[t + 1] - a) + Math.abs(e.data[t + 2] - o) < u)
      ? (e.data[t + 3] = 0)
      : (d = !1);
  return d;
}
function Mr(e) {
  for (let t = 0; t < e.data.length; t += 4) if (e.data[t + 3] > 0) return !1;
  return !0;
}
function Nr(e, t, n) {
  let r = e.createElement(`canvas`);
  return ((r.width = t), (r.height = n), r);
}
function Pr(e, t, n, r, i, a, o, s) {
  let c = {
    foreground: a.foreground,
    background: a.background,
    cursor: Ki,
    cursorAccent: Ki,
    selectionForeground: Ki,
    selectionBackgroundTransparent: Ki,
    selectionBackgroundOpaque: Ki,
    selectionInactiveBackgroundTransparent: Ki,
    selectionInactiveBackgroundOpaque: Ki,
    overviewRulerBorder: Ki,
    scrollbarSliderBackground: Ki,
    scrollbarSliderHoverBackground: Ki,
    scrollbarSliderActiveBackground: Ki,
    ansi: a.ansi.slice(),
    contrastCache: a.contrastCache,
    halfContrastCache: a.halfContrastCache,
  };
  return {
    customGlyphs: i.customGlyphs,
    devicePixelRatio: o,
    deviceMaxTextureSize: s,
    letterSpacing: i.letterSpacing,
    lineHeight: i.lineHeight,
    deviceCellWidth: e,
    deviceCellHeight: t,
    deviceCharWidth: n,
    deviceCharHeight: r,
    fontFamily: i.fontFamily,
    fontSize: i.fontSize,
    fontWeight: i.fontWeight,
    fontWeightBold: i.fontWeightBold,
    allowTransparency: i.allowTransparency,
    drawBoldTextInBrightColors: i.drawBoldTextInBrightColors,
    minimumContrastRatio: i.minimumContrastRatio,
    colors: c,
  };
}
function Fr(e, t) {
  for (let n = 0; n < e.colors.ansi.length; n++)
    if (e.colors.ansi[n].rgba !== t.colors.ansi[n].rgba) return !1;
  return (
    e.devicePixelRatio === t.devicePixelRatio &&
    e.customGlyphs === t.customGlyphs &&
    e.lineHeight === t.lineHeight &&
    e.letterSpacing === t.letterSpacing &&
    e.fontFamily === t.fontFamily &&
    e.fontSize === t.fontSize &&
    e.fontWeight === t.fontWeight &&
    e.fontWeightBold === t.fontWeightBold &&
    e.allowTransparency === t.allowTransparency &&
    e.deviceCharWidth === t.deviceCharWidth &&
    e.deviceCharHeight === t.deviceCharHeight &&
    e.drawBoldTextInBrightColors === t.drawBoldTextInBrightColors &&
    e.minimumContrastRatio === t.minimumContrastRatio &&
    e.colors.foreground.rgba === t.colors.foreground.rgba &&
    e.colors.background.rgba === t.colors.background.rgba
  );
}
function Ir(e) {
  return (e & 50331648) == 16777216 || (e & 50331648) == 33554432;
}
function Lr(e, t, n, r, i, a, o, s, c) {
  let l = Pr(r, i, a, o, t, n, s, c);
  for (let t = 0; t < Ja.length; t++) {
    let n = Ja[t],
      r = n.ownedBy.indexOf(e);
    if (r >= 0) {
      if (Fr(n.config, l)) return n.atlas;
      n.ownedBy.length === 1 ? (n.atlas.dispose(), Ja.splice(t, 1)) : n.ownedBy.splice(r, 1);
      break;
    }
  }
  for (let t = 0; t < Ja.length; t++) {
    let n = Ja[t];
    if (Fr(n.config, l)) return (n.ownedBy.push(e), n.atlas);
  }
  let u = e._core,
    d = { atlas: new Ka(document, l, u.unicodeService), config: l, ownedBy: [e] };
  return (Ja.push(d), d.atlas);
}
function Rr(e) {
  for (let t = 0; t < Ja.length; t++) {
    let n = Ja[t].ownedBy.indexOf(e);
    if (n !== -1) {
      Ja[t].ownedBy.length === 1
        ? (Ja[t].atlas.dispose(), Ja.splice(t, 1))
        : Ja[t].ownedBy.splice(n, 1);
      break;
    }
  }
}
function zr(e, t, n) {
  let r = new t.ResizeObserver((t) => {
    let i = t.find((t) => t.target === e);
    if (!i) return;
    if (!(`devicePixelContentBoxSize` in i)) {
      (r?.disconnect(), (r = void 0));
      return;
    }
    let a = i.devicePixelContentBoxSize[0].inlineSize,
      o = i.devicePixelContentBoxSize[0].blockSize;
    a > 0 && o > 0 && n(a, o);
  });
  try {
    r.observe(e, { box: [`device-pixel-content-box`] });
  } catch {
    (r.disconnect(), (r = void 0));
  }
  return lr(() => r?.disconnect());
}
function Br(e) {
  return e > 65535
    ? ((e -= 65536),
      String.fromCharCode((e >> 10) + 55296) + String.fromCharCode((e % 1024) + 56320))
    : String.fromCharCode(e);
}
function Vr(e, t, n) {
  let r = pr(e.createProgram());
  if (
    (e.attachShader(r, pr(Hr(e, e.VERTEX_SHADER, t))),
    e.attachShader(r, pr(Hr(e, e.FRAGMENT_SHADER, n))),
    e.linkProgram(r),
    e.getProgramParameter(r, e.LINK_STATUS))
  )
    return r;
  (console.error(e.getProgramInfoLog(r)), e.deleteProgram(r));
}
function Hr(e, t, n) {
  let r = pr(e.createShader(t));
  if ((e.shaderSource(r, n), e.compileShader(r), e.getShaderParameter(r, e.COMPILE_STATUS)))
    return r;
  (console.error(e.getShaderInfoLog(r)), e.deleteShader(r));
}
function Ur(e, t) {
  let n = Math.min(e.length * 2, t),
    r = new Float32Array(n);
  for (let t = 0; t < e.length; t++) r[t] = e[t];
  return r;
}
function Wr(e) {
  let t = ``;
  for (let n = 1; n < e; n++)
    t += ` else if (v_texpage == ${n}) { outColor = texture(u_texture[${n}], v_texcoord); }`;
  return `#version 300 es
precision lowp float;

in vec2 v_texcoord;
flat in int v_texpage;

uniform sampler2D u_texture[${e}];

out vec4 outColor;

void main() {
  if (v_texpage == 0) {
    outColor = texture(u_texture[0], v_texcoord);
  } ${t}
}`;
}
function Gr() {
  return new so();
}
function Kr(e, t, n) {
  (typeof t == `string` && (t = e.matchMedia(t)), t.addEventListener(`change`, n));
}
function qr() {
  return Io;
}
function Jr(e) {
  return 55296 <= e && e <= 56319;
}
function Yr(e) {
  return 56320 <= e && e <= 57343;
}
function Xr(e, t) {
  return ((e - 55296) << 10) + (t - 56320) + 65536;
}
function Zr(e) {
  return Qr(e, 0);
}
function Qr(e, t) {
  switch (typeof e) {
    case `object`:
      return e === null ? $r(349, t) : Array.isArray(e) ? ni(e, t) : ri(e, t);
    case `string`:
      return ti(e, t);
    case `boolean`:
      return ei(e, t);
    case `number`:
      return $r(e, t);
    case `undefined`:
      return $r(937, t);
    default:
      return $r(617, t);
  }
}
function $r(e, t) {
  return ((t << 5) - t + e) | 0;
}
function ei(e, t) {
  return $r(e ? 433 : 863, t);
}
function ti(e, t) {
  t = $r(149417, t);
  for (let n = 0, r = e.length; n < r; n++) t = $r(e.charCodeAt(n), t);
  return t;
}
function ni(e, t) {
  return ((t = $r(104579, t)), e.reduce((e, t) => Qr(t, e), t));
}
function ri(e, t) {
  return (
    (t = $r(181387, t)),
    Object.keys(e)
      .sort()
      .reduce((t, n) => ((t = ti(n, t)), Qr(e[n], t)), t)
  );
}
function ii(e, t, n = 32) {
  let r = n - t,
    i = ~((1 << r) - 1);
  return ((e << t) | ((i & e) >>> r)) >>> 0;
}
function ai(e, t = 0, n = e.byteLength, r = 0) {
  for (let i = 0; i < n; i++) e[t + i] = r;
}
function oi(e, t, n = `0`) {
  for (; e.length < t; ) e = n + e;
  return e;
}
function si(e, t = 32) {
  return e instanceof ArrayBuffer
    ? Array.from(new Uint8Array(e))
        .map((e) => e.toString(16).padStart(2, `0`))
        .join(``)
    : oi((e >>> 0).toString(16), t / 4);
}
function ci(e, t, n, r) {
  return new xs(e, t, n, r);
}
function li(e, t, n, ...r) {
  let i = ws.exec(t);
  if (!i) throw Error(`Bad use of emmet`);
  let a = i[1] || `div`,
    o;
  return (
    (o =
      e === `http://www.w3.org/1999/xhtml`
        ? document.createElement(a)
        : document.createElementNS(e, a)),
    i[3] && (o.id = i[3]),
    i[4] && (o.className = i[4].replace(/\./g, ` `).trim()),
    n &&
      Object.entries(n).forEach(([e, t]) => {
        typeof t > `u` ||
          (/^on\w+$/.test(e)
            ? (o[e] = t)
            : e === `selected`
              ? t && o.setAttribute(e, `true`)
              : o.setAttribute(e, t));
      }),
    o.append(...r),
    o
  );
}
function ui(e, t, ...n) {
  return li(`http://www.w3.org/1999/xhtml`, e, t, ...n);
}
function di(e, t, n = 0) {
  return Math.max(Math.min(e, t), n);
}
function fi(e) {
  if (ks.has(e)) return ks.get(e);
  let t = function (e, n, r) {
    if (arguments.length !== 3)
      throw Error(`@IServiceName-decorator can only be used to decorate a parameter`);
    pi(t, e, r);
  };
  return ((t._id = e), ks.set(e, t), t);
}
function pi(e, t, n) {
  t[Ds] === t ? t[Os].push({ id: e, index: n }) : ((t[Os] = [{ id: e, index: n }]), (t[Ds] = t));
}
var mi,
  hi,
  gi,
  _i,
  vi,
  yi,
  bi,
  xi,
  Si,
  Ci,
  wi,
  Ti,
  Ei,
  Di,
  Oi,
  ki,
  Ai,
  ji,
  Mi,
  Ni,
  Pi,
  Fi,
  Ii,
  Li,
  Ri,
  zi,
  Bi,
  Vi,
  Hi,
  Ui,
  Wi,
  Gi,
  F,
  Ki,
  qi,
  Ji,
  Yi,
  Xi,
  Zi,
  Qi,
  $i,
  ea,
  ta,
  na,
  ra,
  ia,
  aa,
  oa,
  sa,
  ca,
  la,
  ua,
  da,
  fa,
  pa,
  ma,
  ha,
  ga,
  _a,
  va,
  ya,
  ba,
  xa,
  Sa,
  Ca,
  wa,
  Ta,
  Ea,
  Da,
  Oa,
  ka,
  Aa,
  ja,
  Ma,
  Na,
  Pa,
  Fa,
  Ia,
  La,
  Ra,
  za,
  Ba,
  Va,
  I,
  Ha,
  Ua,
  Wa,
  Ga,
  Ka,
  qa,
  Ja,
  Ya,
  Xa,
  Za,
  Qa,
  $a,
  eo,
  to,
  no,
  ro,
  L,
  R,
  io,
  ao,
  oo,
  so,
  co,
  lo,
  uo,
  fo,
  po,
  mo,
  ho,
  go,
  _o,
  vo,
  yo,
  bo,
  xo,
  So,
  Co,
  wo,
  To,
  Eo,
  Do,
  Oo,
  ko,
  Ao,
  jo,
  Mo,
  No,
  Po,
  Fo,
  Io,
  Lo,
  Ro,
  zo,
  Bo,
  Vo,
  Ho,
  Uo,
  Wo,
  Go,
  Ko,
  qo,
  Jo,
  Yo,
  Xo,
  Zo,
  Qo,
  $o,
  es,
  ts,
  ns,
  rs,
  is,
  as,
  os,
  ss,
  cs,
  ls,
  us,
  ds,
  fs,
  ps,
  ms,
  hs,
  gs,
  _s,
  vs,
  ys,
  bs,
  xs,
  Ss,
  Cs,
  ws,
  Ts,
  Es,
  Ds,
  Os,
  ks,
  As,
  js,
  Ms,
  Ns,
  Ps,
  Fs = t(() => {
    if (
      ((mi = Object.defineProperty),
      (hi = Object.getOwnPropertyDescriptor),
      (gi = (e, t, n, r) => {
        for (var i = r > 1 ? void 0 : r ? hi(t, n) : t, a = e.length - 1, o; a >= 0; a--)
          (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
        return (r && i && mi(t, n, i), i);
      }),
      (_i = (e, t) => (n, r) => t(n, r, e)),
      (vi = class {
        constructor() {
          ((this.listeners = []),
            (this.unexpectedErrorHandler = function (e) {
              setTimeout(() => {
                throw e.stack
                  ? Si.isErrorNoTelemetry(e)
                    ? new Si(
                        e.message +
                          `

` +
                          e.stack,
                      )
                    : Error(
                        e.message +
                          `

` +
                          e.stack,
                      )
                  : e;
              }, 0);
            }));
        }
        addListener(e) {
          return (
            this.listeners.push(e),
            () => {
              this._removeListener(e);
            }
          );
        }
        emit(e) {
          this.listeners.forEach((t) => {
            t(e);
          });
        }
        _removeListener(e) {
          this.listeners.splice(this.listeners.indexOf(e), 1);
        }
        setUnexpectedErrorHandler(e) {
          this.unexpectedErrorHandler = e;
        }
        getUnexpectedErrorHandler() {
          return this.unexpectedErrorHandler;
        }
        onUnexpectedError(e) {
          (this.unexpectedErrorHandler(e), this.emit(e));
        }
        onUnexpectedExternalError(e) {
          this.unexpectedErrorHandler(e);
        }
      }),
      (yi = new vi()),
      (bi = `Canceled`),
      (xi = class extends Error {
        constructor() {
          (super(bi), (this.name = this.message));
        }
      }),
      (Si = class e extends Error {
        constructor(e) {
          (super(e), (this.name = `CodeExpectedError`));
        }
        static fromError(t) {
          if (t instanceof e) return t;
          let n = new e();
          return ((n.message = t.message), (n.stack = t.stack), n);
        }
        static isErrorNoTelemetry(e) {
          return e.name === `CodeExpectedError`;
        }
      }),
      (Ci = class e {
        constructor(e) {
          ((this._array = e), (this._findLastMonotonousLastIdx = 0));
        }
        findLastMonotonous(t) {
          if (e.assertInvariants) {
            if (this._prevFindLastPredicate) {
              for (let e of this._array)
                if (this._prevFindLastPredicate(e) && !t(e))
                  throw Error(
                    `MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.`,
                  );
            }
            this._prevFindLastPredicate = t;
          }
          let n = Qn(this._array, t, this._findLastMonotonousLastIdx);
          return ((this._findLastMonotonousLastIdx = n + 1), n === -1 ? void 0 : this._array[n]);
        }
      }),
      (Ci.assertInvariants = !1),
      ((e) => {
        function t(e) {
          return e < 0;
        }
        e.isLessThan = t;
        function n(e) {
          return e <= 0;
        }
        e.isLessThanOrEqual = n;
        function r(e) {
          return e > 0;
        }
        e.isGreaterThan = r;
        function i(e) {
          return e === 0;
        }
        ((e.isNeitherLessOrGreaterThan = i),
          (e.greaterThan = 1),
          (e.lessThan = -1),
          (e.neitherLessOrGreaterThan = 0));
      })((wi ||= {})),
      (Ti = (e, t) => e - t),
      (Ei = class e {
        constructor(e) {
          this.iterate = e;
        }
        forEach(e) {
          this.iterate((t) => (e(t), !0));
        }
        toArray() {
          let e = [];
          return (this.iterate((t) => (e.push(t), !0)), e);
        }
        filter(t) {
          return new e((e) => this.iterate((n) => (t(n) ? e(n) : !0)));
        }
        map(t) {
          return new e((e) => this.iterate((n) => e(t(n))));
        }
        some(e) {
          let t = !1;
          return (this.iterate((n) => ((t = e(n)), !t)), t);
        }
        findFirst(e) {
          let t;
          return (this.iterate((n) => (e(n) ? ((t = n), !1) : !0)), t);
        }
        findLast(e) {
          let t;
          return (this.iterate((n) => (e(n) && (t = n), !0)), t);
        }
        findLastMaxBy(e) {
          let t,
            n = !0;
          return (
            this.iterate((r) => ((n || wi.isGreaterThan(e(r, t))) && ((n = !1), (t = r)), !0)), t
          );
        }
      }),
      (Ei.empty = new Ei((e) => {})),
      (Di = class {
        constructor() {
          this.map = new Map();
        }
        add(e, t) {
          let n = this.map.get(e);
          (n || ((n = new Set()), this.map.set(e, n)), n.add(t));
        }
        delete(e, t) {
          let n = this.map.get(e);
          n && (n.delete(t), n.size === 0 && this.map.delete(e));
        }
        forEach(e, t) {
          let n = this.map.get(e);
          n && n.forEach(t);
        }
        get(e) {
          return this.map.get(e) || new Set();
        }
      }),
      ((e) => {
        function t(e) {
          return e && typeof e == `object` && typeof e[Symbol.iterator] == `function`;
        }
        e.is = t;
        let n = Object.freeze([]);
        function r() {
          return n;
        }
        e.empty = r;
        function* i(e) {
          yield e;
        }
        e.single = i;
        function a(e) {
          return t(e) ? e : i(e);
        }
        e.wrap = a;
        function o(e) {
          return e || n;
        }
        e.from = o;
        function* s(e) {
          for (let t = e.length - 1; t >= 0; t--) yield e[t];
        }
        e.reverse = s;
        function c(e) {
          return !e || e[Symbol.iterator]().next().done === !0;
        }
        e.isEmpty = c;
        function l(e) {
          return e[Symbol.iterator]().next().value;
        }
        e.first = l;
        function u(e, t) {
          let n = 0;
          for (let r of e) if (t(r, n++)) return !0;
          return !1;
        }
        e.some = u;
        function d(e, t) {
          for (let n of e) if (t(n)) return n;
        }
        e.find = d;
        function* f(e, t) {
          for (let n of e) t(n) && (yield n);
        }
        e.filter = f;
        function* p(e, t) {
          let n = 0;
          for (let r of e) yield t(r, n++);
        }
        e.map = p;
        function* m(e, t) {
          let n = 0;
          for (let r of e) yield* t(r, n++);
        }
        e.flatMap = m;
        function* h(...e) {
          for (let t of e) yield* t;
        }
        e.concat = h;
        function g(e, t, n) {
          let r = n;
          for (let n of e) r = t(r, n);
          return r;
        }
        e.reduce = g;
        function* _(e, t, n = e.length) {
          for (
            t < 0 && (t += e.length), n < 0 ? (n += e.length) : n > e.length && (n = e.length);
            t < n;
            t++
          )
            yield e[t];
        }
        e.slice = _;
        function v(t, n = 1 / 0) {
          let r = [];
          if (n === 0) return [r, t];
          let i = t[Symbol.iterator]();
          for (let t = 0; t < n; t++) {
            let t = i.next();
            if (t.done) return [r, e.empty()];
            r.push(t.value);
          }
          return [
            r,
            {
              [Symbol.iterator]() {
                return i;
              },
            },
          ];
        }
        e.consume = v;
        async function y(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return Promise.resolve(t);
        }
        e.asyncToArray = y;
      })((Oi ||= {})),
      (ki = !1),
      (Ai = null),
      (ji = class e {
        constructor() {
          this.livingDisposables = new Map();
        }
        getDisposableData(t) {
          let n = this.livingDisposables.get(t);
          return (
            n ||
              ((n = { parent: null, source: null, isSingleton: !1, value: t, idx: e.idx++ }),
              this.livingDisposables.set(t, n)),
            n
          );
        }
        trackDisposable(e) {
          let t = this.getDisposableData(e);
          t.source ||= Error().stack;
        }
        setParent(e, t) {
          let n = this.getDisposableData(e);
          n.parent = t;
        }
        markAsDisposed(e) {
          this.livingDisposables.delete(e);
        }
        markAsSingleton(e) {
          this.getDisposableData(e).isSingleton = !0;
        }
        getRootParent(e, t) {
          let n = t.get(e);
          if (n) return n;
          let r = e.parent ? this.getRootParent(this.getDisposableData(e.parent), t) : e;
          return (t.set(e, r), r);
        }
        getTrackedDisposables() {
          let e = new Map();
          return [...this.livingDisposables.entries()]
            .filter(([, t]) => t.source !== null && !this.getRootParent(t, e).isSingleton)
            .flatMap(([e]) => e);
        }
        computeLeakingDisposables(e = 10, t) {
          let n;
          if (t) n = t;
          else {
            let e = new Map(),
              t = [...this.livingDisposables.values()].filter(
                (t) => t.source !== null && !this.getRootParent(t, e).isSingleton,
              );
            if (t.length === 0) return;
            let r = new Set(t.map((e) => e.value));
            if (((n = t.filter((e) => !(e.parent && r.has(e.parent)))), n.length === 0))
              throw Error(`There are cyclic diposable chains!`);
          }
          if (!n) return;
          function r(e) {
            function t(e, t) {
              for (
                ;
                e.length > 0 && t.some((t) => (typeof t == `string` ? t === e[0] : e[0].match(t)));
              )
                e.shift();
            }
            let n = e.source
              .split(`
`)
              .map((e) => e.trim().replace(`at `, ``))
              .filter((e) => e !== ``);
            return (
              t(n, [
                `Error`,
                /^trackDisposable \(.*\)$/,
                /^DisposableTracker.trackDisposable \(.*\)$/,
              ]),
              n.reverse()
            );
          }
          let i = new Di();
          for (let e of n) {
            let t = r(e);
            for (let n = 0; n <= t.length; n++)
              i.add(
                t.slice(0, n).join(`
`),
                e,
              );
          }
          n.sort($n((e) => e.idx, Ti));
          let a = ``,
            o = 0;
          for (let t of n.slice(0, e)) {
            o++;
            let e = r(t),
              s = [];
            for (let t = 0; t < e.length; t++) {
              let a = e[t];
              a = `(shared with ${
                i.get(
                  e.slice(0, t + 1).join(`
`),
                ).size
              }/${n.length} leaks) at ${a}`;
              let o = er(
                [
                  ...i.get(
                    e.slice(0, t).join(`
`),
                  ),
                ].map((e) => r(e)[t]),
                (e) => e,
              );
              delete o[e[t]];
              for (let [e, t] of Object.entries(o))
                s.unshift(`    - stacktraces of ${t.length} other leaks continue with ${e}`);
              s.unshift(a);
            }
            a += `


==================== Leaking disposable ${o}/${n.length}: ${t.value.constructor.name} ====================
${s.join(`
`)}
============================================================

`;
          }
          return (
            n.length > e &&
              (a += `


... and ${n.length - e} more leaking disposables

`),
            { leaks: n, details: a }
          );
        }
      }),
      (ji.idx = 0),
      ki)
    ) {
      let e = `__is_disposable_tracked__`;
      nr(
        new (class {
          trackDisposable(t) {
            let n = Error(`Potentially leaked disposable`).stack;
            setTimeout(() => {
              t[e] || console.log(n);
            }, 3e3);
          }
          setParent(t, n) {
            if (t && t !== Pi.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsDisposed(t) {
            if (t && t !== Pi.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsSingleton(e) {}
        })(),
      );
    }
    if (
      ((Mi = class e {
        constructor() {
          ((this._toDispose = new Set()), (this._isDisposed = !1), rr(this));
        }
        dispose() {
          this._isDisposed || (ir(this), (this._isDisposed = !0), this.clear());
        }
        get isDisposed() {
          return this._isDisposed;
        }
        clear() {
          if (this._toDispose.size !== 0)
            try {
              sr(this._toDispose);
            } finally {
              this._toDispose.clear();
            }
        }
        add(t) {
          if (!t) return t;
          if (t === this) throw Error(`Cannot register a disposable on itself!`);
          return (
            ar(t, this),
            this._isDisposed
              ? e.DISABLE_DISPOSED_WARNING ||
                console.warn(
                  Error(
                    `Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!`,
                  ).stack,
                )
              : this._toDispose.add(t),
            t
          );
        }
        delete(e) {
          if (e) {
            if (e === this) throw Error(`Cannot dispose a disposable on itself!`);
            (this._toDispose.delete(e), e.dispose());
          }
        }
        deleteAndLeak(e) {
          e && this._toDispose.has(e) && (this._toDispose.delete(e), ar(e, null));
        }
      }),
      (Mi.DISABLE_DISPOSED_WARNING = !1),
      (Ni = Mi),
      (Pi = class {
        constructor() {
          ((this._store = new Ni()), rr(this), ar(this._store, this));
        }
        dispose() {
          (ir(this), this._store.dispose());
        }
        _register(e) {
          if (e === this) throw Error(`Cannot register a disposable on itself!`);
          return this._store.add(e);
        }
      }),
      (Pi.None = Object.freeze({ dispose() {} })),
      (Fi = class {
        constructor() {
          ((this._isDisposed = !1), rr(this));
        }
        get value() {
          return this._isDisposed ? void 0 : this._value;
        }
        set value(e) {
          this._isDisposed ||
            e === this._value ||
            (this._value?.dispose(), e && ar(e, this), (this._value = e));
        }
        clear() {
          this.value = void 0;
        }
        dispose() {
          ((this._isDisposed = !0), ir(this), this._value?.dispose(), (this._value = void 0));
        }
        clearAndLeak() {
          let e = this._value;
          return ((this._value = void 0), e && ar(e, null), e);
        }
      }),
      (Ii = typeof process < `u` && `title` in process),
      (Li = Ii ? `node` : navigator.userAgent),
      (Ri = Ii ? `node` : navigator.platform),
      (zi = Li.includes(`Firefox`)),
      (Bi = Li.includes(`Edge`)),
      (Vi = /^((?!chrome|android).)*safari/i.test(Li)),
      [`Macintosh`, `MacIntel`, `MacPPC`, `Mac68K`].includes(Ri),
      [`Windows`, `Win16`, `Win32`, `WinCE`].includes(Ri),
      Ri.indexOf(`Linux`),
      /\bCrOS\b/.test(Li),
      (Hi = ``),
      (Ui = 0),
      (Wi = 0),
      (Gi = 0),
      (F = 0),
      (Ki = { css: `#00000000`, rgba: 0 }),
      ((e) => {
        function t(e, t, n, r) {
          return r === void 0 ? `#${dr(e)}${dr(t)}${dr(n)}` : `#${dr(e)}${dr(t)}${dr(n)}${dr(r)}`;
        }
        e.toCss = t;
        function n(e, t, n, r = 255) {
          return ((e << 24) | (t << 16) | (n << 8) | r) >>> 0;
        }
        e.toRgba = n;
        function r(t, n, r, i) {
          return { css: e.toCss(t, n, r, i), rgba: e.toRgba(t, n, r, i) };
        }
        e.toColor = r;
      })((qi ||= {})),
      ((e) => {
        function t(e, t) {
          if (((F = (t.rgba & 255) / 255), F === 1)) return { css: t.css, rgba: t.rgba };
          let n = (t.rgba >> 24) & 255,
            r = (t.rgba >> 16) & 255,
            i = (t.rgba >> 8) & 255,
            a = (e.rgba >> 24) & 255,
            o = (e.rgba >> 16) & 255,
            s = (e.rgba >> 8) & 255;
          return (
            (Ui = a + Math.round((n - a) * F)),
            (Wi = o + Math.round((r - o) * F)),
            (Gi = s + Math.round((i - s) * F)),
            { css: qi.toCss(Ui, Wi, Gi), rgba: qi.toRgba(Ui, Wi, Gi) }
          );
        }
        e.blend = t;
        function n(e) {
          return (e.rgba & 255) == 255;
        }
        e.isOpaque = n;
        function r(e, t, n) {
          let r = Zi.ensureContrastRatio(e.rgba, t.rgba, n);
          if (r) return qi.toColor((r >> 24) & 255, (r >> 16) & 255, (r >> 8) & 255);
        }
        e.ensureContrastRatio = r;
        function i(e) {
          let t = (e.rgba | 255) >>> 0;
          return (([Ui, Wi, Gi] = Zi.toChannels(t)), { css: qi.toCss(Ui, Wi, Gi), rgba: t });
        }
        e.opaque = i;
        function a(e, t) {
          return (
            (F = Math.round(t * 255)),
            ([Ui, Wi, Gi] = Zi.toChannels(e.rgba)),
            { css: qi.toCss(Ui, Wi, Gi, F), rgba: qi.toRgba(Ui, Wi, Gi, F) }
          );
        }
        e.opacity = a;
        function o(e, t) {
          return ((F = e.rgba & 255), a(e, (F * t) / 255));
        }
        e.multiplyOpacity = o;
        function s(e) {
          return [(e.rgba >> 24) & 255, (e.rgba >> 16) & 255, (e.rgba >> 8) & 255];
        }
        e.toColorRGB = s;
      })((Ji ||= {})),
      ((e) => {
        let t, n;
        try {
          let e = document.createElement(`canvas`);
          ((e.width = 1), (e.height = 1));
          let r = e.getContext(`2d`, { willReadFrequently: !0 });
          r &&
            ((t = r),
            (t.globalCompositeOperation = `copy`),
            (n = t.createLinearGradient(0, 0, 1, 1)));
        } catch {}
        function r(e) {
          if (e.match(/#[\da-f]{3,8}/i))
            switch (e.length) {
              case 4:
                return (
                  (Ui = parseInt(e.slice(1, 2).repeat(2), 16)),
                  (Wi = parseInt(e.slice(2, 3).repeat(2), 16)),
                  (Gi = parseInt(e.slice(3, 4).repeat(2), 16)),
                  qi.toColor(Ui, Wi, Gi)
                );
              case 5:
                return (
                  (Ui = parseInt(e.slice(1, 2).repeat(2), 16)),
                  (Wi = parseInt(e.slice(2, 3).repeat(2), 16)),
                  (Gi = parseInt(e.slice(3, 4).repeat(2), 16)),
                  (F = parseInt(e.slice(4, 5).repeat(2), 16)),
                  qi.toColor(Ui, Wi, Gi, F)
                );
              case 7:
                return { css: e, rgba: ((parseInt(e.slice(1), 16) << 8) | 255) >>> 0 };
              case 9:
                return { css: e, rgba: parseInt(e.slice(1), 16) >>> 0 };
            }
          let r = e.match(
            /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/,
          );
          if (r)
            return (
              (Ui = parseInt(r[1])),
              (Wi = parseInt(r[2])),
              (Gi = parseInt(r[3])),
              (F = Math.round((r[5] === void 0 ? 1 : parseFloat(r[5])) * 255)),
              qi.toColor(Ui, Wi, Gi, F)
            );
          if (
            !t ||
            !n ||
            ((t.fillStyle = n), (t.fillStyle = e), typeof t.fillStyle != `string`) ||
            (t.fillRect(0, 0, 1, 1), ([Ui, Wi, Gi, F] = t.getImageData(0, 0, 1, 1).data), F !== 255)
          )
            throw Error(`css.toColor: Unsupported css format`);
          return { rgba: qi.toRgba(Ui, Wi, Gi, F), css: e };
        }
        e.toColor = r;
      })((Yi ||= {})),
      ((e) => {
        function t(e) {
          return n((e >> 16) & 255, (e >> 8) & 255, e & 255);
        }
        e.relativeLuminance = t;
        function n(e, t, n) {
          let r = e / 255,
            i = t / 255,
            a = n / 255,
            o = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4,
            s = i <= 0.03928 ? i / 12.92 : ((i + 0.055) / 1.055) ** 2.4,
            c = a <= 0.03928 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4;
          return o * 0.2126 + s * 0.7152 + c * 0.0722;
        }
        e.relativeLuminance2 = n;
      })((Xi ||= {})),
      ((e) => {
        function t(e, t) {
          if (((F = (t & 255) / 255), F === 1)) return t;
          let n = (t >> 24) & 255,
            r = (t >> 16) & 255,
            i = (t >> 8) & 255,
            a = (e >> 24) & 255,
            o = (e >> 16) & 255,
            s = (e >> 8) & 255;
          return (
            (Ui = a + Math.round((n - a) * F)),
            (Wi = o + Math.round((r - o) * F)),
            (Gi = s + Math.round((i - s) * F)),
            qi.toRgba(Ui, Wi, Gi)
          );
        }
        e.blend = t;
        function n(e, t, n) {
          let a = Xi.relativeLuminance(e >> 8),
            o = Xi.relativeLuminance(t >> 8);
          if (fr(a, o) < n) {
            if (o < a) {
              let o = r(e, t, n),
                s = fr(a, Xi.relativeLuminance(o >> 8));
              if (s < n) {
                let r = i(e, t, n);
                return s > fr(a, Xi.relativeLuminance(r >> 8)) ? o : r;
              }
              return o;
            }
            let s = i(e, t, n),
              c = fr(a, Xi.relativeLuminance(s >> 8));
            if (c < n) {
              let i = r(e, t, n);
              return c > fr(a, Xi.relativeLuminance(i >> 8)) ? s : i;
            }
            return s;
          }
        }
        e.ensureContrastRatio = n;
        function r(e, t, n) {
          let r = (e >> 24) & 255,
            i = (e >> 16) & 255,
            a = (e >> 8) & 255,
            o = (t >> 24) & 255,
            s = (t >> 16) & 255,
            c = (t >> 8) & 255,
            l = fr(Xi.relativeLuminance2(o, s, c), Xi.relativeLuminance2(r, i, a));
          for (; l < n && (o > 0 || s > 0 || c > 0); )
            ((o -= Math.max(0, Math.ceil(o * 0.1))),
              (s -= Math.max(0, Math.ceil(s * 0.1))),
              (c -= Math.max(0, Math.ceil(c * 0.1))),
              (l = fr(Xi.relativeLuminance2(o, s, c), Xi.relativeLuminance2(r, i, a))));
          return ((o << 24) | (s << 16) | (c << 8) | 255) >>> 0;
        }
        e.reduceLuminance = r;
        function i(e, t, n) {
          let r = (e >> 24) & 255,
            i = (e >> 16) & 255,
            a = (e >> 8) & 255,
            o = (t >> 24) & 255,
            s = (t >> 16) & 255,
            c = (t >> 8) & 255,
            l = fr(Xi.relativeLuminance2(o, s, c), Xi.relativeLuminance2(r, i, a));
          for (; l < n && (o < 255 || s < 255 || c < 255); )
            ((o = Math.min(255, o + Math.ceil((255 - o) * 0.1))),
              (s = Math.min(255, s + Math.ceil((255 - s) * 0.1))),
              (c = Math.min(255, c + Math.ceil((255 - c) * 0.1))),
              (l = fr(Xi.relativeLuminance2(o, s, c), Xi.relativeLuminance2(r, i, a))));
          return ((o << 24) | (s << 16) | (c << 8) | 255) >>> 0;
        }
        e.increaseLuminance = i;
        function a(e) {
          return [(e >> 24) & 255, (e >> 16) & 255, (e >> 8) & 255, e & 255];
        }
        e.toChannels = a;
      })((Zi ||= {})),
      (Qi = 0),
      ($i = 0),
      (ea = !1),
      (ta = !1),
      (na = !1),
      (ia = 0),
      (aa = class {
        constructor(e, t, n, r, i, a) {
          ((this._terminal = e),
            (this._optionService = t),
            (this._selectionRenderModel = n),
            (this._decorationService = r),
            (this._coreBrowserService = i),
            (this._themeService = a),
            (this.result = { fg: 0, bg: 0, ext: 0 }));
        }
        resolve(e, t, n, r) {
          if (
            ((this.result.bg = e.bg),
            (this.result.fg = e.fg),
            (this.result.ext = e.bg & 268435456 ? e.extended.ext : 0),
            ($i = 0),
            (Qi = 0),
            (ta = !1),
            (ea = !1),
            (na = !1),
            (ra = this._themeService.colors),
            (ia = 0),
            e.getCode() !== 0 && e.extended.underlineStyle === 4)
          ) {
            let e = Math.max(
              1,
              Math.floor(
                (this._optionService.rawOptions.fontSize * this._coreBrowserService.dpr) / 15,
              ),
            );
            ia = (t * r) % (Math.round(e) * 2);
          }
          if (
            (this._decorationService.forEachDecorationAtCell(t, n, `bottom`, (e) => {
              (e.backgroundColorRGB &&
                (($i = (e.backgroundColorRGB.rgba >> 8) & 16777215), (ta = !0)),
                e.foregroundColorRGB &&
                  ((Qi = (e.foregroundColorRGB.rgba >> 8) & 16777215), (ea = !0)));
            }),
            (na = this._selectionRenderModel.isCellSelected(this._terminal, t, n)),
            na)
          ) {
            if (this.result.fg & 67108864 || this.result.bg & 50331648) {
              if (this.result.fg & 67108864)
                switch (this.result.fg & 50331648) {
                  case 16777216:
                  case 33554432:
                    $i = this._themeService.colors.ansi[this.result.fg & 255].rgba;
                    break;
                  case 50331648:
                    $i = ((this.result.fg & 16777215) << 8) | 255;
                    break;
                  case 0:
                  default:
                    $i = this._themeService.colors.foreground.rgba;
                }
              else
                switch (this.result.bg & 50331648) {
                  case 16777216:
                  case 33554432:
                    $i = this._themeService.colors.ansi[this.result.bg & 255].rgba;
                    break;
                  case 50331648:
                    $i = ((this.result.bg & 16777215) << 8) | 255;
                    break;
                }
              $i =
                (Zi.blend(
                  $i,
                  ((this._coreBrowserService.isFocused
                    ? ra.selectionBackgroundOpaque
                    : ra.selectionInactiveBackgroundOpaque
                  ).rgba &
                    4294967040) |
                    128,
                ) >>
                  8) &
                16777215;
            } else
              $i =
                ((this._coreBrowserService.isFocused
                  ? ra.selectionBackgroundOpaque
                  : ra.selectionInactiveBackgroundOpaque
                ).rgba >>
                  8) &
                16777215;
            if (
              ((ta = !0),
              ra.selectionForeground &&
                ((Qi = (ra.selectionForeground.rgba >> 8) & 16777215), (ea = !0)),
              br(e.getCode()))
            ) {
              if (this.result.fg & 67108864 && !(this.result.bg & 50331648))
                Qi =
                  ((this._coreBrowserService.isFocused
                    ? ra.selectionBackgroundOpaque
                    : ra.selectionInactiveBackgroundOpaque
                  ).rgba >>
                    8) &
                  16777215;
              else {
                if (this.result.fg & 67108864)
                  switch (this.result.bg & 50331648) {
                    case 16777216:
                    case 33554432:
                      Qi = this._themeService.colors.ansi[this.result.bg & 255].rgba;
                      break;
                    case 50331648:
                      Qi = ((this.result.bg & 16777215) << 8) | 255;
                      break;
                  }
                else
                  switch (this.result.fg & 50331648) {
                    case 16777216:
                    case 33554432:
                      Qi = this._themeService.colors.ansi[this.result.fg & 255].rgba;
                      break;
                    case 50331648:
                      Qi = ((this.result.fg & 16777215) << 8) | 255;
                      break;
                    case 0:
                    default:
                      Qi = this._themeService.colors.foreground.rgba;
                  }
                Qi =
                  (Zi.blend(
                    Qi,
                    ((this._coreBrowserService.isFocused
                      ? ra.selectionBackgroundOpaque
                      : ra.selectionInactiveBackgroundOpaque
                    ).rgba &
                      4294967040) |
                      128,
                  ) >>
                    8) &
                  16777215;
              }
              ea = !0;
            }
          }
          (this._decorationService.forEachDecorationAtCell(t, n, `top`, (e) => {
            (e.backgroundColorRGB &&
              (($i = (e.backgroundColorRGB.rgba >> 8) & 16777215), (ta = !0)),
              e.foregroundColorRGB &&
                ((Qi = (e.foregroundColorRGB.rgba >> 8) & 16777215), (ea = !0)));
          }),
            ta &&
              ($i = na ? (e.bg & -150994944) | $i | 50331648 : (e.bg & -16777216) | $i | 50331648),
            ea && (Qi = (e.fg & -83886080) | Qi | 50331648),
            this.result.fg & 67108864 &&
              (ta &&
                !ea &&
                ((Qi =
                  this.result.bg & 50331648
                    ? (this.result.fg & -134217728) | (this.result.bg & 67108863)
                    : (this.result.fg & -134217728) |
                      ((ra.background.rgba >> 8) & 16777215) |
                      50331648),
                (ea = !0)),
              !ta &&
                ea &&
                (($i =
                  this.result.fg & 50331648
                    ? (this.result.bg & -67108864) | (this.result.fg & 67108863)
                    : (this.result.bg & -67108864) |
                      ((ra.foreground.rgba >> 8) & 16777215) |
                      50331648),
                (ta = !0))),
            (ra = void 0),
            (this.result.bg = ta ? $i : this.result.bg),
            (this.result.fg = ea ? Qi : this.result.fg),
            (this.result.ext &= 536870911),
            (this.result.ext |= (ia << 29) & 3758096384));
        }
      }),
      (oa = 0.5),
      (sa = zi || Bi ? `bottom` : `ideographic`),
      (ca = {
        "▀": [{ x: 0, y: 0, w: 8, h: 4 }],
        "▁": [{ x: 0, y: 7, w: 8, h: 1 }],
        "▂": [{ x: 0, y: 6, w: 8, h: 2 }],
        "▃": [{ x: 0, y: 5, w: 8, h: 3 }],
        "▄": [{ x: 0, y: 4, w: 8, h: 4 }],
        "▅": [{ x: 0, y: 3, w: 8, h: 5 }],
        "▆": [{ x: 0, y: 2, w: 8, h: 6 }],
        "▇": [{ x: 0, y: 1, w: 8, h: 7 }],
        "█": [{ x: 0, y: 0, w: 8, h: 8 }],
        "▉": [{ x: 0, y: 0, w: 7, h: 8 }],
        "▊": [{ x: 0, y: 0, w: 6, h: 8 }],
        "▋": [{ x: 0, y: 0, w: 5, h: 8 }],
        "▌": [{ x: 0, y: 0, w: 4, h: 8 }],
        "▍": [{ x: 0, y: 0, w: 3, h: 8 }],
        "▎": [{ x: 0, y: 0, w: 2, h: 8 }],
        "▏": [{ x: 0, y: 0, w: 1, h: 8 }],
        "▐": [{ x: 4, y: 0, w: 4, h: 8 }],
        "▔": [{ x: 0, y: 0, w: 8, h: 1 }],
        "▕": [{ x: 7, y: 0, w: 1, h: 8 }],
        "▖": [{ x: 0, y: 4, w: 4, h: 4 }],
        "▗": [{ x: 4, y: 4, w: 4, h: 4 }],
        "▘": [{ x: 0, y: 0, w: 4, h: 4 }],
        "▙": [
          { x: 0, y: 0, w: 4, h: 8 },
          { x: 0, y: 4, w: 8, h: 4 },
        ],
        "▚": [
          { x: 0, y: 0, w: 4, h: 4 },
          { x: 4, y: 4, w: 4, h: 4 },
        ],
        "▛": [
          { x: 0, y: 0, w: 4, h: 8 },
          { x: 4, y: 0, w: 4, h: 4 },
        ],
        "▜": [
          { x: 0, y: 0, w: 8, h: 4 },
          { x: 4, y: 0, w: 4, h: 8 },
        ],
        "▝": [{ x: 4, y: 0, w: 4, h: 4 }],
        "▞": [
          { x: 4, y: 0, w: 4, h: 4 },
          { x: 0, y: 4, w: 4, h: 4 },
        ],
        "▟": [
          { x: 4, y: 0, w: 4, h: 8 },
          { x: 0, y: 4, w: 8, h: 4 },
        ],
        "🭰": [{ x: 1, y: 0, w: 1, h: 8 }],
        "🭱": [{ x: 2, y: 0, w: 1, h: 8 }],
        "🭲": [{ x: 3, y: 0, w: 1, h: 8 }],
        "🭳": [{ x: 4, y: 0, w: 1, h: 8 }],
        "🭴": [{ x: 5, y: 0, w: 1, h: 8 }],
        "🭵": [{ x: 6, y: 0, w: 1, h: 8 }],
        "🭶": [{ x: 0, y: 1, w: 8, h: 1 }],
        "🭷": [{ x: 0, y: 2, w: 8, h: 1 }],
        "🭸": [{ x: 0, y: 3, w: 8, h: 1 }],
        "🭹": [{ x: 0, y: 4, w: 8, h: 1 }],
        "🭺": [{ x: 0, y: 5, w: 8, h: 1 }],
        "🭻": [{ x: 0, y: 6, w: 8, h: 1 }],
        "🭼": [
          { x: 0, y: 0, w: 1, h: 8 },
          { x: 0, y: 7, w: 8, h: 1 },
        ],
        "🭽": [
          { x: 0, y: 0, w: 1, h: 8 },
          { x: 0, y: 0, w: 8, h: 1 },
        ],
        "🭾": [
          { x: 7, y: 0, w: 1, h: 8 },
          { x: 0, y: 0, w: 8, h: 1 },
        ],
        "🭿": [
          { x: 7, y: 0, w: 1, h: 8 },
          { x: 0, y: 7, w: 8, h: 1 },
        ],
        "🮀": [
          { x: 0, y: 0, w: 8, h: 1 },
          { x: 0, y: 7, w: 8, h: 1 },
        ],
        "🮁": [
          { x: 0, y: 0, w: 8, h: 1 },
          { x: 0, y: 2, w: 8, h: 1 },
          { x: 0, y: 4, w: 8, h: 1 },
          { x: 0, y: 7, w: 8, h: 1 },
        ],
        "🮂": [{ x: 0, y: 0, w: 8, h: 2 }],
        "🮃": [{ x: 0, y: 0, w: 8, h: 3 }],
        "🮄": [{ x: 0, y: 0, w: 8, h: 5 }],
        "🮅": [{ x: 0, y: 0, w: 8, h: 6 }],
        "🮆": [{ x: 0, y: 0, w: 8, h: 7 }],
        "🮇": [{ x: 6, y: 0, w: 2, h: 8 }],
        "🮈": [{ x: 5, y: 0, w: 3, h: 8 }],
        "🮉": [{ x: 3, y: 0, w: 5, h: 8 }],
        "🮊": [{ x: 2, y: 0, w: 6, h: 8 }],
        "🮋": [{ x: 1, y: 0, w: 7, h: 8 }],
        "🮕": [
          { x: 0, y: 0, w: 2, h: 2 },
          { x: 4, y: 0, w: 2, h: 2 },
          { x: 2, y: 2, w: 2, h: 2 },
          { x: 6, y: 2, w: 2, h: 2 },
          { x: 0, y: 4, w: 2, h: 2 },
          { x: 4, y: 4, w: 2, h: 2 },
          { x: 2, y: 6, w: 2, h: 2 },
          { x: 6, y: 6, w: 2, h: 2 },
        ],
        "🮖": [
          { x: 2, y: 0, w: 2, h: 2 },
          { x: 6, y: 0, w: 2, h: 2 },
          { x: 0, y: 2, w: 2, h: 2 },
          { x: 4, y: 2, w: 2, h: 2 },
          { x: 2, y: 4, w: 2, h: 2 },
          { x: 6, y: 4, w: 2, h: 2 },
          { x: 0, y: 6, w: 2, h: 2 },
          { x: 4, y: 6, w: 2, h: 2 },
        ],
        "🮗": [
          { x: 0, y: 2, w: 8, h: 2 },
          { x: 0, y: 6, w: 8, h: 2 },
        ],
      }),
      (la = {
        "░": [
          [1, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 0],
        ],
        "▒": [
          [1, 0],
          [0, 0],
          [0, 1],
          [0, 0],
        ],
        "▓": [
          [0, 1],
          [1, 1],
          [1, 0],
          [1, 1],
        ],
      }),
      (ua = {
        "─": { 1: `M0,.5 L1,.5` },
        "━": { 3: `M0,.5 L1,.5` },
        "│": { 1: `M.5,0 L.5,1` },
        "┃": { 3: `M.5,0 L.5,1` },
        "┌": { 1: `M0.5,1 L.5,.5 L1,.5` },
        "┏": { 3: `M0.5,1 L.5,.5 L1,.5` },
        "┐": { 1: `M0,.5 L.5,.5 L.5,1` },
        "┓": { 3: `M0,.5 L.5,.5 L.5,1` },
        "└": { 1: `M.5,0 L.5,.5 L1,.5` },
        "┗": { 3: `M.5,0 L.5,.5 L1,.5` },
        "┘": { 1: `M.5,0 L.5,.5 L0,.5` },
        "┛": { 3: `M.5,0 L.5,.5 L0,.5` },
        "├": { 1: `M.5,0 L.5,1 M.5,.5 L1,.5` },
        "┣": { 3: `M.5,0 L.5,1 M.5,.5 L1,.5` },
        "┤": { 1: `M.5,0 L.5,1 M.5,.5 L0,.5` },
        "┫": { 3: `M.5,0 L.5,1 M.5,.5 L0,.5` },
        "┬": { 1: `M0,.5 L1,.5 M.5,.5 L.5,1` },
        "┳": { 3: `M0,.5 L1,.5 M.5,.5 L.5,1` },
        "┴": { 1: `M0,.5 L1,.5 M.5,.5 L.5,0` },
        "┻": { 3: `M0,.5 L1,.5 M.5,.5 L.5,0` },
        "┼": { 1: `M0,.5 L1,.5 M.5,0 L.5,1` },
        "╋": { 3: `M0,.5 L1,.5 M.5,0 L.5,1` },
        "╴": { 1: `M.5,.5 L0,.5` },
        "╸": { 3: `M.5,.5 L0,.5` },
        "╵": { 1: `M.5,.5 L.5,0` },
        "╹": { 3: `M.5,.5 L.5,0` },
        "╶": { 1: `M.5,.5 L1,.5` },
        "╺": { 3: `M.5,.5 L1,.5` },
        "╷": { 1: `M.5,.5 L.5,1` },
        "╻": { 3: `M.5,.5 L.5,1` },
        "═": { 1: (e, t) => `M0,${0.5 - t} L1,${0.5 - t} M0,${0.5 + t} L1,${0.5 + t}` },
        "║": { 1: (e, t) => `M${0.5 - e},0 L${0.5 - e},1 M${0.5 + e},0 L${0.5 + e},1` },
        "╒": { 1: (e, t) => `M.5,1 L.5,${0.5 - t} L1,${0.5 - t} M.5,${0.5 + t} L1,${0.5 + t}` },
        "╓": { 1: (e, t) => `M${0.5 - e},1 L${0.5 - e},.5 L1,.5 M${0.5 + e},.5 L${0.5 + e},1` },
        "╔": {
          1: (e, t) =>
            `M1,${0.5 - t} L${0.5 - e},${0.5 - t} L${0.5 - e},1 M1,${0.5 + t} L${0.5 + e},${0.5 + t} L${0.5 + e},1`,
        },
        "╕": { 1: (e, t) => `M0,${0.5 - t} L.5,${0.5 - t} L.5,1 M0,${0.5 + t} L.5,${0.5 + t}` },
        "╖": { 1: (e, t) => `M${0.5 + e},1 L${0.5 + e},.5 L0,.5 M${0.5 - e},.5 L${0.5 - e},1` },
        "╗": {
          1: (e, t) =>
            `M0,${0.5 + t} L${0.5 - e},${0.5 + t} L${0.5 - e},1 M0,${0.5 - t} L${0.5 + e},${0.5 - t} L${0.5 + e},1`,
        },
        "╘": { 1: (e, t) => `M.5,0 L.5,${0.5 + t} L1,${0.5 + t} M.5,${0.5 - t} L1,${0.5 - t}` },
        "╙": { 1: (e, t) => `M1,.5 L${0.5 - e},.5 L${0.5 - e},0 M${0.5 + e},.5 L${0.5 + e},0` },
        "╚": {
          1: (e, t) =>
            `M1,${0.5 - t} L${0.5 + e},${0.5 - t} L${0.5 + e},0 M1,${0.5 + t} L${0.5 - e},${0.5 + t} L${0.5 - e},0`,
        },
        "╛": { 1: (e, t) => `M0,${0.5 + t} L.5,${0.5 + t} L.5,0 M0,${0.5 - t} L.5,${0.5 - t}` },
        "╜": { 1: (e, t) => `M0,.5 L${0.5 + e},.5 L${0.5 + e},0 M${0.5 - e},.5 L${0.5 - e},0` },
        "╝": {
          1: (e, t) =>
            `M0,${0.5 - t} L${0.5 - e},${0.5 - t} L${0.5 - e},0 M0,${0.5 + t} L${0.5 + e},${0.5 + t} L${0.5 + e},0`,
        },
        "╞": {
          1: (e, t) => `M.5,0 L.5,1 M.5,${0.5 - t} L1,${0.5 - t} M.5,${0.5 + t} L1,${0.5 + t}`,
        },
        "╟": {
          1: (e, t) =>
            `M${0.5 - e},0 L${0.5 - e},1 M${0.5 + e},0 L${0.5 + e},1 M${0.5 + e},.5 L1,.5`,
        },
        "╠": {
          1: (e, t) =>
            `M${0.5 - e},0 L${0.5 - e},1 M1,${0.5 + t} L${0.5 + e},${0.5 + t} L${0.5 + e},1 M1,${0.5 - t} L${0.5 + e},${0.5 - t} L${0.5 + e},0`,
        },
        "╡": {
          1: (e, t) => `M.5,0 L.5,1 M0,${0.5 - t} L.5,${0.5 - t} M0,${0.5 + t} L.5,${0.5 + t}`,
        },
        "╢": {
          1: (e, t) =>
            `M0,.5 L${0.5 - e},.5 M${0.5 - e},0 L${0.5 - e},1 M${0.5 + e},0 L${0.5 + e},1`,
        },
        "╣": {
          1: (e, t) =>
            `M${0.5 + e},0 L${0.5 + e},1 M0,${0.5 + t} L${0.5 - e},${0.5 + t} L${0.5 - e},1 M0,${0.5 - t} L${0.5 - e},${0.5 - t} L${0.5 - e},0`,
        },
        "╤": {
          1: (e, t) =>
            `M0,${0.5 - t} L1,${0.5 - t} M0,${0.5 + t} L1,${0.5 + t} M.5,${0.5 + t} L.5,1`,
        },
        "╥": {
          1: (e, t) => `M0,.5 L1,.5 M${0.5 - e},.5 L${0.5 - e},1 M${0.5 + e},.5 L${0.5 + e},1`,
        },
        "╦": {
          1: (e, t) =>
            `M0,${0.5 - t} L1,${0.5 - t} M0,${0.5 + t} L${0.5 - e},${0.5 + t} L${0.5 - e},1 M1,${0.5 + t} L${0.5 + e},${0.5 + t} L${0.5 + e},1`,
        },
        "╧": {
          1: (e, t) =>
            `M.5,0 L.5,${0.5 - t} M0,${0.5 - t} L1,${0.5 - t} M0,${0.5 + t} L1,${0.5 + t}`,
        },
        "╨": {
          1: (e, t) => `M0,.5 L1,.5 M${0.5 - e},.5 L${0.5 - e},0 M${0.5 + e},.5 L${0.5 + e},0`,
        },
        "╩": {
          1: (e, t) =>
            `M0,${0.5 + t} L1,${0.5 + t} M0,${0.5 - t} L${0.5 - e},${0.5 - t} L${0.5 - e},0 M1,${0.5 - t} L${0.5 + e},${0.5 - t} L${0.5 + e},0`,
        },
        "╪": { 1: (e, t) => `M.5,0 L.5,1 M0,${0.5 - t} L1,${0.5 - t} M0,${0.5 + t} L1,${0.5 + t}` },
        "╫": { 1: (e, t) => `M0,.5 L1,.5 M${0.5 - e},0 L${0.5 - e},1 M${0.5 + e},0 L${0.5 + e},1` },
        "╬": {
          1: (e, t) =>
            `M0,${0.5 + t} L${0.5 - e},${0.5 + t} L${0.5 - e},1 M1,${0.5 + t} L${0.5 + e},${0.5 + t} L${0.5 + e},1 M0,${0.5 - t} L${0.5 - e},${0.5 - t} L${0.5 - e},0 M1,${0.5 - t} L${0.5 + e},${0.5 - t} L${0.5 + e},0`,
        },
        "╱": { 1: `M1,0 L0,1` },
        "╲": { 1: `M0,0 L1,1` },
        "╳": { 1: `M1,0 L0,1 M0,0 L1,1` },
        "╼": { 1: `M.5,.5 L0,.5`, 3: `M.5,.5 L1,.5` },
        "╽": { 1: `M.5,.5 L.5,0`, 3: `M.5,.5 L.5,1` },
        "╾": { 1: `M.5,.5 L1,.5`, 3: `M.5,.5 L0,.5` },
        "╿": { 1: `M.5,.5 L.5,1`, 3: `M.5,.5 L.5,0` },
        "┍": { 1: `M.5,.5 L.5,1`, 3: `M.5,.5 L1,.5` },
        "┎": { 1: `M.5,.5 L1,.5`, 3: `M.5,.5 L.5,1` },
        "┑": { 1: `M.5,.5 L.5,1`, 3: `M.5,.5 L0,.5` },
        "┒": { 1: `M.5,.5 L0,.5`, 3: `M.5,.5 L.5,1` },
        "┕": { 1: `M.5,.5 L.5,0`, 3: `M.5,.5 L1,.5` },
        "┖": { 1: `M.5,.5 L1,.5`, 3: `M.5,.5 L.5,0` },
        "┙": { 1: `M.5,.5 L.5,0`, 3: `M.5,.5 L0,.5` },
        "┚": { 1: `M.5,.5 L0,.5`, 3: `M.5,.5 L.5,0` },
        "┝": { 1: `M.5,0 L.5,1`, 3: `M.5,.5 L1,.5` },
        "┞": { 1: `M0.5,1 L.5,.5 L1,.5`, 3: `M.5,.5 L.5,0` },
        "┟": { 1: `M.5,0 L.5,.5 L1,.5`, 3: `M.5,.5 L.5,1` },
        "┠": { 1: `M.5,.5 L1,.5`, 3: `M.5,0 L.5,1` },
        "┡": { 1: `M.5,.5 L.5,1`, 3: `M.5,0 L.5,.5 L1,.5` },
        "┢": { 1: `M.5,.5 L.5,0`, 3: `M0.5,1 L.5,.5 L1,.5` },
        "┥": { 1: `M.5,0 L.5,1`, 3: `M.5,.5 L0,.5` },
        "┦": { 1: `M0,.5 L.5,.5 L.5,1`, 3: `M.5,.5 L.5,0` },
        "┧": { 1: `M.5,0 L.5,.5 L0,.5`, 3: `M.5,.5 L.5,1` },
        "┨": { 1: `M.5,.5 L0,.5`, 3: `M.5,0 L.5,1` },
        "┩": { 1: `M.5,.5 L.5,1`, 3: `M.5,0 L.5,.5 L0,.5` },
        "┪": { 1: `M.5,.5 L.5,0`, 3: `M0,.5 L.5,.5 L.5,1` },
        "┭": { 1: `M0.5,1 L.5,.5 L1,.5`, 3: `M.5,.5 L0,.5` },
        "┮": { 1: `M0,.5 L.5,.5 L.5,1`, 3: `M.5,.5 L1,.5` },
        "┯": { 1: `M.5,.5 L.5,1`, 3: `M0,.5 L1,.5` },
        "┰": { 1: `M0,.5 L1,.5`, 3: `M.5,.5 L.5,1` },
        "┱": { 1: `M.5,.5 L1,.5`, 3: `M0,.5 L.5,.5 L.5,1` },
        "┲": { 1: `M.5,.5 L0,.5`, 3: `M0.5,1 L.5,.5 L1,.5` },
        "┵": { 1: `M.5,0 L.5,.5 L1,.5`, 3: `M.5,.5 L0,.5` },
        "┶": { 1: `M.5,0 L.5,.5 L0,.5`, 3: `M.5,.5 L1,.5` },
        "┷": { 1: `M.5,.5 L.5,0`, 3: `M0,.5 L1,.5` },
        "┸": { 1: `M0,.5 L1,.5`, 3: `M.5,.5 L.5,0` },
        "┹": { 1: `M.5,.5 L1,.5`, 3: `M.5,0 L.5,.5 L0,.5` },
        "┺": { 1: `M.5,.5 L0,.5`, 3: `M.5,0 L.5,.5 L1,.5` },
        "┽": { 1: `M.5,0 L.5,1 M.5,.5 L1,.5`, 3: `M.5,.5 L0,.5` },
        "┾": { 1: `M.5,0 L.5,1 M.5,.5 L0,.5`, 3: `M.5,.5 L1,.5` },
        "┿": { 1: `M.5,0 L.5,1`, 3: `M0,.5 L1,.5` },
        "╀": { 1: `M0,.5 L1,.5 M.5,.5 L.5,1`, 3: `M.5,.5 L.5,0` },
        "╁": { 1: `M.5,.5 L.5,0 M0,.5 L1,.5`, 3: `M.5,.5 L.5,1` },
        "╂": { 1: `M0,.5 L1,.5`, 3: `M.5,0 L.5,1` },
        "╃": { 1: `M0.5,1 L.5,.5 L1,.5`, 3: `M.5,0 L.5,.5 L0,.5` },
        "╄": { 1: `M0,.5 L.5,.5 L.5,1`, 3: `M.5,0 L.5,.5 L1,.5` },
        "╅": { 1: `M.5,0 L.5,.5 L1,.5`, 3: `M0,.5 L.5,.5 L.5,1` },
        "╆": { 1: `M.5,0 L.5,.5 L0,.5`, 3: `M0.5,1 L.5,.5 L1,.5` },
        "╇": { 1: `M.5,.5 L.5,1`, 3: `M.5,.5 L.5,0 M0,.5 L1,.5` },
        "╈": { 1: `M.5,.5 L.5,0`, 3: `M0,.5 L1,.5 M.5,.5 L.5,1` },
        "╉": { 1: `M.5,.5 L1,.5`, 3: `M.5,0 L.5,1 M.5,.5 L0,.5` },
        "╊": { 1: `M.5,.5 L0,.5`, 3: `M.5,0 L.5,1 M.5,.5 L1,.5` },
        "╌": { 1: `M.1,.5 L.4,.5 M.6,.5 L.9,.5` },
        "╍": { 3: `M.1,.5 L.4,.5 M.6,.5 L.9,.5` },
        "┄": { 1: `M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5` },
        "┅": { 3: `M.0667,.5 L.2667,.5 M.4,.5 L.6,.5 M.7333,.5 L.9333,.5` },
        "┈": { 1: `M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5` },
        "┉": { 3: `M.05,.5 L.2,.5 M.3,.5 L.45,.5 M.55,.5 L.7,.5 M.8,.5 L.95,.5` },
        "╎": { 1: `M.5,.1 L.5,.4 M.5,.6 L.5,.9` },
        "╏": { 3: `M.5,.1 L.5,.4 M.5,.6 L.5,.9` },
        "┆": { 1: `M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333` },
        "┇": { 3: `M.5,.0667 L.5,.2667 M.5,.4 L.5,.6 M.5,.7333 L.5,.9333` },
        "┊": { 1: `M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95` },
        "┋": { 3: `M.5,.05 L.5,.2 M.5,.3 L.5,.45 L.5,.55 M.5,.7 L.5,.95` },
        "╭": {
          1: (e, t) =>
            `M.5,1 L.5,${0.5 + (t / 0.15) * 0.5} C.5,${0.5 + (t / 0.15) * 0.5},.5,.5,1,.5`,
        },
        "╮": {
          1: (e, t) =>
            `M.5,1 L.5,${0.5 + (t / 0.15) * 0.5} C.5,${0.5 + (t / 0.15) * 0.5},.5,.5,0,.5`,
        },
        "╯": {
          1: (e, t) =>
            `M.5,0 L.5,${0.5 - (t / 0.15) * 0.5} C.5,${0.5 - (t / 0.15) * 0.5},.5,.5,0,.5`,
        },
        "╰": {
          1: (e, t) =>
            `M.5,0 L.5,${0.5 - (t / 0.15) * 0.5} C.5,${0.5 - (t / 0.15) * 0.5},.5,.5,1,.5`,
        },
      }),
      (da = {
        "": {
          d: `M.3,1 L.03,1 L.03,.88 C.03,.82,.06,.78,.11,.73 C.15,.7,.2,.68,.28,.65 L.43,.6 C.49,.58,.53,.56,.56,.53 C.59,.5,.6,.47,.6,.43 L.6,.27 L.4,.27 L.69,.1 L.98,.27 L.78,.27 L.78,.46 C.78,.52,.76,.56,.72,.61 C.68,.66,.63,.67,.56,.7 L.48,.72 C.42,.74,.38,.76,.35,.78 C.32,.8,.31,.84,.31,.88 L.31,1 M.3,.5 L.03,.59 L.03,.09 L.3,.09 L.3,.655`,
          type: 0,
        },
        "": {
          d: `M.7,.4 L.7,.47 L.2,.47 L.2,.03 L.355,.03 L.355,.4 L.705,.4 M.7,.5 L.86,.5 L.86,.95 L.69,.95 L.44,.66 L.46,.86 L.46,.95 L.3,.95 L.3,.49 L.46,.49 L.71,.78 L.69,.565 L.69,.5`,
          type: 0,
        },
        "": {
          d: `M.25,.94 C.16,.94,.11,.92,.11,.87 L.11,.53 C.11,.48,.15,.455,.23,.45 L.23,.3 C.23,.25,.26,.22,.31,.19 C.36,.16,.43,.15,.51,.15 C.59,.15,.66,.16,.71,.19 C.77,.22,.79,.26,.79,.3 L.79,.45 C.87,.45,.91,.48,.91,.53 L.91,.87 C.91,.92,.86,.94,.77,.94 L.24,.94 M.53,.2 C.49,.2,.45,.21,.42,.23 C.39,.25,.38,.27,.38,.3 L.38,.45 L.68,.45 L.68,.3 C.68,.27,.67,.25,.64,.23 C.61,.21,.58,.2,.53,.2 M.58,.82 L.58,.66 C.63,.65,.65,.63,.65,.6 C.65,.58,.64,.57,.61,.56 C.58,.55,.56,.54,.52,.54 C.48,.54,.46,.55,.43,.56 C.4,.57,.39,.59,.39,.6 C.39,.63,.41,.64,.46,.66 L.46,.82 L.57,.82`,
          type: 0,
        },
        "": { d: `M0,0 L1,.5 L0,1`, type: 0, rightPadding: 2 },
        "": { d: `M-1,-.5 L1,.5 L-1,1.5`, type: 1, leftPadding: 1, rightPadding: 1 },
        "": { d: `M1,0 L0,.5 L1,1`, type: 0, leftPadding: 2 },
        "": { d: `M2,-.5 L0,.5 L2,1.5`, type: 1, leftPadding: 1, rightPadding: 1 },
        "": {
          d: `M0,0 L0,1 C0.552,1,1,0.776,1,.5 C1,0.224,0.552,0,0,0`,
          type: 0,
          rightPadding: 1,
        },
        "": { d: `M.2,1 C.422,1,.8,.826,.78,.5 C.8,.174,0.422,0,.2,0`, type: 1, rightPadding: 1 },
        "": { d: `M1,0 L1,1 C0.448,1,0,0.776,0,.5 C0,0.224,0.448,0,1,0`, type: 0, leftPadding: 1 },
        "": {
          d: `M.8,1 C0.578,1,0.2,.826,.22,.5 C0.2,0.174,0.578,0,0.8,0`,
          type: 1,
          leftPadding: 1,
        },
        "": { d: `M-.5,-.5 L1.5,1.5 L-.5,1.5`, type: 0 },
        "": { d: `M-.5,-.5 L1.5,1.5`, type: 1, leftPadding: 1, rightPadding: 1 },
        "": { d: `M1.5,-.5 L-.5,1.5 L1.5,1.5`, type: 0 },
        "": { d: `M1.5,-.5 L-.5,1.5 L-.5,-.5`, type: 0 },
        "": { d: `M1.5,-.5 L-.5,1.5`, type: 1, leftPadding: 1, rightPadding: 1 },
        "": { d: `M-.5,-.5 L1.5,1.5 L1.5,-.5`, type: 0 },
      }),
      (da[``] = da[``]),
      (da[``] = da[``]),
      (fa = new Map()),
      (pa = {
        C: (e, t) => e.bezierCurveTo(t[0], t[1], t[2], t[3], t[4], t[5]),
        L: (e, t) => e.lineTo(t[0], t[1]),
        M: (e, t) => e.moveTo(t[0], t[1]),
      }),
      (ma = class {
        constructor() {
          this._data = {};
        }
        set(e, t, n) {
          (this._data[e] || (this._data[e] = {}), (this._data[e][t] = n));
        }
        get(e, t) {
          return this._data[e] ? this._data[e][t] : void 0;
        }
        clear() {
          this._data = {};
        }
      }),
      (ha = class {
        constructor() {
          this._data = new ma();
        }
        set(e, t, n, r, i) {
          (this._data.get(e, t) || this._data.set(e, t, new ma()),
            this._data.get(e, t).set(n, r, i));
        }
        get(e, t, n, r) {
          return this._data.get(e, t)?.get(n, r);
        }
        clear() {
          this._data.clear();
        }
      }),
      (ga = class {
        constructor() {
          ((this._tasks = []), (this._i = 0));
        }
        enqueue(e) {
          (this._tasks.push(e), this._start());
        }
        flush() {
          for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
          this.clear();
        }
        clear() {
          ((this._idleCallback &&= (this._cancelCallback(this._idleCallback), void 0)),
            (this._i = 0),
            (this._tasks.length = 0));
        }
        _start() {
          this._idleCallback ||= this._requestCallback(this._process.bind(this));
        }
        _process(e) {
          this._idleCallback = void 0;
          let t = 0,
            n = 0,
            r = e.timeRemaining(),
            i = 0;
          for (; this._i < this._tasks.length; ) {
            if (
              ((t = performance.now()),
              this._tasks[this._i]() || this._i++,
              (t = Math.max(1, performance.now() - t)),
              (n = Math.max(t, n)),
              (i = e.timeRemaining()),
              n * 1.5 > i)
            ) {
              (r - t < -20 &&
                console.warn(
                  `task queue exceeded allotted deadline by ${Math.abs(Math.round(r - t))}ms`,
                ),
                this._start());
              return;
            }
            r = i;
          }
          this.clear();
        }
      }),
      (_a = class extends ga {
        _requestCallback(e) {
          return setTimeout(() => e(this._createDeadline(16)));
        }
        _cancelCallback(e) {
          clearTimeout(e);
        }
        _createDeadline(e) {
          let t = performance.now() + e;
          return { timeRemaining: () => Math.max(0, t - performance.now()) };
        }
      }),
      (va = class extends ga {
        _requestCallback(e) {
          return requestIdleCallback(e);
        }
        _cancelCallback(e) {
          cancelIdleCallback(e);
        }
      }),
      (ya = !Ii && `requestIdleCallback` in window ? va : _a),
      (ba = class e {
        constructor() {
          ((this.fg = 0), (this.bg = 0), (this.extended = new xa()));
        }
        static toColorRGB(e) {
          return [(e >>> 16) & 255, (e >>> 8) & 255, e & 255];
        }
        static fromColorRGB(e) {
          return ((e[0] & 255) << 16) | ((e[1] & 255) << 8) | (e[2] & 255);
        }
        clone() {
          let t = new e();
          return ((t.fg = this.fg), (t.bg = this.bg), (t.extended = this.extended.clone()), t);
        }
        isInverse() {
          return this.fg & 67108864;
        }
        isBold() {
          return this.fg & 134217728;
        }
        isUnderline() {
          return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0
            ? 1
            : this.fg & 268435456;
        }
        isBlink() {
          return this.fg & 536870912;
        }
        isInvisible() {
          return this.fg & 1073741824;
        }
        isItalic() {
          return this.bg & 67108864;
        }
        isDim() {
          return this.bg & 134217728;
        }
        isStrikethrough() {
          return this.fg & 2147483648;
        }
        isProtected() {
          return this.bg & 536870912;
        }
        isOverline() {
          return this.bg & 1073741824;
        }
        getFgColorMode() {
          return this.fg & 50331648;
        }
        getBgColorMode() {
          return this.bg & 50331648;
        }
        isFgRGB() {
          return (this.fg & 50331648) == 50331648;
        }
        isBgRGB() {
          return (this.bg & 50331648) == 50331648;
        }
        isFgPalette() {
          return (this.fg & 50331648) == 16777216 || (this.fg & 50331648) == 33554432;
        }
        isBgPalette() {
          return (this.bg & 50331648) == 16777216 || (this.bg & 50331648) == 33554432;
        }
        isFgDefault() {
          return (this.fg & 50331648) == 0;
        }
        isBgDefault() {
          return (this.bg & 50331648) == 0;
        }
        isAttributeDefault() {
          return this.fg === 0 && this.bg === 0;
        }
        getFgColor() {
          switch (this.fg & 50331648) {
            case 16777216:
            case 33554432:
              return this.fg & 255;
            case 50331648:
              return this.fg & 16777215;
            default:
              return -1;
          }
        }
        getBgColor() {
          switch (this.bg & 50331648) {
            case 16777216:
            case 33554432:
              return this.bg & 255;
            case 50331648:
              return this.bg & 16777215;
            default:
              return -1;
          }
        }
        hasExtendedAttrs() {
          return this.bg & 268435456;
        }
        updateExtended() {
          this.extended.isEmpty() ? (this.bg &= -268435457) : (this.bg |= 268435456);
        }
        getUnderlineColor() {
          if (this.bg & 268435456 && ~this.extended.underlineColor)
            switch (this.extended.underlineColor & 50331648) {
              case 16777216:
              case 33554432:
                return this.extended.underlineColor & 255;
              case 50331648:
                return this.extended.underlineColor & 16777215;
              default:
                return this.getFgColor();
            }
          return this.getFgColor();
        }
        getUnderlineColorMode() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? this.extended.underlineColor & 50331648
            : this.getFgColorMode();
        }
        isUnderlineColorRGB() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) == 50331648
            : this.isFgRGB();
        }
        isUnderlineColorPalette() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) == 16777216 ||
                (this.extended.underlineColor & 50331648) == 33554432
            : this.isFgPalette();
        }
        isUnderlineColorDefault() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) == 0
            : this.isFgDefault();
        }
        getUnderlineStyle() {
          return this.fg & 268435456 ? (this.bg & 268435456 ? this.extended.underlineStyle : 1) : 0;
        }
        getUnderlineVariantOffset() {
          return this.extended.underlineVariantOffset;
        }
      }),
      (xa = class e {
        constructor(e = 0, t = 0) {
          ((this._ext = 0), (this._urlId = 0), (this._ext = e), (this._urlId = t));
        }
        get ext() {
          return this._urlId ? (this._ext & -469762049) | (this.underlineStyle << 26) : this._ext;
        }
        set ext(e) {
          this._ext = e;
        }
        get underlineStyle() {
          return this._urlId ? 5 : (this._ext & 469762048) >> 26;
        }
        set underlineStyle(e) {
          ((this._ext &= -469762049), (this._ext |= (e << 26) & 469762048));
        }
        get underlineColor() {
          return this._ext & 67108863;
        }
        set underlineColor(e) {
          ((this._ext &= -67108864), (this._ext |= e & 67108863));
        }
        get urlId() {
          return this._urlId;
        }
        set urlId(e) {
          this._urlId = e;
        }
        get underlineVariantOffset() {
          let e = (this._ext & 3758096384) >> 29;
          return e < 0 ? e ^ 4294967288 : e;
        }
        set underlineVariantOffset(e) {
          ((this._ext &= 536870911), (this._ext |= (e << 29) & 3758096384));
        }
        clone() {
          return new e(this._ext, this._urlId);
        }
        isEmpty() {
          return this.underlineStyle === 0 && this._urlId === 0;
        }
      }),
      (Sa = class e {
        constructor(t) {
          ((this.element = t), (this.next = e.Undefined), (this.prev = e.Undefined));
        }
      }),
      (Sa.Undefined = new Sa(void 0)),
      (Ca = globalThis.performance && typeof globalThis.performance.now == `function`),
      (wa = class e {
        static create(t) {
          return new e(t);
        }
        constructor(e) {
          ((this._now =
            Ca && e === !1 ? Date.now : globalThis.performance.now.bind(globalThis.performance)),
            (this._startTime = this._now()),
            (this._stopTime = -1));
        }
        stop() {
          this._stopTime = this._now();
        }
        reset() {
          ((this._startTime = this._now()), (this._stopTime = -1));
        }
        elapsed() {
          return this._stopTime === -1
            ? this._now() - this._startTime
            : this._stopTime - this._startTime;
        }
      }),
      (Ta = !1),
      (Ea = !1),
      (Da = !1),
      ((e) => {
        e.None = () => Pi.None;
        function t(e) {
          if (Da) {
            let { onDidAddListener: t } = e,
              n = Pa.create(),
              r = 0;
            e.onDidAddListener = () => {
              (++r === 2 &&
                (console.warn(
                  `snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here`,
                ),
                n.print()),
                t?.());
            };
          }
        }
        function n(e, t) {
          return f(e, () => {}, 0, void 0, !0, void 0, t);
        }
        e.defer = n;
        function r(e) {
          return (t, n = null, r) => {
            let i = !1,
              a;
            return (
              (a = e(
                (e) => {
                  if (!i) return (a ? a.dispose() : (i = !0), t.call(n, e));
                },
                null,
                r,
              )),
              i && a.dispose(),
              a
            );
          };
        }
        e.once = r;
        function i(e, t, n) {
          return u((n, r = null, i) => e((e) => n.call(r, t(e)), null, i), n);
        }
        e.map = i;
        function a(e, t, n) {
          return u(
            (n, r = null, i) =>
              e(
                (e) => {
                  (t(e), n.call(r, e));
                },
                null,
                i,
              ),
            n,
          );
        }
        e.forEach = a;
        function o(e, t, n) {
          return u((n, r = null, i) => e((e) => t(e) && n.call(r, e), null, i), n);
        }
        e.filter = o;
        function s(e) {
          return e;
        }
        e.signal = s;
        function c(...e) {
          return (t, n = null, r) => d(cr(...e.map((e) => e((e) => t.call(n, e)))), r);
        }
        e.any = c;
        function l(e, t, n, r) {
          let a = n;
          return i(e, (e) => ((a = t(a, e)), a), r);
        }
        e.reduce = l;
        function u(e, n) {
          let r,
            i = {
              onWillAddFirstListener() {
                r = e(a.fire, a);
              },
              onDidRemoveLastListener() {
                r?.dispose();
              },
            };
          n || t(i);
          let a = new I(i);
          return (n?.add(a), a.event);
        }
        function d(e, t) {
          return (t instanceof Array ? t.push(e) : t && t.add(e), e);
        }
        function f(e, n, r = 100, i = !1, a = !1, o, s) {
          let c,
            l,
            u,
            d = 0,
            f,
            p = {
              leakWarningThreshold: o,
              onWillAddFirstListener() {
                c = e((e) => {
                  (d++,
                    (l = n(l, e)),
                    i && !u && (m.fire(l), (l = void 0)),
                    (f = () => {
                      let e = l;
                      ((l = void 0), (u = void 0), (!i || d > 1) && m.fire(e), (d = 0));
                    }),
                    typeof r == `number`
                      ? (clearTimeout(u), (u = setTimeout(f, r)))
                      : u === void 0 && ((u = 0), queueMicrotask(f)));
                });
              },
              onWillRemoveListener() {
                a && d > 0 && f?.();
              },
              onDidRemoveLastListener() {
                ((f = void 0), c.dispose());
              },
            };
          s || t(p);
          let m = new I(p);
          return (s?.add(m), m.event);
        }
        e.debounce = f;
        function p(t, n = 0, r) {
          return e.debounce(t, (e, t) => (e ? (e.push(t), e) : [t]), n, void 0, !0, void 0, r);
        }
        e.accumulate = p;
        function m(e, t = (e, t) => e === t, n) {
          let r = !0,
            i;
          return o(
            e,
            (e) => {
              let n = r || !t(e, i);
              return ((r = !1), (i = e), n);
            },
            n,
          );
        }
        e.latch = m;
        function h(t, n, r) {
          return [e.filter(t, n, r), e.filter(t, (e) => !n(e), r)];
        }
        e.split = h;
        function g(e, t = !1, n = [], r) {
          let i = n.slice(),
            a = e((e) => {
              i ? i.push(e) : s.fire(e);
            });
          r && r.add(a);
          let o = () => {
              (i?.forEach((e) => s.fire(e)), (i = null));
            },
            s = new I({
              onWillAddFirstListener() {
                a || ((a = e((e) => s.fire(e))), r && r.add(a));
              },
              onDidAddFirstListener() {
                i && (t ? setTimeout(o) : o());
              },
              onDidRemoveLastListener() {
                (a && a.dispose(), (a = null));
              },
            });
          return (r && r.add(s), s.event);
        }
        e.buffer = g;
        function _(e, t) {
          return (n, r, i) => {
            let a = t(new y());
            return e(
              function (e) {
                let t = a.evaluate(e);
                t !== v && n.call(r, t);
              },
              void 0,
              i,
            );
          };
        }
        e.chain = _;
        let v = Symbol(`HaltChainable`);
        class y {
          constructor() {
            this.steps = [];
          }
          map(e) {
            return (this.steps.push(e), this);
          }
          forEach(e) {
            return (this.steps.push((t) => (e(t), t)), this);
          }
          filter(e) {
            return (this.steps.push((t) => (e(t) ? t : v)), this);
          }
          reduce(e, t) {
            let n = t;
            return (this.steps.push((t) => ((n = e(n, t)), n)), this);
          }
          latch(e = (e, t) => e === t) {
            let t = !0,
              n;
            return (
              this.steps.push((r) => {
                let i = t || !e(r, n);
                return ((t = !1), (n = r), i ? r : v);
              }),
              this
            );
          }
          evaluate(e) {
            for (let t of this.steps) if (((e = t(e)), e === v)) break;
            return e;
          }
        }
        function b(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new I({
              onWillAddFirstListener: () => e.on(t, r),
              onDidRemoveLastListener: () => e.removeListener(t, r),
            });
          return i.event;
        }
        e.fromNodeEventEmitter = b;
        function x(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new I({
              onWillAddFirstListener: () => e.addEventListener(t, r),
              onDidRemoveLastListener: () => e.removeEventListener(t, r),
            });
          return i.event;
        }
        e.fromDOMEventEmitter = x;
        function S(e) {
          return new Promise((t) => r(e)(t));
        }
        e.toPromise = S;
        function C(e) {
          let t = new I();
          return (
            e
              .then(
                (e) => {
                  t.fire(e);
                },
                () => {
                  t.fire(void 0);
                },
              )
              .finally(() => {
                t.dispose();
              }),
            t.event
          );
        }
        e.fromPromise = C;
        function w(e, t) {
          return e((e) => t.fire(e));
        }
        e.forward = w;
        function T(e, t, n) {
          return (t(n), e((e) => t(e)));
        }
        e.runAndSubscribe = T;
        class E {
          constructor(e, n) {
            ((this._observable = e), (this._counter = 0), (this._hasChanged = !1));
            let r = {
              onWillAddFirstListener: () => {
                e.addObserver(this);
              },
              onDidRemoveLastListener: () => {
                e.removeObserver(this);
              },
            };
            (n || t(r), (this.emitter = new I(r)), n && n.add(this.emitter));
          }
          beginUpdate(e) {
            this._counter++;
          }
          handlePossibleChange(e) {}
          handleChange(e, t) {
            this._hasChanged = !0;
          }
          endUpdate(e) {
            (this._counter--,
              this._counter === 0 &&
                (this._observable.reportChanges(),
                this._hasChanged &&
                  ((this._hasChanged = !1), this.emitter.fire(this._observable.get()))));
          }
        }
        function D(e, t) {
          return new E(e, t).emitter.event;
        }
        e.fromObservable = D;
        function ee(e) {
          return (t, n, r) => {
            let i = 0,
              a = !1,
              o = {
                beginUpdate() {
                  i++;
                },
                endUpdate() {
                  (i--, i === 0 && (e.reportChanges(), a && ((a = !1), t.call(n))));
                },
                handlePossibleChange() {},
                handleChange() {
                  a = !0;
                },
              };
            (e.addObserver(o), e.reportChanges());
            let s = {
              dispose() {
                e.removeObserver(o);
              },
            };
            return (r instanceof Ni ? r.add(s) : Array.isArray(r) && r.push(s), s);
          };
        }
        e.fromObservableLight = ee;
      })((Oa ||= {})),
      (ka = class e {
        constructor(t) {
          ((this.listenerCount = 0),
            (this.invocationCount = 0),
            (this.elapsedOverall = 0),
            (this.durations = []),
            (this.name = `${t}_${e._idPool++}`),
            e.all.add(this));
        }
        start(e) {
          ((this._stopWatch = new wa()), (this.listenerCount = e));
        }
        stop() {
          if (this._stopWatch) {
            let e = this._stopWatch.elapsed();
            (this.durations.push(e),
              (this.elapsedOverall += e),
              (this.invocationCount += 1),
              (this._stopWatch = void 0));
          }
        }
      }),
      (ka.all = new Set()),
      (ka._idPool = 0),
      (Aa = ka),
      (ja = -1),
      (Ma = class e {
        constructor(t, n, r = (e._idPool++).toString(16).padStart(3, `0`)) {
          ((this._errorHandler = t),
            (this.threshold = n),
            (this.name = r),
            (this._warnCountdown = 0));
        }
        dispose() {
          this._stacks?.clear();
        }
        check(e, t) {
          let n = this.threshold;
          if (n <= 0 || t < n) return;
          this._stacks ||= new Map();
          let r = this._stacks.get(e.value) || 0;
          if ((this._stacks.set(e.value, r + 1), --this._warnCountdown, this._warnCountdown <= 0)) {
            this._warnCountdown = n * 0.5;
            let [e, r] = this.getMostFrequentStack(),
              i = `[${this.name}] potential listener LEAK detected, having ${t} listeners already. MOST frequent listener (${r}):`;
            (console.warn(i), console.warn(e));
            let a = new Fa(i, e);
            this._errorHandler(a);
          }
          return () => {
            let t = this._stacks.get(e.value) || 0;
            this._stacks.set(e.value, t - 1);
          };
        }
        getMostFrequentStack() {
          if (!this._stacks) return;
          let e,
            t = 0;
          for (let [n, r] of this._stacks) (!e || t < r) && ((e = [n, r]), (t = r));
          return e;
        }
      }),
      (Ma._idPool = 1),
      (Na = Ma),
      (Pa = class e {
        constructor(e) {
          this.value = e;
        }
        static create() {
          return new e(Error().stack ?? ``);
        }
        print() {
          console.warn(
            this.value
              .split(`
`)
              .slice(2).join(`
`),
          );
        }
      }),
      (Fa = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerLeakError`), (this.stack = t));
        }
      }),
      (Ia = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerRefusalError`), (this.stack = t));
        }
      }),
      (La = 0),
      (Ra = class {
        constructor(e) {
          ((this.value = e), (this.id = La++));
        }
      }),
      (za = 2),
      (Ba = (e, t) => {
        if (e instanceof Ra) t(e);
        else
          for (let n = 0; n < e.length; n++) {
            let r = e[n];
            r && t(r);
          }
      }),
      Ta)
    ) {
      let e = [];
      (setInterval(() => {
        e.length !== 0 &&
          (console.warn(`[LEAKING LISTENERS] GC'ed these listeners that were NOT yet disposed:`),
          console.warn(
            e.join(`
`),
          ),
          (e.length = 0));
      }, 3e3),
        (Va = new FinalizationRegistry((t) => {
          typeof t == `string` && e.push(t);
        })));
    }
    if (
      ((I = class {
        constructor(e) {
          ((this._size = 0),
            (this._options = e),
            (this._leakageMon =
              ja > 0 || this._options?.leakWarningThreshold
                ? new Na(e?.onListenerError ?? Xn, this._options?.leakWarningThreshold ?? ja)
                : void 0),
            (this._perfMon = this._options?._profName ? new Aa(this._options._profName) : void 0),
            (this._deliveryQueue = this._options?.deliveryQueue));
        }
        dispose() {
          if (!this._disposed) {
            if (
              ((this._disposed = !0),
              this._deliveryQueue?.current === this && this._deliveryQueue.reset(),
              this._listeners)
            ) {
              if (Ea) {
                let e = this._listeners;
                queueMicrotask(() => {
                  Ba(e, (e) => e.stack?.print());
                });
              }
              ((this._listeners = void 0), (this._size = 0));
            }
            (this._options?.onDidRemoveLastListener?.(), this._leakageMon?.dispose());
          }
        }
        get event() {
          return (
            (this._event ??= (e, t, n) => {
              if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
                let e = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
                console.warn(e);
                let t = this._leakageMon.getMostFrequentStack() ?? [`UNKNOWN stack`, -1],
                  n = new Ia(
                    `${e}. HINT: Stack shows most frequent listener (${t[1]}-times)`,
                    t[0],
                  );
                return ((this._options?.onListenerError || Xn)(n), Pi.None);
              }
              if (this._disposed) return Pi.None;
              t && (e = e.bind(t));
              let r = new Ra(e),
                i;
              (this._leakageMon &&
                this._size >= Math.ceil(this._leakageMon.threshold * 0.2) &&
                ((r.stack = Pa.create()), (i = this._leakageMon.check(r.stack, this._size + 1))),
                Ea && (r.stack = Pa.create()),
                this._listeners
                  ? this._listeners instanceof Ra
                    ? ((this._deliveryQueue ??= new Ha()), (this._listeners = [this._listeners, r]))
                    : this._listeners.push(r)
                  : (this._options?.onWillAddFirstListener?.(this),
                    (this._listeners = r),
                    this._options?.onDidAddFirstListener?.(this)),
                this._size++);
              let a = lr(() => {
                (Va?.unregister(a), i?.(), this._removeListener(r));
              });
              if ((n instanceof Ni ? n.add(a) : Array.isArray(n) && n.push(a), Va)) {
                let e = Error()
                    .stack.split(`
`)
                    .slice(2, 3)
                    .join(`
`)
                    .trim(),
                  t = /(file:|vscode-file:\/\/vscode-app)?(\/[^:]*:\d+:\d+)/.exec(e);
                Va.register(a, t?.[2] ?? e, a);
              }
              return a;
            }),
            this._event
          );
        }
        _removeListener(e) {
          if ((this._options?.onWillRemoveListener?.(this), !this._listeners)) return;
          if (this._size === 1) {
            ((this._listeners = void 0),
              this._options?.onDidRemoveLastListener?.(this),
              (this._size = 0));
            return;
          }
          let t = this._listeners,
            n = t.indexOf(e);
          if (n === -1)
            throw (
              console.log(`disposed?`, this._disposed),
              console.log(`size?`, this._size),
              console.log(`arr?`, JSON.stringify(this._listeners)),
              Error(`Attempted to dispose unknown listener`)
            );
          (this._size--, (t[n] = void 0));
          let r = this._deliveryQueue.current === this;
          if (this._size * za <= t.length) {
            let e = 0;
            for (let n = 0; n < t.length; n++)
              t[n]
                ? (t[e++] = t[n])
                : r &&
                  (this._deliveryQueue.end--, e < this._deliveryQueue.i && this._deliveryQueue.i--);
            t.length = e;
          }
        }
        _deliver(e, t) {
          if (!e) return;
          let n = this._options?.onListenerError || Xn;
          if (!n) {
            e.value(t);
            return;
          }
          try {
            e.value(t);
          } catch (e) {
            n(e);
          }
        }
        _deliverQueue(e) {
          let t = e.current._listeners;
          for (; e.i < e.end; ) this._deliver(t[e.i++], e.value);
          e.reset();
        }
        fire(e) {
          if (
            (this._deliveryQueue?.current &&
              (this._deliverQueue(this._deliveryQueue), this._perfMon?.stop()),
            this._perfMon?.start(this._size),
            this._listeners)
          )
            if (this._listeners instanceof Ra) this._deliver(this._listeners, e);
            else {
              let t = this._deliveryQueue;
              (t.enqueue(this, e, this._listeners.length), this._deliverQueue(t));
            }
          this._perfMon?.stop();
        }
        hasListeners() {
          return this._size > 0;
        }
      }),
      (Ha = class {
        constructor() {
          ((this.i = -1), (this.end = 0));
        }
        enqueue(e, t, n) {
          ((this.i = 0), (this.end = n), (this.current = e), (this.value = t));
        }
        reset() {
          ((this.i = this.end), (this.current = void 0), (this.value = void 0));
        }
      }),
      (Ua = {
        texturePage: 0,
        texturePosition: { x: 0, y: 0 },
        texturePositionClipSpace: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        size: { x: 0, y: 0 },
        sizeClipSpace: { x: 0, y: 0 },
      }),
      (Wa = 2),
      (Ka = class e {
        constructor(e, t, n) {
          ((this._document = e),
            (this._config = t),
            (this._unicodeService = n),
            (this._didWarmUp = !1),
            (this._cacheMap = new ha()),
            (this._cacheMapCombined = new ha()),
            (this._pages = []),
            (this._activePages = []),
            (this._workBoundingBox = { top: 0, left: 0, bottom: 0, right: 0 }),
            (this._workAttributeData = new ba()),
            (this._textureSize = 512),
            (this._onAddTextureAtlasCanvas = new I()),
            (this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event),
            (this._onRemoveTextureAtlasCanvas = new I()),
            (this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event),
            (this._requestClearModel = !1),
            this._createNewPage(),
            (this._tmpCanvas = Nr(
              e,
              this._config.deviceCellWidth * 4 + Wa * 2,
              this._config.deviceCellHeight + Wa * 2,
            )),
            (this._tmpCtx = pr(
              this._tmpCanvas.getContext(`2d`, {
                alpha: this._config.allowTransparency,
                willReadFrequently: !0,
              }),
            )));
        }
        get pages() {
          return this._pages;
        }
        dispose() {
          this._tmpCanvas.remove();
          for (let e of this.pages) e.canvas.remove();
          this._onAddTextureAtlasCanvas.dispose();
        }
        warmUp() {
          this._didWarmUp ||= (this._doWarmUp(), !0);
        }
        _doWarmUp() {
          let e = new ya();
          for (let t = 33; t < 126; t++)
            e.enqueue(() => {
              if (!this._cacheMap.get(t, 0, 0, 0)) {
                let e = this._drawToCache(t, 0, 0, 0, !1, void 0);
                this._cacheMap.set(t, 0, 0, 0, e);
              }
            });
        }
        beginFrame() {
          return this._requestClearModel;
        }
        clearTexture() {
          if (!(this._pages[0].currentRow.x === 0 && this._pages[0].currentRow.y === 0)) {
            for (let e of this._pages) e.clear();
            (this._cacheMap.clear(), this._cacheMapCombined.clear(), (this._didWarmUp = !1));
          }
        }
        _createNewPage() {
          if (e.maxAtlasPages && this._pages.length >= Math.max(4, e.maxAtlasPages)) {
            let t = this._pages
                .filter((t) => t.canvas.width * 2 <= (e.maxTextureSize || 4096))
                .sort((e, t) =>
                  t.canvas.width === e.canvas.width
                    ? t.percentageUsed - e.percentageUsed
                    : t.canvas.width - e.canvas.width,
                ),
              n = -1,
              r = 0;
            for (let e = 0; e < t.length; e++)
              if (t[e].canvas.width !== r) ((n = e), (r = t[e].canvas.width));
              else if (e - n === 3) break;
            let i = t.slice(n, n + 4),
              a = i.map((e) => e.glyphs[0].texturePage).sort((e, t) => (e > t ? 1 : -1)),
              o = this.pages.length - i.length,
              s = this._mergePages(i, o);
            s.version++;
            for (let e = a.length - 1; e >= 0; e--) this._deletePage(a[e]);
            (this.pages.push(s),
              (this._requestClearModel = !0),
              this._onAddTextureAtlasCanvas.fire(s.canvas));
          }
          let t = new qa(this._document, this._textureSize);
          return (
            this._pages.push(t),
            this._activePages.push(t),
            this._onAddTextureAtlasCanvas.fire(t.canvas),
            t
          );
        }
        _mergePages(e, t) {
          let n = e[0].canvas.width * 2,
            r = new qa(this._document, n, e);
          for (let [i, a] of e.entries()) {
            let e = (i * a.canvas.width) % n,
              o = Math.floor(i / 2) * a.canvas.height;
            r.ctx.drawImage(a.canvas, e, o);
            for (let r of a.glyphs)
              ((r.texturePage = t),
                (r.sizeClipSpace.x = r.size.x / n),
                (r.sizeClipSpace.y = r.size.y / n),
                (r.texturePosition.x += e),
                (r.texturePosition.y += o),
                (r.texturePositionClipSpace.x = r.texturePosition.x / n),
                (r.texturePositionClipSpace.y = r.texturePosition.y / n));
            this._onRemoveTextureAtlasCanvas.fire(a.canvas);
            let s = this._activePages.indexOf(a);
            s !== -1 && this._activePages.splice(s, 1);
          }
          return r;
        }
        _deletePage(e) {
          this._pages.splice(e, 1);
          for (let t = e; t < this._pages.length; t++) {
            let e = this._pages[t];
            for (let t of e.glyphs) t.texturePage--;
            e.version++;
          }
        }
        getRasterizedGlyphCombinedChar(e, t, n, r, i, a) {
          return this._getFromCacheMap(this._cacheMapCombined, e, t, n, r, i, a);
        }
        getRasterizedGlyph(e, t, n, r, i, a) {
          return this._getFromCacheMap(this._cacheMap, e, t, n, r, i, a);
        }
        _getFromCacheMap(e, t, n, r, i, a, o) {
          return (
            (Ga = e.get(t, n, r, i)),
            Ga || ((Ga = this._drawToCache(t, n, r, i, a, o)), e.set(t, n, r, i, Ga)),
            Ga
          );
        }
        _getColorFromAnsiIndex(e) {
          if (e >= this._config.colors.ansi.length) throw Error(`No color found for idx ` + e);
          return this._config.colors.ansi[e];
        }
        _getBackgroundColor(e, t, n, r) {
          if (this._config.allowTransparency) return Ki;
          let i;
          switch (e) {
            case 16777216:
            case 33554432:
              i = this._getColorFromAnsiIndex(t);
              break;
            case 50331648:
              let e = ba.toColorRGB(t);
              i = qi.toColor(e[0], e[1], e[2]);
              break;
            default:
              i = n ? Ji.opaque(this._config.colors.foreground) : this._config.colors.background;
              break;
          }
          return (this._config.allowTransparency || (i = Ji.opaque(i)), i);
        }
        _getForegroundColor(e, t, n, r, i, a, o, s, c, l) {
          let u = this._getMinimumContrastColor(e, t, n, r, i, a, o, c, s, l);
          if (u) return u;
          let d;
          switch (i) {
            case 16777216:
            case 33554432:
              (this._config.drawBoldTextInBrightColors && c && a < 8 && (a += 8),
                (d = this._getColorFromAnsiIndex(a)));
              break;
            case 50331648:
              let e = ba.toColorRGB(a);
              d = qi.toColor(e[0], e[1], e[2]);
              break;
            default:
              d = o ? this._config.colors.background : this._config.colors.foreground;
          }
          return (
            this._config.allowTransparency && (d = Ji.opaque(d)),
            s && (d = Ji.multiplyOpacity(d, oa)),
            d
          );
        }
        _resolveBackgroundRgba(e, t, n) {
          switch (e) {
            case 16777216:
            case 33554432:
              return this._getColorFromAnsiIndex(t).rgba;
            case 50331648:
              return t << 8;
            default:
              return n ? this._config.colors.foreground.rgba : this._config.colors.background.rgba;
          }
        }
        _resolveForegroundRgba(e, t, n, r) {
          switch (e) {
            case 16777216:
            case 33554432:
              return (
                this._config.drawBoldTextInBrightColors && r && t < 8 && (t += 8),
                this._getColorFromAnsiIndex(t).rgba
              );
            case 50331648:
              return t << 8;
            default:
              return n ? this._config.colors.background.rgba : this._config.colors.foreground.rgba;
          }
        }
        _getMinimumContrastColor(e, t, n, r, i, a, o, s, c, l) {
          if (this._config.minimumContrastRatio === 1 || l) return;
          let u = this._getContrastCache(c),
            d = u.getColor(e, r);
          if (d !== void 0) return d || void 0;
          let f = this._resolveBackgroundRgba(t, n, o),
            p = this._resolveForegroundRgba(i, a, o, s),
            m = Zi.ensureContrastRatio(f, p, this._config.minimumContrastRatio / (c ? 2 : 1));
          if (!m) {
            u.setColor(e, r, null);
            return;
          }
          let h = qi.toColor((m >> 24) & 255, (m >> 16) & 255, (m >> 8) & 255);
          return (u.setColor(e, r, h), h);
        }
        _getContrastCache(e) {
          return e ? this._config.colors.halfContrastCache : this._config.colors.contrastCache;
        }
        _drawToCache(t, n, r, i, a, o) {
          let s = typeof t == `number` ? String.fromCharCode(t) : t;
          o &&
            this._tmpCanvas.parentElement !== o &&
            ((this._tmpCanvas.style.display = `none`), o.append(this._tmpCanvas));
          let c = Math.min(
            this._config.deviceCellWidth * Math.max(s.length, 2) + Wa * 2,
            this._config.deviceMaxTextureSize,
          );
          this._tmpCanvas.width < c && (this._tmpCanvas.width = c);
          let l = Math.min(this._config.deviceCellHeight + Wa * 4, this._textureSize);
          if (
            (this._tmpCanvas.height < l && (this._tmpCanvas.height = l),
            this._tmpCtx.save(),
            (this._workAttributeData.fg = r),
            (this._workAttributeData.bg = n),
            (this._workAttributeData.extended.ext = i),
            this._workAttributeData.isInvisible())
          )
            return Ua;
          let u = !!this._workAttributeData.isBold(),
            d = !!this._workAttributeData.isInverse(),
            f = !!this._workAttributeData.isDim(),
            p = !!this._workAttributeData.isItalic(),
            m = !!this._workAttributeData.isUnderline(),
            h = !!this._workAttributeData.isStrikethrough(),
            g = !!this._workAttributeData.isOverline(),
            _ = this._workAttributeData.getFgColor(),
            v = this._workAttributeData.getFgColorMode(),
            y = this._workAttributeData.getBgColor(),
            b = this._workAttributeData.getBgColorMode();
          if (d) {
            let e = _;
            ((_ = y), (y = e));
            let t = v;
            ((v = b), (b = t));
          }
          let x = this._getBackgroundColor(b, y, d, f);
          ((this._tmpCtx.globalCompositeOperation = `copy`),
            (this._tmpCtx.fillStyle = x.css),
            this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height),
            (this._tmpCtx.globalCompositeOperation = `source-over`));
          let S = u ? this._config.fontWeightBold : this._config.fontWeight,
            C = p ? `italic` : ``;
          ((this._tmpCtx.font = `${C} ${S} ${this._config.fontSize * this._config.devicePixelRatio}px ${this._config.fontFamily}`),
            (this._tmpCtx.textBaseline = sa));
          let w = s.length === 1 && mr(s.charCodeAt(0)),
            T = s.length === 1 && hr(s.charCodeAt(0)),
            E = this._getForegroundColor(n, b, y, r, v, _, d, f, u, br(s.charCodeAt(0)));
          this._tmpCtx.fillStyle = E.css;
          let D = T ? 0 : Wa * 2,
            ee = !1;
          this._config.customGlyphs !== !1 &&
            (ee = wr(
              this._tmpCtx,
              s,
              D,
              D,
              this._config.deviceCellWidth,
              this._config.deviceCellHeight,
              this._config.fontSize,
              this._config.devicePixelRatio,
            ));
          let O = !w,
            k;
          if (
            ((k =
              typeof t == `number`
                ? this._unicodeService.wcwidth(t)
                : this._unicodeService.getStringCellWidth(t)),
            m)
          ) {
            this._tmpCtx.save();
            let e = Math.max(
                1,
                Math.floor((this._config.fontSize * this._config.devicePixelRatio) / 15),
              ),
              t = e % 2 == 1 ? 0.5 : 0;
            if (((this._tmpCtx.lineWidth = e), this._workAttributeData.isUnderlineColorDefault()))
              this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle;
            else if (this._workAttributeData.isUnderlineColorRGB())
              ((O = !1),
                (this._tmpCtx.strokeStyle = `rgb(${ba.toColorRGB(this._workAttributeData.getUnderlineColor()).join(`,`)})`));
            else {
              O = !1;
              let e = this._workAttributeData.getUnderlineColor();
              (this._config.drawBoldTextInBrightColors &&
                this._workAttributeData.isBold() &&
                e < 8 &&
                (e += 8),
                (this._tmpCtx.strokeStyle = this._getColorFromAnsiIndex(e).css));
            }
            this._tmpCtx.beginPath();
            let n = D,
              r = Math.ceil(D + this._config.deviceCharHeight) - t - (a ? e * 2 : 0),
              i = r + e,
              o = r + e * 2,
              c = this._workAttributeData.getUnderlineVariantOffset();
            for (let a = 0; a < k; a++) {
              this._tmpCtx.save();
              let s = n + a * this._config.deviceCellWidth,
                l = n + (a + 1) * this._config.deviceCellWidth,
                u = s + this._config.deviceCellWidth / 2;
              switch (this._workAttributeData.extended.underlineStyle) {
                case 2:
                  (this._tmpCtx.moveTo(s, r),
                    this._tmpCtx.lineTo(l, r),
                    this._tmpCtx.moveTo(s, o),
                    this._tmpCtx.lineTo(l, o));
                  break;
                case 3:
                  let n = e <= 1 ? o : Math.ceil(D + this._config.deviceCharHeight - e / 2) - t,
                    a = e <= 1 ? r : Math.ceil(D + this._config.deviceCharHeight + e / 2) - t,
                    d = new Path2D();
                  (d.rect(s, r, this._config.deviceCellWidth, o - r),
                    this._tmpCtx.clip(d),
                    this._tmpCtx.moveTo(s - this._config.deviceCellWidth / 2, i),
                    this._tmpCtx.bezierCurveTo(s - this._config.deviceCellWidth / 2, a, s, a, s, i),
                    this._tmpCtx.bezierCurveTo(s, n, u, n, u, i),
                    this._tmpCtx.bezierCurveTo(u, a, l, a, l, i),
                    this._tmpCtx.bezierCurveTo(
                      l,
                      n,
                      l + this._config.deviceCellWidth / 2,
                      n,
                      l + this._config.deviceCellWidth / 2,
                      i,
                    ));
                  break;
                case 4:
                  let f = c === 0 ? 0 : c >= e ? e * 2 - c : e - c;
                  (c >= e || f === 0
                    ? (this._tmpCtx.setLineDash([Math.round(e), Math.round(e)]),
                      this._tmpCtx.moveTo(s + f, r),
                      this._tmpCtx.lineTo(l, r))
                    : (this._tmpCtx.setLineDash([Math.round(e), Math.round(e)]),
                      this._tmpCtx.moveTo(s, r),
                      this._tmpCtx.lineTo(s + f, r),
                      this._tmpCtx.moveTo(s + f + e, r),
                      this._tmpCtx.lineTo(l, r)),
                    (c = Cr(l - s, e, c)));
                  break;
                case 5:
                  let p = l - s,
                    m = Math.floor(0.6 * p),
                    h = Math.floor(0.3 * p),
                    g = p - m - h;
                  (this._tmpCtx.setLineDash([m, h, g]),
                    this._tmpCtx.moveTo(s, r),
                    this._tmpCtx.lineTo(l, r));
                  break;
                default:
                  (this._tmpCtx.moveTo(s, r), this._tmpCtx.lineTo(l, r));
                  break;
              }
              (this._tmpCtx.stroke(), this._tmpCtx.restore());
            }
            if (
              (this._tmpCtx.restore(),
              !ee && this._config.fontSize >= 12 && !this._config.allowTransparency && s !== ` `)
            ) {
              (this._tmpCtx.save(), (this._tmpCtx.textBaseline = `alphabetic`));
              let t = this._tmpCtx.measureText(s);
              if (
                (this._tmpCtx.restore(),
                `actualBoundingBoxDescent` in t && t.actualBoundingBoxDescent > 0)
              ) {
                this._tmpCtx.save();
                let t = new Path2D();
                (t.rect(
                  n,
                  r - Math.ceil(e / 2),
                  this._config.deviceCellWidth * k,
                  o - r + Math.ceil(e / 2),
                ),
                  this._tmpCtx.clip(t),
                  (this._tmpCtx.lineWidth = this._config.devicePixelRatio * 3),
                  (this._tmpCtx.strokeStyle = x.css),
                  this._tmpCtx.strokeText(s, D, D + this._config.deviceCharHeight),
                  this._tmpCtx.restore());
              }
            }
          }
          if (g) {
            let e = Math.max(
                1,
                Math.floor((this._config.fontSize * this._config.devicePixelRatio) / 15),
              ),
              t = e % 2 == 1 ? 0.5 : 0;
            ((this._tmpCtx.lineWidth = e),
              (this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle),
              this._tmpCtx.beginPath(),
              this._tmpCtx.moveTo(D, D + t),
              this._tmpCtx.lineTo(D + this._config.deviceCharWidth * k, D + t),
              this._tmpCtx.stroke());
          }
          if (
            (ee || this._tmpCtx.fillText(s, D, D + this._config.deviceCharHeight),
            s === `_` && !this._config.allowTransparency)
          ) {
            let e = jr(
              this._tmpCtx.getImageData(
                D,
                D,
                this._config.deviceCellWidth,
                this._config.deviceCellHeight,
              ),
              x,
              E,
              O,
            );
            if (e)
              for (
                let t = 1;
                t <= 5 &&
                (this._tmpCtx.save(),
                (this._tmpCtx.fillStyle = x.css),
                this._tmpCtx.fillRect(0, 0, this._tmpCanvas.width, this._tmpCanvas.height),
                this._tmpCtx.restore(),
                this._tmpCtx.fillText(s, D, D + this._config.deviceCharHeight - t),
                (e = jr(
                  this._tmpCtx.getImageData(
                    D,
                    D,
                    this._config.deviceCellWidth,
                    this._config.deviceCellHeight,
                  ),
                  x,
                  E,
                  O,
                )),
                e);
                t++
              );
          }
          if (h) {
            let e = Math.max(
                1,
                Math.floor((this._config.fontSize * this._config.devicePixelRatio) / 10),
              ),
              t = this._tmpCtx.lineWidth % 2 == 1 ? 0.5 : 0;
            ((this._tmpCtx.lineWidth = e),
              (this._tmpCtx.strokeStyle = this._tmpCtx.fillStyle),
              this._tmpCtx.beginPath(),
              this._tmpCtx.moveTo(D, D + Math.floor(this._config.deviceCharHeight / 2) - t),
              this._tmpCtx.lineTo(
                D + this._config.deviceCharWidth * k,
                D + Math.floor(this._config.deviceCharHeight / 2) - t,
              ),
              this._tmpCtx.stroke());
          }
          this._tmpCtx.restore();
          let A = this._tmpCtx.getImageData(0, 0, this._tmpCanvas.width, this._tmpCanvas.height),
            te;
          if (((te = this._config.allowTransparency ? Mr(A) : jr(A, x, E, O)), te)) return Ua;
          let j = this._findGlyphBoundingBox(A, this._workBoundingBox, c, T, ee, D),
            M,
            N;
          for (;;) {
            if (this._activePages.length === 0) {
              let e = this._createNewPage();
              ((M = e), (N = e.currentRow), (N.height = j.size.y));
              break;
            }
            ((M = this._activePages[this._activePages.length - 1]), (N = M.currentRow));
            for (let e of this._activePages)
              j.size.y <= e.currentRow.height && ((M = e), (N = e.currentRow));
            for (let e = this._activePages.length - 1; e >= 0; e--)
              for (let t of this._activePages[e].fixedRows)
                t.height <= N.height &&
                  j.size.y <= t.height &&
                  ((M = this._activePages[e]), (N = t));
            if (j.size.x > this._textureSize) {
              (this._overflowSizePage ||
                ((this._overflowSizePage = new qa(
                  this._document,
                  this._config.deviceMaxTextureSize,
                )),
                this.pages.push(this._overflowSizePage),
                (this._requestClearModel = !0),
                this._onAddTextureAtlasCanvas.fire(this._overflowSizePage.canvas)),
                (M = this._overflowSizePage),
                (N = this._overflowSizePage.currentRow),
                N.x + j.size.x >= M.canvas.width && ((N.x = 0), (N.y += N.height), (N.height = 0)));
              break;
            }
            if (N.y + j.size.y >= M.canvas.height || N.height > j.size.y + 2) {
              let t = !1;
              if (M.currentRow.y + M.currentRow.height + j.size.y >= M.canvas.height) {
                let n;
                for (let e of this._activePages)
                  if (e.currentRow.y + e.currentRow.height + j.size.y < e.canvas.height) {
                    n = e;
                    break;
                  }
                if (n) M = n;
                else if (
                  e.maxAtlasPages &&
                  this._pages.length >= e.maxAtlasPages &&
                  N.y + j.size.y <= M.canvas.height &&
                  N.height >= j.size.y &&
                  N.x + j.size.x <= M.canvas.width
                )
                  t = !0;
                else {
                  let e = this._createNewPage();
                  ((M = e), (N = e.currentRow), (N.height = j.size.y), (t = !0));
                }
              }
              t ||
                (M.currentRow.height > 0 && M.fixedRows.push(M.currentRow),
                (N = { x: 0, y: M.currentRow.y + M.currentRow.height, height: j.size.y }),
                M.fixedRows.push(N),
                (M.currentRow = { x: 0, y: N.y + N.height, height: 0 }));
            }
            if (N.x + j.size.x <= M.canvas.width) break;
            N === M.currentRow
              ? ((N.x = 0), (N.y += N.height), (N.height = 0))
              : M.fixedRows.splice(M.fixedRows.indexOf(N), 1);
          }
          return (
            (j.texturePage = this._pages.indexOf(M)),
            (j.texturePosition.x = N.x),
            (j.texturePosition.y = N.y),
            (j.texturePositionClipSpace.x = N.x / M.canvas.width),
            (j.texturePositionClipSpace.y = N.y / M.canvas.height),
            (j.sizeClipSpace.x /= M.canvas.width),
            (j.sizeClipSpace.y /= M.canvas.height),
            (N.height = Math.max(N.height, j.size.y)),
            (N.x += j.size.x),
            M.ctx.putImageData(
              A,
              j.texturePosition.x - this._workBoundingBox.left,
              j.texturePosition.y - this._workBoundingBox.top,
              this._workBoundingBox.left,
              this._workBoundingBox.top,
              j.size.x,
              j.size.y,
            ),
            M.addGlyph(j),
            M.version++,
            j
          );
        }
        _findGlyphBoundingBox(e, t, n, r, i, a) {
          t.top = 0;
          let o = r ? this._config.deviceCellHeight : this._tmpCanvas.height,
            s = r ? this._config.deviceCellWidth : n,
            c = !1;
          for (let n = 0; n < o; n++) {
            for (let r = 0; r < s; r++) {
              let i = n * this._tmpCanvas.width * 4 + r * 4 + 3;
              if (e.data[i] !== 0) {
                ((t.top = n), (c = !0));
                break;
              }
            }
            if (c) break;
          }
          ((t.left = 0), (c = !1));
          for (let n = 0; n < a + s; n++) {
            for (let r = 0; r < o; r++) {
              let i = r * this._tmpCanvas.width * 4 + n * 4 + 3;
              if (e.data[i] !== 0) {
                ((t.left = n), (c = !0));
                break;
              }
            }
            if (c) break;
          }
          ((t.right = s), (c = !1));
          for (let n = a + s - 1; n >= a; n--) {
            for (let r = 0; r < o; r++) {
              let i = r * this._tmpCanvas.width * 4 + n * 4 + 3;
              if (e.data[i] !== 0) {
                ((t.right = n), (c = !0));
                break;
              }
            }
            if (c) break;
          }
          ((t.bottom = o), (c = !1));
          for (let n = o - 1; n >= 0; n--) {
            for (let r = 0; r < s; r++) {
              let i = n * this._tmpCanvas.width * 4 + r * 4 + 3;
              if (e.data[i] !== 0) {
                ((t.bottom = n), (c = !0));
                break;
              }
            }
            if (c) break;
          }
          return {
            texturePage: 0,
            texturePosition: { x: 0, y: 0 },
            texturePositionClipSpace: { x: 0, y: 0 },
            size: { x: t.right - t.left + 1, y: t.bottom - t.top + 1 },
            sizeClipSpace: { x: t.right - t.left + 1, y: t.bottom - t.top + 1 },
            offset: {
              x:
                -t.left +
                a +
                (r || i
                  ? Math.floor((this._config.deviceCellWidth - this._config.deviceCharWidth) / 2)
                  : 0),
              y:
                -t.top +
                a +
                (r || i
                  ? this._config.lineHeight === 1
                    ? 0
                    : Math.round(
                        (this._config.deviceCellHeight - this._config.deviceCharHeight) / 2,
                      )
                  : 0),
            },
          };
        }
      }),
      (qa = class {
        constructor(e, t, n) {
          if (
            ((this._usedPixels = 0),
            (this._glyphs = []),
            (this.version = 0),
            (this.currentRow = { x: 0, y: 0, height: 0 }),
            (this.fixedRows = []),
            n)
          )
            for (let e of n) (this._glyphs.push(...e.glyphs), (this._usedPixels += e._usedPixels));
          ((this.canvas = Nr(e, t, t)),
            (this.ctx = pr(this.canvas.getContext(`2d`, { alpha: !0 }))));
        }
        get percentageUsed() {
          return this._usedPixels / (this.canvas.width * this.canvas.height);
        }
        get glyphs() {
          return this._glyphs;
        }
        addGlyph(e) {
          (this._glyphs.push(e), (this._usedPixels += e.size.x * e.size.y));
        }
        clear() {
          (this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height),
            (this.currentRow.x = 0),
            (this.currentRow.y = 0),
            (this.currentRow.height = 0),
            (this.fixedRows.length = 0),
            this.version++);
        }
      }),
      (Ja = []),
      (Ya = 600),
      (Xa = class {
        constructor(e, t) {
          ((this._renderCallback = e),
            (this._coreBrowserService = t),
            (this.isCursorVisible = !0),
            this._coreBrowserService.isFocused && this._restartInterval());
        }
        get isPaused() {
          return !(this._blinkStartTimeout || this._blinkInterval);
        }
        dispose() {
          ((this._blinkInterval &&=
            (this._coreBrowserService.window.clearInterval(this._blinkInterval), void 0)),
            (this._blinkStartTimeout &&=
              (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), void 0)),
            (this._animationFrame &&=
              (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame),
              void 0)));
        }
        restartBlinkAnimation() {
          this.isPaused ||
            ((this._animationTimeRestarted = Date.now()),
            (this.isCursorVisible = !0),
            (this._animationFrame ||= this._coreBrowserService.window.requestAnimationFrame(() => {
              (this._renderCallback(), (this._animationFrame = void 0));
            })));
        }
        _restartInterval(e = Ya) {
          ((this._blinkInterval &&=
            (this._coreBrowserService.window.clearInterval(this._blinkInterval), void 0)),
            (this._blinkStartTimeout = this._coreBrowserService.window.setTimeout(() => {
              if (this._animationTimeRestarted) {
                let e = Ya - (Date.now() - this._animationTimeRestarted);
                if (((this._animationTimeRestarted = void 0), e > 0)) {
                  this._restartInterval(e);
                  return;
                }
              }
              ((this.isCursorVisible = !1),
                (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(
                  () => {
                    (this._renderCallback(), (this._animationFrame = void 0));
                  },
                )),
                (this._blinkInterval = this._coreBrowserService.window.setInterval(() => {
                  if (this._animationTimeRestarted) {
                    let e = Ya - (Date.now() - this._animationTimeRestarted);
                    ((this._animationTimeRestarted = void 0), this._restartInterval(e));
                    return;
                  }
                  ((this.isCursorVisible = !this.isCursorVisible),
                    (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(
                      () => {
                        (this._renderCallback(), (this._animationFrame = void 0));
                      },
                    )));
                }, Ya)));
            }, e)));
        }
        pause() {
          ((this.isCursorVisible = !0),
            (this._blinkInterval &&=
              (this._coreBrowserService.window.clearInterval(this._blinkInterval), void 0)),
            (this._blinkStartTimeout &&=
              (this._coreBrowserService.window.clearTimeout(this._blinkStartTimeout), void 0)),
            (this._animationFrame &&=
              (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame),
              void 0)));
        }
        resume() {
          (this.pause(),
            (this._animationTimeRestarted = void 0),
            this._restartInterval(),
            this.restartBlinkAnimation());
        }
      }),
      (Za = class e extends ba {
        constructor() {
          (super(...arguments),
            (this.content = 0),
            (this.fg = 0),
            (this.bg = 0),
            (this.extended = new xa()),
            (this.combinedData = ``));
        }
        static fromCharData(t) {
          let n = new e();
          return (n.setFromCharData(t), n);
        }
        isCombined() {
          return this.content & 2097152;
        }
        getWidth() {
          return this.content >> 22;
        }
        getChars() {
          return this.content & 2097152
            ? this.combinedData
            : this.content & 2097151
              ? Br(this.content & 2097151)
              : ``;
        }
        getCode() {
          return this.isCombined()
            ? this.combinedData.charCodeAt(this.combinedData.length - 1)
            : this.content & 2097151;
        }
        setFromCharData(e) {
          ((this.fg = e[0]), (this.bg = 0));
          let t = !1;
          if (e[1].length > 2) t = !0;
          else if (e[1].length === 2) {
            let n = e[1].charCodeAt(0);
            if (55296 <= n && n <= 56319) {
              let r = e[1].charCodeAt(1);
              56320 <= r && r <= 57343
                ? (this.content = ((n - 55296) * 1024 + r - 56320 + 65536) | (e[2] << 22))
                : (t = !0);
            } else t = !0;
          } else this.content = e[1].charCodeAt(0) | (e[2] << 22);
          t && ((this.combinedData = e[1]), (this.content = 2097152 | (e[2] << 22)));
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }),
      (Qa = new Float32Array([2, 0, 0, 0, 0, -2, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1])),
      ($a = class {
        constructor(e) {
          ((this.texture = e), (this.version = -1));
        }
      }),
      (eo = `#version 300 es
layout (location = 0) in vec2 a_unitquad;
layout (location = 1) in vec2 a_cellpos;
layout (location = 2) in vec2 a_offset;
layout (location = 3) in vec2 a_size;
layout (location = 4) in float a_texpage;
layout (location = 5) in vec2 a_texcoord;
layout (location = 6) in vec2 a_texsize;

uniform mat4 u_projection;
uniform vec2 u_resolution;

out vec2 v_texcoord;
flat out int v_texpage;

void main() {
  vec2 zeroToOne = (a_offset / u_resolution) + a_cellpos + (a_unitquad * a_size);
  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);
  v_texpage = int(a_texpage);
  v_texcoord = a_texcoord + a_unitquad * a_texsize;
}`),
      (to = 11),
      (no = to * Float32Array.BYTES_PER_ELEMENT),
      (ro = 2),
      (L = 0),
      (io = 0),
      (ao = 0),
      (oo = class extends Pi {
        constructor(e, t, n, r) {
          (super(),
            (this._terminal = e),
            (this._gl = t),
            (this._dimensions = n),
            (this._optionsService = r),
            (this._activeBuffer = 0),
            (this._vertices = {
              count: 0,
              attributes: new Float32Array(),
              attributesBuffers: [new Float32Array(), new Float32Array()],
            }));
          let i = this._gl;
          (Ka.maxAtlasPages === void 0 &&
            ((Ka.maxAtlasPages = Math.min(32, pr(i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS)))),
            (Ka.maxTextureSize = pr(i.getParameter(i.MAX_TEXTURE_SIZE)))),
            (this._program = pr(Vr(i, eo, Wr(Ka.maxAtlasPages)))),
            this._register(lr(() => i.deleteProgram(this._program))),
            (this._projectionLocation = pr(i.getUniformLocation(this._program, `u_projection`))),
            (this._resolutionLocation = pr(i.getUniformLocation(this._program, `u_resolution`))),
            (this._textureLocation = pr(i.getUniformLocation(this._program, `u_texture`))),
            (this._vertexArrayObject = i.createVertexArray()),
            i.bindVertexArray(this._vertexArrayObject));
          let a = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
            o = i.createBuffer();
          (this._register(lr(() => i.deleteBuffer(o))),
            i.bindBuffer(i.ARRAY_BUFFER, o),
            i.bufferData(i.ARRAY_BUFFER, a, i.STATIC_DRAW),
            i.enableVertexAttribArray(0),
            i.vertexAttribPointer(0, 2, this._gl.FLOAT, !1, 0, 0));
          let s = new Uint8Array([0, 1, 2, 3]),
            c = i.createBuffer();
          (this._register(lr(() => i.deleteBuffer(c))),
            i.bindBuffer(i.ELEMENT_ARRAY_BUFFER, c),
            i.bufferData(i.ELEMENT_ARRAY_BUFFER, s, i.STATIC_DRAW),
            (this._attributesBuffer = pr(i.createBuffer())),
            this._register(lr(() => i.deleteBuffer(this._attributesBuffer))),
            i.bindBuffer(i.ARRAY_BUFFER, this._attributesBuffer),
            i.enableVertexAttribArray(2),
            i.vertexAttribPointer(2, 2, i.FLOAT, !1, no, 0),
            i.vertexAttribDivisor(2, 1),
            i.enableVertexAttribArray(3),
            i.vertexAttribPointer(3, 2, i.FLOAT, !1, no, 2 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(3, 1),
            i.enableVertexAttribArray(4),
            i.vertexAttribPointer(4, 1, i.FLOAT, !1, no, 4 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(4, 1),
            i.enableVertexAttribArray(5),
            i.vertexAttribPointer(5, 2, i.FLOAT, !1, no, 5 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(5, 1),
            i.enableVertexAttribArray(6),
            i.vertexAttribPointer(6, 2, i.FLOAT, !1, no, 7 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(6, 1),
            i.enableVertexAttribArray(1),
            i.vertexAttribPointer(1, 2, i.FLOAT, !1, no, 9 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(1, 1),
            i.useProgram(this._program));
          let l = new Int32Array(Ka.maxAtlasPages);
          for (let e = 0; e < Ka.maxAtlasPages; e++) l[e] = e;
          (i.uniform1iv(this._textureLocation, l),
            i.uniformMatrix4fv(this._projectionLocation, !1, Qa),
            (this._atlasTextures = []));
          for (let e = 0; e < Ka.maxAtlasPages; e++) {
            let t = new $a(pr(i.createTexture()));
            (this._register(lr(() => i.deleteTexture(t.texture))),
              i.activeTexture(i.TEXTURE0 + e),
              i.bindTexture(i.TEXTURE_2D, t.texture),
              i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_S, i.CLAMP_TO_EDGE),
              i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_T, i.CLAMP_TO_EDGE),
              i.texImage2D(
                i.TEXTURE_2D,
                0,
                i.RGBA,
                1,
                1,
                0,
                i.RGBA,
                i.UNSIGNED_BYTE,
                new Uint8Array([255, 0, 0, 255]),
              ),
              (this._atlasTextures[e] = t));
          }
          (i.enable(i.BLEND), i.blendFunc(i.SRC_ALPHA, i.ONE_MINUS_SRC_ALPHA), this.handleResize());
        }
        beginFrame() {
          return this._atlas ? this._atlas.beginFrame() : !0;
        }
        updateCell(e, t, n, r, i, a, o, s, c) {
          this._updateCell(this._vertices.attributes, e, t, n, r, i, a, o, s, c);
        }
        _updateCell(e, t, n, r, i, a, o, s, c, l) {
          if (((L = (n * this._terminal.cols + t) * to), r === 0 || r === void 0)) {
            e.fill(0, L, L + to - 1 - ro);
            return;
          }
          this._atlas &&
            ((R =
              s && s.length > 1
                ? this._atlas.getRasterizedGlyphCombinedChar(s, i, a, o, !1, this._terminal.element)
                : this._atlas.getRasterizedGlyph(r, i, a, o, !1, this._terminal.element)),
            (io = Math.floor(
              (this._dimensions.device.cell.width - this._dimensions.device.char.width) / 2,
            )),
            i !== l && R.offset.x > io
              ? ((ao = R.offset.x - io),
                (e[L] = -(R.offset.x - ao) + this._dimensions.device.char.left),
                (e[L + 1] = -R.offset.y + this._dimensions.device.char.top),
                (e[L + 2] = (R.size.x - ao) / this._dimensions.device.canvas.width),
                (e[L + 3] = R.size.y / this._dimensions.device.canvas.height),
                (e[L + 4] = R.texturePage),
                (e[L + 5] =
                  R.texturePositionClipSpace.x +
                  ao / this._atlas.pages[R.texturePage].canvas.width),
                (e[L + 6] = R.texturePositionClipSpace.y),
                (e[L + 7] = R.sizeClipSpace.x - ao / this._atlas.pages[R.texturePage].canvas.width),
                (e[L + 8] = R.sizeClipSpace.y))
              : ((e[L] = -R.offset.x + this._dimensions.device.char.left),
                (e[L + 1] = -R.offset.y + this._dimensions.device.char.top),
                (e[L + 2] = R.size.x / this._dimensions.device.canvas.width),
                (e[L + 3] = R.size.y / this._dimensions.device.canvas.height),
                (e[L + 4] = R.texturePage),
                (e[L + 5] = R.texturePositionClipSpace.x),
                (e[L + 6] = R.texturePositionClipSpace.y),
                (e[L + 7] = R.sizeClipSpace.x),
                (e[L + 8] = R.sizeClipSpace.y)),
            this._optionsService.rawOptions.rescaleOverlappingGlyphs &&
              yr(r, c, R.size.x, this._dimensions.device.cell.width) &&
              (e[L + 2] =
                (this._dimensions.device.cell.width - 1) / this._dimensions.device.canvas.width));
        }
        clear() {
          let e = this._terminal,
            t = e.cols * e.rows * to;
          this._vertices.count === t
            ? this._vertices.attributes.fill(0)
            : (this._vertices.attributes = new Float32Array(t));
          let n = 0;
          for (; n < this._vertices.attributesBuffers.length; n++)
            this._vertices.count === t
              ? this._vertices.attributesBuffers[n].fill(0)
              : (this._vertices.attributesBuffers[n] = new Float32Array(t));
          ((this._vertices.count = t), (n = 0));
          for (let t = 0; t < e.rows; t++)
            for (let r = 0; r < e.cols; r++)
              ((this._vertices.attributes[n + 9] = r / e.cols),
                (this._vertices.attributes[n + 10] = t / e.rows),
                (n += to));
        }
        handleResize() {
          let e = this._gl;
          (e.useProgram(this._program),
            e.viewport(0, 0, e.canvas.width, e.canvas.height),
            e.uniform2f(this._resolutionLocation, e.canvas.width, e.canvas.height),
            this.clear());
        }
        render(e) {
          if (!this._atlas) return;
          let t = this._gl;
          (t.useProgram(this._program),
            t.bindVertexArray(this._vertexArrayObject),
            (this._activeBuffer = (this._activeBuffer + 1) % 2));
          let n = this._vertices.attributesBuffers[this._activeBuffer],
            r = 0;
          for (let t = 0; t < e.lineLengths.length; t++) {
            let i = t * this._terminal.cols * to,
              a = this._vertices.attributes.subarray(i, i + e.lineLengths[t] * to);
            (n.set(a, r), (r += a.length));
          }
          (t.bindBuffer(t.ARRAY_BUFFER, this._attributesBuffer),
            t.bufferData(t.ARRAY_BUFFER, n.subarray(0, r), t.STREAM_DRAW));
          for (let e = 0; e < this._atlas.pages.length; e++)
            this._atlas.pages[e].version !== this._atlasTextures[e].version &&
              this._bindAtlasPageTexture(t, this._atlas, e);
          t.drawElementsInstanced(t.TRIANGLE_STRIP, 4, t.UNSIGNED_BYTE, 0, r / to);
        }
        setAtlas(e) {
          this._atlas = e;
          for (let e of this._atlasTextures) e.version = -1;
        }
        _bindAtlasPageTexture(e, t, n) {
          (e.activeTexture(e.TEXTURE0 + n),
            e.bindTexture(e.TEXTURE_2D, this._atlasTextures[n].texture),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE),
            e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE),
            e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, t.pages[n].canvas),
            e.generateMipmap(e.TEXTURE_2D),
            (this._atlasTextures[n].version = t.pages[n].version));
        }
        setDimensions(e) {
          this._dimensions = e;
        }
      }),
      (so = class {
        constructor() {
          this.clear();
        }
        clear() {
          ((this.hasSelection = !1),
            (this.columnSelectMode = !1),
            (this.viewportStartRow = 0),
            (this.viewportEndRow = 0),
            (this.viewportCappedStartRow = 0),
            (this.viewportCappedEndRow = 0),
            (this.startCol = 0),
            (this.endCol = 0),
            (this.selectionStart = void 0),
            (this.selectionEnd = void 0));
        }
        update(e, t, n, r = !1) {
          if (
            ((this.selectionStart = t),
            (this.selectionEnd = n),
            !t || !n || (t[0] === n[0] && t[1] === n[1]))
          ) {
            this.clear();
            return;
          }
          let i = e.buffers.active.ydisp,
            a = t[1] - i,
            o = n[1] - i,
            s = Math.max(a, 0),
            c = Math.min(o, e.rows - 1);
          if (s >= e.rows || c < 0) {
            this.clear();
            return;
          }
          ((this.hasSelection = !0),
            (this.columnSelectMode = r),
            (this.viewportStartRow = a),
            (this.viewportEndRow = o),
            (this.viewportCappedStartRow = s),
            (this.viewportCappedEndRow = c),
            (this.startCol = t[0]),
            (this.endCol = n[0]));
        }
        isCellSelected(e, t, n) {
          return this.hasSelection
            ? ((n -= e.buffer.active.viewportY),
              this.columnSelectMode
                ? this.startCol <= this.endCol
                  ? t >= this.startCol &&
                    n >= this.viewportCappedStartRow &&
                    t < this.endCol &&
                    n <= this.viewportCappedEndRow
                  : t < this.startCol &&
                    n >= this.viewportCappedStartRow &&
                    t >= this.endCol &&
                    n <= this.viewportCappedEndRow
                : (n > this.viewportStartRow && n < this.viewportEndRow) ||
                  (this.viewportStartRow === this.viewportEndRow &&
                    n === this.viewportStartRow &&
                    t >= this.startCol &&
                    t < this.endCol) ||
                  (this.viewportStartRow < this.viewportEndRow &&
                    n === this.viewportEndRow &&
                    t < this.endCol) ||
                  (this.viewportStartRow < this.viewportEndRow &&
                    n === this.viewportStartRow &&
                    t >= this.startCol))
            : !1;
        }
      }),
      (co = 4),
      (lo = 1),
      (uo = 2),
      (fo = 3),
      (po = 2147483648),
      (mo = class {
        constructor() {
          ((this.cells = new Uint32Array()),
            (this.lineLengths = new Uint32Array()),
            (this.selection = Gr()));
        }
        resize(e, t) {
          let n = e * t * co;
          n !== this.cells.length &&
            ((this.cells = new Uint32Array(n)), (this.lineLengths = new Uint32Array(t)));
        }
        clear() {
          (this.cells.fill(0, 0), this.lineLengths.fill(0, 0));
        }
      }),
      (ho = `#version 300 es
layout (location = 0) in vec2 a_position;
layout (location = 1) in vec2 a_size;
layout (location = 2) in vec4 a_color;
layout (location = 3) in vec2 a_unitquad;

uniform mat4 u_projection;

out vec4 v_color;

void main() {
  vec2 zeroToOne = a_position + (a_unitquad * a_size);
  gl_Position = u_projection * vec4(zeroToOne, 0.0, 1.0);
  v_color = a_color;
}`),
      (go = `#version 300 es
precision lowp float;

in vec4 v_color;

out vec4 outColor;

void main() {
  outColor = v_color;
}`),
      (_o = 8),
      (vo = _o * Float32Array.BYTES_PER_ELEMENT),
      (yo = 20 * _o),
      (bo = class {
        constructor() {
          ((this.attributes = new Float32Array(yo)), (this.count = 0));
        }
      }),
      (xo = 0),
      (So = 0),
      (Co = 0),
      (wo = 0),
      (To = 0),
      (Eo = 0),
      (Do = 0),
      (Oo = class extends Pi {
        constructor(e, t, n, r) {
          (super(),
            (this._terminal = e),
            (this._gl = t),
            (this._dimensions = n),
            (this._themeService = r),
            (this._vertices = new bo()),
            (this._verticesCursor = new bo()));
          let i = this._gl;
          ((this._program = pr(Vr(i, ho, go))),
            this._register(lr(() => i.deleteProgram(this._program))),
            (this._projectionLocation = pr(i.getUniformLocation(this._program, `u_projection`))),
            (this._vertexArrayObject = i.createVertexArray()),
            i.bindVertexArray(this._vertexArrayObject));
          let a = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
            o = i.createBuffer();
          (this._register(lr(() => i.deleteBuffer(o))),
            i.bindBuffer(i.ARRAY_BUFFER, o),
            i.bufferData(i.ARRAY_BUFFER, a, i.STATIC_DRAW),
            i.enableVertexAttribArray(3),
            i.vertexAttribPointer(3, 2, this._gl.FLOAT, !1, 0, 0));
          let s = new Uint8Array([0, 1, 2, 3]),
            c = i.createBuffer();
          (this._register(lr(() => i.deleteBuffer(c))),
            i.bindBuffer(i.ELEMENT_ARRAY_BUFFER, c),
            i.bufferData(i.ELEMENT_ARRAY_BUFFER, s, i.STATIC_DRAW),
            (this._attributesBuffer = pr(i.createBuffer())),
            this._register(lr(() => i.deleteBuffer(this._attributesBuffer))),
            i.bindBuffer(i.ARRAY_BUFFER, this._attributesBuffer),
            i.enableVertexAttribArray(0),
            i.vertexAttribPointer(0, 2, i.FLOAT, !1, vo, 0),
            i.vertexAttribDivisor(0, 1),
            i.enableVertexAttribArray(1),
            i.vertexAttribPointer(1, 2, i.FLOAT, !1, vo, 2 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(1, 1),
            i.enableVertexAttribArray(2),
            i.vertexAttribPointer(2, 4, i.FLOAT, !1, vo, 4 * Float32Array.BYTES_PER_ELEMENT),
            i.vertexAttribDivisor(2, 1),
            this._updateCachedColors(r.colors),
            this._register(
              this._themeService.onChangeColors((e) => {
                (this._updateCachedColors(e), this._updateViewportRectangle());
              }),
            ));
        }
        renderBackgrounds() {
          this._renderVertices(this._vertices);
        }
        renderCursor() {
          this._renderVertices(this._verticesCursor);
        }
        _renderVertices(e) {
          let t = this._gl;
          (t.useProgram(this._program),
            t.bindVertexArray(this._vertexArrayObject),
            t.uniformMatrix4fv(this._projectionLocation, !1, Qa),
            t.bindBuffer(t.ARRAY_BUFFER, this._attributesBuffer),
            t.bufferData(t.ARRAY_BUFFER, e.attributes, t.DYNAMIC_DRAW),
            t.drawElementsInstanced(this._gl.TRIANGLE_STRIP, 4, t.UNSIGNED_BYTE, 0, e.count));
        }
        handleResize() {
          this._updateViewportRectangle();
        }
        setDimensions(e) {
          this._dimensions = e;
        }
        _updateCachedColors(e) {
          ((this._bgFloat = this._colorToFloat32Array(e.background)),
            (this._cursorFloat = this._colorToFloat32Array(e.cursor)));
        }
        _updateViewportRectangle() {
          this._addRectangleFloat(
            this._vertices.attributes,
            0,
            0,
            0,
            this._terminal.cols * this._dimensions.device.cell.width,
            this._terminal.rows * this._dimensions.device.cell.height,
            this._bgFloat,
          );
        }
        updateBackgrounds(e) {
          let t = this._terminal,
            n = this._vertices,
            r = 1,
            i,
            a,
            o,
            s,
            c,
            l,
            u,
            d,
            f,
            p,
            m;
          for (i = 0; i < t.rows; i++) {
            for (o = -1, s = 0, c = 0, l = !1, a = 0; a < t.cols; a++)
              ((u = (i * t.cols + a) * co),
                (d = e.cells[u + lo]),
                (f = e.cells[u + uo]),
                (p = !!(f & 67108864)),
                (d !== s || (f !== c && (l || p))) &&
                  ((s !== 0 || (l && c !== 0)) &&
                    ((m = r++ * _o), this._updateRectangle(n, m, c, s, o, a, i)),
                  (o = a),
                  (s = d),
                  (c = f),
                  (l = p)));
            (s !== 0 || (l && c !== 0)) &&
              ((m = r++ * _o), this._updateRectangle(n, m, c, s, o, t.cols, i));
          }
          n.count = r;
        }
        updateCursor(e) {
          let t = this._verticesCursor,
            n = e.cursor;
          if (!n || n.style === `block`) {
            t.count = 0;
            return;
          }
          let r,
            i = 0;
          ((n.style === `bar` || n.style === `outline`) &&
            ((r = i++ * _o),
            this._addRectangleFloat(
              t.attributes,
              r,
              n.x * this._dimensions.device.cell.width,
              n.y * this._dimensions.device.cell.height,
              n.style === `bar` ? n.dpr * n.cursorWidth : n.dpr,
              this._dimensions.device.cell.height,
              this._cursorFloat,
            )),
            (n.style === `underline` || n.style === `outline`) &&
              ((r = i++ * _o),
              this._addRectangleFloat(
                t.attributes,
                r,
                n.x * this._dimensions.device.cell.width,
                (n.y + 1) * this._dimensions.device.cell.height - n.dpr,
                n.width * this._dimensions.device.cell.width,
                n.dpr,
                this._cursorFloat,
              )),
            n.style === `outline` &&
              ((r = i++ * _o),
              this._addRectangleFloat(
                t.attributes,
                r,
                n.x * this._dimensions.device.cell.width,
                n.y * this._dimensions.device.cell.height,
                n.width * this._dimensions.device.cell.width,
                n.dpr,
                this._cursorFloat,
              ),
              (r = i++ * _o),
              this._addRectangleFloat(
                t.attributes,
                r,
                (n.x + n.width) * this._dimensions.device.cell.width - n.dpr,
                n.y * this._dimensions.device.cell.height,
                n.dpr,
                this._dimensions.device.cell.height,
                this._cursorFloat,
              )),
            (t.count = i));
        }
        _updateRectangle(e, t, n, r, i, a, o) {
          if (n & 67108864)
            switch (n & 50331648) {
              case 16777216:
              case 33554432:
                xo = this._themeService.colors.ansi[n & 255].rgba;
                break;
              case 50331648:
                xo = (n & 16777215) << 8;
                break;
              case 0:
              default:
                xo = this._themeService.colors.foreground.rgba;
            }
          else
            switch (r & 50331648) {
              case 16777216:
              case 33554432:
                xo = this._themeService.colors.ansi[r & 255].rgba;
                break;
              case 50331648:
                xo = (r & 16777215) << 8;
                break;
              case 0:
              default:
                xo = this._themeService.colors.background.rgba;
            }
          (e.attributes.length < t + 4 &&
            (e.attributes = Ur(e.attributes, this._terminal.rows * this._terminal.cols * _o)),
            (So = i * this._dimensions.device.cell.width),
            (Co = o * this._dimensions.device.cell.height),
            (wo = ((xo >> 24) & 255) / 255),
            (To = ((xo >> 16) & 255) / 255),
            (Eo = ((xo >> 8) & 255) / 255),
            (Do = 1),
            this._addRectangle(
              e.attributes,
              t,
              So,
              Co,
              (a - i) * this._dimensions.device.cell.width,
              this._dimensions.device.cell.height,
              wo,
              To,
              Eo,
              Do,
            ));
        }
        _addRectangle(e, t, n, r, i, a, o, s, c, l) {
          ((e[t] = n / this._dimensions.device.canvas.width),
            (e[t + 1] = r / this._dimensions.device.canvas.height),
            (e[t + 2] = i / this._dimensions.device.canvas.width),
            (e[t + 3] = a / this._dimensions.device.canvas.height),
            (e[t + 4] = o),
            (e[t + 5] = s),
            (e[t + 6] = c),
            (e[t + 7] = l));
        }
        _addRectangleFloat(e, t, n, r, i, a, o) {
          ((e[t] = n / this._dimensions.device.canvas.width),
            (e[t + 1] = r / this._dimensions.device.canvas.height),
            (e[t + 2] = i / this._dimensions.device.canvas.width),
            (e[t + 3] = a / this._dimensions.device.canvas.height),
            (e[t + 4] = o[0]),
            (e[t + 5] = o[1]),
            (e[t + 6] = o[2]),
            (e[t + 7] = o[3]));
        }
        _colorToFloat32Array(e) {
          return new Float32Array([
            ((e.rgba >> 24) & 255) / 255,
            ((e.rgba >> 16) & 255) / 255,
            ((e.rgba >> 8) & 255) / 255,
            (e.rgba & 255) / 255,
          ]);
        }
      }),
      (ko = class extends Pi {
        constructor(e, t, n, r, i, a, o, s) {
          (super(),
            (this._container = t),
            (this._alpha = i),
            (this._coreBrowserService = a),
            (this._optionsService = o),
            (this._themeService = s),
            (this._deviceCharWidth = 0),
            (this._deviceCharHeight = 0),
            (this._deviceCellWidth = 0),
            (this._deviceCellHeight = 0),
            (this._deviceCharLeft = 0),
            (this._deviceCharTop = 0),
            (this._canvas = this._coreBrowserService.mainDocument.createElement(`canvas`)),
            this._canvas.classList.add(`xterm-${n}-layer`),
            (this._canvas.style.zIndex = r.toString()),
            this._initCanvas(),
            this._container.appendChild(this._canvas),
            this._register(
              this._themeService.onChangeColors((t) => {
                (this._refreshCharAtlas(e, t), this.reset(e));
              }),
            ),
            this._register(
              lr(() => {
                this._canvas.remove();
              }),
            ));
        }
        _initCanvas() {
          ((this._ctx = pr(this._canvas.getContext(`2d`, { alpha: this._alpha }))),
            this._alpha || this._clearAll());
        }
        handleBlur(e) {}
        handleFocus(e) {}
        handleCursorMove(e) {}
        handleGridChanged(e, t, n) {}
        handleSelectionChanged(e, t, n, r = !1) {}
        _setTransparency(e, t) {
          if (t === this._alpha) return;
          let n = this._canvas;
          ((this._alpha = t),
            (this._canvas = this._canvas.cloneNode()),
            this._initCanvas(),
            this._container.replaceChild(this._canvas, n),
            this._refreshCharAtlas(e, this._themeService.colors),
            this.handleGridChanged(e, 0, e.rows - 1));
        }
        _refreshCharAtlas(e, t) {
          (this._deviceCharWidth <= 0 && this._deviceCharHeight <= 0) ||
            ((this._charAtlas = Lr(
              e,
              this._optionsService.rawOptions,
              t,
              this._deviceCellWidth,
              this._deviceCellHeight,
              this._deviceCharWidth,
              this._deviceCharHeight,
              this._coreBrowserService.dpr,
              2048,
            )),
            this._charAtlas.warmUp());
        }
        resize(e, t) {
          ((this._deviceCellWidth = t.device.cell.width),
            (this._deviceCellHeight = t.device.cell.height),
            (this._deviceCharWidth = t.device.char.width),
            (this._deviceCharHeight = t.device.char.height),
            (this._deviceCharLeft = t.device.char.left),
            (this._deviceCharTop = t.device.char.top),
            (this._canvas.width = t.device.canvas.width),
            (this._canvas.height = t.device.canvas.height),
            (this._canvas.style.width = `${t.css.canvas.width}px`),
            (this._canvas.style.height = `${t.css.canvas.height}px`),
            this._alpha || this._clearAll(),
            this._refreshCharAtlas(e, this._themeService.colors));
        }
        _fillBottomLineAtCells(e, t, n = 1) {
          this._ctx.fillRect(
            e * this._deviceCellWidth,
            (t + 1) * this._deviceCellHeight - this._coreBrowserService.dpr - 1,
            n * this._deviceCellWidth,
            this._coreBrowserService.dpr,
          );
        }
        _clearAll() {
          this._alpha
            ? this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
            : ((this._ctx.fillStyle = this._themeService.colors.background.css),
              this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height));
        }
        _clearCells(e, t, n, r) {
          this._alpha
            ? this._ctx.clearRect(
                e * this._deviceCellWidth,
                t * this._deviceCellHeight,
                n * this._deviceCellWidth,
                r * this._deviceCellHeight,
              )
            : ((this._ctx.fillStyle = this._themeService.colors.background.css),
              this._ctx.fillRect(
                e * this._deviceCellWidth,
                t * this._deviceCellHeight,
                n * this._deviceCellWidth,
                r * this._deviceCellHeight,
              ));
        }
        _fillCharTrueColor(e, t, n, r) {
          ((this._ctx.font = this._getFont(e, !1, !1)),
            (this._ctx.textBaseline = sa),
            this._clipCell(n, r, t.getWidth()),
            this._ctx.fillText(
              t.getChars(),
              n * this._deviceCellWidth + this._deviceCharLeft,
              r * this._deviceCellHeight + this._deviceCharTop + this._deviceCharHeight,
            ));
        }
        _clipCell(e, t, n) {
          (this._ctx.beginPath(),
            this._ctx.rect(
              e * this._deviceCellWidth,
              t * this._deviceCellHeight,
              n * this._deviceCellWidth,
              this._deviceCellHeight,
            ),
            this._ctx.clip());
        }
        _getFont(e, t, n) {
          let r = t ? e.options.fontWeightBold : e.options.fontWeight;
          return `${n ? `italic` : ``} ${r} ${e.options.fontSize * this._coreBrowserService.dpr}px ${e.options.fontFamily}`;
        }
      }),
      (Ao = class extends ko {
        constructor(e, t, n, r, i, a, o) {
          (super(n, e, `link`, t, !0, i, a, o),
            this._register(r.onShowLinkUnderline((e) => this._handleShowLinkUnderline(e))),
            this._register(r.onHideLinkUnderline((e) => this._handleHideLinkUnderline(e))));
        }
        resize(e, t) {
          (super.resize(e, t), (this._state = void 0));
        }
        reset(e) {
          this._clearCurrentLink();
        }
        _clearCurrentLink() {
          if (this._state) {
            this._clearCells(this._state.x1, this._state.y1, this._state.cols - this._state.x1, 1);
            let e = this._state.y2 - this._state.y1 - 1;
            (e > 0 && this._clearCells(0, this._state.y1 + 1, this._state.cols, e),
              this._clearCells(0, this._state.y2, this._state.x2, 1),
              (this._state = void 0));
          }
        }
        _handleShowLinkUnderline(e) {
          if (
            (e.fg === 257
              ? (this._ctx.fillStyle = this._themeService.colors.background.css)
              : e.fg !== void 0 && Ir(e.fg)
                ? (this._ctx.fillStyle = this._themeService.colors.ansi[e.fg].css)
                : (this._ctx.fillStyle = this._themeService.colors.foreground.css),
            e.y1 === e.y2)
          )
            this._fillBottomLineAtCells(e.x1, e.y1, e.x2 - e.x1);
          else {
            this._fillBottomLineAtCells(e.x1, e.y1, e.cols - e.x1);
            for (let t = e.y1 + 1; t < e.y2; t++) this._fillBottomLineAtCells(0, t, e.cols);
            this._fillBottomLineAtCells(0, e.y2, e.x2);
          }
          this._state = e;
        }
        _handleHideLinkUnderline(e) {
          this._clearCurrentLink();
        }
      }),
      (jo = typeof window == `object` ? window : globalThis),
      (Mo = class {
        constructor() {
          ((this.mapWindowIdToZoomLevel = new Map()),
            (this._onDidChangeZoomLevel = new I()),
            (this.onDidChangeZoomLevel = this._onDidChangeZoomLevel.event),
            (this.mapWindowIdToZoomFactor = new Map()),
            (this._onDidChangeFullscreen = new I()),
            (this.onDidChangeFullscreen = this._onDidChangeFullscreen.event),
            (this.mapWindowIdToFullScreen = new Map()));
        }
        getZoomLevel(e) {
          return this.mapWindowIdToZoomLevel.get(this.getWindowId(e)) ?? 0;
        }
        setZoomLevel(e, t) {
          if (this.getZoomLevel(t) === e) return;
          let n = this.getWindowId(t);
          (this.mapWindowIdToZoomLevel.set(n, e), this._onDidChangeZoomLevel.fire(n));
        }
        getZoomFactor(e) {
          return this.mapWindowIdToZoomFactor.get(this.getWindowId(e)) ?? 1;
        }
        setZoomFactor(e, t) {
          this.mapWindowIdToZoomFactor.set(this.getWindowId(t), e);
        }
        setFullscreen(e, t) {
          if (this.isFullscreen(t) === e) return;
          let n = this.getWindowId(t);
          (this.mapWindowIdToFullScreen.set(n, e), this._onDidChangeFullscreen.fire(n));
        }
        isFullscreen(e) {
          return !!this.mapWindowIdToFullScreen.get(this.getWindowId(e));
        }
        getWindowId(e) {
          return e.vscodeWindowId;
        }
      }),
      (Mo.INSTANCE = new Mo()),
      (No = Mo),
      No.INSTANCE.onDidChangeZoomLevel,
      No.INSTANCE.onDidChangeFullscreen,
      (Po = typeof navigator == `object` ? navigator.userAgent : ``),
      Po.indexOf(`Firefox`),
      (Fo = Po.indexOf(`AppleWebKit`) >= 0),
      !(Po.indexOf(`Chrome`) >= 0) && Po.indexOf(`Safari`),
      Po.indexOf(`Electron/`),
      Po.indexOf(`Android`),
      (Io = !1),
      typeof jo.matchMedia == `function`)
    ) {
      let e = jo.matchMedia(
          `(display-mode: standalone) or (display-mode: window-controls-overlay)`,
        ),
        t = jo.matchMedia(`(display-mode: fullscreen)`);
      ((Io = e.matches),
        Kr(jo, e, ({ matches: e }) => {
          (Io && t.matches) || (Io = e);
        }));
    }
    if (
      ((Lo = `en`),
      (Ro = !1),
      (zo = !1),
      (Bo = !1),
      (Vo = Lo),
      (Uo = globalThis),
      typeof Uo.vscode < `u` && typeof Uo.vscode.process < `u`
        ? (Wo = Uo.vscode.process)
        : typeof process < `u` && typeof process?.versions?.node == `string` && (Wo = process),
      (Go = typeof Wo?.versions?.electron == `string` && Wo?.type === `renderer`),
      typeof Wo == `object`)
    ) {
      (Wo.platform,
        Wo.platform,
        (Ro = Wo.platform === `linux`),
        Ro && Wo.env.SNAP && Wo.env.SNAP_REVISION,
        Wo.env.CI || Wo.env.BUILD_ARTIFACTSTAGINGDIRECTORY,
        (Vo = Lo));
      let e = Wo.env.VSCODE_NLS_CONFIG;
      if (e)
        try {
          let t = JSON.parse(e);
          (t.userLocale,
            t.osLocale,
            (Vo = t.resolvedLanguage || Lo),
            t.languagePack?.translationsConfigFile);
        } catch {}
      zo = !0;
    } else
      typeof navigator == `object` && !Go
        ? ((Ho = navigator.userAgent),
          Ho.indexOf(`Windows`),
          Ho.indexOf(`Macintosh`),
          (Ho.indexOf(`Macintosh`) >= 0 || Ho.indexOf(`iPad`) >= 0 || Ho.indexOf(`iPhone`) >= 0) &&
            navigator.maxTouchPoints &&
            navigator.maxTouchPoints,
          (Ro = Ho.indexOf(`Linux`) >= 0),
          Ho?.indexOf(`Mobi`),
          (Bo = !0),
          (Vo = globalThis._VSCODE_NLS_LANGUAGE || Lo),
          navigator.language.toLowerCase())
        : console.error(`Unable to resolve platform.`);
    ((Ko = zo),
      Bo && typeof Uo.importScripts == `function` && Uo.origin,
      (qo = Ho),
      (Jo = Vo),
      ((e) => {
        function t() {
          return Jo;
        }
        e.value = t;
        function n() {
          return Jo.length === 2
            ? Jo === `en`
            : Jo.length >= 3
              ? Jo[0] === `e` && Jo[1] === `n` && Jo[2] === `-`
              : !1;
        }
        e.isDefaultVariant = n;
        function r() {
          return Jo === `en`;
        }
        e.isDefault = r;
      })((Yo ||= {})),
      (Xo = typeof Uo.postMessage == `function` && !Uo.importScripts),
      (() => {
        if (Xo) {
          let e = [];
          Uo.addEventListener(`message`, (t) => {
            if (t.data && t.data.vscodeScheduleAsyncWork)
              for (let n = 0, r = e.length; n < r; n++) {
                let r = e[n];
                if (r.id === t.data.vscodeScheduleAsyncWork) {
                  (e.splice(n, 1), r.callback());
                  return;
                }
              }
          });
          let t = 0;
          return (n) => {
            let r = ++t;
            (e.push({ id: r, callback: n }), Uo.postMessage({ vscodeScheduleAsyncWork: r }, `*`));
          };
        }
        return (e) => setTimeout(e);
      })(),
      (Zo = !!(qo && qo.indexOf(`Chrome`) >= 0)),
      qo && qo.indexOf(`Firefox`),
      !Zo && qo && qo.indexOf(`Safari`),
      qo && qo.indexOf(`Edg/`),
      qo && qo.indexOf(`Android`),
      (Qo = typeof navigator == `object` ? navigator : {}),
      Ko ||
        (document.queryCommandSupported && document.queryCommandSupported(`copy`)) ||
        (Qo && Qo.clipboard && Qo.clipboard.writeText),
      Ko || (Qo && Qo.clipboard && Qo.clipboard.readText),
      Ko || qr() || Qo.keyboard,
      `ontouchstart` in jo || Qo.maxTouchPoints,
      jo.PointerEvent && (`ontouchstart` in jo || navigator.maxTouchPoints),
      ($o = class {
        constructor() {
          ((this._keyCodeToStr = []), (this._strToKeyCode = Object.create(null)));
        }
        define(e, t) {
          ((this._keyCodeToStr[e] = t), (this._strToKeyCode[t.toLowerCase()] = e));
        }
        keyCodeToStr(e) {
          return this._keyCodeToStr[e];
        }
        strToKeyCode(e) {
          return this._strToKeyCode[e.toLowerCase()] || 0;
        }
      }),
      (es = new $o()),
      (ts = new $o()),
      (ns = new $o()),
      Array(230),
      ((e) => {
        function t(e) {
          return es.keyCodeToStr(e);
        }
        e.toString = t;
        function n(e) {
          return es.strToKeyCode(e);
        }
        e.fromString = n;
        function r(e) {
          return ts.keyCodeToStr(e);
        }
        e.toUserSettingsUS = r;
        function i(e) {
          return ns.keyCodeToStr(e);
        }
        e.toUserSettingsGeneral = i;
        function a(e) {
          return ts.strToKeyCode(e) || ns.strToKeyCode(e);
        }
        e.fromUserSettings = a;
        function o(e) {
          if (e >= 98 && e <= 113) return null;
          switch (e) {
            case 16:
              return `Up`;
            case 18:
              return `Down`;
            case 15:
              return `Left`;
            case 17:
              return `Right`;
          }
          return es.keyCodeToStr(e);
        }
        e.toElectronAccelerator = o;
      })((rs ||= {})),
      (is = Object.freeze(function (e, t) {
        let n = setTimeout(e.bind(t), 0);
        return {
          dispose() {
            clearTimeout(n);
          },
        };
      })),
      ((e) => {
        function t(t) {
          return t === e.None || t === e.Cancelled || t instanceof os
            ? !0
            : !t || typeof t != `object`
              ? !1
              : typeof t.isCancellationRequested == `boolean` &&
                typeof t.onCancellationRequested == `function`;
        }
        ((e.isCancellationToken = t),
          (e.None = Object.freeze({
            isCancellationRequested: !1,
            onCancellationRequested: Oa.None,
          })),
          (e.Cancelled = Object.freeze({
            isCancellationRequested: !0,
            onCancellationRequested: is,
          })));
      })((as ||= {})),
      (os = class {
        constructor() {
          ((this._isCancelled = !1), (this._emitter = null));
        }
        cancel() {
          this._isCancelled ||
            ((this._isCancelled = !0),
            this._emitter && (this._emitter.fire(void 0), this.dispose()));
        }
        get isCancellationRequested() {
          return this._isCancelled;
        }
        get onCancellationRequested() {
          return this._isCancelled ? is : ((this._emitter ||= new I()), this._emitter.event);
        }
        dispose() {
          this._emitter &&= (this._emitter.dispose(), null);
        }
      }),
      (function () {
        typeof globalThis.requestIdleCallback != `function` || globalThis.cancelIdleCallback;
      })(),
      ((e) => {
        async function t(e) {
          let t,
            n = await Promise.all(
              e.map((e) =>
                e.then(
                  (e) => e,
                  (e) => {
                    t ||= e;
                  },
                ),
              ),
            );
          if (typeof t < `u`) throw t;
          return n;
        }
        e.settled = t;
        function n(e) {
          return new Promise(async (t, n) => {
            try {
              await e(t, n);
            } catch (e) {
              n(e);
            }
          });
        }
        e.withAsyncBody = n;
      })((ss ||= {})),
      (cs = class e {
        static fromArray(t) {
          return new e((e) => {
            e.emitMany(t);
          });
        }
        static fromPromise(t) {
          return new e(async (e) => {
            e.emitMany(await t);
          });
        }
        static fromPromises(t) {
          return new e(async (e) => {
            await Promise.all(t.map(async (t) => e.emitOne(await t)));
          });
        }
        static merge(t) {
          return new e(async (e) => {
            await Promise.all(
              t.map(async (t) => {
                for await (let n of t) e.emitOne(n);
              }),
            );
          });
        }
        constructor(e, t) {
          ((this._state = 0),
            (this._results = []),
            (this._error = null),
            (this._onReturn = t),
            (this._onStateChanged = new I()),
            queueMicrotask(async () => {
              let t = {
                emitOne: (e) => this.emitOne(e),
                emitMany: (e) => this.emitMany(e),
                reject: (e) => this.reject(e),
              };
              try {
                (await Promise.resolve(e(t)), this.resolve());
              } catch (e) {
                this.reject(e);
              } finally {
                ((t.emitOne = void 0), (t.emitMany = void 0), (t.reject = void 0));
              }
            }));
        }
        [Symbol.asyncIterator]() {
          let e = 0;
          return {
            next: async () => {
              do {
                if (this._state === 2) throw this._error;
                if (e < this._results.length) return { done: !1, value: this._results[e++] };
                if (this._state === 1) return { done: !0, value: void 0 };
                await Oa.toPromise(this._onStateChanged.event);
              } while (!0);
            },
            return: async () => (this._onReturn?.(), { done: !0, value: void 0 }),
          };
        }
        static map(t, n) {
          return new e(async (e) => {
            for await (let r of t) e.emitOne(n(r));
          });
        }
        map(t) {
          return e.map(this, t);
        }
        static filter(t, n) {
          return new e(async (e) => {
            for await (let r of t) n(r) && e.emitOne(r);
          });
        }
        filter(t) {
          return e.filter(this, t);
        }
        static coalesce(t) {
          return e.filter(t, (e) => !!e);
        }
        coalesce() {
          return e.coalesce(this);
        }
        static async toPromise(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return t;
        }
        toPromise() {
          return e.toPromise(this);
        }
        emitOne(e) {
          this._state === 0 && (this._results.push(e), this._onStateChanged.fire());
        }
        emitMany(e) {
          this._state === 0 &&
            ((this._results = this._results.concat(e)), this._onStateChanged.fire());
        }
        resolve() {
          this._state === 0 && ((this._state = 1), this._onStateChanged.fire());
        }
        reject(e) {
          this._state === 0 && ((this._state = 2), (this._error = e), this._onStateChanged.fire());
        }
      }),
      (cs.EMPTY = cs.fromArray([])),
      (ls = class e {
        constructor() {
          ((this._h0 = 1732584193),
            (this._h1 = 4023233417),
            (this._h2 = 2562383102),
            (this._h3 = 271733878),
            (this._h4 = 3285377520),
            (this._buff = new Uint8Array(67)),
            (this._buffDV = new DataView(this._buff.buffer)),
            (this._buffLen = 0),
            (this._totalLen = 0),
            (this._leftoverHighSurrogate = 0),
            (this._finished = !1));
        }
        update(e) {
          let t = e.length;
          if (t === 0) return;
          let n = this._buff,
            r = this._buffLen,
            i = this._leftoverHighSurrogate,
            a,
            o;
          for (i === 0 ? ((a = e.charCodeAt(0)), (o = 0)) : ((a = i), (o = -1), (i = 0)); ; ) {
            let s = a;
            if (Jr(a))
              if (o + 1 < t) {
                let t = e.charCodeAt(o + 1);
                Yr(t) ? (o++, (s = Xr(a, t))) : (s = 65533);
              } else {
                i = a;
                break;
              }
            else Yr(a) && (s = 65533);
            if (((r = this._push(n, r, s)), o++, o < t)) a = e.charCodeAt(o);
            else break;
          }
          ((this._buffLen = r), (this._leftoverHighSurrogate = i));
        }
        _push(e, t, n) {
          return (
            n < 128
              ? (e[t++] = n)
              : n < 2048
                ? ((e[t++] = 192 | ((n & 1984) >>> 6)), (e[t++] = 128 | ((n & 63) >>> 0)))
                : n < 65536
                  ? ((e[t++] = 224 | ((n & 61440) >>> 12)),
                    (e[t++] = 128 | ((n & 4032) >>> 6)),
                    (e[t++] = 128 | ((n & 63) >>> 0)))
                  : ((e[t++] = 240 | ((n & 1835008) >>> 18)),
                    (e[t++] = 128 | ((n & 258048) >>> 12)),
                    (e[t++] = 128 | ((n & 4032) >>> 6)),
                    (e[t++] = 128 | ((n & 63) >>> 0))),
            t >= 64 &&
              (this._step(),
              (t -= 64),
              (this._totalLen += 64),
              (e[0] = e[64]),
              (e[1] = e[65]),
              (e[2] = e[66])),
            t
          );
        }
        digest() {
          return (
            this._finished ||
              ((this._finished = !0),
              this._leftoverHighSurrogate &&
                ((this._leftoverHighSurrogate = 0),
                (this._buffLen = this._push(this._buff, this._buffLen, 65533))),
              (this._totalLen += this._buffLen),
              this._wrapUp()),
            si(this._h0) + si(this._h1) + si(this._h2) + si(this._h3) + si(this._h4)
          );
        }
        _wrapUp() {
          ((this._buff[this._buffLen++] = 128),
            ai(this._buff, this._buffLen),
            this._buffLen > 56 && (this._step(), ai(this._buff)));
          let e = 8 * this._totalLen;
          (this._buffDV.setUint32(56, Math.floor(e / 4294967296), !1),
            this._buffDV.setUint32(60, e % 4294967296, !1),
            this._step());
        }
        _step() {
          let t = e._bigBlock32,
            n = this._buffDV;
          for (let e = 0; e < 64; e += 4) t.setUint32(e, n.getUint32(e, !1), !1);
          for (let e = 64; e < 320; e += 4)
            t.setUint32(
              e,
              ii(
                t.getUint32(e - 12, !1) ^
                  t.getUint32(e - 32, !1) ^
                  t.getUint32(e - 56, !1) ^
                  t.getUint32(e - 64, !1),
                1,
              ),
              !1,
            );
          let r = this._h0,
            i = this._h1,
            a = this._h2,
            o = this._h3,
            s = this._h4,
            c,
            l,
            u;
          for (let e = 0; e < 80; e++)
            (e < 20
              ? ((c = (i & a) | (~i & o)), (l = 1518500249))
              : e < 40
                ? ((c = i ^ a ^ o), (l = 1859775393))
                : e < 60
                  ? ((c = (i & a) | (i & o) | (a & o)), (l = 2400959708))
                  : ((c = i ^ a ^ o), (l = 3395469782)),
              (u = (ii(r, 5) + c + s + l + t.getUint32(e * 4, !1)) & 4294967295),
              (s = o),
              (o = a),
              (a = ii(i, 30)),
              (i = r),
              (r = u));
          ((this._h0 = (this._h0 + r) & 4294967295),
            (this._h1 = (this._h1 + i) & 4294967295),
            (this._h2 = (this._h2 + a) & 4294967295),
            (this._h3 = (this._h3 + o) & 4294967295),
            (this._h4 = (this._h4 + s) & 4294967295));
        }
      }),
      (ls._bigBlock32 = new DataView(new ArrayBuffer(320))),
      ({
        registerWindow: us,
        getWindow: ds,
        getDocument: fs,
        getWindows: ps,
        getWindowsCount: ms,
        getWindowId: hs,
        getWindowById: gs,
        hasWindow: _s,
        onDidRegisterWindow: vs,
        onWillUnregisterWindow: ys,
        onDidUnregisterWindow: bs,
      } = (function () {
        let e = new Map(),
          t = { window: jo, disposables: new Ni() };
        e.set(jo.vscodeWindowId, t);
        let n = new I(),
          r = new I(),
          i = new I();
        function a(n, r) {
          return (typeof n == `number` ? e.get(n) : void 0) ?? (r ? t : void 0);
        }
        return {
          onDidRegisterWindow: n.event,
          onWillUnregisterWindow: i.event,
          onDidUnregisterWindow: r.event,
          registerWindow(t) {
            if (e.has(t.vscodeWindowId)) return Pi.None;
            let a = new Ni(),
              o = { window: t, disposables: a.add(new Ni()) };
            return (
              e.set(t.vscodeWindowId, o),
              a.add(
                lr(() => {
                  (e.delete(t.vscodeWindowId), r.fire(t));
                }),
              ),
              a.add(
                ci(t, Cs.BEFORE_UNLOAD, () => {
                  i.fire(t);
                }),
              ),
              n.fire(o),
              a
            );
          },
          getWindows() {
            return e.values();
          },
          getWindowsCount() {
            return e.size;
          },
          getWindowId(e) {
            return e.vscodeWindowId;
          },
          hasWindow(t) {
            return e.has(t);
          },
          getWindowById: a,
          getWindow(e) {
            let t = e;
            if (t?.ownerDocument?.defaultView) return t.ownerDocument.defaultView.window;
            let n = e;
            return n?.view ? n.view.window : jo;
          },
          getDocument(e) {
            return ds(e).document;
          },
        };
      })()),
      (xs = class {
        constructor(e, t, n, r) {
          ((this._node = e),
            (this._type = t),
            (this._handler = n),
            (this._options = r || !1),
            this._node.addEventListener(this._type, this._handler, this._options));
        }
        dispose() {
          this._handler &&=
            (this._node.removeEventListener(this._type, this._handler, this._options),
            (this._node = null),
            null);
        }
      }),
      (Ss = class e {
        constructor(e, t) {
          ((this.width = e), (this.height = t));
        }
        with(t = this.width, n = this.height) {
          return t !== this.width || n !== this.height ? new e(t, n) : this;
        }
        static is(e) {
          return typeof e == `object` && typeof e.height == `number` && typeof e.width == `number`;
        }
        static lift(t) {
          return t instanceof e ? t : new e(t.width, t.height);
        }
        static equals(e, t) {
          return e === t ? !0 : !e || !t ? !1 : e.width === t.width && e.height === t.height;
        }
      }),
      (Ss.None = new Ss(0, 0)),
      new (class {
        constructor() {
          this.mutationObservers = new Map();
        }
        observe(e, t, n) {
          let r = this.mutationObservers.get(e);
          r || ((r = new Map()), this.mutationObservers.set(e, r));
          let i = Zr(n),
            a = r.get(i);
          if (a) a.users += 1;
          else {
            let o = new I(),
              s = new MutationObserver((e) => o.fire(e));
            s.observe(e, n);
            let c = (a = { users: 1, observer: s, onDidMutate: o.event });
            (t.add(
              lr(() => {
                (--c.users,
                  c.users === 0 &&
                    (o.dispose(),
                    s.disconnect(),
                    r?.delete(i),
                    r?.size === 0 && this.mutationObservers.delete(e)));
              }),
            ),
              r.set(i, a));
          }
          return a.onDidMutate;
        }
      })(),
      (Cs = {
        CLICK: `click`,
        AUXCLICK: `auxclick`,
        DBLCLICK: `dblclick`,
        MOUSE_UP: `mouseup`,
        MOUSE_DOWN: `mousedown`,
        MOUSE_OVER: `mouseover`,
        MOUSE_MOVE: `mousemove`,
        MOUSE_OUT: `mouseout`,
        MOUSE_ENTER: `mouseenter`,
        MOUSE_LEAVE: `mouseleave`,
        MOUSE_WHEEL: `wheel`,
        POINTER_UP: `pointerup`,
        POINTER_DOWN: `pointerdown`,
        POINTER_MOVE: `pointermove`,
        POINTER_LEAVE: `pointerleave`,
        CONTEXT_MENU: `contextmenu`,
        WHEEL: `wheel`,
        KEY_DOWN: `keydown`,
        KEY_PRESS: `keypress`,
        KEY_UP: `keyup`,
        LOAD: `load`,
        BEFORE_UNLOAD: `beforeunload`,
        UNLOAD: `unload`,
        PAGE_SHOW: `pageshow`,
        PAGE_HIDE: `pagehide`,
        PASTE: `paste`,
        ABORT: `abort`,
        ERROR: `error`,
        RESIZE: `resize`,
        SCROLL: `scroll`,
        FULLSCREEN_CHANGE: `fullscreenchange`,
        WK_FULLSCREEN_CHANGE: `webkitfullscreenchange`,
        SELECT: `select`,
        CHANGE: `change`,
        SUBMIT: `submit`,
        RESET: `reset`,
        FOCUS: `focus`,
        FOCUS_IN: `focusin`,
        FOCUS_OUT: `focusout`,
        BLUR: `blur`,
        INPUT: `input`,
        STORAGE: `storage`,
        DRAG_START: `dragstart`,
        DRAG: `drag`,
        DRAG_ENTER: `dragenter`,
        DRAG_LEAVE: `dragleave`,
        DRAG_OVER: `dragover`,
        DROP: `drop`,
        DRAG_END: `dragend`,
        ANIMATION_START: Fo ? `webkitAnimationStart` : `animationstart`,
        ANIMATION_END: Fo ? `webkitAnimationEnd` : `animationend`,
        ANIMATION_ITERATION: Fo ? `webkitAnimationIteration` : `animationiteration`,
      }),
      (ws = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/),
      (ui.SVG = function (e, t, ...n) {
        return li(`http://www.w3.org/2000/svg`, e, t, ...n);
      }),
      (Ts = class extends Pi {
        constructor(e, t, n, r, i, a, o, s, c) {
          (super(),
            (this._terminal = e),
            (this._characterJoinerService = t),
            (this._charSizeService = n),
            (this._coreBrowserService = r),
            (this._coreService = i),
            (this._decorationService = a),
            (this._optionsService = o),
            (this._themeService = s),
            (this._cursorBlinkStateManager = new Fi()),
            (this._charAtlasDisposable = this._register(new Fi())),
            (this._observerDisposable = this._register(new Fi())),
            (this._model = new mo()),
            (this._workCell = new Za()),
            (this._workCell2 = new Za()),
            (this._rectangleRenderer = this._register(new Fi())),
            (this._glyphRenderer = this._register(new Fi())),
            (this._onChangeTextureAtlas = this._register(new I())),
            (this.onChangeTextureAtlas = this._onChangeTextureAtlas.event),
            (this._onAddTextureAtlasCanvas = this._register(new I())),
            (this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event),
            (this._onRemoveTextureAtlasCanvas = this._register(new I())),
            (this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event),
            (this._onRequestRedraw = this._register(new I())),
            (this.onRequestRedraw = this._onRequestRedraw.event),
            (this._onContextLoss = this._register(new I())),
            (this.onContextLoss = this._onContextLoss.event),
            (this._canvas = this._coreBrowserService.mainDocument.createElement(`canvas`)));
          let l = { antialias: !1, depth: !1, preserveDrawingBuffer: c };
          if (((this._gl = this._canvas.getContext(`webgl2`, l)), !this._gl))
            throw Error(`WebGL2 not supported ` + this._gl);
          (this._register(this._themeService.onChangeColors(() => this._handleColorChange())),
            (this._cellColorResolver = new aa(
              this._terminal,
              this._optionsService,
              this._model.selection,
              this._decorationService,
              this._coreBrowserService,
              this._themeService,
            )),
            (this._core = this._terminal._core),
            (this._renderLayers = [
              new Ao(
                this._core.screenElement,
                2,
                this._terminal,
                this._core.linkifier,
                this._coreBrowserService,
                o,
                this._themeService,
              ),
            ]),
            (this.dimensions = xr()),
            (this._devicePixelRatio = this._coreBrowserService.dpr),
            this._updateDimensions(),
            this._updateCursorBlink(),
            this._register(o.onOptionChange(() => this._handleOptionsChanged())),
            (this._deviceMaxTextureSize = this._gl.getParameter(this._gl.MAX_TEXTURE_SIZE)),
            this._register(
              ci(this._canvas, `webglcontextlost`, (e) => {
                (console.log(`webglcontextlost event received`),
                  e.preventDefault(),
                  (this._contextRestorationTimeout = setTimeout(() => {
                    ((this._contextRestorationTimeout = void 0),
                      console.warn(`webgl context not restored; firing onContextLoss`),
                      this._onContextLoss.fire(e));
                  }, 3e3)));
              }),
            ),
            this._register(
              ci(this._canvas, `webglcontextrestored`, (e) => {
                (console.warn(`webglcontextrestored event received`),
                  clearTimeout(this._contextRestorationTimeout),
                  (this._contextRestorationTimeout = void 0),
                  Rr(this._terminal),
                  this._initializeWebGLState(),
                  this._requestRedrawViewport());
              }),
            ),
            (this._observerDisposable.value = zr(
              this._canvas,
              this._coreBrowserService.window,
              (e, t) => this._setCanvasDevicePixelDimensions(e, t),
            )),
            this._register(
              this._coreBrowserService.onWindowChange((e) => {
                this._observerDisposable.value = zr(this._canvas, e, (e, t) =>
                  this._setCanvasDevicePixelDimensions(e, t),
                );
              }),
            ),
            this._core.screenElement.appendChild(this._canvas),
            ([this._rectangleRenderer.value, this._glyphRenderer.value] =
              this._initializeWebGLState()),
            (this._isAttached = this._core.screenElement.isConnected),
            this._register(
              lr(() => {
                for (let e of this._renderLayers) e.dispose();
                (this._canvas.parentElement?.removeChild(this._canvas), Rr(this._terminal));
              }),
            ));
        }
        get textureAtlas() {
          return this._charAtlas?.pages[0].canvas;
        }
        _handleColorChange() {
          (this._refreshCharAtlas(), this._clearModel(!0));
        }
        handleDevicePixelRatioChange() {
          this._devicePixelRatio !== this._coreBrowserService.dpr &&
            ((this._devicePixelRatio = this._coreBrowserService.dpr),
            this.handleResize(this._terminal.cols, this._terminal.rows));
        }
        handleResize(e, t) {
          (this._updateDimensions(), this._model.resize(this._terminal.cols, this._terminal.rows));
          for (let e of this._renderLayers) e.resize(this._terminal, this.dimensions);
          ((this._canvas.width = this.dimensions.device.canvas.width),
            (this._canvas.height = this.dimensions.device.canvas.height),
            (this._canvas.style.width = `${this.dimensions.css.canvas.width}px`),
            (this._canvas.style.height = `${this.dimensions.css.canvas.height}px`),
            (this._core.screenElement.style.width = `${this.dimensions.css.canvas.width}px`),
            (this._core.screenElement.style.height = `${this.dimensions.css.canvas.height}px`),
            this._rectangleRenderer.value?.setDimensions(this.dimensions),
            this._rectangleRenderer.value?.handleResize(),
            this._glyphRenderer.value?.setDimensions(this.dimensions),
            this._glyphRenderer.value?.handleResize(),
            this._refreshCharAtlas(),
            this._clearModel(!1));
        }
        handleCharSizeChanged() {
          this.handleResize(this._terminal.cols, this._terminal.rows);
        }
        handleBlur() {
          for (let e of this._renderLayers) e.handleBlur(this._terminal);
          (this._cursorBlinkStateManager.value?.pause(), this._requestRedrawViewport());
        }
        handleFocus() {
          for (let e of this._renderLayers) e.handleFocus(this._terminal);
          (this._cursorBlinkStateManager.value?.resume(), this._requestRedrawViewport());
        }
        handleSelectionChanged(e, t, n) {
          for (let r of this._renderLayers) r.handleSelectionChanged(this._terminal, e, t, n);
          (this._model.selection.update(this._core, e, t, n), this._requestRedrawViewport());
        }
        handleCursorMove() {
          for (let e of this._renderLayers) e.handleCursorMove(this._terminal);
          this._cursorBlinkStateManager.value?.restartBlinkAnimation();
        }
        _handleOptionsChanged() {
          (this._updateDimensions(), this._refreshCharAtlas(), this._updateCursorBlink());
        }
        _initializeWebGLState() {
          return (
            (this._rectangleRenderer.value = new Oo(
              this._terminal,
              this._gl,
              this.dimensions,
              this._themeService,
            )),
            (this._glyphRenderer.value = new oo(
              this._terminal,
              this._gl,
              this.dimensions,
              this._optionsService,
            )),
            this.handleCharSizeChanged(),
            [this._rectangleRenderer.value, this._glyphRenderer.value]
          );
        }
        _refreshCharAtlas() {
          if (this.dimensions.device.char.width <= 0 && this.dimensions.device.char.height <= 0) {
            this._isAttached = !1;
            return;
          }
          let e = Lr(
            this._terminal,
            this._optionsService.rawOptions,
            this._themeService.colors,
            this.dimensions.device.cell.width,
            this.dimensions.device.cell.height,
            this.dimensions.device.char.width,
            this.dimensions.device.char.height,
            this._coreBrowserService.dpr,
            this._deviceMaxTextureSize,
          );
          (this._charAtlas !== e &&
            (this._onChangeTextureAtlas.fire(e.pages[0].canvas),
            (this._charAtlasDisposable.value = cr(
              Oa.forward(e.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas),
              Oa.forward(e.onRemoveTextureAtlasCanvas, this._onRemoveTextureAtlasCanvas),
            ))),
            (this._charAtlas = e),
            this._charAtlas.warmUp(),
            this._glyphRenderer.value?.setAtlas(this._charAtlas));
        }
        _clearModel(e) {
          (this._model.clear(), e && this._glyphRenderer.value?.clear());
        }
        clearTextureAtlas() {
          (this._charAtlas?.clearTexture(), this._clearModel(!0), this._requestRedrawViewport());
        }
        clear() {
          this._clearModel(!0);
          for (let e of this._renderLayers) e.reset(this._terminal);
          (this._cursorBlinkStateManager.value?.restartBlinkAnimation(), this._updateCursorBlink());
        }
        renderRows(e, t) {
          if (!this._isAttached)
            if (
              this._core.screenElement?.isConnected &&
              this._charSizeService.width &&
              this._charSizeService.height
            )
              (this._updateDimensions(), this._refreshCharAtlas(), (this._isAttached = !0));
            else return;
          for (let n of this._renderLayers) n.handleGridChanged(this._terminal, e, t);
          !this._glyphRenderer.value ||
            !this._rectangleRenderer.value ||
            (this._glyphRenderer.value.beginFrame()
              ? (this._clearModel(!0), this._updateModel(0, this._terminal.rows - 1))
              : this._updateModel(e, t),
            this._rectangleRenderer.value.renderBackgrounds(),
            this._glyphRenderer.value.render(this._model),
            (!this._cursorBlinkStateManager.value ||
              this._cursorBlinkStateManager.value.isCursorVisible) &&
              this._rectangleRenderer.value.renderCursor());
        }
        _updateCursorBlink() {
          ((this._coreService.decPrivateModes.cursorBlink ?? this._terminal.options.cursorBlink)
            ? (this._cursorBlinkStateManager.value = new Xa(() => {
                this._requestRedrawCursor();
              }, this._coreBrowserService))
            : this._cursorBlinkStateManager.clear(),
            this._requestRedrawCursor());
        }
        _updateModel(e, t) {
          let n = this._core,
            r = this._workCell,
            i,
            a,
            o,
            s,
            c,
            l,
            u = 0,
            d = !0,
            f,
            p,
            m,
            h,
            g,
            _,
            v,
            y,
            b;
          ((e = di(e, n.rows - 1, 0)), (t = di(t, n.rows - 1, 0)));
          let x = this._coreService.decPrivateModes.cursorStyle ?? n.options.cursorStyle ?? `block`,
            S = this._terminal.buffer.active.baseY + this._terminal.buffer.active.cursorY,
            C = S - n.buffer.ydisp,
            w = Math.min(this._terminal.buffer.active.cursorX, n.cols - 1),
            T = -1,
            E =
              this._coreService.isCursorInitialized &&
              !this._coreService.isCursorHidden &&
              (!this._cursorBlinkStateManager.value ||
                this._cursorBlinkStateManager.value.isCursorVisible);
          this._model.cursor = void 0;
          let D = !1;
          for (a = e; a <= t; a++)
            for (
              o = a + n.buffer.ydisp,
                s = n.buffer.lines.get(o),
                this._model.lineLengths[a] = 0,
                m = S === o,
                u = 0,
                c = this._characterJoinerService.getJoinedCharacters(o),
                y = 0;
              y < n.cols;
              y++
            ) {
              if (
                ((i = this._cellColorResolver.result.bg),
                s.loadCell(y, r),
                y === 0 && (i = this._cellColorResolver.result.bg),
                (l = !1),
                (d = y >= u),
                (f = y),
                c.length > 0 && y === c[0][0] && d)
              ) {
                p = c.shift();
                let e = this._model.selection.isCellSelected(this._terminal, p[0], o);
                for (v = p[0] + 1; v < p[1]; v++)
                  d &&= e === this._model.selection.isCellSelected(this._terminal, v, o);
                ((d &&= !m || w < p[0] || w >= p[1]),
                  d
                    ? ((l = !0),
                      (r = new Es(r, s.translateToString(!0, p[0], p[1]), p[1] - p[0])),
                      (f = p[1] - 1))
                    : (u = p[1]));
              }
              if (
                ((h = r.getChars()),
                (g = r.getCode()),
                (v = (a * n.cols + y) * co),
                this._cellColorResolver.resolve(r, y, o, this.dimensions.device.cell.width),
                E &&
                  o === S &&
                  (y === w &&
                    ((this._model.cursor = {
                      x: w,
                      y: C,
                      width: r.getWidth(),
                      style: this._coreBrowserService.isFocused ? x : n.options.cursorInactiveStyle,
                      cursorWidth: n.options.cursorWidth,
                      dpr: this._devicePixelRatio,
                    }),
                    (T = w + r.getWidth() - 1)),
                  y >= w &&
                    y <= T &&
                    ((this._coreBrowserService.isFocused && x === `block`) ||
                      (this._coreBrowserService.isFocused === !1 &&
                        n.options.cursorInactiveStyle === `block`)) &&
                    ((this._cellColorResolver.result.fg =
                      50331648 | ((this._themeService.colors.cursorAccent.rgba >> 8) & 16777215)),
                    (this._cellColorResolver.result.bg =
                      50331648 | ((this._themeService.colors.cursor.rgba >> 8) & 16777215)))),
                g !== 0 && (this._model.lineLengths[a] = y + 1),
                !(
                  this._model.cells[v] === g &&
                  this._model.cells[v + lo] === this._cellColorResolver.result.bg &&
                  this._model.cells[v + uo] === this._cellColorResolver.result.fg &&
                  this._model.cells[v + fo] === this._cellColorResolver.result.ext
                ) &&
                  ((D = !0),
                  h.length > 1 && (g |= po),
                  (this._model.cells[v] = g),
                  (this._model.cells[v + lo] = this._cellColorResolver.result.bg),
                  (this._model.cells[v + uo] = this._cellColorResolver.result.fg),
                  (this._model.cells[v + fo] = this._cellColorResolver.result.ext),
                  (_ = r.getWidth()),
                  this._glyphRenderer.value.updateCell(
                    y,
                    a,
                    g,
                    this._cellColorResolver.result.bg,
                    this._cellColorResolver.result.fg,
                    this._cellColorResolver.result.ext,
                    h,
                    _,
                    i,
                  ),
                  l))
              ) {
                for (r = this._workCell, y++; y <= f; y++)
                  ((b = (a * n.cols + y) * co),
                    this._glyphRenderer.value.updateCell(y, a, 0, 0, 0, 0, Hi, 0, 0),
                    (this._model.cells[b] = 0),
                    (this._model.cells[b + lo] = this._cellColorResolver.result.bg),
                    (this._model.cells[b + uo] = this._cellColorResolver.result.fg),
                    (this._model.cells[b + fo] = this._cellColorResolver.result.ext));
                y--;
              }
            }
          (D && this._rectangleRenderer.value.updateBackgrounds(this._model),
            this._rectangleRenderer.value.updateCursor(this._model));
        }
        _updateDimensions() {
          !this._charSizeService.width ||
            !this._charSizeService.height ||
            ((this.dimensions.device.char.width = Math.floor(
              this._charSizeService.width * this._devicePixelRatio,
            )),
            (this.dimensions.device.char.height = Math.ceil(
              this._charSizeService.height * this._devicePixelRatio,
            )),
            (this.dimensions.device.cell.height = Math.floor(
              this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight,
            )),
            (this.dimensions.device.char.top =
              this._optionsService.rawOptions.lineHeight === 1
                ? 0
                : Math.round(
                    (this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2,
                  )),
            (this.dimensions.device.cell.width =
              this.dimensions.device.char.width +
              Math.round(this._optionsService.rawOptions.letterSpacing)),
            (this.dimensions.device.char.left = Math.floor(
              this._optionsService.rawOptions.letterSpacing / 2,
            )),
            (this.dimensions.device.canvas.height =
              this._terminal.rows * this.dimensions.device.cell.height),
            (this.dimensions.device.canvas.width =
              this._terminal.cols * this.dimensions.device.cell.width),
            (this.dimensions.css.canvas.height = Math.round(
              this.dimensions.device.canvas.height / this._devicePixelRatio,
            )),
            (this.dimensions.css.canvas.width = Math.round(
              this.dimensions.device.canvas.width / this._devicePixelRatio,
            )),
            (this.dimensions.css.cell.height =
              this.dimensions.device.cell.height / this._devicePixelRatio),
            (this.dimensions.css.cell.width =
              this.dimensions.device.cell.width / this._devicePixelRatio));
        }
        _setCanvasDevicePixelDimensions(e, t) {
          (this._canvas.width === e && this._canvas.height === t) ||
            ((this._canvas.width = e), (this._canvas.height = t), this._requestRedrawViewport());
        }
        _requestRedrawViewport() {
          this._onRequestRedraw.fire({ start: 0, end: this._terminal.rows - 1 });
        }
        _requestRedrawCursor() {
          let e = this._terminal.buffer.active.cursorY;
          this._onRequestRedraw.fire({ start: e, end: e });
        }
      }),
      (Es = class extends ba {
        constructor(e, t, n) {
          (super(),
            (this.content = 0),
            (this.combinedData = ``),
            (this.fg = e.fg),
            (this.bg = e.bg),
            (this.combinedData = t),
            (this._width = n));
        }
        isCombined() {
          return 2097152;
        }
        getWidth() {
          return this._width;
        }
        getChars() {
          return this.combinedData;
        }
        getCode() {
          return 2097151;
        }
        setFromCharData(e) {
          throw Error(`not implemented`);
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }),
      (Ds = `di$target`),
      (Os = `di$dependencies`),
      (ks = new Map()),
      fi(`BufferService`),
      fi(`CoreMouseService`),
      fi(`CoreService`),
      fi(`CharsetService`),
      fi(`InstantiationService`),
      fi(`LogService`),
      (As = fi(`OptionsService`)),
      fi(`OscLinkService`),
      fi(`UnicodeService`),
      fi(`DecorationService`),
      (js = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, off: 5 }),
      (Ms = `xterm.js: `),
      (Ns = class extends Pi {
        constructor(e) {
          (super(),
            (this._optionsService = e),
            (this._logLevel = 5),
            this._updateLogLevel(),
            this._register(
              this._optionsService.onSpecificOptionChange(`logLevel`, () => this._updateLogLevel()),
            ));
        }
        get logLevel() {
          return this._logLevel;
        }
        _updateLogLevel() {
          this._logLevel = js[this._optionsService.rawOptions.logLevel];
        }
        _evalLazyOptionalParams(e) {
          for (let t = 0; t < e.length; t++) typeof e[t] == `function` && (e[t] = e[t]());
        }
        _log(e, t, n) {
          (this._evalLazyOptionalParams(n),
            e.call(console, (this._optionsService.options.logger ? `` : Ms) + t, ...n));
        }
        trace(e, ...t) {
          this._logLevel <= 0 &&
            this._log(
              this._optionsService.options.logger?.trace.bind(
                this._optionsService.options.logger,
              ) ?? console.log,
              e,
              t,
            );
        }
        debug(e, ...t) {
          this._logLevel <= 1 &&
            this._log(
              this._optionsService.options.logger?.debug.bind(
                this._optionsService.options.logger,
              ) ?? console.log,
              e,
              t,
            );
        }
        info(e, ...t) {
          this._logLevel <= 2 &&
            this._log(
              this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ??
                console.info,
              e,
              t,
            );
        }
        warn(e, ...t) {
          this._logLevel <= 3 &&
            this._log(
              this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ??
                console.warn,
              e,
              t,
            );
        }
        error(e, ...t) {
          this._logLevel <= 4 &&
            this._log(
              this._optionsService.options.logger?.error.bind(
                this._optionsService.options.logger,
              ) ?? console.error,
              e,
              t,
            );
        }
      }),
      (Ns = gi([_i(0, As)], Ns)),
      (Ps = class extends Pi {
        constructor(e) {
          if (
            Vi &&
            ur() < 16 &&
            !document
              .createElement(`canvas`)
              .getContext(`webgl2`, { antialias: !1, depth: !1, preserveDrawingBuffer: !0 })
          )
            throw Error(`Webgl2 is only supported on Safari 16 and above`);
          (super(),
            (this._preserveDrawingBuffer = e),
            (this._onChangeTextureAtlas = this._register(new I())),
            (this.onChangeTextureAtlas = this._onChangeTextureAtlas.event),
            (this._onAddTextureAtlasCanvas = this._register(new I())),
            (this.onAddTextureAtlasCanvas = this._onAddTextureAtlasCanvas.event),
            (this._onRemoveTextureAtlasCanvas = this._register(new I())),
            (this.onRemoveTextureAtlasCanvas = this._onRemoveTextureAtlasCanvas.event),
            (this._onContextLoss = this._register(new I())),
            (this.onContextLoss = this._onContextLoss.event));
        }
        activate(e) {
          let t = e._core;
          if (!e.element) {
            this._register(t.onWillOpen(() => this.activate(e)));
            return;
          }
          this._terminal = e;
          let n = t.coreService,
            r = t.optionsService,
            i = t,
            a = i._renderService,
            o = i._characterJoinerService,
            s = i._charSizeService,
            c = i._coreBrowserService,
            l = i._decorationService;
          i._logService;
          let u = i._themeService;
          ((this._renderer = this._register(
            new Ts(e, o, s, c, n, l, r, u, this._preserveDrawingBuffer),
          )),
            this._register(Oa.forward(this._renderer.onContextLoss, this._onContextLoss)),
            this._register(
              Oa.forward(this._renderer.onChangeTextureAtlas, this._onChangeTextureAtlas),
            ),
            this._register(
              Oa.forward(this._renderer.onAddTextureAtlasCanvas, this._onAddTextureAtlasCanvas),
            ),
            this._register(
              Oa.forward(
                this._renderer.onRemoveTextureAtlasCanvas,
                this._onRemoveTextureAtlasCanvas,
              ),
            ),
            a.setRenderer(this._renderer),
            this._register(
              lr(() => {
                if (this._terminal._core._store._isDisposed) return;
                let t = this._terminal._core._renderService;
                (t.setRenderer(this._terminal._core._createRenderer()),
                  t.handleResize(e.cols, e.rows));
              }),
            ));
        }
        get textureAtlas() {
          return this._renderer?.textureAtlas;
        }
        clearTextureAtlas() {
          this._renderer?.clearTextureAtlas();
        }
      }));
  });
function Is(e) {
  return e.replace(/\r?\n/g, `\r`);
}
function Ls(e, t) {
  return t ? `\x1B[200~` + e + `\x1B[201~` : e;
}
function Rs(e, t) {
  (e.clipboardData && e.clipboardData.setData(`text/plain`, t.selectionText), e.preventDefault());
}
function zs(e, t, n, r) {
  (e.stopPropagation(), e.clipboardData && Bs(e.clipboardData.getData(`text/plain`), t, n, r));
}
function Bs(e, t, n, r) {
  ((e = Is(e)),
    (e = Ls(
      e,
      n.decPrivateModes.bracketedPasteMode && r.rawOptions.ignoreBracketedPasteMode !== !0,
    )),
    n.triggerDataEvent(e, !0),
    (t.value = ``));
}
function Vs(e, t, n) {
  let r = n.getBoundingClientRect(),
    i = e.clientX - r.left - 10,
    a = e.clientY - r.top - 10;
  ((t.style.width = `20px`),
    (t.style.height = `20px`),
    (t.style.left = `${i}px`),
    (t.style.top = `${a}px`),
    (t.style.zIndex = `1000`),
    t.focus());
}
function Hs(e, t, n, r, i) {
  (Vs(e, t, n), i && r.rightClickSelect(e), (t.value = r.selectionText), t.select());
}
function Us(e) {
  return e > 65535
    ? ((e -= 65536),
      String.fromCharCode((e >> 10) + 55296) + String.fromCharCode((e % 1024) + 56320))
    : String.fromCharCode(e);
}
function Ws(e, t = 0, n = e.length) {
  let r = ``;
  for (let i = t; i < n; ++i) {
    let t = e[i];
    t > 65535
      ? ((t -= 65536),
        (r += String.fromCharCode((t >> 10) + 55296) + String.fromCharCode((t % 1024) + 56320)))
      : (r += String.fromCharCode(t));
  }
  return r;
}
function Gs(e) {
  return e[Jl] || [];
}
function Ks(e) {
  if (Yl.has(e)) return Yl.get(e);
  let t = function (e, n, r) {
    if (arguments.length !== 3)
      throw Error(`@IServiceName-decorator can only be used to decorate a parameter`);
    qs(t, e, r);
  };
  return ((t._id = e), Yl.set(e, t), t);
}
function qs(e, t, n) {
  t[ql] === t ? t[Jl].push({ id: e, index: n }) : ((t[Jl] = [{ id: e, index: n }]), (t[ql] = t));
}
function Js(e, t) {
  if (
    confirm(`Do you want to navigate to ${t}?

WARNING: This link could potentially be dangerous`)
  ) {
    let e = window.open();
    if (e) {
      try {
        e.opener = null;
      } catch {}
      e.location.href = t;
    } else console.warn(`Opening link blocked as opener could not be cleared`);
  }
}
function Ys(e) {
  Xs(e) || gu.onUnexpectedError(e);
}
function Xs(e) {
  return e instanceof vu ? !0 : e instanceof Error && e.name === _u && e.message === _u;
}
function Zs(e) {
  return e ? Error(`Illegal argument: ${e}`) : Error(`Illegal argument`);
}
function Qs(e, t, n = 0, r = e.length) {
  let i = n,
    a = r;
  for (; i < a; ) {
    let n = Math.floor((i + a) / 2);
    t(e[n]) ? (i = n + 1) : (a = n);
  }
  return i - 1;
}
function $s(e, t = 0) {
  return e[e.length - (1 + t)];
}
function ec(e, t) {
  return (n, r) => t(e(n), e(r));
}
function tc(e, t) {
  let n = Object.create(null);
  for (let r of e) {
    let e = t(r),
      i = n[e];
    ((i ||= n[e] = []), i.push(r));
  }
  return n;
}
function nc(e, t) {
  let n = this,
    r = !1,
    i;
  return function () {
    if (r) return i;
    if (((r = !0), t))
      try {
        i = e.apply(n, arguments);
      } finally {
        t();
      }
    else i = e.apply(n, arguments);
    return i;
  };
}
function rc(e) {
  Ou = e;
}
function ic(e) {
  return (Ou?.trackDisposable(e), e);
}
function ac(e) {
  Ou?.markAsDisposed(e);
}
function oc(e, t) {
  Ou?.setParent(e, t);
}
function sc(e, t) {
  if (Ou) for (let n of e) Ou.setParent(n, t);
}
function cc(e) {
  return (Ou?.markAsSingleton(e), e);
}
function lc(e) {
  if (Eu.is(e)) {
    let t = [];
    for (let n of e)
      if (n)
        try {
          n.dispose();
        } catch (e) {
          t.push(e);
        }
    if (t.length === 1) throw t[0];
    if (t.length > 1) throw AggregateError(t, `Encountered errors while disposing of store`);
    return Array.isArray(e) ? [] : e;
  } else if (e) return (e.dispose(), e);
}
function uc(...e) {
  let t = z(() => lc(e));
  return (sc(e, t), t);
}
function z(e) {
  let t = ic({
    dispose: nc(() => {
      (ac(t), e());
    }),
  });
  return t;
}
function dc(e, t, n) {
  (typeof t == `string` && (t = e.matchMedia(t)), t.addEventListener(`change`, n));
}
function fc(e) {
  return rd.INSTANCE.getZoomFactor(e);
}
function pc() {
  return ld;
}
function mc(e) {
  if (e.charCode) {
    let t = String.fromCharCode(e.charCode).toUpperCase();
    return Id.fromString(t);
  }
  let t = e.keyCode;
  if (t === 3) return 7;
  if (ad)
    switch (t) {
      case 59:
        return 85;
      case 60:
        if (Cd) return 97;
        break;
      case 61:
        return 86;
      case 107:
        return 109;
      case 109:
        return 111;
      case 173:
        return 88;
      case 224:
        if (Sd) return 57;
        break;
    }
  else if (od && ((Sd && t === 93) || (!Sd && t === 92))) return 57;
  return Fd[t] || 0;
}
function hc(e) {
  if (!e.parent || e.parent === e) return null;
  try {
    let t = e.location,
      n = e.parent.location;
    if (t.origin !== `null` && n.origin !== `null` && t.origin !== n.origin) return null;
  } catch {
    return null;
  }
  return e.parent;
}
function gc(e) {
  return 55296 <= e && e <= 56319;
}
function _c(e) {
  return 56320 <= e && e <= 57343;
}
function vc(e, t) {
  return ((e - 55296) << 10) + (t - 56320) + 65536;
}
function yc(e) {
  return bc(e, 0);
}
function bc(e, t) {
  switch (typeof e) {
    case `object`:
      return e === null ? xc(349, t) : Array.isArray(e) ? wc(e, t) : Tc(e, t);
    case `string`:
      return Cc(e, t);
    case `boolean`:
      return Sc(e, t);
    case `number`:
      return xc(e, t);
    case `undefined`:
      return xc(937, t);
    default:
      return xc(617, t);
  }
}
function xc(e, t) {
  return ((t << 5) - t + e) | 0;
}
function Sc(e, t) {
  return xc(e ? 433 : 863, t);
}
function Cc(e, t) {
  t = xc(149417, t);
  for (let n = 0, r = e.length; n < r; n++) t = xc(e.charCodeAt(n), t);
  return t;
}
function wc(e, t) {
  return ((t = xc(104579, t)), e.reduce((e, t) => bc(t, e), t));
}
function Tc(e, t) {
  return (
    (t = xc(181387, t)),
    Object.keys(e)
      .sort()
      .reduce((t, n) => ((t = Cc(n, t)), bc(e[n], t)), t)
  );
}
function Ec(e, t, n = 32) {
  let r = n - t,
    i = ~((1 << r) - 1);
  return ((e << t) | ((i & e) >>> r)) >>> 0;
}
function Dc(e, t = 0, n = e.byteLength, r = 0) {
  for (let i = 0; i < n; i++) e[t + i] = r;
}
function Oc(e, t, n = `0`) {
  for (; e.length < t; ) e = n + e;
  return e;
}
function kc(e, t = 32) {
  return e instanceof ArrayBuffer
    ? Array.from(new Uint8Array(e))
        .map((e) => e.toString(16).padStart(2, `0`))
        .join(``)
    : Oc((e >>> 0).toString(16), t / 4);
}
function B(e, t, n, r) {
  return new mf(e, t, n, r);
}
function Ac(e, t) {
  return function (n) {
    return t(new Kd(e, n));
  };
}
function jc(e) {
  return function (t) {
    return e(new Ud(t));
  };
}
function Mc(e) {
  let t = e.getBoundingClientRect(),
    n = rf(e);
  return { left: t.left + n.scrollX, top: t.top + n.scrollY, width: t.width, height: t.height };
}
function Nc(e, t, n, ...r) {
  let i = xf.exec(t);
  if (!i) throw Error(`Bad use of emmet`);
  let a = i[1] || `div`,
    o;
  return (
    (o =
      e === `http://www.w3.org/1999/xhtml`
        ? document.createElement(a)
        : document.createElementNS(e, a)),
    i[3] && (o.id = i[3]),
    i[4] && (o.className = i[4].replace(/\./g, ` `).trim()),
    n &&
      Object.entries(n).forEach(([e, t]) => {
        typeof t > `u` ||
          (/^on\w+$/.test(e)
            ? (o[e] = t)
            : e === `selected`
              ? t && o.setAttribute(e, `true`)
              : o.setAttribute(e, t));
      }),
    o.append(...r),
    o
  );
}
function Pc(e, t, ...n) {
  return Nc(`http://www.w3.org/1999/xhtml`, e, t, ...n);
}
function Fc(e) {
  return typeof e == `number` ? `${e}px` : e;
}
function Ic(e) {
  return new Sf(e);
}
function Lc(e, t, n) {
  let r = null,
    i = null;
  if (
    (typeof n.value == `function`
      ? ((r = `value`),
        (i = n.value),
        i.length !== 0 &&
          console.warn(`Memoize should only be used in functions with zero parameters`))
      : typeof n.get == `function` && ((r = `get`), (i = n.get)),
    !i)
  )
    throw Error(`not supported`);
  let a = `$memoize$${t}`;
  n[r] = function (...e) {
    return (
      this.hasOwnProperty(a) ||
        Object.defineProperty(this, a, {
          configurable: !1,
          enumerable: !1,
          writable: !1,
          value: i.apply(this, e),
        }),
      this[a]
    );
  };
}
function Rc(e, t) {
  let n = t - e;
  return function (t) {
    return e + n * Vc(t);
  };
}
function zc(e, t, n) {
  return function (r) {
    return r < n ? e(r / n) : t((r - n) / (1 - n));
  };
}
function Bc(e) {
  return e ** 3;
}
function Vc(e) {
  return 1 - Bc(1 - e);
}
function Hc(e) {
  let t = {
    lazyRender: typeof e.lazyRender < `u` ? e.lazyRender : !1,
    className: typeof e.className < `u` ? e.className : ``,
    useShadows: typeof e.useShadows < `u` ? e.useShadows : !0,
    handleMouseWheel: typeof e.handleMouseWheel < `u` ? e.handleMouseWheel : !0,
    flipAxes: typeof e.flipAxes < `u` ? e.flipAxes : !1,
    consumeMouseWheelIfScrollbarIsNeeded:
      typeof e.consumeMouseWheelIfScrollbarIsNeeded < `u`
        ? e.consumeMouseWheelIfScrollbarIsNeeded
        : !1,
    alwaysConsumeMouseWheel:
      typeof e.alwaysConsumeMouseWheel < `u` ? e.alwaysConsumeMouseWheel : !1,
    scrollYToX: typeof e.scrollYToX < `u` ? e.scrollYToX : !1,
    mouseWheelScrollSensitivity:
      typeof e.mouseWheelScrollSensitivity < `u` ? e.mouseWheelScrollSensitivity : 1,
    fastScrollSensitivity: typeof e.fastScrollSensitivity < `u` ? e.fastScrollSensitivity : 5,
    scrollPredominantAxis: typeof e.scrollPredominantAxis < `u` ? e.scrollPredominantAxis : !0,
    mouseWheelSmoothScroll: typeof e.mouseWheelSmoothScroll < `u` ? e.mouseWheelSmoothScroll : !0,
    arrowSize: typeof e.arrowSize < `u` ? e.arrowSize : 11,
    listenOnDomNode: typeof e.listenOnDomNode < `u` ? e.listenOnDomNode : null,
    horizontal: typeof e.horizontal < `u` ? e.horizontal : 1,
    horizontalScrollbarSize:
      typeof e.horizontalScrollbarSize < `u` ? e.horizontalScrollbarSize : 10,
    horizontalSliderSize: typeof e.horizontalSliderSize < `u` ? e.horizontalSliderSize : 0,
    horizontalHasArrows: typeof e.horizontalHasArrows < `u` ? e.horizontalHasArrows : !1,
    vertical: typeof e.vertical < `u` ? e.vertical : 1,
    verticalScrollbarSize: typeof e.verticalScrollbarSize < `u` ? e.verticalScrollbarSize : 10,
    verticalHasArrows: typeof e.verticalHasArrows < `u` ? e.verticalHasArrows : !1,
    verticalSliderSize: typeof e.verticalSliderSize < `u` ? e.verticalSliderSize : 0,
    scrollByPage: typeof e.scrollByPage < `u` ? e.scrollByPage : !1,
  };
  return (
    (t.horizontalSliderSize =
      typeof e.horizontalSliderSize < `u` ? e.horizontalSliderSize : t.horizontalScrollbarSize),
    (t.verticalSliderSize =
      typeof e.verticalSliderSize < `u` ? e.verticalSliderSize : t.verticalScrollbarSize),
    Sd && (t.className += ` mac`),
    t
  );
}
function Uc(e) {
  let t = e.toString(16);
  return t.length < 2 ? `0` + t : t;
}
function Wc(e, t) {
  return e < t ? (t + 0.05) / (e + 0.05) : (e + 0.05) / (t + 0.05);
}
function Gc(e) {
  return 57508 <= e && e <= 57558;
}
function Kc(e) {
  return 9472 <= e && e <= 9631;
}
function qc(e) {
  return Gc(e) || Kc(e);
}
function Jc() {
  return {
    css: { canvas: Yc(), cell: Yc() },
    device: { canvas: Yc(), cell: Yc(), char: { width: 0, height: 0, left: 0, top: 0 } },
  };
}
function Yc() {
  return { width: 0, height: 0 };
}
function Xc(e, t, n) {
  for (; e.length < n; ) e = t + e;
  return e;
}
function Zc() {
  return new hp();
}
function Qc(e, t, n) {
  let r = n.getBoundingClientRect(),
    i = e.getComputedStyle(n),
    a = parseInt(i.getPropertyValue(`padding-left`)),
    o = parseInt(i.getPropertyValue(`padding-top`));
  return [t.clientX - r.left - a, t.clientY - r.top - o];
}
function $c(e, t, n, r, i, a, o, s, c) {
  if (!a) return;
  let l = Qc(e, t, n);
  if (l)
    return (
      (l[0] = Math.ceil((l[0] + (c ? o / 2 : 0)) / o)),
      (l[1] = Math.ceil(l[1] / s)),
      (l[0] = Math.min(Math.max(l[0], 1), r + (c ? 1 : 0))),
      (l[1] = Math.min(Math.max(l[1], 1), i)),
      l
    );
}
function el() {
  if (!zp) return 0;
  let e = Fp.match(/Version\/(\d+)/);
  return e === null || e.length < 2 ? 0 : parseInt(e[1]);
}
function tl(e, t, n, r) {
  let i = n.buffer.x,
    a = n.buffer.y;
  if (!n.buffer.hasScrollback) return il(i, a, e, t, n, r) + al(a, t, n, r) + ol(i, a, e, t, n, r);
  let o;
  if (a === t) return ((o = i > e ? `D` : `C`), pl(Math.abs(i - e), fl(o, r)));
  o = a > t ? `D` : `C`;
  let s = Math.abs(a - t);
  return pl(rl(a > t ? e : i, n) + (s - 1) * n.cols + 1 + nl(a > t ? i : e, n), fl(o, r));
}
function nl(e, t) {
  return e - 1;
}
function rl(e, t) {
  return t.cols - e;
}
function il(e, t, n, r, i, a) {
  return al(t, r, i, a).length === 0 ? `` : pl(dl(e, t, e, t - cl(t, i), !1, i).length, fl(`D`, a));
}
function al(e, t, n, r) {
  let i = e - cl(e, n),
    a = t - cl(t, n);
  return pl(Math.abs(i - a) - sl(e, t, n), fl(ul(e, t), r));
}
function ol(e, t, n, r, i, a) {
  let o;
  o = al(t, r, i, a).length > 0 ? r - cl(r, i) : t;
  let s = r,
    c = ll(e, t, n, r, i, a);
  return pl(dl(e, o, n, s, c === `C`, i).length, fl(c, a));
}
function sl(e, t, n) {
  let r = 0,
    i = e - cl(e, n),
    a = t - cl(t, n);
  for (let o = 0; o < Math.abs(i - a); o++) {
    let a = ul(e, t) === `A` ? -1 : 1;
    n.buffer.lines.get(i + a * o)?.isWrapped && r++;
  }
  return r;
}
function cl(e, t) {
  let n = 0,
    r = t.buffer.lines.get(e),
    i = r?.isWrapped;
  for (; i && e >= 0 && e < t.rows; ) (n++, (r = t.buffer.lines.get(--e)), (i = r?.isWrapped));
  return n;
}
function ll(e, t, n, r, i, a) {
  let o;
  return (
    (o = al(n, r, i, a).length > 0 ? r - cl(r, i) : t),
    (e < n && o <= r) || (e >= n && o < r) ? `C` : `D`
  );
}
function ul(e, t) {
  return e > t ? `A` : `B`;
}
function dl(e, t, n, r, i, a) {
  let o = e,
    s = t,
    c = ``;
  for (; (o !== n || s !== r) && s >= 0 && s < a.buffer.lines.length; )
    ((o += i ? 1 : -1),
      i && o > a.cols - 1
        ? ((c += a.buffer.translateBufferLineToString(s, !1, e, o)), (o = 0), (e = 0), s++)
        : !i &&
          o < 0 &&
          ((c += a.buffer.translateBufferLineToString(s, !1, 0, e + 1)),
          (o = a.cols - 1),
          (e = o),
          s--));
  return c + a.buffer.translateBufferLineToString(s, !1, e, o);
}
function fl(e, t) {
  let n = t ? `O` : `[`;
  return q.ESC + n + e;
}
function pl(e, t) {
  e = Math.floor(e);
  let n = ``;
  for (let r = 0; r < e; r++) n += t;
  return n;
}
function ml(e, t) {
  if (e.start.y > e.end.y)
    throw Error(
      `Buffer range end (${e.end.x}, ${e.end.y}) cannot be before start (${e.start.x}, ${e.start.y})`,
    );
  return t * (e.end.y - e.start.y) + (e.end.x - e.start.x + 1);
}
function V(e, t) {
  if (e !== void 0)
    try {
      return X.toColor(e);
    } catch {}
  return t;
}
function hl(e, t, n, r, i, a) {
  let o = [];
  for (let s = 0; s < e.length - 1; s++) {
    let c = s,
      l = e.get(++c);
    if (!l.isWrapped) continue;
    let u = [e.get(s)];
    for (; c < e.length && l.isWrapped; ) (u.push(l), (l = e.get(++c)));
    if (!a && r >= s && r < c) {
      s += u.length - 1;
      continue;
    }
    let d = 0,
      f = yl(u, d, t),
      p = 1,
      m = 0;
    for (; p < u.length; ) {
      let e = yl(u, p, t),
        r = e - m,
        a = n - f,
        o = Math.min(r, a);
      (u[d].copyCellsFrom(u[p], m, f, o, !1),
        (f += o),
        f === n && (d++, (f = 0)),
        (m += o),
        m === e && (p++, (m = 0)),
        f === 0 &&
          d !== 0 &&
          u[d - 1].getWidth(n - 1) === 2 &&
          (u[d].copyCellsFrom(u[d - 1], n - 1, f++, 1, !1), u[d - 1].setCell(n - 1, i)));
    }
    u[d].replaceCells(f, n, i);
    let h = 0;
    for (let e = u.length - 1; e > 0 && (e > d || u[e].getTrimmedLength() === 0); e--) h++;
    (h > 0 && (o.push(s + u.length - h), o.push(h)), (s += u.length - 1));
  }
  return o;
}
function gl(e, t) {
  let n = [],
    r = 0,
    i = t[r],
    a = 0;
  for (let o = 0; o < e.length; o++)
    if (i === o) {
      let n = t[++r];
      (e.onDeleteEmitter.fire({ index: o - a, amount: n }), (o += n - 1), (a += n), (i = t[++r]));
    } else n.push(o);
  return { layout: n, countRemoved: a };
}
function _l(e, t) {
  let n = [];
  for (let r = 0; r < t.length; r++) n.push(e.get(t[r]));
  for (let t = 0; t < n.length; t++) e.set(t, n[t]);
  e.length = t.length;
}
function vl(e, t, n) {
  let r = [],
    i = e.map((n, r) => yl(e, r, t)).reduce((e, t) => e + t),
    a = 0,
    o = 0,
    s = 0;
  for (; s < i; ) {
    if (i - s < n) {
      r.push(i - s);
      break;
    }
    a += n;
    let c = yl(e, o, t);
    a > c && ((a -= c), o++);
    let l = e[o].getWidth(a - 1) === 2;
    l && a--;
    let u = l ? n - 1 : n;
    (r.push(u), (s += u));
  }
  return r;
}
function yl(e, t, n) {
  if (t === e.length - 1) return e[t].getTrimmedLength();
  let r = !e[t].hasContent(n - 1) && e[t].getWidth(n - 1) === 1,
    i = e[t + 1].getWidth(0) === 2;
  return r && i ? n - 1 : n;
}
function bl(e) {
  return e === `block` || e === `underline` || e === `bar`;
}
function xl(e, t = 5) {
  if (typeof e != `object`) return e;
  let n = Array.isArray(e) ? [] : {};
  for (let r in e) n[r] = t <= 1 ? e[r] : e[r] && xl(e[r], t - 1);
  return n;
}
function Sl(e, t) {
  let n = (e.ctrl ? 16 : 0) | (e.shift ? 4 : 0) | (e.alt ? 8 : 0);
  return (
    e.button === 4
      ? ((n |= 64), (n |= e.action))
      : ((n |= e.button & 3),
        e.button & 4 && (n |= 64),
        e.button & 8 && (n |= 128),
        e.action === 32 ? (n |= 32) : e.action === 0 && !t && (n |= 3)),
    n
  );
}
function Cl(e, t) {
  let n = 0,
    r = t.length - 1,
    i;
  if (e < t[0][0] || e > t[r][1]) return !1;
  for (; r >= n; )
    if (((i = (n + r) >> 1), e > t[i][1])) n = i + 1;
    else if (e < t[i][0]) r = i - 1;
    else return !0;
  return !1;
}
function wl(e) {
  let t = e.buffer.lines.get(e.buffer.ybase + e.buffer.y - 1)?.get(e.cols - 1),
    n = e.buffer.lines.get(e.buffer.ybase + e.buffer.y);
  n && t && (n.isWrapped = t[3] !== 0 && t[3] !== 32);
}
function Tl(e) {
  if (!e) return;
  let t = e.toLowerCase();
  if (t.indexOf(`rgb:`) === 0) {
    t = t.slice(4);
    let e = fh.exec(t);
    if (e) {
      let t = e[1] ? 15 : e[4] ? 255 : e[7] ? 4095 : 65535;
      return [
        Math.round((parseInt(e[1] || e[4] || e[7] || e[10], 16) / t) * 255),
        Math.round((parseInt(e[2] || e[5] || e[8] || e[11], 16) / t) * 255),
        Math.round((parseInt(e[3] || e[6] || e[9] || e[12], 16) / t) * 255),
      ];
    }
  } else if (
    t.indexOf(`#`) === 0 &&
    ((t = t.slice(1)), ph.exec(t) && [3, 6, 9, 12].includes(t.length))
  ) {
    let e = t.length / 3,
      n = [0, 0, 0];
    for (let r = 0; r < 3; ++r) {
      let i = parseInt(t.slice(e * r, e * r + e), 16);
      n[r] = e === 1 ? i << 4 : e === 2 ? i : e === 3 ? i >> 4 : i >> 8;
    }
    return n;
  }
}
function El(e, t) {
  let n = e.toString(16),
    r = n.length < 2 ? `0` + n : n;
  switch (t) {
    case 4:
      return n[0];
    case 8:
      return r;
    case 12:
      return (r + r).slice(0, 3);
    default:
      return r + r;
  }
}
function Dl(e, t = 16) {
  let [n, r, i] = e;
  return `rgb:${El(n, t)}/${El(r, t)}/${El(i, t)}`;
}
function Ol(e, t) {
  if (e > 24) return t.setWinLines || !1;
  switch (e) {
    case 1:
      return !!t.restoreWin;
    case 2:
      return !!t.minimizeWin;
    case 3:
      return !!t.setWinPosition;
    case 4:
      return !!t.setWinSizePixels;
    case 5:
      return !!t.raiseWin;
    case 6:
      return !!t.lowerWin;
    case 7:
      return !!t.refreshWin;
    case 8:
      return !!t.setWinSizeChars;
    case 9:
      return !!t.maximizeWin;
    case 10:
      return !!t.fullscreenWin;
    case 11:
      return !!t.getWinState;
    case 13:
      return !!t.getWinPosition;
    case 14:
      return !!t.getWinSizePixels;
    case 15:
      return !!t.getScreenSizePixels;
    case 16:
      return !!t.getCellSizePixels;
    case 18:
      return !!t.getWinSizeChars;
    case 19:
      return !!t.getScreenSizeChars;
    case 20:
      return !!t.getIconTitle;
    case 21:
      return !!t.getWinTitle;
    case 22:
      return !!t.pushTitle;
    case 23:
      return !!t.popTitle;
    case 24:
      return !!t.setWinLines;
  }
  return !1;
}
function kl(e) {
  return 0 <= e && e < 256;
}
function Al(e, t, n, r) {
  let i = { type: 0, cancel: !1, key: void 0 },
    a = (e.shiftKey ? 1 : 0) | (e.altKey ? 2 : 0) | (e.ctrlKey ? 4 : 0) | (e.metaKey ? 8 : 0);
  switch (e.keyCode) {
    case 0:
      e.key === `UIKeyInputUpArrow`
        ? t
          ? (i.key = q.ESC + `OA`)
          : (i.key = q.ESC + `[A`)
        : e.key === `UIKeyInputLeftArrow`
          ? t
            ? (i.key = q.ESC + `OD`)
            : (i.key = q.ESC + `[D`)
          : e.key === `UIKeyInputRightArrow`
            ? t
              ? (i.key = q.ESC + `OC`)
              : (i.key = q.ESC + `[C`)
            : e.key === `UIKeyInputDownArrow` &&
              (t ? (i.key = q.ESC + `OB`) : (i.key = q.ESC + `[B`));
      break;
    case 8:
      ((i.key = e.ctrlKey ? `\b` : q.DEL), e.altKey && (i.key = q.ESC + i.key));
      break;
    case 9:
      if (e.shiftKey) {
        i.key = q.ESC + `[Z`;
        break;
      }
      ((i.key = q.HT), (i.cancel = !0));
      break;
    case 13:
      ((i.key = e.altKey ? q.ESC + q.CR : q.CR), (i.cancel = !0));
      break;
    case 27:
      ((i.key = q.ESC), e.altKey && (i.key = q.ESC + q.ESC), (i.cancel = !0));
      break;
    case 37:
      if (e.metaKey) break;
      a
        ? (i.key = q.ESC + `[1;` + (a + 1) + `D`)
        : t
          ? (i.key = q.ESC + `OD`)
          : (i.key = q.ESC + `[D`);
      break;
    case 39:
      if (e.metaKey) break;
      a
        ? (i.key = q.ESC + `[1;` + (a + 1) + `C`)
        : t
          ? (i.key = q.ESC + `OC`)
          : (i.key = q.ESC + `[C`);
      break;
    case 38:
      if (e.metaKey) break;
      a
        ? (i.key = q.ESC + `[1;` + (a + 1) + `A`)
        : t
          ? (i.key = q.ESC + `OA`)
          : (i.key = q.ESC + `[A`);
      break;
    case 40:
      if (e.metaKey) break;
      a
        ? (i.key = q.ESC + `[1;` + (a + 1) + `B`)
        : t
          ? (i.key = q.ESC + `OB`)
          : (i.key = q.ESC + `[B`);
      break;
    case 45:
      !e.shiftKey && !e.ctrlKey && (i.key = q.ESC + `[2~`);
      break;
    case 46:
      a ? (i.key = q.ESC + `[3;` + (a + 1) + `~`) : (i.key = q.ESC + `[3~`);
      break;
    case 36:
      a
        ? (i.key = q.ESC + `[1;` + (a + 1) + `H`)
        : t
          ? (i.key = q.ESC + `OH`)
          : (i.key = q.ESC + `[H`);
      break;
    case 35:
      a
        ? (i.key = q.ESC + `[1;` + (a + 1) + `F`)
        : t
          ? (i.key = q.ESC + `OF`)
          : (i.key = q.ESC + `[F`);
      break;
    case 33:
      e.shiftKey
        ? (i.type = 2)
        : e.ctrlKey
          ? (i.key = q.ESC + `[5;` + (a + 1) + `~`)
          : (i.key = q.ESC + `[5~`);
      break;
    case 34:
      e.shiftKey
        ? (i.type = 3)
        : e.ctrlKey
          ? (i.key = q.ESC + `[6;` + (a + 1) + `~`)
          : (i.key = q.ESC + `[6~`);
      break;
    case 112:
      a ? (i.key = q.ESC + `[1;` + (a + 1) + `P`) : (i.key = q.ESC + `OP`);
      break;
    case 113:
      a ? (i.key = q.ESC + `[1;` + (a + 1) + `Q`) : (i.key = q.ESC + `OQ`);
      break;
    case 114:
      a ? (i.key = q.ESC + `[1;` + (a + 1) + `R`) : (i.key = q.ESC + `OR`);
      break;
    case 115:
      a ? (i.key = q.ESC + `[1;` + (a + 1) + `S`) : (i.key = q.ESC + `OS`);
      break;
    case 116:
      a ? (i.key = q.ESC + `[15;` + (a + 1) + `~`) : (i.key = q.ESC + `[15~`);
      break;
    case 117:
      a ? (i.key = q.ESC + `[17;` + (a + 1) + `~`) : (i.key = q.ESC + `[17~`);
      break;
    case 118:
      a ? (i.key = q.ESC + `[18;` + (a + 1) + `~`) : (i.key = q.ESC + `[18~`);
      break;
    case 119:
      a ? (i.key = q.ESC + `[19;` + (a + 1) + `~`) : (i.key = q.ESC + `[19~`);
      break;
    case 120:
      a ? (i.key = q.ESC + `[20;` + (a + 1) + `~`) : (i.key = q.ESC + `[20~`);
      break;
    case 121:
      a ? (i.key = q.ESC + `[21;` + (a + 1) + `~`) : (i.key = q.ESC + `[21~`);
      break;
    case 122:
      a ? (i.key = q.ESC + `[23;` + (a + 1) + `~`) : (i.key = q.ESC + `[23~`);
      break;
    case 123:
      a ? (i.key = q.ESC + `[24;` + (a + 1) + `~`) : (i.key = q.ESC + `[24~`);
      break;
    default:
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey)
        e.keyCode >= 65 && e.keyCode <= 90
          ? (i.key = String.fromCharCode(e.keyCode - 64))
          : e.keyCode === 32
            ? (i.key = q.NUL)
            : e.keyCode >= 51 && e.keyCode <= 55
              ? (i.key = String.fromCharCode(e.keyCode - 51 + 27))
              : e.keyCode === 56
                ? (i.key = q.DEL)
                : e.keyCode === 219
                  ? (i.key = q.ESC)
                  : e.keyCode === 220
                    ? (i.key = q.FS)
                    : e.keyCode === 221 && (i.key = q.GS);
      else if ((!n || r) && e.altKey && !e.metaKey) {
        let t = Oh[e.keyCode]?.[e.shiftKey ? 1 : 0];
        if (t) i.key = q.ESC + t;
        else if (e.keyCode >= 65 && e.keyCode <= 90) {
          let t = e.ctrlKey ? e.keyCode - 64 : e.keyCode + 32,
            n = String.fromCharCode(t);
          (e.shiftKey && (n = n.toUpperCase()), (i.key = q.ESC + n));
        } else if (e.keyCode === 32) i.key = q.ESC + (e.ctrlKey ? q.NUL : ` `);
        else if (e.key === `Dead` && e.code.startsWith(`Key`)) {
          let t = e.code.slice(3, 4);
          (e.shiftKey || (t = t.toLowerCase()), (i.key = q.ESC + t), (i.cancel = !0));
        }
      } else
        n && !e.altKey && !e.ctrlKey && !e.shiftKey && e.metaKey
          ? e.keyCode === 65 && (i.type = 1)
          : e.key && !e.ctrlKey && !e.altKey && !e.metaKey && e.keyCode >= 48 && e.key.length === 1
            ? (i.key = e.key)
            : e.key &&
              e.ctrlKey &&
              (e.key === `_` && (i.key = q.US), e.key === `@` && (i.key = q.NUL));
      break;
  }
  return i;
}
function jl(e, t) {
  return (
    e.text === t.text &&
    e.range.start.x === t.range.start.x &&
    e.range.start.y === t.range.start.y &&
    e.range.end.x === t.range.end.x &&
    e.range.end.y === t.range.end.y
  );
}
function Ml(e) {
  return e.keyCode === 16 || e.keyCode === 17 || e.keyCode === 18;
}
var Nl,
  Pl,
  Fl,
  H,
  U,
  Il,
  Ll,
  Rl,
  zl,
  Bl,
  Vl,
  Hl,
  Ul,
  Wl,
  Gl,
  Kl,
  ql,
  Jl,
  Yl,
  Xl,
  Zl,
  Ql,
  $l,
  eu,
  tu,
  nu,
  ru,
  iu,
  au,
  ou,
  su,
  cu,
  lu,
  uu,
  du,
  fu,
  pu,
  mu,
  hu,
  gu,
  _u,
  vu,
  yu,
  bu,
  xu,
  Su,
  Cu,
  wu,
  Tu,
  Eu,
  Du,
  Ou,
  ku,
  Au,
  ju,
  W,
  Mu,
  Nu,
  Pu,
  G,
  Fu,
  Iu,
  Lu,
  Ru,
  zu,
  Bu,
  Vu,
  Hu,
  Uu,
  Wu,
  Gu,
  Ku,
  qu,
  Ju,
  Yu,
  Xu,
  Zu,
  Qu,
  $u,
  ed,
  K,
  td,
  nd,
  rd,
  id,
  ad,
  od,
  sd,
  cd,
  ld,
  ud,
  dd,
  fd,
  pd,
  md,
  hd,
  gd,
  _d,
  vd,
  yd,
  bd,
  xd,
  Sd,
  Cd,
  wd,
  Td,
  Ed,
  Dd,
  Od,
  kd,
  Ad,
  jd,
  Md,
  Nd,
  Pd,
  Fd,
  Id,
  Ld,
  Rd,
  zd,
  Bd,
  Vd,
  Hd,
  Ud,
  Wd,
  Gd,
  Kd,
  qd,
  Jd,
  Yd,
  Xd,
  Zd,
  Qd,
  $d,
  ef,
  tf,
  nf,
  rf,
  af,
  of,
  sf,
  cf,
  lf,
  uf,
  df,
  ff,
  pf,
  mf,
  hf,
  gf,
  _f,
  vf,
  yf,
  bf,
  xf,
  Sf,
  Cf,
  wf,
  Tf,
  Ef,
  Df,
  Of,
  kf,
  Af,
  jf,
  Mf,
  Nf,
  Pf,
  Ff,
  If,
  Lf,
  Rf,
  zf,
  Bf,
  Vf,
  Hf,
  Uf,
  Wf,
  Gf,
  Kf,
  qf,
  Jf,
  Yf,
  Xf,
  Zf,
  Qf,
  $f,
  ep,
  q,
  tp,
  np,
  rp,
  ip,
  ap,
  op,
  J,
  sp,
  cp,
  Y,
  X,
  lp,
  up,
  dp,
  fp,
  pp,
  mp,
  hp,
  gp,
  _p,
  vp,
  yp,
  bp,
  xp,
  Sp,
  Cp,
  wp,
  Tp,
  Ep,
  Dp,
  Op,
  kp,
  Ap,
  jp,
  Mp,
  Np,
  Pp,
  Fp,
  Ip,
  Lp,
  Rp,
  zp,
  Bp,
  Vp,
  Hp,
  Up,
  Wp,
  Gp,
  Kp,
  qp,
  Jp,
  Yp,
  Xp,
  Zp,
  Qp,
  $p,
  em,
  tm,
  nm,
  rm,
  im,
  am,
  om,
  sm,
  cm,
  lm,
  um,
  dm,
  fm,
  pm,
  mm,
  hm,
  gm,
  _m,
  vm,
  ym,
  bm,
  xm,
  Z,
  Sm,
  Cm,
  wm,
  Tm,
  Em,
  Dm,
  Om,
  km,
  Am,
  jm,
  Mm,
  Nm,
  Pm,
  Fm,
  Im,
  Lm,
  Rm,
  zm,
  Bm,
  Vm,
  Hm,
  Um,
  Wm,
  Gm,
  Km,
  qm,
  Jm,
  Ym,
  Xm,
  Zm,
  Qm,
  $m,
  eh,
  th,
  nh,
  rh,
  ih,
  ah,
  oh,
  sh,
  ch,
  lh,
  uh,
  dh,
  fh,
  ph,
  mh,
  hh,
  gh,
  _h,
  vh,
  yh,
  bh,
  xh,
  Sh,
  Ch,
  wh,
  Th,
  Eh,
  Dh,
  Oh,
  Q,
  kh,
  Ah,
  jh,
  Mh,
  Nh,
  Ph,
  Fh,
  Ih,
  Lh,
  Rh,
  zh,
  Bh,
  Vh,
  Hh,
  Uh,
  Wh,
  Gh,
  Kh,
  qh,
  Jh,
  Yh,
  Xh = t(() => {
    if (
      ((Nl = Object.defineProperty),
      (Pl = Object.getOwnPropertyDescriptor),
      (Fl = (e, t) => {
        for (var n in t) Nl(e, n, { get: t[n], enumerable: !0 });
      }),
      (H = (e, t, n, r) => {
        for (var i = r > 1 ? void 0 : r ? Pl(t, n) : t, a = e.length - 1, o; a >= 0; a--)
          (o = e[a]) && (i = (r ? o(t, n, i) : o(i)) || i);
        return (r && i && Nl(t, n, i), i);
      }),
      (U = (e, t) => (n, r) => t(n, r, e)),
      (Il = `Terminal input`),
      (Ll = { get: () => Il, set: (e) => (Il = e) }),
      (Rl = `Too much output to announce, navigate to rows manually to read`),
      (zl = { get: () => Rl, set: (e) => (Rl = e) }),
      (Bl = class {
        constructor() {
          this._interim = 0;
        }
        clear() {
          this._interim = 0;
        }
        decode(e, t) {
          let n = e.length;
          if (!n) return 0;
          let r = 0,
            i = 0;
          if (this._interim) {
            let n = e.charCodeAt(i++);
            (56320 <= n && n <= 57343
              ? (t[r++] = (this._interim - 55296) * 1024 + n - 56320 + 65536)
              : ((t[r++] = this._interim), (t[r++] = n)),
              (this._interim = 0));
          }
          for (let a = i; a < n; ++a) {
            let i = e.charCodeAt(a);
            if (55296 <= i && i <= 56319) {
              if (++a >= n) return ((this._interim = i), r);
              let o = e.charCodeAt(a);
              56320 <= o && o <= 57343
                ? (t[r++] = (i - 55296) * 1024 + o - 56320 + 65536)
                : ((t[r++] = i), (t[r++] = o));
              continue;
            }
            i !== 65279 && (t[r++] = i);
          }
          return r;
        }
      }),
      (Vl = class {
        constructor() {
          this.interim = new Uint8Array(3);
        }
        clear() {
          this.interim.fill(0);
        }
        decode(e, t) {
          let n = e.length;
          if (!n) return 0;
          let r = 0,
            i,
            a,
            o,
            s,
            c = 0,
            l = 0;
          if (this.interim[0]) {
            let i = !1,
              a = this.interim[0];
            a &= (a & 224) == 192 ? 31 : (a & 240) == 224 ? 15 : 7;
            let o = 0,
              s;
            for (; (s = this.interim[++o] & 63) && o < 4; ) ((a <<= 6), (a |= s));
            let c = (this.interim[0] & 224) == 192 ? 2 : (this.interim[0] & 240) == 224 ? 3 : 4,
              u = c - o;
            for (; l < u; ) {
              if (l >= n) return 0;
              if (((s = e[l++]), (s & 192) != 128)) {
                (l--, (i = !0));
                break;
              } else ((this.interim[o++] = s), (a <<= 6), (a |= s & 63));
            }
            (i ||
              (c === 2
                ? a < 128
                  ? l--
                  : (t[r++] = a)
                : c === 3
                  ? a < 2048 || (a >= 55296 && a <= 57343) || a === 65279 || (t[r++] = a)
                  : a < 65536 || a > 1114111 || (t[r++] = a)),
              this.interim.fill(0));
          }
          let u = n - 4,
            d = l;
          for (; d < n; ) {
            for (
              ;
              d < u &&
              !((i = e[d]) & 128) &&
              !((a = e[d + 1]) & 128) &&
              !((o = e[d + 2]) & 128) &&
              !((s = e[d + 3]) & 128);
            )
              ((t[r++] = i), (t[r++] = a), (t[r++] = o), (t[r++] = s), (d += 4));
            if (((i = e[d++]), i < 128)) t[r++] = i;
            else if ((i & 224) == 192) {
              if (d >= n) return ((this.interim[0] = i), r);
              if (((a = e[d++]), (a & 192) != 128)) {
                d--;
                continue;
              }
              if (((c = ((i & 31) << 6) | (a & 63)), c < 128)) {
                d--;
                continue;
              }
              t[r++] = c;
            } else if ((i & 240) == 224) {
              if (d >= n) return ((this.interim[0] = i), r);
              if (((a = e[d++]), (a & 192) != 128)) {
                d--;
                continue;
              }
              if (d >= n) return ((this.interim[0] = i), (this.interim[1] = a), r);
              if (((o = e[d++]), (o & 192) != 128)) {
                d--;
                continue;
              }
              if (
                ((c = ((i & 15) << 12) | ((a & 63) << 6) | (o & 63)),
                c < 2048 || (c >= 55296 && c <= 57343) || c === 65279)
              )
                continue;
              t[r++] = c;
            } else if ((i & 248) == 240) {
              if (d >= n) return ((this.interim[0] = i), r);
              if (((a = e[d++]), (a & 192) != 128)) {
                d--;
                continue;
              }
              if (d >= n) return ((this.interim[0] = i), (this.interim[1] = a), r);
              if (((o = e[d++]), (o & 192) != 128)) {
                d--;
                continue;
              }
              if (d >= n)
                return ((this.interim[0] = i), (this.interim[1] = a), (this.interim[2] = o), r);
              if (((s = e[d++]), (s & 192) != 128)) {
                d--;
                continue;
              }
              if (
                ((c = ((i & 7) << 18) | ((a & 63) << 12) | ((o & 63) << 6) | (s & 63)),
                c < 65536 || c > 1114111)
              )
                continue;
              t[r++] = c;
            }
          }
          return r;
        }
      }),
      (Hl = ``),
      (Ul = ` `),
      (Wl = class e {
        constructor() {
          ((this.fg = 0), (this.bg = 0), (this.extended = new Gl()));
        }
        static toColorRGB(e) {
          return [(e >>> 16) & 255, (e >>> 8) & 255, e & 255];
        }
        static fromColorRGB(e) {
          return ((e[0] & 255) << 16) | ((e[1] & 255) << 8) | (e[2] & 255);
        }
        clone() {
          let t = new e();
          return ((t.fg = this.fg), (t.bg = this.bg), (t.extended = this.extended.clone()), t);
        }
        isInverse() {
          return this.fg & 67108864;
        }
        isBold() {
          return this.fg & 134217728;
        }
        isUnderline() {
          return this.hasExtendedAttrs() && this.extended.underlineStyle !== 0
            ? 1
            : this.fg & 268435456;
        }
        isBlink() {
          return this.fg & 536870912;
        }
        isInvisible() {
          return this.fg & 1073741824;
        }
        isItalic() {
          return this.bg & 67108864;
        }
        isDim() {
          return this.bg & 134217728;
        }
        isStrikethrough() {
          return this.fg & 2147483648;
        }
        isProtected() {
          return this.bg & 536870912;
        }
        isOverline() {
          return this.bg & 1073741824;
        }
        getFgColorMode() {
          return this.fg & 50331648;
        }
        getBgColorMode() {
          return this.bg & 50331648;
        }
        isFgRGB() {
          return (this.fg & 50331648) == 50331648;
        }
        isBgRGB() {
          return (this.bg & 50331648) == 50331648;
        }
        isFgPalette() {
          return (this.fg & 50331648) == 16777216 || (this.fg & 50331648) == 33554432;
        }
        isBgPalette() {
          return (this.bg & 50331648) == 16777216 || (this.bg & 50331648) == 33554432;
        }
        isFgDefault() {
          return (this.fg & 50331648) == 0;
        }
        isBgDefault() {
          return (this.bg & 50331648) == 0;
        }
        isAttributeDefault() {
          return this.fg === 0 && this.bg === 0;
        }
        getFgColor() {
          switch (this.fg & 50331648) {
            case 16777216:
            case 33554432:
              return this.fg & 255;
            case 50331648:
              return this.fg & 16777215;
            default:
              return -1;
          }
        }
        getBgColor() {
          switch (this.bg & 50331648) {
            case 16777216:
            case 33554432:
              return this.bg & 255;
            case 50331648:
              return this.bg & 16777215;
            default:
              return -1;
          }
        }
        hasExtendedAttrs() {
          return this.bg & 268435456;
        }
        updateExtended() {
          this.extended.isEmpty() ? (this.bg &= -268435457) : (this.bg |= 268435456);
        }
        getUnderlineColor() {
          if (this.bg & 268435456 && ~this.extended.underlineColor)
            switch (this.extended.underlineColor & 50331648) {
              case 16777216:
              case 33554432:
                return this.extended.underlineColor & 255;
              case 50331648:
                return this.extended.underlineColor & 16777215;
              default:
                return this.getFgColor();
            }
          return this.getFgColor();
        }
        getUnderlineColorMode() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? this.extended.underlineColor & 50331648
            : this.getFgColorMode();
        }
        isUnderlineColorRGB() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) == 50331648
            : this.isFgRGB();
        }
        isUnderlineColorPalette() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) == 16777216 ||
                (this.extended.underlineColor & 50331648) == 33554432
            : this.isFgPalette();
        }
        isUnderlineColorDefault() {
          return this.bg & 268435456 && ~this.extended.underlineColor
            ? (this.extended.underlineColor & 50331648) == 0
            : this.isFgDefault();
        }
        getUnderlineStyle() {
          return this.fg & 268435456 ? (this.bg & 268435456 ? this.extended.underlineStyle : 1) : 0;
        }
        getUnderlineVariantOffset() {
          return this.extended.underlineVariantOffset;
        }
      }),
      (Gl = class e {
        constructor(e = 0, t = 0) {
          ((this._ext = 0), (this._urlId = 0), (this._ext = e), (this._urlId = t));
        }
        get ext() {
          return this._urlId ? (this._ext & -469762049) | (this.underlineStyle << 26) : this._ext;
        }
        set ext(e) {
          this._ext = e;
        }
        get underlineStyle() {
          return this._urlId ? 5 : (this._ext & 469762048) >> 26;
        }
        set underlineStyle(e) {
          ((this._ext &= -469762049), (this._ext |= (e << 26) & 469762048));
        }
        get underlineColor() {
          return this._ext & 67108863;
        }
        set underlineColor(e) {
          ((this._ext &= -67108864), (this._ext |= e & 67108863));
        }
        get urlId() {
          return this._urlId;
        }
        set urlId(e) {
          this._urlId = e;
        }
        get underlineVariantOffset() {
          let e = (this._ext & 3758096384) >> 29;
          return e < 0 ? e ^ 4294967288 : e;
        }
        set underlineVariantOffset(e) {
          ((this._ext &= 536870911), (this._ext |= (e << 29) & 3758096384));
        }
        clone() {
          return new e(this._ext, this._urlId);
        }
        isEmpty() {
          return this.underlineStyle === 0 && this._urlId === 0;
        }
      }),
      (Kl = class e extends Wl {
        constructor() {
          (super(...arguments),
            (this.content = 0),
            (this.fg = 0),
            (this.bg = 0),
            (this.extended = new Gl()),
            (this.combinedData = ``));
        }
        static fromCharData(t) {
          let n = new e();
          return (n.setFromCharData(t), n);
        }
        isCombined() {
          return this.content & 2097152;
        }
        getWidth() {
          return this.content >> 22;
        }
        getChars() {
          return this.content & 2097152
            ? this.combinedData
            : this.content & 2097151
              ? Us(this.content & 2097151)
              : ``;
        }
        getCode() {
          return this.isCombined()
            ? this.combinedData.charCodeAt(this.combinedData.length - 1)
            : this.content & 2097151;
        }
        setFromCharData(e) {
          ((this.fg = e[0]), (this.bg = 0));
          let t = !1;
          if (e[1].length > 2) t = !0;
          else if (e[1].length === 2) {
            let n = e[1].charCodeAt(0);
            if (55296 <= n && n <= 56319) {
              let r = e[1].charCodeAt(1);
              56320 <= r && r <= 57343
                ? (this.content = ((n - 55296) * 1024 + r - 56320 + 65536) | (e[2] << 22))
                : (t = !0);
            } else t = !0;
          } else this.content = e[1].charCodeAt(0) | (e[2] << 22);
          t && ((this.combinedData = e[1]), (this.content = 2097152 | (e[2] << 22)));
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }),
      (ql = `di$target`),
      (Jl = `di$dependencies`),
      (Yl = new Map()),
      (Xl = Ks(`BufferService`)),
      (Zl = Ks(`CoreMouseService`)),
      (Ql = Ks(`CoreService`)),
      ($l = Ks(`CharsetService`)),
      (eu = Ks(`InstantiationService`)),
      (tu = Ks(`LogService`)),
      (nu = Ks(`OptionsService`)),
      (ru = Ks(`OscLinkService`)),
      (iu = Ks(`UnicodeService`)),
      (au = Ks(`DecorationService`)),
      (ou = class {
        constructor(e, t, n) {
          ((this._bufferService = e), (this._optionsService = t), (this._oscLinkService = n));
        }
        provideLinks(e, t) {
          let n = this._bufferService.buffer.lines.get(e - 1);
          if (!n) {
            t(void 0);
            return;
          }
          let r = [],
            i = this._optionsService.rawOptions.linkHandler,
            a = new Kl(),
            o = n.getTrimmedLength(),
            s = -1,
            c = -1,
            l = !1;
          for (let t = 0; t < o; t++)
            if (!(c === -1 && !n.hasContent(t))) {
              if ((n.loadCell(t, a), a.hasExtendedAttrs() && a.extended.urlId))
                if (c === -1) {
                  ((c = t), (s = a.extended.urlId));
                  continue;
                } else l = a.extended.urlId !== s;
              else c !== -1 && (l = !0);
              if (l || (c !== -1 && t === o - 1)) {
                let n = this._oscLinkService.getLinkData(s)?.uri;
                if (n) {
                  let a = {
                      start: { x: c + 1, y: e },
                      end: { x: t + (!l && t === o - 1 ? 1 : 0), y: e },
                    },
                    s = !1;
                  if (!i?.allowNonHttpProtocols)
                    try {
                      let e = new URL(n);
                      [`http:`, `https:`].includes(e.protocol) || (s = !0);
                    } catch {
                      s = !0;
                    }
                  s ||
                    r.push({
                      text: n,
                      range: a,
                      activate: (e, t) => (i ? i.activate(e, t, a) : Js(e, t)),
                      hover: (e, t) => i?.hover?.(e, t, a),
                      leave: (e, t) => i?.leave?.(e, t, a),
                    });
                }
                ((l = !1),
                  a.hasExtendedAttrs() && a.extended.urlId
                    ? ((c = t), (s = a.extended.urlId))
                    : ((c = -1), (s = -1)));
              }
            }
          t(r);
        }
      }),
      (ou = H([U(0, Xl), U(1, nu), U(2, ru)], ou)),
      (su = Ks(`CharSizeService`)),
      (cu = Ks(`CoreBrowserService`)),
      (lu = Ks(`MouseService`)),
      (uu = Ks(`RenderService`)),
      (du = Ks(`SelectionService`)),
      (fu = Ks(`CharacterJoinerService`)),
      (pu = Ks(`ThemeService`)),
      (mu = Ks(`LinkProviderService`)),
      (hu = class {
        constructor() {
          ((this.listeners = []),
            (this.unexpectedErrorHandler = function (e) {
              setTimeout(() => {
                throw e.stack
                  ? yu.isErrorNoTelemetry(e)
                    ? new yu(
                        e.message +
                          `

` +
                          e.stack,
                      )
                    : Error(
                        e.message +
                          `

` +
                          e.stack,
                      )
                  : e;
              }, 0);
            }));
        }
        addListener(e) {
          return (
            this.listeners.push(e),
            () => {
              this._removeListener(e);
            }
          );
        }
        emit(e) {
          this.listeners.forEach((t) => {
            t(e);
          });
        }
        _removeListener(e) {
          this.listeners.splice(this.listeners.indexOf(e), 1);
        }
        setUnexpectedErrorHandler(e) {
          this.unexpectedErrorHandler = e;
        }
        getUnexpectedErrorHandler() {
          return this.unexpectedErrorHandler;
        }
        onUnexpectedError(e) {
          (this.unexpectedErrorHandler(e), this.emit(e));
        }
        onUnexpectedExternalError(e) {
          this.unexpectedErrorHandler(e);
        }
      }),
      (gu = new hu()),
      (_u = `Canceled`),
      (vu = class extends Error {
        constructor() {
          (super(_u), (this.name = this.message));
        }
      }),
      (yu = class e extends Error {
        constructor(e) {
          (super(e), (this.name = `CodeExpectedError`));
        }
        static fromError(t) {
          if (t instanceof e) return t;
          let n = new e();
          return ((n.message = t.message), (n.stack = t.stack), n);
        }
        static isErrorNoTelemetry(e) {
          return e.name === `CodeExpectedError`;
        }
      }),
      (bu = class e extends Error {
        constructor(t) {
          (super(t || `An unexpected bug occurred.`), Object.setPrototypeOf(this, e.prototype));
        }
      }),
      (xu = class e {
        constructor(e) {
          ((this._array = e), (this._findLastMonotonousLastIdx = 0));
        }
        findLastMonotonous(t) {
          if (e.assertInvariants) {
            if (this._prevFindLastPredicate) {
              for (let e of this._array)
                if (this._prevFindLastPredicate(e) && !t(e))
                  throw Error(
                    `MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.`,
                  );
            }
            this._prevFindLastPredicate = t;
          }
          let n = Qs(this._array, t, this._findLastMonotonousLastIdx);
          return ((this._findLastMonotonousLastIdx = n + 1), n === -1 ? void 0 : this._array[n]);
        }
      }),
      (xu.assertInvariants = !1),
      ((e) => {
        function t(e) {
          return e < 0;
        }
        e.isLessThan = t;
        function n(e) {
          return e <= 0;
        }
        e.isLessThanOrEqual = n;
        function r(e) {
          return e > 0;
        }
        e.isGreaterThan = r;
        function i(e) {
          return e === 0;
        }
        ((e.isNeitherLessOrGreaterThan = i),
          (e.greaterThan = 1),
          (e.lessThan = -1),
          (e.neitherLessOrGreaterThan = 0));
      })((Su ||= {})),
      (Cu = (e, t) => e - t),
      (wu = class e {
        constructor(e) {
          this.iterate = e;
        }
        forEach(e) {
          this.iterate((t) => (e(t), !0));
        }
        toArray() {
          let e = [];
          return (this.iterate((t) => (e.push(t), !0)), e);
        }
        filter(t) {
          return new e((e) => this.iterate((n) => (t(n) ? e(n) : !0)));
        }
        map(t) {
          return new e((e) => this.iterate((n) => e(t(n))));
        }
        some(e) {
          let t = !1;
          return (this.iterate((n) => ((t = e(n)), !t)), t);
        }
        findFirst(e) {
          let t;
          return (this.iterate((n) => (e(n) ? ((t = n), !1) : !0)), t);
        }
        findLast(e) {
          let t;
          return (this.iterate((n) => (e(n) && (t = n), !0)), t);
        }
        findLastMaxBy(e) {
          let t,
            n = !0;
          return (
            this.iterate((r) => ((n || Su.isGreaterThan(e(r, t))) && ((n = !1), (t = r)), !0)), t
          );
        }
      }),
      (wu.empty = new wu((e) => {})),
      (Tu = class {
        constructor() {
          this.map = new Map();
        }
        add(e, t) {
          let n = this.map.get(e);
          (n || ((n = new Set()), this.map.set(e, n)), n.add(t));
        }
        delete(e, t) {
          let n = this.map.get(e);
          n && (n.delete(t), n.size === 0 && this.map.delete(e));
        }
        forEach(e, t) {
          let n = this.map.get(e);
          n && n.forEach(t);
        }
        get(e) {
          return this.map.get(e) || new Set();
        }
      }),
      ((e) => {
        function t(e) {
          return e && typeof e == `object` && typeof e[Symbol.iterator] == `function`;
        }
        e.is = t;
        let n = Object.freeze([]);
        function r() {
          return n;
        }
        e.empty = r;
        function* i(e) {
          yield e;
        }
        e.single = i;
        function a(e) {
          return t(e) ? e : i(e);
        }
        e.wrap = a;
        function o(e) {
          return e || n;
        }
        e.from = o;
        function* s(e) {
          for (let t = e.length - 1; t >= 0; t--) yield e[t];
        }
        e.reverse = s;
        function c(e) {
          return !e || e[Symbol.iterator]().next().done === !0;
        }
        e.isEmpty = c;
        function l(e) {
          return e[Symbol.iterator]().next().value;
        }
        e.first = l;
        function u(e, t) {
          let n = 0;
          for (let r of e) if (t(r, n++)) return !0;
          return !1;
        }
        e.some = u;
        function d(e, t) {
          for (let n of e) if (t(n)) return n;
        }
        e.find = d;
        function* f(e, t) {
          for (let n of e) t(n) && (yield n);
        }
        e.filter = f;
        function* p(e, t) {
          let n = 0;
          for (let r of e) yield t(r, n++);
        }
        e.map = p;
        function* m(e, t) {
          let n = 0;
          for (let r of e) yield* t(r, n++);
        }
        e.flatMap = m;
        function* h(...e) {
          for (let t of e) yield* t;
        }
        e.concat = h;
        function g(e, t, n) {
          let r = n;
          for (let n of e) r = t(r, n);
          return r;
        }
        e.reduce = g;
        function* _(e, t, n = e.length) {
          for (
            t < 0 && (t += e.length), n < 0 ? (n += e.length) : n > e.length && (n = e.length);
            t < n;
            t++
          )
            yield e[t];
        }
        e.slice = _;
        function v(t, n = 1 / 0) {
          let r = [];
          if (n === 0) return [r, t];
          let i = t[Symbol.iterator]();
          for (let t = 0; t < n; t++) {
            let t = i.next();
            if (t.done) return [r, e.empty()];
            r.push(t.value);
          }
          return [
            r,
            {
              [Symbol.iterator]() {
                return i;
              },
            },
          ];
        }
        e.consume = v;
        async function y(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return Promise.resolve(t);
        }
        e.asyncToArray = y;
      })((Eu ||= {})),
      (Du = !1),
      (Ou = null),
      (ku = class e {
        constructor() {
          this.livingDisposables = new Map();
        }
        getDisposableData(t) {
          let n = this.livingDisposables.get(t);
          return (
            n ||
              ((n = { parent: null, source: null, isSingleton: !1, value: t, idx: e.idx++ }),
              this.livingDisposables.set(t, n)),
            n
          );
        }
        trackDisposable(e) {
          let t = this.getDisposableData(e);
          t.source ||= Error().stack;
        }
        setParent(e, t) {
          let n = this.getDisposableData(e);
          n.parent = t;
        }
        markAsDisposed(e) {
          this.livingDisposables.delete(e);
        }
        markAsSingleton(e) {
          this.getDisposableData(e).isSingleton = !0;
        }
        getRootParent(e, t) {
          let n = t.get(e);
          if (n) return n;
          let r = e.parent ? this.getRootParent(this.getDisposableData(e.parent), t) : e;
          return (t.set(e, r), r);
        }
        getTrackedDisposables() {
          let e = new Map();
          return [...this.livingDisposables.entries()]
            .filter(([, t]) => t.source !== null && !this.getRootParent(t, e).isSingleton)
            .flatMap(([e]) => e);
        }
        computeLeakingDisposables(e = 10, t) {
          let n;
          if (t) n = t;
          else {
            let e = new Map(),
              t = [...this.livingDisposables.values()].filter(
                (t) => t.source !== null && !this.getRootParent(t, e).isSingleton,
              );
            if (t.length === 0) return;
            let r = new Set(t.map((e) => e.value));
            if (((n = t.filter((e) => !(e.parent && r.has(e.parent)))), n.length === 0))
              throw Error(`There are cyclic diposable chains!`);
          }
          if (!n) return;
          function r(e) {
            function t(e, t) {
              for (
                ;
                e.length > 0 && t.some((t) => (typeof t == `string` ? t === e[0] : e[0].match(t)));
              )
                e.shift();
            }
            let n = e.source
              .split(`
`)
              .map((e) => e.trim().replace(`at `, ``))
              .filter((e) => e !== ``);
            return (
              t(n, [
                `Error`,
                /^trackDisposable \(.*\)$/,
                /^DisposableTracker.trackDisposable \(.*\)$/,
              ]),
              n.reverse()
            );
          }
          let i = new Tu();
          for (let e of n) {
            let t = r(e);
            for (let n = 0; n <= t.length; n++)
              i.add(
                t.slice(0, n).join(`
`),
                e,
              );
          }
          n.sort(ec((e) => e.idx, Cu));
          let a = ``,
            o = 0;
          for (let t of n.slice(0, e)) {
            o++;
            let e = r(t),
              s = [];
            for (let t = 0; t < e.length; t++) {
              let a = e[t];
              a = `(shared with ${
                i.get(
                  e.slice(0, t + 1).join(`
`),
                ).size
              }/${n.length} leaks) at ${a}`;
              let o = tc(
                [
                  ...i.get(
                    e.slice(0, t).join(`
`),
                  ),
                ].map((e) => r(e)[t]),
                (e) => e,
              );
              delete o[e[t]];
              for (let [e, t] of Object.entries(o))
                s.unshift(`    - stacktraces of ${t.length} other leaks continue with ${e}`);
              s.unshift(a);
            }
            a += `


==================== Leaking disposable ${o}/${n.length}: ${t.value.constructor.name} ====================
${s.join(`
`)}
============================================================

`;
          }
          return (
            n.length > e &&
              (a += `


... and ${n.length - e} more leaking disposables

`),
            { leaks: n, details: a }
          );
        }
      }),
      (ku.idx = 0),
      Du)
    ) {
      let e = `__is_disposable_tracked__`;
      rc(
        new (class {
          trackDisposable(t) {
            let n = Error(`Potentially leaked disposable`).stack;
            setTimeout(() => {
              t[e] || console.log(n);
            }, 3e3);
          }
          setParent(t, n) {
            if (t && t !== W.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsDisposed(t) {
            if (t && t !== W.None)
              try {
                t[e] = !0;
              } catch {}
          }
          markAsSingleton(e) {}
        })(),
      );
    }
    if (
      ((Au = class e {
        constructor() {
          ((this._toDispose = new Set()), (this._isDisposed = !1), ic(this));
        }
        dispose() {
          this._isDisposed || (ac(this), (this._isDisposed = !0), this.clear());
        }
        get isDisposed() {
          return this._isDisposed;
        }
        clear() {
          if (this._toDispose.size !== 0)
            try {
              lc(this._toDispose);
            } finally {
              this._toDispose.clear();
            }
        }
        add(t) {
          if (!t) return t;
          if (t === this) throw Error(`Cannot register a disposable on itself!`);
          return (
            oc(t, this),
            this._isDisposed
              ? e.DISABLE_DISPOSED_WARNING ||
                console.warn(
                  Error(
                    `Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!`,
                  ).stack,
                )
              : this._toDispose.add(t),
            t
          );
        }
        delete(e) {
          if (e) {
            if (e === this) throw Error(`Cannot dispose a disposable on itself!`);
            (this._toDispose.delete(e), e.dispose());
          }
        }
        deleteAndLeak(e) {
          e && this._toDispose.has(e) && (this._toDispose.delete(e), oc(e, null));
        }
      }),
      (Au.DISABLE_DISPOSED_WARNING = !1),
      (ju = Au),
      (W = class {
        constructor() {
          ((this._store = new ju()), ic(this), oc(this._store, this));
        }
        dispose() {
          (ac(this), this._store.dispose());
        }
        _register(e) {
          if (e === this) throw Error(`Cannot register a disposable on itself!`);
          return this._store.add(e);
        }
      }),
      (W.None = Object.freeze({ dispose() {} })),
      (Mu = class {
        constructor() {
          ((this._isDisposed = !1), ic(this));
        }
        get value() {
          return this._isDisposed ? void 0 : this._value;
        }
        set value(e) {
          this._isDisposed ||
            e === this._value ||
            (this._value?.dispose(), e && oc(e, this), (this._value = e));
        }
        clear() {
          this.value = void 0;
        }
        dispose() {
          ((this._isDisposed = !0), ac(this), this._value?.dispose(), (this._value = void 0));
        }
        clearAndLeak() {
          let e = this._value;
          return ((this._value = void 0), e && oc(e, null), e);
        }
      }),
      (Nu = typeof window == `object` ? window : globalThis),
      (Pu = class e {
        constructor(t) {
          ((this.element = t), (this.next = e.Undefined), (this.prev = e.Undefined));
        }
      }),
      (Pu.Undefined = new Pu(void 0)),
      (G = Pu),
      (Fu = class {
        constructor() {
          ((this._first = G.Undefined), (this._last = G.Undefined), (this._size = 0));
        }
        get size() {
          return this._size;
        }
        isEmpty() {
          return this._first === G.Undefined;
        }
        clear() {
          let e = this._first;
          for (; e !== G.Undefined; ) {
            let t = e.next;
            ((e.prev = G.Undefined), (e.next = G.Undefined), (e = t));
          }
          ((this._first = G.Undefined), (this._last = G.Undefined), (this._size = 0));
        }
        unshift(e) {
          return this._insert(e, !1);
        }
        push(e) {
          return this._insert(e, !0);
        }
        _insert(e, t) {
          let n = new G(e);
          if (this._first === G.Undefined) ((this._first = n), (this._last = n));
          else if (t) {
            let e = this._last;
            ((this._last = n), (n.prev = e), (e.next = n));
          } else {
            let e = this._first;
            ((this._first = n), (n.next = e), (e.prev = n));
          }
          this._size += 1;
          let r = !1;
          return () => {
            r || ((r = !0), this._remove(n));
          };
        }
        shift() {
          if (this._first !== G.Undefined) {
            let e = this._first.element;
            return (this._remove(this._first), e);
          }
        }
        pop() {
          if (this._last !== G.Undefined) {
            let e = this._last.element;
            return (this._remove(this._last), e);
          }
        }
        _remove(e) {
          if (e.prev !== G.Undefined && e.next !== G.Undefined) {
            let t = e.prev;
            ((t.next = e.next), (e.next.prev = t));
          } else
            e.prev === G.Undefined && e.next === G.Undefined
              ? ((this._first = G.Undefined), (this._last = G.Undefined))
              : e.next === G.Undefined
                ? ((this._last = this._last.prev), (this._last.next = G.Undefined))
                : e.prev === G.Undefined &&
                  ((this._first = this._first.next), (this._first.prev = G.Undefined));
          --this._size;
        }
        *[Symbol.iterator]() {
          let e = this._first;
          for (; e !== G.Undefined; ) (yield e.element, (e = e.next));
        }
      }),
      (Iu = globalThis.performance && typeof globalThis.performance.now == `function`),
      (Lu = class e {
        static create(t) {
          return new e(t);
        }
        constructor(e) {
          ((this._now =
            Iu && e === !1 ? Date.now : globalThis.performance.now.bind(globalThis.performance)),
            (this._startTime = this._now()),
            (this._stopTime = -1));
        }
        stop() {
          this._stopTime = this._now();
        }
        reset() {
          ((this._startTime = this._now()), (this._stopTime = -1));
        }
        elapsed() {
          return this._stopTime === -1
            ? this._now() - this._startTime
            : this._stopTime - this._startTime;
        }
      }),
      (Ru = !1),
      (zu = !1),
      (Bu = !1),
      ((e) => {
        e.None = () => W.None;
        function t(e) {
          if (Bu) {
            let { onDidAddListener: t } = e,
              n = qu.create(),
              r = 0;
            e.onDidAddListener = () => {
              (++r === 2 &&
                (console.warn(
                  `snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here`,
                ),
                n.print()),
                t?.());
            };
          }
        }
        function n(e, t) {
          return f(e, () => {}, 0, void 0, !0, void 0, t);
        }
        e.defer = n;
        function r(e) {
          return (t, n = null, r) => {
            let i = !1,
              a;
            return (
              (a = e(
                (e) => {
                  if (!i) return (a ? a.dispose() : (i = !0), t.call(n, e));
                },
                null,
                r,
              )),
              i && a.dispose(),
              a
            );
          };
        }
        e.once = r;
        function i(e, t, n) {
          return u((n, r = null, i) => e((e) => n.call(r, t(e)), null, i), n);
        }
        e.map = i;
        function a(e, t, n) {
          return u(
            (n, r = null, i) =>
              e(
                (e) => {
                  (t(e), n.call(r, e));
                },
                null,
                i,
              ),
            n,
          );
        }
        e.forEach = a;
        function o(e, t, n) {
          return u((n, r = null, i) => e((e) => t(e) && n.call(r, e), null, i), n);
        }
        e.filter = o;
        function s(e) {
          return e;
        }
        e.signal = s;
        function c(...e) {
          return (t, n = null, r) => d(uc(...e.map((e) => e((e) => t.call(n, e)))), r);
        }
        e.any = c;
        function l(e, t, n, r) {
          let a = n;
          return i(e, (e) => ((a = t(a, e)), a), r);
        }
        e.reduce = l;
        function u(e, n) {
          let r,
            i = {
              onWillAddFirstListener() {
                r = e(a.fire, a);
              },
              onDidRemoveLastListener() {
                r?.dispose();
              },
            };
          n || t(i);
          let a = new K(i);
          return (n?.add(a), a.event);
        }
        function d(e, t) {
          return (t instanceof Array ? t.push(e) : t && t.add(e), e);
        }
        function f(e, n, r = 100, i = !1, a = !1, o, s) {
          let c,
            l,
            u,
            d = 0,
            f,
            p = {
              leakWarningThreshold: o,
              onWillAddFirstListener() {
                c = e((e) => {
                  (d++,
                    (l = n(l, e)),
                    i && !u && (m.fire(l), (l = void 0)),
                    (f = () => {
                      let e = l;
                      ((l = void 0), (u = void 0), (!i || d > 1) && m.fire(e), (d = 0));
                    }),
                    typeof r == `number`
                      ? (clearTimeout(u), (u = setTimeout(f, r)))
                      : u === void 0 && ((u = 0), queueMicrotask(f)));
                });
              },
              onWillRemoveListener() {
                a && d > 0 && f?.();
              },
              onDidRemoveLastListener() {
                ((f = void 0), c.dispose());
              },
            };
          s || t(p);
          let m = new K(p);
          return (s?.add(m), m.event);
        }
        e.debounce = f;
        function p(t, n = 0, r) {
          return e.debounce(t, (e, t) => (e ? (e.push(t), e) : [t]), n, void 0, !0, void 0, r);
        }
        e.accumulate = p;
        function m(e, t = (e, t) => e === t, n) {
          let r = !0,
            i;
          return o(
            e,
            (e) => {
              let n = r || !t(e, i);
              return ((r = !1), (i = e), n);
            },
            n,
          );
        }
        e.latch = m;
        function h(t, n, r) {
          return [e.filter(t, n, r), e.filter(t, (e) => !n(e), r)];
        }
        e.split = h;
        function g(e, t = !1, n = [], r) {
          let i = n.slice(),
            a = e((e) => {
              i ? i.push(e) : s.fire(e);
            });
          r && r.add(a);
          let o = () => {
              (i?.forEach((e) => s.fire(e)), (i = null));
            },
            s = new K({
              onWillAddFirstListener() {
                a || ((a = e((e) => s.fire(e))), r && r.add(a));
              },
              onDidAddFirstListener() {
                i && (t ? setTimeout(o) : o());
              },
              onDidRemoveLastListener() {
                (a && a.dispose(), (a = null));
              },
            });
          return (r && r.add(s), s.event);
        }
        e.buffer = g;
        function _(e, t) {
          return (n, r, i) => {
            let a = t(new y());
            return e(
              function (e) {
                let t = a.evaluate(e);
                t !== v && n.call(r, t);
              },
              void 0,
              i,
            );
          };
        }
        e.chain = _;
        let v = Symbol(`HaltChainable`);
        class y {
          constructor() {
            this.steps = [];
          }
          map(e) {
            return (this.steps.push(e), this);
          }
          forEach(e) {
            return (this.steps.push((t) => (e(t), t)), this);
          }
          filter(e) {
            return (this.steps.push((t) => (e(t) ? t : v)), this);
          }
          reduce(e, t) {
            let n = t;
            return (this.steps.push((t) => ((n = e(n, t)), n)), this);
          }
          latch(e = (e, t) => e === t) {
            let t = !0,
              n;
            return (
              this.steps.push((r) => {
                let i = t || !e(r, n);
                return ((t = !1), (n = r), i ? r : v);
              }),
              this
            );
          }
          evaluate(e) {
            for (let t of this.steps) if (((e = t(e)), e === v)) break;
            return e;
          }
        }
        function b(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new K({
              onWillAddFirstListener: () => e.on(t, r),
              onDidRemoveLastListener: () => e.removeListener(t, r),
            });
          return i.event;
        }
        e.fromNodeEventEmitter = b;
        function x(e, t, n = (e) => e) {
          let r = (...e) => i.fire(n(...e)),
            i = new K({
              onWillAddFirstListener: () => e.addEventListener(t, r),
              onDidRemoveLastListener: () => e.removeEventListener(t, r),
            });
          return i.event;
        }
        e.fromDOMEventEmitter = x;
        function S(e) {
          return new Promise((t) => r(e)(t));
        }
        e.toPromise = S;
        function C(e) {
          let t = new K();
          return (
            e
              .then(
                (e) => {
                  t.fire(e);
                },
                () => {
                  t.fire(void 0);
                },
              )
              .finally(() => {
                t.dispose();
              }),
            t.event
          );
        }
        e.fromPromise = C;
        function w(e, t) {
          return e((e) => t.fire(e));
        }
        e.forward = w;
        function T(e, t, n) {
          return (t(n), e((e) => t(e)));
        }
        e.runAndSubscribe = T;
        class E {
          constructor(e, n) {
            ((this._observable = e), (this._counter = 0), (this._hasChanged = !1));
            let r = {
              onWillAddFirstListener: () => {
                e.addObserver(this);
              },
              onDidRemoveLastListener: () => {
                e.removeObserver(this);
              },
            };
            (n || t(r), (this.emitter = new K(r)), n && n.add(this.emitter));
          }
          beginUpdate(e) {
            this._counter++;
          }
          handlePossibleChange(e) {}
          handleChange(e, t) {
            this._hasChanged = !0;
          }
          endUpdate(e) {
            (this._counter--,
              this._counter === 0 &&
                (this._observable.reportChanges(),
                this._hasChanged &&
                  ((this._hasChanged = !1), this.emitter.fire(this._observable.get()))));
          }
        }
        function D(e, t) {
          return new E(e, t).emitter.event;
        }
        e.fromObservable = D;
        function ee(e) {
          return (t, n, r) => {
            let i = 0,
              a = !1,
              o = {
                beginUpdate() {
                  i++;
                },
                endUpdate() {
                  (i--, i === 0 && (e.reportChanges(), a && ((a = !1), t.call(n))));
                },
                handlePossibleChange() {},
                handleChange() {
                  a = !0;
                },
              };
            (e.addObserver(o), e.reportChanges());
            let s = {
              dispose() {
                e.removeObserver(o);
              },
            };
            return (r instanceof ju ? r.add(s) : Array.isArray(r) && r.push(s), s);
          };
        }
        e.fromObservableLight = ee;
      })((Vu ||= {})),
      (Hu = class e {
        constructor(t) {
          ((this.listenerCount = 0),
            (this.invocationCount = 0),
            (this.elapsedOverall = 0),
            (this.durations = []),
            (this.name = `${t}_${e._idPool++}`),
            e.all.add(this));
        }
        start(e) {
          ((this._stopWatch = new Lu()), (this.listenerCount = e));
        }
        stop() {
          if (this._stopWatch) {
            let e = this._stopWatch.elapsed();
            (this.durations.push(e),
              (this.elapsedOverall += e),
              (this.invocationCount += 1),
              (this._stopWatch = void 0));
          }
        }
      }),
      (Hu.all = new Set()),
      (Hu._idPool = 0),
      (Uu = Hu),
      (Wu = -1),
      (Gu = class e {
        constructor(t, n, r = (e._idPool++).toString(16).padStart(3, `0`)) {
          ((this._errorHandler = t),
            (this.threshold = n),
            (this.name = r),
            (this._warnCountdown = 0));
        }
        dispose() {
          this._stacks?.clear();
        }
        check(e, t) {
          let n = this.threshold;
          if (n <= 0 || t < n) return;
          this._stacks ||= new Map();
          let r = this._stacks.get(e.value) || 0;
          if ((this._stacks.set(e.value, r + 1), --this._warnCountdown, this._warnCountdown <= 0)) {
            this._warnCountdown = n * 0.5;
            let [e, r] = this.getMostFrequentStack(),
              i = `[${this.name}] potential listener LEAK detected, having ${t} listeners already. MOST frequent listener (${r}):`;
            (console.warn(i), console.warn(e));
            let a = new Ju(i, e);
            this._errorHandler(a);
          }
          return () => {
            let t = this._stacks.get(e.value) || 0;
            this._stacks.set(e.value, t - 1);
          };
        }
        getMostFrequentStack() {
          if (!this._stacks) return;
          let e,
            t = 0;
          for (let [n, r] of this._stacks) (!e || t < r) && ((e = [n, r]), (t = r));
          return e;
        }
      }),
      (Gu._idPool = 1),
      (Ku = Gu),
      (qu = class e {
        constructor(e) {
          this.value = e;
        }
        static create() {
          return new e(Error().stack ?? ``);
        }
        print() {
          console.warn(
            this.value
              .split(`
`)
              .slice(2).join(`
`),
          );
        }
      }),
      (Ju = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerLeakError`), (this.stack = t));
        }
      }),
      (Yu = class extends Error {
        constructor(e, t) {
          (super(e), (this.name = `ListenerRefusalError`), (this.stack = t));
        }
      }),
      (Xu = 0),
      (Zu = class {
        constructor(e) {
          ((this.value = e), (this.id = Xu++));
        }
      }),
      (Qu = 2),
      ($u = (e, t) => {
        if (e instanceof Zu) t(e);
        else
          for (let n = 0; n < e.length; n++) {
            let r = e[n];
            r && t(r);
          }
      }),
      Ru)
    ) {
      let e = [];
      (setInterval(() => {
        e.length !== 0 &&
          (console.warn(`[LEAKING LISTENERS] GC'ed these listeners that were NOT yet disposed:`),
          console.warn(
            e.join(`
`),
          ),
          (e.length = 0));
      }, 3e3),
        (ed = new FinalizationRegistry((t) => {
          typeof t == `string` && e.push(t);
        })));
    }
    if (
      ((K = class {
        constructor(e) {
          ((this._size = 0),
            (this._options = e),
            (this._leakageMon =
              Wu > 0 || this._options?.leakWarningThreshold
                ? new Ku(e?.onListenerError ?? Ys, this._options?.leakWarningThreshold ?? Wu)
                : void 0),
            (this._perfMon = this._options?._profName ? new Uu(this._options._profName) : void 0),
            (this._deliveryQueue = this._options?.deliveryQueue));
        }
        dispose() {
          if (!this._disposed) {
            if (
              ((this._disposed = !0),
              this._deliveryQueue?.current === this && this._deliveryQueue.reset(),
              this._listeners)
            ) {
              if (zu) {
                let e = this._listeners;
                queueMicrotask(() => {
                  $u(e, (e) => e.stack?.print());
                });
              }
              ((this._listeners = void 0), (this._size = 0));
            }
            (this._options?.onDidRemoveLastListener?.(), this._leakageMon?.dispose());
          }
        }
        get event() {
          return (
            (this._event ??= (e, t, n) => {
              if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
                let e = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
                console.warn(e);
                let t = this._leakageMon.getMostFrequentStack() ?? [`UNKNOWN stack`, -1],
                  n = new Yu(
                    `${e}. HINT: Stack shows most frequent listener (${t[1]}-times)`,
                    t[0],
                  );
                return ((this._options?.onListenerError || Ys)(n), W.None);
              }
              if (this._disposed) return W.None;
              t && (e = e.bind(t));
              let r = new Zu(e),
                i;
              (this._leakageMon &&
                this._size >= Math.ceil(this._leakageMon.threshold * 0.2) &&
                ((r.stack = qu.create()), (i = this._leakageMon.check(r.stack, this._size + 1))),
                zu && (r.stack = qu.create()),
                this._listeners
                  ? this._listeners instanceof Zu
                    ? ((this._deliveryQueue ??= new td()), (this._listeners = [this._listeners, r]))
                    : this._listeners.push(r)
                  : (this._options?.onWillAddFirstListener?.(this),
                    (this._listeners = r),
                    this._options?.onDidAddFirstListener?.(this)),
                this._size++);
              let a = z(() => {
                (ed?.unregister(a), i?.(), this._removeListener(r));
              });
              if ((n instanceof ju ? n.add(a) : Array.isArray(n) && n.push(a), ed)) {
                let e = Error()
                    .stack.split(`
`)
                    .slice(2, 3)
                    .join(`
`)
                    .trim(),
                  t = /(file:|vscode-file:\/\/vscode-app)?(\/[^:]*:\d+:\d+)/.exec(e);
                ed.register(a, t?.[2] ?? e, a);
              }
              return a;
            }),
            this._event
          );
        }
        _removeListener(e) {
          if ((this._options?.onWillRemoveListener?.(this), !this._listeners)) return;
          if (this._size === 1) {
            ((this._listeners = void 0),
              this._options?.onDidRemoveLastListener?.(this),
              (this._size = 0));
            return;
          }
          let t = this._listeners,
            n = t.indexOf(e);
          if (n === -1)
            throw (
              console.log(`disposed?`, this._disposed),
              console.log(`size?`, this._size),
              console.log(`arr?`, JSON.stringify(this._listeners)),
              Error(`Attempted to dispose unknown listener`)
            );
          (this._size--, (t[n] = void 0));
          let r = this._deliveryQueue.current === this;
          if (this._size * Qu <= t.length) {
            let e = 0;
            for (let n = 0; n < t.length; n++)
              t[n]
                ? (t[e++] = t[n])
                : r &&
                  (this._deliveryQueue.end--, e < this._deliveryQueue.i && this._deliveryQueue.i--);
            t.length = e;
          }
        }
        _deliver(e, t) {
          if (!e) return;
          let n = this._options?.onListenerError || Ys;
          if (!n) {
            e.value(t);
            return;
          }
          try {
            e.value(t);
          } catch (e) {
            n(e);
          }
        }
        _deliverQueue(e) {
          let t = e.current._listeners;
          for (; e.i < e.end; ) this._deliver(t[e.i++], e.value);
          e.reset();
        }
        fire(e) {
          if (
            (this._deliveryQueue?.current &&
              (this._deliverQueue(this._deliveryQueue), this._perfMon?.stop()),
            this._perfMon?.start(this._size),
            this._listeners)
          )
            if (this._listeners instanceof Zu) this._deliver(this._listeners, e);
            else {
              let t = this._deliveryQueue;
              (t.enqueue(this, e, this._listeners.length), this._deliverQueue(t));
            }
          this._perfMon?.stop();
        }
        hasListeners() {
          return this._size > 0;
        }
      }),
      (td = class {
        constructor() {
          ((this.i = -1), (this.end = 0));
        }
        enqueue(e, t, n) {
          ((this.i = 0), (this.end = n), (this.current = e), (this.value = t));
        }
        reset() {
          ((this.i = this.end), (this.current = void 0), (this.value = void 0));
        }
      }),
      (nd = class {
        constructor() {
          ((this.mapWindowIdToZoomLevel = new Map()),
            (this._onDidChangeZoomLevel = new K()),
            (this.onDidChangeZoomLevel = this._onDidChangeZoomLevel.event),
            (this.mapWindowIdToZoomFactor = new Map()),
            (this._onDidChangeFullscreen = new K()),
            (this.onDidChangeFullscreen = this._onDidChangeFullscreen.event),
            (this.mapWindowIdToFullScreen = new Map()));
        }
        getZoomLevel(e) {
          return this.mapWindowIdToZoomLevel.get(this.getWindowId(e)) ?? 0;
        }
        setZoomLevel(e, t) {
          if (this.getZoomLevel(t) === e) return;
          let n = this.getWindowId(t);
          (this.mapWindowIdToZoomLevel.set(n, e), this._onDidChangeZoomLevel.fire(n));
        }
        getZoomFactor(e) {
          return this.mapWindowIdToZoomFactor.get(this.getWindowId(e)) ?? 1;
        }
        setZoomFactor(e, t) {
          this.mapWindowIdToZoomFactor.set(this.getWindowId(t), e);
        }
        setFullscreen(e, t) {
          if (this.isFullscreen(t) === e) return;
          let n = this.getWindowId(t);
          (this.mapWindowIdToFullScreen.set(n, e), this._onDidChangeFullscreen.fire(n));
        }
        isFullscreen(e) {
          return !!this.mapWindowIdToFullScreen.get(this.getWindowId(e));
        }
        getWindowId(e) {
          return e.vscodeWindowId;
        }
      }),
      (nd.INSTANCE = new nd()),
      (rd = nd),
      rd.INSTANCE.onDidChangeZoomLevel,
      rd.INSTANCE.onDidChangeFullscreen,
      (id = typeof navigator == `object` ? navigator.userAgent : ``),
      (ad = id.indexOf(`Firefox`) >= 0),
      (od = id.indexOf(`AppleWebKit`) >= 0),
      (sd = id.indexOf(`Chrome`) >= 0),
      (cd = !sd && id.indexOf(`Safari`) >= 0),
      id.indexOf(`Electron/`),
      id.indexOf(`Android`),
      (ld = !1),
      typeof Nu.matchMedia == `function`)
    ) {
      let e = Nu.matchMedia(
          `(display-mode: standalone) or (display-mode: window-controls-overlay)`,
        ),
        t = Nu.matchMedia(`(display-mode: fullscreen)`);
      ((ld = e.matches),
        dc(Nu, e, ({ matches: e }) => {
          (ld && t.matches) || (ld = e);
        }));
    }
    if (
      ((ud = `en`),
      (dd = !1),
      (fd = !1),
      (pd = !1),
      (md = !1),
      (hd = !1),
      (gd = ud),
      (vd = globalThis),
      typeof vd.vscode < `u` && typeof vd.vscode.process < `u`
        ? (yd = vd.vscode.process)
        : typeof process < `u` && typeof process?.versions?.node == `string` && (yd = process),
      (bd = typeof yd?.versions?.electron == `string` && yd?.type === `renderer`),
      typeof yd == `object`)
    ) {
      ((dd = yd.platform === `win32`),
        (fd = yd.platform === `darwin`),
        (pd = yd.platform === `linux`),
        pd && yd.env.SNAP && yd.env.SNAP_REVISION,
        yd.env.CI || yd.env.BUILD_ARTIFACTSTAGINGDIRECTORY,
        (gd = ud));
      let e = yd.env.VSCODE_NLS_CONFIG;
      if (e)
        try {
          let t = JSON.parse(e);
          (t.userLocale,
            t.osLocale,
            (gd = t.resolvedLanguage || ud),
            t.languagePack?.translationsConfigFile);
        } catch {}
      md = !0;
    } else
      typeof navigator == `object` && !bd
        ? ((_d = navigator.userAgent),
          (dd = _d.indexOf(`Windows`) >= 0),
          (fd = _d.indexOf(`Macintosh`) >= 0),
          (_d.indexOf(`Macintosh`) >= 0 || _d.indexOf(`iPad`) >= 0 || _d.indexOf(`iPhone`) >= 0) &&
            navigator.maxTouchPoints &&
            navigator.maxTouchPoints,
          (pd = _d.indexOf(`Linux`) >= 0),
          _d?.indexOf(`Mobi`),
          (hd = !0),
          (gd = globalThis._VSCODE_NLS_LANGUAGE || ud),
          navigator.language.toLowerCase())
        : console.error(`Unable to resolve platform.`);
    ((xd = dd),
      (Sd = fd),
      (Cd = pd),
      (wd = md),
      hd && typeof vd.importScripts == `function` && vd.origin,
      (Td = _d),
      (Ed = gd),
      ((e) => {
        function t() {
          return Ed;
        }
        e.value = t;
        function n() {
          return Ed.length === 2
            ? Ed === `en`
            : Ed.length >= 3
              ? Ed[0] === `e` && Ed[1] === `n` && Ed[2] === `-`
              : !1;
        }
        e.isDefaultVariant = n;
        function r() {
          return Ed === `en`;
        }
        e.isDefault = r;
      })((Dd ||= {})),
      (Od = typeof vd.postMessage == `function` && !vd.importScripts),
      (() => {
        if (Od) {
          let e = [];
          vd.addEventListener(`message`, (t) => {
            if (t.data && t.data.vscodeScheduleAsyncWork)
              for (let n = 0, r = e.length; n < r; n++) {
                let r = e[n];
                if (r.id === t.data.vscodeScheduleAsyncWork) {
                  (e.splice(n, 1), r.callback());
                  return;
                }
              }
          });
          let t = 0;
          return (n) => {
            let r = ++t;
            (e.push({ id: r, callback: n }), vd.postMessage({ vscodeScheduleAsyncWork: r }, `*`));
          };
        }
        return (e) => setTimeout(e);
      })(),
      (kd = !!(Td && Td.indexOf(`Chrome`) >= 0)),
      Td && Td.indexOf(`Firefox`),
      !kd && Td && Td.indexOf(`Safari`),
      Td && Td.indexOf(`Edg/`),
      Td && Td.indexOf(`Android`),
      (Ad = typeof navigator == `object` ? navigator : {}),
      wd ||
        (document.queryCommandSupported && document.queryCommandSupported(`copy`)) ||
        (Ad && Ad.clipboard && Ad.clipboard.writeText),
      wd || (Ad && Ad.clipboard && Ad.clipboard.readText),
      wd || pc() || Ad.keyboard,
      `ontouchstart` in Nu || Ad.maxTouchPoints,
      Nu.PointerEvent && (`ontouchstart` in Nu || navigator.maxTouchPoints),
      (jd = class {
        constructor() {
          ((this._keyCodeToStr = []), (this._strToKeyCode = Object.create(null)));
        }
        define(e, t) {
          ((this._keyCodeToStr[e] = t), (this._strToKeyCode[t.toLowerCase()] = e));
        }
        keyCodeToStr(e) {
          return this._keyCodeToStr[e];
        }
        strToKeyCode(e) {
          return this._strToKeyCode[e.toLowerCase()] || 0;
        }
      }),
      (Md = new jd()),
      (Nd = new jd()),
      (Pd = new jd()),
      (Fd = Array(230)),
      ((e) => {
        function t(e) {
          return Md.keyCodeToStr(e);
        }
        e.toString = t;
        function n(e) {
          return Md.strToKeyCode(e);
        }
        e.fromString = n;
        function r(e) {
          return Nd.keyCodeToStr(e);
        }
        e.toUserSettingsUS = r;
        function i(e) {
          return Pd.keyCodeToStr(e);
        }
        e.toUserSettingsGeneral = i;
        function a(e) {
          return Nd.strToKeyCode(e) || Pd.strToKeyCode(e);
        }
        e.fromUserSettings = a;
        function o(e) {
          if (e >= 98 && e <= 113) return null;
          switch (e) {
            case 16:
              return `Up`;
            case 18:
              return `Down`;
            case 15:
              return `Left`;
            case 17:
              return `Right`;
          }
          return Md.keyCodeToStr(e);
        }
        e.toElectronAccelerator = o;
      })((Id ||= {})),
      (Ld = class e {
        constructor(e, t, n, r, i) {
          ((this.ctrlKey = e),
            (this.shiftKey = t),
            (this.altKey = n),
            (this.metaKey = r),
            (this.keyCode = i));
        }
        equals(t) {
          return (
            t instanceof e &&
            this.ctrlKey === t.ctrlKey &&
            this.shiftKey === t.shiftKey &&
            this.altKey === t.altKey &&
            this.metaKey === t.metaKey &&
            this.keyCode === t.keyCode
          );
        }
        getHashCode() {
          return `K${this.ctrlKey ? `1` : `0`}${this.shiftKey ? `1` : `0`}${this.altKey ? `1` : `0`}${this.metaKey ? `1` : `0`}${this.keyCode}`;
        }
        isModifierKey() {
          return (
            this.keyCode === 0 ||
            this.keyCode === 5 ||
            this.keyCode === 57 ||
            this.keyCode === 6 ||
            this.keyCode === 4
          );
        }
        toKeybinding() {
          return new Rd([this]);
        }
        isDuplicateModifierCase() {
          return (
            (this.ctrlKey && this.keyCode === 5) ||
            (this.shiftKey && this.keyCode === 4) ||
            (this.altKey && this.keyCode === 6) ||
            (this.metaKey && this.keyCode === 57)
          );
        }
      }),
      (Rd = class {
        constructor(e) {
          if (e.length === 0) throw Zs(`chords`);
          this.chords = e;
        }
        getHashCode() {
          let e = ``;
          for (let t = 0, n = this.chords.length; t < n; t++)
            (t !== 0 && (e += `;`), (e += this.chords[t].getHashCode()));
          return e;
        }
        equals(e) {
          if (e === null || this.chords.length !== e.chords.length) return !1;
          for (let t = 0; t < this.chords.length; t++)
            if (!this.chords[t].equals(e.chords[t])) return !1;
          return !0;
        }
      }),
      (zd = Sd ? 256 : 2048),
      (Bd = 512),
      (Vd = 1024),
      (Hd = Sd ? 2048 : 256),
      (Ud = class {
        constructor(e) {
          this._standardKeyboardEventBrand = !0;
          let t = e;
          ((this.browserEvent = t),
            (this.target = t.target),
            (this.ctrlKey = t.ctrlKey),
            (this.shiftKey = t.shiftKey),
            (this.altKey = t.altKey),
            (this.metaKey = t.metaKey),
            (this.altGraphKey = t.getModifierState?.(`AltGraph`)),
            (this.keyCode = mc(t)),
            (this.code = t.code),
            (this.ctrlKey = this.ctrlKey || this.keyCode === 5),
            (this.altKey = this.altKey || this.keyCode === 6),
            (this.shiftKey = this.shiftKey || this.keyCode === 4),
            (this.metaKey = this.metaKey || this.keyCode === 57),
            (this._asKeybinding = this._computeKeybinding()),
            (this._asKeyCodeChord = this._computeKeyCodeChord()));
        }
        preventDefault() {
          this.browserEvent &&
            this.browserEvent.preventDefault &&
            this.browserEvent.preventDefault();
        }
        stopPropagation() {
          this.browserEvent &&
            this.browserEvent.stopPropagation &&
            this.browserEvent.stopPropagation();
        }
        toKeyCodeChord() {
          return this._asKeyCodeChord;
        }
        equals(e) {
          return this._asKeybinding === e;
        }
        _computeKeybinding() {
          let e = 0;
          this.keyCode !== 5 &&
            this.keyCode !== 4 &&
            this.keyCode !== 6 &&
            this.keyCode !== 57 &&
            (e = this.keyCode);
          let t = 0;
          return (
            this.ctrlKey && (t |= zd),
            this.altKey && (t |= Bd),
            this.shiftKey && (t |= Vd),
            this.metaKey && (t |= Hd),
            (t |= e),
            t
          );
        }
        _computeKeyCodeChord() {
          let e = 0;
          return (
            this.keyCode !== 5 &&
              this.keyCode !== 4 &&
              this.keyCode !== 6 &&
              this.keyCode !== 57 &&
              (e = this.keyCode),
            new Ld(this.ctrlKey, this.shiftKey, this.altKey, this.metaKey, e)
          );
        }
      }),
      (Wd = new WeakMap()),
      (Gd = class {
        static getSameOriginWindowChain(e) {
          let t = Wd.get(e);
          if (!t) {
            ((t = []), Wd.set(e, t));
            let n = e,
              r;
            do
              ((r = hc(n)),
                r
                  ? t.push({ window: new WeakRef(n), iframeElement: n.frameElement || null })
                  : t.push({ window: new WeakRef(n), iframeElement: null }),
                (n = r));
            while (n);
          }
          return t.slice(0);
        }
        static getPositionOfChildWindowRelativeToAncestorWindow(e, t) {
          if (!t || e === t) return { top: 0, left: 0 };
          let n = 0,
            r = 0,
            i = this.getSameOriginWindowChain(e);
          for (let e of i) {
            let i = e.window.deref();
            if (((n += i?.scrollY ?? 0), (r += i?.scrollX ?? 0), i === t || !e.iframeElement))
              break;
            let a = e.iframeElement.getBoundingClientRect();
            ((n += a.top), (r += a.left));
          }
          return { top: n, left: r };
        }
      }),
      (Kd = class {
        constructor(e, t) {
          ((this.timestamp = Date.now()),
            (this.browserEvent = t),
            (this.leftButton = t.button === 0),
            (this.middleButton = t.button === 1),
            (this.rightButton = t.button === 2),
            (this.buttons = t.buttons),
            (this.target = t.target),
            (this.detail = t.detail || 1),
            t.type === `dblclick` && (this.detail = 2),
            (this.ctrlKey = t.ctrlKey),
            (this.shiftKey = t.shiftKey),
            (this.altKey = t.altKey),
            (this.metaKey = t.metaKey),
            typeof t.pageX == `number`
              ? ((this.posx = t.pageX), (this.posy = t.pageY))
              : ((this.posx =
                  t.clientX +
                  this.target.ownerDocument.body.scrollLeft +
                  this.target.ownerDocument.documentElement.scrollLeft),
                (this.posy =
                  t.clientY +
                  this.target.ownerDocument.body.scrollTop +
                  this.target.ownerDocument.documentElement.scrollTop)));
          let n = Gd.getPositionOfChildWindowRelativeToAncestorWindow(e, t.view);
          ((this.posx -= n.left), (this.posy -= n.top));
        }
        preventDefault() {
          this.browserEvent.preventDefault();
        }
        stopPropagation() {
          this.browserEvent.stopPropagation();
        }
      }),
      (qd = class {
        constructor(e, t = 0, n = 0) {
          ((this.browserEvent = e || null),
            (this.target = e ? e.target || e.targetNode || e.srcElement : null),
            (this.deltaY = n),
            (this.deltaX = t));
          let r = !1;
          if (sd) {
            let e = navigator.userAgent.match(/Chrome\/(\d+)/);
            r = (e ? parseInt(e[1]) : 123) <= 122;
          }
          if (e) {
            let t = e,
              n = e,
              i = e.view?.devicePixelRatio || 1;
            if (typeof t.wheelDeltaY < `u`)
              r ? (this.deltaY = t.wheelDeltaY / (120 * i)) : (this.deltaY = t.wheelDeltaY / 120);
            else if (typeof n.VERTICAL_AXIS < `u` && n.axis === n.VERTICAL_AXIS)
              this.deltaY = -n.detail / 3;
            else if (e.type === `wheel`) {
              let t = e;
              t.deltaMode === t.DOM_DELTA_LINE
                ? ad && !Sd
                  ? (this.deltaY = -e.deltaY / 3)
                  : (this.deltaY = -e.deltaY)
                : (this.deltaY = -e.deltaY / 40);
            }
            if (typeof t.wheelDeltaX < `u`)
              cd && xd
                ? (this.deltaX = -(t.wheelDeltaX / 120))
                : r
                  ? (this.deltaX = t.wheelDeltaX / (120 * i))
                  : (this.deltaX = t.wheelDeltaX / 120);
            else if (typeof n.HORIZONTAL_AXIS < `u` && n.axis === n.HORIZONTAL_AXIS)
              this.deltaX = -e.detail / 3;
            else if (e.type === `wheel`) {
              let t = e;
              t.deltaMode === t.DOM_DELTA_LINE
                ? ad && !Sd
                  ? (this.deltaX = -e.deltaX / 3)
                  : (this.deltaX = -e.deltaX)
                : (this.deltaX = -e.deltaX / 40);
            }
            this.deltaY === 0 &&
              this.deltaX === 0 &&
              e.wheelDelta &&
              (r ? (this.deltaY = e.wheelDelta / (120 * i)) : (this.deltaY = e.wheelDelta / 120));
          }
        }
        preventDefault() {
          this.browserEvent?.preventDefault();
        }
        stopPropagation() {
          this.browserEvent?.stopPropagation();
        }
      }),
      (Jd = Object.freeze(function (e, t) {
        let n = setTimeout(e.bind(t), 0);
        return {
          dispose() {
            clearTimeout(n);
          },
        };
      })),
      ((e) => {
        function t(t) {
          return t === e.None || t === e.Cancelled || t instanceof Xd
            ? !0
            : !t || typeof t != `object`
              ? !1
              : typeof t.isCancellationRequested == `boolean` &&
                typeof t.onCancellationRequested == `function`;
        }
        ((e.isCancellationToken = t),
          (e.None = Object.freeze({
            isCancellationRequested: !1,
            onCancellationRequested: Vu.None,
          })),
          (e.Cancelled = Object.freeze({
            isCancellationRequested: !0,
            onCancellationRequested: Jd,
          })));
      })((Yd ||= {})),
      (Xd = class {
        constructor() {
          ((this._isCancelled = !1), (this._emitter = null));
        }
        cancel() {
          this._isCancelled ||
            ((this._isCancelled = !0),
            this._emitter && (this._emitter.fire(void 0), this.dispose()));
        }
        get isCancellationRequested() {
          return this._isCancelled;
        }
        get onCancellationRequested() {
          return this._isCancelled ? Jd : ((this._emitter ||= new K()), this._emitter.event);
        }
        dispose() {
          this._emitter &&= (this._emitter.dispose(), null);
        }
      }),
      (Zd = class {
        constructor(e, t) {
          ((this._isDisposed = !1),
            (this._token = -1),
            typeof e == `function` && typeof t == `number` && this.setIfNotSet(e, t));
        }
        dispose() {
          (this.cancel(), (this._isDisposed = !0));
        }
        cancel() {
          this._token !== -1 && (clearTimeout(this._token), (this._token = -1));
        }
        cancelAndSet(e, t) {
          if (this._isDisposed) throw new bu(`Calling 'cancelAndSet' on a disposed TimeoutTimer`);
          (this.cancel(),
            (this._token = setTimeout(() => {
              ((this._token = -1), e());
            }, t)));
        }
        setIfNotSet(e, t) {
          if (this._isDisposed) throw new bu(`Calling 'setIfNotSet' on a disposed TimeoutTimer`);
          this._token === -1 &&
            (this._token = setTimeout(() => {
              ((this._token = -1), e());
            }, t));
        }
      }),
      (Qd = class {
        constructor() {
          ((this.disposable = void 0), (this.isDisposed = !1));
        }
        cancel() {
          (this.disposable?.dispose(), (this.disposable = void 0));
        }
        cancelAndSet(e, t, n = globalThis) {
          if (this.isDisposed) throw new bu(`Calling 'cancelAndSet' on a disposed IntervalTimer`);
          this.cancel();
          let r = n.setInterval(() => {
            e();
          }, t);
          this.disposable = z(() => {
            (n.clearInterval(r), (this.disposable = void 0));
          });
        }
        dispose() {
          (this.cancel(), (this.isDisposed = !0));
        }
      }),
      (function () {
        typeof globalThis.requestIdleCallback != `function` || globalThis.cancelIdleCallback;
      })(),
      ((e) => {
        async function t(e) {
          let t,
            n = await Promise.all(
              e.map((e) =>
                e.then(
                  (e) => e,
                  (e) => {
                    t ||= e;
                  },
                ),
              ),
            );
          if (typeof t < `u`) throw t;
          return n;
        }
        e.settled = t;
        function n(e) {
          return new Promise(async (t, n) => {
            try {
              await e(t, n);
            } catch (e) {
              n(e);
            }
          });
        }
        e.withAsyncBody = n;
      })(($d ||= {})),
      (ef = class e {
        static fromArray(t) {
          return new e((e) => {
            e.emitMany(t);
          });
        }
        static fromPromise(t) {
          return new e(async (e) => {
            e.emitMany(await t);
          });
        }
        static fromPromises(t) {
          return new e(async (e) => {
            await Promise.all(t.map(async (t) => e.emitOne(await t)));
          });
        }
        static merge(t) {
          return new e(async (e) => {
            await Promise.all(
              t.map(async (t) => {
                for await (let n of t) e.emitOne(n);
              }),
            );
          });
        }
        constructor(e, t) {
          ((this._state = 0),
            (this._results = []),
            (this._error = null),
            (this._onReturn = t),
            (this._onStateChanged = new K()),
            queueMicrotask(async () => {
              let t = {
                emitOne: (e) => this.emitOne(e),
                emitMany: (e) => this.emitMany(e),
                reject: (e) => this.reject(e),
              };
              try {
                (await Promise.resolve(e(t)), this.resolve());
              } catch (e) {
                this.reject(e);
              } finally {
                ((t.emitOne = void 0), (t.emitMany = void 0), (t.reject = void 0));
              }
            }));
        }
        [Symbol.asyncIterator]() {
          let e = 0;
          return {
            next: async () => {
              do {
                if (this._state === 2) throw this._error;
                if (e < this._results.length) return { done: !1, value: this._results[e++] };
                if (this._state === 1) return { done: !0, value: void 0 };
                await Vu.toPromise(this._onStateChanged.event);
              } while (!0);
            },
            return: async () => (this._onReturn?.(), { done: !0, value: void 0 }),
          };
        }
        static map(t, n) {
          return new e(async (e) => {
            for await (let r of t) e.emitOne(n(r));
          });
        }
        map(t) {
          return e.map(this, t);
        }
        static filter(t, n) {
          return new e(async (e) => {
            for await (let r of t) n(r) && e.emitOne(r);
          });
        }
        filter(t) {
          return e.filter(this, t);
        }
        static coalesce(t) {
          return e.filter(t, (e) => !!e);
        }
        coalesce() {
          return e.coalesce(this);
        }
        static async toPromise(e) {
          let t = [];
          for await (let n of e) t.push(n);
          return t;
        }
        toPromise() {
          return e.toPromise(this);
        }
        emitOne(e) {
          this._state === 0 && (this._results.push(e), this._onStateChanged.fire());
        }
        emitMany(e) {
          this._state === 0 &&
            ((this._results = this._results.concat(e)), this._onStateChanged.fire());
        }
        resolve() {
          this._state === 0 && ((this._state = 1), this._onStateChanged.fire());
        }
        reject(e) {
          this._state === 0 && ((this._state = 2), (this._error = e), this._onStateChanged.fire());
        }
      }),
      (ef.EMPTY = ef.fromArray([])),
      (tf = class e {
        constructor() {
          ((this._h0 = 1732584193),
            (this._h1 = 4023233417),
            (this._h2 = 2562383102),
            (this._h3 = 271733878),
            (this._h4 = 3285377520),
            (this._buff = new Uint8Array(67)),
            (this._buffDV = new DataView(this._buff.buffer)),
            (this._buffLen = 0),
            (this._totalLen = 0),
            (this._leftoverHighSurrogate = 0),
            (this._finished = !1));
        }
        update(e) {
          let t = e.length;
          if (t === 0) return;
          let n = this._buff,
            r = this._buffLen,
            i = this._leftoverHighSurrogate,
            a,
            o;
          for (i === 0 ? ((a = e.charCodeAt(0)), (o = 0)) : ((a = i), (o = -1), (i = 0)); ; ) {
            let s = a;
            if (gc(a))
              if (o + 1 < t) {
                let t = e.charCodeAt(o + 1);
                _c(t) ? (o++, (s = vc(a, t))) : (s = 65533);
              } else {
                i = a;
                break;
              }
            else _c(a) && (s = 65533);
            if (((r = this._push(n, r, s)), o++, o < t)) a = e.charCodeAt(o);
            else break;
          }
          ((this._buffLen = r), (this._leftoverHighSurrogate = i));
        }
        _push(e, t, n) {
          return (
            n < 128
              ? (e[t++] = n)
              : n < 2048
                ? ((e[t++] = 192 | ((n & 1984) >>> 6)), (e[t++] = 128 | ((n & 63) >>> 0)))
                : n < 65536
                  ? ((e[t++] = 224 | ((n & 61440) >>> 12)),
                    (e[t++] = 128 | ((n & 4032) >>> 6)),
                    (e[t++] = 128 | ((n & 63) >>> 0)))
                  : ((e[t++] = 240 | ((n & 1835008) >>> 18)),
                    (e[t++] = 128 | ((n & 258048) >>> 12)),
                    (e[t++] = 128 | ((n & 4032) >>> 6)),
                    (e[t++] = 128 | ((n & 63) >>> 0))),
            t >= 64 &&
              (this._step(),
              (t -= 64),
              (this._totalLen += 64),
              (e[0] = e[64]),
              (e[1] = e[65]),
              (e[2] = e[66])),
            t
          );
        }
        digest() {
          return (
            this._finished ||
              ((this._finished = !0),
              this._leftoverHighSurrogate &&
                ((this._leftoverHighSurrogate = 0),
                (this._buffLen = this._push(this._buff, this._buffLen, 65533))),
              (this._totalLen += this._buffLen),
              this._wrapUp()),
            kc(this._h0) + kc(this._h1) + kc(this._h2) + kc(this._h3) + kc(this._h4)
          );
        }
        _wrapUp() {
          ((this._buff[this._buffLen++] = 128),
            Dc(this._buff, this._buffLen),
            this._buffLen > 56 && (this._step(), Dc(this._buff)));
          let e = 8 * this._totalLen;
          (this._buffDV.setUint32(56, Math.floor(e / 4294967296), !1),
            this._buffDV.setUint32(60, e % 4294967296, !1),
            this._step());
        }
        _step() {
          let t = e._bigBlock32,
            n = this._buffDV;
          for (let e = 0; e < 64; e += 4) t.setUint32(e, n.getUint32(e, !1), !1);
          for (let e = 64; e < 320; e += 4)
            t.setUint32(
              e,
              Ec(
                t.getUint32(e - 12, !1) ^
                  t.getUint32(e - 32, !1) ^
                  t.getUint32(e - 56, !1) ^
                  t.getUint32(e - 64, !1),
                1,
              ),
              !1,
            );
          let r = this._h0,
            i = this._h1,
            a = this._h2,
            o = this._h3,
            s = this._h4,
            c,
            l,
            u;
          for (let e = 0; e < 80; e++)
            (e < 20
              ? ((c = (i & a) | (~i & o)), (l = 1518500249))
              : e < 40
                ? ((c = i ^ a ^ o), (l = 1859775393))
                : e < 60
                  ? ((c = (i & a) | (i & o) | (a & o)), (l = 2400959708))
                  : ((c = i ^ a ^ o), (l = 3395469782)),
              (u = (Ec(r, 5) + c + s + l + t.getUint32(e * 4, !1)) & 4294967295),
              (s = o),
              (o = a),
              (a = Ec(i, 30)),
              (i = r),
              (r = u));
          ((this._h0 = (this._h0 + r) & 4294967295),
            (this._h1 = (this._h1 + i) & 4294967295),
            (this._h2 = (this._h2 + a) & 4294967295),
            (this._h3 = (this._h3 + o) & 4294967295),
            (this._h4 = (this._h4 + s) & 4294967295));
        }
      }),
      (tf._bigBlock32 = new DataView(new ArrayBuffer(320))),
      ({
        registerWindow: nf,
        getWindow: rf,
        getDocument: af,
        getWindows: of,
        getWindowsCount: sf,
        getWindowId: cf,
        getWindowById: lf,
        hasWindow: uf,
        onDidRegisterWindow: df,
        onWillUnregisterWindow: ff,
        onDidUnregisterWindow: pf,
      } = (function () {
        let e = new Map(),
          t = { window: Nu, disposables: new ju() };
        e.set(Nu.vscodeWindowId, t);
        let n = new K(),
          r = new K(),
          i = new K();
        function a(n, r) {
          return (typeof n == `number` ? e.get(n) : void 0) ?? (r ? t : void 0);
        }
        return {
          onDidRegisterWindow: n.event,
          onWillUnregisterWindow: i.event,
          onDidUnregisterWindow: r.event,
          registerWindow(t) {
            if (e.has(t.vscodeWindowId)) return W.None;
            let a = new ju(),
              o = { window: t, disposables: a.add(new ju()) };
            return (
              e.set(t.vscodeWindowId, o),
              a.add(
                z(() => {
                  (e.delete(t.vscodeWindowId), r.fire(t));
                }),
              ),
              a.add(
                B(t, bf.BEFORE_UNLOAD, () => {
                  i.fire(t);
                }),
              ),
              n.fire(o),
              a
            );
          },
          getWindows() {
            return e.values();
          },
          getWindowsCount() {
            return e.size;
          },
          getWindowId(e) {
            return e.vscodeWindowId;
          },
          hasWindow(t) {
            return e.has(t);
          },
          getWindowById: a,
          getWindow(e) {
            let t = e;
            if (t?.ownerDocument?.defaultView) return t.ownerDocument.defaultView.window;
            let n = e;
            return n?.view ? n.view.window : Nu;
          },
          getDocument(e) {
            return rf(e).document;
          },
        };
      })()),
      (mf = class {
        constructor(e, t, n, r) {
          ((this._node = e),
            (this._type = t),
            (this._handler = n),
            (this._options = r || !1),
            this._node.addEventListener(this._type, this._handler, this._options));
        }
        dispose() {
          this._handler &&=
            (this._node.removeEventListener(this._type, this._handler, this._options),
            (this._node = null),
            null);
        }
      }),
      (hf = function (e, t, n, r) {
        let i = n;
        return (
          t === `click` || t === `mousedown` || t === `contextmenu`
            ? (i = Ac(rf(e), n))
            : (t === `keydown` || t === `keypress` || t === `keyup`) && (i = jc(n)),
          B(e, t, i, r)
        );
      }),
      (_f = class extends Qd {
        constructor(e) {
          (super(), (this.defaultTarget = e && rf(e)));
        }
        cancelAndSet(e, t, n) {
          return super.cancelAndSet(e, t, n ?? this.defaultTarget);
        }
      }),
      (vf = class {
        constructor(e, t = 0) {
          ((this._runner = e), (this.priority = t), (this._canceled = !1));
        }
        dispose() {
          this._canceled = !0;
        }
        execute() {
          if (!this._canceled)
            try {
              this._runner();
            } catch (e) {
              Ys(e);
            }
        }
        static sort(e, t) {
          return t.priority - e.priority;
        }
      }),
      (function () {
        let e = new Map(),
          t = new Map(),
          n = new Map(),
          r = new Map(),
          i = (i) => {
            n.set(i, !1);
            let a = e.get(i) ?? [];
            for (t.set(i, a), e.set(i, []), r.set(i, !0); a.length > 0; )
              (a.sort(vf.sort), a.shift().execute());
            r.set(i, !1);
          };
        gf = (t, r, a = 0) => {
          let o = cf(t),
            s = new vf(r, a),
            c = e.get(o);
          return (
            c || ((c = []), e.set(o, c)),
            c.push(s),
            n.get(o) || (n.set(o, !0), t.requestAnimationFrame(() => i(o))),
            s
          );
        };
      })(),
      (yf = class e {
        constructor(e, t) {
          ((this.width = e), (this.height = t));
        }
        with(t = this.width, n = this.height) {
          return t !== this.width || n !== this.height ? new e(t, n) : this;
        }
        static is(e) {
          return typeof e == `object` && typeof e.height == `number` && typeof e.width == `number`;
        }
        static lift(t) {
          return t instanceof e ? t : new e(t.width, t.height);
        }
        static equals(e, t) {
          return e === t ? !0 : !e || !t ? !1 : e.width === t.width && e.height === t.height;
        }
      }),
      (yf.None = new yf(0, 0)),
      new (class {
        constructor() {
          this.mutationObservers = new Map();
        }
        observe(e, t, n) {
          let r = this.mutationObservers.get(e);
          r || ((r = new Map()), this.mutationObservers.set(e, r));
          let i = yc(n),
            a = r.get(i);
          if (a) a.users += 1;
          else {
            let o = new K(),
              s = new MutationObserver((e) => o.fire(e));
            s.observe(e, n);
            let c = (a = { users: 1, observer: s, onDidMutate: o.event });
            (t.add(
              z(() => {
                (--c.users,
                  c.users === 0 &&
                    (o.dispose(),
                    s.disconnect(),
                    r?.delete(i),
                    r?.size === 0 && this.mutationObservers.delete(e)));
              }),
            ),
              r.set(i, a));
          }
          return a.onDidMutate;
        }
      })(),
      (bf = {
        CLICK: `click`,
        AUXCLICK: `auxclick`,
        DBLCLICK: `dblclick`,
        MOUSE_UP: `mouseup`,
        MOUSE_DOWN: `mousedown`,
        MOUSE_OVER: `mouseover`,
        MOUSE_MOVE: `mousemove`,
        MOUSE_OUT: `mouseout`,
        MOUSE_ENTER: `mouseenter`,
        MOUSE_LEAVE: `mouseleave`,
        MOUSE_WHEEL: `wheel`,
        POINTER_UP: `pointerup`,
        POINTER_DOWN: `pointerdown`,
        POINTER_MOVE: `pointermove`,
        POINTER_LEAVE: `pointerleave`,
        CONTEXT_MENU: `contextmenu`,
        WHEEL: `wheel`,
        KEY_DOWN: `keydown`,
        KEY_PRESS: `keypress`,
        KEY_UP: `keyup`,
        LOAD: `load`,
        BEFORE_UNLOAD: `beforeunload`,
        UNLOAD: `unload`,
        PAGE_SHOW: `pageshow`,
        PAGE_HIDE: `pagehide`,
        PASTE: `paste`,
        ABORT: `abort`,
        ERROR: `error`,
        RESIZE: `resize`,
        SCROLL: `scroll`,
        FULLSCREEN_CHANGE: `fullscreenchange`,
        WK_FULLSCREEN_CHANGE: `webkitfullscreenchange`,
        SELECT: `select`,
        CHANGE: `change`,
        SUBMIT: `submit`,
        RESET: `reset`,
        FOCUS: `focus`,
        FOCUS_IN: `focusin`,
        FOCUS_OUT: `focusout`,
        BLUR: `blur`,
        INPUT: `input`,
        STORAGE: `storage`,
        DRAG_START: `dragstart`,
        DRAG: `drag`,
        DRAG_ENTER: `dragenter`,
        DRAG_LEAVE: `dragleave`,
        DRAG_OVER: `dragover`,
        DROP: `drop`,
        DRAG_END: `dragend`,
        ANIMATION_START: od ? `webkitAnimationStart` : `animationstart`,
        ANIMATION_END: od ? `webkitAnimationEnd` : `animationend`,
        ANIMATION_ITERATION: od ? `webkitAnimationIteration` : `animationiteration`,
      }),
      (xf = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/),
      (Pc.SVG = function (e, t, ...n) {
        return Nc(`http://www.w3.org/2000/svg`, e, t, ...n);
      }),
      (Sf = class {
        constructor(e) {
          ((this.domNode = e),
            (this._maxWidth = ``),
            (this._width = ``),
            (this._height = ``),
            (this._top = ``),
            (this._left = ``),
            (this._bottom = ``),
            (this._right = ``),
            (this._paddingTop = ``),
            (this._paddingLeft = ``),
            (this._paddingBottom = ``),
            (this._paddingRight = ``),
            (this._fontFamily = ``),
            (this._fontWeight = ``),
            (this._fontSize = ``),
            (this._fontStyle = ``),
            (this._fontFeatureSettings = ``),
            (this._fontVariationSettings = ``),
            (this._textDecoration = ``),
            (this._lineHeight = ``),
            (this._letterSpacing = ``),
            (this._className = ``),
            (this._display = ``),
            (this._position = ``),
            (this._visibility = ``),
            (this._color = ``),
            (this._backgroundColor = ``),
            (this._layerHint = !1),
            (this._contain = `none`),
            (this._boxShadow = ``));
        }
        setMaxWidth(e) {
          let t = Fc(e);
          this._maxWidth !== t &&
            ((this._maxWidth = t), (this.domNode.style.maxWidth = this._maxWidth));
        }
        setWidth(e) {
          let t = Fc(e);
          this._width !== t && ((this._width = t), (this.domNode.style.width = this._width));
        }
        setHeight(e) {
          let t = Fc(e);
          this._height !== t && ((this._height = t), (this.domNode.style.height = this._height));
        }
        setTop(e) {
          let t = Fc(e);
          this._top !== t && ((this._top = t), (this.domNode.style.top = this._top));
        }
        setLeft(e) {
          let t = Fc(e);
          this._left !== t && ((this._left = t), (this.domNode.style.left = this._left));
        }
        setBottom(e) {
          let t = Fc(e);
          this._bottom !== t && ((this._bottom = t), (this.domNode.style.bottom = this._bottom));
        }
        setRight(e) {
          let t = Fc(e);
          this._right !== t && ((this._right = t), (this.domNode.style.right = this._right));
        }
        setPaddingTop(e) {
          let t = Fc(e);
          this._paddingTop !== t &&
            ((this._paddingTop = t), (this.domNode.style.paddingTop = this._paddingTop));
        }
        setPaddingLeft(e) {
          let t = Fc(e);
          this._paddingLeft !== t &&
            ((this._paddingLeft = t), (this.domNode.style.paddingLeft = this._paddingLeft));
        }
        setPaddingBottom(e) {
          let t = Fc(e);
          this._paddingBottom !== t &&
            ((this._paddingBottom = t), (this.domNode.style.paddingBottom = this._paddingBottom));
        }
        setPaddingRight(e) {
          let t = Fc(e);
          this._paddingRight !== t &&
            ((this._paddingRight = t), (this.domNode.style.paddingRight = this._paddingRight));
        }
        setFontFamily(e) {
          this._fontFamily !== e &&
            ((this._fontFamily = e), (this.domNode.style.fontFamily = this._fontFamily));
        }
        setFontWeight(e) {
          this._fontWeight !== e &&
            ((this._fontWeight = e), (this.domNode.style.fontWeight = this._fontWeight));
        }
        setFontSize(e) {
          let t = Fc(e);
          this._fontSize !== t &&
            ((this._fontSize = t), (this.domNode.style.fontSize = this._fontSize));
        }
        setFontStyle(e) {
          this._fontStyle !== e &&
            ((this._fontStyle = e), (this.domNode.style.fontStyle = this._fontStyle));
        }
        setFontFeatureSettings(e) {
          this._fontFeatureSettings !== e &&
            ((this._fontFeatureSettings = e),
            (this.domNode.style.fontFeatureSettings = this._fontFeatureSettings));
        }
        setFontVariationSettings(e) {
          this._fontVariationSettings !== e &&
            ((this._fontVariationSettings = e),
            (this.domNode.style.fontVariationSettings = this._fontVariationSettings));
        }
        setTextDecoration(e) {
          this._textDecoration !== e &&
            ((this._textDecoration = e),
            (this.domNode.style.textDecoration = this._textDecoration));
        }
        setLineHeight(e) {
          let t = Fc(e);
          this._lineHeight !== t &&
            ((this._lineHeight = t), (this.domNode.style.lineHeight = this._lineHeight));
        }
        setLetterSpacing(e) {
          let t = Fc(e);
          this._letterSpacing !== t &&
            ((this._letterSpacing = t), (this.domNode.style.letterSpacing = this._letterSpacing));
        }
        setClassName(e) {
          this._className !== e &&
            ((this._className = e), (this.domNode.className = this._className));
        }
        toggleClassName(e, t) {
          (this.domNode.classList.toggle(e, t), (this._className = this.domNode.className));
        }
        setDisplay(e) {
          this._display !== e &&
            ((this._display = e), (this.domNode.style.display = this._display));
        }
        setPosition(e) {
          this._position !== e &&
            ((this._position = e), (this.domNode.style.position = this._position));
        }
        setVisibility(e) {
          this._visibility !== e &&
            ((this._visibility = e), (this.domNode.style.visibility = this._visibility));
        }
        setColor(e) {
          this._color !== e && ((this._color = e), (this.domNode.style.color = this._color));
        }
        setBackgroundColor(e) {
          this._backgroundColor !== e &&
            ((this._backgroundColor = e),
            (this.domNode.style.backgroundColor = this._backgroundColor));
        }
        setLayerHinting(e) {
          this._layerHint !== e &&
            ((this._layerHint = e),
            (this.domNode.style.transform = this._layerHint ? `translate3d(0px, 0px, 0px)` : ``));
        }
        setBoxShadow(e) {
          this._boxShadow !== e && ((this._boxShadow = e), (this.domNode.style.boxShadow = e));
        }
        setContain(e) {
          this._contain !== e &&
            ((this._contain = e), (this.domNode.style.contain = this._contain));
        }
        setAttribute(e, t) {
          this.domNode.setAttribute(e, t);
        }
        removeAttribute(e) {
          this.domNode.removeAttribute(e);
        }
        appendChild(e) {
          this.domNode.appendChild(e.domNode);
        }
        removeChild(e) {
          this.domNode.removeChild(e.domNode);
        }
      }),
      (Cf = class {
        constructor() {
          ((this._hooks = new ju()),
            (this._pointerMoveCallback = null),
            (this._onStopCallback = null));
        }
        dispose() {
          (this.stopMonitoring(!1), this._hooks.dispose());
        }
        stopMonitoring(e, t) {
          if (!this.isMonitoring()) return;
          (this._hooks.clear(), (this._pointerMoveCallback = null));
          let n = this._onStopCallback;
          ((this._onStopCallback = null), e && n && n(t));
        }
        isMonitoring() {
          return !!this._pointerMoveCallback;
        }
        startMonitoring(e, t, n, r, i) {
          (this.isMonitoring() && this.stopMonitoring(!1),
            (this._pointerMoveCallback = r),
            (this._onStopCallback = i));
          let a = e;
          try {
            (e.setPointerCapture(t),
              this._hooks.add(
                z(() => {
                  try {
                    e.releasePointerCapture(t);
                  } catch {}
                }),
              ));
          } catch {
            a = rf(e);
          }
          (this._hooks.add(
            B(a, bf.POINTER_MOVE, (e) => {
              if (e.buttons !== n) {
                this.stopMonitoring(!0);
                return;
              }
              (e.preventDefault(), this._pointerMoveCallback(e));
            }),
          ),
            this._hooks.add(B(a, bf.POINTER_UP, (e) => this.stopMonitoring(!0))));
        }
      }),
      ((e) => (
        (e.Tap = `-xterm-gesturetap`),
        (e.Change = `-xterm-gesturechange`),
        (e.Start = `-xterm-gesturestart`),
        (e.End = `-xterm-gesturesend`),
        (e.Contextmenu = `-xterm-gesturecontextmenu`)
      ))((wf ||= {})),
      (Tf = class e extends W {
        constructor() {
          (super(),
            (this.dispatched = !1),
            (this.targets = new Fu()),
            (this.ignoreTargets = new Fu()),
            (this.activeTouches = {}),
            (this.handle = null),
            (this._lastSetTapCountTime = 0),
            this._register(
              Vu.runAndSubscribe(
                df,
                ({ window: e, disposables: t }) => {
                  (t.add(B(e.document, `touchstart`, (e) => this.onTouchStart(e), { passive: !1 })),
                    t.add(B(e.document, `touchend`, (t) => this.onTouchEnd(e, t))),
                    t.add(B(e.document, `touchmove`, (e) => this.onTouchMove(e), { passive: !1 })));
                },
                { window: Nu, disposables: this._store },
              ),
            ));
        }
        static addTarget(t) {
          return e.isTouchDevice()
            ? ((e.INSTANCE ||= cc(new e())), z(e.INSTANCE.targets.push(t)))
            : W.None;
        }
        static ignoreTarget(t) {
          return e.isTouchDevice()
            ? ((e.INSTANCE ||= cc(new e())), z(e.INSTANCE.ignoreTargets.push(t)))
            : W.None;
        }
        static isTouchDevice() {
          return `ontouchstart` in Nu || navigator.maxTouchPoints > 0;
        }
        dispose() {
          ((this.handle &&= (this.handle.dispose(), null)), super.dispose());
        }
        onTouchStart(e) {
          let t = Date.now();
          this.handle &&= (this.handle.dispose(), null);
          for (let n = 0, r = e.targetTouches.length; n < r; n++) {
            let r = e.targetTouches.item(n);
            this.activeTouches[r.identifier] = {
              id: r.identifier,
              initialTarget: r.target,
              initialTimeStamp: t,
              initialPageX: r.pageX,
              initialPageY: r.pageY,
              rollingTimestamps: [t],
              rollingPageX: [r.pageX],
              rollingPageY: [r.pageY],
            };
            let i = this.newGestureEvent(wf.Start, r.target);
            ((i.pageX = r.pageX), (i.pageY = r.pageY), this.dispatchEvent(i));
          }
          this.dispatched &&= (e.preventDefault(), e.stopPropagation(), !1);
        }
        onTouchEnd(t, n) {
          let r = Date.now(),
            i = Object.keys(this.activeTouches).length;
          for (let a = 0, o = n.changedTouches.length; a < o; a++) {
            let o = n.changedTouches.item(a);
            if (!this.activeTouches.hasOwnProperty(String(o.identifier))) {
              console.warn(`move of an UNKNOWN touch`, o);
              continue;
            }
            let s = this.activeTouches[o.identifier],
              c = Date.now() - s.initialTimeStamp;
            if (
              c < e.HOLD_DELAY &&
              Math.abs(s.initialPageX - $s(s.rollingPageX)) < 30 &&
              Math.abs(s.initialPageY - $s(s.rollingPageY)) < 30
            ) {
              let e = this.newGestureEvent(wf.Tap, s.initialTarget);
              ((e.pageX = $s(s.rollingPageX)),
                (e.pageY = $s(s.rollingPageY)),
                this.dispatchEvent(e));
            } else if (
              c >= e.HOLD_DELAY &&
              Math.abs(s.initialPageX - $s(s.rollingPageX)) < 30 &&
              Math.abs(s.initialPageY - $s(s.rollingPageY)) < 30
            ) {
              let e = this.newGestureEvent(wf.Contextmenu, s.initialTarget);
              ((e.pageX = $s(s.rollingPageX)),
                (e.pageY = $s(s.rollingPageY)),
                this.dispatchEvent(e));
            } else if (i === 1) {
              let e = $s(s.rollingPageX),
                n = $s(s.rollingPageY),
                i = $s(s.rollingTimestamps) - s.rollingTimestamps[0],
                a = e - s.rollingPageX[0],
                o = n - s.rollingPageY[0],
                c = [...this.targets].filter(
                  (e) => s.initialTarget instanceof Node && e.contains(s.initialTarget),
                );
              this.inertia(
                t,
                c,
                r,
                Math.abs(a) / i,
                a > 0 ? 1 : -1,
                e,
                Math.abs(o) / i,
                o > 0 ? 1 : -1,
                n,
              );
            }
            (this.dispatchEvent(this.newGestureEvent(wf.End, s.initialTarget)),
              delete this.activeTouches[o.identifier]);
          }
          this.dispatched &&= (n.preventDefault(), n.stopPropagation(), !1);
        }
        newGestureEvent(e, t) {
          let n = document.createEvent(`CustomEvent`);
          return (n.initEvent(e, !1, !0), (n.initialTarget = t), (n.tapCount = 0), n);
        }
        dispatchEvent(t) {
          if (t.type === wf.Tap) {
            let n = new Date().getTime(),
              r = 0;
            ((r = n - this._lastSetTapCountTime > e.CLEAR_TAP_COUNT_TIME ? 1 : 2),
              (this._lastSetTapCountTime = n),
              (t.tapCount = r));
          } else
            (t.type === wf.Change || t.type === wf.Contextmenu) && (this._lastSetTapCountTime = 0);
          if (t.initialTarget instanceof Node) {
            for (let e of this.ignoreTargets) if (e.contains(t.initialTarget)) return;
            let e = [];
            for (let n of this.targets)
              if (n.contains(t.initialTarget)) {
                let r = 0,
                  i = t.initialTarget;
                for (; i && i !== n; ) (r++, (i = i.parentElement));
                e.push([r, n]);
              }
            e.sort((e, t) => e[0] - t[0]);
            for (let [n, r] of e) (r.dispatchEvent(t), (this.dispatched = !0));
          }
        }
        inertia(t, n, r, i, a, o, s, c, l) {
          this.handle = gf(t, () => {
            let u = Date.now(),
              d = u - r,
              f = 0,
              p = 0,
              m = !0;
            ((i += e.SCROLL_FRICTION * d),
              (s += e.SCROLL_FRICTION * d),
              i > 0 && ((m = !1), (f = a * i * d)),
              s > 0 && ((m = !1), (p = c * s * d)));
            let h = this.newGestureEvent(wf.Change);
            ((h.translationX = f),
              (h.translationY = p),
              n.forEach((e) => e.dispatchEvent(h)),
              m || this.inertia(t, n, u, i, a, o + f, s, c, l + p));
          });
        }
        onTouchMove(e) {
          let t = Date.now();
          for (let n = 0, r = e.changedTouches.length; n < r; n++) {
            let r = e.changedTouches.item(n);
            if (!this.activeTouches.hasOwnProperty(String(r.identifier))) {
              console.warn(`end of an UNKNOWN touch`, r);
              continue;
            }
            let i = this.activeTouches[r.identifier],
              a = this.newGestureEvent(wf.Change, i.initialTarget);
            ((a.translationX = r.pageX - $s(i.rollingPageX)),
              (a.translationY = r.pageY - $s(i.rollingPageY)),
              (a.pageX = r.pageX),
              (a.pageY = r.pageY),
              this.dispatchEvent(a),
              i.rollingPageX.length > 3 &&
                (i.rollingPageX.shift(), i.rollingPageY.shift(), i.rollingTimestamps.shift()),
              i.rollingPageX.push(r.pageX),
              i.rollingPageY.push(r.pageY),
              i.rollingTimestamps.push(t));
          }
          this.dispatched &&= (e.preventDefault(), e.stopPropagation(), !1);
        }
      }),
      (Tf.SCROLL_FRICTION = -0.005),
      (Tf.HOLD_DELAY = 700),
      (Tf.CLEAR_TAP_COUNT_TIME = 400),
      H([Lc], Tf, `isTouchDevice`, 1),
      (Ef = Tf),
      (Df = class extends W {
        onclick(e, t) {
          this._register(B(e, bf.CLICK, (n) => t(new Kd(rf(e), n))));
        }
        onmousedown(e, t) {
          this._register(B(e, bf.MOUSE_DOWN, (n) => t(new Kd(rf(e), n))));
        }
        onmouseover(e, t) {
          this._register(B(e, bf.MOUSE_OVER, (n) => t(new Kd(rf(e), n))));
        }
        onmouseleave(e, t) {
          this._register(B(e, bf.MOUSE_LEAVE, (n) => t(new Kd(rf(e), n))));
        }
        onkeydown(e, t) {
          this._register(B(e, bf.KEY_DOWN, (e) => t(new Ud(e))));
        }
        onkeyup(e, t) {
          this._register(B(e, bf.KEY_UP, (e) => t(new Ud(e))));
        }
        oninput(e, t) {
          this._register(B(e, bf.INPUT, t));
        }
        onblur(e, t) {
          this._register(B(e, bf.BLUR, t));
        }
        onfocus(e, t) {
          this._register(B(e, bf.FOCUS, t));
        }
        onchange(e, t) {
          this._register(B(e, bf.CHANGE, t));
        }
        ignoreGesture(e) {
          return Ef.ignoreTarget(e);
        }
      }),
      (Of = 11),
      (kf = class extends Df {
        constructor(e) {
          (super(),
            (this._onActivate = e.onActivate),
            (this.bgDomNode = document.createElement(`div`)),
            (this.bgDomNode.className = `arrow-background`),
            (this.bgDomNode.style.position = `absolute`),
            (this.bgDomNode.style.width = e.bgWidth + `px`),
            (this.bgDomNode.style.height = e.bgHeight + `px`),
            typeof e.top < `u` && (this.bgDomNode.style.top = `0px`),
            typeof e.left < `u` && (this.bgDomNode.style.left = `0px`),
            typeof e.bottom < `u` && (this.bgDomNode.style.bottom = `0px`),
            typeof e.right < `u` && (this.bgDomNode.style.right = `0px`),
            (this.domNode = document.createElement(`div`)),
            (this.domNode.className = e.className),
            (this.domNode.style.position = `absolute`),
            (this.domNode.style.width = Of + `px`),
            (this.domNode.style.height = Of + `px`),
            typeof e.top < `u` && (this.domNode.style.top = e.top + `px`),
            typeof e.left < `u` && (this.domNode.style.left = e.left + `px`),
            typeof e.bottom < `u` && (this.domNode.style.bottom = e.bottom + `px`),
            typeof e.right < `u` && (this.domNode.style.right = e.right + `px`),
            (this._pointerMoveMonitor = this._register(new Cf())),
            this._register(hf(this.bgDomNode, bf.POINTER_DOWN, (e) => this._arrowPointerDown(e))),
            this._register(hf(this.domNode, bf.POINTER_DOWN, (e) => this._arrowPointerDown(e))),
            (this._pointerdownRepeatTimer = this._register(new _f())),
            (this._pointerdownScheduleRepeatTimer = this._register(new Zd())));
        }
        _arrowPointerDown(e) {
          !e.target ||
            !(e.target instanceof Element) ||
            (this._onActivate(),
            this._pointerdownRepeatTimer.cancel(),
            this._pointerdownScheduleRepeatTimer.cancelAndSet(() => {
              this._pointerdownRepeatTimer.cancelAndSet(() => this._onActivate(), 1e3 / 24, rf(e));
            }, 200),
            this._pointerMoveMonitor.startMonitoring(
              e.target,
              e.pointerId,
              e.buttons,
              (e) => {},
              () => {
                (this._pointerdownRepeatTimer.cancel(),
                  this._pointerdownScheduleRepeatTimer.cancel());
              },
            ),
            e.preventDefault());
        }
      }),
      (Af = class e {
        constructor(e, t, n, r, i, a, o) {
          ((this._forceIntegerValues = e),
            (this._scrollStateBrand = void 0),
            this._forceIntegerValues &&
              ((t |= 0), (n |= 0), (r |= 0), (i |= 0), (a |= 0), (o |= 0)),
            (this.rawScrollLeft = r),
            (this.rawScrollTop = o),
            t < 0 && (t = 0),
            r + t > n && (r = n - t),
            r < 0 && (r = 0),
            i < 0 && (i = 0),
            o + i > a && (o = a - i),
            o < 0 && (o = 0),
            (this.width = t),
            (this.scrollWidth = n),
            (this.scrollLeft = r),
            (this.height = i),
            (this.scrollHeight = a),
            (this.scrollTop = o));
        }
        equals(e) {
          return (
            this.rawScrollLeft === e.rawScrollLeft &&
            this.rawScrollTop === e.rawScrollTop &&
            this.width === e.width &&
            this.scrollWidth === e.scrollWidth &&
            this.scrollLeft === e.scrollLeft &&
            this.height === e.height &&
            this.scrollHeight === e.scrollHeight &&
            this.scrollTop === e.scrollTop
          );
        }
        withScrollDimensions(t, n) {
          return new e(
            this._forceIntegerValues,
            typeof t.width < `u` ? t.width : this.width,
            typeof t.scrollWidth < `u` ? t.scrollWidth : this.scrollWidth,
            n ? this.rawScrollLeft : this.scrollLeft,
            typeof t.height < `u` ? t.height : this.height,
            typeof t.scrollHeight < `u` ? t.scrollHeight : this.scrollHeight,
            n ? this.rawScrollTop : this.scrollTop,
          );
        }
        withScrollPosition(t) {
          return new e(
            this._forceIntegerValues,
            this.width,
            this.scrollWidth,
            typeof t.scrollLeft < `u` ? t.scrollLeft : this.rawScrollLeft,
            this.height,
            this.scrollHeight,
            typeof t.scrollTop < `u` ? t.scrollTop : this.rawScrollTop,
          );
        }
        createScrollEvent(e, t) {
          let n = this.width !== e.width,
            r = this.scrollWidth !== e.scrollWidth,
            i = this.scrollLeft !== e.scrollLeft,
            a = this.height !== e.height,
            o = this.scrollHeight !== e.scrollHeight,
            s = this.scrollTop !== e.scrollTop;
          return {
            inSmoothScrolling: t,
            oldWidth: e.width,
            oldScrollWidth: e.scrollWidth,
            oldScrollLeft: e.scrollLeft,
            width: this.width,
            scrollWidth: this.scrollWidth,
            scrollLeft: this.scrollLeft,
            oldHeight: e.height,
            oldScrollHeight: e.scrollHeight,
            oldScrollTop: e.scrollTop,
            height: this.height,
            scrollHeight: this.scrollHeight,
            scrollTop: this.scrollTop,
            widthChanged: n,
            scrollWidthChanged: r,
            scrollLeftChanged: i,
            heightChanged: a,
            scrollHeightChanged: o,
            scrollTopChanged: s,
          };
        }
      }),
      (jf = class extends W {
        constructor(e) {
          (super(),
            (this._scrollableBrand = void 0),
            (this._onScroll = this._register(new K())),
            (this.onScroll = this._onScroll.event),
            (this._smoothScrollDuration = e.smoothScrollDuration),
            (this._scheduleAtNextAnimationFrame = e.scheduleAtNextAnimationFrame),
            (this._state = new Af(e.forceIntegerValues, 0, 0, 0, 0, 0, 0)),
            (this._smoothScrolling = null));
        }
        dispose() {
          ((this._smoothScrolling &&= (this._smoothScrolling.dispose(), null)), super.dispose());
        }
        setSmoothScrollDuration(e) {
          this._smoothScrollDuration = e;
        }
        validateScrollPosition(e) {
          return this._state.withScrollPosition(e);
        }
        getScrollDimensions() {
          return this._state;
        }
        setScrollDimensions(e, t) {
          let n = this._state.withScrollDimensions(e, t);
          (this._setState(n, !!this._smoothScrolling),
            this._smoothScrolling?.acceptScrollDimensions(this._state));
        }
        getFutureScrollPosition() {
          return this._smoothScrolling ? this._smoothScrolling.to : this._state;
        }
        getCurrentScrollPosition() {
          return this._state;
        }
        setScrollPositionNow(e) {
          let t = this._state.withScrollPosition(e);
          ((this._smoothScrolling &&= (this._smoothScrolling.dispose(), null)),
            this._setState(t, !1));
        }
        setScrollPositionSmooth(e, t) {
          if (this._smoothScrollDuration === 0) return this.setScrollPositionNow(e);
          if (this._smoothScrolling) {
            e = {
              scrollLeft:
                typeof e.scrollLeft > `u` ? this._smoothScrolling.to.scrollLeft : e.scrollLeft,
              scrollTop:
                typeof e.scrollTop > `u` ? this._smoothScrolling.to.scrollTop : e.scrollTop,
            };
            let n = this._state.withScrollPosition(e);
            if (
              this._smoothScrolling.to.scrollLeft === n.scrollLeft &&
              this._smoothScrolling.to.scrollTop === n.scrollTop
            )
              return;
            let r;
            ((r = t
              ? new Nf(
                  this._smoothScrolling.from,
                  n,
                  this._smoothScrolling.startTime,
                  this._smoothScrolling.duration,
                )
              : this._smoothScrolling.combine(this._state, n, this._smoothScrollDuration)),
              this._smoothScrolling.dispose(),
              (this._smoothScrolling = r));
          } else {
            let t = this._state.withScrollPosition(e);
            this._smoothScrolling = Nf.start(this._state, t, this._smoothScrollDuration);
          }
          this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(
            () => {
              this._smoothScrolling &&
                ((this._smoothScrolling.animationFrameDisposable = null),
                this._performSmoothScrolling());
            },
          );
        }
        hasPendingScrollAnimation() {
          return !!this._smoothScrolling;
        }
        _performSmoothScrolling() {
          if (!this._smoothScrolling) return;
          let e = this._smoothScrolling.tick(),
            t = this._state.withScrollPosition(e);
          if ((this._setState(t, !0), this._smoothScrolling)) {
            if (e.isDone) {
              (this._smoothScrolling.dispose(), (this._smoothScrolling = null));
              return;
            }
            this._smoothScrolling.animationFrameDisposable = this._scheduleAtNextAnimationFrame(
              () => {
                this._smoothScrolling &&
                  ((this._smoothScrolling.animationFrameDisposable = null),
                  this._performSmoothScrolling());
              },
            );
          }
        }
        _setState(e, t) {
          let n = this._state;
          n.equals(e) ||
            ((this._state = e), this._onScroll.fire(this._state.createScrollEvent(n, t)));
        }
      }),
      (Mf = class {
        constructor(e, t, n) {
          ((this.scrollLeft = e), (this.scrollTop = t), (this.isDone = n));
        }
      }),
      (Nf = class e {
        constructor(e, t, n, r) {
          ((this.from = e),
            (this.to = t),
            (this.duration = r),
            (this.startTime = n),
            (this.animationFrameDisposable = null),
            this._initAnimations());
        }
        _initAnimations() {
          ((this.scrollLeft = this._initAnimation(
            this.from.scrollLeft,
            this.to.scrollLeft,
            this.to.width,
          )),
            (this.scrollTop = this._initAnimation(
              this.from.scrollTop,
              this.to.scrollTop,
              this.to.height,
            )));
        }
        _initAnimation(e, t, n) {
          if (Math.abs(e - t) > 2.5 * n) {
            let r, i;
            return (
              e < t
                ? ((r = e + 0.75 * n), (i = t - 0.75 * n))
                : ((r = e - 0.75 * n), (i = t + 0.75 * n)),
              zc(Rc(e, r), Rc(i, t), 0.33)
            );
          }
          return Rc(e, t);
        }
        dispose() {
          this.animationFrameDisposable !== null &&
            (this.animationFrameDisposable.dispose(), (this.animationFrameDisposable = null));
        }
        acceptScrollDimensions(e) {
          ((this.to = e.withScrollPosition(this.to)), this._initAnimations());
        }
        tick() {
          return this._tick(Date.now());
        }
        _tick(e) {
          let t = (e - this.startTime) / this.duration;
          return t < 1
            ? new Mf(this.scrollLeft(t), this.scrollTop(t), !1)
            : new Mf(this.to.scrollLeft, this.to.scrollTop, !0);
        }
        combine(t, n, r) {
          return e.start(t, n, r);
        }
        static start(t, n, r) {
          return ((r += 10), new e(t, n, Date.now() - 10, r));
        }
      }),
      (Pf = class extends W {
        constructor(e, t, n) {
          (super(),
            (this._visibility = e),
            (this._visibleClassName = t),
            (this._invisibleClassName = n),
            (this._domNode = null),
            (this._isVisible = !1),
            (this._isNeeded = !1),
            (this._rawShouldBeVisible = !1),
            (this._shouldBeVisible = !1),
            (this._revealTimer = this._register(new Zd())));
        }
        setVisibility(e) {
          this._visibility !== e && ((this._visibility = e), this._updateShouldBeVisible());
        }
        setShouldBeVisible(e) {
          ((this._rawShouldBeVisible = e), this._updateShouldBeVisible());
        }
        _applyVisibilitySetting() {
          return this._visibility === 2
            ? !1
            : this._visibility === 3
              ? !0
              : this._rawShouldBeVisible;
        }
        _updateShouldBeVisible() {
          let e = this._applyVisibilitySetting();
          this._shouldBeVisible !== e && ((this._shouldBeVisible = e), this.ensureVisibility());
        }
        setIsNeeded(e) {
          this._isNeeded !== e && ((this._isNeeded = e), this.ensureVisibility());
        }
        setDomNode(e) {
          ((this._domNode = e),
            this._domNode.setClassName(this._invisibleClassName),
            this.setShouldBeVisible(!1));
        }
        ensureVisibility() {
          if (!this._isNeeded) {
            this._hide(!1);
            return;
          }
          this._shouldBeVisible ? this._reveal() : this._hide(!0);
        }
        _reveal() {
          this._isVisible ||
            ((this._isVisible = !0),
            this._revealTimer.setIfNotSet(() => {
              this._domNode?.setClassName(this._visibleClassName);
            }, 0));
        }
        _hide(e) {
          (this._revealTimer.cancel(),
            this._isVisible &&
              ((this._isVisible = !1),
              this._domNode?.setClassName(this._invisibleClassName + (e ? ` fade` : ``))));
        }
      }),
      (Ff = 140),
      (If = class extends Df {
        constructor(e) {
          (super(),
            (this._lazyRender = e.lazyRender),
            (this._host = e.host),
            (this._scrollable = e.scrollable),
            (this._scrollByPage = e.scrollByPage),
            (this._scrollbarState = e.scrollbarState),
            (this._visibilityController = this._register(
              new Pf(
                e.visibility,
                `visible scrollbar ` + e.extraScrollbarClassName,
                `invisible scrollbar ` + e.extraScrollbarClassName,
              ),
            )),
            this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()),
            (this._pointerMoveMonitor = this._register(new Cf())),
            (this._shouldRender = !0),
            (this.domNode = Ic(document.createElement(`div`))),
            this.domNode.setAttribute(`role`, `presentation`),
            this.domNode.setAttribute(`aria-hidden`, `true`),
            this._visibilityController.setDomNode(this.domNode),
            this.domNode.setPosition(`absolute`),
            this._register(
              B(this.domNode.domNode, bf.POINTER_DOWN, (e) => this._domNodePointerDown(e)),
            ));
        }
        _createArrow(e) {
          let t = this._register(new kf(e));
          (this.domNode.domNode.appendChild(t.bgDomNode),
            this.domNode.domNode.appendChild(t.domNode));
        }
        _createSlider(e, t, n, r) {
          ((this.slider = Ic(document.createElement(`div`))),
            this.slider.setClassName(`slider`),
            this.slider.setPosition(`absolute`),
            this.slider.setTop(e),
            this.slider.setLeft(t),
            typeof n == `number` && this.slider.setWidth(n),
            typeof r == `number` && this.slider.setHeight(r),
            this.slider.setLayerHinting(!0),
            this.slider.setContain(`strict`),
            this.domNode.domNode.appendChild(this.slider.domNode),
            this._register(
              B(this.slider.domNode, bf.POINTER_DOWN, (e) => {
                e.button === 0 && (e.preventDefault(), this._sliderPointerDown(e));
              }),
            ),
            this.onclick(this.slider.domNode, (e) => {
              e.leftButton && e.stopPropagation();
            }));
        }
        _onElementSize(e) {
          return (
            this._scrollbarState.setVisibleSize(e) &&
              (this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()),
              (this._shouldRender = !0),
              this._lazyRender || this.render()),
            this._shouldRender
          );
        }
        _onElementScrollSize(e) {
          return (
            this._scrollbarState.setScrollSize(e) &&
              (this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()),
              (this._shouldRender = !0),
              this._lazyRender || this.render()),
            this._shouldRender
          );
        }
        _onElementScrollPosition(e) {
          return (
            this._scrollbarState.setScrollPosition(e) &&
              (this._visibilityController.setIsNeeded(this._scrollbarState.isNeeded()),
              (this._shouldRender = !0),
              this._lazyRender || this.render()),
            this._shouldRender
          );
        }
        beginReveal() {
          this._visibilityController.setShouldBeVisible(!0);
        }
        beginHide() {
          this._visibilityController.setShouldBeVisible(!1);
        }
        render() {
          this._shouldRender &&
            ((this._shouldRender = !1),
            this._renderDomNode(
              this._scrollbarState.getRectangleLargeSize(),
              this._scrollbarState.getRectangleSmallSize(),
            ),
            this._updateSlider(
              this._scrollbarState.getSliderSize(),
              this._scrollbarState.getArrowSize() + this._scrollbarState.getSliderPosition(),
            ));
        }
        _domNodePointerDown(e) {
          e.target === this.domNode.domNode && this._onPointerDown(e);
        }
        delegatePointerDown(e) {
          let t = this.domNode.domNode.getClientRects()[0].top,
            n = t + this._scrollbarState.getSliderPosition(),
            r = t + this._scrollbarState.getSliderPosition() + this._scrollbarState.getSliderSize(),
            i = this._sliderPointerPosition(e);
          n <= i && i <= r
            ? e.button === 0 && (e.preventDefault(), this._sliderPointerDown(e))
            : this._onPointerDown(e);
        }
        _onPointerDown(e) {
          let t, n;
          if (
            e.target === this.domNode.domNode &&
            typeof e.offsetX == `number` &&
            typeof e.offsetY == `number`
          )
            ((t = e.offsetX), (n = e.offsetY));
          else {
            let r = Mc(this.domNode.domNode);
            ((t = e.pageX - r.left), (n = e.pageY - r.top));
          }
          let r = this._pointerDownRelativePosition(t, n);
          (this._setDesiredScrollPositionNow(
            this._scrollByPage
              ? this._scrollbarState.getDesiredScrollPositionFromOffsetPaged(r)
              : this._scrollbarState.getDesiredScrollPositionFromOffset(r),
          ),
            e.button === 0 && (e.preventDefault(), this._sliderPointerDown(e)));
        }
        _sliderPointerDown(e) {
          if (!e.target || !(e.target instanceof Element)) return;
          let t = this._sliderPointerPosition(e),
            n = this._sliderOrthogonalPointerPosition(e),
            r = this._scrollbarState.clone();
          (this.slider.toggleClassName(`active`, !0),
            this._pointerMoveMonitor.startMonitoring(
              e.target,
              e.pointerId,
              e.buttons,
              (e) => {
                let i = this._sliderOrthogonalPointerPosition(e),
                  a = Math.abs(i - n);
                if (xd && a > Ff) {
                  this._setDesiredScrollPositionNow(r.getScrollPosition());
                  return;
                }
                let o = this._sliderPointerPosition(e) - t;
                this._setDesiredScrollPositionNow(r.getDesiredScrollPositionFromDelta(o));
              },
              () => {
                (this.slider.toggleClassName(`active`, !1), this._host.onDragEnd());
              },
            ),
            this._host.onDragStart());
        }
        _setDesiredScrollPositionNow(e) {
          let t = {};
          (this.writeScrollPosition(t, e), this._scrollable.setScrollPositionNow(t));
        }
        updateScrollbarSize(e) {
          (this._updateScrollbarSize(e),
            this._scrollbarState.setScrollbarSize(e),
            (this._shouldRender = !0),
            this._lazyRender || this.render());
        }
        isNeeded() {
          return this._scrollbarState.isNeeded();
        }
      }),
      (Lf = class e {
        constructor(e, t, n, r, i, a) {
          ((this._scrollbarSize = Math.round(t)),
            (this._oppositeScrollbarSize = Math.round(n)),
            (this._arrowSize = Math.round(e)),
            (this._visibleSize = r),
            (this._scrollSize = i),
            (this._scrollPosition = a),
            (this._computedAvailableSize = 0),
            (this._computedIsNeeded = !1),
            (this._computedSliderSize = 0),
            (this._computedSliderRatio = 0),
            (this._computedSliderPosition = 0),
            this._refreshComputedValues());
        }
        clone() {
          return new e(
            this._arrowSize,
            this._scrollbarSize,
            this._oppositeScrollbarSize,
            this._visibleSize,
            this._scrollSize,
            this._scrollPosition,
          );
        }
        setVisibleSize(e) {
          let t = Math.round(e);
          return this._visibleSize === t
            ? !1
            : ((this._visibleSize = t), this._refreshComputedValues(), !0);
        }
        setScrollSize(e) {
          let t = Math.round(e);
          return this._scrollSize === t
            ? !1
            : ((this._scrollSize = t), this._refreshComputedValues(), !0);
        }
        setScrollPosition(e) {
          let t = Math.round(e);
          return this._scrollPosition === t
            ? !1
            : ((this._scrollPosition = t), this._refreshComputedValues(), !0);
        }
        setScrollbarSize(e) {
          this._scrollbarSize = Math.round(e);
        }
        setOppositeScrollbarSize(e) {
          this._oppositeScrollbarSize = Math.round(e);
        }
        static _computeValues(e, t, n, r, i) {
          let a = Math.max(0, n - e),
            o = Math.max(0, a - 2 * t),
            s = r > 0 && r > n;
          if (!s)
            return {
              computedAvailableSize: Math.round(a),
              computedIsNeeded: s,
              computedSliderSize: Math.round(o),
              computedSliderRatio: 0,
              computedSliderPosition: 0,
            };
          let c = Math.round(Math.max(20, Math.floor((n * o) / r))),
            l = (o - c) / (r - n),
            u = i * l;
          return {
            computedAvailableSize: Math.round(a),
            computedIsNeeded: s,
            computedSliderSize: Math.round(c),
            computedSliderRatio: l,
            computedSliderPosition: Math.round(u),
          };
        }
        _refreshComputedValues() {
          let t = e._computeValues(
            this._oppositeScrollbarSize,
            this._arrowSize,
            this._visibleSize,
            this._scrollSize,
            this._scrollPosition,
          );
          ((this._computedAvailableSize = t.computedAvailableSize),
            (this._computedIsNeeded = t.computedIsNeeded),
            (this._computedSliderSize = t.computedSliderSize),
            (this._computedSliderRatio = t.computedSliderRatio),
            (this._computedSliderPosition = t.computedSliderPosition));
        }
        getArrowSize() {
          return this._arrowSize;
        }
        getScrollPosition() {
          return this._scrollPosition;
        }
        getRectangleLargeSize() {
          return this._computedAvailableSize;
        }
        getRectangleSmallSize() {
          return this._scrollbarSize;
        }
        isNeeded() {
          return this._computedIsNeeded;
        }
        getSliderSize() {
          return this._computedSliderSize;
        }
        getSliderPosition() {
          return this._computedSliderPosition;
        }
        getDesiredScrollPositionFromOffset(e) {
          if (!this._computedIsNeeded) return 0;
          let t = e - this._arrowSize - this._computedSliderSize / 2;
          return Math.round(t / this._computedSliderRatio);
        }
        getDesiredScrollPositionFromOffsetPaged(e) {
          if (!this._computedIsNeeded) return 0;
          let t = e - this._arrowSize,
            n = this._scrollPosition;
          return (
            t < this._computedSliderPosition ? (n -= this._visibleSize) : (n += this._visibleSize),
            n
          );
        }
        getDesiredScrollPositionFromDelta(e) {
          if (!this._computedIsNeeded) return 0;
          let t = this._computedSliderPosition + e;
          return Math.round(t / this._computedSliderRatio);
        }
      }),
      (Rf = class extends If {
        constructor(e, t, n) {
          let r = e.getScrollDimensions(),
            i = e.getCurrentScrollPosition();
          if (
            (super({
              lazyRender: t.lazyRender,
              host: n,
              scrollbarState: new Lf(
                t.horizontalHasArrows ? t.arrowSize : 0,
                t.horizontal === 2 ? 0 : t.horizontalScrollbarSize,
                t.vertical === 2 ? 0 : t.verticalScrollbarSize,
                r.width,
                r.scrollWidth,
                i.scrollLeft,
              ),
              visibility: t.horizontal,
              extraScrollbarClassName: `horizontal`,
              scrollable: e,
              scrollByPage: t.scrollByPage,
            }),
            t.horizontalHasArrows)
          )
            throw Error(`horizontalHasArrows is not supported in xterm.js`);
          this._createSlider(
            Math.floor((t.horizontalScrollbarSize - t.horizontalSliderSize) / 2),
            0,
            void 0,
            t.horizontalSliderSize,
          );
        }
        _updateSlider(e, t) {
          (this.slider.setWidth(e), this.slider.setLeft(t));
        }
        _renderDomNode(e, t) {
          (this.domNode.setWidth(e),
            this.domNode.setHeight(t),
            this.domNode.setLeft(0),
            this.domNode.setBottom(0));
        }
        onDidScroll(e) {
          return (
            (this._shouldRender = this._onElementScrollSize(e.scrollWidth) || this._shouldRender),
            (this._shouldRender =
              this._onElementScrollPosition(e.scrollLeft) || this._shouldRender),
            (this._shouldRender = this._onElementSize(e.width) || this._shouldRender),
            this._shouldRender
          );
        }
        _pointerDownRelativePosition(e, t) {
          return e;
        }
        _sliderPointerPosition(e) {
          return e.pageX;
        }
        _sliderOrthogonalPointerPosition(e) {
          return e.pageY;
        }
        _updateScrollbarSize(e) {
          this.slider.setHeight(e);
        }
        writeScrollPosition(e, t) {
          e.scrollLeft = t;
        }
        updateOptions(e) {
          (this.updateScrollbarSize(e.horizontal === 2 ? 0 : e.horizontalScrollbarSize),
            this._scrollbarState.setOppositeScrollbarSize(
              e.vertical === 2 ? 0 : e.verticalScrollbarSize,
            ),
            this._visibilityController.setVisibility(e.horizontal),
            (this._scrollByPage = e.scrollByPage));
        }
      }),
      (zf = class extends If {
        constructor(e, t, n) {
          let r = e.getScrollDimensions(),
            i = e.getCurrentScrollPosition();
          if (
            (super({
              lazyRender: t.lazyRender,
              host: n,
              scrollbarState: new Lf(
                t.verticalHasArrows ? t.arrowSize : 0,
                t.vertical === 2 ? 0 : t.verticalScrollbarSize,
                0,
                r.height,
                r.scrollHeight,
                i.scrollTop,
              ),
              visibility: t.vertical,
              extraScrollbarClassName: `vertical`,
              scrollable: e,
              scrollByPage: t.scrollByPage,
            }),
            t.verticalHasArrows)
          )
            throw Error(`horizontalHasArrows is not supported in xterm.js`);
          this._createSlider(
            0,
            Math.floor((t.verticalScrollbarSize - t.verticalSliderSize) / 2),
            t.verticalSliderSize,
            void 0,
          );
        }
        _updateSlider(e, t) {
          (this.slider.setHeight(e), this.slider.setTop(t));
        }
        _renderDomNode(e, t) {
          (this.domNode.setWidth(t),
            this.domNode.setHeight(e),
            this.domNode.setRight(0),
            this.domNode.setTop(0));
        }
        onDidScroll(e) {
          return (
            (this._shouldRender = this._onElementScrollSize(e.scrollHeight) || this._shouldRender),
            (this._shouldRender = this._onElementScrollPosition(e.scrollTop) || this._shouldRender),
            (this._shouldRender = this._onElementSize(e.height) || this._shouldRender),
            this._shouldRender
          );
        }
        _pointerDownRelativePosition(e, t) {
          return t;
        }
        _sliderPointerPosition(e) {
          return e.pageY;
        }
        _sliderOrthogonalPointerPosition(e) {
          return e.pageX;
        }
        _updateScrollbarSize(e) {
          this.slider.setWidth(e);
        }
        writeScrollPosition(e, t) {
          e.scrollTop = t;
        }
        updateOptions(e) {
          (this.updateScrollbarSize(e.vertical === 2 ? 0 : e.verticalScrollbarSize),
            this._scrollbarState.setOppositeScrollbarSize(0),
            this._visibilityController.setVisibility(e.vertical),
            (this._scrollByPage = e.scrollByPage));
        }
      }),
      (Bf = 500),
      (Vf = 50),
      (Hf = !0),
      (Uf = class {
        constructor(e, t, n) {
          ((this.timestamp = e), (this.deltaX = t), (this.deltaY = n), (this.score = 0));
        }
      }),
      (Wf = class {
        constructor() {
          ((this._capacity = 5), (this._memory = []), (this._front = -1), (this._rear = -1));
        }
        isPhysicalMouseWheel() {
          if (this._front === -1 && this._rear === -1) return !1;
          let e = 1,
            t = 0,
            n = 1,
            r = this._rear;
          do {
            let i = r === this._front ? e : 2 ** -n;
            if (((e -= i), (t += this._memory[r].score * i), r === this._front)) break;
            ((r = (this._capacity + r - 1) % this._capacity), n++);
          } while (!0);
          return t <= 0.5;
        }
        acceptStandardWheelEvent(e) {
          if (sd) {
            let t = fc(rf(e.browserEvent));
            this.accept(Date.now(), e.deltaX * t, e.deltaY * t);
          } else this.accept(Date.now(), e.deltaX, e.deltaY);
        }
        accept(e, t, n) {
          let r = null,
            i = new Uf(e, t, n);
          (this._front === -1 && this._rear === -1
            ? ((this._memory[0] = i), (this._front = 0), (this._rear = 0))
            : ((r = this._memory[this._rear]),
              (this._rear = (this._rear + 1) % this._capacity),
              this._rear === this._front && (this._front = (this._front + 1) % this._capacity),
              (this._memory[this._rear] = i)),
            (i.score = this._computeScore(i, r)));
        }
        _computeScore(e, t) {
          if (Math.abs(e.deltaX) > 0 && Math.abs(e.deltaY) > 0) return 1;
          let n = 0.5;
          if (((!this._isAlmostInt(e.deltaX) || !this._isAlmostInt(e.deltaY)) && (n += 0.25), t)) {
            let r = Math.abs(e.deltaX),
              i = Math.abs(e.deltaY),
              a = Math.abs(t.deltaX),
              o = Math.abs(t.deltaY),
              s = Math.max(Math.min(r, a), 1),
              c = Math.max(Math.min(i, o), 1),
              l = Math.max(r, a),
              u = Math.max(i, o);
            l % s === 0 && u % c === 0 && (n -= 0.5);
          }
          return Math.min(Math.max(n, 0), 1);
        }
        _isAlmostInt(e) {
          return Math.abs(Math.round(e) - e) < 0.01;
        }
      }),
      (Wf.INSTANCE = new Wf()),
      (Gf = Wf),
      (Kf = class extends Df {
        constructor(e, t, n) {
          (super(),
            (this._onScroll = this._register(new K())),
            (this.onScroll = this._onScroll.event),
            (this._onWillScroll = this._register(new K())),
            (this.onWillScroll = this._onWillScroll.event),
            (this._options = Hc(t)),
            (this._scrollable = n),
            this._register(
              this._scrollable.onScroll((e) => {
                (this._onWillScroll.fire(e), this._onDidScroll(e), this._onScroll.fire(e));
              }),
            ));
          let r = {
            onMouseWheel: (e) => this._onMouseWheel(e),
            onDragStart: () => this._onDragStart(),
            onDragEnd: () => this._onDragEnd(),
          };
          ((this._verticalScrollbar = this._register(new zf(this._scrollable, this._options, r))),
            (this._horizontalScrollbar = this._register(
              new Rf(this._scrollable, this._options, r),
            )),
            (this._domNode = document.createElement(`div`)),
            (this._domNode.className = `xterm-scrollable-element ` + this._options.className),
            this._domNode.setAttribute(`role`, `presentation`),
            (this._domNode.style.position = `relative`),
            this._domNode.appendChild(e),
            this._domNode.appendChild(this._horizontalScrollbar.domNode.domNode),
            this._domNode.appendChild(this._verticalScrollbar.domNode.domNode),
            this._options.useShadows
              ? ((this._leftShadowDomNode = Ic(document.createElement(`div`))),
                this._leftShadowDomNode.setClassName(`shadow`),
                this._domNode.appendChild(this._leftShadowDomNode.domNode),
                (this._topShadowDomNode = Ic(document.createElement(`div`))),
                this._topShadowDomNode.setClassName(`shadow`),
                this._domNode.appendChild(this._topShadowDomNode.domNode),
                (this._topLeftShadowDomNode = Ic(document.createElement(`div`))),
                this._topLeftShadowDomNode.setClassName(`shadow`),
                this._domNode.appendChild(this._topLeftShadowDomNode.domNode))
              : ((this._leftShadowDomNode = null),
                (this._topShadowDomNode = null),
                (this._topLeftShadowDomNode = null)),
            (this._listenOnDomNode = this._options.listenOnDomNode || this._domNode),
            (this._mouseWheelToDispose = []),
            this._setListeningToMouseWheel(this._options.handleMouseWheel),
            this.onmouseover(this._listenOnDomNode, (e) => this._onMouseOver(e)),
            this.onmouseleave(this._listenOnDomNode, (e) => this._onMouseLeave(e)),
            (this._hideTimeout = this._register(new Zd())),
            (this._isDragging = !1),
            (this._mouseIsOver = !1),
            (this._shouldRender = !0),
            (this._revealOnScroll = !0));
        }
        get options() {
          return this._options;
        }
        dispose() {
          ((this._mouseWheelToDispose = lc(this._mouseWheelToDispose)), super.dispose());
        }
        getDomNode() {
          return this._domNode;
        }
        getOverviewRulerLayoutInfo() {
          return { parent: this._domNode, insertBefore: this._verticalScrollbar.domNode.domNode };
        }
        delegateVerticalScrollbarPointerDown(e) {
          this._verticalScrollbar.delegatePointerDown(e);
        }
        getScrollDimensions() {
          return this._scrollable.getScrollDimensions();
        }
        setScrollDimensions(e) {
          this._scrollable.setScrollDimensions(e, !1);
        }
        updateClassName(e) {
          ((this._options.className = e),
            Sd && (this._options.className += ` mac`),
            (this._domNode.className = `xterm-scrollable-element ` + this._options.className));
        }
        updateOptions(e) {
          (typeof e.handleMouseWheel < `u` &&
            ((this._options.handleMouseWheel = e.handleMouseWheel),
            this._setListeningToMouseWheel(this._options.handleMouseWheel)),
            typeof e.mouseWheelScrollSensitivity < `u` &&
              (this._options.mouseWheelScrollSensitivity = e.mouseWheelScrollSensitivity),
            typeof e.fastScrollSensitivity < `u` &&
              (this._options.fastScrollSensitivity = e.fastScrollSensitivity),
            typeof e.scrollPredominantAxis < `u` &&
              (this._options.scrollPredominantAxis = e.scrollPredominantAxis),
            typeof e.horizontal < `u` && (this._options.horizontal = e.horizontal),
            typeof e.vertical < `u` && (this._options.vertical = e.vertical),
            typeof e.horizontalScrollbarSize < `u` &&
              (this._options.horizontalScrollbarSize = e.horizontalScrollbarSize),
            typeof e.verticalScrollbarSize < `u` &&
              (this._options.verticalScrollbarSize = e.verticalScrollbarSize),
            typeof e.scrollByPage < `u` && (this._options.scrollByPage = e.scrollByPage),
            this._horizontalScrollbar.updateOptions(this._options),
            this._verticalScrollbar.updateOptions(this._options),
            this._options.lazyRender || this._render());
        }
        setRevealOnScroll(e) {
          this._revealOnScroll = e;
        }
        delegateScrollFromMouseWheelEvent(e) {
          this._onMouseWheel(new qd(e));
        }
        _setListeningToMouseWheel(e) {
          this._mouseWheelToDispose.length > 0 !== e &&
            ((this._mouseWheelToDispose = lc(this._mouseWheelToDispose)), e) &&
            this._mouseWheelToDispose.push(
              B(
                this._listenOnDomNode,
                bf.MOUSE_WHEEL,
                (e) => {
                  this._onMouseWheel(new qd(e));
                },
                { passive: !1 },
              ),
            );
        }
        _onMouseWheel(e) {
          if (e.browserEvent?.defaultPrevented) return;
          let t = Gf.INSTANCE;
          Hf && t.acceptStandardWheelEvent(e);
          let n = !1;
          if (e.deltaY || e.deltaX) {
            let r = e.deltaY * this._options.mouseWheelScrollSensitivity,
              i = e.deltaX * this._options.mouseWheelScrollSensitivity;
            (this._options.scrollPredominantAxis &&
              (this._options.scrollYToX && i + r === 0
                ? (i = r = 0)
                : Math.abs(r) >= Math.abs(i)
                  ? (i = 0)
                  : (r = 0)),
              this._options.flipAxes && ([r, i] = [i, r]));
            let a = !Sd && e.browserEvent && e.browserEvent.shiftKey;
            ((this._options.scrollYToX || a) && !i && ((i = r), (r = 0)),
              e.browserEvent &&
                e.browserEvent.altKey &&
                ((i *= this._options.fastScrollSensitivity),
                (r *= this._options.fastScrollSensitivity)));
            let o = this._scrollable.getFutureScrollPosition(),
              s = {};
            if (r) {
              let e = Vf * r,
                t = o.scrollTop - (e < 0 ? Math.floor(e) : Math.ceil(e));
              this._verticalScrollbar.writeScrollPosition(s, t);
            }
            if (i) {
              let e = Vf * i,
                t = o.scrollLeft - (e < 0 ? Math.floor(e) : Math.ceil(e));
              this._horizontalScrollbar.writeScrollPosition(s, t);
            }
            ((s = this._scrollable.validateScrollPosition(s)),
              (o.scrollLeft !== s.scrollLeft || o.scrollTop !== s.scrollTop) &&
                (Hf && this._options.mouseWheelSmoothScroll && t.isPhysicalMouseWheel()
                  ? this._scrollable.setScrollPositionSmooth(s)
                  : this._scrollable.setScrollPositionNow(s),
                (n = !0)));
          }
          let r = n;
          (!r && this._options.alwaysConsumeMouseWheel && (r = !0),
            !r &&
              this._options.consumeMouseWheelIfScrollbarIsNeeded &&
              (this._verticalScrollbar.isNeeded() || this._horizontalScrollbar.isNeeded()) &&
              (r = !0),
            r && (e.preventDefault(), e.stopPropagation()));
        }
        _onDidScroll(e) {
          ((this._shouldRender = this._horizontalScrollbar.onDidScroll(e) || this._shouldRender),
            (this._shouldRender = this._verticalScrollbar.onDidScroll(e) || this._shouldRender),
            this._options.useShadows && (this._shouldRender = !0),
            this._revealOnScroll && this._reveal(),
            this._options.lazyRender || this._render());
        }
        renderNow() {
          if (!this._options.lazyRender)
            throw Error("Please use `lazyRender` together with `renderNow`!");
          this._render();
        }
        _render() {
          if (
            this._shouldRender &&
            ((this._shouldRender = !1),
            this._horizontalScrollbar.render(),
            this._verticalScrollbar.render(),
            this._options.useShadows)
          ) {
            let e = this._scrollable.getCurrentScrollPosition(),
              t = e.scrollTop > 0,
              n = e.scrollLeft > 0,
              r = n ? ` left` : ``,
              i = t ? ` top` : ``,
              a = n || t ? ` top-left-corner` : ``;
            (this._leftShadowDomNode.setClassName(`shadow${r}`),
              this._topShadowDomNode.setClassName(`shadow${i}`),
              this._topLeftShadowDomNode.setClassName(`shadow${a}${i}${r}`));
          }
        }
        _onDragStart() {
          ((this._isDragging = !0), this._reveal());
        }
        _onDragEnd() {
          ((this._isDragging = !1), this._hide());
        }
        _onMouseLeave(e) {
          ((this._mouseIsOver = !1), this._hide());
        }
        _onMouseOver(e) {
          ((this._mouseIsOver = !0), this._reveal());
        }
        _reveal() {
          (this._verticalScrollbar.beginReveal(),
            this._horizontalScrollbar.beginReveal(),
            this._scheduleHide());
        }
        _hide() {
          !this._mouseIsOver &&
            !this._isDragging &&
            (this._verticalScrollbar.beginHide(), this._horizontalScrollbar.beginHide());
        }
        _scheduleHide() {
          !this._mouseIsOver &&
            !this._isDragging &&
            this._hideTimeout.cancelAndSet(() => this._hide(), Bf);
        }
      }),
      (qf = class extends Kf {
        constructor(e, t, n) {
          super(e, t, n);
        }
        setScrollPosition(e) {
          e.reuseAnimation
            ? this._scrollable.setScrollPositionSmooth(e, e.reuseAnimation)
            : this._scrollable.setScrollPositionNow(e);
        }
        getScrollPosition() {
          return this._scrollable.getCurrentScrollPosition();
        }
      }),
      (Jf = class extends W {
        constructor(e, t, n, r, i, a, o, s) {
          (super(),
            (this._bufferService = n),
            (this._optionsService = o),
            (this._renderService = s),
            (this._onRequestScrollLines = this._register(new K())),
            (this.onRequestScrollLines = this._onRequestScrollLines.event),
            (this._isSyncing = !1),
            (this._isHandlingScroll = !1),
            (this._suppressOnScrollHandler = !1));
          let c = this._register(
            new jf({
              forceIntegerValues: !1,
              smoothScrollDuration: this._optionsService.rawOptions.smoothScrollDuration,
              scheduleAtNextAnimationFrame: (e) => gf(r.window, e),
            }),
          );
          (this._register(
            this._optionsService.onSpecificOptionChange(`smoothScrollDuration`, () => {
              c.setSmoothScrollDuration(this._optionsService.rawOptions.smoothScrollDuration);
            }),
          ),
            (this._scrollableElement = this._register(
              new qf(
                t,
                {
                  vertical: 1,
                  horizontal: 2,
                  useShadows: !1,
                  mouseWheelSmoothScroll: !0,
                  ...this._getChangeOptions(),
                },
                c,
              ),
            )),
            this._register(
              this._optionsService.onMultipleOptionChange(
                [`scrollSensitivity`, `fastScrollSensitivity`, `overviewRuler`],
                () => this._scrollableElement.updateOptions(this._getChangeOptions()),
              ),
            ),
            this._register(
              i.onProtocolChange((e) => {
                this._scrollableElement.updateOptions({ handleMouseWheel: !(e & 16) });
              }),
            ),
            this._scrollableElement.setScrollDimensions({ height: 0, scrollHeight: 0 }),
            this._register(
              Vu.runAndSubscribe(a.onChangeColors, () => {
                this._scrollableElement.getDomNode().style.backgroundColor =
                  a.colors.background.css;
              }),
            ),
            e.appendChild(this._scrollableElement.getDomNode()),
            this._register(z(() => this._scrollableElement.getDomNode().remove())),
            (this._styleElement = r.mainDocument.createElement(`style`)),
            t.appendChild(this._styleElement),
            this._register(z(() => this._styleElement.remove())),
            this._register(
              Vu.runAndSubscribe(a.onChangeColors, () => {
                this._styleElement.textContent = [
                  `.xterm .xterm-scrollable-element > .scrollbar > .slider {`,
                  `  background: ${a.colors.scrollbarSliderBackground.css};`,
                  `}`,
                  `.xterm .xterm-scrollable-element > .scrollbar > .slider:hover {`,
                  `  background: ${a.colors.scrollbarSliderHoverBackground.css};`,
                  `}`,
                  `.xterm .xterm-scrollable-element > .scrollbar > .slider.active {`,
                  `  background: ${a.colors.scrollbarSliderActiveBackground.css};`,
                  `}`,
                ].join(`
`);
              }),
            ),
            this._register(this._bufferService.onResize(() => this.queueSync())),
            this._register(
              this._bufferService.buffers.onBufferActivate(() => {
                ((this._latestYDisp = void 0), this.queueSync());
              }),
            ),
            this._register(this._bufferService.onScroll(() => this._sync())),
            this._register(this._scrollableElement.onScroll((e) => this._handleScroll(e))));
        }
        scrollLines(e) {
          let t = this._scrollableElement.getScrollPosition();
          this._scrollableElement.setScrollPosition({
            reuseAnimation: !0,
            scrollTop: t.scrollTop + e * this._renderService.dimensions.css.cell.height,
          });
        }
        scrollToLine(e, t) {
          (t && (this._latestYDisp = e),
            this._scrollableElement.setScrollPosition({
              reuseAnimation: !t,
              scrollTop: e * this._renderService.dimensions.css.cell.height,
            }));
        }
        _getChangeOptions() {
          return {
            mouseWheelScrollSensitivity: this._optionsService.rawOptions.scrollSensitivity,
            fastScrollSensitivity: this._optionsService.rawOptions.fastScrollSensitivity,
            verticalScrollbarSize: this._optionsService.rawOptions.overviewRuler?.width || 14,
          };
        }
        queueSync(e) {
          (e !== void 0 && (this._latestYDisp = e),
            this._queuedAnimationFrame === void 0 &&
              (this._queuedAnimationFrame = this._renderService.addRefreshCallback(() => {
                ((this._queuedAnimationFrame = void 0), this._sync(this._latestYDisp));
              })));
        }
        _sync(e = this._bufferService.buffer.ydisp) {
          !this._renderService ||
            this._isSyncing ||
            ((this._isSyncing = !0),
            (this._suppressOnScrollHandler = !0),
            this._scrollableElement.setScrollDimensions({
              height: this._renderService.dimensions.css.canvas.height,
              scrollHeight:
                this._renderService.dimensions.css.cell.height *
                this._bufferService.buffer.lines.length,
            }),
            (this._suppressOnScrollHandler = !1),
            e !== this._latestYDisp &&
              this._scrollableElement.setScrollPosition({
                scrollTop: e * this._renderService.dimensions.css.cell.height,
              }),
            (this._isSyncing = !1));
        }
        _handleScroll(e) {
          if (!this._renderService || this._isHandlingScroll || this._suppressOnScrollHandler)
            return;
          this._isHandlingScroll = !0;
          let t = Math.round(e.scrollTop / this._renderService.dimensions.css.cell.height),
            n = t - this._bufferService.buffer.ydisp;
          (n !== 0 && ((this._latestYDisp = t), this._onRequestScrollLines.fire(n)),
            (this._isHandlingScroll = !1));
        }
      }),
      (Jf = H([U(2, Xl), U(3, cu), U(4, Zl), U(5, pu), U(6, nu), U(7, uu)], Jf)),
      (Yf = class extends W {
        constructor(e, t, n, r, i) {
          (super(),
            (this._screenElement = e),
            (this._bufferService = t),
            (this._coreBrowserService = n),
            (this._decorationService = r),
            (this._renderService = i),
            (this._decorationElements = new Map()),
            (this._altBufferIsActive = !1),
            (this._dimensionsChanged = !1),
            (this._container = document.createElement(`div`)),
            this._container.classList.add(`xterm-decoration-container`),
            this._screenElement.appendChild(this._container),
            this._register(
              this._renderService.onRenderedViewportChange(() => this._doRefreshDecorations()),
            ),
            this._register(
              this._renderService.onDimensionsChange(() => {
                ((this._dimensionsChanged = !0), this._queueRefresh());
              }),
            ),
            this._register(this._coreBrowserService.onDprChange(() => this._queueRefresh())),
            this._register(
              this._bufferService.buffers.onBufferActivate(() => {
                this._altBufferIsActive =
                  this._bufferService.buffer === this._bufferService.buffers.alt;
              }),
            ),
            this._register(
              this._decorationService.onDecorationRegistered(() => this._queueRefresh()),
            ),
            this._register(
              this._decorationService.onDecorationRemoved((e) => this._removeDecoration(e)),
            ),
            this._register(
              z(() => {
                (this._container.remove(), this._decorationElements.clear());
              }),
            ));
        }
        _queueRefresh() {
          this._animationFrame === void 0 &&
            (this._animationFrame = this._renderService.addRefreshCallback(() => {
              (this._doRefreshDecorations(), (this._animationFrame = void 0));
            }));
        }
        _doRefreshDecorations() {
          for (let e of this._decorationService.decorations) this._renderDecoration(e);
          this._dimensionsChanged = !1;
        }
        _renderDecoration(e) {
          (this._refreshStyle(e), this._dimensionsChanged && this._refreshXPosition(e));
        }
        _createElement(e) {
          let t = this._coreBrowserService.mainDocument.createElement(`div`);
          (t.classList.add(`xterm-decoration`),
            t.classList.toggle(`xterm-decoration-top-layer`, e?.options?.layer === `top`),
            (t.style.width = `${Math.round((e.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`),
            (t.style.height = `${(e.options.height || 1) * this._renderService.dimensions.css.cell.height}px`),
            (t.style.top = `${(e.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height}px`),
            (t.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`));
          let n = e.options.x ?? 0;
          return (
            n && n > this._bufferService.cols && (t.style.display = `none`),
            this._refreshXPosition(e, t),
            t
          );
        }
        _refreshStyle(e) {
          let t = e.marker.line - this._bufferService.buffers.active.ydisp;
          if (t < 0 || t >= this._bufferService.rows)
            e.element && ((e.element.style.display = `none`), e.onRenderEmitter.fire(e.element));
          else {
            let n = this._decorationElements.get(e);
            (n ||
              ((n = this._createElement(e)),
              (e.element = n),
              this._decorationElements.set(e, n),
              this._container.appendChild(n),
              e.onDispose(() => {
                (this._decorationElements.delete(e), n.remove());
              })),
              (n.style.display = this._altBufferIsActive ? `none` : `block`),
              this._altBufferIsActive ||
                ((n.style.width = `${Math.round((e.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`),
                (n.style.height = `${(e.options.height || 1) * this._renderService.dimensions.css.cell.height}px`),
                (n.style.top = `${t * this._renderService.dimensions.css.cell.height}px`),
                (n.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`)),
              e.onRenderEmitter.fire(n));
          }
        }
        _refreshXPosition(e, t = e.element) {
          if (!t) return;
          let n = e.options.x ?? 0;
          (e.options.anchor || `left`) === `right`
            ? (t.style.right = n ? `${n * this._renderService.dimensions.css.cell.width}px` : ``)
            : (t.style.left = n ? `${n * this._renderService.dimensions.css.cell.width}px` : ``);
        }
        _removeDecoration(e) {
          (this._decorationElements.get(e)?.remove(),
            this._decorationElements.delete(e),
            e.dispose());
        }
      }),
      (Yf = H([U(1, Xl), U(2, cu), U(3, au), U(4, uu)], Yf)),
      (Xf = class {
        constructor() {
          ((this._zones = []),
            (this._zonePool = []),
            (this._zonePoolIndex = 0),
            (this._linePadding = { full: 0, left: 0, center: 0, right: 0 }));
        }
        get zones() {
          return (
            (this._zonePool.length = Math.min(this._zonePool.length, this._zones.length)),
            this._zones
          );
        }
        clear() {
          ((this._zones.length = 0), (this._zonePoolIndex = 0));
        }
        addDecoration(e) {
          if (e.options.overviewRulerOptions) {
            for (let t of this._zones)
              if (
                t.color === e.options.overviewRulerOptions.color &&
                t.position === e.options.overviewRulerOptions.position
              ) {
                if (this._lineIntersectsZone(t, e.marker.line)) return;
                if (
                  this._lineAdjacentToZone(
                    t,
                    e.marker.line,
                    e.options.overviewRulerOptions.position,
                  )
                ) {
                  this._addLineToZone(t, e.marker.line);
                  return;
                }
              }
            if (this._zonePoolIndex < this._zonePool.length) {
              ((this._zonePool[this._zonePoolIndex].color = e.options.overviewRulerOptions.color),
                (this._zonePool[this._zonePoolIndex].position =
                  e.options.overviewRulerOptions.position),
                (this._zonePool[this._zonePoolIndex].startBufferLine = e.marker.line),
                (this._zonePool[this._zonePoolIndex].endBufferLine = e.marker.line),
                this._zones.push(this._zonePool[this._zonePoolIndex++]));
              return;
            }
            (this._zones.push({
              color: e.options.overviewRulerOptions.color,
              position: e.options.overviewRulerOptions.position,
              startBufferLine: e.marker.line,
              endBufferLine: e.marker.line,
            }),
              this._zonePool.push(this._zones[this._zones.length - 1]),
              this._zonePoolIndex++);
          }
        }
        setPadding(e) {
          this._linePadding = e;
        }
        _lineIntersectsZone(e, t) {
          return t >= e.startBufferLine && t <= e.endBufferLine;
        }
        _lineAdjacentToZone(e, t, n) {
          return (
            t >= e.startBufferLine - this._linePadding[n || `full`] &&
            t <= e.endBufferLine + this._linePadding[n || `full`]
          );
        }
        _addLineToZone(e, t) {
          ((e.startBufferLine = Math.min(e.startBufferLine, t)),
            (e.endBufferLine = Math.max(e.endBufferLine, t)));
        }
      }),
      (Zf = { full: 0, left: 0, center: 0, right: 0 }),
      (Qf = { full: 0, left: 0, center: 0, right: 0 }),
      ($f = { full: 0, left: 0, center: 0, right: 0 }),
      (ep = class extends W {
        constructor(e, t, n, r, i, a, o, s) {
          (super(),
            (this._viewportElement = e),
            (this._screenElement = t),
            (this._bufferService = n),
            (this._decorationService = r),
            (this._renderService = i),
            (this._optionsService = a),
            (this._themeService = o),
            (this._coreBrowserService = s),
            (this._colorZoneStore = new Xf()),
            (this._shouldUpdateDimensions = !0),
            (this._shouldUpdateAnchor = !0),
            (this._lastKnownBufferLength = 0),
            (this._canvas = this._coreBrowserService.mainDocument.createElement(`canvas`)),
            this._canvas.classList.add(`xterm-decoration-overview-ruler`),
            this._refreshCanvasDimensions(),
            this._viewportElement.parentElement?.insertBefore(this._canvas, this._viewportElement),
            this._register(z(() => this._canvas?.remove())));
          let c = this._canvas.getContext(`2d`);
          if (c) this._ctx = c;
          else throw Error(`Ctx cannot be null`);
          (this._register(
            this._decorationService.onDecorationRegistered(() => this._queueRefresh(void 0, !0)),
          ),
            this._register(
              this._decorationService.onDecorationRemoved(() => this._queueRefresh(void 0, !0)),
            ),
            this._register(
              this._renderService.onRenderedViewportChange(() => this._queueRefresh()),
            ),
            this._register(
              this._bufferService.buffers.onBufferActivate(() => {
                this._canvas.style.display =
                  this._bufferService.buffer === this._bufferService.buffers.alt ? `none` : `block`;
              }),
            ),
            this._register(
              this._bufferService.onScroll(() => {
                this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length &&
                  (this._refreshDrawHeightConstants(), this._refreshColorZonePadding());
              }),
            ),
            this._register(
              this._renderService.onRender(() => {
                (!this._containerHeight ||
                  this._containerHeight !== this._screenElement.clientHeight) &&
                  (this._queueRefresh(!0),
                  (this._containerHeight = this._screenElement.clientHeight));
              }),
            ),
            this._register(this._coreBrowserService.onDprChange(() => this._queueRefresh(!0))),
            this._register(
              this._optionsService.onSpecificOptionChange(`overviewRuler`, () =>
                this._queueRefresh(!0),
              ),
            ),
            this._register(this._themeService.onChangeColors(() => this._queueRefresh())),
            this._queueRefresh(!0));
        }
        get _width() {
          return this._optionsService.options.overviewRuler?.width || 0;
        }
        _refreshDrawConstants() {
          let e = Math.floor((this._canvas.width - 1) / 3),
            t = Math.ceil((this._canvas.width - 1) / 3);
          ((Qf.full = this._canvas.width),
            (Qf.left = e),
            (Qf.center = t),
            (Qf.right = e),
            this._refreshDrawHeightConstants(),
            ($f.full = 1),
            ($f.left = 1),
            ($f.center = 1 + Qf.left),
            ($f.right = 1 + Qf.left + Qf.center));
        }
        _refreshDrawHeightConstants() {
          Zf.full = Math.round(2 * this._coreBrowserService.dpr);
          let e = this._canvas.height / this._bufferService.buffer.lines.length,
            t = Math.round(Math.max(Math.min(e, 12), 6) * this._coreBrowserService.dpr);
          ((Zf.left = t), (Zf.center = t), (Zf.right = t));
        }
        _refreshColorZonePadding() {
          (this._colorZoneStore.setPadding({
            full: Math.floor(
              (this._bufferService.buffers.active.lines.length / (this._canvas.height - 1)) *
                Zf.full,
            ),
            left: Math.floor(
              (this._bufferService.buffers.active.lines.length / (this._canvas.height - 1)) *
                Zf.left,
            ),
            center: Math.floor(
              (this._bufferService.buffers.active.lines.length / (this._canvas.height - 1)) *
                Zf.center,
            ),
            right: Math.floor(
              (this._bufferService.buffers.active.lines.length / (this._canvas.height - 1)) *
                Zf.right,
            ),
          }),
            (this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length));
        }
        _refreshCanvasDimensions() {
          ((this._canvas.style.width = `${this._width}px`),
            (this._canvas.width = Math.round(this._width * this._coreBrowserService.dpr)),
            (this._canvas.style.height = `${this._screenElement.clientHeight}px`),
            (this._canvas.height = Math.round(
              this._screenElement.clientHeight * this._coreBrowserService.dpr,
            )),
            this._refreshDrawConstants(),
            this._refreshColorZonePadding());
        }
        _refreshDecorations() {
          (this._shouldUpdateDimensions && this._refreshCanvasDimensions(),
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height),
            this._colorZoneStore.clear());
          for (let e of this._decorationService.decorations) this._colorZoneStore.addDecoration(e);
          ((this._ctx.lineWidth = 1), this._renderRulerOutline());
          let e = this._colorZoneStore.zones;
          for (let t of e) t.position !== `full` && this._renderColorZone(t);
          for (let t of e) t.position === `full` && this._renderColorZone(t);
          ((this._shouldUpdateDimensions = !1), (this._shouldUpdateAnchor = !1));
        }
        _renderRulerOutline() {
          ((this._ctx.fillStyle = this._themeService.colors.overviewRulerBorder.css),
            this._ctx.fillRect(0, 0, 1, this._canvas.height),
            this._optionsService.rawOptions.overviewRuler.showTopBorder &&
              this._ctx.fillRect(1, 0, this._canvas.width - 1, 1),
            this._optionsService.rawOptions.overviewRuler.showBottomBorder &&
              this._ctx.fillRect(
                1,
                this._canvas.height - 1,
                this._canvas.width - 1,
                this._canvas.height,
              ));
        }
        _renderColorZone(e) {
          ((this._ctx.fillStyle = e.color),
            this._ctx.fillRect(
              $f[e.position || `full`],
              Math.round(
                (this._canvas.height - 1) *
                  (e.startBufferLine / this._bufferService.buffers.active.lines.length) -
                  Zf[e.position || `full`] / 2,
              ),
              Qf[e.position || `full`],
              Math.round(
                (this._canvas.height - 1) *
                  ((e.endBufferLine - e.startBufferLine) /
                    this._bufferService.buffers.active.lines.length) +
                  Zf[e.position || `full`],
              ),
            ));
        }
        _queueRefresh(e, t) {
          ((this._shouldUpdateDimensions = e || this._shouldUpdateDimensions),
            (this._shouldUpdateAnchor = t || this._shouldUpdateAnchor),
            this._animationFrame === void 0 &&
              (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
                (this._refreshDecorations(), (this._animationFrame = void 0));
              })));
        }
      }),
      (ep = H([U(2, Xl), U(3, au), U(4, uu), U(5, nu), U(6, pu), U(7, cu)], ep)),
      ((e) => (
        (e.NUL = `\0`),
        (e.SOH = ``),
        (e.STX = ``),
        (e.ETX = ``),
        (e.EOT = ``),
        (e.ENQ = ``),
        (e.ACK = ``),
        (e.BEL = `\x07`),
        (e.BS = `\b`),
        (e.HT = `	`),
        (e.LF = `
`),
        (e.VT = `\v`),
        (e.FF = `\f`),
        (e.CR = `\r`),
        (e.SO = ``),
        (e.SI = ``),
        (e.DLE = ``),
        (e.DC1 = ``),
        (e.DC2 = ``),
        (e.DC3 = ``),
        (e.DC4 = ``),
        (e.NAK = ``),
        (e.SYN = ``),
        (e.ETB = ``),
        (e.CAN = ``),
        (e.EM = ``),
        (e.SUB = ``),
        (e.ESC = `\x1B`),
        (e.FS = ``),
        (e.GS = ``),
        (e.RS = ``),
        (e.US = ``),
        (e.SP = ` `),
        (e.DEL = ``)
      ))((q ||= {})),
      ((e) => (
        (e.PAD = ``),
        (e.HOP = ``),
        (e.BPH = ``),
        (e.NBH = ``),
        (e.IND = ``),
        (e.NEL = ``),
        (e.SSA = ``),
        (e.ESA = ``),
        (e.HTS = ``),
        (e.HTJ = ``),
        (e.VTS = ``),
        (e.PLD = ``),
        (e.PLU = ``),
        (e.RI = ``),
        (e.SS2 = ``),
        (e.SS3 = ``),
        (e.DCS = ``),
        (e.PU1 = ``),
        (e.PU2 = ``),
        (e.STS = ``),
        (e.CCH = ``),
        (e.MW = ``),
        (e.SPA = ``),
        (e.EPA = ``),
        (e.SOS = ``),
        (e.SGCI = ``),
        (e.SCI = ``),
        (e.CSI = ``),
        (e.ST = ``),
        (e.OSC = ``),
        (e.PM = ``),
        (e.APC = ``)
      ))((tp ||= {})),
      ((e) => (e.ST = `${q.ESC}\\`))((np ||= {})),
      (rp = class {
        constructor(e, t, n, r, i, a) {
          ((this._textarea = e),
            (this._compositionView = t),
            (this._bufferService = n),
            (this._optionsService = r),
            (this._coreService = i),
            (this._renderService = a),
            (this._isComposing = !1),
            (this._isSendingComposition = !1),
            (this._compositionPosition = { start: 0, end: 0 }),
            (this._dataAlreadySent = ``));
        }
        get isComposing() {
          return this._isComposing;
        }
        compositionstart() {
          ((this._isComposing = !0),
            (this._compositionPosition.start = this._textarea.value.length),
            (this._compositionView.textContent = ``),
            (this._dataAlreadySent = ``),
            this._compositionView.classList.add(`active`));
        }
        compositionupdate(e) {
          ((this._compositionView.textContent = e.data),
            this.updateCompositionElements(),
            setTimeout(() => {
              this._compositionPosition.end = this._textarea.value.length;
            }, 0));
        }
        compositionend() {
          this._finalizeComposition(!0);
        }
        keydown(e) {
          if (this._isComposing || this._isSendingComposition) {
            if (
              e.keyCode === 20 ||
              e.keyCode === 229 ||
              e.keyCode === 16 ||
              e.keyCode === 17 ||
              e.keyCode === 18
            )
              return !1;
            this._finalizeComposition(!1);
          }
          return e.keyCode === 229 ? (this._handleAnyTextareaChanges(), !1) : !0;
        }
        _finalizeComposition(e) {
          if ((this._compositionView.classList.remove(`active`), (this._isComposing = !1), e)) {
            let e = { start: this._compositionPosition.start, end: this._compositionPosition.end };
            ((this._isSendingComposition = !0),
              setTimeout(() => {
                if (this._isSendingComposition) {
                  this._isSendingComposition = !1;
                  let t;
                  ((e.start += this._dataAlreadySent.length),
                    (t = this._isComposing
                      ? this._textarea.value.substring(e.start, this._compositionPosition.start)
                      : this._textarea.value.substring(e.start)),
                    t.length > 0 && this._coreService.triggerDataEvent(t, !0));
                }
              }, 0));
          } else {
            this._isSendingComposition = !1;
            let e = this._textarea.value.substring(
              this._compositionPosition.start,
              this._compositionPosition.end,
            );
            this._coreService.triggerDataEvent(e, !0);
          }
        }
        _handleAnyTextareaChanges() {
          let e = this._textarea.value;
          setTimeout(() => {
            if (!this._isComposing) {
              let t = this._textarea.value,
                n = t.replace(e, ``);
              ((this._dataAlreadySent = n),
                t.length > e.length
                  ? this._coreService.triggerDataEvent(n, !0)
                  : t.length < e.length
                    ? this._coreService.triggerDataEvent(`${q.DEL}`, !0)
                    : t.length === e.length &&
                      t !== e &&
                      this._coreService.triggerDataEvent(t, !0));
            }
          }, 0);
        }
        updateCompositionElements(e) {
          if (this._isComposing) {
            if (this._bufferService.buffer.isCursorInViewport) {
              let e = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1),
                t = this._renderService.dimensions.css.cell.height,
                n = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height,
                r = e * this._renderService.dimensions.css.cell.width;
              ((this._compositionView.style.left = r + `px`),
                (this._compositionView.style.top = n + `px`),
                (this._compositionView.style.height = t + `px`),
                (this._compositionView.style.lineHeight = t + `px`),
                (this._compositionView.style.fontFamily =
                  this._optionsService.rawOptions.fontFamily),
                (this._compositionView.style.fontSize =
                  this._optionsService.rawOptions.fontSize + `px`));
              let i = this._compositionView.getBoundingClientRect();
              ((this._textarea.style.left = r + `px`),
                (this._textarea.style.top = n + `px`),
                (this._textarea.style.width = Math.max(i.width, 1) + `px`),
                (this._textarea.style.height = Math.max(i.height, 1) + `px`),
                (this._textarea.style.lineHeight = i.height + `px`));
            }
            e || setTimeout(() => this.updateCompositionElements(!0), 0);
          }
        }
      }),
      (rp = H([U(2, Xl), U(3, nu), U(4, Ql), U(5, uu)], rp)),
      (ip = 0),
      (ap = 0),
      (op = 0),
      (J = 0),
      (sp = { css: `#00000000`, rgba: 0 }),
      ((e) => {
        function t(e, t, n, r) {
          return r === void 0 ? `#${Uc(e)}${Uc(t)}${Uc(n)}` : `#${Uc(e)}${Uc(t)}${Uc(n)}${Uc(r)}`;
        }
        e.toCss = t;
        function n(e, t, n, r = 255) {
          return ((e << 24) | (t << 16) | (n << 8) | r) >>> 0;
        }
        e.toRgba = n;
        function r(t, n, r, i) {
          return { css: e.toCss(t, n, r, i), rgba: e.toRgba(t, n, r, i) };
        }
        e.toColor = r;
      })((cp ||= {})),
      ((e) => {
        function t(e, t) {
          if (((J = (t.rgba & 255) / 255), J === 1)) return { css: t.css, rgba: t.rgba };
          let n = (t.rgba >> 24) & 255,
            r = (t.rgba >> 16) & 255,
            i = (t.rgba >> 8) & 255,
            a = (e.rgba >> 24) & 255,
            o = (e.rgba >> 16) & 255,
            s = (e.rgba >> 8) & 255;
          return (
            (ip = a + Math.round((n - a) * J)),
            (ap = o + Math.round((r - o) * J)),
            (op = s + Math.round((i - s) * J)),
            { css: cp.toCss(ip, ap, op), rgba: cp.toRgba(ip, ap, op) }
          );
        }
        e.blend = t;
        function n(e) {
          return (e.rgba & 255) == 255;
        }
        e.isOpaque = n;
        function r(e, t, n) {
          let r = up.ensureContrastRatio(e.rgba, t.rgba, n);
          if (r) return cp.toColor((r >> 24) & 255, (r >> 16) & 255, (r >> 8) & 255);
        }
        e.ensureContrastRatio = r;
        function i(e) {
          let t = (e.rgba | 255) >>> 0;
          return (([ip, ap, op] = up.toChannels(t)), { css: cp.toCss(ip, ap, op), rgba: t });
        }
        e.opaque = i;
        function a(e, t) {
          return (
            (J = Math.round(t * 255)),
            ([ip, ap, op] = up.toChannels(e.rgba)),
            { css: cp.toCss(ip, ap, op, J), rgba: cp.toRgba(ip, ap, op, J) }
          );
        }
        e.opacity = a;
        function o(e, t) {
          return ((J = e.rgba & 255), a(e, (J * t) / 255));
        }
        e.multiplyOpacity = o;
        function s(e) {
          return [(e.rgba >> 24) & 255, (e.rgba >> 16) & 255, (e.rgba >> 8) & 255];
        }
        e.toColorRGB = s;
      })((Y ||= {})),
      ((e) => {
        let t, n;
        try {
          let e = document.createElement(`canvas`);
          ((e.width = 1), (e.height = 1));
          let r = e.getContext(`2d`, { willReadFrequently: !0 });
          r &&
            ((t = r),
            (t.globalCompositeOperation = `copy`),
            (n = t.createLinearGradient(0, 0, 1, 1)));
        } catch {}
        function r(e) {
          if (e.match(/#[\da-f]{3,8}/i))
            switch (e.length) {
              case 4:
                return (
                  (ip = parseInt(e.slice(1, 2).repeat(2), 16)),
                  (ap = parseInt(e.slice(2, 3).repeat(2), 16)),
                  (op = parseInt(e.slice(3, 4).repeat(2), 16)),
                  cp.toColor(ip, ap, op)
                );
              case 5:
                return (
                  (ip = parseInt(e.slice(1, 2).repeat(2), 16)),
                  (ap = parseInt(e.slice(2, 3).repeat(2), 16)),
                  (op = parseInt(e.slice(3, 4).repeat(2), 16)),
                  (J = parseInt(e.slice(4, 5).repeat(2), 16)),
                  cp.toColor(ip, ap, op, J)
                );
              case 7:
                return { css: e, rgba: ((parseInt(e.slice(1), 16) << 8) | 255) >>> 0 };
              case 9:
                return { css: e, rgba: parseInt(e.slice(1), 16) >>> 0 };
            }
          let r = e.match(
            /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/,
          );
          if (r)
            return (
              (ip = parseInt(r[1])),
              (ap = parseInt(r[2])),
              (op = parseInt(r[3])),
              (J = Math.round((r[5] === void 0 ? 1 : parseFloat(r[5])) * 255)),
              cp.toColor(ip, ap, op, J)
            );
          if (
            !t ||
            !n ||
            ((t.fillStyle = n), (t.fillStyle = e), typeof t.fillStyle != `string`) ||
            (t.fillRect(0, 0, 1, 1), ([ip, ap, op, J] = t.getImageData(0, 0, 1, 1).data), J !== 255)
          )
            throw Error(`css.toColor: Unsupported css format`);
          return { rgba: cp.toRgba(ip, ap, op, J), css: e };
        }
        e.toColor = r;
      })((X ||= {})),
      ((e) => {
        function t(e) {
          return n((e >> 16) & 255, (e >> 8) & 255, e & 255);
        }
        e.relativeLuminance = t;
        function n(e, t, n) {
          let r = e / 255,
            i = t / 255,
            a = n / 255,
            o = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4,
            s = i <= 0.03928 ? i / 12.92 : ((i + 0.055) / 1.055) ** 2.4,
            c = a <= 0.03928 ? a / 12.92 : ((a + 0.055) / 1.055) ** 2.4;
          return o * 0.2126 + s * 0.7152 + c * 0.0722;
        }
        e.relativeLuminance2 = n;
      })((lp ||= {})),
      ((e) => {
        function t(e, t) {
          if (((J = (t & 255) / 255), J === 1)) return t;
          let n = (t >> 24) & 255,
            r = (t >> 16) & 255,
            i = (t >> 8) & 255,
            a = (e >> 24) & 255,
            o = (e >> 16) & 255,
            s = (e >> 8) & 255;
          return (
            (ip = a + Math.round((n - a) * J)),
            (ap = o + Math.round((r - o) * J)),
            (op = s + Math.round((i - s) * J)),
            cp.toRgba(ip, ap, op)
          );
        }
        e.blend = t;
        function n(e, t, n) {
          let a = lp.relativeLuminance(e >> 8),
            o = lp.relativeLuminance(t >> 8);
          if (Wc(a, o) < n) {
            if (o < a) {
              let o = r(e, t, n),
                s = Wc(a, lp.relativeLuminance(o >> 8));
              if (s < n) {
                let r = i(e, t, n);
                return s > Wc(a, lp.relativeLuminance(r >> 8)) ? o : r;
              }
              return o;
            }
            let s = i(e, t, n),
              c = Wc(a, lp.relativeLuminance(s >> 8));
            if (c < n) {
              let i = r(e, t, n);
              return c > Wc(a, lp.relativeLuminance(i >> 8)) ? s : i;
            }
            return s;
          }
        }
        e.ensureContrastRatio = n;
        function r(e, t, n) {
          let r = (e >> 24) & 255,
            i = (e >> 16) & 255,
            a = (e >> 8) & 255,
            o = (t >> 24) & 255,
            s = (t >> 16) & 255,
            c = (t >> 8) & 255,
            l = Wc(lp.relativeLuminance2(o, s, c), lp.relativeLuminance2(r, i, a));
          for (; l < n && (o > 0 || s > 0 || c > 0); )
            ((o -= Math.max(0, Math.ceil(o * 0.1))),
              (s -= Math.max(0, Math.ceil(s * 0.1))),
              (c -= Math.max(0, Math.ceil(c * 0.1))),
              (l = Wc(lp.relativeLuminance2(o, s, c), lp.relativeLuminance2(r, i, a))));
          return ((o << 24) | (s << 16) | (c << 8) | 255) >>> 0;
        }
        e.reduceLuminance = r;
        function i(e, t, n) {
          let r = (e >> 24) & 255,
            i = (e >> 16) & 255,
            a = (e >> 8) & 255,
            o = (t >> 24) & 255,
            s = (t >> 16) & 255,
            c = (t >> 8) & 255,
            l = Wc(lp.relativeLuminance2(o, s, c), lp.relativeLuminance2(r, i, a));
          for (; l < n && (o < 255 || s < 255 || c < 255); )
            ((o = Math.min(255, o + Math.ceil((255 - o) * 0.1))),
              (s = Math.min(255, s + Math.ceil((255 - s) * 0.1))),
              (c = Math.min(255, c + Math.ceil((255 - c) * 0.1))),
              (l = Wc(lp.relativeLuminance2(o, s, c), lp.relativeLuminance2(r, i, a))));
          return ((o << 24) | (s << 16) | (c << 8) | 255) >>> 0;
        }
        e.increaseLuminance = i;
        function a(e) {
          return [(e >> 24) & 255, (e >> 16) & 255, (e >> 8) & 255, e & 255];
        }
        e.toChannels = a;
      })((up ||= {})),
      (dp = class extends Wl {
        constructor(e, t, n) {
          (super(),
            (this.content = 0),
            (this.combinedData = ``),
            (this.fg = e.fg),
            (this.bg = e.bg),
            (this.combinedData = t),
            (this._width = n));
        }
        isCombined() {
          return 2097152;
        }
        getWidth() {
          return this._width;
        }
        getChars() {
          return this.combinedData;
        }
        getCode() {
          return 2097151;
        }
        setFromCharData(e) {
          throw Error(`not implemented`);
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }),
      (fp = class {
        constructor(e) {
          ((this._bufferService = e),
            (this._characterJoiners = []),
            (this._nextCharacterJoinerId = 0),
            (this._workCell = new Kl()));
        }
        register(e) {
          let t = { id: this._nextCharacterJoinerId++, handler: e };
          return (this._characterJoiners.push(t), t.id);
        }
        deregister(e) {
          for (let t = 0; t < this._characterJoiners.length; t++)
            if (this._characterJoiners[t].id === e)
              return (this._characterJoiners.splice(t, 1), !0);
          return !1;
        }
        getJoinedCharacters(e) {
          if (this._characterJoiners.length === 0) return [];
          let t = this._bufferService.buffer.lines.get(e);
          if (!t || t.length === 0) return [];
          let n = [],
            r = t.translateToString(!0),
            i = 0,
            a = 0,
            o = 0,
            s = t.getFg(0),
            c = t.getBg(0);
          for (let e = 0; e < t.getTrimmedLength(); e++)
            if ((t.loadCell(e, this._workCell), this._workCell.getWidth() !== 0)) {
              if (this._workCell.fg !== s || this._workCell.bg !== c) {
                if (e - i > 1) {
                  let e = this._getJoinedRanges(r, o, a, t, i);
                  for (let t = 0; t < e.length; t++) n.push(e[t]);
                }
                ((i = e), (o = a), (s = this._workCell.fg), (c = this._workCell.bg));
              }
              a += this._workCell.getChars().length || Ul.length;
            }
          if (this._bufferService.cols - i > 1) {
            let e = this._getJoinedRanges(r, o, a, t, i);
            for (let t = 0; t < e.length; t++) n.push(e[t]);
          }
          return n;
        }
        _getJoinedRanges(e, t, n, r, i) {
          let a = e.substring(t, n),
            o = [];
          try {
            o = this._characterJoiners[0].handler(a);
          } catch (e) {
            console.error(e);
          }
          for (let e = 1; e < this._characterJoiners.length; e++)
            try {
              let t = this._characterJoiners[e].handler(a);
              for (let e = 0; e < t.length; e++) fp._mergeRanges(o, t[e]);
            } catch (e) {
              console.error(e);
            }
          return (this._stringRangesToCellRanges(o, r, i), o);
        }
        _stringRangesToCellRanges(e, t, n) {
          let r = 0,
            i = !1,
            a = 0,
            o = e[r];
          if (o) {
            for (let s = n; s < this._bufferService.cols; s++) {
              let n = t.getWidth(s),
                c = t.getString(s).length || Ul.length;
              if (n !== 0) {
                if ((!i && o[0] <= a && ((o[0] = s), (i = !0)), o[1] <= a)) {
                  if (((o[1] = s), (o = e[++r]), !o)) break;
                  o[0] <= a ? ((o[0] = s), (i = !0)) : (i = !1);
                }
                a += c;
              }
            }
            o && (o[1] = this._bufferService.cols);
          }
        }
        static _mergeRanges(e, t) {
          let n = !1;
          for (let r = 0; r < e.length; r++) {
            let i = e[r];
            if (n) {
              if (t[1] <= i[0]) return ((e[r - 1][1] = t[1]), e);
              if (t[1] <= i[1]) return ((e[r - 1][1] = Math.max(t[1], i[1])), e.splice(r, 1), e);
              (e.splice(r, 1), r--);
            } else {
              if (t[1] <= i[0]) return (e.splice(r, 0, t), e);
              if (t[1] <= i[1]) return ((i[0] = Math.min(t[0], i[0])), e);
              t[0] < i[1] && ((i[0] = Math.min(t[0], i[0])), (n = !0));
              continue;
            }
          }
          return (n ? (e[e.length - 1][1] = t[1]) : e.push(t), e);
        }
      }),
      (fp = H([U(0, Xl)], fp)),
      (pp = class {
        constructor(e, t, n, r, i, a, o) {
          ((this._document = e),
            (this._characterJoinerService = t),
            (this._optionsService = n),
            (this._coreBrowserService = r),
            (this._coreService = i),
            (this._decorationService = a),
            (this._themeService = o),
            (this._workCell = new Kl()),
            (this._columnSelectMode = !1),
            (this.defaultSpacing = 0));
        }
        handleSelectionChanged(e, t, n) {
          ((this._selectionStart = e), (this._selectionEnd = t), (this._columnSelectMode = n));
        }
        createRow(e, t, n, r, i, a, o, s, c, l, u) {
          let d = [],
            f = this._characterJoinerService.getJoinedCharacters(t),
            p = this._themeService.colors,
            m = e.getNoBgTrimmedLength();
          n && m < a + 1 && (m = a + 1);
          let h,
            g = 0,
            _ = ``,
            v = 0,
            y = 0,
            b = 0,
            x = 0,
            S = !1,
            C = 0,
            w = !1,
            T = 0,
            E = 0,
            D = [],
            ee = l !== -1 && u !== -1;
          for (let O = 0; O < m; O++) {
            e.loadCell(O, this._workCell);
            let m = this._workCell.getWidth();
            if (m === 0) continue;
            let k = !1,
              A = O >= E,
              te = O,
              j = this._workCell;
            if (f.length > 0 && O === f[0][0] && A) {
              let r = f.shift(),
                i = this._isCellInSelection(r[0], t);
              for (v = r[0] + 1; v < r[1]; v++) A &&= i === this._isCellInSelection(v, t);
              ((A &&= !n || a < r[0] || a >= r[1]),
                A
                  ? ((k = !0),
                    (j = new dp(this._workCell, e.translateToString(!0, r[0], r[1]), r[1] - r[0])),
                    (te = r[1] - 1),
                    (m = j.getWidth()))
                  : (E = r[1]));
            }
            let M = this._isCellInSelection(O, t),
              N = n && O === a,
              ne = ee && O >= l && O <= u,
              re = !1;
            this._decorationService.forEachDecorationAtCell(O, t, void 0, (e) => {
              re = !0;
            });
            let ie = j.getChars() || Ul;
            if (
              (ie === ` ` && (j.isUnderline() || j.isOverline()) && (ie = `\xA0`),
              (T = m * s - c.get(ie, j.isBold(), j.isItalic())),
              !h)
            )
              h = this._document.createElement(`span`);
            else if (
              g &&
              ((M && w) || (!M && !w && j.bg === y)) &&
              ((M && w && p.selectionForeground) || j.fg === b) &&
              j.extended.ext === x &&
              ne === S &&
              T === C &&
              !N &&
              !k &&
              !re &&
              A
            ) {
              (j.isInvisible() ? (_ += Ul) : (_ += ie), g++);
              continue;
            } else
              (g && (h.textContent = _),
                (h = this._document.createElement(`span`)),
                (g = 0),
                (_ = ``));
            if (
              ((y = j.bg),
              (b = j.fg),
              (x = j.extended.ext),
              (S = ne),
              (C = T),
              (w = M),
              k && a >= O && a <= te && (a = O),
              !this._coreService.isCursorHidden && N && this._coreService.isCursorInitialized)
            ) {
              if ((D.push(`xterm-cursor`), this._coreBrowserService.isFocused))
                (o && D.push(`xterm-cursor-blink`),
                  D.push(
                    r === `bar`
                      ? `xterm-cursor-bar`
                      : r === `underline`
                        ? `xterm-cursor-underline`
                        : `xterm-cursor-block`,
                  ));
              else if (i)
                switch (i) {
                  case `outline`:
                    D.push(`xterm-cursor-outline`);
                    break;
                  case `block`:
                    D.push(`xterm-cursor-block`);
                    break;
                  case `bar`:
                    D.push(`xterm-cursor-bar`);
                    break;
                  case `underline`:
                    D.push(`xterm-cursor-underline`);
                    break;
                  default:
                    break;
                }
            }
            if (
              (j.isBold() && D.push(`xterm-bold`),
              j.isItalic() && D.push(`xterm-italic`),
              j.isDim() && D.push(`xterm-dim`),
              (_ = j.isInvisible() ? Ul : j.getChars() || Ul),
              j.isUnderline() &&
                (D.push(`xterm-underline-${j.extended.underlineStyle}`),
                _ === ` ` && (_ = `\xA0`),
                !j.isUnderlineColorDefault()))
            )
              if (j.isUnderlineColorRGB())
                h.style.textDecorationColor = `rgb(${Wl.toColorRGB(j.getUnderlineColor()).join(`,`)})`;
              else {
                let e = j.getUnderlineColor();
                (this._optionsService.rawOptions.drawBoldTextInBrightColors &&
                  j.isBold() &&
                  e < 8 &&
                  (e += 8),
                  (h.style.textDecorationColor = p.ansi[e].css));
              }
            (j.isOverline() && (D.push(`xterm-overline`), _ === ` ` && (_ = `\xA0`)),
              j.isStrikethrough() && D.push(`xterm-strikethrough`),
              ne && (h.style.textDecoration = `underline`));
            let ae = j.getFgColor(),
              oe = j.getFgColorMode(),
              P = j.getBgColor(),
              se = j.getBgColorMode(),
              ce = !!j.isInverse();
            if (ce) {
              let e = ae;
              ((ae = P), (P = e));
              let t = oe;
              ((oe = se), (se = t));
            }
            let le,
              ue,
              de = !1;
            (this._decorationService.forEachDecorationAtCell(O, t, void 0, (e) => {
              (e.options.layer !== `top` && de) ||
                (e.backgroundColorRGB &&
                  ((se = 50331648),
                  (P = (e.backgroundColorRGB.rgba >> 8) & 16777215),
                  (le = e.backgroundColorRGB)),
                e.foregroundColorRGB &&
                  ((oe = 50331648),
                  (ae = (e.foregroundColorRGB.rgba >> 8) & 16777215),
                  (ue = e.foregroundColorRGB)),
                (de = e.options.layer === `top`));
            }),
              !de &&
                M &&
                ((le = this._coreBrowserService.isFocused
                  ? p.selectionBackgroundOpaque
                  : p.selectionInactiveBackgroundOpaque),
                (P = (le.rgba >> 8) & 16777215),
                (se = 50331648),
                (de = !0),
                p.selectionForeground &&
                  ((oe = 50331648),
                  (ae = (p.selectionForeground.rgba >> 8) & 16777215),
                  (ue = p.selectionForeground))),
              de && D.push(`xterm-decoration-top`));
            let fe;
            switch (se) {
              case 16777216:
              case 33554432:
                ((fe = p.ansi[P]), D.push(`xterm-bg-${P}`));
                break;
              case 50331648:
                ((fe = cp.toColor(P >> 16, (P >> 8) & 255, P & 255)),
                  this._addStyle(h, `background-color:#${Xc((P >>> 0).toString(16), `0`, 6)}`));
                break;
              default:
                ce ? ((fe = p.foreground), D.push(`xterm-bg-257`)) : (fe = p.background);
            }
            switch ((le || (j.isDim() && (le = Y.multiplyOpacity(fe, 0.5))), oe)) {
              case 16777216:
              case 33554432:
                (j.isBold() &&
                  ae < 8 &&
                  this._optionsService.rawOptions.drawBoldTextInBrightColors &&
                  (ae += 8),
                  this._applyMinimumContrast(h, fe, p.ansi[ae], j, le, void 0) ||
                    D.push(`xterm-fg-${ae}`));
                break;
              case 50331648:
                let e = cp.toColor((ae >> 16) & 255, (ae >> 8) & 255, ae & 255);
                this._applyMinimumContrast(h, fe, e, j, le, ue) ||
                  this._addStyle(h, `color:#${Xc(ae.toString(16), `0`, 6)}`);
                break;
              default:
                this._applyMinimumContrast(h, fe, p.foreground, j, le, ue) ||
                  (ce && D.push(`xterm-fg-257`));
            }
            ((D.length &&= ((h.className = D.join(` `)), 0)),
              !N && !k && !re && A ? g++ : (h.textContent = _),
              T !== this.defaultSpacing && (h.style.letterSpacing = `${T}px`),
              d.push(h),
              (O = te));
          }
          return (h && g && (h.textContent = _), d);
        }
        _applyMinimumContrast(e, t, n, r, i, a) {
          if (this._optionsService.rawOptions.minimumContrastRatio === 1 || qc(r.getCode()))
            return !1;
          let o = this._getContrastCache(r),
            s;
          if ((!i && !a && (s = o.getColor(t.rgba, n.rgba)), s === void 0)) {
            let e = this._optionsService.rawOptions.minimumContrastRatio / (r.isDim() ? 2 : 1);
            ((s = Y.ensureContrastRatio(i || t, a || n, e)),
              o.setColor((i || t).rgba, (a || n).rgba, s ?? null));
          }
          return s ? (this._addStyle(e, `color:${s.css}`), !0) : !1;
        }
        _getContrastCache(e) {
          return e.isDim()
            ? this._themeService.colors.halfContrastCache
            : this._themeService.colors.contrastCache;
        }
        _addStyle(e, t) {
          e.setAttribute(`style`, `${e.getAttribute(`style`) || ``}${t};`);
        }
        _isCellInSelection(e, t) {
          let n = this._selectionStart,
            r = this._selectionEnd;
          return !n || !r
            ? !1
            : this._columnSelectMode
              ? n[0] <= r[0]
                ? e >= n[0] && t >= n[1] && e < r[0] && t <= r[1]
                : e < n[0] && t >= n[1] && e >= r[0] && t <= r[1]
              : (t > n[1] && t < r[1]) ||
                (n[1] === r[1] && t === n[1] && e >= n[0] && e < r[0]) ||
                (n[1] < r[1] && t === r[1] && e < r[0]) ||
                (n[1] < r[1] && t === n[1] && e >= n[0]);
        }
      }),
      (pp = H([U(1, fu), U(2, nu), U(3, cu), U(4, Ql), U(5, au), U(6, pu)], pp)),
      (mp = class {
        constructor(e, t) {
          ((this._flat = new Float32Array(256)),
            (this._font = ``),
            (this._fontSize = 0),
            (this._weight = `normal`),
            (this._weightBold = `bold`),
            (this._measureElements = []),
            (this._container = e.createElement(`div`)),
            this._container.classList.add(`xterm-width-cache-measure-container`),
            this._container.setAttribute(`aria-hidden`, `true`),
            (this._container.style.whiteSpace = `pre`),
            (this._container.style.fontKerning = `none`));
          let n = e.createElement(`span`);
          n.classList.add(`xterm-char-measure-element`);
          let r = e.createElement(`span`);
          (r.classList.add(`xterm-char-measure-element`), (r.style.fontWeight = `bold`));
          let i = e.createElement(`span`);
          (i.classList.add(`xterm-char-measure-element`), (i.style.fontStyle = `italic`));
          let a = e.createElement(`span`);
          (a.classList.add(`xterm-char-measure-element`),
            (a.style.fontWeight = `bold`),
            (a.style.fontStyle = `italic`),
            (this._measureElements = [n, r, i, a]),
            this._container.appendChild(n),
            this._container.appendChild(r),
            this._container.appendChild(i),
            this._container.appendChild(a),
            t.appendChild(this._container),
            this.clear());
        }
        dispose() {
          (this._container.remove(), (this._measureElements.length = 0), (this._holey = void 0));
        }
        clear() {
          (this._flat.fill(-9999), (this._holey = new Map()));
        }
        setFont(e, t, n, r) {
          (e === this._font &&
            t === this._fontSize &&
            n === this._weight &&
            r === this._weightBold) ||
            ((this._font = e),
            (this._fontSize = t),
            (this._weight = n),
            (this._weightBold = r),
            (this._container.style.fontFamily = this._font),
            (this._container.style.fontSize = `${this._fontSize}px`),
            (this._measureElements[0].style.fontWeight = `${n}`),
            (this._measureElements[1].style.fontWeight = `${r}`),
            (this._measureElements[2].style.fontWeight = `${n}`),
            (this._measureElements[3].style.fontWeight = `${r}`),
            this.clear());
        }
        get(e, t, n) {
          let r = 0;
          if (!t && !n && e.length === 1 && (r = e.charCodeAt(0)) < 256) {
            if (this._flat[r] !== -9999) return this._flat[r];
            let t = this._measure(e, 0);
            return (t > 0 && (this._flat[r] = t), t);
          }
          let i = e;
          (t && (i += `B`), n && (i += `I`));
          let a = this._holey.get(i);
          if (a === void 0) {
            let r = 0;
            (t && (r |= 1),
              n && (r |= 2),
              (a = this._measure(e, r)),
              a > 0 && this._holey.set(i, a));
          }
          return a;
        }
        _measure(e, t) {
          let n = this._measureElements[t];
          return ((n.textContent = e.repeat(32)), n.offsetWidth / 32);
        }
      }),
      (hp = class {
        constructor() {
          this.clear();
        }
        clear() {
          ((this.hasSelection = !1),
            (this.columnSelectMode = !1),
            (this.viewportStartRow = 0),
            (this.viewportEndRow = 0),
            (this.viewportCappedStartRow = 0),
            (this.viewportCappedEndRow = 0),
            (this.startCol = 0),
            (this.endCol = 0),
            (this.selectionStart = void 0),
            (this.selectionEnd = void 0));
        }
        update(e, t, n, r = !1) {
          if (
            ((this.selectionStart = t),
            (this.selectionEnd = n),
            !t || !n || (t[0] === n[0] && t[1] === n[1]))
          ) {
            this.clear();
            return;
          }
          let i = e.buffers.active.ydisp,
            a = t[1] - i,
            o = n[1] - i,
            s = Math.max(a, 0),
            c = Math.min(o, e.rows - 1);
          if (s >= e.rows || c < 0) {
            this.clear();
            return;
          }
          ((this.hasSelection = !0),
            (this.columnSelectMode = r),
            (this.viewportStartRow = a),
            (this.viewportEndRow = o),
            (this.viewportCappedStartRow = s),
            (this.viewportCappedEndRow = c),
            (this.startCol = t[0]),
            (this.endCol = n[0]));
        }
        isCellSelected(e, t, n) {
          return this.hasSelection
            ? ((n -= e.buffer.active.viewportY),
              this.columnSelectMode
                ? this.startCol <= this.endCol
                  ? t >= this.startCol &&
                    n >= this.viewportCappedStartRow &&
                    t < this.endCol &&
                    n <= this.viewportCappedEndRow
                  : t < this.startCol &&
                    n >= this.viewportCappedStartRow &&
                    t >= this.endCol &&
                    n <= this.viewportCappedEndRow
                : (n > this.viewportStartRow && n < this.viewportEndRow) ||
                  (this.viewportStartRow === this.viewportEndRow &&
                    n === this.viewportStartRow &&
                    t >= this.startCol &&
                    t < this.endCol) ||
                  (this.viewportStartRow < this.viewportEndRow &&
                    n === this.viewportEndRow &&
                    t < this.endCol) ||
                  (this.viewportStartRow < this.viewportEndRow &&
                    n === this.viewportStartRow &&
                    t >= this.startCol))
            : !1;
        }
      }),
      (gp = `xterm-dom-renderer-owner-`),
      (_p = `xterm-rows`),
      (vp = `xterm-fg-`),
      (yp = `xterm-bg-`),
      (bp = `xterm-focus`),
      (xp = `xterm-selection`),
      (Sp = 1),
      (Cp = class extends W {
        constructor(e, t, n, r, i, a, o, s, c, l, u, d, f, p) {
          (super(),
            (this._terminal = e),
            (this._document = t),
            (this._element = n),
            (this._screenElement = r),
            (this._viewportElement = i),
            (this._helperContainer = a),
            (this._linkifier2 = o),
            (this._charSizeService = c),
            (this._optionsService = l),
            (this._bufferService = u),
            (this._coreService = d),
            (this._coreBrowserService = f),
            (this._themeService = p),
            (this._terminalClass = Sp++),
            (this._rowElements = []),
            (this._selectionRenderModel = Zc()),
            (this.onRequestRedraw = this._register(new K()).event),
            (this._rowContainer = this._document.createElement(`div`)),
            this._rowContainer.classList.add(_p),
            (this._rowContainer.style.lineHeight = `normal`),
            this._rowContainer.setAttribute(`aria-hidden`, `true`),
            this._refreshRowElements(this._bufferService.cols, this._bufferService.rows),
            (this._selectionContainer = this._document.createElement(`div`)),
            this._selectionContainer.classList.add(xp),
            this._selectionContainer.setAttribute(`aria-hidden`, `true`),
            (this.dimensions = Jc()),
            this._updateDimensions(),
            this._register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())),
            this._register(this._themeService.onChangeColors((e) => this._injectCss(e))),
            this._injectCss(this._themeService.colors),
            (this._rowFactory = s.createInstance(pp, document)),
            this._element.classList.add(gp + this._terminalClass),
            this._screenElement.appendChild(this._rowContainer),
            this._screenElement.appendChild(this._selectionContainer),
            this._register(this._linkifier2.onShowLinkUnderline((e) => this._handleLinkHover(e))),
            this._register(this._linkifier2.onHideLinkUnderline((e) => this._handleLinkLeave(e))),
            this._register(
              z(() => {
                (this._element.classList.remove(gp + this._terminalClass),
                  this._rowContainer.remove(),
                  this._selectionContainer.remove(),
                  this._widthCache.dispose(),
                  this._themeStyleElement.remove(),
                  this._dimensionsStyleElement.remove());
              }),
            ),
            (this._widthCache = new mp(this._document, this._helperContainer)),
            this._widthCache.setFont(
              this._optionsService.rawOptions.fontFamily,
              this._optionsService.rawOptions.fontSize,
              this._optionsService.rawOptions.fontWeight,
              this._optionsService.rawOptions.fontWeightBold,
            ),
            this._setDefaultSpacing());
        }
        _updateDimensions() {
          let e = this._coreBrowserService.dpr;
          ((this.dimensions.device.char.width = this._charSizeService.width * e),
            (this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * e)),
            (this.dimensions.device.cell.width =
              this.dimensions.device.char.width +
              Math.round(this._optionsService.rawOptions.letterSpacing)),
            (this.dimensions.device.cell.height = Math.floor(
              this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight,
            )),
            (this.dimensions.device.char.left = 0),
            (this.dimensions.device.char.top = 0),
            (this.dimensions.device.canvas.width =
              this.dimensions.device.cell.width * this._bufferService.cols),
            (this.dimensions.device.canvas.height =
              this.dimensions.device.cell.height * this._bufferService.rows),
            (this.dimensions.css.canvas.width = Math.round(
              this.dimensions.device.canvas.width / e,
            )),
            (this.dimensions.css.canvas.height = Math.round(
              this.dimensions.device.canvas.height / e,
            )),
            (this.dimensions.css.cell.width =
              this.dimensions.css.canvas.width / this._bufferService.cols),
            (this.dimensions.css.cell.height =
              this.dimensions.css.canvas.height / this._bufferService.rows));
          for (let e of this._rowElements)
            ((e.style.width = `${this.dimensions.css.canvas.width}px`),
              (e.style.height = `${this.dimensions.css.cell.height}px`),
              (e.style.lineHeight = `${this.dimensions.css.cell.height}px`),
              (e.style.overflow = `hidden`));
          this._dimensionsStyleElement ||
            ((this._dimensionsStyleElement = this._document.createElement(`style`)),
            this._screenElement.appendChild(this._dimensionsStyleElement));
          let t = `${this._terminalSelector} .${_p} span { display: inline-block; height: 100%; vertical-align: top;}`;
          ((this._dimensionsStyleElement.textContent = t),
            (this._selectionContainer.style.height = this._viewportElement.style.height),
            (this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`),
            (this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`));
        }
        _injectCss(e) {
          this._themeStyleElement ||
            ((this._themeStyleElement = this._document.createElement(`style`)),
            this._screenElement.appendChild(this._themeStyleElement));
          let t = `${this._terminalSelector} .${_p} { pointer-events: none; color: ${e.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
          ((t += `${this._terminalSelector} .${_p} .xterm-dim { color: ${Y.multiplyOpacity(e.foreground, 0.5).css};}`),
            (t += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`));
          let n = `blink_underline_${this._terminalClass}`,
            r = `blink_bar_${this._terminalClass}`,
            i = `blink_block_${this._terminalClass}`;
          ((t += `@keyframes ${n} { 50% {  border-bottom-style: hidden; }}`),
            (t += `@keyframes ${r} { 50% {  box-shadow: none; }}`),
            (t += `@keyframes ${i} { 0% {  background-color: ${e.cursor.css};  color: ${e.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${e.cursor.css}; }}`),
            (t += `${this._terminalSelector} .${_p}.${bp} .xterm-cursor.xterm-cursor-blink.xterm-cursor-underline { animation: ${n} 1s step-end infinite;}${this._terminalSelector} .${_p}.${bp} .xterm-cursor.xterm-cursor-blink.xterm-cursor-bar { animation: ${r} 1s step-end infinite;}${this._terminalSelector} .${_p}.${bp} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: ${i} 1s step-end infinite;}${this._terminalSelector} .${_p} .xterm-cursor.xterm-cursor-block { background-color: ${e.cursor.css}; color: ${e.cursorAccent.css};}${this._terminalSelector} .${_p} .xterm-cursor.xterm-cursor-block:not(.xterm-cursor-blink) { background-color: ${e.cursor.css} !important; color: ${e.cursorAccent.css} !important;}${this._terminalSelector} .${_p} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${e.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${_p} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${e.cursor.css} inset;}${this._terminalSelector} .${_p} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${e.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`),
            (t += `${this._terminalSelector} .${xp} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${xp} div { position: absolute; background-color: ${e.selectionBackgroundOpaque.css};}${this._terminalSelector} .${xp} div { position: absolute; background-color: ${e.selectionInactiveBackgroundOpaque.css};}`));
          for (let [n, r] of e.ansi.entries())
            t += `${this._terminalSelector} .${vp}${n} { color: ${r.css}; }${this._terminalSelector} .${vp}${n}.xterm-dim { color: ${Y.multiplyOpacity(r, 0.5).css}; }${this._terminalSelector} .${yp}${n} { background-color: ${r.css}; }`;
          ((t += `${this._terminalSelector} .${vp}257 { color: ${Y.opaque(e.background).css}; }${this._terminalSelector} .${vp}257.xterm-dim { color: ${Y.multiplyOpacity(Y.opaque(e.background), 0.5).css}; }${this._terminalSelector} .${yp}257 { background-color: ${e.foreground.css}; }`),
            (this._themeStyleElement.textContent = t));
        }
        _setDefaultSpacing() {
          let e = this.dimensions.css.cell.width - this._widthCache.get(`W`, !1, !1);
          ((this._rowContainer.style.letterSpacing = `${e}px`),
            (this._rowFactory.defaultSpacing = e));
        }
        handleDevicePixelRatioChange() {
          (this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing());
        }
        _refreshRowElements(e, t) {
          for (let e = this._rowElements.length; e <= t; e++) {
            let e = this._document.createElement(`div`);
            (this._rowContainer.appendChild(e), this._rowElements.push(e));
          }
          for (; this._rowElements.length > t; )
            this._rowContainer.removeChild(this._rowElements.pop());
        }
        handleResize(e, t) {
          (this._refreshRowElements(e, t),
            this._updateDimensions(),
            this.handleSelectionChanged(
              this._selectionRenderModel.selectionStart,
              this._selectionRenderModel.selectionEnd,
              this._selectionRenderModel.columnSelectMode,
            ));
        }
        handleCharSizeChanged() {
          (this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing());
        }
        handleBlur() {
          (this._rowContainer.classList.remove(bp),
            this.renderRows(0, this._bufferService.rows - 1));
        }
        handleFocus() {
          (this._rowContainer.classList.add(bp),
            this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y));
        }
        handleSelectionChanged(e, t, n) {
          if (
            (this._selectionContainer.replaceChildren(),
            this._rowFactory.handleSelectionChanged(e, t, n),
            this.renderRows(0, this._bufferService.rows - 1),
            !e ||
              !t ||
              (this._selectionRenderModel.update(this._terminal, e, t, n),
              !this._selectionRenderModel.hasSelection))
          )
            return;
          let r = this._selectionRenderModel.viewportStartRow,
            i = this._selectionRenderModel.viewportEndRow,
            a = this._selectionRenderModel.viewportCappedStartRow,
            o = this._selectionRenderModel.viewportCappedEndRow,
            s = this._document.createDocumentFragment();
          if (n) {
            let n = e[0] > t[0];
            s.appendChild(
              this._createSelectionElement(a, n ? t[0] : e[0], n ? e[0] : t[0], o - a + 1),
            );
          } else {
            let n = r === a ? e[0] : 0,
              c = a === i ? t[0] : this._bufferService.cols;
            s.appendChild(this._createSelectionElement(a, n, c));
            let l = o - a - 1;
            if (
              (s.appendChild(this._createSelectionElement(a + 1, 0, this._bufferService.cols, l)),
              a !== o)
            ) {
              let e = i === o ? t[0] : this._bufferService.cols;
              s.appendChild(this._createSelectionElement(o, 0, e));
            }
          }
          this._selectionContainer.appendChild(s);
        }
        _createSelectionElement(e, t, n, r = 1) {
          let i = this._document.createElement(`div`),
            a = t * this.dimensions.css.cell.width,
            o = this.dimensions.css.cell.width * (n - t);
          return (
            a + o > this.dimensions.css.canvas.width && (o = this.dimensions.css.canvas.width - a),
            (i.style.height = `${r * this.dimensions.css.cell.height}px`),
            (i.style.top = `${e * this.dimensions.css.cell.height}px`),
            (i.style.left = `${a}px`),
            (i.style.width = `${o}px`),
            i
          );
        }
        handleCursorMove() {}
        _handleOptionsChanged() {
          (this._updateDimensions(),
            this._injectCss(this._themeService.colors),
            this._widthCache.setFont(
              this._optionsService.rawOptions.fontFamily,
              this._optionsService.rawOptions.fontSize,
              this._optionsService.rawOptions.fontWeight,
              this._optionsService.rawOptions.fontWeightBold,
            ),
            this._setDefaultSpacing());
        }
        clear() {
          for (let e of this._rowElements) e.replaceChildren();
        }
        renderRows(e, t) {
          let n = this._bufferService.buffer,
            r = n.ybase + n.y,
            i = Math.min(n.x, this._bufferService.cols - 1),
            a =
              this._coreService.decPrivateModes.cursorBlink ??
              this._optionsService.rawOptions.cursorBlink,
            o =
              this._coreService.decPrivateModes.cursorStyle ??
              this._optionsService.rawOptions.cursorStyle,
            s = this._optionsService.rawOptions.cursorInactiveStyle;
          for (let c = e; c <= t; c++) {
            let e = c + n.ydisp,
              t = this._rowElements[c],
              l = n.lines.get(e);
            if (!t || !l) break;
            t.replaceChildren(
              ...this._rowFactory.createRow(
                l,
                e,
                e === r,
                o,
                s,
                i,
                a,
                this.dimensions.css.cell.width,
                this._widthCache,
                -1,
                -1,
              ),
            );
          }
        }
        get _terminalSelector() {
          return `.${gp}${this._terminalClass}`;
        }
        _handleLinkHover(e) {
          this._setCellUnderline(e.x1, e.x2, e.y1, e.y2, e.cols, !0);
        }
        _handleLinkLeave(e) {
          this._setCellUnderline(e.x1, e.x2, e.y1, e.y2, e.cols, !1);
        }
        _setCellUnderline(e, t, n, r, i, a) {
          (n < 0 && (e = 0), r < 0 && (t = 0));
          let o = this._bufferService.rows - 1;
          ((n = Math.max(Math.min(n, o), 0)),
            (r = Math.max(Math.min(r, o), 0)),
            (i = Math.min(i, this._bufferService.cols)));
          let s = this._bufferService.buffer,
            c = s.ybase + s.y,
            l = Math.min(s.x, i - 1),
            u = this._optionsService.rawOptions.cursorBlink,
            d = this._optionsService.rawOptions.cursorStyle,
            f = this._optionsService.rawOptions.cursorInactiveStyle;
          for (let o = n; o <= r; ++o) {
            let p = o + s.ydisp,
              m = this._rowElements[o],
              h = s.lines.get(p);
            if (!m || !h) break;
            m.replaceChildren(
              ...this._rowFactory.createRow(
                h,
                p,
                p === c,
                d,
                f,
                l,
                u,
                this.dimensions.css.cell.width,
                this._widthCache,
                a ? (o === n ? e : 0) : -1,
                a ? (o === r ? t : i) - 1 : -1,
              ),
            );
          }
        }
      }),
      (Cp = H([U(7, eu), U(8, su), U(9, nu), U(10, Xl), U(11, Ql), U(12, cu), U(13, pu)], Cp)),
      (wp = class extends W {
        constructor(e, t, n) {
          (super(),
            (this._optionsService = n),
            (this.width = 0),
            (this.height = 0),
            (this._onCharSizeChange = this._register(new K())),
            (this.onCharSizeChange = this._onCharSizeChange.event));
          try {
            this._measureStrategy = this._register(new Dp(this._optionsService));
          } catch {
            this._measureStrategy = this._register(new Ep(e, t, this._optionsService));
          }
          this._register(
            this._optionsService.onMultipleOptionChange([`fontFamily`, `fontSize`], () =>
              this.measure(),
            ),
          );
        }
        get hasValidSize() {
          return this.width > 0 && this.height > 0;
        }
        measure() {
          let e = this._measureStrategy.measure();
          (e.width !== this.width || e.height !== this.height) &&
            ((this.width = e.width), (this.height = e.height), this._onCharSizeChange.fire());
        }
      }),
      (wp = H([U(2, nu)], wp)),
      (Tp = class extends W {
        constructor() {
          (super(...arguments), (this._result = { width: 0, height: 0 }));
        }
        _validateAndSet(e, t) {
          e !== void 0 &&
            e > 0 &&
            t !== void 0 &&
            t > 0 &&
            ((this._result.width = e), (this._result.height = t));
        }
      }),
      (Ep = class extends Tp {
        constructor(e, t, n) {
          (super(),
            (this._document = e),
            (this._parentElement = t),
            (this._optionsService = n),
            (this._measureElement = this._document.createElement(`span`)),
            this._measureElement.classList.add(`xterm-char-measure-element`),
            (this._measureElement.textContent = `W`.repeat(32)),
            this._measureElement.setAttribute(`aria-hidden`, `true`),
            (this._measureElement.style.whiteSpace = `pre`),
            (this._measureElement.style.fontKerning = `none`),
            this._parentElement.appendChild(this._measureElement));
        }
        measure() {
          return (
            (this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily),
            (this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`),
            this._validateAndSet(
              Number(this._measureElement.offsetWidth) / 32,
              Number(this._measureElement.offsetHeight),
            ),
            this._result
          );
        }
      }),
      (Dp = class extends Tp {
        constructor(e) {
          (super(),
            (this._optionsService = e),
            (this._canvas = new OffscreenCanvas(100, 100)),
            (this._ctx = this._canvas.getContext(`2d`)));
          let t = this._ctx.measureText(`W`);
          if (!(`width` in t && `fontBoundingBoxAscent` in t && `fontBoundingBoxDescent` in t))
            throw Error(`Required font metrics not supported`);
        }
        measure() {
          this._ctx.font = `${this._optionsService.rawOptions.fontSize}px ${this._optionsService.rawOptions.fontFamily}`;
          let e = this._ctx.measureText(`W`);
          return (
            this._validateAndSet(e.width, e.fontBoundingBoxAscent + e.fontBoundingBoxDescent),
            this._result
          );
        }
      }),
      (Op = class extends W {
        constructor(e, t, n) {
          (super(),
            (this._textarea = e),
            (this._window = t),
            (this.mainDocument = n),
            (this._isFocused = !1),
            (this._cachedIsFocused = void 0),
            (this._screenDprMonitor = this._register(new kp(this._window))),
            (this._onDprChange = this._register(new K())),
            (this.onDprChange = this._onDprChange.event),
            (this._onWindowChange = this._register(new K())),
            (this.onWindowChange = this._onWindowChange.event),
            this._register(this.onWindowChange((e) => this._screenDprMonitor.setWindow(e))),
            this._register(Vu.forward(this._screenDprMonitor.onDprChange, this._onDprChange)),
            this._register(B(this._textarea, `focus`, () => (this._isFocused = !0))),
            this._register(B(this._textarea, `blur`, () => (this._isFocused = !1))));
        }
        get window() {
          return this._window;
        }
        set window(e) {
          this._window !== e && ((this._window = e), this._onWindowChange.fire(this._window));
        }
        get dpr() {
          return this.window.devicePixelRatio;
        }
        get isFocused() {
          return (
            this._cachedIsFocused === void 0 &&
              ((this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus()),
              queueMicrotask(() => (this._cachedIsFocused = void 0))),
            this._cachedIsFocused
          );
        }
      }),
      (kp = class extends W {
        constructor(e) {
          (super(),
            (this._parentWindow = e),
            (this._windowResizeListener = this._register(new Mu())),
            (this._onDprChange = this._register(new K())),
            (this.onDprChange = this._onDprChange.event),
            (this._outerListener = () => this._setDprAndFireIfDiffers()),
            (this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio),
            this._updateDpr(),
            this._setWindowResizeListener(),
            this._register(z(() => this.clearListener())));
        }
        setWindow(e) {
          ((this._parentWindow = e),
            this._setWindowResizeListener(),
            this._setDprAndFireIfDiffers());
        }
        _setWindowResizeListener() {
          this._windowResizeListener.value = B(this._parentWindow, `resize`, () =>
            this._setDprAndFireIfDiffers(),
          );
        }
        _setDprAndFireIfDiffers() {
          (this._parentWindow.devicePixelRatio !== this._currentDevicePixelRatio &&
            this._onDprChange.fire(this._parentWindow.devicePixelRatio),
            this._updateDpr());
        }
        _updateDpr() {
          this._outerListener &&
            (this._resolutionMediaMatchList?.removeListener(this._outerListener),
            (this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio),
            (this._resolutionMediaMatchList = this._parentWindow.matchMedia(
              `screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`,
            )),
            this._resolutionMediaMatchList.addListener(this._outerListener));
        }
        clearListener() {
          !this._resolutionMediaMatchList ||
            !this._outerListener ||
            (this._resolutionMediaMatchList.removeListener(this._outerListener),
            (this._resolutionMediaMatchList = void 0),
            (this._outerListener = void 0));
        }
      }),
      (Ap = class extends W {
        constructor() {
          (super(),
            (this.linkProviders = []),
            this._register(z(() => (this.linkProviders.length = 0))));
        }
        registerLinkProvider(e) {
          return (
            this.linkProviders.push(e),
            {
              dispose: () => {
                let t = this.linkProviders.indexOf(e);
                t !== -1 && this.linkProviders.splice(t, 1);
              },
            }
          );
        }
      }),
      (jp = class {
        constructor(e, t) {
          ((this._renderService = e), (this._charSizeService = t));
        }
        getCoords(e, t, n, r, i) {
          return $c(
            window,
            e,
            t,
            n,
            r,
            this._charSizeService.hasValidSize,
            this._renderService.dimensions.css.cell.width,
            this._renderService.dimensions.css.cell.height,
            i,
          );
        }
        getMouseReportCoords(e, t) {
          let n = Qc(window, e, t);
          if (this._charSizeService.hasValidSize)
            return (
              (n[0] = Math.min(
                Math.max(n[0], 0),
                this._renderService.dimensions.css.canvas.width - 1,
              )),
              (n[1] = Math.min(
                Math.max(n[1], 0),
                this._renderService.dimensions.css.canvas.height - 1,
              )),
              {
                col: Math.floor(n[0] / this._renderService.dimensions.css.cell.width),
                row: Math.floor(n[1] / this._renderService.dimensions.css.cell.height),
                x: Math.floor(n[0]),
                y: Math.floor(n[1]),
              }
            );
        }
      }),
      (jp = H([U(0, uu), U(1, su)], jp)),
      (Mp = class {
        constructor(e, t) {
          ((this._renderCallback = e),
            (this._coreBrowserService = t),
            (this._refreshCallbacks = []));
        }
        dispose() {
          this._animationFrame &&=
            (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), void 0);
        }
        addRefreshCallback(e) {
          return (
            this._refreshCallbacks.push(e),
            (this._animationFrame ||= this._coreBrowserService.window.requestAnimationFrame(() =>
              this._innerRefresh(),
            )),
            this._animationFrame
          );
        }
        refresh(e, t, n) {
          ((this._rowCount = n),
            (e = e === void 0 ? 0 : e),
            (t = t === void 0 ? this._rowCount - 1 : t),
            (this._rowStart = this._rowStart === void 0 ? e : Math.min(this._rowStart, e)),
            (this._rowEnd = this._rowEnd === void 0 ? t : Math.max(this._rowEnd, t)),
            !this._animationFrame &&
              (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() =>
                this._innerRefresh(),
              )));
        }
        _innerRefresh() {
          if (
            ((this._animationFrame = void 0),
            this._rowStart === void 0 || this._rowEnd === void 0 || this._rowCount === void 0)
          ) {
            this._runRefreshCallbacks();
            return;
          }
          let e = Math.max(this._rowStart, 0),
            t = Math.min(this._rowEnd, this._rowCount - 1);
          ((this._rowStart = void 0),
            (this._rowEnd = void 0),
            this._renderCallback(e, t),
            this._runRefreshCallbacks());
        }
        _runRefreshCallbacks() {
          for (let e of this._refreshCallbacks) e(0);
          this._refreshCallbacks = [];
        }
      }),
      (Np = {}),
      Fl(Np, {
        getSafariVersion: () => el,
        isChromeOS: () => Gp,
        isFirefox: () => Lp,
        isIpad: () => Vp,
        isIphone: () => Hp,
        isLegacyEdge: () => Rp,
        isLinux: () => Wp,
        isMac: () => Bp,
        isNode: () => Pp,
        isSafari: () => zp,
        isWindows: () => Up,
      }),
      (Pp = typeof process < `u` && `title` in process),
      (Fp = Pp ? `node` : navigator.userAgent),
      (Ip = Pp ? `node` : navigator.platform),
      (Lp = Fp.includes(`Firefox`)),
      (Rp = Fp.includes(`Edge`)),
      (zp = /^((?!chrome|android).)*safari/i.test(Fp)),
      (Bp = [`Macintosh`, `MacIntel`, `MacPPC`, `Mac68K`].includes(Ip)),
      (Vp = Ip === `iPad`),
      (Hp = Ip === `iPhone`),
      (Up = [`Windows`, `Win16`, `Win32`, `WinCE`].includes(Ip)),
      (Wp = Ip.indexOf(`Linux`) >= 0),
      (Gp = /\bCrOS\b/.test(Fp)),
      (Kp = class {
        constructor() {
          ((this._tasks = []), (this._i = 0));
        }
        enqueue(e) {
          (this._tasks.push(e), this._start());
        }
        flush() {
          for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
          this.clear();
        }
        clear() {
          ((this._idleCallback &&= (this._cancelCallback(this._idleCallback), void 0)),
            (this._i = 0),
            (this._tasks.length = 0));
        }
        _start() {
          this._idleCallback ||= this._requestCallback(this._process.bind(this));
        }
        _process(e) {
          this._idleCallback = void 0;
          let t = 0,
            n = 0,
            r = e.timeRemaining(),
            i = 0;
          for (; this._i < this._tasks.length; ) {
            if (
              ((t = performance.now()),
              this._tasks[this._i]() || this._i++,
              (t = Math.max(1, performance.now() - t)),
              (n = Math.max(t, n)),
              (i = e.timeRemaining()),
              n * 1.5 > i)
            ) {
              (r - t < -20 &&
                console.warn(
                  `task queue exceeded allotted deadline by ${Math.abs(Math.round(r - t))}ms`,
                ),
                this._start());
              return;
            }
            r = i;
          }
          this.clear();
        }
      }),
      (qp = class extends Kp {
        _requestCallback(e) {
          return setTimeout(() => e(this._createDeadline(16)));
        }
        _cancelCallback(e) {
          clearTimeout(e);
        }
        _createDeadline(e) {
          let t = performance.now() + e;
          return { timeRemaining: () => Math.max(0, t - performance.now()) };
        }
      }),
      (Jp = class extends Kp {
        _requestCallback(e) {
          return requestIdleCallback(e);
        }
        _cancelCallback(e) {
          cancelIdleCallback(e);
        }
      }),
      (Yp = !Pp && `requestIdleCallback` in window ? Jp : qp),
      (Xp = class {
        constructor() {
          this._queue = new Yp();
        }
        set(e) {
          (this._queue.clear(), this._queue.enqueue(e));
        }
        flush() {
          this._queue.flush();
        }
      }),
      (Zp = class extends W {
        constructor(e, t, n, r, i, a, o, s, c) {
          (super(),
            (this._rowCount = e),
            (this._optionsService = n),
            (this._charSizeService = r),
            (this._coreService = i),
            (this._coreBrowserService = s),
            (this._renderer = this._register(new Mu())),
            (this._pausedResizeTask = new Xp()),
            (this._observerDisposable = this._register(new Mu())),
            (this._isPaused = !1),
            (this._needsFullRefresh = !1),
            (this._isNextRenderRedrawOnly = !0),
            (this._needsSelectionRefresh = !1),
            (this._canvasWidth = 0),
            (this._canvasHeight = 0),
            (this._selectionState = { start: void 0, end: void 0, columnSelectMode: !1 }),
            (this._onDimensionsChange = this._register(new K())),
            (this.onDimensionsChange = this._onDimensionsChange.event),
            (this._onRenderedViewportChange = this._register(new K())),
            (this.onRenderedViewportChange = this._onRenderedViewportChange.event),
            (this._onRender = this._register(new K())),
            (this.onRender = this._onRender.event),
            (this._onRefreshRequest = this._register(new K())),
            (this.onRefreshRequest = this._onRefreshRequest.event),
            (this._renderDebouncer = new Mp(
              (e, t) => this._renderRows(e, t),
              this._coreBrowserService,
            )),
            this._register(this._renderDebouncer),
            (this._syncOutputHandler = new Qp(this._coreBrowserService, this._coreService, () =>
              this._fullRefresh(),
            )),
            this._register(z(() => this._syncOutputHandler.dispose())),
            this._register(
              this._coreBrowserService.onDprChange(() => this.handleDevicePixelRatioChange()),
            ),
            this._register(o.onResize(() => this._fullRefresh())),
            this._register(o.buffers.onBufferActivate(() => this._renderer.value?.clear())),
            this._register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())),
            this._register(
              this._charSizeService.onCharSizeChange(() => this.handleCharSizeChanged()),
            ),
            this._register(a.onDecorationRegistered(() => this._fullRefresh())),
            this._register(a.onDecorationRemoved(() => this._fullRefresh())),
            this._register(
              this._optionsService.onMultipleOptionChange(
                [
                  `customGlyphs`,
                  `drawBoldTextInBrightColors`,
                  `letterSpacing`,
                  `lineHeight`,
                  `fontFamily`,
                  `fontSize`,
                  `fontWeight`,
                  `fontWeightBold`,
                  `minimumContrastRatio`,
                  `rescaleOverlappingGlyphs`,
                ],
                () => {
                  (this.clear(), this.handleResize(o.cols, o.rows), this._fullRefresh());
                },
              ),
            ),
            this._register(
              this._optionsService.onMultipleOptionChange([`cursorBlink`, `cursorStyle`], () =>
                this.refreshRows(o.buffer.y, o.buffer.y, !0),
              ),
            ),
            this._register(c.onChangeColors(() => this._fullRefresh())),
            this._registerIntersectionObserver(this._coreBrowserService.window, t),
            this._register(
              this._coreBrowserService.onWindowChange((e) =>
                this._registerIntersectionObserver(e, t),
              ),
            ));
        }
        get dimensions() {
          return this._renderer.value.dimensions;
        }
        _registerIntersectionObserver(e, t) {
          if (`IntersectionObserver` in e) {
            let n = new e.IntersectionObserver(
              (e) => this._handleIntersectionChange(e[e.length - 1]),
              { threshold: 0 },
            );
            (n.observe(t), (this._observerDisposable.value = z(() => n.disconnect())));
          }
        }
        _handleIntersectionChange(e) {
          ((this._isPaused =
            e.isIntersecting === void 0 ? e.intersectionRatio === 0 : !e.isIntersecting),
            !this._isPaused &&
              !this._charSizeService.hasValidSize &&
              this._charSizeService.measure(),
            !this._isPaused &&
              this._needsFullRefresh &&
              (this._pausedResizeTask.flush(),
              this.refreshRows(0, this._rowCount - 1),
              (this._needsFullRefresh = !1)));
        }
        refreshRows(e, t, n = !1) {
          if (this._isPaused) {
            this._needsFullRefresh = !0;
            return;
          }
          if (this._coreService.decPrivateModes.synchronizedOutput) {
            this._syncOutputHandler.bufferRows(e, t);
            return;
          }
          let r = this._syncOutputHandler.flush();
          (r && ((e = Math.min(e, r.start)), (t = Math.max(t, r.end))),
            n || (this._isNextRenderRedrawOnly = !1),
            this._renderDebouncer.refresh(e, t, this._rowCount));
        }
        _renderRows(e, t) {
          if (this._renderer.value) {
            if (this._coreService.decPrivateModes.synchronizedOutput) {
              this._syncOutputHandler.bufferRows(e, t);
              return;
            }
            ((e = Math.min(e, this._rowCount - 1)),
              (t = Math.min(t, this._rowCount - 1)),
              this._renderer.value.renderRows(e, t),
              (this._needsSelectionRefresh &&=
                (this._renderer.value.handleSelectionChanged(
                  this._selectionState.start,
                  this._selectionState.end,
                  this._selectionState.columnSelectMode,
                ),
                !1)),
              this._isNextRenderRedrawOnly ||
                this._onRenderedViewportChange.fire({ start: e, end: t }),
              this._onRender.fire({ start: e, end: t }),
              (this._isNextRenderRedrawOnly = !0));
          }
        }
        resize(e, t) {
          ((this._rowCount = t), this._fireOnCanvasResize());
        }
        _handleOptionsChanged() {
          this._renderer.value &&
            (this.refreshRows(0, this._rowCount - 1), this._fireOnCanvasResize());
        }
        _fireOnCanvasResize() {
          this._renderer.value &&
            ((this._renderer.value.dimensions.css.canvas.width === this._canvasWidth &&
              this._renderer.value.dimensions.css.canvas.height === this._canvasHeight) ||
              this._onDimensionsChange.fire(this._renderer.value.dimensions));
        }
        hasRenderer() {
          return !!this._renderer.value;
        }
        setRenderer(e) {
          ((this._renderer.value = e),
            this._renderer.value &&
              (this._renderer.value.onRequestRedraw((e) => this.refreshRows(e.start, e.end, !0)),
              (this._needsSelectionRefresh = !0),
              this._fullRefresh()));
        }
        addRefreshCallback(e) {
          return this._renderDebouncer.addRefreshCallback(e);
        }
        _fullRefresh() {
          this._isPaused ? (this._needsFullRefresh = !0) : this.refreshRows(0, this._rowCount - 1);
        }
        clearTextureAtlas() {
          this._renderer.value && (this._renderer.value.clearTextureAtlas?.(), this._fullRefresh());
        }
        handleDevicePixelRatioChange() {
          (this._charSizeService.measure(),
            this._renderer.value &&
              (this._renderer.value.handleDevicePixelRatioChange(),
              this.refreshRows(0, this._rowCount - 1)));
        }
        handleResize(e, t) {
          this._renderer.value &&
            (this._isPaused
              ? this._pausedResizeTask.set(() => this._renderer.value?.handleResize(e, t))
              : this._renderer.value.handleResize(e, t),
            this._fullRefresh());
        }
        handleCharSizeChanged() {
          this._renderer.value?.handleCharSizeChanged();
        }
        handleBlur() {
          this._renderer.value?.handleBlur();
        }
        handleFocus() {
          this._renderer.value?.handleFocus();
        }
        handleSelectionChanged(e, t, n) {
          ((this._selectionState.start = e),
            (this._selectionState.end = t),
            (this._selectionState.columnSelectMode = n),
            this._renderer.value?.handleSelectionChanged(e, t, n));
        }
        handleCursorMove() {
          this._renderer.value?.handleCursorMove();
        }
        clear() {
          this._renderer.value?.clear();
        }
      }),
      (Zp = H([U(2, nu), U(3, su), U(4, Ql), U(5, au), U(6, Xl), U(7, cu), U(8, pu)], Zp)),
      (Qp = class {
        constructor(e, t, n) {
          ((this._coreBrowserService = e),
            (this._coreService = t),
            (this._onTimeout = n),
            (this._start = 0),
            (this._end = 0),
            (this._isBuffering = !1));
        }
        bufferRows(e, t) {
          (this._isBuffering
            ? ((this._start = Math.min(this._start, e)), (this._end = Math.max(this._end, t)))
            : ((this._start = e), (this._end = t), (this._isBuffering = !0)),
            this._timeout === void 0 &&
              (this._timeout = this._coreBrowserService.window.setTimeout(() => {
                ((this._timeout = void 0),
                  (this._coreService.decPrivateModes.synchronizedOutput = !1),
                  this._onTimeout());
              }, 1e3)));
        }
        flush() {
          if (
            (this._timeout !== void 0 &&
              (this._coreBrowserService.window.clearTimeout(this._timeout),
              (this._timeout = void 0)),
            !this._isBuffering)
          )
            return;
          let e = { start: this._start, end: this._end };
          return ((this._isBuffering = !1), e);
        }
        dispose() {
          this._timeout !== void 0 &&
            (this._coreBrowserService.window.clearTimeout(this._timeout), (this._timeout = void 0));
        }
      }),
      ($p = class {
        constructor(e) {
          ((this._bufferService = e),
            (this.isSelectAllActive = !1),
            (this.selectionStartLength = 0));
        }
        clearSelection() {
          ((this.selectionStart = void 0),
            (this.selectionEnd = void 0),
            (this.isSelectAllActive = !1),
            (this.selectionStartLength = 0));
        }
        get finalSelectionStart() {
          return this.isSelectAllActive
            ? [0, 0]
            : !this.selectionEnd || !this.selectionStart
              ? this.selectionStart
              : this.areSelectionValuesReversed()
                ? this.selectionEnd
                : this.selectionStart;
        }
        get finalSelectionEnd() {
          if (this.isSelectAllActive)
            return [
              this._bufferService.cols,
              this._bufferService.buffer.ybase + this._bufferService.rows - 1,
            ];
          if (this.selectionStart) {
            if (!this.selectionEnd || this.areSelectionValuesReversed()) {
              let e = this.selectionStart[0] + this.selectionStartLength;
              return e > this._bufferService.cols
                ? e % this._bufferService.cols === 0
                  ? [
                      this._bufferService.cols,
                      this.selectionStart[1] + Math.floor(e / this._bufferService.cols) - 1,
                    ]
                  : [
                      e % this._bufferService.cols,
                      this.selectionStart[1] + Math.floor(e / this._bufferService.cols),
                    ]
                : [e, this.selectionStart[1]];
            }
            if (this.selectionStartLength && this.selectionEnd[1] === this.selectionStart[1]) {
              let e = this.selectionStart[0] + this.selectionStartLength;
              return e > this._bufferService.cols
                ? [
                    e % this._bufferService.cols,
                    this.selectionStart[1] + Math.floor(e / this._bufferService.cols),
                  ]
                : [Math.max(e, this.selectionEnd[0]), this.selectionEnd[1]];
            }
            return this.selectionEnd;
          }
        }
        areSelectionValuesReversed() {
          let e = this.selectionStart,
            t = this.selectionEnd;
          return !e || !t ? !1 : e[1] > t[1] || (e[1] === t[1] && e[0] > t[0]);
        }
        handleTrim(e) {
          return (
            this.selectionStart && (this.selectionStart[1] -= e),
            this.selectionEnd && (this.selectionEnd[1] -= e),
            this.selectionEnd && this.selectionEnd[1] < 0
              ? (this.clearSelection(), !0)
              : (this.selectionStart && this.selectionStart[1] < 0 && (this.selectionStart[1] = 0),
                !1)
          );
        }
      }),
      (em = 50),
      (tm = 15),
      (nm = 50),
      (rm = 500),
      (im = RegExp(`\xA0`, `g`)),
      (am = class extends W {
        constructor(e, t, n, r, i, a, o, s, c) {
          (super(),
            (this._element = e),
            (this._screenElement = t),
            (this._linkifier = n),
            (this._bufferService = r),
            (this._coreService = i),
            (this._mouseService = a),
            (this._optionsService = o),
            (this._renderService = s),
            (this._coreBrowserService = c),
            (this._dragScrollAmount = 0),
            (this._enabled = !0),
            (this._workCell = new Kl()),
            (this._mouseDownTimeStamp = 0),
            (this._oldHasSelection = !1),
            (this._oldSelectionStart = void 0),
            (this._oldSelectionEnd = void 0),
            (this._onLinuxMouseSelection = this._register(new K())),
            (this.onLinuxMouseSelection = this._onLinuxMouseSelection.event),
            (this._onRedrawRequest = this._register(new K())),
            (this.onRequestRedraw = this._onRedrawRequest.event),
            (this._onSelectionChange = this._register(new K())),
            (this.onSelectionChange = this._onSelectionChange.event),
            (this._onRequestScrollLines = this._register(new K())),
            (this.onRequestScrollLines = this._onRequestScrollLines.event),
            (this._mouseMoveListener = (e) => this._handleMouseMove(e)),
            (this._mouseUpListener = (e) => this._handleMouseUp(e)),
            this._coreService.onUserInput(() => {
              this.hasSelection && this.clearSelection();
            }),
            (this._trimListener = this._bufferService.buffer.lines.onTrim((e) =>
              this._handleTrim(e),
            )),
            this._register(
              this._bufferService.buffers.onBufferActivate((e) => this._handleBufferActivate(e)),
            ),
            this.enable(),
            (this._model = new $p(this._bufferService)),
            (this._activeSelectionMode = 0),
            this._register(
              z(() => {
                this._removeMouseDownListeners();
              }),
            ),
            this._register(
              this._bufferService.onResize((e) => {
                e.rowsChanged && this.clearSelection();
              }),
            ));
        }
        reset() {
          this.clearSelection();
        }
        disable() {
          (this.clearSelection(), (this._enabled = !1));
        }
        enable() {
          this._enabled = !0;
        }
        get selectionStart() {
          return this._model.finalSelectionStart;
        }
        get selectionEnd() {
          return this._model.finalSelectionEnd;
        }
        get hasSelection() {
          let e = this._model.finalSelectionStart,
            t = this._model.finalSelectionEnd;
          return !e || !t ? !1 : e[0] !== t[0] || e[1] !== t[1];
        }
        get selectionText() {
          let e = this._model.finalSelectionStart,
            t = this._model.finalSelectionEnd;
          if (!e || !t) return ``;
          let n = this._bufferService.buffer,
            r = [];
          if (this._activeSelectionMode === 3) {
            if (e[0] === t[0]) return ``;
            let i = e[0] < t[0] ? e[0] : t[0],
              a = e[0] < t[0] ? t[0] : e[0];
            for (let o = e[1]; o <= t[1]; o++) {
              let e = n.translateBufferLineToString(o, !0, i, a);
              r.push(e);
            }
          } else {
            let i = e[1] === t[1] ? t[0] : void 0;
            r.push(n.translateBufferLineToString(e[1], !0, e[0], i));
            for (let i = e[1] + 1; i <= t[1] - 1; i++) {
              let e = n.lines.get(i),
                t = n.translateBufferLineToString(i, !0);
              e?.isWrapped ? (r[r.length - 1] += t) : r.push(t);
            }
            if (e[1] !== t[1]) {
              let e = n.lines.get(t[1]),
                i = n.translateBufferLineToString(t[1], !0, 0, t[0]);
              e && e.isWrapped ? (r[r.length - 1] += i) : r.push(i);
            }
          }
          return r
            .map((e) => e.replace(im, ` `))
            .join(
              Up
                ? `\r
`
                : `
`,
            );
        }
        clearSelection() {
          (this._model.clearSelection(),
            this._removeMouseDownListeners(),
            this.refresh(),
            this._onSelectionChange.fire());
        }
        refresh(e) {
          ((this._refreshAnimationFrame ||= this._coreBrowserService.window.requestAnimationFrame(
            () => this._refresh(),
          )),
            Wp &&
              e &&
              this.selectionText.length &&
              this._onLinuxMouseSelection.fire(this.selectionText));
        }
        _refresh() {
          ((this._refreshAnimationFrame = void 0),
            this._onRedrawRequest.fire({
              start: this._model.finalSelectionStart,
              end: this._model.finalSelectionEnd,
              columnSelectMode: this._activeSelectionMode === 3,
            }));
        }
        _isClickInSelection(e) {
          let t = this._getMouseBufferCoords(e),
            n = this._model.finalSelectionStart,
            r = this._model.finalSelectionEnd;
          return !n || !r || !t ? !1 : this._areCoordsInSelection(t, n, r);
        }
        isCellInSelection(e, t) {
          let n = this._model.finalSelectionStart,
            r = this._model.finalSelectionEnd;
          return !n || !r ? !1 : this._areCoordsInSelection([e, t], n, r);
        }
        _areCoordsInSelection(e, t, n) {
          return (
            (e[1] > t[1] && e[1] < n[1]) ||
            (t[1] === n[1] && e[1] === t[1] && e[0] >= t[0] && e[0] < n[0]) ||
            (t[1] < n[1] && e[1] === n[1] && e[0] < n[0]) ||
            (t[1] < n[1] && e[1] === t[1] && e[0] >= t[0])
          );
        }
        _selectWordAtCursor(e, t) {
          let n = this._linkifier.currentLink?.link?.range;
          if (n)
            return (
              (this._model.selectionStart = [n.start.x - 1, n.start.y - 1]),
              (this._model.selectionStartLength = ml(n, this._bufferService.cols)),
              (this._model.selectionEnd = void 0),
              !0
            );
          let r = this._getMouseBufferCoords(e);
          return r ? (this._selectWordAt(r, t), (this._model.selectionEnd = void 0), !0) : !1;
        }
        selectAll() {
          ((this._model.isSelectAllActive = !0), this.refresh(), this._onSelectionChange.fire());
        }
        selectLines(e, t) {
          (this._model.clearSelection(),
            (e = Math.max(e, 0)),
            (t = Math.min(t, this._bufferService.buffer.lines.length - 1)),
            (this._model.selectionStart = [0, e]),
            (this._model.selectionEnd = [this._bufferService.cols, t]),
            this.refresh(),
            this._onSelectionChange.fire());
        }
        _handleTrim(e) {
          this._model.handleTrim(e) && this.refresh();
        }
        _getMouseBufferCoords(e) {
          let t = this._mouseService.getCoords(
            e,
            this._screenElement,
            this._bufferService.cols,
            this._bufferService.rows,
            !0,
          );
          if (t) return (t[0]--, t[1]--, (t[1] += this._bufferService.buffer.ydisp), t);
        }
        _getMouseEventScrollAmount(e) {
          let t = Qc(this._coreBrowserService.window, e, this._screenElement)[1],
            n = this._renderService.dimensions.css.canvas.height;
          return t >= 0 && t <= n
            ? 0
            : (t > n && (t -= n),
              (t = Math.min(Math.max(t, -em), em)),
              (t /= em),
              t / Math.abs(t) + Math.round(t * (tm - 1)));
        }
        shouldForceSelection(e) {
          return Bp
            ? e.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection
            : e.shiftKey;
        }
        handleMouseDown(e) {
          if (
            ((this._mouseDownTimeStamp = e.timeStamp),
            !(e.button === 2 && this.hasSelection) && e.button === 0)
          ) {
            if (!this._enabled) {
              if (!this.shouldForceSelection(e)) return;
              e.stopPropagation();
            }
            (e.preventDefault(),
              (this._dragScrollAmount = 0),
              this._enabled && e.shiftKey
                ? this._handleIncrementalClick(e)
                : e.detail === 1
                  ? this._handleSingleClick(e)
                  : e.detail === 2
                    ? this._handleDoubleClick(e)
                    : e.detail === 3 && this._handleTripleClick(e),
              this._addMouseDownListeners(),
              this.refresh(!0));
          }
        }
        _addMouseDownListeners() {
          (this._screenElement.ownerDocument &&
            (this._screenElement.ownerDocument.addEventListener(
              `mousemove`,
              this._mouseMoveListener,
            ),
            this._screenElement.ownerDocument.addEventListener(`mouseup`, this._mouseUpListener)),
            (this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval(
              () => this._dragScroll(),
              nm,
            )));
        }
        _removeMouseDownListeners() {
          (this._screenElement.ownerDocument &&
            (this._screenElement.ownerDocument.removeEventListener(
              `mousemove`,
              this._mouseMoveListener,
            ),
            this._screenElement.ownerDocument.removeEventListener(
              `mouseup`,
              this._mouseUpListener,
            )),
            this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer),
            (this._dragScrollIntervalTimer = void 0));
        }
        _handleIncrementalClick(e) {
          this._model.selectionStart && (this._model.selectionEnd = this._getMouseBufferCoords(e));
        }
        _handleSingleClick(e) {
          if (
            ((this._model.selectionStartLength = 0),
            (this._model.isSelectAllActive = !1),
            (this._activeSelectionMode = this.shouldColumnSelect(e) ? 3 : 0),
            (this._model.selectionStart = this._getMouseBufferCoords(e)),
            !this._model.selectionStart)
          )
            return;
          this._model.selectionEnd = void 0;
          let t = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
          t &&
            t.length !== this._model.selectionStart[0] &&
            t.hasWidth(this._model.selectionStart[0]) === 0 &&
            this._model.selectionStart[0]++;
        }
        _handleDoubleClick(e) {
          this._selectWordAtCursor(e, !0) && (this._activeSelectionMode = 1);
        }
        _handleTripleClick(e) {
          let t = this._getMouseBufferCoords(e);
          t && ((this._activeSelectionMode = 2), this._selectLineAt(t[1]));
        }
        shouldColumnSelect(e) {
          return e.altKey && !(Bp && this._optionsService.rawOptions.macOptionClickForcesSelection);
        }
        _handleMouseMove(e) {
          if ((e.stopImmediatePropagation(), !this._model.selectionStart)) return;
          let t = this._model.selectionEnd
            ? [this._model.selectionEnd[0], this._model.selectionEnd[1]]
            : null;
          if (
            ((this._model.selectionEnd = this._getMouseBufferCoords(e)), !this._model.selectionEnd)
          ) {
            this.refresh(!0);
            return;
          }
          (this._activeSelectionMode === 2
            ? this._model.selectionEnd[1] < this._model.selectionStart[1]
              ? (this._model.selectionEnd[0] = 0)
              : (this._model.selectionEnd[0] = this._bufferService.cols)
            : this._activeSelectionMode === 1 && this._selectToWordAt(this._model.selectionEnd),
            (this._dragScrollAmount = this._getMouseEventScrollAmount(e)),
            this._activeSelectionMode !== 3 &&
              (this._dragScrollAmount > 0
                ? (this._model.selectionEnd[0] = this._bufferService.cols)
                : this._dragScrollAmount < 0 && (this._model.selectionEnd[0] = 0)));
          let n = this._bufferService.buffer;
          if (this._model.selectionEnd[1] < n.lines.length) {
            let e = n.lines.get(this._model.selectionEnd[1]);
            e &&
              e.hasWidth(this._model.selectionEnd[0]) === 0 &&
              this._model.selectionEnd[0] < this._bufferService.cols &&
              this._model.selectionEnd[0]++;
          }
          (!t || t[0] !== this._model.selectionEnd[0] || t[1] !== this._model.selectionEnd[1]) &&
            this.refresh(!0);
        }
        _dragScroll() {
          if (
            !(!this._model.selectionEnd || !this._model.selectionStart) &&
            this._dragScrollAmount
          ) {
            this._onRequestScrollLines.fire({
              amount: this._dragScrollAmount,
              suppressScrollEvent: !1,
            });
            let e = this._bufferService.buffer;
            (this._dragScrollAmount > 0
              ? (this._activeSelectionMode !== 3 &&
                  (this._model.selectionEnd[0] = this._bufferService.cols),
                (this._model.selectionEnd[1] = Math.min(
                  e.ydisp + this._bufferService.rows,
                  e.lines.length - 1,
                )))
              : (this._activeSelectionMode !== 3 && (this._model.selectionEnd[0] = 0),
                (this._model.selectionEnd[1] = e.ydisp)),
              this.refresh());
          }
        }
        _handleMouseUp(e) {
          let t = e.timeStamp - this._mouseDownTimeStamp;
          if (
            (this._removeMouseDownListeners(),
            this.selectionText.length <= 1 &&
              t < rm &&
              e.altKey &&
              this._optionsService.rawOptions.altClickMovesCursor)
          ) {
            if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
              let t = this._mouseService.getCoords(
                e,
                this._element,
                this._bufferService.cols,
                this._bufferService.rows,
                !1,
              );
              if (t && t[0] !== void 0 && t[1] !== void 0) {
                let e = tl(
                  t[0] - 1,
                  t[1] - 1,
                  this._bufferService,
                  this._coreService.decPrivateModes.applicationCursorKeys,
                );
                this._coreService.triggerDataEvent(e, !0);
              }
            }
          } else this._fireEventIfSelectionChanged();
        }
        _fireEventIfSelectionChanged() {
          let e = this._model.finalSelectionStart,
            t = this._model.finalSelectionEnd,
            n = !!e && !!t && (e[0] !== t[0] || e[1] !== t[1]);
          if (!n) {
            this._oldHasSelection && this._fireOnSelectionChange(e, t, n);
            return;
          }
          !e ||
            !t ||
            ((!this._oldSelectionStart ||
              !this._oldSelectionEnd ||
              e[0] !== this._oldSelectionStart[0] ||
              e[1] !== this._oldSelectionStart[1] ||
              t[0] !== this._oldSelectionEnd[0] ||
              t[1] !== this._oldSelectionEnd[1]) &&
              this._fireOnSelectionChange(e, t, n));
        }
        _fireOnSelectionChange(e, t, n) {
          ((this._oldSelectionStart = e),
            (this._oldSelectionEnd = t),
            (this._oldHasSelection = n),
            this._onSelectionChange.fire());
        }
        _handleBufferActivate(e) {
          (this.clearSelection(),
            this._trimListener.dispose(),
            (this._trimListener = e.activeBuffer.lines.onTrim((e) => this._handleTrim(e))));
        }
        _convertViewportColToCharacterIndex(e, t) {
          let n = t;
          for (let r = 0; t >= r; r++) {
            let i = e.loadCell(r, this._workCell).getChars().length;
            this._workCell.getWidth() === 0 ? n-- : i > 1 && t !== r && (n += i - 1);
          }
          return n;
        }
        setSelection(e, t, n) {
          (this._model.clearSelection(),
            this._removeMouseDownListeners(),
            (this._model.selectionStart = [e, t]),
            (this._model.selectionStartLength = n),
            this.refresh(),
            this._fireEventIfSelectionChanged());
        }
        rightClickSelect(e) {
          this._isClickInSelection(e) ||
            (this._selectWordAtCursor(e, !1) && this.refresh(!0),
            this._fireEventIfSelectionChanged());
        }
        _getWordAt(e, t, n = !0, r = !0) {
          if (e[0] >= this._bufferService.cols) return;
          let i = this._bufferService.buffer,
            a = i.lines.get(e[1]);
          if (!a) return;
          let o = i.translateBufferLineToString(e[1], !1),
            s = this._convertViewportColToCharacterIndex(a, e[0]),
            c = s,
            l = e[0] - s,
            u = 0,
            d = 0,
            f = 0,
            p = 0;
          if (o.charAt(s) === ` `) {
            for (; s > 0 && o.charAt(s - 1) === ` `; ) s--;
            for (; c < o.length && o.charAt(c + 1) === ` `; ) c++;
          } else {
            let t = e[0],
              n = e[0];
            (a.getWidth(t) === 0 && (u++, t--), a.getWidth(n) === 2 && (d++, n++));
            let r = a.getString(n).length;
            for (
              r > 1 && ((p += r - 1), (c += r - 1));
              t > 0 && s > 0 && !this._isCharWordSeparator(a.loadCell(t - 1, this._workCell));
            ) {
              a.loadCell(t - 1, this._workCell);
              let e = this._workCell.getChars().length;
              (this._workCell.getWidth() === 0 ? (u++, t--) : e > 1 && ((f += e - 1), (s -= e - 1)),
                s--,
                t--);
            }
            for (
              ;
              n < a.length &&
              c + 1 < o.length &&
              !this._isCharWordSeparator(a.loadCell(n + 1, this._workCell));
            ) {
              a.loadCell(n + 1, this._workCell);
              let e = this._workCell.getChars().length;
              (this._workCell.getWidth() === 2 ? (d++, n++) : e > 1 && ((p += e - 1), (c += e - 1)),
                c++,
                n++);
            }
          }
          c++;
          let m = s + l - u + f,
            h = Math.min(this._bufferService.cols, c - s + u + d - f - p);
          if (!(!t && o.slice(s, c).trim() === ``)) {
            if (n && m === 0 && a.getCodePoint(0) !== 32) {
              let t = i.lines.get(e[1] - 1);
              if (t && a.isWrapped && t.getCodePoint(this._bufferService.cols - 1) !== 32) {
                let t = this._getWordAt([this._bufferService.cols - 1, e[1] - 1], !1, !0, !1);
                if (t) {
                  let e = this._bufferService.cols - t.start;
                  ((m -= e), (h += e));
                }
              }
            }
            if (
              r &&
              m + h === this._bufferService.cols &&
              a.getCodePoint(this._bufferService.cols - 1) !== 32
            ) {
              let t = i.lines.get(e[1] + 1);
              if (t?.isWrapped && t.getCodePoint(0) !== 32) {
                let t = this._getWordAt([0, e[1] + 1], !1, !1, !0);
                t && (h += t.length);
              }
            }
            return { start: m, length: h };
          }
        }
        _selectWordAt(e, t) {
          let n = this._getWordAt(e, t);
          if (n) {
            for (; n.start < 0; ) ((n.start += this._bufferService.cols), e[1]--);
            ((this._model.selectionStart = [n.start, e[1]]),
              (this._model.selectionStartLength = n.length));
          }
        }
        _selectToWordAt(e) {
          let t = this._getWordAt(e, !0);
          if (t) {
            let n = e[1];
            for (; t.start < 0; ) ((t.start += this._bufferService.cols), n--);
            if (!this._model.areSelectionValuesReversed())
              for (; t.start + t.length > this._bufferService.cols; )
                ((t.length -= this._bufferService.cols), n++);
            this._model.selectionEnd = [
              this._model.areSelectionValuesReversed() ? t.start : t.start + t.length,
              n,
            ];
          }
        }
        _isCharWordSeparator(e) {
          return e.getWidth() === 0
            ? !1
            : this._optionsService.rawOptions.wordSeparator.indexOf(e.getChars()) >= 0;
        }
        _selectLineAt(e) {
          let t = this._bufferService.buffer.getWrappedRangeForLine(e),
            n = {
              start: { x: 0, y: t.first },
              end: { x: this._bufferService.cols - 1, y: t.last },
            };
          ((this._model.selectionStart = [0, t.first]),
            (this._model.selectionEnd = void 0),
            (this._model.selectionStartLength = ml(n, this._bufferService.cols)));
        }
      }),
      (am = H([U(3, Xl), U(4, Ql), U(5, lu), U(6, nu), U(7, uu), U(8, cu)], am)),
      (om = class {
        constructor() {
          this._data = {};
        }
        set(e, t, n) {
          (this._data[e] || (this._data[e] = {}), (this._data[e][t] = n));
        }
        get(e, t) {
          return this._data[e] ? this._data[e][t] : void 0;
        }
        clear() {
          this._data = {};
        }
      }),
      (sm = class {
        constructor() {
          ((this._color = new om()), (this._css = new om()));
        }
        setCss(e, t, n) {
          this._css.set(e, t, n);
        }
        getCss(e, t) {
          return this._css.get(e, t);
        }
        setColor(e, t, n) {
          this._color.set(e, t, n);
        }
        getColor(e, t) {
          return this._color.get(e, t);
        }
        clear() {
          (this._color.clear(), this._css.clear());
        }
      }),
      (cm = Object.freeze(
        (() => {
          let e = [
              X.toColor(`#2e3436`),
              X.toColor(`#cc0000`),
              X.toColor(`#4e9a06`),
              X.toColor(`#c4a000`),
              X.toColor(`#3465a4`),
              X.toColor(`#75507b`),
              X.toColor(`#06989a`),
              X.toColor(`#d3d7cf`),
              X.toColor(`#555753`),
              X.toColor(`#ef2929`),
              X.toColor(`#8ae234`),
              X.toColor(`#fce94f`),
              X.toColor(`#729fcf`),
              X.toColor(`#ad7fa8`),
              X.toColor(`#34e2e2`),
              X.toColor(`#eeeeec`),
            ],
            t = [0, 95, 135, 175, 215, 255];
          for (let n = 0; n < 216; n++) {
            let r = t[((n / 36) % 6) | 0],
              i = t[((n / 6) % 6) | 0],
              a = t[n % 6];
            e.push({ css: cp.toCss(r, i, a), rgba: cp.toRgba(r, i, a) });
          }
          for (let t = 0; t < 24; t++) {
            let n = 8 + t * 10;
            e.push({ css: cp.toCss(n, n, n), rgba: cp.toRgba(n, n, n) });
          }
          return e;
        })(),
      )),
      (lm = X.toColor(`#ffffff`)),
      (um = X.toColor(`#000000`)),
      (dm = X.toColor(`#ffffff`)),
      (fm = um),
      (pm = { css: `rgba(255, 255, 255, 0.3)`, rgba: 4294967117 }),
      (mm = lm),
      (hm = class extends W {
        constructor(e) {
          (super(),
            (this._optionsService = e),
            (this._contrastCache = new sm()),
            (this._halfContrastCache = new sm()),
            (this._onChangeColors = this._register(new K())),
            (this.onChangeColors = this._onChangeColors.event),
            (this._colors = {
              foreground: lm,
              background: um,
              cursor: dm,
              cursorAccent: fm,
              selectionForeground: void 0,
              selectionBackgroundTransparent: pm,
              selectionBackgroundOpaque: Y.blend(um, pm),
              selectionInactiveBackgroundTransparent: pm,
              selectionInactiveBackgroundOpaque: Y.blend(um, pm),
              scrollbarSliderBackground: Y.opacity(lm, 0.2),
              scrollbarSliderHoverBackground: Y.opacity(lm, 0.4),
              scrollbarSliderActiveBackground: Y.opacity(lm, 0.5),
              overviewRulerBorder: lm,
              ansi: cm.slice(),
              contrastCache: this._contrastCache,
              halfContrastCache: this._halfContrastCache,
            }),
            this._updateRestoreColors(),
            this._setTheme(this._optionsService.rawOptions.theme),
            this._register(
              this._optionsService.onSpecificOptionChange(`minimumContrastRatio`, () =>
                this._contrastCache.clear(),
              ),
            ),
            this._register(
              this._optionsService.onSpecificOptionChange(`theme`, () =>
                this._setTheme(this._optionsService.rawOptions.theme),
              ),
            ));
        }
        get colors() {
          return this._colors;
        }
        _setTheme(e = {}) {
          let t = this._colors;
          if (
            ((t.foreground = V(e.foreground, lm)),
            (t.background = V(e.background, um)),
            (t.cursor = Y.blend(t.background, V(e.cursor, dm))),
            (t.cursorAccent = Y.blend(t.background, V(e.cursorAccent, fm))),
            (t.selectionBackgroundTransparent = V(e.selectionBackground, pm)),
            (t.selectionBackgroundOpaque = Y.blend(t.background, t.selectionBackgroundTransparent)),
            (t.selectionInactiveBackgroundTransparent = V(
              e.selectionInactiveBackground,
              t.selectionBackgroundTransparent,
            )),
            (t.selectionInactiveBackgroundOpaque = Y.blend(
              t.background,
              t.selectionInactiveBackgroundTransparent,
            )),
            (t.selectionForeground = e.selectionForeground ? V(e.selectionForeground, sp) : void 0),
            t.selectionForeground === sp && (t.selectionForeground = void 0),
            Y.isOpaque(t.selectionBackgroundTransparent) &&
              (t.selectionBackgroundTransparent = Y.opacity(t.selectionBackgroundTransparent, 0.3)),
            Y.isOpaque(t.selectionInactiveBackgroundTransparent) &&
              (t.selectionInactiveBackgroundTransparent = Y.opacity(
                t.selectionInactiveBackgroundTransparent,
                0.3,
              )),
            (t.scrollbarSliderBackground = V(
              e.scrollbarSliderBackground,
              Y.opacity(t.foreground, 0.2),
            )),
            (t.scrollbarSliderHoverBackground = V(
              e.scrollbarSliderHoverBackground,
              Y.opacity(t.foreground, 0.4),
            )),
            (t.scrollbarSliderActiveBackground = V(
              e.scrollbarSliderActiveBackground,
              Y.opacity(t.foreground, 0.5),
            )),
            (t.overviewRulerBorder = V(e.overviewRulerBorder, mm)),
            (t.ansi = cm.slice()),
            (t.ansi[0] = V(e.black, cm[0])),
            (t.ansi[1] = V(e.red, cm[1])),
            (t.ansi[2] = V(e.green, cm[2])),
            (t.ansi[3] = V(e.yellow, cm[3])),
            (t.ansi[4] = V(e.blue, cm[4])),
            (t.ansi[5] = V(e.magenta, cm[5])),
            (t.ansi[6] = V(e.cyan, cm[6])),
            (t.ansi[7] = V(e.white, cm[7])),
            (t.ansi[8] = V(e.brightBlack, cm[8])),
            (t.ansi[9] = V(e.brightRed, cm[9])),
            (t.ansi[10] = V(e.brightGreen, cm[10])),
            (t.ansi[11] = V(e.brightYellow, cm[11])),
            (t.ansi[12] = V(e.brightBlue, cm[12])),
            (t.ansi[13] = V(e.brightMagenta, cm[13])),
            (t.ansi[14] = V(e.brightCyan, cm[14])),
            (t.ansi[15] = V(e.brightWhite, cm[15])),
            e.extendedAnsi)
          ) {
            let n = Math.min(t.ansi.length - 16, e.extendedAnsi.length);
            for (let r = 0; r < n; r++) t.ansi[r + 16] = V(e.extendedAnsi[r], cm[r + 16]);
          }
          (this._contrastCache.clear(),
            this._halfContrastCache.clear(),
            this._updateRestoreColors(),
            this._onChangeColors.fire(this.colors));
        }
        restoreColor(e) {
          (this._restoreColor(e), this._onChangeColors.fire(this.colors));
        }
        _restoreColor(e) {
          if (e === void 0) {
            for (let e = 0; e < this._restoreColors.ansi.length; ++e)
              this._colors.ansi[e] = this._restoreColors.ansi[e];
            return;
          }
          switch (e) {
            case 256:
              this._colors.foreground = this._restoreColors.foreground;
              break;
            case 257:
              this._colors.background = this._restoreColors.background;
              break;
            case 258:
              this._colors.cursor = this._restoreColors.cursor;
              break;
            default:
              this._colors.ansi[e] = this._restoreColors.ansi[e];
          }
        }
        modifyColors(e) {
          (e(this._colors), this._onChangeColors.fire(this.colors));
        }
        _updateRestoreColors() {
          this._restoreColors = {
            foreground: this._colors.foreground,
            background: this._colors.background,
            cursor: this._colors.cursor,
            ansi: this._colors.ansi.slice(),
          };
        }
      }),
      (hm = H([U(0, nu)], hm)),
      (gm = class {
        constructor(...e) {
          this._entries = new Map();
          for (let [t, n] of e) this.set(t, n);
        }
        set(e, t) {
          let n = this._entries.get(e);
          return (this._entries.set(e, t), n);
        }
        forEach(e) {
          for (let [t, n] of this._entries.entries()) e(t, n);
        }
        has(e) {
          return this._entries.has(e);
        }
        get(e) {
          return this._entries.get(e);
        }
      }),
      (_m = class {
        constructor() {
          ((this._services = new gm()), this._services.set(eu, this));
        }
        setService(e, t) {
          this._services.set(e, t);
        }
        getService(e) {
          return this._services.get(e);
        }
        createInstance(e, ...t) {
          let n = Gs(e).sort((e, t) => e.index - t.index),
            r = [];
          for (let t of n) {
            let n = this._services.get(t.id);
            if (!n)
              throw Error(`[createInstance] ${e.name} depends on UNKNOWN service ${t.id._id}.`);
            r.push(n);
          }
          let i = n.length > 0 ? n[0].index : t.length;
          if (t.length !== i)
            throw Error(
              `[createInstance] First service dependency of ${e.name} at position ${i + 1} conflicts with ${t.length} static arguments`,
            );
          return new e(...t, ...r);
        }
      }),
      (vm = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, off: 5 }),
      (ym = `xterm.js: `),
      (bm = class extends W {
        constructor(e) {
          (super(),
            (this._optionsService = e),
            (this._logLevel = 5),
            this._updateLogLevel(),
            this._register(
              this._optionsService.onSpecificOptionChange(`logLevel`, () => this._updateLogLevel()),
            ));
        }
        get logLevel() {
          return this._logLevel;
        }
        _updateLogLevel() {
          this._logLevel = vm[this._optionsService.rawOptions.logLevel];
        }
        _evalLazyOptionalParams(e) {
          for (let t = 0; t < e.length; t++) typeof e[t] == `function` && (e[t] = e[t]());
        }
        _log(e, t, n) {
          (this._evalLazyOptionalParams(n),
            e.call(console, (this._optionsService.options.logger ? `` : ym) + t, ...n));
        }
        trace(e, ...t) {
          this._logLevel <= 0 &&
            this._log(
              this._optionsService.options.logger?.trace.bind(
                this._optionsService.options.logger,
              ) ?? console.log,
              e,
              t,
            );
        }
        debug(e, ...t) {
          this._logLevel <= 1 &&
            this._log(
              this._optionsService.options.logger?.debug.bind(
                this._optionsService.options.logger,
              ) ?? console.log,
              e,
              t,
            );
        }
        info(e, ...t) {
          this._logLevel <= 2 &&
            this._log(
              this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ??
                console.info,
              e,
              t,
            );
        }
        warn(e, ...t) {
          this._logLevel <= 3 &&
            this._log(
              this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ??
                console.warn,
              e,
              t,
            );
        }
        error(e, ...t) {
          this._logLevel <= 4 &&
            this._log(
              this._optionsService.options.logger?.error.bind(
                this._optionsService.options.logger,
              ) ?? console.error,
              e,
              t,
            );
        }
      }),
      (bm = H([U(0, nu)], bm)),
      (xm = class extends W {
        constructor(e) {
          (super(),
            (this._maxLength = e),
            (this.onDeleteEmitter = this._register(new K())),
            (this.onDelete = this.onDeleteEmitter.event),
            (this.onInsertEmitter = this._register(new K())),
            (this.onInsert = this.onInsertEmitter.event),
            (this.onTrimEmitter = this._register(new K())),
            (this.onTrim = this.onTrimEmitter.event),
            (this._array = Array(this._maxLength)),
            (this._startIndex = 0),
            (this._length = 0));
        }
        get maxLength() {
          return this._maxLength;
        }
        set maxLength(e) {
          if (this._maxLength === e) return;
          let t = Array(e);
          for (let n = 0; n < Math.min(e, this.length); n++)
            t[n] = this._array[this._getCyclicIndex(n)];
          ((this._array = t), (this._maxLength = e), (this._startIndex = 0));
        }
        get length() {
          return this._length;
        }
        set length(e) {
          if (e > this._length) for (let t = this._length; t < e; t++) this._array[t] = void 0;
          this._length = e;
        }
        get(e) {
          return this._array[this._getCyclicIndex(e)];
        }
        set(e, t) {
          this._array[this._getCyclicIndex(e)] = t;
        }
        push(e) {
          ((this._array[this._getCyclicIndex(this._length)] = e),
            this._length === this._maxLength
              ? ((this._startIndex = ++this._startIndex % this._maxLength),
                this.onTrimEmitter.fire(1))
              : this._length++);
        }
        recycle() {
          if (this._length !== this._maxLength)
            throw Error(`Can only recycle when the buffer is full`);
          return (
            (this._startIndex = ++this._startIndex % this._maxLength),
            this.onTrimEmitter.fire(1),
            this._array[this._getCyclicIndex(this._length - 1)]
          );
        }
        get isFull() {
          return this._length === this._maxLength;
        }
        pop() {
          return this._array[this._getCyclicIndex(this._length-- - 1)];
        }
        splice(e, t, ...n) {
          if (t) {
            for (let n = e; n < this._length - t; n++)
              this._array[this._getCyclicIndex(n)] = this._array[this._getCyclicIndex(n + t)];
            ((this._length -= t), this.onDeleteEmitter.fire({ index: e, amount: t }));
          }
          for (let t = this._length - 1; t >= e; t--)
            this._array[this._getCyclicIndex(t + n.length)] = this._array[this._getCyclicIndex(t)];
          for (let t = 0; t < n.length; t++) this._array[this._getCyclicIndex(e + t)] = n[t];
          if (
            (n.length && this.onInsertEmitter.fire({ index: e, amount: n.length }),
            this._length + n.length > this._maxLength)
          ) {
            let e = this._length + n.length - this._maxLength;
            ((this._startIndex += e), (this._length = this._maxLength), this.onTrimEmitter.fire(e));
          } else this._length += n.length;
        }
        trimStart(e) {
          (e > this._length && (e = this._length),
            (this._startIndex += e),
            (this._length -= e),
            this.onTrimEmitter.fire(e));
        }
        shiftElements(e, t, n) {
          if (!(t <= 0)) {
            if (e < 0 || e >= this._length) throw Error(`start argument out of range`);
            if (e + n < 0) throw Error(`Cannot shift elements in list beyond index 0`);
            if (n > 0) {
              for (let r = t - 1; r >= 0; r--) this.set(e + r + n, this.get(e + r));
              let r = e + t + n - this._length;
              if (r > 0)
                for (this._length += r; this._length > this._maxLength; )
                  (this._length--, this._startIndex++, this.onTrimEmitter.fire(1));
            } else for (let r = 0; r < t; r++) this.set(e + r + n, this.get(e + r));
          }
        }
        _getCyclicIndex(e) {
          return (this._startIndex + e) % this._maxLength;
        }
      }),
      (Z = 3),
      (Sm = Object.freeze(new Wl())),
      (Cm = 0),
      (wm = 2),
      (Tm = class e {
        constructor(e, t, n = !1) {
          ((this.isWrapped = n),
            (this._combined = {}),
            (this._extendedAttrs = {}),
            (this._data = new Uint32Array(e * Z)));
          let r = t || Kl.fromCharData([0, Hl, 1, 0]);
          for (let t = 0; t < e; ++t) this.setCell(t, r);
          this.length = e;
        }
        get(e) {
          let t = this._data[e * Z + 0],
            n = t & 2097151;
          return [
            this._data[e * Z + 1],
            t & 2097152 ? this._combined[e] : n ? Us(n) : ``,
            t >> 22,
            t & 2097152 ? this._combined[e].charCodeAt(this._combined[e].length - 1) : n,
          ];
        }
        set(e, t) {
          ((this._data[e * Z + 1] = t[0]),
            t[1].length > 1
              ? ((this._combined[e] = t[1]), (this._data[e * Z + 0] = e | 2097152 | (t[2] << 22)))
              : (this._data[e * Z + 0] = t[1].charCodeAt(0) | (t[2] << 22)));
        }
        getWidth(e) {
          return this._data[e * Z + 0] >> 22;
        }
        hasWidth(e) {
          return this._data[e * Z + 0] & 12582912;
        }
        getFg(e) {
          return this._data[e * Z + 1];
        }
        getBg(e) {
          return this._data[e * Z + 2];
        }
        hasContent(e) {
          return this._data[e * Z + 0] & 4194303;
        }
        getCodePoint(e) {
          let t = this._data[e * Z + 0];
          return t & 2097152
            ? this._combined[e].charCodeAt(this._combined[e].length - 1)
            : t & 2097151;
        }
        isCombined(e) {
          return this._data[e * Z + 0] & 2097152;
        }
        getString(e) {
          let t = this._data[e * Z + 0];
          return t & 2097152 ? this._combined[e] : t & 2097151 ? Us(t & 2097151) : ``;
        }
        isProtected(e) {
          return this._data[e * Z + 2] & 536870912;
        }
        loadCell(e, t) {
          return (
            (Cm = e * Z),
            (t.content = this._data[Cm + 0]),
            (t.fg = this._data[Cm + 1]),
            (t.bg = this._data[Cm + 2]),
            t.content & 2097152 && (t.combinedData = this._combined[e]),
            t.bg & 268435456 && (t.extended = this._extendedAttrs[e]),
            t
          );
        }
        setCell(e, t) {
          (t.content & 2097152 && (this._combined[e] = t.combinedData),
            t.bg & 268435456 && (this._extendedAttrs[e] = t.extended),
            (this._data[e * Z + 0] = t.content),
            (this._data[e * Z + 1] = t.fg),
            (this._data[e * Z + 2] = t.bg));
        }
        setCellFromCodepoint(e, t, n, r) {
          (r.bg & 268435456 && (this._extendedAttrs[e] = r.extended),
            (this._data[e * Z + 0] = t | (n << 22)),
            (this._data[e * Z + 1] = r.fg),
            (this._data[e * Z + 2] = r.bg));
        }
        addCodepointToCell(e, t, n) {
          let r = this._data[e * Z + 0];
          (r & 2097152
            ? (this._combined[e] += Us(t))
            : r & 2097151
              ? ((this._combined[e] = Us(r & 2097151) + Us(t)), (r &= -2097152), (r |= 2097152))
              : (r = t | (1 << 22)),
            n && ((r &= -12582913), (r |= n << 22)),
            (this._data[e * Z + 0] = r));
        }
        insertCells(e, t, n) {
          if (
            ((e %= this.length),
            e && this.getWidth(e - 1) === 2 && this.setCellFromCodepoint(e - 1, 0, 1, n),
            t < this.length - e)
          ) {
            let r = new Kl();
            for (let n = this.length - e - t - 1; n >= 0; --n)
              this.setCell(e + t + n, this.loadCell(e + n, r));
            for (let r = 0; r < t; ++r) this.setCell(e + r, n);
          } else for (let t = e; t < this.length; ++t) this.setCell(t, n);
          this.getWidth(this.length - 1) === 2 &&
            this.setCellFromCodepoint(this.length - 1, 0, 1, n);
        }
        deleteCells(e, t, n) {
          if (((e %= this.length), t < this.length - e)) {
            let r = new Kl();
            for (let n = 0; n < this.length - e - t; ++n)
              this.setCell(e + n, this.loadCell(e + t + n, r));
            for (let e = this.length - t; e < this.length; ++e) this.setCell(e, n);
          } else for (let t = e; t < this.length; ++t) this.setCell(t, n);
          (e && this.getWidth(e - 1) === 2 && this.setCellFromCodepoint(e - 1, 0, 1, n),
            this.getWidth(e) === 0 && !this.hasContent(e) && this.setCellFromCodepoint(e, 0, 1, n));
        }
        replaceCells(e, t, n, r = !1) {
          if (r) {
            for (
              e &&
                this.getWidth(e - 1) === 2 &&
                !this.isProtected(e - 1) &&
                this.setCellFromCodepoint(e - 1, 0, 1, n),
                t < this.length &&
                  this.getWidth(t - 1) === 2 &&
                  !this.isProtected(t) &&
                  this.setCellFromCodepoint(t, 0, 1, n);
              e < t && e < this.length;
            )
              (this.isProtected(e) || this.setCell(e, n), e++);
            return;
          }
          for (
            e && this.getWidth(e - 1) === 2 && this.setCellFromCodepoint(e - 1, 0, 1, n),
              t < this.length &&
                this.getWidth(t - 1) === 2 &&
                this.setCellFromCodepoint(t, 0, 1, n);
            e < t && e < this.length;
          )
            this.setCell(e++, n);
        }
        resize(e, t) {
          if (e === this.length) return this._data.length * 4 * wm < this._data.buffer.byteLength;
          let n = e * Z;
          if (e > this.length) {
            if (this._data.buffer.byteLength >= n * 4)
              this._data = new Uint32Array(this._data.buffer, 0, n);
            else {
              let e = new Uint32Array(n);
              (e.set(this._data), (this._data = e));
            }
            for (let n = this.length; n < e; ++n) this.setCell(n, t);
          } else {
            this._data = this._data.subarray(0, n);
            let t = Object.keys(this._combined);
            for (let n = 0; n < t.length; n++) {
              let r = parseInt(t[n], 10);
              r >= e && delete this._combined[r];
            }
            let r = Object.keys(this._extendedAttrs);
            for (let t = 0; t < r.length; t++) {
              let n = parseInt(r[t], 10);
              n >= e && delete this._extendedAttrs[n];
            }
          }
          return ((this.length = e), n * 4 * wm < this._data.buffer.byteLength);
        }
        cleanupMemory() {
          if (this._data.length * 4 * wm < this._data.buffer.byteLength) {
            let e = new Uint32Array(this._data.length);
            return (e.set(this._data), (this._data = e), 1);
          }
          return 0;
        }
        fill(e, t = !1) {
          if (t) {
            for (let t = 0; t < this.length; ++t) this.isProtected(t) || this.setCell(t, e);
            return;
          }
          ((this._combined = {}), (this._extendedAttrs = {}));
          for (let t = 0; t < this.length; ++t) this.setCell(t, e);
        }
        copyFrom(e) {
          (this.length === e.length
            ? this._data.set(e._data)
            : (this._data = new Uint32Array(e._data)),
            (this.length = e.length),
            (this._combined = {}));
          for (let t in e._combined) this._combined[t] = e._combined[t];
          this._extendedAttrs = {};
          for (let t in e._extendedAttrs) this._extendedAttrs[t] = e._extendedAttrs[t];
          this.isWrapped = e.isWrapped;
        }
        clone() {
          let t = new e(0);
          ((t._data = new Uint32Array(this._data)), (t.length = this.length));
          for (let e in this._combined) t._combined[e] = this._combined[e];
          for (let e in this._extendedAttrs) t._extendedAttrs[e] = this._extendedAttrs[e];
          return ((t.isWrapped = this.isWrapped), t);
        }
        getTrimmedLength() {
          for (let e = this.length - 1; e >= 0; --e)
            if (this._data[e * Z + 0] & 4194303) return e + (this._data[e * Z + 0] >> 22);
          return 0;
        }
        getNoBgTrimmedLength() {
          for (let e = this.length - 1; e >= 0; --e)
            if (this._data[e * Z + 0] & 4194303 || this._data[e * Z + 2] & 50331648)
              return e + (this._data[e * Z + 0] >> 22);
          return 0;
        }
        copyCellsFrom(e, t, n, r, i) {
          let a = e._data;
          if (i)
            for (let i = r - 1; i >= 0; i--) {
              for (let e = 0; e < Z; e++) this._data[(n + i) * Z + e] = a[(t + i) * Z + e];
              a[(t + i) * Z + 2] & 268435456 &&
                (this._extendedAttrs[n + i] = e._extendedAttrs[t + i]);
            }
          else
            for (let i = 0; i < r; i++) {
              for (let e = 0; e < Z; e++) this._data[(n + i) * Z + e] = a[(t + i) * Z + e];
              a[(t + i) * Z + 2] & 268435456 &&
                (this._extendedAttrs[n + i] = e._extendedAttrs[t + i]);
            }
          let o = Object.keys(e._combined);
          for (let r = 0; r < o.length; r++) {
            let i = parseInt(o[r], 10);
            i >= t && (this._combined[i - t + n] = e._combined[i]);
          }
        }
        translateToString(e, t, n, r) {
          ((t ??= 0),
            (n ??= this.length),
            e && (n = Math.min(n, this.getTrimmedLength())),
            r && (r.length = 0));
          let i = ``;
          for (; t < n; ) {
            let e = this._data[t * Z + 0],
              n = e & 2097151,
              a = e & 2097152 ? this._combined[t] : n ? Us(n) : Ul;
            if (((i += a), r)) for (let e = 0; e < a.length; ++e) r.push(t);
            t += e >> 22 || 1;
          }
          return (r && r.push(t), i);
        }
      }),
      (Em = class e {
        constructor(t) {
          ((this.line = t),
            (this.isDisposed = !1),
            (this._disposables = []),
            (this._id = e._nextId++),
            (this._onDispose = this.register(new K())),
            (this.onDispose = this._onDispose.event));
        }
        get id() {
          return this._id;
        }
        dispose() {
          this.isDisposed ||
            ((this.isDisposed = !0),
            (this.line = -1),
            this._onDispose.fire(),
            lc(this._disposables),
            (this._disposables.length = 0));
        }
        register(e) {
          return (this._disposables.push(e), e);
        }
      }),
      (Em._nextId = 1),
      (Dm = Em),
      (Om = {}),
      (km = Om.B),
      (Om[0] = {
        "`": `◆`,
        a: `▒`,
        b: `␉`,
        c: `␌`,
        d: `␍`,
        e: `␊`,
        f: `°`,
        g: `±`,
        h: `␤`,
        i: `␋`,
        j: `┘`,
        k: `┐`,
        l: `┌`,
        m: `└`,
        n: `┼`,
        o: `⎺`,
        p: `⎻`,
        q: `─`,
        r: `⎼`,
        s: `⎽`,
        t: `├`,
        u: `┤`,
        v: `┴`,
        w: `┬`,
        x: `│`,
        y: `≤`,
        z: `≥`,
        "{": `π`,
        "|": `≠`,
        "}": `£`,
        "~": `·`,
      }),
      (Om.A = { "#": `£` }),
      (Om.B = void 0),
      (Om[4] = {
        "#": `£`,
        "@": `¾`,
        "[": `ij`,
        "\\": `½`,
        "]": `|`,
        "{": `¨`,
        "|": `f`,
        "}": `¼`,
        "~": `´`,
      }),
      (Om.C = Om[5] =
        {
          "[": `Ä`,
          "\\": `Ö`,
          "]": `Å`,
          "^": `Ü`,
          "`": `é`,
          "{": `ä`,
          "|": `ö`,
          "}": `å`,
          "~": `ü`,
        }),
      (Om.R = {
        "#": `£`,
        "@": `à`,
        "[": `°`,
        "\\": `ç`,
        "]": `§`,
        "{": `é`,
        "|": `ù`,
        "}": `è`,
        "~": `¨`,
      }),
      (Om.Q = {
        "@": `à`,
        "[": `â`,
        "\\": `ç`,
        "]": `ê`,
        "^": `î`,
        "`": `ô`,
        "{": `é`,
        "|": `ù`,
        "}": `è`,
        "~": `û`,
      }),
      (Om.K = { "@": `§`, "[": `Ä`, "\\": `Ö`, "]": `Ü`, "{": `ä`, "|": `ö`, "}": `ü`, "~": `ß` }),
      (Om.Y = {
        "#": `£`,
        "@": `§`,
        "[": `°`,
        "\\": `ç`,
        "]": `é`,
        "`": `ù`,
        "{": `à`,
        "|": `ò`,
        "}": `è`,
        "~": `ì`,
      }),
      (Om.E = Om[6] =
        {
          "@": `Ä`,
          "[": `Æ`,
          "\\": `Ø`,
          "]": `Å`,
          "^": `Ü`,
          "`": `ä`,
          "{": `æ`,
          "|": `ø`,
          "}": `å`,
          "~": `ü`,
        }),
      (Om.Z = { "#": `£`, "@": `§`, "[": `¡`, "\\": `Ñ`, "]": `¿`, "{": `°`, "|": `ñ`, "}": `ç` }),
      (Om.H = Om[7] =
        {
          "@": `É`,
          "[": `Ä`,
          "\\": `Ö`,
          "]": `Å`,
          "^": `Ü`,
          "`": `é`,
          "{": `ä`,
          "|": `ö`,
          "}": `å`,
          "~": `ü`,
        }),
      (Om[`=`] = {
        "#": `ù`,
        "@": `à`,
        "[": `é`,
        "\\": `ç`,
        "]": `ê`,
        "^": `î`,
        _: `è`,
        "`": `ô`,
        "{": `ä`,
        "|": `ö`,
        "}": `ü`,
        "~": `û`,
      }),
      (Am = 4294967295),
      (jm = class {
        constructor(e, t, n) {
          ((this._hasScrollback = e),
            (this._optionsService = t),
            (this._bufferService = n),
            (this.ydisp = 0),
            (this.ybase = 0),
            (this.y = 0),
            (this.x = 0),
            (this.tabs = {}),
            (this.savedY = 0),
            (this.savedX = 0),
            (this.savedCurAttrData = Sm.clone()),
            (this.savedCharset = km),
            (this.markers = []),
            (this._nullCell = Kl.fromCharData([0, Hl, 1, 0])),
            (this._whitespaceCell = Kl.fromCharData([0, Ul, 1, 32])),
            (this._isClearing = !1),
            (this._memoryCleanupQueue = new Yp()),
            (this._memoryCleanupPosition = 0),
            (this._cols = this._bufferService.cols),
            (this._rows = this._bufferService.rows),
            (this.lines = new xm(this._getCorrectBufferLength(this._rows))),
            (this.scrollTop = 0),
            (this.scrollBottom = this._rows - 1),
            this.setupTabStops());
        }
        getNullCell(e) {
          return (
            e
              ? ((this._nullCell.fg = e.fg),
                (this._nullCell.bg = e.bg),
                (this._nullCell.extended = e.extended))
              : ((this._nullCell.fg = 0),
                (this._nullCell.bg = 0),
                (this._nullCell.extended = new Gl())),
            this._nullCell
          );
        }
        getWhitespaceCell(e) {
          return (
            e
              ? ((this._whitespaceCell.fg = e.fg),
                (this._whitespaceCell.bg = e.bg),
                (this._whitespaceCell.extended = e.extended))
              : ((this._whitespaceCell.fg = 0),
                (this._whitespaceCell.bg = 0),
                (this._whitespaceCell.extended = new Gl())),
            this._whitespaceCell
          );
        }
        getBlankLine(e, t) {
          return new Tm(this._bufferService.cols, this.getNullCell(e), t);
        }
        get hasScrollback() {
          return this._hasScrollback && this.lines.maxLength > this._rows;
        }
        get isCursorInViewport() {
          let e = this.ybase + this.y - this.ydisp;
          return e >= 0 && e < this._rows;
        }
        _getCorrectBufferLength(e) {
          if (!this._hasScrollback) return e;
          let t = e + this._optionsService.rawOptions.scrollback;
          return t > Am ? Am : t;
        }
        fillViewportRows(e) {
          if (this.lines.length === 0) {
            e === void 0 && (e = Sm);
            let t = this._rows;
            for (; t--; ) this.lines.push(this.getBlankLine(e));
          }
        }
        clear() {
          ((this.ydisp = 0),
            (this.ybase = 0),
            (this.y = 0),
            (this.x = 0),
            (this.lines = new xm(this._getCorrectBufferLength(this._rows))),
            (this.scrollTop = 0),
            (this.scrollBottom = this._rows - 1),
            this.setupTabStops());
        }
        resize(e, t) {
          let n = this.getNullCell(Sm),
            r = 0,
            i = this._getCorrectBufferLength(t);
          if ((i > this.lines.maxLength && (this.lines.maxLength = i), this.lines.length > 0)) {
            if (this._cols < e)
              for (let t = 0; t < this.lines.length; t++) r += +this.lines.get(t).resize(e, n);
            let a = 0;
            if (this._rows < t)
              for (let r = this._rows; r < t; r++)
                this.lines.length < t + this.ybase &&
                  (this._optionsService.rawOptions.windowsMode ||
                  this._optionsService.rawOptions.windowsPty.backend !== void 0 ||
                  this._optionsService.rawOptions.windowsPty.buildNumber !== void 0
                    ? this.lines.push(new Tm(e, n))
                    : this.ybase > 0 && this.lines.length <= this.ybase + this.y + a + 1
                      ? (this.ybase--, a++, this.ydisp > 0 && this.ydisp--)
                      : this.lines.push(new Tm(e, n)));
            else
              for (let e = this._rows; e > t; e--)
                this.lines.length > t + this.ybase &&
                  (this.lines.length > this.ybase + this.y + 1
                    ? this.lines.pop()
                    : (this.ybase++, this.ydisp++));
            if (i < this.lines.maxLength) {
              let e = this.lines.length - i;
              (e > 0 &&
                (this.lines.trimStart(e),
                (this.ybase = Math.max(this.ybase - e, 0)),
                (this.ydisp = Math.max(this.ydisp - e, 0)),
                (this.savedY = Math.max(this.savedY - e, 0))),
                (this.lines.maxLength = i));
            }
            ((this.x = Math.min(this.x, e - 1)),
              (this.y = Math.min(this.y, t - 1)),
              a && (this.y += a),
              (this.savedX = Math.min(this.savedX, e - 1)),
              (this.scrollTop = 0));
          }
          if (
            ((this.scrollBottom = t - 1),
            this._isReflowEnabled && (this._reflow(e, t), this._cols > e))
          )
            for (let t = 0; t < this.lines.length; t++) r += +this.lines.get(t).resize(e, n);
          ((this._cols = e),
            (this._rows = t),
            this._memoryCleanupQueue.clear(),
            r > 0.1 * this.lines.length &&
              ((this._memoryCleanupPosition = 0),
              this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup())));
        }
        _batchedMemoryCleanup() {
          let e = !0;
          this._memoryCleanupPosition >= this.lines.length &&
            ((this._memoryCleanupPosition = 0), (e = !1));
          let t = 0;
          for (; this._memoryCleanupPosition < this.lines.length; )
            if (((t += this.lines.get(this._memoryCleanupPosition++).cleanupMemory()), t > 100))
              return !0;
          return e;
        }
        get _isReflowEnabled() {
          let e = this._optionsService.rawOptions.windowsPty;
          return e && e.buildNumber
            ? this._hasScrollback && e.backend === `conpty` && e.buildNumber >= 21376
            : this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
        }
        _reflow(e, t) {
          this._cols !== e &&
            (e > this._cols ? this._reflowLarger(e, t) : this._reflowSmaller(e, t));
        }
        _reflowLarger(e, t) {
          let n = this._optionsService.rawOptions.reflowCursorLine,
            r = hl(this.lines, this._cols, e, this.ybase + this.y, this.getNullCell(Sm), n);
          if (r.length > 0) {
            let n = gl(this.lines, r);
            (_l(this.lines, n.layout), this._reflowLargerAdjustViewport(e, t, n.countRemoved));
          }
        }
        _reflowLargerAdjustViewport(e, t, n) {
          let r = this.getNullCell(Sm),
            i = n;
          for (; i-- > 0; )
            this.ybase === 0
              ? (this.y > 0 && this.y--, this.lines.length < t && this.lines.push(new Tm(e, r)))
              : (this.ydisp === this.ybase && this.ydisp--, this.ybase--);
          this.savedY = Math.max(this.savedY - n, 0);
        }
        _reflowSmaller(e, t) {
          let n = this._optionsService.rawOptions.reflowCursorLine,
            r = this.getNullCell(Sm),
            i = [],
            a = 0;
          for (let o = this.lines.length - 1; o >= 0; o--) {
            let s = this.lines.get(o);
            if (!s || (!s.isWrapped && s.getTrimmedLength() <= e)) continue;
            let c = [s];
            for (; s.isWrapped && o > 0; ) ((s = this.lines.get(--o)), c.unshift(s));
            if (!n) {
              let e = this.ybase + this.y;
              if (e >= o && e < o + c.length) continue;
            }
            let l = c[c.length - 1].getTrimmedLength(),
              u = vl(c, this._cols, e),
              d = u.length - c.length,
              f;
            f =
              this.ybase === 0 && this.y !== this.lines.length - 1
                ? Math.max(0, this.y - this.lines.maxLength + d)
                : Math.max(0, this.lines.length - this.lines.maxLength + d);
            let p = [];
            for (let e = 0; e < d; e++) {
              let e = this.getBlankLine(Sm, !0);
              p.push(e);
            }
            (p.length > 0 && (i.push({ start: o + c.length + a, newLines: p }), (a += p.length)),
              c.push(...p));
            let m = u.length - 1,
              h = u[m];
            h === 0 && (m--, (h = u[m]));
            let g = c.length - d - 1,
              _ = l;
            for (; g >= 0; ) {
              let e = Math.min(_, h);
              if (c[m] === void 0) break;
              (c[m].copyCellsFrom(c[g], _ - e, h - e, e, !0),
                (h -= e),
                h === 0 && (m--, (h = u[m])),
                (_ -= e),
                _ === 0 && (g--, (_ = yl(c, Math.max(g, 0), this._cols))));
            }
            for (let t = 0; t < c.length; t++) u[t] < e && c[t].setCell(u[t], r);
            let v = d - f;
            for (; v-- > 0; )
              this.ybase === 0
                ? this.y < t - 1
                  ? (this.y++, this.lines.pop())
                  : (this.ybase++, this.ydisp++)
                : this.ybase < Math.min(this.lines.maxLength, this.lines.length + a) - t &&
                  (this.ybase === this.ydisp && this.ydisp++, this.ybase++);
            this.savedY = Math.min(this.savedY + d, this.ybase + t - 1);
          }
          if (i.length > 0) {
            let e = [],
              t = [];
            for (let e = 0; e < this.lines.length; e++) t.push(this.lines.get(e));
            let n = this.lines.length,
              r = n - 1,
              o = 0,
              s = i[o];
            this.lines.length = Math.min(this.lines.maxLength, this.lines.length + a);
            let c = 0;
            for (let l = Math.min(this.lines.maxLength - 1, n + a - 1); l >= 0; l--)
              if (s && s.start > r + c) {
                for (let e = s.newLines.length - 1; e >= 0; e--) this.lines.set(l--, s.newLines[e]);
                (l++,
                  e.push({ index: r + 1, amount: s.newLines.length }),
                  (c += s.newLines.length),
                  (s = i[++o]));
              } else this.lines.set(l, t[r--]);
            let l = 0;
            for (let t = e.length - 1; t >= 0; t--)
              ((e[t].index += l), this.lines.onInsertEmitter.fire(e[t]), (l += e[t].amount));
            let u = Math.max(0, n + a - this.lines.maxLength);
            u > 0 && this.lines.onTrimEmitter.fire(u);
          }
        }
        translateBufferLineToString(e, t, n = 0, r) {
          let i = this.lines.get(e);
          return i ? i.translateToString(t, n, r) : ``;
        }
        getWrappedRangeForLine(e) {
          let t = e,
            n = e;
          for (; t > 0 && this.lines.get(t).isWrapped; ) t--;
          for (; n + 1 < this.lines.length && this.lines.get(n + 1).isWrapped; ) n++;
          return { first: t, last: n };
        }
        setupTabStops(e) {
          for (
            e == null ? ((this.tabs = {}), (e = 0)) : this.tabs[e] || (e = this.prevStop(e));
            e < this._cols;
            e += this._optionsService.rawOptions.tabStopWidth
          )
            this.tabs[e] = !0;
        }
        prevStop(e) {
          for (e ??= this.x; !this.tabs[--e] && e > 0; );
          return e >= this._cols ? this._cols - 1 : e < 0 ? 0 : e;
        }
        nextStop(e) {
          for (e ??= this.x; !this.tabs[++e] && e < this._cols; );
          return e >= this._cols ? this._cols - 1 : e < 0 ? 0 : e;
        }
        clearMarkers(e) {
          this._isClearing = !0;
          for (let t = 0; t < this.markers.length; t++)
            this.markers[t].line === e && (this.markers[t].dispose(), this.markers.splice(t--, 1));
          this._isClearing = !1;
        }
        clearAllMarkers() {
          this._isClearing = !0;
          for (let e = 0; e < this.markers.length; e++) this.markers[e].dispose();
          ((this.markers.length = 0), (this._isClearing = !1));
        }
        addMarker(e) {
          let t = new Dm(e);
          return (
            this.markers.push(t),
            t.register(
              this.lines.onTrim((e) => {
                ((t.line -= e), t.line < 0 && t.dispose());
              }),
            ),
            t.register(
              this.lines.onInsert((e) => {
                t.line >= e.index && (t.line += e.amount);
              }),
            ),
            t.register(
              this.lines.onDelete((e) => {
                (t.line >= e.index && t.line < e.index + e.amount && t.dispose(),
                  t.line > e.index && (t.line -= e.amount));
              }),
            ),
            t.register(t.onDispose(() => this._removeMarker(t))),
            t
          );
        }
        _removeMarker(e) {
          this._isClearing || this.markers.splice(this.markers.indexOf(e), 1);
        }
      }),
      (Mm = class extends W {
        constructor(e, t) {
          (super(),
            (this._optionsService = e),
            (this._bufferService = t),
            (this._onBufferActivate = this._register(new K())),
            (this.onBufferActivate = this._onBufferActivate.event),
            this.reset(),
            this._register(
              this._optionsService.onSpecificOptionChange(`scrollback`, () =>
                this.resize(this._bufferService.cols, this._bufferService.rows),
              ),
            ),
            this._register(
              this._optionsService.onSpecificOptionChange(`tabStopWidth`, () =>
                this.setupTabStops(),
              ),
            ));
        }
        reset() {
          ((this._normal = new jm(!0, this._optionsService, this._bufferService)),
            this._normal.fillViewportRows(),
            (this._alt = new jm(!1, this._optionsService, this._bufferService)),
            (this._activeBuffer = this._normal),
            this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }),
            this.setupTabStops());
        }
        get alt() {
          return this._alt;
        }
        get active() {
          return this._activeBuffer;
        }
        get normal() {
          return this._normal;
        }
        activateNormalBuffer() {
          this._activeBuffer !== this._normal &&
            ((this._normal.x = this._alt.x),
            (this._normal.y = this._alt.y),
            this._alt.clearAllMarkers(),
            this._alt.clear(),
            (this._activeBuffer = this._normal),
            this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }));
        }
        activateAltBuffer(e) {
          this._activeBuffer !== this._alt &&
            (this._alt.fillViewportRows(e),
            (this._alt.x = this._normal.x),
            (this._alt.y = this._normal.y),
            (this._activeBuffer = this._alt),
            this._onBufferActivate.fire({ activeBuffer: this._alt, inactiveBuffer: this._normal }));
        }
        resize(e, t) {
          (this._normal.resize(e, t), this._alt.resize(e, t), this.setupTabStops(e));
        }
        setupTabStops(e) {
          (this._normal.setupTabStops(e), this._alt.setupTabStops(e));
        }
      }),
      (Nm = 2),
      (Pm = 1),
      (Fm = class extends W {
        constructor(e) {
          (super(),
            (this.isUserScrolling = !1),
            (this._onResize = this._register(new K())),
            (this.onResize = this._onResize.event),
            (this._onScroll = this._register(new K())),
            (this.onScroll = this._onScroll.event),
            (this.cols = Math.max(e.rawOptions.cols || 0, Nm)),
            (this.rows = Math.max(e.rawOptions.rows || 0, Pm)),
            (this.buffers = this._register(new Mm(e, this))),
            this._register(
              this.buffers.onBufferActivate((e) => {
                this._onScroll.fire(e.activeBuffer.ydisp);
              }),
            ));
        }
        get buffer() {
          return this.buffers.active;
        }
        resize(e, t) {
          let n = this.cols !== e,
            r = this.rows !== t;
          ((this.cols = e),
            (this.rows = t),
            this.buffers.resize(e, t),
            this._onResize.fire({ cols: e, rows: t, colsChanged: n, rowsChanged: r }));
        }
        reset() {
          (this.buffers.reset(), (this.isUserScrolling = !1));
        }
        scroll(e, t = !1) {
          let n = this.buffer,
            r;
          ((r = this._cachedBlankLine),
            (!r || r.length !== this.cols || r.getFg(0) !== e.fg || r.getBg(0) !== e.bg) &&
              ((r = n.getBlankLine(e, t)), (this._cachedBlankLine = r)),
            (r.isWrapped = t));
          let i = n.ybase + n.scrollTop,
            a = n.ybase + n.scrollBottom;
          if (n.scrollTop === 0) {
            let e = n.lines.isFull;
            (a === n.lines.length - 1
              ? e
                ? n.lines.recycle().copyFrom(r)
                : n.lines.push(r.clone())
              : n.lines.splice(a + 1, 0, r.clone()),
              e
                ? this.isUserScrolling && (n.ydisp = Math.max(n.ydisp - 1, 0))
                : (n.ybase++, this.isUserScrolling || n.ydisp++));
          } else {
            let e = a - i + 1;
            (n.lines.shiftElements(i + 1, e - 1, -1), n.lines.set(a, r.clone()));
          }
          (this.isUserScrolling || (n.ydisp = n.ybase), this._onScroll.fire(n.ydisp));
        }
        scrollLines(e, t) {
          let n = this.buffer;
          if (e < 0) {
            if (n.ydisp === 0) return;
            this.isUserScrolling = !0;
          } else e + n.ydisp >= n.ybase && (this.isUserScrolling = !1);
          let r = n.ydisp;
          ((n.ydisp = Math.max(Math.min(n.ydisp + e, n.ybase), 0)),
            r !== n.ydisp && (t || this._onScroll.fire(n.ydisp)));
        }
      }),
      (Fm = H([U(0, nu)], Fm)),
      (Im = {
        cols: 80,
        rows: 24,
        cursorBlink: !1,
        cursorStyle: `block`,
        cursorWidth: 1,
        cursorInactiveStyle: `outline`,
        customGlyphs: !0,
        drawBoldTextInBrightColors: !0,
        documentOverride: null,
        fastScrollModifier: `alt`,
        fastScrollSensitivity: 5,
        fontFamily: `monospace`,
        fontSize: 15,
        fontWeight: `normal`,
        fontWeightBold: `bold`,
        ignoreBracketedPasteMode: !1,
        lineHeight: 1,
        letterSpacing: 0,
        linkHandler: null,
        logLevel: `info`,
        logger: null,
        scrollback: 1e3,
        scrollOnEraseInDisplay: !1,
        scrollOnUserInput: !0,
        scrollSensitivity: 1,
        screenReaderMode: !1,
        smoothScrollDuration: 0,
        macOptionIsMeta: !1,
        macOptionClickForcesSelection: !1,
        minimumContrastRatio: 1,
        disableStdin: !1,
        allowProposedApi: !1,
        allowTransparency: !1,
        tabStopWidth: 8,
        theme: {},
        reflowCursorLine: !1,
        rescaleOverlappingGlyphs: !1,
        rightClickSelectsWord: Bp,
        windowOptions: {},
        windowsMode: !1,
        windowsPty: {},
        wordSeparator: ` ()[]{}',"\``,
        altClickMovesCursor: !0,
        convertEol: !1,
        termName: `xterm`,
        cancelEvents: !1,
        overviewRuler: {},
      }),
      (Lm = [`normal`, `bold`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`]),
      (Rm = class extends W {
        constructor(e) {
          (super(),
            (this._onOptionChange = this._register(new K())),
            (this.onOptionChange = this._onOptionChange.event));
          let t = { ...Im };
          for (let n in e)
            if (n in t)
              try {
                let r = e[n];
                t[n] = this._sanitizeAndValidateOption(n, r);
              } catch (e) {
                console.error(e);
              }
          ((this.rawOptions = t),
            (this.options = { ...t }),
            this._setupOptions(),
            this._register(
              z(() => {
                ((this.rawOptions.linkHandler = null), (this.rawOptions.documentOverride = null));
              }),
            ));
        }
        onSpecificOptionChange(e, t) {
          return this.onOptionChange((n) => {
            n === e && t(this.rawOptions[e]);
          });
        }
        onMultipleOptionChange(e, t) {
          return this.onOptionChange((n) => {
            e.indexOf(n) !== -1 && t();
          });
        }
        _setupOptions() {
          let e = (e) => {
              if (!(e in Im)) throw Error(`No option with key "${e}"`);
              return this.rawOptions[e];
            },
            t = (e, t) => {
              if (!(e in Im)) throw Error(`No option with key "${e}"`);
              ((t = this._sanitizeAndValidateOption(e, t)),
                this.rawOptions[e] !== t &&
                  ((this.rawOptions[e] = t), this._onOptionChange.fire(e)));
            };
          for (let n in this.rawOptions) {
            let r = { get: e.bind(this, n), set: t.bind(this, n) };
            Object.defineProperty(this.options, n, r);
          }
        }
        _sanitizeAndValidateOption(e, t) {
          switch (e) {
            case `cursorStyle`:
              if (((t ||= Im[e]), !bl(t))) throw Error(`"${t}" is not a valid value for ${e}`);
              break;
            case `wordSeparator`:
              t ||= Im[e];
              break;
            case `fontWeight`:
            case `fontWeightBold`:
              if (typeof t == `number` && 1 <= t && t <= 1e3) break;
              t = Lm.includes(t) ? t : Im[e];
              break;
            case `cursorWidth`:
              t = Math.floor(t);
            case `lineHeight`:
            case `tabStopWidth`:
              if (t < 1) throw Error(`${e} cannot be less than 1, value: ${t}`);
              break;
            case `minimumContrastRatio`:
              t = Math.max(1, Math.min(21, Math.round(t * 10) / 10));
              break;
            case `scrollback`:
              if (((t = Math.min(t, 4294967295)), t < 0))
                throw Error(`${e} cannot be less than 0, value: ${t}`);
              break;
            case `fastScrollSensitivity`:
            case `scrollSensitivity`:
              if (t <= 0) throw Error(`${e} cannot be less than or equal to 0, value: ${t}`);
              break;
            case `rows`:
            case `cols`:
              if (!t && t !== 0) throw Error(`${e} must be numeric, value: ${t}`);
              break;
            case `windowsPty`:
              t ??= {};
              break;
          }
          return t;
        }
      }),
      (zm = Object.freeze({ insertMode: !1 })),
      (Bm = Object.freeze({
        applicationCursorKeys: !1,
        applicationKeypad: !1,
        bracketedPasteMode: !1,
        cursorBlink: void 0,
        cursorStyle: void 0,
        origin: !1,
        reverseWraparound: !1,
        sendFocus: !1,
        synchronizedOutput: !1,
        wraparound: !0,
      })),
      (Vm = class extends W {
        constructor(e, t, n) {
          (super(),
            (this._bufferService = e),
            (this._logService = t),
            (this._optionsService = n),
            (this.isCursorInitialized = !1),
            (this.isCursorHidden = !1),
            (this._onData = this._register(new K())),
            (this.onData = this._onData.event),
            (this._onUserInput = this._register(new K())),
            (this.onUserInput = this._onUserInput.event),
            (this._onBinary = this._register(new K())),
            (this.onBinary = this._onBinary.event),
            (this._onRequestScrollToBottom = this._register(new K())),
            (this.onRequestScrollToBottom = this._onRequestScrollToBottom.event),
            (this.modes = xl(zm)),
            (this.decPrivateModes = xl(Bm)));
        }
        reset() {
          ((this.modes = xl(zm)), (this.decPrivateModes = xl(Bm)));
        }
        triggerDataEvent(e, t = !1) {
          if (this._optionsService.rawOptions.disableStdin) return;
          let n = this._bufferService.buffer;
          (t &&
            this._optionsService.rawOptions.scrollOnUserInput &&
            n.ybase !== n.ydisp &&
            this._onRequestScrollToBottom.fire(),
            t && this._onUserInput.fire(),
            this._logService.debug(`sending data "${e}"`),
            this._logService.trace(`sending data (codes)`, () =>
              e.split(``).map((e) => e.charCodeAt(0)),
            ),
            this._onData.fire(e));
        }
        triggerBinaryEvent(e) {
          this._optionsService.rawOptions.disableStdin ||
            (this._logService.debug(`sending binary "${e}"`),
            this._logService.trace(`sending binary (codes)`, () =>
              e.split(``).map((e) => e.charCodeAt(0)),
            ),
            this._onBinary.fire(e));
        }
      }),
      (Vm = H([U(0, Xl), U(1, tu), U(2, nu)], Vm)),
      (Hm = {
        NONE: { events: 0, restrict: () => !1 },
        X10: {
          events: 1,
          restrict: (e) =>
            e.button === 4 || e.action !== 1
              ? !1
              : ((e.ctrl = !1), (e.alt = !1), (e.shift = !1), !0),
        },
        VT200: { events: 19, restrict: (e) => e.action !== 32 },
        DRAG: { events: 23, restrict: (e) => !(e.action === 32 && e.button === 3) },
        ANY: { events: 31, restrict: (e) => !0 },
      }),
      (Um = String.fromCharCode),
      (Wm = {
        DEFAULT: (e) => {
          let t = [Sl(e, !1) + 32, e.col + 32, e.row + 32];
          return t[0] > 255 || t[1] > 255 || t[2] > 255
            ? ``
            : `\x1B[M${Um(t[0])}${Um(t[1])}${Um(t[2])}`;
        },
        SGR: (e) => {
          let t = e.action === 0 && e.button !== 4 ? `m` : `M`;
          return `\x1B[<${Sl(e, !0)};${e.col};${e.row}${t}`;
        },
        SGR_PIXELS: (e) => {
          let t = e.action === 0 && e.button !== 4 ? `m` : `M`;
          return `\x1B[<${Sl(e, !0)};${e.x};${e.y}${t}`;
        },
      }),
      (Gm = class extends W {
        constructor(e, t, n) {
          (super(),
            (this._bufferService = e),
            (this._coreService = t),
            (this._optionsService = n),
            (this._protocols = {}),
            (this._encodings = {}),
            (this._activeProtocol = ``),
            (this._activeEncoding = ``),
            (this._lastEvent = null),
            (this._wheelPartialScroll = 0),
            (this._onProtocolChange = this._register(new K())),
            (this.onProtocolChange = this._onProtocolChange.event));
          for (let e of Object.keys(Hm)) this.addProtocol(e, Hm[e]);
          for (let e of Object.keys(Wm)) this.addEncoding(e, Wm[e]);
          this.reset();
        }
        addProtocol(e, t) {
          this._protocols[e] = t;
        }
        addEncoding(e, t) {
          this._encodings[e] = t;
        }
        get activeProtocol() {
          return this._activeProtocol;
        }
        get areMouseEventsActive() {
          return this._protocols[this._activeProtocol].events !== 0;
        }
        set activeProtocol(e) {
          if (!this._protocols[e]) throw Error(`unknown protocol "${e}"`);
          ((this._activeProtocol = e), this._onProtocolChange.fire(this._protocols[e].events));
        }
        get activeEncoding() {
          return this._activeEncoding;
        }
        set activeEncoding(e) {
          if (!this._encodings[e]) throw Error(`unknown encoding "${e}"`);
          this._activeEncoding = e;
        }
        reset() {
          ((this.activeProtocol = `NONE`),
            (this.activeEncoding = `DEFAULT`),
            (this._lastEvent = null),
            (this._wheelPartialScroll = 0));
        }
        consumeWheelEvent(e, t, n) {
          if (e.deltaY === 0 || e.shiftKey || t === void 0 || n === void 0) return 0;
          let r = t / n,
            i = this._applyScrollModifier(e.deltaY, e);
          return (
            e.deltaMode === WheelEvent.DOM_DELTA_PIXEL
              ? ((i /= r + 0),
                Math.abs(e.deltaY) < 50 && (i *= 0.3),
                (this._wheelPartialScroll += i),
                (i =
                  Math.floor(Math.abs(this._wheelPartialScroll)) *
                  (this._wheelPartialScroll > 0 ? 1 : -1)),
                (this._wheelPartialScroll %= 1))
              : e.deltaMode === WheelEvent.DOM_DELTA_PAGE && (i *= this._bufferService.rows),
            i
          );
        }
        _applyScrollModifier(e, t) {
          return t.altKey || t.ctrlKey || t.shiftKey
            ? e *
                this._optionsService.rawOptions.fastScrollSensitivity *
                this._optionsService.rawOptions.scrollSensitivity
            : e * this._optionsService.rawOptions.scrollSensitivity;
        }
        triggerMouseEvent(e) {
          if (
            e.col < 0 ||
            e.col >= this._bufferService.cols ||
            e.row < 0 ||
            e.row >= this._bufferService.rows ||
            (e.button === 4 && e.action === 32) ||
            (e.button === 3 && e.action !== 32) ||
            (e.button !== 4 && (e.action === 2 || e.action === 3)) ||
            (e.col++,
            e.row++,
            e.action === 32 &&
              this._lastEvent &&
              this._equalEvents(this._lastEvent, e, this._activeEncoding === `SGR_PIXELS`)) ||
            !this._protocols[this._activeProtocol].restrict(e)
          )
            return !1;
          let t = this._encodings[this._activeEncoding](e);
          return (
            t &&
              (this._activeEncoding === `DEFAULT`
                ? this._coreService.triggerBinaryEvent(t)
                : this._coreService.triggerDataEvent(t, !0)),
            (this._lastEvent = e),
            !0
          );
        }
        explainEvents(e) {
          return {
            down: !!(e & 1),
            up: !!(e & 2),
            drag: !!(e & 4),
            move: !!(e & 8),
            wheel: !!(e & 16),
          };
        }
        _equalEvents(e, t, n) {
          if (n) {
            if (e.x !== t.x || e.y !== t.y) return !1;
          } else if (e.col !== t.col || e.row !== t.row) return !1;
          return !(
            e.button !== t.button ||
            e.action !== t.action ||
            e.ctrl !== t.ctrl ||
            e.alt !== t.alt ||
            e.shift !== t.shift
          );
        }
      }),
      (Gm = H([U(0, Xl), U(1, Ql), U(2, nu)], Gm)),
      (Km = [
        [768, 879],
        [1155, 1158],
        [1160, 1161],
        [1425, 1469],
        [1471, 1471],
        [1473, 1474],
        [1476, 1477],
        [1479, 1479],
        [1536, 1539],
        [1552, 1557],
        [1611, 1630],
        [1648, 1648],
        [1750, 1764],
        [1767, 1768],
        [1770, 1773],
        [1807, 1807],
        [1809, 1809],
        [1840, 1866],
        [1958, 1968],
        [2027, 2035],
        [2305, 2306],
        [2364, 2364],
        [2369, 2376],
        [2381, 2381],
        [2385, 2388],
        [2402, 2403],
        [2433, 2433],
        [2492, 2492],
        [2497, 2500],
        [2509, 2509],
        [2530, 2531],
        [2561, 2562],
        [2620, 2620],
        [2625, 2626],
        [2631, 2632],
        [2635, 2637],
        [2672, 2673],
        [2689, 2690],
        [2748, 2748],
        [2753, 2757],
        [2759, 2760],
        [2765, 2765],
        [2786, 2787],
        [2817, 2817],
        [2876, 2876],
        [2879, 2879],
        [2881, 2883],
        [2893, 2893],
        [2902, 2902],
        [2946, 2946],
        [3008, 3008],
        [3021, 3021],
        [3134, 3136],
        [3142, 3144],
        [3146, 3149],
        [3157, 3158],
        [3260, 3260],
        [3263, 3263],
        [3270, 3270],
        [3276, 3277],
        [3298, 3299],
        [3393, 3395],
        [3405, 3405],
        [3530, 3530],
        [3538, 3540],
        [3542, 3542],
        [3633, 3633],
        [3636, 3642],
        [3655, 3662],
        [3761, 3761],
        [3764, 3769],
        [3771, 3772],
        [3784, 3789],
        [3864, 3865],
        [3893, 3893],
        [3895, 3895],
        [3897, 3897],
        [3953, 3966],
        [3968, 3972],
        [3974, 3975],
        [3984, 3991],
        [3993, 4028],
        [4038, 4038],
        [4141, 4144],
        [4146, 4146],
        [4150, 4151],
        [4153, 4153],
        [4184, 4185],
        [4448, 4607],
        [4959, 4959],
        [5906, 5908],
        [5938, 5940],
        [5970, 5971],
        [6002, 6003],
        [6068, 6069],
        [6071, 6077],
        [6086, 6086],
        [6089, 6099],
        [6109, 6109],
        [6155, 6157],
        [6313, 6313],
        [6432, 6434],
        [6439, 6440],
        [6450, 6450],
        [6457, 6459],
        [6679, 6680],
        [6912, 6915],
        [6964, 6964],
        [6966, 6970],
        [6972, 6972],
        [6978, 6978],
        [7019, 7027],
        [7616, 7626],
        [7678, 7679],
        [8203, 8207],
        [8234, 8238],
        [8288, 8291],
        [8298, 8303],
        [8400, 8431],
        [12330, 12335],
        [12441, 12442],
        [43014, 43014],
        [43019, 43019],
        [43045, 43046],
        [64286, 64286],
        [65024, 65039],
        [65056, 65059],
        [65279, 65279],
        [65529, 65531],
      ]),
      (qm = [
        [68097, 68099],
        [68101, 68102],
        [68108, 68111],
        [68152, 68154],
        [68159, 68159],
        [119143, 119145],
        [119155, 119170],
        [119173, 119179],
        [119210, 119213],
        [119362, 119364],
        [917505, 917505],
        [917536, 917631],
        [917760, 917999],
      ]),
      (Ym = class {
        constructor() {
          if (((this.version = `6`), !Jm)) {
            ((Jm = new Uint8Array(65536)),
              Jm.fill(1),
              (Jm[0] = 0),
              Jm.fill(0, 1, 32),
              Jm.fill(0, 127, 160),
              Jm.fill(2, 4352, 4448),
              (Jm[9001] = 2),
              (Jm[9002] = 2),
              Jm.fill(2, 11904, 42192),
              (Jm[12351] = 1),
              Jm.fill(2, 44032, 55204),
              Jm.fill(2, 63744, 64256),
              Jm.fill(2, 65040, 65050),
              Jm.fill(2, 65072, 65136),
              Jm.fill(2, 65280, 65377),
              Jm.fill(2, 65504, 65511));
            for (let e = 0; e < Km.length; ++e) Jm.fill(0, Km[e][0], Km[e][1] + 1);
          }
        }
        wcwidth(e) {
          return e < 32
            ? 0
            : e < 127
              ? 1
              : e < 65536
                ? Jm[e]
                : Cl(e, qm)
                  ? 0
                  : (e >= 131072 && e <= 196605) || (e >= 196608 && e <= 262141)
                    ? 2
                    : 1;
        }
        charProperties(e, t) {
          let n = this.wcwidth(e),
            r = n === 0 && t !== 0;
          if (r) {
            let e = Xm.extractWidth(t);
            e === 0 ? (r = !1) : e > n && (n = e);
          }
          return Xm.createPropertyValue(0, n, r);
        }
      }),
      (Xm = class e {
        constructor() {
          ((this._providers = Object.create(null)),
            (this._active = ``),
            (this._onChange = new K()),
            (this.onChange = this._onChange.event));
          let e = new Ym();
          (this.register(e), (this._active = e.version), (this._activeProvider = e));
        }
        static extractShouldJoin(e) {
          return (e & 1) != 0;
        }
        static extractWidth(e) {
          return (e >> 1) & 3;
        }
        static extractCharKind(e) {
          return e >> 3;
        }
        static createPropertyValue(e, t, n = !1) {
          return ((e & 16777215) << 3) | ((t & 3) << 1) | (n ? 1 : 0);
        }
        dispose() {
          this._onChange.dispose();
        }
        get versions() {
          return Object.keys(this._providers);
        }
        get activeVersion() {
          return this._active;
        }
        set activeVersion(e) {
          if (!this._providers[e]) throw Error(`unknown Unicode version "${e}"`);
          ((this._active = e), (this._activeProvider = this._providers[e]), this._onChange.fire(e));
        }
        register(e) {
          this._providers[e.version] = e;
        }
        wcwidth(e) {
          return this._activeProvider.wcwidth(e);
        }
        getStringCellWidth(t) {
          let n = 0,
            r = 0,
            i = t.length;
          for (let a = 0; a < i; ++a) {
            let o = t.charCodeAt(a);
            if (55296 <= o && o <= 56319) {
              if (++a >= i) return n + this.wcwidth(o);
              let e = t.charCodeAt(a);
              56320 <= e && e <= 57343
                ? (o = (o - 55296) * 1024 + e - 56320 + 65536)
                : (n += this.wcwidth(e));
            }
            let s = this.charProperties(o, r),
              c = e.extractWidth(s);
            (e.extractShouldJoin(s) && (c -= e.extractWidth(r)), (n += c), (r = s));
          }
          return n;
        }
        charProperties(e, t) {
          return this._activeProvider.charProperties(e, t);
        }
      }),
      (Zm = class {
        constructor() {
          ((this.glevel = 0), (this._charsets = []));
        }
        reset() {
          ((this.charset = void 0), (this._charsets = []), (this.glevel = 0));
        }
        setgLevel(e) {
          ((this.glevel = e), (this.charset = this._charsets[e]));
        }
        setgCharset(e, t) {
          ((this._charsets[e] = t), this.glevel === e && (this.charset = t));
        }
      }),
      (Qm = 2147483647),
      ($m = 256),
      (eh = class e {
        constructor(e = 32, t = 32) {
          if (((this.maxLength = e), (this.maxSubParamsLength = t), t > $m))
            throw Error(`maxSubParamsLength must not be greater than 256`);
          ((this.params = new Int32Array(e)),
            (this.length = 0),
            (this._subParams = new Int32Array(t)),
            (this._subParamsLength = 0),
            (this._subParamsIdx = new Uint16Array(e)),
            (this._rejectDigits = !1),
            (this._rejectSubDigits = !1),
            (this._digitIsSub = !1));
        }
        static fromArray(t) {
          let n = new e();
          if (!t.length) return n;
          for (let e = Array.isArray(t[0]) ? 1 : 0; e < t.length; ++e) {
            let r = t[e];
            if (Array.isArray(r)) for (let e = 0; e < r.length; ++e) n.addSubParam(r[e]);
            else n.addParam(r);
          }
          return n;
        }
        clone() {
          let t = new e(this.maxLength, this.maxSubParamsLength);
          return (
            t.params.set(this.params),
            (t.length = this.length),
            t._subParams.set(this._subParams),
            (t._subParamsLength = this._subParamsLength),
            t._subParamsIdx.set(this._subParamsIdx),
            (t._rejectDigits = this._rejectDigits),
            (t._rejectSubDigits = this._rejectSubDigits),
            (t._digitIsSub = this._digitIsSub),
            t
          );
        }
        toArray() {
          let e = [];
          for (let t = 0; t < this.length; ++t) {
            e.push(this.params[t]);
            let n = this._subParamsIdx[t] >> 8,
              r = this._subParamsIdx[t] & 255;
            r - n > 0 && e.push(Array.prototype.slice.call(this._subParams, n, r));
          }
          return e;
        }
        reset() {
          ((this.length = 0),
            (this._subParamsLength = 0),
            (this._rejectDigits = !1),
            (this._rejectSubDigits = !1),
            (this._digitIsSub = !1));
        }
        addParam(e) {
          if (((this._digitIsSub = !1), this.length >= this.maxLength)) {
            this._rejectDigits = !0;
            return;
          }
          if (e < -1) throw Error(`values lesser than -1 are not allowed`);
          ((this._subParamsIdx[this.length] = (this._subParamsLength << 8) | this._subParamsLength),
            (this.params[this.length++] = e > Qm ? Qm : e));
        }
        addSubParam(e) {
          if (((this._digitIsSub = !0), this.length)) {
            if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) {
              this._rejectSubDigits = !0;
              return;
            }
            if (e < -1) throw Error(`values lesser than -1 are not allowed`);
            ((this._subParams[this._subParamsLength++] = e > Qm ? Qm : e),
              this._subParamsIdx[this.length - 1]++);
          }
        }
        hasSubParams(e) {
          return (this._subParamsIdx[e] & 255) - (this._subParamsIdx[e] >> 8) > 0;
        }
        getSubParams(e) {
          let t = this._subParamsIdx[e] >> 8,
            n = this._subParamsIdx[e] & 255;
          return n - t > 0 ? this._subParams.subarray(t, n) : null;
        }
        getSubParamsAll() {
          let e = {};
          for (let t = 0; t < this.length; ++t) {
            let n = this._subParamsIdx[t] >> 8,
              r = this._subParamsIdx[t] & 255;
            r - n > 0 && (e[t] = this._subParams.slice(n, r));
          }
          return e;
        }
        addDigit(e) {
          let t;
          if (
            this._rejectDigits ||
            !(t = this._digitIsSub ? this._subParamsLength : this.length) ||
            (this._digitIsSub && this._rejectSubDigits)
          )
            return;
          let n = this._digitIsSub ? this._subParams : this.params,
            r = n[t - 1];
          n[t - 1] = ~r ? Math.min(r * 10 + e, Qm) : e;
        }
      }),
      (th = []),
      (nh = class {
        constructor() {
          ((this._state = 0),
            (this._active = th),
            (this._id = -1),
            (this._handlers = Object.create(null)),
            (this._handlerFb = () => {}),
            (this._stack = { paused: !1, loopPosition: 0, fallThrough: !1 }));
        }
        registerHandler(e, t) {
          this._handlers[e] === void 0 && (this._handlers[e] = []);
          let n = this._handlers[e];
          return (
            n.push(t),
            {
              dispose: () => {
                let e = n.indexOf(t);
                e !== -1 && n.splice(e, 1);
              },
            }
          );
        }
        clearHandler(e) {
          this._handlers[e] && delete this._handlers[e];
        }
        setHandlerFallback(e) {
          this._handlerFb = e;
        }
        dispose() {
          ((this._handlers = Object.create(null)),
            (this._handlerFb = () => {}),
            (this._active = th));
        }
        reset() {
          if (this._state === 2)
            for (
              let e = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1;
              e >= 0;
              --e
            )
              this._active[e].end(!1);
          ((this._stack.paused = !1), (this._active = th), (this._id = -1), (this._state = 0));
        }
        _start() {
          if (((this._active = this._handlers[this._id] || th), !this._active.length))
            this._handlerFb(this._id, `START`);
          else for (let e = this._active.length - 1; e >= 0; e--) this._active[e].start();
        }
        _put(e, t, n) {
          if (!this._active.length) this._handlerFb(this._id, `PUT`, Ws(e, t, n));
          else for (let r = this._active.length - 1; r >= 0; r--) this._active[r].put(e, t, n);
        }
        start() {
          (this.reset(), (this._state = 1));
        }
        put(e, t, n) {
          if (this._state !== 3) {
            if (this._state === 1)
              for (; t < n; ) {
                let n = e[t++];
                if (n === 59) {
                  ((this._state = 2), this._start());
                  break;
                }
                if (n < 48 || 57 < n) {
                  this._state = 3;
                  return;
                }
                (this._id === -1 && (this._id = 0), (this._id = this._id * 10 + n - 48));
              }
            this._state === 2 && n - t > 0 && this._put(e, t, n);
          }
        }
        end(e, t = !0) {
          if (this._state !== 0) {
            if (this._state !== 3)
              if ((this._state === 1 && this._start(), !this._active.length))
                this._handlerFb(this._id, `END`, e);
              else {
                let n = !1,
                  r = this._active.length - 1,
                  i = !1;
                if (
                  (this._stack.paused &&
                    ((r = this._stack.loopPosition - 1),
                    (n = t),
                    (i = this._stack.fallThrough),
                    (this._stack.paused = !1)),
                  !i && n === !1)
                ) {
                  for (; r >= 0 && ((n = this._active[r].end(e)), n !== !0); r--)
                    if (n instanceof Promise)
                      return (
                        (this._stack.paused = !0),
                        (this._stack.loopPosition = r),
                        (this._stack.fallThrough = !1),
                        n
                      );
                  r--;
                }
                for (; r >= 0; r--)
                  if (((n = this._active[r].end(!1)), n instanceof Promise))
                    return (
                      (this._stack.paused = !0),
                      (this._stack.loopPosition = r),
                      (this._stack.fallThrough = !0),
                      n
                    );
              }
            ((this._active = th), (this._id = -1), (this._state = 0));
          }
        }
      }),
      (rh = class {
        constructor(e) {
          ((this._handler = e), (this._data = ``), (this._hitLimit = !1));
        }
        start() {
          ((this._data = ``), (this._hitLimit = !1));
        }
        put(e, t, n) {
          this._hitLimit ||
            ((this._data += Ws(e, t, n)),
            this._data.length > 1e7 && ((this._data = ``), (this._hitLimit = !0)));
        }
        end(e) {
          let t = !1;
          if (this._hitLimit) t = !1;
          else if (e && ((t = this._handler(this._data)), t instanceof Promise))
            return t.then((e) => ((this._data = ``), (this._hitLimit = !1), e));
          return ((this._data = ``), (this._hitLimit = !1), t);
        }
      }),
      (ih = []),
      (ah = class {
        constructor() {
          ((this._handlers = Object.create(null)),
            (this._active = ih),
            (this._ident = 0),
            (this._handlerFb = () => {}),
            (this._stack = { paused: !1, loopPosition: 0, fallThrough: !1 }));
        }
        dispose() {
          ((this._handlers = Object.create(null)),
            (this._handlerFb = () => {}),
            (this._active = ih));
        }
        registerHandler(e, t) {
          this._handlers[e] === void 0 && (this._handlers[e] = []);
          let n = this._handlers[e];
          return (
            n.push(t),
            {
              dispose: () => {
                let e = n.indexOf(t);
                e !== -1 && n.splice(e, 1);
              },
            }
          );
        }
        clearHandler(e) {
          this._handlers[e] && delete this._handlers[e];
        }
        setHandlerFallback(e) {
          this._handlerFb = e;
        }
        reset() {
          if (this._active.length)
            for (
              let e = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1;
              e >= 0;
              --e
            )
              this._active[e].unhook(!1);
          ((this._stack.paused = !1), (this._active = ih), (this._ident = 0));
        }
        hook(e, t) {
          if (
            (this.reset(),
            (this._ident = e),
            (this._active = this._handlers[e] || ih),
            !this._active.length)
          )
            this._handlerFb(this._ident, `HOOK`, t);
          else for (let e = this._active.length - 1; e >= 0; e--) this._active[e].hook(t);
        }
        put(e, t, n) {
          if (!this._active.length) this._handlerFb(this._ident, `PUT`, Ws(e, t, n));
          else for (let r = this._active.length - 1; r >= 0; r--) this._active[r].put(e, t, n);
        }
        unhook(e, t = !0) {
          if (!this._active.length) this._handlerFb(this._ident, `UNHOOK`, e);
          else {
            let n = !1,
              r = this._active.length - 1,
              i = !1;
            if (
              (this._stack.paused &&
                ((r = this._stack.loopPosition - 1),
                (n = t),
                (i = this._stack.fallThrough),
                (this._stack.paused = !1)),
              !i && n === !1)
            ) {
              for (; r >= 0 && ((n = this._active[r].unhook(e)), n !== !0); r--)
                if (n instanceof Promise)
                  return (
                    (this._stack.paused = !0),
                    (this._stack.loopPosition = r),
                    (this._stack.fallThrough = !1),
                    n
                  );
              r--;
            }
            for (; r >= 0; r--)
              if (((n = this._active[r].unhook(!1)), n instanceof Promise))
                return (
                  (this._stack.paused = !0),
                  (this._stack.loopPosition = r),
                  (this._stack.fallThrough = !0),
                  n
                );
          }
          ((this._active = ih), (this._ident = 0));
        }
      }),
      (oh = new eh()),
      oh.addParam(0),
      (sh = class {
        constructor(e) {
          ((this._handler = e), (this._data = ``), (this._params = oh), (this._hitLimit = !1));
        }
        hook(e) {
          ((this._params = e.length > 1 || e.params[0] ? e.clone() : oh),
            (this._data = ``),
            (this._hitLimit = !1));
        }
        put(e, t, n) {
          this._hitLimit ||
            ((this._data += Ws(e, t, n)),
            this._data.length > 1e7 && ((this._data = ``), (this._hitLimit = !0)));
        }
        unhook(e) {
          let t = !1;
          if (this._hitLimit) t = !1;
          else if (e && ((t = this._handler(this._data, this._params)), t instanceof Promise))
            return t.then(
              (e) => ((this._params = oh), (this._data = ``), (this._hitLimit = !1), e),
            );
          return ((this._params = oh), (this._data = ``), (this._hitLimit = !1), t);
        }
      }),
      (ch = class {
        constructor(e) {
          this.table = new Uint8Array(e);
        }
        setDefault(e, t) {
          this.table.fill((e << 4) | t);
        }
        add(e, t, n, r) {
          this.table[(t << 8) | e] = (n << 4) | r;
        }
        addMany(e, t, n, r) {
          for (let i = 0; i < e.length; i++) this.table[(t << 8) | e[i]] = (n << 4) | r;
        }
      }),
      (lh = 160),
      (uh = (function () {
        let e = new ch(4095),
          t = Array.apply(null, Array(256)).map((e, t) => t),
          n = (e, n) => t.slice(e, n),
          r = n(32, 127),
          i = n(0, 24);
        (i.push(25), i.push.apply(i, n(28, 32)));
        let a = n(0, 14),
          o;
        for (o in (e.setDefault(1, 0), e.addMany(r, 0, 2, 0), a))
          (e.addMany([24, 26, 153, 154], o, 3, 0),
            e.addMany(n(128, 144), o, 3, 0),
            e.addMany(n(144, 152), o, 3, 0),
            e.add(156, o, 0, 0),
            e.add(27, o, 11, 1),
            e.add(157, o, 4, 8),
            e.addMany([152, 158, 159], o, 0, 7),
            e.add(155, o, 11, 3),
            e.add(144, o, 11, 9));
        return (
          e.addMany(i, 0, 3, 0),
          e.addMany(i, 1, 3, 1),
          e.add(127, 1, 0, 1),
          e.addMany(i, 8, 0, 8),
          e.addMany(i, 3, 3, 3),
          e.add(127, 3, 0, 3),
          e.addMany(i, 4, 3, 4),
          e.add(127, 4, 0, 4),
          e.addMany(i, 6, 3, 6),
          e.addMany(i, 5, 3, 5),
          e.add(127, 5, 0, 5),
          e.addMany(i, 2, 3, 2),
          e.add(127, 2, 0, 2),
          e.add(93, 1, 4, 8),
          e.addMany(r, 8, 5, 8),
          e.add(127, 8, 5, 8),
          e.addMany([156, 27, 24, 26, 7], 8, 6, 0),
          e.addMany(n(28, 32), 8, 0, 8),
          e.addMany([88, 94, 95], 1, 0, 7),
          e.addMany(r, 7, 0, 7),
          e.addMany(i, 7, 0, 7),
          e.add(156, 7, 0, 0),
          e.add(127, 7, 0, 7),
          e.add(91, 1, 11, 3),
          e.addMany(n(64, 127), 3, 7, 0),
          e.addMany(n(48, 60), 3, 8, 4),
          e.addMany([60, 61, 62, 63], 3, 9, 4),
          e.addMany(n(48, 60), 4, 8, 4),
          e.addMany(n(64, 127), 4, 7, 0),
          e.addMany([60, 61, 62, 63], 4, 0, 6),
          e.addMany(n(32, 64), 6, 0, 6),
          e.add(127, 6, 0, 6),
          e.addMany(n(64, 127), 6, 0, 0),
          e.addMany(n(32, 48), 3, 9, 5),
          e.addMany(n(32, 48), 5, 9, 5),
          e.addMany(n(48, 64), 5, 0, 6),
          e.addMany(n(64, 127), 5, 7, 0),
          e.addMany(n(32, 48), 4, 9, 5),
          e.addMany(n(32, 48), 1, 9, 2),
          e.addMany(n(32, 48), 2, 9, 2),
          e.addMany(n(48, 127), 2, 10, 0),
          e.addMany(n(48, 80), 1, 10, 0),
          e.addMany(n(81, 88), 1, 10, 0),
          e.addMany([89, 90, 92], 1, 10, 0),
          e.addMany(n(96, 127), 1, 10, 0),
          e.add(80, 1, 11, 9),
          e.addMany(i, 9, 0, 9),
          e.add(127, 9, 0, 9),
          e.addMany(n(28, 32), 9, 0, 9),
          e.addMany(n(32, 48), 9, 9, 12),
          e.addMany(n(48, 60), 9, 8, 10),
          e.addMany([60, 61, 62, 63], 9, 9, 10),
          e.addMany(i, 11, 0, 11),
          e.addMany(n(32, 128), 11, 0, 11),
          e.addMany(n(28, 32), 11, 0, 11),
          e.addMany(i, 10, 0, 10),
          e.add(127, 10, 0, 10),
          e.addMany(n(28, 32), 10, 0, 10),
          e.addMany(n(48, 60), 10, 8, 10),
          e.addMany([60, 61, 62, 63], 10, 0, 11),
          e.addMany(n(32, 48), 10, 9, 12),
          e.addMany(i, 12, 0, 12),
          e.add(127, 12, 0, 12),
          e.addMany(n(28, 32), 12, 0, 12),
          e.addMany(n(32, 48), 12, 9, 12),
          e.addMany(n(48, 64), 12, 0, 11),
          e.addMany(n(64, 127), 12, 12, 13),
          e.addMany(n(64, 127), 10, 12, 13),
          e.addMany(n(64, 127), 9, 12, 13),
          e.addMany(i, 13, 13, 13),
          e.addMany(r, 13, 13, 13),
          e.add(127, 13, 0, 13),
          e.addMany([27, 156, 24, 26], 13, 14, 0),
          e.add(lh, 0, 2, 0),
          e.add(lh, 8, 5, 8),
          e.add(lh, 6, 0, 6),
          e.add(lh, 11, 0, 11),
          e.add(lh, 13, 13, 13),
          e
        );
      })()),
      (dh = class extends W {
        constructor(e = uh) {
          (super(),
            (this._transitions = e),
            (this._parseStack = {
              state: 0,
              handlers: [],
              handlerPos: 0,
              transition: 0,
              chunkPos: 0,
            }),
            (this.initialState = 0),
            (this.currentState = this.initialState),
            (this._params = new eh()),
            this._params.addParam(0),
            (this._collect = 0),
            (this.precedingJoinState = 0),
            (this._printHandlerFb = (e, t, n) => {}),
            (this._executeHandlerFb = (e) => {}),
            (this._csiHandlerFb = (e, t) => {}),
            (this._escHandlerFb = (e) => {}),
            (this._errorHandlerFb = (e) => e),
            (this._printHandler = this._printHandlerFb),
            (this._executeHandlers = Object.create(null)),
            (this._csiHandlers = Object.create(null)),
            (this._escHandlers = Object.create(null)),
            this._register(
              z(() => {
                ((this._csiHandlers = Object.create(null)),
                  (this._executeHandlers = Object.create(null)),
                  (this._escHandlers = Object.create(null)));
              }),
            ),
            (this._oscParser = this._register(new nh())),
            (this._dcsParser = this._register(new ah())),
            (this._errorHandler = this._errorHandlerFb),
            this.registerEscHandler({ final: `\\` }, () => !0));
        }
        _identifier(e, t = [64, 126]) {
          let n = 0;
          if (e.prefix) {
            if (e.prefix.length > 1) throw Error(`only one byte as prefix supported`);
            if (((n = e.prefix.charCodeAt(0)), (n && 60 > n) || n > 63))
              throw Error(`prefix must be in range 0x3c .. 0x3f`);
          }
          if (e.intermediates) {
            if (e.intermediates.length > 2)
              throw Error(`only two bytes as intermediates are supported`);
            for (let t = 0; t < e.intermediates.length; ++t) {
              let r = e.intermediates.charCodeAt(t);
              if (32 > r || r > 47) throw Error(`intermediate must be in range 0x20 .. 0x2f`);
              ((n <<= 8), (n |= r));
            }
          }
          if (e.final.length !== 1) throw Error(`final must be a single byte`);
          let r = e.final.charCodeAt(0);
          if (t[0] > r || r > t[1]) throw Error(`final must be in range ${t[0]} .. ${t[1]}`);
          return ((n <<= 8), (n |= r), n);
        }
        identToString(e) {
          let t = [];
          for (; e; ) (t.push(String.fromCharCode(e & 255)), (e >>= 8));
          return t.reverse().join(``);
        }
        setPrintHandler(e) {
          this._printHandler = e;
        }
        clearPrintHandler() {
          this._printHandler = this._printHandlerFb;
        }
        registerEscHandler(e, t) {
          let n = this._identifier(e, [48, 126]);
          this._escHandlers[n] === void 0 && (this._escHandlers[n] = []);
          let r = this._escHandlers[n];
          return (
            r.push(t),
            {
              dispose: () => {
                let e = r.indexOf(t);
                e !== -1 && r.splice(e, 1);
              },
            }
          );
        }
        clearEscHandler(e) {
          this._escHandlers[this._identifier(e, [48, 126])] &&
            delete this._escHandlers[this._identifier(e, [48, 126])];
        }
        setEscHandlerFallback(e) {
          this._escHandlerFb = e;
        }
        setExecuteHandler(e, t) {
          this._executeHandlers[e.charCodeAt(0)] = t;
        }
        clearExecuteHandler(e) {
          this._executeHandlers[e.charCodeAt(0)] && delete this._executeHandlers[e.charCodeAt(0)];
        }
        setExecuteHandlerFallback(e) {
          this._executeHandlerFb = e;
        }
        registerCsiHandler(e, t) {
          let n = this._identifier(e);
          this._csiHandlers[n] === void 0 && (this._csiHandlers[n] = []);
          let r = this._csiHandlers[n];
          return (
            r.push(t),
            {
              dispose: () => {
                let e = r.indexOf(t);
                e !== -1 && r.splice(e, 1);
              },
            }
          );
        }
        clearCsiHandler(e) {
          this._csiHandlers[this._identifier(e)] && delete this._csiHandlers[this._identifier(e)];
        }
        setCsiHandlerFallback(e) {
          this._csiHandlerFb = e;
        }
        registerDcsHandler(e, t) {
          return this._dcsParser.registerHandler(this._identifier(e), t);
        }
        clearDcsHandler(e) {
          this._dcsParser.clearHandler(this._identifier(e));
        }
        setDcsHandlerFallback(e) {
          this._dcsParser.setHandlerFallback(e);
        }
        registerOscHandler(e, t) {
          return this._oscParser.registerHandler(e, t);
        }
        clearOscHandler(e) {
          this._oscParser.clearHandler(e);
        }
        setOscHandlerFallback(e) {
          this._oscParser.setHandlerFallback(e);
        }
        setErrorHandler(e) {
          this._errorHandler = e;
        }
        clearErrorHandler() {
          this._errorHandler = this._errorHandlerFb;
        }
        reset() {
          ((this.currentState = this.initialState),
            this._oscParser.reset(),
            this._dcsParser.reset(),
            this._params.reset(),
            this._params.addParam(0),
            (this._collect = 0),
            (this.precedingJoinState = 0),
            this._parseStack.state !== 0 &&
              ((this._parseStack.state = 2), (this._parseStack.handlers = [])));
        }
        _preserveStack(e, t, n, r, i) {
          ((this._parseStack.state = e),
            (this._parseStack.handlers = t),
            (this._parseStack.handlerPos = n),
            (this._parseStack.transition = r),
            (this._parseStack.chunkPos = i));
        }
        parse(e, t, n) {
          let r = 0,
            i = 0,
            a = 0,
            o;
          if (this._parseStack.state)
            if (this._parseStack.state === 2)
              ((this._parseStack.state = 0), (a = this._parseStack.chunkPos + 1));
            else {
              if (n === void 0 || this._parseStack.state === 1)
                throw (
                  (this._parseStack.state = 1),
                  Error(`improper continuation due to previous async handler, giving up parsing`)
                );
              let t = this._parseStack.handlers,
                i = this._parseStack.handlerPos - 1;
              switch (this._parseStack.state) {
                case 3:
                  if (n === !1 && i > -1) {
                    for (; i >= 0 && ((o = t[i](this._params)), o !== !0); i--)
                      if (o instanceof Promise) return ((this._parseStack.handlerPos = i), o);
                  }
                  this._parseStack.handlers = [];
                  break;
                case 4:
                  if (n === !1 && i > -1) {
                    for (; i >= 0 && ((o = t[i]()), o !== !0); i--)
                      if (o instanceof Promise) return ((this._parseStack.handlerPos = i), o);
                  }
                  this._parseStack.handlers = [];
                  break;
                case 6:
                  if (
                    ((r = e[this._parseStack.chunkPos]),
                    (o = this._dcsParser.unhook(r !== 24 && r !== 26, n)),
                    o)
                  )
                    return o;
                  (r === 27 && (this._parseStack.transition |= 1),
                    this._params.reset(),
                    this._params.addParam(0),
                    (this._collect = 0));
                  break;
                case 5:
                  if (
                    ((r = e[this._parseStack.chunkPos]),
                    (o = this._oscParser.end(r !== 24 && r !== 26, n)),
                    o)
                  )
                    return o;
                  (r === 27 && (this._parseStack.transition |= 1),
                    this._params.reset(),
                    this._params.addParam(0),
                    (this._collect = 0));
                  break;
              }
              ((this._parseStack.state = 0),
                (a = this._parseStack.chunkPos + 1),
                (this.precedingJoinState = 0),
                (this.currentState = this._parseStack.transition & 15));
            }
          for (let n = a; n < t; ++n) {
            switch (
              ((r = e[n]),
              (i = this._transitions.table[(this.currentState << 8) | (r < 160 ? r : lh)]),
              i >> 4)
            ) {
              case 2:
                for (let i = n + 1; ; ++i) {
                  if (i >= t || (r = e[i]) < 32 || (r > 126 && r < lh)) {
                    (this._printHandler(e, n, i), (n = i - 1));
                    break;
                  }
                  if (++i >= t || (r = e[i]) < 32 || (r > 126 && r < lh)) {
                    (this._printHandler(e, n, i), (n = i - 1));
                    break;
                  }
                  if (++i >= t || (r = e[i]) < 32 || (r > 126 && r < lh)) {
                    (this._printHandler(e, n, i), (n = i - 1));
                    break;
                  }
                  if (++i >= t || (r = e[i]) < 32 || (r > 126 && r < lh)) {
                    (this._printHandler(e, n, i), (n = i - 1));
                    break;
                  }
                }
                break;
              case 3:
                (this._executeHandlers[r] ? this._executeHandlers[r]() : this._executeHandlerFb(r),
                  (this.precedingJoinState = 0));
                break;
              case 0:
                break;
              case 1:
                if (
                  this._errorHandler({
                    position: n,
                    code: r,
                    currentState: this.currentState,
                    collect: this._collect,
                    params: this._params,
                    abort: !1,
                  }).abort
                )
                  return;
                break;
              case 7:
                let a = this._csiHandlers[(this._collect << 8) | r],
                  s = a ? a.length - 1 : -1;
                for (; s >= 0 && ((o = a[s](this._params)), o !== !0); s--)
                  if (o instanceof Promise) return (this._preserveStack(3, a, s, i, n), o);
                (s < 0 && this._csiHandlerFb((this._collect << 8) | r, this._params),
                  (this.precedingJoinState = 0));
                break;
              case 8:
                do
                  switch (r) {
                    case 59:
                      this._params.addParam(0);
                      break;
                    case 58:
                      this._params.addSubParam(-1);
                      break;
                    default:
                      this._params.addDigit(r - 48);
                  }
                while (++n < t && (r = e[n]) > 47 && r < 60);
                n--;
                break;
              case 9:
                ((this._collect <<= 8), (this._collect |= r));
                break;
              case 10:
                let c = this._escHandlers[(this._collect << 8) | r],
                  l = c ? c.length - 1 : -1;
                for (; l >= 0 && ((o = c[l]()), o !== !0); l--)
                  if (o instanceof Promise) return (this._preserveStack(4, c, l, i, n), o);
                (l < 0 && this._escHandlerFb((this._collect << 8) | r),
                  (this.precedingJoinState = 0));
                break;
              case 11:
                (this._params.reset(), this._params.addParam(0), (this._collect = 0));
                break;
              case 12:
                this._dcsParser.hook((this._collect << 8) | r, this._params);
                break;
              case 13:
                for (let i = n + 1; ; ++i)
                  if (i >= t || (r = e[i]) === 24 || r === 26 || r === 27 || (r > 127 && r < lh)) {
                    (this._dcsParser.put(e, n, i), (n = i - 1));
                    break;
                  }
                break;
              case 14:
                if (((o = this._dcsParser.unhook(r !== 24 && r !== 26)), o))
                  return (this._preserveStack(6, [], 0, i, n), o);
                (r === 27 && (i |= 1),
                  this._params.reset(),
                  this._params.addParam(0),
                  (this._collect = 0),
                  (this.precedingJoinState = 0));
                break;
              case 4:
                this._oscParser.start();
                break;
              case 5:
                for (let i = n + 1; ; i++)
                  if (i >= t || (r = e[i]) < 32 || (r > 127 && r < lh)) {
                    (this._oscParser.put(e, n, i), (n = i - 1));
                    break;
                  }
                break;
              case 6:
                if (((o = this._oscParser.end(r !== 24 && r !== 26)), o))
                  return (this._preserveStack(5, [], 0, i, n), o);
                (r === 27 && (i |= 1),
                  this._params.reset(),
                  this._params.addParam(0),
                  (this._collect = 0),
                  (this.precedingJoinState = 0));
                break;
            }
            this.currentState = i & 15;
          }
        }
      }),
      (fh =
        /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/),
      (ph = /^[\da-f]+$/),
      (mh = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 }),
      (hh = 131072),
      (gh = 10),
      (_h = 5e3),
      (vh = 0),
      (yh = class extends W {
        constructor(e, t, n, r, i, a, o, s, c = new dh()) {
          (super(),
            (this._bufferService = e),
            (this._charsetService = t),
            (this._coreService = n),
            (this._logService = r),
            (this._optionsService = i),
            (this._oscLinkService = a),
            (this._coreMouseService = o),
            (this._unicodeService = s),
            (this._parser = c),
            (this._parseBuffer = new Uint32Array(4096)),
            (this._stringDecoder = new Bl()),
            (this._utf8Decoder = new Vl()),
            (this._windowTitle = ``),
            (this._iconName = ``),
            (this._windowTitleStack = []),
            (this._iconNameStack = []),
            (this._curAttrData = Sm.clone()),
            (this._eraseAttrDataInternal = Sm.clone()),
            (this._onRequestBell = this._register(new K())),
            (this.onRequestBell = this._onRequestBell.event),
            (this._onRequestRefreshRows = this._register(new K())),
            (this.onRequestRefreshRows = this._onRequestRefreshRows.event),
            (this._onRequestReset = this._register(new K())),
            (this.onRequestReset = this._onRequestReset.event),
            (this._onRequestSendFocus = this._register(new K())),
            (this.onRequestSendFocus = this._onRequestSendFocus.event),
            (this._onRequestSyncScrollBar = this._register(new K())),
            (this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event),
            (this._onRequestWindowsOptionsReport = this._register(new K())),
            (this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event),
            (this._onA11yChar = this._register(new K())),
            (this.onA11yChar = this._onA11yChar.event),
            (this._onA11yTab = this._register(new K())),
            (this.onA11yTab = this._onA11yTab.event),
            (this._onCursorMove = this._register(new K())),
            (this.onCursorMove = this._onCursorMove.event),
            (this._onLineFeed = this._register(new K())),
            (this.onLineFeed = this._onLineFeed.event),
            (this._onScroll = this._register(new K())),
            (this.onScroll = this._onScroll.event),
            (this._onTitleChange = this._register(new K())),
            (this.onTitleChange = this._onTitleChange.event),
            (this._onColor = this._register(new K())),
            (this.onColor = this._onColor.event),
            (this._parseStack = {
              paused: !1,
              cursorStartX: 0,
              cursorStartY: 0,
              decodedLength: 0,
              position: 0,
            }),
            (this._specialColors = [256, 257, 258]),
            this._register(this._parser),
            (this._dirtyRowTracker = new bh(this._bufferService)),
            (this._activeBuffer = this._bufferService.buffer),
            this._register(
              this._bufferService.buffers.onBufferActivate(
                (e) => (this._activeBuffer = e.activeBuffer),
              ),
            ),
            this._parser.setCsiHandlerFallback((e, t) => {
              this._logService.debug(`Unknown CSI code: `, {
                identifier: this._parser.identToString(e),
                params: t.toArray(),
              });
            }),
            this._parser.setEscHandlerFallback((e) => {
              this._logService.debug(`Unknown ESC code: `, {
                identifier: this._parser.identToString(e),
              });
            }),
            this._parser.setExecuteHandlerFallback((e) => {
              this._logService.debug(`Unknown EXECUTE code: `, { code: e });
            }),
            this._parser.setOscHandlerFallback((e, t, n) => {
              this._logService.debug(`Unknown OSC code: `, { identifier: e, action: t, data: n });
            }),
            this._parser.setDcsHandlerFallback((e, t, n) => {
              (t === `HOOK` && (n = n.toArray()),
                this._logService.debug(`Unknown DCS code: `, {
                  identifier: this._parser.identToString(e),
                  action: t,
                  payload: n,
                }));
            }),
            this._parser.setPrintHandler((e, t, n) => this.print(e, t, n)),
            this._parser.registerCsiHandler({ final: `@` }, (e) => this.insertChars(e)),
            this._parser.registerCsiHandler({ intermediates: ` `, final: `@` }, (e) =>
              this.scrollLeft(e),
            ),
            this._parser.registerCsiHandler({ final: `A` }, (e) => this.cursorUp(e)),
            this._parser.registerCsiHandler({ intermediates: ` `, final: `A` }, (e) =>
              this.scrollRight(e),
            ),
            this._parser.registerCsiHandler({ final: `B` }, (e) => this.cursorDown(e)),
            this._parser.registerCsiHandler({ final: `C` }, (e) => this.cursorForward(e)),
            this._parser.registerCsiHandler({ final: `D` }, (e) => this.cursorBackward(e)),
            this._parser.registerCsiHandler({ final: `E` }, (e) => this.cursorNextLine(e)),
            this._parser.registerCsiHandler({ final: `F` }, (e) => this.cursorPrecedingLine(e)),
            this._parser.registerCsiHandler({ final: `G` }, (e) => this.cursorCharAbsolute(e)),
            this._parser.registerCsiHandler({ final: `H` }, (e) => this.cursorPosition(e)),
            this._parser.registerCsiHandler({ final: `I` }, (e) => this.cursorForwardTab(e)),
            this._parser.registerCsiHandler({ final: `J` }, (e) => this.eraseInDisplay(e, !1)),
            this._parser.registerCsiHandler({ prefix: `?`, final: `J` }, (e) =>
              this.eraseInDisplay(e, !0),
            ),
            this._parser.registerCsiHandler({ final: `K` }, (e) => this.eraseInLine(e, !1)),
            this._parser.registerCsiHandler({ prefix: `?`, final: `K` }, (e) =>
              this.eraseInLine(e, !0),
            ),
            this._parser.registerCsiHandler({ final: `L` }, (e) => this.insertLines(e)),
            this._parser.registerCsiHandler({ final: `M` }, (e) => this.deleteLines(e)),
            this._parser.registerCsiHandler({ final: `P` }, (e) => this.deleteChars(e)),
            this._parser.registerCsiHandler({ final: `S` }, (e) => this.scrollUp(e)),
            this._parser.registerCsiHandler({ final: `T` }, (e) => this.scrollDown(e)),
            this._parser.registerCsiHandler({ final: `X` }, (e) => this.eraseChars(e)),
            this._parser.registerCsiHandler({ final: `Z` }, (e) => this.cursorBackwardTab(e)),
            this._parser.registerCsiHandler({ final: "`" }, (e) => this.charPosAbsolute(e)),
            this._parser.registerCsiHandler({ final: `a` }, (e) => this.hPositionRelative(e)),
            this._parser.registerCsiHandler({ final: `b` }, (e) =>
              this.repeatPrecedingCharacter(e),
            ),
            this._parser.registerCsiHandler({ final: `c` }, (e) =>
              this.sendDeviceAttributesPrimary(e),
            ),
            this._parser.registerCsiHandler({ prefix: `>`, final: `c` }, (e) =>
              this.sendDeviceAttributesSecondary(e),
            ),
            this._parser.registerCsiHandler({ final: `d` }, (e) => this.linePosAbsolute(e)),
            this._parser.registerCsiHandler({ final: `e` }, (e) => this.vPositionRelative(e)),
            this._parser.registerCsiHandler({ final: `f` }, (e) => this.hVPosition(e)),
            this._parser.registerCsiHandler({ final: `g` }, (e) => this.tabClear(e)),
            this._parser.registerCsiHandler({ final: `h` }, (e) => this.setMode(e)),
            this._parser.registerCsiHandler({ prefix: `?`, final: `h` }, (e) =>
              this.setModePrivate(e),
            ),
            this._parser.registerCsiHandler({ final: `l` }, (e) => this.resetMode(e)),
            this._parser.registerCsiHandler({ prefix: `?`, final: `l` }, (e) =>
              this.resetModePrivate(e),
            ),
            this._parser.registerCsiHandler({ final: `m` }, (e) => this.charAttributes(e)),
            this._parser.registerCsiHandler({ final: `n` }, (e) => this.deviceStatus(e)),
            this._parser.registerCsiHandler({ prefix: `?`, final: `n` }, (e) =>
              this.deviceStatusPrivate(e),
            ),
            this._parser.registerCsiHandler({ intermediates: `!`, final: `p` }, (e) =>
              this.softReset(e),
            ),
            this._parser.registerCsiHandler({ intermediates: ` `, final: `q` }, (e) =>
              this.setCursorStyle(e),
            ),
            this._parser.registerCsiHandler({ final: `r` }, (e) => this.setScrollRegion(e)),
            this._parser.registerCsiHandler({ final: `s` }, (e) => this.saveCursor(e)),
            this._parser.registerCsiHandler({ final: `t` }, (e) => this.windowOptions(e)),
            this._parser.registerCsiHandler({ final: `u` }, (e) => this.restoreCursor(e)),
            this._parser.registerCsiHandler({ intermediates: `'`, final: `}` }, (e) =>
              this.insertColumns(e),
            ),
            this._parser.registerCsiHandler({ intermediates: `'`, final: `~` }, (e) =>
              this.deleteColumns(e),
            ),
            this._parser.registerCsiHandler({ intermediates: `"`, final: `q` }, (e) =>
              this.selectProtected(e),
            ),
            this._parser.registerCsiHandler({ intermediates: `$`, final: `p` }, (e) =>
              this.requestMode(e, !0),
            ),
            this._parser.registerCsiHandler({ prefix: `?`, intermediates: `$`, final: `p` }, (e) =>
              this.requestMode(e, !1),
            ),
            this._parser.setExecuteHandler(q.BEL, () => this.bell()),
            this._parser.setExecuteHandler(q.LF, () => this.lineFeed()),
            this._parser.setExecuteHandler(q.VT, () => this.lineFeed()),
            this._parser.setExecuteHandler(q.FF, () => this.lineFeed()),
            this._parser.setExecuteHandler(q.CR, () => this.carriageReturn()),
            this._parser.setExecuteHandler(q.BS, () => this.backspace()),
            this._parser.setExecuteHandler(q.HT, () => this.tab()),
            this._parser.setExecuteHandler(q.SO, () => this.shiftOut()),
            this._parser.setExecuteHandler(q.SI, () => this.shiftIn()),
            this._parser.setExecuteHandler(tp.IND, () => this.index()),
            this._parser.setExecuteHandler(tp.NEL, () => this.nextLine()),
            this._parser.setExecuteHandler(tp.HTS, () => this.tabSet()),
            this._parser.registerOscHandler(
              0,
              new rh((e) => (this.setTitle(e), this.setIconName(e), !0)),
            ),
            this._parser.registerOscHandler(1, new rh((e) => this.setIconName(e))),
            this._parser.registerOscHandler(2, new rh((e) => this.setTitle(e))),
            this._parser.registerOscHandler(4, new rh((e) => this.setOrReportIndexedColor(e))),
            this._parser.registerOscHandler(8, new rh((e) => this.setHyperlink(e))),
            this._parser.registerOscHandler(10, new rh((e) => this.setOrReportFgColor(e))),
            this._parser.registerOscHandler(11, new rh((e) => this.setOrReportBgColor(e))),
            this._parser.registerOscHandler(12, new rh((e) => this.setOrReportCursorColor(e))),
            this._parser.registerOscHandler(104, new rh((e) => this.restoreIndexedColor(e))),
            this._parser.registerOscHandler(110, new rh((e) => this.restoreFgColor(e))),
            this._parser.registerOscHandler(111, new rh((e) => this.restoreBgColor(e))),
            this._parser.registerOscHandler(112, new rh((e) => this.restoreCursorColor(e))),
            this._parser.registerEscHandler({ final: `7` }, () => this.saveCursor()),
            this._parser.registerEscHandler({ final: `8` }, () => this.restoreCursor()),
            this._parser.registerEscHandler({ final: `D` }, () => this.index()),
            this._parser.registerEscHandler({ final: `E` }, () => this.nextLine()),
            this._parser.registerEscHandler({ final: `H` }, () => this.tabSet()),
            this._parser.registerEscHandler({ final: `M` }, () => this.reverseIndex()),
            this._parser.registerEscHandler({ final: `=` }, () => this.keypadApplicationMode()),
            this._parser.registerEscHandler({ final: `>` }, () => this.keypadNumericMode()),
            this._parser.registerEscHandler({ final: `c` }, () => this.fullReset()),
            this._parser.registerEscHandler({ final: `n` }, () => this.setgLevel(2)),
            this._parser.registerEscHandler({ final: `o` }, () => this.setgLevel(3)),
            this._parser.registerEscHandler({ final: `|` }, () => this.setgLevel(3)),
            this._parser.registerEscHandler({ final: `}` }, () => this.setgLevel(2)),
            this._parser.registerEscHandler({ final: `~` }, () => this.setgLevel(1)),
            this._parser.registerEscHandler({ intermediates: `%`, final: `@` }, () =>
              this.selectDefaultCharset(),
            ),
            this._parser.registerEscHandler({ intermediates: `%`, final: `G` }, () =>
              this.selectDefaultCharset(),
            ));
          for (let e in Om)
            (this._parser.registerEscHandler({ intermediates: `(`, final: e }, () =>
              this.selectCharset(`(` + e),
            ),
              this._parser.registerEscHandler({ intermediates: `)`, final: e }, () =>
                this.selectCharset(`)` + e),
              ),
              this._parser.registerEscHandler({ intermediates: `*`, final: e }, () =>
                this.selectCharset(`*` + e),
              ),
              this._parser.registerEscHandler({ intermediates: `+`, final: e }, () =>
                this.selectCharset(`+` + e),
              ),
              this._parser.registerEscHandler({ intermediates: `-`, final: e }, () =>
                this.selectCharset(`-` + e),
              ),
              this._parser.registerEscHandler({ intermediates: `.`, final: e }, () =>
                this.selectCharset(`.` + e),
              ),
              this._parser.registerEscHandler({ intermediates: `/`, final: e }, () =>
                this.selectCharset(`/` + e),
              ));
          (this._parser.registerEscHandler({ intermediates: `#`, final: `8` }, () =>
            this.screenAlignmentPattern(),
          ),
            this._parser.setErrorHandler((e) => (this._logService.error(`Parsing error: `, e), e)),
            this._parser.registerDcsHandler(
              { intermediates: `$`, final: `q` },
              new sh((e, t) => this.requestStatusString(e, t)),
            ));
        }
        getAttrData() {
          return this._curAttrData;
        }
        _preserveStack(e, t, n, r) {
          ((this._parseStack.paused = !0),
            (this._parseStack.cursorStartX = e),
            (this._parseStack.cursorStartY = t),
            (this._parseStack.decodedLength = n),
            (this._parseStack.position = r));
        }
        _logSlowResolvingAsync(e) {
          this._logService.logLevel <= 3 &&
            Promise.race([
              e,
              new Promise((e, t) => setTimeout(() => t(`#SLOW_TIMEOUT`), _h)),
            ]).catch((e) => {
              if (e !== `#SLOW_TIMEOUT`) throw e;
              console.warn(`async parser handler taking longer than ${_h} ms`);
            });
        }
        _getCurrentLinkId() {
          return this._curAttrData.extended.urlId;
        }
        parse(e, t) {
          let n,
            r = this._activeBuffer.x,
            i = this._activeBuffer.y,
            a = 0,
            o = this._parseStack.paused;
          if (o) {
            if ((n = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, t)))
              return (this._logSlowResolvingAsync(n), n);
            ((r = this._parseStack.cursorStartX),
              (i = this._parseStack.cursorStartY),
              (this._parseStack.paused = !1),
              e.length > hh && (a = this._parseStack.position + hh));
          }
          if (
            (this._logService.logLevel <= 1 &&
              this._logService.debug(
                `parsing data ${typeof e == `string` ? ` "${e}"` : ` "${Array.prototype.map.call(e, (e) => String.fromCharCode(e)).join(``)}"`}`,
              ),
            this._logService.logLevel === 0 &&
              this._logService.trace(
                `parsing data (codes)`,
                typeof e == `string` ? e.split(``).map((e) => e.charCodeAt(0)) : e,
              ),
            this._parseBuffer.length < e.length &&
              this._parseBuffer.length < hh &&
              (this._parseBuffer = new Uint32Array(Math.min(e.length, hh))),
            o || this._dirtyRowTracker.clearRange(),
            e.length > hh)
          )
            for (let t = a; t < e.length; t += hh) {
              let a = t + hh < e.length ? t + hh : e.length,
                o =
                  typeof e == `string`
                    ? this._stringDecoder.decode(e.substring(t, a), this._parseBuffer)
                    : this._utf8Decoder.decode(e.subarray(t, a), this._parseBuffer);
              if ((n = this._parser.parse(this._parseBuffer, o)))
                return (this._preserveStack(r, i, o, t), this._logSlowResolvingAsync(n), n);
            }
          else if (!o) {
            let t =
              typeof e == `string`
                ? this._stringDecoder.decode(e, this._parseBuffer)
                : this._utf8Decoder.decode(e, this._parseBuffer);
            if ((n = this._parser.parse(this._parseBuffer, t)))
              return (this._preserveStack(r, i, t, 0), this._logSlowResolvingAsync(n), n);
          }
          (this._activeBuffer.x !== r || this._activeBuffer.y !== i) && this._onCursorMove.fire();
          let s =
              this._dirtyRowTracker.end +
              (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp),
            c =
              this._dirtyRowTracker.start +
              (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
          c < this._bufferService.rows &&
            this._onRequestRefreshRows.fire({
              start: Math.min(c, this._bufferService.rows - 1),
              end: Math.min(s, this._bufferService.rows - 1),
            });
        }
        print(e, t, n) {
          let r,
            i,
            a = this._charsetService.charset,
            o = this._optionsService.rawOptions.screenReaderMode,
            s = this._bufferService.cols,
            c = this._coreService.decPrivateModes.wraparound,
            l = this._coreService.modes.insertMode,
            u = this._curAttrData,
            d = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          (this._dirtyRowTracker.markDirty(this._activeBuffer.y),
            this._activeBuffer.x &&
              n - t > 0 &&
              d.getWidth(this._activeBuffer.x - 1) === 2 &&
              d.setCellFromCodepoint(this._activeBuffer.x - 1, 0, 1, u));
          let f = this._parser.precedingJoinState;
          for (let p = t; p < n; ++p) {
            if (((r = e[p]), r < 127 && a)) {
              let e = a[String.fromCharCode(r)];
              e && (r = e.charCodeAt(0));
            }
            let t = this._unicodeService.charProperties(r, f);
            i = Xm.extractWidth(t);
            let n = Xm.extractShouldJoin(t),
              m = n ? Xm.extractWidth(f) : 0;
            if (
              ((f = t),
              o && this._onA11yChar.fire(Us(r)),
              this._getCurrentLinkId() &&
                this._oscLinkService.addLineToLink(
                  this._getCurrentLinkId(),
                  this._activeBuffer.ybase + this._activeBuffer.y,
                ),
              this._activeBuffer.x + i - m > s)
            ) {
              if (c) {
                let e = d,
                  t = this._activeBuffer.x - m;
                for (
                  this._activeBuffer.x = m,
                    this._activeBuffer.y++,
                    this._activeBuffer.y === this._activeBuffer.scrollBottom + 1
                      ? (this._activeBuffer.y--,
                        this._bufferService.scroll(this._eraseAttrData(), !0))
                      : (this._activeBuffer.y >= this._bufferService.rows &&
                          (this._activeBuffer.y = this._bufferService.rows - 1),
                        (this._activeBuffer.lines.get(
                          this._activeBuffer.ybase + this._activeBuffer.y,
                        ).isWrapped = !0)),
                    d = this._activeBuffer.lines.get(
                      this._activeBuffer.ybase + this._activeBuffer.y,
                    ),
                    m > 0 && d instanceof Tm && d.copyCellsFrom(e, t, 0, m, !1);
                  t < s;
                )
                  e.setCellFromCodepoint(t++, 0, 1, u);
              } else if (((this._activeBuffer.x = s - 1), i === 2)) continue;
            }
            if (n && this._activeBuffer.x) {
              let e = d.getWidth(this._activeBuffer.x - 1) ? 1 : 2;
              d.addCodepointToCell(this._activeBuffer.x - e, r, i);
              for (let e = i - m; --e >= 0; )
                d.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, u);
              continue;
            }
            if (
              (l &&
                (d.insertCells(this._activeBuffer.x, i - m, this._activeBuffer.getNullCell(u)),
                d.getWidth(s - 1) === 2 && d.setCellFromCodepoint(s - 1, 0, 1, u)),
              d.setCellFromCodepoint(this._activeBuffer.x++, r, i, u),
              i > 0)
            )
              for (; --i; ) d.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, u);
          }
          ((this._parser.precedingJoinState = f),
            this._activeBuffer.x < s &&
              n - t > 0 &&
              d.getWidth(this._activeBuffer.x) === 0 &&
              !d.hasContent(this._activeBuffer.x) &&
              d.setCellFromCodepoint(this._activeBuffer.x, 0, 1, u),
            this._dirtyRowTracker.markDirty(this._activeBuffer.y));
        }
        registerCsiHandler(e, t) {
          return e.final === `t` && !e.prefix && !e.intermediates
            ? this._parser.registerCsiHandler(e, (e) =>
                Ol(e.params[0], this._optionsService.rawOptions.windowOptions) ? t(e) : !0,
              )
            : this._parser.registerCsiHandler(e, t);
        }
        registerDcsHandler(e, t) {
          return this._parser.registerDcsHandler(e, new sh(t));
        }
        registerEscHandler(e, t) {
          return this._parser.registerEscHandler(e, t);
        }
        registerOscHandler(e, t) {
          return this._parser.registerOscHandler(e, new rh(t));
        }
        bell() {
          return (this._onRequestBell.fire(), !0);
        }
        lineFeed() {
          return (
            this._dirtyRowTracker.markDirty(this._activeBuffer.y),
            this._optionsService.rawOptions.convertEol && (this._activeBuffer.x = 0),
            this._activeBuffer.y++,
            this._activeBuffer.y === this._activeBuffer.scrollBottom + 1
              ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData()))
              : this._activeBuffer.y >= this._bufferService.rows
                ? (this._activeBuffer.y = this._bufferService.rows - 1)
                : (this._activeBuffer.lines.get(
                    this._activeBuffer.ybase + this._activeBuffer.y,
                  ).isWrapped = !1),
            this._activeBuffer.x >= this._bufferService.cols && this._activeBuffer.x--,
            this._dirtyRowTracker.markDirty(this._activeBuffer.y),
            this._onLineFeed.fire(),
            !0
          );
        }
        carriageReturn() {
          return ((this._activeBuffer.x = 0), !0);
        }
        backspace() {
          if (!this._coreService.decPrivateModes.reverseWraparound)
            return (this._restrictCursor(), this._activeBuffer.x > 0 && this._activeBuffer.x--, !0);
          if ((this._restrictCursor(this._bufferService.cols), this._activeBuffer.x > 0))
            this._activeBuffer.x--;
          else if (
            this._activeBuffer.x === 0 &&
            this._activeBuffer.y > this._activeBuffer.scrollTop &&
            this._activeBuffer.y <= this._activeBuffer.scrollBottom &&
            this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)?.isWrapped
          ) {
            ((this._activeBuffer.lines.get(
              this._activeBuffer.ybase + this._activeBuffer.y,
            ).isWrapped = !1),
              this._activeBuffer.y--,
              (this._activeBuffer.x = this._bufferService.cols - 1));
            let e = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            e.hasWidth(this._activeBuffer.x) &&
              !e.hasContent(this._activeBuffer.x) &&
              this._activeBuffer.x--;
          }
          return (this._restrictCursor(), !0);
        }
        tab() {
          if (this._activeBuffer.x >= this._bufferService.cols) return !0;
          let e = this._activeBuffer.x;
          return (
            (this._activeBuffer.x = this._activeBuffer.nextStop()),
            this._optionsService.rawOptions.screenReaderMode &&
              this._onA11yTab.fire(this._activeBuffer.x - e),
            !0
          );
        }
        shiftOut() {
          return (this._charsetService.setgLevel(1), !0);
        }
        shiftIn() {
          return (this._charsetService.setgLevel(0), !0);
        }
        _restrictCursor(e = this._bufferService.cols - 1) {
          ((this._activeBuffer.x = Math.min(e, Math.max(0, this._activeBuffer.x))),
            (this._activeBuffer.y = this._coreService.decPrivateModes.origin
              ? Math.min(
                  this._activeBuffer.scrollBottom,
                  Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y),
                )
              : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y))),
            this._dirtyRowTracker.markDirty(this._activeBuffer.y));
        }
        _setCursor(e, t) {
          (this._dirtyRowTracker.markDirty(this._activeBuffer.y),
            this._coreService.decPrivateModes.origin
              ? ((this._activeBuffer.x = e),
                (this._activeBuffer.y = this._activeBuffer.scrollTop + t))
              : ((this._activeBuffer.x = e), (this._activeBuffer.y = t)),
            this._restrictCursor(),
            this._dirtyRowTracker.markDirty(this._activeBuffer.y));
        }
        _moveCursor(e, t) {
          (this._restrictCursor(),
            this._setCursor(this._activeBuffer.x + e, this._activeBuffer.y + t));
        }
        cursorUp(e) {
          let t = this._activeBuffer.y - this._activeBuffer.scrollTop;
          return (
            t >= 0
              ? this._moveCursor(0, -Math.min(t, e.params[0] || 1))
              : this._moveCursor(0, -(e.params[0] || 1)),
            !0
          );
        }
        cursorDown(e) {
          let t = this._activeBuffer.scrollBottom - this._activeBuffer.y;
          return (
            t >= 0
              ? this._moveCursor(0, Math.min(t, e.params[0] || 1))
              : this._moveCursor(0, e.params[0] || 1),
            !0
          );
        }
        cursorForward(e) {
          return (this._moveCursor(e.params[0] || 1, 0), !0);
        }
        cursorBackward(e) {
          return (this._moveCursor(-(e.params[0] || 1), 0), !0);
        }
        cursorNextLine(e) {
          return (this.cursorDown(e), (this._activeBuffer.x = 0), !0);
        }
        cursorPrecedingLine(e) {
          return (this.cursorUp(e), (this._activeBuffer.x = 0), !0);
        }
        cursorCharAbsolute(e) {
          return (this._setCursor((e.params[0] || 1) - 1, this._activeBuffer.y), !0);
        }
        cursorPosition(e) {
          return (
            this._setCursor(e.length >= 2 ? (e.params[1] || 1) - 1 : 0, (e.params[0] || 1) - 1), !0
          );
        }
        charPosAbsolute(e) {
          return (this._setCursor((e.params[0] || 1) - 1, this._activeBuffer.y), !0);
        }
        hPositionRelative(e) {
          return (this._moveCursor(e.params[0] || 1, 0), !0);
        }
        linePosAbsolute(e) {
          return (this._setCursor(this._activeBuffer.x, (e.params[0] || 1) - 1), !0);
        }
        vPositionRelative(e) {
          return (this._moveCursor(0, e.params[0] || 1), !0);
        }
        hVPosition(e) {
          return (this.cursorPosition(e), !0);
        }
        tabClear(e) {
          let t = e.params[0];
          return (
            t === 0
              ? delete this._activeBuffer.tabs[this._activeBuffer.x]
              : t === 3 && (this._activeBuffer.tabs = {}),
            !0
          );
        }
        cursorForwardTab(e) {
          if (this._activeBuffer.x >= this._bufferService.cols) return !0;
          let t = e.params[0] || 1;
          for (; t--; ) this._activeBuffer.x = this._activeBuffer.nextStop();
          return !0;
        }
        cursorBackwardTab(e) {
          if (this._activeBuffer.x >= this._bufferService.cols) return !0;
          let t = e.params[0] || 1;
          for (; t--; ) this._activeBuffer.x = this._activeBuffer.prevStop();
          return !0;
        }
        selectProtected(e) {
          let t = e.params[0];
          return (
            t === 1 && (this._curAttrData.bg |= 536870912),
            (t === 2 || t === 0) && (this._curAttrData.bg &= -536870913),
            !0
          );
        }
        _eraseInBufferLine(e, t, n, r = !1, i = !1) {
          let a = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
          (a.replaceCells(t, n, this._activeBuffer.getNullCell(this._eraseAttrData()), i),
            r && (a.isWrapped = !1));
        }
        _resetBufferLine(e, t = !1) {
          let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
          n &&
            (n.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), t),
            this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + e),
            (n.isWrapped = !1));
        }
        eraseInDisplay(e, t = !1) {
          this._restrictCursor(this._bufferService.cols);
          let n;
          switch (e.params[0]) {
            case 0:
              for (
                n = this._activeBuffer.y,
                  this._dirtyRowTracker.markDirty(n),
                  this._eraseInBufferLine(
                    n++,
                    this._activeBuffer.x,
                    this._bufferService.cols,
                    this._activeBuffer.x === 0,
                    t,
                  );
                n < this._bufferService.rows;
                n++
              )
                this._resetBufferLine(n, t);
              this._dirtyRowTracker.markDirty(n);
              break;
            case 1:
              for (
                n = this._activeBuffer.y,
                  this._dirtyRowTracker.markDirty(n),
                  this._eraseInBufferLine(n, 0, this._activeBuffer.x + 1, !0, t),
                  this._activeBuffer.x + 1 >= this._bufferService.cols &&
                    (this._activeBuffer.lines.get(n + 1).isWrapped = !1);
                n--;
              )
                this._resetBufferLine(n, t);
              this._dirtyRowTracker.markDirty(0);
              break;
            case 2:
              if (this._optionsService.rawOptions.scrollOnEraseInDisplay) {
                for (
                  n = this._bufferService.rows, this._dirtyRowTracker.markRangeDirty(0, n - 1);
                  n-- &&
                  !this._activeBuffer.lines.get(this._activeBuffer.ybase + n)?.getTrimmedLength();
                );
                for (; n >= 0; n--) this._bufferService.scroll(this._eraseAttrData());
              } else {
                for (n = this._bufferService.rows, this._dirtyRowTracker.markDirty(n - 1); n--; )
                  this._resetBufferLine(n, t);
                this._dirtyRowTracker.markDirty(0);
              }
              break;
            case 3:
              let e = this._activeBuffer.lines.length - this._bufferService.rows;
              e > 0 &&
                (this._activeBuffer.lines.trimStart(e),
                (this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - e, 0)),
                (this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - e, 0)),
                this._onScroll.fire(0));
              break;
          }
          return !0;
        }
        eraseInLine(e, t = !1) {
          switch ((this._restrictCursor(this._bufferService.cols), e.params[0])) {
            case 0:
              this._eraseInBufferLine(
                this._activeBuffer.y,
                this._activeBuffer.x,
                this._bufferService.cols,
                this._activeBuffer.x === 0,
                t,
              );
              break;
            case 1:
              this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, !1, t);
              break;
            case 2:
              this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, !0, t);
              break;
          }
          return (this._dirtyRowTracker.markDirty(this._activeBuffer.y), !0);
        }
        insertLines(e) {
          this._restrictCursor();
          let t = e.params[0] || 1;
          if (
            this._activeBuffer.y > this._activeBuffer.scrollBottom ||
            this._activeBuffer.y < this._activeBuffer.scrollTop
          )
            return !0;
          let n = this._activeBuffer.ybase + this._activeBuffer.y,
            r = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom,
            i = this._bufferService.rows - 1 + this._activeBuffer.ybase - r + 1;
          for (; t--; )
            (this._activeBuffer.lines.splice(i - 1, 1),
              this._activeBuffer.lines.splice(
                n,
                0,
                this._activeBuffer.getBlankLine(this._eraseAttrData()),
              ));
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.y,
              this._activeBuffer.scrollBottom,
            ),
            (this._activeBuffer.x = 0),
            !0
          );
        }
        deleteLines(e) {
          this._restrictCursor();
          let t = e.params[0] || 1;
          if (
            this._activeBuffer.y > this._activeBuffer.scrollBottom ||
            this._activeBuffer.y < this._activeBuffer.scrollTop
          )
            return !0;
          let n = this._activeBuffer.ybase + this._activeBuffer.y,
            r;
          for (
            r = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom,
              r = this._bufferService.rows - 1 + this._activeBuffer.ybase - r;
            t--;
          )
            (this._activeBuffer.lines.splice(n, 1),
              this._activeBuffer.lines.splice(
                r,
                0,
                this._activeBuffer.getBlankLine(this._eraseAttrData()),
              ));
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.y,
              this._activeBuffer.scrollBottom,
            ),
            (this._activeBuffer.x = 0),
            !0
          );
        }
        insertChars(e) {
          this._restrictCursor();
          let t = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return (
            t &&
              (t.insertCells(
                this._activeBuffer.x,
                e.params[0] || 1,
                this._activeBuffer.getNullCell(this._eraseAttrData()),
              ),
              this._dirtyRowTracker.markDirty(this._activeBuffer.y)),
            !0
          );
        }
        deleteChars(e) {
          this._restrictCursor();
          let t = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return (
            t &&
              (t.deleteCells(
                this._activeBuffer.x,
                e.params[0] || 1,
                this._activeBuffer.getNullCell(this._eraseAttrData()),
              ),
              this._dirtyRowTracker.markDirty(this._activeBuffer.y)),
            !0
          );
        }
        scrollUp(e) {
          let t = e.params[0] || 1;
          for (; t--; )
            (this._activeBuffer.lines.splice(
              this._activeBuffer.ybase + this._activeBuffer.scrollTop,
              1,
            ),
              this._activeBuffer.lines.splice(
                this._activeBuffer.ybase + this._activeBuffer.scrollBottom,
                0,
                this._activeBuffer.getBlankLine(this._eraseAttrData()),
              ));
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.scrollTop,
              this._activeBuffer.scrollBottom,
            ),
            !0
          );
        }
        scrollDown(e) {
          let t = e.params[0] || 1;
          for (; t--; )
            (this._activeBuffer.lines.splice(
              this._activeBuffer.ybase + this._activeBuffer.scrollBottom,
              1,
            ),
              this._activeBuffer.lines.splice(
                this._activeBuffer.ybase + this._activeBuffer.scrollTop,
                0,
                this._activeBuffer.getBlankLine(Sm),
              ));
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.scrollTop,
              this._activeBuffer.scrollBottom,
            ),
            !0
          );
        }
        scrollLeft(e) {
          if (
            this._activeBuffer.y > this._activeBuffer.scrollBottom ||
            this._activeBuffer.y < this._activeBuffer.scrollTop
          )
            return !0;
          let t = e.params[0] || 1;
          for (let e = this._activeBuffer.scrollTop; e <= this._activeBuffer.scrollBottom; ++e) {
            let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
            (n.deleteCells(0, t, this._activeBuffer.getNullCell(this._eraseAttrData())),
              (n.isWrapped = !1));
          }
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.scrollTop,
              this._activeBuffer.scrollBottom,
            ),
            !0
          );
        }
        scrollRight(e) {
          if (
            this._activeBuffer.y > this._activeBuffer.scrollBottom ||
            this._activeBuffer.y < this._activeBuffer.scrollTop
          )
            return !0;
          let t = e.params[0] || 1;
          for (let e = this._activeBuffer.scrollTop; e <= this._activeBuffer.scrollBottom; ++e) {
            let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
            (n.insertCells(0, t, this._activeBuffer.getNullCell(this._eraseAttrData())),
              (n.isWrapped = !1));
          }
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.scrollTop,
              this._activeBuffer.scrollBottom,
            ),
            !0
          );
        }
        insertColumns(e) {
          if (
            this._activeBuffer.y > this._activeBuffer.scrollBottom ||
            this._activeBuffer.y < this._activeBuffer.scrollTop
          )
            return !0;
          let t = e.params[0] || 1;
          for (let e = this._activeBuffer.scrollTop; e <= this._activeBuffer.scrollBottom; ++e) {
            let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
            (n.insertCells(
              this._activeBuffer.x,
              t,
              this._activeBuffer.getNullCell(this._eraseAttrData()),
            ),
              (n.isWrapped = !1));
          }
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.scrollTop,
              this._activeBuffer.scrollBottom,
            ),
            !0
          );
        }
        deleteColumns(e) {
          if (
            this._activeBuffer.y > this._activeBuffer.scrollBottom ||
            this._activeBuffer.y < this._activeBuffer.scrollTop
          )
            return !0;
          let t = e.params[0] || 1;
          for (let e = this._activeBuffer.scrollTop; e <= this._activeBuffer.scrollBottom; ++e) {
            let n = this._activeBuffer.lines.get(this._activeBuffer.ybase + e);
            (n.deleteCells(
              this._activeBuffer.x,
              t,
              this._activeBuffer.getNullCell(this._eraseAttrData()),
            ),
              (n.isWrapped = !1));
          }
          return (
            this._dirtyRowTracker.markRangeDirty(
              this._activeBuffer.scrollTop,
              this._activeBuffer.scrollBottom,
            ),
            !0
          );
        }
        eraseChars(e) {
          this._restrictCursor();
          let t = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return (
            t &&
              (t.replaceCells(
                this._activeBuffer.x,
                this._activeBuffer.x + (e.params[0] || 1),
                this._activeBuffer.getNullCell(this._eraseAttrData()),
              ),
              this._dirtyRowTracker.markDirty(this._activeBuffer.y)),
            !0
          );
        }
        repeatPrecedingCharacter(e) {
          let t = this._parser.precedingJoinState;
          if (!t) return !0;
          let n = e.params[0] || 1,
            r = Xm.extractWidth(t),
            i = this._activeBuffer.x - r,
            a = this._activeBuffer.lines
              .get(this._activeBuffer.ybase + this._activeBuffer.y)
              .getString(i),
            o = new Uint32Array(a.length * n),
            s = 0;
          for (let e = 0; e < a.length; ) {
            let t = a.codePointAt(e) || 0;
            ((o[s++] = t), (e += t > 65535 ? 2 : 1));
          }
          let c = s;
          for (let e = 1; e < n; ++e) (o.copyWithin(c, 0, s), (c += s));
          return (this.print(o, 0, c), !0);
        }
        sendDeviceAttributesPrimary(e) {
          return (
            e.params[0] > 0 ||
              (this._is(`xterm`) || this._is(`rxvt-unicode`) || this._is(`screen`)
                ? this._coreService.triggerDataEvent(q.ESC + `[?1;2c`)
                : this._is(`linux`) && this._coreService.triggerDataEvent(q.ESC + `[?6c`)),
            !0
          );
        }
        sendDeviceAttributesSecondary(e) {
          return (
            e.params[0] > 0 ||
              (this._is(`xterm`)
                ? this._coreService.triggerDataEvent(q.ESC + `[>0;276;0c`)
                : this._is(`rxvt-unicode`)
                  ? this._coreService.triggerDataEvent(q.ESC + `[>85;95;0c`)
                  : this._is(`linux`)
                    ? this._coreService.triggerDataEvent(e.params[0] + `c`)
                    : this._is(`screen`) &&
                      this._coreService.triggerDataEvent(q.ESC + `[>83;40003;0c`)),
            !0
          );
        }
        _is(e) {
          return (this._optionsService.rawOptions.termName + ``).indexOf(e) === 0;
        }
        setMode(e) {
          for (let t = 0; t < e.length; t++)
            switch (e.params[t]) {
              case 4:
                this._coreService.modes.insertMode = !0;
                break;
              case 20:
                this._optionsService.options.convertEol = !0;
                break;
            }
          return !0;
        }
        setModePrivate(e) {
          for (let t = 0; t < e.length; t++)
            switch (e.params[t]) {
              case 1:
                this._coreService.decPrivateModes.applicationCursorKeys = !0;
                break;
              case 2:
                (this._charsetService.setgCharset(0, km),
                  this._charsetService.setgCharset(1, km),
                  this._charsetService.setgCharset(2, km),
                  this._charsetService.setgCharset(3, km));
                break;
              case 3:
                this._optionsService.rawOptions.windowOptions.setWinLines &&
                  (this._bufferService.resize(132, this._bufferService.rows),
                  this._onRequestReset.fire());
                break;
              case 6:
                ((this._coreService.decPrivateModes.origin = !0), this._setCursor(0, 0));
                break;
              case 7:
                this._coreService.decPrivateModes.wraparound = !0;
                break;
              case 12:
                this._optionsService.options.cursorBlink = !0;
                break;
              case 45:
                this._coreService.decPrivateModes.reverseWraparound = !0;
                break;
              case 66:
                (this._logService.debug(`Serial port requested application keypad.`),
                  (this._coreService.decPrivateModes.applicationKeypad = !0),
                  this._onRequestSyncScrollBar.fire());
                break;
              case 9:
                this._coreMouseService.activeProtocol = `X10`;
                break;
              case 1e3:
                this._coreMouseService.activeProtocol = `VT200`;
                break;
              case 1002:
                this._coreMouseService.activeProtocol = `DRAG`;
                break;
              case 1003:
                this._coreMouseService.activeProtocol = `ANY`;
                break;
              case 1004:
                ((this._coreService.decPrivateModes.sendFocus = !0),
                  this._onRequestSendFocus.fire());
                break;
              case 1005:
                this._logService.debug(`DECSET 1005 not supported (see #2507)`);
                break;
              case 1006:
                this._coreMouseService.activeEncoding = `SGR`;
                break;
              case 1015:
                this._logService.debug(`DECSET 1015 not supported (see #2507)`);
                break;
              case 1016:
                this._coreMouseService.activeEncoding = `SGR_PIXELS`;
                break;
              case 25:
                this._coreService.isCursorHidden = !1;
                break;
              case 1048:
                this.saveCursor();
                break;
              case 1049:
                this.saveCursor();
              case 47:
              case 1047:
                (this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()),
                  (this._coreService.isCursorInitialized = !0),
                  this._onRequestRefreshRows.fire(void 0),
                  this._onRequestSyncScrollBar.fire());
                break;
              case 2004:
                this._coreService.decPrivateModes.bracketedPasteMode = !0;
                break;
              case 2026:
                this._coreService.decPrivateModes.synchronizedOutput = !0;
                break;
            }
          return !0;
        }
        resetMode(e) {
          for (let t = 0; t < e.length; t++)
            switch (e.params[t]) {
              case 4:
                this._coreService.modes.insertMode = !1;
                break;
              case 20:
                this._optionsService.options.convertEol = !1;
                break;
            }
          return !0;
        }
        resetModePrivate(e) {
          for (let t = 0; t < e.length; t++)
            switch (e.params[t]) {
              case 1:
                this._coreService.decPrivateModes.applicationCursorKeys = !1;
                break;
              case 3:
                this._optionsService.rawOptions.windowOptions.setWinLines &&
                  (this._bufferService.resize(80, this._bufferService.rows),
                  this._onRequestReset.fire());
                break;
              case 6:
                ((this._coreService.decPrivateModes.origin = !1), this._setCursor(0, 0));
                break;
              case 7:
                this._coreService.decPrivateModes.wraparound = !1;
                break;
              case 12:
                this._optionsService.options.cursorBlink = !1;
                break;
              case 45:
                this._coreService.decPrivateModes.reverseWraparound = !1;
                break;
              case 66:
                (this._logService.debug(`Switching back to normal keypad.`),
                  (this._coreService.decPrivateModes.applicationKeypad = !1),
                  this._onRequestSyncScrollBar.fire());
                break;
              case 9:
              case 1e3:
              case 1002:
              case 1003:
                this._coreMouseService.activeProtocol = `NONE`;
                break;
              case 1004:
                this._coreService.decPrivateModes.sendFocus = !1;
                break;
              case 1005:
                this._logService.debug(`DECRST 1005 not supported (see #2507)`);
                break;
              case 1006:
                this._coreMouseService.activeEncoding = `DEFAULT`;
                break;
              case 1015:
                this._logService.debug(`DECRST 1015 not supported (see #2507)`);
                break;
              case 1016:
                this._coreMouseService.activeEncoding = `DEFAULT`;
                break;
              case 25:
                this._coreService.isCursorHidden = !0;
                break;
              case 1048:
                this.restoreCursor();
                break;
              case 1049:
              case 47:
              case 1047:
                (this._bufferService.buffers.activateNormalBuffer(),
                  e.params[t] === 1049 && this.restoreCursor(),
                  (this._coreService.isCursorInitialized = !0),
                  this._onRequestRefreshRows.fire(void 0),
                  this._onRequestSyncScrollBar.fire());
                break;
              case 2004:
                this._coreService.decPrivateModes.bracketedPasteMode = !1;
                break;
              case 2026:
                ((this._coreService.decPrivateModes.synchronizedOutput = !1),
                  this._onRequestRefreshRows.fire(void 0));
                break;
            }
          return !0;
        }
        requestMode(e, t) {
          let n;
          ((e) => (
            (e[(e.NOT_RECOGNIZED = 0)] = `NOT_RECOGNIZED`),
            (e[(e.SET = 1)] = `SET`),
            (e[(e.RESET = 2)] = `RESET`),
            (e[(e.PERMANENTLY_SET = 3)] = `PERMANENTLY_SET`),
            (e[(e.PERMANENTLY_RESET = 4)] = `PERMANENTLY_RESET`)
          ))((n ||= {}));
          let r = this._coreService.decPrivateModes,
            { activeProtocol: i, activeEncoding: a } = this._coreMouseService,
            o = this._coreService,
            { buffers: s, cols: c } = this._bufferService,
            { active: l, alt: u } = s,
            d = this._optionsService.rawOptions,
            f = (e, n) => (o.triggerDataEvent(`${q.ESC}[${t ? `` : `?`}${e};${n}$y`), !0),
            p = (e) => (e ? 1 : 2),
            m = e.params[0];
          return t
            ? m === 2
              ? f(m, 4)
              : m === 4
                ? f(m, p(o.modes.insertMode))
                : m === 12
                  ? f(m, 3)
                  : m === 20
                    ? f(m, p(d.convertEol))
                    : f(m, 0)
            : m === 1
              ? f(m, p(r.applicationCursorKeys))
              : m === 3
                ? f(m, d.windowOptions.setWinLines ? (c === 80 ? 2 : c === 132 ? 1 : 0) : 0)
                : m === 6
                  ? f(m, p(r.origin))
                  : m === 7
                    ? f(m, p(r.wraparound))
                    : m === 8
                      ? f(m, 3)
                      : m === 9
                        ? f(m, p(i === `X10`))
                        : m === 12
                          ? f(m, p(d.cursorBlink))
                          : m === 25
                            ? f(m, p(!o.isCursorHidden))
                            : m === 45
                              ? f(m, p(r.reverseWraparound))
                              : m === 66
                                ? f(m, p(r.applicationKeypad))
                                : m === 67
                                  ? f(m, 4)
                                  : m === 1e3
                                    ? f(m, p(i === `VT200`))
                                    : m === 1002
                                      ? f(m, p(i === `DRAG`))
                                      : m === 1003
                                        ? f(m, p(i === `ANY`))
                                        : m === 1004
                                          ? f(m, p(r.sendFocus))
                                          : m === 1005
                                            ? f(m, 4)
                                            : m === 1006
                                              ? f(m, p(a === `SGR`))
                                              : m === 1015
                                                ? f(m, 4)
                                                : m === 1016
                                                  ? f(m, p(a === `SGR_PIXELS`))
                                                  : m === 1048
                                                    ? f(m, 1)
                                                    : m === 47 || m === 1047 || m === 1049
                                                      ? f(m, p(l === u))
                                                      : m === 2004
                                                        ? f(m, p(r.bracketedPasteMode))
                                                        : m === 2026
                                                          ? f(m, p(r.synchronizedOutput))
                                                          : f(m, 0);
        }
        _updateAttrColor(e, t, n, r, i) {
          return (
            t === 2
              ? ((e |= 50331648), (e &= -16777216), (e |= Wl.fromColorRGB([n, r, i])))
              : t === 5 && ((e &= -50331904), (e |= 33554432 | (n & 255))),
            e
          );
        }
        _extractColor(e, t, n) {
          let r = [0, 0, -1, 0, 0, 0],
            i = 0,
            a = 0;
          do {
            if (((r[a + i] = e.params[t + a]), e.hasSubParams(t + a))) {
              let n = e.getSubParams(t + a),
                o = 0;
              do (r[1] === 5 && (i = 1), (r[a + o + 1 + i] = n[o]));
              while (++o < n.length && o + a + 1 + i < r.length);
              break;
            }
            if ((r[1] === 5 && a + i >= 2) || (r[1] === 2 && a + i >= 5)) break;
            r[1] && (i = 1);
          } while (++a + t < e.length && a + i < r.length);
          for (let e = 2; e < r.length; ++e) r[e] === -1 && (r[e] = 0);
          switch (r[0]) {
            case 38:
              n.fg = this._updateAttrColor(n.fg, r[1], r[3], r[4], r[5]);
              break;
            case 48:
              n.bg = this._updateAttrColor(n.bg, r[1], r[3], r[4], r[5]);
              break;
            case 58:
              ((n.extended = n.extended.clone()),
                (n.extended.underlineColor = this._updateAttrColor(
                  n.extended.underlineColor,
                  r[1],
                  r[3],
                  r[4],
                  r[5],
                )));
          }
          return a;
        }
        _processUnderline(e, t) {
          ((t.extended = t.extended.clone()),
            (!~e || e > 5) && (e = 1),
            (t.extended.underlineStyle = e),
            (t.fg |= 268435456),
            e === 0 && (t.fg &= -268435457),
            t.updateExtended());
        }
        _processSGR0(e) {
          ((e.fg = Sm.fg),
            (e.bg = Sm.bg),
            (e.extended = e.extended.clone()),
            (e.extended.underlineStyle = 0),
            (e.extended.underlineColor &= -67108864),
            e.updateExtended());
        }
        charAttributes(e) {
          if (e.length === 1 && e.params[0] === 0)
            return (this._processSGR0(this._curAttrData), !0);
          let t = e.length,
            n,
            r = this._curAttrData;
          for (let i = 0; i < t; i++)
            ((n = e.params[i]),
              n >= 30 && n <= 37
                ? ((r.fg &= -50331904), (r.fg |= 16777216 | (n - 30)))
                : n >= 40 && n <= 47
                  ? ((r.bg &= -50331904), (r.bg |= 16777216 | (n - 40)))
                  : n >= 90 && n <= 97
                    ? ((r.fg &= -50331904), (r.fg |= (n - 90) | 16777224))
                    : n >= 100 && n <= 107
                      ? ((r.bg &= -50331904), (r.bg |= (n - 100) | 16777224))
                      : n === 0
                        ? this._processSGR0(r)
                        : n === 1
                          ? (r.fg |= 134217728)
                          : n === 3
                            ? (r.bg |= 67108864)
                            : n === 4
                              ? ((r.fg |= 268435456),
                                this._processUnderline(
                                  e.hasSubParams(i) ? e.getSubParams(i)[0] : 1,
                                  r,
                                ))
                              : n === 5
                                ? (r.fg |= 536870912)
                                : n === 7
                                  ? (r.fg |= 67108864)
                                  : n === 8
                                    ? (r.fg |= 1073741824)
                                    : n === 9
                                      ? (r.fg |= 2147483648)
                                      : n === 2
                                        ? (r.bg |= 134217728)
                                        : n === 21
                                          ? this._processUnderline(2, r)
                                          : n === 22
                                            ? ((r.fg &= -134217729), (r.bg &= -134217729))
                                            : n === 23
                                              ? (r.bg &= -67108865)
                                              : n === 24
                                                ? ((r.fg &= -268435457),
                                                  this._processUnderline(0, r))
                                                : n === 25
                                                  ? (r.fg &= -536870913)
                                                  : n === 27
                                                    ? (r.fg &= -67108865)
                                                    : n === 28
                                                      ? (r.fg &= -1073741825)
                                                      : n === 29
                                                        ? (r.fg &= 2147483647)
                                                        : n === 39
                                                          ? ((r.fg &= -67108864),
                                                            (r.fg |= Sm.fg & 16777215))
                                                          : n === 49
                                                            ? ((r.bg &= -67108864),
                                                              (r.bg |= Sm.bg & 16777215))
                                                            : n === 38 || n === 48 || n === 58
                                                              ? (i += this._extractColor(e, i, r))
                                                              : n === 53
                                                                ? (r.bg |= 1073741824)
                                                                : n === 55
                                                                  ? (r.bg &= -1073741825)
                                                                  : n === 59
                                                                    ? ((r.extended =
                                                                        r.extended.clone()),
                                                                      (r.extended.underlineColor =
                                                                        -1),
                                                                      r.updateExtended())
                                                                    : n === 100
                                                                      ? ((r.fg &= -67108864),
                                                                        (r.fg |= Sm.fg & 16777215),
                                                                        (r.bg &= -67108864),
                                                                        (r.bg |= Sm.bg & 16777215))
                                                                      : this._logService.debug(
                                                                          `Unknown SGR attribute: %d.`,
                                                                          n,
                                                                        ));
          return !0;
        }
        deviceStatus(e) {
          switch (e.params[0]) {
            case 5:
              this._coreService.triggerDataEvent(`${q.ESC}[0n`);
              break;
            case 6:
              let e = this._activeBuffer.y + 1,
                t = this._activeBuffer.x + 1;
              this._coreService.triggerDataEvent(`${q.ESC}[${e};${t}R`);
              break;
          }
          return !0;
        }
        deviceStatusPrivate(e) {
          switch (e.params[0]) {
            case 6:
              let e = this._activeBuffer.y + 1,
                t = this._activeBuffer.x + 1;
              this._coreService.triggerDataEvent(`${q.ESC}[?${e};${t}R`);
              break;
            case 15:
              break;
            case 25:
              break;
            case 26:
              break;
            case 53:
              break;
          }
          return !0;
        }
        softReset(e) {
          return (
            (this._coreService.isCursorHidden = !1),
            this._onRequestSyncScrollBar.fire(),
            (this._activeBuffer.scrollTop = 0),
            (this._activeBuffer.scrollBottom = this._bufferService.rows - 1),
            (this._curAttrData = Sm.clone()),
            this._coreService.reset(),
            this._charsetService.reset(),
            (this._activeBuffer.savedX = 0),
            (this._activeBuffer.savedY = this._activeBuffer.ybase),
            (this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg),
            (this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg),
            (this._activeBuffer.savedCharset = this._charsetService.charset),
            (this._coreService.decPrivateModes.origin = !1),
            !0
          );
        }
        setCursorStyle(e) {
          let t = e.length === 0 ? 1 : e.params[0];
          if (t === 0)
            ((this._coreService.decPrivateModes.cursorStyle = void 0),
              (this._coreService.decPrivateModes.cursorBlink = void 0));
          else {
            switch (t) {
              case 1:
              case 2:
                this._coreService.decPrivateModes.cursorStyle = `block`;
                break;
              case 3:
              case 4:
                this._coreService.decPrivateModes.cursorStyle = `underline`;
                break;
              case 5:
              case 6:
                this._coreService.decPrivateModes.cursorStyle = `bar`;
                break;
            }
            let e = t % 2 == 1;
            this._coreService.decPrivateModes.cursorBlink = e;
          }
          return !0;
        }
        setScrollRegion(e) {
          let t = e.params[0] || 1,
            n;
          return (
            (e.length < 2 || (n = e.params[1]) > this._bufferService.rows || n === 0) &&
              (n = this._bufferService.rows),
            n > t &&
              ((this._activeBuffer.scrollTop = t - 1),
              (this._activeBuffer.scrollBottom = n - 1),
              this._setCursor(0, 0)),
            !0
          );
        }
        windowOptions(e) {
          if (!Ol(e.params[0], this._optionsService.rawOptions.windowOptions)) return !0;
          let t = e.length > 1 ? e.params[1] : 0;
          switch (e.params[0]) {
            case 14:
              t !== 2 && this._onRequestWindowsOptionsReport.fire(0);
              break;
            case 16:
              this._onRequestWindowsOptionsReport.fire(1);
              break;
            case 18:
              this._bufferService &&
                this._coreService.triggerDataEvent(
                  `${q.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`,
                );
              break;
            case 22:
              ((t === 0 || t === 2) &&
                (this._windowTitleStack.push(this._windowTitle),
                this._windowTitleStack.length > gh && this._windowTitleStack.shift()),
                (t === 0 || t === 1) &&
                  (this._iconNameStack.push(this._iconName),
                  this._iconNameStack.length > gh && this._iconNameStack.shift()));
              break;
            case 23:
              ((t === 0 || t === 2) &&
                this._windowTitleStack.length &&
                this.setTitle(this._windowTitleStack.pop()),
                (t === 0 || t === 1) &&
                  this._iconNameStack.length &&
                  this.setIconName(this._iconNameStack.pop()));
              break;
          }
          return !0;
        }
        saveCursor(e) {
          return (
            (this._activeBuffer.savedX = this._activeBuffer.x),
            (this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y),
            (this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg),
            (this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg),
            (this._activeBuffer.savedCharset = this._charsetService.charset),
            !0
          );
        }
        restoreCursor(e) {
          return (
            (this._activeBuffer.x = this._activeBuffer.savedX || 0),
            (this._activeBuffer.y = Math.max(
              this._activeBuffer.savedY - this._activeBuffer.ybase,
              0,
            )),
            (this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg),
            (this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg),
            (this._charsetService.charset = this._savedCharset),
            this._activeBuffer.savedCharset &&
              (this._charsetService.charset = this._activeBuffer.savedCharset),
            this._restrictCursor(),
            !0
          );
        }
        setTitle(e) {
          return ((this._windowTitle = e), this._onTitleChange.fire(e), !0);
        }
        setIconName(e) {
          return ((this._iconName = e), !0);
        }
        setOrReportIndexedColor(e) {
          let t = [],
            n = e.split(`;`);
          for (; n.length > 1; ) {
            let e = n.shift(),
              r = n.shift();
            if (/^\d+$/.exec(e)) {
              let n = parseInt(e);
              if (kl(n))
                if (r === `?`) t.push({ type: 0, index: n });
                else {
                  let e = Tl(r);
                  e && t.push({ type: 1, index: n, color: e });
                }
            }
          }
          return (t.length && this._onColor.fire(t), !0);
        }
        setHyperlink(e) {
          let t = e.indexOf(`;`);
          if (t === -1) return !0;
          let n = e.slice(0, t).trim(),
            r = e.slice(t + 1);
          return r ? this._createHyperlink(n, r) : n.trim() ? !1 : this._finishHyperlink();
        }
        _createHyperlink(e, t) {
          this._getCurrentLinkId() && this._finishHyperlink();
          let n = e.split(`:`),
            r,
            i = n.findIndex((e) => e.startsWith(`id=`));
          return (
            i !== -1 && (r = n[i].slice(3) || void 0),
            (this._curAttrData.extended = this._curAttrData.extended.clone()),
            (this._curAttrData.extended.urlId = this._oscLinkService.registerLink({
              id: r,
              uri: t,
            })),
            this._curAttrData.updateExtended(),
            !0
          );
        }
        _finishHyperlink() {
          return (
            (this._curAttrData.extended = this._curAttrData.extended.clone()),
            (this._curAttrData.extended.urlId = 0),
            this._curAttrData.updateExtended(),
            !0
          );
        }
        _setOrReportSpecialColor(e, t) {
          let n = e.split(`;`);
          for (let e = 0; e < n.length && !(t >= this._specialColors.length); ++e, ++t)
            if (n[e] === `?`) this._onColor.fire([{ type: 0, index: this._specialColors[t] }]);
            else {
              let r = Tl(n[e]);
              r && this._onColor.fire([{ type: 1, index: this._specialColors[t], color: r }]);
            }
          return !0;
        }
        setOrReportFgColor(e) {
          return this._setOrReportSpecialColor(e, 0);
        }
        setOrReportBgColor(e) {
          return this._setOrReportSpecialColor(e, 1);
        }
        setOrReportCursorColor(e) {
          return this._setOrReportSpecialColor(e, 2);
        }
        restoreIndexedColor(e) {
          if (!e) return (this._onColor.fire([{ type: 2 }]), !0);
          let t = [],
            n = e.split(`;`);
          for (let e = 0; e < n.length; ++e)
            if (/^\d+$/.exec(n[e])) {
              let r = parseInt(n[e]);
              kl(r) && t.push({ type: 2, index: r });
            }
          return (t.length && this._onColor.fire(t), !0);
        }
        restoreFgColor(e) {
          return (this._onColor.fire([{ type: 2, index: 256 }]), !0);
        }
        restoreBgColor(e) {
          return (this._onColor.fire([{ type: 2, index: 257 }]), !0);
        }
        restoreCursorColor(e) {
          return (this._onColor.fire([{ type: 2, index: 258 }]), !0);
        }
        nextLine() {
          return ((this._activeBuffer.x = 0), this.index(), !0);
        }
        keypadApplicationMode() {
          return (
            this._logService.debug(`Serial port requested application keypad.`),
            (this._coreService.decPrivateModes.applicationKeypad = !0),
            this._onRequestSyncScrollBar.fire(),
            !0
          );
        }
        keypadNumericMode() {
          return (
            this._logService.debug(`Switching back to normal keypad.`),
            (this._coreService.decPrivateModes.applicationKeypad = !1),
            this._onRequestSyncScrollBar.fire(),
            !0
          );
        }
        selectDefaultCharset() {
          return (this._charsetService.setgLevel(0), this._charsetService.setgCharset(0, km), !0);
        }
        selectCharset(e) {
          return e.length === 2
            ? (e[0] === `/` || this._charsetService.setgCharset(mh[e[0]], Om[e[1]] || km), !0)
            : (this.selectDefaultCharset(), !0);
        }
        index() {
          return (
            this._restrictCursor(),
            this._activeBuffer.y++,
            this._activeBuffer.y === this._activeBuffer.scrollBottom + 1
              ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData()))
              : this._activeBuffer.y >= this._bufferService.rows &&
                (this._activeBuffer.y = this._bufferService.rows - 1),
            this._restrictCursor(),
            !0
          );
        }
        tabSet() {
          return ((this._activeBuffer.tabs[this._activeBuffer.x] = !0), !0);
        }
        reverseIndex() {
          if ((this._restrictCursor(), this._activeBuffer.y === this._activeBuffer.scrollTop)) {
            let e = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
            (this._activeBuffer.lines.shiftElements(
              this._activeBuffer.ybase + this._activeBuffer.y,
              e,
              1,
            ),
              this._activeBuffer.lines.set(
                this._activeBuffer.ybase + this._activeBuffer.y,
                this._activeBuffer.getBlankLine(this._eraseAttrData()),
              ),
              this._dirtyRowTracker.markRangeDirty(
                this._activeBuffer.scrollTop,
                this._activeBuffer.scrollBottom,
              ));
          } else (this._activeBuffer.y--, this._restrictCursor());
          return !0;
        }
        fullReset() {
          return (this._parser.reset(), this._onRequestReset.fire(), !0);
        }
        reset() {
          ((this._curAttrData = Sm.clone()), (this._eraseAttrDataInternal = Sm.clone()));
        }
        _eraseAttrData() {
          return (
            (this._eraseAttrDataInternal.bg &= -67108864),
            (this._eraseAttrDataInternal.bg |= this._curAttrData.bg & 67108863),
            this._eraseAttrDataInternal
          );
        }
        setgLevel(e) {
          return (this._charsetService.setgLevel(e), !0);
        }
        screenAlignmentPattern() {
          let e = new Kl();
          ((e.content = 4194373),
            (e.fg = this._curAttrData.fg),
            (e.bg = this._curAttrData.bg),
            this._setCursor(0, 0));
          for (let t = 0; t < this._bufferService.rows; ++t) {
            let n = this._activeBuffer.ybase + this._activeBuffer.y + t,
              r = this._activeBuffer.lines.get(n);
            r && (r.fill(e), (r.isWrapped = !1));
          }
          return (this._dirtyRowTracker.markAllDirty(), this._setCursor(0, 0), !0);
        }
        requestStatusString(e, t) {
          let n = (e) => (this._coreService.triggerDataEvent(`${q.ESC}${e}${q.ESC}\\`), !0),
            r = this._bufferService.buffer,
            i = this._optionsService.rawOptions;
          return n(
            e === `"q`
              ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q`
              : e === `"p`
                ? `P1$r61;1"p`
                : e === `r`
                  ? `P1$r${r.scrollTop + 1};${r.scrollBottom + 1}r`
                  : e === `m`
                    ? `P1$r0m`
                    : e === ` q`
                      ? `P1$r${{ block: 2, underline: 4, bar: 6 }[i.cursorStyle] - (i.cursorBlink ? 1 : 0)} q`
                      : `P0$r`,
          );
        }
        markRangeDirty(e, t) {
          this._dirtyRowTracker.markRangeDirty(e, t);
        }
      }),
      (bh = class {
        constructor(e) {
          ((this._bufferService = e), this.clearRange());
        }
        clearRange() {
          ((this.start = this._bufferService.buffer.y), (this.end = this._bufferService.buffer.y));
        }
        markDirty(e) {
          e < this.start ? (this.start = e) : e > this.end && (this.end = e);
        }
        markRangeDirty(e, t) {
          (e > t && ((vh = e), (e = t), (t = vh)),
            e < this.start && (this.start = e),
            t > this.end && (this.end = t));
        }
        markAllDirty() {
          this.markRangeDirty(0, this._bufferService.rows - 1);
        }
      }),
      (bh = H([U(0, Xl)], bh)),
      (xh = 5e7),
      (Sh = 12),
      (Ch = 50),
      (wh = class extends W {
        constructor(e) {
          (super(),
            (this._action = e),
            (this._writeBuffer = []),
            (this._callbacks = []),
            (this._pendingData = 0),
            (this._bufferOffset = 0),
            (this._isSyncWriting = !1),
            (this._syncCalls = 0),
            (this._didUserInput = !1),
            (this._onWriteParsed = this._register(new K())),
            (this.onWriteParsed = this._onWriteParsed.event));
        }
        handleUserInput() {
          this._didUserInput = !0;
        }
        writeSync(e, t) {
          if (t !== void 0 && this._syncCalls > t) {
            this._syncCalls = 0;
            return;
          }
          if (
            ((this._pendingData += e.length),
            this._writeBuffer.push(e),
            this._callbacks.push(void 0),
            this._syncCalls++,
            this._isSyncWriting)
          )
            return;
          this._isSyncWriting = !0;
          let n;
          for (; (n = this._writeBuffer.shift()); ) {
            this._action(n);
            let e = this._callbacks.shift();
            e && e();
          }
          ((this._pendingData = 0),
            (this._bufferOffset = 2147483647),
            (this._isSyncWriting = !1),
            (this._syncCalls = 0));
        }
        write(e, t) {
          if (this._pendingData > xh)
            throw Error(`write data discarded, use flow control to avoid losing data`);
          if (!this._writeBuffer.length) {
            if (((this._bufferOffset = 0), this._didUserInput)) {
              ((this._didUserInput = !1),
                (this._pendingData += e.length),
                this._writeBuffer.push(e),
                this._callbacks.push(t),
                this._innerWrite());
              return;
            }
            setTimeout(() => this._innerWrite());
          }
          ((this._pendingData += e.length), this._writeBuffer.push(e), this._callbacks.push(t));
        }
        _innerWrite(e = 0, t = !0) {
          let n = e || performance.now();
          for (; this._writeBuffer.length > this._bufferOffset; ) {
            let e = this._writeBuffer[this._bufferOffset],
              r = this._action(e, t);
            if (r) {
              r.catch(
                (e) => (
                  queueMicrotask(() => {
                    throw e;
                  }),
                  Promise.resolve(!1)
                ),
              ).then((e) =>
                performance.now() - n >= Sh
                  ? setTimeout(() => this._innerWrite(0, e))
                  : this._innerWrite(n, e),
              );
              return;
            }
            let i = this._callbacks[this._bufferOffset];
            if (
              (i && i(),
              this._bufferOffset++,
              (this._pendingData -= e.length),
              performance.now() - n >= Sh)
            )
              break;
          }
          (this._writeBuffer.length > this._bufferOffset
            ? (this._bufferOffset > Ch &&
                ((this._writeBuffer = this._writeBuffer.slice(this._bufferOffset)),
                (this._callbacks = this._callbacks.slice(this._bufferOffset)),
                (this._bufferOffset = 0)),
              setTimeout(() => this._innerWrite()))
            : ((this._writeBuffer.length = 0),
              (this._callbacks.length = 0),
              (this._pendingData = 0),
              (this._bufferOffset = 0)),
            this._onWriteParsed.fire());
        }
      }),
      (Th = class {
        constructor(e) {
          ((this._bufferService = e),
            (this._nextId = 1),
            (this._entriesWithId = new Map()),
            (this._dataByLinkId = new Map()));
        }
        registerLink(e) {
          let t = this._bufferService.buffer;
          if (e.id === void 0) {
            let n = t.addMarker(t.ybase + t.y),
              r = { data: e, id: this._nextId++, lines: [n] };
            return (
              n.onDispose(() => this._removeMarkerFromLink(r, n)),
              this._dataByLinkId.set(r.id, r),
              r.id
            );
          }
          let n = e,
            r = this._getEntryIdKey(n),
            i = this._entriesWithId.get(r);
          if (i) return (this.addLineToLink(i.id, t.ybase + t.y), i.id);
          let a = t.addMarker(t.ybase + t.y),
            o = { id: this._nextId++, key: this._getEntryIdKey(n), data: n, lines: [a] };
          return (
            a.onDispose(() => this._removeMarkerFromLink(o, a)),
            this._entriesWithId.set(o.key, o),
            this._dataByLinkId.set(o.id, o),
            o.id
          );
        }
        addLineToLink(e, t) {
          let n = this._dataByLinkId.get(e);
          if (n && n.lines.every((e) => e.line !== t)) {
            let e = this._bufferService.buffer.addMarker(t);
            (n.lines.push(e), e.onDispose(() => this._removeMarkerFromLink(n, e)));
          }
        }
        getLinkData(e) {
          return this._dataByLinkId.get(e)?.data;
        }
        _getEntryIdKey(e) {
          return `${e.id};;${e.uri}`;
        }
        _removeMarkerFromLink(e, t) {
          let n = e.lines.indexOf(t);
          n !== -1 &&
            (e.lines.splice(n, 1),
            e.lines.length === 0 &&
              (e.data.id !== void 0 && this._entriesWithId.delete(e.key),
              this._dataByLinkId.delete(e.id)));
        }
      }),
      (Th = H([U(0, Xl)], Th)),
      (Eh = !1),
      (Dh = class extends W {
        constructor(e) {
          (super(),
            (this._windowsWrappingHeuristics = this._register(new Mu())),
            (this._onBinary = this._register(new K())),
            (this.onBinary = this._onBinary.event),
            (this._onData = this._register(new K())),
            (this.onData = this._onData.event),
            (this._onLineFeed = this._register(new K())),
            (this.onLineFeed = this._onLineFeed.event),
            (this._onResize = this._register(new K())),
            (this.onResize = this._onResize.event),
            (this._onWriteParsed = this._register(new K())),
            (this.onWriteParsed = this._onWriteParsed.event),
            (this._onScroll = this._register(new K())),
            (this._instantiationService = new _m()),
            (this.optionsService = this._register(new Rm(e))),
            this._instantiationService.setService(nu, this.optionsService),
            (this._bufferService = this._register(this._instantiationService.createInstance(Fm))),
            this._instantiationService.setService(Xl, this._bufferService),
            (this._logService = this._register(this._instantiationService.createInstance(bm))),
            this._instantiationService.setService(tu, this._logService),
            (this.coreService = this._register(this._instantiationService.createInstance(Vm))),
            this._instantiationService.setService(Ql, this.coreService),
            (this.coreMouseService = this._register(this._instantiationService.createInstance(Gm))),
            this._instantiationService.setService(Zl, this.coreMouseService),
            (this.unicodeService = this._register(this._instantiationService.createInstance(Xm))),
            this._instantiationService.setService(iu, this.unicodeService),
            (this._charsetService = this._instantiationService.createInstance(Zm)),
            this._instantiationService.setService($l, this._charsetService),
            (this._oscLinkService = this._instantiationService.createInstance(Th)),
            this._instantiationService.setService(ru, this._oscLinkService),
            (this._inputHandler = this._register(
              new yh(
                this._bufferService,
                this._charsetService,
                this.coreService,
                this._logService,
                this.optionsService,
                this._oscLinkService,
                this.coreMouseService,
                this.unicodeService,
              ),
            )),
            this._register(Vu.forward(this._inputHandler.onLineFeed, this._onLineFeed)),
            this._register(this._inputHandler),
            this._register(Vu.forward(this._bufferService.onResize, this._onResize)),
            this._register(Vu.forward(this.coreService.onData, this._onData)),
            this._register(Vu.forward(this.coreService.onBinary, this._onBinary)),
            this._register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom(!0))),
            this._register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput())),
            this._register(
              this.optionsService.onMultipleOptionChange([`windowsMode`, `windowsPty`], () =>
                this._handleWindowsPtyOptionChange(),
              ),
            ),
            this._register(
              this._bufferService.onScroll(() => {
                (this._onScroll.fire({ position: this._bufferService.buffer.ydisp }),
                  this._inputHandler.markRangeDirty(
                    this._bufferService.buffer.scrollTop,
                    this._bufferService.buffer.scrollBottom,
                  ));
              }),
            ),
            (this._writeBuffer = this._register(new wh((e, t) => this._inputHandler.parse(e, t)))),
            this._register(Vu.forward(this._writeBuffer.onWriteParsed, this._onWriteParsed)));
        }
        get onScroll() {
          return (
            this._onScrollApi ||
              ((this._onScrollApi = this._register(new K())),
              this._onScroll.event((e) => {
                this._onScrollApi?.fire(e.position);
              })),
            this._onScrollApi.event
          );
        }
        get cols() {
          return this._bufferService.cols;
        }
        get rows() {
          return this._bufferService.rows;
        }
        get buffers() {
          return this._bufferService.buffers;
        }
        get options() {
          return this.optionsService.options;
        }
        set options(e) {
          for (let t in e) this.optionsService.options[t] = e[t];
        }
        write(e, t) {
          this._writeBuffer.write(e, t);
        }
        writeSync(e, t) {
          (this._logService.logLevel <= 3 &&
            !Eh &&
            (this._logService.warn(`writeSync is unreliable and will be removed soon.`), (Eh = !0)),
            this._writeBuffer.writeSync(e, t));
        }
        input(e, t = !0) {
          this.coreService.triggerDataEvent(e, t);
        }
        resize(e, t) {
          isNaN(e) ||
            isNaN(t) ||
            ((e = Math.max(e, Nm)), (t = Math.max(t, Pm)), this._bufferService.resize(e, t));
        }
        scroll(e, t = !1) {
          this._bufferService.scroll(e, t);
        }
        scrollLines(e, t) {
          this._bufferService.scrollLines(e, t);
        }
        scrollPages(e) {
          this.scrollLines(e * (this.rows - 1));
        }
        scrollToTop() {
          this.scrollLines(-this._bufferService.buffer.ydisp);
        }
        scrollToBottom(e) {
          this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
        }
        scrollToLine(e) {
          let t = e - this._bufferService.buffer.ydisp;
          t !== 0 && this.scrollLines(t);
        }
        registerEscHandler(e, t) {
          return this._inputHandler.registerEscHandler(e, t);
        }
        registerDcsHandler(e, t) {
          return this._inputHandler.registerDcsHandler(e, t);
        }
        registerCsiHandler(e, t) {
          return this._inputHandler.registerCsiHandler(e, t);
        }
        registerOscHandler(e, t) {
          return this._inputHandler.registerOscHandler(e, t);
        }
        _setup() {
          this._handleWindowsPtyOptionChange();
        }
        reset() {
          (this._inputHandler.reset(),
            this._bufferService.reset(),
            this._charsetService.reset(),
            this.coreService.reset(),
            this.coreMouseService.reset());
        }
        _handleWindowsPtyOptionChange() {
          let e = !1,
            t = this.optionsService.rawOptions.windowsPty;
          (t && t.buildNumber !== void 0 && t.buildNumber !== void 0
            ? (e = t.backend === `conpty` && t.buildNumber < 21376)
            : this.optionsService.rawOptions.windowsMode && (e = !0),
            e ? this._enableWindowsWrappingHeuristics() : this._windowsWrappingHeuristics.clear());
        }
        _enableWindowsWrappingHeuristics() {
          if (!this._windowsWrappingHeuristics.value) {
            let e = [];
            (e.push(this.onLineFeed(wl.bind(null, this._bufferService))),
              e.push(this.registerCsiHandler({ final: `H` }, () => (wl(this._bufferService), !1))),
              (this._windowsWrappingHeuristics.value = z(() => {
                for (let t of e) t.dispose();
              })));
          }
        }
      }),
      (Oh = {
        48: [`0`, `)`],
        49: [`1`, `!`],
        50: [`2`, `@`],
        51: [`3`, `#`],
        52: [`4`, `$`],
        53: [`5`, `%`],
        54: [`6`, `^`],
        55: [`7`, `&`],
        56: [`8`, `*`],
        57: [`9`, `(`],
        186: [`;`, `:`],
        187: [`=`, `+`],
        188: [`,`, `<`],
        189: [`-`, `_`],
        190: [`.`, `>`],
        191: [`/`, `?`],
        192: ["`", `~`],
        219: [`[`, `{`],
        220: [`\\`, `|`],
        221: [`]`, `}`],
        222: [`'`, `"`],
      }),
      (Q = 0),
      (kh = class {
        constructor(e) {
          ((this._getKey = e),
            (this._array = []),
            (this._insertedValues = []),
            (this._flushInsertedTask = new Yp()),
            (this._isFlushingInserted = !1),
            (this._deletedIndices = []),
            (this._flushDeletedTask = new Yp()),
            (this._isFlushingDeleted = !1));
        }
        clear() {
          ((this._array.length = 0),
            (this._insertedValues.length = 0),
            this._flushInsertedTask.clear(),
            (this._isFlushingInserted = !1),
            (this._deletedIndices.length = 0),
            this._flushDeletedTask.clear(),
            (this._isFlushingDeleted = !1));
        }
        insert(e) {
          (this._flushCleanupDeleted(),
            this._insertedValues.length === 0 &&
              this._flushInsertedTask.enqueue(() => this._flushInserted()),
            this._insertedValues.push(e));
        }
        _flushInserted() {
          let e = this._insertedValues.sort((e, t) => this._getKey(e) - this._getKey(t)),
            t = 0,
            n = 0,
            r = Array(this._array.length + this._insertedValues.length);
          for (let i = 0; i < r.length; i++)
            n >= this._array.length || this._getKey(e[t]) <= this._getKey(this._array[n])
              ? ((r[i] = e[t]), t++)
              : (r[i] = this._array[n++]);
          ((this._array = r), (this._insertedValues.length = 0));
        }
        _flushCleanupInserted() {
          !this._isFlushingInserted &&
            this._insertedValues.length > 0 &&
            this._flushInsertedTask.flush();
        }
        delete(e) {
          if ((this._flushCleanupInserted(), this._array.length === 0)) return !1;
          let t = this._getKey(e);
          if (
            t === void 0 ||
            ((Q = this._search(t)), Q === -1) ||
            this._getKey(this._array[Q]) !== t
          )
            return !1;
          do
            if (this._array[Q] === e)
              return (
                this._deletedIndices.length === 0 &&
                  this._flushDeletedTask.enqueue(() => this._flushDeleted()),
                this._deletedIndices.push(Q),
                !0
              );
          while (++Q < this._array.length && this._getKey(this._array[Q]) === t);
          return !1;
        }
        _flushDeleted() {
          this._isFlushingDeleted = !0;
          let e = this._deletedIndices.sort((e, t) => e - t),
            t = 0,
            n = Array(this._array.length - e.length),
            r = 0;
          for (let i = 0; i < this._array.length; i++) e[t] === i ? t++ : (n[r++] = this._array[i]);
          ((this._array = n), (this._deletedIndices.length = 0), (this._isFlushingDeleted = !1));
        }
        _flushCleanupDeleted() {
          !this._isFlushingDeleted &&
            this._deletedIndices.length > 0 &&
            this._flushDeletedTask.flush();
        }
        *getKeyIterator(e) {
          if (
            (this._flushCleanupInserted(),
            this._flushCleanupDeleted(),
            this._array.length !== 0 &&
              ((Q = this._search(e)),
              !(Q < 0 || Q >= this._array.length) && this._getKey(this._array[Q]) === e))
          )
            do yield this._array[Q];
            while (++Q < this._array.length && this._getKey(this._array[Q]) === e);
        }
        forEachByKey(e, t) {
          if (
            (this._flushCleanupInserted(),
            this._flushCleanupDeleted(),
            this._array.length !== 0 &&
              ((Q = this._search(e)),
              !(Q < 0 || Q >= this._array.length) && this._getKey(this._array[Q]) === e))
          )
            do t(this._array[Q]);
            while (++Q < this._array.length && this._getKey(this._array[Q]) === e);
        }
        values() {
          return (
            this._flushCleanupInserted(), this._flushCleanupDeleted(), [...this._array].values()
          );
        }
        _search(e) {
          let t = 0,
            n = this._array.length - 1;
          for (; n >= t; ) {
            let r = (t + n) >> 1,
              i = this._getKey(this._array[r]);
            if (i > e) n = r - 1;
            else if (i < e) t = r + 1;
            else {
              for (; r > 0 && this._getKey(this._array[r - 1]) === e; ) r--;
              return r;
            }
          }
          return t;
        }
      }),
      (Ah = 0),
      (jh = 0),
      (Mh = class extends W {
        constructor() {
          (super(),
            (this._decorations = new kh((e) => e?.marker.line)),
            (this._onDecorationRegistered = this._register(new K())),
            (this.onDecorationRegistered = this._onDecorationRegistered.event),
            (this._onDecorationRemoved = this._register(new K())),
            (this.onDecorationRemoved = this._onDecorationRemoved.event),
            this._register(z(() => this.reset())));
        }
        get decorations() {
          return this._decorations.values();
        }
        registerDecoration(e) {
          if (e.marker.isDisposed) return;
          let t = new Nh(e);
          if (t) {
            let e = t.marker.onDispose(() => t.dispose()),
              n = t.onDispose(() => {
                (n.dispose(),
                  t &&
                    (this._decorations.delete(t) && this._onDecorationRemoved.fire(t),
                    e.dispose()));
              });
            (this._decorations.insert(t), this._onDecorationRegistered.fire(t));
          }
          return t;
        }
        reset() {
          for (let e of this._decorations.values()) e.dispose();
          this._decorations.clear();
        }
        *getDecorationsAtCell(e, t, n) {
          let r = 0,
            i = 0;
          for (let a of this._decorations.getKeyIterator(t))
            ((r = a.options.x ?? 0),
              (i = r + (a.options.width ?? 1)),
              e >= r && e < i && (!n || (a.options.layer ?? `bottom`) === n) && (yield a));
        }
        forEachDecorationAtCell(e, t, n, r) {
          this._decorations.forEachByKey(t, (t) => {
            ((Ah = t.options.x ?? 0),
              (jh = Ah + (t.options.width ?? 1)),
              e >= Ah && e < jh && (!n || (t.options.layer ?? `bottom`) === n) && r(t));
          });
        }
      }),
      (Nh = class extends ju {
        constructor(e) {
          (super(),
            (this.options = e),
            (this.onRenderEmitter = this.add(new K())),
            (this.onRender = this.onRenderEmitter.event),
            (this._onDispose = this.add(new K())),
            (this.onDispose = this._onDispose.event),
            (this._cachedBg = null),
            (this._cachedFg = null),
            (this.marker = e.marker),
            this.options.overviewRulerOptions &&
              !this.options.overviewRulerOptions.position &&
              (this.options.overviewRulerOptions.position = `full`));
        }
        get backgroundColorRGB() {
          return (
            this._cachedBg === null &&
              (this.options.backgroundColor
                ? (this._cachedBg = X.toColor(this.options.backgroundColor))
                : (this._cachedBg = void 0)),
            this._cachedBg
          );
        }
        get foregroundColorRGB() {
          return (
            this._cachedFg === null &&
              (this.options.foregroundColor
                ? (this._cachedFg = X.toColor(this.options.foregroundColor))
                : (this._cachedFg = void 0)),
            this._cachedFg
          );
        }
        dispose() {
          (this._onDispose.fire(), super.dispose());
        }
      }),
      (Ph = 1e3),
      (Fh = class {
        constructor(e, t = Ph) {
          ((this._renderCallback = e),
            (this._debounceThresholdMS = t),
            (this._lastRefreshMs = 0),
            (this._additionalRefreshRequested = !1));
        }
        dispose() {
          this._refreshTimeoutID && clearTimeout(this._refreshTimeoutID);
        }
        refresh(e, t, n) {
          ((this._rowCount = n),
            (e = e === void 0 ? 0 : e),
            (t = t === void 0 ? this._rowCount - 1 : t),
            (this._rowStart = this._rowStart === void 0 ? e : Math.min(this._rowStart, e)),
            (this._rowEnd = this._rowEnd === void 0 ? t : Math.max(this._rowEnd, t)));
          let r = performance.now();
          if (r - this._lastRefreshMs >= this._debounceThresholdMS)
            ((this._lastRefreshMs = r), this._innerRefresh());
          else if (!this._additionalRefreshRequested) {
            let e = r - this._lastRefreshMs,
              t = this._debounceThresholdMS - e;
            ((this._additionalRefreshRequested = !0),
              (this._refreshTimeoutID = window.setTimeout(() => {
                ((this._lastRefreshMs = performance.now()),
                  this._innerRefresh(),
                  (this._additionalRefreshRequested = !1),
                  (this._refreshTimeoutID = void 0));
              }, t)));
          }
        }
        _innerRefresh() {
          if (this._rowStart === void 0 || this._rowEnd === void 0 || this._rowCount === void 0)
            return;
          let e = Math.max(this._rowStart, 0),
            t = Math.min(this._rowEnd, this._rowCount - 1);
          ((this._rowStart = void 0), (this._rowEnd = void 0), this._renderCallback(e, t));
        }
      }),
      (Ih = 20),
      (Lh = !1),
      (Rh = class extends W {
        constructor(e, t, n, r) {
          (super(),
            (this._terminal = e),
            (this._coreBrowserService = n),
            (this._renderService = r),
            (this._rowColumns = new WeakMap()),
            (this._liveRegionLineCount = 0),
            (this._charsToConsume = []),
            (this._charsToAnnounce = ``));
          let i = this._coreBrowserService.mainDocument;
          ((this._accessibilityContainer = i.createElement(`div`)),
            this._accessibilityContainer.classList.add(`xterm-accessibility`),
            (this._rowContainer = i.createElement(`div`)),
            this._rowContainer.setAttribute(`role`, `list`),
            this._rowContainer.classList.add(`xterm-accessibility-tree`),
            (this._rowElements = []));
          for (let e = 0; e < this._terminal.rows; e++)
            ((this._rowElements[e] = this._createAccessibilityTreeNode()),
              this._rowContainer.appendChild(this._rowElements[e]));
          if (
            ((this._topBoundaryFocusListener = (e) => this._handleBoundaryFocus(e, 0)),
            (this._bottomBoundaryFocusListener = (e) => this._handleBoundaryFocus(e, 1)),
            this._rowElements[0].addEventListener(`focus`, this._topBoundaryFocusListener),
            this._rowElements[this._rowElements.length - 1].addEventListener(
              `focus`,
              this._bottomBoundaryFocusListener,
            ),
            this._accessibilityContainer.appendChild(this._rowContainer),
            (this._liveRegion = i.createElement(`div`)),
            this._liveRegion.classList.add(`live-region`),
            this._liveRegion.setAttribute(`aria-live`, `assertive`),
            this._accessibilityContainer.appendChild(this._liveRegion),
            (this._liveRegionDebouncer = this._register(new Fh(this._renderRows.bind(this)))),
            !this._terminal.element)
          )
            throw Error(`Cannot enable accessibility before Terminal.open`);
          (Lh
            ? (this._accessibilityContainer.classList.add(`debug`),
              this._rowContainer.classList.add(`debug`),
              (this._debugRootContainer = i.createElement(`div`)),
              this._debugRootContainer.classList.add(`xterm`),
              this._debugRootContainer.appendChild(i.createTextNode(`------start a11y------`)),
              this._debugRootContainer.appendChild(this._accessibilityContainer),
              this._debugRootContainer.appendChild(i.createTextNode(`------end a11y------`)),
              this._terminal.element.insertAdjacentElement(`afterend`, this._debugRootContainer))
            : this._terminal.element.insertAdjacentElement(
                `afterbegin`,
                this._accessibilityContainer,
              ),
            this._register(this._terminal.onResize((e) => this._handleResize(e.rows))),
            this._register(this._terminal.onRender((e) => this._refreshRows(e.start, e.end))),
            this._register(this._terminal.onScroll(() => this._refreshRows())),
            this._register(this._terminal.onA11yChar((e) => this._handleChar(e))),
            this._register(
              this._terminal.onLineFeed(() =>
                this._handleChar(`
`),
              ),
            ),
            this._register(this._terminal.onA11yTab((e) => this._handleTab(e))),
            this._register(this._terminal.onKey((e) => this._handleKey(e.key))),
            this._register(this._terminal.onBlur(() => this._clearLiveRegion())),
            this._register(
              this._renderService.onDimensionsChange(() => this._refreshRowsDimensions()),
            ),
            this._register(B(i, `selectionchange`, () => this._handleSelectionChange())),
            this._register(
              this._coreBrowserService.onDprChange(() => this._refreshRowsDimensions()),
            ),
            this._refreshRowsDimensions(),
            this._refreshRows(),
            this._register(
              z(() => {
                (Lh ? this._debugRootContainer.remove() : this._accessibilityContainer.remove(),
                  (this._rowElements.length = 0));
              }),
            ));
        }
        _handleTab(e) {
          for (let t = 0; t < e; t++) this._handleChar(` `);
        }
        _handleChar(e) {
          this._liveRegionLineCount < Ih + 1 &&
            (this._charsToConsume.length > 0
              ? this._charsToConsume.shift() !== e && (this._charsToAnnounce += e)
              : (this._charsToAnnounce += e),
            e ===
              `
` &&
              (this._liveRegionLineCount++,
              this._liveRegionLineCount === Ih + 1 && (this._liveRegion.textContent += zl.get())));
        }
        _clearLiveRegion() {
          ((this._liveRegion.textContent = ``), (this._liveRegionLineCount = 0));
        }
        _handleKey(e) {
          (this._clearLiveRegion(), /\p{Control}/u.test(e) || this._charsToConsume.push(e));
        }
        _refreshRows(e, t) {
          this._liveRegionDebouncer.refresh(e, t, this._terminal.rows);
        }
        _renderRows(e, t) {
          let n = this._terminal.buffer,
            r = n.lines.length.toString();
          for (let i = e; i <= t; i++) {
            let e = n.lines.get(n.ydisp + i),
              t = [],
              a = e?.translateToString(!0, void 0, void 0, t) || ``,
              o = (n.ydisp + i + 1).toString(),
              s = this._rowElements[i];
            s &&
              (a.length === 0
                ? ((s.textContent = `\xA0`), this._rowColumns.set(s, [0, 1]))
                : ((s.textContent = a), this._rowColumns.set(s, t)),
              s.setAttribute(`aria-posinset`, o),
              s.setAttribute(`aria-setsize`, r),
              this._alignRowWidth(s));
          }
          this._announceCharacters();
        }
        _announceCharacters() {
          this._charsToAnnounce.length !== 0 &&
            ((this._liveRegion.textContent += this._charsToAnnounce), (this._charsToAnnounce = ``));
        }
        _handleBoundaryFocus(e, t) {
          let n = e.target,
            r = this._rowElements[t === 0 ? 1 : this._rowElements.length - 2];
          if (
            n.getAttribute(`aria-posinset`) ===
              (t === 0 ? `1` : `${this._terminal.buffer.lines.length}`) ||
            e.relatedTarget !== r
          )
            return;
          let i, a;
          if (
            (t === 0
              ? ((i = n), (a = this._rowElements.pop()), this._rowContainer.removeChild(a))
              : ((i = this._rowElements.shift()), (a = n), this._rowContainer.removeChild(i)),
            i.removeEventListener(`focus`, this._topBoundaryFocusListener),
            a.removeEventListener(`focus`, this._bottomBoundaryFocusListener),
            t === 0)
          ) {
            let e = this._createAccessibilityTreeNode();
            (this._rowElements.unshift(e),
              this._rowContainer.insertAdjacentElement(`afterbegin`, e));
          } else {
            let e = this._createAccessibilityTreeNode();
            (this._rowElements.push(e), this._rowContainer.appendChild(e));
          }
          (this._rowElements[0].addEventListener(`focus`, this._topBoundaryFocusListener),
            this._rowElements[this._rowElements.length - 1].addEventListener(
              `focus`,
              this._bottomBoundaryFocusListener,
            ),
            this._terminal.scrollLines(t === 0 ? -1 : 1),
            this._rowElements[t === 0 ? 1 : this._rowElements.length - 2].focus(),
            e.preventDefault(),
            e.stopImmediatePropagation());
        }
        _handleSelectionChange() {
          if (this._rowElements.length === 0) return;
          let e = this._coreBrowserService.mainDocument.getSelection();
          if (!e) return;
          if (e.isCollapsed) {
            this._rowContainer.contains(e.anchorNode) && this._terminal.clearSelection();
            return;
          }
          if (!e.anchorNode || !e.focusNode) {
            console.error(`anchorNode and/or focusNode are null`);
            return;
          }
          let t = { node: e.anchorNode, offset: e.anchorOffset },
            n = { node: e.focusNode, offset: e.focusOffset };
          if (
            ((t.node.compareDocumentPosition(n.node) & Node.DOCUMENT_POSITION_PRECEDING ||
              (t.node === n.node && t.offset > n.offset)) &&
              ([t, n] = [n, t]),
            t.node.compareDocumentPosition(this._rowElements[0]) &
              (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING) &&
              (t = { node: this._rowElements[0].childNodes[0], offset: 0 }),
            !this._rowContainer.contains(t.node))
          )
            return;
          let r = this._rowElements.slice(-1)[0];
          if (
            (n.node.compareDocumentPosition(r) &
              (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_PRECEDING) &&
              (n = { node: r, offset: r.textContent?.length ?? 0 }),
            !this._rowContainer.contains(n.node))
          )
            return;
          let i = ({ node: e, offset: t }) => {
              let n = e instanceof Text ? e.parentNode : e,
                r = parseInt(n?.getAttribute(`aria-posinset`), 10) - 1;
              if (isNaN(r)) return (console.warn(`row is invalid. Race condition?`), null);
              let i = this._rowColumns.get(n);
              if (!i) return (console.warn(`columns is null. Race condition?`), null);
              let a = t < i.length ? i[t] : i.slice(-1)[0] + 1;
              return (a >= this._terminal.cols && (++r, (a = 0)), { row: r, column: a });
            },
            a = i(t),
            o = i(n);
          if (!(!a || !o)) {
            if (a.row > o.row || (a.row === o.row && a.column >= o.column))
              throw Error(`invalid range`);
            this._terminal.select(
              a.column,
              a.row,
              (o.row - a.row) * this._terminal.cols - a.column + o.column,
            );
          }
        }
        _handleResize(e) {
          this._rowElements[this._rowElements.length - 1].removeEventListener(
            `focus`,
            this._bottomBoundaryFocusListener,
          );
          for (let e = this._rowContainer.children.length; e < this._terminal.rows; e++)
            ((this._rowElements[e] = this._createAccessibilityTreeNode()),
              this._rowContainer.appendChild(this._rowElements[e]));
          for (; this._rowElements.length > e; )
            this._rowContainer.removeChild(this._rowElements.pop());
          (this._rowElements[this._rowElements.length - 1].addEventListener(
            `focus`,
            this._bottomBoundaryFocusListener,
          ),
            this._refreshRowsDimensions());
        }
        _createAccessibilityTreeNode() {
          let e = this._coreBrowserService.mainDocument.createElement(`div`);
          return (
            e.setAttribute(`role`, `listitem`), (e.tabIndex = -1), this._refreshRowDimensions(e), e
          );
        }
        _refreshRowsDimensions() {
          if (this._renderService.dimensions.css.cell.height) {
            (Object.assign(this._accessibilityContainer.style, {
              width: `${this._renderService.dimensions.css.canvas.width}px`,
              fontSize: `${this._terminal.options.fontSize}px`,
            }),
              this._rowElements.length !== this._terminal.rows &&
                this._handleResize(this._terminal.rows));
            for (let e = 0; e < this._terminal.rows; e++)
              (this._refreshRowDimensions(this._rowElements[e]),
                this._alignRowWidth(this._rowElements[e]));
          }
        }
        _refreshRowDimensions(e) {
          e.style.height = `${this._renderService.dimensions.css.cell.height}px`;
        }
        _alignRowWidth(e) {
          e.style.transform = ``;
          let t = e.getBoundingClientRect().width,
            n = this._rowColumns.get(e)?.slice(-1)?.[0];
          if (!n) return;
          let r = n * this._renderService.dimensions.css.cell.width;
          e.style.transform = `scaleX(${r / t})`;
        }
      }),
      (Rh = H([U(1, eu), U(2, cu), U(3, uu)], Rh)),
      (zh = class extends W {
        constructor(e, t, n, r, i) {
          (super(),
            (this._element = e),
            (this._mouseService = t),
            (this._renderService = n),
            (this._bufferService = r),
            (this._linkProviderService = i),
            (this._linkCacheDisposables = []),
            (this._isMouseOut = !0),
            (this._wasResized = !1),
            (this._activeLine = -1),
            (this._onShowLinkUnderline = this._register(new K())),
            (this.onShowLinkUnderline = this._onShowLinkUnderline.event),
            (this._onHideLinkUnderline = this._register(new K())),
            (this.onHideLinkUnderline = this._onHideLinkUnderline.event),
            this._register(
              z(() => {
                (lc(this._linkCacheDisposables),
                  (this._linkCacheDisposables.length = 0),
                  (this._lastMouseEvent = void 0),
                  this._activeProviderReplies?.clear());
              }),
            ),
            this._register(
              this._bufferService.onResize(() => {
                (this._clearCurrentLink(), (this._wasResized = !0));
              }),
            ),
            this._register(
              B(this._element, `mouseleave`, () => {
                ((this._isMouseOut = !0), this._clearCurrentLink());
              }),
            ),
            this._register(B(this._element, `mousemove`, this._handleMouseMove.bind(this))),
            this._register(B(this._element, `mousedown`, this._handleMouseDown.bind(this))),
            this._register(B(this._element, `mouseup`, this._handleMouseUp.bind(this))));
        }
        get currentLink() {
          return this._currentLink;
        }
        _handleMouseMove(e) {
          this._lastMouseEvent = e;
          let t = this._positionFromMouseEvent(e, this._element, this._mouseService);
          if (!t) return;
          this._isMouseOut = !1;
          let n = e.composedPath();
          for (let e = 0; e < n.length; e++) {
            let t = n[e];
            if (t.classList.contains(`xterm`)) break;
            if (t.classList.contains(`xterm-hover`)) return;
          }
          (!this._lastBufferCell ||
            t.x !== this._lastBufferCell.x ||
            t.y !== this._lastBufferCell.y) &&
            (this._handleHover(t), (this._lastBufferCell = t));
        }
        _handleHover(e) {
          if (this._activeLine !== e.y || this._wasResized) {
            (this._clearCurrentLink(), this._askForLink(e, !1), (this._wasResized = !1));
            return;
          }
          (this._currentLink && this._linkAtPosition(this._currentLink.link, e)) ||
            (this._clearCurrentLink(), this._askForLink(e, !0));
        }
        _askForLink(e, t) {
          (!this._activeProviderReplies || !t) &&
            (this._activeProviderReplies?.forEach((e) => {
              e?.forEach((e) => {
                e.link.dispose && e.link.dispose();
              });
            }),
            (this._activeProviderReplies = new Map()),
            (this._activeLine = e.y));
          let n = !1;
          for (let [r, i] of this._linkProviderService.linkProviders.entries())
            t
              ? this._activeProviderReplies?.get(r) && (n = this._checkLinkProviderResult(r, e, n))
              : i.provideLinks(e.y, (t) => {
                  if (this._isMouseOut) return;
                  let i = t?.map((e) => ({ link: e }));
                  (this._activeProviderReplies?.set(r, i),
                    (n = this._checkLinkProviderResult(r, e, n)),
                    this._activeProviderReplies?.size ===
                      this._linkProviderService.linkProviders.length &&
                      this._removeIntersectingLinks(e.y, this._activeProviderReplies));
                });
        }
        _removeIntersectingLinks(e, t) {
          let n = new Set();
          for (let r = 0; r < t.size; r++) {
            let i = t.get(r);
            if (i)
              for (let t = 0; t < i.length; t++) {
                let r = i[t],
                  a = r.link.range.start.y < e ? 0 : r.link.range.start.x,
                  o = r.link.range.end.y > e ? this._bufferService.cols : r.link.range.end.x;
                for (let e = a; e <= o; e++) {
                  if (n.has(e)) {
                    i.splice(t--, 1);
                    break;
                  }
                  n.add(e);
                }
              }
          }
        }
        _checkLinkProviderResult(e, t, n) {
          if (!this._activeProviderReplies) return n;
          let r = this._activeProviderReplies.get(e),
            i = !1;
          for (let t = 0; t < e; t++)
            (!this._activeProviderReplies.has(t) || this._activeProviderReplies.get(t)) && (i = !0);
          if (!i && r) {
            let e = r.find((e) => this._linkAtPosition(e.link, t));
            e && ((n = !0), this._handleNewLink(e));
          }
          if (
            this._activeProviderReplies.size === this._linkProviderService.linkProviders.length &&
            !n
          )
            for (let e = 0; e < this._activeProviderReplies.size; e++) {
              let r = this._activeProviderReplies
                .get(e)
                ?.find((e) => this._linkAtPosition(e.link, t));
              if (r) {
                ((n = !0), this._handleNewLink(r));
                break;
              }
            }
          return n;
        }
        _handleMouseDown() {
          this._mouseDownLink = this._currentLink;
        }
        _handleMouseUp(e) {
          if (!this._currentLink) return;
          let t = this._positionFromMouseEvent(e, this._element, this._mouseService);
          t &&
            this._mouseDownLink &&
            jl(this._mouseDownLink.link, this._currentLink.link) &&
            this._linkAtPosition(this._currentLink.link, t) &&
            this._currentLink.link.activate(e, this._currentLink.link.text);
        }
        _clearCurrentLink(e, t) {
          !this._currentLink ||
            !this._lastMouseEvent ||
            ((!e ||
              !t ||
              (this._currentLink.link.range.start.y >= e &&
                this._currentLink.link.range.end.y <= t)) &&
              (this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent),
              (this._currentLink = void 0),
              lc(this._linkCacheDisposables),
              (this._linkCacheDisposables.length = 0)));
        }
        _handleNewLink(e) {
          if (!this._lastMouseEvent) return;
          let t = this._positionFromMouseEvent(
            this._lastMouseEvent,
            this._element,
            this._mouseService,
          );
          t &&
            this._linkAtPosition(e.link, t) &&
            ((this._currentLink = e),
            (this._currentLink.state = {
              decorations: {
                underline: e.link.decorations === void 0 ? !0 : e.link.decorations.underline,
                pointerCursor:
                  e.link.decorations === void 0 ? !0 : e.link.decorations.pointerCursor,
              },
              isHovered: !0,
            }),
            this._linkHover(this._element, e.link, this._lastMouseEvent),
            (e.link.decorations = {}),
            Object.defineProperties(e.link.decorations, {
              pointerCursor: {
                get: () => this._currentLink?.state?.decorations.pointerCursor,
                set: (e) => {
                  this._currentLink?.state &&
                    this._currentLink.state.decorations.pointerCursor !== e &&
                    ((this._currentLink.state.decorations.pointerCursor = e),
                    this._currentLink.state.isHovered &&
                      this._element.classList.toggle(`xterm-cursor-pointer`, e));
                },
              },
              underline: {
                get: () => this._currentLink?.state?.decorations.underline,
                set: (t) => {
                  this._currentLink?.state &&
                    this._currentLink?.state?.decorations.underline !== t &&
                    ((this._currentLink.state.decorations.underline = t),
                    this._currentLink.state.isHovered && this._fireUnderlineEvent(e.link, t));
                },
              },
            }),
            this._linkCacheDisposables.push(
              this._renderService.onRenderedViewportChange((e) => {
                if (!this._currentLink) return;
                let t = e.start === 0 ? 0 : e.start + 1 + this._bufferService.buffer.ydisp,
                  n = this._bufferService.buffer.ydisp + 1 + e.end;
                if (
                  this._currentLink.link.range.start.y >= t &&
                  this._currentLink.link.range.end.y <= n &&
                  (this._clearCurrentLink(t, n), this._lastMouseEvent)
                ) {
                  let e = this._positionFromMouseEvent(
                    this._lastMouseEvent,
                    this._element,
                    this._mouseService,
                  );
                  e && this._askForLink(e, !1);
                }
              }),
            ));
        }
        _linkHover(e, t, n) {
          (this._currentLink?.state &&
            ((this._currentLink.state.isHovered = !0),
            this._currentLink.state.decorations.underline && this._fireUnderlineEvent(t, !0),
            this._currentLink.state.decorations.pointerCursor &&
              e.classList.add(`xterm-cursor-pointer`)),
            t.hover && t.hover(n, t.text));
        }
        _fireUnderlineEvent(e, t) {
          let n = e.range,
            r = this._bufferService.buffer.ydisp,
            i = this._createLinkUnderlineEvent(
              n.start.x - 1,
              n.start.y - r - 1,
              n.end.x,
              n.end.y - r - 1,
              void 0,
            );
          (t ? this._onShowLinkUnderline : this._onHideLinkUnderline).fire(i);
        }
        _linkLeave(e, t, n) {
          (this._currentLink?.state &&
            ((this._currentLink.state.isHovered = !1),
            this._currentLink.state.decorations.underline && this._fireUnderlineEvent(t, !1),
            this._currentLink.state.decorations.pointerCursor &&
              e.classList.remove(`xterm-cursor-pointer`)),
            t.leave && t.leave(n, t.text));
        }
        _linkAtPosition(e, t) {
          let n = e.range.start.y * this._bufferService.cols + e.range.start.x,
            r = e.range.end.y * this._bufferService.cols + e.range.end.x,
            i = t.y * this._bufferService.cols + t.x;
          return n <= i && i <= r;
        }
        _positionFromMouseEvent(e, t, n) {
          let r = n.getCoords(e, t, this._bufferService.cols, this._bufferService.rows);
          if (r) return { x: r[0], y: r[1] + this._bufferService.buffer.ydisp };
        }
        _createLinkUnderlineEvent(e, t, n, r, i) {
          return { x1: e, y1: t, x2: n, y2: r, cols: this._bufferService.cols, fg: i };
        }
      }),
      (zh = H([U(1, lu), U(2, uu), U(3, Xl), U(4, mu)], zh)),
      (Bh = class extends Dh {
        constructor(e = {}) {
          (super(e),
            (this._linkifier = this._register(new Mu())),
            (this.browser = Np),
            (this._keyDownHandled = !1),
            (this._keyDownSeen = !1),
            (this._keyPressHandled = !1),
            (this._unprocessedDeadKey = !1),
            (this._accessibilityManager = this._register(new Mu())),
            (this._onCursorMove = this._register(new K())),
            (this.onCursorMove = this._onCursorMove.event),
            (this._onKey = this._register(new K())),
            (this.onKey = this._onKey.event),
            (this._onRender = this._register(new K())),
            (this.onRender = this._onRender.event),
            (this._onSelectionChange = this._register(new K())),
            (this.onSelectionChange = this._onSelectionChange.event),
            (this._onTitleChange = this._register(new K())),
            (this.onTitleChange = this._onTitleChange.event),
            (this._onBell = this._register(new K())),
            (this.onBell = this._onBell.event),
            (this._onFocus = this._register(new K())),
            (this._onBlur = this._register(new K())),
            (this._onA11yCharEmitter = this._register(new K())),
            (this._onA11yTabEmitter = this._register(new K())),
            (this._onWillOpen = this._register(new K())),
            this._setup(),
            (this._decorationService = this._instantiationService.createInstance(Mh)),
            this._instantiationService.setService(au, this._decorationService),
            (this._linkProviderService = this._instantiationService.createInstance(Ap)),
            this._instantiationService.setService(mu, this._linkProviderService),
            this._linkProviderService.registerLinkProvider(
              this._instantiationService.createInstance(ou),
            ),
            this._register(this._inputHandler.onRequestBell(() => this._onBell.fire())),
            this._register(
              this._inputHandler.onRequestRefreshRows((e) =>
                this.refresh(e?.start ?? 0, e?.end ?? this.rows - 1),
              ),
            ),
            this._register(this._inputHandler.onRequestSendFocus(() => this._reportFocus())),
            this._register(this._inputHandler.onRequestReset(() => this.reset())),
            this._register(
              this._inputHandler.onRequestWindowsOptionsReport((e) =>
                this._reportWindowsOptions(e),
              ),
            ),
            this._register(this._inputHandler.onColor((e) => this._handleColorEvent(e))),
            this._register(Vu.forward(this._inputHandler.onCursorMove, this._onCursorMove)),
            this._register(Vu.forward(this._inputHandler.onTitleChange, this._onTitleChange)),
            this._register(Vu.forward(this._inputHandler.onA11yChar, this._onA11yCharEmitter)),
            this._register(Vu.forward(this._inputHandler.onA11yTab, this._onA11yTabEmitter)),
            this._register(this._bufferService.onResize((e) => this._afterResize(e.cols, e.rows))),
            this._register(
              z(() => {
                ((this._customKeyEventHandler = void 0),
                  this.element?.parentNode?.removeChild(this.element));
              }),
            ));
        }
        get linkifier() {
          return this._linkifier.value;
        }
        get onFocus() {
          return this._onFocus.event;
        }
        get onBlur() {
          return this._onBlur.event;
        }
        get onA11yChar() {
          return this._onA11yCharEmitter.event;
        }
        get onA11yTab() {
          return this._onA11yTabEmitter.event;
        }
        get onWillOpen() {
          return this._onWillOpen.event;
        }
        _handleColorEvent(e) {
          if (this._themeService)
            for (let t of e) {
              let e,
                n = ``;
              switch (t.index) {
                case 256:
                  ((e = `foreground`), (n = `10`));
                  break;
                case 257:
                  ((e = `background`), (n = `11`));
                  break;
                case 258:
                  ((e = `cursor`), (n = `12`));
                  break;
                default:
                  ((e = `ansi`), (n = `4;` + t.index));
              }
              switch (t.type) {
                case 0:
                  let r = Y.toColorRGB(
                    e === `ansi`
                      ? this._themeService.colors.ansi[t.index]
                      : this._themeService.colors[e],
                  );
                  this.coreService.triggerDataEvent(`${q.ESC}]${n};${Dl(r)}${np.ST}`);
                  break;
                case 1:
                  if (e === `ansi`)
                    this._themeService.modifyColors(
                      (e) => (e.ansi[t.index] = cp.toColor(...t.color)),
                    );
                  else {
                    let n = e;
                    this._themeService.modifyColors((e) => (e[n] = cp.toColor(...t.color)));
                  }
                  break;
                case 2:
                  this._themeService.restoreColor(t.index);
                  break;
              }
            }
        }
        _setup() {
          (super._setup(), (this._customKeyEventHandler = void 0));
        }
        get buffer() {
          return this.buffers.active;
        }
        focus() {
          this.textarea && this.textarea.focus({ preventScroll: !0 });
        }
        _handleScreenReaderModeOptionChange(e) {
          e
            ? !this._accessibilityManager.value &&
              this._renderService &&
              (this._accessibilityManager.value = this._instantiationService.createInstance(
                Rh,
                this,
              ))
            : this._accessibilityManager.clear();
        }
        _handleTextAreaFocus(e) {
          (this.coreService.decPrivateModes.sendFocus &&
            this.coreService.triggerDataEvent(q.ESC + `[I`),
            this.element.classList.add(`focus`),
            this._showCursor(),
            this._onFocus.fire());
        }
        blur() {
          return this.textarea?.blur();
        }
        _handleTextAreaBlur() {
          ((this.textarea.value = ``),
            this.refresh(this.buffer.y, this.buffer.y),
            this.coreService.decPrivateModes.sendFocus &&
              this.coreService.triggerDataEvent(q.ESC + `[O`),
            this.element.classList.remove(`focus`),
            this._onBlur.fire());
        }
        _syncTextArea() {
          if (
            !this.textarea ||
            !this.buffer.isCursorInViewport ||
            this._compositionHelper.isComposing ||
            !this._renderService
          )
            return;
          let e = this.buffer.ybase + this.buffer.y,
            t = this.buffer.lines.get(e);
          if (!t) return;
          let n = Math.min(this.buffer.x, this.cols - 1),
            r = this._renderService.dimensions.css.cell.height,
            i = t.getWidth(n),
            a = this._renderService.dimensions.css.cell.width * i,
            o = this.buffer.y * this._renderService.dimensions.css.cell.height,
            s = n * this._renderService.dimensions.css.cell.width;
          ((this.textarea.style.left = s + `px`),
            (this.textarea.style.top = o + `px`),
            (this.textarea.style.width = a + `px`),
            (this.textarea.style.height = r + `px`),
            (this.textarea.style.lineHeight = r + `px`),
            (this.textarea.style.zIndex = `-5`));
        }
        _initGlobal() {
          (this._bindKeys(),
            this._register(
              B(this.element, `copy`, (e) => {
                this.hasSelection() && Rs(e, this._selectionService);
              }),
            ));
          let e = (e) => zs(e, this.textarea, this.coreService, this.optionsService);
          (this._register(B(this.textarea, `paste`, e)),
            this._register(B(this.element, `paste`, e)),
            Lp
              ? this._register(
                  B(this.element, `mousedown`, (e) => {
                    e.button === 2 &&
                      Hs(
                        e,
                        this.textarea,
                        this.screenElement,
                        this._selectionService,
                        this.options.rightClickSelectsWord,
                      );
                  }),
                )
              : this._register(
                  B(this.element, `contextmenu`, (e) => {
                    Hs(
                      e,
                      this.textarea,
                      this.screenElement,
                      this._selectionService,
                      this.options.rightClickSelectsWord,
                    );
                  }),
                ),
            Wp &&
              this._register(
                B(this.element, `auxclick`, (e) => {
                  e.button === 1 && Vs(e, this.textarea, this.screenElement);
                }),
              ));
        }
        _bindKeys() {
          (this._register(B(this.textarea, `keyup`, (e) => this._keyUp(e), !0)),
            this._register(B(this.textarea, `keydown`, (e) => this._keyDown(e), !0)),
            this._register(B(this.textarea, `keypress`, (e) => this._keyPress(e), !0)),
            this._register(
              B(this.textarea, `compositionstart`, () =>
                this._compositionHelper.compositionstart(),
              ),
            ),
            this._register(
              B(this.textarea, `compositionupdate`, (e) =>
                this._compositionHelper.compositionupdate(e),
              ),
            ),
            this._register(
              B(this.textarea, `compositionend`, () => this._compositionHelper.compositionend()),
            ),
            this._register(B(this.textarea, `input`, (e) => this._inputEvent(e), !0)),
            this._register(
              this.onRender(() => this._compositionHelper.updateCompositionElements()),
            ));
        }
        open(e) {
          if (!e) throw Error(`Terminal requires a parent element.`);
          if (
            (e.isConnected ||
              this._logService.debug(
                `Terminal.open was called on an element that was not attached to the DOM`,
              ),
            this.element?.ownerDocument.defaultView && this._coreBrowserService)
          ) {
            this.element.ownerDocument.defaultView !== this._coreBrowserService.window &&
              (this._coreBrowserService.window = this.element.ownerDocument.defaultView);
            return;
          }
          ((this._document = e.ownerDocument),
            this.options.documentOverride &&
              this.options.documentOverride instanceof Document &&
              (this._document = this.optionsService.rawOptions.documentOverride),
            (this.element = this._document.createElement(`div`)),
            (this.element.dir = `ltr`),
            this.element.classList.add(`terminal`),
            this.element.classList.add(`xterm`),
            e.appendChild(this.element));
          let t = this._document.createDocumentFragment();
          ((this._viewportElement = this._document.createElement(`div`)),
            this._viewportElement.classList.add(`xterm-viewport`),
            t.appendChild(this._viewportElement),
            (this.screenElement = this._document.createElement(`div`)),
            this.screenElement.classList.add(`xterm-screen`),
            this._register(B(this.screenElement, `mousemove`, (e) => this.updateCursorStyle(e))),
            (this._helperContainer = this._document.createElement(`div`)),
            this._helperContainer.classList.add(`xterm-helpers`),
            this.screenElement.appendChild(this._helperContainer),
            t.appendChild(this.screenElement));
          let n = (this.textarea = this._document.createElement(`textarea`));
          (this.textarea.classList.add(`xterm-helper-textarea`),
            this.textarea.setAttribute(`aria-label`, Ll.get()),
            Gp || this.textarea.setAttribute(`aria-multiline`, `false`),
            this.textarea.setAttribute(`autocorrect`, `off`),
            this.textarea.setAttribute(`autocapitalize`, `off`),
            this.textarea.setAttribute(`spellcheck`, `false`),
            (this.textarea.tabIndex = 0),
            this._register(
              this.optionsService.onSpecificOptionChange(
                `disableStdin`,
                () => (n.readOnly = this.optionsService.rawOptions.disableStdin),
              ),
            ),
            (this.textarea.readOnly = this.optionsService.rawOptions.disableStdin),
            (this._coreBrowserService = this._register(
              this._instantiationService.createInstance(
                Op,
                this.textarea,
                e.ownerDocument.defaultView ?? window,
                (this._document ?? typeof window < `u`) ? window.document : null,
              ),
            )),
            this._instantiationService.setService(cu, this._coreBrowserService),
            this._register(B(this.textarea, `focus`, (e) => this._handleTextAreaFocus(e))),
            this._register(B(this.textarea, `blur`, () => this._handleTextAreaBlur())),
            this._helperContainer.appendChild(this.textarea),
            (this._charSizeService = this._instantiationService.createInstance(
              wp,
              this._document,
              this._helperContainer,
            )),
            this._instantiationService.setService(su, this._charSizeService),
            (this._themeService = this._instantiationService.createInstance(hm)),
            this._instantiationService.setService(pu, this._themeService),
            (this._characterJoinerService = this._instantiationService.createInstance(fp)),
            this._instantiationService.setService(fu, this._characterJoinerService),
            (this._renderService = this._register(
              this._instantiationService.createInstance(Zp, this.rows, this.screenElement),
            )),
            this._instantiationService.setService(uu, this._renderService),
            this._register(
              this._renderService.onRenderedViewportChange((e) => this._onRender.fire(e)),
            ),
            this.onResize((e) => this._renderService.resize(e.cols, e.rows)),
            (this._compositionView = this._document.createElement(`div`)),
            this._compositionView.classList.add(`composition-view`),
            (this._compositionHelper = this._instantiationService.createInstance(
              rp,
              this.textarea,
              this._compositionView,
            )),
            this._helperContainer.appendChild(this._compositionView),
            (this._mouseService = this._instantiationService.createInstance(jp)),
            this._instantiationService.setService(lu, this._mouseService));
          let r = (this._linkifier.value = this._register(
            this._instantiationService.createInstance(zh, this.screenElement),
          ));
          this.element.appendChild(t);
          try {
            this._onWillOpen.fire(this.element);
          } catch {}
          (this._renderService.hasRenderer() ||
            this._renderService.setRenderer(this._createRenderer()),
            this._register(
              this.onCursorMove(() => {
                (this._renderService.handleCursorMove(), this._syncTextArea());
              }),
            ),
            this._register(
              this.onResize(() => this._renderService.handleResize(this.cols, this.rows)),
            ),
            this._register(this.onBlur(() => this._renderService.handleBlur())),
            this._register(this.onFocus(() => this._renderService.handleFocus())),
            (this._viewport = this._register(
              this._instantiationService.createInstance(Jf, this.element, this.screenElement),
            )),
            this._register(
              this._viewport.onRequestScrollLines((e) => {
                (super.scrollLines(e, !1), this.refresh(0, this.rows - 1));
              }),
            ),
            (this._selectionService = this._register(
              this._instantiationService.createInstance(am, this.element, this.screenElement, r),
            )),
            this._instantiationService.setService(du, this._selectionService),
            this._register(
              this._selectionService.onRequestScrollLines((e) =>
                this.scrollLines(e.amount, e.suppressScrollEvent),
              ),
            ),
            this._register(
              this._selectionService.onSelectionChange(() => this._onSelectionChange.fire()),
            ),
            this._register(
              this._selectionService.onRequestRedraw((e) =>
                this._renderService.handleSelectionChanged(e.start, e.end, e.columnSelectMode),
              ),
            ),
            this._register(
              this._selectionService.onLinuxMouseSelection((e) => {
                ((this.textarea.value = e), this.textarea.focus(), this.textarea.select());
              }),
            ),
            this._register(
              Vu.any(
                this._onScroll.event,
                this._inputHandler.onScroll,
              )(() => {
                (this._selectionService.refresh(), this._viewport?.queueSync());
              }),
            ),
            this._register(this._instantiationService.createInstance(Yf, this.screenElement)),
            this._register(
              B(this.element, `mousedown`, (e) => this._selectionService.handleMouseDown(e)),
            ),
            this.coreMouseService.areMouseEventsActive
              ? (this._selectionService.disable(),
                this.element.classList.add(`enable-mouse-events`))
              : this._selectionService.enable(),
            this.options.screenReaderMode &&
              (this._accessibilityManager.value = this._instantiationService.createInstance(
                Rh,
                this,
              )),
            this._register(
              this.optionsService.onSpecificOptionChange(`screenReaderMode`, (e) =>
                this._handleScreenReaderModeOptionChange(e),
              ),
            ),
            this.options.overviewRuler.width &&
              (this._overviewRulerRenderer = this._register(
                this._instantiationService.createInstance(
                  ep,
                  this._viewportElement,
                  this.screenElement,
                ),
              )),
            this.optionsService.onSpecificOptionChange(`overviewRuler`, (e) => {
              !this._overviewRulerRenderer &&
                e &&
                this._viewportElement &&
                this.screenElement &&
                (this._overviewRulerRenderer = this._register(
                  this._instantiationService.createInstance(
                    ep,
                    this._viewportElement,
                    this.screenElement,
                  ),
                ));
            }),
            this._charSizeService.measure(),
            this.refresh(0, this.rows - 1),
            this._initGlobal(),
            this.bindMouse());
        }
        _createRenderer() {
          return this._instantiationService.createInstance(
            Cp,
            this,
            this._document,
            this.element,
            this.screenElement,
            this._viewportElement,
            this._helperContainer,
            this.linkifier,
          );
        }
        bindMouse() {
          let e = this,
            t = this.element;
          function n(t) {
            let n = e._mouseService.getMouseReportCoords(t, e.screenElement);
            if (!n) return !1;
            let r, i;
            switch (t.overrideType || t.type) {
              case `mousemove`:
                ((i = 32),
                  t.buttons === void 0
                    ? ((r = 3), t.button !== void 0 && (r = t.button < 3 ? t.button : 3))
                    : (r = t.buttons & 1 ? 0 : t.buttons & 4 ? 1 : t.buttons & 2 ? 2 : 3));
                break;
              case `mouseup`:
                ((i = 0), (r = t.button < 3 ? t.button : 3));
                break;
              case `mousedown`:
                ((i = 1), (r = t.button < 3 ? t.button : 3));
                break;
              case `wheel`:
                if (e._customWheelEventHandler && e._customWheelEventHandler(t) === !1) return !1;
                let n = t.deltaY;
                if (
                  n === 0 ||
                  e.coreMouseService.consumeWheelEvent(
                    t,
                    e._renderService?.dimensions?.device?.cell?.height,
                    e._coreBrowserService?.dpr,
                  ) === 0
                )
                  return !1;
                ((i = n < 0 ? 0 : 1), (r = 4));
                break;
              default:
                return !1;
            }
            return i === void 0 || r === void 0 || r > 4
              ? !1
              : e.coreMouseService.triggerMouseEvent({
                  col: n.col,
                  row: n.row,
                  x: n.x,
                  y: n.y,
                  button: r,
                  action: i,
                  ctrl: t.ctrlKey,
                  alt: t.altKey,
                  shift: t.shiftKey,
                });
          }
          let r = { mouseup: null, wheel: null, mousedrag: null, mousemove: null },
            i = {
              mouseup: (e) => (
                n(e),
                e.buttons ||
                  (this._document.removeEventListener(`mouseup`, r.mouseup),
                  r.mousedrag && this._document.removeEventListener(`mousemove`, r.mousedrag)),
                this.cancel(e)
              ),
              wheel: (e) => (n(e), this.cancel(e, !0)),
              mousedrag: (e) => {
                e.buttons && n(e);
              },
              mousemove: (e) => {
                e.buttons || n(e);
              },
            };
          (this._register(
            this.coreMouseService.onProtocolChange((e) => {
              (e
                ? (this.optionsService.rawOptions.logLevel === `debug` &&
                    this._logService.debug(
                      `Binding to mouse events:`,
                      this.coreMouseService.explainEvents(e),
                    ),
                  this.element.classList.add(`enable-mouse-events`),
                  this._selectionService.disable())
                : (this._logService.debug(`Unbinding from mouse events.`),
                  this.element.classList.remove(`enable-mouse-events`),
                  this._selectionService.enable()),
                e & 8
                  ? (r.mousemove ||= (t.addEventListener(`mousemove`, i.mousemove), i.mousemove))
                  : (t.removeEventListener(`mousemove`, r.mousemove), (r.mousemove = null)),
                e & 16
                  ? (r.wheel ||= (t.addEventListener(`wheel`, i.wheel, { passive: !1 }), i.wheel))
                  : (t.removeEventListener(`wheel`, r.wheel), (r.wheel = null)),
                e & 2
                  ? (r.mouseup ||= i.mouseup)
                  : (this._document.removeEventListener(`mouseup`, r.mouseup), (r.mouseup = null)),
                e & 4
                  ? (r.mousedrag ||= i.mousedrag)
                  : (this._document.removeEventListener(`mousemove`, r.mousedrag),
                    (r.mousedrag = null)));
            }),
          ),
            (this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol),
            this._register(
              B(t, `mousedown`, (e) => {
                if (
                  (e.preventDefault(),
                  this.focus(),
                  !(
                    !this.coreMouseService.areMouseEventsActive ||
                    this._selectionService.shouldForceSelection(e)
                  ))
                )
                  return (
                    n(e),
                    r.mouseup && this._document.addEventListener(`mouseup`, r.mouseup),
                    r.mousedrag && this._document.addEventListener(`mousemove`, r.mousedrag),
                    this.cancel(e)
                  );
              }),
            ),
            this._register(
              B(
                t,
                `wheel`,
                (t) => {
                  if (!r.wheel) {
                    if (this._customWheelEventHandler && this._customWheelEventHandler(t) === !1)
                      return !1;
                    if (!this.buffer.hasScrollback) {
                      if (t.deltaY === 0) return !1;
                      if (
                        e.coreMouseService.consumeWheelEvent(
                          t,
                          e._renderService?.dimensions?.device?.cell?.height,
                          e._coreBrowserService?.dpr,
                        ) === 0
                      )
                        return this.cancel(t, !0);
                      let n =
                        q.ESC +
                        (this.coreService.decPrivateModes.applicationCursorKeys ? `O` : `[`) +
                        (t.deltaY < 0 ? `A` : `B`);
                      return (this.coreService.triggerDataEvent(n, !0), this.cancel(t, !0));
                    }
                  }
                },
                { passive: !1 },
              ),
            ));
        }
        refresh(e, t) {
          this._renderService?.refreshRows(e, t);
        }
        updateCursorStyle(e) {
          this._selectionService?.shouldColumnSelect(e)
            ? this.element.classList.add(`column-select`)
            : this.element.classList.remove(`column-select`);
        }
        _showCursor() {
          this.coreService.isCursorInitialized ||
            ((this.coreService.isCursorInitialized = !0),
            this.refresh(this.buffer.y, this.buffer.y));
        }
        scrollLines(e, t) {
          (this._viewport ? this._viewport.scrollLines(e) : super.scrollLines(e, t),
            this.refresh(0, this.rows - 1));
        }
        scrollPages(e) {
          this.scrollLines(e * (this.rows - 1));
        }
        scrollToTop() {
          this.scrollLines(-this._bufferService.buffer.ydisp);
        }
        scrollToBottom(e) {
          e && this._viewport
            ? this._viewport.scrollToLine(this.buffer.ybase, !0)
            : this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
        }
        scrollToLine(e) {
          let t = e - this._bufferService.buffer.ydisp;
          t !== 0 && this.scrollLines(t);
        }
        paste(e) {
          Bs(e, this.textarea, this.coreService, this.optionsService);
        }
        attachCustomKeyEventHandler(e) {
          this._customKeyEventHandler = e;
        }
        attachCustomWheelEventHandler(e) {
          this._customWheelEventHandler = e;
        }
        registerLinkProvider(e) {
          return this._linkProviderService.registerLinkProvider(e);
        }
        registerCharacterJoiner(e) {
          if (!this._characterJoinerService) throw Error(`Terminal must be opened first`);
          let t = this._characterJoinerService.register(e);
          return (this.refresh(0, this.rows - 1), t);
        }
        deregisterCharacterJoiner(e) {
          if (!this._characterJoinerService) throw Error(`Terminal must be opened first`);
          this._characterJoinerService.deregister(e) && this.refresh(0, this.rows - 1);
        }
        get markers() {
          return this.buffer.markers;
        }
        registerMarker(e) {
          return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + e);
        }
        registerDecoration(e) {
          return this._decorationService.registerDecoration(e);
        }
        hasSelection() {
          return this._selectionService ? this._selectionService.hasSelection : !1;
        }
        select(e, t, n) {
          this._selectionService.setSelection(e, t, n);
        }
        getSelection() {
          return this._selectionService ? this._selectionService.selectionText : ``;
        }
        getSelectionPosition() {
          if (!(!this._selectionService || !this._selectionService.hasSelection))
            return {
              start: {
                x: this._selectionService.selectionStart[0],
                y: this._selectionService.selectionStart[1],
              },
              end: {
                x: this._selectionService.selectionEnd[0],
                y: this._selectionService.selectionEnd[1],
              },
            };
        }
        clearSelection() {
          this._selectionService?.clearSelection();
        }
        selectAll() {
          this._selectionService?.selectAll();
        }
        selectLines(e, t) {
          this._selectionService?.selectLines(e, t);
        }
        _keyDown(e) {
          if (
            ((this._keyDownHandled = !1),
            (this._keyDownSeen = !0),
            this._customKeyEventHandler && this._customKeyEventHandler(e) === !1)
          )
            return !1;
          let t = this.browser.isMac && this.options.macOptionIsMeta && e.altKey;
          if (!t && !this._compositionHelper.keydown(e))
            return (
              this.options.scrollOnUserInput &&
                this.buffer.ybase !== this.buffer.ydisp &&
                this.scrollToBottom(!0),
              !1
            );
          !t && (e.key === `Dead` || e.key === `AltGraph`) && (this._unprocessedDeadKey = !0);
          let n = Al(
            e,
            this.coreService.decPrivateModes.applicationCursorKeys,
            this.browser.isMac,
            this.options.macOptionIsMeta,
          );
          if ((this.updateCursorStyle(e), n.type === 3 || n.type === 2)) {
            let t = this.rows - 1;
            return (this.scrollLines(n.type === 2 ? -t : t), this.cancel(e, !0));
          }
          if (
            (n.type === 1 && this.selectAll(),
            this._isThirdLevelShift(this.browser, e) ||
              (n.cancel && this.cancel(e, !0), !n.key) ||
              (e.key &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey &&
                e.key.length === 1 &&
                e.key.charCodeAt(0) >= 65 &&
                e.key.charCodeAt(0) <= 90))
          )
            return !0;
          if (this._unprocessedDeadKey) return ((this._unprocessedDeadKey = !1), !0);
          if (
            ((n.key === q.ETX || n.key === q.CR) && (this.textarea.value = ``),
            this._onKey.fire({ key: n.key, domEvent: e }),
            this._showCursor(),
            this.coreService.triggerDataEvent(n.key, !0),
            !this.optionsService.rawOptions.screenReaderMode || e.altKey || e.ctrlKey)
          )
            return this.cancel(e, !0);
          this._keyDownHandled = !0;
        }
        _isThirdLevelShift(e, t) {
          let n =
            (e.isMac && !this.options.macOptionIsMeta && t.altKey && !t.ctrlKey && !t.metaKey) ||
            (e.isWindows && t.altKey && t.ctrlKey && !t.metaKey) ||
            (e.isWindows && t.getModifierState(`AltGraph`));
          return t.type === `keypress` ? n : n && (!t.keyCode || t.keyCode > 47);
        }
        _keyUp(e) {
          ((this._keyDownSeen = !1),
            !(this._customKeyEventHandler && this._customKeyEventHandler(e) === !1) &&
              (Ml(e) || this.focus(), this.updateCursorStyle(e), (this._keyPressHandled = !1)));
        }
        _keyPress(e) {
          let t;
          if (
            ((this._keyPressHandled = !1),
            this._keyDownHandled ||
              (this._customKeyEventHandler && this._customKeyEventHandler(e) === !1))
          )
            return !1;
          if ((this.cancel(e), e.charCode)) t = e.charCode;
          else if (e.which === null || e.which === void 0) t = e.keyCode;
          else if (e.which !== 0 && e.charCode !== 0) t = e.which;
          else return !1;
          return !t ||
            ((e.altKey || e.ctrlKey || e.metaKey) && !this._isThirdLevelShift(this.browser, e))
            ? !1
            : ((t = String.fromCharCode(t)),
              this._onKey.fire({ key: t, domEvent: e }),
              this._showCursor(),
              this.coreService.triggerDataEvent(t, !0),
              (this._keyPressHandled = !0),
              (this._unprocessedDeadKey = !1),
              !0);
        }
        _inputEvent(e) {
          if (
            e.data &&
            e.inputType === `insertText` &&
            (!e.composed || !this._keyDownSeen) &&
            !this.optionsService.rawOptions.screenReaderMode
          ) {
            if (this._keyPressHandled) return !1;
            this._unprocessedDeadKey = !1;
            let t = e.data;
            return (this.coreService.triggerDataEvent(t, !0), this.cancel(e), !0);
          }
          return !1;
        }
        resize(e, t) {
          if (e === this.cols && t === this.rows) {
            this._charSizeService &&
              !this._charSizeService.hasValidSize &&
              this._charSizeService.measure();
            return;
          }
          super.resize(e, t);
        }
        _afterResize(e, t) {
          this._charSizeService?.measure();
        }
        clear() {
          if (!(this.buffer.ybase === 0 && this.buffer.y === 0)) {
            (this.buffer.clearAllMarkers(),
              this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y)),
              (this.buffer.lines.length = 1),
              (this.buffer.ydisp = 0),
              (this.buffer.ybase = 0),
              (this.buffer.y = 0));
            for (let e = 1; e < this.rows; e++)
              this.buffer.lines.push(this.buffer.getBlankLine(Sm));
            (this._onScroll.fire({ position: this.buffer.ydisp }), this.refresh(0, this.rows - 1));
          }
        }
        reset() {
          ((this.options.rows = this.rows), (this.options.cols = this.cols));
          let e = this._customKeyEventHandler;
          (this._setup(),
            super.reset(),
            this._selectionService?.reset(),
            this._decorationService.reset(),
            (this._customKeyEventHandler = e),
            this.refresh(0, this.rows - 1));
        }
        clearTextureAtlas() {
          this._renderService?.clearTextureAtlas();
        }
        _reportFocus() {
          this.element?.classList.contains(`focus`)
            ? this.coreService.triggerDataEvent(q.ESC + `[I`)
            : this.coreService.triggerDataEvent(q.ESC + `[O`);
        }
        _reportWindowsOptions(e) {
          if (this._renderService)
            switch (e) {
              case 0:
                let e = this._renderService.dimensions.css.canvas.width.toFixed(0),
                  t = this._renderService.dimensions.css.canvas.height.toFixed(0);
                this.coreService.triggerDataEvent(`${q.ESC}[4;${t};${e}t`);
                break;
              case 1:
                let n = this._renderService.dimensions.css.cell.width.toFixed(0),
                  r = this._renderService.dimensions.css.cell.height.toFixed(0);
                this.coreService.triggerDataEvent(`${q.ESC}[6;${r};${n}t`);
                break;
            }
        }
        cancel(e, t) {
          if (!(!this.options.cancelEvents && !t))
            return (e.preventDefault(), e.stopPropagation(), !1);
        }
      }),
      (Vh = class {
        constructor() {
          this._addons = [];
        }
        dispose() {
          for (let e = this._addons.length - 1; e >= 0; e--) this._addons[e].instance.dispose();
        }
        loadAddon(e, t) {
          let n = { instance: t, dispose: t.dispose, isDisposed: !1 };
          (this._addons.push(n), (t.dispose = () => this._wrappedAddonDispose(n)), t.activate(e));
        }
        _wrappedAddonDispose(e) {
          if (e.isDisposed) return;
          let t = -1;
          for (let n = 0; n < this._addons.length; n++)
            if (this._addons[n] === e) {
              t = n;
              break;
            }
          if (t === -1) throw Error(`Could not dispose an addon that has not been loaded`);
          ((e.isDisposed = !0), e.dispose.apply(e.instance), this._addons.splice(t, 1));
        }
      }),
      (Hh = class {
        constructor(e) {
          this._line = e;
        }
        get isWrapped() {
          return this._line.isWrapped;
        }
        get length() {
          return this._line.length;
        }
        getCell(e, t) {
          if (!(e < 0 || e >= this._line.length))
            return t ? (this._line.loadCell(e, t), t) : this._line.loadCell(e, new Kl());
        }
        translateToString(e, t, n) {
          return this._line.translateToString(e, t, n);
        }
      }),
      (Uh = class {
        constructor(e, t) {
          ((this._buffer = e), (this.type = t));
        }
        init(e) {
          return ((this._buffer = e), this);
        }
        get cursorY() {
          return this._buffer.y;
        }
        get cursorX() {
          return this._buffer.x;
        }
        get viewportY() {
          return this._buffer.ydisp;
        }
        get baseY() {
          return this._buffer.ybase;
        }
        get length() {
          return this._buffer.lines.length;
        }
        getLine(e) {
          let t = this._buffer.lines.get(e);
          if (t) return new Hh(t);
        }
        getNullCell() {
          return new Kl();
        }
      }),
      (Wh = class extends W {
        constructor(e) {
          (super(),
            (this._core = e),
            (this._onBufferChange = this._register(new K())),
            (this.onBufferChange = this._onBufferChange.event),
            (this._normal = new Uh(this._core.buffers.normal, `normal`)),
            (this._alternate = new Uh(this._core.buffers.alt, `alternate`)),
            this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active)));
        }
        get active() {
          if (this._core.buffers.active === this._core.buffers.normal) return this.normal;
          if (this._core.buffers.active === this._core.buffers.alt) return this.alternate;
          throw Error(`Active buffer is neither normal nor alternate`);
        }
        get normal() {
          return this._normal.init(this._core.buffers.normal);
        }
        get alternate() {
          return this._alternate.init(this._core.buffers.alt);
        }
      }),
      (Gh = class {
        constructor(e) {
          this._core = e;
        }
        registerCsiHandler(e, t) {
          return this._core.registerCsiHandler(e, (e) => t(e.toArray()));
        }
        addCsiHandler(e, t) {
          return this.registerCsiHandler(e, t);
        }
        registerDcsHandler(e, t) {
          return this._core.registerDcsHandler(e, (e, n) => t(e, n.toArray()));
        }
        addDcsHandler(e, t) {
          return this.registerDcsHandler(e, t);
        }
        registerEscHandler(e, t) {
          return this._core.registerEscHandler(e, t);
        }
        addEscHandler(e, t) {
          return this.registerEscHandler(e, t);
        }
        registerOscHandler(e, t) {
          return this._core.registerOscHandler(e, t);
        }
        addOscHandler(e, t) {
          return this.registerOscHandler(e, t);
        }
      }),
      (Kh = class {
        constructor(e) {
          this._core = e;
        }
        register(e) {
          this._core.unicodeService.register(e);
        }
        get versions() {
          return this._core.unicodeService.versions;
        }
        get activeVersion() {
          return this._core.unicodeService.activeVersion;
        }
        set activeVersion(e) {
          this._core.unicodeService.activeVersion = e;
        }
      }),
      (qh = [`cols`, `rows`]),
      (Jh = 0),
      (Yh = class extends W {
        constructor(e) {
          (super(),
            (this._core = this._register(new Bh(e))),
            (this._addonManager = this._register(new Vh())),
            (this._publicOptions = { ...this._core.options }));
          let t = (e) => this._core.options[e],
            n = (e, t) => {
              (this._checkReadonlyOptions(e), (this._core.options[e] = t));
            };
          for (let e in this._core.options) {
            let r = { get: t.bind(this, e), set: n.bind(this, e) };
            Object.defineProperty(this._publicOptions, e, r);
          }
        }
        _checkReadonlyOptions(e) {
          if (qh.includes(e)) throw Error(`Option "${e}" can only be set in the constructor`);
        }
        _checkProposedApi() {
          if (!this._core.optionsService.rawOptions.allowProposedApi)
            throw Error(`You must set the allowProposedApi option to true to use proposed API`);
        }
        get onBell() {
          return this._core.onBell;
        }
        get onBinary() {
          return this._core.onBinary;
        }
        get onCursorMove() {
          return this._core.onCursorMove;
        }
        get onData() {
          return this._core.onData;
        }
        get onKey() {
          return this._core.onKey;
        }
        get onLineFeed() {
          return this._core.onLineFeed;
        }
        get onRender() {
          return this._core.onRender;
        }
        get onResize() {
          return this._core.onResize;
        }
        get onScroll() {
          return this._core.onScroll;
        }
        get onSelectionChange() {
          return this._core.onSelectionChange;
        }
        get onTitleChange() {
          return this._core.onTitleChange;
        }
        get onWriteParsed() {
          return this._core.onWriteParsed;
        }
        get element() {
          return this._core.element;
        }
        get parser() {
          return ((this._parser ||= new Gh(this._core)), this._parser);
        }
        get unicode() {
          return (this._checkProposedApi(), new Kh(this._core));
        }
        get textarea() {
          return this._core.textarea;
        }
        get rows() {
          return this._core.rows;
        }
        get cols() {
          return this._core.cols;
        }
        get buffer() {
          return ((this._buffer ||= this._register(new Wh(this._core))), this._buffer);
        }
        get markers() {
          return (this._checkProposedApi(), this._core.markers);
        }
        get modes() {
          let e = this._core.coreService.decPrivateModes,
            t = `none`;
          switch (this._core.coreMouseService.activeProtocol) {
            case `X10`:
              t = `x10`;
              break;
            case `VT200`:
              t = `vt200`;
              break;
            case `DRAG`:
              t = `drag`;
              break;
            case `ANY`:
              t = `any`;
              break;
          }
          return {
            applicationCursorKeysMode: e.applicationCursorKeys,
            applicationKeypadMode: e.applicationKeypad,
            bracketedPasteMode: e.bracketedPasteMode,
            insertMode: this._core.coreService.modes.insertMode,
            mouseTrackingMode: t,
            originMode: e.origin,
            reverseWraparoundMode: e.reverseWraparound,
            sendFocusMode: e.sendFocus,
            synchronizedOutputMode: e.synchronizedOutput,
            wraparoundMode: e.wraparound,
          };
        }
        get options() {
          return this._publicOptions;
        }
        set options(e) {
          for (let t in e) this._publicOptions[t] = e[t];
        }
        blur() {
          this._core.blur();
        }
        focus() {
          this._core.focus();
        }
        input(e, t = !0) {
          this._core.input(e, t);
        }
        resize(e, t) {
          (this._verifyIntegers(e, t), this._core.resize(e, t));
        }
        open(e) {
          this._core.open(e);
        }
        attachCustomKeyEventHandler(e) {
          this._core.attachCustomKeyEventHandler(e);
        }
        attachCustomWheelEventHandler(e) {
          this._core.attachCustomWheelEventHandler(e);
        }
        registerLinkProvider(e) {
          return this._core.registerLinkProvider(e);
        }
        registerCharacterJoiner(e) {
          return (this._checkProposedApi(), this._core.registerCharacterJoiner(e));
        }
        deregisterCharacterJoiner(e) {
          (this._checkProposedApi(), this._core.deregisterCharacterJoiner(e));
        }
        registerMarker(e = 0) {
          return (this._verifyIntegers(e), this._core.registerMarker(e));
        }
        registerDecoration(e) {
          return (
            this._checkProposedApi(),
            this._verifyPositiveIntegers(e.x ?? 0, e.width ?? 0, e.height ?? 0),
            this._core.registerDecoration(e)
          );
        }
        hasSelection() {
          return this._core.hasSelection();
        }
        select(e, t, n) {
          (this._verifyIntegers(e, t, n), this._core.select(e, t, n));
        }
        getSelection() {
          return this._core.getSelection();
        }
        getSelectionPosition() {
          return this._core.getSelectionPosition();
        }
        clearSelection() {
          this._core.clearSelection();
        }
        selectAll() {
          this._core.selectAll();
        }
        selectLines(e, t) {
          (this._verifyIntegers(e, t), this._core.selectLines(e, t));
        }
        dispose() {
          super.dispose();
        }
        scrollLines(e) {
          (this._verifyIntegers(e), this._core.scrollLines(e));
        }
        scrollPages(e) {
          (this._verifyIntegers(e), this._core.scrollPages(e));
        }
        scrollToTop() {
          this._core.scrollToTop();
        }
        scrollToBottom() {
          this._core.scrollToBottom();
        }
        scrollToLine(e) {
          (this._verifyIntegers(e), this._core.scrollToLine(e));
        }
        clear() {
          this._core.clear();
        }
        write(e, t) {
          this._core.write(e, t);
        }
        writeln(e, t) {
          (this._core.write(e),
            this._core.write(
              `\r
`,
              t,
            ));
        }
        paste(e) {
          this._core.paste(e);
        }
        refresh(e, t) {
          (this._verifyIntegers(e, t), this._core.refresh(e, t));
        }
        reset() {
          this._core.reset();
        }
        clearTextureAtlas() {
          this._core.clearTextureAtlas();
        }
        loadAddon(e) {
          this._addonManager.loadAddon(this, e);
        }
        static get strings() {
          return {
            get promptLabel() {
              return Ll.get();
            },
            set promptLabel(e) {
              Ll.set(e);
            },
            get tooMuchOutput() {
              return zl.get();
            },
            set tooMuchOutput(e) {
              zl.set(e);
            },
          };
        }
        _verifyIntegers(...e) {
          for (Jh of e)
            if (Jh === 1 / 0 || isNaN(Jh) || Jh % 1 != 0)
              throw Error(`This API only accepts integers`);
        }
        _verifyPositiveIntegers(...e) {
          for (Jh of e)
            if (Jh && (Jh === 1 / 0 || isNaN(Jh) || Jh % 1 != 0 || Jh < 0))
              throw Error(`This API only accepts positive integers`);
        }
      }));
  }),
  Zh = t(() => {});
function Qh(e) {
  return {
    cursorBlink: e.cursorBlink,
    cursorStyle: e.cursorStyle,
    fontFamily: e.fontFamily,
    fontSize: e.fontSize,
    letterSpacing: e.letterSpacing,
    lineHeight: e.lineHeight,
  };
}
var $h = t(() => {});
function eg(e, t, n) {
  for (let n of t) {
    let t = e.getPropertyValue(n).trim();
    if (t) return t;
  }
  return n;
}
function tg() {
  let e = getComputedStyle(document.documentElement);
  return {
    background: eg(
      e,
      [`--vscode-terminal-background`, `--vscode-panel-background`],
      ng.background ?? `#080808`,
    ),
    black: eg(e, [`--vscode-terminal-ansiBlack`], ng.black ?? `#000000`),
    blue: eg(e, [`--vscode-terminal-ansiBlue`], ng.blue ?? `#2472c8`),
    brightBlack: eg(e, [`--vscode-terminal-ansiBrightBlack`], ng.brightBlack ?? `#666666`),
    brightBlue: eg(e, [`--vscode-terminal-ansiBrightBlue`], ng.brightBlue ?? `#3b8eea`),
    brightCyan: eg(e, [`--vscode-terminal-ansiBrightCyan`], ng.brightCyan ?? `#29b8db`),
    brightGreen: eg(e, [`--vscode-terminal-ansiBrightGreen`], ng.brightGreen ?? `#23d18b`),
    brightMagenta: eg(e, [`--vscode-terminal-ansiBrightMagenta`], ng.brightMagenta ?? `#d670d6`),
    brightRed: eg(e, [`--vscode-terminal-ansiBrightRed`], ng.brightRed ?? `#f14c4c`),
    brightWhite: eg(e, [`--vscode-terminal-ansiBrightWhite`], ng.brightWhite ?? `#ffffff`),
    brightYellow: eg(e, [`--vscode-terminal-ansiBrightYellow`], ng.brightYellow ?? `#f5f543`),
    cursor: eg(
      e,
      [`--vscode-terminalCursor-foreground`, `--vscode-terminal-foreground`],
      ng.cursor ?? `#d4d4d4`,
    ),
    cursorAccent: eg(
      e,
      [`--vscode-terminalCursor-background`, `--vscode-terminal-background`],
      ng.cursorAccent ?? `#1e1e1e`,
    ),
    cyan: eg(e, [`--vscode-terminal-ansiCyan`], ng.cyan ?? `#11a8cd`),
    foreground: eg(
      e,
      [`--vscode-terminal-foreground`, `--vscode-editor-foreground`],
      ng.foreground ?? `#d4d4d4`,
    ),
    green: eg(e, [`--vscode-terminal-ansiGreen`], ng.green ?? `#0dbc79`),
    magenta: eg(e, [`--vscode-terminal-ansiMagenta`], ng.magenta ?? `#bc3fbc`),
    red: eg(e, [`--vscode-terminal-ansiRed`], ng.red ?? `#cd3131`),
    selectionBackground: eg(
      e,
      [`--vscode-terminal-selectionBackground`, `--vscode-editor-selectionBackground`],
      ng.selectionBackground ?? `#264f78`,
    ),
    white: eg(e, [`--vscode-terminal-ansiWhite`], ng.white ?? `#e5e5e5`),
    yellow: eg(e, [`--vscode-terminal-ansiYellow`], ng.yellow ?? `#e5e510`),
  };
}
var ng,
  rg = t(() => {
    ng = {
      background: `#080808`,
      black: `#000000`,
      blue: `#2472c8`,
      brightBlack: `#666666`,
      brightBlue: `#3b8eea`,
      brightCyan: `#29b8db`,
      brightGreen: `#23d18b`,
      brightMagenta: `#d670d6`,
      brightRed: `#f14c4c`,
      brightWhite: `#ffffff`,
      brightYellow: `#f5f543`,
      cursor: `#d4d4d4`,
      cursorAccent: `#1e1e1e`,
      cyan: `#11a8cd`,
      foreground: `#d4d4d4`,
      green: `#0dbc79`,
      magenta: `#bc3fbc`,
      red: `#cd3131`,
      selectionBackground: `#264f78`,
      white: `#e5e5e5`,
      yellow: `#e5e510`,
    };
  }),
  ig = t(() => {});
function ag(e) {
  if (!e) return [];
  let t = new Set();
  return (
    e
      .match(/"[^"]+"|'[^']+'|[^,]+/g)
      ?.map((e) => e.trim().replace(/^['"]|['"]$/g, ``))
      .filter((e) => e.length > 0)
      .filter((e) => !yg.has(e.toLowerCase()))
      .filter((e) => (t.has(e) ? !1 : (t.add(e), !0))) ?? []
  );
}
function og(e, t) {
  return e.length === 0
    ? `Type to search`
    : t.resultCount === 0 || t.resultIndex < 0
      ? `No matches`
      : `${String(t.resultIndex + 1)} / ${String(t.resultCount)}`;
}
var $,
  sg,
  cg,
  lg,
  ug,
  dg,
  fg,
  pg,
  mg,
  hg,
  gg,
  _g,
  vg,
  yg,
  bg,
  xg = t(() => {
    (($ = e(n())),
      i(),
      M(),
      ie(),
      kt(),
      Wn(),
      Yn(),
      Fs(),
      Xh(),
      Zh(),
      $h(),
      v(),
      rg(),
      ig(),
      (sg = r()),
      (cg = /Mac|iPhone|iPad|iPod/.test(navigator.platform)),
      (lg = 3e3),
      (ug = 2e3),
      (dg = 100),
      (fg = 250),
      (pg = 200),
      (mg = 250),
      (hg = 2e3),
      (gg = 1e3),
      (_g = { resultCount: 0, resultIndex: -1 }),
      (vg = {
        activeMatchBackground: `#ffd166`,
        activeMatchBorder: `#ff9f1c`,
        activeMatchColorOverviewRuler: `#ff9f1c`,
        matchBackground: `#a0c4ff`,
        matchBorder: `#4a7bd1`,
        matchOverviewRuler: `#4a7bd1`,
      }),
      (yg = new Set([
        `cursive`,
        `emoji`,
        `fangsong`,
        `fantasy`,
        `math`,
        `monospace`,
        `sans-serif`,
        `serif`,
        `system-ui`,
        `ui-monospace`,
        `ui-rounded`,
        `ui-sans-serif`,
        `ui-serif`,
      ])),
      (bg = ({
        autoFocusRequest: e,
        connection: t,
        debugLog: n,
        debuggingMode: r,
        isFocused: i,
        isVisible: o,
        onActivate: s,
        pane: c,
        refreshRequestId: l,
        terminalAppearance: u,
      }) => {
        let d = (0, $.useRef)(null),
          f = (0, $.useRef)(n),
          p = (0, $.useRef)(r),
          m = (0, $.useRef)(null),
          h = (0, $.useRef)(void 0),
          g = (0, $.useRef)(l),
          v = (0, $.useRef)(o),
          y = (0, $.useRef)(!1),
          b = (0, $.useRef)(void 0),
          x = (0, $.useRef)(null),
          S = (0, $.useRef)(null),
          C = (0, $.useRef)(null),
          w = (0, $.useRef)(null),
          T = (0, $.useRef)(null),
          E = (0, $.useRef)(null),
          [D, ee] = (0, $.useState)(!1),
          [O, k] = (0, $.useState)(!1),
          [A, te] = (0, $.useState)(``),
          [M, N] = (0, $.useState)(!1),
          [ne, ie] = (0, $.useState)(_g),
          [ae, oe] = (0, $.useState)(!1);
        ((0, $.useEffect)(() => {
          f.current = n;
        }, [n]),
          (0, $.useEffect)(() => {
            p.current = r;
          }, [r]),
          (0, $.useEffect)(() => {
            v.current = o;
          }, [o]));
        let P = (e, t) => {
            (_(p.current, e, t), f.current?.(e, t));
          },
          se = async (e, t) => {
            let n = ag(e);
            if (n.length === 0) {
              P(`terminal.webFontsLoadSkipped`, {
                fontFamily: e,
                reason: t,
                sessionId: c.sessionId,
              });
              return;
            }
            let r = performance.now();
            P(`terminal.webFontsLoadStart`, {
              documentFontsStatus: document.fonts?.status,
              families: n,
              fontFamily: e,
              reason: t,
              sessionId: c.sessionId,
            });
            try {
              (await Jn(n),
                P(`terminal.webFontsLoadSuccess`, {
                  documentFontsStatus: document.fonts?.status,
                  durationMs: Math.round(performance.now() - r),
                  families: n,
                  fontFamily: e,
                  reason: t,
                  sessionId: c.sessionId,
                }));
            } catch (i) {
              P(`terminal.webFontsLoadError`, {
                documentFontsStatus: document.fonts?.status,
                durationMs: Math.round(performance.now() - r),
                families: n,
                fontFamily: e,
                message: i instanceof Error ? i.message : String(i),
                reason: t,
                sessionId: c.sessionId,
              });
            }
          },
          ce = (e) => ({ caseSensitive: O, decorations: vg, incremental: e, regex: M }),
          le = () => {
            requestAnimationFrame(() => {
              (C.current?.focus(), C.current?.select());
            });
          },
          ue = () => {
            (ee(!0), le());
          },
          de = () => {
            (ee(!1),
              S.current?.clearDecorations(),
              ie(_g),
              requestAnimationFrame(() => {
                T.current?.focus();
              }));
          };
        return (
          (0, $.useEffect)(() => {
            if (!d.current) return;
            let e = new Yh({
              allowProposedApi: !0,
              ...Qh(u),
              theme: tg(),
              fontWeight: `300`,
              fontWeightBold: `500`,
              scrollback: 2e5,
            });
            T.current = e;
            let n = new re();
            ((m.current = n), e.loadAddon(n));
            let r = new Ot({ highlightLimit: 1e3 });
            ((S.current = r), e.loadAddon(r));
            let i = new Un();
            (e.loadAddon(i), (e.unicode.activeVersion = `11`));
            let a = `unknown`,
              o = () => {
                e.focus();
              };
            window.addEventListener(`focus`, o);
            let s = !1,
              l,
              f,
              p = 0,
              h = [],
              g = !1,
              _,
              C,
              D = 0,
              ee = !1,
              O = 0,
              k = 0,
              A,
              te,
              M = 0,
              N = 0,
              ne = 0,
              ae = 0,
              ce,
              le = 0,
              ue = 0,
              de = r.onDidChangeResults((e) => {
                ie({ resultCount: e.resultCount, resultIndex: e.resultIndex });
              }),
              fe = () => {
                let t = d.current;
                if (!t || !y.current || !v.current || e.rows <= 0) {
                  oe(!1);
                  return;
                }
                let n = t.getBoundingClientRect();
                if (n.height <= 0) {
                  oe(!1);
                  return;
                }
                let r = n.height / e.rows,
                  i = e.buffer.active;
                oe(Math.max(0, i.baseY - i.viewportY) * r > pg);
              };
            E.current = fe;
            let pe = (e) => {
                if (!l) {
                  h.push(e);
                  return;
                }
                if (l.readyState === WebSocket.OPEN) {
                  l.send(e);
                  return;
                }
                l.readyState === WebSocket.CONNECTING && h.push(e);
              },
              me = () => {
                let t = e.getSelection();
                return t ? (navigator.clipboard.writeText(t).catch(() => {}), !0) : !1;
              },
              he = async () => {
                try {
                  let e = await navigator.clipboard.readText();
                  e && pe(e);
                } catch {}
              },
              ge = () => {
                ((ee = !0), he());
              },
              _e = () => {
                if (!y.current) return;
                let t = d.current;
                if (!t) return;
                let r = t.getBoundingClientRect();
                r.width <= 0 ||
                  r.height <= 0 ||
                  ((b.current = { height: Math.round(r.height), width: Math.round(r.width) }),
                  n.fit(),
                  e.refresh(0, e.rows - 1));
              },
              ve = () => {
                f !== void 0 && (window.clearTimeout(f), (f = void 0));
              },
              ye = () => {
                ce !== void 0 && (window.clearTimeout(ce), (ce = void 0));
              },
              be = () => {
                C !== void 0 && (window.clearTimeout(C), (C = void 0));
              },
              xe = () => {
                ((A = void 0),
                  (te = void 0),
                  (M = 0),
                  (N = 0),
                  (ne = 0),
                  (ae = 0),
                  (le = 0),
                  (ue = 0),
                  ye());
              },
              Se = (t) => {
                A &&
                  (P(`terminal.connectionSummary`, {
                    binaryBytes: M,
                    binaryChunks: N,
                    cols: e.cols,
                    connectionId: k,
                    flushBytes: ne,
                    flushCount: ae,
                    largestFlushBytes: le,
                    msSinceFirstBinary: te === void 0 ? void 0 : Math.round(performance.now() - te),
                    msSinceSocketOpen: Math.round(performance.now() - A),
                    reason: t,
                    rendererMode: a,
                    resizeCount: ue,
                    rows: e.rows,
                    sessionId: c.sessionId,
                  }),
                  t !== `idle` && xe());
              },
              Ce = () => {
                (ye(),
                  (ce = window.setTimeout(() => {
                    Se(`idle`);
                  }, gg)));
              },
              we = (e) => {
                A &&
                  (te === void 0 &&
                    ((te = performance.now()),
                    P(`terminal.socketFirstBinaryData`, {
                      byteLength: e,
                      connectionId: k,
                      msAfterSocketOpen: Math.round(te - A),
                      rendererMode: a,
                      sessionId: c.sessionId,
                    })),
                  (M += e),
                  (N += 1),
                  (ne += e),
                  (ae += 1),
                  (le = Math.max(le, e)),
                  Ce());
              },
              Te = () => {
                g &&
                  ((g = !1),
                  _ !== void 0 && window.clearTimeout(_),
                  (_ = window.setTimeout(() => {
                    if (((_ = void 0), !s)) {
                      if (!v.current) {
                        ((b.current = void 0),
                          P(`terminal.reconnectRepairDeferredHidden`, { sessionId: c.sessionId }));
                        return;
                      }
                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          s || (_e(), Ee());
                        });
                      });
                    }
                  }, lg)));
              },
              Ee = (t) => {
                let n = d.current;
                if (!n) return;
                let r = n.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) return;
                (ve(), (p += 1));
                let i = p,
                  a = r.height / Math.max(1, e.rows),
                  o = Math.max(1, Math.round(dg / a)),
                  l = () => {
                    s ||
                      i !== p ||
                      (ve(),
                      _e(),
                      fe(),
                      P(`terminal.reconnectNudgeRestore`, {
                        cols: e.cols,
                        rowNudge: o,
                        rows: e.rows,
                        sessionId: c.sessionId,
                      }),
                      t?.());
                  };
                (P(`terminal.reconnectNudgeStart`, {
                  cols: e.cols,
                  rowNudge: o,
                  rows: e.rows,
                  sessionId: c.sessionId,
                }),
                  e.resize(e.cols, e.rows + o),
                  e.refresh(0, e.rows - 1),
                  (f = window.setTimeout(() => {
                    l();
                  }, fg)),
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      l();
                    });
                  }));
              };
            x.current = Ee;
            let De = () => {
              if (t.mock || l || s) return;
              let n = new URL(`/session`, t.baseUrl);
              (n.searchParams.set(`token`, t.token),
                n.searchParams.set(`workspaceId`, t.workspaceId),
                n.searchParams.set(`sessionId`, c.sessionId),
                n.searchParams.set(`cols`, String(e.cols)),
                n.searchParams.set(`rows`, String(e.rows)),
                w.current?.dispose(),
                (w.current = null),
                e.reset());
              let r = new WebSocket(n.toString());
              ((l = r), (r.binaryType = `arraybuffer`));
              let i = new j(r, { bidirectional: !1 });
              ((w.current = i),
                e.loadAddon(i),
                r.addEventListener(`message`, (e) => {
                  if (typeof e.data == `string`) {
                    (we(new TextEncoder().encode(e.data).byteLength),
                      Te(),
                      requestAnimationFrame(() => {
                        fe();
                      }));
                    return;
                  }
                  if (e.data instanceof ArrayBuffer) {
                    (we(e.data.byteLength),
                      Te(),
                      requestAnimationFrame(() => {
                        fe();
                      }));
                    return;
                  }
                  e.data instanceof Blob &&
                    e.data.arrayBuffer().then((e) => {
                      (we(e.byteLength),
                        Te(),
                        requestAnimationFrame(() => {
                          fe();
                        }));
                    });
                }),
                (r.onopen = () => {
                  ((O += 1),
                    (k = O),
                    (D = 0),
                    be(),
                    xe(),
                    (A = performance.now()),
                    P(`terminal.socketOpen`, {
                      cols: e.cols,
                      connectionId: k,
                      rendererMode: a,
                      rows: e.rows,
                      sessionId: c.sessionId,
                    }));
                  for (let e of h) l?.send(e);
                  ((h = []), (g = !0));
                }));
              let o = (e) => {
                if (s || t.mock || C !== void 0) return;
                let n = Math.min(hg, mg * 2 ** D);
                ((D += 1),
                  P(`terminal.socketReconnectScheduled`, {
                    attempt: D,
                    delayMs: n,
                    reason: e,
                    sessionId: c.sessionId,
                  }),
                  (C = window.setTimeout(() => {
                    ((C = void 0), De());
                  }, n)));
              };
              ((r.onclose = () => {
                (Se(`close`),
                  P(`terminal.socketClose`, { connectionId: k, sessionId: c.sessionId }),
                  (g = !1),
                  _ !== void 0 && (window.clearTimeout(_), (_ = void 0)),
                  w.current === i && (w.current.dispose(), (w.current = null)),
                  l === r && (l = void 0),
                  o(`close`));
              }),
                (r.onerror = () => {
                  (Se(`error`),
                    P(`terminal.socketError`, { connectionId: k, sessionId: c.sessionId }),
                    (g = !1),
                    _ !== void 0 && (window.clearTimeout(_), (_ = void 0)),
                    w.current === i && (w.current.dispose(), (w.current = null)),
                    l === r && (l = void 0),
                    o(`error`));
                }));
            };
            (se(u.fontFamily, `initial`).finally(() => {
              if (!(s || !d.current)) {
                (e.open(d.current), (y.current = !0));
                try {
                  let t = new Ps();
                  ((a = `webgl`),
                    P(`terminal.rendererReady`, { rendererMode: a, sessionId: c.sessionId }),
                    t.onContextLoss(() => {
                      ((a = `fallback`),
                        P(`terminal.rendererContextLoss`, { sessionId: c.sessionId }),
                        t.dispose());
                    }),
                    e.loadAddon(t));
                } catch (e) {
                  ((a = `fallback`),
                    P(`terminal.rendererReady`, {
                      message: e instanceof Error ? e.message : String(e),
                      rendererMode: a,
                      sessionId: c.sessionId,
                    }));
                }
                (document.hasFocus() && e.focus(),
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      s ||
                        (P(`terminal.initialFit`, { cols: e.cols, sessionId: c.sessionId }),
                        _e(),
                        fe(),
                        De());
                    });
                  }));
              }
            }),
              t.mock &&
                (P(`terminal.mockConnected`, { sessionId: c.sessionId }),
                c.snapshot?.history !== void 0 &&
                  (P(`terminal.applyHistory`, {
                    historyLength: c.snapshot.history.length,
                    sessionId: c.sessionId,
                  }),
                  e.write(c.snapshot.history))),
              e.attachCustomKeyEventHandler((e) => {
                if (e.key === `Enter` && e.shiftKey)
                  return (e.type === `keydown` && pe(`\x1B[13;2u`), !1);
                if (cg && e.type === `keydown` && e.metaKey) {
                  if (e.key === `ArrowLeft`) return (pe(``), !1);
                  if (e.key === `ArrowRight`) return (pe(``), !1);
                }
                let t = cg ? e.metaKey : e.ctrlKey;
                if (e.type === `keydown` && t) {
                  let t = e.key.toLowerCase();
                  if (t === `c` && me()) return !1;
                  if (t === `v`) return (ge(), !1);
                  if (!cg && e.shiftKey) {
                    if (t === `c` && me()) return !1;
                    if (t === `v`) return (ge(), !1);
                  }
                }
                return e.type === `keydown` && e.shiftKey && e.key === `Insert`
                  ? (ge(), !1)
                  : !(
                      e.type === `keydown` &&
                      e.metaKey &&
                      (e.key === `t` || (e.key >= `1` && e.key <= `9`))
                    );
              }),
              e.onData((e) => {
                pe(e);
              }),
              e.onResize(({ cols: e, rows: t }) => {
                ue += 1;
                let n = { cols: e, rows: t, sessionId: c.sessionId, type: `terminalResize` };
                pe(JSON.stringify(n));
              }));
            let Oe = (t) => {
                let n = e.getSelection();
                n &&
                  (t.clipboardData?.setData(`text/plain`, n),
                  t.preventDefault(),
                  t.stopImmediatePropagation());
              },
              ke = (e) => {
                if (ee) {
                  ((ee = !1), e.preventDefault(), e.stopImmediatePropagation());
                  return;
                }
                let t = e.clipboardData?.getData(`text/plain`);
                t && (pe(t), e.preventDefault(), e.stopImmediatePropagation());
              };
            (d.current.addEventListener(`copy`, Oe, !0),
              d.current.addEventListener(`paste`, ke, !0));
            let Ae = e.onScroll(() => {
                requestAnimationFrame(() => {
                  fe();
                });
              }),
              je = 0,
              Me = new ResizeObserver((e) => {
                let t = e[0];
                if (!t) return;
                let { height: r, width: i } = t.contentRect;
                if (i > 0 && r > 0) {
                  let e = { height: Math.round(r), width: Math.round(i) },
                    t = b.current;
                  if (!y.current || (t && t.width === e.width && t.height === e.height)) return;
                  ((b.current = e),
                    cancelAnimationFrame(je),
                    (je = requestAnimationFrame(() => {
                      (P(`terminal.resizeObserverFit`, {
                        height: e.height,
                        sessionId: c.sessionId,
                        width: e.width,
                      }),
                        n.fit());
                    })));
                }
              });
            Me.observe(d.current);
            let Ne = () => {
                e.options.theme = tg();
              },
              Pe = new MutationObserver(() => {
                Ne();
              });
            return (
              Pe.observe(document.documentElement, {
                attributeFilter: [`class`, `data-vscode-theme-id`, `style`],
                attributes: !0,
              }),
              document.body &&
                Pe.observe(document.body, {
                  attributeFilter: [`class`, `data-vscode-theme-id`, `style`],
                  attributes: !0,
                }),
              () => {
                ((s = !0),
                  _ !== void 0 && window.clearTimeout(_),
                  ve(),
                  ye(),
                  be(),
                  cancelAnimationFrame(je),
                  window.removeEventListener(`focus`, o),
                  Me.disconnect(),
                  Pe.disconnect(),
                  Ae.dispose(),
                  de.dispose(),
                  d.current?.removeEventListener(`copy`, Oe, !0),
                  d.current?.removeEventListener(`paste`, ke, !0),
                  w.current?.dispose(),
                  (w.current = null),
                  l?.close(),
                  e.dispose(),
                  (y.current = !1),
                  (b.current = void 0),
                  (x.current = null),
                  (S.current = null),
                  (T.current = null),
                  (m.current = null),
                  (E.current = null),
                  oe(!1));
              }
            );
          }, [t.baseUrl, t.token, c.sessionId]),
          (0, $.useEffect)(() => {
            let e = T.current;
            if (!e || !y.current) return;
            let t = !1;
            return (
              se(u.fontFamily, `appearance`).finally(() => {
                t ||
                  !T.current ||
                  !y.current ||
                  ((e.options = Qh(u)),
                  m.current?.fit(),
                  e.refresh(0, e.rows - 1),
                  requestAnimationFrame(() => {
                    E.current?.();
                  }));
              }),
              () => {
                t = !0;
              }
            );
          }, [
            u.cursorBlink,
            u.cursorStyle,
            u.fontFamily,
            u.fontSize,
            u.letterSpacing,
            u.lineHeight,
          ]),
          (0, $.useEffect)(() => {
            if (!o) {
              ((b.current = void 0), oe(!1));
              return;
            }
            let e = window.setTimeout(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  let e = d.current,
                    t = T.current;
                  if (!e || !t) return;
                  let n = e.getBoundingClientRect();
                  n.width <= 0 ||
                    n.height <= 0 ||
                    ((b.current = { height: Math.round(n.height), width: Math.round(n.width) }),
                    m.current?.fit(),
                    t.refresh(0, t.rows - 1),
                    E.current?.());
                });
              });
            }, ug);
            return () => {
              window.clearTimeout(e);
            };
          }, [o, c.sessionId]),
          (0, $.useEffect)(() => {
            g.current !== l &&
              ((g.current = l),
              (b.current = void 0),
              o &&
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    let e = d.current,
                      t = T.current;
                    if (!e || !t) return;
                    let n = e.getBoundingClientRect();
                    n.width <= 0 ||
                      n.height <= 0 ||
                      ((b.current = { height: Math.round(n.height), width: Math.round(n.width) }),
                      x.current?.(() => {
                        (t.refresh(0, t.rows - 1),
                          requestAnimationFrame(() => {
                            E.current?.();
                          }));
                      }));
                  });
                }));
          }, [o, l]),
          (0, $.useEffect)(() => {
            i || !D || de();
          }, [i, D]),
          (0, $.useEffect)(() => {
            D && le();
          }, [D]),
          (0, $.useEffect)(() => {
            if (!D) return;
            let e = S.current;
            if (e) {
              if (A.length === 0) {
                (e.clearDecorations(), ie(_g));
                return;
              }
              e.findNext(A, ce(!0)) || ie(_g);
            }
          }, [D, O, A, M]),
          (0, $.useEffect)(() => {
            if (!e || h.current === e.requestId || !o) return;
            let t = T.current;
            t &&
              ((h.current = e.requestId),
              requestAnimationFrame(() => {
                (t.focus(),
                  P(`terminal.autoFocusRequestApplied`, {
                    requestId: e.requestId,
                    sessionId: c.sessionId,
                    source: e.source,
                  }));
              }));
          }, [e, o, c.sessionId]),
          (0, sg.jsxs)(`div`, {
            className: `terminal-pane-root ${o ? `` : `terminal-pane-root-hidden`}`.trim(),
            onKeyDownCapture: (e) => {
              !(cg ? e.metaKey : e.ctrlKey) ||
                e.key.toLowerCase() !== `f` ||
                (e.preventDefault(), e.stopPropagation(), ue());
            },
            onMouseDown: (e) => {
              (e.stopPropagation(),
                P(`terminal.mouseActivate`, { sessionId: c.sessionId }),
                s(),
                T.current?.focus());
            },
            children: [
              (0, sg.jsx)(`div`, { className: `terminal-pane-canvas terminal-tab`, ref: d }),
              D
                ? (0, sg.jsxs)(`div`, {
                    className: `terminal-pane-search`,
                    onMouseDown: (e) => {
                      e.stopPropagation();
                    },
                    children: [
                      (0, sg.jsx)(`input`, {
                        "aria-label": `Search terminal output`,
                        className: `terminal-pane-search-input`,
                        onChange: (e) => {
                          te(e.target.value);
                        },
                        onKeyDown: (e) => {
                          if (e.key === `Escape`) {
                            (e.preventDefault(), e.stopPropagation(), de());
                            return;
                          }
                          if (
                            e.key !== `Enter` ||
                            (e.preventDefault(), e.stopPropagation(), A.length === 0)
                          )
                            return;
                          let t = S.current;
                          if (t) {
                            if (e.shiftKey) {
                              t.findPrevious(A, ce(!1));
                              return;
                            }
                            t.findNext(A, ce(!1));
                          }
                        },
                        placeholder: `Find in terminal`,
                        ref: C,
                        spellCheck: !1,
                        type: `text`,
                        value: A,
                      }),
                      (0, sg.jsx)(`div`, {
                        className: `terminal-pane-search-status`,
                        children: og(A, ne),
                      }),
                      (0, sg.jsx)(`button`, {
                        "aria-label": `Toggle case-sensitive search`,
                        "aria-pressed": O,
                        className:
                          `terminal-pane-search-toggle ${O ? `terminal-pane-search-toggle-active` : ``}`.trim(),
                        onClick: (e) => {
                          (e.stopPropagation(), k((e) => !e));
                        },
                        type: `button`,
                        children: `Aa`,
                      }),
                      (0, sg.jsx)(`button`, {
                        "aria-label": `Toggle regex search`,
                        "aria-pressed": M,
                        className:
                          `terminal-pane-search-toggle ${M ? `terminal-pane-search-toggle-active` : ``}`.trim(),
                        onClick: (e) => {
                          (e.stopPropagation(), N((e) => !e));
                        },
                        type: `button`,
                        children: `.*`,
                      }),
                      (0, sg.jsx)(`button`, {
                        className: `terminal-pane-search-button`,
                        onClick: (e) => {
                          (e.stopPropagation(),
                            A.length !== 0 && S.current?.findPrevious(A, ce(!1)));
                        },
                        type: `button`,
                        children: `Prev`,
                      }),
                      (0, sg.jsx)(`button`, {
                        className: `terminal-pane-search-button`,
                        onClick: (e) => {
                          (e.stopPropagation(), A.length !== 0 && S.current?.findNext(A, ce(!1)));
                        },
                        type: `button`,
                        children: `Next`,
                      }),
                      (0, sg.jsx)(`button`, {
                        className: `terminal-pane-search-close`,
                        onClick: (e) => {
                          (e.stopPropagation(), de());
                        },
                        type: `button`,
                        children: `Close`,
                      }),
                    ],
                  })
                : null,
              o && ae
                ? (0, sg.jsx)(`button`, {
                    "aria-label": `Scroll terminal to bottom`,
                    className: `terminal-pane-scroll-to-bottom`,
                    onClick: (e) => {
                      (e.stopPropagation(),
                        T.current?.focus(),
                        T.current?.scrollToBottom(),
                        x.current?.(() => {
                          (T.current?.scrollToBottom(),
                            requestAnimationFrame(() => {
                              E.current?.();
                            }));
                        }));
                    },
                    type: `button`,
                    children: (0, sg.jsx)(a, { "aria-hidden": !0, size: 16, stroke: 1.8 }),
                  })
                : null,
            ],
          })
        );
      }),
      (bg.__docgenInfo = { description: ``, methods: [], displayName: `TerminalPane` }));
  }),
  Sg,
  Cg,
  wg,
  Tg = t(() => {
    ((Sg = e(n())),
      (Cg = r()),
      (wg = ({ autoFocusRequest: e, isFocused: t, onFocus: n, pane: r }) => {
        let i = (0, Sg.useRef)(null),
          a = (0, Sg.useRef)(void 0),
          o = (0, Sg.useRef)(void 0),
          s = (0, Sg.useRef)(t),
          c = () => {
            i.current?.contentWindow?.postMessage({ type: `focusComposer` }, `*`);
          };
        return (
          (0, Sg.useEffect)(() => {
            let e = new Blob([r.html], { type: `text/html` }),
              t = URL.createObjectURL(e);
            return (
              (a.current = t),
              i.current && (i.current.src = t),
              () => {
                a.current &&= (URL.revokeObjectURL(a.current), void 0);
              }
            );
          }, [r.html]),
          (0, Sg.useEffect)(() => {
            let e = s.current;
            ((s.current = t), t && !e && c());
          }, [t, r.sessionId]),
          (0, Sg.useEffect)(() => {
            !t || !e || o.current === e.requestId || ((o.current = e.requestId), c());
          }, [e, t]),
          (0, Cg.jsx)(`div`, {
            className: `t3-pane-root`,
            onMouseDown: n,
            children: (0, Cg.jsx)(`iframe`, {
              className: `t3-pane-frame`,
              onLoad: () => {
                t && c();
              },
              ref: i,
              sandbox: `allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads`,
              title: r.sessionRecord.title,
            }),
          })
        );
      }),
      (wg.__docgenInfo = { description: ``, methods: [], displayName: `T3Pane` }));
  });
function Eg(e) {
  let t = d(e.sessionRecord.title);
  if (t) return t;
  if (e.kind === `terminal`) {
    let t = s(e.terminalTitle);
    if (t) return t;
  }
  return e.sessionRecord.alias;
}
function Dg(e) {
  try {
    return JSON.stringify(e);
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : String(e),
      unserializable: !0,
    });
  }
}
function Og(e, t) {
  return e === `horizontal`
    ? `minmax(0, 1fr)`
    : e === `vertical`
      ? `repeat(${String(Math.max(1, t))}, minmax(0, 1fr))`
      : `repeat(6, minmax(0, 1fr))`;
}
function kg(e, t, n, r) {
  if (e === `horizontal`) return { gridColumn: `1 / -1`, gridRow: `${String(n)} / span 1` };
  if (e === `vertical`) return { gridColumn: `${String(r)} / span 1`, gridRow: `1 / span 1` };
  let i = t === 1 ? 6 : t === 2 ? 3 : 2,
    a = 1 + (r - 1) * i;
  return { gridColumn: `${String(a)} / span ${String(i)}`, gridRow: `${String(n)} / span 1` };
}
var Ag,
  jg,
  Mg,
  Ng,
  Pg = t(() => {
    ((Ag = e(n())),
      g(),
      c(),
      v(),
      C(),
      E(),
      A(),
      xg(),
      Tg(),
      (jg = r()),
      (Mg = ({ messageSource: e = window, vscode: t }) => {
        let [n, r] = (0, Ag.useState)(
            () =>
              typeof document < `u` &&
              document.visibilityState === `visible` &&
              document.hasFocus(),
          ),
          [i, a] = (0, Ag.useState)(),
          [o, s] = (0, Ag.useState)(),
          [c, u] = (0, Ag.useState)(),
          [d, p] = (0, Ag.useState)(),
          [m, h] = (0, Ag.useState)(),
          [g, v] = (0, Ag.useState)(0),
          y = (0, Ag.useRef)(0),
          b = (0, Ag.useRef)(void 0),
          x = (0, Ag.useRef)(void 0),
          S = i && (i.type === `hydrate` || i.type === `sessionState`) ? i : void 0,
          C = (e, n, r) => {
            (_(e, n, r),
              e &&
                t.postMessage({
                  details: r ? Dg(r) : void 0,
                  event: n,
                  type: `workspaceDebugLog`,
                }));
          };
        ((0, Ag.useEffect)(() => {
          let e = () => {
            r(document.visibilityState === `visible` && document.hasFocus());
          };
          return (
            e(),
            window.addEventListener(`blur`, e),
            window.addEventListener(`focus`, e),
            window.addEventListener(`focusin`, e),
            window.addEventListener(`focusout`, e),
            document.addEventListener(`visibilitychange`, e),
            () => {
              (window.removeEventListener(`blur`, e),
                window.removeEventListener(`focus`, e),
                window.removeEventListener(`focusin`, e),
                window.removeEventListener(`focusout`, e),
                document.removeEventListener(`visibilitychange`, e));
            }
          );
        }, []),
          (0, Ag.useEffect)(() => {
            let n = (e) => {
                (C(e.debuggingMode, `message.received`, {
                  activeGroupId: e.activeGroupId,
                  focusedSessionId: e.focusedSessionId,
                  paneIds: e.panes.map((e) => e.sessionId),
                  pendingFocusRequest:
                    b.current && e.focusedSessionId === b.current.sessionId
                      ? {
                          durationMs: Math.round(performance.now() - b.current.startedAt),
                          requestId: b.current.requestId,
                          sessionId: b.current.sessionId,
                        }
                      : void 0,
                  type: e.type,
                }),
                  b.current &&
                    e.focusedSessionId === b.current.sessionId &&
                    C(e.debuggingMode, `focus.messageMatchedPendingRequest`, {
                      durationMs: Math.round(performance.now() - b.current.startedAt),
                      requestId: b.current.requestId,
                      sessionId: b.current.sessionId,
                    }),
                  a(e));
              },
              r = (e) => {
                let t = e.data;
                if (t) {
                  if (t.type === `terminalPresentationChanged`) {
                    a((e) =>
                      !e || (e.type !== `hydrate` && e.type !== `sessionState`)
                        ? e
                        : {
                            ...e,
                            panes: e.panes.map((e) =>
                              e.kind !== `terminal` || e.sessionId !== t.sessionId
                                ? e
                                : {
                                    ...e,
                                    snapshot: t.snapshot ?? e.snapshot,
                                    terminalTitle: t.terminalTitle,
                                  },
                            ),
                          },
                    );
                    return;
                  }
                  (t.type !== `hydrate` && t.type !== `sessionState`) || n(t);
                }
              },
              i = (e) => {
                e.data?.type !== `vsmuxT3Focus` ||
                  typeof e.data.sessionId != `string` ||
                  t.postMessage({ sessionId: e.data.sessionId, type: `focusSession` });
              },
              o = (e) => {
                e instanceof MessageEvent && r(e);
              };
            return (
              e.addEventListener(`message`, o),
              window.addEventListener(`message`, i),
              t.postMessage({ type: `ready` }),
              () => {
                (e.removeEventListener(`message`, o), window.removeEventListener(`message`, i));
              }
            );
          }, [e, t]));
        let w = (0, Ag.useMemo)(() => S?.panes ?? [], [S]),
          T = w.map((e) => e.sessionId).join(`|`),
          E = (0, Ag.useMemo)(() => (c ? O(w, c) : w), [c, w]),
          k = (0, Ag.useMemo)(() => E.filter((e) => e.isVisible), [E]),
          A = (0, Ag.useMemo)(() => {
            let e = S?.viewMode ?? `grid`,
              t = f(Math.max(1, k.length), e).rowLengths,
              n = new Map(),
              r = 0,
              i = 1;
            for (let a of t) {
              let t = k.slice(r, r + a),
                o = 1;
              for (let r of t) {
                let t = kg(e, a, i, o);
                (n.set(r.sessionId, { gridColumn: t.gridColumn, gridRow: t.gridRow }), (o += 1));
              }
              ((r += a), (i += 1));
            }
            return n;
          }, [k, S?.viewMode]),
          te = o ?? S?.focusedSessionId,
          j = (0, Ag.useMemo)(() => k.map((e) => e.sessionId), [k]);
        j.join(`|`);
        let M = (0, Ag.useMemo)(
            () => E.filter((e) => e.kind === `terminal`).map((e) => e.sessionId),
            [E],
          ),
          N = (0, Ag.useMemo)(() => {
            let e = {
              "--workspace-active-pane-border-color": S?.layoutAppearance.activePaneBorderColor,
              "--workspace-pane-gap": `${String(S?.layoutAppearance.paneGap ?? 12)}px`,
            };
            return (
              k.length > 0 && (e.gridTemplateColumns = Og(S?.viewMode ?? `grid`, k.length)), e
            );
          }, [
            S?.layoutAppearance.activePaneBorderColor,
            S?.layoutAppearance.paneGap,
            S?.viewMode,
            k.length,
          ]);
        ((0, Ag.useEffect)(() => {
          if (S) {
            if (x.current)
              if (S.focusedSessionId === x.current) ((x.current = void 0), (b.current = void 0));
              else return;
            s((e) => (e === S.focusedSessionId ? e : S.focusedSessionId));
          }
        }, [S]),
          (0, Ag.useEffect)(() => {
            (u(void 0), p(void 0), h(void 0));
          }, [T, S?.activeGroupId]));
        let ne = (e) => {
            let n = ++y.current,
              r = performance.now();
            ((x.current = e),
              (b.current = { requestId: n, sessionId: e, startedAt: r }),
              C(S?.debuggingMode, `focus.requested`, { requestId: n, sessionId: e }),
              s(e),
              t.postMessage({ sessionId: e, type: `focusSession` }));
          },
          re = (e, n) => {
            if (!S) return;
            let r = S.workspaceSnapshot.groups.find((e) => e.groupId === S.activeGroupId);
            if (!r) return;
            let i = D(j, M, e, n);
            if (!i) return;
            let a = ee(
              l(r.snapshot).map((e) => e.sessionId),
              i,
            );
            a &&
              (u(i),
              t.postMessage({ groupId: S.activeGroupId, sessionIds: a, type: `syncSessionOrder` }));
          },
          ie = () => {
            (p(void 0), h(void 0));
          };
        return S
          ? (0, jg.jsxs)(`main`, {
              className:
                k.length === 0 ? `workspace-shell workspace-shell-empty` : `workspace-shell`,
              style: N,
              children: [
                E.map((e) =>
                  (0, jg.jsx)(
                    Ng,
                    {
                      connection: S.connection,
                      debugLog: (e, t) => C(S.debuggingMode, e, t),
                      debuggingMode: S.debuggingMode,
                      isFocused: te === e.sessionId,
                      isWorkspaceFocused: n,
                      layoutStyle: A.get(e.sessionId),
                      onLocalFocus: () => {
                        (C(S.debuggingMode, `focus.localFocusVisual`, { sessionId: e.sessionId }),
                          s(e.sessionId));
                      },
                      onFocus: () => ne(e.sessionId),
                      onClose: () =>
                        t.postMessage({ sessionId: e.sessionId, type: `closeSession` }),
                      pane: e,
                      refreshRequestId: g,
                      terminalAppearance: S.terminalAppearance,
                      canDrag: e.kind === `terminal` && e.isVisible && M.length > 1,
                      autoFocusRequest:
                        S.autoFocusRequest?.sessionId === e.sessionId ? S.autoFocusRequest : void 0,
                      isDragging: d === e.sessionId,
                      isDropTarget: m === e.sessionId && d !== e.sessionId,
                      onDragEnd: ie,
                      onDragOver: (t) => {
                        e.kind !== `terminal` ||
                          !e.isVisible ||
                          !d ||
                          d === e.sessionId ||
                          (t.preventDefault(),
                          (t.dataTransfer.dropEffect = `move`),
                          h(e.sessionId));
                      },
                      onDragStart: (t) => {
                        e.kind !== `terminal` ||
                          !e.isVisible ||
                          (p(e.sessionId),
                          h(void 0),
                          (t.dataTransfer.effectAllowed = `move`),
                          t.dataTransfer.setData(`text/plain`, e.sessionId));
                      },
                      onDrop: (t) => {
                        if (e.kind !== `terminal` || !e.isVisible) return;
                        t.preventDefault();
                        let n = d ?? t.dataTransfer.getData(`text/plain`);
                        (ie(), n && re(n, e.sessionId));
                      },
                      onRefreshAllTerminals: () => {
                        v((e) => e + 1);
                      },
                    },
                    e.sessionId,
                  ),
                ),
                k.length === 0
                  ? (0, jg.jsx)(`div`, {
                      className: `workspace-empty-state`,
                      children: `No sessions in this group.`,
                    })
                  : null,
              ],
            })
          : (0, jg.jsx)(`main`, {
              className: `workspace-shell workspace-shell-empty`,
              children: (0, jg.jsx)(`div`, {
                className: `workspace-empty-state`,
                children: `Loading VSmux workspace…`,
              }),
            });
      }),
      (Ng = ({
        autoFocusRequest: e,
        connection: t,
        debugLog: n,
        debuggingMode: r,
        isFocused: i,
        isWorkspaceFocused: a,
        canDrag: o,
        isDragging: s,
        isDropTarget: c,
        layoutStyle: l,
        onLocalFocus: u,
        onFocus: d,
        onClose: f,
        onDragEnd: p,
        onDragOver: m,
        onDragStart: h,
        onDrop: g,
        onRefreshAllTerminals: _,
        pane: v,
        refreshRequestId: y,
        terminalAppearance: b,
      }) => {
        let x = Eg(v);
        return (0, jg.jsxs)(`section`, {
          className: [
            `workspace-pane`,
            i && a ? `workspace-pane-focused` : ``,
            o ? `workspace-pane-reorderable` : ``,
            s ? `workspace-pane-dragging` : ``,
            c ? `workspace-pane-drop-target` : ``,
            v.isVisible ? `` : `workspace-pane-hidden`,
          ]
            .filter(Boolean)
            .join(` `),
          onDragOver: o ? m : void 0,
          onDrop: o ? g : void 0,
          onMouseDown: () => {
            (u(), i || (n(`focus.mouseDownRequestsFocus`, { sessionId: v.sessionId }), d()));
          },
          style: v.isVisible ? l : void 0,
          children: [
            (0, jg.jsxs)(`header`, {
              className: `workspace-pane-header ${o ? `workspace-pane-header-draggable` : ``}`,
              draggable: o,
              onDragEnd: o ? p : void 0,
              onDragStart: o ? h : void 0,
              children: [
                (0, jg.jsx)(`div`, { className: `workspace-pane-title`, children: x }),
                v.kind === `terminal`
                  ? (0, jg.jsxs)(`div`, {
                      className: `workspace-pane-header-actions`,
                      children: [
                        (0, jg.jsx)(T, { onRefresh: _ }),
                        (0, jg.jsx)(S, { onConfirmClose: f }),
                      ],
                    })
                  : null,
              ],
            }),
            (0, jg.jsx)(`div`, {
              className: `workspace-pane-body`,
              children:
                v.kind === `terminal`
                  ? (0, jg.jsx)(bg, {
                      autoFocusRequest: e,
                      connection: t,
                      debugLog: n,
                      debuggingMode: r,
                      isFocused: i,
                      isVisible: v.isVisible,
                      onActivate: () => {
                        (u(), i || d());
                      },
                      pane: v,
                      refreshRequestId: y,
                      terminalAppearance: b,
                    })
                  : (0, jg.jsx)(wg, { autoFocusRequest: e, isFocused: i, onFocus: d, pane: v }),
            }),
          ],
        });
      }),
      (Mg.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `WorkspaceApp`,
        props: { messageSource: { defaultValue: { value: `window`, computed: !0 }, required: !1 } },
      }));
  });
export { Pg as n, Mg as t };
