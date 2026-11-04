
export const DV = 10.00008419146144;
export const ROW = 341;
export const CENTER = 7520;
export const HALF = 4000;
export const LOGN = [19.5, 22.0];
export const SPREAD = 3600;
export const PLOT_WIDTH = 0.84;
export const PLOT_H = 0.30;
export const RECORD_HALFW = 1.25;
export const recordWindow = () => [Math.ceil((CENTER - HALF) / DV), Math.floor((CENTER + HALF) / DV)];

export const B = 20.0;
export const A = 6.265e8 * 1215.67e-8 / (4 * Math.PI * B * 1e5);
export const TAU0 = 7.58e-13 / B;
export function voigtH(x) {
  x = Math.abs(x);
  const h0 = Math.exp(-x * x);
  if (x < 1.5) return h0;
  const q = 1.5 / (x * x);
  return h0 - A / Math.sqrt(Math.PI) / (x * x) * (h0 * h0 * (4 * x ** 4 + 7 * x * x + 4 + q) - q - 1);
}
export const transmission = (dv, logN) => Math.exp(-TAU0 * 10 ** logN * voigtH(dv / B));

function r2(i) {
  const g = 1.32471795724474602596;
  return [(0.5 + i / g) % 1, (0.5 + i / (g * g)) % 1];
}

export function buildGhosts(f5, n, keep) {
  const NX = 1389;
  const F = f5.subarray(ROW * NX, ROW * NX + NX);
  const [lo, hi] = recordWindow();
  const FBAR = 0.67;
  const v0 = new Float64Array(n), lN = new Float64Array(n), ll = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const [u, w] = r2(i + 1);
    v0[i] = CENTER - SPREAD + 2 * SPREAD * u;
    lN[i] = LOGN[0] + (LOGN[1] - LOGN[0]) * w;
    let s = 0;
    for (let p = lo; p <= hi; p++) {
      const t = transmission(p * DV - v0[i], lN[i]);
      const sg = 0.3 * t + 0.05, r = (F[p] - t * FBAR) / sg;
      s += -0.5 * r * r - Math.log(sg);
    }
    ll[i] = s;
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => ll[a] - ll[b] || a - b);
  const rank = new Int32Array(n);
  order.forEach((i, r) => { rank[i] = r; });
  const survivors = order.slice(n - keep), top = ll[order[n - 1]];
  let W = 0, mv = 0, ml = 0;
  for (const i of survivors) { const w = Math.exp(ll[i] - top); W += w; mv += w * v0[i]; ml += w * lN[i]; }
  const answer = { v0: mv / W, logN: ml / W };
  const params = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) params.set([v0[i] - CENTER, lN[i], rank[i], 0], 4 * i);
  return { params, answer, n, keep, record: F, window: [lo, hi] };
}
