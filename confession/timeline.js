import { REST as MASK } from '../mask-spike/timeline.js';
import { REAL_LIGHT } from '../talk/features.js';

const R0 = { ...MASK[MASK.length - 1], comb: 0, gone: 0, sparse: 0, keptInk: 0, real: 0 };
export const REST = [R0];
REST.push({ ...R0, driftX: 0, lookY: 0, frame: 0.62, inkScale: 0.7, slabW: 1, sheetAmt: 0, fill: 0.6, comb: 1, heroLine: 0 });
REST.push({ ...REST[1], gone: 1, sparse: 1, keptInk: 1, fill: 0, cut: 0 });
if (REAL_LIGHT) {
  REST.push({ ...REST[2], real: 1 });
  REST.push({ ...REST[2] });
}

export const STEPS = [
  null,
  { dur: 8.0, curves: {
      frame: [[0, 0], [0.7, 1]], driftX: [[0, 0], [0.6, 1]], lookY: [[0, 0], [0.6, 1]],
      inkScale: [[0, 0], [0.45, 1]], slabW: [[0.1, 0], [0.6, 1]], sheetAmt: [[0, 0], [0.35, 1]], fill: [[0.3, 0], [0.7, 1]],
      comb: [[0.6, 0], [1, 1]],
  } },
  { dur: 5.0, linear: ['gone'], curves: {
      gone: [[0.05, 0], [0.75, 1]], sparse: [[0.15, 0], [0.8, 1]], keptInk: [[0.35, 0], [0.9, 1]],
      fill: [[0.3, 0], [0.8, 1]], cut: [[0.3, 0], [0.8, 1]],
  } },
  ...(REAL_LIGHT ? [{ dur: 2.5, curves: { real: [[0, 0], [1, 1]] } }, { dur: 2.0, curves: { real: [[0, 0], [1, 1]] } }] : []),
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
  const linear = key => !!(step.linear && step.linear.includes(key));
  for (const key of Object.keys(b)) out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, linear(key)));
  return out;
}
