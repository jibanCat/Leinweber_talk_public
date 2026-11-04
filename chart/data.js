
import { isoLoops, hpdLevels, closePieces } from './contour.js';
import { tracerKey } from './kit.js';
import { loadSpectra, SPECTRUM_NAMES } from './spectra.js';
import { CONSTANTS } from './constants.js';
import { plain } from './plain.js';
import { LW } from '../program.js';

export const KINDS = ['data', 'published', 'computed', 'schematic'];
export const FILES = ['distances', 'omh_grid', 'w0wa', 'pk_z3', 'full_shape', 'xi_tracers', 'ruler_lrg', 'absorbers', 'separations', 'why', 'emulator', 'emulator_walk', 'emulator_train', 'dla_p1d', 'emulator_zbins', 'de_models', 'scales', 'multifid', 'emulator_params', 'sne', 'sightlines', 'thermal', 'multifid_turn'];
export const NEEDS = {
  bao: ['distances'],
  w0wa: ['w0wa', 'distances', 'de_models', 'sne'],
  pk: ['pk_z3', 'absorbers', 'sightlines'],
  ruler: ['ruler_lrg', 'xi_tracers'],
  scales: ['scales'],
  fullshape: ['full_shape'],
  xi: ['xi_tracers'],
  hcd: ['absorbers', 'pk_z3'],
  abscosmo: ['absorbers'],
  spectrum: ['spectrum', 'separations'],
  find: ['find', 'dla_p1d'],
  why: ['why', 'pk_z3'],
  emulator: ['emulator_walk', 'emulator_train', 'emulator_zbins', 'multifid', 'emulator_params', 'thermal', 'multifid_turn'],
  mywork: [],
  dlapairs: ['sightlines'],
  emudesign: ['emulator'],
  resolution: ['emulator_train'],
};

const REAL = name => new URL(`../volume-spike/data/v3/charts/${name}.json`, import.meta.url);
const PLACEHOLDER = name => new URL(`./placeholders/${name}.json`, import.meta.url);

export async function loadCharts(names = FILES, { mode = 'auto', fetchFn = globalThis.fetch } = {}) {
  const charts = {}, report = [];
  const spec = names.filter(n => SPECTRUM_NAMES.includes(n));
  if (spec.length && mode !== 'placeholder') {
    const r = await loadSpectra(spec, { fetchFn });
    Object.assign(charts, r.charts); report.push(...r.report);
  }
  for (const name of names) {
    if (SPECTRUM_NAMES.includes(name)) continue;
    const tries = mode === 'real' ? [['real', REAL(name)]] : mode === 'placeholder' ? [['placeholder', PLACEHOLDER(name)]]
      : [['real', REAL(name)], ['placeholder', PLACEHOLDER(name)]];
    let entry = { name, from: null, url: null, errors: [`${name}: no file found`], warnings: [] };
    for (const [from, url] of tries) {
      let doc;
      try {
        const r = await fetchFn(url);
        if (!r.ok) continue;
        doc = await r.json();
      } catch { continue; }
      const { model, errors, warnings } = prepare(name, doc);
      entry = { name, from, url: String(url), errors, warnings };
      if (from === 'real' && doc.placeholder) entry.warnings.push(`${name}: the real path holds a file marked placeholder`);
      if (model && !errors.length) charts[name] = model;
      break;
    }
    report.push(entry);
  }
  return { charts, report };
}

export function prepare(name, doc) {
  const errors = validateEnvelope(doc, name);
  if (errors.length) return { model: null, errors, warnings: [] };
  const warnings = provenanceGaps(doc, name);
  let model = null;
  try {
    model = adapt(name, doc, warnings);
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
  }
  return { model, errors, warnings };
}

export function provenanceGaps(doc, name) {
  const G = [], where = name || (doc && doc.chart) || '?';
  if (!doc || typeof doc !== 'object') return G;
  const declared = new Set((doc.sources || []).map(s => s && s.ledger_id));
  const visit = (v, path) => {
    if (Array.isArray(v)) { v.forEach((x, i) => visit(x, `${path}[${i}]`)); return; }
    if (!v || typeof v !== 'object') return;
    if (typeof v.ledger_id === 'string' && path !== '' && !path.startsWith('sources') && v.ledger_id !== 'NEW'
      && !declared.has(v.ledger_id) && typeof v.source_url !== 'string' && !(Array.isArray(v.sources) && v.sources.some(s => s.ledger_id === v.ledger_id))) {
      G.push(`${where}: ${path}: ledger_id ${v.ledger_id} is not in sources (provenance gap)`);
    }
    for (const [k, x] of Object.entries(v)) if (k !== 'sources' && x && typeof x === 'object') visit(x, path ? `${path}.${k}` : k);
  };
  visit(doc, '');
  return G;
}
export function validateEnvelope(doc, name) {
  const E = [], where = name || (doc && doc.chart) || '?';
  const err = m => E.push(`${where}: ${m}`);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) { err('not a JSON object'); return E; }
  if (typeof doc.chart !== 'string') err('"chart" missing');
  else if (name && doc.chart !== name) err(`"chart" is "${doc.chart}", expected "${name}"`);
  if (!KINDS.includes(doc.kind)) err(`"kind" must be one of ${KINDS.join(', ')} (got ${JSON.stringify(doc.kind)})`);
  if (typeof doc.release !== 'string' || !doc.release) err('"release" missing');
  if (!Array.isArray(doc.sources) || !doc.sources.length) err('"sources" must be a non-empty array');
  else doc.sources.forEach((s, i) => {
    for (const k of ['ledger_id', 'source_url', 'location']) if (typeof (s && s[k]) !== 'string' || !s[k]) err(`sources[${i}].${k} missing`);
  });
  if (!Array.isArray(doc.series) || !doc.series.length) err('"series" must be a non-empty array');
  if (!doc.provenance || typeof doc.provenance !== 'object') err('"provenance" missing');
  else {
    if (typeof doc.provenance.script !== 'string') err('provenance.script missing');
    if (typeof doc.provenance.sha256 !== 'string') err('provenance.sha256 missing');
  }
  if (doc.placeholder !== undefined && doc.placeholder !== true) err('"placeholder" must be true when present');
  if (doc.look_neutral !== undefined && doc.look_neutral !== true) err('"look_neutral" must be true: colours are the renderer\'s, not the data\'s');
  (doc.series || []).forEach((s, i) => { if (s && s.kind !== undefined && !KINDS.includes(s.kind)) err(`series[${i}].kind ${JSON.stringify(s.kind)} is not a kind`); });
  const visit = (v, path) => {
    if (Array.isArray(v)) { v.forEach((x, i) => visit(x, `${path}[${i}]`)); return; }
    if (!v || typeof v !== 'object') return;
    if (v.ledger_id === 'NEW' && path !== '' && !path.startsWith('sources') && typeof v.source_url !== 'string' && typeof v.source !== 'string') err(`${path}: ledger_id NEW needs its own source_url`);
    for (const [k, x] of Object.entries(v)) if (k !== 'sources' && x && typeof x === 'object') visit(x, path ? `${path}.${k}` : k);
  };
  visit(doc, '');
  return E;
}

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const need = (cond, msg) => { if (!cond) throw new Error(msg); };
const first = (...v) => v.find(x => x !== undefined && x !== null);
const sig = v => (v === undefined || v === null ? null : isNum(v) ? `${v}σ` : String(v));
export const screen = t => (typeof t === 'string' ? t
  .replace(/(?:,|;)\s*C\d{3}(?:,\s*C\d{3})*(?=\))/g, '')
  .replace(/\s*\((?:PI answers?\s+[\d, ]+|0\d(?:,\s*[A-Z]+\d+)*|[A-Z]\d{3}(?:,\s*[A-Z]\d{3})*|F[12]\s[^)]*|docs?\s+\d+[^)]*)\)/g, '')
  .trim() : t);

export const oxford = t => (typeof t === 'string' ? t
  .replace(/\b(marginal|normal|summar|optim|regular|minim|maxim|visual|parametr|character|organ|recogn|real)is(e|es|ed|ing|ation|ations)\b/g, '$1iz$2')
  .replace(/\bmodel(ing|ed)\b/g, 'modell$1').replace(/\bgray\b/g, 'grey').replace(/\banalyz(e|es|ed|ing)\b/g, 'analys$1')
  .replace(/\bbehavior(s?)\b/g, 'behaviour$1').replace(/\blabeled\b/g, 'labelled') : t);

export const FALLBACK_LABELS = {
  distances: { x: 'redshift z', y: 'D_V/r_d relative to the reference model' },
  omh_grid: { x: 'h r_d [Mpc]', y: 'Ω_m' },
  w0wa: { x: 'w_0', y: 'w_a' },
  pk_z3: { x: 'k [h Mpc^{−1}]', y: 'P(k) [(h^{−1} Mpc)^3]' },
};
function axis(a, fallbackLabel, name, which) {
  const ax = a || {};
  const out = { label: plain(`${name}.${which}`, first(ax.label, fallbackLabel)), range: null, log: !!ax.log, key: ax.key || null };
  const r = first(ax.range, ax.display_range);
  if (Array.isArray(r) && r.length === 2 && r.every(isNum) && r[1] !== r[0]) out.range = r.slice();
  need(out.label, `${name}: axes.${which}.label missing`);
  return out;
}
function bounds(v, e, lo, hi) {
  if (isNum(lo) && isNum(hi)) return [lo, hi];
  if (isNum(e)) return [v - e, v + e];
  if (Array.isArray(e) && e.length === 2 && e.every(isNum)) return [v - Math.abs(e[0]), v + Math.abs(e[1])];
  return null;
}
function measurement(m) {
  if (isNum(m)) return { v: m, b: null };
  if (!m || !isNum(m.value)) return null;
  if (isNum(m.minus) && isNum(m.plus)) return { v: m.value, b: [m.value - m.minus, m.value + m.plus] };
  if (isNum(m.sigma)) return { v: m.value, b: [m.value - m.sigma, m.value + m.sigma] };
  return { v: m.value, b: null };
}

const KIND_WORD = { data: 'data', published: 'published', computed: 'computed by us', schematic: 'schematic' };
export function shortSource(s) {
  if (s.cite) return s.cite;
  const u = String(s.source_url || '');
  let m = /arxiv\.org\/(?:abs|html|pdf)\/([0-9.]+(?:v\d+)?)/i.exec(u);
  if (m) return `arXiv:${m[1]}`;
  m = /(?:doi\.org\/)?(10\.5281\/zenodo\.\d+)/i.exec(u) || /zenodo\.org\/records\/(\d+)/i.exec(u);
  if (m) return `Zenodo ${m[1]}`;
  m = /^https?:\/\/([^/]+)/.exec(u);
  return m ? m[1] : u;
}
function composedFoot(doc) {
  const cites = [];
  for (const s of doc.sources || []) {
    const c = `${shortSource(s)}${s.location ? `, ${s.location}` : ''}`;
    if (!cites.includes(c)) cites.push(c);
  }
  return `${KIND_WORD[doc.kind] || doc.kind} (${doc.release}): ${cites.slice(0, 2).join('; ')}`;
}
function oneLine(foot, line) {
  const ph = foot.lines.filter(L => /^PLACEHOLDER/.test(L));
  return { lines: [...ph, line], optional: [...foot.lines.filter(L => !/^PLACEHOLDER/.test(L) && L !== line), ...(foot.optional || [])], ...(foot.caveats ? { caveats: foot.caveats } : {}) };
}

function adaptMultifidTurn(doc, warnings) {
  const m = base(doc), S = (doc.series || []).find(x => x.id === 'turn');
  need(S && typeof S.detailed === 'string' && typeof S.cheap === 'string' && Array.isArray(S.yaw_deg), 'multifid_turn: series turn missing');
  const dec = b => { const t = atob(b), a = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
  const n = S.h * S.w * S.yaw_deg.length;
  m.turn = { yaw: S.yaw_deg, tilt: S.tilt_deg, h: S.h, w: S.w, box: S.box_px, detailed: dec(S.detailed), cheap: dec(S.cheap) };
  need(m.turn.detailed.length === n && m.turn.cheap.length === n, 'multifid_turn: frames of the wrong size');
  return m;
}
function base(doc) {
  const foot = { lines: [], optional: [] };
  if (doc.placeholder) foot.lines.push('PLACEHOLDER: fake values for layout only, not data');
  if (Array.isArray(doc.foot)) foot.lines.push(...doc.foot.map(String).map(screen));
  else if (typeof doc.on_screen_tag === 'string') foot.lines.push(screen(doc.on_screen_tag));
  else if (!doc.foot || typeof doc.foot !== 'object') foot.lines.push(composedFoot(doc));
  return {
    chart: doc.chart, kind: doc.kind, release: doc.release, placeholder: doc.placeholder === true,
    sources: doc.sources, foot, provenance: doc.provenance,
  };
}

export function adapt(name, doc, warnings = []) {
  if (name === 'distances') return adaptDistances(doc, warnings);
  if (name === 'omh_grid') {
    const m = adaptContours(doc, warnings, 'omh_grid');
    m.x.label = `ruler × expansion rate, ${/H_?0 ?r_?d|H₀ ?r/.test(m.x.label) && /100 km/.test(m.x.label) ? 'h r_d [Mpc]' : m.x.label}`;
    m.y.label = `matter fraction, ${m.y.label}`;
    const lv = m.series[0] && m.series[0].levels;
    m.footOne = { lines: [`${String(doc.on_screen_tag || m.foot.lines[0] || '').replace(/\s*\([^)]*\)\s*$/, '')}${lv && lv.length > 1 ? ` · ${lv[0]} filled, ${lv[lv.length - 1]} outlined` : ''}`],
      optional: [...m.foot.lines, ...m.foot.optional] };
    return m;
  }
  if (name === 'w0wa') return adaptW0wa(doc, warnings);
  if (name === 'pk_z3') return adaptPk(doc, warnings);
  if (name === 'ruler_lrg') return adaptRuler(doc, warnings);
  if (name === 'full_shape') return adaptFullShape(doc, warnings);
  if (name === 'xi_tracers') return adaptXi(doc, warnings);
  if (name === 'absorbers') return adaptAbsorbers(doc, warnings);
  if (name === 'separations') return adaptSeparations(doc, warnings);
  if (name === 'why') return adaptWhy(doc, warnings);
  if (name === 'emulator') return adaptEmulator(doc, warnings);
  if (name === 'emulator_walk') return adaptEmulatorWalk(doc, warnings);
  if (name === 'emulator_train') return adaptEmulatorTrain(doc, warnings);
  if (name === 'dla_p1d') return adaptDlaP1d(doc, warnings);
  if (name === 'de_models') return adaptDeModels(doc, warnings);
  if (name === 'scales') return adaptScales(doc, warnings);
  if (name === 'sne') return adaptSne(doc, warnings);
  if (name === 'emulator_zbins') return adaptEmulatorZbins(doc, warnings);
  if (name === 'sightlines') return adaptSightlines(doc, warnings);
  if (name === 'thermal') return adaptThermal(doc, warnings);
  if (name === 'multifid') return adaptMultifid(doc, warnings);
  if (name === 'multifid_turn') return adaptMultifidTurn(doc, warnings);
  if (name === 'emulator_params') return adaptEmulatorParams(doc, warnings);
  return { ...base(doc), raw: doc };
}

const QLABEL = { DV_over_rs: 'D_V/r_d', DM_over_rs: 'D_M/r_d', DH_over_rs: 'D_H/r_d', DM_over_DH: 'D_M/D_H' };
function normalisationOf(doc) {
  const N = doc.normalisations && typeof doc.normalisations === 'object' ? doc.normalisations : {};
  const keys = Object.keys(N).filter(k => typeof N[k] === 'string' && k !== 'axis_label_rule');
  const def = keys.find(k => /the default/i.test(N[k])) || keys.find(k => /bestfit|best_fit/.test(k)) || keys[0] || null;
  return { key: def, text: def ? N[def] : null };
}
function modelName(text) {
  const m = /ratio to (?:the )?(.+?)(?:\s*\(|,|\s+[—=]|$)/.exec(text || '');
  return m ? m[1].replace(/^DESI\s+/, '').replace(/\bflat\s+/, '').trim() : null;
}
function adaptDistances(doc, warnings) {
  const m = base(doc);
  const ax = doc.axes || {};
  const q = (doc.display && typeof doc.display.quantity === 'string' && doc.display.quantity) || 'DV_over_rs';
  const norm = normalisationOf(doc);
  const ref = modelName(norm.text);
  m.x = axis(ax.x, FALLBACK_LABELS.distances.x, 'distances', 'x');
  m.y = axis(ax.y, ref ? `${QLABEL[q] || q} relative to ${ref}` : FALLBACK_LABELS.distances.y, 'distances', 'y');
  m.points = [];
  doc.series.forEach((s, i) => {
    const x = first(s.x, s.z_eff, s.z);
    let y = first(s.y, s.ratio), b = null;
    if (!isNum(y) && s.ratios && s.ratios[q]) {
      const r = s.ratios[q][norm.key] || Object.values(s.ratios[q])[0];
      const mm = measurement(r);
      if (mm) { y = mm.v; b = mm.b; }
    }
    if (!isNum(x) || !isNum(y)) { warnings.push(`distances: series[${i}] (${s.label || s.id}) has no ${q} ratio; left out`); return; }
    if (!b) b = bounds(y, first(s.yerr, s.err, s.sigma), s.ylo, s.yhi);
    if (!b) warnings.push(`distances: series[${i}] has no error bar`);
    const label = screen(String(first(s.label, s.tracer, s.id, '')));
    const tk = tracerKey(first(s.tracer, s.id, label));
    m.points.push({ id: first(s.id, label), label, tracer: tk, x, y, err: b, highlight: s.highlight === true || (s.highlight === undefined && tk === 'LYA'), ledger_id: s.ledger_id || null,
      lookback: typeof s.lookback_gyr_text === 'string' ? s.lookback_gyr_text : isNum(s.lookback_gyr) ? s.lookback_gyr.toFixed(1) : null });
  });
  need(m.points.length, 'distances: no points');
  m.points.sort((a, b) => a.x - b.x);
  m.reference = doc.reference && isNum(doc.reference.y) ? { y: doc.reference.y } : (norm.key || /ratio|relative/i.test(m.y.label) ? { y: 1 } : null);
  const lb = doc.lookback_axis || (ax.top && { ticks: ax.top.ticks });
  m.top = lb && Array.isArray(lb.ticks) ? {
    label: (ax.top && ax.top.label) || 'look-back time [Gyr]',
    ticks: lb.ticks.map(t => ({ x: first(t.z, t.x), label: String(first(t.gyr, t.label)) })).filter(t => isNum(t.x)),
  } : null;
  if (!m.x.range) {
    const hi = Math.max(...m.points.map(p => p.x)) * 1.05, step = hi > 2 ? 0.5 : 0.25;
    m.x.range = [0, Math.ceil(hi / step) * step];
  }
  if (!m.y.range) {
    const c = m.reference ? m.reference.y : (Math.min(...m.points.map(p => p.y)) + Math.max(...m.points.map(p => p.y))) / 2;
    const half = 1.25 * Math.max(...m.points.flatMap(p => (p.err ? p.err : [p.y]).map(v => Math.abs(v - c))));
    const step = 10 ** Math.floor(Math.log10(half)), h = Math.ceil(half / step) * step;
    m.y.range = [c - h, c + h];
  }
  const DE = doc.de_fraction;
  const LF = doc.lya_fs;
  m.lyaFs = LF && LF.ratio_dr2_bestfit && isNum(LF.ratio_dr2_bestfit.value) && isNum(LF.ratio_dr2_bestfit.sigma)
    ? { z: LF.z, y: LF.ratio_dr2_bestfit.value, err: [LF.ratio_dr2_bestfit.value - LF.ratio_dr2_bestfit.sigma, LF.ratio_dr2_bestfit.value + LF.ratio_dr2_bestfit.sigma],
      cite: screen(LF.cite || ''), label: screen(LF.label || '') } : null;
  m.de = DE && Array.isArray(DE.z) && Array.isArray(DE.fraction) && DE.z.length === DE.fraction.length
    ? { z: DE.z, f: DE.fraction, text: typeof DE.on_screen_text === 'string' ? screen(DE.on_screen_text) : null, label: typeof DE.label === 'string' ? screen(DE.label) : null } : null;
  if (norm.text) m.foot.lines.push(screen(norm.text.replace(/\s+[—-]+\s*the default\.?$/i, '')));
  if (m.top && lb.cosmology) m.foot.optional.push(`top axis: look-back time, ${lb.kind === 'computed' || !lb.kind ? 'computed' : lb.kind} (${lb.cosmology})`);
  const C = doc.curves || {}, bf = C.dr2_bestfit_lcdm || {};
  const pts = doc.series.map(s => {
    const v = (s.table_iv && s.table_iv.DV_over_rs) || (s.derived && s.derived.DV_over_rs) || (s.measured && s.measured.DV_over_rs);
    const x = first(s.z_eff, s.z);
    return v && isNum(v.value) && isNum(x) ? { id: s.id, x, y: v.value, sig: isNum(v.sigma) ? v.sigma : null, highlight: s.highlight === true,
      lookback: typeof s.lookback_gyr_text === 'string' ? s.lookback_gyr_text : null } : null;
  }).filter(Boolean).sort((a, b) => a.x - b.x);
  if (pts.length && Array.isArray(C.z) && Array.isArray(bf.DV_over_rs) && C.z.length === bf.DV_over_rs.length) {
    const par = /\(([^()]*Ω_m[^()]*)\)/.exec(String(norm.text || ''));
    const pm = par && /Ω_m\s*=\s*([\d.]+)/.exec(par[1]), ph = par && /h r_d\s*=\s*([\d.]+)/.exec(par[1]);
    const pv = pm && ph ? `Ω_m ${pm[1]}, h r_d ${ph[1]}` : null;
    m.plain = {
      points: pts, curve: { z: C.z, y: bf.DV_over_rs },
      x: { label: 'redshift z' }, y: { label: 'distance to z, in ruler units, D_V / r_d' },
      curveLabel: `ΛCDM: DESI DR2 BAO${pv ? ` (${pv})` : ''}`,
      curveName: 'flat ΛCDM fitted to DESI DR2 BAO',
      foot: { lines: [screen(`data: ${String(doc.on_screen_tag || 'DESI DR2 BAO').split(';')[0]} · curve: flat ΛCDM with DESI DR2 BAO alone's mean parameters`)],
        short: [screen(`data: ${String(doc.on_screen_tag || 'DESI DR2 BAO').split(';')[0]} · curve: flat ΛCDM, DESI DR2 BAO's mean parameters`), screen(`data: ${String(doc.on_screen_tag || 'DESI DR2 BAO').split(';')[0]}`)],
        optional: [screen(`curve: flat ΛCDM at DESI DR2 BAO alone's posterior means${par ? ` (${par[1]})` : ''}${doc.de_fraction && doc.de_fraction.cosmology && doc.de_fraction.cosmology.Omega_m_source ? `; Ω_m: ${doc.de_fraction.cosmology.Omega_m_source}` : ''}`)] },
    };
    m.plain.yGloss = 'D_V: the distances along and across the line of sight, combined';
    if (m.de && m.de.label) m.plain.foot.optional.push(`dark energy's share: ${m.de.label}`);
    if (lb && lb.cosmology) m.plain.foot.optional.push(`look-back time: ${lb.kind || 'computed'} (${lb.cosmology})`);
  } else if (!m.placeholder) warnings.push('distances: no Table IV D_V/r_d or no curves.dr2_bestfit_lcdm.DV_over_rs: the anchor keeps the ratio chart');
  return m;
}

function adaptDeModels(doc, warnings) {
  const m = base(doc);
  need(Array.isArray(doc.z) && doc.z.length > 2, 'de_models: no z grid');
  m.z = doc.z;
  m.models = doc.series.map((s, i) => {
    need(Array.isArray(s.DV_ratio_to_dr2_lcdm) && s.DV_ratio_to_dr2_lcdm.length === doc.z.length, `de_models: series[${i}] has no ratio on the z grid`);
    need(isNum(s.w0) && isNum(s.wa), `de_models: series[${i}] needs w0 and wa`);
    return { id: s.id, label: screen(String(s.label || s.id)), w0: s.w0, wa: s.wa, glyph: s.glyph || 'circle-open', ratio: s.DV_ratio_to_dr2_lcdm,
      lcdm: s.w0 === -1 && s.wa === 0, inside: s.inside || {}, chi2: isNum(s.chi2_desi_dr2_bao) ? s.chi2_desi_dr2_bao : null, note: s.note ? screen(String(s.note)) : null };
  });
  const O = doc.on_screen || {};
  m.caption = typeof O.caption === 'string' ? screen(O.caption) : null;
  m.captionShort = typeof O.caption_short === 'string' ? screen(O.caption_short) : null;
  m.refLabel = doc.reference && doc.reference.label ? screen(doc.reference.label) : 'ΛCDM';
  const E = doc.early_universe || {};
  const dataBy = ' · data: DESI Collaboration 2025 (DR2 II)';
  m.foot = { lines: [screen(`curves: computed (CAMB), flat w₀w_a with the early Universe of DESI's Planck 2018 fiducial (Ω_b h² ${E.ombh2}, Ω_c h² ${E.omch2}, θ⋆ fixed); ÷ ${m.refLabel}${dataBy}`)],
    optional: [...m.models.map(q => `${q.label}: ${q.note || ''}${q.chi2 !== null ? ` (χ² against DESI DR2 BAO, 13 numbers: ${q.chi2})` : ''}`), ...(Array.isArray(doc.caveats) ? doc.caveats.map(screen) : [])],
    short: [screen(`curves: computed (CAMB), flat w₀w_a with the early Universe of DESI's Planck 2018 fiducial; ÷ ${m.refLabel}${dataBy}`),
      screen(`curves: CAMB, flat w₀w_a, early Universe as DESI's Planck 2018 fiducial; ÷ ${m.refLabel}${dataBy}`), screen(`curves: CAMB, flat w₀w_a, early Universe fixed; ÷ ${m.refLabel}${dataBy}`),
      `curves: computed (CAMB), flat w₀w_a with the early Universe of DESI's Planck 2018 fiducial${dataBy}`, `curves: computed (CAMB), flat w₀w_a, early Universe fixed${dataBy}`] };
  return m;
}

function adaptSne(doc, warnings) {
  const m = base(doc);
  const want = doc.display && doc.display.series, S = doc.series.find(s => s.id === want) || doc.series[0];
  need(S && Array.isArray(S.bins) && S.bins.length, 'sne: no binned sample');
  m.id = S.id; m.label = screen(String(S.label || S.id));
  m.points = S.bins.filter(b => [b.z, b.ratio, b.sigma].every(isNum)).map(b => ({ x: b.z, y: b.ratio, err: [b.ratio - b.sigma, b.ratio + b.sigma], n: b.n }));
  need(m.points.length, 'sne: no points');
  const O = doc.on_screen || {};
  m.name = `${screen(String(O.name || 'SNe'))} (${m.label})`;
  m.kind = screen(String(O.kind || 'luminosity distances, offset fitted'));
  m.foot = { lines: S.foot ? [screen(String(S.foot))] : [], optional: [screen(String(doc.method || '')), ...(Array.isArray(doc.caveats) ? doc.caveats.map(screen) : [])].filter(Boolean),
    short: S.foot_short ? [screen(String(S.foot_short))] : [] };
  return m;
}

function adaptScales(doc, warnings) {
  const m = base(doc);
  const ax = doc.axes || {}, X = ax.x || {}, Y = ax.y || {};
  need(Array.isArray(X.range) && Array.isArray(Y.range), 'scales: axes need ranges');
  const zf = isNum(Y.zfloor) ? Y.zfloor : 0.01;
  m.x = { label: plain('scales.x', screen(X.label || 'comoving scale [Mpc]')), range: X.range.slice(), ticks: (X.ticks || []).slice() };
  m.y = { label: screen(Y.label || 'redshift z'), range: Y.range.slice(), ticks: (Y.ticks || []).slice(), floor: zf };
  m.boxes = doc.series.map((s, i) => {
    need([s.z_min, s.z_max, s.scale_min_mpc, s.scale_max_mpc].every(isNum), `scales: series[${i}] needs its four edges`);
    return { id: s.id, label: screen(String(s.label || s.id)), lines: Array.isArray(s.lines) ? s.lines.map(String) : [screen(String(s.label || s.id))], tier: s.tier === 'frontier' ? 'frontier' : 'precision', lya: s.lya === true, group: s.group || null,
      z: [Math.max(zf, s.z_min), Math.max(zf, s.z_max)], s: [s.scale_min_mpc, s.scale_max_mpc] };
  });
  m.bao = doc.bao && isNum(doc.bao.rd_Mpc) ? { rd: doc.bao.rd_Mpc, label: screen(doc.bao.label || 'BAO') } : null;
  m.tiers = doc.tiers || {};
  m.caveat = typeof doc.caveat === 'string' ? screen(doc.caveat) : null;
  if (LW && m.caveat) m.caveat = m.caveat.replace(/read off published figures$/, "read off a paper's and a talk's figures");
  const PER_H = false;
  m.x.unit = 1;
  if (LW && PER_H) {
    const f = 0.6736 / (2 * Math.PI);
    m.x.unit = f; m.x.range = m.x.range.map(v => v * f); m.x.ticks = [100, 10, 1, 0.1, 0.01];
    for (const b of m.boxes) b.s = b.s.map(v => v * f);
    m.bao = null;
    if (m.caveat) m.caveat = `${m.caveat}; scale = 1/k`;
  }
  m.foot = { lines: doc.credit ? [screen(doc.credit)] : [], optional: [], short: Array.isArray(doc.credit_short) ? doc.credit_short.map(screen) : [] };
  return m;
}

function contourSeries(s, i, doc, name, warnings, span) {
  const label = screen(String(first(s.label, s.tracer, s.id, '')));
  const tk = tracerKey(first(s.tracer, s.id, label));
  const out = { id: first(s.id, label), label, tracer: tk, z: first(s.z_eff, s.z, null),
    combined: !!s.combined || tk === 'ALL', ledger_id: s.ledger_id || null,
    significance: sig(first(s.significance, s.significance_sigma, s.published && s.published.significance_sigma)),
    levels: [], loops: [], highlight: s.highlight === true || (s.highlight === undefined && tk === 'LYA'),
    optional: s.optional === true };
  if (s.contours && typeof s.contours === 'object' && !Array.isArray(s.contours)) {
    const keys = Object.keys(s.contours).sort((a, b) => parseFloat(a) - parseFloat(b));
    out.levels = keys.map(k => (/^\d+(\.\d+)?$/.test(k) ? `${k}%` : k));
    out.loops = keys.map(k => closePieces(s.contours[k], span));
    if (out.loops.some(L => !L.length)) warnings.push(`${name}: ${label} has an empty contour`);
    return out;
  }
  const levels = s.levels || doc.levels;
  need(Array.isArray(levels) && levels.length, `${name}: series[${i}] has no contours and no levels`);
  out.levels = levels.map(l => String(first(l.label, l.name, '')));
  if (Array.isArray(s.paths)) {
    need(s.paths.length === levels.length, `${name}: series[${i}].paths must have one entry per level`);
    out.loops = s.paths.map(set => closePieces(Array.isArray(set[0] && set[0][0]) ? set : [set], span));
    return out;
  }
  const grid = s.grid || doc.grid || {};
  const gx = first(s.x_grid, grid.x), gy = first(s.y_grid, grid.y);
  need(Array.isArray(gx) && Array.isArray(gy) && gx.length > 1 && gy.length > 1, `${name}: series[${i}] needs grid.x and grid.y (or contours)`);
  let field, thresholds;
  if (Array.isArray(s.dchi2) || Array.isArray(s.chi2) || Array.isArray(s.loglike)) {
    const raw = s.dchi2 || s.chi2 || s.loglike;
    const toD = s.dchi2 ? v => v : s.chi2 ? (() => { const mn = Math.min(...raw.flat().filter(isNum)); return v => v - mn; })()
      : (() => { const mx = Math.max(...raw.flat().filter(isNum)); return v => -2 * (v - mx); })();
    field = raw.map(row => row.map(v => (isNum(v) ? -toD(v) : -Infinity)));
    thresholds = levels.map((l, k) => { need(isNum(l.dchi2), `${name}: levels[${k}].dchi2 missing for a Δχ² grid`); return -l.dchi2; });
  } else if (Array.isArray(s.density)) {
    field = s.density.map(row => row.map(v => (isNum(v) ? v : -Infinity)));
    const masses = levels.map(l => l.mass);
    thresholds = levels.every(l => isNum(l.density)) ? levels.map(l => l.density)
      : masses.every(isNum) ? hpdLevels(field, masses) : null;
    need(thresholds, `${name}: levels need density thresholds or masses for a density grid`);
  } else throw new Error(`${name}: series[${i}] needs contours, paths, dchi2, chi2, loglike or density`);
  need(field.length === gy.length && field.every(r => r.length === gx.length), `${name}: series[${i}] field is not ${gy.length} × ${gx.length}`);
  out.loops = thresholds.map(t => isoLoops(gx, gy, field, t));
  if (out.loops.some(L => !L.length)) warnings.push(`${name}: series[${i}] (${label}) has an empty contour`);
  return out;
}
const MAIN = new Set([undefined, null, 'main', 'dr2_ii']);
const SEPARATE = new Set(['separate', 'dr2_iv']);

function adaptContours(doc, warnings, name) {
  const m = base(doc);
  const ax = doc.axes || {};
  const fb = FALLBACK_LABELS[name] || {};
  m.x = axis(ax.x, fb.x, name, 'x');
  m.y = axis(ax.y, fb.y, name, 'y');
  const ref = doc.reference || (Array.isArray(ax.lcdm) ? { x: ax.lcdm[0], y: ax.lcdm[1], label: 'ΛCDM' } : null);
  m.reference = ref && (isNum(ref.x) || isNum(ref.y)) ? { x: isNum(ref.x) ? ref.x : null, y: isNum(ref.y) ? ref.y : null, label: ref.label || '' } : null;
  const span = [m.x.range ? Math.abs(m.x.range[1] - m.x.range[0]) : 1, m.y.range ? Math.abs(m.y.range[1] - m.y.range[0]) : 1];
  let series = doc.series.map((s, i) => [s, i]).filter(([s]) => MAIN.has(s.panel));
  if (Array.isArray(doc.draw_order)) {
    const at = id => { const k = doc.draw_order.indexOf(id); return k < 0 ? 1e9 : k; };
    series = series.sort((a, b) => at(a[0].id) - at(b[0].id) || a[1] - b[1]);
  }
  const all = series.map(([s, i]) => contourSeries(s, i, doc, name, warnings, span));
  m.series = all.filter(s => !s.optional);
  m.optional = all.filter(s => s.optional);
  need(m.series.length, `${name}: no contour series`);
  for (const [k, a] of [[0, m.x], [1, m.y]]) {
    if (a.range) continue;
    const g = doc.grid && (k ? doc.grid.y : doc.grid.x);
    const v = Array.isArray(g) ? g : m.series.flatMap(s => s.loops.flat(2).map(p => p[k]));
    a.range = [Math.min(...v), Math.max(...v)];
    warnings.push(`${name}: axes.${k ? 'y' : 'x'}.range missing; the grid's extent is used`);
  }
  return m;
}

function adaptW0wa(doc, warnings) {
  const m = adaptContours(doc, warnings, 'w0wa');
  m.x.label = `dark energy today, ${m.x.label}`;
  m.y.label = `its change over time, ${m.y.label}`;
  const F = doc.foot && typeof doc.foot === 'object' && !Array.isArray(doc.foot) ? doc.foot : null;
  if (F && F.dr2_ii) {
    m.foot = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
    for (const k of ['text', 'data']) if (F.dr2_ii[k]) m.foot.lines.push(screen(F.dr2_ii[k]));
    if (F.dr2_ii.rule) m.foot.optional.push(screen(F.dr2_ii.rule));
    if (F.dr2_ii.text) m.foot = oneLine(m.foot, `${screen(F.dr2_ii.text).split(':')[0]}${F.dr2_ii.data ? ` · ${screen(F.dr2_ii.data)}` : ''}`);
  } else {
    const sigs = m.series.filter(s => s.significance).map(s => `${s.label} ${s.significance}`);
    if (sigs.length) m.foot.lines.push(`preference over ΛCDM: ${sigs.join(' · ')}`);
  }
  const sep = doc.separate || null;
  const pts = [...(sep && Array.isArray(sep.points) ? sep.points : []), ...doc.series.filter(s => SEPARATE.has(s.panel))];
  if (pts.length) {
    const ax = (sep && sep.axes) || doc.axes || {};
    const kx = m.x.key || 'w0', ky = m.y.key || 'wa';
    const S = {
      x: axis(ax.x, m.x.label, 'w0wa.separate', 'x'), y: axis(ax.y, m.y.label, 'w0wa.separate', 'y'),
      points: pts.map((p, i) => {
        const mx = isNum(p.x) ? { v: p.x, b: bounds(p.x, first(p.xerr, p.x_err), p.xlo, p.xhi) } : measurement(p[kx]);
        const my = isNum(p.y) ? { v: p.y, b: bounds(p.y, first(p.yerr, p.y_err), p.ylo, p.yhi) } : measurement(p[ky]);
        need(mx && my, `w0wa: separate point ${i} needs ${kx} and ${ky} values`);
        return { id: first(p.id, p.label), label: String(first(p.label, p.id, '')), x: mx.v, y: my.v, xb: mx.b, yb: my.b,
          significance: sig(first(p.significance, p.significance_sigma)), ledger_id: p.ledger_id || null };
      }),
      foot: { lines: [], optional: [] },
    };
    if (!/today/.test(S.x.label)) S.x.label = `dark energy today, ${S.x.label}`;
    if (!/change/.test(S.y.label)) S.y.label = `its change over time, ${S.y.label}`;
    if (!S.x.range) S.x.range = m.x.range.slice();
    if (!S.y.range) S.y.range = m.y.range.slice();
    if (F && F.dr2_iv) {
      for (const k of ['text', 'data']) if (F.dr2_iv[k]) S.foot.lines.push(screen(F.dr2_iv[k]));
      if (F.dr2_iv.text) S.foot = oneLine(S.foot, `${screen(F.dr2_iv.text).split(':')[0]}${F.dr2_iv.data ? ` · ${screen(F.dr2_iv.data)}` : ''}`);
    }
    else {
      if (sep && sep.title) S.foot.lines.push(sep.title);
      if (sep && sep.data_note) S.foot.lines.push(sep.data_note);
      const sigs = S.points.filter(p => p.significance).map(p => `${p.label} ${p.significance}`);
      if (sigs.length) S.foot.lines.push(`preference over ΛCDM: ${sigs.join(' · ')}`);
    }
    m.separate = S;
  } else m.separate = null;
  return m;
}

function edgeOf(E, warnings) {
  if (!E || typeof E !== 'object') return null;
  const alt = E.alt_edge_r_min;
  const stale = typeof E.label === 'string' && /<\s*10\b/.test(E.label);
  const own = typeof E.screen_label === 'string' ? E.screen_label : !stale && typeof E.label === 'string' ? E.label : null;
  if (alt && isNum(alt.k_auto) && isNum(alt.r_auto)) {
    return { k: alt.k_auto, r: alt.r_auto, label: oxford(screen(own || `DESI's 3D Lyα fits use r > ${alt.r_auto} h^{−1} Mpc and marginalize smaller scales`)) };
  }
  if (own && isNum(E.k)) return { k: E.k, r: isNum(E.r) ? E.r : null, label: oxford(screen(own)) };
  warnings.push('pk_z3: marginalised_edge has only the abstract\'s wording and no alt_edge_r_min; the edge is not drawn');
  return null;
}
export const shortLabel = l => String(l || '').split(/\s+\(|\s+—\s+/)[0].trim();
function adaptPk(doc, warnings) {
  const m = base(doc);
  const ax = doc.axes || {};
  m.x = axis({ ...ax.x, log: true }, FALLBACK_LABELS.pk_z3.x, 'pk_z3', 'x');
  m.y = axis({ ...ax.y, log: true }, FALLBACK_LABELS.pk_z3.y, 'pk_z3', 'y');
  const curve = doc.series.find(s => Array.isArray(s.k_h_per_Mpc) && Array.isArray(s.P_h3));
  need(curve, 'pk_z3: no P(k) curve (series with k_h_per_Mpc[] and P_h3[])');
  m.curve = { k: curve.k_h_per_Mpc, P: curve.P_h3, label: curve.label || '' };
  m.points = doc.series.filter(s => s.compressed && isNum(s.k_h_per_Mpc) && isNum(s.P_h3)).map(s0 => {
    const rb = s0.recomputed_b && s0.recomputed_b.compressed && isNum(s0.recomputed_b.P_h3) ? s0.recomputed_b : null;
    const s = rb ? { ...s0, compressed: rb.compressed, P_h3: rb.P_h3, sigma_P_h3: rb.sigma_P_h3, slope_tick: rb.slope_tick, contours_inset: rb.contours_inset } : s0;
    const c = s.compressed, t = s.slope_tick || null;
    const ins = s.contours_inset && typeof s.contours_inset === 'object' ? Object.keys(s.contours_inset).sort((a, b) => parseFloat(a) - parseFloat(b)) : [];
    return { id: s.id, label: screen(String(s.label || s.id)), noteLabel: screen(String((rb && rb.label) || s.label || s.id)), short: shortLabel(s.label || s.id), k: s.k_h_per_Mpc, P: s.P_h3, sigP: isNum(s.sigma_P_h3) ? s.sigma_P_h3 : null,
      recomputed: rb ? { published: rb.published, omegaBh2: rb.omega_b_h2 } : null,
      c: { x: c.Delta2_L, sx: c.sigma_Delta2_L, y: c.n_eff, sy: c.sigma_n_eff, rho: isNum(c.rho) ? c.rho : 0 },
      tick: t && Array.isArray(t.k) && Array.isArray(t.P) ? { k: t.k, P: t.P, lo: t.fan_lo || null, hi: t.fan_hi || null } : null,
      highlight: s.highlight === true || s.my_work === true, mine: s.my_work === true, treatment: typeof s.treatment === 'string' ? s.treatment : null,
      loops: ins.map(k => closePieces(s.contours_inset[k], [1, 1])), levels: ins.map(k => `${k}%`), truncated: !!s.prior_caveat };
  });
  need(m.points.length, 'pk_z3: no compressed points');
  const pv = doc.pivot || {};
  m.pivot = isNum(pv.k_h_per_Mpc) ? { k: pv.k_h_per_Mpc, label: screen(pv.label || '') } : null;
  const B = doc.bands || {};
  m.bands = {
    fit: B.desi_lya_fs_fit && Array.isArray(B.desi_lya_fs_fit.k_auto) ? { k: B.desi_lya_fs_fit.k_auto, label: screen(B.desi_lya_fs_fit.label || '') } : null,
    edge: edgeOf(B.marginalised_edge, warnings),
    bao: B.bao_scale && isNum(B.bao_scale.k) ? { k: B.bao_scale.k, label: screen(B.bao_scale.label || '') } : null,
  };
  const R = doc.p1d_ranges || {};
  m.ranges = Object.entries(R).filter(([, v]) => v && Array.isArray(v.k_h) && v.k_h.length === 2).map(([id, v]) => {
    const pt = m.points.find(p => id === p.id || id.startsWith(p.id));
    return { id, k: v.k_h, label: v.label || (pt ? pt.short : id), highlight: pt ? pt.highlight : false };
  });
  const sm = R.smallest_scale_quoted;
  m.smallest = sm && isNum(sm.k_h) ? { k: sm.k_h, label: sm.label || '' } : null;
  const ia = (doc.inset && doc.inset.axes) || {};
  m.inset = { x: typeof ia.x === 'string' ? ia.x : 'Δ^2_L', y: typeof ia.y === 'string' ? ia.y : 'n_eff' };
  if (!m.x.range) m.x.range = [Math.min(...m.curve.k), Math.max(...m.curve.k)];
  if (!m.y.range) {
    const inX = m.curve.P.filter((_, i) => m.curve.k[i] >= m.x.range[0] && m.curve.k[i] <= m.x.range[1]);
    m.y.range = [10 ** Math.floor(Math.log10(Math.min(...inX))), 10 ** Math.ceil(Math.log10(Math.max(...inX)))];
  }
  m.foot = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
  if (pv.conversion_foot) m.foot.lines.push(screen(pv.conversion_foot));
  if (typeof doc.definitions_foot === 'string') {
    const rec = m.points.some(p => p.recomputed);
    const df = rec ? doc.definitions_foot.replace(/(Ho et al\. \d{4} take the exact derivative.*?)\.?\s*$/, '$1 (as published); the point of mine drawn here is recomputed in DESI\'s definition.') : doc.definitions_foot;
    if (rec && df === doc.definitions_foot && /exact derivative/.test(df)) warnings.push('pk_z3: definitions_foot names the exact derivative but could not be qualified for the recomputed point (V15c N1)');
    m.foot.lines.push(screen(df));
  }
  const CONTOURS_BY = doc.reference_points || (doc.cosmology && doc.cosmology.reference_points) || /DR1 P1D/.test(String(doc.release || '')) ? '; Planck, DESI: Chaves-Montero et al. 2026' : '';
  const PF = doc.pivot_flight;
  m.flight = PF && isNum(PF.delta2) && isNum(PF.neff) ? { x: PF.delta2, y: PF.neff, k: isNum(PF.k_h_per_Mpc) ? PF.k_h_per_Mpc : null } : null;
  if (m.curve.label) m.foot.optional.push(`curve: ${screen(m.curve.label)}`);
  if (typeof doc.measurement_credit === 'string') m.foot.lines.push(screen(doc.measurement_credit));
  if (m.bands.fit && m.bands.fit.label) m.foot.optional.push(m.bands.fit.label);
  m.foot.optional.push(`points: ${m.points.map(p => screen(p.noteLabel)).join(' · ')}`);
  m.footCurve = oneLine(m.foot, m.curve.label ? `P(k): ${screen(m.curve.label)}` : (m.foot.lines[0] || ''));
  { const mc = /measured by\s+([^;]+?\d{4})/.exec(String(doc.measurement_credit || ''));
    m.measurers = mc ? screen(mc[1]) : null; m.credit = m.measurers ? `data: ${m.measurers}` : null; }
  m.contoursBy = CONTOURS_BY ? CONTOURS_BY.replace(/^;\s*/, '') : null;
  if (m.measurers) m.footRanges = { lines: [`${m.curve.label ? `P(k): ${screen(m.curve.label)} · ` : ''}KODIAQ-SQUAD P1D: ${m.measurers}`],
    optional: [...m.foot.optional], short: [`P(k): Planck 2018, CAMB · KODIAQ-SQUAD P1D: ${m.measurers}`, `KODIAQ-SQUAD P1D: ${m.measurers}`] };
  m.footPivot = { lines: m.pivot && m.pivot.label ? [`the pivot: ${m.pivot.label}${m.measurers ? ` · KODIAQ-SQUAD P1D: ${m.measurers}` : ''}`] : [], optional: [],
    short: m.pivot && m.pivot.label && m.measurers ? [`the pivot: ${m.pivot.label}`] : [] };
  { const cv = String((doc.bands && doc.bands.convention) || ''), m2 = /^r\s*→\s*(k = 2π\/r)/.exec(cv);
    if (m2) m.bandCaveat = `placed at ${m2[1]} (schematic)`; }
  m.footFit = { lines: typeof doc.measurement_credit === 'string' ? [screen(doc.measurement_credit)] : [], optional: [] };
  { const dn = /exact derivative, which gives n_eff ((?:about )?[\d.]+) lower/.exec(String(doc.definitions_foot || ''));
    const hisRb = m.points.find(p => p.recomputed);
    const ob = hisRb && hisRb.recomputed.omegaBh2, pb = hisRb && hisRb.recomputed.published;
    if (hisRb && isNum(ob) && pb && isNum(pb.Delta2_L) && isNum(pb.n_eff)) {
      const f3 = v => Number(v).toFixed(3).replace(/^-/, '−');
      m.recomputedNote = `recomputed: DESI's slope recipe, Ω_b h² = ${ob} as in the simulations`;
      m.recomputedShort = `recomputed: DESI's slope recipe, Ω_b h² = ${ob}`;
      m.recomputedShorts = [`${m.recomputedShort} (simulations)`, m.recomputedShort];
      const pt = /([−-]?\d*\.\d+)\s*±\s*(\d*\.\d+),\s*([−-]?\d*\.\d+)\s*±\s*(\d*\.\d+)/.exec(String(pb.text || ''));
      if (!pt) warnings.push('pk_z3: recomputed_b.published.text missing or unreadable: the published values are printed at chain precision, not as the paper prints them');
      const neg = v => v.replace(/^-/, '−');
      m.publishedNote = pt ? `published (Ho et al. 2026): Δ²_L ${pt[1]} ± ${pt[2]}, n_eff ${neg(pt[3])} ± ${pt[4]}`
        : `published (Ho et al. 2026): Δ²_L ${f3(pb.Delta2_L)} ± ${f3(pb.sigma_Delta2_L)}, n_eff ${f3(pb.n_eff)} ± ${f3(pb.sigma_n_eff)}`;
      const cr = m.credit ? ` · ${m.credit}` : '';
      const recP = `recomputed (DESI's slope recipe, Ω_b h² = ${ob})`;
      m.footFit.caveats = [`${recP}; ${m.publishedNote}${cr}`];
      m.footFit.caveatsShort = [`${recP}; ${m.publishedNote.replace(' (Ho et al. 2026)', '')}${cr}`, `${m.recomputedNote}${cr}`, `${m.recomputedShort}${cr}`, `recomputed: DESI's slope recipe${cr}`];
      m.footFit.optional.push(m.publishedNote);
      m.creditForms = m.credit ? [`${m.recomputedShort} (simulations)${cr}`, `${m.recomputedShort}${cr}`, `recomputed: DESI's slope recipe${cr}`, `recomputed${cr}`] : null;
      m.footFit.short = m.credit ? null : 'KODIAQ-SQUAD P1D: Karaçaylı et al. 2022';
      if (m.credit) { m.footFit.optional.push(...m.footFit.lines); m.footFit.lines = []; }
      const rc = (doc.recomputed_b && doc.recomputed_b.recipe) || {};
      m.footFit.optional.push(screen(`my point recomputed (the slope's definition): ${rc.species || ''}; Ω_b h² = ${ob} (the PRIYA simulations'); k⋆ = ${rc.k_star || ''}; ${rc.fit || ''}. The published values held Ω_b fixed instead, with a local derivative (V15b)`));
    } else if (dn) { m.footFit.caveats = [`slopes: DESI's fit for Planck and DESI, the exact derivative for mine (${dn[1]} lower)`]; m.footFit.short = 'KODIAQ-SQUAD P1D: Karaçaylı et al. 2022'; m.footFit.optional.push(`slopes: DESI's fitted slope for Planck and DESI; mine the exact derivative, ${dn[1]} lower on the same curve`); }
    const his = doc.series.find(q => typeof q.prior_caveat === 'string');
    const pc = his && /n_P = ([\d.]+) ± ([\d.]+) against a wall at ([\d.]+)/.exec(his.prior_caveat);
    const sec = /Ho et al\. (\d{4}) Sec\. (\d+\.\d+)/.exec(JSON.stringify(doc));
    if (pc && sec) m.footPrior = { lines: [...m.footFit.lines], optional: [...(m.footFit.caveats || []), ...m.footFit.optional],
      caveats: [`prior: Ho et al. ${sec[1]} §${sec[2]}; n_P = ${pc[1]} ± ${pc[2]} against a prior wall at ${pc[3]}`],
      short: m.creditForms || (m.recomputedShort ? m.recomputedShorts : dn ? `slopes: mine the exact derivative (${dn[1]} lower than DESI's fit)` : null) };
    if (m.recomputedNote) { m.footPrior.optional.push(m.recomputedNote, m.publishedNote); m.slopesShort = m.recomputedNote; }
    else if (dn) m.slopesShort = `slopes: mine the exact derivative (${dn[1]} lower than DESI's fit)`; }
  return m;
}

function gauss(o) {
  return o && isNum(o.alpha_par) && isNum(o.alpha_perp) && isNum(o.sigma_par) && isNum(o.sigma_perp)
    ? { x: o.alpha_perp, y: o.alpha_par, sx: o.sigma_perp, sy: o.sigma_par, rho: isNum(o.rho) ? o.rho : 0 } : null;
}
function adaptRuler(doc, warnings) {
  const m = base(doc);
  const S = doc.series;
  const data = S.find(s => Array.isArray(s.s) && Array.isArray(s.s2xi0) && Array.isArray(s.s2xi0_err));
  const fit = S.find(s => s.chain && Array.isArray(s.chain.alpha_par));
  need(data, 'ruler_lrg: no ξ multipole data (s, s2xi0, s2xi0_err)');
  need(fit, 'ruler_lrg: no chain (series with chain.alpha_par[])');
  const C = fit.chain, n = Math.min(C.alpha_par.length, C.alpha_perp.length);
  need(n >= 2, 'ruler_lrg: the chain is empty');
  m.data = { s: data.s, xi0: data.s2xi0, e0: data.s2xi0_err, xi2: data.s2xi2 || null, e2: data.s2xi2_err || null, label: screen(data.label || ''),
    sUnit: data.units && data.units.s ? String(data.units.s).split(/\s+\(/)[0] : 'h^{−1} Mpc', xiUnit: data.units && data.units.s2xi ? String(data.units.s2xi) : 'h^{−2} Mpc^2' };
  m.chain = { par: C.alpha_par.slice(0, n), perp: C.alpha_perp.slice(0, n), n, walk: Math.max(1, Math.min(n - 1, isNum(C.first_samples_are_the_walk) ? C.first_samples_are_the_walk : Math.round(0.1 * n))) };
  m.keys = (fit.key_curves || []).filter(k => isNum(k.i) && Array.isArray(k.s2xi0)).sort((a, b) => a.i - b.i).map(k => ({ i: k.i, xi0: k.s2xi0, xi2: k.s2xi2 || null }));
  need(m.keys.length >= 2, 'ruler_lrg: needs key_curves (the model at key samples) to draw the moving template');
  m.best = fit.best && Array.isArray(fit.best.s2xi0) ? { xi0: fit.best.s2xi0, xi2: fit.best.s2xi2 || null } : null;
  if (fit.contours && typeof fit.contours === 'object') {
    const keys = Object.keys(fit.contours).sort((a, b) => parseFloat(a) - parseFloat(b));
    m.oursLevels = keys.map(k => `${k}%`);
    m.ours = keys.map(k => closePieces(fit.contours[k], [1, 1]));
    const pts = m.ours[0].flat(), mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const P = fit.posterior || {};
    if (isNum(P.alpha_perp) && isNum(P.alpha_par) && Math.abs(mx - P.alpha_par) < Math.abs(mx - P.alpha_perp)) {
      m.ours = m.ours.map(set => set.map(L => L.map(([a, b]) => [b, a])));
      warnings.push('ruler_lrg: our contours were (α∥, α⊥); swapped to (α⊥, α∥)');
    }
  } else m.ours = null;
  m.oursLabel = screen(fit.label || '');
  const pub = S.find(s => /published/i.test(s.id || '') && !/lya/i.test(s.id || '') && (s.syst || s.stat_only));
  m.published = pub ? { g: gauss(pub.syst || pub.stat_only), label: screen(pub.label || '') } : null;
  const lya = S.find(s => /lya/i.test(s.id || '') && s.dr2);
  m.lya = lya && gauss(lya.dr2) ? { g: gauss(lya.dr2), label: screen(lya.label || ''), release: lya.dr2.release || '', z: isNum(lya.dr2.z_eff) ? lya.dr2.z_eff : null, cite: screen(lya.dr2.cite || '') } : null;
  m.post = fit.posterior && isNum(fit.posterior.alpha_par) && isNum(fit.posterior.alpha_perp) ? { par: fit.posterior.alpha_par, perp: fit.posterior.alpha_perp } : null;
  const SH = doc.sound_horizon || {};
  const fidRd = [lya && lya.dr2 && lya.dr2.fid, pub && (pub.fid || (pub.syst && pub.syst.fid))].map(f => f && f.rd_Mpc).find(isNum);
  m.rd = {
    Mpc: [SH.rd_Mpc, SH.r_d_Mpc].find(isNum) ?? fidRd ?? null,
    h: isNum(SH.h) ? SH.h : null,
    hMpc: [SH.rd_h_inv_Mpc, SH.r_d_h_inv_Mpc].find(isNum) ?? null,
    labels: Array.isArray(SH.labels) ? SH.labels.map(screen) : null,
  };
  m.foot = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
  if (doc.on_screen_tag) m.foot.lines.push(screen(doc.on_screen_tag));
  if (m.data.label) m.foot.lines.push(`data: ${m.data.label}`);
  {
    const vac = (doc.sources || []).some(x => /\/vac\//.test(String(x.source_url || '')));
    const tpl = S.find(x => /template/i.test(String(x.id || '')) && x.kind === 'computed');
    const what = (m.data.label.match(/^DESI DR\d \w+/) || [m.data.label])[0];
    m.foot0 = { lines: [`data: ${what} ξ${vac ? ' (public VAC)' : ''}${tpl ? ` · curve: BAO template (${/CAMB/.test(tpl.label || '') ? 'CAMB, ' : ''}computed)` : ''}`], optional: [] };
  }
  m.ringFoot = { lines: [`ring: a circle of the true r_d as each (α∥, α⊥) would show it, along the line of sight (up) ∝ 1/α∥, across ∝ 1/α⊥; its departure from the dashed circle × ${CONSTANTS.display.ring_exaggeration}`] };
  if (Array.isArray(doc.physics_notes) && doc.physics_notes[0]) m.foot.optional.push(screen(doc.physics_notes[0]));
  if (m.data.xi2) m.foot.optional.push('the fit uses both multipoles: ξ₀ (drawn) and ξ₂, along against across (not drawn)');
  return m;
}

function adaptFullShape(doc, warnings) {
  const m = base(doc);
  const ax = doc.axes || {};
  const geo = doc.series.find(s => s.panel === 'geometry');
  const ref = doc.series.find(s => s.panel === 'geometry_reference');
  need(geo && Array.isArray(geo.points), 'full_shape: no geometry panel');
  m.x = axis(ax.x, 'z', 'full_shape', 'x');
  const refName = ref && ref.label ? screen(String(ref.label).split(/\s+D_M/)[0]) : null;
  const pt = (p, q) => {
    const mm = measurement(p[q]);
    return mm && mm.b ? { id: p.id, label: screen(String(p.label || p.id)), z: p.z_eff, y: mm.v, err: mm.b, tracer: tracerKey(p.id), release: p.release || '' } : null;
  };
  const gpts = geo.points.filter(p => !p.omit && !p.optional && isNum(p.z_eff));
  m.geo = {
    label: refName ? `shape, across ÷ along: D_M/D_H ÷ ${refName}` : (ax.geometry_y && ax.geometry_y.label) || 'shape, across ÷ along: D_M/D_H',
    axisLabel: refName ? `D_M/D_H ÷ ${refName.replace(/\s+\d{4}\b/, '')}` : 'D_M/D_H', gloss: 'shape, across ÷ along',
    points: gpts.filter(p => !p.highlight && !p.ghost).map(p => pt(p, 'ratio_to_planck2018')).filter(Boolean),
    lyaFS: (() => { const p = gpts.find(q => q.highlight); return p ? { ...pt(p, 'ratio_to_planck2018'), precision: p.precision || null, group: p.my_group || null } : null; })(),
    lyaBAO: (() => { const p = gpts.find(q => q.ghost), d = p && p.DM_over_DH;
      return p ? { ...pt(p, 'ratio_to_planck2018'), precision: d && isNum(d.value) && isNum(d.sigma) ? `${(100 * d.sigma / d.value).toFixed(1)}%` : null } : null; })(),
  };
  need(m.geo.points.length, 'full_shape: no geometry points with ratio_to_planck2018');
  m.growth = null;
  if (!m.x.range) m.x.range = [0, Math.ceil(Math.max(...gpts.map(p => p.z_eff)) * 1.1 * 2) / 2];
  const all = [...m.geo.points, m.geo.lyaFS, m.geo.lyaBAO].filter(Boolean);
  const half = 1.15 * Math.max(...all.map(p => Math.max(Math.abs(p.err[0] - 1), Math.abs(p.err[1] - 1))));
  const st = 10 ** Math.floor(Math.log10(half) - 0.3);
  m.geo.range = [1 - Math.ceil(half / st) * st, 1 + Math.ceil(half / st) * st];
  if (m.growth) {
    const v = [...m.growth.points.flatMap(p => p.err), ...(m.growth.curve ? m.growth.curve.y.filter((_, i) => m.growth.curve.z[i] <= m.x.range[1]) : [])];
    const lo = Math.min(...v), hi = Math.max(...v), pd = 0.12 * (hi - lo);
    m.growth.range = [lo - pd, hi + pd];
  }
  m.lyaGroup = doc.labels && doc.labels.lya_highlight ? screen(doc.labels.lya_highlight) : null;
  m.foot = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
  if (doc.labels && doc.labels.releases) {
    const rel = screen(doc.labels.releases), parts = rel.split(/;\s*/);
    m.foot.lines.push(parts.slice(0, 2).join('; '));
    if (parts.length > 2) m.foot.optional.push(parts.slice(2).join('; '));
  }
  if (m.growth && m.growth.curve && m.growth.curve.label) m.foot.optional.push(`curve: ${m.growth.curve.label}`);
  if (m.growth && m.growth.note) m.foot.optional.push(`growth: ${m.growth.note}`);
  if (m.lyaGroup) m.foot.optional.push(`Lyα full shape: ${m.lyaGroup}`);
  if (/^z$/.test(String(m.x.label).trim())) m.x.label = 'redshift z';
  return m;
}

function adaptXi(doc, warnings) {
  const xiCite = typeof doc.cite === 'string' ? screen(doc.cite) : '';
  const m = base(doc);
  const ax = doc.axes || {};
  m.x = axis(ax.x, 's [h^{−1} Mpc]', 'xi_tracers', 'x');
  m.yLabel = `clustering × s², ${screen((ax.y && ax.y.label) || 's^2 ξ_0').replace(/\s*\[[^\]]*\]\s*$/, '')}`;
  m.yNote = ax.y && ax.y.note ? screen(ax.y.note) : null;
  if (m.yNote && /\(bias\)\s*$/.test(m.yNote)) {
    m.yNotes = [m.yNote.replace(/\(bias\)\s*$/, '(each tracer clusters differently)'), m.yNote.replace(/ between rows \(bias\)\s*$/, ': each tracer clusters differently'),
      m.yNote.replace(/ between rows \(bias\)\s*$/, ': tracers cluster differently'), m.yNote];
    m.yNote = m.yNotes[0];
  } else if (m.yNote) m.yNotes = [m.yNote];
  const order = Array.isArray(doc.strip_order) ? doc.strip_order : doc.series.map(s => s.id);
  const omit = new Set(doc.omit_by_default || []);
  const byId = Object.fromEntries(doc.series.map(s => [s.id, s]));
  m.panels = [];
  for (const id of order) {
    const s = byId[id];
    if (!s || omit.has(id) || s.used_in_cosmology === false) continue;
    if (s.data && Array.isArray(s.data.s)) {
      m.panels.push({ id, label: screen(String(s.label || id)), z: isNum(s.z_eff) ? s.z_eff : null, tracer: tracerKey(id), lya: false,
        x: s.data.s, y: s.data.s2xi0, e: s.data.s2xi0_err || null, fx: s.best_fit ? s.best_fit.s : null, fy: s.best_fit ? s.best_fit.s2xi0 : null, ylim: null });
    } else if (s.auto || s.cross) {
      const names = String(s.label || '').split(/\s+and\s+/).map(t => screen(t.split(/\s+\(/)[0]));
      [['auto', 0], ['cross', 1]].forEach(([k, i]) => {
        const W = s[k];
        if (!W || !Array.isArray(W.r)) return;
        m.panels.push({ id: `${id}_${k}`, label: names[i] || k, z: isNum(s.z_eff) ? s.z_eff : null, tracer: 'LYA', lya: true,
          x: W.r, y: W.value, e: W.err || null, fx: W.model ? W.r : null, fy: W.model || null,
          ylim: s.notebook_ylim && Array.isArray(s.notebook_ylim[k]) ? s.notebook_ylim[k] : null });
      });
      if (s.display_only) m.lyaNote = screen(String(s.display_only));
      m.lyaYLabel = `Lyα: r^2 ξ, one compressed wedge (display)`;
    }
  }
  need(m.panels.length, 'xi_tracers: no panels');
  if (!m.x.range) m.x.range = [50, 150];
  const peaks = m.panels.filter(p => !p.lya && p.fx && p.fy).map(p => {
    let b = -1, bi = -1;
    p.fx.forEach((x, i) => { if (x > 85 && x < 125 && (bi < 0 || p.fy[i] > b)) { b = p.fy[i]; bi = i; } });
    return bi >= 0 ? p.fx[bi] : null;
  }).filter(isNum);
  m.guide = peaks.length ? peaks.reduce((a, b) => a + b, 0) / peaks.length : null;
  m.foot = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
  if (doc.on_screen_tag) m.foot.lines.push(screen(doc.on_screen_tag));
  if (m.yNote) m.foot.lines.push(`${m.yNote}; Lyα: ${m.lyaNote || 'display only'}`);
  else if (m.lyaNote) m.foot.lines.push(`Lyα: ${m.lyaNote}`);
  m.cite = xiCite;
  return m;
}

function adaptAbsorbers(doc, warnings) {
  const m = base(doc);
  const P = id => doc.series.find(s => s.panel === id);
  const xi = P('model_xi'), p1d = P('model_p1d'), cos = P('cosmology'), find = P('find');
  if (xi && Array.isArray(xi.r) && xi.wedges) {
    m.xi = { r: xi.r, label: screen(xi.label || ''), tag: screen(xi.tag || ''), paramSource: xi.parameters && typeof xi.parameters.source === 'string' ? screen(xi.parameters.source) : null, xUnit: xi.units && xi.units.r ? xi.units.r : 'h^{−1} Mpc', yLabel: xi.units && xi.units.y ? screen(xi.units.y) : 'r^2 ξ',
      wedges: Object.entries(xi.wedges).filter(([, w]) => Array.isArray(w.with_hcd) && Array.isArray(w.without_hcd)).map(([k, w]) => ({ key: k, mu: k.split('-'), with: w.with_hcd, without: w.without_hcd })) };
    need(m.xi.wedges.length, 'absorbers: model_xi has no wedges with with_hcd and without_hcd');
  } else m.xi = null;
  if (p1d && Array.isArray(p1d.k_s_per_km)) {
    const curve = (o, id) => (o && Array.isArray(o.factor) ? { id, f: o.factor, tag: screen(o.tag || '') } : null);
    m.p1d = { k: p1d.k_s_per_km, z: isNum(p1d.z) ? p1d.z : null, label: screen(p1d.label || ''),
      curves: [curve(p1d.all_hcd, 'all'), curve(p1d.dla_masked, 'masked'), curve(p1d.desi_dr1_residual, 'residual')].filter(Boolean) };
  } else m.p1d = null;
  if (cos && cos.runs) {
    const drawn = Object.entries(cos.runs).filter(([, r]) => !r.optional && r.contours);
    const hasB = r0 => !!(r0.b && r0.b.contours && Array.isArray(r0.b.mean));
    const useB = drawn.length > 0 && drawn.every(([, r0]) => hasB(r0));
    if (!useB && drawn.some(([, r0]) => hasB(r0))) warnings.push(`absorbers: definition mix: ${drawn.filter(([, r0]) => !hasB(r0)).map(([id]) => id).join(', ')} without a recomputed (b) block while others have one; every run drawn in the published definition instead (rerun cosmo_his_points_b.py)`);
    const runs = drawn.map(([id, r0]) => {
      const r = useB ? { ...r0, contours: r0.b.contours, mean: r0.b.mean } : r0;
      const keys = Object.keys(r.contours).sort((a, b) => parseFloat(a) - parseFloat(b));
      return { id, label: screen(r.label || id), loops: keys.map(k => closePieces(r.contours[k], [1, 1])), levels: keys.map(k => `${k}%`), mean: r.mean || null, fiducial: /datacorrz$|per_redshift/.test(id) && !/llssub/.test(id), recomputed: useB };
    });
    const ref = cos.reference_points || {};
    const nameOf = (o, key) => screen(o.label || key.split('_').map(w => (w === 'planck' ? 'Planck' : w.toUpperCase())).join(' '));
    const g = (o, key) => (o && isNum(o.Delta2_L) && isNum(o.n_eff) ? { x: o.Delta2_L, y: o.n_eff, sx: o.sigma, sy: o.sigma_n, rho: isNum(o.rho) ? o.rho : 0, label: nameOf(o, key), labelFull: screen(o.label_full || o.label || '') } : null);
    const W = cos.if_we_didnt;
    m.cosmo = { runs, label: screen(cos.label || ''), message: screen(cos.message || ''), note: screen(cos.chains_note || ''),
      planck: g(ref.planck, 'planck'), desi: g(ref.desi_dr1_p1d, 'desi_dr1_p1d'),
      shift: W && Array.isArray(W.from) && Array.isArray(W.to) ? { from: W.from, to: W.to, label: screen(W.label || ''), dchi2: isNum(W.delta_chi2) ? W.delta_chi2 : null, source: screen(W.source || '') } : null };
  } else m.cosmo = null;
  m.findLabel = find && find.label ? screen(find.label) : null;
  m.footModel = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
  if (m.xi && m.xi.tag) m.footModel.lines.push(`ξ: ${m.xi.label} · ${m.xi.tag}`);
  if (m.p1d) { const all = m.p1d.curves.find(c => c.id === 'all'); if (all && all.tag) m.footModel.lines.push(`P1D: ${all.tag}`); const res = m.p1d.curves.find(c => c.id === 'residual'); if (res && res.tag) m.footModel.optional.push(res.tag); }
  {
    const all = m.p1d && m.p1d.curves.find(c => c.id === 'all'), cite = all && /\(([^()]*\d{4})\)/.exec(all.tag || '');
    const ps = m.xi && m.xi.paramSource && /^(DR\d [IV]+)\b.*?(Table \d+)/.exec(m.xi.paramSource);
    m.footModel = oneLine(m.footModel, `ξ: computed by us from DESI DR2's published HCD model and parameters${ps ? ` (${ps[1]} ${ps[2]})` : ''}${cite ? ` · P1D: absorber template of ${cite[1]}` : ''}`);
  }
  m.footCosmo = { lines: m.placeholder ? [m.foot.lines[0]] : [], optional: [] };
  if (m.cosmo && m.cosmo.note) m.footCosmo.lines.push(m.cosmo.note.split(/;\s+/)[0]);
  m.footCosmoShift = m.cosmo && m.cosmo.shift ? { lines: [`DESI's test "HCD: only DLAs": ${m.cosmo.shift.source}`],
    optional: [`${m.cosmo.shift.label}: ${m.cosmo.shift.source}${m.cosmo.shift.dchi2 !== null ? `; Δχ² = ${m.cosmo.shift.dchi2}` : ''}`] } : null;
  if (m.cosmo && m.cosmo.message) m.footCosmo.optional.push(m.cosmo.message);
  if (m.cosmo && m.cosmo.planck && m.cosmo.planck.labelFull && m.cosmo.planck.labelFull !== m.cosmo.planck.label) m.footCosmo.optional.push(`Planck: ${m.cosmo.planck.labelFull}`);
  return m;
}

function adaptSeparations(doc, warnings) {
  const m = base(doc);
  const ax = (doc.axes && doc.axes.x) || {};
  m.rows = doc.series.filter(s => isNum(s.value_h_Mpc)).map(s => {
    const range = Array.isArray(s.range_h_Mpc) && s.range_h_Mpc.every(isNum) ? s.range_h_Mpc : null;
    const dot = !range || typeof s.value_note === 'string';
    const text = !dot ? `${range[0].toPrecision(2)}–${range[1].toPrecision(2)}` : s.group === 'context' ? `about ${s.value_h_Mpc.toPrecision(2)}` : s.value_h_Mpc.toPrecision(3);
    const cite = [...String(s.source || '').matchAll(/\b([A-Z][A-Za-z-]+(?: et al\.| & [A-Z][A-Za-z-]+)?) ((?:19|20)\d\d)\b/g)]
      .map(q => ({ who: q[1], year: +q[2] })).filter((c, i, a) => a.findIndex(d => d.who === c.who && d.year === c.year) === i).sort((a, b) => a.year - b.year);
    return { id: s.id, group: s.group || 'other', label: screen(shortLabel(s.label || s.id)), v: s.value_h_Mpc, range, text, dot, optional: s.optional === true, cite };
  });
  need(m.rows.some(r => r.group === 'galaxies') && m.rows.some(r => r.group === 'forest'), 'separations: needs galaxy and forest rows');
  const all = m.rows.flatMap(r => [r.v, ...(r.range || [])]);
  const range = Array.isArray(ax.display_range) && ax.display_range.every(isNum) ? ax.display_range
    : [10 ** Math.floor(Math.log10(Math.min(...all))), 10 ** Math.ceil(Math.log10(Math.max(...all)))];
  m.x = { label: screen(ax.label || 'comoving separation [h^{−1} Mpc]'), range, log: true };
  const cap = Array.isArray(doc.on_screen_suggestion) ? doc.on_screen_suggestion.map(screen) : [];
  m.captions = { galaxies: cap.find(c => /galax/i.test(c.split(':')[0])) || null, forest: cap.find(c => /forest/i.test(c.split(':')[0])) || null };
  const line = m.rows.find(r => r.group === 'forest' && r.range && !r.dot);
  if (m.captions.forest && line) m.captions.forest = m.captions.forest.replace(/one line\s*≈\s*[\d.]+\s*(h⁻¹ Mpc|h\^\{−1\} Mpc)\s*wide/, `one line ${line.text} $1 wide`);
  const sn = doc.sampling_note;
  m.samplingNote = typeof sn === 'string' ? screen(sn) : sn && typeof sn.text === 'string' ? screen(sn.text) : sn && Array.isArray(sn.lines) ? screen(sn.lines.join(' ')) : null;
  const res = doc.series.find(x => /resolution/i.test(String(x.id || '')) && typeof x.note === 'string');
  m.resolutionNote = res ? screen(res.note.split(/,\s+and\s+/)[0]).replace(/\.$/, '') : null;
  if (!m.resolutionNote) warnings.push('separations: the resolution row has no note (the instrument clause is not drawn)');
  m.foot.lines = m.foot.lines.map(L => L.replace(/\bline widths\b/, 'dip widths'));
  if (m.samplingNote) m.foot.optional.push(m.samplingNote);
  if (m.resolutionNote) m.foot.optional.push(m.resolutionNote);
  const rules = Array.isArray(doc.display_rules) ? doc.display_rules : [];
  m.foot.optional.push(...rules.filter(r => /across the sky/.test(r))
    .map(r => screen(r.replace(/\s*\((?:say|e\.g\.)\b[^)]*\)/gi, '').replace(/\s*\([^)]*_[^)]*\)/g, ''))));
  return m;
}

const twoParts = l => { const t = screen(String(l || '')), i = t.indexOf(': '); return i > 0 ? [t.slice(0, i), t.slice(i + 2)] : [t, '']; };
const shorter = ([a, b]) => [a, String(b).replace(/^DESI DR2 \+ CMB /, '').replace(/\s*\(95%\)$/, '').replace(/,\s*95%\)$/, ')')];
const neutrinoName = (s, doc) => {
  const ms = doc.series.filter(q => isNum(q.mnu_eV)).map(q => q.mnu_eV), [a, b] = shorter(twoParts(s.label));
  return [`${s.mnu_eV <= Math.min(...ms) ? 'lighter' : 'heavier'} neutrinos, ${a}`, b];
};
function adaptWhy(doc, warnings) {
  const m = base(doc);
  const ax = doc.axes || {};
  m.x = axis({ ...ax.x, log: true }, FALLBACK_LABELS.pk_z3.x, 'why', 'x');
  m.y = axis(ax.y, 'ratio', 'why', 'y');
  m.y.label = String(m.y.label).replace(/^total-matter P\(k\) relative to /, 'P(k) ÷ ');
  { const zm = /,\s*z = ([\d.]+)\s*$/.exec(m.y.label);
    m.y.axis = m.y.label.replace(/\s+\([^)]*\)/g, '').replace(/,\s*z = [\d.]+\s*$/, '');
    m.zText = zm ? `z = ${zm[1]}` : null; }
  const curve = s => (Array.isArray(s.k_h_per_Mpc) && Array.isArray(s.ratio) && s.k_h_per_Mpc.length === s.ratio.length ? { k: s.k_h_per_Mpc, r: s.ratio } : null);
  m.nu = doc.series.filter(s => s.group === 'neutrinos' && curve(s) && isNum(s.mnu_eV)).sort((a, b) => a.mnu_eV - b.mnu_eV)
    .map(s => ({ id: s.id, ...curve(s), mnu: s.mnu_eV, label: LW ? neutrinoName(s, doc) : shorter(twoParts(s.label)), drawnInLCDM: /drawn on the ΛCDM background/.test(String(s.note || '')), tag: `${s.mnu_eV} eV`, note: s.note ? screen(s.note) : null }));
  const w = doc.series.find(s => /warm/.test(s.group || ''));
  const kmaxFit = w && isNum(w.valid_k_max_h_Mpc) ? w.valid_k_max_h_Mpc : null;
  m.wdm = null;
  const baseK = m.nu[0].k;
  const seqOf = (raw, keys) => {
    const list = Array.isArray(raw) ? raw : raw && (raw.entries || raw.frames || raw.curves || raw.sequence || raw.models);
    if (!Array.isArray(list)) return null;
    const k0 = raw && !Array.isArray(raw) && Array.isArray(raw.k_h_per_Mpc) ? raw.k_h_per_Mpc : baseK;
    const frames = list.map(f => {
      const mass = keys.map(key => f && f[key]).find(isNum), r = f && (Array.isArray(f.ratio) ? f.ratio : Array.isArray(f.T2) ? f.T2 : null);
      const k = f && Array.isArray(f.k_h_per_Mpc) ? f.k_h_per_Mpc : k0;
      return isNum(mass) && r && Array.isArray(k) && r.length === k.length ? { m: mass, k, r } : null;
    }).filter(Boolean).sort((a, b) => a.m - b.m);
    if (frames.length < 2) return null;
    const obj = raw && !Array.isArray(raw) ? raw : {};
    const kmax = isNum(obj.valid_k_max_h_Mpc) ? obj.valid_k_max_h_Mpc : null;
    const tpl = typeof obj.frame_label === 'string' ? screen(obj.frame_label) : null;
    return { frames, kmax, tpl, convention: typeof obj.convention === 'string' ? screen(obj.convention) : null, validNote: typeof obj.valid_note === 'string' ? screen(obj.valid_note) : null };
  };
  const massOf = (v, keys) => (isNum(v) ? v : v && typeof v === 'object' ? keys.map(k => v[k]).find(isNum) : null);
  const textOf = v => (v && typeof v === 'object' ? (typeof v.label === 'string' ? v.label : typeof v.text === 'string' ? v.text : typeof v.note === 'string' ? v.note : null) : null);
  m.nuSeq = seqOf(doc.nu_sequence, ['mnu_eV', 'mass_eV', 'm_eV', 'mnu', 'm']);
  m.wdmSeq = seqOf(doc.wdm_sequence, ['m_keV', 'mass_keV', 'm']);
  const lim = doc.wdm_limit, cons = doc.wdm_conservative, ex = doc.wdm_excluded_start;
  const limM = massOf(lim, ['m_keV', 'value_keV', 'mass_keV']);
  m.wdmLimit = isNum(limM) ? { m: limM, label: textOf(lim) ? twoParts(textOf(lim)) : null, kmax: lim && isNum(lim.valid_k_max_h_Mpc) ? lim.valid_k_max_h_Mpc : null } : null;
  const consM = massOf(cons, ['m_keV', 'value_keV', 'mass_keV']);
  m.wdmConservative = isNum(consM) ? { m: consM, text: textOf(cons) ? screen(textOf(cons)) : null } : null;
  const exM = massOf(ex, ['m_keV', 'value_keV', 'mass_keV']);
  m.wdmExcluded = isNum(exM) ? { m: exM, label: textOf(ex) ? screen(textOf(ex)) : null } : null;
  m.wdmKmax = (m.wdmSeq && m.wdmSeq.kmax) || (m.wdmLimit && m.wdmLimit.kmax) || kmaxFit;
  m.wdmValidNote = w && w.valid_note ? screen(w.valid_note) : null;
  need(m.nu.length, 'why: no neutrino curves');
  const R = doc.reference || {};
  m.reference = isNum(R.y) ? { y: R.y, label: shortLabel(screen(R.label || '')) } : null;
  const K = doc.marks || {};
  m.pivot = K.pivot && isNum(K.pivot.k_h_per_Mpc) ? { k: K.pivot.k_h_per_Mpc, label: screen(K.pivot.label || '') } : null;
  m.edge = K.band_edge && isNum(K.band_edge.k_h_per_Mpc) ? { k: K.band_edge.k_h_per_Mpc, label: oxford(screen(K.band_edge.label || '')) } : null;
  const KR = K.k_ranges && Array.isArray(K.k_ranges.bars) ? K.k_ranges.bars.filter(b => b && Array.isArray(b.k_h_per_Mpc) && b.k_h_per_Mpc.every(isNum)) : [];
  m.kBars = KR.length ? { bars: KR.map(b => ({ id: b.id, name: screen(b.name || b.id), cite: b.cite ? screen(b.cite) : null, his: !!b.his, k: b.k_h_per_Mpc })),
    note: K.k_ranges.note ? screen(K.k_ranges.note) : null } : null;
  if (!m.kBars) warnings.push('why: no marks.k_ranges: the k-range bars are not drawn');
  if (!m.x.range) m.x.range = [Math.min(...m.nu[0].k), Math.max(...m.nu[0].k)];
  if (!m.y.range) m.y.range = [Math.min(...m.nu.flatMap(n => n.r)), Math.max(...m.nu.flatMap(n => n.r))];
  const nuCite = ((doc.series || []).find(s => s && s.bound && typeof s.bound.cite === 'string') || {}).bound;
  const NU_BY = nuCite ? screen(nuCite.cite).replace(/\s*\(DR2 II\)$/, '') : null;
  if (!NU_BY) warnings.push('why: no "cite" on the neutrino bounds: their paper is not named on the slide');
  m.foot = { lines: [], optional: [] };
  if (doc.on_screen_tag) {
    const tag = screen(doc.on_screen_tag), cl = tag.split(/;\s+/), keep = cl.filter(c => !/\bWDM\b|warm dark matter/i.test(c));
    const ref = /^computed by us: CAMB\b/.exec(tag), row = ref ? ref[0] : keep.length && keep.length < cl.length ? keep.join('; ') : tag;
    m.foot.lines.push(...(ref && K.k_ranges && K.k_ranges.note ? [`${row} · ${screen(K.k_ranges.note)}`, row] : [row]));
    if (row !== tag) m.foot.optional.push(tag);
  }
  const conv = String((doc.nu_sequence && doc.nu_sequence.convention) || (doc.series || []).map(x => x && x.y_is).find(Boolean) || '');
  const fixed = /fixed ([^;()]+?)(?=\s*\(|;|$)/.exec(conv), C = doc.cosmology || {};
  if (fixed) {
    const ver = C.camb_version ? `CAMB ${C.camb_version}` : 'CAMB';
    const om = isNum(C.omegam_fixed) ? `; Ω_m = ${C.omegam_fixed.toFixed(3)}` : '';
    m.foot.lines.push(`every curve: ${ver}, total-matter P(k) at z = 3, with ${fixed[1].trim().replace(/,\s*([^,]+)$/, ' and $1')} fixed at Planck 2018 (DESI's fiducial${om})`);
    m.fixedNote = 'Σm_ν varied at fixed Ω_m, h, A_s';
  } else warnings.push('why: no "fixed …" parameter list in nu_sequence.convention or series y_is');
  { const cv = doc.marks && doc.marks.band_edge && doc.marks.band_edge.convention;
    if (typeof cv === 'string' && /2π\/r/.test(cv)) m.bandCaveat = `placed at ${screen(cv).replace(/\s*\(schematic\)/, '')} (schematic)`; }
  m.footNu = { lines: [], optional: [] };
  const n2 = m.nu.find(n => n.note);
  if (n2) m.footNu.lines.push(`${n2.tag}: ${n2.note}`);
  m.footWdm = { lines: [], optional: [] };
  if (typeof doc.wdm_foot === 'string') {
    const parts = screen(doc.wdm_foot).split(/(?<!\bal)(?<=\.)\s+(?=[A-Z])/);
    m.footWdm.lines.push(parts[0].replace(/\.$/, ''));
    if (parts.length > 1) m.footWdm.optional.push(parts.slice(1).join(' ').replace(/\.$/, ''));
  } else if (m.wdmConservative && m.wdmConservative.text) m.footWdm.lines.push(m.wdmConservative.text);
  if (m.wdmSeq && (m.wdmSeq.validNote || m.wdmValidNote)) m.footWdm.optional.push(`warm dark matter: ${m.wdmSeq.validNote || m.wdmValidNote}`);
  if (m.reference && R.label) m.foot.optional.push(`reference: ${screen(R.label)}`);
  m.foot = oneLine(m.foot, m.foot.lines[0] || '');
  if (m.fixedNote) m.footNuCaveat = { lines: [...m.foot.lines], optional: [...(m.foot.optional || [])],
    caveats: [`${m.fixedNote}${m.nu.some(n => n.drawnInLCDM) ? '; the w_{0}w_a bound drawn in ΛCDM' : ''}`],
    short: NU_BY ? [`Σm_ν limits: ${NU_BY} (DR2 II) · computed by us: CAMB`, `Σm_ν limits: ${NU_BY}`, 'computed by us: CAMB'] : 'computed by us: CAMB' };
  { const src = [...new Set(doc.series.filter(s => s.group === 'neutrinos' && s.bound && typeof s.bound.data === 'string').map(s => screen(s.bound.data)))];
    if (src.length === 1 && src[0]) {
      m.nuSource = `${m.nu.length > 1 ? 'both limits' : 'limit'}: ${src[0]}`;
      if (m.footNuCaveat) m.footNuSource = { ...m.footNuCaveat, short: [...(NU_BY ? [`Σm_ν limits: ${NU_BY} (DR2 II); WDM: Viel et al. 2005, Iršič et al. 2024`, `Σm_ν limits: ${NU_BY}; WDM: Viel et al. 2005, Iršič et al. 2024`,
        `Σm_ν limits: ${NU_BY}; WDM: Iršič et al. 2024`] : []),
        `Σm_ν limits: ${src[0]}; WDM: Viel et al. 2005, Iršič et al. 2024`, `Σm_ν limits: ${src[0]}; WDM: Iršič et al. 2024`, `Σm_ν limits: ${src[0]}`] };
    } else warnings.push(`why: the neutrino bounds name ${src.length ? 'different data' : 'no data'} (series[].bound.data); their source is not on screen`); }
  return m;
}

function adaptEmulator(doc, warnings) {
  const m = base(doc);
  const S = id => doc.series.find(s => s.id === id);
  const suite = S('suite'), D = S('design'), L = S('gp_line'), mf = S('mf_method');
  need(suite && suite.low_fidelity && suite.high_fidelity && isNum(suite.low_fidelity.count) && isNum(suite.high_fidelity.count), 'emulator: no suite counts');
  need(D && D.projection && Array.isArray(D.projection.low_fidelity_xy) && Array.isArray(D.projection.high_fidelity_xy), 'emulator: no design projection');
  need(L && Array.isArray(L.Ap) && ['ratio', 'ratio_lo', 'ratio_hi', 'lf_ratio'].every(k => Array.isArray(L[k]) && L[k].length === L.Ap.length), 'emulator: gp_line arrays missing');
  const Pj = D.projection;
  if (Pj.low_fidelity_xy.length !== suite.low_fidelity.count || Pj.high_fidelity_xy.length !== suite.high_fidelity.count)
    warnings.push(`emulator: the design has ${Pj.low_fidelity_xy.length} + ${Pj.high_fidelity_xy.length} points, the suite says ${suite.low_fidelity.count} + ${suite.high_fidelity.count}`);
  const yl = Pj.y_limits, ey = Math.floor(Math.log10(Math.max(Math.abs(yl[0]), Math.abs(yl[1])))), sy = ey < -2 || ey > 3 ? 10 ** -ey : 1;
  const on = doc.on_screen || {};
  m.title = on.title ? screen(on.title) : null;
  const mine = t => String(t).replace(/\bhis\b/g, 'my').replace(/\bHis\b/g, 'My');
  m.mfLabel = mf && mf.label ? screen(mf.label) : null;
  m.lf = { n: suite.low_fidelity.count, label: screen(suite.low_fidelity.label || '') };
  m.hf = { n: suite.high_fidelity.count, label: screen(suite.high_fidelity.label || '') };
  m.caption = (Array.isArray(doc.on_screen_suggestion) ? doc.on_screen_suggestion.map(screen) : []).find(t => /simulations/.test(t)) || null;
  m.design = {
    lf: Pj.low_fidelity_xy.map(p => [p[0], p[1] * sy]), hf: Pj.high_fidelity_xy.map(p => [p[0], p[1] * sy]),
    xr: Pj.x_limits.slice(), yr: [yl[0] * sy, yl[1] * sy], yPow: sy === 1 ? null : ey,
    xSym: Pj.x_symbol || 'n_P', ySym: Pj.y_symbol || 'A_P',
    line: D.line_in_design && isNum(D.line_in_design.ns) && Array.isArray(D.line_in_design.Ap)
      ? { x: D.line_in_design.ns, y: D.line_in_design.Ap.map(v => v * sy), label: screen(D.line_in_design.label || '') } : null,
  };
  const meas = L.measurement || {};
  const la = on.line_axes || {};
  m.line = {
    Ap: L.Ap.map(v => v * sy), r: L.ratio, lo: L.ratio_lo, hi: L.ratio_hi, lf: L.lf_ratio,
    lfLabel: screen(String(L.lf_label || '').split(/\s+\(/)[0]), band: L.band ? screen(String(L.band).split(/\s+\(/)[0]) : null,
    training: (L.nearest_training || []).filter(t => isNum(t.Ap) && isNum(t.ratio_training_lf)).map(t => [t.Ap * sy, t.ratio_training_lf]),
    meas: isNum(meas.Ap_mean) && isNum(meas.Ap_sd) ? { x: meas.Ap_mean * sy, sd: meas.Ap_sd * sy, label: mine(screen(meas.label || '')) } : null,
    xLabel: la.x || m.design.ySym, yLabel: la.y ? screen(la.y) : 'P1D, relative', z: L.z, k: L.k_s_per_km,
  };
  need(m.line.training.length, 'emulator: no nearest training runs');
  if (m.design.line) {
    const fx = L.fixed_at || {}, atMean = /posterior mean/i.test(String(fx.rule || '')) && isNum((fx.values || {}).ns) && Math.abs(fx.values.ns - m.design.line.x) < 1e-3;
    m.design.line.key = atMean ? `the line of the prediction: ${m.design.xSym} at my posterior mean` : (m.design.line.label || null);
  }
  const pub = suite.public || {};
  const src = /^(.*?)\s*\(([^;)]*)/.exec(String(D.source || ''));
  m.footDesign = { lines: [mine(`${suite.kind || 'published'}: ${src ? `${src[1]} (${src[2]})` : 'the emulator\'s design'}`)], optional: [] };
  if (pub.repository) m.footDesign.lines.push(`public: ${pub.repository}${pub.licence ? ` (${pub.licence})` : ''}; trained on PRIYA simulations (Bird et al. 2023)`);
  if (suite.parameters && suite.parameters.label) m.footDesign.optional.push(screen(suite.parameters.label));
  m.footLine = { lines: [], optional: [] };
  if (on.tag || doc.on_screen_tag) m.footLine.lines.push(mine(screen(on.tag || doc.on_screen_tag)));
  const tau = L.fixed_at && L.fixed_at.values && isNum(L.fixed_at.values.tau0) ? L.fixed_at.values.tau0 : null;
  const post = /posterior\s+([\d.]+)\s*±\s*([\d.]+)/.exec(String((L.fixed_at || {}).rule || ''));
  if (tau !== null) m.footLine.lines.push(`τ0 fixed at a training value (${tau.toFixed(3)}${post ? `; my posterior ${post[1]} ± ${post[2]}` : ''}); the other parameters at my posterior means`);
  if (L.not_included) m.footLine.lines.push('the line is the emulator alone: no resolution correction, no absorber templates');
  m.footLine.optional.push(screen(String(L.nearest_note || '').split(/;\s*/)[0]));
  m.foot = m.footDesign;
  return m;
}


function adaptEmulatorWalk(doc, warnings) {
  const m = base(doc);
  const S = Object.fromEntries((doc.series || []).map(x => [x.id, x]));
  const mine = t => String(t).replace(/\bhis\b/g, 'my').replace(/\bHis\b/g, 'My');
  const PB0 = S.posterior && S.posterior.delta2L_neff_b && S.posterior.delta2L_neff_b.contours ? S.posterior.delta2L_neff_b : null;
  const DR0 = doc.demo_run || S.demo_run;
  const allSamples = [...((S.walk && Array.isArray(S.walk.samples)) ? S.walk.samples : []), ...((DR0 && Array.isArray(DR0.samples)) ? DR0.samples : [])];
  const lackB = allSamples.filter(x => !(isNum(x.Delta2_star_b) && isNum(x.n_star_b))).length;
  if (PB0 && lackB) warnings.push(`emulator_walk: definition mix: the posterior is recomputed (delta2L_neff_b) but ${lackB} of ${allSamples.length} walk / demo samples lack Delta2_star_b, n_star_b; every element drawn in the published definition instead (rerun cosmo_his_points_b.py)`);
  const PB = PB0 && !lackB ? PB0 : null;
  const D = S.data, W = S.walk, B = S.predictive_band, PO = PB || (S.posterior && S.posterior.delta2L_neff);
  need(D && Array.isArray(D.k_s_per_km) && Array.isArray(D.kp_over_pi) && Array.isArray(D.kp_over_pi_sigma), 'emulator_walk: data.k_s_per_km / kp_over_pi / kp_over_pi_sigma missing');
  need(W && Array.isArray(W.samples) && W.samples.length > 1, 'emulator_walk: walk.samples missing');
  need(PO && PO.contours && PO.contours['68'] && PO.contours['95'], 'emulator_walk: posterior.delta2L_neff contours missing');
  const n = D.k_s_per_km.length;
  const sample = x => (isNum(x.Delta2_L) && isNum(x.n_eff) && Array.isArray(x.model_kp_over_pi) && x.model_kp_over_pi.length === n
    ? (PB && isNum(x.Delta2_star_b) && isNum(x.n_star_b) ? { x: x.Delta2_star_b, y: x.n_star_b, model: x.model_kp_over_pi } : { x: x.Delta2_L, y: x.n_eff, model: x.model_kp_over_pi }) : null);
  m.data = { k: D.k_s_per_km, y: D.kp_over_pi, s: D.kp_over_pi_sigma, z: isNum(D.z) ? D.z : null, label: screen(D.label || ''), errors: screen(D.label_errors || '') };
  m.walk = W.samples.map(sample).filter(Boolean);
  const nz = W.samples[0] && Array.isArray(W.samples[0].chi2_bins) ? W.samples[0].chi2_bins.length : null;
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  m.nRedshifts = nz; m.nWord = nz && WORDS[nz] ? WORDS[nz] : nz ? String(nz) : null;
  const DR = doc.demo_run || S.demo_run;
  const drs = DR && Array.isArray(DR.samples) ? DR.samples.map(sample).filter(Boolean) : [];
  m.demo = drs.length > 1 ? { samples: drs, label: screen(DR.label || 'ours: a short run of my likelihood from a poor start') } : null;
  if (!m.demo) warnings.push('emulator_walk: no demo_run yet (step 1 walks the chain only)');
  else m.demoNote = m.demo.label;
  const MB = B && B.model_kp_over_pi;
  m.band = MB && ['p2p5', 'p16', 'p50', 'p84', 'p97p5'].every(q => Array.isArray(MB[q]) && MB[q].length === n) ? MB : null;
  if (!m.band) warnings.push('emulator_walk: no predictive_band.model_kp_over_pi');
  const lv = Object.keys(PO.contours).sort((a, b) => parseFloat(a) - parseFloat(b));
  m.post = { loops: lv.map(k => closePieces(PO.contours[k], [1, 1])), levels: lv.map(k => `${k}%`), mean: PO.mean || null, x: `amplitude, ${PO.x || 'Δ^2_L'}`, y: `slope, ${PO.y || 'n_eff'}`, recomputed: PO === PB };
  const P = S.papers || {}, on = doc.on_screen || {};
  m.title = P.his_paper && P.his_paper.title_site ? screen(P.his_paper.title_site) : null;
  m.dataName = 'KODIAQ-SQUAD P1D at z = 3';
  const yr = P.data_paper && /\((\d{4})\)/.exec(String(P.data_paper.cite || ''));
  m.dataCite = P.data_paper && P.data_paper.cite ? `${screen(String(P.data_paper.cite).split(',')[0])}${yr ? ` ${yr[1]}` : ''}` : null;
  m.foot = { lines: [], optional: [] };
  if (on.tag) m.foot.lines.push(mine(screen(on.tag)));
  if (P.priya && P.priya.cite) m.foot.lines.push(`the emulator is trained on PRIYA simulations (${screen(String(P.priya.cite).split(',')[0])})`);
  if (m.data.label) m.foot.optional.push(m.data.label);
  if (m.data.errors) m.foot.optional.push(m.data.errors);
  if (P.his_paper && P.his_paper.cite) m.foot.optional.push(screen(P.his_paper.cite));
  if (W.label) m.foot.optional.push(`walk: ${mine(screen(W.label))} (${screen(W.rule || '')})`);
  if (m.demoNote) m.foot.optional.push(`demonstration: ${m.demoNote}`);
  const rcb = doc.recomputed_b && doc.recomputed_b.recipe;
  if (m.post.recomputed && rcb && isNum(rcb.omega_b_h2)) {
    m.foot.caveats = [`amplitude and slope recomputed: DESI's slope recipe, Ω_b h² = ${rcb.omega_b_h2} as in the simulations`];
    m.foot.short = ['computed by us with my emulator, likelihood and chain (Ho et al. 2026)', 'my emulator, likelihood and chain (Ho et al. 2026)'];
    m.foot.optional.push("the published amplitude and slope (his chains' derived columns) held Ω_b fixed instead, with a local derivative (the slope's definition)");
  }
  m.footWalk = { ...m.foot, short: ['computed by us: our demonstration run of my likelihood, then my chain (Ho et al. 2026)', 'our demonstration run, then my chain (Ho et al. 2026)'] };
  return m;
}

function adaptEmulatorTrain(doc, warnings) {
  const m = base(doc);
  const mine = t => String(t).replace(/\bhis\b/g, 'my').replace(/\bHis\b/g, 'My');
  const T = (doc.series || []).find(x => x.id === 'training_p1d');
  need(T && Array.isArray(T.k_s_per_km) && Array.isArray(T.simulations) && T.simulations.length > 1, 'emulator_train: series training_p1d with k_s_per_km and simulations missing');
  const n = T.k_s_per_km.length;
  m.k = T.k_s_per_km; m.z = isNum(T.z) ? T.z : null;
  m.sims = T.simulations.filter(x => Array.isArray(x.kp_over_pi) && x.kp_over_pi.length === n && x.kp_over_pi.every(isNum))
    .map(x => ({ id: String(x.id), hf: x.fidelity === 'HF', y: x.kp_over_pi }));
  need(m.sims.length === T.simulations.length, 'emulator_train: a simulation without kp_over_pi on the k bins');
  const on = doc.on_screen || {}, nHF = m.sims.filter(x => x.hf).length, nLF = m.sims.length - nHF;
  m.label = [`the ${m.sims.length} simulations it was trained on`, `(${nLF} cheaper, ${nHF} high-resolution,`, "at the fit's mean flux)"];
  m.foot = { lines: [], optional: [`grey: computed by us from my emulator's training set (z = ${m.z}): ${mine(screen(doc.on_screen_tag || ''))}`, screen(T.convention || '')].filter(Boolean) };
  const byId = Object.fromEntries(T.simulations.map(x => [String(x.id), x]));
  m.sims.forEach(q => { const x = byId[q.id]; q.ns = isNum(x.ns) ? x.ns : null; q.Ap = isNum(x.Ap) ? x.Ap : null; q.particles = typeof x.particles === 'string' ? x.particles : null;
    q.hfLevel = Array.isArray(x.kp_over_pi_hf_level) && x.kp_over_pi_hf_level.length === n && x.kp_over_pi_hf_level.every(isNum) ? x.kp_over_pi_hf_level : null; });
  m.nParams = Array.isArray(T.param_order) ? T.param_order.length : null;
  m.symbols = Array.isArray(T.param_order) && Array.isArray(T.param_symbols) ? Object.fromEntries(T.param_order.map((p, i) => [p, T.param_symbols[i]])) : {};
  m.pairs = m.sims.filter(q => q.hf && q.ns !== null && q.Ap !== null).map(h => {
    const l = m.sims.find(q => !q.hf && q.ns !== null && Math.abs(q.ns - h.ns) <= 1e-9 * Math.abs(h.ns) && Math.abs(q.Ap / h.Ap - 1) <= 1e-9);
    return l ? { hf: h, lf: l, r: h.y.map((v, j) => v / l.y[j]) } : null;
  }).filter(Boolean);
  if (m.pairs.length !== nHF) warnings.push(`emulator_train: ${m.pairs.length} of ${nHF} high-resolution runs have a cheaper run at the same settings`);
  m.learned = m.sims.filter(q => !q.hf && q.hfLevel).map(q => ({ id: q.id, r: q.hfLevel.map((v, j) => v / q.y[j]) }));
  m.nLF = nLF; m.nHF = nHF;
  m.footRuns = { lines: [`simulated: PRIYA (Bird et al. 2023), my emulator's training set (Ho et al. 2026); P1D at z = ${m.z} with the fit's absorber and resolution factors`,
    `simulated: PRIYA (Bird et al. 2023), my emulator's training set (Ho et al. 2026)`], optional: [screen(T.convention || '')].filter(Boolean) };
  m.footLearned = { lines: [`learned: my emulator's high-resolution estimate at each cheaper run's settings ÷ that run (an emulator output, not a simulation)`,
    `learned: my emulator's high-resolution estimate ÷ each cheaper run (an emulator output)`], optional: m.footRuns.lines.slice() };
  return m;
}

function adaptEmulatorZbins(doc, warnings) {
  const m = base(doc);
  const Z = (doc.series || []).find(x => x.id === 'zbins');
  need(Z && Array.isArray(Z.k_s_per_km) && Array.isArray(Z.bins) && Z.bins.length > 1, 'emulator_zbins: series zbins (k_s_per_km, bins) missing');
  const n = Z.k_s_per_km.length, Q = ['p2p5', 'p16', 'p50', 'p84', 'p97p5'];
  const ok = b => isNum(b.z) && [b.kp_over_pi, b.kp_over_pi_sigma].every(a => Array.isArray(a) && a.length === n && a.every(isNum))
    && b.band_kp_over_pi && Q.every(q => Array.isArray(b.band_kp_over_pi[q]) && b.band_kp_over_pi[q].length === n);
  need(Z.bins.every(ok), 'emulator_zbins: a bin without data, errors or the band on the k bins');
  m.k = Z.k_s_per_km;
  m.bins = Z.bins.map(b => ({ z: b.z, y: b.kp_over_pi, s: b.kp_over_pi_sigma, band: b.band_kp_over_pi })).sort((a, b) => a.z - b.z);
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  m.nWord = WORDS[m.bins.length] || String(m.bins.length);
  const on = doc.on_screen || {}, mine = t => String(t).replace(/\bhis\b/g, 'my').replace(/\bHis\b/g, 'My');
  m.foot = { lines: [on.tag ? mine(screen(on.tag)) : composedFoot(doc), 'my emulator, likelihood and chain (Ho et al. 2026); data: Karaçaylı et al. 2022'],
    optional: [screen(Z.label_band || ''), screen(Z.convention || '')].filter(Boolean) };
  const WZ = (doc.series || []).find(x => x.id === 'walk_zbins');
  const okS = q => Array.isArray(q.model_kp_over_pi) && q.model_kp_over_pi.length === m.bins.length && q.model_kp_over_pi.every(a => Array.isArray(a) && a.length === n && a.every(isNum));
  if (WZ && Array.isArray(WZ.z) && WZ.z.every((z, j) => Math.abs(z - m.bins[j].z) < 1e-6) && [...(WZ.demo || []), ...(WZ.walk || [])].every(okS))
    m.walk = { demo: (WZ.demo || []).map(q => ({ step: q.step, models: q.model_kp_over_pi })), chain: (WZ.walk || []).map(q => ({ row: q.row, models: q.model_kp_over_pi })) };
  else { m.walk = null; warnings.push('emulator_zbins: no walk_zbins (rerun cosmo_emulator_zbins.py): the nine panels cannot follow the walk'); }
  return m;
}

function adaptSightlines(doc, warnings) {
  const m = base(doc);
  const S = Object.fromEntries((doc.series || []).map(x => [x.id, x]));
  const P = S.pairs, D = S.added;
  need(P && Array.isArray(P.flux) && P.flux.every(isNum) && P.xi && [P.xi.sep_kms, P.xi.all, P.xi.outside_dla].every(a => Array.isArray(a) && a.length === P.xi.sep_kms.length), 'sightlines: series pairs');
  need(D && [D.flux, D.flux_added].every(a => Array.isArray(a) && a.length === D.flux.length) && Array.isArray(D.absorbers), 'sightlines: series added');
  const W = P.words || {}, WD = D.words || {};
  m.pairs = { dv: P.dv_kms, flux: P.flux, dla: P.dla, xi: P.xi, arcs: P.arcs,
    words: Object.fromEntries(Object.entries(W).map(([k, v]) => [k, screen(String(v))])) };
  m.added = { dv: D.dv_kms, pix: D.pix, flux: D.flux, fluxAdded: D.flux_added, absorbers: D.absorbers.map(a => ({ ...a, name: screen(a.name) })),
    words: Object.fromEntries(Object.entries(WD).map(([k, v]) => [k, screen(String(v))])) };
  m.footPairs = { lines: [m.pairs.words.caption], optional: [], short: ['one simulated sightline (PRIYA, z = 3) · an illustration'] };
  m.footAdded = { lines: [m.added.words.caption], optional: [], short: ['simulated (PRIYA, z = 3); absorbers added by us'] };
  return m;
}

function adaptThermal(doc, warnings) {
  const m = base(doc);
  const S = Object.fromEntries((doc.series || []).map(x => [x.id, x]));
  const T0 = S.t0, G = S.gaikwad, X = S.samples, on = doc.on_screen || {};
  need(T0 && [T0.mean_K, T0.p16_K, T0.p84_K].every(a => Array.isArray(a) && a.length === T0.z.length), 'thermal: series t0');
  need(G && Array.isArray(G.z) && G.z.length === G.T0_K.length, 'thermal: series gaikwad');
  need(X && X.delta2L.length === X.n_eff.length && X.n_eff.length === X.T0_z3_K.length, 'thermal: series samples');
  m.t0 = { z: T0.z, mean: T0.mean_K, lo: T0.p16_K, hi: T0.p84_K };
  m.gaikwad = { z: G.z, T: G.T0_K, err: G.err_K, cite: screen(G.cite || '') };
  m.samples = { x: X.delta2L, y: X.n_eff, t: X.T0_z3_K, range: X.T0_z3_range_K };
  m.key = Array.isArray(on.key_kK) && on.key_kK.length === 2 ? on.key_kK.map(v => v * 1000) : null;
  m.keyText = Array.isArray(on.key_kK) ? on.key_kK.map(v => v.toFixed(1)) : null;
  m.keyUnit = typeof on.key_unit === 'string' ? screen(on.key_unit) : '';
  m.words = Object.fromEntries(Object.entries(on).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, screen(v)]));
  m.foot = { lines: [m.words.tag || m.foot.lines[0]], optional: [], short: ['computed: my chain, PRIYA’s T₀ emulator; points: Gaikwad et al. 2021'] };
  return m;
}


function adaptMultifid(doc, warnings) {
  const m = base(doc);
  const S = Object.fromEntries((doc.series || []).map(x => [x.id, x]));
  const U = S.suites, Pt = S.patch, on = doc.on_screen || {};
  need(U && U.per_run && isNum(U.per_run.cheap) && isNum(U.per_run.detailed) && Array.isArray(U.points) && U.points.length === 3, 'multifid: series suites missing');
  need(Pt && isNum(Pt.n) && [Pt.detailed, Pt.cheap].every(a => Array.isArray(a) && a.length === Pt.n * Pt.n), 'multifid: series patch missing');
  const pt = Object.fromEntries(U.points.map(q => [q.id, q]));
  need(['cheap', 'detailed', 'mf'].every(k => pt[k] && isNum(pt[k].cost)), 'multifid: points cheap, detailed, mf');
  m.perRun = { cheap: U.per_run.cheap, detailed: U.per_run.detailed, particles: U.per_run.particles || {} };
  m.runs = U.runs; m.points = pt; m.ratio = U.ratio_detailed_over_mf; m.ratioSaid = screen(U.ratio_said || '');
  m.patch = { n: Pt.n, detailed: Pt.detailed, cheap: Pt.cheap, labelDetailed: screen(Pt.label_detailed), labelCheap: screen(Pt.label_cheap), caption: screen(Pt.caption || '') };
  m.words = { schematic: screen(on.schematic || 'schematic'), cost: screen(on.axis_cost || 'cost'), error: screen(on.axis_error || 'error'), credit: screen(on.credit || ''), creditForest: screen(on.credit_forest || '') };
  m.papers = S.papers || {};
  m.foot = { lines: [screen(on.tag || composedFoot(doc))], optional: [Pt.note ? screen(Pt.note) : null, U.per_run.spread ? screen(U.per_run.spread) : null,
    m.papers.forest ? `${m.papers.forest.cite}, "${m.papers.forest.title}", ${m.papers.forest.journal}` : null,
    m.papers.mfbox ? `${m.papers.mfbox.cite}, "${m.papers.mfbox.title}", ${m.papers.mfbox.journal}` : null].filter(Boolean),
    short: ['schematic; costs: Bird et al. 2023; runs: Ho et al. 2026; totals ours'] };
  return m;
}

function adaptEmulatorParams(doc, warnings) {
  const m = base(doc);
  const S = (doc.series || []).find(x => x.id === 'params');
  need(S && Array.isArray(S.params) && S.params.length > 2 && S.n_walk, 'emulator_params: series params missing');
  const nW = S.n_walk.demo + S.n_walk.chain;
  need(S.params.every(q => Array.isArray(q.prior) && q.prior.length === 2 && Array.isArray(q.walk) && q.walk.length === nW && q.walk.every(isNum) && q.posterior), 'emulator_params: a parameter without prior, posterior or walk');
  m.params = S.params.map(q => ({ id: q.id, name: screen(q.name), symbol: q.symbol, group: q.group, kind: q.kind || null, z: isNum(q.z) ? q.z : null,
    prior: q.prior, post: q.posterior, walk: q.walk }));
  m.nDemo = S.n_walk.demo; m.nChain = S.n_walk.chain; m.cosmology = S.cosmology || [];
  m.words = Object.fromEntries(Object.entries(S.words || {}).map(([k, v]) => [k, screen(v)]));
  const on = doc.on_screen || {}, mine = t => String(t).replace(/\bhis\b/g, 'my').replace(/\bHis\b/g, 'My');
  m.foot = { lines: [on.tag ? mine(screen(on.tag)) : composedFoot(doc)], optional: [screen(S.convention || '')].filter(Boolean),
    short: ['my chain (Ho et al. 2026) and our short run of my likelihood'] };
  const PS = (doc.series || []).find(x => x.id === 'plane');
  const PP = PS && Array.isArray(PS.pairs) ? PS.pairs[PS.drawn || 0] : null;
  const byId = Object.fromEntries(m.params.map(q => [q.id, q]));
  if (PP && byId[PP.x] && byId[PP.y] && PP.contours && PP.contours['68'] && PP.contours['95'] && PP.frame && PP.words) {
    const span = [PP.frame.x[1] - PP.frame.x[0], PP.frame.y[1] - PP.frame.y[0]];
    const lv = Object.keys(PP.contours).sort((a, b) => parseFloat(a) - parseFloat(b));
    m.plane = { x: PP.x, y: PP.y, frame: PP.frame, ticks: PP.ticks || null, xLabel: screen(PP.words.x), yLabel: screen(PP.words.y),
      loops: lv.map(k => closePieces(PP.contours[k], span)), levels: lv.map(k => `${k}%`), rho: isNum(PP.rho) ? PP.rho : null,
      walk: byId[PP.x].walk.map((v, i) => ({ x: v, y: byId[PP.y].walk[i] })),
      words: Object.fromEntries(Object.entries(PS.words || {}).map(([k, v]) => [k, screen(v)])), selection: screen(PS.selection || '') };
  } else warnings.push('emulator_params: no nuisance plane (series plane); nuisance.0 shows the strip only');
  return m;
}

const screenDeep = v => (Array.isArray(v) ? v.map(screenDeep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, screenDeep(x)])) : screen(v));

function adaptDlaP1d(doc, warnings) {
  const m = base(doc);
  const S = Object.fromEntries((doc.series || []).map(x => [x.id, x]));
  const P = S.p1d, E = S.example, on = doc.on_screen || {};
  need(P && Array.isArray(P.k) && Array.isArray(P.ratios), 'dla_p1d: series p1d (k, ratios) missing');
  need(E && Array.isArray(E.wave) && Array.isArray(E.flux_clean) && Array.isArray(E.flux_dla), 'dla_p1d: series example missing');
  const inDesi = Array.isArray(P.in_desi_dr1_k_range) ? P.in_desi_dr1_k_range : P.k.map(() => true);
  const keep = P.k.map((k, i) => i).filter(i => inDesi[i]);
  const ratio = id => { const r = P.ratios.find(x => x.id === id); return r ? { label: screen(r.label || id), r: keep.map(i => r.ratio[i]), e: keep.map(i => r.err[i]) } : null; };
  m.p1d = { k: keep.map(i => P.k[i]), dla: ratio('dla/clean'), m2: ratio('masked_m2/clean'), m1: ratio('masked_m1/clean'), truth: ratio('masked_truth/clean') };
  need(m.p1d.dla && m.p1d.m2, 'dla_p1d: ratios dla/clean and masked_m2/clean missing');
  const nm = v => v / 10;
  const nz = Array.isArray(E.noiseless_clean) && Array.isArray(E.noiseless_dla);
  const trans = E.dla_transmission_m2 || [], mk = E.mask_m2 || [];
  const afterSmooth = nz ? E.noiseless_dla.map((v, i) => (mk[i] || !(trans[i] > 0) ? null : v / trans[i])) : E.flux_corrected_m2;
  m.example = {
    wave: E.wave.map(nm), clean: nz ? E.noiseless_clean : E.flux_clean, dla: nz ? E.noiseless_dla : E.flux_dla, after: afterSmooth, mask: mk, noiseless: nz,
    region: Array.isArray(E.measured_region_A) ? E.measured_region_A.map(nm) : null,
    truth: (E.truth || []).map(t => ({ z: t.z, logN: t.log_nhi, w: nm(t.wave_lya_A) })),
    found: ((E.finder_m2_experimental || {}).candidates || []).map(c => ({ z: c.z, logN: c.log_nhi, w: nm(CONSTANTS.lya.lambda_nm * 10 * (1 + c.z)) })),
    zq: E.z_qso,
  };
  const H = (doc.headline && doc.headline.lowest_desi_bin) || {};
  m.headline = { dla: H.dla || null, m2: H.masked_m2 || null };
  const R = (doc.mock && doc.mock.rate) || {}, own = R.priya_own || {};
  m.rate = isNum(own.mock_over_priya) ? own.mock_over_priya : null;
  m.nSpectra = doc.mock && isNum(doc.mock.n_spectra) ? doc.mock.n_spectra : null;
  m.title = on.title ? screen(on.title) : null;
  m.axisX = screen(on.axis_x || 'k (s/km)'); m.axisY = screen(on.axis_y || 'P1D ratio to the clean forest');
  const sim = doc.mock && typeof doc.mock.simulation === 'string' ? screen(doc.mock.simulation.split(':')[0]) : null;
  const nAll = doc.mock && isNum(doc.mock.n_spectra) ? doc.mock.n_spectra : null, nDraw = doc.stack && Array.isArray(doc.stack.spectra) ? doc.stack.spectra.length : null;
  const FU0 = doc.stack && doc.stack.full && Array.isArray(doc.stack.full.spectra) && doc.stack.full.spectra.length ? doc.stack.full : null;
  const nDrawn = FU0 ? FU0.spectra.length : nDraw;
  const nl = FU0 ? true : !!(nDraw && doc.stack.spectra.every(sp => sp.noiseless_dla && sp.noiseless_clean && sp.noiseless_masked_m2));
  const ill = FU0 && FU0.spectra.every(sp => Array.isArray(sp.noise_illustrative));
  m.foot = { lines: [sim ? `mocks from ${sim.split(',')[0]} with DLAs and DESI-like noise${nAll && nDrawn ? `; ${ill ? '' : `${nDrawn} of the ${nAll} drawn${nl ? ' noise-free' : ''}, `}the P1D from all ${nAll}${nl || ill ? ', noise subtracted' : ''}` : ''}` : (on.tag ? screen(on.tag) : 'mock spectra')], optional: on.tag ? [screen(on.tag)] : [] };
  { const fu = doc.stack && doc.stack.full && String(doc.stack.full.units || '');
    if (/finder's GP mean/.test(fu)) m.foot.optional.unshift("the drawn spectra's quasar light: my finder's mean quasar (its GP mean continuum), known exactly in the mocks"); }
  if (sim && sim.includes(',')) m.foot.optional.push(`the simulation: ${sim}`);
  if (typeof doc.not_a_measurement === 'string') m.foot.optional.push(screen(doc.not_a_measurement));
  if (typeof doc.not_a_measurement === 'string' && /not a DESI measurement/.test(doc.not_a_measurement)) m.foot.caveats = ['a demonstration on mock spectra with a known truth, not a DESI measurement'];
  if (sim) m.foot.short = [`mocks: ${sim.split(',')[0]} + DLAs${nAll ? `; P1D from all ${nAll}, noise subtracted` : ''}`, `mocks: ${sim.split(',')[0]} + DLAs`];
  if (R.mock) m.foot.optional.push(screen(R.mock));
  if (own.note) m.foot.optional.push(screen(own.note));
  if (P.k_range_note) m.foot.optional.push(screen(P.k_range_note));
  const SK = doc.stack;
  if (SK && Array.isArray(SK.wave) && Array.isArray(SK.spectra) && SK.p1d && Array.isArray(SK.p1d.k)) {
    const curve = c => (SK.p1d[c] && Array.isArray(SK.p1d[c].kP_over_pi) ? { y: SK.p1d[c].kP_over_pi, e: SK.p1d[c].kP_over_pi_err || SK.p1d[c].kP_over_pi.map(() => 0) } : null);
    m.stack = {
      wave: SK.wave.map(nm), n: SK.spectra.length,
      spectra: SK.spectra.map(sp => ({
        index: sp.index, example: !!sp.is_example,
        dla: sp.noiseless_dla || sp.flux_dla, clean: sp.noiseless_clean || sp.flux_clean, masked: sp.noiseless_masked_m2 || sp.flux_masked_m2,
        noiseless: !!(sp.noiseless_dla && sp.noiseless_clean && sp.noiseless_masked_m2),
        mask: (sp.mask_m2 || []).map(([a, b]) => [nm(a), nm(b)]),
        truth: (sp.truth || []).map(t => ({ w: nm(t.wave_lya_A), logN: t.log_nhi })),
        found: (sp.finder_m2 || []).map(f => ({ w: nm(f.wave_lya_A), logN: f.log_nhi, called: !!f.called_dla })),
      })),
      p1d: { k: SK.p1d.k, clean: curve('clean'), dla: curve('dla'), masked: curve('masked_m2'), labels: SK.p1d.labels || {} },
    };
    need(m.stack.p1d.clean && m.stack.p1d.dla && m.stack.p1d.masked, 'dla_p1d: stack.p1d needs clean, dla and masked_m2');
    const called = m.stack.spectra.reduce((s, sp) => s + sp.found.filter(f => f.called).length, 0), inserted = m.stack.spectra.reduce((s, sp) => s + sp.truth.length, 0);
    m.stack.called = called; m.stack.inserted = inserted;
    if (SK.p1d.source) m.foot.optional.push(`P1D: ${screen(SK.p1d.source)}`);
    const FU = SK.full;
    if (FU && Array.isArray(FU.wave_A) && Array.isArray(FU.spectra) && FU.spectra.length) {
      const byIndex = new Map(m.stack.spectra.map(sp => [sp.index, sp]));
      m.stack.full = {
        wave: FU.wave_A.map(nm), stretch: Array.isArray(FU.stretch_A) ? FU.stretch_A.map(nm) : null,
        noise: ill ? { seed: (FU.noise_illustrative || {}).seed, sigmaFrac: (FU.noise_illustrative || {}).sigma_frac } : null,
        spectra: FU.spectra.map(sp => ({ index: sp.index, clean: sp.clean, dla: sp.dla, masked: sp.masked,
          noise: ill ? sp.noise_illustrative : null, continuum: Array.isArray(sp.continuum) ? sp.continuum : null,
          mask: (sp.mask || []).map(([a, b]) => [nm(a), nm(b)]),
          found: Array.isArray(sp.finder_m2) ? sp.finder_m2.map(f => ({ w: nm(f.wave_lya_A), logN: f.log_nhi, called: !!f.called_dla })) : (byIndex.get(sp.index) || { found: [] }).found,
          truth: Array.isArray(sp.truth) ? sp.truth.map(t => ({ w: nm(t.wave_lya_A), logN: t.log_nhi })) : (byIndex.get(sp.index) || { truth: [] }).truth })),
      };
      const fc = m.stack.full.spectra.reduce((s, sp) => s + sp.found.filter(f => f.called).length, 0), ft = m.stack.full.spectra.reduce((s, sp) => s + sp.truth.length, 0);
      m.foot.optional.push(`drawn: ${screen(FU.rule || '')}; ${screen(FU.noise || '')}; the finder called ${fc} of their ${ft} DLAs`);
      if (ill && FU.noise_illustrative && FU.noise_illustrative.what) m.foot.optional.push(`${oxford(screen(FU.noise_illustrative.what))} (seed ${FU.noise_illustrative.seed})`);
    } else m.stack.full = null;
  } else { m.stack = null; warnings.push('dla_p1d: no stack yet (the two-panel demonstration waits for it)'); }
  if (m.example.truth.length) m.foot.optional.push(`the example: true log N_HI ${m.example.truth.map(t => t.logN.toFixed(2)).join(', ')}; found by my finder ${m.example.found.map(t => t.logN.toFixed(2)).join(', ') || 'none'}`);
  return m;
}
