
import { project, zoomOf, PATCH_BOX } from './camera.js';
import { SWEEP, FLIGHT } from './pairs.js';
import { R_D_H, DESI_RES, GAL_SPACING } from './provenance.js';
import { createLyaMarks } from './lyapairs.js';
import { READ_DEPTH, READ_BAR_OFF, readBarSpans } from './data.js';
import { STRIP_N } from './look.js';
import { DESI_CURVES } from '../program.js';

export const MARK_FLOATS = 8;
export const MAX_MARKS = 16384;
export const GROUND = 0, TEXT = 1, SOFT = 2, ACCENT = 3, LRGC = 4, RANDOM = 5, AXIS = 6, QSOC = 7;
export const STRIP0 = 8;
export const HERO_R = 1.05;

export const XI_ROW = DESI_CURVES;
export const PANEL = { x0: 0.555, x1: 0.945, cTop: 0.235, cBase: XI_ROW ? 0.42 : 0.75, xTop: 0.47, xBot: 0.75 };
export const S_AXIS = 170;
export const S_TICKS = [0, 50, 100, 150];
export const TICK_LEN = 0.012;
export const XI_LO = -0.05;
export const PATCH_SIZE_CAP = 2.4, PATCH_INK_CAP = 1.1;

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const smoother = x => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };

export function xiHigh(pairs) {
  let m = 0;
  for (let b = 0; b < pairs.bins.nb; b++) m = Math.max(m, pairs.xi[b]);
  return Math.max(0.1, Math.ceil(m / 0.05) * 0.05);
}
export const labelPx = H => Math.max(0.032 * H, 18);
export const mustPx = H => Math.max(0.04 * H, 22);
export const footPx = H => Math.max(0.022 * H, 13);
const ROW = 1.12;
export const FONT_V = { base: 0.8535, asc: 0.76, desc: 0.26 };
export const INK_UP = 0.5 - (FONT_V.base - FONT_V.asc), INK_DOWN = FONT_V.base + FONT_V.desc - 0.5;
export const stackGap = (a, b, gap = 1 / 3) => INK_DOWN * a + gap * Math.max(a, b) + INK_UP * b;
export function heroCutText(line, W, H) {
  const m = mustPx(H), f = footPx(H), up = 1 - FONT_V.base;
  return {
    quasar: { px: m, right: line.xq - 0.3 * m, baseline: line.y - 0.5 * m - up * m },
    towards: { px: m, left: line.x0, baseline: line.y + 0.35 * m + FONT_V.base * m },
    foot: { px: f, left: 0.08 * W, baseline: 0.965 * H - up * f },
  };
}
export const unitPx = (W, H) => Math.min(H / 100, 0.5625 * W / 100);
export const KEY_HW = 1.0;
export function panelGeom(pairs, W, H, out) {
  out.x0 = PANEL.x0 * W; out.x1 = PANEL.x1 * W; out.sx = (out.x1 - out.x0) / S_AXIS;
  out.cTop = PANEL.cTop * H; out.cBase = PANEL.cBase * H; out.xTop = PANEL.xTop * H; out.xBot = PANEL.xBot * H;
  out.bw = pairs.bins.w * out.sx; out.xiHi = xiHigh(pairs);
  const fs = labelPx(H), mfs = mustPx(H);
  out.fs = fs; out.mfs = mfs;
  out.legendY = out.cTop - 0.95 * mfs;
  out.tickY = out.xBot + 0.014 * H;
  out.axisY = axisTitleY(out.tickY, fs, mfs);
  out.caveatX = out.x0 + R_D_H * out.sx + 0.4 * fs;
  out.caveatY = out.xTop + 0.32 * (yXi(out, 0) - out.xTop);
  return out;
}
export const AXIS_GAP = 0.3;
export const axisTitleY = (tickY, fs, mfs) => tickY + FONT_V.base * fs + (INK_UP + AXIS_GAP) * mfs;
const xs = (G, s) => G.x0 + s * G.sx;
const yXi = (G, v) => G.xBot - (v - XI_LO) / (G.xiHi - XI_LO) * (G.xBot - G.xTop);
const hNorm = (G, f, fmax) => (fmax > 0 ? f / fmax : 0) * (G.cBase - G.cTop);
export const binCentre = (pairs, b) => pairs.bins.sMin + (b + 0.5) * pairs.bins.w;

export const xiPhase = (xi, b, nb) => clamp01((xi - 0.7 * b / nb) / 0.3);
export const XI_TIMES = { tick: [0, 0.2], fill: [0.15, 0.2], drop: [0.35, 0.6] };
export const xiStage = (ph, key) => clamp01((ph - XI_TIMES[key][0]) / XI_TIMES[key][1]);
export function dropCap(G, pairs, b, t, out) {
  const sc = binCentre(pairs, b), xd = xs(G, sc) - 0.21 * G.bw;
  const yD = G.cBase - hNorm(G, pairs.fD[b], pairs.fmax), yR = G.cBase - hNorm(G, pairs.fR[b], pairs.fmax);
  const hc = yR - yD, hx = yXi(G, 0) - yXi(G, pairs.xi[b]);
  out.x = xd + (xs(G, sc) - xd) * t; out.base = yR + (yXi(G, 0) - yR) * t; out.hw = 0.17 * G.bw + (0.3 - 0.17) * G.bw * t;
  out.h = hc * hx > 0 && Math.abs(hc) > 1e-6 ? Math.sign(hx) * Math.pow(Math.abs(hc), 1 - t) * Math.pow(Math.abs(hx), t) : hc + (hx - hc) * t;
  out.hc = hc; out.hx = hx; out.xd = xd; out.yR = yR; out.yD = yD;
  return out;
}
export const LENS_X = 20;
export const lensBins = () => [0];
const LA = [0, 0], LB2 = [0, 0];
export function lensGeom(data, F, W, H, i, out) {
  const mfs = mustPx(H), fs = labelPx(H), bw = (PATCH_BOX.x1 - PATCH_BOX.x0) * W, pt = data.pairs.patch;
  out.w = 0.56 * bw; out.h = 0.30 * H;
  out.y = PATCH_BOX.y1 * H - out.h - 0.045 * H;
  project(F, pt.r0 * Math.sin(pt.ta), pt.r0 * Math.cos(pt.ta), LA); project(F, pt.r1 * Math.sin(pt.ta), pt.r1 * Math.cos(pt.ta), LB2);
  const edgeX = y => LA[0] + (y - LA[1]) * (LB2[0] - LA[0]) / (LB2[1] - LA[1]);
  out.x = Math.max(PATCH_BOX.x0 * W, edgeX(out.y), edgeX(out.y + out.h)) + 0.012 * W;
  out.t1 = out.y + 0.7 * mfs; out.t2 = out.t1 + ROW * mfs;
  out.cTop = out.t2 + 0.75 * mfs; out.cBot = out.y + out.h - 10 - ROW * fs;
  out.yR = out.cBot - 0.22 * (out.cBot - out.cTop);
  out.cx = out.x + out.w / 2; out.colW = 0.05 * out.w;
  out.xr = out.cx - 0.15 * out.w; out.xd = out.cx + 0.15 * out.w;
  out.wordY = out.cBot + 4 + 0.5 * ROW * fs;
  return out;
}
export const lensOpen = (st, ph) => smooth((ph - 0.3) / 0.25) * (1 - smooth((st.bao || 0) / BAO_START));
export const FRAC = { lead: 2.9, num: 4.35, den: 4.05, tail: 1.75, excess: 10.25, gap: 0.3 };
const FP = [0, 0];
export function formulaGeom(data, F, W, H, out) {
  const fs = mustPx(H), pt = data.pairs.patch;
  project(F, pt.r1 * Math.sin(pt.ta), pt.r1 * Math.cos(pt.ta), FP);
  const yc = FP[1], xc = FP[0];
  project(F, pt.r1 * Math.sin(pt.tb), pt.r1 * Math.cos(pt.tb), FP);
  const top = Math.max(yc, FP[1]) + 0.03 * H;
  out.x = Math.max(PATCH_BOX.x0 * W + 0.05 * W, xc + 0.04 * W);
  out.xEq = out.x + FRAC.lead * fs;
  out.xBar0 = out.xEq + FRAC.gap * fs; out.xBar1 = out.xBar0 + Math.max(FRAC.num, FRAC.den) * fs + 0.2 * fs;
  out.xMid = (out.xBar0 + out.xBar1) / 2; out.xTail = out.xBar1 + FRAC.gap * fs;
  out.yNum = top + 0.55 * fs; out.yBar = out.yNum + 0.68 * fs; out.yDen = out.yBar + 0.68 * fs;
  out.yEx = out.yDen + 1.3 * fs;
  out.y = [out.yBar, out.yEx];
  out.px0 = out.x - 0.35 * fs; out.px1 = Math.max(out.xTail + FRAC.tail * fs, out.x + FRAC.excess * fs) + 0.35 * fs;
  out.py0 = out.yNum - 0.7 * fs; out.py1 = out.yEx + 0.7 * fs;
  return out;
}
export const SCALE_H = 100;
export function patchKey(data, F, W, H, out, patch) {
  const pt = patch || data.pairs.patch;
  project(F, pt.r0 * Math.sin(pt.ta), pt.r0 * Math.cos(pt.ta), FP);
  const xa = FP[0], ya = FP[1];
  project(F, pt.r0 * Math.sin(pt.tb), pt.r0 * Math.cos(pt.tb), FP);
  const yc = Math.max(ya, FP[1]), xb = FP[0];
  project(F, pt.r0 * Math.sin(pt.tc), pt.r0 * Math.cos(pt.tc), FP);
  const fs = labelPx(H);
  out.bwy = yc + 0.012 * H + 0.5 * fs;
  out.by = out.bwy + 0.5 * fs + 0.012 * H;
  out.bx0 = Math.min(xa, xb); out.bx1 = out.bx0 + SCALE_H * F.k;
  out.ax = FP[0]; out.ay0 = FP[1] + 0.012 * H; out.ay1 = out.by + 6;
  out.awx = out.ax + 12; out.awy = out.bwy;
  return out;
}
export const formulaOpen = st => 1 - smooth((st.bao || 0) / 0.2);
export const DESI_PLOT = { pad: 0.025 };
export function desiPlotGeom(pairs, desi, W, H, out) {
  panelGeom(pairs, W, H, IGG);
  const L = desi && desi.lrg;
  out.sx = IGG.sx; out.x0 = IGG.x0; out.x1 = IGG.x1; out.xOf = s => IGG.x0 + s * IGG.sx;
  out.top = IGG.cTop; out.bot = IGG.xBot; out.capY = IGG.legendY;
  out.y0 = out.top + DESI_PLOT.pad * H; out.y1 = out.bot - DESI_PLOT.pad * H;
  out.yc = (out.top + out.bot) / 2;
  const lo = L ? L.ylim[0] : -1, hi = L ? L.ylim[1] : 1;
  out.yOf = v => out.y1 - (v - lo) / (hi - lo) * (out.y1 - out.y0);
  out.s0 = L ? L.s[0] : 50; out.s1 = L ? L.s[L.s.length - 1] : 150;
  out.f0 = L ? L.fs[0] : 50; out.f1 = L ? L.fs[L.fs.length - 1] : 150;
  return out;
}
const IGG = {};
export const DESI_T = { out: 0.12, frame: [0.12, 0.24], pts: [0.24, 0.7], fit: [0.7, 0.92] };
export const patchPanelA = st => 1 - smooth((st.desi || 0) / DESI_T.out);
export const patchRowsA = st => patchPanelA(st) * (Math.max(st.dd || 0, st.rnd || 0, st.rr || 0, st.xi || 0) > 0 || !((st.desi || 0) > 0) ? 1 : 0);
export const desiFrameA = st => smooth(((st.desi || 0) - DESI_T.frame[0]) / (DESI_T.frame[1] - DESI_T.frame[0]));
export const desiPtA = (st, s, D) => smooth(((st.desi || 0) - (DESI_T.pts[0] + (DESI_T.pts[1] - DESI_T.pts[0] - 0.05) * (s - D.s0) / (D.s1 - D.s0))) / 0.05);
export const desiFitTo = (st, D) => D.f0 + (D.f1 - D.f0) * clamp01(((st.desi || 0) - DESI_T.fit[0]) / (DESI_T.fit[1] - DESI_T.fit[0]));
export const desiFitA = st => smooth(((st.desi || 0) - DESI_T.fit[0] + 0.02) / 0.04);
export const Y_TITLE_EM = 1.0;
export const yTitleX = (x0, H) => x0 - Y_TITLE_EM * mustPx(H);
export const Y_COUNTS_EM = 4.45, Y_CLEAR = 0.25;
export function countsTitleBox(G, H, out) {
  const m = mustPx(H), cx = yTitleX(G.x0, H), cy = (G.cTop + G.cBase) / 2;
  out.x0 = cx - (0.5 + Y_CLEAR) * m; out.x1 = cx + (0.5 + Y_CLEAR) * m;
  out.y0 = cy - (0.5 * Y_COUNTS_EM + Y_CLEAR) * m; out.y1 = cy + (0.5 * Y_COUNTS_EM + Y_CLEAR) * m;
  return out;
}
export const SLICE = { w: 25, h: 16, arrow: 3.4, dec: 30 * Math.PI / 180, tilt: 50 * Math.PI / 180, layers: 3, captionY: 0.865, N: 24 };
export function sliceGeom(data, W, H, out) {
  const u = unitPx(W, H), fs = labelPx(H), g = data.geo, pm = g.span / 2, dm = SLICE.dec, sa = Math.sin(SLICE.tilt), ca = Math.cos(SLICE.tilt);
  const pr = (phi, del) => [Math.cos(del) * Math.sin(phi), Math.cos(del) * Math.cos(phi) * sa + Math.sin(del) * ca];
  const arc = (f) => Array.from({ length: SLICE.N + 1 }, (_, k) => f(k / SLICE.N));
  const lines = [];
  const nl = SLICE.layers;
  for (let j = 0; j < nl; j++) {
    const d = -dm + 2 * dm * j / (nl - 1), kind = Math.abs(d) < 1e-9 ? 'slice' : 'edge';
    lines.push([kind, [pr(-pm, d), [0, 0], pr(pm, d)]], [kind, arc(t => pr(-pm + 2 * pm * t, d))]);
  }
  lines.push(['edge', arc(t => pr(-pm, -dm + 2 * dm * t))], ['edge', arc(t => pr(pm, -dm + 2 * dm * t))]);
  lines.sort((a, b) => (a[0] === 'slice') - (b[0] === 'slice'));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [, pts] of lines) for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const R = Math.min(SLICE.w * u / (x1 - x0), SLICE.h * u / (y1 - y0));
  out.capX = 0.08 * W; out.capY = SLICE.captionY * H;
  const bottom = out.capY - INK_UP * fs - fs / 3;
  out.left = out.capX; out.right = out.capX + (x1 - x0) * R; out.bottom = bottom; out.top = bottom - (y1 - y0) * R;
  const ox = out.capX - x0 * R, oy = bottom + y0 * R;
  out.lines = lines.map(([kind, pts]) => [kind, pts.map(([x, y]) => [ox + x * R, oy - y * R])]);
  const mid = pr(0, 0), xa = ox + mid[0] * R;
  out.arrow = { x: xa, y0: out.top - SLICE.arrow * u, y1: out.top - 0.6 * u, head: 0.9 * u };
  out.apex = [ox, oy]; out.R = R;
  return out;
}
export const BAO_START = 0.1;
export const shellRadius = bao => R_D_H * (1 - Math.pow(1 - clamp01((bao - BAO_START) / (0.75 - BAO_START)), 3));
export const insetGrow = gap => smoother(gap / 0.45);
export const INSET_TIMES = { ticks: [0.45, 0.15], res: [0.55, 0.12], gal: [0.63, 0.12], bar: [0.72, 0.18], barWords: [0.88, 0.12] };
export const insetPhase = (gap, key) => clamp01((gap - INSET_TIMES[key][0]) / INSET_TIMES[key][1]);

const IA = [0, 0], IL = [0, 0], MP = [0, 0], MQ = [0, 0];
export function insetGeom(data, F, W, H, out) {
  const A = IA, L = IL, g = data.geo;
  project(F, 0, 0, A);
  project(F, g.rMax * Math.sin(g.theta0), g.rMax * Math.cos(g.theta0), L);
  const m = 0.012 * W, xl = 0.08 * W - m, yb = 0.88 * H;
  const sl = A[1] - L[1] > 1e-6 ? (A[0] - L[0]) / (A[1] - L[1]) : 1;
  const hStar = (A[0] - xl - m - (A[1] - yb) * sl) / (2 * sl);
  const h = Math.max(0.1 * H, Math.min(hStar, 0.46 * H, yb - L[1] - 0.02 * H));
  const xr = A[0] - m - (A[1] - (yb - h)) * sl;
  out.x0 = xl; out.x1 = Math.max(xl + 0.1 * W, xr); out.y0 = yb - h; out.y1 = yb; out.h = h; out.pad = 0.012 * W;
  const fs = mustPx(H), sfs = labelPx(H), u = unitPx(W, H);
  out.barY = out.y1 - 0.55 * fs; out.galY = out.barY - 1.2 * fs; out.resY = out.galY - 1.2 * fs;
  out.arrowWordsY = out.resY - stackGap(sfs, fs);
  out.stripH = 0.75 * u; out.strip1 = out.arrowWordsY - 0.5 * sfs - 1.3 * u; out.strip0 = out.strip1 - out.stripH;
  out.headL = 1.6 * u; out.headH = 0.9 * u;
  out.tick1 = out.strip0 - 1.5 * u; out.tick0 = out.tick1 - Math.max(6, 0.012 * H);
  out.traceBot = out.tick0 - 6; out.traceTop = out.y0 + 0.06 * h;
  out.innerW = out.x1 - out.x0 - 2 * out.pad;
  const sc = out.innerW / STRETCH_OF(data);
  out.barEnd = out.x0 + out.pad + R_D_H * sc;
  out.res1 = out.x0 + out.pad + DESI_RES.value * sc;
  out.gal0 = out.x0 + out.pad + GAL_SPACING.range[0] * sc; out.gal1 = out.x0 + out.pad + GAL_SPACING.range[1] * sc;
  return out;
}
const STRETCH_OF = data => (data.spacing ? data.spacing.stretch[1] - data.spacing.stretch[0] : 1);
export const insetX = (I, sp, r) => I.x0 + I.pad + (r - sp.stretch[0]) / (sp.stretch[1] - sp.stretch[0]) * I.innerW;

export function magnifier(data, F, I, e, out) {
  const h = data.skewers.hero, sp = data.spacing, P = MP, Q = MQ;
  project(F, sp.stretch[0] * Math.sin(h.theta), sp.stretch[0] * Math.cos(h.theta), P);
  project(F, sp.stretch[1] * Math.sin(h.theta), sp.stretch[1] * Math.cos(h.theta), Q);
  const ax = (P[0] + Q[0]) / 2, ay = (P[1] + Q[1]) / 2, len = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
  const a0 = Math.atan2(Q[1] - P[1], Q[0] - P[0]), k0 = len / I.innerW;
  const cx = I.pad + I.innerW / 2, cy = (I.traceTop + I.traceBot) / 2 - I.y0;
  out.ax = ax; out.ay = ay; out.cx = cx; out.cy = cy;
  out.px = ax + (I.x0 + cx - ax) * e; out.py = ay + (I.y0 + cy - ay) * e;
  out.k = Math.pow(k0, 1 - e); out.ang = a0 * (1 - e);
  out.c = Math.cos(out.ang); out.s = Math.sin(out.ang);
  return out;
}
export const magnify = (M, lx, ly, out) => {
  const dx = (lx - M.cx) * M.k, dy = (ly - M.cy) * M.k;
  out[0] = M.px + M.c * dx - M.s * dy; out[1] = M.py + M.s * dx + M.c * dy;
  return out;
};

export function patchZoom(data, st, F, W, H) { return 1 + (zoomOf(data, F, W, H) - 1) * (st.pz || 0); }
export const patchSize = zEff => Math.min(PATCH_SIZE_CAP, Math.sqrt(zEff));
export const patchInk = (a0, zEff) => (zEff > 1 ? Math.max(a0, Math.min(PATCH_INK_CAP, a0 * zEff * zEff)) : a0);

export function createMarks(data, pal) {
  const buf = new Float32Array(MAX_MARKS * MARK_FLOATS);
  const P = [0, 0], Q = [0, 0], R = [0, 0], G = {}, I = {}, M = {}, DC = {}, LG = {}, PK = {}, FG = {};
  const pairs = data.pairs, sp = data.spacing, ring = data.ring;
  let n = 0;

  function seg(x0, y0, x1, y1, hw, col, a, cap = 1) {
    if (!(a > 0.002) || n >= MAX_MARKS) return;
    const o = n * MARK_FLOATS;
    buf[o] = x0; buf[o + 1] = y0; buf[o + 2] = x1; buf[o + 3] = y1;
    buf[o + 4] = hw; buf[o + 5] = col; buf[o + 6] = a > 1 ? 1 : a; buf[o + 7] = cap;
    n++;
  }
  function inked(x0, y0, x1, y1, hw, col, a, cap = 1) { seg(x0, y0, x1, y1, hw + 1.4, GROUND, 0.85 * a, cap); seg(x0, y0, x1, y1, hw, col, a, cap); }
  function circle(cx, cy, rad, frac, hw, col, a, knock) {
    const N = Math.max(24, Math.min(160, Math.round(rad * 0.8))), m = Math.ceil(N * clamp01(frac));
    if (knock) for (let k = 0; k < m; k++) {
      const t0 = 2 * Math.PI * k / N, t1 = 2 * Math.PI * Math.min(k + 1, N * frac) / N;
      seg(cx + rad * Math.sin(t0), cy - rad * Math.cos(t0), cx + rad * Math.sin(t1), cy - rad * Math.cos(t1), hw + 1.4, GROUND, 0.85 * a);
    }
    for (let k = 0; k < m; k++) {
      const t0 = 2 * Math.PI * k / N, t1 = 2 * Math.PI * Math.min(k + 1, N * frac) / N;
      seg(cx + rad * Math.sin(t0), cy - rad * Math.cos(t0), cx + rad * Math.sin(t1), cy - rad * Math.cos(t1), hw, col, a);
    }
  }
  const polar = (r, t, out) => project(FR, r * Math.sin(t), r * Math.cos(t), out);
  let FR = null;

  function segOut(x0, y0, x1, y1, hw, col, a, B) {
    if (!B) { seg(x0, y0, x1, y1, hw, col, a); return; }
    const bx0 = B.x0 - hw, bx1 = B.x1 + hw, by0 = B.y0 - hw, by1 = B.y1 + hw, dx = x1 - x0, dy = y1 - y0;
    let t0 = 0, t1 = 1;
    for (const [p, q] of [[-dx, x0 - bx0], [dx, bx1 - x0], [-dy, y0 - by0], [dy, by1 - y0]]) {
      if (p === 0) { if (q < 0) { t0 = 1; t1 = 0; } continue; }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    if (t0 >= t1) { seg(x0, y0, x1, y1, hw, col, a); return; }
    if (t0 > 1e-6) seg(x0, y0, x0 + dx * t0, y0 + dy * t0, hw, col, a);
    if (t1 < 1 - 1e-6) seg(x0 + dx * t1, y0 + dy * t1, x1, y1, hw, col, a);
  }
  const CT = {};
  let ctOn = null;
  function sticks(S, sweep, frac, side, col, a0) {
    for (let o = 0; o < S.length; o += 8) {
      const p = (sweep - S[o + 6]) / FLIGHT;
      if (!(p > 0) || p >= 1) continue;
      project(FR, S[o], S[o + 1], P); project(FR, S[o + 2], S[o + 3], Q);
      if (P[0] > Q[0]) { const tx = P[0], ty = P[1]; P[0] = Q[0]; P[1] = Q[1]; Q[0] = tx; Q[1] = ty; }
      const bin = S[o + 5], cx = xs(G, binCentre(pairs, bin)) + side * 0.21 * G.bw;
      const cy = G.cBase - hNorm(G, frac[bin] * S[o + 7], pairs.fmax), hb = 0.17 * G.bw;
      const e = smoother((p - 0.4) / 0.5), a = a0 * smooth(p / 0.15) * (1 - smooth((p - 0.9) / 0.1));
      const x0 = P[0] + (cx - hb - P[0]) * e, y0 = P[1] + (cy - P[1]) * e, x1 = Q[0] + (cx + hb - Q[0]) * e, y1 = Q[1] + (cy - Q[1]) * e;
      const hw = 1.1 + 0.5 * e;
      segOut(x0, y0, x1, y1, hw + 1.4, GROUND, 0.85 * a * (1 - e), ctOn);
      segOut(x0, y0, x1, y1, hw, col, a, ctOn);
    }
  }
  function landed(S, sweep, bin) {
    let f = 0, k = 0;
    for (let o = 0; o < S.length; o += 8) if (S[o + 5] === bin) { k++; f += smooth(((sweep - S[o + 6]) / FLIGHT - 0.85) / 0.15); }
    return k ? f / k : smooth(sweep);
  }

  function buildPairs(st, W, H) {
    const pt = pairs.patch, a = st.mk;
    panelGeom(pairs, W, H, G);
    const zEff = patchZoom(data, st, FR, W, H), dotR = 0.5 * pal.size[1] * patchSize(zEff);
    if (st.pbox > 0) {
      const A = 0.75 * st.pbox * a, N = 32;
      for (let k = 0; k < N; k++) {
        const t0 = pt.ta + (pt.tb - pt.ta) * k / N, t1 = pt.ta + (pt.tb - pt.ta) * (k + 1) / N;
        polar(pt.r0, t0, P); polar(pt.r0, t1, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, AXIS, A);
        polar(pt.r1, t0, P); polar(pt.r1, t1, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, AXIS, A);
      }
      polar(pt.r0, pt.ta, P); polar(pt.r1, pt.ta, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, AXIS, A);
      polar(pt.r0, pt.tb, P); polar(pt.r1, pt.tb, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, AXIS, A);
      patchKey(data, FR, W, H, PK);
      const B = st.pbox * a;
      seg(PK.bx0, PK.by, PK.bx1, PK.by, KEY_HW, TEXT, B, 0);
      seg(PK.bx0, PK.by - 6, PK.bx0, PK.by + 6, KEY_HW, TEXT, B, 0); seg(PK.bx1, PK.by - 6, PK.bx1, PK.by + 6, KEY_HW, TEXT, B, 0);
      seg(PK.ax, PK.ay0, PK.ax, PK.ay1, KEY_HW, TEXT, B, 0);
      seg(PK.ax, PK.ay1 + 0.5, PK.ax - 6, PK.ay1 - 9, KEY_HW, TEXT, B); seg(PK.ax, PK.ay1 + 0.5, PK.ax + 6, PK.ay1 - 9, KEY_HW, TEXT, B);
    }
    const fo = formulaOpen(st) * smooth(st.xi / 0.1) * a;
    if (st.xi > 0 && fo > 0) {
      formulaGeom(data, FR, W, H, FG);
      seg(FG.px0, (FG.py0 + FG.py1) / 2, FG.px1, (FG.py0 + FG.py1) / 2, (FG.py1 - FG.py0) / 2, GROUND, 0.85 * fo, 0);
      seg(FG.xBar0, FG.yBar, FG.xBar1, FG.yBar, KEY_HW, TEXT, fo, 0);
    }
    if (st.rnd > 0) for (let k = 0; k < pairs.n; k++) {
      project(FR, pairs.rx[k], pairs.ry[k], P);
      seg(P[0], P[1], P[0], P[1], dotR, RANDOM, 0.8 * st.rnd * a);
    }
    const gx = pairs.dx[pairs.g], gy = pairs.dy[pairs.g];
    if (st.dd > 0 && st.dd < 1) {
      const sNow = pairs.bins.sMin + (pairs.bins.sMax - pairs.bins.sMin) * clamp01(st.dd / SWEEP);
      const A = st.panel * smooth(st.dd / 0.03) * (1 - smooth((st.dd - SWEEP) / 0.12)) * a;
      project(FR, gx, gy, P);
      circle(P[0], P[1], sNow * FR.k, 1, KEY_HW, TEXT, 0.55 * A, true);
    }
    if (st.panel > 0) {
      const A0 = st.panel * a, A = A0 * patchRowsA(st);
      if (XI_ROW) seg(G.x0, G.cBase, xs(G, S_AXIS), G.cBase, KEY_HW, AXIS, A, 0);
      seg(G.x0, G.xBot, xs(G, S_AXIS), G.xBot, KEY_HW, AXIS, A0, 0);
      for (const t of S_TICKS) seg(xs(G, t), G.xBot, xs(G, t), G.xBot + TICK_LEN * H, KEY_HW, AXIS, A0, 0);
      if (XI_ROW) for (const t of S_TICKS) seg(xs(G, t), G.cBase, xs(G, t), G.cBase + TICK_LEN * H, KEY_HW, AXIS, A, 0);
      if (XI_ROW) seg(G.x0, yXi(G, 0), xs(G, S_AXIS), yXi(G, 0), KEY_HW, AXIS, A, 0);
      for (let b = 0; b < pairs.bins.nb; b++) {
        const sc = binCentre(pairs, b), hw = 0.17 * G.bw, xd = xs(G, sc) - 0.21 * G.bw, xr = xs(G, sc) + 0.21 * G.bw;
        const hd = hNorm(G, pairs.fD[b] * landed(pairs.sticksD, st.dd, b), pairs.fmax);
        const hr = hNorm(G, pairs.fR[b] * landed(pairs.sticksR, st.rr, b), pairs.fmax);
        if (st.dd > 0 && hd > 0.25) seg(xd, G.cBase, xd, G.cBase - hd, hw, TEXT, 0.9 * A, 0);
        if (st.rr > 0 && hr > 0.25) seg(xr, G.cBase, xr, G.cBase - hr, hw, RANDOM, 0.9 * A, 0);
        const ph = xiPhase(st.xi, b, pairs.bins.nb);
        if (ph > 0) {
          const yD = G.cBase - hNorm(G, pairs.fD[b], pairs.fmax), yR = G.cBase - hNorm(G, pairs.fR[b], pairs.fmax);
          const fill = smooth(xiStage(ph, 'fill'));
          if (fill > 0 && Math.abs(yD - yR) > 0.05) seg(xd, yR, xd, yR + (yD - yR) * fill, hw, LRGC, (yD < yR ? 1 : 0.6) * A, 0);
          seg(xd - hw - 3, yR, xd + hw + 3, yR, KEY_HW, RANDOM, smooth(xiStage(ph, 'tick')) * A, 0);
          const t = smoother(xiStage(ph, 'drop'));
          if (t > 0) {
            dropCap(G, pairs, b, t, DC);
            if (Math.abs(DC.h) > 0.25) seg(DC.x, DC.base, DC.x, DC.base - DC.h, DC.hw, LRGC, A, 0);
          }
        }
      }
    }
    if (st.panel > 0 && st.xi > 0) lensBins().forEach((b, i) => {
      const o = lensOpen(st, xiPhase(st.xi, b, pairs.bins.nb)) * a;
      if (!(o > 0)) return;
      lensGeom(data, FR, W, H, i, LG);
      const yD = G.cBase - hNorm(G, pairs.fD[b], pairs.fmax), yR = G.cBase - hNorm(G, pairs.fR[b], pairs.fmax);
      const xd = xs(G, binCentre(pairs, b)) - 0.21 * G.bw;
      const hw = 0.17 * G.bw, top = Math.min(yR, yD) - 6, bot = Math.max(yR, yD) + 6;
      seg(xd - hw - 4, top, xd + hw + 4, top, KEY_HW, SOFT, o, 0); seg(xd - hw - 4, bot, xd + hw + 4, bot, KEY_HW, SOFT, o, 0);
      seg(xd - hw - 4, top, xd - hw - 4, bot, KEY_HW, SOFT, o, 0); seg(xd + hw + 4, top, xd + hw + 4, bot, KEY_HW, SOFT, o, 0);
      seg(LG.x, LG.y + LG.h / 2, LG.x + LG.w, LG.y + LG.h / 2, LG.h / 2, GROUND, 0.92 * o, 0);
      seg(LG.x, LG.y, LG.x + LG.w, LG.y, KEY_HW, SOFT, o, 0); seg(LG.x, LG.y + LG.h, LG.x + LG.w, LG.y + LG.h, KEY_HW, SOFT, o, 0);
      seg(LG.x, LG.y, LG.x, LG.y + LG.h, KEY_HW, SOFT, o, 0); seg(LG.x + LG.w, LG.y, LG.x + LG.w, LG.y + LG.h, KEY_HW, SOFT, o, 0);
      const xr = LG.xr, xdl = LG.xd, ex = LENS_X * (yR - yD);
      seg(xr, LG.cBot, xr, LG.yR, LG.colW, RANDOM, 0.9 * o, 0);
      seg(xdl, LG.cBot, xdl, LG.yR, LG.colW, TEXT, 0.9 * o, 0);
      if (Math.abs(ex) > 0.25) seg(xdl, LG.yR, xdl, LG.yR - ex, LG.colW, LRGC, o, 0);
      seg(xr - LG.colW - 6, LG.yR, xdl + LG.colW + 6, LG.yR, KEY_HW, RANDOM, o, 0);
    });

    ctOn = st.panel > 0 && patchRowsA(st) > 0 ? countsTitleBox(G, H, CT) : null;
    if (st.dd > 0 && st.dd < 1) sticks(pairs.sticksD, st.dd, pairs.fD, -1, TEXT, a);
    if (st.rr > 0 && st.rr < 1) sticks(pairs.sticksR, st.rr, pairs.fR, +1, RANDOM, a);
    if (st.bao > 0) {
      const A = smooth((st.bao - BAO_START) * 8) * a, rad = shellRadius(st.bao);
      project(FR, gx, gy, P);
      const As = A * (1 - smooth((st.spl || 0) / 0.3));
      if (rad * FR.k > 0.5) circle(P[0], P[1], rad * FR.k, 1, 1.3, TEXT, As, true);
      const Ar = smooth((st.bao - 0.75) / 0.15) * (1 - smooth((st.spl || 0) / 0.3)) * a;
      if (Ar > 0) inked(P[0], P[1], P[0], P[1] + rad * FR.k, 1.3, TEXT, Ar);
    }
    if (st.desi > 0 && data.desi && data.desi.lrg) buildDesiPlot(st, W, H);
    if (st.spl > 0 && pairs.split >= 0) {
      const k = pairs.split, xx = pairs.dx[k], xy = pairs.dy[k];
      const mx = (gx + xx) / 2, my = (gy + xy) / 2, ml = Math.hypot(mx, my), ux = mx / ml, uy = my / ml;
      const ex = xx - gx, ey = xy - gy, par = ex * ux + ey * uy;
      const cxw = gx + par * ux, cyw = gy + par * uy;
      project(FR, gx, gy, P); project(FR, xx, xy, Q); project(FR, cxw, cyw, R);
      const A = smooth(st.spl / 0.4) * a, e1 = smooth((st.spl - 0.3) / 0.35), e2 = smooth((st.spl - 0.6) / 0.35);
      inked(P[0], P[1], Q[0], Q[1], 1.5, TEXT, A);
      seg(P[0], P[1], P[0], P[1], 6.5, GROUND, 0.85 * A); seg(P[0], P[1], P[0], P[1], 4.5, TEXT, A);
      seg(Q[0], Q[1], Q[0], Q[1], 6.5, GROUND, 0.85 * A); seg(Q[0], Q[1], Q[0], Q[1], 4.5, TEXT, A);
      if (e1 > 0) inked(P[0], P[1], P[0] + (R[0] - P[0]) * e1, P[1] + (R[1] - P[1]) * e1, 1.5, TEXT, 0.9 * A);
      if (e2 > 0) {
        inked(R[0], R[1], R[0] + (Q[0] - R[0]) * e2, R[1] + (Q[1] - R[1]) * e2, 1.5, TEXT, 0.9 * A);
        const d1x = P[0] - R[0], d1y = P[1] - R[1], l1 = Math.hypot(d1x, d1y) || 1, d2x = Q[0] - R[0], d2y = Q[1] - R[1], l2 = Math.hypot(d2x, d2y) || 1, q = 9;
        const ax = R[0] + d1x / l1 * q, ay = R[1] + d1y / l1 * q, bx = R[0] + d2x / l2 * q, by = R[1] + d2y / l2 * q;
        seg(ax, ay, ax + d2x / l2 * q, ay + d2y / l2 * q, KEY_HW, TEXT, 0.8 * A * e2);
        seg(bx, by, bx + d1x / l1 * q, by + d1y / l1 * q, KEY_HW, TEXT, 0.8 * A * e2);
      }
    }
  }

  function buildClose(st, W, H) {
    const a = st.mk;
    if (st.ring > 0) {
      project(FR, ring.x, ring.y, P);
      circle(P[0], P[1], ring.r * FR.k, st.ring, 2.0, TEXT, smooth(st.ring * 4) * a, true);
    }
    if (st.gap > 0 && sp && data.skewers.hero) {
      const h = data.skewers.hero, A = smooth(st.gap / 0.08) * a;
      insetGeom(data, FR, W, H, I);
      const e = insetGrow(st.gap);
      magnifier(data, FR, I, e, M);
      polar(sp.stretch[0], h.theta, P); polar(sp.stretch[1], h.theta, Q);
      const dx = Q[0] - P[0], dy = Q[1] - P[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 7, ny = dx / l * 7;
      inked(P[0] - nx, P[1] - ny, P[0] + nx, P[1] + ny, 1.0, TEXT, A);
      inked(Q[0] - nx, Q[1] - ny, Q[0] + nx, Q[1] + ny, 1.0, TEXT, A);
      magnify(M, I.pad + I.innerW / 2, 0, R);
      if (e > 0.3) inked(M.ax, M.ay, R[0], R[1], KEY_HW, SOFT, 0.8 * smooth((e - 0.3) / 0.4) * a);
      const w = I.x1 - I.x0;
      magnify(M, 0, I.h / 2, P); magnify(M, w, I.h / 2, Q);
      seg(P[0], P[1], Q[0], Q[1], M.k * I.h / 2, GROUND, 0.92 * A, 0);
      magnify(M, I.pad, 0, P); magnify(M, w - I.pad, 0, Q);
      seg(P[0], P[1], Q[0], Q[1], KEY_HW, AXIS, smooth((e - 0.5) / 0.5) * a, 0);
      const T = sp.trace, th = I.traceBot - I.traceTop, ly = f => I.traceBot - Math.min(1.12, Math.max(-0.05, f)) * th - I.y0;
      const lx = r => insetX(I, sp, r) - I.x0;
      for (let j = 1; j < T.r.length; j++) {
        magnify(M, lx(T.r[j - 1]), ly(T.f[j - 1]), P); magnify(M, lx(T.r[j]), ly(T.f[j]), Q);
        seg(P[0], P[1], Q[0], Q[1], KEY_HW, TEXT, A);
      }
      const sy = (I.strip0 + I.strip1) / 2 - I.y0, sl = I.pad, sw = I.innerW, bw = sw / STRIP_N;
      for (let k = 0; k < STRIP_N; k++) {
        magnify(M, sl + k * bw, sy, P); magnify(M, sl + (k + 1) * bw + (k < STRIP_N - 1 ? 0.5 : 0), sy, Q);
        seg(P[0], P[1], Q[0], Q[1], M.k * I.stripH / 2, STRIP0 + k, A, 0);
      }
      const nh = Math.max(3, Math.round(I.headL / 2)), hx = sl + sw;
      for (let j = 0; j < nh; j++) {
        const x = hx + (j + 0.5) * I.headL / nh, hh = Math.max(1.2, I.headH * (1 - (j + 0.5) / nh));
        magnify(M, x, sy - hh, P); magnify(M, x, sy + hh, Q);
        seg(P[0], P[1], Q[0], Q[1], M.k * Math.max(KEY_HW, I.headL / nh / 2), STRIP0 + STRIP_N - 1, A, 0);
      }
      const C = smooth(insetPhase(st.gap, 'ticks')) * a;
      for (let j = 0; j < sp.dips.length; j++) { const x = insetX(I, sp, sp.dips[j]); seg(x, I.tick0, x, I.tick1, 1.2, TEXT, C, 0); }
      const x00 = I.x0 + I.pad, Rr = smooth(insetPhase(st.gap, 'res')) * a, Rg = smooth(insetPhase(st.gap, 'gal')) * a;
      if (Rr > 0) {
        seg(x00, I.resY, I.res1, I.resY, 2.2, TEXT, Rr, 0);
        seg(x00, I.resY - 7, x00, I.resY + 7, 1.0, TEXT, Rr, 0); seg(I.res1, I.resY - 7, I.res1, I.resY + 7, 1.0, TEXT, Rr, 0);
      }
      if (Rg > 0) {
        seg(x00, I.galY, I.gal0, I.galY, KEY_HW, SOFT, 0.6 * Rg, 0);
        seg(I.gal0, I.galY, I.gal1, I.galY, 2.2, TEXT, Rg, 0);
        seg(I.gal0, I.galY - 7, I.gal0, I.galY + 7, 1.0, TEXT, Rg, 0); seg(I.gal1, I.galY - 7, I.gal1, I.galY + 7, 1.0, TEXT, Rg, 0);
        seg(x00, I.galY - 5, x00, I.galY + 5, KEY_HW, SOFT, Rg, 0);
      }
      const bp = smoother(insetPhase(st.gap, 'bar'));
      if (bp > 0) {
        const x0 = I.x0 + I.pad, x1 = x0 + (I.barEnd - x0) * bp;
        seg(x0, I.barY, x1, I.barY, 1.6, TEXT, a, 0);
        seg(x0, I.barY - 6, x0, I.barY + 6, 1.0, TEXT, a, 0);
        seg(x1, I.barY - 6, x1, I.barY + 6, 1.0, TEXT, a, 0);
      }
    }
  }

  const DI = {};
  function buildDesiPlot(st, W, H) {
    const Lr = data.desi.lrg, a = st.mk, u = unitPx(W, H);
    desiPlotGeom(pairs, data.desi, W, H, DI);
    seg(DI.x0, DI.top, DI.x0, DI.bot, KEY_HW, AXIS, desiFrameA(st) * a, 0);
    const to = desiFitTo(st, DI), ffa = desiFitA(st) * a, mh = Math.max(KEY_HW, 0.18 * u);
    if (ffa > 0) for (let j = 1; j < Lr.fs.length; j++) {
      if (Lr.fs[j - 1] >= to) break;
      const s1 = Math.min(Lr.fs[j], to), f = (s1 - Lr.fs[j - 1]) / (Lr.fs[j] - Lr.fs[j - 1]), y1 = Lr.f[j - 1] + (Lr.f[j] - Lr.f[j - 1]) * f;
      seg(DI.xOf(Lr.fs[j - 1]), DI.yOf(Lr.f[j - 1]), DI.xOf(s1), DI.yOf(y1), mh, LRGC, ffa);
    }
    const r = 0.55 * u, eh = Math.max(KEY_HW, 0.16 * u);
    for (let j = 0; j < Lr.s.length; j++) {
      const pa = desiPtA(st, Lr.s[j], DI) * a;
      if (!(pa > 0)) continue;
      const x = DI.xOf(Lr.s[j]);
      seg(x, DI.yOf(Lr.v[j] - Lr.e[j]), x, DI.yOf(Lr.v[j] + Lr.e[j]), eh, LRGC, pa, 0);
      seg(x, DI.yOf(Lr.v[j]), x, DI.yOf(Lr.v[j]), r, LRGC, pa);
    }
  }
  const SG = {};
  function buildSlice(st, W, H) {
    sliceGeom(data, W, H, SG);
    const a = st.slice;
    for (const [kind, pts] of SG.lines) {
      const col = kind === 'slice' ? TEXT : AXIS, hw = kind === 'slice' ? 1.3 : KEY_HW, al = kind === 'slice' ? a : 0.65 * a;
      for (let j = 1; j < pts.length; j++) seg(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1], hw, col, al);
    }
    const A = SG.arrow;
    seg(A.x, A.y0, A.x, A.y1, KEY_HW, TEXT, a);
    seg(A.x, A.y1 + 0.5, A.x - 0.7 * A.head, A.y1 - A.head, KEY_HW, TEXT, a); seg(A.x, A.y1 + 0.5, A.x + 0.7 * A.head, A.y1 - A.head, KEY_HW, TEXT, a);
  }

  const RP = [[0.42, 0.022], [0.5, 0.03], [0.57, 0.018], [0.65, 0.026], [0.72, 0.02], [0.8, 0.03], [0.87, 0.022]];
  const RA = [0, 0], RB = [0, 0];
  const RC = [0, 0], RN = [0, 0];
  function readSim(st, F, W, H, h, R) {
    const set = 1 - (st.settle || 0), uu = unitPx(W, H), sn = Math.sin(h.theta), cs = Math.cos(h.theta);
    project(F, h.rStart * sn, h.rStart * cs, RC); project(F, h.rEnd * sn, h.rEnd * cs, RN);
    const dx = RN[0] - RC[0], dy = RN[1] - RC[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const down = ny >= 0 ? 1 : -1;
    const at = (r, off, out) => { project(F, r * sn, r * cs, out); out[0] += down * nx * off; out[1] += down * ny * off; return out; };
    const aA = (st.ra || 0) * set;
    if (aA > 0) {
      const nEnd = Math.max(1, Math.round(Math.min(1, (st.ra || 0)) * (R.r.length - 1)));
      let p0 = at(R.r[0], (1 - R.F[0]) * READ_DEPTH * uu, [0, 0]);
      for (let j = 1; j <= nEnd; j++) { const p1 = at(R.r[j], (1 - R.F[j]) * READ_DEPTH * uu, [0, 0]); seg(p0[0], p0[1], p1[0], p1[1], KEY_HW, TEXT, aA); p0 = p1; }
    }
    const aS = (st.rs || 0) * set;
    if (aS > 0) {
      const off = READ_BAR_OFF * uu, tick = 0.5 * uu;
      for (const [r0, r1] of readBarSpans(h, R.bars)) {
        const A0 = at(r0, off, [0, 0]), A1 = at(r1, off, [0, 0]);
        seg(A0[0], A0[1], A1[0], A1[1], KEY_HW, TEXT, aS);
        for (const P0 of [A0, A1]) seg(P0[0] - down * nx * tick, P0[1] - down * ny * tick, P0[0] + down * nx * tick, P0[1] + down * ny * tick, KEY_HW, TEXT, aS);
      }
    }
    const a = st.rp * set, n = R.pairs.length, lift = 1.8 * uu;
    R.pairs.forEach(([ra, rb], i) => {
      const ai = a * Math.max(0, Math.min(1, (st.rp * (n + 1) - i) / 1.4));
      if (!(ai > 0)) return;
      project(F, ra * sn, ra * cs, RA); project(F, rb * sn, rb * cs, RB);
      let px0 = RA[0], py0 = RA[1];
      for (let j = 1, k = 10; j <= k; j++) {
        const f = j / k, x = RA[0] + (RB[0] - RA[0]) * f, y = RA[1] + (RB[1] - RA[1]) * f - lift * Math.sin(Math.PI * f);
        seg(px0, py0, x, y, KEY_HW, TEXT, ai); px0 = x; py0 = y;
      }
      seg(RA[0], RA[1], RA[0], RA[1], 0.35 * uu, TEXT, ai); seg(RB[0], RB[1], RB[0], RB[1], 0.35 * uu, TEXT, ai);
    });
  }
  function readPairs(st, F, W, H, h) {
    if (data.readSim) { readSim(st, F, W, H, h, data.readSim); return; }
    const a = st.rp * (1 - (st.settle || 0)), uu = unitPx(W, H), r1 = Math.max(h.rq || 0, h.rEnd), span = r1 - h.rStart;
    const sn = Math.sin(h.theta), cs = Math.cos(h.theta), n = RP.length;
    RP.forEach(([t, d], i) => {
      const ai = a * Math.max(0, Math.min(1, (st.rp * (n + 1) - i) / 1.4));
      if (!(ai > 0)) return;
      const ra = h.rStart + t * span, rb = ra + d * span;
      project(F, ra * sn, ra * cs, RA); project(F, rb * sn, rb * cs, RB);
      const lift = 1.8 * uu, k = 10;
      let px0 = RA[0], py0 = RA[1];
      for (let j = 1; j <= k; j++) {
        const f = j / k, x = RA[0] + (RB[0] - RA[0]) * f, y = RA[1] + (RB[1] - RA[1]) * f - lift * Math.sin(Math.PI * f);
        seg(px0, py0, x, y, KEY_HW, TEXT, ai); px0 = x; py0 = y;
      }
      seg(RA[0], RA[1], RA[0], RA[1], 0.35 * uu, TEXT, ai); seg(RB[0], RB[1], RB[0], RB[1], 0.35 * uu, TEXT, ai);
    });
  }
  const lyaM = data.lya ? createLyaMarks(data, pal, seg, inked, { GROUND, TEXT, SOFT, ACCENT, RANDOM, AXIS, QSO: QSOC }) : null;
  function build(st, F, W, H) {
    n = 0; FR = F;
    const hq = data.skewers && data.skewers.hero;
    if (hq && (st.heroQ || 0) > 0) { project(F, hq.qx, hq.qy, P); seg(P[0], P[1], P[0], P[1], HERO_R * unitPx(W, H), QSOC, st.heroQ); }
    if (hq && ((st.rp || 0) > 0 || (st.ra || 0) > 0 || (st.rs || 0) > 0)) readPairs(st, F, W, H, hq);
    if (st.mk > 0) {
      if (pairs && (st.pbox > 0 || st.rnd > 0 || st.panel > 0 || st.dd > 0 || st.bao > 0 || st.spl > 0)) buildPairs(st, W, H);
      if (st.ring > 0 || st.gap > 0) buildClose(st, W, H);
    }
    if ((st.slice || 0) > 0) buildSlice(st, W, H);
    if (lyaM && (st.lq > 0 || st.lpanel > 0)) lyaM.build(st, F, W, H);
    return n;
  }
  return { buf, build, count: () => n };
}
