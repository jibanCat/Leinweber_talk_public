import { TEXT, axes, refLine, errorBar, glyph, textRuns, sigSplit, lerpRect, smooth, stagger, placeLabels, text, breakLabel, clamp01, scale, polyline, lineObstacles, fillAlphaFor, mixHex, lerp, clipped, fillLoops, strokeLoops, segmentHitsBox, tagged, wrap } from '../kit.js';
import { area, panels, scales, footLayout, plotBottomAbove, unavailable, placeholderStamp, commonPrefix, measure, awaiting, caveatNote, turns } from './common.js';
import { drawStack, stackBottom, stackLayout, DIST_WORDS, modelInk, modelTag } from './bao.js';


export function drawW0wa(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  let M = env.charts.w0wa;
  const D = env.charts.distances, DM = env.charts.de_models, SN = null;
  const A = area(env);
  if (!D || !D.plain) { unavailable(env, panels(env, A).solo, 'distances', op); return; }
  const de = st.de || 0, fit = st.fit || 0, sn = st.sne || 0, an = st.anchor || 0;
  const a2 = st.a2 || 0;
  const ph = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));
  const away = (t, o0, o1, b0, b1) => (t <= 0 || t >= 1 ? 1 : t < b0 ? 1 - smooth(ph(t, o0, o1)) : smooth(ph(t, b0, b1)));
  const names = away(de, 0, 0.12, 0.4, 0.5) * away(fit, 0, 0.05, 0.21, 0.28) * away(an, 0, 0.1, 0.56, 0.66);
  const planeOut = 1 - smooth(ph(an, 0, 0.1));
  const walkOn = smooth(ph(fit, WALK.t0 - 0.02, WALK.t0 + 0.02)) * (1 - smooth(ph(fit, WALK.t0 + 3 * WALK.dt, WALK.t0 + 3 * WALK.dt + 0.06)));
  const order = DM ? DM.models.filter(m => !m.lcdm) : [];
  const litOf = m => {
    const k = order.indexOf(m);
    if (k < 0) return 0;
    const w0 = WALK.t0 + k * WALK.dt, w1 = w0 + WALK.dt;
    return smooth(ph(fit, w0 - 0.015, w0 + 0.015)) * (k === order.length - 1 ? 1 : 1 - smooth(ph(fit, w1 - 0.015, w1 + 0.015)));
  };
  const dim = m => 1 - walkOn * (1 - env.T.pale) * (1 - litOf(m));
  const o = a2 > 0 ? {
    a: op, top: 1 - smooth(ph(a2, 0.03, 0.12)), grow: smooth(ph(a2, 0.12, 0.22)), names: away(a2, 0, 0.03, 0.22, 0.27), cap: 0,
    mod: ph(a2, 0.24, 0.46), split: 0, sel: 0, xr: 1 - smooth(ph(a2, 0.48, 0.5)), shrink: smooth(ph(a2, 0.5, 0.55)),
    share: smooth(ph(a2, 0.55, 0.63)), marks: smooth(ph(a2, 0.72, 0.78)), pts: 1, lya: 1, sn: 0, sne: null, dim: () => 1,
    baoNames: 1 - smooth(ph(a2, 0, 0.03)), grey: 1, family: smooth(ph(a2, 0.42, 0.48)), fs: smooth(ph(a2, 0.92, 1)),
  } : {
    a: op, top: 1 - smooth(ph(de, 0, 0.15)), grow: smooth(ph(de, 0.15, 0.4)), names,
    cap: smooth(ph(de, 0.42, 0.52)) * (1 - smooth(ph(fit, 0, 0.05))),
    mod: ph(de, 0.5, 1), split: an > 0 ? 1 - smooth(ph(an, 0.12, 0.3)) : smooth(ph(fit, 0.07, 0.19)),
    sel: smooth(ph(fit, 0.88, 1)) * (1 - smooth(ph(an, 0.3, 0.38))), xr: 1 - smooth(ph(an, 0.38, 0.42)),
    shrink: smooth(ph(an, 0.42, 0.55)), share: smooth(ph(an, 0.56, 0.7)), marks: smooth(ph(an, 0.75, 0.9)), pts: 1, lya: 1,
    sn: smooth(ph(sn, 0.13, 0.3)), sne: SN, dim, baoNames: 1 - smooth(ph(an, 0, 0.1)),
  };
  const tA = turns(a2 > 0 ? ph(a2, 0.2, 0.4) : ph(de, 0.3, 0.6)), tB = turns(ph(fit, 0.66, 0.74)), tS = turns(ph(sn, 0.1, 0.3)), tC = turns(ph(an, 0, 0.3));
  const F0 = footLayout(env, A, [{ foot: D.plain.foot, alpha: op * tA.out }]);
  const F1 = DM ? footLayout(env, A, [{ foot: DM.foot, alpha: op * (a2 > 0 ? tA.in : an > 0 ? tC.in : tA.in * tB.out) }]) : null;
  const F2 = M ? footLayout(env, A, [{ foot: M.foot, alpha: op * tB.in * (SN ? tS.out : 1) * tC.out }]) : null;
  const F3 = SN ? footLayout(env, A, [{ foot: SN.foot, alpha: op * tS.in * tC.out }]) : null;
  A.plotBottom = stackBottom(env, A, Math.min(...[F0, F1, F2, F3].filter(Boolean).map(F => F.top)));
  const L = stackLayout(env, A, o);
  drawStack(env, A, D, DM, o);
  const pa = op * smooth(ph(fit, 0.21, 0.28)) * planeOut;
  if (M && pa > 0) {
    const Q = L.plane;
    if (M.y && M.y.range && M.y.range[1] < PLANE_WA_TOP) M = planeModel(M);
    main(env, A, Q, Q, M, { ax: 1, cmb: smooth(ph(fit, 0.73, 0.86)), sne: ph(sn, 0.34, 1), names: 1 }, pa, 0, true);
    if (DM) curvePoints(env, Q, M, DM, pa, o.sel, { walk: fit >= 1 ? 1 : ph(fit, WALK.t0, WALK.t0 + order.length * WALK.dt), dim, order });
  }
  for (const F of [F0, F1, F2, F3]) if (F) F.draw();
}
export const WALK = { t0: 0.29, dt: 0.12 };
export const PLANE_WA_TOP = 2.0;
const planeMemo = new WeakMap();
function planeModel(M) {
  if (!planeMemo.has(M)) planeMemo.set(M, { ...M, y: { ...M.y, range: [M.y.range[0], PLANE_WA_TOP] } });
  return planeMemo.get(M);
}

const tagMemo = new WeakMap();
function pointTags(env, Q, M, DM, avoid) {
  const { g, u } = env, px = TEXT.min * u;
  const key = `${Q.x.toFixed(1)}|${Q.y.toFixed(1)}|${Q.w.toFixed(1)}|${Q.h.toFixed(1)}|${u.toFixed(4)}`;
  const cache = tagMemo.get(DM) || new Map();
  if (cache.has(key)) return cache.get(key);
  const { X, Y } = scales(M, Q);
  const segs = [];
  for (const s of M.series) for (const Ls of s.loops) for (const loop of Ls) {
    const pts = loop.map(q => [X(q[0]), Y(q[1])]);
    for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  }
  const bounds = { x: Q.x + 0.5 * u, y: Q.y + 0.5 * u, w: Q.w - 1 * u, h: Q.h - 1 * u };
  const placed = avoid.map(b => ({ ...b })), out = {};
  const glyphs = DM.models.filter(m => !m.lcdm).map(m => ({ x: X(m.w0) - 1.4 * u, y: Y(m.wa) - 1.4 * u, w: 2.8 * u, h: 2.8 * u }));
  for (const m of DM.models) {
    if (m.lcdm) continue;
    const t = modelTag(m), w = measure(g, t, px), h = 1.05 * px, cx = X(m.w0), cy = Y(m.wa), pad = Math.max(0.4 * u, px / 3);
    let pick = null;
    for (let r = 1.6; r <= 14 && !pick; r += 0.6) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
        const ax = cx + dx * r * u, ay = cy + dy * r * u;
        const b = { x: dx > 0.1 ? ax : dx < -0.1 ? ax - w : ax - w / 2, y: dy > 0.1 ? ay : dy < -0.1 ? ay - h : ay - h / 2, w, h };
        const inB = b.x >= bounds.x && b.x + b.w <= bounds.x + bounds.w && b.y >= bounds.y && b.y + b.h <= bounds.y + bounds.h;
        if (!inB) continue;
        if (placed.some(o => b.x < o.x + o.w + pad && o.x < b.x + b.w + pad && b.y < o.y + o.h + pad && o.y < b.y + b.h + pad)) continue;
        if (glyphs.some(o => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h)) continue;
        if (segs.some(([p, q]) => segmentHitsBox(p[0], p[1], q[0], q[1], b, 0.3 * u))) continue;
        pick = b; break;
      }
    }
    if (pick) { out[m.id] = pick; placed.push(pick); }
  }
  if (cache.size > 16) cache.clear();
  cache.set(key, out); tagMemo.set(DM, cache);
  return out;
}
function curvePoints__(env, Q, M, DM, a, sel, w = {}) {
  const { g, u, T } = env;
  if (!(a > 0)) return;
  const { X, Y } = scales(M, Q);
  const px = TEXT.min * u, order = w.order || DM.models.filter(m => !m.lcdm), dim = w.dim || (() => 1), walk = w.walk === undefined ? 1 : w.walk;
  const avoid = planeWordBoxes(env, Q, M);
  const tags = pointTags(env, Q, M, DM, avoid);
  order.forEach((m, k) => {
    const arr = smooth(clamp01((walk * order.length - k) / 0.25));
    if (!(arr > 0)) return;
    const out = m.inside && m.inside['DESI+CMB'] === 'outside';
    const pa = a * arr * dim(m) * (out ? 1 - (1 - T.pale) * smooth(sel || 0) : 1), ink = modelInk(T, m, DM);
    glyph(g, m.glyph, X(m.w0), Y(m.wa), 0.9 * u, ink, env, { alpha: pa, lw: 0.34 });
    const b = tags[m.id];
    if (b) text(g, modelTag(m), b.x, b.y + 0.8 * px, { px, color: ink, alpha: pa, role: 'label' });
  });
  const pc = planeCaption(env, Q, M);
  pc.lines.forEach((Ln, j) => text(g, Ln, pc.x, pc.y0 + j * 1.15 * px, { px, color: T.muted, alpha: a, italic: true, role: 'label' }));
}
function planeCaption(env, P, M) {
  const { g, u } = env, px = TEXT.min * u, { X } = scales(M, P);
  const x = P.x + 1.4 * u, room = (M.reference && M.reference.x !== null ? X(M.reference.x) - 1.0 * u : P.x + P.w / 3) - x;
  const lines = wrap(g, DIST_WORDS.plane, room, px, true), y0 = P.y + 1.2 * u + 0.8 * px;
  const w = Math.max(...lines.map(L => measure(g, L, px, true)));
  return { lines, x, y0, box: { x, y: y0 - 0.8 * px, w, h: (lines.length - 1) * 1.15 * px + 1.05 * px } };
}
function curvePoints(...args) { return tagged(args[0].g, 'lya', () => curvePoints__(...args)); }
function planeWordBoxes(env, P, M) {
  const { g, u } = env, px = TEXT.label * u, spx = TEXT.min * u;
  const { X, Y } = scales(M, P), out = [];
  if (M.reference && M.reference.x !== null && M.reference.y !== null && M.reference.label) {
    const lw = measure(g, M.reference.label, px), rx = X(M.reference.x), ry = Y(M.reference.y);
    out.push({ x: rx - 1.0 * u - lw - 0.35 * px, y: ry - 1.0 * u - 0.8 * px, w: lw + 0.7 * px, h: 1.05 * px });
  }
  if (M.reference) {
    if (M.reference.x !== null) out.push({ x: X(M.reference.x) - 0.3 * u, y: P.y, w: 0.6 * u, h: P.h });
    if (M.reference.y !== null) out.push({ x: P.x, y: Y(M.reference.y) - 0.3 * u, w: P.w, h: 0.6 * u });
  }
  out.push(planeCaption(env, P, M).box);
  const lab = planeLabels(env, P, M);
  out.push(...lab.avoid);
  for (const k of Object.keys(lab.pos)) { out.push(lab.pos[k].box); if (lab.pos[k].sub) out.push(lab.pos[k].sub); }
  return out;
}

function frame(env, P, M, a) {
  if (!(a > 0)) return;
  const { g, u, T } = env;
  const { X, Y } = scales(M, P);
  axes(g, P, { x: { s: X, label: M.x.label }, y: { s: Y, label: M.y.label } }, env, { alpha: a });
  const ref = crosshair(env, P, X, Y, M.reference, a);
  if (ref && M.reference.label) {
    const px = TEXT.label * u, lw = measure(g, M.reference.label, px);
    text(g, M.reference.label, ref[0] - 1.0 * u - lw, ref[1] - 1.0 * u, { px, color: T.ink, alpha: a, role: 'label' });
  }
}

function crosshair(env, P, X, Y, ref, a) {
  if (!ref) return null;
  const { g, u, T } = env;
  if (ref.x !== null) refLine(g, X(ref.x), P.y, X(ref.x), P.y + P.h, env, { alpha: 0.85 * a });
  if (ref.y !== null) refLine(g, P.x, Y(ref.y), P.x + P.w, Y(ref.y), env, { alpha: 0.85 * a });
  return ref.x !== null && ref.y !== null ? [X(ref.x), Y(ref.y)] : null;
}

const NEW_LW = { o95: 1.4, o68: 1.2 };
const OLD_LW = { o95: 1.4, o68: 0.9 };
const FADED = { paper: '#5B6472', dark: '#AEB7C4' };
export function w0waStyle(T, f) {
  const old = FADED[T.name] || FADED.paper;
  return { colour: mixHex(T.ink, old, f), fill: fillAlphaFor(T.ink, T.ground) * (1 - f), label: mixHex(T.ink, T.muted, f),
    o95: lerp(NEW_LW.o95, OLD_LW.o95, f), o68: lerp(NEW_LW.o68, OLD_LW.o68, f) };
}
function shortName(base, label) {
  return base && label.startsWith(`${base}+`) ? `+ ${label.slice(base.length + 1)}` : label;
}

const endMemo = new WeakMap();
function endLabels(g, M, R, X, Y, u, names, px, avoid, subs = []) {
  const key = `${R.x.toFixed(1)}|${R.y.toFixed(1)}|${R.w.toFixed(1)}|${R.h.toFixed(1)}|${u.toFixed(4)}|${names.join(',')}|${subs.join(',')}`;
  const cache = endMemo.get(M) || new Map();
  if (cache.has(key)) return cache.get(key);
  const segs = [];
  for (const s of M.series) for (const L of s.loops) for (const loop of L) {
    const pts = loop.map(q => [X(q[0]), Y(q[1])]);
    for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  }
  const h = 1.05 * px, pad = 0.4 * u, placed = avoid.map(b => ({ ...b }));
  const clear = b => b.x >= R.x + 0.5 * u && b.x + b.w <= R.x + R.w - 0.5 * u && b.y >= R.y + 0.5 * u && b.y + b.h <= R.y + R.h - 0.5 * u
    && !placed.some(o => b.x < o.x + o.w + pad && o.x < b.x + b.w + pad && b.y < o.y + o.h + pad && o.y < b.y + b.h + pad)
    && !segs.some(([p, q]) => segmentHitsBox(p[0], p[1], q[0], q[1], b, 0.3 * u));
  const crosses = b => segs.filter(([p, q]) => segmentHitsBox(p[0], p[1], q[0], q[1], b, 0)).length;
  const base = M.series[0].loops[0].flat().map(q => [X(q[0]), Y(q[1])]);
  const l0 = base.reduce((b, p) => (p[0] < b[0] ? p : b)), l1 = base.reduce((b, p) => (p[0] > b[0] ? p : b));
  const dl = Math.hypot(l1[0] - l0[0], l1[1] - l0[1]) || 1, dir = [(l1[0] - l0[0]) / dl, (l1[1] - l0[1]) / dl];
  const out = {};
  const ends = M.series.map((s, i) => {
    if (i === 0) return null;
    const pts = s.loops[s.loops.length - 1].flat().map(q => [X(q[0]), Y(q[1])]);
    return { i, e: pts.reduce((b, p) => (p[0] * dir[0] + p[1] * dir[1] > b[0] * dir[0] + b[1] * dir[1] ? p : b)) };
  }).filter(Boolean).sort((p, q) => p.e[0] - q.e[0]);
  const spx = TEXT.min * u, hOf = i => h + (subs[i] ? 1.15 * spx : 0);
  for (const { i, e } of ends) {
    if (!names[i]) continue;
    const w = Math.max(measure(g, names[i], px), subs[i] ? measure(g, subs[i], spx, true) : 0), h = hOf(i);
    let pick = null, least = Infinity;
    for (let k = 1; k <= 30; k++) for (let sx = 0; sx <= w + 0.9 * u; sx += 0.5 * u) {
      const cost = 0.5 * k * u + 0.5 * sx;
      if (cost >= least) break;
      const b = { x: e[0] - 0.3 * u - w + sx, y: e[1] + 0.5 * k * u, w, h };
      if (clear(b)) { pick = b; least = cost; }
    }
    if (!pick) pick = { x: e[0] - 0.3 * u - w, y: e[1] + 0.5 * u, w, h };
    placed.push(pick); out[i] = { box: pick, cross: crosses(pick) };
  }
  {
    const w = measure(g, names[0], px), x = R.x + R.w - 0.6 * u - w;
    const top = Math.min(...M.series[0].loops[M.series[0].loops.length - 1].flat().map(q => [X(q[0]), Y(q[1])]).filter(p => p[0] >= x && p[0] <= x + w).map(p => p[1]), R.y + R.h);
    let pick = null;
    for (let y = top - h - 0.5 * u; y >= R.y + 0.5 * u && !pick; y -= 0.5 * u) { const b = { x, y, w, h }; if (clear(b)) pick = b; }
    if (!pick) pick = { x, y: R.y + 0.5 * u, w, h };
    placed.push(pick); out[0] = { box: pick, cross: crosses(pick) };
  }
  for (const [ii, sub] of subs.entries()) if (sub && out[ii]) { const nb = out[ii].box; out[ii].sub = { x: nb.x, y: nb.y + 1.05 * px + 0.1 * u, w: measure(g, sub, spx, true), h: 1.05 * spx }; }
  if (globalThis.__labelDebug) for (const [i, o] of Object.entries(out)) globalThis.__labelDebug.push({ key: names[i], best: { box: o.box, cross: o.cross, far: 0 }, n: 1 });
  if (cache.size > 16) cache.clear();
  cache.set(key, out); endMemo.set(M, cache);
  return out;
}

function planeLabels(env, Rref, M) {
  const { g, u } = env, px = TEXT.label * u, spx = TEXT.min * u;
  const S0 = scales(M, Rref), avoid = [];
  if (M.reference && M.reference.x !== null && M.reference.y !== null && M.reference.label) {
    const lw = measure(g, M.reference.label, px), rx = S0.X(M.reference.x), ry = S0.Y(M.reference.y);
    avoid.push({ x: rx - 1.0 * u - lw - 0.35 * px, y: ry - 1.0 * u - 0.8 * px, w: lw + 0.7 * px, h: 1.05 * px });
  }
  if (M.reference) {
    if (M.reference.x !== null) avoid.push({ x: S0.X(M.reference.x) - 0.3 * u, y: Rref.y, w: 0.6 * u, h: Rref.h });
    if (M.reference.y !== null) avoid.push({ x: Rref.x, y: S0.Y(M.reference.y) - 0.3 * u, w: Rref.w, h: 0.6 * u });
  }
  const sigRoom = (M.reference && M.reference.x !== null ? S0.X(M.reference.x) - Rref.x : Rref.w / 3) - 1.4 * u - 1.2 * u;
  const sigL = sigLines(g, spx, sigRoom);
  if (M.series.some(s => s.significance)) {
    const sw = Math.max(...sigL.map(L => measure(g, L, spx, true))), nl = sigL.length - 1;
    avoid.push({ x: Rref.x + 1.0 * u, y: Rref.y + Rref.h - 1.2 * u - 0.25 * spx - nl * 1.15 * spx - 0.8 * spx - 0.3 * u, w: sw + 0.8 * u, h: nl * 1.15 * spx + 1.05 * spx + 0.6 * u });
  }
  avoid.push(planeCaption(env, Rref, M).box);
  const names = M.series.map((s, i) => { const n = i ? shortName(M.series[0].label, s.label) : s.label; return s.significance ? `${n}: ${s.significance}` : n; });
  const subs = M.series.map(s => (/DESY5/.test(s.label) && !/Dovekie/.test(s.label) ? '(since recalibrated)' : null));
  const pos = {}, n = M.series.length;
  const ref = M.reference && M.reference.x !== null && M.reference.y !== null ? M.reference : null;
  if (ref && n > 1) {
    const x0 = S0.X(ref.x) + 1.4 * u, last = S0.Y(ref.y) - 0.6 * u - 0.25 * spx;
    const rows = [];
    for (let i = 0; i < n; i++) { rows.push({ i }); if (subs[i]) rows.push({ i, sub: true }); }
    const pitch = k => (rows[k + 1] && rows[k + 1].sub ? 0.25 * px + 0.3 * u + 0.8 * spx : 1.15 * px);
    const base = k => { let b = last; for (let j = rows.length - 2; j >= k; j--) b -= pitch(j); return b; };
    const top = base(0) - 0.8 * px;
    const fits = top >= Rref.y + 0.5 * u && rows.every((r, k) => x0 + (r.sub ? measure(g, subs[r.i], spx, true) : measure(g, names[r.i], px)) <= Rref.x + Rref.w - 0.5 * u);
    if (fits) rows.forEach((r, k) => {
      const b = base(k);
      if (r.sub) pos[r.i].sub = { x: x0, y: b - 0.8 * spx, w: measure(g, subs[r.i], spx, true), h: 1.05 * spx };
      else pos[r.i] = { box: { x: x0, y: b - 0.8 * px, w: measure(g, names[r.i], px), h: 1.05 * px }, cross: 0 };
    });
    if (fits) avoid.push({ x: x0, y: top, w: Math.max(...rows.map(r => (r.sub ? measure(g, subs[r.i], spx, true) : measure(g, names[r.i], px)))), h: last + 0.25 * px - top });
  }
  const rest = endLabels(g, M, Rref, S0.X, S0.Y, u, names.map((L, i) => (pos[i] ? '' : L)), px, avoid, subs.map((L, i) => (pos[i] ? null : L)));
  for (const k of Object.keys(rest)) if (!pos[k]) pos[k] = rest[k];
  return { names, subs, sigL, avoid, pos };
}

export const SIG_NOTE = 'σ: how strongly evolving dark energy is preferred over ΛCDM';
function sigLines(g, px, room) {
  const out = [];
  let line = '';
  for (const w of SIG_NOTE.split(' ')) { const t = line ? `${line} ${w}` : w; if (line && measure(g, t, px, true) > room) { out.push(line); line = w; } else line = t; }
  out.push(line);
  return out;
}

function main(env, A, P, Rref, M, st, op, split, ownFrame = true) {
  const { g, u, T } = env;
  const a = st.ax * op;
  const nameA = st.names === undefined ? 1 : st.names;
  if (!(a > 0)) return;
  const { X, Y } = scales(M, P);
  if (ownFrame) axes(g, P, { x: { s: X, label: M.x.label }, y: { s: Y, label: M.y.label } }, env, { alpha: a });
  const ref = ownFrame ? crosshair(env, P, X, Y, M.reference, a) : (M.reference && M.reference.x !== null && M.reference.y !== null ? [X(M.reference.x), Y(M.reference.y)] : null);
  const rest = M.series.length - 1;
  const arrive = M.series.map((s, i) => (i === 0 ? smooth(st.cmb) : stagger(st.sne, i - 1, rest, 0.4)));
  const shown = M.series.map((s, i) => ({ s, a: arrive[i] * op, sty: w0waStyle(T, i < rest ? arrive[i + 1] : 0) }));
  clipped(g, P, () => {
    for (const { s, a: sa, sty } of shown) if (sa > 0 && sty.fill > 0) fillLoops(g, s.loops[0], X, Y, sty.colour, sty.fill * sa);
    for (const { s, a: sa, sty } of [...shown].sort((p, q) => q.sty.fill - p.sty.fill)) {
      if (!(sa > 0)) continue;
      if (s.loops.length > 1) strokeLoops(g, s.loops[s.loops.length - 1], X, Y, sty.colour, sa, T.line95 * sty.o95, env);
      strokeLoops(g, s.loops[0], X, Y, sty.colour, 0.9 * sa, T.line68 * sty.o68, env);
    }
  });
  const px = TEXT.label * u, lw = M.reference && M.reference.label ? measure(g, M.reference.label, px) : 0;
  if (ref && M.reference.label && ownFrame) text(g, M.reference.label, ref[0] - 1.0 * u - lw, ref[1] - 1.0 * u, { px, color: T.ink, alpha: a * nameA, role: 'label' });
  const lab = planeLabels(env, Rref, M), { names, subs, sigL } = lab;
  const spx = TEXT.min * u;
  if (Array.isArray(env.notes) && a > 0) env.notes.push({ text: 'DES Y5 has since been recalibrated by its team as DES-Dovekie (DESI DR2 IV), which lowered the preference; darkenergy.3 shows DESI + CMB + DES-Dovekie', shown: false, optional: true });
  const pos = nameA > 0 ? lab.pos : {};
  shown.forEach(({ a: sa, sty }, i) => {
    const p = pos[i];
    if (!p || !(sa > 0)) return;
    const x = p.box.x + (P.x - Rref.x), y = p.box.y + (P.y - Rref.y) + 0.8 * px;
    const sp = sigSplit(names[i]), o2 = { px, color: i ? T.muted : sty.label, alpha: sa * nameA, role: 'label' };
    if (sp) textRuns(g, [{ t: sp[0] }, { t: sp[1], px: TEXT.min * u, color: T.muted }], x, y, o2); else text(g, names[i], x, y, o2);
    if (subs[i] && p.sub) { text(g, subs[i], p.sub.x + (P.x - Rref.x), p.sub.y + (P.y - Rref.y) + 0.8 * TEXT.min * u, { px: TEXT.min * u, color: T.muted, alpha: sa * nameA, italic: true, role: 'label' }); caveatNote(env, subs[i], sa); }
  });
  const ca = smooth(st.cmb) * op * nameA;
  if (ca > 0 && M.series.some(s => s.significance)) sigL.forEach((L, j) => text(g, L, P.x + 1.4 * u, P.y + P.h - 1.2 * u - 0.25 * spx - (sigL.length - 1 - j) * 1.15 * spx, { px: spx, color: T.muted, alpha: ca, italic: true, role: 'label' }));
  placeholderStamp(env, P, M, a);
}

function separate__(env, A, Q, M, st, op, ownFrame = true) {
  const { g, u, T } = env;
  const S = M.separate, a = smooth(st.split) * op, pa = smooth(st.iv) * op;
  if (!(a > 0)) return;
  const { X, Y } = scales(S, Q);
  if (ownFrame) axes(g, Q, { x: { s: X, label: S.x.label }, y: { s: Y, label: S.y.label } }, env, { alpha: a });
  const ref = ownFrame ? crosshair(env, Q, X, Y, M.reference, a) : (M.reference && M.reference.x !== null && M.reference.y !== null ? [X(M.reference.x), Y(M.reference.y)] : null);
  const { caption, labels: names } = commonPrefix(S.points.map(p => p.label));
  const labels = names.map((L, i) => (S.points[i].significance ? `${L}: ${S.points[i].significance}` : L));
  if (caption) text(g, caption, Q.x + Q.w, Q.y - 1.0 * TEXT.label * u, { px: TEXT.min * u, color: T.accent, alpha: pa, align: 'right', role: 'label' });
  const lv = (M.series[0] && M.series[0].levels && M.series[0].levels[0]) || '';
  const cpx = TEXT.min * u;
  [`${lv} intervals of w₀ and w_a`.trim(), '(no contours published)'].forEach((L, j) => text(g, L, Q.x + 1.4 * u, Q.y + Q.h - 1.2 * u - 0.25 * cpx - (1 - j) * 1.15 * cpx, { px: cpx, color: T.muted, alpha: pa, italic: true, role: 'label' }));
  const items = [], boxes = [];
  if (ref && M.reference.label) {
    const px = TEXT.label * u, w = measure(g, M.reference.label, px);
    const x = ref[0] - 1.0 * u - w, y = ref[1] - 1.0 * u;
    if (ownFrame) text(g, M.reference.label, x, y, { px, color: T.ink, alpha: a, role: 'label' });
    boxes.push({ x, y: y - 0.8 * px, w, h: 1.05 * px });
  }
  S.points.forEach((p, i) => {
    if (!(pa > 0)) return;
    const x = X(p.x), y = Y(p.y);
    if (p.xb) errorBar(g, x, y, { xlo: X(p.xb[0]), xhi: X(p.xb[1]) }, T.accent, env, { alpha: pa, lw: 0.34 });
    if (p.yb) errorBar(g, x, y, { ylo: Y(p.yb[0]), yhi: Y(p.yb[1]) }, T.accent, env, { alpha: pa, lw: 0.34 });
    glyph(g, 'circle-open', x, y, 1.15 * u, T.accent, env, { alpha: pa, lw: 0.4 });
    const x0 = p.xb ? Math.min(X(p.xb[0]), X(p.xb[1])) : x, x1 = p.xb ? Math.max(X(p.xb[0]), X(p.xb[1])) : x;
    const y0 = p.yb ? Math.min(Y(p.yb[0]), Y(p.yb[1])) : y, y1 = p.yb ? Math.max(Y(p.yb[0]), Y(p.yb[1])) : y;
    boxes.push({ x: x0 - 1.2 * u, y: y - 1.6 * u, w: x1 - x0 + 2.4 * u, h: 3.2 * u }, { x: x - 1.6 * u, y: y0 - 1.2 * u, w: 3.2 * u, h: y1 - y0 + 2.4 * u });
    const right = (x1 - x) / u + 1.6, left = (x0 - x) / u - 1.6, below = (y1 - y) / u + 4.8, above = (y0 - y) / u - 3.0;
    items.push({ text: breakLabel(g, labels[i], 0.4 * Q.w, TEXT.label * u), x, y, px: TEXT.label * u, color: T.accent, alpha: pa, leader: false,
      runs: L => { const sp = sigSplit(L); return sp ? [{ t: sp[0] }, { t: sp[1], color: T.muted, px: TEXT.min * u }] : null; },
      cands: [[right, 1.1, 'left'], [left, 1.1, 'right'], [1.2, below, 'left'], [-1.2, below, 'right'], [0, below, 'center'], [1.2, above, 'left'], [-1.2, above, 'right'], [0, above, 'center'], [right, -2.4, 'left'], [right, 4.6, 'left'], [0, below + 3.6, 'center'], [0, above - 3.6, 'center']] });
  });
  if (ref) boxes.push({ x: ref[0] - 0.7 * u, y: Q.y, w: 1.4 * u, h: Q.h }, { x: Q.x, y: ref[1] - 0.7 * u, w: Q.w, h: 1.4 * u });
  placeLabels(g, items, env, { avoid: boxes, bounds: { x: Q.x + 0.5 * u, y: Q.y + 0.5 * u, w: Q.w - 1 * u, h: Q.h - 1 * u } });
  placeholderStamp(env, Q, M, a);
}
function separate(...args) { return tagged(args[0].g, 'lya', () => separate__(...args)); }
