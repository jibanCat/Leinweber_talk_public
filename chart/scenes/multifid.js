import { TEXT, axes, scale, text, polyline, glyph, clamp01, smooth, measure, wrap, tagged, fmt } from '../kit.js';

const MF_DESIGN = false, MF_CREDITS = false;
const TRAIN_LF = '#8C96A4';
const ERR = { detailed: 0.1, mf: 0.135, cheap: 0.86 };

export function mfLayout(env, A) {
  const { u } = env;
  const W = A.x1 - A.x0, colW = 0.36 * W, px = TEXT.min * u, p3 = TEXT.label * u;
  const gap = 3.0 * u, s = Math.floor((colW - gap) / 2);
  const top0 = A.top + 2.4 * u;
  const D = { x: A.x0 + colW + 15.0 * u, y: A.plotTop, w: A.x1 - 1.5 * u - (A.x0 + colW + 15.0 * u), h: A.plotBottom - A.plotTop };
  return { colW, gap, s, top0, px, p3, D };
}

function star(g, x, y, r, colour, a) {
  if (!(a > 0)) return;
  g.save(); if (g.__mark) g.__mark('point'); g.globalAlpha *= a; g.fillStyle = colour;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.45 * r : r;
    if (i) g.lineTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang)); else g.moveTo(x + rr * Math.cos(ang), y + rr * Math.sin(ang));
  }
  g.closePath(); g.fill(); g.restore();
}

function patch(env, vals, n, x, y, s, a) {
  const { g, T } = env;
  if (!(a > 0)) return;
  const c = s / n, L = 12;
  g.save(); g.globalAlpha *= a; g.fillStyle = T.ink;
  for (let r = 0; r < n; r++) {
    let j = 0;
    while (j < n) {
      const lv = Math.round((vals[r * n + j] / 255) * L);
      let k = j + 1;
      while (k < n && Math.round((vals[r * n + k] / 255) * L) === lv) k++;
      if (lv > 0) { g.globalAlpha = a * 0.9 * (lv / L); g.fillRect(x + j * c, y + r * c, (k - j) * c + 0.5, c + 0.5); }
      j = k;
    }
  }
  g.restore();
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.16 * env.u); g.strokeRect(x, y, s, s); g.restore();
}

const TURN_CANVAS = new Map();
const rgbOf = hex => { const h = String(hex).replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export function turnView(TT, spin, zout) {
  const nA = TT.yaw.length, f = clamp01(spin) * (nA - 1), i0 = Math.min(nA - 1, Math.floor(f)), i1 = Math.min(nA - 1, i0 + 1);
  const half = 0.25 * TT.box + (0.52 * Math.max(TT.h, TT.w) - 0.25 * TT.box) * smooth(clamp01(zout));
  const yaw = (TT.yaw[0] + (TT.yaw[nA - 1] - TT.yaw[0]) * clamp01(spin)) * Math.PI / 180, tilt = TT.tilt * Math.PI / 180;
  return { i0, i1, t: f - i0, half, yaw, tilt, cx: (TT.w - 1) / 2, cy: (TT.h - 1) / 2 };
}
function turnPatch(env, TT, vals, x, y, s, V, a) {
  const { g, T, u } = env;
  if (!(a > 0)) return;
  const side = Math.max(2, Math.ceil(2 * V.half)), fs = TT.h * TT.w;
  g.save(); if (g.__mark) g.__mark('turn'); g.beginPath(); g.rect(x, y, s, s); g.clip();
  if (typeof document !== 'undefined' && g.drawImage) {
    let c = TURN_CANVAS.get(side);
    if (!c) { c = document.createElement('canvas'); c.width = c.height = side; TURN_CANVAS.set(side, c); }
    const cg = c.getContext('2d'), im = cg.createImageData(side, side), d = im.data, P = rgbOf(T.ground), K = rgbOf(T.ink);
    const o0 = V.i0 * fs, o1 = V.i1 * fs, x0 = V.cx - V.half, y0 = V.cy - V.half, k = (2 * V.half) / side;
    for (let r = 0, q = 0; r < side; r++) {
      const fy = Math.round(y0 + (r + 0.5) * k), inY = fy >= 0 && fy < TT.h;
      for (let col = 0; col < side; col++, q += 4) {
        const fx = Math.round(x0 + (col + 0.5) * k);
        let v = 0;
        if (inY && fx >= 0 && fx < TT.w) { const j = fy * TT.w + fx; v = (vals[o0 + j] + (vals[o1 + j] - vals[o0 + j]) * V.t) / 255; }
        const al = 0.9 * v;
        d[q] = P[0] + (K[0] - P[0]) * al; d[q + 1] = P[1] + (K[1] - P[1]) * al; d[q + 2] = P[2] + (K[2] - P[2]) * al; d[q + 3] = 255;
      }
    }
    cg.putImageData(im, 0, 0);
    g.globalAlpha *= a; g.imageSmoothingEnabled = true; g.drawImage(c, x, y, s, s);
  } else { g.globalAlpha *= a; g.fillStyle = T.ground; g.fillRect(x, y, s, s); }
  g.restore();
  const hb = TT.box / 2, ct = Math.cos(V.tilt), st = Math.sin(V.tilt), cy = Math.cos(V.yaw), sy = Math.sin(V.yaw);
  const corner = (i, j, kk) => { const aa = j * cy + kk * sy, k1 = -j * sy + kk * cy, b = i * ct + k1 * st;
    return [x + ((V.cx + aa) - (V.cx - V.half)) * (s / (2 * V.half)), y + ((V.cy - b) - (V.cy - V.half)) * (s / (2 * V.half))]; };
  const C8 = [];
  for (const i of [-hb, hb]) for (const j of [-hb, hb]) for (const kk of [-hb, hb]) C8.push(corner(i, j, kk));
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  g.save(); g.beginPath(); g.rect(x, y, s, s); g.clip();
  for (const [p0, p1] of E) polyline(g, [C8[p0], C8[p1]], T.hair, env, { lw: 0.14, alpha: a * 0.8 });
  g.restore();
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.16 * u); g.strokeRect(x, y, s, s); g.restore();
}

export function drawMultifid(env, A, st, a) {
  const { g, u, T } = env;
  const M = env.charts.multifid, Tr = env.charts.emulator_train;
  if (!M || !(a > 0)) return;
  const { colW, gap, s, top0, px, p3, D } = mfLayout(env, A);
  const dia = clamp01(st.dia || 0), mfp = clamp01(st.mfp || 0);
  const ph = (t, a0, a1) => smooth(clamp01((t - a0) / (a1 - a0)));

  const pA = a * (st.pat === undefined ? 1 : st.pat);
  const TT = env.charts.multifid_turn ? env.charts.multifid_turn.turn : null, V = TT ? turnView(TT, st.spin || 0, st.zout || 0) : null;
  const cap = wrap(g, M.patch.caption, colW, px, true);
  cap.forEach((t, j) => text(g, t, A.x0, top0 + 0.8 * px + j * 1.2 * px, { px, color: T.muted, alpha: pA, italic: true, role: 'label' }));
  const yTitle = top0 + 0.8 * px + (cap.length - 1) * 1.2 * px + 0.25 * px + 0.5 * px + 0.8 * p3;
  const yP = yTitle + 0.25 * p3 + 1.0 * u;
  const xs = [A.x0, A.x0 + s + gap];
  const per = M.perRun;
  [['a cheap run', M.patch.cheap, M.patch.labelCheap, per.cheap], ['a detailed run', M.patch.detailed, M.patch.labelDetailed, per.detailed]].forEach(([title, vals, part, cost], i) => {
    text(g, title, xs[i], yTitle, { px: p3, color: T.ink, alpha: pA, role: 'label' });
    if (TT) turnPatch(env, TT, i ? TT.detailed : TT.cheap, xs[i], yP, s, V, pA);
    else patch(env, vals, M.patch.n, xs[i], yP, s, pA);
    const yl = yP + s + 1.0 * u + 0.8 * px;
    text(g, part, xs[i], yl, { px, color: T.muted, alpha: pA, role: 'label' });
    text(g, `≈ ${cost.toLocaleString('en-GB')} node-hours`, xs[i], yl + 1.2 * px, { px, color: T.muted, alpha: pA, role: 'label' });
  });
  const yLab2 = yP + s + 1.0 * u + 0.8 * px + 1.2 * px;

  const dA = MF_DESIGN ? a * ph(mfp, 0, 0.3) : 0;
  if (Tr && dA > 0) {
    const S = Tr.sims.filter(q => q.Ap !== null && q.ns !== null);
    const box = { x: A.x0, y: yLab2 + 0.25 * px + 1.6 * u, w: 0.42 * colW, h: 0 };
    box.h = Math.min(0.62 * box.w, A.footBottom - 0.8 * TEXT.foot * u - 4.0 * u - box.y);
    const ax = S.map(q => q.Ap), ns = S.map(q => q.ns);
    const X = scale(Math.min(...ax), Math.max(...ax), box.x + 1.2 * u, box.x + box.w - 1.2 * u), Y = scale(Math.min(...ns), Math.max(...ns), box.y + box.h - 1.2 * u, box.y + 1.2 * u);
    g.save(); g.globalAlpha *= dA; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.16 * u); g.strokeRect(box.x, box.y, box.w, box.h); g.restore();
    for (const q of S) if (!q.hf) glyph(g, 'circle', X(q.Ap), Y(q.ns), 0.42 * u, TRAIN_LF, env, { alpha: dA });
    for (const q of S) if (q.hf) star(g, X(q.Ap), Y(q.ns), 1.25 * u, T.ink, dA);
    const kx = box.x + box.w + 2.0 * u, sw = 3.0 * u;
    let ky = box.y + 0.8 * px + 0.4 * u;
    glyph(g, 'circle', kx + 1.0 * u, ky - 0.32 * px, 0.42 * u, TRAIN_LF, env, { alpha: dA });
    text(g, `${M.runs.cheap} cheap runs`, kx + sw, ky, { px, color: T.ink, alpha: dA, role: 'label' });
    ky += 1.25 * px;
    star(g, kx + 1.0 * u, ky - 0.32 * px, 1.25 * u, T.ink, dA);
    const kl = wrap(g, `${M.runs.detailed} detailed runs, at cheap runs' settings`, A.x0 + colW - (kx + sw), px);
    kl.forEach((t, j) => text(g, t, kx + sw, ky + j * 1.2 * px, { px, color: T.ink, alpha: dA, role: 'label' }));
  }

  const axA = a * ph(dia, 0, 0.35);
  const cMax = Math.max(...Object.values(M.points).map(q => q.cost)) / 1e6 * 1.09;
  const CY = scale(0, cMax, D.y + D.h, D.y), EX = scale(0, 1, D.x, D.x + D.w);
  const yt = []; for (let v = 0; v <= cMax + 1e-9; v += 2) yt.push({ v, label: fmt(v, 0) });
  axes(g, D, { x: { s: EX, label: M.words.error, ticks: [] }, y: { s: CY, label: M.words.cost, ticks: yt } }, env, { alpha: axA });
  text(g, M.words.schematic, D.x, D.y + D.h + 0.8 * u + 1.0 * px, { px, color: T.muted, alpha: axA, italic: true, role: 'label' });
  const P = M.points, at = id => [EX(1 - ERR[id]), CY(P[id].cost / 1e6)];
  const mill = c => `≈ ${fmt(c / 1e6, c >= 1e6 ? 1 : 2)} M`;
  const r = 1.05 * u;
  const hA = a * ph(dia, 0.35, 0.65);
  if (hA > 0) {
    const [x, y] = at('detailed');
    glyph(g, 'circle-open', x, y, r, T.ink, env, { alpha: hA, lw: 0.3 });
    text(g, `${P.detailed.runs}: ${mill(P.detailed.cost)}`, x - r - 1.4 * u, y + 0.3 * p3, { px: p3, color: T.ink, alpha: hA, align: 'right', role: 'label' });
    text(g, 'never run', x - r - 1.4 * u, y + 0.3 * p3 + 1.15 * px + 0.25 * p3, { px, color: T.muted, alpha: hA, italic: true, align: 'right', role: 'label' });
  }
  const lA = a * ph(dia, 0.65, 1);
  if (lA > 0) {
    const [x, y] = at('cheap');
    glyph(g, 'circle', x, y, r, TRAIN_LF, env, { alpha: lA });
    const yb = Math.min(y + 0.3 * p3, D.y + D.h - 0.25 * p3 - p3 / 3 - 1);
    text(g, `${P.cheap.runs}: ${mill(P.cheap.cost)}`, x + r + 1.4 * u, yb, { px: p3, color: T.ink, alpha: lA, role: 'label' });
  }
  const mA = a * ph(mfp, 0.3, 0.5), nA = a * ph(mfp, 0.42, 0.6), bG = ph(mfp, 0.58, 0.78), bA = a * ph(mfp, 0.72, 0.88), crA = a * ph(mfp, 0.86, 1);
  const [xm, ym] = at('mf'), [xd, yd] = at('detailed');
  if (mA > 0) tagged(g, 'his', () => star(g, xm, ym, 1.7 * u, T.accent, mA));
  if (nA > 0) tagged(g, 'his', () => text(g, `my multi-fidelity emulator: ${mill(P.mf.cost)}`, xm + 1.7 * u, ym - 1.7 * u - 1.0 * u - 0.25 * p3, { px: p3, color: T.accent, alpha: nA, align: 'right', role: 'label' }));
  if (bG > 0 && a > 0) {
    const y0 = yd + r + 0.8 * u, y1 = ym - 1.7 * u - 1.0 * u - 1.05 * p3 - 0.8 * u, yb = y0 + (y1 - y0) * bG;
    tagged(g, 'his', () => {
      polyline(g, [[xd, y0], [xd, yb]], T.accent, env, { lw: 0.22, alpha: a, dash: [0.9, 0.7] });
      polyline(g, [[xd - 0.8 * u, y0], [xd + 0.8 * u, y0]], T.accent, env, { lw: 0.22, alpha: a });
      if (bG >= 1) polyline(g, [[xd - 0.8 * u, y1], [xd + 0.8 * u, y1]], T.accent, env, { lw: 0.22, alpha: a });
    });
    if (bA > 0) tagged(g, 'his', () => text(g, `${M.ratioSaid} less`, xd - 1.6 * u, (y0 + y1) / 2 + 0.3 * p3, { px: p3, color: T.accent, alpha: bA, align: 'right', role: 'label' }));
  }
  if (MF_CREDITS && crA > 0 && M.words.credit) text(g, M.words.credit, D.x, D.y + D.h + 0.8 * u + 1.0 * px + 1.35 * p3 + 1.2 * px, { px, color: T.muted, alpha: crA, italic: true, role: 'label' });
  if (MF_CREDITS && crA > 0 && M.words.creditForest) text(g, M.words.creditForest, D.x, D.y + D.h + 0.8 * u + 1.0 * px + 1.35 * p3 + 2.4 * px, { px, color: T.muted, alpha: crA, italic: true, role: 'label' });
}
