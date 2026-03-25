import { a as e, n as t, t as n } from "./chunk-BneVvdWh.js";
import { n as r, t as i } from "./iframe-M1bTsA3P.js";
import { t as a } from "./react-dom-YbCs1h7K.js";
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
  O = t(() => {
    D = E(`https://base-ui.com/production-error`, `Base UI`);
  });
function k(e) {
  let t = A.useContext(j);
  if (t === void 0 && !e) throw Error(D(72));
  return t;
}
var A,
  j,
  M = t(() => {
    (O(), (A = e(r())), (j = A.createContext(void 0)));
  });
function ee(e) {
  N.useEffect(e, te);
}
var N,
  te,
  ne = t(() => {
    ((N = e(r())), (te = []));
  });
function re() {
  let e = o(ae.create).current;
  return (ee(e.disposeEffect), e);
}
var ie,
  ae,
  oe = t(() => {
    (l(),
      ne(),
      (ie = 0),
      (ae = class e {
        static create() {
          return new e();
        }
        currentId = ie;
        start(e, t) {
          (this.clear(),
            (this.currentId = setTimeout(() => {
              ((this.currentId = ie), t());
            }, e)));
        }
        isStarted() {
          return this.currentId !== ie;
        }
        clear = () => {
          this.currentId !== ie && (clearTimeout(this.currentId), (this.currentId = ie));
        };
        disposeEffect = () => this.clear;
      }));
  });
function P() {
  return typeof window < `u`;
}
function se(e) {
  return le(e) ? (e.nodeName || ``).toLowerCase() : `#document`;
}
function F(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function ce(e) {
  return ((le(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function le(e) {
  return P() ? e instanceof Node || e instanceof F(e).Node : !1;
}
function I(e) {
  return P() ? e instanceof Element || e instanceof F(e).Element : !1;
}
function ue(e) {
  return P() ? e instanceof HTMLElement || e instanceof F(e).HTMLElement : !1;
}
function de(e) {
  return !P() || typeof ShadowRoot > `u`
    ? !1
    : e instanceof ShadowRoot || e instanceof F(e).ShadowRoot;
}
function fe(e) {
  let { overflow: t, overflowX: n, overflowY: r, display: i } = ye(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== `inline` && i !== `contents`;
}
function pe(e) {
  return /^(table|td|th)$/.test(se(e));
}
function me(e) {
  try {
    if (e.matches(`:popover-open`)) return !0;
  } catch {}
  try {
    return e.matches(`:modal`);
  } catch {
    return !1;
  }
}
function he(e) {
  let t = I(e) ? ye(e) : e;
  return (
    De(t.transform) ||
    De(t.translate) ||
    De(t.scale) ||
    De(t.rotate) ||
    De(t.perspective) ||
    (!_e() && (De(t.backdropFilter) || De(t.filter))) ||
    Te.test(t.willChange || ``) ||
    Ee.test(t.contain || ``)
  );
}
function ge(e) {
  let t = xe(e);
  for (; ue(t) && !ve(t); ) {
    if (he(t)) return t;
    if (me(t)) return null;
    t = xe(t);
  }
  return null;
}
function _e() {
  return (
    (Oe ??= typeof CSS < `u` && CSS.supports && CSS.supports(`-webkit-backdrop-filter`, `none`)), Oe
  );
}
function ve(e) {
  return /^(html|body|#document)$/.test(se(e));
}
function ye(e) {
  return F(e).getComputedStyle(e);
}
function be(e) {
  return I(e)
    ? { scrollLeft: e.scrollLeft, scrollTop: e.scrollTop }
    : { scrollLeft: e.scrollX, scrollTop: e.scrollY };
}
function xe(e) {
  if (se(e) === `html`) return e;
  let t = e.assignedSlot || e.parentNode || (de(e) && e.host) || ce(e);
  return de(t) ? t.host : t;
}
function Se(e) {
  let t = xe(e);
  return ve(t) ? (e.ownerDocument ? e.ownerDocument.body : e.body) : ue(t) && fe(t) ? t : Se(t);
}
function Ce(e, t, n) {
  (t === void 0 && (t = []), n === void 0 && (n = !0));
  let r = Se(e),
    i = r === e.ownerDocument?.body,
    a = F(r);
  if (i) {
    let e = we(a);
    return t.concat(a, a.visualViewport || [], fe(r) ? r : [], e && n ? Ce(e) : []);
  } else return t.concat(r, Ce(r, [], n));
}
function we(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
var Te,
  Ee,
  De,
  Oe,
  ke = t(() => {
    ((Te = /transform|translate|scale|rotate|perspective|filter/),
      (Ee = /paint|layout|strict|content/),
      (De = (e) => !!e && e !== `none`));
  });
function Ae() {
  if (!Ne) return { platform: ``, maxTouchPoints: -1 };
  let e = navigator.userAgentData;
  return e?.platform
    ? { platform: e.platform, maxTouchPoints: navigator.maxTouchPoints }
    : { platform: navigator.platform ?? ``, maxTouchPoints: navigator.maxTouchPoints ?? -1 };
}
function je() {
  if (!Ne) return ``;
  let e = navigator.userAgentData;
  return e && Array.isArray(e.brands)
    ? e.brands.map(({ brand: e, version: t }) => `${e}/${t}`).join(` `)
    : navigator.userAgent;
}
function Me() {
  if (!Ne) return ``;
  let e = navigator.userAgentData;
  return e?.platform ? e.platform : (navigator.platform ?? ``);
}
var Ne,
  Pe,
  Fe,
  Ie,
  Le,
  Re,
  ze,
  Be = t(() => {
    ((Ne = typeof navigator < `u`),
      (Pe = Ae()),
      (Fe = Me()),
      (Ie = je()),
      typeof CSS > `u` || !CSS.supports || CSS.supports(`-webkit-backdrop-filter:none`),
      (Pe.platform === `MacIntel` && Pe.maxTouchPoints > 1) ||
        /iP(hone|ad|od)|iOS/.test(Pe.platform),
      Ne && /firefox/i.test(Ie),
      (Le = Ne && /apple/i.test(navigator.vendor)),
      Ne && /Edg/i.test(Ie),
      (Ne && /android/i.test(Fe)) || /android/i.test(Ie),
      (Re = Ne && Fe.toLowerCase().startsWith(`mac`) && !navigator.maxTouchPoints),
      (ze = Ie.includes(`jsdom/`)));
  }),
  Ve,
  He,
  Ue = t(() => {
    ((Ve = `data-base-ui-focusable`),
      (He = `input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])`));
  });
function We(e) {
  let t = e.activeElement;
  for (; t?.shadowRoot?.activeElement != null; ) t = t.shadowRoot.activeElement;
  return t;
}
function Ge(e, t) {
  if (!e || !t) return !1;
  let n = t.getRootNode?.();
  if (e.contains(t)) return !0;
  if (n && de(n)) {
    let n = t;
    for (; n; ) {
      if (e === n) return !0;
      n = n.parentNode || n.host;
    }
  }
  return !1;
}
function Ke(e, t) {
  if (!I(e)) return !1;
  let n = e;
  if (t.hasElement(n)) return !n.hasAttribute(`data-trigger-disabled`);
  for (let [, e] of t.entries()) if (Ge(e, n)) return !e.hasAttribute(`data-trigger-disabled`);
  return !1;
}
function qe(e) {
  return `composedPath` in e ? e.composedPath()[0] : e.target;
}
function Je(e, t) {
  if (t == null) return !1;
  if (`composedPath` in e) return e.composedPath().includes(t);
  let n = e;
  return n.target != null && t.contains(n.target);
}
function Ye(e) {
  return e.matches(`html,body`);
}
function Xe(e) {
  return (
    ue(e) &&
    e.matches(
      `input:not([type='hidden']):not([disabled]),[contenteditable]:not([contenteditable='false']),textarea:not([disabled])`,
    )
  );
}
function Ze(e) {
  if (!e || ze) return !0;
  try {
    return e.matches(`:focus-visible`);
  } catch {
    return !0;
  }
}
var Qe = t(() => {
  (ke(), Be(), Ue());
});
function $e(e, t, n = !0) {
  return e
    .filter((e) => e.parentId === t && (!n || e.context?.open))
    .flatMap((t) => [t, ...$e(e, t.id, n)]);
}
var et = t(() => {});
function tt(e) {
  return `nativeEvent` in e;
}
function nt(e, t) {
  let n = [`mouse`, `pen`];
  return (t || n.push(``, void 0), n.includes(e));
}
function rt(e) {
  let t = e.type;
  return t === `click` || t === `mousedown` || t === `keydown` || t === `keyup`;
}
var it = t(() => {});
function at(e, t, n) {
  return wt(e, Ct(t, n));
}
function ot(e, t) {
  return typeof e == `function` ? e(t) : e;
}
function st(e) {
  return e.split(`-`)[0];
}
function ct(e) {
  return e.split(`-`)[1];
}
function lt(e) {
  return e === `x` ? `y` : `x`;
}
function ut(e) {
  return e === `y` ? `height` : `width`;
}
function dt(e) {
  let t = e[0];
  return t === `t` || t === `b` ? `y` : `x`;
}
function ft(e) {
  return lt(dt(e));
}
function pt(e, t, n) {
  n === void 0 && (n = !1);
  let r = ct(e),
    i = ft(e),
    a = ut(i),
    o =
      i === `x`
        ? r === (n ? `end` : `start`)
          ? `right`
          : `left`
        : r === `start`
          ? `bottom`
          : `top`;
  return (t.reference[a] > t.floating[a] && (o = vt(o)), [o, vt(o)]);
}
function mt(e) {
  let t = vt(e);
  return [ht(e), t, ht(t)];
}
function ht(e) {
  return e.includes(`start`) ? e.replace(`start`, `end`) : e.replace(`end`, `start`);
}
function gt(e, t, n) {
  switch (e) {
    case `top`:
    case `bottom`:
      return n ? (t ? At : kt) : t ? kt : At;
    case `left`:
    case `right`:
      return t ? jt : Mt;
    default:
      return [];
  }
}
function _t(e, t, n, r) {
  let i = ct(e),
    a = gt(st(e), n === `start`, r);
  return (i && ((a = a.map((e) => e + `-` + i)), t && (a = a.concat(a.map(ht)))), a);
}
function vt(e) {
  let t = st(e);
  return Ot[t] + e.slice(t.length);
}
function yt(e) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...e };
}
function bt(e) {
  return typeof e == `number` ? { top: e, right: e, bottom: e, left: e } : yt(e);
}
function xt(e) {
  let { x: t, y: n, width: r, height: i } = e;
  return { width: r, height: i, top: n, left: t, right: t + r, bottom: n + i, x: t, y: n };
}
var St,
  Ct,
  wt,
  Tt,
  Et,
  Dt,
  Ot,
  kt,
  At,
  jt,
  Mt,
  Nt = t(() => {
    ((St = [`top`, `right`, `bottom`, `left`]),
      (Ct = Math.min),
      (wt = Math.max),
      (Tt = Math.round),
      (Et = Math.floor),
      (Dt = (e) => ({ x: e, y: e })),
      (Ot = { left: `right`, right: `left`, bottom: `top`, top: `bottom` }),
      (kt = [`left`, `right`]),
      (At = [`right`, `left`]),
      (jt = [`top`, `bottom`]),
      (Mt = [`bottom`, `top`]));
  }),
  Pt = t(() => {});
function Ft(e) {
  return e?.ownerDocument || document;
}
var It = t(() => {
    ke();
  }),
  Lt = t(() => {}),
  Rt = t(() => {
    (Qe(), et(), it(), Pt(), Lt());
  });
function zt(e, t) {
  return t != null && !nt(t) ? 0 : typeof e == `function` ? e() : e;
}
function Bt(e, t, n) {
  let r = zt(e, n);
  return typeof r == `number` ? r : r?.[t];
}
function Vt(e) {
  return typeof e == `function` ? e() : e;
}
function Ht(e, t) {
  return t || e === `click` || e === `mousedown`;
}
var Ut = t(() => {
  Rt();
});
function Wt() {}
var Gt,
  Kt = t(() => {
    (Object.freeze([]), (Gt = Object.freeze({})));
  }),
  qt,
  Jt,
  Yt,
  Xt,
  Zt = t(() => {
    (Kt(),
      (qt = { style: { transition: `none` } }),
      (Jt = `data-base-ui-swipe-ignore`),
      (Yt = `data-swipe-ignore`),
      `${Jt}`,
      `${Yt}`,
      (Xt = { fallbackAxisSide: `end` }));
  }),
  Qt,
  $t,
  en,
  tn,
  nn,
  rn,
  an,
  on,
  sn = t(() => {
    ((Qt = `none`),
      ($t = `trigger-press`),
      (en = `trigger-hover`),
      (tn = `trigger-focus`),
      (nn = `outside-press`),
      (rn = `escape-key`),
      (an = `disabled`),
      (on = `imperative-action`));
  }),
  cn = t(() => {
    sn();
  });
function ln(e, t, n, r) {
  let i = !1,
    a = !1,
    o = r ?? Gt;
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
var un = t(() => {
  Zt();
});
function dn(e) {
  let { children: t, delay: n, timeoutMs: r = 0 } = e,
    i = pn.useRef(n),
    a = pn.useRef(n),
    o = pn.useRef(null),
    s = pn.useRef(null),
    c = re();
  return (0, mn.jsx)(hn.Provider, {
    value: pn.useMemo(
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
function fn(e, t = { open: !1 }) {
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
    } = pn.useContext(hn),
    [f, p] = pn.useState(!1);
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
        (o.current = { open: 0, close: Bt(c.current, `close`) }),
        t !== null && t !== r
          ? (p(!0), e?.setIsInstantPhase(!0), e?.onOpenChange(!1, ln(Qt)))
          : (p(!1), e?.setIsInstantPhase(!1)));
    }, [i, r, n, a, o, s, c, l, d]),
    w(
      () => () => {
        l.current = null;
      },
      [l],
    ),
    pn.useMemo(() => ({ hasProvider: u, delayRef: o, isInstantPhase: f }), [u, o, f])
  );
}
var pn,
  mn,
  hn,
  gn = t(() => {
    ((pn = e(r())),
      oe(),
      T(),
      Ut(),
      un(),
      cn(),
      (mn = i()),
      (hn = pn.createContext({
        hasProvider: !1,
        timeoutMs: 0,
        delayRef: { current: 0 },
        initialDelayRef: { current: 0 },
        timeout: new ae(),
        currentIdRef: { current: null },
        currentContextRef: { current: null },
      })));
  });
function _n(e, t, n, r) {
  let i = o(yn).current;
  return (bn(i, e, t, n, r) && Sn(i, [e, t, n, r]), i.callback);
}
function vn(e) {
  let t = o(yn).current;
  return (xn(t, e) && Sn(t, e), t.callback);
}
function yn() {
  return { callback: null, cleanup: null, refs: [] };
}
function bn(e, t, n, r, i) {
  return e.refs[0] !== t || e.refs[1] !== n || e.refs[2] !== r || e.refs[3] !== i;
}
function xn(e, t) {
  return e.refs.length !== t.length || e.refs.some((e, n) => e !== t[n]);
}
function Sn(e, t) {
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
var Cn = t(() => {
  l();
});
function wn(e) {
  let t = o(Tn, e).current;
  return ((t.next = e), w(t.effect), t);
}
function Tn(e) {
  let t = {
    current: e,
    next: e,
    effect: () => {
      t.current = t.next;
    },
  };
  return t;
}
var En = t(() => {
  (T(), l());
});
function L(e) {
  let t = o(Dn).current;
  return ((t.next = e), jn(t.effect), t.trampoline);
}
function Dn() {
  let e = {
    next: void 0,
    callback: On,
    trampoline: (...t) => e.callback?.(...t),
    effect: () => {
      e.callback = e.next;
    },
  };
  return e;
}
function On() {}
var kn,
  An,
  jn,
  Mn = t(() => {
    ((kn = e(r())),
      l(),
      (An = kn[`useInsertionEffect${Math.random().toFixed(1)}`.slice(0, -3)]),
      (jn = An && An !== kn.useLayoutEffect ? An : (e) => e()));
  });
function Nn() {
  let e = o(Ln.create).current;
  return (ee(e.disposeEffect), e);
}
var Pn,
  Fn,
  In,
  Ln,
  Rn = t(() => {
    (l(),
      ne(),
      (Pn = null),
      globalThis.requestAnimationFrame,
      (Fn = class {
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
      (In = new Fn()),
      (Ln = class e {
        static create() {
          return new e();
        }
        static request(e) {
          return In.request(e);
        }
        static cancel(e) {
          return In.cancel(e);
        }
        currentId = Pn;
        request(e) {
          (this.cancel(),
            (this.currentId = In.request(() => {
              ((this.currentId = Pn), e());
            })));
        }
        cancel = () => {
          this.currentId !== Pn && (In.cancel(this.currentId), (this.currentId = Pn));
        };
        disposeEffect = () => this.cancel;
      }));
  });
function zn(e) {
  return `data-base-ui-${e}`;
}
var Bn = t(() => {}),
  Vn,
  Hn,
  Un = t(() => {
    ((Vn = e(r())), (Hn = { ...Vn }));
  });
function Wn(e, t = `mui`) {
  let [n, r] = Kn.useState(e),
    i = e || n;
  return (
    Kn.useEffect(() => {
      n ?? ((qn += 1), r(`${t}-${qn}`));
    }, [n, t]),
    i
  );
}
function Gn(e, t) {
  if (Jn !== void 0) {
    let n = Jn();
    return e ?? (t ? `${t}-${n}` : n);
  }
  return Wn(e, t);
}
var Kn,
  qn,
  Jn,
  Yn = t(() => {
    ((Kn = e(r())), Un(), (qn = 0), (Jn = Hn.useId));
  });
function Xn(e) {
  return Zn >= e;
}
var Zn,
  Qn = t(() => {
    (e(r()), (Zn = 19));
  });
function $n(e) {
  if (!er.isValidElement(e)) return null;
  let t = e,
    n = t.props;
  return (Xn(19) ? n?.ref : t.ref) ?? null;
}
var er,
  tr = t(() => {
    ((er = e(r())), Qn());
  });
function nr(e, t) {
  if (e && !t) return e;
  if (!e && t) return t;
  if (e || t) return { ...e, ...t };
}
var rr = t(() => {});
function ir(e, t) {
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
var ar = t(() => {});
function or(e, t) {
  return typeof e == `function` ? e(t) : e;
}
var sr = t(() => {});
function cr(e, t) {
  return typeof e == `function` ? e(t) : e;
}
var lr = t(() => {});
function ur(e, t, n, r, i) {
  let a = { ...gr(e, xr) };
  return (t && (a = fr(a, t)), n && (a = fr(a, n)), r && (a = fr(a, r)), i && (a = fr(a, i)), a);
}
function dr(e) {
  if (e.length === 0) return xr;
  if (e.length === 1) return gr(e[0], xr);
  let t = { ...gr(e[0], xr) };
  for (let n = 1; n < e.length; n += 1) t = fr(t, e[n]);
  return t;
}
function fr(e, t) {
  return hr(t) ? t(e) : pr(e, t);
}
function pr(e, t) {
  if (!t) return e;
  for (let n in t) {
    let r = t[n];
    switch (n) {
      case `style`:
        e[n] = nr(e.style, r);
        break;
      case `className`:
        e[n] = yr(e.className, r);
        break;
      default:
        mr(n, r) ? (e[n] = _r(e[n], r)) : (e[n] = r);
    }
  }
  return e;
}
function mr(e, t) {
  let n = e.charCodeAt(0),
    r = e.charCodeAt(1),
    i = e.charCodeAt(2);
  return n === 111 && r === 110 && i >= 65 && i <= 90 && (typeof t == `function` || t === void 0);
}
function hr(e) {
  return typeof e == `function`;
}
function gr(e, t) {
  return hr(e) ? e(t) : (e ?? xr);
}
function _r(e, t) {
  return t
    ? e
      ? (n) => {
          if (br(n)) {
            let r = n;
            vr(r);
            let i = t(r);
            return (r.baseUIHandlerPrevented || e?.(r), i);
          }
          let r = t(n);
          return (e?.(n), r);
        }
      : t
    : e;
}
function vr(e) {
  return (
    (e.preventBaseUIHandler = () => {
      e.baseUIHandlerPrevented = !0;
    }),
    e
  );
}
function yr(e, t) {
  return t ? (e ? t + ` ` + e : t) : e;
}
function br(e) {
  return typeof e == `object` && !!e && `nativeEvent` in e;
}
var xr,
  Sr = t(() => {
    (rr(), (xr = {}));
  }),
  Cr = t(() => {
    Sr();
  });
function wr(e, t, n = {}) {
  let r = t.render,
    i = Tr(t, n);
  return n.enabled === !1 ? null : Er(e, r, i, n.state ?? Gt);
}
function Tr(e, t = {}) {
  let { className: n, style: r, render: i } = e,
    { state: a = Gt, ref: o, props: s, stateAttributesMapping: c, enabled: l = !0 } = t,
    u = l ? or(n, a) : void 0,
    d = l ? cr(r, a) : void 0,
    f = l ? ir(a, c) : Gt,
    p = l ? (nr(f, Array.isArray(s) ? dr(s) : s) ?? Gt) : Gt;
  return (
    typeof document < `u` &&
      (l
        ? Array.isArray(o)
          ? (p.ref = vn([p.ref, $n(i), ...o]))
          : (p.ref = _n(p.ref, $n(i), o))
        : _n(null, null)),
    l
      ? (u !== void 0 && (p.className = yr(p.className, u)),
        d !== void 0 && (p.style = nr(p.style, d)),
        p)
      : Gt
  );
}
function Er(e, t, n, r) {
  if (t) {
    if (typeof t == `function`) return t(n, r);
    let e = ur(n, t.props);
    e.ref = n.ref;
    let i = t;
    return (i?.$$typeof === Ar && (i = Or.Children.toArray(t)[0]), Or.cloneElement(i, e));
  }
  if (e && typeof e == `string`) return Dr(e, n);
  throw Error(D(8));
}
function Dr(e, t) {
  return e === `button`
    ? (0, kr.createElement)(`button`, { type: `button`, ...t, key: t.key })
    : e === `img`
      ? (0, kr.createElement)(`img`, { alt: ``, ...t, key: t.key })
      : Or.createElement(e, t);
}
var Or,
  kr,
  Ar,
  jr = t(() => {
    (O(),
      (Or = e(r())),
      Cn(),
      tr(),
      rr(),
      ar(),
      sr(),
      lr(),
      Cr(),
      Zt(),
      (kr = e(r())),
      (Ar = Symbol.for(`react.lazy`)));
  });
function Mr(e = {}) {
  let { ref: t, container: n, componentProps: r = Gt, elementProps: i } = e,
    a = Gn(),
    o = Ir()?.portalNode,
    [s, c] = Nr.useState(null),
    [l, u] = Nr.useState(null),
    d = L((e) => {
      e !== null && u(e);
    }),
    f = Nr.useRef(null);
  w(() => {
    if (n === null) {
      f.current && ((f.current = null), u(null), c(null));
      return;
    }
    if (a == null) return;
    let e = (n && (le(n) ? n : n.current)) ?? o ?? document.body;
    if (e == null) {
      f.current && ((f.current = null), u(null), c(null));
      return;
    }
    f.current !== e && ((f.current = e), u(null), c(e));
  }, [n, o, a]);
  let p = wr(`div`, r, { ref: [t, d], props: [{ id: a, [Lr]: `` }, i] });
  return { portalNode: l, portalSubtree: s && p ? Pr.createPortal(p, s) : null };
}
var Nr,
  Pr,
  Fr,
  Ir,
  Lr,
  Rr = t(() => {
    ((Nr = e(r())),
      (Pr = e(a())),
      ke(),
      Yn(),
      T(),
      Mn(),
      Bn(),
      jr(),
      Zt(),
      i(),
      (Fr = Nr.createContext(null)),
      (Ir = () => Nr.useContext(Fr)),
      (Lr = zn(`portal`)));
  });
function zr() {
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
var Br = t(() => {}),
  Vr,
  Hr,
  Ur,
  Wr,
  Gr,
  Kr = t(() => {
    ((Vr = e(r())),
      i(),
      (Hr = Vr.createContext(null)),
      (Ur = Vr.createContext(null)),
      (Wr = () => Vr.useContext(Hr)?.id || null),
      (Gr = (e) => {
        let t = Vr.useContext(Ur);
        return e ?? t;
      }));
  });
function qr(e) {
  return e == null ? e : `current` in e ? e.current : e;
}
var Jr = t(() => {});
function Yr(e, t) {
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
function Xr(e) {
  return e != null && e.clientX != null;
}
function Zr(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    a = n.useState(`domReferenceElement`),
    o = n.context.dataRef,
    { enabled: s = !0, axis: c = `both` } = t,
    l = Qr.useRef(!1),
    u = Qr.useRef(null),
    [d, f] = Qr.useState(),
    [p, m] = Qr.useState([]),
    h = L((e, t, r) => {
      l.current ||
        (o.current.openEvent && !Xr(o.current.openEvent)) ||
        n.set(`positionReference`, Yr(r ?? a, { x: e, y: t, axis: c, dataRef: o, pointerType: d }));
    }),
    g = L((e) => {
      r ? u.current || m([]) : h(e.clientX, e.clientY, e.currentTarget);
    }),
    _ = nt(d) ? i : r,
    v = Qr.useCallback(() => {
      if (!_ || !s) return;
      let e = F(i);
      function t(n) {
        Ge(i, qe(n))
          ? (e.removeEventListener(`mousemove`, t), (u.current = null))
          : h(n.clientX, n.clientY);
      }
      if (!o.current.openEvent || Xr(o.current.openEvent)) {
        e.addEventListener(`mousemove`, t);
        let n = () => {
          (e.removeEventListener(`mousemove`, t), (u.current = null));
        };
        return ((u.current = n), n);
      }
      n.set(`positionReference`, a);
    }, [_, s, i, o, a, n, h]);
  (Qr.useEffect(() => v(), [v, p]),
    Qr.useEffect(() => {
      s && !i && (l.current = !1);
    }, [s, i]),
    Qr.useEffect(() => {
      !s && r && (l.current = !0);
    }, [s, r]));
  let y = Qr.useMemo(() => {
    function e(e) {
      f(e.pointerType);
    }
    return { onPointerDown: e, onPointerEnter: e, onMouseMove: g, onMouseEnter: g };
  }, [g]);
  return Qr.useMemo(() => (s ? { reference: y, trigger: y } : {}), [s, y]);
}
var Qr,
  $r = t(() => {
    ((Qr = e(r())), ke(), Mn(), Rt());
  });
function ei() {
  return !1;
}
function ti(e) {
  return {
    escapeKey: typeof e == `boolean` ? e : (e?.escapeKey ?? !1),
    outsidePress: typeof e == `boolean` ? e : (e?.outsidePress ?? !0),
  };
}
function ni(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    { dataRef: a } = n.context,
    {
      enabled: o = !0,
      escapeKey: s = !0,
      outsidePress: c = !0,
      outsidePressEvent: l = `sloppy`,
      referencePress: u = ei,
      referencePressEvent: d = `sloppy`,
      bubbles: f,
      externalTree: p,
    } = t,
    m = Gr(p),
    h = L(typeof c == `function` ? c : () => !1),
    g = typeof c == `function` ? h : c,
    _ = g !== !1,
    v = L(() => l),
    y = ri.useRef(!1),
    b = ri.useRef(!1),
    x = ri.useRef(!1),
    { escapeKey: S, outsidePress: C } = ti(f),
    w = ri.useRef(null),
    T = re(),
    E = re(),
    D = L(() => {
      (E.clear(), (a.current.insideReactTree = !1));
    }),
    O = ri.useRef(!1),
    k = ri.useRef(``),
    A = L(u),
    j = L((e) => {
      if (!r || !o || !s || e.key !== `Escape` || O.current) return;
      let t = a.current.floatingContext?.nodeId,
        i = m ? $e(m.nodesRef.current, t) : [];
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
      let c = tt(e) ? e.nativeEvent : e,
        l = ln(rn, c);
      (n.setOpen(!1, l), !S && !l.isPropagationAllowed && e.stopPropagation());
    }),
    M = L(() => {
      ((a.current.insideReactTree = !0), E.start(0, D));
    });
  (ri.useEffect(() => {
    if (!r || !o) return;
    ((a.current.__escapeKeyBubbles = S), (a.current.__outsidePressBubbles = C));
    let e = new ae(),
      t = new ae();
    function c() {
      (e.clear(), (O.current = !0));
    }
    function l() {
      e.start(_e() ? 5 : 0, () => {
        O.current = !1;
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
      let e = k.current,
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
        r = m && $e(m.nodesRef.current, t).some((t) => Je(e, t.context?.elements.floating));
      return Je(e, n.select(`floatingElement`)) || Je(e, n.select(`domReferenceElement`)) || r;
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
      let r = qe(e),
        i = `[${zn(`inert`)}]`,
        o = Array.from(Ft(n.select(`floatingElement`)).querySelectorAll(i)),
        s = I(r) ? r.getRootNode() : null;
      de(s) && (o = o.concat(Array.from(s.querySelectorAll(i))));
      let c = n.context.triggerElements;
      if (r && (c.hasElement(r) || c.hasMatchingElement((e) => Ge(e, r)))) return;
      let l = I(r) ? r : null;
      for (; l && !ve(l); ) {
        let e = xe(l);
        if (ve(e) || !I(e)) break;
        l = e;
      }
      if (
        o.length &&
        I(r) &&
        !Ye(r) &&
        !Ge(r, n.select(`floatingElement`)) &&
        o.every((e) => !Ge(l, e))
      )
        return;
      if (ue(r) && !(`touches` in e)) {
        let t = ve(r),
          n = ye(r),
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
        d = m ? $e(m.nodesRef.current, u) : [];
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
      (n.setOpen(!1, ln(nn, e)), D());
    }
    function A(e) {
      f() !== `sloppy` ||
        e.pointerType === `touch` ||
        !n.select(`open`) ||
        !o ||
        Je(e, n.select(`floatingElement`)) ||
        Je(e, n.select(`domReferenceElement`)) ||
        E(e);
    }
    function M(e) {
      if (
        f() !== `sloppy` ||
        !n.select(`open`) ||
        !o ||
        Je(e, n.select(`floatingElement`)) ||
        Je(e, n.select(`domReferenceElement`))
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
    function ee(e) {
      k.current = `touch`;
      let t = qe(e);
      function n() {
        (M(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    function N(e) {
      if (
        (T.clear(),
        e.type === `pointerdown` && (k.current = e.pointerType),
        e.type === `mousedown` && w.current && !w.current.dismissOnMouseDown)
      )
        return;
      let t = qe(e);
      function n() {
        (e.type === `pointerdown` ? A(e) : E(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    function te(e) {
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
    function ne(e) {
      if (
        f() !== `sloppy` ||
        !w.current ||
        Je(e, n.select(`floatingElement`)) ||
        Je(e, n.select(`domReferenceElement`))
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
    function re(e) {
      let t = qe(e);
      function n() {
        (ne(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    function ie(e) {
      f() !== `sloppy` ||
        !w.current ||
        Je(e, n.select(`floatingElement`)) ||
        Je(e, n.select(`domReferenceElement`)) ||
        (w.current.dismissOnTouchEnd && E(e), T.clear(), (w.current = null));
    }
    function oe(e) {
      let t = qe(e);
      function n() {
        (ie(e), t?.removeEventListener(e.type, n));
      }
      t?.addEventListener(e.type, n);
    }
    let P = Ft(i);
    return (
      s &&
        (P.addEventListener(`keydown`, j),
        P.addEventListener(`compositionstart`, c),
        P.addEventListener(`compositionend`, l)),
      _ &&
        (P.addEventListener(`click`, N, !0),
        P.addEventListener(`pointerdown`, N, !0),
        P.addEventListener(`pointerup`, te, !0),
        P.addEventListener(`pointercancel`, te, !0),
        P.addEventListener(`mousedown`, N, !0),
        P.addEventListener(`mouseup`, te, !0),
        P.addEventListener(`touchstart`, ee, !0),
        P.addEventListener(`touchmove`, re, !0),
        P.addEventListener(`touchend`, oe, !0)),
      () => {
        (s &&
          (P.removeEventListener(`keydown`, j),
          P.removeEventListener(`compositionstart`, c),
          P.removeEventListener(`compositionend`, l)),
          _ &&
            (P.removeEventListener(`click`, N, !0),
            P.removeEventListener(`pointerdown`, N, !0),
            P.removeEventListener(`pointerup`, te, !0),
            P.removeEventListener(`pointercancel`, te, !0),
            P.removeEventListener(`mousedown`, N, !0),
            P.removeEventListener(`mouseup`, te, !0),
            P.removeEventListener(`touchstart`, ee, !0),
            P.removeEventListener(`touchmove`, re, !0),
            P.removeEventListener(`touchend`, oe, !0)),
          e.clear(),
          t.clear(),
          d(),
          (x.current = !1));
      }
    );
  }, [a, i, s, _, g, r, o, S, C, j, D, v, m, n, T]),
    ri.useEffect(D, [g, D]));
  let ee = ri.useMemo(
      () => ({
        onKeyDown: j,
        [ii[d]]: (e) => {
          A() && n.setOpen(!1, ln($t, e.nativeEvent));
        },
        ...(d !== `intentional` && {
          onClick(e) {
            A() && n.setOpen(!1, ln(`trigger-press`, e.nativeEvent));
          },
        }),
      }),
      [j, n, d, A],
    ),
    N = L((e) => {
      if (!r || !o || e.button !== 0) return;
      let t = qe(e.nativeEvent);
      Ge(n.select(`floatingElement`), t) && (y.current || ((y.current = !0), (b.current = !1)));
    }),
    te = L((e) => {
      !r ||
        !o ||
        ((e.defaultPrevented || e.nativeEvent.defaultPrevented) && y.current && (b.current = !0));
    }),
    ne = ri.useMemo(
      () => ({
        onKeyDown: j,
        onPointerDown: te,
        onMouseDown: te,
        onClickCapture: M,
        onMouseDownCapture(e) {
          (M(), N(e));
        },
        onPointerDownCapture(e) {
          (M(), N(e));
        },
        onMouseUpCapture: M,
        onTouchEndCapture: M,
        onTouchMoveCapture: M,
      }),
      [j, M, N, te],
    );
  return ri.useMemo(() => (o ? { reference: ee, floating: ne, trigger: ee } : {}), [o, ee, ne]);
}
var ri,
  ii,
  ai = t(() => {
    ((ri = e(r())),
      ke(),
      oe(),
      Mn(),
      It(),
      Rt(),
      Kr(),
      un(),
      cn(),
      Bn(),
      (ii = { intentional: `onClick`, sloppy: `onPointerDown` }));
  });
function oi(e, t, n) {
  let { reference: r, floating: i } = e,
    a = dt(t),
    o = ft(t),
    s = ut(o),
    c = st(t),
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
  switch (ct(t)) {
    case `start`:
      p[o] -= f * (n && l ? -1 : 1);
      break;
    case `end`:
      p[o] += f * (n && l ? -1 : 1);
      break;
  }
  return p;
}
async function si(e, t) {
  t === void 0 && (t = {});
  let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e,
    {
      boundary: c = `clippingAncestors`,
      rootBoundary: l = `viewport`,
      elementContext: u = `floating`,
      altBoundary: d = !1,
      padding: f = 0,
    } = ot(t, e),
    p = bt(f),
    m = o[d ? (u === `floating` ? `reference` : `floating`) : u],
    h = xt(
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
    y = xt(
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
function ci(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width,
  };
}
function li(e) {
  return St.some((t) => e[t] >= 0);
}
async function ui(e, t) {
  let { placement: n, platform: r, elements: i } = e,
    a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)),
    o = st(n),
    s = ct(n),
    c = dt(n) === `y`,
    l = hi.has(o) ? -1 : 1,
    u = a && c ? -1 : 1,
    d = ot(t, e),
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
var di,
  fi,
  pi,
  mi,
  hi,
  gi,
  _i,
  vi,
  yi,
  bi = t(() => {
    (Nt(),
      (di = 50),
      (fi = async (e, t, n) => {
        let {
            placement: r = `bottom`,
            strategy: i = `absolute`,
            middleware: a = [],
            platform: o,
          } = n,
          s = o.detectOverflow ? o : { ...o, detectOverflow: si },
          c = await (o.isRTL == null ? void 0 : o.isRTL(t)),
          l = await o.getElementRects({ reference: e, floating: t, strategy: i }),
          { x: u, y: d } = oi(l, r, c),
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
              p < di &&
              (p++,
              typeof x == `object` &&
                (x.placement && (f = x.placement),
                x.rects &&
                  (l =
                    x.rects === !0
                      ? await o.getElementRects({ reference: e, floating: t, strategy: i })
                      : x.rects),
                ({ x: u, y: d } = oi(l, f, c))),
              (n = -1)));
        }
        return { x: u, y: d, placement: f, strategy: i, middlewareData: m };
      }),
      (pi = function (e) {
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
                } = ot(e, t);
              if ((n = i.arrow) != null && n.alignmentOffset) return {};
              let g = st(r),
                _ = dt(o),
                v = st(o) === o,
                y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)),
                b = d || (v || !m ? [vt(o)] : mt(o)),
                x = p !== `none`;
              !d && x && b.push(..._t(o, m, p, y));
              let S = [o, ...b],
                C = await s.detectOverflow(t, h),
                w = [],
                T = i.flip?.overflows || [];
              if ((l && w.push(C[g]), u)) {
                let e = pt(r, a, y);
                w.push(C[e[0]], C[e[1]]);
              }
              if (((T = [...T, { placement: r, overflows: w }]), !w.every((e) => e <= 0))) {
                let e = (i.flip?.index || 0) + 1,
                  t = S[e];
                if (
                  t &&
                  (!(u === `alignment` && _ !== dt(t)) ||
                    T.every((e) => (dt(e.placement) === _ ? e.overflows[0] > 0 : !0)))
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
                          let t = dt(e.placement);
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
      (mi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            name: `hide`,
            options: e,
            async fn(t) {
              let { rects: n, platform: r } = t,
                { strategy: i = `referenceHidden`, ...a } = ot(e, t);
              switch (i) {
                case `referenceHidden`: {
                  let e = ci(
                    await r.detectOverflow(t, { ...a, elementContext: `reference` }),
                    n.reference,
                  );
                  return { data: { referenceHiddenOffsets: e, referenceHidden: li(e) } };
                }
                case `escaped`: {
                  let e = ci(await r.detectOverflow(t, { ...a, altBoundary: !0 }), n.floating);
                  return { data: { escapedOffsets: e, escaped: li(e) } };
                }
                default:
                  return {};
              }
            },
          }
        );
      }),
      (hi = new Set([`left`, `top`])),
      (gi = function (e) {
        return (
          e === void 0 && (e = 0),
          {
            name: `offset`,
            options: e,
            async fn(t) {
              var n;
              let { x: r, y: i, placement: a, middlewareData: o } = t,
                s = await ui(t, e);
              return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset
                ? {}
                : { x: r + s.x, y: i + s.y, data: { ...s, placement: a } };
            },
          }
        );
      }),
      (_i = function (e) {
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
                } = ot(e, t),
                u = { x: n, y: r },
                d = await a.detectOverflow(t, l),
                f = dt(st(i)),
                p = lt(f),
                m = u[p],
                h = u[f];
              if (o) {
                let e = p === `y` ? `top` : `left`,
                  t = p === `y` ? `bottom` : `right`,
                  n = m + d[e],
                  r = m - d[t];
                m = at(n, m, r);
              }
              if (s) {
                let e = f === `y` ? `top` : `left`,
                  t = f === `y` ? `bottom` : `right`,
                  n = h + d[e],
                  r = h - d[t];
                h = at(n, h, r);
              }
              let g = c.fn({ ...t, [p]: m, [f]: h });
              return { ...g, data: { x: g.x - n, y: g.y - r, enabled: { [p]: o, [f]: s } } };
            },
          }
        );
      }),
      (vi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            options: e,
            fn(t) {
              let { x: n, y: r, placement: i, rects: a, middlewareData: o } = t,
                { offset: s = 0, mainAxis: c = !0, crossAxis: l = !0 } = ot(e, t),
                u = { x: n, y: r },
                d = dt(i),
                f = lt(d),
                p = u[f],
                m = u[d],
                h = ot(s, t),
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
                  t = hi.has(st(i)),
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
      (yi = function (e) {
        return (
          e === void 0 && (e = {}),
          {
            name: `size`,
            options: e,
            async fn(t) {
              var n, r;
              let { placement: i, rects: a, platform: o, elements: s } = t,
                { apply: c = () => {}, ...l } = ot(e, t),
                u = await o.detectOverflow(t, l),
                d = st(i),
                f = ct(i),
                p = dt(i) === `y`,
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
                b = Ct(h - u[g], v),
                x = Ct(m - u[_], y),
                S = !t.middlewareData.shift,
                C = b,
                w = x;
              if (
                ((n = t.middlewareData.shift) != null && n.enabled.x && (w = y),
                (r = t.middlewareData.shift) != null && r.enabled.y && (C = v),
                S && !f)
              ) {
                let e = wt(u.left, 0),
                  t = wt(u.right, 0),
                  n = wt(u.top, 0),
                  r = wt(u.bottom, 0);
                p
                  ? (w = m - 2 * (e !== 0 || t !== 0 ? e + t : wt(u.left, u.right)))
                  : (C = h - 2 * (n !== 0 || r !== 0 ? n + r : wt(u.top, u.bottom)));
              }
              await c({ ...t, availableWidth: w, availableHeight: C });
              let T = await o.getDimensions(s.floating);
              return m !== T.width || h !== T.height ? { reset: { rects: !0 } } : {};
            },
          }
        );
      }));
  });
function xi(e) {
  let t = ye(e),
    n = parseFloat(t.width) || 0,
    r = parseFloat(t.height) || 0,
    i = ue(e),
    a = i ? e.offsetWidth : n,
    o = i ? e.offsetHeight : r,
    s = Tt(n) !== a || Tt(r) !== o;
  return (s && ((n = a), (r = o)), { width: n, height: r, $: s });
}
function Si(e) {
  return I(e) ? e : e.contextElement;
}
function Ci(e) {
  let t = Si(e);
  if (!ue(t)) return Dt(1);
  let n = t.getBoundingClientRect(),
    { width: r, height: i, $: a } = xi(t),
    o = (a ? Tt(n.width) : n.width) / r,
    s = (a ? Tt(n.height) : n.height) / i;
  return (
    (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), { x: o, y: s }
  );
}
function wi(e) {
  let t = F(e);
  return !_e() || !t.visualViewport
    ? qi
    : { x: t.visualViewport.offsetLeft, y: t.visualViewport.offsetTop };
}
function Ti(e, t, n) {
  return (t === void 0 && (t = !1), !n || (t && n !== F(e)) ? !1 : t);
}
function Ei(e, t, n, r) {
  (t === void 0 && (t = !1), n === void 0 && (n = !1));
  let i = e.getBoundingClientRect(),
    a = Si(e),
    o = Dt(1);
  t && (r ? I(r) && (o = Ci(r)) : (o = Ci(e)));
  let s = Ti(a, n, r) ? wi(a) : Dt(0),
    c = (i.left + s.x) / o.x,
    l = (i.top + s.y) / o.y,
    u = i.width / o.x,
    d = i.height / o.y;
  if (a) {
    let e = F(a),
      t = r && I(r) ? F(r) : r,
      n = e,
      i = we(n);
    for (; i && r && t !== n; ) {
      let e = Ci(i),
        t = i.getBoundingClientRect(),
        r = ye(i),
        a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x,
        o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
      ((c *= e.x), (l *= e.y), (u *= e.x), (d *= e.y), (c += a), (l += o), (n = F(i)), (i = we(n)));
    }
  }
  return xt({ width: u, height: d, x: c, y: l });
}
function Di(e, t) {
  let n = be(e).scrollLeft;
  return t ? t.left + n : Ei(ce(e)).left + n;
}
function Oi(e, t) {
  let n = e.getBoundingClientRect();
  return { x: n.left + t.scrollLeft - Di(e, n), y: n.top + t.scrollTop };
}
function ki(e) {
  let { elements: t, rect: n, offsetParent: r, strategy: i } = e,
    a = i === `fixed`,
    o = ce(r),
    s = t ? me(t.floating) : !1;
  if (r === o || (s && a)) return n;
  let c = { scrollLeft: 0, scrollTop: 0 },
    l = Dt(1),
    u = Dt(0),
    d = ue(r);
  if ((d || (!d && !a)) && ((se(r) !== `body` || fe(o)) && (c = be(r)), d)) {
    let e = Ei(r);
    ((l = Ci(r)), (u.x = e.x + r.clientLeft), (u.y = e.y + r.clientTop));
  }
  let f = o && !d && !a ? Oi(o, c) : Dt(0);
  return {
    width: n.width * l.x,
    height: n.height * l.y,
    x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
    y: n.y * l.y - c.scrollTop * l.y + u.y + f.y,
  };
}
function Ai(e) {
  return Array.from(e.getClientRects());
}
function ji(e) {
  let t = ce(e),
    n = be(e),
    r = e.ownerDocument.body,
    i = wt(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth),
    a = wt(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight),
    o = -n.scrollLeft + Di(e),
    s = -n.scrollTop;
  return (
    ye(r).direction === `rtl` && (o += wt(t.clientWidth, r.clientWidth) - i),
    { width: i, height: a, x: o, y: s }
  );
}
function Mi(e, t) {
  let n = F(e),
    r = ce(e),
    i = n.visualViewport,
    a = r.clientWidth,
    o = r.clientHeight,
    s = 0,
    c = 0;
  if (i) {
    ((a = i.width), (o = i.height));
    let e = _e();
    (!e || (e && t === `fixed`)) && ((s = i.offsetLeft), (c = i.offsetTop));
  }
  let l = Di(r);
  if (l <= 0) {
    let e = r.ownerDocument,
      t = e.body,
      n = getComputedStyle(t),
      i =
        (e.compatMode === `CSS1Compat` && parseFloat(n.marginLeft) + parseFloat(n.marginRight)) ||
        0,
      o = Math.abs(r.clientWidth - t.clientWidth - i);
    o <= Ji && (a -= o);
  } else l <= Ji && (a += l);
  return { width: a, height: o, x: s, y: c };
}
function Ni(e, t) {
  let n = Ei(e, !0, t === `fixed`),
    r = n.top + e.clientTop,
    i = n.left + e.clientLeft,
    a = ue(e) ? Ci(e) : Dt(1);
  return { width: e.clientWidth * a.x, height: e.clientHeight * a.y, x: i * a.x, y: r * a.y };
}
function Pi(e, t, n) {
  let r;
  if (t === `viewport`) r = Mi(e, n);
  else if (t === `document`) r = ji(ce(e));
  else if (I(t)) r = Ni(t, n);
  else {
    let n = wi(e);
    r = { x: t.x - n.x, y: t.y - n.y, width: t.width, height: t.height };
  }
  return xt(r);
}
function Fi(e, t) {
  let n = xe(e);
  return n === t || !I(n) || ve(n) ? !1 : ye(n).position === `fixed` || Fi(n, t);
}
function Ii(e, t) {
  let n = t.get(e);
  if (n) return n;
  let r = Ce(e, [], !1).filter((e) => I(e) && se(e) !== `body`),
    i = null,
    a = ye(e).position === `fixed`,
    o = a ? xe(e) : e;
  for (; I(o) && !ve(o); ) {
    let t = ye(o),
      n = he(o);
    (!n && t.position === `fixed` && (i = null),
      (
        a
          ? !n && !i
          : (!n &&
              t.position === `static` &&
              i &&
              (i.position === `absolute` || i.position === `fixed`)) ||
            (fe(o) && !n && Fi(e, o))
      )
        ? (r = r.filter((e) => e !== o))
        : (i = t),
      (o = xe(o)));
  }
  return (t.set(e, r), r);
}
function Li(e) {
  let { element: t, boundary: n, rootBoundary: r, strategy: i } = e,
    a = [...(n === `clippingAncestors` ? (me(t) ? [] : Ii(t, this._c)) : [].concat(n)), r],
    o = Pi(t, a[0], i),
    s = o.top,
    c = o.right,
    l = o.bottom,
    u = o.left;
  for (let e = 1; e < a.length; e++) {
    let n = Pi(t, a[e], i);
    ((s = wt(n.top, s)), (c = Ct(n.right, c)), (l = Ct(n.bottom, l)), (u = wt(n.left, u)));
  }
  return { width: c - u, height: l - s, x: u, y: s };
}
function Ri(e) {
  let { width: t, height: n } = xi(e);
  return { width: t, height: n };
}
function zi(e, t, n) {
  let r = ue(t),
    i = ce(t),
    a = n === `fixed`,
    o = Ei(e, !0, a, t),
    s = { scrollLeft: 0, scrollTop: 0 },
    c = Dt(0);
  function l() {
    c.x = Di(i);
  }
  if (r || (!r && !a))
    if (((se(t) !== `body` || fe(i)) && (s = be(t)), r)) {
      let e = Ei(t, !0, a, t);
      ((c.x = e.x + t.clientLeft), (c.y = e.y + t.clientTop));
    } else i && l();
  a && !r && i && l();
  let u = i && !r && !a ? Oi(i, s) : Dt(0);
  return {
    x: o.left + s.scrollLeft - c.x - u.x,
    y: o.top + s.scrollTop - c.y - u.y,
    width: o.width,
    height: o.height,
  };
}
function Bi(e) {
  return ye(e).position === `static`;
}
function Vi(e, t) {
  if (!ue(e) || ye(e).position === `fixed`) return null;
  if (t) return t(e);
  let n = e.offsetParent;
  return (ce(e) === n && (n = n.ownerDocument.body), n);
}
function Hi(e, t) {
  let n = F(e);
  if (me(e)) return n;
  if (!ue(e)) {
    let t = xe(e);
    for (; t && !ve(t); ) {
      if (I(t) && !Bi(t)) return t;
      t = xe(t);
    }
    return n;
  }
  let r = Vi(e, t);
  for (; r && pe(r) && Bi(r); ) r = Vi(r, t);
  return r && ve(r) && Bi(r) && !he(r) ? n : r || ge(e) || n;
}
function Ui(e) {
  return ye(e).direction === `rtl`;
}
function Wi(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Gi(e, t) {
  let n = null,
    r,
    i = ce(e);
  function a() {
    var e;
    (clearTimeout(r), (e = n) == null || e.disconnect(), (n = null));
  }
  function o(s, c) {
    (s === void 0 && (s = !1), c === void 0 && (c = 1), a());
    let l = e.getBoundingClientRect(),
      { left: u, top: d, width: f, height: p } = l;
    if ((s || t(), !f || !p)) return;
    let m = Et(d),
      h = Et(i.clientWidth - (u + f)),
      g = Et(i.clientHeight - (d + p)),
      _ = Et(u),
      v = {
        rootMargin: -m + `px ` + -h + `px ` + -g + `px ` + -_ + `px`,
        threshold: wt(0, Ct(1, c)) || 1,
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
      (n === 1 && !Wi(l, e.getBoundingClientRect()) && o(), (y = !1));
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
function Ki(e, t, n, r) {
  r === void 0 && (r = {});
  let {
      ancestorScroll: i = !0,
      ancestorResize: a = !0,
      elementResize: o = typeof ResizeObserver == `function`,
      layoutShift: s = typeof IntersectionObserver == `function`,
      animationFrame: c = !1,
    } = r,
    l = Si(e),
    u = i || a ? [...(l ? Ce(l) : []), ...(t ? Ce(t) : [])] : [];
  u.forEach((e) => {
    (i && e.addEventListener(`scroll`, n, { passive: !0 }), a && e.addEventListener(`resize`, n));
  });
  let d = l && s ? Gi(l, n) : null,
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
    h = c ? Ei(e) : null;
  c && g();
  function g() {
    let t = Ei(e);
    (h && !Wi(h, t) && n(), (h = t), (m = requestAnimationFrame(g)));
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
var qi,
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
  ia = t(() => {
    (bi(),
      Nt(),
      ke(),
      (qi = Dt(0)),
      (Ji = 25),
      (Yi = async function (e) {
        let t = this.getOffsetParent || Hi,
          n = this.getDimensions,
          r = await n(e.floating);
        return {
          reference: zi(e.reference, await t(e.floating), e.strategy),
          floating: { x: 0, y: 0, width: r.width, height: r.height },
        };
      }),
      (Xi = {
        convertOffsetParentRelativeRectToViewportRelativeRect: ki,
        getDocumentElement: ce,
        getClippingRect: Li,
        getOffsetParent: Hi,
        getElementRects: Yi,
        getClientRects: Ai,
        getDimensions: Ri,
        getScale: Ci,
        isElement: I,
        isRTL: Ui,
      }),
      (Zi = gi),
      (Qi = _i),
      ($i = pi),
      (ea = yi),
      (ta = mi),
      (na = vi),
      (ra = (e, t, n) => {
        let r = new Map(),
          i = { platform: Xi, ...n },
          a = { ...i.platform, _c: r };
        return fi(e, t, { ...i, platform: a });
      }));
  });
function aa(e, t) {
  if (e === t) return !0;
  if (typeof e != typeof t) return !1;
  if (typeof e == `function` && e.toString() === t.toString()) return !0;
  let n, r, i;
  if (e && t && typeof e == `object`) {
    if (Array.isArray(e)) {
      if (((n = e.length), n !== t.length)) return !1;
      for (r = n; r-- !== 0; ) if (!aa(e[r], t[r])) return !1;
      return !0;
    }
    if (((i = Object.keys(e)), (n = i.length), n !== Object.keys(t).length)) return !1;
    for (r = n; r-- !== 0; ) if (!{}.hasOwnProperty.call(t, i[r])) return !1;
    for (r = n; r-- !== 0; ) {
      let n = i[r];
      if (!(n === `_owner` && e.$$typeof) && !aa(e[n], t[n])) return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function oa(e) {
  return typeof window > `u` ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function sa(e, t) {
  let n = oa(e);
  return Math.round(t * n) / n;
}
function ca(e) {
  let t = ua.useRef(e);
  return (
    pa(() => {
      t.current = e;
    }),
    t
  );
}
function la(e) {
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
    [u, d] = ua.useState({
      x: 0,
      y: 0,
      strategy: n,
      placement: t,
      middlewareData: {},
      isPositioned: !1,
    }),
    [f, p] = ua.useState(r);
  aa(f, r) || p(r);
  let [m, h] = ua.useState(null),
    [g, _] = ua.useState(null),
    v = ua.useCallback((e) => {
      e !== S.current && ((S.current = e), h(e));
    }, []),
    y = ua.useCallback((e) => {
      e !== C.current && ((C.current = e), _(e));
    }, []),
    b = a || m,
    x = o || g,
    S = ua.useRef(null),
    C = ua.useRef(null),
    w = ua.useRef(u),
    T = c != null,
    E = ca(c),
    D = ca(i),
    O = ca(l),
    k = ua.useCallback(() => {
      if (!S.current || !C.current) return;
      let e = { placement: t, strategy: n, middleware: f };
      (D.current && (e.platform = D.current),
        ra(S.current, C.current, e).then((e) => {
          let t = { ...e, isPositioned: O.current !== !1 };
          A.current &&
            !aa(w.current, t) &&
            ((w.current = t),
            fa.flushSync(() => {
              d(t);
            }));
        }));
    }, [f, t, n, D, O]);
  pa(() => {
    l === !1 &&
      w.current.isPositioned &&
      ((w.current.isPositioned = !1), d((e) => ({ ...e, isPositioned: !1 })));
  }, [l]);
  let A = ua.useRef(!1);
  (pa(
    () => (
      (A.current = !0),
      () => {
        A.current = !1;
      }
    ),
    [],
  ),
    pa(() => {
      if ((b && (S.current = b), x && (C.current = x), b && x)) {
        if (E.current) return E.current(b, x, k);
        k();
      }
    }, [b, x, k, E, T]));
  let j = ua.useMemo(
      () => ({ reference: S, floating: C, setReference: v, setFloating: y }),
      [v, y],
    ),
    M = ua.useMemo(() => ({ reference: b, floating: x }), [b, x]),
    ee = ua.useMemo(() => {
      let e = { position: n, left: 0, top: 0 };
      if (!M.floating) return e;
      let t = sa(M.floating, u.x),
        r = sa(M.floating, u.y);
      return s
        ? {
            ...e,
            transform: `translate(` + t + `px, ` + r + `px)`,
            ...(oa(M.floating) >= 1.5 && { willChange: `transform` }),
          }
        : { position: n, left: t, top: r };
    }, [n, s, M.floating, u.x, u.y]);
  return ua.useMemo(
    () => ({ ...u, update: k, refs: j, elements: M, floatingStyles: ee }),
    [u, k, j, M, ee],
  );
}
var ua,
  da,
  fa,
  pa,
  ma,
  ha,
  ga,
  _a,
  va,
  ya,
  ba = t(() => {
    (ia(),
      (ua = e(r(), 1)),
      (da = e(r(), 1)),
      (fa = e(a(), 1)),
      (pa = typeof document < `u` ? da.useLayoutEffect : function () {}),
      (ma = (e, t) => {
        let n = Zi(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (ha = (e, t) => {
        let n = Qi(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (ga = (e, t) => ({ fn: na(e).fn, options: [e, t] })),
      (_a = (e, t) => {
        let n = $i(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (va = (e, t) => {
        let n = ea(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }),
      (ya = (e, t) => {
        let n = ta(e);
        return { name: n.name, fn: n.fn, options: [e, t] };
      }));
  });
function xa(e, t = `expected a function, instead received ${typeof e}`) {
  if (typeof e != `function`) throw TypeError(t);
}
function Sa(e, t = `expected an object, instead received ${typeof e}`) {
  if (typeof e != `object`) throw TypeError(t);
}
function Ca(e, t = `expected all items to be functions, instead received the following types: `) {
  if (!e.every((e) => typeof e == `function`)) {
    let n = e
      .map((e) => (typeof e == `function` ? `function ${e.name || `unnamed`}()` : typeof e))
      .join(`, `);
    throw TypeError(`${t}[${n}]`);
  }
}
function wa(e) {
  let t = Array.isArray(e[0]) ? e[0] : e;
  return (
    Ca(
      t,
      `createSelector expects all input-selectors to be functions, but received the following types: `,
    ),
    t
  );
}
function Ta(e, t) {
  let n = [],
    { length: r } = e;
  for (let i = 0; i < r; i++) n.push(e[i].apply(null, t));
  return n;
}
function Ea(e) {
  let t;
  return {
    get(n) {
      return t && e(t.key, n) ? t.value : Na;
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
function Da(e, t) {
  let n = [];
  function r(e) {
    let r = n.findIndex((n) => t(e, n.key));
    if (r > -1) {
      let e = n[r];
      return (r > 0 && (n.splice(r, 1), n.unshift(e)), e.value);
    }
    return Na;
  }
  function i(t, i) {
    r(t) === Na && (n.unshift({ key: t, value: i }), n.length > e && n.pop());
  }
  function a() {
    return n;
  }
  function o() {
    n = [];
  }
  return { get: r, put: i, getEntries: a, clear: o };
}
function Oa(e) {
  return function (t, n) {
    if (t === null || n === null || t.length !== n.length) return !1;
    let { length: r } = t;
    for (let i = 0; i < r; i++) if (!e(t[i], n[i])) return !1;
    return !0;
  };
}
function ka(e, t) {
  let {
      equalityCheck: n = Fa,
      maxSize: r = 1,
      resultEqualityCheck: i,
    } = typeof t == `object` ? t : { equalityCheck: t },
    a = Oa(n),
    o = 0,
    s = r <= 1 ? Ea(a) : Da(r, a);
  function c() {
    let t = s.get(arguments);
    if (t === Na) {
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
function Aa() {
  return { s: Ra, v: void 0, o: null, p: null };
}
function ja(e, t = {}) {
  let n = Aa(),
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
        r === void 0 ? ((t = Aa()), e.set(n, t)) : (t = r);
      } else {
        let e = t.p;
        e === null && (t.p = e = new Map());
        let r = e.get(n);
        r === void 0 ? ((t = Aa()), e.set(n, t)) : (t = r);
      }
    }
    let s = t,
      c;
    if (t.s === za) c = t.v;
    else if (((c = e.apply(null, arguments)), a++, r)) {
      let e = i?.deref?.() ?? i;
      (e != null && r(e, c) && ((c = e), a !== 0 && a--),
        (i = (typeof c == `object` && c) || typeof c == `function` ? new La(c) : c));
    }
    return ((s.s = za), (s.v = c), c);
  }
  return (
    (o.clearCache = () => {
      ((n = Aa()), o.resetResultsCount());
    }),
    (o.resultsCount = () => a),
    (o.resetResultsCount = () => {
      a = 0;
    }),
    o
  );
}
function Ma(e, ...t) {
  let n = typeof e == `function` ? { memoize: e, memoizeOptions: t } : e,
    r = (...e) => {
      let t = 0,
        r = 0,
        i,
        a = {},
        o = e.pop();
      (typeof o == `object` && ((a = o), (o = e.pop())),
        xa(
          o,
          `createSelector expects an output function after the inputs, but received: [${typeof o}]`,
        ));
      let {
          memoize: s,
          memoizeOptions: c = [],
          argsMemoize: l = ja,
          argsMemoizeOptions: u = [],
          devModeChecks: d = {},
        } = { ...n, ...a },
        f = Pa(c),
        p = Pa(u),
        m = wa(e),
        h = s(
          function () {
            return (t++, o.apply(null, arguments));
          },
          ...f,
        ),
        g = l(
          function () {
            r++;
            let e = Ta(m, arguments);
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
var Na,
  Pa,
  Fa,
  Ia,
  La,
  Ra,
  za,
  Ba,
  Va,
  Ha = t(() => {
    ((Na = Symbol(`NOT_FOUND`)),
      (Pa = (e) => (Array.isArray(e) ? e : [e])),
      (Fa = (e, t) => e === t),
      (Ia = class {
        constructor(e) {
          this.value = e;
        }
        deref() {
          return this.value;
        }
      }),
      (La = typeof WeakRef < `u` ? WeakRef : Ia),
      (Ra = 0),
      (za = 1),
      (Ba = Ma(ja)),
      (Va = Object.assign(
        (e, t = Ba) => {
          Sa(
            e,
            `createStructuredSelector expects first argument to be an object where each property is a selector, instead received a ${typeof e}`,
          );
          let n = Object.keys(e);
          return t(
            n.map((t) => e[t]),
            (...e) => e.reduce((e, t, r) => ((e[n[r]] = t), e), {}),
          );
        },
        { withTypes: () => Va },
      )));
  }),
  R,
  Ua = t(() => {
    (O(),
      Ha(),
      Ma({ memoize: ka, memoizeOptions: { maxSize: 1, equalityCheck: Object.is } }),
      (R = (e, t, n, r, i, a, ...o) => {
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
  Wa = n((e) => {
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
  Ga = n((e, t) => {
    t.exports = Wa();
  }),
  Ka = n((e) => {
    var t = r(),
      n = Ga();
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
  qa = n((e, t) => {
    t.exports = Ka();
  });
function Ja(e, t, n, r, i) {
  return to(e, t, n, r, i);
}
function Ya(e, t, n, r, i) {
  let a = Qa.useCallback(() => t(e.getSnapshot(), n, r, i), [e, t, n, r, i]);
  return (0, $a.useSyncExternalStore)(e.subscribe, a, a);
}
function Xa(e, t, n, r, i) {
  let a = u();
  if (!a) return Ya(e, t, n, r, i);
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
function Za(e, t, n, r, i) {
  return (0, eo.useSyncExternalStoreWithSelector)(e.subscribe, e.getSnapshot, e.getSnapshot, (e) =>
    t(e, n, r, i),
  );
}
var Qa,
  $a,
  eo,
  to,
  no = t(() => {
    ((Qa = e(r())),
      ($a = Ga()),
      (eo = qa()),
      Qn(),
      v(),
      (to = Xn(19) ? Xa : Za),
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
            (0, $a.useSyncExternalStore)(e.subscribe, e.getSnapshot, e.getSnapshot));
        },
      }));
  }),
  ro,
  io = t(() => {
    (no(),
      (ro = class {
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
          return Ja(this, e, t, n, r);
        }
      }));
  }),
  ao,
  oo,
  so = t(() => {
    ((ao = e(r())),
      io(),
      no(),
      Mn(),
      T(),
      Kt(),
      (oo = class extends ro {
        constructor(e, t = {}, n) {
          (super(e), (this.context = t), (this.selectors = n));
        }
        useSyncedValue(e, t) {
          (ao.useDebugValue(e),
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
          ao.useDebugValue(e);
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
          return (ao.useDebugValue(e), Ja(this, this.selectors[e], t, n, r));
        }
        useContextCallback(e, t) {
          ao.useDebugValue(e);
          let n = L(t ?? Wt);
          this.context[e] = n;
        }
        useStateSetter(e) {
          let t = ao.useRef(void 0);
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
  co = t(() => {
    (e(r()), e(a()), i());
  }),
  lo = t(() => {
    (Ua(), no(), io(), so(), co());
  }),
  uo,
  fo,
  po = t(() => {
    (lo(),
      Br(),
      Rt(),
      (uo = {
        open: R((e) => e.open),
        domReferenceElement: R((e) => e.domReferenceElement),
        referenceElement: R((e) => e.positionReference ?? e.referenceElement),
        floatingElement: R((e) => e.floatingElement),
        floatingId: R((e) => e.floatingId),
      }),
      (fo = class extends oo {
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
              events: zr(),
              nested: t,
              noEmit: n,
              triggerElements: i,
            },
            uo,
          );
        }
        setOpen = (e, t) => {
          if (
            ((!e || !this.state.open || rt(t.event)) &&
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
function mo(e, t = !1, n = !1) {
  let [r, i] = ho.useState(e && t ? `idle` : void 0),
    [a, o] = ho.useState(e);
  return (
    e && !a && (o(!0), i(`starting`)),
    !e && a && r !== `ending` && !n && i(`ending`),
    !e && !a && r === `ending` && i(void 0),
    w(() => {
      if (!e && a && r !== `ending` && n) {
        let e = Ln.request(() => {
          i(`ending`);
        });
        return () => {
          Ln.cancel(e);
        };
      }
    }, [e, a, r, n]),
    w(() => {
      if (!e || t) return;
      let n = Ln.request(() => {
        i(void 0);
      });
      return () => {
        Ln.cancel(n);
      };
    }, [t, e]),
    w(() => {
      if (!e || !t) return;
      e && a && r !== `idle` && i(`starting`);
      let n = Ln.request(() => {
        i(`idle`);
      });
      return () => {
        Ln.cancel(n);
      };
    }, [t, e, a, i, r]),
    ho.useMemo(() => ({ mounted: a, setMounted: o, transitionStatus: r }), [a, r])
  );
}
var ho,
  go = t(() => {
    ((ho = e(r())), T(), Rn());
  }),
  _o,
  vo,
  yo,
  bo,
  xo = t(() => {
    ((_o = (function (e) {
      return ((e.startingStyle = `data-starting-style`), (e.endingStyle = `data-ending-style`), e);
    })({})),
      (vo = { [_o.startingStyle]: `` }),
      (yo = { [_o.endingStyle]: `` }),
      (bo = {
        transitionStatus(e) {
          return e === `starting` ? vo : e === `ending` ? yo : null;
        },
      }));
  });
function So(e, t = !1, n = !0) {
  let r = Nn();
  return L((i, a = null) => {
    r.cancel();
    function o() {
      Co.flushSync(i);
    }
    let s = qr(e);
    if (s == null) return;
    let c = s;
    if (typeof c.getAnimations != `function` || globalThis.BASE_UI_ANIMATIONS_DISABLED) i();
    else {
      function e() {
        let e = _o.startingStyle;
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
var Co,
  wo = t(() => {
    ((Co = e(a())), Rn(), Mn(), Jr(), xo());
  });
function To(e) {
  let { enabled: t = !0, open: n, ref: r, onComplete: i } = e,
    a = L(i),
    o = So(r, n, !1);
  Eo.useEffect(() => {
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
var Eo,
  Do = t(() => {
    ((Eo = e(r())), Mn(), wo());
  });
function Oo(e, t) {
  let n = Mo.useRef(null),
    r = Mo.useRef(null);
  return Mo.useCallback(
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
function ko(e, t, n, r) {
  let i = n.useState(`isMountedByTrigger`, e),
    a = Oo(e, n),
    o = L((t) => {
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
function Ao(e) {
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
function jo(e, t, n) {
  let { mounted: r, setMounted: i, transitionStatus: a } = mo(e);
  t.useSyncedValues({ mounted: r, transitionStatus: a });
  let o = L(() => {
    (i(!1),
      t.update({ activeTriggerId: null, activeTriggerElement: null, mounted: !1 }),
      n?.(),
      t.context.onOpenChangeComplete?.(!1));
  });
  return (
    To({
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
var Mo,
  No = t(() => {
    ((Mo = e(r())), Mn(), T(), go(), Do());
  }),
  Po,
  Fo = t(() => {
    Po = class {
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
function Io() {
  return new fo({
    open: !1,
    floatingElement: null,
    referenceElement: null,
    triggerElements: new Po(),
    floatingId: ``,
    nested: !1,
    noEmit: !1,
    onOpenChange: void 0,
  });
}
var Lo = t(() => {
  (Ho(), po());
});
function Ro() {
  return {
    open: !1,
    openProp: void 0,
    mounted: !1,
    transitionStatus: `idle`,
    floatingRootContext: Io(),
    preventUnmountingOnClose: !1,
    payload: void 0,
    activeTriggerId: null,
    activeTriggerElement: null,
    triggerIdProp: void 0,
    popupElement: null,
    positionerElement: null,
    activeTriggerProps: Gt,
    inactiveTriggerProps: Gt,
    popupProps: Gt,
  };
}
var zo,
  Bo,
  Vo = t(() => {
    (lo(),
      Lo(),
      Zt(),
      (zo = R((e) => e.triggerIdProp ?? e.activeTriggerId)),
      (Bo = {
        open: R((e) => e.openProp ?? e.open),
        mounted: R((e) => e.mounted),
        transitionStatus: R((e) => e.transitionStatus),
        floatingRootContext: R((e) => e.floatingRootContext),
        preventUnmountingOnClose: R((e) => e.preventUnmountingOnClose),
        payload: R((e) => e.payload),
        activeTriggerId: zo,
        activeTriggerElement: R((e) => (e.mounted ? e.activeTriggerElement : null)),
        isTriggerActive: R((e, t) => t !== void 0 && zo(e) === t),
        isOpenedByTrigger: R((e, t) => t !== void 0 && zo(e) === t && e.open),
        isMountedByTrigger: R((e, t) => t !== void 0 && zo(e) === t && e.mounted),
        triggerProps: R((e, t) => (t ? e.activeTriggerProps : e.inactiveTriggerProps)),
        popupProps: R((e) => e.popupProps),
        popupElement: R((e) => e.popupElement),
        positionerElement: R((e) => e.positionerElement),
      }));
  }),
  Ho = t(() => {
    (No(), Fo(), Vo());
  });
function Uo(e) {
  let { open: t = !1, onOpenChange: n, elements: r = {} } = e,
    i = Gn(),
    a = Wr() != null,
    s = o(
      () =>
        new fo({
          open: t,
          onOpenChange: n,
          referenceElement: r.reference ?? null,
          floatingElement: r.floating ?? null,
          triggerElements: new Po(),
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
        (e.domReferenceElement = I(r.reference) ? r.reference : null)),
        r.floating !== void 0 && (e.floatingElement = r.floating),
        s.update(e));
    }, [t, i, r.reference, r.floating, s]),
    (s.context.onOpenChange = n),
    (s.context.nested = a),
    (s.context.noEmit = !1),
    s
  );
}
var Wo = t(() => {
  (ke(), Yn(), l(), T(), Kr(), po(), Ho());
});
function Go(e = {}) {
  let { nodeId: t, externalTree: n } = e,
    r = Uo(e),
    i = e.rootContext || r,
    a = {
      reference: i.useState(`referenceElement`),
      floating: i.useState(`floatingElement`),
      domReference: i.useState(`domReferenceElement`),
    },
    [o, s] = Ko.useState(null),
    c = Ko.useRef(null),
    l = Gr(n);
  w(() => {
    a.domReference && (c.current = a.domReference);
  }, [a.domReference]);
  let u = la({ ...e, elements: { ...a, ...(o && { reference: o }) } }),
    d = Ko.useCallback(
      (e) => {
        let t = I(e)
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
    [f, p] = Ko.useState(null),
    [m, h] = Ko.useState(null);
  (i.useSyncedValue(`referenceElement`, f),
    i.useSyncedValue(`domReferenceElement`, I(f) ? f : null),
    i.useSyncedValue(`floatingElement`, m));
  let g = Ko.useCallback(
      (e) => {
        ((I(e) || e === null) && ((c.current = e), p(e)),
          (I(u.refs.reference.current) ||
            u.refs.reference.current === null ||
            (e !== null && !I(e))) &&
            u.refs.setReference(e));
      },
      [u.refs, p],
    ),
    _ = Ko.useCallback(
      (e) => {
        (h(e), u.refs.setFloating(e));
      },
      [u.refs],
    ),
    v = Ko.useMemo(
      () => ({
        ...u.refs,
        setReference: g,
        setFloating: _,
        setPositionReference: d,
        domReference: c,
      }),
      [u.refs, g, _, d],
    ),
    y = Ko.useMemo(
      () => ({ ...u.elements, domReference: a.domReference }),
      [u.elements, a.domReference],
    ),
    b = i.useState(`open`),
    x = i.useState(`floatingId`),
    S = Ko.useMemo(
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
    Ko.useMemo(() => ({ ...u, context: S, refs: v, elements: y, rootStore: i }), [u, v, y, S, i])
  );
}
var Ko,
  qo = t(() => {
    ((Ko = e(r())), ba(), ke(), T(), Kr(), Wo());
  });
function Jo(e) {
  let { popupStore: t, noEmit: n = !1, treatPopupAsFloatingElement: r = !1, onOpenChange: i } = e,
    a = Gn(),
    s = Wr() != null,
    c = t.useState(`open`),
    l = t.useState(`activeTriggerElement`),
    u = t.useState(r ? `popupElement` : `positionerElement`),
    d = t.context.triggerElements,
    f = o(
      () =>
        new fo({
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
      (I(l) && (e.domReferenceElement = l),
        f.state.positionReference === f.state.referenceElement && (e.positionReference = l),
        f.update(e));
    }, [c, a, l, u, f]),
    (f.context.onOpenChange = i),
    (f.context.nested = s),
    (f.context.noEmit = n),
    f
  );
}
var Yo = t(() => {
  (Yn(), l(), T(), ke(), Kr(), po());
});
function Xo(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    { events: r, dataRef: i } = n.context,
    { enabled: a = !0, delay: o } = t,
    s = Zo.useRef(!1),
    c = Zo.useRef(null),
    l = re(),
    u = Zo.useRef(!0);
  (Zo.useEffect(() => {
    let e = n.select(`domReferenceElement`);
    if (!a) return;
    let t = F(e);
    function r() {
      let e = n.select(`domReferenceElement`);
      !n.select(`open`) && ue(e) && e === We(Ft(e)) && (s.current = !0);
    }
    function i() {
      u.current = !0;
    }
    function o() {
      u.current = !1;
    }
    return (
      t.addEventListener(`blur`, r),
      Qo && (t.addEventListener(`keydown`, i, !0), t.addEventListener(`pointerdown`, o, !0)),
      () => {
        (t.removeEventListener(`blur`, r),
          Qo &&
            (t.removeEventListener(`keydown`, i, !0), t.removeEventListener(`pointerdown`, o, !0)));
      }
    );
  }, [n, a]),
    Zo.useEffect(() => {
      if (!a) return;
      function e(e) {
        if (e.reason === `trigger-press` || e.reason === `escape-key`) {
          let e = n.select(`domReferenceElement`);
          I(e) && ((c.current = e), (s.current = !0));
        }
      }
      return (
        r.on(`openchange`, e),
        () => {
          r.off(`openchange`, e);
        }
      );
    }, [r, a, n]));
  let d = Zo.useMemo(
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
        let r = qe(e.nativeEvent);
        if (I(r)) {
          if (Qo && !e.relatedTarget) {
            if (!u.current && !Xe(r)) return;
          } else if (!Ze(r)) return;
        }
        let i = Ke(e.relatedTarget, n.context.triggerElements),
          { nativeEvent: a, currentTarget: d } = e,
          f = typeof o == `function` ? o() : o;
        if ((n.select(`open`) && i) || f === 0 || f === void 0) {
          n.setOpen(!0, ln(tn, a, d));
          return;
        }
        l.start(f, () => {
          s.current || n.setOpen(!0, ln(tn, a, d));
        });
      },
      onBlur(e) {
        ((s.current = !1), (c.current = null));
        let t = e.relatedTarget,
          r = e.nativeEvent,
          a =
            I(t) && t.hasAttribute(zn(`focus-guard`)) && t.getAttribute(`data-type`) === `outside`;
        l.start(0, () => {
          let e = n.select(`domReferenceElement`),
            o = We(e ? e.ownerDocument : document);
          (!t && o === e) ||
            Ge(i.current.floatingContext?.refs.floating.current, o) ||
            Ge(e, o) ||
            a ||
            Ke(t ?? o, n.context.triggerElements) ||
            n.setOpen(!1, ln(tn, r));
        });
      },
    }),
    [i, n, l, o],
  );
  return Zo.useMemo(() => (a ? { reference: d, trigger: d } : {}), [a, d]);
}
var Zo,
  Qo,
  $o = t(() => {
    ((Zo = e(r())), ke(), Be(), oe(), It(), Rt(), un(), cn(), Bn(), (Qo = Re && Le));
  });
function es(e) {
  return e ? !!e.closest(is) : !1;
}
function ts(e) {
  e.performedPointerEventsMutation &&
    (e.pointerEventsScopeElement?.style.removeProperty(`pointer-events`),
    e.pointerEventsReferenceElement?.style.removeProperty(`pointer-events`),
    e.pointerEventsFloatingElement?.style.removeProperty(`pointer-events`),
    (e.performedPointerEventsMutation = !1),
    (e.pointerEventsScopeElement = null),
    (e.pointerEventsReferenceElement = null),
    (e.pointerEventsFloatingElement = null));
}
function ns(e, t) {
  let { scopeElement: n, referenceElement: r, floatingElement: i } = t;
  (ts(e),
    (e.performedPointerEventsMutation = !0),
    (e.pointerEventsScopeElement = n),
    (e.pointerEventsReferenceElement = r),
    (e.pointerEventsFloatingElement = i),
    (n.style.pointerEvents = `none`),
    (r.style.pointerEvents = `auto`),
    (i.style.pointerEvents = `auto`));
}
function rs(e) {
  let t = o(as.create).current,
    n = e.context.dataRef.current;
  return (
    (n.hoverInteractionState ||= t),
    ee(n.hoverInteractionState.disposeEffect),
    n.hoverInteractionState
  );
}
var is,
  as,
  os = t(() => {
    (ne(),
      l(),
      oe(),
      Ue(),
      (is = `button,a,[role="button"],select,[tabindex]:not([tabindex="-1"]),${He}`),
      (as = class e {
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
            (this.openChangeTimeout = new ae()),
            (this.restTimeout = new ae()),
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
function ss(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    r = n.useState(`open`),
    i = n.useState(`floatingElement`),
    a = n.useState(`domReferenceElement`),
    { dataRef: o } = n.context,
    { enabled: s = !0, closeDelay: c = 0 } = t,
    l = rs(n),
    u = Gr(),
    d = Wr(),
    f = L(() => Ht(o.current.openEvent?.type, l.interactedInside)),
    p = L(() => {
      let e = o.current.openEvent?.type;
      return e?.includes(`mouse`) && e !== `mousedown`;
    }),
    m = L((e) => Ke(e, n.context.triggerElements)),
    h = cs.useCallback(
      (e) => {
        let t = Bt(c, `close`, l.pointerType),
          r = () => {
            (n.setOpen(!1, ln(en, e)), u?.events.emit(`floating.closed`, e));
          };
        t ? l.openChangeTimeout.start(t, r) : (l.openChangeTimeout.clear(), r());
      },
      [c, n, l, u],
    ),
    g = L(() => {
      ts(l);
    }),
    _ = L((e) => {
      let t = qe(e);
      if (!es(t)) {
        l.interactedInside = !1;
        return;
      }
      l.interactedInside = t?.closest(`[aria-haspopup]`) != null;
    });
  (w(() => {
    r || ((l.pointerType = void 0), (l.restTimeoutPending = !1), (l.interactedInside = !1), g());
  }, [r, l, g]),
    cs.useEffect(() => g, [g]),
    w(() => {
      if (s && r && l.handleCloseOptions?.blockPointerEvents && p() && I(a) && i) {
        let e = a,
          t = i,
          n = Ft(i),
          r = u?.nodesRef.current.find((e) => e.id === d)?.context?.elements.floating;
        return (
          r && (r.style.pointerEvents = ``),
          ns(l, {
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
  let v = re();
  cs.useEffect(() => {
    if (!s) return;
    function e() {
      (l.openChangeTimeout.clear(), v.clear(), u?.events.off(`floating.closed`, r), g());
    }
    function t(e) {
      if (u && d && $e(u.nodesRef.current, d).length > 0) {
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
        $e(u.nodesRef.current, d).length > 0 ||
        v.start(0, () => {
          (u.events.off(`floating.closed`, r),
            n.setOpen(!1, ln(en, e)),
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
var cs,
  ls = t(() => {
    ((cs = e(r())), ke(), Mn(), T(), oe(), It(), Rt(), un(), cn(), Kr(), os(), Ut());
  });
function us(e, t = {}) {
  let n = `rootStore` in e ? e.rootStore : e,
    { dataRef: r, events: i } = n.context,
    {
      enabled: a = !0,
      delay: o = 0,
      handleClose: s = null,
      mouseOnly: c = !1,
      restMs: l = 0,
      move: u = !0,
      triggerElementRef: d = ps,
      externalTree: f,
      isActiveTrigger: p = !0,
      getHandleCloseContext: m,
    } = t,
    h = Gr(f),
    g = rs(n),
    _ = wn(s),
    v = wn(o),
    y = wn(l),
    b = wn(a);
  p && (g.handleCloseOptions = _.current?.__options);
  let x = L(() => Ht(r.current.openEvent?.type, g.interactedInside)),
    S = L((e) => Ke(e, n.context.triggerElements)),
    C = L((e, t, r) => {
      let i = n.context.triggerElements;
      if (i.hasElement(t)) return !e || !Ge(e, t);
      if (!I(r)) return !1;
      let a = r;
      return i.hasMatchingElement((e) => Ge(e, a)) && (!e || !Ge(e, a));
    }),
    w = ds.useCallback(
      (e, t = !0) => {
        let r = Bt(v.current, `close`, g.pointerType);
        r
          ? g.openChangeTimeout.start(r, () => {
              (n.setOpen(!1, ln(en, e)), h?.events.emit(`floating.closed`, e));
            })
          : t &&
            (g.openChangeTimeout.clear(),
            n.setOpen(!1, ln(en, e)),
            h?.events.emit(`floating.closed`, e));
      },
      [v, n, g, h],
    ),
    T = L(() => {
      g.handler &&=
        (Ft(n.select(`domReferenceElement`)).removeEventListener(`mousemove`, g.handler), void 0);
    });
  ds.useEffect(() => T, [T]);
  let E = L(() => {
    ts(g);
  });
  return (
    ds.useEffect(() => {
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
    ds.useEffect(() => {
      if (!a) return;
      let e = d.current ?? (p ? n.select(`domReferenceElement`) : null);
      if (!I(e)) return;
      function t(e) {
        if (
          (g.openChangeTimeout.clear(),
          (g.blockMouseMove = !1),
          (c && !nt(g.pointerType)) || (Vt(y.current) > 0 && !Bt(v.current, `open`)))
        )
          return;
        let t = Bt(v.current, `open`, g.pointerType),
          r = e.currentTarget ?? null,
          i = n.select(`domReferenceElement`),
          a = r == null ? !1 : C(i, r, e.target),
          o = n.select(`open`),
          s = !o || a;
        a && o
          ? n.setOpen(!0, ln(en, e, r))
          : t
            ? g.openChangeTimeout.start(t, () => {
                s && n.setOpen(!0, ln(en, e, r));
              })
            : s && n.setOpen(!0, ln(en, e, r));
      }
      function i(e) {
        if (x()) {
          E();
          return;
        }
        T();
        let t = Ft(n.select(`domReferenceElement`));
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
          (g.pointerType !== `touch` || !Ge(n.select(`floatingElement`), e.relatedTarget)) && w(e);
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
    ds.useMemo(() => {
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
          if (c && !nt(g.pointerType)) return;
          let s = Vt(y.current);
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
            !g.blockMouseMove && (!e || o) && n.setOpen(!0, ln(en, t, r));
          }
          g.pointerType === `touch`
            ? fs.flushSync(() => {
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
var ds,
  fs,
  ps,
  ms = t(() => {
    ((ds = e(r())),
      (fs = e(a())),
      ke(),
      En(),
      Mn(),
      It(),
      Rt(),
      un(),
      cn(),
      Kr(),
      os(),
      Ut(),
      (ps = { current: null }));
  });
function hs(e = []) {
  let t = e.map((e) => e?.reference),
    n = e.map((e) => e?.floating),
    r = e.map((e) => e?.item),
    i = e.map((e) => e?.trigger),
    a = vs.useCallback((t) => gs(t, e, `reference`), t),
    o = vs.useCallback((t) => gs(t, e, `floating`), n),
    s = vs.useCallback((t) => gs(t, e, `item`), r),
    c = vs.useCallback((t) => gs(t, e, `trigger`), i);
  return vs.useMemo(
    () => ({ getReferenceProps: a, getFloatingProps: o, getItemProps: s, getTriggerProps: c }),
    [a, o, s, c],
  );
}
function gs(e, t, n) {
  let r = new Map(),
    i = n === `item`,
    a = {};
  n === `floating` && ((a.tabIndex = -1), (a[Ve] = ``));
  for (let t in e) (i && e && (t === `active` || t === `selected`)) || (a[t] = e[t]);
  for (let o = 0; o < t.length; o += 1) {
    let s,
      c = t[o]?.[n];
    ((s = typeof c == `function` ? (e ? c(e) : null) : c), s && _s(a, s, i, r));
  }
  return (_s(a, e, i, r), a);
}
function _s(e, t, n, r) {
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
var vs,
  ys = t(() => {
    ((vs = e(r())), Ue());
  });
function bs(e, t, n, r, i, a) {
  return r >= t != a >= t && e <= ((i - n) * (t - r)) / (a - r) + n;
}
function xs(e, t, n, r, i, a, o, s, c, l) {
  let u = !1;
  return (
    bs(e, t, n, r, i, a) && (u = !u),
    bs(e, t, i, a, o, s) && (u = !u),
    bs(e, t, o, s, c, l) && (u = !u),
    bs(e, t, c, l, n, r) && (u = !u),
    u
  );
}
function Ss(e, t, n) {
  return e >= n.x && e <= n.x + n.width && t >= n.y && t <= n.y + n.height;
}
function Cs(e, t, n, r, i, a) {
  return e >= Math.min(n, i) && e <= Math.max(n, i) && t >= Math.min(r, a) && t <= Math.max(r, a);
}
function ws(e = {}) {
  let { blockPointerEvents: t = !1 } = e,
    n = new ae(),
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
          s = r * r * Es;
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
          h = qe(r),
          g = r.type === `mouseleave`,
          _ = Ge(u, h),
          v = Ge(a, h);
        if (_ && ((l = !0), !g)) return;
        if (v && ((l = !1), !g)) {
          l = !0;
          return;
        }
        if (g && I(r.relatedTarget) && Ge(u, r.relatedTarget)) return;
        function y() {
          return !!(s && $e(s.nodesRef.current, o).length > 0);
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
          O = (T ? x : S).right,
          k = (E ? x : S).top,
          A = (E ? x : S).bottom;
        if (
          (c === `top` && t >= x.bottom - 1) ||
          (c === `bottom` && t <= x.top + 1) ||
          (c === `left` && e >= x.right - 1) ||
          (c === `right` && e <= x.left + 1)
        ) {
          b();
          return;
        }
        let j = !1;
        switch (c) {
          case `top`:
            j = Cs(d, f, D, x.top + 1, O, S.bottom - 1);
            break;
          case `bottom`:
            j = Cs(d, f, D, S.top + 1, O, x.bottom - 1);
            break;
          case `left`:
            j = Cs(d, f, S.right - 1, A, x.left + 1, k);
            break;
          case `right`:
            j = Cs(d, f, x.right - 1, A, S.left + 1, k);
            break;
          default:
        }
        if (j) return;
        if (l && !Ss(d, f, x)) {
          b();
          return;
        }
        if (!g && p(d, f)) {
          b();
          return;
        }
        let M = !1;
        switch (c) {
          case `top`: {
            let n = T ? z / 2 : z * 4,
              r = T || C ? e + n : e - n,
              i = T ? e - n : C ? e + n : e - n,
              a = t + z + 1,
              o = C || T ? S.bottom - z : S.top,
              s = C ? (T ? S.bottom - z : S.top) : S.bottom - z;
            M = xs(d, f, r, a, i, a, S.left, o, S.right, s);
            break;
          }
          case `bottom`: {
            let n = T ? z / 2 : z * 4,
              r = T || C ? e + n : e - n,
              i = T ? e - n : C ? e + n : e - n,
              a = t - z,
              o = C || T ? S.top + z : S.bottom,
              s = C ? (T ? S.top + z : S.bottom) : S.top + z;
            M = xs(d, f, r, a, i, a, S.left, o, S.right, s);
            break;
          }
          case `left`: {
            let n = E ? z / 2 : z * 4,
              r = E || w ? t + n : t - n,
              i = E ? t - n : w ? t + n : t - n,
              a = e + z + 1,
              o = w || E ? S.right - z : S.left,
              s = w ? (E ? S.right - z : S.left) : S.right - z;
            M = xs(d, f, o, S.top, s, S.bottom, a, r, a, i);
            break;
          }
          case `right`: {
            let n = E ? z / 2 : z * 4,
              r = E || w ? t + n : t - n,
              i = E ? t - n : w ? t + n : t - n,
              a = e - z,
              o = w || E ? S.left + z : S.right,
              s = w ? (E ? S.left + z : S.right) : S.left + z;
            M = xs(d, f, a, r, a, i, o, S.top, s, S.bottom);
            break;
          }
          default:
        }
        M ? l || n.start(40, b) : b();
      };
    };
  return ((r.__options = { blockPointerEvents: t }), r);
}
var Ts,
  Es,
  z,
  Ds = t(() => {
    (ke(), oe(), Qe(), et(), (Ts = 0.1), (Es = Ts * Ts), (z = 0.5));
  }),
  Os = t(() => {
    (gn(), Rr(), $r(), ai(), qo(), Yo(), $o(), ls(), ms(), ys(), Ds(), ba());
  });
function ks() {
  return {
    ...Ro(),
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
var As,
  js,
  Ms,
  Ns,
  Ps = t(() => {
    ((As = e(r())),
      (js = e(a())),
      lo(),
      l(),
      Os(),
      cn(),
      Ho(),
      (Ms = {
        ...Bo,
        disabled: R((e) => e.disabled),
        instantType: R((e) => e.instantType),
        isInstantPhase: R((e) => e.isInstantPhase),
        trackCursorAxis: R((e) => e.trackCursorAxis),
        disableHoverablePopup: R((e) => e.disableHoverablePopup),
        lastOpenChangeReason: R((e) => e.openChangeReason),
        closeOnClick: R((e) => e.closeOnClick),
        closeDelay: R((e) => e.closeDelay),
        hasViewport: R((e) => e.hasViewport),
      }),
      (Ns = class e extends oo {
        constructor(e) {
          super(
            { ...ks(), ...e },
            {
              popupRef: As.createRef(),
              onOpenChange: void 0,
              onOpenChangeComplete: void 0,
              triggerElements: new Po(),
            },
            Ms,
          );
        }
        setOpen = (e, t) => {
          let n = t.reason,
            r = n === en,
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
          r ? js.flushSync(o) : o();
        };
        static useStore(t, n) {
          let r = o(() => new e(n)).current,
            i = t ?? r,
            a = Jo({ popupStore: i, onOpenChange: i.setOpen });
          return ((i.state.floatingRootContext = a), i);
        }
      }));
  });
function Fs(e, t) {
  let n = ln(t);
  return (
    (n.preventUnmountOnClose = () => {
      e.set(`preventUnmountingOnClose`, !0);
    }),
    n
  );
}
var Is,
  Ls,
  Rs,
  zs = t(() => {
    ((Is = e(r())),
      v(),
      x(),
      T(),
      M(),
      Os(),
      un(),
      Ho(),
      Ps(),
      cn(),
      (Ls = i()),
      (Rs = f(function (e) {
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
          p = Ns.useStore(l?.store, { open: n, openProp: r, activeTriggerId: d, triggerIdProp: u });
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
            m && t && p.setOpen(!1, ln(an));
          }, [m, t, p]),
          p.useSyncedValue(`disabled`, t),
          Ao(p));
        let { forceUnmount: v, transitionStatus: b } = jo(h, p),
          x = p.useState(`isInstantPhase`),
          S = p.useState(`instantType`),
          C = p.useState(`lastOpenChangeReason`),
          T = Is.useRef(null);
        (w(() => {
          (b === `ending` && C === `none`) || (b !== `ending` && x)
            ? (S !== `delay` && (T.current = S), p.set(`instantType`, `delay`))
            : T.current !== null && (p.set(`instantType`, T.current), (T.current = null));
        }, [b, x, C, S, p]),
          w(() => {
            h && (g ?? p.set(`payload`, void 0));
          }, [p, g, h]));
        let E = Is.useCallback(() => {
          p.setOpen(!1, Fs(p, on));
        }, [p]);
        Is.useImperativeHandle(o, () => ({ unmount: v, close: E }), [v, E]);
        let D = p.useState(`floatingRootContext`),
          {
            getReferenceProps: O,
            getFloatingProps: k,
            getTriggerProps: A,
          } = hs([
            ni(D, { enabled: !t, referencePress: () => p.select(`closeOnClick`) }),
            Zr(D, { enabled: !t && a !== `none`, axis: a === `none` ? void 0 : a }),
          ]),
          M = Is.useMemo(() => O(), [O]),
          ee = Is.useMemo(() => A(), [A]),
          N = Is.useMemo(() => k(), [k]);
        return (
          p.useSyncedValues({ activeTriggerProps: M, inactiveTriggerProps: ee, popupProps: N }),
          (0, Ls.jsx)(j.Provider, {
            value: p,
            children: typeof f == `function` ? f({ payload: _ }) : f,
          })
        );
      })));
  }),
  Bs,
  Vs,
  Hs,
  Us,
  Ws,
  Gs,
  Ks,
  qs,
  Js = t(() => {
    (xo(),
      (Bs = (function (e) {
        return (
          (e.open = `data-open`),
          (e.closed = `data-closed`),
          (e[(e.startingStyle = _o.startingStyle)] = `startingStyle`),
          (e[(e.endingStyle = _o.endingStyle)] = `endingStyle`),
          (e.anchorHidden = `data-anchor-hidden`),
          (e.side = `data-side`),
          (e.align = `data-align`),
          e
        );
      })({})),
      (Vs = (function (e) {
        return ((e.popupOpen = `data-popup-open`), (e.pressed = `data-pressed`), e);
      })({})),
      (Hs = { [Vs.popupOpen]: `` }),
      Vs.popupOpen,
      Vs.pressed,
      (Us = { [Bs.open]: `` }),
      (Ws = { [Bs.closed]: `` }),
      (Gs = { [Bs.anchorHidden]: `` }),
      (Ks = {
        open(e) {
          return e ? Hs : null;
        },
      }),
      (qs = {
        open(e) {
          return e ? Us : Ws;
        },
        anchorHidden(e) {
          return e ? Gs : null;
        },
      }));
  });
function Ys(e) {
  return Gn(e, `base-ui`);
}
var Xs = t(() => {
  Yn();
});
function Zs() {
  return Qs.useContext($s);
}
var Qs,
  $s,
  ec = t(() => {
    ((Qs = e(r())), ($s = Qs.createContext(void 0)));
  }),
  tc,
  nc = t(() => {
    (Js(),
      (tc = (function (e) {
        return (
          (e[(e.popupOpen = Vs.popupOpen)] = `popupOpen`),
          (e.triggerDisabled = `data-trigger-disabled`),
          e
        );
      })({})));
  }),
  rc = t(() => {}),
  ic,
  ac,
  oc = t(() => {
    (O(),
      (ic = e(r())),
      v(),
      M(),
      Js(),
      jr(),
      Ho(),
      Xs(),
      ec(),
      Os(),
      nc(),
      rc(),
      (ac = p(function (e, t) {
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
          f = k(!0),
          p = i?.store ?? f;
        if (!p) throw Error(D(82));
        let m = Ys(u),
          h = p.useState(`isTriggerActive`, m),
          g = p.useState(`isOpenedByTrigger`, m),
          _ = p.useState(`floatingRootContext`),
          v = ic.useRef(null),
          y = s ?? 600,
          b = l ?? 0,
          { registerTrigger: x, isMountedByThisTrigger: S } = ko(m, v, p, {
            payload: a,
            closeOnClick: c,
            closeDelay: b,
          }),
          C = Zs(),
          { delayRef: w, isInstantPhase: T, hasProvider: E } = fn(_, { open: g });
        p.useSyncedValue(`isInstantPhase`, T);
        let O = p.useState(`disabled`),
          A = o ?? O,
          j = p.useState(`trackCursorAxis`),
          M = p.useState(`disableHoverablePopup`),
          ee = us(_, {
            enabled: !A,
            mouseOnly: !0,
            move: !1,
            handleClose: !M && j !== `both` ? ws() : null,
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
          N = Xo(_, { enabled: !A }).reference,
          te = { open: g },
          ne = p.useState(`triggerProps`, S);
        return wr(`button`, e, {
          state: te,
          ref: [t, x, v],
          props: [
            ee,
            N,
            ne,
            {
              onPointerDown() {
                p.set(`closeOnClick`, c);
              },
              id: m,
              [tc.triggerDisabled]: A ? `` : void 0,
            },
            d,
          ],
          stateAttributesMapping: Ks,
        });
      })));
  });
function sc() {
  let e = cc.useContext(lc);
  if (e === void 0) throw Error(D(70));
  return e;
}
var cc,
  lc,
  uc = t(() => {
    (O(), (cc = e(r())), (lc = cc.createContext(void 0)));
  }),
  dc,
  fc,
  pc,
  mc,
  hc = t(() => {
    ((dc = e(r())),
      (fc = e(a())),
      Os(),
      (pc = i()),
      (mc = dc.forwardRef(function (e, t) {
        let { children: n, container: r, className: i, render: a, ...o } = e,
          { portalNode: s, portalSubtree: c } = Mr({
            container: r,
            ref: t,
            componentProps: e,
            elementProps: o,
          });
        return !c && !s
          ? null
          : (0, pc.jsxs)(dc.Fragment, { children: [c, s && fc.createPortal(n, s)] });
      })));
  }),
  gc,
  _c,
  vc,
  yc = t(() => {
    ((gc = e(r())),
      M(),
      uc(),
      hc(),
      (_c = i()),
      (vc = gc.forwardRef(function (e, t) {
        let { keepMounted: n = !1, ...r } = e;
        return k().useState(`mounted`) || n
          ? (0, _c.jsx)(lc.Provider, { value: n, children: (0, _c.jsx)(mc, { ref: t, ...r }) })
          : null;
      })));
  });
function bc() {
  let e = xc.useContext(Sc);
  if (e === void 0) throw Error(D(71));
  return e;
}
var xc,
  Sc,
  Cc = t(() => {
    (O(), (xc = e(r())), (Sc = xc.createContext(void 0)));
  });
function wc() {
  return Tc.useContext(Ec)?.direction ?? `ltr`;
}
var Tc,
  Ec,
  Dc = t(() => {
    ((Tc = e(r())), (Ec = Tc.createContext(void 0)));
  }),
  Oc,
  kc,
  Ac = t(() => {
    (Nt(),
      (Oc = (e) => ({
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
            { element: l, padding: u = 0, offsetParent: d = `real` } = ot(e, t) || {};
          if (l == null) return {};
          let f = bt(u),
            p = { x: n, y: r },
            m = ft(i),
            h = ut(m),
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
            O = Math.min(f[y], E),
            k = D,
            A = w - g[h] - O,
            j = w / 2 - g[h] / 2 + T,
            M = at(k, j, A),
            ee =
              !c.arrow &&
              ct(i) != null &&
              j !== M &&
              a.reference[h] / 2 - (j < k ? D : O) - g[h] / 2 < 0,
            N = ee ? (j < k ? j - k : j - A) : 0;
          return {
            [m]: p[m] + N,
            data: { [m]: M, centerOffset: j - M - N, ...(ee && { alignmentOffset: N }) },
            reset: ee,
          };
        },
      })),
      (kc = (e, t) => ({ ...Oc(e), options: [e, t] })));
  }),
  jc,
  Mc = t(() => {
    (ba(),
      (jc = {
        name: `hide`,
        async fn(e) {
          let { width: t, height: n, x: r, y: i } = e.rects.reference,
            a = t === 0 && n === 0 && r === 0 && i === 0;
          return { data: { referenceHidden: (await ya().fn(e)).data?.referenceHidden || a } };
        },
      }));
  }),
  Nc,
  Pc,
  Fc = t(() => {
    (It(),
      Nt(),
      (Nc = { sideX: `left`, sideY: `top` }),
      (Pc = {
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
            c = F(i),
            l = c.getComputedStyle(i);
          if (!(l.transitionDuration !== `0s` && l.transitionDuration !== ``))
            return { x: t, y: n, data: Nc };
          let u = await a.getOffsetParent?.(i),
            d = { width: 0, height: 0 };
          if (o === `fixed` && c?.visualViewport)
            d = { width: c.visualViewport.width, height: c.visualViewport.height };
          else if (u === c) {
            let e = Ft(i);
            d = { width: e.documentElement.clientWidth, height: e.documentElement.clientHeight };
          } else (await a.isElement?.(u)) && (d = await a.getDimensions(u));
          let f = st(s),
            p = t,
            m = n;
          (f === `left` && (p = d.width - (t + r.width)),
            f === `top` && (m = d.height - (n + r.height)));
          let h = f === `left` ? `right` : Nc.sideX,
            g = f === `top` ? `bottom` : Nc.sideY;
          return { x: p, y: m, data: { sideX: h, sideY: g } };
        },
      }));
  });
function Ic(e, t, n) {
  let r = e === `inline-start` || e === `inline-end`;
  return {
    top: `top`,
    right: r ? (n ? `inline-start` : `inline-end`) : `right`,
    bottom: `bottom`,
    left: r ? (n ? `inline-end` : `inline-start`) : `left`,
  }[t];
}
function Lc(e, t, n) {
  let { rects: r, placement: i } = e;
  return {
    side: Ic(t, st(i), n),
    align: ct(i) || `center`,
    anchor: { width: r.reference.width, height: r.reference.height },
    positioner: { width: r.floating.width, height: r.floating.height },
  };
}
function Rc(e) {
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
    [x, S] = Bc.useState(null);
  !m && x !== null && S(null);
  let C = h.side || `flip`,
    T = h.align || `flip`,
    E = h.fallbackAxisSide || `end`,
    D = typeof t == `function` ? t : void 0,
    O = L(D),
    k = D ? O : t,
    A = wn(t),
    j = wc() === `rtl`,
    M =
      x ||
      {
        top: `top`,
        right: `right`,
        bottom: `bottom`,
        left: `left`,
        "inline-end": j ? `left` : `right`,
        "inline-start": j ? `right` : `left`,
      }[r],
    ee = a === `center` ? M : `${M}-${a}`,
    N = c,
    te = r === `bottom` ? 1 : 0,
    ne = r === `top` ? 1 : 0,
    re = r === `right` ? 1 : 0,
    ie = r === `left` ? 1 : 0;
  typeof N == `number`
    ? (N = { top: N + te, right: N + ie, bottom: N + ne, left: N + re })
    : (N &&= {
        top: (N.top || 0) + te,
        right: (N.right || 0) + ie,
        bottom: (N.bottom || 0) + ne,
        left: (N.left || 0) + re,
      });
  let ae = { boundary: s === `clipping-ancestors` ? `clippingAncestors` : s, padding: N },
    oe = Bc.useRef(null),
    P = wn(i),
    se = wn(o),
    F = [
      ma(
        (e) => {
          let t = Lc(e, r, j),
            n = typeof P.current == `function` ? P.current(t) : P.current,
            i = typeof se.current == `function` ? se.current(t) : se.current;
          return { mainAxis: n, crossAxis: i, alignmentAxis: i };
        },
        [typeof i == `function` ? 0 : i, typeof o == `function` ? 0 : o, j, r],
      ),
    ],
    ce = T === `none` && C !== `shift`,
    le = !ce && (l || g || C === `shift`),
    I =
      C === `none`
        ? null
        : _a({
            ...ae,
            padding: { top: N.top + 1, right: N.right + 1, bottom: N.bottom + 1, left: N.left + 1 },
            mainAxis: !g && C === `flip`,
            crossAxis: T === `flip` ? `alignment` : !1,
            fallbackAxisSideDirection: E,
          }),
    ue = ce
      ? null
      : ha(
          (e) => {
            let t = Ft(e.elements.floating).documentElement;
            return {
              ...ae,
              rootBoundary: g
                ? { x: 0, y: 0, width: t.clientWidth, height: t.clientHeight }
                : void 0,
              mainAxis: T !== `none`,
              crossAxis: le,
              limiter:
                l || g
                  ? void 0
                  : ga((e) => {
                      if (!oe.current) return {};
                      let { width: t, height: n } = oe.current.getBoundingClientRect(),
                        r = dt(st(e.placement)),
                        i = r === `y` ? t : n,
                        a = r === `y` ? N.left + N.right : N.top + N.bottom;
                      return { offset: i / 2 + a / 2 };
                    }),
            };
          },
          [ae, l, g, N, T],
        );
  (C === `shift` || T === `shift` || a === `center` ? F.push(ue, I) : F.push(I, ue),
    F.push(
      va({
        ...ae,
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
      kc(
        () => ({
          element: oe.current || document.createElement(`div`),
          padding: u,
          offsetParent: `floating`,
        }),
        [u],
      ),
      {
        name: `transformOrigin`,
        fn(e) {
          let { elements: t, middlewareData: n, placement: a, rects: o, y: s } = e,
            c = st(a),
            l = dt(c),
            u = oe.current,
            d = n.arrow?.x || 0,
            f = n.arrow?.y || 0,
            p = u?.clientWidth || 0,
            m = u?.clientHeight || 0,
            h = d + p / 2,
            g = f + m / 2,
            _ = Math.abs(n.shift?.y || 0),
            v = o.reference.height / 2,
            y = typeof i == `function` ? i(Lc(e, r, j)) : i,
            b = _ > y,
            x = {
              top: `${h}px calc(100% + ${y}px)`,
              bottom: `${h}px ${-y}px`,
              left: `calc(100% + ${y}px) ${g}px`,
              right: `${-y}px ${g}px`,
            }[c],
            S = `${h}px ${o.reference.y + v - s}px`;
          return (
            t.floating.style.setProperty(`--transform-origin`, le && l === `y` && b ? S : x), {}
          );
        },
      },
      jc,
      v,
    ),
    w(() => {
      !m &&
        p &&
        p.update({ referenceElement: null, floatingElement: null, domReferenceElement: null });
    }, [m, p]));
  let de = Bc.useMemo(
      () => ({
        elementResize: !d && typeof ResizeObserver < `u`,
        layoutShift: !d && typeof IntersectionObserver < `u`,
      }),
      [d],
    ),
    {
      refs: fe,
      elements: pe,
      x: me,
      y: he,
      middlewareData: ge,
      update: _e,
      placement: ve,
      context: ye,
      isPositioned: be,
      floatingStyles: xe,
    } = Go({
      rootContext: p,
      placement: ee,
      middleware: F,
      strategy: n,
      whileElementsMounted: f ? void 0 : (...e) => Ki(...e, de),
      nodeId: _,
      externalTree: b,
    }),
    { sideX: Se, sideY: Ce } = ge.adaptiveOrigin || Nc,
    we = be ? n : `fixed`,
    Te = Bc.useMemo(() => {
      let e = v ? { position: we, [Se]: me, [Ce]: he } : { position: we, ...xe };
      return (be || (e.opacity = 0), e);
    }, [v, we, Se, me, Ce, he, xe, be]),
    Ee = Bc.useRef(null);
  (w(() => {
    if (!m) return;
    let e = A.current,
      t = typeof e == `function` ? e() : e,
      n = (zc(t) ? t.current : t) || null;
    n !== Ee.current && (fe.setPositionReference(n), (Ee.current = n));
  }, [m, fe, k, A]),
    Bc.useEffect(() => {
      if (!m) return;
      let e = A.current;
      typeof e != `function` &&
        zc(e) &&
        e.current !== Ee.current &&
        (fe.setPositionReference(e.current), (Ee.current = e.current));
    }, [m, fe, k, A]),
    Bc.useEffect(() => {
      if (f && m && pe.domReference && pe.floating) return Ki(pe.domReference, pe.floating, _e, de);
    }, [f, m, pe, _e, de]));
  let De = st(ve),
    Oe = Ic(r, De, j),
    ke = ct(ve) || `center`,
    Ae = !!ge.hide?.referenceHidden;
  w(() => {
    y && m && be && S(De);
  }, [y, m, be, De]);
  let je = Bc.useMemo(
      () => ({ position: `absolute`, top: ge.arrow?.y, left: ge.arrow?.x }),
      [ge.arrow],
    ),
    Me = ge.arrow?.centerOffset !== 0;
  return Bc.useMemo(
    () => ({
      positionerStyles: Te,
      arrowStyles: je,
      arrowRef: oe,
      arrowUncentered: Me,
      side: Oe,
      align: ke,
      physicalSide: De,
      anchorHidden: Ae,
      refs: fe,
      context: ye,
      isPositioned: be,
      update: _e,
    }),
    [Te, je, oe, Me, Oe, ke, De, Ae, fe, ye, be, _e],
  );
}
function zc(e) {
  return e != null && `current` in e;
}
var Bc,
  Vc = t(() => {
    ((Bc = e(r())), Nt(), It(), T(), En(), Mn(), Os(), Dc(), Ac(), Mc(), Fc());
  });
function Hc(e) {
  return e === `starting` ? qt : Gt;
}
var Uc = t(() => {
    Zt();
  }),
  Wc,
  Gc,
  Kc,
  qc = t(() => {
    ((Wc = e(r())),
      M(),
      Cc(),
      Vc(),
      Js(),
      uc(),
      jr(),
      Zt(),
      Fc(),
      Uc(),
      (Gc = i()),
      (Kc = Wc.forwardRef(function (e, t) {
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
            collisionAvoidance: h = Xt,
            ...g
          } = e,
          _ = k(),
          v = sc(),
          y = _.useState(`open`),
          b = _.useState(`mounted`),
          x = _.useState(`trackCursorAxis`),
          S = _.useState(`disableHoverablePopup`),
          C = _.useState(`floatingRootContext`),
          w = _.useState(`instantType`),
          T = _.useState(`transitionStatus`),
          E = Rc({
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
            adaptiveOrigin: _.useState(`hasViewport`) ? Pc : void 0,
          }),
          D = Wc.useMemo(() => {
            let e = {};
            return (
              (!y || x === `both` || S) && (e.pointerEvents = `none`),
              { role: `presentation`, hidden: !b, style: { ...E.positionerStyles, ...e } }
            );
          }, [y, x, S, b, E.positionerStyles]),
          O = Wc.useMemo(
            () => ({
              open: y,
              side: E.side,
              align: E.align,
              anchorHidden: E.anchorHidden,
              instant: x === `none` ? w : `tracking-cursor`,
            }),
            [y, E.side, E.align, E.anchorHidden, x, w],
          ),
          A = Wc.useMemo(
            () => ({
              ...O,
              arrowRef: E.arrowRef,
              arrowStyles: E.arrowStyles,
              arrowUncentered: E.arrowUncentered,
            }),
            [O, E.arrowRef, E.arrowStyles, E.arrowUncentered],
          ),
          j = wr(`div`, e, {
            state: O,
            props: [D, Hc(T), g],
            ref: [t, _.useStateSetter(`positionerElement`)],
            stateAttributesMapping: qs,
          });
        return (0, Gc.jsx)(Sc.Provider, { value: A, children: j });
      })));
  }),
  Jc,
  Yc,
  Xc,
  Zc = t(() => {
    ((Jc = e(r())),
      M(),
      Cc(),
      Js(),
      xo(),
      Do(),
      jr(),
      Uc(),
      Os(),
      (Yc = { ...qs, ...bo }),
      (Xc = Jc.forwardRef(function (e, t) {
        let { className: n, render: r, ...i } = e,
          a = k(),
          { side: o, align: s } = bc(),
          c = a.useState(`open`),
          l = a.useState(`instantType`),
          u = a.useState(`transitionStatus`),
          d = a.useState(`popupProps`),
          f = a.useState(`floatingRootContext`);
        To({
          open: c,
          ref: a.context.popupRef,
          onComplete() {
            c && a.context.onOpenChangeComplete?.(!0);
          },
        });
        let p = a.useState(`disabled`),
          m = a.useState(`closeDelay`);
        return (
          ss(f, { enabled: !p, closeDelay: m }),
          wr(`div`, e, {
            state: { open: c, side: o, align: s, instant: l, transitionStatus: u },
            ref: [t, a.context.popupRef, a.useStateSetter(`popupElement`)],
            props: [d, Hc(u), i],
            stateAttributesMapping: Yc,
          })
        );
      })));
  }),
  Qc,
  $c,
  el,
  tl = t(() => {
    ((Qc = e(r())),
      Os(),
      ec(),
      ($c = i()),
      (el = function (e) {
        let { delay: t, closeDelay: n, timeout: r = 400 } = e,
          i = Qc.useMemo(() => ({ delay: t, closeDelay: n }), [t, n]),
          a = Qc.useMemo(() => ({ open: t, close: n }), [t, n]);
        return (0, $c.jsx)($s.Provider, {
          value: i,
          children: (0, $c.jsx)(dn, { delay: a, timeoutMs: r, children: e.children }),
        });
      }));
  }),
  nl = t(() => {
    (zs(), oc(), yc(), qc(), Zc(), tl());
  }),
  rl = t(() => {
    nl();
  });
function il() {
  if (Sl > 1) Sl--;
  else {
    var e,
      t = !1;
    for (
      (function () {
        var e = El;
        for (El = void 0; e !== void 0; ) (e.S.v === e.v && (e.S.i = e.i), (e = e.o));
      })();
      xl !== void 0;
    ) {
      var n = xl;
      for (xl = void 0, Cl++; n !== void 0; ) {
        var r = n.u;
        if (((n.u = void 0), (n.f &= -3), !(8 & n.f) && ll(n)))
          try {
            n.c();
          } catch (n) {
            t ||= ((e = n), !0);
          }
        n = r;
      }
    }
    if (((Cl = 0), Sl--, t)) throw e;
  }
}
function al(e) {
  if (Sl > 0) return e();
  ((Tl = ++wl), Sl++);
  try {
    return e();
  } finally {
    il();
  }
}
function B(e) {
  var t = V;
  V = void 0;
  try {
    return e();
  } finally {
    V = t;
  }
}
function ol(e) {
  if (V !== void 0) {
    var t = e.n;
    if (t === void 0 || t.t !== V)
      return (
        (t = { i: 0, S: e, p: V.s, n: void 0, t: V, e: void 0, x: void 0, r: t }),
        V.s !== void 0 && (V.s.n = t),
        (V.s = t),
        (e.n = t),
        32 & V.f && e.S(t),
        t
      );
    if (t.i === -1)
      return (
        (t.i = 0),
        t.n !== void 0 &&
          ((t.n.p = t.p),
          t.p !== void 0 && (t.p.n = t.n),
          (t.p = V.s),
          (t.n = void 0),
          (V.s.n = t),
          (V.s = t)),
        t
      );
  }
}
function sl(e, t) {
  ((this.v = e),
    (this.i = 0),
    (this.n = void 0),
    (this.t = void 0),
    (this.l = 0),
    (this.W = t?.watched),
    (this.Z = t?.unwatched),
    (this.name = t?.name));
}
function cl(e, t) {
  return new sl(e, t);
}
function ll(e) {
  for (var t = e.s; t !== void 0; t = t.n)
    if (t.S.i !== t.i || !t.S.h() || t.S.i !== t.i) return !0;
  return !1;
}
function ul(e) {
  for (var t = e.s; t !== void 0; t = t.n) {
    var n = t.S.n;
    if ((n !== void 0 && (t.r = n), (t.S.n = t), (t.i = -1), t.n === void 0)) {
      e.s = t;
      break;
    }
  }
}
function dl(e) {
  for (var t = e.s, n = void 0; t !== void 0; ) {
    var r = t.p;
    (t.i === -1 ? (t.S.U(t), r !== void 0 && (r.n = t.n), t.n !== void 0 && (t.n.p = r)) : (n = t),
      (t.S.n = t.r),
      t.r !== void 0 && (t.r = void 0),
      (t = r));
  }
  e.s = n;
}
function fl(e, t) {
  (sl.call(this, void 0),
    (this.x = e),
    (this.s = void 0),
    (this.g = Dl - 1),
    (this.f = 4),
    (this.W = t?.watched),
    (this.Z = t?.unwatched),
    (this.name = t?.name));
}
function pl(e, t) {
  return new fl(e, t);
}
function ml(e) {
  var t = e.m;
  if (((e.m = void 0), typeof t == `function`)) {
    Sl++;
    var n = V;
    V = void 0;
    try {
      t();
    } catch (t) {
      throw ((e.f &= -2), (e.f |= 8), hl(e), t);
    } finally {
      ((V = n), il());
    }
  }
}
function hl(e) {
  for (var t = e.s; t !== void 0; t = t.n) t.S.U(t);
  ((e.x = void 0), (e.s = void 0), ml(e));
}
function gl(e) {
  if (V !== this) throw Error(`Out-of-order effect`);
  (dl(this), (V = e), (this.f &= -2), 8 & this.f && hl(this), il());
}
function _l(e, t) {
  ((this.x = e),
    (this.m = void 0),
    (this.s = void 0),
    (this.u = void 0),
    (this.f = 32),
    (this.name = t?.name),
    bl && bl.push(this));
}
function vl(e, t) {
  var n = new _l(e, t);
  try {
    n.c();
  } catch (e) {
    throw (n.d(), e);
  }
  var r = n.d.bind(n);
  return ((r[Symbol.dispose] = r), r);
}
var yl,
  V,
  bl,
  xl,
  Sl,
  Cl,
  wl,
  Tl,
  El,
  Dl,
  Ol = t(() => {
    ((yl = Symbol.for(`preact-signals`)),
      (V = void 0),
      (xl = void 0),
      (Sl = 0),
      (Cl = 0),
      (wl = 0),
      (Tl = 0),
      (El = void 0),
      (Dl = 0),
      (sl.prototype.brand = yl),
      (sl.prototype.h = function () {
        return !0;
      }),
      (sl.prototype.S = function (e) {
        var t = this,
          n = this.t;
        n !== e &&
          e.e === void 0 &&
          ((e.x = n),
          (this.t = e),
          n === void 0
            ? B(function () {
                var e;
                (e = t.W) == null || e.call(t);
              })
            : (n.e = e));
      }),
      (sl.prototype.U = function (e) {
        var t = this;
        if (this.t !== void 0) {
          var n = e.e,
            r = e.x;
          (n !== void 0 && ((n.x = r), (e.e = void 0)),
            r !== void 0 && ((r.e = n), (e.x = void 0)),
            e === this.t &&
              ((this.t = r),
              r === void 0 &&
                B(function () {
                  var e;
                  (e = t.Z) == null || e.call(t);
                })));
        }
      }),
      (sl.prototype.subscribe = function (e) {
        var t = this;
        return vl(
          function () {
            var n = t.value,
              r = V;
            V = void 0;
            try {
              e(n);
            } finally {
              V = r;
            }
          },
          { name: `sub` },
        );
      }),
      (sl.prototype.valueOf = function () {
        return this.value;
      }),
      (sl.prototype.toString = function () {
        return this.value + ``;
      }),
      (sl.prototype.toJSON = function () {
        return this.value;
      }),
      (sl.prototype.peek = function () {
        var e = V;
        V = void 0;
        try {
          return this.value;
        } finally {
          V = e;
        }
      }),
      Object.defineProperty(sl.prototype, `value`, {
        get: function () {
          var e = ol(this);
          return (e !== void 0 && (e.i = this.i), this.v);
        },
        set: function (e) {
          if (e !== this.v) {
            if (Cl > 100) throw Error(`Cycle detected`);
            ((function (e) {
              Sl !== 0 &&
                Cl === 0 &&
                e.l !== Tl &&
                ((e.l = Tl), (El = { S: e, v: e.v, i: e.i, o: El }));
            })(this),
              (this.v = e),
              this.i++,
              Dl++,
              Sl++);
            try {
              for (var t = this.t; t !== void 0; t = t.x) t.t.N();
            } finally {
              il();
            }
          }
        },
      }),
      (fl.prototype = new sl()),
      (fl.prototype.h = function () {
        if (((this.f &= -3), 1 & this.f)) return !1;
        if ((36 & this.f) == 32 || ((this.f &= -5), this.g === Dl)) return !0;
        if (((this.g = Dl), (this.f |= 1), this.i > 0 && !ll(this))) return ((this.f &= -2), !0);
        var e = V;
        try {
          (ul(this), (V = this));
          var t = this.x();
          (16 & this.f || this.v !== t || this.i === 0) &&
            ((this.v = t), (this.f &= -17), this.i++);
        } catch (e) {
          ((this.v = e), (this.f |= 16), this.i++);
        }
        return ((V = e), dl(this), (this.f &= -2), !0);
      }),
      (fl.prototype.S = function (e) {
        if (this.t === void 0) {
          this.f |= 36;
          for (var t = this.s; t !== void 0; t = t.n) t.S.S(t);
        }
        sl.prototype.S.call(this, e);
      }),
      (fl.prototype.U = function (e) {
        if (this.t !== void 0 && (sl.prototype.U.call(this, e), this.t === void 0)) {
          this.f &= -33;
          for (var t = this.s; t !== void 0; t = t.n) t.S.U(t);
        }
      }),
      (fl.prototype.N = function () {
        if (!(2 & this.f)) {
          this.f |= 6;
          for (var e = this.t; e !== void 0; e = e.x) e.t.N();
        }
      }),
      Object.defineProperty(fl.prototype, `value`, {
        get: function () {
          if (1 & this.f) throw Error(`Cycle detected`);
          var e = ol(this);
          if ((this.h(), e !== void 0 && (e.i = this.i), 16 & this.f)) throw this.v;
          return this.v;
        },
      }),
      (_l.prototype.c = function () {
        var e = this.S();
        try {
          if (8 & this.f || this.x === void 0) return;
          var t = this.x();
          typeof t == `function` && (this.m = t);
        } finally {
          e();
        }
      }),
      (_l.prototype.S = function () {
        if (1 & this.f) throw Error(`Cycle detected`);
        ((this.f |= 1), (this.f &= -9), ml(this), ul(this), Sl++);
        var e = V;
        return ((V = this), gl.bind(this, e));
      }),
      (_l.prototype.N = function () {
        2 & this.f || ((this.f |= 2), (this.u = xl), (xl = this));
      }),
      (_l.prototype.d = function () {
        ((this.f |= 8), 1 & this.f || hl(this));
      }),
      (_l.prototype.dispose = function () {
        this.d();
      }));
  });
function kl(e, t) {
  if (t) {
    let n;
    return pl(() => {
      let r = e();
      return r && n && t(n, r) ? n : ((n = r), r);
    });
  }
  return pl(e);
}
function Al(e, t) {
  if (Object.is(e, t)) return !0;
  if (e === null || t === null) return !1;
  if (typeof e == `function` && typeof t == `function`) return e === t;
  if (e instanceof Set && t instanceof Set) {
    if (e.size !== t.size) return !1;
    for (let n of e) if (!t.has(n)) return !1;
    return !0;
  }
  if (Array.isArray(e))
    return !Array.isArray(t) || e.length !== t.length ? !1 : !e.some((e, n) => !Al(e, t[n]));
  if (typeof e == `object` && typeof t == `object`) {
    let n = Object.keys(e),
      r = Object.keys(t);
    return n.length === r.length ? !n.some((n) => !Al(e[n], t[n])) : !1;
  }
  return !1;
}
function H({ get: e }, t) {
  return {
    init(e) {
      return cl(e);
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
function jl(e, t) {
  let n = new WeakMap();
  return function () {
    let t = n.get(this);
    return (t || ((t = kl(e.bind(this))), n.set(this, t)), t.value);
  };
}
function Ml(e = !0) {
  return function (t, n) {
    n.addInitializer(function () {
      let t = n.kind === `field` || n.static ? this : Object.getPrototypeOf(this),
        r = Object.getOwnPropertyDescriptor(t, n.name);
      r && Object.defineProperty(t, n.name, ql(Kl({}, r), { enumerable: e }));
    });
  };
}
function Nl(...e) {
  let t = e.map((e) => vl(e));
  return () => t.forEach((e) => e());
}
function Pl(e) {
  return B(() => {
    let t = {};
    for (let n in e) t[n] = e[n];
    return t;
  });
}
var Fl,
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
  ju = t(() => {
    (Ol(),
      (Fl = Object.create),
      (Il = Object.defineProperty),
      (Ll = Object.defineProperties),
      (Rl = Object.getOwnPropertyDescriptor),
      (zl = Object.getOwnPropertyDescriptors),
      (Bl = Object.getOwnPropertySymbols),
      (Vl = Object.prototype.hasOwnProperty),
      (Hl = Object.prototype.propertyIsEnumerable),
      (Ul = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Wl = (e) => {
        throw TypeError(e);
      }),
      (Gl = (e, t, n) =>
        t in e
          ? Il(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Kl = (e, t) => {
        for (var n in (t ||= {})) Vl.call(t, n) && Gl(e, n, t[n]);
        if (Bl) for (var n of Bl(t)) Hl.call(t, n) && Gl(e, n, t[n]);
        return e;
      }),
      (ql = (e, t) => Ll(e, zl(t))),
      (Jl = (e, t) => Il(e, `name`, { value: t, configurable: !0 })),
      (Yl = (e) => [, , , Fl(e?.[Ul(`metadata`)] ?? null)]),
      (Xl = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Zl = (e) => (e !== void 0 && typeof e != `function` ? Wl(`Function expected`) : e)),
      (Ql = (e, t, n, r, i) => ({
        kind: Xl[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Wl(`Already initialized`) : i.push(Zl(e || null))),
      })),
      ($l = (e, t) => Gl(t, Ul(`metadata`), e[3])),
      (eu = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (tu = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Xl[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Rl(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return iu(this, a);
                      },
                      set [n](e) {
                        return ou(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Jl(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Jl(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Ql(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => ru(i, e) : (e) => n in e }),
              d ^ 3 &&
                (u.get = p ? (e) => (d ^ 1 ? iu : su)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => ou(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? Zl(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? Wl(`Object expected`)
                : (Zl((o = s.get)) && (v.get = o),
                  Zl((o = s.set)) && (v.set = o),
                  Zl((o = s.init)) && g.unshift(o)));
        return (d || $l(e, i), v && Il(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (nu = (e, t, n) => t.has(e) || Wl(`Cannot ` + n)),
      (ru = (e, t) =>
        Object(t) === t ? e.has(t) : Wl(`Cannot use the "in" operator on this value`)),
      (iu = (e, t, n) => (nu(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (au = (e, t, n) =>
        t.has(e)
          ? Wl(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (ou = (e, t, n, r) => (
        nu(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (su = (e, t, n) => (nu(e, t, `access private method`), n)),
      (pu = [H]),
      (fu = [H]),
      (du = [H]),
      (uu = [Ml()]),
      (lu = [Ml()]),
      (cu = [Ml()]),
      (Ou = class {
        constructor(e, t = Object.is) {
          ((this.defaultValue = e),
            (this.equals = t),
            eu(mu, 5, this),
            au(this, yu),
            au(this, hu, eu(mu, 8, this)),
            eu(mu, 11, this),
            au(this, bu, eu(mu, 12, this)),
            eu(mu, 15, this),
            au(this, wu, eu(mu, 16, this)),
            eu(mu, 19, this),
            (this.reset = this.reset.bind(this)),
            this.reset());
        }
        get current() {
          return iu(this, yu, Eu);
        }
        get initial() {
          return iu(this, yu, _u);
        }
        get previous() {
          return iu(this, yu, Su);
        }
        set current(e) {
          let t = B(() => iu(this, yu, Eu));
          (e && t && this.equals(t, e)) ||
            al(() => {
              (iu(this, yu, _u) || ou(this, yu, e, vu), ou(this, yu, t, Cu), ou(this, yu, e, Du));
            });
        }
        reset(e = this.defaultValue) {
          al(() => {
            (ou(this, yu, void 0, Cu), ou(this, yu, e, vu), ou(this, yu, e, Du));
          });
        }
      }),
      (mu = Yl(null)),
      (hu = new WeakMap()),
      (yu = new WeakSet()),
      (bu = new WeakMap()),
      (wu = new WeakMap()),
      (gu = tu(mu, 20, `#initial`, pu, yu, hu)),
      (_u = gu.get),
      (vu = gu.set),
      (xu = tu(mu, 20, `#previous`, fu, yu, bu)),
      (Su = xu.get),
      (Cu = xu.set),
      (Tu = tu(mu, 20, `#current`, du, yu, wu)),
      (Eu = Tu.get),
      (Du = Tu.set),
      tu(mu, 2, `current`, uu, Ou),
      tu(mu, 2, `initial`, lu, Ou),
      tu(mu, 2, `previous`, cu, Ou),
      $l(mu, Ou),
      (Au = class {
        constructor() {
          au(this, ku, new WeakMap());
        }
        get(e, t) {
          return e ? iu(this, ku).get(e)?.get(t) : void 0;
        }
        set(e, t, n) {
          if (e)
            return (
              iu(this, ku).has(e) || iu(this, ku).set(e, new Map()), iu(this, ku).get(e)?.set(t, n)
            );
        }
        clear(e) {
          return e ? iu(this, ku).get(e)?.clear() : void 0;
        }
      }),
      (ku = new WeakMap()));
  });
function Mu(e, t) {
  let n = Math.max(t.top, e.top),
    r = Math.max(t.left, e.left),
    i = Math.min(t.left + t.width, e.left + e.width),
    a = Math.min(t.top + t.height, e.top + e.height),
    o = i - r,
    s = a - n;
  return r < i && n < a ? o * s : 0;
}
function Nu({ x: e, y: t }, n) {
  let r = Math.abs(e),
    i = Math.abs(t);
  return typeof n == `number`
    ? Math.sqrt(Hu(r, 2) + Hu(i, 2)) > n
    : `x` in n && `y` in n
      ? r > n.x && i > n.y
      : `x` in n
        ? r > n.x
        : `y` in n
          ? i > n.y
          : !1;
}
var Pu,
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
  hd = t(() => {
    (ju(),
      (Pu = Object.create),
      (Fu = Object.defineProperty),
      (Iu = Object.getOwnPropertyDescriptor),
      (Lu = Object.getOwnPropertySymbols),
      (Ru = Object.prototype.hasOwnProperty),
      (zu = Object.prototype.propertyIsEnumerable),
      (Bu = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Vu = (e) => {
        throw TypeError(e);
      }),
      (Hu = Math.pow),
      (Uu = (e, t, n) =>
        t in e
          ? Fu(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Wu = (e, t) => {
        for (var n in (t ||= {})) Ru.call(t, n) && Uu(e, n, t[n]);
        if (Lu) for (var n of Lu(t)) zu.call(t, n) && Uu(e, n, t[n]);
        return e;
      }),
      (Gu = (e, t) => Fu(e, `name`, { value: t, configurable: !0 })),
      (Ku = (e) => [, , , Pu(e?.[Bu(`metadata`)] ?? null)]),
      (qu = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Ju = (e) => (e !== void 0 && typeof e != `function` ? Vu(`Function expected`) : e)),
      (Yu = (e, t, n, r, i) => ({
        kind: qu[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Vu(`Already initialized`) : i.push(Ju(e || null))),
      })),
      (Xu = (e, t) => Uu(t, Bu(`metadata`), e[3])),
      (Zu = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (Qu = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = qu[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Iu(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return td(this, a);
                      },
                      set [n](e) {
                        return rd(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Gu(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Gu(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Yu(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => ed(i, e) : (e) => n in e }),
              d ^ 3 &&
                (u.get = p ? (e) => (d ^ 1 ? td : id)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => rd(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? Ju(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? Vu(`Object expected`)
                : (Ju((o = s.get)) && (v.get = o),
                  Ju((o = s.set)) && (v.set = o),
                  Ju((o = s.init)) && g.unshift(o)));
        return (d || Xu(e, i), v && Fu(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      ($u = (e, t, n) => t.has(e) || Vu(`Cannot ` + n)),
      (ed = (e, t) =>
        Object(t) === t ? e.has(t) : Vu(`Cannot use the "in" operator on this value`)),
      (td = (e, t, n) => ($u(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (nd = (e, t, n) =>
        t.has(e)
          ? Vu(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (rd = (e, t, n, r) => (
        $u(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (id = (e, t, n) => ($u(e, t, `access private method`), n)),
      (ad = class e {
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
      (od = class e {
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
          return ((c.scale = Wu({}, s)), c);
        }
        get boundingRectangle() {
          let { width: e, height: t, left: n, top: r, right: i, bottom: a } = this;
          return { width: e, height: t, left: n, top: r, right: i, bottom: a };
        }
        get center() {
          let { left: e, top: t, right: n, bottom: r } = this;
          return new ad((e + n) / 2, (t + r) / 2);
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
          return t instanceof e ? Mu(this, t) : 0;
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
          return ad.delta({ x: r(e, `x`), y: r(e, `y`) }, { x: r(t, `x`), y: r(t, `y`) });
        }
        static intersectionRatio(t, n) {
          return e.from(t).intersectionRatio(e.from(n));
        }
      }),
      (fd = class extends ((ld = Ou), (cd = [jl]), (sd = [jl]), ld) {
        constructor(e) {
          let t = ad.from(e);
          (super(t, (e, t) => ad.equals(e, t)),
            Zu(dd, 5, this),
            nd(this, ud, 0),
            (this.velocity = { x: 0, y: 0 }));
        }
        get delta() {
          return ad.delta(this.current, this.initial);
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
            n = ad.from(e),
            r = { x: n.x - t.x, y: n.y - t.y },
            i = Date.now(),
            a = i - td(this, ud),
            o = (e) => Math.round((e / a) * 100);
          al(() => {
            (rd(this, ud, i), (this.velocity = { x: o(r.x), y: o(r.y) }), (super.current = n));
          });
        }
        reset(e = this.defaultValue) {
          (super.reset(ad.from(e)), (this.velocity = { x: 0, y: 0 }));
        }
      }),
      (dd = Ku(ld)),
      (ud = new WeakMap()),
      Qu(dd, 2, `delta`, cd, fd),
      Qu(dd, 2, `direction`, sd, fd),
      Xu(dd, fd),
      (pd = ((e) => ((e.Horizontal = `x`), (e.Vertical = `y`), e))(pd || {})),
      (md = Object.values(pd)));
  });
function gd(e, t) {
  return { plugin: e, options: t };
}
function _d(e) {
  return (t) => gd(e, t);
}
function vd(e) {
  return typeof e == `function` ? { plugin: e, options: void 0 } : e;
}
function yd(e, t) {
  return e.priority === t.priority
    ? e.type === t.type
      ? t.value - e.value
      : t.type - e.type
    : t.priority - e.priority;
}
function bd(e, t = !0) {
  let n = !1;
  return Pd(Nd({}, e), {
    cancelable: t,
    get defaultPrevented() {
      return n;
    },
    preventDefault() {
      t && (n = !0);
    },
  });
}
function xd(e, t) {
  return typeof e == `function` ? e(t) : (e ?? t);
}
var Sd,
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
  U,
  W,
  Hd,
  Ud,
  Wd,
  G,
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
  K,
  Cp,
  wp,
  Tp,
  Ep,
  Dp,
  Op,
  kp,
  Ap,
  jp,
  Mp = t(() => {
    (ju(),
      hd(),
      (Sd = Object.create),
      (Cd = Object.defineProperty),
      (wd = Object.defineProperties),
      (Td = Object.getOwnPropertyDescriptor),
      (Ed = Object.getOwnPropertyDescriptors),
      (Dd = Object.getOwnPropertySymbols),
      (Od = Object.prototype.hasOwnProperty),
      (kd = Object.prototype.propertyIsEnumerable),
      (Ad = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (jd = (e) => {
        throw TypeError(e);
      }),
      (Md = (e, t, n) =>
        t in e
          ? Cd(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Nd = (e, t) => {
        for (var n in (t ||= {})) Od.call(t, n) && Md(e, n, t[n]);
        if (Dd) for (var n of Dd(t)) kd.call(t, n) && Md(e, n, t[n]);
        return e;
      }),
      (Pd = (e, t) => wd(e, Ed(t))),
      (Fd = (e, t) => Cd(e, `name`, { value: t, configurable: !0 })),
      (Id = (e, t) => {
        var n = {};
        for (var r in e) Od.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && Dd)
          for (var r of Dd(e)) t.indexOf(r) < 0 && kd.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (Ld = (e) => [, , , Sd(e?.[Ad(`metadata`)] ?? null)]),
      (Rd = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (zd = (e) => (e !== void 0 && typeof e != `function` ? jd(`Function expected`) : e)),
      (Bd = (e, t, n, r, i) => ({
        kind: Rd[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? jd(`Already initialized`) : i.push(zd(e || null))),
      })),
      (Vd = (e, t) => Md(t, Ad(`metadata`), e[3])),
      (U = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (W = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Rd[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              Td(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return Wd(this, a);
                      },
                      set [n](e) {
                        return Gd(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Fd(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Fd(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Bd(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => Ud(i, e) : (e) => n in e }),
              d ^ 3 &&
                (u.get = p ? (e) => (d ^ 1 ? Wd : Kd)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => Gd(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? zd(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? jd(`Object expected`)
                : (zd((o = s.get)) && (v.get = o),
                  zd((o = s.set)) && (v.set = o),
                  zd((o = s.init)) && g.unshift(o)));
        return (d || Vd(e, i), v && Cd(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (Hd = (e, t, n) => t.has(e) || jd(`Cannot ` + n)),
      (Ud = (e, t) =>
        Object(t) === t ? e.has(t) : jd(`Cannot use the "in" operator on this value`)),
      (Wd = (e, t, n) => (Hd(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (G = (e, t, n) =>
        t.has(e)
          ? jd(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Gd = (e, t, n, r) => (
        Hd(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (Kd = (e, t, n) => (Hd(e, t, `access private method`), n)),
      (qd = [H]),
      (Zd = class {
        constructor(e, t) {
          ((this.manager = e),
            (this.options = t),
            G(this, Yd, U(Jd, 8, this, !1)),
            U(Jd, 11, this),
            G(this, Xd, new Set()));
        }
        enable() {
          this.disabled = !1;
        }
        disable() {
          this.disabled = !0;
        }
        isDisabled() {
          return B(() => this.disabled);
        }
        configure(e) {
          this.options = e;
        }
        registerEffect(e) {
          let t = vl(e.bind(this));
          return (Wd(this, Xd).add(t), t);
        }
        destroy() {
          Wd(this, Xd).forEach((e) => e());
        }
        static configure(e) {
          return gd(this, e);
        }
      }),
      (Jd = Ld(null)),
      (Yd = new WeakMap()),
      (Xd = new WeakMap()),
      W(Jd, 4, `disabled`, qd, Zd, Yd),
      Vd(Jd, Zd),
      (Qd = class extends Zd {}),
      (ef = class {
        constructor(e) {
          ((this.manager = e), (this.instances = new Map()), G(this, $d, []));
        }
        get values() {
          return Array.from(this.instances.values());
        }
        set values(e) {
          let t = e
              .map(vd)
              .reduceRight(
                (e, t) => (e.some(({ plugin: e }) => e === t.plugin) ? e : [t, ...e]),
                [],
              ),
            n = t.map(({ plugin: e }) => e);
          for (let e of Wd(this, $d))
            if (!n.includes(e)) {
              if (e.prototype instanceof Qd) continue;
              this.unregister(e);
            }
          for (let { plugin: e, options: n } of t) this.register(e, n);
          Gd(this, $d, n);
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
      ($d = new WeakMap()),
      (tf = []),
      (af = class extends Zd {
        constructor(e) {
          (super(e),
            G(this, nf),
            G(this, rf),
            (this.computeCollisions = this.computeCollisions.bind(this)),
            Gd(this, rf, cl(tf)),
            (this.destroy = Nl(
              () => {
                let e = this.computeCollisions(),
                  t = B(() => this.manager.dragOperation.position.current);
                if (e !== tf) {
                  let e = Wd(this, nf);
                  if ((Gd(this, nf, t), e && t.x == e.x && t.y == e.y)) return;
                } else Gd(this, nf, void 0);
                Wd(this, rf).value = e;
              },
              () => {
                let { dragOperation: e } = this.manager;
                e.status.initialized && this.forceUpdate();
              },
            )));
        }
        forceUpdate(e = !0) {
          B(() => {
            e ? (Wd(this, rf).value = this.computeCollisions()) : Gd(this, nf, void 0);
          });
        }
        computeCollisions(e, t) {
          let { registry: n, dragOperation: r } = this.manager,
            { source: i, shape: a, status: o } = r;
          if (!o.initialized || !a) return tf;
          let s = [],
            c = [];
          for (let a of e ?? n.droppables) {
            if (a.disabled || (i && !a.accepts(i))) continue;
            let e = t ?? a.collisionDetector;
            if (!e) continue;
            (c.push(a), a.shape);
            let n = B(() => e({ droppable: a, dragOperation: r }));
            n && (a.collisionPriority != null && (n.priority = a.collisionPriority), s.push(n));
          }
          return c.length === 0 ? tf : (s.sort(yd), s);
        }
        get collisions() {
          return Wd(this, rf).value;
        }
      }),
      (nf = new WeakMap()),
      (rf = new WeakMap()),
      (of = class {
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
      (sf = class extends of {
        constructor(e) {
          (super(), (this.manager = e));
        }
        dispatch(e, t) {
          let n = [t, this.manager];
          super.dispatch(e, ...n);
        }
      }),
      (cf = class extends Qd {
        constructor(e) {
          super(e);
          let t = (e, t) => e.map(({ id: e }) => e).join(``) === t.map(({ id: e }) => e).join(``),
            n = [];
          this.destroy = Nl(
            () => {
              let { dragOperation: t, collisionObserver: r } = e;
              t.status.initializing && ((n = []), r.enable());
            },
            () => {
              let { collisionObserver: r, monitor: i } = e,
                { collisions: a } = r;
              if (r.isDisabled()) return;
              let o = bd({ collisions: a });
              if ((i.dispatch(`collision`, o), o.defaultPrevented || t(a, n))) return;
              n = a;
              let [s] = a;
              B(() => {
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
      (lf = ((e) => (
        (e[(e.Lowest = 0)] = `Lowest`),
        (e[(e.Low = 1)] = `Low`),
        (e[(e.Normal = 2)] = `Normal`),
        (e[(e.High = 3)] = `High`),
        (e[(e.Highest = 4)] = `Highest`),
        e
      ))(lf || {})),
      (uf = ((e) => (
        (e[(e.Collision = 0)] = `Collision`),
        (e[(e.ShapeIntersection = 1)] = `ShapeIntersection`),
        (e[(e.PointerIntersection = 2)] = `PointerIntersection`),
        e
      ))(uf || {})),
      (_f = [H]),
      (gf = [jl]),
      (hf = [jl]),
      (mf = [jl]),
      (pf = [jl]),
      (ff = [jl]),
      (df = [jl]),
      (bf = class {
        constructor() {
          (U(vf, 5, this), G(this, yf, U(vf, 8, this, `idle`)), U(vf, 11, this));
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
      (vf = Ld(null)),
      (yf = new WeakMap()),
      W(vf, 4, `value`, _f, bf, yf),
      W(vf, 2, `current`, gf, bf),
      W(vf, 2, `idle`, hf, bf),
      W(vf, 2, `initializing`, mf, bf),
      W(vf, 2, `initialized`, pf, bf),
      W(vf, 2, `dragging`, ff, bf),
      W(vf, 2, `dropped`, df, bf),
      Vd(vf, bf),
      (xf = class {
        constructor(e) {
          this.manager = e;
        }
        setDragSource(e) {
          let { dragOperation: t } = this.manager;
          t.sourceIdentifier = typeof e == `string` || typeof e == `number` ? e : e.id;
        }
        setDropTarget(e) {
          return B(() => {
            let { dragOperation: t } = this.manager,
              n = e ?? null;
            if (t.targetIdentifier === n) return Promise.resolve(!1);
            t.targetIdentifier = n;
            let r = bd({ operation: t.snapshot() });
            return (
              t.status.dragging && this.manager.monitor.dispatch(`dragover`, r),
              this.manager.renderer.rendering.then(() => r.defaultPrevented)
            );
          });
        }
        start(e) {
          return B(() => {
            let { dragOperation: t } = this.manager;
            if ((e.source != null && this.setDragSource(e.source), !t.source))
              throw Error(`Cannot start a drag operation without a drag source`);
            if (!t.status.idle)
              throw Error(`Cannot start a drag operation while another is active`);
            let n = new AbortController(),
              { event: r, coordinates: i } = e;
            al(() => {
              (t.status.set(`initialization-pending`),
                (t.shape = null),
                (t.canceled = !1),
                (t.activatorEvent = r ?? null),
                t.position.reset(i));
            });
            let a = bd({ operation: t.snapshot() });
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
          return B(() => {
            let { dragOperation: t } = this.manager,
              { status: n, controller: r } = t;
            if (!n.dragging || !r || r.signal.aborted) return;
            let i = bd(
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
          return B(() => {
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
                let e = B(() => t.source?.status === `dropping`),
                  r = () => {
                    (t.controller === n && (t.controller = void 0), t.reset());
                  };
                if (e) {
                  let { source: e } = t,
                    n = vl(() => {
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
      (Tf = [H]),
      (wf = [H]),
      (Cf = [H]),
      (Sf = [H]),
      (jf = class {
        constructor(e, t) {
          (G(this, Df, U(Ef, 8, this)),
            U(Ef, 11, this),
            G(this, Of, U(Ef, 12, this)),
            U(Ef, 15, this),
            G(this, kf, U(Ef, 16, this)),
            U(Ef, 19, this),
            G(this, Af, U(Ef, 20, this)),
            U(Ef, 23, this));
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
      (Ef = Ld(null)),
      (Df = new WeakMap()),
      (Of = new WeakMap()),
      (kf = new WeakMap()),
      (Af = new WeakMap()),
      W(Ef, 4, `manager`, Tf, jf, Df),
      W(Ef, 4, `id`, wf, jf, Of),
      W(Ef, 4, `data`, Cf, jf, kf),
      W(Ef, 4, `disabled`, Sf, jf, Af),
      Vd(Ef, jf),
      (Mf = class {
        constructor() {
          ((this.map = cl(new Map())),
            (this.cleanupFunctions = new WeakMap()),
            (this.register = (e, t) => {
              let n = this.map.peek(),
                r = n.get(e),
                i = () => this.unregister(e, t);
              if (r === t) return i;
              r && (this.cleanupFunctions.get(r)?.(), this.cleanupFunctions.delete(r));
              let a = new Map(n);
              (a.set(e, t), (this.map.value = a));
              let o = Nl(...t.effects());
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
      (Wf = class extends (
        ((zf = jf), (Rf = [H]), (Lf = [H]), (If = [H]), (Ff = [jl]), (Pf = [jl]), (Nf = [jl]), zf)
      ) {
        constructor(e, t) {
          var n = e,
            { modifiers: r, type: i, sensors: a } = n,
            o = Id(n, [`modifiers`, `type`, `sensors`]);
          (super(o, t),
            U(Bf, 5, this),
            G(this, Vf, U(Bf, 8, this)),
            U(Bf, 11, this),
            G(this, Hf, U(Bf, 12, this)),
            U(Bf, 15, this),
            G(this, Uf, U(Bf, 16, this, this.isDragSource ? `dragging` : `idle`)),
            U(Bf, 19, this),
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
      (Bf = Ld(zf)),
      (Vf = new WeakMap()),
      (Hf = new WeakMap()),
      (Uf = new WeakMap()),
      W(Bf, 4, `type`, Rf, Wf, Vf),
      W(Bf, 4, `modifiers`, Lf, Wf, Hf),
      W(Bf, 4, `status`, If, Wf, Uf),
      W(Bf, 2, `isDropping`, Ff, Wf),
      W(Bf, 2, `isDragging`, Pf, Wf),
      W(Bf, 2, `isDragSource`, Nf, Wf),
      Vd(Bf, Wf),
      (ip = class extends (
        ((Zf = jf), (Xf = [H]), (Yf = [H]), (Jf = [H]), (qf = [H]), (Kf = [H]), (Gf = [jl]), Zf)
      ) {
        constructor(e, t) {
          var n = e,
            { accept: r, collisionDetector: i, collisionPriority: a, type: o } = n,
            s = Id(n, [`accept`, `collisionDetector`, `collisionPriority`, `type`]);
          (super(s, t),
            U(Qf, 5, this),
            G(this, $f, U(Qf, 8, this)),
            U(Qf, 11, this),
            G(this, ep, U(Qf, 12, this)),
            U(Qf, 15, this),
            G(this, tp, U(Qf, 16, this)),
            U(Qf, 19, this),
            G(this, np, U(Qf, 20, this)),
            U(Qf, 23, this),
            G(this, rp, U(Qf, 24, this)),
            U(Qf, 27, this),
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
      (Qf = Ld(Zf)),
      ($f = new WeakMap()),
      (ep = new WeakMap()),
      (tp = new WeakMap()),
      (np = new WeakMap()),
      (rp = new WeakMap()),
      W(Qf, 4, `accept`, Xf, ip, $f),
      W(Qf, 4, `type`, Yf, ip, ep),
      W(Qf, 4, `collisionDetector`, Jf, ip, tp),
      W(Qf, 4, `collisionPriority`, qf, ip, np),
      W(Qf, 4, `shape`, Kf, ip, rp),
      W(Qf, 2, `isDropTarget`, Gf, ip),
      Vd(Qf, ip),
      (ap = class extends Zd {
        constructor(e, t) {
          (super(e, t), (this.manager = e), (this.options = t));
        }
      }),
      (op = class extends AbortController {
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
      (cp = class {
        constructor(e) {
          ((this.options = e), G(this, sp));
        }
        set controller(e) {
          (Gd(this, sp, e), e.signal.addEventListener(`abort`, () => this.abort()));
        }
        activate(e) {
          var t;
          (t = Wd(this, sp)) == null || t.activate(e);
        }
      }),
      (sp = new WeakMap()),
      (lp = class extends Zd {
        constructor(e, t) {
          (super(e, t), (this.manager = e), (this.options = t));
        }
        apply(e) {
          return e.transform;
        }
      }),
      (up = class {
        constructor(e) {
          ((this.draggables = new Mf()),
            (this.droppables = new Mf()),
            (this.plugins = new ef(e)),
            (this.sensors = new ef(e)),
            (this.modifiers = new ef(e)));
        }
        register(e, t) {
          if (e instanceof Wf) return this.draggables.register(e.id, e);
          if (e instanceof ip) return this.droppables.register(e.id, e);
          if (e.prototype instanceof lp) return this.modifiers.register(e, t);
          if (e.prototype instanceof ap) return this.sensors.register(e, t);
          if (e.prototype instanceof Zd) return this.plugins.register(e, t);
          throw Error(`Invalid instance type`);
        }
        unregister(e) {
          if (e instanceof jf)
            return e instanceof Wf
              ? this.draggables.unregister(e.id, e)
              : e instanceof ip
                ? this.droppables.unregister(e.id, e)
                : () => {};
          if (e.prototype instanceof lp) return this.modifiers.unregister(e);
          if (e.prototype instanceof ap) return this.sensors.unregister(e);
          if (e.prototype instanceof Zd) return this.plugins.unregister(e);
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
      (yp = [jl]),
      (vp = [H]),
      (_p = [H]),
      (gp = [H]),
      (hp = [H]),
      (mp = [H]),
      (pp = [jl]),
      (fp = [jl]),
      (dp = [jl]),
      (kp = class {
        constructor(e) {
          (U(K, 5, this),
            G(this, bp),
            G(this, xp),
            G(this, Sp, new Ou(void 0, (e, t) => (e && t ? e.equals(t) : e === t))),
            (this.status = new bf()),
            G(this, Cp, U(K, 8, this, !1)),
            U(K, 11, this),
            G(this, wp, U(K, 12, this, null)),
            U(K, 15, this),
            G(this, Tp, U(K, 16, this, null)),
            U(K, 19, this),
            G(this, Ep, U(K, 20, this, null)),
            U(K, 23, this),
            G(this, Dp, U(K, 24, this, [])),
            U(K, 27, this),
            (this.position = new fd({ x: 0, y: 0 })),
            G(this, Op, { x: 0, y: 0 }),
            Gd(this, bp, e));
        }
        get shape() {
          let { current: e, initial: t, previous: n } = Wd(this, Sp);
          return !e || !t ? null : { current: e, initial: t, previous: n };
        }
        set shape(e) {
          e ? (Wd(this, Sp).current = e) : Wd(this, Sp).reset();
        }
        get source() {
          let e = this.sourceIdentifier;
          if (e == null) return null;
          let t = Wd(this, bp).registry.draggables.get(e);
          return (t && Gd(this, xp, t), t ?? Wd(this, xp) ?? null);
        }
        get target() {
          let e = this.targetIdentifier;
          return e == null ? null : (Wd(this, bp).registry.droppables.get(e) ?? null);
        }
        get transform() {
          let { x: e, y: t } = this.position.delta,
            n = { x: e, y: t };
          for (let e of this.modifiers) n = e.apply(Pd(Nd({}, this.snapshot()), { transform: n }));
          return (Gd(this, Op, n), n);
        }
        snapshot() {
          return B(() => ({
            source: this.source,
            target: this.target,
            activatorEvent: this.activatorEvent,
            transform: Wd(this, Op),
            shape: this.shape ? Pl(this.shape) : null,
            position: Pl(this.position),
            status: Pl(this.status),
            canceled: this.canceled,
          }));
        }
        reset() {
          al(() => {
            (this.status.set(`idle`),
              (this.sourceIdentifier = null),
              (this.targetIdentifier = null),
              Wd(this, Sp).reset(),
              this.position.reset({ x: 0, y: 0 }),
              Gd(this, Op, { x: 0, y: 0 }),
              (this.modifiers = []));
          });
        }
      }),
      (K = Ld(null)),
      (bp = new WeakMap()),
      (xp = new WeakMap()),
      (Sp = new WeakMap()),
      (Cp = new WeakMap()),
      (wp = new WeakMap()),
      (Tp = new WeakMap()),
      (Ep = new WeakMap()),
      (Dp = new WeakMap()),
      (Op = new WeakMap()),
      W(K, 2, `shape`, yp, kp),
      W(K, 4, `canceled`, vp, kp, Cp),
      W(K, 4, `activatorEvent`, _p, kp, wp),
      W(K, 4, `sourceIdentifier`, gp, kp, Tp),
      W(K, 4, `targetIdentifier`, hp, kp, Ep),
      W(K, 4, `modifiers`, mp, kp, Dp),
      W(K, 2, `source`, pp, kp),
      W(K, 2, `target`, fp, kp),
      W(K, 2, `transform`, dp, kp),
      Vd(K, kp),
      (Ap = {
        get rendering() {
          return Promise.resolve();
        },
      }),
      (jp = class {
        constructor(e) {
          this.destroy = () => {
            (this.dragOperation.status.idle || this.actions.stop({ canceled: !0 }),
              this.dragOperation.modifiers.forEach((e) => e.destroy()),
              this.registry.destroy(),
              this.collisionObserver.destroy());
          };
          let t = e ?? {},
            n = xd(t.plugins, []),
            r = xd(t.sensors, []),
            i = xd(t.modifiers, []),
            a = t.renderer ?? Ap,
            o = new sf(this);
          ((this.registry = new up(this)),
            (this.monitor = o),
            (this.renderer = a),
            (this.actions = new xf(this)),
            (this.dragOperation = new kp(this)),
            (this.collisionObserver = new af(this)),
            (this.plugins = [cf, ...n]),
            (this.modifiers = i),
            (this.sensors = r));
          let { destroy: s } = this,
            c = Nl(() => {
              let e = B(() => this.dragOperation.modifiers),
                t = this.modifiers;
              for (let n of e) t.includes(n) || n.destroy();
              this.dragOperation.modifiers =
                this.dragOperation.source?.modifiers?.map((e) => {
                  let { plugin: t, options: n } = vd(e);
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
function Np(e) {
  return e
    ? e instanceof KeyframeEffect
      ? !0
      : `getKeyframes` in e && typeof e.getKeyframes == `function`
    : !1;
}
function Pp(e, t) {
  let n = e.getAnimations();
  if (n.length > 0)
    for (let e of n) {
      if (e.playState !== `running`) continue;
      let { effect: n } = e,
        r = (Np(n) ? n.getKeyframes() : []).filter(t);
      if (r.length > 0) return [r[r.length - 1], e];
    }
  return null;
}
function Fp(e) {
  let { width: t, height: n, top: r, left: i, bottom: a, right: o } = e.getBoundingClientRect();
  return { width: t, height: n, top: r, left: i, bottom: a, right: o };
}
function Ip(e) {
  let t = Object.prototype.toString.call(e);
  return t === `[object Window]` || t === `[object global]`;
}
function Lp(e) {
  return `nodeType` in e;
}
function Rp(e) {
  return e
    ? Ip(e)
      ? e
      : Lp(e)
        ? `defaultView` in e
          ? (e.defaultView ?? window)
          : (e.ownerDocument?.defaultView ?? window)
        : window
    : window;
}
function zp(e) {
  let { Document: t } = Rp(e);
  return e instanceof t || (`nodeType` in e && e.nodeType === Node.DOCUMENT_NODE);
}
function Bp(e) {
  return !e || Ip(e)
    ? !1
    : e instanceof Rp(e).HTMLElement ||
        (`namespaceURI` in e &&
          typeof e.namespaceURI == `string` &&
          e.namespaceURI.endsWith(`html`));
}
function Vp(e) {
  return (
    e instanceof Rp(e).SVGElement ||
    (`namespaceURI` in e && typeof e.namespaceURI == `string` && e.namespaceURI.endsWith(`svg`))
  );
}
function Hp(e) {
  return e
    ? Ip(e)
      ? e.document
      : Lp(e)
        ? zp(e)
          ? e
          : Bp(e) || Vp(e)
            ? e.ownerDocument
            : document
        : document
    : document;
}
function Up(e) {
  let { documentElement: t } = Hp(e),
    n = Rp(e).visualViewport,
    r = n?.width ?? t.clientWidth,
    i = n?.height ?? t.clientHeight,
    a = n?.offsetTop ?? 0,
    o = n?.offsetLeft ?? 0;
  return { top: a, left: o, right: o + r, bottom: a + i, width: r, height: i };
}
function Wp(e, t) {
  if (Gp(e) && e.open === !1) return !1;
  let { overflow: n, overflowX: r, overflowY: i } = getComputedStyle(e);
  return n === `visible` && r === `visible` && i === `visible`;
}
function Gp(e) {
  return e.tagName === `DETAILS`;
}
function Kp(e, t = e.getBoundingClientRect(), n = 0) {
  let r = t,
    { ownerDocument: i } = e,
    a = i.defaultView ?? window,
    o = e.parentElement;
  for (; o && o !== i.documentElement; ) {
    if (!Wp(o)) {
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
function qp(e) {
  return { x: e.clientX, y: e.clientY };
}
function Jp(e = document, t = new Set()) {
  if (t.has(e)) return [];
  t.add(e);
  let n = [e];
  for (let r of Array.from(e.querySelectorAll(`iframe, frame`)))
    try {
      let e = r.contentDocument;
      e && !t.has(e) && n.push(...Jp(e, t));
    } catch {}
  try {
    let r = e.defaultView;
    if (r && r !== window.top) {
      let i = r.parent;
      i && i.document && i.document !== e && n.push(...Jp(i.document, t));
    }
  } catch {}
  return n;
}
function Yp() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function Xp() {
  let e = Yp() ? window.visualViewport : null;
  return { x: e?.offsetLeft ?? 0, y: e?.offsetTop ?? 0 };
}
function Zp(e) {
  return !e || !Lp(e) ? !1 : e instanceof Rp(e).ShadowRoot;
}
function Qp(e) {
  if (e && Lp(e)) {
    let t = e.getRootNode();
    if (Zp(t) || t instanceof Document) return t;
  }
  return Hp(e);
}
function $p(e) {
  return e.matchMedia(`(prefers-reduced-motion: reduce)`).matches;
}
function em(e) {
  let t = `input, textarea, select, canvas, [contenteditable]`,
    n = e.cloneNode(!0),
    r = Array.from(e.querySelectorAll(t));
  return (
    Array.from(n.querySelectorAll(t)).forEach((e, t) => {
      let n = r[t];
      (tm(e) &&
        tm(n) &&
        (e.type !== `file` && (e.value = n.value),
        e.type === `radio` && e.name && (e.name = `Cloned__${e.name}`)),
        nm(e) && nm(n) && n.width > 0 && n.height > 0 && e.getContext(`2d`)?.drawImage(n, 0, 0));
    }),
    n
  );
}
function tm(e) {
  return `value` in e;
}
function nm(e) {
  return e.tagName === `CANVAS`;
}
function rm(e, { x: t, y: n }) {
  let r = e.elementFromPoint(t, n);
  if (im(r)) {
    let { contentDocument: e } = r;
    if (e) {
      let { left: i, top: a } = r.getBoundingClientRect();
      return rm(e, { x: t - i, y: n - a });
    }
  }
  return r;
}
function im(e) {
  return e?.tagName === `IFRAME`;
}
function am(e) {
  return !!e.closest(`
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      button:not([disabled]),
      a[href],
      [contenteditable]:not([contenteditable="false"])
    `);
}
function om(e) {
  let t = e?.ownerDocument.defaultView;
  if (t && t.self !== t.parent) return t.frameElement;
}
function sm(e) {
  let t = new Set(),
    n = om(e);
  for (; n; ) (t.add(n), (n = om(n)));
  return t;
}
function cm(e, t) {
  let n = setTimeout(e, t);
  return () => clearTimeout(n);
}
function lm(e, t) {
  let n = () => performance.now(),
    r,
    i;
  return function (...a) {
    let o = this;
    i
      ? (r?.(),
        (r = cm(
          () => {
            (e.apply(o, a), (i = n()));
          },
          t - (n() - i),
        )))
      : (e.apply(o, a), (i = n()));
  };
}
function um(e, t) {
  return e === t
    ? !0
    : !e || !t
      ? !1
      : e.top == t.top && e.left == t.left && e.right == t.right && e.bottom == t.bottom;
}
function dm(e, t = e.getBoundingClientRect()) {
  let { width: n, height: r } = Kp(e, t);
  return n > 0 && r > 0;
}
function fm(e, t) {
  let n = bh.get(e);
  return (
    (n ||= {
      disconnect: new yh(
        e,
        (t) => {
          let n = bh.get(e);
          n && n.callbacks.forEach((e) => e(t));
        },
        { skipInitial: !0 },
      ).disconnect,
      callbacks: new Set(),
    }),
    n.callbacks.add(t),
    bh.set(e, n),
    () => {
      (n.callbacks.delete(t), n.callbacks.size === 0 && (bh.delete(e), n.disconnect()));
    }
  );
}
function pm(e, t) {
  let n = new Set();
  for (let r of e) {
    let e = fm(r, t);
    n.add(e);
  }
  return () => n.forEach((e) => e());
}
function mm(e, t) {
  let n = e.ownerDocument;
  if (!xh.has(n)) {
    let e = new AbortController(),
      t = new Set();
    (document.addEventListener(`scroll`, (e) => t.forEach((t) => t(e)), {
      capture: !0,
      passive: !0,
      signal: e.signal,
    }),
      xh.set(n, { disconnect: () => e.abort(), listeners: t }));
  }
  let { listeners: r, disconnect: i } = xh.get(n) ?? {};
  return !r || !i
    ? () => {}
    : (r.add(t),
      () => {
        (r.delete(t), r.size === 0 && (i(), xh.delete(n)));
      });
}
function hm(e) {
  return (
    `showPopover` in e &&
    `hidePopover` in e &&
    typeof e.showPopover == `function` &&
    typeof e.hidePopover == `function`
  );
}
function gm(e) {
  try {
    hm(e) &&
      e.isConnected &&
      e.hasAttribute(`popover`) &&
      !e.matches(`:popover-open`) &&
      e.showPopover();
  } catch {}
}
function _m(e) {
  return !eh || !e ? !1 : e === Hp(e).scrollingElement;
}
function vm(e) {
  let t = Rp(e),
    n = _m(e) ? Up(e) : Fp(e),
    r = t.visualViewport,
    i = _m(e)
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
function ym(e, t) {
  let { isTop: n, isBottom: r, isLeft: i, isRight: a, position: o } = vm(e),
    { x: s, y: c } = t ?? { x: 0, y: 0 },
    l = !n && o.current.y + c > 0,
    u = !r && o.current.y + c < o.max.y,
    d = !i && o.current.x + s > 0,
    f = !a && o.current.x + s < o.max.x;
  return { top: l, bottom: u, left: d, right: f, x: d || f, y: l || u };
}
function bm(e, t = !1) {
  if (!t) return xm(e);
  let n = Ah.get(e);
  return n || ((n = xm(e)), Ah.set(e, n), kh.schedule(jh), n);
}
function xm(e) {
  return Rp(e).getComputedStyle(e);
}
function Sm(e, t = bm(e, !0)) {
  return t.position === `fixed` || t.position === `sticky`;
}
function Cm(e, t = bm(e, !0)) {
  let n = /(auto|scroll|overlay)/;
  return [`overflow`, `overflowX`, `overflowY`].some((e) => {
    let r = t[e];
    return typeof r == `string` ? n.test(r) : !1;
  });
}
function wm(e, t = Mh) {
  let { limit: n, excludeElement: r, escapeShadowDOM: i } = t,
    a = new Set();
  function o(t) {
    if ((n != null && a.size >= n) || !t) return a;
    if (zp(t) && t.scrollingElement != null && !a.has(t.scrollingElement))
      return (a.add(t.scrollingElement), a);
    if (i && Zp(t)) return o(t.host);
    if (!Bp(t)) return Vp(t) ? o(t.parentElement) : a;
    if (a.has(t)) return a;
    let s = bm(t, !0);
    if (((r && t === e) || (Cm(t, s) && a.add(t)), Sm(t, s))) {
      let { scrollingElement: e } = t.ownerDocument;
      return (e && a.add(e), a);
    }
    return o(t.parentNode);
  }
  return e ? o(e) : a;
}
function Tm(e) {
  let [t] = wm(e, { limit: 1 });
  return t ?? null;
}
function Em(e, t = window.frameElement) {
  let n = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  if (!e) return n;
  let r = om(e);
  for (; r; ) {
    if (r === t) return n;
    let e = Fp(r),
      { x: i, y: a } = Dm(r, e);
    ((n.x += e.left), (n.y += e.top), (n.scaleX *= i), (n.scaleY *= a), (r = om(r)));
  }
  return n;
}
function Dm(e, t = Fp(e)) {
  let n = Math.round(t.width),
    r = Math.round(t.height);
  if (Bp(e)) return { x: n / e.offsetWidth, y: r / e.offsetHeight };
  let i = bm(e, !0);
  return { x: (parseFloat(i.width) || n) / n, y: (parseFloat(i.height) || r) / r };
}
function Om(e) {
  if (e === `none`) return null;
  let t = e.split(` `),
    n = parseFloat(t[0]),
    r = parseFloat(t[1]);
  return isNaN(n) && isNaN(r) ? null : { x: isNaN(n) ? r : n, y: isNaN(r) ? n : r };
}
function km(e) {
  if (e === `none`) return null;
  let [t, n, r = `0`] = e.split(` `),
    i = { x: parseFloat(t), y: parseFloat(n), z: parseInt(r, 10) };
  return isNaN(i.x) && isNaN(i.y)
    ? null
    : { x: isNaN(i.x) ? 0 : i.x, y: isNaN(i.y) ? 0 : i.y, z: isNaN(i.z) ? 0 : i.z };
}
function Am(e) {
  let { scale: t, transform: n, translate: r } = e,
    i = Om(t),
    a = km(r),
    o = jm(n);
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
function jm(e) {
  if (e.startsWith(`matrix3d(`)) {
    let t = e.slice(9, -1).split(/, /);
    return { x: +t[12], y: +t[13], scaleX: +t[0], scaleY: +t[5] };
  } else if (e.startsWith(`matrix(`)) {
    let t = e.slice(7, -1).split(/, /);
    return { x: +t[4], y: +t[5], scaleX: +t[0], scaleY: +t[3] };
  }
  return null;
}
function Mm(e, t, n, r = 25, i = Ph, a = Fh) {
  let { x: o, y: s } = t,
    { rect: c, isTop: l, isBottom: u, isLeft: d, isRight: f } = vm(e),
    p = Em(e),
    m = Am(bm(e, !0)),
    h = m === null ? !1 : m?.scaleX < 0,
    g = m === null ? !1 : m?.scaleY < 0,
    _ = new od(
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
function Nm(e) {
  return `scrollIntoViewIfNeeded` in e && typeof e.scrollIntoViewIfNeeded == `function`;
}
function Pm(e, t = !1) {
  if (Nm(e)) {
    e.scrollIntoViewIfNeeded(t);
    return;
  }
  if (!Bp(e)) return e.scrollIntoView();
  var n = Tm(e);
  if (!Bp(n)) return;
  let r = bm(n, !0),
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
function Fm(e, t, n) {
  let { scaleX: r, scaleY: i, x: a, y: o } = t,
    s = e.left + a + (1 - r) * parseFloat(n),
    c = e.top + o + (1 - i) * parseFloat(n.slice(n.indexOf(` `) + 1)),
    l = r ? e.width * r : e.width,
    u = i ? e.height * i : e.height;
  return { width: l, height: u, top: c, right: s + l, bottom: c + u, left: s };
}
function Im(e, t, n) {
  let { scaleX: r, scaleY: i, x: a, y: o } = t,
    s = e.left - a - (1 - r) * parseFloat(n),
    c = e.top - o - (1 - i) * parseFloat(n.slice(n.indexOf(` `) + 1)),
    l = r ? e.width / r : e.width,
    u = i ? e.height / i : e.height;
  return { width: l, height: u, top: c, right: s + l, bottom: c + u, left: s };
}
function Lm({ element: e, keyframes: t, options: n }) {
  return e.animate(t, n).finished;
}
function Rm(e, t = bm(e).translate, n = !0) {
  if (n) {
    let t = Pp(e, (e) => `translate` in e);
    if (t) {
      let { translate: e = `` } = t[0];
      if (typeof e == `string`) {
        let t = km(e);
        if (t) return t;
      }
    }
  }
  if (t) {
    let e = km(t);
    if (e) return e;
  }
  return { x: 0, y: 0, z: 0 };
}
function zm(e) {
  let t = e.ownerDocument,
    n = Lh.get(t);
  if (n) return n;
  ((n = t.getAnimations()), Lh.set(t, n), Ih.schedule(Rh));
  let r = n.filter((t) => Np(t.effect) && t.effect.target === e);
  return (Lh.set(e, r), n);
}
function Bm(e, t) {
  let n = zm(e)
    .filter((e) => {
      if (Np(e.effect)) {
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
function Vm(e, t) {
  let n = e.getAnimations(),
    r = null;
  if (!n.length) return null;
  for (let e of n) {
    if (e.playState !== `running`) continue;
    let n = Np(e.effect) ? e.effect.getKeyframes() : [],
      i = n[n.length - 1];
    if (!i) continue;
    let { transform: a, translate: o, scale: s } = i;
    if (a || o || s) {
      let e = Am({
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
function Hm(e) {
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
function Um(e) {
  return e ? e instanceof Rp(e).Element || (Lp(e) && e.nodeType === Node.ELEMENT_NODE) : !1;
}
function Wm(e) {
  if (!e) return !1;
  let { KeyboardEvent: t } = Rp(e.target);
  return e instanceof t;
}
function Gm(e) {
  if (!e) return !1;
  let { PointerEvent: t } = Rp(e.target);
  return e instanceof t;
}
function Km(e) {
  if (!Um(e)) return !1;
  let { tagName: t } = e;
  return t === `INPUT` || t === `TEXTAREA` || qm(e);
}
function qm(e) {
  return e.hasAttribute(`contenteditable`) && e.getAttribute(`contenteditable`) !== `false`;
}
function Jm(e) {
  let t = Vh[e] == null ? 0 : Vh[e] + 1;
  return ((Vh[e] = t), `${e}-${t}`);
}
var Ym,
  Xm,
  q,
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
  Hh = t(() => {
    (hd(),
      (Ym = (e) => {
        throw TypeError(e);
      }),
      (Xm = (e, t, n) => t.has(e) || Ym(`Cannot ` + n)),
      (q = (e, t, n) => (Xm(e, t, `read from private field`), t.get(e))),
      (Zm = (e, t, n) =>
        t.has(e)
          ? Ym(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Qm = (e, t, n, r) => (Xm(e, t, `write to private field`), t.set(e, n), n)),
      ($m = (e, t, n) => (Xm(e, t, `access private method`), n)),
      (eh =
        typeof window < `u` &&
        window.document !== void 0 &&
        window.document.createElement !== void 0),
      (th = new WeakMap()),
      (nh = class {
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
      (rh = eh
        ? ResizeObserver
        : class {
            observe() {}
            unobserve() {}
            disconnect() {}
          }),
      (ah = class extends rh {
        constructor(e) {
          (super((t) => {
            if (!q(this, ih)) {
              Qm(this, ih, !0);
              return;
            }
            e(t, this);
          }),
            Zm(this, ih, !1));
        }
      }),
      (ih = new WeakMap()),
      (oh = Array.from({ length: 100 }, (e, t) => t / 100)),
      (sh = 75),
      (yh = class {
        constructor(e, t, n = { debug: !1, skipInitial: !1 }) {
          ((this.element = e),
            (this.callback = t),
            Zm(this, gh),
            (this.disconnect = () => {
              var e, t, n;
              (Qm(this, mh, !0),
                (e = q(this, uh)) == null || e.disconnect(),
                (t = q(this, dh)) == null || t.disconnect(),
                q(this, fh).disconnect(),
                (n = q(this, ph)) == null || n.remove());
            }),
            Zm(this, ch, !0),
            Zm(this, lh),
            Zm(this, uh),
            Zm(this, dh),
            Zm(this, fh),
            Zm(this, ph),
            Zm(this, mh, !1),
            Zm(
              this,
              hh,
              lm(() => {
                var e;
                let { element: t } = this;
                if (
                  ((e = q(this, dh)) == null || e.disconnect(),
                  q(this, mh) || !q(this, ch) || !t.isConnected)
                )
                  return;
                let n = t.ownerDocument ?? document,
                  { innerHeight: r, innerWidth: i } = n.defaultView ?? window,
                  a = t.getBoundingClientRect(),
                  { top: o, left: s, bottom: c, right: l } = Kp(t, a),
                  u = -Math.floor(o),
                  d = -Math.floor(s),
                  f = `${u}px ${-Math.floor(i - l)}px ${-Math.floor(r - c)}px ${d}px`;
                ((this.boundingClientRect = a),
                  Qm(
                    this,
                    dh,
                    new IntersectionObserver(
                      (e) => {
                        let [n] = e,
                          { intersectionRect: r } = n;
                        (n.intersectionRatio === 1
                          ? od.intersectionRatio(r, Kp(t))
                          : n.intersectionRatio) !== 1 && q(this, hh).call(this);
                      },
                      { threshold: oh, rootMargin: f, root: n },
                    ),
                  ),
                  q(this, dh).observe(t),
                  $m(this, gh, _h).call(this));
              }, sh),
            ),
            (this.boundingClientRect = e.getBoundingClientRect()),
            Qm(this, ch, dm(e, this.boundingClientRect)));
          let r = !0;
          this.callback = (e) => {
            (r && ((r = !1), n.skipInitial)) || t(e);
          };
          let i = e.ownerDocument;
          (n?.debug &&
            (Qm(this, ph, document.createElement(`div`)),
            (q(this, ph).style.background = `rgba(0,0,0,0.15)`),
            (q(this, ph).style.position = `fixed`),
            (q(this, ph).style.pointerEvents = `none`),
            i.body.appendChild(q(this, ph))),
            Qm(
              this,
              fh,
              new IntersectionObserver(
                (t) => {
                  var n, r;
                  let { boundingClientRect: i, isIntersecting: a } = t[t.length - 1],
                    { width: o, height: s } = i,
                    c = q(this, ch);
                  (Qm(this, ch, a),
                    !(!o && !s) &&
                      (c && !a
                        ? ((n = q(this, dh)) == null || n.disconnect(),
                          this.callback(null),
                          (r = q(this, uh)) == null || r.disconnect(),
                          Qm(this, uh, void 0),
                          q(this, ph) && (q(this, ph).style.visibility = `hidden`))
                        : q(this, hh).call(this),
                      a &&
                        !q(this, uh) &&
                        (Qm(this, uh, new ah(q(this, hh))), q(this, uh).observe(e))));
                },
                { threshold: oh, root: i },
              ),
            ),
            q(this, ch) && !n.skipInitial && this.callback(this.boundingClientRect),
            q(this, fh).observe(e));
        }
      }),
      (ch = new WeakMap()),
      (lh = new WeakMap()),
      (uh = new WeakMap()),
      (dh = new WeakMap()),
      (fh = new WeakMap()),
      (ph = new WeakMap()),
      (mh = new WeakMap()),
      (hh = new WeakMap()),
      (gh = new WeakSet()),
      (_h = function () {
        q(this, mh) ||
          ($m(this, gh, vh).call(this),
          !um(this.boundingClientRect, q(this, lh)) &&
            (this.callback(this.boundingClientRect), Qm(this, lh, this.boundingClientRect)));
      }),
      (vh = function () {
        if (q(this, ph)) {
          let { top: e, left: t, width: n, height: r } = Kp(this.element);
          ((q(this, ph).style.overflow = `hidden`),
            (q(this, ph).style.visibility = `visible`),
            (q(this, ph).style.top = `${Math.floor(e)}px`),
            (q(this, ph).style.left = `${Math.floor(t)}px`),
            (q(this, ph).style.width = `${Math.floor(n)}px`),
            (q(this, ph).style.height = `${Math.floor(r)}px`));
        }
      }),
      (bh = new WeakMap()),
      (xh = new WeakMap()),
      (Eh = class {
        constructor(e, t, n) {
          ((this.callback = t),
            Zm(this, Sh),
            Zm(this, Ch, !1),
            Zm(this, wh),
            Zm(
              this,
              Th,
              lm((e) => {
                if (
                  !q(this, Ch) &&
                  e.target &&
                  `contains` in e.target &&
                  typeof e.target.contains == `function`
                ) {
                  for (let t of q(this, wh))
                    if (e.target.contains(t)) {
                      this.callback(q(this, Sh).boundingClientRect);
                      break;
                    }
                }
              }, sh),
            ));
          let r = sm(e),
            i = pm(r, t),
            a = mm(e, q(this, Th));
          (Qm(this, wh, r),
            Qm(this, Sh, new yh(e, t, n)),
            (this.disconnect = () => {
              q(this, Ch) || (Qm(this, Ch, !0), i(), a(), q(this, Sh).disconnect());
            }));
        }
      }),
      (Sh = new WeakMap()),
      (Ch = new WeakMap()),
      (wh = new WeakMap()),
      (Th = new WeakMap()),
      (Dh = class {
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
      (Oh = new Dh((e) => {
        typeof requestAnimationFrame == `function` ? requestAnimationFrame(e) : e();
      })),
      (kh = new Dh((e) => setTimeout(e, 50))),
      (Ah = new Map()),
      (jh = Ah.clear.bind(Ah)),
      (Mh = { excludeElement: !0, escapeShadowDOM: !0 }),
      (Nh = ((e) => (
        (e[(e.Idle = 0)] = `Idle`),
        (e[(e.Forward = 1)] = `Forward`),
        (e[(e.Reverse = -1)] = `Reverse`),
        e
      ))(Nh || {})),
      (Ph = { x: 0.2, y: 0.2 }),
      (Fh = { x: 10, y: 10 }),
      (Ih = new Dh((e) => setTimeout(e, 0))),
      (Lh = new Map()),
      (Rh = Lh.clear.bind(Lh)),
      (zh = class extends od {
        constructor(e, t = {}) {
          let { frameTransform: n = Em(e), ignoreTransforms: r, getBoundingClientRect: i = Fp } = t,
            a = Bm(e, {
              properties: [`transform`, `translate`, `scale`, `width`, `height`],
              isValidTarget: (t) => (t !== e || Yp()) && t.contains(e),
            }),
            o = i(e),
            { top: s, left: c, width: l, height: u } = o,
            d,
            f = bm(e),
            p = Am(f),
            m = { x: p?.scaleX ?? 1, y: p?.scaleY ?? 1 },
            h = Vm(e, f);
          (a?.(),
            p &&
              ((d = Im(o, p, f.transformOrigin)),
              (r || h) && ((s = d.top), (c = d.left), (l = d.width), (u = d.height))));
          let g = { width: d?.width ?? l, height: d?.height ?? u };
          if (h && !r && d) {
            let e = Fm(d, h, f.transformOrigin);
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
      (Bh = class {
        constructor(e) {
          ((this.element = e), (this.initial = new Map()));
        }
        set(e, t = ``) {
          let { element: n } = this;
          if (Hm(n))
            for (let [r, i] of Object.entries(e)) {
              let e = `${t}${r}`;
              (this.initial.has(e) || this.initial.set(e, n.style.getPropertyValue(e)),
                n.style.setProperty(e, typeof i == `string` ? i : `${i}px`));
            }
        }
        remove(e, t = ``) {
          let { element: n } = this;
          if (Hm(n))
            for (let r of e) {
              let e = `${t}${r}`;
              n.style.removeProperty(e);
            }
        }
        reset() {
          let { element: e } = this;
          if (Hm(e)) {
            for (let [t, n] of this.initial) e.style.setProperty(t, n);
            e.getAttribute(`style`) === `` && e.removeAttribute(`style`);
          }
        }
      }),
      (Vh = {}));
  }),
  Uh,
  Wh,
  Gh,
  Kh,
  qh = t(() => {
    (Mp(),
      hd(),
      (Uh = ({ dragOperation: e, droppable: t }) => {
        let n = e.position.current;
        if (!n) return null;
        let { id: r } = t;
        return t.shape && t.shape.containsPoint(n)
          ? {
              id: r,
              value: 1 / ad.distance(t.shape.center, n),
              type: uf.PointerIntersection,
              priority: lf.High,
            }
          : null;
      }),
      (Wh = ({ dragOperation: e, droppable: t }) => {
        let { shape: n } = e;
        if (!t.shape || !n?.current) return null;
        let r = n.current.intersectionArea(t.shape);
        if (r) {
          let { position: i } = e,
            a = ad.distance(t.shape.center, i.current),
            o = r / (n.current.area + t.shape.area - r) / a;
          return { id: t.id, value: o, type: uf.ShapeIntersection, priority: lf.Normal };
        }
        return null;
      }),
      (Gh = (e) => Uh(e) ?? Wh(e)),
      (Kh = (e) => {
        let { dragOperation: t, droppable: n } = e,
          { shape: r, position: i } = t;
        if (!n.shape) return null;
        let a = r ? od.from(r.current.boundingRectangle).corners : void 0,
          o =
            od
              .from(n.shape.boundingRectangle)
              .corners.reduce((e, t, n) => e + ad.distance(ad.from(t), a?.[n] ?? i.current), 0) / 4;
        return { id: n.id, value: 1 / o, type: uf.Collision, priority: lf.Normal };
      }));
  });
function Jh(e) {
  let t = e.tagName.toLowerCase();
  return [`input`, `select`, `textarea`, `a`, `button`].includes(t);
}
function Yh(e, t) {
  let n = document.createElement(`div`);
  return ((n.id = e), n.style.setProperty(`display`, `none`), (n.textContent = t), n);
}
function Xh(e) {
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
function Zh(e, t) {
  let n,
    r = () => {
      (clearTimeout(n), (n = setTimeout(e, t)));
    };
  return ((r.cancel = () => clearTimeout(n)), r);
}
function Qh(e, t = `hidden`) {
  return B(() => {
    let { element: n, manager: r } = e;
    if (!n || !r) return;
    let i = $h(n, r.registry.droppables),
      a = [],
      o = em(n),
      { remove: s } = o;
    return (
      eg(i, o, a),
      tg(o, t),
      (o.remove = () => {
        (a.forEach((e) => e()), s.call(o));
      }),
      o
    );
  });
}
function $h(e, t) {
  let n = new Map();
  for (let r of t)
    if (r.element && (e === r.element || e.contains(r.element))) {
      let e = `${d_}${Jm(`dom-id`)}`;
      (r.element.setAttribute(e, ``), n.set(r, e));
    }
  return n;
}
function eg(e, t, n) {
  for (let [r, i] of e) {
    if (!r.element) continue;
    let e = `[${i}]`,
      a = t.matches(e) ? t : t.querySelector(e);
    if ((r.element.removeAttribute(i), !a)) continue;
    let o = r.element;
    ((r.proxy = a),
      a.removeAttribute(i),
      th.set(o, a),
      n.push(() => {
        (th.delete(o), (r.proxy = void 0));
      }));
  }
}
function tg(e, t = `hidden`) {
  (e.setAttribute(`inert`, `true`),
    e.setAttribute(`tab-index`, `-1`),
    e.setAttribute(`aria-hidden`, `true`),
    e.setAttribute(h_, t));
}
function ng(e, t) {
  return e === t ? !0 : om(e) === om(t);
}
function rg(e) {
  let { target: t } = e;
  `newState` in e &&
    e.newState === `closed` &&
    Um(t) &&
    t.hasAttribute(`popover`) &&
    requestAnimationFrame(() => gm(t));
}
function ig(e) {
  return e.tagName === `TR`;
}
function ag(e, t, n) {
  let r = new MutationObserver((r) => {
    let i = !1;
    for (let n of r) {
      if (n.target !== e) {
        i = !0;
        continue;
      }
      if (n.type !== `attributes`) continue;
      let r = n.attributeName;
      if (r.startsWith(`aria-`) || g_.includes(r)) continue;
      let a = e.getAttribute(r);
      if (r === `style`) {
        if (Hm(e) && Hm(t)) {
          let n = e.style;
          for (let e of Array.from(t.style))
            n.getPropertyValue(e) === `` && t.style.removeProperty(e);
          for (let e of Array.from(n)) {
            if (__.includes(e) || e.startsWith(p_)) continue;
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
function og(e, t, n) {
  let r = new MutationObserver((r) => {
    for (let i of r)
      if (i.addedNodes.length !== 0)
        for (let r of Array.from(i.addedNodes)) {
          if (r.contains(e) && e.nextElementSibling !== t) {
            (e.insertAdjacentElement(`afterend`, t), gm(n));
            return;
          }
          if (r.contains(t) && t.previousElementSibling !== e) {
            (t.insertAdjacentElement(`beforebegin`, e), gm(n));
            return;
          }
        }
  });
  return (r.observe(e.ownerDocument.body, { childList: !0, subtree: !0 }), r);
}
function sg(e) {
  return new ResizeObserver(() => {
    var t;
    let n = new zh(e.placeholder, { frameTransform: e.frameTransform, ignoreTransforms: !0 }),
      r = e.transformOrigin ?? { x: 1, y: 1 },
      i = (e.width - n.width) * r.x + e.delta.x,
      a = (e.height - n.height) * r.y + e.delta.y,
      o = Xp();
    if (
      (e.styles.set(
        {
          width: n.width - e.widthOffset,
          height: n.height - e.heightOffset,
          top: e.top + a + o.y,
          left: e.left + i + o.x,
        },
        p_,
      ),
      (t = e.getElementMutationObserver()) == null || t.takeRecords(),
      ig(e.element) && ig(e.placeholder))
    ) {
      let t = Array.from(e.element.cells),
        n = Array.from(e.placeholder.cells);
      e.getSavedCellWidths() || e.setSavedCellWidths(t.map((e) => e.style.width));
      for (let [e, r] of t.entries()) {
        let t = n[e];
        r.style.width = `${t.getBoundingClientRect().width}px`;
      }
    }
    e.dragOperation.shape = new zh(e.feedbackElement);
  });
}
function cg(e) {
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
  let { duration: r = y_, easing: i = b_ } = n ?? {};
  gm(e.feedbackElement);
  let [, a] = Pp(e.feedbackElement, (e) => `translate` in e) ?? [];
  a?.pause();
  let o = e.placeholder ?? e.element,
    s = { frameTransform: ng(e.feedbackElement, o) ? null : void 0 },
    c = new zh(e.feedbackElement, s),
    l = km(bm(e.feedbackElement).translate) ?? e.translate,
    u = new zh(o, s),
    d = od.delta(c, u, e.alignment),
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
  (e.styles.set({ transition: e.transition }, p_),
    e.feedbackElement.setAttribute(f_, ``),
    (t = e.getElementMutationObserver()) == null || t.takeRecords(),
    Lm({
      element: e.feedbackElement,
      keyframes: kg(Og(Og({}, p), m), {
        translate: [`${l.x}px ${l.y}px 0`, `${f.x}px ${f.y}px 0`],
      }),
      options: {
        duration: $p(Rp(e.feedbackElement))
          ? 0
          : e.moved || e.feedbackElement !== e.element
            ? r
            : 0,
        easing: i,
      },
    }).then(() => {
      (e.feedbackElement.removeAttribute(f_),
        a?.finish(),
        e.cleanup(),
        requestAnimationFrame(e.restoreFocus));
    }));
}
function lg(e, t) {
  return Math.sign(e - t);
}
function ug(e) {
  return e > 0 ? Nh.Forward : e < 0 ? Nh.Reverse : Nh.Idle;
}
function dg() {
  var e;
  (e = document.getSelection()) == null || e.removeAllRanges();
}
function fg(e, t) {
  return t.includes(e.code);
}
function pg(e) {
  return `sensor` in e;
}
function mg(e) {
  e.preventDefault();
}
function hg() {}
function gg(e) {
  !e || vv.has(e) || (e.addEventListener(`touchmove`, hg, { capture: !1, passive: !1 }), vv.add(e));
}
var _g,
  vg,
  yg,
  bg,
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
  J,
  Lg,
  Rg,
  zg,
  Y,
  X,
  Bg,
  Vg,
  Hg,
  Ug,
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
  Vv = t(() => {
    (Mp(),
      Hh(),
      ju(),
      hd(),
      qh(),
      (_g = Object.create),
      (vg = Object.defineProperty),
      (yg = Object.defineProperties),
      (bg = Object.getOwnPropertyDescriptor),
      (xg = Object.getOwnPropertyDescriptors),
      (Sg = Object.getOwnPropertySymbols),
      (Cg = Object.prototype.hasOwnProperty),
      (wg = Object.prototype.propertyIsEnumerable),
      (Tg = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (Eg = (e) => {
        throw TypeError(e);
      }),
      (Dg = (e, t, n) =>
        t in e
          ? vg(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Og = (e, t) => {
        for (var n in (t ||= {})) Cg.call(t, n) && Dg(e, n, t[n]);
        if (Sg) for (var n of Sg(t)) wg.call(t, n) && Dg(e, n, t[n]);
        return e;
      }),
      (kg = (e, t) => yg(e, xg(t))),
      (Ag = (e, t) => vg(e, `name`, { value: t, configurable: !0 })),
      (jg = (e, t) => {
        var n = {};
        for (var r in e) Cg.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && Sg)
          for (var r of Sg(e)) t.indexOf(r) < 0 && wg.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (Mg = (e) => [, , , _g(e?.[Tg(`metadata`)] ?? null)]),
      (Ng = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Pg = (e) => (e !== void 0 && typeof e != `function` ? Eg(`Function expected`) : e)),
      (Fg = (e, t, n, r, i) => ({
        kind: Ng[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? Eg(`Already initialized`) : i.push(Pg(e || null))),
      })),
      (Ig = (e, t) => Dg(t, Tg(`metadata`), e[3])),
      (J = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (Lg = (e, t, n, r, i, a) => {
        var o,
          s,
          c,
          l,
          u,
          d = t & 7,
          f = !!(t & 8),
          p = !!(t & 16),
          m = d > 3 ? e.length + 1 : d ? (f ? 1 : 2) : 0,
          h = Ng[d + 5],
          g = d > 3 && (e[m - 1] = []),
          _ = e[m] || (e[m] = []),
          v =
            d &&
            (!p && !f && (i = i.prototype),
            d < 5 &&
              (d > 3 || !p) &&
              bg(
                d < 4
                  ? i
                  : {
                      get [n]() {
                        return Y(this, a);
                      },
                      set [n](e) {
                        return Bg(this, a, e);
                      },
                    },
                n,
              ));
        d ? p && d < 4 && Ag(a, (d > 2 ? `set ` : d > 1 ? `get ` : ``) + n) : Ag(i, n);
        for (var y = r.length - 1; y >= 0; y--)
          ((l = Fg(d, n, (c = {}), e[3], _)),
            d &&
              ((l.static = f),
              (l.private = p),
              (u = l.access = { has: p ? (e) => zg(i, e) : (e) => n in e }),
              d ^ 3 && (u.get = p ? (e) => (d ^ 1 ? Y : Vg)(e, i, d ^ 4 ? a : v.get) : (e) => e[n]),
              d > 2 &&
                (u.set = p ? (e, t) => Bg(e, i, t, d ^ 4 ? a : v.set) : (e, t) => (e[n] = t))),
            (s = (0, r[y])(
              d ? (d < 4 ? (p ? a : v[h]) : d > 4 ? void 0 : { get: v.get, set: v.set }) : i,
              l,
            )),
            (c._ = 1),
            d ^ 4 || s === void 0
              ? Pg(s) && (d > 4 ? g.unshift(s) : d ? (p ? (a = s) : (v[h] = s)) : (i = s))
              : typeof s != `object` || !s
                ? Eg(`Object expected`)
                : (Pg((o = s.get)) && (v.get = o),
                  Pg((o = s.set)) && (v.set = o),
                  Pg((o = s.init)) && g.unshift(o)));
        return (d || Ig(e, i), v && vg(i, n, v), p ? (d ^ 4 ? a : v) : i);
      }),
      (Rg = (e, t, n) => t.has(e) || Eg(`Cannot ` + n)),
      (zg = (e, t) =>
        Object(t) === t ? e.has(t) : Eg(`Cannot use the "in" operator on this value`)),
      (Y = (e, t, n) => (Rg(e, t, `read from private field`), n ? n.call(e) : t.get(e))),
      (X = (e, t, n) =>
        t.has(e)
          ? Eg(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Bg = (e, t, n, r) => (
        Rg(e, t, `write to private field`), r ? r.call(e, n) : t.set(e, n), n
      )),
      (Vg = (e, t, n) => (Rg(e, t, `access private method`), n)),
      (Hg = { role: `button`, roleDescription: `draggable` }),
      (Ug = `dnd-kit-description`),
      (Wg = `dnd-kit-announcement`),
      (Gg = {
        draggable: `To pick up a draggable item, press the space bar. While dragging, use the arrow keys to move the item in a given direction. Press space again to drop the item in its new position, or press escape to cancel.`,
      }),
      (Kg = {
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
      (qg = [`dragover`, `dragmove`]),
      (Jg = class extends Zd {
        constructor(e, t) {
          super(e);
          let {
              id: n,
              idPrefix: { description: r = Ug, announcement: i = Wg } = {},
              announcements: a = Kg,
              screenReaderInstructions: o = Gg,
              debounce: s = 500,
            } = t ?? {},
            c = n ? `${r}-${n}` : Jm(r),
            l = n ? `${i}-${n}` : Jm(i),
            u,
            d,
            f,
            p,
            m = (e = p) => {
              !f || !e || (f?.nodeValue !== e && (f.nodeValue = e));
            },
            h = () => Oh.schedule(m),
            g = Zh(h, s),
            _ = Object.entries(a).map(([e, t]) =>
              this.manager.monitor.addEventListener(e, (n, r) => {
                let i = f;
                if (!i) return;
                let a = t?.(n, r);
                a && i.nodeValue !== a && ((p = a), qg.includes(e) ? g() : (h(), g.cancel()));
              }),
            ),
            v = () => {
              let e = [];
              (u?.isConnected || ((u = Yh(c, o.draggable)), e.push(u)),
                d?.isConnected ||
                  ((d = Xh(l)), (f = document.createTextNode(``)), d.appendChild(f), e.push(d)),
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
                  (!Jh(t) || Yp()) &&
                    !t.hasAttribute(`tabindex`) &&
                    y.add(() => t.setAttribute(`tabindex`, `0`)),
                  !t.hasAttribute(`role`) &&
                    t.tagName.toLowerCase() !== `button` &&
                    y.add(() => t.setAttribute(`role`, Hg.role)),
                  t.hasAttribute(`aria-roledescription`) ||
                    y.add(() => t.setAttribute(`aria-roledescription`, Hg.roleDescription)),
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
            y.size > 0 && Oh.schedule(b);
          }),
            (this.destroy = () => {
              (super.destroy(), u?.remove(), d?.remove(), _.forEach((e) => e()));
            }));
        }
      }),
      (Yg = class extends Zd {
        constructor(e, t) {
          (super(e, t), (this.manager = e));
          let n = kl(() => Hp(this.manager.dragOperation.source?.element));
          this.destroy = vl(() => {
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
      (Xg = new Map()),
      (u_ = class extends ((t_ = Qd), (e_ = [H]), ($g = [jl]), (Qg = [jl]), (Zg = [jl]), t_) {
        constructor(e) {
          (super(e),
            J(r_, 5, this),
            X(this, a_),
            X(this, n_, new Set()),
            X(this, i_, J(r_, 8, this, new Set())),
            J(r_, 11, this),
            this.registerEffect(Vg(this, a_, o_)));
        }
        register(e) {
          return (
            Y(this, n_).add(e),
            () => {
              Y(this, n_).delete(e);
            }
          );
        }
        addRoot(e) {
          return (
            B(() => {
              let t = new Set(this.additionalRoots);
              (t.add(e), (this.additionalRoots = t));
            }),
            () => {
              B(() => {
                let t = new Set(this.additionalRoots);
                (t.delete(e), (this.additionalRoots = t));
              });
            }
          );
        }
        get sourceRoot() {
          let { source: e } = this.manager.dragOperation;
          return Qp(e?.element ?? null);
        }
        get targetRoot() {
          let { target: e } = this.manager.dragOperation;
          return Qp(e?.element ?? null);
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
      (r_ = Mg(t_)),
      (n_ = new WeakMap()),
      (i_ = new WeakMap()),
      (a_ = new WeakSet()),
      (o_ = function () {
        let { roots: e } = this,
          t = [];
        for (let n of e) for (let e of Y(this, n_)) t.push(Vg(this, a_, s_).call(this, n, e));
        return () => {
          for (let e of t) e();
        };
      }),
      (s_ = function (e, t) {
        let n = Xg.get(e);
        n || ((n = new Map()), Xg.set(e, n));
        let r = n.get(t);
        if (!r) {
          let i = zp(e)
            ? Vg(this, a_, c_).call(this, e, n, t)
            : Vg(this, a_, l_).call(this, e, n, t);
          if (!i) return () => {};
          ((r = i), n.set(t, r));
        }
        r.refCount++;
        let i = !1;
        return () => {
          i || ((i = !0), r.refCount--, r.refCount === 0 && r.cleanup());
        };
      }),
      (c_ = function (e, t, n) {
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
              (i.disconnect(), r.remove(), t.delete(n), t.size === 0 && Xg.delete(e));
            },
          }
        );
      }),
      (l_ = function (e, t, n) {
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
              if (Zp(e) && e.host?.isConnected) {
                let t = e.adoptedStyleSheets.indexOf(i);
                t !== -1 && e.adoptedStyleSheets.splice(t, 1);
              }
              (t.delete(n), t.size === 0 && Xg.delete(e));
            },
          }
        );
      }),
      Lg(r_, 4, `additionalRoots`, e_, u_, i_),
      Lg(r_, 2, `sourceRoot`, $g, u_),
      Lg(r_, 2, `targetRoot`, Qg, u_),
      Lg(r_, 2, `roots`, Zg, u_),
      Ig(r_, u_),
      (d_ = `data-dnd-`),
      (f_ = `${d_}dropping`),
      (p_ = `--dnd-`),
      (m_ = `${d_}dragging`),
      (h_ = `${d_}placeholder`),
      (g_ = [m_, h_, `popover`, `aria-pressed`, `aria-grabbing`]),
      (__ = [`view-transition-name`]),
      (v_ = `
  :is(:root,:host) [${m_}] {
    position: fixed !important;
    pointer-events: none !important;
    touch-action: none;
    z-index: calc(infinity);
    will-change: translate;
    top: var(${p_}top, 0px) !important;
    left: var(${p_}left, 0px) !important;
    right: unset !important;
    bottom: unset !important;
    width: var(${p_}width, auto);
    max-width: var(${p_}width, auto);
    height: var(${p_}height, auto);
    max-height: var(${p_}height, auto);
    transition: var(${p_}transition) !important;
  }

  :is(:root,:host) [${h_}] {
    transition: none;
  }

  :is(:root,:host) [${h_}='hidden'] {
    visibility: hidden;
  }

  [${m_}] * {
    pointer-events: none !important;
  }

  [${m_}]:not([${f_}]) {
    translate: var(${p_}translate) !important;
  }

  [${m_}][style*='${p_}scale'] {
    scale: var(${p_}scale) !important;
    transform-origin: var(${p_}transform-origin) !important;
  }

  @layer dnd-kit {
    :where([${m_}][popover]) {
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
  [${m_}]::backdrop, [${d_}overlay]:not([${m_}]) {
    display: none;
    visibility: hidden;
  }
`
        .replace(/\n+/g, ` `)
        .replace(/\s+/g, ` `)
        .trim()),
      (y_ = 250),
      (b_ = `ease`),
      (O_ = class extends ((S_ = Zd), (x_ = [H]), S_) {
        constructor(e, t) {
          (super(e, t),
            X(this, T_),
            X(this, w_, J(C_, 8, this)),
            J(C_, 11, this),
            (this.state = { initial: {}, current: {} }));
          let n = e.registry.plugins.get(u_),
            r = n?.register(v_);
          if (r) {
            let e = this.destroy.bind(this);
            this.destroy = () => {
              (r(), e());
            };
          }
          (this.registerEffect(Vg(this, T_, E_).bind(this, n)),
            this.registerEffect(Vg(this, T_, D_)));
        }
      }),
      (C_ = Mg(S_)),
      (w_ = new WeakMap()),
      (T_ = new WeakSet()),
      (E_ = function (e) {
        let { overlay: t } = this;
        if (!t || !e) return;
        let n = Qp(t);
        if (n) return e.addRoot(n);
      }),
      (D_ = function () {
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
          d = Em(u),
          f = Em(s),
          p = !ng(s, u),
          m = new zh(s, { frameTransform: p ? f : null, ignoreTransforms: !p }),
          h = { x: f.scaleX / d.scaleX, y: f.scaleY / d.scaleY },
          { width: g, height: _, top: v, left: y } = m;
        p && ((g /= h.x), (_ /= h.y));
        let b = new Bh(u),
          {
            transition: x,
            translate: S,
            boxSizing: C,
            paddingBlockStart: w,
            paddingBlockEnd: T,
            paddingInlineStart: E,
            paddingInlineEnd: D,
            borderInlineStartWidth: O,
            borderInlineEndWidth: k,
            borderBlockStartWidth: A,
            borderBlockEndWidth: j,
          } = bm(s),
          M = c === `clone`,
          ee = C === `content-box`,
          N = ee ? parseInt(E) + parseInt(D) + parseInt(O) + parseInt(k) : 0,
          te = ee ? parseInt(w) + parseInt(T) + parseInt(A) + parseInt(j) : 0,
          ne = c !== `move` && !this.overlay ? Qh(a, M ? `clone` : `hidden`) : null,
          re = B(() => Wm(t.dragOperation.activatorEvent));
        if (S !== `none`) {
          let e = km(S);
          e && !l.translate && (l.translate = e);
        }
        if (!l.transformOrigin) {
          let e = B(() => i.current);
          l.transformOrigin = {
            x: (e.x - y * d.scaleX - d.x) / (g * d.scaleX),
            y: (e.y - v * d.scaleY - d.y) / (_ * d.scaleY),
          };
        }
        let { transformOrigin: ie } = l,
          ae = v * d.scaleY + d.y,
          oe = y * d.scaleX + d.x;
        if (!l.coordinates && ((l.coordinates = { x: oe, y: ae }), h.x !== 1 || h.y !== 1)) {
          let { scaleX: e, scaleY: t } = f,
            { x: n, y: r } = ie;
          ((l.coordinates.x += (g * e - g) * n), (l.coordinates.y += (_ * t - _) * r));
        }
        ((l.dimensions ||= { width: g, height: _ }), (l.frameTransform ||= d));
        let P = { x: l.coordinates.x - oe, y: l.coordinates.y - ae },
          se = {
            width: (l.dimensions.width * l.frameTransform.scaleX - g * d.scaleX) * ie.x,
            height: (l.dimensions.height * l.frameTransform.scaleY - _ * d.scaleY) * ie.y,
          },
          F = { x: P.x / d.scaleX + se.width, y: P.y / d.scaleY + se.height },
          ce = { left: y + F.x, top: v + F.y };
        u.setAttribute(m_, `true`);
        let le = B(() => r.transform),
          I = l.translate ?? { x: 0, y: 0 },
          ue = le.x * d.scaleX + I.x,
          de = le.y * d.scaleY + I.y,
          fe = Xp();
        (b.set(
          {
            width: g - N,
            height: _ - te,
            top: ce.top + fe.y,
            left: ce.left + fe.x,
            translate: `${ue}px ${de}px 0`,
            transition: x ? `${x}, translate 0ms linear` : ``,
            scale: p ? `${h.x} ${h.y}` : ``,
            "transform-origin": `${ie.x * 100}% ${ie.y * 100}%`,
          },
          p_,
        ),
          ne &&
            (s.insertAdjacentElement(`afterend`, ne),
            n?.rootElement &&
              (typeof n.rootElement == `function` ? n.rootElement(a) : n.rootElement).appendChild(
                s,
              )),
          hm(u) &&
            (u.hasAttribute(`popover`) || u.setAttribute(`popover`, `manual`),
            gm(u),
            u.addEventListener(`beforetoggle`, rg)));
        let pe,
          me,
          he,
          ge = sg({
            placeholder: ne,
            element: s,
            feedbackElement: u,
            frameTransform: d,
            transformOrigin: ie,
            width: g,
            height: _,
            top: v,
            left: y,
            widthOffset: N,
            heightOffset: te,
            delta: F,
            styles: b,
            dragOperation: r,
            getElementMutationObserver: () => pe,
            getSavedCellWidths: () => he,
            setSavedCellWidths: (e) => {
              he = e;
            },
          }),
          _e = new zh(u);
        B(() => (r.shape = _e));
        let ve = Rp(u),
          ye = (e) => {
            this.manager.actions.stop({ event: e });
          },
          be = $p(ve);
        (re && ve.addEventListener(`resize`, ye),
          B(() => a.status) === `idle` && requestAnimationFrame(() => (a.status = `dragging`)),
          ne && (ge.observe(ne), (pe = ag(s, ne, M)), (me = og(s, ne, u))));
        let xe = t.dragOperation.source?.id,
          Se = () => {
            if (!re || xe == null) return;
            let e = t.registry.draggables.get(xe),
              n = e?.handle ?? e?.element;
            Bp(n) && n.focus();
          },
          Ce = () => {
            if (
              (pe?.disconnect(),
              me?.disconnect(),
              ge.disconnect(),
              ve.removeEventListener(`resize`, ye),
              hm(u) && (u.removeEventListener(`beforetoggle`, rg), u.removeAttribute(`popover`)),
              u.removeAttribute(m_),
              b.reset(),
              he && ig(s))
            ) {
              let e = Array.from(s.cells);
              for (let [t, n] of e.entries()) n.style.width = he[t] ?? ``;
            }
            a.status = `idle`;
            let t = e.current.translate != null;
            (ne &&
              (t || ne.parentElement !== u.parentElement) &&
              u.isConnected &&
              ne.replaceWith(u),
              ne?.remove());
          },
          we = n?.dropAnimation,
          Te = this,
          Ee = Nl(
            () => {
              let { transform: t, status: n } = r;
              if (!(!t.x && !t.y && !e.current.translate) && n.dragging) {
                let n = l.translate ?? { x: 0, y: 0 },
                  i = { x: t.x / d.scaleX + n.x, y: t.y / d.scaleY + n.y },
                  a = e.current.translate,
                  o = B(() => r.modifiers),
                  s = B(() => r.shape?.current),
                  c = re && !be ? `250ms cubic-bezier(0.25, 1, 0.5, 1)` : `0ms linear`;
                if (
                  (b.set(
                    { transition: `${x}, translate ${c}`, translate: `${i.x}px ${i.y}px 0` },
                    p_,
                  ),
                  pe?.takeRecords(),
                  s && s !== _e && a && !o.length)
                ) {
                  let e = ad.delta(i, a);
                  r.shape = od.from(s.boundingRectangle).translate(e.x * d.scaleX, e.y * d.scaleY);
                } else r.shape = new zh(u);
                e.current.translate = i;
              }
            },
            function () {
              if (r.status.dropped) {
                (this.dispose(), (a.status = `dropping`));
                let n = Te.dropAnimation === void 0 ? we : Te.dropAnimation,
                  r = e.current.translate,
                  i = r != null;
                if ((!r && s !== u && (r = { x: 0, y: 0 }), !r || n === null)) {
                  Ce();
                  return;
                }
                t.renderer.rendering.then(() => {
                  cg({
                    element: s,
                    feedbackElement: u,
                    placeholder: ne,
                    translate: r,
                    moved: i,
                    transition: x,
                    alignment: a.alignment,
                    styles: b,
                    animation: n ?? void 0,
                    getElementMutationObserver: () => pe,
                    cleanup: Ce,
                    restoreFocus: Se,
                  });
                });
              }
            },
          );
        return () => {
          (Ce(), Ee());
        };
      }),
      Lg(C_, 4, `overlay`, x_, O_, w_),
      Ig(C_, O_),
      (O_.configure = _d(O_)),
      (k_ = O_),
      (A_ = !0),
      (j_ = !1),
      (F_ = ((P_ = [H]), Nh.Forward)),
      (N_ = ((M_ = [H]), Nh.Reverse)),
      (z_ = class {
        constructor() {
          (X(this, L_, J(I_, 8, this, A_)),
            J(I_, 11, this),
            X(this, R_, J(I_, 12, this, A_)),
            J(I_, 15, this));
        }
        isLocked(e) {
          return e === Nh.Idle
            ? !1
            : e == null
              ? this[Nh.Forward] === A_ && this[Nh.Reverse] === A_
              : this[e] === A_;
        }
        unlock(e) {
          e !== Nh.Idle && (this[e] = j_);
        }
      }),
      (I_ = Mg(null)),
      (L_ = new WeakMap()),
      (R_ = new WeakMap()),
      Lg(I_, 4, F_, P_, z_, L_),
      Lg(I_, 4, N_, M_, z_, R_),
      Ig(I_, z_),
      (B_ = [Nh.Forward, Nh.Reverse]),
      (V_ = class {
        constructor() {
          ((this.x = new z_()), (this.y = new z_()));
        }
        isLocked() {
          return this.x.isLocked() && this.y.isLocked();
        }
      }),
      (H_ = class extends Zd {
        constructor(e) {
          super(e);
          let t = cl(new V_()),
            n = null;
          ((this.signal = t),
            vl(() => {
              let { status: r } = e.dragOperation;
              if (!r.initialized) {
                ((n = null), (t.value = new V_()));
                return;
              }
              let { delta: i } = e.dragOperation.position;
              if (n) {
                let e = { x: lg(i.x, n.x), y: lg(i.y, n.y) },
                  r = t.peek();
                al(() => {
                  for (let t of md) for (let n of B_) e[t] === n && r[t].unlock(n);
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
      (Y_ = class extends ((W_ = Qd), (U_ = [H]), W_) {
        constructor(e) {
          (super(e),
            X(this, K_, J(G_, 8, this, !1)),
            J(G_, 11, this),
            X(this, q_),
            X(this, J_, () => {
              if (!Y(this, q_)) return;
              let { element: e, by: t } = Y(this, q_);
              (t.y && (e.scrollTop += t.y), t.x && (e.scrollLeft += t.x));
            }),
            (this.scroll = (e) => {
              if (this.disabled) return !1;
              let t = this.getScrollableElements();
              if (!t) return (Bg(this, q_, void 0), !1);
              let { position: n } = this.manager.dragOperation,
                r = n?.current;
              if (r) {
                let { by: n } = e ?? {},
                  i = n ? { x: ug(n.x), y: ug(n.y) } : void 0,
                  a = i ? void 0 : this.scrollIntentTracker.current;
                if (a?.isLocked()) return !1;
                for (let e of t) {
                  let t = ym(e, n);
                  if (t.x || t.y) {
                    let { speed: t, direction: o } = Mm(e, r, i);
                    if (a) for (let e of md) a[e].isLocked(o[e]) && ((t[e] = 0), (o[e] = 0));
                    if (o.x || o.y) {
                      let { x: r, y: i } = n ?? o,
                        a = r * t.x,
                        s = i * t.y;
                      if (a || s) {
                        let t = Y(this, q_)?.by;
                        if (this.autoScrolling && t && ((t.x && !a) || (t.y && !s))) continue;
                        return (
                          Bg(this, q_, { element: e, by: { x: a, y: s } }),
                          Oh.schedule(Y(this, J_)),
                          !0
                        );
                      }
                    }
                  }
                }
              }
              return (Bg(this, q_, void 0), !1);
            }));
          let t = null,
            n = null,
            r = kl(() => {
              let { position: n, source: r } = e.dragOperation;
              if (!n) return null;
              let i = rm(Qp(r?.element), n.current);
              return (i && (t = i), i ?? t);
            }),
            i = kl(() => {
              let t = r.value,
                { documentElement: i } = Hp(t);
              if (!t || t === i) {
                let { target: t } = e.dragOperation,
                  r = t?.element;
                if (r) {
                  let e = wm(r, { excludeElement: !1 });
                  return ((n = e), e);
                }
              }
              if (t) {
                let e = wm(t, { excludeElement: !1 });
                return this.autoScrolling && n && e.size < n?.size ? n : ((n = e), e);
              }
              return ((n = null), null);
            }, Al);
          ((this.getScrollableElements = () => i.value),
            (this.scrollIntentTracker = new H_(e)),
            (this.destroy = e.monitor.addEventListener(`dragmove`, (t) => {
              this.disabled ||
                t.defaultPrevented ||
                !Wm(e.dragOperation.activatorEvent) ||
                !t.by ||
                (this.scroll({ by: t.by }) && t.preventDefault());
            })));
        }
      }),
      (G_ = Mg(W_)),
      (K_ = new WeakMap()),
      (q_ = new WeakMap()),
      (J_ = new WeakMap()),
      Lg(G_, 4, `autoScrolling`, U_, Y_, K_),
      Ig(G_, Y_),
      (X_ = class {
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
      (Z_ = new X_((e) => {
        typeof requestAnimationFrame == `function` ? requestAnimationFrame(e) : e();
      })),
      (Q_ = 10),
      ($_ = class extends Zd {
        constructor(e, t) {
          super(e);
          let n = e.registry.plugins.get(Y_);
          if (!n) throw Error(`AutoScroller plugin depends on Scroller plugin`);
          this.destroy = vl(() => {
            if (this.disabled) return;
            let { position: t, status: r } = e.dragOperation;
            if (r.dragging)
              if (n.scroll()) {
                n.autoScrolling = !0;
                let e = setInterval(() => Z_.schedule(n.scroll), Q_);
                return () => {
                  clearInterval(e);
                };
              } else n.autoScrolling = !1;
          });
        }
      }),
      (ev = { capture: !0, passive: !0 }),
      (nv = class extends Qd {
        constructor(e) {
          (super(e),
            X(this, tv),
            (this.handleScroll = () => {
              Y(this, tv) ??
                Bg(
                  this,
                  tv,
                  setTimeout(() => {
                    (this.manager.collisionObserver.forceUpdate(!1), Bg(this, tv, void 0));
                  }, 50),
                );
            }));
          let { dragOperation: t } = this.manager;
          this.destroy = vl(() => {
            if (t.status.dragging) {
              let e = t.source?.element?.ownerDocument ?? document;
              return (
                e.addEventListener(`scroll`, this.handleScroll, ev),
                () => {
                  e.removeEventListener(`scroll`, this.handleScroll, ev);
                }
              );
            }
          });
        }
      }),
      (tv = new WeakMap()),
      (rv = class extends Zd {
        constructor(e, t) {
          (super(e, t),
            (this.manager = e),
            (this.destroy = vl(() => {
              let { dragOperation: e } = this.manager,
                { nonce: t } = this.options ?? {};
              if (e.status.initialized) {
                let e = document.createElement(`style`);
                return (
                  t && e.setAttribute(`nonce`, t),
                  (e.textContent = `* { user-select: none !important; -webkit-user-select: none !important; }`),
                  document.head.appendChild(e),
                  dg(),
                  document.addEventListener(`selectionchange`, dg, { capture: !0 }),
                  () => {
                    (document.removeEventListener(`selectionchange`, dg, { capture: !0 }),
                      e.remove());
                  }
                );
              }
            })));
        }
      }),
      (iv = Object.freeze({
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
      (ov = class extends ap {
        constructor(e, t) {
          (super(e),
            (this.manager = e),
            (this.options = t),
            X(this, av, []),
            (this.listeners = new nh()),
            (this.handleSourceKeyDown = (e, t, n) => {
              if (this.disabled || e.defaultPrevented || !Um(e.target) || t.disabled) return;
              let {
                keyboardCodes: r = iv.keyboardCodes,
                preventActivation: i = iv.preventActivation,
              } = n ?? {};
              r.start.includes(e.code) &&
                this.manager.dragOperation.status.idle &&
                (i?.(e, t) || this.handleStart(e, t, n));
            }));
        }
        bind(e, t = this.options) {
          return vl(() => {
            let n = e.handle ?? e.element,
              r = (n) => {
                Wm(n) && this.handleSourceKeyDown(n, e, t);
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
          (e.preventDefault(), e.stopImmediatePropagation(), Pm(r));
          let { center: i } = new zh(r);
          if (
            this.manager.actions.start({ event: e, coordinates: { x: i.x, y: i.y }, source: t })
              .signal.aborted
          )
            return this.cleanup();
          this.sideEffects();
          let a = Hp(r),
            o = [
              this.listeners.bind(a, [
                {
                  type: `keydown`,
                  listener: (e) => this.handleKeyDown(e, t, n),
                  options: { capture: !0 },
                },
              ]),
            ];
          Y(this, av).push(...o);
        }
        handleKeyDown(e, t, n) {
          let { keyboardCodes: r = iv.keyboardCodes } = n ?? {};
          if (fg(e, [...r.end, ...r.cancel])) {
            e.preventDefault();
            let t = fg(e, r.cancel);
            this.handleEnd(e, t);
            return;
          }
          (fg(e, r.up) ? this.handleMove(`up`, e) : fg(e, r.down) && this.handleMove(`down`, e),
            fg(e, r.left)
              ? this.handleMove(`left`, e)
              : fg(e, r.right) && this.handleMove(`right`, e));
        }
        handleEnd(e, t) {
          (this.manager.actions.stop({ event: e, canceled: t }), this.cleanup());
        }
        handleMove(e, t) {
          let { shape: n } = this.manager.dragOperation,
            r = t.shiftKey ? 5 : 1,
            i = { x: 0, y: 0 },
            a = this.options?.offset ?? iv.offset;
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
          let e = this.manager.registry.plugins.get($_);
          e?.disabled === !1 &&
            (e.disable(),
            Y(this, av).push(() => {
              e.enable();
            }));
        }
        cleanup() {
          (Y(this, av).forEach((e) => e()), Bg(this, av, []));
        }
        destroy() {
          (this.cleanup(), this.listeners.clear());
        }
      }),
      (av = new WeakMap()),
      (ov.configure = _d(ov)),
      (ov.defaults = iv),
      (sv = ov),
      (lv = class extends cp {
        constructor() {
          (super(...arguments), X(this, cv));
        }
        onEvent(e) {
          switch (e.type) {
            case `pointerdown`:
              Bg(this, cv, qp(e));
              break;
            case `pointermove`:
              if (!Y(this, cv)) return;
              let { x: t, y: n } = qp(e),
                r = { x: t - Y(this, cv).x, y: n - Y(this, cv).y },
                { tolerance: i } = this.options;
              if (i && Nu(r, i)) {
                this.abort();
                return;
              }
              Nu(r, this.options.value) && this.activate(e);
              break;
            case `pointerup`:
              this.abort();
              break;
          }
        }
        abort() {
          Bg(this, cv, void 0);
        }
      }),
      (cv = new WeakMap()),
      (fv = class extends cp {
        constructor() {
          (super(...arguments), X(this, uv), X(this, dv));
        }
        onEvent(e) {
          switch (e.type) {
            case `pointerdown`:
              (Bg(this, dv, qp(e)),
                Bg(
                  this,
                  uv,
                  setTimeout(() => this.activate(e), this.options.value),
                ));
              break;
            case `pointermove`:
              if (!Y(this, dv)) return;
              let { x: t, y: n } = qp(e);
              Nu({ x: t - Y(this, dv).x, y: n - Y(this, dv).y }, this.options.tolerance) &&
                this.abort();
              break;
            case `pointerup`:
              this.abort();
              break;
          }
        }
        abort() {
          Y(this, uv) && (clearTimeout(Y(this, uv)), Bg(this, dv, void 0), Bg(this, uv, void 0));
        }
      }),
      (uv = new WeakMap()),
      (dv = new WeakMap()),
      (pv = class {}),
      (pv.Delay = fv),
      (pv.Distance = lv),
      (mv = Object.freeze({
        activationConstraints(e, t) {
          let { pointerType: n, target: r } = e;
          if (!(n === `mouse` && Um(r) && (t.handle === r || t.handle?.contains(r))))
            return n === `touch`
              ? [new pv.Delay({ value: 250, tolerance: 5 })]
              : Km(r) && !e.defaultPrevented
                ? [new pv.Delay({ value: 200, tolerance: 0 })]
                : [new pv.Delay({ value: 200, tolerance: 10 }), new pv.Distance({ value: 5 })];
        },
        preventActivation(e, t) {
          let { target: n } = e;
          return n === t.element || n === t.handle || !Um(n) || t.handle?.contains(n) ? !1 : am(n);
        },
      })),
      (gv = class extends ap {
        constructor(e, t) {
          (super(e),
            (this.manager = e),
            (this.options = t),
            X(this, hv, new Set()),
            (this.listeners = new nh()),
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
          let { activationConstraints: r = mv.activationConstraints } = n ?? {};
          return typeof r == `function` ? r(e, t) : r;
        }
        bind(e, t = this.options) {
          return vl(() => {
            let n = new AbortController(),
              { signal: r } = n,
              i = (n) => {
                Gm(n) && this.handlePointerDown(n, e, t);
              },
              a = [e.handle ?? e.element];
            t?.activatorElements &&
              (a = Array.isArray(t.activatorElements)
                ? t.activatorElements
                : t.activatorElements(e));
            for (let e of a)
              e &&
                (gg(e.ownerDocument.defaultView),
                e.addEventListener(`pointerdown`, i, { signal: r }));
            return () => n.abort();
          });
        }
        handlePointerDown(e, t, n) {
          if (
            this.disabled ||
            !e.isPrimary ||
            e.button !== 0 ||
            !Um(e.target) ||
            t.disabled ||
            pg(e) ||
            !this.manager.dragOperation.status.idle
          )
            return;
          let { preventActivation: r = mv.preventActivation } = n ?? {};
          if (r?.(e, t)) return;
          let { target: i } = e,
            a = Bp(i) && i.draggable && i.getAttribute(`draggable`) === `true`,
            o = Em(t.element),
            { x: s, y: c } = qp(e);
          this.initialCoordinates = { x: s * o.scaleX + o.x, y: c * o.scaleY + o.y };
          let l = this.activationConstraints(e, t, n);
          e.sensor = this;
          let u = new op(l, (e) => this.handleStart(t, e));
          ((u.signal.onabort = () => this.handleCancel(e)), u.onEvent(e), (this.controller = u));
          let d = Jp(),
            f = this.listeners.bind(d, [
              { type: `pointermove`, listener: (e) => this.handlePointerMove(e, t) },
              { type: `pointerup`, listener: this.handlePointerUp, options: { capture: !0 } },
              { type: `pointercancel`, listener: this.handleCancel },
              { type: `dragstart`, listener: a ? this.handleCancel : mg, options: { capture: !0 } },
            ]);
          Y(this, hv).add(() => {
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
            let n = qp(e),
              r = Em(t.element);
            ((n.x = n.x * r.scaleX + r.x),
              (n.y = n.y * r.scaleY + r.y),
              e.preventDefault(),
              e.stopPropagation(),
              (this.latest.event = e),
              (this.latest.coordinates = n),
              Oh.schedule(this.handleMove));
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
          let i = Hp(t.target).body;
          i.setPointerCapture(t.pointerId);
          let a = Um(t.target) ? [t.target, i] : i,
            o = this.listeners.bind(a, [
              { type: `touchmove`, listener: mg, options: { passive: !1 } },
              { type: `click`, listener: mg },
              { type: `contextmenu`, listener: mg },
              { type: `keydown`, listener: this.handleKeyDown },
            ]);
          Y(this, hv).add(o);
        }
        handleCancel(e) {
          let { dragOperation: t } = this.manager;
          (t.status.initialized && this.manager.actions.stop({ event: e, canceled: !0 }),
            this.cleanup());
        }
        cleanup() {
          ((this.latest = { event: void 0, coordinates: void 0 }),
            Y(this, hv).forEach((e) => e()),
            Y(this, hv).clear());
        }
        destroy() {
          (this.cleanup(), this.listeners.clear());
        }
      }),
      (hv = new WeakMap()),
      (gv.configure = _d(gv)),
      (gv.defaults = mv),
      (_v = gv),
      (vv = new WeakSet()),
      (yv = { modifiers: [], plugins: [Jg, $_, Yg, k_, rv], sensors: [_v, sv] }),
      (bv = class extends jp {
        constructor(e = {}) {
          let t = xd(e.plugins, yv.plugins),
            n = xd(e.sensors, yv.sensors),
            r = xd(e.modifiers, yv.modifiers);
          super(kg(Og({}, e), { plugins: [nv, Y_, u_, ...t], sensors: n, modifiers: r }));
        }
      }),
      (kv = class extends ((wv = Wf), (Cv = [H]), (Sv = [H]), (xv = [H]), wv) {
        constructor(e, t) {
          var n = e,
            { element: r, effects: i = () => [], handle: a, feedback: o = `default` } = n,
            s = jg(n, [`element`, `effects`, `handle`, `feedback`]);
          (super(
            Og(
              {
                effects: () => [
                  ...i(),
                  () => {
                    let { manager: e } = this;
                    if (!e) return;
                    let t = (this.sensors?.map(vd) ?? [...e.sensors]).map((t) => {
                      let n = t instanceof ap ? t : e.registry.register(t.plugin),
                        r = t instanceof ap ? void 0 : t.options;
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
            X(this, Ev, J(Tv, 8, this)),
            J(Tv, 11, this),
            X(this, Dv, J(Tv, 12, this)),
            J(Tv, 15, this),
            X(this, Ov, J(Tv, 16, this)),
            J(Tv, 19, this),
            (this.element = r),
            (this.handle = a),
            (this.feedback = o));
        }
      }),
      (Tv = Mg(wv)),
      (Ev = new WeakMap()),
      (Dv = new WeakMap()),
      (Ov = new WeakMap()),
      Lg(Tv, 4, `handle`, Cv, kv, Ev),
      Lg(Tv, 4, `element`, Sv, kv, Dv),
      Lg(Tv, 4, `feedback`, xv, kv, Ov),
      Ig(Tv, kv),
      (Bv = class extends ((Mv = ip), (jv = [H]), (Av = [H]), Mv) {
        constructor(e, t) {
          var n = e,
            { element: r, effects: i = () => [] } = n,
            a = jg(n, [`element`, `effects`]);
          let { collisionDetector: o = Gh } = a,
            s = (e) => {
              let { manager: t, element: n } = this;
              if (!n || e === null) {
                this.shape = void 0;
                return;
              }
              if (!t) return;
              let r = new zh(n),
                i = B(() => this.shape);
              return r && i?.equals(r) ? i : ((this.shape = r), r);
            },
            c = cl(!1);
          (super(
            kg(Og({}, a), {
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
                    let t = new Eh(e, s);
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
            X(this, Rv),
            X(this, Pv, J(Nv, 8, this)),
            J(Nv, 11, this),
            X(this, zv, J(Nv, 12, this)),
            J(Nv, 15, this),
            (this.element = r),
            (this.refreshShape = () => s()));
        }
        set element(e) {
          Bg(this, Rv, e, Lv);
        }
        get element() {
          return this.proxy ?? Y(this, Rv, Iv);
        }
      }),
      (Nv = Mg(Mv)),
      (Pv = new WeakMap()),
      (Rv = new WeakSet()),
      (zv = new WeakMap()),
      (Fv = Lg(Nv, 20, `#element`, jv, Rv, Pv)),
      (Iv = Fv.get),
      (Lv = Fv.set),
      Lg(Nv, 4, `proxy`, Av, Bv, zv),
      Ig(Nv, Bv));
  });
function Hv(e) {
  return typeof e == `object` && !!e && `current` in e;
}
function Uv(e) {
  if (e != null) return Hv(e) ? (e.current ?? void 0) : e;
}
var Wv = t(() => {});
function Gv() {
  let e = (0, $v.useState)(0)[1];
  return (0, $v.useCallback)(() => {
    e((e) => e + 1);
  }, [e]);
}
function Kv(e, t = !1) {
  let n = (0, $v.useRef)(e.peek()),
    r = (0, $v.useRef)(!1),
    i = Gv();
  return (
    ty(
      () =>
        vl(() => {
          let a = n.current,
            o = e.value;
          if (a !== o) {
            if (((n.current = o), !r.current)) return;
            t ? (0, ey.flushSync)(i) : i();
          }
        }),
      [e, t, i],
    ),
    {
      get value() {
        return ((r.current = !0), e.peek());
      },
    }
  );
}
function qv(e, t = [], n = !1) {
  let r = (0, $v.useRef)(e);
  return (
    (r.current = e),
    Kv(
      (0, $v.useMemo)(() => kl(() => r.current()), t),
      n,
    )
  );
}
function Jv(e, t) {
  let n = (0, $v.useRef)(new Map()),
    r = Gv();
  return (
    ty(() => {
      if (!e) {
        n.current.clear();
        return;
      }
      return vl(() => {
        let i = !1,
          a = !1;
        for (let r of n.current) {
          let [o] = r,
            s = B(() => r[1]),
            c = e[o];
          s !== c && ((i = !0), n.current.set(o, c), (a = t?.(o, s, c) ?? !1));
        }
        i && (a ? (0, ey.flushSync)(r) : r());
      });
    }, [e]),
    (0, $v.useMemo)(
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
function Yv(e, t) {
  e();
}
function Xv(e) {
  let t = (0, $v.useRef)(e);
  return (
    ty(() => {
      t.current = e;
    }, [e]),
    t
  );
}
function Zv(e, t, n = $v.useEffect, r = Object.is) {
  let i = (0, $v.useRef)(e);
  n(() => {
    let n = i.current;
    r(e, n) || ((i.current = e), t(e, n));
  }, [t, e]);
}
function Qv(e, t) {
  let n = (0, $v.useRef)(Uv(e));
  ty(() => {
    let r = Uv(e);
    r !== n.current && ((n.current = r), t(r));
  });
}
var $v,
  ey,
  ty,
  ny = t(() => {
    (($v = e(r(), 1)),
      ju(),
      (ey = e(a(), 1)),
      Wv(),
      (ty =
        typeof window < `u` &&
        window.document !== void 0 &&
        window.document.createElement !== void 0
          ? $v.useLayoutEffect
          : $v.useEffect));
  });
function ry(e) {
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
    l = xy(t, [
      `children`,
      `onCollision`,
      `onBeforeDragStart`,
      `onDragStart`,
      `onDragMove`,
      `onDragOver`,
      `onDragEnd`,
    ]);
  let u = (0, Z.useRef)(null),
    { plugins: d, modifiers: f, sensors: p } = l,
    m = xd(d, yv.plugins),
    h = xd(p, yv.sensors),
    g = xd(f, yv.modifiers),
    _ = Xv(i),
    v = Xv(a),
    y = Xv(s),
    b = Xv(o),
    x = Xv(c),
    S = Xv(r),
    C = iy(() => l.manager ?? new bv(l));
  return (
    (0, Z.useEffect)(() => {
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
    Zv(m, () => C && (C.plugins = m), ...wy),
    Zv(h, () => C && (C.sensors = h), ...wy),
    Zv(g, () => C && (C.modifiers = g), ...wy),
    (0, dy.jsxs)(Sy.Provider, { value: C, children: [(0, dy.jsx)(Cy, { ref: u, children: n }), n] })
  );
}
function iy(e) {
  let t = (0, Z.useRef)(null);
  return (
    (t.current ||= e()), (0, Z.useInsertionEffect)(() => () => t.current?.destroy(), []), t.current
  );
}
function ay() {
  return (0, Z.useContext)(Sy);
}
function oy(e) {
  let t = ay() ?? void 0,
    [n] = (0, Z.useState)(() => e(t));
  return (n.manager !== t && (n.manager = t), ty(n.register, [t, n]), n);
}
function sy({ children: e, className: t, dropAnimation: n, style: r, tag: i, disabled: a }) {
  let o = (0, Z.useRef)(null),
    s = ay(),
    c = qv(() => s?.dragOperation.source, [s]).value ?? null,
    l = typeof a == `function` ? a(c) : a;
  ((0, Z.useEffect)(() => {
    if (!o.current || !s || l) return;
    let e = s.plugins.find((e) => e instanceof k_);
    if (e)
      return (
        (e.overlay = o.current),
        () => {
          e.overlay = void 0;
        }
      );
  }, [s, l]),
    (0, Z.useEffect)(() => {
      if (!s) return;
      let e = s.plugins.find((e) => e instanceof k_);
      if (e)
        return (
          (e.dropAnimation = n),
          () => {
            e.dropAnimation = void 0;
          }
        );
    }, [s, n]));
  let u = (0, Z.useMemo)(() => {
    if (!s) return null;
    let e = new Proxy(s.registry, {
      get(e, t) {
        return t === `register` || t === `unregister` ? cy : e[t];
      },
    });
    return new Proxy(s, {
      get(t, n) {
        return n === `registry` ? e : t[n];
      },
    });
  }, [s]);
  return (0, dy.jsx)(Sy.Provider, {
    value: u,
    children: (0, Z.createElement)(
      i || `div`,
      { ref: o, className: t, style: r, "data-dnd-overlay": !0 },
      d(),
    ),
  });
  function d() {
    return !c || l
      ? null
      : typeof e == `function`
        ? (0, dy.jsx)(ly, { source: c, children: e })
        : e;
  }
}
function cy() {
  return () => {};
}
function ly({ children: e, source: t }) {
  return e(Jv(t));
}
function uy(e) {
  let { collisionDetector: t, data: n, disabled: r, element: i, id: a, accept: o, type: s } = e,
    c = oy((t) => new Bv(by(yy({}, e), { register: !1, element: Uv(i) }), t)),
    l = Jv(c);
  return (
    Zv(a, () => (c.id = a)),
    Qv(i, (e) => (c.element = e)),
    Zv(o, () => (c.accept = o), void 0, Al),
    Zv(t, () => (c.collisionDetector = t ?? Qy)),
    Zv(n, () => n && (c.data = n)),
    Zv(r, () => (c.disabled = r === !0)),
    Zv(s, () => (c.type = s)),
    {
      droppable: l,
      get isDropTarget() {
        return l.isDropTarget;
      },
      ref: (0, Z.useCallback)(
        (e) => {
          (!e && c.element?.isConnected && !c.manager?.dragOperation.status.idle) ||
            (c.element = e ?? void 0);
        },
        [c],
      ),
    }
  );
}
var Z,
  dy,
  fy,
  py,
  my,
  hy,
  gy,
  _y,
  vy,
  yy,
  by,
  xy,
  Sy,
  Cy,
  wy,
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
  $y = t(() => {
    ((Z = e(r(), 1)),
      Vv(),
      ny(),
      ju(),
      (dy = i()),
      Wv(),
      Mp(),
      (fy = Object.defineProperty),
      (py = Object.defineProperties),
      (my = Object.getOwnPropertyDescriptors),
      (hy = Object.getOwnPropertySymbols),
      (gy = Object.prototype.hasOwnProperty),
      (_y = Object.prototype.propertyIsEnumerable),
      (vy = (e, t, n) =>
        t in e
          ? fy(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (yy = (e, t) => {
        for (var n in (t ||= {})) gy.call(t, n) && vy(e, n, t[n]);
        if (hy) for (var n of hy(t)) _y.call(t, n) && vy(e, n, t[n]);
        return e;
      }),
      (by = (e, t) => py(e, my(t))),
      (xy = (e, t) => {
        var n = {};
        for (var r in e) gy.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && hy)
          for (var r of hy(e)) t.indexOf(r) < 0 && _y.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (Sy = (0, Z.createContext)(new bv())),
      (Cy = (0, Z.memo)(
        (0, Z.forwardRef)(({ children: e }, t) => {
          let [n, r] = (0, Z.useState)(0),
            i = (0, Z.useRef)(null),
            a = (0, Z.useRef)(null),
            o = (0, Z.useMemo)(
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
                    (0, Z.startTransition)(() => {
                      (e(), r((e) => e + 1));
                    }));
                },
              }),
              [],
            );
          return (
            ty(() => {
              var e;
              ((e = a.current) == null || e.call(a), (i.current = null));
            }, [e, n]),
            (0, Z.useImperativeHandle)(t, () => o),
            null
          );
        }),
      )),
      (wy = [void 0, Al]),
      (Ty = Object.create),
      (Ey = Object.defineProperty),
      (Dy = Object.getOwnPropertyDescriptor),
      (Oy = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (ky = (e) => {
        throw TypeError(e);
      }),
      (Ay = (e, t, n) =>
        t in e
          ? Ey(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (jy = (e) => [, , , Ty(e?.[Oy(`metadata`)] ?? null)]),
      (My = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Ny = (e) => (e !== void 0 && typeof e != `function` ? ky(`Function expected`) : e)),
      (Py = (e, t, n, r, i) => ({
        kind: My[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? ky(`Already initialized`) : i.push(Ny(e || null))),
      })),
      (Fy = (e, t) => Ay(t, Oy(`metadata`), e[3])),
      (Iy = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++) a[i].call(n);
        return r;
      }),
      (Ly = (e, t, n, r, i, a) => {
        for (
          var o,
            s,
            c,
            l,
            u = t & 7,
            d = !1,
            f = !1,
            p = 2,
            m = My[u + 5],
            h = e[p] || (e[p] = []),
            g = ((i = i.prototype), Dy(i, n)),
            _ = r.length - 1;
          _ >= 0;
          _--
        )
          ((c = Py(u, n, (s = {}), e[3], h)),
            (c.static = d),
            (c.private = f),
            (l = c.access = { has: (e) => n in e }),
            (l.get = (e) => e[n]),
            (o = (0, r[_])(g[m], c)),
            (s._ = 1),
            Ny(o) && (g[m] = o));
        return (g && Ey(i, n, g), i);
      }),
      (Ry = (e, t, n) => t.has(e) || ky(`Cannot ` + n)),
      (zy = (e, t, n) => (Ry(e, t, `read from private field`), t.get(e))),
      (By = (e, t, n) =>
        t.has(e)
          ? ky(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Vy = (e, t, n, r) => (Ry(e, t, `write to private field`), t.set(e, n), n)),
      (Hy = class e {
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
      (Jy = class extends ((Gy = Ou), (Wy = [jl]), (Uy = [jl]), Gy) {
        constructor(e) {
          let t = Hy.from(e);
          (super(t, (e, t) => Hy.equals(e, t)),
            Iy(qy, 5, this),
            By(this, Ky, 0),
            (this.velocity = { x: 0, y: 0 }));
        }
        get delta() {
          return Hy.delta(this.current, this.initial);
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
            n = Hy.from(e),
            r = { x: n.x - t.x, y: n.y - t.y },
            i = Date.now(),
            a = i - zy(this, Ky),
            o = (e) => Math.round((e / a) * 100);
          al(() => {
            (Vy(this, Ky, i), (this.velocity = { x: o(r.x), y: o(r.y) }), (super.current = n));
          });
        }
        reset(e = this.defaultValue) {
          (super.reset(Hy.from(e)), (this.velocity = { x: 0, y: 0 }));
        }
      }),
      (qy = jy(Gy)),
      (Ky = new WeakMap()),
      Ly(qy, 2, `delta`, Wy, Jy),
      Ly(qy, 2, `direction`, Uy, Jy),
      Fy(qy, Jy),
      (Yy = ((e) => ((e.Horizontal = `x`), (e.Vertical = `y`), e))(Yy || {})),
      Object.values(Yy),
      (Xy = ({ dragOperation: e, droppable: t }) => {
        let n = e.position.current;
        if (!n) return null;
        let { id: r } = t;
        return t.shape && t.shape.containsPoint(n)
          ? {
              id: r,
              value: 1 / Hy.distance(t.shape.center, n),
              type: uf.PointerIntersection,
              priority: lf.High,
            }
          : null;
      }),
      (Zy = ({ dragOperation: e, droppable: t }) => {
        let { shape: n } = e;
        if (!t.shape || !n?.current) return null;
        let r = n.current.intersectionArea(t.shape);
        if (r) {
          let { position: i } = e,
            a = Hy.distance(t.shape.center, i.current),
            o = r / (n.current.area + t.shape.area - r) / a;
          return { id: t.id, value: o, type: uf.ShapeIntersection, priority: lf.Normal };
        }
        return null;
      }),
      (Qy = (e) => Xy(e) ?? Zy(e)));
  });
function eb(e) {
  return e instanceof ox || e instanceof ax;
}
function tb(e) {
  let { x: t, y: n } = e;
  if (t > 0) return `right`;
  if (t < 0) return `left`;
  if (n > 0) return `down`;
  if (n < 0) return `up`;
}
function nb(e, t, n) {
  if (t === n) return e;
  let r = e.slice();
  return (r.splice(n, 0, r.splice(t, 1)[0]), r);
}
function rb(e) {
  return (
    `initialIndex` in e &&
    typeof e.initialIndex == `number` &&
    `index` in e &&
    typeof e.index == `number`
  );
}
function ib(e, t, n) {
  let { source: r, target: i, canceled: a } = t.operation;
  if (!r || !i || a) return (`preventDefault` in t && t.preventDefault(), e);
  let o = (e, t) => e === t || (typeof e == `object` && `id` in e && e.id === t);
  if (Array.isArray(e)) {
    let s = e.findIndex((e) => o(e, r.id)),
      c = e.findIndex((e) => o(e, i.id));
    if (s === -1 || c === -1) {
      if (rb(r)) {
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
  if (c === -1 && rb(r)) {
    let i = r.initialGroup,
      a = r.initialIndex,
      o = r.group,
      s = r.index;
    if (i == null || o == null || !(i in e) || !(o in e) || (i === o && a === s))
      return (`preventDefault` in t && t.preventDefault(), e);
    if (i === o) return Wb(Ub({}, e), { [i]: n(e[i], a, s) });
    let c = e[i][a];
    return Wb(Ub({}, e), {
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
    if (l != null && l === d && c === u && rb(r)) {
      let t = r.group != null && r.group !== l,
        i = r.index !== c;
      if (t || i) {
        let t = r.group ?? l;
        if (t in e) {
          if (l === t) return Wb(Ub({}, e), { [l]: n(e[l], c, r.index) });
          let i = e[l][c];
          return Wb(Ub({}, e), {
            [l]: [...e[l].slice(0, c), ...e[l].slice(c + 1)],
            [t]: [...e[t].slice(0, r.index), i, ...e[t].slice(r.index)],
          });
        }
      }
    }
    return (`preventDefault` in t && t.preventDefault(), e);
  }
  if (l === d) return Wb(Ub({}, e), { [l]: n(e[l], c, u) });
  let m = i.shape && Math.round(p.y) > Math.round(i.shape.center.y) ? 1 : 0,
    h = e[l][c];
  return Wb(Ub({}, e), {
    [l]: [...e[l].slice(0, c), ...e[l].slice(c + 1)],
    [d]: [...e[d].slice(0, u + m), h, ...e[d].slice(u + m)],
  });
}
function ab(e, t) {
  return ib(e, t, nb);
}
function ob(e, t, n, r) {
  let i = r < t ? `afterend` : `beforebegin`;
  n.insertAdjacentElement(i, e);
}
function sb(e, t) {
  return e.index - t.index;
}
function cb(e) {
  return Array.from(e).sort(sb);
}
var lb,
  ub,
  db,
  fb,
  pb,
  mb,
  hb,
  gb,
  _b,
  vb,
  yb,
  bb,
  xb,
  Sb,
  Cb,
  wb,
  Tb,
  Eb,
  Db,
  Ob,
  kb,
  Ab,
  jb,
  Mb,
  Nb,
  Pb,
  Fb,
  Ib,
  Lb,
  Rb,
  zb,
  Bb,
  Vb,
  Hb,
  Ub,
  Wb,
  Gb,
  Kb,
  qb,
  Jb,
  Yb,
  Xb,
  Zb,
  Qb,
  $b,
  ex,
  tx,
  nx,
  rx,
  ix,
  ax,
  ox,
  sx = t(() => {
    (ju(),
      qh(),
      Vv(),
      Hh(),
      Mp(),
      hd(),
      (lb = Object.create),
      (ub = Object.defineProperty),
      (db = Object.defineProperties),
      (fb = Object.getOwnPropertyDescriptor),
      (pb = Object.getOwnPropertyDescriptors),
      (mb = Object.getOwnPropertySymbols),
      (hb = Object.prototype.hasOwnProperty),
      (gb = Object.prototype.propertyIsEnumerable),
      (_b = (e, t) => ((t = Symbol[e]) ? t : Symbol.for(`Symbol.` + e))),
      (vb = (e) => {
        throw TypeError(e);
      }),
      (yb = (e, t, n) =>
        t in e
          ? ub(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (bb = (e, t) => {
        for (var n in (t ||= {})) hb.call(t, n) && yb(e, n, t[n]);
        if (mb) for (var n of mb(t)) gb.call(t, n) && yb(e, n, t[n]);
        return e;
      }),
      (xb = (e, t) => db(e, pb(t))),
      (Sb = (e, t) => {
        var n = {};
        for (var r in e) hb.call(e, r) && t.indexOf(r) < 0 && (n[r] = e[r]);
        if (e != null && mb)
          for (var r of mb(e)) t.indexOf(r) < 0 && gb.call(e, r) && (n[r] = e[r]);
        return n;
      }),
      (Cb = (e) => [, , , lb(null)]),
      (wb = [`class`, `method`, `getter`, `setter`, `accessor`, `field`, `value`, `get`, `set`]),
      (Tb = (e) => (e !== void 0 && typeof e != `function` ? vb(`Function expected`) : e)),
      (Eb = (e, t, n, r, i) => ({
        kind: wb[e],
        name: t,
        metadata: r,
        addInitializer: (e) => (n._ ? vb(`Already initialized`) : i.push(Tb(e || null))),
      })),
      (Db = (e, t) => yb(t, _b(`metadata`), e[3])),
      (Ob = (e, t, n, r) => {
        for (var i = 0, a = e[t >> 1], o = a && a.length; i < o; i++)
          t & 1 ? a[i].call(n) : (r = a[i].call(n, r));
        return r;
      }),
      (kb = (e, t, n, r, i, a) => {
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
            h = wb[d + 5],
            g = (e[m - 1] = []),
            _ = e[m] || (e[m] = []),
            v =
              ((i = i.prototype),
              fb(
                {
                  get [n]() {
                    return jb(this, a);
                  },
                  set [n](e) {
                    return Nb(this, a, e);
                  },
                },
                n,
              )),
            y = r.length - 1;
          y >= 0;
          y--
        )
          ((l = Eb(d, n, (c = {}), e[3], _)),
            (l.static = f),
            (l.private = p),
            (u = l.access = { has: (e) => n in e }),
            (u.get = (e) => e[n]),
            (u.set = (e, t) => (e[n] = t)),
            (s = (0, r[y])({ get: v.get, set: v.set }, l)),
            (c._ = 1),
            s === void 0
              ? Tb(s) && (v[h] = s)
              : typeof s != `object` || !s
                ? vb(`Object expected`)
                : (Tb((o = s.get)) && (v.get = o),
                  Tb((o = s.set)) && (v.set = o),
                  Tb((o = s.init)) && g.unshift(o)));
        return (v && ub(i, n, v), i);
      }),
      (Ab = (e, t, n) => t.has(e) || vb(`Cannot ` + n)),
      (jb = (e, t, n) => (Ab(e, t, `read from private field`), t.get(e))),
      (Mb = (e, t, n) =>
        t.has(e)
          ? vb(`Cannot add the same private member more than once`)
          : t instanceof WeakSet
            ? t.add(e)
            : t.set(e, n)),
      (Nb = (e, t, n, r) => (Ab(e, t, `write to private field`), t.set(e, n), n)),
      (Pb = 10),
      (Fb = class extends Zd {
        constructor(e) {
          super(e);
          let t = vl(() => {
              let { dragOperation: t } = e;
              if (Wm(t.activatorEvent) && eb(t.source) && t.status.initialized) {
                let t = e.registry.plugins.get(Y_);
                if (t) return (t.disable(), () => t.enable());
              }
            }),
            n = e.monitor.addEventListener(`dragmove`, (e, t) => {
              queueMicrotask(() => {
                if (this.disabled || e.defaultPrevented || !e.nativeEvent) return;
                let { dragOperation: n } = t;
                if (!Wm(e.nativeEvent) || !eb(n.source) || !n.shape) return;
                let { actions: r, collisionObserver: i, registry: a } = t,
                  { by: o } = e;
                if (!o) return;
                let s = tb(o),
                  { source: c, target: l } = n,
                  { center: u } = n.shape.current,
                  d = [],
                  f = [];
                (al(() => {
                  for (let e of a.droppables) {
                    let { id: t } = e;
                    if (!e.accepts(c) || (t === l?.id && eb(e)) || !e.element) continue;
                    let n = e.shape,
                      r = new zh(e.element, { getBoundingClientRect: (e) => Kp(e, void 0, 0.2) });
                    !r.height ||
                      !r.width ||
                      (((s == `down` && u.y + Pb < r.center.y) ||
                        (s == `up` && u.y - Pb > r.center.y) ||
                        (s == `left` && u.x - Pb > r.center.x) ||
                        (s == `right` && u.x + Pb < r.center.x)) &&
                        (d.push(e), (e.shape = r), f.push(() => (e.shape = n))));
                  }
                }),
                  e.preventDefault(),
                  i.disable());
                let p = i.computeCollisions(d, Kh);
                al(() => f.forEach((e) => e()));
                let [m] = p;
                if (!m) return;
                let { id: h } = m,
                  { index: g, group: _ } = c.sortable;
                r.setDropTarget(h).then(() => {
                  let { source: e, target: t, shape: a } = n;
                  if (!e || !eb(e) || !a) return;
                  let { index: o, group: s, target: c } = e.sortable,
                    l = g !== o || _ !== s,
                    u = l ? c : t?.element;
                  if (!u) return;
                  Pm(u);
                  let d = new zh(u);
                  if (!d) return;
                  let f = od.delta(d, od.from(a.current.boundingRectangle), e.alignment);
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
      (Ib = Object.defineProperty),
      (Lb = Object.defineProperties),
      (Rb = Object.getOwnPropertyDescriptors),
      (zb = Object.getOwnPropertySymbols),
      (Bb = Object.prototype.hasOwnProperty),
      (Vb = Object.prototype.propertyIsEnumerable),
      (Hb = (e, t, n) =>
        t in e
          ? Ib(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (Ub = (e, t) => {
        for (var n in (t ||= {})) Bb.call(t, n) && Hb(e, n, t[n]);
        if (zb) for (var n of zb(t)) Vb.call(t, n) && Hb(e, n, t[n]);
        return e;
      }),
      (Wb = (e, t) => Lb(e, Rb(t))),
      (Gb = `__default__`),
      (Kb = class extends Zd {
        constructor(e) {
          super(e);
          let t = () => {
              let t = new Map();
              for (let n of e.registry.droppables)
                if (n instanceof ox) {
                  let { sortable: e } = n,
                    { group: r } = e,
                    i = t.get(r);
                  (i || ((i = new Set()), t.set(r, i)), i.add(e));
                }
              for (let [e, n] of t) t.set(e, new Set(cb(n)));
              return t;
            },
            n = [
              e.monitor.addEventListener(`dragover`, (e, n) => {
                if (this.disabled) return;
                let { dragOperation: r } = n,
                  { source: i, target: a } = r;
                if (!eb(i) || !eb(a) || i.sortable === a.sortable) return;
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
                        let f = cb(c),
                          p = s ? f : cb(l),
                          m = i.sortable.group ?? Gb,
                          h = a.sortable.group ?? Gb,
                          g = { [m]: f, [h]: p },
                          _ = ab(g, e);
                        if (g === _) return;
                        let v = _[h].indexOf(i.sortable),
                          y = _[h].indexOf(a.sortable);
                        (n.collisionObserver.disable(),
                          ob(u, v, d, y),
                          al(() => {
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
                eb(i) &&
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
                          let t = cb(r),
                            n = i.sortable.element,
                            a = t[i.sortable.initialIndex],
                            o = a?.element;
                          !a ||
                            !o ||
                            !n ||
                            (ob(n, a.index, o, i.index),
                            al(() => {
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
      (qb = [Fb, Kb]),
      (Jb = { duration: 250, easing: `cubic-bezier(0.25, 1, 0.5, 1)`, idle: !1 }),
      (Yb = new Au()),
      (Zb = [H]),
      (Xb = [H]),
      (ix = class {
        constructor(e, t) {
          (Mb(this, $b, Ob(Qb, 8, this)),
            Ob(Qb, 11, this),
            Mb(this, ex),
            Mb(this, tx),
            Mb(this, nx, Ob(Qb, 12, this)),
            Ob(Qb, 15, this),
            Mb(this, rx),
            (this.register = () => (
              al(() => {
                var e, t;
                ((e = this.manager) == null || e.registry.register(this.droppable),
                  (t = this.manager) == null || t.registry.register(this.draggable));
              }),
              () => this.unregister()
            )),
            (this.unregister = () => {
              al(() => {
                var e, t;
                ((e = this.manager) == null || e.registry.unregister(this.droppable),
                  (t = this.manager) == null || t.registry.unregister(this.draggable));
              });
            }),
            (this.destroy = () => {
              al(() => {
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
              transition: c = Jb,
              plugins: l = qb,
            } = n,
            u = Sb(n, [`effects`, `group`, `index`, `sensors`, `type`, `transition`, `plugins`]);
          ((this.droppable = new ox(u, t, this)),
            (this.draggable = new ax(
              xb(bb({}, u), {
                effects: () => [
                  () => {
                    let e = this.manager?.dragOperation.status;
                    (e?.initializing &&
                      this.id === this.manager?.dragOperation.source?.id &&
                      Yb.clear(this.manager),
                      e?.dragging &&
                        Yb.set(
                          this.manager,
                          this.id,
                          B(() => ({ initialIndex: this.index, initialGroup: this.group })),
                        ));
                  },
                  () => {
                    let { index: e, group: t, manager: n } = this,
                      r = jb(this, tx),
                      i = jb(this, ex);
                    (e !== r || t !== i) && (Nb(this, tx, e), Nb(this, ex, t), this.animate());
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
            Nb(this, rx, u.element),
            (this.manager = t),
            (this.index = a),
            Nb(this, tx, a),
            (this.group = i),
            Nb(this, ex, i),
            (this.type = s),
            (this.transition = c));
        }
        get initialIndex() {
          return Yb.get(this.manager, this.id)?.initialIndex ?? this.index;
        }
        get initialGroup() {
          return Yb.get(this.manager, this.id)?.initialGroup ?? this.group;
        }
        animate() {
          B(() => {
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
                  { translate: o } = bm(r),
                  s = Rm(r, o, !1),
                  c = Rm(r, o);
                if (a.x || a.y) {
                  let n = $p(Rp(r)) ? xb(bb({}, t), { duration: 0 }) : t;
                  Lm({
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
          al(() => {
            ((this.draggable.manager = e), (this.droppable.manager = e));
          });
        }
        set element(e) {
          al(() => {
            let t = jb(this, rx),
              n = this.droppable.element,
              r = this.draggable.element;
            ((!n || n === t) && (this.droppable.element = e),
              (!r || r === t) && (this.draggable.element = e),
              Nb(this, rx, e));
          });
        }
        get element() {
          let e = jb(this, rx);
          if (e) return th.get(e) ?? e ?? this.droppable.element;
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
          al(() => {
            ((this.droppable.disabled = e), (this.draggable.disabled = e));
          });
        }
        set data(e) {
          al(() => {
            ((this.droppable.data = e), (this.draggable.data = e));
          });
        }
        set handle(e) {
          this.draggable.handle = e;
        }
        set id(e) {
          al(() => {
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
          this.droppable.collisionDetector = e ?? Gh;
        }
        set alignment(e) {
          this.draggable.alignment = e;
        }
        get alignment() {
          return this.draggable.alignment;
        }
        set type(e) {
          al(() => {
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
      (Qb = Cb()),
      ($b = new WeakMap()),
      (ex = new WeakMap()),
      (tx = new WeakMap()),
      (nx = new WeakMap()),
      (rx = new WeakMap()),
      kb(Qb, 4, `index`, Zb, ix, $b),
      kb(Qb, 4, `group`, Xb, ix, nx),
      Db(Qb, ix),
      (ax = class extends kv {
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
      (ox = class extends Bv {
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
function cx(e) {
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
    g = vx(vx({}, Jb), e.transition),
    _ = oy(
      (t) =>
        new ix(
          yx(vx({}, e), {
            transition: g,
            register: !1,
            handle: Uv(s),
            element: Uv(o),
            target: Uv(m),
            feedback: d,
          }),
          t,
        ),
    ),
    v = Jv(_, lx);
  return (
    Zv(i, () => (_.id = i)),
    ty(() => {
      al(() => {
        ((_.group = l), (_.index = c));
      });
    }, [_, l, c]),
    Zv(h, () => (_.type = h)),
    Zv(t, () => (_.accept = t), void 0, Al),
    Zv(a, () => a && (_.data = a)),
    Zv(
      c,
      () => {
        _.manager?.dragOperation.status.idle && g?.idle && _.refreshShape();
      },
      Yv,
    ),
    Qv(s, (e) => (_.handle = e)),
    Qv(o, (e) => (_.element = e)),
    Qv(m, (e) => (_.target = e)),
    Zv(u, () => (_.disabled = u === !0)),
    Zv(p, () => (_.sensors = p)),
    Zv(n, () => (_.collisionDetector = n)),
    Zv(r, () => (_.collisionPriority = r)),
    Zv(d, () => (_.feedback = d ?? `default`)),
    Zv(g, () => (_.transition = g), void 0, Al),
    Zv(f, () => (_.modifiers = f), void 0, Al),
    Zv(e.alignment, () => (_.alignment = e.alignment)),
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
      handleRef: (0, ux.useCallback)(
        (e) => {
          _.handle = e ?? void 0;
        },
        [_],
      ),
      ref: (0, ux.useCallback)(
        (e) => {
          (!e && _.element?.isConnected && !_.manager?.dragOperation.status.idle) ||
            (_.element = e ?? void 0);
        },
        [_],
      ),
      sourceRef: (0, ux.useCallback)(
        (e) => {
          (!e && _.source?.isConnected && !_.manager?.dragOperation.status.idle) ||
            (_.source = e ?? void 0);
        },
        [_],
      ),
      targetRef: (0, ux.useCallback)(
        (e) => {
          (!e && _.target?.isConnected && !_.manager?.dragOperation.status.idle) ||
            (_.target = e ?? void 0);
        },
        [_],
      ),
    }
  );
}
function lx(e, t, n) {
  return !!(e === `isDragSource` && !n && t);
}
var ux,
  dx,
  fx,
  px,
  mx,
  hx,
  gx,
  _x,
  vx,
  yx,
  bx = t(() => {
    ((ux = e(r(), 1)),
      ju(),
      sx(),
      $y(),
      ny(),
      Wv(),
      (dx = Object.defineProperty),
      (fx = Object.defineProperties),
      (px = Object.getOwnPropertyDescriptors),
      (mx = Object.getOwnPropertySymbols),
      (hx = Object.prototype.hasOwnProperty),
      (gx = Object.prototype.propertyIsEnumerable),
      (_x = (e, t, n) =>
        t in e
          ? dx(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n })
          : (e[t] = n)),
      (vx = (e, t) => {
        for (var n in (t ||= {})) hx.call(t, n) && _x(e, n, t[n]);
        if (mx) for (var n of mx(t)) gx.call(t, n) && _x(e, n, t[n]);
        return e;
      }),
      (yx = (e, t) => fx(e, px(t))));
  }),
  xx,
  Sx = t(() => {
    xx = {
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
  Cx,
  wx,
  Tx = t(() => {
    ((Cx = e(r(), 1)),
      Sx(),
      (wx = (e, t, n, r) => {
        let i = (0, Cx.forwardRef)(
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
            (0, Cx.createElement)(
              `svg`,
              {
                ref: u,
                ...xx[e],
                width: i,
                height: i,
                className: [`tabler-icon`, `tabler-icon-${t}`, s].join(` `),
                ...(e === `filled` ? { fill: n } : { strokeWidth: a, stroke: n }),
                ...l,
              },
              [
                o && (0, Cx.createElement)(`title`, { key: `svg-title` }, o),
                ...r.map(([e, t]) => (0, Cx.createElement)(e, t)),
                ...(Array.isArray(c) ? c : [c]),
              ],
            ),
        );
        return ((i.displayName = `${n}`), i);
      }));
  }),
  Ex,
  Dx,
  Ox = t(() => {
    (Tx(),
      (Ex = [
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
      (Dx = wx(`outline`, `bell-off`, `BellOff`, Ex)));
  }),
  kx,
  Ax,
  jx = t(() => {
    (Tx(),
      (kx = [
        [
          `path`,
          {
            d: `M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6`,
            key: `svg-0`,
          },
        ],
        [`path`, { d: `M9 17v1a3 3 0 0 0 6 0v-1`, key: `svg-1` }],
      ]),
      (Ax = wx(`outline`, `bell`, `Bell`, kx)));
  }),
  Mx,
  Nx,
  Px = t(() => {
    (Tx(),
      (Mx = [
        [`path`, { d: `M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0`, key: `svg-0` }],
        [`path`, { d: `M4 8v-2a2 2 0 0 1 2 -2h2`, key: `svg-1` }],
        [`path`, { d: `M4 16v2a2 2 0 0 0 2 2h2`, key: `svg-2` }],
        [`path`, { d: `M16 4h2a2 2 0 0 1 2 2v2`, key: `svg-3` }],
        [`path`, { d: `M16 20h2a2 2 0 0 0 2 -2v-2`, key: `svg-4` }],
      ]),
      (Nx = wx(`outline`, `focus-centered`, `FocusCentered`, Mx)));
  }),
  Fx,
  Ix,
  Lx = t(() => {
    (Tx(),
      (Fx = [
        [`path`, { d: `M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4`, key: `svg-0` }],
        [`path`, { d: `M13.5 6.5l4 4`, key: `svg-1` }],
      ]),
      (Ix = wx(`outline`, `pencil`, `Pencil`, Fx)));
  }),
  Rx,
  zx,
  Bx = t(() => {
    (Tx(),
      (Rx = [
        [`path`, { d: `M18 6l-12 12`, key: `svg-0` }],
        [`path`, { d: `M6 6l12 12`, key: `svg-1` }],
      ]),
      (zx = wx(`outline`, `x`, `X`, Rx)));
  }),
  Vx = t(() => {
    (Ox(), jx(), Px(), Lx(), Bx());
  });
function Hx(e) {
  return Ux.find((t) => t.value === e)?.label ?? Hx(`ping`);
}
var Ux,
  Wx,
  Gx = t(() => {
    ((Ux = [
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
      (Wx = `ping`));
  });
function Kx(e) {
  return e <= 1 ? 1 : e === 2 ? 2 : e === 3 ? 3 : e <= 4 ? 4 : e <= 6 ? 6 : 9;
}
var qx = t(() => {});
async function Jx(e) {
  let t = Yx(e);
  if (t) {
    (t.pause(), (t.currentTime = 0));
    try {
      await t.play();
    } catch {}
  }
}
function Yx(e) {
  let t = Xx.get(e);
  if (t) return t;
  let n = window.__VSMUX_SOUND_URLS__?.[e];
  if (!n) return;
  let r = new Audio(n);
  return ((r.preload = `auto`), Xx.set(e, r), r);
}
var Xx,
  Zx = t(() => {
    Xx = new Map();
  });
function Qx(e, t) {
  return { groupId: e, kind: `session`, sessionId: t };
}
function $x(e) {
  return { groupId: e, kind: `group` };
}
function eS() {
  return { kind: `create-group` };
}
function tS(e) {
  let t = e?.data;
  if (!t || typeof t != `object` || !(`kind` in t)) return;
  let n = t;
  switch (n.kind) {
    case `session`:
      return typeof n.groupId == `string` && typeof n.sessionId == `string` ? n : void 0;
    case `group`:
      return typeof n.groupId == `string` ? n : void 0;
    case `create-group`:
      return n;
    default:
      return;
  }
}
var nS = t(() => {});
function rS({ isVisible: e }) {
  let t = uy({ accept: `session`, data: eS(), id: `create-group` });
  return e
    ? (0, iS.jsxs)(`div`, {
        className: `group-create-target`,
        "data-drop-target": String(t.isDropTarget),
        ref: t.ref,
        children: [
          (0, iS.jsx)(`div`, { className: `group-create-plus`, children: `+` }),
          (0, iS.jsx)(`div`, {
            className: `group-create-copy`,
            children: `Drop here to create a new group`,
          }),
        ],
      })
    : null;
}
var iS,
  aS = t(() => {
    ($y(),
      nS(),
      (iS = i()),
      (rS.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `CreateGroupDropTarget`,
        props: { isVisible: { required: !0, tsType: { name: `boolean` }, description: `` } },
      }));
  }),
  oS,
  sS = t(() => {
    oS = 1050;
  });
function cS({
  aliasHeadingRef: e,
  onClose: t,
  secondaryRef: n,
  session: r,
  showCloseButton: i,
  showHotkeys: a,
}) {
  let o = r.detail ?? r.terminalTitle ?? r.primaryTitle ?? r.activityLabel,
    s = [r.terminalTitle, r.primaryTitle, r.detail].filter((e) => e && e.length > 0).join(`
`);
  return (0, dS.jsxs)(dS.Fragment, {
    children: [
      r.activity === `attention`
        ? (0, dS.jsx)(`div`, { "aria-hidden": !0, className: `session-attention-dot` })
        : null,
      (0, dS.jsxs)(`div`, {
        className: `session-head`,
        children: [
          (0, dS.jsx)(lS, { className: `session-alias-heading`, textRef: e, text: r.alias }),
          i && t
            ? (0, dS.jsx)(`button`, {
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
      (0, dS.jsxs)(`div`, {
        className: `session-footer`,
        children: [
          o
            ? (0, dS.jsx)(lS, { className: `session-secondary`, textRef: n, text: o, tooltip: s })
            : (0, dS.jsx)(`div`, {}),
          (0, dS.jsx)(`div`, {
            className: `session-meta`,
            "data-visible": String(a),
            children: r.shortcutLabel,
          }),
        ],
      }),
    ],
  });
}
function lS({ className: e, text: t, textRef: n, tooltip: r }) {
  let [i, a] = (0, uS.useState)(!1),
    o = (0, uS.useRef)(),
    s = () => {
      o.current !== void 0 && (window.clearTimeout(o.current), (o.current = void 0));
    },
    c = () => {
      (s(), a(!1));
    },
    l = () => {
      let e = n?.current;
      return e ? (e.scrollWidth > e.clientWidth ? !0 : e.scrollHeight > e.clientHeight) : !1;
    },
    u = () => {
      if ((s(), !l())) {
        a(!1);
        return;
      }
      o.current = window.setTimeout(() => {
        (a(!0), (o.current = void 0));
      }, oS);
    };
  (0, uS.useEffect)(
    () => () => {
      s();
    },
    [],
  );
  let d = (0, dS.jsx)(`div`, { className: e, ref: n, children: t });
  return (0, dS.jsxs)(Rs, {
    onOpenChange: (e) => !e && c(),
    open: i,
    children: [
      (0, dS.jsx)(ac, {
        disabled: !0,
        render: (0, dS.jsx)(`div`, {
          className: `session-tooltip-trigger`,
          onBlur: c,
          onFocus: u,
          onMouseEnter: u,
          onMouseLeave: c,
          children: d,
        }),
      }),
      (0, dS.jsx)(vc, {
        children: (0, dS.jsx)(Kc, {
          className: `tooltip-positioner`,
          sideOffset: 8,
          children: (0, dS.jsx)(Xc, { className: `tooltip-popup`, children: r ?? t }),
        }),
      }),
    ],
  });
}
var uS,
  dS,
  fS = t(() => {
    (rl(),
      (uS = e(r())),
      sS(),
      (dS = i()),
      (cS.__docgenInfo = {
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
          secondaryRef: {
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
          session: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  activity: SidebarSessionActivityState;
  activityLabel?: string;
  sessionId: string;
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
                    key: `activity`,
                    value: {
                      name: `union`,
                      raw: `"idle" | "working" | "attention"`,
                      elements: [
                        { name: `literal`, value: `"idle"` },
                        { name: `literal`, value: `"working"` },
                        { name: `literal`, value: `"attention"` },
                      ],
                      required: !0,
                    },
                  },
                  { key: `activityLabel`, value: { name: `string`, required: !1 } },
                  { key: `sessionId`, value: { name: `string`, required: !0 } },
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
          showCloseButton: { required: !0, tsType: { name: `boolean` }, description: `` },
          showHotkeys: { required: !0, tsType: { name: `boolean` }, description: `` },
        },
      }));
  });
function pS({ confirmLabel: e, description: t, isOpen: n, onCancel: r, onConfirm: i, title: a }) {
  return (
    (0, hS.useEffect)(() => {
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
      ? (0, mS.createPortal)(
          (0, gS.jsxs)(`div`, {
            className: `confirm-modal-root`,
            role: `presentation`,
            children: [
              (0, gS.jsx)(`button`, {
                className: `confirm-modal-backdrop`,
                onClick: r,
                type: `button`,
              }),
              (0, gS.jsxs)(`div`, {
                "aria-describedby": `confirm-modal-description`,
                "aria-labelledby": `confirm-modal-title`,
                "aria-modal": `true`,
                className: `confirm-modal`,
                role: `dialog`,
                children: [
                  (0, gS.jsxs)(`div`, {
                    className: `confirm-modal-header`,
                    children: [
                      (0, gS.jsx)(`div`, {
                        className: `confirm-modal-title`,
                        id: `confirm-modal-title`,
                        children: a,
                      }),
                      (0, gS.jsx)(`div`, {
                        className: `confirm-modal-description`,
                        id: `confirm-modal-description`,
                        children: t,
                      }),
                    ],
                  }),
                  (0, gS.jsxs)(`div`, {
                    className: `confirm-modal-actions`,
                    children: [
                      (0, gS.jsx)(`button`, {
                        className: `secondary confirm-modal-button`,
                        onClick: r,
                        type: `button`,
                        children: `Cancel`,
                      }),
                      (0, gS.jsx)(`button`, {
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
var mS,
  hS,
  gS,
  _S = t(() => {
    ((mS = e(a())), (hS = e(r())), (gS = i()));
  });
function vS(e, t) {
  return {
    x: Math.max(wS, Math.min(e, window.innerWidth - TS - wS)),
    y: Math.max(wS, Math.min(t, window.innerHeight - CS - wS)),
  };
}
function yS({ groupId: e, index: t, session: n, showCloseButton: r, showHotkeys: i, vscode: a }) {
  let [o, s] = (0, xS.useState)(),
    c = (0, xS.useRef)(null),
    l = (0, xS.useRef)(null),
    u = (0, xS.useRef)(null),
    d = cx({
      accept: `session`,
      data: Qx(e, n.sessionId),
      disabled: o !== void 0,
      group: e,
      id: n.sessionId,
      index: t,
      type: `session`,
    });
  ((0, xS.useEffect)(() => {
    s(void 0);
  }, [n.alias, n.sessionId]),
    (0, xS.useEffect)(() => {
      if (!o) return;
      let e = (e) => {
          c.current?.contains(e.target) || s(void 0);
        },
        t = (e) => {
          c.current?.contains(e.target) || s(void 0);
        },
        n = (e) => {
          e.key === `Escape` && s(void 0);
        },
        r = () => {
          s(void 0);
        },
        i = () => {
          document.visibilityState !== `visible` && s(void 0);
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
    }, [o]));
  let f = (e, t) => {
      s(vS(e, t));
    },
    p = () => {
      (s(void 0), a.postMessage({ sessionId: n.sessionId, type: `promptRenameSession` }));
    },
    m = () => {
      (s(void 0), a.postMessage({ sessionId: n.sessionId, type: `closeSession` }));
    },
    h = (e) => {
      if (e.key === `ContextMenu` || (e.shiftKey && e.key === `F10`)) {
        (e.preventDefault(), e.stopPropagation());
        let t = e.currentTarget.getBoundingClientRect();
        f(t.left + 24, t.top + 18);
        return;
      }
      (e.key !== `Enter` && e.key !== ` `) ||
        (e.preventDefault(),
        e.stopPropagation(),
        a.postMessage({ sessionId: n.sessionId, type: `focusSession` }));
    };
  return (0, SS.jsxs)(SS.Fragment, {
    children: [
      (0, SS.jsx)(`article`, {
        "aria-expanded": o ? !0 : void 0,
        "aria-haspopup": `menu`,
        "aria-pressed": n.isFocused,
        className: `session`,
        "data-activity": n.activity,
        "data-dragging": String(!!d.isDragging),
        "data-focused": String(n.isFocused),
        "data-running": String(n.isRunning),
        "data-sidebar-session-id": n.sessionId,
        "data-visible": String(n.isVisible),
        onAuxClick: (e) => {
          e.button === 1 && (e.preventDefault(), m());
        },
        onClick: (e) => {
          if ((e.stopPropagation(), e.metaKey)) {
            (e.preventDefault(), m());
            return;
          }
          a.postMessage({ sessionId: n.sessionId, type: `focusSession` });
        },
        onContextMenu: (e) => {
          (e.preventDefault(), e.stopPropagation(), f(e.clientX, e.clientY));
        },
        onKeyDown: h,
        ref: d.ref,
        role: `button`,
        tabIndex: 0,
        children: (0, SS.jsx)(cS, {
          aliasHeadingRef: l,
          onClose: m,
          secondaryRef: u,
          session: n,
          showCloseButton: r,
          showHotkeys: i,
        }),
      }),
      o
        ? (0, bS.createPortal)(
            (0, SS.jsxs)(`div`, {
              className: `session-context-menu`,
              onClick: (e) => {
                (e.preventDefault(), e.stopPropagation());
              },
              onPointerDown: (e) => {
                e.stopPropagation();
              },
              ref: c,
              role: `menu`,
              style: { left: `${o.x}px`, top: `${o.y}px` },
              children: [
                (0, SS.jsxs)(`button`, {
                  className: `session-context-menu-item`,
                  onClick: p,
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, SS.jsx)(Ix, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 16,
                      stroke: 1.8,
                    }),
                    `Rename`,
                  ],
                }),
                (0, SS.jsxs)(`button`, {
                  className: `session-context-menu-item session-context-menu-item-danger`,
                  onClick: m,
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, SS.jsx)(zx, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 16,
                      stroke: 1.8,
                    }),
                    `Terminate`,
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
var bS,
  xS,
  SS,
  CS,
  wS,
  TS,
  ES = t(() => {
    (Vx(),
      bx(),
      (bS = e(a())),
      (xS = e(r())),
      fS(),
      nS(),
      (SS = i()),
      (CS = 90),
      (wS = 12),
      (TS = 156),
      (yS.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SortableSessionCard`,
        props: {
          groupId: { required: !0, tsType: { name: `string` }, description: `` },
          index: { required: !0, tsType: { name: `number` }, description: `` },
          session: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  activity: SidebarSessionActivityState;
  activityLabel?: string;
  sessionId: string;
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
                    key: `activity`,
                    value: {
                      name: `union`,
                      raw: `"idle" | "working" | "attention"`,
                      elements: [
                        { name: `literal`, value: `"idle"` },
                        { name: `literal`, value: `"working"` },
                        { name: `literal`, value: `"attention"` },
                      ],
                      required: !0,
                    },
                  },
                  { key: `activityLabel`, value: { name: `string`, required: !1 } },
                  { key: `sessionId`, value: { name: `string`, required: !0 } },
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
          showCloseButton: { required: !0, tsType: { name: `boolean` }, description: `` },
          showHotkeys: { required: !0, tsType: { name: `boolean` }, description: `` },
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
    type: "ready";
  }
| {
    type: "openSettings";
  }
| {
    type: "toggleCompletionBell";
  }
| {
    type: "createSession";
  }
| {
    type: "createSessionInGroup";
    groupId: string;
  }
| {
    type: "focusGroup";
    groupId: string;
  }
| {
    type: "toggleFullscreenSession";
  }
| {
    type: "focusSession";
    sessionId: string;
    preserveFocus?: boolean;
  }
| {
    type: "promptRenameSession";
    sessionId: string;
  }
| {
    type: "restartSession";
    sessionId: string;
  }
| {
    type: "renameSession";
    sessionId: string;
    title: string;
  }
| {
    type: "renameGroup";
    groupId: string;
    title: string;
  }
| {
    type: "closeGroup";
    groupId: string;
  }
| {
    type: "closeSession";
    sessionId: string;
  }
| {
    type: "moveSessionToGroup";
    groupId: string;
    sessionId: string;
  }
| {
    type: "createGroupFromSession";
    sessionId: string;
  }
| {
    type: "setVisibleCount";
    visibleCount: VisibleSessionCount;
  }
| {
    type: "setViewMode";
    viewMode: TerminalViewMode;
  }
| {
    type: "syncSessionOrder";
    groupId: string;
    sessionIds: string[];
  }
| {
    type: "syncGroupOrder";
    groupIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "ready";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `"ready"`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "openSettings";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"openSettings"`,
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
  type: "toggleCompletionBell";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"toggleCompletionBell"`,
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
  type: "createSession";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createSession"`,
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
  type: "createSessionInGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createSessionInGroup"`,
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
  type: "focusGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"focusGroup"`,
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
  type: "toggleFullscreenSession";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"toggleFullscreenSession"`,
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
  type: "focusSession";
  sessionId: string;
  preserveFocus?: boolean;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"focusSession"`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `preserveFocus`,
                                        value: { name: `boolean`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "promptRenameSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"promptRenameSession"`,
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
  type: "restartSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"restartSession"`,
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
  type: "renameSession";
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"renameSession"`,
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
  type: "renameGroup";
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"renameGroup"`,
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
  type: "closeGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"closeGroup"`,
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
  type: "closeSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"closeSession"`,
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
  type: "moveSessionToGroup";
  groupId: string;
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"moveSessionToGroup"`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "createGroupFromSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createGroupFromSession"`,
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
  type: "setVisibleCount";
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"setVisibleCount"`,
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
  type: "setViewMode";
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"setViewMode"`,
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
  type: "syncSessionOrder";
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"syncSessionOrder"`,
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
  type: "syncGroupOrder";
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"syncGroupOrder"`,
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
function DS(e, t) {
  return {
    x: Math.max(PS, Math.min(e, window.innerWidth - FS - PS)),
    y: Math.max(PS, Math.min(t, window.innerHeight - NS - PS)),
  };
}
function OS({ viewMode: e }) {
  switch (e) {
    case `horizontal`:
      return (0, Q.jsxs)(`svg`, {
        "aria-hidden": `true`,
        className: `group-meta-icon`,
        viewBox: `0 0 16 16`,
        children: [
          (0, Q.jsx)(`rect`, {
            className: `group-meta-frame`,
            height: `12`,
            rx: `2`,
            width: `12`,
            x: `2`,
            y: `2`,
          }),
          (0, Q.jsx)(`path`, { className: `group-meta-line`, d: `M6 4v8M10 4v8` }),
        ],
      });
    case `vertical`:
      return (0, Q.jsxs)(`svg`, {
        "aria-hidden": `true`,
        className: `group-meta-icon`,
        viewBox: `0 0 16 16`,
        children: [
          (0, Q.jsx)(`rect`, {
            className: `group-meta-frame`,
            height: `12`,
            rx: `2`,
            width: `12`,
            x: `2`,
            y: `2`,
          }),
          (0, Q.jsx)(`path`, { className: `group-meta-line`, d: `M4 6h8M4 10h8` }),
        ],
      });
    case `grid`:
      return (0, Q.jsxs)(`svg`, {
        "aria-hidden": `true`,
        className: `group-meta-icon`,
        viewBox: `0 0 16 16`,
        children: [
          (0, Q.jsx)(`rect`, {
            className: `group-meta-frame`,
            height: `12`,
            rx: `2`,
            width: `12`,
            x: `2`,
            y: `2`,
          }),
          (0, Q.jsx)(`path`, { className: `group-meta-line`, d: `M8 4v8M4 8h8` }),
        ],
      });
  }
}
function kS({ visibleCount: e }) {
  return (0, Q.jsxs)(`svg`, {
    "aria-hidden": `true`,
    className: `group-meta-icon`,
    viewBox: `0 0 16 16`,
    children: [
      (0, Q.jsx)(`circle`, { className: `group-meta-count-circle`, cx: `8`, cy: `8`, r: `6` }),
      (0, Q.jsx)(`text`, {
        className: `group-meta-count-text`,
        textAnchor: `middle`,
        x: `8`,
        y: `8`,
        children: e,
      }),
    ],
  });
}
function AS({
  autoEdit: e,
  canClose: t,
  group: n,
  index: r,
  onAutoEditHandled: i,
  orderedSessions: a,
  showCloseButton: o,
  showHotkeys: s,
  vscode: c,
}) {
  let [l, u] = (0, MS.useState)(),
    [d, f] = (0, MS.useState)(n.title),
    [p, m] = (0, MS.useState)(!1),
    [h, g] = (0, MS.useState)(!1),
    _ = (0, MS.useRef)(null),
    v = uy({ accept: `session`, data: $x(n.groupId), id: `${n.groupId}-session-drop` }),
    y = cx({
      accept: `group`,
      data: $x(n.groupId),
      group: `groups`,
      id: n.groupId,
      index: r,
      type: `group`,
    });
  ((0, MS.useEffect)(() => {
    h || f(n.title);
  }, [n.title, h]),
    (0, MS.useEffect)(() => {
      e &&
        (0, MS.startTransition)(() => {
          (f(n.title), g(!0), i());
        });
    }, [e, n.title, i]),
    (0, MS.useEffect)(() => {
      u(void 0);
    }, [n.groupId, n.title]),
    (0, MS.useEffect)(() => {
      if (!l) return;
      let e = (e) => {
          _.current?.contains(e.target) || u(void 0);
        },
        t = (e) => {
          _.current?.contains(e.target) || u(void 0);
        },
        n = (e) => {
          e.key === `Escape` && u(void 0);
        },
        r = () => {
          u(void 0);
        },
        i = () => {
          document.visibilityState !== `visible` && u(void 0);
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
    }, [l]));
  let b = () => {
      let e = d.trim();
      (g(!1),
        f(e || n.title),
        !(!e || e === n.title) &&
          c.postMessage({ groupId: n.groupId, title: e, type: `renameGroup` }));
    },
    x = () => {
      c.postMessage({ groupId: n.groupId, type: `focusGroup` });
    },
    S = () => {
      if (n.isActive) {
        c.postMessage({ type: `createSession` });
        return;
      }
      c.postMessage({ groupId: n.groupId, type: `createSessionInGroup` });
    },
    C = () => {
      if (t) {
        if ((u(void 0), a.length <= 1)) {
          c.postMessage({ groupId: n.groupId, type: `closeGroup` });
          return;
        }
        m(!0);
      }
    },
    w = (e) => {
      if (e.key === `Enter`) {
        (e.preventDefault(), b());
        return;
      }
      e.key === `Escape` && (e.preventDefault(), f(n.title), g(!1));
    };
  return (0, Q.jsxs)(Q.Fragment, {
    children: [
      (0, Q.jsxs)(`section`, {
        className: `group`,
        "data-active": String(n.isActive),
        "data-dragging": String(!!y.isDragging),
        "data-drop-target": String(y.isDropTarget || v.isDropTarget),
        "data-sidebar-group-id": n.groupId,
        onClick: () => {
          x();
        },
        onContextMenu: (e) => {
          (e.preventDefault(), e.stopPropagation(), u(DS(e.clientX, e.clientY)));
        },
        ref: y.ref,
        children: [
          (0, Q.jsxs)(`div`, {
            className: `group-head`,
            children: [
              (0, Q.jsx)(`div`, {
                className: `group-title-wrap`,
                ref: h ? void 0 : y.handleRef,
                children: h
                  ? (0, Q.jsx)(`input`, {
                      autoFocus: !0,
                      className: `group-title-input`,
                      onBlur: b,
                      onChange: (e) => f(e.currentTarget.value),
                      onClick: (e) => e.stopPropagation(),
                      onKeyDown: w,
                      value: d,
                    })
                  : (0, Q.jsxs)(`div`, {
                      className: `group-title-row`,
                      children: [
                        (0, Q.jsx)(`div`, { className: `group-title`, children: n.title }),
                        (0, Q.jsxs)(`div`, {
                          className: `group-meta`,
                          children: [
                            (0, Q.jsx)(`span`, {
                              "aria-label": `Layout ${n.viewMode}`,
                              className: `group-meta-item`,
                              role: `img`,
                              title: `Layout: ${n.viewMode}`,
                              children: (0, Q.jsx)(OS, { viewMode: n.viewMode }),
                            }),
                            (0, Q.jsx)(`span`, {
                              "aria-label": `${n.visibleCount} sessions shown`,
                              className: `group-meta-item`,
                              role: `img`,
                              title: `Sessions shown: ${n.visibleCount}`,
                              children: (0, Q.jsx)(kS, { visibleCount: n.visibleCount }),
                            }),
                            n.isFocusModeActive
                              ? (0, Q.jsx)(`span`, {
                                  "aria-label": `Focus mode active`,
                                  className: `group-meta-item`,
                                  role: `img`,
                                  title: `Focus mode active`,
                                  children: (0, Q.jsx)(Nx, {
                                    "aria-hidden": `true`,
                                    className: `group-meta-focus-icon`,
                                    stroke: 1.8,
                                  }),
                                })
                              : null,
                          ],
                        }),
                      ],
                    }),
              }),
              (0, Q.jsx)(`div`, {
                className: `group-status`,
                "data-active": String(n.isActive),
                children: `Active`,
              }),
            ],
          }),
          (0, Q.jsx)(`div`, {
            className: `group-sessions`,
            "data-drop-target": String(v.isDropTarget),
            ref: a.length > 0 ? v.ref : void 0,
            children:
              a.length > 0
                ? a.map((e, t) =>
                    (0, Q.jsx)(
                      yS,
                      {
                        groupId: n.groupId,
                        index: t,
                        session: e,
                        showCloseButton: o,
                        showHotkeys: s,
                        vscode: c,
                      },
                      e.sessionId,
                    ),
                  )
                : (0, Q.jsx)(`div`, {
                    className: `group-empty-drop-target`,
                    "data-drop-target": String(v.isDropTarget),
                    ref: v.ref,
                    children: (0, Q.jsx)(`button`, {
                      "aria-label": `Create a session in ${n.title}`,
                      className: `group-empty-button`,
                      onClick: (e) => {
                        (e.preventDefault(), e.stopPropagation(), S());
                      },
                      type: `button`,
                      children: `+`,
                    }),
                  }),
          }),
        ],
      }),
      l
        ? (0, jS.createPortal)(
            (0, Q.jsxs)(`div`, {
              className: `session-context-menu`,
              onClick: (e) => e.stopPropagation(),
              onContextMenu: (e) => {
                (e.preventDefault(), e.stopPropagation());
              },
              ref: _,
              role: `menu`,
              style: { left: `${l.x}px`, top: `${l.y}px`, width: `${FS}px` },
              children: [
                (0, Q.jsxs)(`button`, {
                  className: `session-context-menu-item`,
                  onClick: () => {
                    (u(void 0), g(!0));
                  },
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, Q.jsx)(Ix, {
                      "aria-hidden": `true`,
                      className: `session-context-menu-icon`,
                      size: 14,
                    }),
                    `Rename`,
                  ],
                }),
                (0, Q.jsxs)(`button`, {
                  className: `session-context-menu-item session-context-menu-item-danger`,
                  disabled: !t,
                  onClick: C,
                  role: `menuitem`,
                  type: `button`,
                  children: [
                    (0, Q.jsx)(zx, {
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
      (0, Q.jsx)(pS, {
        confirmLabel: `Terminate Group`,
        description: `This will terminate all ${a.length} session${a.length === 1 ? `` : `s`} in ${n.title}.`,
        isOpen: p,
        onCancel: () => m(!1),
        onConfirm: () => {
          (m(!1), c.postMessage({ groupId: n.groupId, type: `closeGroup` }));
        },
        title: `Close group?`,
      }),
    ],
  });
}
var jS,
  MS,
  Q,
  NS,
  PS,
  FS,
  IS = t(() => {
    (Vx(),
      $y(),
      bx(),
      (jS = e(a())),
      (MS = e(r())),
      _S(),
      nS(),
      ES(),
      (Q = i()),
      (NS = 90),
      (PS = 12),
      (FS = 164),
      (AS.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SessionGroupSection`,
        props: {
          autoEdit: { required: !0, tsType: { name: `boolean` }, description: `` },
          canClose: { required: !0, tsType: { name: `boolean` }, description: `` },
          group: {
            required: !0,
            tsType: {
              name: `signature`,
              type: `object`,
              raw: `{
  groupId: string;
  isActive: boolean;
  isFocusModeActive: boolean;
  sessions: SidebarSessionItem[];
  title: string;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
}`,
              signature: {
                properties: [
                  { key: `groupId`, value: { name: `string`, required: !0 } },
                  { key: `isActive`, value: { name: `boolean`, required: !0 } },
                  { key: `isFocusModeActive`, value: { name: `boolean`, required: !0 } },
                  {
                    key: `sessions`,
                    value: {
                      name: `Array`,
                      elements: [
                        {
                          name: `signature`,
                          type: `object`,
                          raw: `{
  activity: SidebarSessionActivityState;
  activityLabel?: string;
  sessionId: string;
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
                                key: `activity`,
                                value: {
                                  name: `union`,
                                  raw: `"idle" | "working" | "attention"`,
                                  elements: [
                                    { name: `literal`, value: `"idle"` },
                                    { name: `literal`, value: `"working"` },
                                    { name: `literal`, value: `"attention"` },
                                  ],
                                  required: !0,
                                },
                              },
                              { key: `activityLabel`, value: { name: `string`, required: !1 } },
                              { key: `sessionId`, value: { name: `string`, required: !0 } },
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
            description: ``,
          },
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
          orderedSessions: {
            required: !0,
            tsType: {
              name: `Array`,
              elements: [
                {
                  name: `signature`,
                  type: `object`,
                  raw: `{
  activity: SidebarSessionActivityState;
  activityLabel?: string;
  sessionId: string;
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
                        key: `activity`,
                        value: {
                          name: `union`,
                          raw: `"idle" | "working" | "attention"`,
                          elements: [
                            { name: `literal`, value: `"idle"` },
                            { name: `literal`, value: `"working"` },
                            { name: `literal`, value: `"attention"` },
                          ],
                          required: !0,
                        },
                      },
                      { key: `activityLabel`, value: { name: `string`, required: !1 } },
                      { key: `sessionId`, value: { name: `string`, required: !0 } },
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
              ],
              raw: `SidebarSessionItem[]`,
            },
            description: ``,
          },
          showCloseButton: { required: !0, tsType: { name: `boolean` }, description: `` },
          showHotkeys: { required: !0, tsType: { name: `boolean` }, description: `` },
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
    type: "ready";
  }
| {
    type: "openSettings";
  }
| {
    type: "toggleCompletionBell";
  }
| {
    type: "createSession";
  }
| {
    type: "createSessionInGroup";
    groupId: string;
  }
| {
    type: "focusGroup";
    groupId: string;
  }
| {
    type: "toggleFullscreenSession";
  }
| {
    type: "focusSession";
    sessionId: string;
    preserveFocus?: boolean;
  }
| {
    type: "promptRenameSession";
    sessionId: string;
  }
| {
    type: "restartSession";
    sessionId: string;
  }
| {
    type: "renameSession";
    sessionId: string;
    title: string;
  }
| {
    type: "renameGroup";
    groupId: string;
    title: string;
  }
| {
    type: "closeGroup";
    groupId: string;
  }
| {
    type: "closeSession";
    sessionId: string;
  }
| {
    type: "moveSessionToGroup";
    groupId: string;
    sessionId: string;
  }
| {
    type: "createGroupFromSession";
    sessionId: string;
  }
| {
    type: "setVisibleCount";
    visibleCount: VisibleSessionCount;
  }
| {
    type: "setViewMode";
    viewMode: TerminalViewMode;
  }
| {
    type: "syncSessionOrder";
    groupId: string;
    sessionIds: string[];
  }
| {
    type: "syncGroupOrder";
    groupIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "ready";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `"ready"`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "openSettings";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"openSettings"`,
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
  type: "toggleCompletionBell";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"toggleCompletionBell"`,
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
  type: "createSession";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createSession"`,
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
  type: "createSessionInGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createSessionInGroup"`,
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
  type: "focusGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"focusGroup"`,
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
  type: "toggleFullscreenSession";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"toggleFullscreenSession"`,
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
  type: "focusSession";
  sessionId: string;
  preserveFocus?: boolean;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"focusSession"`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `preserveFocus`,
                                        value: { name: `boolean`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "promptRenameSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"promptRenameSession"`,
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
  type: "restartSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"restartSession"`,
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
  type: "renameSession";
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"renameSession"`,
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
  type: "renameGroup";
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"renameGroup"`,
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
  type: "closeGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"closeGroup"`,
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
  type: "closeSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"closeSession"`,
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
  type: "moveSessionToGroup";
  groupId: string;
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"moveSessionToGroup"`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "createGroupFromSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createGroupFromSession"`,
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
  type: "setVisibleCount";
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"setVisibleCount"`,
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
  type: "setViewMode";
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"setViewMode"`,
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
  type: "syncSessionOrder";
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"syncSessionOrder"`,
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
  type: "syncGroupOrder";
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"syncGroupOrder"`,
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
function LS() {
  return document.body.classList.contains(`vscode-light`) ||
    document.body.classList.contains(`vscode-high-contrast-light`)
    ? `light-blue`
    : `dark-blue`;
}
function RS({ vscode: e }) {
  let [t, n] = (0, $S.useState)(nC),
    [r, i] = (0, $S.useState)(),
    [a, o] = (0, $S.useState)(),
    [s, c] = (0, $S.useState)(),
    [l, u] = (0, $S.useState)(),
    [d, f] = (0, $S.useState)({}),
    p = (0, $S.useRef)(!1),
    m = () => {
      e.postMessage({ type: `createSession` });
    },
    h = (e) => {
      zS(e.target, e.currentTarget) && (e.preventDefault(), m());
    };
  ((0, $S.useEffect)(() => {
    let e = (e) => {
      if (e.data) {
        if (e.data.type === `playCompletionSound`) {
          Jx(e.data.sound);
          return;
        }
        (e.data.type !== `hydrate` && e.data.type !== `sessionState`) ||
          (0, $S.startTransition)(() => {
            (n((t) => {
              if (p.current) {
                let n = YS(t.groups, e.data.groups);
                n && (i(n), (p.current = !1));
              }
              return { groups: e.data.groups, hud: e.data.hud };
            }),
              o((t) => KS(t, e.data.groups)),
              f((t) => GS(t, e.data.groups)));
          });
      }
    };
    return (
      window.addEventListener(`message`, e),
      () => {
        window.removeEventListener(`message`, e);
      }
    );
  }, []),
    (0, $S.useEffect)(() => {
      e.postMessage({ type: `ready` });
    }, [e]),
    (0, $S.useEffect)(
      () => (
        (document.body.dataset.sidebarTheme = t.hud.theme),
        () => {
          delete document.body.dataset.sidebarTheme;
        }
      ),
      [t.hud.theme],
    ));
  let g = (0, $S.useMemo)(() => {
      let e = new Map(t.groups.map((e) => [e.groupId, e]));
      return (
        a
          ? US(
              a,
              t.groups.map((e) => e.groupId),
            )
          : t.groups.map((e) => e.groupId)
      )
        .map((t) => e.get(t))
        .filter((e) => e !== void 0)
        .map((e) => ({ ...e, orderedSessions: WS(e, d[e.groupId]) }));
    }, [a, d, t.groups]),
    _ = (0, $S.useMemo)(() => {
      if (s) return g.flatMap((e) => e.orderedSessions).find((e) => e.sessionId === s);
    }, [s, g]),
    v = (e) => {
      if (eb(e.operation.source)) {
        let t = e.operation.source.element;
        t instanceof HTMLElement && u(t.getBoundingClientRect().width);
      }
      let t = tS(e.operation.source);
      t?.kind !== `group` && t?.kind === `session` && c(t.sessionId);
    },
    y = (t) => {
      if ((c(void 0), u(void 0), t.canceled)) return;
      let { source: n, target: r } = t.operation;
      if (!eb(n)) return;
      let i = tS(n),
        a = tS(r);
      if (!i || !a) return;
      if (i.kind === `group`) {
        if (a.kind !== `group` || !eb(r)) return;
        let { initialIndex: t } = n,
          i = r.index;
        if (i == null || t === i) return;
        let s = HS(
          g.map((e) => e.groupId),
          t,
          i,
        );
        ((0, $S.startTransition)(() => {
          o(s);
        }),
          e.postMessage({ groupIds: s, type: `syncGroupOrder` }));
        return;
      }
      if (a.kind === `create-group`) {
        ((p.current = !0),
          e.postMessage({ sessionId: i.sessionId, type: `createGroupFromSession` }));
        return;
      }
      if (a.kind === `group`) {
        if (i.groupId === a.groupId) return;
        e.postMessage({ groupId: a.groupId, sessionId: i.sessionId, type: `moveSessionToGroup` });
        return;
      }
      if (!eb(r) || i.groupId !== a.groupId) {
        e.postMessage({ groupId: a.groupId, sessionId: i.sessionId, type: `moveSessionToGroup` });
        return;
      }
      let { index: s, initialIndex: l } = n,
        d = r.index;
      if (s == null || l === d || d == null) return;
      let m = g.find((e) => e.groupId === i.groupId);
      if (!m) return;
      let h = HS(
        m.orderedSessions.map((e) => e.sessionId),
        l,
        d,
      );
      ((0, $S.startTransition)(() => {
        f((e) => ({ ...e, [m.groupId]: h }));
      }),
        e.postMessage({ groupId: m.groupId, sessionIds: h, type: `syncSessionOrder` }));
    };
  return (0, $.jsx)(el, {
    delay: oS,
    children: (0, $.jsxs)(`div`, {
      className: `stack`,
      "data-sidebar-theme": t.hud.theme,
      onDoubleClick: h,
      children: [
        (0, $.jsxs)(`section`, {
          className: `card hud`,
          children: [
            (0, $.jsxs)(`div`, {
              className: `toolbar-row`,
              children: [
                (0, $.jsxs)(`div`, {
                  className: `toolbar-section`,
                  children: [
                    (0, $.jsx)(`div`, {
                      className: `control-label`,
                      "data-empty-space-blocking": `true`,
                      children: `Layout`,
                    }),
                    (0, $.jsxs)(`div`, {
                      className: `toolbar-inline-row`,
                      children: [
                        (0, $.jsxs)(`div`, {
                          className: `button-group`,
                          children: [
                            (0, $.jsx)(BS, {
                              ariaLabel: `Toggle focus mode`,
                              isSelected: t.hud.isFocusModeActive,
                              onClick: () => e.postMessage({ type: `toggleFullscreenSession` }),
                              tooltip: t.hud.isFocusModeActive
                                ? `Restore previous session layout`
                                : `Focus on the active session`,
                              children: (0, $.jsx)(Nx, {
                                "aria-hidden": `true`,
                                className: `toolbar-tabler-icon`,
                                stroke: 1.8,
                              }),
                            }),
                            tC.map((n) =>
                              (0, $.jsx)(
                                VS,
                                {
                                  isDimmed: t.hud.isFocusModeActive,
                                  mode: n,
                                  viewMode: t.hud.viewMode,
                                  visibleCount: t.hud.visibleCount,
                                  vscode: e,
                                },
                                n.viewMode,
                              ),
                            ),
                          ],
                        }),
                        (0, $.jsxs)(`div`, {
                          className: `button-group button-group-end`,
                          children: [
                            (0, $.jsx)(BS, {
                              ariaLabel: t.hud.completionBellEnabled
                                ? `Disable completion sound for this project`
                                : `Enable completion sound for this project`,
                              isSelected: t.hud.completionBellEnabled,
                              onClick: () => e.postMessage({ type: `toggleCompletionBell` }),
                              tooltip: QS(t.hud),
                              children: t.hud.completionBellEnabled
                                ? (0, $.jsx)(Ax, {
                                    "aria-hidden": `true`,
                                    className: `toolbar-tabler-icon`,
                                    stroke: 1.8,
                                  })
                                : (0, $.jsx)(Dx, {
                                    "aria-hidden": `true`,
                                    className: `toolbar-tabler-icon`,
                                    stroke: 1.8,
                                  }),
                            }),
                            (0, $.jsx)(BS, {
                              ariaLabel: `Open sidebar theme settings`,
                              onClick: () => e.postMessage({ type: `openSettings` }),
                              tooltip: `Sidebar Settings`,
                              children: (0, $.jsx)(ZS, {}),
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                (0, $.jsxs)(`div`, {
                  className: `toolbar-section`,
                  children: [
                    (0, $.jsx)(`div`, {
                      className: `control-label`,
                      "data-empty-space-blocking": `true`,
                      children: `Sessions Shown`,
                    }),
                    (0, $.jsx)(`div`, {
                      className: `button-group`,
                      children: eC.map((n) =>
                        (0, $.jsx)(
                          BS,
                          {
                            ariaLabel: `Show ${n} session${n === 1 ? `` : `s`}`,
                            "data-dimmed": String(t.hud.isFocusModeActive),
                            onClick: () =>
                              e.postMessage({ type: `setVisibleCount`, visibleCount: n }),
                            tooltip: `Show ${n} session${n === 1 ? `` : `s`}`,
                            isDimmed: t.hud.isFocusModeActive,
                            isSelected: t.hud.highlightedVisibleCount === n,
                            children: n,
                          },
                          n,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            }),
            (0, $.jsx)(`div`, {
              className: `action-row`,
              children: (0, $.jsx)(`button`, {
                className: `primary`,
                onClick: m,
                type: `button`,
                children: `New Session`,
              }),
            }),
          ],
        }),
        (0, $.jsxs)(`section`, {
          className: `card`,
          children: [
            (0, $.jsx)(`div`, {
              className: `eyebrow`,
              "data-empty-space-blocking": `true`,
              children: `Groups`,
            }),
            (0, $.jsxs)(ry, {
              onDragEnd: y,
              onDragStart: v,
              children: [
                (0, $.jsxs)(`div`, {
                  className: `group-list`,
                  children: [
                    g.map((n, a) =>
                      (0, $.jsx)(
                        AS,
                        {
                          autoEdit: r === n.groupId,
                          canClose: g.length > 1,
                          group: n,
                          index: a,
                          onAutoEditHandled: () => i(void 0),
                          orderedSessions: n.orderedSessions,
                          showCloseButton: t.hud.showCloseButtonOnSessionCards,
                          showHotkeys: t.hud.showHotkeysOnSessionCards,
                          vscode: e,
                        },
                        n.groupId,
                      ),
                    ),
                    (0, $.jsx)(rS, { isVisible: !!s && g.length < 4 }),
                  ],
                }),
                (0, $.jsx)(sy, {
                  dropAnimation: { duration: 220, easing: `cubic-bezier(0.22, 1, 0.36, 1)` },
                  children: _
                    ? (0, $.jsx)(`div`, {
                        className: `session session-drag-overlay`,
                        "data-activity": _.activity,
                        "data-focused": String(_.isFocused),
                        "data-running": String(_.isRunning),
                        "data-visible": String(_.isVisible),
                        style: l ? { width: `${Math.round(l)}px` } : void 0,
                        children: (0, $.jsx)(cS, {
                          session: _,
                          showCloseButton: !1,
                          showHotkeys: t.hud.showHotkeysOnSessionCards,
                        }),
                      })
                    : null,
                }),
              ],
            }),
            g.every((e) => e.sessions.length === 0)
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
  });
}
function zS(e, t) {
  if (e === t) return !0;
  let n = e instanceof Node ? e : void 0,
    r = n instanceof Element ? n : (n?.parentElement ?? void 0);
  return !r || !t.contains(r) ? !1 : r.closest(rC) === null;
}
function BS({
  ariaLabel: e,
  children: t,
  className: n,
  dataDimmed: r,
  isDisabled: i = !1,
  isDimmed: a = !1,
  isSelected: o = !1,
  onClick: s,
  tabIndex: c,
  tooltip: l,
}) {
  return (0, $.jsxs)(Rs, {
    children: [
      (0, $.jsx)(ac, {
        render: (0, $.jsx)(`button`, {
          "aria-disabled": i,
          "aria-label": e,
          className: n ? `toolbar-button ${n}` : `toolbar-button`,
          "data-disabled": String(i),
          "data-dimmed": r ?? String(a),
          "data-selected": String(o),
          onClick: () => {
            i || s();
          },
          tabIndex: c,
          type: `button`,
          children: t,
        }),
      }),
      (0, $.jsx)(vc, {
        children: (0, $.jsx)(Kc, {
          className: `tooltip-positioner`,
          sideOffset: 8,
          children: (0, $.jsx)(Xc, { className: `tooltip-popup`, children: l }),
        }),
      }),
    ],
  });
}
function VS({ isDimmed: e, mode: t, viewMode: n, visibleCount: r, vscode: i }) {
  let a = JS(t.viewMode, r);
  return (0, $.jsx)(BS, {
    ariaLabel: t.tooltip,
    isDisabled: a,
    isDimmed: e,
    isSelected: n === t.viewMode,
    onClick: () => {
      i.postMessage({ type: `setViewMode`, viewMode: t.viewMode });
    },
    tabIndex: a ? -1 : 0,
    tooltip: t.tooltip,
    children: (0, $.jsx)(XS, { viewMode: t.viewMode }),
  });
}
function HS(e, t, n) {
  let r = [...e],
    [i] = r.splice(t, 1);
  return (i === void 0 || r.splice(n, 0, i), r);
}
function US(e, t) {
  let n = new Set(t),
    r = e.filter((e) => n.has(e));
  for (let e of t) r.includes(e) || r.push(e);
  return r;
}
function WS(e, t) {
  if (!t) return e.sessions;
  let n = new Map(e.sessions.map((e) => [e.sessionId, e]));
  return US(
    t,
    e.sessions.map((e) => e.sessionId),
  )
    .map((e) => n.get(e))
    .filter((e) => e !== void 0);
}
function GS(e, t) {
  let n = {};
  for (let r of t) {
    let t = e[r.groupId];
    if (!t) continue;
    let i = r.sessions.map((e) => e.sessionId),
      a = US(t, i);
    qS(a, i) || (n[r.groupId] = a);
  }
  return n;
}
function KS(e, t) {
  if (!e) return;
  let n = t.map((e) => e.groupId),
    r = US(e, n);
  return qS(r, n) ? void 0 : r;
}
function qS(e, t) {
  return e.length === t.length ? e.every((e, n) => e === t[n]) : !1;
}
function JS(e, t) {
  return t === 1 || (t === 2 && e === `grid`);
}
function YS(e, t) {
  let n = new Set(e.map((e) => e.groupId));
  return t.find((e) => !n.has(e.groupId))?.groupId;
}
function XS({ viewMode: e }) {
  switch (e) {
    case `horizontal`:
      return (0, $.jsxs)(`svg`, {
        "aria-hidden": `true`,
        className: `toolbar-icon`,
        viewBox: `0 0 16 16`,
        children: [
          (0, $.jsx)(`rect`, {
            className: `toolbar-icon-frame`,
            height: `12`,
            rx: `2`,
            width: `12`,
            x: `2`,
            y: `2`,
          }),
          (0, $.jsx)(`path`, { className: `toolbar-icon-line`, d: `M6 4v8M10 4v8` }),
        ],
      });
    case `vertical`:
      return (0, $.jsxs)(`svg`, {
        "aria-hidden": `true`,
        className: `toolbar-icon`,
        viewBox: `0 0 16 16`,
        children: [
          (0, $.jsx)(`rect`, {
            className: `toolbar-icon-frame`,
            height: `12`,
            rx: `2`,
            width: `12`,
            x: `2`,
            y: `2`,
          }),
          (0, $.jsx)(`path`, { className: `toolbar-icon-line`, d: `M4 6h8M4 10h8` }),
        ],
      });
    case `grid`:
      return (0, $.jsxs)(`svg`, {
        "aria-hidden": `true`,
        className: `toolbar-icon`,
        viewBox: `0 0 16 16`,
        children: [
          (0, $.jsx)(`rect`, {
            className: `toolbar-icon-frame`,
            height: `12`,
            rx: `2`,
            width: `12`,
            x: `2`,
            y: `2`,
          }),
          (0, $.jsx)(`path`, { className: `toolbar-icon-line`, d: `M8 4v8M4 8h8` }),
        ],
      });
  }
}
function ZS() {
  return (0, $.jsxs)(`svg`, {
    "aria-hidden": `true`,
    className: `toolbar-icon`,
    viewBox: `0 0 16 16`,
    children: [
      (0, $.jsx)(`path`, {
        className: `toolbar-icon-line`,
        d: `M8 2.2v1.4M8 12.4v1.4M3.76 3.76l1 1M11.24 11.24l1 1M2.2 8h1.4M12.4 8h1.4M3.76 12.24l1-1M11.24 4.76l1-1`,
      }),
      (0, $.jsx)(`circle`, { className: `toolbar-icon-frame`, cx: `8`, cy: `8`, r: `2.4` }),
      (0, $.jsx)(`circle`, { className: `toolbar-icon-frame`, cx: `8`, cy: `8`, r: `4.6` }),
    ],
  });
}
function QS(e) {
  return e.completionBellEnabled
    ? `Disable done sound for this project (${e.completionSoundLabel})`
    : `Enable done sound for this project (${e.completionSoundLabel})`;
}
var $S,
  $,
  eC,
  tC,
  nC,
  rC,
  iC = t(() => {
    (rl(),
      $y(),
      bx(),
      Vx(),
      ($S = e(r())),
      qx(),
      Zx(),
      aS(),
      fS(),
      nS(),
      IS(),
      sS(),
      ($ = i()),
      (eC = [1, 2, 3, 4, 6, 9]),
      (tC = [
        { tooltip: `Vertical`, viewMode: `vertical` },
        { tooltip: `Horizontal`, viewMode: `horizontal` },
        { tooltip: `Grid`, viewMode: `grid` },
      ]),
      (nC = {
        groups: [],
        hud: {
          completionBellEnabled: !1,
          completionSound: `ping`,
          completionSoundLabel: `Ping`,
          focusedSessionTitle: void 0,
          isFocusModeActive: !1,
          showCloseButtonOnSessionCards: !1,
          showHotkeysOnSessionCards: !1,
          theme: LS(),
          viewMode: `grid`,
          visibleCount: 1,
          visibleSlotLabels: [],
        },
      }),
      (rC = [
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
      (RS.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `SidebarApp`,
        props: {
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
    type: "ready";
  }
| {
    type: "openSettings";
  }
| {
    type: "toggleCompletionBell";
  }
| {
    type: "createSession";
  }
| {
    type: "createSessionInGroup";
    groupId: string;
  }
| {
    type: "focusGroup";
    groupId: string;
  }
| {
    type: "toggleFullscreenSession";
  }
| {
    type: "focusSession";
    sessionId: string;
    preserveFocus?: boolean;
  }
| {
    type: "promptRenameSession";
    sessionId: string;
  }
| {
    type: "restartSession";
    sessionId: string;
  }
| {
    type: "renameSession";
    sessionId: string;
    title: string;
  }
| {
    type: "renameGroup";
    groupId: string;
    title: string;
  }
| {
    type: "closeGroup";
    groupId: string;
  }
| {
    type: "closeSession";
    sessionId: string;
  }
| {
    type: "moveSessionToGroup";
    groupId: string;
    sessionId: string;
  }
| {
    type: "createGroupFromSession";
    sessionId: string;
  }
| {
    type: "setVisibleCount";
    visibleCount: VisibleSessionCount;
  }
| {
    type: "setViewMode";
    viewMode: TerminalViewMode;
  }
| {
    type: "syncSessionOrder";
    groupId: string;
    sessionIds: string[];
  }
| {
    type: "syncGroupOrder";
    groupIds: string[];
  }`,
                              elements: [
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "ready";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: { name: `literal`, value: `"ready"`, required: !0 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "openSettings";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"openSettings"`,
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
  type: "toggleCompletionBell";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"toggleCompletionBell"`,
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
  type: "createSession";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createSession"`,
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
  type: "createSessionInGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createSessionInGroup"`,
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
  type: "focusGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"focusGroup"`,
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
  type: "toggleFullscreenSession";
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"toggleFullscreenSession"`,
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
  type: "focusSession";
  sessionId: string;
  preserveFocus?: boolean;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"focusSession"`,
                                          required: !0,
                                        },
                                      },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                      {
                                        key: `preserveFocus`,
                                        value: { name: `boolean`, required: !1 },
                                      },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "promptRenameSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"promptRenameSession"`,
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
  type: "restartSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"restartSession"`,
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
  type: "renameSession";
  sessionId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"renameSession"`,
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
  type: "renameGroup";
  groupId: string;
  title: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"renameGroup"`,
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
  type: "closeGroup";
  groupId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"closeGroup"`,
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
  type: "closeSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"closeSession"`,
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
  type: "moveSessionToGroup";
  groupId: string;
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"moveSessionToGroup"`,
                                          required: !0,
                                        },
                                      },
                                      { key: `groupId`, value: { name: `string`, required: !0 } },
                                      { key: `sessionId`, value: { name: `string`, required: !0 } },
                                    ],
                                  },
                                },
                                {
                                  name: `signature`,
                                  type: `object`,
                                  raw: `{
  type: "createGroupFromSession";
  sessionId: string;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"createGroupFromSession"`,
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
  type: "setVisibleCount";
  visibleCount: VisibleSessionCount;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"setVisibleCount"`,
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
  type: "setViewMode";
  viewMode: TerminalViewMode;
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"setViewMode"`,
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
  type: "syncSessionOrder";
  groupId: string;
  sessionIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"syncSessionOrder"`,
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
  type: "syncGroupOrder";
  groupIds: string[];
}`,
                                  signature: {
                                    properties: [
                                      {
                                        key: `type`,
                                        value: {
                                          name: `literal`,
                                          value: `"syncGroupOrder"`,
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
function aC() {
  return [...uC];
}
function oC() {
  uC.length = 0;
}
function sC({ message: e }) {
  let t = (0, cC.useRef)({
    postMessage(e) {
      uC.push(e);
    },
  }).current;
  return (
    (0, cC.useEffect)(() => {
      let t = window.setTimeout(() => {
        window.postMessage(e, `*`);
      }, 0);
      return () => {
        window.clearTimeout(t);
      };
    }, [e, JSON.stringify(e)]),
    (0, lC.jsx)(`div`, {
      style: { height: `100%`, width: `100%` },
      children: (0, lC.jsx)(RS, { vscode: t }),
    })
  );
}
var cC,
  lC,
  uC,
  dC = t(() => {
    ((cC = e(r())),
      iC(),
      (lC = i()),
      (uC = []),
      (sC.__docgenInfo = {
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
  type: "hydrate";
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
  groupId: string;
  isActive: boolean;
  isFocusModeActive: boolean;
  sessions: SidebarSessionItem[];
  title: string;
  viewMode: TerminalViewMode;
  visibleCount: VisibleSessionCount;
}`,
                          signature: {
                            properties: [
                              { key: `groupId`, value: { name: `string`, required: !0 } },
                              { key: `isActive`, value: { name: `boolean`, required: !0 } },
                              {
                                key: `isFocusModeActive`,
                                value: { name: `boolean`, required: !0 },
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
  activity: SidebarSessionActivityState;
  activityLabel?: string;
  sessionId: string;
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
                                            key: `activity`,
                                            value: {
                                              name: `union`,
                                              raw: `"idle" | "working" | "attention"`,
                                              elements: [
                                                { name: `literal`, value: `"idle"` },
                                                { name: `literal`, value: `"working"` },
                                                { name: `literal`, value: `"attention"` },
                                              ],
                                              required: !0,
                                            },
                                          },
                                          {
                                            key: `activityLabel`,
                                            value: { name: `string`, required: !1 },
                                          },
                                          {
                                            key: `sessionId`,
                                            value: { name: `string`, required: !0 },
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
                  { key: `type`, value: { name: `literal`, value: `"hydrate"`, required: !0 } },
                  {
                    key: `hud`,
                    value: {
                      name: `signature`,
                      type: `object`,
                      raw: `{
  completionBellEnabled: boolean;
  completionSound: CompletionSoundSetting;
  completionSoundLabel: string;
  focusedSessionTitle?: string;
  isFocusModeActive: boolean;
  showCloseButtonOnSessionCards: boolean;
  showHotkeysOnSessionCards: boolean;
  theme: SidebarTheme;
  highlightedVisibleCount: VisibleSessionCount;
  visibleCount: VisibleSessionCount;
  visibleSlotLabels: string[];
  viewMode: TerminalViewMode;
}`,
                      signature: {
                        properties: [
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
                          { key: `focusedSessionTitle`, value: { name: `string`, required: !1 } },
                          { key: `isFocusModeActive`, value: { name: `boolean`, required: !0 } },
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
function fC(e) {
  let t = mC(xC[e.fixture]).map((t) => ({
    ...t,
    isFocusModeActive: t.isActive ? e.isFocusModeActive : !1,
    viewMode: t.isActive ? e.viewMode : `grid`,
    visibleCount: t.isActive ? e.visibleCount : Kx(Math.max(1, t.sessions.length)),
  }));
  return {
    groups: t,
    hud: {
      completionBellEnabled: !1,
      completionSound: Wx,
      completionSoundLabel: Hx(Wx),
      focusedSessionTitle: hC(t),
      highlightedVisibleCount: e.highlightedVisibleCount,
      isFocusModeActive: e.isFocusModeActive,
      showCloseButtonOnSessionCards: e.showCloseButtonOnSessionCards,
      showHotkeysOnSessionCards: e.showHotkeysOnSessionCards,
      theme: e.theme,
      viewMode: e.viewMode,
      visibleCount: e.visibleCount,
      visibleSlotLabels: gC(t),
    },
    type: `hydrate`,
  };
}
function pC({
  activity: e = `idle`,
  activityLabel: t,
  alias: n,
  detail: r,
  isFocused: i = !1,
  isRunning: a = !0,
  isVisible: o = !1,
  primaryTitle: s,
  sessionId: c,
  shortcutLabel: l,
  terminalTitle: u,
}) {
  return {
    activity: e,
    activityLabel: t,
    alias: n,
    column: 0,
    detail: r,
    isFocused: i,
    isRunning: a,
    isVisible: o,
    primaryTitle: s,
    row: 0,
    sessionId: c,
    shortcutLabel: l,
    terminalTitle: u,
  };
}
function mC(e) {
  return e.map((e) => ({ ...e, sessions: e.sessions.map((e) => ({ ...e })) }));
}
function hC(e) {
  let t = e.flatMap((e) => e.sessions).find((e) => e.isFocused);
  if (t) return t.alias ?? t.terminalTitle ?? t.primaryTitle ?? t.detail;
}
function gC(e) {
  return e
    .flatMap((e) => e.sessions)
    .filter((e) => e.isVisible)
    .map((e) => e.shortcutLabel);
}
var _C,
  vC,
  yC,
  bC,
  xC,
  SC = t(() => {
    (Gx(),
      qx(),
      (_C = [
        {
          groupId: `group-1`,
          isActive: !1,
          sessions: [
            pC({
              alias: `show title in 2nd row`,
              detail: `OpenAI Codex`,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
            }),
            pC({
              alias: `layout drift fix`,
              detail: `OpenAI Codex`,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
            }),
            pC({
              alias: `Harbor Vale`,
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
            pC({
              activity: `attention`,
              alias: `tooltip & show an indicator on the active card`,
              detail: `OpenAI Codex`,
              sessionId: `session-4`,
              shortcutLabel: `⌘⌥4`,
            }),
            pC({
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
            pC({
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
      (vC = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            pC({
              activity: `working`,
              alias: `active refactor`,
              detail: `Claude Code`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
            }),
            pC({
              alias: `ui hover audit`,
              detail: `OpenAI Codex`,
              isVisible: !0,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
            }),
            pC({
              activity: `attention`,
              alias: `terminal title indicator`,
              detail: `OpenAI Codex`,
              isVisible: !0,
              sessionId: `session-3`,
              shortcutLabel: `⌘⌥3`,
            }),
            pC({
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
            pC({
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
      (yC = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            pC({
              activity: `working`,
              alias: `extremely long alias for the primary debugging session that should truncate cleanly`,
              detail: `OpenAI Codex running a sidebar layout regression pass with long secondary text`,
              isFocused: !0,
              isVisible: !0,
              sessionId: `session-1`,
              shortcutLabel: `⌘⌥1`,
              terminalTitle: `OpenAI Codex / terminal / feature/sidebar-storybook / very-long-branch-name`,
            }),
            pC({
              activity: `attention`,
              alias: `hover tooltip verification for overflow and status chip alignment`,
              detail: `Claude Code with a surprisingly verbose secondary line to stress wrapping assumptions`,
              isVisible: !0,
              sessionId: `session-2`,
              shortcutLabel: `⌘⌥2`,
              terminalTitle: `Claude Code / visual diff / attention state`,
            }),
            pC({
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
            pC({
              alias: `session card spacing audit across themes`,
              detail: `OpenAI Codex`,
              sessionId: `session-4`,
              shortcutLabel: `⌘⌥4`,
            }),
            pC({
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
            pC({
              alias: `one more card for density`,
              detail: `OpenAI Codex`,
              sessionId: `session-6`,
              shortcutLabel: `⌘⌥6`,
            }),
          ],
          title: `QA`,
        },
      ]),
      (bC = [
        {
          groupId: `group-1`,
          isActive: !0,
          sessions: [
            pC({
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
      (xC = { default: _C, "empty-groups": bC, "overflow-stress": yC, "selector-states": vC }));
  });
function CC(e) {
  return (0, wC.jsx)(sC, { message: fC(e) });
}
var wC,
  TC,
  EC,
  DC,
  OC = t(() => {
    (dC(),
      SC(),
      (wC = i()),
      (TC = {
        fixture: `default`,
        highlightedVisibleCount: 1,
        isFocusModeActive: !1,
        showCloseButtonOnSessionCards: !1,
        showHotkeysOnSessionCards: !1,
        theme: `dark-blue`,
        viewMode: `grid`,
        visibleCount: 1,
      }),
      (EC = {
        fixture: {
          control: `select`,
          options: [`default`, `selector-states`, `overflow-stress`, `empty-groups`],
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
      (DC = [
        (e) =>
          (0, wC.jsx)(`div`, {
            style: { display: `grid`, justifyItems: `center`, minHeight: `100vh`, padding: `16px` },
            children: (0, wC.jsx)(`div`, {
              style: { height: `950px`, overflow: `auto`, width: `300px` },
              children: (0, wC.jsx)(e, {}),
            }),
          }),
      ]),
      (CC.__docgenInfo = {
        description: ``,
        methods: [],
        displayName: `renderSidebarStory`,
        props: {
          fixture: {
            required: !0,
            tsType: {
              name: `union`,
              raw: `| "default"
| "selector-states"
| "overflow-stress"
| "empty-groups"`,
              elements: [
                { name: `literal`, value: `"default"` },
                { name: `literal`, value: `"selector-states"` },
                { name: `literal`, value: `"overflow-stress"` },
                { name: `literal`, value: `"empty-groups"` },
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
export { CC as a, oC as c, OC as i, EC as n, aC as o, DC as r, dC as s, TC as t };
