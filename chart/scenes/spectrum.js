import { TEXT, axes, scale, text, measure, smooth, lerp, clamp01, glyph, errorBar, LOOKS, mixHex, wrap, polyline, refLine, tagged, irisBlock, niceTicks, fmt, hatch, plate } from '../kit.js';
import { area, panels, footLayout, plotBottomAbove, unavailable, awaiting, waveArrow, turns, caveatNote } from './common.js';
import { HERO_FRAME, heroLine } from '../../survey/camera.js';
import { heroCutText } from '../../survey/marks.js';
import { FEET, SECTION8 } from '../../survey/provenance.js';
export const HERO_R = 1.05;
const REST_LL = 0.05, REST_LYA = 0.30;
const SERIES_LL = 0.14, SERIES_LYB = 0.58, ZOOM_IN = [0.25, 0.31], ZOOM_OUT = [0.43, 0.47], F_SERIES = 1.08, F_SERIES_SIM = 1.018;
const STRETCH = [0.30, 0.33, 0.44, 0.48, 0.54, 0.58];
export const SERIES_SHOW = 0.45;
const CLOSE_NOTES = ['dips from Lyβ on: drawn stronger, to be seen', 'dotted: the light bluer than DESI records'];
const SHARE_ALPHA = [0.64, 0.38];
export function seriesShow(LY, ex = 1) {
  const G = LY.gates, rb = G[0].r, E = G.find(q => q.n === 6) || G[G.length - 1], se = SERIES_SHOW * Math.sqrt(E.r / rb);
  return G.map(q => lerp(q.r, q.n <= 6 ? SERIES_SHOW * Math.sqrt(q.r / rb) : (se * q.r) / E.r, ex));
}
const pwlInt = (K, p) => {
  let s = 0;
  for (let i = 1; i < K.length && p > K[i - 1][0]; i++) {
    const [x0, y0] = K[i - 1], [x1, y1] = K[i], xe = Math.min(p, x1);
    s += ((y0 + y0 + ((y1 - y0) * (xe - x0)) / (x1 - x0)) / 2) * (xe - x0);
  }
  return s;
};
const HAT1 = [[STRETCH[0], 0], [STRETCH[1], 1], [STRETCH[2], 1], [STRETCH[3], 0]], HAT2 = [[STRETCH[2], 0], [STRETCH[3], 1], [STRETCH[4], 1], [STRETCH[5], 0]];
export function stretchLn(p, lnS, lnG) {
  const v1 = lnS / pwlInt(HAT1, STRETCH[2]), v2 = Math.max(0, (lnG - v1 * pwlInt(HAT1, STRETCH[5])) / pwlInt(HAT2, STRETCH[5]));
  return Math.min(lnG, v1 * pwlInt(HAT1, p) + v2 * pwlInt(HAT2, p));
}
import { RECORD_HALFW } from '../../ghosts-spike/ghosts.js';

function layout(env, M, alpha = 1, sepT = 0, simT = 0, dataT = 1) {
  const { u } = env;
  const A = area(env);
  const S = env.charts.separations, t = turns(sepT);
  const F = footLayout(env, A, [{ foot: M.foot, alpha: alpha * (S && M.fine ? t.out : 1) * dataT }]);
  const Fsim = M.sim && simT > 0 ? footLayout(env, A, [{ foot: M.sim.foot, alpha: alpha * simT }]) : null;
  const Fs = S && M.fine ? footLayout(env, A, [{ foot: { lines: [`${M.foot.lines[0]} · ${String(S.foot.lines[0] || '').split(/;\s*/)[0]}`], optional: S.foot.optional || [] }, alpha: alpha * t.in }]) : null;
  A.plotBottom = Math.min(A.plotBottom, F.top - 10.6 * u);
  return { A, F: { top: F.top, draw() { F.draw(); if (Fs) Fs.draw(); if (Fsim) Fsim.draw(); } }, P: panels(env, A).solo };
}

function yTitle(env, P, yr, label, alpha = 1) {
  const { g, u, T } = env;
  if (!(alpha > 0) || !label) return;
  const tp = TEXT.label * u, pm = TEXT.min * u, n = niceTicks(Math.min(...yr), Math.max(...yr));
  const wMax = n.ticks.reduce((m, v) => Math.max(m, measure(g, fmt(v, n.decimals), TEXT.tick * u)), 0);
  const xb = P.x - 0.8 * u - 0.5 * u - wMax - 0.7 * u - 0.25 * tp, yc = P.y + P.h / 2;
  const m = /^(\S+)\s+(.+)$/.exec(String(label)), word = m ? m[1] : String(label), unit = m ? m[2] : '';
  const w1 = measure(g, word, tp), gap = unit ? measure(g, ' ', tp) : 0, w = w1 + gap + (unit ? measure(g, unit, pm) : 0);
  irisBlock(g, { x: xb - 0.8 * tp, y: yc - w / 2, w: 1.05 * tp, h: w }, tp, () => {
    g.save(); g.translate(xb, yc); g.rotate(-Math.PI / 2);
    text(g, word, -w / 2, 0, { px: tp, color: T.ink, alpha, role: 'axis' });
    if (unit) text(g, unit, -w / 2 + w1 + gap, 0, { px: pm, color: T.ink, alpha, role: 'axis', cont: true });
    g.restore();
  });
}

function drawSpectrum__(env, st) {
  const op0 = st.op === undefined ? 1 : st.op;
  const sepA = st.sepA || 0, sepB = st.sepB || 0, sepC = st.sepC || 0, op = op0;
  if (!(op > 0)) return;
  const M = env.charts.spectrum;
  const { g, u, T, W, H, dpr } = env;
  if (!M) { unavailable(env, panels(env, area(env)).solo, 'spectrum', st.line * op); return; }
  const lv0 = st.lvl || 0, simT = M.sim ? smooth(clamp01((lv0 - 0.05) / 0.04)) * (1 - smooth(clamp01((lv0 - 0.86) / 0.05))) : 0;
  const dataT = M.sim && lv0 > 0 && lv0 < 1 ? Math.max(1 - smooth(clamp01((lv0 - 0.005) / 0.035)), smooth(clamp01((lv0 - 0.93) / 0.05))) : 1;
  const { F, P: P0 } = layout(env, M, smooth(clamp01((st.open - 0.3) / 0.7)) * op, clamp01(((st.sepA || 0) - 0.55) / 0.45), simT, dataT);
  const bandS = M.path ? smooth(clamp01(((st.lvl || 0) - 0.02) / 0.08)) * (1 - smooth(clamp01(((st.zoom || 0) - 0.10) / 0.25))) : 0;
  const bandA = M.path ? smooth(clamp01(((st.lvl || 0) - 0.09) / 0.08)) * (1 - smooth(clamp01((st.zoom || 0) / 0.12))) : 0;
  const P = bandS > 0 ? { ...P0, y: P0.y + PATH_BAND * env.u * bandS, h: P0.h - PATH_BAND * env.u * bandS } : P0;
  const open = smooth(st.open), wide = smooth(st.wide), zoom = smooth(st.zoom), arrow = smooth(st.arrow);
  const [f0, f1] = M.forest;
  const p = st.lvl === undefined ? 1 : st.lvl;
  const inRest = smooth(clamp01(p / 0.14)), outRest = smooth(clamp01((p - 0.60) / 0.08)), close = smooth(clamp01((p - 0.84) / 0.16));
  const lyaR = M.constants.lambda_nm, g1 = 1 / (1 + M.z), lnZ = Math.log(1 + M.z);
  const SIM = M.sim, lnG = Math.min(lnZ, Math.log((1.01 * lyaR) / Math.max(M.wave[0] * g1, SIM ? SIM.lo : 0)));
  const lnF = p < STRETCH[0] ? 0 : p < 0.68 ? stretchLn(p, Math.min(Math.log(SIM && !SIM.full ? F_SERIES_SIM : F_SERIES), 0.5 * lnG), lnG) : lerp(lnG, lnZ, smooth(clamp01((p - 0.68) / 0.16)));
  const zIn = M.lyman ? smooth(clamp01((p - ZOOM_IN[0]) / (ZOOM_IN[1] - ZOOM_IN[0]))) * (1 - smooth(clamp01((p - ZOOM_OUT[0]) / (ZOOM_OUT[1] - ZOOM_OUT[0])))) : 0;
  const gEff = p >= 0.84 ? 1 : Math.exp(lnF) * g1;
  const copyA = p >= 1 ? 0 : smooth(clamp01((p - 0.04) / 0.12));
  const obsA = p >= 1 ? 1 : lerp(1, 0.3, smooth(clamp01(p / 0.12))) * (1 - smooth(clamp01((p - 0.86) / 0.12)));
  const gateA = smooth(clamp01((p - 0.16) / 0.08)) * (1 - smooth(clamp01((p - 0.59) / 0.04)));
  const modelA = smooth(clamp01((p - 0.18) / 0.08)) * (1 - smooth(clamp01((p - (M.sim && !M.sim.full ? 0.55 : 0.46)) / (M.sim && !M.sim.full ? 0.035 : 0.08))));
  const lvl = smooth(clamp01((p - 0.20) / 0.14));
  const landed = smooth(clamp01((p - 0.86) / 0.12));
  const emitted = smooth(clamp01((p - 0.93) / 0.07));
  const barA = 1 - smooth(clamp01(p / 0.1)) * (1 - landed);
  const obsName = smooth(clamp01((p - 0.66) / 0.04)) * (1 - smooth(clamp01((p - 0.80) / 0.04)));
  const dataName = smooth(clamp01((p - 0.18) / 0.08)) * (1 - smooth(clamp01((p - 0.59) / 0.04))) * (1 - smooth(clamp01(zIn / 0.25)));
  const win = (a0, a1, b0, b1) => (p > 0 && p < 1 ? smooth(clamp01((p - a0) / (a1 - a0))) * (1 - smooth(clamp01((p - b0) / (b1 - b0)))) : 0);
  const wObs = p >= 1 || p <= 0 ? 1 : Math.max(1 - smooth(clamp01((p - 0.02) / 0.04)), smooth(clamp01((p - 0.86) / 0.06)));
  const words = [['observed wavelength [nm]', wObs], ["wavelength in the quasar's frame [nm]", win(0.07, 0.12, 0.27, 0.31)],
    ['wavelength [nm], stretching', win(0.33, 0.37, 0.79, 0.83)]];

  const HL = heroLine(M.quasarFrac, W, H);
  const lin = (d0, d1, r0, r1) => [(r1 - r0) / (d1 - d0), r0 - ((r1 - r0) / (d1 - d0)) * d0];
  const mix = (p0, q, t) => [lerp(p0[0], q[0], t), lerp(p0[1], q[1], t)];
  const lineX = lin(f0, f1, HL.x0, HL.x1), forestP = lin(f0, f1, P.x, P.x + P.w), fullP = lin(M.full[0], M.full[1], P.x, P.x + P.w);
  const bothP = lin(0, M.full[1], P.x, P.x + P.w);
  const LY = M.lyman, llR = LY ? LY.limit : M.lybNm - 0.25 * (lyaR - M.lybNm);
  const wR = (lyaR - llR) / (REST_LYA - REST_LL), rlo = llR - REST_LL * wR, restP0 = lin(rlo, rlo + wR, P.x, P.x + P.w);
  const lyb = LY ? LY.lines[1].lambda_nm : M.lybNm, wS = (lyb - llR) / (SERIES_LYB - SERIES_LL), slo = llR - SERIES_LL * wS;
  const restP = zIn > 0 ? mix(restP0, lin(slo, slo + wS, P.x, P.x + P.w), zIn) : restP0;
  const base = mix(mix(lineX, forestP, open), fullP, wide);
  const Fv = fineBracket(M, env.charts.separations), fineT = Fv ? smooth(clamp01(sepA / 0.55)) : 0;
  const fineP = Fv ? lin(Fv.v0, Fv.v1, P.x, P.x + P.w) : forestP;
  const xm = mix(mix(mix(mix(mix(base, restP, inRest), bothP, outRest), base, close), forestP, zoom), fineP, fineT);
  const X = l => xm[0] * l + xm[1];
  const Xinv = x => (x - xm[1]) / xm[0];
  const yr = [0, 1].map(i => lerp(lerp(M.yForest[i], M.yFull[i], wide), M.yForest[i], zoom));
  if (fineT > 0) { const rb = fineRows(env, P)[3] + (3.6 + CITE_LEAD * TEXT.min) * u, frac = (rb - P.y) / P.h; yr[1] = lerp(yr[1], Math.max(yr[1], yr[0] + (Fv.fmax - yr[0]) / (1 - frac)), fineT); }
  const Yp = f => P.y + P.h - ((f - yr[0]) / (yr[1] - yr[0])) * P.h;
  const lineY = HERO_FRAME.y * H, barY = P.y + 1.2 * u;
  const Y = f => lerp(lineY, Yp(f), open);
  const a = op;
  const pxF = TEXT.label * u, wF = measure(g, 'Lyα forest', pxF), nxF = Math.max(P.x + 1.4 * u, Math.min(X(f0) + 0.5 * u, X(f1) - wF - 4 * u)), byF = barY + 1.0 * u + 0.8 * pxF;
  const byC = P.y + 1.2 * u + 1.0 * u + 1.05 * TEXT.label * u + 0.6 * u + 0.8 * TEXT.min * u, wC = M.title ? measure(g, M.title, TEXT.min * u, true) : 0;
  const idBox = { x: Math.min(nxF, P.x + 1.0 * u), y: byF - 0.8 * pxF, w: Math.max(nxF + wF, P.x + 1.0 * u + wC) - Math.min(nxF, P.x + 1.0 * u), h: byC + 0.25 * TEXT.min * u - (byF - 0.8 * pxF) };
  const D = LOOKS.dark, lc = st.lc === undefined ? 1 : smooth(st.lc);
  const cLine = mixHex(D.accent, T.accent, lc), cQso = mixHex(D.tracers.QSO.color, T.ink, lc), cWord = mixHex(D.ink, T.ink, lc);

  const axA = smooth(clamp01((st.open - 0.3) / 0.7)) * a;
  if (axA > 0) {
    const Xs = scale(Xinv(P.x), Xinv(P.x + P.w), P.x, P.x + P.w), Ys = scale(yr[0], yr[1], P.y + P.h, P.y);
    axes(g, P, { x: { s: Xs, label: '' }, y: { s: Ys, label: '' } }, env, { alpha: axA });
    yTitle(env, P, yr, M.fluxUnit, axA);
    const capA = axA * (1 - smooth(clamp01((st.lvl || 0) / 0.06)) * (1 - smooth(clamp01(((st.zoom || 0) - 0.35) / 0.3))));
    if (capA > 0) irisBlock(g, idBox, pxF, () => text(g, M.title, P.x + 1.0 * u, byC, { px: TEXT.min * u, color: T.muted, alpha: capA, italic: true, role: 'label' }));
    strip(env, M, P, X, Xinv, axA, arrow, zoom, words);
  }

  const exA = SIM ? 0 : smooth(clamp01((zIn - 0.6) / 0.4));
  const edgeA = SIM && SIM.full ? smooth(clamp01((zIn - 0.6) / 0.4)) : exA;
  const lw0 = Math.max(1, 0.15 * u), echo = LY && LY.echo, blue = LY && LY.blue, show = LY && LY.gates ? seriesShow(LY, exA) : null;
  const blueA = blue ? smooth(clamp01((p - 0.22) / 0.08)) * (1 - smooth(clamp01((p - ZOOM_OUT[0]) / (ZOOM_OUT[1] - ZOOM_OUT[0])))) : 0;
  const trace = (gf, alpha, gate, src = M.flux) => {
    if (!(alpha > 0)) return;
    g.save(); g.beginPath(); g.rect(P.x, P.y, P.w, P.h); g.clip();
    g.globalAlpha *= alpha; g.lineJoin = 'round'; if (g.__mark) g.__mark('line');
    const xl = Xinv(P.x) - 1, xr = Xinv(P.x + P.w) + 1;
    g.beginPath();
    let pen = false;
    for (let i = 0; i < M.wave.length; i++) {
      const l = M.wave[i] * gf, v = (!gate || l >= lyaR) && M.good[i] ? src[i] : NaN;
      if (!Number.isFinite(v) || l < xl || l > xr) { pen = false; continue; }
      const x = X(l), y = Y(v);
      if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
    }
    g.strokeStyle = T.ink; g.lineWidth = lw0; g.stroke();
    if (gate && M.model && (src !== M.flux || !SIM)) preLight(gf / g1, xl, xr);
    g.restore();
  };
  const preLight = (f, xl, xr) => {
    const G = LY && LY.gates, pts = [];
    const add = (le, C, sch, tauOf) => {
      const l = le * f;
      if (!(l < lyaR) || l < xl || l > xr || !Number.isFinite(C) || (SIM && le < SIM.lo)) { pts.push(null); return; }
      const met = [];
      if (G) for (let k = G.length - 1; k >= 0; k--) {
        const lk = G[k].lambda_nm;
        if (le < lk && l >= lk) { const t = tauOf(k); met.push({ k, t: Number.isFinite(t) ? (show[k] / G[k].r) * t : 0 }); }
      }
      pts.push({ x: X(l), C, sch, met, T: met.reduce((s0, q) => s0 + q.t, 0) });
    };
    if (blue && blueA > 0) { for (let j = 0; j < blue.lam.length; j++) add(blue.lam[j], blue.level, true, k => blue.tau[k][j]); pts.push(null); }
    const eIdx = echo && G ? G.map((_, k) => echo.gate.indexOf(k)) : null;
    for (let i = 0; i < M.wave.length; i++) add(M.wave[i] * g1, M.model[i], false, k => (eIdx && eIdx[k] >= 0 ? echo.tau[eIdx[k]][i] : NaN));
    const ga = g.globalAlpha, aOf = q => (q.sch ? blueA : 1);
    if (G) {
      g.save(); g.fillStyle = T.accent;
      for (let k = 0; k < G.length; k++) {
        if (g.__mark) g.__mark(`share:${G[k].n}`);
        let run = [];
        const flush = () => {
          if (run.length > 1) {
            g.globalAlpha = ga * SHARE_ALPHA[k % 2] * aOf(run[0].q);
            g.beginPath(); run.forEach((r0, j) => (j ? g.lineTo(r0.x, r0.y0) : g.moveTo(r0.x, r0.y0)));
            for (let j = run.length - 1; j >= 0; j--) g.lineTo(run[j].x, run[j].y1);
            g.closePath(); g.fill();
          }
          run = [];
        };
        for (const q of pts) {
          const m = q && q.met.findIndex(e => e.k === k);
          if (!q || m < 0 || (run.length && run[run.length - 1].q.sch !== q.sch)) { flush(); if (!q || m < 0) continue; }
          const tb = q.met.slice(0, m).reduce((s0, e) => s0 + e.t, 0);
          run.push({ q, x: q.x, y0: Y(q.C * Math.exp(-tb)), y1: Y(q.C * Math.exp(-tb - q.met[m].t)) });
        }
        flush();
      }
      g.restore();
    }
    const stroke = (sch, val, dash, lw, al = 1) => {
      if (!(al > 0)) return;
      g.save(); g.globalAlpha = ga * al * (sch ? blueA : 1); g.strokeStyle = T.muted; g.lineWidth = lw; g.lineCap = sch ? 'round' : 'butt';
      if (dash) g.setLineDash(dash);
      g.beginPath(); let pen = false;
      for (const q of pts) {
        const v = q && q.sch === sch ? val(q) : NaN;
        if (!Number.isFinite(v)) { pen = false; continue; }
        const y = Y(v);
        if (pen) g.lineTo(q.x, y); else { g.moveTo(q.x, y); pen = true; }
      }
      g.stroke(); g.restore();
    };
    const lwM = Math.max(1.5, 0.3 * u), lwE = Math.max(1, lerp(0.18, 0.26, exA) * u);
    for (const sch of blueA > 0 ? [false, true] : [false]) {
      const dash = sch ? [0.05 * u, 0.6 * u] : [1.1 * u, 0.7 * u];
      stroke(sch, q => (q.met.length ? NaN : q.C), dash, lwM);
      stroke(sch, q => (q.met.length ? q.C : NaN), dash, lwM, edgeA);
    }
    for (const sch of blueA > 0 ? [false, true] : [false]) stroke(sch, q => (q.met.length ? q.C * Math.exp(-q.T) : NaN), null, lwE);
  };
  const ta = open * a;
  const sdA = M.sdss ? smooth(clamp01(st.sdss || 0)) * a * open : 0;
  if (sdA > 0) bossTrace(env, M, P, X, Y, sdA);
  trace(1, ta * obsA, false);
  const simA = SIM ? 1 - smooth(clamp01((p - 0.86) / 0.12)) : 0;
  if (copyA > 0 && SIM) { trace(gEff, ta * copyA * simA, true, SIM.flux); if (simA < 1) trace(gEff, ta * copyA * (1 - simA), true); }
  else if (copyA > 0) trace(gEff, ta * copyA, true);

  const gA = gateA * a * (1 - zoom), gLine = gA, gName = gA * (1 - smooth(clamp01(zIn / 0.06)));
  const gx = X(lyaR), pxL = lerp(TEXT.label, TEXT.min, bandS) * u;
  if (gLine > 0 && gx > P.x && gx < P.x + P.w) {
    g.save(); g.globalAlpha *= gLine; g.strokeStyle = T.accent; g.lineWidth = Math.max(1.5, 0.3 * u);
    g.beginPath(); g.moveTo(gx, P.y + 0.5 * u); g.lineTo(gx, P.y + P.h); g.stroke(); g.restore();
  }
  if (gName > 0 && gx > P.x && gx < P.x + P.w) {
    text(g, `${LY ? 'Lyα ' : ''}${lyaR} nm`, gx + 1.0 * u, P.y + 1.4 * u + 0.8 * pxL, { px: pxL, color: T.accent, alpha: gName, role: 'label' });
    text(g, 'hydrogen absorbs here', gx + 1.0 * u, P.y + 1.4 * u + 0.8 * pxL + 1.25 * pxL, { px: pxL, color: T.accent, alpha: gName, role: 'label' });
  }
  if (LY) series(env, M, P, X, a * (1 - zoom) * smooth(clamp01((p - 0.22) / 0.08)) * (1 - smooth(clamp01((p - 0.59) / 0.04))), zIn, p >= ZOOM_IN[1]);
  const mA = modelA * gateA * a * (M.model ? 1 : 0);
  if (mA > 0) {
    const px = TEXT.min * u, y0 = P.y + 1.4 * u + 0.8 * pxL, lead = 1.25 * px;
    const room = gx - 1.0 * u - (P.x + 0.6 * u);
    const L = [["the quasar's light", T.ink, false], ['before absorption,', T.ink, false], ['a model', T.muted, true]];
    L.forEach(([t, c, it], i) => text(g, t, P.x + 0.6 * u, y0 + i * lead, { px, color: c, alpha: mA, italic: it, role: 'label' }));
  }
  const notes = CLOSE_NOTES.filter(t => (/dotted/.test(t) ? !!blue : !SIM));
  const nA = LY && LY.gates && notes.length ? a * (1 - zoom) * smooth(clamp01((zIn - 0.6) / 0.4)) : 0;
  if (nA > 0) {
    const px = TEXT.min * u, y0 = P.y + 1.4 * u + 0.8 * pxL, lead = 1.25 * px;
    const x0 = P.x + 0.6 * u + measure(g, 'before absorption,', px) + 2.4 * u, x1 = insetBox(env, M, P, landed).x0 - 1.4 * u;
    const lines = notes.flatMap(t => wrap(g, t, x1 - x0, px, true));
    lines.forEach((t, i) => text(g, t, x0, y0 + i * lead, { px, color: T.muted, alpha: nA, italic: true, role: 'label' }));
  }
  if (env.test && !M.model && gateA > 0) awaiting(env, P.x + 1 * u, P.y + 3 * u, 'gp/<TARGETID>.json continuum.mu (light before absorption)');

  const ly = lerp(lineY, barY, open), lw = lerp(2 * RECORD_HALFW * dpr, Math.max(2, 0.5 * u), open);
  const cx0 = lerp(0, P.x, open), cx1 = lerp(W, P.x + P.w, open);
  if (barA > 0) {
    g.save(); g.beginPath(); g.rect(cx0, 0, cx1 - cx0, H); g.clip();
    g.globalAlpha *= a * barA; g.strokeStyle = cLine; g.lineWidth = lw; g.lineCap = 'butt';
    if (g.__mark) g.__mark('bar');
    g.beginPath(); g.moveTo(X(f0), ly); g.lineTo(X(f1), ly); g.stroke(); g.restore();
  }
  if (open > 0 && barA > 0) {
    irisBlock(g, idBox, pxF, () => text(g, 'Lyα forest', nxF, byF, { px: pxF, color: T.accent, alpha: open * a * barA, role: 'label' }));
  }

  const qa = (1 - smooth(clamp01(st.open / 0.3))) * a;
  if (qa > 0) {
    const qx = HL.xq, CT = heroCutText(heroLine(M.quasarFrac, W / dpr, H / dpr), W / dpr, H / dpr);
    glyph(g, 'circle', qx, lineY, HERO_R * u, cQso, env, { alpha: qa });
    text(g, 'quasar', CT.quasar.right * dpr, CT.quasar.baseline * dpr, { px: CT.quasar.px * dpr, color: cWord, alpha: qa, align: 'right', role: 'label', exact: true });
    text(g, '← towards us', CT.towards.left * dpr, CT.towards.baseline * dpr, { px: CT.towards.px * dpr, color: cWord, alpha: qa, role: 'label', exact: true });
    const hero = (FEET.find(([id]) => id === 'hero') || [])[1];
    if (hero) text(g, hero.replace(/\{targetid\}/g, SECTION8.targetid).replace(/\{z\}/g, SECTION8.zq.toFixed(2)), CT.foot.left * dpr, CT.foot.baseline * dpr,
      { px: CT.foot.px * dpr, color: mixHex(LOOKS.dark.foot, T.foot || T.muted, lc), alpha: qa, italic: true, role: 'foot', exact: true });
  }

  const pk2 = wide * (1 - smooth(clamp01((st.lvl || 0) / 0.06))) * (1 - zoom) * (1 - smooth(clamp01((st.sdss || 0) / 0.3))) * a;
  if (pk2 > 0) {
    const x = X(M.lyaObs);
    if (x > P.x && x < P.x + P.w) {
      const pl2 = TEXT.label * u, x0 = x + 1.4 * u, w2 = measure(g, "the quasar's own Lyα peak", pl2);
      let top = Infinity; for (let i = 0; i < M.wave.length; i++) { const xi = X(M.wave[i]); if (M.good[i] && xi >= x0 - u && xi <= x0 + w2 + u) top = Math.min(top, Y(M.flux[i])); }
      text(g, "the quasar's own Lyα peak", x0, top - 1.0 * u - 0.25 * pl2, { px: pl2, color: T.accent, alpha: pk2, role: 'label' });
    }
  }
  const peakTop = () => { let top = Infinity; for (let i = 0; i < M.wave.length; i++) if (M.good[i] && Math.abs(M.wave[i] - M.lyaObs) < 1.5) top = Math.min(top, Y(M.flux[i])); return top; };
  const zOut = 1 - smooth(clamp01(zoom / 0.3));
  const la = emitted * (1 - smooth(clamp01(zoom / 0.15))) * a;
  if (la > 0) {
    const x = X(M.lyaObs);
    if (x > P.x && x < P.x + P.w) {
      const y0 = Math.max(P.y + 3 * u, peakTop() - 1.0 * u);
      g.save(); g.globalAlpha *= la; g.strokeStyle = T.accent; g.lineWidth = Math.max(1, 0.25 * u);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 - 2.0 * u); g.stroke(); g.restore();
      text(g, `Lyα, emitted at z = ${M.zText}`, x + 1.0 * u, y0 - 0.6 * u, { px: TEXT.label * u, color: T.accent, alpha: la, role: 'label' });
    }
  }
  const pxN = lerp(TEXT.label, TEXT.min, bandS) * u;
  const nameY = (() => { const B = insetBox(env, M, P, landed); return B.y0 + B.h + lerp(2.2, 0.6, bandS) * u + 0.8 * pxN; })();
  if (dataName * a * (1 - zoom) > 0) text(g, SIM ? SIM.name : 'DESI DR1 data, partly stretched', P.x + P.w - 1.0 * u, nameY, { px: pxN, color: T.ink, alpha: dataName * a, align: 'right', role: 'label' });
  if (obsName * a * (1 - zoom) > 0) text(g, SIM ? 'the real DESI spectrum' : 'observed by DESI: where this light arrives', P.x + P.w - 1.0 * u, nameY, { px: TEXT.min * u, color: T.muted, alpha: obsName * a, align: 'right', italic: true, role: 'label' });
  const ia = lvl * zOut * a;
  if (ia > 0) inset(env, M, P, ia, landed);
  const lbA = LY && LY.lybForest.pixels > 0 ? landed * (1 - smooth(clamp01(zoom / 0.15))) * a * barA : 0;
  if (lbA > 0) {
    const pm = TEXT.min * u, xa = Math.max(P.x, X(LY.lybForest.lo)), xb = Math.min(P.x + P.w, X(LY.lybForest.hi));
    let top = Infinity; for (let i = 0; i < M.wave.length && M.wave[i] <= LY.lybForest.hi; i++) if (M.good[i]) top = Math.min(top, Y(M.flux[i]));
    const yk = top - 1.0 * u - 0.6 * u, yb = yk - 0.25 * pm - 1.0 * u;
    if (xb > xa + 2) polyline(g, [[xa, yk + 0.6 * u], [xa, yk], [xb, yk], [xb, yk + 0.6 * u]], T.muted, env, { lw: 0.18, alpha: lbA });
    text(g, 'Lyβ forest', P.x + 1.0 * u, yb, { px: pm, color: T.muted, alpha: lbA, role: 'label' });
  }
  if (sdA > 0) bossInset(env, M, P, X, Y, sdA, sdA * smooth(clamp01(((st.sdss || 0) - 0.3) / 0.7)));
  if (Fv && sepA > 0) fineMarks(env, M, env.charts.separations, P, X, a, smooth(clamp01((sepA - 0.55) / 0.45)), smooth(sepB), smooth(sepC));
  if (bandA > 0) lightPath(env, M, P0, bandA * a, p >= 0.84 ? 0 : (1 + M.z) / Math.exp(lnF) - 1);
  const sN = SIM ? a * (1 - zoom) * smooth(clamp01((zIn - 0.8) / 0.2)) : 0;
  if (sN > 0) text(g, SIM.name, P.x + P.w - 1.0 * u, nameY, { px: pxN, color: T.ink, alpha: sN, align: 'right', role: 'label' });
  F.draw();
}

const BOSS_HALF = 8;
function bossPath(g, M, X, Y, x0, x1, lo, hi) {
  const S = M.sdss;
  g.beginPath(); let pen = false, last = -Infinity;
  for (let i = 0; i < S.wave.length; i++) {
    const l = S.wave[i];
    if (l < lo || l > hi) { pen = false; continue; }
    const x = X(l), y = Y(S.flux[i]);
    if (pen && l - last < 2) g.lineTo(x, y); else g.moveTo(x, y);
    pen = true; last = l;
  }
}
function bossTrace(env, M, P, X, Y, a) {
  const { g, u, T } = env;
  g.save(); g.beginPath(); g.rect(P.x, P.y, P.w, P.h); g.clip();
  g.globalAlpha *= a; g.lineJoin = 'round'; if (g.__mark) g.__mark('boss');
  bossPath(g, M, X, Y, P.x, P.x + P.w, -Infinity, Infinity);
  g.strokeStyle = T.wash; g.lineWidth = Math.max(1, 0.2 * u); g.stroke(); g.restore();
}
export function bossBox(env, M, P) {
  const { u } = env, [f0, f1] = M.forest, c = (f0 + f1) / 2;
  return { l0: c - BOSS_HALF, l1: c + BOSS_HALF, x: P.x + 0.5 * P.w, y: P.y + 1.5 * u, w: 0.48 * P.w, h: 0.66 * P.h };
}
function bossInset(env, M, P, X, Y, a, aw = a) {
  const { g, u, T } = env, B = bossBox(env, M, P), S = M.sdss;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < M.wave.length; i++) if (M.good[i] && M.wave[i] >= B.l0 && M.wave[i] <= B.l1) { lo = Math.min(lo, M.flux[i]); hi = Math.max(hi, M.flux[i]); }
  for (let i = 0; i < S.wave.length; i++) if (S.wave[i] >= B.l0 && S.wave[i] <= B.l1) { lo = Math.min(lo, S.flux[i]); hi = Math.max(hi, S.flux[i]); }
  const pad = 0.08 * (hi - lo); lo -= pad; hi += pad;
  const mx0 = X(B.l0), mx1 = X(B.l1), my0 = Y(hi), my1 = Y(lo);
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.14 * u);
  g.strokeRect(mx0, my0, mx1 - mx0, my1 - my0);
  g.beginPath(); g.moveTo(mx0, my0); g.lineTo(B.x, B.y + B.h); g.moveTo(mx1, my0); g.lineTo(B.x + B.w, B.y + B.h); g.stroke();
  g.fillStyle = T.ground; g.fillRect(B.x, B.y, B.w, B.h); g.strokeRect(B.x, B.y, B.w, B.h); g.restore();
  const top = B.y + 1.2 * u + 3.6 * TEXT.label * u, IX = l => B.x + 1.2 * u + ((l - B.l0) / (B.l1 - B.l0)) * (B.w - 2.4 * u), IY = f => B.y + B.h - 1.2 * u - ((f - lo) / (hi - lo)) * (B.y + B.h - 1.2 * u - top);
  g.save(); g.beginPath(); g.rect(B.x, B.y, B.w, B.h); g.clip(); g.globalAlpha *= a; g.lineJoin = 'round';
  bossPath(g, M, IX, IY, 0, 0, B.l0, B.l1);
  g.strokeStyle = T.wash; g.lineWidth = Math.max(1.5, 0.32 * u); g.stroke();
  g.beginPath(); let pen = false;
  for (let i = 0; i < M.wave.length; i++) {
    if (!(M.good[i] && M.wave[i] >= B.l0 && M.wave[i] <= B.l1)) { pen = false; continue; }
    const x = IX(M.wave[i]), y = IY(M.flux[i]);
    if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
  }
  g.strokeStyle = T.ink; g.lineWidth = Math.max(1.2, 0.24 * u); g.stroke(); g.restore();
  const px = TEXT.label * u, x0 = B.x + 1.2 * u, y0 = B.y + 1.2 * u + 0.8 * px;
  [[S.desi, T.ink, 0.24], [S.boss, T.wash, 0.32]].forEach(([t, c, lw], i) => {
    const yy = y0 + i * 1.3 * px;
    polyline(g, [[x0, yy - 0.3 * px], [x0 + 2.4 * u, yy - 0.3 * px]], c, env, { lw, alpha: aw });
    text(g, t, x0 + 3.2 * u, yy, { px, color: i ? T.muted : T.ink, alpha: aw, role: 'label' });
  });
  text(g, S.cite, x0, y0 + 2 * 1.3 * px, { px: TEXT.min * u, color: T.muted, alpha: aw, italic: true, role: 'label' });
}

export const PATH_BAND = 2.5;
const PATH_NEAR = 0.16;
const GAS_ALPHA = [0.06, 0.8], GAS_LEVELS = 12, GAS_TAU_TOP = 1.5;
const GAS_NAME = "hydrogen along the path, read from this spectrum's dips", GAS_NAME_SIM = 'hydrogen along the path (simulated)';
export function pathRows(env, P0) {
  const { u } = env, top = P0.y - Math.max(7.0, 2.0 * TEXT.label) * u;
  const y = top + 5.0 * u;
  return { top, name: top + 2.5 * u, y, half: 1.1 * u, by: y + 1.6 * u, y2: y + 4.2 * u };
}
function lightPath(env, M, P0, a, zNow) {
  const { g, u, T } = env, Pa = M.path;
  if (!(a > 0) || !Pa) return;
  const chiAt = z => { const t = Pa.table, n = t.z.length - 1, x = clamp01(z / t.z[n]) * n, i = Math.min(n - 1, Math.floor(x)); return lerp(t.chi[i], t.chi[i + 1], x - i); };
  const R = pathRows(env, P0), px = TEXT.min * u, y = R.y, y2 = R.y2;
  const qName = `quasar, z = ${M.zText}`, wUs = measure(g, 'us', px), wQ = measure(g, qName, px);
  const x0 = P0.x + 0.4 * u + wUs + 2.2 * u, x1 = P0.x + P0.w - wQ - 1.6 * u, xb = x0 + PATH_NEAR * (x1 - x0);
  const X = chi => (chi <= Pa.chiBreak ? x0 + ((xb - x0) * chi) / Pa.chiBreak : xb + ((x1 - xb) * (chi - Pa.chiBreak)) / (Pa.chiQ - Pa.chiBreak));
  const xNow = X(chiAt(Math.max(0, zNow)));
  const bx0 = X(chiAt(Pa.zForest[0])), bx1 = X(chiAt(Pa.zForest[1]));
  const G = Pa.gas;
  if (G) {
    g.save(); const ga = g.globalAlpha; g.fillStyle = T.ink; if (g.__mark) g.__mark('gas');
    const lev = t => (Number.isFinite(t) ? Math.round(GAS_LEVELS * clamp01(t / GAS_TAU_TOP)) : -1);
    for (let j = 0; j < G.tau.length;) {
      const L = lev(G.tau[j]);
      let k = j + 1;
      while (k < G.tau.length && lev(G.tau[k]) === L) k++;
      if (L >= 0) {
        const xa = X(G.chi0 + j * G.step), xc = X(G.chi0 + k * G.step);
        g.globalAlpha = ga * a * lerp(GAS_ALPHA[0], GAS_ALPHA[1], L / GAS_LEVELS);
        g.fillRect(xa, y - R.half, xc - xa, 2 * R.half);
      }
      j = k;
    }
    g.restore();
    const gn = M.sim ? GAS_NAME_SIM : GAS_NAME, wG = measure(g, gn, px);
    text(g, gn, Math.max(P0.x + 1.0 * u, Math.min(x1 - wG, (bx0 + bx1) / 2 - wG / 2)), R.name, { px, color: T.ink, alpha: a, role: 'label' });
  }
  g.save(); g.globalAlpha *= a; g.lineCap = 'round';
  g.strokeStyle = T.wash; g.lineWidth = Math.max(1, 0.15 * u); g.beginPath(); g.moveTo(x0, y); g.lineTo(xNow, y); g.stroke();
  g.strokeStyle = T.accent; g.lineWidth = Math.max(1.5, 0.3 * u); g.beginPath(); g.moveTo(xNow, y); g.lineTo(x1, y); g.stroke();
  const bw = 0.5 * u, bh = 0.9 * u;
  g.fillStyle = T.ground; g.fillRect(xb - bw, y - 0.4 * u, 2 * bw, 0.8 * u);
  g.strokeStyle = T.muted; g.lineWidth = Math.max(1, 0.15 * u);
  for (const d of [-bw, bw]) { g.beginPath(); g.moveTo(xb + d - 0.35 * u, y + bh / 2); g.lineTo(xb + d + 0.35 * u, y - bh / 2); g.stroke(); }
  g.restore();
  const by = R.by;
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.accent; g.lineWidth = Math.max(1, 0.2 * u);
  g.beginPath(); g.moveTo(bx0, by - 0.5 * u); g.lineTo(bx0, by); g.lineTo(bx1, by); g.lineTo(bx1, by - 0.5 * u); g.stroke(); g.restore();
  text(g, 'Lyα forest', bx0 - 0.8 * u, y2, { px, color: T.accent, alpha: a, align: 'right', role: 'label' });
  text(g, 'its light, travelling to us', xb + 1.2 * u, y2, { px, color: T.muted, alpha: a, italic: true, role: 'label' });
  if (G && xNow > bx0 && xNow < bx1) {
    g.save(); g.globalAlpha *= a; g.strokeStyle = T.accent; g.lineWidth = Math.max(1.5, 0.25 * u);
    g.beginPath(); g.moveTo(xNow, y - R.half - 0.4 * u); g.lineTo(xNow, y + R.half + 0.4 * u); g.stroke(); g.restore();
  }
  g.save(); g.globalAlpha *= a; g.fillStyle = T.accent; g.strokeStyle = T.ground; g.lineWidth = Math.max(1, 0.15 * u); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(xNow - 1.3 * u, y); g.lineTo(xNow + 0.6 * u, y - 0.85 * u); g.lineTo(xNow + 0.6 * u, y + 0.85 * u); g.closePath(); g.stroke(); g.fill(); g.restore();
  text(g, 'us', P0.x + 0.4 * u, y + 0.35 * px, { px, color: T.ink, alpha: a, role: 'label' });
  g.save(); g.globalAlpha *= a; g.fillStyle = T.ink; g.beginPath(); g.arc(x1, y, 0.45 * u, 0, 2 * Math.PI); g.fill(); g.restore();
  text(g, qName, x1 + 1.0 * u, y + 0.35 * px, { px, color: T.ink, alpha: a, role: 'label' });
}

const DIP = { under: 0.7, swing: 0.15 }, LEAD = 10;
const HIGH_RES = 'Keck/HIRES', CITE_LEAD = 1.2;
function dipsIn(M, l0, l1) {
  const thr = DIP.under * M.stripNorm, D = DIP.swing * M.stripNorm;
  let n = 0, mode = 'min', lo = Infinity, hi = -Infinity;
  for (let i = lowerIndex(M.wave, l0); i < M.wave.length && M.wave[i] <= l1; i++) {
    if (!M.good[i]) continue;
    const f = M.flux[i];
    if (mode === 'min') { lo = Math.min(lo, f); if (f > lo + D) { if (lo < thr) n++; mode = 'max'; hi = f; } } else { hi = Math.max(hi, f); if (f < hi - D) { mode = 'min'; lo = f; } }
  }
  return n + (mode === 'min' && lo < thr ? 1 : 0);
}
function lowerIndex(arr, v) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }
const fineCache = new WeakMap();
export function fineBracket(M, S) {
  const F = M && M.fine, gal = S ? S.rows.filter(r => r.group === 'galaxies' && !/QSO|quasar/i.test(r.id + r.label)) : [];
  if (!F || !gal.length) return null;
  const hit = fineCache.get(M);
  if (hit && hit.S === S) return hit.B;
  const at = d => { const t = clamp01(d / F.table) * F.n, i = Math.min(F.n - 1, Math.floor(t)); return lerp(F.lam[i], F.lam[i + 1], t - i); };
  const lo = Math.min(...gal.map(r => r.v)), hi = Math.max(...gal.map(r => r.v)), L = (lo + hi) / 2;
  let best = null;
  for (let d = LEAD; d + F.span - LEAD <= F.table + 1e-9; d += 0.5) {
    const n = dipsIn(M, at(d), at(d + L)), off = Math.abs(d + L / 2 - F.table / 2);
    if (!best || n > best.n || (n === best.n && off < best.off)) best = { d, n, off };
  }
  const v0 = best.d - LEAD, lamAt = x => at(v0 + x);
  let fmax = -Infinity;
  for (let i = lowerIndex(M.wave, lamAt(0)); i < M.wave.length && M.wave[i] <= lamAt(F.span); i++) if (M.good[i] && M.flux[i] > fmax) fmax = M.flux[i];
  const B = { gal, lo, hi, L, d0: LEAD, dips: best.n, l0: lamAt(LEAD), l1: lamAt(LEAD + L), v0: lamAt(0), v1: lamAt(F.span), fmax, lamAt };
  fineCache.set(M, { S, B });
  return B;
}
const SIGHT_Y0 = 1.2 + 0.25 + (0.45 + 1 / 3) * TEXT.label + 0.1;
function fineRows(env, P) {
  const { u } = env;
  const cap = P.y + 1.2 * u + 1.0 * u + 1.05 * TEXT.label * u + 0.6 * u + 0.8 * TEXT.min * u;
  const r0 = Math.max(cap - P.y + 3.8 * u, (SIGHT_Y0 + (0.35 + 1.15 + 0.25 + 1 / 3 + 0.45) * TEXT.label + 0.15) * u);
  return [0, 1, 2, 3].map(i => P.y + r0 + i * 4.8 * u);
}
function fineMarks(env, M, S, P, X, a, ga, fa, ca) {
  const { g, u, T } = env;
  const rows = fineRows(env, P), px = TEXT.label * u, p4 = TEXT.min * u;
  const B = fineBracket(M, S);
  if (!B) return;
  const { gal, lo, hi, L: Lg, d0, lamAt } = B, XC = d => X(lamAt(d));
  const pix = S.rows.find(r => /pixel/.test(r.id)), dip = S.rows.find(r => /line/.test(r.id) && r.range), across = S.rows.find(r => r.group === 'context');
  const res = S.rows.find(r => /resolution/.test(r.id) && r.range);
  const xs = XC(d0), xg = XC(d0 + Lg), tick = 0.9 * u;
  const bracket = (x1, y, c, al) => polyline(g, [[xs, y + tick], [xs, y], [x1, y], [x1, y + tick]], c, env, { lw: 0.24, alpha: al });
  const bar = (len, y, al, at = []) => {
    const x1 = XC(d0 + len);
    g.save(); if (g.__mark) g.__mark('bar'); g.globalAlpha *= al; g.fillStyle = T.accent; g.fillRect(xs, y - 0.45 * u, Math.max(2, x1 - xs), 0.9 * u); g.restore();
    for (const x of [xs, x1, ...at.map(l => XC(d0 + l))]) polyline(g, [[x, y - 0.9 * u], [x, y + 0.9 * u]], T.ink, env, { lw: 0.2, alpha: al });
    return x1;
  };
  const name = (x, t, y, c, al) => text(g, t, x + 1.2 * u, y + 0.35 * px, { px, color: c, alpha: al, role: 'label' });
  const named = (x, head, value, y, al) => {
    const b = text(g, head, x + 1.2 * u, y + 0.35 * px, { px, color: T.accent, alpha: al, role: 'label' });
    const v = text(g, value, x + 1.2 * u + b.w + measure(g, ' ', px), y + 0.35 * px, { px, color: T.ink, alpha: al, role: 'label', cont: true });
    return b.w + measure(g, ' ', px) + v.w;
  };
  const A0 = a * ga, A1 = a * fa, A2 = a * ca;
  if (A0 > 0) {
    bracket(xg, rows[0], T.ink, A0);
    for (const x of [xs, xg]) refLine(g, x, rows[3] + 3.0 * u, x, P.y + P.h, env, { alpha: 0.8 * A0 });
    name(xg, `mean galaxy spacing: about ${lo.toFixed(0)}–${hi.toFixed(0)} h⁻¹ Mpc`, rows[0], T.ink, A0);
  }
  if (A1 > 0 && pix) named(bar(pix.v, rows[1], A1), 'one DESI pixel:', `${pix.v.toPrecision(2)} h⁻¹ Mpc`, rows[1], A1);
  if (A1 > 0 && res) named(bar(res.v, rows[2], A1), 'DESI resolves', `≈ ${res.v.toPrecision(2)} h⁻¹ Mpc`, rows[2], A1);
  if (A1 > 0 && dip) {
    const x1 = bar(dip.range[1], rows[3], A1, [dip.range[0]]);
    const w0 = named(x1, "a dip's true width:", `${dip.text} h⁻¹ Mpc`, rows[3], A1);
    const cite = (dip.cite || []).map(c => `${c.who} ${c.year}`).join('; ');
    const xc = x1 + 1.2 * u + w0 + 1.6 * u, yc = rows[3] + 0.35 * px;
    text(g, `(high-resolution ${HIGH_RES} spectra${cite ? ':' : ')'}`, xc, yc, { px: p4, color: T.muted, alpha: A1, italic: true, role: 'label' });
    if (cite) text(g, `${cite})`, xc, yc + CITE_LEAD * p4, { px: p4, color: T.muted, alpha: A1, italic: true, role: 'label' });
    caveatNote(env, `dip widths from high-resolution ${HIGH_RES} spectra${cite ? ` (${cite})` : ''}`, A1);
  }
  if (A2 > 0 && across) {
    const x1 = P.x + P.w - 1.2 * u, x0 = x1 - 9.0 * u, ys = [0, 1, 2].map(i => P.y + SIGHT_Y0 * u + i * 3.2 * u);
    for (const y of ys) {
      polyline(g, [[x0, y], [x1, y]], T.ink, env, { lw: 0.22, alpha: A2 });
      polyline(g, [[x1 - 0.6 * u, y], [x1 + 0.6 * u, y]], T.ink, env, { lw: 0.2, alpha: A2 });
      polyline(g, [[x1, y - 0.6 * u], [x1, y + 0.6 * u]], T.ink, env, { lw: 0.2, alpha: A2 });
    }
    const xb = x0 - 1.0 * u;
    polyline(g, [[xb + 0.6 * u, ys[0]], [xb, ys[0]], [xb, ys[1]], [xb + 0.6 * u, ys[1]]], T.ink, env, { lw: 0.24, alpha: A2 });
    text(g, 'sightlines, across the sky:', xb - 1.0 * u, ys[0] + 0.35 * px, { px, color: T.ink, alpha: A2, align: 'right', role: 'label' });
    text(g, `${across.text} h⁻¹ Mpc apart`, xb - 1.0 * u, ys[0] + 0.35 * px + 1.15 * px, { px, color: T.ink, alpha: A2, align: 'right', role: 'label' });
  }
  if (Array.isArray(env.notes) && A0 > 0) env.notes.push({ text: `the fine view: ${M.fine.span} h⁻¹ Mpc along this sightline at the fan's cosmology${M.fine.cosmology ? ` (${M.fine.cosmology})` : ''}; the galaxies' bracket: ${Lg.toFixed(1)} h⁻¹ Mpc, the middle of their samples' mean spacings (${gal.map(r => `${r.id} ${r.text}`).join(', ')}); the dip's width is from high-resolution ${HIGH_RES} spectra${dip && dip.cite && dip.cite.length ? ` (${dip.cite.map(c => `${c.who} ${c.year}`).join('; ')})` : ''}${res ? ` (DESI resolves ${res.range.map(v => v.toPrecision(2)).join('–')} h⁻¹ Mpc, R 2000–3000, so its dips look wider)` : ''}; the sightlines' inset is a pictogram`, shown: false, optional: true });
}

function strip(env, M, P, X, Xinv, a, arrow, zoom, words = [['observed wavelength [nm]', 1]]) {
  const alphaAt = zoom > 0 ? (x, w) => {
    const l = Xinv(x + w / 2), i = nearest(M.wave, l);
    const f = M.good[i] && Math.abs(M.wave[i] - l) < 0.2 ? M.flux[i] : M.stripNorm;
    return lerp(1, clamp01(f / M.stripNorm), zoom);
  } : null;
  waveArrow(env, P, a, { arrow, words, h: lerp(0.75, 1.3, zoom), alphaAt });
}
function nearest(arr, v) {
  let lo = 0, hi = arr.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m; else hi = m; }
  return Math.abs(arr[lo] - v) <= Math.abs(arr[hi] - v) ? lo : hi;
}

const LEVEL_PITCH = 3.5, LEVEL_GAP12 = 4.6, LEVEL_LINE = 11, NAME_GAP = 1.3;
function insetBox(env, M, P, landed = 1) {
  const { g, u } = env;
  const C = M.constants, LY = M.lyman, px = TEXT.min * u, lead = 1.25 * px, pad = 1.5 * u;
  const rows = LY && LY.window ? [
    { n: 'n = 3', e: `${LY.lines[1].energy_eV.toFixed(2)} eV`, name: LY.lines[1].name },
    { n: `n = ${C.n_upper}`, e: `${C.energy_eV} eV`, name: LY.lines[0].name, main: true },
  ] : LY ? [
    { n: 'n = ∞', e: `${LY.limitEV.toFixed(1)} eV`, name: 'limit', dash: true },
    { n: 'n = 4', e: `${LY.lines[2].energy_eV.toFixed(2)} eV`, name: LY.lines[2].name },
    { n: 'n = 3', e: `${LY.lines[1].energy_eV.toFixed(2)} eV`, name: LY.lines[1].name },
    { n: `n = ${C.n_upper}`, e: `${C.energy_eV} eV`, name: LY.lines[0].name, main: true },
  ] : [{ n: `n = ${C.n_upper}`, e: `${C.energy_eV} eV`, name: 'Lyα', main: true }];
  const lines = [`λ_obs = (1 + z) · ${C.lambda_nm} nm`, 'each forest dip: hydrogen at a lower z'];
  const wN = Math.max(...rows.map(r => measure(g, r.n, px)), measure(g, `n = ${C.n_lower}`, px)), wE = Math.max(...rows.map(r => measure(g, r.e, px)));
  const wName = Math.max(...rows.map(r => measure(g, r.name, px)));
  const wLev = wN + 1.2 * u + LEVEL_LINE * u + 1.0 * u + wE + NAME_GAP * u + wName;
  const w = Math.max(wLev, ...lines.map((L, i) => measure(g, L, px, i === 1))) + 2 * pad;
  const x0 = P.x + P.w - w - 1 * u, y0 = P.y + 1.5 * u;
  const lx0 = x0 + pad + wN + 1.2 * u, lx1 = lx0 + LEVEL_LINE * u;
  const ys = rows.map((r, i) => y0 + pad + 0.6 * px + i * LEVEL_PITCH * u), y1 = ys[ys.length - 1] + LEVEL_GAP12 * u;
  const ty = y1 + 1.6 * u + 0.9 * px;
  const h = y1 + 0.4 * px + pad - y0 + smooth(clamp01(landed / 0.3)) * (ty + (lines.length - 1) * lead - y1 - 0.4 * px);
  return { C, px, lead, pad, lines, rows, w, x0, y0, lx0, lx1, ys, y1, ty, wE, h };
}
function inset(env, M, P, a, landed) {
  const { g, u, T } = env;
  const { C, px, lead, pad, lines, rows, w, x0, y0, lx0, lx1, ys, y1, ty, wE, h } = insetBox(env, M, P, landed);
  g.save(); g.globalAlpha *= a; g.fillStyle = T.ground; g.fillRect(x0, y0, w, h);
  g.strokeStyle = T.hair; g.lineWidth = Math.max(1, 0.14 * u); g.strokeRect(x0, y0, w, h); g.restore();
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.ink; g.lineWidth = Math.max(1.5, 0.3 * u);
  g.beginPath(); for (const y of [...ys, y1]) { g.moveTo(lx0, y); g.lineTo(lx1, y); } g.stroke();
  const order = rows.map((r, i) => i).reverse();
  order.forEach((i, k) => {
    const r = rows[i], ax = lx0 + ((k + 1) / (rows.length + 1)) * (lx1 - lx0), yt = ys[i];
    g.strokeStyle = T.accent; g.fillStyle = T.accent; g.lineWidth = Math.max(1.2, (r.main ? 0.32 : 0.2) * u);
    if (r.dash) g.setLineDash([0.6 * u, 0.45 * u]);
    g.beginPath(); g.moveTo(ax, y1 - 0.3 * u); g.lineTo(ax, yt + 1.0 * u); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(ax, yt + 0.15 * u); g.lineTo(ax - 0.55 * u, yt + 1.1 * u); g.lineTo(ax + 0.55 * u, yt + 1.1 * u); g.closePath(); g.fill();
  });
  g.restore();
  rows.forEach((r, i) => {
    text(g, r.n, x0 + pad, ys[i] + 0.3 * px, { px, color: T.ink, alpha: a, role: 'label' });
    text(g, r.e, lx1 + 1.0 * u, ys[i] + 0.3 * px, { px, color: T.ink, alpha: a, role: 'label' });
    text(g, r.name, lx1 + 1.0 * u + wE + NAME_GAP * u, ys[i] + 0.3 * px, { px, color: T.accent, alpha: a, role: 'label' });
  });
  text(g, `n = ${C.n_lower}`, x0 + pad, y1 + 0.3 * px, { px, color: T.ink, alpha: a, role: 'label' });
  const lA = smooth(clamp01((landed - 0.3) / 0.7));
  if (lA > 0) lines.forEach((L, i) => text(g, L, x0 + pad, ty + i * lead, { px, color: i === 1 ? T.muted : T.ink, alpha: a * lA, italic: i === 1, role: 'label' }));
}
const SERIES_TOP = 0.5;
function series(env, M, P, X, a, zc = 0, after = true) {
  if (!(a > 0)) return;
  const { g, u, T } = env, LY = M.lyman, px = TEXT.min * u, lead = 1.25 * px;
  const ys = P.y + SERIES_TOP * P.h, yb = P.y + P.h, inPlot = x => x > P.x + 1 && x < P.x + P.w - 1;
  const xL = X(LY.limit), xB = X(LY.lines[1].lambda_nm), xG = LY.lines[2] ? X(LY.lines[2].lambda_nm) : xL;
  const WIN = !!LY.window;
  if (!WIN && xL > P.x + 2) hatch(g, P.x, ys, Math.min(xL, P.x + P.w) - P.x, yb - ys, env, { alpha: a, sp: 1.4 });
  g.save(); g.globalAlpha *= a; g.strokeStyle = T.accent;
  const line = (x, lw, al, dash) => {
    if (!inPlot(x)) return;
    g.save(); g.globalAlpha *= al; g.lineWidth = Math.max(1, lw * u); if (dash) g.setLineDash([0.9 * u, 0.6 * u]);
    g.beginPath(); g.moveTo(x, ys); g.lineTo(x, yb); g.stroke(); g.restore();
  };
  line(xB, lerp(0.22, 0.26, zc), 1, false);
  for (const L of LY.lines.slice(2)) line(X(L.lambda_nm), lerp(0.13, 0.18, zc), lerp(0.8, 1, zc), false);
  for (const l of LY.higher) line(X(l), lerp(0.1, 0.13, zc), lerp(0.6, 0.85, zc), false);
  if (!WIN) line(xL, lerp(0.2, 0.24, zc), 1, true);
  g.restore();
  const nb = ys - 0.9 * u;
  const aR = after ? a * (1 - smooth(clamp01(zc / 0.3))) : 0;
  if (aR > 0 && WIN) {
    text(g, LY.lines[1].name, xB + 0.6 * u, nb - lead, { px, color: T.accent, alpha: aR, role: 'label' });
    text(g, `${LY.lines[1].lambda_nm.toFixed(3)} nm`, xB + 0.6 * u, nb, { px, color: T.accent, alpha: aR, role: 'label' });
  } else if (aR > 0) {
    const xc = (xL + xG) / 2;
    const wl = Math.max(measure(g, 'Lyman limit', px), measure(g, `${LY.limit.toFixed(3)} nm`, px));
    const xl = Math.max(P.x + 1.0 * u + wl / 2, xc);
    text(g, 'Lyman limit', xl, nb - lead, { px, color: T.accent, alpha: aR, align: 'center', role: 'label' });
    text(g, `${LY.limit.toFixed(3)} nm`, xl, nb, { px, color: T.accent, alpha: aR, align: 'center', role: 'label' });
    const xBn = Math.max(xB + 0.6 * u, xl + wl / 2 + 1.2 * u);
    text(g, LY.lines[1].name, xBn, nb - lead, { px, color: T.accent, alpha: aR, role: 'label' });
    text(g, `${LY.lines[1].lambda_nm.toFixed(3)} nm`, xBn, nb, { px, color: T.accent, alpha: aR, role: 'label' });
  }
  const aC = a * smooth(clamp01((zc - 0.8) / 0.2));
  if (aC > 0 && WIN) {
    text(g, LY.lines[1].name, xB, nb - lead, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
    text(g, `${LY.lines[1].lambda_nm.toFixed(3)} nm`, xB, nb, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
  } else if (aC > 0) {
    text(g, 'Lyman limit', xL, nb - lead, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
    text(g, `${LY.limit.toFixed(3)} nm`, xL, nb, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
    for (const L of LY.lines.slice(2)) if (inPlot(X(L.lambda_nm))) text(g, L.name, X(L.lambda_nm), L.n === 6 ? nb - lead : nb, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
    text(g, LY.lines[1].name, xB, nb - lead, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
    text(g, `${LY.lines[1].lambda_nm.toFixed(3)} nm`, xB, nb, { px, color: T.accent, alpha: aC, align: 'center', role: 'label' });
    HATCH_WORDS.forEach((w, i) => {
      const y = ys + 1.6 * u + 0.8 * px + i * lead, b = { x: P.x + 0.8 * u, y: y - 0.8 * px, w: measure(g, w, px, true), h: 1.05 * px };
      plate(g, b, env, aC);
      text(g, w, b.x, y, { px, color: T.ink, alpha: aC, italic: true, role: 'label' });
    });
  }
}
const HATCH_WORDS = ['thick gas:', 'all absorbed'];
export function drawSpectrum(env, st) { return tagged(env.g, (st.sepA || 0) > 0 ? 'lya' : 'lya-physics', () => drawSpectrum__(env, st)); }
