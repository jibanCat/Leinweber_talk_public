
import * as fold from '../volume-spike/timeline.js';
import * as ghosts from '../ghosts-spike/timeline.js';
import * as mask from '../mask-spike/timeline.js';
import * as confession from '../confession/timeline.js';
import * as ret from '../return/timeline.js';
import * as record from '../record/timeline.js';
import * as read from '../read/timeline.js';
import * as arrival from '../arrival/timeline.js';
import * as texture from '../texture/timeline.js';
import * as SURVEY from '../survey/timeline.js';
import { CLIP_DUR, MORPH_DUR, beamAt, ZOOM_AT, BEAM_TIME } from './beamtime.js';
import { ATOM_DUR } from './atom.js';
import { MAP_DUR } from './map.js';
import { EXPANSION_DUR } from './expansion.js';
import { GAP_DUR } from './gap.js';
import { COUNT_DUR, DIAL_DUR } from './count.js';
import { SCENES as CHART } from '../chart/timeline.js';

const smoother = x => x * x * x * (x * (x * 6 - 15) + 10);
const lerpN = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);
const window01 = (s, a, b) => (s <= a ? 0 : s >= b ? 1 : smoother((s - a) / (b - a)));
const T3_ZOOM = { ...texture.REST[0], zoom: 1 };
const T3_REST = [texture.REST[0], T3_ZOOM, texture.REST[1], texture.REST[2]];
const T3_CURVES = [null, { zoom: [0, 1] }, { ghost: [0.3, 0.45], hot: [0.32, 1], wHot: [0.4, 0.75] }];
const T3_RESET = [0.08, 0.18];
const texture3 = {
  REST: T3_REST, LAST: 3,
  STEPS: [null, { dur: 2.5 }, { dur: 3.0 }, texture.STEPS[2]],
  pose(k, s) {
    if (k <= 0) return { ...T3_REST[0] };
    if (k > 3) return { ...T3_REST[3] };
    if (k === 3) {
      if (s <= 0 || s >= 1) return texture.pose(2, s);
      const out = texture.pose(2, s), [a, b] = T3_RESET, back = s >= a;
      const cur = back ? (s >= b ? 1 : smoother((s - a) / (b - a))) : 1 - smoother(s / a);
      return { ...out, hot: back ? 0 : 1, wHot: back ? 0 : 1, cur, keep: 1 };
    }
    const a = T3_REST[k - 1], b = T3_REST[k], c = T3_CURVES[k], out = {};
    for (const key of Object.keys(b)) out[key] = lerpN(a[key], b[key], c[key] ? window01(s, c[key][0], c[key][1]) : (a[key] === b[key] ? 0 : smoother(s)));
    return out;
  },
};
const M3_REST = [mask.REST[0], mask.REST[1], { ...mask.REST[2], traceSpread: 0.10, traceAmp: 0.085 }];
const M3_CURVES = { fitW: [0, 0.45], traceAmp: [0, 0.45], traceSpread: [0.2, 0.55], traceN: [0.4, 0.85] };
const mask3 = {
  REST: M3_REST, LAST: 2,
  STEPS: [null, mask.STEPS[1], mask.STEPS[2]],
  pose(k, s) {
    if (k <= 1) return mask.pose(k, s);
    if (k > 2) return { ...M3_REST[2] };
    const a = M3_REST[1], b = M3_REST[2], out = {};
    for (const key of Object.keys(b)) {
      const c = M3_CURVES[key];
      out[key] = lerpN(a[key], b[key], a[key] === b[key] ? 0 : c ? window01(s, c[0], c[1]) : smoother(s));
    }
    return out;
  },
};
export { CLIP_DUR };
const ease_ = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)), rmp = (x, a, b) => ease_((x - a) / (b - a));
const pulse = (w, a, d) => (w > a && w < a + d ? (w - a) / d : 0);
const PACE = 1.5;
const trapT = (d, v, a, b) => d / v + (a + b) / 2;
const trap = (w, d, v, a, b) => { const T = trapT(d, v, a, b);
  return w <= 0 ? 0 : w >= T ? d : w < a ? (v * w * w) / (2 * a) : w <= T - b ? (v * a) / 2 + v * (w - a) : d - (v * (T - w) * (T - w)) / (2 * b); };
const T1 = 0.0215, T2 = 0.045, T3 = 0.0745, T5 = 0.22, W5 = T5 * BEAM_TIME.base;
const WH = ZOOM_AT + BEAM_TIME.in + 0.5 * BEAM_TIME.hold;
const GO5 = 3.0, LEG5 = [T5 * BEAM_TIME.base, 1 / PACE, 1.0, 1.0], LEG6 = [WH - W5, 1 / PACE, 1.0, 0], LEG7 = [CLIP_DUR - WH, 1 / PACE, 0.6, 0.8];
export const BEAM_DUR = [10.0, 8.0, 8.0, 11.0, GO5 + trapT(...LEG5) + 1.6, trapT(...LEG6), trapT(...LEG7)];
const base_ = { m: 1, f: 1, hy: 0, gb: 1, sz: 0, t: 0, z: 0, u: 0, a: 1, o: 1, L: 0, h: 0, sc: 0, tr: 0, hs: 0, hsw: 0, fc: 0, wd: 0, pz: 0, gh: 0, bp: 0, sp: 0, fa: 0 };
const TREE_ = { sc: 1, tr: 1, pz: 1 };
const CLIP_REST = [{ ...base_, ...TREE_, gb: 0, a: 0, o: 0, wd: 1, pz: 0 }, { ...base_, ...TREE_, gb: 0, t: 1, a: 0, o: 0, wd: 1 },
  { ...base_, ...TREE_, t: T1, sz: 1, L: 1, h: 1 }, { ...base_, ...TREE_, t: T3, sz: 1, L: 1 }, { ...base_, tr: 1, t: T3, sz: 1, pz: 1, hs: 1, sp: 1 },
  { ...base_, t: T5, fc: 1 }, { ...base_, ...beamAt(WH / CLIP_DUR) }, { ...base_, t: 1, u: 1 }];
const clip = {
  REST: CLIP_REST, LAST: 7, STEPS: [null, ...BEAM_DUR.map(dur => ({ dur }))],
  pose(k, s) {
    const c = Math.min(1, Math.max(0, s));
    if (k <= 0) return { ...CLIP_REST[0] };
    if (k === 1) { const w = c * BEAM_DUR[0]; return { ...CLIP_REST[0], t: ease_(Math.min(1, Math.max(0, (w - 0.8) / 4.8))), gh: rmp(w, 0.4, 1.0) * (1 - rmp(w, 6.2, 6.8)), pz: rmp(w, 6.6, 9.2) }; }
    if (k === 2) { const w = c * BEAM_DUR[1], back = rmp(w, 0, 0.8);
      return { ...base_, ...TREE_, gb: rmp(w, 0.4, 1.2), t: w < 1.2 ? 1 - back : T1 * ease_((w - 1.2) / 2.2), a: rmp(w, 1.2, 1.4),
        bp: pulse(w, 3.3, 1.4), L: rmp(w, 3.1, 3.5), sz: rmp(w, 4.6, 5.8), h: rmp(w, 5.8, 6.4) }; }
    if (k === 3) { const w = c * BEAM_DUR[2];
      const t = w < 3.2 ? T1 + (T2 - T1) * rmp(w, 0.8, 3.2) : T2 + (T3 - T2) * rmp(w, 4.2, 6.6);
      return { ...base_, ...TREE_, t, sz: 1, L: 1, h: 1 - rmp(w, 0, 0.5), bp: pulse(w, 3.1, 1.4) || pulse(w, 6.5, 1.4) }; }
    if (k === 4) { const w = c * BEAM_DUR[3];
      return { ...base_, tr: 1, t: T3, sz: 1, pz: 1, sc: 1 - rmp(w, 0.6, 2.0), L: 1 - rmp(w, 0, 0.6), hs: rmp(w, 2.6, 3.4), sp: rmp(w, 6.4, 8.4) }; }
    if (k === 5) { const w = c * BEAM_DUR[4], E = GO5 + trapT(...LEG5);
      return { ...base_, hs: 1 - rmp(w, 0, 0.8), sp: 1, tr: 1 - rmp(w, 2.0, 2.4), a: 1 - rmp(w, 0.6, 1.2) + rmp(w, 2.4, 3.0),
        t: w < GO5 ? T3 * (1 - rmp(w, 0.6, 2.4)) : trap(w - GO5, ...LEG5) / BEAM_TIME.base,
        sz: 1 - rmp(w, 0.8, 2.0), pz: 1 - rmp(w, E + 0.2, E + 1.2), fa: rmp(w, 1.0, 1.6), fc: rmp(w, E - 0.8, E - 0.2) }; }
    if (k === 6) { const w = c * BEAM_DUR[5]; return { ...base_, fc: 1 - rmp(w, 0, 0.6), ...beamAt((W5 + trap(w, ...LEG6)) / CLIP_DUR) }; }
    if (k === 7) { const w = c * BEAM_DUR[6]; return { ...base_, ...beamAt((WH + trap(w, ...LEG7)) / CLIP_DUR) }; }
    return { ...CLIP_REST[7] };
  },
};
const map = {
  REST: [{ p: 0 }, { p: 1 }], LAST: 1, STEPS: [null, { dur: MAP_DUR }],
  pose(k, s) { return k <= 0 ? { p: 0 } : k > 1 ? { p: 1 } : { p: Math.min(1, Math.max(0, s)) }; },
};
const lyman = {
  REST: [{ p: 0 }, { p: 1 }], LAST: 1, STEPS: [null, { dur: ATOM_DUR[0] }],
  pose(k, s) { return k <= 0 ? { p: 0 } : k > 1 ? { p: 1 } : { p: Math.min(1, Math.max(0, s)) }; },
};
const expansion = {
  REST: [{ p: 0 }, { p: 1 }], LAST: 1, STEPS: [null, { dur: EXPANSION_DUR }],
  pose(k, s) { return k <= 0 ? { p: 0 } : k === 1 ? { p: Math.min(1, Math.max(0, s)) } : { p: 1 }; },
};
const gap = {
  REST: [0, 1, 2, 3, 4, 5, 6].map(p => ({ p })), LAST: 6, STEPS: [null, ...GAP_DUR.map(dur => ({ dur }))],
  pose(k, s) { return k <= 0 ? { p: 0 } : k > 6 ? { p: 6 } : { p: k - 1 + Math.min(1, Math.max(0, s)) }; },
};
const count = {
  REST: [{ p: 0 }, { p: 1 }, { p: 2 }], LAST: 2, STEPS: [null, { dur: COUNT_DUR }, { dur: DIAL_DUR }],
  pose(k, s) { return k <= 0 ? { p: 0 } : k > 3 ? { p: 3 } : { p: k - 1 + Math.min(1, Math.max(0, s)) }; },
};
const OWN = { fold, ghosts, mask, mask3, confession, return: ret, record, read, arrival, texture, texture3, clip, expansion, gap, count, lyman, map };
const SURVEY_SCENES = SURVEY.SCENES || { fan: SURVEY };
for (const name of [...Object.keys(SURVEY_SCENES), ...Object.keys(CHART)]) {
  if (OWN[name] || (SURVEY_SCENES[name] && CHART[name])) throw new Error(`scene "${name}" is named twice (survey/, chart/ or the talk's own)`);
}
export const SURVEYS = Object.keys(SURVEY_SCENES);
export const CHARTS = Object.keys(CHART);
export const isSurvey = name => SURVEYS.includes(name);
export const isChart = name => CHARTS.includes(name);
export const SPECTRUM_TURN = [0.08, 0.55];
const SPEC_OPEN0 = 0.4;
const spectrumTalk = CHART.spectrum && {
  ...CHART.spectrum,
  pose(k, s) {
    if (k !== 1 || s <= 0 || s >= 1) return CHART.spectrum.pose(k, s);
    const [a, b] = SPECTRUM_TURN;
    if (s < b) return { ...CHART.spectrum.pose(1, 0), lc: window01(s, a, b) };
    return { ...CHART.spectrum.pose(1, SPEC_OPEN0 + (1 - SPEC_OPEN0) * (s - b) / (1 - b)), lc: 1 };
  },
};
export const SCENES = { ...OWN, ...SURVEY_SCENES, ...CHART, ...(spectrumTalk ? { spectrum: spectrumTalk } : {}) };
export const SPEC_CHART = CHART.spectrum;
export const SEAMLESS = [SURVEYS];
export const seamless = (a, b) => a === b || SEAMLESS.some(g => g.includes(a) && g.includes(b));

export const PENDING = Object.fromEntries(Object.entries({
  fan: 'survey/', pairs: 'survey/', close: 'survey/',
  spectrum: 'chart/', find: 'chart/',
  why: 'a schematic · not assigned yet', emulator: 'a schematic · not assigned yet',
}).filter(([name]) => !SCENES[name]));
