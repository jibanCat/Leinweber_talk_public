import { TEXT, axes, scale, text, measure, smooth, clamp01, tagged, stagger, refLine, irisBlock } from '../kit.js';
import { area, panels, footLayout, unavailable, placeholderStamp, caveatNote } from './common.js';
import { plain } from '../plain.js';

export const SCALES_NAMES = {
  cmb_anisotropy: { at: [40, 500] },
  cmb_lensing: { at: [1550, 8.5], align: 'left' },
  photo_z_galaxies: { at: [720, 0.075] },
  weak_lensing: { at: [15, 0.09] },
  lyman_alpha_forest: { at: [0.82, 3.0], align: 'left', px: 'label' },
  hline_dark_ages: { at: [25, 70] },
  hline_cosmic_dawn: { at: [0.63, 17.3] },
  uv_luminosity_function: { at: [8.6, 8.5], align: 'right' },
  dwarf_galaxies: { at: [0.37, 0.024] },
  dark_subhalo_lensing_streams: { at: [0.079, 0.08] },
};
export const SCALES_WORDS = { y: 'redshift z', yGloss: 'early times at the top', x: plain('scales.x', 'comoving scale [Mpc]'),
  large: '← large scales', small: 'small scales →', bao: 'BAO' };
const BOTTOM = 0.82;
const BAO_ROW_Z = 8.5;

export function drawScales(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const M = env.charts.scales;
  const A = area(env);
  if (!M) { unavailable(env, panels(env, A).solo, 'scales', op); return; }
  const { g, u, T, H } = env;
  const F = footLayout(env, A, [{ foot: M.foot, alpha: op * (st.ax ?? 1) }]);
  A.plotBottom = Math.min(BOTTOM * H, F.top - 9.6 * u);
  const P = panels(env, A).solo;
  const X = scale(M.x.range[0], M.x.range[1], P.x, P.x + P.w, true), Y = scale(M.y.range[0], M.y.range[1], P.y + P.h, P.y, true);
  const a = op * (st.ax ?? 1);
  const num = v => (v >= 1 ? String(v) : String(v));
  axes(g, P, { x: { s: X, label: '', ticks: M.x.ticks.map(v => ({ v, label: num(v) })) }, y: { s: Y, label: SCALES_WORDS.y, ticks: M.y.ticks.map(v => ({ v, label: num(v) })) } }, env, { alpha: a });
  const px = TEXT.min * u, tp = TEXT.label * u;
  text(g, SCALES_WORDS.yGloss, P.x, P.y - 1.0 * tp, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  if (M.caveat) { text(g, M.caveat, P.x + P.w, P.y - 1.0 * tp, { px, color: T.muted, alpha: a, italic: true, align: 'right', role: 'label' }); caveatNote(env, M.caveat, a); }
  const yx = P.y + P.h + 0.8 * u + 1.0 * TEXT.tick * u + 1.35 * tp;
  text(g, SCALES_WORDS.large, P.x, yx, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  text(g, M.x.label, P.x + P.w / 2, yx, { px: tp, color: T.ink, alpha: a, align: 'center', role: 'axis' });
  text(g, SCALES_WORDS.small, P.x + P.w, yx, { px, color: T.muted, alpha: a, italic: true, align: 'right', role: 'label' });
  boxes(env, P, X, Y, M, st, op);
  placeholderStamp(env, P, M, a);
  F.draw();
}

function rectOf(X, Y, b) { const x0 = X(b.s[1]), x1 = X(b.s[0]), y0 = Y(b.z[1]), y1 = Y(b.z[0]); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
function boxes__(env, P, X, Y, M, st, op) {
  const { g, u, T } = env;
  const prec = M.boxes.filter(b => b.tier === 'precision' && !b.lya), lya = M.boxes.find(b => b.lya), dm = M.boxes.filter(b => b.tier === 'frontier');
  const groups = [];
  for (const b of prec) { const gr = b.group && groups.find(q => q.group === b.group); if (gr) gr.parts.push(b); else groups.push({ group: b.group, parts: [b], id: b.id }); }
  const n = groups.length;
  const draw = (outline, al, colour, lw, dash, wash) => {
    if (!(al > 0)) return;
    g.save(); g.globalAlpha *= al;
    if (wash) { g.save(); g.globalAlpha *= wash; g.fillStyle = colour; g.beginPath(); outline(); g.fill(); g.restore(); }
    g.strokeStyle = colour; g.lineWidth = Math.max(1.5, lw * u); if (dash) g.setLineDash(dash.map(v => v * u)); if (g.__mark) g.__mark('line');
    g.beginPath(); outline(); g.stroke(); g.restore();
  };
  const rectPath = R => () => { g.moveTo(R.x, R.y); g.lineTo(R.x + R.w, R.y); g.lineTo(R.x + R.w, R.y + R.h); g.lineTo(R.x, R.y + R.h); g.closePath(); };
  const unionPath = parts => () => {
    const [p, q] = parts.map(b => rectOf(X, Y, b)).sort((r1, r2) => r1.y - r2.y);
    const bot = Math.max(p.y + p.h, q.y + q.h), xl = Math.min(p.x, q.x), xr = Math.max(p.x + p.w, q.x + q.w);
    g.moveTo(xl, bot); g.lineTo(p.x, bot); g.lineTo(p.x, p.y); g.lineTo(p.x + p.w, p.y); g.lineTo(p.x + p.w, q.y);
    g.lineTo(xr, q.y); g.lineTo(xr, bot); g.closePath();
  };
  const names = [];
  groups.forEach((gr, i) => {
    const al = op * stagger(st.prec || 0, i, n, 0.5);
    const path = gr.parts.length > 1 ? unionPath(gr.parts) : rectPath(rectOf(X, Y, gr.parts[0]));
    draw(path, al, T.ink, 0.24, null, 0.05);
    names.push({ id: gr.id, lines: gr.parts[0].lines, al, colour: T.ink, italic: false });
  });
  const la = op * smooth(st.lya || 0);
  if (lya && la > 0) {
    const R = rectOf(X, Y, lya);
    draw(rectPath(R), la, T.accent, 0.34, null, 0.10);
    names.push({ id: lya.id, lines: lya.lines, al: la, colour: T.accent, italic: false });
    if (M.bao) {
      const xb = X(M.bao.rd), ba = la * smooth(clamp01(((st.lya || 0) - 0.4) / 0.4));
      g.save(); g.globalAlpha *= ba; g.strokeStyle = T.ink; g.lineWidth = Math.max(1.5, 0.3 * u); if (g.__mark) g.__mark('line');
      g.beginPath(); g.moveTo(xb, R.y - 1.0 * u); g.lineTo(xb, R.y + R.h); g.stroke(); g.restore();
      text(g, SCALES_WORDS.bao, xb - 0.6 * u, Y(BAO_ROW_Z) + 0.35 * TEXT.min * u, { px: TEXT.min * u, color: T.ink, alpha: ba, align: 'right', role: 'label' });
    }
  }
  dm.forEach((b, i) => {
    const al = op * stagger(st.dm || 0, i, dm.length, 0.5);
    draw(rectPath(rectOf(X, Y, b)), al, T.muted, 0.2, [0.8, 0.5], 0.03);
    names.push({ id: b.id, lines: b.lines, al, colour: T.muted, italic: true });
  });
  const px = TEXT.min * u, tx = P.x + P.w - 1.0 * u, ty = P.y + 1.2 * u + 0.8 * px;
  const pa = op * smooth(clamp01((st.prec || 0) / 0.3)), da = op * smooth(clamp01((st.dm || 0) / 0.3));
  if (M.tiers.precision && pa > 0) text(g, M.tiers.precision, tx, ty, { px, color: T.ink, alpha: pa, align: 'right', role: 'label' });
  if (M.tiers.frontier && da > 0) text(g, M.tiers.frontier, tx, ty + 1.25 * px, { px, color: T.muted, alpha: da, italic: true, align: 'right', role: 'label' });
  for (const nm of names) {
    const L = SCALES_NAMES[nm.id];
    if (!L || !(nm.al > 0)) continue;
    const npx = (L.px === 'label' ? TEXT.label : TEXT.min) * u, lead = 1.15 * npx;
    const x = X(L.at[0] * (M.x.unit || 1)), yc = Y(L.at[1]), h = (nm.lines.length - 1) * lead;
    const al = L.align || 'center';
    const w = Math.max(...nm.lines.map(s => measure(g, s, npx, nm.italic)));
    const bx = al === 'left' ? x : al === 'right' ? x - w : x - w / 2;
    irisBlock(g, { x: bx, y: yc - h / 2 - 0.8 * npx + 0.35 * npx, w, h: h + 1.05 * npx }, npx, () =>
      nm.lines.forEach((s, j) => text(g, s, x, yc - h / 2 + j * lead + 0.35 * npx, { px: npx, color: nm.colour, alpha: nm.al, italic: nm.italic, align: al, role: 'label' })));
  }
}
function boxes(...args) { return tagged(args[0].g, 'lya', () => boxes__(...args)); }
