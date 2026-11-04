import { REST as CONF } from '../confession/timeline.js';
import { RECORD, RECORD_H, steadyAmpKnots } from '../record/framing.js';

const NX = 1389;
export const TROUGH = 838;
const X_TROUGH = (TROUGH + 0.5) / NX - 0.5;
const Y_HERO = 0.5 - (239 + 0.5) / 480;
export const LAND = { frameW: 5, traceAmp: RECORD_H / 5, lineW: RECORD.lineW };

const R0 = { ...CONF[CONF.length - 1], shadow: 0, expect: 0, invert: 0, title: 0 };
export const REST = [R0];
REST.push({ ...R0, sparse: 0, keptInk: 0, comb: 0, gone: 0, mask: 0, box: 0,
  elev: 0, azim: 0, fov: 0.5, slabW: 0, inkScale: 1, sheetAmt: 0, revealN: 0,
  traceN: 0, traceAmp: LAND.traceAmp, traceSpread: 0.045, traceOp: 1, traceInk: 0,
  fitW: 1, frameW: LAND.frameW, frame: 0.8, driftX: X_TROUGH, lookY: Y_HERO, lineW: LAND.lineW,
  shadow: 1, expect: 1 });
REST.push({ ...REST[1], invert: 1, title: 1, shadow: 0, expect: 0 });

const A = [0, 0.18], B = [0.16, 0.5], C = [0.5, 0.72], D = [0.72, 1];
const k = ([a, b]) => [[a, 0], [b, 1]];
export const STEPS = [
  null,
  { dur: 26.0, linear: ['traceAmp'],
    curves: {
      gone: [[0, 0], [0.07, 1]], sparse: [[0.06, 0], [0.16, 1]], keptInk: [[0.06, 0], [0.16, 1]], comb: [[0.1, 0], [0.18, 1]], box: k(B),
      slabW: k(B), elev: k(B), azim: k(B), fov: k(B), inkScale: k(B), frame: k(B),
      revealN: k(C), traceN: k(C), traceSpread: k(C), traceOp: k(C), traceInk: k(C),
      fitW: k(D), frameW: k(B), driftX: k(D), lookY: k(B), lineW: k(D),
      traceAmp: [[0, 0], [0.5, 0], [0.66, 0.28 / LAND.traceAmp], [0.72, 0.28 / LAND.traceAmp],
        ...steadyAmpKnots({ fitW: 0, frame: 0.8, frameW: LAND.frameW, traceAmp: 0.28 },
          { fitW: 1, frame: 0.8, frameW: LAND.frameW, traceAmp: LAND.traceAmp }, D[0], D[1], 0, LAND.traceAmp).slice(1)],
      shadow: [[0.85, 0], [1, 1]], expect: [[0.8, 0], [0.96, 1]],
    },
    via: {
      sheetAmt: [[B[0] + 0.1, 0], [B[1], 1], [C[0] + 0.05, 1], [C[1], 0]],
    } },
  { dur: 6.0, curves: { invert: [[0.3, 0], [0.55, 1]], shadow: [[0.08, 0], [0.28, 1]], expect: [[0.08, 0], [0.28, 1]],
      title: [[0.7, 0], [1, 1]] } },
];
export const LAST = REST.length - 1;

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
function viaValue(pts, s) {
  if (s <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [s1, v1] = pts[i];
    if (s <= s1) { const [s0, v0] = pts[i - 1]; return lerp(v0, v1, smootherstep((s - s0) / (s1 - s0))); }
  }
  return pts[pts.length - 1][1];
}
const DEFAULT = [[0, 0], [1, 1]];

export function pose(k, s) {
  if (k <= 0) return { ...REST[0] };
  const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
  for (const key of Object.keys(b)) {
    if (step.via && step.via[key]) { out[key] = viaValue([[0, a[key]], ...step.via[key], [1, b[key]]], s); continue; }
    out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, !!(step.linear && step.linear.includes(key))));
  }
  return out;
}
