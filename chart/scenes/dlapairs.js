import { TEXT, axes, scale, text, polyline, band, glyph, refLine, clipped, smooth, clamp01, measure, fillAlphaFor } from '../kit.js';
import { area, footLayout, unavailable, panels, slateOf } from './common.js';

const PH = { inside: [0.05, 0.35], outside: [0.35, 0.5], axes: [0.5, 0.6], all: [0.6, 0.8], out: [0.8, 1] };
const ph = (t, [a, b]) => smooth(clamp01((t - a) / (b - a)));
const SEP_MAX = 1500;

export function drawDlaPairs(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const S = env.charts.sightlines;
  const A = area(env);
  if (!S || !S.pairs) { unavailable(env, panels(env, A).solo, 'sightlines', op); return; }
  const { g, u, T } = env;
  const P = S.pairs, W = P.words, px = TEXT.min * u, slate = slateOf(T);
  const pr = clamp01(st.pr || 0), xc = clamp01(st.xc || 0);
  const F = footLayout(env, A, [{ foot: S.footPairs, alpha: op }]);
  const bottom = Math.min(A.plotBottom, F.top - 9.6 * u);
  const left = A.x0 + 7.5 * u, gap = 12.0 * u;
  const hTop = 0.36 * (bottom - A.plotTop);
  const Tp = { x: left, y: A.plotTop, w: A.x1 - left, h: hTop };
  const Bp = { x: left, y: A.plotTop + hTop + gap, w: 0.55 * (A.x1 - left), h: bottom - (A.plotTop + hTop + gap) };
  const n = P.flux.length, span = n * P.dv;
  const X = scale(0, span, Tp.x, Tp.x + Tp.w), Y = scale(0, 1, Tp.y + Tp.h, Tp.y);
  axes(g, Tp, { x: { s: X, label: W.top_x, ticks: [0, 5000, 10000].map(v => ({ v, label: v.toLocaleString('en-GB') })) },
    y: { s: Y, label: 'flux', ticks: [0, 1].map(v => ({ v, label: String(v) })) } }, env, { alpha: op });
  const pts = P.flux.map((f, i) => [X((i + 0.5) * P.dv), Y(f)]);
  const [d0, d1] = P.dla.pix;
  clipped(g, Tp, () => {
    band(g, pts.slice(d0, d1 + 1).map(([x]) => [x, Y(1)]), pts.slice(d0, d1 + 1), T.ink, fillAlphaFor(T.ink, T.ground, 20) * op, env);
    polyline(g, pts, T.ink, env, { lw: 0.22, alpha: op });
  });
  const xd = (X(d0 * P.dv) + X((d1 + 1) * P.dv)) / 2;
  text(g, W.dla, xd, Tp.y - 0.9 * u, { px, color: T.ink, alpha: op, align: 'center', role: 'label' });
  const sep = P.arcs.sep_pix;
  const arc = (i, colour, a) => {
    if (!(a > 0)) return;
    const j = (i + sep) % n, xa = pts[i][0], xb = pts[j][0], ya = pts[i][1], yb = pts[j][1];
    const top = Math.min(ya, yb) - 3.2 * u, steps = 24, path = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, x = xa + (xb - xa) * t, base = ya + (yb - ya) * t;
      path.push([x, base - (base - top) * Math.sin(Math.PI * t)]);
    }
    polyline(g, path, colour, env, { lw: 0.22, alpha: 0.9 * a });
    glyph(g, 'circle', xa, ya, 0.5 * u, colour, env, { alpha: a });
    glyph(g, 'circle', xb, yb, 0.5 * u, colour, env, { alpha: a });
  };
  P.arcs.inside.forEach((i, k) => arc(i, T.ink, op * ph(pr, [PH.inside[0] + 0.08 * k, PH.inside[0] + 0.08 * k + 0.12])));
  P.arcs.outside.forEach((i, k) => arc(i, slate, op * ph(pr, [PH.outside[0] + 0.04 * k, PH.outside[0] + 0.04 * k + 0.08])));
  const aAx = op * ph(xc, PH.axes);
  if (aAx > 0) {
    const XI = P.xi, keep = XI.sep_kms.map((s, i) => i).filter(i => XI.sep_kms[i] <= SEP_MAX);
    const vals = keep.flatMap(i => [XI.all[i], XI.outside_dla[i]]);
    const yHi = Math.ceil(Math.max(...vals) * 10) / 10;
    const Xc = scale(0, SEP_MAX, Bp.x, Bp.x + Bp.w), Yc = scale(0, yHi, Bp.y + Bp.h, Bp.y);
    axes(g, Bp, { x: { s: Xc, label: W.x, ticks: [0, 500, 1000, 1500].map(v => ({ v, label: v.toLocaleString('en-GB') })) },
      y: { s: Yc, label: W.y, ticks: [0, 0.1, 0.2, 0.3].filter(v => v <= yHi + 1e-9).map(v => ({ v, label: v.toFixed(1) })) } }, env, { alpha: aAx });
    const x6 = Xc(P.arcs.sep_kms);
    refLine(g, x6, Bp.y, x6, Bp.y + Bp.h, env, { alpha: 0.7 * aAx, color: T.muted });
    text(g, `the pairs above: ${P.arcs.sep_kms} km/s`, x6 + 1.0 * u, Bp.y + 0.8 * px, { px, color: T.muted, alpha: aAx, italic: true, role: 'label' });
    const last = keep[keep.length - 1], yEnd = arr => Yc(arr[last]);
    const floor = Bp.y + Bp.h - 1.1 * px, yA = Math.min(yEnd(XI.all), floor), yO = Math.min(yEnd(XI.outside_dla), floor), need = 1.4 * px - Math.abs(yO - yA);
    const shift = need > 0 ? need / 2 : 0, nameY = { all: yA - shift, out: yO + shift };
    const curve = (arr, t, colour, lw, name, yName, a) => {
      if (!(a > 0)) return;
      const end = Math.max(1, Math.round(t * (keep.length - 1)));
      const c = keep.slice(0, end + 1).map(i => [Xc(XI.sep_kms[i]), Yc(arr[i])]);
      clipped(g, Bp, () => polyline(g, c, colour, env, { lw, alpha: a }));
      const aName = a * smooth(clamp01((t - 0.85) / 0.15));
      if (aName > 0) text(g, name, Bp.x + Bp.w + 1.2 * u, yName + 0.34 * px, { px, color: colour, alpha: aName, role: 'label' });
    };
    const tAll = ph(xc, PH.all), tOut = ph(xc, PH.out);
    curve(XI.all, tAll, T.ink, 0.36, W.all, nameY.all, op * (tAll > 0 ? 1 : 0));
    curve(XI.outside_dla, tOut, slate, 0.36, W.outside, nameY.out, op * (tOut > 0 ? 1 : 0));
  }
  F.draw();
}

export const pairNames = (g, W, px) => [W.all, W.outside].map(t => measure(g, t, px));

export function drawAdded(env, R, S, a, t) {
  if (!S || !S.added || !(a > 0)) return;
  const { g, u, T } = env;
  const D = S.added, W = D.words, px = TEXT.min * u, slate = slateOf(T);
  const aTop = a * smooth(clamp01(t / 0.4)), aBot = a * smooth(clamp01((t - 0.4) / 0.35)), aMk = a * smooth(clamp01((t - 0.8) / 0.2));
  const head = 1.3 * px + 0.6 * u, headB = head + 1.35 * px, gap = 3.0 * u;
  const rowH = (R.h - head - headB - gap - 1.0 * u) / 2;
  const top = { x: R.x, y: R.y + head, w: R.w, h: rowH }, bot = { x: R.x, y: top.y + rowH + gap + headB, w: R.w, h: rowH };
  const v0 = D.pix[0] * D.dv, v1 = D.pix[1] * D.dv;
  const X = scale(v0, v1, R.x, R.x + R.w);
  const row = (P, flux, title, al, last) => {
    if (!(al > 0)) return;
    text(g, title, P.x, P.y - 1.2 * u - (last ? 1.35 * px : 0), { px, color: T.ink, alpha: al, role: 'label' });
    const Y = scale(0, 1.12, P.y + P.h, P.y);
    axes(g, P, { x: last ? { s: X, label: S.pairs ? S.pairs.words.top_x : '', ticks: [4000, 6000, 8000, 10000].filter(v => v > v0 && v < v1).map(v => ({ v, label: v.toLocaleString('en-GB') })) }
      : { s: X, label: '', bare: true } }, env, { alpha: al, xOnly: true });
    clipped(g, P, () => polyline(g, flux.map((f, i) => [X((D.pix[0] + i + 0.5) * D.dv), Y(f)]), T.ink, env, { lw: 0.22, alpha: al }));
    return Y;
  };
  row(top, D.flux, W.before, aTop, false);
  row(bot, D.fluxAdded, W.after, aBot, true);
  if (aMk > 0) for (const ab of D.absorbers) {
    const x = X(ab.v_kms);
    polyline(g, [[x, bot.y + 0.3 * u], [x, bot.y + 1.5 * u]], slate, env, { lw: 0.2, alpha: aMk });
    text(g, ab.name, x, bot.y - 0.9 * u, { px, color: slate, alpha: aMk, align: 'center', role: 'label' });
  }
}
