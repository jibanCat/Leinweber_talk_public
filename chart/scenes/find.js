import { TEXT, axes, scale, text, measure, polyline, smooth, clamp01, tagged } from '../kit.js';
import { area, footLayout, unavailable, panels, waveArrow, WAVE } from './common.js';
import { drawDlaP1d } from './dlap1d.js';

const fz = v => v.toFixed(4), fn = v => v.toFixed(2);
const fp = v => (Number.isInteger(v) ? v.toFixed(1) : v.toPrecision(3));

export function drawFind(env, st) {
  const op0 = st.op === undefined ? 1 : st.op;
  const mock = st.mock || 0, op = op0 * (1 - smooth(clamp01(mock / 0.45)));
  if (mock > 0) drawDlaP1d(env, { ...st, mock: smooth(clamp01((mock - 0.55) / 0.45)) }, op0);
  if (!(op > 0)) return;
  const M = env.charts.find;
  const { u } = env;
  const A = area(env);
  if (!M || !M.examples.length) { unavailable(env, panels(env, A).solo, 'find', st.spec * op); return; }
  const ex = M.examples.length > 1 ? (st.ex || 0) : 0;
  const shown = [1 - smooth(clamp01(ex / 0.45)), smooth(clamp01((ex - 0.55) / 0.45))];
  const mu = clamp01(st.mu || 0), runA = smooth(clamp01((mu - 0.5) / 0.5)), dataA = 1 - smooth(clamp01(mu / 0.5));
  const feet = M.examples.map((E, i) => footLayout(env, A, [{ foot: E.foot, alpha: (i < 2 ? shown[i] : 0) * op * (i === 0 && E.foot0 ? runA : 1) }], 4));
  if (M.examples[0].foot0) feet.push(footLayout(env, A, [{ foot: M.examples[0].foot0, alpha: shown[0] * op * dataA }], 4));
  const plotBottom = Math.min(A.plotBottom, ...feet.map(F => F.top - WAVE.block * u));
  const left = A.x0 + 7.5 * u, split = A.x0 + 0.7 * (A.x1 - A.x0);
  const P = { x: left, y: A.plotTop, w: split - left, h: plotBottom - A.plotTop };
  const B = { x: split + 4 * u, y: A.plotTop, w: A.x1 - split - 4 * u, h: P.h };
  M.examples.slice(0, 2).forEach((E, i) => {
    const ea = shown[i] * op;
    if (!(ea > 0)) return;
    const parts = i === 0 ? { spec: st.spec, mu: smooth(st.mu), fit: smooth(st.fit) } : { spec: 1, mu: 1, fit: 1 };
    example(env, E, P, B, parts, ea, i === 0);
  });
  feet.forEach(F => F.draw());
}

function example__(env, E, P, B, parts, a, lean = false) {
  const { g, u, T } = env;
  const X = scale(E.range[0], E.range[1], P.x, P.x + P.w), Y = scale(E.y[0], E.y[1], P.y + P.h, P.y);
  axes(g, P, { x: { s: X, label: '' }, y: { s: Y, label: E.fluxUnit || 'flux' } }, env, { alpha: a * parts.spec });
  waveArrow(env, P, a * parts.spec);
  const inX = w => w >= E.range[0] && w <= E.range[1];
  g.save(); g.beginPath(); g.rect(P.x, P.y, P.w, P.h); g.clip();
  const sa = a * parts.spec;
  if (sa > 0) {
    g.save(); g.globalAlpha *= 0.9 * sa; g.strokeStyle = T.ink; g.lineWidth = Math.max(1, 0.13 * u); g.lineJoin = 'round'; if (g.__mark) g.__mark('line'); 
    g.beginPath();
    let pen = false;
    for (let i = 0; i < E.wave.length; i++) {
      if (!E.good[i] || !inX(E.wave[i])) { pen = false; continue; }
      const x = X(E.wave[i]), y = Y(E.flux[i]);
      if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
    }
    g.stroke(); g.restore();
  }
  if (parts.mu > 0) polyline(g, E.gp.wave.map((w, i) => [X(w), Y(E.gp.mu[i])]), T.accent, env, { lw: FIND_MU_LW, alpha: a * parts.mu, dash: FIND_MU_DASH });
  if (parts.fit > 0) polyline(g, E.gp.wave.map((w, i) => [X(w), Y(E.gp.model[i])]), T.accent, env, { lw: 0.36, alpha: a * parts.fit });
  g.restore();
  text(g, lean ? `a DESI DR1 quasar at z = ${E.z.toFixed(3)}` : E.title, P.x + 1.0 * u, P.y + 1.0 * u + 0.8 * TEXT.min * u, { px: TEXT.min * u, color: T.muted, alpha: sa, italic: true, role: 'label' });
  if (parts.fit > 0) {
    for (const ab of E.absorbers) {
      const lam = E.lyaNm * (1 + ab.z), x = X(lam);
      if (x < P.x || x > P.x + P.w) continue;
      let top = P.y + P.h;
      for (let i = 0; i < E.wave.length; i++) if (E.good[i] && Math.abs(E.wave[i] - lam) < 4) top = Math.min(top, Y(E.flux[i]));
      for (let i = 0; i < E.gp.wave.length; i++) if (Math.abs(E.gp.wave[i] - lam) < 4) top = Math.min(top, Y(E.gp.mu[i]), Y(E.gp.model[i]));
      const y1 = Math.max(P.y + 6.5 * u, top - 1.0 * u);
      g.save(); g.globalAlpha *= a * parts.fit; g.strokeStyle = T.accent; g.lineWidth = Math.max(1, 0.25 * u);
      g.beginPath(); g.moveTo(x, y1); g.lineTo(x, y1 - 1.8 * u); g.stroke(); g.restore();
      text(g, 'DLA', x, y1 - 2.4 * u, { px: TEXT.min * u, color: T.accent, alpha: a * parts.fit, align: 'center', role: 'label' });
    }
  }
  if (lean) leanBlock(env, E, B, parts, a); else block(env, E, B, parts, a);
}
function example(...args) { return tagged(args[0].g, 'his', () => example__(...args)); }

function leanBlock__(env, E, B, parts, a) {
  const { g, u, T } = env;
  const px = TEXT.min * u, lead = 1.22 * px;
  let y = B.y + 0.8 * TEXT.label * u;
  const swatch = (dash, colour, al) => {
    g.save(); g.globalAlpha *= al; g.strokeStyle = colour; g.lineWidth = Math.max(1.5, (dash ? 0.28 : 0.34) * u);
    if (dash) g.setLineDash([1.0 * u, 0.6 * u]);
    g.beginPath(); g.moveTo(B.x, y - 0.32 * px); g.lineTo(B.x + 3.2 * u, y - 0.32 * px); g.stroke(); g.restore();
  };
  const ma = a * parts.mu, fa = a * parts.fit;
  if (ma > 0) {
    swatch(true, T.accent, ma);
    text(g, 'expected without a DLA', B.x + 4.2 * u, y, { px, color: T.accent, alpha: ma, role: 'label' });
    text(g, '(forest averaged in)', B.x + 4.2 * u, y + 1.15 * px, { px, color: T.muted, alpha: ma, italic: true, role: 'label' });
    y += 1.15 * px;
  }
  y += lead + 0.6 * u;
  if (fa > 0) {
    swatch(false, T.accent, fa);
    text(g, E.models === 'two' ? 'with two DLAs: the best model' : 'with a DLA: the best model', B.x + 4.2 * u, y, { px, color: T.accent, alpha: fa, role: 'label' });
  }
}
function leanBlock(...args) { return tagged(args[0].g, 'his', () => leanBlock__(...args)); }

function block__(env, E, B, parts, a) {
  const { g, u, T } = env;
  const px = TEXT.min * u, tp = TEXT.label * u, lead = 1.22 * px;
  let y = B.y + 0.8 * tp;
  const title = ['my GP DLA finder', `(${E.finder})`];
  title.forEach(L => { text(g, L, B.x, y, { px: tp, color: T.accent, alpha: a * parts.mu, role: 'label' }); y += 1.18 * tp; });
  if (E.experimental) { text(g, 'experimental mode', B.x, y, { px, color: T.accent, alpha: a * parts.mu, italic: true, role: 'label' }); y += lead; }
  y += 0.9 * u;
  const key = (dash, colour, words, al) => {
    if (al > 0) {
      g.save(); g.globalAlpha *= al; g.strokeStyle = colour; g.lineWidth = Math.max(1.5, (dash ? 0.28 : 0.34) * u);
      if (dash) g.setLineDash([1.0 * u, 0.6 * u]);
      g.beginPath(); g.moveTo(B.x, y - 0.32 * px); g.lineTo(B.x + 3.2 * u, y - 0.32 * px); g.stroke(); g.restore();
      text(g, words, B.x + 4.2 * u, y, { px, color: colour === T.accent ? T.accent : T.ink, alpha: al, role: 'label' });
    }
    y += lead;
  };
  key(true, T.muted, 'GP prior mean', a * parts.mu);
  key(false, T.accent, E.models === 'two' ? 'best two-absorber model' : 'best one-absorber model', a * parts.fit);
  y += 0.9 * u;
  const fa = a * parts.fit;
  const rows = [['', 'z_DLA', 'log N_HI', T.muted, true]];
  E.absorbers.forEach((ab, i) => rows.push([i ? '' : 'my finder', fz(ab.z), fn(ab.logN), T.accent, false]));
  E.desi.forEach((ab, i) => rows.push([i ? '' : 'DESI DR1 CNN+GP', fz(ab.z), fn(ab.logN), T.ink, false]));
  const w0 = Math.max(...rows.map(r => measure(g, r[0], px))), w1 = Math.max(...rows.map(r => measure(g, r[1], px, r[4])));
  const c1 = B.x + w0 + 2.0 * u, c2 = c1 + w1 + 2.0 * u;
  for (const [c0t, c1t, c2t, colour, it] of rows) {
    if (c0t) text(g, c0t, B.x, y, { px, color: colour, alpha: fa, role: 'label' });
    text(g, c1t, c1, y, { px, color: colour, alpha: fa, italic: it, role: it ? 'axis' : 'label' });
    text(g, c2t, c2, y, { px, color: colour, alpha: fa, italic: it, role: it ? 'axis' : 'label' });
    y += lead;
  }
  y += 0.9 * u;
  const n = E.models === 'two' ? 2 : 1;
  if (E.pModel !== null) { text(g, `P(M_${n} | data) = ${fp(E.pModel)}`, B.x, y, { px, color: T.ink, alpha: fa, role: 'label' }); y += lead; }
  if (E.dlnZ !== null) { text(g, `ln Z_1 − ln Z_0 = ${E.dlnZ.toFixed(0)}`, B.x, y, { px, color: T.ink, alpha: fa, role: 'label' }); y += lead; }
  text(g, n === 2 ? 'M_2: two absorbers, against one or none' : 'M_1: one absorber, against none (M_0)', B.x, y, { px, color: T.muted, alpha: fa, italic: true, role: 'label' });
}
function block(...args) { return tagged(args[0].g, 'his', () => block__(...args)); }
const FIND_MU_LW = 0.36, FIND_MU_DASH = [1.3, 0.5];
