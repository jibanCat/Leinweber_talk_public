
import { DESI_CURVES } from '../program.js';

const R0 = {
  fill: 0, stag: 0, sep: 0,
  opB: 1, opL: 1, opE: 1, opQ: 1, opY: 1, sk: 1,
  iso: 0, cam: 0, heroW: 0, heroQ: 0,
  axes: 1, zlab: 1, tlab: 0, lyalab: 0, date: 1, tkey: 0,
  pz: 0, pclip: 0, pbox: 0, panel: 0, dd: 0, rnd: 0, rr: 0, xi: 0, bao: 0, spl: 0,
  ring: 0, gap: 0, mk: 1, fold: 0,
  lz: 0, lfield: 0, lq: 0, lpanel: 0, lk: 0, lA: 0, lX: 0, lscale: 0,
  slice: 0, desi: 0, dr: 0,
  rp: 0,
  ra: 0, rs: 0,
};
export const KEYS = Object.keys(R0);

const FAN_REST = [{ ...R0, date: 0, slice: 1 }];
FAN_REST.push({ ...R0, fill: 1, tkey: 1 });
FAN_REST.push({ ...FAN_REST[1], sep: 1, tlab: 1, date: 0, tkey: 0 });
FAN_REST.push({ ...FAN_REST[2], sep: 0, opB: 0, opL: 0, opE: 0, opQ: 0, opY: 0.45, tlab: 0, lyalab: 1, zlab: 1 });
FAN_REST.push({ ...FAN_REST[3], iso: 1, cam: 1, heroW: 1, heroQ: 1, opY: 0, axes: 0, zlab: 0, lyalab: 0 });

const FAN_STEPS = [
  null,
  { dur: 7.0, linear: ['fill'], curves: { tkey: [[0.02, 0], [0.15, 1]], slice: [[0, 0], [0.07, 1]], date: [[0.08, 0], [0.16, 1]] } },
  { dur: 3.0, curves: { tlab: [[0.55, 0], [1, 1]], date: [[0, 0], [0.3, 1]], tkey: [[0, 0], [0.12, 1]], sep: [[0.15, 0], [1, 1]] } },
  { dur: 3.5, curves: {
      opB: [[0, 0], [0.55, 1]], opL: [[0, 0], [0.55, 1]], opE: [[0, 0], [0.55, 1]], opQ: [[0, 0], [0.55, 1]],
      opY: [[0, 0], [0.55, 1]], sep: [[0.2, 0], [1, 1]], tlab: [[0, 0], [0.25, 1]],
      lyalab: [[0.65, 0], [1, 1]], zlab: [[0.6, 0], [1, 1]] } },
  { dur: 4.5, curves: {
      iso: [[0.05, 0], [0.7, 1]], cam: [[0.1, 0], [1, 1]], heroW: [[0.05, 0], [0.45, 1]], heroQ: [[0.5, 0], [0.9, 1]],
      opY: [[0, 0], [0.6, 1]],
      axes: [[0, 0], [0.35, 1]], zlab: [[0, 0], [0.25, 1]], lyalab: [[0, 0], [0.1, 1]] } },
];

const P0 = { ...FAN_REST[1], dr: 1 };
const P1 = { ...P0, opB: 0, opE: 0, opQ: 0, opY: 0, sk: 0, axes: 0, zlab: 0, date: 0, tkey: 0, dr: 0, pz: 1, pclip: 1, pbox: 1 };
const P2 = { ...P1, panel: 1, dd: 1 };
const P3 = { ...P2, rnd: 1, rr: 1, opL: 0.35 };
const P4 = { ...P3, rnd: 0, xi: 1 };
const P5 = { ...P4, bao: 1, opL: 1, desi: 1 };
const P6 = { ...P5, spl: 1 };
const P7 = { ...P1, panel: 1, bao: 1, desi: 1 };
const P8 = { ...P3, rnd: 0, opL: 1, bao: 1 };
const PAIRS_REST = [P0, P1, P2, P3, P4, P5, P6, P7, P8];
const PAIRS_STEPS = [
  null,
  { dur: 3.0, curves: {
      opB: [[0, 0], [0.4, 1]], opE: [[0, 0], [0.4, 1]], opQ: [[0, 0], [0.4, 1]], opY: [[0, 0], [0.4, 1]], sk: [[0, 0], [0.4, 1]],
      axes: [[0, 0], [0.3, 1]], zlab: [[0, 0], [0.25, 1]], date: [[0, 0], [0.25, 1]], tkey: [[0, 0], [0.12, 1]], dr: [[0, 0], [0.2, 1]],
      pz: [[0.15, 0], [1, 1]], pclip: [[0.3, 0], [0.8, 1]], pbox: [[0.65, 0], [1, 1]] } },
  { dur: 6.0, linear: ['dd'], curves: { panel: [[0, 0], [0.12, 1]], dd: [[0.1, 0], [1, 1]] } },
  { dur: 5.0, linear: ['rr'], curves: { rnd: [[0, 0], [0.2, 1]], opL: [[0, 0], [0.2, 1]], rr: [[0.2, 0], [1, 1]] } },
  { dur: 6.0, linear: ['xi'], curves: { rnd: [[0, 0], [0.2, 1]], opL: [[0, 0], [0.2, 1]], xi: [[0.12, 0], [1, 1]] } },
  { dur: 9.0, linear: ['bao', 'desi'], curves: { opL: [[0, 0], [0.27, 1]], bao: [[0.062, 0], [0.533, 1]], desi: [[0.533, 0], [1, 1]] } },
  { dur: 3.0 },
  { dur: 11.0, linear: ['bao', 'desi'], curves: {
      opB: [[0.08, 0], [0.2, 1]], opE: [[0.08, 0], [0.2, 1]], opQ: [[0.08, 0], [0.2, 1]], opY: [[0.08, 0], [0.2, 1]], sk: [[0.08, 0], [0.2, 1]],
      axes: [[0.08, 0], [0.18, 1]], zlab: [[0.08, 0], [0.16, 1]], date: [[0.08, 0], [0.16, 1]], tkey: [[0.08, 0], [0.12, 1]], dr: [[0.08, 0], [0.14, 1]],
      pz: [[0.15, 0], [0.42, 1]], pclip: [[0.2, 0], [0.38, 1]], pbox: [[0.36, 0], [0.45, 1]],
      opL: [[0.2, 0], [0.3, 1]], panel: [[0.74, 0], [0.8, 1]], dd: [[0.0, 0], [0.1, 1]], rr: [[0.0, 0], [0.1, 1]], xi: [[0.0, 0], [0.1, 1]], rnd: [[0.0, 0], [0.1, 1]], spl: [[0.0, 0], [0.1, 1]],
      bao: [[0.46, 0], [0.7, 1]], desi: [[0.74, 0], [1, 1]] } },
  { dur: 6.0, linear: ['bao'], curves: { rnd: [[0, 0], [0.2, 1]], opL: [[0, 0], [0.3, 1]], bao: [[0.08, 0], [0.75, 1]] } },
];

const C0 = { ...FAN_REST[1], date: 0, tkey: 0, fold: 1 };
const C1 = { ...C0, ring: 1 };
const C2 = { ...C1, gap: 1, heroW: 1, iso: 0.5 };
const C3 = { ...C2, opB: 0, opL: 0, opE: 0, opQ: 0, opY: 0, sk: 0, axes: 0, zlab: 0, mk: 0 };
const CLOSE_REST = [C0, C1, C2, C3];
const CLOSE_STEPS = [
  null,
  { dur: 2.5, linear: ['ring'], curves: { ring: [[0.1, 0], [0.9, 1]] } },
  { dur: 4.0, linear: ['gap'], curves: { heroW: [[0, 0], [0.25, 1]], iso: [[0, 0], [0.25, 1]], gap: [[0.08, 0], [1, 1]] } },
  { dur: 2.5 },
];

const Y0 = DESI_CURVES ? PAIRS_REST[7] : PAIRS_REST[8];
const Y1 = { ...Y0, mk: 0, opL: 0, pz: 0, lz: 1, lfield: 1, lq: 1 };
const Y2 = { ...Y1, lk: 1, lfield: 0.6 };
const Y3 = { ...Y2, lpanel: 1, lA: 1 };
const Y4 = { ...Y3, lX: 1 };
const Y5 = { ...Y4, lscale: 1, lfield: 0.35 };
const LYAPAIRS_REST = [Y0, Y1, Y2, Y3, Y4, Y5];
const LYAPAIRS_STEPS = [
  null,
  { dur: 3.5, curves: {
      mk: [[0, 0], [0.2, 1]], opL: [[0.45, 0], [0.62, 1]],
      pz: [[0.1, 0], [0.75, 1]], lz: [[0.1, 0], [0.75, 1]], lfield: [[0.4, 0], [0.5, 1]], lq: [[0.62, 0], [0.88, 1]] } },
  { dur: 7.0, linear: ['lk'], curves: { lfield: [[0.13, 0], [0.2, 1]] } },
  { dur: 6.0, linear: ['lA'], curves: { lpanel: [[0.15, 0], [0.25, 1]], lA: [[0.2, 0], [1, 1]] } },
  { dur: 6.0, linear: ['lX'], curves: { lX: [[0.15, 0], [1, 1]] } },
  { dur: 4.0, curves: { lscale: [[0.22, 0], [0.6, 1]], lfield: [[0.22, 0], [0.6, 1]] } },
];

const RD0 = DESI_CURVES ? LYAPAIRS_REST[3] : FAN_REST[3];
const RD1 = { ...FAN_REST[4] };
const RD2 = { ...RD1, rp: 1, ra: 1, rs: 1 };
const READINGS_REST = [RD0, RD1, RD2];
const READINGS_STEPS = [
  null,
  DESI_CURVES ? { dur: 6.0, curves: {
      lpanel: [[0.62, 0], [0.72, 1]], lA: [[0.62, 0], [0.72, 1]], lk: [[0.08, 0], [0.14, 1]],
      lq: [[0.03, 0], [0.1, 1]], lfield: [[0.1, 0], [0.24, 1]], pclip: [[0.2, 0], [0.3, 1]], pbox: [[0, 0], [0.05, 1]], bao: [[0, 0], [0.05, 1]], desi: [[0, 0], [0.05, 1]],
      lz: [[0.2, 0], [0.48, 1]], sk: [[0.3, 0], [0.46, 1]],
      iso: [[0.56, 0], [0.74, 1]], cam: [[0.56, 0], [1, 1]], heroW: [[0.62, 0], [0.9, 1]], heroQ: [[0.86, 0], [1, 1]], mk: [[0.94, 0], [1, 1]] } } : FAN_STEPS[4],
  { dur: 6.0, linear: ['rp', 'ra'], curves: { ra: [[0.15, 0], [0.45, 1]], rs: [[0.45, 0], [0.58, 1]], rp: [[0.6, 0], [1, 1]] } },
];

const LINES_REST = [FAN_REST[1], FAN_REST[3], FAN_REST[4]];
const LINES_STEPS = [
  null,
  { dur: 3.5, curves: {
      opB: [[0, 0], [0.6, 1]], opL: [[0, 0], [0.6, 1]], opE: [[0, 0], [0.6, 1]], opQ: [[0, 0], [0.6, 1]],
      opY: [[0.1, 0], [0.7, 1]], date: [[0, 0], [0.3, 1]], lyalab: [[0.6, 0], [1, 1]], tkey: [[0, 0], [0.25, 1]] } },
  FAN_STEPS[4],
];

const smootherstep = x => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);
function fraction(knots, s, linear) {
  if (s <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [s1, u1] = knots[i];
    if (s <= s1) {
      const [s0, u0] = knots[i - 1];
      const x = (s - s0) / (s1 - s0), e = linear ? x : smootherstep(x);
      return e === 1 ? u1 : u0 + (u1 - u0) * e;
    }
  }
  return knots[knots.length - 1][1];
}
const DEFAULT = [[0, 0], [1, 1]];

const bare = o => (DESI_CURVES ? o : Object.assign(o, { desi: 0, lpanel: 0, lA: 0, lX: 0 }));
function makeScene(name, REST, STEPS) {
  const LAST = REST.length - 1;
  function pose(k, s) {
    if (k <= 0) return bare({ ...REST[0] });
    if (k > LAST) return bare({ ...REST[LAST] });
    const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
    for (const key of KEYS) {
      const linear = !!(step.linear && step.linear.includes(key));
      out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, linear));
    }
    return bare(out);
  }
  return { name, REST, STEPS, LAST, pose };
}

export const SCENES = {
  fan: makeScene('fan', FAN_REST, FAN_STEPS),
  pairs: makeScene('pairs', PAIRS_REST, PAIRS_STEPS),
  close: makeScene('close', CLOSE_REST, CLOSE_STEPS),
  lines: makeScene('lines', LINES_REST, LINES_STEPS),
  lyapairs: makeScene('lyapairs', LYAPAIRS_REST, LYAPAIRS_STEPS),
  readings: makeScene('readings', READINGS_REST, READINGS_STEPS),
};

export const REST = FAN_REST;
export const STEPS = FAN_STEPS;
export const LAST = FAN_REST.length - 1;
export const pose = SCENES.fan.pose;

export function configure(o = {}) {
  const stag = o.order === 'tracer' ? 1 : 0;
  for (const sc of Object.values(SCENES)) for (const r of sc.REST) r.stag = stag;
}

export function channelProgress(st, out) {
  for (let c = 0; c < 4; c++) {
    const own = Math.min(1, Math.max(0, st.fill * 4 - c));
    out[c] = st.fill + (own - st.fill) * st.stag;
  }
  return out;
}
