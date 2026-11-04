import { TEXT, axes, scale, text, polyline, refLine, clipped, smooth, clamp01 } from '../kit.js';
import { area, footLayout, unavailable, panels, slateOf } from './common.js';

const ph = (t, a, b) => smooth(clamp01((t - a) / (b - a)));
const RATIO_RANGE = [-4, 7];

export function drawResolution(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.emulator_train;
  const A = area(env);
  if (!M || !M.pairs || !M.pairs.length) { unavailable(env, panels(env, A).solo, 'emulator_train', op); return; }
  const { g, u, T } = env;
  const px = TEXT.min * u, pl = TEXT.label * u, slate = slateOf(T);
  const hf = clamp01(st.hf === undefined ? 1 : st.hf), lf = clamp01(st.lf === undefined ? 1 : st.lf), rt = clamp01(st.ratio === undefined ? 1 : st.ratio);
  const P0 = M.pairs[0], nHF = P0.hf.particles || 'high resolution', nLF = P0.lf.particles || 'low resolution';
  const F = footLayout(env, A, [{ foot: { lines: [`simulated: PRIYA (Bird et al. 2023), the same settings run at ${nHF} and ${nLF} particles, P1D at z = ${M.z} (my emulator's training set, Ho et al. 2026)`,
    'simulated: PRIYA (Bird et al. 2023), the same settings at two resolutions (Ho et al. 2026)'], optional: [] }, alpha: op }]);
  const bottom = Math.min(A.plotBottom, F.top - 9.0 * u);
  const left = A.x0 + 9.0 * u, right = A.x1 - 26.0 * u, gap = 9.5 * u;
  const hTop = 0.5 * (bottom - A.plotTop - gap);
  const Tp = { x: left, y: A.plotTop, w: right - left, h: hTop };
  const Bp = { x: left, y: A.plotTop + hTop + gap, w: right - left, h: bottom - (A.plotTop + hTop + gap) };
  const k = M.k, X = scale(k[0], k[k.length - 1], left, right, true);
  const ticks = [0.006, 0.01, 0.02, 0.05].filter(v => v >= k[0] && v <= k[k.length - 1]).map(v => ({ v, label: String(v) }));
  const ys = [...P0.hf.y, ...P0.lf.y], y0 = Math.floor(Math.min(...ys) * 100) / 100 - 0.005, y1 = Math.ceil(Math.max(...ys) * 100) / 100 + 0.005;
  const Y = scale(y0, y1, Tp.y + Tp.h, Tp.y);
  const aT = op * Math.max(ph(hf, 0, 0.3), 0);
  const yt = []; for (let v = Math.ceil(y0 * 50) / 50; v <= y1 + 1e-9; v += 0.02) yt.push({ v: +v.toFixed(2), label: v.toFixed(2) });
  if (aT > 0) axes(g, Tp, { x: { s: X, label: '', ticks, bare: true }, y: { s: Y, label: 'kP(k)/π', ticks: yt } }, env, { alpha: aT });
  const curve = (y, t, colour, lw, dash, name, yName, al) => {
    if (!(al > 0) || !(t > 0)) return;
    const n = Math.max(2, Math.round(1 + t * (k.length - 1)));
    clipped(g, Tp, () => polyline(g, k.slice(0, n).map((kk, j) => [X(kk), Y(y[j])]), colour, env, { lw, alpha: al, dash }));
    const aN = al * ph(t, 0.85, 1);
    if (aN > 0) text(g, name, right + 1.4 * u, yName + 0.35 * pl, { px: pl, color: colour, alpha: aN, role: 'label' });
  };
  const yH = Y(P0.hf.y[P0.hf.y.length - 1]), yL = Y(P0.lf.y[P0.lf.y.length - 1]), short = 1.4 * pl - Math.abs(yL - yH), sg = yL >= yH ? 1 : -1;
  const half = short > 0 ? short / 2 : 0;
  curve(P0.hf.y, hf, T.ink, 0.42, undefined, `${nHF} particles`, yH - sg * half, op);
  curve(P0.lf.y, lf, slate, 0.42, [1.4, 0.8], `${nLF} particles`, yL + sg * half, op);
  const aB = op * ph(rt, 0, 0.35);
  if (aB > 0) {
    const R = scale(RATIO_RANGE[0], RATIO_RANGE[1], Bp.y + Bp.h, Bp.y);
    axes(g, Bp, { x: { s: X, label: 'k [s/km]: smaller scales →', ticks }, y: { s: R, label: 'cheaper vs detailed', ticks: [-4, 0, 4].map(v => ({ v, label: v > 0 ? `+${v}%` : v < 0 ? `−${-v}%` : '0' })) } }, env, { alpha: aB });
    refLine(g, Bp.x, R(0), Bp.x + Bp.w, R(0), env, { alpha: 0.7 * aB, color: T.muted });
    M.pairs.forEach((p, i) => {
      const al = op * ph(rt, 0.3 + 0.15 * i, 0.5 + 0.15 * i);
      if (!(al > 0)) return;
      clipped(g, Bp, () => polyline(g, k.map((kk, j) => [X(kk), R(100 * (1 / p.r[j] - 1))]), i ? slate : T.ink, env, { lw: i ? 0.24 : 0.36, alpha: al }));
    });
    const aW = op * ph(rt, 0.85, 1);
    if (aW > 0) text(g, `the same settings, ${M.pairs.length} runs`, Bp.x + Bp.w + 1.4 * u, R(0) + 0.35 * px, { px, color: T.muted, alpha: aW, italic: true, role: 'label' });
  }
  F.draw();
}
