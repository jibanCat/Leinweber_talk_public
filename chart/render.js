import { LOOKS, resolveLook, resolveTest, unit } from './kit.js';
import { drawBao } from './scenes/bao.js';
import { drawW0wa } from './scenes/w0wa.js';
import { drawPk } from './scenes/pk.js';
import { drawRuler } from './scenes/ruler.js';
import { drawFullShape } from './scenes/fullshape.js';
import { drawXi } from './scenes/xi.js';
import { drawHcd, drawAbsCosmo } from './scenes/absorbers.js';
import { drawSpectrum } from './scenes/spectrum.js';
import { drawFind } from './scenes/find.js';
import { drawWhy, drawEmulator } from './scenes/small.js';
import { drawEmuWalk } from './scenes/emuwalk.js';
import { drawMywork } from './scenes/mywork.js';
import { drawScales } from './scenes/scales.js';
import { drawDlaPairs } from './scenes/dlapairs.js';
import { drawResolution } from './scenes/resolution.js';
import { SCENES } from './timeline.js';
import { SAFE } from './scenes/common.js';

export const DRAW = { xi: drawXi, ruler: drawRuler, bao: drawBao, fullshape: drawFullShape, w0wa: drawW0wa, spectrum: drawSpectrum, find: drawFind,
  hcd: drawHcd, abscosmo: drawAbsCosmo, why: drawWhy, emulator: drawEmuWalk, emudesign: drawEmulator, pk: drawPk, mywork: drawMywork, scales: drawScales, dlapairs: drawDlaPairs, resolution: drawResolution };

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

export function createRenderer(canvas, charts, opts = {}) {
  const look = resolveLook(opts.look);
  const test = resolveTest(opts.test);
  const T = LOOKS[look];
  const g = canvas.getContext('2d', { willReadFrequently: true });
  let size = { W: 0, H: 0, dpr: 1 };

  function resize() {
    const win = typeof window !== 'undefined' ? window : {};
    const dpr = opts.dpr || Math.min(win.devicePixelRatio || 1, opts.dprMax || 2);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr)), H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (W !== size.W || H !== size.H) { canvas.width = W; canvas.height = H; size = { W, H, dpr }; }
  }

  function render(state, cfg) {
    resize();
    const { W, H, dpr } = size;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    const draw = state && DRAW[state.chart];
    lastNotes = [];
    if (!draw || (state.op !== undefined && !(state.op > 0))) return;
    const tagW = cfg && Number.isFinite(cfg.tagW) ? cfg.tagW : undefined;
    const env = { g, W, H, dpr, u: unit(W, H), T, look, test, charts: charts || {}, safe: tagW !== undefined ? { ...(opts.safe || SAFE), tagW } : opts.safe, notes: [] };
    const IW = state.irisWords;
    env.iris = IW && [IW.x, IW.y, IW.r].every(Number.isFinite) ? { x: IW.x * dpr, y: IW.y * dpr, r: Math.max(0, IW.r) * dpr, keep: IW.keep === 'inside' ? 'inside' : 'outside', band: 0.08 * H } : null;
    g.__iris = env.iris; g.__irisFix = undefined;
    try { draw(env, state); } finally { g.__iris = null; g.__irisFix = undefined; }
    lastNotes = env.notes;
  }
  let lastNotes = [];

  function warm(names = Object.keys(SCENES)) {
    let n = 0;
    for (const name of names) {
      const sc = SCENES[name];
      if (!sc || !DRAW[sc.pose(0, 0).chart]) continue;
      for (let k = 0; k <= sc.LAST; k++) { render(sc.pose(k, 1)); n++; }
    }
    render(null);
    return n;
  }

  function readRaw() {
    const d = g.getImageData(0, 0, size.W, size.H).data;
    return new Uint8Array(d.buffer.slice(0));
  }
  const ground = rgb(T.ground);
  return {
    render, resize, readRaw, look, test, warm, notes: () => lastNotes.slice(),
    readHash: () => fnv1a(readRaw()),
    readPixel: (x, y) => {
      const [r, gg, b, a] = g.getImageData(x, y, 1, 1).data, u = a / 255;
      return [r, gg, b].map((v, i) => Math.round(v * u + ground[i] * (1 - u)));
    },
    debugLines: () => `chart · look ${look} · ${Object.keys(charts || {}).map(n => `${n}${charts[n].placeholder ? ' (placeholder)' : ''}`).join(', ')}`,
    loseContext: () => {},
    onRestore: () => {},
  };
}
