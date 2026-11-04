import { TEXT, axes, refLine, glyph, errorBar, tracerStyle, lerpRect, smooth, stagger, text, measure, placeLabels, clamp01, scale, polyline, lineObstacles, plainName, fillAlphaFor, hatch, tagged, irisBlock, lerp, clipped, num } from '../kit.js';
import { LW } from '../../program.js';
import { plain } from '../plain.js';
import { area, panels, scales, footLayout, plotBottomAbove, unavailable, placeholderStamp, drawContour, contourColour, contourLabels, pointLabelChoices, awaiting, turns, caveatNote, yTitle } from './common.js';

export function drawBao(env, st) {
  const op = st.op === undefined ? 1 : st.op;
  const D = env.charts.distances, O = env.charts.omh_grid;
  const A = area(env);
  const dOut = smooth(clamp01((st.split || 0) / 0.45)), oIn = smooth(clamp01(((st.split || 0) - 0.55) / 0.45));
  const da = st.dist * op * (1 - dOut), oa = op * oIn;
  const Fd = footLayout(env, A, [D && { foot: D.plain ? D.plain.foot : D.foot, alpha: da }]);
  const Fo = footLayout(env, A, [O && { foot: O.footOne || O.foot, alpha: (st.omh || 0) * oa }]);
  A.plotBottom = plotBottomAbove(env, A, Math.min(Fd.top, Fo.top));
  const P = panels(env, A).solo;
  if (D && D.plain) { A.plotBottom = stackBottom(env, A, Fd.top); drawStack(env, A, D, null, { a: da, top: 1, pts: st.pts, lya: st.lya }); }
  else if (D) drawDistances(env, A, P, P, D, { a: da, pts: st.pts, lya: st.lya, op: op * (1 - dOut) });
  else unavailable(env, P, 'distances', da);
  if (st.omh > 0 && oa > 0) {
    if (O) omh(env, A, P, P, O, st, oa);
    else unavailable(env, P, 'omh_grid', st.omh * oa);
  }
  Fd.draw(); Fo.draw();
}

function distances__(env, A, P, Rref, D, st, op, split) {
  drawDistances(env, A, P, Rref, D, { a: st.dist * op, pts: st.pts, lya: st.lya, op });
}
function distances(...args) { return tagged(args[0].g, 'lya', () => distances__(...args)); }

function drawDistances__(env, A, P, Rref, D, o) {
  const { g, u, T } = env;
  const a = o.a, op = o.op, anchor = smooth(o.anchor || 0);
  if (!(a > 0)) return;
  const { X, Y } = scales(D, P);
  axes(g, P, { x: { s: X, label: D.x.label }, y: { s: Y, label: D.y.label } }, env, { alpha: a, yTitleLift: A.yTitleLift });
  if (D.top && D.top.ticks.length) {
    const px = TEXT.tick * u, [z0, z1] = D.x.range;
    const inside = D.top.ticks.filter(t => t.x >= Math.min(z0, z1) && t.x <= Math.max(z0, z1)).map(t => ({ ...t, w: measure(g, t.label, px) }));
    let kept = inside;
    for (const step of [1, 2, 3, 4, 5]) {
      const sub = inside.filter((t, i) => (Number.isFinite(+t.label) ? Math.round(+t.label) % step === 0 : i % step === 0));
      const ok = sub.every((t, i) => i === 0 || Math.abs(X(t.x) - X(sub[i - 1].x)) >= (t.w + sub[i - 1].w) / 2 + 1.2 * u);
      kept = sub;
      if (ok) break;
    }
    kept = [...kept].sort((p, q) => q.x - p.x);
    g.save(); g.globalAlpha *= a; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.16 * u);
    g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(P.x + P.w, P.y);
    for (const t of kept) { g.moveTo(X(t.x), P.y); g.lineTo(X(t.x), P.y - 0.8 * u); }
    g.stroke(); g.restore();
    for (const t of kept) text(g, t.label, X(t.x), P.y - 1.4 * u, { px, color: T.muted, alpha: a, align: 'center', role: 'tick' });
    if (kept.length) {
      const far = kept[0], Xr = scales(D, Rref).X;
      const fits = Xr(far.x) + far.w / 2 + 1.0 * u + measure(g, D.top.label, px, true) <= Rref.x + Rref.w + 1.5 * u;
      const unit = (/\[(.+?)\]/.exec(D.top.label) || [])[1];
      text(g, fits || !unit ? D.top.label : unit, X(far.x) + far.w / 2 + 1.0 * u, P.y - 1.4 * u, { px, color: T.muted, alpha: a, italic: true, role: 'axis' });
    }
  }
  if (D.reference) refLine(g, P.x, Y(D.reference.y), P.x + P.w, Y(D.reference.y), env, { alpha: 0.8 * a });

  const S0 = scales(D, Rref);
  const refBox = D.reference ? [{ x: Rref.x, y: S0.Y(D.reference.y) - 0.3 * u, w: Rref.w, h: 0.6 * u }] : [];
  const choice = pointLabelChoices(env, D.points.map(p => ({ id: p.id, label: p.label, big: p.highlight, x: S0.X(p.x), y: S0.Y(p.y),
    top: p.err ? Math.min(S0.Y(p.err[0]), S0.Y(p.err[1])) : S0.Y(p.y), bottom: p.err ? Math.max(S0.Y(p.err[0]), S0.Y(p.err[1])) : S0.Y(p.y) })), Rref, refBox);
  const gal = D.points.filter(p => !p.highlight);
  const pale = 1 - (1 - T.pale) * anchor;
  for (const p of D.points) {
    const lya = p.highlight;
    const pa = lya ? smooth(o.lya) * op : stagger(o.pts, gal.indexOf(p), gal.length, 0.5) * op * pale;
    if (!(pa > 0)) continue;
    const sty = tracerStyle(T, p.tracer);
    const colour = lya ? T.accent : sty.color;
    const drop = lya ? (1 - smooth(o.lya)) * -5 * u : 0;
    const x = X(p.x), y = Y(p.y) + drop;
    const r = (lya ? 1.05 + 0.25 * anchor : 0.72) * u;
    if (p.err) errorBar(g, x, y, { ylo: Y(p.err[0]) + drop, yhi: Y(p.err[1]) + drop }, colour, env, { alpha: pa, lw: lya ? 0.36 + 0.1 * anchor : 0.28 });
    glyph(g, lya ? 'circle' : sty.glyph, x, y, r, colour, env, { alpha: pa });
    const c = choice[p.id];
    const la = lya ? pa : pa * (1 - anchor);
    let ly = c ? y + c.dy : y;
    if (c && p.err) {
      const y0 = S0.Y(p.y), t0 = Math.min(S0.Y(p.err[0]), S0.Y(p.err[1])), b0 = Math.max(S0.Y(p.err[0]), S0.Y(p.err[1]));
      const t = Math.min(Y(p.err[0]), Y(p.err[1])) + drop, b = Math.max(Y(p.err[0]), Y(p.err[1])) + drop;
      if (y0 + c.dy < t0) ly = t + (y0 + c.dy - t0);
      else if (y0 + c.dy > b0) ly = b + (y0 + c.dy - b0);
    }
    if (c && la > 0) text(g, p.label, x + c.dx, ly, { px: c.px, color: lya ? T.accent : T.ink, alpha: la, align: c.align, role: 'label' });
  }
  if (anchor > 0) anchorMarks(env, P, X, Y, D, gal, a * anchor, choice, a * (o.de ?? anchor), a * (o.hz ?? anchor));
  placeholderStamp(env, P, D, a);
}
export function drawDistances(...args) { return tagged(args[0].g, 'lya', () => drawDistances__(...args)); }

function anchorMarks__(env, P, X, Y, D, gal, a, choice, deA, hzA) {
  const { g, u, T } = env;
  const lya = D.points.find(p => p.highlight);
  if (gal.length) {
    const z0 = Math.min(...gal.map(p => p.x)), z1 = Math.max(...gal.map(p => p.x));
    const low = Math.max(...gal.map(p => (p.err ? Math.max(Y(p.err[0]), Y(p.err[1])) : Y(p.y))));
    const yb = Math.min(P.y + P.h - 4.2 * u, low + 2.2 * u);
    g.save(); g.globalAlpha *= a; g.strokeStyle = T.ink; g.lineWidth = Math.max(1, 0.22 * u);
    g.beginPath(); g.moveTo(X(z0), yb - 1.0 * u); g.lineTo(X(z0), yb); g.lineTo(X(z1), yb); g.lineTo(X(z1), yb - 1.0 * u); g.stroke(); g.restore();
    text(g, 'galaxies and quasars', (X(z0) + X(z1)) / 2, yb + 1.0 * u + 0.8 * TEXT.label * u, { px: TEXT.label * u, color: T.ink, alpha: a, align: 'center', role: 'label' });
  }
  if (D.de && deA > 0) {
    const y0 = P.y + 0.6 * u, h = 1.7 * u, [z0, z1] = D.x.range;
    g.save();
    for (let i = 0; i < D.de.z.length - 1; i++) {
      const za = D.de.z[i], zb = D.de.z[i + 1];
      if (zb < z0 || za > z1) continue;
      g.globalAlpha = deA * D.de.f[i]; g.fillStyle = T.ink;
      g.fillRect(X(Math.max(za, z0)), y0, X(Math.min(zb, z1)) - X(Math.max(za, z0)) + 0.5, h);
    }
    g.globalAlpha = deA; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.12 * u);
    g.strokeRect(X(z0), y0, X(z1) - X(z0), h);
    g.restore();
    const px = TEXT.min * u;
    if (D.de.text) text(g, D.de.text, P.x + 0.5 * u, y0 + h + 0.8 * u + 0.8 * px, { px, color: T.ink, alpha: deA, role: 'label' });
    if (D.de.label) text(g, D.de.label, P.x + 0.5 * u, y0 + h + 0.8 * u + 0.8 * px + 1.2 * px, { px, color: T.muted, alpha: deA, italic: true, role: 'label' });
  } else if (!D.de) awaiting(env, P.x + 0.5 * u, P.y + 3 * u, 'distances.json de_fraction');
  if (lya && hzA > 0) {
    const xp = X(lya.x) - 1.8 * u, y = Y(lya.y), x0 = xp - 5.0 * u, hd = 0.8 * u;
    g.save(); g.globalAlpha *= hzA; g.strokeStyle = T.accent; g.fillStyle = T.accent; g.lineWidth = Math.max(1.5, 0.3 * u);
    g.beginPath(); g.moveTo(x0, y); g.lineTo(xp - hd, y); g.stroke();
    g.beginPath(); g.moveTo(xp, y); g.lineTo(xp - hd, y - 0.55 * u); g.lineTo(xp - hd, y + 0.55 * u); g.closePath(); g.fill();
    g.restore();
    const px = TEXT.min * u;
    text(g, 'Lyα also measures H(z)', x0 - 0.8 * u, y - 0.15 * px, { px, color: T.accent, alpha: hzA, align: 'right', role: 'label' });
    text(g, 'along the line of sight', x0 - 0.8 * u, y + 1.05 * px, { px, color: T.accent, alpha: hzA, align: 'right', role: 'label' });
  }
  if (lya) {
    const x = X(lya.x), top = lya.err ? Math.min(Y(lya.err[0]), Y(lya.err[1])) : Y(lya.y), bot = lya.err ? Math.max(Y(lya.err[0]), Y(lya.err[1])) : Y(lya.y);
    g.save(); g.globalAlpha *= 0.10 * a; g.fillStyle = T.accent; g.fillRect(x - 2.2 * u, P.y, 4.4 * u, P.h); g.restore();
    const lines = [`z = ${lya.x}${lya.lookback !== null ? ` · ${lya.lookback} Gyr ago` : ''}`, 'the high-z anchor'];
    const px = TEXT.label * u;
    lines.forEach((L, i) => text(g, L, x, bot + 1.4 * u + 0.8 * px + i * 1.15 * px, { px, color: T.accent, alpha: a, align: 'right', italic: i === 1, role: 'label' }));
  }
}
function anchorMarks(...args) { return tagged(args[0].g, 'lya', () => anchorMarks__(...args)); }

function omh__(env, A, P, Rref, O, st, op) {
  const { g, u, T } = env;
  const a = st.omh * op;
  if (!(a > 0)) return;
  const { X, Y } = scales(O, P);
  axes(g, P, { x: { s: X, label: O.x.label }, y: { s: Y, label: O.y.label } }, env, { alpha: a, yTitleLift: A.yTitleLift });
  const tracers = O.series.filter(s => !s.combined), all = O.series.filter(s => s.combined);
  const pale = 1 - 0.75 * smooth(st.all);
  const shown = tracers.map((s, i) => ({ s, colour: contourColour(T, s, i, tracers.length), a: stagger(st.trc, i, tracers.length, 0.45) * op }));
  for (const { s, colour, a: sa } of shown) {
    if (!(sa > 0)) continue;
    drawContour(env, P, X, Y, s, colour, s.highlight ? T.fill68Accent : T.fill68, sa * pale);
  }
  for (const s of all) drawContour(env, P, X, Y, s, T.ink, T.fill68All, smooth(st.all) * op, { thick: 1.8 });
  const list = [
    ...all.map(s => ({ s, text: s.label, px: TEXT.title * u, color: T.ink, alpha: smooth(st.all) * op })),
    ...shown.filter(x => x.s.highlight).map(({ s, a: sa }) => ({ s, text: s.label, px: TEXT.title * u, color: T.accent, alpha: sa })),
    ...(() => { const gal = shown.filter(x => !x.s.highlight && x.s.z !== null).sort((p, q) => p.s.z - q.s.z);
      return [gal[0], gal[gal.length - 1]].filter(Boolean); })().map(({ s, colour, a: sa }) => ({ s, text: `${plainName(s.id, null)} · z = ${s.z}`, px: TEXT.label * u, color: T.name === 'paper' ? T.ink : colour, alpha: (1 - smooth(st.all)) * sa })),
  ];
  contourLabels(env, O, Rref, P, list, [], O, O.series.filter(s => !list.some(it => it.s === s)));
  const ka = smooth(st.trc) * op * (1 - smooth(st.all));
  if (ka > 0) ['one band per sample:', 'darker = higher redshift'].forEach((L, j) => text(g, L, P.x + P.w - 1.0 * u, P.y + 1.2 * u + 0.8 * TEXT.min * u + j * 1.15 * TEXT.min * u, { px: TEXT.min * u, color: T.muted, alpha: ka, italic: true, align: 'right', role: 'label' }));
  if (Array.isArray(env.notes) && a > 0) env.notes.push({ text: `the bands, by redshift: ${tracers.map(s => `${plainName(s.id, s.z)}${s.highlight ? '' : ` (${s.id})`}`).join('; ')}`, shown: false, optional: true });
  placeholderStamp(env, P, O, a);
}
function omh(...args) { return tagged(args[0].g, 'lya', () => omh__(...args)); }



function plainDistances__(env, P, D, o) {
  const { g, u, T } = env;
  const M = D.plain, a = o.a;
  if (!(a > 0)) return;
  const lya = M.points.find(p => p.highlight), gal = M.points.filter(p => !p.highlight);
  const xmax = 2.6, ymax = 1.32 * Math.max(...M.points.map(p => p.y + (p.sig || 0)), ...M.curve.y.filter((_, i) => M.curve.z[i] <= xmax));
  const X = scale(0, xmax, P.x, P.x + P.w), Y = scale(0, ymax, P.y + P.h, P.y);
  axes(g, P, { x: { s: X, label: M.x.label }, y: { s: Y, label: M.y.label } }, env, { alpha: a });
  if (M.yGloss) {
    const tp = TEXT.label * u, tl = 0.8 * u;
    text(g, M.yGloss, P.x - tl - 0.5 * u + measure(g, M.y.label, tp) + 2.4 * u, P.y - 1.0 * tp, { px: TEXT.min * u, color: T.muted, alpha: a, italic: true, role: 'label' });
    caveatNote(env, M.yGloss, a);
  }
  const ca = a * smooth(clamp01((o.pts === undefined ? 1 : o.pts) / 0.3));
  const cpts = M.curve.z.map((z, i) => [z, M.curve.y[i]]).filter(([z]) => z <= xmax).map(([z, y]) => [X(z), Y(y)]);
  if (ca > 0) polyline(g, cpts, T.muted, env, { lw: 0.36, alpha: ca });
  const marks = smooth(o.marks || 0), grey = T.name === 'dark' ? '#AEB7C4' : '#5B6472';
  gal.forEach((p, i) => {
    const pa = a * stagger(o.pts === undefined ? 1 : o.pts, i, gal.length, 0.5);
    if (!(pa > 0)) return;
    if (p.sig) errorBar(g, X(p.x), Y(p.y), { ylo: Y(p.y - p.sig), yhi: Y(p.y + p.sig) }, grey, env, { alpha: pa, lw: 0.28 });
    glyph(g, 'circle', X(p.x), Y(p.y), 0.72 * u, grey, env, { alpha: pa });
  });
  const la = a * smooth(o.lya === undefined ? 1 : o.lya);
  if (lya && la > 0) {
    if (lya.sig) errorBar(g, X(lya.x), Y(lya.y), { ylo: Y(lya.y - lya.sig), yhi: Y(lya.y + lya.sig) }, T.accent, env, { alpha: la, lw: 0.4 });
    glyph(g, 'circle-open', X(lya.x), Y(lya.y), (1.15 + 0.25 * marks) * u, T.accent, env, { alpha: la, lw: 0.4 });
  }
  const px = TEXT.min * u, pl = TEXT.label * u;
  const obstacles = lineObstacles(cpts, u, 2, 0.6);
  const anchorStep = o.marks !== undefined || o.de !== undefined;
  placeLabels(g, [{ text: M.curveLabel.replace(/\s*\([^)]*\)\s*$/, '').split(anchorStep ? ':' : '\u0000')[0], x: X(0.6), y: Y(M.curve.y[nearestIdx(M.curve.z, 0.6)]), px, color: T.muted, alpha: ca, italic: true, leader: false,
    cands: [[1.5, 4.0, 'left'], [1.5, 6.0, 'left'], [2.5, 8.0, 'left'], [-1.5, 4.0, 'left']] }], env, { avoid: obstacles, bounds: { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 1 * u } });
  const ma = a * marks;
  if (gal.length && ma > 0) {
    const z0 = gal[0].x, z1 = gal[gal.length - 1].x, yb = P.y + P.h - 3.2 * u - 1.1 * pl;
    g.save(); g.globalAlpha *= ma; g.strokeStyle = T.ink; g.lineWidth = Math.max(1, 0.22 * u);
    g.beginPath(); g.moveTo(X(z0), yb - 1.0 * u); g.lineTo(X(z0), yb); g.lineTo(X(z1), yb); g.lineTo(X(z1), yb - 1.0 * u); g.stroke(); g.restore();
    text(g, 'galaxies and quasars', (X(z0) + X(z1)) / 2, yb + 1.0 * u + 0.8 * pl, { px: pl, color: T.ink, alpha: ma, align: 'center', role: 'label' });
  }
  if (lya && la > 0) {
    const under = (L) => {
      const xb = X(lya.x) + 1.2 * u, wb = measure(g, L, pl);
      const zb = (xb - wb - X(0)) / (X(1) - X(0)), ycb = Y(M.curve.y[nearestIdx(M.curve.z, zb)]);
      return [xb, Math.max(Y(lya.y) + 1.05 * u + 1.2 * u + 0.8 * pl, ycb + 1.0 * u + 0.8 * pl)];
    };
    const nt = turns(marks);
    if (nt.out > 0) { const L1 = `DESI Lyα, z = ${lya.x}`, [x1, y1] = under(L1); text(g, L1, x1, y1, { px: pl, color: T.accent, alpha: la * nt.out, align: 'right', role: 'label' }); }
    if (nt.in > 0) {
      const A1 = 'Lyα: the anchor', [xb, yb] = under(A1), aa = a * nt.in, A2 = `z = ${lya.x}${lya.lookback ? ` · ${lya.lookback} Gyr ago` : ''}`;
      const wA = Math.max(measure(g, A1, pl), measure(g, A2, px, true));
      irisBlock(g, { x: xb - wA, y: yb - 0.8 * pl, w: wA, h: 1.2 * pl + 0.25 * px + 0.8 * pl }, pl, () => {
        text(g, A1, xb, yb, { px: pl, color: T.accent, alpha: aa, align: 'right', role: 'label' });
        text(g, A2, xb, yb + 1.2 * pl, { px, color: T.muted, alpha: aa, align: 'right', italic: true, role: 'label' });
      });
    }
  }
  const da = a * smooth(o.de || 0);
  if (D.de && D.de.text && da > 0 && lya) { deBand(env, P, X, Y, M, D.de, da); shareBars(env, P, D.de, lya.x, da); }
  else if (!D.de && (o.de || 0) > 0) awaiting(env, P.x + 1.2 * u, P.y + 3 * u, 'distances.json de_fraction');
  const ha = 0;
  if (Array.isArray(env.notes) && lya && a * smooth(o.hz || 0) > 0) env.notes.push({ text: 'said, not drawn: Lyα also measures H(z) × r_d along the line of sight (BAO measures H(z) in units of the ruler)', shown: false, optional: true });
  if (lya && ha > 0) {
    const tx = X(lya.x) - 2.0 * u, ty = Y(lya.y) - 4.2 * u - 1.2 * px, ang = Math.atan2(3.0, 1.0);
    const p1 = [X(lya.x) - 0.9 * u * Math.cos(ang), Y(lya.y) - 0.9 * u * Math.sin(ang)], p0 = [tx + 0.6 * u, ty + 1.05 * px + 0.2 * u];
    const hd = 0.8 * u, a2 = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    g.save(); g.globalAlpha *= ha; g.strokeStyle = T.accent; g.fillStyle = T.accent; g.lineWidth = Math.max(1.5, 0.3 * u);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0] - hd * Math.cos(a2), p1[1] - hd * Math.sin(a2)); g.stroke();
    g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p1[0] - hd * Math.cos(a2 - 0.45), p1[1] - hd * Math.sin(a2 - 0.45)); g.lineTo(p1[0] - hd * Math.cos(a2 + 0.45), p1[1] - hd * Math.sin(a2 + 0.45)); g.closePath(); g.fill(); g.restore();
    text(g, 'Lyα also measures H(z) × r_d', tx, ty - 0.2 * px, { px, color: T.accent, alpha: ha, align: 'right', role: 'label' });
    text(g, 'along the line of sight', tx, ty + 1.0 * px, { px, color: T.accent, alpha: ha, align: 'right', role: 'label' });
  }
}
export function plainDistances(...args) { return tagged(args[0].g, 'lya', () => plainDistances__(...args)); }
function nearestIdx(arr, v) { let b = 0; for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i] - v) < Math.abs(arr[b] - v)) b = i; return b; }

export function shareAt(DE, z) {
  const Z = DE.z, F = DE.f;
  if (z <= Z[0]) return F[0];
  for (let i = 1; i < Z.length; i++) if (z <= Z[i]) return F[i - 1] + (F[i] - F[i - 1]) * (z - Z[i - 1]) / (Z[i] - Z[i - 1]);
  return F[F.length - 1];
}
export const SHARE_CAPTION = "dark energy's share", SHARE_KIND = 'approximate ΛCDM prediction';
export const DE_MATTERS = 0.25, DE_BAND_NAME = 'dark energy ≥ a quarter of the total';
function deBand(env, P, X, Y, M, DE, a) {
  const { g, u, T } = env;
  let zE = DE.z[DE.z.length - 1];
  for (let i = 1; i < DE.z.length; i++) if (DE.f[i] < DE_MATTERS) { zE = DE.z[i - 1] + (DE.z[i] - DE.z[i - 1]) * (DE.f[i - 1] - DE_MATTERS) / (DE.f[i - 1] - DE.f[i]); break; }
  const xE = X(zE), yC = Y(M.curve.y[nearestIdx(M.curve.z, zE)]);
  g.save(); g.globalAlpha *= 0.10 * a; g.fillStyle = T.wash; g.fillRect(P.x, P.y, xE - P.x, P.h); g.restore();
  hatch(g, P.x, P.y + P.h - 1.4 * u, xE - P.x, 1.4 * u, env, { alpha: a, sp: 1.0 });
  refLine(g, xE, P.y, xE, yC - 2.0 * u, env, { alpha: 0.8 * a, color: T.muted });
  const px = TEXT.min * u;
  text(g, DE_BAND_NAME, P.x + 1.2 * u, P.y + 1.0 * u + 0.8 * px, { px, color: T.ink, alpha: a, italic: true, role: 'label' });
  if (Array.isArray(env.notes)) env.notes.push({ text: `pale band: where dark energy is at least a quarter of the total in the same ΛCDM curve (z < ${zE.toFixed(1)}); schematic threshold`, shown: false, optional: true });
}
function shareBars(env, P, DE, zL, a) {
  const { g, u, T } = env;
  const pl = TEXT.label * u, x0 = P.x + 1.2 * u, y0 = P.y + 1.4 * u + 1.25 * TEXT.min * u;
  const cols = [{ name: 'today', f: shareAt(DE, 0) }, { name: `z = ${zL}`, f: shareAt(DE, zL) }]
    .map(c => ({ ...c, value: `≈ ${Math.round(100 * c.f)}%` }));
  const Wb = 4.6 * u, Hb = 9.0 * u, gap = 1.8 * u, px = TEXT.min * u;
  let wAll = Math.max(measure(g, SHARE_CAPTION, pl), measure(g, SHARE_KIND, px, true));
  { let b0 = x0 + Math.max(0, (measure(g, cols[0].value, pl) - Wb) / 2); for (const c of cols) { const cx = b0 + Wb / 2, nx = b0 + Wb + 1.4 * u; b0 = Math.max(nx + measure(g, c.name, pl), cx + measure(g, c.value, pl) / 2) + gap; wAll = Math.max(wAll, b0 - gap - x0); } }
  return irisBlock(g, { x: x0, y: y0, w: wAll, h: 3.4 * pl + 0.6 * u + Hb }, pl, () => shareBarsDraw(env, cols, x0, y0, pl, px, Wb, Hb, gap, a));
}
function shareBarsDraw(env, cols, x0, y0, pl, px, Wb, Hb, gap, a) {
  const { g, u, T } = env;
  text(g, SHARE_CAPTION, x0, y0 + 0.8 * pl, { px: pl, color: T.ink, alpha: a, role: 'label' });
  text(g, SHARE_KIND, x0, y0 + 0.8 * pl + 1.1 * pl, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  const vy = y0 + 0.8 * pl + 1.1 * pl + 1.25 * pl, fy = vy + 0.25 * pl + 0.6 * u;
  let bx = x0 + Math.max(0, (measure(g, cols[0].value, pl) - Wb) / 2);
  cols.forEach(c => {
    const cx = bx + Wb / 2;
    text(g, c.value, cx, vy, { px: pl, color: T.ink, alpha: a, align: 'center', role: 'label' });
    g.save(); g.globalAlpha *= a;
    if (g.__mark) g.__mark('bar');
    g.fillStyle = T.ink; g.globalAlpha *= 0.85; g.fillRect(bx, fy + Hb * (1 - c.f), Wb, Hb * c.f);
    g.restore();
    g.save(); g.globalAlpha *= a; if (g.__mark) g.__mark('bar');
    g.strokeStyle = T.muted; g.lineWidth = Math.max(1, 0.2 * u); g.strokeRect(bx, fy, Wb, Hb);
    g.restore();
    const nx = bx + Wb + 1.4 * u;
    text(g, c.name, nx, fy + 0.42 * Hb + 0.35 * pl, { px: pl, color: T.ink, alpha: a, role: 'label' });
    bx = Math.max(nx + measure(g, c.name, pl), cx + measure(g, c.value, pl) / 2) + gap;
  });
}

export const RATIO = { range: [0.95, 1.06], ticks: [0.96, 0.98, 1, 1.02, 1.04], zGlyph: 0.1, xmax: 2.6 };
export const STACK = { lift: 2.5, topShare: 0.4, gap: 5.0, shareH: 14.0, shareGap: 6.0, bottom: 80, left: 0.5, planeGap: 13.5 };
export const stackBottom = (env, A, footTop) => Math.min((STACK.bottom / 100) * env.H, footTop - 9.6 * env.u);
export const DIST_WORDS = {
  yTop: 'D_V / r_d', yTopGloss: 'distance to z, in ruler units: how many rulers fit (no unit)',
  dv: 'D_V: the distances along and across the line of sight, combined',
  yRatio: plain('distances.yRatio', 'distance ÷ ΛCDM fit'), yRatioGloss: plain('distances.yRatioGloss', 'error bars: 1σ'),
  lcdmCmb: 'ΛCDM (CMB)', plane: 'each curve is one point here',
  share: plain('distances.share', "dark energy's share of the total"), shareY: plain('distances.shareY', 'share'),
  shareGloss: plain('distances.shareGloss', 'approximate ΛCDM prediction'), agree: 'here the curves agree',
  family: LW ? 'dark-energy models' : 'dark-energy models (Uendert’s talk)',
};
export const MODEL_INKS = {
  paper: { desi_cmb_mean: '#1F5FAF', inside_all: '#1E8C6E', outside_below: '#A88A10' },
  dark: { desi_cmb_mean: '#7FA8E6', inside_all: '#5CC4A2', outside_below: '#D9BC4E' },
};
const FALLBACK_INKS = { paper: ['#1F5FAF', '#1E8C6E', '#A88A10'], dark: ['#7FA8E6', '#5CC4A2', '#D9BC4E'] };
export function modelInk(T, m, DM) {
  if (m.lcdm) return T.ink;
  const t = MODEL_INKS[T.name] || MODEL_INKS.paper;
  if (t[m.id]) return t[m.id];
  const i = DM ? DM.models.filter(q => !q.lcdm).indexOf(m) : 0;
  return (FALLBACK_INKS[T.name] || FALLBACK_INKS.paper)[Math.max(0, i) % 3];
}
let LB_TICKS = null;
const timeAxis = X => (LW && LB_TICKS ? { s: X, label: 'billions of years ago', ticks: LB_TICKS.filter(t => t.v <= X.domain[1] + 1e-9) } : { s: X, label: 'redshift z' });
const ratioTick = v => (!LW ? v.toFixed(2) : Math.abs(v - 1) < 1e-9 ? '0' : `${v > 1 ? '+' : '−'}${Math.round(100 * Math.abs(v - 1))}%`);
export const modelTag = m => (m.lcdm ? DIST_WORDS.lcdmCmb : `(${num(m.w0)}, ${num(m.wa)})`);
export const MODEL_LW = 0.42;
const SN_GLYPH = 0.5, SN_LW = 0.22;
export const snInk = T => (T.name === 'dark' ? '#AEB7C4' : '#4A5464');
export function stackLayout(env, A, o) {
  const { u } = env;
  const PN = panels(env, A), R0 = PN.solo;
  const y0top = A.top + STACK.lift * u, R = { ...R0, y: y0top, h: R0.y + R0.h - y0top };
  const wl = STACK.left * R.w, plane = { x: R.x + wl + STACK.planeGap * u, y: R.y, w: PN.right.x + PN.right.w - (R.x + wl + STACK.planeGap * u), h: R.h };
  const w = lerp(R.w, wl, smooth(o.split || 0));
  const gap = STACK.gap * u, topH = STACK.topShare * (R.h - gap), sh = STACK.shareH * u, sg = STACK.shareGap * u;
  const y0 = lerp(R.y + topH + gap, R.y, smooth(o.grow || 0));
  const yb = lerp(R.y + R.h, R.y + R.h - sh - sg, smooth(o.shrink || 0));
  return { R, top: { x: R.x, y: R.y, w, h: topH }, ratio: { x: R.x, y: y0, w, h: yb - y0 }, share: { x: R.x, y: R.y + R.h - sh, w, h: sh }, plane };
}
function at(Z, V, z) { if (z <= Z[0]) return V[0]; for (let i = 1; i < Z.length; i++) if (z <= Z[i]) return V[i - 1] + (V[i] - V[i - 1]) * (z - Z[i - 1]) / (Z[i] - Z[i - 1]); return V[V.length - 1]; }
const hits = (b, o, pad) => { const q = o.pad !== undefined ? o.pad : pad; return b.x < o.x + o.w + q && o.x < b.x + b.w + q && b.y < o.y + o.h + q && o.y < b.y + b.h + q; };
const asMarks = (L, u) => L.map(b => ({ ...b, pad: 0.3 * u }));
const gapOf = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));
const inside = (b, B) => b.x >= B.x && b.x + b.w <= B.x + B.w && b.y >= B.y && b.y + b.h <= B.y + B.h;

function nameBesidePoints(g, u, pts, px, avoid, bounds, near = []) {
  const out = {}, placed = [];
  const own = pts.map(q => ({ x: q.x - q.r - 0.3 * u, y: q.top - 0.3 * u, w: 2 * q.r + 0.6 * u, h: q.bottom - q.top + 0.6 * u }));
  const glyphs = pts.map(q => ({ x: q.x - q.r, y: q.y - q.r, w: 2 * q.r, h: 2 * q.r }));
  const order = pts.map((q, i) => ({ i, w: measure(g, q.text, px) })).sort((a, b) => b.w - a.w || a.i - b.i).map(o => o.i);
  const pad = Math.max(0.4 * u, px / 3);
  const tryForm = (q, i, lines) => {
    const w = Math.max(...lines.map(L => measure(g, L, px))), h = 1.05 * px + (lines.length - 1) * 1.15 * px;
    for (const d of [0.4, 0.7, 1.0, 1.3, 1.7, 2.1, 2.6, 3.2, 3.8, 4.5, 5.5]) {
      for (const [x, y] of [[q.x - w / 2, q.top - d * u - h], [q.x - w / 2, q.bottom + d * u], [q.x - 0.6 * u - w, q.top - d * u - h], [q.x + 0.6 * u, q.top - d * u - h],
        [q.x - 0.6 * u - w, q.bottom + d * u], [q.x + 0.6 * u, q.bottom + d * u], [q.x + q.r + (0.4 + d) * u, q.y - h / 2], [q.x - q.r - (0.4 + d) * u - w, q.y - h / 2]]) {
        const b = { x, y, w, h };
        if (!inside(b, bounds)) continue;
        const d0 = gapOf(b, own[i]);
        if (glyphs.some((o, j) => j !== i && gapOf(b, o) < d0 + 0.5)) continue;
        if (b.y + b.h <= q.top || b.y >= q.bottom) { if (q.x < b.x - 0.6 * u || q.x > b.x + b.w + 0.6 * u) continue; }
        const over = (o, lim) => o.x >= b.x - 0.6 * u && o.x <= b.x + b.w + 0.6 * u && Math.min(Math.abs(o.top - (b.y + b.h)), Math.abs(b.y - o.bottom), Math.abs(o.y - (b.y + b.h / 2))) < lim;
        const side = o => o.x >= b.x - 3 * u && o.x <= b.x + b.w + 3 * u && o.y >= b.y - 2 * u && o.y <= b.y + b.h + 2 * u;
        if (pts.some((o, j) => j !== i && (over(o, 5 * u) || side(o))) || near.some(o => over(o, 1.5 * u))) continue;
        if (avoid.some(o => hits(b, o, pad)) || placed.some(o => hits(b, o, pad)) || own.some((o, j) => j !== i && hits(b, o, 0.3 * u))) continue;
        return b;
      }
    }
    return null;
  };
  order.forEach(i => {
    const q = pts[i];
    const forms = [[q.text]];
    const k = q.text.indexOf('+');
    if (k > 0 && k < q.text.length - 1) forms.push([q.text.slice(0, k + 1), q.text.slice(k + 1)]);
    for (const lines of forms) {
      const b = tryForm(q, i, lines);
      if (!b) continue;
      placed.push(b);
      out[q.id] = { box: b, x: b.x, y: b.y + 0.8 * px, lines, rows: lines.map((L, j) => ({ t: L, x: b.x + (b.w - measure(g, L, px)) / 2, y: b.y + 0.8 * px + j * 1.15 * px })) };
      break;
    }
  });
  return { out, placed };
}
function drawName(env, n, px, a) {
  if (!(a > 0)) return;
  irisBlock(env.g, n.box, px, () => n.rows.forEach(r => text(env.g, r.t, r.x, r.y, { px, color: env.T.muted, alpha: a, role: 'label' })));
}
function nameAlongCurve(g, u, pts, text, px, avoid, bounds, zs, X) {
  const w = measure(g, text, px), h = 1.05 * px, pad = Math.max(0.4 * u, px / 3);
  for (const z of zs) {
    const x0 = X(z) + 0.5 * u, span = pts.filter(p => p[0] >= x0 - 0.3 * u && p[0] <= x0 + w + 0.3 * u);
    if (span.length < 2) continue;
    const yL = span[0][1], ymin = Math.min(...span.map(p => p[1])), ymax = Math.max(...span.map(p => p[1]));
    for (const b of [{ x: x0, y: ymin - 0.5 * u - h, w, h }, { x: x0, y: ymax + 0.5 * u, w, h }]) {
      const edge = b.y > yL ? b.y - yL : yL - (b.y + b.h);
      if (edge > 2.5 * u || !inside(b, bounds)) continue;
      if (avoid.some(o => hits(b, o, pad))) continue;
      return b;
    }
  }
  return null;
}
const ratioMemo = new WeakMap();
function ratioPlaces(env, P, X, Y, D, DM, SN, fixed, anchor, capOn) {
  const { g, u } = env, px = TEXT.min * u, xmax = RATIO.xmax;
  const key = `${P.x.toFixed(1)}|${P.y.toFixed(1)}|${P.w.toFixed(1)}|${P.h.toFixed(1)}|${u.toFixed(4)}|${DM ? DM.models.length : 0}|${SN ? SN.points.length : 0}|${anchor ? 1 : 0}|${capOn ? 1 : 0}`;
  const cache = ratioMemo.get(D) || new Map();
  if (cache.has(key)) return cache.get(key);
  const bounds = { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 0.5 * u - Math.max(0.5 * u, px / 3 + 0.2 * u) };
  const avoid = [...fixed];
  avoid.push({ x: P.x, y: Y(1) - 0.15 * u, w: P.w, h: 0.3 * u, pad: 0.3 * u });
  const baoMarks = [], snMarks = [];
  for (const p of D.points) if (p.err) baoMarks.push({ id: p.id, x: X(p.x) - (p.highlight ? 1.35 : 0.85) * u, y: Y(p.err[1]) - 0.2 * u, w: (p.highlight ? 2.7 : 1.7) * u, h: Y(p.err[0]) - Y(p.err[1]) + 0.4 * u, pad: 0.3 * u });
  if (SN) for (const p of SN.points) snMarks.push({ x: X(p.x) - 0.6 * u, y: Y(Math.min(p.err[1], RATIO.range[1])) - 0.2 * u, w: 1.2 * u, h: Y(Math.max(p.err[0], RATIO.range[0])) - Y(Math.min(p.err[1], RATIO.range[1])) + 0.4 * u, pad: 0.3 * u });
  avoid.push(...snMarks);
  const curves = DM ? DM.models.map(m => ({ m, pts: DM.z.map((z, k) => [z, m.ratio[k]]).filter(([z]) => z <= xmax + 0.02).map(([z, v]) => [X(z), Y(v)]) })) : [];
  const curveObs = c => asMarks(lineObstacles(c.pts.filter(p => p[1] >= P.y && p[1] <= P.y + P.h), u, 1, 0.45), u);
  const out = { model: {}, lcdm: null, bao: {}, sn: null };
  const zs = []; for (let z = 0.02; z <= 1.6 + 1e-9; z += 0.02) zs.push(+z.toFixed(2));
  const tags = {}, tried = [...avoid];
  for (const c of curves) {
    if (c.m.lcdm) continue;
    const others = curves.filter(q => q !== c).flatMap(curveObs);
    const b = nameAlongCurve(g, u, c.pts, modelTag(c.m), px, [...tried, ...baoMarks, ...others], bounds, zs, X);
    if (!b) { out.key = true; break; }
    tags[c.m.id] = b; tried.push(b);
  }
  if (!out.key) { out.model = tags; avoid.push(...Object.values(tags)); }
  else {
    const ms = curves.filter(c => !c.m.lcdm).map(c => c.m);
    const lead = 0.9 * u + 0.9 * u + 2.2 * u + 0.8 * u;
    const wMax = Math.max(...ms.map(m => measure(g, modelTag(m), px))) + lead, hK = (ms.length - 1) * 1.15 * px + 1.05 * px;
    const allC = curves.flatMap(curveObs), cands = [];
    for (let z = 0.2; z <= 1.2 + 1e-9; z += 0.05) cands.push([X(z), P.y + 1.0 * u]);
    cands.push([P.x + P.w - 1.0 * u - wMax, P.y + 1.2 * u + 1.15 * px]);
    let kb = null;
    for (const [x, y] of cands) {
      const b = { x, y, w: wMax, h: hK };
      if (!inside(b, bounds) || [...avoid, ...baoMarks, ...allC].some(o => hits(b, o, Math.max(0.4 * u, px / 3)))) continue;
      kb = b; break;
    }
    if (!kb) kb = { x: cands[cands.length - 1][0], y: cands[cands.length - 1][1], w: wMax, h: hK };
    const y0 = kb.y + 0.8 * px;
    out.key = { x: kb.x, y0, lead, rows: ms.map((m, j) => ({ m, y: y0 + j * 1.15 * px })) };
    avoid.push(kb);
  }
  const allCurves = curves.flatMap(curveObs);
  const bp = anchor ? [] : D.points.filter(p => !p.highlight && p.err).map(p => ({ id: p.id, text: p.label, x: X(p.x), y: Y(p.y), top: Y(p.err[1]), bottom: Y(p.err[0]), r: 0.72 * u }));
  const { out: bn } = nameBesidePoints(g, u, bp, px, [...avoid, ...baoMarks.filter(b => !bp.some(q => q.id === b.id)), ...allCurves], bounds,
    SN ? SN.points.map(p => ({ x: X(p.x), y: Y(p.y), top: Y(Math.min(p.err[1], RATIO.range[1])), bottom: Y(Math.max(p.err[0], RATIO.range[0])) })) : []);
  out.bao = bn;
  for (const k of Object.keys(bn)) avoid.push(bn[k].box);
  const lc = curves.find(c => c.m.lcdm);
  if (lc) {
    const others = curves.filter(q => q !== lc).flatMap(curveObs), rows = DIST_WORDS.lcdmCmb.replace(' (', '\n(').split('\n');
    const w = Math.max(...rows.map(L => measure(g, L, px))), h = 1.05 * px + 1.15 * px;
    for (const z of [0.65, 0.75, 0.55, 0.85, 0.95, 1.05, 0.45]) {
      const x0 = X(z), span = lc.pts.filter(p => p[0] >= x0 - 0.3 * u && p[0] <= x0 + w + 0.3 * u);
      if (span.length < 2) continue;
      const b = { x: x0, y: Math.min(...span.map(p => p[1])) - 0.6 * u - h, w, h };
      if (!inside(b, bounds) || [...avoid, ...baoMarks, ...others].some(o => hits(b, o, Math.max(0.4 * u, px / 3)))) continue;
      out.lcdm = { box: b, rows }; avoid.push(b); break;
    }
  }
  if (SN) {
    const rows = [SN.name, SN.kind], w = Math.max(measure(g, rows[0], px), measure(g, rows[1], px, true)), h = 1.05 * px + 1.15 * px;
    const zc = SN.points.filter(p => p.x <= 1).reduce((s, p) => s + p.x, 0) / Math.max(1, SN.points.filter(p => p.x <= 1).length);
    const cands = [];
    for (let dz = 0; dz <= 1.2; dz += 0.05) for (const s of [1, -1]) { const z = zc + s * dz; if (z >= 0.05 && z <= 2.0) cands.push(z); }
    const ys = []; for (let v = 0.958; v <= 1.05; v += 0.002) ys.push(v);
    let pick = null;
    for (const z of cands) {
      for (const v of ys) {
        const b = { x: X(z) - w / 2, y: Y(v), w, h };
        if (!inside(b, bounds) || [...avoid, ...baoMarks, ...allCurves].some(o => hits(b, o, Math.max(0.4 * u, px / 3)))) continue;
        pick = b; break;
      }
      if (pick) break;
    }
    if (pick) { out.sn = { box: pick, rows }; avoid.push(pick); }
  }
  if (cache.size > 24) cache.clear();
  cache.set(key, out); ratioMemo.set(D, cache);
  return out;
}

function drawStack__(env, A, D, DM, o) {
  const { g, u, T } = env;
  const M = D.plain, a = o.a, SN = o.sne || null;
  if (!(a > 0) || !M) return null;
  const L = stackLayout(env, A, o);
  const TOP = D.top || M.top;
  LB_TICKS = TOP ? TOP.ticks.filter(t => [0, 4, 8, 10, 11].includes(+t.label)).map(t => ({ v: t.x, label: +t.label === 0 ? 'today' : t.label })) : null;
  const lya = M.points.find(p => p.highlight), gal = M.points.filter(p => !p.highlight);
  const rl = D.points.find(p => p.highlight), rg = D.points.filter(p => !p.highlight);
  const xmax = RATIO.xmax, grey = T.name === 'dark' ? '#AEB7C4' : '#5B6472', px = TEXT.min * u, pl = TEXT.label * u;
  const topK = smooth(o.top || 0), top = topK * a, xr = o.xr === undefined ? 1 : o.xr, names = o.names === undefined ? 1 : o.names;
  const nameOf = id => (D.points.find(p => p.id === id) || {}).label || id;
  if (top > 0) {
    const P = L.top;
    const ymax = 1.62 * Math.max(...M.points.map(p => p.y + (p.sig || 0)), ...M.curve.y.filter((_, i) => M.curve.z[i] <= xmax));
    const X = scale(0, xmax, P.x, P.x + P.w), Y = scale(0, ymax, P.y + P.h, P.y);
    axes(g, P, { x: { s: X, label: '', bare: true }, y: { s: Y, label: DIST_WORDS.yTop } }, env, { alpha: top });
    const g1 = P.y + 1.2 * u + 0.8 * px, g2 = g1 + 1.15 * px;
    text(g, DIST_WORDS.yTopGloss, P.x + 1.4 * u, g1, { px, color: T.muted, alpha: top, italic: true, role: 'label' });
    caveatNote(env, DIST_WORDS.yTopGloss, top);
    text(g, DIST_WORDS.dv, P.x + 1.4 * u, g2, { px, color: T.muted, alpha: top, italic: true, role: 'label' });
    const glossBox = { x: P.x + 1.4 * u, y: g1 - 0.8 * px, w: Math.max(measure(g, DIST_WORDS.yTopGloss, px, true), measure(g, DIST_WORDS.dv, px, true)), h: g2 + 0.25 * px - (g1 - 0.8 * px) };
    const ca = top * smooth(clamp01((o.pts === undefined ? 1 : o.pts) / 0.3));
    const cpts = M.curve.z.map((z, i) => [z, M.curve.y[i]]).filter(([z]) => z <= xmax).map(([z, y]) => [X(z), Y(y)]);
    if (ca > 0) polyline(g, cpts, T.muted, env, { lw: 0.36, alpha: ca });
    const pas = gal.map((p, i) => top * stagger(o.pts === undefined ? 1 : o.pts, i, gal.length, 0.5));
    gal.forEach((p, i) => {
      const pa = pas[i];
      if (!(pa > 0)) return;
      if (p.sig) errorBar(g, X(p.x), Y(p.y), { ylo: Y(p.y - p.sig), yhi: Y(p.y + p.sig) }, grey, env, { alpha: pa, lw: 0.28 });
      glyph(g, 'circle', X(p.x), Y(p.y), 0.72 * u, grey, env, { alpha: pa });
    });
    const la = top * smooth(o.lya === undefined ? 1 : o.lya);
    let lyaBox = null;
    if (lya) {
      const t = `DESI Lyα, z = ${lya.x}`, w = measure(g, t, pl), xr0 = X(lya.x) + 1.2 * u, yb0 = Y(lya.y) + 2.4 * u + 0.8 * pl;
      lyaBox = { x: xr0 - w, y: yb0 - 0.8 * pl, w, h: 1.05 * pl };
      if (la > 0) {
        if (lya.sig) errorBar(g, X(lya.x), Y(lya.y), { ylo: Y(lya.y - lya.sig), yhi: Y(lya.y + lya.sig) }, T.accent, env, { alpha: la, lw: 0.4 });
        glyph(g, 'circle-open', X(lya.x), Y(lya.y), 1.15 * u, T.accent, env, { alpha: la, lw: 0.4 });
        text(g, t, xr0, yb0, { px: pl, color: T.accent, alpha: la, align: 'right', role: 'label' });
      }
    }
    const qs = gal.filter(p => p.sig).map(p => ({ id: p.id, text: nameOf(p.id), x: X(p.x), y: Y(p.y), top: Y(p.y + p.sig), bottom: Y(p.y - p.sig), r: 0.72 * u }));
    const avoidT = [glossBox, ...asMarks(lineObstacles(cpts, u, 1, 0.45), u), ...(lyaBox ? [lyaBox] : [])];
    if (lya) avoidT.push({ x: X(lya.x) - 1.6 * u, y: Y(lya.y + (lya.sig || 0)) - 0.5 * u, w: 3.2 * u, h: Y(lya.y - (lya.sig || 0)) - Y(lya.y + (lya.sig || 0)) + 1.0 * u, pad: 0.3 * u });
    const boundsT = { x: P.x + 0.5 * u, y: P.y + 0.5 * u, w: P.w - 1 * u, h: P.h - 0.5 * u - Math.max(0.5 * u, px / 3 + 0.2 * u) };
    const { out: tn, placed: tp } = nameBesidePoints(g, u, qs, px, avoidT, boundsT);
    gal.forEach((p, i) => { const n = tn[p.id]; if (n && pas[i] > 0) drawName(env, n, px, pas[i] * names); });
    const cands = [];
    for (const z of [0.75, 1.0, 0.55, 1.2, 1.4, 1.6, 1.8]) for (const [dx, dy] of [[1.5, 4.0], [1.5, 5.5], [2.5, 7.0], [2.5, 8.5], [2.5, 10.0]]) cands.push([dx + (X(z) - X(0.75)) / u, dy - (Y(at(M.curve.z, M.curve.y, z)) - Y(at(M.curve.z, M.curve.y, 0.75))) / u * -1, 'left']);
    placeLabels(g, [{ text: M.curveName || M.curveLabel, x: X(0.75), y: Y(at(M.curve.z, M.curve.y, 0.75)), px, color: T.muted, alpha: ca, italic: true, leader: false, cands }], env,
      { avoid: [...lineObstacles(cpts, u, 2, 0.6), ...[...tp, ...(lyaBox ? [lyaBox] : [])].map(b => ({ x: b.x - px / 3, y: b.y - px / 3, w: b.w + 2 * px / 3, h: b.h + 2 * px / 3 }))], bounds: boundsT });
  }
  const P = L.ratio;
  const X = scale(0, xmax, P.x, P.x + P.w), Y = scale(RATIO.range[0], RATIO.range[1], P.y + P.h, P.y);
  axes(g, P, { x: timeAxis(X), y: { s: Y, label: DIST_WORDS.yRatio, ticks: RATIO.ticks.map(v => ({ v, label: ratioTick(v) })) } }, env, { alpha: a, xAlpha: xr });
  const ya = a * names;
  const capX = P.x + P.w - 1.0 * u, capY = j => P.y + 1.2 * u + 0.8 * px + j * 1.15 * px;
  if (ya > 0) { text(g, DIST_WORDS.yRatioGloss, capX, capY(0), { px, color: T.muted, alpha: ya, italic: true, align: 'right', role: 'label' }); caveatNote(env, DIST_WORDS.yRatioGloss, ya); }
  const capParts = DM && DM.caption ? DM.caption.split(/;\s*/) : [];
  const capRows = capParts.length > 1 ? [`${capParts[0]};`, capParts.slice(1).join('; ')] : capParts;
  const capW = Math.max(measure(g, DIST_WORDS.yRatioGloss, px, true), ...capRows.map(Ln => measure(g, Ln, px, true)));
  const capOn = (o.cap || 0) > 0;
  const capBox = capOn ? { x: capX - capW, y: capY(0) - 0.8 * px, w: capW, h: (capRows.length) * 1.15 * px + 1.05 * px }
    : { x: capX - measure(g, DIST_WORDS.yRatioGloss, px, true), y: capY(0) - 0.8 * px, w: measure(g, DIST_WORDS.yRatioGloss, px, true), h: 1.05 * px };
  refLine(g, P.x, Y(1), P.x + P.w, Y(1), env, { alpha: 0.8 * a });
  const obstacles = [];
  const dim = typeof o.dim === 'function' ? o.dim : () => 1;
  const curves = [];
  const greyAll = (o.grey || 0) > 0;
  if (DM && (o.mod || 0) > 0) {
    const n = DM.models.length;
    const order = [...DM.models].sort((p, q) => (q.lcdm ? 1 : 0) - (p.lcdm ? 1 : 0));
    clipped(g, P, () => order.forEach((m, i) => {
      const t = clamp01(((o.mod || 0) - i / n) * n);
      if (!(t > 0)) return;
      const out = !m.lcdm && m.inside && m.inside['DESI+CMB'] === 'outside' || m.lcdm;
      const fa = a * (out ? 1 - (1 - T.pale) * smooth(o.sel || 0) : 1) * dim(m);
      const z0 = xmax - t * (xmax - DM.z[0]), ink = greyAll ? grey : modelInk(T, m, DM);
      const pts = DM.z.map((z, k) => [z, m.ratio[k]]).filter(([z]) => z >= z0 && z <= xmax + 0.02).map(([z, v]) => [X(z), Y(v)]);
      polyline(g, pts, ink, env, { lw: MODEL_LW, alpha: fa, dash: m.lcdm ? [1.4, 0.8] : undefined });
      let ga = 0;
      if (!m.lcdm && !greyAll) { const gz = RATIO.zGlyph; ga = fa * smooth(clamp01((gz + 0.25 - z0) / 0.25)); if (ga > 0) glyph(g, m.glyph, X(gz), Y(at(DM.z, m.ratio, gz)), 0.9 * u, ink, env, { alpha: ga, lw: 0.3 }); }
      curves.push({ m, pts, fa, ga, done: t >= 1, ink, tagA: greyAll ? 0 : smooth(clamp01((t - 0.85) / 0.15)) });
    }));
  }
  rg.forEach(p => {
    if (!p.err) return;
    errorBar(g, X(p.x), Y(p.y), { ylo: Y(p.err[0]), yhi: Y(p.err[1]) }, grey, env, { alpha: a, lw: 0.28 });
    glyph(g, 'circle', X(p.x), Y(p.y), 0.72 * u, grey, env, { alpha: a });
  });
  const fsT = D.lyaFs ? smooth(o.fs || 0) : 0;
  if (rl && rl.err) {
    const aOpen = LW ? a * (1 - fsT) : a;
    errorBar(g, X(rl.x), Y(rl.y), { ylo: Y(rl.err[0]), yhi: Y(rl.err[1]) }, T.accent, env, { alpha: aOpen, lw: 0.4 });
    glyph(g, 'circle-open', X(rl.x), Y(rl.y), 1.15 * u, T.accent, env, { alpha: aOpen, lw: 0.4 });
    if (fsT > 0) {
      const F = D.lyaFs, xf = X(rl.x + (LW ? 0 : LYA_DODGE));
      errorBar(g, xf, Y(F.y), { ylo: Y(F.err[0]), yhi: Y(F.err[1]) }, T.accent, env, { alpha: a * fsT, lw: 0.4 });
      glyph(g, 'circle', xf, Y(F.y), 1.15 * u, T.accent, env, { alpha: a * fsT });
      const pn = TEXT.min * u, kx = xf + 1.6 * u, ky = Y(Math.max(F.err[1], rl.err[1])) - 1.6 * u - 1.35 * pn;
      if (!LW) [['circle-open', 'BAO alone'], ['circle', '+ full shape']].forEach(([gl, t], i) => {
        const yy = ky + i * 1.35 * pn;
        glyph(g, gl, kx, yy, 0.75 * u, T.accent, env, { alpha: a * fsT, lw: 0.35 });
        text(g, t, kx + 1.3 * u, yy + 0.35 * pn, { px: pn, color: T.ink, alpha: a * fsT, role: 'label' });
      });
    }
  }
  const sa = a * smooth(o.sn || 0);
  if (SN && sa > 0) clipped(g, P, () => SN.points.forEach(p => {
    errorBar(g, X(p.x), Y(p.y), { ylo: Y(p.err[0]), yhi: Y(p.err[1]) }, snInk(T), env, { alpha: sa, lw: SN_LW, cap: 0.45 });
    glyph(g, 'square', X(p.x), Y(p.y), SN_GLYPH * u, snInk(T), env, { alpha: sa });
  }));
  const na = a * names * (1 - topK);
  const anc = smooth(o.marks || 0);
  const fixed = [capBox];
  let lyaName = null, ancName = null;
  if (rl && rl.err) {
    const yb = Y(rl.err[0]);
    const A1 = LW ? 'the forest' : 'DESI Lyα', A2 = LW && lya && lya.lookback ? `${Math.round(+lya.lookback)} billion years ago` : `z = ${rl.x}`, xr0 = X(rl.x) + 1.2 * u, y1 = yb + 1.2 * u + 0.8 * pl, w1 = Math.max(measure(g, A1, pl), measure(g, A2, px, true));
    lyaName = { A1, A2, xr0, y1, box: { x: xr0 - w1, y: y1 - 0.8 * pl, w: w1, h: 1.0 * pl + 0.25 * px + 0.8 * pl } };
    fixed.push(lyaName.box, { x: X(rl.x) - 1.6 * u, y: Y(rl.err[1]) - 0.5 * u, w: 3.2 * u, h: Y(rl.err[0]) - Y(rl.err[1]) + 1.0 * u, pad: 0.3 * u });
    if (lya) {
      const B1 = LW ? 'the forest: the anchor' : 'Lyα: the anchor', B2 = LW && lya.lookback ? `${Math.round(+lya.lookback)} billion years ago` : `z = ${rl.x}${lya.lookback ? ` · ${lya.lookback} Gyr ago` : ''}`;
      const B3 = greyAll && D.lyaFs ? `${LW ? 'the forest’s point' : 'full shape + BAO'}: ${D.lyaFs.cite}` : null;
      const xa0 = X(rl.x) - 1.6 * u, wa1 = Math.max(measure(g, B1, pl), measure(g, B2, px, true), B3 ? measure(g, B3, px, true) : 0);
      ancName = { B1, B2, B3, xa0, y1, box: { x: xa0 - wa1, y: y1 - 0.8 * pl, w: wa1, h: 1.2 * pl + 0.25 * px + 0.8 * pl + (B3 ? 1.15 * px : 0) } };
    }
  }
  const anchorLayout = (o.shrink || 0) > 0;
  let agree = null;
  if (rl && DM) {
    const w = measure(g, DIST_WORDS.agree, px, true), xr = X(rl.x) - 1.2 * u, z0 = RATIO.xmax * (xr - w - P.x) / P.w;
    const top = Math.min(...DM.models.flatMap(m => DM.z.map((z, k) => [z, m.ratio[k]]).filter(([z]) => z >= z0 && z <= rl.x).map(([, v]) => Y(v))));
    const yb = top - 0.7 * u - 0.25 * px;
    agree = { x: xr, y: yb, box: { x: xr - w, y: yb - 0.8 * px, w, h: 1.05 * px } };
  }
  const colTop = capBox.y + capBox.h + 0.6 * u;
  if (anchorLayout && ancName) {
    fixed.push(ancName.box);
    if (agree) fixed.push(agree.box);
    if (rl) fixed.push({ x: X(rl.x) - 0.4 * u, y: colTop, w: 0.8 * u, h: P.y + P.h - colTop, pad: 0.3 * u });
  }
  const places = ratioPlaces(env, P, X, Y, D, DM, SN, fixed, anchorLayout, capOn);
  if (rl && rl.err && na > 0) {
    const nt = turns(anc);
    if (nt.out > 0) irisBlock(g, lyaName.box, pl, () => {
      text(g, lyaName.A1, lyaName.xr0, lyaName.y1, { px: pl, color: T.accent, alpha: na * nt.out, align: 'right', role: 'label' });
      text(g, lyaName.A2, lyaName.xr0, lyaName.y1 + 1.0 * pl, { px, color: T.muted, alpha: na * nt.out, align: 'right', italic: true, role: 'label' });
    });
    if (nt.in > 0 && ancName) irisBlock(g, ancName.box, pl, () => {
      text(g, ancName.B1, ancName.xa0, ancName.y1, { px: pl, color: T.accent, alpha: na * nt.in, align: 'right', role: 'label' });
      text(g, ancName.B2, ancName.xa0, ancName.y1 + 1.2 * pl, { px, color: T.muted, alpha: na * nt.in, align: 'right', italic: true, role: 'label' });
      if (ancName.B3 && fsT > 0) text(g, ancName.B3, ancName.xa0, ancName.y1 + 1.2 * pl + 1.15 * px, { px, color: T.accent, alpha: na * nt.in * fsT, align: 'right', role: 'label' });
    });
  }
  if (na > 0) {
    const ba = na * (o.baoNames === undefined ? 1 : o.baoNames);
    for (const p of rg) { const n = places.bao[p.id]; if (n) drawName(env, n, px, ba); }
    for (const c of curves) {
      const b = places.model[c.m.id];
      if (!b || c.m.lcdm || !(c.tagA > 0)) continue;
      text(g, modelTag(c.m), b.x, b.y + 0.8 * px, { px, color: c.ink, alpha: na * (c.fa / a) * c.tagA, role: 'label' });
    }
    if (places.key && places.key.rows) for (const r of places.key.rows) {
      const c = curves.find(q => q.m === r.m);
      if (!c || !(c.tagA > 0)) continue;
      const ka = na * (c.fa / a) * c.tagA, kx = places.key.x, ky = r.y - 0.34 * px;
      glyph(g, r.m.glyph, kx + 0.9 * u, ky, 0.7 * u, c.ink, env, { alpha: ka, lw: 0.3 });
      polyline(g, [[kx + 1.8 * u, ky], [kx + 4.0 * u, ky]], c.ink, env, { lw: MODEL_LW, alpha: ka });
      text(g, modelTag(r.m), kx + places.key.lead, r.y, { px, color: c.ink, alpha: ka, role: 'label' });
    }
    const lc = curves.find(c => c.m.lcdm && c.tagA > 0);
    if (lc && places.lcdm) places.lcdm.rows.forEach((Ln, j) => text(g, Ln, places.lcdm.box.x, places.lcdm.box.y + 0.8 * px + j * 1.15 * px, { px, color: T.ink, alpha: na * (lc.fa / a) * lc.tagA, role: 'label' }));
    if (SN && places.sn && sa > 0) irisBlock(g, places.sn.box, px, () => {
      text(g, places.sn.rows[0], places.sn.box.x, places.sn.box.y + 0.8 * px, { px, color: snInk(T), alpha: sa * names, role: 'label' });
      text(g, places.sn.rows[1], places.sn.box.x, places.sn.box.y + 0.8 * px + 1.15 * px, { px, color: T.muted, alpha: sa * names, italic: true, role: 'label' });
      caveatNote(env, `${places.sn.rows[0]}: ${places.sn.rows[1]}`, sa);
    });
  }
  const famA = a * names * smooth(o.family || 0);
  if (greyAll && famA > 0) text(g, DIST_WORDS.family, X(0.22), P.y + 1.2 * u + 0.8 * px, { px, color: grey, alpha: famA, role: 'label' });
  const capA = a * (o.cap || 0) * names;
  if (capRows.length && capA > 0) {
    capRows.forEach((Ln, j) => text(g, Ln, capX, capY(j + 1), { px, color: T.muted, alpha: capA, italic: true, align: 'right', role: 'label' }));
    caveatNote(env, DM.caption, capA);
  }
  const sha = a * smooth(o.share || 0);
  if (D.de && sha > 0) {
    const S = L.share, Ys = scale(0, 0.8, S.y + S.h, S.y);
    axes(g, S, { x: timeAxis(X) }, env, { alpha: sha });
    const sp = D.de.z.map((z, i) => [z, D.de.f[i]]).filter(([z]) => z <= xmax);
    g.save(); g.globalAlpha *= 0.14 * sha; g.fillStyle = T.ink; g.beginPath(); g.moveTo(X(sp[0][0]), Ys(0));
    sp.forEach(([z, f]) => g.lineTo(X(z), Ys(f))); g.lineTo(X(sp[sp.length - 1][0]), Ys(0)); g.closePath(); g.fill(); g.restore();
    polyline(g, sp.map(([z, f]) => [X(z), Ys(f)]), T.ink, env, { lw: 0.3, alpha: sha });
    const v0 = `≈ ${Math.round(100 * shareAt(D.de, 0))}%`;
    text(g, v0, S.x - 0.8 * u - 0.5 * u, Ys(shareAt(D.de, 0)) + 0.34 * px, { px, color: T.ink, alpha: sha, align: 'right', role: 'label' });
    yTitle(env, S, DIST_WORDS.shareY, [v0], { alpha: sha });
    const cx = X(1.2), cy = S.y + 1.0 * u + 0.8 * px;
    text(g, DIST_WORDS.share, cx, cy, { px, color: T.ink, alpha: sha, role: 'label' });
    text(g, DIST_WORDS.shareGloss, cx, cy + 1.15 * px, { px, color: T.muted, alpha: sha, italic: true, role: 'label' });
    caveatNote(env, DIST_WORDS.shareGloss, sha);
    if (rl) {
      const vL = `≈ ${Math.round(100 * shareAt(D.de, rl.x))}% ${LW ? 'then' : `at z = ${rl.x}`}`, ma = sha * anc;
      if (ma > 0) text(g, vL, X(rl.x) - 1.2 * u, Ys(shareAt(D.de, rl.x)) - 1.2 * u, { px, color: T.ink, alpha: ma, align: 'right', role: 'label' });
    }
  }
  if (rl && anc > 0 && sha > 0) {
    const ma = a * anc, S = L.share;
    refLine(g, X(rl.x), colTop, X(rl.x), S.y + S.h, env, { alpha: 0.8 * ma, color: T.muted, lw: 0.3 });
    if (agree) text(g, DIST_WORDS.agree, agree.x, agree.y, { px, color: T.ink, alpha: ma, italic: true, align: 'right', role: 'label' });
  }
  return { L, X, Y, curves };
}
const LYA_DODGE = 0.09;
export function drawStack(...args) { return tagged(args[0].g, 'lya', () => drawStack__(...args)); }
