import { TEXT, text, stamp, scale, fillLoops, strokeLoops, clipped, placeLabels, smooth, measure, tracerStyle, polyline, glyph, hatch, refLine, plate, ellipseLoop, axes, fmt, fillHis, lerp, tagged, irisBlock, irisGate, niceTicks, logTicks } from '../kit.js';
import { placeContourLabels } from '../labels.js';
import { plain } from '../plain.js';

export const SAFE = { top: 17.5, bottom: 96, left: 8, right: 8, tagW: 16, plotBottom: 72 };

export function area(env, safe = env.safe || SAFE) {
  const { W, H, u } = env;
  return {
    x0: (safe.left / 100) * W, x1: W - (safe.right / 100) * W,
    top: (safe.top / 100) * H, footBottom: (safe.bottom / 100) * H, tagLeft: W - (safe.tagW / 100) * W,
    plotTop: (safe.top / 100) * H + Math.max(7.0, 2.0 * TEXT.label) * u, plotBottom: (safe.plotBottom / 100) * H,
  };
}

export function panels(env, A) {
  const { u } = env;
  const yTicks = 7.5 * u;
  const top = A.plotTop, h = A.plotBottom - A.plotTop;
  const solo = { x: A.x0 + yTicks, y: top, w: A.x1 - 8 * u - (A.x0 + yTicks), h };
  const mid = (A.x0 + A.x1) / 2;
  const left = { x: A.x0 + yTicks, y: top, w: mid - 5 * u - (A.x0 + yTicks), h };
  const right = { x: mid + 5 * u + yTicks, y: top, w: A.x1 - 2 * u - (mid + 5 * u + yTicks), h };
  return { solo, left, right };
}

export function scales(m, P) {
  const X = scale(m.x.range[0], m.x.range[1], P.x, P.x + P.w, m.x.log);
  const Y = scale(m.y.range[0], m.y.range[1], P.y + P.h, P.y, m.y.log);
  return { X, Y };
}

export const FOOT_ROWS = 1;
export function footLayout(env, A, paras) {
  const { g, u, T } = env;
  const px = TEXT.foot * u;
  const x = A.x0, maxW = A.tagLeft - 2 * u - A.x0;
  const list = paras.filter(p => p && p.foot);
  const colourOf = L => (/^PLACEHOLDER/.test(L) ? T.stamp : T.foot || T.muted);
  const fits = L => measure(g, L, px, true) <= maxW;
  const cand = [];
  for (const para of list) for (const L of [...para.foot.lines, ...(para.extra || []).filter(Boolean)]) cand.push({ L, para });
  for (const para of list) for (const L of para.foot.optional || []) cand.push({ L, para, optional: true });
  for (const para of list) for (const L of para.foot.caveats || []) cand.push({ L, para, caveat: true });
  let row = null;
  for (const para of list) {
    const lines = [...para.foot.lines, ...(para.extra || []).filter(Boolean)];
    const cav0 = (para.foot.caveats || []).join(' · ');
    if (cav0) {
      const cavs = [cav0, ...[].concat(para.foot.caveatsShort || [])];
      const ph = lines.filter(L => /^PLACEHOLDER/.test(L));
      const tails = [...ph, ...[].concat(para.foot.short || []), ...lines.filter(L => !/^PLACEHOLDER/.test(L))].filter(Boolean);
      let cav = null, t = null;
      for (const cv of cavs) { if (!fits(cv)) continue; const tt = tails.map(L => `${cv} · ${L}`).find(fits); if (tt) { cav = cv; t = tt; break; } }
      if (!cav) cav = cavs.find(fits) || cavs[cavs.length - 1];
      row = { text: t || cav, para, parts: [cav0, t ? t.slice(cav.length + 3) : null].filter(Boolean), caveat: true };
      break;
    }
    const L = lines.find(fits) || [].concat(para.foot.short || []).find(fits) || null;
    if (L) { row = { text: L, para, parts: [L] }; break; }
  }
  const top = A.footBottom - 0.8 * px;
  return {
    top, rows: row ? 1 : 0,
    draw() {
      const a = row ? (row.para.alpha === undefined ? 1 : row.para.alpha) : 0;
      if (row && a > 0) text(g, row.text, x, A.footBottom, { px, color: colourOf(row.text), alpha: a, italic: true, role: 'foot' });
      if (Array.isArray(env.notes)) for (const c of cand) if ((c.para.alpha === undefined ? 1 : c.para.alpha) > 0)
        env.notes.push({ text: c.L.replace(/\\_/g, '_'), shown: !!row && row.para === c.para && row.parts.includes(c.L), optional: !!c.optional, caveat: !!c.caveat });
    },
  };}
export function fitBand(env, P, x0, x1, a, o = {}) {
  if (!(a > 0)) return;
  const xa = Math.max(P.x, x0), xb = Math.min(P.x + P.w, x1), y0 = o.top === undefined ? P.y : o.top;
  hatch(env.g, xa, y0, xb - xa, P.y + P.h - y0, env, { alpha: a });
  for (const x of [x0, x1]) if (x > P.x && x < P.x + P.w && !(o.later || []).includes(x)) refLine(env.g, x, y0, x, P.y + P.h, env, { alpha: 0.9 * a, color: env.T.muted });
}
export function edgeAround(env, x, y0, y1, boxes, a) {
  if (!(a > 0)) return;
  const pad = 0.5 * env.u, cuts = boxes.filter(b => b.x - pad <= x && b.x + b.w + pad >= x).map(b => [b.y - pad, b.y + b.h + pad]).sort((p, q) => p[0] - q[0]);
  let y = y0;
  for (const [c0, c1] of cuts) { if (c0 > y) refLine(env.g, x, y, x, Math.min(c0, y1), env, { alpha: 0.9 * a, color: env.T.muted }); y = Math.max(y, c1); }
  if (y < y1) refLine(env.g, x, y, x, y1, env, { alpha: 0.9 * a, color: env.T.muted });
}
export { plate };
export const PLANE = {
  x: [0.20, 0.60], y: [-2.41, -2.05], step: 0.05, xLabel: plain('plane.x', 'amplitude, Δ²_L'), yLabel: plain('plane.y', 'slope, n_eff'),
  hisDash95: null, altDash95: [1.0, 0.6], altDash68: [0.5, 0.45], dots: false,
  planckDash: [1.0, 0.7],
  hisName: ['KODIAQ-SQUAD', 'Ho et al. 2026'],
  hisNameB: ['KODIAQ-SQUAD', 'Ho et al. 2026'],
  compressed: 'nine redshifts compressed to z = 3',
  altName: plain('plane.alt', 'HCDs: same strength at all z'), dlaName: 'DESI DR1 P1D, HCD: only DLAs',
  priorLabel: plain('plane.prior', ["near its prior's edge:", 'sensitive to prior truncation']),
  planckBand: plain('plane.planck', "Planck's amplitude ± 1σ"),
  hang: 1.4,
};
export const slateOf = T => (T.name === 'dark' ? '#AEB7C4' : '#4A5464');
export const planeGrey = T => (T.name === 'dark' ? '#AEB7C4' : '#5B6472');
export const planeColour = (T, kind) => (kind === 'planck' ? T.ink : kind === 'desi' ? planeGrey(T) : T.accent);
const planeTicks = ([lo, hi]) => { const out = []; for (let i = Math.ceil(lo / PLANE.step - 1e-9); i * PLANE.step <= hi + 1e-9; i++) { const v = +(i * PLANE.step).toFixed(2); out.push({ v, label: fmt(v, 2) }); } return out; };
export function planeFrame(env, Q, a, o = {}) {
  const X = scale(PLANE.x[0], PLANE.x[1], Q.x, Q.x + Q.w), Y = scale(PLANE.y[0], PLANE.y[1], Q.y + Q.h, Q.y);
  const yt = planeTicks(PLANE.y);
  axes(env.g, Q, { x: { s: X, label: PLANE.xLabel, ticks: planeTicks(PLANE.x) }, y: { s: Y, label: '', ticks: yt } }, env, { alpha: a, yTickAlpha: o.yTickAlpha });
  yTitle(env, Q, PLANE.yLabel, yt.map(t => t.label), { alpha: a * (o.yTickAlpha === undefined ? 1 : o.yTickAlpha) });
  slopeGlyph(env, Q, PLANE.yLabel, o.glyph === undefined ? a : o.glyph);
  return { X, Y };
}
const outerOf = L => L[L.length - 1];
const ell = (e, d2) => [ellipseLoop(e.x, e.y, e.sx, e.sy, e.rho, d2)];
export function planeSeries(env, Q, X, Y, S) {
  const { g, T } = env;
  clipped(g, Q, () => {
    for (const k of ['planck', 'desi']) if (S[k] && S[k].a > 0) fillLoops(g, ell(S[k].e, 2.3), X, Y, planeColour(T, k), T.fill68 * S[k].a);
    tagged(g, 'his', () => { if (S.his && S.his.a > 0) fillLoops(g, S.his.loops[0], X, Y, T.accent, fillHis(T) * S.his.a); });
    for (const k of ['planck', 'desi']) if (S[k] && S[k].a > 0) {
      const c = planeColour(T, k);
      const dash = k === 'planck' ? PLANE.planckDash : undefined;
      strokeLoops(g, ell(S[k].e, 6.18), X, Y, c, S[k].a, T.line95, env, dash); strokeLoops(g, ell(S[k].e, 2.3), X, Y, c, 0.9 * S[k].a, T.line68, env, dash);
    }
    tagged(g, 'his', () => {
      if (S.alt && S.alt.a > 0) { strokeLoops(g, outerOf(S.alt.loops), X, Y, T.accent, S.alt.a, T.line95, env, PLANE.altDash95); strokeLoops(g, S.alt.loops[0], X, Y, T.accent, 0.9 * S.alt.a, T.line68, env, PLANE.altDash68); }
      if (S.his && S.his.a > 0) { strokeLoops(g, outerOf(S.his.loops), X, Y, T.accent, S.his.a, T.line95, env, PLANE.hisDash95); strokeLoops(g, S.his.loops[0], X, Y, T.accent, 0.9 * S.his.a, T.line68, env); }
    });
  });
}
export function hisName(env, Q, X, Y, loops, a, lines = PLANE.hisName) {
  const { g, u, T } = env;
  const top = Math.min(...outerOf(loops).flat().map(q => Y(q[1]))), x = Q.x + PLANE.hang * u;
  const p1 = TEXT.label * u, p2 = TEXT.min * u, n = lines.length;
  const bl = [top - 0.7 * u - 0.25 * p2];
  for (let i = n - 2; i >= 1; i--) bl.unshift(bl[0] - 1.15 * p2);
  bl.unshift(bl[0] - (0.25 * p1 + 0.95 * p2));
  const w = Math.max(...lines.map((L, i) => measure(g, L, i ? p2 : p1)));
  const box = { x, y: bl[0] - 0.8 * p1, w, h: bl[n - 1] + 0.25 * p2 - (bl[0] - 0.8 * p1) };
  irisBlock(g, box, p1, () => tagged(g, 'his', () => lines.forEach((L, i) => text(g, L, x, bl[i], { px: i ? p2 : p1, color: T.accent, alpha: a, role: 'label' }))));
  return { box, anchor: { x: Q.x, y: top } };
}
export function priorLabel(env, nameBox, a) {
  const { g, u, T } = env, px = TEXT.min * u;
  const b2 = nameBox.y - 0.5 * u - 0.25 * px, b1 = b2 - 1.15 * px;
  const w = Math.max(...PLANE.priorLabel.map(L => measure(g, L, px, true)));
  const box = { x: nameBox.x, y: b1 - 0.8 * px, w, h: b2 + 0.25 * px - (b1 - 0.8 * px) };
  irisBlock(g, box, px, () => PLANE.priorLabel.forEach((L, j) => text(g, L, nameBox.x, j ? b2 : b1, { px, color: T.muted, alpha: a, italic: true, role: 'label' })));
  return box;
}
export function planeArrow(env, X, Y, from, to, grow, colour, a, o = {}) {
  if (!(a > 0) || !(grow > 0)) return;
  const { g, u, T } = env;
  const p0 = [X(from[0]), Y(from[1])], p1 = [lerp(p0[0], X(to[0]), grow), lerp(p0[1], Y(to[1]), grow)];
  const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), hl = 1.4 * u;
  const head = [[p1[0] - hl * Math.cos(ang - 0.45), p1[1] - hl * Math.sin(ang - 0.45)], p1, [p1[0] - hl * Math.cos(ang + 0.45), p1[1] - hl * Math.sin(ang + 0.45)]];
  if (o.casing) for (const pts of [[p0, p1], head]) polyline(g, pts, T.ground, env, { lw: 0.34 + 2 * 0.45, alpha: a });
  polyline(g, [p0, p1], colour, env, { lw: 0.34, alpha: a });
  polyline(g, head, colour, env, { lw: 0.34, alpha: a });
}
export function refNames(env, X, Y, planck, desi, cols, a0) {
  const { g, u } = env, px = TEXT.min * u, boxes = [];
  const aP = typeof a0 === 'number' ? a0 : a0.planck, aD = typeof a0 === 'number' ? a0 : a0.desi;
  const ext = e => { const L = ellipseLoop(e.x, e.y, e.sx, e.sy, e.rho, 6.18); return { x0: Math.min(...L.map(q => X(q[0]))), x1: Math.max(...L.map(q => X(q[0]))), y1: Math.max(...L.map(q => Y(q[1]))) }; };
  if (desi) {
    const E = ext(desi), w = measure(g, desi.label, px), xc = (E.x0 + E.x1) / 2, yb = E.y1 + 0.6 * u + 0.8 * px;
    if (aD > 0) text(g, desi.label, xc, yb, { px, color: cols.desi, alpha: aD, align: 'center', role: 'label' });
    boxes.push({ x: xc - w / 2, y: yb - 0.8 * px, w, h: 1.05 * px });
  }
  if (planck) {
    const E = ext(desi || planck), w = measure(g, planck.label, px), xr = E.x0 - 0.8 * u, yb = Y(planck.y) + 0.35 * px;
    if (aP > 0) text(g, planck.label, xr, yb, { px, color: cols.planck, alpha: aP, align: 'right', role: 'label' });
    boxes.push({ x: xr - w, y: yb - 0.8 * px, w, h: 1.05 * px });
  }
  return boxes;
}
export function caveatNote(env, L, a) {
  if (Array.isArray(env.notes) && a > 0) env.notes.push({ text: L, shown: true, optional: false, caveat: true });
}
export const turns = t => ({ out: 1 - smooth(Math.min(1, Math.max(0, t / 0.5))), in: smooth(Math.min(1, Math.max(0, (t - 0.5) / 0.5))) });
export const plotBottomAbove = (env, A, footTop) => Math.min(A.plotBottom, footTop - 9.6 * env.u);
function wrapLine(g, L, maxW, px) {
  const out = [];
  let line = '';
  for (const word of String(L).split(' ')) {
    const t = line ? `${line} ${word}` : word;
    if (line && measure(g, t, px, true) > maxW) { out.push(line); line = word; } else line = t;
  }
  out.push(line);
  return out;
}

export function yTitle(env, P, label, ticks, o = {}) {
  const { g, u, T } = env, tp = TEXT.label * u, px = TEXT.tick * u, a = o.alpha === undefined ? 1 : o.alpha;
  const wMax = typeof ticks === 'number' ? ticks : Array.isArray(ticks) ? ticks.reduce((m, t) => Math.max(m, measure(g, t, px)), 0) : 0;
  const xb = o.x !== undefined ? o.x : P.x - 0.8 * u - 0.5 * u - wMax - (0.7 + (o.gap || 0)) * u - 0.25 * tp;
  const yc = o.yc !== undefined ? o.yc : P.y + P.h / 2, w = measure(g, label, tp);
  const box = { x: xb - 0.8 * tp, y: yc - w / 2, w: 1.05 * tp, h: w };
  if (!(a > 0)) return box;
  const fix = g.__irisFix;
  if (g.__iris) g.__irisFix = irisGate(g.__iris, box, tp);
  g.save(); g.translate(xb, yc); g.rotate(-Math.PI / 2);
  text(g, label, 0, 0, { px: tp, color: T.ink, alpha: a, align: 'center', role: 'axis' });
  g.restore();
  g.__irisFix = fix;
  return box;
}
export function tickLabels(s, log = false) {
  if (log) return logTicks(...s.domain).map(t => t.label);
  const n = niceTicks(Math.min(...s.domain), Math.max(...s.domain));
  return n.ticks.map(v => fmt(v, n.decimals));
}

export function unavailable(env, P, name, alpha) {
  if (!(alpha > 0)) return;
  const { g, u, T } = env;
  g.save(); g.globalAlpha *= alpha; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.15 * u); g.setLineDash([u, u]);
  g.strokeRect(P.x, P.y, P.w, P.h); g.restore();
  text(g, `chart data not available: ${name}`, P.x + P.w / 2, P.y + P.h / 2, { px: TEXT.label * u, color: T.muted, alpha, align: 'center', italic: true, role: 'card' });
}

export function placeholderStamp(env, P, model, alpha) {
  if (model && model.placeholder && alpha > 0) stamp(env.g, P, 'PLACEHOLDER', env, { alpha });
}

export function drawContour(env, P, X, Y, series, colour, fillAlpha, alpha, o = {}) {
  if (!(alpha > 0)) return;
  const { g, T } = env;
  clipped(g, P, () => {
    const inner = series.loops[0], outer = series.loops[series.loops.length - 1];
    if (o.fillOuter) fillLoops(g, outer, X, Y, colour, o.fillOuter * alpha);
    if (fillAlpha > 0) fillLoops(g, inner, X, Y, colour, fillAlpha * alpha);
    const k = o.thick || 1;
    if (o.noLines) return;
    if (series.loops.length > 1) strokeLoops(g, outer, X, Y, colour, alpha, T.line95 * k, env);
    strokeLoops(g, inner, X, Y, colour, 0.9 * alpha, T.line68 * k, env);
  });
}

const RAMP = ['#8C96A4', '#3A4452'];
const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
export function contourColour(T, s, i, n) {
  if (s.highlight) return T.accent;
  if (s.combined) return T.ink;
  if (T.name === 'paper') return mix(RAMP[0], RAMP[1], n > 1 ? i / (n - 1) : 1);
  return tracerStyle(T, s.tracer).color;
}

export function contourLabels(env, owner, R, P, list, obstacles = [], m = owner, ghosts = []) {
  const { g, u } = env;
  const S0 = scales(m, R), S1 = scales(m, P);
  const rel = L => L.map(d => ({ p: [S0.X(d[0]) - R.x, S0.Y(d[1]) - R.y], d }));
  const items = [...list.map(it => ({ key: it.s.id, text: it.text, px: it.px, toward: it.toward,
    outer: (it.s.loops[it.s.loops.length - 1] || []).map(rel), inner: (it.s.loops[0] || []).map(rel) })),
    ...ghosts.map(s2 => ({ key: `ghost:${s2.id}`, ghost: true, text: '', px: 1, outer: (s2.loops[s2.loops.length - 1] || []).map(rel), inner: (s2.loops[0] || []).map(rel) }))];
  const key = `${R.w.toFixed(1)}|${R.h.toFixed(1)}|${u.toFixed(4)}|${list.map(it => `${it.s.id}:${it.text}:${it.px.toFixed(2)}`).join(',')}|${ghosts.map(s2 => s2.id).join(',')}|${obstacles.map(b => [b.x, b.y, b.w, b.h].map(v => v.toFixed(1)).join(':')).join(',')}`;
  const pos = placeContourLabels(g, owner, key, items, R, u, obstacles);
  for (const it of list) {
    const p = pos[it.s.id];
    if (!p || !(it.alpha > 0)) continue;
    const ax = S1.X(p.data[0]), ay = S1.Y(p.data[1]);
    const box = { x: ax + p.off[0], y: ay + p.off[1], w: p.box.w, h: p.box.h };
    if (p.leader) {
      const bx = Math.max(box.x, Math.min(ax, box.x + box.w)), by = Math.max(box.y, Math.min(ay, box.y + box.h));
      g.save(); if (g.__mark) g.__mark('leader'); g.globalAlpha *= 0.75 * it.alpha; g.strokeStyle = it.color; g.lineWidth = Math.max(1, 0.14 * u);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.restore();
    }
    text(g, it.text, box.x, box.y + 0.8 * it.px, { px: it.px, color: it.color, alpha: it.alpha, role: 'label' });
  }
}

export function commonPrefix(labels) {
  const split = t => { const out = []; let depth = 0, cur = ''; for (let i = 0; i < t.length; i++) {
    const c = t[i]; if (c === '(' || c === '[') depth++; if (c === ')' || c === ']') depth--;
    if (depth === 0 && t.startsWith(' + ', i)) { out.push(cur); cur = ''; i += 2; continue; } cur += c; }
    out.push(cur); return out; };
  const toks = labels.map(split);
  let n = 0;
  while (toks.every(t => t.length > n && t[n] === toks[0][n])) n++;
  if (toks.some(t => t.length === n)) n--;
  if (n <= 0 || labels.length < 2) return { caption: null, labels };
  return { caption: toks[0].slice(0, n).join(' + '), labels: toks.map(t => `+ ${t.slice(n).join(' + ')}`) };
}

export const boxGap = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));
export function pointLabelChoices(env, pts, R, avoid = []) {
  const { g, u } = env;
  const boxes = pts.map(q => ({ x: q.x - (q.big ? 1.05 : 0.72) * u - 0.8 * u, y: q.top - 0.8 * u, w: 2 * (q.big ? 1.05 : 0.72) * u + 1.6 * u, h: q.bottom - q.top + 1.6 * u }));
  const placed = [], out = {};
  const hit = (b, o, pad) => b.x < o.x + o.w + pad && o.x < b.x + b.w + pad && b.y < o.y + o.h + pad && o.y < b.y + b.h + pad;
  const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  pts.forEach((q, i) => {
    const px = (q.big ? TEXT.title : TEXT.label) * u, lines = String(q.label).split('\n'), lead = 1.15 * px;
    const w = Math.max(...lines.map(L => measure(g, L, px))), h = 1.05 * px + (lines.length - 1) * lead;
    const up = q.top - q.y - 1.0 * u - (lines.length - 1) * lead, down = q.bottom - q.y + 0.95 * px + 0.8 * u;
    const cands = [[0, up, 'center'], [0, down, 'center'], [0, up - 1.15 * px, 'center'], [0, down + 1.15 * px, 'center'],
      [1.4 * u, up, 'left'], [-1.4 * u, up, 'right'], [1.4 * u, down, 'left'], [-1.4 * u, down, 'right'],
      [1.6 * u, 0.35 * px, 'left'], [-1.6 * u, 0.35 * px, 'right']];
    let pick = null, least = null;
    for (const [dx, dy, align] of cands) {
      const x0 = align === 'center' ? q.x + dx - w / 2 : align === 'right' ? q.x + dx - w : q.x + dx;
      const b = { x: x0, y: q.y + dy - 0.8 * px, w, h };
      if (b.y < R.y - 1 * u || b.y + h > R.y + R.h || b.x + w > R.x + R.w + 6 * u || b.x < R.x - 6 * u) continue;
      const dOwn = boxGap(b, boxes[i]);
      if (boxes.some((o, j) => j !== i && boxGap(b, o) < dOwn)) continue;
      const others = [...boxes.filter((_, j) => j !== i), ...avoid];
      const padL = Math.max(0.4 * u, 0.35 * px);
      const cost = others.reduce((s, o) => s + area(b, { x: o.x - 0.4 * u, y: o.y - 0.4 * u, w: o.w + 0.8 * u, h: o.h + 0.8 * u }), 0)
        + placed.reduce((s, o) => s + area(b, { x: o.x - padL, y: o.y - 0.4 * u, w: o.w + 2 * padL, h: o.h + 0.8 * u }), 0);
      if (cost === 0) { pick = { dx, dy, align, b }; break; }
      if (!least || cost < least.cost) least = { dx, dy, align, b, cost };
    }
    if (!pick) pick = least || { dx: 0, dy: up, align: 'center', b: { x: q.x - w / 2, y: q.y + up - 0.8 * px, w, h } };
    placed.push(pick.b);
    out[q.id] = { dx: pick.dx, dy: pick.dy, align: pick.align, px };
  });
  return out;
}

export const STRIP = [[0, [112, 132, 164]], [0.35, [124, 156, 152]], [0.62, [200, 194, 166]], [1, [196, 152, 92]]];
export function stripColour(t) {
  const x = Math.min(1, Math.max(0, t));
  let i = 1;
  while (i < STRIP.length - 1 && STRIP[i][0] < x) i++;
  const [a0, c0] = STRIP[i - 1], [a1, c1] = STRIP[i], f = (x - a0) / (a1 - a0);
  return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(',')})`;
}
export const WAVE = { drop: 5.0, h: 0.75, head: 1.6, block: 10.6, words: ['bluer', 'redder'] };
export const waveRow = (env, P) => P.y + P.h + WAVE.drop * env.u + 1.3 * env.u + 0.9 * env.u + 0.8 * TEXT.min * env.u;
export function waveArrow(env, P, a, o = {}) {
  const { g, u, T, dpr } = env;
  const y0 = P.y + P.h + (o.drop === undefined ? WAVE.drop : o.drop) * u, h = (o.h === undefined ? WAVE.h : o.h) * u;
  const step = Math.max(1, Math.round(2 * (dpr || 1))), px = TEXT.min * u, yw = waveRow(env, P);
  for (const [w, wa] of o.words || [['observed wavelength [nm]', 1]]) if (wa > 0 && w) text(g, w, P.x + P.w / 2, yw, { px, color: T.muted, alpha: a * wa, align: 'center', italic: true, role: 'axis' });
  const sa = (o.arrow === undefined ? 1 : o.arrow) * a;
  if (!(sa > 0)) return yw;
  for (let x = P.x; x < P.x + P.w; x += step) {
    const al = o.alphaAt ? o.alphaAt(x, Math.min(step, P.x + P.w - x)) : 1;
    if (!(al > 0)) continue;
    g.save(); g.globalAlpha *= sa * al; g.fillStyle = stripColour((x - P.x) / P.w); g.fillRect(x, y0, Math.min(step, P.x + P.w - x), h); g.restore();
  }
  g.save(); g.globalAlpha *= sa; g.fillStyle = stripColour(1);
  g.beginPath(); g.moveTo(P.x + P.w + WAVE.head * u, y0 + h / 2); g.lineTo(P.x + P.w, y0 + h / 2 - 0.9 * u); g.lineTo(P.x + P.w, y0 + h / 2 + 0.9 * u); g.closePath(); g.fill(); g.restore();
  text(g, WAVE.words[0], P.x, yw, { px, color: T.muted, alpha: sa, italic: true, role: 'axis' });
  text(g, WAVE.words[1], P.x + P.w, yw, { px, color: T.muted, alpha: sa, align: 'right', italic: true, role: 'axis' });
  return yw;
}

export const GLYPH_WORDS = ['tilt → slope', 'height → amplitude'];
export function slopeGlyph(env, P, title, a) {
  const { g, u, T } = env;
  const px = TEXT.min * u;
  const gx = P.x + 0.4 * u, gy = P.y - 7.6 * u;
  const W = Math.max(...GLYPH_WORDS.map(L => measure(g, L, px, true)));
  const box = { x: gx, y: gy, w: 10.2 * u + W, h: 7.0 * u };
  if (!(a > 0)) return box;
  const cx = t => gx + 0.3 * u + 8.4 * u * t, cy = t => gy + 0.5 * u + 4.6 * u * (0.25 * t + 0.75 * t * t);
  const curve = Array.from({ length: 25 }, (_, i) => [cx(i / 24), cy(i / 24)]);
  const t0 = 0.45, dx = cx(t0), dy = cy(t0), sl = (4.6 * (0.25 + 1.5 * t0)) / 8.4, hw = 3.3 * u;
  const base = gy + 6.6 * u;
  polyline(g, [[gx, base], [gx + 9.0 * u, base]], T.hair, env, { lw: 0.16, alpha: a });
  polyline(g, curve, T.muted, env, { lw: 0.24, alpha: a });
  polyline(g, [[dx, dy + 0.6 * u], [dx, base]], T.ink, env, { lw: 0.16, alpha: a, dash: [0.5, 0.4] });
  polyline(g, [[dx - hw, dy - sl * hw], [dx + hw, dy + sl * hw]], T.ink, env, { lw: 0.3, alpha: a });
  glyph(g, 'circle', dx, dy, 0.5 * u, T.ink, env, { alpha: a });
  irisBlock(g, { x: gx + 10.2 * u, y: gy + 2.7 * u - 0.8 * px, w: W, h: 3.7 * u + 1.05 * px }, px, () => {
    text(g, GLYPH_WORDS[0], gx + 10.2 * u, gy + 2.7 * u, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
    text(g, GLYPH_WORDS[1], gx + 10.2 * u, gy + 6.4 * u, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  });
  return box;
}

export function awaiting(env, x, y, what) {
  if (!env.test) return;
  text(env.g, `awaiting DB: ${what}`, x, y, { px: TEXT.min * env.u, color: env.T.muted, alpha: 1, italic: true, role: 'card' });
}

export { placeLabels, smooth, measure };
