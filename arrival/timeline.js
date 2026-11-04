import { REST as FOLD } from '../volume-spike/timeline.js';
import { LAND } from '../return/timeline.js';

const DIST = 0.14;
const FRAME = 0.5 / (DIST * Math.tan(34 * Math.PI / 360));
const NEUTRAL = { mask: 0, cut: 0, fill: 0, inkScale: 1, fitW: 0, frameW: LAND.frameW, lineW: 1, win: 0,
  comb: 0, gone: 0, sparse: 0, keptInk: 0, shadow: 0, expect: 0, invert: 0, title: 0, word: 0, toRegion: 0, slit: 1,
  qso: 0, band: 0, crossed: 0, bandMove: 0, washScale: 1, thresh: 0.42, heroGap: 1 };
const FOLD0 = { ...NEUTRAL, ...FOLD[0] };

const RIDE = { ...FOLD0, fitW: 0, invert: 1, traceOp: 0, sheetAmt: 0, slabW: 0.045, inkScale: 2.2, washScale: 0.1, thresh: 0.54,
  elev: -4, azim: -84, fov: 34, frame: FRAME, lookY: FOLD0.lookY, qso: 1, band: 1, axis: 0 };
export const REST = [
  { ...RIDE, driftX: 0.5 + DIST },
];
REST.push({ ...RIDE, driftX: -0.5 + DIST, crossed: 1 });
REST.push({ ...FOLD0, crossed: 1, bandMove: 1 });

const CAM = ['elev', 'azim', 'fov', 'frame', 'driftX', 'lookY', 'fitW', 'lineW'];
export const STEPS = [
  null,
  { dur: 24.0, linear: ['driftX', 'crossed'] },
  { dur: 5.0, curves: {
      inkScale: [[0, 0], [0.25, 1]], slabW: [[0, 0], [0.3, 1]], qso: [[0, 0], [0.25, 1]],
      ...Object.fromEntries(CAM.map(k => [k, [[0.3, 0], [0.34, 1]]])),
      bandMove: [[0.08, 0], [0.5, 1]],
      invert: [[0.5, 0], [0.62, 1]],
      traceOp: [[0.55, 0], [0.8, 1]], band: [[0.52, 0], [0.82, 1]], axis: [[0.8, 0], [1, 1]],
  } },
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
const DEFAULT = [[0, 0], [1, 1]];

export function pose(k, s) {
  if (k <= 0) return { ...REST[0] };
  const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
  for (const key of Object.keys(b)) {
    const linear = !!(step.linear && step.linear.includes(key));
    out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, linear));
  }
  return out;
}
