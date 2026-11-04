import { drawThermal, t0Panel, TH } from './thermal.js';
import { TEXT, axes, scale, text, textRuns, polyline, glyph, errorBar, band as fillBand, clipped, smooth, clamp01, lerp, measure, fillAlphaFor, tagged, fmt, irisGate } from '../kit.js';
import { area, footLayout, plotBottomAbove, unavailable, panels, awaiting, planeFrame, planeSeries, hisName, PLANE } from './common.js';
import { drawMultifid } from './multifid.js';
import { plain } from '../plain.js';

export const NU = { out: 0.1, in: [0.1, 0.22], walk: 0.22 };

export function drawEmuWalk(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.emulator_walk;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'emulator_walk', op); return; }
  const { g, u, T } = env;
  const Z = env.charts.emulator_zbins || null, Pm = env.charts.emulator_params || null, MF = env.charts.multifid || null;
  const NP = Pm && Pm.plane ? Pm.plane : null;
  const post = st.post === undefined ? 1 : st.post, nu = st.nu || 0;
  const th = clamp01(st.th || 0), thX = smooth(clamp01(th / TH.out)), thO = 1 - thX;
  const mfA = 1 - smooth(clamp01(post / 0.3)), plA = smooth(clamp01((post - 0.3) / 0.3)), daA = smooth(clamp01((post - 0.6) / 0.4));
  const nX = smooth(clamp01(nu / NU.out)), nP = smooth(clamp01((nu - NU.in[0]) / (NU.in[1] - NU.in[0]))), nW = clamp01((nu - NU.walk) / (1 - NU.walk));
  const replay = nu > 0;
  const opP = op * plA * (1 - nX), opD = op * daA * thO * (1 - nX), opN = op * nP * thO;
  const walking = !replay && (st.walk || 0) > 0 && M.footWalk;
  const F = footLayout(env, A, [{ foot: walking ? M.footWalk : M.foot, alpha: opD * (1 - nX) }, Z && { foot: Z.foot, alpha: opD * (1 - nX) }]);
  const Fm = MF ? footLayout(env, A, [{ foot: MF.foot, alpha: op * mfA }]) : null;
  const TM0 = env.charts.thermal || null, tFootA = replay && TM0 ? op * thO * smooth(clamp01((nu - 0.2) / 0.1)) : 0;
  const Fn = Pm ? footLayout(env, A, [{ foot: Pm.foot, alpha: opN }, tFootA > 0 && { foot: TM0.foot, alpha: tFootA }].filter(Boolean)) : null;
  A.plotBottom = plotBottomAbove(env, A, F.top);
  const px = TEXT.min * u;
  if (mfA > 0) drawMultifid(env, A, st, op * mfA);
  const top = A.plotTop + 1.0 * u;
  const left = A.x0 + 7.5 * u, mid = A.x0 + 0.44 * (A.x1 - A.x0);
  const L = { x: left, y: top, w: mid - left, h: A.plotBottom - top };
  const R = { x: mid + 13.0 * u, y: top, w: A.x1 - mid - 13.0 * u, h: A.plotBottom - top };
  const walk = replay ? nW : (st.walk || 0), bandS = (st.band || 0) * (1 - nX), bandA = smooth(bandS) * op;
  const demo = M.demo ? M.demo.samples : [], chain = M.walk;
  const path = [...demo, ...chain], nd = demo.length;
  const split = nd ? 0.45 : 0;
  const at = w => (w <= split && nd ? (w / split) * (nd - 1) : nd + ((w - split) / (1 - split)) * (chain.length - 1));
  const iPos = at(clamp01(walk));
  const i0 = Math.floor(iPos), i1 = Math.min(path.length - 1, i0 + 1), f = iPos - i0;
  const cur = { x: lerp(path[i0].x, path[i1].x, f), y: lerp(path[i0].y, path[i1].y, f) };
  const walkA = smooth(clamp01((st.walk || 0) / 0.04)) * (1 - smooth(clamp01((st.band || 0) / 0.4))) * op * (1 - nX);
  const walkR = replay ? op * smooth(clamp01(nW / 0.04)) : walkA;

  if (opP > 0) {
    const { X, Y } = planeFrame(env, L, opP);
    planeSeries(env, L, X, Y, { his: { loops: M.post.loops, a: opP } });
    hisName(env, L, X, Y, M.post.loops, opP, M.post.recomputed ? PLANE.hisNameB : PLANE.hisName);
    { const cpx = TEXT.min * u; text(g, PLANE.compressed, L.x + L.w - 1 * u, L.y + 1 * u + 0.8 * cpx, { px: cpx, color: T.muted, alpha: opP, italic: true, align: 'right', role: 'label' }); }
    if (walkA > 0) {
      clipped(g, L, () => {
        const lo = Math.max(0, i0 - 10);
        for (let i = lo; i < i0; i++) {
          const t = (i - lo + 1) / (i0 - lo + 1);
          polyline(g, [[X(path[i].x), Y(path[i].y)], [X(path[i + 1].x), Y(path[i + 1].y)]], T.ink, env, { lw: 0.16, alpha: 0.6 * t * walkA });
          glyph(g, 'circle', X(path[i].x), Y(path[i].y), 0.32 * u, T.ink, env, { alpha: 0.6 * t * walkA });
        }
      });
      clipped(g, L, () => glyph(g, 'circle', X(cur.x), Y(cur.y), 0.7 * u, T.ink, env, { alpha: walkA }));
      const dA = nd ? walkA * (1 - smooth(clamp01((walk - split + 0.04) / 0.06))) : 0, cA = walkA * (nd ? smooth(clamp01((walk - split) / 0.06)) : 1);
      if (dA > 0) {
        const DL = ['ours, from', 'a poor start'], dw = Math.max(...DL.map(t => measure(g, t, px, true))), yb2 = L.y + L.h - 1.0 * u - 0.25 * px - 0.35 * px, yb1 = yb2 - 1.15 * px;
        const low = demo.filter(q => Y(q.y) >= yb1 - 0.8 * px - 3.0 * u).map(q => X(q.x)), xl = (low.length ? Math.max(...low) : L.x) + 0.7 * u + 1.5 * u;
        const x0 = xl + dw <= L.x + L.w - 2.5 * u ? xl : L.x + L.w - 2.5 * u - dw;
        DL.forEach((t, j) => text(g, t, x0, j ? yb2 : yb1, { px, color: T.ink, alpha: dA, italic: true, role: 'label' }));
      }
      if (cA > 0) {
        const o95 = M.post.loops[M.post.loops.length - 1].flat(), xs = o95.map(q => X(q[0])), yLow = Math.max(...o95.map(q => Y(q[1])));
        text(g, "my chain's own samples", (Math.min(...xs) + Math.max(...xs)) / 2, yLow + 1.0 * u + 0.8 * px, { px, color: T.ink, alpha: cA, italic: true, align: 'center', role: 'label' });
      }
      if (!nd && env.test) awaiting(env, L.x + 1.0 * u, L.y + L.h - 3.6 * u, 'emulator_walk.json demo_run');
    }
  }
  if (NP && opN > 0) nuisancePlane(env, L, NP, { a: opN, walkA: op * nP * smooth(clamp01(nW / 0.04)), iPos, walk: nW, split, nd });
  else if (!NP && replay && env.test) awaiting(env, L.x + 1.0 * u, L.y + 3.0 * u, 'emulator_params.json plane');

  const SZ = replay ? { ...st, walk, band: bandS } : st;
  if (Z && opD > 0) zPanels(env, R, Z, M, SZ, { opD, walkA: walkR, iPos, nd, bandA, replay, keyA: replay ? smooth(clamp01(nW / 0.04)) : null });
  else if (!Z && opD > 0 && env.test) awaiting(env, R.x + 1.0 * u, R.y + 3.0 * u, 'emulator_zbins.json');
  const zA = op * daA * (1 - nX) * smooth(clamp01(((st.walk || 0) - 0.03) / 0.05));
  if (M.nWord && zA > 0) {
    const { y1, y2 } = keyRows(env, R);
    text(g, 'the constraint comes from the joint fit', A.x0, y1, { px, color: T.muted, alpha: zA, italic: true, role: 'label' });
    text(g, `across ${M.nWord} redshift bins`, A.x0, y2, { px, color: T.muted, alpha: zA, italic: true, role: 'label' });
  }
  const TM = env.charts.thermal || null;
  const tR = { x: R.x + 2.0 * u, y: L.y, w: Math.min(L.w, R.w - 2.0 * u), h: L.h };
  const nuT = (a0, a1) => op * thO * smooth(clamp01((nu - a0) / (a1 - a0)));
  if (TM && replay) t0Panel(env, tR, TM, nuT(0.1, 0.2), nuT(0.2, 0.32), nuT(0.32, 0.42));
  const Ft = TM && th > 0 ? footLayout(env, A, [{ foot: TM.foot, alpha: op * smooth(clamp01((th - TH.band[0]) / 0.1)) }]) : null;
  if (TM && th > 0) drawThermal(env, L, R, TM, th, op);
  else if (!TM && th > 0 && env.test) awaiting(env, L.x + 1.0 * u, L.y + 3.0 * u, 'thermal.json');
  F.draw(); if (Fm) Fm.draw(); if (Fn) Fn.draw(); if (Ft) Ft.draw();
}

const HEADROOM = 1.32;
export function zLayout(env, R, Z) {
  const { u } = env;
  const cols = 3, rows = Math.ceil(Z.bins.length / cols), gx = 2.2 * u, gy = 1.8 * u;
  const w = (R.w - (cols - 1) * gx) / cols, h = (R.h - (rows - 1) * gy) / rows;
  const cell = i => { const r = Math.floor(i / cols), c = i % cols; return { x: R.x + c * (w + gx), y: R.y + r * (h + gy), w, h, r, c }; };
  return { cols, rows, cell };
}
function keyRows(env, R) {
  const { u } = env, px = TEXT.min * u, tp = TEXT.label * u;
  const yx = R.y + R.h + 0.8 * u + 1.0 * px + 1.35 * tp;
  const y1 = yx + 0.25 * tp + 0.5 * px + 0.8 * px;
  return { y1, y2: y1 + 1.6 * px };
}
function yTitleAt(env, xb, yc, label, a) {
  const { g, u, T } = env, tp = TEXT.label * u, w = measure(g, label, tp), fix = g.__irisFix;
  if (!(a > 0)) return;
  if (g.__iris) g.__irisFix = irisGate(g.__iris, { x: xb - 0.8 * tp, y: yc - w / 2, w: 1.05 * tp, h: w }, tp);
  g.save(); g.globalAlpha *= a; g.translate(xb, yc); g.rotate(-Math.PI / 2);
  text(g, label, 0, 0, { px: tp, color: T.ink, align: 'center', role: 'axis' });
  g.restore();
  g.__irisFix = fix;
}
function zPanels(env, R, Z, M, st, o) {
  const { g, u, T } = env;
  const px = TEXT.min * u, tl = 0.8 * u;
  const { opD, walkA, iPos, nd, bandA } = o;
  const walk = st.walk || 0;
  const W = Z.walk && Z.walk.demo.length === nd && Z.walk.chain.length === M.walk.length ? [...Z.walk.demo, ...Z.walk.chain] : null;
  const { cols, rows, cell } = zLayout(env, R, Z);
  const k = Z.k, kr = [k[0] / 1.18, k[k.length - 1] * 1.18];
  const xTicks = [0.01, 0.05].filter(v => v > kr[0] && v < kr[1]).map(v => ({ v, label: fmt(v, 2) }));
  const rowHi = Array.from({ length: rows }, (_, r) => {
    const js = Z.bins.map((b, j) => j).filter(j => Math.floor(j / cols) === r);
    const v = js.flatMap(j => [...Z.bins[j].y.map((y, i) => y + Z.bins[j].s[i]), ...Z.bins[j].band.p97p5, ...(W ? W.flatMap(q => q.models[j]) : [])]);
    return HEADROOM * Math.max(...v);
  });
  const yTicksOf = hi => { const step = [0.02, 0.05, 0.1, 0.2].find(s => hi / s <= 3.6) || 0.5, out = [];
    for (let v = 0; v <= hi + 1e-9; v += step) out.push({ v: +v.toFixed(3), label: v === 0 ? '0' : fmt(v, step < 0.1 ? 2 : 1) }); return out; };
  const i0 = Math.floor(iPos), i1 = W ? Math.min(W.length - 1, i0 + 1) : 0, f = iPos - i0;
  const pairA = M.band && !o.replay ? 1 - smooth(clamp01(walk / 0.06)) : 0;
  const ghostA = walkA * smooth(clamp01((iPos - 1) / 2));
  const last = Z.bins.length - 1;
  let wNum = 0;
  Z.bins.forEach((b, j) => {
    const C = cell(j), hi = rowHi[C.r];
    const X = scale(kr[0], kr[1], C.x, C.x + C.w, true), Y = scale(0, hi, C.y + C.h, C.y);
    const yt = yTicksOf(hi).filter(t => C.r === 0 || Y(t.v) >= C.y + 0.7 * px);
    const lowest = j + cols > last, rightmost = j === last;
    axes(g, C, { x: { s: X, label: rightmost ? 'k [s/km]' : '', log: true, ticks: xTicks, bare: !lowest }, y: { s: Y, label: '', ticks: yt, bare: C.c !== 0 } }, env, { alpha: opD });
    if (C.c === 0) wNum = Math.max(wNum, ...yt.map(t => measure(g, t.label, px)));
    text(g, `z = ${b.z.toFixed(1)}`, C.x + 1.0 * u, C.y + 0.8 * px + 0.3 * u, { px, color: T.muted, alpha: opD, role: 'label' });
    const line = q => k.map((kk, i) => [X(kk), Y(q[i])]);
    clipped(g, C, () => {
      if (M.band && bandA > 0) tagged(g, 'his', () => {
        fillBand(g, line(b.band.p97p5), line(b.band.p2p5), T.accent, fillAlphaFor(T.accent, T.ground, 20) * bandA, env);
        fillBand(g, line(b.band.p84), line(b.band.p16), T.accent, fillAlphaFor(T.accent, T.ground, 30) * bandA, env);
      });
      if (pairA > 0) polyline(g, line(b.band.p50), T.ink, env, { lw: 0.3, alpha: opD * pairA });
      if (W) {
        if (ghostA > 0) polyline(g, line(W[0].models[j]), T.wash, env, { lw: 0.26, alpha: ghostA, dash: [0.8, 0.5] });
        if (walkA > 0) {
          for (let t = 3; t >= 1; t--) { const i = i0 - 2 * t; if (i > 0) polyline(g, line(W[i].models[j]), T.ink, env, { lw: 0.18, alpha: (0.12 + 0.06 * (3 - t)) * walkA }); }
          polyline(g, line(W[i0].models[j].map((v, i) => lerp(v, W[i1].models[j][i], f))), T.ink, env, { lw: 0.32, alpha: walkA });
        }
      }
      k.forEach((kk, i) => {
        errorBar(g, X(kk), Y(b.y[i]), { ylo: Y(Math.max(0, b.y[i] - b.s[i])), yhi: Y(b.y[i] + b.s[i]) }, T.muted, env, { alpha: opD, lw: 0.24, cap: 0.4 });
        glyph(g, 'circle', X(kk), Y(b.y[i]), 0.42 * u, T.muted, env, { alpha: opD });
      });
    });
  });
  const tp = TEXT.label * u;
  yTitleAt(env, R.x - tl - 0.5 * u - wNum - 0.7 * u - 0.25 * tp, R.y + R.h / 2, plain('p1d.y', 'power, k P1D / π'), opD);
  const { y1, y2 } = keyRows(env, R), sw = 3.4 * u, x0 = R.x;
  errorBar(g, x0 + 1.2 * u, y1 - 0.32 * px, { ylo: y1 - 0.32 * px + 0.9 * u, yhi: y1 - 0.32 * px - 0.9 * u }, T.muted, env, { alpha: opD, lw: 0.24, cap: 0.4 });
  glyph(g, 'circle', x0 + 1.2 * u, y1 - 0.32 * px, 0.42 * u, T.muted, env, { alpha: opD });
  const nm = M.dataName.replace(/ at z = .*$/, ''), cite = `(${M.dataCite || 'Karaçaylı et al. 2022'})`;
  textRuns(g, [{ t: `${nm} ` }, { t: cite }], x0 + sw, y1, { px, color: T.muted, alpha: opD, role: 'label' });
  const pa = opD * Math.max(pairA, o.keyA !== null && o.keyA !== undefined ? o.keyA : walkA > 0 ? 1 : 0) * (1 - smooth(clamp01((st.band || 0) / 0.4)));
  if (pa > 0) {
    polyline(g, [[x0 + 0.2 * u, y2 - 0.32 * px], [x0 + 2.4 * u, y2 - 0.32 * px]], T.ink, env, { lw: 0.32, alpha: pa });
    const pn = "my emulator's prediction";
    text(g, pn, x0 + sw, y2, { px, color: T.ink, alpha: pa, role: 'label' });
    if (ghostA > 0) {
      const gx = x0 + sw + measure(g, pn, px) + 1.0 * px;
      polyline(g, [[gx + 0.2 * u, y2 - 0.32 * px], [gx + 2.4 * u, y2 - 0.32 * px]], T.wash, env, { lw: 0.26, alpha: ghostA, dash: [0.8, 0.5] });
      text(g, 'the poor start', gx + sw, y2, { px, color: T.muted, alpha: ghostA, italic: true, role: 'label' });
    }
  }
  const ba = opD * smooth(clamp01(((st.band || 0) - 0.4) / 0.6));
  if (M.band && ba > 0) tagged(g, 'his', () => {
    g.save(); g.globalAlpha *= ba; if (g.__mark) g.__mark('band'); g.fillStyle = T.accent;
    g.globalAlpha *= fillAlphaFor(T.accent, T.ground, 20); g.fillRect(x0 + 0.2 * u, y2 - 0.32 * px - 0.9 * u, 2.2 * u, 1.8 * u); g.restore();
    g.save(); g.globalAlpha *= ba * fillAlphaFor(T.accent, T.ground, 30); g.fillStyle = T.accent; g.fillRect(x0 + 0.2 * u, y2 - 0.32 * px - 0.45 * u, 2.2 * u, 0.9 * u); g.restore();
    text(g, `all my posterior's predictions (${M.post.levels.join(', ')})`, x0 + sw, y2, { px, color: T.accent, alpha: ba, role: 'label' });
  });
}


const ticksAt = (lo, hi, step) => {
  const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)), out = [];
  for (let i = Math.ceil(lo / step - 1e-9); i * step <= hi + 1e-9; i++) { const v = +(i * step).toFixed(d); out.push({ v, label: v === 0 ? '0' : fmt(v, d) }); }
  return out;
};
export function nuisanceFrame(L, NP) {
  const F = NP.frame;
  return { X: scale(F.x[0], F.x[1], L.x, L.x + L.w), Y: scale(F.y[0], F.y[1], L.y + L.h, L.y) };
}
function nuisancePlane(env, L, NP, o) {
  const { g, u, T } = env, px = TEXT.min * u;
  const { a, walkA, iPos, walk, split, nd } = o;
  const F = NP.frame, { X, Y } = nuisanceFrame(L, NP);
  const tk = NP.ticks || { x: (F.x[1] - F.x[0]) / 4, y: (F.y[1] - F.y[0]) / 4 };
  axes(g, L, { x: { s: X, label: NP.xLabel, ticks: ticksAt(F.x[0], F.x[1], tk.x) }, y: { s: Y, label: NP.yLabel, ticks: ticksAt(F.y[0], F.y[1], tk.y) } }, env, { alpha: a });
  planeSeries(env, L, X, Y, { his: { loops: NP.loops, a } });
  hisName(env, L, X, Y, NP.loops, a, PLANE.hisName);
  const P = NP.walk;
  if (!(walkA > 0) || P.length < 2) return;
  const i0 = Math.min(P.length - 1, Math.floor(iPos)), i1 = Math.min(P.length - 1, i0 + 1), f = iPos - Math.floor(iPos);
  clipped(g, L, () => {
    const lo = Math.max(0, i0 - 10);
    for (let i = lo; i < i0; i++) {
      const t = (i - lo + 1) / (i0 - lo + 1);
      polyline(g, [[X(P[i].x), Y(P[i].y)], [X(P[i + 1].x), Y(P[i + 1].y)]], T.ink, env, { lw: 0.16, alpha: 0.6 * t * walkA });
      glyph(g, 'circle', X(P[i].x), Y(P[i].y), 0.32 * u, T.ink, env, { alpha: 0.6 * t * walkA });
    }
    glyph(g, 'circle', X(lerp(P[i0].x, P[i1].x, f)), Y(lerp(P[i0].y, P[i1].y, f)), 0.7 * u, T.ink, env, { alpha: walkA });
  });
  const dA = nd ? walkA * (1 - smooth(clamp01((walk - split + 0.04) / 0.06))) : 0, cA = walkA * (nd ? smooth(clamp01((walk - split) / 0.06)) : 1);
  const xr = L.x + L.w - 2.5 * u, yb = L.y + L.h - 1.0 * u - 0.25 * px - 0.35 * px;
  if (dA > 0 && NP.words.demo) text(g, NP.words.demo, xr, yb, { px, color: T.ink, alpha: dA, italic: true, align: 'right', role: 'label' });
  if (cA > 0 && NP.words.chain) text(g, NP.words.chain, xr, yb, { px, color: T.ink, alpha: cA, italic: true, align: 'right', role: 'label' });
}

const PHYS_ORDER = ['Ap', 'ns', 'tau0', 'dtau0', 'herei', 'heref', 'alphaq', 'hireionz', 'bhfeedback', 'hub', 'omegamh2'];
const KIND_ORDER = ['lls', 'sub', 'sdla', 'ldla'];
export function stripLayout(env, A, L, R, Pm) {
  const { u } = env, px = TEXT.min * u;
  const { y1 } = keyRows(env, R);
  const x0 = A.x0, x1 = L.x + L.w;
  const top = y1 + 0.25 * px + 1.0 * u, bottom = Math.min(top + 7.0 * u, A.footBottom - 0.8 * TEXT.foot * u - 1.2 * u);
  const isC = id => Pm.cosmology.includes(id), has = new Set(Pm.params.map(q => q.id));
  const phys = PHYS_ORDER.filter(id => has.has(id));
  const kinds = KIND_ORDER.map(k => Pm.params.filter(q => q.kind === k).sort((p, q) => p.z - q.z).map(q => q.id));
  const placed = new Set([...phys, ...kinds.flat()]);
  const groups = [phys.filter(isC), [...phys.filter(id => !isC(id)), ...Pm.params.filter(q => !placed.has(q.id)).map(q => q.id)], ...kinds];
  const gapAfter = [1.6, 1.6, 0.6, 0.6, 0.6];
  let slot = 0;
  const items = [];
  groups.forEach((G, gi) => {
    G.forEach(id => { items.push({ id, slot }); slot += 1; });
    if (G.length && gi < groups.length - 1) slot += gapAfter[gi];
  });
  const pitch = (x1 - x0) / slot;
  items.forEach(it => { it.x = x0 + (it.slot + 0.5) * pitch; });
  return { x0, x1, top, bottom, y1, pitch, items };
}
function paramStrip(env, A, L, R, Pm, NP, iPos, a) {
  const { g, u, T } = env, px = TEXT.min * u;
  const S = stripLayout(env, A, L, R, Pm);
  const byId = Object.fromEntries(Pm.params.map(q => [q.id, q]));
  tagged(g, 'his', () => textRuns(g, [{ t: Pm.words.count, color: T.muted }, { t: ' · ', color: T.muted }, { t: Pm.words.want || 'the two we want', color: T.accent }], S.x0, S.y1,
    { px, italic: true, alpha: a, role: 'label' }));
  const nW = Pm.nDemo + Pm.nChain, i0 = Math.max(0, Math.min(nW - 1, Math.floor(iPos))), i1 = Math.min(nW - 1, i0 + 1), f = iPos - Math.floor(iPos);
  const pad = 0.5 * u, h = S.bottom - S.top, planeIds = NP ? [NP.x, NP.y] : [];
  for (const it of S.items) {
    const q = byId[it.id], c = Pm.cosmology.includes(it.id), pl = planeIds.includes(it.id);
    const v = lerp(q.walk[i0], q.walk[i1], f), t = clamp01((v - q.prior[0]) / (q.prior[1] - q.prior[0]));
    polyline(g, [[it.x, S.top], [it.x, S.bottom]], T.hair, env, { lw: 0.12, alpha: a });
    const dot = () => glyph(g, 'circle', it.x, S.bottom - pad - t * (h - 2 * pad), (c || pl ? 0.5 : 0.34) * u, c ? T.accent : pl ? T.ink : T.muted, env, { alpha: a });
    if (c) tagged(g, 'his', dot); else dot();
  }
}
