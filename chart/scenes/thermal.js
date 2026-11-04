import { TEXT, axes, scale, text, polyline, band, glyph, errorBar, smooth, clamp01, mixHex, tagged, fillHis, measure } from '../kit.js';
import { planeFrame, slateOf } from './common.js';

export const TH = { out: 0.15, band: [0.18, 0.4], pts: [0.42, 0.56], plane: [0.58, 0.68], dots: [0.68, 0.9], key: [0.85, 1] };
const ph = (t, [a, b]) => smooth(clamp01((t - a) / (b - a)));
const ZR = [2.5, 4.3], TR = [7, 18];

export function drawThermal(env, L, R, M, th, op) {
  if (!M || !(th > 0)) return;
  const { u, T } = env;
  t0Panel(env, L, M, op * ph(th, [TH.band[0], TH.band[0] + 0.06]), op * ph(th, TH.band), op * ph(th, TH.pts));
  samplesPlane(env, L, R, M, th, op);
}
export function t0Panel(env, L, M, aAx, aBand, aPts) {
  const { g, u, T } = env;
  const px = TEXT.min * u, W = M.words;
  const X = scale(ZR[0], ZR[1], L.x, L.x + L.w), Y = scale(TR[0], TR[1], L.y + L.h, L.y);
  if (aAx > 0) axes(g, L, { x: { s: X, label: W.left_x, ticks: [2.5, 3, 3.5, 4].map(v => ({ v, label: v.toFixed(1) })) },
    y: { s: Y, label: W.left_y, ticks: [8, 10, 12, 14, 16, 18].map(v => ({ v, label: String(v) })) } }, env, { alpha: aAx });
  const t0 = M.t0, at = (arr, i) => [X(t0.z[i]), Y(arr[i] / 1000)];
  if (aBand > 0) tagged(g, 'his', () => {
    band(g, t0.z.map((z, i) => at(t0.hi, i)), t0.z.map((z, i) => at(t0.lo, i)), T.accent, fillHis(T) * aBand, env);
    polyline(g, t0.z.map((z, i) => at(t0.mean, i)), T.accent, env, { lw: 0.36, alpha: aBand });
    const iN = t0.z.reduce((b, z, i) => (Math.abs(z - 3.5) < Math.abs(t0.z[b] - 3.5) ? i : b), 0);
    text(g, W.band, X(t0.z[iN]), Y(t0.hi[iN] / 1000) - 1.6 * u, { px, color: T.accent, alpha: aBand, role: 'label' });
  });
  if (aPts > 0) {
    const G = M.gaikwad;
    G.z.forEach((z, i) => {
      errorBar(g, X(z), Y(G.T[i] / 1000), { ylo: Y((G.T[i] - G.err[i]) / 1000), yhi: Y((G.T[i] + G.err[i]) / 1000) }, T.ink, env, { alpha: aPts });
      glyph(g, 'circle', X(z), Y(G.T[i] / 1000), 0.5 * u, T.ink, env, { alpha: aPts });
    });
    const [l1, l2] = String(W.points).split(/:\s*/);
    text(g, `${l1}:`, L.x + 1.4 * u, Y(9.2), { px, color: T.ink, alpha: aPts, role: 'label' });
    text(g, l2, L.x + 1.4 * u, Y(9.2) + 1.2 * px, { px, color: T.muted, alpha: aPts, italic: true, role: 'label' });
  }
}
function samplesPlane(env, L, R, M, th, op) {
  const { g, u, T } = env;
  const px = TEXT.min * u, W = M.words, slate = slateOf(T);
  const aPl = op * ph(th, TH.plane), aDots = op * ph(th, TH.dots), aKey = op * ph(th, TH.key);
  if (aPl > 0) {
    const Q = { x: R.x + 2.0 * u, y: L.y, w: Math.min(L.w, R.w - 2.0 * u), h: L.h };
    const { X: PX, Y: PY } = planeFrame(env, Q, aPl, { glyph: 0 });
    text(g, W.right_title, Q.x + 1.4 * u, Q.y + 1.0 * px, { px, color: T.ink, alpha: aPl, role: 'label' });
    const S = M.samples, [t0lo, t0hi] = M.key || S.range, col = t => mixHex(slate, T.accent, clamp01((t - t0lo) / (t0hi - t0lo)));
    const n = S.x.length;
    if (aDots > 0) tagged(g, 'his', () => {
      for (let i = 0; i < n; i++) {
        const ai = aDots >= 1 ? 1 : clamp01(aDots * 1.3 - (i / n) * 0.3);
        if (ai > 0) glyph(g, 'circle', PX(S.x[i]), PY(S.y[i]), 0.3 * u, col(S.t[i]), env, { alpha: 0.85 * ai * op });
      }
    });
    if (aKey > 0) {
      const kx = Q.x + 1.4 * u, ky = Q.y + 2.0 * px + 1.4 * u, kw = 24 * u, steps = 24;
      for (let j = 0; j < steps; j++) polyline(g, [[kx + (j / steps) * kw, ky], [kx + ((j + 1) / steps) * kw, ky]], mixHex(slate, T.accent, (j + 0.5) / steps), env, { lw: 0.7, alpha: aKey });
      const [lo, hi] = M.keyText || [String(Math.round(t0lo)), String(Math.round(t0hi))], yk = ky + 1.2 * u + 0.8 * px;
      text(g, lo, kx, yk, { px, color: T.muted, alpha: aKey, role: 'label' });
      text(g, hi, kx + kw - measure(g, hi, px), yk, { px, color: T.muted, alpha: aKey, role: 'label' });
      if (M.keyUnit) text(g, M.keyUnit, kx + kw + 1.2 * u, ky + 0.34 * px, { px, color: T.muted, alpha: aKey, role: 'label' });
    }
  }
}
