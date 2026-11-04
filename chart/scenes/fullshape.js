import { TEXT, textRuns, axes, scale, text, measure, polyline, glyph, errorBar, refLine, clipped, smooth, lerp, tracerStyle, placeLabels, lineObstacles, clamp01, mixHex, plainName, tagged } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, placeholderStamp, pointLabelChoices, turns } from './common.js';

const DZ = 0.03;
const LYA_GAP = (u, px) => px / 3 + 0.2 * u + 2;
const LYA_R = 0.8, LYA_LW = 0.4, BAR_LW = 0.4;
const reach = (shape, r, u) => (shape.startsWith('diamond') ? 1.25 * r + (LYA_LW / 2) * Math.SQRT2 : r + LYA_LW / 2) * u;
const capsClear = (halfBarPx, shape, u) => halfBarPx - (BAR_LW / 2) * u - reach(shape, LYA_R, u) >= 0.3 * u;
export function drawFullShape(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.full_shape;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'full_shape', st.geo * op); return; }
  const { g, u, T } = env;
  const tl = turns(clamp01(st.lya || 0));
  const F = footLayout(env, A, [{ foot: M.foot, alpha: st.geo * op * tl.out }], 4);
  const Fl = footLayout(env, A, [{ foot: { ...M.foot, optional: [...(M.foot.optional || []), `the two Lyα points (z = ${(M.geo.lyaFS || M.geo.lyaBAO || {}).z}) are drawn ${DZ} to either side in z, for display; their values and bars are exact`], caveats: [`Lyα points offset ±${DZ} in z for display`] }, alpha: st.geo * op * tl.in }], 4);
  A.plotBottom = plotBottomAbove(env, A, F.top);
  const P = panels(env, A).solo;
  const G = P, Gf = P;
  const X = scale(M.x.range[0], M.x.range[1], P.x, P.x + P.w);
  const a = st.geo * op;
  geometry(env, G, Gf, X, M, st, op, a, 0);
  placeholderStamp(env, P, M, a);
  F.draw(); Fl.draw();
}

function geometry__(env, G, Gf, X, M, st, op, a, grow) {
  const { g, u, T } = env;
  const rg = [M.geo.range[0] - 0.08 * (M.geo.range[1] - M.geo.range[0]), M.geo.range[1] + 0.42 * (M.geo.range[1] - M.geo.range[0])];
  const Y = scale(rg[0], rg[1], G.y + G.h, G.y);
  axes(g, G, { x: { s: X, label: grow < 1 ? M.x.label : '', bare: grow >= 1 }, y: { s: Y, label: M.geo.axisLabel || M.geo.label } }, env, { alpha: a });
  {
    const tp = TEXT.label * u, xg = G.x + 1.6 * u, yg = G.y - 1.0 * tp - 0.35 * tp;
    if (M.geo.gloss) text(g, M.geo.gloss, xg + 2.8 * u, G.y - 1.0 * tp, { px: TEXT.min * u, color: T.muted, alpha: a, italic: true, role: 'label' });
    g.save(); g.globalAlpha *= a; g.lineWidth = Math.max(1, 0.18 * u); g.strokeStyle = T.hair; g.setLineDash([0.5 * u, 0.4 * u]);
    g.beginPath(); g.arc(xg, yg, 1.1 * u, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]);
    if (g.__mark) g.__mark('line'); g.strokeStyle = T.ink; g.lineWidth = Math.max(1.5, 0.26 * u);
    g.beginPath(); for (let k = 0; k <= 48; k++) { const t = (2 * Math.PI * k) / 48, x = xg + 1.45 * u * Math.cos(t), y = yg - 0.8 * u * Math.sin(t); if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); g.restore();
  }
  refLine(g, G.x, Y(1), G.x + G.w, Y(1), env, { alpha: 0.8 * a });
  const Yf = scale(rg[0], rg[1], Gf.y + Gf.h, Gf.y);
  const lyaF = M.geo.lyaFS || M.geo.lyaBAO;
  const B0 = M.geo.lyaBAO || lyaF, F0 = M.geo.lyaFS || lyaF, short = L => String(L).replace(/\s*\([^)]*\)/g, '');
  const dz = L => (/^DESI\b/.test(L) ? L : `DESI ${L}`);
  const headB = B0 && dz(short(B0.label)), valB = B0 && B0.precision ? ` · ${B0.precision}` : '', headF = F0 && dz(short(F0.label)), valF = F0 && F0.precision ? ` · ${F0.precision}` : '';
  const nameB = B0 && `${headB}${valB}`, nameF = F0 && `${headF}${valF}`;
  const lyaBoxes = [];
  if (B0 && F0) {
    const pb = TEXT.label * u, pf = TEXT.title * u, wB = measure(g, nameB, pb), wF = measure(g, nameF, pf);
    lyaBoxes.push({ x: Gf.x + Gf.w - 0.5 * u - wB, y: Math.max(Yf(F0.err[0]), Yf(B0.err[0])) + LYA_GAP(u, pb), w: wB, h: 1.05 * pb });
    lyaBoxes.push({ x: Gf.x + Gf.w - 0.5 * u - wF, y: Math.min(Yf(F0.err[1]), Yf(B0.err[1])) - LYA_GAP(u, pf) - 1.05 * pf, w: wF, h: 1.05 * pf });
  }
  const plain = p => plainName(p.id || p.label, null, { z: false });
  const set2 = n => (/^star-forming galaxies$/.test(n) ? 'star-forming\ngalaxies' : n);
  const groups = {};
  for (const p of M.geo.points) (groups[plain(p)] = groups[plain(p)] || []).push(p);
  const shared = Object.entries(groups).filter(([, ps]) => ps.length > 1);
  const brackets = shared.map(([name, ps]) => {
    const xs = ps.map(p => X(p.z)), top = Math.min(...ps.map(p => Yf(p.err[1])));
    const px = TEXT.label * u, yb = top - 1.0 * u, w = measure(g, name, px);
    return { name, ps, x0: Math.min(...xs) - 1.0 * u, x1: Math.max(...xs) + 1.0 * u, yb, px, box: { x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y: yb - 0.5 * u - 0.8 * px - 0.25 * px, w, h: 1.05 * px } };
  });
  const solo = M.geo.points.filter(p => !shared.some(([, ps]) => ps.includes(p)));
  const pts = solo.map(p => ({ id: p.id, label: set2(plain(p)), big: false, x: X(p.z), y: Yf(p.y), top: Yf(p.err[1]), bottom: Yf(p.err[0]) }));
  const barBoxes = brackets.flatMap(b => b.ps.map(p => ({ x: X(p.z) - 1.5 * u, y: Yf(p.err[1]) - 0.8 * u, w: 3.0 * u, h: Yf(p.err[0]) - Yf(p.err[1]) + 1.6 * u })));
  const choice = pointLabelChoices(env, pts, Gf, [{ x: Gf.x, y: Yf(1) - 0.3 * u, w: Gf.w, h: 0.6 * u }, ...lyaBoxes, ...brackets.map(b => b.box), ...barBoxes]);
  for (const b of brackets) {
    const top = Math.min(...b.ps.map(p => Y(p.err[1]))), yb = top - 1.0 * u, tick = 0.7 * u;
    polyline(g, [[b.x0, yb + tick], [b.x0, yb], [b.x1, yb], [b.x1, yb + tick]], T.ink, env, { lw: 0.2, alpha: 0.8 * a });
    text(g, b.name, (b.x0 + b.x1) / 2, yb - 0.5 * u - 0.25 * b.px, { px: b.px, color: T.ink, alpha: a, align: 'center', role: 'label' });
  }
  if (Array.isArray(env.notes) && a > 0) env.notes.push({ text: `the points, DESI's samples: ${M.geo.points.map(p => `${p.label} (${plain(p)}, z = ${p.z})`).join('; ')}`, shown: false, optional: true });
  for (const p of M.geo.points) {
    const sty = tracerStyle(T, p.tracer), c = T.name === 'dark' ? sty.color : T.ink;
    const x = X(p.z), y = Y(p.y);
    errorBar(g, x, y, { ylo: Y(p.err[0]), yhi: Y(p.err[1]) }, c, env, { alpha: a, lw: 0.28 });
    glyph(g, sty.glyph, x, y, 0.72 * u, c, env, { alpha: a });
    const ch = choice[p.id];
    if (ch) {
      const y0 = Yf(p.y), t0 = Yf(p.err[1]), b0 = Yf(p.err[0]), t = Y(p.err[1]), b = Y(p.err[0]);
      const ly = y0 + ch.dy < t0 ? t + (y0 + ch.dy - t0) : y0 + ch.dy > b0 ? b + (y0 + ch.dy - b0) : y + ch.dy;
      set2(plain(p)).split('\n').forEach((L, j) => text(g, L, x + ch.dx, ly + j * 1.15 * ch.px, { px: ch.px, color: T.ink, alpha: a, align: ch.align, role: 'label' }));
    }
  }
  const la = smooth(st.lya) * op;
  if (la > 0 && lyaF) {
    const B = M.geo.lyaBAO || lyaF, Fs = M.geo.lyaFS || lyaF, t = smooth(st.shrink);
    const cB = T.accent;
    const xB = X(B.z - DZ), xF = X(Fs.z + DZ);
    const half = p => Math.min(Math.abs(Y(p.err[0]) - Y(p.y)), Math.abs(Y(p.err[1]) - Y(p.y)));
    const capB = capsClear(half(B), 'circle', u), capF = capsClear(half(Fs), 'diamond', u);
    errorBar(g, xB, Y(B.y), { ylo: Y(B.err[0]), yhi: Y(B.err[1]) }, cB, env, { alpha: la, lw: BAR_LW, cap: capB ? 0.7 + 0.6 * t : 0 });
    glyph(g, 'circle-open', xB, Y(B.y), LYA_R * u, cB, env, { alpha: la, lw: LYA_LW });
    const fa = la * smooth(clamp01((st.shrink - 0.3) / 0.5));
    if (fa > 0) {
      errorBar(g, xF, Y(Fs.y), { ylo: Y(Fs.err[0]), yhi: Y(Fs.err[1]) }, T.accent, env, { alpha: fa, lw: BAR_LW, cap: capF ? 0.7 : 0 });
      glyph(g, 'diamond-open', xF, Y(Fs.y), LYA_R * u, T.accent, env, { alpha: fa, lw: LYA_LW });
    }
    textRuns(g, [{ t: headB }, { t: valB, color: T.ink }], G.x + G.w - 0.5 * u, Math.max(Y(Fs.err[0]), Y(B.err[0])) + LYA_GAP(u, TEXT.label * u) + 0.8 * TEXT.label * u, { px: TEXT.label * u, color: cB, alpha: la, align: 'right', role: 'label' });
    if (fa > 0) {
      textRuns(g, [{ t: headF }, { t: valF, color: T.ink }], G.x + G.w - 0.5 * u, Math.min(Y(Fs.err[1]), Y(B.err[1])) - LYA_GAP(u, TEXT.title * u) - 0.25 * TEXT.title * u, { px: TEXT.title * u, color: T.accent, alpha: fa, align: 'right', role: 'label' });
    }
  }
}
function geometry(...args) { return tagged(args[0].g, 'lya', () => geometry__(...args)); }
