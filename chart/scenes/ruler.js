import { TEXT, axes, scale, text, measure, polyline, glyph, errorBar, refLine, clipped, placeLabels, smooth, lerpRect, clamp01, tagged, lineObstacles, textRuns, irisBlock } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, placeholderStamp, turns, caveatNote } from './common.js';
import { CONSTANTS } from '../constants.js';
import { shortSource } from '../data.js';

export const RING = { E: CONSTANTS.display.ring_exaggeration, stretch: 0.05, R0: 16, xRange: [40, 170] };
export const RULER_WORDS = {
  y: 'Lyα clustering × r², r^2 ξ', gloss: 'all directions combined (display)', x: 'separation r [h^{−1} Mpc]',
  model: "DESI's model", calibrated: 'calibrated size, r_d',
  along: 'along', across: 'across',
  cap1: 'when the assumed cosmology differs from the true one,', capAlong: 'the ring stretches along the line of sight',
  capAcross: 'the ring stretches across the sky', calib: 'calibrated by early-Universe physics',
};
const ph = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));

export function drawRuler(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const XI = env.charts.xi_tracers, Ru = env.charts.ruler_lrg;
  const A = area(env);
  const W = XI && XI.panels.find(p => p.lya && /Lyα × Lyα/.test(p.label) && !/QSO|quasar/i.test(p.label));
  if (!W || !Ru) { unavailable(env, panels(env, A).solo, !W ? 'xi_tracers (Lyα × Lyα)' : 'ruler_lrg', (st.data ?? 1) * op); return; }
  const ring = st.ring || 0, ac = st.ac || 0, fit = st.fit || 0, a = (st.data ?? 1) * op;
  const t1 = turns(ph(ring, 0.3, 0.6)), t3 = turns(ph(fit, 0.2, 0.6));
  const G = Ru.lya && Ru.lya.g;
  const F0 = footLayout(env, A, [{ foot: footData(Ru, XI), alpha: a * t1.out }]);
  const ringNote = `ring: schematic, an assumed cosmology ${100 * RING.stretch}% off, departures drawn × ${RING.E}`;
  const F1 = footLayout(env, A, [{ foot: { lines: [...(XI.cite ? [`${ringNote} · data: ${XI.cite}`] : []), ringNote] }, alpha: a * t1.in * t3.out }]);
  const F3 = G ? footLayout(env, A, [{ foot: { lines: [...(Ru.lya.cite ? [`measurement: DESI DR2 Lyα BAO, ${Ru.lya.cite}: α_∥ = ${G.y} ± ${G.sy}, α_⊥ = ${G.x} ± ${G.sx}; the band is its ±1σ range, × ${RING.E}`,
    `measurement: ${Ru.lya.cite}: α_∥ = ${G.y} ± ${G.sy}, α_⊥ = ${G.x} ± ${G.sx}; the band: ±1σ, × ${RING.E}`] : []),
    `measurement: DESI DR2 Lyα BAO (DR2 I): α_∥ = ${G.y} ± ${G.sy}, α_⊥ = ${G.x} ± ${G.sx}; the band is its ±1σ range, × ${RING.E}`],
    optional: [`${Ru.lya.label}: z = ${Ru.lya.z}; ρ = ${G.rho}`] }, alpha: a * t3.in }]) : null;
  A.plotBottom = plotBottomAbove(env, A, Math.min(F0.top, F1.top, F3 ? F3.top : F0.top));
  const R = panels(env, A);
  const split = smooth(ph(ring, 0.13, 0.3));
  const P = lerpRect(R.solo, R.left, split);
  correlation(env, P, W, Ru, a, 1 - smooth(ph(ring, 0, 0.13)), split > 0 && split < 1 ? 0 : 1);
  const pin = smooth(ph(ring, 0.32, 0.45));
  if (pin > 0) ringPanel(env, A, R, Ru, a * pin, { ring, ac, fit });
  placeholderStamp(env, P, XI, a);
  for (const F of [F0, F1, F3]) if (F) F.draw();
}
function footData(Ru, XI) {
  const sh = Ru.rd && Ru.rd.Mpc ? ' · r_d: DR2 I, Table 1' : '';
  const zen = (XI.sources || []).map(shortSource).find(t => /^Zenodo/.test(t)) || 'DESI DR2 figure data';
  const by = XI.cite || 'DESI DR2';
  return { lines: [`data and curve: DESI DR2 Lyα × Lyα ξ and DESI's model, ${by}, public figure data (${zen})${sh}`, `data and curve: Lyα × Lyα ξ and model, ${by}, ${zen}${sh}`], caveats: [RULER_WORDS.gloss],
    short: [`data and curve: ${by}, ${zen}${sh}`, `data and curve: ${by}, ${zen}`, `data and curve: ${by}`],
    optional: ['the curve compresses every direction into one, for display; DESI fits the 2D correlation (DR2 II Fig. 5 caption)'] };
}

function correlation__(env, P, W, Ru, a, wordsA, xA) {
  const { g, u, T } = env;
  if (!(a > 0)) return;
  const [r0, r1] = RING.xRange;
  const keep = W.x.map((r, k) => r >= r0 - 2 && r <= r1 + 2);
  const lo = Math.min(...W.y.map((v, k) => (keep[k] ? v - (W.e ? W.e[k] : 0) : Infinity))), hi = Math.max(...W.y.map((v, k) => (keep[k] ? v + (W.e ? W.e[k] : 0) : -Infinity)));
  const pad = 0.12 * (hi - lo);
  const X = scale(r0, r1, P.x, P.x + P.w), Y = scale(lo - pad, hi + 0.62 * (hi - lo), P.y + P.h, P.y);
  axes(g, P, { x: { s: X, label: RULER_WORDS.x }, y: { s: Y, label: RULER_WORDS.y, bare: true } }, env, { alpha: a, xAlpha: xA });
  const px = TEXT.min * u;
  const mpts = W.fx && W.fy ? W.fx.map((r, k) => [r, W.fy[k]]).filter(([r]) => r >= r0 && r <= r1).map(([r, v]) => [X(r), Y(v)]) : [];
  clipped(g, P, () => {
    if (lo - pad < 0 && hi > 0) refLine(g, P.x, Y(0), P.x + P.w, Y(0), env, { alpha: 0.35 * a, dash: false, lw: 0.1 });
    if (mpts.length) polyline(g, mpts, T.muted, env, { lw: 0.3, alpha: a });
    W.x.forEach((r, k) => {
      if (!keep[k]) return;
      if (W.e) errorBar(g, X(r), Y(W.y[k]), { ylo: Y(W.y[k] - W.e[k]), yhi: Y(W.y[k] + W.e[k]) }, T.accent, env, { alpha: 0.85 * a, lw: 0.24, cap: 0 });
      glyph(g, 'circle-open', X(r), Y(W.y[k]), 0.6 * u, T.accent, env, { alpha: a, lw: 0.34 });
    });
  });
  const b = bumpOf(W.fx || W.x, W.fy || W.y);
  if (b) {
    const near = W.x.map((r, k) => (Math.abs(r - b.s) <= 8 ? Y(W.y[k] + (W.e ? W.e[k] : 0)) : Infinity));
    const x = X(b.s), y = Math.min(Y(b.y), ...near) - 1.6 * u, half = 1.6 * u;
    g.save(); g.globalAlpha *= a; g.strokeStyle = T.ink; g.lineWidth = Math.max(1.5, 0.3 * u);
    g.beginPath(); g.moveTo(x - half, y + 0.7 * u); g.lineTo(x - half, y); g.lineTo(x + half, y); g.lineTo(x + half, y + 0.7 * u); g.moveTo(x, y); g.lineTo(x, y - 1.0 * u); g.stroke(); g.restore();
    const wa = a * wordsA, Rd = Ru.rd || {};
    if (wa > 0) {
      const lines = [];
      if (Rd.Mpc !== null && Rd.Mpc !== undefined) lines.push(`r_d = ${Rd.Mpc} Mpc (comoving)`);
      if (Rd.hMpc !== null && Rd.hMpc !== undefined && Rd.h !== null) lines.push(`≈ ${Math.round(Rd.hMpc)} h^{−1} Mpc for h = ${Rd.h}`);
      lines.push(RULER_WORDS.calib);
      const lead = 1.22 * px, xr = x - half - 1.0 * u, y0 = y + 0.2 * u - (lines.length - 1) * lead, wb = Math.max(...lines.map(L => measure(g, L, px, true)));
      irisBlock(g, { x: xr - wb, y: y0 - 0.8 * px, w: wb, h: (lines.length - 1) * lead + 1.05 * px }, px, () =>
        lines.forEach((L, j) => text(g, L, xr, y0 + j * lead, { px, color: j === 0 ? T.ink : T.muted, alpha: wa, italic: j > 0, align: 'right', role: 'label' })));
    }
  }
  const nm = `DESI DR2 ${W.label}${W.z !== null ? `, z = ${W.z}` : ''}`;
  const wide = P.w > 0.75 * env.W * 0.84;
  const items = [{ text: nm, x: P.x + P.w - 1.0 * u, y: wide ? Y(0.012) : P.y + 1.2 * u + 0.8 * TEXT.label * u, px: TEXT.label * u, color: T.accent, alpha: a * xA, leader: false,
    cands: wide ? [[0, -1.6, 'right'], [0, -3.2, 'right'], [0, 4.6, 'right']] : [[0, 0, 'right'], [0, 2.0, 'right']] }];
  const pts = W.x.map((r, k) => (keep[k] ? { x: X(r) - 0.9 * u, y: Y(W.y[k] + (W.e ? W.e[k] : 0)) - 0.4 * u, w: 1.8 * u, h: Y(W.y[k] - (W.e ? W.e[k] : 0)) - Y(W.y[k] + (W.e ? W.e[k] : 0)) + 0.8 * u } : null)).filter(Boolean);
  const zero = lo - pad < 0 && hi > 0 ? [{ x: P.x, y: Y(0) - 0.5 * u, w: P.w, h: 1.0 * u }] : [];
  placeLabels(g, items, env, { avoid: [...pts, ...zero, ...lineObstacles(mpts, u, 2, 0.6)], bounds: { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 1 * u } });
}
function correlation(...args) { return tagged(args[0].g, 'lya', () => correlation__(...args)); }

function bumpOf(s, y) {
  let b = -1;
  for (let k = 1; k < s.length - 1; k++) if (s[k] > 85 && s[k] < 125 && (b < 0 || y[k] > y[b])) b = k;
  if (b < 1) return null;
  const d = y[b - 1] - 2 * y[b] + y[b + 1], t = d !== 0 ? 0.5 * (y[b - 1] - y[b + 1]) / d : 0;
  return { s: s[b] + t * (s[b + 1] - s[b]), y: y[b] - 0.25 * (y[b - 1] - y[b + 1]) * t };
}

export function ringBox(env, A, R) {
  const { u, H } = env;
  const x = R.right.x - 6 * u, w = R.right.x + R.right.w - x;
  return { x, y: A.top + 1.0 * u, w, h: 0.88 * H - (A.top + 1.0 * u) };
}
export function ringGeom(env, B) {
  const { u } = env, R0 = RING.R0 * u, Rmax = R0 * (1 + RING.E * RING.stretch), px = TEXT.min * u;
  const cx = B.x + 2.0 * u + Rmax, capH = 2 * 1.15 * px + 0.8 * u, top = B.y + capH + 1.2 * px + 1.6 * u;
  return { R0, Rmax, cx, cy: top + Rmax, px };
}
function ringPanel__(env, A, R, Ru, a, s) {
  const { g, u, T } = env;
  const B = ringBox(env, A, R), Gm = ringGeom(env, B), { R0, Rmax, cx, cy, px } = Gm, E = RING.E, d = RING.stretch;
  const sAl = smooth(ph(s.ring, 0.55, 1)), sAc = smooth(ph(s.ac, 0.45, 1));
  let rx = R0, ry = R0 * (1 + E * d * sAl), ra = 1;
  if (s.ac > 0) {
    if (s.ac < 0.22) ra = 1 - smooth(ph(s.ac, 0, 0.2));
    else { ra = smooth(ph(s.ac, 0.25, 0.4)); ry = R0; rx = R0 * (1 + E * d * sAc); }
  }
  if (s.fit > 0) ra *= 1 - smooth(ph(s.fit, 0, 0.2));
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.muted; g.lineWidth = Math.max(1.5, 0.3 * u); g.setLineDash([0.9 * u, 0.6 * u]); if (g.__mark) g.__mark('ref');
  g.beginPath(); g.arc(cx, cy, R0, 0, 2 * Math.PI); g.stroke(); g.restore();
  const ell = (rxx, ryy, colour, lw, al, dash) => {
    if (!(al > 0)) return;
    g.save(); g.globalAlpha *= al; g.strokeStyle = colour; g.lineWidth = Math.max(1.5, lw * u); if (dash) g.setLineDash(dash.map(v => v * u)); if (g.__mark) g.__mark('line');
    g.beginPath();
    for (let k = 0; k <= 96; k++) { const t = (2 * Math.PI * k) / 96, x = cx + rxx * Math.cos(t), y = cy - ryy * Math.sin(t); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke(); g.restore();
  };
  ell(rx, ry, T.ink, 0.36, a * ra);
  arrow(env, cx, cy + ry, cx, cy - ry, T.ink, a * ra);
  arrow(env, cx - rx, cy, cx + rx, cy, T.ink, a * ra);
  const G = Ru.lya && Ru.lya.g, fa = a * smooth(ph(s.fit, 0.28, 0.55));
  if (G && fa > 0) {
    const mx = R0 * (1 + E * (1 / G.x - 1)), my = R0 * (1 + E * (1 / G.y - 1)), bx = R0 * E * G.sx / G.x, by = R0 * E * G.sy / G.y;
    ell(mx + bx, my + by, T.accent, 0.24, fa, [1.4, 0.6]);
    ell(Math.max(0, mx - bx), Math.max(0, my - by), T.accent, 0.24, fa, [1.4, 0.6]);
    ell(mx, my, T.accent, 0.34, fa);
  }
  const capY = B.y + 0.8 * px;
  const c1 = a * (1 - smooth(ph(s.fit, 0, 0.15)));
  text(g, RULER_WORDS.cap1, B.x, capY, { px, color: T.muted, alpha: c1, italic: true, role: 'label' });
  const cAl = a * (s.ac > 0 ? 1 - smooth(ph(s.ac, 0, 0.15)) : smooth(ph(s.ring, 0.5, 0.6))), cAc = a * smooth(ph(s.ac, 0.4, 0.5)) * (1 - smooth(ph(s.fit, 0, 0.15)));
  if (cAl > 0) text(g, RULER_WORDS.capAlong, B.x, capY + 1.15 * px, { px, color: T.ink, alpha: cAl, italic: true, role: 'label' });
  if (cAc > 0) text(g, RULER_WORDS.capAcross, B.x, capY + 1.15 * px, { px, color: T.ink, alpha: cAc, italic: true, role: 'label' });
  text(g, RULER_WORDS.along, cx, cy - Rmax - 1.0 * u - 0.25 * px, { px, color: T.ink, alpha: a, align: 'center', role: 'label' });
  text(g, RULER_WORDS.across, cx + Rmax + 1.4 * u, cy + 0.35 * px, { px, color: T.ink, alpha: a, role: 'label' });
  const yb = cy + Rmax + 1.4 * u + 0.8 * px;
  text(g, `dashed: ${RULER_WORDS.calibrated}`, cx - Rmax, yb, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  text(g, `departures drawn × ${E}`, cx - Rmax, yb + 1.25 * px, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  caveatNote(env, `departures drawn × ${E}`, a);
  if (G && Ru.lya) {
    const ra2 = a * smooth(ph(s.fit, 0.6, 0.8));
    if (ra2 > 0) {
      const pc = (sg, al) => `${(100 * sg / al).toFixed(1)}%`;
      const nm0 = Ru.lya.label.split(' (')[0], nm = `${/^DESI\b/.test(nm0) ? nm0 : `DESI ${nm0}`}${Ru.lya.z !== null ? `, z = ${Ru.lya.z}:` : ':'}`;
      const pl = TEXT.label * u, y0 = yb + 1.25 * px + 1.4 * u + 0.8 * pl, x0 = cx - Rmax;
      irisBlock(g, { x: x0, y: y0 - 0.8 * pl, w: B.w, h: 2.4 * pl + px }, pl, () => {
        text(g, nm, x0, y0, { px: pl, color: T.accent, alpha: ra2, role: 'label' });
        text(g, `${pc(G.sy, G.y)} along, ${pc(G.sx, G.x)} across`, x0, y0 + 1.15 * pl, { px: pl, color: T.ink, alpha: ra2, role: 'label' });
        text(g, '(±1σ: the band)', x0 + measure(g, `${pc(G.sy, G.y)} along, ${pc(G.sx, G.x)} across`, pl) + 1.0 * pl, y0 + 1.15 * pl, { px, color: T.muted, alpha: ra2, italic: true, role: 'label' });
      });
    }
  }
}
function ringPanel(...args) { return tagged(args[0].g, 'lya', () => ringPanel__(...args)); }
function arrow(env, x0, y0, x1, y1, colour, a) {
  const { g, u } = env;
  if (!(a > 0)) return;
  const L = Math.hypot(x1 - x0, y1 - y0); if (!(L > 2 * u)) return;
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L, hd = 1.1 * u, hw = 0.55 * u;
  g.save(); g.globalAlpha *= a; g.strokeStyle = colour; g.fillStyle = colour; g.lineWidth = Math.max(1.5, 0.26 * u); if (g.__mark) g.__mark('line');
  g.beginPath(); g.moveTo(x0 + ux * hd, y0 + uy * hd); g.lineTo(x1 - ux * hd, y1 - uy * hd); g.stroke();
  for (const [px0, py0, sx] of [[x1, y1, 1], [x0, y0, -1]]) {
    g.beginPath(); g.moveTo(px0, py0); g.lineTo(px0 - sx * ux * hd - uy * hw, py0 - sx * uy * hd + ux * hw); g.lineTo(px0 - sx * ux * hd + uy * hw, py0 - sx * uy * hd - ux * hw); g.closePath(); g.fill();
  }
  g.restore();
}
