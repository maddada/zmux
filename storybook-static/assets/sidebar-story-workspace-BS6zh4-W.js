import { a as e, n as t, t as n } from "./chunk-BneVvdWh.js";
import { n as r, t as i } from "./iframe-D3MQgCEY.js";
import { t as a } from "./react-dom-BwSTbC-S.js";
function o(e, t) {
  let n = s.useRef(c);
  return (n.current === c && (n.current = e(t)), n);
}
var s,
  c,
  l = t(() => {
    ((s = e(r())), (c = {}));
  });
function u() {
  return _;
}
function d(e) {
  g.push(e);
}
function f(e) {
  let t = (t, n) => {
    let r = o(m).current,
      i;
    try {
      _ = r;
      for (let e of g) e.before(r);
      i = e(t, n);
      for (let e of g) e.after(r);
      r.didInitialize = !0;
    } finally {
      _ = void 0;
    }
    return i;
  };
  return ((t.displayName = e.displayName || e.name), t);
}
function p(e) {
  return h.forwardRef(f(e));
}
function m() {
  return { didInitialize: !1 };
}
var h,
  g,
  _,
  v = t(() => {
    ((h = e(r())), l(), (g = []), (_ = void 0));
  });
function y(e) {
  let t = b.useRef(!0);
  t.current && ((t.current = !1), e());
}
var b,
  x = t(() => {
    b = e(r());
  }),
  S,
  C,
  w,
  T = t(() => {
    ((S = e(r())), (C = () => {}), (w = typeof document < `u` ? S.useLayoutEffect : C));
  });
function E(e, t) {
  return function (n, ...r) {
    let i = new URL(e);
    return (
      i.searchParams.set(`code`, n.toString()),
      r.forEach((e) => i.searchParams.append(`args[]`, e)),
      `${t} error #${n}; visit ${i} for the full message.`
    );
  };
}
var D,
  ee = t(() => {
    D = E(`https://base-ui.com/production-error`, `Base UI`);
  });
function te(e) {
  let t = O.useContext(k);
  if (t === void 0 && !e) throw Error(D(72));
  return t;
}
var O,
  k,
  A = t(() => {
    (ee(), (O = e(r())), (k = O.createContext(void 0)));
  });
function ne(e) {
  j.useEffect(e, re);
}
var j,
  re,
  ie = t(() => {
    ((j = e(r())), (re = []));
  });
function ae() {
  let e = o(se.create).current;
  return (ne(e.disposeEffect), e);
}
var oe,
  se,
  ce = t(() => {
    (l(),
      ie(),
      (oe = 0),
      (se = class e {
        static create() {
          return new e();
        }
        currentId = oe;
        start(e, t) {
          (this.clear(),
            (this.currentId = setTimeout(() => {
              ((this.currentId = oe), t());
            }, e)));
        }
        isStarted() {
          return this.currentId !== oe;
        }
        clear = () => {
          this.currentId !== oe && (clearTimeout(this.currentId), (this.currentId = oe));
        };
        disposeEffect = () => this.clear;
      }));
  });
function M() {
  return typeof window < `u`;
}
function le(e) {
  return de(e) ? (e.nodeName || ``).toLowerCase() : `#document`;
}
function N(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function ue(e) {
  return ((de(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function de(e) {
  return M() ? e instanceof Node || e instanceof N(e).Node : !1;
}
function P(e) {
  return M() ? e instanceof Element || e instanceof N(e).Element : !1;
}
function fe(e) {
  return M() ? e instanceof HTMLElement || e instanceof N(e).HTMLElement : !1;
}
function pe(e) {
  return !M() || typeof ShadowRoot > `u`
    ? !1
    : e instanceof ShadowRoot || e instanceof N(e).ShadowRoot;
}
function me(e) {
  let { overflow: t, overflowX: n, overflowY: r, display: i } = xe(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== `inline` && i !== `contents`;
}
function he(e) {
  return /^(table|td|th)$/.test(le(e));
}
function ge(e) {
  try {
    if (e.matches(`:popover-open`)) return !0;
  } catch {}
  try {
    return e.matches(`:modal`);
  } catch {
    return !1;
  }
}
function _e(e) {
  let t = P(e) ? xe(e) : e;
  return (
    ke(t.transform) ||
    ke(t.translate) ||
    ke(t.scale) ||
    ke(t.rotate) ||
    ke(t.perspective) ||
    (!ye() && (ke(t.backdropFilter) || ke(t.filter))) ||
    De.test(t.willChange || ``) ||
    Oe.test(t.contain || ``)
  );
}
function ve(e) {
  let t = Ce(e);
  for (; fe(t) && !be(t); ) {
    if (_e(t)) return t;
    if (ge(t)) return null;
    t = Ce(t);
  }
  return null;
}
function ye() {
  return (
    (Ae ??= typeof CSS < `u` && CSS.supports && CSS.supports(`-webkit-backdrop-filter`, `none`)), Ae
  );
}
function be(e) {
  return /^(html|body|#document)$/.test(le(e));
}
function xe(e) {
  return N(e).getComputedStyle(e);
}
function Se(e) {
  return P(e)
    ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
    : { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function Ce(e) {
  if (le(e) === `html`) return e;
  let t = e.assignedSlot || e.parentNode || (pe(e) && e.host) || ue(e);
  return pe(t) ? t.host : t;
}
function we(e) {
  let t = Ce(e);
  return be(t) ? (e.ownerDocument ? e.ownerDocument.body : e.body) : fe(t) && me(t) ? t : we(t);
}
function Te(e, t, n) {
  (t === void 0 && (t = []), n === void 0 && (n = !0));
  let r = we(e),
    i = r === e.ownerDocument?.body,
    a = N(r);
  if (i) {
    let e = Ee(a);
    return t.concat(a, a.visualViewport || [], me(r) ? r : [], e && n ? Te(e) : []);
  } else return t.concat(r, Te(r, [], n));
}
function Ee(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
var De,
  Oe,
  ke,
  Ae,
  je = t(() => {
    ((De = /transform|translate|scale|rotate|perspective|filter/),
      (Oe = /paint|layout|strict|content/),
      (ke = (e) => !!e && e !== `none`));
  });
function Me() {
  if (!Fe) return { platform: ``, maxTouchPoints: -1 };
  let e = navigator.userAgentData;
  return e?.platform
    ? { platform: e.platform, maxTouchPoints: navigator.maxTouchPoints }
    : { platform: navigator.platform ?? ``, maxTouchPoints: navigator.maxTouchPoints ?? -1 };
}
function Ne() {
  if (!Fe) return ``;
  let e = navigator.userAgentData;
  return e && Array.isArray(e.brands)
    ? e.brands.map(({ brand: e, version: t }) => `${e}/${t}`).join(` `)
    : navigator.userAgent;
}
function Pe() {
  if (!Fe) return ``;
  let e = navigator.userAgentData;
  return e?.platform ? e.platform : (navigator.platform ?? ``);
}
var Fe,
  Ie,
  Le,
  Re,
  ze,
  Be,
  Ve,
  He = t(() => {
    ((Fe = typeof navigator < `u`),
      (Ie = Me()),
      (Le = Pe()),
      (Re = Ne()),
      typeof CSS > `u` || !CSS.supports || CSS.supports(`-webkit-backdrop-filter:none`),
      (Ie.platform === `MacIntel` && Ie.maxTouchPoints > 1) ||
        /iP(hone|ad|od)|iOS/.test(Ie.platform),
      Fe && /firefox/i.test(Re),
      (ze = Fe && /apple/i.test(navigator.vendor)),
      Fe && /Edg/i.test(Re),
      (Fe && /android/i.test(Le)) || /android/i.test(Re),
      (Be = Fe && Le.toLowerCase().startsWith(`mac`) && !navigator.maxTouchPoints),
      (Ve = Re.includes(`jsdom/`)));
  }),
  Ue,
  We,
  Ge = t(() => {
    ((Ue = `data-base-ui-focusable`),
      (We = `input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])`));
  });
function Ke(e) {
  let t = e.activeElement;
  for (; t?.shadowRoot?.activeElement != null; ) t = t.shadowRoot.activeElement;
  return t;
}
function qe(e, t) {
  if (!e || !t) return !1;
  let n = t.getRootNode?.();
  if (e.contains(t)) return !0;
  if (n && pe(n)) {
    let n = t;
    for (; n; ) {
      if (e === n) return !0;
      n = n.parentNode || n.host;
    }
  }
  return !1;
}
function Je(e, t) {
  if (!P(e)) return !1;
  let n = e;
  if (t.hasElement(n)) return !n.hasAttribute(`data-trigger-disabled`);
  for (let [, e] of t.entries()) if (qe(e, n)) return !e.hasAttribute(`data-trigger-disabled`);
  return !1;
}
function Ye(e) {
  return `composedPath` in e ? e.composedPath()[0] : e.target;
}
function Xe(e, t) {
  if (t == null) return !1;
  if (`composedPath` in e) return e.composedPath().includes(t);
  let n = e;
  return n.target != null && t.contains(n.target);
}
function Ze(e) {
  return e.matches(`html,body`);
}
function Qe(e) {
  return (
    fe(e) &&
    e.matches(
      `input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])`,
    )
  );
}
function $e(e) {
  if (!e || Ve) return !0;
  try {
    return e.matches(`:focus-visible`);
  } catch {
    return !0;
  }
}
var et = t(() => {
  (je(), He(), Ge());
});
function tt(e, t, n = !0) {
  return e
    .filter((e) => e.parentId === t && (!n || e.context?.open))
    .flatMap((t) => [t, ...tt(e, t.id, n)]);
}
var nt = t(() => {});
function rt(e) {
  return `nativeEvent` in e;
}
function it(e, t) {
  let n = [`mouse`, `pen`];
  return (t || n.push(``, void 0), n.includes(e));
}
function at(e) {
  let t = e.type;
  return t === `click` || t === `mousedown` || t === `keydown` || t === `keyup`;
}
var ot = t(() => {});
function st(e, t, n) {
  return Et(e, Tt(t, n));
}
function ct(e, t) {
  return typeof e == `function` ? e(t) : e;
}
function lt(e) {
  return e.split(`-`)[0];
}
function ut(e) {
  return e.split(`-`)[1];
}
function dt(e) {
  return e === `x` ? `y` : `x`;
}
function ft(e) {
  return e === `y` ? `height` : `width`;
}
function pt(e) {
  let t = e[0];
  return t === `t` || t === `b` ? `y` : `x`;
}
function mt(e) {
  return dt(pt(e));
}
function ht(e, t, n) {
  n === void 0 && (n = !1);
  let r = ut(e),
    i = mt(e),
    a = ft(i),
    o =
      i === `x`
        ? r === (n ? `end` : `start`)
          ? `right`
          : `left`
        : r === `start`
          ? `bottom`
          : `top`;
  return (t.reference[a] > t.floating[a] && (o = bt(o)), [o, bt(o)]);
}
function gt(e) {
  let t = bt(e);
  return [_t(e), t, _t(t)];
}
function _t(e) {
  return e.includes(`start`) ? e.replace(`start`, `end`) : e.replace(`end`, `start`);
}
function vt(e, t, n) {
  switch (e) {
    case `top`:
    case `bottom`:
      return n ? (t ? Mt : jt) : t ? jt : Mt;
    case `left`:
    case `right`:
      return t ? Nt : Pt;
    default:
      return [];
  }
}
function yt(e, t, n, r) {
  let i = ut(e),
    a = vt(lt(e), n === `start`, r);
  return (i && ((a = a.map((e) => e + `-` + i)), t && (a = a.concat(a.map(_t)))), a);
}
function bt(e) {
  let t = lt(e);
  return At[t] + e.slice(t.length);
}
function xt(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function St(e) {
  return typeof e == `number` ? { top: e, right: e, bottom: e, left: e } : xt(e);
}
function Ct(e) {
  let { x: t, y: n, width: r, height: i } = e;
  return { width: r, height: i, top: n, left: t, right: t + r, bottom: n + i, x: t, y: n };
}
var wt,
  Tt,
  Et,
  Dt,
  Ot,
  kt,
  At,
  jt,
  Mt,
  Nt,
  Pt,
  Ft = t(() => {
    ((wt = [`top`, `right`, `bottom`, `left`]),
      (Tt = Math.min),
      (Et = Math.max),
      (Dt = Math.round),
      (Ot = Math.floor),
      (kt = (e) => ({ x: e, y: e })),
      (At = { left: `right`, right: `left`, bottom: `top`, top: `bottom` }),
      (jt = [`left`, `right`]),
      (Mt = [`right`, `left`]),
      (Nt = [`top`, `bottom`]),
      (Pt = [`bottom`, `top`]));
  }),
  It = t(() => {});
function Lt(e) {
  return e?.ownerDocument || document;
}
var Rt = t(() => {
    je();
  }),
  zt = t(() => {}),
  Bt = t(() => {
    (et(), nt(), ot(), It(), zt());
  });
function Vt(e, t) {
  return t != null && !it(t) ? 0 : typeof e == `function` ? e() : e;
}
function Ht(e, t, n) {
  let r = Vt(e, n);
  return typeof r == `number` ? r : r?.[t];
}
function Ut(e) {
  return typeof e == `function` ? e() : e;
}
function Wt(e, t) {
  return t || e === `click` || e === `mousedown`;
}
var Gt = t(() => {
  Bt();
});
function Kt() {}
var qt,
  Jt = t(() => {
    (Object.freeze([]), (qt = Object.freeze({})));
  }),
  Yt,
  Xt,
  Zt,
  Qt,
  $t = t(() => {
    (Jt(),
      (Yt = { style: { transition: `none` } }),
      (Xt = `data-base-ui-swipe-ignore`),
      (Zt = `data-swipe-ignore`),
      `${Xt}`,
      `${Zt}`,
      (Qt = { fallbackAxisSide: `end` }));
  }),
  en,
  tn,
  nn,
  rn,
  an,
  on,
  sn,
  cn,
  ln = t(() => {
    ((en = `none`),
      (tn = `trigger-press`),
      (nn = `trigger-hover`),
      (rn = `trigger-focus`),
      (an = `outside-press`),
      (on = `escape-key`),
      (sn = `disabled`),
      (cn = `imperative-action`));
  }),
  un = t(() => {
    ln();
  });
function dn(e, t, n, r) {
  let i = !1,
    a = !1,
    o = r ?? qt;
  return {
    reason: e,
    event: t ?? new Event(`base-ui`),
    cancel() {
      i = !0;
    },
    allowPropagation() {
      a = !0;
    },
    get isCanceled() {
      return i;
    },
    get isPropagationAllowed() {
      return a;
    },
    trigger: n,
    ...o,
  };
}
var fn = t(() => {
  $t();
});
function pn(e) {
  let { children: t, delay: n, timeoutMs: r = 0 } = e,
    i = hn.useRef(n),
    a = hn.useRef(n),
    o = hn.useRef(null),
    s = hn.useRef(null),
    c = ae();
  return (0, gn.jsx)(_n.Provider, {
    value: hn.useMemo(
      () => ({
        hasProvider: !0,
        delayRef: i,
        initialDelayRef: a,
        currentIdRef: o,
        timeoutMs: r,
        currentContextRef: s,
        timeout: c,
      }),
      [r, c],
    ),
    children: t,
  });
}
function mn(e, t = { open: !1 }) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`floatingId`),
    { open: i } = t,
    {
      currentIdRef: a,
      delayRef: o,
      timeoutMs: s,
      initialDelayRef: c,
      currentContextRef: l,
      hasProvider: u,
      timeout: d,
    } = hn.useContext(_n),
    [f, p] = hn.useState(!1);
  return (
    w(() => {
      function e() {
        (p(!1),
          l.current?.setIsInstantPhase(!1),
          (a.current = null),
          (l.current = null),
          (o.current = c.current));
      }
      if (a.current && !i && a.current === r) {
        if ((p(!1), s)) {
          let t = r;
          return (
            d.start(s, () => {
              n.select(`open`) || (a.current && a.current !== t) || e();
            }),
            () => {
              d.clear();
            }
          );
        }
        e();
      }
    }, [i, r, a, o, s, c, l, d, n]),
    w(() => {
      if (!i) return;
      let e = l.current,
        t = a.current;
      (d.clear(),
        (l.current = { onOpenChange: n.setOpen, setIsInstantPhase: p }),
        (a.current = r),
        (o.current = { open: 0, close: Ht(c.current, `close`) }),
        t !== null && t !== r
          ? (p(!0), e?.setIsInstantPhase(!0), e?.onOpenChange(!1, dn(en)))
          : (p(!1), e?.setIsInstantPhase(!1)));
    }, [i, r, n, a, o, s, c, l, d]),
    w(
      () => () => {
        l.current = null;
      },
      [l],
    ),
    hn.useMemo(() => ({ hasProvider: u, delayRef: o, isInstantPhase: f }), [u, o, f])
  );
}
var hn,
  gn,
  _n,
  vn = t(() => {
    ((hn = e(r())),
      ce(),
      T(),
      Gt(),
      fn(),
      un(),
      (gn = i()),
      (_n = hn.createContext({
        hasProvider: !1,
        timeoutMs: 0,
        delayRef: { current: 0 },
        initialDelayRef: { current: 0 },
        timeout: new se(),
        currentIdRef: { current: null },
        currentContextRef: { current: null },
      })));
  });
function yn(e, t, n, r) {
  let i = o(xn).current;
  return (Sn(i, e, t, n, r) && wn(i, [e, t, n, r]), i.callback);
}
function bn(e) {
  let t = o(xn).current;
  return (Cn(t, e) && wn(t, e), t.callback);
}
function xn() {
  return { callback: null, cleanup: null, refs: [] };
}
function Sn(e, t, n, r, i) {
  return e.refs[0] !== t || e.refs[1] !== n || e.refs[2] !== r || e.refs[3] !== i;
}
function Cn(e, t) {
  return e.refs.length !== t.length || e.refs.some((e, n) => e !== t[n]);
}
function wn(e, t) {
  if (((e.refs = t), t.every((e) => e == null))) {
    e.callback = null;
    return;
  }
  e.callback = (n) => {
    if (((e.cleanup &&= (e.cleanup(), null)), n != null)) {
      let r = Array(t.length).fill(null);
      for (let e = 0; e < t.length; e += 1) {
        let i = t[e];
        if (i != null)
          switch (typeof i) {
            case `function`: {
              let t = i(n);
              typeof t == `function` && (r[e] = t);
              break;
            }
            case `object`:
              i.current = n;
              break;
            default:
          }
      }
      e.cleanup = () => {
        for (let e = 0; e < t.length; e += 1) {
          let n = t[e];
          if (n != null)
            switch (typeof n) {
              case `function`: {
                let t = r[e];
                typeof t == `function` ? t() : n(null);
                break;
              }
              case `object`:
                n.current = null;
                break;
              default:
            }
        }
      };
    }
  };
}
var Tn = t(() => {
  l();
});
function En(e) {
  let t = o(Dn, e).current;
  return ((t.next = e), w(t.effect), t);
}
function Dn(e) {
  let t = {
    current: e,
    next: e,
    effect: () => {
      t.current = t.next;
    },
  };
  return t;
}
var On = t(() => {
  (T(), l());
});
function F(e) {
  let t = o(kn).current;
  return ((t.next = e), Nn(t.effect), t.trampoline);
}
function kn() {
  let e = {
    next: void 0,
    callback: An,
    trampoline: (...t) => e.callback?.(...t),
    effect: () => {
      e.callback = e.next;
    },
  };
  return e;
}
function An() {}
var jn,
  Mn,
  Nn,
  Pn = t(() => {
    ((jn = e(r())),
      l(),
      (Mn = jn[`useInsertionEffect${Math.random().toFixed(1)}`.slice(0, -3)]),
      (Nn = Mn && Mn !== jn.useLayoutEffect ? Mn : (e) => e()));
  });
function Fn() {
  let e = o(zn.create).current;
  return (ne(e.disposeEffect), e);
}
var In,
  Ln,
  Rn,
  zn,
  Bn = t(() => {
    (l(),
      ie(),
      (In = null),
      globalThis.requestAnimationFrame,
      (Ln = class {
        callbacks = [];
        callbacksCount = 0;
        nextId = 1;
        startId = 1;
        isScheduled = !1;
        tick = (e) => {
          this.isScheduled = !1;
          let t = this.callbacks,
            n = this.callbacksCount;
          if (
            ((this.callbacks = []), (this.callbacksCount = 0), (this.startId = this.nextId), n > 0)
          )
            for (let n = 0; n < t.length; n += 1) t[n]?.(e);
        };
        request(e) {
          let t = this.nextId;
          return (
            (this.nextId += 1),
            this.callbacks.push(e),
            (this.callbacksCount += 1),
            (this.isScheduled ||= (requestAnimationFrame(this.tick), !0)),
            t
          );
        }
        cancel(e) {
          let t = e - this.startId;
          t < 0 ||
            t >= this.callbacks.length ||
            ((this.callbacks[t] = null), --this.callbacksCount);
        }
      }),
      (Rn = new Ln()),
      (zn = class e {
        static create() {
          return new e();
        }
        static request(e) {
          return Rn.request(e);
        }
        static cancel(e) {
          return Rn.cancel(e);
        }
        currentId = In;
        request(e) {
          (this.cancel(),
            (this.currentId = Rn.request(() => {
              ((this.currentId = In), e());
            })));
        }
        cancel = () => {
          this.currentId !== In && (Rn.cancel(this.currentId), (this.currentId = In));
        };
        disposeEffect = () => this.cancel;
      }));
  });
function Vn(e) {
  return `data-base-ui-${e}`;
}
var Hn = t(() => {}),
  Un,
  Wn,
  Gn = t(() => {
    ((Un = e(r())), (Wn = { ...Un }));
  });
function Kn(e, t = `mui`) {
  let [n, r] = Jn.useState(e),
    i = e || n;
  return (
    Jn.useEffect(() => {
      n ?? ((Yn += 1), r(`${t}-${Yn}`));
    }, [n, t]),
    i
  );
}
function qn(e, t) {
  if (Xn !== void 0) {
    let n = Xn();
    return e ?? (t ? `${t}-${n}` : n);
  }
  return Kn(e, t);
}
var Jn,
  Yn,
  Xn,
  Zn = t(() => {
    ((Jn = e(r())), Gn(), (Yn = 0), (Xn = Wn.useId));
  });
function Qn(e) {
  return $n >= e;
}
var $n,
  er = t(() => {
    (e(r()), ($n = 19));
  });
function tr(e) {
  if (!nr.isValidElement(e)) return null;
  let t = e,
    n = t.props;
  return (Qn(19) ? n?.ref : t.ref) ?? null;
}
var nr,
  rr = t(() => {
    ((nr = e(r())), er());
  });
function ir(e, t) {
  if (e && !t) return e;
  if (!e && t) return t;
  if (e || t) return { ...e, ...t };
}
var ar = t(() => {});
function or(e, t) {
  let n = {};
  for (let r in e) {
    let i = e[r];
    if (t?.hasOwnProperty(r)) {
      let e = t[r](i);
      e != null && Object.assign(n, e);
      continue;
    }
    i === !0
      ? (n[`data-${r.toLowerCase()}`] = ``)
      : i && (n[`data-${r.toLowerCase()}`] = i.toString());
  }
  return n;
}
var sr = t(() => {});
function cr(e, t) {
  return typeof e == `function` ? e(t) : e;
}
var lr = t(() => {});
function ur(e, t) {
  return typeof e == `function` ? e(t) : e;
}
var dr = t(() => {});
function fr(e, t, n, r, i) {
  let a = { ...vr(e, Cr) };
  return (t && (a = mr(a, t)), n && (a = mr(a, n)), r && (a = mr(a, r)), i && (a = mr(a, i)), a);
}
function pr(e) {
  if (e.length === 0) return Cr;
  if (e.length === 1) return vr(e[0], Cr);
  let t = { ...vr(e[0], Cr) };
  for (let n = 1; n < e.length; n += 1) t = mr(t, e[n]);
  return t;
}
function mr(e, t) {
  return _r(t) ? t(e) : hr(e, t);
}
function hr(e, t) {
  if (!t) return e;
  for (let n in t) {
    let r = t[n];
    switch (n) {
      case `style`:
        e[n] = ir(e.style, r);
        break;
      case `className`:
        e[n] = xr(e.className, r);
        break;
      default:
        gr(n, r) ? (e[n] = yr(e[n], r)) : (e[n] = r);
    }
  }
  return e;
}
function gr(e, t) {
  let n = e.charCodeAt(0),
    r = e.charCodeAt(1),
    i = e.charCodeAt(2);
  return n === 111 && r === 110 && i >= 65 && i <= 90 && (typeof t == `function` || t === void 0);
}
function _r(e) {
  return typeof e == `function`;
}
function vr(e, t) {
  return _r(e) ? e(t) : (e ?? Cr);
}
function yr(e, t) {
  return t
    ? e
      ? (n) => {
          if (Sr(n)) {
            let r = n;
            br(r);
            let i = t(r);
            return (r.baseUIHandlerPrevented || e?.(r), i);
          }
          let r = t(n);
          return (e?.(n), r);
        }
      : t
    : e;
}
function br(e) {
  return (
    (e.preventBaseUIHandler = () => {
      e.baseUIHandlerPrevented = !0;
    }),
    e
  );
}
function xr(e, t) {
  return t ? (e ? t + ` ` + e : t) : e;
}
function Sr(e) {
  return typeof e == `object` && !!e && `nativeEvent` in e;
}
var Cr,
  wr = t(() => {
    (ar(), (Cr = {}));
  }),
  Tr = t(() => {
    wr();
  });
function Er(e, t, n = {}) {
  let r = t.render,
    i = Dr(t, n);
  return n.enabled === !1 ? null : Or(e, r, i, n.state ?? qt);
}
function Dr(e, t = {}) {
  let { className: n, style: r, render: i } = e,
    { state: a = qt, ref: o, props: s, stateAttributesMapping: c, enabled: l = !0 } = t,
    u = l ? cr(n, a) : void 0,
    d = l ? ur(r, a) : void 0,
    f = l ? or(a, c) : qt,
    p = l ? (ir(f, Array.isArray(s) ? pr(s) : s) ?? qt) : qt;
  return (
    typeof document < `u` &&
      (l
        ? Array.isArray(o)
          ? (p.ref = bn([p.ref, tr(i), ...o]))
          : (p.ref = yn(p.ref, tr(i), o))
        : yn(null, null)),
    l
      ? (u !== void 0 && (p.className = xr(p.className, u)),
        d !== void 0 && (p.style = ir(p.style, d)),
        p)
      : qt
  );
}
function Or(e, t, n, r) {
  if (t) {
    if (typeof t == `function`) return t(n, r);
    let e = fr(n, t.props);
    e.ref = n.ref;
    let i = t;
    return (i?.$$typeof === Mr && (i = Ar.Children.toArray(t)[0]), Ar.cloneElement(i, e));
  }
  if (e && typeof e == `string`) return kr(e, n);
  throw Error(D(8));
}
function kr(e, t) {
  return e === `button`
    ? (0, jr.createElement)(`button`, { type: `button`, ...t, key: t.key })
    : e === `img`
      ? (0, jr.createElement)(`img`, { alt: ``, ...t, key: t.key })
      : Ar.createElement(e, t);
}
var Ar,
  jr,
  Mr,
  Nr = t(() => {
    (ee(),
      (Ar = e(r())),
      Tn(),
      rr(),
      ar(),
      sr(),
      lr(),
      dr(),
      Tr(),
      $t(),
      (jr = e(r())),
      (Mr = Symbol.for(`react.lazy`)));
  });
function Pr(e = {}) {
  let { ref: t, container: n, componentProps: r = qt, elementProps: i } = e,
    a = qn(),
    o = Rr()?.portalNode,
    [s, c] = Fr.useState(null),
    [l, u] = Fr.useState(null),
    d = F((e) => {
      e !== null && u(e);
    }),
    f = Fr.useRef(null);
  w(() => {
    if (n === null) {
      f.current && ((f.current = null), u(null), c(null));
      return;
    }
    if (a == null) return;
    let e = (n && (de(n) ? n : n.current)) ?? o ?? document.body;
    if (e == null) {
      f.current && ((f.current = null), u(null), c(null));
      return;
    }
    f.current !== e && ((f.current = e), u(null), c(e));
  }, [n, o, a]);
  let p = Er(`div`, r, { ref: [t, d], props: [{ id: a, [zr]: `` }, i] });
  return { portalNode: l, portalSubtree: s && p ? Ir.createPortal(p, s) : null };
}
var Fr,
  Ir,
  Lr,
  Rr,
  zr,
  Br = t(() => {
    ((Fr = e(r())),
      (Ir = e(a())),
      je(),
      Zn(),
      T(),
      Pn(),
      Hn(),
      Nr(),
      $t(),
      i(),
      (Lr = Fr.createContext(null)),
      (Rr = () => Fr.useContext(Lr)),
      (zr = Vn(`portal`)));
  });
function Vr() {
  let e = new Map();
  return {
    emit(t, n) {
      e.get(t)?.forEach((e) => e(n));
    },
    on(t, n) {
      (e.has(t) || e.set(t, new Set()), e.get(t).add(n));
    },
    off(t, n) {
      e.get(t)?.delete(n);
    },
  };
}
var Hr = t(() => {}),
  Ur,
  Wr,
  Gr,
  Kr,
  qr,
  Jr = t(() => {
    ((Ur = e(r())),
      i(),
      (Wr = Ur.createContext(null)),
      (Gr = Ur.createContext(null)),
      (Kr = () => Ur.useContext(Wr)?.id || null),
      (qr = (e) => {
        let t = Ur.useContext(Gr);
        return e ?? t;
      }));
  });
function Yr(e) {
  return e == null ? e : `current` in e ? e.current : e;
}
var Xr = t(() => {});
function Zr(e, t) {
  let n = null,
    r = null,
    i = !1;
  return {
    contextElement: e || void 0,
    getBoundingClientRect() {
      let a = e?.getBoundingClientRect() || { width: 0, height: 0, x: 0, y: 0 },
        o = t.axis === `x` || t.axis === `both`,
        s = t.axis === `y` || t.axis === `both`,
        c =
          [`mouseenter`, `mousemove`].includes(t.dataRef.current.openEvent?.type || ``) &&
          t.pointerType !== `touch`,
        l = a.width,
        u = a.height,
        d = a.x,
        f = a.y;
      return (
        n == null && t.x && o && (n = a.x - t.x),
        r == null && t.y && s && (r = a.y - t.y),
        (d -= n || 0),
        (f -= r || 0),
        (l = 0),
        (u = 0),
        !i || c
          ? ((l = t.axis === `y` ? a.width : 0),
            (u = t.axis === `x` ? a.height : 0),
            (d = o && t.x != null ? t.x : d),
            (f = s && t.y != null ? t.y : f))
          : i && !c && ((u = t.axis === `x` ? a.height : u), (l = t.axis === `y` ? a.width : l)),
        (i = !0),
        { width: l, height: u, x: d, y: f, top: f, right: d + l, bottom: f + u, left: d }
      );
    },
  };
}
function Qr(e) {
  return e != null && e.clientX != null;
}
function $r(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    a = n.useState(`domReferenceElement`),
    o = n.context.dataRef,
    { enabled: s = !0, axis: c = `both` } = t,
    l = ei.useRef(!1),
    u = ei.useRef(null),
    [d, f] = ei.useState(),
    [p, m] = ei.useState([]),
    h = F((e, t, r) => {
      l.current ||
        (o.current.openEvent && !Qr(o.current.openEvent)) ||
        n.set(`positionReference`, Zr(r ?? a, { x: e, y: t, axis: c, dataRef: o, pointerType: d }));
    }),
    g = F((e) => {
      r ? u.current || m([]) : h(e.clientX, e.clientY, e.currentTarget);
    }),
    _ = it(d) ? i : r,
    v = ei.useCallback(() => {
      if (!_ || !s) return;
      let e = N(i);
      function t(n) {
        qe(i, Ye(n))
          ? (e.removeEventListener(`mousemove`, t), (u.current = null))
          : h(n.clientX, n.clientY);
      }
      if (!o.current.openEvent || Qr(o.current.openEvent)) {
        e.addEventListener(`mousemove`, t);
        let n = () => {
          (e.removeEventListener(`mousemove`, t), (u.current = null));
        };
        return ((u.current = n), n);
      }
      n.set(`positionReference`, a);
    }, [_, s, i, o, a, n, h]);
  (ei.useEffect(() => v(), [v, p]),
    ei.useEffect(() => {
      s && !i && (l.current = !1);
    }, [s, i]),
    ei.useEffect(() => {
      !s && r && (l.current = !0);
    }, [s, r]));
  let y = ei.useMemo(() => {
    function e(e) {
      f(e.pointerType);
    }
    return { onPointerDown: e, onPointerEnter: e, onMouseMove: g, onMouseEnter: g };
  }, [g]);
  return ei.useMemo(() => (s ? { reference: y, trigger: y } : {}), [s, y]);
}
var ei,
  ti = t(() => {
    ((ei = e(r())), je(), Pn(), Bt());
  });
function ni() {
  return !1;
}
function ri(e) {
  return {
    escapeKey: typeof e == `boolean` ? e : (e?.escapeKey ?? !1),
    outsidePress: typeof e == `boolean` ? e : (e?.outsidePress ?? !0),
  };
}
function ii(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    { dataRef: a } = n.context,
    {
      enabled: o = !0,
      escapeKey: s = !0,
      outsidePress: c = !0,
      outsidePressEvent: l = `sloppy`,
      referencePress: u = ni,
      referencePressEvent: d = `sloppy`,
      bubbles: f,
      externalTree: p,
    } = t,
    m = qr(p),
    h = F(typeof c == `function` ? c : () => !1),
    g = typeof c == `function` ? h : c,
    _ = g !== !1,
    v = F(() => l),
    y = ai.useRef(!1),
    b = ai.useRef(!1),
    x = ai.useRef(!1),
    { escapeKey: S, outsidePress: C } = ri(f),
    w = ai.useRef(null),
    T = ae(),
    E = ae(),
    D = F(() => {
      (E.clear(), (a.current.insideReactTree = !1));
    }),
    ee = ai.useRef(!1),
    te = ai.useRef(``),
    O = F(u),
    k = F((e) => {
      if (!r || !o || !s || e.key !== `Escape` || ee.current) return;
      let t = a.current.floatingContext?.nodeId,
        i = m ? tt(m.nodesRef.current, t) : [];
      if (!S && i.length > 0) {
        let e = !0;
        if (
          (i.forEach((t) => {
            t.context?.open && !t.context.dataRef.current.__escapeKeyBubbles && (e = !1);
          }),
          !e)
        )
          return;
      }
      let c = rt(e) ? e.nativeEvent : e,
        l = dn(on, c);
      (n.setOpen(!1, l), !S && !l.isPropagationAllowed && e.stopPropagation());
    }),
    A = F(() => {
      ((a.current.insideReactTree = !0), E.start(0, D));
    });
  (ai.useEffect(() => {
    if (!r || !o) return;
    ((a.current.__escapeKeyBubbles = S), (a.current.__outsidePressBubbles = C));
    let e = new se(),
      t = new se();
    function c() {
      (e.clear(), (ee.current = !0));
    }
    function l() {
      e.start(ye() ? 5 : 0, () => {
        ee.current = !1;
      });
    }
    function u() {
      ((x.current = !0),
        t.start(0, () => {
          x.current = !1;
        }));
    }
    function d() {
      ((y.current = !1), (b.current = !1));
    }
    function f() {
      let e = te.current,
        t = e === `pen` || !e ? `mouse` : e,
        n = v(),
        r = typeof n == `function` ? n() : n;
      return typeof r == `string` ? r : r[t];
    }
    function p(e) {
      let t = f();
      return (t === `intentional` && e.type !== `click`) || (t === `sloppy` && e.type === `click`);
    }
    function h(e) {
      let t = a.current.floatingContext?.nodeId,
        r = m && tt(m.nodesRef.current, t).some((t) => Xe(e, t.context?.elements.floating));
      return Xe(e, n.select(`floatingElement`)) || Xe(e, n.select(`domReferenceElement`)) || r;
    }
    function E(e) {
      if (p(e)) {
        D();
        return;
      }
      if (a.current.insideReactTree) {
        D();
        return;
      }
      let r = Ye(e),
        i = `[${Vn(`inert`)}]`,
        o = Array.from(Lt(n.select(`floatingElement`)).querySelectorAll(i)),
        s = P(r) ? r.getRootNode() : null;
      pe(s) && (o = o.concat(Array.from(s.querySelectorAll(i))));
      let c = n.context.triggerElements;
      if (r && (c.hasElement(r) || c.hasMatchingElement((e) => qe(e, r)))) return;
      let l = P(r) ? r : null;
      for (; l && !be(l); ) {
        let e = Ce(l);
        if (be(e) || !P(e)) break;
        l = e;
      }
      if (
        o.length &&
        P(r) &&
        !Ze(r) &&
        !qe(r, n.select(`floatingElement`)) &&
        o.every((e) => !qe(l, e))
      )
        return;
      if (fe(r) && !(`touches` in e)) {
        let t = be(r),
          n = xe(r),
          i = /auto|scroll/,
          a = t || i.test(n.overflowX),
          o = t || i.test(n.overflowY),
          s = a && r.clientWidth > 0 && r.scrollWidth > r.clientWidth,
          c = o && r.clientHeight > 0 && r.scrollHeight > r.clientHeight,
          l = n.direction === `rtl`,
          u = c && (l ? e.offsetX <= r.offsetWidth - r.clientWidth : e.offsetX > r.clientWidth),
          d = s && e.offsetY > r.clientHeight;
        if (u || d) return;
      }
      if (h(e)) return;
      if (f() === `intentional` && x.current) {
        (t.clear(), (x.current = !1));
        return;
      }
      if (typeof g == `function` && !g(e)) return;
      let u = a.current.floatingContext?.nodeId,
        d = m ? tt(m.nodesRef.current, u) : [];
      if (d.length > 0) {
        let e = !0;
        if (
          (d.forEach((t) => {
            t.context?.open && !t.context.dataRef.current.__outsidePressBubbles && (e = !1);
          }),
          !e)
        )
          return;
      }
      (n.setOpen(!1, dn(an, e)), D());
    }
    function O(e) {
      f() !== `sloppy` ||
        e.pointerType === `touch` ||
        !n.select(`open`) ||
        !o ||
        Xe(e, n.select(`floatingElement`)) ||
        Xe(e, n.select(`domReferenceElement`)) ||
        E(e);
    }
    function A(e) {
      if (
        f() !== `sloppy` ||
        !n.select(`open`) ||
        !o ||
        Xe(e, n.select(`floatingElement`)) ||
        Xe(e, n.select(`domReferenceElement`))
      )
        return;
      let t = e.touches[0];
      t &&
        ((w.current = {
          startTime: Date.now(),
          startX: t.clientX,
          startY: t.clientY,
          dismissOnTouchEnd: !1,
          dismissOnMouseDown: !0,
        }),
        T.start(1e3, () => {
          w.current && ((w.current.dismissOnTouchEnd = !1), (w.current.dismissOnMouseDown = !1));
        }));
    }
    function ne(e) {
      te.current = `touch`;
      let t = Ye(e);
      function n() {
        (A(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    function j(e) {
      if (
        (T.clear(),
        e.type === `pointerdown` && (te.current = e.pointerType),
        e.type === `mousedown` && w.current && !w.current.dismissOnMouseDown)
      )
        return;
      let t = Ye(e);
      function n() {
        (e.type === `pointerdown` ? O(e) : E(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    function re(e) {
      if (!y.current) return;
      let n = b.current;
      if ((d(), f() === `intentional`)) {
        if (e.type === `pointercancel`) {
          n && u();
          return;
        }
        if (!h(e)) {
          if (n) {
            u();
            return;
          }
          (typeof g == `function` && !g(e)) || (t.clear(), (x.current = !0), D());
        }
      }
    }
    function ie(e) {
      if (
        f() !== `sloppy` ||
        !w.current ||
        Xe(e, n.select(`floatingElement`)) ||
        Xe(e, n.select(`domReferenceElement`))
      )
        return;
      let t = e.touches[0];
      if (!t) return;
      let r = Math.abs(t.clientX - w.current.startX),
        i = Math.abs(t.clientY - w.current.startY),
        a = Math.sqrt(r * r + i * i);
      (a > 5 && (w.current.dismissOnTouchEnd = !0),
        a > 10 && (E(e), T.clear(), (w.current = null)));
    }
    function ae(e) {
      let t = Ye(e);
      function n() {
        (ie(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    function oe(e) {
      f() !== `sloppy` ||
        !w.current ||
        Xe(e, n.select(`floatingElement`)) ||
        Xe(e, n.select(`domReferenceElement`)) ||
        (w.current.dismissOnTouchEnd && E(e), T.clear(), (w.current = null));
    }
    function ce(e) {
      let t = Ye(e);
      function n() {
        (oe(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    let M = Lt(i);
    return (
      s &&
        (M.addEventListener(`keydown`, k),
        M.addEventListener(`compositionstart`, c),
        M.addEventListener(`compositionend`, l)),
      _ &&
        (M.addEventListener(`click`, j, !0),
        M.addEventListener(`pointerdown`, j, !0),
        M.addEventListener(`pointerup`, re, !0),
        M.addEventListener(`pointercancel`, re, !0),
        M.addEventListener(`mousedown`, j, !0),
        M.addEventListener(`mouseup`, re, !0),
        M.addEventListener(`touchstart`, ne, !0),
        M.addEventListener(`touchmove`, ae, !0),
        M.addEventListener(`touchend`, ce, !0)),
      () => {
        (s &&
          (M.removeEventListener(`keydown`, k),
          M.removeEventListener(`compositionstart`, c),
          M.removeEventListener(`compositionend`, l)),
          _ &&
            (M.removeEventListener(`click`, j, !0),
            M.removeEventListener(`pointerdown`, j, !0),
            M.removeEventListener(`pointerup`, re, !0),
            M.removeEventListener(`pointercancel`, re, !0),
            M.removeEventListener(`mousedown`, j, !0),
            M.removeEventListener(`mouseup`, re, !0),
            M.removeEventListener(`touchstart`, ne, !0),
            M.removeEventListener(`touchmove`, ae, !0),
            M.removeEventListener(`touchend`, ce, !0)),
          e.clear(),
          t.clear(),
          d(),
          (x.current = !1));
      }
    );
  }, [a, i, s, _, g, r, o, S, C, k, D, v, m, n, T]),
    ai.useEffect(D, [g, D]));
  let ne = ai.useMemo(
      () => ({
        onKeyDown: k,
        [oi[d]]: (e) => {
          O() && n.setOpen(!1, dn(tn, e.nativeEvent));
        },
        ...(d !== `intentional` && {
          onClick(e) {
            O() && n.setOpen(!1, dn(`trigger-press`, e.nativeEvent));
          },
        }),
      }),
      [k, n, d, O],
    ),
    j = F((e) => {
      if (!r || !o || e.button !== 0) return;
      let t = Ye(e.nativeEvent);
      qe(n.select(`floatingElement`), t) && (y.current || ((y.current = !0), (b.current = !1)));
    }),
    re = F((e) => {
      !r ||
        !o ||
        ((e.defaultPrevented || e.nativeEvent.defaultPrevented) && y.current && (b.current = !0));
    }),
    ie = ai.useMemo(
      () => ({
        onKeyDown: k,
        onPointerDown: re,
        onMouseDown: re,
        onClickCapture: A,
        onMouseDownCapture(e) {
          (A(), j(e));
        },
        onPointerDownCapture(e) {
          (A(), j(e));
        },
        onMouseUpCapture: A,
        onTouchEndCapture: A,
        onTouchMoveCapture: A,
      }),
      [k, A, j, re],
    );
  return ai.useMemo(() => (o ? { reference: ne, floating: ie, trigger: ne } : {}), [o, ne, ie]);
}
var ai,
  oi,
  si = t(() => {
    ((ai = e(r())),
      je(),
      ce(),
      Pn(),
      Rt(),
      Bt(),
      Jr(),
      fn(),
      un(),
      Hn(),
      (oi = { intentional: `onClick`, sloppy: `onPointerDown` }));
  });
function ci(e, t, n) {
  let { reference: r, floating: i } = e,
    a = pt(t),
    o = mt(t),
    s = ft(o),
    c = lt(t),
    l = a === `y`,
    u = r.x + r.width / 2 - i.width / 2,
    d = r.y + r.height / 2 - i.height / 2,
    f = r[s] / 2 - i[s] / 2,
    p;
  switch (c) {
    case `top`:
      p = { x: u, y: r.y - i.height };
      break;
    case `bottom`:
      p = { x: u, y: r.y + r.height };
      break;
    case `right`:
      p = { x: r.x + r.width, y: d };
      break;
    case `left`:
      p = { x: r.x - i.width, y: d };
      break;
    default:
      p = { x: r.x, y: r.y };
  }
  switch (ut(t)) {
    case `start`:
      p[o] -= f * (n && l ? -1 : 1);
      break;
    case `end`:
      p[o] += f * (n && l ? -1 : 1);
      break;
  }
  return p;
}
async function li(e, t) {
  t === void 0 && (t = {});
  let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e,
    {
      boundary: c = `clippingAncestors`,
      rootBoundary: l = `viewport`,
      elementContext: u = `floating`,
      altBoundary: d = !1,
      padding: f = 0,
    } = ct(t, e),
    p = St(f),
    m = o[d ? (u === `floating` ? `reference` : `floating`) : u],
    h = Ct(
      await i.getClippingRect({
        element:
          ((await (i.isElement == null ? void 0 : i.isElement(m))) ?? !0)
            ? m
            : m.contextElement ||
              (await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating))),
        boundary: c,
        rootBoundary: l,
        strategy: s,
      }),
    ),
    g =
      u === `floating`
        ? { x: n, y: r, width: a.floating.width, height: a.floating.height }
        : a.reference,
    _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)),
    v = ((await (i.isElement == null ? void 0 : i.isElement(_))) &&
      (await (i.getScale == null ? void 0 : i.getScale(_)))) || { x: 1, y: 1 },
    y = Ct(
      i.convertOffsetParentRelativeRectToViewportRelativeRect
        ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
            elements: o,
            rect: g,
            offsetParent: _,
            strategy: s,
          })
        : g,
    );
  return {
    top: (h.top - y.top + p.top) / v.y,
    bottom: (y.bottom - h.bottom + p.bottom) / v.y,
    left: (h.left - y.left + p.left) / v.x,
    right: (y.right - h.right + p.right) / v.x,
  };
}
function ui(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width,
  };
}
function di(e) {
  return wt.some((t) => e[t] >= 0);
}
async function fi(e, t) {
  let { placement: n, platform: r, elements: i } = e,
    a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)),
    o = lt(n),
    s = ut(n),
    c = pt(n) === `y`,
    l = _i.has(o) ? -1 : 1,
    u = a && c ? -1 : 1,
    d = ct(t, e),
    {
      mainAxis: f,
      crossAxis: p,
      alignmentAxis: m,
    } = typeof d == `number`
      ? { mainAxis: d, crossAxis: 0, alignmentAxis: null }
      : { mainAxis: d.mainAxis || 0, crossAxis: d.crossAxis || 0, alignmentAxis: d.alignmentAxis };
  return (
    s && typeof m == `number` && (p = s === `end` ? m * -1 : m),
    c ? { x: p * u, y: f * l } : { x: f * l, y: p * u }
  );
}
var pi,
  mi,
  hi,
  gi,
  _i,
  vi,
  yi,
  bi,
  xi,
  Si = t(() => {
    (Ft(),
      (pi = 50),
      (mi = async (e, t, n) => {
        let {
            placement: r = `bottom`,
            strategy: i = `absolute`,
            middleware: a = [],
            platform: o,
          } = n,
          s = o.detectOverflow ? o : { ...o, detectOverflow: li },
          c = await (o.isRTL == null ? void 0 : o.isRTL(t)),
          l = await o.getElementRects({ reference: e, floating: t, strategy: i }),
          { x: u, y: d } = ci(l, r, c),
          f = r,
          p = 0,
          m = {};
        for (let n = 0; n < a.length; n++) {
          let h = a[n];
          if (!h) continue;
          let { name: g, fn: _ } = h,
            {
              x: v,
              y,
              data: b,
              reset: x,
            } = await _({
              x: u,
              y: d,
              initialPlacement: r,
              placement: f,
              strategy: i,
              middlewareData: m,
              rects: l,
              platform: s,
              elements: { reference: e, floating: t },
            });
          ((u = v ?? u),
            (d = y ?? d),
            (m[g] = { ...m[g], ...b }),
            x &&
              p < pi &&
              (p++,
              typeof x == `object` &&
                (x.placement && (f = x.placement),
                x.rects &&
                  (l =
                    x.rects === !0
                      ? await o.getElementRects({ reference: e, floating: t, strategy: i })
                      : x.rects),
                ({ x: u, y: d } = ci(l, f, c))),
              (n = -1)));
        }
        return { x: u, y: d, placement: f, strategy: i, middlewareData: m };
      }),
      (hi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            name: `flip`,
            options: e,
            async fn(t) {
              var n;
              let {
                  placement: r,
                  middlewareData: i,
                  rects: a,
                  initialPlacement: o,
                  platform: s,
                  elements: c,
                } = t,
                {
                  mainAxis: l = !0,
                  crossAxis: u = !0,
                  fallbackPlacements: d,
                  fallbackStrategy: f = `bestFit`,
                  fallbackAxisSideDirection: p = `none`,
                  flipAlignment: m = !0,
                  ...h
                } = ct(e, t);
              if ((n = i.arrow) != null && n.alignmentOffset) return {};
              let g = lt(r),
                _ = pt(o),
                v = lt(o) === o,
                y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)),
                b = d || (v || !m ? [bt(o)] : gt(o)),
                x = p !== `none`;
              !d && x && b.push(...yt(o, m, p, y));
              let S = [o, ...b],
                C = await s.detectOverflow(t, h),
                w = [],
                T = i.flip?.overflows || [];
              if ((l && w.push(C[g]), u)) {
                let e = ht(r, a, y);
                w.push(C[e[0]], C[e[1]]);
              }
              if (((T = [...T, { placement: r, overflows: w }]), !w.every((e) => e <= 0))) {
                let e = (i.flip?.index || 0) + 1,
                  t = S[e];
                if (
                  t &&
                  (!(u === `alignment` && _ !== pt(t)) ||
                    T.every((e) => (pt(e.placement) === _ ? e.overflows[0] > 0 : !0)))
                )
                  return { data: { index: e, overflows: T }, reset: { placement: t } };
                let n = T.filter((e) => e.overflows[0] <= 0).sort(
                  (e, t) => e.overflows[1] - t.overflows[1],
                )[0]?.placement;
                if (!n)
                  switch (f) {
                    case `bestFit`: {
                      let e = T.filter((e) => {
                        if (x) {
                          let t = pt(e.placement);
                          return t === _ || t === `y`;
                        }
                        return !0;
                      })
                        .map((e) => [
                          e.placement,
                          e.overflows.filter((e) => e > 0).reduce((e, t) => e + t, 0),
                        ])
                        .sort((e, t) => e[1] - t[1])[0]?.[0];
                      e && (n = e);
                      break;
                    }
                    case `initialPlacement`:
                      n = o;
                      break;
                  }
                if (r !== n) return { reset: { placement: n } };
              }
              return {};
            },
          }
        );
      }),
      (gi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            name: `hide`,
            options: e,
            async fn(t) {
              let { rects: n, platform: r } = t,
                { strategy: i = `referenceHidden`, ...a } = ct(e, t);
              switch (i) {
                case `referenceHidden`: {
                  let e = ui(
                    await r.detectOverflow(t, { ...a, elementContext: `reference` }),
                    n.reference,
                  );
                  return { data: { referenceHiddenOffsets: e, referenceHidden: di(e) } };
                }
                case `escaped`: {
                  let e = ui(await r.detectOverflow(t, { ...a, altBoundary: !0 }), n.floating);
                  return { data: { escapedOffsets: e, escaped: di(e) } };
                }
                default:
                  return {};
              }
            },
          }
        );
      }),
      (_i = new Set([`left`, `top`])),
      (vi = function (e) {
        return (
          e === void 0 && (e = 0),
          {
            name: `offset`,
            options: e,
            async fn(t) {
              var n;
              let { x: r, y: i, placement: a, middlewareData: o } = t,
                s = await fi(t, e);
              return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset
                ? {}
                : { x: r + s.x, y: i + s.y, data: { ...s, placement: a } };
            },
          }
        );
      }),
      (yi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            name: `shift`,
            options: e,
            async fn(t) {
              let { x: n, y: r, placement: i, platform: a } = t,
                {
                  mainAxis: o = !0,
                  crossAxis: s = !1,
                  limiter: c = {
                    fn: (e) => {
                      let { x: t, y: n } = e;
                      return { x: t, y: n };
                    },
                  },
                  ...l
                } = ct(e, t),
                u = { x: n, y: r },
                d = await a.detectOverflow(t, l),
                f = pt(lt(i)),
                p = dt(f),
                m = u[p],
                h = u[f];
              if (o) {
                let e = p === `y` ? `top` : `left`,
                  t = p === `y` ? `bottom` : `right`,
                  n = m + d[e],
                  r = m - d[t];
                m = st(n, m, r);
              }
              if (s) {
                let e = f === `y` ? `top` : `left`,
                  t = f === `y` ? `bottom` : `right`,
                  n = h + d[e],
                  r = h - d[t];
                h = st(n, h, r);
              }
              let g = c.fn({ ...t, [p]: m, [f]: h });
              return { ...g, data: { x: g.x - n, y: g.y - r, enabled: { [p]: o, [f]: s } } };
            },
          }
        );
      }),
      (bi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            options: e,
            fn(t) {
              let { x: n, y: r, placement: i, rects: a, middlewareData: o } = t,
                { offset: s = 0, mainAxis: c = !0, crossAxis: l = !0 } = ct(e, t),
                u = { x: n, y: r },
                d = pt(i),
                f = dt(d),
                p = u[f],
                m = u[d],
                h = ct(s, t),
                g =
                  typeof h == `number`
                    ? { mainAxis: h, crossAxis: 0 }
                    : { mainAxis: 0, crossAxis: 0, ...h };
              if (c) {
                let e = f === `y` ? `height` : `width`,
                  t = a.reference[f] - a.floating[e] + g.mainAxis,
                  n = a.reference[f] + a.reference[e] - g.mainAxis;
                p < t ? (p = t) : p > n && (p = n);
              }
              if (l) {
                let e = f === `y` ? `width` : `height`,
                  t = _i.has(lt(i)),
                  n =
                    a.reference[d] -
                    a.floating[e] +
                    ((t && o.offset?.[d]) || 0) +
                    (t ? 0 : g.crossAxis),
                  r =
                    a.reference[d] +
                    a.reference[e] +
                    (t ? 0 : o.offset?.[d] || 0) -
                    (t ? g.crossAxis : 0);
                m < n ? (m = n) : m > r && (m = r);
              }
              return { [f]: p, [d]: m };
            },
          }
        );
      }),
      (xi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            name: `size`,
            options: e,
            async fn(t) {
              var n, r;
              let { placement: i, rects: a, platform: o, elements: s } = t,
                { apply: c = () => {}, ...l } = ct(e, t),
                u = await o.detectOverflow(t, l),
                d = lt(i),
                f = ut(i),
                p = pt(i) === `y`,
                { width: m, height: h } = a.floating,
                g,
                _;
              d === `top` || d === `bottom`
                ? ((g = d),
                  (_ =
                    f ===
                    ((await (o.isRTL == null ? void 0 : o.isRTL(s.floating))) ? `start` : `end`)
                      ? `left`
                      : `right`))
                : ((_ = d), (g = f === `end` ? `top` : `bottom`));
              let v = h - u.top - u.bottom,
                y = m - u.left - u.right,
                b = Tt(h - u[g], v),
                x = Tt(m - u[_], y),
                S = !t.middlewareData.shift,
                C = b,
                w = x;
              if (
                ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y),
                (r = t.middlewareData.shift) != null && r.enabled.y && (C = v),
                S && !f)
              ) {
                let e = Et(u.left, 0),
                  t = Et(u.right, 0),
                  n = Et(u.top, 0),
                  r = Et(u.bottom, 0);
                p
                  ? (w = m - 2 * (e !== 0 || t !== 0 ? e + t : Et(u.left, u.right)))
                  : (C = h - 2 * (n !== 0 || r !== 0 ? n + r : Et(u.top, u.bottom)));
              }
              await c({ ...t, availableWidth: w, availableHeight: C });
              let T = await o.getDimensions(s.floating);
              return m !== T.width || h !== T.height ? { reset: { rects: !0 } } : {};
            },
          }
        );
      }));
  });
function Ci(e) {
  let t = xe(e),
    n = parseFloat(t.width) || 0,
    r = parseFloat(t.height) || 0,
    i = fe(e),
    a = i ? e.offsetWidth : n,
    o = i ? e.offsetHeight : r,
    s = Dt(n) !== a || Dt(r) !== o;
  return (s && ((n = a), (r = o)), { width: n, height: r, $: s });
}
function wi(e) {
  return P(e) ? e : e.contextElement;
}
function Ti(e) {
  let t = wi(e);
  if (!fe(t)) return kt(1);
  let n = t.getBoundingClientRect(),
    { width: r, height: i, $: a } = Ci(t),
    o = (a ? Dt(n.width) : n.width) / r,
    s = (a ? Dt(n.height) : n.height) / i;
  return (
    (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), { x: o, y: s }
  );
}
function Ei(e) {
  let t = N(e);
  return !ye() || !t.visualViewport
    ? Yi
    : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function Di(e, t, n) {
  return (t === void 0 && (t = !1), !n || (t && n !== N(e)) ? !1 : t);
}
function Oi(e, t, n, r) {
  (t === void 0 && (t = !1), n === void 0 && (n = !1));
  let i = e.getBoundingClientRect(),
    a = wi(e),
    o = kt(1);
  t && (r ? P(r) && (o = Ti(r)) : (o = Ti(e)));
  let s = Di(a, n, r) ? Ei(a) : kt(0),
    c = (i.left + s.x) / o.x,
    l = (i.top + s.y) / o.y,
    u = i.width / o.x,
    d = i.height / o.y;
  if (a) {
    let e = N(a),
      t = r && P(r) ? N(r) : r,
      n = e,
      i = Ee(n);
    for (; i && r && t !== n; ) {
      let e = Ti(i),
        t = i.getBoundingClientRect(),
        r = xe(i),
        a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x,
        o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
      ((c *= e.x), (l *= e.y), (u *= e.x), (d *= e.y), (c += a), (l += o), (n = N(i)), (i = Ee(n)));
    }
  }
  return Ct({ width: u, height: d, x: c, y: l });
}
function ki(e, t) {
  let n = Se(e).scrollLeft;
  return t ? t.left + n : Oi(ue(e)).left + n;
}
function Ai(e, t) {
  let n = e.getBoundingClientRect();
  return { x: n.left + t.scrollLeft - ki(e, n), y: n.top + t.scrollTop };
}
function ji(e) {
  let { elements: t, rect: n, offsetParent: r, strategy: i } = e,
    a = i === `fixed`,
    o = ue(r),
    s = t ? ge(t.floating) : !1;
  if (r === o || (s && a)) return n;
  let c = { scrollLeft: 0, scrollTop: 0 },
    l = kt(1),
    u = kt(0),
    d = fe(r);
  if ((d || (!d && !a)) && ((le(r) !== `body` || me(o)) && (c = Se(r)), d)) {
    let e = Oi(r);
    ((l = Ti(r)), (u.x = e.x + r.clientLeft), (u.y = e.y + r.clientTop));
  }
  let f = o && !d && !a ? Ai(o, c) : kt(0);
  return {
    width: n.width * l.x,
    height: n.height * l.y,
    x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
    y: n.y * l.y - c.scrollTop * l.y + u.y + f.y,
  };
}
function Mi(e) {
  return Array.from(e.getClientRects());
}
function Ni(e) {
  let t = ue(e),
    n = Se(e),
    r = e.ownerDocument.body,
    i = Et(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth),
    a = Et(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight),
    o = -n.scrollLeft + ki(e),
    s = -n.scrollTop;
  return (
    xe(r).direction === `rtl` && (o += Et(t.clientWidth, r.clientWidth) - i),
    { width: i, height: a, x: o, y: s }
  );
}
function Pi(e, t) {
  let n = N(e),
    r = ue(e),
    i = n.visualViewport,
    a = r.clientWidth,
    o = r.clientHeight,
    s = 0,
    c = 0;
  if (i) {
    ((a = i.width), (o = i.height));
    let e = ye();
    (!e || (e && t === `fixed`)) && ((s = i.offsetLeft), (c = i.offsetTop));
  }
  let l = ki(r);
  if (l <= 0) {
    let e = r.ownerDocument,
      t = e.body,
      n = getComputedStyle(t),
      i =
        (e.compatMode === `CSS1Compat` && parseFloat(n.marginLeft) + parseFloat(n.marginRight)) ||
        0,
      o = Math.abs(r.clientWidth - t.clientWidth - i);
    o <= Xi && (a -= o);
  } else l <= Xi && (a += l);
  return { width: a, height: o, x: s, y: c };
}
function Fi(e, t) {
  let n = Oi(e, !0, t === `fixed`),
    r = n.top + e.clientTop,
    i = n.left + e.clientLeft,
    a = fe(e) ? Ti(e) : kt(1);
  return { width: e.clientWidth * a.x, height: e.clientHeight * a.y, x: i * a.x, y: r * a.y };
}
function Ii(e, t, n) {
  let r;
  if (t === `viewport`) r = Pi(e, n);
  else if (t === `document`) r = Ni(ue(e));
  else if (P(t)) r = Fi(t, n);
  else {
    let n = Ei(e);
    r = { x: t.x - n.x, y: t.y - n.y, width: t.width, height: t.height };
  }
  return Ct(r);
}
function Li(e, t) {
  let n = Ce(e);
  return n === t || !P(n) || be(n) ? !1 : xe(n).position === `fixed` || Li(n, t);
}
function Ri(e, t) {
  let n = t.get(e);
  if (n) return n;
  let r = Te(e, [], !1).filter((e) => P(e) && le(e) !== `body`),
    i = null,
    a = xe(e).position === `fixed`,
    o = a ? Ce(e) : e;
  for (; P(o) && !be(o); ) {
    let t = xe(o),
      n = _e(o);
    (!n && t.position === `fixed` && (i = null),
      (
        a
          ? !n && !i
          : (!n &&
              t.position === `static` &&
              i &&
              (i.position === `absolute` || i.position === `fixed`)) ||
            (me(o) && !n && Li(e, o))
      )
        ? (r = r.filter((e) => e !== o))
        : (i = t),
      (o = Ce(o)));
  }
  return (t.set(e, r), r);
}
function zi(e) {
  let { element: t, boundary: n, rootBoundary: r, strategy: i } = e,
    a = [...(n === `clippingAncestors` ? (ge(t) ? [] : Ri(t, this._c)) : [].concat(n)), r],
    o = Ii(t, a[0], i),
    s = o.top,
    c = o.right,
    l = o.bottom,
    u = o.left;
  for (let e = 1; e < a.length; e++) {
    let n = Ii(t, a[e], i);
    ((s = Et(n.top, s)), (c = Tt(n.right, c)), (l = Tt(n.bottom, l)), (u = Et(n.left, u)));
  }
  return { width: c - u, height: l - s, x: u, y: s };
}
function Bi(e) {
  let { width: t, height: n } = Ci(e);
  return { width: t, height: n };
}
function Vi(e, t, n) {
  let r = fe(t),
    i = ue(t),
    a = n === `fixed`,
    o = Oi(e, !0, a, t),
    s = { scrollLeft: 0, scrollTop: 0 },
    c = kt(0);
  function l() {
    c.x = ki(i);
  }
  if (r || (!r && !a))
    if (((le(t) !== `body` || me(i)) && (s = Se(t)), r)) {
      let e = Oi(t, !0, a, t);
      ((c.x = e.x + t.clientLeft), (c.y = e.y + t.clientTop));
    } else i && l();
  a && !r && i && l();
  let u = i && !r && !a ? Ai(i, s) : kt(0);
  return {
    x: o.left + s.scrollLeft - c.x - u.x,
    y: o.top + s.scrollTop - c.y - u.y,
    width: o.width,
    height: o.height,
  };
}
function Hi(e) {
  return xe(e).position === `static`;
}
function Ui(e, t) {
  if (!fe(e) || xe(e).position === `fixed`) return null;
  if (t) return t(e);
  let n = e.offsetParent;
  return (ue(e) === n && (n = n.ownerDocument.body), n);
}
function Wi(e, t) {
  let n = N(e);
  if (ge(e)) return n;
  if (!fe(e)) {
    let t = Ce(e);
    for (; t && !be(t); ) {
      if (P(t) && !Hi(t)) return t;
      t = Ce(t);
    }
    return n;
  }
  let r = Ui(e, t);
  for (; r && he(r) && Hi(r); ) r = Ui(r, t);
  return r && be(r) && Hi(r) && !_e(r) ? n : r || ve(e) || n;
}
function Gi(e) {
  return xe(e).direction === `rtl`;
}
function Ki(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function qi(e, t) {
  let n = null,
    r,
    i = ue(e);
  function a() {
    var e;
    (clearTimeout(r), (e = n) == null || e.disconnect(), (n = null));
  }
  function o(s, c) {
    (s === void 0 && (s = !1), c === void 0 && (c = 1), a());
    let l = e.getBoundingClientRect(),
      { left: u, top: d, width: f, height: p } = l;
    if ((s || t(), !f || !p)) return;
    let m = Ot(d),
      h = Ot(i.clientWidth - (u + f)),
      g = Ot(i.clientHeight - (d + p)),
      _ = Ot(u),
      v = {
        rootMargin: -m + `px ` + -h + `px ` + -g + `px ` + -_ + `px`,
        threshold: Et(0, Tt(1, c)) || 1,
      },
      y = !0;
    function b(t) {
      let n = t[0].intersectionRatio;
      if (n !== c) {
        if (!y) return o();
        n
          ? o(!1, n)
          : (r = setTimeout(() => {
              o(!1, 1e-7);
            }, 1e3));
      }
      (n === 1 && !Ki(l, e.getBoundingClientRect()) && o(), (y = !1));
    }
    try {
      n = new IntersectionObserver(b, { ...v, root: i.ownerDocument });
    } catch {
      n = new IntersectionObserver(b, v);
    }
    n.observe(e);
  }
  return (o(!0), a);
}
function Ji(e, t, n, r) {
  r === void 0 && (r = {});
  let {
      ancestorScroll: i = !0,
      ancestorResize: a = !0,
      elementResize: o = typeof ResizeObserver == `function`,
      layoutShift: s = typeof IntersectionObserver == `function`,
      animationFrame: c = !1,
    } = r,
    l = wi(e),
    u = i || a ? [...(l ? Te(l) : []), ...(t ? Te(t) : [])] : [];
  u.forEach((e) => {
    (i && e.addEventListener(`scroll`, n, { passive: !0 }), a && e.addEventListener(`resize`, n));
  });
  let d = l && s ? qi(l, n) : null,
    f = -1,
    p = null;
  o &&
    ((p = new ResizeObserver((e) => {
      let [r] = e;
      (r &&
        r.target === l &&
        p &&
        t &&
        (p.unobserve(t),
        cancelAnimationFrame(f),
        (f = requestAnimationFrame(() => {
          var e;
          (e = p) == null || e.observe(t);
        }))),
        n());
    })),
    l && !c && p.observe(l),
    t && p.observe(t));
  let m,
    h = c ? Oi(e) : null;
  c && g();
  function g() {
    let t = Oi(e);
    (h && !Ki(h, t) && n(), (h = t), (m = requestAnimationFrame(g)));
  }
  return (
    n(),
    () => {
      var e;
      (u.forEach((e) => {
        (i && e.removeEventListener(`scroll`, n), a && e.removeEventListener(`resize`, n));
      }),
        d?.(),
        (e = p) == null || e.disconnect(),
        (p = null),
        c && cancelAnimationFrame(m));
    }
  );
}
var Yi,
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
  oa = t(() => {
    (Si(),
      Ft(),
      je(),
      (Yi = kt(0)),
      (Xi = 25),
      (Zi = async function (e) {
        let t = this.getOffsetParent || Wi,
          n = this.getDimensions,
          r = await n(e.floating);
        return {
          reference: Vi(e.reference, await t(e.floating), e.strategy),
          floating: { x: 0, y: 0, width: r.width, height: r.height },
        };
      }),
      (Qi = {
        convertOffsetParentRelativeRectToViewportRelativeRect: ji,
        getDocumentElement: ue,
        getClippingRect: zi,
        getOffsetParent: Wi,
        getElementRects: Zi,
        getClientRects: Mi,
        getDimensions: Bi,
        getScale: Ti,
        isElement: P,
        isRTL: Gi,
      }),
      ($i = vi),
      (ea = yi),
      (ta = hi),
      (na = xi),
      (ra = gi),
      (ia = bi),
      (aa = (e, t, n) => {
        let r = new Map(),
          i = { platform: Qi, ...n },
          a = { ...i.platform, _c: r };
        return mi(e, t, { ...i, platform: a });
      }));
  });
function sa(e, t) {
  if (e === t) return !0;
  if (typeof e != typeof t) return !1;
  if (typeof e == `function` && e.toString() === t.toString()) return !0;
  let n, r, i;
  if (e && t && typeof e == `object`) {
    if (Array.isArray(e)) {
      if (((n = e.length), n !== t.length)) return !1;
      for (r = n; r-- !== 0; ) if (!sa(e[r], t[r])) return !1;
      return !0;
    }
    if (((i = Object.keys(e)), (n = i.length), n !== Object.keys(t).length)) return !1;
    for (r = n; r-- !== 0; ) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
    for (r = n; r-- !== 0; ) {
      let n = i[r];
      if (!(n === `_owner` && e.$$typeof) && !sa(e[n], t[n])) return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function ca(e) {
  return typeof window > `u` ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function la(e, t) {
  let n = ca(e);
  return Math.round(t * n) / n;
}
function ua(e) {
  let t = fa.useRef(e);
  return (
    ha(() => {
      t.current = e;
    }),
    t
  );
}
function da(e) {
  e === void 0 && (e = {});
  let {
      placement: t = `bottom`,
      strategy: n = `absolute`,
      middleware: r = [],
      platform: i,
      elements: { reference: a, floating: o } = {},
      transform: s = !0,
      whileElementsMounted: c,
      open: l,
    } = e,
    [u, d] = fa.useState({
      x: 0,
      y: 0,
      strategy: n,
      placement: t,
      middlewareData: {},
      isPositioned: !1,
    }),
    [f, p] = fa.useState(r);
  sa(f, r) || p(r);
  let [m, h] = fa.useState(null),
    [g, _] = fa.useState(null),
    v = fa.useCallback((e) => {
      e !== S.current && ((S.current = e), h(e));
    }, []),
    y = fa.useCallback((e) => {
      e !== C.current && ((C.current = e), _(e));
    }, []),
    b = a || m,
    x = o || g,
    S = fa.useRef(null),
    C = fa.useRef(null),
    w = fa.useRef(u),
    T = c != null,
    E = ua(c),
    D = ua(i),
    ee = ua(l),
    te = fa.useCallback(() => {
      if (!S.current || !C.current) return;
      let e = { placement: t, strategy: n, middleware: f };
      (D.current && (e.platform = D.current),
        aa(S.current, C.current, e).then((e) => {
          let t = { ...e, isPositioned: ee.current !== !1 };
          O.current &&
            !sa(w.current, t) &&
            ((w.current = t),
            ma.flushSync(() => {
              d(t);
            }));
        }));
    }, [f, t, n, D, ee]);
  ha(() => {
    l === !1 &&
      w.current.isPositioned &&
      ((w.current.isPositioned = !1), d((e) => ({ ...e, isPositioned: !1 })));
  }, [l]);
  let O = fa.useRef(!1);
  (ha(
    () => (
      (O.current = !0),
      () => {
        O.current = !1;
      }
    ),
    [],
  ),
    ha(() => {
      if ((b && (S.current = b), x && (C.current = x), b && x)) {
        if (E.current) return E.current(b, x, te);
        te();
      }
    }, [b, x, te, E, T]));
  let k = fa.useMemo(
      () => ({ reference: S, floating: C, setReference: v, setFloating: y }),
      [v, y],
    ),
    A = fa.useMemo(() => ({ reference: b, floating: x }), [b, x]),
    ne = fa.useMemo(() => {
      let e = { position: n, left: 0, top: 0 };
      if (!A.floating) return e;
      let t = la(A.floating, u.x),
        r = la(A.floating, u.y);
      return s
        ? {
            ...e,
            transform: `translate(` + t + `px, ` + r + `px)`,
            ...(ca(A.floating) >= 1.5 && { willChange: `transform` }),
          }
        : { position: n, left: t, top: r };
    }, [n, s, A.floating, u.x, u.y]);
  return fa.useMemo(
    () => ({ ...u, update: te, refs: k, elements: A, floatingStyles: ne }),
    [u, te, k, A, ne],
  );
}
var fa,
  pa,
  ma,
  ha,
  ga,
  _a,
  va,
  ya,
  ba,
  xa,
  Sa = t(() => {
    (oa(),
      (fa = e(r(), 1)),
      (pa = e(r(), 1)),
      (ma = e(a(), 1)),
      (ha = typeof document < `u` ? pa.useLayoutEffect : function () {}),
      (ga = (e, t) => {
        let n = $i(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (_a = (e, t) => {
        let n = ea(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (va = (e, t) => ({ fn: ia(e).fn, options: [e, t] })),
      (ya = (e, t) => {
        let n = ta(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (ba = (e, t) => {
        let n = na(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (xa = (e, t) => {
        let n = ra(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }));
  });
function Ca(e, t = `expected a function, instead received ${typeof e}`) {
  if (typeof e != `function`) throw TypeError(t);
}
function wa(e, t = `expected an object, instead received ${typeof e}`) {
  if (typeof e != `object`) throw TypeError(t);
}
function Ta(e, t = `expected all items to be functions, instead received the following types: `) {
  if (!e.every((e) => typeof e == `function`)) {
    let n = e
      .map((e) => (typeof e == `function` ? `function ${e.name || `unnamed`}()` : typeof e))
      .join(`, `);
    throw TypeError(`${t}[${n}]`);
  }
}
function Ea(e) {
  let t = Array.isArray(e[0]) ? e[0] : e;
  return (
    Ta(
      t,
      `createSelector expects all input-selectors to be functions, but received the following types: `,
    ),
    t
  );
}
function Da(e, t) {
  let n = [],
    { length: r } = e;
  for (let i = 0; i < r; i++) n.push(e[i].apply(null, t));
  return n;
}
function Oa(e) {
  let t;
  return {
    get(n) {
      return t && e(t.key, n) ? t.value : Fa;
    },
    put(e, n) {
      t = { key: e, value: n };
    },
    getEntries() {
      return t ? [t] : [];
    },
    clear() {
      t = void 0;
    },
  };
}
function ka(e, t) {
  let n = [];
  function r(e) {
    let r = n.findIndex((n) => t(e, n.key));
    if (r > -1) {
      let e = n[r];
      return (r > 0 && (n.splice(r, 1), n.unshift(e)), e.value);
    }
    return Fa;
  }
  function i(t, i) {
    r(t) === Fa && (n.unshift({ key: t, value: i }), n.length > e && n.pop());
  }
  function a() {
    return n;
  }
  function o() {
    n = [];
  }
  return { get: r, put: i, getEntries: a, clear: o };
}
function Aa(e) {
  return function (t, n) {
    if (t === null || n === null || t.length !== n.length) return !1;
    let { length: r } = t;
    for (let i = 0; i < r; i++) if (!e(t[i], n[i])) return !1;
    return !0;
  };
}
function ja(e, t) {
  let {
      equalityCheck: n = La,
      maxSize: r = 1,
      resultEqualityCheck: i,
    } = typeof t == `object` ? t : { equalityCheck: t },
    a = Aa(n),
    o = 0,
    s = r <= 1 ? Oa(a) : ka(r, a);
  function c() {
    let t = s.get(arguments);
    if (t === Fa) {
      if (((t = e.apply(null, arguments)), o++, i)) {
        let e = s.getEntries().find((e) => i(e.value, t));
        e && ((t = e.value), o !== 0 && o--);
      }
      s.put(arguments, t);
    }
    return t;
  }
  return (
    (c.clearCache = () => {
      (s.clear(), c.resetResultsCount());
    }),
    (c.resultsCount = () => o),
    (c.resetResultsCount = () => {
      o = 0;
    }),
    c
  );
}
function Ma() {
  return { s: Ba, v: void 0, o: null, p: null };
}
function Na(e, t = {}) {
  let n = Ma(),
    { resultEqualityCheck: r } = t,
    i,
    a = 0;
  function o() {
    let t = n,
      { length: o } = arguments;
    for (let e = 0, n = o; e < n; e++) {
      let n = arguments[e];
      if (typeof n == `function` || (typeof n == `object` && n)) {
        let e = t.o;
        e === null && (t.o = e = new WeakMap());
        let r = e.get(n);
        r === void 0 ? ((t = Ma()), e.set(n, t)) : (t = r);
      } else {
        let e = t.p;
        e === null && (t.p = e = new Map());
        let r = e.get(n);
        r === void 0 ? ((t = Ma()), e.set(n, t)) : (t = r);
      }
    }
    let s = t,
      c;
    if (t.s === Va) c = t.v;
    else if (((c = e.apply(null, arguments)), a++, r)) {
      let e = i?.deref?.() ?? i;
      (e != null && r(e, c) && ((c = e), a !== 0 && a--),
        (i = (typeof c == `object` && c) || typeof c == `function` ? new za(c) : c));
    }
    return ((s.s = Va), (s.v = c), c);
  }
  return (
    (o.clearCache = () => {
      ((n = Ma()), o.resetResultsCount());
    }),
    (o.resultsCount = () => a),
    (o.resetResultsCount = () => {
      a = 0;
    }),
    o
  );
}
function Pa(e, ...t) {
  let n = typeof e == `function` ? { memoize: e, memoizeOptions: t } : e,
    r = (...e) => {
      let t = 0,
        r = 0,
        i,
        a = {},
        o = e.pop();
      (typeof o == `object` && ((a = o), (o = e.pop())),
        Ca(
          o,
          `createSelector expects an output function after the inputs, but received: [${typeof o}]`,
        ));
      let {
          memoize: s,
          memoizeOptions: c = [],
          argsMemoize: l = Na,
          argsMemoizeOptions: u = [],
          devModeChecks: d = {},
        } = { ...n, ...a },
        f = Ia(c),
        p = Ia(u),
        m = Ea(e),
        h = s(
          function () {
            return (t++, o.apply(null, arguments));
          },
          ...f,
        ),
        g = l(
          function () {
            r++;
            let e = Da(m, arguments);
            return ((i = h.apply(null, e)), i);
          },
          ...p,
        );
      return Object.assign(g, {
        resultFunc: o,
        memoizedResultFunc: h,
        dependencies: m,
        dependencyRecomputations: () => r,
        resetDependencyRecomputations: () => {
          r = 0;
        },
        lastResult: () => i,
        recomputations: () => t,
        resetRecomputations: () => {
          t = 0;
        },
        memoize: s,
        argsMemoize: l,
      });
    };
  return (Object.assign(r, { withTypes: () => r }), r);
}
var Fa,
  Ia,
  La,
  Ra,
  za,
  Ba,
  Va,
  Ha,
  Ua,
  Wa = t(() => {
    ((Fa = Symbol(`NOT_FOUND`)),
      (Ia = (e) => (Array.isArray(e) ? e : [e])),
      (La = (e, t) => e === t),
      (Ra = class {
        constructor(e) {
          this.value = e;
        }
        deref() {
          return this.value;
        }
      }),
      (za = typeof WeakRef < `u` ? WeakRef : Ra),
      (Ba = 0),
      (Va = 1),
      (Ha = Pa(Na)),
      (Ua = Object.assign(
        (e, t = Ha) => {
          wa(
            e,
            `createStructuredSelector expects first argument to be an object where each property is a selector, instead received a ${typeof e}`,
          );
          let n = Object.keys(e);
          return t(
            n.map((t) => e[t]),
            (...e) => e.reduce((e, t, r) => ((e[n[r]] = t), e), {}),
          );
        },
        { withTypes: () => Ua },
      )));
  }),
  I,
  Ga = t(() => {
    (ee(),
      Wa(),
      Pa({ memoize: ja, memoizeOptions: { maxSize: 1, equalityCheck: Object.is } }),
      (I = (e, t, n, r, i, a, ...o) => {
        if (o.length > 0) throw Error(D(1));
        let s;
        if (e && t && n && r && i && a)
          s = (o, s, c, l) =>
            a(e(o, s, c, l), t(o, s, c, l), n(o, s, c, l), r(o, s, c, l), i(o, s, c, l), s, c, l);
        else if (e && t && n && r && i)
          s = (a, o, s, c) =>
            i(e(a, o, s, c), t(a, o, s, c), n(a, o, s, c), r(a, o, s, c), o, s, c);
        else if (e && t && n && r)
          s = (i, a, o, s) => r(e(i, a, o, s), t(i, a, o, s), n(i, a, o, s), a, o, s);
        else if (e && t && n) s = (r, i, a, o) => n(e(r, i, a, o), t(r, i, a, o), i, a, o);
        else if (e && t) s = (n, r, i, a) => t(e(n, r, i, a), r, i, a);
        else if (e) s = e;
        else throw Error(`Missing arguments`);
        return s;
      }));
  }),
  Ka = n((e) => {
    var t = r();
    function n(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t);
    }
    var i = typeof Object.is == `function` ? Object.is : n,
      a = t.useState,
      o = t.useEffect,
      s = t.useLayoutEffect,
      c = t.useDebugValue;
    function l(e, t) {
      var n = t(),
        r = a({ inst: { value: n, getSnapshot: t } }),
        i = r[0].inst,
        l = r[1];
      return (
        s(
          function () {
            ((i.value = n), (i.getSnapshot = t), u(i) && l({ inst: i }));
          },
          [e, n, t],
        ),
        o(
          function () {
            return (
              u(i) && l({ inst: i }),
              e(function () {
                u(i) && l({ inst: i });
              })
            );
          },
          [e],
        ),
        c(n),
        n
      );
    }
    function u(e) {
      var t = e.getSnapshot;
      e = e.value;
      try {
        var n = t();
        return !i(e, n);
      } catch {
        return !0;
      }
    }
    function d(e, t) {
      return t();
    }
    var f =
      typeof window > `u` || window.document === void 0 || window.document.createElement === void 0
        ? d
        : l;
    e.useSyncExternalStore = t.useSyncExternalStore === void 0 ? f : t.useSyncExternalStore;
  }),
  qa = n((e, t) => {
    t.exports = Ka();
  }),
  Ja = n((e) => {
    var t = r(),
      n = qa();
    function i(e, t) {
      return (e === t && (e !== 0 || 1 / e == 1 / t)) || (e !== e && t !== t);
    }
    var a = typeof Object.is == `function` ? Object.is : i,
      o = n.useSyncExternalStore,
      s = t.useRef,
      c = t.useEffect,
      l = t.useMemo,
      u = t.useDebugValue;
    e.useSyncExternalStoreWithSelector = function (e, t, n, r, i) {
      var d = s(null);
      if (d.current === null) {
        var f = { hasValue: !1, value: null };
        d.current = f;
      } else f = d.current;
      d = l(
        function () {
          function e(e) {
            if (!o) {
              if (((o = !0), (s = e), (e = r(e)), i !== void 0 && f.hasValue)) {
                var t = f.value;
                if (i(t, e)) return (c = t);
              }
              return (c = e);
            }
            if (((t = c), a(s, e))) return t;
            var n = r(e);
            return i !== void 0 && i(t, n) ? ((s = e), t) : ((s = e), (c = n));
          }
          var o = !1,
            s,
            c,
            l = n === void 0 ? null : n;
          return [
            function () {
              return e(t());
            },
            l === null
              ? void 0
              : function () {
                  return e(l());
                },
          ];
        },
        [t, n, r, i],
      );
      var p = o(e, d[0], d[1]);
      return (
        c(
          function () {
            ((f.hasValue = !0), (f.value = p));
          },
          [p],
        ),
        u(p),
        p
      );
    };
  }),
  Ya = n((e, t) => {
    t.exports = Ja();
  });
function Xa(e, t, n, r, i) {
  return ro(e, t, n, r, i);
}
function Za(e, t, n, r, i) {
  let a = eo.useCallback(() => t(e.getSnapshot(), n, r, i), [e, t, n, r, i]);
  return (0, to.useSyncExternalStore)(e.subscribe, a, a);
}
function Qa(e, t, n, r, i) {
  let a = u();
  if (!a) return Za(e, t, n, r, i);
  let o = a.syncIndex;
  a.syncIndex += 1;
  let s;
  return (
    a.didInitialize
      ? ((s = a.syncHooks[o]),
        (s.store !== e ||
          s.selector !== t ||
          !Object.is(s.a1, n) ||
          !Object.is(s.a2, r) ||
          !Object.is(s.a3, i)) &&
          (s.store !== e && (a.didChangeStore = !0),
          (s.store = e),
          (s.selector = t),
          (s.a1 = n),
          (s.a2 = r),
          (s.a3 = i),
          (s.didChange = !0)))
      : ((s = {
          store: e,
          selector: t,
          a1: n,
          a2: r,
          a3: i,
          value: t(e.getSnapshot(), n, r, i),
          didChange: !1,
        }),
        a.syncHooks.push(s)),
    s.value
  );
}
function $a(e, t, n, r, i) {
  return (0, no.useSyncExternalStoreWithSelector)(e.subscribe, e.getSnapshot, e.getSnapshot, (e) =>
    t(e, n, r, i),
  );
}
var eo,
  to,
  no,
  ro,
  io = t(() => {
    ((eo = e(r())),
      (to = qa()),
      (no = Ya()),
      er(),
      v(),
      (ro = Qn(19) ? Qa : $a),
      d({
        before(e) {
          ((e.syncIndex = 0),
            e.didInitialize ||
              ((e.syncTick = 1),
              (e.syncHooks = []),
              (e.didChangeStore = !0),
              (e.getSnapshot = () => {
                let t = !1;
                for (let n = 0; n < e.syncHooks.length; n += 1) {
                  let r = e.syncHooks[n],
                    i = r.selector(r.store.state, r.a1, r.a2, r.a3);
                  (r.didChange || !Object.is(r.value, i)) &&
                    ((t = !0), (r.value = i), (r.didChange = !1));
                }
                return (t && (e.syncTick += 1), e.syncTick);
              })));
        },
        after(e) {
          e.syncHooks.length > 0 &&
            (e.didChangeStore &&
              ((e.didChangeStore = !1),
              (e.subscribe = (t) => {
                let n = new Set();
                for (let t of e.syncHooks) n.add(t.store);
                let r = [];
                for (let e of n) r.push(e.subscribe(t));
                return () => {
                  for (let e of r) e();
                };
              })),
            (0, to.useSyncExternalStore)(e.subscribe, e.getSnapshot, e.getSnapshot));
        },
      }));
  }),
  ao,
  oo = t(() => {
    (io(),
      (ao = class {
        constructor(e) {
          ((this.state = e), (this.listeners = new Set()), (this.updateTick = 0));
        }
        subscribe = (e) => (
          this.listeners.add(e),
          () => {
            this.listeners.delete(e);
          }
        );
        getSnapshot = () => this.state;
        setState(e) {
          if (this.state === e) return;
          ((this.state = e), (this.updateTick += 1));
          let t = this.updateTick;
          for (let n of this.listeners) {
            if (t !== this.updateTick) return;
            n(e);
          }
        }
        update(e) {
          for (let t in e)
            if (!Object.is(this.state[t], e[t])) {
              this.setState({ ...this.state, ...e });
              return;
            }
        }
        set(e, t) {
          Object.is(this.state[e], t) || this.setState({ ...this.state, [e]: t });
        }
        notifyAll() {
          let e = { ...this.state };
          this.setState(e);
        }
        use(e, t, n, r) {
          return Xa(this, e, t, n, r);
        }
      }));
  }),
  so,
  co,
  lo = t(() => {
    ((so = e(r())),
      oo(),
      io(),
      Pn(),
      T(),
      Jt(),
      (co = class extends ao {
        constructor(e, t = {}, n) {
          (super(e), (this.context = t), (this.selectors = n));
        }
        useSyncedValue(e, t) {
          (so.useDebugValue(e),
            w(() => {
              this.state[e] !== t && this.set(e, t);
            }, [e, t]));
        }
        useSyncedValueWithCleanup(e, t) {
          let n = this;
          w(
            () => (
              n.state[e] !== t && n.set(e, t),
              () => {
                n.set(e, void 0);
              }
            ),
            [n, e, t],
          );
        }
        useSyncedValues(e) {
          let t = this;
          w(() => {
            t.update(e);
          }, [t, ...Object.values(e)]);
        }
        useControlledProp(e, t) {
          so.useDebugValue(e);
          let n = t !== void 0;
          w(() => {
            n && !Object.is(this.state[e], t) && super.setState({ ...this.state, [e]: t });
          }, [e, t, n]);
        }
        select(e, t, n, r) {
          let i = this.selectors[e];
          return i(this.state, t, n, r);
        }
        useState(e, t, n, r) {
          return (so.useDebugValue(e), Xa(this, this.selectors[e], t, n, r));
        }
        useContextCallback(e, t) {
          so.useDebugValue(e);
          let n = F(t ?? Kt);
          this.context[e] = n;
        }
        useStateSetter(e) {
          let t = so.useRef(void 0);
          return (
            t.current === void 0 &&
              (t.current = (t) => {
                this.set(e, t);
              }),
            t.current
          );
        }
        observe(e, t) {
          let n;
          n = typeof e == `function` ? e : this.selectors[e];
          let r = n(this.state);
          return (
            t(r, r, this),
            this.subscribe((e) => {
              let i = n(e);
              if (!Object.is(r, i)) {
                let e = r;
                ((r = i), t(i, e, this));
              }
            })
          );
        }
      }));
  }),
  uo = t(() => {
    (e(r()), e(a()), i());
  }),
  fo = t(() => {
    (Ga(), io(), oo(), lo(), uo());
  }),
  po,
  mo,
  ho = t(() => {
    (fo(),
      Hr(),
      Bt(),
      (po = {
        open: I((e) => e.open),
        domReferenceElement: I((e) => e.domReferenceElement),
        referenceElement: I((e) => e.positionReference ?? e.referenceElement),
        floatingElement: I((e) => e.floatingElement),
        floatingId: I((e) => e.floatingId),
      }),
      (mo = class extends co {
        constructor(e) {
          let { nested: t, noEmit: n, onOpenChange: r, triggerElements: i, ...a } = e;
          super(
            {
              ...a,
              positionReference: a.referenceElement,
              domReferenceElement: a.referenceElement,
            },
            {
              onOpenChange: r,
              dataRef: { current: {} },
              events: Vr(),
              nested: t,
              noEmit: n,
              triggerElements: i,
            },
            po,
          );
        }
        setOpen = (e, t) => {
          if (
            ((!e || !this.state.open || at(t.event)) &&
              (this.context.dataRef.current.openEvent = e ? t.event : void 0),
            !this.context.noEmit)
          ) {
            let n = {
              open: e,
              reason: t.reason,
              nativeEvent: t.event,
              nested: this.context.nested,
              triggerElement: t.trigger,
            };
            this.context.events.emit(`openchange`, n);
          }
          this.context.onOpenChange?.(e, t);
        };
      }));
  });
function go(e, t = !1, n = !1) {
  let [r, i] = _o.useState(e && t ? `idle` : void 0),
    [a, o] = _o.useState(e);
  return (
    e && !a && (o(!0), i(`starting`)),
    !e && a && r !== `ending` && !n && i(`ending`),
    !e && !a && r === `ending` && i(void 0),
    w(() => {
      if (!e && a && r !== `ending` && n) {
        let e = zn.request(() => {
          i(`ending`);
        });
        return () => {
          zn.cancel(e);
        };
      }
    }, [e, a, r, n]),
    w(() => {
      if (!e || t) return;
      let n = zn.request(() => {
        i(void 0);
      });
      return () => {
        zn.cancel(n);
      };
    }, [t, e]),
    w(() => {
      if (!e || !t) return;
      e && a && r !== `idle` && i(`starting`);
      let n = zn.request(() => {
        i(`idle`);
      });
      return () => {
        zn.cancel(n);
      };
    }, [t, e, a, i, r]),
    _o.useMemo(() => ({ mounted: a, setMounted: o, transitionStatus: r }), [a, r])
  );
}
var _o,
  vo = t(() => {
    ((_o = e(r())), T(), Bn());
  }),
  yo,
  bo,
  xo,
  So,
  Co = t(() => {
    ((yo = (function (e) {
      return ((e.startingStyle = `data-starting-style`), (e.endingStyle = `data-ending-style`), e);
    })({})),
      (bo = { [yo.startingStyle]: `` }),
      (xo = { [yo.endingStyle]: `` }),
      (So = {
        transitionStatus(e) {
          return e === `starting` ? bo : e === `ending` ? xo : null;
        },
      }));
  });
function wo(e, t = !1, n = !0) {
  let r = Fn();
  return F((i, a = null) => {
    r.cancel();
    function o() {
      To.flushSync(i);
    }
    let s = Yr(e);
    if (s == null) return;
    let c = s;
    if (typeof c.getAnimations != `function` || globalThis.BASE_UI_ANIMATIONS_DISABLED) i();
    else {
      function e() {
        let e = yo.startingStyle;
        if (!c.hasAttribute(e)) {
          r.request(i);
          return;
        }
        let t = new MutationObserver(() => {
          c.hasAttribute(e) || (t.disconnect(), i());
        });
        (t.observe(c, { attributes: !0, attributeFilter: [e] }),
          a?.addEventListener(`abort`, () => t.disconnect(), { once: !0 }));
      }
      function i() {
        Promise.all(c.getAnimations().map((e) => e.finished))
          .then(() => {
            a?.aborted || o();
          })
          .catch(() => {
            let e = c.getAnimations();
            if (n) {
              if (a?.aborted) return;
              o();
            } else e.length > 0 && e.some((e) => e.pending || e.playState !== `finished`) && i();
          });
      }
      if (t) {
        e();
        return;
      }
      r.request(i);
    }
  });
}
var To,
  Eo = t(() => {
    ((To = e(a())), Bn(), Pn(), Xr(), Co());
  });
function Do(e) {
  let { enabled: t = !0, open: n, ref: r, onComplete: i } = e,
    a = F(i),
    o = wo(r, n, !1);
  Oo.useEffect(() => {
    if (!t) return;
    let e = new AbortController();
    return (
      o(a, e.signal),
      () => {
        e.abort();
      }
    );
  }, [t, n, a, o]);
}
var Oo,
  ko = t(() => {
    ((Oo = e(r())), Pn(), Eo());
  });
function Ao(e, t) {
  let n = Po.useRef(null),
    r = Po.useRef(null);
  return Po.useCallback(
    (i) => {
      if (e !== void 0) {
        if (n.current !== null) {
          let e = n.current,
            i = r.current,
            a = t.context.triggerElements.getById(e);
          (i && a === i && t.context.triggerElements.delete(e),
            (n.current = null),
            (r.current = null));
        }
        i !== null && ((n.current = e), (r.current = i), t.context.triggerElements.add(e, i));
      }
    },
    [t, e],
  );
}
function jo(e, t, n, r) {
  let i = n.useState(`isMountedByTrigger`, e),
    a = Ao(e, n),
    o = F((t) => {
      if ((a(t), !t || !n.select(`open`))) return;
      let i = n.select(`activeTriggerId`);
      if (i === e) {
        n.update({ activeTriggerElement: t, ...r });
        return;
      }
      i ?? n.update({ activeTriggerId: e, activeTriggerElement: t, ...r });
    });
  return (
    w(() => {
      i && n.update({ activeTriggerElement: t.current, ...r });
    }, [i, n, t, ...Object.values(r)]),
    { registerTrigger: o, isMountedByThisTrigger: i }
  );
}
function Mo(e) {
  let t = e.useState(`open`);
  w(() => {
    if (t && !e.select(`activeTriggerId`) && e.context.triggerElements.size === 1) {
      let t = e.context.triggerElements.entries().next();
      if (!t.done) {
        let [n, r] = t.value;
        e.update({ activeTriggerId: n, activeTriggerElement: r });
      }
    }
  }, [t, e]);
}
function No(e, t, n) {
  let { mounted: r, setMounted: i, transitionStatus: a } = go(e);
  t.useSyncedValues({ mounted: r, transitionStatus: a });
  let o = F(() => {
    (i(!1),
      t.update({ activeTriggerId: null, activeTriggerElement: null, mounted: !1 }),
      n?.(),
      t.context.onOpenChangeComplete?.(!1));
  });
  return (
    Do({
      enabled: !t.useState(`preventUnmountingOnClose`),
      open: e,
      ref: t.context.popupRef,
      onComplete() {
        e || o();
      },
    }),
    { forceUnmount: o, transitionStatus: a }
  );
}
var Po,
  Fo = t(() => {
    ((Po = e(r())), Pn(), T(), vo(), ko());
  }),
  Io,
  Lo = t(() => {
    Io = class {
      constructor() {
        ((this.elementsSet = new Set()), (this.idMap = new Map()));
      }
      add(e, t) {
        let n = this.idMap.get(e);
        n !== t &&
          (n !== void 0 && this.elementsSet.delete(n),
          this.elementsSet.add(t),
          this.idMap.set(e, t));
      }
      delete(e) {
        let t = this.idMap.get(e);
        t && (this.elementsSet.delete(t), this.idMap.delete(e));
      }
      hasElement(e) {
        return this.elementsSet.has(e);
      }
      hasMatchingElement(e) {
        for (let t of this.elementsSet) if (e(t)) return !0;
        return !1;
      }
      getById(e) {
        return this.idMap.get(e);
      }
      entries() {
        return this.idMap.entries();
      }
      elements() {
        return this.elementsSet.values();
      }
      get size() {
        return this.idMap.size;
      }
    };
  });
function Ro() {
  return new mo({
    open: !1,
    floatingElement: null,
    referenceElement: null,
    triggerElements: new Io(),
    floatingId: ``,
    nested: !1,
    noEmit: !1,
    onOpenChange: void 0,
  });
}
var zo = t(() => {
  (Wo(), ho());
});
function Bo() {
  return {
    open: !1,
    openProp: void 0,
    mounted: !1,
    transitionStatus: `idle`,
    floatingRootContext: Ro(),
    preventUnmountingOnClose: !1,
    payload: void 0,
    activeTriggerId: null,
    activeTriggerElement: null,
    triggerIdProp: void 0,
    popupElement: null,
    positionerElement: null,
    activeTriggerProps: qt,
    inactiveTriggerProps: qt,
    popupProps: qt,
  };
}
var Vo,
  Ho,
  Uo = t(() => {
    (fo(),
      zo(),
      $t(),
      (Vo = I((e) => e.triggerIdProp ?? e.activeTriggerId)),
      (Ho = {
        open: I((e) => e.openProp ?? e.open),
        mounted: I((e) => e.mounted),
        transitionStatus: I((e) => e.transitionStatus),
        floatingRootContext: I((e) => e.floatingRootContext),
        preventUnmountingOnClose: I((e) => e.preventUnmountingOnClose),
        payload: I((e) => e.payload),
        activeTriggerId: Vo,
        activeTriggerElement: I((e) => (e.mounted ? e.activeTriggerElement : null)),
        isTriggerActive: I((e, t) => t !== void 0 && Vo(e) === t),
        isOpenedByTrigger: I((e, t) => t !== void 0 && Vo(e) === t && e.open),
        isMountedByTrigger: I((e, t) => t !== void 0 && Vo(e) === t && e.mounted),
        triggerProps: I((e, t) => (t ? e.activeTriggerProps : e.inactiveTriggerProps)),
        popupProps: I((e) => e.popupProps),
        popupElement: I((e) => e.popupElement),
        positionerElement: I((e) => e.positionerElement),
      }));
  }),
  Wo = t(() => {
    (Fo(), Lo(), Uo());
  });
function Go(e) {
  let { open: t = !1, onOpenChange: n, elements: r = {} } = e,
    i = qn(),
    a = Kr() != null,
    s = o(
      () =>
        new mo({
          open: t,
          onOpenChange: n,
          referenceElement: r.reference ?? null,
          floatingElement: r.floating ?? null,
          triggerElements: new Io(),
          floatingId: i,
          nested: a,
          noEmit: !1,
        }),
    ).current;
  return (
    w(() => {
      let e = { open: t, floatingId: i };
      (r.reference !== void 0 &&
        ((e.referenceElement = r.reference),
        (e.domReferenceElement = P(r.reference) ? r.reference : null)),
        r.floating !== void 0 && (e.floatingElement = r.floating),
        s.update(e));
    }, [t, i, r.reference, r.floating, s]),
    (s.context.onOpenChange = n),
    (s.context.nested = a),
    (s.context.noEmit = !1),
    s
  );
}
var Ko = t(() => {
  (je(), Zn(), l(), T(), Jr(), ho(), Wo());
});
function qo(e = {}) {
  let { nodeId: t, externalTree: n } = e,
    r = Go(e),
    i = e.rootContext || r,
    a = {
      reference: i.useState(`referenceElement`),
      floating: i.useState(`floatingElement`),
      domReference: i.useState(`domReferenceElement`),
    },
    [o, s] = Jo.useState(null),
    c = Jo.useRef(null),
    l = qr(n);
  w(() => {
    a.domReference && (c.current = a.domReference);
  }, [a.domReference]);
  let u = da({ ...e, elements: { ...a, ...(o && { reference: o }) } }),
    d = Jo.useCallback(
      (e) => {
        let t = P(e)
          ? {
              getBoundingClientRect: () => e.getBoundingClientRect(),
              getClientRects: () => e.getClientRects(),
              contextElement: e,
            }
          : e;
        (s(t), u.refs.setReference(t));
      },
      [u.refs],
    ),
    [f, p] = Jo.useState(null),
    [m, h] = Jo.useState(null);
  (i.useSyncedValue(`referenceElement`, f),
    i.useSyncedValue(`domReferenceElement`, P(f) ? f : null),
    i.useSyncedValue(`floatingElement`, m));
  let g = Jo.useCallback(
      (e) => {
        ((P(e) || e === null) && ((c.current = e), p(e)),
          (P(u.refs.reference.current) ||
            u.refs.reference.current === null ||
            (e !== null && !P(e))) &&
            u.refs.setReference(e));
      },
      [u.refs, p],
    ),
    _ = Jo.useCallback(
      (e) => {
        (h(e), u.refs.setFloating(e));
      },
      [u.refs],
    ),
    v = Jo.useMemo(
      () => ({
        ...u.refs,
        setReference: g,
        setFloating: _,
        setPositionReference: d,
        domReference: c,
      }),
      [u.refs, g, _, d],
    ),
    y = Jo.useMemo(
      () => ({ ...u.elements, domReference: a.domReference }),
      [u.elements, a.domReference],
    ),
    b = i.useState(`open`),
    x = i.useState(`floatingId`),
    S = Jo.useMemo(
      () => ({
        ...u,
        dataRef: i.context.dataRef,
        open: b,
        onOpenChange: i.setOpen,
        events: i.context.events,
        floatingId: x,
        refs: v,
        elements: y,
        nodeId: t,
        rootStore: i,
      }),
      [u, v, y, t, i, b, x],
    );
  return (
    w(() => {
      i.context.dataRef.current.floatingContext = S;
      let e = l?.nodesRef.current.find((e) => e.id === t);
      e && (e.context = S);
    }),
    Jo.useMemo(() => ({ ...u, context: S, refs: v, elements: y, rootStore: i }), [u, v, y, S, i])
  );
}
var Jo,
  Yo = t(() => {
    ((Jo = e(r())), Sa(), je(), T(), Jr(), Ko());
  });
function Xo(e) {
  let { popupStore: t, noEmit: n = !1, treatPopupAsFloatingElement: r = !1, onOpenChange: i } = e,
    a = qn(),
    s = Kr() != null,
    c = t.useState(`open`),
    l = t.useState(`activeTriggerElement`),
    u = t.useState(r ? `popupElement` : `positionerElement`),
    d = t.context.triggerElements,
    f = o(
      () =>
        new mo({
          open: c,
          referenceElement: l,
          floatingElement: u,
          triggerElements: d,
          onOpenChange: i,
          floatingId: a,
          nested: s,
          noEmit: n,
        }),
    ).current;
  return (
    w(() => {
      let e = { open: c, floatingId: a, referenceElement: l, floatingElement: u };
      (P(l) && (e.domReferenceElement = l),
        f.state.positionReference === f.state.referenceElement && (e.positionReference = l),
        f.update(e));
    }, [c, a, l, u, f]),
    (f.context.onOpenChange = i),
    (f.context.nested = s),
    (f.context.noEmit = n),
    f
  );
}
var Zo = t(() => {
  (Zn(), l(), T(), je(), Jr(), ho());
});
function Qo(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    { events: r, dataRef: i } = n.context,
    { enabled: a = !0, delay: o } = t,
    s = $o.useRef(!1),
    c = $o.useRef(null),
    l = ae(),
    u = $o.useRef(!0);
  ($o.useEffect(() => {
    let e = n.select(`domReferenceElement`);
    if (!a) return;
    let t = N(e);
    function r() {
      let e = n.select(`domReferenceElement`);
      !n.select(`open`) && fe(e) && e === Ke(Lt(e)) && (s.current = !0);
    }
    function i() {
      u.current = !0;
    }
    function o() {
      u.current = !1;
    }
    return (
      t.addEventListener(`blur`, r),
      es && (t.addEventListener(`keydown`, i, !0), t.addEventListener(`pointerdown`, o, !0)),
      () => {
        (t.removeEventListener(`blur`, r),
          es &&
            (t.removeEventListener(`keydown`, i, !0), t.removeEventListener(`pointerdown`, o, !0)));
      }
    );
  }, [n, a]),
    $o.useEffect(() => {
      if (!a) return;
      function e(e) {
        if (e.reason === `trigger-press` || e.reason === `escape-key`) {
          let e = n.select(`domReferenceElement`);
          P(e) && ((c.current = e), (s.current = !0));
        }
      }
      return (
        r.on(`openchange`, e),
        () => {
          r.off(`openchange`, e);
        }
      );
    }, [r, a, n]));
  let d = $o.useMemo(
    () => ({
      onMouseLeave() {
        ((s.current = !1), (c.current = null));
      },
      onFocus(e) {
        let t = e.currentTarget;
        if (s.current) {
          if (c.current === t) return;
          ((s.current = !1), (c.current = null));
        }
        let r = Ye(e.nativeEvent);
        if (P(r)) {
          if (es && !e.relatedTarget) {
            if (!u.current && !Qe(r)) return;
          } else if (!$e(r)) return;
        }
        let i = Je(e.relatedTarget, n.context.triggerElements),
          { nativeEvent: a, currentTarget: d } = e,
          f = typeof o == `function` ? o() : o;
        if ((n.select(`open`) && i) || f === 0 || f === void 0) {
          n.setOpen(!0, dn(rn, a, d));
          return;
        }
        l.start(f, () => {
          s.current || n.setOpen(!0, dn(rn, a, d));
        });
      },
      onBlur(e) {
        ((s.current = !1), (c.current = null));
        let t = e.relatedTarget,
          r = e.nativeEvent,
          a =
            P(t) && t.hasAttribute(Vn(`focus-guard`)) && t.getAttribute(`data-type`) === `outside`;
        l.start(0, () => {
          let e = n.select(`domReferenceElement`),
            o = Ke(e ? e.ownerDocument : document);
          (!t && o === e) ||
            qe(i.current.floatingContext?.refs.floating.current, o) ||
            qe(e, o) ||
            a ||
            Je(t ?? o, n.context.triggerElements) ||
            n.setOpen(!1, dn(rn, r));
        });
      },
    }),
    [i, n, l, o],
  );
  return $o.useMemo(() => (a ? { reference: d, trigger: d } : {}), [a, d]);
}
var $o,
  es,
  ts = t(() => {
    (($o = e(r())), je(), He(), ce(), Rt(), Bt(), fn(), un(), Hn(), (es = Be && ze));
  });
function ns(e) {
  return e ? !!e.closest(os) : !1;
}
function rs(e) {
  e.performedPointerEventsMutation &&
    (e.pointerEventsScopeElement?.style.removeProperty(`pointer-events`),
    e.pointerEventsReferenceElement?.style.removeProperty(`pointer-events`),
    e.pointerEventsFloatingElement?.style.removeProperty(`pointer-events`),
    (e.performedPointerEventsMutation = !1),
    (e.pointerEventsScopeElement = null),
    (e.pointerEventsReferenceElement = null),
    (e.pointerEventsFloatingElement = null));
}
function is(e, t) {
  let { scopeElement: n, referenceElement: r, floatingElement: i } = t;
  (rs(e),
    (e.performedPointerEventsMutation = !0),
    (e.pointerEventsScopeElement = n),
    (e.pointerEventsReferenceElement = r),
    (e.pointerEventsFloatingElement = i),
    (n.style.pointerEvents = `none`),
    (r.style.pointerEvents = `auto`),
    (i.style.pointerEvents = `auto`));
}
function as(e) {
  let t = o(ss.create).current,
    n = e.context.dataRef.current;
  return (
    (n.hoverInteractionState ||= t),
    ne(n.hoverInteractionState.disposeEffect),
    n.hoverInteractionState
  );
}
var os,
  ss,
  cs = t(() => {
    (ie(),
      l(),
      ce(),
      Ge(),
      (os = `button,a,[role="button"],select,[tabindex]:not([tabindex="-1"]),${We}`),
      (ss = class e {
        constructor() {
          ((this.pointerType = void 0),
            (this.interactedInside = !1),
            (this.handler = void 0),
            (this.blockMouseMove = !0),
            (this.performedPointerEventsMutation = !1),
            (this.pointerEventsScopeElement = null),
            (this.pointerEventsReferenceElement = null),
            (this.pointerEventsFloatingElement = null),
            (this.restTimeoutPending = !1),
            (this.openChangeTimeout = new se()),
            (this.restTimeout = new se()),
            (this.handleCloseOptions = void 0));
        }
        static create() {
          return new e();
        }
        dispose = () => {
          (this.openChangeTimeout.clear(), this.restTimeout.clear());
        };
        disposeEffect = () => this.dispose;
      }));
  });
function ls(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    a = n.useState(`domReferenceElement`),
    { dataRef: o } = n.context,
    { enabled: s = !0, closeDelay: c = 0 } = t,
    l = as(n),
    u = qr(),
    d = Kr(),
    f = F(() => Wt(o.current.openEvent?.type, l.interactedInside)),
    p = F(() => {
      let e = o.current.openEvent?.type;
      return e?.includes(`mouse`) && e !== `mousedown`;
    }),
    m = F((e) => Je(e, n.context.triggerElements)),
    h = us.useCallback(
      (e) => {
        let t = Ht(c, `close`, l.pointerType),
          r = () => {
            (n.setOpen(!1, dn(nn, e)), u?.events.emit(`floating.closed`, e));
          };
        t ? l.openChangeTimeout.start(t, r) : (l.openChangeTimeout.clear(), r());
      },
      [c, n, l, u],
    ),
    g = F(() => {
      rs(l);
    }),
    _ = F((e) => {
      let t = Ye(e);
      if (!ns(t)) {
        l.interactedInside = !1;
        return;
      }
      l.interactedInside = t?.closest(`[aria-haspopup]`) != null;
    });
  (w(() => {
    r || ((l.pointerType = void 0), (l.restTimeoutPending = !1), (l.interactedInside = !1), g());
  }, [r, l, g]),
    us.useEffect(() => g, [g]),
    w(() => {
      if (s && r && l.handleCloseOptions?.blockPointerEvents && p() && P(a) && i) {
        let e = a,
          t = i,
          n = Lt(i),
          r = u?.nodesRef.current.find((e) => e.id === d)?.context?.elements.floating;
        return (
          r && (r.style.pointerEvents = ``),
          is(l, {
            scopeElement:
              l.handleCloseOptions?.getScope?.() ??
              l.pointerEventsScopeElement ??
              r ??
              e.closest(`[data-rootownerid]`) ??
              n.body,
            referenceElement: e,
            floatingElement: t,
          }),
          () => {
            g();
          }
        );
      }
    }, [s, r, a, i, l, p, u, d, g]));
  let v = ae();
  us.useEffect(() => {
    if (!s) return;
    function e() {
      (l.openChangeTimeout.clear(), v.clear(), u?.events.off(`floating.closed`, r), g());
    }
    function t(e) {
      if (u && d && tt(u.nodesRef.current, d).length > 0) {
        u.events.on(`floating.closed`, r);
        return;
      }
      if (!m(e.relatedTarget)) {
        if (l.handler) {
          l.handler(e);
          return;
        }
        (g(), f() || h(e));
      }
    }
    function r(e) {
      !u ||
        !d ||
        tt(u.nodesRef.current, d).length > 0 ||
        v.start(0, () => {
          (u.events.off(`floating.closed`, r),
            n.setOpen(!1, dn(nn, e)),
            u.events.emit(`floating.closed`, e));
        });
    }
    let a = i;
    return (
      a &&
        (a.addEventListener(`mouseenter`, e),
        a.addEventListener(`mouseleave`, t),
        a.addEventListener(`pointerdown`, _, !0)),
      () => {
        (a &&
          (a.removeEventListener(`mouseenter`, e),
          a.removeEventListener(`mouseleave`, t),
          a.removeEventListener(`pointerdown`, _, !0)),
          u?.events.off(`floating.closed`, r));
      }
    );
  }, [s, i, n, o, f, m, h, g, _, l, u, d, v]);
}
var us,
  ds = t(() => {
    ((us = e(r())), je(), Pn(), T(), ce(), Rt(), Bt(), fn(), un(), Jr(), cs(), Gt());
  });
function fs(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    { dataRef: r, events: i } = n.context,
    {
      enabled: a = !0,
      delay: o = 0,
      handleClose: s = null,
      mouseOnly: c = !1,
      restMs: l = 0,
      move: u = !0,
      triggerElementRef: d = hs,
      externalTree: f,
      isActiveTrigger: p = !0,
      getHandleCloseContext: m,
    } = t,
    h = qr(f),
    g = as(n),
    _ = En(s),
    v = En(o),
    y = En(l),
    b = En(a);
  p && (g.handleCloseOptions = _.current?.__options);
  let x = F(() => Wt(r.current.openEvent?.type, g.interactedInside)),
    S = F((e) => Je(e, n.context.triggerElements)),
    C = F((e, t, r) => {
      let i = n.context.triggerElements;
      if (i.hasElement(t)) return !e || !qe(e, t);
      if (!P(r)) return !1;
      let a = r;
      return i.hasMatchingElement((e) => qe(e, a)) && (!e || !qe(e, a));
    }),
    w = ps.useCallback(
      (e, t = !0) => {
        let r = Ht(v.current, `close`, g.pointerType);
        r
          ? g.openChangeTimeout.start(r, () => {
              (n.setOpen(!1, dn(nn, e)), h?.events.emit(`floating.closed`, e));
            })
          : t &&
            (g.openChangeTimeout.clear(),
            n.setOpen(!1, dn(nn, e)),
            h?.events.emit(`floating.closed`, e));
      },
      [v, n, g, h],
    ),
    T = F(() => {
      g.handler &&=
        (Lt(n.select(`domReferenceElement`)).removeEventListener(`mousemove`, g.handler), void 0);
    });
  ps.useEffect(() => T, [T]);
  let E = F(() => {
    rs(g);
  });
  return (
    ps.useEffect(() => {
      if (!a) return;
      function e(e) {
        e.open ||
          (T(),
          g.openChangeTimeout.clear(),
          g.restTimeout.clear(),
          (g.blockMouseMove = !0),
          (g.restTimeoutPending = !1));
      }
      return (
        i.on(`openchange`, e),
        () => {
          i.off(`openchange`, e);
        }
      );
    }, [a, i, g, T]),
    ps.useEffect(() => {
      if (!a) return;
      let e = d.current ?? (p ? n.select(`domReferenceElement`) : null);
      if (!P(e)) return;
      function t(e) {
        if (
          (g.openChangeTimeout.clear(),
          (g.blockMouseMove = !1),
          (c && !it(g.pointerType)) || (Ut(y.current) > 0 && !Ht(v.current, `open`)))
        )
          return;
        let t = Ht(v.current, `open`, g.pointerType),
          r = e.currentTarget ?? null,
          i = n.select(`domReferenceElement`),
          a = r == null ? !1 : C(i, r, e.target),
          o = n.select(`open`),
          s = !o || a;
        a && o
          ? n.setOpen(!0, dn(nn, e, r))
          : t
            ? g.openChangeTimeout.start(t, () => {
                s && n.setOpen(!0, dn(nn, e, r));
              })
            : s && n.setOpen(!0, dn(nn, e, r));
      }
      function i(e) {
        if (x()) {
          E();
          return;
        }
        T();
        let t = Lt(n.select(`domReferenceElement`));
        (g.restTimeout.clear(), (g.restTimeoutPending = !1));
        let i = r.current.floatingContext ?? m?.();
        if (!S(e.relatedTarget)) {
          if (_.current && i) {
            n.select(`open`) || g.openChangeTimeout.clear();
            let r = d.current;
            ((g.handler = _.current({
              ...i,
              tree: h,
              x: e.clientX,
              y: e.clientY,
              onClose() {
                (E(), T(), b.current && !x() && r === n.select(`domReferenceElement`) && w(e, !0));
              },
            })),
              t.addEventListener(`mousemove`, g.handler),
              g.handler(e));
            return;
          }
          (g.pointerType !== `touch` || !qe(n.select(`floatingElement`), e.relatedTarget)) && w(e);
        }
      }
      return (
        u && e.addEventListener(`mousemove`, t, { once: !0 }),
        e.addEventListener(`mouseenter`, t),
        e.addEventListener(`mouseleave`, i),
        () => {
          (u && e.removeEventListener(`mousemove`, t),
            e.removeEventListener(`mouseenter`, t),
            e.removeEventListener(`mouseleave`, i));
        }
      );
    }, [T, E, r, v, w, n, a, _, g, p, C, x, S, c, u, y, d, h, b, m]),
    ps.useMemo(() => {
      if (!a) return;
      function e(e) {
        g.pointerType = e.pointerType;
      }
      return {
        onPointerDown: e,
        onPointerEnter: e,
        onMouseMove(e) {
          let { nativeEvent: t } = e,
            r = e.currentTarget,
            i = n.select(`domReferenceElement`),
            a = n.select(`open`),
            o = C(i, r, e.target);
          if (c && !it(g.pointerType)) return;
          let s = Ut(y.current);
          if (
            (a && !o) ||
            s === 0 ||
            (!o && g.restTimeoutPending && e.movementX ** 2 + e.movementY ** 2 < 2)
          )
            return;
          g.restTimeout.clear();
          function l() {
            if (((g.restTimeoutPending = !1), x())) return;
            let e = n.select(`open`);
            !g.blockMouseMove && (!e || o) && n.setOpen(!0, dn(nn, t, r));
          }
          g.pointerType === `touch`
            ? ms.flushSync(() => {
                l();
              })
            : o && a
              ? l()
              : ((g.restTimeoutPending = !0), g.restTimeout.start(s, l));
        },
      };
    }, [a, g, x, C, c, n, y])
  );
}
var ps,
  ms,
  hs,
  gs = t(() => {
    ((ps = e(r())),
      (ms = e(a())),
      je(),
      On(),
      Pn(),
      Rt(),
      Bt(),
      fn(),
      un(),
      Jr(),
      cs(),
      Gt(),
      (hs = { current: null }));
  });
function _s(e = []) {
  let t = e.map((e) => e?.reference),
    n = e.map((e) => e?.floating),
    r = e.map((e) => e?.item),
    i = e.map((e) => e?.trigger),
    a = bs.useCallback((t) => vs(t, e, `reference`), t),
    o = bs.useCallback((t) => vs(t, e, `floating`), n),
    s = bs.useCallback((t) => vs(t, e, `item`), r),
    c = bs.useCallback((t) => vs(t, e, `trigger`), i);
  return bs.useMemo(
    () => ({ getReferenceProps: a, getFloatingProps: o, getItemProps: s, getTriggerProps: c }),
    [a, o, s, c],
  );
}
function vs(e, t, n) {
  let r = new Map(),
    i = n === `item`,
    a = {};
  n === `floating` && ((a.tabIndex = -1), (a[Ue] = ``));
  for (let t in e) (i && e && (t === `active` || t === `selected`)) || (a[t] = e[t]);
  for (let o = 0; o < t.length; o += 1) {
    let s,
      c = t[o]?.[n];
    ((s = typeof c == `function` ? (e ? c(e) : null) : c), s && ys(a, s, i, r));
  }
  return (ys(a, e, i, r), a);
}
function ys(e, t, n, r) {
  for (let i in t) {
    let a = t[i];
    (n && (i === `active` || i === `selected`)) ||
      (i.startsWith(`on`)
        ? (r.has(i) || r.set(i, []),
          typeof a == `function` &&
            (r.get(i)?.push(a),
            (e[i] = (...e) =>
              r
                .get(i)
                ?.map((t) => t(...e))
                .find((e) => e !== void 0))))
        : (e[i] = a));
  }
}
var bs,
  xs = t(() => {
    ((bs = e(r())), Ge());
  });
function Ss(e, t, n, r, i, a) {
  return r >= t != a >= t && e <= ((i - n) * (t - r)) / (a - r) + n;
}
function Cs(e, t, n, r, i, a, o, s, c, l) {
  let u = !1;
  return (
    Ss(e, t, n, r, i, a) && (u = !u),
    Ss(e, t, i, a, o, s) && (u = !u),
    Ss(e, t, o, s, c, l) && (u = !u),
    Ss(e, t, c, l, n, r) && (u = !u),
    u
  );
}
function ws(e, t, n) {
  return e >= n.x && e <= n.x + n.width && t >= n.y && t <= n.y + n.height;
}
function Ts(e, t, n, r, i, a) {
  return e >= Math.min(n, i) && e <= Math.max(n, i) && t >= Math.min(r, a) && t <= Math.max(r, a);
}
function Es(e = {}) {
  let { blockPointerEvents: t = !1 } = e,
    n = new se(),
    r = ({ x: e, y: t, placement: r, elements: i, onClose: a, nodeId: o, tree: s }) => {
      let c = r?.split(`-`)[0],
        l = !1,
        u = null,
        d = null,
        f = typeof performance < `u` ? performance.now() : 0;
      function p(e, t) {
        let n = performance.now(),
          r = n - f;
        if (u === null || d === null || r === 0) return ((u = e), (d = t), (f = n), !1);
        let i = e - u,
          a = t - d,
          o = i * i + a * a,
          s = r * r * Os;
        return ((u = e), (d = t), (f = n), o < s);
      }
      function m() {
        (n.clear(), a());
      }
      return function (r) {
        n.clear();
        let a = i.domReference,
          u = i.floating;
        if (!a || !u || c == null || e == null || t == null) return;
        let { clientX: d, clientY: f } = r,
          h = Ye(r),
          g = r.type === `mouseleave`,
          _ = qe(u, h),
          v = qe(a, h);
        if (_ && ((l = !0), !g)) return;
        if (v && ((l = !1), !g)) {
          l = !0;
          return;
        }
        if (g && P(r.relatedTarget) && qe(u, r.relatedTarget)) return;
        function y() {
          return !!(s && tt(s.nodesRef.current, o).length > 0);
        }
        function b() {
          y() || m();
        }
        if (y()) return;
        let x = a.getBoundingClientRect(),
          S = u.getBoundingClientRect(),
          C = e > S.right - S.width / 2,
          w = t > S.bottom - S.height / 2,
          T = S.width > x.width,
          E = S.height > x.height,
          D = (T ? x : S).left,
          ee = (T ? x : S).right,
          te = (E ? x : S).top,
          O = (E ? x : S).bottom;
        if (
          (c === `top` && t >= x.bottom - 1) ||
          (c === `bottom` && t <= x.top + 1) ||
          (c === `left` && e >= x.right - 1) ||
          (c === `right` && e <= x.left + 1)
        ) {
          b();
          return;
        }
        let k = !1;
        switch (c) {
          case `top`:
            k = Ts(d, f, D, x.top + 1, ee, S.bottom - 1);
            break;
          case `bottom`:
            k = Ts(d, f, D, S.top + 1, ee, x.bottom - 1);
            break;
          case `left`:
            k = Ts(d, f, S.right - 1, O, x.left + 1, te);
            break;
          case `right`:
            k = Ts(d, f, x.right - 1, O, S.left + 1, te);
            break;
          default:
        }
        if (k) return;
        if (l && !ws(d, f, x)) {
          b();
          return;
        }
        if (!g && p(d, f)) {
          b();
          return;
        }
        let A = !1;
        switch (c) {
          case `top`: {
            let n = T ? L / 2 : L * 4,
              r = T || C ? e + n : e - n,
              i = T ? e - n : C ? e + n : e - n,
              a = t + L + 1,
              o = C || T ? S.bottom - L : S.top,
              s = C ? (T ? S.bottom - L : S.top) : S.bottom - L;
            A = Cs(d, f, r, a, i, a, S.left, o, S.right, s);
            break;
          }
          case `bottom`: {
            let n = T ? L / 2 : L * 4,
              r = T || C ? e + n : e - n,
              i = T ? e - n : C ? e + n : e - n,
              a = t - L,
              o = C || T ? S.top + L : S.bottom,
              s = C ? (T ? S.top + L : S.bottom) : S.top + L;
            A = Cs(d, f, r, a, i, a, S.left, o, S.right, s);
            break;
          }
          case `left`: {
            let n = E ? L / 2 : L * 4,
              r = E || w ? t + n : t - n,
              i = E ? t - n : w ? t + n : t - n,
              a = e + L + 1,
              o = w || E ? S.right - L : S.left,
              s = w ? (E ? S.right - L : S.left) : S.right - L;
            A = Cs(d, f, o, S.top, s, S.bottom, a, r, a, i);
            break;
          }
          case `right`: {
            let n = E ? L / 2 : L * 4,
              r = E || w ? t + n : t - n,
              i = E ? t - n : w ? t + n : t - n,
              a = e - L,
              o = w || E ? S.left + L : S.right,
              s = w ? (E ? S.left + L : S.right) : S.left + L;
            A = Cs(d, f, a, r, a, i, o, S.top, s, S.bottom);
            break;
          }
          default:
        }
        A ? l || n.start(40, b) : b();
      };
    };
  return ((r.__options = { blockPointerEvents: t }), r);
}
var Ds,
  Os,
  L,
  ks = t(() => {
    (je(), ce(), et(), nt(), (Ds = 0.1), (Os = Ds * Ds), (L = 0.5));
  }),
  As = t(() => {
    (vn(), Br(), ti(), si(), Yo(), Zo(), ts(), ds(), gs(), xs(), ks(), Sa());
  });
function js() {
  return {
    ...Bo(),
    disabled: !1,
    instantType: void 0,
    isInstantPhase: !1,
    trackCursorAxis: `none`,
    disableHoverablePopup: !1,
    openChangeReason: null,
    closeOnClick: !0,
    closeDelay: 0,
    hasViewport: !1,
  };
}
var Ms,
  Ns,
  Ps,
  Fs,
  Is = t(() => {
    ((Ms = e(r())),
      (Ns = e(a())),
      fo(),
      l(),
      As(),
      un(),
      Wo(),
      (Ps = {
        ...Ho,
        disabled: I((e) => e.disabled),
        instantType: I((e) => e.instantType),
        isInstantPhase: I((e) => e.isInstantPhase),
        trackCursorAxis: I((e) => e.trackCursorAxis),
        disableHoverablePopup: I((e) => e.disableHoverablePopup),
        lastOpenChangeReason: I((e) => e.openChangeReason),
        closeOnClick: I((e) => e.closeOnClick),
        closeDelay: I((e) => e.closeDelay),
        hasViewport: I((e) => e.hasViewport),
      }),
      (Fs = class e extends co {
        constructor(e) {
          super(
            { ...js(), ...e },
            {
              popupRef: Ms.createRef(),
              onOpenChange: void 0,
              onOpenChangeComplete: void 0,
              triggerElements: new Io(),
            },
            Ps,
          );
        }
        setOpen = (e, t) => {
          let n = t.reason,
            r = n === nn,
            i = e && n === `trigger-focus`,
            a = !e && (n === `trigger-press` || n === `escape-key`);
          if (
            ((t.preventUnmountOnClose = () => {
              this.set(`preventUnmountingOnClose`, !0);
            }),
            this.context.onOpenChange?.(e, t),
            t.isCanceled)
          )
            return;
          let o = () => {
            let r = { open: e, openChangeReason: n };
            i
              ? (r.instantType = `focus`)
              : a
                ? (r.instantType = `dismiss`)
                : n === `trigger-hover` && (r.instantType = void 0);
            let o = t.trigger?.id ?? null;
            ((o || e) && ((r.activeTriggerId = o), (r.activeTriggerElement = t.trigger ?? null)),
              this.update(r));
          };
          r ? Ns.flushSync(o) : o();
        };
        static useStore(t, n) {
          let r = o(() => new e(n)).current,
            i = t ?? r,
            a = Xo({ popupStore: i, onOpenChange: i.setOpen });
          return ((i.state.floatingRootContext = a), i);
        }
      }));
  });
function Ls(e, t) {
  let n = dn(t);
  return (
    (n.preventUnmountOnClose = () => {
      e.set(`preventUnmountingOnClose`, !0);
    }),
    n
  );
}
var Rs,
  zs,
  Bs,
  Vs = t(() => {
    ((Rs = e(r())),
      v(),
      x(),
      T(),
      A(),
      As(),
      fn(),
      Wo(),
      Is(),
      un(),
      (zs = i()),
      (Bs = f(function (e) {
        let {
            disabled: t = !1,
            defaultOpen: n = !1,
            open: r,
            disableHoverablePopup: i = !1,
            trackCursorAxis: a = `none`,
            actionsRef: o,
            onOpenChange: s,
            onOpenChangeComplete: c,
            handle: l,
            triggerId: u,
            defaultTriggerId: d = null,
            children: f,
          } = e,
          p = Fs.useStore(l?.store, { open: n, openProp: r, activeTriggerId: d, triggerIdProp: u });
        (y(() => {
          r === void 0 &&
            p.state.open === !1 &&
            n === !0 &&
            p.update({ open: !0, activeTriggerId: d });
        }),
          p.useControlledProp(`openProp`, r),
          p.useControlledProp(`triggerIdProp`, u),
          p.useContextCallback(`onOpenChange`, s),
          p.useContextCallback(`onOpenChangeComplete`, c));
        let m = p.useState(`open`),
          h = !t && m,
          g = p.useState(`activeTriggerId`),
          _ = p.useState(`payload`);
        (p.useSyncedValues({ trackCursorAxis: a, disableHoverablePopup: i }),
          w(() => {
            m && t && p.setOpen(!1, dn(sn));
          }, [m, t, p]),
          p.useSyncedValue(`disabled`, t),
          Mo(p));
        let { forceUnmount: v, transitionStatus: b } = No(h, p),
          x = p.useState(`isInstantPhase`),
          S = p.useState(`instantType`),
          C = p.useState(`lastOpenChangeReason`),
          T = Rs.useRef(null);
        (w(() => {
          (b === `ending` && C === `none`) || (b !== `ending` && x)
            ? (S !== `delay` && (T.current = S), p.set(`instantType`, `delay`))
            : T.current !== null && (p.set(`instantType`, T.current), (T.current = null));
        }, [b, x, C, S, p]),
          w(() => {
            h && (g ?? p.set(`payload`, void 0));
          }, [p, g, h]));
        let E = Rs.useCallback(() => {
          p.setOpen(!1, Ls(p, cn));
        }, [p]);
        Rs.useImperativeHandle(o, () => ({ unmount: v, close: E }), [v, E]);
        let D = p.useState(`floatingRootContext`),
          {
            getReferenceProps: ee,
            getFloatingProps: te,
            getTriggerProps: O,
          } = _s([
            ii(D, { enabled: !t, referencePress: () => p.select(`closeOnClick`) }),
            $r(D, { enabled: !t && a !== `none`, axis: a === `none` ? void 0 : a }),
          ]),
          A = Rs.useMemo(() => ee(), [ee]),
          ne = Rs.useMemo(() => O(), [O]),
          j = Rs.useMemo(() => te(), [te]);
        return (
          p.useSyncedValues({ activeTriggerProps: A, inactiveTriggerProps: ne, popupProps: j }),
          (0, zs.jsx)(k.Provider, {
            value: p,
            children: typeof f == `function` ? f({ payload: _ }) : f,
          })
        );
      })));
  }),
  Hs,
  Us,
  Ws,
  Gs,
  Ks,
  qs,
  Js,
  Ys,
  Xs = t(() => {
    (Co(),
      (Hs = (function (e) {
        return (
          (e.open = `data-open`),
          (e.closed = `data-closed`),
          (e[(e.startingStyle = yo.startingStyle)] = `startingStyle`),
          (e[(e.endingStyle = yo.endingStyle)] = `endingStyle`),
          (e.anchorHidden = `data-anchor-hidden`),
          (e.side = `data-side`),
          (e.align = `data-align`),
          e
        );
      })({})),
      (Us = (function (e) {
        return ((e.popupOpen = `data-popup-open`), (e.pressed = `data-pressed`), e);
      })({})),
      (Ws = { [Us.popupOpen]: `` }),
      Us.popupOpen,
      Us.pressed,
      (Gs = { [Hs.open]: `` }),
      (Ks = { [Hs.closed]: `` }),
      (qs = { [Hs.anchorHidden]: `` }),
      (Js = {
        open(e) {
          return e ? Ws : null;
        },
      }),
      (Ys = {
        open(e) {
          return e ? Gs : Ks;
        },
        anchorHidden(e) {
          return e ? qs : null;
        },
      }));
  });
function Zs(e) {
  return qn(e, `base-ui`);
}
var Qs = t(() => {
  Zn();
});
function $s() {
  return ec.useContext(tc);
}
var ec,
  tc,
  nc = t(() => {
    ((ec = e(r())), (tc = ec.createContext(void 0)));
  }),
  rc,
  ic = t(() => {
    (Xs(),
      (rc = (function (e) {
        return (
          (e[(e.popupOpen = Us.popupOpen)] = `popupOpen`),
          (e.triggerDisabled = `data-trigger-disabled`),
          e
        );
      })({})));
  }),
  ac = t(() => {}),
  oc,
  sc,
  cc = t(() => {
    (ee(),
      (oc = e(r())),
      v(),
      A(),
      Xs(),
      Nr(),
      Wo(),
      Qs(),
      nc(),
      As(),
      ic(),
      ac(),
      (sc = p(function (e, t) {
        let {
            className: n,
            render: r,
            handle: i,
            payload: a,
            disabled: o,
            delay: s,
            closeOnClick: c = !0,
            closeDelay: l,
            id: u,
            ...d
          } = e,
          f = te(!0),
          p = i?.store ?? f;
        if (!p) throw Error(D(82));
        let m = Zs(u),
          h = p.useState(`isTriggerActive`, m),
          g = p.useState(`isOpenedByTrigger`, m),
          _ = p.useState(`floatingRootContext`),
          v = oc.useRef(null),
          y = s ?? 600,
          b = l ?? 0,
          { registerTrigger: x, isMountedByThisTrigger: S } = jo(m, v, p, {
            payload: a,
            closeOnClick: c,
            closeDelay: b,
          }),
          C = $s(),
          { delayRef: w, isInstantPhase: T, hasProvider: E } = mn(_, { open: g });
        p.useSyncedValue(`isInstantPhase`, T);
        let ee = p.useState(`disabled`),
          O = o ?? ee,
          k = p.useState(`trackCursorAxis`),
          A = p.useState(`disableHoverablePopup`),
          ne = fs(_, {
            enabled: !O,
            mouseOnly: !0,
            move: !1,
            handleClose: !A && k !== `both` ? Es() : null,
            restMs() {
              let e = C?.delay,
                t = typeof w.current == `object` ? w.current.open : void 0,
                n = y;
              return (E && (n = t === 0 ? 0 : (s ?? e ?? y)), n);
            },
            delay() {
              let e = typeof w.current == `object` ? w.current.close : void 0,
                t = b;
              return (l == null && E && (t = e), { close: t });
            },
            triggerElementRef: v,
            isActiveTrigger: h,
          }),
          j = Qo(_, { enabled: !O }).reference,
          re = { open: g },
          ie = p.useState(`triggerProps`, S);
        return Er(`button`, e, {
          state: re,
          ref: [t, x, v],
          props: [
            ne,
            j,
            ie,
            {
              onPointerDown() {
                p.set(`closeOnClick`, c);
              },
              id: m,
              [rc.triggerDisabled]: O ? `` : void 0,
            },
            d,
          ],
          stateAttributesMapping: Js,
        });
      })));
  });
function lc() {
  let e = uc.useContext(dc);
  if (e === void 0) throw Error(D(70));
  return e;
}
var uc,
  dc,
  fc = t(() => {
    (ee(), (uc = e(r())), (dc = uc.createContext(void 0)));
  }),
  pc,
  mc,
  hc,
  gc,
  _c = t(() => {
    ((pc = e(r())),
      (mc = e(a())),
      As(),
      (hc = i()),
      (gc = pc.forwardRef(function (e, t) {
        let { children: n, container: r, className: i, render: a, ...o } = e,
          { portalNode: s, portalSubtree: c } = Pr({
            container: r,
            ref: t,
            componentProps: e,
            elementProps: o,
          });
        return !c && !s
          ? null
          : (0, hc.jsxs)(pc.Fragment, { children: [c, s && mc.createPortal(n, s)] });
      })));
  }),
  vc,
  yc,
  bc,
  xc = t(() => {
    ((vc = e(r())),
      A(),
      fc(),
      _c(),
      (yc = i()),
      (bc = vc.forwardRef(function (e, t) {
        let { keepMounted: n = !1, ...r } = e;
        return te().useState(`mounted`) || n
          ? (0, yc.jsx)(dc.Provider, { value: n, children: (0, yc.jsx)(gc, { ref: t, ...r }) })
          : null;
      })));
  });
function Sc() {
  let e = Cc.useContext(wc);
  if (e === void 0) throw Error(D(71));
  return e;
}
var Cc,
  wc,
  Tc = t(() => {
    (ee(), (Cc = e(r())), (wc = Cc.createContext(void 0)));
  });
function Ec() {
  return Dc.useContext(Oc)?.direction ?? `ltr`;
}
var Dc,
  Oc,
  kc = t(() => {
    ((Dc = e(r())), (Oc = Dc.createContext(void 0)));
  }),
  Ac,
  jc,
  Mc = t(() => {
    (Ft(),
      (Ac = (e) => ({
        name: `arrow`,
        options: e,
        async fn(t) {
          let {
              x: n,
              y: r,
              placement: i,
              rects: a,
              platform: o,
              elements: s,
              middlewareData: c,
            } = t,
            { element: l, padding: u = 0, offsetParent: d = `real` } = ct(e, t) || {};
          if (l == null) return {};
          let f = St(u),
            p = { x: n, y: r },
            m = mt(i),
            h = ft(m),
            g = await o.getDimensions(l),
            _ = m === `y`,
            v = _ ? `top` : `left`,
            y = _ ? `bottom` : `right`,
            b = _ ? `clientHeight` : `clientWidth`,
            x = a.reference[h] + a.reference[m] - p[m] - a.floating[h],
            S = p[m] - a.reference[m],
            C = d === `real` ? await o.getOffsetParent?.(l) : s.floating,
            w = s.floating[b] || a.floating[h];
          (!w || !(await o.isElement?.(C))) && (w = s.floating[b] || a.floating[h]);
          let T = x / 2 - S / 2,
            E = w / 2 - g[h] / 2 - 1,
            D = Math.min(f[v], E),
            ee = Math.min(f[y], E),
            te = D,
            O = w - g[h] - ee,
            k = w / 2 - g[h] / 2 + T,
            A = st(te, k, O),
            ne =
              !c.arrow &&
              ut(i) != null &&
              k !== A &&
              a.reference[h] / 2 - (k < te ? D : ee) - g[h] / 2 < 0,
            j = ne ? (k < te ? k - te : k - O) : 0;
          return {
            [m]: p[m] + j,
            data: { [m]: A, centerOffset: k - A - j, ...(ne && { alignmentOffset: j }) },
            reset: ne,
          };
        },
      })),
      (jc = (e, t) => ({ ...Ac(e), options: [e, t] })));
  }),
  Nc,
  Pc = t(() => {
    (Sa(),
      (Nc = {
        name: `hide`,
        async fn(e) {
          let { width: t, height: n, x: r, y: i } = e.rects.reference,
            a = t === 0 && n === 0 && r === 0 && i === 0;
          return { data: { referenceHidden: (await xa().fn(e)).data?.referenceHidden || a } };
        },
      }));
  }),
  Fc,
  Ic,
  Lc = t(() => {
    (Rt(),
      Ft(),
      (Fc = { sideX: `left`, sideY: `top` }),
      (Ic = {
        name: `adaptiveOrigin`,
        async fn(e) {
          let {
              x: t,
              y: n,
              rects: { floating: r },
              elements: { floating: i },
              platform: a,
              strategy: o,
              placement: s,
            } = e,
            c = N(i),
            l = c.getComputedStyle(i);
          if (!(l.transitionDuration !== `0s` && l.transitionDuration !== ``))
            return { x: t, y: n, data: Fc };
          let u = await a.getOffsetParent?.(i),
            d = { width: 0, height: 0 };
          if (o === `fixed` && c?.visualViewport)
            d = { width: c.visualViewport.width, height: c.visualViewport.height };
          else if (u === c) {
            let e = Lt(i);
            d = { width: e.documentElement.clientWidth, height: e.documentElement.clientHeight };
          } else (await a.isElement?.(u)) && (d = await a.getDimensions(u));
          let f = lt(s),
            p = t,
            m = n;
          (f === `left` && (p = d.width - (t + r.width)),
            f === `top` && (m = d.height - (n + r.height)));
          let h = f === `left` ? `right` : Fc.sideX,
            g = f === `top` ? `bottom` : Fc.sideY;
          return { x: p, y: m, data: { sideX: h, sideY: g } };
        },
      }));
  });
function Rc(e, t, n) {
  let r = e === `inline-start` || e === `inline-end`;
  return {
    top: `top`,
    right: r ? (n ? `inline-start` : `inline-end`) : `right`,
    bottom: `bottom`,
    left: r ? (n ? `inline-end` : `inline-start`) : `left`,
  }[t];
}
function zc(e, t, n) {
  let { rects: r, placement: i } = e;
  return {
    side: Rc(t, lt(i), n),
    align: ut(i) || `center`,
    anchor: { width: r.reference.width, height: r.reference.height },
    positioner: { width: r.floating.width, height: r.floating.height },
  };
}
function Bc(e) {
  let {
      anchor: t,
      positionMethod: n = `absolute`,
      side: r = `bottom`,
      sideOffset: i = 0,
      align: a = `center`,
      alignOffset: o = 0,
      collisionBoundary: s,
      collisionPadding: c = 5,
      sticky: l = !1,
      arrowPadding: u = 5,
      disableAnchorTracking: d = !1,
      keepMounted: f = !1,
      floatingRootContext: p,
      mounted: m,
      collisionAvoidance: h,
      shiftCrossAxis: g = !1,
      nodeId: _,
      adaptiveOrigin: v,
      lazyFlip: y = !1,
      externalTree: b,
    } = e,
    [x, S] = Hc.useState(null);
  !m && x !== null && S(null);
  let C = h.side || `flip`,
    T = h.align || `flip`,
    E = h.fallbackAxisSide || `end`,
    D = typeof t == `function` ? t : void 0,
    ee = F(D),
    te = D ? ee : t,
    O = En(t),
    k = Ec() === `rtl`,
    A =
      x ||
      {
        top: `top`,
        right: `right`,
        bottom: `bottom`,
        left: `left`,
        "inline-end": k ? `left` : `right`,
        "inline-start": k ? `right` : `left`,
      }[r],
    ne = a === `center` ? A : `${A}-${a}`,
    j = c,
    re = r === `bottom` ? 1 : 0,
    ie = r === `top` ? 1 : 0,
    ae = r === `right` ? 1 : 0,
    oe = r === `left` ? 1 : 0;
  typeof j == `number`
    ? (j = { top: j + re, right: j + oe, bottom: j + ie, left: j + ae })
    : (j &&= {
        top: (j.top || 0) + re,
        right: (j.right || 0) + oe,
        bottom: (j.bottom || 0) + ie,
        left: (j.left || 0) + ae,
      });
  let se = { boundary: s === `clipping-ancestors` ? `clippingAncestors` : s, padding: j },
    ce = Hc.useRef(null),
    M = En(i),
    le = En(o),
    N = [
      ga(
        (e) => {
          let t = zc(e, r, k),
            n = typeof M.current == `function` ? M.current(t) : M.current,
            i = typeof le.current == `function` ? le.current(t) : le.current;
          return { mainAxis: n, crossAxis: i, alignmentAxis: i };
        },
        [typeof i == `function` ? 0 : i, typeof o == `function` ? 0 : o, k, r],
      ),
    ],
    ue = T === `none` && C !== `shift`,
    de = !ue && (l || g || C === `shift`),
    P =
      C === `none`
        ? null
        : ya({
            ...se,
            padding: { top: j.top + 1, right: j.right + 1, bottom: j.bottom + 1, left: j.left + 1 },
            mainAxis: !g && C === `flip`,
            crossAxis: T === `flip` ? `alignment` : !1,
            fallbackAxisSideDirection: E,
          }),
    fe = ue
      ? null
      : _a(
          (e) => {
            let t = Lt(e.elements.floating).documentElement;
            return {
              ...se,
              rootBoundary: g
                ? { x: 0, y: 0, width: t.clientWidth, height: t.clientHeight }
                : void 0,
              mainAxis: T !== `none`,
              crossAxis: de,
              limiter:
                l || g
                  ? void 0
                  : va((e) => {
                      if (!ce.current) return {};
                      let { width: t, height: n } = ce.current.getBoundingClientRect(),
                        r = pt(lt(e.placement)),
                        i = r === `y` ? t : n,
                        a = r === `y` ? j.left + j.right : j.top + j.bottom;
                      return { offset: i / 2 + a / 2 };
                    }),
            };
          },
          [se, l, g, j, T],
        );
  (C === `shift` || T === `shift` || a === `center` ? N.push(fe, P) : N.push(P, fe),
    N.push(
      ba({
        ...se,
        apply({ elements: { floating: e }, availableWidth: t, availableHeight: n, rects: r }) {
          let i = e.style;
          (i.setProperty(`--available-width`, `${t}px`),
            i.setProperty(`--available-height`, `${n}px`));
          let a = window.devicePixelRatio || 1,
            { x: o, y: s, width: c, height: l } = r.reference,
            u = (Math.round((o + c) * a) - Math.round(o * a)) / a,
            d = (Math.round((s + l) * a) - Math.round(s * a)) / a;
          (i.setProperty(`--anchor-width`, `${u}px`), i.setProperty(`--anchor-height`, `${d}px`));
        },
      }),
      jc(
        () => ({
          element: ce.current || document.createElement(`div`),
          padding: u,
          offsetParent: `floating`,
        }),
        [u],
      ),
      {
        name: `transformOrigin`,
        fn(e) {
          let { elements: t, middlewareData: n, placement: a, rects: o, y: s } = e,
            c = lt(a),
            l = pt(c),
            u = ce.current,
            d = n.arrow?.x || 0,
            f = n.arrow?.y || 0,
            p = u?.clientWidth || 0,
            m = u?.clientHeight || 0,
            h = d + p / 2,
            g = f + m / 2,
            _ = Math.abs(n.shift?.y || 0),
            v = o.reference.height / 2,
            y = typeof i == `function` ? i(zc(e, r, k)) : i,
            b = _ > y,
            x = {
              top: `${h}px calc(100% + ${y}px)`,
              bottom: `${h}px ${-y}px`,
              left: `calc(100% + ${y}px) ${g}px`,
              right: `${-y}px ${g}px`,
            }[c],
            S = `${h}px ${o.reference.y + v - s}px`;
          return (
            t.floating.style.setProperty(`--transform-origin`, de && l === `y` && b ? S : x), {}
          );
        },
      },
      Nc,
      v,
    ),
    w(() => {
      !m &&
        p &&
        p.update({ referenceElement: null, floatingElement: null, domReferenceElement: null });
    }, [m, p]));
  let pe = Hc.useMemo(
      () => ({
        elementResize: !d && typeof ResizeObserver < `u`,
        layoutShift: !d && typeof IntersectionObserver < `u`,
      }),
      [d],
    ),
    {
      refs: me,
      elements: he,
      x: ge,
      y: _e,
      middlewareData: ve,
      update: ye,
      placement: be,
      context: xe,
      isPositioned: Se,
      floatingStyles: Ce,
    } = qo({
      rootContext: p,
      placement: ne,
      middleware: N,
      strategy: n,
      whileElementsMounted: f ? void 0 : (...e) => Ji(...e, pe),
      nodeId: _,
      externalTree: b,
    }),
    { sideX: we, sideY: Te } = ve.adaptiveOrigin || Fc,
    Ee = Se ? n : `fixed`,
    De = Hc.useMemo(() => {
      let e = v ? { position: Ee, [we]: ge, [Te]: _e } : { position: Ee, ...Ce };
      return (Se || (e.opacity = 0), e);
    }, [v, Ee, we, ge, Te, _e, Ce, Se]),
    Oe = Hc.useRef(null);
  (w(() => {
    if (!m) return;
    let e = O.current,
      t = typeof e == `function` ? e() : e,
      n = (Vc(t) ? t.current : t) || null;
    n !== Oe.current && (me.setPositionReference(n), (Oe.current = n));
  }, [m, me, te, O]),
    Hc.useEffect(() => {
      if (!m) return;
      let e = O.current;
      typeof e != `function` &&
        Vc(e) &&
        e.current !== Oe.current &&
        (me.setPositionReference(e.current), (Oe.current = e.current));
    }, [m, me, te, O]),
    Hc.useEffect(() => {
      if (f && m && he.domReference && he.floating) return Ji(he.domReference, he.floating, ye, pe);
    }, [f, m, he, ye, pe]));
  let ke = lt(be),
    Ae = Rc(r, ke, k),
    je = ut(be) || `center`,
    Me = !!ve.hide?.referenceHidden;
  w(() => {
    y && m && Se && S(ke);
  }, [y, m, Se, ke]);
  let Ne = Hc.useMemo(
      () => ({ position: `absolute`, top: ve.arrow?.y, left: ve.arrow?.x }),
      [ve.arrow],
    ),
    Pe = ve.arrow?.centerOffset !== 0;
  return Hc.useMemo(
    () => ({
      positionerStyles: De,
      arrowStyles: Ne,
      arrowRef: ce,
      arrowUncentered: Pe,
      side: Ae,
      align: je,
      physicalSide: ke,
      anchorHidden: Me,
      refs: me,
      context: xe,
      isPositioned: Se,
      update: ye,
    }),
    [De, Ne, ce, Pe, Ae, je, ke, Me, me, xe, Se, ye],
  );
}
function Vc(e) {
  return e != null && `current` in e;
}
var Hc,
  Uc = t(() => {
    ((Hc = e(r())), Ft(), Rt(), T(), On(), Pn(), As(), kc(), Mc(), Pc(), Lc());
  });
function Wc(e) {
  return e === `starting` ? Yt : qt;
}
var Gc = t(() => {
    $t();
  }),
  Kc,
  qc,
  Jc,
  Yc = t(() => {
    ((Kc = e(r())),
      A(),
      Tc(),
      Uc(),
      Xs(),
      fc(),
      Nr(),
      $t(),
      Lc(),
      Gc(),
      (qc = i()),
      (Jc = Kc.forwardRef(function (e, t) {
        let {
            render: n,
            className: r,
            anchor: i,
            positionMethod: a = `absolute`,
            side: o = `top`,
            align: s = `center`,
            sideOffset: c = 0,
            alignOffset: l = 0,
            collisionBoundary: u = `clipping-ancestors`,
            collisionPadding: d = 5,
            arrowPadding: f = 5,
            sticky: p = !1,
            disableAnchorTracking: m = !1,
            collisionAvoidance: h = Qt,
            ...g
          } = e,
          _ = te(),
          v = lc(),
          y = _.useState(`open`),
          b = _.useState(`mounted`),
          x = _.useState(`trackCursorAxis`),
          S = _.useState(`disableHoverablePopup`),
          C = _.useState(`floatingRootContext`),
          w = _.useState(`instantType`),
          T = _.useState(`transitionStatus`),
          E = Bc({
            anchor: i,
            positionMethod: a,
            floatingRootContext: C,
            mounted: b,
            side: o,
            sideOffset: c,
            align: s,
            alignOffset: l,
            collisionBoundary: u,
            collisionPadding: d,
            sticky: p,
            arrowPadding: f,
            disableAnchorTracking: m,
            keepMounted: v,
            collisionAvoidance: h,
            adaptiveOrigin: _.useState(`hasViewport`) ? Ic : void 0,
          }),
          D = Kc.useMemo(() => {
            let e = {};
            return (
              (!y || x === `both` || S) && (e.pointerEvents = `none`),
              { role: `presentation`, hidden: !b, style: { ...E.positionerStyles, ...e } }
            );
          }, [y, x, S, b, E.positionerStyles]),
          ee = Kc.useMemo(
            () => ({
              open: y,
              side: E.side,
              align: E.align,
              anchorHidden: E.anchorHidden,
              instant: x === `none` ? w : `tracking-cursor`,
            }),
            [y, E.side, E.align, E.anchorHidden, x, w],
          ),
          O = Kc.useMemo(
            () => ({
              ...ee,
              arrowRef: E.arrowRef,
              arrowStyles: E.arrowStyles,
              arrowUncentered: E.arrowUncentered,
            }),
            [ee, E.arrowRef, E.arrowStyles, E.arrowUncentered],
          ),
          k = Er(`div`, e, {
            state: ee,
            props: [D, Wc(T), g],
            ref: [t, _.useStateSetter(`positionerElement`)],
            stateAttributesMapping: Ys,
          });
        return (0, qc.jsx)(wc.Provider, { value: O, children: k });
      })));
  }),
  Xc,
  Zc,
  Qc,
  $c = t(() => {
    ((Xc = e(r())),
      A(),
      Tc(),
      Xs(),
      Co(),
      ko(),
      Nr(),
      Gc(),
      As(),
      (Zc = { ...Ys, ...So }),
      (Qc = Xc.forwardRef(function (e, t) {
        let { className: n, render: r, ...i } = e,
          a = te(),
          { side: o, align: s } = Sc(),
          c = a.useState(`open`),
          l = a.useState(`instantType`),
          u = a.useState(`transitionStatus`),
          d = a.useState(`popupProps`),
          f = a.useState(`floatingRootContext`);
        Do({
          open: c,
          ref: a.context.popupRef,
          onComplete() {
            c && a.context.onOpenChangeComplete?.(!0);
          },
        });
        let p = a.useState(`disabled`),
          m = a.useState(`closeDelay`);
        return (
          ls(f, { enabled: !p, closeDelay: m }),
          Er(`div`, e, {
            state: { open: c, side: o, align: s, instant: l, transitionStatus: u },
            ref: [t, a.context.popupRef, a.useStateSetter(`popupElement`)],
            props: [d, Wc(u), i],
            stateAttributesMapping: Zc,
          })
        );
      })));
  }),
  el,
  tl,
  nl,
  rl = t(() => {
    ((el = e(r())),
      As(),
      nc(),
      (tl = i()),
      (nl = function (e) {
        let { delay: t, closeDelay: n, timeout: r = 400 } = e,
          i = el.useMemo(() => ({ delay: t, closeDelay: n }), [t, n]),
          a = el.useMemo(() => ({ open: t, close: n }), [t, n]);
        return (0, tl.jsx)(tc.Provider, {
          value: i,
          children: (0, tl.jsx)(pn, { delay: a, timeoutMs: r, children: e.children }),
        });
      }));
  }),
  il = t(() => {
    (Vs(), cc(), xc(), Yc(), $c(), rl());
  }),
  al = t(() => {
    il();
  });
function ol() {
  if (wl > 1) wl--;
  else {
    var e,
      t = !1;
    for (
      (function () {
        var e = Ol;
        for (Ol = void 0; e !== void 0; ) (e.S.v === e.v && (e.S.i = e.i), (e = e.o));
      })();
      Cl !== void 0;
    ) {
      var n = Cl;
      for (Cl = void 0, Tl++; n !== void 0; ) {
        var r = n.u;
        if (((n.u = void 0), (n.f &= -3), !(8 & n.f) && dl(n)))
          try {
            n.c();
          } catch (n) {
            t ||= ((e = n), !0);
          }
        n = r;
      }
    }
    if (((Tl = 0), wl--, t)) throw e;
  }
}
function sl(e) {
  if (wl > 0) return e();
  ((Dl = ++El), wl++);
  try {
    return e();
  } finally {
    ol();
  }
}
function R(e) {
  var t = z;
  z = void 0;
  try {
    return e();
  } finally {
    z = t;
  }
}
function cl(e) {
  if (z !== void 0) {
    var t = e.n;
    if (t === void 0 || t.t !== z)
      return (
        (t = { i: 0, S: e, p: z.s, n: void 0, t: z, e: void 0, x: void 0, r: t }),
        z.s !== void 0 && (z.s.n = t),
        (z.s = t),
        (e.n = t),
        32 & z.f && e.S(t),
        t
      );
    if (t.i === -1)
      return (
        (t.i = 0),
        t.n !== void 0 &&
          ((t.n.p = t.p),
          t.p !== void 0 && (t.p.n = t.n),
          (t.p = z.s),
          (t.n = void 0),
          (z.s.n = t),
          (z.s = t)),
        t
      );
  }
}
function ll(e, t) {
  ((this.v = e),
    (this.i = 0),
    (this.n = void 0),
    (this.t = void 0),
    (this.l = 0),
    (this.W = t?.watched),
    (this.Z = t?.unwatched),
    (this.name = t?.name));
}
function ul(e, t) {
  return new ll(e, t);
}
function dl(e) {
  for (var t = e.s; t !== void 0; t = t.n)
    if (t.S.i !== t.i || !t.S.h() || t.S.i !== t.i) return !0;
  return !1;
}
function fl(e) {
  for (var t = e.s; t !== void 0; t = t.n) {
    var n = t.S.n;
    if ((n !== void 0 && (t.r = n), (t.S.n = t), (t.i = -1), t.n === void 0)) {
      e.s = t;
      break;
    }
  }
}
function pl(e) {
  for (var t = e.s, n = void 0; t !== void 0; ) {
    var r = t.p;
    (t.i === -1 ? (t.S.U(t), r !== void 0 && (r.n = t.n), t.n !== void 0 && (t.n.p = r)) : (n = t),
      (t.S.n = t.r),
      t.r !== void 0 && (t.r = void 0),
      (t = r));
  }
  e.s = n;
}
function ml(e, t) {
  (ll.call(this, void 0),
    (this.x = e),
    (this.s = void 0),
    (this.g = kl - 1),
    (this.f = 4),
    (this.W = t?.watched),
    (this.Z = t?.unwatched),
    (this.name = t?.name));
}
function hl(e, t) {
  return new ml(e, t);
}
function gl(e) {
  var t = e.m;
  if (((e.m = void 0), typeof t == `function`)) {
    wl++;
    var n = z;
    z = void 0;
    try {
      t();
    } catch (t) {
      throw ((e.f &= -2), (e.f |= 8), _l(e), t);
    } finally {
      ((z = n), ol());
    }
  }
}
function _l(e) {
  for (var t = e.s; t !== void 0; t = t.n) t.S.U(t);
  ((e.x = void 0), (e.s = void 0), gl(e));
}
function vl(e) {
  if (z !== this) throw Error(`Out-of-order effect`);
  (pl(this), (z = e), (this.f &= -2), 8 & this.f && _l(this), ol());
}
function yl(e, t) {
  ((this.x = e),
    (this.m = void 0),
    (this.s = void 0),
    (this.u = void 0),
    (this.f = 32),
    (this.name = t?.name),
    Sl && Sl.push(this));
}
function bl(e, t) {
  var n = new yl(e, t);
  try {
    n.c();
  } catch (e) {
    throw (n.d(), e);
  }
  var r = n.d.bind(n);
  return ((r[Symbol.dispose] = r), r);
}
var xl,
  z,
  Sl,
  Cl,
  wl,
  Tl,
  El,
  Dl,
  Ol,
  kl,
  Al = t(() => {
    ((xl = Symbol.for(`preact-signals`)),
      (z = void 0),
      (Cl = void 0),
      (wl = 0),
      (Tl = 0),
      (El = 0),
      (Dl = 0),
      (Ol = void 0),
      (kl = 0),
      (ll.prototype.brand = xl),
      (ll.prototype.h = function () {
        return !0;
      }),
      (ll.prototype.S = function (e) {
        var t = this,
          n = this.t;
        n !== e &&
          e.e === void 0 &&
          ((e.x = n),
          (this.t = e),
          n === void 0
            ? R(function () {
                var e;
                (e = t.W) == null || e.call(t);
              })
            : (n.e = e));
      }),
      (ll.prototype.U = function (e) {
        var t = this;
        if (this.t !== void 0) {
          var n = e.e,
            r = e.x;
          (n !== void 0 && ((n.x = r), (e.e = void 0)),
            r !== void 0 && ((r.e = n), (e.x = void 0)),
            e === this.t &&
              ((this.t = r),
              r === void 0 &&
                R(function () {
                  var e;
                  (e = t.Z) == null || e.call(t);
                })));
        }
      }),
      (ll.prototype.subscribe = function (e) {
        var t = this;
        return bl(
          function () {
            var n = t.value,
              r = z;
            z = void 0;
            try {
              e(n);
            } finally {
              z = r;
            }
          },
          { name: `sub` },
        );
      }),
      (ll.prototype.valueOf = function () {
        return this.value;
      }),
      (ll.prototype.toString = function () {
        return this.value + ``;
      }),
      (ll.prototype.toJSON = function () {
        return this.value;
      }),
      (ll.prototype.peek = function () {
        var e = z;
        z = void 0;
        try {
          return this.value;
        } finally {
          z = e;
        }
      }),
      Object.defineProperty(ll.prototype, `value`, {
        get: function () {
          var e = cl(this);
          return (e !== void 0 && (e.i = this.i), this.v);
        },
        set: function (e) {
          if (e !== this.v) {
            if (Tl > 100) throw Error(`Cycle detected`);
            ((function (e) {
              wl !== 0 &&
                Tl === 0 &&
                e.l !== Dl &&
                ((e.l = Dl), (Ol = { S: e, v: e.v, i: e.i, o: Ol }));
            })(this),
              (this.v = e),
              this.i++,
              kl++,
              wl++);
            try {
              for (var t = this.t; t !== void 0; t = t.x) t.t.N();
            } finally {
              ol();
            }
          }
        },
      }),
      (ml.prototype = new ll()),
      (ml.prototype.h = function () {
        if (((this.f &= -3), 1 & this.f)) return !1;
        if ((36 & this.f) == 32 || ((this.f &= -5), this.g === kl)) return !0;
        if (((this.g = kl), (this.f |= 1), this.i > 0 && !dl(this))) return ((this.f &= -2), !0);
        var e = z;
        try {
          (fl(this), (z = this));
          var t = this.x();
          (16 & this.f || this.v !== t || this.i === 0) &&
            ((this.v = t), (this.f &= -17), this.i++);
        } catch (e) {
          ((this.v = e), (this.f |= 16), this.i++);
        }
        return ((z = e), pl(this), (this.f &= -2), !0);
      }),
      (ml.prototype.S = function (e) {
        if (this.t === void 0) {
          this.f |= 36;
          for (var t = this.s; t !== void 0; t = t.n) t.S.S(t);
        }
        ll.prototype.S.call(this, e);
      }),
      (ml.prototype.U = function (e) {
        if (this.t !== void 0 && (ll.prototype.U.call(this, e), this.t === void 0)) {
          this.f &= -33;
          for (var t = this.s; t !== void 0; t = t.n) t.S.U(t);
        }
      }),
      (ml.prototype.N = function () {
        if (!(2 & this.f)) {
          this.f |= 6;
          for (var e = this.t; e !== void 0; e = e.x) e.t.N();
        }
      }),
      Object.defineProperty(ml.prototype, `value`, {
        get: function () {
          if (1 & this.f) throw Error(`Cycle detected`);
          var e = cl(this);
          if ((this.h(), e !== void 0 && (e.i = this.i), 16 & this.f)) throw this.v;
          return this.v;
        },
      }),
      (yl.prototype.c = function () {
        var e = this.S();
        try {
          if (8 & this.f || this.x === void 0) return;
          var t = this.x();
          typeof t == `function` && (this.m = t);
        } finally {
          e();
        }
      }),
      (yl.prototype.S = function () {
        if (1 & this.f) throw Error(`Cycle detected`);
        ((this.f |= 1), (this.f &= -9), gl(this), fl(this), wl++);
        var e = z;
        return ((z = this), vl.bind(this, e));
      }),
      (yl.prototype.N = function () {
        2 & this.f || ((this.f |= 2), (this.u = Cl), (Cl = this));
      }),
      (yl.prototype.d = function () {
        ((this.f |= 8), 1 & this.f || _l(this));
      }),
      (yl.prototype.dispose = function () {
        this.d();
      }));
  });
function jl(e, t) {
  if (t) {
    let n;
    return hl(() => {
      let r = e();
      return r && n && t(n, r) ? n : ((n = r), r);
    });
  }
  return hl(e);
}
function Ml(e, t) {
  if (Object.is(e, t)) return !0;
  if (e === null || t === null) return !1;
  if (typeof e == `function` && typeof t == `function`) return e === t;
  if (e instanceof Set && t instanceof Set) {
    if (e.size !== t.size) return !1;
    for (let n of e) if (!t.has(n)) return !1;
    return !0;
  }
  if (Array.isArray(e))
    return !Array.isArray(t) || e.length !== t.length ? !1 : !e.some((e, n) => !Ml(e, t[n]));
  if (typeof e == `object` && typeof t == `object`) {
    let n = Object.keys(e),
      r = Object.keys(t);
    return n.length === r.length ? !n.some((n) => !Ml(e[n], t[n])) : !1;
  }
  return !1;
}
function B({ get: e }, t) {
  return {
    init(e) {
      return ul(e);
    },
    get() {
      return e.call(this).value;
    },
    set(t) {
      let n = e.call(this);
      n.peek() !== t && (n.value = t);
    },
  };
}
function Nl(e, t) {
  let n = new WeakMap();
  return function () {
    let t = n.get(this);
    return (t || ((t = jl(e.bind(this))), n.set(this, t)), t.value);
  };
}
function Pl(e = !0) {
  return function (t, n) {
    n.addInitializer(function () {
      let t = n.kind === `field` || n.static ? this : Object.getPrototypeOf(this),
        r = Object.getOwnPropertyDescriptor(t, n.name);
      r && Object.defineProperty(t, n.name, Yl(Jl({}, r), { enumerable: e }));
    });
  };
}
function Fl(...e) {
  let t = e.map((e) => bl(e));
  return () => t.forEach((e) => e());
}
function Il(e) {
  return R(() => {
    let t = {};
    for (let n in e) t[n] = e[n];
    return t;
  });
}
var Ll,
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
  Mu,
  Nu = t(() => {
    (Al(),
      (Ll = Object.create),
      (Rl = Object.defineProperty),
      (zl = Object.defineProperties),
      (Bl = Object.getOwnPropertyDescriptor),
      (Vl = Object.getOwnPropertyDescriptors),
      (Hl = Object.getOwnPropertySymbols),
      (Ul = Object.prototype.hasOwnProperty),
      (Wl = Object.prototype.propertyIsEnumerable),
      (Gl = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Kl = (e) => {
        throw TypeError(e);
      }),
      (ql = (e, t, n) =>
        t in e
          ? Rl(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Jl = (e, t) => {
        for (var n in (t ||= {})) Ul.call(t, n) && ql(e, n, t[n]);
        if (Hl) for (var n of Hl(t)) Wl.call(t, n) && ql(e, n, t[n]);
        return e;
      }),
      (Yl = (e, t) => zl(e, Vl(t))),
      (Xl = (e, t) => Rl(e, `name`, { value: t, configurable: !0 })),
      (Zl = (e) => [, , , Ll(e?.[Gl(`metadata`)] ?? null)]),
      (Ql = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      ($l = (e) => (e !== void 0 && typeof e != `function` ? Kl(`Function expected`) : e)),
      (eu = (e, t, n, r, i) => ({
        kind: Ql[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Kl(`Already initialized`) : i.push($l(e || null))),
      })),
      (tu = (e, t) => ql(t, Gl(`metadata`), e[3])),
      (nu = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (ru = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Ql[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Bl(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return ou(this, a);
                      },
                      set [n](e) {
                        return cu(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Xl(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Xl(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = eu(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => au(i, e) : (e) => n in e }),
              d ^ 3 &&
                (u.get = p ? (e) => (d ^ 1 ? ou : lu)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => cu(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? $l(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? Kl(`Object expected`)
                : ($l((o = s.get)) && (v.get = o),
                  $l((o = s.set)) && (v.set = o),
                  $l((o = s.init)) && g.unshift(o)));
        return (d || tu(e, i), v && Rl(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (iu = (e, t, n) => t.has(e) || Kl(`Cannot ` + n)),
      (au = (e, t) =>
        Object(t) === t ? e.has(t) : Kl(`Cannot use the "in" operator on this value`)),
      (ou = (e, t, n) => (iu(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (su = (e, t, n) =>
        t.has(e)
          ? Kl(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (cu = (e, t, n, r) => (
        iu(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (lu = (e, t, n) => (iu(e, t, `access private method`), n)),
      (hu = [B]),
      (mu = [B]),
      (pu = [B]),
      (fu = [Pl()]),
      (du = [Pl()]),
      (uu = [Pl()]),
      (Au = class {
        constructor(e, t = Object.is) {
          ((this.defaultValue = e),
            (this.equals = t),
            nu(gu, 5, this),
            su(this, xu),
            su(this, _u, nu(gu, 8, this)),
            nu(gu, 11, this),
            su(this, Su, nu(gu, 12, this)),
            nu(gu, 15, this),
            su(this, Eu, nu(gu, 16, this)),
            nu(gu, 19, this),
            (this.reset = this.reset.bind(this)),
            this.reset());
        }
        get current() {
          return ou(this, xu, Ou);
        }
        get initial() {
          return ou(this, xu, yu);
        }
        get previous() {
          return ou(this, xu, wu);
        }
        set current(e) {
          let t = R(() => ou(this, xu, Ou));
          (e && t && this.equals(t, e)) ||
            sl(() => {
              (ou(this, xu, yu) || cu(this, xu, e, bu), cu(this, xu, t, Tu), cu(this, xu, e, ku));
            });
        }
        reset(e = this.defaultValue) {
          sl(() => {
            (cu(this, xu, void 0, Tu), cu(this, xu, e, bu), cu(this, xu, e, ku));
          });
        }
      }),
      (gu = Zl(null)),
      (_u = new WeakMap()),
      (xu = new WeakSet()),
      (Su = new WeakMap()),
      (Eu = new WeakMap()),
      (vu = ru(gu, 20, `#initial`, hu, xu, _u)),
      (yu = vu.get),
      (bu = vu.set),
      (Cu = ru(gu, 20, `#previous`, mu, xu, Su)),
      (wu = Cu.get),
      (Tu = Cu.set),
      (Du = ru(gu, 20, `#current`, pu, xu, Eu)),
      (Ou = Du.get),
      (ku = Du.set),
      ru(gu, 2, `current`, fu, Au),
      ru(gu, 2, `initial`, du, Au),
      ru(gu, 2, `previous`, uu, Au),
      tu(gu, Au),
      (Mu = class {
        constructor() {
          su(this, ju, new WeakMap());
        }
        get(e, t) {
          return e ? ou(this, ju).get(e)?.get(t) : void 0;
        }
        set(e, t, n) {
          if (e)
            return (
              ou(this, ju).has(e) || ou(this, ju).set(e, new Map()), ou(this, ju).get(e)?.set(t, n)
            );
        }
        clear(e) {
          return e ? ou(this, ju).get(e)?.clear() : void 0;
        }
      }),
      (ju = new WeakMap()));
  });
function Pu(e, t) {
  let n = Math.max(t.top, e.top),
    r = Math.max(t.left, e.left),
    i = Math.min(t.left + t.width, e.left + e.width),
    a = Math.min(t.top + t.height, e.top + e.height),
    o = i - r,
    s = a - n;
  return r < i && n < a ? o * s : 0;
}
function Fu({ x: e, y: t }, n) {
  let r = Math.abs(e),
    i = Math.abs(t);
  return typeof n == `number`
    ? Math.sqrt(Wu(r, 2) + Wu(i, 2)) > n
    : `x` in n && `y` in n
      ? r > n.x && i > n.y
      : `x` in n
        ? r > n.x
        : `y` in n
          ? i > n.y
          : !1;
}
var Iu,
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
  _d = t(() => {
    (Nu(),
      (Iu = Object.create),
      (Lu = Object.defineProperty),
      (Ru = Object.getOwnPropertyDescriptor),
      (zu = Object.getOwnPropertySymbols),
      (Bu = Object.prototype.hasOwnProperty),
      (Vu = Object.prototype.propertyIsEnumerable),
      (Hu = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Uu = (e) => {
        throw TypeError(e);
      }),
      (Wu = Math.pow),
      (Gu = (e, t, n) =>
        t in e
          ? Lu(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Ku = (e, t) => {
        for (var n in (t ||= {})) Bu.call(t, n) && Gu(e, n, t[n]);
        if (zu) for (var n of zu(t)) Vu.call(t, n) && Gu(e, n, t[n]);
        return e;
      }),
      (qu = (e, t) => Lu(e, `name`, { value: t, configurable: !0 })),
      (Ju = (e) => [, , , Iu(e?.[Hu(`metadata`)] ?? null)]),
      (Yu = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Xu = (e) => (e !== void 0 && typeof e != `function` ? Uu(`Function expected`) : e)),
      (Zu = (e, t, n, r, i) => ({
        kind: Yu[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Uu(`Already initialized`) : i.push(Xu(e || null))),
      })),
      (Qu = (e, t) => Gu(t, Hu(`metadata`), e[3])),
      ($u = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (ed = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Yu[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Ru(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return rd(this, a);
                      },
                      set [n](e) {
                        return ad(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && qu(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : qu(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Zu(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => nd(i, e) : (e) => n in e }),
              d ^ 3 &&
                (u.get = p ? (e) => (d ^ 1 ? rd : od)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => ad(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? Xu(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? Uu(`Object expected`)
                : (Xu((o = s.get)) && (v.get = o),
                  Xu((o = s.set)) && (v.set = o),
                  Xu((o = s.init)) && g.unshift(o)));
        return (d || Qu(e, i), v && Lu(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (td = (e, t, n) => t.has(e) || Uu(`Cannot ` + n)),
      (nd = (e, t) =>
        Object(t) === t ? e.has(t) : Uu(`Cannot use the "in" operator on this value`)),
      (rd = (e, t, n) => (td(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (id = (e, t, n) =>
        t.has(e)
          ? Uu(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (ad = (e, t, n, r) => (
        td(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (od = (e, t, n) => (td(e, t, `access private method`), n)),
      (sd = class e {
        constructor(e, t) {
          ((this.x = e), (this.y = t));
        }
        static delta(t, n) {
          return new e(t.x - n.x, t.y - n.y);
        }
        static distance(e, t) {
          return Math.hypot(e.x - t.x, e.y - t.y);
        }
        static equals(e, t) {
          return e.x === t.x && e.y === t.y;
        }
        static from({ x: t, y: n }) {
          return new e(t, n);
        }
      }),
      (cd = class e {
        constructor(e, t, n, r) {
          ((this.left = e),
            (this.top = t),
            (this.width = n),
            (this.height = r),
            (this.scale = { x: 1, y: 1 }));
        }
        get inverseScale() {
          return { x: 1 / this.scale.x, y: 1 / this.scale.y };
        }
        translate(t, n) {
          let { top: r, left: i, width: a, height: o, scale: s } = this,
            c = new e(i + t, r + n, a, o);
          return ((c.scale = Ku({}, s)), c);
        }
        get boundingRectangle() {
          let { width: e, height: t, left: n, top: r, right: i, bottom: a } = this;
          return { width: e, height: t, left: n, top: r, right: i, bottom: a };
        }
        get center() {
          let { left: e, top: t, right: n, bottom: r } = this;
          return new sd((e + n) / 2, (t + r) / 2);
        }
        get area() {
          let { width: e, height: t } = this;
          return e * t;
        }
        equals(t) {
          if (!(t instanceof e)) return !1;
          let { left: n, top: r, width: i, height: a } = this;
          return n === t.left && r === t.top && i === t.width && a === t.height;
        }
        containsPoint(e) {
          let { top: t, left: n, bottom: r, right: i } = this;
          return t <= e.y && e.y <= r && n <= e.x && e.x <= i;
        }
        intersectionArea(t) {
          return t instanceof e ? Pu(this, t) : 0;
        }
        intersectionRatio(e) {
          let { area: t } = this,
            n = this.intersectionArea(e);
          return n / (e.area + t - n);
        }
        get bottom() {
          let { top: e, height: t } = this;
          return e + t;
        }
        get right() {
          let { left: e, width: t } = this;
          return e + t;
        }
        get aspectRatio() {
          let { width: e, height: t } = this;
          return e / t;
        }
        get corners() {
          return [
            { x: this.left, y: this.top },
            { x: this.right, y: this.top },
            { x: this.left, y: this.bottom },
            { x: this.right, y: this.bottom },
          ];
        }
        static from({ top: t, left: n, width: r, height: i }) {
          return new e(n, t, r, i);
        }
        static delta(e, t, n = { x: `center`, y: `center` }) {
          let r = (e, t) => {
            let r = n[t],
              i = t === `x` ? e.left : e.top,
              a = t === `x` ? e.width : e.height;
            return r == `start` ? i : r == `end` ? i + a : i + a / 2;
          };
          return sd.delta({ x: r(e, `x`), y: r(e, `y`) }, { x: r(t, `x`), y: r(t, `y`) });
        }
        static intersectionRatio(t, n) {
          return e.from(t).intersectionRatio(e.from(n));
        }
      }),
      (md = class extends ((dd = Au), (ud = [Nl]), (ld = [Nl]), dd) {
        constructor(e) {
          let t = sd.from(e);
          (super(t, (e, t) => sd.equals(e, t)),
            $u(pd, 5, this),
            id(this, fd, 0),
            (this.velocity = { x: 0, y: 0 }));
        }
        get delta() {
          return sd.delta(this.current, this.initial);
        }
        get direction() {
          let { current: e, previous: t } = this;
          if (!t) return null;
          let n = { x: e.x - t.x, y: e.y - t.y };
          return !n.x && !n.y
            ? null
            : Math.abs(n.x) > Math.abs(n.y)
              ? n.x > 0
                ? `right`
                : `left`
              : n.y > 0
                ? `down`
                : `up`;
        }
        get current() {
          return super.current;
        }
        set current(e) {
          let { current: t } = this,
            n = sd.from(e),
            r = { x: n.x - t.x, y: n.y - t.y },
            i = Date.now(),
            a = i - rd(this, fd),
            o = (e) => Math.round((e / a) * 100);
          sl(() => {
            (ad(this, fd, i), (this.velocity = { x: o(r.x), y: o(r.y) }), (super.current = n));
          });
        }
        reset(e = this.defaultValue) {
          (super.reset(sd.from(e)), (this.velocity = { x: 0, y: 0 }));
        }
      }),
      (pd = Ju(dd)),
      (fd = new WeakMap()),
      ed(pd, 2, `delta`, ud, md),
      ed(pd, 2, `direction`, ld, md),
      Qu(pd, md),
      (hd = ((e) => ((e.Horizontal = `x`), (e.Vertical = `y`), e))(hd || {})),
      (gd = Object.values(hd)));
  });
function vd(e, t) {
  return { plugin: e, options: t };
}
function yd(e) {
  return (t) => vd(e, t);
}
function bd(e) {
  return typeof e == `function` ? { plugin: e, options: void 0 } : e;
}
function xd(e, t) {
  return e.priority === t.priority
    ? e.type === t.type
      ? t.value - e.value
      : t.type - e.type
    : t.priority - e.priority;
}
function Sd(e, t = !0) {
  let n = !1;
  return Id(Fd({}, e), {
    cancelable: t,
    get defaultPrevented() {
      return n;
    },
    preventDefault() {
      t && (n = !0);
    },
  });
}
function Cd(e, t) {
  return typeof e == `function` ? e(t) : (e ?? t);
}
var wd,
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
  V,
  H,
  Wd,
  Gd,
  Kd,
  U,
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
  tp,
  np,
  rp,
  ip,
  ap,
  op,
  sp,
  cp,
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
  Fp = t(() => {
    (Nu(),
      _d(),
      (wd = Object.create),
      (Td = Object.defineProperty),
      (Ed = Object.defineProperties),
      (Dd = Object.getOwnPropertyDescriptor),
      (Od = Object.getOwnPropertyDescriptors),
      (kd = Object.getOwnPropertySymbols),
      (Ad = Object.prototype.hasOwnProperty),
      (jd = Object.prototype.propertyIsEnumerable),
      (Md = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Nd = (e) => {
        throw TypeError(e);
      }),
      (Pd = (e, t, n) =>
        t in e
          ? Td(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Fd = (e, t) => {
        for (var n in (t ||= {})) Ad.call(t, n) && Pd(e, n, t[n]);
        if (kd) for (var n of kd(t)) jd.call(t, n) && Pd(e, n, t[n]);
        return e;
      }),
      (Id = (e, t) => Ed(e, Od(t))),
      (Ld = (e, t) => Td(e, `name`, { value: t, configurable: !0 })),
      (Rd = (e, t) => {
        var n = {};
        for (var r in e) Ad.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && kd)
          for (var r of kd(e)) t.indexOf(r) < 0 && jd.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (zd = (e) => [, , , wd(e?.[Md(`metadata`)] ?? null)]),
      (Bd = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Vd = (e) => (e !== void 0 && typeof e != `function` ? Nd(`Function expected`) : e)),
      (Hd = (e, t, n, r, i) => ({
        kind: Bd[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Nd(`Already initialized`) : i.push(Vd(e || null))),
      })),
      (Ud = (e, t) => Pd(t, Md(`metadata`), e[3])),
      (V = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (H = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Bd[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Dd(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return Kd(this, a);
                      },
                      set [n](e) {
                        return qd(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Ld(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Ld(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Hd(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => Gd(i, e) : (e) => n in e }),
              d ^ 3 &&
                (u.get = p ? (e) => (d ^ 1 ? Kd : Jd)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => qd(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? Vd(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? Nd(`Object expected`)
                : (Vd((o = s.get)) && (v.get = o),
                  Vd((o = s.set)) && (v.set = o),
                  Vd((o = s.init)) && g.unshift(o)));
        return (d || Ud(e, i), v && Td(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (Wd = (e, t, n) => t.has(e) || Nd(`Cannot ` + n)),
      (Gd = (e, t) =>
        Object(t) === t ? e.has(t) : Nd(`Cannot use the "in" operator on this value`)),
      (Kd = (e, t, n) => (Wd(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (U = (e, t, n) =>
        t.has(e)
          ? Nd(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (qd = (e, t, n, r) => (
        Wd(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (Jd = (e, t, n) => (Wd(e, t, `access private method`), n)),
      (Yd = [B]),
      ($d = class {
        constructor(e, t) {
          ((this.manager = e),
            (this.options = t),
            U(this, Zd, V(Xd, 8, this, !1)),
            V(Xd, 11, this),
            U(this, Qd, new Set()));
        }
        enable() {
          this.disabled = !1;
        }
        disable() {
          this.disabled = !0;
        }
        isDisabled() {
          return R(() => this.disabled);
        }
        configure(e) {
          this.options = e;
        }
        registerEffect(e) {
          let t = bl(e.bind(this));
          return (Kd(this, Qd).add(t), t);
        }
        destroy() {
          Kd(this, Qd).forEach((e) => e());
        }
        static configure(e) {
          return vd(this, e);
        }
      }),
      (Xd = zd(null)),
      (Zd = new WeakMap()),
      (Qd = new WeakMap()),
      H(Xd, 4, `disabled`, Yd, $d, Zd),
      Ud(Xd, $d),
      (ef = class extends $d {}),
      (nf = class {
        constructor(e) {
          ((this.manager = e), (this.instances = new Map()), U(this, tf, []));
        }
        get values() {
          return Array.from(this.instances.values());
        }
        set values(e) {
          let t = e
              .map(bd)
              .reduceRight(
                (e, t) => (e.some(({ plugin: e }) => e === t.plugin) ? e : [t, ...e]),
                [],
              ),
            n = t.map(({ plugin: e }) => e);
          for (let e of Kd(this, tf))
            if (!n.includes(e)) {
              if (e.prototype instanceof ef) continue;
              this.unregister(e);
            }
          for (let { plugin: e, options: n } of t) this.register(e, n);
          qd(this, tf, n);
        }
        get(e) {
          return this.instances.get(e);
        }
        register(e, t) {
          let n = this.instances.get(e);
          if (n) return (n.options !== t && (n.options = t), n);
          let r = new e(this.manager, t);
          return (this.instances.set(e, r), r);
        }
        unregister(e) {
          let t = this.instances.get(e);
          t && (t.destroy(), this.instances.delete(e));
        }
        destroy() {
          for (let e of this.instances.values()) e.destroy();
          this.instances.clear();
        }
      }),
      (tf = new WeakMap()),
      (rf = []),
      (sf = class extends $d {
        constructor(e) {
          (super(e),
            U(this, af),
            U(this, of),
            (this.computeCollisions = this.computeCollisions.bind(this)),
            qd(this, of, ul(rf)),
            (this.destroy = Fl(
              () => {
                let e = this.computeCollisions(),
                  t = R(() => this.manager.dragOperation.position.current);
                if (e !== rf) {
                  let e = Kd(this, af);
                  if ((qd(this, af, t), e && t.x == e.x && t.y == e.y)) return;
                } else qd(this, af, void 0);
                Kd(this, of).value = e;
              },
              () => {
                let { dragOperation: e } = this.manager;
                e.status.initialized && this.forceUpdate();
              },
            )));
        }
        forceUpdate(e = !0) {
          R(() => {
            e ? (Kd(this, of).value = this.computeCollisions()) : qd(this, af, void 0);
          });
        }
        computeCollisions(e, t) {
          let { registry: n, dragOperation: r } = this.manager,
            { source: i, shape: a, status: o } = r;
          if (!o.initialized || !a) return rf;
          let s = [],
            c = [];
          for (let a of e ?? n.droppables) {
            if (a.disabled || (i && !a.accepts(i))) continue;
            let e = t ?? a.collisionDetector;
            if (!e) continue;
            (c.push(a), a.shape);
            let n = R(() => e({ droppable: a, dragOperation: r }));
            n && (a.collisionPriority != null && (n.priority = a.collisionPriority), s.push(n));
          }
          return c.length === 0 ? rf : (s.sort(xd), s);
        }
        get collisions() {
          return Kd(this, of).value;
        }
      }),
      (af = new WeakMap()),
      (of = new WeakMap()),
      (cf = class {
        constructor() {
          this.registry = new Map();
        }
        addEventListener(e, t) {
          let { registry: n } = this,
            r = new Set(n.get(e));
          return (r.add(t), n.set(e, r), () => this.removeEventListener(e, t));
        }
        removeEventListener(e, t) {
          let { registry: n } = this,
            r = new Set(n.get(e));
          (r.delete(t), n.set(e, r));
        }
        dispatch(e, ...t) {
          let { registry: n } = this,
            r = n.get(e);
          if (r) for (let e of r) e(...t);
        }
      }),
      (lf = class extends cf {
        constructor(e) {
          (super(), (this.manager = e));
        }
        dispatch(e, t) {
          let n = [t, this.manager];
          super.dispatch(e, ...n);
        }
      }),
      (uf = class extends ef {
        constructor(e) {
          super(e);
          let t = (e, t) => e.map(({ id: e }) => e).join(``) === t.map(({ id: e }) => e).join(``),
            n = [];
          this.destroy = Fl(
            () => {
              let { dragOperation: t, collisionObserver: r } = e;
              t.status.initializing && ((n = []), r.enable());
            },
            () => {
              let { collisionObserver: r, monitor: i } = e,
                { collisions: a } = r;
              if (r.isDisabled()) return;
              let o = Sd({ collisions: a });
              if ((i.dispatch(`collision`, o), o.defaultPrevented || t(a, n))) return;
              n = a;
              let [s] = a;
              R(() => {
                s?.id !== e.dragOperation.target?.id &&
                  (r.disable(),
                  e.actions.setDropTarget(s?.id).then(() => {
                    r.enable();
                  }));
              });
            },
          );
        }
      }),
      (df = ((e) => (
        (e[(e.Lowest = 0)] = `Lowest`),
        (e[(e.Low = 1)] = `Low`),
        (e[(e.Normal = 2)] = `Normal`),
        (e[(e.High = 3)] = `High`),
        (e[(e.Highest = 4)] = `Highest`),
        e
      ))(df || {})),
      (ff = ((e) => (
        (e[(e.Collision = 0)] = `Collision`),
        (e[(e.ShapeIntersection = 1)] = `ShapeIntersection`),
        (e[(e.PointerIntersection = 2)] = `PointerIntersection`),
        e
      ))(ff || {})),
      (yf = [B]),
      (vf = [Nl]),
      (_f = [Nl]),
      (gf = [Nl]),
      (hf = [Nl]),
      (mf = [Nl]),
      (pf = [Nl]),
      (Sf = class {
        constructor() {
          (V(bf, 5, this), U(this, xf, V(bf, 8, this, `idle`)), V(bf, 11, this));
        }
        get current() {
          return this.value;
        }
        get idle() {
          return this.value === `idle`;
        }
        get initializing() {
          return this.value === `initializing`;
        }
        get initialized() {
          let { value: e } = this;
          return e !== `idle` && e !== `initialization-pending`;
        }
        get dragging() {
          return this.value === `dragging`;
        }
        get dropped() {
          return this.value === `dropped`;
        }
        set(e) {
          this.value = e;
        }
      }),
      (bf = zd(null)),
      (xf = new WeakMap()),
      H(bf, 4, `value`, yf, Sf, xf),
      H(bf, 2, `current`, vf, Sf),
      H(bf, 2, `idle`, _f, Sf),
      H(bf, 2, `initializing`, gf, Sf),
      H(bf, 2, `initialized`, hf, Sf),
      H(bf, 2, `dragging`, mf, Sf),
      H(bf, 2, `dropped`, pf, Sf),
      Ud(bf, Sf),
      (Cf = class {
        constructor(e) {
          this.manager = e;
        }
        setDragSource(e) {
          let { dragOperation: t } = this.manager;
          t.sourceIdentifier = typeof e == `string` || typeof e == `number` ? e : e.id;
        }
        setDropTarget(e) {
          return R(() => {
            let { dragOperation: t } = this.manager,
              n = e ?? null;
            if (t.targetIdentifier === n) return Promise.resolve(!1);
            t.targetIdentifier = n;
            let r = Sd({ operation: t.snapshot() });
            return (
              t.status.dragging && this.manager.monitor.dispatch(`dragover`, r),
              this.manager.renderer.rendering.then(() => r.defaultPrevented)
            );
          });
        }
        start(e) {
          return R(() => {
            let { dragOperation: t } = this.manager;
            if ((e.source != null && this.setDragSource(e.source), !t.source))
              throw Error(`Cannot start a drag operation without a drag source`);
            if (!t.status.idle)
              throw Error(`Cannot start a drag operation while another is active`);
            let n = new AbortController(),
              { event: r, coordinates: i } = e;
            sl(() => {
              (t.status.set(`initialization-pending`),
                (t.shape = null),
                (t.canceled = !1),
                (t.activatorEvent = r ?? null),
                t.position.reset(i));
            });
            let a = Sd({ operation: t.snapshot() });
            return (
              this.manager.monitor.dispatch(`beforedragstart`, a),
              a.defaultPrevented
                ? (t.reset(), n.abort(), n)
                : (t.status.set(`initializing`),
                  (t.controller = n),
                  this.manager.renderer.rendering.then(() => {
                    if (n.signal.aborted) return;
                    let { status: e } = t;
                    e.current === `initializing` &&
                      (t.status.set(`dragging`),
                      this.manager.monitor.dispatch(`dragstart`, {
                        nativeEvent: r,
                        operation: t.snapshot(),
                        cancelable: !1,
                      }));
                  }),
                  n)
            );
          });
        }
        move(e) {
          return R(() => {
            let { dragOperation: t } = this.manager,
              { status: n, controller: r } = t;
            if (!n.dragging || !r || r.signal.aborted) return;
            let i = Sd(
              { nativeEvent: e.event, operation: t.snapshot(), by: e.by, to: e.to },
              e.cancelable ?? !0,
            );
            ((e.propagate ?? !0) && this.manager.monitor.dispatch(`dragmove`, i),
              queueMicrotask(() => {
                if (i.defaultPrevented) return;
                let n = e.to ?? {
                  x: t.position.current.x + (e.by?.x ?? 0),
                  y: t.position.current.y + (e.by?.y ?? 0),
                };
                t.position.current = n;
              }));
          });
        }
        stop(e = {}) {
          return R(() => {
            let { dragOperation: t } = this.manager,
              { controller: n } = t;
            if (!n || n.signal.aborted) return;
            let r,
              i = () => {
                let e = { resume: () => {}, abort: () => {} };
                return (
                  (r = new Promise((t, n) => {
                    ((e.resume = t), (e.abort = n));
                  })),
                  e
                );
              };
            n.abort();
            let a = () => {
              this.manager.renderer.rendering.then(() => {
                t.status.set(`dropped`);
                let e = R(() => t.source?.status === `dropping`),
                  r = () => {
                    (t.controller === n && (t.controller = void 0), t.reset());
                  };
                if (e) {
                  let { source: e } = t,
                    n = bl(() => {
                      e?.status === `idle` && (n(), r());
                    });
                } else this.manager.renderer.rendering.then(r);
              });
            };
            ((t.canceled = e.canceled ?? !1),
              this.manager.monitor.dispatch(`dragend`, {
                nativeEvent: e.event,
                operation: t.snapshot(),
                canceled: e.canceled ?? !1,
                suspend: i,
              }),
              r ? r.then(a).catch(() => t.reset()) : a());
          });
        }
      }),
      (Df = [B]),
      (Ef = [B]),
      (Tf = [B]),
      (wf = [B]),
      (Nf = class {
        constructor(e, t) {
          (U(this, kf, V(Of, 8, this)),
            V(Of, 11, this),
            U(this, Af, V(Of, 12, this)),
            V(Of, 15, this),
            U(this, jf, V(Of, 16, this)),
            V(Of, 19, this),
            U(this, Mf, V(Of, 20, this)),
            V(Of, 23, this));
          let { effects: n, id: r, data: i = {}, disabled: a = !1, register: o = !0 } = e,
            s = r;
          ((this.manager = t),
            (this.id = r),
            (this.data = i),
            (this.disabled = a),
            (this.effects = () => [
              () => {
                let { id: e, manager: t } = this;
                if (e !== s)
                  return (t?.registry.register(this), () => t?.registry.unregister(this));
              },
              ...(n?.() ?? []),
            ]),
            (this.register = this.register.bind(this)),
            (this.unregister = this.unregister.bind(this)),
            (this.destroy = this.destroy.bind(this)),
            t && o && queueMicrotask(this.register));
        }
        register() {
          return this.manager?.registry.register(this);
        }
        unregister() {
          var e;
          (e = this.manager) == null || e.registry.unregister(this);
        }
        destroy() {
          var e;
          (e = this.manager) == null || e.registry.unregister(this);
        }
      }),
      (Of = zd(null)),
      (kf = new WeakMap()),
      (Af = new WeakMap()),
      (jf = new WeakMap()),
      (Mf = new WeakMap()),
      H(Of, 4, `manager`, Df, Nf, kf),
      H(Of, 4, `id`, Ef, Nf, Af),
      H(Of, 4, `data`, Tf, Nf, jf),
      H(Of, 4, `disabled`, wf, Nf, Mf),
      Ud(Of, Nf),
      (Pf = class {
        constructor() {
          ((this.map = ul(new Map())),
            (this.cleanupFunctions = new WeakMap()),
            (this.register = (e, t) => {
              let n = this.map.peek(),
                r = n.get(e),
                i = () => this.unregister(e, t);
              if (r === t) return i;
              r && (this.cleanupFunctions.get(r)?.(), this.cleanupFunctions.delete(r));
              let a = new Map(n);
              (a.set(e, t), (this.map.value = a));
              let o = Fl(...t.effects());
              return (this.cleanupFunctions.set(t, o), i);
            }),
            (this.unregister = (e, t) => {
              let n = this.map.peek();
              if (n.get(e) !== t) return;
              (this.cleanupFunctions.get(t)?.(), this.cleanupFunctions.delete(t));
              let r = new Map(n);
              (r.delete(e), (this.map.value = r));
            }));
        }
        [Symbol.iterator]() {
          return this.map.peek().values();
        }
        get value() {
          return this.map.value.values();
        }
        has(e) {
          return this.map.value.has(e);
        }
        get(e) {
          return this.map.value.get(e);
        }
        destroy() {
          for (let e of this) (this.cleanupFunctions.get(e)?.(), e.destroy());
          this.map.value = new Map();
        }
      }),
      (Kf = class extends (
        ((Vf = Nf), (Bf = [B]), (zf = [B]), (Rf = [B]), (Lf = [Nl]), (If = [Nl]), (Ff = [Nl]), Vf)
      ) {
        constructor(e, t) {
          var n = e,
            { modifiers: r, type: i, sensors: a } = n,
            o = Rd(n, [`modifiers`, `type`, `sensors`]);
          (super(o, t),
            V(Hf, 5, this),
            U(this, Uf, V(Hf, 8, this)),
            V(Hf, 11, this),
            U(this, Wf, V(Hf, 12, this)),
            V(Hf, 15, this),
            U(this, Gf, V(Hf, 16, this, this.isDragSource ? `dragging` : `idle`)),
            V(Hf, 19, this),
            (this.type = i),
            (this.sensors = a),
            (this.modifiers = r),
            (this.alignment = o.alignment));
        }
        get isDropping() {
          return this.status === `dropping` && this.isDragSource;
        }
        get isDragging() {
          return this.status === `dragging` && this.isDragSource;
        }
        get isDragSource() {
          return this.manager?.dragOperation.source?.id === this.id;
        }
      }),
      (Hf = zd(Vf)),
      (Uf = new WeakMap()),
      (Wf = new WeakMap()),
      (Gf = new WeakMap()),
      H(Hf, 4, `type`, Bf, Kf, Uf),
      H(Hf, 4, `modifiers`, zf, Kf, Wf),
      H(Hf, 4, `status`, Rf, Kf, Gf),
      H(Hf, 2, `isDropping`, Lf, Kf),
      H(Hf, 2, `isDragging`, If, Kf),
      H(Hf, 2, `isDragSource`, Ff, Kf),
      Ud(Hf, Kf),
      (op = class extends (
        (($f = Nf), (Qf = [B]), (Zf = [B]), (Xf = [B]), (Yf = [B]), (Jf = [B]), (qf = [Nl]), $f)
      ) {
        constructor(e, t) {
          var n = e,
            { accept: r, collisionDetector: i, collisionPriority: a, type: o } = n,
            s = Rd(n, [`accept`, `collisionDetector`, `collisionPriority`, `type`]);
          (super(s, t),
            V(ep, 5, this),
            U(this, tp, V(ep, 8, this)),
            V(ep, 11, this),
            U(this, np, V(ep, 12, this)),
            V(ep, 15, this),
            U(this, rp, V(ep, 16, this)),
            V(ep, 19, this),
            U(this, ip, V(ep, 20, this)),
            V(ep, 23, this),
            U(this, ap, V(ep, 24, this)),
            V(ep, 27, this),
            (this.accept = r),
            (this.collisionDetector = i),
            (this.collisionPriority = a),
            (this.type = o));
        }
        accepts(e) {
          let { accept: t } = this;
          return t
            ? typeof t == `function`
              ? t(e)
              : e.type
                ? Array.isArray(t)
                  ? t.includes(e.type)
                  : e.type === t
                : !1
            : !0;
        }
        get isDropTarget() {
          return this.manager?.dragOperation.target?.id === this.id;
        }
      }),
      (ep = zd($f)),
      (tp = new WeakMap()),
      (np = new WeakMap()),
      (rp = new WeakMap()),
      (ip = new WeakMap()),
      (ap = new WeakMap()),
      H(ep, 4, `accept`, Qf, op, tp),
      H(ep, 4, `type`, Zf, op, np),
      H(ep, 4, `collisionDetector`, Xf, op, rp),
      H(ep, 4, `collisionPriority`, Yf, op, ip),
      H(ep, 4, `shape`, Jf, op, ap),
      H(ep, 2, `isDropTarget`, qf, op),
      Ud(ep, op),
      (sp = class extends $d {
        constructor(e, t) {
          (super(e, t), (this.manager = e), (this.options = t));
        }
      }),
      (cp = class extends AbortController {
        constructor(e, t) {
          (super(), (this.constraints = e), (this.onActivate = t), (this.activated = !1));
          for (let t of e ?? []) t.controller = this;
        }
        onEvent(e) {
          if (!this.activated)
            if (this.constraints?.length) for (let t of this.constraints) t.onEvent(e);
            else this.activate(e);
        }
        activate(e) {
          this.activated || ((this.activated = !0), this.onActivate(e));
        }
        abort(e) {
          ((this.activated = !1), super.abort(e));
        }
      }),
      (up = class {
        constructor(e) {
          ((this.options = e), U(this, lp));
        }
        set controller(e) {
          (qd(this, lp, e), e.signal.addEventListener(`abort`, () => this.abort()));
        }
        activate(e) {
          var t;
          (t = Kd(this, lp)) == null || t.activate(e);
        }
      }),
      (lp = new WeakMap()),
      (dp = class extends $d {
        constructor(e, t) {
          (super(e, t), (this.manager = e), (this.options = t));
        }
        apply(e) {
          return e.transform;
        }
      }),
      (fp = class {
        constructor(e) {
          ((this.draggables = new Pf()),
            (this.droppables = new Pf()),
            (this.plugins = new nf(e)),
            (this.sensors = new nf(e)),
            (this.modifiers = new nf(e)));
        }
        register(e, t) {
          if (e instanceof Kf) return this.draggables.register(e.id, e);
          if (e instanceof op) return this.droppables.register(e.id, e);
          if (e.prototype instanceof dp) return this.modifiers.register(e, t);
          if (e.prototype instanceof sp) return this.sensors.register(e, t);
          if (e.prototype instanceof $d) return this.plugins.register(e, t);
          throw Error(`Invalid instance type`);
        }
        unregister(e) {
          if (e instanceof Nf)
            return e instanceof Kf
              ? this.draggables.unregister(e.id, e)
              : e instanceof op
                ? this.droppables.unregister(e.id, e)
                : () => {};
          if (e.prototype instanceof dp) return this.modifiers.unregister(e);
          if (e.prototype instanceof sp) return this.sensors.unregister(e);
          if (e.prototype instanceof $d) return this.plugins.unregister(e);
          throw Error(`Invalid instance type`);
        }
        destroy() {
          (this.draggables.destroy(),
            this.droppables.destroy(),
            this.plugins.destroy(),
            this.sensors.destroy(),
            this.modifiers.destroy());
        }
      }),
      (xp = [Nl]),
      (bp = [B]),
      (yp = [B]),
      (vp = [B]),
      (_p = [B]),
      (gp = [B]),
      (hp = [Nl]),
      (mp = [Nl]),
      (pp = [Nl]),
      (Mp = class {
        constructor(e) {
          (V(Tp, 5, this),
            U(this, Sp),
            U(this, Cp),
            U(this, wp, new Au(void 0, (e, t) => (e && t ? e.equals(t) : e === t))),
            (this.status = new Sf()),
            U(this, Ep, V(Tp, 8, this, !1)),
            V(Tp, 11, this),
            U(this, Dp, V(Tp, 12, this, null)),
            V(Tp, 15, this),
            U(this, Op, V(Tp, 16, this, null)),
            V(Tp, 19, this),
            U(this, kp, V(Tp, 20, this, null)),
            V(Tp, 23, this),
            U(this, Ap, V(Tp, 24, this, [])),
            V(Tp, 27, this),
            (this.position = new md({ x: 0, y: 0 })),
            U(this, jp, { x: 0, y: 0 }),
            qd(this, Sp, e));
        }
        get shape() {
          let { current: e, initial: t, previous: n } = Kd(this, wp);
          return !e || !t ? null : { current: e, initial: t, previous: n };
        }
        set shape(e) {
          e ? (Kd(this, wp).current = e) : Kd(this, wp).reset();
        }
        get source() {
          let e = this.sourceIdentifier;
          if (e == null) return null;
          let t = Kd(this, Sp).registry.draggables.get(e);
          return (t && qd(this, Cp, t), t ?? Kd(this, Cp) ?? null);
        }
        get target() {
          let e = this.targetIdentifier;
          return e == null ? null : (Kd(this, Sp).registry.droppables.get(e) ?? null);
        }
        get transform() {
          let { x: e, y: t } = this.position.delta,
            n = { x: e, y: t };
          for (let e of this.modifiers) n = e.apply(Id(Fd({}, this.snapshot()), { transform: n }));
          return (qd(this, jp, n), n);
        }
        snapshot() {
          return R(() => ({
            source: this.source,
            target: this.target,
            activatorEvent: this.activatorEvent,
            transform: Kd(this, jp),
            shape: this.shape ? Il(this.shape) : null,
            position: Il(this.position),
            status: Il(this.status),
            canceled: this.canceled,
          }));
        }
        reset() {
          sl(() => {
            (this.status.set(`idle`),
              (this.sourceIdentifier = null),
              (this.targetIdentifier = null),
              Kd(this, wp).reset(),
              this.position.reset({ x: 0, y: 0 }),
              qd(this, jp, { x: 0, y: 0 }),
              (this.modifiers = []));
          });
        }
      }),
      (Tp = zd(null)),
      (Sp = new WeakMap()),
      (Cp = new WeakMap()),
      (wp = new WeakMap()),
      (Ep = new WeakMap()),
      (Dp = new WeakMap()),
      (Op = new WeakMap()),
      (kp = new WeakMap()),
      (Ap = new WeakMap()),
      (jp = new WeakMap()),
      H(Tp, 2, `shape`, xp, Mp),
      H(Tp, 4, `canceled`, bp, Mp, Ep),
      H(Tp, 4, `activatorEvent`, yp, Mp, Dp),
      H(Tp, 4, `sourceIdentifier`, vp, Mp, Op),
      H(Tp, 4, `targetIdentifier`, _p, Mp, kp),
      H(Tp, 4, `modifiers`, gp, Mp, Ap),
      H(Tp, 2, `source`, hp, Mp),
      H(Tp, 2, `target`, mp, Mp),
      H(Tp, 2, `transform`, pp, Mp),
      Ud(Tp, Mp),
      (Np = {
        get rendering() {
          return Promise.resolve();
        },
      }),
      (Pp = class {
        constructor(e) {
          this.destroy = () => {
            (this.dragOperation.status.idle || this.actions.stop({ canceled: !0 }),
              this.dragOperation.modifiers.forEach((e) => e.destroy()),
              this.registry.destroy(),
              this.collisionObserver.destroy());
          };
          let t = e ?? {},
            n = Cd(t.plugins, []),
            r = Cd(t.sensors, []),
            i = Cd(t.modifiers, []),
            a = t.renderer ?? Np,
            o = new lf(this);
          ((this.registry = new fp(this)),
            (this.monitor = o),
            (this.renderer = a),
            (this.actions = new Cf(this)),
            (this.dragOperation = new Mp(this)),
            (this.collisionObserver = new sf(this)),
            (this.plugins = [uf, ...n]),
            (this.modifiers = i),
            (this.sensors = r));
          let { destroy: s } = this,
            c = Fl(() => {
              let e = R(() => this.dragOperation.modifiers),
                t = this.modifiers;
              for (let n of e) t.includes(n) || n.destroy();
              this.dragOperation.modifiers =
                this.dragOperation.source?.modifiers?.map((e) => {
                  let { plugin: t, options: n } = bd(e);
                  return new t(this, n);
                }) ?? t;
            });
          this.destroy = () => {
            (c(), s());
          };
        }
        get plugins() {
          return this.registry.plugins.values;
        }
        set plugins(e) {
          this.registry.plugins.values = e;
        }
        get modifiers() {
          return this.registry.modifiers.values;
        }
        set modifiers(e) {
          this.registry.modifiers.values = e;
        }
        get sensors() {
          return this.registry.sensors.values;
        }
        set sensors(e) {
          this.registry.sensors.values = e;
        }
      }));
  });
function Ip(e) {
  return e
    ? e instanceof KeyframeEffect
      ? !0
      : `getKeyframes` in e && typeof e.getKeyframes == `function`
    : !1;
}
function Lp(e, t) {
  let n = e.getAnimations();
  if (n.length > 0)
    for (let e of n) {
      if (e.playState !== `running`) continue;
      let { effect: n } = e,
        r = (Ip(n) ? n.getKeyframes() : []).filter(t);
      if (r.length > 0) return [r[r.length - 1], e];
    }
  return null;
}
function Rp(e) {
  let { width: t, height: n, top: r, left: i, bottom: a, right: o } = e.getBoundingClientRect();
  return { width: t, height: n, top: r, left: i, bottom: a, right: o };
}
function zp(e) {
  let t = Object.prototype.toString.call(e);
  return t === `[object Window]` || t === `[object global]`;
}
function Bp(e) {
  return `nodeType` in e;
}
function Vp(e) {
  return e
    ? zp(e)
      ? e
      : Bp(e)
        ? `defaultView` in e
          ? (e.defaultView ?? window)
          : (e.ownerDocument?.defaultView ?? window)
        : window
    : window;
}
function Hp(e) {
  let { Document: t } = Vp(e);
  return e instanceof t || (`nodeType` in e && e.nodeType === Node.DOCUMENT_NODE);
}
function Up(e) {
  return !e || zp(e)
    ? !1
    : e instanceof Vp(e).HTMLElement ||
        (`namespaceURI` in e &&
          typeof e.namespaceURI == `string` &&
          e.namespaceURI.endsWith(`html`));
}
function Wp(e) {
  return (
    e instanceof Vp(e).SVGElement ||
    (`namespaceURI` in e && typeof e.namespaceURI == `string` && e.namespaceURI.endsWith(`svg`))
  );
}
function Gp(e) {
  return e
    ? zp(e)
      ? e.document
      : Bp(e)
        ? Hp(e)
          ? e
          : Up(e) || Wp(e)
            ? e.ownerDocument
            : document
        : document
    : document;
}
function Kp(e) {
  let { documentElement: t } = Gp(e),
    n = Vp(e).visualViewport,
    r = n?.width ?? t.clientWidth,
    i = n?.height ?? t.clientHeight,
    a = n?.offsetTop ?? 0,
    o = n?.offsetLeft ?? 0;
  return { top: a, left: o, right: o + r, bottom: a + i, width: r, height: i };
}
function qp(e, t) {
  if (Jp(e) && e.open === !1) return !1;
  let { overflow: n, overflowX: r, overflowY: i } = getComputedStyle(e);
  return n === `visible` && r === `visible` && i === `visible`;
}
function Jp(e) {
  return e.tagName === `DETAILS`;
}
function Yp(e, t = e.getBoundingClientRect(), n = 0) {
  let r = t,
    { ownerDocument: i } = e,
    a = i.defaultView ?? window,
    o = e.parentElement;
  for (; o && o !== i.documentElement; ) {
    if (!qp(o)) {
      let e = o.getBoundingClientRect(),
        t = n * (e.bottom - e.top),
        i = n * (e.right - e.left),
        a = n * (e.bottom - e.top),
        s = n * (e.right - e.left);
      ((r = {
        top: Math.max(r.top, e.top - t),
        right: Math.min(r.right, e.right + i),
        bottom: Math.min(r.bottom, e.bottom + a),
        left: Math.max(r.left, e.left - s),
        width: 0,
        height: 0,
      }),
        (r.width = r.right - r.left),
        (r.height = r.bottom - r.top));
    }
    o = o.parentElement;
  }
  let s = a.visualViewport,
    c = s?.offsetTop ?? 0,
    l = s?.offsetLeft ?? 0,
    u = s?.width ?? a.innerWidth,
    d = s?.height ?? a.innerHeight,
    f = n * d,
    p = n * u;
  return (
    (r = {
      top: Math.max(r.top, c - f),
      right: Math.min(r.right, l + u + p),
      bottom: Math.min(r.bottom, c + d + f),
      left: Math.max(r.left, l - p),
      width: 0,
      height: 0,
    }),
    (r.width = r.right - r.left),
    (r.height = r.bottom - r.top),
    r.width < 0 && (r.width = 0),
    r.height < 0 && (r.height = 0),
    r
  );
}
function Xp(e) {
  return { x: e.clientX, y: e.clientY };
}
function Zp(e = document, t = new Set()) {
  if (t.has(e)) return [];
  t.add(e);
  let n = [e];
  for (let r of Array.from(e.querySelectorAll(`iframe, frame`)))
    try {
      let e = r.contentDocument;
      e && !t.has(e) && n.push(...Zp(e, t));
    } catch {}
  try {
    let r = e.defaultView;
    if (r && r !== window.top) {
      let i = r.parent;
      i && i.document && i.document !== e && n.push(...Zp(i.document, t));
    }
  } catch {}
  return n;
}
function Qp() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function $p() {
  let e = Qp() ? window.visualViewport : null;
  return { x: e?.offsetLeft ?? 0, y: e?.offsetTop ?? 0 };
}
function em(e) {
  return !e || !Bp(e) ? !1 : e instanceof Vp(e).ShadowRoot;
}
function tm(e) {
  if (e && Bp(e)) {
    let t = e.getRootNode();
    if (em(t) || t instanceof Document) return t;
  }
  return Gp(e);
}
function nm(e) {
  return e.matchMedia(`(prefers-reduced-motion: reduce)`).matches;
}
function rm(e) {
  let t = `input, textarea, select, canvas, [contenteditable]`,
    n = e.cloneNode(!0),
    r = Array.from(e.querySelectorAll(t));
  return (
    Array.from(n.querySelectorAll(t)).forEach((e, t) => {
      let n = r[t];
      (im(e) &&
        im(n) &&
        (e.type !== `file` && (e.value = n.value),
        e.type === `radio` && e.name && (e.name = `Cloned__${e.name}`)),
        am(e) && am(n) && n.width > 0 && n.height > 0 && e.getContext(`2d`)?.drawImage(n, 0, 0));
    }),
    n
  );
}
function im(e) {
  return `value` in e;
}
function am(e) {
  return e.tagName === `CANVAS`;
}
function om(e, { x: t, y: n }) {
  let r = e.elementFromPoint(t, n);
  if (sm(r)) {
    let { contentDocument: e } = r;
    if (e) {
      let { left: i, top: a } = r.getBoundingClientRect();
      return om(e, { x: t - i, y: n - a });
    }
  }
  return r;
}
function sm(e) {
  return e?.tagName === `IFRAME`;
}
function cm(e) {
  return !!e.closest(`
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      button:not([disabled]),
      a[href],
      [contenteditable]:not([contenteditable="false"])
    `);
}
function lm(e) {
  let t = e?.ownerDocument.defaultView;
  if (t && t.self !== t.parent) return t.frameElement;
}
function um(e) {
  let t = new Set(),
    n = lm(e);
  for (; n; ) (t.add(n), (n = lm(n)));
  return t;
}
function dm(e, t) {
  let n = setTimeout(e, t);
  return () => clearTimeout(n);
}
function fm(e, t) {
  let n = () => performance.now(),
    r,
    i;
  return function (...a) {
    let o = this;
    i
      ? (r?.(),
        (r = dm(
          () => {
            (e.apply(o, a), (i = n()));
          },
          t - (n() - i),
        )))
      : (e.apply(o, a), (i = n()));
  };
}
function pm(e, t) {
  return e === t
    ? !0
    : !e || !t
      ? !1
      : e.top == t.top && e.left == t.left && e.right == t.right && e.bottom == t.bottom;
}
function mm(e, t = e.getBoundingClientRect()) {
  let { width: n, height: r } = Yp(e, t);
  return n > 0 && r > 0;
}
function hm(e, t) {
  let n = Ch.get(e);
  return (
    (n ||= {
      disconnect: new Sh(
        e,
        (t) => {
          let n = Ch.get(e);
          n && n.callbacks.forEach((e) => e(t));
        },
        { skipInitial: !0 },
      ).disconnect,
      callbacks: new Set(),
    }),
    n.callbacks.add(t),
    Ch.set(e, n),
    () => {
      (n.callbacks.delete(t), n.callbacks.size === 0 && (Ch.delete(e), n.disconnect()));
    }
  );
}
function gm(e, t) {
  let n = new Set();
  for (let r of e) {
    let e = hm(r, t);
    n.add(e);
  }
  return () => n.forEach((e) => e());
}
function _m(e, t) {
  let n = e.ownerDocument;
  if (!wh.has(n)) {
    let e = new AbortController(),
      t = new Set();
    (document.addEventListener(`scroll`, (e) => t.forEach((t) => t(e)), {
      capture: !0,
      passive: !0,
      signal: e.signal,
    }),
      wh.set(n, { disconnect: () => e.abort(), listeners: t }));
  }
  let { listeners: r, disconnect: i } = wh.get(n) ?? {};
  return !r || !i
    ? () => {}
    : (r.add(t),
      () => {
        (r.delete(t), r.size === 0 && (i(), wh.delete(n)));
      });
}
function vm(e) {
  return (
    `showPopover` in e &&
    `hidePopover` in e &&
    typeof e.showPopover == `function` &&
    typeof e.hidePopover == `function`
  );
}
function ym(e) {
  try {
    vm(e) &&
      e.isConnected &&
      e.hasAttribute(`popover`) &&
      !e.matches(`:popover-open`) &&
      e.showPopover();
  } catch {}
}
function bm(e) {
  return !rh || !e ? !1 : e === Gp(e).scrollingElement;
}
function xm(e) {
  let t = Vp(e),
    n = bm(e) ? Kp(e) : Rp(e),
    r = t.visualViewport,
    i = bm(e)
      ? { height: r?.height ?? t.innerHeight, width: r?.width ?? t.innerWidth }
      : { height: e.clientHeight, width: e.clientWidth },
    a = {
      current: { x: e.scrollLeft, y: e.scrollTop },
      max: { x: e.scrollWidth - i.width, y: e.scrollHeight - i.height },
    };
  return {
    rect: n,
    position: a,
    isTop: a.current.y <= 0,
    isLeft: a.current.x <= 0,
    isBottom: a.current.y >= a.max.y,
    isRight: a.current.x >= a.max.x,
  };
}
function Sm(e, t) {
  let { isTop: n, isBottom: r, isLeft: i, isRight: a, position: o } = xm(e),
    { x: s, y: c } = t ?? { x: 0, y: 0 },
    l = !n && o.current.y + c > 0,
    u = !r && o.current.y + c < o.max.y,
    d = !i && o.current.x + s > 0,
    f = !a && o.current.x + s < o.max.x;
  return { top: l, bottom: u, left: d, right: f, x: d || f, y: l || u };
}
function Cm(e, t = !1) {
  if (!t) return wm(e);
  let n = Nh.get(e);
  return n || ((n = wm(e)), Nh.set(e, n), Mh.schedule(Ph), n);
}
function wm(e) {
  return Vp(e).getComputedStyle(e);
}
function Tm(e, t = Cm(e, !0)) {
  return t.position === `fixed` || t.position === `sticky`;
}
function Em(e, t = Cm(e, !0)) {
  let n = /(auto|scroll|overlay)/;
  return [`overflow`, `overflowX`, `overflowY`].some((e) => {
    let r = t[e];
    return typeof r == `string` ? n.test(r) : !1;
  });
}
function Dm(e, t = Fh) {
  let { limit: n, excludeElement: r, escapeShadowDOM: i } = t,
    a = new Set();
  function o(t) {
    if ((n != null && a.size >= n) || !t) return a;
    if (Hp(t) && t.scrollingElement != null && !a.has(t.scrollingElement))
      return (a.add(t.scrollingElement), a);
    if (i && em(t)) return o(t.host);
    if (!Up(t)) return Wp(t) ? o(t.parentElement) : a;
    if (a.has(t)) return a;
    let s = Cm(t, !0);
    if (((r && t === e) || (Em(t, s) && a.add(t)), Tm(t, s))) {
      let { scrollingElement: e } = t.ownerDocument;
      return (e && a.add(e), a);
    }
    return o(t.parentNode);
  }
  return e ? o(e) : a;
}
function Om(e) {
  let [t] = Dm(e, { limit: 1 });
  return t ?? null;
}
function km(e, t = window.frameElement) {
  let n = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  if (!e) return n;
  let r = lm(e);
  for (; r; ) {
    if (r === t) return n;
    let e = Rp(r),
      { x: i, y: a } = Am(r, e);
    ((n.x += e.left), (n.y += e.top), (n.scaleX *= i), (n.scaleY *= a), (r = lm(r)));
  }
  return n;
}
function Am(e, t = Rp(e)) {
  let n = Math.round(t.width),
    r = Math.round(t.height);
  if (Up(e)) return { x: n / e.offsetWidth, y: r / e.offsetHeight };
  let i = Cm(e, !0);
  return { x: (parseFloat(i.width) || n) / n, y: (parseFloat(i.height) || r) / r };
}
function jm(e) {
  if (e === `none`) return null;
  let t = e.split(` `),
    n = parseFloat(t[0]),
    r = parseFloat(t[1]);
  return isNaN(n) && isNaN(r) ? null : { x: isNaN(n) ? r : n, y: isNaN(r) ? n : r };
}
function Mm(e) {
  if (e === `none`) return null;
  let [t, n, r = `0`] = e.split(` `),
    i = { x: parseFloat(t), y: parseFloat(n), z: parseInt(r, 10) };
  return isNaN(i.x) && isNaN(i.y)
    ? null
    : { x: isNaN(i.x) ? 0 : i.x, y: isNaN(i.y) ? 0 : i.y, z: isNaN(i.z) ? 0 : i.z };
}
function Nm(e) {
  let { scale: t, transform: n, translate: r } = e,
    i = jm(t),
    a = Mm(r),
    o = Pm(n);
  if (!o && !i && !a) return null;
  let s = { x: i?.x ?? 1, y: i?.y ?? 1 },
    c = { x: a?.x ?? 0, y: a?.y ?? 0 },
    l = { x: o?.x ?? 0, y: o?.y ?? 0, scaleX: o?.scaleX ?? 1, scaleY: o?.scaleY ?? 1 };
  return {
    x: c.x + l.x,
    y: c.y + l.y,
    z: a?.z ?? 0,
    scaleX: s.x * l.scaleX,
    scaleY: s.y * l.scaleY,
  };
}
function Pm(e) {
  if (e.startsWith(`matrix3d(`)) {
    let t = e.slice(9, -1).split(/, /);
    return { x: +t[12], y: +t[13], scaleX: +t[0], scaleY: +t[5] };
  } else if (e.startsWith(`matrix(`)) {
    let t = e.slice(7, -1).split(/, /);
    return { x: +t[4], y: +t[5], scaleX: +t[0], scaleY: +t[3] };
  }
  return null;
}
function Fm(e, t, n, r = 25, i = Lh, a = Rh) {
  let { x: o, y: s } = t,
    { rect: c, isTop: l, isBottom: u, isLeft: d, isRight: f } = xm(e),
    p = km(e),
    m = Nm(Cm(e, !0)),
    h = m === null ? !1 : m?.scaleX < 0,
    g = m === null ? !1 : m?.scaleY < 0,
    _ = new cd(
      c.left * p.scaleX + p.x,
      c.top * p.scaleY + p.y,
      c.width * p.scaleX,
      c.height * p.scaleY,
    ),
    v = { x: 0, y: 0 },
    y = { x: 0, y: 0 },
    b = { height: _.height * i.y, width: _.width * i.x };
  return (
    (!l || (g && !u)) &&
    s <= _.top + b.height &&
    n?.y !== 1 &&
    o >= _.left - a.x &&
    o <= _.right + a.x
      ? ((v.y = g ? 1 : -1), (y.y = r * Math.abs((_.top + b.height - s) / b.height)))
      : (!u || (g && !l)) &&
        s >= _.bottom - b.height &&
        n?.y !== -1 &&
        o >= _.left - a.x &&
        o <= _.right + a.x &&
        ((v.y = g ? -1 : 1), (y.y = r * Math.abs((_.bottom - b.height - s) / b.height))),
    (!f || (h && !d)) &&
    o >= _.right - b.width &&
    n?.x !== -1 &&
    s >= _.top - a.y &&
    s <= _.bottom + a.y
      ? ((v.x = h ? -1 : 1), (y.x = r * Math.abs((_.right - b.width - o) / b.width)))
      : (!d || (h && !f)) &&
        o <= _.left + b.width &&
        n?.x !== 1 &&
        s >= _.top - a.y &&
        s <= _.bottom + a.y &&
        ((v.x = h ? 1 : -1), (y.x = r * Math.abs((_.left + b.width - o) / b.width))),
    { direction: v, speed: y }
  );
}
function Im(e) {
  return `scrollIntoViewIfNeeded` in e && typeof e.scrollIntoViewIfNeeded == `function`;
}
function Lm(e, t = !1) {
  if (Im(e)) {
    e.scrollIntoViewIfNeeded(t);
    return;
  }
  if (!Up(e)) return e.scrollIntoView();
  var n = Om(e);
  if (!Up(n)) return;
  let r = Cm(n, !0),
    i = parseInt(r.getPropertyValue(`border-top-width`)),
    a = parseInt(r.getPropertyValue(`border-left-width`)),
    o = e.offsetTop - n.offsetTop < n.scrollTop,
    s = e.offsetTop - n.offsetTop + e.clientHeight - i > n.scrollTop + n.clientHeight,
    c = e.offsetLeft - n.offsetLeft < n.scrollLeft,
    l = e.offsetLeft - n.offsetLeft + e.clientWidth - a > n.scrollLeft + n.clientWidth,
    u = o && !s;
  ((o || s) &&
    t &&
    (n.scrollTop = e.offsetTop - n.offsetTop - n.clientHeight / 2 - i + e.clientHeight / 2),
    (c || l) &&
      t &&
      (n.scrollLeft = e.offsetLeft - n.offsetLeft - n.clientWidth / 2 - a + e.clientWidth / 2),
    (o || s || c || l) && !t && e.scrollIntoView(u));
}
function Rm(e, t, n) {
  let { scaleX: r, scaleY: i, x: a, y: o } = t,
    s = e.left + a + (1 - r) * parseFloat(n),
    c = e.top + o + (1 - i) * parseFloat(n.slice(n.indexOf(` `) + 1)),
    l = r ? e.width * r : e.width,
    u = i ? e.height * i : e.height;
  return { width: l, height: u, top: c, right: s + l, bottom: c + u, left: s };
}
function zm(e, t, n) {
  let { scaleX: r, scaleY: i, x: a, y: o } = t,
    s = e.left - a - (1 - r) * parseFloat(n),
    c = e.top - o - (1 - i) * parseFloat(n.slice(n.indexOf(` `) + 1)),
    l = r ? e.width / r : e.width,
    u = i ? e.height / i : e.height;
  return { width: l, height: u, top: c, right: s + l, bottom: c + u, left: s };
}
function Bm({ element: e, keyframes: t, options: n }) {
  return e.animate(t, n).finished;
}
function Vm(e, t = Cm(e).translate, n = !0) {
  if (n) {
    let t = Lp(e, (e) => `translate` in e);
    if (t) {
      let { translate: e = `` } = t[0];
      if (typeof e == `string`) {
        let t = Mm(e);
        if (t) return t;
      }
    }
  }
  if (t) {
    let e = Mm(t);
    if (e) return e;
  }
  return { x: 0, y: 0, z: 0 };
}
function Hm(e) {
  let t = e.ownerDocument,
    n = Bh.get(t);
  if (n) return n;
  ((n = t.getAnimations()), Bh.set(t, n), zh.schedule(Vh));
  let r = n.filter((t) => Ip(t.effect) && t.effect.target === e);
  return (Bh.set(e, r), n);
}
function Um(e, t) {
  let n = Hm(e)
    .filter((e) => {
      if (Ip(e.effect)) {
        let { target: n } = e.effect;
        if ((n && t.isValidTarget?.call(t, n)) ?? !0)
          return e.effect.getKeyframes().some((e) => {
            for (let n of t.properties) if (e[n]) return !0;
          });
      }
    })
    .map((e) => {
      let { effect: t, currentTime: n } = e,
        r = t?.getComputedTiming().duration;
      if (
        !(e.pending || e.playState === `finished`) &&
        typeof r == `number` &&
        typeof n == `number` &&
        n < r
      )
        return (
          (e.currentTime = r),
          () => {
            e.currentTime = n;
          }
        );
    });
  if (n.length > 0) return () => n.forEach((e) => e?.());
}
function Wm(e, t) {
  let n = e.getAnimations(),
    r = null;
  if (!n.length) return null;
  for (let e of n) {
    if (e.playState !== `running`) continue;
    let n = Ip(e.effect) ? e.effect.getKeyframes() : [],
      i = n[n.length - 1];
    if (!i) continue;
    let { transform: a, translate: o, scale: s } = i;
    if (a || o || s) {
      let e = Nm({
        transform: typeof a == `string` && a ? a : t.transform,
        translate: typeof o == `string` && o ? o : t.translate,
        scale: typeof s == `string` && s ? s : t.scale,
      });
      e &&
        (r = r
          ? {
              x: r.x + e.x,
              y: r.y + e.y,
              z: r.z ?? e.z,
              scaleX: r.scaleX * e.scaleX,
              scaleY: r.scaleY * e.scaleY,
            }
          : e);
    }
  }
  return r;
}
function Gm(e) {
  return (
    `style` in e &&
    typeof e.style == `object` &&
    e.style !== null &&
    `setProperty` in e.style &&
    `removeProperty` in e.style &&
    typeof e.style.setProperty == `function` &&
    typeof e.style.removeProperty == `function`
  );
}
function Km(e) {
  return e ? e instanceof Vp(e).Element || (Bp(e) && e.nodeType === Node.ELEMENT_NODE) : !1;
}
function qm(e) {
  if (!e) return !1;
  let { KeyboardEvent: t } = Vp(e.target);
  return e instanceof t;
}
function Jm(e) {
  if (!e) return !1;
  let { PointerEvent: t } = Vp(e.target);
  return e instanceof t;
}
function Ym(e) {
  if (!Km(e)) return !1;
  let { tagName: t } = e;
  return t === `INPUT` || t === `TEXTAREA` || Xm(e);
}
function Xm(e) {
  return e.hasAttribute(`contenteditable`) && e.getAttribute(`contenteditable`) !== `false`;
}
function Zm(e) {
  let t = Wh[e] == null ? 0 : Wh[e] + 1;
  return ((Wh[e] = t), `${e}-${t}`);
}
var Qm,
  $m,
  W,
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
  Gh = t(() => {
    (_d(),
      (Qm = (e) => {
        throw TypeError(e);
      }),
      ($m = (e, t, n) => t.has(e) || Qm(`Cannot ` + n)),
      (W = (e, t, n) => ($m(e, t, `read from private field`), t.get(e))),
      (eh = (e, t, n) =>
        t.has(e)
          ? Qm(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (th = (e, t, n, r) => ($m(e, t, `write to private field`), t.set(e, n), n)),
      (nh = (e, t, n) => ($m(e, t, `access private method`), n)),
      (rh =
        typeof window < `u` &&
        window.document !== void 0 &&
        window.document.createElement !== void 0),
      (ih = new WeakMap()),
      (ah = class {
        constructor() {
          ((this.entries = new Set()),
            (this.clear = () => {
              for (let e of this.entries) {
                let [t, { type: n, listener: r, options: i }] = e;
                t.removeEventListener(n, r, i);
              }
              this.entries.clear();
            }));
        }
        bind(e, t) {
          let n = Array.isArray(e) ? e : [e],
            r = Array.isArray(t) ? t : [t],
            i = [];
          for (let e of n)
            for (let t of r) {
              let { type: n, listener: r, options: a } = t,
                o = [e, t];
              (e.addEventListener(n, r, a), this.entries.add(o), i.push(o));
            }
          return function () {
            for (let [e, { type: t, listener: n, options: r }] of i) e.removeEventListener(t, n, r);
          };
        }
      }),
      (oh = rh
        ? ResizeObserver
        : class {
            observe() {}
            unobserve() {}
            disconnect() {}
          }),
      (ch = class extends oh {
        constructor(e) {
          (super((t) => {
            if (!W(this, sh)) {
              th(this, sh, !0);
              return;
            }
            e(t, this);
          }),
            eh(this, sh, !1));
        }
      }),
      (sh = new WeakMap()),
      (lh = Array.from({ length: 100 }, (e, t) => t / 100)),
      (uh = 75),
      (Sh = class {
        constructor(e, t, n = { debug: !1, skipInitial: !1 }) {
          ((this.element = e),
            (this.callback = t),
            eh(this, yh),
            (this.disconnect = () => {
              var e, t, n;
              (th(this, _h, !0),
                (e = W(this, ph)) == null || e.disconnect(),
                (t = W(this, mh)) == null || t.disconnect(),
                W(this, hh).disconnect(),
                (n = W(this, gh)) == null || n.remove());
            }),
            eh(this, dh, !0),
            eh(this, fh),
            eh(this, ph),
            eh(this, mh),
            eh(this, hh),
            eh(this, gh),
            eh(this, _h, !1),
            eh(
              this,
              vh,
              fm(() => {
                var e;
                let { element: t } = this;
                if (
                  ((e = W(this, mh)) == null || e.disconnect(),
                  W(this, _h) || !W(this, dh) || !t.isConnected)
                )
                  return;
                let n = t.ownerDocument ?? document,
                  { innerHeight: r, innerWidth: i } = n.defaultView ?? window,
                  a = t.getBoundingClientRect(),
                  { top: o, left: s, bottom: c, right: l } = Yp(t, a),
                  u = -Math.floor(o),
                  d = -Math.floor(s),
                  f = `${u}px ${-Math.floor(i - l)}px ${-Math.floor(r - c)}px ${d}px`;
                ((this.boundingClientRect = a),
                  th(
                    this,
                    mh,
                    new IntersectionObserver(
                      (e) => {
                        let [n] = e,
                          { intersectionRect: r } = n;
                        (n.intersectionRatio === 1
                          ? cd.intersectionRatio(r, Yp(t))
                          : n.intersectionRatio) !== 1 && W(this, vh).call(this);
                      },
                      { threshold: lh, rootMargin: f, root: n },
                    ),
                  ),
                  W(this, mh).observe(t),
                  nh(this, yh, bh).call(this));
              }, uh),
            ),
            (this.boundingClientRect = e.getBoundingClientRect()),
            th(this, dh, mm(e, this.boundingClientRect)));
          let r = !0;
          this.callback = (e) => {
            (r && ((r = !1), n.skipInitial)) || t(e);
          };
          let i = e.ownerDocument;
          (n?.debug &&
            (th(this, gh, document.createElement(`div`)),
            (W(this, gh).style.background = `rgba(0,0,0,0.15)`),
            (W(this, gh).style.position = `fixed`),
            (W(this, gh).style.pointerEvents = `none`),
            i.body.appendChild(W(this, gh))),
            th(
              this,
              hh,
              new IntersectionObserver(
                (t) => {
                  var n, r;
                  let { boundingClientRect: i, isIntersecting: a } = t[t.length - 1],
                    { width: o, height: s } = i,
                    c = W(this, dh);
                  (th(this, dh, a),
                    !(!o && !s) &&
                      (c && !a
                        ? ((n = W(this, mh)) == null || n.disconnect(),
                          this.callback(null),
                          (r = W(this, ph)) == null || r.disconnect(),
                          th(this, ph, void 0),
                          W(this, gh) && (W(this, gh).style.visibility = `hidden`))
                        : W(this, vh).call(this),
                      a &&
                        !W(this, ph) &&
                        (th(this, ph, new ch(W(this, vh))), W(this, ph).observe(e))));
                },
                { threshold: lh, root: i },
              ),
            ),
            W(this, dh) && !n.skipInitial && this.callback(this.boundingClientRect),
            W(this, hh).observe(e));
        }
      }),
      (dh = new WeakMap()),
      (fh = new WeakMap()),
      (ph = new WeakMap()),
      (mh = new WeakMap()),
      (hh = new WeakMap()),
      (gh = new WeakMap()),
      (_h = new WeakMap()),
      (vh = new WeakMap()),
      (yh = new WeakSet()),
      (bh = function () {
        W(this, _h) ||
          (nh(this, yh, xh).call(this),
          !pm(this.boundingClientRect, W(this, fh)) &&
            (this.callback(this.boundingClientRect), th(this, fh, this.boundingClientRect)));
      }),
      (xh = function () {
        if (W(this, gh)) {
          let { top: e, left: t, width: n, height: r } = Yp(this.element);
          ((W(this, gh).style.overflow = `hidden`),
            (W(this, gh).style.visibility = `visible`),
            (W(this, gh).style.top = `${Math.floor(e)}px`),
            (W(this, gh).style.left = `${Math.floor(t)}px`),
            (W(this, gh).style.width = `${Math.floor(n)}px`),
            (W(this, gh).style.height = `${Math.floor(r)}px`));
        }
      }),
      (Ch = new WeakMap()),
      (wh = new WeakMap()),
      (kh = class {
        constructor(e, t, n) {
          ((this.callback = t),
            eh(this, Th),
            eh(this, Eh, !1),
            eh(this, Dh),
            eh(
              this,
              Oh,
              fm((e) => {
                if (
                  !W(this, Eh) &&
                  e.target &&
                  `contains` in e.target &&
                  typeof e.target.contains == `function`
                ) {
                  for (let t of W(this, Dh))
                    if (e.target.contains(t)) {
                      this.callback(W(this, Th).boundingClientRect);
                      break;
                    }
                }
              }, uh),
            ));
          let r = um(e),
            i = gm(r, t),
            a = _m(e, W(this, Oh));
          (th(this, Dh, r),
            th(this, Th, new Sh(e, t, n)),
            (this.disconnect = () => {
              W(this, Eh) || (th(this, Eh, !0), i(), a(), W(this, Th).disconnect());
            }));
        }
      }),
      (Th = new WeakMap()),
      (Eh = new WeakMap()),
      (Dh = new WeakMap()),
      (Oh = new WeakMap()),
      (Ah = class {
        constructor(e) {
          ((this.scheduler = e),
            (this.pending = !1),
            (this.tasks = new Set()),
            (this.resolvers = new Set()),
            (this.flush = () => {
              let { tasks: e, resolvers: t } = this;
              ((this.pending = !1), (this.tasks = new Set()), (this.resolvers = new Set()));
              for (let t of e) t();
              for (let e of t) e();
            }));
        }
        schedule(e) {
          return (
            this.tasks.add(e),
            this.pending || ((this.pending = !0), this.scheduler(this.flush)),
            new Promise((e) => this.resolvers.add(e))
          );
        }
      }),
      (jh = new Ah((e) => {
        typeof requestAnimationFrame == `function` ? requestAnimationFrame(e) : e();
      })),
      (Mh = new Ah((e) => setTimeout(e, 50))),
      (Nh = new Map()),
      (Ph = Nh.clear.bind(Nh)),
      (Fh = { excludeElement: !0, escapeShadowDOM: !0 }),
      (Ih = ((e) => (
        (e[(e.Idle = 0)] = `Idle`),
        (e[(e.Forward = 1)] = `Forward`),
        (e[(e.Reverse = -1)] = `Reverse`),
        e
      ))(Ih || {})),
      (Lh = { x: 0.2, y: 0.2 }),
      (Rh = { x: 10, y: 10 }),
      (zh = new Ah((e) => setTimeout(e, 0))),
      (Bh = new Map()),
      (Vh = Bh.clear.bind(Bh)),
      (Hh = class extends cd {
        constructor(e, t = {}) {
          let { frameTransform: n = km(e), ignoreTransforms: r, getBoundingClientRect: i = Rp } = t,
            a = Um(e, {
              properties: [`transform`, `translate`, `scale`, `width`, `height`],
              isValidTarget: (t) => (t !== e || Qp()) && t.contains(e),
            }),
            o = i(e),
            { top: s, left: c, width: l, height: u } = o,
            d,
            f = Cm(e),
            p = Nm(f),
            m = { x: p?.scaleX ?? 1, y: p?.scaleY ?? 1 },
            h = Wm(e, f);
          (a?.(),
            p &&
              ((d = zm(o, p, f.transformOrigin)),
              (r || h) && ((s = d.top), (c = d.left), (l = d.width), (u = d.height))));
          let g = { width: d?.width ?? l, height: d?.height ?? u };
          if (h && !r && d) {
            let e = Rm(d, h, f.transformOrigin);
            ((s = e.top),
              (c = e.left),
              (l = e.width),
              (u = e.height),
              (m.x = h.scaleX),
              (m.y = h.scaleY));
          }
          (n &&
            (r || ((c *= n.scaleX), (l *= n.scaleX), (s *= n.scaleY), (u *= n.scaleY)),
            (c += n.x),
            (s += n.y)),
            super(c, s, l, u),
            (this.scale = m),
            (this.intrinsicWidth = g.width),
            (this.intrinsicHeight = g.height));
        }
      }),
      (Uh = class {
        constructor(e) {
          ((this.element = e), (this.initial = new Map()));
        }
        set(e, t = ``) {
          let { element: n } = this;
          if (Gm(n))
            for (let [r, i] of Object.entries(e)) {
              let e = `${t}${r}`;
              (this.initial.has(e) || this.initial.set(e, n.style.getPropertyValue(e)),
                n.style.setProperty(e, typeof i == `string` ? i : `${i}px`));
            }
        }
        remove(e, t = ``) {
          let { element: n } = this;
          if (Gm(n))
            for (let r of e) {
              let e = `${t}${r}`;
              n.style.removeProperty(e);
            }
        }
        reset() {
          let { element: e } = this;
          if (Gm(e)) {
            for (let [t, n] of this.initial) e.style.setProperty(t, n);
            e.getAttribute(`style`) === `` && e.removeAttribute(`style`);
          }
        }
      }),
      (Wh = {}));
  }),
  Kh,
  qh,
  Jh,
  Yh,
  Xh = t(() => {
    (Fp(),
      _d(),
      (Kh = ({ dragOperation: e, droppable: t }) => {
        let n = e.position.current;
        if (!n) return null;
        let { id: r } = t;
        return t.shape && t.shape.containsPoint(n)
          ? {
              id: r,
              value: 1 / sd.distance(t.shape.center, n),
              type: ff.PointerIntersection,
              priority: df.High,
            }
          : null;
      }),
      (qh = ({ dragOperation: e, droppable: t }) => {
        let { shape: n } = e;
        if (!t.shape || !n?.current) return null;
        let r = n.current.intersectionArea(t.shape);
        if (r) {
          let { position: i } = e,
            a = sd.distance(t.shape.center, i.current),
            o = r / (n.current.area + t.shape.area - r) / a;
          return { id: t.id, value: o, type: ff.ShapeIntersection, priority: df.Normal };
        }
        return null;
      }),
      (Jh = (e) => Kh(e) ?? qh(e)),
      (Yh = (e) => {
        let { dragOperation: t, droppable: n } = e,
          { shape: r, position: i } = t;
        if (!n.shape) return null;
        let a = r ? cd.from(r.current.boundingRectangle).corners : void 0,
          o =
            cd
              .from(n.shape.boundingRectangle)
              .corners.reduce((e, t, n) => e + sd.distance(sd.from(t), a?.[n] ?? i.current), 0) / 4;
        return { id: n.id, value: 1 / o, type: ff.Collision, priority: df.Normal };
      }));
  });
function Zh(e) {
  let t = e.tagName.toLowerCase();
  return [`input`, `select`, `textarea`, `a`, `button`].includes(t);
}
function Qh(e, t) {
  let n = document.createElement(`div`);
  return ((n.id = e), n.style.setProperty(`display`, `none`), (n.textContent = t), n);
}
function $h(e) {
  let t = document.createElement(`div`);
  return (
    (t.id = e),
    t.setAttribute(`role`, `status`),
    t.setAttribute(`aria-live`, `polite`),
    t.setAttribute(`aria-atomic`, `true`),
    t.style.setProperty(`position`, `fixed`),
    t.style.setProperty(`width`, `1px`),
    t.style.setProperty(`height`, `1px`),
    t.style.setProperty(`margin`, `-1px`),
    t.style.setProperty(`border`, `0`),
    t.style.setProperty(`padding`, `0`),
    t.style.setProperty(`overflow`, `hidden`),
    t.style.setProperty(`clip`, `rect(0 0 0 0)`),
    t.style.setProperty(`clip-path`, `inset(100%)`),
    t.style.setProperty(`white-space`, `nowrap`),
    t
  );
}
function eg(e, t) {
  let n,
    r = () => {
      (clearTimeout(n), (n = setTimeout(e, t)));
    };
  return ((r.cancel = () => clearTimeout(n)), r);
}
function tg(e, t = `hidden`) {
  return R(() => {
    let { element: n, manager: r } = e;
    if (!n || !r) return;
    let i = ng(n, r.registry.droppables),
      a = [],
      o = rm(n),
      { remove: s } = o;
    return (
      rg(i, o, a),
      ig(o, t),
      (o.remove = () => {
        (a.forEach((e) => e()), s.call(o));
      }),
      o
    );
  });
}
function ng(e, t) {
  let n = new Map();
  for (let r of t)
    if (r.element && (e === r.element || e.contains(r.element))) {
      let e = `${g_}${Zm(`dom-id`)}`;
      (r.element.setAttribute(e, ``), n.set(r, e));
    }
  return n;
}
function rg(e, t, n) {
  for (let [r, i] of e) {
    if (!r.element) continue;
    let e = `[${i}]`,
      a = t.matches(e) ? t : t.querySelector(e);
    if ((r.element.removeAttribute(i), !a)) continue;
    let o = r.element;
    ((r.proxy = a),
      a.removeAttribute(i),
      ih.set(o, a),
      n.push(() => {
        (ih.delete(o), (r.proxy = void 0));
      }));
  }
}
function ig(e, t = `hidden`) {
  (e.setAttribute(`inert`, `true`),
    e.setAttribute(`tab-index`, `-1`),
    e.setAttribute(`aria-hidden`, `true`),
    e.setAttribute(b_, t));
}
function ag(e, t) {
  return e === t ? !0 : lm(e) === lm(t);
}
function og(e) {
  let { target: t } = e;
  `newState` in e &&
    e.newState === `closed` &&
    Km(t) &&
    t.hasAttribute(`popover`) &&
    requestAnimationFrame(() => ym(t));
}
function sg(e) {
  return e.tagName === `TR`;
}
function cg(e, t, n) {
  let r = new MutationObserver((r) => {
    let i = !1;
    for (let n of r) {
      if (n.target !== e) {
        i = !0;
        continue;
      }
      if (n.type !== `attributes`) continue;
      let r = n.attributeName;
      if (r.startsWith(`aria-`) || x_.includes(r)) continue;
      let a = e.getAttribute(r);
      if (r === `style`) {
        if (Gm(e) && Gm(t)) {
          let n = e.style;
          for (let e of Array.from(t.style))
            n.getPropertyValue(e) === `` && t.style.removeProperty(e);
          for (let e of Array.from(n)) {
            if (S_.includes(e) || e.startsWith(v_)) continue;
            let r = n.getPropertyValue(e);
            t.style.setProperty(e, r);
          }
        }
      } else a === null ? t.removeAttribute(r) : t.setAttribute(r, a);
    }
    i && n && (t.innerHTML = e.innerHTML);
  });
  return (r.observe(e, { attributes: !0, subtree: !0, childList: !0 }), r);
}
function lg(e, t, n) {
  let r = new MutationObserver((r) => {
    for (let i of r)
      if (i.addedNodes.length !== 0)
        for (let r of Array.from(i.addedNodes)) {
          if (r.contains(e) && e.nextElementSibling !== t) {
            (e.insertAdjacentElement(`afterend`, t), ym(n));
            return;
          }
          if (r.contains(t) && t.previousElementSibling !== e) {
            (t.insertAdjacentElement(`beforebegin`, e), ym(n));
            return;
          }
        }
  });
  return (r.observe(e.ownerDocument.body, { childList: !0, subtree: !0 }), r);
}
function ug(e) {
  return new ResizeObserver(() => {
    var t;
    let n = new Hh(e.placeholder, { frameTransform: e.frameTransform, ignoreTransforms: !0 }),
      r = e.transformOrigin ?? { x: 1, y: 1 },
      i = (e.width - n.width) * r.x + e.delta.x,
      a = (e.height - n.height) * r.y + e.delta.y,
      o = $p();
    if (
      (e.styles.set(
        {
          width: n.width - e.widthOffset,
          height: n.height - e.heightOffset,
          top: e.top + a + o.y,
          left: e.left + i + o.x,
        },
        v_,
      ),
      (t = e.getElementMutationObserver()) == null || t.takeRecords(),
      sg(e.element) && sg(e.placeholder))
    ) {
      let t = Array.from(e.element.cells),
        n = Array.from(e.placeholder.cells);
      e.getSavedCellWidths() || e.setSavedCellWidths(t.map((e) => e.style.width));
      for (let [e, r] of t.entries()) {
        let t = n[e];
        r.style.width = `${t.getBoundingClientRect().width}px`;
      }
    }
    e.dragOperation.shape = new Hh(e.feedbackElement);
  });
}
function dg(e) {
  var t;
  let { animation: n } = e;
  if (typeof n == `function`) {
    let t = n({
      element: e.element,
      feedbackElement: e.feedbackElement,
      placeholder: e.placeholder,
      translate: e.translate,
      moved: e.moved,
    });
    Promise.resolve(t).then(() => {
      (e.cleanup(), requestAnimationFrame(e.restoreFocus));
    });
    return;
  }
  let { duration: r = w_, easing: i = T_ } = n ?? {};
  ym(e.feedbackElement);
  let [, a] = Lp(e.feedbackElement, (e) => `translate` in e) ?? [];
  a?.pause();
  let o = e.placeholder ?? e.element,
    s = { frameTransform: ag(e.feedbackElement, o) ? null : void 0 },
    c = new Hh(e.feedbackElement, s),
    l = Mm(Cm(e.feedbackElement).translate) ?? e.translate,
    u = new Hh(o, s),
    d = cd.delta(c, u, e.alignment),
    f = { x: l.x - d.x, y: l.y - d.y },
    p =
      Math.round(c.intrinsicHeight) === Math.round(u.intrinsicHeight)
        ? {}
        : {
            minHeight: [`${c.intrinsicHeight}px`, `${u.intrinsicHeight}px`],
            maxHeight: [`${c.intrinsicHeight}px`, `${u.intrinsicHeight}px`],
          },
    m =
      Math.round(c.intrinsicWidth) === Math.round(u.intrinsicWidth)
        ? {}
        : {
            minWidth: [`${c.intrinsicWidth}px`, `${u.intrinsicWidth}px`],
            maxWidth: [`${c.intrinsicWidth}px`, `${u.intrinsicWidth}px`],
          };
  (e.styles.set({ transition: e.transition }, v_),
    e.feedbackElement.setAttribute(__, ``),
    (t = e.getElementMutationObserver()) == null || t.takeRecords(),
    Bm({
      element: e.feedbackElement,
      keyframes: Mg(jg(jg({}, p), m), {
        translate: [`${l.x}px ${l.y}px 0`, `${f.x}px ${f.y}px 0`],
      }),
      options: {
        duration: nm(Vp(e.feedbackElement))
          ? 0
          : e.moved || e.feedbackElement !== e.element
            ? r
            : 0,
        easing: i,
      },
    }).then(() => {
      (e.feedbackElement.removeAttribute(__),
        a?.finish(),
        e.cleanup(),
        requestAnimationFrame(e.restoreFocus));
    }));
}
function fg(e, t) {
  return Math.sign(e - t);
}
function pg(e) {
  return e > 0 ? Ih.Forward : e < 0 ? Ih.Reverse : Ih.Idle;
}
function mg() {
  var e;
  (e = document.getSelection()) == null || e.removeAllRanges();
}
function hg(e, t) {
  return t.includes(e.code);
}
function gg(e) {
  return `sensor` in e;
}
function _g(e) {
  e.preventDefault();
}
function vg() {}
function yg(e) {
  !e || Cv.has(e) || (e.addEventListener(`touchmove`, vg, { capture: !1, passive: !1 }), Cv.add(e));
}
var bg,
  xg,
  Sg,
  Cg,
  wg,
  Tg,
  Eg,
  Dg,
  Og,
  kg,
  Ag,
  jg,
  Mg,
  Ng,
  Pg,
  Fg,
  Ig,
  Lg,
  Rg,
  zg,
  Bg,
  Vg,
  Hg,
  Ug,
  G,
  Wg,
  Gg,
  Kg,
  qg,
  Jg,
  Yg,
  Xg,
  Zg,
  Qg,
  $g,
  e_,
  t_,
  n_,
  r_,
  i_,
  a_,
  o_,
  s_,
  c_,
  l_,
  u_,
  d_,
  f_,
  p_,
  m_,
  h_,
  g_,
  __,
  v_,
  y_,
  b_,
  x_,
  S_,
  C_,
  w_,
  T_,
  E_,
  D_,
  O_,
  k_,
  A_,
  j_,
  M_,
  N_,
  P_,
  F_,
  I_,
  L_,
  R_,
  z_,
  B_,
  V_,
  H_,
  U_,
  W_,
  G_,
  K_,
  q_,
  J_,
  Y_,
  X_,
  Z_,
  Q_,
  $_,
  ev,
  tv,
  nv,
  rv,
  iv,
  av,
  ov,
  sv,
  cv,
  lv,
  uv,
  dv,
  fv,
  pv,
  mv,
  hv,
  gv,
  _v,
  vv,
  yv,
  bv,
  xv,
  Sv,
  Cv,
  wv,
  Tv,
  Ev,
  Dv,
  Ov,
  kv,
  Av,
  jv,
  Mv,
  Nv,
  Pv,
  Fv,
  Iv,
  Lv,
  Rv,
  zv,
  Bv,
  Vv,
  Hv,
  Uv,
  Wv,
  Gv,
  Kv = t(() => {
    (Fp(),
      Gh(),
      Nu(),
      _d(),
      Xh(),
      (bg = Object.create),
      (xg = Object.defineProperty),
      (Sg = Object.defineProperties),
      (Cg = Object.getOwnPropertyDescriptor),
      (wg = Object.getOwnPropertyDescriptors),
      (Tg = Object.getOwnPropertySymbols),
      (Eg = Object.prototype.hasOwnProperty),
      (Dg = Object.prototype.propertyIsEnumerable),
      (Og = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (kg = (e) => {
        throw TypeError(e);
      }),
      (Ag = (e, t, n) =>
        t in e
          ? xg(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (jg = (e, t) => {
        for (var n in (t ||= {})) Eg.call(t, n) && Ag(e, n, t[n]);
        if (Tg) for (var n of Tg(t)) Dg.call(t, n) && Ag(e, n, t[n]);
        return e;
      }),
      (Mg = (e, t) => Sg(e, wg(t))),
      (Ng = (e, t) => xg(e, `name`, { value: t, configurable: !0 })),
      (Pg = (e, t) => {
        var n = {};
        for (var r in e) Eg.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && Tg)
          for (var r of Tg(e)) t.indexOf(r) < 0 && Dg.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (Fg = (e) => [, , , bg(e?.[Og(`metadata`)] ?? null)]),
      (Ig = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Lg = (e) => (e !== void 0 && typeof e != `function` ? kg(`Function expected`) : e)),
      (Rg = (e, t, n, r, i) => ({
        kind: Ig[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? kg(`Already initialized`) : i.push(Lg(e || null))),
      })),
      (zg = (e, t) => Ag(t, Og(`metadata`), e[3])),
      (Bg = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (Vg = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Ig[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Cg(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return G(this, a);
                      },
                      set [n](e) {
                        return Gg(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Ng(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Ng(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Rg(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => Ug(i, e) : (e) => n in e }),
              d ^ 3 && (u.get = p ? (e) => (d ^ 1 ? G : Kg)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => Gg(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? Lg(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? kg(`Object expected`)
                : (Lg((o = s.get)) && (v.get = o),
                  Lg((o = s.set)) && (v.set = o),
                  Lg((o = s.init)) && g.unshift(o)));
        return (d || zg(e, i), v && xg(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (Hg = (e, t, n) => t.has(e) || kg(`Cannot ` + n)),
      (Ug = (e, t) =>
        Object(t) === t ? e.has(t) : kg(`Cannot use the "in" operator on this value`)),
      (G = (e, t, n) => (Hg(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (Wg = (e, t, n) =>
        t.has(e)
          ? kg(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Gg = (e, t, n, r) => (
        Hg(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (Kg = (e, t, n) => (Hg(e, t, `access private method`), n)),
      (qg = { role: `button`, roleDescription: `draggable` }),
      (Jg = `dnd-kit-description`),
      (Yg = `dnd-kit-announcement`),
      (Xg = {
        draggable: `To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item in a given direction. Press space again to drop the item in its new position, or press escape to cancel.`,
      }),
      (Zg = {
        dragstart({ operation: { source: e } }) {
          if (e) return `Picked up draggable item ${e.id}.`;
        },
        dragover({ operation: { source: e, target: t } }) {
          if (!(!e || e.id === t?.id))
            return t
              ? `Draggable item ${e.id} was moved over droppable target ${t.id}.`
              : `Draggable item ${e.id} is no longer over a droppable target.`;
        },
        dragend({ operation: { source: e, target: t }, canceled: n }) {
          if (e)
            return n
              ? `Dragging was cancelled. Draggable item ${e.id} was dropped.`
              : t
                ? `Draggable item ${e.id} was dropped over droppable target ${t.id}`
                : `Draggable item ${e.id} was dropped.`;
        },
      }),
      (Qg = [`dragover`, `dragmove`]),
      ($g = class extends $d {
        constructor(e, t) {
          super(e);
          let {
              id: n,
              idPrefix: { description: r = Jg, announcement: i = Yg } = {},
              announcements: a = Zg,
              screenReaderInstructions: o = Xg,
              debounce: s = 500,
            } = t ?? {},
            c = n ? `${r}-${n}` : Zm(r),
            l = n ? `${i}-${n}` : Zm(i),
            u,
            d,
            f,
            p,
            m = (e = p) => {
              !f || !e || (f?.nodeValue !== e && (f.nodeValue = e));
            },
            h = () => jh.schedule(m),
            g = eg(h, s),
            _ = Object.entries(a).map(([e, t]) =>
              this.manager.monitor.addEventListener(e, (n, r) => {
                let i = f;
                if (!i) return;
                let a = t?.(n, r);
                a && i.nodeValue !== a && ((p = a), Qg.includes(e) ? g() : (h(), g.cancel()));
              }),
            ),
            v = () => {
              let e = [];
              (u?.isConnected || ((u = Qh(c, o.draggable)), e.push(u)),
                d?.isConnected ||
                  ((d = $h(l)), (f = document.createTextNode(``)), d.appendChild(f), e.push(d)),
                e.length > 0 && document.body.append(...e));
            },
            y = new Set();
          function b() {
            for (let e of y) e();
          }
          (this.registerEffect(() => {
            y.clear();
            for (let e of this.manager.registry.draggables.value) {
              let t = e.handle ?? e.element;
              if (t) {
                ((!u || !d) && y.add(v),
                  (!Zh(t) || Qp()) &&
                    !t.hasAttribute(`tabindex`) &&
                    y.add(() => t.setAttribute(`tabindex`, `0`)),
                  !t.hasAttribute(`role`) &&
                    t.tagName.toLowerCase() !== `button` &&
                    y.add(() => t.setAttribute(`role`, qg.role)),
                  t.hasAttribute(`aria-roledescription`) ||
                    y.add(() => t.setAttribute(`aria-roledescription`, qg.roleDescription)),
                  t.hasAttribute(`aria-describedby`) ||
                    y.add(() => t.setAttribute(`aria-describedby`, c)));
                for (let n of [`aria-pressed`, `aria-grabbed`]) {
                  let r = String(e.isDragging);
                  t.getAttribute(n) !== r && y.add(() => t.setAttribute(n, r));
                }
                let n = String(e.disabled);
                t.getAttribute(`aria-disabled`) !== n &&
                  y.add(() => t.setAttribute(`aria-disabled`, n));
              }
            }
            y.size > 0 && jh.schedule(b);
          }),
            (this.destroy = () => {
              (super.destroy(), u?.remove(), d?.remove(), _.forEach((e) => e()));
            }));
        }
      }),
      (e_ = class extends $d {
        constructor(e, t) {
          (super(e, t), (this.manager = e));
          let n = jl(() => Gp(this.manager.dragOperation.source?.element));
          this.destroy = bl(() => {
            let { dragOperation: e } = this.manager,
              { cursor: t = `grabbing`, nonce: r } = this.options ?? {};
            if (e.status.initialized) {
              let e = n.value,
                i = e.createElement(`style`);
              return (
                r && i.setAttribute(`nonce`, r),
                (i.textContent = `* { cursor: ${t} !important; }`),
                e.head.appendChild(i),
                () => i.remove()
              );
            }
          });
        }
      }),
      (t_ = new Map()),
      (h_ = class extends ((o_ = ef), (a_ = [B]), (i_ = [Nl]), (r_ = [Nl]), (n_ = [Nl]), o_) {
        constructor(e) {
          (super(e),
            Bg(c_, 5, this),
            Wg(this, u_),
            Wg(this, s_, new Set()),
            Wg(this, l_, Bg(c_, 8, this, new Set())),
            Bg(c_, 11, this),
            this.registerEffect(Kg(this, u_, d_)));
        }
        register(e) {
          return (
            G(this, s_).add(e),
            () => {
              G(this, s_).delete(e);
            }
          );
        }
        addRoot(e) {
          return (
            R(() => {
              let t = new Set(this.additionalRoots);
              (t.add(e), (this.additionalRoots = t));
            }),
            () => {
              R(() => {
                let t = new Set(this.additionalRoots);
                (t.delete(e), (this.additionalRoots = t));
              });
            }
          );
        }
        get sourceRoot() {
          let { source: e } = this.manager.dragOperation;
          return tm(e?.element ?? null);
        }
        get targetRoot() {
          let { target: e } = this.manager.dragOperation;
          return tm(e?.element ?? null);
        }
        get roots() {
          let { status: e } = this.manager.dragOperation;
          if (e.initializing || e.initialized) {
            let e = [this.sourceRoot, this.targetRoot].filter((e) => e != null);
            return new Set([...e, ...this.additionalRoots]);
          }
          return new Set();
        }
      }),
      (c_ = Fg(o_)),
      (s_ = new WeakMap()),
      (l_ = new WeakMap()),
      (u_ = new WeakSet()),
      (d_ = function () {
        let { roots: e } = this,
          t = [];
        for (let n of e) for (let e of G(this, s_)) t.push(Kg(this, u_, f_).call(this, n, e));
        return () => {
          for (let e of t) e();
        };
      }),
      (f_ = function (e, t) {
        let n = t_.get(e);
        n || ((n = new Map()), t_.set(e, n));
        let r = n.get(t);
        if (!r) {
          let i = Hp(e)
            ? Kg(this, u_, p_).call(this, e, n, t)
            : Kg(this, u_, m_).call(this, e, n, t);
          if (!i) return () => {};
          ((r = i), n.set(t, r));
        }
        r.refCount++;
        let i = !1;
        return () => {
          i || ((i = !0), r.refCount--, r.refCount === 0 && r.cleanup());
        };
      }),
      (p_ = function (e, t, n) {
        let r = e.createElement(`style`);
        ((r.textContent = n), e.head.prepend(r));
        let i = new MutationObserver((t) => {
          for (let n of t)
            for (let t of Array.from(n.removedNodes))
              if (t === r) {
                e.head.prepend(r);
                return;
              }
        });
        return (
          i.observe(e.head, { childList: !0 }),
          {
            refCount: 0,
            cleanup: () => {
              (i.disconnect(), r.remove(), t.delete(n), t.size === 0 && t_.delete(e));
            },
          }
        );
      }),
      (m_ = function (e, t, n) {
        `adoptedStyleSheets` in e && Array.isArray(e.adoptedStyleSheets);
        let { CSSStyleSheet: r } = e.ownerDocument.defaultView ?? {};
        if (!r) return null;
        let i = new r();
        return (
          i.replaceSync(n),
          e.adoptedStyleSheets.push(i),
          {
            refCount: 0,
            cleanup: () => {
              if (em(e) && e.host?.isConnected) {
                let t = e.adoptedStyleSheets.indexOf(i);
                t !== -1 && e.adoptedStyleSheets.splice(t, 1);
              }
              (t.delete(n), t.size === 0 && t_.delete(e));
            },
          }
        );
      }),
      Vg(c_, 4, `additionalRoots`, a_, h_, l_),
      Vg(c_, 2, `sourceRoot`, i_, h_),
      Vg(c_, 2, `targetRoot`, r_, h_),
      Vg(c_, 2, `roots`, n_, h_),
      zg(c_, h_),
      (g_ = `data-dnd-`),
      (__ = `${g_}dropping`),
      (v_ = `--dnd-`),
      (y_ = `${g_}dragging`),
      (b_ = `${g_}placeholder`),
      (x_ = [y_, b_, `popover`, `aria-pressed`, `aria-grabbing`]),
      (S_ = [`view-transition-name`]),
      (C_ = `
  :is(:root,:host) [${y_}] {
    position: fixed !important;
    pointer-events: none !important;
    touch-action: none;
    z-index: calc(infinity);
    will-change: translate;
    top: var(${v_}top, 0px) !important;
    left: var(${v_}left, 0px) !important;
    right: unset !important;
    bottom: unset !important;
    width: var(${v_}width, auto);
    max-width: var(${v_}width, auto);
    height: var(${v_}height, auto);
    max-height: var(${v_}height, auto);
    transition: var(${v_}transition) !important;
  }

  :is(:root,:host) [${b_}] {
    transition: none;
  }

  :is(:root,:host) [${b_}='hidden'] {
    visibility: hidden;
  }

  [${y_}] * {
    pointer-events: none !important;
  }

  [${y_}]:not([${__}]) {
    translate: var(${v_}translate) !important;
  }

  [${y_}][style*='${v_}scale'] {
    scale: var(${v_}scale) !important;
    transform-origin: var(${v_}transform-origin) !important;
  }

  @layer dnd-kit {
    :where([${y_}][popover]) {
      overflow: visible;
      background: unset;
      border: unset;
      margin: unset;
      padding: unset;
      color: inherit;

      &:is(input, button) {
        border: revert;
        background: revert;
      }
    }
  }
  [${y_}]::backdrop, [${g_}overlay]:not([${y_}]) {
    display: none;
    visibility: hidden;
  }
`
        .replace(/\n+/g, ` `)
        .replace(/\s+/g, ` `)
        .trim()),
      (w_ = 250),
      (T_ = `ease`),
      (N_ = class extends ((D_ = $d), (E_ = [B]), D_) {
        constructor(e, t) {
          (super(e, t),
            Wg(this, A_),
            Wg(this, k_, Bg(O_, 8, this)),
            Bg(O_, 11, this),
            (this.state = { initial: {}, current: {} }));
          let n = e.registry.plugins.get(h_),
            r = n?.register(C_);
          if (r) {
            let e = this.destroy.bind(this);
            this.destroy = () => {
              (r(), e());
            };
          }
          (this.registerEffect(Kg(this, A_, j_).bind(this, n)),
            this.registerEffect(Kg(this, A_, M_)));
        }
      }),
      (O_ = Fg(D_)),
      (k_ = new WeakMap()),
      (A_ = new WeakSet()),
      (j_ = function (e) {
        let { overlay: t } = this;
        if (!t || !e) return;
        let n = tm(t);
        if (n) return e.addRoot(n);
      }),
      (M_ = function () {
        let { state: e, manager: t, options: n } = this,
          { dragOperation: r } = t,
          { position: i, source: a, status: o } = r;
        if (o.idle) {
          ((e.current = {}), (e.initial = {}));
          return;
        }
        if (!a) return;
        let { element: s, feedback: c } = a;
        if (!s || c === `none` || !o.initialized || o.initializing) return;
        let { initial: l } = e,
          u = this.overlay ?? s,
          d = km(u),
          f = km(s),
          p = !ag(s, u),
          m = new Hh(s, { frameTransform: p ? f : null, ignoreTransforms: !p }),
          h = { x: f.scaleX / d.scaleX, y: f.scaleY / d.scaleY },
          { width: g, height: _, top: v, left: y } = m;
        p && ((g /= h.x), (_ /= h.y));
        let b = new Uh(u),
          {
            transition: x,
            translate: S,
            boxSizing: C,
            paddingBlockStart: w,
            paddingBlockEnd: T,
            paddingInlineStart: E,
            paddingInlineEnd: D,
            borderInlineStartWidth: ee,
            borderInlineEndWidth: te,
            borderBlockStartWidth: O,
            borderBlockEndWidth: k,
          } = Cm(s),
          A = c === `clone`,
          ne = C === `content-box`,
          j = ne ? parseInt(E) + parseInt(D) + parseInt(ee) + parseInt(te) : 0,
          re = ne ? parseInt(w) + parseInt(T) + parseInt(O) + parseInt(k) : 0,
          ie = c !== `move` && !this.overlay ? tg(a, A ? `clone` : `hidden`) : null,
          ae = R(() => qm(t.dragOperation.activatorEvent));
        if (S !== `none`) {
          let e = Mm(S);
          e && !l.translate && (l.translate = e);
        }
        if (!l.transformOrigin) {
          let e = R(() => i.current);
          l.transformOrigin = {
            x: (e.x - y * d.scaleX - d.x) / (g * d.scaleX),
            y: (e.y - v * d.scaleY - d.y) / (_ * d.scaleY),
          };
        }
        let { transformOrigin: oe } = l,
          se = v * d.scaleY + d.y,
          ce = y * d.scaleX + d.x;
        if (!l.coordinates && ((l.coordinates = { x: ce, y: se }), h.x !== 1 || h.y !== 1)) {
          let { scaleX: e, scaleY: t } = f,
            { x: n, y: r } = oe;
          ((l.coordinates.x += (g * e - g) * n), (l.coordinates.y += (_ * t - _) * r));
        }
        ((l.dimensions ||= { width: g, height: _ }), (l.frameTransform ||= d));
        let M = { x: l.coordinates.x - ce, y: l.coordinates.y - se },
          le = {
            width: (l.dimensions.width * l.frameTransform.scaleX - g * d.scaleX) * oe.x,
            height: (l.dimensions.height * l.frameTransform.scaleY - _ * d.scaleY) * oe.y,
          },
          N = { x: M.x / d.scaleX + le.width, y: M.y / d.scaleY + le.height },
          ue = { left: y + N.x, top: v + N.y };
        u.setAttribute(y_, `true`);
        let de = R(() => r.transform),
          P = l.translate ?? { x: 0, y: 0 },
          fe = de.x * d.scaleX + P.x,
          pe = de.y * d.scaleY + P.y,
          me = $p();
        (b.set(
          {
            width: g - j,
            height: _ - re,
            top: ue.top + me.y,
            left: ue.left + me.x,
            translate: `${fe}px ${pe}px 0`,
            transition: x ? `${x}, translate 0ms linear` : ``,
            scale: p ? `${h.x} ${h.y}` : ``,
            "transform-origin": `${oe.x * 100}% ${oe.y * 100}%`,
          },
          v_,
        ),
          ie &&
            (s.insertAdjacentElement(`afterend`, ie),
            n?.rootElement &&
              (typeof n.rootElement == `function` ? n.rootElement(a) : n.rootElement).appendChild(
                s,
              )),
          vm(u) &&
            (u.hasAttribute(`popover`) || u.setAttribute(`popover`, `manual`),
            ym(u),
            u.addEventListener(`beforetoggle`, og)));
        let he,
          ge,
          _e,
          ve = ug({
            placeholder: ie,
            element: s,
            feedbackElement: u,
            frameTransform: d,
            transformOrigin: oe,
            width: g,
            height: _,
            top: v,
            left: y,
            widthOffset: j,
            heightOffset: re,
            delta: N,
            styles: b,
            dragOperation: r,
            getElementMutationObserver: () => he,
            getSavedCellWidths: () => _e,
            setSavedCellWidths: (e) => {
              _e = e;
            },
          }),
          ye = new Hh(u);
        R(() => (r.shape = ye));
        let be = Vp(u),
          xe = (e) => {
            this.manager.actions.stop({ event: e });
          },
          Se = nm(be);
        (ae && be.addEventListener(`resize`, xe),
          R(() => a.status) === `idle` && requestAnimationFrame(() => (a.status = `dragging`)),
          ie && (ve.observe(ie), (he = cg(s, ie, A)), (ge = lg(s, ie, u))));
        let Ce = t.dragOperation.source?.id,
          we = () => {
            if (!ae || Ce == null) return;
            let e = t.registry.draggables.get(Ce),
              n = e?.handle ?? e?.element;
            Up(n) && n.focus();
          },
          Te = () => {
            if (
              (he?.disconnect(),
              ge?.disconnect(),
              ve.disconnect(),
              be.removeEventListener(`resize`, xe),
              vm(u) && (u.removeEventListener(`beforetoggle`, og), u.removeAttribute(`popover`)),
              u.removeAttribute(y_),
              b.reset(),
              _e && sg(s))
            ) {
              let e = Array.from(s.cells);
              for (let [t, n] of e.entries()) n.style.width = _e[t] ?? ``;
            }
            a.status = `idle`;
            let t = e.current.translate != null;
            (ie &&
              (t || ie.parentElement !== u.parentElement) &&
              u.isConnected &&
              ie.replaceWith(u),
              ie?.remove());
          },
          Ee = n?.dropAnimation,
          De = this,
          Oe = Fl(
            () => {
              let { transform: t, status: n } = r;
              if (!(!t.x && !t.y && !e.current.translate) && n.dragging) {
                let n = l.translate ?? { x: 0, y: 0 },
                  i = { x: t.x / d.scaleX + n.x, y: t.y / d.scaleY + n.y },
                  a = e.current.translate,
                  o = R(() => r.modifiers),
                  s = R(() => r.shape?.current),
                  c = ae && !Se ? `250ms cubic-bezier(0.25, 1, 0.5, 1)` : `0ms linear`;
                if (
                  (b.set(
                    { transition: `${x}, translate ${c}`, translate: `${i.x}px ${i.y}px 0` },
                    v_,
                  ),
                  he?.takeRecords(),
                  s && s !== ye && a && !o.length)
                ) {
                  let e = sd.delta(i, a);
                  r.shape = cd.from(s.boundingRectangle).translate(e.x * d.scaleX, e.y * d.scaleY);
                } else r.shape = new Hh(u);
                e.current.translate = i;
              }
            },
            function () {
              if (r.status.dropped) {
                (this.dispose(), (a.status = `dropping`));
                let n = De.dropAnimation === void 0 ? Ee : De.dropAnimation,
                  r = e.current.translate,
                  i = r != null;
                if ((!r && s !== u && (r = { x: 0, y: 0 }), !r || n === null)) {
                  Te();
                  return;
                }
                t.renderer.rendering.then(() => {
                  dg({
                    element: s,
                    feedbackElement: u,
                    placeholder: ie,
                    translate: r,
                    moved: i,
                    transition: x,
                    alignment: a.alignment,
                    styles: b,
                    animation: n ?? void 0,
                    getElementMutationObserver: () => he,
                    cleanup: Te,
                    restoreFocus: we,
                  });
                });
              }
            },
          );
        return () => {
          (Te(), Oe());
        };
      }),
      Vg(O_, 4, `overlay`, E_, N_, k_),
      zg(O_, N_),
      (N_.configure = yd(N_)),
      (P_ = N_),
      (F_ = !0),
      (I_ = !1),
      (B_ = ((z_ = [B]), Ih.Forward)),
      (R_ = ((L_ = [B]), Ih.Reverse)),
      (W_ = class {
        constructor() {
          (Wg(this, H_, Bg(V_, 8, this, F_)),
            Bg(V_, 11, this),
            Wg(this, U_, Bg(V_, 12, this, F_)),
            Bg(V_, 15, this));
        }
        isLocked(e) {
          return e === Ih.Idle
            ? !1
            : e == null
              ? this[Ih.Forward] === F_ && this[Ih.Reverse] === F_
              : this[e] === F_;
        }
        unlock(e) {
          e !== Ih.Idle && (this[e] = I_);
        }
      }),
      (V_ = Fg(null)),
      (H_ = new WeakMap()),
      (U_ = new WeakMap()),
      Vg(V_, 4, B_, z_, W_, H_),
      Vg(V_, 4, R_, L_, W_, U_),
      zg(V_, W_),
      (G_ = [Ih.Forward, Ih.Reverse]),
      (K_ = class {
        constructor() {
          ((this.x = new W_()), (this.y = new W_()));
        }
        isLocked() {
          return this.x.isLocked() && this.y.isLocked();
        }
      }),
      (q_ = class extends $d {
        constructor(e) {
          super(e);
          let t = ul(new K_()),
            n = null;
          ((this.signal = t),
            bl(() => {
              let { status: r } = e.dragOperation;
              if (!r.initialized) {
                ((n = null), (t.value = new K_()));
                return;
              }
              let { delta: i } = e.dragOperation.position;
              if (n) {
                let e = { x: fg(i.x, n.x), y: fg(i.y, n.y) },
                  r = t.peek();
                sl(() => {
                  for (let t of gd) for (let n of G_) e[t] === n && r[t].unlock(n);
                  t.value = r;
                });
              }
              n = i;
            }));
        }
        get current() {
          return this.signal.peek();
        }
      }),
      (ev = class extends ((Y_ = ef), (J_ = [B]), Y_) {
        constructor(e) {
          (super(e),
            Wg(this, Z_, Bg(X_, 8, this, !1)),
            Bg(X_, 11, this),
            Wg(this, Q_),
            Wg(this, $_, () => {
              if (!G(this, Q_)) return;
              let { element: e, by: t } = G(this, Q_);
              (t.y && (e.scrollTop += t.y), t.x && (e.scrollLeft += t.x));
            }),
            (this.scroll = (e) => {
              if (this.disabled) return !1;
              let t = this.getScrollableElements();
              if (!t) return (Gg(this, Q_, void 0), !1);
              let { position: n } = this.manager.dragOperation,
                r = n?.current;
              if (r) {
                let { by: n } = e ?? {},
                  i = n ? { x: pg(n.x), y: pg(n.y) } : void 0,
                  a = i ? void 0 : this.scrollIntentTracker.current;
                if (a?.isLocked()) return !1;
                for (let e of t) {
                  let t = Sm(e, n);
                  if (t.x || t.y) {
                    let { speed: t, direction: o } = Fm(e, r, i);
                    if (a) for (let e of gd) a[e].isLocked(o[e]) && ((t[e] = 0), (o[e] = 0));
                    if (o.x || o.y) {
                      let { x: r, y: i } = n ?? o,
                        a = r * t.x,
                        s = i * t.y;
                      if (a || s) {
                        let t = G(this, Q_)?.by;
                        if (this.autoScrolling && t && ((t.x && !a) || (t.y && !s))) continue;
                        return (
                          Gg(this, Q_, { element: e, by: { x: a, y: s } }),
                          jh.schedule(G(this, $_)),
                          !0
                        );
                      }
                    }
                  }
                }
              }
              return (Gg(this, Q_, void 0), !1);
            }));
          let t = null,
            n = null,
            r = jl(() => {
              let { position: n, source: r } = e.dragOperation;
              if (!n) return null;
              let i = om(tm(r?.element), n.current);
              return (i && (t = i), i ?? t);
            }),
            i = jl(() => {
              let t = r.value,
                { documentElement: i } = Gp(t);
              if (!t || t === i) {
                let { target: t } = e.dragOperation,
                  r = t?.element;
                if (r) {
                  let e = Dm(r, { excludeElement: !1 });
                  return ((n = e), e);
                }
              }
              if (t) {
                let e = Dm(t, { excludeElement: !1 });
                return this.autoScrolling && n && e.size < n?.size ? n : ((n = e), e);
              }
              return ((n = null), null);
            }, Ml);
          ((this.getScrollableElements = () => i.value),
            (this.scrollIntentTracker = new q_(e)),
            (this.destroy = e.monitor.addEventListener(`dragmove`, (t) => {
              this.disabled ||
                t.defaultPrevented ||
                !qm(e.dragOperation.activatorEvent) ||
                !t.by ||
                (this.scroll({ by: t.by }) && t.preventDefault());
            })));
        }
      }),
      (X_ = Fg(Y_)),
      (Z_ = new WeakMap()),
      (Q_ = new WeakMap()),
      ($_ = new WeakMap()),
      Vg(X_, 4, `autoScrolling`, J_, ev, Z_),
      zg(X_, ev),
      (tv = class {
        constructor(e) {
          ((this.scheduler = e),
            (this.pending = !1),
            (this.tasks = new Set()),
            (this.resolvers = new Set()),
            (this.flush = () => {
              let { tasks: e, resolvers: t } = this;
              ((this.pending = !1), (this.tasks = new Set()), (this.resolvers = new Set()));
              for (let t of e) t();
              for (let e of t) e();
            }));
        }
        schedule(e) {
          return (
            this.tasks.add(e),
            this.pending || ((this.pending = !0), this.scheduler(this.flush)),
            new Promise((e) => this.resolvers.add(e))
          );
        }
      }),
      (nv = new tv((e) => {
        typeof requestAnimationFrame == `function` ? requestAnimationFrame(e) : e();
      })),
      (rv = 10),
      (iv = class extends $d {
        constructor(e, t) {
          super(e);
          let n = e.registry.plugins.get(ev);
          if (!n) throw Error(`AutoScroller plugin depends on Scroller plugin`);
          this.destroy = bl(() => {
            if (this.disabled) return;
            let { position: t, status: r } = e.dragOperation;
            if (r.dragging)
              if (n.scroll()) {
                n.autoScrolling = !0;
                let e = setInterval(() => nv.schedule(n.scroll), rv);
                return () => {
                  clearInterval(e);
                };
              } else n.autoScrolling = !1;
          });
        }
      }),
      (av = { capture: !0, passive: !0 }),
      (sv = class extends ef {
        constructor(e) {
          (super(e),
            Wg(this, ov),
            (this.handleScroll = () => {
              G(this, ov) ??
                Gg(
                  this,
                  ov,
                  setTimeout(() => {
                    (this.manager.collisionObserver.forceUpdate(!1), Gg(this, ov, void 0));
                  }, 50),
                );
            }));
          let { dragOperation: t } = this.manager;
          this.destroy = bl(() => {
            if (t.status.dragging) {
              let e = t.source?.element?.ownerDocument ?? document;
              return (
                e.addEventListener(`scroll`, this.handleScroll, av),
                () => {
                  e.removeEventListener(`scroll`, this.handleScroll, av);
                }
              );
            }
          });
        }
      }),
      (ov = new WeakMap()),
      (cv = class extends $d {
        constructor(e, t) {
          (super(e, t),
            (this.manager = e),
            (this.destroy = bl(() => {
              let { dragOperation: e } = this.manager,
                { nonce: t } = this.options ?? {};
              if (e.status.initialized) {
                let e = document.createElement(`style`);
                return (
                  t && e.setAttribute(`nonce`, t),
                  (e.textContent = `* { user-select: none !important; -webkit-user-select: none !important; }`),
                  document.head.appendChild(e),
                  mg(),
                  document.addEventListener(`selectionchange`, mg, { capture: !0 }),
                  () => {
                    (document.removeEventListener(`selectionchange`, mg, { capture: !0 }),
                      e.remove());
                  }
                );
              }
            })));
        }
      }),
      (lv = Object.freeze({
        offset: 10,
        keyboardCodes: {
          start: [`Space`, `Enter`],
          cancel: [`Escape`],
          end: [`Space`, `Enter`, `Tab`],
          up: [`ArrowUp`],
          down: [`ArrowDown`],
          left: [`ArrowLeft`],
          right: [`ArrowRight`],
        },
        preventActivation(e, t) {
          let n = t.handle ?? t.element;
          return e.target !== n;
        },
      })),
      (dv = class extends sp {
        constructor(e, t) {
          (super(e),
            (this.manager = e),
            (this.options = t),
            Wg(this, uv, []),
            (this.listeners = new ah()),
            (this.handleSourceKeyDown = (e, t, n) => {
              if (this.disabled || e.defaultPrevented || !Km(e.target) || t.disabled) return;
              let {
                keyboardCodes: r = lv.keyboardCodes,
                preventActivation: i = lv.preventActivation,
              } = n ?? {};
              r.start.includes(e.code) &&
                this.manager.dragOperation.status.idle &&
                (i?.(e, t) || this.handleStart(e, t, n));
            }));
        }
        bind(e, t = this.options) {
          return bl(() => {
            let n = e.handle ?? e.element,
              r = (n) => {
                qm(n) && this.handleSourceKeyDown(n, e, t);
              };
            if (n)
              return (
                n.addEventListener(`keydown`, r),
                () => {
                  n.removeEventListener(`keydown`, r);
                }
              );
          });
        }
        handleStart(e, t, n) {
          let { element: r } = t;
          if (!r) throw Error(`Source draggable does not have an associated element`);
          (e.preventDefault(), e.stopImmediatePropagation(), Lm(r));
          let { center: i } = new Hh(r);
          if (
            this.manager.actions.start({ event: e, coordinates: { x: i.x, y: i.y }, source: t })
              .signal.aborted
          )
            return this.cleanup();
          this.sideEffects();
          let a = Gp(r),
            o = [
              this.listeners.bind(a, [
                {
                  type: `keydown`,
                  listener: (e) => this.handleKeyDown(e, t, n),
                  options: { capture: !0 },
                },
              ]),
            ];
          G(this, uv).push(...o);
        }
        handleKeyDown(e, t, n) {
          let { keyboardCodes: r = lv.keyboardCodes } = n ?? {};
          if (hg(e, [...r.end, ...r.cancel])) {
            e.preventDefault();
            let t = hg(e, r.cancel);
            this.handleEnd(e, t);
            return;
          }
          (hg(e, r.up) ? this.handleMove(`up`, e) : hg(e, r.down) && this.handleMove(`down`, e),
            hg(e, r.left)
              ? this.handleMove(`left`, e)
              : hg(e, r.right) && this.handleMove(`right`, e));
        }
        handleEnd(e, t) {
          (this.manager.actions.stop({ event: e, canceled: t }), this.cleanup());
        }
        handleMove(e, t) {
          let { shape: n } = this.manager.dragOperation,
            r = t.shiftKey ? 5 : 1,
            i = { x: 0, y: 0 },
            a = this.options?.offset ?? lv.offset;
          if ((typeof a == `number` && (a = { x: a, y: a }), n)) {
            switch (e) {
              case `up`:
                i = { x: 0, y: -a.y * r };
                break;
              case `down`:
                i = { x: 0, y: a.y * r };
                break;
              case `left`:
                i = { x: -a.x * r, y: 0 };
                break;
              case `right`:
                i = { x: a.x * r, y: 0 };
                break;
            }
            (i.x || i.y) && (t.preventDefault(), this.manager.actions.move({ event: t, by: i }));
          }
        }
        sideEffects() {
          let e = this.manager.registry.plugins.get(iv);
          e?.disabled === !1 &&
            (e.disable(),
            G(this, uv).push(() => {
              e.enable();
            }));
        }
        cleanup() {
          (G(this, uv).forEach((e) => e()), Gg(this, uv, []));
        }
        destroy() {
          (this.cleanup(), this.listeners.clear());
        }
      }),
      (uv = new WeakMap()),
      (dv.configure = yd(dv)),
      (dv.defaults = lv),
      (fv = dv),
      (mv = class extends up {
        constructor() {
          (super(...arguments), Wg(this, pv));
        }
        onEvent(e) {
          switch (e.type) {
            case `pointerdown`:
              Gg(this, pv, Xp(e));
              break;
            case `pointermove`:
              if (!G(this, pv)) return;
              let { x: t, y: n } = Xp(e),
                r = { x: t - G(this, pv).x, y: n - G(this, pv).y },
                { tolerance: i } = this.options;
              if (i && Fu(r, i)) {
                this.abort();
                return;
              }
              Fu(r, this.options.value) && this.activate(e);
              break;
            case `pointerup`:
              this.abort();
              break;
          }
        }
        abort() {
          Gg(this, pv, void 0);
        }
      }),
      (pv = new WeakMap()),
      (_v = class extends up {
        constructor() {
          (super(...arguments), Wg(this, hv), Wg(this, gv));
        }
        onEvent(e) {
          switch (e.type) {
            case `pointerdown`:
              (Gg(this, gv, Xp(e)),
                Gg(
                  this,
                  hv,
                  setTimeout(() => this.activate(e), this.options.value),
                ));
              break;
            case `pointermove`:
              if (!G(this, gv)) return;
              let { x: t, y: n } = Xp(e);
              Fu({ x: t - G(this, gv).x, y: n - G(this, gv).y }, this.options.tolerance) &&
                this.abort();
              break;
            case `pointerup`:
              this.abort();
              break;
          }
        }
        abort() {
          G(this, hv) && (clearTimeout(G(this, hv)), Gg(this, gv, void 0), Gg(this, hv, void 0));
        }
      }),
      (hv = new WeakMap()),
      (gv = new WeakMap()),
      (vv = class {}),
      (vv.Delay = _v),
      (vv.Distance = mv),
      (yv = Object.freeze({
        activationConstraints(e, t) {
          let { pointerType: n, target: r } = e;
          if (!(n === `mouse` && Km(r) && (t.handle === r || t.handle?.contains(r))))
            return n === `touch`
              ? [new vv.Delay({ value: 250, tolerance: 5 })]
              : Ym(r) && !e.defaultPrevented
                ? [new vv.Delay({ value: 200, tolerance: 0 })]
                : [new vv.Delay({ value: 200, tolerance: 10 }), new vv.Distance({ value: 5 })];
        },
        preventActivation(e, t) {
          let { target: n } = e;
          return n === t.element || n === t.handle || !Km(n) || t.handle?.contains(n) ? !1 : cm(n);
        },
      })),
      (xv = class extends sp {
        constructor(e, t) {
          (super(e),
            (this.manager = e),
            (this.options = t),
            Wg(this, bv, new Set()),
            (this.listeners = new ah()),
            (this.latest = { event: void 0, coordinates: void 0 }),
            (this.handleMove = () => {
              let { event: e, coordinates: t } = this.latest;
              !e || !t || this.manager.actions.move({ event: e, to: t });
            }),
            (this.handleCancel = this.handleCancel.bind(this)),
            (this.handlePointerUp = this.handlePointerUp.bind(this)),
            (this.handleKeyDown = this.handleKeyDown.bind(this)));
        }
        activationConstraints(e, t, n = this.options) {
          let { activationConstraints: r = yv.activationConstraints } = n ?? {};
          return typeof r == `function` ? r(e, t) : r;
        }
        bind(e, t = this.options) {
          return bl(() => {
            let n = new AbortController(),
              { signal: r } = n,
              i = (n) => {
                Jm(n) && this.handlePointerDown(n, e, t);
              },
              a = [e.handle ?? e.element];
            t?.activatorElements &&
              (a = Array.isArray(t.activatorElements)
                ? t.activatorElements
                : t.activatorElements(e));
            for (let e of a)
              e &&
                (yg(e.ownerDocument.defaultView),
                e.addEventListener(`pointerdown`, i, { signal: r }));
            return () => n.abort();
          });
        }
        handlePointerDown(e, t, n) {
          if (
            this.disabled ||
            !e.isPrimary ||
            e.button !== 0 ||
            !Km(e.target) ||
            t.disabled ||
            gg(e) ||
            !this.manager.dragOperation.status.idle
          )
            return;
          let { preventActivation: r = yv.preventActivation } = n ?? {};
          if (r?.(e, t)) return;
          let { target: i } = e,
            a = Up(i) && i.draggable && i.getAttribute(`draggable`) === `true`,
            o = km(t.element),
            { x: s, y: c } = Xp(e);
          this.initialCoordinates = { x: s * o.scaleX + o.x, y: c * o.scaleY + o.y };
          let l = this.activationConstraints(e, t, n);
          e.sensor = this;
          let u = new cp(l, (e) => this.handleStart(t, e));
          ((u.signal.onabort = () => this.handleCancel(e)), u.onEvent(e), (this.controller = u));
          let d = Zp(),
            f = this.listeners.bind(d, [
              { type: `pointermove`, listener: (e) => this.handlePointerMove(e, t) },
              { type: `pointerup`, listener: this.handlePointerUp, options: { capture: !0 } },
              { type: `pointercancel`, listener: this.handleCancel },
              { type: `dragstart`, listener: a ? this.handleCancel : _g, options: { capture: !0 } },
            ]);
          G(this, bv).add(() => {
            (f(), (this.initialCoordinates = void 0));
          });
        }
        handlePointerMove(e, t) {
          var n;
          if (this.controller?.activated === !1) {
            (n = this.controller) == null || n.onEvent(e);
            return;
          }
          if (this.manager.dragOperation.status.dragging) {
            let n = Xp(e),
              r = km(t.element);
            ((n.x = n.x * r.scaleX + r.x),
              (n.y = n.y * r.scaleY + r.y),
              e.preventDefault(),
              e.stopPropagation(),
              (this.latest.event = e),
              (this.latest.coordinates = n),
              jh.schedule(this.handleMove));
          }
        }
        handlePointerUp(e) {
          let { status: t } = this.manager.dragOperation;
          if (!t.idle) {
            (e.preventDefault(), e.stopPropagation());
            let n = !t.initialized;
            this.manager.actions.stop({ event: e, canceled: n });
          }
          this.cleanup();
        }
        handleKeyDown(e) {
          e.key === `Escape` && (e.preventDefault(), this.handleCancel(e));
        }
        handleStart(e, t) {
          let { manager: n, initialCoordinates: r } = this;
          if (!r || !n.dragOperation.status.idle || t.defaultPrevented) return;
          if (n.actions.start({ coordinates: r, event: t, source: e }).signal.aborted)
            return this.cleanup();
          t.preventDefault();
          let i = Gp(t.target).body;
          i.setPointerCapture(t.pointerId);
          let a = Km(t.target) ? [t.target, i] : i,
            o = this.listeners.bind(a, [
              { type: `touchmove`, listener: _g, options: { passive: !1 } },
              { type: `click`, listener: _g },
              { type: `contextmenu`, listener: _g },
              { type: `keydown`, listener: this.handleKeyDown },
            ]);
          G(this, bv).add(o);
        }
        handleCancel(e) {
          let { dragOperation: t } = this.manager;
          (t.status.initialized && this.manager.actions.stop({ event: e, canceled: !0 }),
            this.cleanup());
        }
        cleanup() {
          ((this.latest = { event: void 0, coordinates: void 0 }),
            G(this, bv).forEach((e) => e()),
            G(this, bv).clear());
        }
        destroy() {
          (this.cleanup(), this.listeners.clear());
        }
      }),
      (bv = new WeakMap()),
      (xv.configure = yd(xv)),
      (xv.defaults = yv),
      (Sv = xv),
      (Cv = new WeakSet()),
      (wv = { modifiers: [], plugins: [$g, iv, e_, P_, cv], sensors: [Sv, fv] }),
      (Tv = class extends Pp {
        constructor(e = {}) {
          let t = Cd(e.plugins, wv.plugins),
            n = Cd(e.sensors, wv.sensors),
            r = Cd(e.modifiers, wv.modifiers);
          super(Mg(jg({}, e), { plugins: [sv, ev, h_, ...t], sensors: n, modifiers: r }));
        }
      }),
      (Pv = class extends ((kv = Kf), (Ov = [B]), (Dv = [B]), (Ev = [B]), kv) {
        constructor(e, t) {
          var n = e,
            { element: r, effects: i = () => [], handle: a, feedback: o = `default` } = n,
            s = Pg(n, [`element`, `effects`, `handle`, `feedback`]);
          (super(
            jg(
              {
                effects: () => [
                  ...i(),
                  () => {
                    let { manager: e } = this;
                    if (!e) return;
                    let t = (this.sensors?.map(bd) ?? [...e.sensors]).map((t) => {
                      let n = t instanceof sp ? t : e.registry.register(t.plugin),
                        r = t instanceof sp ? void 0 : t.options;
                      return n.bind(this, r);
                    });
                    return function () {
                      t.forEach((e) => e());
                    };
                  },
                ],
              },
              s,
            ),
            t,
          ),
            Wg(this, jv, Bg(Av, 8, this)),
            Bg(Av, 11, this),
            Wg(this, Mv, Bg(Av, 12, this)),
            Bg(Av, 15, this),
            Wg(this, Nv, Bg(Av, 16, this)),
            Bg(Av, 19, this),
            (this.element = r),
            (this.handle = a),
            (this.feedback = o));
        }
      }),
      (Av = Fg(kv)),
      (jv = new WeakMap()),
      (Mv = new WeakMap()),
      (Nv = new WeakMap()),
      Vg(Av, 4, `handle`, Ov, Pv, jv),
      Vg(Av, 4, `element`, Dv, Pv, Mv),
      Vg(Av, 4, `feedback`, Ev, Pv, Nv),
      zg(Av, Pv),
      (Gv = class extends ((Lv = op), (Iv = [B]), (Fv = [B]), Lv) {
        constructor(e, t) {
          var n = e,
            { element: r, effects: i = () => [] } = n,
            a = Pg(n, [`element`, `effects`]);
          let { collisionDetector: o = Jh } = a,
            s = (e) => {
              let { manager: t, element: n } = this;
              if (!n || e === null) {
                this.shape = void 0;
                return;
              }
              if (!t) return;
              let r = new Hh(n),
                i = R(() => this.shape);
              return r && i?.equals(r) ? i : ((this.shape = r), r);
            },
            c = ul(!1);
          (super(
            Mg(jg({}, a), {
              collisionDetector: o,
              effects: () => [
                ...i(),
                () => {
                  let { element: e, manager: t } = this;
                  if (!t) return;
                  let { dragOperation: n } = t,
                    { source: r } = n;
                  c.value = !!(r && n.status.initialized && e && !this.disabled && this.accepts(r));
                },
                () => {
                  let { element: e } = this;
                  if (c.value && e) {
                    let t = new kh(e, s);
                    return () => {
                      (t.disconnect(), (this.shape = void 0));
                    };
                  }
                },
                () => {
                  if (this.manager?.dragOperation.status.initialized)
                    return () => {
                      this.shape = void 0;
                    };
                },
              ],
            }),
            t,
          ),
            Wg(this, Uv),
            Wg(this, zv, Bg(Rv, 8, this)),
            Bg(Rv, 11, this),
            Wg(this, Wv, Bg(Rv, 12, this)),
            Bg(Rv, 15, this),
            (this.element = r),
            (this.refreshShape = () => s()));
        }
        set element(e) {
          Gg(this, Uv, e, Hv);
        }
        get element() {
          return this.proxy ?? G(this, Uv, Vv);
        }
      }),
      (Rv = Fg(Lv)),
      (zv = new WeakMap()),
      (Uv = new WeakSet()),
      (Wv = new WeakMap()),
      (Bv = Vg(Rv, 20, `#element`, Iv, Uv, zv)),
      (Vv = Bv.get),
      (Hv = Bv.set),
      Vg(Rv, 4, `proxy`, Fv, Gv, Wv),
      zg(Rv, Gv));
  });
function qv(e, t, n) {
  if (t === n) return e;
  let r = e.slice();
  return (r.splice(n, 0, r.splice(t, 1)[0]), r);
}
function Jv(e) {
  return (
    `initialIndex` in e &&
    typeof e.initialIndex == `number` &&
    `index` in e &&
    typeof e.index == `number`
  );
}
function Yv(e, t, n) {
  let { source: r, target: i, canceled: a } = t.operation;
  if (!r || !i || a) return (`preventDefault` in t && t.preventDefault(), e);
  let o = (e, t) => e === t || (typeof e == `object` && `id` in e && e.id === t);
  if (Array.isArray(e)) {
    let s = e.findIndex((e) => o(e, r.id)),
      c = e.findIndex((e) => o(e, i.id));
    if (s === -1 || c === -1) {
      if (Jv(r)) {
        let i = r.initialIndex,
          a = r.index;
        return i === a || i < 0 || i >= e.length
          ? (`preventDefault` in t && t.preventDefault(), e)
          : n(e, i, a);
      }
      return e;
    }
    if (!a && `index` in r && typeof r.index == `number`) {
      let t = r.index;
      if (t !== s) return n(e, s, t);
    }
    return n(e, s, c);
  }
  let s = Object.entries(e),
    c = -1,
    l,
    u = -1,
    d;
  for (let [e, t] of s)
    if (
      (c === -1 && ((c = t.findIndex((e) => o(e, r.id))), c !== -1 && (l = e)),
      u === -1 && ((u = t.findIndex((e) => o(e, i.id))), u !== -1 && (d = e)),
      c !== -1 && u !== -1)
    )
      break;
  if (c === -1 && Jv(r)) {
    let i = r.initialGroup,
      a = r.initialIndex,
      o = r.group,
      s = r.index;
    if (i == null || o == null || !(i in e) || !(o in e) || (i === o && a === s))
      return (`preventDefault` in t && t.preventDefault(), e);
    if (i === o) return ay(iy({}, e), { [i]: n(e[i], a, s) });
    let c = e[i][a];
    return ay(iy({}, e), {
      [i]: [...e[i].slice(0, a), ...e[i].slice(a + 1)],
      [o]: [...e[o].slice(0, s), c, ...e[o].slice(s)],
    });
  }
  if (!r.manager) return e;
  let { dragOperation: f } = r.manager,
    p = f.shape?.current.center ?? f.position.current;
  if (d == null && i.id in e) {
    let t = i.shape && p.y > i.shape.center.y ? e[i.id].length : 0;
    ((d = i.id), (u = t));
  }
  if (l == null || d == null || (l === d && c === u)) {
    if (l != null && l === d && c === u && Jv(r)) {
      let t = r.group != null && r.group !== l,
        i = r.index !== c;
      if (t || i) {
        let t = r.group ?? l;
        if (t in e) {
          if (l === t) return ay(iy({}, e), { [l]: n(e[l], c, r.index) });
          let i = e[l][c];
          return ay(iy({}, e), {
            [l]: [...e[l].slice(0, c), ...e[l].slice(c + 1)],
            [t]: [...e[t].slice(0, r.index), i, ...e[t].slice(r.index)],
          });
        }
      }
    }
    return (`preventDefault` in t && t.preventDefault(), e);
  }
  if (l === d) return ay(iy({}, e), { [l]: n(e[l], c, u) });
  let m = i.shape && Math.round(p.y) > Math.round(i.shape.center.y) ? 1 : 0,
    h = e[l][c];
  return ay(iy({}, e), {
    [l]: [...e[l].slice(0, c), ...e[l].slice(c + 1)],
    [d]: [...e[d].slice(0, u + m), h, ...e[d].slice(u + m)],
  });
}
function Xv(e, t) {
  return Yv(e, t, qv);
}
var Zv,
  Qv,
  $v,
  ey,
  ty,
  ny,
  ry,
  iy,
  ay,
  oy = t(() => {
    ((Zv = Object.defineProperty),
      (Qv = Object.defineProperties),
      ($v = Object.getOwnPropertyDescriptors),
      (ey = Object.getOwnPropertySymbols),
      (ty = Object.prototype.hasOwnProperty),
      (ny = Object.prototype.propertyIsEnumerable),
      (ry = (e, t, n) =>
        t in e
          ? Zv(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (iy = (e, t) => {
        for (var n in (t ||= {})) ty.call(t, n) && ry(e, n, t[n]);
        if (ey) for (var n of ey(t)) ny.call(t, n) && ry(e, n, t[n]);
        return e;
      }),
      (ay = (e, t) => Qv(e, $v(t))));
  });
function sy(e) {
  return typeof e == `object` && !!e && `current` in e;
}
function cy(e) {
  if (e != null) return sy(e) ? (e.current ?? void 0) : e;
}
var ly = t(() => {});
function uy() {
  let e = (0, gy.useState)(0)[1];
  return (0, gy.useCallback)(() => {
    e((e) => e + 1);
  }, [e]);
}
function dy(e, t) {
  let n = (0, gy.useRef)(new Map()),
    r = uy();
  return (
    vy(() => {
      if (!e) {
        n.current.clear();
        return;
      }
      return bl(() => {
        let i = !1,
          a = !1;
        for (let r of n.current) {
          let [o] = r,
            s = R(() => r[1]),
            c = e[o];
          s !== c && ((i = !0), n.current.set(o, c), (a = t?.(o, s, c) ?? !1));
        }
        i && (a ? (0, _y.flushSync)(r) : r());
      });
    }, [e]),
    (0, gy.useMemo)(
      () =>
        e &&
        new Proxy(e, {
          get(e, t) {
            let r = e[t];
            return (n.current.set(t, r), r);
          },
        }),
      [e],
    )
  );
}
function fy(e, t) {
  e();
}
function py(e) {
  let t = (0, gy.useRef)(e);
  return (
    vy(() => {
      t.current = e;
    }, [e]),
    t
  );
}
function my(e, t, n = gy.useEffect, r = Object.is) {
  let i = (0, gy.useRef)(e);
  n(() => {
    let n = i.current;
    r(e, n) || ((i.current = e), t(e, n));
  }, [t, e]);
}
function hy(e, t) {
  let n = (0, gy.useRef)(cy(e));
  vy(() => {
    let r = cy(e);
    r !== n.current && ((n.current = r), t(r));
  });
}
var gy,
  _y,
  vy,
  yy = t(() => {
    ((gy = e(r(), 1)),
      Nu(),
      (_y = e(a(), 1)),
      ly(),
      (vy =
        typeof window < `u` &&
        window.document !== void 0 &&
        window.document.createElement !== void 0
          ? gy.useLayoutEffect
          : gy.useEffect));
  });
function by(e) {
  var t = e,
    {
      children: n,
      onCollision: r,
      onBeforeDragStart: i,
      onDragStart: a,
      onDragMove: o,
      onDragOver: s,
      onDragEnd: c,
    } = t,
    l = ky(t, [
      `children`,
      `onCollision`,
      `onBeforeDragStart`,
      `onDragStart`,
      `onDragMove`,
      `onDragOver`,
      `onDragEnd`,
    ]);
  let u = (0, wy.useRef)(null),
    { plugins: d, modifiers: f, sensors: p } = l,
    m = Cd(d, wv.plugins),
    h = Cd(p, wv.sensors),
    g = Cd(f, wv.modifiers),
    _ = py(i),
    v = py(a),
    y = py(s),
    b = py(o),
    x = py(c),
    S = py(r),
    C = xy(() => l.manager ?? new Tv(l));
  return (
    (0, wy.useEffect)(() => {
      if (!u.current) throw Error(`Renderer not found`);
      let { renderer: e, trackRendering: t } = u.current,
        { monitor: n } = C;
      C.renderer = e;
      let r = [
        n.addEventListener(`beforedragstart`, (e) => {
          let n = _.current;
          n && t(() => n(e, C));
        }),
        n.addEventListener(`dragstart`, (e) => v.current?.call(v, e, C)),
        n.addEventListener(`dragover`, (e) => {
          let n = y.current;
          n && t(() => n(e, C));
        }),
        n.addEventListener(`dragmove`, (e) => {
          let n = b.current;
          n && t(() => n(e, C));
        }),
        n.addEventListener(`dragend`, (e) => {
          let n = x.current;
          n && t(() => n(e, C));
        }),
        n.addEventListener(`collision`, (e) => S.current?.call(S, e, C)),
      ];
      return () => r.forEach((e) => e());
    }, [C]),
    my(m, () => C && (C.plugins = m), ...My),
    my(h, () => C && (C.sensors = h), ...My),
    my(g, () => C && (C.modifiers = g), ...My),
    (0, Ty.jsxs)(Ay.Provider, { value: C, children: [(0, Ty.jsx)(jy, { ref: u, children: n }), n] })
  );
}
function xy(e) {
  let t = (0, wy.useRef)(null);
  return (
    (t.current ||= e()), (0, wy.useInsertionEffect)(() => () => t.current?.destroy(), []), t.current
  );
}
function Sy() {
  return (0, wy.useContext)(Ay);
}
function Cy(e) {
  let t = Sy() ?? void 0,
    [n] = (0, wy.useState)(() => e(t));
  return (n.manager !== t && (n.manager = t), vy(n.register, [t, n]), n);
}
var wy,
  Ty,
  Ey,
  Dy,
  Oy,
  ky,
  Ay,
  jy,
  My,
  Ny,
  Py,
  Fy,
  Iy,
  Ly,
  Ry,
  zy,
  By,
  Vy,
  Hy,
  Uy,
  Wy,
  Gy,
  Ky,
  qy,
  Jy,
  Yy,
  Xy,
  Zy,
  Qy,
  $y,
  eb,
  tb,
  nb,
  rb,
  ib = t(() => {
    ((wy = e(r(), 1)),
      Kv(),
      yy(),
      Nu(),
      (Ty = i()),
      (Ey = Object.getOwnPropertySymbols),
      (Dy = Object.prototype.hasOwnProperty),
      (Oy = Object.prototype.propertyIsEnumerable),
      (ky = (e, t) => {
        var n = {};
        for (var r in e) Dy.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && Ey)
          for (var r of Ey(e)) t.indexOf(r) < 0 && Oy.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (Ay = (0, wy.createContext)(new Tv())),
      (jy = (0, wy.memo)(
        (0, wy.forwardRef)(({ children: e }, t) => {
          let [n, r] = (0, wy.useState)(0),
            i = (0, wy.useRef)(null),
            a = (0, wy.useRef)(null),
            o = (0, wy.useMemo)(
              () => ({
                renderer: {
                  get rendering() {
                    return i.current ?? Promise.resolve();
                  },
                },
                trackRendering(e) {
                  ((i.current ||= new Promise((e) => {
                    a.current = e;
                  })),
                    (0, wy.startTransition)(() => {
                      (e(), r((e) => e + 1));
                    }));
                },
              }),
              [],
            );
          return (
            vy(() => {
              var e;
              ((e = a.current) == null || e.call(a), (i.current = null));
            }, [e, n]),
            (0, wy.useImperativeHandle)(t, () => o),
            null
          );
        }),
      )),
      (My = [void 0, Ml]),
      (Ny = Object.create),
      (Py = Object.defineProperty),
      (Fy = Object.getOwnPropertyDescriptor),
      (Iy = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Ly = (e) => {
        throw TypeError(e);
      }),
      (Ry = (e, t, n) =>
        t in e
          ? Py(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (zy = (e) => [, , , Ny(e?.[Iy(`metadata`)] ?? null)]),
      (By = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Vy = (e) => (e !== void 0 && typeof e != `function` ? Ly(`Function expected`) : e)),
      (Hy = (e, t, n, r, i) => ({
        kind: By[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Ly(`Already initialized`) : i.push(Vy(e || null))),
      })),
      (Uy = (e, t) => Ry(t, Iy(`metadata`), e[3])),
      (Wy = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++) a[i].call(n);
        return r;
      }),
      (Gy = (e, t, n, r, i, a) => {
        for (
          var o,
            s,
            c,
            l,
            u = t & 7,
            d = !1,
            f = !1,
            p = 2,
            m = By[u + 5],
            h = e[p] || (e[p] = []),
            g = ((i = i.prototype), Fy(i, n)),
            _ = r.length - 1;
          _ >= 0;
          _--
        )
          ((c = Hy(u, n, (s = {}), e[3], h)),
            (c.static = d),
            (c.private = f),
            (l = c.access = { has: (e) => n in e }),
            (l.get = (e) => e[n]),
            (o = (0, r[_])(g[m], c)),
            (s._ = 1),
            Vy(o) && (g[m] = o));
        return (g && Py(i, n, g), i);
      }),
      (Ky = (e, t, n) => t.has(e) || Ly(`Cannot ` + n)),
      (qy = (e, t, n) => (Ky(e, t, `read from private field`), t.get(e))),
      (Jy = (e, t, n) =>
        t.has(e)
          ? Ly(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Yy = (e, t, n, r) => (Ky(e, t, `write to private field`), t.set(e, n), n)),
      (Xy = class e {
        constructor(e, t) {
          ((this.x = e), (this.y = t));
        }
        static delta(t, n) {
          return new e(t.x - n.x, t.y - n.y);
        }
        static distance(e, t) {
          return Math.hypot(e.x - t.x, e.y - t.y);
        }
        static equals(e, t) {
          return e.x === t.x && e.y === t.y;
        }
        static from({ x: t, y: n }) {
          return new e(t, n);
        }
      }),
      (nb = class extends (($y = Au), (Qy = [Nl]), (Zy = [Nl]), $y) {
        constructor(e) {
          let t = Xy.from(e);
          (super(t, (e, t) => Xy.equals(e, t)),
            Wy(tb, 5, this),
            Jy(this, eb, 0),
            (this.velocity = { x: 0, y: 0 }));
        }
        get delta() {
          return Xy.delta(this.current, this.initial);
        }
        get direction() {
          let { current: e, previous: t } = this;
          if (!t) return null;
          let n = { x: e.x - t.x, y: e.y - t.y };
          return !n.x && !n.y
            ? null
            : Math.abs(n.x) > Math.abs(n.y)
              ? n.x > 0
                ? `right`
                : `left`
              : n.y > 0
                ? `down`
                : `up`;
        }
        get current() {
          return super.current;
        }
        set current(e) {
          let { current: t } = this,
            n = Xy.from(e),
            r = { x: n.x - t.x, y: n.y - t.y },
            i = Date.now(),
            a = i - qy(this, eb),
            o = (e) => Math.round((e / a) * 100);
          sl(() => {
            (Yy(this, eb, i), (this.velocity = { x: o(r.x), y: o(r.y) }), (super.current = n));
          });
        }
        reset(e = this.defaultValue) {
          (super.reset(Xy.from(e)), (this.velocity = { x: 0, y: 0 }));
        }
      }),
      (tb = zy($y)),
      (eb = new WeakMap()),
      Gy(tb, 2, `delta`, Qy, nb),
      Gy(tb, 2, `direction`, Zy, nb),
      Uy(tb, nb),
      (rb = ((e) => ((e.Horizontal = `x`), (e.Vertical = `y`), e))(rb || {})),
      Object.values(rb));
  }),
  ab,
  ob = t(() => {
    ab = {
      outline: {
        xmlns: `http://www.w3.org/2000/svg`,
        width: 24,
        height: 24,
        viewBox: `0 0 24 24`,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: 2,
        strokeLinecap: `round`,
        strokeLinejoin: `round`,
      },
      filled: {
        xmlns: `http://www.w3.org/2000/svg`,
        width: 24,
        height: 24,
        viewBox: `0 0 24 24`,
        fill: `currentColor`,
        stroke: `none`,
      },
    };
  }),
  sb,
  cb,
  lb = t(() => {
    ((sb = e(r(), 1)),
      ob(),
      (cb = (e, t, n, r) => {
        let i = (0, sb.forwardRef)(
          (
            {
              color: n = `currentColor`,
              size: i = 24,
              stroke: a = 2,
              title: o,
              className: s,
              children: c,
              ...l
            },
            u,
          ) =>
            (0, sb.createElement)(
              `svg`,
              {
                ref: u,
                ...ab[e],
                width: i,
                height: i,
                className: [`tabler-icon`, `tabler-icon-${t}`, s].join(` `),
                ...(e === `filled` ? { fill: n } : { strokeWidth: a, stroke: n }),
                ...l,
              },
              [
                o && (0, sb.createElement)(`title`, { key: `svg-title` }, o),
                ...r.map(([e, t]) => (0, sb.createElement)(e, t)),
                ...(Array.isArray(c) ? c : [c]),
              ],
            ),
        );
        return ((i.displayName = `${n}`), i);
      }));
  }),
  ub,
  db,
  fb = t(() => {
    (lb(),
      (ub = [
        [`path`, { d: `M12 3v18`, key: `svg-0` }],
        [`path`, { d: `M9 18l3 3l3 -3`, key: `svg-1` }],
        [`path`, { d: `M9 3h6`, key: `svg-2` }],
      ]),
      (db = cb(`outline`, `arrow-down-bar`, `ArrowDownBar`, ub)));
  }),
  pb,
  mb,
  hb = t(() => {
    (lb(),
      (pb = [
        [
          `path`,
          {
            d: `M9.346 5.353c.21 -.129 .428 -.246 .654 -.353a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3m-1 3h-13a4 4 0 0 0 2 -3v-3a6.996 6.996 0 0 1 1.273 -3.707`,
            key: `svg-0`,
          },
        ],
        [`path`, { d: `M9 17v1a3 3 0 0 0 6 0v-1`, key: `svg-1` }],
        [`path`, { d: `M3 3l18 18`, key: `svg-2` }],
      ]),
      (mb = cb(`outline`, `bell-off`, `BellOff`, pb)));
  }),
  gb,
  _b,
  vb = t(() => {
    (lb(),
      (gb = [
        [
          `path`,
          {
            d: `M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6`,
            key: `svg-0`,
          },
        ],
        [`path`, { d: `M9 17v1a3 3 0 0 0 6 0v-1`, key: `svg-1` }],
      ]),
      (_b = cb(`outline`, `bell`, `Bell`, gb)));
  }),
  yb,
  bb,
  xb = t(() => {
    (lb(),
      (yb = [[`path`, { d: `M5 12l5 5l10 -10`, key: `svg-0` }]]),
      (bb = cb(`outline`, `check`, `Check`, yb)));
  }),
  Sb,
  Cb,
  wb = t(() => {
    (lb(),
      (Sb = [[`path`, { d: `M6 9l6 6l6 -6`, key: `svg-0` }]]),
      (Cb = cb(`outline`, `chevron-down`, `ChevronDown`, Sb)));
  }),
  Tb,
  Eb,
  Db = t(() => {
    (lb(),
      (Tb = [[`path`, { d: `M9 6l6 6l-6 6`, key: `svg-0` }]]),
      (Eb = cb(`outline`, `chevron-right`, `ChevronRight`, Tb)));
  }),
  Ob,
  kb,
  Ab = t(() => {
    (lb(),
      (Ob = [
        [`path`, { d: `M15 12h.01`, key: `svg-0` }],
        [`path`, { d: `M12 12h.01`, key: `svg-1` }],
        [`path`, { d: `M9 12h.01`, key: `svg-2` }],
        [`path`, { d: `M6 19a2 2 0 0 1 -2 -2v-4l-1 -1l1 -1v-4a2 2 0 0 1 2 -2`, key: `svg-3` }],
        [`path`, { d: `M18 19a2 2 0 0 0 2 -2v-4l1 -1l-1 -1v-4a2 2 0 0 0 -2 -2`, key: `svg-4` }],
      ]),
      (kb = cb(`outline`, `code-dots`, `CodeDots`, Ob)));
  }),
  jb,
  Mb,
  Nb = t(() => {
    (lb(),
      (jb = [
        [
          `path`,
          {
            d: `M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666`,
            key: `svg-0`,
          },
        ],
        [
          `path`,
          {
            d: `M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1`,
            key: `svg-1`,
          },
        ],
      ]),
      (Mb = cb(`outline`, `copy`, `Copy`, jb)));
  }),
  Pb,
  Fb,
  Ib = t(() => {
    (lb(),
      (Pb = [
        [
          `path`,
          { d: `M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6`, key: `svg-0` },
        ],
        [`path`, { d: `M11 13l9 -9`, key: `svg-1` }],
        [`path`, { d: `M15 4h5v5`, key: `svg-2` }],
      ]),
      (Fb = cb(`outline`, `external-link`, `ExternalLink`, Pb)));
  }),
  Lb,
  Rb,
  zb = t(() => {
    (lb(),
      (Lb = [
        [`path`, { d: `M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`, key: `svg-0` }],
        [`path`, { d: `M12 3l0 6`, key: `svg-1` }],
        [`path`, { d: `M12 15l0 6`, key: `svg-2` }],
      ]),
      (Rb = cb(`outline`, `git-commit`, `GitCommit`, Lb)));
  }),
  Bb,
  Vb,
  Hb = t(() => {
    (lb(),
      (Bb = [
        [`path`, { d: `M4 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`, key: `svg-0` }],
        [`path`, { d: `M4 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`, key: `svg-1` }],
        [`path`, { d: `M16 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`, key: `svg-2` }],
        [`path`, { d: `M6 8l0 8`, key: `svg-3` }],
        [`path`, { d: `M11 6h5a2 2 0 0 1 2 2v8`, key: `svg-4` }],
        [`path`, { d: `M14 9l-3 -3l3 -3`, key: `svg-5` }],
      ]),
      (Vb = cb(`outline`, `git-pull-request`, `GitPullRequest`, Bb)));
  }),
  Ub,
  Wb,
  Gb = t(() => {
    (lb(),
      (Ub = [
        [`path`, { d: `M12 8l0 4l2 2`, key: `svg-0` }],
        [`path`, { d: `M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5`, key: `svg-1` }],
      ]),
      (Wb = cb(`outline`, `history`, `History`, Ub)));
  }),
  Kb,
  qb,
  Jb = t(() => {
    (lb(),
      (Kb = [
        [
          `path`,
          {
            d: `M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12`,
            key: `svg-0`,
          },
        ],
        [`path`, { d: `M9 4l0 16`, key: `svg-1` }],
      ]),
      (qb = cb(`outline`, `layout-sidebar`, `LayoutSidebar`, Kb)));
  }),
  Yb,
  Xb,
  Zb = t(() => {
    (lb(),
      (Yb = [[`path`, { d: `M12 3a9 9 0 1 0 9 9`, key: `svg-0` }]]),
      (Xb = cb(`outline`, `loader-2`, `Loader2`, Yb)));
  }),
  Qb,
  $b,
  ex = t(() => {
    (lb(),
      (Qb = [
        [`path`, { d: `M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4`, key: `svg-0` }],
        [`path`, { d: `M13.5 6.5l4 4`, key: `svg-1` }],
      ]),
      ($b = cb(`outline`, `pencil`, `Pencil`, Qb)));
  }),
  tx,
  nx,
  rx = t(() => {
    (lb(),
      (tx = [[`path`, { d: `M7 4v16l13 -8l-13 -8`, key: `svg-0` }]]),
      (nx = cb(`outline`, `player-play`, `PlayerPlay`, tx)));
  }),
  ix,
  ax,
  ox = t(() => {
    (lb(),
      (ix = [
        [`path`, { d: `M12 5l0 14`, key: `svg-0` }],
        [`path`, { d: `M5 12l14 0`, key: `svg-1` }],
      ]),
      (ax = cb(`outline`, `plus`, `Plus`, ix)));
  }),
  sx,
  cx,
  lx = t(() => {
    (lb(),
      (sx = [
        [`path`, { d: `M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4`, key: `svg-0` }],
        [`path`, { d: `M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4`, key: `svg-1` }],
      ]),
      (cx = cb(`outline`, `refresh`, `Refresh`, sx)));
  }),
  ux,
  dx,
  fx = t(() => {
    (lb(),
      (ux = [
        [
          `path`,
          {
            d: `M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065`,
            key: `svg-0`,
          },
        ],
        [`path`, { d: `M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0`, key: `svg-1` }],
      ]),
      (dx = cb(`outline`, `settings`, `Settings`, ux)));
  }),
  px,
  mx,
  hx = t(() => {
    (lb(),
      (px = [
        [`path`, { d: `M4 7l16 0`, key: `svg-0` }],
        [`path`, { d: `M10 11l0 6`, key: `svg-1` }],
        [`path`, { d: `M14 11l0 6`, key: `svg-2` }],
        [`path`, { d: `M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12`, key: `svg-3` }],
        [`path`, { d: `M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3`, key: `svg-4` }],
      ]),
      (mx = cb(`outline`, `trash`, `Trash`, px)));
  }),
  gx,
  _x,
  vx = t(() => {
    (lb(),
      (gx = [
        [`path`, { d: `M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2`, key: `svg-0` }],
        [`path`, { d: `M7 9l5 -5l5 5`, key: `svg-1` }],
        [`path`, { d: `M12 4l0 12`, key: `svg-2` }],
      ]),
      (_x = cb(`outline`, `upload`, `Upload`, gx)));
  }),
  yx,
  bx,
  xx = t(() => {
    (lb(),
      (yx = [
        [`path`, { d: `M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0`, key: `svg-0` }],
        [`path`, { d: `M3.6 9h16.8`, key: `svg-1` }],
        [`path`, { d: `M3.6 15h16.8`, key: `svg-2` }],
        [`path`, { d: `M11.5 3a17 17 0 0 0 0 18`, key: `svg-3` }],
        [`path`, { d: `M12.5 3a17 17 0 0 1 0 18`, key: `svg-4` }],
      ]),
      (bx = cb(`outline`, `world`, `World`, yx)));
  }),
  Sx,
  Cx,
  wx = t(() => {
    (lb(),
      (Sx = [
        [`path`, { d: `M18 6l-12 12`, key: `svg-0` }],
        [`path`, { d: `M6 6l12 12`, key: `svg-1` }],
      ]),
      (Cx = cb(`outline`, `x`, `X`, Sx)));
  }),
  Tx = t(() => {
    (fb(),
      hb(),
      vb(),
      xb(),
      wb(),
      Db(),
      Ab(),
      Nb(),
      Ib(),
      zb(),
      Hb(),
      Gb(),
      Jb(),
      Zb(),
      ex(),
      rx(),
      ox(),
      lx(),
      fx(),
      hx(),
      vx(),
      xx(),
      wx());
  });
function Ex(e, t) {
  return Object.is(e, t)
    ? !0
    : typeof e != `object` ||
        !e ||
        typeof t != `object` ||
        !t ||
        Object.getPrototypeOf(e) !== Object.getPrototypeOf(t)
      ? !1
      : Dx(e) && Dx(t)
        ? Ox(e) && Ox(t)
          ? kx(e, t)
          : Ax(e, t)
        : kx({ entries: () => Object.entries(e) }, { entries: () => Object.entries(t) });
}
var Dx,
  Ox,
  kx,
  Ax,
  jx = t(() => {
    ((Dx = (e) => Symbol.iterator in e),
      (Ox = (e) => `entries` in e),
      (kx = (e, t) => {
        let n = e instanceof Map ? e : new Map(e.entries()),
          r = t instanceof Map ? t : new Map(t.entries());
        if (n.size !== r.size) return !1;
        for (let [e, t] of n) if (!r.has(e) || !Object.is(t, r.get(e))) return !1;
        return !0;
      }),
      (Ax = (e, t) => {
        let n = e[Symbol.iterator](),
          r = t[Symbol.iterator](),
          i = n.next(),
          a = r.next();
        for (; !i.done && !a.done; ) {
          if (!Object.is(i.value, a.value)) return !1;
          ((i = n.next()), (a = r.next()));
        }
        return !!i.done && !!a.done;
      }));
  });
function Mx(e) {
  let t = Nx.useRef(void 0);
  return (n) => {
    let r = e(n);
    return Ex(t.current, r) ? t.current : (t.current = r);
  };
}
var Nx,
  Px = t(() => {
    ((Nx = e(r(), 1)), jx());
  }),
  Fx,
  Ix,
  Lx = t(() => {
    ((Fx = `group-1`), (Ix = `Main`));
  });
function Rx() {
  return { actions: !0, agents: !0, browsers: !0, git: !0 };
}
function zx() {
  return { actions: !1, agents: !1 };
}
var Bx = t(() => {});
function Vx(e) {
  return e <= 1 ? 1 : e === 2 ? 2 : e === 3 ? 3 : e <= 4 ? 4 : e <= 6 ? 6 : 9;
}
function Hx(e) {
  switch (e) {
    case `horizontal`:
    case `vertical`:
    case `grid`:
      return e;
    default:
      return `grid`;
  }
}
function Ux() {
  return {
    focusedSessionId: void 0,
    fullscreenRestoreVisibleCount: void 0,
    sessions: [],
    visibleCount: 1,
    visibleSessionIds: [],
    viewMode: `grid`,
  };
}
function Wx(e) {
  return e.visibleCount === 1 && e.fullscreenRestoreVisibleCount !== void 0;
}
function Gx(e) {
  return e.fullscreenRestoreVisibleCount ?? e.visibleCount;
}
function Kx() {
  return {
    activeGroupId: Fx,
    groups: [{ groupId: Fx, snapshot: Ux(), title: Ix }],
    nextGroupNumber: 2,
    nextSessionDisplayId: 0,
    nextSessionNumber: 1,
  };
}
function qx(e) {
  if (typeof e == `string`) {
    let t = e.trim();
    if (/^\d{2}$/.test(t)) return t;
    let n = Number.parseInt(t, 10);
    if (Number.isInteger(n)) return qx(n);
  }
  if (!Number.isFinite(Number(e))) return `00`;
  let t = ((Math.floor(Number(e)) % 100) + 100) % 100;
  return String(t).padStart(2, `0`);
}
function Jx(e) {
  let t = Math.max(0, Math.min(8, Math.floor(e)));
  return { column: t % 3, row: Math.floor(t / 3) };
}
function Yx(e, t) {
  return `R${e + 1}C${t + 1}`;
}
function Xx(e, t) {
  let n = Math.max(1, Math.min(9, Math.floor(e) + 1));
  return t === `mac` ? `⌘⌥${n}` : `⌃⌥${n}`;
}
function Zx(e, t, n) {
  return qx(n ?? e - 1);
}
function Qx(e) {
  let t = /^session-(\d+)$/.exec(e);
  if (!t) return;
  let n = Number.parseInt(t[1], 10);
  return Number.isInteger(n) && n > 0 ? n : void 0;
}
function $x(e) {
  return qx(e.displayId ?? rS(e) - 1);
}
function eS(e) {
  let t = e.trim();
  if (!(!t || /^Session \d+$/.test(t))) return t;
}
function tS(e) {
  let t = e?.trim();
  if (!t || /^(~|\/)/.test(t)) return;
  let n = t.replace(/^[\s\u2800-\u28ff·•⋅◦]+/, ``).trim();
  if (n) return n;
}
function nS(e) {
  return [...e.sessions].sort((e, t) => e.slotIndex - t.slotIndex);
}
function rS(e) {
  return Qx(e.sessionId) ?? e.slotIndex + 1;
}
var iS = t(() => {
  Lx();
});
function aS(e) {
  return oS.find((t) => t.value === e)?.label ?? aS(`ping`);
}
var oS,
  sS,
  cS = t(() => {
    ((oS = [
      { fileName: `arcade.mp3`, label: `Arcade`, value: `arcade` },
      {
        fileName: `codecompleteafrican.mp3`,
        label: `African Code Complete`,
        value: `codecompleteafrican`,
      },
      {
        fileName: `codecompleteafrobeat.mp3`,
        label: `Afrobeat Code Complete`,
        value: `codecompleteafrobeat`,
      },
      { fileName: `codecompleteedm.mp3`, label: `EDM Code Complete`, value: `codecompleteedm` },
      {
        fileName: `comebacktothecode.mp3`,
        label: `Come Back To The Code`,
        value: `comebacktothecode`,
      },
      { fileName: `glass.mp3`, label: `Glass`, value: `glass` },
      { fileName: `ping.mp3`, label: `Ping`, value: `ping` },
      { fileName: `shamisen.mp3`, label: `Shamisen`, value: `shamisen` },
    ]),
      (sS = `ping`));
  });
function lS() {
  return fS.map((e) => ({
    agentId: e.agentId,
    command: e.command,
    icon: e.icon,
    isDefault: !0,
    name: e.name,
  }));
}
function uS(e) {
  if (!(!e || e === `browser`)) return fS.find((t) => t.icon === e);
}
function dS(e) {
  return e === `browser` ? `Browser` : fS.find((t) => t.icon === e)?.name;
}
var fS,
  pS = t(() => {
    fS = [
      { agentId: `t3`, command: `npx --yes t3`, icon: `t3`, name: `T3 Code` },
      { agentId: `codex`, command: `codex`, icon: `codex`, name: `Codex` },
      { agentId: `copilot`, command: `copilot`, icon: `copilot`, name: `Copilot` },
      { agentId: `claude`, command: `claude`, icon: `claude`, name: `Claude` },
      { agentId: `opencode`, command: `opencode`, icon: `opencode`, name: `OpenCode` },
      { agentId: `gemini`, command: `gemini -y`, icon: `gemini`, name: `Gemini` },
    ];
  });
function mS() {
  return hS.map((e) => ({
    actionType: `terminal`,
    closeTerminalOnExit: !1,
    command: void 0,
    commandId: e.commandId,
    isDefault: !0,
    name: e.name,
    url: void 0,
  }));
}
var hS,
  gS,
  _S = t(() => {
    ((hS = [
      { commandId: `dev`, name: `Dev` },
      { commandId: `build`, name: `Build` },
      { commandId: `test`, name: `Test` },
      { commandId: `setup`, name: `Setup` },
    ]),
      (gS = `http://localhost:5173`));
  });
function vS(e = TS, t = !1) {
  return {
    additions: 0,
    aheadCount: 0,
    behindCount: 0,
    branch: null,
    confirmSuggestedCommit: t,
    deletions: 0,
    hasGitHubCli: !1,
    hasOriginRemote: !1,
    hasUpstream: !1,
    hasWorkingTreeChanges: !1,
    isBusy: !1,
    isRepo: !1,
    pr: null,
    primaryAction: e,
  };
}
function yS(e) {
  return e === `push` || e === `pr` ? e : `commit`;
}
function bS(e) {
  return [
    CS(`commit`, `Commit`, e),
    CS(`push`, `Push`, e),
    CS(`pr`, e.pr?.state === `open` ? `View PR` : `Create PR`, e),
  ];
}
function xS(e) {
  let t = yS(e.primaryAction),
    n = SS(e, t);
  return t === `push`
    ? {
        action: t,
        disabled: n !== void 0,
        disabledReason: n,
        label: e.hasWorkingTreeChanges ? `Commit & Push` : `Push`,
      }
    : t === `pr`
      ? { action: t, disabled: n !== void 0, disabledReason: n, label: wS(e) }
      : { action: t, disabled: n !== void 0, disabledReason: n, label: `Commit` };
}
function SS(e, t) {
  if (e.isBusy) return `Git action already running.`;
  if (!e.isRepo) return `Open a Git repository to use Git actions.`;
  if (t === `commit`)
    return e.hasWorkingTreeChanges ? void 0 : `No working tree changes to commit.`;
  if (!e.branch) return `Create and checkout a branch before pushing or creating a PR.`;
  if (e.behindCount > 0) return `Branch is behind upstream. Pull or rebase first.`;
  if (t === `push`)
    return e.hasWorkingTreeChanges || e.aheadCount > 0 || (!e.hasUpstream && e.hasOriginRemote)
      ? void 0
      : e.hasOriginRemote
        ? `No local commits to push.`
        : `Add an "origin" remote before pushing.`;
  if (!e.hasGitHubCli) return `Install GitHub CLI to create or view pull requests.`;
  if (
    !e.hasWorkingTreeChanges &&
    e.pr?.state !== `open` &&
    !(e.aheadCount > 0) &&
    !(!e.hasUpstream && e.hasOriginRemote)
  ) {
    if (!e.hasOriginRemote) return `Add an "origin" remote before creating a PR.`;
    if (!e.hasUpstream) return `No branch state available for PR creation.`;
  }
}
function CS(e, t, n) {
  let r = SS(n, e);
  return { action: e, disabled: r !== void 0, disabledReason: r, label: t };
}
function wS(e) {
  let t = e.hasWorkingTreeChanges || e.aheadCount > 0 || !e.hasUpstream;
  return e.hasWorkingTreeChanges
    ? `Commit, Push & PR`
    : e.pr?.state === `open` && !t
      ? `View PR`
      : t
        ? e.pr?.state === `open`
          ? `Push & View PR`
          : `Push & Create PR`
        : e.pr?.state === `open`
          ? `View PR`
          : `Create PR`;
}
var TS,
  ES = t(() => {
    TS = `commit`;
  });
function DS(
  e,
  t = `dark-blue`,
  n = 100,
  r = !1,
  i = !1,
  a = !1,
  o = !1,
  s = sS,
  c = lS(),
  l = mS(),
  u = [],
  d = vS(),
  f = Rx(),
  p = zx(),
) {
  let m = new Map(e.sessions.map((e) => [e.sessionId, e])),
    h = e.focusedSessionId ? m.get(e.focusedSessionId) : void 0;
  return {
    agentManagerZoomPercent: n,
    agents: c,
    collapsedSections: p,
    commands: l,
    completionBellEnabled: o,
    completionSound: s,
    completionSoundLabel: aS(s),
    debuggingMode: a,
    focusedSessionTitle: h?.title,
    git: d,
    highlightedVisibleCount: Gx(e),
    isFocusModeActive: Wx(e),
    pendingAgentIds: u,
    sectionVisibility: f,
    showCloseButtonOnSessionCards: r,
    showHotkeysOnSessionCards: i,
    theme: t,
    viewMode: e.viewMode,
    visibleCount: e.visibleCount,
    visibleSlotLabels: e.visibleSessionIds
      .map((e) => m.get(e))
      .filter((e) => e !== void 0)
      .map((e) => Yx(e.row, e.column)),
  };
}
function OS(e, t = `default`) {
  let n = new Set(e.visibleSessionIds);
  return nS(e).map((r) => ({
    activity: `idle`,
    activityLabel: void 0,
    agentIcon: void 0,
    alias: r.alias,
    column: r.column,
    detail: void 0,
    isFocused: e.focusedSessionId === r.sessionId,
    isRunning: !1,
    isVisible: n.has(r.sessionId),
    primaryTitle: eS(r.title),
    row: r.row,
    sessionId: r.sessionId,
    sessionNumber: $x(r),
    shortcutLabel: Xx(r.slotIndex, t),
  }));
}
var kS = t(() => {
    (cS(), pS(), _S(), Lx(), ES(), Bx(), iS());
  }),
  AS = t(() => {
    (Lx(), Bx(), iS(), kS());
  });
async function jS(e) {
  let t = NS();
  if (!t) {
    e?.(`completionSound.audioContextUnsupported`);
    return;
  }
  if (t.state !== `running`)
    try {
      await t.resume();
      let n = t.createBufferSource();
      ((n.buffer = t.createBuffer(1, 1, t.sampleRate)),
        n.connect(t.destination),
        n.start(),
        e?.(`completionSound.audioContextUnlocked`, { state: t.state }));
    } catch (n) {
      e?.(`completionSound.audioContextUnlockFailed`, {
        error: n instanceof Error ? n.message : String(n),
        state: t.state,
      });
    }
}
async function MS(e, t) {
  let n = NS();
  if (n?.state === `running`) {
    let r = await FS(e, n, t);
    if (!r) return;
    let i = n.createBufferSource();
    ((i.buffer = r),
      i.connect(n.destination),
      i.start(),
      t?.(`completionSound.played`, { mode: `audioContext`, sound: e }));
    return;
  }
  n && t?.(`completionSound.audioContextLockedAtPlay`, { sound: e, state: n.state });
  let r = PS(e);
  if (!r) {
    t?.(`completionSound.missingAudio`, {
      hasSoundUrl: !!window.__VSMUX_SOUND_URLS__?.[e],
      sound: e,
    });
    return;
  }
  (r.pause(), (r.currentTime = 0));
  try {
    (await r.play(),
      t?.(`completionSound.played`, {
        currentTime: r.currentTime,
        mode: `htmlAudio`,
        sound: e,
        src: r.currentSrc || r.src,
      }));
  } catch (n) {
    t?.(`completionSound.playFailed`, {
      error: n instanceof Error ? n.message : String(n),
      sound: e,
      src: r.currentSrc || r.src,
    });
  }
}
function NS() {
  let e = window.AudioContext ?? window.webkitAudioContext;
  if (e) return ((zS ??= new e()), zS);
}
function PS(e) {
  let t = LS.get(e);
  if (t) return t;
  let n = window.__VSMUX_SOUND_URLS__?.[e];
  if (!n) return;
  let r = new Audio(n);
  return ((r.preload = `auto`), LS.set(e, r), r);
}
async function FS(e, t, n) {
  let r = RS.get(e);
  if (r) return r;
  let i = window.__VSMUX_SOUND_URLS__?.[e];
  if (!i) {
    n?.(`completionSound.missingAudio`, { hasSoundUrl: !1, sound: e });
    return;
  }
  let a = fetch(i)
      .then(async (e) => {
        if (!e.ok) throw Error(`HTTP ${e.status}`);
        let n = await e.arrayBuffer();
        return await t.decodeAudioData(n.slice(0));
      })
      .catch((t) => {
        (RS.delete(e),
          n?.(`completionSound.decodeFailed`, {
            error: t instanceof Error ? t.message : String(t),
            sound: e,
            url: i,
          }));
      }),
    o = i.startsWith(`data:`)
      ? t.decodeAudioData(IS(i)).catch((t) => {
          (RS.delete(e),
            n?.(`completionSound.decodeFailed`, {
              error: t instanceof Error ? t.message : String(t),
              sound: e,
              url: `data:`,
            }));
        })
      : a;
  return (RS.set(e, o), o);
}
function IS(e) {
  let t = e.indexOf(`,`);
  if (t < 0) throw Error(`Invalid data URL`);
  let n = e.slice(0, t),
    r = e.slice(t + 1);
  if (!/;base64$/i.test(n)) {
    let e = new TextEncoder().encode(decodeURIComponent(r));
    return e.buffer.slice(e.byteOffset, e.byteOffset + e.byteLength);
  }
  let i = atob(r),
    a = new Uint8Array(i.length);
  for (let e = 0; e < i.length; e += 1) a[e] = i.charCodeAt(e);
  return a.buffer;
}
var LS,
  RS,
  zS,
  BS = t(() => {
    ((LS = new Map()), (RS = new Map()));
  });
function VS(e) {
  return e instanceof JC || e instanceof qC;
}
function HS(e) {
  return VS(e.source) && VS(e.target);
}
function US(e) {
  let { x: t, y: n } = e;
  if (t > 0) return `right`;
  if (t < 0) return `left`;
  if (n > 0) return `down`;
  if (n < 0) return `up`;
}
function WS(e, t, n) {
  if (t === n) return e;
  let r = e.slice();
  return (r.splice(n, 0, r.splice(t, 1)[0]), r);
}
function GS(e) {
  return (
    `initialIndex` in e &&
    typeof e.initialIndex == `number` &&
    `index` in e &&
    typeof e.index == `number`
  );
}
function KS(e, t, n) {
  let { source: r, target: i, canceled: a } = t.operation;
  if (!r || !i || a) return (`preventDefault` in t && t.preventDefault(), e);
  let o = (e, t) => e === t || (typeof e == `object` && `id` in e && e.id === t);
  if (Array.isArray(e)) {
    let s = e.findIndex((e) => o(e, r.id)),
      c = e.findIndex((e) => o(e, i.id));
    if (s === -1 || c === -1) {
      if (GS(r)) {
        let i = r.initialIndex,
          a = r.index;
        return i === a || i < 0 || i >= e.length
          ? (`preventDefault` in t && t.preventDefault(), e)
          : n(e, i, a);
      }
      return e;
    }
    if (!a && `index` in r && typeof r.index == `number`) {
      let t = r.index;
      if (t !== s) return n(e, s, t);
    }
    return n(e, s, c);
  }
  let s = Object.entries(e),
    c = -1,
    l,
    u = -1,
    d;
  for (let [e, t] of s)
    if (
      (c === -1 && ((c = t.findIndex((e) => o(e, r.id))), c !== -1 && (l = e)),
      u === -1 && ((u = t.findIndex((e) => o(e, i.id))), u !== -1 && (d = e)),
      c !== -1 && u !== -1)
    )
      break;
  if (c === -1 && GS(r)) {
    let i = r.initialGroup,
      a = r.initialIndex,
      o = r.group,
      s = r.index;
    if (i == null || o == null || !(i in e) || !(o in e) || (i === o && a === s))
      return (`preventDefault` in t && t.preventDefault(), e);
    if (i === o) return MC(jC({}, e), { [i]: n(e[i], a, s) });
    let c = e[i][a];
    return MC(jC({}, e), {
      [i]: [...e[i].slice(0, a), ...e[i].slice(a + 1)],
      [o]: [...e[o].slice(0, s), c, ...e[o].slice(s)],
    });
  }
  if (!r.manager) return e;
  let { dragOperation: f } = r.manager,
    p = f.shape?.current.center ?? f.position.current;
  if (d == null && i.id in e) {
    let t = i.shape && p.y > i.shape.center.y ? e[i.id].length : 0;
    ((d = i.id), (u = t));
  }
  if (l == null || d == null || (l === d && c === u)) {
    if (l != null && l === d && c === u && GS(r)) {
      let t = r.group != null && r.group !== l,
        i = r.index !== c;
      if (t || i) {
        let t = r.group ?? l;
        if (t in e) {
          if (l === t) return MC(jC({}, e), { [l]: n(e[l], c, r.index) });
          let i = e[l][c];
          return MC(jC({}, e), {
            [l]: [...e[l].slice(0, c), ...e[l].slice(c + 1)],
            [t]: [...e[t].slice(0, r.index), i, ...e[t].slice(r.index)],
          });
        }
      }
    }
    return (`preventDefault` in t && t.preventDefault(), e);
  }
  if (l === d) return MC(jC({}, e), { [l]: n(e[l], c, u) });
  let m = i.shape && Math.round(p.y) > Math.round(i.shape.center.y) ? 1 : 0,
    h = e[l][c];
  return MC(jC({}, e), {
    [l]: [...e[l].slice(0, c), ...e[l].slice(c + 1)],
    [d]: [...e[d].slice(0, u + m), h, ...e[d].slice(u + m)],
  });
}
function qS(e, t) {
  return KS(e, t, WS);
}
function JS(e, t, n, r) {
  let i = r < t ? `afterend` : `beforebegin`;
  n.insertAdjacentElement(i, e);
}
function YS(e, t) {
  return e.index - t.index;
}
function XS(e) {
  return Array.from(e).sort(YS);
}
var ZS,
  QS,
  $S,
  eC,
  tC,
  nC,
  rC,
  iC,
  aC,
  oC,
  sC,
  cC,
  lC,
  uC,
  dC,
  fC,
  pC,
  mC,
  hC,
  gC,
  _C,
  vC,
  yC,
  bC,
  xC,
  SC,
  CC,
  wC,
  TC,
  EC,
  DC,
  OC,
  kC,
  AC,
  jC,
  MC,
  NC,
  PC,
  FC,
  IC,
  LC,
  RC,
  zC,
  BC,
  VC,
  HC,
  UC,
  WC,
  GC,
  KC,
  qC,
  JC,
  YC = t(() => {
    (Nu(),
      Xh(),
      Kv(),
      Gh(),
      Fp(),
      _d(),
      (ZS = Object.create),
      (QS = Object.defineProperty),
      ($S = Object.defineProperties),
      (eC = Object.getOwnPropertyDescriptor),
      (tC = Object.getOwnPropertyDescriptors),
      (nC = Object.getOwnPropertySymbols),
      (rC = Object.prototype.hasOwnProperty),
      (iC = Object.prototype.propertyIsEnumerable),
      (aC = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (oC = (e) => {
        throw TypeError(e);
      }),
      (sC = (e, t, n) =>
        t in e
          ? QS(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (cC = (e, t) => {
        for (var n in (t ||= {})) rC.call(t, n) && sC(e, n, t[n]);
        if (nC) for (var n of nC(t)) iC.call(t, n) && sC(e, n, t[n]);
        return e;
      }),
      (lC = (e, t) => $S(e, tC(t))),
      (uC = (e, t) => {
        var n = {};
        for (var r in e) rC.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && nC)
          for (var r of nC(e)) t.indexOf(r) < 0 && iC.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (dC = (e) => [, , , ZS(null)]),
      (fC = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (pC = (e) => (e !== void 0 && typeof e != `function` ? oC(`Function expected`) : e)),
      (mC = (e, t, n, r, i) => ({
        kind: fC[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? oC(`Already initialized`) : i.push(pC(e || null))),
      })),
      (hC = (e, t) => sC(t, aC(`metadata`), e[3])),
      (gC = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (_C = (e, t, n, r, i, a) => {
        for (
          var o,
            s,
            c,
            l,
            u,
            d = t & 7,
            f = !1,
            p = !1,
            m = e.length + 1,
            h = fC[d + 5],
            g = (e[m - 1] = []),
            _ = e[m] || (e[m] = []),
            v =
              ((i = i.prototype),
              eC(
                {
                  get [n]() {
                    return yC(this, a);
                  },
                  set [n](e) {
                    return xC(this, a, e);
                  },
                },
                n,
              )),
            y = r.length - 1;
          y >= 0;
          y--
        )
          ((l = mC(d, n, (c = {}), e[3], _)),
            (l.static = f),
            (l.private = p),
            (u = l.access = { has: (e) => n in e }),
            (u.get = (e) => e[n]),
            (u.set = (e, t) => (e[n] = t)),
            (s = (0, r[y])({ get: v.get, set: v.set }, l)),
            (c._ = 1),
            s === void 0
              ? pC(s) && (v[h] = s)
              : typeof s != `object` || !s
                ? oC(`Object expected`)
                : (pC((o = s.get)) && (v.get = o),
                  pC((o = s.set)) && (v.set = o),
                  pC((o = s.init)) && g.unshift(o)));
        return (v && QS(i, n, v), i);
      }),
      (vC = (e, t, n) => t.has(e) || oC(`Cannot ` + n)),
      (yC = (e, t, n) => (vC(e, t, `read from private field`), t.get(e))),
      (bC = (e, t, n) =>
        t.has(e)
          ? oC(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (xC = (e, t, n, r) => (vC(e, t, `write to private field`), t.set(e, n), n)),
      (SC = 10),
      (CC = class extends $d {
        constructor(e) {
          super(e);
          let t = bl(() => {
              let { dragOperation: t } = e;
              if (qm(t.activatorEvent) && VS(t.source) && t.status.initialized) {
                let t = e.registry.plugins.get(ev);
                if (t) return (t.disable(), () => t.enable());
              }
            }),
            n = e.monitor.addEventListener(`dragmove`, (e, t) => {
              queueMicrotask(() => {
                if (this.disabled || e.defaultPrevented || !e.nativeEvent) return;
                let { dragOperation: n } = t;
                if (!qm(e.nativeEvent) || !VS(n.source) || !n.shape) return;
                let { actions: r, collisionObserver: i, registry: a } = t,
                  { by: o } = e;
                if (!o) return;
                let s = US(o),
                  { source: c, target: l } = n,
                  { center: u } = n.shape.current,
                  d = [],
                  f = [];
                (sl(() => {
                  for (let e of a.droppables) {
                    let { id: t } = e;
                    if (!e.accepts(c) || (t === l?.id && VS(e)) || !e.element) continue;
                    let n = e.shape,
                      r = new Hh(e.element, { getBoundingClientRect: (e) => Yp(e, void 0, 0.2) });
                    !r.height ||
                      !r.width ||
                      (((s == `down` && u.y + SC < r.center.y) ||
                        (s == `up` && u.y - SC > r.center.y) ||
                        (s == `left` && u.x - SC > r.center.x) ||
                        (s == `right` && u.x + SC < r.center.x)) &&
                        (d.push(e), (e.shape = r), f.push(() => (e.shape = n))));
                  }
                }),
                  e.preventDefault(),
                  i.disable());
                let p = i.computeCollisions(d, Yh);
                sl(() => f.forEach((e) => e()));
                let [m] = p;
                if (!m) return;
                let { id: h } = m,
                  { index: g, group: _ } = c.sortable;
                r.setDropTarget(h).then(() => {
                  let { source: e, target: t, shape: a } = n;
                  if (!e || !VS(e) || !a) return;
                  let { index: o, group: s, target: c } = e.sortable,
                    l = g !== o || _ !== s,
                    u = l ? c : t?.element;
                  if (!u) return;
                  Lm(u);
                  let d = new Hh(u);
                  if (!d) return;
                  let f = cd.delta(d, cd.from(a.current.boundingRectangle), e.alignment);
                  (r.move({ by: f }),
                    l ? r.setDropTarget(e.id).then(() => i.enable()) : i.enable());
                });
              });
            });
          this.destroy = () => {
            (n(), t());
          };
        }
      }),
      (wC = Object.defineProperty),
      (TC = Object.defineProperties),
      (EC = Object.getOwnPropertyDescriptors),
      (DC = Object.getOwnPropertySymbols),
      (OC = Object.prototype.hasOwnProperty),
      (kC = Object.prototype.propertyIsEnumerable),
      (AC = (e, t, n) =>
        t in e
          ? wC(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (jC = (e, t) => {
        for (var n in (t ||= {})) OC.call(t, n) && AC(e, n, t[n]);
        if (DC) for (var n of DC(t)) kC.call(t, n) && AC(e, n, t[n]);
        return e;
      }),
      (MC = (e, t) => TC(e, EC(t))),
      (NC = `__default__`),
      (PC = class extends $d {
        constructor(e) {
          super(e);
          let t = () => {
              let t = new Map();
              for (let n of e.registry.droppables)
                if (n instanceof JC) {
                  let { sortable: e } = n,
                    { group: r } = e,
                    i = t.get(r);
                  (i || ((i = new Set()), t.set(r, i)), i.add(e));
                }
              for (let [e, n] of t) t.set(e, new Set(XS(n)));
              return t;
            },
            n = [
              e.monitor.addEventListener(`dragover`, (e, n) => {
                if (this.disabled) return;
                let { dragOperation: r } = n,
                  { source: i, target: a } = r;
                if (!VS(i) || !VS(a) || i.sortable === a.sortable) return;
                let o = t(),
                  s = i.sortable.group === a.sortable.group,
                  c = o.get(i.sortable.group),
                  l = s ? c : o.get(a.sortable.group);
                !c ||
                  !l ||
                  queueMicrotask(() => {
                    e.defaultPrevented ||
                      n.renderer.rendering.then(() => {
                        let r = t();
                        for (let [e, t] of o.entries()) {
                          let n = Array.from(t).entries();
                          for (let [t, i] of n)
                            if (i.index !== t || i.group !== e || !r.get(e)?.has(i)) return;
                        }
                        let u = i.sortable.element,
                          d = a.sortable.element;
                        if (!d || !u || (!s && a.id === i.sortable.group)) return;
                        let f = XS(c),
                          p = s ? f : XS(l),
                          m = i.sortable.group ?? NC,
                          h = a.sortable.group ?? NC,
                          g = { [m]: f, [h]: p },
                          _ = qS(g, e);
                        if (g === _) return;
                        let v = _[h].indexOf(i.sortable),
                          y = _[h].indexOf(a.sortable);
                        (n.collisionObserver.disable(),
                          JS(u, v, d, y),
                          sl(() => {
                            for (let [e, t] of _[m].entries()) t.index = e;
                            if (!s)
                              for (let [e, t] of _[h].entries())
                                ((t.group = a.sortable.group), (t.index = e));
                          }),
                          n.actions.setDropTarget(i.id).then(() => n.collisionObserver.enable()));
                      });
                  });
              }),
              e.monitor.addEventListener(`dragend`, (e, n) => {
                if (!e.canceled) return;
                let { dragOperation: r } = n,
                  { source: i } = r;
                VS(i) &&
                  ((i.sortable.initialIndex === i.sortable.index &&
                    i.sortable.initialGroup === i.sortable.group) ||
                    queueMicrotask(() => {
                      let e = t(),
                        r = e.get(i.sortable.initialGroup);
                      r &&
                        n.renderer.rendering.then(() => {
                          for (let [t, n] of e.entries()) {
                            let e = Array.from(n).entries();
                            for (let [n, r] of e) if (r.index !== n || r.group !== t) return;
                          }
                          let t = XS(r),
                            n = i.sortable.element,
                            a = t[i.sortable.initialIndex],
                            o = a?.element;
                          !a ||
                            !o ||
                            !n ||
                            (JS(n, a.index, o, i.index),
                            sl(() => {
                              for (let [t, n] of e.entries()) {
                                let e = Array.from(n).values();
                                for (let t of e)
                                  ((t.index = t.initialIndex), (t.group = t.initialGroup));
                              }
                            }));
                        });
                    }));
              }),
            ];
          this.destroy = () => {
            for (let e of n) e();
          };
        }
      }),
      (FC = [CC, PC]),
      (IC = { duration: 250, easing: `cubic-bezier(0.25, 1, 0.5, 1)`, idle: !1 }),
      (LC = new Mu()),
      (zC = [B]),
      (RC = [B]),
      (KC = class {
        constructor(e, t) {
          (bC(this, VC, gC(BC, 8, this)),
            gC(BC, 11, this),
            bC(this, HC),
            bC(this, UC),
            bC(this, WC, gC(BC, 12, this)),
            gC(BC, 15, this),
            bC(this, GC),
            (this.register = () => (
              sl(() => {
                var e, t;
                ((e = this.manager) == null || e.registry.register(this.droppable),
                  (t = this.manager) == null || t.registry.register(this.draggable));
              }),
              () => this.unregister()
            )),
            (this.unregister = () => {
              sl(() => {
                var e, t;
                ((e = this.manager) == null || e.registry.unregister(this.droppable),
                  (t = this.manager) == null || t.registry.unregister(this.draggable));
              });
            }),
            (this.destroy = () => {
              sl(() => {
                (this.droppable.destroy(), this.draggable.destroy());
              });
            }));
          var n = e,
            {
              effects: r = () => [],
              group: i,
              index: a,
              sensors: o,
              type: s,
              transition: c = IC,
              plugins: l = FC,
            } = n,
            u = uC(n, [`effects`, `group`, `index`, `sensors`, `type`, `transition`, `plugins`]);
          ((this.droppable = new JC(u, t, this)),
            (this.draggable = new qC(
              lC(cC({}, u), {
                effects: () => [
                  () => {
                    let e = this.manager?.dragOperation.status;
                    (e?.initializing &&
                      this.id === this.manager?.dragOperation.source?.id &&
                      LC.clear(this.manager),
                      e?.dragging &&
                        LC.set(
                          this.manager,
                          this.id,
                          R(() => ({ initialIndex: this.index, initialGroup: this.group })),
                        ));
                  },
                  () => {
                    let { index: e, group: t, manager: n } = this,
                      r = yC(this, UC),
                      i = yC(this, HC);
                    (e !== r || t !== i) && (xC(this, UC, e), xC(this, HC, t), this.animate());
                  },
                  () => {
                    let { target: e } = this,
                      { feedback: t, isDragSource: n } = this.draggable;
                    t == `move` && n && (this.droppable.disabled = !e);
                  },
                  () => {
                    let { manager: e } = this;
                    for (let t of l) e?.registry.register(t);
                  },
                  ...r(),
                ],
                type: s,
                sensors: o,
              }),
              t,
              this,
            )),
            xC(this, GC, u.element),
            (this.manager = t),
            (this.index = a),
            xC(this, UC, a),
            (this.group = i),
            xC(this, HC, i),
            (this.type = s),
            (this.transition = c));
        }
        get initialIndex() {
          return LC.get(this.manager, this.id)?.initialIndex ?? this.index;
        }
        get initialGroup() {
          return LC.get(this.manager, this.id)?.initialGroup ?? this.group;
        }
        animate() {
          R(() => {
            let { manager: e, transition: t } = this,
              { shape: n } = this.droppable;
            if (!e) return;
            let { idle: r } = e.dragOperation.status;
            !n ||
              !t ||
              (r && !t.idle) ||
              e.renderer.rendering.then(() => {
                let { element: r } = this;
                if (!r) return;
                let i = this.refreshShape();
                if (!i) return;
                let a = {
                    x: n.boundingRectangle.left - i.boundingRectangle.left,
                    y: n.boundingRectangle.top - i.boundingRectangle.top,
                  },
                  { translate: o } = Cm(r),
                  s = Vm(r, o, !1),
                  c = Vm(r, o);
                if (a.x || a.y) {
                  let n = nm(Vp(r)) ? lC(cC({}, t), { duration: 0 }) : t;
                  Bm({
                    element: r,
                    keyframes: {
                      translate: [
                        `${s.x + a.x}px ${s.y + a.y}px ${s.z}`,
                        `${c.x}px ${c.y}px ${c.z}`,
                      ],
                    },
                    options: n,
                  }).then(() => {
                    e.dragOperation.status.dragging || (this.droppable.shape = void 0);
                  });
                }
              });
          });
        }
        get manager() {
          return this.draggable.manager;
        }
        set manager(e) {
          sl(() => {
            ((this.draggable.manager = e), (this.droppable.manager = e));
          });
        }
        set element(e) {
          sl(() => {
            let t = yC(this, GC),
              n = this.droppable.element,
              r = this.draggable.element;
            ((!n || n === t) && (this.droppable.element = e),
              (!r || r === t) && (this.draggable.element = e),
              xC(this, GC, e));
          });
        }
        get element() {
          let e = yC(this, GC);
          if (e) return ih.get(e) ?? e ?? this.droppable.element;
        }
        set target(e) {
          this.droppable.element = e;
        }
        get target() {
          return this.droppable.element;
        }
        set source(e) {
          this.draggable.element = e;
        }
        get source() {
          return this.draggable.element;
        }
        get disabled() {
          return this.draggable.disabled && this.droppable.disabled;
        }
        set feedback(e) {
          this.draggable.feedback = e;
        }
        set disabled(e) {
          sl(() => {
            ((this.droppable.disabled = e), (this.draggable.disabled = e));
          });
        }
        set data(e) {
          sl(() => {
            ((this.droppable.data = e), (this.draggable.data = e));
          });
        }
        set handle(e) {
          this.draggable.handle = e;
        }
        set id(e) {
          sl(() => {
            ((this.droppable.id = e), (this.draggable.id = e));
          });
        }
        get id() {
          return this.droppable.id;
        }
        set sensors(e) {
          this.draggable.sensors = e;
        }
        set modifiers(e) {
          this.draggable.modifiers = e;
        }
        set collisionPriority(e) {
          this.droppable.collisionPriority = e;
        }
        set collisionDetector(e) {
          this.droppable.collisionDetector = e ?? Jh;
        }
        set alignment(e) {
          this.draggable.alignment = e;
        }
        get alignment() {
          return this.draggable.alignment;
        }
        set type(e) {
          sl(() => {
            ((this.droppable.type = e), (this.draggable.type = e));
          });
        }
        get type() {
          return this.draggable.type;
        }
        set accept(e) {
          this.droppable.accept = e;
        }
        get accept() {
          return this.droppable.accept;
        }
        get isDropTarget() {
          return this.droppable.isDropTarget;
        }
        get isDragSource() {
          return this.draggable.isDragSource;
        }
        get isDragging() {
          return this.draggable.isDragging;
        }
        get isDropping() {
          return this.draggable.isDropping;
        }
        get status() {
          return this.draggable.status;
        }
        refreshShape() {
          return this.droppable.refreshShape();
        }
        accepts(e) {
          return this.droppable.accepts(e);
        }
      }),
      (BC = dC()),
      (VC = new WeakMap()),
      (HC = new WeakMap()),
      (UC = new WeakMap()),
      (WC = new WeakMap()),
      (GC = new WeakMap()),
      _C(BC, 4, `index`, zC, KC, VC),
      _C(BC, 4, `group`, RC, KC, WC),
      hC(BC, KC),
      (qC = class extends Pv {
        constructor(e, t, n) {
          (super(e, t), (this.sortable = n));
        }
        get index() {
          return this.sortable.index;
        }
        get initialIndex() {
          return this.sortable.initialIndex;
        }
        get group() {
          return this.sortable.group;
        }
        get initialGroup() {
          return this.sortable.initialGroup;
        }
      }),
      (JC = class extends Gv {
        constructor(e, t, n) {
          (super(e, t), (this.sortable = n));
        }
        get index() {
          return this.sortable.index;
        }
        get group() {
          return this.sortable.group;
        }
      }));
  });
function XC(e) {
  let {
      accept: t,
      collisionDetector: n,
      collisionPriority: r,
      id: i,
      data: a,
      element: o,
      handle: s,
      index: c,
      group: l,
      disabled: u,
      feedback: d,
      modifiers: f,
      sensors: p,
      target: m,
      type: h,
    } = e,
    g = ow(ow({}, IC), e.transition),
    _ = Cy(
      (t) =>
        new KC(
          sw(ow({}, e), {
            transition: g,
            register: !1,
            handle: cy(s),
            element: cy(o),
            target: cy(m),
            feedback: d,
          }),
          t,
        ),
    ),
    v = dy(_, ZC);
  return (
    my(i, () => (_.id = i)),
    vy(() => {
      sl(() => {
        ((_.group = l), (_.index = c));
      });
    }, [_, l, c]),
    my(h, () => (_.type = h)),
    my(t, () => (_.accept = t), void 0, Ml),
    my(a, () => a && (_.data = a)),
    my(
      c,
      () => {
        _.manager?.dragOperation.status.idle && g?.idle && _.refreshShape();
      },
      fy,
    ),
    hy(s, (e) => (_.handle = e)),
    hy(o, (e) => (_.element = e)),
    hy(m, (e) => (_.target = e)),
    my(u, () => (_.disabled = u === !0)),
    my(p, () => (_.sensors = p)),
    my(n, () => (_.collisionDetector = n)),
    my(r, () => (_.collisionPriority = r)),
    my(d, () => (_.feedback = d ?? `default`)),
    my(g, () => (_.transition = g), void 0, Ml),
    my(f, () => (_.modifiers = f), void 0, Ml),
    my(e.alignment, () => (_.alignment = e.alignment)),
    {
      sortable: v,
      get isDragging() {
        return v.isDragging;
      },
      get isDropping() {
        return v.isDropping;
      },
      get isDragSource() {
        return v.isDragSource;
      },
      get isDropTarget() {
        return v.isDropTarget;
      },
      handleRef: (0, QC.useCallback)(
        (e) => {
          _.handle = e ?? void 0;
        },
        [_],
      ),
      ref: (0, QC.useCallback)(
        (e) => {
          (!e && _.element?.isConnected && !_.manager?.dragOperation.status.idle) ||
            (_.element = e ?? void 0);
        },
        [_],
      ),
      sourceRef: (0, QC.useCallback)(
        (e) => {
          (!e && _.source?.isConnected && !_.manager?.dragOperation.status.idle) ||
            (_.source = e ?? void 0);
        },
        [_],
      ),
      targetRef: (0, QC.useCallback)(
        (e) => {
          (!e && _.target?.isConnected && !_.manager?.dragOperation.status.idle) ||
            (_.target = e ?? void 0);
        },
        [_],
      ),
    }
  );
}
function ZC(e, t, n) {
  return !!(e === `isDragSource` && !n && t);
}
var QC,
  $C,
  ew,
  tw,
  nw,
  rw,
  iw,
  aw,
  ow,
  sw,
  cw = t(() => {
    ((QC = e(r(), 1)),
      Nu(),
      YC(),
      ib(),
      yy(),
      ly(),
      ($C = Object.defineProperty),
      (ew = Object.defineProperties),
      (tw = Object.getOwnPropertyDescriptors),
      (nw = Object.getOwnPropertySymbols),
      (rw = Object.prototype.hasOwnProperty),
      (iw = Object.prototype.propertyIsEnumerable),
      (aw = (e, t, n) =>
        t in e
          ? $C(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (ow = (e, t) => {
        for (var n in (t ||= {})) rw.call(t, n) && aw(e, n, t[n]);
        if (nw) for (var n of nw(t)) iw.call(t, n) && aw(e, n, t[n]);
        return e;
      }),
      (sw = (e, t) => ew(e, tw(t))));
  }),
  lw,
  uw = t(() => {
    lw = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%3e%3crect%20x='4.5'%20y='5'%20width='15'%20height='14'%20rx='2.5'%20stroke='%23000'%20stroke-width='1.8'%20/%3e%3cpath%20d='M4.5%208.5h15'%20stroke='%23000'%20stroke-width='1.8'%20stroke-linecap='round'%20/%3e%3ccircle%20cx='7.25'%20cy='6.85'%20r='0.85'%20fill='%23000'%20/%3e%3ccircle%20cx='10'%20cy='6.85'%20r='0.85'%20fill='%23000'%20/%3e%3ccircle%20cx='12.75'%20cy='6.85'%20r='0.85'%20fill='%23000'%20/%3e%3c/svg%3e`;
  }),
  dw,
  fw = t(() => {
    dw = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3e%3cpath%20fill='%23d97757'%20d='m3.127%2010.604%203.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0%207.832l.036-.234.32-.214.455.04%201.009.069%201.513.105%201.097.064%201.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456%201.267.981%201.654%201.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2%202%200%200%201-.068-.484l.496-.674L4.446%200l.662.089.279.242.411.94.666%201.48%201.033%202.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19%201.23-.37%201.93-.243%201.29h.142l.161-.16.654-.868%201.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839%201.13-.524.904.048.072.125-.012%201.897-.403%201.024-.186%201.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04%201.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71%201.331%201.202%201.667%201.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432%201.557%202.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448%204.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953%201.307-1.448%201.957-1.146%201.227-.274.109-.477-.247.045-.44.266-.39%201.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212%202.736-.75.096-.324-.302.04-.496.154-.162%201.267-.871z'/%3e%3c/svg%3e`;
  }),
  pw,
  mw = t(() => {
    pw = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20256%20260'%3e%3cpath%20fill='%23000000'%20d='M239.184%20106.203a64.716%2064.716%200%200%200-5.576-53.103C219.452%2028.459%20191%2015.784%20163.213%2021.74A65.586%2065.586%200%200%200%2052.096%2045.22a64.716%2064.716%200%200%200-43.23%2031.36c-14.31%2024.602-11.061%2055.634%208.033%2076.74a64.665%2064.665%200%200%200%205.525%2053.102c14.174%2024.65%2042.644%2037.324%2070.446%2031.36a64.72%2064.72%200%200%200%2048.754%2021.744c28.481.025%2053.714-18.361%2062.414-45.481a64.767%2064.767%200%200%200%2043.229-31.36c14.137-24.558%2010.875-55.423-8.083-76.483Zm-97.56%20136.338a48.397%2048.397%200%200%201-31.105-11.255l1.535-.87%2051.67-29.825a8.595%208.595%200%200%200%204.247-7.367v-72.85l21.845%2012.636c.218.111.37.32.409.563v60.367c-.056%2026.818-21.783%2048.545-48.601%2048.601Zm-104.466-44.61a48.345%2048.345%200%200%201-5.781-32.589l1.534.921%2051.722%2029.826a8.339%208.339%200%200%200%208.441%200l63.181-36.425v25.221a.87.87%200%200%201-.358.665l-52.335%2030.184c-23.257%2013.398-52.97%205.431-66.404-17.803ZM23.549%2085.38a48.499%2048.499%200%200%201%2025.58-21.333v61.39a8.288%208.288%200%200%200%204.195%207.316l62.874%2036.272-21.845%2012.636a.819.819%200%200%201-.767%200L41.353%20151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466%2041.695-63.08-36.63L161.73%2077.86a.819.819%200%200%201%20.768%200l52.233%2030.184a48.6%2048.6%200%200%201-7.316%2087.635v-61.391a8.544%208.544%200%200%200-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39%208.39%200%200%200-8.492%200L99.98%2099.808V74.587a.716.716%200%200%201%20.307-.665l52.233-30.133a48.652%2048.652%200%200%201%2072.236%2050.391v.205ZM88.061%20139.097l-21.845-12.585a.87.87%200%200%201-.41-.614V65.685a48.652%2048.652%200%200%201%2079.757-37.346l-1.535.87-51.67%2029.825a8.595%208.595%200%200%200-4.246%207.367l-.051%2072.697Zm11.868-25.58%2028.138-16.217%2028.188%2016.218v32.434l-28.086%2016.218-28.188-16.218-.052-32.434Z'/%3e%3c/svg%3e`;
  }),
  hw,
  gw = t(() => {
    hw = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20preserveAspectRatio='xMidYMid'%20viewBox='0%200%20256%20208'%3e%3cpath%20fill='%23fff'%20d='M205.3%2031.4c14%2014.8%2020%2035.2%2022.5%2063.6%206.6%200%2012.8%201.5%2017%207.2l7.8%2010.6c2.2%203%203.4%206.6%203.4%2010.4v28.7a12%2012%200%200%201-4.8%209.5C215.9%20187.2%20172.3%20208%20128%20208c-49%200-98.2-28.3-123.2-46.6a12%2012%200%200%201-4.8-9.5v-28.7c0-3.8%201.2-7.4%203.4-10.5l7.8-10.5c4.2-5.7%2010.4-7.2%2017-7.2%202.5-28.4%208.4-48.8%2022.5-63.6C77.3%203.2%20112.6%200%20127.6%200h.4c14.7%200%2050.4%202.9%2077.3%2031.4ZM128%2078.7c-3%200-6.5.2-10.3.6a27.1%2027.1%200%200%201-6%2012.1%2045%2045%200%200%201-32%2013c-6.8%200-13.9-1.5-19.7-5.2-5.5%201.9-10.8%204.5-11.2%2011-.5%2012.2-.6%2024.5-.6%2036.8%200%206.1%200%2012.3-.2%2018.5%200%203.6%202.2%206.9%205.5%208.4C79.9%20185.9%20105%20192%20128%20192s48-6%2074.5-18.1a9.4%209.4%200%200%200%205.5-8.4c.3-18.4%200-37-.8-55.3-.4-6.6-5.7-9.1-11.2-11-5.8%203.7-13%205.1-19.7%205.1a45%2045%200%200%201-32-12.9%2027.1%2027.1%200%200%201-6-12.1c-3.4-.4-6.9-.5-10.3-.6Zm-27%2044c5.8%200%2010.5%204.6%2010.5%2010.4v19.2a10.4%2010.4%200%200%201-20.8%200V133c0-5.8%204.6-10.4%2010.4-10.4Zm53.4%200c5.8%200%2010.4%204.6%2010.4%2010.4v19.2a10.4%2010.4%200%200%201-20.8%200V133c0-5.8%204.7-10.4%2010.4-10.4Zm-73-94.4c-11.2%201.1-20.6%204.8-25.4%2010-10.4%2011.3-8.2%2040.1-2.2%2046.2A31.2%2031.2%200%200%200%2075%2091.7c6.8%200%2019.6-1.5%2030.1-12.2%204.7-4.5%207.5-15.7%207.2-27-.3-9.1-2.9-16.7-6.7-19.9-4.2-3.6-13.6-5.2-24.2-4.3Zm69%204.3c-3.8%203.2-6.4%2010.8-6.7%2019.9-.3%2011.3%202.5%2022.5%207.2%2027a41.7%2041.7%200%200%200%2030%2012.2c8.9%200%2017-2.9%2021.3-7.2%206-6.1%208.2-34.9-2.2-46.3-4.8-5-14.2-8.8-25.4-9.9-10.6-1-20%20.7-24.2%204.3ZM128%2056c-2.6%200-5.6.2-9%20.5.4%201.7.5%203.7.7%205.7%200%201.5%200%203-.2%204.5%203.2-.3%206-.3%208.5-.3%202.6%200%205.3%200%208.5.3-.2-1.6-.2-3-.2-4.5.2-2%20.3-4%20.7-5.7-3.4-.3-6.4-.5-9-.5Z'/%3e%3c/svg%3e`;
  }),
  _w,
  vw = t(() => {
    _w = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%20fill='none'%3e%3cdefs%3e%3clinearGradient%20id='gemini-gradient'%20x1='14'%20y1='46'%20x2='50'%20y2='18'%20gradientUnits='userSpaceOnUse'%3e%3cstop%20offset='0'%20stop-color='%234C8DF6'%20/%3e%3cstop%20offset='0.52'%20stop-color='%238F9BFF'%20/%3e%3cstop%20offset='1'%20stop-color='%23C68CFF'%20/%3e%3c/linearGradient%3e%3c/defs%3e%3cpath%20d='M32%204c.55%200%201.04.38%201.18.92%201.46%205.67%204.18%2010.67%208.16%2014.99%204%204.3%208.78%207.18%2014.34%208.61.54.15.92.63.92%201.18%200%20.55-.38%201.04-.92%201.18-5.56%201.43-10.34%204.3-14.34%208.61-3.98%204.32-6.7%209.32-8.16%2014.99A1.219%201.219%200%200%201%2032%2056a1.22%201.22%200%200%201-1.18-.92c-1.46-5.67-4.18-10.67-8.16-14.99-4-4.31-8.78-7.18-14.34-8.61A1.22%201.22%200%200%201%207.4%2030.3c0-.55.38-1.03.92-1.18%205.56-1.43%2010.34-4.3%2014.34-8.61%203.98-4.32%206.7-9.32%208.16-14.99A1.22%201.22%200%200%201%2032%204Z'%20fill='url(%23gemini-gradient)'%20/%3e%3c/svg%3e`;
  }),
  yw,
  bw = t(() => {
    yw = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2036'%3e%3cpath%20fill='%235B8EEB'%20d='M18%2024H6V12H18V24Z'%20opacity='0.5'/%3e%3cpath%20fill='%235B8EEB'%20d='M18%206H6V24H18V6ZM24%2030H0V0H24V30Z'/%3e%3c/svg%3e`;
  }),
  xw,
  Sw = t(() => {
    xw = `data:image/svg+xml,%3csvg%20width='128'%20height='128'%20viewBox='0%200%20128%20128'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M25%2034H103V48H72V95H56V48H25V34Z'%20fill='%23101820'/%3e%3cpath%20d='M44%2075C44%2064.5066%2052.5066%2056%2063%2056H90C98.8366%2056%20106%2063.1634%20106%2072C106%2080.8366%2098.8366%2088%2090%2088H58V74H88C91.3137%2074%2094%2071.3137%2094%2068C94%2064.6863%2091.3137%2062%2088%2062H63C60.2386%2062%2058%2064.2386%2058%2067V95H44V75Z'%20fill='%23101820'/%3e%3c/svg%3e`;
  }),
  Cw,
  ww = t(() => {
    (uw(),
      fw(),
      mw(),
      gw(),
      vw(),
      bw(),
      Sw(),
      (Cw = { browser: lw, claude: dw, codex: pw, copilot: hw, gemini: _w, opencode: yw, t3: xw }));
  });
function Tw({
  actions: e,
  isCollapsed: t = !1,
  isCollapsible: n = !1,
  onToggleCollapsed: r,
  title: i,
}) {
  let a = `${t ? `Expand` : `Collapse`} ${i}`;
  return (0, Ew.jsxs)(`div`, {
    className: `section-titlebar`,
    "data-empty-space-blocking": `true`,
    children: [
      (0, Ew.jsxs)(`div`, {
        className: `section-titlebar-main`,
        children: [
          n
            ? (0, Ew.jsx)(`button`, {
                "aria-label": a,
                className: `section-titlebar-toggle`,
                "data-empty-space-blocking": `true`,
                onClick: r,
                title: a,
                type: `button`,
                children: t
                  ? (0, Ew.jsx)(Eb, {
                      "aria-hidden": `true`,
                      className: `section-titlebar-toggle-icon`,
                    })
                  : (0, Ew.jsx)(Cb, {
                      "aria-hidden": `true`,
                      className: `section-titlebar-toggle-icon`,
                    }),
              })
            : null,
          (0, Ew.jsx)(`span`, { className: `section-titlebar-label`, children: i }),
        ],
      }),
      e ? (0, Ew.jsx)(`div`, { className: `section-titlebar-actions`, children: e }) : null,
    ],
  });
}
var Ew,
  Dw = t(() => {
    (Tx(),
      (Ew = i()),
      (Tw.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SectionHeader`,
        props: {
          actions: { required: !1, tsType: { name: `ReactNode` }, description: `` },
          isCollapsed: {
            required: !1,
            tsType: { name: `boolean` },
            description: ``,
            defaultValue: { value: `false`, computed: !1 },
          },
          isCollapsible: {
            required: !1,
            tsType: { name: `boolean` },
            description: ``,
            defaultValue: { value: `false`, computed: !1 },
          },
          onToggleCollapsed: {
            required: !1,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `() => void`,
              signature: { arguments: [], return: { name: `void` } },
            },
            description: ``,
          },
          title: { required: !0, tsType: { name: `string` }, description: `` },
        },
      }));
  }),
  Ow,
  kw,
  Aw = t(() => {
    ((Ow = (e) => {
      let t,
        n = new Set(),
        r = (e, r) => {
          let i = typeof e == `function` ? e(t) : e;
          if (!Object.is(i, t)) {
            let e = t;
            ((t = (r ?? (typeof i != `object` || !i)) ? i : Object.assign({}, t, i)),
              n.forEach((n) => n(t, e)));
          }
        },
        i = () => t,
        a = {
          setState: r,
          getState: i,
          getInitialState: () => o,
          subscribe: (e) => (n.add(e), () => n.delete(e)),
        },
        o = (t = e(r, i, a));
      return a;
    }),
      (kw = (e) => (e ? Ow(e) : Ow)));
  });
function jw(e, t = Nw) {
  let n = Mw.useSyncExternalStore(
    e.subscribe,
    Mw.useCallback(() => t(e.getState()), [e, t]),
    Mw.useCallback(() => t(e.getInitialState()), [e, t]),
  );
  return (Mw.useDebugValue(n), n);
}
var Mw,
  Nw,
  Pw,
  Fw,
  Iw = t(() => {
    ((Mw = e(r(), 1)),
      Aw(),
      (Nw = (e) => e),
      (Pw = (e) => {
        let t = kw(e),
          n = (e) => jw(t, e);
        return (Object.assign(n, t), n);
      }),
      (Fw = (e) => (e ? Pw(e) : Pw)));
  }),
  Lw = t(() => {
    (Aw(), Iw());
  });
function Rw() {
  return {
    browserGroupIds: [],
    daemonSessionsState: void 0,
    gitCommitDraft: void 0,
    groupOrder: [],
    groupsById: {},
    hud: {
      agentManagerZoomPercent: 100,
      agents: lS(),
      collapsedSections: zx(),
      commands: mS(),
      completionBellEnabled: !1,
      completionSound: `ping`,
      completionSoundLabel: `Ping`,
      debuggingMode: !1,
      focusedSessionTitle: void 0,
      git: vS(),
      highlightedVisibleCount: 1,
      isFocusModeActive: !1,
      pendingAgentIds: [],
      sectionVisibility: Rx(),
      showCloseButtonOnSessionCards: !1,
      showHotkeysOnSessionCards: !1,
      theme: Bw(),
      viewMode: `grid`,
      visibleCount: 1,
      visibleSlotLabels: [],
    },
    pendingFocusedSessionId: void 0,
    previousSessions: [],
    revision: 0,
    scratchPadContent: ``,
    sessionIdsByGroup: {},
    sessionsById: {},
    workspaceGroupIds: [],
  };
}
function zw() {
  Xw.getState().reset();
}
function Bw() {
  return typeof document > `u`
    ? `dark-blue`
    : document.body.classList.contains(`vscode-light`) ||
        document.body.classList.contains(`vscode-high-contrast-light`)
      ? `light-blue`
      : `dark-blue`;
}
function Vw(e, t) {
  if (t.revision < e.revision) return e;
  let n = Gw(t.groups, e.pendingFocusedSessionId),
    r = Ww(e, n.groups);
  return {
    browserGroupIds: r.browserGroupIds,
    groupOrder: r.groupOrder,
    groupsById: r.groupsById,
    hud: t.hud,
    pendingFocusedSessionId: n.pendingFocusedSessionId,
    previousSessions: t.previousSessions,
    revision: t.revision,
    scratchPadContent: t.scratchPadContent,
    sessionIdsByGroup: r.sessionIdsByGroup,
    sessionsById: r.sessionsById,
    workspaceGroupIds: r.workspaceGroupIds,
  };
}
function Hw(e, t) {
  let n = e.sessionsById[t.session.sessionId];
  return !n || Jw(n, t.session)
    ? e
    : { sessionsById: { ...e.sessionsById, [t.session.sessionId]: t.session } };
}
function Uw(e, t, n) {
  if (!e.groupsById[t] || !e.sessionsById[n]) return e;
  let r = e.groupsById,
    i = e.sessionsById;
  for (let a of e.groupOrder) {
    let o = e.groupsById[a];
    if (!o) continue;
    let s = a === t;
    o.isActive !== s &&
      (r === e.groupsById && (r = { ...e.groupsById }), (r[a] = { ...o, isActive: s }));
    for (let t of e.sessionIdsByGroup[a] ?? []) {
      let r = e.sessionsById[t];
      if (!r) continue;
      let a = s && t === n,
        c = o.kind !== `browser` && s && t === n ? !0 : r.isVisible;
      (r.isFocused === a && r.isVisible === c) ||
        (i === e.sessionsById && (i = { ...e.sessionsById }),
        (i[t] = { ...r, isFocused: a, isVisible: c }));
    }
  }
  return r === e.groupsById && i === e.sessionsById && e.pendingFocusedSessionId === n
    ? e
    : { groupsById: r, pendingFocusedSessionId: n, sessionsById: i };
}
function Ww(e, t) {
  let n = t.map((e) => e.groupId),
    r = [],
    i = [],
    a = {},
    o = {},
    s = {};
  for (let n of t) {
    n.kind === `browser` ? r.push(n.groupId) : i.push(n.groupId);
    let t = e.groupsById[n.groupId],
      c = Kw(n);
    a[n.groupId] = t && qw(t, c) ? t : c;
    let l = n.sessions.map((e) => e.sessionId),
      u = e.sessionIdsByGroup[n.groupId];
    o[n.groupId] = u && Yw(u, l) ? u : l;
    for (let t of n.sessions) {
      let n = e.sessionsById[t.sessionId];
      s[t.sessionId] = n && Jw(n, t) ? n : t;
    }
  }
  return {
    browserGroupIds: Yw(e.browserGroupIds, r) ? e.browserGroupIds : r,
    groupOrder: Yw(e.groupOrder, n) ? e.groupOrder : n,
    groupsById: a,
    sessionIdsByGroup: o,
    sessionsById: s,
    workspaceGroupIds: Yw(e.workspaceGroupIds, i) ? e.workspaceGroupIds : i,
  };
}
function Gw(e, t) {
  if (!t) return { groups: [...e], pendingFocusedSessionId: void 0 };
  let n = e.find((e) => e.sessions.some((e) => e.sessionId === t));
  return !n || n.sessions.some((e) => e.sessionId === t && e.isFocused)
    ? { groups: [...e], pendingFocusedSessionId: void 0 }
    : {
        groups: e.map((e) => {
          let r = e.groupId === n.groupId;
          return {
            ...e,
            isActive: r,
            sessions: e.sessions.map((n) => ({
              ...n,
              isFocused: r && n.sessionId === t,
              isVisible: e.kind !== `browser` && r && n.sessionId === t ? !0 : n.isVisible,
            })),
          };
        }),
        pendingFocusedSessionId: t,
      };
}
function Kw(e) {
  return {
    groupId: e.groupId,
    isActive: e.isActive,
    isFocusModeActive: e.isFocusModeActive,
    kind: e.kind,
    layoutVisibleCount: e.layoutVisibleCount,
    title: e.title,
    viewMode: e.viewMode,
    visibleCount: e.visibleCount,
  };
}
function qw(e, t) {
  return (
    e.groupId === t.groupId &&
    e.isActive === t.isActive &&
    e.isFocusModeActive === t.isFocusModeActive &&
    e.kind === t.kind &&
    e.layoutVisibleCount === t.layoutVisibleCount &&
    e.title === t.title &&
    e.viewMode === t.viewMode &&
    e.visibleCount === t.visibleCount
  );
}
function Jw(e, t) {
  return (
    e.activity === t.activity &&
    e.activityLabel === t.activityLabel &&
    e.agentIcon === t.agentIcon &&
    e.alias === t.alias &&
    e.column === t.column &&
    e.detail === t.detail &&
    e.isFocused === t.isFocused &&
    e.isRunning === t.isRunning &&
    e.isVisible === t.isVisible &&
    e.kind === t.kind &&
    e.primaryTitle === t.primaryTitle &&
    e.row === t.row &&
    e.sessionId === t.sessionId &&
    e.sessionNumber === t.sessionNumber &&
    e.shortcutLabel === t.shortcutLabel &&
    e.terminalTitle === t.terminalTitle
  );
}
function Yw(e, t) {
  return e.length === t.length ? e.every((e, n) => e === t[n]) : !1;
}
var Xw,
  Zw = t(() => {
    (Lw(),
      pS(),
      _S(),
      ES(),
      AS(),
      (Xw = Fw((e) => ({
        ...Rw(),
        applyLocalFocus: (t, n) => {
          e((e) => Uw(e, t, n));
        },
        applySessionPresentationMessage: (t) => {
          e((e) => Hw(e, t));
        },
        applySidebarMessage: (t) => {
          e((e) => Vw(e, t));
        },
        reset: () => {
          e(Rw());
        },
        setDaemonSessionsState: (t) => {
          e({ daemonSessionsState: t });
        },
        setGitCommitDraft: (t) => {
          e({ gitCommitDraft: t });
        },
        setSectionCollapsed: (t, n) => {
          e((e) =>
            e.hud.collapsedSections[t] === n
              ? e
              : { hud: { ...e.hud, collapsedSections: { ...e.hud.collapsedSections, [t]: n } } },
          );
        },
      }))));
  }),
  Qw,
  $w = t(() => {
    Qw = 1050;
  });
function eT({ draft: e, isOpen: t, onCancel: n, onSave: r }) {
  let [i, a] = (0, nT.useState)(e.command),
    [o, s] = (0, nT.useState)(e.icon ?? `custom`),
    [c, l] = (0, nT.useState)(e.name),
    u = (0, nT.useId)(),
    d = (0, nT.useId)();
  if (
    ((0, nT.useEffect)(() => {
      t && (a(e.command), s(e.icon ?? `custom`), l(e.name));
    }, [e, t]),
    (0, nT.useEffect)(() => {
      if (!t) return;
      let e = (e) => {
        e.key === `Escape` && n();
      };
      return (
        document.addEventListener(`keydown`, e),
        () => {
          document.removeEventListener(`keydown`, e);
        }
      );
    }, [t, n]),
    !t)
  )
    return null;
  let f = c.trim().length === 0 || i.trim().length === 0;
  return (0, tT.createPortal)(
    (0, rT.jsxs)(`div`, {
      className: `confirm-modal-root`,
      role: `presentation`,
      children: [
        (0, rT.jsx)(`button`, { className: `confirm-modal-backdrop`, onClick: n, type: `button` }),
        (0, rT.jsxs)(`div`, {
          "aria-describedby": u,
          "aria-labelledby": d,
          "aria-modal": `true`,
          className: `confirm-modal command-config-modal`,
          role: `dialog`,
          children: [
            (0, rT.jsx)(`button`, {
              "aria-label": `Close agent configuration`,
              className: `confirm-modal-close-button`,
              onClick: n,
              type: `button`,
              children: (0, rT.jsx)(Cx, {
                "aria-hidden": `true`,
                className: `toolbar-tabler-icon`,
                stroke: 1.8,
              }),
            }),
            (0, rT.jsxs)(`div`, {
              className: `confirm-modal-header confirm-modal-header-with-close`,
              children: [
                (0, rT.jsx)(`div`, {
                  className: `confirm-modal-title`,
                  id: d,
                  children: `Configure agent`,
                }),
                (0, rT.jsx)(`div`, {
                  className: `confirm-modal-description`,
                  id: u,
                  children: `Launches a new VSmux session and runs this agent command in it.`,
                }),
              ],
            }),
            (0, rT.jsxs)(`div`, {
              className: `command-config-fields`,
              children: [
                (0, rT.jsxs)(`label`, {
                  className: `command-config-field`,
                  children: [
                    (0, rT.jsx)(`span`, {
                      className: `command-config-label`,
                      children: `Agent Type`,
                    }),
                    (0, rT.jsxs)(`select`, {
                      className: `group-title-input command-config-input`,
                      onChange: (e) => {
                        let t = e.currentTarget.value,
                          n = uS(o === `custom` ? void 0 : o),
                          r = uS(t === `custom` ? void 0 : t);
                        (s(t),
                          r &&
                            (l((e) => (e.trim().length === 0 || e === n?.name ? r.name : e)),
                            a((e) => (e.trim().length === 0 || e === n?.command ? r.command : e))));
                      },
                      value: o,
                      children: [
                        (0, rT.jsx)(`option`, { value: `custom`, children: `Custom` }),
                        fS.map((e) =>
                          (0, rT.jsx)(`option`, { value: e.icon, children: e.name }, e.agentId),
                        ),
                      ],
                    }),
                  ],
                }),
                (0, rT.jsxs)(`label`, {
                  className: `command-config-field`,
                  children: [
                    (0, rT.jsx)(`span`, { className: `command-config-label`, children: `Name` }),
                    (0, rT.jsx)(`input`, {
                      autoFocus: !0,
                      className: `group-title-input command-config-input`,
                      onChange: (e) => l(e.currentTarget.value),
                      placeholder: `Codex`,
                      value: c,
                    }),
                  ],
                }),
                (0, rT.jsxs)(`label`, {
                  className: `command-config-field`,
                  children: [
                    (0, rT.jsx)(`span`, { className: `command-config-label`, children: `Command` }),
                    (0, rT.jsx)(`textarea`, {
                      className: `group-title-input command-config-input command-config-textarea`,
                      onChange: (e) => a(e.currentTarget.value),
                      placeholder: `codex`,
                      rows: 3,
                      value: i,
                    }),
                  ],
                }),
              ],
            }),
            (0, rT.jsxs)(`div`, {
              className: `confirm-modal-actions`,
              children: [
                (0, rT.jsx)(`button`, {
                  className: `secondary confirm-modal-button`,
                  onClick: n,
                  type: `button`,
                  children: `Cancel`,
                }),
                (0, rT.jsx)(`button`, {
                  className: `primary confirm-modal-button`,
                  disabled: f,
                  onClick: () =>
                    r({
                      agentId: e.agentId,
                      command: i.trim(),
                      icon: o === `custom` ? void 0 : o,
                      name: c.trim(),
                    }),
                  type: `button`,
                  children: `Save`,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    document.body,
  );
}
var tT,
  nT,
  rT,
  iT = t(() => {
    (Tx(), (tT = e(a())), (nT = e(r())), pS(), (rT = i()));
  });
function aT(e, t) {
  return {
    x: Math.max(yT, Math.min(e, window.innerWidth - bT - yT)),
    y: Math.max(yT, Math.min(t, window.innerHeight - xT - yT)),
  };
}
function oT(e) {
  return { agentId: e, kind: `sidebar-agent` };
}
function sT(e) {
  if (!mT(e)) return;
  let t = e.data;
  if (!(!gT(t) || !(`kind` in t)))
    return t.kind === `sidebar-agent` && typeof t.agentId == `string`
      ? { agentId: t.agentId, kind: `sidebar-agent` }
      : void 0;
}
function cT({
  createRequestId: e,
  isCollapsed: t,
  isVisible: n,
  onToggleCollapsed: r,
  titlebarActions: i,
  vscode: a,
}) {
  let { agents: o, pendingAgentIds: s } = Xw(
      Mx((e) => ({ agents: e.hud.agents, pendingAgentIds: e.hud.pendingAgentIds })),
    ),
    [c, l] = (0, vT.useState)(),
    [u, d] = (0, vT.useState)(),
    [f, p] = (0, vT.useState)(),
    m = (0, vT.useRef)(null);
  (0, vT.useEffect)(() => {
    if (!c) return;
    let e = (e) => {
        (hT(e.target) && m.current?.contains(e.target)) || l(void 0);
      },
      t = (e) => {
        (hT(e.target) && m.current?.contains(e.target)) || l(void 0);
      },
      n = (e) => {
        e.key === `Escape` && l(void 0);
      },
      r = () => {
        l(void 0);
      },
      i = () => {
        document.visibilityState !== `visible` && l(void 0);
      };
    return (
      document.addEventListener(`pointerdown`, e),
      document.addEventListener(`contextmenu`, t),
      document.addEventListener(`keydown`, n),
      document.addEventListener(`visibilitychange`, i),
      window.addEventListener(`blur`, r),
      () => {
        (document.removeEventListener(`pointerdown`, e),
          document.removeEventListener(`contextmenu`, t),
          document.removeEventListener(`keydown`, n),
          document.removeEventListener(`visibilitychange`, i),
          window.removeEventListener(`blur`, r));
      }
    );
  }, [c]);
  let h = (e) => {
    p({ agentId: e.agentId, command: e.command ?? ``, icon: e.icon, name: e.name });
  };
  ((0, vT.useEffect)(() => {
    d((e) => fT(e, o));
  }, [o]),
    (0, vT.useEffect)(() => {
      e !== 0 && (l(void 0), p({ agentId: void 0, command: ``, icon: void 0, name: `` }));
    }, [e]));
  let g = (0, vT.useMemo)(() => {
    let e = new Map(o.map((e) => [e.agentId, e]));
    return (
      u
        ? dT(
            u,
            o.map((e) => e.agentId),
          )
        : o.map((e) => e.agentId)
    )
      .map((t) => e.get(t))
      .filter((e) => e !== void 0);
  }, [o, u]);
  return (0, K.jsxs)(K.Fragment, {
    children: [
      n
        ? (0, K.jsxs)(`section`, {
            className: `commands-section`,
            children: [
              (0, K.jsx)(Tw, {
                actions: i,
                isCollapsed: t,
                isCollapsible: !0,
                onToggleCollapsed: () => r(!t),
                title: `Agents`,
              }),
              t
                ? null
                : (0, K.jsx)(`div`, {
                    className: `card commands-panel`,
                    children: (0, K.jsx)(nl, {
                      delay: Qw,
                      children: (0, K.jsx)(by, {
                        onDragEnd: (e) => {
                          if (e.canceled || !HS(e.operation)) return;
                          let { source: t, target: n } = e.operation;
                          if (!t || !n) return;
                          let r = sT(t),
                            i = sT(n);
                          if (!r || !i || r.agentId === i.agentId) return;
                          let { initialIndex: o } = t,
                            s = n.index;
                          if (s == null || o === s) return;
                          let c = uT(
                            g.map((e) => e.agentId),
                            o,
                            s,
                          );
                          (d(c), a.postMessage({ agentIds: c, type: `syncSidebarAgentOrder` }));
                        },
                        children: (0, K.jsx)(`div`, {
                          className: `agents-grid`,
                          children: g.map((e, t) =>
                            (0, K.jsx)(
                              lT,
                              {
                                agent: e,
                                index: t,
                                isLaunching: s.includes(e.agentId),
                                isContextMenuOpen: c?.agent.agentId === e.agentId,
                                onContextMenu: (t) => {
                                  (t.preventDefault(),
                                    t.stopPropagation(),
                                    l({ agent: e, position: aT(t.clientX, t.clientY) }));
                                },
                                onRun: () => {
                                  if (!e.command) {
                                    h(e);
                                    return;
                                  }
                                  a.postMessage({ agentId: e.agentId, type: `runSidebarAgent` });
                                },
                              },
                              e.agentId,
                            ),
                          ),
                        }),
                      }),
                    }),
                  }),
            ],
          })
        : null,
      c
        ? (0, _T.createPortal)(
            (0, K.jsxs)(`div`, {
              className: `session-context-menu`,
              onClick: (e) => e.stopPropagation(),
              onContextMenu: (e) => {
                (e.preventDefault(), e.stopPropagation());
              },
              ref: m,
              role: `menu`,
              style: { left: `${c.position.x}px`, top: `${c.position.y}px`, width: `${bT}px` },
              children: [
                (0, K.jsxs)(`button`, {
                  className: `session-context-menu-item`,
                  onClick: () => {
                    (l(void 0), h(c.agent));
                  },
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, K.jsx)($b, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Configure Agent`,
                  ],
                }),
                (0, K.jsxs)(`button`, {
                  className: `session-context-menu-item session-context-menu-item-danger`,
                  onClick: () => {
                    (l(void 0),
                      a.postMessage({ agentId: c.agent.agentId, type: `deleteSidebarAgent` }));
                  },
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, K.jsx)(mx, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Delete Agent`,
                  ],
                }),
              ],
            }),
            document.body,
          )
        : null,
      f
        ? (0, K.jsx)(eT, {
            draft: f,
            isOpen: !0,
            onCancel: () => p(void 0),
            onSave: (e) => {
              (p(void 0),
                a.postMessage({
                  agentId: e.agentId,
                  command: e.command,
                  icon: e.icon,
                  name: e.name,
                  type: `saveSidebarAgent`,
                }));
            },
          })
        : null,
    ],
  });
}
function lT({
  agent: e,
  index: t,
  isLaunching: n,
  isContextMenuOpen: r,
  onContextMenu: i,
  onRun: a,
}) {
  let o = XC({
    accept: `sidebar-agent`,
    data: oT(e.agentId),
    disabled: r || n,
    group: `sidebar-agents`,
    id: e.agentId,
    index: t,
    type: `sidebar-agent`,
  });
  return (0, K.jsxs)(Bs, {
    children: [
      (0, K.jsx)(sc, {
        render: (0, K.jsx)(`button`, {
          "aria-busy": n,
          "aria-label": n ? `Starting ${e.name}` : `Launch ${e.name}`,
          className: `agent-button`,
          "data-dragging": String(!!o.isDragging),
          "data-empty-space-blocking": `true`,
          "data-icon-only": `true`,
          "data-loading": String(n),
          disabled: n,
          onClick: n ? void 0 : a,
          onContextMenu: n ? void 0 : i,
          ref: o.ref,
          type: `button`,
          children: (0, K.jsx)(`span`, {
            className: `agent-button-icon-shell`,
            children: n
              ? (0, K.jsx)(Xb, {
                  "aria-hidden": `true`,
                  className: `agent-button-loading-icon`,
                  size: 18,
                  stroke: 1.8,
                })
              : (0, K.jsx)(K.Fragment, {
                  children: e.icon
                    ? (0, K.jsx)(`img`, {
                        alt: ``,
                        "aria-hidden": `true`,
                        className: `agent-button-icon`,
                        "data-agent-icon": e.icon,
                        src: Cw[e.icon],
                      })
                    : (0, K.jsx)(kb, {
                        "aria-hidden": `true`,
                        className: `agent-button-fallback-icon`,
                        size: 18,
                        stroke: 1.8,
                      }),
                }),
          }),
        }),
      }),
      (0, K.jsx)(bc, {
        children: (0, K.jsx)(Jc, {
          className: `tooltip-positioner`,
          sideOffset: 8,
          children: (0, K.jsx)(Qc, {
            className: `tooltip-popup`,
            children: n ? `Starting ${e.name}` : e.command ? e.name : `Configure ${e.name}`,
          }),
        }),
      }),
    ],
  });
}
function uT(e, t, n) {
  let r = [...e],
    [i] = r.splice(t, 1);
  return (i === void 0 || r.splice(n, 0, i), r);
}
function dT(e, t) {
  let n = new Set(t),
    r = e.filter((e) => n.has(e));
  for (let e of t) r.includes(e) || r.push(e);
  return r;
}
function fT(e, t) {
  if (!e) return;
  let n = t.map((e) => e.agentId),
    r = dT(e, n);
  return pT(r, n) ? void 0 : r;
}
function pT(e, t) {
  return e.length === t.length ? e.every((e, n) => e === t[n]) : !1;
}
function mT(e) {
  return gT(e) && `data` in e;
}
function hT(e) {
  return e instanceof Node;
}
function gT(e) {
  return typeof e == `object` && !!e;
}
var _T,
  vT,
  K,
  yT,
  bT,
  xT,
  ST = t(() => {
    (al(),
      ib(),
      cw(),
      Tx(),
      (_T = e(a())),
      (vT = e(r())),
      Px(),
      ww(),
      Dw(),
      Zw(),
      $w(),
      iT(),
      (K = i()),
      (yT = 12),
      (bT = 180),
      (xT = 110),
      (cT.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `AgentsPanel`,
        props: {
          createRequestId: { required: !0, tsType: { name: `number` }, description: `` },
          isCollapsed: { required: !0, tsType: { name: `boolean` }, description: `` },
          isVisible: { required: !0, tsType: { name: `boolean` }, description: `` },
          onToggleCollapsed: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `(collapsed: boolean) => void`,
              signature: {
                arguments: [{ type: { name: `boolean` }, name: `collapsed` }],
                return: { name: `void` },
              },
            },
            description: ``,
          },
          titlebarActions: { required: !1, tsType: { name: `ReactNode` }, description: `` },
          vscode: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  postMessage: (message: SidebarToExtensionMessage) => void;
}`,
              signature: {
                properties: [
                  {
                    key: `postMessage`,
                    value: {
                      name: `signature`,
                      type: `function`,
                      raw: `(message: SidebarToExtensionMessage) => void`,
                      signature: {
                        arguments: [
                          {
                            type: {
                              name: `union`,
                              raw: `| {
    type: 'ready';
  }
| {
    type: 'openSettings';
  }
| {
    type: 'toggleCompletionBell';
  }
| {
    type: 'refreshDaemonSessions';
  }
| {
    type: 'killTerminalDaemon';
  }
| {
    type: 'killDaemonSession';
    sessionId: string;
    workspaceId: string;
  }
| {
    type: 'moveSidebarToOtherSide';
  }
| {
    type: 'createSession';
  }
| {
    type: 'openBrowser';
  }
| {
    type: 'createSessionInGroup';
    groupId: string;
  }
| {
    type: 'focusGroup';
    groupId: string;
  }
| {
    type: 'toggleFullscreenSession';
  }
| {
    type: 'focusSession';
    sessionId: string;
  }
| {
    type: 'promptRenameSession';
    sessionId: string;
  }
| {
    type: 'restartSession';
    sessionId: string;
  }
| {
    type: 'renameSession';
    sessionId: string;
    title: string;
  }
| {
    type: 'renameGroup';
    groupId: string;
    title: string;
  }
| {
    type: 'closeGroup';
    groupId: string;
  }
| {
    type: 'closeSession';
    sessionId: string;
  }
| {
    type: 'copyResumeCommand';
    sessionId: string;
  }
| {
    historyId: string;
    type: 'restorePreviousSession';
  }
| {
    historyId: string;
    type: 'deletePreviousSession';
  }
| {
    type: 'clearGeneratedPreviousSessions';
  }
| {
    content: string;
    type: 'saveScratchPad';
  }
| {
    collapsed: boolean;
    section: SidebarCollapsibleSection;
    type: 'setSidebarSectionCollapsed';
  }
| {
    type: 'moveSessionToGroup';
    groupId: string;
    sessionId: string;
    targetIndex?: number;
  }
| {
    type: 'sidebarDebugLog';
    event: string;
    details?: unknown;
  }
| {
    type: 'createGroupFromSession';
    sessionId: string;
  }
| {
    type: 'createGroup';
  }
| {
    type: 'setVisibleCount';
    visibleCount: VisibleSessionCount;
  }
| {
    type: 'setViewMode';
    viewMode: TerminalViewMode;
  }
| {
    type: 'syncSessionOrder';
    groupId: string;
    sessionIds: string[];
  }
| {
    type: 'syncGroupOrder';
    groupIds: string[];
  }
| {
    type: 'runSidebarCommand';
    commandId: string;
  }
| {
    action: SidebarGitAction;
    type: 'runSidebarGitAction';
  }
| {
    action: SidebarGitAction;
    type: 'setSidebarGitPrimaryAction';
  }
| {
    type: 'refreshGitState';
  }
| {
    enabled: boolean;
    type: 'setSidebarGitCommitConfirmationEnabled';
  }
| {
    requestId: string;
    subject: string;
    type: 'confirmSidebarGitCommit';
  }
| {
    requestId: string;
    type: 'cancelSidebarGitCommit';
  }
| {
    type: 'saveSidebarCommand';
    actionType: SidebarActionType;
    closeTerminalOnExit: boolean;
    commandId?: string;
    name: string;
    command?: string;
    url?: string;
  }
| {
    type: 'deleteSidebarCommand';
    commandId: string;
  }
| {
    type: 'syncSidebarCommandOrder';
    commandIds: string[];
  }
| {
    type: 'runSidebarAgent';
    agentId: string;
  }
| {
    type: 'saveSidebarAgent';
    agentId?: string;
    command: string;
    icon?: SidebarAgentIcon;
    name: string;
  }
| {
    type: 'deleteSidebarAgent';
    agentId: string;
  }
| {
    type: 'syncSidebarAgentOrder';
    agentIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'ready';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `'ready'`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openSettings';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openSettings'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleCompletionBell';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleCompletionBell'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshDaemonSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshDaemonSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killTerminalDaemon';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killTerminalDaemon'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killDaemonSession';
  sessionId: string;
  workspaceId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killDaemonSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `workspaceId`,
                                        value: { name: `string`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSidebarToOtherSide';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSidebarToOtherSide'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openBrowser';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openBrowser'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSessionInGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSessionInGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleFullscreenSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleFullscreenSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'promptRenameSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'promptRenameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'restartSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restartSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameSession';
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameGroup';
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'copyResumeCommand';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'copyResumeCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'restorePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restorePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'deletePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deletePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'clearGeneratedPreviousSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'clearGeneratedPreviousSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  content: string;
  type: 'saveScratchPad';
}`,
                                  signature: {
                                    properties: [
                                      { key: `content`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveScratchPad'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  collapsed: boolean;
  section: SidebarCollapsibleSection;
  type: 'setSidebarSectionCollapsed';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `collapsed`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      {
                                        key: `section`,
                                        value: {
                                          name: `union`,
                                          raw: `'actions' | 'agents'`,
                                          elements: [
                                            { name: `literal`, value: `'actions'` },
                                            { name: `literal`, value: `'agents'` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarSectionCollapsed'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSessionToGroup';
  groupId: string;
  sessionId: string;
  targetIndex?: number;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSessionToGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `targetIndex`,
                                        value: { name: `number`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'sidebarDebugLog';
  event: string;
  details?: unknown;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'sidebarDebugLog'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `event`, value: { name: `string`, required: !0 } },
                                      { key: `details`, value: { name: `unknown`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroupFromSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroupFromSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroup';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroup'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setVisibleCount';
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setVisibleCount'`,
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
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setViewMode';
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setViewMode'`,
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
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSessionOrder';
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSessionOrder'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `sessionIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncGroupOrder';
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncGroupOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `groupIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'runSidebarGitAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarGitAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'setSidebarGitPrimaryAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitPrimaryAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshGitState';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshGitState'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  enabled: boolean;
  type: 'setSidebarGitCommitConfirmationEnabled';
}`,
                                  signature: {
                                    properties: [
                                      { key: `enabled`, value: { name: `boolean`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitCommitConfirmationEnabled'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  subject: string;
  type: 'confirmSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      { key: `subject`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'confirmSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  type: 'cancelSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'cancelSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarCommand';
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  name: string;
  command?: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
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
                                      { key: `commandId`, value: { name: `string`, required: !1 } },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarCommandOrder';
  commandIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarCommandOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `commandIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarAgent';
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !1 } },
                                      { key: `command`, value: { name: `string`, required: !0 } },
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
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarAgentOrder';
  agentIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarAgentOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `agentIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                            name: `message`,
                          },
                        ],
                        return: { name: `void` },
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
function CT({ git: e, vscode: t }) {
  let [n, r] = (0, TT.useState)(!1),
    i = (0, TT.useRef)(null),
    a = (0, TT.useMemo)(() => bS(e), [e]),
    o = (0, TT.useMemo)(() => xS(e), [e]),
    s = o.disabledReason ?? o.label;
  (0, TT.useEffect)(() => {
    if (!n) return;
    let e = (e) => {
        i.current?.contains(e.target) || r(!1);
      },
      t = (e) => {
        e.key === `Escape` && r(!1);
      };
    return (
      document.addEventListener(`pointerdown`, e),
      document.addEventListener(`keydown`, t),
      () => {
        (document.removeEventListener(`pointerdown`, e),
          document.removeEventListener(`keydown`, t));
      }
    );
  }, [n]);
  let c = () => {
      t.postMessage({ type: `refreshGitState` });
    },
    l = (e) => {
      t.postMessage({ action: e, type: `setSidebarGitPrimaryAction` });
    },
    u = (e) => {
      t.postMessage({ enabled: e, type: `setSidebarGitCommitConfirmationEnabled` });
    },
    d = (e) => {
      (r(!1), t.postMessage({ action: e, type: `runSidebarGitAction` }));
    };
  return (0, q.jsxs)(`div`, {
    className: `git-action-row`,
    onMouseEnter: c,
    ref: i,
    children: [
      (0, q.jsxs)(`div`, {
        className: `git-action-split-button`,
        children: [
          (0, q.jsxs)(`button`, {
            "aria-label": s,
            className: `git-action-main-button`,
            "data-disabled": String(o.disabled),
            "data-empty-space-blocking": `true`,
            onClick: () => d(o.action),
            title: s,
            type: `button`,
            children: [
              (0, q.jsx)(`span`, {
                "aria-hidden": `true`,
                className: `git-action-main-icon-shell`,
                children: e.isBusy
                  ? (0, q.jsx)(Xb, {
                      className: `git-action-main-icon git-action-main-icon-spinning`,
                      size: 16,
                    })
                  : (0, q.jsx)(wT, { action: o.action }),
              }),
              (0, q.jsx)(`span`, { className: `git-action-main-label`, children: o.label }),
              (0, q.jsxs)(`span`, {
                "aria-hidden": `true`,
                className: `git-action-diff-stat`,
                children: [
                  (0, q.jsxs)(`span`, {
                    className: `git-action-diff-stat-additions`,
                    children: [`+`, e.additions],
                  }),
                  (0, q.jsx)(`span`, { className: `git-action-diff-stat-divider`, children: `/` }),
                  (0, q.jsxs)(`span`, {
                    className: `git-action-diff-stat-deletions`,
                    children: [`-`, e.deletions],
                  }),
                ],
              }),
            ],
          }),
          (0, q.jsx)(`button`, {
            "aria-expanded": n,
            "aria-haspopup": `menu`,
            "aria-label": `Git action options`,
            className: `git-action-toggle-button`,
            "data-empty-space-blocking": `true`,
            onClick: () => {
              (n || c(), r((e) => !e));
            },
            title: `Git action options`,
            type: `button`,
            children: (0, q.jsx)(Cb, {
              "aria-hidden": `true`,
              className: `git-action-toggle-icon`,
              size: 16,
            }),
          }),
        ],
      }),
      n
        ? (0, q.jsxs)(`div`, {
            className: `git-action-menu`,
            role: `menu`,
            children: [
              a.map((t) =>
                (0, q.jsxs)(
                  `button`,
                  {
                    "aria-label": t.disabledReason ?? t.label,
                    className: `git-action-menu-item`,
                    "data-disabled": String(t.disabled),
                    onClick: () => {
                      (l(t.action), r(!1));
                    },
                    role: `menuitem`,
                    title: t.disabledReason ?? t.label,
                    type: `button`,
                    children: [
                      (0, q.jsx)(wT, { action: t.action }),
                      (0, q.jsx)(`span`, {
                        className: `git-action-menu-item-label`,
                        children: t.label,
                      }),
                      t.action === `pr` && e.pr?.state === `open`
                        ? (0, q.jsx)(Fb, {
                            "aria-hidden": `true`,
                            className: `git-action-menu-item-trailing-icon`,
                            size: 14,
                          })
                        : null,
                    ],
                  },
                  t.action,
                ),
              ),
              (0, q.jsx)(`div`, { "aria-hidden": `true`, className: `git-action-menu-divider` }),
              (0, q.jsxs)(`button`, {
                "aria-label": e.confirmSuggestedCommit
                  ? `Disable suggested commit review`
                  : `Enable suggested commit review`,
                className: `git-action-menu-item git-action-menu-toggle-item`,
                onClick: () => u(!e.confirmSuggestedCommit),
                role: `menuitemcheckbox`,
                title: e.confirmSuggestedCommit
                  ? `Review suggested commit message before running the git action`
                  : `Use the suggested commit message immediately without opening the review modal`,
                type: `button`,
                children: [
                  (0, q.jsx)(`span`, {
                    "aria-hidden": `true`,
                    className: `git-action-menu-toggle-check`,
                    "data-selected": String(e.confirmSuggestedCommit),
                    children: e.confirmSuggestedCommit ? (0, q.jsx)(bb, { size: 14 }) : null,
                  }),
                  (0, q.jsx)(`span`, {
                    className: `git-action-menu-item-label`,
                    children: `Review Suggested Commit`,
                  }),
                  (0, q.jsx)(`span`, {
                    className: `git-action-menu-toggle-state`,
                    children: e.confirmSuggestedCommit ? `On` : `Off`,
                  }),
                ],
              }),
            ],
          })
        : null,
    ],
  });
}
function wT({ action: e }) {
  return e === `push`
    ? (0, q.jsx)(_x, { "aria-hidden": `true`, className: `git-action-main-icon`, size: 16 })
    : e === `pr`
      ? (0, q.jsx)(Vb, { "aria-hidden": `true`, className: `git-action-main-icon`, size: 16 })
      : (0, q.jsx)(Rb, { "aria-hidden": `true`, className: `git-action-main-icon`, size: 16 });
}
var TT,
  q,
  ET = t(() => {
    (Tx(),
      (TT = e(r())),
      ES(),
      (q = i()),
      (CT.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `GitActionRow`,
        props: {
          git: {
            required: !0,
            tsType: {
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
                  { key: `confirmSuggestedCommit`, value: { name: `boolean`, required: !0 } },
                  { key: `deletions`, value: { name: `number`, required: !0 } },
                  { key: `hasGitHubCli`, value: { name: `boolean`, required: !0 } },
                  { key: `hasOriginRemote`, value: { name: `boolean`, required: !0 } },
                  { key: `hasUpstream`, value: { name: `boolean`, required: !0 } },
                  { key: `hasWorkingTreeChanges`, value: { name: `boolean`, required: !0 } },
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
                              { key: `number`, value: { name: `number`, required: !1 } },
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
                              { key: `title`, value: { name: `string`, required: !0 } },
                              { key: `url`, value: { name: `string`, required: !0 } },
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
            },
            description: ``,
          },
          vscode: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  postMessage: (message: SidebarToExtensionMessage) => void;
}`,
              signature: {
                properties: [
                  {
                    key: `postMessage`,
                    value: {
                      name: `signature`,
                      type: `function`,
                      raw: `(message: SidebarToExtensionMessage) => void`,
                      signature: {
                        arguments: [
                          {
                            type: {
                              name: `union`,
                              raw: `| {
    type: 'ready';
  }
| {
    type: 'openSettings';
  }
| {
    type: 'toggleCompletionBell';
  }
| {
    type: 'refreshDaemonSessions';
  }
| {
    type: 'killTerminalDaemon';
  }
| {
    type: 'killDaemonSession';
    sessionId: string;
    workspaceId: string;
  }
| {
    type: 'moveSidebarToOtherSide';
  }
| {
    type: 'createSession';
  }
| {
    type: 'openBrowser';
  }
| {
    type: 'createSessionInGroup';
    groupId: string;
  }
| {
    type: 'focusGroup';
    groupId: string;
  }
| {
    type: 'toggleFullscreenSession';
  }
| {
    type: 'focusSession';
    sessionId: string;
  }
| {
    type: 'promptRenameSession';
    sessionId: string;
  }
| {
    type: 'restartSession';
    sessionId: string;
  }
| {
    type: 'renameSession';
    sessionId: string;
    title: string;
  }
| {
    type: 'renameGroup';
    groupId: string;
    title: string;
  }
| {
    type: 'closeGroup';
    groupId: string;
  }
| {
    type: 'closeSession';
    sessionId: string;
  }
| {
    type: 'copyResumeCommand';
    sessionId: string;
  }
| {
    historyId: string;
    type: 'restorePreviousSession';
  }
| {
    historyId: string;
    type: 'deletePreviousSession';
  }
| {
    type: 'clearGeneratedPreviousSessions';
  }
| {
    content: string;
    type: 'saveScratchPad';
  }
| {
    collapsed: boolean;
    section: SidebarCollapsibleSection;
    type: 'setSidebarSectionCollapsed';
  }
| {
    type: 'moveSessionToGroup';
    groupId: string;
    sessionId: string;
    targetIndex?: number;
  }
| {
    type: 'sidebarDebugLog';
    event: string;
    details?: unknown;
  }
| {
    type: 'createGroupFromSession';
    sessionId: string;
  }
| {
    type: 'createGroup';
  }
| {
    type: 'setVisibleCount';
    visibleCount: VisibleSessionCount;
  }
| {
    type: 'setViewMode';
    viewMode: TerminalViewMode;
  }
| {
    type: 'syncSessionOrder';
    groupId: string;
    sessionIds: string[];
  }
| {
    type: 'syncGroupOrder';
    groupIds: string[];
  }
| {
    type: 'runSidebarCommand';
    commandId: string;
  }
| {
    action: SidebarGitAction;
    type: 'runSidebarGitAction';
  }
| {
    action: SidebarGitAction;
    type: 'setSidebarGitPrimaryAction';
  }
| {
    type: 'refreshGitState';
  }
| {
    enabled: boolean;
    type: 'setSidebarGitCommitConfirmationEnabled';
  }
| {
    requestId: string;
    subject: string;
    type: 'confirmSidebarGitCommit';
  }
| {
    requestId: string;
    type: 'cancelSidebarGitCommit';
  }
| {
    type: 'saveSidebarCommand';
    actionType: SidebarActionType;
    closeTerminalOnExit: boolean;
    commandId?: string;
    name: string;
    command?: string;
    url?: string;
  }
| {
    type: 'deleteSidebarCommand';
    commandId: string;
  }
| {
    type: 'syncSidebarCommandOrder';
    commandIds: string[];
  }
| {
    type: 'runSidebarAgent';
    agentId: string;
  }
| {
    type: 'saveSidebarAgent';
    agentId?: string;
    command: string;
    icon?: SidebarAgentIcon;
    name: string;
  }
| {
    type: 'deleteSidebarAgent';
    agentId: string;
  }
| {
    type: 'syncSidebarAgentOrder';
    agentIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'ready';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `'ready'`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openSettings';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openSettings'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleCompletionBell';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleCompletionBell'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshDaemonSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshDaemonSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killTerminalDaemon';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killTerminalDaemon'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killDaemonSession';
  sessionId: string;
  workspaceId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killDaemonSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `workspaceId`,
                                        value: { name: `string`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSidebarToOtherSide';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSidebarToOtherSide'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openBrowser';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openBrowser'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSessionInGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSessionInGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleFullscreenSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleFullscreenSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'promptRenameSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'promptRenameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'restartSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restartSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameSession';
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameGroup';
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'copyResumeCommand';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'copyResumeCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'restorePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restorePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'deletePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deletePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'clearGeneratedPreviousSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'clearGeneratedPreviousSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  content: string;
  type: 'saveScratchPad';
}`,
                                  signature: {
                                    properties: [
                                      { key: `content`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveScratchPad'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  collapsed: boolean;
  section: SidebarCollapsibleSection;
  type: 'setSidebarSectionCollapsed';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `collapsed`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      {
                                        key: `section`,
                                        value: {
                                          name: `union`,
                                          raw: `'actions' | 'agents'`,
                                          elements: [
                                            { name: `literal`, value: `'actions'` },
                                            { name: `literal`, value: `'agents'` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarSectionCollapsed'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSessionToGroup';
  groupId: string;
  sessionId: string;
  targetIndex?: number;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSessionToGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `targetIndex`,
                                        value: { name: `number`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'sidebarDebugLog';
  event: string;
  details?: unknown;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'sidebarDebugLog'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `event`, value: { name: `string`, required: !0 } },
                                      { key: `details`, value: { name: `unknown`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroupFromSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroupFromSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroup';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroup'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setVisibleCount';
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setVisibleCount'`,
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
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setViewMode';
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setViewMode'`,
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
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSessionOrder';
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSessionOrder'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `sessionIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncGroupOrder';
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncGroupOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `groupIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'runSidebarGitAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarGitAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'setSidebarGitPrimaryAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitPrimaryAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshGitState';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshGitState'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  enabled: boolean;
  type: 'setSidebarGitCommitConfirmationEnabled';
}`,
                                  signature: {
                                    properties: [
                                      { key: `enabled`, value: { name: `boolean`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitCommitConfirmationEnabled'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  subject: string;
  type: 'confirmSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      { key: `subject`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'confirmSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  type: 'cancelSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'cancelSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarCommand';
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  name: string;
  command?: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
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
                                      { key: `commandId`, value: { name: `string`, required: !1 } },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarCommandOrder';
  commandIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarCommandOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `commandIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarAgent';
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !1 } },
                                      { key: `command`, value: { name: `string`, required: !0 } },
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
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarAgentOrder';
  agentIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarAgentOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `agentIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                            name: `message`,
                          },
                        ],
                        return: { name: `void` },
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
function DT({ draft: e, isOpen: t, onCancel: n, onSave: r }) {
  let [i, a] = (0, kT.useState)(e.actionType),
    [o, s] = (0, kT.useState)(e.closeTerminalOnExit),
    [c, l] = (0, kT.useState)(e.command ?? ``),
    [u, d] = (0, kT.useState)(e.name),
    [f, p] = (0, kT.useState)(e.url ?? ``),
    m = (0, kT.useId)(),
    h = (0, kT.useId)(),
    g = (0, kT.useId)();
  if (
    ((0, kT.useEffect)(() => {
      t &&
        (a(e.actionType),
        s(e.closeTerminalOnExit),
        l(e.command ?? ``),
        d(e.name),
        p(e.url ?? (e.actionType === `browser` ? `http://localhost:5173` : ``)));
    }, [e, t]),
    (0, kT.useEffect)(() => {
      i !== `browser` || f.trim().length > 0 || p(gS);
    }, [i, f]),
    (0, kT.useEffect)(() => {
      if (!t) return;
      let e = (e) => {
        e.key === `Escape` && n();
      };
      return (
        document.addEventListener(`keydown`, e),
        () => {
          document.removeEventListener(`keydown`, e);
        }
      );
    }, [t, n]),
    !t)
  )
    return null;
  let _ = i === `browser` ? f.trim() : c.trim(),
    v = u.trim().length === 0 || _.length === 0,
    y =
      i === `browser`
        ? `This action opens the URL in a VS Code browser tab. The tab is detected and shown in the Browsers group.`
        : `This action opens a new VS Code panel terminal each time it runs.`;
  return (0, OT.createPortal)(
    (0, J.jsxs)(`div`, {
      className: `confirm-modal-root`,
      role: `presentation`,
      children: [
        (0, J.jsx)(`button`, { className: `confirm-modal-backdrop`, onClick: n, type: `button` }),
        (0, J.jsxs)(`div`, {
          "aria-describedby": h,
          "aria-labelledby": g,
          "aria-modal": `true`,
          className: `confirm-modal command-config-modal`,
          role: `dialog`,
          children: [
            (0, J.jsx)(`button`, {
              "aria-label": `Close action configuration`,
              className: `confirm-modal-close-button`,
              onClick: n,
              type: `button`,
              children: (0, J.jsx)(Cx, {
                "aria-hidden": `true`,
                className: `toolbar-tabler-icon`,
                stroke: 1.8,
              }),
            }),
            (0, J.jsxs)(`div`, {
              className: `confirm-modal-header confirm-modal-header-with-close`,
              children: [
                (0, J.jsx)(`div`, {
                  className: `confirm-modal-title`,
                  id: g,
                  children: `Configure Action`,
                }),
                (0, J.jsx)(`div`, { className: `confirm-modal-description`, id: h, children: y }),
              ],
            }),
            (0, J.jsxs)(`div`, {
              className: `command-config-fields`,
              children: [
                (0, J.jsxs)(`label`, {
                  className: `command-config-field`,
                  children: [
                    (0, J.jsx)(`span`, { className: `command-config-label`, children: `Type` }),
                    (0, J.jsxs)(`select`, {
                      className: `group-title-input command-config-input`,
                      onChange: (e) =>
                        a(e.currentTarget.value === `browser` ? `browser` : `terminal`),
                      value: i,
                      children: [
                        (0, J.jsx)(`option`, { value: `terminal`, children: `Terminal` }),
                        (0, J.jsx)(`option`, { value: `browser`, children: `Browser` }),
                      ],
                    }),
                  ],
                }),
                (0, J.jsxs)(`label`, {
                  className: `command-config-field`,
                  children: [
                    (0, J.jsx)(`span`, { className: `command-config-label`, children: `Name` }),
                    (0, J.jsx)(`input`, {
                      autoFocus: !0,
                      className: `group-title-input command-config-input`,
                      onChange: (e) => d(e.currentTarget.value),
                      placeholder: i === `browser` ? `Docs` : `Dev`,
                      value: u,
                    }),
                  ],
                }),
                i === `browser`
                  ? (0, J.jsxs)(`label`, {
                      className: `command-config-field`,
                      children: [
                        (0, J.jsx)(`span`, { className: `command-config-label`, children: `URL` }),
                        (0, J.jsx)(`textarea`, {
                          className: `group-title-input command-config-input command-config-textarea`,
                          onChange: (e) => p(e.currentTarget.value),
                          placeholder: gS,
                          rows: 3,
                          value: f,
                        }),
                      ],
                    })
                  : (0, J.jsxs)(J.Fragment, {
                      children: [
                        (0, J.jsxs)(`label`, {
                          className: `command-config-field`,
                          children: [
                            (0, J.jsx)(`span`, {
                              className: `command-config-label`,
                              children: `Command`,
                            }),
                            (0, J.jsx)(`textarea`, {
                              className: `group-title-input command-config-input command-config-textarea`,
                              onChange: (e) => l(e.currentTarget.value),
                              placeholder: `vp dev`,
                              rows: 3,
                              value: c,
                            }),
                          ],
                        }),
                        (0, J.jsxs)(`label`, {
                          className: `command-config-toggle`,
                          htmlFor: m,
                          children: [
                            (0, J.jsx)(`input`, {
                              checked: o,
                              className: `command-config-checkbox`,
                              id: m,
                              onChange: (e) => s(e.currentTarget.checked),
                              type: `checkbox`,
                            }),
                            (0, J.jsx)(`span`, {
                              className: `command-config-toggle-copy`,
                              children: `Close terminal after the command finishes`,
                            }),
                          ],
                        }),
                      ],
                    }),
              ],
            }),
            (0, J.jsxs)(`div`, {
              className: `confirm-modal-actions`,
              children: [
                (0, J.jsx)(`button`, {
                  className: `secondary confirm-modal-button`,
                  onClick: n,
                  type: `button`,
                  children: `Cancel`,
                }),
                (0, J.jsx)(`button`, {
                  className: `primary confirm-modal-button`,
                  disabled: v,
                  onClick: () =>
                    r({
                      actionType: i,
                      closeTerminalOnExit: i === `terminal` ? o : !1,
                      command: i === `terminal` ? c.trim() : void 0,
                      commandId: e.commandId,
                      name: u.trim(),
                      url: i === `browser` ? f.trim() : void 0,
                    }),
                  type: `button`,
                  children: `Save`,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    document.body,
  );
}
var OT,
  kT,
  J,
  AT = t(() => {
    (Tx(), (OT = e(a())), (kT = e(r())), _S(), (J = i()));
  });
function jT(e, t) {
  return {
    x: Math.max(YT, Math.min(e, window.innerWidth - XT - YT)),
    y: Math.max(YT, Math.min(t, window.innerHeight - ZT - YT)),
  };
}
function MT(e) {
  return { commandId: e, kind: `sidebar-command` };
}
function NT(e) {
  if (!RT(e)) return;
  let t = e.data;
  if (!(!BT(t) || !(`kind` in t)))
    return t.kind === `sidebar-command` && typeof t.commandId == `string`
      ? { commandId: t.commandId, kind: `sidebar-command` }
      : void 0;
}
function PT({
  createRequestId: e,
  isCollapsed: t,
  onToggleCollapsed: n,
  showGitButton: r,
  titlebarActions: i,
  vscode: a,
}) {
  let { commands: o, git: s } = Xw(Mx((e) => ({ commands: e.hud.commands, git: e.hud.git }))),
    [c, l] = (0, JT.useState)(),
    [u, d] = (0, JT.useState)(),
    [f, p] = (0, JT.useState)(),
    m = (0, JT.useRef)(null);
  (0, JT.useEffect)(() => {
    if (!c) return;
    let e = (e) => {
        (zT(e.target) && m.current?.contains(e.target)) || l(void 0);
      },
      t = (e) => {
        (zT(e.target) && m.current?.contains(e.target)) || l(void 0);
      },
      n = (e) => {
        e.key === `Escape` && l(void 0);
      },
      r = () => {
        l(void 0);
      },
      i = () => {
        document.visibilityState !== `visible` && l(void 0);
      };
    return (
      document.addEventListener(`pointerdown`, e),
      document.addEventListener(`contextmenu`, t),
      document.addEventListener(`keydown`, n),
      document.addEventListener(`visibilitychange`, i),
      window.addEventListener(`blur`, r),
      () => {
        (document.removeEventListener(`pointerdown`, e),
          document.removeEventListener(`contextmenu`, t),
          document.removeEventListener(`keydown`, n),
          document.removeEventListener(`visibilitychange`, i),
          window.removeEventListener(`blur`, r));
      }
    );
  }, [c]);
  let h = (e) => {
      p({
        actionType: e.actionType,
        closeTerminalOnExit: e.closeTerminalOnExit,
        command: e.command,
        commandId: e.commandId,
        name: e.name,
        url: e.url,
      });
    },
    g = (e) => {
      if ((e.actionType === `browser` && !e.url) || (e.actionType === `terminal` && !e.command)) {
        h(e);
        return;
      }
      a.postMessage({ commandId: e.commandId, type: `runSidebarCommand` });
    };
  ((0, JT.useEffect)(() => {
    d((e) => HT(e, o));
  }, [o]),
    (0, JT.useEffect)(() => {
      e !== 0 &&
        (l(void 0),
        p({
          actionType: `terminal`,
          closeTerminalOnExit: !1,
          command: ``,
          commandId: void 0,
          name: ``,
          url: ``,
        }));
    }, [e]));
  let _ = (0, JT.useMemo)(() => {
      let e = new Map(o.map((e) => [e.commandId, e]));
      return (
        u
          ? VT(
              u,
              o.map((e) => e.commandId),
            )
          : o.map((e) => e.commandId)
      )
        .map((t) => e.get(t))
        .filter((e) => e !== void 0);
    }, [o, u]),
    v = r || _.length > 0;
  return (0, Y.jsxs)(Y.Fragment, {
    children: [
      v
        ? (0, Y.jsxs)(`section`, {
            className: `commands-section`,
            children: [
              (0, Y.jsx)(Tw, {
                actions: i,
                isCollapsed: t,
                isCollapsible: !0,
                onToggleCollapsed: () => n(!t),
                title: `Actions`,
              }),
              t
                ? null
                : (0, Y.jsxs)(`div`, {
                    className: `card commands-panel`,
                    children: [
                      r ? (0, Y.jsx)(CT, { git: s, vscode: a }) : null,
                      (0, Y.jsx)(nl, {
                        delay: Qw,
                        children: (0, Y.jsx)(by, {
                          onDragEnd: (e) => {
                            if (e.canceled || !HS(e.operation)) return;
                            let { source: t, target: n } = e.operation;
                            if (!t || !n) return;
                            let r = NT(t),
                              i = NT(n);
                            if (!r || !i || r.commandId === i.commandId) return;
                            let { initialIndex: o } = t,
                              s = n.index;
                            if (s == null || o === s) return;
                            let c = LT(
                              _.map((e) => e.commandId),
                              o,
                              s,
                            );
                            (d(c),
                              a.postMessage({ commandIds: c, type: `syncSidebarCommandOrder` }));
                          },
                          children: (0, Y.jsx)(`div`, {
                            className: `commands-grid`,
                            children: _.map((e, t) =>
                              (0, Y.jsx)(
                                FT,
                                {
                                  command: e,
                                  index: t,
                                  isContextMenuOpen: c?.command.commandId === e.commandId,
                                  onContextMenu: (t) => {
                                    (t.preventDefault(),
                                      t.stopPropagation(),
                                      l({ command: e, position: jT(t.clientX, t.clientY) }));
                                  },
                                  onRun: () => g(e),
                                },
                                e.commandId,
                              ),
                            ),
                          }),
                        }),
                      }),
                    ],
                  }),
            ],
          })
        : null,
      c
        ? (0, qT.createPortal)(
            (0, Y.jsxs)(`div`, {
              className: `session-context-menu`,
              onClick: (e) => e.stopPropagation(),
              onContextMenu: (e) => {
                (e.preventDefault(), e.stopPropagation());
              },
              ref: m,
              role: `menu`,
              style: { left: `${c.position.x}px`, top: `${c.position.y}px`, width: `${XT}px` },
              children: [
                (0, Y.jsxs)(`button`, {
                  className: `session-context-menu-item`,
                  onClick: () => {
                    (l(void 0), h(c.command));
                  },
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, Y.jsx)($b, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Configure`,
                  ],
                }),
                (0, Y.jsxs)(`button`, {
                  className: `session-context-menu-item session-context-menu-item-danger`,
                  onClick: () => {
                    (l(void 0),
                      a.postMessage({
                        commandId: c.command.commandId,
                        type: `deleteSidebarCommand`,
                      }));
                  },
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, Y.jsx)(mx, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Remove`,
                  ],
                }),
              ],
            }),
            document.body,
          )
        : null,
      f
        ? (0, Y.jsx)(DT, {
            draft: f,
            isOpen: !0,
            onCancel: () => p(void 0),
            onSave: (e) => {
              (p(void 0),
                a.postMessage({
                  actionType: e.actionType,
                  closeTerminalOnExit: e.closeTerminalOnExit,
                  command: e.command,
                  commandId: e.commandId,
                  name: e.name,
                  type: `saveSidebarCommand`,
                  url: e.url,
                }));
            },
          })
        : null,
    ],
  });
}
function FT({ command: e, index: t, isContextMenuOpen: n, onContextMenu: r, onRun: i }) {
  let a = XC({
    accept: `sidebar-command`,
    data: MT(e.commandId),
    disabled: n,
    group: `sidebar-commands`,
    id: e.commandId,
    index: t,
    type: `sidebar-command`,
  });
  return (0, Y.jsxs)(Bs, {
    children: [
      (0, Y.jsx)(sc, {
        render: (0, Y.jsxs)(`button`, {
          "aria-label": WT(e) ? KT(e) : `Configure ${e.name} action`,
          className: `command-button`,
          "data-configured": String(WT(e)),
          "data-default": String(e.isDefault),
          "data-dragging": String(!!a.isDragging),
          "data-empty-space-blocking": `true`,
          onClick: i,
          onContextMenu: r,
          ref: a.ref,
          type: `button`,
          children: [
            (0, Y.jsx)(`span`, {
              "aria-hidden": `true`,
              className: `command-button-kind-badge`,
              children: (0, Y.jsx)(IT, { actionType: e.actionType }),
            }),
            (0, Y.jsx)(`span`, { className: `command-button-label`, children: e.name }),
          ],
        }),
      }),
      (0, Y.jsx)(bc, {
        children: (0, Y.jsx)(Jc, {
          className: `tooltip-positioner`,
          sideOffset: 8,
          children: (0, Y.jsx)(Qc, { className: `tooltip-popup`, children: GT(e) }),
        }),
      }),
    ],
  });
}
function IT({ actionType: e }) {
  let t = `command-button-kind-icon`;
  return e === `browser`
    ? (0, Y.jsx)(bx, { "aria-hidden": `true`, className: t, size: 15, stroke: 1.8 })
    : (0, Y.jsx)(nx, { "aria-hidden": `true`, className: t, size: 15, stroke: 1.8 });
}
function LT(e, t, n) {
  let r = [...e],
    [i] = r.splice(t, 1);
  return (i === void 0 || r.splice(n, 0, i), r);
}
function RT(e) {
  return BT(e) && `data` in e;
}
function zT(e) {
  return e instanceof Node;
}
function BT(e) {
  return typeof e == `object` && !!e;
}
function VT(e, t) {
  let n = new Set(t),
    r = e.filter((e) => n.has(e));
  for (let e of t) r.includes(e) || r.push(e);
  return r;
}
function HT(e, t) {
  if (!e) return;
  let n = t.map((e) => e.commandId),
    r = VT(e, n);
  return UT(r, n) ? void 0 : r;
}
function UT(e, t) {
  return e.length === t.length ? e.every((e, n) => e === t[n]) : !1;
}
function WT(e) {
  return e.actionType === `browser` ? !!e.url : !!e.command;
}
function GT(e) {
  return WT(e)
    ? e.actionType === `browser`
      ? `${e.name}: ${e.url}`
      : `${e.name}: ${e.command}`
    : `Configure ${e.name}`;
}
function KT(e) {
  return e.actionType === `browser` ? `Open ${e.name}` : `Run ${e.name}`;
}
var qT,
  JT,
  Y,
  YT,
  XT,
  ZT,
  QT = t(() => {
    (al(),
      ib(),
      cw(),
      Tx(),
      (qT = e(a())),
      (JT = e(r())),
      Px(),
      ET(),
      Dw(),
      Zw(),
      $w(),
      AT(),
      (Y = i()),
      (YT = 12),
      (XT = 188),
      (ZT = 110),
      (PT.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `CommandsPanel`,
        props: {
          createRequestId: { required: !0, tsType: { name: `number` }, description: `` },
          isCollapsed: { required: !0, tsType: { name: `boolean` }, description: `` },
          onToggleCollapsed: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `(collapsed: boolean) => void`,
              signature: {
                arguments: [{ type: { name: `boolean` }, name: `collapsed` }],
                return: { name: `void` },
              },
            },
            description: ``,
          },
          showGitButton: { required: !0, tsType: { name: `boolean` }, description: `` },
          titlebarActions: { required: !1, tsType: { name: `ReactNode` }, description: `` },
          vscode: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  postMessage: (message: SidebarToExtensionMessage) => void;
}`,
              signature: {
                properties: [
                  {
                    key: `postMessage`,
                    value: {
                      name: `signature`,
                      type: `function`,
                      raw: `(message: SidebarToExtensionMessage) => void`,
                      signature: {
                        arguments: [
                          {
                            type: {
                              name: `union`,
                              raw: `| {
    type: 'ready';
  }
| {
    type: 'openSettings';
  }
| {
    type: 'toggleCompletionBell';
  }
| {
    type: 'refreshDaemonSessions';
  }
| {
    type: 'killTerminalDaemon';
  }
| {
    type: 'killDaemonSession';
    sessionId: string;
    workspaceId: string;
  }
| {
    type: 'moveSidebarToOtherSide';
  }
| {
    type: 'createSession';
  }
| {
    type: 'openBrowser';
  }
| {
    type: 'createSessionInGroup';
    groupId: string;
  }
| {
    type: 'focusGroup';
    groupId: string;
  }
| {
    type: 'toggleFullscreenSession';
  }
| {
    type: 'focusSession';
    sessionId: string;
  }
| {
    type: 'promptRenameSession';
    sessionId: string;
  }
| {
    type: 'restartSession';
    sessionId: string;
  }
| {
    type: 'renameSession';
    sessionId: string;
    title: string;
  }
| {
    type: 'renameGroup';
    groupId: string;
    title: string;
  }
| {
    type: 'closeGroup';
    groupId: string;
  }
| {
    type: 'closeSession';
    sessionId: string;
  }
| {
    type: 'copyResumeCommand';
    sessionId: string;
  }
| {
    historyId: string;
    type: 'restorePreviousSession';
  }
| {
    historyId: string;
    type: 'deletePreviousSession';
  }
| {
    type: 'clearGeneratedPreviousSessions';
  }
| {
    content: string;
    type: 'saveScratchPad';
  }
| {
    collapsed: boolean;
    section: SidebarCollapsibleSection;
    type: 'setSidebarSectionCollapsed';
  }
| {
    type: 'moveSessionToGroup';
    groupId: string;
    sessionId: string;
    targetIndex?: number;
  }
| {
    type: 'sidebarDebugLog';
    event: string;
    details?: unknown;
  }
| {
    type: 'createGroupFromSession';
    sessionId: string;
  }
| {
    type: 'createGroup';
  }
| {
    type: 'setVisibleCount';
    visibleCount: VisibleSessionCount;
  }
| {
    type: 'setViewMode';
    viewMode: TerminalViewMode;
  }
| {
    type: 'syncSessionOrder';
    groupId: string;
    sessionIds: string[];
  }
| {
    type: 'syncGroupOrder';
    groupIds: string[];
  }
| {
    type: 'runSidebarCommand';
    commandId: string;
  }
| {
    action: SidebarGitAction;
    type: 'runSidebarGitAction';
  }
| {
    action: SidebarGitAction;
    type: 'setSidebarGitPrimaryAction';
  }
| {
    type: 'refreshGitState';
  }
| {
    enabled: boolean;
    type: 'setSidebarGitCommitConfirmationEnabled';
  }
| {
    requestId: string;
    subject: string;
    type: 'confirmSidebarGitCommit';
  }
| {
    requestId: string;
    type: 'cancelSidebarGitCommit';
  }
| {
    type: 'saveSidebarCommand';
    actionType: SidebarActionType;
    closeTerminalOnExit: boolean;
    commandId?: string;
    name: string;
    command?: string;
    url?: string;
  }
| {
    type: 'deleteSidebarCommand';
    commandId: string;
  }
| {
    type: 'syncSidebarCommandOrder';
    commandIds: string[];
  }
| {
    type: 'runSidebarAgent';
    agentId: string;
  }
| {
    type: 'saveSidebarAgent';
    agentId?: string;
    command: string;
    icon?: SidebarAgentIcon;
    name: string;
  }
| {
    type: 'deleteSidebarAgent';
    agentId: string;
  }
| {
    type: 'syncSidebarAgentOrder';
    agentIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'ready';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `'ready'`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openSettings';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openSettings'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleCompletionBell';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleCompletionBell'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshDaemonSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshDaemonSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killTerminalDaemon';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killTerminalDaemon'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killDaemonSession';
  sessionId: string;
  workspaceId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killDaemonSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `workspaceId`,
                                        value: { name: `string`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSidebarToOtherSide';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSidebarToOtherSide'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openBrowser';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openBrowser'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSessionInGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSessionInGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleFullscreenSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleFullscreenSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'promptRenameSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'promptRenameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'restartSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restartSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameSession';
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameGroup';
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'copyResumeCommand';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'copyResumeCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'restorePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restorePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'deletePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deletePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'clearGeneratedPreviousSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'clearGeneratedPreviousSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  content: string;
  type: 'saveScratchPad';
}`,
                                  signature: {
                                    properties: [
                                      { key: `content`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveScratchPad'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  collapsed: boolean;
  section: SidebarCollapsibleSection;
  type: 'setSidebarSectionCollapsed';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `collapsed`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      {
                                        key: `section`,
                                        value: {
                                          name: `union`,
                                          raw: `'actions' | 'agents'`,
                                          elements: [
                                            { name: `literal`, value: `'actions'` },
                                            { name: `literal`, value: `'agents'` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarSectionCollapsed'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSessionToGroup';
  groupId: string;
  sessionId: string;
  targetIndex?: number;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSessionToGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `targetIndex`,
                                        value: { name: `number`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'sidebarDebugLog';
  event: string;
  details?: unknown;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'sidebarDebugLog'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `event`, value: { name: `string`, required: !0 } },
                                      { key: `details`, value: { name: `unknown`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroupFromSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroupFromSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroup';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroup'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setVisibleCount';
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setVisibleCount'`,
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
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setViewMode';
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setViewMode'`,
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
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSessionOrder';
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSessionOrder'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `sessionIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncGroupOrder';
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncGroupOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `groupIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'runSidebarGitAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarGitAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'setSidebarGitPrimaryAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitPrimaryAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshGitState';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshGitState'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  enabled: boolean;
  type: 'setSidebarGitCommitConfirmationEnabled';
}`,
                                  signature: {
                                    properties: [
                                      { key: `enabled`, value: { name: `boolean`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitCommitConfirmationEnabled'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  subject: string;
  type: 'confirmSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      { key: `subject`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'confirmSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  type: 'cancelSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'cancelSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarCommand';
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  name: string;
  command?: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
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
                                      { key: `commandId`, value: { name: `string`, required: !1 } },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarCommandOrder';
  commandIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarCommandOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `commandIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarAgent';
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !1 } },
                                      { key: `command`, value: { name: `string`, required: !0 } },
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
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarAgentOrder';
  agentIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarAgentOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `agentIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                            name: `message`,
                          },
                        ],
                        return: { name: `void` },
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
function $T({ confirmLabel: e, description: t, isOpen: n, onCancel: r, onConfirm: i, title: a }) {
  return (
    (0, tE.useEffect)(() => {
      if (!n) return;
      let e = (e) => {
        e.key === `Escape` && r();
      };
      return (
        document.addEventListener(`keydown`, e),
        () => {
          document.removeEventListener(`keydown`, e);
        }
      );
    }, [n, r]),
    n
      ? (0, eE.createPortal)(
          (0, nE.jsxs)(`div`, {
            className: `confirm-modal-root`,
            role: `presentation`,
            children: [
              (0, nE.jsx)(`button`, {
                className: `confirm-modal-backdrop`,
                onClick: r,
                type: `button`,
              }),
              (0, nE.jsxs)(`div`, {
                "aria-describedby": `confirm-modal-description`,
                "aria-labelledby": `confirm-modal-title`,
                "aria-modal": `true`,
                className: `confirm-modal`,
                role: `dialog`,
                children: [
                  (0, nE.jsx)(`button`, {
                    "aria-label": `Close modal`,
                    className: `confirm-modal-close-button`,
                    onClick: r,
                    type: `button`,
                    children: (0, nE.jsx)(Cx, {
                      "aria-hidden": `true`,
                      className: `toolbar-tabler-icon`,
                      stroke: 1.8,
                    }),
                  }),
                  (0, nE.jsxs)(`div`, {
                    className: `confirm-modal-header confirm-modal-header-with-close`,
                    children: [
                      (0, nE.jsx)(`div`, {
                        className: `confirm-modal-title`,
                        id: `confirm-modal-title`,
                        children: a,
                      }),
                      (0, nE.jsx)(`div`, {
                        className: `confirm-modal-description`,
                        id: `confirm-modal-description`,
                        children: t,
                      }),
                    ],
                  }),
                  (0, nE.jsxs)(`div`, {
                    className: `confirm-modal-actions`,
                    children: [
                      (0, nE.jsx)(`button`, {
                        className: `secondary confirm-modal-button`,
                        onClick: r,
                        type: `button`,
                        children: `Cancel`,
                      }),
                      (0, nE.jsx)(`button`, {
                        className: `primary confirm-modal-button`,
                        onClick: i,
                        type: `button`,
                        children: e,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          document.body,
        )
      : null
  );
}
var eE,
  tE,
  nE,
  rE = t(() => {
    (Tx(), (eE = e(a())), (tE = e(r())), (nE = i()));
  });
function iE({ isOpen: e, onClose: t, vscode: n }) {
  let r = Xw((e) => e.daemonSessionsState),
    [i, a] = (0, cE.useState)(``),
    [o, s] = (0, cE.useState)(!1);
  ((0, cE.useEffect)(() => {
    if (!e) return;
    let n = (e) => {
      if (e.key === `Escape`) {
        if (o) {
          s(!1);
          return;
        }
        t();
      }
    };
    return (
      document.addEventListener(`keydown`, n),
      () => {
        document.removeEventListener(`keydown`, n);
      }
    );
  }, [o, e, t]),
    (0, cE.useEffect)(() => {
      e || (a(``), s(!1));
    }, [e]));
  let c = (0, cE.useMemo)(() => {
    let e = i.trim().toLowerCase();
    return e
      ? (r?.sessions ?? []).filter((t) =>
          [
            t.agentName,
            t.cwd,
            t.errorMessage,
            t.sessionId,
            t.shell,
            t.status,
            t.title,
            t.workspaceId,
          ]
            .filter((e) => typeof e == `string` && e.length > 0)
            .some((t) => t.toLowerCase().includes(e)),
        )
      : (r?.sessions ?? []);
  }, [i, r?.sessions]);
  return e
    ? (0, sE.createPortal)(
        (0, X.jsxs)(X.Fragment, {
          children: [
            (0, X.jsxs)(`div`, {
              className: `confirm-modal-root`,
              role: `presentation`,
              children: [
                (0, X.jsx)(`button`, {
                  className: `confirm-modal-backdrop`,
                  onClick: t,
                  type: `button`,
                }),
                (0, X.jsxs)(`div`, {
                  "aria-describedby": `daemon-sessions-modal-description`,
                  "aria-labelledby": `daemon-sessions-modal-title`,
                  "aria-modal": `true`,
                  className: `confirm-modal daemon-sessions-modal`,
                  role: `dialog`,
                  children: [
                    (0, X.jsx)(`button`, {
                      "aria-label": `Close daemon sessions`,
                      className: `confirm-modal-close-button`,
                      onClick: t,
                      type: `button`,
                      children: (0, X.jsx)(Cx, {
                        "aria-hidden": `true`,
                        className: `toolbar-tabler-icon`,
                        stroke: 1.8,
                      }),
                    }),
                    (0, X.jsxs)(`div`, {
                      className: `confirm-modal-header confirm-modal-header-with-close`,
                      children: [
                        (0, X.jsx)(`div`, {
                          className: `confirm-modal-title`,
                          id: `daemon-sessions-modal-title`,
                          children: `Running VSmux Sessions`,
                        }),
                        (0, X.jsx)(`div`, {
                          className: `confirm-modal-description`,
                          id: `daemon-sessions-modal-description`,
                          children: `Live daemon-managed sessions across all workspaces and projects.`,
                        }),
                      ],
                    }),
                    (0, X.jsxs)(`div`, {
                      className: `daemon-sessions-toolbar`,
                      children: [
                        (0, X.jsx)(`input`, {
                          "aria-label": `Search daemon sessions`,
                          className: `group-title-input daemon-sessions-search-input`,
                          onChange: (e) => {
                            a(e.target.value);
                          },
                          placeholder: `Search by workspace, session, cwd, title, or agent`,
                          type: `text`,
                          value: i,
                        }),
                        (0, X.jsxs)(`div`, {
                          className: `daemon-sessions-toolbar-actions`,
                          children: [
                            (0, X.jsxs)(`button`, {
                              className: `secondary daemon-sessions-toolbar-button`,
                              onClick: () => {
                                n.postMessage({ type: `refreshDaemonSessions` });
                              },
                              type: `button`,
                              children: [
                                (0, X.jsx)(cx, {
                                  "aria-hidden": `true`,
                                  className: `session-context-menu-icon`,
                                  size: 14,
                                }),
                                `Refresh`,
                              ],
                            }),
                            (0, X.jsx)(`button`, {
                              className: `secondary daemon-sessions-toolbar-button daemon-sessions-toolbar-button-danger`,
                              disabled: !r?.daemon,
                              onClick: () => {
                                s(!0);
                              },
                              type: `button`,
                              children: `Kill Daemon`,
                            }),
                          ],
                        }),
                      ],
                    }),
                    (0, X.jsx)(`div`, {
                      className: `daemon-sessions-modal-body`,
                      children: r
                        ? (0, X.jsxs)(X.Fragment, {
                            children: [
                              (0, X.jsxs)(`section`, {
                                className: `daemon-sessions-summary`,
                                children: [
                                  (0, X.jsxs)(`div`, {
                                    className: `daemon-sessions-summary-row`,
                                    children: [
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-label`,
                                        children: `Daemon`,
                                      }),
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-value`,
                                        children: r.daemon
                                          ? `PID ${String(r.daemon.pid)} on port ${String(r.daemon.port)}`
                                          : `Not running`,
                                      }),
                                    ],
                                  }),
                                  (0, X.jsxs)(`div`, {
                                    className: `daemon-sessions-summary-row`,
                                    children: [
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-label`,
                                        children: `Protocol`,
                                      }),
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-value`,
                                        children: r.daemon
                                          ? String(r.daemon.protocolVersion)
                                          : `N/A`,
                                      }),
                                    ],
                                  }),
                                  (0, X.jsxs)(`div`, {
                                    className: `daemon-sessions-summary-row`,
                                    children: [
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-label`,
                                        children: `Started`,
                                      }),
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-value`,
                                        children: r.daemon ? oE(r.daemon.startedAt) : `N/A`,
                                      }),
                                    ],
                                  }),
                                  (0, X.jsxs)(`div`, {
                                    className: `daemon-sessions-summary-row`,
                                    children: [
                                      (0, X.jsx)(`span`, {
                                        className: `daemon-sessions-summary-label`,
                                        children: `Visible rows`,
                                      }),
                                      (0, X.jsxs)(`span`, {
                                        className: `daemon-sessions-summary-value`,
                                        children: [
                                          String(c.length),
                                          ` of `,
                                          String(r.sessions.length),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              r.errorMessage
                                ? (0, X.jsx)(`div`, {
                                    className: `daemon-sessions-error-banner`,
                                    children: r.errorMessage,
                                  })
                                : null,
                              c.length > 0
                                ? (0, X.jsx)(`div`, {
                                    className: `daemon-sessions-list`,
                                    children: c.map((e) =>
                                      (0, X.jsxs)(
                                        `article`,
                                        {
                                          className: `daemon-session-card`,
                                          "data-current-workspace": String(e.isCurrentWorkspace),
                                          children: [
                                            (0, X.jsxs)(`div`, {
                                              className: `daemon-session-card-header`,
                                              children: [
                                                (0, X.jsxs)(`div`, {
                                                  className: `daemon-session-card-title-wrap`,
                                                  children: [
                                                    (0, X.jsx)(`div`, {
                                                      className: `daemon-session-card-title`,
                                                      children: e.title?.trim() || e.sessionId,
                                                    }),
                                                    (0, X.jsx)(`div`, {
                                                      className: `daemon-session-card-subtitle`,
                                                      children: e.sessionId,
                                                    }),
                                                  ],
                                                }),
                                                (0, X.jsxs)(`div`, {
                                                  className: `daemon-session-card-badges`,
                                                  children: [
                                                    e.isCurrentWorkspace
                                                      ? (0, X.jsx)(`span`, {
                                                          className: `daemon-session-badge daemon-session-badge-current`,
                                                          children: `Current Workspace`,
                                                        })
                                                      : null,
                                                    (0, X.jsx)(`span`, {
                                                      className: `daemon-session-badge`,
                                                      children: e.status,
                                                    }),
                                                    (0, X.jsx)(`span`, {
                                                      className: `daemon-session-badge`,
                                                      children: e.agentStatus,
                                                    }),
                                                  ],
                                                }),
                                              ],
                                            }),
                                            (0, X.jsxs)(`div`, {
                                              className: `daemon-session-card-details`,
                                              children: [
                                                (0, X.jsx)(aE, {
                                                  label: `Workspace`,
                                                  children: e.workspaceId,
                                                }),
                                                (0, X.jsx)(aE, { label: `CWD`, children: e.cwd }),
                                                (0, X.jsx)(aE, {
                                                  label: `Shell`,
                                                  children: e.shell,
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Agent`,
                                                  children: e.agentName ?? `Unknown`,
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Restore`,
                                                  children: e.restoreState,
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Size`,
                                                  children: `${String(e.cols)} x ${String(e.rows)}`,
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Started`,
                                                  children: oE(e.startedAt),
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Ended`,
                                                  children: e.endedAt ? oE(e.endedAt) : `Active`,
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Exit Code`,
                                                  children:
                                                    e.exitCode === void 0
                                                      ? `N/A`
                                                      : String(e.exitCode),
                                                }),
                                                (0, X.jsx)(aE, {
                                                  label: `Title`,
                                                  children: e.title?.trim() || `N/A`,
                                                }),
                                              ],
                                            }),
                                            e.errorMessage
                                              ? (0, X.jsx)(`div`, {
                                                  className: `daemon-session-card-error`,
                                                  children: e.errorMessage,
                                                })
                                              : null,
                                            (0, X.jsx)(`div`, {
                                              className: `daemon-session-card-actions`,
                                              children: (0, X.jsx)(`button`, {
                                                className: `secondary daemon-session-action-button daemon-session-action-button-danger`,
                                                onClick: () => {
                                                  n.postMessage({
                                                    sessionId: e.sessionId,
                                                    type: `killDaemonSession`,
                                                    workspaceId: e.workspaceId,
                                                  });
                                                },
                                                type: `button`,
                                                children: `Kill Session`,
                                              }),
                                            }),
                                          ],
                                        },
                                        `${e.workspaceId}:${e.sessionId}:${e.startedAt}`,
                                      ),
                                    ),
                                  })
                                : (0, X.jsx)(`div`, {
                                    className: `group-empty-state daemon-sessions-empty-state`,
                                    children: i.trim()
                                      ? `No daemon sessions match that search.`
                                      : r.daemon
                                        ? `No VSmux sessions are currently running.`
                                        : `No VSmux daemon is currently running.`,
                                  }),
                            ],
                          })
                        : (0, X.jsx)(`div`, {
                            className: `group-empty-state daemon-sessions-empty-state`,
                            children: `Loading daemon session state…`,
                          }),
                    }),
                  ],
                }),
              ],
            }),
            (0, X.jsx)($T, {
              confirmLabel: `Kill Daemon`,
              description: `This will terminate the shared VSmux daemon and disconnect every daemon-managed terminal session across workspaces.`,
              isOpen: o,
              onCancel: () => s(!1),
              onConfirm: () => {
                (s(!1), n.postMessage({ type: `killTerminalDaemon` }));
              },
              title: `Kill Shared Daemon`,
            }),
          ],
        }),
        document.body,
      )
    : null;
}
function aE({ children: e, label: t }) {
  return (0, X.jsxs)(`div`, {
    className: `daemon-session-detail`,
    children: [
      (0, X.jsx)(`div`, { className: `daemon-session-detail-label`, children: t }),
      (0, X.jsx)(`div`, { className: `daemon-session-detail-value`, children: e }),
    ],
  });
}
function oE(e) {
  let t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
}
var sE,
  cE,
  X,
  lE = t(() => {
    (Tx(), (sE = e(a())), (cE = e(r())), rE(), Zw(), (X = i()));
  });
function uE({ draft: e, isOpen: t, onCancel: n, onConfirm: r }) {
  let [i, a] = (0, fE.useState)(e.suggestedSubject),
    o = (0, fE.useId)(),
    s = (0, fE.useId)();
  if (
    ((0, fE.useEffect)(() => {
      t && a(e.suggestedSubject);
    }, [e, t]),
    (0, fE.useEffect)(() => {
      if (!t) return;
      let r = (t) => {
        t.key === `Escape` && n(e.requestId);
      };
      return (
        document.addEventListener(`keydown`, r),
        () => {
          document.removeEventListener(`keydown`, r);
        }
      );
    }, [e.requestId, t, n]),
    !t)
  )
    return null;
  let c = i.trim();
  return (0, dE.createPortal)(
    (0, pE.jsxs)(`div`, {
      className: `confirm-modal-root`,
      role: `presentation`,
      children: [
        (0, pE.jsx)(`button`, {
          className: `confirm-modal-backdrop`,
          onClick: () => n(e.requestId),
          type: `button`,
        }),
        (0, pE.jsxs)(`div`, {
          "aria-describedby": o,
          "aria-labelledby": s,
          "aria-modal": `true`,
          className: `confirm-modal command-config-modal git-commit-modal`,
          role: `dialog`,
          children: [
            (0, pE.jsx)(`button`, {
              "aria-label": `Close suggested commit modal`,
              className: `confirm-modal-close-button`,
              onClick: () => n(e.requestId),
              type: `button`,
              children: (0, pE.jsx)(Cx, {
                "aria-hidden": `true`,
                className: `toolbar-tabler-icon`,
                stroke: 1.8,
              }),
            }),
            (0, pE.jsxs)(`div`, {
              className: `confirm-modal-header confirm-modal-header-with-close`,
              children: [
                (0, pE.jsx)(`div`, {
                  className: `confirm-modal-title`,
                  id: s,
                  children: `Review Suggested Commit`,
                }),
                (0, pE.jsx)(`div`, {
                  className: `confirm-modal-description`,
                  id: o,
                  children: e.description,
                }),
              ],
            }),
            (0, pE.jsx)(`div`, {
              className: `command-config-fields`,
              children: (0, pE.jsxs)(`label`, {
                className: `command-config-field`,
                children: [
                  (0, pE.jsx)(`span`, {
                    className: `command-config-label`,
                    children: `Commit Title`,
                  }),
                  (0, pE.jsx)(`textarea`, {
                    autoFocus: !0,
                    className: `group-title-input command-config-input command-config-textarea`,
                    onChange: (e) => a(e.currentTarget.value),
                    placeholder: `Describe the change`,
                    rows: 3,
                    value: i,
                    wrap: `soft`,
                  }),
                ],
              }),
            }),
            (0, pE.jsxs)(`div`, {
              className: `confirm-modal-actions`,
              children: [
                (0, pE.jsx)(`button`, {
                  className: `secondary confirm-modal-button`,
                  onClick: () => n(e.requestId),
                  type: `button`,
                  children: `Cancel`,
                }),
                (0, pE.jsx)(`button`, {
                  className: `primary confirm-modal-button`,
                  disabled: c.length === 0,
                  onClick: () => r(e.requestId, c),
                  type: `button`,
                  children: e.confirmLabel,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    document.body,
  );
}
var dE,
  fE,
  pE,
  mE = t(() => {
    (Tx(), (dE = e(a())), (fE = e(r())), (pE = i()));
  });
function hE(e, t) {
  let n = t.trim().toLowerCase();
  if (!n) return [...e];
  let r = n.split(/\s+/).filter(Boolean);
  return e.filter((e) => {
    let t = [e.alias, e.primaryTitle, e.terminalTitle, e.detail, e.sessionNumber]
      .filter((e) => typeof e == `string` && e.trim().length > 0)
      .join(` `)
      .toLowerCase();
    return r.every((e) => _E(t, e));
  });
}
function gE(e) {
  let t = new Intl.DateTimeFormat(void 0, {
      day: `numeric`,
      month: `long`,
      weekday: `long`,
      year: `numeric`,
    }),
    n = new Map();
  for (let r of e) {
    let e = new Date(r.closedAt),
      i = Number.isNaN(e.getTime()) ? `Unknown day` : t.format(e),
      a = n.get(i);
    if (a) {
      a.push(r);
      continue;
    }
    n.set(i, [r]);
  }
  return [...n.entries()].map(([e, t]) => ({ dayLabel: e, sessions: t }));
}
function _E(e, t) {
  let n = 0;
  for (let r of e) if (r === t[n] && ((n += 1), n >= t.length)) return !0;
  return t.length === 0;
}
var vE = t(() => {});
function yE({
  aliasHeadingRef: e,
  onClose: t,
  onRename: n,
  session: r,
  showDebugSessionNumbers: i,
  showCloseButton: a,
  showHotkeys: o,
}) {
  let s = r.primaryTitle?.trim() || r.alias,
    c = xE(r.terminalTitle, r.agentIcon),
    l = r.detail ?? c ?? r.activityLabel ?? dS(r.agentIcon),
    u = i && r.sessionNumber !== void 0 ? `Session number: ${r.sessionNumber}` : void 0,
    d = [s, l, u].filter(Boolean).join(`
`),
    f = o;
  return (0, wE.jsxs)(wE.Fragment, {
    children: [
      (0, wE.jsxs)(`div`, {
        className: `session-head`,
        children: [
          (0, wE.jsx)(SE, {
            className: `session-alias-heading`,
            textRef: e,
            text: s,
            tooltip: d,
            tooltipWhen: l || u ? `always` : `overflow`,
          }),
          (0, wE.jsxs)(`div`, {
            className: `session-head-actions`,
            children: [
              (0, wE.jsx)(`div`, {
                className: `session-meta`,
                "data-visible": String(f),
                children: o
                  ? (0, wE.jsx)(`span`, {
                      className: `session-shortcut-label`,
                      children: r.shortcutLabel,
                    })
                  : null,
              }),
              a && t
                ? (0, wE.jsx)(`button`, {
                    "aria-label": `Close session`,
                    className: `close-button`,
                    onClick: (e) => {
                      (e.preventDefault(), e.stopPropagation(), t());
                    },
                    type: `button`,
                    children: `×`,
                  })
                : null,
            ],
          }),
        ],
      }),
      n
        ? (0, wE.jsx)(`button`, {
            "aria-label": `Rename session`,
            className: `session-rename-button`,
            onClick: (e) => {
              (e.preventDefault(), e.stopPropagation(), n());
            },
            type: `button`,
            children: (0, wE.jsx)($b, { "aria-hidden": `true`, size: 14, stroke: 1.8 }),
          })
        : null,
    ],
  });
}
function bE({ agentIcon: e }) {
  if (e === `browser`)
    return (0, wE.jsx)(bx, {
      "aria-hidden": `true`,
      className: `session-floating-agent-tabler-icon`,
      "data-agent-icon": `browser`,
      size: 14,
      stroke: 1.8,
    });
  if (!e) return null;
  let t = { "--session-agent-logo": `url("${Cw[e]}")` };
  return (0, wE.jsx)(`span`, {
    "aria-hidden": `true`,
    className: `session-floating-agent-icon`,
    "data-agent-icon": e,
    style: t,
  });
}
function xE(e, t) {
  let n = e?.trim();
  if (n) return t && TE[t].includes(n.toLowerCase()) ? dS(t) : n;
}
function SE({ className: e, text: t, textRef: n, tooltip: r, tooltipWhen: i = `overflow` }) {
  let [a, o] = (0, CE.useState)(!1),
    s = (0, CE.useRef)(void 0),
    c = () => {
      s.current !== void 0 && (window.clearTimeout(s.current), (s.current = void 0));
    },
    l = () => {
      (c(), o(!1));
    },
    u = () => {
      let e = n?.current;
      return e ? (e.scrollWidth > e.clientWidth ? !0 : e.scrollHeight > e.clientHeight) : !1;
    },
    d = () => {
      if ((c(), !(i === `always` ? (r ?? t) : u()))) {
        o(!1);
        return;
      }
      s.current = window.setTimeout(() => {
        (o(!0), (s.current = void 0));
      }, Qw);
    };
  (0, CE.useEffect)(
    () => () => {
      c();
    },
    [],
  );
  let f = (0, wE.jsx)(`div`, { className: e, ref: n, children: t });
  return (0, wE.jsxs)(Bs, {
    onOpenChange: (e) => !e && l(),
    open: a,
    children: [
      (0, wE.jsx)(sc, {
        disabled: !0,
        render: (0, wE.jsx)(
          `div`,
          {
            className: `session-tooltip-trigger`,
            onBlur: l,
            onFocus: d,
            onMouseEnter: d,
            onMouseLeave: l,
            children: f,
          },
          `${e}:${t}:${r ?? ``}`,
        ),
      }),
      (0, wE.jsx)(bc, {
        children: (0, wE.jsx)(Jc, {
          className: `tooltip-positioner`,
          sideOffset: 8,
          children: (0, wE.jsx)(Qc, { className: `tooltip-popup`, children: r ?? t }),
        }),
      }),
    ],
  });
}
var CE,
  wE,
  TE,
  EE = t(() => {
    (Tx(),
      al(),
      (CE = e(r())),
      pS(),
      ww(),
      $w(),
      (wE = i()),
      (TE = {
        browser: [`browser`],
        claude: [`claude`, `claude code`],
        codex: [`codex`, `codex cli`, `openai codex`],
        copilot: [`copilot`, `github copilot`],
        gemini: [`gemini`],
        opencode: [`open code`, `opencode`],
        t3: [`t3`, `t3 code`],
      }),
      (yE.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SessionCardContent`,
        props: {
          aliasHeadingRef: {
            required: !1,
            tsType: {
              name: `RefObject`,
              elements: [
                {
                  name: `union`,
                  raw: `HTMLDivElement | null`,
                  elements: [{ name: `HTMLDivElement` }, { name: `null` }],
                },
              ],
              raw: `RefObject<HTMLDivElement | null>`,
            },
            description: ``,
          },
          onClose: {
            required: !1,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `() => void`,
              signature: { arguments: [], return: { name: `void` } },
            },
            description: ``,
          },
          onRename: {
            required: !1,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `() => void`,
              signature: { arguments: [], return: { name: `void` } },
            },
            description: ``,
          },
          session: {
            required: !0,
            tsType: {
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
                        { name: `unknown[number]["icon"]`, raw: `DefaultSidebarAgent["icon"]` },
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
            description: ``,
          },
          showDebugSessionNumbers: { required: !0, tsType: { name: `boolean` }, description: `` },
          showCloseButton: { required: !0, tsType: { name: `boolean` }, description: `` },
          showHotkeys: { required: !0, tsType: { name: `boolean` }, description: `` },
        },
      }),
      (bE.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SessionFloatingAgentIcon`,
        props: {
          agentIcon: {
            required: !0,
            tsType: { name: `union`, raw: `SidebarSessionItem["agentIcon"]` },
            description: ``,
          },
        },
      }));
  });
function DE(e) {
  return e.primaryTitle?.trim() || e.terminalTitle?.trim() || e.alias;
}
var OE = t(() => {});
function kE({ onDelete: e, onRestore: t, session: n, showDebugSessionNumbers: r, showHotkeys: i }) {
  let a = (0, AE.useRef)(null),
    o = DE(n),
    s =
      n.primaryTitle?.trim() || !n.terminalTitle?.trim()
        ? n
        : { ...n, primaryTitle: n.terminalTitle, terminalTitle: void 0 };
  return (0, jE.jsxs)(`div`, {
    className: `session-frame session-history-frame`,
    "data-activity": n.activity,
    "data-focused": `false`,
    "data-running": `false`,
    "data-restorable": String(n.isRestorable),
    "data-visible": `false`,
    children: [
      (0, jE.jsx)(bE, { agentIcon: n.agentIcon }),
      (0, jE.jsxs)(`article`, {
        "aria-disabled": !n.isRestorable,
        "aria-pressed": `false`,
        "aria-label": n.isRestorable ? `Restore ${o}` : o,
        className: `session session-history-card`,
        "data-activity": n.activity,
        "data-has-agent-icon": String(!!n.agentIcon),
        "data-dragging": `false`,
        "data-focused": `false`,
        "data-running": `false`,
        "data-restorable": String(n.isRestorable),
        "data-visible": `false`,
        onAuxClick: (t) => {
          t.button === 1 && (t.preventDefault(), t.stopPropagation(), e());
        },
        onClick: () => {
          n.isRestorable && t();
        },
        onKeyDown: (e) => {
          !n.isRestorable || (e.key !== `Enter` && e.key !== ` `) || (e.preventDefault(), t());
        },
        onMouseDown: (e) => {
          e.button === 1 && e.preventDefault();
        },
        role: n.isRestorable ? `button` : void 0,
        tabIndex: n.isRestorable ? 0 : -1,
        children: [
          (0, jE.jsx)(`button`, {
            "aria-label": `Delete ${o} from previous sessions`,
            className: `previous-session-delete-button`,
            onClick: (t) => {
              (t.preventDefault(), t.stopPropagation(), e());
            },
            type: `button`,
            children: (0, jE.jsx)(mx, { "aria-hidden": `true`, size: 12, stroke: 1.9 }),
          }),
          (0, jE.jsx)(yE, {
            aliasHeadingRef: a,
            session: s,
            showDebugSessionNumbers: r,
            showCloseButton: !1,
            showHotkeys: i,
          }),
        ],
      }),
      (0, jE.jsx)(`div`, { "aria-hidden": !0, className: `session-status-dot` }),
    ],
  });
}
var AE,
  jE,
  ME = t(() => {
    (Tx(),
      (AE = e(r())),
      EE(),
      OE(),
      (jE = i()),
      (kE.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SessionHistoryCard`,
        props: {
          onDelete: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `() => void`,
              signature: { arguments: [], return: { name: `void` } },
            },
            description: ``,
          },
          onRestore: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `() => void`,
              signature: { arguments: [], return: { name: `void` } },
            },
            description: ``,
          },
          session: {
            required: !0,
            tsType: {
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
                            { name: `unknown[number]["icon"]`, raw: `DefaultSidebarAgent["icon"]` },
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
                      { key: `isGeneratedName`, value: { name: `boolean`, required: !0 } },
                      { key: `isRestorable`, value: { name: `boolean`, required: !0 } },
                    ],
                  },
                },
              ],
            },
            description: ``,
          },
          showDebugSessionNumbers: { required: !0, tsType: { name: `boolean` }, description: `` },
          showHotkeys: { required: !0, tsType: { name: `boolean` }, description: `` },
        },
      }));
  });
function NE({ isOpen: e, onClose: t, vscode: n }) {
  let r = Xw((e) => e.previousSessions),
    i = Xw((e) => e.hud.debuggingMode),
    a = Xw((e) => e.hud.showHotkeysOnSessionCards),
    [o, s] = (0, FE.useState)(``),
    c = (0, FE.useMemo)(() => hE(r, o), [r, o]),
    l = (0, FE.useMemo)(() => gE(c), [c]);
  return (
    (0, FE.useEffect)(() => {
      if (!e) return;
      let n = (e) => {
        e.key === `Escape` && t();
      };
      return (
        document.addEventListener(`keydown`, n),
        () => {
          document.removeEventListener(`keydown`, n);
        }
      );
    }, [e, t]),
    (0, FE.useEffect)(() => {
      e || s(``);
    }, [e]),
    e
      ? (0, PE.createPortal)(
          (0, IE.jsxs)(`div`, {
            className: `confirm-modal-root`,
            role: `presentation`,
            children: [
              (0, IE.jsx)(`button`, {
                className: `confirm-modal-backdrop`,
                onClick: t,
                type: `button`,
              }),
              (0, IE.jsxs)(`div`, {
                "aria-describedby": `previous-sessions-modal-description`,
                "aria-labelledby": `previous-sessions-modal-title`,
                "aria-modal": `true`,
                className: `confirm-modal previous-sessions-modal`,
                role: `dialog`,
                children: [
                  (0, IE.jsx)(`button`, {
                    "aria-label": `Close previous sessions`,
                    className: `confirm-modal-close-button`,
                    onClick: t,
                    type: `button`,
                    children: (0, IE.jsx)(Cx, {
                      "aria-hidden": `true`,
                      className: `toolbar-tabler-icon`,
                      stroke: 1.8,
                    }),
                  }),
                  (0, IE.jsxs)(`div`, {
                    className: `confirm-modal-header confirm-modal-header-with-close`,
                    children: [
                      (0, IE.jsx)(`div`, {
                        className: `confirm-modal-title`,
                        id: `previous-sessions-modal-title`,
                        children: `Previous Sessions`,
                      }),
                      (0, IE.jsx)(`div`, {
                        className: `confirm-modal-description`,
                        id: `previous-sessions-modal-description`,
                        children: `Sessions you previously ran in this workspace.`,
                      }),
                    ],
                  }),
                  (0, IE.jsx)(`div`, {
                    className: `previous-sessions-toolbar`,
                    children: (0, IE.jsx)(`input`, {
                      "aria-label": `Search previous sessions`,
                      className: `group-title-input previous-sessions-search-input`,
                      onChange: (e) => {
                        s(e.target.value);
                      },
                      placeholder: `Search sessions`,
                      type: `text`,
                      value: o,
                    }),
                  }),
                  (0, IE.jsx)(`div`, {
                    className: `previous-sessions-modal-body`,
                    children:
                      l.length > 0
                        ? l.map((e) =>
                            (0, IE.jsxs)(
                              `section`,
                              {
                                className: `previous-sessions-day-group`,
                                children: [
                                  (0, IE.jsx)(`div`, {
                                    className: `previous-sessions-day-label`,
                                    children: e.dayLabel,
                                  }),
                                  (0, IE.jsx)(`div`, {
                                    className: `group-sessions`,
                                    children: e.sessions.map((e) =>
                                      (0, IE.jsx)(
                                        kE,
                                        {
                                          onDelete: () => {
                                            n.postMessage({
                                              historyId: e.historyId,
                                              type: `deletePreviousSession`,
                                            });
                                          },
                                          onRestore: () => {
                                            (n.postMessage({
                                              historyId: e.historyId,
                                              type: `restorePreviousSession`,
                                            }),
                                              t());
                                          },
                                          session: e,
                                          showDebugSessionNumbers: i,
                                          showHotkeys: a,
                                        },
                                        e.historyId,
                                      ),
                                    ),
                                  }),
                                ],
                              },
                              e.dayLabel,
                            ),
                          )
                        : (0, IE.jsx)(`div`, {
                            className: `group-empty-state previous-sessions-empty-state`,
                            children: o.trim()
                              ? `No previous sessions match that search.`
                              : `No previous sessions yet.`,
                          }),
                  }),
                ],
              }),
            ],
          }),
          document.body,
        )
      : null
  );
}
var PE,
  FE,
  IE,
  LE = t(() => {
    (Tx(), (PE = e(a())), (FE = e(r())), vE(), ME(), Zw(), (IE = i()));
  });
function RE({ isOpen: e, onClose: t, onSave: n }) {
  let r = Xw((e) => e.scratchPadContent),
    [i, a] = (0, BE.useState)(r),
    o = (0, BE.useRef)(r),
    s = (0, BE.useRef)(null),
    c = (0, BE.useRef)(!1),
    l = () => {
      i !== o.current && ((o.current = i), n(i));
    },
    u = () => {
      (l(), t());
    };
  return (
    (0, BE.useEffect)(() => {
      if (!e) {
        (a(r), (o.current = r), (c.current = !1));
        return;
      }
      c.current ||= (a(r), (o.current = r), !0);
    }, [r, e]),
    (0, BE.useEffect)(() => {
      if (!e || i === o.current) return;
      let t = window.setTimeout(() => {
        ((o.current = i), n(i));
      }, 180);
      return () => {
        window.clearTimeout(t);
      };
    }, [i, e, n]),
    (0, BE.useEffect)(() => {
      if (!e) return;
      let t = (e) => {
        e.key === `Escape` && u();
      };
      return (
        document.addEventListener(`keydown`, t),
        () => {
          document.removeEventListener(`keydown`, t);
        }
      );
    }, [i, e, t, n]),
    (0, BE.useEffect)(() => {
      if (!e) return;
      let t = window.setTimeout(() => {
        let e = s.current;
        if (!e) return;
        e.focus();
        let t = e.value.length;
        e.setSelectionRange(t, t);
      }, 0);
      return () => {
        window.clearTimeout(t);
      };
    }, [e]),
    e
      ? (0, zE.createPortal)(
          (0, VE.jsxs)(`div`, {
            className: `confirm-modal-root`,
            role: `presentation`,
            children: [
              (0, VE.jsx)(`button`, {
                className: `confirm-modal-backdrop`,
                onClick: u,
                type: `button`,
              }),
              (0, VE.jsxs)(`div`, {
                "aria-labelledby": `scratch-pad-modal-title`,
                "aria-modal": `true`,
                className: `confirm-modal scratch-pad-modal`,
                role: `dialog`,
                children: [
                  (0, VE.jsx)(`button`, {
                    "aria-label": `Close scratch pad`,
                    className: `confirm-modal-close-button`,
                    onClick: u,
                    type: `button`,
                    children: (0, VE.jsx)(Cx, {
                      "aria-hidden": `true`,
                      className: `toolbar-tabler-icon`,
                      stroke: 1.8,
                    }),
                  }),
                  (0, VE.jsx)(`div`, {
                    className: `confirm-modal-header confirm-modal-header-with-close`,
                    children: (0, VE.jsx)(`div`, {
                      className: `confirm-modal-title`,
                      id: `scratch-pad-modal-title`,
                      children: `Scratch Pad`,
                    }),
                  }),
                  (0, VE.jsx)(`div`, {
                    className: `scratch-pad-modal-body`,
                    children: (0, VE.jsx)(`textarea`, {
                      "aria-label": `Scratch pad`,
                      className: `scratch-pad-textarea`,
                      onBlur: l,
                      onChange: (e) => {
                        a(e.target.value);
                      },
                      placeholder: `Workspace notes that autosave as you type.`,
                      ref: s,
                      spellCheck: !1,
                      value: i,
                    }),
                  }),
                ],
              }),
            ],
          }),
          document.body,
        )
      : null
  );
}
var zE,
  BE,
  VE,
  HE = t(() => {
    (Tx(), (zE = e(a())), (BE = e(r())), Zw(), (VE = i()));
  });
function UE(e, t) {
  return { groupId: e, kind: `session`, sessionId: t };
}
function WE(e) {
  return { groupId: e, kind: `group` };
}
function GE(e) {
  if (!eD(e)) return;
  let t = e.data;
  if (!(!tD(t) || !(`kind` in t)))
    switch (t.kind) {
      case `session`:
        return typeof t.groupId == `string` && typeof t.sessionId == `string`
          ? { groupId: t.groupId, kind: `session`, sessionId: t.sessionId }
          : void 0;
      case `group`:
        return typeof t.groupId == `string` ? { groupId: t.groupId, kind: `group` } : void 0;
      case `create-group`:
        return { kind: `create-group` };
      default:
        return;
    }
}
function KE(e) {
  if (
    !(
      !e ||
      !(`clientX` in e) ||
      !(`clientY` in e) ||
      typeof e.clientX != `number` ||
      typeof e.clientY != `number`
    )
  )
    return { x: e.clientX, y: e.clientY };
}
function qE(e, t, n) {
  let r =
    typeof e.elementsFromPoint == `function`
      ? e.elementsFromPoint(t, n)
      : [e.elementFromPoint(t, n)];
  for (let e of r) {
    if (!rD(e) || nD(e)) continue;
    let t = $E(e, n);
    if (t) return t;
  }
}
function JE(e) {
  let t = KE(e),
    n = e?.target,
    r = n instanceof Element ? n : void 0;
  if (r) return $E(r, t?.y);
}
function YE(e, t, n) {
  let r = QE(e, t);
  if (!r) return e;
  let i = e[r];
  if (!i) return e;
  let a = i.indexOf(t);
  if (a < 0) return e;
  let o = e[n.groupId];
  if (!o) return e;
  let s = XE(o, n);
  if (s === void 0) return e;
  if (r === n.groupId) {
    let n = s > a ? s - 1 : s;
    if (n === a) return e;
    let o = [...i];
    return (o.splice(a, 1), o.splice(ZE(n, o.length), 0, t), { ...e, [r]: o });
  }
  let c = i.filter((e) => e !== t),
    l = [...o];
  return (l.splice(ZE(s, l.length), 0, t), { ...e, [r]: c, [n.groupId]: l });
}
function XE(e, t) {
  if (t.kind === `group`) return t.position === `end` ? e.length : 0;
  let n = e.indexOf(t.sessionId);
  if (!(n < 0)) return n + (t.position === `after` ? 1 : 0);
}
function ZE(e, t) {
  return Math.max(0, Math.min(e, t));
}
function QE(e, t) {
  return Object.entries(e).find(([, e]) => e.includes(t))?.[0];
}
function $E(e, t) {
  let n = e.closest(aD);
  if (n) {
    let e = n.closest(iD)?.dataset.sidebarGroupId,
      r = n.dataset.sidebarSessionId;
    if (e && r) {
      let i = n.getBoundingClientRect();
      return {
        groupId: e,
        kind: `session`,
        position: (t ?? i.top + i.height / 2) > i.top + i.height / 2 ? `after` : `before`,
        sessionId: r,
      };
    }
  }
  let r = e.closest(iD),
    i = r?.dataset.sidebarGroupId;
  if (!i) return;
  let a = r.getBoundingClientRect();
  return {
    groupId: i,
    kind: `group`,
    position: (t ?? a.top + a.height / 2) > a.top + a.height / 2 ? `end` : `start`,
  };
}
function eD(e) {
  return tD(e) && `data` in e;
}
function tD(e) {
  return typeof e == `object` && !!e;
}
function nD(e) {
  return e.closest(`[data-dragging='true']`) !== null;
}
function rD(e) {
  return typeof e == `object` && !!e && `closest` in e;
}
var iD,
  aD,
  oD = t(() => {
    ((iD = `[data-sidebar-group-id]`), (aD = `[data-sidebar-session-id]`));
  });
function sD(e, t, n) {
  let r = gD + n * hD;
  return {
    x: Math.max(pD, Math.min(e, window.innerWidth - mD - pD)),
    y: Math.max(pD, Math.min(t, window.innerHeight - r - pD)),
  };
}
function cD({
  dropPosition: e,
  groupId: t,
  index: n,
  onFocusRequested: r,
  sessionId: i,
  vscode: a,
}) {
  let o = Xw((e) => e.sessionsById[i]),
    {
      showCloseButton: s,
      showDebugSessionNumbers: c,
      showHotkeys: l,
    } = Xw(
      Mx((e) => ({
        showCloseButton: e.hud.showCloseButtonOnSessionCards,
        showDebugSessionNumbers: e.hud.debuggingMode,
        showHotkeys: e.hud.showHotkeysOnSessionCards,
      })),
    ),
    [u, d] = (0, dD.useState)(),
    f = (0, dD.useRef)(null),
    p = (0, dD.useRef)(null),
    m = o?.kind === `browser`,
    h = o ? !m && lD(o) : !1,
    g = (e, r) => {
      c &&
        a.postMessage({
          details: { groupId: t, index: n, sessionId: i, ...r },
          event: e,
          type: `sidebarDebugLog`,
        });
    },
    _ = XC({
      accept: `session`,
      data: UE(t, o.sessionId),
      disabled: m || u !== void 0,
      feedback: `clone`,
      group: t,
      id: i,
      index: n,
      plugins: [CC],
      sensors: xD,
      type: `session`,
    });
  if (!o) return null;
  ((0, dD.useEffect)(() => {
    d(void 0);
  }, [o.alias, o.sessionId]),
    (0, dD.useEffect)(() => {
      if (!u) return;
      let e = (e) => {
          f.current?.contains(e.target) || d(void 0);
        },
        t = (e) => {
          f.current?.contains(e.target) || d(void 0);
        },
        n = (e) => {
          e.key === `Escape` && d(void 0);
        },
        r = () => {
          d(void 0);
        },
        i = () => {
          document.visibilityState !== `visible` && d(void 0);
        };
      return (
        document.addEventListener(`pointerdown`, e),
        document.addEventListener(`contextmenu`, t),
        document.addEventListener(`keydown`, n),
        document.addEventListener(`visibilitychange`, i),
        window.addEventListener(`blur`, r),
        () => {
          (document.removeEventListener(`pointerdown`, e),
            document.removeEventListener(`contextmenu`, t),
            document.removeEventListener(`keydown`, n),
            document.removeEventListener(`visibilitychange`, i),
            window.removeEventListener(`blur`, r));
        }
      );
    }, [u]));
  let v = (e, t) => {
      d(sD(e, t, m ? 1 : h ? 3 : 2));
    },
    y = () => {
      m || (d(void 0), a.postMessage({ sessionId: o.sessionId, type: `promptRenameSession` }));
    },
    b = () => {
      (d(void 0), a.postMessage({ sessionId: o.sessionId, type: `closeSession` }));
    },
    x = () => {
      (d(void 0), a.postMessage({ sessionId: o.sessionId, type: `copyResumeCommand` }));
    },
    S = () => {
      let e = o.activity === `attention`;
      (o.isFocused && !e) ||
        (o.isFocused || r?.(t, o.sessionId),
        a.postMessage({ sessionId: o.sessionId, type: `focusSession` }));
    },
    C = (e) => {
      if (e.key === `ContextMenu` || (e.shiftKey && e.key === `F10`)) {
        (e.preventDefault(), e.stopPropagation());
        let t = e.currentTarget.getBoundingClientRect();
        v(t.left + 24, t.top + 18);
        return;
      }
      (e.key !== `Enter` && e.key !== ` `) || (e.preventDefault(), e.stopPropagation(), S());
    };
  return (0, fD.jsxs)(fD.Fragment, {
    children: [
      (0, fD.jsxs)(`div`, {
        className: `session-frame`,
        "data-activity": o.activity,
        "data-dragging": String(!!_.isDragging),
        "data-drop-position": e,
        "data-drop-target": String(!!_.isDropTarget),
        "data-focused": String(o.isFocused),
        "data-running": String(o.isRunning),
        "data-visible": String(o.isVisible),
        ref: _.ref,
        children: [
          (0, fD.jsx)(bE, { agentIcon: o.agentIcon }),
          (0, fD.jsx)(`article`, {
            "aria-expanded": u ? !0 : void 0,
            "aria-haspopup": `menu`,
            "aria-pressed": o.isFocused,
            className: `session`,
            "data-activity": o.activity,
            "data-has-agent-icon": String(!!o.agentIcon),
            "data-dragging": String(!!_.isDragging),
            "data-drop-position": e,
            "data-drop-target": String(!!_.isDropTarget),
            "data-focused": String(o.isFocused),
            "data-running": String(o.isRunning),
            "data-sidebar-session-id": o.sessionId,
            "data-visible": String(o.isVisible),
            onPointerCancel: (e) => {
              g(`session.pointerCancel`, {
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX,
                clientY: e.clientY,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
              });
            },
            onPointerDown: (e) => {
              g(`session.pointerDown`, {
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX,
                clientY: e.clientY,
                isDragging: _.isDragging,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
              });
            },
            onPointerUp: (e) => {
              g(`session.pointerUp`, {
                button: e.button,
                buttons: e.buttons,
                clientX: e.clientX,
                clientY: e.clientY,
                isDragging: _.isDragging,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
              });
            },
            onAuxClick: (e) => {
              e.button === 1 && (e.preventDefault(), b());
            },
            onClick: (e) => {
              if ((e.stopPropagation(), e.metaKey)) {
                (e.preventDefault(), b());
                return;
              }
              S();
            },
            onContextMenu: (e) => {
              (e.preventDefault(), e.stopPropagation(), v(e.clientX, e.clientY));
            },
            onKeyDown: C,
            ref: _.sourceRef,
            role: `button`,
            tabIndex: 0,
            children: (0, fD.jsx)(yE, {
              aliasHeadingRef: p,
              onClose: b,
              onRename: m ? void 0 : y,
              session: o,
              showDebugSessionNumbers: c,
              showCloseButton: s,
              showHotkeys: l,
            }),
          }),
          (0, fD.jsx)(`div`, { "aria-hidden": !0, className: `session-status-dot` }),
        ],
      }),
      u
        ? (0, uD.createPortal)(
            (0, fD.jsxs)(`div`, {
              className: `session-context-menu`,
              onClick: (e) => {
                (e.preventDefault(), e.stopPropagation());
              },
              onPointerDown: (e) => {
                e.stopPropagation();
              },
              ref: f,
              role: `menu`,
              style: { left: `${u.x}px`, top: `${u.y}px` },
              children: [
                m
                  ? null
                  : (0, fD.jsxs)(`button`, {
                      className: `session-context-menu-item`,
                      onClick: y,
                      role: `menuitem`,
                      type: `button`,
                      children: [
                        (0, fD.jsx)($b, {
                          "aria-hidden": `true`,
                          className: `session-context-menu-icon`,
                          size: 16,
                          stroke: 1.8,
                        }),
                        `Rename`,
                      ],
                    }),
                h
                  ? (0, fD.jsxs)(`button`, {
                      className: `session-context-menu-item`,
                      onClick: x,
                      role: `menuitem`,
                      type: `button`,
                      children: [
                        (0, fD.jsx)(Mb, {
                          "aria-hidden": `true`,
                          className: `session-context-menu-icon`,
                          size: 16,
                          stroke: 1.8,
                        }),
                        `Copy resume`,
                      ],
                    })
                  : null,
                (0, fD.jsxs)(`button`, {
                  className: `session-context-menu-item session-context-menu-item-danger`,
                  onClick: b,
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, fD.jsx)(Cx, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 16,
                      stroke: 1.8,
                    }),
                    m ? `Close` : `Terminate`,
                  ],
                }),
              ],
            }),
            document.body,
          )
        : null,
    ],
  });
}
function lD(e) {
  return (
    e.agentIcon === `codex` ||
    e.agentIcon === `claude` ||
    e.agentIcon === `gemini` ||
    e.agentIcon === `opencode`
  );
}
var uD,
  dD,
  fD,
  pD,
  mD,
  hD,
  gD,
  _D,
  vD,
  yD,
  bD,
  xD,
  SD = t(() => {
    (Tx(),
      Kv(),
      YC(),
      cw(),
      (uD = e(a())),
      (dD = e(r())),
      Px(),
      EE(),
      oD(),
      Zw(),
      (fD = i()),
      (pD = 12),
      (mD = 156),
      (hD = 34),
      (gD = 12),
      (_D = 130),
      (vD = 12),
      (yD = 130),
      (bD = 12),
      (xD = [
        Sv.configure({
          activationConstraints(e) {
            return e.pointerType === `touch`
              ? [new vv.Delay({ tolerance: bD, value: yD })]
              : [new vv.Delay({ tolerance: vD, value: _D })];
          },
        }),
        fv,
      ]),
      (cD.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SortableSessionCard`,
        props: {
          dropPosition: {
            required: !1,
            tsType: {
              name: `union`,
              raw: `"after" | "before"`,
              elements: [
                { name: `literal`, value: `"after"` },
                { name: `literal`, value: `"before"` },
              ],
            },
            description: ``,
          },
          groupId: { required: !0, tsType: { name: `string` }, description: `` },
          index: { required: !0, tsType: { name: `number` }, description: `` },
          onFocusRequested: {
            required: !1,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `(groupId: string, sessionId: string) => void`,
              signature: {
                arguments: [
                  { type: { name: `string` }, name: `groupId` },
                  { type: { name: `string` }, name: `sessionId` },
                ],
                return: { name: `void` },
              },
            },
            description: ``,
          },
          sessionId: { required: !0, tsType: { name: `string` }, description: `` },
          vscode: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  postMessage: (message: SidebarToExtensionMessage) => void;
}`,
              signature: {
                properties: [
                  {
                    key: `postMessage`,
                    value: {
                      name: `signature`,
                      type: `function`,
                      raw: `(message: SidebarToExtensionMessage) => void`,
                      signature: {
                        arguments: [
                          {
                            type: {
                              name: `union`,
                              raw: `| {
    type: 'ready';
  }
| {
    type: 'openSettings';
  }
| {
    type: 'toggleCompletionBell';
  }
| {
    type: 'refreshDaemonSessions';
  }
| {
    type: 'killTerminalDaemon';
  }
| {
    type: 'killDaemonSession';
    sessionId: string;
    workspaceId: string;
  }
| {
    type: 'moveSidebarToOtherSide';
  }
| {
    type: 'createSession';
  }
| {
    type: 'openBrowser';
  }
| {
    type: 'createSessionInGroup';
    groupId: string;
  }
| {
    type: 'focusGroup';
    groupId: string;
  }
| {
    type: 'toggleFullscreenSession';
  }
| {
    type: 'focusSession';
    sessionId: string;
  }
| {
    type: 'promptRenameSession';
    sessionId: string;
  }
| {
    type: 'restartSession';
    sessionId: string;
  }
| {
    type: 'renameSession';
    sessionId: string;
    title: string;
  }
| {
    type: 'renameGroup';
    groupId: string;
    title: string;
  }
| {
    type: 'closeGroup';
    groupId: string;
  }
| {
    type: 'closeSession';
    sessionId: string;
  }
| {
    type: 'copyResumeCommand';
    sessionId: string;
  }
| {
    historyId: string;
    type: 'restorePreviousSession';
  }
| {
    historyId: string;
    type: 'deletePreviousSession';
  }
| {
    type: 'clearGeneratedPreviousSessions';
  }
| {
    content: string;
    type: 'saveScratchPad';
  }
| {
    collapsed: boolean;
    section: SidebarCollapsibleSection;
    type: 'setSidebarSectionCollapsed';
  }
| {
    type: 'moveSessionToGroup';
    groupId: string;
    sessionId: string;
    targetIndex?: number;
  }
| {
    type: 'sidebarDebugLog';
    event: string;
    details?: unknown;
  }
| {
    type: 'createGroupFromSession';
    sessionId: string;
  }
| {
    type: 'createGroup';
  }
| {
    type: 'setVisibleCount';
    visibleCount: VisibleSessionCount;
  }
| {
    type: 'setViewMode';
    viewMode: TerminalViewMode;
  }
| {
    type: 'syncSessionOrder';
    groupId: string;
    sessionIds: string[];
  }
| {
    type: 'syncGroupOrder';
    groupIds: string[];
  }
| {
    type: 'runSidebarCommand';
    commandId: string;
  }
| {
    action: SidebarGitAction;
    type: 'runSidebarGitAction';
  }
| {
    action: SidebarGitAction;
    type: 'setSidebarGitPrimaryAction';
  }
| {
    type: 'refreshGitState';
  }
| {
    enabled: boolean;
    type: 'setSidebarGitCommitConfirmationEnabled';
  }
| {
    requestId: string;
    subject: string;
    type: 'confirmSidebarGitCommit';
  }
| {
    requestId: string;
    type: 'cancelSidebarGitCommit';
  }
| {
    type: 'saveSidebarCommand';
    actionType: SidebarActionType;
    closeTerminalOnExit: boolean;
    commandId?: string;
    name: string;
    command?: string;
    url?: string;
  }
| {
    type: 'deleteSidebarCommand';
    commandId: string;
  }
| {
    type: 'syncSidebarCommandOrder';
    commandIds: string[];
  }
| {
    type: 'runSidebarAgent';
    agentId: string;
  }
| {
    type: 'saveSidebarAgent';
    agentId?: string;
    command: string;
    icon?: SidebarAgentIcon;
    name: string;
  }
| {
    type: 'deleteSidebarAgent';
    agentId: string;
  }
| {
    type: 'syncSidebarAgentOrder';
    agentIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'ready';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `'ready'`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openSettings';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openSettings'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleCompletionBell';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleCompletionBell'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshDaemonSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshDaemonSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killTerminalDaemon';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killTerminalDaemon'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killDaemonSession';
  sessionId: string;
  workspaceId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killDaemonSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `workspaceId`,
                                        value: { name: `string`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSidebarToOtherSide';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSidebarToOtherSide'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openBrowser';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openBrowser'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSessionInGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSessionInGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleFullscreenSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleFullscreenSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'promptRenameSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'promptRenameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'restartSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restartSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameSession';
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameGroup';
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'copyResumeCommand';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'copyResumeCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'restorePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restorePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'deletePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deletePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'clearGeneratedPreviousSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'clearGeneratedPreviousSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  content: string;
  type: 'saveScratchPad';
}`,
                                  signature: {
                                    properties: [
                                      { key: `content`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveScratchPad'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  collapsed: boolean;
  section: SidebarCollapsibleSection;
  type: 'setSidebarSectionCollapsed';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `collapsed`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      {
                                        key: `section`,
                                        value: {
                                          name: `union`,
                                          raw: `'actions' | 'agents'`,
                                          elements: [
                                            { name: `literal`, value: `'actions'` },
                                            { name: `literal`, value: `'agents'` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarSectionCollapsed'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSessionToGroup';
  groupId: string;
  sessionId: string;
  targetIndex?: number;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSessionToGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `targetIndex`,
                                        value: { name: `number`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'sidebarDebugLog';
  event: string;
  details?: unknown;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'sidebarDebugLog'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `event`, value: { name: `string`, required: !0 } },
                                      { key: `details`, value: { name: `unknown`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroupFromSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroupFromSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroup';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroup'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setVisibleCount';
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setVisibleCount'`,
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
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setViewMode';
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setViewMode'`,
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
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSessionOrder';
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSessionOrder'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `sessionIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncGroupOrder';
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncGroupOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `groupIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'runSidebarGitAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarGitAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'setSidebarGitPrimaryAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitPrimaryAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshGitState';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshGitState'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  enabled: boolean;
  type: 'setSidebarGitCommitConfirmationEnabled';
}`,
                                  signature: {
                                    properties: [
                                      { key: `enabled`, value: { name: `boolean`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitCommitConfirmationEnabled'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  subject: string;
  type: 'confirmSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      { key: `subject`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'confirmSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  type: 'cancelSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'cancelSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarCommand';
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  name: string;
  command?: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
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
                                      { key: `commandId`, value: { name: `string`, required: !1 } },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarCommandOrder';
  commandIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarCommandOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `commandIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarAgent';
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !1 } },
                                      { key: `command`, value: { name: `string`, required: !0 } },
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
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarAgentOrder';
  agentIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarAgentOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `agentIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                            name: `message`,
                          },
                        ],
                        return: { name: `void` },
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
function CD(e, t) {
  return {
    x: Math.max(jD, Math.min(e, window.innerWidth - MD - jD)),
    y: Math.max(jD, Math.min(t, window.innerHeight - AD - jD)),
  };
}
function wD(e) {
  if (!e) return;
  let t = e.getBoundingClientRect();
  return {
    x: Math.max(PD, Math.min(t.left + t.width / 2, window.innerWidth - PD)),
    y: Math.max(PD, Math.min(t.bottom + 6, window.innerHeight - PD)),
  };
}
function TD(e) {
  return e === 1 ? `Show 1 split` : `Show ${String(e)} splits`;
}
function ED({
  autoEdit: e,
  canClose: t,
  groupId: n,
  index: r,
  onAutoEditHandled: i,
  onFocusRequested: a,
  sessionDragIndicator: o,
  vscode: s,
}) {
  let c = Xw((e) => e.groupsById[n]),
    l = Xw((e) => e.sessionIdsByGroup[n] ?? []),
    [u, d] = (0, kD.useState)(),
    [f, p] = (0, kD.useState)(c?.title ?? ``),
    [m, h] = (0, kD.useState)(!1),
    [g, _] = (0, kD.useState)(!1),
    [v, y] = (0, kD.useState)(),
    b = (0, kD.useRef)(null),
    x = (0, kD.useRef)(null),
    S = (0, kD.useRef)(null),
    C = c?.kind === `browser`,
    w = o?.groupId === n,
    T = XC({
      accept: [`group`, `session`],
      collisionPriority: df.Low,
      data: WE(n),
      disabled: C,
      id: n,
      index: r,
      plugins: [CC],
      type: `group`,
    });
  if (!c) return null;
  let E = T.isDropTarget || w;
  ((0, kD.useEffect)(() => {
    g || p(c.title);
  }, [c.title, g]),
    (0, kD.useEffect)(() => {
      e &&
        (0, kD.startTransition)(() => {
          (p(c.title), _(!0), i());
        });
    }, [e, c.title, i]),
    (0, kD.useEffect)(() => {
      (d(void 0), y(void 0));
    }, [c.groupId, c.title]),
    (0, kD.useEffect)(() => {
      c.isActive || y(void 0);
    }, [c.isActive]),
    (0, kD.useEffect)(() => {
      if (!u) return;
      let e = (e) => {
          b.current?.contains(e.target) || d(void 0);
        },
        t = (e) => {
          b.current?.contains(e.target) || d(void 0);
        },
        n = (e) => {
          e.key === `Escape` && d(void 0);
        },
        r = () => {
          d(void 0);
        },
        i = () => {
          document.visibilityState !== `visible` && d(void 0);
        };
      return (
        document.addEventListener(`pointerdown`, e),
        document.addEventListener(`contextmenu`, t),
        document.addEventListener(`keydown`, n),
        document.addEventListener(`visibilitychange`, i),
        window.addEventListener(`blur`, r),
        () => {
          (document.removeEventListener(`pointerdown`, e),
            document.removeEventListener(`contextmenu`, t),
            document.removeEventListener(`keydown`, n),
            document.removeEventListener(`visibilitychange`, i),
            window.removeEventListener(`blur`, r));
        }
      );
    }, [u]),
    (0, kD.useEffect)(() => {
      if (!v) return;
      let e = (e) => {
          let t = e.target;
          t instanceof Node && (x.current?.contains(t) || S.current?.contains(t) || y(void 0));
        },
        t = (e) => {
          e.key === `Escape` && y(void 0);
        },
        n = () => {
          y(void 0);
        },
        r = () => {
          document.visibilityState !== `visible` && y(void 0);
        };
      return (
        document.addEventListener(`pointerdown`, e),
        document.addEventListener(`keydown`, t),
        document.addEventListener(`visibilitychange`, r),
        window.addEventListener(`blur`, n),
        () => {
          (document.removeEventListener(`pointerdown`, e),
            document.removeEventListener(`keydown`, t),
            document.removeEventListener(`visibilitychange`, r),
            window.removeEventListener(`blur`, n));
        }
      );
    }, [v]));
  let D = () => {
      if (C) return;
      let e = f.trim();
      (_(!1),
        p(e || c.title),
        !(!e || e === c.title) &&
          s.postMessage({ groupId: c.groupId, title: e, type: `renameGroup` }));
    },
    ee = () => {
      C || s.postMessage({ groupId: c.groupId, type: `focusGroup` });
    },
    te = () => {
      if (C) {
        s.postMessage({ type: `openBrowser` });
        return;
      }
      s.postMessage({ groupId: c.groupId, type: `createSessionInGroup` });
    },
    O = (e) => {
      C || (y(void 0), s.postMessage({ type: `setVisibleCount`, visibleCount: e }));
    },
    k = () => {
      if (t) {
        if ((d(void 0), l.length <= 1)) {
          s.postMessage({ groupId: c.groupId, type: `closeGroup` });
          return;
        }
        h(!0);
      }
    },
    A = (e) => {
      if (e.key === `Enter`) {
        (e.preventDefault(), D());
        return;
      }
      e.key === `Escape` && (e.preventDefault(), p(c.title), _(!1));
    };
  return (0, Z.jsxs)(Z.Fragment, {
    children: [
      (0, Z.jsxs)(`section`, {
        className: `group`,
        "data-active": String(c.isActive),
        "data-dragging": String(!!T.isDragging),
        "data-drop-target": String(E),
        "data-sidebar-group-id": c.groupId,
        onClick: () => {
          C || ee();
        },
        onContextMenu: (e) => {
          C || (e.preventDefault(), e.stopPropagation(), d(CD(e.clientX, e.clientY)));
        },
        ref: T.ref,
        children: [
          (0, Z.jsx)(`div`, {
            className: `group-head`,
            children: (0, Z.jsx)(`div`, {
              className: `group-title-wrap`,
              children: g
                ? (0, Z.jsx)(`input`, {
                    autoFocus: !0,
                    className: `group-title-input`,
                    onBlur: D,
                    onChange: (e) => p(e.currentTarget.value),
                    onClick: (e) => e.stopPropagation(),
                    onKeyDown: A,
                    value: f,
                  })
                : (0, Z.jsxs)(`div`, {
                    className: `group-title-row`,
                    children: [
                      (0, Z.jsx)(`div`, {
                        className: `group-title-handle`,
                        "data-draggable": String(!C),
                        ref: C ? void 0 : T.handleRef,
                        children: (0, Z.jsx)(`div`, {
                          className: `group-title`,
                          children: c.title,
                        }),
                      }),
                      c.isActive && !C
                        ? (0, Z.jsx)(`div`, {
                            className: `group-layout-controls`,
                            onClick: (e) => {
                              (e.preventDefault(), e.stopPropagation());
                            },
                            children: (0, Z.jsx)(`div`, {
                              className: `group-control-anchor`,
                              children: (0, Z.jsx)(`button`, {
                                "aria-expanded": v === `visible-count`,
                                "aria-haspopup": `menu`,
                                "aria-label": `Select split count for ${c.title}`,
                                className: `group-add-button group-control-button`,
                                "data-open": String(v === `visible-count`),
                                onClick: () => {
                                  y((e) => (e === `visible-count` ? void 0 : `visible-count`));
                                },
                                onContextMenu: (e) => {
                                  (e.preventDefault(),
                                    e.stopPropagation(),
                                    y((e) => (e === `visible-count` ? void 0 : `visible-count`)));
                                },
                                ref: S,
                                title: `Select split count for ${c.title}`,
                                type: `button`,
                                children: (0, Z.jsx)(`span`, {
                                  className: `group-control-count-value`,
                                  children: String(c.layoutVisibleCount),
                                }),
                              }),
                            }),
                          })
                        : null,
                      (0, Z.jsx)(`button`, {
                        "aria-label": C
                          ? `Open a browser in ${c.title}`
                          : `Create a session in ${c.title}`,
                        className: C
                          ? `group-add-button group-add-button-always-visible`
                          : `group-add-button`,
                        onClick: (e) => {
                          (e.preventDefault(), e.stopPropagation(), te());
                        },
                        title: C
                          ? `Open a browser in ${c.title}`
                          : `Create a session in ${c.title}`,
                        type: `button`,
                        children: (0, Z.jsx)(ax, {
                          "aria-hidden": `true`,
                          className: `group-add-icon`,
                          size: 14,
                          stroke: 2,
                        }),
                      }),
                    ],
                  }),
            }),
          }),
          (0, Z.jsx)(`div`, {
            className: `group-sessions`,
            "data-drop-target": String(E),
            children:
              l.length > 0
                ? l.map((e, t) =>
                    (0, Z.jsx)(
                      cD,
                      {
                        dropPosition:
                          o?.kind === `session` && o.groupId === c.groupId && o.sessionId === e
                            ? o.position
                            : void 0,
                        groupId: c.groupId,
                        index: t,
                        onFocusRequested: a,
                        sessionId: e,
                        vscode: s,
                      },
                      e,
                    ),
                  )
                : C
                  ? (0, Z.jsx)(`div`, {
                      className: `group-empty-drop-target`,
                      "data-drop-target": String(E),
                      children: (0, Z.jsx)(`div`, {
                        className: `group-empty-state`,
                        children: `No browsers`,
                      }),
                    })
                  : (0, Z.jsx)(`div`, {
                      className: `group-empty-drop-target`,
                      "data-drop-target": String(E),
                      children: (0, Z.jsx)(`div`, {
                        className: `group-empty-state`,
                        children: `No sessions`,
                      }),
                    }),
          }),
        ],
      }),
      !C && u
        ? (0, OD.createPortal)(
            (0, Z.jsxs)(`div`, {
              className: `session-context-menu`,
              onClick: (e) => e.stopPropagation(),
              onContextMenu: (e) => {
                (e.preventDefault(), e.stopPropagation());
              },
              ref: b,
              role: `menu`,
              style: { left: `${u.x}px`, top: `${u.y}px`, width: `${MD}px` },
              children: [
                (0, Z.jsxs)(`button`, {
                  className: `session-context-menu-item`,
                  onClick: () => {
                    (d(void 0), _(!0));
                  },
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, Z.jsx)($b, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Rename`,
                  ],
                }),
                (0, Z.jsxs)(`button`, {
                  className: `session-context-menu-item session-context-menu-item-danger`,
                  disabled: !t,
                  onClick: k,
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, Z.jsx)(Cx, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Close`,
                  ],
                }),
              ],
            }),
            document.body,
          )
        : null,
      !C && v === `visible-count`
        ? (0, OD.createPortal)(
            (0, Z.jsx)(`div`, {
              className: `group-control-menu session-context-menu group-control-count-menu`,
              onClick: (e) => e.stopPropagation(),
              ref: x,
              role: `menu`,
              style: DD(S.current),
              children: ND.map((e) =>
                (0, Z.jsx)(
                  `button`,
                  {
                    "aria-pressed": c.layoutVisibleCount === e,
                    "aria-label": TD(e),
                    className: `session-context-menu-item group-control-menu-item`,
                    "data-selected": String(c.layoutVisibleCount === e),
                    onClick: () => O(e),
                    role: `menuitem`,
                    title: TD(e),
                    type: `button`,
                    children: (0, Z.jsx)(`span`, {
                      className: `group-control-count-option-value`,
                      children: String(e),
                    }),
                  },
                  e,
                ),
              ),
            }),
            document.body,
          )
        : null,
      C
        ? null
        : (0, Z.jsx)($T, {
            confirmLabel: `Terminate Group`,
            description: `This will terminate all ${l.length} session${l.length === 1 ? `` : `s`} in ${c.title}.`,
            isOpen: m,
            onCancel: () => h(!1),
            onConfirm: () => {
              (h(!1), s.postMessage({ groupId: c.groupId, type: `closeGroup` }));
            },
            title: `Close group?`,
          }),
    ],
  });
}
function DD(e) {
  let t = wD(e);
  if (t)
    return { left: `${t.x}px`, position: `fixed`, top: `${t.y}px`, transform: `translateX(-50%)` };
}
var OD,
  kD,
  Z,
  AD,
  jD,
  MD,
  ND,
  PD,
  FD = t(() => {
    (Tx(),
      Fp(),
      YC(),
      cw(),
      (OD = e(a())),
      (kD = e(r())),
      rE(),
      oD(),
      Zw(),
      SD(),
      (Z = i()),
      (AD = 90),
      (jD = 12),
      (MD = 164),
      (ND = [1, 2, 3, 4, 6, 9]),
      (PD = 12),
      (ED.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SessionGroupSection`,
        props: {
          autoEdit: { required: !0, tsType: { name: `boolean` }, description: `` },
          canClose: { required: !0, tsType: { name: `boolean` }, description: `` },
          groupId: { required: !0, tsType: { name: `string` }, description: `` },
          index: { required: !0, tsType: { name: `number` }, description: `` },
          onAutoEditHandled: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `() => void`,
              signature: { arguments: [], return: { name: `void` } },
            },
            description: ``,
          },
          onFocusRequested: {
            required: !1,
            tsType: {
              name: `signature`,
              type: `function`,
              raw: `(groupId: string, sessionId: string) => void`,
              signature: {
                arguments: [
                  { type: { name: `string` }, name: `groupId` },
                  { type: { name: `string` }, name: `sessionId` },
                ],
                return: { name: `void` },
              },
            },
            description: ``,
          },
          sessionDragIndicator: {
            required: !1,
            tsType: {
              name: `union`,
              raw: `| {
    groupId: string;
    kind: "group";
    position: "start" | "end";
  }
| {
    groupId: string;
    kind: "session";
    position: "before" | "after";
    sessionId: string;
  }`,
              elements: [
                {
                  name: `signature`,
                  type: `object`,
                  raw: `{
  groupId: string;
  kind: "group";
  position: "start" | "end";
}`,
                  signature: {
                    properties: [
                      { key: `groupId`, value: { name: `string`, required: !0 } },
                      { key: `kind`, value: { name: `literal`, value: `"group"`, required: !0 } },
                      {
                        key: `position`,
                        value: {
                          name: `union`,
                          raw: `"start" | "end"`,
                          elements: [
                            { name: `literal`, value: `"start"` },
                            { name: `literal`, value: `"end"` },
                          ],
                          required: !0,
                        },
                      },
                    ],
                  },
                },
                {
                  name: `signature`,
                  type: `object`,
                  raw: `{
  groupId: string;
  kind: "session";
  position: "before" | "after";
  sessionId: string;
}`,
                  signature: {
                    properties: [
                      { key: `groupId`, value: { name: `string`, required: !0 } },
                      { key: `kind`, value: { name: `literal`, value: `"session"`, required: !0 } },
                      {
                        key: `position`,
                        value: {
                          name: `union`,
                          raw: `"before" | "after"`,
                          elements: [
                            { name: `literal`, value: `"before"` },
                            { name: `literal`, value: `"after"` },
                          ],
                          required: !0,
                        },
                      },
                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                    ],
                  },
                },
              ],
            },
            description: ``,
          },
          vscode: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  postMessage: (message: SidebarToExtensionMessage) => void;
}`,
              signature: {
                properties: [
                  {
                    key: `postMessage`,
                    value: {
                      name: `signature`,
                      type: `function`,
                      raw: `(message: SidebarToExtensionMessage) => void`,
                      signature: {
                        arguments: [
                          {
                            type: {
                              name: `union`,
                              raw: `| {
    type: 'ready';
  }
| {
    type: 'openSettings';
  }
| {
    type: 'toggleCompletionBell';
  }
| {
    type: 'refreshDaemonSessions';
  }
| {
    type: 'killTerminalDaemon';
  }
| {
    type: 'killDaemonSession';
    sessionId: string;
    workspaceId: string;
  }
| {
    type: 'moveSidebarToOtherSide';
  }
| {
    type: 'createSession';
  }
| {
    type: 'openBrowser';
  }
| {
    type: 'createSessionInGroup';
    groupId: string;
  }
| {
    type: 'focusGroup';
    groupId: string;
  }
| {
    type: 'toggleFullscreenSession';
  }
| {
    type: 'focusSession';
    sessionId: string;
  }
| {
    type: 'promptRenameSession';
    sessionId: string;
  }
| {
    type: 'restartSession';
    sessionId: string;
  }
| {
    type: 'renameSession';
    sessionId: string;
    title: string;
  }
| {
    type: 'renameGroup';
    groupId: string;
    title: string;
  }
| {
    type: 'closeGroup';
    groupId: string;
  }
| {
    type: 'closeSession';
    sessionId: string;
  }
| {
    type: 'copyResumeCommand';
    sessionId: string;
  }
| {
    historyId: string;
    type: 'restorePreviousSession';
  }
| {
    historyId: string;
    type: 'deletePreviousSession';
  }
| {
    type: 'clearGeneratedPreviousSessions';
  }
| {
    content: string;
    type: 'saveScratchPad';
  }
| {
    collapsed: boolean;
    section: SidebarCollapsibleSection;
    type: 'setSidebarSectionCollapsed';
  }
| {
    type: 'moveSessionToGroup';
    groupId: string;
    sessionId: string;
    targetIndex?: number;
  }
| {
    type: 'sidebarDebugLog';
    event: string;
    details?: unknown;
  }
| {
    type: 'createGroupFromSession';
    sessionId: string;
  }
| {
    type: 'createGroup';
  }
| {
    type: 'setVisibleCount';
    visibleCount: VisibleSessionCount;
  }
| {
    type: 'setViewMode';
    viewMode: TerminalViewMode;
  }
| {
    type: 'syncSessionOrder';
    groupId: string;
    sessionIds: string[];
  }
| {
    type: 'syncGroupOrder';
    groupIds: string[];
  }
| {
    type: 'runSidebarCommand';
    commandId: string;
  }
| {
    action: SidebarGitAction;
    type: 'runSidebarGitAction';
  }
| {
    action: SidebarGitAction;
    type: 'setSidebarGitPrimaryAction';
  }
| {
    type: 'refreshGitState';
  }
| {
    enabled: boolean;
    type: 'setSidebarGitCommitConfirmationEnabled';
  }
| {
    requestId: string;
    subject: string;
    type: 'confirmSidebarGitCommit';
  }
| {
    requestId: string;
    type: 'cancelSidebarGitCommit';
  }
| {
    type: 'saveSidebarCommand';
    actionType: SidebarActionType;
    closeTerminalOnExit: boolean;
    commandId?: string;
    name: string;
    command?: string;
    url?: string;
  }
| {
    type: 'deleteSidebarCommand';
    commandId: string;
  }
| {
    type: 'syncSidebarCommandOrder';
    commandIds: string[];
  }
| {
    type: 'runSidebarAgent';
    agentId: string;
  }
| {
    type: 'saveSidebarAgent';
    agentId?: string;
    command: string;
    icon?: SidebarAgentIcon;
    name: string;
  }
| {
    type: 'deleteSidebarAgent';
    agentId: string;
  }
| {
    type: 'syncSidebarAgentOrder';
    agentIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'ready';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `'ready'`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openSettings';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openSettings'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleCompletionBell';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleCompletionBell'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshDaemonSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshDaemonSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killTerminalDaemon';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killTerminalDaemon'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killDaemonSession';
  sessionId: string;
  workspaceId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killDaemonSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `workspaceId`,
                                        value: { name: `string`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSidebarToOtherSide';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSidebarToOtherSide'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openBrowser';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openBrowser'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSessionInGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSessionInGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleFullscreenSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleFullscreenSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'promptRenameSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'promptRenameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'restartSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restartSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameSession';
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameGroup';
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'copyResumeCommand';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'copyResumeCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'restorePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restorePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'deletePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deletePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'clearGeneratedPreviousSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'clearGeneratedPreviousSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  content: string;
  type: 'saveScratchPad';
}`,
                                  signature: {
                                    properties: [
                                      { key: `content`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveScratchPad'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  collapsed: boolean;
  section: SidebarCollapsibleSection;
  type: 'setSidebarSectionCollapsed';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `collapsed`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      {
                                        key: `section`,
                                        value: {
                                          name: `union`,
                                          raw: `'actions' | 'agents'`,
                                          elements: [
                                            { name: `literal`, value: `'actions'` },
                                            { name: `literal`, value: `'agents'` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarSectionCollapsed'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSessionToGroup';
  groupId: string;
  sessionId: string;
  targetIndex?: number;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSessionToGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `targetIndex`,
                                        value: { name: `number`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'sidebarDebugLog';
  event: string;
  details?: unknown;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'sidebarDebugLog'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `event`, value: { name: `string`, required: !0 } },
                                      { key: `details`, value: { name: `unknown`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroupFromSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroupFromSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroup';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroup'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setVisibleCount';
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setVisibleCount'`,
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
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setViewMode';
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setViewMode'`,
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
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSessionOrder';
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSessionOrder'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `sessionIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncGroupOrder';
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncGroupOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `groupIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'runSidebarGitAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarGitAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'setSidebarGitPrimaryAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitPrimaryAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshGitState';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshGitState'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  enabled: boolean;
  type: 'setSidebarGitCommitConfirmationEnabled';
}`,
                                  signature: {
                                    properties: [
                                      { key: `enabled`, value: { name: `boolean`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitCommitConfirmationEnabled'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  subject: string;
  type: 'confirmSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      { key: `subject`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'confirmSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  type: 'cancelSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'cancelSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarCommand';
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  name: string;
  command?: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
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
                                      { key: `commandId`, value: { name: `string`, required: !1 } },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarCommandOrder';
  commandIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarCommandOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `commandIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarAgent';
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !1 } },
                                      { key: `command`, value: { name: `string`, required: !0 } },
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
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarAgentOrder';
  agentIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarAgentOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `agentIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                            name: `message`,
                          },
                        ],
                        return: { name: `void` },
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
function ID({ messageSource: e = window, vscode: t }) {
  let [n, r] = (0, Q.useState)(!0),
    [i, a] = (0, Q.useState)(),
    [o, s] = (0, Q.useState)(0),
    [c, l] = (0, Q.useState)(0),
    [u, d] = (0, Q.useState)(!1),
    [f, p] = (0, Q.useState)(!1),
    [m, h] = (0, Q.useState)(!1),
    [g, _] = (0, Q.useState)(!1),
    [v, y] = (0, Q.useState)(!1),
    [b, x] = (0, Q.useState)(),
    S = (0, Q.useRef)(!1),
    C = (0, Q.useRef)(!1),
    w = (0, Q.useRef)(null),
    T = (0, Q.useRef)(null),
    E = (0, Q.useRef)([]),
    D = (0, Q.useRef)({});
  C.current ||= (zw(), !0);
  let ee = Xw((e) => e.applyLocalFocus),
    te = Xw((e) => e.applySessionPresentationMessage),
    O = Xw((e) => e.applySidebarMessage),
    k = Xw((e) => e.setDaemonSessionsState),
    A = Xw((e) => e.setGitCommitDraft),
    ne = Xw((e) => e.setSectionCollapsed),
    {
      agentManagerZoomPercent: j,
      browserGroupIds: re,
      collapsedSections: ie,
      commandCount: ae,
      completionBellEnabled: oe,
      debuggingMode: se,
      groupOrder: ce,
      sectionVisibility: M,
      structureRevision: le,
      theme: N,
      workspaceGroupIds: ue,
    } = Xw(
      Mx((e) => ({
        agentManagerZoomPercent: e.hud.agentManagerZoomPercent,
        browserGroupIds: e.browserGroupIds,
        collapsedSections: e.hud.collapsedSections,
        commandCount: e.hud.commands.length,
        completionBellEnabled: e.hud.completionBellEnabled,
        debuggingMode: e.hud.debuggingMode,
        groupOrder: e.groupOrder,
        sectionVisibility: e.hud.sectionVisibility,
        structureRevision: e.revision,
        theme: e.hud.theme,
        workspaceGroupIds: e.workspaceGroupIds,
      })),
    ),
    de = Xw((e) => e.gitCommitDraft),
    P = Xw((e) => e.sessionIdsByGroup),
    fe = n,
    pe = () => {
      fe || t.postMessage({ type: `createSession` });
    },
    me = (e) => {
      LD(e.target, e.currentTarget) && (e.preventDefault(), pe());
    },
    he = (0, Q.useEffectEvent)((e) => {
      if (e.data) {
        if (e.data.type === `playCompletionSound`) {
          (xe(`completionSound.messageReceived`, { sound: e.data.sound }),
            MS(e.data.sound, (e, t) => {
              xe(e, t);
            }));
          return;
        }
        if (e.data.type === `sessionPresentationChanged`) {
          te(e.data);
          return;
        }
        if (e.data.type === `daemonSessionsState`) {
          k(e.data);
          return;
        }
        if (e.data.type === `promptGitCommit`) {
          A(e.data);
          return;
        }
        if (!(e.data.type !== `hydrate` && e.data.type !== `sessionState`)) {
          if (S.current) {
            let t = HD(
              ce,
              e.data.groups.map((e) => e.groupId),
            );
            t && (a(t), (S.current = !1));
          }
          O(e.data);
        }
      }
    });
  ((0, Q.useEffect)(() => {
    let t = (e) => {
      e instanceof MessageEvent && he(e);
    };
    return (
      e.addEventListener(`message`, t),
      () => {
        e.removeEventListener(`message`, t);
      }
    );
  }, [he, e]),
    (0, Q.useEffect)(() => {
      let e = window.setTimeout(() => {
        r(!1);
      }, tO);
      return () => {
        window.clearTimeout(e);
      };
    }, []),
    (0, Q.useEffect)(() => {
      t.postMessage({ type: `ready` });
    }, [t]),
    (0, Q.useEffect)(
      () => (
        (document.body.dataset.sidebarTheme = N),
        () => {
          delete document.body.dataset.sidebarTheme;
        }
      ),
      [N],
    ),
    (0, Q.useEffect)(
      () => (
        document.body.style.setProperty(`--vsmux-agent-manager-zoom`, `${j}%`),
        () => {
          document.body.style.removeProperty(`--vsmux-agent-manager-zoom`);
        }
      ),
      [j],
    ),
    (0, Q.useEffect)(() => {
      T.current && (T.current.inert = fe);
    }, [fe]),
    (0, Q.useEffect)(() => {
      if (!u) return;
      let e = (e) => {
          let t = e.target;
          t instanceof Node && (w.current?.contains(t) || d(!1));
        },
        t = (e) => {
          e.key === `Escape` && d(!1);
        };
      return (
        document.addEventListener(`pointerdown`, e),
        document.addEventListener(`keydown`, t),
        () => {
          (document.removeEventListener(`pointerdown`, e),
            document.removeEventListener(`keydown`, t));
        }
      );
    }, [u]));
  let ge = ue,
    _e = M.browsers ? re : [],
    ve = M.actions && (M.git || ae > 0),
    ye = M.agents,
    be = (0, Q.useMemo)(() => zD(ue, P), [P, ue]);
  ((0, Q.useEffect)(() => {
    E.current = ge;
  }, [ge]),
    (0, Q.useEffect)(() => {
      D.current = be;
    }, [be]));
  let xe = (0, Q.useEffectEvent)((e, n) => {
      se && t.postMessage({ details: n, event: e, type: `sidebarDebugLog` });
    }),
    Se = (0, Q.useEffectEvent)(() => {
      jS((e, t) => {
        xe(e, t);
      });
    });
  (0, Q.useEffect)(() => {
    let e = () => {
        Se();
      },
      t = () => {
        Se();
      };
    return (
      window.addEventListener(`pointerdown`, e, !0),
      window.addEventListener(`keydown`, t, !0),
      () => {
        (window.removeEventListener(`pointerdown`, e, !0),
          window.removeEventListener(`keydown`, t, !0));
      }
    );
  }, [Se]);
  let Ce = (0, Q.useEffectEvent)((e, t, n) => {
      let r = GE(t);
      if (r?.kind !== `session`) {
        x(void 0);
        return;
      }
      let i = GE(n),
        a = KD(e, D.current, i, r) ?? void 0;
      x((e) => (qD(e, a) ? e : a));
    }),
    we = (e) => {
      let t = ZD(e),
        n = GE(e.operation.source);
      if (
        (xe(`session.dragStart`, {
          nativeEventType: t?.type,
          point: KE(t),
          sourceData: n,
          targetData: GE(e.operation.target),
        }),
        n?.kind !== `session`)
      ) {
        x(void 0);
        return;
      }
      x(void 0);
    },
    Te = (e) => {
      Ce(ZD(e), e.operation.source, e.operation.target);
    },
    Ee = (e) => {
      Ce(ZD(e), e.operation.source, e.operation.target);
    },
    De = (e) => {
      x(void 0);
      let n = E.current,
        r = D.current,
        i = ue,
        a = be,
        o = ZD(e),
        s = GE(e.operation.source),
        c = GE(e.operation.target),
        l = s?.kind === `session` ? KD(o, r, c, s) : void 0;
      if (
        (xe(`session.dragEnd`, {
          canceled: e.canceled,
          nativeEventType: o?.type,
          point: KE(o),
          resolvedSessionDropTarget: l,
          sourceData: s,
          targetData: c,
        }),
        !s)
      )
        return;
      if (s.kind === `group`) {
        if (e.canceled || c?.kind !== `group`) return;
        let r = Xv(n, e);
        if (VD(i, r)) return;
        t.postMessage({ groupIds: r, type: `syncGroupOrder` });
        return;
      }
      if (s.kind !== `session` || e.canceled || l === null || (!c && l === void 0)) return;
      let u = l === void 0 ? Xv(r, e) : YE(r, s.sessionId, l),
        d = BD(a, s.sessionId),
        f = BD(u, s.sessionId);
      if (!d || !f) return;
      if (d !== f) {
        let e = u[f]?.indexOf(s.sessionId);
        if (e == null || e < 0) return;
        t.postMessage({
          groupId: f,
          sessionId: s.sessionId,
          targetIndex: e,
          type: `moveSessionToGroup`,
        });
        return;
      }
      let p = a[f] ?? [],
        m = u[f] ?? [];
      VD(p, m) || t.postMessage({ groupId: f, sessionIds: m, type: `syncSessionOrder` });
    },
    Oe = {
      completionBellEnabled: oe,
      isOverflowMenuOpen: u,
      isScratchPadOpen: g,
      onAddAction: () => {
        (d(!1), l((e) => e + 1));
      },
      onAddAgent: () => {
        (d(!1), s((e) => e + 1));
      },
      onMoveSidebar: () => {
        (d(!1), t.postMessage({ type: `moveSidebarToOtherSide` }));
      },
      onOpenSettings: () => {
        (d(!1), t.postMessage({ type: `openSettings` }));
      },
      onShowRunning: () => {
        (d(!1), h(!1), _(!1), p(!0), t.postMessage({ type: `refreshDaemonSessions` }));
      },
      onToggleBell: () => {
        (d(!1), t.postMessage({ type: `toggleCompletionBell` }));
      },
      onToggleMenu: () => d((e) => !e),
      onToggleScratchPad: () => {
        (p(!1), h(!1), _((e) => !e));
      },
      overflowControlsRef: w,
    };
  return (0, $.jsx)(nl, {
    delay: Qw,
    children: (0, $.jsxs)(`div`, {
      className: `stack`,
      "data-dimmed": String(n),
      "data-sidebar-theme": N,
      onDoubleClick: me,
      children: [
        (0, $.jsx)(PT, {
          createRequestId: c,
          titlebarActions: ve ? GD({ ...Oe, showScratchPad: !ye }) : void 0,
          isCollapsed: ie.actions,
          onToggleCollapsed: (e) => {
            (ne(`actions`, e),
              t.postMessage({
                collapsed: e,
                section: `actions`,
                type: `setSidebarSectionCollapsed`,
              }));
          },
          showGitButton: M.git,
          vscode: t,
        }),
        (0, $.jsx)(cT, {
          createRequestId: o,
          titlebarActions: ye ? GD({ ...Oe, showMenu: !ve, showScratchPad: !0 }) : void 0,
          isCollapsed: ie.agents,
          isVisible: ye,
          onToggleCollapsed: (e) => {
            (ne(`agents`, e),
              t.postMessage({
                collapsed: e,
                section: `agents`,
                type: `setSidebarSectionCollapsed`,
              }));
          },
          vscode: t,
        }),
        (0, $.jsxs)(`section`, {
          className: `session-groups-panel`,
          ref: T,
          children: [
            (0, $.jsx)(Tw, {
              actions: (0, $.jsxs)($.Fragment, {
                children: [
                  (0, $.jsx)(RD, {
                    ariaExpanded: m,
                    ariaHasPopup: `dialog`,
                    ariaLabel: `Show previous sessions`,
                    className: `floating-toolbar-button section-titlebar-action-button`,
                    isSelected: m,
                    onClick: () => {
                      (p(!1), _(!1), h((e) => !e));
                    },
                    tooltip: `Previous Sessions`,
                    children: (0, $.jsx)(Wb, {
                      "aria-hidden": `true`,
                      className: `toolbar-tabler-icon`,
                      stroke: 1.8,
                    }),
                  }),
                  !ve && !ye ? GD({ ...Oe, showScratchPad: !0 }) : null,
                ],
              }),
              isCollapsed: v,
              isCollapsible: !0,
              onToggleCollapsed: () => y((e) => !e),
              title: `Sessions`,
            }),
            v
              ? null
              : (0, $.jsxs)($.Fragment, {
                  children: [
                    _e.length > 0
                      ? (0, $.jsx)(`div`, {
                          className: `group-list`,
                          children: _e.map((e) =>
                            (0, $.jsx)(
                              ED,
                              {
                                autoEdit: !1,
                                canClose: !1,
                                groupId: e,
                                index: -1,
                                onAutoEditHandled: () => void 0,
                                vscode: t,
                              },
                              e,
                            ),
                          ),
                        })
                      : null,
                    (0, $.jsx)(
                      by,
                      {
                        onDragEnd: De,
                        onDragMove: Te,
                        onDragOver: Ee,
                        onDragStart: we,
                        sensors: eO,
                        children: (0, $.jsx)(`div`, {
                          className: `group-list`,
                          children: ge.map((e, n) =>
                            (0, $.jsx)(
                              ED,
                              {
                                autoEdit: i === e,
                                canClose: ge.length > 1,
                                groupId: e,
                                index: n,
                                onAutoEditHandled: () => a(void 0),
                                onFocusRequested: ee,
                                sessionDragIndicator: b,
                                vscode: t,
                              },
                              e,
                            ),
                          ),
                        }),
                      },
                      `drag-structure-${le}`,
                    ),
                    (0, $.jsxs)(`button`, {
                      "aria-label": `Create a new group`,
                      className: `group-create-button`,
                      "data-empty-space-blocking": `true`,
                      disabled: ge.length >= 20,
                      onClick: () => {
                        ((S.current = !0), t.postMessage({ type: `createGroup` }));
                      },
                      type: `button`,
                      children: [
                        (0, $.jsx)(ax, {
                          "aria-hidden": `true`,
                          className: `group-create-button-icon`,
                          size: 14,
                        }),
                        `New Group`,
                      ],
                    }),
                    _e.length === 0 && ge.every((e) => (be[e] ?? []).length === 0)
                      ? (0, $.jsx)(`div`, {
                          className: `empty`,
                          "data-empty-space-blocking": `true`,
                          children: `Create the first session to start the workspace.`,
                        })
                      : null,
                  ],
                }),
          ],
        }),
        (0, $.jsx)(NE, { isOpen: m, onClose: () => h(!1), vscode: t }),
        (0, $.jsx)(iE, { isOpen: f, onClose: () => p(!1), vscode: t }),
        (0, $.jsx)(RE, {
          isOpen: g,
          onClose: () => _(!1),
          onSave: (e) => {
            t.postMessage({ content: e, type: `saveScratchPad` });
          },
        }),
        (0, $.jsx)(uE, {
          draft: de ?? {
            confirmLabel: `Commit`,
            description: ``,
            requestId: ``,
            suggestedSubject: ``,
          },
          isOpen: de !== void 0,
          onCancel: (e) => {
            (A(void 0), t.postMessage({ requestId: e, type: `cancelSidebarGitCommit` }));
          },
          onConfirm: (e, n) => {
            (A(void 0),
              t.postMessage({ requestId: e, subject: n, type: `confirmSidebarGitCommit` }));
          },
        }),
      ],
    }),
  });
}
function LD(e, t) {
  if (e === t) return !0;
  let n = e instanceof Node ? e : void 0,
    r = n instanceof Element ? n : (n?.parentElement ?? void 0);
  return !r || !t.contains(r) ? !1 : r.closest($D) === null;
}
function RD({
  ariaControls: e,
  ariaExpanded: t,
  ariaHasPopup: n,
  ariaLabel: r,
  children: i,
  className: a,
  dataDimmed: o,
  isDisabled: s = !1,
  isDimmed: c = !1,
  isSelected: l = !1,
  onClick: u,
  tabIndex: d,
  tooltip: f,
}) {
  return (0, $.jsxs)(Bs, {
    children: [
      (0, $.jsx)(sc, {
        render: (0, $.jsx)(`button`, {
          "aria-controls": e,
          "aria-disabled": s,
          "aria-expanded": t,
          "aria-haspopup": n,
          "aria-label": r,
          className: a ? `toolbar-button ${a}` : `toolbar-button`,
          "data-disabled": String(s),
          "data-dimmed": o ?? String(c),
          "data-selected": String(l),
          onClick: () => {
            s || u();
          },
          tabIndex: d,
          type: `button`,
          children: i,
        }),
      }),
      (0, $.jsx)(bc, {
        children: (0, $.jsx)(Jc, {
          className: `tooltip-positioner`,
          sideOffset: 8,
          children: (0, $.jsx)(Qc, { className: `tooltip-popup`, children: f }),
        }),
      }),
    ],
  });
}
function zD(e, t) {
  return Object.fromEntries(e.map((e) => [e, t[e] ?? []]));
}
function BD(e, t) {
  return Object.entries(e).find(([, e]) => e.includes(t))?.[0];
}
function VD(e, t) {
  return e.length === t.length ? e.every((e, n) => e === t[n]) : !1;
}
function HD(e, t) {
  let n = new Set(e);
  return t.find((e) => !n.has(e));
}
function UD() {
  return (0, $.jsxs)(`svg`, {
    "aria-hidden": `true`,
    className: `toolbar-icon`,
    viewBox: `0 0 16 16`,
    children: [
      (0, $.jsx)(`circle`, { cx: `3.5`, cy: `8`, fill: `currentColor`, r: `1.1` }),
      (0, $.jsx)(`circle`, { cx: `8`, cy: `8`, fill: `currentColor`, r: `1.1` }),
      (0, $.jsx)(`circle`, { cx: `12.5`, cy: `8`, fill: `currentColor`, r: `1.1` }),
    ],
  });
}
function WD(e) {
  return e ? `Disable Notifying` : `Enable Notifying`;
}
function GD({
  completionBellEnabled: e,
  isOverflowMenuOpen: t,
  isScratchPadOpen: n,
  onAddAction: r,
  onAddAgent: i,
  onMoveSidebar: a,
  onOpenSettings: o,
  onShowRunning: s,
  onToggleBell: c,
  onToggleMenu: l,
  onToggleScratchPad: u,
  overflowControlsRef: d,
  showMenu: f = !0,
  showScratchPad: p,
}) {
  if (!(!p && !f))
    return (0, $.jsxs)(`div`, {
      className: `sidebar-titlebar-controls`,
      "data-empty-space-blocking": `true`,
      "data-menu-open": String(t),
      ref: d,
      children: [
        p
          ? (0, $.jsxs)(Bs, {
              children: [
                (0, $.jsx)(sc, {
                  render: (0, $.jsx)(`button`, {
                    "aria-expanded": n,
                    "aria-haspopup": `dialog`,
                    "aria-label": `Show scratch pad`,
                    className: `floating-toolbar-button section-titlebar-action-button toolbar-button`,
                    "data-empty-space-blocking": `true`,
                    "data-selected": String(n),
                    onClick: u,
                    type: `button`,
                    children: (0, $.jsx)($b, {
                      "aria-hidden": `true`,
                      className: `toolbar-tabler-icon`,
                      stroke: 1.8,
                    }),
                  }),
                }),
                (0, $.jsx)(bc, {
                  children: (0, $.jsx)(Jc, {
                    className: `tooltip-positioner`,
                    sideOffset: 8,
                    children: (0, $.jsx)(Qc, {
                      className: `tooltip-popup`,
                      children: `Scratch Pad`,
                    }),
                  }),
                }),
              ],
            })
          : null,
        f
          ? (0, $.jsxs)($.Fragment, {
              children: [
                (0, $.jsx)(RD, {
                  ariaControls: `sidebar-overflow-menu`,
                  ariaExpanded: t,
                  ariaHasPopup: `menu`,
                  ariaLabel: `Open sidebar menu`,
                  className: `floating-toolbar-button section-titlebar-action-button`,
                  isSelected: t,
                  onClick: l,
                  tooltip: `More`,
                  children: (0, $.jsx)(UD, {}),
                }),
                t
                  ? (0, $.jsxs)(`div`, {
                      "aria-label": `Sidebar actions`,
                      className: `session-context-menu sidebar-floating-menu`,
                      "data-empty-space-blocking": `true`,
                      id: `sidebar-overflow-menu`,
                      role: `menu`,
                      children: [
                        (0, $.jsxs)(`button`, {
                          className: `session-context-menu-item`,
                          onClick: i,
                          role: `menuitem`,
                          type: `button`,
                          children: [
                            (0, $.jsx)(ax, {
                              "aria-hidden": `true`,
                              className: `session-context-menu-icon`,
                              size: 14,
                            }),
                            `Add Agent`,
                          ],
                        }),
                        (0, $.jsxs)(`button`, {
                          className: `session-context-menu-item`,
                          onClick: r,
                          role: `menuitem`,
                          type: `button`,
                          children: [
                            (0, $.jsx)(ax, {
                              "aria-hidden": `true`,
                              className: `session-context-menu-icon`,
                              size: 14,
                            }),
                            `Add Action`,
                          ],
                        }),
                        (0, $.jsxs)(`button`, {
                          className: `session-context-menu-item`,
                          onClick: s,
                          role: `menuitem`,
                          type: `button`,
                          children: [
                            (0, $.jsx)(Wb, {
                              "aria-hidden": `true`,
                              className: `session-context-menu-icon`,
                              size: 14,
                            }),
                            `Running`,
                          ],
                        }),
                        (0, $.jsxs)(`button`, {
                          className: `session-context-menu-item`,
                          onClick: c,
                          role: `menuitem`,
                          type: `button`,
                          children: [
                            e
                              ? (0, $.jsx)(mb, {
                                  "aria-hidden": `true`,
                                  className: `session-context-menu-icon`,
                                  size: 14,
                                })
                              : (0, $.jsx)(_b, {
                                  "aria-hidden": `true`,
                                  className: `session-context-menu-icon`,
                                  size: 14,
                                }),
                            WD(e),
                          ],
                        }),
                        (0, $.jsxs)(`button`, {
                          className: `session-context-menu-item`,
                          onClick: a,
                          role: `menuitem`,
                          type: `button`,
                          children: [
                            (0, $.jsx)(qb, {
                              "aria-hidden": `true`,
                              className: `session-context-menu-icon`,
                              size: 14,
                              stroke: 1.8,
                            }),
                            `Change Sidebar`,
                          ],
                        }),
                        (0, $.jsxs)(`button`, {
                          className: `session-context-menu-item`,
                          onClick: o,
                          role: `menuitem`,
                          type: `button`,
                          children: [
                            (0, $.jsx)(dx, {
                              "aria-hidden": `true`,
                              className: `session-context-menu-icon`,
                              size: 14,
                              stroke: 1.8,
                            }),
                            `VSmux Settings`,
                          ],
                        }),
                      ],
                    })
                  : null,
              ],
            })
          : null,
      ],
    });
}
function KD(e, t, n, r) {
  let i = KE(e),
    a = [YD(n, i), i ? qE(document, i.x, i.y) : void 0, JE(e)];
  for (let e of a) {
    if (!e || JD(e, r)) continue;
    let n = t[e.groupId];
    if (n && !(e.kind === `session` && !n.includes(e.sessionId))) return e;
  }
  return null;
}
function qD(e, t) {
  return !e || !t
    ? e === t
    : e.groupId !== t.groupId || e.kind !== t.kind || e.position !== t.position
      ? !1
      : e.kind !== `session` || t.kind !== `session`
        ? !0
        : e.sessionId === t.sessionId;
}
function JD(e, t) {
  return !!(t && e.kind === `session` && e.groupId === t.groupId && e.sessionId === t.sessionId);
}
function YD(e, t) {
  if (e?.kind === `session`) {
    let n = XD(e.sessionId, t);
    if (!n) return;
    let r = n.getBoundingClientRect(),
      i = (t?.y ?? r.top + r.height / 2) > r.top + r.height / 2 ? `after` : `before`;
    return { groupId: e.groupId, kind: `session`, position: i, sessionId: e.sessionId };
  }
  if (e?.kind === `group`) {
    let n = document.querySelector(`[data-sidebar-group-id="${e.groupId}"]`);
    if (!n) return;
    let r = n.getBoundingClientRect(),
      i = (t?.y ?? r.top) > r.top + r.height / 2 ? `end` : `start`;
    return { groupId: e.groupId, kind: `group`, position: i };
  }
}
function XD(e, t) {
  let n = `[data-sidebar-session-id="${e}"]`;
  if (t)
    for (let e of document.elementsFromPoint(t.x, t.y)) {
      let t = e.closest(n);
      if (t && t.dataset.dragging !== `true`) return t;
    }
  return Array.from(document.querySelectorAll(n)).find((e) => e.dataset.dragging !== `true`);
}
function ZD(e) {
  return QD(e) && e.nativeEvent instanceof Event ? e.nativeEvent : void 0;
}
function QD(e) {
  return typeof e == `object` && !!e;
}
var Q,
  $,
  $D,
  eO,
  tO,
  nO = t(() => {
    (al(),
      Kv(),
      oy(),
      ib(),
      Tx(),
      (Q = e(r())),
      Px(),
      AS(),
      BS(),
      ST(),
      QT(),
      lE(),
      mE(),
      LE(),
      HE(),
      Dw(),
      Zw(),
      oD(),
      FD(),
      $w(),
      ($ = i()),
      ($D = [
        `button`,
        `input`,
        `select`,
        `textarea`,
        `a`,
        `[role='button']`,
        `[role='menu']`,
        `[role='menuitem']`,
        `[data-empty-space-blocking='true']`,
      ].join(`, `)),
      (eO = [
        Sv.configure({
          activationConstraints(e) {
            return e.pointerType === `touch`
              ? [new vv.Delay({ tolerance: 5, value: 250 })]
              : [new vv.Distance({ value: 6 })];
          },
        }),
        fv,
      ]),
      (tO = 1500),
      (ID.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SidebarApp`,
        props: {
          messageSource: {
            required: !1,
            tsType: {
              name: `Pick`,
              elements: [
                { name: `Window` },
                {
                  name: `union`,
                  raw: `'addEventListener' | 'removeEventListener'`,
                  elements: [
                    { name: `literal`, value: `'addEventListener'` },
                    { name: `literal`, value: `'removeEventListener'` },
                  ],
                },
              ],
              raw: `Pick<Window, 'addEventListener' | 'removeEventListener'>`,
            },
            description: ``,
            defaultValue: { value: `window`, computed: !0 },
          },
          vscode: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  postMessage: (message: SidebarToExtensionMessage) => void;
}`,
              signature: {
                properties: [
                  {
                    key: `postMessage`,
                    value: {
                      name: `signature`,
                      type: `function`,
                      raw: `(message: SidebarToExtensionMessage) => void`,
                      signature: {
                        arguments: [
                          {
                            type: {
                              name: `union`,
                              raw: `| {
    type: 'ready';
  }
| {
    type: 'openSettings';
  }
| {
    type: 'toggleCompletionBell';
  }
| {
    type: 'refreshDaemonSessions';
  }
| {
    type: 'killTerminalDaemon';
  }
| {
    type: 'killDaemonSession';
    sessionId: string;
    workspaceId: string;
  }
| {
    type: 'moveSidebarToOtherSide';
  }
| {
    type: 'createSession';
  }
| {
    type: 'openBrowser';
  }
| {
    type: 'createSessionInGroup';
    groupId: string;
  }
| {
    type: 'focusGroup';
    groupId: string;
  }
| {
    type: 'toggleFullscreenSession';
  }
| {
    type: 'focusSession';
    sessionId: string;
  }
| {
    type: 'promptRenameSession';
    sessionId: string;
  }
| {
    type: 'restartSession';
    sessionId: string;
  }
| {
    type: 'renameSession';
    sessionId: string;
    title: string;
  }
| {
    type: 'renameGroup';
    groupId: string;
    title: string;
  }
| {
    type: 'closeGroup';
    groupId: string;
  }
| {
    type: 'closeSession';
    sessionId: string;
  }
| {
    type: 'copyResumeCommand';
    sessionId: string;
  }
| {
    historyId: string;
    type: 'restorePreviousSession';
  }
| {
    historyId: string;
    type: 'deletePreviousSession';
  }
| {
    type: 'clearGeneratedPreviousSessions';
  }
| {
    content: string;
    type: 'saveScratchPad';
  }
| {
    collapsed: boolean;
    section: SidebarCollapsibleSection;
    type: 'setSidebarSectionCollapsed';
  }
| {
    type: 'moveSessionToGroup';
    groupId: string;
    sessionId: string;
    targetIndex?: number;
  }
| {
    type: 'sidebarDebugLog';
    event: string;
    details?: unknown;
  }
| {
    type: 'createGroupFromSession';
    sessionId: string;
  }
| {
    type: 'createGroup';
  }
| {
    type: 'setVisibleCount';
    visibleCount: VisibleSessionCount;
  }
| {
    type: 'setViewMode';
    viewMode: TerminalViewMode;
  }
| {
    type: 'syncSessionOrder';
    groupId: string;
    sessionIds: string[];
  }
| {
    type: 'syncGroupOrder';
    groupIds: string[];
  }
| {
    type: 'runSidebarCommand';
    commandId: string;
  }
| {
    action: SidebarGitAction;
    type: 'runSidebarGitAction';
  }
| {
    action: SidebarGitAction;
    type: 'setSidebarGitPrimaryAction';
  }
| {
    type: 'refreshGitState';
  }
| {
    enabled: boolean;
    type: 'setSidebarGitCommitConfirmationEnabled';
  }
| {
    requestId: string;
    subject: string;
    type: 'confirmSidebarGitCommit';
  }
| {
    requestId: string;
    type: 'cancelSidebarGitCommit';
  }
| {
    type: 'saveSidebarCommand';
    actionType: SidebarActionType;
    closeTerminalOnExit: boolean;
    commandId?: string;
    name: string;
    command?: string;
    url?: string;
  }
| {
    type: 'deleteSidebarCommand';
    commandId: string;
  }
| {
    type: 'syncSidebarCommandOrder';
    commandIds: string[];
  }
| {
    type: 'runSidebarAgent';
    agentId: string;
  }
| {
    type: 'saveSidebarAgent';
    agentId?: string;
    command: string;
    icon?: SidebarAgentIcon;
    name: string;
  }
| {
    type: 'deleteSidebarAgent';
    agentId: string;
  }
| {
    type: 'syncSidebarAgentOrder';
    agentIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'ready';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `'ready'`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openSettings';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openSettings'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleCompletionBell';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleCompletionBell'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshDaemonSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshDaemonSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killTerminalDaemon';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killTerminalDaemon'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'killDaemonSession';
  sessionId: string;
  workspaceId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'killDaemonSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `workspaceId`,
                                        value: { name: `string`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSidebarToOtherSide';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSidebarToOtherSide'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'openBrowser';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'openBrowser'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createSessionInGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createSessionInGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'toggleFullscreenSession';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'toggleFullscreenSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'focusSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'focusSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'promptRenameSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'promptRenameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'restartSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restartSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameSession';
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'renameGroup';
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'renameGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `title`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeGroup';
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'closeSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'closeSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'copyResumeCommand';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'copyResumeCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'restorePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'restorePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  historyId: string;
  type: 'deletePreviousSession';
}`,
                                  signature: {
                                    properties: [
                                      { key: `historyId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deletePreviousSession'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'clearGeneratedPreviousSessions';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'clearGeneratedPreviousSessions'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  content: string;
  type: 'saveScratchPad';
}`,
                                  signature: {
                                    properties: [
                                      { key: `content`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveScratchPad'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  collapsed: boolean;
  section: SidebarCollapsibleSection;
  type: 'setSidebarSectionCollapsed';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `collapsed`,
                                        value: { name: `boolean`, required: !0 },
                                      },
                                      {
                                        key: `section`,
                                        value: {
                                          name: `union`,
                                          raw: `'actions' | 'agents'`,
                                          elements: [
                                            { name: `literal`, value: `'actions'` },
                                            { name: `literal`, value: `'agents'` },
                                          ],
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarSectionCollapsed'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'moveSessionToGroup';
  groupId: string;
  sessionId: string;
  targetIndex?: number;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'moveSessionToGroup'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `targetIndex`,
                                        value: { name: `number`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'sidebarDebugLog';
  event: string;
  details?: unknown;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'sidebarDebugLog'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `event`, value: { name: `string`, required: !0 } },
                                      { key: `details`, value: { name: `unknown`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroupFromSession';
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroupFromSession'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'createGroup';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'createGroup'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setVisibleCount';
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setVisibleCount'`,
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
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'setViewMode';
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setViewMode'`,
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
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSessionOrder';
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSessionOrder'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `sessionIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncGroupOrder';
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncGroupOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `groupIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'runSidebarGitAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarGitAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  action: SidebarGitAction;
  type: 'setSidebarGitPrimaryAction';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `action`,
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
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitPrimaryAction'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'refreshGitState';
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'refreshGitState'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  enabled: boolean;
  type: 'setSidebarGitCommitConfirmationEnabled';
}`,
                                  signature: {
                                    properties: [
                                      { key: `enabled`, value: { name: `boolean`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'setSidebarGitCommitConfirmationEnabled'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  subject: string;
  type: 'confirmSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      { key: `subject`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'confirmSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  requestId: string;
  type: 'cancelSidebarGitCommit';
}`,
                                  signature: {
                                    properties: [
                                      { key: `requestId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'cancelSidebarGitCommit'`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarCommand';
  actionType: SidebarActionType;
  closeTerminalOnExit: boolean;
  commandId?: string;
  name: string;
  command?: string;
  url?: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
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
                                      { key: `commandId`, value: { name: `string`, required: !1 } },
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                      { key: `command`, value: { name: `string`, required: !1 } },
                                      { key: `url`, value: { name: `string`, required: !1 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarCommand';
  commandId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarCommand'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `commandId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarCommandOrder';
  commandIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarCommandOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `commandIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'runSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'runSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'saveSidebarAgent';
  agentId?: string;
  command: string;
  icon?: SidebarAgentIcon;
  name: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'saveSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !1 } },
                                      { key: `command`, value: { name: `string`, required: !0 } },
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
                                      { key: `name`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'deleteSidebarAgent';
  agentId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'deleteSidebarAgent'`,
                                          required: !0,
                                        },
                                      },
                                      { key: `agentId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: 'syncSidebarAgentOrder';
  agentIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `'syncSidebarAgentOrder'`,
                                          required: !0,
                                        },
                                      },
                                      {
                                        key: `agentIds`,
                                        value: {
                                          name: `Array`,
                                          elements: [{ name: `string` }],
                                          raw: `string[]`,
                                          required: !0,
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                            name: `message`,
                          },
                        ],
                        return: { name: `void` },
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
function rO(e) {
  let t = new Set(),
    n = [];
  for (let r of e) t.has(r) || (t.add(r), n.push(r));
  return n;
}
function iO(e, t) {
  if (e.visibleSessionIds.length === 0) return [t];
  let n = e.focusedSessionId ? e.visibleSessionIds.indexOf(e.focusedSessionId) : -1;
  if (n < 0) return [...e.visibleSessionIds.slice(0, -1), t];
  let r = [...e.visibleSessionIds];
  return ((r[n] = t), r);
}
function aO(e, t, n, r) {
  if (n <= 0 || e.length === 0) return [];
  let i = e.map((e) => e.sessionId),
    a = rO(t.filter((e) => i.includes(e)));
  for (r && i.includes(r) && !a.includes(r) && a.push(r); a.length < n; ) {
    let e = i.find((e) => !a.includes(e));
    if (!e) break;
    a.push(e);
  }
  if (a.length <= n) return a;
  if (!r) return a.slice(0, n);
  let o = a.indexOf(r);
  if (o < 0) return a.slice(0, n);
  let s = Math.max(0, Math.min(o - n + 1, a.length - n));
  return a.slice(s, s + n);
}
function oO(e, t) {
  if (!(t !== 1 || e === void 0)) return e > 1 ? e : void 0;
}
function sO(e, t) {
  let n = t(e);
  return Wx(n) ? t({ ...n, fullscreenRestoreVisibleCount: void 0, visibleCount: Gx(n) }) : n;
}
function cO(e) {
  return e.map((e, t) => {
    let n = Jx(t);
    return e.slotIndex === t && e.row === n.row && e.column === n.column
      ? e
      : { ...e, column: n.column, row: n.row, slotIndex: t };
  });
}
function lO(e) {
  let t = dO(e),
    n = Zx(t, e.slotIndex, e.displayId),
    r = `Session ${t}`,
    i = typeof e.alias == `string` && e.alias.trim().length > 0 ? e.alias.trim() : n,
    a = typeof e.title == `string` && e.title.trim().length > 0 ? e.title.trim() : r,
    o = qx(e.displayId ?? t - 1);
  return e.kind === `t3` &&
    typeof e.t3.projectId == `string` &&
    typeof e.t3.serverOrigin == `string` &&
    typeof e.t3.threadId == `string` &&
    typeof e.t3.workspaceRoot == `string`
    ? {
        ...e,
        alias: i,
        displayId: o,
        kind: `t3`,
        t3: {
          projectId: e.t3.projectId,
          serverOrigin: e.t3.serverOrigin,
          threadId: e.t3.threadId,
          workspaceRoot: e.t3.workspaceRoot,
        },
        title: a,
      }
    : e.kind === `browser` && typeof e.browser.url == `string`
      ? { ...e, alias: i, browser: { url: e.browser.url }, displayId: o, kind: `browser`, title: a }
      : { ...e, alias: i, displayId: o, kind: `terminal`, title: a };
}
function uO(e, t) {
  return e.visibleSessionIds.includes(t)
    ? e.visibleSessionIds
    : e.visibleSessionIds.length < e.visibleCount
      ? [...e.visibleSessionIds, t]
      : iO(e, t);
}
function dO(e) {
  let t = /^session-(\d+)$/.exec(e.sessionId);
  if (t) {
    let e = Number.parseInt(t[1], 10);
    if (Number.isInteger(e) && e > 0) return e;
  }
  return e.slotIndex + 1;
}
var fO = t(() => {
  AS();
});
function pO(e) {
  let t = e ?? Ux(),
    n = nS({ ...t, sessions: t.sessions.filter((e) => e.slotIndex < 9).map((e) => lO(e)) }),
    r = new Set(n.map((e) => e.sessionId)),
    i = Vx(t.visibleCount),
    a = Hx(t.viewMode),
    o = t.focusedSessionId && r.has(t.focusedSessionId) ? t.focusedSessionId : n[0]?.sessionId,
    s = aO(n, t.visibleSessionIds, Math.min(i, n.length), o);
  return {
    focusedSessionId: o,
    fullscreenRestoreVisibleCount: oO(t.fullscreenRestoreVisibleCount, i),
    sessions: n,
    visibleCount: i,
    visibleSessionIds: s,
    viewMode: a,
  };
}
var mO = t(() => {
  (AS(), fO());
});
function hO(e, t) {
  let n = pO(e);
  return n.sessions.some((e) => e.sessionId === t)
    ? {
        changed: n.focusedSessionId !== t,
        snapshot: pO({ ...n, focusedSessionId: t, visibleSessionIds: uO(n, t) }),
      }
    : { changed: !1, snapshot: n };
}
var gO = t(() => {
  (AS(), fO(), mO());
});
function _O(e, t) {
  return pO({ ...pO(e), fullscreenRestoreVisibleCount: void 0, visibleCount: t });
}
function vO(e) {
  let t = pO(e);
  return t.visibleCount === 1 && t.fullscreenRestoreVisibleCount
    ? sO(t, pO)
    : pO({
        ...t,
        fullscreenRestoreVisibleCount: t.visibleCount > 1 ? t.visibleCount : void 0,
        visibleCount: 1,
      });
}
function yO(e, t) {
  return pO({ ...sO(e, pO), viewMode: t });
}
function bO(e, t) {
  let n = pO(e),
    r = n.sessions
      .slice()
      .sort((e, t) => e.slotIndex - t.slotIndex)
      .map((e) => e.sessionId);
  if (t.length !== r.length || r.every((e, n) => e === t[n])) return { changed: !1, snapshot: n };
  let i = new Set(r),
    a = new Set(t);
  if (a.size !== t.length || r.some((e) => !a.has(e)) || t.some((e) => !i.has(e)))
    return { changed: !1, snapshot: n };
  let o = new Map(n.sessions.map((e) => [e.sessionId, e])),
    s = cO(
      t.map((e) => {
        let t = o.get(e);
        if (!t) throw Error(`Missing session for reorder: ${e}`);
        return t;
      }),
    ),
    c = t.slice(0, Math.min(n.visibleCount, s.length));
  return {
    changed: !0,
    snapshot: pO({
      ...n,
      focusedSessionId:
        n.focusedSessionId && c.includes(n.focusedSessionId) ? n.focusedSessionId : c[0],
      sessions: s,
      visibleSessionIds: c,
    }),
  };
}
function xO(e, t) {
  let n = pO(e);
  if (!n.sessions.some((e) => e.sessionId === t)) return { changed: !1, snapshot: n };
  let r = n.sessions.filter((e) => e.sessionId !== t),
    i = n.visibleSessionIds.filter((e) => e !== t);
  return {
    changed: !0,
    snapshot: pO({
      ...n,
      focusedSessionId: n.focusedSessionId === t ? (i[0] ?? r[0]?.sessionId) : n.focusedSessionId,
      sessions: r,
      visibleSessionIds: i,
    }),
  };
}
var SO = t(() => {
    (AS(), fO(), mO());
  }),
  CO = t(() => {
    (gO(), SO(), mO());
  });
function wO(e, t, n) {
  let r = nS(e),
    i = typeof n == `number` ? Math.max(0, Math.min(n, r.length)) : r.length,
    a = [...r];
  return (a.splice(i, 0, t), pO({ ...e, sessions: a }));
}
function TO(e, t, n) {
  let r = t(e);
  return r ? { ...e, groups: EO(e.groups, r.groupId, n(r.snapshot)) } : e;
}
function EO(e, t, n) {
  return e.map((e) => (e.groupId === t ? { ...e, snapshot: n } : e));
}
function DO(e, t) {
  for (let n = 0; n < e.groups.length; n += 1) {
    let r = e.groups[n];
    if (r.snapshot.sessions.some((e) => e.sessionId === t)) return { group: r, index: n };
  }
}
function OO(e, t) {
  return e.sessions.find((e) => e.sessionId === t);
}
function kO(e) {
  return !!(e && Array.isArray(e.groups) && typeof e.activeGroupId == `string`);
}
function AO(e) {
  return !!(
    e &&
    typeof e == `object` &&
    typeof e.groupId == `string` &&
    typeof e.title == `string` &&
    typeof e.snapshot == `object`
  );
}
function jO(e, t) {
  return {
    groupId: e.groupId.trim().length > 0 ? e.groupId : t === 0 ? Fx : `group-${t + 1}`,
    snapshot: pO(e.snapshot),
    title: e.title.trim().length > 0 ? e.title.trim() : t === 0 ? Ix : `Group ${t + 1}`,
  };
}
function MO(e) {
  let t = new Set(),
    n = 0,
    r = !1,
    i = e.map((e) => {
      let i = e.snapshot.sessions.map((e) => {
        let i = qx(e.displayId ?? ``);
        if (!t.has(i) && /^\d{2}$/.test(i)) return (t.add(i), { ...e, displayId: i });
        r = !0;
        let a = NO(t, n);
        n = a.nextSessionDisplayId;
        let o = e.alias.trim();
        return { ...e, alias: o === i ? a.displayId : e.alias, displayId: a.displayId };
      });
      return i === e.snapshot.sessions && !r
        ? e
        : { ...e, snapshot: { ...e.snapshot, sessions: i } };
    }),
    a = PO(t, n);
  return { groups: r ? i : [...i], nextSessionDisplayId: a };
}
function NO(e, t) {
  let n = PO(e, ((Math.floor(t) % 100) + 100) % 100),
    r = qx(n);
  return (e.add(r), { displayId: r, nextSessionDisplayId: (n + 1) % 100 });
}
function PO(e, t) {
  for (let n = 0; n < 100; n += 1) {
    let r = (t + n) % 100;
    if (!e.has(qx(r))) return r;
  }
  return t % 100;
}
var FO = t(() => {
  (AS(), CO());
});
function IO(e) {
  if (!kO(e)) return Kx();
  let t = e.groups
      .filter((e) => AO(e))
      .slice(0, 20)
      .map((e, t) => jO(e, t)),
    n = t.length > 0 ? t : [{ groupId: Fx, snapshot: Ux(), title: Ix }],
    r = MO(n);
  return {
    activeGroupId: n.some((t) => t.groupId === e.activeGroupId) ? e.activeGroupId : n[0].groupId,
    groups: r.groups,
    nextGroupNumber:
      typeof e.nextGroupNumber == `number` && e.nextGroupNumber > 1
        ? e.nextGroupNumber
        : n.length + 1,
    nextSessionDisplayId:
      typeof e.nextSessionDisplayId == `number` &&
      Number.isInteger(e.nextSessionDisplayId) &&
      e.nextSessionDisplayId >= 0
        ? e.nextSessionDisplayId % 100
        : r.nextSessionDisplayId,
    nextSessionNumber:
      typeof e.nextSessionNumber == `number` && e.nextSessionNumber > 0 ? e.nextSessionNumber : 1,
  };
}
function LO(e) {
  return e.groups.find((t) => t.groupId === e.activeGroupId);
}
function RO(e, t) {
  return e.groups.find((e) => e.groupId === t);
}
var zO = t(() => {
  (AS(), FO());
});
function BO(e, t) {
  let n = IO(e);
  return n.groups.some((e) => e.groupId === t)
    ? {
        changed: n.activeGroupId !== t,
        snapshot: n.activeGroupId === t ? n : { ...n, activeGroupId: t },
      }
    : { changed: !1, snapshot: n };
}
function VO(e, t) {
  let n = IO(e),
    r = n.groups.map((e) => e.groupId);
  if (t.length !== r.length || r.every((e, n) => e === t[n])) return { changed: !1, snapshot: n };
  let i = new Set(r),
    a = new Set(t);
  if (a.size !== t.length || r.some((e) => !a.has(e)) || t.some((e) => !i.has(e)))
    return { changed: !1, snapshot: n };
  let o = new Map(n.groups.map((e) => [e.groupId, e]));
  return {
    changed: !0,
    snapshot: {
      ...n,
      groups: t.map((e) => {
        let t = o.get(e);
        if (!t) throw Error(`Missing group for reorder: ${e}`);
        return t;
      }),
    },
  };
}
function HO(e) {
  let t = IO(e);
  if (t.groups.length >= 20) return { changed: !1, snapshot: t };
  let n = t.nextGroupNumber,
    r = `group-${n}`;
  return {
    changed: !0,
    groupId: r,
    snapshot: {
      ...t,
      activeGroupId: r,
      groups: [...t.groups, { groupId: r, snapshot: Ux(), title: `Group ${n}` }],
      nextGroupNumber: n + 1,
    },
  };
}
function UO(e, t, n, r) {
  let i = IO(e),
    a = DO(i, t),
    o = RO(i, n);
  if (!a || !o || a.group.groupId === n) return { changed: !1, snapshot: i };
  let s = OO(a.group.snapshot, t);
  if (!s) return { changed: !1, snapshot: i };
  let c = xO(a.group.snapshot, t).snapshot,
    l = hO(wO(o.snapshot, s, r), t).snapshot;
  return {
    changed: !0,
    snapshot: {
      ...i,
      activeGroupId: n,
      groups: i.groups.map((e) =>
        e.groupId === a.group.groupId
          ? { ...e, snapshot: c }
          : e.groupId === n
            ? { ...e, snapshot: l }
            : e,
      ),
    },
  };
}
function WO(e, t) {
  let n = IO(e);
  if (n.groups.length >= 20) return { changed: !1, snapshot: n };
  let r = DO(n, t);
  if (!r) return { changed: !1, snapshot: n };
  let i = OO(r.group.snapshot, t);
  if (!i) return { changed: !1, snapshot: n };
  let a = `group-${n.nextGroupNumber}`,
    o = hO(wO(Ux(), i), t).snapshot;
  return {
    changed: !0,
    groupId: a,
    snapshot: {
      ...n,
      activeGroupId: a,
      groups: [
        ...n.groups.map((e) =>
          e.groupId === r.group.groupId ? { ...e, snapshot: xO(e.snapshot, t).snapshot } : e,
        ),
        { groupId: a, snapshot: o, title: `Group ${n.nextGroupNumber}` },
      ],
      nextGroupNumber: n.nextGroupNumber + 1,
    },
  };
}
var GO = t(() => {
  (AS(), CO(), FO(), zO());
});
function KO(e, t) {
  let n = IO(e),
    r = DO(n, t);
  if (!r) return { changed: !1, snapshot: n };
  let i = hO(r.group.snapshot, t);
  return {
    changed: i.changed || n.activeGroupId !== r.group.groupId,
    snapshot: {
      ...n,
      activeGroupId: r.group.groupId,
      groups: EO(n.groups, r.group.groupId, i.snapshot),
    },
  };
}
function qO(e, t) {
  return TO(e, LO, (e) => _O(e, t));
}
function JO(e) {
  return TO(e, LO, (e) => vO(e));
}
function YO(e, t) {
  return TO(e, LO, (e) => yO(e, t));
}
function XO(e, t, n) {
  let r = IO(e),
    i = RO(r, t);
  if (!i) return { changed: !1, snapshot: r };
  let a = bO(i.snapshot, n);
  return {
    changed: a.changed,
    snapshot: a.changed ? { ...r, groups: EO(r.groups, t, a.snapshot) } : r,
  };
}
var ZO = t(() => {
    (AS(), CO(), FO(), zO());
  }),
  QO = t(() => {
    (zO(), GO(), ZO());
  });
function $O(e) {
  return {
    options: {
      agentManagerZoomPercent: e.hud.agentManagerZoomPercent,
      agents: e.hud.agents,
      commands: e.hud.commands,
      completionBellEnabled: e.hud.completionBellEnabled,
      completionSound: e.hud.completionSound,
      debuggingMode: e.hud.debuggingMode,
      scratchPadContent: e.scratchPadContent,
      showCloseButtonOnSessionCards: e.hud.showCloseButtonOnSessionCards,
      showHotkeysOnSessionCards: e.hud.showHotkeysOnSessionCards,
      theme: e.hud.theme,
    },
    sessionDecorationsById: Object.fromEntries(
      e.groups.flatMap((e) =>
        e.sessions.map((e) => [
          e.sessionId,
          {
            activity: e.activity,
            activityLabel: e.activityLabel,
            detail: e.detail,
            isRunning: e.isRunning,
            terminalTitle: e.terminalTitle,
          },
        ]),
      ),
    ),
    snapshot: IO({
      activeGroupId: e.groups.find((e) => e.isActive)?.groupId ?? e.groups[0]?.groupId ?? `group-1`,
      groups: e.groups.map((e) => nk(e)),
      nextGroupNumber: ok(e.groups),
      nextSessionDisplayId: NaN,
      nextSessionNumber: sk(e.groups),
    }),
  };
}
function ek(e, t = `sessionState`) {
  let n =
    e.snapshot.groups.find((t) => t.groupId === e.snapshot.activeGroupId) ?? e.snapshot.groups[0];
  return {
    groups: e.snapshot.groups.map((t) => {
      let n = OS(t.snapshot, `mac`).map((t) => ({
        ...t,
        ...e.sessionDecorationsById[t.sessionId],
        activity: e.sessionDecorationsById[t.sessionId]?.activity ?? `idle`,
        isRunning: e.sessionDecorationsById[t.sessionId]?.isRunning ?? !0,
        terminalTitle: e.sessionDecorationsById[t.sessionId]?.terminalTitle,
      }));
      return {
        groupId: t.groupId,
        isActive: e.snapshot.activeGroupId === t.groupId,
        isFocusModeActive: Wx(t.snapshot),
        layoutVisibleCount: Gx(t.snapshot),
        sessions: n,
        title: t.title,
        viewMode: t.snapshot.viewMode,
        visibleCount: t.snapshot.visibleCount,
      };
    }),
    hud: DS(
      n?.snapshot ?? e.snapshot.groups[0]?.snapshot,
      e.options.theme,
      e.options.agentManagerZoomPercent,
      e.options.showCloseButtonOnSessionCards,
      e.options.showHotkeysOnSessionCards,
      e.options.debuggingMode,
      e.options.completionBellEnabled,
      e.options.completionSound,
      e.options.agents,
      e.options.commands,
    ),
    previousSessions: [],
    revision: 1,
    scratchPadContent: e.options.scratchPadContent,
    type: t,
  };
}
function tk(e, t) {
  switch (t.type) {
    case `sidebarDebugLog`:
      return;
    case `moveSessionToGroup`: {
      let n = UO(e.snapshot, t.sessionId, t.groupId, t.targetIndex);
      return n.changed ? { ...e, snapshot: n.snapshot } : void 0;
    }
    case `syncSessionOrder`: {
      let n = XO(e.snapshot, t.groupId, t.sessionIds);
      return n.changed ? { ...e, snapshot: n.snapshot } : void 0;
    }
    case `syncGroupOrder`: {
      let n = VO(e.snapshot, t.groupIds);
      return n.changed ? { ...e, snapshot: n.snapshot } : void 0;
    }
    case `focusSession`: {
      let n = KO(e.snapshot, t.sessionId);
      return n.changed ? { ...e, snapshot: n.snapshot } : void 0;
    }
    case `focusGroup`: {
      let n = BO(e.snapshot, t.groupId);
      return n.changed ? { ...e, snapshot: n.snapshot } : void 0;
    }
    case `setVisibleCount`:
      return { ...e, snapshot: qO(e.snapshot, t.visibleCount) };
    case `setViewMode`:
      return { ...e, snapshot: YO(e.snapshot, t.viewMode) };
    case `toggleFullscreenSession`:
      return { ...e, snapshot: JO(e.snapshot) };
    case `saveScratchPad`:
      return { ...e, options: { ...e.options, scratchPadContent: t.content } };
    case `saveSidebarCommand`: {
      let n = t.commandId ?? `custom-story-${e.options.commands.length}`,
        r = [...e.options.commands],
        i = r.findIndex((e) => e.commandId === n),
        a = {
          actionType: t.actionType,
          closeTerminalOnExit: t.actionType === `terminal` ? t.closeTerminalOnExit : !1,
          command: t.actionType === `terminal` ? t.command : void 0,
          commandId: n,
          isDefault: i >= 0 ? r[i]?.isDefault === !0 : !1,
          name: t.name,
          url: t.actionType === `browser` ? t.url : void 0,
        };
      return (i >= 0 ? (r[i] = a) : r.push(a), { ...e, options: { ...e.options, commands: r } });
    }
    case `saveSidebarAgent`: {
      let n = t.agentId ?? `custom-agent-story-${e.options.agents.length}`,
        r = [...e.options.agents],
        i = r.findIndex((e) => e.agentId === n),
        a = {
          agentId: n,
          command: t.command,
          hidden: !1,
          icon: t.icon ?? (i >= 0 ? r[i]?.icon : void 0),
          isDefault: i >= 0 ? r[i]?.isDefault === !0 : !1,
          name: t.name,
        };
      return (i >= 0 ? (r[i] = a) : r.push(a), { ...e, options: { ...e.options, agents: r } });
    }
    case `deleteSidebarCommand`:
      return {
        ...e,
        options: {
          ...e.options,
          commands: e.options.commands.filter((e) => e.commandId !== t.commandId),
        },
      };
    case `syncSidebarCommandOrder`: {
      let n = new Map(e.options.commands.map((e) => [e.commandId, e])),
        r = t.commandIds.map((e) => n.get(e)).filter((e) => e !== void 0);
      for (let t of e.options.commands) r.some((e) => e.commandId === t.commandId) || r.push(t);
      return { ...e, options: { ...e.options, commands: r } };
    }
    case `deleteSidebarAgent`:
      return {
        ...e,
        options: {
          ...e.options,
          agents: e.options.agents.map((e) =>
            e.agentId === t.agentId && e.isDefault ? { ...e, hidden: !0 } : e,
          ),
        },
      };
    case `syncSidebarAgentOrder`: {
      let n = new Map(e.options.agents.map((e) => [e.agentId, e])),
        r = t.agentIds.map((e) => n.get(e)).filter((e) => e !== void 0);
      for (let t of e.options.agents) r.some((e) => e.agentId === t.agentId) || r.push(t);
      return { ...e, options: { ...e.options, agents: r } };
    }
    case `createGroupFromSession`: {
      let n = WO(e.snapshot, t.sessionId);
      return n.changed ? { ...e, snapshot: n.snapshot } : void 0;
    }
    case `createGroup`: {
      let t = HO(e.snapshot);
      return t.changed ? { ...e, snapshot: t.snapshot } : void 0;
    }
    default:
      return;
  }
}
function nk(e) {
  return {
    groupId: e.groupId,
    snapshot: {
      focusedSessionId: e.sessions.find((e) => e.isFocused)?.sessionId,
      fullscreenRestoreVisibleCount:
        e.isFocusModeActive && e.visibleCount === 1 ? e.layoutVisibleCount : void 0,
      sessions: e.sessions.map((e) => rk(e)),
      viewMode: e.viewMode,
      visibleCount: e.visibleCount,
      visibleSessionIds: e.sessions.filter((e) => e.isVisible).map((e) => e.sessionId),
    },
    title: e.title,
  };
}
function rk(e) {
  let t = {
    alias: e.alias,
    column: e.column,
    createdAt: new Date(0).toISOString(),
    displayId: e.sessionNumber ?? ak(e.shortcutLabel),
    row: e.row,
    sessionId: e.sessionId,
    slotIndex: ik(e.shortcutLabel),
    title: e.primaryTitle ?? e.terminalTitle ?? e.alias,
  };
  return e.kind === `browser`
    ? { ...t, browser: { url: e.detail ?? `` }, kind: `browser` }
    : e.agentIcon === `t3`
      ? {
          ...t,
          kind: `t3`,
          t3: {
            projectId: `story-project-${e.sessionId}`,
            serverOrigin: `http://127.0.0.1:3773`,
            threadId: `pending-thread`,
            workspaceRoot: `/tmp/story-workspace`,
          },
        }
      : { ...t, kind: `terminal` };
}
function ik(e) {
  let t = e.match(/(\d+)$/)?.[1],
    n = t ? Number.parseInt(t, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function ak(e) {
  let t = e.match(/(\d+)$/)?.[1];
  return t ? t.padStart(2, `0`) : `00`;
}
function ok(e) {
  return (
    Math.max(
      1,
      ...e.map((e) => {
        let t = e.groupId.match(/group-(\d+)$/)?.[1];
        return t ? Number.parseInt(t, 10) : 1;
      }),
    ) + 1
  );
}
function sk(e) {
  return (
    Math.max(
      0,
      ...e.flatMap((e) =>
        e.sessions.map((e) => {
          let t = e.sessionId.match(/session-(\d+)$/)?.[1];
          return t ? Number.parseInt(t, 10) : 0;
        }),
      ),
    ) + 1
  );
}
var ck = t(() => {
  (AS(), QO());
});
export {
  Tx as C,
  db as E,
  Rx as S,
  cx as T,
  Vx as _,
  ID as a,
  tS as b,
  vS as c,
  _S as d,
  lS as f,
  cS as g,
  aS as h,
  tk as i,
  ES as l,
  sS as m,
  $O as n,
  nO as o,
  pS as p,
  ck as r,
  AS as s,
  ek as t,
  mS as u,
  nS as v,
  Cx as w,
  zx as x,
  eS as y,
};
