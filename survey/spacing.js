
export const LYA_A = 1215.67;
export const DIP_HALF = 4, PROM_HALF = 8, PROM_FRAC = 0.25;
export const STRETCH = 150;
export const RANGE_STEP = 5;

export const RULE = { minWin: DIP_HALF, prom: 'window', ph: PROM_HALF, frac: PROM_FRAC, minSep: 0 };
export const READINGS = {
  'the rule (±4 minima, ±8 prominence window, 0.25)': RULE,
  'threshold 0.20': { ...RULE, frac: 0.2 },
  'threshold 0.30': { ...RULE, frac: 0.3 },
  'standard (topographic) prominence, no ±8 window': { ...RULE, minWin: 1, prom: 'topo' },
  'topographic prominence, ±4 minima': { ...RULE, prom: 'topo' },
  'topographic prominence, dips ≥ 9 pixels apart': { ...RULE, minWin: 1, prom: 'topo', minSep: 9 },
  'the rule, dips ≥ 9 pixels apart': { ...RULE, minSep: 9 },
  'prominence window ±4 (two-sided)': { ...RULE, ph: 4 },
  'prominence window ±8, one side enough': { ...RULE, prom: 'one' },
};

export function findDips(sm, med, o = RULE) {
  const n = sm.length, out = [];
  for (let j = 0; j < n; j++) {
    if (o.minWin > 1) {
      if (j < o.minWin || j >= n - o.minWin) continue;
      let lowest = true;
      for (let q = -o.minWin; q <= o.minWin && lowest; q++) if (q && sm[j + q] < sm[j]) lowest = false;
      if (!lowest) continue;
    } else if (j === 0 || j === n - 1 || !(sm[j] < sm[j - 1] && sm[j] <= sm[j + 1])) continue;
    let p;
    if (o.prom === 'topo') {
      let lm = sm[j], rm = sm[j], k = j - 1;
      while (k >= 0 && sm[k] >= sm[j]) { lm = Math.max(lm, sm[k]); k--; }
      for (k = j + 1; k < n && sm[k] >= sm[j]; k++) rm = Math.max(rm, sm[k]);
      p = Math.min(lm, rm) - sm[j];
    } else {
      let lm = -Infinity, rm = -Infinity;
      for (let q = 1; q <= o.ph; q++) { lm = Math.max(lm, sm[Math.max(0, j - q)]); rm = Math.max(rm, sm[Math.min(n - 1, j + q)]); }
      p = (o.prom === 'one' ? Math.max(lm, rm) : Math.min(lm, rm)) - sm[j];
    }
    if (p >= o.frac * med) out.push(j);
  }
  if (!(o.minSep > 0)) return out;
  const order = out.slice().sort((a, b) => sm[a] - sm[b] || a - b), kept = [];
  for (const j of order) if (kept.every(k => Math.abs(k - j) >= o.minSep)) kept.push(j);
  return out.filter(j => kept.includes(j));
}

export function percentile(values, q) {
  const s = Float64Array.from(values).sort(), x = q * (s.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * f : s[i];
}
export function spacingStats(r, dips) {
  const sp = [];
  for (let k = 1; k < dips.length; k++) sp.push(r[dips[k]] - r[dips[k - 1]]);
  return { nDips: dips.length, spacings: Float64Array.from(sp), q1: percentile(sp, 0.25), median: percentile(sp, 0.5), q3: percentile(sp, 0.75) };
}
const roundTo = (v, step) => Math.round(v / step) * step;

export function forestPixels(spec, hero, dc) {
  const W = spec.wave, F = spec.flux, IV = spec.ivar || [], M = spec.mask || [];
  const r = [], f = [], w = [];
  for (let i = 0; i < W.length; i++) {
    if (!(IV[i] > 0) || (M[i] | 0) !== 0 || !Number.isFinite(F[i])) continue;
    const ri = dc(W[i] / LYA_A - 1);
    if (ri < hero.dStart - 0.5 || ri > hero.dEnd + 0.5) continue;
    r.push(ri); f.push(F[i]); w.push(W[i]);
  }
  const n = r.length;
  const sm = f.map((v, j) => (f[Math.max(0, j - 1)] + v + f[Math.min(n - 1, j + 1)]) / 3);
  const med = n ? Float64Array.from(f).sort()[n >> 1] : NaN;
  return { r, f, w, sm, med };
}

export function prepareSpacing(spec, hero, dc) {
  if (!spec || !Array.isArray(spec.wave) || !hero) return null;
  const P = forestPixels(spec, hero, dc), { r, f, w, sm, med } = P, n = r.length;
  if (n < 4 * PROM_HALF) return null;
  const dips = findDips(sm, med, RULE);
  if (dips.length < 5) return null;
  const st = spacingStats(r, dips);
  const range = [roundTo(st.q1, RANGE_STEP), roundTo(st.q3, RANGE_STEP)];
  const robustness = Object.entries(READINGS).map(([name, o]) => {
    const s = spacingStats(r, findDips(sm, med, o));
    return { reading: name, nDips: s.nDips, q1: s.q1, median: s.median, q3: s.q3 };
  });
  const mid = (hero.dStart + hero.dEnd) / 2;
  let s0 = Math.max(hero.dStart, mid - STRETCH / 2), s1 = Math.min(hero.dEnd, s0 + STRETCH);
  s0 = Math.max(hero.dStart, s1 - STRETCH);
  const tr = [], tf = [];
  for (let j = 0; j < n; j++) if (r[j] >= s0 && r[j] <= s1) { tr.push(r[j]); tf.push(f[j]); }
  const top = Float64Array.from(tf).sort()[Math.floor(0.95 * (tf.length - 1))] || 1;
  return {
    stretch: [s0, s1], trace: { r: Float64Array.from(tr), f: Float64Array.from(tf, v => v / top) },
    dips: Float64Array.from(dips.map(j => r[j]).filter(x => x >= s0 && x <= s1)),
    allDips: Float64Array.from(dips.map(j => r[j])), dipLambda: Float64Array.from(dips.map(j => w[j])),
    nDips: st.nDips, spacings: st.spacings, q1: st.q1, median: st.median, q3: st.q3, range, robustness,
    forestLambda: [w[0], w[n - 1]], nPixels: n, medianFlux: med,
  };
}

export const spacingWords = sp => `dips ≈ ${sp.range[0]}–${sp.range[1]} h⁻¹ Mpc apart`;
