import { REST as FOLD } from '../volume-spike/timeline.js';
import { REST as RET, TROUGH, LAND } from '../return/timeline.js';
import { steadyAmpKnots } from './framing.js';

const NEUTRAL = { mask: 0, cut: 0, fill: 0, inkScale: 1, fitW: 0, frameW: LAND.frameW, lineW: 1, win: 0,
  comb: 0, gone: 0, sparse: 0, keptInk: 0, shadow: 0, expect: 0, invert: 0, title: 0, word: 0, heroGap: 1,
  gas: 0, threads: 0, swap: 0, sweep: 0, vpec: 0 };
const R0 = { ...NEUTRAL, ...FOLD[0] };
const LANDED = RET[1];
export const REST = [R0];
REST.push({ ...R0, expect: 1, shadow: 1, word: 1 });
REST.push({ ...REST[1], word: 0, fitW: 1, frameW: LANDED.frameW, driftX: LANDED.driftX, lookY: LANDED.lookY,
  traceAmp: LANDED.traceAmp, lineW: LANDED.lineW, axis: 0 });
REST.push({ ...REST[2], gas: 1, threads: 1, swap: 1, vpec: 1 });
REST.push({ ...REST[3], sweep: 1 });
REST.push({ ...R0 });
export { TROUGH };

const OUT = 0.3;
export const SWEEP = [
  { k: 721, move: 3.0, hold: 2.2 },
  { k: 772, move: 2.4, hold: 3.0 },
  { k: 835, move: 3.8, hold: 3.0 },
  { k: 902, move: 2.8, hold: 3.0 },
  { k: null, move: 3.6, hold: 0 },
];
export const SWEEP_DUR = SWEEP.reduce((a, p) => a + p.move + p.hold, 0);
export const SWEEP_WORDS = 1.5 / SWEEP_DUR;
const LATE = [[OUT, 0], [1, 1]];
export const STEPS = [
  null,
  { dur: 4.0, curves: { expect: [[0, 0], [0.5, 1]], shadow: [[0.35, 0], [0.85, 1]], word: [[0.7, 0], [1, 1]] } },
  { dur: 4.0, linear: ['traceAmp'], curves: { word: [[0, 0], [0.3, 1]], axis: [[0, 0], [0.3, 1]],
      traceAmp: steadyAmpKnots(REST[1], REST[2], 0, 1, REST[1].traceAmp, REST[2].traceAmp) } },
  { dur: 9.0, linear: ['swap'], curves: { swap: [[0, 0], [0.16, 1]], gas: [[0.12, 0], [0.24, 1]], threads: [[0.22, 0], [0.4, 1]],
      vpec: [[0.52, 0], [0.8, 1]] } },
  { dur: SWEEP_DUR, linear: ['sweep'] },
  { dur: 3.6, linear: ['traceAmp', 'swap'], curves: { threads: [[0, 0], [0.12, 1]], gas: [[0.06, 0], [0.2, 1]], swap: [[0.1, 0], [OUT, 1]],
      sweep: [[OUT, 0], [OUT + 0.01, 1]],
      vpec: [[OUT, 0], [OUT + 0.01, 1]],
      expect: [[0.42, 0], [0.86, 1]], shadow: [[OUT, 0], [0.72, 1]], axis: [[0.79, 0], [1, 1]],
      ...Object.fromEntries(['fitW', 'frameW', 'driftX', 'lookY', 'lineW'].map(k => [k, LATE])),
      traceAmp: steadyAmpKnots(REST[4], REST[5], OUT, 1, REST[4].traceAmp, REST[5].traceAmp) } },
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
