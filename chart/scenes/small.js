import { TEXT, axes, scale, text, measure, wrap, polyline, glyph, refLine, clipped, smooth, band, clamp01, mixHex, lerp, plate, tagged } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, awaiting, turns, slateOf } from './common.js';
import { LW } from '../../program.js';

const shortPivot = l => String(l).split(/\s+(?=\()/)[0];

function seqAt(S, f) {
  const n = S.frames.length, x = Math.max(0, Math.min(n - 1, f)), i = Math.min(n - 2, Math.floor(x)), t = x - i;
  const A = S.frames[i], B = S.frames[i + 1];
  return { k: A.k, r: A.r.map((v, j) => v + (B.r[j] - v) * t), m: (t < 0.5 ? A : B).m };
}
function frameLabel(tpl, key, value, fallback) {
  if (!tpl) return [fallback, null];
  const t = tpl.replace(`{${key}}`, String(value)), i = t.indexOf(' (');
  return i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t, null];
}
const nearestFrame = (S, mass) => S.frames.reduce((b, fr, i) => (Math.abs(fr.m - mass) < Math.abs(S.frames[b].m - mass) ? i : b), 0);
const NU_T = [0.08, 0.35, 0.5, 0.85, 0.88];

function kBars(env, KB, L, op) {
  const { g, u, T } = env;
  const px = TEXT.min * u, slate = slateOf(T);
  KB.bars.forEach((b, i) => {
    const y = L.top + (i + 0.5) * L.rowH, colour = b.his ? T.accent : b.id === 'desi_3d' || b.id === 'desi_p1d' ? T.ink : slate;
    const k0 = Math.max(b.k[0], L.xr[0]), k1 = Math.min(b.k[1], L.xr[1]), x0 = L.X(k0), x1 = L.X(k1);
    const run = () => {
      polyline(g, [[x0, y], [x1, y]], colour, env, { lw: 0.5, alpha: 0.9 * op });
      const cap = x => polyline(g, [[x, y - 0.55 * u], [x, y + 0.55 * u]], colour, env, { lw: 0.22, alpha: 0.9 * op });
      if (b.k[0] >= L.xr[0]) cap(x0);
      if (b.k[1] <= L.xr[1]) cap(x1);
      else polyline(g, [[x1 - 0.9 * u, y - 0.6 * u], [x1, y], [x1 - 0.9 * u, y + 0.6 * u]], colour, env, { lw: 0.22, alpha: 0.9 * op });
    };
    if (b.his) tagged(g, 'his', run); else run();
    const yb = y + 0.34 * px, w = measure(g, b.name, px);
    const nm = () => text(g, b.name, L.colX, yb, { px, color: b.his ? T.accent : T.ink, alpha: op, role: 'label' });
    if (b.his) tagged(g, 'his', nm); else nm();
    if (b.cite) text(g, `· ${b.cite}`, L.colX + w + 0.45 * px, yb, { px, color: T.muted, alpha: op, italic: true, role: 'label' });
  });
}

export function drawWhy(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.why;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'why', op); return; }
  const { g, u, T } = env;
  const nuIn = smooth(clamp01(((st.nu === undefined ? 1 : st.nu) - 0.8) / 0.2)), wdIn = smooth(clamp01((st.wdm || 0) / 0.3));
  const ft = turns(clamp01(st.nu === undefined ? 1 : st.nu));
  const F = footLayout(env, A, [{ foot: M.foot, alpha: op * (M.footNuCaveat ? ft.out : 1) }, M.footNu && { foot: M.footNu, alpha: nuIn * op, muted: true },
    M.footWdm && { foot: M.footWdm, alpha: wdIn * op, muted: true }]);
  const drop = Math.max(smooth(clamp01((st.wdm || 0) / 0.3)), smooth(clamp01((st.strip || 0) / 0.4)));
  const sw = turns(drop);
  const Fc = M.footNuCaveat ? footLayout(env, A, [{ foot: M.footNuCaveat, alpha: op * ft.in * (M.footNuSource ? sw.out : 1) }]) : null;
  const Fs = M.footNuSource ? footLayout(env, A, [{ foot: M.footNuSource, alpha: op * ft.in * sw.in }]) : null;
  const KB = M.kBars, pxT = TEXT.tick * u, rowH = 1.4 * TEXT.min * u, stripH = KB ? KB.bars.length * rowH + 0.4 * u : 0;
  const stripOff = 0.8 * u + 1.0 * pxT + 1.1 * u;
  A.plotBottom = KB ? Math.min(A.plotBottom, F.top - (stripOff + stripH + 1.3 * TEXT.label * u + 1.2 * u)) : plotBottomAbove(env, A, F.top);
  const S = panels(env, A).solo;
  const P = { ...S, w: 0.57 * S.w }, colX = P.x + P.w + 1.6 * u, colW = A.x1 - colX;
  const X = scale(M.x.range[0], M.x.range[1], P.x, P.x + P.w, true), Y = scale(M.y.range[0], M.y.range[1], P.y + P.h, P.y);
  const stripTop = P.y + P.h + stripOff;
  axes(g, P, { x: { s: X, label: M.zText ? `${M.x.label} · ${M.zText}` : M.x.label, log: true }, y: { s: Y, label: M.y.axis || M.y.label } }, env,
    { alpha: op, ...(KB ? { xTitleDrop: (stripTop - (P.y + P.h) + stripH + 1.0 * TEXT.label * u) / u } : {}) });
  if (Array.isArray(env.notes) && op > 0) env.notes.push({ text: `y: ${M.y.label}`, shown: false, optional: true });
  const px = TEXT.min * u, nu = st.nu === undefined ? 1 : st.nu, wd = st.wdm || 0;
  const inX = k => k >= M.x.range[0] && k <= M.x.range[1];
  const pk = env.charts.pk_z3;
  clipped(g, P, () => {
    if (M.pivot && inX(M.pivot.k)) refLine(g, X(M.pivot.k), P.y, X(M.pivot.k), P.y + P.h, env, { alpha: 0.7 * op, color: T.muted });
    if (M.reference) refLine(g, P.x, Y(M.reference.y), P.x + P.w, Y(M.reference.y), env, { alpha: 0.8 * op });
  });
  const yb = P.y + P.h - 1.8 * u;
  if (M.pivot && inX(M.pivot.k)) text(g, shortPivot(M.pivot.label), X(M.pivot.k) + 1.0 * u, yb, { px, color: T.ink, alpha: op, role: 'label' });

  const grey = T.name === 'dark' ? '#AEB7C4' : '#5B6472';
  const [nuA, nuB] = M.nu;
  const curves = [];
  const entries = [];
  const NS = M.nuSeq;
  const nuEnd = nuB ? nuB : nuA;
  let moving = null, nuFrame0 = null;
  if (NS) {
    const i0 = 0, iA = nearestFrame(NS, nuA.mnu), iB = nearestFrame(NS, nuEnd.mnu);
    const f = nu < NU_T[1] ? i0 + (iA - i0) * smooth(clamp01((nu - NU_T[0]) / (NU_T[1] - NU_T[0]))) : nu < NU_T[2] ? iA : iA + (iB - iA) * smooth(clamp01((nu - NU_T[2]) / (NU_T[3] - NU_T[2])));
    moving = seqAt(NS, f); nuFrame0 = NS.frames[i0];
    const leftA = smooth(clamp01((nu - NU_T[1]) / 0.12));
    if (nuB && leftA > 0) curves.push({ k: NS.frames[iA].k, r: NS.frames[iA].r, c: grey, lw: 0.32, a: leftA * op });
    curves.push({ k: moving.k, r: moving.r, c: T.ink, lw: 0.36, a: op });
  } else {
    for (const [i, n] of M.nu.entries()) curves.push({ k: n.k, r: n.r, c: i === 0 ? grey : T.ink, lw: i === 0 ? 0.32 : 0.36, a: smooth(nu) * op });
    awaiting(env, P.x + 1.0 * u, P.y + P.h - 5.0 * u, 'why.json nu_sequence');
  }
  const WS = M.wdmSeq, WL = M.wdmLimit, wd2 = st.wdm2 || 0;
  let wMoving = null, wGhost = null;
  if (WS && WL) {
    const iS = nearestFrame(WS, M.wdmExcluded ? M.wdmExcluded.m : WS.frames[0].m), iL = nearestFrame(WS, WL.m);
    wGhost = WS.frames[iS];
    wMoving = seqAt(WS, iS + (iL - iS) * smooth(wd2));
    const slate = slateOf(T);
    if (wd2 > 0) curves.push({ k: wGhost.k, r: wGhost.r, c: slate, lw: 0.32, a: 0.35 * smooth(clamp01(wd2 / 0.2)) * op, kmax: M.wdmKmax });
    curves.push({ k: wMoving.k, r: wMoving.r, c: slate, lw: 0.4, a: smooth(clamp01(wd / 0.3)) * op, kmax: M.wdmKmax });
  } else if (wd > 0) awaiting(env, P.x + 1.0 * u, P.y + P.h - 5.0 * u + 1.25 * px, 'why.json wdm_sequence, wdm_limit');
  clipped(g, P, () => {
    for (const cv of curves) {
      if (!(cv.a > 0)) continue;
      const pts = cv.k.map((k, i) => [k, cv.r[i]]).filter(([k]) => inX(k));
      const cut = cv.kmax ? pts.findIndex(([k]) => k > cv.kmax) : -1;
      const solid = cut < 0 ? pts : pts.slice(0, cut), ext = cut < 0 ? [] : pts.slice(Math.max(0, cut - 1));
      polyline(g, solid.map(([k, r]) => [X(k), Y(r)]), cv.c, env, { lw: cv.lw, alpha: cv.a });
      if (ext.length > 1) polyline(g, ext.map(([k, r]) => [X(k), Y(r)]), cv.c, env, { lw: cv.lw, alpha: cv.a, dash: [1.0, 0.7] });
    }
  });
  const endY = (k, r) => { let i = k.length - 1; while (i > 0 && k[i] > M.x.range[1]) i--; return Math.min(Y(r[i]), P.y + P.h - 3.0 * u); };
  const lead = 1.2 * px;
  const linesOf = id => {
    if (id === 'A') return [nuA.label[0], ...wrap(g, nuA.label[1], colW, px, true)];
    if (id === 'B') return [nuB.label[0], ...wrap(g, nuB.label[1], colW, px, true)];
    if (id === 'X') { const one = `warm dark matter, ${M.wdmExcluded ? M.wdmExcluded.m : wGhost.m} keV: excluded by the forest`;
      return measure(g, one, px) <= colW ? [one] : [`warm dark matter, ${M.wdmExcluded ? M.wdmExcluded.m : wGhost.m} keV:`, 'excluded by the forest']; }
    const L = WL.label || ['', ''];
    return [L[0], ...wrap(g, L[1], colW, px, true)];
  };
  const blocks = [];
  const add = (yEnd, n, colour, a, draw, tick = true) => { if (a > 0) blocks.push({ yEnd, n, colour, a, draw, tick }); };
  const floorExit = (k, r) => { let i = k.length - 1; while (i > 0 && k[i] > M.x.range[1]) i--; return Y(r[i]) > P.y + P.h; };
  const wdA = drop;
  const block =(lines, colours, a, nu2 = false) => y0 => lines.forEach((t, j) => text(g, t, colX, y0 + j * lead, { px, color: colours[j] || T.muted, alpha: a * (nu2 && j > 0 ? 1 - wdA : 1), italic: j > 0, role: 'label' }));
  const nuN = n => 1 + (n - 1) * (1 - wdA);
  if (NS) {
    const aA = smooth(clamp01((nu - NU_T[1]) / 0.12)) * op;
    if (nuB && aA > 0) add(endY(nuA.k, nuA.r), nuN(linesOf('A').length), grey, aA, block(linesOf('A'), [T.ink], aA, true));
    const dt = { out: 0, in: smooth(clamp01((nu - NU_T[4]) / (1 - NU_T[4]))) };
    const [head, rest0] = frameLabel(NS.tpl, 'mnu_eV', nuFrame0.m, `Σm_ν = ${nuFrame0.m} eV`);
    const restL = rest0 ? wrap(g, M.fixedNote ? `${rest0.replace(/\)$/, '')}; ${M.fixedNote})` : rest0, colW, px, true) : [];
    const final = [...linesOf(nuB ? 'B' : 'A'), ...(M.nuSource ? wrap(g, M.nuSource, colW, px, true) : [])];
    if (dt.out > 0 || dt.in > 0) add(endY(moving.k, moving.r), nuN(dt.in > 0 ? final.length : 1 + restL.length), T.ink, op * Math.max(dt.out, dt.in), y0 => {
      if (dt.out > 0) { text(g, head, colX, y0, { px, color: T.ink, alpha: op * dt.out, role: 'label' }); restL.forEach((L, j) => text(g, L, colX, y0 + (j + 1) * lead, { px, color: T.muted, alpha: op * dt.out, italic: true, role: 'label' })); }
      if (dt.in > 0) block(final, [T.ink], op * dt.in, true)(y0);
    });
  } else {
    for (const [i, n] of M.nu.entries()) {
      const a = smooth(nu) * op, L = [...linesOf(i === 0 ? 'A' : 'B'), ...(M.nuSource && i === M.nu.length - 1 ? wrap(g, M.nuSource, colW, px, true) : [])];
      add(endY(n.k, n.r), nuN(L.length), i === 0 ? grey : T.ink, a, block(L, [T.ink], a, true));
    }
  }
  if (wMoving) {
    const aX = smooth(clamp01(wd / 0.3)) * op, inW = smooth(clamp01((wd2 - 0.75) / 0.25)) * op;
    const cX = slateOf(T);
    const sh = turns(clamp01((wd2 - 0.5) / 0.3));
    const LX = linesOf('X'), LS = [`${M.wdmExcluded ? M.wdmExcluded.m : wGhost.m} keV: excluded`];
    add(endY(wGhost.k, wGhost.r), sh.in > 0 ? 1 : LX.length, cX, aX, y0 => {
      if (sh.out > 0) block(LX, [cX, T.muted], aX * sh.out)(y0);
      if (sh.in > 0) block(LS, [cX], aX * sh.in * (LW ? 1 : lerp(1, 0.35, smooth(wd2))))(y0);
    }, !floorExit(wGhost.k, wGhost.r));
    const finalW = WS && WL ? WS.frames[nearestFrame(WS, WL.m)] : wMoving;
    if (inW > 0) add(endY(finalW.k, finalW.r), linesOf('W').length, slateOf(T), inW, block(linesOf('W'), [slateOf(T), T.muted, T.muted], inW));
  }
  blocks.sort((p0, q) => p0.yEnd - q.yEnd);
  let floor = -Infinity;
  for (const b of blocks) {
    b.y0 = Math.max(b.yEnd + 0.35 * px, floor + 0.8 * px + 0.6 * u);
    floor = b.y0 + (b.n - 1) * lead + 0.25 * px;
  }
  let ceil = P.y + P.h - 1.2 * u;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i], bottom = b.y0 + (b.n - 1) * lead + 0.25 * px;
    if (bottom > ceil) b.y0 -= bottom - ceil;
    ceil = b.y0 - 0.8 * px - 0.6 * u;
  }
  for (const b of blocks) {
    if (b.tick) {
      g.save(); if (g.__mark) g.__mark('leader'); g.globalAlpha *= 0.7 * b.a; g.strokeStyle = b.colour; g.lineWidth = Math.max(1, 0.14 * u);
      g.beginPath(); g.moveTo(P.x + P.w + 0.3 * u, b.yEnd); g.lineTo(colX - 0.4 * u, b.y0 - 0.35 * px); g.stroke(); g.restore();
    }
    b.draw(b.y0);
  }
  if (KB) kBars(env, KB, { x0: P.x, x1: P.x + P.w, top: stripTop, rowH, X, xr: M.x.range, colX }, op);
  F.draw(); if (Fc) Fc.draw(); if (Fs) Fs.draw();
}

const GREY = T => (T.name === 'dark' ? '#AEB7C4' : '#5B6472');

export function drawEmulator(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.emulator;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'emulator', op); return; }
  const { g, u, T } = env;
  const p = st.pred, out0 = 1 - smooth(clamp01(p / 0.3)), t = smooth(clamp01((p - 0.15) / 0.4)), in1 = smooth(clamp01((p - 0.5) / 0.5));
  const F0 = footLayout(env, A, [{ foot: M.footDesign, alpha: out0 * op }], 4), F1 = footLayout(env, A, [{ foot: M.footLine, alpha: in1 * op }], 4);
  const bottom = Math.min(A.plotBottom, F0.top - 9.6 * u, F1.top - 9.6 * u);
  const left = A.x0 + 7.5 * u, split = A.x0 + 0.55 * (A.x1 - A.x0);
  const P = { x: left, y: A.plotTop, w: split - left, h: bottom - A.plotTop };
  const colX = split + 5.0 * u, colW = A.x1 - colX;
  const inset = { x: colX + 6.0 * u, y: A.plotTop, w: A.x1 - colX - 6.0 * u, h: 0.34 * P.h };
  const Dr = { x: P.x + (inset.x - P.x) * t, y: P.y + (inset.y - P.y) * t, w: P.w + (inset.w - P.w) * t, h: P.h + (inset.h - P.h) * t };
  if (in1 > 0) prediction(env, M, P, in1 * op);
  design(env, M, Dr, op, t);
  if (out0 > 0) blockDesign(env, M, { x: colX, y: A.plotTop, w: colW }, out0 * op);
  if (in1 > 0) blockLine(env, M, { x: colX, y: inset.y + inset.h + 7.8 * u, w: colW }, in1 * op);
  F0.draw(); F1.draw();
}

const powLabel = (sym, p) => (p === null ? sym : `${sym} [${`10^{${String(p).replace('-', '−')}}`}]`);

function design(env, M, D, op, t) {
  const { g, u, T } = env;
  const Z = M.design;
  const X = scale(Z.xr[0], Z.xr[1], D.x, D.x + D.w), Y = scale(Z.yr[0], Z.yr[1], D.y + D.h, D.y);
  const bare = t > 0.5;
  const full = (0.8 * u + TEXT.tick * u + 1.35 * TEXT.label * u) / u, small = (0.8 * u + 1.0 * TEXT.label * u) / u;
  axes(g, D, { x: { s: X, label: Z.xSym, bare }, y: { s: Y, label: powLabel(Z.ySym, Z.yPow), bare } }, env, { alpha: op, xTitleDrop: full + (small - full) * t });
  if (Z.line) polyline(g, [[X(Z.line.x), Y(Z.line.y[0])], [X(Z.line.x), Y(Z.line.y[1])]], T.accent, env, { lw: 0.3, alpha: (0.35 + 0.55 * t) * op });
  const k = 1 - 0.3 * t;
  for (const p of Z.lf) cross(g, X(p[0]), Y(p[1]), 0.55 * k * u, GREY(T), u, op);
  for (const p of Z.hf) glyph(g, 'circle', X(p[0]), Y(p[1]), 0.9 * k * u, T.accent, env, { alpha: op });
}

function prediction(env, M, P, a) {
  const { g, u, T } = env;
  const L = M.line;
  const vals = [...L.lo, ...L.hi, ...L.lf, ...L.training.map(p => p[1])];
  const lo = Math.min(...vals), hi = Math.max(...vals), pd = 0.1 * (hi - lo);
  const X = scale(L.Ap[0], L.Ap[L.Ap.length - 1], P.x, P.x + P.w), Y = scale(lo - pd, hi + pd, P.y + P.h, P.y);
  const [yTitle, yRest] = String(L.yLabel).split(/,\s*relative to\s*/);
  axes(g, P, { x: { s: X, label: powLabel(L.xLabel, M.design.yPow) }, y: { s: Y, label: yRest ? `${yTitle} (relative)` : yTitle } }, env, { alpha: a });
  clipped(g, P, () => {
    if (L.meas) { g.save(); g.globalAlpha *= 0.12 * a; g.fillStyle = T.accent; g.fillRect(X(L.meas.x - L.meas.sd), P.y, X(L.meas.x + L.meas.sd) - X(L.meas.x - L.meas.sd), P.h); g.restore(); }
    refLine(g, P.x, Y(1), P.x + P.w, Y(1), env, { alpha: 0.7 * a });
    band(g, L.Ap.map((x, i) => [X(x), Y(L.hi[i])]), L.Ap.map((x, i) => [X(x), Y(L.lo[i])]), T.accent, 0.22 * a, env);
    polyline(g, L.Ap.map((x, i) => [X(x), Y(L.r[i])]), T.accent, env, { lw: 0.4, alpha: a });
    polyline(g, L.Ap.map((x, i) => [X(x), Y(L.lf[i])]), T.ink, env, { lw: 0.3, alpha: 0.85 * a, dash: [1.0, 0.6] });
    for (const p of L.training) glyph(g, 'circle-open', X(p[0]), Y(p[1]), 0.6 * u, T.ink, env, { alpha: a });
  });
}

function cross(g, x, y, r, colour, u, a) {
  if (!(a > 0)) return;
  g.save(); g.globalAlpha *= a; g.strokeStyle = colour; g.lineWidth = Math.max(1.2, 0.26 * u); if (g.__mark) g.__mark('point');
  g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x - r, y + r); g.lineTo(x + r, y - r); g.stroke(); g.restore();
}

function blockDesign(env, M, B, a) {
  const { g, u, T } = env;
  const px = TEXT.min * u, tp = TEXT.label * u, lead = 1.22 * px;
  let y = B.y + 0.8 * tp;
  if (M.title) for (const L of wrap(g, M.title, B.w, tp)) { text(g, L, B.x, y, { px: tp, color: T.accent, alpha: a, role: 'label' }); y += 1.18 * tp; }
  if (M.mfLabel) { y += 0.2 * u; for (const L of wrap(g, M.mfLabel, B.w, px, true)) { text(g, L, B.x, y, { px, color: T.accent, alpha: a, italic: true, role: 'label' }); y += lead; } }
  y += 1.6 * u;
  const sw = 3.2 * u;
  for (const [kind, words] of [['lf', M.lf.label], ['hf', M.hf.label]]) {
    const lines = wrap(g, words, B.w - sw, px);
    const cy = y - 0.32 * px;
    if (kind === 'lf') cross(g, B.x + 1.2 * u, cy, 0.55 * u, GREY(T), u, a);
    else glyph(g, 'circle', B.x + 1.2 * u, cy, 0.9 * u, T.accent, env, { alpha: a });
    lines.forEach((L, j) => text(g, L, B.x + sw, y + j * lead, { px, color: kind === 'hf' ? T.accent : T.ink, alpha: a, role: 'label' }));
    y += lines.length * lead + 0.5 * u;
  }
}

function blockLine(env, M, B, a) {
  const { g, u, T } = env;
  const L = M.line, px = TEXT.min * u, lead = 1.22 * px, sw = 4.0 * u;
  const yRest = String(L.yLabel).split(/,\s*relative to\s*/)[1];
  const rows = [];
  if (M.design.line && M.design.line.key) rows.push(['vline', M.design.line.key, T.accent]);
  rows.push(
    ['band', "my emulator's prediction ± its own 1σ", T.accent],
    ['dash', 'the low-fidelity level of the same emulator', T.ink],
    ['dot', 'low-fidelity training runs: compare them with the dashed line', T.ink]);
  if (L.meas) rows.push(['meas', `${L.meas.label.split(/\s+\(/)[0]}: mean ± sd`, T.accent]);
  if (yRest) rows.push(['ref', `1 = ${yRest}`, T.muted]);
  let y = B.y;
  for (const [kind, words, colour] of rows) {
    const lines = wrap(g, words, B.w - sw, px), cy = y - 0.32 * px;
    if (kind === 'band') { g.save(); g.globalAlpha *= 0.22 * a; g.fillStyle = T.accent; g.fillRect(B.x, cy - 0.6 * u, 3.0 * u, 1.2 * u); g.restore(); polyline(g, [[B.x, cy], [B.x + 3.0 * u, cy]], T.accent, env, { lw: 0.4, alpha: a }); }
    if (kind === 'dash') polyline(g, [[B.x, cy], [B.x + 3.0 * u, cy]], T.ink, env, { lw: 0.3, alpha: 0.85 * a, dash: [1.0, 0.6] });
    if (kind === 'vline') polyline(g, [[B.x + 1.5 * u, cy - 1.0 * u], [B.x + 1.5 * u, cy + 1.0 * u]], T.accent, env, { lw: 0.3, alpha: a });
    if (kind === 'dot') glyph(g, 'circle-open', B.x + 1.5 * u, cy, 0.6 * u, T.ink, env, { alpha: a });
    if (kind === 'ref') refLine(g, B.x, cy, B.x + 3.0 * u, cy, env, { alpha: 0.8 * a });
    if (kind === 'meas') { g.save(); g.globalAlpha *= 0.12 * a * 2; g.fillStyle = T.accent; g.fillRect(B.x + 0.6 * u, cy - 1.0 * u, 1.8 * u, 2.0 * u); g.restore(); }
    lines.forEach((Ln, j) => text(g, Ln, B.x + sw, y + j * lead, { px, color: colour, alpha: a, role: 'label' }));
    y += lines.length * lead + 0.4 * u;
  }
}

