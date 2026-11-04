import { TEXT, axes, scale, text, measure, polyline, glyph, refLine, fillLoops, strokeLoops, clipped, ellipseLoop, placeLabels, smooth, lerp, stagger, lineObstacles, wrap, clamp01, fillHis, tagged } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, placeholderStamp, refNames, slateOf, PLANE, planeFrame, planeSeries, planeColour, planeGrey, hisName, planeArrow } from './common.js';
import { plain } from '../plain.js';

export function drawHcd(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.absorbers;
  const A = area(env);
  if (!M || !M.xi) { unavailable(env, panels(env, A).solo, 'absorbers', st.xi * op); return; }
  const F = footLayout(env, A, [{ foot: M.footModel, alpha: st.xi * op }], 4);
  A.plotBottom = plotBottomAbove(env, A, F.top);
  const R = panels(env, A), sp = M.p1d ? st.split || 0 : 0;
  const xa = 1 - smooth(clamp01(sp / 0.5)), aa = smooth(clamp01((sp - 0.5) / 0.5));
  if (xa > 0) xiPanel(env, R.solo, R.solo, M, st, op * xa);
  if (M.p1d && aa > 0) p1dPanel(env, R.solo, M, aa * op, smooth(st.p1d) * op);
  const fa = sp > 0 && sp < 1 ? op * (1 - xa - aa) : 0;
  if (fa > 0) {
    const P = R.solo, { g, u, T } = env;
    g.save(); g.globalAlpha *= fa; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.16 * u);
    g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x, P.y + P.h); g.lineTo(P.x + P.w, P.y + P.h); g.stroke(); g.restore();
  }
  placeholderStamp(env, R.solo, M, st.xi * op);
  F.draw();
}

function xiPanel(env, P, Rref, M, st, op) {
  const { g, u, T } = env;
  const a = st.xi * op, ha = smooth(st.hcd) * op;
  if (!(a > 0)) return;
  const X0 = M.xi.r[0], X1 = M.xi.r[M.xi.r.length - 1];
  const all = M.xi.wedges.flatMap(w => [...w.with, ...w.without]);
  const lo = Math.min(...all), hi = Math.max(...all), pd = 0.1 * (hi - lo);
  const X = scale(Math.floor(X0 / 50) * 50, X1, P.x, P.x + P.w), Y = scale(lo - 3.6 * pd, hi + 2.2 * pd, P.y + P.h, P.y);
  axes(g, P, { x: { s: X, label: `separation r [${M.xi.xUnit}]` }, y: { s: Y, label: /^clustering/.test(M.xi.yLabel) ? M.xi.yLabel : `clustering, ${M.xi.yLabel}` } }, env, { alpha: a });
  const greys = [T.ink, T.name === 'dark' ? '#AEB7C4' : '#5B6472'];
  const items = [], avoid = [];
  clipped(g, P, () => {
    M.xi.wedges.forEach((w, i) => {
      const without = M.xi.r.map((r, k) => [X(r), Y(w.without[k])]), withH = M.xi.r.map((r, k) => [X(r), Y(w.with[k])]);
      const hh = smooth(clamp01(st.hcd));
      if (hh < 1) polyline(g, without, greys[i % 2], env, { lw: 0.36, alpha: a * (1 - hh) });
      if (hh > 0) polyline(g, without, slateOf(T), env, { lw: 0.36, alpha: a * hh, dash: [1.0, 0.6] });
      if (ha > 0) polyline(g, withH, T.ink, env, { lw: i === 0 ? 0.38 : 0.3, alpha: ha });
      avoid.push(...lineObstacles(without, u, 1, 0.5), ...lineObstacles(withH, u, 1, 0.5));
    });
  });
  M.xi.wedges.forEach((w, i) => {
    const k = M.xi.r.length - 1, hi = Math.min(Y(w.without[k]), Y(w.with[k])), lo = Math.max(Y(w.without[k]), Y(w.with[k]));
    const where = w.mu[0] >= 0.5 ? 'along the line of sight' : w.mu[1] <= 0.5 ? 'across' : 'in between';
    const ks = M.xi.r.map((r, j) => j).filter(j => M.xi.r[j] >= X0 + 0.65 * (X1 - X0));
    const deep = Math.max(...ks.flatMap(j => [Y(w.without[j]), Y(w.with[j])]));
    if (Array.isArray(env.notes) && a > 0) env.notes.push({ text: `${where}: μ ${w.mu.join('–')}`, shown: false, optional: true });
    items.push({ text: where, x: X(M.xi.r[k]), y: hi, px: TEXT.min * u, color: greys[i % 2], alpha: a, leader: false,
      cands: [[-0.5, -1.4 - 1.15 * TEXT.min, 'right'], [-0.5, (lo - hi) / u + 3.6, 'right'], [-0.5, (deep - hi) / u + 1.0 + 0.8 * TEXT.min, 'right'], [-0.5, -4.8 - 1.15 * TEXT.min, 'right'], [-0.5, (lo - hi) / u + 7.2, 'right'], [-8, -1.4 - 1.15 * TEXT.min, 'right'], [-8, (lo - hi) / u + 3.6, 'right']] });
  });
  const w0 = M.xi.wedges[0], kk = M.xi.r.findIndex(r => r >= X0 + 0.2 * (X1 - X0));
  if (ha > 0 && kk >= 0) {
    const yw = Y(w0.with[kk]), yo = Y(w0.without[kk]);
    items.push({ text: 'with dense absorbers', x: X(M.xi.r[kk]), y: Math.min(yw, yo), px: TEXT.min * u, color: T.ink, alpha: ha, leader: false,
      cands: [[1, -1.4, 'left'], [1, -4.8, 'left'], [6, -1.4, 'left'], [6, -4.8, 'left']] });
    items.push({ text: 'without', x: X(M.xi.r[kk]), y: Math.max(yw, yo), px: TEXT.min * u, color: slateOf(T), alpha: ha, italic: true, leader: false,
      cands: [[1, 3.8, 'left'], [6, 3.8, 'left'], [1, 7.2, 'left'], [10, 3.8, 'left']] });
  }
  placeLabels(g, items, env, { avoid, bounds: { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 1 * u } });
}

function p1dPanel(env, Q, M, aa, pa) {
  const { g, u, T } = env;
  if (!(aa > 0)) return;
  const K = M.p1d.k, all = M.p1d.curves.flatMap(c => c.f);
  const X = scale(K[0], K[K.length - 1], Q.x, Q.x + Q.w, true), Y = scale(Math.min(1, ...all) - 0.03, Math.max(...all) + 0.12, Q.y + Q.h, Q.y);
  const zt = M.p1d.z !== null ? ` · z = ${M.p1d.z}` : '';
  axes(g, Q, { x: { s: X, label: `${plain('p1d.x', 'k along the sightline [s/km]')}${zt}`, log: true }, y: { s: Y, label: plain('p1d.ratio', 'P1D, with ÷ without') } }, env, { alpha: aa });
  const pv = env.charts.pk_z3 && env.charts.pk_z3.pivot && String(env.charts.pk_z3.pivot.label || '');
  const sk = pv && /([\d.]+ s\/km at z = \d+)/.exec(pv), hk = pv && /(k ≈ [\d.]+ h Mpc⁻¹)/.exec(pv);
  if (Array.isArray(env.notes) && sk && hk && aa > 0) env.notes.push({ text: `${sk[1]} is ${hk[1]}`, shown: false, optional: true });
  refLine(g, Q.x, Y(1), Q.x + Q.w, Y(1), env, { alpha: 0.7 * aa });
  const ill = cv => /illustrative/.test(cv.tag || '') || /^same\b/.test(cv.tag || '');
  const style = { all: { c: slateOf(T), lw: 0.3, name: 'all dense absorbers', dash: [1.2, 0.8] }, masked: { c: slateOf(T), lw: 0.3, name: 'DLAs masked' }, residual: { c: T.ink, lw: 0.36, name: null } };
  const items = [], avoid = M.p1d.curves.flatMap(cv => lineObstacles(K.map((k, j) => [X(k), Y(cv.f[j])]), u, 1, 0.5));
  avoid.push({ x: Q.x, y: Y(1) - 0.3 * u, w: Q.w, h: 0.6 * u });
  const px = TEXT.min * u, x0 = X(K[0]) + 1.0 * u;
  const under = (cv, w) => { const ys = K.map((k, j) => [X(k), Y(cv.f[j])]).filter(([x]) => x >= x0 - u && x <= x0 + w + u).map(p => p[1]); return [Math.min(...ys), Math.max(...ys)]; };
  M.p1d.curves.forEach((cv, i) => {
    const s = style[cv.id] || style.all, ca = stagger(pa, i, M.p1d.curves.length, 0.3);
    if (!(ca > 0)) return;
    clipped(g, Q, () => polyline(g, K.map((k, j) => [X(k), Y(cv.f[j])]), s.c, env, { lw: s.lw, alpha: ca, dash: s.dash || null }));
    const name = s.name ? (ill(cv) ? (cv.id === 'all' ? `${s.name} (illustrative abundances)` : `(illustrative)\n${s.name}`) : s.name) : cv.tag.split(/:\s+/)[0].replace(/\s+after masking DLAs$/, '');
    const nl = name.split('\n'), w = Math.max(...nl.map(L => measure(g, L, px))), ax = X(K[0]), ay = Y(cv.f[0]);
    if (cv.id === 'residual') {
      const top = under(cv, w)[1] + 0.6 * u;
      items.push({ text: name, x: ax, y: ay, px, color: s.c, alpha: ca, leader: false,
        cands: [0, 0.5, 1.0].map(d => [(x0 - ax) / u, (top - ay) / u + 0.8 * px / u + d, 'left']) });
    } else if (cv.id === 'masked') {
      const steepCv = M.p1d.curves.find(c => c.id === 'all'), ptsOf = c => K.map((k, j) => [X(k), Y(c.f[j])]);
      const own = ptsOf(cv), steep = steepCv && steepCv !== cv ? ptsOf(steepCv) : [], need = px / 3 + 1;
      const segBox = (p, q, b) => { let d = Infinity; for (let i = 0; i <= 16; i++) { const t = i / 16, x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t; d = Math.min(d, Math.hypot(Math.max(b.x - x, 0, x - b.x - b.w), Math.max(b.y - y, 0, y - b.y - b.h))); } return d; };
      const gapTo = (pts, bx, hw) => { let d = Infinity; for (let i = 1; i < pts.length; i++) { if (Math.max(pts[i - 1][0], pts[i][0]) < x0 - 3 * u || Math.min(pts[i - 1][0], pts[i][0]) > x0 + w + 3 * u) continue; for (const b of bx) d = Math.min(d, segBox(pts[i - 1], pts[i], b)); } return d - hw; };
      const boxesAt = b0 => nl.map((L, i) => ({ x: x0, y: b0 + i * 1.15 * px - 0.8 * px, w: measure(g, L, px), h: 1.05 * px }));
      const b00 = under(cv, w)[0] - 0.25 * px - (nl.length - 1) * 1.15 * px;
      let best = null;
      for (let i = 0; i <= 80; i++) {
        const b0 = b00 - 4 * u + i * 0.05 * u, bx = boxesAt(b0), go = gapTo(own, bx, s.lw * u / 2), gs = steep.length ? gapTo(steep, bx, style.all.lw * u / 2) : Infinity;
        const sc = go >= need && gs >= need ? [1, b0] : [0, Math.min(go, gs)];
        if (!best || sc[0] > best.sc[0] || (sc[0] === best.sc[0] && sc[1] >= best.sc[1])) best = { b0, sc };
      }
      items.push({ text: name, x: ax, y: ay, px, color: s.c, alpha: ca, leader: false, cands: [[(x0 - ax) / u, (best.b0 - ay) / u, 'left']] });
    } else items.push({ text: name, x: ax, y: ay, px, color: s.c, alpha: ca, leader: false,
      cands: [[1, -1.2, 'left'], [4, -1.2, 'left'], [8, -1.2, 'left'], [12, -1.2, 'left'], [1, 3.6, 'left'], [8, 3.6, 'left'], [16, -1.2, 'left'], [16, 3.6, 'left']] });
  });
  const la = Math.min(aa, smooth(clamp01(pa / 0.6)));
  if (la > 0) items.push({ text: "dense absorbers raise P1D's longest scales", x: Q.x + Q.w - 0.5 * u, y: Q.y, px: TEXT.label * u, color: T.ink, alpha: la, leader: false,
    cands: [11, 14, 8, 17, 20].map(dy => [0, dy, 'right']) });
  placeLabels(g, items, env, { avoid, bounds: { x: Q.x + 0.5 * u, y: Q.y + 0.5 * u, w: Q.w - 1 * u, h: Q.h - 1 * u } });
}

export function drawAbsCosmo(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.absorbers;
  const A = area(env);
  if (!M || !M.cosmo) { unavailable(env, panels(env, A).solo, 'absorbers', st.ref * op); return; }
  const { g, u, T } = env;
  const shiftA = smooth(st.shift || 0) * op;
  const F = footLayout(env, A, [{ foot: M.footCosmo, alpha: st.ref * op }, M.footCosmoShift && { foot: M.footCosmoShift, alpha: shiftA }]);
  A.plotBottom = plotBottomAbove(env, A, F.top);
  const P = panels(env, A).solo;
  const C = M.cosmo, a = st.ref * op;
  const { X, Y } = planeFrame(env, P, a);
  const fid = C.runs.find(r => r.fiducial), alt = C.runs.find(r => !r.fiducial);
  const fa = smooth(st.perz === undefined ? 1 : st.perz) * op, ga = smooth(st.global || 0) * op;
  planeSeries(env, P, X, Y, { planck: C.planck && { e: C.planck, a }, desi: C.desi && { e: C.desi, a }, his: fid && { loops: fid.loops, a: fa }, alt: alt && { loops: alt.loops, a: ga } });
  const refBoxes = refNames(env, X, Y, C.planck && { ...C.planck, label: String(C.planck.label).replace(/\s+\d{4}$/, '') }, C.desi && { ...C.desi, label: C.desi.label }, { planck: planeColour(T, 'planck'), desi: planeColour(T, 'desi') }, a);
  const hn = fid ? hisName(env, P, X, Y, fid.loops, fa, fid.recomputed ? PLANE.hisNameB : PLANE.hisName) : null;
  if (fid && alt && fid.mean && alt.mean) tagged(g, 'his', () => planeArrow(env, X, Y, fid.mean, alt.mean, smooth(st.move || 0), T.accent, smooth(st.move || 0) * op, { casing: true }));
  const mR = 0.75 * u, grey = planeGrey(T), sg = smooth(st.shift || 0), markA = shiftA * smooth(clamp01((sg - 0.75) / 0.25));
  if (C.shift && shiftA > 0) {
    const p0 = [X(C.shift.from[0]), Y(C.shift.from[1])], p1 = [X(C.shift.to[0]), Y(C.shift.to[1])], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const stop = L > 0 ? 1 - (mR + 0.35 * u) / L : 1;
    planeArrow(env, X, Y, C.shift.from, [lerp(C.shift.from[0], C.shift.to[0], stop), lerp(C.shift.from[1], C.shift.to[1], stop)], sg, grey, shiftA);
    if (markA > 0) { glyph(g, 'circle', p1[0], p1[1], mR + 1.0 * u, T.ground, env, { alpha: markA }); glyph(g, 'circle', p1[0], p1[1], mR, grey, env, { alpha: markA }); }
  }
  const obst = [...refBoxes, ...(hn ? [hn.box] : [])];
  const loopsAll = [...(fid ? fid.loops : []), ...(alt ? alt.loops : []), ...[C.planck, C.desi].filter(Boolean).map(e => [ellipseLoop(e.x, e.y, e.sx, e.sy, e.rho, 6.18), ellipseLoop(e.x, e.y, e.sx, e.sy, e.rho, 2.3)])];
  for (const set of loopsAll) for (const Lp of set) obst.push(...lineObstacles(Lp.map(q => [X(q[0]), Y(q[1])]), u, 1, 0.3));
  if (C.shift) obst.push({ x: X(C.shift.to[0]) - mR - 0.3 * u, y: Y(C.shift.to[1]) - mR - 0.3 * u, w: 2 * mR + 0.6 * u, h: 2 * mR + 0.6 * u });
  const items = [];
  if (alt) {
    const o95 = alt.loops[alt.loops.length - 1].flat(), r = o95.reduce((b, q) => (q[0] > b[0] ? q : b), o95[0]);
    items.push({ text: PLANE.altName, x: X(r[0]), y: Y(r[1]), px: TEXT.min * u, color: T.accent, alpha: ga, leader: false, cands: [[1.0, 0.35 * TEXT.min, 'left'], [1.0, -1.5, 'left'], [1.0, 2.5, 'left'], [1.0, -4, 'left'], [1.0, 5, 'left']] });
  }
  if (C.shift) {
    const d = (mR + 0.8 * u) / u;
    items.push({ text: PLANE.dlaName, x: X(C.shift.to[0]), y: Y(C.shift.to[1]), px: TEXT.min * u, color: grey, alpha: markA, leader: false, cands: [[d, 1.0, 'left'], [d, 3.0, 'left'], [0.6, d + 2.6, 'left'], [0, d + 2.6, 'center'], [-d, 3.0, 'right'], [d, -0.6, 'left']] });
  }
  tagged(g, 'his', () => placeLabels(g, items, env, { avoid: obst, bounds: { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 1 * u } }));
  placeholderStamp(env, P, M, a);
  F.draw();
}
