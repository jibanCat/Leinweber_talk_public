
export const NPIX = 1389, NROW = 480, DV = 10.00008419146144;
export const L = NPIX * DV;
export const HOT_SIGMA = 13;
export const HIDDEN_SIGMA = 4, HIDDEN_GAMMA = 1.25;
export const UV_GAMMA = 1.5;
export const MASK_RUN = 80;
export const WINDOW = { centre: 480, width: 120 };
const EDGES = Array.from({ length: 21 }, (_, i) => 0.0025 * Math.pow(0.08 / 0.0025, i / 20));
export const KC = EDGES.slice(1).map((e, i) => Math.sqrt(e * EDGES[i]));

const tauOf = F => -Math.log(Math.max(F, 1 / 65535));

export function smoothRow(tau, sigma, out = new Float64Array(NPIX)) {
  if (sigma <= 0) { out.set(tau); return out; }
  const s = sigma / DV, r = Math.ceil(4 * s), w = [];
  let norm = 0;
  for (let j = -r; j <= r; j++) { const v = Math.exp(-0.5 * (j / s) ** 2); w.push(v); norm += v; }
  for (let i = 0; i < NPIX; i++) {
    let acc = 0;
    for (let j = -r; j <= r; j++) acc += w[j + r] * tau[(i + j + NPIX) % NPIX];
    out[i] = acc / norm;
  }
  return out;
}

function longestRun(F) {
  let best = 0, cur = 0;
  for (let i = 0; i < 2 * NPIX; i++) { cur = F[i % NPIX] < 0.02 ? cur + 1 : 0; best = Math.max(best, cur); }
  return Math.min(best, NPIX);
}

function modes() {
  const nMax = Math.ceil(EDGES[EDGES.length - 1] * L / (2 * Math.PI));
  const cos = new Float64Array(nMax * NPIX), sin = new Float64Array(nMax * NPIX);
  for (let n = 1; n <= nMax; n++) for (let i = 0; i < NPIX; i++) {
    const a = 2 * Math.PI * n * i / NPIX;
    cos[(n - 1) * NPIX + i] = Math.cos(a); sin[(n - 1) * NPIX + i] = Math.sin(a);
  }
  const bin = new Int32Array(nMax + 1).fill(-1);
  for (let n = 1; n <= nMax; n++) {
    const k = 2 * Math.PI * n / L;
    for (let b = 0; b < KC.length; b++) if (k >= EDGES[b] && k < EDGES[b + 1]) bin[n] = b;
  }
  return { nMax, cos, sin, bin };
}

function rowPower(Frows, meanF, M) {
  const out = [];
  for (const F of Frows) {
    const sum = new Float64Array(KC.length), cnt = new Float64Array(KC.length);
    for (let n = 1; n <= M.nMax; n++) {
      const b = M.bin[n];
      if (b < 0) continue;
      let re = 0, im = 0;
      const o = (n - 1) * NPIX;
      for (let i = 0; i < NPIX; i++) { const d = F[i] / meanF - 1; re += d * M.cos[o + i]; im -= d * M.sin[o + i]; }
      sum[b] += (re * re + im * im) * DV / NPIX; cnt[b]++;
    }
    out.push(Array.from(sum, (v, b) => v / cnt[b]));
  }
  return out;
}

const meanOf = rows => rows.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0) / (rows.length * NPIX);
const avg = P => KC.map((_, b) => P.reduce((a, r) => a + r[b], 0) / P.length);
const kp = P => P.map((v, b) => KC[b] * v / Math.PI);

function renormalise(taus, target) {
  let lo = -2, hi = 2;
  const mean = A => meanOf(taus.map(t => Array.from(t, x => Math.exp(-A * x))));
  for (let it = 0; it < 30; it++) {
    const mid = 0.5 * (lo + hi);
    if (mean(Math.exp(mid)) > target) lo = mid; else hi = mid;
  }
  return Math.exp(0.5 * (lo + hi));
}

export function buildTexture(F, hero) {
  const rows = [], keep = [];
  for (let r = 0; r < NROW; r++) {
    const row = F.subarray(r * NPIX, (r + 1) * NPIX);
    rows.push(row);
    if (longestRun(row) <= MASK_RUN) keep.push(r);
  }
  const tau = keep.map(r => Float64Array.from(rows[r], tauOf));
  const base = tau.map(t => Array.from(t, x => Math.exp(-x)));
  const meanF = meanOf(base);
  const hotTau = tau.map(t => smoothRow(t, HOT_SIGMA));
  const hotA = renormalise(hotTau, meanF);
  const hot = hotTau.map(t => Array.from(t, x => Math.exp(-hotA * x)));
  const uv = tau.map(t => Array.from(t, x => Math.exp(-x / UV_GAMMA)));
  const M = modes();
  const Pb = rowPower(base, meanF, M), Ph = rowPower(hot, meanF, M), Pu = rowPower(uv, meanOf(uv), M);
  const hidTau = tau.map(t => smoothRow(t, HIDDEN_SIGMA));
  const hidA = renormalise(hidTau, meanF);
  const hidF = hidTau.map(t => Array.from(t, x => Math.exp(-hidA * x / HIDDEN_GAMMA)));
  const Pm = rowPower(hidF, meanOf(hidF), M);
  const blocks = [];
  for (let b = 0; b < 30; b++) {
    const idx = keep.map((r, i) => (Math.floor(r / 16) === b ? i : -1)).filter(i => i >= 0);
    if (idx.length) blocks.push(avg(idx.map(i => Pm[i])));
  }
  const mb = avg(Pm);
  const sigma = KC.map((_, b) => {
    const m = blocks.reduce((a, B) => a + B[b], 0) / blocks.length;
    const v = blocks.reduce((a, B) => a + (B[b] - m) ** 2, 0) / (blocks.length - 1);
    return Math.sqrt(v / blocks.length) / mb[b];
  }).map((v, b, a) => (a[Math.max(0, b - 1)] + 2 * v + a[Math.min(a.length - 1, b + 1)]) / 4);
  const heroTau = Float64Array.from(rows[hero], tauOf);
  return {
    k: KC, kept: keep.length,
    curves: { base: kp(avg(Pb)), hot: kp(avg(Ph)), uv: kp(avg(Pu)) },
    mock: kp(mb),
    sigma,
    meanF,
    hotA,
    heroTau,
  };
}

export function heroFlux(T, h, u, out = new Float64Array(NPIX)) {
  const t = smoothRow(T.heroTau, h * HOT_SIGMA);
  const A = Math.pow(T.hotA, h) / (1 + (UV_GAMMA - 1) * u);
  for (let i = 0; i < NPIX; i++) out[i] = Math.exp(-A * t[i]);
  return out;
}
