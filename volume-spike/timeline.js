
import { RECORD, steadyAmpKnots } from '../record/framing.js';

export const HERO = 239;
export const NY = 480;
export const ROW = 1 / NY;

const R0 = {
  elev: 0, azim: 0, fov: 0.5, frame: 0.80, driftX: 0, lookY: 0,
  traceN: 0, traceAmp: 0.28, traceSpread: 0.045, traceOp: 1, traceInk: 0,
  revealN: 0, sheetAmt: 0, slabW: 0,
  fitW: 0, frameW: RECORD.frameW, lineW: 1,
  box: 0, heroLine: 0,
  axis: 0, axisDist: 0,
};
export const REST = [
  { ...R0, ...RECORD, axis: 1 },
  { ...R0, traceN: 3, traceAmp: 0.12, frame: 1.2, axis: 1, axisDist: 1 },
  { ...R0, traceN: 20, traceAmp: 0.03, traceSpread: 0.011, frame: 1.2, axis: 1, axisDist: 1 },
  { ...R0, traceN: 20, traceAmp: 0, traceSpread: ROW, traceOp: 0, traceInk: 1,
    revealN: 241, sheetAmt: 1, axisDist: 1 },
];
REST.push({ ...REST[3], elev: 26, azim: 60, fov: 34, frame: 0.68, lookY: -0.08, slabW: 0.5, sheetAmt: 0.35, box: 1, heroLine: 1 });
REST.push({ ...REST[4], driftX: 0.12, frame: 0.85 });
REST.push({ ...REST[5], frame: 0.50 });
REST.push({ ...REST[0] });
REST.push({ ...REST[4], slabW: 1, sheetAmt: 0, heroLine: 0, frame: 0.74, zoomIn: 0.22, inkScale: 2.4, comb: 0, combGrow: 0, emph: 0 });
REST.push({ ...REST[8], comb: 1, combGrow: 1, emph: 1, elev: 34 });

export const STEPS = [
  null,
  { dur: 3.0, curves: { axisDist: [[0.35, 0], [0.85, 1]] } },
  { dur: 3.5 },
  { dur: 5.0, curves: {
      traceSpread: [[0, 0], [0.45, 1]],
      traceAmp: [[0, 0], [0.45, 1]],
      traceInk: [[0, 0], [0.45, 1]],
      revealN: [[0, 0], [0.25, 0], [0.55, 20 / 241], [1, 1]],
      sheetAmt: [[0, 0], [0.25, 0], [0.5, 1]],
      traceOp: [[0, 0], [0.4, 0], [0.7, 1]],
      axis: [[0, 0], [0.25, 1]],
  } },
  { dur: 5.5, curves: {
      elev: [[0, 0], [0.9, 1]],
      azim: [[0, 0], [0.9, 1]],
      fov: [[0, 0], [0.85, 1]],
      frame: [[0, 0], [1, 1]],
      lookY: [[0, 0], [1, 1]],
      slabW: [[0, 0], [0.06, 0], [0.75, 1]],
      box: [[0.3, 0], [0.9, 1]], heroLine: [[0.3, 0], [0.8, 1]],
      sheetAmt: [[0, 0], [0.2, 0], [0.8, 1]],
  } },
  { dur: 7.5, linear: ['driftX'],
    via: {
      azim: [[0.35, 18], [0.6, 18]],
      sheetAmt: [[0.3, 0.08], [0.65, 0.08]],
    } },
  { dur: 3.5 },
  { dur: 5.5, curves: {
      slabW: [[0, 0], [0.4, 1]], elev: [[0, 0], [0.45, 1]], azim: [[0, 0], [0.45, 1]], fov: [[0, 0], [0.45, 1]],
      box: [[0, 0], [0.35, 1]], heroLine: [[0, 0], [0.3, 1]],
      driftX: [[0, 0], [0.45, 1]], lookY: [[0, 0], [0.45, 1]], frame: [[0, 0], [0.45, 1]],
      revealN: [[0.5, 0], [0.72, 1]], traceN: [[0.5, 0], [0.72, 1]], traceSpread: [[0.5, 0], [0.72, 1]],
      traceInk: [[0.5, 0], [0.72, 1]], traceOp: [[0.52, 0], [0.75, 1]],
      axisDist: [[0, 0], [0.1, 1]], axis: [[0.8, 0], [1, 1]],
      fitW: [[0.75, 0], [1, 1]], lineW: [[0.75, 0], [1, 1]],
      traceAmp: [[0, 0], [0.5, 0], [0.7, 0.28 / RECORD.traceAmp], [0.75, 0.28 / RECORD.traceAmp],
        ...steadyAmpKnots({ ...R0, frameW: RECORD.frameW }, REST[0], 0.75, 1, 0, RECORD.traceAmp)],
    },
    linear: ['traceAmp'],
    via: { sheetAmt: [[0.15, 1], [0.5, 1], [0.72, 0]] } },
  { dur: 5.5, curves: { elev: [[0, 0], [0.9, 1]], azim: [[0, 0], [0.9, 1]], fov: [[0, 0], [0.85, 1]], slabW: [[0.06, 0], [0.75, 1]], box: [[0.3, 0], [0.9, 1]] } },
  { dur: 6.0, linear: ['combGrow'], curves: { comb: [[0.05, 0], [0.15, 1]], combGrow: [[0.1, 0], [1, 1]] } },
];
export const LAST = REST.length - 1;

export function configure(o) {
  const fold = {};
  for (const key of ['elev', 'azim', 'fov', 'frame', 'sheetAmt']) if (Number.isFinite(o[key])) fold[key] = o[key];
  Object.assign(REST[4], fold);
  Object.assign(REST[5], fold, Number.isFinite(o.drift) ? { driftX: o.drift } : {});
  Object.assign(REST[6], fold, Number.isFinite(o.drift) ? { driftX: o.drift } : {}, Number.isFinite(o.pull) ? { frame: o.pull } : {});
}

const smootherstep = x => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);

function fraction(knots, s, linear) {
  if (s <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [s1, u1] = knots[i];
    if (s <= s1) {
      const [s0, u0] = knots[i - 1];
      const x = (s - s0) / (s1 - s0);
      const e = linear ? x : smootherstep(x);
      return e === 1 ? u1 : u0 + (u1 - u0) * e;
    }
  }
  return knots[knots.length - 1][1];
}

const DEFAULT = [[0, 0], [1, 1]];

function viaValue(pts, s, linear) {
  if (s <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [s1, v1] = pts[i];
    if (s <= s1) {
      const [s0, v0] = pts[i - 1];
      const x = (s - s0) / (s1 - s0);
      return lerp(v0, v1, linear ? x : smootherstep(x));
    }
  }
  return pts[pts.length - 1][1];
}

export function pose(k, s) {
  if (k <= 0) return { ...REST[0] };
  const a = REST[k - 1], b = REST[k], step = STEPS[k];
  const out = {};
  for (const key of Object.keys(b)) {
    const linear = !!(step.linear && step.linear.includes(key));
    const av = a[key] === undefined ? (key === 'combGrow' || key === 'inkScale' ? 1 : 0) : a[key];
    if (step.via && step.via[key]) { out[key] = viaValue([[0, av], ...step.via[key], [1, b[key]]], s, linear); continue; }
    const knots = (step.curves && step.curves[key]) || DEFAULT;
    out[key] = lerp(av, b[key], fraction(knots, s, linear));
  }
  return out;
}
