import { drawAdded } from './dlapairs.js';
import { TEXT, axes, scale, text, measure, polyline, band, glyph, errorBar, refLine, clipped, ellipseLoop, placeLabels, smooth, lerp, lerpRect, lineObstacles, wrap, clamp01, tagged, fillAlphaFor } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, placeholderStamp, GLYPH_WORDS, turns, fitBand, edgeAround, caveatNote, refNames, PLANE, planeFrame, planeSeries, planeColour, planeGrey, hisName, priorLabel, planeArrow, yTitle as axisTitle, tickLabels } from './common.js';

const colourOf = (T, p) => (p.highlight ? T.accent : /planck/i.test(p.id) ? T.ink : T.name === 'dark' ? '#AEB7C4' : '#5B6472');
const stepOf = (st, p) => (/planck/i.test(p.id) ? st.pl : /desi/i.test(p.id) ? st.de : st.ks);
const ZK = 2.4, ZP = 9;
const RR = [0.93, 1.12];
const SHARE = 0.54;
function twoLines(l) {
  const t = String(l), m = /:\s+|\s+(?=\()/.exec(t);
  return m ? `${t.slice(0, m.index + (m[0].startsWith(':') ? 1 : 0))}\n${t.slice(m.index + m[0].length)}` : t;
}
const slopeOf = t => Math.log(t.P[t.P.length - 1] / t.P[0]) / Math.log(t.k[t.k.length - 1] / t.k[0]);
function tickRotated(p, s0, r) {
  const s1 = slopeOf(p.tick), sl = s0 + (s1 - s0) * r;
  return p.tick.k.map(k => p.P * (k / p.k) ** sl);
}
const shortPivot = l => String(l).split(/\s+(?=\()/)[0];

export function drawPk(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.pk_z3;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'pk_z3', st.curve * op); return; }
  const Ab = env.charts.absorbers && env.charts.absorbers.cosmo ? env.charts.absorbers.cosmo : null;
  const t3 = turns(clamp01(((st.fly || 0) - 0.05) / 0.3)), t5 = turns(clamp01(st.ks || 0));
  const t6 = turns(clamp01(st.prior || 0)), t7 = turns(clamp01((st.alt || 0) * (1 - (st.vout || 0))));
  const t2 = turns(clamp01(st.p1d || 0)), FR = M.footRanges ? footLayout(env, A, [{ foot: M.footRanges, alpha: st.curve * op * t2.in * t3.out }]) : null;
  const F = footLayout(env, A, [{ foot: M.footCurve || M.foot, alpha: st.curve * op * t3.out * (FR ? t2.out : 1) }]);
  const F3 = footLayout(env, A, [{ foot: M.footPivot || { lines: [] }, alpha: op * t3.in * t5.out }]);
  const F5 = footLayout(env, A, [{ foot: M.footFit || { lines: [] }, alpha: op * t5.in * (M.footPrior ? t6.out : t7.out) }]);
  const F6 = M.footPrior ? footLayout(env, A, [{ foot: M.footPrior, alpha: op * t6.in * t7.out }]) : null;
  const F7 = Ab ? footLayout(env, A, [{ foot: variantsFoot(Ab, M), alpha: op * t7.in }]) : null;
  A.plotBottom = plotBottomAbove(env, A, F.top);
  const R = panels(env, A), split = smooth(st.split);
  const P = lerpRect(R.solo, R.left, split);
  const pko = st.pko === undefined ? 1 : st.pko, wide = smooth(st.wide || 0);
  const S1 = pko > 0 ? main(env, P, M, st, op * pko) : null;
  let S2 = null, Qx = R.right.x;
  if (st.split > 0) {
    const Qh = { ...R.right, x: R.right.x + (1 - split) * 0.25 * env.W };
    const Qp = wide > 0 ? lerpRect(Qh, R.solo, wide) : Qh;
    Qx = Qp.x;
    S2 = plane(env, Qp, M, Ab, st, op);
  }
  if (S1 && S2 && (st.fly || 0) > 0 && (st.fly || 0) < 1 + 1e-9) flight(env, M, S1, S2, st, op);
  if ((st.spec || 0) > 0) drawAdded(env, { ...R.left, w: Qx - 15.0 * env.u - R.left.x }, env.charts.sightlines, op * smooth(st.spec), clamp01(st.specb || 0));
  placeholderStamp(env, P, M, st.curve * op * pko);
  for (const f of [F, FR, F3, F5, F6, F7]) if (f) f.draw();
}
function variantsFoot(Ab, M) {
  const tbl = Ab.shift && /Table \d+/.exec(String(Ab.shift.source || ''));
  const L = `variants: Ho et al. 2026${tbl ? `; Chaves-Montero et al. 2026, ${tbl[0]}` : ''}`;
  const cr = M.credit ? ` · ${M.credit}` : '';
  return { lines: [L], short: L, caveats: M.slopesShort ? [`${M.slopesShort}${cr}`] : [], caveatsShort: M.recomputedShort ? [`${M.recomputedShort}${cr}`, `recomputed: DESI's slope recipe${cr}`] : [],
    optional: [...(Ab.shift ? [`${Ab.shift.label} (${Ab.shift.source})`] : []), ...((M.footFit && M.footFit.optional) || [])] };
}

function flight(env, M, S1, S2, st, op) {
  const { g, u, T } = env;
  if (!M.flight || !M.pivot) return;
  const f = smooth(st.fly), out = 1 - smooth(clamp01(((st.pl || 0) - 0.3) / 0.7));
  const a = op * Math.min(1, 4 * st.fly) * out;
  if (!(a > 0)) return;
  const kp = M.flight.k || M.pivot.k, K = M.curve.k, Pc = M.curve.P;
  let j = 1; while (j < K.length - 1 && K[j] < kp) j++;
  const t = Math.log(kp / K[j - 1]) / Math.log(K[j] / K[j - 1]), Pkp = Math.exp(Math.log(Pc[j - 1]) + t * Math.log(Pc[j] / Pc[j - 1]));
  const x0 = S1.X(kp), y0 = S1.Y(Pkp);
  const xd = S2.X(M.flight.x), yd = S2.Q.y + S2.Q.h;
  const span = 1.8, ta = [S1.X(kp / span) - x0, S1.Y(Pkp * span ** -M.flight.y) - y0], tb = [S1.X(kp * span) - x0, S1.Y(Pkp * span ** M.flight.y) - y0];
  const xt = S2.Q.x + 0.4 * Math.max(Math.abs(ta[0]), Math.abs(tb[0])) + 0.4 * u, yt = S2.Y(M.flight.y);
  const arc = (xe, ye, lift) => { const cx = (x0 + xe) / 2, cy = Math.min(y0, ye) - lift * u;
    return q => [(1 - q) ** 2 * x0 + 2 * (1 - q) * q * cx + q * q * xe, (1 - q) ** 2 * y0 + 2 * (1 - q) * q * cy + q * q * ye]; };
  const pd = arc(xd, yd, 4), pt = arc(xt, yt, 8);
  for (const path of [pd, pt]) { const trail = []; for (let i = 0; i <= 40; i++) trail.push(path((i / 40) * f)); polyline(g, trail, T.ink, env, { lw: 0.16, alpha: 0.5 * a, dash: [0.6, 0.5] }); }
  const px = TEXT.min * u, lab = a * smooth(clamp01(st.fly / 0.15));
  const [x1, y1] = pt(f), shrink = 1 - 0.6 * f;
  polyline(g, [[x1 + ta[0] * shrink, y1 + ta[1] * shrink], [x1 + tb[0] * shrink, y1 + tb[1] * shrink]], T.ink, env, { lw: 0.34, alpha: a });
  text(g, GLYPH_WORDS[0], x1 + 1.6 * u, y1 - 1.2 * u - 1.35 * px, { px, color: T.ink, alpha: lab, role: 'label' });
  const [x2, y2] = pd(f);
  glyph(g, 'circle', x2, y2, 0.55 * u, T.ink, env, { alpha: a });
  text(g, GLYPH_WORDS[1], x2 + 1.2 * u, y2 - 1.2 * u, { px, color: T.ink, alpha: lab, role: 'label' });
  const ga = a * smooth(clamp01((st.fly - 0.85) / 0.15));
  if (ga > 0) {
    const xc = S2.X(M.flight.x), yc = S2.Y(M.flight.y);
    polyline(g, [[xd, yd], [xc, yc]], T.ink, env, { lw: 0.14, alpha: 0.7 * ga, dash: [0.5, 0.4] });
    polyline(g, [[xt, yt], [xc, yc]], T.ink, env, { lw: 0.14, alpha: 0.7 * ga, dash: [0.5, 0.4] });
  }
}

function main(env, P0, M, st, op) {
  const { g, u, T } = env;
  const a = st.curve * op;
  const z = smooth(st.zoom), kp = M.pivot ? M.pivot.k : M.points[0].k;
  const P = z > 0 ? { ...P0, h: lerp(P0.h, SHARE * P0.h, z) } : P0;
  const rA = smooth(clamp01((st.zoom - 0.55) / 0.45));
  const Pp = Math.exp(M.points.reduce((s, p) => s + Math.log(p.P), 0) / M.points.length);
  const L = (a0, b0) => 10 ** lerp(Math.log10(a0), Math.log10(b0), z);
  const kr = [L(M.x.range[0], kp / ZK), L(M.x.range[1], kp * ZK)], pr = [L(M.y.range[0], Pp / ZP), L(M.y.range[1] * 16, Pp * ZP * 2.2)];
  const X = scale(kr[0], kr[1], P.x, P.x + P.w, true), Y = scale(pr[0], pr[1], P.y + P.h, P.y, true);
  axes(g, P, { x: { s: X, label: M.x.label, log: true }, y: { s: Y, label: '', log: true } }, env, { alpha: a, xAlpha: 1 - smooth(clamp01((st.zoom - 0.15) / 0.35)) });
  const yl = [];
  for (let zz = 0; zz <= 1.0001; zz += 0.05) { const Lz = (a0, b0) => 10 ** lerp(Math.log10(a0), Math.log10(b0), smooth(zz)); yl.push(...tickLabels(scale(Lz(M.y.range[0], Pp / ZP), Lz(M.y.range[1] * 16, Pp * ZP * 2.2), 1, 0, true), true)); }
  axisTitle(env, P, M.y.label, yl, { alpha: a * (1 - smooth(clamp01((st.zoom || 0) / 0.12))) });
  axisTitle(env, P, 'P(k)', yl, { alpha: a * smooth(clamp01(((st.zoom || 0) - 0.35) / 0.3)) });
  const da = smooth(st.desi) * op, pa = smooth(st.p1d) * op, rng = st.rng === undefined ? 1 : smooth(st.rng);
  const pta = p => smooth(stepOf(st, p)) * op, ta = Math.max(...M.points.map(pta));
  const dla = da * (1 - smooth(st.split));
  const curvePts = M.curve.k.map((k, i) => [X(k), Y(M.curve.P[i])]).filter(([x, y]) => x >= P.x - 2 && x <= P.x + P.w + 2 && y >= P.y - 2 && y <= P.y + P.h + 2);
  const obstacles = lineObstacles(curvePts, u, 2, 0.6);
  const rangeName = r => (r.highlight ? `my analysis:\n${r.label}'s k range` : `${r.label}: 1D k range`);
  const extra = i => M.ranges.slice(0, i).reduce((n, r) => n + rangeName(r).split('\n').length - 1, 0);
  const barY = i => P.y + (1.8 + 5.8 * i + 1.15 * TEXT.min * extra(i)) * u;
  const zone = M.ranges.length && pa > 0 ? barY(M.ranges.length - 1) + (4.8 + 1.15 * TEXT.min * (rangeName(M.ranges[M.ranges.length - 1]).split('\n').length - 1)) * u : P.y;
  clipped(g, P, () => {
    if (dla > 0 && M.bands.fit) { const [k0, k1] = M.bands.fit.k; fitBand(env, P, X(k0), X(k1), dla, { top: zone, later: [X(k0)] }); }
    if (dla > 0 && M.bands.bao) {
      g.save(); g.globalAlpha *= dla; g.strokeStyle = T.ink; g.lineWidth = Math.max(1, 0.3 * u);
      g.beginPath(); g.moveTo(X(M.bands.bao.k), P.y + P.h); g.lineTo(X(M.bands.bao.k), P.y + P.h - 2.2 * u); g.stroke(); g.restore();
    }
    polyline(g, curvePts, T.ink, env, { lw: 0.32, alpha: a });
    tagged(g, 'his', () => M.ranges.forEach((r, i) => {
      const ra = pa * rng * (1 - z);
      if (!(ra > 0)) return;
      g.save(); g.globalAlpha *= ra; g.strokeStyle = r.highlight ? T.accent : T.muted; g.lineWidth = Math.max(2, 0.4 * u); g.lineCap = 'butt'; if (g.__mark) g.__mark('line'); 
      g.beginPath(); g.moveTo(X(r.k[0]), barY(i)); g.lineTo(X(r.k[1]), barY(i));
      for (const kk of r.k) { g.moveTo(X(kk), barY(i) - 0.9 * u); g.lineTo(X(kk), barY(i) + 0.9 * u); }
      g.stroke(); g.restore();
    }));
    if (M.pivot && ta > 0) refLine(g, X(kp), zone, X(kp), P.y + P.h, env, { alpha: 0.7 * ta, color: T.muted });
    const planck = M.points.find(q => /planck/i.test(q.id) && q.tick);
    const planckSlope = planck ? slopeOf(planck.tick) : null;
    tagged(g, 'his', () => { for (const p of M.points) {
      const qa = pta(p);
      if (!(qa > 0) || !p.tick) continue;
      const c = colourOf(T, p);
      const rot = p.highlight && st.rot !== undefined ? smooth(st.rot) : 1;
      const sl = rot < 1 && planckSlope !== null ? lerp(planckSlope, slopeOf(p.tick), rot) : slopeOf(p.tick);
      const kt = p.tick.k, k0 = 10 ** lerp(Math.log10(kt[0]), Math.log10(kr[0]), z), k1 = 10 ** lerp(Math.log10(kt[kt.length - 1]), Math.log10(kr[1]), z);
      const line = slope => [k0, p.k, k1].map(k => [X(k), Y(p.P * (k / p.k) ** slope)]);
      if (p.tick.lo && p.tick.hi && rot > 0) band(g, line(slopeOf({ k: kt, P: p.tick.hi })), line(slopeOf({ k: kt, P: p.tick.lo })), c, fillAlphaFor(c, T.ground, 20) * qa * rot, env);
      polyline(g, line(sl), c, env, { lw: p.highlight ? 0.42 : 0.32, alpha: qa });
      if (p.sigP) errorBar(g, X(p.k), Y(p.P), { ylo: Y(p.P - p.sigP), yhi: Y(p.P + p.sigP) }, c, env, { alpha: qa, lw: 0.3, cap: 0.5 });
      glyph(g, 'circle', X(p.k), Y(p.P), (p.highlight ? 0.75 : 0.6) * u, c, env, { alpha: qa });
      obstacles.push(...lineObstacles(line(slopeOf(p.tick)), u, 1, 0.8));
    } });
  });
  if (rA > 0) tagged(g, 'his', () => residual(env, { x: P0.x, y: P.y + P.h + 4.8 * u, w: P0.w, h: P0.y + P0.h - (P.y + P.h + 4.8 * u) }, X, kr, M, st, rA * op));
  const items = [];
  const inPlot = k => X(k) >= P.x + u && X(k) <= P.x + P.w - u;
  if (dla > 0 && M.bands.bao && inPlot(M.bands.bao.k)) items.push({ text: M.bands.bao.label, x: X(M.bands.bao.k), y: P.y + P.h - 3.0 * u, px: TEXT.min * u, color: T.ink, alpha: dla, leader: false, plate: true,
    cands: [[1.0, 0.4, 'left'], [-1.0, 0.4, 'right'], [1.0, -4, 'left'], [-1.0, -4, 'right']] });
  if (dla > 0 && M.bands.fit && M.bands.edge) {
    const parts = M.bands.edge.label.split(/\s+(?=use\s|and\s)/);
    const words = [...(parts.length > 1 ? parts : wrap(g, M.bands.edge.label, 30 * u, TEXT.min * u, true)), ...(M.bandCaveat ? [M.bandCaveat] : [])].join('\n');
    if (M.bandCaveat) caveatNote(env, M.bandCaveat, dla);
    if (inPlot(M.bands.edge.k)) items.push({ text: words, x: X(M.bands.edge.k), y: P.y + 0.55 * P.h, px: TEXT.min * u, color: T.muted, alpha: dla, italic: true, leader: false, plate: true,
      cands: [[-1.0, 0, 'right'], [-1.0, 4, 'right'], [-1.0, -4, 'right'], [1.0, 4, 'left'], [1.0, 8, 'left']] });
  } else if (dla > 0 && M.bands.fit) {
    const km = Math.sqrt(M.bands.fit.k[0] * M.bands.fit.k[1]);
    if (inPlot(km)) items.push({ text: twoLines(M.bands.fit.label.split(/,\s+/)[0].replace(/\s*\(auto\)$/, '')), x: X(km), y: P.y + 0.6 * P.h, px: TEXT.min * u, color: T.muted, alpha: dla, italic: true, leader: false,
      cands: [[0, 0, 'center'], [0, -4, 'center'], [1, 0, 'left'], [-1, 0, 'right'], [0, -8, 'center']] });
  }
  M.ranges.forEach((r, i) => {
    if (!(pa * rng * (1 - z) > 0)) return;
    const x0 = Math.max(P.x + u, X(r.k[0])), x1 = Math.min(P.x + P.w - u, X(r.k[1]));
    const under = (1.1 * u + 0.8 * TEXT.min * u) / u;
    const two = r.highlight;
    items.push({ text: rangeName(r), x: x0, y: barY(i), px: TEXT.min * u, color: r.highlight ? T.accent : T.muted, alpha: pa * rng * (1 - z), leader: false,
      cands: two ? [[(x1 - x0) / u, under, 'right'], [0, under, 'left']] : [[0, under, 'left'], [(x1 - x0) / u, under, 'right'], [(x1 - x0) / u + 1.0, 0.35 * TEXT.min, 'left'], [-1.0, 0.35 * TEXT.min, 'right']] });
  });
  if (M.pivot && ta > 0) {
    const yTop = zone + 1.0 * u + 0.8 * TEXT.min * u, dyB = (P.y + P.h - 2.0 * u - yTop) / u;
    const sp = shortPivot(M.pivot.label);
    const zq = st.zoom || 0, pivA = zq <= 0 || zq >= 1 ? 1 : Math.max(1 - smooth(clamp01(zq / 0.15)), smooth(clamp01((zq - 0.85) / 0.15)));
    items.push({ text: sp, x: X(kp), y: yTop, px: TEXT.min * u, color: T.ink, alpha: ta * pivA, leader: false,
      cands: [[1.0, 0, 'left'], [1.0, 3.5, 'left'], [-1.0, dyB, 'right'], [1.0, dyB, 'left'], [-1.0, 0, 'right'], [1.0, dyB - 4, 'left']] });
  }
  const vline = (k, y0, y1) => { const o = []; for (let y = y0; y <= y1; y += u) o.push({ x: X(k) - 0.3 * u, y, w: 0.6 * u, h: u }); return o; };
  if (M.pivot && ta > 0) obstacles.push(...vline(kp, zone, P.y + P.h));
  if (dla > 0 && M.bands.edge) obstacles.push(...vline(M.bands.edge.k, zone, P.y + P.h));
  if (dla > 0 && M.bands.bao) obstacles.push(...vline(M.bands.bao.k, P.y + P.h - 2.2 * u, P.y + P.h));
  if (pa * rng * (1 - z) > 0) M.ranges.forEach((r, i) => obstacles.push({ x: X(r.k[0]) - 0.3 * u, y: barY(i) - 0.9 * u, w: X(r.k[1]) - X(r.k[0]) + 0.6 * u, h: 1.8 * u }));
  const placed = tagged(g, 'his', () => placeLabels(g, items, env, { avoid: obstacles, bounds: { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 1 * u } }));
  if (dla > 0 && M.bands.fit) clipped(g, P, () => edgeAround(env, X(M.bands.fit.k[0]), zone, P.y + P.h, placed, dla));
  return { X, Y };
}

function residual(env, R, X, kr, M, st, a) {
  const { g, u, T } = env;
  const planck = M.points.find(q => /planck/i.test(q.id) && q.tick), his = M.points.find(q => q.highlight && q.tick);
  if (!planck || !his || !(R.h > 4 * u)) return;
  const n0 = slopeOf(planck.tick), kp = planck.k, kt = his.tick.k, px = TEXT.min * u;
  const Y = scale(RR[0], RR[1], R.y + R.h, R.y);
  axes(g, R, { x: { s: X, label: M.x.label, log: true }, y: { s: Y, label: '', ticks: [0.95, 1, 1.05].map(v => ({ v, label: v === 1 ? '1' : v.toFixed(2) })) } }, env, { alpha: a, yTickAlpha: smooth(clamp01((R.h - 11.5 * u) / (2 * u))) });
  axisTitle(env, R, 'ratio', ['0.95', '1', '1.05'], { alpha: a * smooth(clamp01((R.h - 11.5 * u) / (2 * u))) });
  const t1 = "my tangent ÷ Planck's, matched at the pivot", t2 = ' · true scale, not exaggerated', w1 = measure(g, t1, px);
  text(g, t1, R.x, R.y - 1.0 * u, { px, color: T.ink, alpha: a, role: 'label' });
  if (w1 + measure(g, t2, px, true) <= R.w) text(g, t2, R.x + w1, R.y - 1.0 * u, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  else {
    text(g, 'true scale,', R.x + 1.0 * u, R.y + 0.7 * u + 0.8 * px, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
    text(g, 'not exaggerated', R.x + 1.0 * u, R.y + 0.7 * u + 0.8 * px + 1.15 * px, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  }
  refLine(g, X(kp), R.y, X(kp), R.y + R.h, env, { alpha: 0.6 * a, color: T.muted });
  const ratio = (d, k0, k1) => [k0, kp, k1].map(k => [X(k), Y((k / kp) ** d)]);
  const ha = a * smooth(stepOf(st, his)), rot = st.rot !== undefined ? smooth(st.rot) : 1, c = colourOf(T, his);
  polyline(g, ratio(0, kr[0], kr[1]), colourOf(T, planck), env, { lw: 0.3, alpha: a });
  const dn = (slopeOf(his.tick) - n0) * rot;
  if (his.tick.lo && his.tick.hi && rot > 0) band(g, ratio(slopeOf({ k: kt, P: his.tick.hi }) - n0, kt[0], kt[kt.length - 1]), ratio(slopeOf({ k: kt, P: his.tick.lo }) - n0, kt[0], kt[kt.length - 1]), c, fillAlphaFor(c, T.ground, 20) * ha * rot, env);
  polyline(g, ratio(dn, kr[0], kr[1]), c, env, { lw: 0.42, alpha: ha });
  text(g, "Planck's tangent", R.x + R.w - 0.6 * u, Y(1) + 0.6 * u + 0.8 * px, { px, color: colourOf(T, planck), alpha: a, align: 'right', role: 'label' });
  const wn = measure(g, his.short, px), xl = X(kp) + 1.0 * u, kR = 10 ** (Math.log10(kr[0]) + (xl + wn - R.x) / R.w * Math.log10(kr[1] / kr[0]));
  const dnHi = his.tick.hi ? Math.max(dn, (slopeOf({ k: kt, P: his.tick.hi }) - n0) * rot, (slopeOf({ k: kt, P: his.tick.lo || his.tick.hi }) - n0) * rot) : dn;
  const yTitle = R.y - 1.0 * u + 0.25 * px + px / 3 + 0.8 * px + 1, yBand = Y(Math.max(1, (kR / kp) ** dnHi)) - px / 3 - 0.25 * px - 1;
  text(g, his.short, xl, Math.max(yTitle, yBand), { px, color: c, alpha: ha, role: 'label' });
}

const loopsOf = p => (p.loops.length ? p.loops : [[ellipseLoop(p.c.x, p.c.y, p.c.sx, p.c.sy, p.c.rho, 2.3)], [ellipseLoop(p.c.x, p.c.y, p.c.sx, p.c.sy, p.c.rho, 6.18)]]);
const MORPH_N = 120;
function resample(L, n = MORPH_N) {
  let P = L.slice();
  if (P.length > 2 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1]) P = P.slice(0, -1);
  const area = P.reduce((s0, q, i) => { const r = P[(i + 1) % P.length]; return s0 + q[0] * r[1] - r[0] * q[1]; }, 0);
  if (area < 0) P.reverse();
  let i0 = 0; P.forEach((q, i) => { if (q[0] > P[i0][0]) i0 = i; });
  P = [...P.slice(i0), ...P.slice(0, i0)];
  const cum = [0];
  for (let i = 0; i < P.length; i++) { const a0 = P[i], b0 = P[(i + 1) % P.length]; cum.push(cum[i] + Math.hypot(b0[0] - a0[0], b0[1] - a0[1])); }
  const tot = cum[P.length], out = [];
  for (let k = 0, j = 0; k < n; k++) {
    const sk = (k / n) * tot;
    while (j < P.length - 1 && cum[j + 1] < sk) j++;
    const f = (sk - cum[j]) / (cum[j + 1] - cum[j] || 1), a0 = P[j], b0 = P[(j + 1) % P.length];
    out.push([a0[0] + f * (b0[0] - a0[0]), a0[1] + f * (b0[1] - a0[1])]);
  }
  out.push(out[0]);
  return out;
}
const biggest = loops => loops.reduce((b0, L) => (L.length > b0.length ? L : b0), loops[0]);
export function morphLoops(A, B, t) {
  if (t >= 1) return B;
  return B.map((lev, i) => {
    const a0 = resample(biggest(A[Math.min(i, A.length - 1)])), b0 = resample(biggest(lev));
    return [a0.map((q, k) => [lerp(q[0], b0[k][0], t), lerp(q[1], b0[k][1], t)])];
  });
}
function plane(env, Q, M, Ab, st, op) {
  const ia = smooth(clamp01((st.split - 0.9) / 0.1)) * op;
  if (!(ia > 0)) return null;
  const { g, u, T } = env;
  const pa = p => smooth(stepOf(st, p)) * op;
  const fl = st.fly === undefined ? 1 : st.fly, yTicks = fl <= 0 ? 1 : smooth(clamp01((fl - 0.9) / 0.1));
  const { X, Y } = planeFrame(env, Q, ia, { yTickAlpha: yTicks, glyph: ia * smooth(clamp01(((st.pl || 0) - 0.3) / 0.7)) });
  const pl = M.points.find(p => /planck/i.test(p.id)), de = M.points.find(p => !p.highlight && !/planck/i.test(p.id)), his = M.points.find(p => p.highlight);
  const alt0 = Ab ? Ab.runs.find(r => !r.fiducial && r.mean) : null, shift = Ab ? Ab.shift : null;
  const mixed = !!(alt0 && his && !!alt0.recomputed !== !!his.recomputed);
  if (mixed && Array.isArray(env.notes)) env.notes.push({ text: `NOT DRAWN: his alternative and arrow (definition mix: his point ${his.recomputed ? 'recomputed' : 'published'}, the alternative ${alt0.recomputed ? 'recomputed' : 'published'})`, shown: false, optional: false });
  const alt = mixed ? null : alt0;
  const vo = 1 - smooth(st.vout || 0);
  const altA = smooth(st.alt || 0) * vo * op, moveA = vo * op, markA = smooth(st.mark || 0) * vo * op;
  const slide = st.slide === undefined ? 1 : smooth(clamp01(st.slide)), altLoops = alt ? (his ? morphLoops(loopsOf(his), alt.loops, slide) : alt.loops) : null;
  planeSeries(env, Q, X, Y, { planck: pl && { e: pl.c, a: pa(pl) }, desi: de && { e: de.c, a: pa(de) }, his: his && { loops: loopsOf(his), a: pa(his) }, alt: alt && { loops: altLoops, a: altA } });
  const plNameA = pl ? pa(pl) * smooth(clamp01(((st.pl === undefined ? 1 : st.pl) - 0.95) / 0.05)) : 0;
  const refBoxes = refNames(env, X, Y, pl && { ...pl.c, label: String(pl.short).replace(/\s+\d{4}$/, '') }, de && { ...de.c, label: de.short }, { planck: planeColour(T, 'planck'), desi: planeColour(T, 'desi') }, { planck: plNameA, desi: de ? pa(de) * smooth(clamp01(((st.pl === undefined ? 1 : st.pl) - 0.95) / 0.05)) : 0 });
  const hn = his ? hisName(env, Q, X, Y, loopsOf(his), pa(his), his.recomputed ? PLANE.hisNameB : PLANE.hisName) : null;
  const byA = Math.max(pl ? pa(pl) : 0, de ? pa(de) : 0);
  if (M.contoursBy && byA > 0) {
    const tpx = TEXT.tick * u, lpx = TEXT.label * u, mpx = TEXT.min * u;
    text(g, M.contoursBy, Q.x + Q.w, Q.y + Q.h + 0.8 * u + 1.0 * tpx + 1.35 * lpx + 1.6 * mpx, { px: mpx, color: T.muted, alpha: byA * ia, align: 'right', italic: true, role: 'label' });
  }
  const cap = M.pivot && M.pivot.label ? shortPivot(M.pivot.label) : null;
  const cpx = TEXT.min * u, cw = cap ? measure(g, cap, cpx, true) : 0;
  const capBox = cap ? { x: Q.x + Q.w - 1 * u - cw, y: Q.y + 1 * u, w: cw, h: 1.05 * cpx } : null;
  if (cap) text(g, cap, Q.x + Q.w - 1 * u, Q.y + 1 * u + 0.8 * cpx, { px: cpx, color: T.muted, alpha: ia, italic: true, align: 'right', role: 'label' });
  const prA = his ? smooth(st.prior || 0) * op : 0;
  const prBox = hn ? priorLabel(env, hn.box, prA) : null;
  if (prA > 0 && Array.isArray(env.notes)) env.notes.push({ text: PLANE.priorLabel.join(' '), shown: true, optional: false, caveat: true });
  const boxes = [...refBoxes, ...(hn ? [hn.box] : []), ...(capBox ? [capBox] : [])];
  const sa = his && pl ? pa(his) * (st.same === undefined ? 1 : smooth(st.same)) : 0;
  if (sa > 0) {
    const xs0 = X(pl.c.x - pl.c.sx), xs1 = X(pl.c.x + pl.c.sx), xc = (xs0 + xs1) / 2;
    const top = Q.y + 0.6 * u + 0.8 * TEXT.min * u;
    const used = placeLabels(g, [{ text: PLANE.planckBand, x: xc, y: top, px: TEXT.min * u, color: T.muted, alpha: sa, italic: true, leader: false,
      cands: [[(xs1 - xc) / u + 0.8, 0, 'left'], [(xs0 - xc) / u - 0.8, 0, 'right'], [(xs1 - xc) / u + 0.8, 3.2, 'left'], [(xs0 - xc) / u - 0.8, 3.2, 'right']] }], env,
      { avoid: boxes, bounds: { x: Q.x + PLANE.hang * u, y: Q.y + 0.3 * u, w: Q.w - (PLANE.hang + 0.5) * u, h: Q.h - 0.6 * u } });
    clipped(g, Q, () => { for (const x of [xs0, xs1]) edgeAround(env, x, Q.y + 0.6 * u, Q.y + Q.h, [...boxes, ...used], sa); });
  }
  if (alt && his) tagged(g, 'his', () => planeArrow(env, X, Y, [his.c.x, his.c.y], alt.mean, smooth(st.move || 0), T.accent, moveA, { casing: true }));
  const mR = 0.75 * u, grey = planeGrey(T);
  if (shift && markA > 0) {
    const p0 = [X(shift.from[0]), Y(shift.from[1])], p1 = [X(shift.to[0]), Y(shift.to[1])], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const stop = L > 0 ? 1 - (mR + 0.35 * u) / L : 1;
    planeArrow(env, X, Y, shift.from, [lerp(shift.from[0], shift.to[0], stop), lerp(shift.from[1], shift.to[1], stop)], smooth(st.shift || 0), grey, vo * op);
    glyph(g, 'circle', p1[0], p1[1], mR + 1.0 * u, T.ground, env, { alpha: markA }); glyph(g, 'circle', p1[0], p1[1], mR, grey, env, { alpha: markA });
  }
  if (alt || shift) {
    const pad = b0 => ({ x: b0.x - 1.5 * u, y: b0.y - 1.5 * u, w: b0.w + 3 * u, h: b0.h + 3 * u });
    const obst = [...boxes.map(b0 => (hn && b0 === hn.box ? pad(b0) : b0)), ...(prBox && prA > 0 ? [prBox] : [])];
    const lines = [...(his ? loopsOf(his) : []), ...(alt ? alt.loops : []), ...[pl, de].filter(Boolean).map(p => [ellipseLoop(p.c.x, p.c.y, p.c.sx, p.c.sy, p.c.rho, 6.18), ellipseLoop(p.c.x, p.c.y, p.c.sx, p.c.sy, p.c.rho, 2.3)])];
    for (const set of lines) for (const Lp of set) obst.push(...lineObstacles(Lp.map(q => [X(q[0]), Y(q[1])]), u, 1, 0.3));
    const dense = (a0, a1) => { const n = Math.max(2, Math.ceil(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) / u)); return Array.from({ length: n + 1 }, (_, i) => [lerp(a0[0], a1[0], i / n), lerp(a0[1], a1[1], i / n)]); };
    if (alt && his) obst.push(...lineObstacles(dense([X(his.c.x), Y(his.c.y)], [X(alt.mean[0]), Y(alt.mean[1])]), u, 1, 0.6));
    if (shift) { obst.push(...lineObstacles(dense([X(shift.from[0]), Y(shift.from[1])], [X(shift.to[0]), Y(shift.to[1])]), u, 1, 0.6)); obst.push({ x: X(shift.to[0]) - mR - 0.3 * u, y: Y(shift.to[1]) - mR - 0.3 * u, w: 2 * mR + 0.6 * u, h: 2 * mR + 0.6 * u }); }
    const items = [];
    if (alt) {
      const o95 = alt.loops[alt.loops.length - 1].flat(), r = o95.reduce((b, q) => (q[0] > b[0] ? q : b), o95[0]), px = TEXT.min * u;
      const cands = [[1.0, 0.35 * TEXT.min, 'left'], [1.0, -1.5, 'left'], [1.0, 2.5, 'left'], [1.0, -4, 'left'], [1.0, 5, 'left'], [0, -3, 'right'], [0, 4, 'right'],
        [1.0, 7.5, 'left'], [1.0, -6.5, 'left'], [0, 7.5, 'right'], [0, -6.5, 'right'], [3.0, 10, 'left'], [-2.0, 10, 'right']];
      const wd = clamp01(st.wide || 0), w6 = 0.4;
      const gate = wd <= w6 || wd >= 1 ? 1 : (1 - smooth(clamp01((wd - w6) / 0.15))) + smooth(clamp01((wd - 0.85) / 0.15));
      const two = wd < 1 - 1e-6;
      const nm = two ? PLANE.altName.replace(/\s+(at all z)$/, '\n$1') : PLANE.altName;
      const grid = [];
      for (let dx = -24; dx <= 6; dx += 1.5) for (let dy = -16; dy <= 12; dy += 1.0) grid.push([dx, dy, 'left']);
      const cands2 = grid.sort((p0, q) => Math.hypot(p0[0], p0[1]) - Math.hypot(q[0], q[1]));
      items.push({ text: nm, x: X(r[0]), y: Y(r[1]), px, color: T.accent, alpha: altA * gate * smooth(clamp01((slide - 0.9) / 0.1)), leader: false, cands: two ? cands2 : cands, tag: 'his' });
    }
    if (shift) {
      const mx = X(shift.to[0]), my = Y(shift.to[1]), d = (mR + 0.8 * u) / u;
      const cands = [[d, 1.0, 'left'], [d, 3.0, 'left'], [0.6, d + 2.6, 'left'], [0, d + 2.6, 'center'], [-d, 3.0, 'right'], [d, -0.6, 'left'], [-d, 1.0, 'right'], [-d, 2.6, 'right'], [0, -d - 0.6, 'center']];
      const narrow = clamp01(st.wide || 0) < 1 - 1e-6;
      const grid = [];
      if (narrow) { for (let dx = -26; dx <= 14; dx += 0.75) for (let dy = -18; dy <= 16; dy += 0.75) for (const al of ['left', 'right']) grid.push([dx, dy, al]); grid.sort((p0, q) => Math.hypot(p0[0], p0[1]) - Math.hypot(q[0], q[1])); }
      items.push({ text: narrow ? PLANE.dlaName.replace(/,\s*/, ',\n') : PLANE.dlaName, x: mx, y: my, px: TEXT.min * u, color: grey, alpha: markA, leader: false, cands: narrow ? [...cands, ...grid] : cands,
        bounds: narrow ? { x: Q.x + 0.5 * u, y: Q.y + 0.5 * u, w: Q.w + 4 * u, h: Q.h - 1 * u } : undefined });
    }
    const strip = clamp01(st.wide || 0) < 1 - 1e-6 ? [{ x: Q.x, y: Q.y + Q.h - 1.0 * u, w: Q.w, h: 1.0 * u }] : [];
    tagged(g, 'his', () => placeLabels(g, items, env, { avoid: [...obst, ...strip], bounds: { x: Q.x + 0.5 * u, y: Q.y + 0.5 * u, w: Q.w - 1 * u, h: Q.h - 1 * u } }));
  }
  return { X, Y, Q };
}
