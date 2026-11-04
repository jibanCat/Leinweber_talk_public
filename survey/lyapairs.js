
import { project } from './camera.js';
import { KEY_HW, patchKey, mustPx, unitPx } from './marks.js';
import { S_MIN as G_SMIN, BIN_W as G_BINW, NB as G_NB } from './pairs.js';
import { hash32 } from './hash.js';
import { LW, DESI_CURVES } from '../program.js';

export const DRAW_EVERY = 4;

export const GLYPH_N = 96, GLYPH_VMAX = 1.8;
export const GLYPH_WORDS = { title: 'δ = F/{bar:F} − 1', f: 'F: light let through', mean: '{bar:F}', less: 'less light' };

export const CONN = ['along', 'across', 'quasar'];
export const ALONG_AT = 0.22, ALONG_S = 100, NEAR_S = [85, 105], QSO_MU = 0.3;
export const CONN_T = { glyphOut: [0, 0.08], along: [0.2, 0.42], across: [0.44, 0.66], quasar: [0.68, 0.9] };
export const CONN_WORDS = { along: 'along one sightline', across: 'across sightlines', quasar: 'with a quasar' };
export const CONN_EM = { along: 8.6, across: 7.5, quasar: 6.15 };
export const PALE = 0.55;

export const DESI_S = [50, 150];
export const Y_PAD = 0.06;

const LYA = 1215.67;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const smoother = x => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };

function b64(s) {
  if (typeof atob === 'function') { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; }
  return new Uint8Array(Buffer.from(s, 'base64'));
}

export function prepareLyaPairs(json, fanX, fanY, dc) {
  if (!json || !json.patch || !json.field) return null;
  const bins = json.bins;
  if (bins.nb !== G_NB || bins.sMin !== G_SMIN || bins.w !== G_BINW) throw new Error('lya_pairs.json: bins differ from pairs.js');
  const F = json.field, dq = b64(F.delta_b64), wq = b64(F.weight_b64), step = F.step_A;
  const wScale = Number((/\* ([\d.]+)/.exec(F.weight_scale) || [])[1]) || 1;
  const S = json.sticks, used = new Set();
  const fi = (fields, name) => fields.indexOf(name);
  for (const r of S.lya_qso) used.add(r[fi(S.lya_qso_fields, 'fan_i (sightline)')]);
  for (const r of S.lya_lya) { used.add(r[fi(S.lya_lya_fields, 'fan_i (sightline i)')]); used.add(r[fi(S.lya_lya_fields, 'fan_j (sightline j)')]); }
  const drawn = F.sightlines.filter(([f]) => used.has(f) || hash32(f, 0x1a9) % DRAW_EVERY === 0);
  const q8 = k => (dq[k] << 24) >> 24;
  let nPix = 0;
  for (const [, , n, off] of drawn) for (let k = 0; k < n; k++) if (q8(off + k) !== -128) nPix++;
  const field = new Float32Array(6 * nPix);
  let o = 0;
  for (const [f, lam0, n, off] of drawn) {
    const ux0 = fanX[f], uy0 = fanY[f], l = Math.hypot(ux0, uy0), ux = ux0 / l, uy = uy0 / l;
    for (let k = 0; k < n; k++) {
      const q = q8(off + k);
      if (q === -128) continue;
      const lam = lam0 + k * step, ra = dc((lam - step / 2) / LYA - 1), rb = dc((lam + step / 2) / LYA - 1);
      field[o] = ra * ux; field[o + 1] = ra * uy; field[o + 2] = rb * ux; field[o + 3] = rb * uy;
      field[o + 4] = q / 50; field[o + 5] = wq[off + k] / 255 * wScale;
      o += 6;
    }
  }
  const pt = json.patch;

  let glyph = null;
  {
    const f = S.lya_qso_fields, ix = n => f.indexOf(n), b0 = S.lya_qso.filter(r => r[ix('bin')] === 0);
    const lead = b0.reduce((m, r) => (Math.abs(r[ix('delta')]) > Math.abs(m[ix('delta')]) ? r : m), b0[0]);
    const fiS = lead[ix('fan_i (sightline)')], lamP = lead[ix('lambda (A)')];
    const sl = F.sightlines.find(([g]) => g === fiS);
    if (sl) {
      const [, lam0, n, off] = sl, kc = Math.round((lamP - lam0) / step), k0 = Math.max(0, Math.min(n - GLYPH_N, kc - (GLYPH_N >> 1)));
      const m = Math.min(GLYPH_N, n), delta = new Float32Array(m);
      let kMin = -1;
      for (let k = 0; k < m; k++) {
        const q = q8(off + k0 + k);
        delta[k] = q === -128 ? NaN : q / 50;
        if (q !== -128 && (kMin < 0 || delta[k] < delta[kMin])) kMin = k;
      }
      glyph = { fan_i: fiS, lam0: lam0 + k0 * step, step, delta, kMin, kLead: kc - k0, leadDelta: lead[ix('delta')] };
    }
  }

  const bin100 = Math.floor((100 - bins.sMin) / bins.w);
  const near = s => s >= NEAR_S[0] && s < NEAR_S[1];
  const pairs = {};
  {
    const f = S.lya_lya_fields, ix = n => f.indexOf(n), c = S.lya_lya.filter(r => near(r[ix('s')]));
    const r = c.reduce((m, q) => (Math.abs(q[ix('mu')]) < Math.abs(m[ix('mu')]) ? q : m), c[0]);
    pairs.across = { a: [r[0], r[1]], b: [r[2], r[3]], s: r[ix('s')], mu: r[ix('mu')], fan: [r[ix('fan_i (sightline i)')], r[ix('fan_j (sightline j)')]],
      delta: [r[ix('delta_i')], r[ix('delta_j')]] };
  }
  {
    const rMid = (pt.r0 + pt.r1) / 2, tT = pt.ta + ALONG_AT * (pt.tb - pt.ta);
    const cand = drawn.map(sl => [sl, Math.abs(Math.atan2(fanX[sl[0]], fanY[sl[0]]) - tT)]).sort((p, q) => p[1] - q[1] || p[0][0] - q[0][0]);
    for (const [[f, lam0, n, off]] of cand) {
      const rOf = k => dc((lam0 + k * step) / LYA - 1);
      let ka = -1, da = Infinity;
      for (let k = 0; k < n; k++) { if (q8(off + k) === -128) continue; const d = Math.abs(rOf(k) - (rMid - ALONG_S / 2)); if (d < da) { da = d; ka = k; } }
      if (ka < 0 || da > 3) continue;
      let kb = -1, db = Infinity;
      for (let k = ka + 1; k < n; k++) { if (q8(off + k) === -128) continue; const d = Math.abs(rOf(k) - rOf(ka) - ALONG_S); if (d < db) { db = d; kb = k; } }
      if (kb < 0 || db > 3) continue;
      const l = Math.hypot(fanX[f], fanY[f]), ux = fanX[f] / l, uy = fanY[f] / l, ra = rOf(ka), rb = rOf(kb);
      pairs.along = { a: [ra * ux, ra * uy], b: [rb * ux, rb * uy], s: rb - ra, mu: 1, fan: [f, f], delta: [q8(off + ka) / 50, q8(off + kb) / 50], lambda: [lam0 + ka * step, lam0 + kb * step] };
      break;
    }
  }
  {
    const f = S.lya_qso_fields, ix = n => f.indexOf(n), c0 = S.lya_qso.filter(r => near(r[ix('s')]));
    const c = c0.filter(r => Math.abs(r[ix('mu')]) <= QSO_MU).length ? c0.filter(r => Math.abs(r[ix('mu')]) <= QSO_MU) : c0;
    const m0 = [(pairs.across.a[0] + pairs.across.b[0]) / 2, (pairs.across.a[1] + pairs.across.b[1]) / 2];
    const far = r => Math.hypot((r[0] + r[2]) / 2 - m0[0], (r[1] + r[3]) / 2 - m0[1]);
    const r = c.reduce((m, q) => (far(q) > far(m) ? q : m), c[0]);
    pairs.quasar = { a: [r[0], r[1]], b: [r[2], r[3]], s: r[ix('s')], mu: r[ix('mu')], fan: [r[ix('fan_i (sightline)')], r[ix('fan_i (quasar)')]], delta: [r[ix('delta')]] };
  }

  const H = json.headline, G = json.galaxy_demo;
  const fmtBig = v => (v >= 1e9 ? `${(v / 1e9).toFixed(1)} billion` : v >= 1e6 ? `${(v / 1e6).toFixed(1)} million` : v >= 1e3 ? `${Math.round(v / 1e3)} thousand` : String(v));
  const share = H.desi_dr1_lya_sample.forests_region_A / json.patch.counts.sightlines;
  return {
    patch: { tc: pt.tc, ta: pt.ta, tb: pt.tb, half: pt.half, r0: pt.r0, r1: pt.r1 },
    quasars: Float32Array.from(json.quasars.x.flatMap((x, i) => [x, json.quasars.y[i]])), nq: json.quasars.x.length,
    field, nField: nPix, nDrawn: drawn.length, nSightlines: F.sightlines.length,
    bins: { nb: bins.nb, sMin: bins.sMin, w: bins.w, sMax: bins.sMax }, bin100, pairs,
    forests: H.desi_dr1_lya_sample.forests_region_A, share, depth: json.patch.depth,
    galaxyPairs: G.pairs_in_bins,
    words: {
      pixelQuasarPairs: `pixel–quasar: ${fmtBig(H.pairs_in_bins.lya_qso)}`,
      pixelPairs: `pixel pairs: ${fmtBig(H.pairs_in_bins.lya_lya)}`,
      share: `1/${Math.round(share)} of DR1`,
      quasarPairs: `quasar pairs: ${fmtBig(H.pairs_in_bins.qso_qso)}`,
      apart: (() => { const v = CONN.filter(k => pairs[k]).map(k => Math.round(pairs[k].s / 10) * 10), a = Math.min(...v), b = Math.max(...v); return a === b ? `≈ ${a}` : `${a}–${b}`; })(),
      galaxyPairs: `galaxy pairs: ${fmtBig(G.pairs_in_bins)}`,
    },
    glyph,
    provenance: json.provenance, sha: json.provenance && json.provenance.script_sha256,
  };
}

export function prepareDesiXi(json, zPatch) {
  if (!json || !Array.isArray(json.series)) return null;
  const by = Object.fromEntries(json.series.map(s => [s.id, s]));
  const inS = x => x >= DESI_S[0] - 1e-9 && x <= DESI_S[1] + 1e-9;
  const cut = (x, ...cols) => { const k = x.map((v, i) => (inS(v) ? i : -1)).filter(i => i >= 0); return [k.map(i => x[i]), ...cols.map(c => k.map(i => c[i]))]; };
  const pad = ([lo, hi]) => [lo - Y_PAD * (hi - lo), hi + Y_PAD * (hi - lo)];
  const out = { lrg: null, auto: null, cross: null, release: json.release || 'DR2' };
  const lrgs = json.series.filter(s => /^LRG\d$/.test(s.id) && s.used_in_cosmology !== false && Array.isArray(s.z_range) && s.data && s.best_fit);
  const L = lrgs.find(s => Number.isFinite(zPatch) && zPatch >= s.z_range[0] && zPatch < s.z_range[1]) || by.LRG2 || null;
  if (L && L.data && L.best_fit) {
    const [s, v, e] = cut(L.data.s, L.data.s2xi0, L.data.s2xi0_err), [fs, f] = cut(L.best_fit.s, L.best_fit.s2xi0);
    let lo = Infinity, hi = -Infinity;
    s.forEach((_, i) => { lo = Math.min(lo, v[i] - e[i]); hi = Math.max(hi, v[i] + e[i]); });
    f.forEach(y => { lo = Math.min(lo, y); hi = Math.max(hi, y); });
    out.lrg = { id: L.id, zRange: L.z_range.slice(), zEff: L.z_eff, s, v, e, fs, f, ylim: pad([lo, hi]) };
  }
  const Wg = by.Lya_single_wedge;
  if (Wg && Wg.notebook_ylim) for (const k of ['auto', 'cross']) {
    const w = Wg[k];
    if (!w || !Array.isArray(w.r) || !Array.isArray(Wg.notebook_ylim[k])) continue;
    const [r, v, e, m] = cut(w.r, w.value, w.err, w.model);
    out[k] = { r, v, e, m, zEff: Wg.z_eff, notebook: Wg.notebook_ylim[k].slice(), ylim: pad(Wg.notebook_ylim[k]) };
  }
  return out.lrg || out.auto || out.cross ? out : null;
}

export const LP = {
  x0: 0.555, x1: 0.945, s0: 45, s1: 155, cap: 0.195, ticks: [50, 100, 150], guide: 100,
  A: { title: 0.25, top: 0.285, bot: LW ? 0.665 : 0.475 },
  X: { title: 0.52, top: 0.555, bot: 0.755 },
  axis: LW ? 0.665 : 0.755,
};
export function lyaGeom(desi, W, H, out) {
  out.x0 = LP.x0 * W; out.x1 = LP.x1 * W; out.sx = (out.x1 - out.x0) / (LP.s1 - LP.s0);
  for (const [r, k] of [['A', 'auto'], ['X', 'cross']]) {
    const R = LP[r], D = desi && desi[k];
    out[r] = { title: R.title * H, top: R.top * H, bot: R.bot * H, h: (R.bot - R.top) * H, lo: D ? D.ylim[0] : -1, hi: D ? D.ylim[1] : 1 };
  }
  out.axis = LP.axis * H; out.cap = LP.cap * H;
  return out;
}
export const lyaX = (G, s) => G.x0 + (s - LP.s0) * G.sx;
export const rowY = (G, row, v) => G[row].bot - (v - G[row].lo) / (G[row].hi - G[row].lo) * G[row].h;
export const ptAt = s => 0.05 + 0.6 * (s - DESI_S[0]) / (DESI_S[1] - DESI_S[0]);
export const ptA = (v, s) => smooth((v - ptAt(s)) / 0.05);
export const modelA = v => smooth((v - 0.68) / 0.05);
export const modelTo = v => DESI_S[0] + (DESI_S[1] - DESI_S[0]) * clamp01((v - 0.7) / 0.25);
export const guideA = st => smooth(((st.lA || 0) - 0.68) / 0.1) * (st.lpanel || 0);
export const glyphR = (W, H) => 0.8 * unitPx(W, H);
export const ringHW = (W, H) => Math.max(KEY_HW, 0.17 * unitPx(W, H));

export function glyphGeom(lya, W, H, out) {
  out.x0 = LP.x0 * W; out.x1 = LP.x1 * W; out.top = 0.245 * H; out.bot = 0.42 * H; out.titleY = LP.cap * H;
  out.yOf = v => out.bot - Math.max(0, Math.min(GLYPH_VMAX, v)) / GLYPH_VMAX * (out.bot - out.top);
  out.yMean = out.yOf(1);
  const g = lya.glyph, n = g ? g.delta.length : 1;
  out.xOf = k => out.x0 + (k + 0.5) / n * (out.x1 - out.x0);
  out.xLess = g ? out.xOf(g.kMin) : out.x0; out.yLess = out.yOf(g ? 1 + g.delta[g.kMin] : 0) + 0.25 * mustPx(H);
  return out;
}
export const glyphAlpha = st => (DESI_CURVES ? 1 : 0) * (st.lq || 0) * (1 - smooth(((st.lk || 0) - CONN_T.glyphOut[0]) / (CONN_T.glyphOut[1] - CONN_T.glyphOut[0])));

export function pairState(st, kind, out = {}) {
  const lk = st.lk || 0, A = st.lA || 0, X = st.lX || 0, [a, b] = CONN_T[kind];
  out.grow = smoother((lk - a) / (0.6 * (b - a)));
  const shown = out.grow > 0 ? 1 : 0, nameIn = smooth((lk - a - 0.62 * (b - a)) / (0.3 * (b - a)));
  const offA = smooth(A / 0.1), offX = smooth(X / 0.1), card = 1 - smooth((st.lscale || 0) / 0.3);
  const lit = kind === 'along' ? 1 - offA : kind === 'across' ? 1 - offX : Math.max(1 - offA, offX);
  out.lit = lit;
  out.line = shown * card * (st.lq || 0);
  out.label = nameIn * (LW ? Math.max(lit, PALE) : lit) * card * (st.lq || 0);
  return out;
}
const PAD = 10, EP = [0, 0], EQ = [0, 0], OA = [0, 0], OB = [0, 0];
export function pairGeom(lya, kind, F, W, H, out = {}) {
  const p = lya.pairs[kind], fs = mustPx(H), w = (CONN_EM[kind] + 0.6) * fs, h = 1.24 * fs, gap = 0.45 * fs;
  out.P = out.P || [0, 0]; out.Q = out.Q || [0, 0];
  project(F, p.a[0], p.a[1], out.P); project(F, p.b[0], p.b[1], out.Q);
  const mx = (out.P[0] + out.Q[0]) / 2, my = (out.P[1] + out.Q[1]) / 2;
  const dx = out.Q[0] - out.P[0], dy = out.Q[1] - out.P[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const pt = lya.patch;
  const edge = (t, y) => { project(F, pt.r0 * Math.sin(t), pt.r0 * Math.cos(t), EP); project(F, pt.r1 * Math.sin(t), pt.r1 * Math.cos(t), EQ); return EP[0] + (y - EP[1]) * (EQ[0] - EP[0]) / (EQ[1] - EP[1]); };
  project(F, pt.r1 * Math.sin(pt.ta), pt.r1 * Math.cos(pt.ta), EP); project(F, pt.r1 * Math.sin(pt.tb), pt.r1 * Math.cos(pt.tb), EQ);
  const yTop = Math.max(EP[1], EQ[1]);
  project(F, pt.r0 * Math.sin(pt.tc), pt.r0 * Math.cos(pt.tc), EP); const yBot = EP[1];
  const lx0 = Math.min(out.P[0], out.Q[0]), lx1 = Math.max(out.P[0], out.Q[0]), ly0 = Math.min(out.P[1], out.Q[1]), ly1 = Math.max(out.P[1], out.Q[1]);
  const inX = (x0, y0) => Math.min(Math.max(x0, Math.max(edge(pt.ta, y0), edge(pt.ta, y0 + h)) + PAD + 1), Math.min(edge(pt.tb, y0), edge(pt.tb, y0 + h)) - PAD - 1 - w);
  const right = () => ({ x0: lx1 + gap, y0: my - h / 2 }), left = () => ({ x0: lx0 - gap - w, y0: my - h / 2 });
  const above = () => { const y0 = ly0 - gap - h; return { x0: inX(mx - w / 2, y0), y0 }; }, below = () => { const y0 = ly1 + gap; return { x0: inX(mx - w / 2, y0), y0 }; };
  const sx = nx >= 0 ? 1 : -1, hor = Math.abs(dx) > Math.abs(dy), cands = [];
  if (hor) cands.push(above(), below(), right(), left()); else cands.push(...(sx > 0 ? [right(), left()] : [left(), right()]), above(), below());
  const others = CONN.filter(k => k !== kind && lya.pairs[k]);
  const before = CONN.slice(0, CONN.indexOf(kind)).filter(k => lya.pairs[k]).map(k => pairGeom(lya, k, F, W, H, {}));
  const clear = B => {
    for (const O of before) if (B.x0 < O.x1 + 0.5 * fs && B.x0 + w > O.x0 - 0.5 * fs && B.y0 < O.y1 + 0.5 * fs && B.y0 + h > O.y0 - 0.5 * fs) return false;
    if (B.y0 < yTop + PAD || B.y0 + h > yBot - PAD) return false;
    if (B.x0 < lx1 + 4 && B.x0 + w > lx0 - 4 && B.y0 < ly1 + 4 && B.y0 + h > ly0 - 4) return false;
    if (B.x0 < Math.max(edge(pt.ta, B.y0), edge(pt.ta, B.y0 + h)) + PAD || B.x0 + w > Math.min(edge(pt.tb, B.y0), edge(pt.tb, B.y0 + h)) - PAD) return false;
    for (const k of others) {
      const o = lya.pairs[k]; project(F, o.a[0], o.a[1], OA); project(F, o.b[0], o.b[1], OB);
      for (let j = 0; j <= 20; j++) {
        const x = OA[0] + (OB[0] - OA[0]) * j / 20, y = OA[1] + (OB[1] - OA[1]) * j / 20;
        if (x > B.x0 - 14 && x < B.x0 + w + 14 && y > B.y0 - 14 && y < B.y0 + h + 14) return false;
      }
    }
    return true;
  };
  const B = cands.find(clear) || cands[0];
  out.x0 = B.x0; out.y0 = B.y0; out.x1 = B.x0 + w; out.y1 = B.y0 + h;
  out.lx = B.x0; out.ly = B.y0; out.anchor = 'translate(0, 0)';
  return out;
}

export function createLyaMarks(data, pal, seg, inked, C) {
  const L = data.lya, D = data.desi, G = {}, P = [0, 0], Q = [0, 0], PK = {}, GG = {}, PS = {}, PG = { P: [0, 0], Q: [0, 0] }, LBX = [];

  function ring(x, y, r, hw, col, a, N = 24) {
    for (let k = 0; k < N; k++) {
      const t0 = 2 * Math.PI * k / N, t1 = 2 * Math.PI * (k + 1) / N;
      seg(x + r * Math.cos(t0), y + r * Math.sin(t0), x + r * Math.cos(t1), y + r * Math.sin(t1), hw, col, a);
    }
  }
  function row(rowKey, d, v, a, W, H) {
    if (!d || !(v > 0)) return;
    const u = unitPx(W, H), r = glyphR(W, H), rh = ringHW(W, H), eh = Math.max(KEY_HW, 0.14 * u), cap = 0.35 * u, mh = Math.max(KEY_HW, 0.15 * u);
    const ma = modelA(v) * a, to = modelTo(v);
    if (ma > 0) for (let j = 1; j < d.r.length; j++) {
      if (d.r[j - 1] >= to) break;
      const s1 = Math.min(d.r[j], to), f = (s1 - d.r[j - 1]) / (d.r[j] - d.r[j - 1]), m1 = d.m[j - 1] + (d.m[j] - d.m[j - 1]) * f;
      seg(lyaX(G, d.r[j - 1]), rowY(G, rowKey, d.m[j - 1]), lyaX(G, s1), rowY(G, rowKey, m1), mh, C.ACCENT, ma);
    }
    for (let j = 0; j < d.r.length; j++) {
      const pa = ptA(v, d.r[j]) * a;
      if (!(pa > 0)) continue;
      const x = lyaX(G, d.r[j]), y = rowY(G, rowKey, d.v[j]), y0 = rowY(G, rowKey, d.v[j] - d.e[j]), y1 = rowY(G, rowKey, d.v[j] + d.e[j]);
      if (y0 > y + r) { seg(x, y + r, x, y0, eh, C.ACCENT, pa, 0); seg(x - cap, y0, x + cap, y0, eh, C.ACCENT, pa, 0); }
      if (y1 < y - r) { seg(x, y1, x, y - r, eh, C.ACCENT, pa, 0); seg(x - cap, y1, x + cap, y1, eh, C.ACCENT, pa, 0); }
      seg(x, y, x, y, r, C.GROUND, pa);
      ring(x, y, r, rh, C.ACCENT, pa);
    }
  }

  function build(st, F, W, H) {
    const pt = L.patch;
    if (st.lq > 0) {
      const A = 0.75 * st.lq, N = 40, pol = (r, t, out) => project(F, r * Math.sin(t), r * Math.cos(t), out);
      for (let k = 0; k < N; k++) {
        const t0 = pt.ta + (pt.tb - pt.ta) * k / N, t1 = pt.ta + (pt.tb - pt.ta) * (k + 1) / N;
        pol(pt.r0, t0, P); pol(pt.r0, t1, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, C.AXIS, A);
        pol(pt.r1, t0, P); pol(pt.r1, t1, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, C.AXIS, A);
      }
      pol(pt.r0, pt.ta, P); pol(pt.r1, pt.ta, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, C.AXIS, A);
      pol(pt.r0, pt.tb, P); pol(pt.r1, pt.tb, Q); seg(P[0], P[1], Q[0], Q[1], KEY_HW, C.AXIS, A);
      const qa = st.lq * (1 - smooth((st.lscale || 0) / 0.45)), arm = 3.6;
      LBX.length = 0;
      for (const k of CONN) if (L.pairs[k] && pairState(st, k, PS).label > 0) { pairGeom(L, k, F, W, H, PG); LBX.push([PG.x0, PG.y0, PG.x1, PG.y1]); }
      for (let i = 0; i < L.nq; i++) {
        project(F, L.quasars[2 * i], L.quasars[2 * i + 1], P);
        if (LBX.some(B => P[0] > B[0] - arm - 2 && P[0] < B[2] + arm + 2 && P[1] > B[1] - arm - 2 && P[1] < B[3] + arm + 2)) continue;
        seg(P[0] - arm, P[1], P[0] + arm, P[1], KEY_HW, C.QSO, qa, 0); seg(P[0], P[1] - arm, P[0], P[1] + arm, KEY_HW, C.QSO, qa, 0);
      }
      const ka = st.lq;
      patchKey(data, F, W, H, PK, pt);
      seg(PK.bx0, PK.by, PK.bx1, PK.by, KEY_HW, C.TEXT, ka, 0);
      seg(PK.bx0, PK.by - 6, PK.bx0, PK.by + 6, KEY_HW, C.TEXT, ka, 0); seg(PK.bx1, PK.by - 6, PK.bx1, PK.by + 6, KEY_HW, C.TEXT, ka, 0);
      seg(PK.ax, PK.ay0, PK.ax, PK.ay1, KEY_HW, C.TEXT, ka, 0);
      seg(PK.ax, PK.ay1 + 0.5, PK.ax - 6, PK.ay1 - 9, KEY_HW, C.TEXT, ka); seg(PK.ax, PK.ay1 + 0.5, PK.ax + 6, PK.ay1 - 9, KEY_HW, C.TEXT, ka);
      const er = 0.85 * unitPx(W, H);
      for (const k of CONN) {
        if (!L.pairs[k]) continue;
        pairState(st, k, PS);
        if (!(PS.line > 0) || !(PS.grow > 0)) continue;
        pairGeom(L, k, F, W, H, PG);
        const col = C.TEXT, a = PS.line * (PALE + (1 - PALE) * PS.lit);
        const x1 = PG.P[0] + (PG.Q[0] - PG.P[0]) * PS.grow, y1 = PG.P[1] + (PG.Q[1] - PG.P[1]) * PS.grow;
        inked(PG.P[0], PG.P[1], x1, y1, 1.5, col, a);
        seg(PG.P[0], PG.P[1], PG.P[0], PG.P[1], er + 1.4, C.GROUND, 0.85 * a); ring(PG.P[0], PG.P[1], er, KEY_HW, col, a);
        if (PS.grow >= 1) { seg(PG.Q[0], PG.Q[1], PG.Q[0], PG.Q[1], er + 1.4, C.GROUND, 0.85 * a); ring(PG.Q[0], PG.Q[1], er, KEY_HW, col, a); }
      }
    }
    const ga = glyphAlpha(st), g = L.glyph;
    if (ga > 0 && g) {
      glyphGeom(L, W, H, GG);
      for (let x = GG.x0; x < GG.x1; x += 14) seg(x, GG.yMean, Math.min(x + 8, GG.x1), GG.yMean, KEY_HW, C.SOFT, ga, 0);
      for (let k = 1; k < g.delta.length; k++) {
        const d0 = g.delta[k - 1], d1 = g.delta[k];
        if (!Number.isFinite(d0) || !Number.isFinite(d1)) continue;
        seg(GG.xOf(k - 1), GG.yOf(1 + d0), GG.xOf(k), GG.yOf(1 + d1), KEY_HW, d0 + d1 < 0 ? C.ACCENT : C.TEXT, ga);
      }
    }
    if (!(st.lpanel > 0) || !D) return;
    lyaGeom(D, W, H, G);
    const A = st.lpanel, tl = 0.012 * H;
    seg(G.x0, G.A.bot, G.x1, G.A.bot, KEY_HW, C.AXIS, A, 0);
    seg(G.x0, G.axis, G.x1, G.axis, KEY_HW, C.AXIS, A, 0);
    for (const t of LP.ticks) {
      seg(lyaX(G, t), G.A.bot, lyaX(G, t), G.A.bot + tl, KEY_HW, C.AXIS, A, 0);
      seg(lyaX(G, t), G.axis, lyaX(G, t), G.axis + tl, KEY_HW, C.AXIS, A, 0);
    }
    const gu = guideA(st);
    if (gu > 0) {
      const u = unitPx(W, H), x = lyaX(G, LP.guide), dl = 0.9 * u, gp = 0.7 * u, hw = Math.max(KEY_HW, 0.15 * u);
      for (const [y0, y1] of LW ? [[G.A.top, G.A.bot]] : [[G.A.top, G.A.bot], [G.X.top, G.axis]]) for (let y = y0; y < y1; y += dl + gp) seg(x, y, x, Math.min(y1, y + dl), hw, C.SOFT, gu, 0);
    }
    row('A', D.auto, st.lA || 0, A, W, H);
    row('X', D.cross, st.lX || 0, A, W, H);
  }
  return { build, geom: G };
}
