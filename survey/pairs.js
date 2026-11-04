
import { hash32 } from './hash.js';

export const PATCH_SIZE = 360;
export const NB = 16, S_MIN = 5, BIN_W = 10;
export const S_MAX = S_MIN + NB * BIN_W;
export const RANDOM_SEED = 20261015;
export const RANDOM_FACTOR = 20;
export const RR_PAIRS = 8000000;
export const STICKS_PER_BIN = 8;
export const ANCHORS = 48;
export const SWEEP = 0.8;
export const FLIGHT = 0.2;
export const SPLIT_S = 110, SPLIT_TOL = 5;
const LRG = 1;

export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function countPairs(x, y, n, isAnchor, seed) {
  const counts = new Float64Array(NB);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => y[a] - y[b] || a - b);
  const ys = new Float64Array(n), xs = new Float64Array(n), id = new Uint32Array(n);
  order.forEach((o, k) => { xs[k] = x[o]; ys[k] = y[o]; id[k] = o; });
  const s2min = S_MIN * S_MIN, s2max = S_MAX * S_MAX;
  const best = Array.from({ length: NB }, () => []);
  for (let a = 0; a < n; a++) {
    const xa = xs[a], ya = ys[a], ia = id[a], aIsAnchor = isAnchor[ia] === 1;
    for (let b = a + 1; b < n; b++) {
      const dy = ys[b] - ya;
      if (dy >= S_MAX) break;
      const dx = xs[b] - xa, d2 = dx * dx + dy * dy;
      if (d2 < s2min || d2 >= s2max) continue;
      const s = Math.sqrt(d2), bin = Math.min(NB - 1, Math.floor((s - S_MIN) / BIN_W));
      counts[bin]++;
      const ib = id[b];
      if (aIsAnchor || isAnchor[ib] === 1) {
        const lo = Math.min(ia, ib), hi = Math.max(ia, ib);
        const h = hash32(hash32(lo, seed) ^ hi, seed + 1);
        const B = best[bin];
        if (B.length < STICKS_PER_BIN || h < B[B.length - 1].h) {
          B.push({ h, i: lo, j: hi, s });
          B.sort((p, q) => p.h - q.h || p.i - q.i || p.j - q.j);
          if (B.length > STICKS_PER_BIN) B.pop();
        }
      }
    }
  }
  return { counts, best };
}

export function randomPairCounts(x, y, n, M, seed) {
  const counts = new Float64Array(NB), pick = mulberry32(seed), s2min = S_MIN * S_MIN, s2max = S_MAX * S_MAX;
  for (let m = 0; m < M; m++) {
    const i = Math.floor(pick() * n);
    let j = Math.floor(pick() * (n - 1));
    if (j >= i) j++;
    const ex = x[i] - x[j], ey = y[i] - y[j], d2 = ex * ex + ey * ey;
    if (d2 < s2min || d2 >= s2max) continue;
    counts[Math.min(NB - 1, Math.floor((Math.sqrt(d2) - S_MIN) / BIN_W))]++;
  }
  return counts;
}

function chooseAnchors(n, seed) {
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => hash32(a, seed) - hash32(b, seed) || a - b);
  const flag = new Uint8Array(n);
  for (const i of idx.slice(0, Math.min(ANCHORS, n))) flag[i] = 1;
  return flag;
}

function sticksFrom(best, x, y) {
  const out = [];
  best.forEach((B, bin) => {
    const sorted = B.slice().sort((p, q) => p.s - q.s || p.h - q.h);
    sorted.forEach((p, rank) => {
      const u = SWEEP * (p.s - S_MIN) / (S_MAX - S_MIN);
      out.push(x[p.i], y[p.i], x[p.j], y[p.j], p.s, bin, u, (rank + 1) / sorted.length);
    });
  });
  return Float32Array.from(out);
}

export function preparePairs(fan, geo) {
  const { n, x, y, chan } = fan;
  const rl = [];
  for (let i = 0; i < n; i++) if (chan[i] === LRG) rl.push(Math.hypot(x[i], y[i]));
  if (rl.length < 100) return null;
  const rs = Float64Array.from(rl).sort();
  const rc = rs[rs.length >> 1], tc = geo.thetaMid;
  const r0 = rc - PATCH_SIZE / 2, r1 = rc + PATCH_SIZE / 2, half = PATCH_SIZE / (2 * rc);
  const ta = tc - half, tb = tc + half;
  const inPatch = (px, py) => { const r = Math.hypot(px, py), t = Math.atan2(px, py); return r >= r0 && r < r1 && t >= ta && t < tb; };

  const di = [];
  for (let i = 0; i < n; i++) if (chan[i] === LRG && inPatch(x[i], y[i])) di.push(i);
  const N = di.length;
  const dx = new Float32Array(N), dy = new Float32Array(N), dr = new Float64Array(N);
  di.forEach((i, k) => { dx[k] = x[i]; dy[k] = y[i]; dr[k] = Math.hypot(x[i], y[i]); });

  const NR = RANDOM_FACTOR * N, rnd = mulberry32(RANDOM_SEED), rx = new Float32Array(NR), ry = new Float32Array(NR);
  for (let k = 0; k < NR; k++) {
    const t = ta + (tb - ta) * rnd(), r = dr[Math.min(N - 1, Math.floor(rnd() * N))];
    rx[k] = r * Math.sin(t); ry[k] = r * Math.cos(t);
  }

  const D = countPairs(dx, dy, N, chooseAnchors(N, 0xd47a), 0xd47a);
  const R = countPairs(rx, ry, N, chooseAnchors(N, 0x7a4d), 0x7a4d);
  const RRc = randomPairCounts(rx, ry, NR, RR_PAIRS, RANDOM_SEED ^ 0x5eed);
  const nPairs = N * (N - 1) / 2;
  const fD = Float64Array.from(D.counts, c => c / nPairs), fR = Float64Array.from(RRc, c => c / RR_PAIRS);
  const xi = new Float64Array(NB);
  for (let b = 0; b < NB; b++) xi[b] = fR[b] > 0 ? fD[b] / fR[b] - 1 : 0;
  let fmax = 0;
  for (let b = 0; b < NB; b++) fmax = Math.max(fmax, fD[b], fR[b]);

  const cx = (rc) * Math.sin(tc), cy = (rc) * Math.cos(tc);
  let g = 0;
  for (let k = 1; k < N; k++) if (Math.hypot(dx[k] - cx, dy[k] - cy) < Math.hypot(dx[g] - cx, dy[g] - cy)) g = k;

  let split = -1, bestScore = Infinity;
  for (let k = 0; k < N; k++) {
    if (k === g) continue;
    const ex = dx[k] - dx[g], ey = dy[k] - dy[g], s = Math.hypot(ex, ey);
    if (Math.abs(s - SPLIT_S) > SPLIT_TOL) continue;
    const mx = (dx[k] + dx[g]) / 2, my = (dy[k] + dy[g]) / 2, ml = Math.hypot(mx, my);
    const par = Math.abs((ex * mx + ey * my) / ml) / s, ang = Math.acos(Math.min(1, par));
    const score = Math.abs(ang - Math.PI / 4);
    if (score < bestScore) { bestScore = score; split = k; }
  }

  return {
    patch: { tc, rc, r0, r1, ta, tb, half, size: PATCH_SIZE },
    n: N, dx, dy, rx, ry, nR: NR, nPairsR: RR_PAIRS,
    bins: { nb: NB, sMin: S_MIN, w: BIN_W, sMax: S_MAX },
    DD: Float64Array.from(D.counts), RR: RRc, nPairs, fD, fR, xi, fmax,
    sticksD: sticksFrom(D.best, dx, dy), sticksR: sticksFrom(R.best, rx, ry),
    g, split,
  };
}
