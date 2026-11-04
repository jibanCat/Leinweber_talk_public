import { TEXT, textRuns, axes, scale, text, polyline, band, clipped, smooth, clamp01, lerp, measure, logTicks, fillAlphaFor, tagged } from '../kit.js';
import { area, footLayout, unavailable, panels, waveArrow, waveRow, WAVE, SAFE, yTitle } from './common.js';
import { plain } from '../plain.js';
const R10_LEAN = true;

const SHADE = T => fillAlphaFor(T.ink, T.ground, 30);
const STAG = 0.055, LEN = 0.34;
export const maskOf = (m, j) => clamp01((m - STAG * j) / LEN);

export function drawDlaP1d(env, st, op) {
  const M = env.charts.dla_p1d;
  const { u } = env;
  const A = area(env);
  const mA = smooth(st.mock || 0) * op, m = clamp01(st.mask || 0), d = smooth(clamp01(st.dla === undefined ? 1 : st.dla));
  if (!M || !M.stack) { if (mA > 0) unavailable(env, panels(env, A).solo, 'dla_p1d', mA); return; }
  if (!(mA > 0)) return;
  const envF = { ...env, safe: { ...(env.safe || SAFE), tagW: Math.max((env.safe || SAFE).tagW, SAFE.tagW) } };
  const F = footLayout(envF, area(envF), [{ foot: M.foot, alpha: mA }]);
  A.plotBottom = Math.min(F.top, 0.925 * env.H) - (WAVE.block + 0.8) * u;
  const yTop = A.plotTop;
  const mid = A.x0 + 0.56 * (A.x1 - A.x0);
  const L = { x: A.x0 + 7.5 * u, y: yTop, w: mid - 5 * u - (A.x0 + 7.5 * u), h: A.plotBottom - yTop };
  const R = { x: mid + 9.5 * u, y: yTop, w: A.x1 - (mid + 9.5 * u), h: A.plotBottom - yTop };
  const dRaw = clamp01(st.dla === undefined ? 1 : st.dla);
  if (M.stack.full) whole(env, L, M, m, d, mA, dRaw); else stack(env, L, M, m, d, mA, dRaw);
  p1d(env, R, M, m, d, mA);
  F.draw();
}

function leftFrame(env, L, X, n, m, dRaw, a) {
  const { g, u, T } = env;
  axes(g, L, { x: { s: X, label: '' } }, env, { alpha: a, xOnly: true });
  yTitle(env, L, 'flux, offset', null, { alpha: a, x: L.x - 1.6 * u });
  waveArrow(env, L, a);
  const out = (v, e) => 1 - smooth(clamp01(v / e)), inn = (v, b, e) => smooth(clamp01((v - b) / e));
  const pl = TEXT.label * u, yt = L.y - 1.0 * pl;
  const a0 = a * out(dRaw, 0.45), a1 = a * inn(dRaw, 0.55, 0.45) * out(m, 0.04), a2 = a * inn(m, 0.04, 0.04);
  if (a0 > 0) text(g, `${n} mock spectra, forest only`, L.x, yt, { px: pl, color: T.ink, alpha: a0, role: 'axis' });
  if (a1 > 0) text(g, `${n} spectra, their DLAs shaded`, L.x, yt, { px: pl, color: T.ink, alpha: a1, role: 'axis' });
  if (!R10_LEAN && a2 > 0) tagged(g, 'his', () => textRuns(g, [{ t: 'my GP DLA finder, two-absorber mode' }, { t: ' (experimental)', color: T.muted }], L.x, yt, { px: TEXT.min * u, color: T.accent, alpha: a2, italic: true, role: 'label' }));
}
export const drawnSpectrum = (sp, f) => (sp.noise ? f.map((v, i) => (v === null || !Number.isFinite(v) || sp.noise[i] === null || !Number.isFinite(sp.noise[i]) ? v : v + sp.noise[i])) : f);
const towards = (clean, dla, d) => (d >= 1 ? dla : clean.map((c, i) => (Number.isFinite(c) && Number.isFinite(dla[i]) ? c + (dla[i] - c) * d : null)));

function whole__(env, L, M, m, d, a, dRaw = d) {
  const { g, u, T } = env;
  const S = M.stack.full, n = S.spectra.length, px = TEXT.min * u;
  const X = scale(S.wave[0], S.wave[S.wave.length - 1], L.x, L.x + L.w);
  leftFrame(env, L, X, n, m, dRaw, a);
  let peak = 0;
  for (const sp of S.spectra) for (const v of sp.clean) if (Number.isFinite(v) && v > peak) peak = v;
  const top = L.y + 1.6 * px, gap = (L.y + L.h - top) / (n - 1 + 0.5 * peak), fy = 0.5 * gap;
  if (S.stretch) {
    const x0 = X(S.stretch[0]), x1 = X(S.stretch[1]), yb = L.y + 0.4 * px;
    polyline(g, [[x0, yb + 0.5 * px], [x0, yb], [x1, yb], [x1, yb + 0.5 * px]], T.muted, env, { lw: 0.16, alpha: a });
    text(g, plain('p1d.here', 'P1D measured here'), 0.5 * (x0 + x1), yb - 0.3 * px, { px, color: T.muted, alpha: a, align: 'center', role: 'axis' });
  }
  if (S.noise) (R10_LEAN ? ['illustrative noise added'] : ['illustrative noise added ·', "not DESI data, not the finder's exact input"]).forEach((Lc, j) =>
    text(g, Lc, L.x, L.y + 1.4 * px + 1.6 * u + j * 1.15 * px, { px, color: T.muted, alpha: a, italic: true, role: 'label' }));
  const pts = (f, base) => {
    const segs = [[]];
    f.forEach((v, i) => { if (v === null || !Number.isFinite(v)) { if (segs[segs.length - 1].length) segs.push([]); } else segs[segs.length - 1].push([X(S.wave[i]), base - fy * v]); });
    return segs.filter(sg => sg.length > 1);
  };
  clipped(g, { x: L.x, y: L.y - 2 * px, w: L.w, h: L.h + 2 * px }, () => {
    S.spectra.forEach((sp, j) => {
      const base = top + (j + 0.5 * peak) * gap;
      const mj = maskOf(m, j), tick = smooth(clamp01(mj / 0.35)), grey = smooth(clamp01((mj - 0.3) / 0.7));
      const nz = f => drawnSpectrum(sp, f);
      for (const sg of pts(nz(sp.clean), base)) band(g, sg, sg.map(([x]) => [x, base]), T.ground, a, env);
      if (grey > 0) {
        g.save(); g.globalAlpha *= fillAlphaFor(T.ink, T.ground, 21) * grey * a; g.fillStyle = T.ink;
        for (const [w0, w1] of sp.mask) g.fillRect(X(w0), base - 1.8 * fy, X(w1) - X(w0), 1.8 * fy);
        g.restore();
      }
      const shade = (f, al) => {
        if (!(al > 0)) return;
        let up = [], lo = [];
        const flush = () => { if (up.length > 1) band(g, up, lo, T.ink, SHADE(T) * al, env); up = []; lo = []; };
        const fn = nz(f), cn = nz(sp.clean);
        f.forEach((v, i) => {
          const c = sp.clean[i];
          if (!Number.isFinite(v) || !Number.isFinite(c) || c - v < 0.01) { flush(); return; }
          const x = X(S.wave[i]); up.push([x, base - fy * cn[i]]); lo.push([x, base - fy * fn[i]]);
        });
        flush();
      };
      const withD = towards(sp.clean, sp.dla, d);
      shade(withD, a * (1 - grey));
      shade(sp.masked, a * grey);
      for (const sg of pts(nz(withD), base)) polyline(g, sg, T.ink, env, { lw: 0.12, alpha: a * (1 - grey) });
      for (const sg of pts(nz(sp.masked), base)) polyline(g, sg, T.ink, env, { lw: 0.12, alpha: a * grey });
      for (const f of sp.found) {
        if (!f.called || !(tick > 0)) continue;
        const x = X(f.w);
        polyline(g, [[x, base - 1.85 * fy], [x, base - 2.25 * fy]], T.accent, env, { lw: 0.34, alpha: tick * a });
      }
    });
  });
}
function whole(...args) { return tagged(args[0].g, 'his', () => whole__(...args)); }

function stack__(env, L, M, m, d, a, dRaw = d) {
  const { g, u, T } = env;
  const S = M.stack, n = S.n, px = TEXT.min * u;
  const X = scale(S.wave[0], S.wave[S.wave.length - 1], L.x, L.x + L.w);
  leftFrame(env, L, X, n, m, dRaw, a);
  const hS = L.h / n;
  clipped(g, L, () => {
    S.spectra.forEach((sp, j) => {
      const y0 = L.y + j * hS, Y = scale(-0.25, 1.25, y0 + hS, y0);
      const mj = maskOf(m, j), tick = smooth(clamp01(mj / 0.35)), grey = smooth(clamp01((mj - 0.3) / 0.7));
      if (grey > 0) {
        g.save(); g.globalAlpha *= fillAlphaFor(T.ink, T.ground, 21) * grey * a; g.fillStyle = T.ink;
        for (const [w0, w1] of sp.mask) g.fillRect(X(w0), y0 + 0.06 * hS, X(w1) - X(w0), 0.88 * hS);
        g.restore();
      }
      const line = (f, al) => {
        if (!(al > 0)) return;
        const segs = [[]];
        f.forEach((v, i) => { if (v === null || !Number.isFinite(v)) { if (segs[segs.length - 1].length) segs.push([]); } else segs[segs.length - 1].push([X(S.wave[i]), Y(v)]); });
        for (const sg of segs) if (sg.length > 1) polyline(g, sg, T.ink, env, { lw: 0.13, alpha: al });
      };
      const shade = (f, al) => {
        if (!(al > 0)) return;
        let up = [], lo = [];
        const flush = () => { if (up.length > 1) band(g, up, lo, T.ink, SHADE(T) * al, env); up = []; lo = []; };
        f.forEach((v, i) => {
          const c = sp.clean[i];
          if (!Number.isFinite(v) || !Number.isFinite(c) || c - v < 0.005) { flush(); return; }
          const x = X(S.wave[i]); up.push([x, Y(c)]); lo.push([x, Y(v)]);
        });
        flush();
      };
      const withD = towards(sp.clean, sp.dla, d);
      shade(withD, a * (1 - grey));
      shade(sp.masked, a * grey);
      line(withD, a * (1 - grey));
      line(sp.masked, a * grey);
      for (const f of sp.found) {
        if (!f.called || !(tick > 0)) continue;
        const x = X(f.w);
        polyline(g, [[x, y0 + 0.02 * hS], [x, y0 + 0.24 * hS]], T.accent, env, { lw: 0.34, alpha: tick * a });
      }
    });
  });
}
function stack(...args) { return tagged(args[0].g, 'his', () => stack__(...args)); }

function p1d__(env, R, M, m, d, a) {
  const { g, u, T } = env;
  const P = M.stack.p1d, k = P.k, n = k.length, px = TEXT.min * u, pl = TEXT.label * u;
  const w = M.stack.spectra.reduce((s, _, j) => s + smooth(clamp01((maskOf(m, j) - 0.3) / 0.7)), 0) / M.stack.n;
  const H = M.headline || {}, hd = H.dla || { ratio: P.dla.y[0] / P.clean.y[0] }, hm = H.m2 || { ratio: P.masked.y[0] / P.clean.y[0] };
  const names = [`with the DLAs: ×${Math.round(Number(hd.ratio))}`, plain('p1d.longest', "on P1D's longest scales")];
  const caveat = M.rate && !R10_LEAN ? ['mock spectra: 2 DLAs each', `(≈ ${Math.round(M.rate)}× the simulation's rate)`] : ['mock spectra: 2 DLAs each'];
  const lead = 1.15, need = 0.6 * u + names.length * lead * pl + 0.25 * u + caveat.length * lead * px + 0.25 * u + lead * pl + 0.9 * u;
  const all = [...P.dla.y.map((v, i) => v + P.dla.e[i]), ...P.clean.y, ...P.masked.y], top0 = P.dla.y[0] + P.dla.e[0];
  const yMax = Math.max(Math.max(...all) * 1.15, top0 / (1 - need / R.h));
  const X = scale(k[0] / 1.2, k[n - 1] * 1.2, R.x, R.x + R.w, true), Y = scale(0, yMax, R.y + R.h, R.y);
  const xTicks = logTicks(k[0] / 1.2, k[n - 1] * 1.2).map(t => ({ v: t.v, label: t.label }));
  axes(g, R, { x: { s: X, label: '', log: true, ticks: xTicks }, y: { s: Y, label: plain('p1d.y', 'power, k P1D / π') } }, env, { alpha: a });
  const yw = waveRow(env, R);
  text(g, '← longer', R.x, yw, { px, color: T.muted, alpha: a, italic: true, role: 'axis' });
  text(g, plain('p1d.x', 'k along the sightline [s/km]'), R.x + R.w / 2, yw, { px, color: T.muted, alpha: a, align: 'center', italic: true, role: 'axis' });
  text(g, 'shorter →', R.x + R.w, yw, { px, color: T.muted, alpha: a, align: 'right', italic: true, role: 'axis' });
  const pts = ys => k.map((kk, i) => [X(kk), Y(ys[i])]);
  const cur = P.dla.y.map((v, i) => lerp(v, P.masked.y[i], w)), curE = P.dla.e.map((v, i) => lerp(v, P.masked.e[i], w));
  clipped(g, R, () => {
    if (1 - d > 0) {
      band(g, pts(P.clean.y.map((v, i) => v + P.clean.e[i])), pts(P.clean.y.map((v, i) => v - P.clean.e[i])), T.ink, 0.16 * a * (1 - d), env);
      polyline(g, pts(P.clean.y), T.ink, env, { lw: 0.4, alpha: a * (1 - d) });
    }
    if (d > 0) polyline(g, pts(P.clean.y), T.muted, env, { lw: 0.26, alpha: a * d, dash: [0.9, 0.6] });
    if (w > 0) polyline(g, pts(P.dla.y), T.ink, env, { lw: 0.3, alpha: 0.4 * a * smooth(clamp01(w / 0.2)) });
    const c = w < 0.5 ? T.ink : T.accent, ca = a * d;
    if (ca > 0) {
      band(g, pts(cur.map((v, i) => v + curE[i])), pts(cur.map((v, i) => v - curE[i])), c, 0.16 * ca, env);
      polyline(g, pts(cur), c, env, { lw: 0.4, alpha: ca });
    }
  });
  const x0 = X(k[0]) + 1.0 * u, da = a * d, ma = a * smooth(clamp01((w - 0.9) / 0.1));
  let y = R.y + 0.6 * u + 0.8 * pl;
  names.forEach((L, j) => text(g, L, x0, y + j * lead * pl, { px: pl, color: T.ink, alpha: da * (1 - 0.4 * smooth(clamp01(w / 0.3))), role: 'label' }));
  y += (names.length - 1) * lead * pl + 0.2 * pl + 0.25 * u + lead * px;
  caveat.forEach((L, j) => text(g, L, x0, y + j * lead * px, { px, color: T.muted, alpha: da, italic: true, role: 'label' }));
  y += (caveat.length - 1) * lead * px + 0.25 * u + lead * pl;
  if (ma > 0) textRuns(g, [{ t: 'after masking:' }, { t: ` ×${Number(hm.ratio).toFixed(1)}`, color: T.ink }], x0, y, { px: pl, color: T.accent, alpha: ma, role: 'label' });
  const ta = a * Math.min(smooth(clamp01(w / 0.1)), 1 - smooth(clamp01((w - 0.8) / 0.08)));
  if (ta > 0) text(g, 'in between: a blend of the two, not data', x0, y, { px, color: T.muted, alpha: ta, italic: true, role: 'label' });
  if (da > 0) text(g, 'clean forest', x0, Y(Math.min(P.clean.y[0], P.masked.y[0]) - Math.max(P.clean.e[0], P.masked.e[0])) + 1.0 * u + 0.8 * px, { px, color: T.muted, alpha: da, role: 'label' });
  const qL = ["P1D's shortest scales:", 'mean flux,', 'not new structure'], qx0 = R.x + R.w - 0.6 * u - Math.max(...qL.map(L => measure(g, L, px, true))) - 1.0 * u;
  const qj = k.map((kk, i) => i).filter(i => X(k[i]) >= qx0 || i === n - 1);
  const qLow = Math.max(...qj.flatMap(i => [Y(P.clean.y[i] - P.clean.e[i]), Y(P.masked.y[i] - P.masked.e[i]), Y(cur[i] - curE[i])]));
  const qy = qLow + 1.0 * u + 0.8 * px;
  if (!R10_LEAN && da > 0) qL.forEach((L, j) => text(g, L, R.x + R.w - 0.6 * u, qy + j * 1.15 * px, { px, color: T.muted, alpha: da, italic: true, align: 'right', role: 'label' }));
}
function p1d(...args) { return tagged(args[0].g, 'his', () => p1d__(...args)); }
