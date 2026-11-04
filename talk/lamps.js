
const N = 240, SLAB = [118, 122];
export const LEVELS = [1, 4, 16, 64];
const BASE = 15;
const PAPER = [244, 242, 237], INK = [31, 39, 50];
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function blur(f, sigma) {
  const r = Math.ceil(3 * sigma), w = [];
  let norm = 0;
  for (let j = -r; j <= r; j++) { const v = Math.exp(-0.5 * (j / sigma) ** 2); w.push(v); norm += v; }
  const tmp = new Float64Array(N * N), out = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let a = 0; for (let d = -r; d <= r; d++) a += w[d + r] * f[i * N + (j + d + N) % N]; tmp[i * N + j] = a / norm;
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let a = 0; for (let d = -r; d <= r; d++) a += w[d + r] * tmp[((i + d + N) % N) * N + j]; out[i * N + j] = a / norm;
  }
  return out;
}
function corr(a, b) {
  let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= b.length;
  let ab = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; ab += x * y; aa += x * x; bb += y * y; }
  return ab / Math.sqrt(aa * bb);
}

export function build(cube) {
  const slab = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let a = 0; for (let l = SLAB[0]; l < SLAB[1]; l++) a += cube[(i * N + j) * N + l] / 65535;
    slab[i * N + j] = a / (SLAB[1] - SLAB[0]);
  }
  const truth = blur(slab, 1.5);
  let m = 0, v = 0; for (const x of truth) m += x; m /= truth.length; for (const x of truth) v += (x - m) ** 2; v = Math.sqrt(v / truth.length);
  const rnd = mulberry32(20260927), gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const nMax = BASE * LEVELS[LEVELS.length - 1];
  const dots = Array.from({ length: nMax }, () => {
    const x = rnd() * N, y = rnd() * N, t = truth[Math.floor(y) * N + Math.floor(x)];
    return { x, y, val: t + 0.6 * v * gauss() };
  });
  const recon = LEVELS.map(L => {
    const n = BASE * L, wv = new Float64Array(N * N), w = new Float64Array(N * N);
    for (let d = 0; d < n; d++) { const p = Math.floor(dots[d].y) * N + Math.floor(dots[d].x); wv[p] += dots[d].val; w[p] += 1; }
    const sigma = 0.55 * N / Math.sqrt(n), bw = blur(wv, sigma), bb = blur(w, sigma);
    const f = new Float64Array(N * N);
    for (let p = 0; p < N * N; p++) f[p] = bb[p] > 1e-9 ? bw[p] / bb[p] : m;
    return { n, f, r: corr(f, truth) };
  });
  const sorted = Float64Array.from(truth).sort();
  const lo = sorted[Math.floor(0.03 * sorted.length)], hi = sorted[Math.floor(0.97 * sorted.length)];
  const image = f => {
    const im = new ImageData(N, N);
    for (let p = 0; p < N * N; p++) {
      const a = 0.88 * Math.max(0, Math.min(1, (hi - f[p]) / (hi - lo)));
      for (let c = 0; c < 3; c++) im.data[4 * p + c] = Math.round(PAPER[c] + (INK[c] - PAPER[c]) * a);
      im.data[4 * p + 3] = 255;
    }
    return im;
  };
  return { dots, recon, truth, rs: recon.map(r => r.r), images: recon.map(r => image(r.f)), truthImage: image(truth) };
}

export const REST = [
  { level: 0, fill: 0, truth: 0, end: 0 },
  { level: 0, fill: 1, truth: 0, end: 0 },
  { level: 2, fill: 1, truth: 0, end: 0 },
  { level: 3, fill: 1, truth: 0, end: 0 },
  { level: 3, fill: 1, truth: 1, end: 0 },
  { level: 3, fill: 1, truth: 1, end: 1 },
];
export const DUR = [0, 1.2, 1.6, 1.6, 1.2, 1.0];
export const SAID = [];
const CAPTIONS = [
  ['One thin slice across my box.', 'A dot: where one lamp’s beam crosses it.'],
  ['Fill in between the dots:', 'mush.'],
  ['16× more lamps:', 'the web starts to show.'],
  ['64× more lamps:', 'you can nearly read it.'],
  ['My simulation’s own slice, for comparison.', ''],
];
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

export function pose(k, s) {
  if (k <= 0) return { ...REST[0], cap: 0, capOp: 1 };
  const a = REST[k - 1], b = REST[k], u = smooth(s), o = {};
  for (const key of Object.keys(b)) o[key] = a[key] + (b[key] - a[key]) * u;
  o.cap = s < 0.5 ? k - 1 : k; o.capOp = s < 0.5 ? 1 - smooth(2 * s) : smooth(2 * s - 1);
  return o;
}

export function createLamps(canvas, D) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const tiles = [...D.images, D.truthImage].map(im => {
    const c = document.createElement('canvas'); c.width = N; c.height = N; c.getContext('2d').putImageData(im, 0, 0); return c;
  });
  function render(st, live = 0) {
    const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1; g.fillStyle = `rgb(${PAPER.join(',')})`; g.fillRect(0, 0, W, H);
    const U = Math.min(H, W * 9 / 16);
    const text = (t, x, y, size, col = '#1F2732', italic = true, align = 'left', op = 1) => {
      if (!t || op <= 0) return;
      g.globalAlpha = op; g.font = `${italic ? 'italic ' : ''}400 ${Math.round(size * U)}px ${SERIF}`; g.fillStyle = col; g.textAlign = align; g.fillText(t, x, y);
      g.globalAlpha = 1;
    };
    const lev = Math.max(0, Math.min(LEVELS.length - 1, st.level + live));
    const side = Math.min(0.62 * H, 0.4 * W), y0 = 0.22 * H;
    const gap = 0.04 * W;
    const x0 = (0.36 * W - side / 2) + st.truth * ((W / 2 - side - gap / 2) - (0.36 * W - side / 2));
    const main = 1 - st.end;
    const i0 = Math.floor(lev), i1 = Math.min(LEVELS.length - 1, i0 + 1), f = lev - i0;
    g.imageSmoothingEnabled = true;
    g.globalAlpha = st.fill * main; g.drawImage(tiles[i0], x0, y0, side, side);
    if (f > 0) { g.globalAlpha = st.fill * main * f; g.drawImage(tiles[i1], x0, y0, side, side); }
    g.globalAlpha = 0.5 * main; g.strokeStyle = '#7D8DA3'; g.lineWidth = 1; g.strokeRect(x0, y0, side, side);
    const n = Math.round(BASE * LEVELS[i0] * (1 - f) + BASE * LEVELS[i1] * f), rad = Math.max(1.3, 5 / Math.sqrt(n / BASE));
    g.fillStyle = '#1F2732';
    g.globalAlpha = (1 - 0.55 * st.fill) * main;
    for (let d = 0; d < n; d++) { g.beginPath(); g.arc(x0 + D.dots[d].x / N * side, y0 + D.dots[d].y / N * side, rad, 0, 2 * Math.PI); g.fill(); }
    if (st.truth > 0) {
      const xt = x0 + side + gap;
      g.globalAlpha = st.truth * main; g.drawImage(tiles[LEVELS.length], xt, y0, side, side);
      g.globalAlpha = 0.5 * st.truth * main; g.strokeRect(xt, y0, side, side);
      text('what I filled in', x0, y0 + side + 0.05 * H, 0.03, '#4A5566', true, 'left', st.truth * main);
      text('my simulation’s own slice', xt, y0 + side + 0.05 * H, 0.03, '#4A5566', true, 'left', st.truth * main);
    }
    g.globalAlpha = 1;
    const cx = x0 + side + 0.04 * W, [c1, c2] = CAPTIONS[Math.min(st.cap, CAPTIONS.length - 1)] || ['', ''];
    const capOp = st.capOp * main * (st.cap >= 4 ? 0 : 1);
    text(c1, cx, y0 + 0.08 * H, 0.036, '#1F2732', true, 'left', capOp);
    text(c2, cx, y0 + 0.135 * H, 0.036, '#1F2732', true, 'left', capOp);
    text(`lamps: ×${n / BASE < 1.5 ? 1 : Math.round(n / BASE)}  (illustrative, not a count)`, x0, y0 - 0.025 * H, 0.026, '#4A5566', true, 'left', main);
    const fine = smooth(st.level - 1) * main;
    text('More lamps would be faint galaxies, not quasars.', cx, y0 + side - 0.11 * H, 0.027, '#4A5566', true, 'left', fine * (1 - st.truth));
    text('Deep surveys reach this over small patches of sky;', cx, y0 + side - 0.07 * H, 0.027, '#4A5566', true, 'left', fine * (1 - st.truth));
    text('those real maps (not shown) are noisier than this toy.', cx, y0 + side - 0.03 * H, 0.027, '#4A5566', true, 'left', fine * (1 - st.truth));
    text('Real maps like this exist (not shown here): small patches of sky, and noisier.', x0, y0 + side + 0.1 * H, 0.03, '#1F2732', true, 'left', st.truth * main);
    text('The map and the texture answer different questions.', 0.08 * W, 0.37 * H, 0.036, '#4A5566', true, 'left', st.end);
    text('The texture needs no map:', 0.08 * W, 0.47 * H, 0.05, '#1F2732', true, 'left', st.end);
    text('every beam carries information about it.', 0.08 * W, 0.55 * H, 0.05, '#1F2732', true, 'left', st.end);
    text('an extra: more lamps (toy, illustrative)', W - 0.03 * W, H - 0.035 * H, 0.03, '#56627A', true, 'right');
  }
  return { render };
}

export function createExcursion({ canvas, data, onClose, redrawTalk, reduced = false, onStep = () => {} }) {
  const dur = k => (reduced ? 0.2 : DUR[k]);
  let D = null, R = null, open = false, k = 0, s = 1, anim = null, live = 0, raf = 0;
  const el = canvas.parentElement || canvas;
  function frame() {
    if (!open) return;
    if (anim) {
      const x = anim.from + (anim.to > anim.from ? 1 : -1) * (performance.now() - anim.t0) / (dur(anim.k) * 1000);
      if ((anim.to > anim.from && x >= anim.to) || (anim.to < anim.from && x <= anim.to)) { s = anim.to; if (s === 0) { k = anim.k - 1; s = 1; } anim = null; onStep(); }
      else s = x;
    }
    R.render(pose(k, s), live);
    if (anim) raf = requestAnimationFrame(frame);
  }
  const go = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
  function show() {
    if (!D) { D = build(data()); R = createLamps(canvas, D); }
    open = true; k = 0; s = 1; anim = null; live = 0; el.hidden = false; go(); onStep();
  }
  function close() { open = false; anim = null; el.hidden = true; onClose(); redrawTalk(); }
  function next() {
    if (anim) { s = anim.to; if (s === 0) { k = anim.k - 1; s = 1; } anim = null; go(); return; }
    if (k >= REST.length - 1) { close(); return; }
    live = 0; k += 1; s = 0; anim = { k, from: 0, to: 1, t0: performance.now() }; go(); onStep();
  }
  function prev() {
    if (anim) { k = anim.k - 1; s = 1; anim = null; live = 0; go(); return; }
    if (k <= 0) { close(); return; }
    live = 0; anim = { k, from: 1, to: 0, t0: performance.now() }; go();
  }
  function drag(dx) { if (!open || pose(k, s).fill < 0.5) return; live = Math.max(-3, Math.min(3, 4 * dx / innerWidth)); go(); }
  return {
    show, close, next, prev, drag, isOpen: () => open,
    pos: () => ({ k, s }), rs: () => D && D.rs,
    seek: (kk, ss = 1) => { k = kk; s = ss; anim = null; go(); },
  };
}
