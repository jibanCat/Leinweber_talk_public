const MODE = 'speed';
import { SCENE, IMG, imgSrc } from './look.js';
const INK = SCENE.ink, SOFT = SCENE.soft, MUTED = SCENE.muted, GROUND = SCENE.ground, AXIS = SCENE.axis;
const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const TRACER = SCENE.tracers;
const NAME = { BGS: 'bright galaxies', LRG: 'red galaxies', ELG: 'star-forming galaxies', QSO: 'quasars', Lya: 'the Lyα forest' };
const kindsOf = id => (id === 'Lya' ? ['Lya'] : id === 'QSO' ? ['QSO'] : id === 'BGS' ? ['BGS'] : id.startsWith('LRG') && id.includes('ELG') ? ['LRG', 'ELG'] : id.startsWith('LRG') ? ['LRG'] : ['ELG']);
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => x * x * (3 - 2 * x);
const ramp = (x, a, b) => smooth(clamp01((x - a) / (b - a)));

const COSMO = { h: 0.6736, Om: 0.3153, Or: 7.96e-5 };
const GYR = 977.79222 / (100 * COSMO.h);
function history(withDE) {
  const OL = withDE ? 1 - COSMO.Om - COSMO.Or : 0, E = a => Math.sqrt(COSMO.Or / a ** 4 + COSMO.Om / a ** 3 + OL);
  const as = [], ts = []; let t = 0, a = 1e-4;
  as.push(a); ts.push(t);
  while (a < 2.2) { const a2 = a * (1 + 2e-3); t += GYR * 0.5 * (1 / E(a) + 1 / E(a2)) * Math.log(a2 / a); a = a2; as.push(a); ts.push(t); }
  const aAt = tt => { if (tt <= 0) return 0; let i = 1; while (i < ts.length && ts[i] < tt) i++; if (i >= ts.length) return as[as.length - 1]; const f = (tt - ts[i - 1]) / (ts[i] - ts[i - 1]); return as[i - 1] + f * (as[i] - as[i - 1]); };
  return { as, ts, aAt,
    sAt: tt => { const aa = aAt(tt); return aa > 0 ? aa * E(aa) : Infinity; },
    tAt: aa => { let i = 1; while (i < as.length && as[i] < aa) i++; const f = (aa - as[i - 1]) / (as[i] - as[i - 1]); return ts[i - 1] + f * (ts[i] - ts[i - 1]); } };
}
const LCDM = history(true), NODE = history(false);
const T0 = LCDM.tAt(1);
const A_TURN = (COSMO.Om / (2 * (1 - COSMO.Om - COSMO.Or))) ** (1 / 3), T_TURN = LCDM.tAt(A_TURN);
const T_MAX = 16;
const AX = 0.45, MOVE = 5.4, HOLD = 0.6, N_RINGS = 7, AFTER = [0.4, 1.2, 0.9, 1.1];
export const EXPANSION_DUR = AX + MOVE + N_RINGS * HOLD + AFTER.reduce((a, b) => a + b, 0);

export function createExpansion(canvas) {
  const g = canvas.getContext('2d');
  let rings = [], last = 1, box = null;
  const im = new Image(); im.decoding = 'async';
  im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im) : im)).then(b => { box = b; draw(last); }, () => { box = im; draw(last); });
  im.src = imgSrc('media/expansion_box.jpg');
  function draw(p) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
    const vh = H / 100, vw = W / 100, u = Math.min(vh, 0.5625 * vw);
    const P = { x0: 9 * vw, x1: 64 * vw, y0: 30 * vh, y1: 80 * vh };
    const B = { cx: 81 * vw, cy: 53 * vh, s: Math.min(26 * vw, 46 * vh) };
    const SPEED = MODE === 'speed', Q = (HH, t) => (SPEED ? HH.sAt(t) : HH.aAt(t));
    const YR = SPEED ? [0.5, 1.6] : [0, 1.6], YT = SPEED ? [0.6, 0.8, 1, 1.2, 1.4] : [0.5, 1, 1.5];
    const X = t => P.x0 + (t / T_MAX) * (P.x1 - P.x0), Y = v => P.y1 - ((v - YR[0]) / (YR[1] - YR[0])) * (P.y1 - P.y0);
    const font = (px, it) => `${it ? 'italic ' : ''}${Math.round(px)}px ${SERIF}`;
    const measure = (s, o = {}) => { g.save(); g.font = font(o.px || 2.4 * u, o.italic); const w = g.measureText(s).width; g.restore(); return w; };
    const text = (s, x, y, o = {}) => { g.save(); g.font = font(o.px || 2.4 * u, o.italic); g.fillStyle = o.color || INK; g.globalAlpha = o.alpha ?? 1;
      g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic'; if (o.rotate) { g.translate(x, y); g.rotate(o.rotate); x = 0; y = 0; }
      if (o.halo) { g.lineJoin = 'round'; g.strokeStyle = o.haloColor || SCENE.halo; g.lineWidth = 0.6 * u; g.strokeText(s, x, y); }
      g.fillText(s, x, y); g.restore(); return measure(s, o); };
    const curve = (HH, t1, t2, o) => { g.save(); g.beginPath(); g.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); g.clip();
      g.strokeStyle = o.color; g.globalAlpha = o.alpha; g.lineWidth = o.lw; g.lineJoin = 'round'; g.lineCap = 'round'; if (o.dash) g.setLineDash(o.dash);
      g.beginPath(); for (let k = 0; k <= 500; k++) { const t = t1 + ((t2 - t1) * k) / 500, x = X(t), y = Y(Math.min(Q(HH, t), YR[1] + 0.5)); k ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.restore(); };
    let w = clamp01(p) * EXPANSION_DUR, tc = 0, hold = -1, h = 0, post = -1;
    const aAx = ramp(w, 0, AX); w -= AX;
    if (w >= 0) {
      const rate = T0 / MOVE; let tp = 0, i = 0, done = false;
      for (; i < rings.length && !done; i++) {
        const seg = (rings[i].t - tp) / rate;
        if (w < seg) { tc = tp + w * rate; done = true; break; }
        w -= seg; tc = tp = rings[i].t;
        if (w < HOLD) { hold = i; h = w / HOLD; done = true; break; }
        w -= HOLD;
      }
      if (!done) {
        const seg = (T0 - tp) / rate + (N_RINGS - rings.length) * HOLD;
        if (w < seg) tc = Math.min(T0, tp + w * rate); else { tc = T0; post = w - seg; }
      }
    }
    const blink = hold >= 0 ? 0.5 - 0.5 * Math.cos(4 * Math.PI * h) : 0;
    const aTurn = ramp(tc, T_TURN, T_TURN + 1.2) * aAx;
    const aNo = post < 0 ? 0 : ramp(post, AFTER[0], AFTER[0] + AFTER[1]), aFut = post < 0 ? 0 : ramp(post, AFTER[0] + AFTER[1], AFTER[0] + AFTER[1] + AFTER[2]);
    const aAnc = post < 0 ? 0 : ramp(post, AFTER[0] + AFTER[1] + AFTER[2] * 0.6, AFTER[0] + AFTER[1] + AFTER[2] + AFTER[3]);
    g.save(); g.globalAlpha = aAx; g.strokeStyle = AXIS; g.lineWidth = Math.max(1, 0.12 * u);
    g.beginPath(); g.moveTo(P.x0, P.y0); g.lineTo(P.x0, P.y1); g.lineTo(P.x1, P.y1); g.stroke();
    for (let t = 0; t <= T_MAX; t += 2) { g.beginPath(); g.moveTo(X(t), P.y1); g.lineTo(X(t), P.y1 + 0.8 * u); g.stroke(); if (Math.abs(t - T0) > 0.9) text(String(t), X(t), P.y1 + 3.2 * u, { px: 2.1 * u, color: SOFT, align: 'center', alpha: aAx }); }
    for (const v of YT) { g.beginPath(); g.moveTo(P.x0 - 0.8 * u, Y(v)); g.lineTo(P.x0, Y(v)); g.stroke(); text(String(v), P.x0 - 1.4 * u, Y(v) + 0.7 * u, { px: 2.1 * u, color: SOFT, align: 'right', alpha: aAx }); }
    g.setLineDash([0.5 * u, 0.6 * u]); g.beginPath(); g.moveTo(P.x0, Y(1)); g.lineTo(X(T0), Y(1)); g.lineTo(X(T0), P.y1); g.stroke();
    g.restore();
    text('billions of years after the Big Bang', 0.5 * (P.x0 + P.x1), P.y1 + 6.6 * u, { px: 2.4 * u, color: INK, align: 'center', alpha: aAx });
    text('← early', P.x0, P.y1 + 6.6 * u, { px: 2.1 * u, color: SOFT, italic: true, alpha: aAx });
    text('late →', P.x1, P.y1 + 6.6 * u, { px: 2.1 * u, color: SOFT, italic: true, align: 'right', alpha: aAx });
    text(SPEED ? 'expansion rate, H(z)/(1+z)' : 'size of the Universe', P.x0 - 7.4 * u, 0.5 * (P.y0 + P.y1), { px: 2.4 * u, color: INK, align: 'center', rotate: -Math.PI / 2, alpha: aAx });
    text('(today = 1)', P.x0 - 4.6 * u, 0.5 * (P.y0 + P.y1), { px: 2.0 * u, color: SOFT, align: 'center', rotate: -Math.PI / 2, alpha: aAx });
    text('today', X(T0), P.y1 + 3.2 * u, { px: 2.1 * u, color: INK, align: 'center', alpha: aAx });
    if (aNo > 0) {
      curve(NODE, 0, T0, { color: SOFT, alpha: 0.85 * aNo, lw: Math.max(1, 0.24 * u), dash: [1.0 * u, 0.8 * u] });
      text(`without dark energy: ${SPEED ? 'still slowing' : 'smaller'}`, X(T0) - 1.0 * u, Y(Q(NODE, T0)) + 2.6 * u, { px: 2.2 * u, color: SOFT, italic: true, alpha: aNo, halo: true, align: 'right' });
    }
    if (aFut > 0) {
      curve(LCDM, T0, T_MAX, { color: INK, alpha: 0.8 * aFut, lw: Math.max(1, 0.32 * u), dash: [0.25 * u, 0.7 * u] });
      text('the future: ever faster', X(15.8), Y(Q(LCDM, 15.8)) - 2.2 * u, { px: 2.2 * u, color: INK, italic: true, alpha: aFut, halo: true, align: 'right' });
    }
    if (tc > 0) {
      curve(LCDM, 0, tc, { color: INK, alpha: aAx, lw: Math.max(2, 0.44 * u) });
      const v = Q(LCDM, tc);
      if (post < 0 && v < YR[1]) { g.save(); g.fillStyle = INK; g.globalAlpha = aAx; g.beginPath(); g.arc(X(tc), Y(v), 0.7 * u, 0, 2 * Math.PI); g.fill(); g.restore(); }
    }
    if (aTurn > 0) {
      const x = X(T_TURN), y = Y(Q(LCDM, T_TURN));
      g.save(); g.globalAlpha = aTurn; g.strokeStyle = INK; g.lineWidth = Math.max(1, 0.14 * u); g.beginPath(); g.moveTo(x, y - 3.0 * u); g.lineTo(x, y - 8.0 * u); g.stroke(); g.restore();
      text('dark energy takes over:', x, y - 12.4 * u, { px: 2.3 * u, color: INK, align: 'center', alpha: aTurn, halo: true });
      text('the expansion speeds up', x, y - 9.6 * u, { px: 2.3 * u, color: INK, align: 'center', alpha: aTurn, halo: true });
    }
    const R0 = 0.06 * (P.y1 - P.y0);
    rings.forEach((r, i) => {
      if (tc < r.t) return;
      const ar = aAx * (i === hold ? Math.min(1, 4 * h) : 1), bl = i === hold ? blink : 0;
      const x = X(r.t), y = Y(Q(LCDM, r.t)), rad = R0 * r.a * (1 + 0.35 * bl), anc = r.id === 'Lya' ? aAnc : 0;
      g.save(); g.globalAlpha = ar; g.lineWidth = Math.max(1.5, (0.34 + 0.25 * anc + 0.3 * bl) * u);
      g.fillStyle = SCENE.paper ? 'rgba(244,242,237,0.55)' : 'rgba(12,18,27,0.55)'; g.beginPath(); g.arc(x, y, rad, 0, 2 * Math.PI); g.fill();
      if (anc > 0 || bl > 0) { g.shadowColor = TRACER[r.kinds[0]]; g.shadowBlur = 2.4 * u * Math.max(anc, bl); }
      if (r.kinds.length === 2) {
        g.strokeStyle = TRACER[r.kinds[0]]; g.beginPath(); g.arc(x, y, rad, 0.5 * Math.PI, 1.5 * Math.PI); g.stroke();
        g.strokeStyle = TRACER[r.kinds[1]]; g.beginPath(); g.arc(x, y, rad, -0.5 * Math.PI, 0.5 * Math.PI); g.stroke();
      } else { g.strokeStyle = TRACER[r.kinds[0]]; g.beginPath(); g.arc(x, y, rad, 0, 2 * Math.PI); g.stroke(); }
      g.restore();
    });
    const aBorn = ramp(tc, 0.2, 1.0) * aAx;
    if (aBorn > 0) text('braked by gravity', X(1.0), Y(1.52), { px: 2.1 * u, color: SOFT, italic: true, alpha: aBorn, halo: true });
    const aKey = ramp(tc, 2.0, 3.0) * aAx;
    if (aKey > 0) {
      const kx = P.x0 + 2 * u, ky = P.y0 - 6.4 * u;
      text('rings: DESI’s ruler at each time', kx, ky, { px: 2.1 * u, color: SOFT, italic: true, alpha: aKey });
      let x = kx;
      for (const k of ['Lya', 'QSO', 'ELG', 'LRG', 'BGS']) {
        const seen = rings.some(r => r.kinds.includes(k) && tc >= r.t), now = hold >= 0 && rings[hold].kinds.includes(k), al = aKey * (seen ? 1 : 0.25) * (now ? 0.55 + 0.45 * (1 - blink) : 1);
        g.save(); g.globalAlpha = al; g.strokeStyle = TRACER[k]; g.lineWidth = Math.max(1.5, 0.3 * u); g.beginPath(); g.arc(x + 0.9 * u, ky + 2.6 * u, 0.8 * u, 0, 2 * Math.PI); g.stroke(); g.restore();
        x += 2.4 * u + text(NAME[k], x + 2.4 * u, ky + 3.4 * u, { px: (k === 'Lya' ? 2.8 : 2.2) * u, color: TRACER[k], alpha: al }) + 2.4 * u;
      }
    }
    const LR = rings.find(r => r.id === 'Lya');
    if (LR && aAnc > 0) {
      const x = X(LR.t), y = Y(Q(LCDM, LR.t)), rr = R0 * LR.a, lx = x + rr + 3.0 * u, ly = Y(1.36);
      g.save(); g.globalAlpha = aAnc; g.strokeStyle = TRACER.Lya; g.lineWidth = Math.max(1, 0.14 * u);
      g.beginPath(); g.moveTo(x + 0.7 * rr, y - 0.7 * rr); g.lineTo(lx - 0.6 * u, ly + 4.4 * u); g.stroke(); g.restore();
      text('the Lyα forest: the anchor', lx, ly, { px: 4.2 * u, color: TRACER.Lya, alpha: aAnc, halo: true });
      text(`${Math.round(LR.lookback)} billion years ago`, lx, ly + 3.8 * u, { px: 2.6 * u, color: INK, italic: true, alpha: aAnc, halo: true });
    }
    if (aAx > 0) {
      const aNow = Math.min(1, LCDM.aAt(Math.max(tc, 1e-3))), sNow = B.s * aNow, LRb = rings.find(r => r.id === 'Lya');
      g.save(); g.globalAlpha = aAx; g.strokeStyle = SOFT; g.lineWidth = Math.max(1, 0.14 * u); g.setLineDash([0.6 * u, 0.5 * u]);
      g.strokeRect(B.cx - B.s / 2, B.cy - B.s / 2, B.s, B.s); g.restore();
      if (aNow < 0.97) text('today’s size', B.cx - B.s / 2, B.cy - B.s / 2 - 0.9 * u, { px: 2.0 * u, color: SOFT, alpha: aAx });
      if (box && tc > 0) {
        g.save(); g.globalAlpha = aAx; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(box, B.cx - sNow / 2, B.cy - sNow / 2, sNow, sNow);
        const hk = hold >= 0 ? rings[hold].kinds[0] : null;
        g.strokeStyle = hk ? TRACER[hk] : INK; g.lineWidth = Math.max(1, (0.16 + 0.3 * blink) * u);
        if (hk) { g.shadowColor = TRACER[hk]; g.shadowBlur = 2.0 * u * blink; }
        g.strokeRect(B.cx - sNow / 2, B.cy - sNow / 2, sNow, sNow); g.restore();
      }
      if (LRb && tc >= LRb.t) {
        const sf = B.s * LRb.a, af = ramp(tc, LRb.t, LRb.t + 0.6) * aAx;
        g.save(); g.globalAlpha = af; g.strokeStyle = IMG.accent; g.lineWidth = Math.max(1.5, (0.3 + 0.2 * aAnc) * u);
        if (aAnc > 0) { g.shadowColor = IMG.accent; g.shadowBlur = 2.0 * u * aAnc; }
        g.strokeRect(B.cx - sf / 2, B.cy - sf / 2, sf, sf); g.restore();
        if (aAnc > 0) text(`the forest’s time: ${Math.round(100 * LRb.a)}% of today’s size`, B.cx, B.cy + sf / 2 + 2.6 * u, { px: 2.0 * u, color: IMG.accent, align: 'center', alpha: aAnc, halo: true, haloColor: IMG.halo });
      }
      const hr = hold >= 0 ? rings[hold] : null, y0 = B.cy + B.s / 2;
      if (tc >= T0 - 1e-6) text('today, 13.8 billion years after the Big Bang', B.cx, y0 + 3.0 * u, { px: 2.1 * u, color: INK, align: 'center', alpha: aAx });
      else {
        if (hr) text(`${NAME[hr.kinds[0]]}${hr.kinds.length > 1 ? ' and ' + NAME[hr.kinds[1]] : ''}`, B.cx, y0 + 3.0 * u, { px: 2.2 * u, color: TRACER[hr.kinds[0]], align: 'center', alpha: aAx });
        text(`${tc.toFixed(1)} billion years after the Big Bang: ${Math.round(100 * aNow)}% of today’s size`, B.cx, y0 + (hr ? 5.6 : 3.0) * u, { px: 2.0 * u, color: INK, align: 'center', alpha: aAx });
      }
      text('our simulation box: 120 Mpc/h across today', B.cx, y0 + 8.4 * u, { px: 1.9 * u, color: SOFT, italic: true, align: 'center', alpha: aAx });
    }
    text('curve: the standard model (Planck 2018) · rings: DESI DR2 BAO (DESI Collaboration 2025) · box: the PRIYA simulation, z = 3', 8 * vw, 97.0 * vh, { px: 1.7 * u, color: MUTED, italic: true });
  }
  return {
    setData(doc) {
      const S = (doc && doc.series) || [];
      rings = S.filter(s => Number.isFinite(s.z_eff) && Number.isFinite(s.lookback_gyr)).map(s => ({ id: s.id, kinds: kindsOf(s.id), a: 1 / (1 + s.z_eff), lookback: s.lookback_gyr, t: T0 - s.lookback_gyr }))
        .sort((a, b) => a.t - b.t);
      draw(last);
    },
    render(s) { last = s && Number.isFinite(s.p) ? s.p : 1; draw(last); },
    settle() { return box ? Promise.resolve() : new Promise(r => { const k = setInterval(() => { if (box) { clearInterval(k); r(); } }, 50); setTimeout(() => { clearInterval(k); r(); }, 5000); }); },
    readRaw() { return new TextEncoder().encode(`expansion:${last.toFixed(4)}|${rings.length}`); },
    readPixel(x, y) { return Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data); },
  };
}
export { T0, T_TURN, A_TURN };
