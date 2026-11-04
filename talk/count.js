import { SCENE, IMG, imgSrc } from './look.js';
const INK = SCENE.ink, SOFT = SCENE.soft, MUTED = SCENE.muted, GROUND = SCENE.ground, AXIS = SCENE.axis;
const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const KINDS = [
  { id: 'LLS', name: 'Lyman-limit systems', gloss: 'the least dense', colour: SCENE.kinds.LLS, dot: IMG.kinds.LLS, r: 0.38 },
  { id: 'subDLA', name: 'sub-DLAs', gloss: 'denser', colour: SCENE.kinds.subDLA, dot: IMG.kinds.subDLA, r: 0.55 },
  { id: 'DLA', name: 'DLAs', gloss: 'a galaxy’s dense gas', colour: SCENE.kinds.DLA, dot: IMG.kinds.DLA, r: 0.85 },
];
const ANCHORED = SCENE.accent;
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => x * x * (3 - 2 * x);
const ramp = (x, a, b) => smooth(clamp01((x - a) / (b - a)));
const AX = 0.6, SCAN = 5.0, AFTER = 1.4;
export const COUNT_DUR = AX + SCAN + AFTER;
const DIAL = { in: 0.8, each: 1.6, out: 0.8 };
export const DIAL_DUR = DIAL.in + 3 * DIAL.each + DIAL.out;
export const ANCHOR_DUR = 5.0;
const turnOf = t => (t <= 0 || t >= DIAL.each ? 1 : t < 0.5 ? 1 + 0.5 * smooth(t / 0.5) : t < 1.1 ? 1.5 - smooth((t - 0.5) / 0.6) : 0.5 + 0.5 * smooth((t - 1.1) / 0.5));
const dimmed = j => ((j * 0.6180339887) % 1);
const jitter = j => ((j * 0.7548776662) % 1);

export function createCount(canvas) {
  const g = canvas.getContext('2d');
  let last = 2, plane = null, doc = null;
  const im = new Image(); im.decoding = 'async';
  im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im) : im)).then(b => { plane = b; draw(last); }, () => { plane = im; draw(last); });
  im.src = imgSrc('media/expansion_box.jpg');
  function draw(p) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
    const vh = H / 100, vw = W / 100, u = Math.min(vh, 0.5625 * vw);
    const font = (px, it) => `${it ? 'italic ' : ''}${Math.round(px)}px ${SERIF}`;
    const text = (s, x, y, o = {}) => { if (!((o.alpha ?? 1) > 0)) return 0; g.save(); g.font = font(o.px || 2.4 * u, o.italic); g.fillStyle = o.color || INK; g.globalAlpha = o.alpha ?? 1;
      g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
      if (o.halo) { g.lineJoin = 'round'; g.strokeStyle = o.haloColor || SCENE.halo; g.lineWidth = 0.6 * u; g.strokeText(s, x, y); }
      g.fillText(s, x, y); const w = g.measureText(s).width; g.restore(); return w; };
    const seg = (x0, y0, x1, y1, c, a, lw, dash) => { if (!(a > 0)) return; g.save(); g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = lw; if (dash) g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore(); };
    const s = clamp01(p) * COUNT_DUR, aAx = ramp(s, 0, AX), scan = clamp01((s - AX) / SCAN), aEnd = ramp(s, AX + SCAN, AX + SCAN + 1.0);
    const s2 = clamp01(p - 1) * DIAL_DUR, aDial = ramp(s2, 0, DIAL.in);
    const s3 = clamp01(p - 2) * ANCHOR_DUR, aPin = ramp(s3, 0, 1.2), aBars = ramp(s3, 0.8, 2.4), aWith = ramp(s3, 2.0, 3.4);
    const fac = KINDS.map((K, i) => turnOf(s2 - DIAL.in - i * DIAL.each)), turning = KINDS.map((K, i) => { const t = s2 - DIAL.in - i * DIAL.each; return t > 0 && t < DIAL.each ? Math.sin(Math.PI * t / DIAL.each) : 0; });
    const done = KINDS.map((K, i) => s2 - DIAL.in - i * DIAL.each > 0);
    const side = Math.min(64 * vh, 40 * vw), S = { x0: 10 * vw, y0: 23 * vh, s: side };
    const rows = doc ? doc.rows : 480, L = doc ? doc.L : 120;
    const yRow = iy => S.y0 + (1 - (iy + 0.5) / rows) * S.s, xOf = x => S.x0 + (x / L) * S.s;
    if (plane && SCENE.paper && !IMG.paper) { g.save(); g.globalAlpha = aAx; g.fillStyle = IMG.dark; g.fillRect(S.x0, S.y0, S.s, S.s); g.restore(); }
    if (plane) { g.save(); g.globalAlpha = (0.6 - 0.2 * aDial) * aAx; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(plane, S.x0, S.y0, S.s, S.s); g.restore(); }
    g.save(); g.globalAlpha = aAx; g.strokeStyle = SCENE.frame; g.lineWidth = Math.max(1, 0.12 * u); g.strokeRect(S.x0, S.y0, S.s, S.s); g.restore();
    text('one slice of our simulation: 480 sightlines, 120 Mpc/h across', S.x0, S.y0 - 0.8 * u, { px: 2.0 * u, color: SOFT, italic: true, alpha: aAx });
    const iyScan = rows - scan * rows;
    if (scan > 0 && scan < 1) {
      const y = yRow(iyScan - 0.5), grd = g.createLinearGradient(0, y - 3 * u, 0, y);
      const sc = IMG.paper ? '31,39,50' : '233,230,223'; grd.addColorStop(0, `rgba(${sc},0)`); grd.addColorStop(1, `rgba(${sc},0.16)`);
      g.save(); g.fillStyle = grd; g.fillRect(S.x0, y - 3 * u, S.s, 3 * u); g.restore();
      seg(S.x0, y, S.x0 + S.s, y, IMG.ink, 0.9, Math.max(1.5, 0.2 * u));
    }
    const tally = { LLS: 0, subDLA: 0, DLA: 0 }, readAt = c => AX + ((rows - c.iy - 0.5) / rows) * SCAN;
    if (doc) for (const c of doc.clouds) {
      if (c.iy < iyScan) continue;
      const j = tally[c.kind] = (tally[c.kind] || 0) + 1;
      const ki = KINDS.findIndex(k => k.id === c.kind), K = KINDS[Math.max(0, ki)], dim = ki >= 0 && fac[ki] < 1 && dimmed(j) < 1 - fac[ki];
      const age = s - readAt(c), flash = Math.max(0, 1 - age / 0.45), x = xOf(c.x), y = yRow(c.iy), lit = ki >= 0 ? turning[ki] : 0;
      g.save(); g.globalAlpha = (dim ? 0.15 : 1) * aAx; g.fillStyle = K.dot;
      if (c.kind === 'DLA' || flash > 0 || lit > 0) { g.shadowColor = K.dot; g.shadowBlur = (c.kind === 'DLA' ? 1.2 : 0) * u + 2.0 * u * Math.max(flash, lit); }
      g.beginPath(); g.arc(x, y, K.r * u * (1 + 1.4 * flash) * (1 + 0.5 * lit), 0, 2 * Math.PI); g.fill();
      if (IMG.paper) { g.shadowBlur = 0; g.strokeStyle = IMG.dark; g.lineWidth = Math.max(1.2, 0.16 * u); g.stroke(); }
      g.restore();
    }
    const crossed = doc ? doc.clouds.find(c => c.iy === 382 && c.kind === 'DLA') : null;
    if (crossed && crossed.iy >= iyScan) {
      const a = ramp(s, readAt(crossed) + 0.3, readAt(crossed) + 0.8), x = xOf(crossed.x), y = yRow(crossed.iy);
      g.save(); g.globalAlpha = a; g.strokeStyle = IMG.ink; g.lineWidth = Math.max(1.5, 0.2 * u); g.beginPath(); g.arc(x, y, 2.0 * u, 0, 2 * Math.PI); g.stroke(); g.restore();
      text('the galaxy the light crossed', x + 2.6 * u, y + 0.7 * u, { px: 2.0 * u, color: IMG.ink, alpha: a, halo: true, haloColor: IMG.halo });
    }
    const R = { x0: S.x0 + S.s + 5 * vw, x1: 91 * vw, y0: S.y0, y1: S.y0 + S.s }, bw = R.x1 - R.x0;
    const maxN = 1.5 * (doc ? Math.max(...KINDS.map(k => doc.clouds.filter(c => c.kind === k.id).length)) : 134);
    KINDS.forEach((K, i) => {
      const y = R.y0 + (0.06 + 0.14 * i) * S.s, n = Math.round((tally[K.id] || 0) * fac[i]), cx = R.x0 + 1.0 * u, cy = y - 0.9 * u;
      g.save(); g.globalAlpha = aAx; g.fillStyle = K.colour; g.shadowColor = K.colour; g.shadowBlur = (K.id === 'DLA' ? 1.2 : 0) * u + 1.8 * u * turning[i];
      g.beginPath(); g.arc(cx, cy, K.r * u * 1.6 * (1 + 0.35 * turning[i]), 0, 2 * Math.PI); g.fill(); g.restore();
      if (aPin > 0) { g.save(); g.globalAlpha = aAx * aPin; g.strokeStyle = ANCHORED; g.lineWidth = Math.max(2, 0.4 * u); g.beginPath(); g.arc(cx, cy, 1.6 * u, 0, 2 * Math.PI); g.stroke(); g.restore(); }
      text(K.name, R.x0 + 3.6 * u, y, { px: 2.5 * u, color: K.colour, alpha: aAx });
      text(K.gloss, R.x0 + 3.6 * u, y + 2.3 * u, { px: 1.9 * u, color: SOFT, italic: true, alpha: aAx });
      const wn = text(String(n), R.x1, y, { px: 3.4 * u, color: INK, align: 'right', alpha: aAx });
      if (fac[i] !== 1) text(fac[i] < 1 ? 'fewer' : 'more', R.x1 - wn - 1.2 * u, y, { px: 2.0 * u, color: K.colour, italic: true, align: 'right', alpha: aAx * turning[i] });
      g.save(); g.globalAlpha = 0.85 * aAx; g.fillStyle = K.colour; g.fillRect(R.x0 + 3.6 * u, y + 3.6 * u, (bw - 3.6 * u) * (n / maxN), 0.7 * u); g.restore();
    });
    const B = { x0: R.x0 + 4.0 * u, x1: R.x1, y0: R.y0 + 0.52 * S.s, y1: R.y0 + 0.84 * S.s };
    const aStrip = ramp(s, AX + 0.6, AX + 1.6) * (1 - aDial), aWig = aDial * (1 - clamp01(2 * aBars)), aB = clamp01(2 * aBars - 1);
    if (aStrip > 0 && doc && doc.field) {
      const LD = [-1.3, 3.9], X = v => B.x0 + ((v - LD[0]) / (LD[1] - LD[0])) * (B.x1 - B.x0);
      const top = B.y0, hH = 0.36 * (B.y1 - B.y0), base = top + hH, F = doc.field, mx = Math.max(...F.share);
      g.save(); g.globalAlpha = 0.5 * aStrip; g.fillStyle = SOFT; g.beginPath(); g.moveTo(X(F.edges[0]), base);
      F.share.forEach((v, k) => { const x0 = X(F.edges[k]), x1 = X(F.edges[k + 1]), y = base - (v / mx) * hH; g.lineTo(x0, y); g.lineTo(x1, y); });
      g.lineTo(X(F.edges[F.edges.length - 1]), base); g.closePath(); g.fill(); g.restore();
      text('the forest’s gas: most of the space', X(F.median), top - 0.8 * u, { px: 1.9 * u, color: SOFT, italic: true, align: 'center', alpha: aStrip });
      const lane = (i, j) => base + (0.12 + 0.24 * i + 0.18 * jitter(j)) * (B.y1 - base - 4.4 * u);
      const cnt = { LLS: 0, subDLA: 0, DLA: 0 };
      for (const c of doc.clouds) {
        if (c.iy < iyScan) continue; const j = ++cnt[c.kind], i = KINDS.findIndex(k => k.id === c.kind); if (i < 0) continue;
        g.save(); g.globalAlpha = aStrip; g.fillStyle = KINDS[i].colour; g.beginPath(); g.arc(X(c.log_delta), lane(i, j), Math.max(1.5, 0.75 * KINDS[i].r * u), 0, 2 * Math.PI); g.fill(); g.restore();
      }
      const yA = B.y1 - 3.4 * u;
      seg(B.x0, yA, B.x1, yA, AXIS, aStrip, Math.max(1, 0.12 * u));
      for (const [v, lab] of [[-1, '0.1×'], [0, '1×'], [1, '10×'], [2, '100×'], [3, '1,000×']]) { seg(X(v), yA, X(v), yA + 0.7 * u, AXIS, aStrip, Math.max(1, 0.12 * u)); text(lab, X(v), yA + 2.6 * u, { px: 1.8 * u, color: SOFT, align: 'center', alpha: aStrip }); }
      text('how dense the gas is (× the average)', 0.5 * (B.x0 + B.x1), B.y1 + 1.6 * u, { px: 2.0 * u, color: INK, align: 'center', alpha: aStrip });
      text('the dense clouds: 100 to 1,000 × the average', B.x1, top + 1.4 * u, { px: 1.9 * u, color: INK, italic: true, align: 'right', alpha: aStrip * aEnd, halo: true });
    }
    const credit = p > 1 ? 'the numbers varied: hcd_priya at z = 3, each kind from ½ to 1½ × PRIYA’s (illustrative)'
        : 'one plane of a PRIYA run (Bird et al. 2023), z = 3 · clouds: the hcd_priya catalogue (log N ≥ 17.2)';
    text(credit, 8 * vw, 97.0 * vh, { px: 1.6 * u, color: MUTED, italic: true });
  }
  return {
    setData({ count: C } = {}) {
      if (C && Array.isArray(C.clouds)) {
        const rank = c => KINDS.findIndex(k => k.id === c.kind);
        doc = { rows: C.rows, L: C.L, clouds: C.clouds.map((c, j) => [c, j]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(e => e[0]), field: C.field_log_delta };
      }
      draw(last);
    },
    render(st) { last = st && Number.isFinite(st.p) ? st.p : 2; draw(last); },
    settle() { return plane ? Promise.resolve() : new Promise(r => { const k = setInterval(() => { if (plane) { clearInterval(k); r(); } }, 50); setTimeout(() => { clearInterval(k); r(); }, 5000); }); },
    readRaw() { return new TextEncoder().encode(`count:${last.toFixed(4)}|${doc ? doc.clouds.length : 0}`); },
    readPixel(x, y) { return Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data); },
  };
}
