
import { SCENES, seamless, SURVEYS } from './scenes.js';
import { beatsFor, PROGRAM } from './beats.js';
import { LOOK } from './look.js';

export const HANDOVER = 0.9;
const MATCH = 1.4;
const STUB_STEP = 1.2;
const REDUCED = 0.2;
const HOLD = 1.0;
const INVERT = 1.4;
const TURN = [0.5, 0.5];
const IRIS = 1.8;
const TURN_REDUCED = 0.4;

const smootherstep = x => x * x * x * (x * (x * 6 - 15) + 10);
const clamp01 = x => Math.max(0, Math.min(1, x));
const lerp = (a, b, u) => (u === 0 ? a : u === 1 ? b : a + (b - a) * u);
function knotAt(knots, s, linear) {
  if (s <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [s1, u1] = knots[i];
    if (s <= s1) { const [s0, u0] = knots[i - 1], x = (s - s0) / (s1 - s0), e = linear ? x : smootherstep(x); return e === 1 ? u1 : u0 + (u1 - u0) * e; }
  }
  return knots[knots.length - 1][1];
}
const MISSING = { comb: 0, combGrow: 1, inkScale: 1, gone: 0, sparse: 0, keptInk: 0, emph: 0, zoomIn: 0 };
function viaAt(pts, s, linear) {
  if (s <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [s1, v1] = pts[i];
    if (s <= s1) { const [s0, v0] = pts[i - 1], x = (s - s0) / (s1 - s0); return lerp(v0, v1, linear ? x : smootherstep(x)); }
  }
  return pts[pts.length - 1][1];
}
function lerpState(a, b, u, lin = null, cur = null) {
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] === undefined && key in MISSING ? MISSING[key] : a[key], y = b[key] === undefined && key in MISSING ? MISSING[key] : b[key];
    if (typeof x === 'number' && typeof y === 'number' && cur && cur.via && cur.via[key]) { out[key] = viaAt([[0, x], ...cur.via[key], [1, y]], cur.s, !!(lin && lin.keys.includes(key))); continue; }
    if (typeof x === 'number' && typeof y === 'number' && cur) out[key] = lerp(x, y, knotAt(cur.curves[key] || [[0, 0], [1, 1]], cur.s, !!(lin && lin.keys.includes(key))));
    else if (typeof x === 'number' && typeof y === 'number') out[key] = lerp(x, y, lin && lin.keys.includes(key) ? lin.s : u);
    else if (Array.isArray(x) && Array.isArray(y) && x.length === y.length && x.every(Number.isFinite)) out[key] = x.map((v, i) => lerp(v, y[i], u));
    else out[key] = u < 1 ? (key in a ? x : y) : (key in b ? y : x);
    if (b[key] === undefined && (cur ? cur.s : u) >= 1) delete out[key];
    if (a[key] === undefined && (cur ? cur.s : u) <= 0) delete out[key];
  }
  return out;
}

export function buildTalk({ reduced = false, program = PROGRAM, look = LOOK } = {}) {
  const BEATS = beatsFor(program, look);
  const byId = id => BEATS.findIndex(B => B.id === id);
  const RESTS = [], STEPS = [null], ENTRY = [];
  BEATS.forEach((B, beat) => {
    const ks = B.ks ? B.ks
      : B.range ? Array.from({ length: B.range[1] - B.range[0] + 1 }, (_, i) => B.range[0] + i)
      : B.dark.map((_, i) => i);
    const mod = B.scene !== 'stub' ? SCENES[B.scene] : null;
    const live = !!mod && !B.pending && ks.every(k => Number.isInteger(k) && k >= 0 && k <= mod.LAST);
    const stub = !live;
    ks.forEach((k0, i) => {
      const k = live ? k0 : i;
      const rest = { beat, scene: live ? B.scene : 'stub', k, dark: B.dark ? B.dark[i] : 0 };
      if (!live && B.scene !== 'stub') rest.will = B.scene;
      if (B.through && B.through.includes(i) && i < ks.length - 1) rest.through = true;
      const last = RESTS[RESTS.length - 1];
      if (i === 0 && last && B.enter !== 'hold' && ((last.scene === rest.scene && !stub && last.k === k) || B.enter === 'continue')) {
        last.beat = beat; ENTRY[beat] = RESTS.length - 1; return;
      }
      if (i === 0) ENTRY[beat] = RESTS.length;
      if (last) {
        const prev = i > 0 ? { scene: B.scene, k: ks[i - 1] } : last;
        const cont = live && (i > 0 || (B.enter !== 'match' && last.scene !== 'stub' && seamless(last.scene, rest.scene)));
        let kind = i > 0 ? 'step' : 'handover';
        if (cont && prev.scene === rest.scene) kind = k === prev.k ? 'hold' : k === prev.k + 1 ? 'step' : 'jump';
        else if (cont) {
          const a = JSON.stringify(SCENES[prev.scene].pose(prev.k, 1)), to = SCENES[rest.scene];
          kind = k > 0 && a === JSON.stringify(to.pose(k - 1, 1)) ? 'step' : a === JSON.stringify(to.pose(k, 1)) ? 'hold' : 'jump';
        }
        const handover = kind === 'handover', match = handover && B.enter === 'match';
        const hold = kind === 'hold', jump = kind === 'jump';
        const invert = handover && !match && program !== 'v2' && last.dark !== rest.dark;
        const iris = invert && live && last.scene !== 'stub' && SURVEYS.includes(rest.scene) !== SURVEYS.includes(last.scene)
          ? (SURVEYS.includes(rest.scene) ? 1 : -1) : 0;
        const own = (B.durs && B.durs[i]) || 0;
        const dur = match ? own || MATCH : iris ? own || IRIS : invert ? INVERT : handover ? HANDOVER
          : !live ? own || STUB_STEP
          : hold ? own || HOLD
          : jump ? own || (k > 0 ? SCENES[rest.scene].STEPS[k].dur : HANDOVER)
          : own || SCENES[rest.scene].STEPS[k].dur;
        const turns = !handover && B.turn && B.turn[i];
        const step = { dur: reduced ? (turns ? TURN_REDUCED : REDUCED) : dur, handover, match };
        if (jump) step.jump = true;
        if (jump && B.jumpEase === 'own' && live && SCENES[rest.scene].STEPS && SCENES[rest.scene].STEPS[k] && SCENES[rest.scene].STEPS[k].linear)
          step.linear = SCENES[rest.scene].STEPS[k].linear;
        if (jump && live && B.jumpCurves && B.jumpCurves[i]) {
          const J = B.jumpCurves[i];
          step.curves = J.curves || {}; if (J.via) step.via = J.via; if (J.linear) step.linear = J.linear;
        } else if (jump && B.jumpEase === 'curves' && live && SCENES[rest.scene].STEPS && SCENES[rest.scene].STEPS[k]) {
          const T0 = SCENES[rest.scene].STEPS[k];
          step.curves = T0.curves || {}; if (T0.linear) step.linear = T0.linear;
        }
        if (hold) step.hold = true;
        if (invert) step.invert = true;
        if (iris) step.iris = iris;
        if (turns) step.turn = B.turn[i];
        STEPS.push(step);
      }
      RESTS.push(rest);
    });
  });
  const LAST = RESTS.length - 1;

  const sceneAt = (r, s = 1) => (r.scene === 'stub' ? { beat: r.beat, step: r.k - 1 + s } : SCENES[r.scene].pose(r.k, s));
  const restState = r => ({ beat: r.beat, scene: r.scene, s: sceneAt(r), op: 1, dark: r.dark });

  function pose(K, s) { return { K: Math.max(0, K), at: K <= 0 ? 1 : s, ...poseOf(K, s) }; }
  function poseOf(K, s) {
    if (K <= 0) return restState(RESTS[0]);
    const a = RESTS[K - 1], b = RESTS[K], step = STEPS[K];
    const w = step.turn ? (reduced ? [0, 1] : step.turn) : (step.invert ? TURN : null);
    const dark = lerp(a.dark, b.dark, w ? (w[1] > w[0] ? smootherstep(clamp01((s - w[0]) / (w[1] - w[0]))) : s < w[0] ? 0 : 1) : smootherstep(s));
    if (step.match) {
      if (s >= 1) return restState(b);
      return { beat: a.beat, scene: a.scene, s: { ...sceneAt(a), settle: smootherstep(s) }, op: 1, dark };
    }
    if (step.iris && !reduced) {
      if (s <= 0) return restState(a);
      if (s >= 1) return restState(b);
      const into = step.iris > 0, fan = into ? b : a, other = into ? a : b, u = smootherstep(s);
      return { beat: fan.beat, scene: fan.scene, s: sceneAt(fan), op: 1, dark, iris: into ? u : 1 - u,
        under: { beat: other.beat, scene: other.scene, s: sceneAt(other), op: 1 } };
    }
    if (step.handover || reduced) {
      const out = s < 0.5;
      const r = out ? a : b;
      return { beat: r.beat, scene: r.scene, s: sceneAt(r), op: out ? 1 - smootherstep(clamp01(2 * s)) : smootherstep(clamp01(2 * s - 1)), dark };
    }
    if (step.hold) return { beat: b.beat, scene: b.scene, s: sceneAt(b), op: 1, dark };
    if (step.jump) return { beat: b.beat, scene: b.scene, s: lerpState(sceneAt(a), sceneAt(b), smootherstep(s), step.linear ? { keys: step.linear, s } : null, step.curves ? { curves: step.curves, via: step.via, s } : null), op: 1, dark };
    return { beat: b.beat, scene: b.scene, s: sceneAt(b, s), op: 1, dark };
  }

  const beatOf = K => RESTS[K].beat;
  const localOf = K => K - ENTRY[beatOf(K)];
  const idOf = K => BEATS[beatOf(K)].id;
  const hashOf = program === 'v2' ? K => `#b${beatOf(K)}.${localOf(K)}` : K => `#${idOf(K)}.${localOf(K)}`;
  function parseHash(h) {
    const m = /^#(?:b(\d+)|([a-z][a-z0-9-]*))\.(\d+)(?:@([0-9.]+))?$/.exec(h);
    if (!m) return null;
    const beat = m[1] !== undefined ? +m[1] : byId(m[2]);
    if (beat < 0 || beat >= BEATS.length) return null;
    const n = (beat + 1 < BEATS.length ? ENTRY[beat + 1] : LAST + 1) - ENTRY[beat];
    return [ENTRY[beat] + Math.min(+m[3], n - 1), m[4] !== undefined ? parseFloat(m[4]) : 1];
  }
  const stepsIn = beat => (beat + 1 < BEATS.length ? ENTRY[beat + 1] : LAST + 1) - ENTRY[beat];

  const indexOf = id => byId(id);
  const entryOf = id => (byId(id) < 0 ? -1 : ENTRY[byId(id)]);
  const lastOf = id => (byId(id) < 0 ? -1 : ENTRY[byId(id)] + stepsIn(byId(id)) - 1);
  const kAt = (scene, k) => RESTS.findIndex(r => r.scene === scene && r.k === k);

  const isThrough = K => K > 0 && K < LAST && !!(RESTS[K] && RESTS[K].through);
  const pressSpan = K => { let a = K, b = K; while (a > 1 && isThrough(a - 1)) a--; while (isThrough(b)) b++; return [a, b]; };
  const stopAt = K => { while (isThrough(K)) K++; return K; };

  return { RESTS, STEPS, LAST, ENTRY, BEATS, program, look, pose, beatOf, localOf, idOf, hashOf, parseHash, stepsIn,
    indexOf, entryOf, lastOf, kAt, isThrough, pressSpan, stopAt };
}
