import { CONSTANTS } from './constants.js';
import { plain } from './plain.js';

export const SPECTRA_BASE = new URL('../volume-spike/data/v3/', import.meta.url);
export const SPECTRUM_NAMES = ['spectrum', 'find'];
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const need = (c, m) => { if (!c) throw new Error(m); };

export function filesFor(name, index) {
  if (name === 'spectrum') {
    const id = index && index.section8_shown_str;
    return id ? { spec: `spectra/${id}.json`, skewers: 'skewers.json', fan: 'fan.json', gp: `gp/${id}.json`, sim: 'charts/sim_lyman.json', sdss: 'charts/sdss_same.json' } : null;
  }
  if (name === 'find') {
    const ids = index && index.section10_dla_examples_str;
    return Array.isArray(ids) && ids.length ? Object.fromEntries(ids.flatMap((id, i) => [[`spec${i}`, `spectra/${id}.json`], [`gp${i}`, `gp/${id}.json`]])) : null;
  }
  return null;
}

export async function loadSpectra(names = SPECTRUM_NAMES, { fetchFn = globalThis.fetch } = {}) {
  const charts = {}, report = [];
  const get = async rel => {
    const r = await fetchFn(new URL(rel, SPECTRA_BASE));
    if (!r.ok) throw new Error(`${rel}: not found (${r.status})`);
    return r.json();
  };
  let index = null;
  try { index = await get('spectra/index.json'); } catch (e) {
    for (const name of names) report.push({ name, from: null, url: null, errors: [`${name}: ${e.message}`], warnings: [] });
    return { charts, report };
  }
  for (const name of names) {
    const files = filesFor(name, index), warnings = [];
    if (!files) { report.push({ name, from: null, url: null, errors: [`${name}: spectra/index.json names no spectrum for it`], warnings }); continue; }
    try {
      const docs = {};
      for (const [k, rel] of Object.entries(files)) docs[k] = await (k === 'fan' || k === 'gp' || k === 'sim' || k === 'sdss' ? get(rel).catch(() => null) : get(rel));
      charts[name] = name === 'spectrum' ? adaptSpectrum(index, docs, warnings) : adaptFind(index, docs, warnings);
      report.push({ name, from: 'real', url: String(new URL(files.spec || files.spec0, SPECTRA_BASE)), errors: [], warnings });
    } catch (e) {
      report.push({ name, from: null, url: null, errors: [`${name}: ${e.message}`], warnings });
    }
  }
  return { charts, report };
}

function pixels(spec) {
  need(Array.isArray(spec.wave) && Array.isArray(spec.flux) && spec.wave.length === spec.flux.length, 'spectrum: wave and flux missing or unequal');
  const n = spec.wave.length, iv = spec.ivar || [], mk = spec.mask || [];
  const wave = new Float64Array(n), flux = new Float64Array(n), good = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    wave[i] = spec.wave[i] / 10;
    flux[i] = spec.flux[i];
    good[i] = isNum(spec.flux[i]) && !(iv[i] <= 0) && !mk[i] ? 1 : 0;
  }
  return { wave, flux, good };
}
export function fluxRange(P, lo, hi, headroom = 0.08) {
  const v = [];
  for (let i = 0; i < P.wave.length; i++) if (P.good[i] && P.wave[i] >= lo && P.wave[i] <= hi) v.push(P.flux[i]);
  need(v.length > 9, 'spectrum: too few pixels in range');
  const sorted = [...v].sort((a, b) => a - b), q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  let top = -Infinity;
  for (let i = 4; i < v.length - 4; i++) { const w = v.slice(i - 4, i + 5).sort((a, b) => a - b)[4]; if (w > top) top = w; }
  const bottom = Math.min(0, q(0.002));
  return [bottom - 0.04 * (top - bottom), top + headroom * (top - bottom)];
}
function chiOf(cos) {
  const om = cos.Omega_m, or = isNum(cos.Omega_r) ? cos.Omega_r : 0, ol = 1 - om - or, ch = CONSTANTS.c.km_s / 100;
  const inv = x => 1 / Math.sqrt(om * (1 + x) ** 3 + or * (1 + x) ** 4 + ol);
  const chi = x => { const n = 2000, h = x / n; let s = inv(0) + inv(x); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * inv(i * h); return (ch * s * h) / 3; };
  const zAt = d => { let lo = 0, hi = 20; for (let k = 0; k < 64; k++) { const m = (lo + hi) / 2; if (chi(m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
  return { chi, zAt };
}
export const FINE_MPC = 90, FINE_TABLE = 240;
export const PATH_BREAK_Z = 1.8;
const firstSentence = t => String(t || '').split(/(?<=\.)\s/)[0].replace(/\.$/, '');
const lit = t => String(t).replace(/_/g, '\\_');

export function adaptSpectrum(index, docs, warnings = []) {
  const id = index.section8_shown_str, spec = docs.spec, W = docs.skewers && docs.skewers.window;
  need(spec && W, 'spectrum: the spectrum file or skewers.json window is missing');
  for (const k of ['rest_min_A', 'rest_max_A', 'obs_min_A', 'obs_max_A', 'lya_rest_A']) need(isNum(W[k]), `spectrum: skewers.json window.${k} missing`);
  const zq = spec.checks && spec.checks.zlya && isNum(spec.checks.zlya.Z) ? spec.checks.zlya.Z : spec.z;
  need(isNum(zq), 'spectrum: no redshift');
  if (!(spec.checks && spec.checks.zlya)) warnings.push('spectrum: no zlya redshift; the Redrock z is used');
  const P = pixels(spec);
  const link = index.fan_links && Array.isArray(index.fan_links[id]) ? index.fan_links[id][0] : null;
  const cos = docs.fan && docs.fan.cosmology;
  let f0, f1, quasarFrac;
  const zFan = link && isNum(link.z) ? link.z : zq;
  if (link && link.skewer && isNum(link.skewer.d_start) && isNum(link.skewer.d_end) && cos && isNum(cos.Omega_m)) {
    const C = chiOf(cos), d0 = link.skewer.d_start, d1 = link.skewer.d_end;
    f0 = (W.lya_rest_A * (1 + C.zAt(d0))) / 10; f1 = (W.lya_rest_A * (1 + C.zAt(d1))) / 10;
    quasarFrac = (C.chi(zFan) - d0) / (d1 - d0);
  } else {
    warnings.push('spectrum: no fan link or fan.json cosmology; the nominal forest window is used (the match cut is approximate)');
    f0 = Math.max(W.rest_min_A * (1 + zq), W.obs_min_A) / 10; f1 = Math.min(W.rest_max_A * (1 + zq), W.obs_max_A) / 10;
    quasarFrac = ((W.lya_rest_A * (1 + zq)) / 10 - f0) / (f1 - f0);
  }
  const lyaObs = (W.lya_rest_A * (1 + zq)) / 10;
  const full = [P.wave[0], P.wave[P.wave.length - 1]];
  let model = null;
  const Cg = docs.gp && docs.gp.continuum;
  if (Cg && Array.isArray(Cg.mu) && Array.isArray(Cg.index) && Cg.mu.length === Cg.index.length) {
    model = new Float64Array(P.wave.length).fill(NaN);
    Cg.index.forEach((j, i) => { if (Number.isInteger(j) && j >= 0 && j < model.length && isNum(Cg.mu[i])) model[j] = Cg.mu[i]; });
    if (isNum(docs.gp.z_qso) && Math.abs(docs.gp.z_qso - zq) > 1e-6) warnings.push(`spectrum: the GP run's z_qso (${docs.gp.z_qso}) is not the spectrum's (${zq})`);
  } else warnings.push(`spectrum: no GP prior mean (gp/${id}.json continuum.mu, index): step 3 draws no light before absorption`);
  const fv = []; for (let i = 0; i < P.wave.length; i++) if (P.good[i] && P.wave[i] >= f0 && P.wave[i] <= f1) fv.push(P.flux[i]);
  fv.sort((a, b) => a - b);
  const stripNorm = fv[Math.floor(0.95 * (fv.length - 1))];
  const absorption = readAbsorption(P, model, f0, f1, stripNorm);
  const sim = simOf(P, model, docs.sim, zq, warnings);
  const sdss = sdssOf(docs.sdss, warnings);
  let path = null;
  if (cos && isNum(cos.Omega_m)) {
    const C = chiOf(cos), lya = W.lya_rest_A / 10, n = P.wave.length;
    const NZ = 240, tz = [], tc = [];
    for (let k = 0; k <= NZ; k++) { const z = (zq * k) / NZ; tz.push(z); tc.push(C.chi(z)); }
    const zF = [f0 / lya - 1, f1 / lya - 1], chi0 = C.chi(zF[0]), chi1 = C.chi(zF[1]);
    const nc = Math.max(1, Math.round((chi1 - chi0) / GAS_CELL)), step = (chi1 - chi0) / nc, sum = new Float64Array(nc), cnt = new Uint16Array(nc);
    for (let i = 0; i < n; i++) {
      const Fi = sim ? sim.Fa[i] : absorption.F[i];
      if (!(P.wave[i] >= f0 && P.wave[i] <= f1) || !Number.isFinite(Fi)) continue;
      const j = Math.min(nc - 1, Math.max(0, Math.floor((C.chi(P.wave[i] / lya - 1) - chi0) / step)));
      sum[j] += Fi; cnt[j]++;
    }
    const tau = Array.from(sum, (s, j) => (cnt[j] ? -Math.log(Math.min(1, Math.max(TAU_FLOOR, s / cnt[j]))) : NaN));
    path = { chiQ: C.chi(zq), zForest: zF, zBreak: PATH_BREAK_Z, chiBreak: C.chi(PATH_BREAK_Z), table: { z: tz, chi: tc },
      gas: { chi0, step, tau, tauTop: -Math.log(TAU_FLOOR), cell: GAS_CELL } };
  }
  let fine = null;
  if (cos && isNum(cos.Omega_m)) {
    const om = cos.Omega_m, or = isNum(cos.Omega_r) ? cos.Omega_r : 0, ol = 1 - om - or, ch = CONSTANTS.c.km_s / 100;
    const dchi = z => ch / Math.sqrt(om * (1 + z) ** 3 + or * (1 + z) ** 4 + ol);
    const zc = ((f0 + f1) / 2 * 10) / W.lya_rest_A - 1, dz = 0.0005, nz = 400;
    const zs = [], xs = [];
    for (let i = -nz; i <= nz; i++) zs.push(zc + i * dz);
    let acc = 0; xs[nz] = 0;
    for (let i = nz; i < 2 * nz; i++) { acc += (dz / 6) * (dchi(zs[i]) + 4 * dchi(zs[i] + dz / 2) + dchi(zs[i + 1])); xs[i + 1] = acc; }
    acc = 0;
    for (let i = nz; i > 0; i--) { acc -= (dz / 6) * (dchi(zs[i]) + 4 * dchi(zs[i] - dz / 2) + dchi(zs[i - 1])); xs[i - 1] = acc; }
    const zOf = d => { let i = 0; while (i < xs.length - 2 && xs[i + 1] < d) i++; return zs[i] + ((d - xs[i]) / (xs[i + 1] - xs[i])) * dz; };
    const n = 240, d0 = -FINE_TABLE / 2;
    const lam = Array.from({ length: n + 1 }, (_, i) => (W.lya_rest_A * (1 + zOf(d0 + (i / n) * FINE_TABLE))) / 10);
    fine = { span: FINE_MPC, table: FINE_TABLE, n, lam, cosmology: cos.name || null };
  } else warnings.push('spectrum: no fan cosmology; the fine view (spectrum.6–8) stays at the forest zoom');
  const prov = spec.provenance || {}, src = spec.source || {};
  const C = CONSTANTS.lya;
  const LS = CONSTANTS.lyman, zq1 = 1 + zq, rOf = (f, l) => (f * l) / (LS.lines[0].f * LS.lines[0].lambda_nm);
  const lyman = {
    lines: LS.lines.map(L => ({ ...L, r: rOf(L.f, L.lambda_nm), obs: L.lambda_nm * zq1 })),
    higher: LS.higher_nm.slice(), limit: LS.limit.lambda_nm, limitObs: LS.limit.lambda_nm * zq1, limitEV: LS.limit.ionization_eV,
  };
  lyman.gates = [...lyman.lines.slice(1).map(L => ({ name: L.name, n: L.n, lambda_nm: L.lambda_nm, f: L.f, r: L.r })),
    ...LS.higher_nm.map((l, k) => ({ name: null, n: 7 + k, lambda_nm: l, f: LS.higher_f[k], r: rOf(LS.higher_f[k], l) }))];
  const lybObs = lyman.lines[1].obs;
  let nLyb = 0; for (let i = 0; i < P.wave.length; i++) if (P.good[i] && P.wave[i] < lybObs) nLyb++;
  lyman.lybForest = { lo: P.wave[0], hi: lybObs, pixels: nLyb };
  lyman.echo = echoOf(P, absorption, lyman, zq1, warnings);
  lyman.blue = blueOf(P, model, absorption, lyman, zq1);
  if (sim && sim.full) {
    const ix = lyman.gates.map(G => sim.gates.findIndex(q => q.n === G.n));
    lyman.echo = { names: lyman.gates.map(G => G.name), lambda: lyman.gates.map(G => G.lambda_nm), gate: lyman.gates.map((_, k) => k),
      tau: lyman.gates.map((_, k) => (ix[k] >= 0 ? sim.gates[ix[k]].tau : new Float64Array(P.wave.length).fill(NaN))) };
    if (lyman.blue) lyman.blue.tau = lyman.gates.map((_, k) => Float64Array.from(lyman.blue.lam, le => (ix[k] >= 0 ? interpNaN(sim.blue.lam, sim.blue.tau[ix[k]], le) : NaN)));
  } else if (sim) {
    lyman.lines = lyman.lines.slice(0, 2); lyman.gates = lyman.gates.slice(0, 1); lyman.higher = [];
    lyman.limit = sim.lo; lyman.window = true; lyman.blue = null;
    const tb = Float64Array.from(P.wave, (w, i) => (w < lybObs && Number.isFinite(sim.Fb[i]) ? -Math.log(Math.max(1e-4, sim.Fb[i])) : NaN));
    lyman.echo = { names: [lyman.gates[0].name], lambda: [lyman.gates[0].lambda_nm], gate: [0], tau: [tb] };
  }
  const foot = { lines: [], optional: [] };
  foot.lines.push(`data: ${String(prov.release || 'DESI DR1').split(' (')[0]}, public · one quasar`);
  foot.optional.push(`data: ${prov.release || 'DESI DR1'}; ${src.service ? `via ${src.service}` : ''}`.replace(/;\s*$/, ''));
  if (prov.note) foot.lines.push(firstSentence(prov.note));
  foot.lines.push(`Lyα forest: rest ${W.rest_min_A}–${W.rest_max_A} Å, the window of DESI DR1's Lyα BAO, as DESI used it`);
  foot.optional.push(`n = ${C.n_lower} → ${C.n_upper}, ${C.energy_eV} eV, ${C.lambda_nm} nm: ${C.source}`);
  if (model) {
    const run = docs.gp.run || {};
    foot.optional.push(lit(`light before absorption: the prior mean continuum of the GP DLA finder (${`${run.package || 'gp_dla_finder'} ${run.version || ''}`.trim()}), not fitted to this quasar`));
  }
  if (prov.cite) foot.optional.push(String(prov.cite).split(';')[0]);
  foot.optional.unshift(`spectrum: DESI DR1 TARGETID ${id}, z = ${zq.toFixed(3)}`);
  if (path) foot.optional.push(`the light's path (spectrum.3–4): comoving distance at ${cos.name || 'the fan\'s cosmology'}, to scale beyond z = ${PATH_BREAK_Z}, compressed nearer (the break); the hydrogen along it over the forest window: τ = −ln(F/C) in ${GAS_CELL} h⁻¹ Mpc cells (C: ${absorption.how}), darker where the spectrum dips (redshift space: the gas's own motions shift it a little)`);
  foot.optional.push(`Lyman series (NIST): Lyα ${lyman.lines[0].lambda_nm.toFixed(3)}, Lyβ ${lyman.lines[1].lambda_nm.toFixed(3)}${sim && !sim.full ? ` nm (step 3: these two only, from ${sim.lo} nm in the quasar's frame)` : `, Lyγ ${lyman.lines[2].lambda_nm.toFixed(3)} nm … limit ${lyman.limit.toFixed(3)} nm`}; for this quasar its own Lyβ at ${lybObs.toFixed(1)} nm (data: the Lyβ forest, ${nLyb} pixels from DESI's blue end at ${P.wave[0].toFixed(1)} nm), its own Lyman limit at ${lyman.limitObs.toFixed(1)} nm (bluer than DESI sees: not drawn in the data)`);
  if (sim) foot.optional.push(sim.note);
  if (sdss) foot.optional.push(sdss.note);
  if (lyman.blue) foot.optional.push(`step 3's close-up on the Lyman series: the light the quasar emits between the Lyman limit and ${lyman.blue.end.toFixed(2)} nm arrives bluer than DESI's ${P.wave[0].toFixed(1)} nm, so it is drawn schematically (flat at the prior mean's bluest median, ${lyman.blue.level.toPrecision(3)}); every gate's dips on the way are this spectrum's own gas, τ_n = (f_n λ_n / f_α λ_α) τ_α (NIST), drawn stronger on screen (said there)`);
  return {
    kind: prov.kind || 'data', id, z: zq, zText: zq.toFixed(2), title: `a DESI DR1 quasar at z = ${zq.toFixed(2)}`, targetTitle: `DESI DR1 · TARGETID ${id} · z = ${zq.toFixed(2)}`,
    ...P, full, forest: [f0, f1], lyaObs, quasarFrac, model, lybNm: CONSTANTS.lyb.lambda_nm, lyman, sim, sdss,
    yFull: fluxRange(P, full[0], full[1], 0.32), yForest: fluxRange(P, f0, f1, 0.36), stripNorm, fine, path,
    fluxUnit: fluxUnit(spec.units && spec.units.flux), constants: C, foot,
  };
}
function simOf(P, model, doc, zq, warnings) {
  const S = doc && Array.isArray(doc.series) ? doc.series.find(x => x.id === 'sim') : null;
  if (!S) { warnings.push('spectrum: no charts/sim_lyman.json: step 3 uses the data and the older series'); return null; }
  if (!model || !(Math.abs(S.z_q - zq) < 1e-4) || S.F_total.length !== S.i1 - S.i0) { warnings.push('spectrum: sim_lyman.json does not match this spectrum (z or pixels)'); return null; }
  const n = P.wave.length, flux = new Float64Array(n).fill(NaN), Fa = new Float64Array(n).fill(NaN), Fb = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (P.wave[i] / (1 + zq) < S.rest_lo_nm || !Number.isFinite(model[i])) continue;
    const j = i - S.i0, inF = j >= 0 && j < S.F_total.length;
    flux[i] = model[i] * (inF ? S.F_total[j] : 1); Fa[i] = inF ? S.F_alpha[j] : 1; Fb[i] = inF ? S.F_beta[j] : 1;
  }
  const on = doc.on_screen || {};
  const full = Array.isArray(S.gates) && S.gates.length > 0 && S.blue && Array.isArray(S.blue.lam_rest_nm);
  const gates = full ? S.gates.map(G => { const t = new Float64Array(n).fill(NaN); G.tau.forEach((v, j) => { if (v !== null && S.i0 + j < n) t[S.i0 + j] = v; }); return { n: G.n, tau: t }; }) : null;
  const blue = full ? { lam: Float64Array.from(S.blue.lam_rest_nm), tau: S.blue.tau.map(a => Float64Array.from(a, v => (v === null ? NaN : v))) } : null;
  return { lo: S.rest_lo_nm, flux, Fa, Fb, full, gates, blue, name: on.name || 'simulated', tag: on.tag || 'simulated', note: on.note || S.release,
    foot: { lines: [on.foot || on.tag || 'simulated'], optional: [on.note || S.release] } };
}
function interpNaN(xs, ys, x) {
  if (!(x >= xs[0] && x <= xs[xs.length - 1])) return NaN;
  let lo = 0, h = xs.length - 1; while (h - lo > 1) { const m = (lo + h) >> 1; if (xs[m] <= x) lo = m; else h = m; }
  const t = h > lo ? (x - xs[lo]) / (xs[h] - xs[lo]) : 0;
  return ys[lo] + (ys[h] - ys[lo]) * t;
}
function sdssOf(doc, warnings) {
  const S = doc && Array.isArray(doc.series) ? doc.series.find(x => x.id === 'boss') : null;
  if (!S || !Array.isArray(S.wave_nm) || S.wave_nm.length !== S.flux.length) { warnings.push('spectrum: no charts/sdss_same.json: no SDSS overlay'); return null; }
  const on = doc.on_screen || {};
  return { wave: Float64Array.from(S.wave_nm), flux: Float64Array.from(S.flux), scale: S.scale, boss: on.boss || 'SDSS-III BOSS', desi: on.desi || 'DESI',
    cite: on.cite || 'SDSS DR17', note: on.note || S.release };
}
export const GAS_CELL = 1, TAU_FLOOR = 0.05;
function readAbsorption(P, model, f0, f1, stripNorm) {
  const n = P.wave.length, ratio = new Float64Array(n).fill(NaN);
  let k = 1, how = `flat, the forest's bright end of flux (${stripNorm.toPrecision(3)}, as the strip)`;
  if (model) {
    const q = [];
    for (let i = 0; i < n; i++) if (P.good[i] && Number.isFinite(model[i]) && model[i] > 0 && P.wave[i] >= f0 && P.wave[i] <= f1) q.push(P.flux[i] / model[i]);
    q.sort((a, b) => a - b);
    if (q.length > 20) { k = q[Math.floor(0.95 * (q.length - 1))]; how = `the GP prior mean × ${k.toFixed(2)}, so that the forest's brightest 5% of flux / prior mean sit at 1`; }
  }
  const useModel = model && how.startsWith('the GP');
  for (let i = 0; i < n; i++) {
    const c = useModel ? k * model[i] : stripNorm;
    if (P.good[i] && Number.isFinite(c) && c > 0) ratio[i] = P.flux[i] / c;
  }
  const F = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(ratio[i])) continue;
    let s = 0, m = 0;
    for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < n && Number.isFinite(ratio[j])) { s += ratio[j]; m++; }
    F[i] = s / m;
  }
  return { F, k, how };
}
function echoOf(P, A, lyman, zq1, warnings) {
  const n = P.wave.length, lybObs = lyman.lines[1].obs;
  const hi = lyman.gates.filter(L => L.lambda_nm * zq1 > P.wave[0]);
  const tau = hi.map(L => {
    const t = new Float64Array(n).fill(NaN);
    for (let i = 0; i < n && P.wave[i] < lybObs; i++) {
      if (!(P.wave[i] < L.lambda_nm * zq1)) continue;
      t[i] = gasTau(P, A, lyman, zq1, P.wave[i] / zq1, L);
    }
    return t;
  });
  if (!hi.length) warnings.push('spectrum: no pixel bluer than the quasar\'s own Lyβ (no echo)');
  return { names: hi.map(L => L.name), lambda: hi.map(L => L.lambda_nm), gate: hi.map(L => lyman.gates.indexOf(L)), tau };
}
function gasTau(P, A, lyman, zq1, le, L) {
  const la = lyman.lines[0].lambda_nm, lybObs = lyman.lines[1].obs, l2 = (le * zq1 * la) / L.lambda_nm;
  if (!(l2 >= lybObs && l2 < la * zq1)) return NaN;
  const n = P.wave.length;
  let lo = 0, h = n - 1; while (h - lo > 1) { const m = (lo + h) >> 1; if (P.wave[m] < l2) lo = m; else h = m; }
  const j = Math.abs(P.wave[lo] - l2) <= Math.abs(P.wave[h] - l2) ? lo : h;
  return Number.isFinite(A.F[j]) ? L.r * -Math.log(Math.min(1, Math.max(TAU_FLOOR, A.F[j]))) : NaN;
}
export const BLUE_STEP = 0.02, BLUE_SPAN = 1;
function blueOf(P, model, A, lyman, zq1) {
  if (!model) return null;
  let i0 = 0; while (i0 < P.wave.length && !(P.good[i0] && Number.isFinite(model[i0]))) i0++;
  if (i0 >= P.wave.length) return null;
  const lb = P.wave[i0] / zq1, v = [];
  for (let i = i0; i < P.wave.length && P.wave[i] / zq1 <= lb + BLUE_SPAN; i++) if (Number.isFinite(model[i])) v.push(model[i]);
  v.sort((a, b) => a - b);
  const level = v[v.length >> 1], m = Math.max(0, Math.floor((lb - lyman.limit) / BLUE_STEP));
  const lam = Float64Array.from({ length: m }, (_, j) => lyman.limit + (j + 0.5) * ((lb - lyman.limit) / m));
  const tau = lyman.gates.map(L => Float64Array.from(lam, le => (le < L.lambda_nm ? gasTau(P, A, lyman, zq1, le, L) : NaN)));
  return { lam, level, end: lb, tau };
}
function fluxUnit(u) {
  const m = /^1e-(\d+)\s/.exec(String(u || ''));
  if (!m) return 'flux (as released)';
  const pow = `10^{−${m[1]}}`;
  return plain('spectrum.y', 'flux [' + pow + ' erg s^{−1} cm^{−2} Å^{−1}]');
}

export function adaptFind(index, docs, warnings = []) {
  const ids = index.section10_dla_examples_str;
  const examples = ids.map((id, i) => example(id, docs[`spec${i}`], docs[`gp${i}`], i, warnings)).filter(Boolean);
  need(examples.length, 'find: no example could be read');
  return { kind: 'computed', examples };
}
function example(id, spec, gp, i, warnings) {
  need(spec && gp, `find: spectrum or GP file for ${id} missing`);
  const C = gp.continuum || {};
  need(Array.isArray(C.wave) && Array.isArray(C.mu_meanflux), `find: ${id}: continuum.wave / mu_meanflux missing`);
  const dets = Array.isArray(gp.detections) ? gp.detections : [];
  const primary = dets.find(d => d.run === gp.primary_run) || dets.find(d => d.primary);
  need(primary, `find: ${id}: no primary run`);
  const exp = dets.find(d => d.experimental && d.ladder && d.ladder.selected_model === 'M2');
  const useExp = i > 0 && exp && Array.isArray(C.model_dla2) && C.model_dla2_at && C.model_dla2_at.run === exp.run;
  if (i > 0 && !useExp) warnings.push(`find: ${id}: no experimental two-absorber result; the one-absorber run is shown`);
  const run = useExp ? exp : primary;
  const pts = useExp ? run.best_m2_pair || run.best_grid_points : run.best_grid_points;
  need(Array.isArray(pts) && pts.length, `find: ${id}: no best grid points`);
  const absorbers = pts.filter(p => isNum(p.grid_z_abs) && isNum(p.grid_log_nhi)).map(p => ({ z: p.grid_z_abs, logN: p.grid_log_nhi }))
    .sort((a, b) => a.z - b.z);
  const model = useExp ? C.model_dla2 : C.model_dla;
  need(Array.isArray(model) && model.length === C.wave.length, `find: ${id}: the model curve is missing`);
  let pModel = null, dlnZ = null, models = null;
  if (useExp) {
    const L = run.ladder, k = L.labels.indexOf(L.selected_model);
    pModel = isNum(L.posterior[k]) ? L.posterior[k] : null;
    models = 'two';
  } else {
    pModel = isNum(run.p_absorber) ? run.p_absorber : null;
    dlnZ = isNum(run.log_bayes_factor_M1_M0) ? run.log_bayes_factor_M1_M0 : null;
    models = 'one';
  }
  const cmp = gp.comparison || {};
  const desi = (Array.isArray(cmp.dla_cnn_gp_dr1) ? cmp.dla_cnn_gp_dr1 : []).filter(r => r.passes_recommended_cuts && r.ABSORBER_TYPE === 'DLA'
    && isNum(r.Z_DLA) && isNum(r.NHI)).map(r => ({ z: r.Z_DLA, logN: r.NHI })).sort((a, b) => a.z - b.z);
  const P = pixels(spec);
  const gw = C.wave.map(w => w / 10), range = [Math.min(...gw), Math.max(...gw)];
  const run0 = gp.run || {}, prov = gp.provenance || {};
  const zq = isNum(gp.z_qso) ? gp.z_qso : spec.z;
  const foot = { lines: [], optional: [] };
  const runLabel = lit(prov.label || 'our run of the GP DLA finder');
  foot.lines.push(`${prov.kind || 'computed'}: ${runLabel.replace(/\s*\([^)]*\)/g, '')} · method: Garnett et al. 2017`, `${prov.kind || 'computed'}: ${runLabel.replace(/\s*\([^)]*\)/g, '')}`);
  if (/\(/.test(runLabel)) foot.optional.push(`${prov.kind || 'computed'}: ${runLabel}`);
  const zsrc = String(gp.z_qso_source || '');
  const zline = /lya catalogue|zlya/i.test(zsrc) ? 'quasar redshift from DESI\'s DR1 Lyα catalogue' : zsrc ? `quasar redshift: ${zsrc.split(/[,(]/)[0].trim()}` : null;
  if (!zline) warnings.push(`find: ${id}: gp file has no z_qso_source`);
  const preliminary = /preliminary/.test(String(primary.best_grid_points_note || '')) ? ' (preliminary)' : '';
  foot.lines.push([zline, `z_DLA, log N_HI: the best grid point${preliminary}`].filter(Boolean).join('; '));
  const muDef = /\(([^)]*not conditioned[^)]*)\)/.exec(String((C.definitions || {}).mu || ''));
  if (muDef) foot.lines.push(`GP prior mean: ${muDef[1].split(/,\s*so\s/)[0]}`);
  if (useExp) foot.lines.push('two absorbers: the package\'s experimental mode, not a validated estimator');
  foot.optional.push(`spectrum: DESI DR1 TARGETID ${id}, z = ${zq.toFixed(3)}`);
  if (useExp ? pModel !== null : pModel !== null || dlnZ !== null)
    foot.optional.push(`model comparison: ${[pModel !== null ? `P(M${useExp ? 2 : 1} | data) = ${Number.isInteger(pModel) ? pModel.toFixed(1) : pModel.toPrecision(3)}` : null,
      dlnZ !== null ? `ln Z1 − ln Z0 = ${dlnZ.toFixed(0)}` : null].filter(Boolean).join('; ')} (${useExp ? 'two absorbers, against one or none' : 'one absorber, against none'})`);
  if (absorbers.length) foot.optional.push(`my finder: ${absorbers.map(ab => `z_DLA ${ab.z.toFixed(4)}, log N_HI ${ab.logN.toFixed(2)}`).join('; ')}${desi.length ? `; DESI DR1 catalogue: ${desi.map(ab => `z_DLA ${ab.z.toFixed(4)}, log N_HI ${ab.logN.toFixed(2)}`).join('; ')}` : ''}`);
  if (desi.length) foot.optional.push('DESI catalogue: DESI DR1 CNN+GP DLA catalogue, rows passing its recommended cuts');
  foot.optional.push('method: Garnett et al. 2017; multiple DLAs: Ho, Bird & Garnett 2020');
  const cnn = String(cmp.cnn_gp_note || '').split(/;\s*/)[0];
  if (cnn) foot.optional.push('DESI DR1 CNN+GP: z and N_HI from the GP finder where both of DESI\'s finders detect (DESI\'s run)');
  if (prov.data_release) foot.optional.push(`data: ${prov.data_release}`);
  return {
    id, z: zq, title: `DESI DR1 · TARGETID ${id} · z = ${zq.toFixed(3)}`,
    ...P, range, y: (() => { const r = fluxRange(P, range[0], range[1], 0.12), top = Math.max(...C.mu_meanflux, ...model); return [r[0], Math.max(r[1], 1.06 * top)]; })(),
    gp: { wave: gw, mu: C.mu_meanflux, model },
    experimental: !!useExp, absorbers, desi, pModel, dlnZ, models, fluxUnit: fluxUnit(spec.units && spec.units.flux),
    finder: lit(`${run0.package || 'gp_dla_finder'} ${run0.version || ''}`.trim()),
    lyaNm: CONSTANTS.lya.lambda_nm, foot,
    foot0: { lines: [`data: ${String(prov.data_release || 'DESI DR1').split(/[ (,;]/).slice(0, 2).join(' ')}, public · one quasar${zline ? `; ${zline}` : ''}`], optional: [] },
  };
}
