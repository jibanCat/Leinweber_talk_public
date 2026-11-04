import { TEXT, axes, scale, text, measure, polyline, glyph, errorBar, refLine, clipped, smooth, stagger, tracerStyle, clamp01, plainName, tagged, irisBlock } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, placeholderStamp, caveatNote, yTitle } from './common.js';

export function drawXi(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.xi_tracers;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'xi_tracers', st.pts * op); return; }
  const { g, u, T } = env;
  const F = footLayout(env, A, [{ foot: M.foot, alpha: st.pts * op }], 4);
  A.plotBottom = plotBottomAbove(env, A, F.top);
  const P0 = panels(env, A).solo;
  const P = { ...P0, y: P0.y + (4.2 + XI_DROP) * u + NAME2 * u, h: P0.h - (4.2 + XI_DROP) * u - NAME2 * u };
  const n = M.panels.length, cols = Math.min(4, n), rows = Math.ceil(n / cols);
  const gx = 3.2 * u, gy = (6.4 + NAME2) * u;
  const pw = (P.w - (cols - 1) * gx) / cols, ph = (P.h - (rows - 1) * gy) / rows;
  const a = st.pts * op;
  yTitle(env, P, M.yLabel, null, { alpha: a, x: P.x - 1.6 * u });
  const fa1 = smooth(st.fit) * op;
  const guideT = M.guide ? `dashed line: ≈ ${Math.round(M.guide / 10) * 10} h^{−1} Mpc` : null, guideX = P.x;
  if (guideT && fa1 > 0) text(g, guideT, guideX, P0.y - 0.6 * u, { px: TEXT.min * u, color: T.muted, alpha: fa1, italic: true, role: 'label' });
  if (M.yNote) {
    const left = guideT ? guideX + measure(g, guideT, TEXT.min * u, true) + 2.0 * u : P.x;
    const forms = M.yNotes || [M.yNote], yN = forms.find(f => P.x + P.w - measure(g, f, TEXT.min * u, true) >= left) || forms[forms.length - 1];
    text(g, yN, P.x + P.w, P0.y - 0.6 * u, { px: TEXT.min * u, color: T.muted, alpha: a, italic: true, align: 'right', role: 'label' }); caveatNote(env, yN, a);
  }
  const galaxies = M.panels.filter(p => !p.lya);
  if (Array.isArray(env.notes) && a > 0) env.notes.push({ text: `the panels, DESI's samples: ${M.panels.map(p => `${plainPanel(p.label)} = ${p.label}`).join('; ')}`, shown: false, optional: true });
  const lya = st.lya, schA = [0, 0];
  const lyaPanel = lya >= 1 ? op : smooth(clamp01(lya)) * op;
  let slot = 0;
  const lyaQ = [];
  M.panels.forEach((p, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const Q = { x: P.x + c * (pw + gx), y: P.y + r * (ph + gy), w: pw, h: ph };
    if (p.lya) lyaQ.push({ Q, bottom: r === rows - 1 });
    if (p.lya && slot < 2 && schA[slot] > 0 && lya < 1) pixelPairs(env, Q, slot, schA[slot], lya);
    if (p.lya) slot++;
    const pa = p.lya ? lyaPanel : stagger(st.pts, galaxies.indexOf(p), galaxies.length, 0.6) * op;
    if (!(pa > 0)) return;
    panel(env, Q, p, M, pa, smooth(st.fit) * op, r === rows - 1);
  });
  if (lyaQ.length && lyaPanel > 0 && M.lyaYLabel) {
    const x0 = Math.min(...lyaQ.map(q => q.Q.x)), x1 = Math.max(...lyaQ.map(q => q.Q.x + q.Q.w)), q0 = lyaQ[0].Q;
    const yb = q0.y + q0.h + 0.8 * u + 1.0 * TEXT.tick * u + 1.25 * TEXT.min * u + (lyaQ[0].bottom ? 1.35 * TEXT.min * u : 0) + 0.4 * u;
    text(g, M.lyaYLabel, (x0 + x1) / 2, yb, { px: TEXT.min * u, color: T.muted, alpha: lyaPanel, align: 'center', italic: true, role: 'label' });
  }
  placeholderStamp(env, P, M, a);
  F.draw();
}

const PAIRS = [[[0, 5], [1, 8]], [[1, 12], [2, 10]], [[0, 15], [2, 18]], [[1, 3], [2, 6]]];
const QPAIRS = [[[0, 8], 1], [[2, 14], 1], [[1, 6], 0], [[1, 16], 2]];
function pixelPairs__(env, Q, which, a, lya) {
  const { g, u, T } = env;
  const xs = [0.2, 0.5, 0.8].map(f => Q.x + f * Q.w), yTop = Q.y + 0.16 * Q.h, yBot = Q.y + 0.96 * Q.h;
  const n = 20, pix = j => yTop + 1.2 * u + (j / (n - 1)) * (yBot - yTop - 1.2 * u);
  g.save(); g.globalAlpha *= a;
  xs.forEach((x, l) => {
    g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.16 * u);
    g.beginPath(); g.moveTo(x, yTop); g.lineTo(x, yBot); g.stroke();
    for (let j = 0; j < n; j++) {
      const f = 0.5 + 0.5 * Math.sin(1.9 * j + 2.7 * l);
      g.globalAlpha = a * (0.25 + 0.75 * f * f); g.strokeStyle = T.ink; g.lineWidth = Math.max(1.5, 0.3 * u);
      g.beginPath(); g.moveTo(x - 0.5 * u, pix(j)); g.lineTo(x + 0.5 * u, pix(j)); g.stroke();
    }
    g.globalAlpha = a; g.strokeStyle = T.ink; g.lineWidth = Math.max(1.5, 0.28 * u);
    g.beginPath(); g.moveTo(x - 0.6 * u, yTop); g.lineTo(x + 0.6 * u, yTop); g.moveTo(x, yTop - 0.6 * u); g.lineTo(x, yTop + 0.6 * u); g.stroke();
  });
  g.restore();
  const list = which === 0 ? PAIRS.map(([p0, p1]) => [[xs[p0[0]], pix(p0[1])], [xs[p1[0]], pix(p1[1])]])
    : QPAIRS.map(([p0, q]) => [[xs[p0[0]], pix(p0[1])], [xs[q], yTop]]);
  const t0 = which === 0 ? 0.08 : 0.36;
  list.forEach((seg, i) => {
    const sa = a * smooth(clamp01((lya - t0 - 0.04 * i) / 0.06));
    if (sa > 0) polyline(g, seg, T.accent, env, { lw: 0.26, alpha: sa });
  });
  text(g, which === 0 ? 'pixel pairs (schematic)' : 'pixel–quasar pairs', Q.x, Q.y - 1.2 * u, { px: TEXT.min * u, color: T.accent, alpha: a, italic: true, role: 'label' });
}
function pixelPairs(...args) { return tagged(args[0].g, 'lya', () => pixelPairs__(...args)); }

function panel__(env, Q, p, M, pa, fa, bottom) {
  const { g, u, T } = env;
  const X = scale(M.x.range[0], M.x.range[1], Q.x, Q.x + Q.w);
  let lo, hi;
  if (p.ylim) [lo, hi] = p.ylim;
  else {
    const v = [];
    p.x.forEach((x, k) => { if (x >= M.x.range[0] && x <= M.x.range[1]) v.push(p.y[k] - (p.e ? p.e[k] : 0), p.y[k] + (p.e ? p.e[k] : 0)); });
    lo = Math.min(...v); hi = Math.max(...v);
    const pd = 0.1 * (hi - lo); lo -= pd; hi += pd;
  }
  const dipNote = p.lya && /QSO/.test(p.label);
  if (dipNote) lo -= 1.5 * (hi - lo);
  const Y = scale(lo, hi, Q.y + Q.h, Q.y);
  const sty = tracerStyle(T, p.tracer);
  const c = p.lya ? T.accent : T.name === 'dark' ? sty.color : T.ink;
  axes(g, Q, { x: { s: X, label: '', bare: !bottom } }, env, { alpha: pa });
  clipped(g, Q, () => {
    if (M.guide && fa > 0) refLine(g, X(M.guide), Q.y + 1.0 * u, X(M.guide), Q.y + Q.h, env, { alpha: fa, color: T.muted, lw: 0.3 });
    if (lo < 0 && hi > 0) refLine(g, Q.x, Y(0), Q.x + Q.w, Y(0), env, { alpha: 0.35 * pa, dash: false, lw: 0.1 });
    if (p.fx && p.fy && fa > 0) {
      const end = M.x.range[0] + fa * (M.x.range[1] - M.x.range[0]);
      const pts = p.fx.map((x, k) => [x, p.fy[k]]).filter(([x]) => x <= end + 4).map(([x, y]) => [X(x), Y(y)]);
      polyline(g, pts, p.lya ? T.accent : T.muted, env, { lw: 0.3, alpha: Math.min(1, pa) });
    }
    p.x.forEach((x, k) => {
      if (x < M.x.range[0] - 2 || x > M.x.range[1] + 2) return;
      if (p.e) errorBar(g, X(x), Y(p.y[k]), { ylo: Y(p.y[k] - p.e[k]), yhi: Y(p.y[k] + p.e[k]) }, c, env, { alpha: 0.8 * pa, lw: 0.2, cap: 0 });
      glyph(g, p.lya ? 'circle-open' : 'circle', X(x), Y(p.y[k]), (p.lya ? 0.6 : 0.34) * u, c, env, { alpha: pa, lw: p.lya ? 0.4 : undefined });
    });
  });
  const name = plainPanel(p.label);
  const pm = TEXT.min * u, dipW = Math.max(...['a dip:', 'the forest', 'absorbs'].map(L => measure(g, L, pm, true)));
  if (dipNote) irisBlock(g, { x: Q.x + Q.w - 0.5 * u - dipW, y: Q.y + Q.h - 0.6 * u - 2 * 1.15 * pm - 0.8 * pm, w: dipW, h: 2 * 1.15 * pm + 1.05 * pm }, pm, () =>
    ['a dip:', 'the forest', 'absorbs'].forEach((L, j) => text(g, L, Q.x + Q.w - 0.5 * u, Q.y + Q.h - 0.6 * u - (2 - j) * 1.15 * pm, { px: pm, color: T.muted, alpha: pa, align: 'right', italic: true, role: 'label' })));
  const yN = Q.y - 1.2 * u - (p.z !== null ? 1.15 * pm : 0);
  irisBlock(g, { x: Q.x, y: yN - 0.8 * pm, w: Math.max(measure(g, name, pm), p.z !== null ? measure(g, `z = ${p.z}`, pm) : 0), h: Q.y - 1.2 * u + 0.25 * pm - (yN - 0.8 * pm) }, pm, () => {
    text(g, name, Q.x, yN, { px: pm, color: p.lya ? T.accent : T.ink, alpha: pa, role: 'label' });
    if (p.z !== null) text(g, `z = ${p.z}`, Q.x, Q.y - 1.2 * u, { px: pm, color: p.lya ? T.accent : T.ink, alpha: pa, role: 'label' });
  });
  if (bottom) text(g, M.x.label, Q.x + Q.w, Q.y + Q.h + 0.8 * u + 1.0 * TEXT.tick * u + 1.25 * TEXT.min * u, { px: TEXT.min * u, color: T.muted, alpha: pa, align: 'right', role: 'axis' });
}
function panel(...args) { return tagged(args[0].g, 'lya', () => panel__(...args)); }
const NAME2 = 3.5;
function plainPanel(label) {
  const L = String(label);
  if (/Ly/.test(L)) return L.replace(/\bQSO\b/g, 'quasars');
  return plainName(L.split(/\s*·/)[0], null);
}
const XI_DROP = 0.8;
