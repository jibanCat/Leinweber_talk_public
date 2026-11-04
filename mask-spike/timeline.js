
import { DV, CENTER, HALF, PLOT_WIDTH, PLOT_H } from '../ghosts-spike/ghosts.js';
import { RECORD, steadyAmpKnots } from '../record/framing.js';

export const DLA_ROW = 341;
const NY = 480, ROW = 1 / NY;
const Y_DLA = 0.5 - (DLA_ROW + 0.5) / NY;
const X_DLA = (752 + 0.5) / 1389 - 0.5;

const FRAME_W = DV * 1389 * PLOT_WIDTH / (2 * HALF);

const WHOLE = {
  elev: 0, azim: 0, fov: 0.5, frame: 0.80, driftX: 0, lookY: Y_DLA,
  traceN: 0, traceAmp: PLOT_H, traceSpread: 0.045, traceOp: 1, traceInk: 0,
  revealN: 0, sheetAmt: 0, slabW: 0,
  mask: 0, cut: 0, fill: 0, inkScale: 1,
  fitW: 1, frameW: PLOT_WIDTH, lineW: RECORD.lineW, win: 0,
  box: 0, heroLine: 0, heroGap: 1,
};
const MATCH = { ...WHOLE, frameW: FRAME_W, driftX: (CENTER / DV + 0.5) / 1389 - 0.5,
  traceAmp: PLOT_H * 2 * HALF / (DV * 1389), lineW: RECORD.lineW, win: 1 };
export const REST = [MATCH];
REST.push({ ...WHOLE, mask: 1 });
REST.push({ ...REST[1], traceN: 3, traceAmp: 0.12, fitW: 0 });
REST.push({ ...REST[2], traceN: 20, traceAmp: 0, traceSpread: ROW, traceOp: 0, traceInk: 1,
  revealN: 241, sheetAmt: 0.35, cut: 1, box: 1, heroLine: 1,
  elev: 26, azim: 60, fov: 34, frame: 0.68, lookY: -0.08, slabW: 0.5 });
REST.push({ ...REST[3], driftX: X_DLA, lookY: Y_DLA, frame: 2.4, inkScale: 0.5, sheetAmt: 0.2 });
REST.push({ ...REST[4], fill: 1 });

export const STEPS = [
  null,
  { dur: 4.0, linear: ['traceAmp'], curves: {
      frameW: [[0, 0], [0.4, 0], [1, 1]], driftX: [[0, 0], [0.4, 0], [1, 1]],
      traceAmp: [[0, 0], ...steadyAmpKnots(MATCH, WHOLE, 0.4, 1, MATCH.traceAmp, WHOLE.traceAmp)],
      lineW: [[0, 0], [0.4, 0], [1, 1]], win: [[0, 0], [0.4, 0], [0.8, 1]], mask: [[0, 0], [0.35, 1]],
  } },
  { dur: 2.4 },
  { dur: 6.0, curves: {
      traceSpread: [[0, 0], [0.25, 1]], traceAmp: [[0, 0], [0.25, 1]], traceInk: [[0, 0], [0.25, 1]],
      traceOp: [[0, 0], [0.2, 0], [0.4, 1]],
      revealN: [[0, 0], [0.1, 0], [0.4, 1]], sheetAmt: [[0, 0], [0.1, 0], [0.35, 1]], cut: [[0, 0], [0.1, 0], [0.35, 1]],
      elev: [[0, 0], [0.35, 0], [0.95, 1]], azim: [[0, 0], [0.35, 0], [0.95, 1]], fov: [[0, 0], [0.35, 0], [0.9, 1]],
      frame: [[0, 0], [0.35, 0], [1, 1]], lookY: [[0, 0], [0.35, 0], [1, 1]],
      slabW: [[0, 0], [0.4, 0], [1, 1]], box: [[0.5, 0], [1, 1]], heroLine: [[0.4, 0], [0.9, 1]],
  } },
  { dur: 4.0 },
  { dur: 3.0 },
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
