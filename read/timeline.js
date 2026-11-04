import { REST as FOLD } from '../volume-spike/timeline.js';
import { LAND } from '../return/timeline.js';
import { Y_ROW } from './regions.js';
import { RECORD } from '../record/framing.js';
import { DV, CENTER, HALF, PLOT_WIDTH, PLOT_H } from '../ghosts-spike/ghosts.js';

const ROWW = 1 / 480;
const NEUTRAL = { mask: 0, cut: 0, fill: 0, inkScale: 1, fitW: 0, frameW: LAND.frameW, lineW: 1, win: 0,
  comb: 0, gone: 0, sparse: 0, keptInk: 0, shadow: 0, expect: 0, invert: 0, title: 0, word: 0, toRegion: 0, slit: 1,
  ghostWin: 0, box: 0, heroLine: 0, heroGap: 1 };
const R0 = { ...NEUTRAL, ...FOLD[0], lookY: Y_ROW, axis: 0 };
export const REST = [R0];
REST.push({ ...R0, win: 0.55, traceN: 20, traceAmp: 0, traceSpread: ROWW, traceOp: 0, traceInk: 1,
  revealN: 241, sheetAmt: 0.45, slabW: 0.06, inkScale: 0.9, cut: 0, heroLine: 1, heroGap: 0, fitW: 0, lineW: 1,
  elev: 10, azim: 14, fov: 34, frame: 4.2, toRegion: 1 });
REST.push({ ...REST[1], driftX: 0.01, frame: 4.8, elev: 13, azim: 22 });
REST.push({ ...R0, fitW: 1, frameW: DV * 1389 * PLOT_WIDTH / (2 * HALF), driftX: (CENTER / DV + 0.5) / 1389 - 0.5,
  traceAmp: PLOT_H * 2 * HALF / (DV * 1389), lineW: RECORD.lineW, win: 1, ghostWin: 1 });

export const STEPS = [
  null,
  { dur: 4.2, curves: {
      win: [[0, 0], [0.22, 1]],
      traceSpread: [[0.25, 0], [0.45, 1]], traceAmp: [[0.25, 0], [0.45, 1]], traceInk: [[0.25, 0], [0.45, 1]],
      traceOp: [[0.25, 0], [0.35, 0], [0.5, 1]], traceN: [[0.2, 0], [0.3, 1]],
      revealN: [[0.25, 0], [0.5, 1]], sheetAmt: [[0.25, 0], [0.5, 1]], cut: [[0.55, 0], [0.85, 1]],
      elev: [[0.4, 0], [0.95, 1]], azim: [[0.4, 0], [0.95, 1]], fov: [[0.4, 0], [0.9, 1]],
      frame: [[0.4, 0], [1, 1]], fitW: [[0.4, 0], [1, 1]], lineW: [[0.4, 0], [1, 1]],
      toRegion: [[0.4, 0], [1, 1]], slabW: [[0.45, 0], [1, 1]], inkScale: [[0.45, 0], [1, 1]], heroLine: [[0.6, 0], [0.95, 1]],
  } },
  { dur: 5.0, linear: ['driftX'] },
  { dur: 3.0, curves: {
      traceSpread: [[0.5, 0], [0.8, 1]], traceAmp: [[0.5, 0], [0.8, 1]], traceInk: [[0.5, 0], [0.8, 1]],
      traceOp: [[0.55, 0], [0.8, 1]], revealN: [[0.45, 0], [0.75, 1]], sheetAmt: [[0.4, 0], [0.75, 1]], cut: [[0, 0], [0.3, 1]],
      traceN: [[0.75, 0], [0.85, 1]], ghostWin: [[0.44, 0], [0.46, 1]],
    },
    via: { win: [[0.3, 0], [0.6, 0]] } },
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

function viaValue(pts, s) {
  if (s <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [s1, v1] = pts[i];
    if (s <= s1) { const [s0, v0] = pts[i - 1]; return lerp(v0, v1, smootherstep((s - s0) / (s1 - s0))); }
  }
  return pts[pts.length - 1][1];
}

export function pose(k, s) {
  if (k <= 0) return { ...REST[0] };
  const a = REST[k - 1], b = REST[k], step = STEPS[k], out = {};
  for (const key of Object.keys(b)) {
    if (step.via && step.via[key]) { out[key] = viaValue([[0, a[key]], ...step.via[key], [1, b[key]]], s); continue; }
    const linear = !!(step.linear && step.linear.includes(key));
    out[key] = lerp(a[key], b[key], fraction((step.curves && step.curves[key]) || DEFAULT, s, linear));
  }
  return out;
}
