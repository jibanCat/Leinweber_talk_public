
import { CHANNELS } from './look.js';
import { channelProgress } from './timeline.js';
import { hash32 } from './hash.js';
import { preparePairs } from './pairs.js';
import { prepareSpacing, LYA_A } from './spacing.js';
import { SECTION8, R_D_H, PROVENANCE } from './provenance.js';
import { prepareLyaPairs, prepareDesiXi } from './lyapairs.js';
import { DESI_CURVES } from '../program.js';

export { hash32 };

const TYPES = {
  float32: [4, 'getFloat32'], float64: [8, 'getFloat64'], int8: [1, 'getInt8'], uint8: [1, 'getUint8'],
  int16: [2, 'getInt16'], uint16: [2, 'getUint16'], int32: [4, 'getInt32'], uint32: [4, 'getUint32'],
};
const ALIASES = {
  f4: 'float32', f8: 'float64', i1: 'int8', u1: 'uint8', i2: 'int16', u2: 'uint16', i4: 'int32', u4: 'uint32',
  float: 'float32', double: 'float64', byte: 'int8', ubyte: 'uint8', short: 'int16', ushort: 'uint16', int: 'int32',
  uint: 'uint32', b: 'int8', B: 'uint8', h: 'int16', H: 'uint16', i: 'int32', I: 'uint32', f: 'float32', d: 'float64',
};

export const CANONICAL_FIELDS = [
  { name: 'x', type: 'float32', offset: 0, unit: 'h^-1 Mpc, across the wedge' },
  { name: 'y', type: 'float32', offset: 4, unit: 'h^-1 Mpc, outward' },
  { name: 'z', type: 'float32', offset: 8, unit: 'redshift' },
  { name: 'day', type: 'uint16', offset: 12, unit: 'days since day0_mjd (last observation)' },
  { name: 'tracer', type: 'uint8', offset: 14, unit: 'index into tracers' },
  { name: 'flags', type: 'uint8', offset: 15, unit: 'bit 0: QSO with z > 2.1 (Lyα skewer source)' },
];
export const RECORD_BYTES = 16;
export const RAMP_DAYS = 6;
export const GROW_DAYS = 24;
export const END_DAYS = Math.max(RAMP_DAYS, GROW_DAYS);
export const LYA_FLAG = 1;

function normType(t) {
  const raw = String(t).trim();
  if (raw.startsWith('>') || raw.startsWith('!')) throw new Error(`fan.json: big-endian field type "${t}" (06 §2 is little-endian)`);
  let s = raw.replace(/^[<|=]/, '');
  s = ALIASES[s] || ALIASES[s.toLowerCase()] || s.toLowerCase();
  if (!TYPES[s]) throw new Error(`fan.json: unknown field type "${t}"`);
  return s;
}

export function parseFields(fields) {
  let list;
  if (fields == null) list = CANONICAL_FIELDS.map(f => [f.name, f.type, f.offset]);
  else if (Array.isArray(fields)) {
    list = fields.map(f => {
      if (typeof f === 'string') { const [n, t] = f.split(/[:\s]+/); return [n, t, undefined]; }
      if (Array.isArray(f)) return [f[0], f[1], f[2]];
      return [f.name, f.type ?? f.dtype ?? f.format, f.offset];
    });
  } else if (typeof fields === 'object') {
    list = Object.entries(fields).map(([n, v]) => (v && typeof v === 'object' ? [n, v.type ?? v.dtype, v.offset] : [n, v, undefined]));
  } else throw new Error('fan.json: `fields` is neither a list nor an object');
  const map = {};
  let at = 0, end = 0;
  for (const [name, t, off] of list) {
    const type = normType(t), [size, get] = TYPES[type];
    const offset = Number.isFinite(off) ? off : at;
    map[String(name)] = { type, size, offset, get };
    at = offset + size;
    end = Math.max(end, at);
  }
  return { map, bytes: end };
}

const view = b => (ArrayBuffer.isView(b) ? new DataView(b.buffer, b.byteOffset, b.byteLength) : new DataView(b));

export function parseFan(header, buffer) {
  const warnings = [];
  const n = Number(header.n);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`fan.json: n = ${header.n}`);
  const { map, bytes } = parseFields(header.fields);
  const rb = Number(header.record_bytes ?? bytes);
  if (bytes > rb) throw new Error(`fan.json: fields need ${bytes} bytes but record_bytes = ${rb}`);
  for (const need of ['x', 'y', 'day', 'tracer']) if (!map[need]) throw new Error(`fan.json: no "${need}" field`);
  const dv = view(buffer);
  if (dv.byteLength < n * rb) throw new Error(`fan.bin: ${dv.byteLength} bytes, header says ${n} × ${rb} = ${n * rb}`);
  if (dv.byteLength > n * rb) warnings.push(`fan.bin has ${dv.byteLength - n * rb} bytes beyond n × record_bytes (ignored)`);
  const names = (header.tracers || CHANNELS).map(String);
  const chanOf = names.map(nm => {
    const u = nm.toUpperCase(), c = CHANNELS.findIndex(c => u.startsWith(c));
    if (c < 0) throw new Error(`fan.json: tracer "${nm}" is none of ${CHANNELS.join(', ')}`);
    return c;
  });
  const x = new Float32Array(n), y = new Float32Array(n), z = map.z ? new Float32Array(n) : null;
  const day = new Uint32Array(n), chan = new Uint8Array(n), flags = new Uint8Array(n);
  const F = map;
  const gx = dv[F.x.get].bind(dv), gy = dv[F.y.get].bind(dv), gd = dv[F.day.get].bind(dv), gt = dv[F.tracer.get].bind(dv);
  const gz = F.z ? dv[F.z.get].bind(dv) : null, gf = F.flags ? dv[F.flags.get].bind(dv) : null;
  const counts = names.map(() => 0);
  for (let i = 0, o = 0; i < n; i++, o += rb) {
    x[i] = gx(o + F.x.offset, true);
    y[i] = gy(o + F.y.offset, true);
    if (gz) z[i] = gz(o + F.z.offset, true);
    const d = gd(o + F.day.offset, true);
    if (!(d >= 0)) throw new Error(`fan.bin: record ${i} has day ${d}`);
    day[i] = d;
    const t = gt(o + F.tracer.offset, true);
    if (!(t >= 0 && t < names.length)) throw new Error(`fan.bin: record ${i} has tracer ${t} (tracers: ${names.length})`);
    chan[i] = chanOf[t];
    counts[t]++;
    if (gf) flags[i] = gf(o + F.flags.offset, true);
  }
  const hc = header.counts;
  if (hc && typeof hc === 'object') {
    names.forEach((nm, t) => { if (Number.isFinite(hc[nm]) && hc[nm] !== counts[t]) warnings.push(`header counts ${nm} = ${hc[nm]}, file has ${counts[t]}`); });
  }
  return { n, x, y, z, day, chan, flags, names, counts, header, warnings };
}

export function parseSkewers(json, nFan) {
  const warnings = [];
  let I, R0, R1, D0, D1;
  const list = Array.isArray(json) ? json : (json && (json.skewers || json.data || json.records));
  const pick = (e, ...k) => { for (const key of k) if (e[key] !== undefined) return Number(e[key]); return NaN; };
  if (Array.isArray(list)) {
    const m = list.length;
    I = new Uint32Array(m); R0 = new Float32Array(m); R1 = new Float32Array(m); D0 = new Float32Array(m); D1 = new Float32Array(m);
    list.forEach((e, j) => {
      I[j] = pick(e, 'i', 'index', 'fan_index');
      R0[j] = pick(e, 'r_start', 'rStart', 'r0');
      R1[j] = pick(e, 'r_end', 'rEnd', 'r1');
      D0[j] = pick(e, 'd_start', 'dStart');
      D1[j] = pick(e, 'd_end', 'dEnd');
    });
  } else if (json && Array.isArray(json.i)) {
    const m = json.i.length, opt = a => (Array.isArray(a) ? Float32Array.from(a) : new Float32Array(m).fill(NaN));
    I = Uint32Array.from(json.i); R0 = Float32Array.from(json.r_start); R1 = Float32Array.from(json.r_end);
    D0 = opt(json.d_start); D1 = opt(json.d_end);
  } else throw new Error('skewers.json: no list of {i, r_start, r_end}');
  const m = I.length;
  let swapped = 0;
  for (let j = 0; j < m; j++) {
    if (!(I[j] < nFan)) throw new Error(`skewers.json: skewer ${j} points at fan index ${I[j]} (n = ${nFan})`);
    if (!(Number.isFinite(R0[j]) && Number.isFinite(R1[j]))) throw new Error(`skewers.json: skewer ${j} has no r_start/r_end`);
    if (R0[j] > R1[j]) { const t = R0[j]; R0[j] = R1[j]; R1[j] = t; swapped++; }
  }
  if (swapped) warnings.push(`skewers.json: ${swapped} skewers had r_start > r_end (swapped)`);
  let hasData = m > 0, outside = 0;
  for (let j = 0; j < m && hasData; j++) {
    if (!(Number.isFinite(D0[j]) && Number.isFinite(D1[j]) && D0[j] <= D1[j])) hasData = false;
    else if (D0[j] < R0[j] - 0.5 || D1[j] > R1[j] + 0.5) outside++;
  }
  if (outside) warnings.push(`skewers.json: ${outside} skewers have d_start/d_end outside r_start/r_end`);
  let hero = -1;
  if (json && Number.isInteger(json.hero_i)) hero = I.indexOf(json.hero_i);
  else if (json && Number.isInteger(json.hero) && json.hero >= 0 && json.hero < m) hero = json.hero;
  return { m, i: I, rStart: R0, rEnd: R1, dStart: hasData ? D0 : null, dEnd: hasData ? D1 : null, hero,
    json: Array.isArray(json) ? null : json, warnings };
}


export function revealCount(key, t) {
  let lo = 0, hi = key.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (key[mid] < t) lo = mid + 1; else hi = mid; }
  return lo;
}

function timeAt(data, K, p) {
  const T = data.D + END_DAYS;
  if (!(p > 0)) return 0;
  if (p >= 1) return T;
  if (data.pace === 'time' || K.length === 0) return p * T;
  const n = K.length, q = p * n, i = Math.min(n - 1, Math.floor(q)), f = Math.min(1, q - i);
  const lo = i > 0 ? K[i - 1] : 0, hi = K[i];
  const tail = Math.min(1, Math.max(0, (p - 0.97) / 0.03));
  return lo + (hi - lo) * f + END_DAYS * tail;
}
const PROG = [0, 0, 0, 0];
export function surveyTimes(data, st, out) {
  const g = timeAt(data, data.key, st.fill);
  if (!(st.stag > 0)) { out[0] = out[1] = out[2] = out[3] = g; return out; }
  channelProgress(st, PROG);
  for (let c = 0; c < 4; c++) out[c] = g + (timeAt(data, data.chanKeys[c], PROG[c]) - g) * st.stag;
  return out;
}

export function distanceTable(Om, zMax = 6, dz = 0.002, Or = 0) {
  const nz = Math.ceil(zMax / dz) + 1, tab = new Float64Array(nz), E = z => Math.sqrt(Om * (1 + z) ** 3 + Or * (1 + z) ** 4 + 1 - Om - Or);
  const C = 2997.92458;
  for (let k = 1; k < nz; k++) {
    const a = (k - 1) * dz, b = k * dz;
    tab[k] = tab[k - 1] + C * (dz / 6) * (1 / E(a) + 4 / E((a + b) / 2) + 1 / E(b));
  }
  return z => { const p = Math.min(nz - 1.000001, Math.max(0, z / dz)), k = Math.floor(p), f = p - k; return tab[k] + (tab[k + 1] - tab[k]) * f; };
}
export const READ_STEP = 0.5, READ_DIP = 0.35, READ_GAP = 2, READ_PAIR = [4, 15], READ_N = 7, READ_BARS = [100, 10];
export function prepareReadSim(doc, spec, h, dc) {
  const S = Array.isArray(doc.series) ? doc.series.find(x => x.id === 'sim') : null;
  if (!S || !Array.isArray(S.F_alpha) || S.F_alpha.length !== S.i1 - S.i0) throw new Error('no series sim with F_alpha');
  const wave = spec.wave, n = Math.max(2, Math.floor((h.rEnd - h.rStart) / READ_STEP) + 1);
  const r = new Float64Array(n), F = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    r[j] = h.rStart + j * READ_STEP;
    const lam = LYA_A * (1 + zAtDistance(dc, r[j]));
    let lo = S.i0, hi = S.i1 - 1;
    if (lam < wave[lo] || lam > wave[hi]) { F[j] = 1; continue; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (wave[m] < lam) lo = m; else hi = m; }
    const i = Math.abs(wave[lo] - lam) <= Math.abs(wave[hi] - lam) ? lo : hi;
    F[j] = S.F_alpha[i - S.i0];
  }
  const dips = [];
  for (let j = 1; j + 1 < n; j++) if (F[j] < READ_DIP && F[j] <= F[j - 1] && F[j] <= F[j + 1] && (!dips.length || r[j] - dips[dips.length - 1] >= READ_GAP)) dips.push(r[j]);
  const all = [];
  for (let k = 1; k < dips.length; k++) { const d = dips[k] - dips[k - 1]; if (d >= READ_PAIR[0] && d <= READ_PAIR[1]) all.push([dips[k - 1], dips[k]]); }
  const pairs = all.length <= READ_N ? all : Array.from({ length: READ_N }, (_, q) => all[Math.round((q * (all.length - 1)) / (READ_N - 1))]);
  return { r, F, dips, pairs, bars: READ_BARS.slice(), step: READ_STEP };
}
export const READ_DEPTH = 3.4, READ_BAR_OFF = READ_DEPTH + 1.4;
export function readBarSpans(h, bars) {
  const span = h.rEnd - h.rStart, out = [];
  let r0 = h.rStart + 0.22 * span;
  for (const len of bars) { out.push([r0, r0 + len, len]); r0 += len + 0.06 * span; }
  return out;
}
export function zAtDistance(dc, r, zMax = 6) {
  let lo = 0, hi = zMax;
  for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; if (dc(m) < r) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function omegaR(c) {
  if (!c || typeof c !== 'object') return 0;
  for (const k of ['Omega_r', 'Or', 'Or0', 'Omega_r0', 'OmegaR']) if (Number.isFinite(c[k])) return c[k];
  return 0;
}

function omegaM(c) {
  if (!c || typeof c !== 'object') return NaN;
  for (const k of ['Om', 'Om0', 'Omega_m', 'OmegaM', 'omega_m_total', 'Omega_m0']) if (Number.isFinite(c[k])) return c[k];
  if (Number.isFinite(c.omega_m) && Number.isFinite(c.h)) return c.omega_m < 0.2 ? c.omega_m / (c.h * c.h) : c.omega_m;
  return NaN;
}

export function mjdToDate(mjd) {
  const z = Math.floor(mjd) - 40587 + 719468;
  const era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153), d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9;
  return { y: era * 400 + yoe + (m <= 2 ? 1 : 0), m, d };
}
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function quantiles(values, qs) {
  const s = Float64Array.from(values).sort();
  return qs.map(q => (s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))] : NaN));
}
function sample(n, cap, f, keep = () => true) {
  const step = Math.max(1, Math.floor(n / cap)), out = [];
  for (let i = 0; i < n; i += step) if (keep(i)) out.push(f(i));
  return out;
}

export const SECTOR_GAP = 0.05;
export const Z_TICKS = [0.5, 1, 2, 3];
export const HERO_ZQ = 3.0;
export const SKEWERS_DRAWN = 1000;

export function prepareSurvey(fan, sk, opts = {}) {
  const warnings = [...fan.warnings, ...sk.warnings];
  const n = fan.n;
  let { x, y, z, day, chan, flags } = fan;
  let skI = sk.i;

  let sorted = true;
  for (let i = 1; i < n; i++) if (day[i] < day[i - 1]) { sorted = false; break; }
  if (!sorted) {
    warnings.push('fan.bin is not sorted by day: sorted at load (stable); the file order should be the reveal order');
    const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => day[a] - day[b] || a - b);
    const inv = new Uint32Array(n);
    idx.forEach((o, i) => { inv[o] = i; });
    const re = (A, T) => { const B = new T(n); idx.forEach((o, i) => { B[i] = A[o]; }); return B; };
    x = re(x, Float32Array); y = re(y, Float32Array); z = z ? re(z, Float32Array) : null;
    day = re(day, Uint32Array); chan = re(chan, Uint8Array); flags = re(flags, Uint8Array);
    skI = skI.map(i => inv[i]);
  }

  const key = new Float32Array(n);
  for (let a = 0; a < n;) {
    let b = a;
    while (b < n && day[b] === day[a]) b++;
    for (let j = a; j < b; j++) key[j] = day[a] + (j - a + 0.5) / (b - a);
    a = b;
  }
  const D = day[n - 1] + 1;
  const chanCount = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) chanCount[chan[i]]++;
  const chanKeys = chanCount.map(m => new Float32Array(m)), at = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) chanKeys[chan[i]][at[chan[i]]++] = key[i];

  const group = new Uint8Array(n);
  for (let i = 0; i < n; i++) group[i] = flags[i] & LYA_FLAG ? 4 : chan[i];
  let unflagged = 0;
  for (let j = 0; j < sk.m; j++) if (group[skI[j]] !== 4) { group[skI[j]] = 4; unflagged++; }
  if (unflagged) warnings.push(`${unflagged} skewer sources were not flagged (bit 0) in fan.bin: treated as Lyα sources`);

  const th = i => Math.atan2(x[i], y[i]), rr = i => Math.hypot(x[i], y[i]);
  const [theta0, theta1] = quantiles(sample(n, 200000, th), [0.001, 0.999]);
  const [rMax] = quantiles(sample(n, 200000, rr), [0.999]);
  const thetaMid = (theta0 + theta1) / 2, span = theta1 - theta0;
  let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
  for (let k = 0; k <= 64; k++) {
    const t = theta0 + span * k / 64, px = rMax * Math.sin(t), py = rMax * Math.cos(t);
    bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px); by0 = Math.min(by0, py); by1 = Math.max(by1, py);
  }

  const secW = span * (1 - 4 * SECTOR_GAP) / 5;
  const secA = [0, 1, 2, 3, 4].map(g => theta0 + g * (secW + span * SECTOR_GAP));
  const secS = secW / span;

  const NR = 80, NT = 60, cells = new Float64Array(4 * NR * NT);
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(x[i], y[i]), t = Math.atan2(x[i], y[i]);
    const a = Math.floor(r / rMax * NR), b = Math.floor((t - theta0) / span * NT);
    if (a >= 0 && a < NR && b >= 0 && b < NT) cells[(chan[i] * NR + a) * NT + b]++;
  }
  const rho = [0, 1, 2, 3].map(c => {
    let s2 = 0, s1 = 0;
    for (let a = 0; a < NR; a++) {
      const area = 0.5 * (span / NT) * (((a + 1) * rMax / NR) ** 2 - (a * rMax / NR) ** 2);
      for (let b = 0; b < NT; b++) { const v = cells[(c * NR + a) * NT + b]; s2 += v * v / area; s1 += v; }
    }
    return s1 ? s2 / s1 : 0;
  });
  const groupR = [0, 1, 2, 3, 4].map(g => {
    const [med, p95] = quantiles(sample(n, 400000, rr, i => group[i] === g), [0.5, 0.95]);
    return { med, p95 };
  });

  let Om = omegaM(fan.header.cosmology);
  if (!Number.isFinite(Om)) { Om = 0.3153; warnings.push('fan.json: no Ω_m in `cosmology`; ticks use Planck 2018 Ω_m = 0.3153'); }
  const Or = omegaR(fan.header.cosmology);
  let dc = distanceTable(Om, 6, 0.002, Or);
  if (z) {
    const ratios = sample(n, 50000, i => rr(i) / dc(z[i]), i => z[i] > 0.05);
    const [med] = quantiles(ratios, [0.5]);
    if (Math.abs(med - 1) > 0.03) {
      warnings.push(`positions disagree with the header cosmology (median r / D_C(z) = ${med.toFixed(3)}): ticks follow the points`);
      const cosmo = dc;
      dc = zz => med * cosmo(zz);
    }
  }
  const hl = fan.header.ticks && (Array.isArray(fan.header.ticks) ? fan.header.ticks : fan.header.ticks.list);
  const given = Array.isArray(hl) ? hl.map(t => ({ z: Number(t.z), r: Number(t.r_hmpc ?? t.r) })).filter(t => Number.isFinite(t.z) && Number.isFinite(t.r)) : [];
  const ticks = (given.length ? given : Z_TICKS.map(zz => ({ z: zz, r: dc(zz) }))).filter(t => t.r <= rMax * 1.01);

  const ARC = 96, segs = [];
  for (const t of ticks) for (let k = 0; k < ARC; k++) segs.push(t.r, theta0 + span * k / ARC, t.r, theta0 + span * (k + 1) / ARC);
  const rEdge = ticks.length ? Math.max(rMax, ticks[ticks.length - 1].r) : rMax;
  segs.push(0, theta0, rEdge, theta0, 0, theta1, rEdge, theta1);
  const axes = Float32Array.from(segs);

  const m = sk.m;
  const span_ = opts.span === 'window' || !sk.dStart ? 'window' : 'data';
  if (opts.span !== 'window' && !sk.dStart && m) warnings.push('skewers.json has no d_start/d_end: skewers drawn over the forest window (r_start/r_end)');
  const rS = span_ === 'data' ? sk.dStart : sk.rStart, rE = span_ === 'data' ? sk.dEnd : sk.rEnd;
  const placeholder = fan.header.placeholder === true || (sk.json && sk.json.placeholder === true);
  let hero = sk.hero, heroBy = hero >= 0 ? 'skewers.json' : '';
  const findFan = fi => { for (let j = 0; j < m; j++) if (skI[j] === fi) return j; return -1; };
  if (hero < 0 && Number.isInteger(opts.heroI)) { hero = findFan(opts.heroI); heroBy = hero >= 0 ? 'opts.heroI' : ''; }
  if (hero < 0 && !placeholder && m) {
    hero = findFan(SECTION8.i);
    if (hero >= 0) heroBy = 'section8';
    else warnings.push(`the section-8 quasar (fan record ${SECTION8.i}) has no skewer in this file: the hero falls back to the day-1 rule`);
  }
  if (hero < 0 && m) {
    const zq = j => (z ? z[skI[j]] : NaN), len = j => rE[j] - rS[j];
    const central = j => Math.abs(Math.atan2(x[skI[j]], y[skI[j]]) - thetaMid) <= 0.1 * span;
    const [medLen] = quantiles(Array.from({ length: m }, (_, j) => len(j)), [0.5]);
    const score = j => (z ? Math.abs(zq(j) - HERO_ZQ) : Math.abs(len(j) - medLen));
    for (const pool of [central, () => true]) {
      for (let j = 0; j < m; j++) if (pool(j) && (hero < 0 || score(j) < score(hero))) hero = j;
      if (hero >= 0) break;
    }
    heroBy = 'rule';
  }
  const max = opts.skewerMax === undefined ? SKEWERS_DRAWN : opts.skewerMax;
  let chosen = Array.from({ length: m }, (_, j) => j);
  if (max > 0 && m > max) {
    chosen = chosen.sort((a, b) => hash32(a, 0x5ce3) - hash32(b, 0x5ce3) || a - b).slice(0, max);
    if (hero >= 0 && !chosen.includes(hero)) chosen[chosen.length - 1] = hero;
    chosen.sort((a, b) => a - b);
  }
  const inst = new Float32Array(8 * chosen.length);
  let heroInst = -1;
  chosen.forEach((j, q) => {
    const i = skI[j];
    inst.set([Math.atan2(x[i], y[i]), rS[j], rE[j], key[i], 1, j === hero ? 1 : 0, 0, 0], 8 * q);
    if (j === hero) heroInst = q;
  });
  const [midR] = quantiles(Array.from({ length: m }, (_, j) => 0.5 * (rS[j] + rE[j])), [0.5]);
  let heroInfo = null;
  if (hero >= 0) {
    const i = skI[hero], lam = r => LYA_A * (1 + zAtDistance(dc, r));
    heroInfo = {
      skewer: hero, i, by: heroBy, targetid: heroBy === 'section8' ? SECTION8.targetid : null,
      theta: Math.atan2(x[i], y[i]), z: z ? z[i] : NaN, inst: heroInst, qx: x[i], qy: y[i], rq: Math.hypot(x[i], y[i]),
      span: span_, rStart: rS[hero], rEnd: rE[hero],
      winStart: sk.rStart[hero], winEnd: sk.rEnd[hero],
      dStart: sk.dStart ? sk.dStart[hero] : NaN, dEnd: sk.dEnd ? sk.dEnd[hero] : NaN,
      lamStart: lam(rS[hero]), lamEnd: lam(rE[hero]),
    };
  } else warnings.push('no skewers: the isolate step has nothing to isolate');

  const points = new Float32Array(4 * n);
  for (let i = 0; i < n; i++) { points[4 * i] = x[i]; points[4 * i + 1] = y[i]; points[4 * i + 2] = key[i]; points[4 * i + 3] = group[i]; }

  const geo = { theta0, theta1, thetaMid, span, rMax, bbox: [bx0, by0, bx1, by1], secA, secS, secW };
  const pairs = opts.pairs === false ? null : preparePairs({ n, x, y, chan }, geo);
  const ringC = pairs ? [pairs.dx[pairs.g], pairs.dy[pairs.g]] : [groupR[1].med * Math.sin(thetaMid), groupR[1].med * Math.cos(thetaMid)];
  const ring = { x: ringC[0], y: ringC[1], r: R_D_H };
  let spacing = null;
  if (opts.spectrum && heroInfo && heroInfo.targetid && Number(opts.spectrum.targetid) === Number(heroInfo.targetid)) {
    spacing = prepareSpacing(opts.spectrum, { dStart: heroInfo.rStart, dEnd: heroInfo.rEnd }, dc);
    if (!spacing) warnings.push('the spectrum gave too few dips: the close has no spacing inset');
  } else if (opts.spectrum) warnings.push('the spectrum given is not the hero\'s: the close has no spacing inset');

  let readSim = null;
  if (opts.simLyman && opts.spectrum && heroInfo && heroInfo.targetid && Number(opts.spectrum.targetid) === Number(heroInfo.targetid)) {
    try { readSim = prepareReadSim(opts.simLyman, opts.spectrum, heroInfo, dc); } catch (e) { warnings.push(`sim_lyman.json: ${e.message}`); }
  }
  let lya = null;
  if (opts.lyaPairs) {
    try { lya = prepareLyaPairs(opts.lyaPairs, fan.x, fan.y, dc); } catch (e) { warnings.push(`lya_pairs.json: ${e.message}`); }
  }
  let desi = null;
  if (opts.xiTracers) {
    try { desi = prepareDesiXi(opts.xiTracers, pairs ? zAtDistance(dc, pairs.patch.rc) : NaN); } catch (e) { warnings.push(`xi_tracers.json: ${e.message}`); }
  }

  const provenance = {
    ...PROVENANCE,
    skewers: { ...PROVENANCE.skewers, span: span_, drawn: chosen.length, total: m },
    hero: heroInfo ? { ...PROVENANCE.hero, by: heroBy, fan_i: heroInfo.i, targetid: heroInfo.targetid, z: heroInfo.z,
      drawn_hmpc: [heroInfo.rStart, heroInfo.rEnd], lambda_A: [heroInfo.lamStart, heroInfo.lamEnd] } : null,
    pairs: pairs ? { ...PROVENANCE.pairs, n: pairs.n, patch: pairs.patch, bins: pairs.bins, DD: Array.from(pairs.DD),
      RR: Array.from(pairs.RR), xi: Array.from(pairs.xi) } : null,
    spacing: spacing ? { ...PROVENANCE.spacing, range_hmpc: spacing.range, iqr_hmpc: [spacing.q1, spacing.q3],
      median_hmpc: spacing.median, n_dips: spacing.nDips, forest_A: spacing.forestLambda, robustness: spacing.robustness } : null,
  };

  return {
    n, D, key, chanKeys, pace: opts.pace === 'time' ? 'time' : 'count', group, points, counts: fan.counts, names: fan.names,
    geo, rho, groupR, ticks, axes, nAxes: axes.length / 4,
    skewers: { inst, count: chosen.length, total: m, midR, hero: heroInfo, span: span_ },
    pairs, ring, spacing, lya, desi, dc, provenance, readSim,
    day0: Number(fan.header.day0_mjd), Om, Or, placeholder, header: fan.header,
    skProvenance: sk.json ? sk.json.provenance : null, warnings,
  };
}

export async function loadSurvey(base, opts = {}) {
  const get = async (name, kind) => {
    const r = await fetch(base + name);
    if (!r.ok) throw new Error(`${base}${name}: ${r.status}. Make the placeholder with: node prototype/survey/placeholder.mjs`);
    return kind === 'json' ? r.json() : r.arrayBuffer();
  };
  const [header, bin, skj] = await Promise.all([get('fan.json', 'json'), get('fan.bin', 'bin'), get('skewers.json', 'json')]);
  const fan = parseFan(header, bin);
  let spectrum = opts.spectrum;
  if (spectrum === undefined && header.placeholder !== true) {
    try { const r = await fetch(`${base}spectra/${SECTION8.targetid}.json`); spectrum = r.ok ? await r.json() : null; } catch { spectrum = null; }
  }
  let lyaPairs = opts.lyaPairs, xiTracers = opts.xiTracers;
  if (lyaPairs === undefined && header.placeholder !== true) {
    try { const r = await fetch(`${base}lya_pairs.json`); lyaPairs = r.ok ? await r.json() : null; } catch { lyaPairs = null; }
  }
  if (xiTracers === undefined && header.placeholder !== true && DESI_CURVES) {
    try { const r = await fetch(`${base}charts/xi_tracers.json`); xiTracers = r.ok ? await r.json() : null; } catch { xiTracers = null; }
  }
  let simLyman = opts.simLyman;
  if (simLyman === undefined && header.placeholder !== true) {
    try { const r = await fetch(`${base}charts/sim_lyman.json`); simLyman = r.ok ? await r.json() : null; } catch { simLyman = null; }
  }
  return prepareSurvey(fan, parseSkewers(skj, fan.n), { ...opts, spectrum, lyaPairs, xiTracers, simLyman });
}
