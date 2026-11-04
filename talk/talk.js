
import { buildTalk } from './timeline.js';
import { BEATS, PROGRAM, V3, BANNER, MINE, atStep, absorberWords3 } from './beats.js';
import { LOOK, surveyLook, imgSrc } from './look.js';
import { SURVEYS, CHARTS } from './scenes.js';
import { createStubs } from './stubs.js';
import { createRenderer as createFold, prepareData } from '../volume-spike/render.js';
import { buildPigmentMaps } from '../volume-spike/pigment-maps.js';
import { HERO, REST as FOLD_REST } from '../volume-spike/timeline.js';
import { REST as ARRIVAL_REST } from '../arrival/timeline.js';
import { createRenderer as createGhosts } from '../ghosts-spike/render.js';
import { buildGhosts, recordWindow, CENTER, ROW, PLOT_WIDTH, PLOT_H, HALF, B as B_DLA, voigtH, RECORD_HALFW } from '../ghosts-spike/ghosts.js';
import { galaxyGeom, drawGalaxy, galaxyAmount, GALAXY_LABEL } from '../ghosts-spike/galaxy.js';
import { DLA_ROW } from '../mask-spike/timeline.js';
import { maskRange, NEIGH3, CUT_BAND, bandAmount, cutColumn } from '../mask-spike/mask.js';
import { buildBeams } from '../confession/beams.js';
import { createInteraction } from './interact.js';
import { createPeek } from './peek.js';
import { REGIONS, DEFAULT as DEFAULT_ANSWER, applyAnswer, cfgFor, answerOfKey } from '../read/regions.js';
import { LEVELS, chosen as chosenQuality, CONTRAST, chosenContrast } from './quality.js';
import { startPlayer } from '../volume-spike/player.js';
import { createRenderer as createTexture } from '../texture/render.js';
import { buildTexture, heroFlux as heroFluxT, NPIX as TNPIX, WINDOW as TWINDOW } from '../texture/physics.js';
import { REAL_LIGHT, REAL_DATA } from './features.js';
import { SWEEP, SWEEP_DUR, SWEEP_WORDS } from '../record/timeline.js';
import { createMouse } from './mouse.js';
import { createExcursion } from './lamps.js';
import { createLocalTools } from './rehearse.js';
import { createBeam } from './beam.js';
import { createExpansion } from './expansion.js';
import { createGap } from './gap.js';
import { createAtom } from './atom.js';
import { createMap } from './map.js';
import { createCount } from './count.js';
import { REGIONS as READ_REGIONS, xOf as regionX, Y_ROW as READ_Y } from '../read/regions.js';

const q = new URLSearchParams(location.search);
const num = (key, d) => (q.has(key) ? parseFloat(q.get(key)) : d);
const SELFTEST = q.has('selftest'), TEST = q.has('test') || SELFTEST, DEBUG = q.has('debug');
const REDUCED = q.has('reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const CUE = q.has('cue') ? q.get('cue') !== '0' : !TEST;
const QNAME = chosenQuality(q), QL = LEVELS[QNAME], CNAME = chosenContrast(q);
const foldOpts = {
  res: num('res', QL.res), steps: num('steps', QL.steps), ink: num('ink', CONTRAST[CNAME].ink), thresh: num('thresh', 0.42),
  wash: num('wash', 0.35), washLod: num('washlod', 2), aerial: num('aerial', 3.0), gran: num('gran', 0.6),
  jitter: num('jitter', 1), grain: num('grain', 1), sheetInk: num('sheet', 0.30), neighOp: num('neigh', 0.55),
  lineScale: num('line', 1), dprMax: num('dpr', QL.dpr), debug: DEBUG,
};
const ghostOpts = {
  n: Math.round(num('n', 10000)), keep: Math.round(num('keep', 150)), ghostAlpha: num('ghost', 0.014),
  fog: num('fog', 1), width: num('width', PLOT_WIDTH), plotH: num('ploth', PLOT_H), grain: num('grain', 1),
  dprMax: num('dpr', QL.dpr), center: CENTER,
};

const $ = id => document.getElementById(id);
const say = msg => { const el = $('msg'); el.textContent = msg; el.hidden = false; $('loading').hidden = true; };
for (const cv of document.querySelectorAll('#layer-clip video[data-src]'))
  fetch(imgSrc(cv.dataset.src)).then(r => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(b => { cv.src = URL.createObjectURL(b); }).catch(e => console.warn(`a beam film is missing (tools/make_media.sh): ${imgSrc(cv.dataset.src)}`, e));
const T = buildTalk({ reduced: REDUCED });
const flagged = f => BEATS.find(B => B[f]) || null;
const OFFER_BEAT = flagged('offer'), ANSWER_BEAT = flagged('answer'), STRIP_BEAT = flagged('strip');
const END_BEAT = BEATS.findIndex(B => B.end);
const beatAt = K => BEATS[T.beatOf(K)];
document.body.classList.add(PROGRAM);
if (V3 && PROGRAM !== 'v3') document.body.classList.add('v3');
document.body.dataset.look = LOOK;
const RUST2 = V3 ? '#B93A20' : '#B5533C';
const markup = t => /[_^]/.test(t);
function setRich(el, text) {
  if (el.dataset.rich === text) return;
  el.dataset.rich = text;
  if (!markup(text)) { el.textContent = text; return; }
  const parts = [], re = /\\_|([_^])(?:\{([^}]*)\}|(\S))/g;
  let at = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > at) parts.push(document.createTextNode(text.slice(at, m.index)));
    if (m[0] === '\\_') { parts.push(document.createTextNode('_')); at = re.lastIndex; continue; }
    const n = document.createElement(m[1] === '_' ? 'sub' : 'sup');
    n.textContent = m[2] ?? m[3];
    parts.push(n);
    at = re.lastIndex;
  }
  if (at < text.length) parts.push(document.createTextNode(text.slice(at)));
  el.replaceChildren(...parts);
}

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

async function load(path, label) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}. Run ../volume-spike/fetch-data.sh first.`);
  const total = +r.headers.get('content-length') || 0, reader = r.body.getReader(), parts = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); got += value.length;
    if (total) $('loading').textContent = `loading ${label} · ${Math.round(100 * got / total)}%`;
  }
  const out = new Uint8Array(got);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}

const STILLS_DIR = PROGRAM === 'v2' ? 'stills/' : PROGRAM === 'lw10' ? (LOOK === 'paper' ? 'stills/lw10-paper/' : 'stills/lw10/') : LOOK === 'scene' ? 'stills/v3/' : `stills/v3-${LOOK}/`;
const STILLS = await fetch(`${STILLS_DIR}manifest.json`).then(r => (r.ok ? r.json() : { files: [] })).catch(() => ({ files: [] }));
const haveStill = new Set(STILLS.files);
let stillsMode = false, glLost = false, noGL = null, stubsRef = null, clipRef = null, expansionRef = null, gapRef = null, countRef = null, lymanRef = null, mapRef = null;
const inStills = () => stillsMode || glLost || !!noGL;
function showStill(K) {
  while (T.isThrough(K)) K += 1;
  const name = `${T.hashOf(K).slice(1)}.jpg`, img = $('still');
  if (haveStill.has(name)) {
    if (!img.src.endsWith(STILLS_DIR + name)) img.src = STILLS_DIR + name;
    img.hidden = false;
  } else {
    img.hidden = true; img.removeAttribute('src');
  }
  const R = T.RESTS[K];
  stubsRef.render({ beat: R.beat, scene: 'stub', s: { beat: R.beat, step: T.localOf(K) }, op: 1, dark: R.dark });
  $('stills-note').textContent = `stills${noGL ? ` · ${noGL}` : glLost ? ' · WebGL context lost' : ''}${haveStill.has(name) ? '' : ' · no still built for ' + name}`;
}

let endSig = 0, heroF = null, realData = null, cubeData = null, BREAK = false;
let irisWordsShown = { under: null, chart: null, night: null };
let fitFold = s => s, foldBounds = () => null, lastChartR = null, stackFit = s => s;

let HEADS = q.get('heads') !== '0';
const headOf = K => { const r = T.RESTS[K]; return (BEATS[r.beat].heads || [])[T.localOf(K)] || ''; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wordsAt = st => (st.K === K_SWEEP ? Math.min(1, (st.at ?? 1) / SWEEP_WORDS) : st.at ?? 1);
const WORDS_OUT = 0.4, WORDS_IN = [0.45, 0.9];
const holdOf = K => { const b = K > 0 ? beatAt(K) : null; return (b && b.wordsFrom && b.wordsFrom[T.localOf(K)]) || 0; };
function wordSwap(st) {
  const at = wordsAt(st);
  if (!V3) return at < 0.5 ? { old: true, op: 1 - smooth(0, 0.3, at) } : { old: false, op: smooth(0.6, 1, at) };
  const dur = st.K > 0 && T.STEPS[st.K] ? T.STEPS[st.K].dur : 1, f = Math.min(1, dur), t = (at - holdOf(st.K)) * dur;
  return t < WORDS_IN[0] * f ? { old: true, op: 1 - smooth(0, WORDS_OUT * f, t) } : { old: false, op: smooth(WORDS_IN[0] * f, WORDS_IN[1] * f, t) };
}
function headline(st) {
  const el = $('headline');
  let text = '', op = 0;
  if (HEADS && !inStills()) {
    const cur = headOf(st.K), prev = st.K > 0 ? headOf(st.K - 1) : cur, at = wordsAt(st);
    if (at >= 1 || cur === prev) { text = cur; op = 1; }
    else { const w = wordSwap(st); text = w.old ? prev : cur; op = w.op; }
  }
  if (!text) op = 0;
  if (V3) { setRich(el, text); fitHeadline(el, text); } else if (el.textContent !== text) el.textContent = text;
  const d = Math.min(1, Math.max(0, st.dark || 0));
  el.style.color = `rgb(${[31, 39, 50].map((v, i) => Math.round(v + ([230, 226, 216][i] - v) * d)).join(',')})`;
  inkSplit(el, 'rgb(31,39,50)', 'rgb(230,226,216)');
  el.style.opacity = String(op);
  return op > 0 ? `${text}|${op.toFixed(3)}|${d.toFixed(3)}` : '';
}
function fitHeadline(el, text) {
  const key = `${text}|${innerWidth}x${innerHeight}`;
  if (el.dataset.fit === key) return;
  el.dataset.fit = key;
  el.style.fontSize = '';
  if (!text) return;
  const base = parseFloat(getComputedStyle(el).fontSize), need = el.scrollWidth, room = el.clientWidth;
  if (!(base > 0 && need > 0 && room > 0) || need <= room) return;
  el.style.fontSize = `${Math.max(0.9 * base, base * room / need - 0.01).toFixed(2)}px`;
}
const surveyAt = K => V3 && SURVEYS.includes(T.RESTS[K].scene);
const labelsOf = K => {
  const r = T.RESTS[K], L = (BEATS[r.beat].labels || {})[T.localOf(K)] || {};
  return surveyAt(K) && L.foot ? { ...L, foot: undefined } : L;
};
function smallPrint(st) {
  const cur = labelsOf(st.K), prev = st.K > 0 ? labelsOf(st.K - 1) : cur, at = wordsAt(st);
  const d = Math.min(1, Math.max(0, st.dark || 0));
  const colAt = (c, dd) => `rgb(${c.map((v, i) => Math.round(v + ([230, 226, 216][i] - v) * dd)).join(',')})`, col = c => colAt(c, d);
  const W = innerWidth, H = innerHeight, rw = PLOT_WIDTH * W, rh = PLOT_H * rw, x0 = (W - rw) / 2, y0 = (H - rh) / 2;
  const sig = [];
  for (const kind of ['sub', 'foot', 'side', 'marks']) {
    const el = $(kind);
    let v = null, op = 0, src = cur;
    if (!inStills()) {
      const a = cur[kind], b = prev[kind];
      if (at >= 1 || JSON.stringify(a) === JSON.stringify(b)) { v = a; op = 1; }
      else {
        const w = wordSwap(st); v = w.old ? b : a; op = w.op; src = w.old ? prev : cur;
        if (V3 && kind === 'sub' && !w.old && cur.subFrom) {
          const dur = T.STEPS[st.K] ? T.STEPS[st.K].dur : 1;
          op = smooth(0, WORDS_IN[1] - WORDS_IN[0], (at - cur.subFrom) * dur);
        }
      }
    }
    if (!v) op = 0;
    const under = V3 && kind === 'sub' && !!(src && src.subUnder);
    if (V3 && kind === 'sub') el.classList.toggle('under', under);
    if (kind === 'marks') {
      const key = op > 0 ? JSON.stringify(v) : '';
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.replaceChildren(...(op > 0 ? v : []).map(m => {
          const p = document.createElement('p');
          p.textContent = m.text;
          p.className = [m.small ? 'small' : '', m.rust ? 'rust' : ''].join(' ').trim();
          return p;
        }));
      }
      [...el.children].forEach((p, i) => {
        const m = v[i];
        p.style.left = `${(x0 + m.u * rw).toFixed(1)}px`; p.style.top = `${(y0 + m.v * rh + (m.v > 1 ? WAVE_DROP(W, H) : 0)).toFixed(1)}px`;
        if (V3) { const over = p.getBoundingClientRect().right - 0.97 * W; if (over > 0) p.style.left = `${(x0 + m.u * rw - over).toFixed(1)}px`; }
        p.style.transform = m.anchor === 'bottom' ? 'translateY(-100%)' : '';
        if (!m.rust) p.style.color = col([74, 85, 102]);
        inkSplit(p, m.rust ? '#B93A20' : colAt([74, 85, 102], 0), m.rust ? '#E8704F' : colAt([74, 85, 102], 1));
      });
      if (op > 0) sig.push(`${key}|${x0.toFixed(1)},${y0.toFixed(1)},${rw.toFixed(1)}`);
    } else {
      const text = op > 0 ? v : '';
      if (el.textContent !== text) el.textContent = text;
      el.style.color = V3 && kind === 'foot' ? onGround([113, 127, 147], [98, 110, 128], d) : col(kind === 'sub' ? [74, 85, 102] : [86, 98, 122]);
      if (V3) inkSplit(el, kind === 'foot' ? onGround([113, 127, 147], [98, 110, 128], 0) : colAt(kind === 'sub' ? [74, 85, 102] : [86, 98, 122], 0),
        kind === 'foot' ? onGround([113, 127, 147], [98, 110, 128], 1) : colAt(kind === 'sub' ? [74, 85, 102] : [86, 98, 122], 1));
      if (op > 0) sig.push(`${kind}:${text}${under ? ':under' : ''}`);
    }
    el.style.opacity = String(op);
    if (op > 0) sig.push(op.toFixed(3));
  }
  return sig.join('|');
}
const OFFER = q.get('offer') !== '0';
let offerTaken = false;
const K_OFFER = OFFER_BEAT ? T.lastOf(OFFER_BEAT.id) : -1;
function offer(st) {
  const el = $('offer');
  const op = OFFER && !offerTaken && !inStills() && st.K === K_OFFER ? smooth(0.6, 1, st.at ?? 1) * st.op : 0;
  el.style.opacity = String(op);
  el.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
  return op > 0 ? op.toFixed(3) : '';
}

const SHEET_Z = (240 + 0.5) / 480 - 0.5;
const RAMP = [[0, [112, 132, 164]], [0.35, [124, 156, 152]], [0.62, [200, 194, 166]], [1, [196, 152, 92]]];
const POOL = [12, 18, 27];
function ramp(u) {
  for (let i = 1; i < RAMP.length; i++) if (u <= RAMP[i][0]) {
    const [u0, a] = RAMP[i - 1], [u1, b] = RAMP[i], t = (u - u0) / (u1 - u0);
    return a.map((x, j) => x + (b[j] - x) * t);
  }
  return RAMP[RAMP.length - 1][1];
}
function arrivalOverlays(st) {
  const band = $('band'), qso = $('qso');
  const s = st.s, on = st.scene === 'arrival' && st.op > 0;
  const qOp = on ? s.qso * st.op : 0, bOp = on ? s.band * st.op : 0;
  qso.style.opacity = String(qOp);
  const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  if (band.width !== Math.round(W * dpr) || band.height !== Math.round(H * dpr)) { band.width = Math.round(W * dpr); band.height = Math.round(H * dpr); }
  const g = band.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  if (!on || (qOp <= 0 && bOp <= 0)) return '';
  const P = foldRef.project(s, [s.driftX + 60, s.lookY, SHEET_Z]) || [W / 2, H / 2];
  qso.style.transform = `translate(${P[0].toFixed(2)}px, ${P[1].toFixed(2)}px)`;
  const P0 = foldRef.project(ARRIVAL_REST[1], [ARRIVAL_REST[1].driftX + 60, ARRIVAL_REST[1].lookY, SHEET_Z]) || [W / 2, H / 2];
  const f0 = FOLD_REST[0], yH = 0.5 - (HERO + 0.5) / 480;
  const A = foldRef.project(f0, [-0.5, yH + f0.traceAmp / 2, SHEET_Z]), B = foldRef.project(f0, [0.5, yH - f0.traceAmp / 2, SHEET_Z]);
  const r0 = [0.25 * W, P0[1] + 0.07 * H, 0.75 * W, P0[1] + 0.07 * H + 0.026 * H];
  const r1 = [A[0], A[1], B[0], B[1]];
  const m = s.bandMove, r = r0.map((v, i) => v + (r1[i] - v) * m);
  const cut = (1 - s.crossed) * 1389;
  const w = (r[2] - r[0]) / 1389;
  g.globalAlpha = 0.85 * bOp;
  for (let p = 0; p < 1389; p++) {
    const c = ramp(p / 1388), a = p >= cut ? 0.95 * (1 - heroF[p]) : 0;
    g.fillStyle = `rgb(${c.map((x, j) => Math.round(x + (POOL[j] - x) * a)).join(',')})`;
    g.fillRect(r[0] + p * w, r[1], w + 0.6, r[3] - r[1]);
  }
  const serif = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', u = H / 1080;
  const label = (t, x, y, size, col, a) => {
    g.globalAlpha = a; g.font = `italic 400 ${Math.round(size * H)}px ${serif}`; g.fillStyle = col; g.textAlign = 'left'; g.fillText(t, x, y);
  };
  const named = qOp * (1 - smooth(0, 0.04, s.crossed));
  if (named > 0) {
    g.globalAlpha = 0.85 * named; g.strokeStyle = '#E6E2D8'; g.lineWidth = 2.4 * u; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const c = Math.cos(i * Math.PI / 4), sn = Math.sin(i * Math.PI / 4);
      g.moveTo(P[0] + 13 * u * c, P[1] + 13 * u * sn); g.lineTo(P[0] + 24 * u * c, P[1] + 24 * u * sn);
    }
    g.stroke();
    label('a quasar — the lamp', P[0] + 40 * u, P[1] - 4 * u, 0.034, '#E6E2D8', named);
    label('seen as it was nearly 12 billion years ago', P[0] + 40 * u, P[1] + 32 * u, 0.025, '#97A1B1', named);
  }
  const haze = qOp * smooth(0.04, 0.12, s.crossed);
  if (haze > 0) {
    label('hydrogen gas: very thin', 0.08 * W, 0.2 * H, 0.03, '#E6E2D8', haze);
    label('only about 1 in 100 000 atoms is neutral and can absorb this light', 0.08 * W, 0.24 * H, 0.03, '#E6E2D8', haze);
    label('the neutral fraction of gas at average density, z = 3, in the PRIYA simulation', 0.08 * W, 0.28 * H, 0.022, '#97A1B1', haze);
  }
  g.globalAlpha = 1;
  return [qOp, bOp, P[0], P[1], ...r, s.crossed, named, haze].map(v => v.toFixed(3)).join(',');
}
const SIMULATED = new Set(['arrival', 'record', 'fold', 'read', 'ghosts', 'mask', 'confession', 'texture', 'return']);
function simTag(st) {
  const el = $('simtag'), s = st.s || {};
  const op = SIMULATED.has(st.scene) ? (st.scene === 'arrival' ? st.op : 1) * (1 - (s.title || 0)) * (1 - (s.real || 0)) : 0;
  const inv = Math.min(1, Math.max(0, s.invert || 0));
  const c = [86, 98, 122].map((v, i) => Math.round(v + ([170, 178, 190][i] - v) * inv));
  el.style.opacity = String(op);
  el.style.color = `rgb(${c.join(',')})`;
  return op > 0 ? `${op.toFixed(3)},${inv.toFixed(3)}` : '';
}
function steady(get, st) {
  const cur = get(st.K), prev = st.K > 0 ? get(st.K - 1) : cur, at = wordsAt(st);
  let text, op;
  if (at >= 1 || cur === prev) { text = cur; op = 1; }
  else { const w = wordSwap(st); text = w.old ? prev : cur; op = w.op; }
  return text ? { text, op } : { text: '', op: 0 };
}
const onGround = (ink, light, d) => `rgb(${ink.map((v, i) => Math.round(v + (light[i] - v) * d)).join(',')})`;
let INK_DISC = null;
const INK_PROPS = ['background-image', '-webkit-background-clip', 'background-clip', '-webkit-text-fill-color', 'text-shadow'];
const setCss = (s, k, v) => { if (typeof s.setProperty === 'function') s.setProperty(k, v); else s[k] = v; };
function inkSplit(el, onPaper, onDark) {
  const s = el.style;
  if (!V3 || !INK_DISC) {
    if (el.dataset.ink) { for (const k of INK_PROPS) setCss(s, k, ''); el.dataset.ink = ''; }
    return '';
  }
  const b = el.getBoundingClientRect(), D = INK_DISC;
  const x = (D.x - b.left - (el.clientLeft || 0)).toFixed(1), y = (D.y - b.top - (el.clientTop || 0)).toFixed(1), r = D.r.toFixed(1);
  setCss(s, 'background-image', `radial-gradient(circle at ${x}px ${y}px, ${onDark} ${r}px, ${onPaper} ${r}px)`);
  setCss(s, '-webkit-background-clip', 'text'); setCss(s, 'background-clip', 'text');
  setCss(s, '-webkit-text-fill-color', 'transparent'); setCss(s, 'text-shadow', 'none');
  el.dataset.ink = '1';
  return `${x},${y}`;
}
const bannerOf = K => (atStep(beatAt(K).band, T.localOf(K)) === false || (V3 && K > T.entryOf('fan')) ? '' : BANNER);
const mineOf = K => { const m = atStep(beatAt(K).mine, T.localOf(K)); return m ? MINE[m] : ''; };
const provOf = K => atStep(beatAt(K).prov, T.localOf(K)) || '';
const tagWCache = new Map();
let tagMeasure = null;
function tagWidthVw(text) {
  if (!V3 || !text) return undefined;
  const key = `${text}|${innerWidth}x${innerHeight}`;
  if (tagWCache.has(key)) return tagWCache.get(key);
  const cs = getComputedStyle($('simtag')), px = parseFloat(cs.fontSize);
  if (!tagMeasure) tagMeasure = document.createElement('canvas').getContext('2d');
  let w;
  if (tagMeasure && px > 0) {
    tagMeasure.font = `${cs.fontStyle || 'italic'} ${cs.fontWeight || 400} ${cs.fontSize} ${cs.fontFamily}`;
    const m = tagMeasure.measureText(text).width;
    w = m > 0 ? 3 + 100 * m / innerWidth : undefined;
  }
  tagWCache.set(key, w);
  return w;
}
const BAND = [['banner', bannerOf, [74, 85, 102], [200, 204, 210]], ['mine', mineOf, [185, 58, 32], [232, 112, 79]]];
function band(st) {
  const d = Math.min(1, Math.max(0, st.dark || 0)), sig = [];
  for (const [id, get, ink, light] of BAND) {
    const el = $(id), { text, op } = inStills() ? { text: '', op: 0 } : steady(get, st);
    if (el.textContent !== text) el.textContent = text;
    el.style.color = onGround(ink, light, d);
    inkSplit(el, onGround(ink, light, 0), onGround(ink, light, 1));
    el.style.opacity = String(op);
    if (op > 0) sig.push(`${id}:${text}|${op.toFixed(3)}`);
  }
  const bar = slotBar(st);
  if (bar) sig.push(bar);
  return sig.length ? `${sig.join('|')}|${d.toFixed(3)}` : '';
}
function slotBar(st) {
  const el = $('minebar');
  if (!V3 || !el) return '';
  const cur = inStills() ? '' : mineOf(st.K), prev = inStills() ? '' : (st.K > 0 ? mineOf(st.K - 1) : cur), at = wordsAt(st);
  let scale = 0, op = 0;
  if (at >= 1 || cur === prev) { scale = op = cur ? 1 : 0; }
  else {
    const dur = st.K > 0 && T.STEPS[st.K] ? T.STEPS[st.K].dur : 1, f = Math.min(1, dur), t = Math.max(0, (at - holdOf(st.K)) * dur);
    if (!cur) { scale = 1; op = 1 - smooth(0, WORDS_OUT * f, t); }
    else if (!prev) { scale = smoother(Math.min(1, t / (0.4 * f))); op = 1; }
    else { scale = t < 0.2 * f ? 1 - smoother(t / (0.2 * f)) : smoother(Math.min(1, (t - 0.2 * f) / (0.25 * f))); op = 1; }
  }
  const d = Math.min(1, Math.max(0, st.dark || 0));
  el.style.transform = `scaleY(${scale.toFixed(4)})`;
  el.style.opacity = String(op);
  el.style.background = onGround([185, 58, 32], [232, 112, 79], d);
  return op > 0 && scale > 0 ? `bar:${scale.toFixed(3)},${op.toFixed(3)}` : '';
}
const surveyLabelsSig = () => [...$('survey-labels').children].map(p => `${p.textContent}:${p.style.opacity}:${p.style.transform}`).join(';');
let PRESSES = null, TOPICS = null;
function progressBar(st) {
  try { return progressBar0(st); } catch (e) { return ''; }
}
function progressBar0(st) {
  const el = $('progress'), num = $('pageno');
  if (!V3 || !el || !num || !el.style || !num.style) return '';
  const fill = el.firstElementChild || el.firstChild;
  if (!PRESSES) { PRESSES = []; for (let K = 0; K <= T.LAST; K++) if (!T.isThrough(K)) PRESSES.push(K); }
  if (!TOPICS) { TOPICS = []; for (const b of BEATS) if (b.id !== 'title' && b.id !== 'thanks' && !TOPICS.includes(b.section)) TOPICS.push(b.section); }
  const id = BEATS[T.beatOf(st.K)].id, show = !inStills() && id !== 'title' && id !== 'thanks';
  if (!show) { el.style.opacity = num.style.opacity = '0'; return ''; }
  const s = st.at ?? 1, i = PRESSES.indexOf(T.stopAt(st.K)), N = PRESSES.length, P = pressOf(st.K, s);
  const q = P.pressS ?? (st.K === T.stopAt(st.K) ? s : 1), f = Math.min(1, Math.max(0, (i - 1 + q) / (N - 1)));
  const d = Math.min(1, Math.max(0, st.dark || 0)), grey = onGround([74, 85, 102], [200, 204, 210], d), rust = onGround([185, 58, 32], [232, 112, 79], d);
  el.style.background = grey.replace('rgb(', 'rgba(').replace(')', ',0.14)');
  if (fill && fill.style) { fill.style.background = rust; fill.style.opacity = '0.6'; fill.style.width = `${(100 * f).toFixed(3)}%`; }
  el.style.opacity = '1';
  const text = `${TOPICS.indexOf(BEATS[T.beatOf(st.K)].section) + 1} / ${TOPICS.length}`;
  if (num.textContent !== text) num.textContent = text;
  num.style.color = onGround([113, 127, 147], [98, 110, 128], d); num.style.opacity = '0.75';
  return `${text}|${f.toFixed(4)}|${d.toFixed(3)}`;
}
function provTag(st) {
  const el = $('simtag'), { text, op } = inStills() ? { text: '', op: 0 } : steady(provOf, st);
  const d = Math.min(1, Math.max(0, st.dark || 0));
  if (el.textContent !== text) el.textContent = text;
  el.style.color = onGround([113, 127, 147], [98, 110, 128], d);
  inkSplit(el, onGround([113, 127, 147], [98, 110, 128], 0), onGround([113, 127, 147], [98, 110, 128], 1));
  el.style.opacity = String(op);
  return op > 0 ? `${text}|${op.toFixed(3)},${d.toFixed(3)}` : '';
}
function realOverlay(st) {
  const c = $('real'), s = st.s || {};
  const a = st.scene === 'confession' ? (s.real || 0) * st.op : 0;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const g = c.getContext('2d', { willReadFrequently: true });
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  if (a <= 0) return '';
  const cover = Math.min(1, 2 * a), ink = Math.max(0, 2 * a - 1);
  g.globalAlpha = cover; g.fillStyle = '#F4F2ED'; g.fillRect(0, 0, W, H);
  g.globalAlpha = ink;
  if (ink <= 0) { g.globalAlpha = 1; return `${a.toFixed(3)}|cover`; }
  const serif = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', px = n => Math.round(n * H);
  const text = (t, x, y, size, col, italic = true, align = 'left') => {
    g.font = `${italic ? 'italic ' : ''}400 ${px(size)}px ${serif}`; g.fillStyle = col; g.textAlign = align; g.fillText(t, x, y);
  };
  const D = realData;
  if (!D) { text('the real spectrum has not been retrieved yet (docs 17)', 0.08 * W, 0.5 * H, 0.03, '#B93A20'); return `${a.toFixed(3)}|none`; }
  const x0 = 0.08 * W, w = 0.84 * W, y0 = 0.3 * H, h = 0.42 * H;
  const L = D.rest_wavelength, F = D.flux, C = D.continuum;
  const top = Math.max(...C) * 1.25, X = l => x0 + (l - 1000) / 300 * w, Y = f => y0 + h - Math.max(-0.1 * top, Math.min(top, f)) / top * h;
  g.lineJoin = 'round';
  g.strokeStyle = '#1F2732'; g.lineWidth = 1.6; g.beginPath(); L.forEach((l, i) => g.lineTo(X(l), Y(F[i]))); g.stroke();
  g.strokeStyle = '#56627A'; g.lineWidth = 5; g.beginPath(); L.forEach((l, i) => g.lineTo(X(l), Y(C[i]))); g.stroke();
  text(D.STANDIN ? 'LAYOUT STAND-IN: not real light, not data' : 'real light: one quasar, seen by the Sloan telescope', x0, 0.14 * H, 0.042, D.STANDIN ? '#B93A20' : '#1F2732', false);
  text('a different quasar, and a different place, from my simulation', x0, 0.195 * H, 0.036, '#1F2732');
  const il = L.reduce((b, l, i) => (C[i] > C[b] ? i : b), 0);
  text('the lamp’s own glow', X(L[il]) + 0.01 * W, Y(C[il]) - 0.02 * H, 0.03, '#4A5566');
  g.strokeStyle = '#56627A'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0 + h + 0.055 * H); g.lineTo(x0 + 0.04 * W, y0 + h + 0.055 * H); g.stroke();
  text('the light that should have arrived (a typical quasar, scaled to this one)', x0 + 0.05 * W, y0 + h + 0.065 * H, 0.028, '#56627A');
  text('colour →', x0 + w, y0 + h + 0.06 * H, 0.03, '#4A5566', true, 'right');
  text(D.STANDIN ? 'stand-in · not data' : 'real sky · Sloan Digital Sky Survey', W - 0.03 * W, H - 0.035 * H, 0.04, D.STANDIN ? '#B93A20' : '#1F2732', true, 'right');
  g.globalAlpha = 1;
  return `${a.toFixed(3)}|${D.object}`;
}
const K_SPECTRUM = STRIP_BEAT ? T.entryOf(STRIP_BEAT.id) : -1, K_GAS = T.kAt('record', 3);
const K_SWEEP = K_GAS >= 0 && T.kAt('record', 4) === K_GAS + 1 ? K_GAS + 1 : -1;
function axisOverlay(st) {
  const el = $('axis'), [c, d, l, r] = el.children, s = st.s, strip = $('strip');
  const on = ['arrival', 'record', 'fold'].includes(st.scene) && st.op > 0 && (s.axis || 0) > 0;
  const op = on ? s.axis * st.op : 0, dist = s.axisDist || 0;
  const cl = x => Math.min(1, Math.max(0, x));
  const colour = op * cl(1 - 2 * dist);
  for (const e of [c, l, r]) e.style.opacity = String(V3 ? 0 : colour);
  d.style.opacity = String(op * cl(2 * dist - 1));
  const kept = K_SPECTRUM < 0 ? 0 : st.K === K_SPECTRUM ? 1 : st.K === K_SPECTRUM + 1 ? 1 - smooth(0, 0.35, st.at ?? 1) : 0;
  const stripOp = !V3 && ['arrival', 'record'].includes(st.scene) ? colour * kept : 0;
  strip.style.opacity = String(stripOp);
  if (!on) return '';
  const yH = 0.5 - (HERO + 0.5) / 480, yb = yH - s.traceN * s.traceSpread - s.traceAmp / 2;
  const P = foldRef.project(s, [0.5, yb, SHEET_Z]), Q = foldRef.project(s, [-0.5, yb, SHEET_Z]);
  if (!P || !Q) return '';
  const H = innerHeight, span = P[0] - Q[0];
  el.style.transform = `translate(${P[0].toFixed(1)}px, ${(P[1] + 0.022 * H).toFixed(1)}px)`;
  c.style.left = `${(-span / 2).toFixed(1)}px`; l.style.left = `${(-span).toFixed(1)}px`;
  strip.style.transform = `translate(${Q[0].toFixed(1)}px, ${(P[1] + 0.006 * H).toFixed(1)}px)`;
  strip.style.width = `${span.toFixed(1)}px`;
  return [op, dist, P[0], P[1], Q[0], stripOp].map(v => v.toFixed(3)).join(',');
}
const PAPER_RGB = [244, 242, 237], SHADOW_RGB = [194, 199, 205], TOPLINE_RGB = [105, 112, 122];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const FOLD_NX = 1389, FOLD_L = 120;
const GAS_WIN = [62, 83];
let GAS = null, swapLayer = null, gasBarsTop = NaN;
const SAFE_TOP = 0.175;
const GAS_TOP = 0.18, GAS_DROP = 0.04, GAS_LABEL_TOP = 0.178;
const FOOT_ROW_TOP = 0.93;
function prepareGas(d, plane) {
  if (!d || d.schema !== 'lya-talk-skewer/1' || !d.reference || d.L_mpch !== FOLD_L) return null;
  const n = d.x.length, L = d.L_mpch, HUB = d.hubble_per_mpch, P = HUB * L, inWin = x => x >= GAS_WIN[0] && x <= GAS_WIN[1];
  const q = d.colden;
  const w = q.map(v => Math.min(1, Math.max(0, (Math.log10(Math.max(v, 1)) - 11.8) / 2.4)));
  const u = d.x.map((x, j) => HUB * x + d.v[j]);
  const b = d.T.map(T => 12.845 * Math.sqrt(T / 1e4));
  const tau = d.reference.tau, du = d.reference.du, F = tau.map(t => Math.exp(-t));
  const fx = F.map((_, k) => (k + 0.5) * du / HUB);
  const parts = u0 => q.map((qj, j) => { let dd = u0 - u[j]; dd -= P * Math.round(dd / P); return qj * Math.exp(-((dd / b[j]) ** 2)) / b[j]; });
  let best = null;
  for (let i = 0; i < tau.length; i++) {
    if (tau[i] < 0.8 || tau[i] > 5 || !inWin(fx[i])) continue;
    const c = parts((i + 0.5) * du), tot = c.reduce((a, v) => a + v, 0), groups = [];
    let cur = null;
    c.forEach((v, j) => { if (v / tot < 0.003) return; if (cur && d.x[j] - cur.x1 <= 0.25) { cur.x1 = d.x[j]; cur.s += v; cur.xs += v * d.x[j]; } else groups.push(cur = { x1: d.x[j], s: v, xs: v * d.x[j] }); });
    const big = groups.filter(g => g.s / tot > 0.15);
    if (big.length < 2) continue;
    const sep = Math.abs(big[0].xs / big[0].s - big[1].xs / big[1].s), sc = sep * Math.min(big[0].s, big[1].s) / tot;
    if (sep >= 0.5 && (!best || sc > best.sc)) best = { sc, i };
  }
  const F1 = X => { const p = Math.min(FOLD_NX - 1, Math.max(0, X / L * FOLD_NX - 0.5)), i = Math.floor(p), t = p - i;
    return plane[HERO * FOLD_NX + i] * (1 - t) + plane[HERO * FOLD_NX + Math.min(FOLD_NX - 1, i + 1)] * t; };
  const F2 = X => { const p = Math.min(F.length - 1, Math.max(0, X * HUB / du - 0.5)), i = Math.floor(p), t = p - i;
    return F[i] * (1 - t) + F[Math.min(F.length - 1, i + 1)] * t; };
  const cx = [];
  for (let i = 0; i < FOLD_NX; i++) { const X = (i + 0.5) / FOLD_NX * L; if (X > GAS_WIN[0] - 6 && X < GAS_WIN[1] + 6) cx.push(X); }
  fx.forEach(X => { if (X > GAS_WIN[0] - 6 && X < GAS_WIN[1] + 6) cx.push(X); });
  cx.sort((a, b) => a - b);
  const curve = cx.map(X => [X, F1(X), F2(X)]);
  return { n, L, HUB, P, du, x: d.x, v: d.v, Delta: d.Delta, w, u, parts, F1, F2, curve, pick: best ? (best.i + 0.5) * du : null };
}
let shareMemo = { u: NaN, v: null, tau: null }, gasPick = null, gasPickK = -1;
const SIGMA_LAMBDA = 1.3435e-12 / Math.sqrt(Math.PI);
function gasShares(u0) {
  if (shareMemo.u !== u0) {
    const c = GAS.parts(u0), tot = c.reduce((a, v) => a + v, 0) || 1;
    shareMemo = { u: u0, v: c.map(v => v / tot), tau: c.map(v => v * SIGMA_LAMBDA) };
  }
  return shareMemo.v;
}
const gasColour = () => gasPick ?? GAS.pick;
const smoother = x => x * x * x * (x * (x * 6 - 15) + 10);
function sweepColour(f) {
  let t = Math.min(1, Math.max(0, f)) * SWEEP_DUR, prev = GAS.pick;
  for (const p of SWEEP) {
    const u = p.k == null ? GAS.pick : (p.k + 0.5) * GAS.du;
    if (t < p.move) return prev + (u - prev) * smoother(t / p.move);
    t -= p.move;
    if (t < p.hold) return u;
    t -= p.hold; prev = u;
  }
  return GAS.pick;
}
const wrapU = uu => ((uu % GAS.P) + GAS.P) % GAS.P;
function gasFrame(s) {
  const yH = 0.5 - (HERO + 0.5) / 480, amp = s.traceAmp;
  const at = (X, f) => foldRef.project(s, [X / GAS.L - 0.5, yH + amp * (f - 0.5), SHEET_Z]) || [0, 0];
  return { at, Xs: X => at(X, 1)[0] };
}
function gasOverlay(g, st, W, H) {
  const s = st.s || {};
  if (!GAS || st.scene !== 'record' || st.op <= 0 || !foldRef) return '';
  const gas = (s.gas || 0) * st.op, thr = s.threads || 0, swap = s.swap || 0;
  const vp = s.vpec || 0;
  if (gas <= 0 && thr <= 0 && swap <= 0) return '';
  const { at, Xs } = gasFrame(s), [, yTop] = at(72, 1), [, yBot] = at(72, 0);
  const m = smooth(0.2, 1, swap);
  if (swap > 0) {
    const cover = smooth(0, 0.2, swap) * st.op;
    const ex = $('explain'), dpr = ex.width / W;
    if (!swapLayer) swapLayer = document.createElement('canvas');
    if (swapLayer.width !== ex.width || swapLayer.height !== ex.height) { swapLayer.width = ex.width; swapLayer.height = ex.height; }
    const h = swapLayer.getContext('2d');
    h.setTransform(dpr, 0, 0, dpr, 0, 0); h.clearRect(0, 0, W, H);
    h.fillStyle = rgba(PAPER_RGB, 1); h.fillRect(0, yTop - 12, W, yBot - yTop + 24);
    const pts = GAS.curve.map(([X, f1, f2]) => at(X, f1 + (f2 - f1) * m)), tops = GAS.curve.map(([X]) => at(X, 1));
    h.beginPath(); pts.forEach(([x, y], i) => (i ? h.lineTo(x, y) : h.moveTo(x, y))); [...tops].reverse().forEach(([x, y]) => h.lineTo(x, y)); h.closePath();
    h.fillStyle = rgba(SHADOW_RGB, 1); h.fill();
    h.lineWidth = 2.4; h.strokeStyle = rgba(TOPLINE_RGB, 1); h.beginPath(); tops.forEach(([x, y], i) => (i ? h.lineTo(x, y) : h.moveTo(x, y))); h.stroke();
    h.lineWidth = 2 * RECORD_HALFW; h.lineJoin = 'round'; h.strokeStyle = '#1F2732';
    h.beginPath(); pts.forEach(([x, y], i) => (i ? h.lineTo(x, y) : h.moveTo(x, y))); h.stroke();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = cover; g.drawImage(swapLayer, 0, 0); g.restore();
  }
  const hS = 0.014 * H, yS0 = yTop - 0.105 * H + (V3 ? GAS_DROP * H : 0), fsL = Math.round(0.026 * H);
  const yS = V3 ? Math.max(yS0, (GAS_TOP + 0.02) * H + 3 + hS / 2, (GAS_LABEL_TOP + 0.012) * H + 0.76 * fsL + hS / 2) : yS0, top = yS + hS / 2 + 2, bot = yTop - 3;
  const dx = GAS.L / GAS.n, wpx = Math.abs(Xs(dx) - Xs(0)) + 0.6, onScreen = x => x > -0.02 * W && x < 1.02 * W;
  const u0 = GAS.pick == null ? null : gasPick ?? sweepColour(s.sweep || 0);
  const share = u0 == null ? null : gasShares(u0), tauJ = share && shareMemo.tau, pk = gas * smooth(0.6, 1, thr) * smooth(0.7, 1, vp);
  let sMax = 1e-9;
  if (share) for (let j = 0; j < GAS.n; j++) if (share[j] > sMax && onScreen(Xs(GAS.x[j]))) sMax = share[j];
  const TAU_REF = 0.3;
  const amount = j => Math.min(1, Math.sqrt(tauJ[j] / TAU_REF));
  const shown = j => !!share && tauJ[j] >= 0.001;
  const ate = j => !!share && tauJ[j] >= 0.003;
  if (gas > 0) {
    for (let j = 0; j < GAS.n; j++) {
      const a = Math.min(1, Math.max(0, (Math.log10(GAS.Delta[j]) + 0.4) / 1.6)), x = Xs(GAS.x[j]);
      if (a <= 0 || !onScreen(x)) continue;
      g.globalAlpha = gas * 0.85 * a; g.fillStyle = '#1F2732'; g.fillRect(x - wpx / 2, yS - hS / 2, wpx, hS);
    }
    g.font = `italic 400 ${fsL}px ${SERIF_CSS}`; g.fillStyle = '#4A5566'; g.textAlign = 'right';
    const LABEL = 'real space: where the gas is', lx1 = 0.92 * W + 8, lx0 = lx1 - g.measureText(LABEL).width - 16;
    let under = 0;
    if (share && pk > 0) for (let j = 0; j < GAS.n; j++) { const x = Xs(GAS.x[j]); if (shown(j) && x > lx0 && x < lx1) under = Math.max(under, amount(j)); }
    g.globalAlpha = gas * (1 - 0.85 * Math.min(1, 3 * under) * pk / Math.max(gas, 1e-9));
    g.fillText(LABEL, 0.92 * W, yS - hS / 2 - 0.012 * H);
    g.textAlign = 'left';
  }
  if (thr > 0 && gas > 0) {
    const cy1 = top + 0.55 * (bot - top), cy2 = bot - 0.55 * (bot - top), N = 16;
    const thread = j => {
      const xa = Xs(GAS.x[j]), xb = Xs(wrapU(GAS.HUB * GAS.x[j] + vp * GAS.v[j]) / GAS.HUB);
      if (!onScreen(xa) || !onScreen(xb)) return;
      g.beginPath(); g.moveTo(xa, top);
      for (let k = 1; k <= N; k++) {
        const t = thr * k / N, r = 1 - t;
        g.lineTo(r * r * r * xa + 3 * r * r * t * xa + 3 * r * t * t * xb + t * t * t * xb,
          r * r * r * top + 3 * r * r * t * cy1 + 3 * r * t * t * cy2 + t * t * t * bot);
      }
      g.stroke();
    };
    g.strokeStyle = '#1F2732'; g.lineWidth = 1.2;
    const dot = pk / Math.max(gas, 1e-9);
    for (let j = 0; j < GAS.n; j++) if (GAS.w[j] >= 0.08) { g.globalAlpha = gas * 0.5 * GAS.w[j] * (ate(j) ? 1 - dot : 1); thread(j); }
    g.strokeStyle = RUST2; g.lineWidth = 1.7;
    for (let j = 0; j < GAS.n; j++) if (ate(j) && pk > 0) { g.globalAlpha = pk * (0.35 + 0.6 * amount(j)); thread(j); }
    g.font = `italic 400 ${Math.round(0.026 * H)}px ${SERIF_CSS}`; g.textAlign = 'right';
    halo(g, 'velocity space: the colour each bit absorbs', 0.92 * W, bot - 0.012 * H, '#4A5566', gas * smooth(0.5, 1, thr));
    const how = vp < 0.5 ? 'expansion alone: each bit would absorb straight below it' : 'the gas’s own motion shifts the colour it absorbs';
    const lean = gas * smooth(0.6, 1, thr) * (vp < 0.5 ? 1 - smooth(0.35, 0.5, vp) : smooth(0.5, 0.65, vp) * (1 - smooth(0, 0.05, s.sweep || 0)));
    g.textAlign = 'left';
    if (V3) {
      if (vp < 0.5) { g.font = `italic 400 ${Math.round(0.03 * H)}px ${SERIF_CSS}`; halo(g, how, 0.08 * W, yBot + 0.06 * H + WAVE_DROP(W, H) - 0.025 * H, '#1F2732', lean); }
    }
    else halo(g, how, 0.08 * W, top + 0.5 * (bot - top), '#1F2732', lean);
  }
  if (pk > 0 && share) {
    const XP = wrapU(u0) / GAS.HUB, xP = Xs(XP), [, yP] = at(XP, GAS.F1(XP) + (GAS.F2(XP) - GAS.F1(XP)) * m);
    g.globalAlpha = pk; g.fillStyle = RUST2; g.strokeStyle = RUST2;
    const yB = yS - hS / 2 - 3, hB = V3 ? Math.max(0.02 * H, Math.min(0.075 * H, yB - GAS_TOP * H)) : 0.075 * H, bw = Math.max(2.5, 0.95 * wpx);
    gasBarsTop = yB - hB;
    for (let j = 0; j < GAS.n; j++) {
      if (!shown(j)) continue;
      const x = Xs(GAS.x[j]);
      if (!onScreen(x)) continue;
      const hh = hB * amount(j);
      g.fillRect(x - bw / 2, yB - hh, bw, hh);
    }
    g.globalAlpha = 0.8 * pk; g.lineWidth = 2.2; g.setLineDash([10, 6]);
    g.beginPath(); g.moveTo(xP, yTop); g.lineTo(xP, yP); g.stroke(); g.setLineDash([]); g.globalAlpha = pk;
    g.beginPath(); g.arc(xP, yP, 0.0093 * H, 0, 2 * Math.PI); g.fill();
    if (V3) {
      const u = waveU(W, H), fsT = 3 * u;
      let xL = Infinity;
      for (let j = 0; j < GAS.n; j++) if (shown(j)) { const x = Xs(GAS.x[j]); if (onScreen(x)) xL = Math.min(xL, x - bw / 2); }
      g.font = `italic 400 ${fsT.toFixed(2)}px ${SERIF_CSS}`;
      if (Number.isFinite(xL)) { g.textAlign = 'right'; halo(g, KEY3[0], xL - 0.8 * u, yB - 0.25 * u, '#4A5566', pk); }
      const wDot = g.measureText(KEY3[1]).width, right = xP + 1.6 * u + wDot <= 0.92 * W;
      g.textAlign = right ? 'left' : 'right';
      halo(g, KEY3[1], right ? xP + 1.6 * u : xP - 1.6 * u, yP + 0.35 * fsT, '#4A5566', pk);
      g.textAlign = 'left'; g.globalAlpha = pk;
    } else {
    const kx = 0.08 * W, ky = yBot + 0.06 * H, kh = 0.04 * H, fs = Math.round(0.022 * H);
    g.font = `italic 400 ${fs}px ${SERIF_CSS}`; g.textAlign = 'left'; g.fillStyle = RUST2;
    g.fillRect(kx, ky - 0.6 * fs, 0.004 * W, 0.8 * fs);
    g.beginPath(); g.arc(kx + 0.002 * W, ky + kh - 0.25 * fs, 0.0065 * H, 0, 2 * Math.PI); g.fill();
    g.fillStyle = '#1F2732';
    g.fillText('red bars: where the optical depth at this colour comes from', kx + 0.014 * W, ky);
    g.fillText('red dot: how much light gets through at this colour', kx + 0.014 * W, ky + kh);
    }
  }
  g.globalAlpha = 1;
  return [gas, thr, swap, vp, u0 ?? -1].map(v => v.toFixed(3)).join(',');
}
const KEY3 = ['the gas absorbing this colour', 'the light that gets through'];
function halo(g, t, x, y, col, a) {
  if (a <= 0) return;
  g.globalAlpha = a; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = rgba(PAPER_RGB, 0.9); g.strokeText(t, x, y);
  g.fillStyle = col; g.fillText(t, x, y);
}
const ATOM_N = 1400, ATOM_V0 = 25;
const LORENTZ_G = 6.265e8 * 1215.67e-8 / (4 * Math.PI) / 1e5;
const LOG_MAX = 3.5, LOG_MIN = -9;
const ATOM_COPIES = [-1.47, -0.79, -0.37, 0, 0.37, 0.79, 1.47];
const GREY_RGB = [168, 175, 185];
const logLorentz = v => Math.log10(B_DLA * LORENTZ_G / (Math.sqrt(Math.PI) * (v * v + LORENTZ_G * LORENTZ_G)));
const logVoigt = v => Math.log10(Math.max(voigtH(v / B_DLA), 1e-14));
const ATOM_V = (() => {
  const A0 = Math.asinh(HALF / ATOM_V0), v = [0];
  for (let i = 1; i <= ATOM_N / 2; i++) { const x = ATOM_V0 * Math.sinh(A0 * i / (ATOM_N / 2)); v.push(x, -x); }
  for (const x of [0.002, 0.004, 0.006, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]) v.push(x, -x);
  return v.sort((a, b) => a - b);
})();
function atomOverlay(g, st, W, H) {
  const s = st.s || {};
  if (st.scene !== 'ghosts' || st.op <= 0 || !(s.atom > 0)) return '';
  const a = s.atom, mo = s.motion || 0, op = st.op;
  const panel = smooth(0.1, 0.5, a) * op;
  const needle = smooth(0.35, 0.8, a) * (1 - smooth(0.05, 0.2, mo)) * op;
  const k1 = smooth(0.8, 1, a) * (1 - smooth(0, 0.15, mo)) * op;
  const atomsIn = smooth(0, 0.1, mo) * smooth(0.85, 1, a) * op, spread = smooth(0.1, 0.4, mo);
  const copies = smooth(0.05, 0.15, mo) * (1 - smooth(0.62, 0.85, mo)) * smooth(0.85, 1, a) * op;
  const avg = smooth(0.55, 0.78, mo) * smooth(0.85, 1, a) * op;
  const k2 = smooth(0.82, 1, mo) * smooth(0.85, 1, a) * op;
  const rec = PLOT_H * PLOT_WIDTH * W, rw = 0.6 * W, xc = W / 2, yT = H / 2 + rec / 2 + 0.03 * H, ph = 0.15 * H, yB = yT + ph, x0 = xc - rw / 2;
  const A0 = Math.asinh(HALF / ATOM_V0);
  const X = v => xc + rw / 2 * Math.sign(v) * Math.asinh(Math.abs(v) / ATOM_V0) / A0;
  const yLog = l => yB - (Math.min(LOG_MAX, Math.max(LOG_MIN, l)) - LOG_MIN) / (LOG_MAX - LOG_MIN) * ph;
  const lab = (lines, x, y, col, al = 'left', size = 0.02) => {
    g.font = `italic 400 ${Math.round(size * H)}px ${SERIF_CSS}`; g.fillStyle = col; g.textAlign = al;
    lines.forEach((t, i) => g.fillText(t, x, y + i * 1.25 * size * H));
  };
  const path = (P, col, lw, al) => { if (al <= 0) return; g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round';
    g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  const fillUnder = (P, col, al) => { if (al <= 0) return; g.globalAlpha = al; g.fillStyle = col; g.beginPath(); g.moveTo(P[0][0], yB);
    P.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(P[P.length - 1][0], yB); g.closePath(); g.fill(); };
  if (panel > 0) {
    g.globalAlpha = 0.55 * panel; g.fillStyle = 'rgb(236,233,225)'; g.fillRect(x0, yT, rw, ph);
    g.globalAlpha = panel; g.strokeStyle = '#9AA1AB'; g.lineWidth = 1.2; g.strokeRect(x0, yT, rw, ph);
    for (let l = Math.ceil(LOG_MIN); l <= LOG_MAX; l++) { const y = yLog(l); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 0.006 * W, y); g.stroke(); }
    const TITLE = 'optical depth: how strongly one atom absorbs each colour';
    g.font = `italic 400 ${Math.round(0.022 * H)}px ${SERIF_CSS}`;
    lab([TITLE], x0 + 0.01 * W, yT + 0.028 * H, '#1F2732', 'left', Math.min(0.022, 0.022 * (rw / 2 - 0.022 * W) / g.measureText(TITLE).width));
    lab(['log scale: each tick ×10'], x0 + rw - 0.01 * W, yT + 0.028 * H, '#56627A', 'right', 0.02);
  }
  const lorentz = ATOM_V.map(v => [X(v), yLog(logLorentz(v))]);
  const voigt = ATOM_V.map(v => [X(v), yLog(logVoigt(v))]);
  const gauss = ATOM_V.map(v => [X(v), yLog(-((v / B_DLA) ** 2) / Math.LN10)]);
  fillUnder(lorentz, RUST2, 0.14 * needle);
  if (copies > 0) {
    for (const q of ATOM_COPIES) {
      const dv = q * B_DLA / Math.SQRT2 * spread;
      path(ATOM_V.map(v => [X(v), yLog(logLorentz(v - dv) - Math.log10(ATOM_COPIES.length))]), RUST2, 1.2, 0.75 * copies);
    }
  }
  if (avg > 0) { fillUnder(voigt, RUST2, 0.14 * avg); }
  if (k2 > 0) { fillUnder(gauss, rgba(PAPER_RGB, 1), k2); fillUnder(gauss, rgba(GREY_RGB, 1), k2); }
  path(lorentz, RUST2, 2.4, needle);
  path(voigt, RUST2, 2.4, avg);
  if (atomsIn > 0) {
    const yA = yB + 0.03 * H, r = 0.0055 * H;
    for (const q of ATOM_COPIES) {
      const dv = q * B_DLA / Math.SQRT2 * spread, x = X(dv), len = Math.abs(q) * 0.024 * W * spread, dir = Math.sign(q);
      g.globalAlpha = atomsIn; g.fillStyle = '#1F2732'; g.beginPath(); g.arc(x, yA, r, 0, 2 * Math.PI); g.fill();
      if (len > 2) {
        g.strokeStyle = '#4A5566'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + dir * (r + 2), yA); g.lineTo(x + dir * (r + 2 + len), yA); g.stroke();
        g.beginPath(); g.moveTo(x + dir * (r + 2 + len), yA); g.lineTo(x + dir * (r + 2 + len - 6), yA - 4); g.lineTo(x + dir * (r + 2 + len - 6), yA + 4); g.closePath(); g.fillStyle = '#4A5566'; g.fill();
      }
    }
    g.globalAlpha = atomsIn * spread;
    lab(['moving toward us: bluer'], X(-1.47 * B_DLA / Math.SQRT2) - 0.05 * W, yA + 0.007 * H, '#4A5566', 'right');
    lab(['moving away: redder'], X(1.47 * B_DLA / Math.SQRT2) + 0.05 * W, yA + 0.007 * H, '#4A5566', 'left');
  }
  const wingX = x0 + 0.01 * W, wingY = yT + 0.07 * H;
  if (k1 > 0) {
    g.globalAlpha = k1;
    lab(['at rest: a sharp center'], X(0) + 0.01 * W, yT + 0.06 * H, '#1F2732');
    lab(['long, faint wings'], wingX, wingY, RUST2);
  }
  if (k2 > 0) {
    g.globalAlpha = k2;
    lab(['motion spreads the sharp center', 'into a rounded core'], X(80) + 0.01 * W, yT + 0.06 * H, '#1F2732');
    lab(['grey: motion makes the core,', 'but not the long wings'], wingX, wingY, '#56627A');
  }
  g.globalAlpha = 1;
  return [a, mo, panel, spread, copies, avg].map(v => (+v).toFixed(3)).join(',');
}
const FLOOR_LINES = [['light: zero', 'optical depth: large'], ['light: still zero', 'optical depth: much larger'],
  ['light: still zero', 'optical depth: keeps growing']];
function floorLine(g, st, W, H) {
  const s = st.s || {}, L = s.logN || 0;
  if (st.scene !== 'ghosts' || st.op <= 0 || !(s.profileOp > 0)) return '';
  const al = s.profileOp * smooth(16.5, 17.5, L) * (1 - smooth(0, 0.12, s.atom || 0)) * (1 - (s.swap || 0)) * st.op;
  if (al <= 0) return '';
  const each = [1 - smooth(18.3, 18.7, L), smooth(18.9, 19.3, L) * (1 - smooth(19.9, 20.1, L)), smooth(20.2, 20.5, L)];
  const rw = PLOT_WIDTH * W, rh = PLOT_H * rw, y = V3 ? (H - rh) / 2 + rh + 9.6 * waveU(W, H) + 0.055 * H : (H - rh) / 2 + 1.25 * rh, SEP = '   ·   ';
  g.font = `italic 400 ${Math.round(Math.min(36, Math.max(16, Math.min(0.028 * H, 0.016 * W))))}px ${SERIF_CSS}`;
  g.textAlign = 'left';
  let sig = '';
  FLOOR_LINES.forEach(([light, tau], i) => {
    const a = al * each[i];
    if (a <= 0) return;
    const w1 = g.measureText(light + SEP).width, x = W / 2 - (w1 + g.measureText(tau).width) / 2;
    g.globalAlpha = a; g.fillStyle = '#4A5566'; g.fillText(light + SEP, x, y);
    g.fillStyle = V3 ? '#1F2732' : RUST2; g.fillText(tau, x + w1, y);
    sig += `${i}:${a.toFixed(3)};`;
  });
  g.globalAlpha = 1;
  return sig;
}
const BEFORE_INK = '#5F6D82';
let TEX = null;
const texBase = new Float64Array(TNPIX), texNow = new Float64Array(TNPIX);
let beforeShown = null;
function beforeOverlay(g, st, W, H) {
  const s = st.s || {};
  beforeShown = null;
  if (!V3 || st.scene !== 'texture3' || !TEX || st.op <= 0 || !(s.ghost > 0) || !(s.rec > 0)) return '';
  const a = s.ghost * s.rec * st.op * (s.keep ? 1 : smooth(0, 0.25, Math.max(s.hot || 0, s.uv || 0)));
  beforeShown = { a, hot: s.hot || 0, cur: s.cur ?? 1 };
  if (!(a > 0)) return '';
  const rw = PLOT_WIDTH * W, rh = PLOT_H * rw, x0 = (W - rw) / 2, y0 = (H - rh) / 2;
  const n = Math.pow(TNPIX, 1 - s.zoom) * Math.pow(TWINDOW.width, s.zoom), done = (TNPIX / n - 1) / (TNPIX / TWINDOW.width - 1);
  const f = TWINDOW.centre / TNPIX + (0.5 - TWINDOW.centre / TNPIX) * done, a0 = TWINDOW.centre - f * n;
  const X = i => x0 + (i + 0.5 - a0) / n * rw, Y = (Fl, i) => y0 + (1 - Fl[((i % TNPIX) + TNPIX) % TNPIX]) * rh;
  const i0 = Math.max(0, Math.floor(a0) - 1), i1 = Math.min(TNPIX - 1, Math.ceil(a0 + n) + 1);
  const path = Fl => {
    g.beginPath(); g.moveTo(X(i0), Y(Fl, i0));
    for (let i = i0 + 1; i < i1; i++) g.quadraticCurveTo(X(i), Y(Fl, i), (X(i) + X(i + 1)) / 2, (Y(Fl, i) + Y(Fl, i + 1)) / 2);
    g.lineTo(X(i1), Y(Fl, i1));
  };
  heroFluxT(TEX, 0, 0, texBase); heroFluxT(TEX, s.hot, s.uv, texNow);
  g.save(); g.beginPath(); g.rect(x0, y0 - rh, rw, 3 * rh); g.clip(); g.lineJoin = 'round';
  g.globalAlpha = a; g.strokeStyle = BEFORE_INK; g.lineWidth = 2.5; g.setLineDash([8, 5]); path(texBase); g.stroke(); g.setLineDash([]);
  g.globalAlpha = s.rec * st.op * (s.cur ?? 1); g.strokeStyle = '#1F2732'; g.lineWidth = 2 * RECORD_HALFW; path(texNow); g.stroke();
  g.restore();
  let im = -1;
  for (let i = i0; i <= i1; i++) if (X(i) > x0 + 0.08 * rw && X(i) < x0 + 0.92 * rw && (im < 0 || texBase[i] < texBase[im])) im = i;
  if (im >= 0) {
    g.font = `italic 400 ${Math.round(0.034 * H)}px ${SERIF_CSS}`; g.textAlign = 'center';
    halo(g, 'before', X(im), Y(texBase, im) + 0.05 * H, BEFORE_INK, a);
  }
  g.globalAlpha = 1;
  return [a, s.zoom, s.hot, s.uv, s.cur ?? 1].map(v => (+v).toFixed(3)).join(',');
}
function explainOverlays(st) {
  const c = $('explain'), dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  g.lineJoin = 'round';
  gasBarsTop = NaN;
  const before = V3 ? beforeOverlay(g, st, W, H) : '';
  return `${gasOverlay(g, st, W, H)}|${atomOverlay(g, st, W, H)}|${floorLine(g, st, W, H)}` + (before ? `|${before}` : '');
}
const WAVE_SCENES = new Set(['record', 'fold', 'ghosts', 'texture3', 'mask', 'mask3']);
const waveU = (W, H) => Math.min(H / 100, 0.5625 * W / 100);
const WAVE_DROP = (W, H) => (V3 ? 11 * waveU(W, H) : 0);
const WAVE_WORDS = ['bluer', 'wavelength (colour) →', 'redder'];
function waveOp(st) {
  const s = st.s || {};
  if (!V3 || !WAVE_SCENES.has(st.scene) || !(st.op > 0)) return 0;
  if (st.scene === 'fold') return st.op * (s.axis || 0) * Math.min(1, Math.max(0, 1 - 2 * (s.axisDist || 0)));
  return st.op;
}
function waveGeom(st, W, H) {
  const s = st.s || {}, rw = PLOT_WIDTH * W, rh = PLOT_H * rw, L = (W - rw) / 2, R = L + rw;
  if (st.scene === 'ghosts' || st.scene === 'texture3') return { x0: L, x1: R, floor: (H - rh) / 2 + rh };
  if (!foldRef) return null;
  const hero = st.scene === 'mask' || st.scene === 'mask3' ? DLA_ROW : HERO;
  const yb = 0.5 - (hero + 0.5) / 480 - (s.traceN || 0) * (s.traceSpread || 0) - (s.traceAmp || 0) / 2;
  const P = foldRef.project(s, [0.5, yb, SHEET_Z]), Q = foldRef.project(s, [-0.5, yb, SHEET_Z]);
  if (!P || !Q) return null;
  return { x0: Math.max(L, Math.min(P[0], Q[0])), x1: Math.min(R, Math.max(P[0], Q[0])), floor: Math.max(P[1], Q[1]) };
}
let waveKey = '', waveShown = null;
function waveArrow(st) {
  const c = $('wave'), dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  const op = waveOp(st), G = op > 0 ? waveGeom(st, W, H) : null, u = waveU(W, H);
  const r1 = v => Math.round(v * 10) / 10;
  const D = G && G.x1 - G.x0 > 10 * u ? { a: Math.round(op * 1e4) / 1e4, x0: r1(G.x0), x1: r1(G.x1), y0: r1(G.floor + 5 * u) } : null;
  const sig = D ? `${D.a}|${D.x0},${D.x1},${D.y0}` : '';
  const key = `${W}x${H}@${dpr}|${sig}`;
  if (key !== waveKey) {
    waveKey = key;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (D) {
      const h = 0.75 * u, px = 3 * u, yw = D.y0 + 1.3 * u + 0.9 * u + 0.8 * px, ym = D.y0 + h / 2;
      const grad = g.createLinearGradient(D.x0, 0, D.x1, 0);
      for (const [t, col] of RAMP) grad.addColorStop(t, `rgb(${col.join(',')})`);
      g.globalAlpha = D.a; g.fillStyle = grad; g.fillRect(D.x0, D.y0, D.x1 - D.x0, h);
      g.fillStyle = `rgb(${RAMP[RAMP.length - 1][1].join(',')})`;
      g.beginPath(); g.moveTo(D.x1 + 1.6 * u, ym); g.lineTo(D.x1, ym - 0.9 * u); g.lineTo(D.x1, ym + 0.9 * u); g.closePath(); g.fill();
      g.font = `italic 400 ${px.toFixed(2)}px ${SERIF_CSS}`; g.fillStyle = '#4A5566';
      g.textAlign = 'left'; g.fillText(WAVE_WORDS[0], D.x0, yw);
      g.textAlign = 'center'; g.fillText(WAVE_WORDS[1], (D.x0 + D.x1) / 2, yw);
      g.textAlign = 'right'; g.fillText(WAVE_WORDS[2], D.x1, yw);
      g.globalAlpha = 1; g.textAlign = 'left';
    }
  }
  waveShown = D && { ...D, words: WAVE_WORDS.slice(), yw: D.y0 + 2.2 * u + 2.4 * u, u };
  return sig;
}
let CUT_RANGE = null, cutBandKey = '', cutBandShown = null;
function cutBand(st) {
  const c = $('cutband'), s = st.s || {};
  const a = V3 && st.scene === 'mask3' && st.op > 0 && foldRef && CUT_RANGE ? bandAmount(s) : 0;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  const r1 = v => Math.round(v * 10) / 10, r4 = v => Math.round(v * 1e4) / 1e4;
  let D = null, C = null;
  if (a > 0) {
    C = cutColumn(s, CUT_RANGE, DLA_ROW);
    const P = [[C.x0, C.top], [C.x1, C.top], [C.x1, C.bot], [C.x0, C.bot]].map(([x, y]) => foldRef.project(s, [x, y, SHEET_Z]));
    const span = C.top - C.bot;
    if (P.every(Boolean)) D = { a: r4(a), P: P.map(p => p.map(r1)), f1: r4((C.top - C.solidTop) / span), f2: r4((C.top - C.solidBot) / span) };
  }
  const sig = D ? `${D.a}|${D.P.map(p => p.join(',')).join(';')}|${D.f1},${D.f2}` : '';
  const key = `${W}x${H}@${dpr}|${sig}`;
  if (key !== cutBandKey) {
    cutBandKey = key;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (D) {
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], t = mid(D.P[0], D.P[1]), b = mid(D.P[3], D.P[2]);
      const [r, gg, bb] = [1, 3, 5].map(i => parseInt(CUT_BAND.tint.slice(i, i + 2), 16));
      const grad = g.createLinearGradient(t[0], t[1], b[0], b[1]);
      grad.addColorStop(0, `rgba(${r},${gg},${bb},0)`); grad.addColorStop(D.f1, `rgb(${r},${gg},${bb})`);
      grad.addColorStop(D.f2, `rgb(${r},${gg},${bb})`); grad.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
      g.globalAlpha = D.a; g.fillStyle = grad;
      g.beginPath(); D.P.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
  }
  cutBandShown = D && {
    amount: D.a, tint: CUT_BAND.tint, range: CUT_RANGE.slice(), x0: Math.min(...D.P.map(p => p[0])), x1: Math.max(...D.P.map(p => p[0])),
    top: Math.min(...D.P.map(p => p[1])), bot: Math.max(...D.P.map(p => p[1])),
    rows: [-3, -2, -1, 0, 1, 2, 3].map(d => {
      const xm = (C.x0 + C.x1) / 2, P = foldRef.project(s, [xm, C.rowY(d) + C.amp / 2, SHEET_Z]), Q = foldRef.project(s, [xm, C.rowY(d) - C.amp / 2, SHEET_Z]);
      return { d, y0: P ? P[1] : NaN, y1: Q ? Q[1] : NaN };
    }),
  };
  return sig;
}
const SERIF_CSS = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
let galaxyKey = '', galaxyShown = null;
function galaxyOverlay(st) {
  const c = $('galaxy'), s = st.s || {}, B = BEATS[st.beat];
  const on = V3 && st.scene === 'ghosts' && st.op > 0 && !!B && B.id === 'wide';
  const A = on ? galaxyAmount(s) : { a: 0, la: 0 };
  const r4 = v => Math.round(v * 1e4) / 1e4, a = r4(A.a), la = r4(A.la);
  const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  const sig = a > 0 || la > 0 ? `${a},${la}` : '';
  const key = `${W}x${H}@${dpr}|${sig}`;
  if (c && key !== galaxyKey) {
    galaxyKey = key;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (sig) drawGalaxy(g, galaxyGeom(W, H), a, la, SERIF_CSS);
  }
  galaxyShown = sig ? { a, la, label: GALAXY_LABEL, ...galaxyGeom(W, H) } : null;
  return sig;
}
const READY_IN = 0.35, READY_OUT = 0.15;
const READY_INK = [[98, 110, 128], [125, 141, 163]];
function readyAmount(st) {
  const K = st.K, at = st.at ?? 1, step = K > 0 ? T.STEPS[K] : null, more = K < T.LAST;
  if (at >= 1 && T.isThrough(K)) return 0;
  if (!step || at >= 1) return more ? 1 : 0;
  if (REDUCED) return at <= 0 && !T.isThrough(K - 1) ? 1 : 0;
  const dur = step.dur, t = Math.max(0, at) * dur;
  const out = T.isThrough(K - 1) ? 0 : 1 - smooth(0, Math.min(READY_OUT, 0.2 * dur), t);
  const inn = more && !T.isThrough(K) ? smooth(dur - Math.min(READY_IN, 0.25 * dur), dur, t) : 0;
  return Math.max(out, inn);
}
function readyCue(st, dark) {
  const el = $('ready');
  if (!el) return '';
  const a = V3 && CUE && !inStills() ? Math.round(readyAmount(st) * 1e4) / 1e4 : 0;
  const d = Math.min(1, Math.max(0, dark || 0));
  el.style.opacity = String(a);
  el.style.background = onGround(READY_INK[0], READY_INK[1], d);
  return a > 0 ? `${a},${d.toFixed(3)}` : '';
}
let answer = DEFAULT_ANSWER;
const hashOf = K => T.hashOf(K) + (beatAt(K) === ANSWER_BEAT && answer !== DEFAULT_ANSWER ? `~${REGIONS[answer].key}` : '');
function parseHash(h) {
  const m = /~([a-z])$/.exec(h);
  const a = m ? answerOfKey(m[1]) : -1;
  answer = a >= 0 ? a : DEFAULT_ANSWER;
  return T.parseHash(h.replace(/~[a-z]$/, ''));
}
let conductor, beamsRef = null, foldRef = null, interaction = null, peek = null, mouse = null, excursion = null, lastState = null, local = null;
let surveyRef = null, surveyLabels = null, chartReport = [];
const SCENES_USED = new Set(BEATS.map(b => b.scene));
async function loadDesi() {
  if (!V3) return { survey: null, charts: null };
  const [S, C, A] = await Promise.all([import('../survey/data.js'), import('../chart/data.js'), import('../chart/alpha.js')]);
  if (await A.loadAlpha()) document.documentElement.style.setProperty('--serif', `"${A.ALPHA_FAMILY}", ${SERIF_CSS}`);
  const needs = PROGRAM === 'lw10' ? Object.keys(C.NEEDS).filter(k => SCENES_USED.has(k)).map(k => C.NEEDS[k]) : Object.values(C.NEEDS);
  const [survey, { charts, report }] = await Promise.all([
    S.loadSurvey('../volume-spike/data/v3/', { skewerMax: S.SKEWERS_DRAWN, pace: 'count' }),
    C.loadCharts([...new Set(needs.flat())]),
  ]);
  chartReport = report;
  for (const r of report) if (r.errors.length) console.warn(`chart ${r.name}: ${r.errors.join(' · ')}`);
  if (survey.warnings && survey.warnings.length) console.warn('survey data:', survey.warnings.join(' · '));
  return { survey, charts };
}
try {
  const [cube, f5, desi] = await Promise.all([load('../volume-spike/data/flux_cube_240.bin', 'the volume'),
    load('../volume-spike/data/f5.bin', 'the plane'), loadDesi()]);
  cubeData = new Uint16Array(cube);
  const gasFile = await fetch('../volume-spike/data/skewer.json').then(r => (r.ok ? r.json() : null)).catch(() => null);
  $('loading').textContent = 'preparing';
  const u16 = new Uint16Array(f5);
  realData = REAL_DATA;
  const data = prepareData(new Uint16Array(cube), u16, buildPigmentMaps);
  GAS = prepareGas(gasFile, data.plane);
  data.beams = buildBeams(num('qso', 6));
  const F = Float32Array.from(u16, x => x / 65535);
  const rows = new Float32Array(1389 * 2);
  rows.set(F.subarray(ROW * 1389, ROW * 1389 + 1389), 0);
  rows.set(F.subarray((ROW + 1) * 1389, (ROW + 1) * 1389 + 1389), 1389);
  const stubs = createStubs($('stub'));
  stubsRef = stubs;
  let foldR = null, ghostsR = null, surveyR = null;
  const [SR, SL, SP, CR] = V3 ? await Promise.all([import('../survey/render.js'), import('../survey/labels.js'), import('../survey/look.js'), import('../chart/render.js')]) : [];
  try {
    foldR = createFold($('fold'), data, foldOpts);
    ghostsR = createGhosts($('ghosts'), { ghosts: buildGhosts(F, ghostOpts.n, ghostOpts.keep), rows }, ghostOpts);
    if (V3) surveyR = SR.createRenderer($('survey'), desi.survey, { look: surveyLook(), dprMax: num('dpr', QL.dpr) });
  } catch (e) {
    noGL = String(e.message || e);
  }
  for (const c of [$('fold'), $('ghosts'), $('survey')]) {
    c.addEventListener('webglcontextlost', () => { glLost = true; });
    c.addEventListener('webglcontextrestored', () => { glLost = false; });
  }
  const cut = maskRange(num('cut', 0.2));
  CUT_RANGE = cut;
  const CLIP = $('gasview') && $('beamspec') ? createBeam($('gasview'), $('zoomvideo'), $('beamspec')) : null;
  if (CLIP) fetch('../volume-spike/data/lw10/beam.json').then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(d => CLIP.setData(d)).catch(e => console.warn('the beam\'s data are missing (tools/make_beam_media.py):', e));
  clipRef = CLIP;
  const EXPANSION = $('expansion') ? createExpansion($('expansion')) : null;
  expansionRef = EXPANSION;
  if (EXPANSION) fetch('../volume-spike/data/v3/charts/distances.json').then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(d => EXPANSION.setData(d)).catch(e => console.warn('the distances for the expansion are missing:', e));
  const GAP = $('gap') ? createGap($('gap')) : null;
  gapRef = GAP;
  if (GAP && SCENES_USED.has('gap')) {
    const get = u => fetch(u).then(r => (r.ok ? r.json() : Promise.reject(new Error(`${u}: HTTP ${r.status}`))));
    Promise.all([get('../volume-spike/data/v3/charts/pk_z3.json'), get('../volume-spike/data/v3/charts/absorbers.json'), get('../volume-spike/data/lw10/gap.json'), get('../volume-spike/data/v3/charts/why.json')])
      .then(([pk, abs, gap, why]) => GAP.setData({ pk, abs, gap, why })).catch(e => console.warn('the payoff\'s data are missing (tools/make_beam_media.py):', e));
  }
  const LYM = $('lyman') ? createAtom($('lyman')) : null;
  lymanRef = LYM;
  const MAP = $('map') ? createMap($('map')) : null;
  mapRef = MAP;
  const COUNT = $('count') ? createCount($('count')) : null;
  countRef = COUNT;
  if (COUNT && SCENES_USED.has('count')) {
    const get = u => fetch(u).then(r => (r.ok ? r.json() : Promise.reject(new Error(`${u}: HTTP ${r.status}`))));
    get('../volume-spike/data/lw10/count.json')
      .then(count => COUNT.setData({ count })).catch(e => console.warn('the count\'s data are missing (tools/make_beam_media.py):', e));
  }
  const LAYERS = {
    fold: { el: $('layer-fold'), r: foldR, cfg: { hero: HERO, mask: [0, -1] } },
    mask: { el: $('layer-fold'), r: foldR, cfg: { hero: DLA_ROW, mask: cut, win: recordWindow() } },
    ghosts: { el: $('layer-ghosts'), r: ghostsR, cfg: {} },
  };
  LAYERS.confession = { ...LAYERS.mask };
  if (V3 && ghostsR) LAYERS.ghosts = { ...LAYERS.ghosts, r: { ...ghostsR, render: (s, cfg) => {
    const rust = Math.min(1, Math.max(0, ((s.logN || 0) - 20.28) / 0.04));
    const out = ghostsR.render(s.profileOp > 0 && rust > 0 ? { ...s, profileOp: s.profileOp * (1 + (1 / 0.55 - 1) * rust) } : s, cfg);
    const cap = $('caption'), words = s ? absorberWords3(s.logN || 0, s.swap || 0) : '';
    if (cap && s && cap.textContent !== words) cap.textContent = words;
    return out;
  } } };
  LAYERS.mask3 = { ...LAYERS.mask, r: foldR && { ...foldR, render: (s, cfg) => {
    const o = foldOpts.neighOp; foldOpts.neighOp = NEIGH3;
    try { return foldR.render(s, cfg); } finally { foldOpts.neighOp = o; }
  } } };
  LAYERS.return = { ...LAYERS.fold };
  LAYERS.record = { ...LAYERS.fold };
  LAYERS.read = { el: $('layer-fold'), r: foldR, cfg: null };
  LAYERS.arrival = { ...LAYERS.fold };
  const NEIGH_FOLD = 1.0, BOX_FOLD = 1 / 0.55, INK_FOLD = 0.2;
  if (V3) LAYERS.fold = { ...LAYERS.fold, r: foldR && { ...foldR, render: (s, cfg) => {
    const o = foldOpts.neighOp; foldOpts.neighOp = NEIGH_FOLD;
    const b = Math.min(1, Math.max(0, s.box || 0));
    const s3 = b > 0 ? { ...s, box: s.box * (1 + (BOX_FOLD - 1) * b), inkScale: (s.inkScale ?? 1) * (1 + INK_FOLD * b) } : s;
    try { return foldR.render(s3, cfg); } finally { foldOpts.neighOp = o; }
  } } };
  stackFit = s => {
    if (!foldR || !(s.traceN > 0) || !(s.traceOp > 0)) return s;
    const n = Math.ceil(s.traceN), yH = 0.5 - (HERO + 0.5) / 480, half = n * s.traceSpread + s.traceAmp / 2;
    if (!(half > 0)) return s;
    const T0 = foldR.project(s, [0, yH + half, SHEET_Z]), C0 = foldR.project(s, [0, yH, SHEET_Z]), B0 = foldR.project(s, [0, yH - half, SHEET_Z]);
    if (!T0 || !C0 || !B0) return s;
    const H = innerHeight, k = Math.min(1, (C0[1] - 0.18 * H) / Math.max(1e-6, C0[1] - T0[1]), (0.92 * H - C0[1]) / Math.max(1e-6, B0[1] - C0[1]));
    return k >= 1 ? s : { ...s, traceSpread: s.traceSpread * k, traceAmp: s.traceAmp * k };
  };
  TEX = buildTexture(F, HERO);
  LAYERS.texture = { el: $('layer-texture'), r: createTexture($('texture'), TEX, { dprMax: 2 }), cfg: null };
  LAYERS.texture3 = LAYERS.texture;
  if (V3 && LAYERS.texture.r) LAYERS.texture3 = { ...LAYERS.texture, r: { ...LAYERS.texture.r, render: (s, cfg) => {
    if (!s || !(s.cur < 1)) return LAYERS.texture.r.render(s, cfg);
    const c = Math.max(s.cur, 1e-3);
    return LAYERS.texture.r.render({ ...s, rec: s.rec * c, ghost: s.ghost / c }, cfg);
  } } };
  const chartRs = {};
  const chartFor = look => chartRs[look] || (chartRs[look] = CR.createRenderer($('chart'), desi.charts, { look, dprMax: 2 }));
  if (V3 && surveyR) {
    surveyLabels = SL.createLabels($('survey-labels'), desi.survey, SP.palette(surveyLook()));
    const r = { ...surveyR, render: st => { surveyR.render(st); surveyLabels.update(st, innerWidth, innerHeight); } };
    for (const name of SURVEYS) LAYERS[name] = { el: $('layer-survey'), r, cfg: null };
  }
  if (V3) for (const name of CHARTS) LAYERS[name] = { el: $('layer-chart'), r: chartFor('paper'), cfg: null, chart: true };
  if (CLIP) LAYERS.clip = { el: $('layer-clip'), r: CLIP, cfg: null };
  if (EXPANSION) LAYERS.expansion = { el: $('layer-expansion'), r: EXPANSION, cfg: null };
  if (GAP) LAYERS.gap = { el: $('layer-gap'), r: GAP, cfg: null };
  if (COUNT) LAYERS.count = { el: $('layer-count'), r: COUNT, cfg: null };
  if (LYM) LAYERS.lyman = { el: $('layer-lyman'), r: LYM, cfg: null };
  if (MAP) LAYERS.map = { el: $('layer-map'), r: MAP, cfg: null };
  if (V3) { try { chartFor('paper').warm(); } catch (e) { console.warn('chart warm-up:', e); } }
  surveyRef = surveyR;
  const chartLayer = (L, beat) => (L && L.chart ? { ...L, r: chartFor(BEATS[beat].dark[BEATS[beat].dark.length - 1] ? 'dark' : 'paper') } : L);
  const irisOf = st => {
    if (st.iris === undefined || !surveyR) return null;
    if (surveyR.iris) { const d = surveyR.iris({ ...st.s, iris: st.iris }); return { x: d.x, y: d.y, r: d.r, far: Math.hypot(innerWidth, innerHeight) }; }
    const [x, y] = surveyR.project(st.s, 0, 0), W = innerWidth, H = innerHeight;
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
    return { x, y, r: st.iris * far, far };
  };
  const irisFootOp = I => {
    const W = innerWidth, H = innerHeight, x0 = 0.08 * W, x1 = 0.84 * W, y0 = FOOT_ROW_TOP * H, y1 = 0.975 * H;
    const dmin = Math.hypot(I.x - Math.min(Math.max(I.x, x0), x1), I.y - Math.min(Math.max(I.y, y0), y1));
    const dmax = Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px, py]) => Math.hypot(px - I.x, py - I.y)));
    return smooth(0, 0.08 * H, I.r < dmin ? dmin - I.r : I.r > dmax ? I.r - dmax : 0);
  };
  const nightAt = (I, px, py) => Math.min(1, Math.max(0, (I.r - Math.hypot(px - I.x, py - I.y)) / (0.04 * I.far) + 0.5));
  const turnIrisOf = st => {
    if (!V3 || REDUCED || !(st.dark > 0 && st.dark < 1) || !T.STEPS[st.K] || !T.STEPS[st.K].turn || !(LAYERS[st.scene] && LAYERS[st.scene].chart)) return null;
    const W = innerWidth, H = innerHeight, x = (1 - PLOT_WIDTH) / 2 * W, y = 0.5 * H;
    const R0 = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
    return { x, y, r: st.dark * R0, far: Math.hypot(W, H) };
  };
  const nightChart = () => chartRs.night || (chartRs.night = CR.createRenderer($('chart-night'), desi.charts, { look: 'dark', dprMax: 2 }));
  let nightOn = false;
  let irisKey = '';
  const irisWordsOf = (D, keep) => ({ x: D.x, y: D.y, r: D.r, keep });
  heroF = F.subarray(HERO * 1389, HERO * 1389 + 1389);
  beamsRef = data.beams; foldRef = foldR;
  let active = null, active2 = null;
  const FOLD_SAFE = { top: 0.19, bottom: 0.92, left: 0.04, right: 0.72 }, SHEET_SAFE = { ...FOLD_SAFE, right: 0.96 };
  const boxBounds = s => {
    const z0 = Math.max(-0.5, SHEET_Z - s.slabW), z1 = Math.min(0.5, SHEET_Z + s.slabW), b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [z0, z1]) {
      const P = foldR.project(s, [x, y, z]);
      if (!P) return null;
      b.x0 = Math.min(b.x0, P[0]); b.x1 = Math.max(b.x1, P[0]); b.y0 = Math.min(b.y0, P[1]); b.y1 = Math.max(b.y1, P[1]);
    }
    return b;
  };
  fitFold = s => {
    const ss = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
    const wv = ss((s.slabW || 0) / 0.25), wsh = ss((s.sheetAmt || 0) / 0.35);
    const w = Math.max(wv, wsh);
    if (!(w > 0) || !foldR) return s;
    const W = innerWidth, H = innerHeight, B = boxBounds(s);
    if (!B) return s;
    const SAFE = { top: FOLD_SAFE.top, bottom: FOLD_SAFE.bottom, left: FOLD_SAFE.left, right: SHEET_SAFE.right + (FOLD_SAFE.right - SHEET_SAFE.right) * wv };
    const sw = (SAFE.right - SAFE.left) * W, sh = (SAFE.bottom - SAFE.top) * H;
    const f = Math.min(1, 0.96 * sw / (B.x1 - B.x0), 0.96 * sh / (B.y1 - B.y0));
    let t = { ...s, frame: s.frame * (1 + (f - 1) * w) * (1 + (s.zoomIn || 0)) };
    const C = boxBounds(t);
    if (!C) return t;
    const cx = (C.x0 + C.x1) / 2, cy = (C.y0 + C.y1) / 2;
    const wx = (SAFE.left + SAFE.right) / 2 * W, wy = (SAFE.top + SAFE.bottom) / 2 * H, e = 0.01;
    const DY = boxBounds({ ...t, lookY: t.lookY + e }), DX = boxBounds({ ...t, driftX: t.driftX + e });
    if (!DY || !DX) return t;
    const a = ((DX.x0 + DX.x1) / 2 - cx) / e, c = ((DX.y0 + DX.y1) / 2 - cy) / e, b = ((DY.x0 + DY.x1) / 2 - cx) / e, d = ((DY.y0 + DY.y1) / 2 - cy) / e;
    const det = a * d - b * c;
    if (!(Math.abs(det) > 1e-6)) return t;
    const ux = (d * (wx - cx) - b * (wy - cy)) / det, uy = (-c * (wx - cx) + a * (wy - cy)) / det;
    return { ...t, driftX: t.driftX + w * ux, lookY: t.lookY + w * uy };
  };
  foldBounds = s => boxBounds(s);
  const concat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
  conductor = {
    render(st) {
      try { conductor.renderLive(st); }
      catch (e) {
        console.error('renderer failed; switching to the stills', e);
        noGL = `renderer error: ${String(e.message || e).slice(0, 60)}`;
        document.body.classList.add('stills'); active = null; active2 = null; INK_DISC = null; document.body.classList.remove('turn-hide'); showStill(st.K); headline(st); smallPrint(st); offer(st); if (V3) { band(st); progressBar(st); provTag(st); readyCue(st, st.dark); }
      }
    },
    renderLive(st) {
      if (BREAK) throw new Error('test: renderer broken on purpose');
      document.body.classList.toggle('stills', inStills());
      if (inStills()) { if (clipRef) { clipRef.idle(); $('layer-clip').style.visibility = 'hidden'; } active = null; active2 = null; INK_DISC = null; document.body.classList.remove('turn-hide'); showStill(st.K); headline(st); smallPrint(st); offer(st); if (V3) { band(st); progressBar(st); provTag(st); readyCue(st, st.dark); } return; }
      $('still').hidden = true;
      if (gasPick != null) {
        const at = st.at ?? 1;
        const keep = (st.K === gasPickK && (at >= 1 || gasPickK === K_GAS)) || (K_SWEEP >= 0 && gasPickK === K_SWEEP && st.K === K_SWEEP + 1 && at < 1);
        if (!keep) gasPick = null;
      }
      if (interaction && BEATS[st.beat].interact && st.scene === 'confession') st = { ...st, s: interaction.apply(st.s) };
      if (st.scene === 'read') st = { ...st, s: applyAnswer(st.s, answer) };
      if (peek && (st.scene === 'mask' || st.scene === 'mask3')) st = { ...st, s: peek.apply(st.s) };
      if (mouse) st = { ...st, s: mouse.apply(st.scene, st.s) };
      if (V3 && st.scene === 'fold') st = { ...st, s: stackFit(st.s) };
      if (V3 && st.scene === 'fold' && BEATS[st.beat].fit) st = { ...st, s: fitFold(st.s) };
      lastState = st;
      if (document.body.dataset.scene !== st.scene) document.body.dataset.scene = st.scene;
      const L = chartLayer(LAYERS[st.scene] || null, st.beat);
      const I = irisOf(st), U = I && st.under ? chartLayer(LAYERS[st.under.scene] || null, st.under.beat) : null;
      const TI = I ? null : turnIrisOf(st), G = I || TI;
      const L2 = U && U.el !== (L && L.el) ? U : null;
      for (const el of [$('layer-fold'), $('layer-ghosts'), $('layer-texture'), $('layer-survey'), $('layer-chart'), $('layer-clip'), $('layer-expansion'), $('layer-gap'), $('layer-count'), $('layer-lyman'), $('layer-map')]) {
        if (!el) continue;
        const op = L && L.el === el ? st.op : L2 && L2.el === el ? 1 : 0;
        el.style.opacity = String(op);
        el.style.visibility = op > 0 ? 'visible' : 'hidden';
        if (op === 0 && el.id === 'layer-clip' && clipRef) clipRef.idle();
      }
      const chartCfg = V3 ? { tagW: tagWidthVw(provOf(st.K)) } : null;
      irisWordsShown = { under: L2 && L2.chart ? irisWordsOf(I, 'outside') : null, chart: TI && L && L.chart ? irisWordsOf(TI, 'outside') : null,
        night: TI ? irisWordsOf(TI, 'inside') : null };
      if (L2) L2.r.render(irisWordsShown.under ? { ...st.under.s, irisWords: irisWordsShown.under } : st.under.s, L2.chart ? chartCfg : L2.cfg);
      if (L && st.op > 0) L.r.render(I ? { ...st.s, iris: st.iris } : TI ? { ...st.s, lc: 1, irisWords: irisWordsShown.chart } : st.s, st.scene === 'read' ? cfgFor(answer, st.s) : L.chart ? chartCfg : L.cfg);
      if (TI) {
        const xs = TI.x.toFixed(1), ys = TI.y.toFixed(1), rs = TI.r.toFixed(1), W = innerWidth, H = innerHeight;
        nightChart().render({ ...st.s, lc: 0, irisWords: irisWordsShown.night }, chartCfg);
        $('chart-night').style.clipPath = `circle(${rs}px at ${xs}px ${ys}px)`;
        $('chart-night').style.visibility = 'visible';
        $('chart').style.clipPath = `path(evenodd, "M0 0H${W}V${H}H0Z M${(TI.x - TI.r).toFixed(1)} ${ys}a${rs} ${rs} 0 1 0 ${(2 * TI.r).toFixed(1)} 0a${rs} ${rs} 0 1 0 ${(-2 * TI.r).toFixed(1)} 0Z")`;
        nightOn = true;
      } else if (nightOn) {
        nightChart().render(null);
        $('chart-night').style.visibility = 'hidden'; $('chart-night').style.clipPath = ''; $('chart').style.clipPath = '';
        nightOn = false;
      }
      active = L && st.op > 0 ? L : null;
      active2 = L2;
      lastChartR = L && L.chart && st.op > 0 ? L.r : null;
      stubs.render(st);
      const key = G ? `${G.x.toFixed(1)},${G.y.toFixed(1)},${G.r.toFixed(1)}` : '';
      if (key !== irisKey) { $('layer-survey').style.zIndex = I ? '1' : ''; irisKey = key; }
      if (G) $('stub').style.background = `radial-gradient(circle at ${G.x.toFixed(1)}px ${G.y.toFixed(1)}px, rgb(12,18,27) ${G.r.toFixed(1)}px, rgb(244,242,237) ${(G.r + 1.5).toFixed(1)}px)`;
      const top = G ? { ...st, dark: nightAt(G, 0.08 * innerWidth, 0.06 * innerHeight) } : st;
      const bot = G ? { ...st, dark: nightAt(G, 0.9 * innerWidth, 0.95 * innerHeight) } : st;
      INK_DISC = V3 && G ? G : null;
      if (V3) {
        const fo = I ? irisFootOp(I) : 1, yF = (FOOT_ROW_TOP * innerHeight).toFixed(1);
        const m = fo < 1 ? `linear-gradient(to bottom, #000 ${yF}px, rgba(0,0,0,${fo.toFixed(3)}) ${yF}px)` : '';
        for (const k of ['mask-image', '-webkit-mask-image']) setCss($('layer-chart').style, k, m);
        setCss($('survey-labels').style, '--iris-foot', fo.toFixed(3)); $('survey-labels').classList.toggle('iris-foot', fo < 1);
      }
      const hide = V3 && REDUCED && !!T.STEPS[st.K] && !!T.STEPS[st.K].turn && (st.at ?? 1) > 0 && (st.at ?? 1) < 1;
      document.body.classList.toggle('turn-hide', hide);
      const endOp = st.scene === 'return' ? (st.s.title || 0) * st.op : 0;
      $('endtitle').style.opacity = String(endOp);
      const wordOp = !V3 && st.scene === 'record' ? (st.s.word || 0) * st.op : 0;
      $('word').style.opacity = String(wordOp);
      const cb = V3 ? cutBand(st) : '';
      const wa = V3 ? waveArrow(st) : '';
      const gx = V3 ? galaxyOverlay(st) : '';
      const rc = V3 ? readyCue(st, G ? nightAt(G, 0.03 * innerWidth, 0.953 * innerHeight) : st.dark) : '';
      endSig = `${endOp}|${wordOp}|${arrivalOverlays(st)}|${axisOverlay(st)}|${V3 ? provTag(bot) : simTag(st)}|${realOverlay(st)}|${headline(top)}|${smallPrint(bot)}|${explainOverlays(st)}|${offer(st)}` +
        (V3 ? `|${band(top)}|prog:${progressBar(top)}|${active && active.el.id === 'layer-survey' ? surveyLabelsSig() : ''}|${key}${hide ? '|hide' : ''}` : '') + (cb ? `|cutband:${cb}` : '') + (wa ? `|wave:${wa}` : '') +
        (gx ? `|galaxy:${gx}` : '') + (rc ? `|ready:${rc}` : '');
    },
    readRaw() {
      const sig = new TextEncoder().encode(stubs.signature() + (active ? `|${active.el.id}|${active.el.style.opacity}` : '') + `|${endSig}`);
      const px = active ? (active2 ? concat(active.r.readRaw(), active2.r.readRaw()) : nightOn ? concat(active.r.readRaw(), nightChart().readRaw()) : active.r.readRaw()) : new Uint8Array(0);
      const out = new Uint8Array(px.length + 4 * sig.length);
      out.set(px);
      sig.forEach((b, i) => { out[px.length + 4 * i] = b; out[px.length + 4 * i + 3] = 255; });
      return out;
    },
    readHash() { return fnv1a(conductor.readRaw()); },
    readScene() { return active ? fnv1a(active.r.readRaw()) : 'stub'; },
    readPixel(x, y) {
      const I = lastState && irisOf(lastState);
      if (I && Math.hypot(x / (devicePixelRatio || 1) - I.x, y / (devicePixelRatio || 1) - I.y) > I.r) return active2 ? active2.r.readPixel(x, y) : [244, 242, 237];
      if (I && active) return active.r.readPixel(x, y);
      const TI = lastState && turnIrisOf(lastState);
      if (TI && active) return Math.hypot(x / (devicePixelRatio || 1) - TI.x, y / (devicePixelRatio || 1) - TI.y) <= TI.r ? nightChart().readPixel(x, y) : active.r.readPixel(x, y);
      if (active && active.el.style.opacity === '1') return active.r.readPixel(x, y);
      return stubs.ground().match(/\d+/g).map(Number);
    },
    onRestore(f) { if (foldR) { foldR.onRestore(f); ghostsR.onRestore(f); } if (surveyR) surveyR.onRestore(f); },
    debugLines: () => (active ? active.r.debugLines() : 'stub'),
    loseContext: () => active && active.r.loseContext(),
  };
} catch (e) {
  say(String(e.message || e));
  throw e;
}
$('loading').hidden = true;

const chartNotes = () => {
  try { return lastChartR && lastChartR.notes ? lastChartR.notes().map(n => ({ text: String(n.text), shown: !!n.shown })) : []; } catch { return []; }
};
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('visual-lya-talk') : null;
let api = null;
function pressOf(k, s) {
  const K = s >= 1 && T.isThrough(k) ? k + 1 : k;
  if (K <= 0 || !T.STEPS[K]) return {};
  const [a, b] = T.pressSpan(K);
  if (a === b) return {};
  let total = 0, done = 0;
  for (let x = a; x <= b; x++) total += T.STEPS[x].dur;
  for (let x = a; x < K; x++) done += T.STEPS[x].dur;
  const sk = K === k ? s : 0;
  return { pressS: (done + sk * T.STEPS[K].dur) / total, pressDur: total };
}
function tell() {
  if (!channel || !api) return;
  const { k, s, animating, paused } = api.pos();
  channel.postMessage({ type: 'pos', K: k, s, animating, paused, beat: T.beatOf(k), local: T.localOf(k),
    n: T.stepsIn(T.beatOf(k)), hash: hashOf(k), blank: !$('blank').hidden, stills: inStills(), quality: QNAME,
    extra: excursion && excursion.isOpen() ? excursion.pos().k : -1, offer: !offerTaken && OFFER && k === K_OFFER,
    sources: chartNotes(), ready: s >= 1 && k < T.LAST && (!T.isThrough(k) || !animating), last: k >= T.LAST, dur: k > 0 && T.STEPS[k] ? T.STEPS[k].dur : 0,
    ...pressOf(k, s) });
}

function beatJump(to) { api.seek(T.stopAt(T.ENTRY[Math.max(0, Math.min(BEATS.length - 1, to))]), 1); }
function currentBeat() { const { k } = api.pos(); return T.beatOf(k); }
const digitBeat = n => (V3 ? BEATS.findIndex(B => B.section === n) : n);
function toggleIndex(show = $('index').hidden) { $('index').hidden = !show; }
function stepKey(dir) {
  if (!inStills()) return false;
  const { k, s } = api.pos();
  let to = dir > 0 ? (s < 1 ? k : k + 1) : (s < 1 ? k - 1 : k - 1);
  while (T.isThrough(to)) to += dir;
  api.seek(to, 1);
  tell();
  return true;
}
const EX_NEXT = new Set([' ', 'ArrowRight', 'PageDown']), EX_PREV = new Set(['ArrowLeft', 'PageUp']);
function openExcursion() { if (!excursion) return; offerTaken = true; excursion.show(); api.redraw(); }
function onKey(e, a) {
  api = a;
  const key = e.key;
  if (excursion && excursion.isOpen()) {
    if (EX_NEXT.has(key)) { excursion.next(); return true; }
    if (EX_PREV.has(key)) { excursion.prev(); return true; }
    excursion.close();
    if (key === 'Escape') return true;
  }
  if ((key === 'e' || key === 'E') && BEATS[currentBeat()].offer && !inStills()) { openExcursion(); tell(); return true; }
  if ((key === '[' || key === ']') && gasLive()) { gasMove(gasDotX() + (key === ']' ? 0.01 : -0.01) * innerWidth); return true; }
  if (key === 't' || key === 'T') { HEADS = !HEADS; api.redraw(); return true; }
  if (inStills() && (key === ' ' || key === 'ArrowRight' || key === 'PageDown')) return stepKey(1);
  if (!e.shiftKey && answerOfKey(key) >= 0 && BEATS[currentBeat()].answer) {
    const { k, s } = api.pos();
    if (k !== T.ENTRY[currentBeat()] || s !== 1) return false;
    answer = answerOfKey(key);
    if (inStills()) stepKey(1); else api.next();
    tell();
    return true;
  }
  if (inStills() && (key === 'ArrowLeft' || key === 'PageUp')) return stepKey(-1);
  if (!$('index').hidden) {
    if (key === 'Escape' || key === 'i' || key === 'I') { toggleIndex(false); return true; }
  }
  if (key === 'ArrowDown' && e.shiftKey) { beatJump(currentBeat() + 2); toggleIndex(false); }
  else if (key === 'ArrowDown') { beatJump(currentBeat() + 1); toggleIndex(false); }
  else if (key === 'ArrowUp') {
    const { k, s } = api.pos(), b = currentBeat();
    beatJump(k === T.stopAt(T.ENTRY[b]) && s === 1 ? b - 1 : b);
  }
  else if (key === 'r' || key === 'R') beatJump(currentBeat());
  else if (key === 'p' || key === 'P') api.pause();
  else if (key === 'i' || key === 'I') toggleIndex();
  else if (key === '.' || key === 'b' || key === 'B') $('blank').hidden = !$('blank').hidden;
  else if (key === 'Escape') { toggleIndex(false); $('blank').hidden = true; if (gasPick != null) { gasPick = null; api.redraw(); } }
  else if (/^[0-9]$/.test(key)) { if (digitBeat(+key) >= 0) beatJump(digitBeat(+key)); toggleIndex(false); }
  else if (key === '-') { if (END_BEAT >= 0) beatJump(END_BEAT); toggleIndex(false); }
  else if (key === 'w' || key === 'W') {}
  else if (key === 'f' || key === 'F') {
    if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  else if (key === 's' || key === 'S') {
    stillsMode = !stillsMode;
    const { k, s } = api.pos();
    if (stillsMode && s < 1) { let to = k; while (T.isThrough(to)) to += 1; api.seek(to, 1); }
  }
  else return false;
  tell();
  return true;
}

const thumbOf = i => `thumb/${T.hashOf(T.stopAt(T.ENTRY[i])).slice(1)}.jpg`;
$('index').innerHTML = '<ol start="0">' + BEATS.map((B, i) =>
  `<li data-beat="${i}">${haveStill.has(thumbOf(i)) ? `<img src="${STILLS_DIR}${thumbOf(i)}" alt="">` : ''}` +
  `<span>${V3 ? `§${B.section}` : i}</span> ${B.title}${B.droppable ? ' <em>droppable</em>' : ''}</li>`).join('') + '</ol>' +
  (V3 ? `<p>0–9 jump to that section · − the close · ↓ ↑ beat · Shift+↓ skip the next beat · R restart beat · P pause · S stills · . blank · T highlight line · [ ] the record’s colour · mouse: click next, right-click back, drag, hold · look: ${LOOK === 'scene' ? 'per scene (the fan dark, the charts paper)' : `${LOOK} (developer override)`}</p>`
    : '<p>0–9, − jump · ↓ ↑ beat · Shift+↓ skip the next beat · R restart beat · P pause · S stills · . blank · T headlines · E beat 8’s extra · [ ] beat 2’s colour · mouse: click next, right-click back, drag, hold</p>');
$('index').addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li || !api) return;
  beatJump(+li.dataset.beat); toggleIndex(false); api.redraw(); tell();
});

api = startPlayer({
  STEPS: T.STEPS, LAST: T.LAST, pose: T.pose, renderer: conductor, beat: 0, canvas: $('layers'),
  flags: { TEST, SELFTEST, DEBUG }, hashOf, parseHash, onKey, through: T.isThrough,
  onChange: (k, s, animating) => { tell(); if (local) local.onChange(k, s, animating); },
});
function flatView() { const f = lastState && lastState.s ? lastState.s.fov : 0; return !(Number.isFinite(f) && f > 5); }
if (!q.has('nointeract')) peek = createPeek({
  enabled: () => !inStills() && !!api && !!beatAt(api.pos().k).peek && flatView() && $('index').hidden && $('blank').hidden,
  redraw: () => api && api.redraw(),
});
function segDist(x, y, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy;
  const u = L ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / L)) : 0;
  return Math.hypot(x - a[0] - u * vx, y - a[1] - u * vy);
}
if (beamsRef && !q.has('nointeract')) {
  interaction = createInteraction({
    enabled: () => !inStills() && !!api && !!BEATS[T.beatOf(api.pos().k)].interact && $('index').hidden && $('blank').hidden && !(excursion && excursion.isOpen()),
    pick(x, y) {
      const st = lastState;
      if (!st || st.scene !== 'confession' || Math.max(st.s.keptInk || 0, st.s.comb || 0) < 0.3) return null;
      let best = null, bd = 14;
      for (const b of beamsRef.kept) {
        const a = foldRef.project(st.s, [-0.5, b.y, b.z]), c = foldRef.project(st.s, [0.5, b.y, b.z]);
        if (!a || !c) continue;
        const d = segDist(x, y, a, c);
        if (d < bd) { bd = d; best = b; }
      }
      return best;
    },
    redraw: () => api && api.redraw(),
    caption(b, op) {
      const el = $('iso-caption');
      el.textContent = b ? `one quasar’s sightline${b.dla ? ', through the damped absorber' : ''}: this line, and nothing beside it` : el.textContent;
      el.style.opacity = String(op);
    },
  });
}

excursion = createExcursion({
  canvas: $('lamps'), data: () => cubeData, reduced: REDUCED, onStep: () => { tell(); if (local) local.onExtra(excursion.pos().k); },
  onClose: () => { if (interaction) interaction.release(); if (mouse) mouse.release(); tell(); if (local) local.onExtra(-1); },
  redrawTalk: () => api && api.redraw(),
});
if (q.has('rehearse') || q.has('dryrun')) local = createLocalTools({ q, T, BEATS, pos: () => api.pos(), next: () => stepBy(1), extraOpen: () => excursion.isOpen() });
$('offer-yes').addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); openExcursion(); tell(); });
$('offer-no').addEventListener('click', e => { e.stopPropagation(); e.currentTarget.blur(); api.next(); tell(); });

function gasLive() {
  if (!GAS || GAS.pick == null || inStills() || !api || !lastState || lastState.scene !== 'record') return false;
  const { k, s } = api.pos();
  return (k === K_GAS || k === K_SWEEP) && s === 1;
}
const gasDotX = () => gasFrame(lastState.s).Xs(wrapU(gasColour()) / GAS.HUB);
function gasColourAt(x) {
  const { Xs } = gasFrame(lastState.s);
  x = Math.max(0.02 * innerWidth, Math.min(0.98 * innerWidth, x));
  let a = GAS_WIN[0] - 6, b = GAS_WIN[1] + 6;
  for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (Xs(c) < x) a = c; else b = c; }
  return (a + b) / 2 * GAS.HUB;
}
function gasMove(x) { gasPick = gasColourAt(x); gasPickK = api.pos().k; api.redraw(); }

const stepBy = dir => {
  if (excursion.isOpen()) return dir > 0 ? excursion.next() : excursion.prev();
  if (!stepKey(dir)) (dir > 0 ? api.next : api.prev)();
  api.redraw(); tell();
};
if (!q.has('nointeract')) mouse = createMouse({
  enabled: () => !!api && $('index').hidden && $('blank').hidden,
  next: () => stepBy(1), prev: () => stepBy(-1),
  click(x, y) {
    if (excursion.isOpen() || inStills()) return false;
    const { k, s } = api.pos(), b = T.beatOf(k);
    if (BEATS[b].answer && k === T.ENTRY[b] && s === 1 && lastState && foldRef) {
      let best = -1, bd = Infinity;
      READ_REGIONS.forEach((r, i) => { const P = foldRef.project(lastState.s, [regionX(r), READ_Y, SHEET_Z]); if (P && Math.abs(P[0] - x) < bd) { bd = Math.abs(P[0] - x); best = i; } });
      if (best >= 0) { answer = best; api.next(); tell(); return true; }
    }
    return false;
  },
  hold(on, x, y) {
    if (excursion.isOpen() || inStills()) return false;
    const b = T.beatOf(api.pos().k);
    if (BEATS[b].peek && peek && flatView()) { peek.hold(on ? 1 : 0); return true; }
    if (BEATS[b].interact && interaction) return interaction.holdAt(on, x, y);
    return false;
  },
  canDrag() {
    if (excursion.isOpen()) return dx => excursion.drag(dx);
    if (inStills() || !lastState) return null;
    if (gasLive()) { const x0 = gasDotX(); return dx => gasMove(x0 + dx); }
    const s = lastState.s;
    const b = T.beatOf(api.pos().k);
    return BEATS[b].turn && Number.isFinite(s.fov) && s.fov > 5 ? 'turn' : null;
  },
  redraw: () => api && api.redraw(),
  hintFor() {
    if (excursion.isOpen()) return 'drag ↔: more or fewer lamps · click: next · right-click: back · Esc: back to the talk';
    if (inStills()) return 'click: next · right-click: back';
    const { k, s } = api.pos(), b = T.beatOf(k), st = lastState ? lastState.s : {};
    const parts = [];
    if (BEATS[b].answer && k === T.ENTRY[b] && s === 1) parts.push('click the line where the room points');
    if (gasLive()) parts.push('drag (or [ ]): another colour, and the gas that ate it');
    if (BEATS[b].peek && flatView()) parts.push('hold the mouse: look behind the cut');
    if (BEATS[b].interact) parts.push('hold on a beam: that beam alone · scroll: the other picture');
    if (BEATS[b].offer && k === K_OFFER && !offerTaken) parts.push('E: the extra');
    if (BEATS[b].turn && Number.isFinite(st.fov) && st.fov > 5) parts.push('drag: turn the box');
    parts.push('click: next · right-click: back');
    return parts.join(' · ');
  },
});

if (channel) channel.onmessage = ({ data }) => {
  if (data.type === 'hello') return tell();
  if (data.type !== 'key' || !api) return;
  if (data.key === 'next' || data.key === 'prev') { stepBy(data.key === 'next' ? 1 : -1); return; }
  const fake = { key: data.key, shiftKey: !!data.shift, preventDefault() {} };
  onKey(fake, api);
  api.redraw(); tell();
};
let idleTimer = 0;
addEventListener('mousemove', () => {
  document.body.classList.remove('idle'); document.body.classList.add('mouse');
  clearTimeout(idleTimer); idleTimer = setTimeout(() => document.body.classList.add('idle'), 2000);
});
let wake = null;
async function keepAwake() {
  if (wake || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } catch {}
}
addEventListener('keydown', keepAwake);
document.addEventListener('visibilitychange', keepAwake);

if (TEST) window.__talk = {
  quality: QNAME,
  bench(K, s, n = 20) {
    const st = T.pose(K, s), times = [];
    conductor.render(st); conductor.readPixel(1, 1);
    for (let i = 0; i < n; i++) { const t0 = performance.now(); conductor.render(st); conductor.readPixel(1, 1); times.push(performance.now() - t0); }
    return { mean: times.reduce((a, b) => a + b, 0) / n, worst: Math.max(...times) };
  },
  kOf: label => { const r = T.parseHash('#' + label); return r ? r[0] : -1; }, ENTRY: T.ENTRY, LAST: T.LAST, beatOf: T.beatOf, hashOf, reduced: REDUCED, answer: () => answer,
  isThrough: T.isThrough, pressSpan: T.pressSpan, stopAt: T.stopAt, pressOf,
  settle: () => Promise.all([clipRef ? clipRef.settle() : null, expansionRef ? expansionRef.settle() : null, gapRef ? gapRef.settle() : null, countRef ? countRef.settle() : null, lymanRef ? lymanRef.settle() : null, mapRef ? mapRef.settle() : null]),
  program: PROGRAM, look: LOOK, idOf: T.idOf, entryOf: T.entryOf, lastOf: T.lastOf, ids: BEATS.map(B => B.id),
  survey: () => surveyRef && { hero: surveyRef.hero(), info: surveyRef.info(), look: surveyRef.look },
  safe: () => ({ top: SAFE_TOP * innerHeight, gasTop: GAS_TOP * innerHeight, box: lastState && lastState.scene === 'fold' && (lastState.s.slabW > 0 || lastState.s.sheetAmt > 0) ? foldBounds(lastState.s) : null,
    bars: lastState && lastState.scene === 'record' && (lastState.s.gas || 0) > 0 ? gasBarsTop : null, W: innerWidth, H: innerHeight }),
  sources: () => chartNotes(),
  charts: () => chartReport.map(r => ({ name: r.name, from: r.from, errors: r.errors.length, warnings: r.warnings.length })),
  band: () => Object.fromEntries(['banner', 'headline', 'mine', 'simtag'].map(id => [id, { text: $(id).textContent, op: +$(id).style.opacity }])),
  bar: () => ({ scale: +(/scaleY\(([\d.]+)\)/.exec($('minebar').style.transform || '') || [0, 0])[1], op: +$('minebar').style.opacity || 0 }),
  scene: () => { window.__spike.hash(); return `${conductor.readScene()}|${lastState ? explainOverlays(lastState) : ''}`; },
  gesture: () => (interaction ? interaction.active() : false) || (peek ? peek.active() : false) || (mouse ? mouse.active() : false) || gasPick != null,
  peek: v => peek && peek.hold(v),
  gas: { live: () => gasLive(), colour: () => GAS && gasColour(), pick: () => GAS && GAS.pick, dotX: () => gasDotX(), move: x => gasMove(x),
    setU: u => { gasPick = u; gasPickK = api.pos().k; api.redraw(); }, du: () => GAS && GAS.du },
  heads: on => { HEADS = on; api.redraw(); return window.__spike.hash(); },
  breakRenderer: () => { BREAK = true; },
  shown: () => lastState && { mask: lastState.s.mask, cut: lastState.s.cut },
  cutBand: () => cutBandShown,
  wave: () => waveShown,
  galaxy: () => galaxyShown,
  ready: () => ({ cue: CUE, amount: lastState ? readyAmount(lastState) : null, op: +$('ready').style.opacity || 0 }),
  readyAt: (K, s) => readyAmount(T.pose(K, s)),
  irisWords: () => irisWordsShown,
  before: () => beforeShown,
  dur: K => (T.STEPS[K] ? T.STEPS[K].dur : 0),
  stack: () => {
    const st = lastState;
    if (!st || st.scene !== 'fold' || !foldRef || !(st.s.traceN > 0) || !(st.s.traceOp > 0)) return null;
    const s = st.s, yH = 0.5 - (HERO + 0.5) / 480, half = Math.ceil(s.traceN) * s.traceSpread + s.traceAmp / 2;
    const T0 = foldRef.project(s, [0, yH + half, SHEET_Z]), B0 = foldRef.project(s, [0, yH - half, SHEET_Z]);
    return T0 && B0 ? { top: T0[1], bottom: B0[1], H: innerHeight } : null;
  },
  headline: () => ({ text: $('headline').textContent, op: +$('headline').style.opacity }),
  offer: () => +$('offer').style.opacity,
  excursion: { open: () => { openExcursion(); return excursion.pos(); }, close: () => excursion.close(), isOpen: () => excursion.isOpen(),
    seek: (k, s) => excursion.seek(k, s), pos: () => excursion.pos(), rs: () => excursion.rs() },
  beamAt: j => { const b = beamsRef.kept[j], s = lastState.s, a = foldRef.project(s, [-0.2, b.y, b.z]), c = foldRef.project(s, [0.2, b.y, b.z]);
    return [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]; },
  stills: () => ({ on: inStills(), src: $('still').hidden ? null : $('still').getAttribute('src'), note: $('stills-note').textContent }),
  key: (key, shift = false) => { onKey({ key, shiftKey: shift }, api); return window.__spike.hash(); } };
