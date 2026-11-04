import { NPIX, WINDOW, heroFlux } from './physics.js';
import { PLOT_WIDTH, PLOT_H, RECORD_HALFW } from '../ghosts-spike/ghosts.js';

const PAPER = [244, 242, 237];
const INK = '#1F2732', WASH = '#7D8DA3', RUST = '#B93A20', WORD = '#4A5566';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const LABELS = { base: 'as simulated', hot: 'what if hotter?', uv: 'what if more UV light?' };

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function through(g, P, first = true) {
  if (first) g.moveTo(P[0][0], P[0][1]); else g.lineTo(P[0][0], P[0][1]);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

export function createRenderer(canvas, T, opts = {}) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  let size = { W: 0, H: 0, dpr: 1 };
  const flux = new Float64Array(NPIX), base = new Float64Array(NPIX);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, opts.dprMax || 2);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr)), H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (W !== size.W || H !== size.H) { canvas.width = W; canvas.height = H; size = { W, H, dpr }; }
  }

  function span(z) {
    const w = Math.pow(NPIX, 1 - z) * Math.pow(WINDOW.width, z);
    const done = (NPIX / w - 1) / (NPIX / WINDOW.width - 1);
    const f = WINDOW.centre / NPIX + (0.5 - WINDOW.centre / NPIX) * done;
    return [WINDOW.centre - f * w, w];
  }

  function trace(F, rect, z, colour, alpha) {
    const [x0, y0, w, h] = rect, [a, n] = span(z);
    const X = i => x0 + (i + 0.5 - a) / n * w, Y = i => y0 + (1 - F[((i % NPIX) + NPIX) % NPIX]) * h;
    const i0 = Math.max(0, Math.floor(a) - 1), i1 = Math.min(NPIX - 1, Math.ceil(a + n) + 1);
    g.save();
    g.beginPath(); g.rect(x0, y0 - h, w, 3 * h); g.clip();
    g.globalAlpha = alpha; g.strokeStyle = colour; g.lineWidth = 2 * RECORD_HALFW * size.dpr; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(X(i0), Y(i0));
    for (let i = i0 + 1; i < i1; i++) g.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
    g.lineTo(X(i1), Y(i1));
    g.stroke();
    g.restore();
  }

  function word(text, x, y, op, colour = WORD, italic = false, align = 'left', scale = 1) {
    if (op <= 0) return;
    g.globalAlpha = op; g.fillStyle = colour; g.textAlign = align; g.textBaseline = 'alphabetic';
    g.font = `${italic ? 'italic ' : ''}400 ${Math.round(scale * Math.min(40, Math.max(20, 0.03 * size.H / size.dpr)) * size.dpr)}px ${SERIF}`;
    g.fillText(text, x, y);
    g.globalAlpha = 1;
  }

  function render(s) {
    resize();
    const { W, H, dpr } = size;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const rw = PLOT_WIDTH * W, rh = PLOT_H * rw, rect = [(W - rw) / 2, (H - rh) / 2, rw, rh];
    const capX = 0.08 * W, capY = 0.17 * H + 0.03 * H;
    if (s.rec > 0) {
      if (s.ghost > 0) { heroFlux(T, 0, 0, base); trace(base, rect, s.zoom, INK, 0.3 * s.ghost * s.rec); }
      heroFlux(T, s.hot, s.uv, flux);
      trace(flux, rect, s.zoom, INK, s.rec);
      word('hotter: atoms move faster — the same hydrogen, smeared', capX, capY, s.wHot * s.rec, WORD, true);
      word('stronger UV, same gas: fewer neutral atoms — the same dips, shallower', capX, capY, s.wUV * s.rec, WORD, true);
    }
    if (s.plot > 0) plot(s);
  }

  function plot(s) {
    const { W, H, dpr } = size;
    const px0 = 0.12 * W, pw = 0.6 * W, py0 = 0.26 * H, ph = 0.48 * H;
    const k = T.k, C = T.curves, all = [...C.base, ...C.hot, ...C.uv].map(Math.log);
    const lo = Math.min(...all) - 0.06, hi = Math.max(...all) + 0.1;
    const X = x => px0 + (Math.log(x) - Math.log(k[0])) / (Math.log(k[k.length - 1]) - Math.log(k[0])) * pw;
    const Y = v => py0 + ph - (Math.log(v) - lo) / (hi - lo) * ph;
    const op = s.plot;
    g.globalAlpha = 0.7 * op; g.strokeStyle = WASH; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(px0, py0 + ph); g.lineTo(px0 + pw, py0 + ph); g.stroke();
    g.globalAlpha = 1;
    const below = py0 + ph + 0.05 * H;
    word('large', px0, below, op, WORD, true, 'left');
    word('small', px0 + pw, below, op, WORD, true, 'right');
    word('← size of the wiggle →', px0 + pw / 2, below, 0.8 * op, WORD, true, 'center');
    word('↑ how much the forest wiggles', px0, py0 - 0.125 * H, op, WORD, true, 'left');
    if (s.band > 0) {
      g.globalAlpha = 0.3 * s.band * op; g.fillStyle = WASH;
      const up = k.map((x, i) => [X(x), Y(T.mock[i] * (1 + T.sigma[i]))]), dn = k.map((x, i) => [X(x), Y(T.mock[i] * (1 - T.sigma[i]))]);
      g.beginPath(); through(g, up); through(g, dn.reverse(), false); g.closePath(); g.fill();
      dn.reverse();
      g.globalAlpha = 0.9 * s.band * op; g.strokeStyle = WASH; g.lineWidth = 1.5 * dpr;
      for (const E of [up, dn]) { g.beginPath(); through(g, E); g.stroke(); }
      g.globalAlpha = 1;
      const top = Math.min(...up.slice(0, 8).map(p => p[1]), ...['base', 'hot', 'uv'].flatMap(key => C[key].slice(0, 8).map(v => Y(v))));
      word('mock data for illustration, not a real or DESI measurement:', X(k[0]), top - 0.09 * H, s.wMock * op, INK, true, 'left', 1.15);
      word('made from a setting I haven’t shown you', X(k[0]), top - 0.04 * H, s.wMock * op, INK, true, 'left', 1.15);
    }
    const xEnd = px0 + s.draw * pw;
    const ends = [];
    for (const key of ['base', 'hot', 'uv']) {
      const a = (0.45 + 0.55 * s.others) * op;
      g.save(); g.beginPath(); g.rect(0, 0, xEnd, H); g.clip();
      g.globalAlpha = a; g.strokeStyle = INK; g.lineWidth = 2 * RECORD_HALFW * dpr; g.lineJoin = 'round';
      g.beginPath(); through(g, k.map((x, i) => [X(x), Y(C[key][i])])); g.stroke();
      g.restore();
      ends.push({ key, y: Y(C[key][k.length - 1]), a });
    }
    ends.sort((p, q) => p.y - q.y);
    const gap = 0.05 * H;
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + gap);
    const lop = smoothstep(0.92, 1, s.draw);
    for (const e of ends) word(LABELS[e.key], px0 + pw + 0.015 * W, e.y + 0.01 * H, lop * Math.max(0.8 * op, e.a), INK, true, 'left', 1.15);
  }

  function readRaw() {
    const d = g.getImageData(0, 0, size.W, size.H).data;
    return new Uint8Array(d.buffer.slice(0));
  }
  return {
    render, resize,
    readRaw,
    readHash: () => fnv1a(readRaw()),
    readPixel: (x, y) => {
      const [r, gg, b, a] = g.getImageData(x, y, 1, 1).data, u = a / 255;
      return [r, gg, b].map((v, i) => Math.round(v + PAPER[i] * (1 - u)));
    },
    debugLines: () => `texture · kept ${T.kept} of 480 sightlines · hot A ${T.hotA.toFixed(3)}`,
    loseContext: () => {},
    onRestore: () => {},
  };
}
